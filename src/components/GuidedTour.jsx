import { useState, useEffect, useCallback } from "react";

/* First-time guided tour: a friendly mascot pops in from the bottom-left,
   says hello, and walks the user through each section by spotlighting the
   matching navbar item. Skip is always available. Shown once (the caller
   gates it on a localStorage flag). */

const STEPS = [
  { target: null, title: "Hey, I'm Foxy! 👋", text: "Welcome to FluentPeak! Give me 30 seconds and I'll show you around." },
  { target: ".navbar-assessment-btn", title: "1 · Start with the Assessment", text: "Take a quick placement test to find your CEFR level — everything else adapts to you." },
  { target: 'a[href="/dashboard"]', title: "2 · Your Dashboard", text: "Your home base: streak, daily goal, skill mastery, and quick links to jump back in." },
  { target: 'a[href="/practice"]', title: "3 · Practice", text: "Eight ways to learn — AI tutor, flashcards, grammar, reading, listening, writing, speaking & pronunciation." },
  { target: 'a[href="/community"]', title: "4 · Community", text: "Find language partners, climb the leaderboard, and learn together." },
  { target: 'a[href="/profile"]', title: "5 · Profile", text: "Track achievements and tweak your settings whenever you like." },
  { target: null, title: "You're all set! 🎉", text: "Jump in whenever you're ready — viel Erfolg!" },
];

export default function GuidedTour({ onFinish }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const cur = STEPS[step];

  const measure = useCallback(() => {
    if (!cur.target) { setRect(null); return; }
    const el = document.querySelector(cur.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [cur.target]);

  useEffect(() => { measure(); }, [step, measure]);
  useEffect(() => {
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [measure]);

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : onFinish());
  const back = () => setStep((s) => Math.max(0, s - 1));
  const pad = 8;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
      <style>{`
        @keyframes tourMascotIn { 0%{transform:translateX(-160%);opacity:0;} 60%{transform:translateX(6%);opacity:1;} 100%{transform:translateX(0);opacity:1;} }
        @keyframes tourBob { 0%,100%{transform:translateY(0) rotate(-3deg);} 50%{transform:translateY(-9px) rotate(3deg);} }
        @keyframes tourBubbleIn { from{opacity:0; transform:translateY(14px) scale(0.98);} to{opacity:1; transform:translateY(0) scale(1);} }
        @keyframes tourPulse {
          0%,100%{ box-shadow:0 0 0 9999px rgba(15,23,42,0.55), 0 0 0 3px var(--primary), 0 0 22px 5px rgba(99,102,241,0.55); }
          50%    { box-shadow:0 0 0 9999px rgba(15,23,42,0.55), 0 0 0 3px var(--primary), 0 0 38px 12px rgba(99,102,241,0.85); }
        }
      `}</style>

      {/* Plain dim for welcome/finish (no element to spotlight) */}
      {!rect && <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)" }} />}

      {/* Spotlight ring around the current navbar target */}
      {rect && (
        <div
          style={{
            position: "absolute",
            top: rect.top - pad, left: rect.left - pad,
            width: rect.width + pad * 2, height: rect.height + pad * 2,
            borderRadius: 12,
            animation: "tourPulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Mascot + speech bubble, fixed at the bottom */}
      <div style={{ position: "absolute", left: 24, bottom: 24, display: "flex", alignItems: "flex-end", gap: "1rem", maxWidth: "min(94vw, 540px)" }}>
        <div style={{ animation: "tourMascotIn 0.7s cubic-bezier(0.22,1,0.36,1) both", flexShrink: 0 }}>
          <div
            style={{
              width: 74, height: 74, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 26%, var(--bg-card)), var(--bg-card))",
              border: "1px solid color-mix(in srgb, var(--primary) 38%, transparent)",
              boxShadow: "0 14px 34px rgba(99,102,241,0.32)",
              animation: "tourBob 2.6s ease-in-out infinite",
            }}
          >
            🦊
          </div>
        </div>

        <div
          key={step}
          style={{
            animation: "tourBubbleIn 0.35s ease both",
            background: "color-mix(in srgb, var(--bg-card) 82%, transparent)",
            backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            border: "1px solid color-mix(in srgb, var(--primary) 24%, transparent)",
            borderRadius: 18, boxShadow: "0 20px 48px rgba(31,38,135,0.28)",
            padding: "1.1rem 1.25rem", flex: 1, minWidth: 0,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-base)", marginBottom: 5 }}>{cur.title}</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.55, marginBottom: "0.9rem" }}>{cur.text}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.9rem" }}>
            {STEPS.map((_, i) => (
              <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 99, background: i === step ? "var(--primary)" : "var(--border)", transition: "all .25s ease" }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <button onClick={onFinish} style={{ background: "none", border: "none", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>
              Skip tour
            </button>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {step > 0 && (
                <button onClick={back} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-base)", borderRadius: 99, padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>
                  Back
                </button>
              )}
              <button onClick={next} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", borderRadius: 99, padding: "0.5rem 1.2rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 20px rgba(99,102,241,0.35)" }}>
                {step === STEPS.length - 1 ? "Finish 🎉" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
