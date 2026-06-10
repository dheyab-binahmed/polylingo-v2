import { useNavigate } from 'react-router-dom'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div id="home-page">

      {/* ── HERO ── */}
      <section className="hero">
        {/* 3D SCENE (background) */}
        <div className="hero-3d-scene">
          <div className="cube-ring ring-1">
            {[...Array(12)].map((_, i) => <div key={i} className="ring-cube" />)}
          </div>
          <div className="cube-ring ring-2">
            {[...Array(12)].map((_, i) => <div key={i} className="ring-cube-small" />)}
          </div>
          <div className="center-diamond">
            <div className="diamond-inner" />
          </div>
        </div>

        <div className="container">
          <div className="hero-content">

            {/* ── LEFT: Text ── */}
            <div className="hero-text">
              <div className="hero-badge animate-fadeInUp">
                AI-Powered Language Learning
              </div>

              <h1 className="animate-fadeInUp animation-delay-1">
                Step Into A New<br />
                <em>Era of Language</em><br />
                Learning
              </h1>

              <p className="animate-fadeInUp animation-delay-1">
                Fluax combines AI-powered technology with proven language learning methods to help you achieve fluency faster than ever before.
              </p>

              <div className="hero-features animate-fadeInUp animation-delay-2">
                <div className="hero-feature">
                  <i className="fas fa-comments" />
                  <span>Practice real-world conversations with AI</span>
                </div>
                <div className="hero-feature">
                  <i className="fas fa-graduation-cap" />
                  <span>Learn the language you want</span>
                </div>
                <div className="hero-feature">
                  <i className="fas fa-bolt" />
                  <span>Get instant, personalized feedback on your progress</span>
                </div>
              </div>

              <div className="animate-fadeInUp animation-delay-3">
                <p style={{ fontWeight: 500, color: '#6b6780', marginBottom: '1.5rem', fontSize: '0.88rem', letterSpacing: '0.01em' }}>
                  All designed to match your goals and level.
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/assessment')} style={{ fontSize: '1rem', padding: '0.95rem 2.2rem' }}>
                  <i className="fas fa-rocket" /> Start Your Free Assessment
                </button>
              </div>

              {/* ── Stats ── */}
              <div className="hero-stats animate-fadeInUp animation-delay-3">
                <div className="hero-stat">
                  <strong>50K+</strong>
                  <small>Active Learners</small>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <strong>4.9</strong>
                  <small>User Rating</small>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <strong>30+</strong>
                  <small>Languages</small>
                </div>
              </div>
            </div>

            {/* ── RIGHT: 3D Visual ── */}
            <div className="hero-image">
              <div className="tilt-card">
                <svg
                  className="hero-image-main"
                  viewBox="0 0 520 380"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Fluax app interface preview"
                >
                  <defs>
                    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#f8f5fc" />
                    </linearGradient>
                    <linearGradient id="progressBar" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6d5ff7" />
                      <stop offset="100%" stopColor="#9b8afb" />
                    </linearGradient>
                    <linearGradient id="progressBar2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3ea883" />
                      <stop offset="100%" stopColor="#5ec9a7" />
                    </linearGradient>
                    <linearGradient id="progressBar3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#eba046" />
                      <stop offset="100%" stopColor="#f0b86c" />
                    </linearGradient>
                    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6d5ff7" />
                      <stop offset="100%" stopColor="#9b8afb" />
                    </linearGradient>
                    <linearGradient id="waveformGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#9b8afb" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#6d5ff7" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Card background */}
                  <rect width="520" height="380" rx="22" fill="url(#cardBg)" />

                  {/* Subtle top glow */}
                  <ellipse cx="380" cy="-15" rx="180" ry="90" fill="rgba(155,138,251,0.1)" />

                  {/* ── Top header bar ── */}
                  <rect x="0" y="0" width="520" height="50" fill="rgba(0,0,0,0.02)" />
                  <rect x="0" y="49" width="520" height="1" fill="rgba(0,0,0,0.08)" />

                  {/* App icon */}
                  <rect x="16" y="11" width="28" height="28" rx="8" fill="url(#avatarGrad)" />
                  <text x="30" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">F</text>

                  {/* App name */}
                  <text x="52" y="30" fontSize="15" fontWeight="700" fill="#1a1730" fontFamily="sans-serif">Fluax</text>

                  {/* Nav dots */}
                  <circle cx="420" cy="25" r="3" fill="rgba(0,0,0,0.25)" />
                  <circle cx="432" cy="25" r="3" fill="rgba(0,0,0,0.25)" />
                  <circle cx="444" cy="25" r="3" fill="rgba(0,0,0,0.25)" />

                  {/* User avatar */}
                  <circle cx="492" cy="25" r="14" fill="url(#avatarGrad)" />
                  <text x="492" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="sans-serif">M</text>

                  {/* ── Language card ── */}
                  <rect x="16" y="64" width="234" height="130" rx="16" fill="#fff" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <text x="32" y="87" fontSize="11" fill="rgba(0,0,0,0.5)" fontFamily="sans-serif" fontWeight="600" letterSpacing="1">CURRENT LESSON</text>
                  <circle cx="42" cy="116" r="18" fill="rgba(109,95,247,0.12)" />
                  <text x="42" y="122" textAnchor="middle" fontSize="18" fontFamily="sans-serif">🇪🇸</text>
                  <text x="68" y="110" fontSize="14" fill="#1a1730" fontFamily="sans-serif" fontWeight="700">Spanish</text>
                  <text x="68" y="126" fontSize="11" fill="rgba(0,0,0,0.5)" fontFamily="sans-serif">Intermediate · B1</text>
                  <text x="32" y="153" fontSize="10" fill="rgba(0,0,0,0.4)" fontFamily="sans-serif">Progress</text>
                  <text x="218" y="153" textAnchor="end" fontSize="10" fill="#6d5ff7" fontFamily="sans-serif" fontWeight="600">68%</text>
                  <rect x="32" y="158" width="186" height="6" rx="3" fill="rgba(0,0,0,0.06)" />
                  <rect x="32" y="158" width="126" height="6" rx="3" fill="url(#progressBar)" />

                  {/* ── AI Conversation card ── */}
                  <rect x="270" y="64" width="234" height="130" rx="16" fill="#fff" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <text x="286" y="87" fontSize="11" fill="rgba(0,0,0,0.5)" fontFamily="sans-serif" fontWeight="600" letterSpacing="1">AI CONVERSATION</text>
                  <rect x="286" y="96" width="140" height="30" rx="10" fill="rgba(155,138,251,0.18)" />
                  <text x="356" y="116" textAnchor="middle" fontSize="11" fill="#2d2a45" fontFamily="sans-serif">how can I help you today?</text>
                  <rect x="350" y="134" width="138" height="30" rx="10" fill="rgba(0,0,0,0.06)" />
                  <text x="419" y="154" textAnchor="middle" fontSize="11" fill="#2d2a45" fontFamily="sans-serif">I need a Friend?</text>
                  <circle cx="296" cy="179" r="4" fill="rgba(155,138,251,0.6)" />
                  <circle cx="308" cy="179" r="4" fill="rgba(155,138,251,0.4)" />
                  <circle cx="320" cy="179" r="4" fill="rgba(155,138,251,0.2)" />
                  <text x="332" y="183" fontSize="10" fill="rgba(0,0,0,0.35)" fontFamily="sans-serif">AI is typing…</text>

                  {/* ── Pronunciation card ── */}
                  <rect x="16" y="208" width="488" height="80" rx="16" fill="#fff" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <text x="32" y="228" fontSize="11" fill="rgba(0,0,0,0.5)" fontFamily="sans-serif" fontWeight="600" letterSpacing="1">PRONUNCIATION ANALYSIS</text>
                  <rect x="32" y="238" width="400" height="40" rx="8" fill="rgba(0,0,0,0.03)" />
                  {[40,52,64,76,88,100,112,124,136,148,160,172,184,196,208,220,232,244,256,268,280,292,304,316,328,340,352,364,376,388,400].map((x, i) => {
                    const heights = [24,30,28,32,26,36,28,22,30,34,27,23,29,25,31,26,29,24,30,27,32,25,28,23,26,29,24,27,31,25,28]
                    const isActive = i < 22
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={270 - heights[i]}
                        width="8"
                        height={heights[i]}
                        rx="3"
                        fill={isActive ? "url(#waveformGrad)" : "rgba(0,0,0,0.12)"}
                      />
                    )
                  })}
                  <text x="460" y="251" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1a1730" fontFamily="sans-serif" filter="url(#glow)">92</text>
                  <text x="460" y="268" textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.45)" fontFamily="sans-serif">score</text>

                  {/* ── Stats row ── */}
                  <rect x="16" y="302" width="154" height="58" rx="14" fill="rgba(62,168,131,0.1)" stroke="rgba(62,168,131,0.25)" strokeWidth="1" />
                  <text x="90" y="322" textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.45)" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.5">STREAK</text>
                  <text x="90" y="346" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3ea883" fontFamily="sans-serif">🔥 14 days</text>

                  <rect x="183" y="302" width="154" height="58" rx="14" fill="rgba(109,95,247,0.1)" stroke="rgba(109,95,247,0.25)" strokeWidth="1" />
                  <text x="260" y="322" textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.45)" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.5">XP TODAY</text>
                  <text x="260" y="346" textAnchor="middle" fontSize="20" fontWeight="800" fill="#6d5ff7" fontFamily="sans-serif">+340 XP</text>

                  <rect x="350" y="302" width="154" height="58" rx="14" fill="rgba(235,160,70,0.12)" stroke="rgba(235,160,70,0.3)" strokeWidth="1" />
                  <text x="427" y="322" textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.45)" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.5">FLUENCY</text>
                  <text x="427" y="346" textAnchor="middle" fontSize="20" fontWeight="800" fill="#eba046" fontFamily="sans-serif">B1 → B2</text>
                </svg>
              </div>

              <div className="floating-elements">
                <div className="floating-element">
                  <i className="fas fa-microphone" />
                  <span>Pronunciation<br />Mastery</span>
                </div>
                <div className="floating-element">
                  <i className="fas fa-brain" />
                  <span>AI-Powered<br />Feedback</span>
                </div>
                <div className="floating-element">
                  <i className="fas fa-chart-line" />
                  <span>Progress<br />Tracking</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE ── */}
      <section className="why-choose">
        <div className="container">
          <div className="section-title">
            <h2>Why Choose Fluax?</h2>
            <p>Our unique approach combines cutting-edge technology with proven learning methods</p>
          </div>
          <div className="dashboard-sections">
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-robot" style={{ color: '#6d5ff7' }} /> AI-Powered Learning</h2>
              </div>
              <p>Our advanced AI adapts to your learning style and provides personalized feedback in real-time.</p>
            </div>
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-chart-line" style={{ color: '#3ea883' }} /> Progress Tracking</h2>
              </div>
              <p>Track your improvement with detailed analytics and visual progress reports.</p>
            </div>
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-users" style={{ color: '#eba046' }} /> Community Features</h2>
              </div>
              <p>Connect with other learners, join groups, and participate in challenges.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}