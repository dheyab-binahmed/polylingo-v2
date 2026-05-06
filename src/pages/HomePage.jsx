import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()
  return (
    <div id="home-page">

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="animate-fadeInUp">Step Into A New Era of Language Learning</h1>
              <p className="animate-fadeInUp animation-delay-1">
                PolyLingo combines AI-powered technology with proven language learning methods to help you achieve fluency faster than ever before.
              </p>
              <div className="hero-features animate-fadeInUp animation-delay-2">
                <div className="hero-feature"><i className="fas fa-comments" /><span>Practice real-world conversations with AI</span></div>
                <div className="hero-feature"><i className="fas fa-graduation-cap" /><span>Learn with personalized content and games</span></div>
                <div className="hero-feature"><i className="fas fa-bolt" /><span>Get instant, bilingual feedback on your progress</span></div>
              </div>
              <div className="animate-fadeInUp animation-delay-3">
                <p style={{ fontWeight: 500, color: 'var(--dark)', marginBottom: '1.5rem' }}>All designed to match your goals and level.</p>
                <button className="btn btn-primary" onClick={() => navigate('/assessment')} style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                  <i className="fas fa-rocket" /> Start Your Free Assessment
                </button>
              </div>
            </div>

            <div className="hero-image">
              <img
                src="https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="Language Learning"
                className="hero-image-main"
              />
              <div className="floating-elements">
                <div className="floating-element"><i className="fas fa-microphone" /><span>Pronunciation<br />Mastery</span></div>
                <div className="floating-element"><i className="fas fa-brain" /><span>AI-Powered<br />Feedback</span></div>
                <div className="floating-element"><i className="fas fa-chart-line" /><span>Progress<br />Tracking</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container">
          <div className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Why Choose PolyLingo?</h2>
            <p>Our unique approach combines cutting-edge technology with proven learning methods</p>
          </div>
          <div className="dashboard-sections">
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-robot" style={{ color: 'var(--primary)', marginRight: 10 }} /> AI-Powered Learning</h2>
              </div>
              <p>Our advanced AI adapts to your learning style and provides personalized feedback in real-time.</p>
            </div>
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-chart-line" style={{ color: 'var(--secondary)', marginRight: 10 }} /> Progress Tracking</h2>
              </div>
              <p>Track your improvement with detailed analytics and visual progress reports.</p>
            </div>
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-users" style={{ color: 'var(--accent)', marginRight: 10 }} /> Community Features</h2>
              </div>
              <p>Connect with other learners, join groups, and participate in challenges.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
