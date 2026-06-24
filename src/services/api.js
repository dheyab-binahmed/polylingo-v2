/**
 * ─────────────────────────────────────────────────────────────
 *  FluentPeak API Service Layer - Connected to Backend
 *  All HTTP calls live here. Components / contexts import
 *  named functions — never write fetch() directly in a component.
 * ─────────────────────────────────────────────────────────────
 */

// ─── Base URL ────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

// ─── Friendly message sanitizer ────────────────────────────────
/**
 * Never show raw database/SQL errors to users. If a backend message looks
 * like a low-level DB error (psycopg2, SQL dump, connection drop), replace it
 * with a clean, retryable message.
 */
function sanitizeErrorMessage(message) {
  const raw = String(message || "");
  if (/psycopg2|OperationalError|DBAPIError|SQL|sqlalche|SSL connection|connection (was )?closed/i.test(raw)) {
    return "Something went wrong connecting to the server. Please try again.";
  }
  return raw;
}

// ─── Token refresh ────────────────────────────────────────────
/**
 * Exchange the stored refresh token for a new access token.
 * Deduplicates concurrent refreshes so parallel 401s trigger ONE call.
 * Returns the new access token, or null if refresh isn't possible.
 */
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("polylingo_refresh_token");
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        if (!res.ok) {
          // Refresh token expired/revoked — clear stale credentials so
          // AuthRequired redirects to login on the next navigation.
          localStorage.removeItem("polylingo_token");
          localStorage.removeItem("polylingo_refresh_token");
          return null;
        }
        const data = await res.json();
        if (data?.access_token) {
          localStorage.setItem("polylingo_token", data.access_token);
          return data.access_token;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// ─── Shared fetch helpers ─────────────────────────────────────
/**
 * Low-level fetch with auth: attaches the Bearer token and, on a 401,
 * refreshes the access token once and retries. Returns the raw Response.
 * Use this for non-JSON requests (e.g. multipart uploads).
 */
export async function authorizedFetch(url, options = {}) {
  const doFetch = (token) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await doFetch(localStorage.getItem("polylingo_token"));

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  return response;
}

/**
 * Wraps every API call:
 *  - Attaches Authorization header automatically
 *  - On 401, refreshes the access token once and retries
 *  - Throws a friendly Error on non-2xx responses
 *  - Returns parsed JSON
 */
export async function apiFetch(path, options = {}, _retried = false) {
  let response;
  try {
    response = await authorizedFetch(`${BASE_URL}/api/v1${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (networkErr) {
    // Network failure (server waking up, transient drop): retry once.
    if (!_retried) {
      await new Promise((r) => setTimeout(r, 1500));
      return apiFetch(path, options, true);
    }
    throw new Error("Connection failed. Please try again.");
  }

  // 503 = backend temporarily unavailable (e.g. database connection dropped).
  // Give it one quick retry before surfacing an error to the user.
  if (response.status === 503 && !_retried) {
    await new Promise((r) => setTimeout(r, 1500));
    return apiFetch(path, options, true);
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = extractErrorMessage(body);
    } catch (_) {
      // Failed to parse JSON response, use status text
      message = response.statusText || message;
    }
    const error = new Error(sanitizeErrorMessage(message));
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
  username,
}) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: name,
      username,
      selected_level: "A1",
      preferred_language: preferredLanguage,
    }),
  });
}

/**
 * Sign in with Google using Firebase ID token.
 * POST /api/v1/auth/firebase/login
 * Expected response: { access_token, refresh_token, user }
 */
export async function loginWithFirebase({
  idToken,
  user: firebaseUser,
  preferredLanguage,
  selectedLevel,
}) {
  const data = await apiFetch("/auth/firebase/login", {
    method: "POST",
    body: JSON.stringify({
      id_token: idToken,
      full_name: firebaseUser.displayName,
      photo_url: firebaseUser.photoURL,
      preferred_language: preferredLanguage,
      selected_level: selectedLevel,
    }),
  });

  localStorage.setItem("polylingo_token", data.access_token || data.token);
  if (data.refresh_token) {
    localStorage.setItem("polylingo_refresh_token", data.refresh_token);
  }
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
 * PUT /api/v1/auth/profile
 * Accepts both camelCase (legacy) and snake_case field names and normalises to snake_case.
 * Expected response: { user: {...} }
 */
export async function updateUserProfile(updates) {
  // Normalise to the snake_case field names the backend expects
  const payload = {};
  if (updates.full_name !== undefined) payload.full_name = updates.full_name;
  if (updates.name !== undefined) payload.full_name = updates.name; // legacy camelCase
  if (updates.preferred_language !== undefined)
    payload.preferred_language = updates.preferred_language;
  if (updates.preferredLanguage !== undefined)
    payload.preferred_language = updates.preferredLanguage; // legacy
  if (updates.selected_level !== undefined)
    payload.selected_level = updates.selected_level;
  if (updates.username !== undefined) payload.username = updates.username;

  try {
    const data = await apiFetch("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const updated = data.user || data;
    localStorage.setItem("polylingo_auth_user", JSON.stringify(updated));
    return updated;
  } catch (err) {
    // Validation/conflict errors (e.g. username taken, weekly cooldown) must
    // reach the UI — don't pretend the change succeeded.
    if (err.status && err.status >= 400 && err.status < 500) {
      throw err;
    }
    // Network/server hiccup: merge locally so the UI still reflects the change.
    const stored = JSON.parse(
      localStorage.getItem("polylingo_auth_user") || "{}",
    );
    const updated = { ...stored, ...payload, ...updates };
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

/**
 * Get weekly leaderboard data.
 * GET /api/v1/leaderboard/weekly
 * Expected response: [{ rank, user_id, name, minutes }, ...]
 */
export async function fetchLeaderboard() {
  try {
    return await apiFetch("/leaderboard/weekly");
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return null;
  }
}

// ─── Friends / Community APIs ─────────────────────────────────
export async function sendFriendRequest({ receiver_id, message }) {
  try {
    return await apiFetch("/friends/request", {
      method: "POST",
      body: JSON.stringify({ receiver_id, message }),
    });
  } catch (err) {
    console.error("Failed to send friend request:", err);
    throw err;
  }
}

export async function fetchFriendRequests() {
  try {
    return await apiFetch("/friends/requests");
  } catch (err) {
    console.error("Failed to fetch friend requests:", err);
    return { incoming: [], outgoing: [] };
  }
}

export async function acceptFriendRequest(request_id) {
  try {
    return await apiFetch("/friends/accept", {
      method: "POST",
      body: JSON.stringify({ request_id }),
    });
  } catch (err) {
    console.error("Failed to accept friend request:", err);
    throw err;
  }
}

export async function rejectFriendRequest(request_id) {
  try {
    return await apiFetch("/friends/reject", {
      method: "POST",
      body: JSON.stringify({ request_id }),
    });
  } catch (err) {
    console.error("Failed to reject friend request:", err);
    throw err;
  }
}

export async function fetchFriends() {
  try {
    return await apiFetch("/friends/list");
  } catch (err) {
    console.error("Failed to fetch friends:", err);
    return [];
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
 * Start the backend speaking assessment session.
 * POST /api/v1/assessment/speaking/start
 */
export async function startSpeakingAssessment({
  level,
  language,
  mode = "voice",
}) {
  return await apiFetch("/assessment/speaking/start", {
    method: "POST",
    body: JSON.stringify({ level, language, mode }),
  });
}

/**
 * Send a speaking response to the backend session.
 * POST /api/v1/assessment/speaking/:sessionId/message
 */
export async function sendSpeakingAssessmentMessage({
  sessionId,
  text,
  mode = "voice",
  audio_analysis = null,
  duration_seconds = null,
  speech_analytics = null,
}) {
  return await apiFetch(`/assessment/speaking/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({ text, mode, audio_analysis, duration_seconds, speech_analytics }),
  });
}

/**
 * Complete the backend speaking assessment and fetch the final results.
 * POST /api/v1/assessment/speaking/:sessionId/complete
 */
export async function completeSpeakingAssessment(sessionId) {
  return await apiFetch(`/assessment/speaking/${sessionId}/complete`, {
    method: "POST",
  });
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
    const response = await fetch(
      `${BASE_URL}/api/v1/sessions/${sessionId}/audio`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      },
    );

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
 * Get pronunciation assessment job status and result.
 * GET /api/v1/assessment/pronunciation/status/:jobId
 */
export async function getPronunciationJobStatus(jobId) {
  try {
    return await apiFetch(`/assessment/pronunciation/status/${jobId}`);
  } catch (err) {
    console.error("Failed to get pronunciation job status:", err);
    throw err;
  }
}

/**
 * Submit pronunciation audio for AI scoring.
 * POST /api/v1/assessment/pronunciation/score
 *
 * This sends a FormData (binary audio file), NOT JSON.
 * Expected response: { score: 8.2, feedback: "..." }
 */
export async function scorePronunciation(
  audioBlob,
  languageCode,
  pronunciationPrompt = null,
) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("language", languageCode);
  if (pronunciationPrompt) {
    const refText =
      typeof pronunciationPrompt === "string"
        ? pronunciationPrompt
        : pronunciationPrompt.passage || pronunciationPrompt.title || "";
    if (refText) formData.append("reference_text", refText);
  }

  // ─── REAL IMPLEMENTATION ──────────────────────────────────────
  // authorizedFetch attaches the token and auto-refreshes on 401.
  const response = await authorizedFetch(
    `${BASE_URL}/api/v1/assessment/pronunciation/score`,
    {
      method: "POST",
      body: formData, // Don't set Content-Type — browser sets multipart boundary automatically
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please log out and log back in.");
    }
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
    } catch {
      throw new Error(`Request failed with status ${response.status}`);
    }
  }

  return response.json(); // { score: number, feedback: string }
}

/**
 * Send a speaking message and get an AI reply.
 * POST /api/v1/assessment/speaking/reply
 * Expected request: { message: string, history: [...], language: string }
 * Expected response: { reply: string, fluencyScore: number }
 */
export async function updateSessionScore(sessionId, scoreData) {
  try {
    return await apiFetch(`/sessions/${sessionId}/score`, {
      method: "PUT",
      body: JSON.stringify(scoreData),
    });
  } catch (err) {
    console.error("Failed to update session score:", err);
    throw err;
  }
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
    throw err;
  }
}

/**
 * Convert text to speech using ElevenLabs API.
 * POST /api/v1/assessment/tts
 * Expected response: { audio: base64_string, content_type: "audio/mpeg" }
 */
export const generateSpeech = async (text, lang) => {
  // Use apiFetch so the access token is auto-refreshed on a 401. Assessments can
  // run long enough for the token to expire mid-session; a raw fetch would 401,
  // throw, and the caller would fall back to the robotic browser voice instead
  // of the neural TTS. apiFetch retries with a fresh token and returns the same
  // { audio, content_type } shape.
  return await apiFetch("/assessment/tts", {
    method: "POST",
    body: JSON.stringify({ text, lang }),
  });
};

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

/**
 * Search users by q (email or name)
 * GET /api/v1/users/search?q=
 */
export async function searchUsers(q) {
  try {
    return await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
  } catch (err) {
    console.error("User search failed:", err);
    return { users: [] };
  }
}

/** DM helpers */
export async function getDmMessages(userId) {
  try {
    return await apiFetch(`/community/dms/${userId}/messages`);
  } catch (err) {
    console.error("Failed to get DM messages:", err);
    return { messages: [] };
  }
}

export async function postDmMessage(userId, text) {
  try {
    return await apiFetch(`/community/dms/${userId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Failed to post DM message:", err);
    throw err;
  }
}

/** Partners */
export async function fetchPartners() {
  try {
    return await apiFetch(`/community/partners`);
  } catch (err) {
    console.error("Failed to fetch partners:", err);
    return { partners: [] };
  }
}

export async function connectPartner(partnerId) {
  try {
    return await apiFetch(`/community/partners/${partnerId}/connect`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to connect partner:", err);
    throw err;
  }
}

export async function disconnectPartner(partnerId) {
  try {
    return await apiFetch(`/community/partners/${partnerId}/connect`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to disconnect partner:", err);
    throw err;
  }
}

export async function acceptPartner(partnerId) {
  try {
    return await apiFetch(`/community/partners/${partnerId}/accept`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to accept partner:", err);
    throw err;
  }
}

export async function rejectPartner(partnerId) {
  try {
    return await apiFetch(`/community/partners/${partnerId}/reject`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to reject partner:", err);
    throw err;
  }
}

export async function updatePresence(is_online) {
  try {
    return await apiFetch(`/users/presence`, {
      method: "POST",
      body: JSON.stringify({ is_online }),
    });
  } catch (err) {
    console.error("Failed to update presence:", err);
    throw err;
  }
}

/** Groups */
export async function createGroup(payload) {
  try {
    return await apiFetch(`/community/groups`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to create group:", err);
    throw err;
  }
}

export async function fetchGroups() {
  try {
    return await apiFetch(`/community/groups`);
  } catch (err) {
    console.error("Failed to fetch groups:", err);
    return { groups: [] };
  }
}

export async function joinGroup(groupId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/join`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to join group:", err);
    throw err;
  }
}

export async function leaveGroup(groupId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/join`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to leave group:", err);
    throw err;
  }
}

export async function getGroupMessages(groupId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/messages`);
  } catch (err) {
    console.error("Failed to get group messages:", err);
    return { messages: [] };
  }
}

export async function postGroupMessage(groupId, text) {
  try {
    return await apiFetch(`/community/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Failed to post group message:", err);
    throw err;
  }
}

export async function updateGroup(groupId, data) {
  try {
    return await apiFetch(`/community/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Failed to update group:", err);
    throw err;
  }
}

export async function deleteGroup(groupId) {
  try {
    return await apiFetch(`/community/groups/${groupId}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to delete group:", err);
    throw err;
  }
}

export async function searchGroupUsers(groupId, query) {
  try {
    return await apiFetch(
      `/community/groups/${groupId}/search-users?q=${encodeURIComponent(query)}`,
    );
  } catch (err) {
    console.error("Failed to search group users:", err);
    return { users: [] };
  }
}

export async function inviteToGroup(groupId, userId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/invite`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (err) {
    console.error("Failed to invite user to group:", err);
    throw err;
  }
}

export async function getGroupMembers(groupId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/members`);
  } catch (err) {
    console.error("Failed to get group members:", err);
    return { members: [] };
  }
}

export async function removeGroupMember(groupId, userId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to remove group member:", err);
    throw err;
  }
}

export async function toggleGroupAdmin(groupId, userId, isAdmin) {
  try {
    return await apiFetch(`/community/groups/${groupId}/members/${userId}/admin`, {
      method: "PATCH",
      body: JSON.stringify({ is_admin: isAdmin }),
    });
  } catch (err) {
    console.error("Failed to toggle group admin:", err);
    throw err;
  }
}

export async function getGroupJoinRequests(groupId) {
  try {
    return await apiFetch(`/community/groups/${groupId}/join-requests`);
  } catch (err) {
    console.error("Failed to get join requests:", err);
    return { requests: [] };
  }
}

export async function approveGroupJoinRequest(groupId, userId) {
  try {
    return await apiFetch(
      `/community/groups/${groupId}/join-requests/${userId}/approve`,
      { method: "POST" },
    );
  } catch (err) {
    console.error("Failed to approve join request:", err);
    throw err;
  }
}

export async function rejectGroupJoinRequest(groupId, userId) {
  try {
    return await apiFetch(
      `/community/groups/${groupId}/join-requests/${userId}/reject`,
      { method: "POST" },
    );
  } catch (err) {
    console.error("Failed to reject join request:", err);
    throw err;
  }
}

/** Post interactions */
export async function postComment(postId, text) {
  try {
    return await apiFetch(`/community/posts/${postId}/comment`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Failed to post comment:", err);
    throw err;
  }
}

export async function sharePost(postId) {
  try {
    return await apiFetch(`/community/posts/${postId}/share`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to share post:", err);
    throw err;
  }
}

export async function reportPost(postId, reason) {
  try {
    return await apiFetch(`/community/posts/${postId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  } catch (err) {
    console.error("Failed to report post:", err);
    throw err;
  }
}

export async function deletePost(postId) {
  try {
    return await apiFetch(`/community/posts/${postId}`, { method: "DELETE" });
  } catch (err) {
    console.error("Failed to delete post:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
//  PRACTICE
// ═══════════════════════════════════════════════════════════════

/**
 * Log a completed practice session by bumping the relevant counter
 * in the user's PracticeProgress row via PUT /api/v1/practice/progress.
 * (POST /practice/session never existed — this is the correct endpoint.)
 */
export async function logPracticeSession({
  type,
  language,
  durationMinutes = 5,
}) {
  try {
    // Map session type to the progress field it increments
    const typeMap = {
      speaking: { speaking: { sessions: 1, minutes: durationMinutes } },
      writing: { writing: { submissions: 1 } },
      grammar: { grammar: { exercises: 1 } },
      reading: { reading: { articles: 1 } },
      listening: { listening: { exercises: 1 } },
      flashcards: { flashcards: { sessions: 1 } },
    };

    // Fetch current progress first so we can add to it (not overwrite)
    const current = await fetchPracticeProgress(language).catch(() => null);
    if (!current) return { success: false };

    const increment = typeMap[type] || {};
    const merged = { language };

    // Merge increments into current values
    for (const [section, fields] of Object.entries(increment)) {
      merged[section] = { ...(current[section] || {}) };
      for (const [key, delta] of Object.entries(fields)) {
        merged[section][key] = (merged[section][key] || 0) + delta;
      }
    }

    return await savePracticeProgress({ ...current, ...merged, language });
  } catch (err) {
    console.error("Failed to log practice session:", err);
    return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════
//  PRACTICE CONTENT
// ═══════════════════════════════════════════════════════════════

/** GET /api/v1/practice/flashcards?language=X&level=Y */
export async function fetchPracticeFlashcards({ language, level }) {
  return await apiFetch(
    `/practice/flashcards?language=${encodeURIComponent(language)}&level=${level}`,
  );
}

/** GET /api/v1/practice/grammar?language=X&level=Y */
export async function fetchPracticeGrammar({ language, level }) {
  return await apiFetch(
    `/practice/grammar?language=${encodeURIComponent(language)}&level=${level}`,
  );
}

/** GET /api/v1/practice/writing/prompt?language=X&level=Y */
export async function fetchPracticeWritingPrompt({ language, level }) {
  return await apiFetch(
    `/practice/writing/prompt?language=${encodeURIComponent(language)}&level=${level}`,
  );
}

/** GET /api/v1/practice/speaking?language=X&level=Y */
export async function fetchPracticeSpeaking({ language, level }) {
  return await apiFetch(
    `/practice/speaking?language=${encodeURIComponent(language)}&level=${level}`,
  );
}

/** POST /api/v1/practice/writing/grammar-check */
export async function checkWritingGrammar({ text, language }) {
  return await apiFetch("/practice/writing/grammar-check", {
    method: "POST",
    body: JSON.stringify({ text, language }),
  });
}

/** GET /api/v1/practice/reading?language=X&level=Y */
export async function fetchPracticeReading({ language, level }) {
  return await apiFetch(
    `/practice/reading?language=${encodeURIComponent(language)}&level=${level}`,
  );
}

/** GET /api/v1/practice/listening?language=X&level=Y */
export async function fetchPracticeListening({ language, level }) {
  return await apiFetch(
    `/practice/listening?language=${encodeURIComponent(language)}&level=${level}`,
  );
}

/** POST /api/v1/practice/writing/score */
export async function scorePracticeWriting({ writingText, prompt, language }) {
  return await apiFetch("/practice/writing/score", {
    method: "POST",
    body: JSON.stringify({ writing_text: writingText, prompt, language }),
  });
}

/**
 * Fetch lightweight practice stats for the dashboard.
 * GET /api/v1/practice/stats
 * Returns: { streak, today_minutes, daily_goal_minutes, level, language }
 */
/**
 * Convert text to speech using ElevenLabs (proxied through backend).
 * POST /api/v1/practice/tts
 * Returns: { audioBase64: "..." } — null if ElevenLabs is not configured.
 */
export async function fetchTTS(text, lang) {
  try {
    return await apiFetch("/practice/tts", {
      method: "POST",
      body: JSON.stringify({ text, lang }),
    });
  } catch (_) {
    return { audioBase64: null };
  }
}

/**
 * Get 2–3 short suggested replies for a beginner, given the tutor's last message.
 * POST /api/v1/practice/tutor/suggestions  →  { suggestions: ["…", "…"] }
 */
export async function fetchTutorSuggestions({ message, language, level }) {
  try {
    return await apiFetch("/practice/tutor/suggestions", {
      method: "POST",
      body: JSON.stringify({ message, language, level }),
    });
  } catch (_) {
    return { suggestions: [] };
  }
}

/**
 * List the current user's earned achievements.
 * GET /api/v1/users/me/achievements  →  { achievements: [{id,title,description,earned_at}], total }
 */
export async function fetchMyAchievements() {
  try {
    return await apiFetch("/users/me/achievements");
  } catch (_) {
    return { achievements: [], total: 0 };
  }
}

export async function fetchPracticeStats() {
  try {
    return await apiFetch("/practice/stats");
  } catch (_) {
    return null;
  }
}

/**
 * Send a message to the AI language tutor and receive a correction-aware reply.
 * POST /api/v1/practice/tutor/chat
 * Request: { message, history, language, level }
 * Response: { reply, correction, vocab_tip }
 */
export async function chatWithTutor({ message, history, language, level }) {
  return await apiFetch("/practice/tutor/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, language, level }),
  });
}

/**
 * Streaming version of chatWithTutor.
 * Calls POST /api/v1/practice/tutor/chat/stream and fires callbacks as SSE events arrive.
 *
 * @param {object} params - { message, history, language, level }
 * @param {object} callbacks - {
 *   onToken(text)         – called with each text chunk for display,
 *   onSentence(sentence)  – called when a full sentence is ready (for TTS),
 *   onDone({correction, vocab_tip}) – called when the response is complete,
 *   onError(err)          – called on network/parse error
 * }
 * @returns {AbortController} – call .abort() to cancel mid-stream
 */
export function streamTutorChat(
  { message, history, language, level },
  callbacks = {},
) {
  const token = localStorage.getItem("polylingo_token");
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/practice/tutor/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, history, language, level }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.token !== undefined) {
              callbacks.onToken?.(data.token);
            } else if (data.sentence) {
              callbacks.onSentence?.(data.sentence);
            } else if (data.done) {
              callbacks.onDone?.({
                correction: data.correction || null,
                vocab_tip: data.vocab_tip || null,
              });
            } else if (data.error) {
              callbacks.onError?.(new Error(data.error));
            }
          } catch (_) {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        callbacks.onError?.(err);
      }
    }
  })();

  return controller;
}

/**
 * Fetch the user's practice progress for a given language.
 * GET /api/v1/practice/progress?language=French
 * Response: full stats object (zeros if no data yet)
 */
export async function fetchPracticeProgress(language) {
  try {
    return await apiFetch(
      `/practice/progress?language=${encodeURIComponent(language)}`,
    );
  } catch (_) {
    return null;
  }
}

/**
 * Save the user's practice progress to the database.
 * PUT /api/v1/practice/progress
 * Body: full stats object (accumulated totals, not deltas)
 */
export async function savePracticeProgress(stats) {
  try {
    return await apiFetch("/practice/progress", {
      method: "PUT",
      body: JSON.stringify(stats),
    });
  } catch (_) {
    return null; // non-critical — localStorage is the fallback
  }
}

/**
 * Request a password reset email.
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(email) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify email address using the token from the verification email link.
 * POST /api/v1/auth/verify-email
 */
export async function verifyEmail(token) {
  return apiFetch("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Verify the 6-digit code sent after registration.
 * POST /api/v1/auth/verify-code
 */
export async function verifyEmailCode(email, code) {
  return apiFetch("/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

/**
 * Resend the 6-digit verification code.
 * POST /api/v1/auth/resend-code
 */
export async function resendVerificationCode(email) {
  return apiFetch("/auth/resend-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Reset password using the token from the email.
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(token, newPassword) {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

/**
 * Change the current user's password.
 * POST /api/v1/auth/change-password
 */
export async function changePassword(currentPassword, newPassword) {
  return apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

/**
 * Save notification preferences.
 * PUT /api/v1/auth/notification-preferences
 */
export async function saveNotificationPreferences(prefs) {
  return apiFetch("/auth/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
}

/**
 * Transcribe audio blob via backend Whisper.
 * POST /api/v1/audio/transcribe
 * Returns { transcript: string }
 */
export async function transcribeAudio(audioBlob, language = "en") {
  const token = localStorage.getItem("polylingo_token");
  // Pick extension that matches the actual blob type so backend accepts it
  const ext = audioBlob.type.includes("mp4")
    ? "mp4"
    : audioBlob.type.includes("ogg")
      ? "ogg"
      : audioBlob.type.includes("m4a")
        ? "m4a"
        : "webm";
  const formData = new FormData();
  formData.append("audio", audioBlob, `recording.${ext}`);
  formData.append("language", language);
  const res = await fetch(`${BASE_URL}/api/v1/audio/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Transcription failed");
  }
  return res.json();
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
