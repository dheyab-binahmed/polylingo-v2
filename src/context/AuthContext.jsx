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
import { createContext, useState, useContext, useEffect } from 'react';
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  updateUserProfile,
  saveAssessmentResults,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        // fetchCurrentUser() checks localStorage in mock mode,
        // or hits GET /api/auth/me when the real backend is ready.
        const restored = await fetchCurrentUser();
        if (restored) setUser(restored);
      } catch (_) {
        // Token expired or invalid — stay logged out
        localStorage.removeItem('polylingo_auth_user');
        localStorage.removeItem('polylingo_token');
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // ── Login ────────────────────────────────────────────────────
  const login = async (email, password) => {
    const userData = await loginUser({ email, password });
    localStorage.setItem('polylingo_auth_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  // ── Register ─────────────────────────────────────────────────
  const register = async ({ name, email, age, password, preferredLanguage }) => {
    const userData = await registerUser({ name, email, age, password, preferredLanguage });
    // Keep accounts map for mock duplicate-check (remove when real backend exists)
    const accounts = JSON.parse(localStorage.getItem('polylingo_accounts') || '{}');
    accounts[email.toLowerCase()] = userData;
    localStorage.setItem('polylingo_accounts', JSON.stringify(accounts));
    localStorage.setItem('polylingo_auth_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem('polylingo_auth_user');
    localStorage.removeItem('polylingo_token');
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
    localStorage.setItem('polylingo_auth_user', JSON.stringify(updated));

    // Keep mock accounts store in sync
    const storedAccounts = JSON.parse(localStorage.getItem('polylingo_accounts') || '{}');
    if (user?.email && storedAccounts[user.email.toLowerCase()]) {
      storedAccounts[user.email.toLowerCase()] = updated;
      localStorage.setItem('polylingo_accounts', JSON.stringify(storedAccounts));
    }

    // 👉 BACKEND: persist results to DB — fire-and-forget, non-blocking
    try {
      await saveAssessmentResults(results);
    } catch (err) {
      console.warn('Could not persist assessment to server:', err.message);
    }
  };

  // ── Update user fields (profile edits, streak bumps, etc.) ──
  const updateUser = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('polylingo_auth_user', JSON.stringify(updated));

    // 👉 BACKEND: sync changes to server when real API is ready
    try {
      await updateUserProfile(updates);
    } catch (err) {
      console.warn('Could not sync profile update to server:', err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, completeAssessment, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
