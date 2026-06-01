import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatErrorForDisplay, logError } from "../utils/errorHandler";

// Demo credentials only shown when VITE_SHOW_DEMO=true in .env.local
// Leave unset (or false) in production to hide this block.
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === "true";
const DEMO_EMAIL = "user@demo.com";
const DEMO_PASSWORD = "demo1";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const { login, loginWithGoogleAuth } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Detect network / server-down errors and show a clear message
      const msg = err?.message || String(err);
      const isNetworkErr =
        msg.toLowerCase().includes("load failed") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch");
      if (isNetworkErr) {
        setError(
          "Cannot reach the server. Make sure the backend is running on port 5000.",
        );
      } else {
        setError(formatErrorForDisplay(err, err.status));
      }
      logError(err, "LoginPage.handleSubmit");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Google Sign-In ─────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogleAuth();
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        formatErrorForDisplay(err, err?.status) || "Google sign-in failed",
      );
      logError(err, "LoginPage.handleGoogleSignIn");
    } finally {
      setGoogleLoading(false);
    }
  };

  // One-click autofill for demo — only rendered when VITE_SHOW_DEMO=true
  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />

      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__icon">
            <i className="fas fa-language" />
          </div>
          <h2 className="auth-card__title">Welcome Back</h2>
          <p className="auth-card__subtitle">
            Sign in to continue your language journey
          </p>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error">
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-field__label">Email Address</label>
            <div className="auth-field__input-wrap">
              <i className="fas fa-envelope auth-field__icon" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                className="auth-field__input"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field__label">Password</label>
            <div className="auth-field__input-wrap">
              <i className="fas fa-lock auth-field__icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="auth-field__input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="auth-field__eye"
                tabIndex="-1"
              >
                <i
                  className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                />
              </button>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              marginTop: "-0.25rem",
              marginBottom: "0.25rem",
            }}
          >
            <Link
              to="/forgot-password"
              className="auth-link"
              style={{ fontSize: "0.85rem" }}
            >
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                Sign In <i className="fas fa-arrow-right" />
              </>
            )}
          </button>
        </form>

        {/* ── Google Sign-In Button ────────────────────────────────── */}
        <div style={{ position: "relative", margin: "1.5rem 0 0 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
            <span>or continue with</span>
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "#fff",
              border: "1.5px solid var(--border)",
              borderRadius: "10px",
              cursor: googleLoading || isLoading ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              opacity: googleLoading || isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!googleLoading && !isLoading) {
                e.currentTarget.style.background = "#f9f9f9";
                e.currentTarget.style.borderColor = "#6366f1";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {googleLoading ? (
              <>
                <span
                  className="auth-spinner"
                  style={{ width: "16px", height: "16px" }}
                />
                Signing in...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </>
            )}
          </button>
        </div>

        {/* Demo autofill button — gated by VITE_SHOW_DEMO=true in .env.local */}
        {SHOW_DEMO && (
          <button
            type="button"
            className="auth-demo"
            onClick={fillDemo}
            title="Click to autofill demo credentials"
            style={{
              cursor: "pointer",
              background: "none",
              border: "none",
              width: "100%",
            }}
          >
            <i className="fas fa-flask" /> Demo account — click to autofill
          </button>
        )}

        <p className="auth-card__footer">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
