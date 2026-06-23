import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resendVerificationCode, verifyEmailCode } from "../services/api";
import { formatErrorForDisplay, logError } from "../utils/errorHandler";
const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Mandarin",
  "Japanese",
  "Korean",
  "Arabic",
  "Russian",
  "Hindi",
  "Dutch",
  "Swedish",
  "Polish",
  "Turkish",
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    age: "",
    password: "",
    confirmPassword: "",
    preferredLanguage: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef([]);

  const { register, loginWithData, loginWithGoogleAuth } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Full name is required");
      return;
    }
    const username = form.username.trim().toLowerCase();
    if (!username) {
      setError("Username is required");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!/^[a-z0-9._]+$/.test(username)) {
      setError("Username can only contain letters, numbers, '.' and '_'");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Valid email is required");
      return;
    }
    if (!form.age || parseInt(form.age) < 6 || parseInt(form.age) > 120) {
      setError("Please enter a valid age");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.preferredLanguage) {
      setError("Please select a language to learn");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: form.name.trim(),
        username,
        email: form.email.trim(),
        age: form.age,
        password: form.password,
        preferredLanguage: form.preferredLanguage,
      });
      // Backend just sent a verification code — show code entry screen
      setPendingEmail(form.email.trim());
      setCode(["", "", "", "", "", ""]);
      setStep("verify");
      setTimeout(() => codeRefs.current[0]?.focus(), 0);
    } catch (err) {
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
      logError(err, "RegisterPage.handleSubmit");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Google Sign-In ─────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogleAuth();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        formatErrorForDisplay(err, err?.status) || "Google sign-up failed",
      );
      logError(err, "RegisterPage.handleGoogleSignUp");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Code digit input handlers ───────────────────────────────────────────────
  const handleCodeChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setCodeError("");
    if (digit && idx < 5) codeRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setCodeError("Please enter all 6 digits.");
      return;
    }
    setCodeLoading(true);
    setCodeError("");
    try {
      const data = await verifyEmailCode(pendingEmail, fullCode);
      loginWithData(data);
      navigate("/assessment/language", { replace: true });
    } catch (err) {
      setCodeError(err?.message || "Incorrect code. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendVerificationCode(pendingEmail);
      setResendCooldown(60);
      const t = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            clearInterval(t);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (_) {}
  };

  // ── Verify step UI ──────────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="auth-page">
        <div className="auth-bg-orb auth-bg-orb--1" />
        <div className="auth-bg-orb auth-bg-orb--2" />
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__icon">
              <i className="fas fa-envelope-open-text" />
            </div>
            <h2 className="auth-card__title">Check your email</h2>
            <p className="auth-card__subtitle">
              We sent a 6-digit code to <strong>{pendingEmail}</strong>
            </p>
          </div>

          {codeError && (
            <div className="auth-alert auth-alert--error">
              <i className="fas fa-exclamation-circle" />
              <span>{codeError}</span>
            </div>
          )}

          {/* 6-digit code boxes */}
          <div
            style={{
              display: "flex",
              gap: "0.625rem",
              justifyContent: "center",
              margin: "1.25rem 0",
            }}
          >
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (codeRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(idx, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                onPaste={handleCodePaste}
                style={{
                  width: "48px",
                  height: "56px",
                  textAlign: "center",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  borderRadius: "12px",
                  border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                  background: "var(--bg-input, var(--bg-subtle))",
                  color: "var(--text-base)",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            ))}
          </div>

          <button
            onClick={handleVerifyCode}
            className="auth-submit"
            disabled={codeLoading || code.join("").length < 6}
          >
            {codeLoading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                Verify Email <i className="fas fa-arrow-right" />
              </>
            )}
          </button>

          <p
            style={{
              textAlign: "center",
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
            }}
          >
            Didn't receive it?{" "}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              style={{
                background: "none",
                border: "none",
                cursor: resendCooldown > 0 ? "default" : "pointer",
                color: "var(--primary)",
                fontWeight: 700,
                padding: 0,
              }}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />
      <div className="auth-bg-orb auth-bg-orb--3" />

      <div className="auth-card auth-card--wide">
        <div className="auth-card__header">
          <div className="auth-card__icon">
            <i className="fas fa-user-plus" />
          </div>
          <h2 className="auth-card__title">Create Account</h2>
          <p className="auth-card__subtitle">
            Join thousands of language learners worldwide
          </p>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error">
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-row">
            <div className="auth-field">
              <label className="auth-field__label">Full Name</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-user auth-field__icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="name"
                  className="auth-field__input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field__label">Age</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-calendar auth-field__icon" />
                <input
                  type="number"
                  name="age"
                  placeholder="25"
                  value={form.age}
                  onChange={handleChange}
                  disabled={isLoading}
                  min="6"
                  max="120"
                  className="auth-field__input"
                />
              </div>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field__label">Username</label>
            <div className="auth-field__input-wrap">
              <i className="fas fa-at auth-field__icon" />
              <input
                type="text"
                name="username"
                placeholder="john_doe"
                value={form.username}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="username"
                minLength={3}
                maxLength={30}
                className="auth-field__input"
              />
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
                display: "block",
              }}
            >
              At least 3 characters. Letters, numbers, '.' and '_' only. Friends
              can find you by this.
            </span>
          </div>

          <div className="auth-field">
            <label className="auth-field__label">Email Address</label>
            <div className="auth-field__input-wrap">
              <i className="fas fa-envelope auth-field__icon" />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="email"
                className="auth-field__input"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field__label">
              Language You Want to Learn
            </label>
            <div className="auth-field__input-wrap">
              <i className="fas fa-language auth-field__icon" />
              <select
                name="preferredLanguage"
                value={form.preferredLanguage}
                onChange={handleChange}
                disabled={isLoading}
                className="auth-field__input auth-field__select"
              >
                <option value="">Select a language…</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-form-row">
            <div className="auth-field">
              <label className="auth-field__label">Password</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-lock auth-field__icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="new-password"
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

            <div className="auth-field">
              <label className="auth-field__label">Confirm Password</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-lock auth-field__icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="auth-field__input"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                <i className="fas fa-rocket" /> Create Account & Start
              </>
            )}
          </button>
        </form>

        {/* ── Google Sign-Up Button (Form Step Only) ────────────────────────── */}
        {step === "form" && (
          <div style={{ position: "relative", marginTop: "1.5rem" }}>
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
              <span>or sign up with</span>
              <div
                style={{ flex: 1, height: "1px", background: "var(--border)" }}
              />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignUp}
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
                  Signing up...
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
        )}

        <p className="auth-card__footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
