import { useState, useRef, useEffect, useContext } from "react";
import AssessmentContext from "./assessmentContext";
import { useAuth } from "../../context/AuthContext";
import { getAssessmentContent } from "../../data/assessmentContent";
import PronunciationScoreCard from "../../components/assessment/PronunciationScoreCard";
import {
  scorePronunciation,
  getPronunciationJobStatus,
  updateSessionScore,
} from "../../services/api";

export default function PronunciationStep() {
  // Safe context — works both inside Assessment flow and standalone in Practice
  const assessmentCtx = useContext(AssessmentContext);
  const data = assessmentCtx?.data ?? { language: "en", level: "B1" };
  const update = assessmentCtx?.update ?? (() => {});
  const goNext = assessmentCtx?.goNext ?? null;
  const goPrev = assessmentCtx?.goPrev ?? null;
  const isPracticeMode = !assessmentCtx;

  const { user } = useAuth();
  const userLevel = data.level || user?.estimated_level || user?.selected_level || "B1";

  const content = getAssessmentContent(data.language);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  useEffect(() => {
    if (!selectedPrompt && content.pronunciation) {
      const prompts = content.pronunciation[userLevel] || content.pronunciation["B1"] || [];
      if (prompts.length > 0) {
        const pick = prompts[Math.floor(Math.random() * prompts.length)];
        setSelectedPrompt(pick);
        if (!isPracticeMode) update({ pronunciationPrompt: pick });
      }
    }
  }, [userLevel, content.pronunciation, selectedPrompt, update, isPracticeMode]);

  const [recording, setRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [time, setTime] = useState(0);
  const [micError, setMicError] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [amplitude, setAmplitude] = useState(Array(28).fill(4));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreResult, setScoreResult] = useState(null); // full result object for ScoreCard

  const timerRef = useRef(null);
  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const chunksRef = useRef([]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  function animateBars() {
    if (!analyserRef.current) return;
    const d = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(d);
    setAmplitude(
      Array.from({ length: 28 }, (_, i) =>
        Math.max(4, Math.min(64, (d[Math.floor((i * d.length) / 28)] / 255) * 64))
      )
    );
    animFrameRef.current = requestAnimationFrame(animateBars);
  }

  async function startRecording() {
    setMicError("");
    setScoreResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      animateBars();

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };
      recorder.start(100);
      setRecording(true);
      setHasRecorded(false);

      let s = 0;
      timerRef.current = setInterval(() => {
        s++;
        setTime(s);
        if (s >= 120) stopRecording();
      }, 1000);
    } catch (err) {
      if (err.name === "NotAllowedError")
        setMicError("Microphone access denied. Please allow microphone access in your browser settings.");
      else if (err.name === "NotFoundError")
        setMicError("No microphone found. Please connect a microphone and try again.");
      else setMicError(`Could not access microphone: ${err.message}`);
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    setAmplitude(Array(28).fill(4));
    if (mediaRecRef.current?.state !== "inactive") mediaRecRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    setRecording(false);
    setHasRecorded(true);
  }

  async function handleSubmit() {
    if (!audioBlob) {
      setMicError("No audio recorded. Please record yourself first.");
      return;
    }
    setIsAnalyzing(true);
    setMicError("");
    setScoreResult(null);

    try {
      const refText =
        typeof selectedPrompt === "string"
          ? selectedPrompt
          : selectedPrompt?.passage || selectedPrompt?.title || "";
      const submission = await scorePronunciation(audioBlob, data.language || "en", refText);
      const jobId = submission.job_id || submission.id;
      const sessionId = submission.session_id;

      if (!jobId) throw new Error("Pronunciation analysis job was not created.");

      let statusData = null;
      for (let attempt = 0; attempt < 60; attempt++) {
        statusData = await getPronunciationJobStatus(jobId);
        if (statusData?.status === "completed") break;
        if (statusData?.status === "failed")
          throw new Error(statusData.error || statusData.error_message || "Analysis failed.");
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!statusData || statusData.status !== "completed" || !statusData.result)
        throw new Error("Analysis is still processing. Please try again in a moment.");

      const backendResult = statusData.result;

      if (sessionId) {
        try {
          await updateSessionScore(sessionId, {
            test_type: "pronunciation",
            score: backendResult.overall_score || backendResult.pronunciation_score || 0,
            job_result: backendResult,
          });
        } catch (_) {}
      }

      // Show score card below
      setScoreResult(backendResult);

      // If inside assessment flow, also update context and advance after delay
      if (!isPracticeMode) {
        const recScore = Math.round(Number(backendResult.pronunciation_accuracy ?? backendResult.overall_score ?? 61));
        update({
          pronunciationScore: Math.round(recScore / 10),
          pronunciationScore100: recScore,
          pronunciationResult: backendResult,
          pronunciationCompleted: true,
          pronunciationSkipped: false,
        });
        setTimeout(() => goNext("pronunciation"), 2500);
      }

    } catch (err) {
      let msg = "Analysis failed. Please try again.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === "string") {
        msg = err;
      } else if (err?.error) {
        msg = err.error;
      } else if (err?.message) {
        msg = err.message;
      } else if (err?.status === 401 || err?.statusCode === 401) {
        msg = "Session expired. Please log out and log back in, then try again.";
      }
      setMicError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleTryAgain() {
    setHasRecorded(false);
    setAudioBlob(null);
    setScoreResult(null);
    setMicError("");
    setTime(0);
    // Pick a new random prompt
    const prompts = content.pronunciation?.[userLevel] || content.pronunciation?.["B1"] || [];
    if (prompts.length > 0) {
      const pick = prompts[Math.floor(Math.random() * prompts.length)];
      setSelectedPrompt(pick);
    }
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="test-container fade-in" style={{ margin: "2rem auto" }}>
      <div className="test-header">
        <h2>Pronunciation Practice</h2>
        <p>
          Read the passage below clearly into your microphone.
          We'll analyze your pronunciation and give you detailed feedback.
        </p>
      </div>

      <div className="test-content">
        <div className="speaking-test">

          {/* Passage to read */}
          <div className="read-aloud-box" style={{ borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <i className="fas fa-quote-left" style={{ color: "#6366f1", fontSize: "0.9rem" }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Read Aloud ({userLevel})
              </span>
            </div>
            {selectedPrompt ? (
              <p style={{ margin: 0, fontWeight: 500, fontSize: "1.1rem", color: "var(--text-base)", lineHeight: 1.8, fontStyle: "italic" }}>
                {typeof selectedPrompt === "string" ? selectedPrompt : selectedPrompt.passage || selectedPrompt.title}
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading pronunciation prompt...</p>
            )}
          </div>

          {/* Error */}
          {micError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "0.875rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <i className="fas fa-exclamation-triangle" style={{ color: "#ef4444", marginTop: "2px", flexShrink: 0 }} />
              <span style={{ color: "#dc2626", fontSize: "0.88rem" }}>{micError}</span>
            </div>
          )}

          {/* Recorder */}
          <div style={{ background: recording ? "#1e1b4b" : "var(--bg-subtle)", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", border: `2px solid ${recording ? "#6366f1" : "var(--border)"}`, transition: "all .3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "72px" }}>
              {amplitude.map((h, i) => (
                <div key={i} style={{ width: "5px", height: `${h}px`, borderRadius: "3px", background: recording ? `hsl(${240 + i * 4}, 80%, 65%)` : hasRecorded ? "#6366f1" : "#d1d5db", transition: recording ? "none" : "height .4s ease" }} />
              ))}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "monospace", color: recording ? "#e0e7ff" : "var(--text-base)", letterSpacing: "0.1em" }}>
              {fmt(time)}
            </div>
            <button
              onClick={() => (recording ? stopRecording() : startRecording())}
              disabled={isAnalyzing}
              style={{ width: "64px", height: "64px", borderRadius: "50%", background: recording ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", cursor: "pointer", color: "white", fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: recording ? "0 0 0 8px rgba(239,68,68,.2)" : "0 4px 16px rgba(99,102,241,.4)", transition: "box-shadow .3s" }}
            >
              <i className={`fas ${recording ? "fa-stop" : "fa-microphone"}`} />
            </button>
            <p style={{ color: recording ? "#a5b4fc" : "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
              {recording ? `Recording… ${time}s — click to stop` : hasRecorded ? "Recording saved. Submit to get your score." : "Click the microphone to start recording"}
            </p>
          </div>

          {/* Playback + Submit */}
          {hasRecorded && !scoreResult && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {audioBlob && (
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: "100%", height: "36px" }} />
              )}
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isAnalyzing}
                style={{ width: "100%", padding: "0.875rem", fontSize: "1rem", fontWeight: 700 }}
              >
                {isAnalyzing ? (
                  <><i className="fas fa-spinner fa-spin" /> Analyzing your pronunciation...</>
                ) : (
                  <><i className="fas fa-paper-plane" /> Submit for Evaluation</>
                )}
              </button>
            </div>
          )}

          {/* Score Card — shown after analysis completes */}
          {scoreResult && (
            <div style={{ marginTop: "1.5rem" }} className="fade-in">
              <PronunciationScoreCard result={scoreResult} />
              <button
                className="btn btn-outline"
                onClick={handleTryAgain}
                style={{ marginTop: "1rem", width: "100%" }}
              >
                <i className="fas fa-redo" /> Try Again with a New Passage
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Navigation — only shown inside assessment flow */}
      {!isPracticeMode && (
        <div className="test-navigation">
          <button className="btn btn-outline" onClick={() => goPrev("pronunciation")} disabled={isAnalyzing}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          {!hasRecorded && (
            <button className="btn btn-outline" onClick={() => { update({ pronunciationSkipped: true }); goNext("pronunciation"); }} disabled={isAnalyzing}>
              Skip <i className="fas fa-arrow-right" />
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 4px rgba(239,68,68,.3)} 50%{box-shadow:0 0 0 12px rgba(239,68,68,.1)} }`}</style>
    </div>
  );
}
