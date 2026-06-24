import { buildHeatmap } from "../utils/activityLog";

// Compact progress widget: an animated daily-goal ring + a GitHub-style
// practice heatmap. Reads the per-day activity log; today's live minutes are
// merged in so the current day reflects the in-session total.
export default function PracticeActivity({ userId, today = 0, goal = 10, streak = 0, refreshKey = 0 }) {
  const cells = buildHeatmap(userId, 12);
  // Merge live "today" minutes into the last cell.
  if (cells.length) {
    const last = cells[cells.length - 1];
    last.minutes = Math.max(last.minutes, today);
  }

  // colour scale by minutes
  const colorFor = (m) =>
    m <= 0 ? "var(--border)" :
    m < 5 ? "rgba(99,102,241,0.35)" :
    m < 10 ? "rgba(99,102,241,0.6)" :
    m < 20 ? "rgba(99,102,241,0.82)" : "#4f46e5";

  // group cells into weeks (columns)
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // goal ring geometry
  const R = 26, C = 2 * Math.PI * R;
  const pct = Math.min(1, goal ? today / goal : 0);
  const done = pct >= 1;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", margin: "0.5rem auto 0", maxWidth: 640 }}>
      {/* Goal ring */}
      <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }} title={`${today}/${goal} min today`}>
        <svg viewBox="0 0 64 64" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={done ? "#10b981" : "#6366f1"} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - pct * C}
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {done
            ? <i className="fas fa-check" style={{ color: "#10b981", fontSize: "1.1rem" }} />
            : <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-base)" }}>{Math.round(pct * 100)}%</span>}
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((wk, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {wk.map((c) => (
                <div key={c.date} title={`${c.date}: ${c.minutes} min`}
                  style={{ width: 11, height: 11, borderRadius: 3, background: colorFor(c.minutes) }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          <span><i className="fas fa-fire" style={{ color: "#f59e0b", marginRight: 4 }} />{streak} day streak</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Less
            {[0, 4, 9, 19, 25].map((m) => (
              <span key={m} style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(m) }} />
            ))}
            More
          </span>
        </div>
      </div>
    </div>
  );
}
