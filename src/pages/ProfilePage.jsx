/**
 * ProfilePage.jsx — "Language Passport"
 *
 * The profile reimagined as the learner's travel document for their language
 * journey. Signature element: the fluency ring + a monospaced passport data
 * band (replacing the old generic stat-card grid). Motion is one orchestrated
 * load sequence (band → ring draws → fields stagger → sections reveal), with
 * `prefers-reduced-motion` fully respected.
 *
 * All prior behaviour is preserved: real backend stats, edit-profile modal,
 * change-password flow, settings + dark-mode toggles, and save toasts.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion, animate } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { fetchPracticeStats, fetchPracticeProgress, changePassword, saveNotificationPreferences } from '../services/api'
import './ProfilePage.css'

// ── Count-up for numeric passport values; instant when motion is reduced ──
function CountUp({ value, duration = 1.1 }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setDisplay(value); return }
    const controls = animate(0, value, {
      duration, ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, reduce, duration])
  return <>{display}</>
}

// ── Fluency ring drawn around the avatar (encodes assessment overall %) ──
function FluencyRing({ pct, initials }) {
  const reduce = useReducedMotion()
  const R = 52
  const C = 2 * Math.PI * R
  const target = C * (1 - Math.min(100, Math.max(0, pct)) / 100)
  return (
    <div className="pp-avatar">
      <svg className="pp-avatar__ring" viewBox="0 0 116 116" width="116" height="116">
        <circle cx="58" cy="58" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
        <motion.circle
          cx="58" cy="58" r={R} fill="none"
          stroke="#fde68a" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: reduce ? target : C }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: reduce ? 0 : 1.4, delay: reduce ? 0 : 0.5, ease: 'easeInOut' }}
        />
      </svg>
      <div className="pp-avatar__face">{initials}</div>
      <span className="pp-avatar__pct">{pct}% fluent</span>
    </div>
  )
}

// ── Accessible preference row with a toggle switch ──
function PrefToggle({ icon, tint, label, desc, checked, onChange }) {
  return (
    <label className="pp-pref">
      <span className="pp-pref__icon" style={{ background: `${tint}1a`, color: tint }}>
        <i className={`fas ${icon}`} />
      </span>
      <span className="pp-pref__text">
        <span className="pp-pref__label">{label}</span>
        <span className="pp-pref__desc">{desc}</span>
      </span>
      <input className="pp-sr" type="checkbox" checked={checked} onChange={onChange} />
      <span className="pp-switch2" data-on={checked}>
        <span className="pp-switch2__knob" />
      </span>
    </label>
  )
}

// ── Animated score bar — fills when it scrolls into view ──
function ScoreBar({ label, value, color }) {
  const reduce = useReducedMotion()
  const attempted = value != null && !Number.isNaN(value)
  const safeVal = Math.min(10, Math.max(0, value ?? 0))
  return (
    <div className="pp-bar">
      <div className="pp-bar__top">
        <span className="pp-bar__label">{label}</span>
        <span className="pp-bar__val" style={{ color: attempted ? color : 'var(--text-faint)' }}>
          {attempted ? `${safeVal.toFixed(1)}/10` : 'Not attempted'}
        </span>
      </div>
      <div className="pp-bar__track">
        <motion.div
          className="pp-bar__fill"
          style={{ background: color }}
          initial={{ width: reduce ? `${(safeVal / 10) * 100}%` : 0 }}
          whileInView={{ width: `${(safeVal / 10) * 100}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Edit Profile Modal (unchanged logic, animated shell) ──
function EditProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name:          user?.full_name          || '',
    username:           user?.username            || '',
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
    const username = form.username.trim().toLowerCase()
    if (username) {
      if (username.length < 3)               { setFormError('Username must be at least 3 characters'); return }
      if (!/^[a-z0-9._]+$/.test(username))   { setFormError("Username can only contain letters, numbers, '.' and '_'"); return }
    }
    if (!form.email.trim())              { setFormError('Email is required');                 return }
    if (!form.email.includes('@'))       { setFormError('Please enter a valid email address'); return }
    onSave({ ...form, username })
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    border: '2px solid var(--border)', borderRadius: '10px',
    fontSize: '0.92rem', fontFamily: 'inherit',
    color: 'var(--text-base)', background: 'var(--bg-input)',
    transition: 'border-color .2s', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,12,41,.55)',
        backdropFilter: 'blur(4px)', zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '2rem',
          width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,.3)',
        }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-base)' }}>Edit profile</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '1.1rem' }}>
            <i className="fas fa-times" />
          </button>
        </div>

        {formError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px',
            padding: '0.65rem 1rem', marginBottom: '1rem', color: '#dc2626',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <i className="fas fa-exclamation-circle" /> {formError}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Username</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontWeight: 700, fontSize: '0.92rem' }}>@</span>
            <input
              type="text" placeholder="john_doe" value={form.username} maxLength={30}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: '2rem' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '0.3rem', display: 'block' }}>
            Friends can find you by this. At least 3 characters; letters, numbers, '.' and '_'.
          </span>
        </div>

        {[
          { label: 'Full name', key: 'full_name', type: 'text',   placeholder: 'Your name'        },
          { label: 'Email',     key: 'email',     type: 'email',  placeholder: 'you@example.com'  },
          { label: 'Age',       key: 'age',       type: 'number', placeholder: '25'               },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>{f.label}</label>
            <input
              type={f.type} placeholder={f.placeholder} value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        ))}

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Learning language</label>
          <select
            value={form.preferred_language}
            onChange={e => setForm(p => ({ ...p, preferred_language: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="">Select language…</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Proficiency level</label>
          <select
            value={form.selected_level}
            onChange={e => setForm(p => ({ ...p, selected_level: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="">Select level…</option>
            {CEFR_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            border: '2px solid var(--border)', borderRadius: '10px',
            background: 'var(--bg-card)', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.92rem',
          }}>Cancel</button>
          <motion.button
            onClick={handleSave}
            whileHover={{ filter: 'brightness(1.08)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 2, padding: '0.75rem',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, color: '#fff', fontSize: '0.92rem',
            }}>Save changes</motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Section card with scroll-reveal ──
function Section({ label, title, action, children, delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      className="pp-card"
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <div className="pp-card__head">
        <div>
          <div className="pp-eyebrow pp-card__label">{label}</div>
          <h3 className="pp-card__title">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

// ════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const reduce = useReducedMotion()

  const [profileStats, setProfileStats] = useState({ streak: 0, totalMinutes: 0, achievementCount: 0 })
  const [earnedAchievements, setEarnedAchievements] = useState(null) // null = loading

  useEffect(() => {
    let mounted = true
    async function loadStats() {
      try {
        const stats = await fetchPracticeStats()
        const progress = await fetchPracticeProgress(
          user?.preferred_language || user?.preferredLanguage || 'English'
        )
        const streak = stats?.streak ?? 0

        let totalMinutes = 0
        if (progress) {
          totalMinutes += (progress.speaking?.minutes || 0)
          totalMinutes += Math.round((progress.grammar?.totalCorrect  || 0) * 1)
          totalMinutes += Math.round((progress.reading?.totalCorrect  || 0) * 1)
          totalMinutes += Math.round((progress.listening?.totalCorrect || 0) * 1)
          totalMinutes += (progress.writing?.submissions || 0) * 5
          totalMinutes += (progress.flashcards?.sessions || 0) * 3
        }

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

  // Change-password form
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
      setTimeout(() => { setPwSuccess(false); setShowPwFields(false) }, 2500)
    } catch (err) {
      setPwError(err?.message || 'Could not change password. Check your current password.')
    } finally {
      setPwLoading(false)
    }
  }

  // Derived display values
  const displayName  = user?.full_name         || 'Learner'
  const displayEmail = user?.email             || ''
  const displayLang  = user?.preferred_language || 'Not set'
  const level        = user?.estimated_level || user?.selected_level || user?.assessmentResults?.cefrLevel || 'A1'
  const overall      = user?.assessmentResults?.overall ?? 0

  const initials = displayName
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const totalMinutes = profileStats.totalMinutes
  const practiceHours = totalMinutes >= 60 ? Math.floor(totalMinutes / 60) : 0
  const practiceMins  = totalMinutes % 60
  const progressPct = Math.min(100, Math.round((overall / 10) * 100))

  // Map achievement titles to a stamp icon + colour
  const ACH_ICON_MAP = {
    'First Step':             { icon: 'fa-rocket',        color: '#6366f1' },
    'Practice Makes Perfect': { icon: 'fa-dumbbell',      color: '#10b981' },
    '3-Day Streak':           { icon: 'fa-fire',          color: '#f97316' },
    'Week Warrior':           { icon: 'fa-fire',          color: '#ef4444' },
    'Monthly Master':         { icon: 'fa-crown',         color: '#f59e0b' },
    'Intermediate':           { icon: 'fa-graduation-cap', color: '#8b5cf6' },
    'Upper Intermediate':     { icon: 'fa-graduation-cap', color: '#6366f1' },
    'Advanced':               { icon: 'fa-star',          color: '#f59e0b' },
    'Vocabulary Builder':     { icon: 'fa-book',          color: '#3b82f6' },
    'Writer':                 { icon: 'fa-pencil-alt',    color: '#ec4899' },
    'Conversationalist':      { icon: 'fa-comments',      color: '#10b981' },
  }
  const DEFAULT_ACH_STYLE = { icon: 'fa-trophy', color: '#f59e0b' }

  const handleSaveProfile = async (form) => {
    setSaveErr('')
    try {
      await updateUser({
        full_name:          form.full_name,
        username:           form.username || undefined,
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

  const toggleSetting = (key) => {
    setSettings(s => {
      const next = { ...s, [key]: !s[key] }
      localStorage.setItem('polylingo_settings', JSON.stringify(next))
      if (key === 'email' || key === 'reminders') {
        saveNotificationPreferences({ email: next.email, reminders: next.reminders }).catch(() => {})
      }
      return next
    })
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-dark', settings.dark ? 'true' : 'false')
  }, [settings.dark])

  // Orchestrated entrance for the passport band + its data fields
  const bandVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
  }
  const fieldVariants = {
    hidden: reduce ? false : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  const fields = [
    { label: 'Level',   value: level },
    { label: 'Streak',  value: <><CountUp value={profileStats.streak} /></>, unit: 'days' },
    { label: 'Practice', value: practiceHours > 0
        ? <><CountUp value={practiceHours} /></>
        : <><CountUp value={practiceMins} /></>,
      unit: practiceHours > 0 ? 'hrs' : 'min' },
    { label: 'Stamps',  value: <><CountUp value={profileStats.achievementCount} /></> },
  ]

  return (
    <div className="pp-page">
      <div className="pp-shell">

        {/* ── Toasts ── */}
        <AnimatePresence>
          {saved && (
            <motion.div
              className="pp-toast"
              style={{ background: '#10b981', boxShadow: '0 8px 24px rgba(16,185,129,.35)' }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            >
              <i className="fas fa-check-circle" /> Profile saved
            </motion.div>
          )}
          {saveErr && (
            <motion.div
              className="pp-toast"
              style={{ background: '#ef4444', boxShadow: '0 8px 24px rgba(239,68,68,.35)' }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            >
              <i className="fas fa-exclamation-circle" /> {saveErr}
              <button onClick={() => setSaveErr('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem' }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Edit modal ── */}
        <AnimatePresence>
          {editOpen && (
            <EditProfileModal user={user} onClose={() => setEditOpen(false)} onSave={handleSaveProfile} />
          )}
        </AnimatePresence>

        {/* ════════ PASSPORT IDENTITY BAND ════════ */}
        <motion.div
          className="pp-passport"
          initial={reduce ? false : { opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="pp-passport__top">
            <span className="pp-eyebrow pp-passport__doc">PolyLingo · Language Passport</span>
            <span className="pp-passport__seal">ID {String(user?.id ?? '0000').toString().padStart(4, '0')}</span>
          </div>

          <div className="pp-identity">
            <FluencyRing pct={progressPct} initials={initials} />

            <div>
              <h1 className="pp-id__name">{displayName}</h1>
              <div className="pp-id__meta">
                {user?.username && <span className="pp-id__handle">@{user.username}</span>}
                {displayEmail && <span>{displayEmail}</span>}
              </div>
              <span className="pp-id__lang">
                <i className="fas fa-language" /> Learning {displayLang}
              </span>
            </div>

            <motion.button
              className="pp-edit"
              onClick={() => setEditOpen(true)}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
            >
              <i className="fas fa-pen" /> Edit profile
            </motion.button>
          </div>

          {/* ── Monospaced passport data band ── */}
          <motion.div className="pp-fields" variants={bandVariants} initial="hidden" animate="show">
            {fields.map((f) => (
              <motion.div key={f.label} className="pp-field" variants={fieldVariants}>
                <div className="pp-eyebrow pp-field__label">{f.label}</div>
                <div className="pp-field__value">
                  {f.value}{f.unit && <span className="pp-field__unit">{f.unit}</span>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* ════════ CONTENT ════════ */}
        <div className="pp-stack">

          {/* Achievements / Stamps */}
          <Section
            label="Collected on your journey"
            title="Stamps"
            action={earnedAchievements && earnedAchievements.length > 0
              ? <span className="pp-count">{earnedAchievements.length} earned</span>
              : null}
          >
            {earnedAchievements === null && (
              <div className="pp-stamps">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="pp-stamp">
                    <div className="pp-skel" style={{ width: 60, height: 60, margin: '0 auto 0.5rem' }} />
                    <div className="pp-skel" style={{ height: 9, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            )}

            {earnedAchievements !== null && earnedAchievements.length === 0 && (
              <div className="pp-empty">
                <div className="pp-empty__mark">🛂</div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  No stamps yet. Finish your assessment and practice to start collecting them.
                </p>
              </div>
            )}

            {earnedAchievements !== null && earnedAchievements.length > 0 && (
              <div className="pp-stamps">
                {earnedAchievements.map((a, i) => {
                  const style = ACH_ICON_MAP[a.title] || DEFAULT_ACH_STYLE
                  return (
                    <motion.div
                      key={a.id} className="pp-stamp" title={a.description || a.title}
                      initial={reduce ? false : { opacity: 0, scale: 1.4, rotate: -8 }}
                      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 18, delay: i * 0.05 }}
                      whileHover={{ y: -4, rotate: -3 }}
                    >
                      <div className="pp-stamp__seal" style={{ color: style.color, background: `${style.color}14` }}>
                        <i className={`fas ${style.icon}`} />
                      </div>
                      <div className="pp-stamp__name">{a.title}</div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Assessment Results — the placement test scores Speaking, Writing,
              Listening, and Reading (stored as 0–100 in skillScores). */}
          {user?.assessmentResults?.skillScores && (
            <Section label="Your last placement" title="Assessment breakdown">
              <div className="pp-bars">
                {[
                  { label: 'Speaking',  key: 'speaking',  color: '#10b981' },
                  { label: 'Writing',   key: 'writing',   color: '#8b5cf6' },
                  { label: 'Listening', key: 'listening', color: '#f59e0b' },
                  { label: 'Reading',   key: 'reading',   color: '#3b82f6' },
                ].map(({ label, key, color }) => {
                  const raw = user.assessmentResults.skillScores[key]
                  // skillScores are 0–100; ScoreBar expects 0–10. null = skipped.
                  const value = raw == null ? null : raw / 10
                  return <ScoreBar key={key} label={label} value={value} color={color} />
                })}
              </div>
            </Section>
          )}

          {/* Account settings */}
          <Section label="Yours to control" title="Account settings">

            <div className="pp-group">
              <div className="pp-eyebrow pp-group__title">Notifications</div>
              <div className="pp-prefs">
                <PrefToggle
                  icon="fa-envelope" tint="#6366f1"
                  label="Email updates" desc="A weekly summary of your progress"
                  checked={settings.email} onChange={() => toggleSetting('email')}
                />
                <PrefToggle
                  icon="fa-clock" tint="#f59e0b"
                  label="Practice reminders" desc="A daily nudge when it's time to study"
                  checked={settings.reminders} onChange={() => toggleSetting('reminders')}
                />
              </div>
            </div>

            <div className="pp-group">
              <div className="pp-eyebrow pp-group__title">Appearance</div>
              <div className="pp-prefs">
                <PrefToggle
                  icon="fa-moon" tint="#8b5cf6"
                  label="Dark mode" desc="Easier on the eyes in low light"
                  checked={settings.dark} onChange={() => toggleSetting('dark')}
                />
              </div>
            </div>

            <div className="pp-group">
              <div className="pp-eyebrow pp-group__title">Security</div>
              <div className="pp-prefs">
                <button
                  type="button"
                  className="pp-pref"
                  onClick={() => { setShowPwFields(v => !v); setPwError(''); setPwSuccess(false) }}
                  aria-expanded={showPwFields}
                >
                  <span className="pp-pref__icon" style={{ background: '#64748b1a', color: '#64748b' }}>
                    <i className="fas fa-key" />
                  </span>
                  <span className="pp-pref__text">
                    <span className="pp-pref__label">Password</span>
                    <span className="pp-pref__desc">Update your account password</span>
                  </span>
                  <span className="pp-pref__action">
                    {showPwFields ? 'Close' : 'Change'}
                    <i className={`fas fa-chevron-${showPwFields ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {showPwFields && (
                    <motion.form
                      onSubmit={handleChangePassword}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0 1rem 1rem' }}
                    >
                      {pwError && (
                        <div style={{
                          padding: '0.7rem 1rem', borderRadius: '10px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                          <i className="fas fa-exclamation-circle" /> {pwError}
                        </div>
                      )}
                      {pwSuccess && (
                        <div style={{
                          padding: '0.7rem 1rem', borderRadius: '10px',
                          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                          color: '#065f46', fontSize: '0.85rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                          <i className="fas fa-check-circle" /> Password changed
                        </div>
                      )}
                      {['Current password', 'New password', 'Confirm new password'].map((placeholder, idx) => {
                        const val    = [pwCurrent, pwNew, pwConfirm][idx]
                        const setVal = [setPwCurrent, setPwNew, setPwConfirm][idx]
                        return (
                          <div key={placeholder} style={{ position: 'relative' }}>
                            <i className="fas fa-lock" style={{
                              position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                              color: 'var(--text-faint)', fontSize: '0.8rem',
                            }} />
                            <input
                              type="password" placeholder={placeholder} value={val}
                              onChange={(e) => { setVal(e.target.value); setPwError('') }}
                              disabled={pwLoading} className="pp-field-input"
                            />
                          </div>
                        )
                      })}
                      <motion.button
                        type="submit" disabled={pwLoading}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '0.75rem', borderRadius: '11px', border: 'none',
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          color: 'white', fontWeight: 700, fontSize: '0.9rem',
                          cursor: pwLoading ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                      >
                        {pwLoading
                          ? <><span className="auth-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
                          : <><i className="fas fa-key" /> Update password</>}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
