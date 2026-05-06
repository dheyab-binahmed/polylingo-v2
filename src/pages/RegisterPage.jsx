import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Russian',
  'Hindi', 'Dutch', 'Swedish', 'Polish', 'Turkish',
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', age: '', password: '', confirmPassword: '', preferredLanguage: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Full name is required'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Valid email is required'); return; }
    if (!form.age || parseInt(form.age) < 6 || parseInt(form.age) > 120) { setError('Please enter a valid age'); return; }
    if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!form.preferredLanguage) { setError('Please select a language to learn'); return; }

    setIsLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        age: form.age,
        password: form.password,
        preferredLanguage: form.preferredLanguage,
      });
      navigate('/assessment/language', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="auth-card__subtitle">Join thousands of language learners worldwide</p>
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
            <label className="auth-field__label">Language You Want to Learn</label>
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
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
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
                  type={showPassword ? 'text' : 'password'}
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
                  onClick={() => setShowPassword(p => !p)}
                  className="auth-field__eye"
                  tabIndex="-1"
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field__label">Confirm Password</label>
              <div className="auth-field__input-wrap">
                <i className="fas fa-lock auth-field__icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
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
            {isLoading ? <span className="auth-spinner" /> : (<><i className="fas fa-rocket" /> Create Account & Start</>)}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
