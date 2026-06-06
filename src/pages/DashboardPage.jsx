import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchWeeklyActivity, fetchLeaderboard, fetchPracticeStats, fetchPracticeProgress, savePracticeProgress } from "../services/api";

// Weekly chart data – ready for Recharts drop-in:
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
// <BarChart data={weekData}><Bar dataKey="minutes" fill="#6366f1" /></BarChart>

// Build an empty 7-day chart (used only while real data loads)
function buildEmptyWeekData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, minutes: 0 }));
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

function SkeletonBox({ width = "100%", height = "20px", radius = "8px", style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--bg-subtle, #f3f4f6)",
        backgroundImage: "linear-gradient(90deg, var(--bg-subtle, #f3f4f6) 25%, var(--bg-hover, #e9ebee) 50%, var(--bg-subtle, #f3f4f6) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.5s infinite",
        ...style,
      }}
    />
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
  const [practiceProgress, setPracticeProgress] = useState(null);
  const [weekData, setWeekData] = useState(() => buildEmptyWeekData());
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

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

  // ── Derive personalised activity suggestions ───────────────────────────────
  const suggestedActivities = useMemo(() => {
    const ALL_ACTIVITIES = [
      { key: "speaking",   icon: "fa-microphone",  title: "Speaking Practice",      desc: "Record yourself speaking aloud",           color: "#8b5cf6" },
      { key: "writing",    icon: "fa-pen-nib",      title: "Writing Exercise",        desc: "Write a short paragraph & get AI feedback", color: "#10b981" },
      { key: "grammar",    icon: "fa-book",         title: "Grammar Quiz",            desc: "Test your grammar with AI questions",       color: "#f59e0b" },
      { key: "listening",  icon: "fa-volume-up",    title: "Listening Exercise",      desc: "Listen and answer comprehension questions", color: "#3b82f6" },
      { key: "reading",    icon: "fa-glasses",      title: "Reading Comprehension",   desc: "Read a passage and answer questions",       color: "#ec4899" },
      { key: "flashcards", icon: "fa-layer-group",  title: "Vocabulary Flashcards",   desc: "Review and learn new vocabulary",           color: "#14b8a6" },
    ];

    const cards = [];

    // 1) Streak at risk? If streak > 0 but no practice yet today, surface it first
    if (streak > 0 && todayMins === 0) {
      cards.push({
        icon: "fa-fire",
        title: `Keep your ${streak}-day streak!`,
        desc: "Practice anything today to maintain it",
        color: "#f97316",
        urgent: true,
      });
    }

    // 2) Goal not met? Add a nudge
    if (goalPct < 100) {
      const minsLeft = Math.max(0, dailyGoal - todayMins);
      cards.push({
        icon: "fa-bullseye",
        title: goalPct === 0 ? "Start today's practice" : `${minsLeft}m left to hit goal`,
        desc: `You've done ${todayMins} of ${dailyGoal} minutes today`,
        color: "#6366f1",
      });
    }

    // 3) Weakest sub-type (least sessions/exercises from practiceProgress)
    if (practiceProgress) {
      const subScores = [
        { key: "speaking",   score: (practiceProgress.speaking?.sessions || 0) },
        { key: "writing",    score: (practiceProgress.writing?.submissions || 0) },
        { key: "grammar",    score: (practiceProgress.grammar?.exercises || 0) },
        { key: "listening",  score: (practiceProgress.listening?.exercises || 0) },
        { key: "reading",    score: (practiceProgress.reading?.articles || 0) },
        { key: "flashcards", score: (practiceProgress.flashcards?.sessions || 0) },
      ];
      subScores.sort((a, b) => a.score - b.score);
      const weakest = subScores[0].key;
      const act = ALL_ACTIVITIES.find((a) => a.key === weakest);
      if (act) cards.push({ ...act, desc: `Your weakest area — ${act.desc}` });
    }

    // 4) Fill up to 3 cards with remaining activities not yet shown
    const shownKeys = cards.filter((c) => c.key).map((c) => c.key);
    for (const act of ALL_ACTIVITIES) {
      if (cards.length >= 3) break;
      if (!shownKeys.includes(act.key)) cards.push(act);
    }

    return cards.slice(0, 3);
  }, [practiceProgress, streak, todayMins, goalPct, dailyGoal]);

  // Fetch everything on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Practice stats (streak, today, goal, level, language)
      const stats = await fetchPracticeStats();
      if (mounted) {
        if (stats) {
          setPracticeStats(stats);
          // Also load sub-type breakdown for activity card personalisation
          try {
            const prog = await fetchPracticeProgress(
              stats.language || user?.preferred_language || "English"
            );
            if (mounted && prog) setPracticeProgress(prog);
          } catch (err) { console.warn("Practice progress fetch failed:", err); }
        }
        setStatsLoading(false);
      }

      // Weekly chart — always use real backend data (zeros are valid)
      try {
        const activity = await fetchWeeklyActivity();
        if (mounted && Array.isArray(activity) && activity.length > 0) {
          setWeekData(activity.map((item) => ({ day: item.label, minutes: item.minutes || 0 })));
        }
      } catch (err) { console.warn("Weekly activity fetch failed:", err); }
      if (mounted) setChartLoading(false);

      // Leaderboard
      try {
        const lb = await fetchLeaderboard();
        if (mounted && Array.isArray(lb) && lb.length > 0) setLeaderboardData(lb);
      } catch (err) { console.warn("Leaderboard fetch failed:", err); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);

  const handleSaveGoal = async () => {
    const mins = parseInt(goalInput);
    if (!mins || mins < 1 || mins > 300) return;
    setGoalSaving(true);
    try {
      await savePracticeProgress({ daily_goal_minutes: mins, language });
      setPracticeStats((prev) => ({ ...prev, daily_goal_minutes: mins }));
      setGoalEditing(false);
    } catch (e) {
      console.error("Failed to save goal:", e);
    } finally {
      setGoalSaving(false);
    }
  };

  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const displayedLeaderboard =
    leaderboardData && Array.isArray(leaderboardData) && leaderboardData.length > 0
      ? leaderboardData.map((item) => ({
          rank: item.rank,
          name: item.user_id === user?.id ? `${item.name} (You)` : item.name,
          pts: `${item.minutes}m`,
          medal: MEDALS[item.rank] || null,
          isUser: item.user_id === user?.id,
        }))
      : [];

  return (
    <div
      className="pg-wrapper"
      style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "3rem" }}
    >
      {/* ── Email verification banner ── */}
      {user && user.is_verified === false && (
        <div style={{
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "12px",
          padding: "0.875rem 1.25rem",
          margin: "80px 1rem 0",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}>
          <i className="fas fa-envelope" style={{ color: "#f59e0b", fontSize: "1rem" }} />
          <span style={{ color: "#92400e", fontSize: "0.9rem", fontWeight: 600, flex: 1 }}>
            Please verify your email address — check your inbox for a link we sent when you signed up.
          </span>
        </div>
      )}

      {/* ── Retake Assessment confirmation modal ── */}
      {showRetakeConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowRetakeConfirm(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📝</div>
            <h3 style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-base)", marginBottom: "0.5rem" }}>
              Retake Assessment?
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              This will start a new placement test and may update your current level ({level}). Your practice history won't be affected.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => setShowRetakeConfirm(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowRetakeConfirm(false); navigate("/assessment"); }}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.65rem 1rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Yes, retake
              </button>
            </div>
          </div>
        </div>
      )}
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
            onClick={() => setShowRetakeConfirm(true)}
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
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: "16px",
                    padding: "1.25rem",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <SkeletonBox width="52px" height="52px" radius="14px" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <SkeletonBox width="60%" height="28px" radius="6px" />
                    <SkeletonBox width="80%" height="14px" radius="4px" />
                  </div>
                </div>
              ))
            : [
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
              ))
          }
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
                <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                  <span style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--text-muted)" }}>
                    Daily Practice Goal
                  </span>
                  <button
                    onClick={() => { setGoalInput(String(dailyGoal)); setGoalEditing(true); }}
                    title="Edit goal"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:"0.75rem", padding:"0 2px", lineHeight:1 }}
                  >
                    <i className="fas fa-pen" />
                  </button>
                </div>
                <span style={{ fontSize:"0.8rem", color: goalPct >= 100 ? "#10b981" : "#6366f1", fontWeight:700 }}>
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
              {goalEditing && (
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginTop:"0.6rem" }}>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveGoal()}
                    autoFocus
                    style={{ width:70, padding:"0.3rem 0.5rem", borderRadius:8, border:"1.5px solid #6366f1", fontSize:"0.85rem", outline:"none" }}
                  />
                  <span style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>min/day</span>
                  <button
                    onClick={handleSaveGoal}
                    disabled={goalSaving}
                    style={{ padding:"0.3rem 0.75rem", background:"#6366f1", color:"#fff", border:"none", borderRadius:8, fontSize:"0.82rem", fontWeight:700, cursor:"pointer" }}
                  >
                    {goalSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setGoalEditing(false)}
                    style={{ padding:"0.3rem 0.6rem", background:"transparent", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:8, fontSize:"0.82rem", cursor:"pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Personalised activity suggestions */}
            {suggestedActivities.map((ex, idx) => (
              <div
                key={idx}
                onClick={() => navigate(ex.key ? `/practice?tab=${ex.key}` : "/practice")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  marginBottom: "0.5rem",
                  border: ex.urgent ? `1px solid ${ex.color}33` : "none",
                  background: ex.urgent ? `${ex.color}08` : "transparent",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = ex.urgent ? `${ex.color}12` : "var(--bg-hover)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = ex.urgent ? `${ex.color}08` : "transparent")
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
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {ex.title}
                    {ex.urgent && (
                      <span style={{ fontSize: "0.7rem", background: ex.color, color: "#fff", padding: "1px 6px", borderRadius: "99px", fontWeight: 700 }}>
                        Today!
                      </span>
                    )}
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
                paddingTop: "2rem",
                position: "relative",
              }}
            >
              {chartLoading
                ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => (
                    <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                      <SkeletonBox
                        width="100%"
                        height={`${30 + (i % 3) * 30}px`}
                        radius="6px 6px 0 0"
                      />
                      <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontWeight: 600 }}>{day}</span>
                    </div>
                  ))
                : weekData.map((d) => (
                    <WeeklyBar
                      key={d.day}
                      day={d.day}
                      minutes={d.minutes}
                      maxMinutes={maxMinutes}
                    />
                  ))
              }
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
            {displayedLeaderboard.length === 0 && (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏅</div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
                  Complete practice sessions to appear on the leaderboard!
                </p>
              </div>
            )}
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
