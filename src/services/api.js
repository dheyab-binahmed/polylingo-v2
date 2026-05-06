/**
 * ─────────────────────────────────────────────────────────────
 *  PolyLingo API Service Layer - Connected to Backend
 *  All HTTP calls live here. Components / contexts import
 *  named functions — never write fetch() directly in a component.
 * ─────────────────────────────────────────────────────────────
 */

// ─── Base URL ────────────────────────────────────────────────
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// ─── Error extraction helper ───────────────────────────────────
/**
 * Safely extract error message from various error response formats
 * Handles both simple errors and nested backend error format
 */
function extractErrorMessage(errorResponse) {
  // Handle string errors
  if (typeof errorResponse === "string") return errorResponse;

  // Handle object errors - try multiple fields and nested formats
  if (typeof errorResponse === "object" && errorResponse !== null) {
    // Check for backend nested error format: { error: { message: "...", code: "..." } }
    if (errorResponse.error && typeof errorResponse.error === "object") {
      return (
        errorResponse.error.message ||
        errorResponse.error.error ||
        errorResponse.error.detail ||
        errorResponse.error.msg ||
        JSON.stringify(errorResponse.error)
      );
    }

    // Check for direct fields
    return (
      errorResponse.message ||
      errorResponse.error ||
      errorResponse.detail ||
      errorResponse.msg ||
      (Array.isArray(errorResponse.errors) && errorResponse.errors[0]) ||
      JSON.stringify(errorResponse)
    );
  }

  // Fallback
  return "An unknown error occurred";
}

// ─── Shared fetch helper ──────────────────────────────────────
/**
 * Wraps every API call:
 *  - Attaches Authorization header automatically
 *  - Throws a friendly Error on non-2xx responses
 *  - Returns parsed JSON
 */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("polylingo_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = extractErrorMessage(body);
    } catch (_) {
      // Failed to parse JSON response, use status text
      message = response.statusText || message;
    }
    const error = new Error(message);
    error.status = response.status;
    error.response = response;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════

/**
 * Login with email + password.
 * POST /api/v1/auth/login
 * Expected response: { access_token, refresh_token, user }
 */
export async function loginUser({ email, password }) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("polylingo_token", data.access_token);
  localStorage.setItem("polylingo_refresh_token", data.refresh_token);
  localStorage.setItem("polylingo_auth_user", JSON.stringify(data.user));

  return data.user;
}

/**
 * Register a new account.
 * POST /api/v1/auth/register
 * Expected response: { access_token, refresh_token, user }
 */
export async function registerUser({
  name,
  email,
  age,
  password,
  preferredLanguage,
}) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: name,
      selected_level: "A1",
      preferred_language: preferredLanguage,
    }),
  });

  localStorage.setItem("polylingo_token", data.access_token || data.token);
  localStorage.setItem("polylingo_refresh_token", data.refresh_token);
  localStorage.setItem("polylingo_auth_user", JSON.stringify(data.user));

  return data.user;
}

/**
 * Fetch the currently logged-in user's profile.
 * GET /api/v1/auth/me
 * Expected response: { user: {...} }
 */
export async function fetchCurrentUser() {
  try {
    const data = await apiFetch("/auth/me");
    return data.user || data;
  } catch (err) {
    // Token invalid or expired
    localStorage.removeItem("polylingo_auth_user");
    localStorage.removeItem("polylingo_token");
    localStorage.removeItem("polylingo_refresh_token");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  USER / PROFILE
// ═══════════════════════════════════════════════════════════════

/**
 * Update user profile fields.
 * PATCH /api/v1/user/profile
 * Expected response: { user: {...} }
 */
export async function updateUserProfile(updates) {
  try {
    const data = await apiFetch("/user/profile", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    const updated = data.user || data;
    localStorage.setItem("polylingo_auth_user", JSON.stringify(updated));
    return updated;
  } catch (err) {
    const stored = JSON.parse(
      localStorage.getItem("polylingo_auth_user") || "{}",
    );
    const updated = { ...stored, ...updates };
    localStorage.setItem("polylingo_auth_user", JSON.stringify(updated));
    return updated;
  }
}

/**
 * Get weekly activity data for the dashboard chart.
 * GET /api/v1/user/activity/weekly
 * Expected response: [{ day: "Mon", minutes: 25 }, ...]
 */
export async function fetchWeeklyActivity() {
  try {
    return await apiFetch("/user/activity/weekly");
  } catch (_) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ASSESSMENT & SESSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Save completed assessment results.
 * POST /api/v1/assessment/results
 * Expected request body: { level, overall, scores, preferredLanguage }
 */
export async function saveAssessmentResults(results) {
  try {
    return await apiFetch("/assessment/results", {
      method: "POST",
      body: JSON.stringify(results),
    });
  } catch (err) {
    console.error("Failed to save assessment results:", err);
    return { success: false };
  }
}

/**
 * Create a new session for recording.
 * POST /api/v1/sessions
 * Response: { session_id }
 */
export async function createSession() {
  try {
    const data = await apiFetch("/sessions", {
      method: "POST",
      body: JSON.stringify({}),
    });
    return data.session_id || data.id;
  } catch (err) {
    console.error("Failed to create session:", err);
    throw err;
  }
}

/**
 * Upload audio recording for a session.
 * POST /api/v1/sessions/:sessionId/audio
 * Body: FormData with 'audio' file field
 * Response: { recording_id, session, quality_check }
 */
export async function uploadAudio(sessionId, audioBlob) {
  const token = localStorage.getItem("polylingo_token");
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  try {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/audio`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Audio upload failed");
    }

    return await response.json();
  } catch (err) {
    console.error("Failed to upload audio:", err);
    throw err;
  }
}

/**
 * Get job status and results.
 * GET /api/v1/jobs/:jobId
 * Response: { id, status, result, error_message }
 */
export async function getJobStatus(jobId) {
  try {
    return await apiFetch(`/jobs/${jobId}`);
  } catch (err) {
    console.error("Failed to get job status:", err);
    throw err;
  }
}

/**
 * Submit pronunciation audio for AI scoring.
 * 👉 INSERT API URL HERE: POST /api/assessment/pronunciation
 *
 * This sends a FormData (binary audio file), NOT JSON.
 * Expected response: { score: 8.2, feedback: "..." }
 *
 * ⚠️  Currently in PronunciationStep.jsx the score is faked with Math.random().
 *     Replace that with a call to this function.
 */
export async function scorePronunciation(audioBlob, languageCode) {
  const token = localStorage.getItem("polylingo_token");
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("language", languageCode);

  // ─── REAL IMPLEMENTATION ──────────────────────────────────────
  const response = await fetch(`${BASE_URL}/assessment/pronunciation/score`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData, // Don't set Content-Type — browser sets multipart boundary automatically
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Pronunciation scoring failed" }));
    throw new Error(
      error.error || error.message || "Pronunciation scoring failed",
    );
  }

  return response.json(); // { score: number, feedback: string }
}

/**
 * Send a speaking message and get an AI reply.
 * POST /api/v1/assessment/speaking/reply
 * Expected request: { message: string, history: [...], language: string }
 * Expected response: { reply: string, fluencyScore: number }
 */
export async function getSpeakingReply({ message, history, language }) {
  try {
    return await apiFetch("/assessment/speaking/reply", {
      method: "POST",
      body: JSON.stringify({ message, history, language }),
    });
  } catch (err) {
    console.error("Failed to get speaking reply:", err);
    const MOCK_REPLIES = [
      "Interesting! Could you tell me more about that?",
      "Great point! How did that experience affect you?",
      "That's a thoughtful response. What would you do differently?",
      "I like how you expressed that. Can you elaborate a bit more?",
      "Well said! What do you think about the broader context of that?",
    ];
    return {
      reply: MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)],
      fluencyScore: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch community posts (feed).
 * GET /api/v1/community/posts?page=1&limit=20
 */
export async function fetchCommunityPosts({ page = 1, limit = 20 } = {}) {
  try {
    return await apiFetch(`/community/posts?page=${page}&limit=${limit}`);
  } catch (_) {
    return null;
  }
}

/**
 * Create a new community post.
 * POST /api/v1/community/posts
 */
export async function createPost({ content, language }) {
  try {
    return await apiFetch("/community/posts", {
      method: "POST",
      body: JSON.stringify({ content, language }),
    });
  } catch (err) {
    console.error("Failed to create post:", err);
    throw err;
  }
}

/**
 * Like / unlike a post.
 * POST /api/v1/community/posts/:id/like
 */
export async function togglePostLike(postId) {
  try {
    return await apiFetch(`/community/posts/${postId}/like`, {
      method: "POST",
    });
  } catch (_) {
    return { liked: true };
  }
}

/**
 * Send a direct message to a language partner.
 * POST /api/v1/community/dm
 */
export async function sendDirectMessage({ toUserId, content }) {
  try {
    return await apiFetch("/community/dm", {
      method: "POST",
      body: JSON.stringify({ toUserId, content }),
    });
  } catch (err) {
    console.error("Failed to send direct message:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
//  PRACTICE
// ═══════════════════════════════════════════════════════════════

/**
 * Log a completed practice session.
 * POST /api/v1/practice/session
 * Expected body: { type, language, durationMinutes, score }
 */
export async function logPracticeSession({
  type,
  language,
  durationMinutes,
  score,
}) {
  try {
    return await apiFetch("/practice/session", {
      method: "POST",
      body: JSON.stringify({
        type,
        language,
        duration_minutes: durationMinutes,
        score,
      }),
    });
  } catch (err) {
    console.error("Failed to log practice session:", err);
    return { success: false };
  }
}

// Export for testing/debugging
export const API = {
  BASE_URL,
  loginUser,
  registerUser,
  fetchCurrentUser,
  updateUserProfile,
  createSession,
  uploadAudio,
  getJobStatus,
};
