import { useState, useEffect, useRef } from "react";
import { useAssessment } from "./assessmentContext";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MIN_WORDS = 40;

function getToken() {
  return localStorage.getItem("polylingo_token") || "";
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function WritingStep() {
  const { data, update, goNext, goPrev } = useAssessment();

  const [prompt, setPrompt] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const cancelled = useRef(false);

  // Load writing prompt from backend
  useEffect(() => {
    cancelled.current = false;
    async function fetchPrompt() {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const lang = data.language || "en";
        const level = data.level || "";
        const res = await fetch(
          `${BASE_URL}/api/v1/assessment/content?step_type=writing&language=${lang}${level ? `&level=${level}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled.current) return;
        setPrompt(json);
        setSessionId(json.session_id || null);
      } catch (err) {
        if (cancelled.current) return;
        console.warn("[WritingStep] prompt fetch failed:", err);
        setError("Could not load writing prompt. Please try again.");
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    }
    fetchPrompt();
    return () => { cancelled.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const words = wordCount(essay);
  const minWords = prompt?.min_words || MIN_WORDS;
  const canSubmit = words >= minWords && !submitting && !result;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!sessionId) {
        // No session — give full credit locally and move on
        update({ writingScore: 10, writingTotal: 10 });
        goNext("writing");
        return;
      }

      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/score`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ test_type: "writing", transcript: essay }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);

      const r = json.result || json;
      // score_speaking returns overall (0-10), fluency, grammar + summary_feedback
      const rawScore = r.score ?? r.overall ?? 0;
      const score = Math.round(Math.max(0, Math.min(10, rawScore)));
      const feedback = r.summary_feedback || r.feedback || "";

      setResult({ score, total: 10, feedback });
      update({ writingScore: score, writingTotal: 10 });
    } catch (err) {
      console.error("[WritingStep] scoring failed:", err);
      setError("Could not score your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    update({ writingScore: 0, writingTotal: 10 });
    goNext("writing");
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: "3rem auto", padding: "0 1.25rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 40, height: 40, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>Generating your writing prompt…</p>
      </div>
    );
  }

  if (error && !prompt) {
    return (
      <div style={{ maxWidth: 700, margin: "3rem auto", padding: "0 1.25rem", textAlign: "center" }}>
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={() => {
            cancelled.current = false;
            setError(null);
            setLoading(true);
            // re-run by toggling a counter — simplest is unmount/remount via key, but here we refetch manually
            (async () => {
              setLoading(true);
              setError(null);
              try {
                const token = getToken();
                const lang = data.language || "en";
                const level = data.level || "";
                const res = await fetch(
                  `${BASE_URL}/api/v1/assessment/content?step_type=writing&language=${lang}${level ? `&level=${level}` : ""}`,
                  { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setPrompt(json);
                setSessionId(json.session_id || null);
              } catch (err) {
                setError("Could not load writing prompt. Please try again.");
              } finally {
                setLoading(false);
              }
            })();
          }}
          style={btnStyle("#6366f1")}
        >
          <i className="fas fa-redo" /> Retry
        </button>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  const wordPct = Math.min(100, Math.round((words / minWords) * 100));

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1.25rem 4rem", animation: "fadeInUp 0.4s ease" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(99,102,241,0.12)", color: "#6366f1", padding: "0.35rem 1.1rem", borderRadius: 99, fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.03em", marginBottom: "0.85rem" }}>
          <i className="fas fa-pencil-alt" /> WRITING ASSESSMENT
        </div>
        <h1 style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", fontWeight: 800, color: "var(--text-base)", marginBottom: "0.4rem" }}>
          Express Your Thoughts
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Write a response to the prompt below. Aim for at least <strong>{minWords} words</strong>.
        </p>
      </div>

      {/* Prompt card */}
      <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.07))", border: "1.5px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: "1.5rem 1.75rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.65rem" }}>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(245,158,11,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="fas fa-lightbulb" style={{ color: "#f59e0b", fontSize: "0.85rem" }} />
          </span>
          <span style={{ fontWeight: 700, color: "var(--text-base)", fontSize: "0.95rem" }}>
            {prompt?.topic || "Writing Prompt"}
          </span>
        </div>
        <p style={{ color: "var(--text-base)", lineHeight: 1.8, fontSize: "0.97rem", margin: 0, paddingLeft: "2.4rem" }}>
          {prompt?.prompt || prompt?.instructions || "Write about the topic above."}
        </p>
      </div>

      {/* Textarea + actions */}
      {!result && (
        <>
          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
            <textarea
              value={essay}
              onChange={e => setEssay(e.target.value)}
              placeholder="Start writing here…"
              rows={10}
              className="writing-area"
              style={{
                width: "100%",
                padding: "1rem 1.1rem",
                borderRadius: 12,
                border: "2px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-base)",
                fontSize: "1rem",
                lineHeight: 1.75,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s, box-shadow 0.2s",
                minHeight: 220,
              }}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Word count + progress bar */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", fontSize: "0.83rem" }}>
              <span style={{ fontWeight: 700, color: words >= minWords ? "#10b981" : words > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                {words >= minWords
                  ? <><i className="fas fa-check-circle" /> {words} words — ready to submit!</>
                  : <>{words} / {minWords} words minimum</>}
              </span>
              {error && <span style={{ color: "#ef4444", fontWeight: 600 }}><i className="fas fa-exclamation-circle" /> {error}</span>}
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${wordPct}%`,
                borderRadius: 99,
                background: words >= minWords ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                transition: "width 0.3s ease, background 0.3s ease",
              }} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => goPrev("writing")} className="btn btn-outline btn-sm">
              <i className="fas fa-arrow-left" /> Back
            </button>
            <button onClick={handleSkip} className="btn btn-outline btn-sm" style={{ marginLeft: "auto", opacity: 0.7 }}>
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`btn ${canSubmit ? "btn-primary" : "btn-outline"} btn-sm`}
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed", minWidth: 120 }}
            >
              {submitting
                ? <><i className="fas fa-spinner fa-spin" /> Scoring…</>
                : <><i className="fas fa-paper-plane" /> Submit</>}
            </button>
          </div>
        </>
      )}

      {/* Result card */}
      {result && (
        <div style={{ background: "var(--bg-card)", border: "2px solid #10b981", borderRadius: 18, padding: "2rem", textAlign: "center", marginTop: "1rem", boxShadow: "0 8px 30px rgba(16,185,129,0.12)" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <i className="fas fa-check-circle" style={{ fontSize: "1.8rem", color: "#10b981" }} />
          </div>
          <h2 style={{ color: "var(--text-base)", fontWeight: 800, marginBottom: "0.35rem", fontSize: "1.3rem" }}>
            Score: {result.score} / {result.total}
          </h2>
          {/* Score bar */}
          <div style={{ maxWidth: 280, margin: "0.5rem auto 1rem", height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(result.score / result.total) * 100}%`, background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 99, transition: "width 0.6s ease" }} />
          </div>
          {result.feedback && (
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 1.5rem", fontSize: "0.93rem" }}>
              {result.feedback}
            </p>
          )}
          <button onClick={() => goNext("writing")} className="btn btn-primary">
            Continue <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}
    </div>
  );
}
