import { useState, useEffect } from 'react'
import { useAssessment } from './assessmentContext'
import { getAssessmentContent } from '../../data/assessmentContent'
import { apiFetch } from '../../services/api'
import { takePrefetched, contentUrl, makeT } from './assessmentExtras'
import AnswerReview from './AnswerReview'

/** Convert static assessmentContent reading format → backend format */
function staticToBackend(staticQuestions) {
  return {
    passage: staticQuestions[0]?.text || '',
    questions: staticQuestions.map((q, i) => ({
      id:       `static-r${i}`,
      passage:  q.text,          // each question has its own passage in static data
      question: q.q,
      options:  q.opts,
      _answer:  q.c,             // kept locally for offline scoring
    })),
    session_id: null,
  }
}

export default function ReadingStep() {
  const { data, update, goNext, goPrev } = useAssessment()
  const staticContent = getAssessmentContent(data.language)
  const t = makeT(data.language, data.level)

  // ── state ────────────────────────────────────────────────────────────────
  const [passage,    setPassage]    = useState('')
  const [questions,  setQuestions]  = useState([])
  const [sessionId,  setSessionId]  = useState(null)
  const [isStatic,   setIsStatic]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  const [idx,     setIdx]     = useState(0)
  const [sel,     setSel]     = useState(null)
  const [answers, setAnswers] = useState({})  // { questionId: answerIndex }
  const [review,  setReview]  = useState(null) // { details } once scored

  // ── fetch from backend on mount (consume prefetch if available) ───────────
  useEffect(() => {
    let cancelled = false
    async function fetchContent() {
      setLoading(true)
      setError(null)
      try {
        const lang  = data.language || 'en'
        const level = data.level    || ''
        const pre = takePrefetched('reading', lang, level)
        const json = pre ? await pre : await apiFetch(contentUrl('reading', lang, level))
        if (cancelled) return
        if (json.questions && json.questions.length > 0) {
          setPassage(json.passage || json.questions[0]?.passage || '')
          setQuestions(json.questions)
          setSessionId(json.session_id || null)
          setIsStatic(false)
        } else {
          throw new Error('No questions returned')
        }
      } catch (err) {
        if (cancelled) return
        console.warn('[ReadingStep] Backend fetch failed, using static fallback:', err)
        const fb = staticToBackend(staticContent.reading)
        setPassage(fb.passage)
        setQuestions(fb.questions)
        setSessionId(null)
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
  const currentPassage = q?.passage || passage

  // Build review details locally (offline) from the hidden _answer field.
  function localDetails(newAnswers) {
    return questions.map((qq) => ({
      question_id: qq.id,
      selected: newAnswers[qq.id],
      correct: qq._answer,
      is_correct: newAnswers[qq.id] === qq._answer,
    }))
  }

  function handleSelect(i) { setSel(i) }

  async function next() {
    if (sel === null || !q) return
    const newAnswers = { ...answers, [q.id]: sel }
    setAnswers(newAnswers)

    if (!isLast) {
      setIdx(i => i + 1)
      setSel(null)
      return
    }

    // ── last question: submit and score, then show the review ─────────────
    setSubmitting(true)
    setError(null)
    try {
      if (isStatic || !sessionId) {
        let correct = 0
        questions.forEach(qq => { if (newAnswers[qq.id] === qq._answer) correct++ })
        update({ readingScore: correct, readingTotal: questions.length })
        setReview({ details: localDetails(newAnswers) })
        return
      }

      const responses = Object.entries(newAnswers).map(([question_id, answer_index]) => ({ question_id, answer_index }))
      const json = await apiFetch(`/sessions/${sessionId}/score`, {
        method: 'PUT',
        body:   JSON.stringify({ test_type: 'reading', responses }),
      })
      const result = json.result || json
      update({
        readingScore: result.correct_count ?? result.score ?? 0,
        readingTotal: result.total         ?? questions.length,
      })
      setReview({ details: result.details || localDetails(newAnswers) })
    } catch (err) {
      console.error('[ReadingStep] Scoring failed:', err)
      setError('Could not submit answers. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    setIdx(0); setSel(null); setAnswers({})
    goPrev('reading')
  }

  // ── render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="test-container fade-in" style={{ margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#6366f1', marginBottom: '1rem', display: 'block' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading reading passage…</p>
      </div>
    )
  }

  // ── review screen (after scoring) ─────────────────────────────────────────
  if (review) {
    return (
      <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
        <AnswerReview
          title="Review your Reading answers"
          questions={questions}
          details={review.details}
          onContinue={() => goNext('reading')}
          continueLabel={t('results')}
        />
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
      <div className="test-header">
        <h2>{t('readingTitle')}</h2>
        <p>
          {t('readingHint')}
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
        <div style={{ background: 'var(--light)', padding: '2rem', borderRadius: 'var(--border-radius)', marginBottom: '2rem', lineHeight: 1.8 }}>
          <p id="readingText">{currentPassage}</p>
        </div>
        <div className="test-question" id="readingQuestion">{q.question}</div>
        <div className="test-options" id="readingOptions">
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
        <div className="test-progress-text" id="readingProgress">
          {t('question')} {idx + 1} / {questions.length}
        </div>
        <div>
          <button className="btn btn-outline" onClick={handleBack} disabled={submitting} style={{ marginRight: '1rem' }}>
            <i className="fas fa-arrow-left" /> {t('back')}
          </button>
          <button className="btn btn-primary" onClick={next} disabled={sel === null || submitting}>
            {submitting
              ? <><i className="fas fa-spinner fa-spin" /> Scoring…</>
              : isLast
                ? <>{t('results')} <i className="fas fa-arrow-right" /></>
                : <>{t('next')} <i className="fas fa-arrow-right" /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
