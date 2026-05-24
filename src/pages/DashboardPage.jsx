import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchWeeklyActivity, fetchLeaderboard, fetchPracticeStats } from "../services/api";

// Weekly chart data – ready for Recharts drop-in:
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
// <BarChart data={weekData}><Bar dataKey="minutes" fill="#6366f1" /></BarChart>

// Build a deterministic-but-realistic weekly activity chart from the user's totalMinutes.
// BACKEND INTEGRATION: Replace with GET /api/user/activity/weekly → real per-day data.
function buildWeekData(totalMinutes = 0) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (totalMinutes === 0) return days.map((day) => ({ day, minutes: 0 }));
  // Spread totalMinutes across 7 days with a realistic pattern
  const weights = [0.18, 0.12, 0.2, 0.08, 0.16, 0.1, 0.16];
  return days.map((day, i) => ({
    day,
    minutes: Math.round(totalMinutes * weights[i]),
  }));
}

function WeeklyBar({ day, minutes, maxMinutes }) {
  const pct = Math.round((minutes / maxMinutes) * 100);
  const isMax = minutes === maxMinutes;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "6px",
        height: "100%",
        position: "relative",
        minWidth: "30px",
      }}
    >
      {isMax && (
        <div
          style={{
            position: "absolute",
            top: "-28px",
            background: "#6366f1",
            color: "white",
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
          }}
        >
          Best! {minutes}m
        </div>
      )}
      <div
        title={`${day}: ${minutes} min`}
        style={{
          width: "100%",
          height: `${Math.max(pct, 5)}%`,
          background: isMax
            ? "linear-gradient(180deg, #6366f1, #8b5cf6)"
            : "linear-gradient(180deg, #a5b4fc, #c7d2fe)",
          borderRadius: "6px 6px 0 0",
          transition: "height 0.8s cubic-bezier(0.25,0.8,0.25,1)",
          cursor: "default",
        }}
      />
      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--text-faint)",
          fontWeight: 600,
        }}
      >
        {day}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Correct field names from backend (/auth/me returns snake_case) ──────────
  const firstName = user?.full_name
    ? user.full_name.split(" ")[0]
    : user?.name?.split(" ")[0] || "Learner";

  // ── State: practice stats + weekly chart + leaderboard ─────────────────────
  const [practiceStats, setPracticeStats] = useState(null);
  const [weekData, setWeekData] = useState(() => buildWeekData(0));
  const [leaderboardData, setLeaderboardData] = useState(null);

  // Derive display values (fall back gracefully while loading)
  const language   = practiceStats?.language  || user?.preferred_language || user?.preferredLanguage || "English";
  const level      = practiceStats?.level     || user?.estimated_level    || user?.selected_level    || "B1";
  const streak     = practiceStats?.streak    ?? 0;
  const todayMins  = practiceStats?.today_minutes   ?? 0;
  const dailyGoal  = practiceStats?.daily_goal_minutes ?? 10;
  const goalPct    = dailyGoal > 0 ? Math.min(100, Math.round((todayMins / dailyGoal) * 100)) : 0;
  const todayDisplay = `${todayMins}m`;

  const maxMinutes = useMemo(() => Math.max(...weekData.map((d) => d.minutes), 1), [weekData]);
  const totalMins  = useMemo(() => weekData.reduce((a, b) => a + b.minutes, 0), [weekData]);
  const totalHours = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;

  // Fetch everything on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Practice stats (streak, today, goal, level, language)
      const stats = await fetchPracticeStats();
      if (mounted && stats) setPracticeStats(stats);

      // Weekly chart
      try {
        const activity = await fetchWeeklyActivity();
        if (mounted && Array.isArray(activity) && activity.some((d) => d.minutes > 0)) {
          setWeekData(activity.map((item) => ({ day: item.label, minutes: item.minutes })));
        }
      } catch (_) {}

      // Leaderboard
      try {
        const lb = await fetchLeaderboard();
        if (mounted && Array.isArray(lb) && lb.length > 0) setLeaderboardData(lb);
      } catch (_) {}
    };
    load();
    return () => { mounted = false; };
  }, []);

  // 👉 BACKEND: Replace with GET /api/leaderboard/weekly — real ranked data
  const leaderboard = [
    { rank: 1, name: "Alex Johnson", pts: "9,845", medal: "🥇" },
    { rank: 2, name: "Maria Garcia", pts: "9,120", medal: "🥈" },
    { rank: 3, name: "James Wilson", pts: "8,755", medal: "🥉" },
    {
      rank: 4,
      name: firstName + " (You)",
      pts: "7,980",
      medal: null,
      isUser: true,
    },
    { rank: 5, name: "Sarah Chen", pts: "7,430", medal: null },
  ];

  const displayedLeaderboard =
    leaderboardData && Array.isArray(leaderboardData)
      ? leaderboardData.map((item) => ({
          rank: item.rank,
          name: item.name,
          pts: `${item.minutes}m`,
          medal:
            item.rank === 1
              ? "🥇"
              : item.rank === 2
                ? "🥈"
                : item.rank === 3
                  ? "🥉"
                  : null,
          isUser: item.user_id === user?.id,
        }))
      : leaderboard;

  return (
    <div
      className="pg-wrapper"
      style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "3rem" }}
    >
      <div className="container">
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "2rem",
            padding: "1.5rem 0 0",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 800,
                color: "var(--text-base)",
                marginBottom: "0.25rem",
              }}
            >
              Welcome back, {firstName}! 👋
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Studying <strong>{language}</strong>
              {streak > 0 && <> · <span style={{ color: "#f59e0b" }}>🔥 {streak}-day streak</span></>}
            </p>
          </div>
          <button
            onClick={() => navigate("/assessment")}
            title="Retake assessment to update your level"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white",
              padding: "0.5rem 1.25rem",
              borderRadius: "99px",
              fontSize: "0.88rem",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
              flexShrink: 0,
              border: "none",
              cursor: "pointer",
            }}
          >
            <i className="fas fa-graduation-cap" /> Level: {level}
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            {
              icon: "fa-layer-group",
              value: level,
              label: "Current Level",
              grad: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            },
            {
              icon: "fa-fire",
              value: streak > 0 ? `${streak} 🔥` : "0",
              label: "Day Streak",
              grad: "linear-gradient(135deg,#10b981,#34d399)",
            },
            {
              icon: "fa-clock",
              value: todayDisplay,
              label: "Today's Practice",
              grad: "linear-gradient(135deg,#f59e0b,#fbbf24)",
            },
            {
              icon: "fa-bullseye",
              value: `${goalPct}%`,
              label: "Daily Goal",
              grad: "linear-gradient(135deg,#3b82f6,#60a5fa)",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "1.25rem",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  flexShrink: 0,
                  background: card.grad,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                }}
              >
                <i className={`fas ${card.icon}`} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "var(--text-base)",
                    lineHeight: 1,
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-faint)",
                    marginTop: "2px",
                  }}
                >
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Two column: goals + chart ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* Today's Goals */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "20px",
              padding: "1.75rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-base)",
                  margin: 0,
                }}
              >
                Today's Goals
              </h2>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/practice")}
                style={{ fontSize: "0.82rem", padding: "0.4rem 0.875rem" }}
              >
                View All
              </button>
            </div>

            {/* Daily progress */}
            <div
              style={{
                background: "var(--bg-subtle)",
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1.25rem",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Daily Practice Goal
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: goalPct >= 100 ? "#10b981" : "#6366f1",
                    fontWeight: 700,
                  }}
                >
                  {goalPct}%{goalPct >= 100 ? " ✓" : ""}
                </span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "#e5e7eb",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${goalPct}%`,
                    height: "100%",
                    background: goalPct >= 100
                      ? "linear-gradient(90deg,#10b981,#34d399)"
                      : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                    borderRadius: "99px",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-faint)",
                  marginTop: "0.5rem",
                }}
              >
                {todayMins} of {dailyGoal} minutes completed today
                {goalPct >= 100 && " 🎉"}
              </p>
            </div>

            {/* Exercises */}
            {[
              {
                icon: "fa-volume-up",
                title: "Pronunciation Practice",
                desc: "Complete 5 exercises",
                color: "#8b5cf6",
              },
              {
                icon: "fa-comments",
                title: "AI Conversation",
                desc: "Talk with AI for 10 minutes",
                color: "#10b981",
              },
              {
                icon: "fa-book",
                title: "Grammar Quiz",
                desc: "Complete 10 questions",
                color: "#f59e0b",
              },
            ].map((ex) => (
              <div
                key={ex.title}
                onClick={() => navigate("/practice")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  marginBottom: "0.5rem",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    flexShrink: 0,
                    background: ex.color + "18",
                    color: ex.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.95rem",
                  }}
                >
                  <i className={`fas ${ex.icon}`} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "var(--text-base)",
                    }}
                  >
                    {ex.title}
                  </div>
                  <div
                    style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}
                  >
                    {ex.desc}
                  </div>
                </div>
                <i
                  className="fas fa-chevron-right"
                  style={{
                    marginLeft: "auto",
                    color: "#d1d5db",
                    fontSize: "0.75rem",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Weekly Progress Chart */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "20px",
              padding: "1.75rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-base)",
                  margin: 0,
                }}
              >
                Weekly Progress
              </h2>
              <span
                style={{
                  fontSize: "0.78rem",
                  background: "#f0f0ff",
                  color: "#6366f1",
                  padding: "0.2rem 0.625rem",
                  borderRadius: "99px",
                  fontWeight: 700,
                }}
              >
                {totalHours} total
              </span>
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-faint)",
                marginBottom: "1.5rem",
              }}
            >
              Minutes practiced per day
            </p>

            {/* Bar chart container */}
            <div
              style={{
                height: "160px",
                display: "flex",
                alignItems: "flex-end",
                gap: "8px",
                paddingTop: "2rem" /* space for "Best!" label */,
                position: "relative",
              }}
            >
              {weekData.map((d) => (
                <WeeklyBar
                  key={d.day}
                  day={d.day}
                  minutes={d.minutes}
                  maxMinutes={maxMinutes}
                />
              ))}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "1.25rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  }}
                />
                Best day
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: "#c7d2fe",
                  }}
                />
                Other days
              </div>
            </div>
          </div>
        </div>

        {/* ── Leaderboard ── */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "20px",
            padding: "1.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "var(--text-base)",
                margin: 0,
              }}
            >
              Weekly Leaderboard
            </h2>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/community")}
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.875rem" }}
            >
              View All
            </button>
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {displayedLeaderboard.map((item) => (
              <div
                key={item.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "12px",
                  background: item.isUser
                    ? "rgba(99,102,241,0.12)"
                    : "var(--bg-subtle)",
                  border: item.isUser
                    ? "1.5px solid rgba(99,102,241,0.2)"
                    : "1.5px solid transparent",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      item.rank === 1
                        ? "#fef3c7"
                        : item.rank === 2
                          ? "#f1f5f9"
                          : item.rank === 3
                            ? "#fde8d0"
                            : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: item.medal ? "1rem" : "0.8rem",
                    fontWeight: 800,
                    color: "var(--text-muted)",
                  }}
                >
                  {item.medal || item.rank}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontWeight: item.isUser ? 800 : 500,
                    color: item.isUser ? "#6366f1" : "#374151",
                    fontSize: "0.92rem",
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: "#6366f1",
                    fontSize: "0.9rem",
                  }}
                >
                  {item.pts} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
