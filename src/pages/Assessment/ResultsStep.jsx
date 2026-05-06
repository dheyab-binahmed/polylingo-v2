import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAssessment } from './assessmentContext'
import { getAssessmentContent, codeToFullName } from '../../data/assessmentContent'

function ScoreBar({ label, value, max = 10, color }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 600 }}>
        <span style={{ color: 'var(--text-base)' }}>{label}</span>
        <span style={{ color: color }}>{value}/{max}</span>
      </div>
      <div style={{ height: '10px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '99px',
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

export default function ResultsStep() {
  const { data } = useAssessment()
  const navigate  = useNavigate()
  const { completeAssessment } = useAuth()

  // Get the language-specific content for recommendations
  const langContent    = getAssessmentContent(data.language)
  const languageFullName = codeToFullName(data.language)

  const ps  = data.pronunciationScore || 7
  const fs  = data.fluencyScore || 6
  const gs  = +((data.grammarScore  || 0) / (data.grammarTotal  || 5) * 10).toFixed(1)
  const rs  = +((data.readingScore  || 0) / (data.readingTotal  || 3) * 10).toFixed(1)
  const overall = Math.round((ps + fs + gs + rs) / 4)
  const level   = overall >= 9 ? 'Advanced' : overall >= 7 ? 'Intermediate' : overall >= 5 ? 'Upper Beginner' : 'Beginner'

  const CIRC  = 283
  const offset = CIRC - (overall / 10) * CIRC
  const scoreColor = overall >= 8 ? '#10b981' : overall >= 6 ? '#6366f1' : overall >= 4 ? '#f59e0b' : '#ef4444'

  const breakdown = [
    { label: 'Pronunciation',    value: ps, icon: 'fa-volume-up',  color: '#8b5cf6' },
    { label: 'Speaking Fluency', value: fs, icon: 'fa-comments',   color: '#10b981' },
    { label: 'Grammar',          value: gs, icon: 'fa-book',       color: '#f59e0b' },
    { label: 'Reading',          value: rs, icon: 'fa-book-reader', color: '#3b82f6' },
  ]

  // Language-specific recommendations from assessmentContent.js
  const recommendations = langContent.recommendations(data.language)

  const handleStart = () => {
    // Save assessment results AND update preferredLanguage to the language chosen in assessment
    completeAssessment({
      level,
      overall,
      pronunciationScore: ps,
      fluencyScore: fs,
      grammarScore: gs,
      readingScore: rs,
      preferredLanguage: languageFullName, // ← fixes issue #9: persists chosen language to user profile
    })
    navigate('/dashboard')
  }

  return (
    <div style={{
      maxWidth: '860px',
      margin: '0 auto',
      padding: '2rem 1.25rem 4rem',
      animation: 'fadeInUp 0.5s ease',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
          <i className="fas fa-trophy" /> Assessment Complete!
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--text-base)', marginBottom: '0.5rem' }}>
          Your {languageFullName} Fluency Results
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
          Based on your performance across all 4 assessment areas
        </p>
      </div>

      {/* Overall Score Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '24px',
        padding: 'clamp(1.5rem, 4vw, 3rem)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '2rem',
        alignItems: 'center',
      }} className="result-overall-card">
        {/* SVG Circle */}
        <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={scoreColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-base)', lineHeight: 1 }}>{overall}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>/ 10</span>
          </div>
        </div>

        {/* Score details */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: scoreColor + '18', color: scoreColor,
            padding: '0.3rem 0.9rem', borderRadius: '99px',
            fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem',
          }}>
            {level}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '0.5rem' }}>
            Overall Score: {overall}/10
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            {level === 'Advanced'
              ? 'Outstanding performance! You demonstrate near-native fluency.'
              : level === 'Intermediate'
              ? 'Great work! You can communicate confidently on most topics.'
              : level === 'Upper Beginner'
              ? 'Good foundation! With regular practice you\'ll progress quickly.'
              : 'You\'re just starting out — every expert was once a beginner!'}
          </p>

          {/* Mini bars */}
          <div style={{ marginTop: '1.25rem' }}>
            {breakdown.map(s => (
              <ScoreBar key={s.label} label={s.label} value={s.value} color={s.color} />
            ))}
          </div>
        </div>
      </div>

      {/* Score Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {breakdown.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            textAlign: 'center',
            border: `2px solid ${s.color}20`,
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: s.color + '18', color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.75rem', fontSize: '1.1rem',
            }}>
              <i className={`fas ${s.icon}`} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>/ 10</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Learning Plan */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '20px',
        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '1.25rem', textAlign: 'center' }}>
          <i className="fas fa-map-signs" style={{ color: '#6366f1', marginRight: '0.5rem' }} />
          Your Personalized Learning Plan
        </h2>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          {recommendations.map(r => (
            <div key={r.title} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.25rem',
              background: r.color + '08',
              border: `1px solid ${r.color}20`,
              borderRadius: '12px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: r.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', flexShrink: 0,
              }}>
                <i className={`fas ${r.icon}`} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-base)', fontSize: '0.95rem' }}>{r.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleStart}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            padding: '1rem 2.5rem',
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)' }}
          onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)' }}
        >
          <i className="fas fa-play-circle" /> Start Your Learning Journey
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          You'll be redirected to your personalized dashboard
        </p>
      </div>
    </div>
  )
}
