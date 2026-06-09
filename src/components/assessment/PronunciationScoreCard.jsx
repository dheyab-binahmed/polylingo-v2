export default function PronunciationScoreCard({ result }) {
  if (!result) return null;
  const pronunciation_score = result.overall_score ?? result.pronunciation_score ?? null;
  const cefr_band = result.estimated_cefr_level || result.cefr_band || null;
  const is_reliable = result.is_reliable;
  const summary_feedback = result.summary_feedback || result.summary || "";
  const strengths = result.strengths || [];
  const improvements_needed = result.improvements_needed || [];
  const word_level_feedback = result.word_level_feedback || result.word_evaluations || [];

  // Build sub_scores from top-level fields
  const sub_scores = {
    accuracy:        result.pronunciation_accuracy ?? result.sub_scores?.accuracy ?? null,
    fluency:         result.fluency_score ?? result.sub_scores?.fluency ?? null,
    clarity:         result.clarity_score ?? result.sub_scores?.clarity ?? null,
    intonation:      result.intonation_score ?? result.sub_scores?.intonation ?? null,
    intelligibility: result.intelligibility_score ?? result.sub_scores?.intelligibility ?? null,
  };

  // Compute data-driven strengths and improvements from word results
  const subs    = word_level_feedback.filter(w => w.status === "substitution").length;
  const omits   = word_level_feedback.filter(w => w.status === "omission").length;
  const inserts = word_level_feedback.filter(w => w.status === "insertion").length;
  const correct = word_level_feedback.filter(w => w.status === "correct" || (!w.status && (w.pronunciation_score ?? 100) >= 80)).length;
  const total   = word_level_feedback.length;

  const derived_strengths = [];
  const derived_improvements = [];

  if (total > 0) {
    const accuracy_pct = Math.round((correct / total) * 100);
    if (accuracy_pct >= 90) derived_strengths.push(`Excellent word accuracy — ${accuracy_pct}% of words read correctly`);
    else if (accuracy_pct >= 75) derived_strengths.push(`Good accuracy — ${accuracy_pct}% of words read correctly`);
    else derived_improvements.push(`Word accuracy needs work — only ${accuracy_pct}% of words were correct`);

    if (subs > 0) derived_improvements.push(`${subs} word(s) mispronounced or substituted — check "Words to practise" below`);
    if (omits > 0) derived_improvements.push(`${omits} word(s) were skipped — make sure to read every word in the passage`);
    if (inserts > 0) derived_improvements.push(`${inserts} extra word(s) added that were not in the passage — read only what is written`);
    if (subs === 0 && omits === 0 && inserts === 0) derived_strengths.push("Read the passage without any substitutions or omissions");
  }

  // Use derived if available, fall back to backend strengths/improvements
  const display_strengths    = derived_strengths.length > 0 ? derived_strengths : strengths;
  const display_improvements = derived_improvements.length > 0 ? derived_improvements : improvements_needed;

  const color = (s) => {
    if (s == null) return "#6b7280";
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const subScoreLabels = {
    accuracy: "Accuracy",
    fluency: "Fluency",
    clarity: "Clarity",
    intonation: "Intonation",
    intelligibility: "Intelligibility",
  };

  return (
    <div
      style={{
        background: "#1f2937",
        borderRadius: 16,
        padding: 24,
        maxWidth: 500,
        margin: "0 auto",
      }}
    >
      {/* Overall score */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: color(pronunciation_score),
            lineHeight: 1,
          }}
        >
          {pronunciation_score != null ? Math.round(pronunciation_score) : "—"}
        </div>
        <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 8 }}>
          out of 100
        </div>
        <span
          style={{
            background: "#374151",
            borderRadius: 8,
            padding: "4px 16px",
            fontSize: 15,
            fontWeight: 700,
            color: "#e5e7eb",
          }}
        >
          {cefr_band ?? "—"} Level
        </span>
        {is_reliable === false && (
          <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
            ⚠ Score is indicative — recording was too short or audio quality was
            low
          </div>
        )}
      </div>

      {/* Sub-scores grid */}
      {Object.keys(sub_scores).some((k) => sub_scores[k] != null) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {Object.entries(sub_scores).map(
            ([key, val]) =>
              val != null && (
                <div
                  key={key}
                  style={{
                    background: "#374151",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      textTransform: "capitalize",
                      marginBottom: 4,
                    }}
                  >
                    {subScoreLabels[key] ?? key}
                  </div>
                  <div
                    style={{ fontSize: 26, fontWeight: 700, color: color(val) }}
                  >
                    {Math.round(val)}
                    <span style={{ fontSize: 12, color: "#6b7280" }}>/100</span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "#4b5563",
                      borderRadius: 2,
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        height: 3,
                        width: `${val}%`,
                        background: color(val),
                        borderRadius: 2,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {/* Summary feedback */}
      {summary_feedback && (
        <div
          style={{
            background: "#374151",
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            fontSize: 14,
            color: "#d1d5db",
            lineHeight: 1.7,
          }}
        >
          {summary_feedback}
        </div>
      )}

      {/* Strengths */}
      {display_strengths.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              color: "#10b981",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            ✓ Strengths
          </div>
          {display_strengths.slice(0, 3).map((s, i) => (
            <div
              key={i}
              style={{ fontSize: 13, color: "#d1d5db", marginBottom: 4 }}
            >
              • {s}
            </div>
          ))}
        </div>
      )}

      {/* Improvements */}
      {display_improvements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: "#f59e0b",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            ↑ Areas to improve
          </div>
          {display_improvements.slice(0, 3).map((s, i) => (
            <div
              key={i}
              style={{ fontSize: 13, color: "#d1d5db", marginBottom: 4 }}
            >
              • {s}
            </div>
          ))}
        </div>
      )}

      {/* Word-level feedback chips */}
      {(() => {
        const problem_words = word_level_feedback.filter(w =>
          w.status === "substitution" ||
          w.status === "omission" ||
          w.status === "insertion" ||
          (w.pronunciation_score ?? w.score ?? 100) < 80
        );
        if (problem_words.length === 0) return null;
        return (
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 8 }}>
              Words to practise:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {problem_words.map((w, i) => {
                const s = w.pronunciation_score ?? w.score ?? 0;
                const issue = w.issues?.[0] || "";
                const statusColor = w.status === "omission" ? "#ef4444" : w.status === "insertion" ? "#f59e0b" : color(s);
                return (
                  <div key={i} style={{ background: "#111827", border: `1px solid ${statusColor}40`, borderRadius: 8, padding: "5px 10px", fontSize: 13 }}>
                    <span style={{ color: statusColor, fontWeight: 600 }}>{w.word}</span>
                    {issue && <span style={{ color: "#6b7280", marginLeft: 6, fontSize: 11 }}>{issue}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
