import { useNavigate } from "react-router-dom";
import { useAssessment } from "./assessmentContext";
import PronunciationScoreCard from "../../components/assessment/PronunciationScoreCard";

function toPercentScore(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.round(numeric <= 1 ? numeric * 100 : numeric);
}

export default function PronunciationDetailsPage() {
  const { data } = useAssessment();
  const navigate = useNavigate();

  console.log("[PronunciationDetailsPage] assessment data:", data);

  const result =
    data.pronunciationResult ||
    data.pronunciationDetailedResult ||
    data.pronunciationAnalysis ||
    {};

  const overallScore = Math.round(
    Number(
      result.overall_score ??
        result.pronunciation_accuracy ??
        data.pronunciationScore100 ??
        61,
    ),
  );

  if (!result || Object.keys(result).length === 0) {
    return (
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "2rem 1.25rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fbbf24",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ color: "#92400e", margin: 0 }}>
            No pronunciation details available. Please complete a pronunciation
            assessment first.
          </p>
        </div>
        <button
          onClick={() => navigate("/assessment/results")}
          style={{
            background: "#6366f1",
            color: "white",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Back to Results
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        animation: "fadeInUp 0.5s ease",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <button
          onClick={() => navigate("/assessment/results")}
          style={{
            background: "transparent",
            border: "none",
            color: "#6366f1",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <i className="fas fa-arrow-left" /> Back to Results
        </button>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "var(--text-base)",
            marginBottom: "0.5rem",
          }}
        >
          Pronunciation Analysis
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
          Detailed breakdown of your pronunciation assessment
        </p>
      </div>

      {/* Use new PronunciationScoreCard if result has comprehensive data */}
      {result.pronunciation_score != null && (
        <div style={{ marginBottom: "2rem" }}>
          <PronunciationScoreCard result={result} />
        </div>
      )}

      {/* Analysis Details */}
      {result.pronunciation_accuracy || result.fluency_score ? (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "var(--text-base)",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <i className="fas fa-chart-bar" style={{ color: "#6366f1" }} />
            Analysis Summary
          </h2>

          <div style={{ display: "grid", gap: "1rem" }}>
            {result.summary && (
              <div
                style={{
                  padding: "1rem",
                  background: "#f0f4ff",
                  borderLeft: "4px solid #6366f1",
                  borderRadius: "4px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#4c1d95",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                  }}
                >
                  {result.summary}
                </p>
              </div>
            )}

            {result.speech_rate && (
              <p style={{ margin: 0, color: "var(--text-base)" }}>
                <strong>Speech Rate:</strong> {result.speech_rate} words/minute
              </p>
            )}

            {result.pause_analysis?.pause_count !== undefined && (
              <>
                <p
                  style={{ margin: "0.5rem 0 0 0", color: "var(--text-base)" }}
                >
                  <strong>Pause Analysis:</strong>
                </p>
                <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
                  <li>Pause Count: {result.pause_analysis.pause_count}</li>
                  <li>
                    Avg Pause: {result.pause_analysis.average_pause_ms} ms
                  </li>
                  <li>
                    Natural Pacing:{" "}
                    {toPercentScore(
                      result.pause_analysis.natural_pacing_score,
                      0,
                    )}
                    %
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Word-by-Word Evaluation */}
      {result.word_evaluations?.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "var(--text-base)",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <i className="fas fa-list" style={{ color: "#6366f1" }} />
            Word-by-Word Evaluation
          </h2>

          <div style={{ display: "grid", gap: "1rem" }}>
            {result.word_evaluations.map((word, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  background: word.is_correct ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: word.is_correct ? "#10b981" : "#ef4444",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    <i
                      className={`fas ${
                        word.is_correct ? "fa-check" : "fa-times"
                      }`}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "var(--text-base)",
                      }}
                    >
                      {word.word}
                    </h3>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Score: {Math.round(word.pronunciation_score ?? 60)}/100
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    fontSize: "0.9rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <span
                      style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                    >
                      Confidence
                    </span>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontWeight: 600,
                        color: "var(--text-base)",
                      }}
                    >
                      {Math.round((word.confidence ?? 0.75) * 100)}%
                    </p>
                  </div>
                  <div>
                    <span
                      style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                    >
                      Clarity
                    </span>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontWeight: 600,
                        color: "var(--text-base)",
                      }}
                    >
                      {Math.round((word.clarity ?? 0.75) * 100)}%
                    </p>
                  </div>
                </div>

                {word.suggestion && (
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "rgba(99,102,241,0.08)",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      color: "#4c1d95",
                      borderLeft: "3px solid #6366f1",
                    }}
                  >
                    <strong>Feedback:</strong> {word.suggestion}
                  </div>
                )}

                {word.issues?.length > 0 && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                    <strong>Issues to work on:</strong>
                    <ul
                      style={{
                        margin: "0.5rem 0 0 0",
                        paddingLeft: "1.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {word.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations || result.summary ? (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "var(--text-base)",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <i className="fas fa-lightbulb" style={{ color: "#f59e0b" }} />
            Recommendations
          </h2>

          {result.recommendations && (
            <div
              style={{
                padding: "1rem",
                background: "#fffbeb",
                borderLeft: "4px solid #f59e0b",
                borderRadius: "8px",
                color: "#78350f",
                lineHeight: 1.6,
              }}
            >
              {result.recommendations}
            </div>
          )}

          {!result.recommendations && result.summary && (
            <div
              style={{
                padding: "1rem",
                background: "#f0f4ff",
                borderLeft: "4px solid #6366f1",
                borderRadius: "8px",
                color: "#4c1d95",
                lineHeight: 1.6,
              }}
            >
              {result.summary}
            </div>
          )}
        </div>
      ) : null}

      {/* CTA */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => navigate("/assessment/results")}
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "1rem 2rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <i className="fas fa-arrow-left" /> Back to Results
        </button>
      </div>
    </div>
  );
}
