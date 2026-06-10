import { useState, useEffect, useRef } from 'react'
import { useAssessment } from './assessmentContext'
import { getAssessmentContent } from '../../data/assessmentContent'
import { apiFetch } from '../../services/api'
import { takePrefetched, prefetchStep, contentUrl, makeT } from './assessmentExtras'
import AnswerReview from './AnswerReview'

const MAX_PLAYS = 2 // how many times the learner may listen (like a real exam)

/** Join the dialogue lines into a single string for text-to-speech. */
function transcriptToText(transcript) {
  return (transcript || [])
    .map((t) => (t.speaker ? `${t.speaker}: ${t.line}` : t.line))
    .join('. ')
}

export default function ListeningStep() {
  const { data, update, goNext, goPrev } = useAssessment()
  const staticContent = getAssessmentContent(data.language)
  const t = makeT(data.language, data.level)

  // ── state ────────────────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState([])
  const [questions, setQuestions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // audio
  const [audioCache, setAudioCache] = useState({}) // { rate: dataUrl }
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [plays, setPlays] = useState(0)
  const [rate, setRate] = useState(1) // 0.75 | 1
  const audioRef = useRef(null)

  // quiz
  const [idx, setIdx] = useState(0)
  const [sel, setSel] = useState(null)
  const [answers, setAnswers] = useState({}) // { questionId: answerIndex }
  const [review, setReview] = useState(null)

  // ── fetch listening content on mount (consume prefetch; prefetch reading) ──
  useEffect(() => {
    let cancelled = false
    async function fetchContent() {
      setLoading(true)
      setError(null)
      try {
        const lang = data.language || 'en'
        const level = data.level || ''
        const pre = takePrefetched('listening', lang, level)
        const json = pre ? await pre : await apiFetch(contentUrl('listening', lang, level))
        if (cancelled) return
        if (json.questions && json.questions.length > 0) {
          setTranscript(json.transcript || [])
          setQuestions(json.questions)
          setSessionId(json.session_id || null)
          setInstructions(json.instructions || '')
          // Prefetch the next step (Reading) in the background.
          prefetchStep('reading', lang, level)
        } else {
          throw new Error('No questions returned')
        }
      } catch (err) {
        if (cancelled) return
        console.warn('[ListeningStep] fetch failed:', err)
        setError('Could not load the listening exercise. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchContent()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Edge TTS rate string for a playback multiplier (1 → +0%, 0.75 → -25%).
  function rateParam(mult) {
    const pct = Math.round((mult - 1) * 100)
    return `${pct >= 0 ? '+' : ''}${pct}%`
  }

  // ── play audio (lazily fetch TTS per speed the first time) ────────────────
  async function handlePlay() {
    if (plays >= MAX_PLAYS) return

    const cached = audioCache[rate]
    if (cached && audioRef.current) {
      if (audioUrl !== cached) setAudioUrl(cached)
      setTimeout(() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play() } }, 30)
      setPlays((p) => p + 1)
      return
    }

    setAudioLoading(true)
    setError(null)
    try {
      const text = transcriptToText(transcript)
      const json = await apiFetch('/assessment/tts', {
        method: 'POST',
        body: JSON.stringify({ text, lang: data.language || 'en', rate: rateParam(rate) }),
      })
      if (!json.audio) throw new Error('No audio returned')
      const url = `data:${json.content_type || 'audio/mpeg'};base64,${json.audio}`
      setAudioCache((c) => ({ ...c, [rate]: url }))
      setAudioUrl(url)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
          setPlays((p) => p + 1)
        }
      }, 50)
    } catch (err) {
      console.warn('[ListeningStep] TTS failed:', err)
      setError('Audio could not be generated. You can still answer from the transcript shown below.')
    } finally {
      setAudioLoading(false)
    }
  }

  // ── quiz handlers ─────────────────────────────────────────────────────────
  const q = questions[idx] || null
  const isLast = questions.length > 0 && idx === questions.length - 1

  function localDetails(newAnswers) {
    return questions.map((qq) => ({ question_id: qq.id, selected: newAnswers[qq.id], correct: qq.answer_index, is_correct: false }))
  }

  async function next() {
    if (sel === null || !q) return
    const newAnswers = { ...answers, [q.id]: sel }
    setAnswers(newAnswers)

    if (!isLast) {
      setIdx((i) => i + 1)
      setSel(null)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      if (!sessionId) {
        update({ listeningScore: null, listeningTotal: 0 })
        setReview({ details: localDetails(newAnswers) })
        return
      }
      const responses = Object.entries(newAnswers).map(([question_id, answer_index]) => ({ question_id, answer_index }))
      const json = await apiFetch(`/sessions/${sessionId}/score`, {
        method: 'PUT',
        body: JSON.stringify({ test_type: 'listening', responses }),
      })
      const result = json.result || json
      update({
        listeningScore: result.correct_count ?? result.score ?? 0,
        listeningTotal: result.total ?? questions.length,
      })
      setReview({ details: result.details || localDetails(newAnswers) })
    } catch (err) {
      console.error('[ListeningStep] scoring failed:', err)
      setError('Could not submit your answers. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    setIdx(0); setSel(null); setAnswers({})
    goPrev('listening')
  }

  function handleSkip() {
    update({ listeningScore: 0, listeningTotal: questions.length || 0 })
    goNext('listening')
  }

  // ── render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="test-container fade-in" style={{ margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#6366f1', marginBottom: '1rem', display: 'block' }} />
        <p style={{ color: 'var(--text-muted)' }}>Preparing your listening exercise…</p>
      </div>
    )
  }

  if (review) {
    return (
      <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
        <AnswerReview
          title="Review your Listening answers"
          questions={questions}
          details={review.details}
          onContinue={() => goNext('listening')}
          continueLabel={t('results')}
        />
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="test-container fade-in" style={{ margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
        <button className="btn btn-outline" onClick={handleBack} style={{ marginRight: '0.75rem' }}>
          <i className="fas fa-arrow-left" /> {t('back')}
        </button>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <i className="fas fa-redo" /> Retry
        </button>
      </div>
    )
  }

  if (!q) return null

  const playsLeft = MAX_PLAYS - plays
  const hasPlayed = plays > 0

  return (
    <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
      <div className="test-header">
        <h2>{t('listeningTitle')}</h2>
        <p>{instructions || t('listeningHint')}</p>
      </div>

      {error && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#92400e', fontSize: '0.9rem' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      {/* Audio player */}
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.07))', border: '1.5px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <i className="fas fa-headphones" style={{ fontSize: '1.6rem', color: '#6366f1' }} />
        </div>
        <button
          className="btn btn-primary"
          onClick={handlePlay}
          disabled={audioLoading || plays >= MAX_PLAYS}
          style={{ opacity: plays >= MAX_PLAYS ? 0.5 : 1, minWidth: 180 }}
        >
          {audioLoading
            ? <><i className="fas fa-spinner fa-spin" /> Loading audio…</>
            : plays >= MAX_PLAYS
              ? <><i className="fas fa-volume-mute" /> No plays left</>
              : hasPlayed
                ? <><i className="fas fa-redo" /> Replay ({playsLeft} left)</>
                : <><i className="fas fa-play" /> Play audio ({playsLeft} plays)</>}
        </button>

        {/* Playback speed control */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <i className="fas fa-gauge-high" style={{ marginRight: '0.35rem' }} /> Speed:
          </span>
          {[0.75, 1].map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              disabled={audioLoading}
              style={{
                border: `1.5px solid ${rate === r ? '#6366f1' : 'var(--border)'}`,
                background: rate === r ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: rate === r ? '#6366f1' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.8rem', borderRadius: 99, padding: '0.25rem 0.8rem',
                cursor: audioLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {r === 1 ? '1×' : `${r}×`}
            </button>
          ))}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.85rem' }}>
          You can listen up to {MAX_PLAYS} times. A slower speed helps at lower levels.
        </p>
        {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

        {error && transcript.length > 0 && (
          <div style={{ marginTop: '1rem', textAlign: 'left', background: 'var(--bg-card)', borderRadius: 10, padding: '1rem' }}>
            {transcript.map((tr, i) => (
              <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                <strong>{tr.speaker}:</strong> {tr.line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Question */}
      <div className="test-content">
        <div className="test-question">{q.question}</div>
        <div className="test-options">
          {(q.options || []).map((opt, i) => (
            <div
              key={i}
              className={`test-option${sel === i ? ' selected' : ''}`}
              onClick={() => !submitting && setSel(i)}
              style={{ cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              <div className="option-letter">{String.fromCharCode(65 + i)}</div>
              <div>{opt}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="test-navigation">
        <div className="test-progress-text">{t('question')} {idx + 1} / {questions.length}</div>
        <div>
          <button className="btn btn-outline" onClick={handleBack} disabled={submitting} style={{ marginRight: '0.75rem' }}>
            <i className="fas fa-arrow-left" /> {t('back')}
          </button>
          <button className="btn btn-outline" onClick={handleSkip} disabled={submitting} style={{ marginRight: '0.75rem', opacity: 0.7 }}>
            Skip
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
