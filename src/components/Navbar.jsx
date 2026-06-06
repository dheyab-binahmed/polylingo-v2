import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function fetchNotifications() {
  const token = localStorage.getItem("polylingo_token");
  if (!token) return [];
  try {
    const res = await fetch(`${BASE_URL}/api/v1/users/me/achievements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Return most recent 5 achievements as notifications
    return (data || []).slice(-5).reverse().map(a => ({
      id: a.achievement_id,
      icon: a.achievement_icon || "🏅",
      title: a.achievement_title || "Achievement unlocked",
      time: a.earned_at,
    }));
  } catch { return []; }
}

export default function Navbar({ friendRequestCount = 0, onResetFriendCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [bellOpen,   setBellOpen]   = useState(false);
  const [notifs,     setNotifs]     = useState([]);
  const [unread,     setUnread]     = useState(0);
  const bellRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close sidebar on route change; reset friend badge when on friends page
  useEffect(() => {
    setMenuOpen(false);
    if (location.pathname === '/community/friends') {
      onResetFriendCount?.();
    }
  }, [location.pathname]);

  // Load notifications when user logs in
  useEffect(() => {
    if (!user) return;
    fetchNotifications().then(n => {
      setNotifs(n);
      // Count ones earned in last 7 days as "unread"
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setUnread(n.filter(x => x.time && new Date(x.time).getTime() > week).length);
    });
  }, [user]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const displayName = user?.full_name || user?.name || "";
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || '?').toUpperCase();

  return (
    <>
      <header className={`navbar-header${scrolled ? ' navbar-header--scrolled' : ''}`}>
        <div className="container">
          <nav className="navbar">
            <NavLink to="/" className="logo">
              <div className="logo-icon"><i className="fas fa-language" /></div>
              <span>Fluax</span>
            </NavLink>

            {/* Desktop nav links */}
            <div className="nav-links">
              {user && (
                <>
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
                  <NavLink to="/practice" className={({ isActive }) => isActive ? 'active' : ''}>Practice</NavLink>
                  <NavLink to="/community" className={({ isActive }) => isActive ? 'active' : ''} style={{ position: 'relative' }}>
                    Community
                    {friendRequestCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -6, right: -10,
                        background: '#ef4444', color: '#fff',
                        borderRadius: '50%', width: 18, height: 18,
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}>
                        {friendRequestCount > 9 ? '9+' : friendRequestCount}
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
                </>
              )}
            </div>

            {/* Desktop auth */}
            <div className="auth-buttons">
              {user ? (
                <div className="navbar-user">
                  <button className="btn btn-outline navbar-assessment-btn" onClick={() => navigate('/assessment')}>
                    <i className="fas fa-rocket" /> Assessment
                  </button>

                  {/* ── Notification bell ── */}
                  <div ref={bellRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => { setBellOpen(o => !o); setUnread(0); }}
                      title="Notifications"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        position: 'relative', padding: '0.35rem 0.5rem',
                        color: 'var(--text-muted)', fontSize: '1.05rem',
                        borderRadius: '8px', transition: 'color .2s',
                      }}
                    >
                      <i className="fas fa-bell" />
                      {unread > 0 && (
                        <span style={{
                          position: 'absolute', top: 2, right: 2,
                          background: '#ef4444', color: '#fff',
                          borderRadius: '50%', width: 16, height: 16,
                          fontSize: '0.65rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}>
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>

                    {bellOpen && (
                      <div style={{
                        position: 'absolute', top: '110%', right: 0,
                        background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                        borderRadius: '16px', padding: '0.75rem',
                        minWidth: 280, maxWidth: 320,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        zIndex: 1000,
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-base)', marginBottom: '0.6rem', padding: '0 0.25rem' }}>
                          <i className="fas fa-trophy" style={{ color: '#f59e0b', marginRight: '0.4rem' }} />
                          Recent Achievements
                        </div>
                        {notifs.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.5rem 0.25rem' }}>
                            Complete practice sessions to earn achievements!
                          </div>
                        ) : (
                          notifs.map(n => (
                            <div key={n.id} style={{
                              display: 'flex', alignItems: 'center', gap: '0.6rem',
                              padding: '0.5rem 0.25rem', borderBottom: '1px solid var(--border)',
                            }}>
                              <span style={{ fontSize: '1.3rem' }}>{n.icon}</span>
                              <div>
                                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-base)' }}>{n.title}</div>
                                {n.time && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {new Date(n.time).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => { setBellOpen(false); navigate('/profile'); }}
                          style={{
                            width: '100%', marginTop: '0.5rem', padding: '0.4rem',
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: '8px', color: '#6366f1', fontSize: '0.8rem',
                            fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          View all achievements →
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="navbar-avatar" title={displayName || user?.email}>{initials}</div>
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
                <div className="mobile-sidebar__name">{user.full_name || user.name || 'Learner'}</div>
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
                <NavLink to="/community" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`} style={{ position: 'relative' }}>
                  <i className="fas fa-users" /> Community
                  {friendRequestCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 8, right: 10,
                      background: '#ef4444', color: '#fff',
                      borderRadius: '50%', width: 18, height: 18,
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {friendRequestCount > 9 ? '9+' : friendRequestCount}
                    </span>
                  )}
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
                <NavLink to="/"        className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}><i className="fas fa-home" /> Home</NavLink>
                <NavLink to="/login"   className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}><i className="fas fa-sign-in-alt" /> Sign In</NavLink>
                <NavLink to="/register" className={({ isActive }) => `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`}><i className="fas fa-user-plus" /> Create Account</NavLink>
              </>
            )}
          </nav>
          {(user?.preferred_language || user?.preferredLanguage) && (
            <div className="mobile-sidebar__lang">
              <i className="fas fa-language" />
              <span>Learning: <strong>{user.preferred_language || user.preferredLanguage}</strong></span>
            </div>
          )}
        </div>
      </div>

      {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
