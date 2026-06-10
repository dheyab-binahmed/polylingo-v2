import { useState, useEffect, useRef, useCallback } from "react";
import { useAssessment } from "./assessmentContext";
import { apiFetch } from "../../services/api";
import { takePrefetched, prefetchStep, contentUrl } from "./assessmentExtras";

const MIN_WORDS = 40;

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Render the essay with each LanguageTool/AI error phrase highlighted. Hovering
// a highlight shows the explanation; the corrected version is shown alongside.
function HighlightedEssay({ text, corrections }) {
  if (!corrections || corrections.length === 0) return <span>{text}</span>;
  // Build a list of [index, length, correction] matches, earliest first.
  const marks = [];
  corrections.forEach((c) => {
    const orig = (c.original || "").trim();
    if (!orig) return;
    const at = text.indexOf(orig);
    if (at >= 0) marks.push({ at, len: orig.length, c });
  });
  marks.sort((a, b) => a.at - b.at);
  const nodes = [];
  let cursor = 0;
  marks.forEach((m, i) => {
    if (m.at < cursor) return; // skip overlaps
    if (m.at > cursor) nodes.push(text.slice(cursor, m.at));
    nodes.push(
      <mark key={i} title={`${m.c.corrected ? `→ ${m.c.corrected}\n` : ""}${m.c.explanation || ""}`}
        style={{ background: "rgba(239,68,68,0.18)", color: "#b91c1c", borderRadius: 4, padding: "0 2px", cursor: "help", textDecoration: "underline wavy #ef4444" }}>
        {text.slice(m.at, m.at + m.len)}
      </mark>
    );
    cursor = m.at + m.len;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
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
  const [corrections, setCorrections] = useState(null); // { corrections:[], improved }
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const cancelled = useRef(false);
  const pasteTimer = useRef(null);

  // Load writing prompt (consume prefetch if available); prefetch the next step.
  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lang = data.language || "en";
      const level = data.level || "";
      const pre = takePrefetched("writing", lang, level);
      const json = pre ? await pre : await apiFetch(contentUrl("writing", lang, level));
      if (cancelled.current) return;
      setPrompt(json);
      setSessionId(json.session_id || null);
      prefetchStep("listening", lang, level); // background-load the next step
    } catch (err) {
      if (cancelled.current) return;
      console.warn("[WritingStep] prompt fetch failed:", err);
      setError("Could not load writing prompt. Please try again.");
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, [data.language, data.level]);

  useEffect(() => {
    cancelled.current = false;
    fetchPrompt();
    return () => {
      cancelled.current = true;
      if (pasteTimer.current) clearTimeout(pasteTimer.current);
    };
  }, [fetchPrompt]);

  function blockPaste(e) {
    e.preventDefault();
    setPasteBlocked(true);
    if (pasteTimer.current) clearTimeout(pasteTimer.current);
    pasteTimer.current = setTimeout(() => setPasteBlocked(false), 3000);
  }

  const words = wordCount(essay);
  const minWords = prompt?.min_words || MIN_WORDS;
  const canSubmit = words >= minWords && !submitting && !result;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    // Kick off the error-highlighting grammar check in parallel with scoring.
    const gcPromise = apiFetch("/practice/writing/grammar-check", {
      method: "POST",
      body: JSON.stringify({ text: essay, language: data.language || "en" }),
    }).catch(() => null);

    try {
      if (!sessionId) {
        update({ writingScore: null, writingTotal: 0 });
        const gc = await gcPromise;
        if (gc) setCorrections(gc);
        setResult({ score: null, total: 10, feedback: "" });
        return;
      }

      const json = await apiFetch(`/sessions/${sessionId}/score`, {
        method: "PUT",
        body: JSON.stringify({ test_type: "writing", transcript: essay }),
      });

      const r = json.result || json;
      const rawScore = r.score ?? r.overall ?? 0;
      const score = Math.round(Math.max(0, Math.min(10, rawScore / 10)));
      const feedback = r.summary_feedback || r.feedback || "";

      const gc = await gcPromise;
      if (gc) setCorrections(gc);
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
        <button onClick={() => { cancelled.current = false; fetchPrompt(); }} style={btnStyle("#6366f1")}>
          <i className="fas fa-redo" /> Retry
        </button>
      </div>
    );
  }

  const wordPct = Math.min(100, Math.round((words / minWords) * 100));
  const corrList = corrections?.corrections || [];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1.25rem 4rem", animation: "fadeInUp 0.4s ease" }}>

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

      {!result && (
        <>
          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
            <textarea
              value={essay}
              onChange={e => setEssay(e.target.value)}
              onPaste={blockPaste}
              onDrop={blockPaste}
              placeholder="Start writing here…"
              rows={10}
              className="writing-area"
              style={{
                width: "100%", padding: "1rem 1.1rem", borderRadius: 12, border: "2px solid var(--border)",
                background: "var(--bg-card)", color: "var(--text-base)", fontSize: "1rem", lineHeight: 1.75,
                resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                transition: "border-color 0.2s, box-shadow 0.2s", minHeight: 220,
              }}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", fontSize: "0.83rem" }}>
              <span style={{ fontWeight: 700, color: words >= minWords ? "#10b981" : words > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                {words >= minWords
                  ? <><i className="fas fa-check-circle" /> {words} words — ready to submit!</>
                  : <>{words} / {minWords} words minimum</>}
              </span>
              {pasteBlocked && (
                <span style={{ color: "#ef4444", fontWeight: 600 }}>
                  <i className="fas fa-ban" /> Pasting is disabled — please type your own response
                </span>
              )}
              {error && !pasteBlocked && <span style={{ color: "#ef4444", fontWeight: 600 }}><i className="fas fa-exclamation-circle" /> {error}</span>}
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${wordPct}%`, borderRadius: 99,
                background: words >= minWords ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                transition: "width 0.3s ease, background 0.3s ease" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => goPrev("writing")} className="btn btn-outline btn-sm">
              <i className="fas fa-arrow-left" /> Back
            </button>
            <button onClick={handleSkip} className="btn btn-outline btn-sm" style={{ marginLeft: "auto", opacity: 0.7 }}>
              Skip
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit}
              className={`btn ${canSubmit ? "btn-primary" : "btn-outline"} btn-sm`}
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed", minWidth: 120 }}>
              {submitting ? <><i className="fas fa-spinner fa-spin" /> Scoring…</> : <><i className="fas fa-paper-plane" /> Submit</>}
            </button>
          </div>
        </>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ background: "var(--bg-card)", border: "2px solid #10b981", borderRadius: 18, padding: "2rem", textAlign: "center", boxShadow: "0 8px 30px rgba(16,185,129,0.12)" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <i className="fas fa-check-circle" style={{ fontSize: "1.8rem", color: "#10b981" }} />
            </div>
            {result.score != null && (
              <>
                <h2 style={{ color: "var(--text-base)", fontWeight: 800, marginBottom: "0.35rem", fontSize: "1.3rem" }}>
                  Score: {result.score} / {result.total}
                </h2>
                <div style={{ maxWidth: 280, margin: "0.5rem auto 1rem", height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(result.score / result.total) * 100}%`, background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
              </>
            )}
            {result.feedback && (
              <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 0.5rem", fontSize: "0.93rem" }}>
                {result.feedback}
              </p>
            )}
          </div>

          {/* Error highlights + corrected version */}
          {corrList.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "1.25rem 1.5rem", marginTop: "1rem" }}>
              <div style={{ fontWeight: 800, color: "var(--text-base)", marginBottom: "0.75rem", fontSize: "1rem" }}>
                <i className="fas fa-highlighter" style={{ color: "#f59e0b", marginRight: "0.5rem" }} />
                {corrList.length} thing{corrList.length === 1 ? "" : "s"} to review
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>What you wrote</div>
                  <div style={{ lineHeight: 1.9, fontSize: "0.95rem", color: "var(--text-base)" }}>
                    <HighlightedEssay text={essay} corrections={corrList} />
                  </div>
                </div>
                {corrections?.improved && (
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>Corrected version</div>
                    <div style={{ lineHeight: 1.9, fontSize: "0.95rem", color: "var(--text-base)", background: "rgba(16,185,129,0.06)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                      {corrections.improved}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
                {corrList.map((c, i) => (
                  <div key={i} style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
                    <span style={{ color: "#b91c1c", textDecoration: "line-through" }}>{c.original}</span>
                    {c.corrected && <> → <span style={{ color: "#047857", fontWeight: 600 }}>{c.corrected}</span></>}
                    {c.explanation && <span> — {c.explanation}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <button onClick={() => goNext("writing")} className="btn btn-primary">
              Continue <i className="fas fa-arrow-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return { background: color, color: "#fff", border: "none", borderRadius: 10, padding: "0.6rem 1.4rem", fontWeight: 700, cursor: "pointer" };
}
