import { useState, useEffect, useRef, useCallback } from "react";
import { useAssessment } from "./assessmentContext";
import {
  getSpeakingReply,
  startSpeakingAssessment,
  completeSpeakingAssessment,
  generateSpeech,
  transcribeAudio,
  authorizedFetch,
} from "../../services/api";
import { prefetchStep } from "./assessmentExtras";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOPICS = [
  "your favorite travel memory",
  "why daily practice helps fluency",
  "a challenge you solved recently",
  "your favorite book and why",
  "how you plan to use language in future work",
];

const TUTOR_TTS_RATE         = "+25%";

export default function SpeakingStep() {
  const { data, update, goNext, goPrev } = useAssessment();

  const LANG_MAP = {
    en: { name: "English",    tts: "en-US" },
    fr: { name: "French",     tts: "fr-FR" },
    es: { name: "Spanish",    tts: "es-ES" },
    de: { name: "German",     tts: "de-DE" },
    it: { name: "Italian",    tts: "it-IT" },
    pt: { name: "Portuguese", tts: "pt-PT" },
    ja: { name: "Japanese",   tts: "ja-JP" },
    ko: { name: "Korean",     tts: "ko-KR" },
    zh: { name: "Chinese",    tts: "zh-CN" },
    ar: { name: "Arabic",     tts: "ar-SA" },
    ru: { name: "Russian",    tts: "ru-RU" },
    tr: { name: "Turkish",    tts: "tr-TR" },
  };
  const langInfo    = LANG_MAP[data.language] || { name: "English", tts: "en-US" };
  const languageName = langInfo.name;
  const ttsLang      = langInfo.tts;

  const [topic] = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState("");
  const [recording,       setRecording]       = useState(false);
  const [aiSpeaking,      setAiSpeaking]      = useState(false);
  const [streamingText,   setStreamingText]   = useState(""); // live token buffer
  const [transcripts,     setTranscripts]     = useState([]);
  const [score,           setScore]           = useState(null);
  const [sessionStarted,  setSessionStarted]  = useState(false);
  const [sessionId,       setSessionId]       = useState(null);
  const [completing,      setCompleting]      = useState(false);
  const [voiceMode,       setVoiceMode]       = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [vadActive,       setVadActive]       = useState(false); // VAD monitoring
  const [vadLevel,        setVadLevel]        = useState(0);     // live audio level
  const [vadError,        setVadError]        = useState("");

  const bottomRef         = useRef(null);
  const chatRef           = useRef(null);
  const audioRef          = useRef(null);
  const inputRef          = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const recordingStartRef = useRef(null);
  const audioChunksRef    = useRef([]);
  const voiceModeRef      = useRef(false);
  const completingRef     = useRef(false);
  const streamingRef      = useRef(false); // true while SSE stream is open
  // Silero VAD shares the active MediaRecorder stream.
  const vadRef            = useRef(null);
  const vadActiveRef      = useRef(false);

  useEffect(() => { voiceModeRef.current  = voiceMode;  }, [voiceMode]);
  useEffect(() => { completingRef.current = completing; }, [completing]);
  useEffect(() => { vadActiveRef.current  = vadActive;  }, [vadActive]);

  const initialPromptRef = useRef(
    `Hi! Let's practice speaking in ${languageName}. Please talk about ${topic}.`
  );

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, streamingText]);

  // Prefetch the next step (Writing) in the background so it loads instantly.
  useEffect(() => {
    prefetchStep("writing", data.language || "en", data.level || "");
  }, [data.language, data.level]);

  useEffect(() => {
    if (sessionStarted) return;
    const t = setTimeout(() =>
      setMessages([{ role: "ai", text: initialPromptRef.current, id: Date.now() }]),
      400
    );
    return () => clearTimeout(t);
  }, [sessionStarted]);

  // ── Audio playback ────────────────────────────────────────────────────────
  // Reject playback errors so the tutor can report/skip them without invoking
  // the browser's robotic speech synthesis.
  const playAudioBlob = (base64, contentType) =>
    new Promise((resolve, reject) => {
      const el = new Audio(`data:${contentType};base64,${base64}`);
      audioRef.current = el;
      el.onended = () => { audioRef.current = null; resolve(); };
      el.onerror = () => { audioRef.current = null; reject(new Error("audio error")); };
      el.play().catch((e) => { audioRef.current = null; reject(e); });
    });

  const speakText = useCallback(async (text, { autoRestart = false } = {}) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setAiSpeaking(true);
    const reply = (text || "").trim();
    if (reply) {
      try {
        const speech = await generateSpeech(reply, ttsLang, { rate: TUTOR_TTS_RATE });
        if (!speech?.audio) throw new Error("Neural TTS returned no audio");
        await playAudioBlob(speech.audio, speech.content_type);
      } catch (error) {
        console.warn("[Assessment TTS] ElevenLabs and Edge failed; browser voice is disabled.", error);
      }
    }
    setAiSpeaking(false);
    if (autoRestart && voiceModeRef.current && !completingRef.current)
      setTimeout(() => startRecording(), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsLang]);

  // ── Silero VAD: neural speech-end detection ───────────────────────────────
  const pauseVAD = useCallback(() => {
    try { vadRef.current?.pause(); } catch (_) {}
    setVadActive(false);
    vadActiveRef.current = false;
    setVadLevel(0);
  }, []);

  const destroyVAD = useCallback(() => {
    const vad = vadRef.current;
    vadRef.current = null;
    if (vad) {
      try { vad.pause(); } catch (_) {}
      try { vad.destroy(); } catch (_) {}
    }
    setVadActive(false);
    vadActiveRef.current = false;
    setVadLevel(0);
  }, []);

  const prepareVAD = useCallback(async (stream) => {
    try {
      destroyVAD();
      const { MicVAD } = await import("@ricky0123/vad-web");
      const vad = await MicVAD.new({
        stream,
        model: "legacy",
        baseAssetPath: "/",
        onnxWASMBasePath: "/",
        ortConfig: (ort) => {
          ort.env.wasm.numThreads = 1;
        },
        minSpeechFrames: 3,
        redemptionFrames: 5,
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.4,
        onFrameProcessed: ({ isSpeech }) => {
          if (vadActiveRef.current) {
            setVadLevel(Math.min(100, Math.round((isSpeech || 0) * 100)));
          }
        },
        onVADMisfire: () => {
          setVadLevel(0);
          console.log("[Assessment VAD] misfire");
        },
        onSpeechStart: () => {
          console.log("[Assessment VAD] speech start");
          setVadActive(true);
        },
        onSpeechEnd: () => {
          if (!voiceModeRef.current || completingRef.current) return;
          console.log("[Assessment VAD] speech end -> submitting");
          try { vadRef.current?.pause(); } catch (_) {}
          setVadActive(false);
          setVadLevel(0);
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        },
      });
      vadRef.current = vad;
      setVadError("");
      return vad;
    } catch (e) {
      console.warn("[Assessment VAD] Silero init failed:", e);
      destroyVAD();
      const detail = e?.message ? ` (${e.message})` : "";
      setVadError(`Auto voice loop could not start Silero VAD${detail}. Refresh the page and allow microphone access, then try again.`);
      return null;
    }
  }, [destroyVAD]);

  useEffect(() => () => destroyVAD(), [destroyVAD]);

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (recording || aiSpeaking || processingVoice || streamingRef.current) return;
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = (
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm")             ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4")              ? "audio/mp4" :
        ""
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current   = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        destroyVAD();
        mediaRecorderRef.current = null;
        setRecording(false);
        setProcessingVoice(true);

        const durationSeconds = recordingStartRef.current
          ? Math.round((Date.now() - recordingStartRef.current) / 1000)
          : null;
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/mp4" });

        try {
          const result = await transcribeAudio(blob, data.language || "en");
          const { transcript, speech_analytics } = result;
          if (transcript?.trim()) {
            await handleUserMessage(transcript.trim(), "voice", durationSeconds, speech_analytics);
          } else if (voiceModeRef.current && !completingRef.current) {
            setProcessingVoice(false);
            setTimeout(() => startRecording(), 400);
            return;
          }
        } catch {
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SR) {
            const r = new SR();
            r.lang = ttsLang;
            r.interimResults = false;
            r.onresult = (e) => handleUserMessage(e.results[0][0].transcript, "voice");
            r.onerror = r.onend = () => setProcessingVoice(false);
            r.start();
            return;
          }
        }
        setProcessingVoice(false);
      };

      const vad = voiceModeRef.current ? await prepareVAD(stream) : null;
      if (voiceModeRef.current && !vad) {
        voiceModeRef.current = false;
        setVoiceMode(false);
      }

      recordingStartRef.current = Date.now();
      recorder.start();
      setRecording(true);

      if (vad) {
        vadActiveRef.current = true;
        setVadActive(true);
        vad.start();
        console.log("[Assessment VAD] Silero VAD active");
      }

    } catch (err) {
      console.error("Mic access denied:", err);
      destroyVAD();
      inputRef.current?.focus();
    }
  };

  const stopRecording = () => {
    pauseVAD();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (recording)                           { stopRecording(); return; }
    if (aiSpeaking || processingVoice || streamingRef.current) return;
    startRecording();
  };

  const handleVoiceModeToggle = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    if (next && !recording && !aiSpeaking && sessionStarted)
      setTimeout(() => startRecording(), 300);
    if (!next && recording) stopRecording();
  };

  useEffect(() => {
    if (!recording) return;
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start session ─────────────────────────────────────────────────────────
  const handleStartSession = async () => {
    setSessionStarted(true);
    try {
      const session = await startSpeakingAssessment({
        level: data.level || "B1",
        language: data.language || "en",
        mode: "voice",
      });
      const sid   = session.session_id || session.id || null;
      const intro = session.initial_message || initialPromptRef.current;
      setSessionId(sid);
      setMessages([{ role: "ai", text: intro, id: Date.now() }]);
      await speakText(intro, { autoRestart: voiceMode });
    } catch {
      setSessionId(null);
      setMessages([{ role: "ai", text: initialPromptRef.current, id: Date.now() }]);
      await speakText(initialPromptRef.current, { autoRestart: voiceMode });
    }
  };

  // ── Handle user message — streaming ──────────────────────────────────────
  const handleUserMessage = async (text, mode = "text", durationSeconds = null, speechAnalytics = null) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsgId = Date.now();
    setTranscripts((prev) => [...prev, { text: trimmed, duration: durationSeconds }]);
    setMessages((prev) => [...prev, { role: "user", text: trimmed, id: userMsgId, mode }]);
    setInput("");
    setStreamingText("");

    // ── Streaming path (sessionId available) ──────────────────────────────
    if (sessionId) {
      streamingRef.current = true;
      let accumulatedText = "";
      let finalReplyText = "";
      let turnScores      = null;

      try {
        // authorizedFetch attaches the token and auto-refreshes on 401
        const resp = await authorizedFetch(
          `${BASE_URL}/api/v1/assessment/speaking/${sessionId}/message/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text:             trimmed,
              mode,
              duration_seconds: durationSeconds,
              speech_analytics: speechAnalytics,
            }),
          }
        );

        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

        const reader  = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        setAiSpeaking(true);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop(); // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            // Parse in its own try/catch so a malformed chunk is skipped
            // WITHOUT swallowing real server error events below.
            let event;
            try {
              event = JSON.parse(raw);
            } catch (_) {
              continue; // ignore malformed SSE chunk
            }

            {

              if (event.token !== undefined) {
                accumulatedText += event.token;
                setStreamingText(accumulatedText);
              }

              // Practice tutor speaks the final reply as one clip. Ignore
              // sentence/audio markers here so assessment does not pause at
              // every full stop.

              if (event.scores) {
                turnScores = event.scores;
                // Show score indicator on user message
                const avg = Object.values(event.scores)
                  .filter((v) => typeof v === "number")
                  .reduce((a, b) => a + b, 0) /
                  Math.max(1, Object.values(event.scores).filter((v) => typeof v === "number").length);
                const indicator = avg >= 75 ? "🟢" : avg >= 50 ? "🟡" : "🔴";
                const tip = avg >= 75 ? "Good response" : avg >= 50 ? "Keep practising" : "Needs improvement";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === userMsgId
                      ? { ...m, scoreIndicator: indicator, scoreTip: tip, scoreAvg: Math.round(avg) }
                      : m
                  )
                );
                if (turnScores) update({ speakingTurnScores: turnScores });
              }

              if (event.done) {
                // Commit the streamed message as a real bubble
                const finalText = accumulatedText.trim();
                finalReplyText = finalText;
                setStreamingText("");
                if (finalText) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "ai", text: finalText, id: Date.now() + 1 },
                  ]);
                }
                break;
              }

              if (event.error) {
                // Server-sent error — propagate to the outer catch (shows the
                // retry message) instead of being silently ignored.
                throw new Error(event.error);
              }
            }
          }
        }

        if (finalReplyText) await speakText(finalReplyText);

      } catch (err) {
        console.error("[SpeakingStep] stream error:", err);
        const fallback = "Sorry, I had trouble responding. Please try again.";
        setStreamingText("");
        setMessages((prev) => [...prev, { role: "ai", text: fallback, id: Date.now() + 1 }]);
      } finally {
        streamingRef.current = false;
        setAiSpeaking(false);
        setStreamingText("");
        if (voiceModeRef.current && !completingRef.current)
          setTimeout(() => startRecording(), 600);
      }
      return;
    }

    // ── Fallback: no sessionId — use simple reply endpoint ────────────────
    try {
      const res   = await getSpeakingReply({ message: trimmed, history: messages, language: data.language });
      const reply = res.reply || "";
      if (reply) {
        setMessages((prev) => [...prev, { role: "ai", text: reply, id: Date.now() + 1 }]);
        await speakText(reply, { autoRestart: true });
      }
    } catch (err) {
      console.error("Speaking fallback error:", err);
      setMessages((prev) => [...prev, {
        role: "ai",
        text: "Sorry, I couldn't respond just now. Please try again.",
        id: Date.now() + 1,
      }]);
    }
  };

  // ── Grade & continue ──────────────────────────────────────────────────────
  const handleContinue = async () => {
    const userCount = messages.filter((m) => m.role === "user").length;
    if (userCount === 0) return;
    setCompleting(true);
    if (recording) stopRecording();

    try {
      if (sessionId) {
        const completion    = await completeSpeakingAssessment(sessionId);
        const result        = completion.results || completion;
        const raw           = result?.scores?.fluency ?? result?.scores?.overall_score ?? result?.overall_score ?? 0;
        const speakingScore = Math.max(0, Math.min(10, Math.round(Number(raw) / 10)));
        update({ speakingSessionId: sessionId, speakingResult: completion, speakingScore, fluencyScore: speakingScore, speakingTranscripts: transcripts });
        setScore(speakingScore);
      } else {
        // No backend session — we can't grade fairly. Exclude speaking from
        // the aggregate (null) instead of fabricating a turn-count score.
        update({ speakingScore: null, fluencyScore: null, speakingTranscripts: transcripts });
        setScore(null);
      }
    } catch {
      // Completion failed — exclude speaking rather than fabricate a score.
      update({ speakingScore: null, fluencyScore: null, speakingTranscripts: transcripts });
      setScore(null);
    }

    setTimeout(() => goNext("speaking"), 400);
  };

  const userCount   = messages.filter((m) => m.role === "user").length;
  const MIN_TURNS   = 3;
  const canContinue = userCount >= MIN_TURNS && sessionStarted;
  const isStreaming = streamingRef.current;

  const statusLabel = processingVoice
    ? "Transcribing…"
    : recording
    ? "Listening…"
    : isStreaming
    ? "AI thinking…"
    : aiSpeaking
    ? "AI speaking…"
    : voiceMode
    ? "Voice mode on"
    : "Ready";

  // VAD level bar width (0-100)
  const vadBarWidth = recording && vadActive ? `${vadLevel}%` : "0%";

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
        .sp-card { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.07); }
        .sp-card-header { background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
        .sp-card-hl { display: flex; align-items: center; gap: 0.7rem; }
        .sp-ai-ava  { width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0; }
        .sp-ai-name { font-weight:700;color:#fff;font-size:0.92rem; }
        .sp-ai-sub  { color:rgba(255,255,255,.72);font-size:0.76rem;margin-top:1px; }
        .sp-badge   { display:flex;align-items:center;gap:0.4rem;background:rgba(255,255,255,.15);border-radius:99px;padding:0.28rem 0.75rem;font-size:0.73rem;font-weight:600;color:#fff; }
        .sp-dot     { width:7px;height:7px;border-radius:50%;background:#4ade80; }
        .sp-dot.speak   { background:#fbbf24;animation:sp-blink .7s infinite; }
        .sp-dot.listen  { background:#ef4444;animation:sp-blink .5s infinite; }
        .sp-dot.process { background:#a78bfa;animation:sp-blink .4s infinite; }
        .sp-dot.stream  { background:#06b6d4;animation:sp-blink .6s infinite; }
        @keyframes sp-blink { 0%,100%{opacity:1}50%{opacity:.3} }

        .sp-chat { min-height:240px;max-height:340px;overflow-y:auto;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem; }
        .sp-chat::-webkit-scrollbar{width:4px}
        .sp-chat::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
        .sp-row { display:flex;gap:0.55rem;align-items:flex-end; }
        .sp-row.user { flex-direction:row-reverse; }
        .sp-ava { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff;flex-shrink:0; }
        .sp-ava.ai   { background:linear-gradient(135deg,#6366f1,#8b5cf6); }
        .sp-ava.user { background:linear-gradient(135deg,#10b981,#34d399); }
        .sp-body { max-width:72%; }
        .sp-lbl { font-size:0.68rem;font-weight:700;color:var(--text-muted);margin-bottom:0.22rem;padding:0 0.2rem; }
        .sp-row.user .sp-lbl { text-align:right; }
        .sp-bubble { padding:0.7rem 0.95rem;border-radius:16px;font-size:0.88rem;line-height:1.55;animation:sp-pop .22s ease; }
        @keyframes sp-pop { from{opacity:0;transform:translateY(5px) scale(.97)}to{opacity:1;transform:none} }
        .sp-bubble.ai   { background:var(--bg-subtle);color:var(--text-base);border-radius:4px 16px 16px 16px;border:1px solid var(--border); }
        .sp-bubble.user { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:16px 4px 16px 16px; }
        .sp-bubble.streaming { opacity:0.85; }
        .sp-cursor { display:inline-block;width:2px;height:1em;background:#6366f1;margin-left:2px;animation:sp-blink .6s infinite;vertical-align:text-bottom; }
        .sp-typing { display:flex;gap:4px;align-items:center;padding:0.45rem 0.3rem; }
        .sp-typing span { width:6px;height:6px;background:var(--text-muted);border-radius:50%;animation:sp-bounce 1.2s infinite; }
        .sp-typing span:nth-child(2){animation-delay:.2s}
        .sp-typing span:nth-child(3){animation-delay:.4s}
        @keyframes sp-bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}

        .sp-divider { height:1px;background:var(--border);margin:0 1.5rem; }
        .sp-controls { padding:1.2rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem; }

        .sp-voice-bar { display:flex;align-items:center;justify-content:space-between;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:0.55rem 1rem;gap:0.75rem; }
        .sp-voice-bar-label { font-size:0.8rem;font-weight:600;color:var(--text-base);display:flex;align-items:center;gap:0.4rem; }
        .sp-vad-error { width:100%;padding:0.55rem 0.75rem;border:1px solid rgba(239,68,68,.25);border-radius:10px;background:rgba(239,68,68,.08);color:#dc2626;font-size:0.75rem;line-height:1.35;text-align:center;overflow-wrap:anywhere; }
        .sp-toggle { position:relative;width:42px;height:22px;background:#cbd5e1;border-radius:99px;border:none;cursor:pointer;transition:background .25s;flex-shrink:0; }
        .sp-toggle.on { background:#6366f1; }
        .sp-toggle::after { content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.2); }
        .sp-toggle.on::after { transform:translateX(20px); }

        /* VAD level bar */
        .sp-vad-bar { height:4px;background:var(--border);border-radius:99px;overflow:hidden;margin-top:0.25rem; }
        .sp-vad-fill { height:100%;border-radius:99px;background:linear-gradient(90deg,#10b981,#34d399);transition:width 0.05s linear; }

        .sp-mic-row { width:100%;display:flex;align-items:center;justify-content:center;gap:1.25rem; }
        .sp-mic-control { width:min(100%,260px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;margin:0 auto; }
        .sp-mic-btn { width:64px;height:64px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.3rem;transition:all .2s;flex-shrink:0; }
        .sp-mic-btn.idle { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 6px 18px rgba(99,102,241,.4); }
        .sp-mic-btn.idle:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 10px 26px rgba(99,102,241,.5); }
        .sp-mic-btn.active { background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 6px 18px rgba(239,68,68,.4);animation:sp-pulse 1.2s infinite; }
        .sp-mic-btn.processing { background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;box-shadow:0 6px 18px rgba(167,139,250,.4); }
        .sp-mic-btn:disabled { opacity:.45;cursor:not-allowed;transform:none!important; }
        @keyframes sp-pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.5),0 6px 18px rgba(239,68,68,.4)}70%{box-shadow:0 0 0 14px rgba(239,68,68,0),0 6px 18px rgba(239,68,68,.4)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0),0 6px 18px rgba(239,68,68,.4)} }
        .sp-mic-lbl { width:100%;max-width:240px;font-size:0.77rem;font-weight:600;color:var(--text-muted);text-align:center;line-height:1.25;margin:0.45rem auto 0;overflow-wrap:break-word; }
        .sp-mic-lbl.listen  { color:#ef4444; }
        .sp-mic-lbl.speak   { color:#f59e0b; }
        .sp-mic-lbl.process { color:#7c3aed; }
        .sp-mic-lbl.stream  { color:#06b6d4; }

        .sp-input-row { display:flex;gap:0.55rem;align-items:center; }
        .sp-input { flex:1;padding:0.62rem 1rem;border:1.5px solid var(--border);border-radius:12px;background:var(--bg-input);color:var(--text-base);font-size:0.88rem;font-family:inherit;outline:none;transition:border-color .2s; }
        .sp-input:focus { border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .sp-input:disabled { opacity:.5; }
        .sp-send { padding:0.62rem 1rem;background:#6366f1;color:#fff;border:none;border-radius:12px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s;flex-shrink:0; }
        .sp-send:hover:not(:disabled) { background:#4f46e5; }
        .sp-send:disabled { opacity:.45;cursor:not-allowed; }

        .sp-footer { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem; }
        .sp-count  { font-size:0.77rem;color:var(--text-muted);font-weight:500;display:flex;align-items:center;gap:.35rem; }
        .sp-nav { display:flex;align-items:center;justify-content:space-between;margin-top:1.4rem;gap:1rem;flex-wrap:wrap; }
        .sp-back { padding:0.65rem 1.2rem;background:transparent;color:var(--text-muted);border:1.5px solid var(--border);border-radius:12px;font-size:0.88rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;display:flex;align-items:center;gap:0.4rem; }
        .sp-back:hover { border-color:#6366f1;color:#6366f1; }
        .sp-continue { padding:0.68rem 1.6rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:0.92rem;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:0.45rem;transition:all .2s;box-shadow:0 4px 14px rgba(99,102,241,.3); }
        .sp-continue:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 8px 22px rgba(99,102,241,.45); }
        .sp-continue:disabled { opacity:.45;cursor:not-allowed;transform:none; }
        .sp-spinner { display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:sp-spin .7s linear infinite;vertical-align:middle;margin-left:6px; }
        @keyframes sp-spin { to{transform:rotate(360deg)} }
        .sp-hint { display:flex;align-items:center;gap:.5rem;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:0.55rem 1rem;font-size:0.78rem;color:#b45309;font-weight:500;margin-top:.9rem; }
        [data-dark="true"] .sp-hint { background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.25);color:#fbbf24; }
        .sp-vad-hint { width:100%;max-width:240px;font-size:0.72rem;color:var(--text-muted);text-align:center;line-height:1.25;margin:0.25rem auto 0;overflow-wrap:break-word; }
      `}</style>

      <div className="sp-root test-container fade-in">
        {/* Header */}
        <div className="sp-header">
          <h2><i className="fas fa-comments" style={{ color:"#6366f1",marginRight:"0.5rem" }} />Speaking Assessment</h2>
          <p>Speak naturally — the AI responds in real time with smoother voice playback.</p>
        </div>

        <div style={{ textAlign:"center" }}>
          <span className="sp-topic"><i className="fas fa-lightbulb" />Topic: {topic}</span>
        </div>

        {/* Conversation card */}
        <div className="sp-card">
          <div className="sp-card-header">
            <div className="sp-card-hl">
              <div className="sp-ai-ava">🤖</div>
              <div>
                <div className="sp-ai-name">AI Language Tutor</div>
                <div className="sp-ai-sub">{languageName} • Real-time Voice</div>
              </div>
            </div>
            <div className="sp-badge">
              <div className={`sp-dot${aiSpeaking ? " speak" : recording ? " listen" : processingVoice || isStreaming ? " process" : ""}`} />
              {statusLabel}
            </div>
          </div>

          {/* Messages */}
          <div className="sp-chat" ref={chatRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`sp-row ${msg.role}`}>
                <div className={`sp-ava ${msg.role}`}>{msg.role === "ai" ? "AI" : "ME"}</div>
                <div className="sp-body">
                  <div className="sp-lbl">{msg.role === "ai" ? "AI Tutor" : "You"}</div>
                  <div className={`sp-bubble ${msg.role}`}>
                    {msg.text}
                    {msg.scoreIndicator && (
                      <span title={`${msg.scoreTip} (${msg.scoreAvg}/100)`}
                        style={{ marginLeft:"0.5rem", fontSize:"0.8rem", opacity:0.85, cursor:"help" }}>
                        {msg.scoreIndicator}
                      </span>
                    )}
                  </div>
                  {msg.role === "user" && msg.mode === "voice" && (
                    <div className="sp-lbl" style={{ marginTop:"0.25rem", opacity:0.7, fontStyle:"italic" }}
                      title="This is what we heard from your voice. If a word looks wrong, the transcription misheard it.">
                      <i className="fas fa-microphone" style={{ marginRight:"0.3rem" }} />
                      transcribed from your voice
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live streaming bubble */}
            {streamingText && (
              <div className="sp-row ai">
                <div className="sp-ava ai">AI</div>
                <div className="sp-body">
                  <div className="sp-lbl">AI Tutor</div>
                  <div className="sp-bubble ai streaming">
                    {streamingText}<span className="sp-cursor" />
                  </div>
                </div>
              </div>
            )}

            {/* Thinking dots while processing (before first token arrives) */}
            {(processingVoice || (isStreaming && !streamingText)) && (
              <div className="sp-row ai">
                <div className="sp-ava ai">AI</div>
                <div className="sp-body">
                  <div className="sp-lbl">AI Tutor</div>
                  <div className="sp-bubble ai">
                    <div className="sp-typing"><span /><span /><span /></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="sp-divider" />

          {/* Controls */}
          <div className="sp-controls">
            {!sessionStarted && (
              <div style={{ textAlign:"center", padding:"0.5rem 0 0.25rem" }}>
                <button className="sp-continue" style={{ margin:"0 auto" }} onClick={handleStartSession}>
                  🎙️ Start Speaking Session
                </button>
                <div style={{ fontSize:"0.77rem", color:"var(--text-muted)", marginTop:"0.6rem" }}>
                  Click to start — the AI will speak first
                </div>
              </div>
            )}

            {sessionStarted && (
              <>
                {/* Voice mode toggle */}
                <div className="sp-voice-bar">
                  <span className="sp-voice-bar-label">
                    <i className="fas fa-infinity" style={{ color:"#6366f1" }} />
                    Auto voice loop
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", fontWeight:400 }}>
                      — mic restarts automatically after AI speaks
                    </span>
                  </span>
                  <button
                    className={`sp-toggle ${voiceMode ? "on" : ""}`}
                    onClick={handleVoiceModeToggle}
                    title={voiceMode ? "Turn off auto-loop" : "Turn on auto-loop"}
                  />
                </div>
                {vadError && (
                  <div className="sp-vad-error" role="alert">
                    <i className="fas fa-circle-exclamation" style={{ marginRight:"0.35rem" }} />
                    {vadError}
                  </div>
                )}

                {/* Mic button */}
                <div className="sp-mic-row">
                  <div className="sp-mic-control">
                    <button
                      className={`sp-mic-btn ${processingVoice ? "processing" : recording ? "active" : "idle"}`}
                      onClick={handleMicClick}
                      disabled={aiSpeaking || processingVoice || isStreaming}
                      title={recording ? "Tap to stop" : "Tap to speak"}
                    >
                      <i className={`fas ${processingVoice ? "fa-spinner fa-spin" : recording ? "fa-stop" : "fa-microphone"}`} />
                    </button>
                    {/* VAD level bar */}
                    {recording && (
                      <div className="sp-vad-bar" style={{ width:64, margin:"0.4rem auto 0" }}>
                        <div className="sp-vad-fill" style={{ width: vadBarWidth }} />
                      </div>
                    )}
                    <div className={`sp-mic-lbl${processingVoice ? " process" : recording ? " listen" : aiSpeaking || isStreaming ? " speak" : ""}`}>
                      {processingVoice
                        ? "Transcribing…"
                        : recording
                        ? vadActive ? "Silero is listening…" : "Listening… tap or press Enter to send"
                        : aiSpeaking
                        ? "AI is speaking…"
                        : isStreaming
                        ? "AI is thinking…"
                        : "Tap mic to speak"}
                    </div>
                    {recording && vadActive && (
                      <div className="sp-vad-hint">Stops automatically when Silero detects the end of your speech</div>
                    )}
                  </div>
                </div>

                {/* Text fallback */}
                <div className="sp-input-row">
                  <input
                    ref={inputRef}
                    className="sp-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Or type your reply here…"
                    onKeyDown={(e) => e.key === "Enter" && input.trim() && handleUserMessage(input, "text")}
                    disabled={recording || aiSpeaking || processingVoice || isStreaming}
                  />
                  <button
                    className="sp-send"
                    onClick={() => handleUserMessage(input, "text")}
                    disabled={!input.trim() || recording || aiSpeaking || processingVoice || isStreaming}
                  >
                    <i className="fas fa-paper-plane" />
                  </button>
                </div>

                {/* Counter */}
                <div className="sp-footer">
                  <span className="sp-count">
                    <i className="fas fa-comment-dots" />
                    {userCount} {userCount === 1 ? "response" : "responses"} recorded
                  </span>
                  {userCount < MIN_TURNS && (
                    <span style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>
                      {userCount === 0
                        ? `At least ${MIN_TURNS} responses needed`
                        : `${MIN_TURNS - userCount} more response${MIN_TURNS - userCount > 1 ? "s" : ""} needed`}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Hint */}
        {userCount < MIN_TURNS && sessionStarted && (
          <div className="sp-hint">
            <i className="fas fa-info-circle" />
            {userCount === 0
              ? <>Enable <strong>Auto voice loop</strong> for hands-free conversation — mic restarts automatically after the AI speaks.</>
              : <>{MIN_TURNS - userCount} more response{MIN_TURNS - userCount > 1 ? "s" : ""} needed for a meaningful assessment. Keep going!</>}
          </div>
        )}

        {/* Navigation */}
        <div className="sp-nav">
          <button className="sp-back" onClick={() => goPrev("speaking")}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          <button className="sp-continue" onClick={handleContinue} disabled={!canContinue || completing}>
            {completing
              ? <span>Finishing up… <span className="sp-spinner" /></span>
              : <><i className="fas fa-check" /> Finish & Continue</>}
          </button>
        </div>
      </div>
    </>
  );
}
