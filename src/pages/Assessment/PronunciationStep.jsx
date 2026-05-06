import { useState, useRef, useEffect } from 'react'
import { useAssessment } from './assessmentContext'
import { getAssessmentContent } from '../../data/assessmentContent'
import { scorePronunciation } from '../../services/api'

export default function PronunciationStep() {
  const { data, update, goNext, goPrev } = useAssessment()

  // Load pronunciation sentences for the selected language
  const content   = getAssessmentContent(data.language)
  const SENTENCES = content.pronunciation

  const [recording,   setRecording]   = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [time,        setTime]        = useState(0)
  const [micError,    setMicError]    = useState('')
  const [audioBlob,   setAudioBlob]   = useState(null)
  const [amplitude,   setAmplitude]   = useState(Array(28).fill(4))
  const [score,       setScore]       = useState(null)

  const timerRef       = useRef(null)
  const mediaRecRef    = useRef(null)
  const streamRef      = useRef(null)
  const audioCtxRef    = useRef(null)
  const analyserRef    = useRef(null)
  const animFrameRef   = useRef(null)
  const chunksRef      = useRef([])

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  function animateBars() {
    if (!analyserRef.current) return
    const d = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(d)
    setAmplitude(Array.from({ length: 28 }, (_, i) => Math.max(4, Math.min(64, (d[Math.floor(i * d.length / 28)] / 255) * 64))))
    animFrameRef.current = requestAnimationFrame(animateBars)
  }

  async function startRecording() {
    setMicError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtxRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)
      animateBars()

      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecRef.current = recorder
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        // 👉 BACKEND: scorePronunciation() sends audio to /api/assessment/pronunciation
        // In mock mode it returns a simulated score; swap api.js mock for real call when ready
        const { score: recScore } = await scorePronunciation(blob, data.language)
        setScore(recScore)
        update({ pronunciationAudioUrl: url, pronunciationAudioBlob: blob, pronunciationScore: recScore })
      }
      recorder.start(100)
      setRecording(true)
      setHasRecorded(false)

      let s = 0
      timerRef.current = setInterval(() => { s++; setTime(s); if (s >= 30) stopRecording() }, 1000)
    } catch (err) {
      if (err.name === 'NotAllowedError')  setMicError('Microphone access denied. Please allow microphone access in your browser settings.')
      else if (err.name === 'NotFoundError') setMicError('No microphone found. Please connect a microphone and try again.')
      else setMicError(`Could not access microphone: ${err.message}`)
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    setAmplitude(Array(28).fill(4))
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    setRecording(false)
    setHasRecorded(true)
  }

  function handleContinue() {
    if (!hasRecorded) update({ pronunciationScore: 7 })
    goNext('pronunciation')
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
      <div className="test-header">
        <h2>Pronunciation Assessment</h2>
        <p>Read the {content.fullName} sentences below clearly into your microphone. We'll record and analyze your pronunciation.</p>
      </div>

      <div className="test-content">
        <div className="speaking-test">
          {/* Sentences to read — now in the correct language */}
          <div className="read-aloud-box" style={{ borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <i className="fas fa-quote-left" style={{ color: '#6366f1', fontSize: '0.9rem' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Read Aloud — {content.fullName}
              </span>
            </div>
            {SENTENCES.map((s, i) => (
              <p key={i} style={{ margin: '0 0 0.6rem', fontWeight: 500, fontSize: '1rem', color: 'var(--text-base)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem', fontSize: '0.8rem' }}>{i + 1}.</span>{s}
              </p>
            ))}
          </div>

          {micError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: '#dc2626', fontSize: '0.88rem' }}>{micError}</span>
            </div>
          )}

          <div style={{ background: recording ? '#1e1b4b' : 'var(--bg-subtle)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: `2px solid ${recording ? '#6366f1' : 'var(--border)'}`, transition: 'all .3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '72px' }}>
              {amplitude.map((h, i) => (
                <div key={i} style={{ width: '5px', height: `${h}px`, borderRadius: '3px', background: recording ? `hsl(${240 + i * 4}, 80%, 65%)` : hasRecorded ? '#6366f1' : '#d1d5db', transition: recording ? 'none' : 'height .4s ease' }} />
              ))}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: recording ? '#e0e7ff' : 'var(--text-base)', letterSpacing: '0.1em' }}>{fmt(time)}</div>
            <button onClick={() => recording ? stopRecording() : startRecording()}
              style={{ width: '64px', height: '64px', borderRadius: '50%', background: recording ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', cursor: 'pointer', color: 'white', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 8px rgba(239,68,68,.2)' : '0 4px 16px rgba(99,102,241,.4)', transition: 'box-shadow .3s' }}>
              <i className={`fas ${recording ? 'fa-stop' : 'fa-microphone'}`} />
            </button>
            <p style={{ color: recording ? '#a5b4fc' : 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
              {recording ? `Recording… ${30 - time}s remaining — click to stop` : hasRecorded ? 'Recording saved! You can re-record or continue.' : 'Click the microphone to start recording'}
            </p>
          </div>

          {hasRecorded && score && (
            <div style={{ marginTop: '1rem', background: 'var(--bg-subtle)', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                <i className="fas fa-check" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-base)', fontSize: '0.92rem' }}>Recording complete!</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Pronunciation score: <strong style={{ color: '#10b981' }}>{score}/10</strong> · You can re-record to improve</div>
              </div>
              {audioBlob && <audio controls src={URL.createObjectURL(audioBlob)} style={{ height: '36px', marginLeft: 'auto' }} />}
            </div>
          )}
        </div>
      </div>

      <div className="test-navigation">
        <button className="btn btn-outline" onClick={() => goPrev('pronunciation')}>
          <i className="fas fa-arrow-left" /> Back
        </button>
        <button className="btn btn-primary" onClick={handleContinue}>
          {hasRecorded ? 'Continue to Speaking Test' : 'Skip & Continue'} <i className="fas fa-arrow-right" />
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 4px rgba(239,68,68,.3)} 50%{box-shadow:0 0 0 12px rgba(239,68,68,.1)} }`}</style>
    </div>
  )
}
