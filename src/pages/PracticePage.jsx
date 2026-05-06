import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  logPracticeSession,
  createSession,
  uploadAudio,
  getJobStatus,
} from "../services/api";
import { formatErrorForDisplay, logError } from "../utils/errorHandler";
import { getContent } from "../data/practiceContent";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const fmt = (s) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function speakTTS(text, lang, onStart, onEnd) {
  // BACKEND INTEGRATION: Replace with pre-recorded audioUrl from API
  // const audio = new Audio(phrase.audioUrl); audio.play()
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();

  const doSpeak = () => {
    const utt = new SpeechSynthesisUtterance(text.replace(/"/g, ""));
    utt.lang = lang || "en-US";
    utt.rate = 0.88;
    utt.pitch = 1;
    utt.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    // Pick a voice matching the language, then fall back gracefully
    const v =
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ||
      voices[0];
    if (v) utt.voice = v;
    utt.onstart = () => onStart?.();
    utt.onend = () => onEnd?.();
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

const CATEGORIES = [
  {
    id: "flashcards",
    icon: "fa-layer-group",
    title: "Flashcards",
    desc: "Learn and review vocabulary with smart flashcards that adapt to your progress",
    s1: "42",
    l1: "Words Mastered",
    s2: "7",
    l2: "Day Streak",
  },
  {
    id: "listening",
    icon: "fa-headphones",
    title: "Listening Practice",
    desc: "Improve your listening comprehension with real conversations and audio exercises",
    s1: "78%",
    l1: "Accuracy",
    s2: "15",
    l2: "Exercises",
  },
  {
    id: "writing",
    icon: "fa-pen",
    title: "Writing Practice",
    desc: "Get instant AI feedback on your writing with grammar and style corrections",
    s1: "8.5",
    l1: "Avg. Score",
    s2: "23",
    l2: "Submissions",
  },
  {
    id: "speaking",
    icon: "fa-microphone",
    title: "Speaking Drills",
    desc: "Practice pronunciation and speaking with AI-powered conversation partners",
    s1: "45",
    l1: "Minutes",
    s2: "82%",
    l2: "Fluency",
  },
  {
    id: "reading",
    icon: "fa-book-open",
    title: "Reading Practice",
    desc: "Improve reading comprehension with authentic texts and vocabulary exercises",
    s1: "145",
    l1: "WPM",
    s2: "12",
    l2: "Articles",
  },
  {
    id: "grammar",
    icon: "fa-check-double",
    title: "Grammar Practice",
    desc: "Master grammar rules with interactive exercises and instant feedback",
    s1: "92%",
    l1: "Accuracy",
    s2: "28",
    l2: "Exercises",
  },
];

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const { user, updateUser } = useAuth();

  // Award minutes and update user stats after a completed practice session
  // 👉 BACKEND: logPracticeSession() calls POST /api/practice/session when backend is ready
  const awardPracticeMinutes = async (type, minutes = 5) => {
    const newTotal = (user?.totalMinutes || 0) + minutes;
    try {
      await updateUser({ totalMinutes: newTotal });
      await logPracticeSession({
        type,
        language: content?.language || "en",
        durationMinutes: minutes,
        score: 7,
      });
    } catch (_) {
      /* non-critical — don't block UI */
    }
  };

  // Get content for the user's chosen language (falls back to English)
  // BACKEND INTEGRATION: Replace getContent() with API calls per tab
  const lang = user?.preferredLanguage || "English";
  const content = getContent(lang);
  const ttsLang = content.ttsLang;

  const FLASHCARDS = content.flashcards;
  const GRAMMAR_EXERCISES = content.grammar;
  const READING = content.reading;
  const SPEAKING_PHRASES = content.speakingPhrases;
  const LISTENING_EXERCISE = content.listening;

  const [activeTab, setActiveTab] = useState("flashcards");

  // ── Flashcard state ──
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

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

  const timerRef = useRef(null);
  const barsRef = useRef([]);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

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
  }, [lang]);

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

  // ── Flashcard handlers ────────────────────────────────────────────────────
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
    nextCard();
  };

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
    // 👉 Log completed session and update user stats
    awardPracticeMinutes("grammar", score * 2);
  };

  // ── Reading handlers ──────────────────────────────────────────────────────
  const setReadingAnswer = (idx, ans) => {
    if (!readingChecked) setReadingAnswers((a) => ({ ...a, [idx]: ans }));
  };
  const checkReadingAnswers = () => setReadingChecked(true);

  // ── Writing handlers ──────────────────────────────────────────────────────
  const countWords = () => {
    const wc = writingText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    return wc;
  };
  const checkGrammarInline = () => {
    if (!writingText.trim()) {
      setGrammarInline("Please write something first.");
      return;
    }
    setGrammarInline(
      "✓ Grammar looks good! No major errors found. Watch out for article usage.",
    );
    setVocabInline("");
  };
  const checkVocabInline = () => {
    if (!writingText.trim()) {
      setVocabInline("Please write something first.");
      return;
    }
    const suggestions =
      content.writingVocab?.join('", "') ||
      "additionally, furthermore, however";
    setVocabInline(`💡 Suggestions: try "${suggestions}" for variety.`);
    setGrammarInline("");
  };
  const submitWriting = () => {
    const wc = writingText.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 10) {
      setWritingFeedback("⚠ Please write at least 10 words before submitting.");
      return;
    }
    setWordCount(wc);
    setWritingFeedback(
      `Great effort! Your paragraph has ${wc} words. Grammar is mostly correct. ` +
        `Try to vary your sentence structure and include transition words. ` +
        `Overall score: ${Math.min(10, Math.max(6, Math.round(wc / 10)))}/10`,
    );
    setGrammarInline("");
    setVocabInline("");
    awardPracticeMinutes(
      "writing",
      Math.max(3, Math.min(10, Math.floor(wc / 20))),
    );
  };

  // ── Listening handlers ────────────────────────────────────────────────────
  const playListeningAudio = () => {
    if (audioPlaying) {
      window.speechSynthesis.cancel();
      setAudioPlaying(false);
      return;
    }
    const fullText = LISTENING_EXERCISE.transcript
      .map((l) => `${l.speaker}: ${l.line}`)
      .join(". ");
    speakTTS(
      fullText,
      ttsLang,
      () => setAudioPlaying(true),
      () => setAudioPlaying(false),
    );
  };
  const checkListeningAnswer = () => {
    if (listeningAnswer === null) return;
    const correct = listeningAnswer === LISTENING_EXERCISE.correct;
    setListeningResult(
      correct
        ? `✓ Correct! ${LISTENING_EXERCISE.options[LISTENING_EXERCISE.correct]}`
        : `✗ Incorrect. The correct answer is: ${LISTENING_EXERCISE.options[LISTENING_EXERCISE.correct]}`,
    );
    awardPracticeMinutes("listening", 5);
  };

  // ── Speaking/pronunciation handlers ──────────────────────────────────────
  const playExample = () => {
    const phrase = SPEAKING_PHRASES[phraseIdx];
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

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div id="practice-page">
      <div className="container">
        {/* Language indicator */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <span
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "#6366f1",
              padding: "0.4rem 1.2rem",
              borderRadius: "99px",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            📚 Practicing: {lang}
          </span>
        </div>

        {/* ── CATEGORY CARDS ── */}
        <div className="practice-categories">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`practice-category${activeTab === cat.id ? " active-cat" : ""}`}
              onClick={() => setActiveTab(cat.id)}
            >
              <div className="practice-icon">
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
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`exercise-tab${activeTab === cat.id ? " active" : ""}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <i className={`fas ${cat.icon}`} /> {cat.title}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════
              FLASHCARDS
          ════════════════════════════════ */}
          {activeTab === "flashcards" && (
            <div className="fade-in">
              {/* BACKEND INTEGRATION: GET /api/practice/flashcards?language={lang} */}
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
              <div className="flashcard-controls">
                <button className="btn btn-outline" onClick={prevCard}>
                  <i className="fas fa-arrow-left" /> Previous
                </button>
                <button className="btn btn-primary" onClick={markKnown}>
                  <i className="fas fa-check" /> I Know This
                </button>
                <button className="btn btn-outline" onClick={nextCard}>
                  Next <i className="fas fa-arrow-right" />
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <p>
                  Card {cardIdx + 1} of {FLASHCARDS.length} | Known: {known}
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

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    className={`btn ${audioPlaying ? "btn-primary" : "btn-outline"}`}
                    onClick={playListeningAudio}
                  >
                    <i
                      className={`fas ${audioPlaying ? "fa-stop" : "fa-play"}`}
                    />
                    {audioPlaying ? " Stop" : " Play Audio"}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowTranscript((s) => !s)}
                  >
                    <i
                      className={`fas ${showTranscript ? "fa-eye-slash" : "fa-eye"}`}
                    />
                    {showTranscript ? " Hide Transcript" : " Show Transcript"}
                  </button>
                  {audioPlaying && (
                    <span
                      style={{
                        color: "var(--primary)",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <i className="fas fa-volume-up" /> Playing…
                    </span>
                  )}
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

                <button
                  className="btn btn-primary"
                  style={{ marginTop: "1.5rem" }}
                  onClick={checkListeningAnswer}
                  disabled={listeningAnswer === null}
                >
                  <i className="fas fa-check-circle" /> Check Answer
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              WRITING PRACTICE
          ════════════════════════════════ */}
          {activeTab === "writing" && (
            <div className="fade-in">
              {/* BACKEND INTEGRATION: GET /api/practice/writing/prompt?language={lang} */}
              <div className="writing-prompt">
                <h3>Writing Prompt</h3>
                <p>{content.writingPrompt}</p>
                <p
                  style={{
                    color: "var(--gray)",
                    fontSize: "0.9rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <i className="fas fa-lightbulb" /> Tip: Try to use time
                  expressions and transition words in {lang}.
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
                <button className="tool-btn" onClick={checkGrammarInline}>
                  <i className="fas fa-spell-check" /> Check Grammar
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
                disabled={!writingText.trim()}
              >
                <i className="fas fa-robot" /> Get AI Feedback
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
                  <h4 style={{ marginBottom: "0.75rem" }}>
                    <i
                      className="fas fa-robot"
                      style={{ color: "var(--primary)", marginRight: "0.5rem" }}
                    />
                    AI Feedback
                  </h4>
                  <p>{writingFeedback}</p>
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
                    ⚠️ {uploadError}
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
                    {/* BACKEND INTEGRATION: POST /api/practice/speaking/analyze → { score, clarity, intonation, rhythm } */}
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
                          color: "var(--secondary)",
                        }}
                      >
                        85%
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Good job!</div>
                        <div style={{ color: "var(--gray)" }}>
                          Your pronunciation is clear and understandable
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(150px,1fr))",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          background: "var(--bg-card)",
                          padding: "1rem",
                          borderRadius: "var(--border-radius)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{ fontWeight: 600, color: "var(--secondary)" }}
                        >
                          ✓ Good
                        </div>
                        <div
                          style={{ fontSize: "0.9rem", color: "var(--gray)" }}
                        >
                          Vowel sounds
                        </div>
                      </div>
                      <div
                        style={{
                          background: "var(--bg-card)",
                          padding: "1rem",
                          borderRadius: "var(--border-radius)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{ fontWeight: 600, color: "var(--accent)" }}
                        >
                          ⚠ Needs Work
                        </div>
                        <div
                          style={{ fontSize: "0.9rem", color: "var(--gray)" }}
                        >
                          Intonation
                        </div>
                      </div>
                    </div>
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
                  <h3>{READING.title}</h3>
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
                      }}
                    >
                      Try Again
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
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
