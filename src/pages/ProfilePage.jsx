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
import { fetchPracticeStats, fetchPracticeProgress, changePassword, saveNotificationPreferences } from '../services/api'

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
    full_name:          user?.full_name          || '',
    email:              user?.email              || '',
    age:                user?.age                || '',
    preferred_language: user?.preferred_language || '',
    selected_level:     user?.estimated_level || user?.selected_level || '',
  })
  const [formError, setFormError] = useState('')

  const LANGUAGES = [
    'Spanish','French','German','Italian','Portuguese',
    'Mandarin','Japanese','Korean','Arabic','Russian','Hindi','Dutch',
  ]

  const CEFR_LEVELS = [
    { value: 'A1', label: 'A1 — Beginner' },
    { value: 'A2', label: 'A2 — Elementary' },
    { value: 'B1', label: 'B1 — Intermediate' },
    { value: 'B2', label: 'B2 — Upper Intermediate' },
    { value: 'C1', label: 'C1 — Advanced' },
    { value: 'C2', label: 'C2 — Proficient' },
  ]

  const handleSave = () => {
    setFormError('')
    if (!form.full_name.trim())          { setFormError('Name is required');                  return }
    if (!form.email.trim())              { setFormError('Email is required');                 return }
    if (!form.email.includes('@'))       { setFormError('Please enter a valid email address'); return }
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
          { label: 'Full Name', key: 'full_name', type: 'text',   placeholder: 'Your name'        },
          { label: 'Email',     key: 'email',     type: 'email',  placeholder: 'you@example.com'  },
          { label: 'Age',       key: 'age',       type: 'number', placeholder: '25'               },
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
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Learning Language</label>
          <select
            value={form.preferred_language}
            onChange={e => setForm(p => ({ ...p, preferred_language: e.target.value }))}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              border: '2px solid var(--border)', borderRadius: '10px',
              fontSize: '0.92rem', fontFamily: 'inherit',
              color: 'var(--text-base)', background: 'var(--bg-card)',
              cursor: 'pointer', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="">Select language…</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* CEFR Level select */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Proficiency Level</label>
          <select
            value={form.selected_level}
            onChange={e => setForm(p => ({ ...p, selected_level: e.target.value }))}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              border: '2px solid var(--border)', borderRadius: '10px',
              fontSize: '0.92rem', fontFamily: 'inherit',
              color: 'var(--text-base)', background: 'var(--bg-card)',
              cursor: 'pointer', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="">Select level…</option>
            {CEFR_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
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

  // Real stats loaded from backend — streak, totalMinutes, achievements
  const [profileStats, setProfileStats] = useState({ streak: 0, totalMinutes: 0, achievementCount: 0 })
  const [earnedAchievements, setEarnedAchievements] = useState(null) // null = loading

  useEffect(() => {
    let mounted = true
    async function loadStats() {
      try {
        // Streak + today from PracticeStats endpoint
        const stats = await fetchPracticeStats()
        // Total minutes: sum all speaking + practice minutes from progress
        const progress = await fetchPracticeProgress(
          user?.preferred_language || user?.preferredLanguage || 'English'
        )

        const streak = stats?.streak ?? 0

        // Compute total practice minutes from all tracked activity
        let totalMinutes = 0
        if (progress) {
          totalMinutes += (progress.speaking?.minutes || 0)
          // Each grammar/reading/listening correct answer ≈ 1 min, writing submission ≈ 5 min
          totalMinutes += Math.round((progress.grammar?.totalCorrect  || 0) * 1)
          totalMinutes += Math.round((progress.reading?.totalCorrect  || 0) * 1)
          totalMinutes += Math.round((progress.listening?.totalCorrect || 0) * 1)
          totalMinutes += (progress.writing?.submissions || 0) * 5
          totalMinutes += (progress.flashcards?.sessions || 0) * 3
        }

        // Fetch earned achievements (list + count)
        let achievementCount = 0
        let achievementList = []
        try {
          const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
          const token = localStorage.getItem('polylingo_token')
          const res = await fetch(`${BASE}/api/v1/users/me/achievements`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (res.ok) {
            const data = await res.json()
            achievementList = data.achievements || []
            achievementCount = data.total ?? achievementList.length
          }
        } catch (_) {}

        if (mounted) {
          setProfileStats({ streak, totalMinutes, achievementCount })
          setEarnedAchievements(achievementList)
        }
      } catch (_) {}
    }
    loadStats()
    return () => { mounted = false }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('polylingo_settings')
      const base = saved ? JSON.parse(saved) : { email: true, reminders: true, dark: false }
      // Merge server prefs if available on the user object
      const serverPrefs = user?.notification_preferences
      if (serverPrefs) {
        base.email     = serverPrefs.email     ?? base.email
        base.reminders = serverPrefs.reminders ?? base.reminders
      }
      return base
    } catch {
      return { email: true, reminders: true, dark: false }
    }
  })
  const [editOpen, setEditOpen] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saveErr,  setSaveErr]  = useState('')

  // ── Change password form ────────────────────────────────────────────────────
  const [pwOpen,        setPwOpen]        = useState(false)
  const [pwCurrent,     setPwCurrent]     = useState('')
  const [pwNew,         setPwNew]         = useState('')
  const [pwConfirm,     setPwConfirm]     = useState('')
  const [pwLoading,     setPwLoading]     = useState(false)
  const [pwError,       setPwError]       = useState('')
  const [pwSuccess,     setPwSuccess]     = useState(false)
  const [showPwFields,  setShowPwFields]  = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (!pwCurrent) { setPwError('Current password is required.'); return; }
    if (pwNew.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (pwNew !== pwConfirm) { setPwError("New passwords don't match."); return; }
    setPwLoading(true)
    try {
      await changePassword(pwCurrent, pwNew)
      setPwSuccess(true)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
      setTimeout(() => { setPwSuccess(false); setPwOpen(false); setShowPwFields(false) }, 2500)
    } catch (err) {
      setPwError(err?.message || 'Could not change password. Check your current password.')
    } finally {
      setPwLoading(false)
    }
  }

  // ── Derived display values ──────────────────────────────────────────────
  const displayName  = user?.full_name         || 'Learner'
  const displayEmail = user?.email             || ''
  const displayLang  = user?.preferred_language || 'Not set'
  const level        = user?.estimated_level || user?.selected_level || user?.assessmentResults?.level || 'A1'
  const overall      = user?.assessmentResults?.overall ?? 0

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  // Real stats from backend (streak, totalMinutes, achievementCount)
  const totalMinutes = profileStats.totalMinutes
  const practiceLabel = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ''}`.trim()
    : `${totalMinutes}m`

  // Progress derived from assessment overall (0-10 scale → percent)
  const progressPct = Math.min(100, Math.round((overall / 10) * 100))

  const stats = [
    { value: practiceLabel,                    label: 'Total Practice', icon: 'fa-clock',          color: '#6366f1' },
    { value: profileStats.streak,              label: 'Day Streak',     icon: 'fa-fire',            color: '#10b981' },
    { value: profileStats.achievementCount,    label: 'Achievements',   icon: 'fa-star',            color: '#f59e0b' },
    { value: level,                            label: 'Current Level',  icon: 'fa-graduation-cap',  color: '#3b82f6' },
  ]

  // Map achievement titles/descriptions to icons and colours
  const ACH_ICON_MAP = {
    'First Step':          { icon: 'fa-rocket',      color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    'Practice Makes Perfect': { icon: 'fa-dumbbell', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    '3-Day Streak':        { icon: 'fa-fire',        color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    'Week Warrior':        { icon: 'fa-fire',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    'Monthly Master':      { icon: 'fa-crown',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Intermediate':        { icon: 'fa-graduation-cap', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    'Upper Intermediate':  { icon: 'fa-graduation-cap', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    'Advanced':            { icon: 'fa-star',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Vocabulary Builder':  { icon: 'fa-book',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    'Writer':              { icon: 'fa-pencil-alt',  color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
    'Conversationalist':   { icon: 'fa-comments',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  }
  const DEFAULT_ACH_STYLE = { icon: 'fa-trophy', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }

  // ── Save profile ────────────────────────────────────────────────────────
  const handleSaveProfile = async (form) => {
    setSaveErr('')
    try {
      await updateUser({
        full_name:          form.full_name,
        email:              form.email,
        age:                form.age,
        preferred_language: form.preferred_language,
        selected_level:     form.selected_level || undefined,
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
      // Persist email/reminders prefs to backend
      if (key === 'email' || key === 'reminders') {
        saveNotificationPreferences({ email: next.email, reminders: next.reminders })
          .catch(() => {}) // silent — localStorage already updated
      }
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
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{profileStats.streak ?? user?.streak ?? 0}</div>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-base)', margin: 0 }}>Achievements</h3>
                {earnedAchievements && earnedAchievements.length > 0 && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '0.2rem 0.7rem', borderRadius: 99 }}>
                    {earnedAchievements.length} earned
                  </span>
                )}
              </div>

              {/* Loading */}
              {earnedAchievements === null && (
                <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ width: 80, textAlign: 'center' }}>
                      <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--bg-subtle)', margin: '0 auto 0.4rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ height: 10, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {earnedAchievements !== null && earnedAchievements.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                    Complete your assessment and practice sessions to earn achievements!
                  </p>
                </div>
              )}

              {/* Real achievements */}
              {earnedAchievements !== null && earnedAchievements.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.875rem' }}>
                  {earnedAchievements.map(a => {
                    const style = ACH_ICON_MAP[a.title] || DEFAULT_ACH_STYLE
                    return (
                      <div key={a.id} title={a.description || a.title} style={{ textAlign: 'center', cursor: 'default' }}>
                        <div style={{
                          width: 54, height: 54, borderRadius: 14,
                          background: style.bg, color: style.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.3rem', margin: '0 auto 0.4rem',
                          boxShadow: `0 4px 12px ${style.bg}`,
                          transition: 'transform 0.15s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <i className={`fas ${style.icon}`} />
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
                      </div>
                    )
                  })}
                </div>
              )}
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

                {/* ── Change Password ── */}
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={() => { setShowPwFields((v) => !v); setPwError(''); setPwSuccess(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '0.95rem 1.1rem',
                      background: 'var(--bg-subtle)', borderRadius: '12px',
                      border: 'none', cursor: 'pointer', fontWeight: 700,
                      fontSize: '0.9rem', color: 'var(--text-base)',
                    }}
                  >
                    <span>🔑 Change Password</span>
                    <i className={`fas fa-chevron-${showPwFields ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }} />
                  </button>

                  {showPwFields && (
                    <form onSubmit={handleChangePassword} style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      {pwError && (
                        <div style={{
                          padding: '0.7rem 1rem', borderRadius: '10px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                          <i className="fas fa-exclamation-circle" />
                          {pwError}
                        </div>
                      )}
                      {pwSuccess && (
                        <div style={{
                          padding: '0.7rem 1rem', borderRadius: '10px',
                          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                          color: '#065f46', fontSize: '0.85rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                          <i className="fas fa-check-circle" />
                          Password changed successfully!
                        </div>
                      )}
                      {['Current password', 'New password', 'Confirm new password'].map((placeholder, idx) => {
                        const val   = [pwCurrent, pwNew, pwConfirm][idx]
                        const setVal = [setPwCurrent, setPwNew, setPwConfirm][idx]
                        return (
                          <div key={placeholder} style={{ position: 'relative' }}>
                            <i className="fas fa-lock" style={{
                              position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                              color: 'var(--text-faint)', fontSize: '0.8rem',
                            }} />
                            <input
                              type="password"
                              placeholder={placeholder}
                              value={val}
                              onChange={(e) => { setVal(e.target.value); setPwError('') }}
                              disabled={pwLoading}
                              style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '0.75rem 0.875rem 0.75rem 2.25rem',
                                borderRadius: '10px', border: '1.5px solid var(--border)',
                                background: 'var(--bg-input, var(--bg-subtle))',
                                color: 'var(--text-base)', fontSize: '0.9rem',
                              }}
                            />
                          </div>
                        )
                      })}
                      <button
                        type="submit"
                        disabled={pwLoading}
                        style={{
                          padding: '0.75rem', borderRadius: '10px', border: 'none',
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          color: 'white', fontWeight: 700, fontSize: '0.9rem',
                          cursor: pwLoading ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                      >
                        {pwLoading
                          ? <><span className="auth-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
                          : <><i className="fas fa-key" /> Update Password</>
                        }
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
