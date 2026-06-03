import { useState } from "react";
import { Link } from "react-router-dom";
import { sendFirebasePasswordReset } from "../services/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await sendFirebasePasswordReset(email.trim());
      const data = null;
      setStatus("success");
      // In dev mode the backend may return the token directly — show a helpful message either way
      if (data?.reset_token) {
        setMessage(
          `Reset token (dev only): ${data.reset_token} — use this on the reset page.`
        );
      } else {
        setMessage(
          "If that email is registered you'll receive a reset link shortly. Check your inbox."
        );
      }
    } catch (err) {
      setStatus("error");
      setMessage(err?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />

      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__icon">
            <i className="fas fa-key" />
          </div>
          <h2 className="auth-card__title">Forgot Password</h2>
          <p className="auth-card__subtitle">
            Enter your email and we'll send you a reset link
          </p>
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
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
              {message}
            </p>
            <Link
              to="/login"
              className="auth-submit"
              style={{ display: "block", textAlign: "center", marginTop: "1.5rem", textDecoration: "none" }}
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-field__label">Email Address</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-envelope auth-field__icon" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                  disabled={status === "loading"}
                  autoComplete="email"
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
                  Send Reset Link <i className="fas fa-paper-plane" />
                </>
              )}
            </button>
          </form>
        )}

        {status !== "success" && (
          <p className="auth-card__footer">
            Remember your password?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
