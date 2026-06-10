// Reusable "Review your answers" panel for MCQ steps. Turns a score into
// learning by showing, for each question, the user's choice vs the correct one
// (and an explanation when the question carries one).
export default function AnswerReview({ title, questions, details, onContinue, continueLabel = "See Results" }) {
  const byId = {};
  (details || []).forEach((d) => { byId[d.question_id] = d; });

  const correctCount = (details || []).filter((d) => d.is_correct).length;
  const total = (details || []).length || questions.length;

  return (
    <div style={{ animation: "fadeInUp 0.4s ease" }}>
      <div className="test-header" style={{ marginBottom: "1rem" }}>
        <h2>{title}</h2>
        <p>
          You got <strong style={{ color: correctCount === total ? "#10b981" : "#6366f1" }}>{correctCount}</strong> of {total} correct.
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.85rem", marginBottom: "1.5rem" }}>
        {questions.map((q, qi) => {
          const d = byId[q.id] || {};
          const options = q.options || [];
          const sel = d.selected;
          const correct = d.correct;
          const ok = d.is_correct;
          return (
            <div key={q.id || qi} style={{
              background: "var(--bg-card)", border: `1.5px solid ${ok ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
              borderRadius: 14, padding: "1rem 1.15rem",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.6rem" }}>
                <i className={`fas ${ok ? "fa-check-circle" : "fa-times-circle"}`}
                   style={{ color: ok ? "#10b981" : "#ef4444", marginTop: 3 }} />
                <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: "0.95rem" }}>
                  {qi + 1}. {q.question}
                </div>
              </div>
              <div style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.5rem" }}>
                {options.map((opt, i) => {
                  const isCorrect = i === correct;
                  const isPicked = i === sel;
                  const bg = isCorrect ? "rgba(16,185,129,0.12)" : isPicked ? "rgba(239,68,68,0.10)" : "transparent";
                  const color = isCorrect ? "#047857" : isPicked ? "#b91c1c" : "var(--text-muted)";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.6rem",
                      borderRadius: 8, background: bg, color, fontSize: "0.9rem",
                      fontWeight: isCorrect || isPicked ? 600 : 400,
                    }}>
                      <span style={{ width: 18, fontWeight: 700 }}>{String.fromCharCode(65 + i)}</span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {isCorrect && <i className="fas fa-check" style={{ color: "#10b981" }} />}
                      {isPicked && !isCorrect && <i className="fas fa-xmark" style={{ color: "#ef4444" }} />}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div style={{ marginTop: "0.6rem", marginLeft: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  <i className="fas fa-lightbulb" style={{ color: "#f59e0b", marginRight: "0.4rem" }} />
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center" }}>
        <button className="btn btn-primary" onClick={onContinue}>
          {continueLabel} <i className="fas fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
