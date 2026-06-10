import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "../../context/AuthContext";
import { useAssessment } from "./assessmentContext";
import {
  getAssessmentContent,
  codeToFullName,
} from "../../data/assessmentContent";
import { recordAttempt, loadHistory } from "./assessmentExtras";
import { downloadCertificate } from "./certificate";

// ── CEFR scale (mirrors backend app/modules/cefr.py CEFR_BANDS) ──────────────
// Scores are 0–100. The four skills (Speaking, Writing, Listening, Reading) are
// each mapped to a CEFR level, then combined with EQUAL weight (25% each) into
// an overall band. This follows the CEFR four-skill convention.
const CEFR_BANDS = [
  [90, "C2"],
  [80, "C1"],
  [70, "B2"],
  [55, "B1"],
  [40, "A2"],
  [0, "A1"],
];

function scoreToCEFR(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  for (const [threshold, label] of CEFR_BANDS) {
    if (s >= threshold) return label;
  }
  return "A1";
}

const CEFR_COLOR = {
  A1: "#ef4444",
  A2: "#f59e0b",
  B1: "#6366f1",
  B2: "#3b82f6",
  C1: "#10b981",
  C2: "#059669",
};

const CEFR_DESC = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

// ── Score-driven learning plan ───────────────────────────────────────────────
// Each skill has a recommendation tuned to the score band the student landed in
// (low <55, mid 55–79, high ≥80 — same thresholds as the CEFR bands above). The
// plan surfaces the student's WEAKEST attempted skills first, so the advice
// actually reflects how they did instead of being a fixed list.
const SKILL_PLANS = {
  speaking: {
    icon: "fa-microphone", color: "#8b5cf6",
    low: { title: "Pronunciation & Speaking Basics", desc: "Read short passages aloud daily and focus on clear {lang} vowel sounds and intonation." },
    mid: { title: "Speaking Fluency", desc: "Talk with the AI tutor in {lang} for 10–15 minutes a day to reduce pauses and build flow." },
    high: { title: "Speaking Polish", desc: "Debate opinions and tell longer stories in {lang} to sharpen nuance and natural intonation." },
  },
  writing: {
    icon: "fa-pencil-alt", color: "#8b5cf6",
    low: { title: "Writing Foundations", desc: "Write 3–4 short {lang} sentences a day and review basic grammar and word order." },
    mid: { title: "Writing Development", desc: "Write a short paragraph daily in {lang} and practice linking ideas with connectors." },
    high: { title: "Advanced Writing", desc: "Write structured essays in {lang} and refine register, precision and style." },
  },
  listening: {
    icon: "fa-headphones", color: "#f59e0b",
    low: { title: "Listening Basics", desc: "Listen to slow, simple {lang} clips daily and replay them until you catch key words." },
    mid: { title: "Listening Comprehension", desc: "Listen to short {lang} dialogues and summarise what you heard in your own words." },
    high: { title: "Advanced Listening", desc: "Follow native-speed {lang} podcasts or news and note idioms and fast speech." },
  },
  reading: {
    icon: "fa-book-reader", color: "#3b82f6",
    low: { title: "Reading Basics", desc: "Read short, simple {lang} texts daily and build a vocabulary journal." },
    mid: { title: "Reading Comprehension", desc: "Read {lang} articles and practice answering questions about the main idea and details." },
    high: { title: "Advanced Reading", desc: "Read longer {lang} texts and analyse tone, argument and nuanced vocabulary." },
  },
};

function bandFor(score) {
  if (score < 55) return "low";
  if (score < 80) return "mid";
  return "high";
}

// Build a personalized plan from the attempted skills, weakest first. Always
// includes a daily-conversation habit. Falls back to the static per-language
// list when no skill scores are available.
function buildLearningPlan(skills, language, fallback) {
  const attempted = skills.filter((s) => s.score != null);
  if (attempted.length === 0) return fallback;

  const lang = language;
  const weakestFirst = [...attempted].sort((a, b) => a.score - b.score);

  const plan = weakestFirst.slice(0, 3).map((s) => {
    const tpl = SKILL_PLANS[s.key][bandFor(s.score)];
    return {
      title: tpl.title,
      desc: tpl.desc.replaceAll("{lang}", lang),
      icon: SKILL_PLANS[s.key].icon,
      color: SKILL_PLANS[s.key].color,
    };
  });

  // Always reinforce daily conversation with the AI tutor.
  if (!plan.some((p) => /conversation|tutor/i.test(p.title))) {
    plan.push({
      title: "Daily Conversation",
      desc: `Practice with the AI tutor in ${lang} for 15 minutes daily to build everyday fluency.`,
      icon: "fa-comments",
      color: "#10b981",
    });
  }
  return plan;
}

function SkillCard({ label, icon, score100, color }) {
  const cefr = scoreToCEFR(score100);
  const pct = Math.round(score100);
  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: "16px",
        padding: "1.25rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        textAlign: "center",
        border: `2px solid ${color}25`,
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: color + "18",
          color: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 0.75rem",
          fontSize: "1.1rem",
        }}
      >
        <i className={`fas ${icon}`} />
      </div>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color: CEFR_COLOR[cefr], lineHeight: 1 }}>
        {cefr}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "3px" }}>
        {pct}/100
      </div>
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-base)", marginTop: "0.5rem" }}>
        {label}
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden", marginTop: "0.6rem" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

export default function ResultsStep() {
  const { data } = useAssessment();
  const navigate = useNavigate();
  const { completeAssessment, user } = useAuth();

  if (!data || !data.language) {
    return (
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.25rem", textAlign: "center" }}>
        <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "12px", padding: "2rem", marginBottom: "2rem" }}>
          <i className="fas fa-info-circle" style={{ fontSize: "2rem", color: "#92400e", marginBottom: "1rem", display: "block" }} />
          <h2 style={{ color: "#92400e", margin: "0.5rem 0" }}>No Assessment Data</h2>
          <p style={{ color: "#92400e", margin: "0.5rem 0 1rem 0" }}>Please complete all assessment sections first.</p>
        </div>
        <button
          onClick={() => navigate("/assessment/language")}
          style={{ background: "#6366f1", color: "white", border: "none", padding: "0.75rem 1.5rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.6rem" }}
        >
          <i className="fas fa-arrow-left" /> Start Assessment
        </button>
      </div>
    );
  }

  const langContent = getAssessmentContent(data.language);
  const languageFullName = codeToFullName(data.language);

  // ── Convert each skill to a 0–100 score ────────────────────────────────────
  // Speaking is stored on a 0–10 scale → ×10. The MCQ/writing skills are stored
  // as correct/total (or 0–10 for writing) → scaled to 0–100.
  const speaking100 =
    data.speakingScore != null || data.fluencyScore != null
      ? Math.round((data.speakingScore ?? data.fluencyScore ?? 0) * 10)
      : null;

  const writing100 =
    data.writingScore != null && data.writingTotal > 0
      ? Math.round((data.writingScore / data.writingTotal) * 100)
      : null;

  const listening100 =
    data.listeningScore != null && data.listeningTotal > 0
      ? Math.round((data.listeningScore / data.listeningTotal) * 100)
      : null;

  const reading100 =
    data.readingScore != null && data.readingTotal > 0
      ? Math.round((data.readingScore / data.readingTotal) * 100)
      : null;

  const skills = [
    { key: "speaking", label: "Speaking", icon: "fa-comments", color: "#10b981", score: speaking100 },
    { key: "writing", label: "Writing", icon: "fa-pencil-alt", color: "#8b5cf6", score: writing100 },
    { key: "listening", label: "Listening", icon: "fa-headphones", color: "#f59e0b", score: listening100 },
    { key: "reading", label: "Reading", icon: "fa-book-reader", color: "#3b82f6", score: reading100 },
  ];

  // Only skills that were actually attempted count toward the overall (equal weight).
  const present = skills.filter((s) => s.score != null);
  const overall100 = present.length
    ? Math.round(present.reduce((a, s) => a + s.score, 0) / present.length)
    : 0;
  const overallCEFR = scoreToCEFR(overall100);
  const overallColor = CEFR_COLOR[overallCEFR];

  // Personalized plan derived from the student's per-skill scores (weakest
  // skills first). Falls back to the language's static list only if no skill
  // was scored.
  const recommendations = buildLearningPlan(
    skills,
    languageFullName,
    langContent.recommendations(data.language),
  );

  const handleStart = () => {
    const assessmentResults = {
      cefrLevel: overallCEFR, // overall CEFR band for the user profile
      overall: Math.round(overall100 / 10), // legacy 0–10 overall
      overallScore: overall100,
      preferredLanguage: languageFullName,
      perSkillCEFR: {
        speaking: speaking100 != null ? scoreToCEFR(speaking100) : null,
        writing: writing100 != null ? scoreToCEFR(writing100) : null,
        listening: listening100 != null ? scoreToCEFR(listening100) : null,
        reading: reading100 != null ? scoreToCEFR(reading100) : null,
      },
      skillScores: {
        speaking: speaking100,
        writing: writing100,
        listening: listening100,
        reading: reading100,
      },
    };
    if (data.speakingResult) assessmentResults.speakingResult = data.speakingResult;
    completeAssessment(assessmentResults);
    navigate("/dashboard");
  };

  // Record this attempt once, then build the history series for the chart.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current || !present.length) return;
    recordedRef.current = true;
    recordAttempt({
      language: data.language,
      languageName: languageFullName,
      overall: overall100,
      cefr: overallCEFR,
      skills: { speaking: speaking100, writing: writing100, listening: listening100, reading: reading100 },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // History for THIS language (oldest → newest) for the progress line chart.
  const history = loadHistory()
    .filter((h) => h.language === data.language && typeof h.overall === "number")
    .map((h) => ({
      date: new Date(h.at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: h.overall,
      cefr: h.cefr,
    }));

  const CIRC = 283;
  const offset = CIRC - (overall100 / 100) * CIRC;

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.25rem 4rem", animation: "fadeInUp 0.5s ease" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(99,102,241,0.1)", color: "#6366f1", padding: "0.35rem 1rem", borderRadius: "99px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "1rem" }}>
          <i className="fas fa-trophy" /> Assessment Complete!
        </div>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.5rem)", fontWeight: 800, color: "var(--text-base)", marginBottom: "0.5rem" }}>
          Your {languageFullName} CEFR Results
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "560px", margin: "0 auto" }}>
          Scored across the four CEFR skills — Speaking, Writing, Listening and Reading — weighted equally.
        </p>
      </div>

      {/* Overall CEFR card */}
      <div
        style={{ background: "var(--bg-card)", borderRadius: "24px", padding: "clamp(1.5rem, 4vw, 3rem)", boxShadow: "0 20px 40px rgba(0,0,0,0.08)", marginBottom: "2rem", display: "grid", gridTemplateColumns: "auto 1fr", gap: "2rem", alignItems: "center" }}
        className="result-overall-card"
      >
        <div style={{ position: "relative", width: "170px", height: "170px", flexShrink: 0 }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={overallColor} strokeWidth="9" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.25,0.8,0.25,1)" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2.6rem", fontWeight: 900, color: overallColor, lineHeight: 1 }}>{overallCEFR}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "4px" }}>{overall100}/100</span>
          </div>
        </div>

        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: overallColor + "18", color: overallColor, padding: "0.3rem 0.9rem", borderRadius: "99px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            {CEFR_DESC[overallCEFR]}
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-base)", marginBottom: "0.5rem" }}>
            Overall level: {overallCEFR} ({CEFR_DESC[overallCEFR]})
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            This estimate reflects your performance across all four skills. CEFR levels range from A1
            (beginner) to C2 (proficient). Keep practising your weaker skills to move up a band.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.6, marginTop: "0.75rem", fontStyle: "italic" }}>
            Note: this is a CEFR-aligned self-assessment estimate, not an official CEFR certification.
          </p>
        </div>
      </div>

      {/* Per-skill CEFR cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {skills.map((s) => (
          <SkillCard key={s.key} label={s.label} icon={s.icon} score100={s.score ?? 0} color={s.color} />
        ))}
      </div>

      {/* Radar chart */}
      <div style={{ background: "var(--bg-card)", borderRadius: "20px", padding: "clamp(1.25rem, 4vw, 2.5rem)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-base)", marginBottom: "1.5rem", textAlign: "center" }}>
          <i className="fas fa-chart-area" style={{ color: "#6366f1", marginRight: "0.5rem" }} />
          Skill Breakdown
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart
            data={skills.map((s) => ({ skill: s.label, score: s.score ?? 0 }))}
            margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
          >
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--text-muted)", fontSize: 12, fontWeight: 600 }} />
            <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} dot={{ fill: "#6366f1", r: 4 }} />
          </RadarChart>
        </ResponsiveContainer>

        {/* Weakest skill callout */}
        {(() => {
          const tips = {
            speaking: "Have short daily conversations, even with yourself. Fluency comes from repetition.",
            writing: "Write a few sentences a day and review the corrections. Focus on one structure at a time.",
            listening: "Listen to short clips daily — podcasts, dialogues — and replay what you miss.",
            reading: "Read short articles in your target language daily to build comprehension.",
          };
          if (!present.length) return null;
          const weakest = present.reduce((a, b) => (b.score < a.score ? b : a));
          return (
            <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#6366f1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.9rem" }}>
                <i className={`fas ${weakest.icon}`} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                  Focus area: {weakest.label} ({scoreToCEFR(weakest.score)}) — your weakest skill
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "0.75rem" }}>{tips[weakest.key]}</div>
                <button
                  onClick={() => navigate(`/practice?tab=${weakest.key}`)}
                  style={{ background: "#6366f1", color: "white", border: "none", borderRadius: "10px", padding: "0.55rem 1.1rem", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: "inherit" }}
                >
                  <i className="fas fa-bolt" /> Start a 10-minute {weakest.label.toLowerCase()} session
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Progress over time (shows once there is more than one attempt) */}
      {history.length > 1 && (
        <div style={{ background: "var(--bg-card)", borderRadius: "20px", padding: "clamp(1.25rem, 4vw, 2.5rem)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-base)", marginBottom: "0.35rem", textAlign: "center" }}>
            <i className="fas fa-chart-line" style={{ color: "#10b981", marginRight: "0.5rem" }} />
            Your Progress Over Time
          </h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            {history[0].cefr} on {history[0].date} → {history[history.length - 1].cefr} today. Keep it up!
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={history} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <Tooltip formatter={(v, _n, p) => [`${v}/100 (${p.payload.cefr})`, "Overall"]} />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Learning plan */}
      <div style={{ background: "var(--bg-card)", borderRadius: "20px", padding: "clamp(1.5rem, 4vw, 2.5rem)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-base)", marginBottom: "1.25rem", textAlign: "center" }}>
          <i className="fas fa-map-signs" style={{ color: "#6366f1", marginRight: "0.5rem" }} />
          Your Personalized Learning Plan
        </h2>
        <div style={{ display: "grid", gap: "0.875rem" }}>
          {recommendations.map((r) => (
            <div key={r.title} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", background: r.color + "08", border: `1px solid ${r.color}20`, borderRadius: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: r.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>
                <i className={`fas ${r.icon}`} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: "0.95rem" }}>{r.title}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={handleStart}
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "14px", padding: "1rem 2.5rem", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.6rem", boxShadow: "0 8px 24px rgba(99,102,241,0.4)", fontFamily: "inherit" }}
          >
            <i className="fas fa-play-circle" /> Start Your Learning Journey
          </button>
          <button
            onClick={() => downloadCertificate({ cefr: overallCEFR, language: languageFullName, name: user?.full_name || user?.name || "Language Learner", date: new Date() })}
            style={{ background: "var(--bg-card)", color: "#6366f1", border: "2px solid #6366f1", borderRadius: "14px", padding: "1rem 1.75rem", fontSize: "1rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.6rem", fontFamily: "inherit" }}
          >
            <i className="fas fa-award" /> Download Certificate
          </button>
        </div>
        <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          You'll be redirected to your personalized dashboard
        </p>
      </div>
    </div>
  );
}
