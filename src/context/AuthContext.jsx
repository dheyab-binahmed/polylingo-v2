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
  loginUser,
  registerUser,
  fetchCurrentUser,
  updateUserProfile,
  saveAssessmentResults,
} from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        // fetchCurrentUser() checks localStorage in mock mode,
        // or hits GET /api/auth/me when the real backend is ready.
        const restored = await fetchCurrentUser();
        if (restored) {
          setUser(restored);
          const token = localStorage.getItem("polylingo_token");
          if (token) connectSocket(token);
        }
      } catch (_) {
        // Token expired or invalid — stay logged out
        localStorage.removeItem("polylingo_auth_user");
        localStorage.removeItem("polylingo_token");
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // ── Login ────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const userData = await loginUser({ email, password });
      localStorage.setItem("polylingo_auth_user", JSON.stringify(userData));
      setUser(userData);

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
    age,
    password,
    preferredLanguage,
  }) => {
    try {
      const userData = await registerUser({
        name,
        email,
        age,
        password,
        preferredLanguage,
      });
      // Keep accounts map for mock duplicate-check (remove when real backend exists)
      const accounts = JSON.parse(
        localStorage.getItem("polylingo_accounts") || "{}",
      );
      accounts[email.toLowerCase()] = userData;
      localStorage.setItem("polylingo_accounts", JSON.stringify(accounts));
      localStorage.setItem("polylingo_auth_user", JSON.stringify(userData));
      setUser(userData);

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
      throw new Error(String(err) || "Registration failed");
    }
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem("polylingo_auth_user");
    localStorage.removeItem("polylingo_token");
    localStorage.removeItem("polylingo_refresh_token");

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

    // Keep mock accounts store in sync
    const storedAccounts = JSON.parse(
      localStorage.getItem("polylingo_accounts") || "{}",
    );
    if (user?.email && storedAccounts[user.email.toLowerCase()]) {
      storedAccounts[user.email.toLowerCase()] = updated;
      localStorage.setItem(
        "polylingo_accounts",
        JSON.stringify(storedAccounts),
      );
    }

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
      console.warn("Could not sync assessment language/level to profile:", err.message);
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
        register,
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
