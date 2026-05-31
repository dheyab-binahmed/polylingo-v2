import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser, verifyEmailCode, resendVerificationCode } from "../services/api";
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
    email: "",
    age: "",
    password: "",
    confirmPassword: "",
    preferredLanguage: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Code verification step
  const [step, setStep] = useState("form"); // "form" | "verify"
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef([]);

  const { loginWithData } = useAuth();
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
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        age: form.age,
        password: form.password,
        preferredLanguage: form.preferredLanguage,
      });
      // Backend just sent a verification code — show code entry screen
      setPendingEmail(form.email.trim());
      setStep("verify");
    } catch (err) {
      const msg = err?.message || String(err);
      const isNetworkErr =
        msg.toLowerCase().includes("load failed") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch");
      if (isNetworkErr) {
        setError("Cannot reach the server. Make sure the backend is running on port 5000.");
      } else {
        setError(formatErrorForDisplay(err, err.status));
      }
      logError(err, "RegisterPage.handleSubmit");
    } finally {
      setIsLoading(false);
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
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) { setCodeError("Please enter all 6 digits."); return; }
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
        setResendCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
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
          <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", margin: "1.25rem 0" }}>
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
                  width: "48px", height: "56px",
                  textAlign: "center", fontSize: "1.5rem", fontWeight: 800,
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
            {codeLoading ? <span className="auth-spinner" /> : <>Verify Email <i className="fas fa-arrow-right" /></>}
          </button>

          <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Didn't receive it?{" "}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              style={{ background: "none", border: "none", cursor: resendCooldown > 0 ? "default" : "pointer", color: "var(--primary)", fontWeight: 700, padding: 0 }}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
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
