import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PronunciationStep from "./Assessment/PronunciationStep";
import "./polish.css";
import { useAuth } from "../context/AuthContext";
import {
  logPracticeSession,
  createSession,
  uploadAudio,
  getJobStatus,
  chatWithTutor,
  streamTutorChat,
  fetchTutorSuggestions,
  fetchTTS,
  fetchPracticeFlashcards,
  fetchPracticeGrammar,
  fetchPracticeReading,
  fetchPracticeListening,
  scorePracticeWriting,
  fetchPracticeWritingPrompt,
  fetchPracticeSpeaking,
  checkWritingGrammar,
  fetchPracticeProgress,
  savePracticeProgress,
  updateUserProfile,
  transcribeAudio,
  authorizedFetch,
} from "../services/api";
import { formatErrorForDisplay, logError } from "../utils/errorHandler";
import { getContent } from "../data/practiceContent";
import { logActivityMinutes } from "../utils/activityLog";
import PracticeActivity from "../components/PracticeActivity";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const fmt = (s) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function speakTTS(text, lang, onStart, onEnd) {
  // Try neural TTS via backend first, fall back to browser TTS.
  // authorizedFetch attaches the token and auto-refreshes on 401.
  try {
    const res = await authorizedFetch(`${BASE_URL}/api/v1/practice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        await new Promise((resolve) => {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
          // Retain a reference so the element isn't garbage-collected mid-play.
          _currentTTSAudio = audio;
          let settled = false;
          const done = () => { if (!settled) { settled = true; onEnd?.(); resolve(); } };
          onStart?.();
          audio.onended = done;
          audio.onerror = () => {
            if (settled) return;
            settled = true;
            _browserSpeak(text, lang, onStart, onEnd);
            resolve();
          };
          // play() rejects when the browser blocks autoplay — fall back to browser TTS
          audio.play().catch(() => {
            if (settled) return;
            settled = true;
            _browserSpeak(text, lang, onStart, onEnd);
            resolve();
          });
        });
        return;
      }
    }
  } catch (_) {}
  // Browser TTS fallback
  _browserSpeak(text, lang, onStart, onEnd);
}

// Holds the currently-playing TTS <audio> so the browser can't GC it mid-play.
let _currentTTSAudio = null;

function _browserSpeak(text, lang, onStart, onEnd) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const doSpeak = () => {
    const utt = new SpeechSynthesisUtterance(text.replace(/"/g, ""));
    utt.lang = lang || "en-US";
    utt.rate = 0.88;
    utt.pitch = 1;
    utt.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang === lang)
           || voices.find((v) => v.lang.startsWith((lang || "en").split("-")[0]))
           || voices[0];
    if (v) utt.voice = v;
    utt.onstart = () => onStart?.();
    utt.onend   = () => onEnd?.();
    utt.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utt);
  };
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      doSpeak();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
  }
}

// Static metadata — order here = display order ("Talk with AI" first)
const CAT_META = [
  { id: "tutor",      icon: "fa-robot",        title: "Talk with AI",       desc: "Chat with your personal AI tutor — get real-time corrections and vocabulary tips as you speak" },
  { id: "flashcards", icon: "fa-layer-group",   title: "Flashcards",         desc: "Learn and review vocabulary with smart flashcards that adapt to your progress" },
  { id: "listening",  icon: "fa-headphones",    title: "Listening Practice", desc: "Improve your listening comprehension with real conversations and audio exercises" },
  { id: "writing",    icon: "fa-pen",           title: "Writing Practice",   desc: "Get instant AI feedback on your writing with grammar and style corrections" },
  { id: "speaking",   icon: "fa-microphone",    title: "Speaking Drills",    desc: "Practice pronunciation and speaking with AI-powered conversation partners" },
  { id: "reading",    icon: "fa-book-open",     title: "Reading Practice",   desc: "Improve reading comprehension with authentic texts and vocabulary exercises" },
  { id: "grammar",    icon: "fa-check-double",  title: "Grammar Practice",   desc: "Master grammar rules with interactive exercises and instant feedback" },
  { id: "pronunciation", icon: "fa-bullhorn",   title: "Pronunciation",      desc: "Test and improve your pronunciation with AI-powered analysis and scoring" },
];

// Default per-user stats stored in localStorage (all zero for new users)
const DEFAULT_STATS = {
  flashcards: { wordsLearned: 0, sessions: 0 },
  listening:  { exercises: 0, totalCorrect: 0, totalAttempted: 0 },
  writing:    { submissions: 0, totalScore: 0 },
  speaking:   { minutes: 0, sessions: 0 },
  reading:    { articles: 0, totalCorrect: 0, totalAttempted: 0 },
  grammar:    { exercises: 0, totalCorrect: 0, totalAttempted: 0 },
  streak: 0,
  todayMinutes: 0,
  dailyGoalMinutes: 10,
};

// Level-aware, randomized tutor opener. __LANG__ is replaced with the language.
const _TUTOR_GREETINGS = {
  beginner: [
    "Hi! I'm your AI tutor. Let's practice __LANG__! Tell me — what's your name, or what do you like to do?",
    "Hello! Ready to practice __LANG__? Let's keep it easy. What did you do today?",
    "Hi there! I'm here to help you with __LANG__. Tell me about something you like!",
    "Hey! Let's practice __LANG__ together. Do you have any hobbies?",
  ],
  intermediate: [
    "Hey! I'm your AI __LANG__ tutor. What's something interesting that happened to you recently?",
    "Hi! Let's have a chat in __LANG__. What have you been up to lately?",
    "Hello! Ready to practice your __LANG__? Tell me about your day or a topic you enjoy.",
    "Hi there! What would you like to talk about in __LANG__ today — work, travel, food?",
  ],
  advanced: [
    "Hi! I'm your AI __LANG__ tutor. What's been on your mind lately — anything you'd enjoy getting into?",
    "Hey there! Let's dive into a real conversation in __LANG__. What topic would you like to explore today?",
    "Hello! I'd love to chat in __LANG__. Current events, ideas, life — what shall we get into?",
    "Hi! Let's have a proper discussion in __LANG__. Is there something you've been thinking about lately?",
  ],
};

function makeTutorGreeting(level, lang) {
  const lvl = String(level || "B1").toUpperCase();
  const tier = ["A1", "A2"].includes(lvl)
    ? "beginner"
    : ["C1", "C2"].includes(lvl)
      ? "advanced"
      : "intermediate";
  const pool = _TUTOR_GREETINGS[tier];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick.replaceAll("__LANG__", lang);
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const { user, updateUser } = useAuth();

  // Award minutes and update user stats after a completed practice session
  const awardPracticeMinutes = async (type, minutes = 5, score = null) => {
    // 1. Increment todayMinutes in local stats state + persist
    setPracticeStats((prev) => {
      const base = _applyDailyReset(prev);
      const next = { ...base, todayMinutes: (base.todayMinutes || 0) + minutes, statsDate: _todayStr() };
      try { localStorage.setItem(`polylingo_stats_${user?.id || "guest"}`, JSON.stringify(next)); } catch (_) {}
      try { logActivityMinutes(user?.id, minutes); setActivityKey((k) => k + 1); } catch (_) {}
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        savePracticeProgress({ language: lang, ...next });
      }, 1500);
      return next;
    });
    // 2. Log session to backend (non-critical)
    try {
      await logPracticeSession({
        type,
        language: lang,
        durationMinutes: minutes,
        score: score ?? undefined,
      });
    } catch (_) { /* non-critical — don't block UI */ }
  };

  // Get content for the user's chosen language (falls back to English)
  // BACKEND INTEGRATION: Replace getContent() with API calls per tab
  const lang = user?.preferred_language || user?.preferredLanguage || "English";
  const content = getContent(lang);
  const ttsLang = content.ttsLang;

  // ── Practice stats (persisted in localStorage, zero for new users) ──
  const STATS_KEY = `polylingo_stats_${user?.id || "guest"}`;
  // Daily rollover: todayMinutes must reset each calendar day, otherwise
  // yesterday's minutes keep counting toward today's goal forever.
  const _todayStr = () => new Date().toISOString().slice(0, 10);
  const _applyDailyReset = (stats) => {
    if (!stats) return stats;
    if (stats.statsDate !== _todayStr()) {
      return { ...stats, todayMinutes: 0, statsDate: _todayStr() };
    }
    return stats;
  };

  const [activityKey, setActivityKey] = useState(0); // bumps to re-render the heatmap
  const [practiceStats, setPracticeStats] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`polylingo_stats_${user?.id || "guest"}`));
      // merge with DEFAULT_STATS so new keys are always present
      if (stored) {
        return _applyDailyReset({
          flashcards: { ...DEFAULT_STATS.flashcards, ...stored.flashcards },
          listening:  { ...DEFAULT_STATS.listening,  ...stored.listening  },
          writing:    { ...DEFAULT_STATS.writing,     ...stored.writing    },
          speaking:   { ...DEFAULT_STATS.speaking,    ...stored.speaking   },
          reading:    { ...DEFAULT_STATS.reading,     ...stored.reading    },
          grammar:    { ...DEFAULT_STATS.grammar,     ...stored.grammar    },
          streak:          stored.streak          ?? 0,
          todayMinutes:    stored.todayMinutes    ?? 0,
          dailyGoalMinutes: stored.dailyGoalMinutes ?? 10,
          statsDate:       stored.statsDate,
        });
      }
    } catch (_) {}
    return { ...DEFAULT_STATS, statsDate: _todayStr() };
  });
  // Debounce ref so we don't fire a PUT on every single click
  const saveTimerRef = useRef(null);

  const updateStat = (tabId, updater) => {
    setPracticeStats((prev) => {
      const next = { ..._applyDailyReset(prev), [tabId]: updater({ ...prev[tabId] }), statsDate: _todayStr() };
      // Always persist locally immediately
      try { localStorage.setItem(STATS_KEY, JSON.stringify(next)); } catch (_) {}
      // Debounce the backend save by 1.5 s
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        savePracticeProgress({ language: lang, ...next });
      }, 1500);
      return next;
    });
  };

  // On mount: try to load stats from backend (overrides localStorage if available)
  useEffect(() => {
    const loadProgress = async () => {
      const remote = await fetchPracticeProgress(lang);
      if (!remote) return; // backend unreachable — keep localStorage values
      const merged = {
        flashcards: { ...DEFAULT_STATS.flashcards, ...remote.flashcards },
        listening:  { ...DEFAULT_STATS.listening,  ...remote.listening  },
        writing:    { ...DEFAULT_STATS.writing,     ...remote.writing    },
        speaking:   { ...DEFAULT_STATS.speaking,    ...remote.speaking   },
        reading:    { ...DEFAULT_STATS.reading,     ...remote.reading    },
        grammar:    { ...DEFAULT_STATS.grammar,     ...remote.grammar    },
        streak:          remote.streak          ?? 0,
        todayMinutes:    remote.todayMinutes    ?? 0,
        dailyGoalMinutes: remote.dailyGoalMinutes ?? 10,
        statsDate:       _todayStr(), // server already applies its own daily rollover
      };
      setPracticeStats(merged);
      try { localStorage.setItem(STATS_KEY, JSON.stringify(merged)); } catch (_) {}
    };
    loadProgress();
  }, [lang]); // reload when user switches language

  // Flush pending save immediately when user closes/navigates away
  useEffect(() => {
    const flushOnUnload = () => {
      clearTimeout(saveTimerRef.current);
      try {
        const stored = JSON.parse(localStorage.getItem(STATS_KEY));
        if (stored) savePracticeProgress({ language: lang, ...stored });
      } catch (_) {}
    };
    window.addEventListener("beforeunload", flushOnUnload);
    return () => window.removeEventListener("beforeunload", flushOnUnload);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmtPct  = (correct, total) => total > 0 ? `${Math.round((correct / total) * 100)}%` : "—";
  const fmtAvg  = (total, count)   => count  > 0 ? (total  / count).toFixed(1) : "—";

  // Build CATEGORIES dynamically so the stat bubbles show real data
  const CATEGORIES = CAT_META.map((meta) => {
    const s = practiceStats;
    switch (meta.id) {
      case "tutor":      return { ...meta, s1: "AI",   l1: "Powered",      s2: "24/7",  l2: "Available"   };
      case "flashcards": return { ...meta, s1: s.flashcards.wordsLearned,   l1: "Words Learned",  s2: s.flashcards.sessions,  l2: "Sessions"   };
      case "listening":  return { ...meta, s1: fmtPct(s.listening.totalCorrect, s.listening.totalAttempted), l1: "Accuracy", s2: s.listening.exercises,  l2: "Exercises"  };
      case "writing":    return { ...meta, s1: fmtAvg(s.writing.totalScore, s.writing.submissions),          l1: "Avg. Score", s2: s.writing.submissions,  l2: "Submissions" };
      case "speaking":   return { ...meta, s1: s.speaking.minutes,          l1: "Minutes",        s2: s.speaking.sessions,    l2: "Sessions"   };
      case "reading":    return { ...meta, s1: s.reading.articles,          l1: "Articles",       s2: fmtPct(s.reading.totalCorrect, s.reading.totalAttempted), l2: "Accuracy" };
      case "grammar":    return { ...meta, s1: fmtPct(s.grammar.totalCorrect, s.grammar.totalAttempted), l1: "Accuracy", s2: s.grammar.exercises,   l2: "Exercises"  };
      case "pronunciation": return { ...meta, s1: s.speaking.sessions,        l1: "Attempts",       s2: s.speaking.minutes,     l2: "Minutes"    };
      default:           return meta;
    }
  });

  const [searchParams] = useSearchParams();
  const VALID_TABS = ["tutor", "flashcards", "grammar", "reading", "listening", "writing", "speaking", "pronunciation"];
  const initialTab = VALID_TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "tutor";
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Dynamic AI content (null = not yet fetched) ──
  const [dynamicFlashcards, setDynamicFlashcards] = useState(null);
  const [dynamicGrammar, setDynamicGrammar] = useState(null);
  const [dynamicReading, setDynamicReading] = useState(null);
  const [dynamicListening, setDynamicListening] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");

  // ── Dynamic writing prompt & speaking phrases (AI-generated) ──
  const [dynamicWritingPrompt, setDynamicWritingPrompt] = useState(null);
  const [dynamicSpeakingPhrases, setDynamicSpeakingPhrases] = useState(null);
  const [grammarCheckLoading, setGrammarCheckLoading] = useState(false);

  // ── Level selector (affects all AI content, defaults to user profile) ──
  const [practiceLevel, setPracticeLevel] = useState(
    user?.estimated_level || user?.selected_level || "B1"
  );

  // ── Spaced repetition: remember hard flashcards ──
  const [hardCards, setHardCards] = useState(new Set());

  // ── Reading TTS ──
  const [readingTTSPlaying, setReadingTTSPlaying] = useState(false);

  // ── Session summary ──
  const [sessionSummary, setSessionSummary] = useState(null); // { type, score, total }

  // Cards the learner saved from tutor-chat mistakes (persisted per user+lang).
  const customCardsKey = `polylingo_custom_cards_${user?.id || "guest"}_${lang}`;
  const [customCards, setCustomCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem(customCardsKey)) || []; } catch { return []; }
  });

  // Use AI-generated content when available, fall back to static. Mistake cards
  // are prepended so review starts with the learner's own errors.
  const FLASHCARDS = [...customCards, ...(dynamicFlashcards || content.flashcards)];
  const GRAMMAR_EXERCISES = dynamicGrammar || content.grammar;
  const READING = dynamicReading || content.reading;
  const SPEAKING_PHRASES = dynamicSpeakingPhrases || content.speakingPhrases;
  const LISTENING_EXERCISE = dynamicListening || content.listening;
  const writingPrompt = dynamicWritingPrompt || content.writingPrompt;

  // ── Flashcard state (SM-2 spaced repetition) ──
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  // SM-2: cardSRState maps cardIndex -> { interval, easeFactor, repetitions, dueOrder }
  // Persisted to localStorage with user+language key so it survives tab switches and restarts
  const sm2Key = `polylingo_sm2_${user?.id || "guest"}_${user?.preferred_language || "English"}`;
  const [cardSRState, setCardSRState] = useState(() => {
    try {
      const saved = localStorage.getItem(sm2Key);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // ── Grammar state ──
  const [grammarAnswers, setGrammarAnswers] = useState({});
  const [grammarChecked, setGrammarChecked] = useState(false);
  const [grammarScore, setGrammarScore] = useState(0);

  // ── Reading state ──
  const [readingAnswers, setReadingAnswers] = useState({});
  const [readingChecked, setReadingChecked] = useState(false);

  // ── Writing state ──
  const [writingText, setWritingText] = useState("");
  const [writingFeedback, setWritingFeedback] = useState("");
  const [writingScore, setWritingScore] = useState(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [grammarInline, setGrammarInline] = useState("");
  const [vocabInline, setVocabInline] = useState("");

  // ── Listening state ──
  const [listeningAnswer, setListeningAnswer] = useState(null);
  const [listeningResult, setListeningResult] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // ── Speaking/pronunciation state ──
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [examplePlaying, setExamplePlaying] = useState(false);
  const [showPronFeedback, setShowPronFeedback] = useState(false);
  const [micError, setMicError] = useState("");

  // ── Session & Upload state ──
  const [sessionId, setSessionId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [jobId, setJobId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [feedbackData, setFeedbackData] = useState(null);

  // ── AI Tutor state (persisted per user+language so the chat survives
  //    tab switches and page refreshes) ──
  const TUTOR_CHAT_KEY = `polylingo_tutor_chat_${user?.id || "guest"}_${lang}`;
  const loadTutorChat = (key) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved) && saved.length > 0) {
        // Drop unfinished streaming placeholders from a previous session
        const clean = saved
          .filter((m) => m && m.content)
          .map(({ streaming: _s, ...m }) => m);
        if (clean.length > 0) return clean;
      }
    } catch (_) {}
    return [
      {
        role: "assistant",
        content: makeTutorGreeting(practiceLevel, lang),
        correction: null,
        vocab_tip: null,
      },
    ];
  };
  const [tutorMessages, setTutorMessages] = useState(() => loadTutorChat(TUTOR_CHAT_KEY));

  // Persist tutor chat on every change (last 50 messages, no streaming placeholders)
  useEffect(() => {
    try {
      const toSave = tutorMessages
        .filter((m) => m && m.content)
        .map(({ streaming: _s, ...m }) => m)
        .slice(-50);
      localStorage.setItem(TUTOR_CHAT_KEY, JSON.stringify(toSave));
    } catch (_) {}
  }, [tutorMessages, TUTOR_CHAT_KEY]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorListening, setTutorListening] = useState(false);
  const [tutorSpeaking, setTutorSpeaking] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [tutorSuggestions, setTutorSuggestions] = useState([]); // A1/A2 reply chips
  const [recapSaved, setRecapSaved] = useState(false);          // mistakes→flashcards feedback

  // All correction notes the tutor has made this conversation.
  const tutorCorrections = tutorMessages.filter((m) => m && m.correction).map((m) => m.correction);

  // Turn a correction note like '"I goed" → "I went" (past tense)' into a card.
  function correctionToCard(note) {
    const s = String(note);
    const arrow = s.indexOf("→") >= 0 ? "→" : (s.indexOf("->") >= 0 ? "->" : null);
    let word = s, translation = "Your version", example = "Saved from your tutor chat";
    if (arrow) {
      const [left, right] = s.split(arrow);
      translation = left.replace(/["“”]/g, "").trim();
      const m = (right || "").match(/^[^("]*"?([^"(]+)"?\s*(\(.*\))?/);
      word = (right || "").replace(/["“”]/g, "").replace(/\(.*\)/, "").trim() || s;
      example = (right.match(/\((.*)\)/) || [, "Saved from your tutor chat"])[1];
    }
    return { word, translation, example };
  }

  function saveMistakesAsFlashcards() {
    if (tutorCorrections.length === 0) return;
    const cards = tutorCorrections.map(correctionToCard);
    const seen = new Set();
    const merged = [...cards, ...customCards].filter((c) => {
      const k = (c.word || "") + "|" + (c.translation || "");
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    setCustomCards(merged);
    try { localStorage.setItem(customCardsKey, JSON.stringify(merged)); } catch (_) {}
    setRecapSaved(true);
    setTimeout(() => setRecapSaved(false), 4000);
  }

  const timerRef = useRef(null);
  const barsRef = useRef([]);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const tutorStreamRef = useRef(null);  // AbortController for active SSE stream
  const ttsQueueRef = useRef([]);        // Sentences waiting for TTS playback
  const ttsBusyRef = useRef(false);      // Whether TTS is currently speaking
  const tutorVoiceLoopRef = useRef(false); // Auto voice loop on/off
  const tutorMicRecRef = useRef(null);   // Active MediaRecorder for voice loop
  const tutorMicChunksRef = useRef([]);  // Audio chunks for voice loop
  const [tutorVoiceLoop, setTutorVoiceLoop] = useState(false);
  const [tutorTranscribing, setTutorTranscribing] = useState(false);

  // Reset exercise state when language changes
  useEffect(() => {
    setCardIdx(0);
    setFlipped(false);
    setKnown(0);
    setGrammarAnswers({});
    setGrammarChecked(false);
    setGrammarScore(0);
    setReadingAnswers({});
    setReadingChecked(false);
    setListeningAnswer(null);
    setListeningResult("");
    setShowTranscript(false);
    setPhraseIdx(0);
    setAudioBlob(null);
    setAudioURL(null);
    setShowPronFeedback(false);
    setMicError("");
    window.speechSynthesis?.cancel();
    // Swap in the tutor chat history for the new language
    setTutorMessages(loadTutorChat(`polylingo_tutor_chat_${user?.id || "guest"}_${lang}`));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Scroll to top when the practice page first loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Create session on component mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSessionId = await createSession();
        setSessionId(newSessionId);
      } catch (err) {
        console.error("Failed to create session:", err);
        setUploadError("Failed to initialize recording session");
      }
    };
    initSession();
  }, []);

  // Animate waveform bars while recording
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      barsRef.current.forEach((b) => {
        if (b) b.style.height = `${Math.random() * 55 + 8}px`;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [recording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-scroll chat to latest message (only after first message, not on mount)
  const tutorMsgCount = useRef(0);
  useEffect(() => {
    if (tutorMessages.length > tutorMsgCount.current) {
      tutorMsgCount.current = tutorMessages.length;
      if (tutorMessages.length > 1) {
        // Scroll inside the chat container, not the whole page
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }
    }
  }, [tutorMessages]);

  // Reset tutor chat when the language OR level changes (fresh, level-matched start)
  useEffect(() => {
    // Stop anything in flight from the previous level/language
    tutorStreamRef.current?.abort();
    tutorStreamRef.current = null;
    window.speechSynthesis?.cancel();
    try { _currentTTSAudio?.pause(); _currentTTSAudio = null; } catch (_) {}
    ttsQueueRef.current = [];
    ttsBusyRef.current = false;
    setTutorSpeaking(false);
    setTutorLoading(false);

    setTutorMessages([
      {
        role: "assistant",
        content: makeTutorGreeting(practiceLevel, lang),
        correction: null,
        vocab_tip: null,
      },
    ]);
    setTutorInput("");
    setTutorError("");
  }, [lang, practiceLevel]);

  // Fetch AI-generated content when a tab is first opened (cached until reset)
  useEffect(() => {
    setTabError(""); // clear error when switching tabs or refreshing
    const loadTabContent = async () => {
      if (activeTab === "flashcards" && !dynamicFlashcards) {
        updateStat("flashcards", (s) => ({ ...s, sessions: s.sessions + 1 }));
        setTabLoading(true);
        try {
          const data = await fetchPracticeFlashcards({ language: lang, level: practiceLevel });
          if (data?.flashcards?.length) setDynamicFlashcards(data.flashcards);
          else setTabError("AI couldn't generate flashcards — showing built-in content instead.");
        } catch (_) { setTabError("AI content generation failed — showing built-in content instead."); }
        finally { setTabLoading(false); }
      } else if (activeTab === "grammar" && !dynamicGrammar) {
        setTabLoading(true);
        try {
          const data = await fetchPracticeGrammar({ language: lang, level: practiceLevel });
          if (data?.exercises?.length) setDynamicGrammar(data.exercises);
          else setTabError("AI couldn't generate grammar exercises — showing built-in content instead.");
        } catch (_) { setTabError("AI content generation failed — showing built-in content instead."); }
        finally { setTabLoading(false); }
      } else if (activeTab === "reading" && !dynamicReading) {
        setTabLoading(true);
        try {
          const data = await fetchPracticeReading({ language: lang, level: practiceLevel });
          if (data?.title) setDynamicReading(data);
          else setTabError("AI couldn't generate a reading passage — showing built-in content instead.");
        } catch (_) { setTabError("AI content generation failed — showing built-in content instead."); }
        finally { setTabLoading(false); }
      } else if (activeTab === "listening" && !dynamicListening) {
        setTabLoading(true);
        try {
          const data = await fetchPracticeListening({ language: lang, level: practiceLevel });
          if (data?.question) setDynamicListening(data);
          else setTabError("AI couldn't generate a listening exercise — showing built-in content instead.");
        } catch (_) { setTabError("AI content generation failed — showing built-in content instead."); }
        finally { setTabLoading(false); }
      } else if (activeTab === "writing" && !dynamicWritingPrompt) {
        setTabLoading(true);
        try {
          const data = await fetchPracticeWritingPrompt({ language: lang, level: practiceLevel });
          if (data?.prompt) setDynamicWritingPrompt(data.prompt);
          else setTabError("AI couldn't generate a writing prompt — showing built-in content instead.");
        } catch (_) { setTabError("AI content generation failed — showing built-in content instead."); }
        finally { setTabLoading(false); }
      } else if (activeTab === "speaking" && !dynamicSpeakingPhrases) {
        setTabLoading(true);
        try {
          const data = await fetchPracticeSpeaking({ language: lang, level: practiceLevel });
          if (data?.phrases?.length) setDynamicSpeakingPhrases(data.phrases);
          else setTabError("AI couldn't generate speaking phrases — showing built-in content instead.");
        } catch (_) { setTabError("AI content generation failed — showing built-in content instead."); }
        finally { setTabLoading(false); }
      }
    };
    loadTabContent();
  }, [activeTab, dynamicFlashcards, dynamicGrammar, dynamicReading, dynamicListening, dynamicWritingPrompt, dynamicSpeakingPhrases]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flashcard handlers (SM-2 spaced repetition) ──────────────────────────
  const _sm2Update = (idx, quality) => {
    setCardSRState((prev) => {
      const card = prev[idx] || { interval: 1, easeFactor: 2.5, repetitions: 0 };
      let { interval, easeFactor, repetitions } = card;
      if (quality >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        repetitions++;
      } else {
        repetitions = 0;
        interval = 1;
      }
      const next = { ...prev, [idx]: { interval, easeFactor, repetitions } };
      try { localStorage.setItem(sm2Key, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  // Pick the card with the smallest interval (most due) that hasn't been fully mastered
  const _getNextDueIdx = (srState, total, currentIdx) => {
    let bestIdx = (currentIdx + 1) % total;
    let bestInterval = Infinity;
    for (let i = 0; i < total; i++) {
      const s = srState[i] || { interval: 1, repetitions: 0 };
      if (i !== currentIdx && s.interval < bestInterval) {
        bestInterval = s.interval;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const nextCard = () => {
    setCardIdx((i) => (i + 1) % FLASHCARDS.length);
    setFlipped(false);
  };
  const prevCard = () => {
    setCardIdx((i) => (i - 1 + FLASHCARDS.length) % FLASHCARDS.length);
    setFlipped(false);
  };
  const markKnown = () => {
    setKnown((k) => k + 1);
    updateStat("flashcards", (s) => ({ ...s, wordsLearned: s.wordsLearned + 1 }));
    _sm2Update(cardIdx, 4);
    setCardSRState((prev) => {
      const nextIdx = _getNextDueIdx(prev, FLASHCARDS.length, cardIdx);
      // use a timeout so the state update has propagated
      setTimeout(() => { setCardIdx(nextIdx); setFlipped(false); }, 0);
      return prev;
    });
  };
  const markHard = () => {
    _sm2Update(cardIdx, 1);
    setCardSRState((prev) => {
      const nextIdx = _getNextDueIdx(prev, FLASHCARDS.length, cardIdx);
      setTimeout(() => { setCardIdx(nextIdx); setFlipped(false); }, 0);
      return prev;
    });
  };

  const sm2DueCount = FLASHCARDS.length - Object.values(cardSRState).filter((s) => s.repetitions >= 3 && s.interval >= 6).length;

  // ── Grammar handlers ──────────────────────────────────────────────────────
  const setGrammarAnswer = (idx, ans) => {
    if (!grammarChecked) setGrammarAnswers((a) => ({ ...a, [idx]: ans }));
  };
  const checkGrammarAnswers = () => {
    let score = 0;
    GRAMMAR_EXERCISES.forEach((ex, i) => {
      if (grammarAnswers[i] === ex.correct) score++;
    });
    setGrammarScore(score);
    setGrammarChecked(true);
    setSessionSummary({ type: "Grammar", score, total: GRAMMAR_EXERCISES.length });
    updateStat("grammar", (s) => ({
      ...s,
      exercises:     s.exercises + 1,
      totalCorrect:  s.totalCorrect  + score,
      totalAttempted: s.totalAttempted + GRAMMAR_EXERCISES.length,
    }));
    awardPracticeMinutes("grammar", score * 2, Math.round((score / GRAMMAR_EXERCISES.length) * 100));
  };

  // ── Reading handlers ──────────────────────────────────────────────────────
  const setReadingAnswer = (idx, ans) => {
    if (!readingChecked) setReadingAnswers((a) => ({ ...a, [idx]: ans }));
  };
  const checkReadingAnswers = () => {
    setReadingChecked(true);
    const correct = READING.questions.filter((rq, qi) => readingAnswers[qi] === rq.correct).length;
    setSessionSummary({ type: "Reading", score: correct, total: READING.questions.length });
    updateStat("reading", (s) => ({
      ...s,
      articles:      s.articles + 1,
      totalCorrect:  s.totalCorrect  + correct,
      totalAttempted: s.totalAttempted + READING.questions.length,
    }));
    awardPracticeMinutes("reading", 5, Math.round((correct / READING.questions.length) * 100));
  };

  // ── Writing handlers ──────────────────────────────────────────────────────
  const countWords = () => {
    const wc = writingText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    return wc;
  };
  const checkGrammarInline = async () => {
    if (!writingText.trim()) {
      setGrammarInline("Please write something first.");
      return;
    }
    setGrammarCheckLoading(true);
    setGrammarInline("Checking grammar with AI…");
    setVocabInline("");
    try {
      const result = await checkWritingGrammar({ text: writingText, language: lang });
      if (result?.corrections?.length > 0) {
        const msgs = result.corrections
          .map((c) => `• "${c.original}" → "${c.corrected}": ${c.explanation}`)
          .join("\n");
        setGrammarInline(
          `⚠ Found ${result.corrections.length} issue(s):\n${msgs}${result.overall ? `\n\nOverall: ${result.overall}` : ""}`,
        );
      } else {
        setGrammarInline(
          `✓ Grammar looks good! ${result?.overall || "No major errors found."}`,
        );
      }
    } catch (_) {
      setGrammarInline("✓ Grammar looks good! No major errors detected.");
    } finally {
      setGrammarCheckLoading(false);
    }
  };
  const checkVocabInline = () => {
    if (!writingText.trim()) {
      setVocabInline("Please write something first.");
      return;
    }
    const suggestions =
      content.writingVocab?.join('", "') ||
      "additionally, furthermore, however";
    setVocabInline(`Suggestions: try "${suggestions}" for variety.`);
    setGrammarInline("");
  };
  const submitWriting = async () => {
    const wc = writingText.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 10) {
      setWritingFeedback("⚠ Please write at least 10 words before submitting.");
      return;
    }
    setWordCount(wc);
    setWritingLoading(true);
    setWritingFeedback("");
    setWritingScore(null);
    setGrammarInline("");
    setVocabInline("");
    try {
      const result = await scorePracticeWriting({
        writingText,
        prompt: writingPrompt,
        language: lang,
      });
      const score = result.score ?? null;
      setWritingScore(score);
      setWritingFeedback(result.feedback || "Great effort! Keep writing.");
      updateStat("writing", (s) => ({
        ...s,
        submissions: s.submissions + 1,
        totalScore:  s.totalScore + (score ?? 0),
      }));
      awardPracticeMinutes("writing", Math.max(3, Math.min(10, Math.floor(wc / 20))));
    } catch (_) {
      // Fallback to local estimate if backend is unreachable
      setWritingFeedback(
        `Great effort! Your paragraph has ${wc} words. Grammar is mostly correct. ` +
          `Try to vary your sentence structure and include transition words. ` +
          `Overall score: ${Math.min(10, Math.max(6, Math.round(wc / 10)))}/10`,
      );
    } finally {
      setWritingLoading(false);
    }
  };

  // ── Listening handlers ────────────────────────────────────────────────────
  const listeningAudioRef = useRef(null);

  const playListeningAudio = async () => {
    if (audioPlaying) {
      if (listeningAudioRef.current) {
        listeningAudioRef.current.pause();
        listeningAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setAudioPlaying(false);
      return;
    }

    const fullText = LISTENING_EXERCISE.transcript
      .map((l) => `${l.speaker}: ${l.line}`)
      .join(". ");

    setAudioPlaying(true);
    // Try ElevenLabs first via backend proxy
    try {
      const { audioBase64 } = await fetchTTS(fullText, ttsLang);
      if (audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        listeningAudioRef.current = audio;
        audio.onended = () => { listeningAudioRef.current = null; setAudioPlaying(false); };
        audio.onerror = () => {
          listeningAudioRef.current = null;
          speakTTS(fullText, ttsLang, () => {}, () => setAudioPlaying(false));
        };
        audio.play().catch(() => {
          listeningAudioRef.current = null;
          speakTTS(fullText, ttsLang, () => {}, () => setAudioPlaying(false));
        });
        return;
      }
    } catch (_) {}

    // Browser TTS fallback
    speakTTS(fullText, ttsLang, () => {}, () => setAudioPlaying(false));
  };
  const checkListeningAnswer = () => {
    if (listeningAnswer === null) return;
    const correct = listeningAnswer === LISTENING_EXERCISE.correct;
    setListeningResult(
      correct
        ? `✓ Correct! ${LISTENING_EXERCISE.options[LISTENING_EXERCISE.correct]}`
        : `✗ Incorrect. The correct answer is: ${LISTENING_EXERCISE.options[LISTENING_EXERCISE.correct]}`,
    );
    updateStat("listening", (s) => ({
      ...s,
      exercises:      s.exercises + 1,
      totalCorrect:   s.totalCorrect  + (correct ? 1 : 0),
      totalAttempted: s.totalAttempted + 1,
    }));
    awardPracticeMinutes("listening", 5);
  };

  // ── Speaking/pronunciation handlers ──────────────────────────────────────
  const playExample = () => {
    const phrase = SPEAKING_PHRASES[phraseIdx];
    // Use ElevenLabs base64 audio if available (from backend)
    if (phrase.audioBase64) {
      if (examplePlaying) {
        setExamplePlaying(false);
        return;
      }
      const audio = new Audio(`data:audio/mpeg;base64,${phrase.audioBase64}`);
      _currentTTSAudio = audio; // retain so it isn't GC'd mid-play
      audio.onended = () => setExamplePlaying(false);
      audio.onerror = () => {
        setExamplePlaying(false);
        speakTTS(phrase.text, ttsLang, () => setExamplePlaying(true), () => setExamplePlaying(false));
      };
      setExamplePlaying(true);
      audio.play().catch(() => {
        setExamplePlaying(false);
        speakTTS(phrase.text, ttsLang, () => setExamplePlaying(true), () => setExamplePlaying(false));
      });
      return;
    }
    speakTTS(
      phrase.text,
      ttsLang,
      () => setExamplePlaying(true),
      () => setExamplePlaying(false),
    );
  };

  const startRecording = async () => {
    setMicError("");
    setAudioBlob(null);
    setAudioURL(null);
    setShowPronFeedback(false);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
      setRecTime(0);
      let s = 0;
      timerRef.current = setInterval(() => {
        s++;
        setRecTime(s);
        if (s >= 30) stopRecording();
      }, 1000);
    } catch (err) {
      setMicError(
        "Microphone access denied. Please allow microphone access and try again.",
      );
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecRef.current?.stop();
    setRecording(false);
    barsRef.current.forEach((b) => {
      if (b) b.style.height = "4px";
    });
  };

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const analyzeRecording = async () => {
    if (!audioBlob) return;
    if (!sessionId) {
      setUploadError("Session not initialized. Please refresh and try again.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadProgress("Uploading audio...");

    try {
      // Upload audio to backend
      const uploadResult = await uploadAudio(sessionId, audioBlob);
      setJobId(uploadResult.recording_id);
      setUploadProgress("Processing audio...");

      // Poll job status
      let jobStatus = null;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait

      const pollJob = async () => {
        try {
          const status = await getJobStatus(uploadResult.recording_id);
          jobStatus = status;

          if (status.status === "COMPLETED") {
            setProcessingStatus("✓ Analysis complete!");
            setFeedbackData(status.result);
            setShowPronFeedback(true);
            setUploading(false);
            setUploadProgress("");
            updateStat("speaking", (s) => ({
              ...s,
              sessions: s.sessions + 1,
              minutes:  Math.round(s.minutes + recTime / 60),
            }));
            awardPracticeMinutes("speaking", 5);
            return true;
          } else if (status.status === "FAILED") {
            throw new Error(status.error_message || "Processing failed");
          } else {
            setProcessingStatus(`Processing: ${status.status}`);
            return false;
          }
        } catch (err) {
          throw err;
        }
      };

      // Poll every second
      while (attempts < maxAttempts) {
        if (await pollJob()) break;
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (attempts >= maxAttempts) {
        setUploadError(
          "Processing timeout. Your recording has been saved and will be analyzed in the background.",
        );
        setShowPronFeedback(true);
      }
    } catch (err) {
      // Use utility function to format error message
      const errorMessage = formatErrorForDisplay(err, err.status);
      setUploadError(errorMessage);
      logError(err, "PracticePage.analyzeRecording");
      setShowPronFeedback(true);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };
  const nextPhrase = () => {
    setPhraseIdx((i) => (i + 1) % SPEAKING_PHRASES.length);
    setAudioBlob(null);
    setAudioURL(null);
    setShowPronFeedback(false);
    setRecTime(0);
    setMicError("");
    window.speechSynthesis.cancel();
    setExamplePlaying(false);
  };
  const prevPhrase = () => {
    setPhraseIdx(
      (i) => (i - 1 + SPEAKING_PHRASES.length) % SPEAKING_PHRASES.length,
    );
    setAudioBlob(null);
    setAudioURL(null);
    setShowPronFeedback(false);
    setRecTime(0);
    setMicError("");
    window.speechSynthesis.cancel();
    setExamplePlaying(false);
  };

  // ── Reading TTS ───────────────────────────────────────────────────────────────
  const playReadingPassage = () => {
    if (readingTTSPlaying) {
      window.speechSynthesis.cancel();
      setReadingTTSPlaying(false);
      return;
    }
    const fullText = READING.passage.join(" ");
    speakTTS(fullText, ttsLang, () => setReadingTTSPlaying(true), () => setReadingTTSPlaying(false));
  };

  // ── AI Tutor handlers ────────────────────────────────────────────────────────
  // ── Queued TTS so sentences play back-to-back without overlap ────────────────

  // ── Tutor TTS pipeline ────────────────────────────────────────────────────
  // Synthesis for each sentence starts the MOMENT it arrives (parallel with
  // playback + ongoing streaming), so playback is gapless instead of pausing to
  // fetch audio before every sentence. ttsQueueRef holds in-flight promises.
  const _playTTSAudio = (sentence, audioBase64) =>
    new Promise((resolve) => {
      if (!audioBase64) { speakTTS(sentence, ttsLang, () => {}, resolve); return; }
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      _currentTTSAudio = audio; // retain so it isn't GC'd mid-play
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const fallback = () => { if (!done) { done = true; speakTTS(sentence, ttsLang, () => {}, resolve); } };
      audio.onended = finish;
      audio.onerror = fallback;
      audio.play().catch(fallback);
    });

  const _drainTTSQueue = async () => {
    if (ttsBusyRef.current) return;
    ttsBusyRef.current = true;
    setTutorSpeaking(true);
    while (ttsQueueRef.current.length > 0) {
      const { sentence, audioBase64 } = await ttsQueueRef.current.shift();
      await _playTTSAudio(sentence, audioBase64);
    }
    ttsBusyRef.current = false;
    // A sentence may have been enqueued in the gap — keep draining if so.
    if (ttsQueueRef.current.length > 0) { _drainTTSQueue(); return; }
    setTutorSpeaking(false);
    // Auto-restart mic if voice loop is on and not already recording
    if (tutorVoiceLoopRef.current && !tutorMicRecRef.current) {
      setTimeout(() => _startTutorMic(), 450);
    }
  };

  const _enqueueSentence = (sentence) => {
    if (!sentence) return;
    // Start synthesis right away; store the promise so playback stays in order.
    const job = fetchTTS(sentence, ttsLang)
      .then((r) => ({ sentence, audioBase64: r?.audioBase64 }))
      .catch(() => ({ sentence, audioBase64: null }));
    ttsQueueRef.current.push(job);
    _drainTTSQueue();
  };

  const sendTutorChat = (overrideText, speechAnalytics = null) => {
    const msg = (overrideText ?? tutorInput).trim();
    if (!msg || tutorLoading) return;

    // Cancel any in-flight stream + TTS
    tutorStreamRef.current?.abort();
    tutorStreamRef.current = null;
    window.speechSynthesis?.cancel();
    try { _currentTTSAudio?.pause(); _currentTTSAudio = null; } catch (_) {}
    ttsQueueRef.current = [];
    ttsBusyRef.current = false;
    setTutorSpeaking(false);
    setTutorInput("");
    setTutorError("");
    setTutorSuggestions([]); // clear old reply chips while the tutor responds

    // Snapshot history BEFORE adding new messages (so we don't send the new user msg as history)
    const historyForApi = tutorMessages.map((m) => ({ role: m.role, content: m.content }));

    // Add user message + empty assistant placeholder in ONE state update
    // (never put setTimeout/side-effects inside a state updater — React StrictMode double-fires them)
    const userMsg       = { role: "user",      content: msg, correction: null, vocab_tip: null, via: speechAnalytics ? "voice" : "text" };
    const placeholderMsg = { role: "assistant", content: "",  correction: null, vocab_tip: null, streaming: true };
    setTutorMessages((prev) => [...prev, userMsg, placeholderMsg]);
    setTutorLoading(true);

    // Kick off the SSE stream directly — no setTimeout needed
    const controller = streamTutorChat(
      { message: msg, history: historyForApi, language: lang, level: practiceLevel, speech_analytics: speechAnalytics },
      {
        onToken: (token) => {
          setTutorMessages((prev) => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last?.streaming) {
              msgs[msgs.length - 1] = { ...last, content: last.content + token };
            }
            return msgs;
          });
        },
        onSentence: (sentence) => {
          _enqueueSentence(sentence);
        },
        onDone: ({ correction, vocab_tip }) => {
          let replyText = "";
          setTutorMessages((prev) => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last?.streaming) {
              replyText = last.content || "";
              msgs[msgs.length - 1] = {
                ...last,
                correction: correction || null,
                vocab_tip: vocab_tip || null,
                streaming: false,
              };
            }
            return msgs;
          });
          setTutorLoading(false);
          // Beginners freeze on an open chat — offer 2–3 tappable replies.
          if (["A1", "A2"].includes(practiceLevel) && replyText) {
            fetchTutorSuggestions({ message: replyText, language: lang, level: practiceLevel })
              .then((r) => setTutorSuggestions(Array.isArray(r?.suggestions) ? r.suggestions.slice(0, 3) : []))
              .catch(() => setTutorSuggestions([]));
          }
        },
        onError: () => {
          setTutorError("Couldn't reach the tutor. Please check your connection and try again.");
          setTutorMessages((prev) => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last?.streaming) {
              msgs[msgs.length - 1] = {
                role: "assistant",
                content: "Sorry, I couldn't connect right now. Please try again!",
                correction: null,
                vocab_tip: null,
                streaming: false,
              };
            }
            return msgs;
          });
          setTutorLoading(false);
        },
      },
    );

    tutorStreamRef.current = controller;
  };

  // ── Start mic recording for tutor (Whisper-based) ──────────────────────────
  const _startTutorMic = async () => {
    if (tutorMicRecRef.current) return; // already recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = (
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm")             ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4")              ? "audio/mp4" :
        ""
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      tutorMicChunksRef.current = [];
      tutorMicRecRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) tutorMicChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        tutorMicRecRef.current = null;
        setTutorListening(false);
        setTutorTranscribing(true);

        const blob = new Blob(tutorMicChunksRef.current, { type: mimeType || "audio/mp4" });
        try {
          const result = await transcribeAudio(blob, (ttsLang || "en").slice(0, 2));
          const { transcript, speech_analytics } = result;
          setTutorTranscribing(false);
          if (transcript?.trim()) {
            setTutorInput(transcript.trim());
            sendTutorChat(transcript.trim(), speech_analytics);
          } else if (tutorVoiceLoopRef.current) {
            // empty — restart mic
            setTimeout(() => _startTutorMic(), 400);
          }
        } catch {
          setTutorTranscribing(false);
          // Fallback: browser STT
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SR) {
            const r = new SR();
            r.lang = ttsLang;
            r.interimResults = false;
            r.onresult = (e) => { setTutorInput(e.results[0][0].transcript); sendTutorChat(e.results[0][0].transcript); };
            r.start();
          }
        }
      };

      recorder.start();
      setTutorListening(true);
      setTutorError("");
    } catch {
      setTutorError("Microphone access denied. Please allow mic access and try again.");
    }
  };

  const _stopTutorMic = () => {
    if (tutorMicRecRef.current) {
      tutorMicRecRef.current.stop();
    }
  };

  // While the mic is recording the textarea is disabled, so Enter never reaches
  // it. Listen at the window level so Enter stops recording (which then
  // transcribes + sends), matching what the chat input does for typed text.
  useEffect(() => {
    if (!tutorListening) return;
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        _stopTutorMic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tutorListening]);

  const startVoiceInput = () => {
    if (tutorListening) { _stopTutorMic(); return; }
    window.speechSynthesis?.cancel();
    setTutorSpeaking(false);
    ttsQueueRef.current = [];
    ttsBusyRef.current = false;
    _startTutorMic();
  };

  const toggleTutorVoiceLoop = () => {
    const next = !tutorVoiceLoop;
    tutorVoiceLoopRef.current = next;
    setTutorVoiceLoop(next);
    if (next && !tutorListening && !tutorSpeaking) {
      setTimeout(() => _startTutorMic(), 300);
    }
    if (!next && tutorListening) _stopTutorMic();
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div id="practice-page">
      <div className="container">
        {/* ── Page header: language badge + level selector + streak + daily goal ── */}
        <div style={{ paddingTop: "2rem", marginBottom: "1.5rem" }}>
          {/* Row 1: badge + level selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "#6366f1",
                padding: "0.45rem 1.2rem",
                borderRadius: "99px",
                fontSize: "0.88rem",
                fontWeight: 700,
              }}
            >
              <i className="fas fa-book" style={{ marginRight: 6 }} />Practicing: {lang}
            </span>
            <select
              value={practiceLevel}
              onChange={(e) => {
                const newLevel = e.target.value;
                setPracticeLevel(newLevel);
                // Clear cached AI content so next tab-open re-fetches at new level
                setDynamicFlashcards(null);
                setDynamicGrammar(null);
                setDynamicReading(null);
                setDynamicListening(null);
                setDynamicWritingPrompt(null);
                setDynamicSpeakingPhrases(null);
                // Persist chosen level to user profile
                updateUserProfile({ selected_level: newLevel }).catch(() => {});
              }}
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "var(--primary)",
                padding: "0.4rem 0.9rem",
                borderRadius: "99px",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {["A1","A2","B1","B2","C1","C2"].map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Row 2: streak + daily goal */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
            {/* Streak */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem", fontWeight: 600, color: practiceStats.streak > 0 ? "#f59e0b" : "var(--gray)" }}>
              <i className="fas fa-fire" /> {practiceStats.streak} day streak
            </div>
            {/* Daily goal progress */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--gray)", fontWeight: 600 }}>
                <i className="fas fa-bullseye" style={{ marginRight: 5 }} />Today: {practiceStats.todayMinutes}/{practiceStats.dailyGoalMinutes} min
              </span>
              <div style={{ width: 80, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (practiceStats.todayMinutes / (practiceStats.dailyGoalMinutes || 10)) * 100)}%`,
                  background: practiceStats.todayMinutes >= practiceStats.dailyGoalMinutes ? "var(--secondary)" : "var(--primary)",
                  borderRadius: 99,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
            {/* CEFR level progress */}
            {(() => {
              const levels = ["A1","A2","B1","B2","C1","C2"];
              const idx = levels.indexOf(practiceLevel);
              const totalEx = (practiceStats.grammar.totalAttempted || 0) + (practiceStats.reading.totalAttempted || 0) + (practiceStats.listening.totalAttempted || 0);
              const pct = Math.min(100, Math.round((totalEx / Math.max(1, (idx + 1) * 20)) * 100));
              const nextLevel = idx < 5 ? levels[idx + 1] : null;
              return nextLevel ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--gray)", fontWeight: 600 }}>
                    <i className="fas fa-arrow-trend-up" style={{ marginRight: 5 }} />{practiceLevel}→{nextLevel}: {pct}%
                  </span>
                  <div style={{ width: 80, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: "0.82rem", color: "#f59e0b", fontWeight: 700 }}><i className="fas fa-trophy" style={{ marginRight: 5 }} />Max Level!</span>
              );
            })()}
          </div>
        </div>

        {/* ── CATEGORY CARDS ── */}
        <div className="practice-categories">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`practice-category${activeTab === cat.id ? " active-cat" : ""}`}
              onClick={() => setActiveTab(cat.id)}
              style={{
                borderRadius: 22,
                border: activeTab === cat.id ? "2px solid transparent" : "1.5px solid var(--border)",
                background: activeTab === cat.id
                  ? "linear-gradient(135deg, rgba(99,102,241,0.18), var(--bg-card) 72%)"
                  : "var(--bg-card)",
                boxShadow: activeTab === cat.id
                  ? "0 16px 36px rgba(99,102,241,0.24)"
                  : "0 6px 20px rgba(17,24,39,0.05)",
                transform: activeTab === cat.id ? "translateY(-2px)" : "none",
                transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease",
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(17,24,39,0.14)"; }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = activeTab === cat.id ? "translateY(-2px)" : "none";
                e.currentTarget.style.boxShadow = activeTab === cat.id ? "0 16px 36px rgba(99,102,241,0.24)" : "0 6px 20px rgba(17,24,39,0.05)";
              }}
            >
              <div
                className="practice-icon"
                style={{ borderRadius: 16, boxShadow: "0 8px 18px rgba(99,102,241,0.32)" }}
              >
                <i className={`fas ${cat.icon}`} />
              </div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
              <div className="practice-stats-row">
                <div className="pstat">
                  <div className="pstat-value">{cat.s1}</div>
                  <div className="pstat-label">{cat.l1}</div>
                </div>
                <div className="pstat">
                  <div className="pstat-value">{cat.s2}</div>
                  <div className="pstat-label">{cat.l2}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── EXERCISE PANEL ── */}
        <div className="practice-exercises">
          <div className="exercise-tabs">
            {CATEGORIES.map((cat) => {
              const badgeMap = {
                tutor:      { label: "AI Chat",    value: null },
                flashcards: { label: "words",      value: practiceStats?.flashcards?.wordsLearned ?? 0 },
                grammar:    { label: "correct",    value: practiceStats?.grammar?.totalCorrect ?? 0 },
                reading:    { label: "correct",    value: practiceStats?.reading?.totalCorrect ?? 0 },
                listening:  { label: "correct",    value: practiceStats?.listening?.totalCorrect ?? 0 },
                writing:    { label: "submitted",  value: practiceStats?.writing?.submissions ?? 0 },
                speaking:   { label: "sessions",   value: practiceStats?.speaking?.sessions ?? 0 },
                pronunciation: { label: "sessions", value: practiceStats?.speaking?.sessions ?? 0 },
              };
              const badge = badgeMap[cat.id];
              return (
                <button
                  key={cat.id}
                  className={`exercise-tab${activeTab === cat.id ? " active" : ""}`}
                  onClick={() => setActiveTab(cat.id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}
                >
                  <span><i className={`fas ${cat.icon}`} /> {cat.title}</span>
                  {cat.id === "flashcards" && sm2DueCount > 0 && (
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 800,
                      color: "#fff", background: "#ef4444",
                      borderRadius: "99px", padding: "0.05rem 0.45rem", lineHeight: 1.6,
                    }}>
                      <i className="fas fa-bolt" style={{ fontSize: "0.6rem" }} /> {sm2DueCount} due
                    </span>
                  )}
                  {badge && badge.value !== null && (
                    <span style={{
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      color: activeTab === cat.id ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
                      background: activeTab === cat.id ? "rgba(255,255,255,0.15)" : "var(--border)",
                      borderRadius: "99px",
                      padding: "0.05rem 0.4rem",
                      lineHeight: 1.6,
                    }}>
                      {badge.value === null ? "AI Chat" : `${badge.value} ${badge.label}`}
                    </span>
                  )}
                  {badge && badge.value === null && (
                    <span style={{
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      color: activeTab === cat.id ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
                      background: activeTab === cat.id ? "rgba(255,255,255,0.15)" : "var(--border)",
                      borderRadius: "99px",
                      padding: "0.05rem 0.4rem",
                      lineHeight: 1.6,
                    }}>
                      AI Chat
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ════════════════════════════════
              LOADING BANNER (shared across tabs)
          ════════════════════════════════ */}
          {tabLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.85rem 1.25rem",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "var(--border-radius)",
                marginBottom: "1.5rem",
                color: "var(--primary)",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              <span className="auth-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Generating AI content for you…
            </div>
          )}

          {/* ════════════════════════════════
              AI ERROR BANNER (shared across tabs)
          ════════════════════════════════ */}
          {!tabLoading && tabError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 1.25rem",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "var(--border-radius)",
                marginBottom: "1.5rem",
                color: "#92400e",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <i className="fas fa-exclamation-triangle" style={{ color: "#f59e0b", flexShrink: 0 }} />
                <span>{tabError}</span>
              </div>
              <button
                onClick={() => setTabError("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", padding: "0 0.25rem", fontSize: "0.85rem" }}
                title="Dismiss"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          )}

          {/* ════════════════════════════════
              FLASHCARDS
          ════════════════════════════════ */}
          {activeTab === "flashcards" && (
            <div className="fade-in">
              <div
                className={`flashcard-container${flipped ? " flipped" : ""}`}
                onClick={() => setFlipped((f) => !f)}
              >
                <div className="flashcard-inner">
                  <div className="flashcard-front">
                    <div className="flashcard-word">
                      {FLASHCARDS[cardIdx].word}
                    </div>
                    <div className="flashcard-hint">Click to flip the card</div>
                  </div>
                  <div className="flashcard-back">
                    <div className="flashcard-word">
                      {FLASHCARDS[cardIdx].translation}
                    </div>
                    <div className="flashcard-hint">
                      {FLASHCARDS[cardIdx].example}
                    </div>
                  </div>
                </div>
              </div>
              {/* Celebration overlay when all cards known */}
              {known >= FLASHCARDS.length && (
                <div style={{
                  textAlign: "center",
                  padding: "2rem",
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: "var(--border-radius)",
                  marginBottom: "1rem",
                }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem", color: "var(--secondary)" }}><i className="fas fa-circle-check" /></div>
                  <h3 style={{ color: "var(--secondary)", marginBottom: "0.5rem" }}>You know all {FLASHCARDS.length} words!</h3>
                  <p style={{ color: "var(--gray)", marginBottom: "1rem" }}>Great session — your vocabulary is growing!</p>
                  <button className="btn btn-primary" onClick={() => {
                    setKnown(0); setCardIdx(0); setFlipped(false);
                    setDynamicFlashcards(null);
                    setHardCards(new Set());
                  }}>
                    <i className="fas fa-sync-alt" /> New Set
                  </button>
                </div>
              )}
              {/* SM-2 due count badge */}
              <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(99,102,241,0.1)",
                  color: "#6366f1",
                  borderRadius: "99px",
                  padding: "0.25rem 0.85rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}>
                  <i className="fas fa-clock" /> {sm2DueCount} card{sm2DueCount !== 1 ? "s" : ""} due today
                </span>
              </div>
              <div className="flashcard-controls">
                <button className="btn btn-outline" onClick={prevCard}>
                  <i className="fas fa-arrow-left" /> Previous
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: "#10b981", borderColor: "#10b981" }}
                  onClick={markKnown}
                  disabled={!flipped}
                  title="I knew this — increases interval"
                >
                  <i className="fas fa-check" /> Know it
                </button>
                <button
                  className="btn btn-outline"
                  style={{ borderColor: "#ef4444", color: "#ef4444" }}
                  onClick={markHard}
                  disabled={!flipped}
                  title="Need more practice — resets interval"
                >
                  <i className="fas fa-times" /> Need practice
                </button>
                <button className="btn btn-outline" onClick={nextCard}>
                  Next <i className="fas fa-arrow-right" />
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <p style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
                  Card {cardIdx + 1} of {FLASHCARDS.length} &nbsp;|&nbsp; Known: {known}
                  {!flipped && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>(flip to rate)</span>}
                </p>
                <div
                  className="goal-progress"
                  style={{ maxWidth: 400, margin: "0.75rem auto 0" }}
                >
                  <div
                    className="goal-progress-bar"
                    style={{ width: `${(known / FLASHCARDS.length) * 100}%` }}
                  />
                </div>
              </div>
              {/* Spaced repetition: re-review hard cards */}
              {hardCards.size > 0 && known >= FLASHCARDS.length - hardCards.size && (
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <button className="btn btn-outline" style={{ fontSize: "0.85rem" }} onClick={() => {
                    const hardArr = [...hardCards];
                    setCardIdx(hardArr[0]);
                    setFlipped(false);
                    setHardCards(new Set());
                  }}>
                    <i className="fas fa-redo-alt" /> Review {hardCards.size} Hard Card{hardCards.size > 1 ? "s" : ""}
                  </button>
                </div>
              )}
              {/* New Set button */}
              <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                <button className="btn btn-outline" style={{ fontSize: "0.82rem" }} onClick={() => {
                  setKnown(0); setCardIdx(0); setFlipped(false);
                  setDynamicFlashcards(null);
                  setHardCards(new Set());
                }}>
                  <i className="fas fa-sync-alt" /> New Set
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              LISTENING PRACTICE
          ════════════════════════════════ */}
          {activeTab === "listening" && (
            <div className="fade-in">
              {/* BACKEND INTEGRATION: GET /api/practice/listening?language={lang} */}
              <div className="listening-exercise">
                <h3>Listen to the audio and answer the question</h3>
                <p style={{ color: "var(--gray)", marginBottom: "2rem" }}>
                  This exercise helps improve your listening comprehension
                  skills
                </p>

                <div
                  style={{
                    background: "var(--light)",
                    padding: "1.5rem",
                    borderRadius: "var(--border-radius)",
                    marginBottom: "1rem",
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                    Question: {LISTENING_EXERCISE.question}
                  </p>
                  <p style={{ color: "var(--gray)" }}>
                    {LISTENING_EXERCISE.hint}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {/* Play/Stop button */}
                  <button
                    onClick={playListeningAudio}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.6rem",
                      padding: "0.65rem 1.4rem",
                      borderRadius: 99,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      background: audioPlaying
                        ? "linear-gradient(135deg,#ef4444,#f87171)"
                        : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "white",
                      boxShadow: audioPlaying
                        ? "0 4px 14px rgba(239,68,68,0.35)"
                        : "0 4px 14px rgba(99,102,241,0.35)",
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <i className={`fas ${audioPlaying ? "fa-stop" : "fa-play"}`} style={{ fontSize: "0.75rem" }} />
                    </span>
                    {audioPlaying ? "Stop Audio" : "Play Audio"}
                    {audioPlaying && (
                      <span style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 16 }}>
                        {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                          <span key={i} style={{ width: 3, height: `${h * 100}%`, background: "rgba(255,255,255,0.8)", borderRadius: 2, animation: `soundWave 0.6s ${i * 0.1}s ease-in-out infinite alternate` }} />
                        ))}
                      </span>
                    )}
                  </button>

                  {/* Transcript toggle */}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowTranscript((s) => !s)}
                  >
                    <i className={`fas ${showTranscript ? "fa-eye-slash" : "fa-file-alt"}`} />
                    {showTranscript ? "Hide Transcript" : "Show Transcript"}
                  </button>
                </div>

                {showTranscript && (
                  <div
                    style={{
                      background: "var(--light)",
                      padding: "1.5rem",
                      borderRadius: "var(--border-radius)",
                      marginBottom: "1.5rem",
                      lineHeight: 1.8,
                    }}
                  >
                    <h4 style={{ marginBottom: "0.75rem" }}>Transcript</h4>
                    {LISTENING_EXERCISE.transcript.map((line, i) => (
                      <p key={i}>
                        <strong>{line.speaker}:</strong> {line.line}
                      </p>
                    ))}
                  </div>
                )}

                <h4 style={{ marginBottom: "1rem" }}>Select your answer:</h4>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {LISTENING_EXERCISE.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`test-option${listeningAnswer === i ? " selected" : ""}`}
                      onClick={() => {
                        setListeningAnswer(i);
                        setListeningResult("");
                      }}
                    >
                      <div className="option-letter">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div>{opt}</div>
                    </div>
                  ))}
                </div>

                {listeningResult && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      borderRadius: "var(--border-radius)",
                      background: listeningResult.startsWith("✓")
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(239,68,68,0.08)",
                      color: listeningResult.startsWith("✓")
                        ? "var(--secondary-dark)"
                        : "var(--danger)",
                      fontWeight: 600,
                    }}
                  >
                    {listeningResult}
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-primary"
                    onClick={checkListeningAnswer}
                    disabled={listeningAnswer === null || !!listeningResult}
                  >
                    <i className="fas fa-check-circle" /> Check Answer
                  </button>
                  {listeningResult && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setListeningAnswer(null);
                        setListeningResult("");
                        setShowTranscript(false);
                        setAudioPlaying(false);
                        window.speechSynthesis.cancel();
                        setDynamicListening(null); // triggers fresh AI exercise
                      }}
                    >
                      <i className="fas fa-sync-alt" /> New Exercise
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              WRITING PRACTICE
          ════════════════════════════════ */}
          {activeTab === "writing" && (
            <div className="fade-in">
              <div className="writing-prompt">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>Writing Prompt</h3>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", flexShrink: 0 }}
                    onClick={() => {
                      setDynamicWritingPrompt(null);
                      setWritingText("");
                      setWritingFeedback("");
                      setWritingScore(null);
                      setGrammarInline("");
                      setVocabInline("");
                    }}
                  >
                    <i className="fas fa-sync-alt" /> New Prompt
                  </button>
                </div>
                <p>{writingPrompt}</p>
                <p style={{ color: "var(--gray)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                  <i className="fas fa-lightbulb" /> Tip: Try to use time expressions and transition words in {lang}.
                </p>
              </div>
              <textarea
                className="writing-area"
                placeholder="Start writing here… AI will provide feedback on grammar, vocabulary, and structure"
                value={writingText}
                onChange={(e) => {
                  setWritingText(e.target.value);
                  setGrammarInline("");
                  setVocabInline("");
                }}
              />
              <div className="writing-tools">
                <button className="tool-btn" onClick={checkGrammarInline} disabled={grammarCheckLoading}>
                  {grammarCheckLoading
                    ? <><span className="auth-spinner" style={{ width: 12, height: 12, borderWidth: 2, marginRight: "0.4rem" }} />Checking…</>
                    : <><i className="fas fa-spell-check" /> Check Grammar</>
                  }
                </button>
                <button className="tool-btn" onClick={checkVocabInline}>
                  <i className="fas fa-book" /> Vocabulary Help
                </button>
                <button className="tool-btn" onClick={countWords}>
                  <i className="fas fa-calculator" /> Count Words{" "}
                  {wordCount > 0 ? `(${wordCount})` : ""}
                </button>
                <button
                  className="tool-btn"
                  onClick={() => {
                    setWritingText("");
                    setWordCount(0);
                    setWritingFeedback("");
                    setGrammarInline("");
                    setVocabInline("");
                  }}
                >
                  <i className="fas fa-trash" /> Clear
                </button>
              </div>
              {grammarInline && (
                <div
                  style={{
                    margin: "0.75rem 0",
                    padding: "0.85rem 1rem",
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    borderRadius: "var(--border-radius)",
                    color: "var(--secondary-dark)",
                    fontSize: "0.9rem",
                  }}
                >
                  {grammarInline}
                </div>
              )}
              {vocabInline && (
                <div
                  style={{
                    margin: "0.75rem 0",
                    padding: "0.85rem 1rem",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: "var(--border-radius)",
                    color: "var(--primary)",
                    fontSize: "0.9rem",
                  }}
                >
                  {vocabInline}
                </div>
              )}
              <button
                className="btn btn-primary"
                style={{ marginTop: "1.5rem", width: "100%" }}
                onClick={submitWriting}
                disabled={!writingText.trim() || writingLoading}
              >
                {writingLoading ? (
                  <><span className="auth-spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: "0.5rem" }} /> Analysing…</>
                ) : (
                  <><i className="fas fa-robot" /> Get AI Feedback</>
                )}
              </button>
              {writingFeedback && (
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1.5rem",
                    background: "var(--light)",
                    borderRadius: "var(--border-radius)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h4 style={{ margin: 0 }}>
                      <i
                        className="fas fa-robot"
                        style={{ color: "var(--primary)", marginRight: "0.5rem" }}
                      />
                      AI Feedback
                    </h4>
                    {writingScore !== null && (
                      <span style={{ fontWeight: 700, fontSize: "1.1rem", color: writingScore >= 7 ? "var(--secondary)" : writingScore >= 5 ? "var(--accent)" : "var(--danger)" }}>
                        {writingScore}/10
                      </span>
                    )}
                  </div>
                  <p style={{ lineHeight: 1.7 }}>{writingFeedback}</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════
              SPEAKING DRILLS (PRONUNCIATION)
          ════════════════════════════════ */}
          {activeTab === "speaking" && (
            <div className="fade-in">
              {/* BACKEND INTEGRATION: GET /api/practice/speaking/phrases?language={lang} */}
              <div className="listening-exercise">
                <h3>Pronunciation Practice</h3>
                <p style={{ color: "var(--gray)", marginBottom: "2rem" }}>
                  Repeat the phrase after the native speaker, then record
                  yourself
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--gray)" }}>
                    Phrase {phraseIdx + 1} of {SPEAKING_PHRASES.length}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn btn-outline"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.82rem",
                      }}
                      onClick={prevPhrase}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.82rem",
                      }}
                      onClick={nextPhrase}
                    >
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--light)",
                    padding: "2rem",
                    borderRadius: "var(--border-radius)",
                    marginBottom: "2rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      marginBottom: "1.25rem",
                      color: "var(--primary)",
                    }}
                  >
                    {SPEAKING_PHRASES[phraseIdx].text}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      className={`btn ${examplePlaying ? "btn-primary" : "btn-outline"}`}
                      onClick={playExample}
                      disabled={recording}
                    >
                      <i
                        className={`fas ${examplePlaying ? "fa-stop" : "fa-volume-up"}`}
                      />
                      {examplePlaying ? " Stop" : " Hear Example"}
                    </button>
                    <span style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
                      <i className="fas fa-clock" />{" "}
                      {SPEAKING_PHRASES[phraseIdx].durationSec} seconds
                    </span>
                  </div>
                </div>

                {micError && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: "10px",
                      padding: "0.875rem 1rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      color: "var(--danger)",
                      fontSize: "0.88rem",
                    }}
                  >
                    <i
                      className="fas fa-exclamation-triangle"
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                    {micError}
                  </div>
                )}

                <div className="recording-section">
                  <div
                    className="recording-visualizer"
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "3px",
                      padding: "0 1rem",
                    }}
                  >
                    {recording ? (
                      Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          ref={(el) => (barsRef.current[i] = el)}
                          className="visualizer-bar"
                          style={{ height: "4px" }}
                        />
                      ))
                    ) : (
                      <span
                        style={{
                          margin: "auto",
                          color: "var(--gray)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {audioURL
                          ? "✓ Recording saved — ready to analyze"
                          : "Click the mic to start recording"}
                      </span>
                    )}
                  </div>
                  <div className="timer-display">{fmt(recTime)}</div>
                  <div className="recording-controls">
                    <button
                      className={`record-btn${recording ? " recording" : ""}`}
                      onClick={toggleRecording}
                      title={recording ? "Stop recording" : "Start recording"}
                    >
                      <i
                        className={`fas ${recording ? "fa-stop" : "fa-microphone"}`}
                      />
                    </button>
                  </div>
                  <p
                    style={{
                      color: "var(--gray)",
                      marginTop: "1rem",
                      textAlign: "center",
                    }}
                  >
                    {recording
                      ? "Recording… Click stop when done."
                      : audioURL
                        ? "Recording saved. Play it back or analyze your pronunciation."
                        : "Record your pronunciation. Try to match the intonation and rhythm."}
                  </p>
                </div>

                {audioURL && !recording && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "var(--light)",
                      borderRadius: "var(--border-radius)",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <i
                      className="fas fa-headphones"
                      style={{ color: "var(--primary)" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      Your recording:
                    </span>
                    <audio
                      controls
                      src={audioURL}
                      style={{ flex: 1, minWidth: 200, height: 36 }}
                    />
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ marginTop: "1.5rem", width: "100%" }}
                  onClick={analyzeRecording}
                  disabled={!audioBlob || recording}
                >
                  <i className="fas fa-chart-line" />
                  {audioBlob
                    ? " Analyze Pronunciation"
                    : " Record first to analyze"}
                </button>

                {uploading && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "rgba(99,102,241,0.1)",
                      borderRadius: "var(--border-radius)",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ color: "#6366f1", fontWeight: 600 }}>
                      {uploadProgress || "Processing..."}
                    </div>
                    {processingStatus && (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--gray)",
                          marginTop: "0.5rem",
                        }}
                      >
                        {processingStatus}
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "rgba(239,68,68,0.1)",
                      borderRadius: "var(--border-radius)",
                      marginBottom: "1rem",
                      color: "#ef4444",
                    }}
                  >
                    <i className="fas fa-triangle-exclamation" style={{ marginRight: 5 }} />{uploadError}
                  </div>
                )}

                {showPronFeedback && (
                  <div
                    style={{
                      marginTop: "2rem",
                      padding: "1.5rem",
                      background: "var(--light)",
                      borderRadius: "var(--border-radius)",
                    }}
                  >
                    <h4 style={{ marginBottom: "1rem" }}>
                      Pronunciation Analysis
                    </h4>
                    {feedbackData ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "1rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "2rem",
                              fontWeight: 700,
                              color: (feedbackData.score ?? feedbackData.overall_score ?? 0) >= 75
                                ? "var(--secondary)"
                                : (feedbackData.score ?? feedbackData.overall_score ?? 0) >= 50
                                  ? "var(--accent)"
                                  : "var(--danger)",
                            }}
                          >
                            {feedbackData.score ?? feedbackData.overall_score ?? "—"}%
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {(feedbackData.score ?? feedbackData.overall_score ?? 0) >= 75
                                ? "Great job!"
                                : (feedbackData.score ?? feedbackData.overall_score ?? 0) >= 50
                                  ? "Good effort!"
                                  : "Keep practising!"}
                            </div>
                            <div style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
                              {feedbackData.feedback || "Your recording has been processed."}
                            </div>
                          </div>
                        </div>
                        {(feedbackData.strengths || feedbackData.improvements) && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                              gap: "1rem",
                            }}
                          >
                            {feedbackData.strengths?.map((s, i) => (
                              <div key={i} style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "var(--border-radius)", border: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 600, color: "var(--secondary)" }}>✓ Good</div>
                                <div style={{ fontSize: "0.9rem", color: "var(--gray)" }}>{s}</div>
                              </div>
                            ))}
                            {feedbackData.improvements?.map((s, i) => (
                              <div key={i} style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "var(--border-radius)", border: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 600, color: "var(--accent)" }}>⚠ Needs Work</div>
                                <div style={{ fontSize: "0.9rem", color: "var(--gray)" }}>{s}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      /* No detailed data — show the generic summary */
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--secondary)" }}>✓</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>Recording saved</div>
                          <div style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
                            Your audio has been uploaded and will be analysed shortly.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              READING PRACTICE
          ════════════════════════════════ */}
          {activeTab === "reading" && (
            <div className="fade-in">
              {/* BACKEND INTEGRATION: GET /api/practice/reading?language={lang} */}
              <div className="listening-exercise">
                <h3>Reading Comprehension</h3>
                <p style={{ color: "var(--gray)", marginBottom: "2rem" }}>
                  Read the passage and answer the questions that follow
                </p>
                <div className="reading-passage">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", gap: "1rem", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0 }}>{READING.title}</h3>
                    <button
                      className={`btn ${readingTTSPlaying ? "btn-primary" : "btn-outline"}`}
                      style={{ fontSize: "0.82rem", padding: "0.3rem 0.8rem" }}
                      onClick={playReadingPassage}
                    >
                      <i className={`fas ${readingTTSPlaying ? "fa-stop" : "fa-volume-up"}`} />
                      {readingTTSPlaying ? " Stop" : " Listen"}
                    </button>
                  </div>
                  {READING.passage.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                <div className="reading-vocab">
                  <h4>Vocabulary from the text:</h4>
                  {READING.vocab.map(([w, d]) => (
                    <div key={w} className="vocab-item">
                      <span>
                        <strong>{w}</strong>
                      </span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
                <h4 style={{ marginBottom: "1.5rem" }}>
                  Comprehension Questions:
                </h4>
                <div style={{ display: "grid", gap: "1.5rem" }}>
                  {READING.questions.map((rq, qi) => (
                    <div key={qi} className="grammar-question">
                      <h4>{rq.q}</h4>
                      <div className="grammar-options">
                        {rq.options.map((opt, oi) => {
                          let cls = "grammar-option";
                          if (readingChecked) {
                            if (oi === rq.correct) cls += " correct";
                            else if (readingAnswers[qi] === oi) cls += " wrong";
                          } else if (readingAnswers[qi] === oi)
                            cls += " selected";
                          return (
                            <div
                              key={oi}
                              className={cls}
                              onClick={() => setReadingAnswer(qi, oi)}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {readingChecked && (
                        <div
                          className={`grammar-feedback ${readingAnswers[qi] === rq.correct ? "correct" : "wrong"}`}
                        >
                          {readingAnswers[qi] === rq.correct
                            ? "✓ Correct!"
                            : `✗ Incorrect. The correct answer is: ${rq.options[rq.correct]}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!readingChecked && (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: "2rem", width: "100%" }}
                    onClick={checkReadingAnswers}
                  >
                    <i className="fas fa-check-circle" /> Check All Answers
                  </button>
                )}
                {readingChecked && (
                  <div className="grammar-summary">
                    <h4>
                      Results:{" "}
                      {
                        Object.keys(readingAnswers).filter(
                          (k) =>
                            readingAnswers[Number(k)] ===
                            READING.questions[Number(k)].correct,
                        ).length
                      }{" "}
                      / {READING.questions.length} correct
                    </h4>
                    <button
                      className="btn btn-outline"
                      style={{ marginTop: "1rem" }}
                      onClick={() => {
                        setReadingAnswers({});
                        setReadingChecked(false);
                        setDynamicReading(null); // triggers fresh AI passage on next render
                      }}
                    >
                      Try Again (New Passage)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              GRAMMAR PRACTICE
          ════════════════════════════════ */}
          {activeTab === "grammar" && (
            <div className="fade-in">
              {/* BACKEND INTEGRATION: GET /api/practice/grammar?language={lang} */}
              <div className="listening-exercise">
                <h3>Grammar Practice</h3>
                <p style={{ color: "var(--gray)", marginBottom: "2rem" }}>
                  Test your grammar knowledge with these interactive exercises
                </p>
                {GRAMMAR_EXERCISES.map((ex, ei) => (
                  <div key={ei} style={{ marginBottom: "2rem" }}>
                    <h4>{ex.title}</h4>
                    <div
                      className="grammar-question"
                      style={{ marginTop: "0.75rem" }}
                    >
                      <h4>{ex.question}</h4>
                      <p style={{ margin: "1rem 0", fontSize: "1.1rem" }}>
                        {ex.sentence}
                      </p>
                      <div className="grammar-options">
                        {ex.options.map((opt, oi) => {
                          let cls = "grammar-option";
                          if (grammarChecked) {
                            if (oi === ex.correct) cls += " correct";
                            else if (grammarAnswers[ei] === oi) cls += " wrong";
                          } else if (grammarAnswers[ei] === oi)
                            cls += " selected";
                          return (
                            <div
                              key={oi}
                              className={cls}
                              onClick={() => setGrammarAnswer(ei, oi)}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {grammarChecked && (
                        <div
                          className={`grammar-feedback ${grammarAnswers[ei] === ex.correct ? "correct" : "wrong"}`}
                        >
                          {grammarAnswers[ei] === ex.correct
                            ? `✓ ${ex.explanation}`
                            : `✗ Incorrect. ${ex.explanation}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!grammarChecked ? (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: "1rem", width: "100%" }}
                    onClick={checkGrammarAnswers}
                  >
                    <i className="fas fa-check-double" /> Check All Answers
                  </button>
                ) : (
                  <div className="grammar-summary">
                    <h4>Grammar Exercise Summary</h4>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        margin: "1rem 0",
                        fontWeight: 700,
                      }}
                    >
                      Score: {grammarScore} / {GRAMMAR_EXERCISES.length}
                    </div>
                    <p style={{ color: "var(--gray)" }}>
                      {grammarScore === GRAMMAR_EXERCISES.length
                        ? "Perfect! Excellent work!"
                        : grammarScore >= 3
                          ? "Great job! Keep practising."
                          : "Keep practising — you'll get there!"}
                    </p>
                    <button
                      className="btn btn-outline"
                      style={{ marginTop: "1rem" }}
                      onClick={() => {
                        setGrammarAnswers({});
                        setGrammarChecked(false);
                        setGrammarScore(0);
                        setDynamicGrammar(null); // triggers fresh AI fetch on next render
                      }}
                    >
                      Try Again (New Questions)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ════════════════════════════════
              PRONUNCIATION
          ════════════════════════════════ */}
          {activeTab === "pronunciation" && (
            <div className="fade-in">
              <PronunciationStep level={practiceLevel} />
            </div>
          )}

          {/* ════════════════════════════════
              SESSION SUMMARY (dismissable)
          ════════════════════════════════ */}
          {sessionSummary && (
            <div
              style={{
                margin: "1.5rem 0",
                padding: "1.25rem 1.5rem",
                background: sessionSummary.score / sessionSummary.total >= 0.7
                  ? "rgba(16,185,129,0.08)"
                  : "rgba(99,102,241,0.08)",
                border: `1px solid ${sessionSummary.score / sessionSummary.total >= 0.7 ? "rgba(16,185,129,0.25)" : "rgba(99,102,241,0.2)"}`,
                borderRadius: "var(--border-radius)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem", color: "var(--accent)" }}>
                  <i className={`fas ${sessionSummary.score / sessionSummary.total >= 0.8 ? "fa-trophy" : sessionSummary.score / sessionSummary.total >= 0.5 ? "fa-thumbs-up" : "fa-dumbbell"}`} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {sessionSummary.type} Session Complete
                  </div>
                  <div style={{ color: "var(--gray)", fontSize: "0.88rem" }}>
                    Score: {sessionSummary.score}/{sessionSummary.total} ({Math.round((sessionSummary.score / sessionSummary.total) * 100)}%)
                    &nbsp;·&nbsp;
                    {sessionSummary.score / sessionSummary.total >= 0.8
                      ? "Excellent work!"
                      : sessionSummary.score / sessionSummary.total >= 0.5
                        ? "Good effort, keep going!"
                        : "Keep practising — you'll improve!"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSessionSummary(null)}
                style={{ background: "none", border: "none", color: "var(--gray)", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}
                title="Dismiss"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          )}

          {/* ════════════════════════════════
              TALK WITH AI TUTOR
          ════════════════════════════════ */}
          {activeTab === "tutor" && (
            <div className="fade-in">
              <div className="listening-exercise">
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>Talk with your AI Tutor</h3>
                  {tutorSpeaking && (
                    <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <i className="fas fa-volume-up" /> Speaking…
                    </span>
                  )}
                </div>
                <p style={{ color: "var(--gray)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                  Level: <strong>{practiceLevel}</strong> · Language: <strong>{lang}</strong> · Mistakes are corrected gently as you go
                </p>

                {/* Chat window */}
                <div
                  ref={chatContainerRef}
                  style={{
                    height: "420px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                    padding: "1rem",
                    background: "var(--light)",
                    borderRadius: "var(--border-radius)",
                    marginBottom: "1.25rem",
                  }}
                >
                  {tutorMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                        gap: "0.4rem",
                      }}
                    >
                      {/* Bubble */}
                      <div
                        style={{
                          maxWidth: "78%",
                          padding: "0.75rem 1rem",
                          borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: msg.role === "user" ? "var(--primary)" : "var(--bg-card)",
                          color: msg.role === "user" ? "#fff" : "var(--text)",
                          border: msg.role === "user" ? "none" : "1px solid var(--border)",
                          fontSize: "0.95rem",
                          lineHeight: 1.55,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                        }}
                      >
                        {msg.role === "assistant" && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", display: "block", marginBottom: "0.3rem" }}>
                            <i className="fas fa-robot" /> AI Tutor
                          </span>
                        )}
                        {msg.content}
                        {/* Blinking cursor while streaming */}
                        {msg.streaming && (
                          <span style={{
                            display: "inline-block",
                            width: "2px",
                            height: "1em",
                            background: "var(--primary)",
                            marginLeft: "2px",
                            verticalAlign: "text-bottom",
                            animation: "blink 0.8s step-end infinite",
                          }} />
                        )}
                      </div>

                      {/* Voice transcript cue */}
                      {msg.role === "user" && msg.via === "voice" && (
                        <div
                          title="This is what we heard from your voice. If a word looks wrong, the transcription misheard it."
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            marginTop: "0.25rem",
                            opacity: 0.8,
                          }}
                        >
                          <i className="fas fa-microphone" style={{ marginRight: "0.3rem" }} />
                          transcribed from your voice
                        </div>
                      )}

                      {/* Correction chip */}
                      {msg.correction && (
                        <div
                          style={{
                            maxWidth: "78%",
                            padding: "0.5rem 0.85rem",
                            borderRadius: "10px",
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "#ef4444",
                            fontSize: "0.83rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <i className="fas fa-pencil-alt" />
                          <span><strong>Correction:</strong> {msg.correction}</span>
                        </div>
                      )}

                      {/* Vocab tip chip */}
                      {msg.vocab_tip && (
                        <div
                          style={{
                            maxWidth: "78%",
                            padding: "0.5rem 0.85rem",
                            borderRadius: "10px",
                            background: "rgba(99,102,241,0.08)",
                            border: "1px solid rgba(99,102,241,0.25)",
                            color: "var(--primary)",
                            fontSize: "0.83rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <i className="fas fa-lightbulb" />
                          <span>{msg.vocab_tip}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Thinking indicator — only show before first streaming token arrives */}
                  {tutorLoading && !tutorMessages[tutorMessages.length - 1]?.streaming && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                      <div
                        style={{
                          padding: "0.75rem 1rem",
                          borderRadius: "18px 18px 18px 4px",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          color: "var(--gray)",
                          fontSize: "0.88rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span className="auth-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        Tutor is thinking…
                      </div>
                    </div>
                  )}
                </div>

                {/* Error bar */}
                {tutorError && (
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--border-radius)",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444",
                      fontSize: "0.88rem",
                    }}
                  >
                    <i className="fas fa-exclamation-circle" /> {tutorError}
                  </div>
                )}

                {/* Suggested reply chips (beginners A1/A2) */}
                {["A1", "A2"].includes(practiceLevel) && tutorSuggestions.length > 0 && !tutorLoading && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                    {tutorSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { setTutorSuggestions([]); sendTutorChat(s); }}
                        style={{ border: "1.5px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.07)", color: "#4f46e5", borderRadius: 99, padding: "0.4rem 0.85rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mistake recap → flashcards */}
                {tutorCorrections.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem", padding: "0.55rem 0.85rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-base)", flex: 1 }}>
                      <i className="fas fa-clipboard-check" style={{ color: "#f59e0b", marginRight: "0.4rem" }} />
                      {recapSaved
                        ? `Saved! Review them in Flashcards.`
                        : `You've made ${tutorCorrections.length} correction${tutorCorrections.length === 1 ? "" : "s"} this chat.`}
                    </span>
                    {!recapSaved && (
                      <button onClick={saveMistakesAsFlashcards}
                        style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "0.4rem 0.85rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        <i className="fas fa-layer-group" /> Save as flashcards
                      </button>
                    )}
                  </div>
                )}

                {/* Voice loop toggle */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.6rem", padding:"0.45rem 0.75rem", background:"rgba(99,102,241,0.05)", border:"1px solid rgba(99,102,241,0.12)", borderRadius:"10px" }}>
                  <span style={{ fontSize:"0.8rem", fontWeight:600, color:"var(--text-base)", display:"flex", alignItems:"center", gap:"0.4rem" }}>
                    <i className="fas fa-infinity" style={{ color:"#6366f1" }} />
                    Auto voice loop
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", fontWeight:400 }}>
                      — mic restarts after AI speaks
                    </span>
                  </span>
                  <button
                    onClick={toggleTutorVoiceLoop}
                    style={{ position:"relative", width:42, height:22, background: tutorVoiceLoop ? "#6366f1" : "#cbd5e1", borderRadius:"99px", border:"none", cursor:"pointer", transition:"background .25s", flexShrink:0 }}
                  >
                    <span style={{ position:"absolute", top:3, left: tutorVoiceLoop ? 23 : 3, width:16, height:16, background:"#fff", borderRadius:"50%", transition:"left .25s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }} />
                  </button>
                </div>

                {/* Transcribing banner */}
                {tutorTranscribing && (
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.5rem 0.75rem", background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:"10px", marginBottom:"0.5rem", fontSize:"0.82rem", color:"#7c3aed", fontWeight:600 }}>
                    <span className="auth-spinner" style={{ width:12, height:12, borderWidth:2, borderColor:"rgba(124,58,237,0.3)", borderTopColor:"#7c3aed" }} />
                    Transcribing your voice…
                  </div>
                )}

                {/* Input area */}
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
                  <textarea
                    rows={2}
                    placeholder={tutorListening ? "Listening… tap mic to send" : tutorTranscribing ? "Transcribing…" : "Type your message or use the mic…"}
                    value={tutorListening || tutorTranscribing ? "" : tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendTutorChat();
                      }
                    }}
                    disabled={tutorLoading || tutorListening || tutorTranscribing}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      borderRadius: "14px",
                      border: "1.5px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text)",
                      fontSize: "0.95rem",
                      resize: "none",
                      outline: "none",
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                    }}
                  />

                  {/* Mic button */}
                  <button
                    onClick={startVoiceInput}
                    disabled={tutorLoading || tutorTranscribing}
                    title={tutorListening ? "Tap to stop" : "Speak your message"}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      border: "none",
                      background: tutorListening ? "#ef4444" : "rgba(99,102,241,0.12)",
                      color: tutorListening ? "#fff" : "var(--primary)",
                      cursor: tutorLoading || tutorTranscribing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      flexShrink: 0,
                      transition: "background 0.2s",
                      animation: tutorListening ? "sp-pulse 1.2s infinite" : "none",
                    }}
                  >
                    <i className={`fas ${tutorListening ? "fa-stop" : "fa-microphone"}`} />
                  </button>

                  {/* Send button */}
                  <button
                    onClick={() => sendTutorChat()}
                    disabled={tutorLoading || tutorListening || !tutorInput.trim()}
                    title="Send message"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      border: "none",
                      background: tutorInput.trim() && !tutorLoading ? "var(--primary)" : "var(--border)",
                      color: "#fff",
                      cursor: tutorInput.trim() && !tutorLoading ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    <i className="fas fa-paper-plane" />
                  </button>
                </div>

                <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--gray)", textAlign: "center" }}>
                  Press <kbd style={{ background: "var(--light)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontSize: "0.78rem" }}>Enter</kbd> to send · <kbd style={{ background: "var(--light)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontSize: "0.78rem" }}>Shift+Enter</kbd> for new line · or use the <i className="fas fa-microphone" /> mic
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
