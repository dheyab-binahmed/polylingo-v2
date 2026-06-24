import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AssessmentContext from "./assessmentContext";
import "../polish.css";

// CEFR four-skill assessment: Speaking, Writing, Listening, Reading.
// "language" is the setup step (pick language + level); "results" shows scores.
const STEPS = [
  { path: "language", label: "Language" },
  { path: "speaking", label: "Speaking" },
  { path: "writing", label: "Writing" },
  { path: "listening", label: "Listening" },
  { path: "reading", label: "Reading" },
  { path: "results", label: "Results" },
];

const DEFAULT_DATA = {
  language: null,
  level: null, // CEFR level chosen on the language step (e.g. "B1")
  fluencyScore: null, // null = speaking not attempted (0 would wrongly count toward the CEFR aggregate)
  speakingScore: null,
  speakingResult: null,
  speakingSessionId: null,
  writingScore: null,
  writingTotal: 10,
  listeningScore: null,
  listeningTotal: 0,
  readingScore: null,
  readingTotal: 3,
};

export default function AssessmentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Load from localStorage or use default
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem("polylingo_assessment_data");
      return saved ? JSON.parse(saved) : DEFAULT_DATA;
    } catch (_) {
      return DEFAULT_DATA;
    }
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("polylingo_assessment_data", JSON.stringify(data));
  }, [data]);

  // Remember the furthest skill step the user reached, so an accidental refresh
  // can offer to resume instead of dumping them back at step one.
  const SKILL_STEPS = ["speaking", "writing", "listening", "reading"];
  const [resumeStep, setResumeStep] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("polylingo_assessment_step");
      const here = location.pathname.split("/").pop();
      if (saved && SKILL_STEPS.includes(saved) && here === "language" && data.language) {
        setResumeStep(saved);
      }
    } catch (_) { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist the current step as the user advances through skill steps.
  useEffect(() => {
    const here = location.pathname.split("/").pop();
    if (SKILL_STEPS.includes(here)) {
      localStorage.setItem("polylingo_assessment_step", here);
    } else if (here === "results") {
      localStorage.removeItem("polylingo_assessment_step");
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(partial) {
    setData((d) => ({ ...d, ...partial }));
  }

  // Start a fresh assessment: wipe all previous scores so a past attempt can
  // never leak into this run's results (only language/level carry over).
  function reset(partial) {
    setData({ ...DEFAULT_DATA, ...partial });
  }

  function goNext(cur) {
    const i = STEPS.findIndex((s) => s.path === cur);
    if (i < STEPS.length - 1) navigate(`/assessment/${STEPS[i + 1].path}`);
  }

  function goPrev(cur) {
    const i = STEPS.findIndex((s) => s.path === cur);
    if (i > 0) navigate(`/assessment/${STEPS[i - 1].path}`);
  }

  const cur = location.pathname.split("/").pop();
  const curIdx = STEPS.findIndex((s) => s.path === cur);
  const progress = curIdx >= 0 ? (curIdx / (STEPS.length - 1)) * 100 : 0;

  return (
    <AssessmentContext.Provider value={{ data, update, reset, goNext, goPrev }}>
      <div id="testing-page">
        {resumeStep && (
          <div style={{ maxWidth: 700, margin: "1rem auto 0", background: "rgba(99,102,241,0.08)", border: "1.5px solid rgba(99,102,241,0.3)", borderRadius: 12, padding: "0.9rem 1.15rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <i className="fas fa-rotate-left" style={{ color: "#6366f1", fontSize: "1.1rem" }} />
            <span style={{ flex: 1, color: "var(--text-base)", fontWeight: 600, fontSize: "0.92rem" }}>
              You have an assessment in progress. Continue where you left off?
            </span>
            <button
              onClick={() => { setResumeStep(null); navigate(`/assessment/${resumeStep}`); }}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}
            >
              Continue
            </button>
            <button
              onClick={() => { setResumeStep(null); localStorage.removeItem("polylingo_assessment_step"); reset({ language: data.language, level: data.level }); }}
              style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.45rem 1rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}
            >
              Start over
            </button>
          </div>
        )}
        <div className="onboarding-progress">
          <div className="progress-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.path}
                className={`progress-step${i === curIdx ? " active" : i < curIdx ? " completed" : ""}`}
              >
                <div className="step-circle">
                  {i < curIdx ? <i className="fas fa-check" /> : i + 1}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Outlet />
      </div>
    </AssessmentContext.Provider>
  );
}
