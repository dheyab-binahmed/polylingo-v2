import { useState, useEffect } from 'react'
import { useAssessment } from './assessmentContext'
import { getAssessmentContent } from '../../data/assessmentContent'

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1'

function getToken() {
  return localStorage.getItem('polylingo_token') || ''
}

/** Convert static assessmentContent grammar format → backend format */
function staticToBackend(staticQuestions) {
  return staticQuestions.map((q, i) => ({
    id: `static-g${i}`,
    question: q.q,
    options: q.opts,
    _answer: q.c,           // keep locally so we can score without a server call
  }))
}

export default function GrammarStep() {
  const { data, update, goNext, goPrev } = useAssessment()
  const staticContent = getAssessmentContent(data.language)

  // ── state ────────────────────────────────────────────────────────────────
  const [questions,  setQuestions]  = useState([])
  const [sessionId,  setSessionId]  = useState(null)
  const [isStatic,   setIsStatic]   = useState(false)   // true = using fallback data
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  const [idx,      setIdx]      = useState(0)
  const [sel,      setSel]      = useState(null)
  const [answers,  setAnswers]  = useState({})   // { questionId: answerIndex }

  // ── fetch from backend on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function fetchContent() {
      setLoading(true)
      setError(null)
      try {
        const token = getToken()
        const lang  = data.language || 'en'
        const level = data.level    || ''
        const res   = await fetch(
          `${BASE_URL}/assessment/content?step_type=grammar&language=${lang}${level ? `&level=${level}` : ''}`,
          {
            headers: {
              'Content-Type':  'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (cancelled) return
        if (json.questions && json.questions.length > 0) {
          setQuestions(json.questions)
          setSessionId(json.session_id || null)
          setIsStatic(false)
        } else {
          throw new Error('No questions returned')
        }
      } catch (err) {
        if (cancelled) return
        console.warn('[GrammarStep] Backend fetch failed, using static fallback:', err)
        setQuestions(staticToBackend(staticContent.grammar))
        setIsStatic(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchContent()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── derived ──────────────────────────────────────────────────────────────
  const q      = questions[idx] || null
  const isLast = questions.length > 0 && idx === questions.length - 1

  // ── handlers ─────────────────────────────────────────────────────────────
  function handleSelect(i) {
    setSel(i)
  }

  async function next() {
    if (sel === null || !q) return

    const newAnswers = { ...answers, [q.id]: sel }
    setAnswers(newAnswers)

    if (!isLast) {
      setIdx(i => i + 1)
      setSel(null)
      return
    }

    // ── last question: submit and score ───────────────────────────────────
    setSubmitting(true)
    setError(null)
    try {
      if (isStatic) {
        // Score locally using the hidden _answer field
        let correct = 0
        questions.forEach(qq => {
          if (newAnswers[qq.id] === qq._answer) correct++
        })
        update({ grammarScore: correct, grammarTotal: questions.length })
        goNext('grammar')
        return
      }

      // Build responses array for backend
      const responses = Object.entries(newAnswers).map(([question_id, answer_index]) => ({
        question_id,
        answer_index,
      }))

      const token = getToken()
      const res   = await fetch(`${BASE_URL}/assessment/grammar/score`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, responses, level: data.level || '' }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`)

      // json = { score, correct_count, total, feedback, ... }
      update({
        grammarScore: json.correct_count ?? json.score ?? 0,
        grammarTotal: json.total         ?? questions.length,
      })
      goNext('grammar')
    } catch (err) {
      console.error('[GrammarStep] Scoring failed:', err)
      setError('Could not submit answers. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    setIdx(0); setSel(null); setAnswers({})
    goPrev('grammar')
  }

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="test-container fade-in" style={{ margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#6366f1', marginBottom: '1rem', display: 'block' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading grammar questions…</p>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
      <div className="test-header">
        <h2>Grammar Assessment</h2>
        <p>
          Complete the following questions to test your {staticContent.fullName} grammar knowledge.
          {isStatic && <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginLeft: '0.5rem' }}>(offline mode)</span>}
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.9rem' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      <div className="test-content">
        <div className="test-question" id="grammarQuestion">{q.question}</div>
        <div className="test-options" id="grammarOptions">
          {(q.options || []).map((opt, i) => (
            <div
              key={i}
              className={`test-option${sel === i ? ' selected' : ''}`}
              onClick={() => !submitting && handleSelect(i)}
              style={{ cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              <div className="option-letter">{String.fromCharCode(65 + i)}</div>
              <div>{opt}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="test-navigation">
        <div className="test-progress-text" id="grammarProgress">
          Question {idx + 1} of {questions.length}
        </div>
        <div>
          <button className="btn btn-outline" onClick={handleBack} disabled={submitting} style={{ marginRight: '1rem' }}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          <button className="btn btn-primary" onClick={next} disabled={sel === null || submitting}>
            {submitting
              ? <><i className="fas fa-spinner fa-spin" /> Scoring…</>
              : isLast
                ? <>See Results <i className="fas fa-arrow-right" /></>
                : <>Next Question <i className="fas fa-arrow-right" /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
