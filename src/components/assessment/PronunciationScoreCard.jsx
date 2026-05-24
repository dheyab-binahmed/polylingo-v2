export default function PronunciationScoreCard({ result }) {
  if (!result) return null;
  const {
    pronunciation_score,
    cefr_band,
    is_reliable,
    sub_scores = {},
    summary_feedback,
    strengths = [],
    improvements_needed = [],
    word_level_feedback = [],
  } = result;

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
      {strengths.length > 0 && (
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
          {strengths.slice(0, 3).map((s, i) => (
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
      {improvements_needed.length > 0 && (
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
          {improvements_needed.slice(0, 3).map((s, i) => (
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
      {word_level_feedback.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Words to practise:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {word_level_feedback.slice(0, 10).map((w, i) => {
              const s = w.pronunciation_score ?? w.score ?? 0;
              const issue = w.issues?.[0] || "";
              return (
                <div
                  key={i}
                  style={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: color(s), fontWeight: 600 }}>
                    {w.word}
                  </span>
                  {issue && (
                    <span
                      style={{ color: "#6b7280", marginLeft: 6, fontSize: 11 }}
                    >
                      {issue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
