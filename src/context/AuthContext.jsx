/**
 * AuthContext.jsx
 *
 * Provides authentication state and actions to the entire app.
 * All actual HTTP calls are delegated to src/services/api.js —
 * this context only manages state, storage, and convenience methods.
 *
 * 🔑  Key exports:
 *   AuthProvider   — wrap your app with this
 *   useAuth()      — hook to access { user, login, register, logout,
 *                    loading, completeAssessment, updateUser }
 */

// ⚠️  "import React" is not needed with React 17+ JSX transform.
//      You can also remove it from AuthRequired, LoginPage,
//      Navbar, RegisterPage, and ProfilePage.
import { createContext, useState, useContext, useEffect } from "react";
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  updateUserProfile,
  saveAssessmentResults,
  loginWithFirebase,
} from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import {
  firebaseSignOut,
  getCurrentFirebaseSession,
  signInWithGoogle,
} from "../services/firebase";

const AuthContext = createContext(null);

function requestNotificationPermission() {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        let restored = null;

        const token = localStorage.getItem("polylingo_token");

        if (token) {
          restored = await fetchCurrentUser();
        }

        if (!restored) {
          const firebaseSession = await getCurrentFirebaseSession();
          if (firebaseSession) {
            restored = await loginWithFirebase(firebaseSession);
          }
        }
        if (restored) {
          setUser(restored);
          requestNotificationPermission();
          const appToken = localStorage.getItem("polylingo_token");
          if (appToken) connectSocket(appToken);
        }
      } catch (_) {
        // Token expired or invalid — stay logged out
        localStorage.removeItem("polylingo_auth_user");
        localStorage.removeItem("polylingo_token");
        localStorage.removeItem("polylingo_refresh_token");
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // ── Login with pre-fetched data (post-email-verification) ───
  const loginWithData = (data) => {
    // data = { access_token, refresh_token, user }
    localStorage.setItem("polylingo_token", data.access_token);
    if (data.refresh_token)
      localStorage.setItem("polylingo_refresh_token", data.refresh_token);
    localStorage.setItem("polylingo_auth_user", JSON.stringify(data.user));
    setUser(data.user);
    requestNotificationPermission();
    connectSocket(data.access_token);
  };

  // ── Login ────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const userData = await loginUser({ email, password });
      localStorage.setItem("polylingo_auth_user", JSON.stringify(userData));
      setUser(userData);
      requestNotificationPermission();

      // Connect WebSocket with token
      const token = localStorage.getItem("polylingo_token");
      if (token) {
        connectSocket(token);
      }

      return userData;
    } catch (err) {
      // Re-throw with better error message
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(String(err) || "Login failed");
    }
  };

  // ── Register ─────────────────────────────────────────────────
  const register = async ({
    name,
    email,
    password,
    preferredLanguage,
  }) => {
    try {
      return await registerUser({
        name,
        password,
        preferredLanguage,
        email,
      });
    } catch (err) {
      // Re-throw with better error message
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(String(err) || "Registration failed");
    }
  };

  // ── Login with Google (popup) ────────────────────────────────
  const loginWithGoogleAuth = async () => {
    try {
      const session = await signInWithGoogle();
      if (!session) throw new Error("Google sign-in failed");
      const userData = await loginWithFirebase(session);
      if (userData) {
        setUser(userData);
        requestNotificationPermission();
        const appToken = localStorage.getItem("polylingo_token");
        if (appToken) connectSocket(appToken);
      }
      return userData;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(String(err) || "Google sign-in failed");
    }
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    setUser(null);
    localStorage.removeItem("polylingo_auth_user");
    localStorage.removeItem("polylingo_token");
    localStorage.removeItem("polylingo_refresh_token");

    // Sign out from Firebase too
    try {
      await firebaseSignOut();
    } catch (err) {
      console.warn("Firebase sign out error:", err);
    }

    // Disconnect WebSocket
    disconnectSocket();
  };

  // ── Complete Assessment ──────────────────────────────────────
  const completeAssessment = async (results = {}) => {
    const langUpdate = results.preferredLanguage
      ? { preferredLanguage: results.preferredLanguage }
      : {};

    const updated = {
      ...user,
      assessmentCompleted: true,
      assessmentResults: results,
      ...langUpdate,
    };

    setUser(updated);
    localStorage.setItem("polylingo_auth_user", JSON.stringify(updated));

    // 👉 BACKEND: persist results to DB — fire-and-forget, non-blocking
    try {
      await saveAssessmentResults(results);
    } catch (err) {
      console.warn("Could not persist assessment to server:", err.message);
    }

    // 👉 BACKEND: sync preferred_language and CEFR level to the user profile
    try {
      const profileUpdates = {};
      if (results.preferredLanguage) {
        profileUpdates.preferred_language = results.preferredLanguage;
      }
      if (results.cefrLevel) {
        profileUpdates.selected_level = results.cefrLevel;
      }
      if (Object.keys(profileUpdates).length > 0) {
        const serverUser = await updateUserProfile(profileUpdates);
        if (serverUser && (serverUser.id || serverUser.email)) {
          // Merge server fields into the already-updated local user
          const merged = { ...updated, ...serverUser };
          setUser(merged);
          localStorage.setItem("polylingo_auth_user", JSON.stringify(merged));
        }
      }
    } catch (err) {
      console.warn(
        "Could not sync assessment language/level to profile:",
        err.message,
      );
    }
  };

  // ── Update user fields (profile edits, streak bumps, etc.) ──
  const updateUser = async (updates) => {
    // Optimistic update so the UI is instant
    const optimistic = { ...user, ...updates };
    setUser(optimistic);
    localStorage.setItem("polylingo_auth_user", JSON.stringify(optimistic));

    // Sync to backend and use the server response as source of truth
    try {
      const serverUser = await updateUserProfile(updates);
      if (serverUser && (serverUser.id || serverUser.email)) {
        setUser(serverUser);
        localStorage.setItem("polylingo_auth_user", JSON.stringify(serverUser));
      }
    } catch (err) {
      console.warn("Could not sync profile update to server:", err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithData,
        register,
        loginWithGoogleAuth,
        logout,
        loading,
        completeAssessment,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
