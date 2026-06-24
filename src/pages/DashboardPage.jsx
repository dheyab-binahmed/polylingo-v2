import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./polish.css";
import { fetchWeeklyActivity, fetchLeaderboard, fetchPracticeStats, fetchPracticeProgress, savePracticeProgress } from "../services/api";

// Weekly chart data – ready for Recharts drop-in:
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
// <BarChart data={weekData}><Bar dataKey="minutes" fill="#6366f1" /></BarChart>

// Build an empty 7-day chart (used only while real data loads)
function buildEmptyWeekData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, minutes: 0 }));
}

// Map a 0–100 score to a CEFR band (mirrors the Assessment ResultsStep bands)
function scoreToCEFR(s) {
  const v = Math.max(0, Math.min(100, Number(s) || 0));
  if (v >= 90) return "C2";
  if (v >= 75) return "C1";
  if (v >= 60) return "B2";
  if (v >= 45) return "B1";
  if (v >= 30) return "A2";
  return "A1";
}

function WeeklyBar({ day, minutes, maxMinutes }) {
  const pct = Math.round((minutes / maxMinutes) * 100);
  const isMax = minutes > 0 && minutes === maxMinutes;
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
      {minutes > 0 && (
        <span
          style={{
            fontSize: "0.66rem",
            fontWeight: 700,
            color: isMax ? "#6366f1" : "var(--text-faint)",
            whiteSpace: "nowrap",
          }}
        >
          {minutes}m
        </span>
      )}
      <div
        title={`${day}: ${minutes} min`}
        style={{
          width: "76%",
          height: `${Math.max(pct, 5)}%`,
          background: isMax
            ? "linear-gradient(180deg, #6366f1, #8b5cf6)"
            : "linear-gradient(180deg, #a5b4fc, #c7d2fe)",
          borderRadius: "8px 8px 0 0",
          boxShadow: isMax ? "0 6px 14px rgba(99,102,241,0.30)" : "none",
          transition: "height 0.8s cubic-bezier(0.25,0.8,0.25,1), filter 0.15s ease, transform 0.15s ease",
          cursor: "default",
        }}
        onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.08) saturate(1.1)"; e.currentTarget.style.transform = "scaleY(1.03)"; e.currentTarget.style.transformOrigin = "bottom"; }}
        onMouseOut={(e) => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}
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
  const level      = practiceStats?.level     || user?.estimated_level    || user?.selected_level    || "A1";
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

  // ── Quick actions: every practice mode as a tappable tile ──────────────────
  const QUICK_ACTIONS = [
    { key: "tutor",         icon: "fa-robot",        label: "AI Tutor",       color: "#6366f1" },
    { key: "flashcards",    icon: "fa-layer-group",  label: "Flashcards",     color: "#14b8a6" },
    { key: "grammar",       icon: "fa-book",         label: "Grammar",        color: "#f59e0b" },
    { key: "reading",       icon: "fa-glasses",      label: "Reading",        color: "#ec4899" },
    { key: "listening",     icon: "fa-volume-up",    label: "Listening",      color: "#3b82f6" },
    { key: "writing",       icon: "fa-pen-nib",      label: "Writing",        color: "#10b981" },
    { key: "speaking",      icon: "fa-microphone",   label: "Speaking",       color: "#8b5cf6" },
    { key: "pronunciation", icon: "fa-comment-dots", label: "Pronunciation",  color: "#f97316" },
  ];

  // ── CEFR skill mastery: prefer last assessment scores, fall back to practice accuracy ──
  const skillMastery = useMemo(() => {
    let a = {};
    try { a = JSON.parse(localStorage.getItem("polylingo_assessment_data")) || {}; } catch { a = {}; }
    const pct = (num, den) => (den ? Math.round((num / den) * 100) : null);
    const fromAssess = {
      speaking:  (a.speakingScore ?? a.fluencyScore) != null ? Math.round((a.speakingScore ?? a.fluencyScore) * 10) : null,
      writing:   a.writingScore != null ? Math.round((a.writingScore / (a.writingTotal || 10)) * 100) : null,
      listening: a.listeningScore != null && a.listeningTotal ? Math.round((a.listeningScore / a.listeningTotal) * 100) : null,
      reading:   a.readingScore != null && a.readingTotal ? Math.round((a.readingScore / a.readingTotal) * 100) : null,
    };
    const pp = practiceProgress || {};
    const fallback = {
      speaking:  null,
      writing:   pp.writing?.submissions ? Math.round((pp.writing.totalScore / pp.writing.submissions) * 10) : null,
      listening: pct(pp.listening?.totalCorrect, pp.listening?.totalAttempted),
      reading:   pct(pp.reading?.totalCorrect, pp.reading?.totalAttempted),
    };
    const meta = [
      { key: "speaking",  label: "Speaking",  icon: "fa-comments",   color: "#10b981" },
      { key: "writing",   label: "Writing",   icon: "fa-pen",        color: "#8b5cf6" },
      { key: "listening", label: "Listening", icon: "fa-headphones", color: "#f59e0b" },
      { key: "reading",   label: "Reading",   icon: "fa-book-reader",color: "#3b82f6" },
    ];
    return meta.map((m) => {
      let score = fromAssess[m.key];
      if (score == null) score = fallback[m.key];
      if (score != null) score = Math.max(0, Math.min(100, score));
      return { ...m, score, cefr: score == null ? null : scoreToCEFR(score) };
    });
  }, [practiceProgress]);
  const hasAnyMastery = skillMastery.some((s) => s.score != null);

  // ── Vocabulary ──
  const wordsLearned     = practiceProgress?.flashcards?.wordsLearned ?? 0;
  const flashcardSessions = practiceProgress?.flashcards?.sessions ?? 0;

  // ── Continue: the top personalised next step ──
  const continueTarget = suggestedActivities[0] || {
    key: "tutor", icon: "fa-robot", title: "Start practicing", desc: "Pick up where you left off", color: "#6366f1",
  };

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
        {/* ── Hero Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginTop: "0.5rem",
            marginBottom: "2rem",
            padding: "1.85rem 1.85rem",
            background: "linear-gradient(135deg, #6366f1 0%, #7c6cf0 50%, #8b5cf6 100%)",
            borderRadius: "24px",
            boxShadow: "0 18px 44px rgba(99,102,241,0.30)",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* soft decorative glow — purely visual */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-40%",
              right: "-5%",
              width: "320px",
              height: "320px",
              background: "radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.02em",
                marginBottom: "0.35rem",
              }}
            >
              Welcome back, {firstName}! 👋
            </h1>
            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.98rem" }}>
              Studying <strong style={{ color: "#fff" }}>{language}</strong>
              {streak > 0 && <> · <span style={{ color: "#fde68a", fontWeight: 700 }}>🔥 {streak}-day streak</span></>}
            </p>
          </div>
          <button
            onClick={() => setShowRetakeConfirm(true)}
            title="Retake assessment to update your level"
            style={{
              position: "relative",
              zIndex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              padding: "0.6rem 1.25rem",
              borderRadius: "99px",
              fontSize: "0.88rem",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.35)",
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
                    borderRadius: "18px",
                    padding: "1.35rem",
                    border: "1px solid var(--border)",
                    boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
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
                  c: "#6366f1",
                },
                {
                  icon: "fa-fire",
                  value: streak > 0 ? `${streak} 🔥` : "0",
                  label: "Day Streak",
                  grad: "linear-gradient(135deg,#10b981,#34d399)",
                  c: "#10b981",
                },
                {
                  icon: "fa-clock",
                  value: todayDisplay,
                  label: "Today's Practice",
                  grad: "linear-gradient(135deg,#f59e0b,#fbbf24)",
                  c: "#f59e0b",
                },
                {
                  icon: "fa-bullseye",
                  value: `${goalPct}%`,
                  label: "Daily Goal",
                  grad: "linear-gradient(135deg,#3b82f6,#60a5fa)",
                  c: "#3b82f6",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    background: `color-mix(in srgb, ${card.c} 7%, var(--bg-card))`,
                    borderRadius: "18px",
                    padding: "1.4rem",
                    border: `1px solid color-mix(in srgb, ${card.c} 22%, var(--border))`,
                    boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 14px 30px color-mix(in srgb, ${card.c} 25%, transparent)`;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(17,24,39,0.06)";
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                      flexShrink: 0,
                      background: card.grad,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.35rem",
                      boxShadow: `0 8px 18px color-mix(in srgb, ${card.c} 40%, transparent)`,
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

        {/* ── Continue + Vocabulary (bento) ── */}
        <div className="dash-bento">
          {/* Continue learning */}
          <div
            className="col-8"
            onClick={() => navigate(continueTarget.key ? `/practice?tab=${continueTarget.key}` : "/practice")}
            style={{
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              borderRadius: "20px",
              padding: "1.6rem 1.75rem",
              border: `1px solid ${continueTarget.color}33`,
              background: `linear-gradient(135deg, ${continueTarget.color}16, var(--bg-card) 62%)`,
              boxShadow: "0 6px 20px rgba(17,24,39,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 14px 30px ${continueTarget.color}26`; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(17,24,39,0.05)"; }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 18, flexShrink: 0, background: continueTarget.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", boxShadow: `0 8px 18px ${continueTarget.color}55` }}>
              <i className={`fas ${continueTarget.icon}`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: continueTarget.color, marginBottom: 4 }}>Continue learning</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-base)", marginBottom: 2 }}>{continueTarget.title}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{continueTarget.desc}</div>
            </div>
            <div style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.5rem", background: continueTarget.color, color: "#fff", padding: "0.6rem 1.15rem", borderRadius: "99px", fontWeight: 700, fontSize: "0.9rem" }}>
              Resume <i className="fas fa-arrow-right" />
            </div>
          </div>

          {/* Vocabulary */}
          <div className="col-4 dash-card" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "#14b8a61f", color: "#14b8a6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fas fa-layer-group" />
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-base)", margin: 0 }}>Vocabulary</h2>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, background: "var(--bg-subtle)", borderRadius: 14, padding: "0.85rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-base)", lineHeight: 1 }}>{wordsLearned}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: 4 }}>Words learned</div>
              </div>
              <div style={{ flex: 1, background: "var(--bg-subtle)", borderRadius: 14, padding: "0.85rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-base)", lineHeight: 1 }}>{flashcardSessions}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: 4 }}>Sessions</div>
              </div>
            </div>
            <button onClick={() => navigate("/practice?tab=flashcards")} className="btn btn-primary" style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}>
              <i className="fas fa-sync-alt" /> Review flashcards
            </button>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="dash-bento">
          <div className="col-12 dash-card">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-base)", margin: "0 0 1rem" }}>Jump into practice</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.75rem" }}>
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q.key}
                  onClick={() => navigate(`/practice?tab=${q.key}`)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
                    padding: "1.1rem 0.5rem", borderRadius: 16, cursor: "pointer",
                    background: `color-mix(in srgb, ${q.color} 8%, var(--bg-card))`,
                    border: `1px solid color-mix(in srgb, ${q.color} 22%, var(--border))`,
                    transition: "transform 0.16s ease, box-shadow 0.16s ease",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 10px 22px color-mix(in srgb, ${q.color} 28%, transparent)`; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: q.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", boxShadow: `0 6px 14px ${q.color}55` }}>
                    <i className={`fas ${q.icon}`} />
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-base)" }}>{q.label}</span>
                </button>
              ))}
            </div>
          </div>
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
              border: "1px solid var(--border)",
              boxShadow: "0 6px 20px rgba(17,24,39,0.05)",
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: "#6366f11f", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-bullseye" />
                </div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-base)", margin: 0 }}>
                  Today's Goals
                </h2>
              </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
                {/* Circular progress ring */}
                <div style={{ position: "relative", width: 86, height: 86, flexShrink: 0 }}>
                  <svg width="86" height="86" viewBox="0 0 86 86">
                    <defs>
                      <linearGradient id="goalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={goalPct >= 100 ? "#10b981" : "#6366f1"} />
                        <stop offset="100%" stopColor={goalPct >= 100 ? "#34d399" : "#8b5cf6"} />
                      </linearGradient>
                    </defs>
                    <circle cx="43" cy="43" r="37" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle
                      cx="43" cy="43" r="37" fill="none"
                      stroke="url(#goalRingGrad)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 37}
                      strokeDashoffset={(2 * Math.PI * 37) * (1 - goalPct / 100)}
                      transform="rotate(-90 43 43)"
                      style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.25,0.8,0.25,1)" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-base)", lineHeight: 1 }}>{goalPct}%</span>
                    {goalPct >= 100 && <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700, marginTop: 2 }}>done ✓</span>}
                  </div>
                </div>
                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-base)" }}>
                      Daily Practice Goal
                    </span>
                    <button
                      onClick={() => { setGoalInput(String(dailyGoal)); setGoalEditing(true); }}
                      title="Edit goal"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.75rem", padding: "0 2px", lineHeight: 1 }}
                    >
                      <i className="fas fa-pen" />
                    </button>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: goalPct >= 100 ? "#10b981" : "#6366f1", fontSize: "1.05rem" }}>{todayMins}</strong>
                    {" "}of {dailyGoal} minutes today{goalPct >= 100 && " 🎉"}
                  </p>
                </div>
              </div>
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
                  padding: "0.9rem",
                  borderRadius: "14px",
                  cursor: "pointer",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
                  marginBottom: "0.6rem",
                  border: ex.urgent ? `1px solid ${ex.color}55` : "1px solid var(--border)",
                  background: ex.urgent ? `${ex.color}10` : "var(--bg-subtle)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateX(3px)";
                  e.currentTarget.style.borderColor = ex.color;
                  e.currentTarget.style.boxShadow = `0 6px 16px ${ex.color}22`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.borderColor = ex.urgent ? `${ex.color}55` : "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    background: ex.color + "1f",
                    color: ex.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
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
              border: "1px solid var(--border)",
              boxShadow: "0 6px 20px rgba(17,24,39,0.05)",
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: "#8b5cf61f", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-chart-bar" />
                </div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-base)", margin: 0 }}>
                  Weekly Progress
                </h2>
              </div>
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
                height: "170px",
                display: "flex",
                alignItems: "flex-end",
                gap: "8px",
                paddingTop: "2rem",
                position: "relative",
                backgroundImage:
                  "repeating-linear-gradient(to top, transparent, transparent 41px, var(--border) 41px, var(--border) 42px)",
                backgroundPosition: "bottom",
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

        {/* ── CEFR skill mastery ── */}
        <div className="dash-bento">
          <div className="col-12 dash-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-base)", margin: 0 }}>
                Skill Mastery <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-faint)" }}>· CEFR by skill</span>
              </h2>
              <button className="btn btn-outline" onClick={() => navigate("/assessment")} style={{ fontSize: "0.82rem", padding: "0.4rem 0.875rem" }}>
                {hasAnyMastery ? "Retake assessment" : "Take assessment"}
              </button>
            </div>
            {!hasAnyMastery ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯</div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                  Take the assessment to see your CEFR level in each skill.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.1rem" }}>
                {skillMastery.map((s) => (
                  <div key={s.key} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 16, padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.7rem" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: s.color + "1f", color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={`fas ${s.icon}`} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-base)", flex: 1 }}>{s.label}</span>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem", color: s.score == null ? "var(--text-faint)" : s.color }}>{s.cefr || "—"}</span>
                    </div>
                    <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${s.score || 0}%`, height: "100%", background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`, borderRadius: 99, transition: "width 0.7s ease" }} />
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: 6 }}>
                      {s.score == null ? "Not assessed yet" : `${s.score}%`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Leaderboard ── */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "20px",
            padding: "1.75rem",
            border: "1px solid var(--border)",
            boxShadow: "0 6px 20px rgba(17,24,39,0.05)",
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: "#f59e0b1f", color: "#f59e0b", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-trophy" />
                </span>
                Weekly Leaderboard
              </span>
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
                  padding: "0.7rem 1rem",
                  borderRadius: "14px",
                  background: item.isUser
                    ? "color-mix(in srgb, #6366f1 12%, var(--bg-card))"
                    : "var(--bg-subtle)",
                  border: item.isUser
                    ? "1.5px solid color-mix(in srgb, #6366f1 35%, transparent)"
                    : "1.5px solid var(--border)",
                  transition: "transform 0.16s ease, box-shadow 0.16s ease",
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(17,24,39,0.07)"; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Rank / medal badge */}
                <div
                  style={{
                    width: "26px",
                    textAlign: "center",
                    flexShrink: 0,
                    fontSize: item.medal ? "1.15rem" : "0.85rem",
                    fontWeight: 800,
                    color: "var(--text-faint)",
                  }}
                >
                  {item.medal || item.rank}
                </div>
                {/* Avatar with initials */}
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: item.isUser
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "linear-gradient(135deg,#cbd5e1,#94a3b8)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    boxShadow: "0 2px 8px rgba(17,24,39,0.12)",
                  }}
                >
                  {item.name.replace(/\s*\(You\)\s*$/, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontWeight: item.isUser ? 800 : 600,
                    color: item.isUser ? "#6366f1" : "var(--text-base)",
                    fontSize: "0.92rem",
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    color: "#6366f1",
                    fontSize: "0.82rem",
                    background: "color-mix(in srgb, #6366f1 12%, transparent)",
                    padding: "0.3rem 0.7rem",
                    borderRadius: "99px",
                    flexShrink: 0,
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
