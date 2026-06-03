import { useState, useRef, useEffect } from "react";
import { useAssessment } from "./assessmentContext";
import { getAssessmentContent } from "../../data/assessmentContent";
import {
  scorePronunciation,
  getPronunciationJobStatus,
  updateSessionScore,
} from "../../services/api";

export default function PronunciationStep() {
  const { data, update, goNext, goPrev } = useAssessment();

  // Load pronunciation sentences for the selected language and difficulty level
  const content = getAssessmentContent(data.language);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // Initialize with a random prompt based on difficulty level
  useEffect(() => {
    if (!selectedPrompt && content.pronunciation && data.level) {
      const prompts = content.pronunciation[data.level];
      if (prompts && prompts.length > 0) {
        const randomIndex = Math.floor(Math.random() * prompts.length);
        setSelectedPrompt(prompts[randomIndex]);
        update({ pronunciationPrompt: prompts[randomIndex] });
      }
    }
  }, [data.level, content.pronunciation, selectedPrompt, update]);

  const [recording, setRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [time, setTime] = useState(0);
  const [micError, setMicError] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [amplitude, setAmplitude] = useState(Array(28).fill(4));
  const [score, setScore] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        Math.max(
          4,
          Math.min(64, (d[Math.floor((i * d.length) / 28)] / 255) * 64),
        ),
      ),
    );
    animFrameRef.current = requestAnimationFrame(animateBars);
  }

  async function startRecording() {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;
      audioCtxRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      animateBars();

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        // ✅ Just store the blob - DON'T analyze yet
        // Analysis will happen when user clicks Continue
        update({
          pronunciationAudioUrl: url,
          pronunciationAudioBlob: blob,
        });
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
        setMicError(
          "Microphone access denied. Please allow microphone access in your browser settings.",
        );
      else if (err.name === "NotFoundError")
        setMicError(
          "No microphone found. Please connect a microphone and try again.",
        );
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

  function handleContinue() {
    if (!hasRecorded) {
      // User skipped recording - no analysis needed
      update({
        pronunciationScore: null,
        pronunciationScore100: null,
        pronunciationResult: null,
        pronunciationCompleted: false,
        pronunciationSkipped: true,
      });
      goNext("pronunciation");
      return;
    }

    // ✅ User recorded - analyze NOW before proceeding to Speaking test
    analyzeRecording();
  }

  async function analyzeRecording() {
    if (!audioBlob) {
      setMicError("No audio to analyze");
      return;
    }

    setIsAnalyzing(true);
    setMicError("");

    try {
      const submission = await scorePronunciation(
        audioBlob,
        data.language,
        selectedPrompt,
      );
      const jobId = submission.job_id || submission.id;
      const sessionId = submission.session_id;

      if (!jobId) {
        throw new Error("Pronunciation analysis job was not created.");
      }

      let statusData = null;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        statusData = await getPronunciationJobStatus(jobId);

        if (statusData?.status === "completed") {
          break;
        }

        if (statusData?.status === "failed") {
          throw new Error(
            statusData.error || statusData.error_message || "Analysis failed.",
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (
        !statusData ||
        statusData.status !== "completed" ||
        !statusData.result
      ) {
        throw new Error(
          "Analysis is still processing. Please try again in a moment.",
        );
      }

      const backendResult = statusData.result;
      const recScore = Math.round(
        Number(
          backendResult.pronunciation_accuracy ??
            backendResult.overall_score ??
            61,
        ),
      );

      // Send comprehensive pronunciation data to API if sessionId is available
      if (sessionId) {
        try {
          await updateSessionScore(sessionId, {
            test_type: "pronunciation",
            score:
              backendResult.overall_score ||
              backendResult.pronunciation_score ||
              recScore,
            job_result: backendResult,
          });
        } catch (apiError) {
          console.error("Failed to update session score:", apiError);
          // Continue anyway - the analysis result is still valid
        }
      }

      setScore(Math.round(recScore / 10));
      update({
        pronunciationScore: Math.round(recScore / 10),
        pronunciationScore100: recScore,
        pronunciationResult: backendResult,
        pronunciationCompleted: true,
        pronunciationSkipped: false,
        pronunciationWordEvaluations: backendResult.word_evaluations || [],
        pronunciationReasonLines: backendResult.summary
          ? [backendResult.summary]
          : [],
        pronunciationFeedback: backendResult.summary,
      });
      // ✅ Analysis complete - proceed to next step
      goNext("pronunciation");
    } catch (err) {
      // ✅ Better error extraction
      let errorMsg = "Analysis failed. Please try again.";
      if (err instanceof Error) {
        errorMsg = err.message || errorMsg;
      } else if (typeof err === "string") {
        errorMsg = err;
      } else if (typeof err === "object" && err !== null) {
        errorMsg = err.message || err.error || JSON.stringify(err);
      }

      console.error("Pronunciation analysis error:", err, {
        audioSize: audioBlob.size,
        language: data.language,
      });

      setMicError(errorMsg);
      setScore(null);
      update({
        pronunciationScore: null,
        pronunciationScore100: null,
        pronunciationResult: null,
        pronunciationCompleted: false,
        pronunciationSkipped: false,
        pronunciationError: errorMsg,
      });
    } finally {
      setIsAnalyzing(false);
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
        <h2>Pronunciation Assessment</h2>
        <p>
          Read the {content.fullName} sentences below clearly into your
          microphone. We'll record and analyze your pronunciation.
        </p>
      </div>

      <div className="test-content">
        <div className="speaking-test">
          {/* Pronunciation prompt to read — matched to difficulty level */}
          <div
            className="read-aloud-box"
            style={{
              borderRadius: "14px",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <i
                className="fas fa-quote-left"
                style={{ color: "#6366f1", fontSize: "0.9rem" }}
              />
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#6366f1",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Read Aloud ({data.level}) — {content.fullName}
              </span>
            </div>
            {selectedPrompt ? (
              <>
                {typeof selectedPrompt === "string" ? (
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 500,
                      fontSize: "1.1rem",
                      color: "var(--text-base)",
                      lineHeight: 1.8,
                      fontStyle: "italic",
                    }}
                  >
                    {selectedPrompt}
                  </p>
                ) : (
                  <>
                    {selectedPrompt.title && (
                      <div
                        style={{
                          marginBottom: "0.5rem",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "#6366f1",
                        }}
                      >
                        {selectedPrompt.title}
                      </div>
                    )}
                    <p
                      style={{
                        margin: "0 0 1rem 0",
                        fontWeight: 500,
                        fontSize: "1.1rem",
                        color: "var(--text-base)",
                        lineHeight: 1.8,
                        fontStyle: "italic",
                      }}
                    >
                      {selectedPrompt.passage || selectedPrompt}
                    </p>
                    {(selectedPrompt.word_count ||
                      selectedPrompt.estimated_duration_seconds) && (
                      <div
                        style={{
                          display: "flex",
                          gap: "1rem",
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {selectedPrompt.word_count && (
                          <span>📝 {selectedPrompt.word_count} words</span>
                        )}
                        {selectedPrompt.estimated_duration_seconds && (
                          <span>
                            ⏱️ ~
                            {Math.round(
                              selectedPrompt.estimated_duration_seconds,
                            )}
                            s
                          </span>
                        )}
                      </div>
                    )}
                    {selectedPrompt.instructions && (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                          fontStyle: "normal",
                          padding: "0.5rem 0",
                          borderTop: "1px solid var(--border)",
                          marginTop: "0.75rem",
                          paddingTop: "0.75rem",
                        }}
                      >
                        {selectedPrompt.instructions}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                Loading pronunciation prompt...
              </p>
            )}
          </div>

          {micError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "0.875rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <i
                className="fas fa-exclamation-triangle"
                style={{ color: "#ef4444", marginTop: "2px", flexShrink: 0 }}
              />
              <span style={{ color: "#dc2626", fontSize: "0.88rem" }}>
                {micError}
              </span>
            </div>
          )}

          <div
            style={{
              background: recording ? "#1e1b4b" : "var(--bg-subtle)",
              borderRadius: "16px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              border: `2px solid ${recording ? "#6366f1" : "var(--border)"}`,
              transition: "all .3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                height: "72px",
              }}
            >
              {amplitude.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: "5px",
                    height: `${h}px`,
                    borderRadius: "3px",
                    background: recording
                      ? `hsl(${240 + i * 4}, 80%, 65%)`
                      : hasRecorded
                        ? "#6366f1"
                        : "#d1d5db",
                    transition: recording ? "none" : "height .4s ease",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                fontFamily: "monospace",
                color: recording ? "#e0e7ff" : "var(--text-base)",
                letterSpacing: "0.1em",
              }}
            >
              {fmt(time)}
            </div>
            <button
              onClick={() => (recording ? stopRecording() : startRecording())}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: recording
                  ? "linear-gradient(135deg,#ef4444,#dc2626)"
                  : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                border: "none",
                cursor: "pointer",
                color: "white",
                fontSize: "1.4rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: recording
                  ? "0 0 0 8px rgba(239,68,68,.2)"
                  : "0 4px 16px rgba(99,102,241,.4)",
                transition: "box-shadow .3s",
              }}
            >
              <i className={`fas ${recording ? "fa-stop" : "fa-microphone"}`} />
            </button>
            <p
              style={{
                color: recording ? "#a5b4fc" : "var(--text-muted)",
                fontSize: "0.85rem",
                textAlign: "center",
                margin: 0,
              }}
            >
              {recording
                ? `Recording… ${30 - time}s remaining — click to stop`
                : hasRecorded
                  ? "Recording saved! You can re-record or continue."
                  : "Click the microphone to start recording"}
            </p>
          </div>

          {hasRecorded && score && (
            <div
              style={{
                marginTop: "1rem",
                background: "var(--bg-subtle)",
                border: "1.5px solid #bbf7d0",
                borderRadius: "14px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "#10b981",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                <i className="fas fa-check" />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--text-base)",
                    fontSize: "0.92rem",
                  }}
                >
                  Recording complete!
                </div>
                <div
                  style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}
                >
                  Click Continue to analyze your pronunciation
                </div>
              </div>
              {audioBlob && (
                <audio
                  controls
                  src={URL.createObjectURL(audioBlob)}
                  style={{ height: "36px", marginLeft: "auto" }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="test-navigation">
        <button
          className="btn btn-outline"
          onClick={() => goPrev("pronunciation")}
          disabled={isAnalyzing}
        >
          <i className="fas fa-arrow-left" /> Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <i className="fas fa-spinner fa-spin" /> Analyzing...
            </>
          ) : hasRecorded ? (
            <>
              Continue to Speaking Test <i className="fas fa-arrow-right" />
            </>
          ) : (
            <>
              Skip & Continue <i className="fas fa-arrow-right" />
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 4px rgba(239,68,68,.3)} 50%{box-shadow:0 0 0 12px rgba(239,68,68,.1)} }`}</style>
    </div>
  );
}
