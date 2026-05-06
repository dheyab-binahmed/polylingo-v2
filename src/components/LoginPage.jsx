import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Demo credentials only shown when VITE_SHOW_DEMO=true in .env.local
// Leave unset (or false) in production to hide this block.
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === 'true';
const DEMO_EMAIL = 'user@demo.com';
const DEMO_PASSWORD = 'demo1';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters'); return; }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // One-click autofill for demo — only rendered when VITE_SHOW_DEMO=true
  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
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
          <p className="auth-card__subtitle">Sign in to continue your language journey</p>
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="auth-field__input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="auth-field__eye"
                tabIndex="-1"
              >
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading
              ? <span className="auth-spinner" />
              : (<>Sign In <i className="fas fa-arrow-right" /></>)
            }
          </button>
        </form>

        {/* Demo autofill button — gated by VITE_SHOW_DEMO=true in .env.local */}
        {SHOW_DEMO && (
          <button
            type="button"
            className="auth-demo"
            onClick={fillDemo}
            title="Click to autofill demo credentials"
            style={{ cursor: 'pointer', background: 'none', border: 'none', width: '100%' }}
          >
            <i className="fas fa-flask" /> Demo account — click to autofill
          </button>
        )}

        <p className="auth-card__footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one free</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
