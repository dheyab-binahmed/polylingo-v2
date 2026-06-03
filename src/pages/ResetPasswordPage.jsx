import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmFirebasePasswordReset,
  verifyFirebasePasswordResetCode,
} from "../services/firebase";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  // Read Firebase action code from URL (?oobCode=xxx) with legacy ?token fallback.
  useEffect(() => {
    const t = searchParams.get("oobCode") || searchParams.get("token") || "";
    setToken(t);
    if (t) {
      verifyFirebasePasswordResetCode(t).catch(() => {
        setStatus("error");
        setMessage("Invalid or expired reset link.");
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!token.trim()) {
      setStatus("error");
      setMessage("Reset token is missing. Please use the link from your email.");
      return;
    }
    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords don't match.");
      return;
    }

    setStatus("loading");
    try {
      await confirmFirebasePasswordReset(token.trim(), password);
      setStatus("success");
      setMessage("Your password has been reset. You can now sign in.");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setStatus("error");
      setMessage(err?.message || "Invalid or expired reset token.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />

      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__icon">
            <i className="fas fa-lock-open" />
          </div>
          <h2 className="auth-card__title">Reset Password</h2>
          <p className="auth-card__subtitle">Choose a new password for your account</p>
        </div>

        {status === "error" && (
          <div className="auth-alert auth-alert--error">
            <i className="fas fa-exclamation-circle" />
            <span>{message}</span>
          </div>
        )}

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <i
                className="fas fa-check-circle"
                style={{ fontSize: "1.75rem", color: "#10b981" }}
              />
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              {message}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Redirecting to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Manual token field — shown only when token is missing from URL */}
            {!searchParams.get("oobCode") && !searchParams.get("token") && (
              <div className="auth-field">
                <label className="auth-field__label">Reset Token</label>
                <div className="auth-field__input-wrap">
                  <i className="fas fa-key auth-field__icon" />
                  <input
                    type="text"
                    placeholder="Paste token from email"
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setStatus("idle"); }}
                    disabled={status === "loading"}
                    className="auth-field__input"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-field__label">New Password</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-lock auth-field__icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
                  disabled={status === "loading"}
                  autoComplete="new-password"
                  className="auth-field__input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="auth-field__eye"
                  tabIndex="-1"
                >
                  <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field__label">Confirm Password</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-lock auth-field__icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
                  disabled={status === "loading"}
                  autoComplete="new-password"
                  className="auth-field__input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  Reset Password <i className="fas fa-arrow-right" />
                </>
              )}
            </button>
          </form>
        )}

        {status !== "success" && (
          <p className="auth-card__footer">
            Remembered it?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
