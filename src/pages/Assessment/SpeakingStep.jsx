import { useState, useEffect, useRef } from 'react'
import { useAssessment } from './assessmentContext'
import { getSpeakingReply } from '../../services/api'

const TOPICS = [
  'your favorite travel memory',
  'why daily practice helps fluency',
  'a challenge you solved recently',
  'your favorite book and why',
  'how you plan to use language in future work',
]

export default function SpeakingStep() {
  const { data, update, goNext, goPrev } = useAssessment()

  // Map language code → display name and BCP-47 TTS tag
  const LANG_MAP = {
    en: { name: 'English',    tts: 'en-US' },
    fr: { name: 'French',     tts: 'fr-FR' },
    es: { name: 'Spanish',    tts: 'es-ES' },
    de: { name: 'German',     tts: 'de-DE' },
    it: { name: 'Italian',    tts: 'it-IT' },
    pt: { name: 'Portuguese', tts: 'pt-PT' },
    ja: { name: 'Japanese',   tts: 'ja-JP' },
    ko: { name: 'Korean',     tts: 'ko-KR' },
    zh: { name: 'Chinese',    tts: 'zh-CN' },
    ar: { name: 'Arabic',     tts: 'ar-SA' },
    ru: { name: 'Russian',    tts: 'ru-RU' },
    tr: { name: 'Turkish',    tts: 'tr-TR' },
  }
  const langInfo    = LANG_MAP[data.language] || { name: 'English', tts: 'en-US' }
  const languageName = langInfo.name
  const ttsLang      = langInfo.tts

  const [topic]       = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)])
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [recording,   setRecording]   = useState(false)
  const [aiSpeaking,  setAiSpeaking]  = useState(false)
  const [transcripts, setTranscripts] = useState([])
  const [score,       setScore]       = useState(null)
  const [sessionStarted, setSessionStarted] = useState(false) // gates TTS behind user gesture

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // useRef keeps the initial prompt stable so the useEffect below has a proper dependency
  const initialPromptRef = useRef(`Hi! Let's practice speaking in ${languageName}. Please talk about ${topic}.`)
  const initialPromptText = initialPromptRef.current

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show initial AI message on mount — initialPromptRef.current is stable (no re-renders)
  useEffect(() => {
    const prompt = initialPromptRef.current
    const timer = setTimeout(() => {
      setMessages([{ role: 'ai', text: prompt, id: Date.now() }])
    }, 400)
    return () => clearTimeout(timer)
  }, []) // Safe: initialPromptRef.current never changes after mount

  // Called when user clicks "Start Session" — counts as a user gesture so TTS is allowed
  const handleStartSession = () => {
    setSessionStarted(true)
    speakText(initialPromptText)
  }

  // TTS: AI speaks back to the user — waits for voices to load first, uses correct language
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const doSpeak = () => {
      const utterance  = new SpeechSynthesisUtterance(text)
      utterance.lang   = ttsLang
      utterance.rate   = 0.92
      utterance.pitch  = 1
      utterance.volume = 0.85
      const voices     = window.speechSynthesis.getVoices()
      const preferred  = voices.find(v => v.lang === ttsLang)
                      || voices.find(v => v.lang.startsWith(ttsLang.split('-')[0]))
                      || voices[0]
      if (preferred) utterance.voice = preferred
      utterance.onstart = () => setAiSpeaking(true)
      utterance.onend   = () => setAiSpeaking(false)
      utterance.onerror = () => setAiSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      // Voices already loaded — speak immediately, no listener needed
      doSpeak()
    } else {
      // Voices not ready — attach listener but use a flag so it only fires once
      let fired = false
      const handler = () => {
        if (fired) return
        fired = true
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        doSpeak()
      }
      window.speechSynthesis.addEventListener('voiceschanged', handler)
      // Safety fallback: if voiceschanged never fires within 2s, try anyway
      setTimeout(() => {
        if (!fired) { fired = true; window.speechSynthesis.removeEventListener('voiceschanged', handler); doSpeak() }
      }, 2000)
    }
  }

  // Handle user message — typed or spoken
  // 👉 BACKEND: getSpeakingReply() calls /api/assessment/speaking/reply
  // In mock mode it returns a random placeholder; swap for real call in api.js when ready
  const handleUserMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTranscripts(prev => [...prev, trimmed])
    setMessages(prev => [...prev, { role: 'user', text: trimmed, id: Date.now() }])
    setInput('')
    try {
      const { reply } = await getSpeakingReply({
        message: trimmed,
        history: messages,
        language: data.language,
      })
      setMessages(prev => [...prev, { role: 'ai', text: reply, id: Date.now() + 1 }])
      speakText(reply)
    } catch (_) {
      // Silently fail — don't block the conversation if the API is unreachable
    }
  }

  // Speech recognition — captures and stores the user's voice
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { inputRef.current?.focus(); return }
    const recognition           = new SpeechRecognition()
    recognition.lang            = ttsLang   // match the user's chosen language
    recognition.interimResults  = false
    recognition.maxAlternatives = 1
    recognition.onstart  = () => setRecording(true)
    recognition.onresult = (e) => handleUserMessage(e.results[0][0].transcript)
    recognition.onerror  = () => setRecording(false)
    recognition.onend    = () => setRecording(false)
    recognition.start()
  }

  // Grade and move to next step
  const handleContinue = () => {
    const userCount    = messages.filter(m => m.role === 'user').length
    if (userCount === 0) return
    const generatedScore = Math.min(10, Math.max(4, 5 + userCount))
    update({ fluencyScore: generatedScore, speakingTranscripts: transcripts })
    setScore(generatedScore)
    setTimeout(() => goNext('speaking'), 400)
  }

  const userCount   = messages.filter(m => m.role === 'user').length
  const canContinue = userCount > 0 && sessionStarted

  return (
    <>
      <style>{`
        .sp-root { max-width: 760px; margin: 2rem auto; font-family: 'Poppins', sans-serif; }
        .sp-header { text-align: center; margin-bottom: 1.75rem; }
        .sp-header h2 { font-size: clamp(1.4rem,3vw,1.9rem); font-weight: 800; color: var(--text-base); margin-bottom: 0.35rem; }
        .sp-header p  { color: var(--text-muted); font-size: 0.92rem; }
        .sp-topic {
          display: inline-flex; align-items: center; gap: 0.45rem;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
          color: #6366f1; padding: 0.4rem 1rem; border-radius: 99px;
          font-size: 0.8rem; font-weight: 700; margin-bottom: 1.5rem;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .sp-card {
          background: var(--bg-card); border: 1.5px solid var(--border);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.07);
        }
        .sp-card-header {
          background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
          padding: 1rem 1.5rem; display: flex; align-items: center;
          justify-content: space-between;
        }
        .sp-card-hl { display: flex; align-items: center; gap: 0.7rem; }
        .sp-ai-ava {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .sp-ai-name { font-weight: 700; color: #fff; font-size: 0.92rem; }
        .sp-ai-sub  { color: rgba(255,255,255,.72); font-size: 0.76rem; margin-top: 1px; }
        .sp-badge {
          display: flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,.15); border-radius: 99px;
          padding: 0.28rem 0.75rem; font-size: 0.73rem; font-weight: 600; color: #fff;
        }
        .sp-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; }
        .sp-dot.speak { background: #fbbf24; animation: sp-blink .7s infinite; }
        .sp-dot.listen { background: #ef4444; animation: sp-blink .5s infinite; }
        @keyframes sp-blink { 0%,100%{opacity:1} 50%{opacity:.3} }

        .sp-chat {
          min-height: 240px; max-height: 300px; overflow-y: auto;
          padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem;
        }
        .sp-chat::-webkit-scrollbar { width: 4px; }
        .sp-chat::-webkit-scrollbar-thumb { background: var(--border); border-radius:4px; }

        .sp-row { display: flex; gap: 0.55rem; align-items: flex-end; }
        .sp-row.user { flex-direction: row-reverse; }
        .sp-ava {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .sp-ava.ai   { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
        .sp-ava.user { background: linear-gradient(135deg,#10b981,#34d399); }
        .sp-body { max-width: 72%; }
        .sp-lbl { font-size: 0.68rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.22rem; padding: 0 0.2rem; }
        .sp-row.user .sp-lbl { text-align: right; }
        .sp-bubble {
          padding: 0.7rem 0.95rem; border-radius: 16px;
          font-size: 0.88rem; line-height: 1.55;
          animation: sp-pop .22s ease;
        }
        @keyframes sp-pop { from{opacity:0;transform:translateY(5px) scale(.97)} to{opacity:1;transform:none} }
        .sp-bubble.ai {
          background: var(--bg-subtle); color: var(--text-base);
          border-radius: 4px 16px 16px 16px; border: 1px solid var(--border);
        }
        .sp-bubble.user {
          background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          border-radius: 16px 4px 16px 16px;
        }
        .sp-typing { display:flex; gap:4px; align-items:center; padding: 0.45rem 0.3rem; }
        .sp-typing span {
          width:6px; height:6px; background: var(--text-muted);
          border-radius:50%; animation: sp-bounce 1.2s infinite;
        }
        .sp-typing span:nth-child(2){animation-delay:.2s}
        .sp-typing span:nth-child(3){animation-delay:.4s}
        @keyframes sp-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }

        .sp-divider { height:1px; background: var(--border); margin: 0 1.5rem; }
        .sp-controls { padding: 1.2rem 1.5rem; display: flex; flex-direction: column; gap: 0.9rem; }

        .sp-mic-row { display:flex; align-items:center; justify-content:center; gap:1.25rem; }
        .sp-mic-btn {
          width: 60px; height: 60px; border-radius: 50%; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; transition: all .2s; flex-shrink:0;
        }
        .sp-mic-btn.idle {
          background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          box-shadow: 0 6px 18px rgba(99,102,241,.4);
        }
        .sp-mic-btn.idle:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 10px 26px rgba(99,102,241,.5);
        }
        .sp-mic-btn.active {
          background: linear-gradient(135deg,#ef4444,#dc2626); color:#fff;
          box-shadow: 0 6px 18px rgba(239,68,68,.4);
          animation: sp-pulse 1.2s infinite;
        }
        .sp-mic-btn:disabled { opacity:.5; cursor:not-allowed; transform:none!important; }
        @keyframes sp-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.5), 0 6px 18px rgba(239,68,68,.4); }
          70%  { box-shadow: 0 0 0 13px rgba(239,68,68,0), 0 6px 18px rgba(239,68,68,.4); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0), 0 6px 18px rgba(239,68,68,.4); }
        }
        .sp-mic-lbl {
          font-size: 0.77rem; font-weight: 600; color: var(--text-muted);
          text-align: center; margin-top: 0.4rem;
        }
        .sp-mic-lbl.listen { color: #ef4444; }
        .sp-mic-lbl.speak  { color: #f59e0b; }

        .sp-input-row { display: flex; gap: 0.55rem; align-items: center; }
        .sp-input {
          flex:1; padding: 0.62rem 1rem; border: 1.5px solid var(--border);
          border-radius: 12px; background: var(--bg-input); color: var(--text-base);
          font-size: 0.88rem; font-family: inherit; outline: none; transition: border-color .2s;
        }
        .sp-input::placeholder { color: var(--text-faint); }
        .sp-input:focus { border-color:#6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
        .sp-input:disabled { opacity:.5; }
        .sp-send {
          padding: 0.62rem 1rem; background: #6366f1; color:#fff;
          border: none; border-radius: 12px; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: background .2s; flex-shrink:0;
        }
        .sp-send:hover:not(:disabled) { background: #4f46e5; }
        .sp-send:disabled { opacity:.45; cursor:not-allowed; }

        .sp-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.5rem; }
        .sp-count { font-size: 0.77rem; color: var(--text-muted); font-weight:500; display:flex; align-items:center; gap:.35rem; }

        .sp-nav { display:flex; align-items:center; justify-content:space-between; margin-top:1.4rem; gap:1rem; flex-wrap:wrap; }
        .sp-back {
          padding: 0.65rem 1.2rem; background: transparent; color: var(--text-muted);
          border: 1.5px solid var(--border); border-radius: 12px; font-size: 0.88rem;
          font-weight: 600; cursor: pointer; font-family: inherit; transition: all .2s;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .sp-back:hover { border-color:#6366f1; color:#6366f1; }
        .sp-continue {
          padding: 0.68rem 1.6rem;
          background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          border: none; border-radius: 12px; font-size: 0.92rem; font-weight: 700;
          cursor: pointer; font-family: inherit; display: flex; align-items: center;
          gap: 0.45rem; transition: all .2s;
          box-shadow: 0 4px 14px rgba(99,102,241,.3);
        }
        .sp-continue:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 8px 22px rgba(99,102,241,.45);
        }
        .sp-continue:disabled { opacity:.45; cursor:not-allowed; transform:none; }

        .sp-hint {
          display:flex; align-items:center; gap:.5rem;
          background: rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.2);
          border-radius: 10px; padding: 0.55rem 1rem;
          font-size: 0.78rem; color: #b45309; font-weight:500; margin-top: .9rem;
        }
        [data-dark="true"] .sp-hint { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.25); color:#fbbf24; }
      `}</style>

      <div className="sp-root test-container fade-in">

        {/* Header */}
        <div className="sp-header">
          <h2>
            <i className="fas fa-comments" style={{ color:'#6366f1', marginRight:'0.5rem' }} />
            Speaking Assessment
          </h2>
          <p>Speak naturally — the AI responds and your conversation is stored for evaluation.</p>
        </div>

        {/* Topic pill */}
        <div style={{ textAlign:'center' }}>
          <span className="sp-topic">
            <i className="fas fa-lightbulb" />
            Topic: {topic}
          </span>
        </div>

        {/* Conversation card */}
        <div className="sp-card">

          {/* Card header */}
          <div className="sp-card-header">
            <div className="sp-card-hl">
              <div className="sp-ai-ava">🤖</div>
              <div>
                <div className="sp-ai-name">AI Language Tutor</div>
                <div className="sp-ai-sub">{languageName} • Conversation Practice</div>
              </div>
            </div>
            <div className="sp-badge">
              <div className={`sp-dot${aiSpeaking ? ' speak' : recording ? ' listen' : ''}`} />
              {recording ? 'Listening…' : aiSpeaking ? 'Speaking…' : 'Ready'}
            </div>
          </div>

          {/* Messages */}
          <div className="sp-chat">
            {messages.map(msg => (
              <div key={msg.id} className={`sp-row ${msg.role}`}>
                <div className={`sp-ava ${msg.role}`}>{msg.role === 'ai' ? 'AI' : 'ME'}</div>
                <div className="sp-body">
                  <div className="sp-lbl">{msg.role === 'ai' ? 'AI Tutor' : 'You'}</div>
                  <div className={`sp-bubble ${msg.role}`}>{msg.text}</div>
                </div>
              </div>
            ))}
            {/* Typing dots while recording */}
            {recording && (
              <div className="sp-row ai">
                <div className="sp-ava ai">AI</div>
                <div className="sp-body">
                  <div className="sp-lbl">AI Tutor</div>
                  <div className="sp-bubble ai">
                    <div className="sp-typing"><span/><span/><span/></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="sp-divider" />

          {/* Input controls */}
          <div className="sp-controls">

            {/* ── Start Session button — shown before session begins ── */}
            {!sessionStarted && (
              <div style={{ textAlign: 'center', padding: '0.5rem 0 0.25rem' }}>
                <button
                  className="sp-continue"
                  style={{ margin: '0 auto' }}
                  onClick={handleStartSession}
                >
                  🎙️ Start Speaking Session
                </button>
                <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                  Click to start — the AI will speak first
                </div>
              </div>
            )}

            {/* ── Mic and input — only shown after session starts ── */}
            {sessionStarted && (
              <>
                {/* Mic */}
                <div className="sp-mic-row">
                  <div style={{ textAlign:'center' }}>
                    <button
                      className={`sp-mic-btn ${recording ? 'active' : 'idle'}`}
                      onClick={startSpeechRecognition}
                      disabled={recording || aiSpeaking}
                      title={recording ? 'Listening…' : 'Click to speak'}
                    >
                      <i className={`fas ${recording ? 'fa-stop' : 'fa-microphone'}`} />
                    </button>
                    <div className={`sp-mic-lbl${recording ? ' listen' : aiSpeaking ? ' speak' : ''}`}>
                      {recording ? 'Listening… speak now' : aiSpeaking ? 'AI is speaking…' : 'Tap mic to speak'}
                    </div>
                  </div>
                </div>

                {/* Type fallback */}
                <div className="sp-input-row">
                  <input
                    ref={inputRef}
                    className="sp-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Or type your reply here…"
                    onKeyDown={e => e.key === 'Enter' && handleUserMessage(input)}
                    disabled={recording || aiSpeaking}
                  />
                  <button
                    className="sp-send"
                    onClick={() => handleUserMessage(input)}
                    disabled={!input.trim() || recording || aiSpeaking}
                  >
                    <i className="fas fa-paper-plane" />
                  </button>
                </div>

                {/* Counter */}
                <div className="sp-footer">
                  <span className="sp-count">
                    <i className="fas fa-comment-dots" />
                    {userCount} {userCount === 1 ? 'response' : 'responses'} recorded
                  </span>
                  {userCount === 0 && (
                    <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                      At least 1 response needed
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Hint */}
        {userCount === 0 && (
          <div className="sp-hint">
            <i className="fas fa-info-circle" />
            Use the mic to speak, or type below. Your speech is captured and stored for the backend to evaluate.
          </div>
        )}

        {/* Navigation */}
        <div className="sp-nav">
          <button className="sp-back" onClick={() => goPrev('speaking')}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          <button className="sp-continue" onClick={handleContinue} disabled={!canContinue}>
            Continue <i className="fas fa-arrow-right" />
          </button>
        </div>

      </div>
    </>
  )
}
