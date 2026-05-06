/**
 * ProfilePage.jsx
 *
 * Bugs fixed in this version:
 *  1. CRASH  — React.useEffect used but React was never imported → replaced with useEffect
 *  2. CRASH  — Assessment score bars: value could be undefined → safe fallback with ?? 0
 *  3. WRONG  — Progress bar width could overflow 100% (score > 10) → clamped with Math.min
 *  4. WRONG  — '87%' progress was hardcoded → computed from assessmentResults.overall
 *  5. WRONG  — 'Total Practice' showed hardcoded '45h' → computed from user.totalMinutes
 *  6. WRONG  — user?.streak / achievements fallbacks were strings '14'/'8' → numbers 0
 *  7. STYLE  — Toggle: <label> click + inner <div> onClick = double-fire → removed inner onClick
 *  8. STYLE  — Hardcoded '#f8fafc', '#f1f5f9', 'white' don't follow dark mode CSS vars
 *  9. PERF   — Dark-mode effect ran on every settings change → dependency array fixed
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// ─── Toggle component ─────────────────────────────────────────────────────────
// FIX #7: Removed inner <div onClick={onChange}> — the outer <label> already handles
// the click and forwards it to the toggle. Having both caused onChange to fire twice.
function Toggle({ checked, onChange, label }) {
  return (
    <label
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.95rem 1.1rem',
        background: 'var(--bg-subtle)',           // FIX #8: was '#f8fafc'
        borderRadius: '12px',
        border: '1.5px solid var(--border)',       // FIX #8: was '#f1f5f9'
        cursor: 'pointer', userSelect: 'none', transition: 'border-color .2s',
      }}
      onMouseOver={e => e.currentTarget.style.borderColor = '#c7d2fe'}
      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.93rem' }}>{label}</span>
      {/* FIX #7: input[type=checkbox] is hidden — label click toggles it natively */}
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      <div
        style={{
          width: '46px', height: '26px', borderRadius: '99px', flexShrink: 0,
          background: checked ? '#6366f1' : 'var(--border)',
          position: 'relative', transition: 'background .25s',
          pointerEvents: 'none', // let the label handle the click
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: checked ? '23px' : '3px',
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'var(--bg-card)',             // FIX #8: was 'white'
          transition: 'left .25s',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }} />
      </div>
    </label>
  )
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name:              user?.name              || '',
    email:             user?.email             || '',
    age:               user?.age               || '',
    preferredLanguage: user?.preferredLanguage || '',
  })
  const [formError, setFormError] = useState('')

  const LANGUAGES = [
    'Spanish','French','German','Italian','Portuguese',
    'Mandarin','Japanese','Korean','Arabic','Russian','Hindi','Dutch',
  ]

  const handleSave = () => {
    setFormError('')
    if (!form.name.trim())              { setFormError('Name is required');                  return }
    if (!form.email.trim())             { setFormError('Email is required');                 return }
    if (!form.email.includes('@'))      { setFormError('Please enter a valid email address'); return }
    onSave(form)
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        backdropFilter: 'blur(4px)', zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: '20px', padding: '2rem',
        width: '100%', maxWidth: '460px',
        boxShadow: '0 25px 60px rgba(0,0,0,.2)',
        animation: 'slideUp .3s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-base)' }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '1.1rem' }}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Inline error */}
        {formError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
            padding: '0.65rem 1rem', marginBottom: '1rem', color: '#dc2626',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <i className="fas fa-exclamation-circle" /> {formError}
          </div>
        )}

        {/* Text fields */}
        {[
          { label: 'Full Name', key: 'name',  type: 'text',   placeholder: 'Your name'        },
          { label: 'Email',     key: 'email', type: 'email',  placeholder: 'you@example.com'  },
          { label: 'Age',       key: 'age',   type: 'number', placeholder: '25'               },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                border: '2px solid var(--border)', borderRadius: '10px',
                fontSize: '0.92rem', fontFamily: 'inherit',
                color: 'var(--text-base)', background: 'var(--bg-card)', // FIX #8
                transition: 'border-color .2s', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        ))}

        {/* Language select */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Learning Language</label>
          <select
            value={form.preferredLanguage}
            onChange={e => setForm(p => ({ ...p, preferredLanguage: e.target.value }))}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              border: '2px solid var(--border)', borderRadius: '10px',
              fontSize: '0.92rem', fontFamily: 'inherit',
              color: 'var(--text-base)', background: 'var(--bg-card)', // FIX #8
              cursor: 'pointer', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="">Select language…</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            border: '2px solid var(--border)', borderRadius: '10px',
            background: 'var(--bg-card)',       // FIX #8: was 'white'
            cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.92rem',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: '0.75rem',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 700, color: '#fff', fontSize: '0.92rem',
          }}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ─── Score progress bar (used in Assessment Results section) ──────────────────
function ScoreBar({ label, value, color }) {
  // FIX #2 + #3: safe fallback to 0 if value is undefined; clamp to [0,10]
  const safeVal = Math.min(10, Math.max(0, value ?? 0))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color }}>{safeVal}/10</span>
      </div>
      <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${(safeVal / 10) * 100}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width .8s ease' }} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateUser } = useAuth()

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('polylingo_settings')
      return saved ? JSON.parse(saved) : { email: true, reminders: true, dark: false }
    } catch {
      return { email: true, reminders: true, dark: false }
    }
  })
  const [editOpen, setEditOpen] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saveErr,  setSaveErr]  = useState('')

  // ── Derived display values ──────────────────────────────────────────────
  const displayName  = user?.name              || 'Learner'
  const displayEmail = user?.email             || ''
  const displayLang  = user?.preferredLanguage || 'Not set'
  const level        = user?.assessmentResults?.level   || 'Beginner'
  const overall      = user?.assessmentResults?.overall ?? 0

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  // FIX #5: compute total practice time from real user data
  const totalMinutes = user?.totalMinutes ?? 0
  const practiceLabel = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ''}`.trim()
    : `${totalMinutes}m`

  // FIX #4 + #5: progress derived from assessment overall (0-10 scale → percent)
  const progressPct = Math.min(100, Math.round((overall / 10) * 100))

  // FIX #9: streak and achievements fallback to 0 (number), not '14' (string)
  const stats = [
    { value: practiceLabel,        label: 'Total Practice', icon: 'fa-clock',          color: '#6366f1' },
    { value: user?.streak ?? 0,    label: 'Day Streak',     icon: 'fa-fire',            color: '#10b981' },
    { value: user?.achievements ?? 0, label: 'Achievements', icon: 'fa-star',           color: '#f59e0b' },
    { value: level,                label: 'Current Level',  icon: 'fa-graduation-cap',  color: '#3b82f6' },
  ]

  const achievements = [
    { icon: 'fa-trophy',     label: 'First Lesson',  color: '#fbbf24', bg: '#fef3c7' },
    { icon: 'fa-fire',       label: '7-Day Streak',  color: '#f97316', bg: '#ffedd5' },
    { icon: 'fa-star',       label: 'Top Scorer',    color: '#8b5cf6', bg: '#ede9fe' },
    { icon: 'fa-comments',   label: '10 Convos',     color: '#10b981', bg: '#d1fae5' },
    { icon: 'fa-book',       label: 'Grammar Pro',   color: '#3b82f6', bg: '#dbeafe' },
    { icon: 'fa-microphone', label: 'Vocal Star',    color: '#ec4899', bg: '#fce7f3' },
  ]

  // ── Save profile ────────────────────────────────────────────────────────
  const handleSaveProfile = async (form) => {
    setSaveErr('')
    try {
      await updateUser({
        name:              form.name,
        email:             form.email,
        age:               form.age,
        preferredLanguage: form.preferredLanguage,
      })
      setEditOpen(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveErr(err.message || 'Failed to save profile. Please try again.')
      console.warn('Profile save failed:', err)
    }
  }

  // ── Settings toggle ─────────────────────────────────────────────────────
  const toggleSetting = (key) => {
    setSettings(s => {
      const next = { ...s, [key]: !s[key] }
      localStorage.setItem('polylingo_settings', JSON.stringify(next))
      return next
    })
  }

  // FIX #1: was React.useEffect — React was never imported
  // FIX #9 PERF: run only when settings.dark changes, not on every render
  useEffect(() => {
    document.documentElement.setAttribute('data-dark', settings.dark ? 'true' : 'false')
  }, [settings.dark])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="pg-wrapper" style={{ minHeight: '100vh', paddingTop: '80px', paddingBottom: '3rem' }}>
      <div className="container">

        {/* ── Success toast ── */}
        {saved && (
          <div style={{
            position: 'fixed', top: '90px', right: '1.5rem', zIndex: 9999,
            background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem',
            borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(16,185,129,.35)',
            animation: 'slideUp .3s ease',
          }}>
            <i className="fas fa-check-circle" /> Profile saved!
          </div>
        )}

        {/* ── Error toast ── */}
        {saveErr && (
          <div style={{
            position: 'fixed', top: '90px', right: '1.5rem', zIndex: 9999,
            background: '#ef4444', color: '#fff', padding: '0.75rem 1.25rem',
            borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(239,68,68,.35)',
            animation: 'slideUp .3s ease',
          }}>
            <i className="fas fa-exclamation-circle" /> {saveErr}
            <button onClick={() => setSaveErr('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem' }}>×</button>
          </div>
        )}

        {/* ── Edit modal ── */}
        {editOpen && (
          <EditProfileModal
            user={user}
            onClose={() => setEditOpen(false)}
            onSave={handleSaveProfile}
          />
        )}

        {/* ── Page title ── */}
        <div style={{ padding: '1.5rem 0' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '0.25rem' }}>Your Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage your account and track your learning journey</p>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }} className="profile-grid">

          {/* ── Sidebar ── */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px', padding: '2rem',
            boxShadow: '0 2px 12px rgba(0,0,0,.06)', textAlign: 'center',
          }}>
            {/* Avatar */}
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', color: '#fff',
              fontSize: '1.75rem', fontWeight: 800, letterSpacing: '1px',
            }}>
              {initials}
            </div>

            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '0.2rem' }}>{displayName}</h2>
            <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{displayEmail}</p>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: '#ede9fe', color: '#7c3aed',
              padding: '0.25rem 0.75rem', borderRadius: '99px',
              fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem',
            }}>
              <i className="fas fa-language" /> {displayLang}
            </span>

            {/* Quick stats — FIX #4 #5: real values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1' }}>{progressPct}%</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', fontWeight: 500 }}>Progress</div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{user?.streak ?? 0}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', fontWeight: 500 }}>Streak</div>
              </div>
            </div>

            <button
              onClick={() => setEditOpen(true)}
              style={{
                width: '100%', padding: '0.7rem',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem',
                transition: 'opacity .2s',
              }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              <i className="fas fa-edit" /> Edit Profile
            </button>
          </div>

          {/* ── Main column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Stats */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
              boxShadow: '0 2px 12px rgba(0,0,0,.06)',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '1.25rem' }}>Learning Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                {stats.map(s => (
                  <div key={s.label} style={{
                    textAlign: 'center', padding: '1rem 0.75rem',
                    background: 'var(--bg-subtle)', borderRadius: '14px',
                    border: `2px solid ${s.color}18`,
                  }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: s.color }}>
                      <i className={`fas ${s.icon}`} />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)' }}>{s.value}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
              boxShadow: '0 2px 12px rgba(0,0,0,.06)',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '1.25rem' }}>Achievements</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.875rem' }}>
                {achievements.map(a => (
                  <div key={a.label} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '54px', height: '54px', borderRadius: '14px',
                      background: a.bg, color: a.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', margin: '0 auto 0.4rem',
                    }}>
                      <i className={`fas ${a.icon}`} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{a.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Results — only shown if user has completed the assessment */}
            {user?.assessmentResults && (
              <div style={{
                background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
                boxShadow: '0 2px 12px rgba(0,0,0,.06)',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '1.25rem' }}>Assessment Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
                  {/* FIX #2 + #3: extracted to ScoreBar which safely handles undefined values */}
                  <ScoreBar label="Pronunciation" value={user.assessmentResults.pronunciationScore} color="#8b5cf6" />
                  <ScoreBar label="Speaking"      value={user.assessmentResults.fluencyScore}       color="#10b981" />
                  <ScoreBar label="Grammar"       value={user.assessmentResults.grammarScore}       color="#f59e0b" />
                  <ScoreBar label="Reading"       value={user.assessmentResults.readingScore}       color="#3b82f6" />
                </div>
              </div>
            )}

            {/* Account Settings */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
              boxShadow: '0 2px 12px rgba(0,0,0,.06)',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '1.25rem' }}>Account Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <Toggle checked={settings.email}     onChange={() => toggleSetting('email')}     label="📧 Email Notifications" />
                <Toggle checked={settings.reminders} onChange={() => toggleSetting('reminders')} label="⏰ Practice Reminders"  />
                <Toggle checked={settings.dark}      onChange={() => toggleSetting('dark')}      label="🌙 Dark Mode"           />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
