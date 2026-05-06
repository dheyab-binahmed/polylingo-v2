import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      <header className={`navbar-header${scrolled ? ' navbar-header--scrolled' : ''}`}>
        <div className="container">
          <nav className="navbar">
            <NavLink to="/" className="logo">
              <div className="logo-icon"><i className="fas fa-language" /></div>
              <span>PolyLingo</span>
            </NavLink>

            {/* Desktop nav links */}
            <div className="nav-links">
              {user && (
                <>
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
                  <NavLink to="/practice" className={({ isActive }) => isActive ? 'active' : ''}>Practice</NavLink>
                  <NavLink to="/community" className={({ isActive }) => isActive ? 'active' : ''}>Community</NavLink>
                  <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
                </>
              )}
            </div>

            {/* Desktop auth */}
            <div className="auth-buttons">
              {user ? (
                <div className="navbar-user">
                  <button
                    className="btn btn-outline navbar-assessment-btn"
                    onClick={() => navigate('/assessment')}
                  >
                    <i className="fas fa-rocket" /> Assessment
                  </button>
                  <div className="navbar-avatar" title={user.name || user.email}>
                    {initials}
                  </div>
                  <button className="btn btn-outline navbar-logout-btn" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt" /> Logout
                  </button>
                </div>
              ) : (
                <div className="navbar-auth-btns">
                  <button className="btn btn-outline" onClick={() => navigate('/login')}>Sign In</button>
                  <button className="btn btn-primary" onClick={() => navigate('/register')}>
                    <i className="fas fa-rocket" /> Get Started
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className={`navbar-hamburger${menuOpen ? ' navbar-hamburger--open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar${menuOpen ? ' mobile-sidebar--open' : ''}`}>
        <div className="mobile-sidebar__inner">
          {user && (
            <div className="mobile-sidebar__profile">
              <div className="mobile-sidebar__avatar">{initials}</div>
              <div>
                <div className="mobile-sidebar__name">{user.name || 'Learner'}</div>
                <div className="mobile-sidebar__email">{user.email}</div>
              </div>
            </div>
          )}

          <nav className="mobile-sidebar__nav">
            {user ? (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-tachometer-alt" /> Dashboard
                </NavLink>
                <NavLink to="/practice" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-dumbbell" /> Practice
                </NavLink>
                <NavLink to="/community" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-users" /> Community
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-user" /> Profile
                </NavLink>
                <NavLink to="/assessment" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-rocket" /> Assessment
                </NavLink>
                <button className="mobile-nav-link mobile-nav-link--logout" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt" /> Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-home" /> Home
                </NavLink>
                <NavLink to="/login" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-sign-in-alt" /> Sign In
                </NavLink>
                <NavLink to="/register" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}>
                  <i className="fas fa-user-plus" /> Create Account
                </NavLink>
              </>
            )}
          </nav>

          {user?.preferredLanguage && (
            <div className="mobile-sidebar__lang">
              <i className="fas fa-language" />
              <span>Learning: <strong>{user.preferredLanguage}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
