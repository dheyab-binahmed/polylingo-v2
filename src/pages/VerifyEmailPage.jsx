import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../services/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please use the link from your email.");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err?.message || "Invalid or expired verification link.");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />

      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__icon">
            <i className={`fas ${status === "verifying" ? "fa-envelope" : status === "success" ? "fa-check-circle" : "fa-times-circle"}`} />
          </div>
          <h2 className="auth-card__title">
            {status === "verifying" && "Verifying your email…"}
            {status === "success"   && "Email Verified!"}
            {status === "error"     && "Verification Failed"}
          </h2>
          <p className="auth-card__subtitle">
            {status === "verifying" && "Please wait a moment."}
            {status === "success"   && "Your email has been confirmed. You're all set!"}
            {status === "error"     && (message || "Something went wrong.")}
          </p>
        </div>

        {status === "verifying" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem 0" }}>
            <span className="auth-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        )}

        {status === "success" && (
          <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(16,185,129,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <i className="fas fa-check-circle" style={{ fontSize: "2rem", color: "#10b981" }} />
            </div>
            <Link
              to="/dashboard"
              className="auth-submit"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              Go to Dashboard <i className="fas fa-arrow-right" />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <i className="fas fa-times-circle" style={{ fontSize: "2rem", color: "#ef4444" }} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              The link may have expired (links are valid for 48 hours).<br />
              You can request a new one from your profile.
            </p>
            <Link
              to="/dashboard"
              className="auth-submit"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        <p className="auth-card__footer">
          <Link to="/login" className="auth-link">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
