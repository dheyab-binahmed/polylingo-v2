import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssessment } from './assessmentContext'

const LANGS = [
  {code:'en',name:'English',    flag:'🇺🇸',learners:'2.5M learners'},
  {code:'es',name:'Spanish',    flag:'🇪🇸',learners:'1.8M learners'},
  {code:'fr',name:'French',     flag:'🇫🇷',learners:'1.2M learners'},
  {code:'de',name:'German',     flag:'🇩🇪',learners:'850K learners'},
  {code:'it',name:'Italian',    flag:'🇮🇹',learners:'650K learners'},
  {code:'pt',name:'Portuguese', flag:'🇵🇹',learners:'500K learners'},
  {code:'ja',name:'Japanese',   flag:'🇯🇵',learners:'400K learners'},
  {code:'ko',name:'Korean',     flag:'🇰🇷',learners:'350K learners'},
  {code:'zh',name:'Chinese',    flag:'🇨🇳',learners:'300K learners'},
  {code:'ar',name:'Arabic',     flag:'🇸🇦',learners:'250K learners'},
  {code:'ru',name:'Russian',    flag:'🇷🇺',learners:'200K learners'},
  {code:'tr',name:'Turkish',    flag:'🇹🇷',learners:'150K learners'},
]

const LEVELS = [
  { code: 'A1', label: 'Beginner',          desc: 'Little or no experience',            color: '#10b981' },
  { code: 'A2', label: 'Elementary',         desc: 'Basic everyday expressions',         color: '#3b82f6' },
  { code: 'B1', label: 'Intermediate',       desc: 'Handle familiar situations',         color: '#6366f1' },
  { code: 'B2', label: 'Upper Intermediate', desc: 'Complex texts and conversations',    color: '#8b5cf6' },
  { code: 'C1', label: 'Advanced',           desc: 'Fluent, flexible language use',      color: '#f59e0b' },
  { code: 'C2', label: 'Mastery',            desc: 'Near-native proficiency',            color: '#ef4444' },
]

export default function LanguageStep() {
  const { data, reset, goNext } = useAssessment()
  const navigate = useNavigate()
  const [selLang,  setSelLang]  = useState(data.language || null)
  const [selLevel, setSelLevel] = useState(data.level    || null)
  const [showShortcut, setShowShortcut] = useState(false)

  function confirm() {
    if (!selLang)  { alert('Please select a language first!'); return }
    if (!selLevel) { alert('Please select your current level!'); return }
    // reset() wipes any scores from a previous attempt so they can't leak
    // into this run's results
    reset({ language: selLang, level: selLevel })
    goNext('language')
  }

  return (
    <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
      {/* ── Language section ──────────────────────────────────────────────── */}
      <div className="test-header">
        <h2>Choose Your Learning Language</h2>
        <p>Select the language you want to master. We'll create a personalised assessment at your level.</p>
      </div>
      <div className="language-grid">
        {LANGS.map(l => (
          <div
            key={l.code}
            className={`language-card${selLang === l.code ? ' selected' : ''}`}
            onClick={() => setSelLang(l.code)}
          >
            <div className="language-flag">{l.flag}</div>
            <div className="language-name">{l.name}</div>
            <div className="language-learners">{l.learners}</div>
          </div>
        ))}
      </div>

      {/* ── Level section ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: '2.5rem' }}>
        <div className="test-header" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.4rem' }}>What's your current level?</h2>
          <p>Your grammar and reading questions will be tailored to this level.</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.875rem',
        }}>
          {LEVELS.map(lv => {
            const isSelected = selLevel === lv.code
            return (
              <div
                key={lv.code}
                onClick={() => setSelLevel(lv.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '14px',
                  border: `2px solid ${isSelected ? lv.color : 'var(--border)'}`,
                  background: isSelected ? lv.color + '12' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  boxShadow: isSelected ? `0 4px 16px ${lv.color}30` : 'none',
                }}
              >
                {/* CEFR badge */}
                <div style={{
                  minWidth: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: isSelected ? lv.color : lv.color + '20',
                  color: isSelected ? '#fff' : lv.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  {lv.code}
                </div>

                <div>
                  <div style={{
                    fontWeight: 700,
                    color: isSelected ? lv.color : 'var(--text-base)',
                    fontSize: '0.95rem',
                  }}>
                    {lv.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {lv.desc}
                  </div>
                </div>

                {isSelected && (
                  <div style={{ marginLeft: 'auto', color: lv.color }}>
                    <i className="fas fa-check-circle" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          className="btn btn-primary"
          style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
          onClick={confirm}
          disabled={!selLang || !selLevel}
        >
          Start Assessment <i className="fas fa-arrow-right" />
        </button>
      </div>

      {/* ── Placement shortcut ───────────────────────────────────────── */}
      <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <button
          onClick={() => setShowShortcut((s) => !s)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            margin: '0 auto',
            padding: '0.5rem 1rem',
          }}
        >
          <i className={`fas fa-chevron-${showShortcut ? 'up' : 'down'}`} />
          I already know my level — skip straight to results
        </button>

        {showShortcut && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Select your CEFR level to skip the assessment and go directly to your dashboard.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.75rem',
              maxWidth: '700px',
              margin: '0 auto',
            }}>
              {LEVELS.map((lv) => (
                <button
                  key={lv.code}
                  disabled={!selLang}
                  onClick={() => {
                    if (!selLang) { alert('Please select a language first!'); return; }
                    reset({ language: selLang, level: lv.code });
                    navigate('/assessment/results');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: `2px solid ${lv.color}40`,
                    background: lv.color + '0a',
                    cursor: selLang ? 'pointer' : 'not-allowed',
                    opacity: selLang ? 1 : 0.5,
                    transition: 'border-color 0.15s, background 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseOver={(e) => {
                    if (selLang) {
                      e.currentTarget.style.borderColor = lv.color;
                      e.currentTarget.style.background = lv.color + '18';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = lv.color + '40';
                    e.currentTarget.style.background = lv.color + '0a';
                  }}
                >
                  <div style={{
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: lv.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}>
                    {lv.code}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-base)', fontSize: '0.88rem' }}>{lv.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lv.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {!selLang && (
              <p style={{ textAlign: 'center', color: '#f59e0b', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                <i className="fas fa-exclamation-triangle" /> Select a language above first
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
