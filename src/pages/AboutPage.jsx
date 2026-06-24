import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AboutPage.css";

const TEAM = [
  {
    id: "S1",
    name: "DHEYAB",
    role: "Team Leader · Full-Stack",
    quote: "Technology can make fluency reachable for everyone.",
    intro:
      "The visionary behind FluentPeak. Leads the team and architects the platform end-to-end — from the first wireframe to the last line of production code.",
    accent: "#6d5ff7",
    accentSoft: "rgba(109, 95, 247, 0.18)",
    icon: "fa-crown",
    leader: true,
  },
  {
    id: "S2",
    name: "MAAZ",
    role: "Frontend · UI Design",
    quote: "Every pixel should make learning feel effortless.",
    intro:
      "Crafts every screen of the FluentPeak experience. Obsessed with clean interfaces, honest motion, and interfaces that get out of the learner's way.",
    accent: "#3ea883",
    accentSoft: "rgba(62, 168, 131, 0.18)",
    icon: "fa-palette",
  },
  {
    id: "S3",
    name: "MOHAMMED",
    role: "Backend · AI Engineering",
    quote: "The AI should adapt to the learner — never the other way around.",
    intro:
      "Builds the brains of the platform — the speech-scoring engine and the AI conversation partner that meets every learner exactly where they are.",
    accent: "#eba046",
    accentSoft: "rgba(235, 160, 70, 0.18)",
    icon: "fa-brain",
  },
];

/* Try every common extension + location until one of your images loads */
const PHOTO_CANDIDATES = (id) => [
  `/team/${id}.jpg`,
  `/team/${id}.png`,
  `/team/${id}.jpeg`,
  `/team/${id}.webp`,
  `/${id}.jpg`,
  `/${id}.png`,
  `/${id}.jpeg`,
  `/${id}.webp`,
];

function MemberPhoto({ id, name, accent }) {
  const [idx, setIdx] = useState(0);
  const candidates = PHOTO_CANDIDATES(id);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (idx >= candidates.length) {
    return (
      <div
        className="member-photo member-photo--placeholder"
        style={{ "--accent": accent }}
      >
        <span>{initials}</span>
        <small>{id}</small>
      </div>
    );
  }
  return (
    <img
      className="member-photo"
      src={candidates[idx]}
      alt={name}
      onError={() => setIdx((i) => i + 1)}
      draggable={false}
    />
  );
}

function TeamCard({ member, index }) {
  return (
    <article
      className={`tm-entry reveal${member.leader ? " tm-entry--leader" : ""}`}
      style={{
        "--accent": member.accent,
        "--accent-soft": member.accentSoft,
        "--i": index,
      }}
    >
      <div className="tm-portrait">
        <MemberPhoto id={member.id} name={member.name} accent={member.accent} />
        {member.leader && (
          <span className="tm-leader-tag">
            <i className="fas fa-crown" /> Team Lead
          </span>
        )}
      </div>

      <div className="tm-body">
        <div className="tm-kicker">
          <i className={`fas ${member.icon}`} /> {member.role}
        </div>
        <h3 className="tm-name">{member.name}</h3>
        <blockquote className="tm-quote">
          <span className="tm-quote-mark" aria-hidden="true">&ldquo;</span>
          {member.quote}
        </blockquote>
        <p className="tm-bio">{member.intro}</p>
      </div>
    </article>
  );
}

/* ── Scroll-reveal: elements with .reveal fade/rise in when visible ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("#about-page .reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in-view");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const FLOATING_GLYPHS = ["A", "あ", "你", "Ñ", "Ω", "ع", "Б", "한"];

export default function AboutPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  useReveal();

  /* mouse parallax for the hero's floating 3D glyph tiles */
  const onHeroMove = (e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${(e.clientX - r.left) / r.width - 0.5}`);
    el.style.setProperty("--my", `${(e.clientY - r.top) / r.height - 0.5}`);
  };

  return (
    <div id="about-page">
      {/* ═════════ HERO ═════════ */}
      <section className="about-hero" ref={heroRef} onMouseMove={onHeroMove}>
        <div className="about-hero-bg" aria-hidden="true" />

        {/* floating 3D language tiles */}
        <div className="glyph-field" aria-hidden="true">
          {FLOATING_GLYPHS.map((g, i) => (
            <div key={i} className={`glyph-tile glyph-${i + 1}`}>
              {g}
            </div>
          ))}
        </div>

        {/* slow 3D halo rings */}
        <div className="hero-halo" aria-hidden="true">
          <div className="halo-ring halo-ring-1" />
          <div className="halo-ring halo-ring-2" />
          <div className="halo-ring halo-ring-3" />
        </div>

        <div className="about-hero-content">
          <div className="about-badge reveal">
            <i className="fas fa-users" /> The Team Behind FluentPeak
          </div>
          <h1 className="about-title">
            <span className="title-line reveal">Meet the</span>
            <span className="title-line title-line--gradient reveal">
              Minds Behind
            </span>
            <span className="title-line reveal">the Magic</span>
          </h1>
          <p className="about-subtitle reveal">
            Three students. One mission — to make language fluency feel less
            like studying and more like a superpower.
          </p>
          <div className="hero-scroll-hint reveal" aria-hidden="true">
            <div className="scroll-mouse">
              <div className="scroll-wheel" />
            </div>
            <span>Scroll to meet us</span>
          </div>
        </div>
      </section>

      {/* ═════════ TEAM — editorial spotlight ═════════ */}
      <section className="team-section">
        <div className="container">
          <div className="tm-head reveal">
            <span className="tm-eyebrow">The People</span>
            <h2 className="tm-headline">
              Three students,
              <br />
              one shared obsession.
            </h2>
            <p className="tm-sub">
              The minds building FluentPeak — and the ideas they refuse to
              compromise on.
            </p>
          </div>

          <div className="tm-roster">
            {TEAM.map((m, i) => (
              <TeamCard key={m.id} member={m} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ MISSION — editorial ═════════ */}
      <section className="mission-section">
        <div className="container">
          <div className="tm-head reveal">
            <span className="tm-eyebrow">What drives us</span>
            <h2 className="tm-headline">
              The things we won't
              <br />
              compromise on.
            </h2>
          </div>

          <div className="mn-grid">
            <div className="mn-item reveal" style={{ "--accent": "#6d5ff7", "--i": 0 }}>
              <div className="mn-icon">
                <i className="fas fa-lightbulb" />
              </div>
              <h3>Innovation</h3>
              <p>
                We push AI and speech technology to its limits so every learner
                gets feedback that actually helps.
              </p>
            </div>
            <div className="mn-item reveal" style={{ "--accent": "#3ea883", "--i": 1 }}>
              <div className="mn-icon">
                <i className="fas fa-heart" />
              </div>
              <h3>Passion</h3>
              <p>
                Languages connect people. We pour that belief into every
                feature, every animation, every line of code.
              </p>
            </div>
            <div className="mn-item reveal" style={{ "--accent": "#eba046", "--i": 2 }}>
              <div className="mn-icon">
                <i className="fas fa-rocket" />
              </div>
              <h3>Ambition</h3>
              <p>
                We're students today — but we're building the platform we wish
                existed when we started learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════ CTA ═════════ */}
      <section className="about-cta">
        <div className="container">
          <div className="cta-card reveal">
            <div className="cta-orb cta-orb-1" aria-hidden="true" />
            <div className="cta-orb cta-orb-2" aria-hidden="true" />
            <h2>Ready to learn with us?</h2>
            <p>
              Join FluentPeak and see what three obsessed students can build.
            </p>
            <button
              className="btn btn-primary cta-btn"
              onClick={() => navigate("/assessment")}
            >
              <i className="fas fa-rocket" /> Start Your Journey
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
