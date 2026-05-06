export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div>
            <a href="#" className="logo" style={{ color: 'white', marginBottom: '1.5rem', display: 'inline-flex' }}>
              <div className="logo-icon"><i className="fas fa-language" /></div>
              <span>PolyLingo</span>
            </a>
            <p style={{ color: 'var(--gray-light)', marginBottom: '1.5rem' }}>The future of language learning, powered by AI.</p>
            <div className="social-links">
              <a href="#"><i className="fab fa-facebook-f" /></a>
              <a href="#"><i className="fab fa-twitter" /></a>
              <a href="#"><i className="fab fa-instagram" /></a>
              <a href="#"><i className="fab fa-linkedin-in" /></a>
            </div>
          </div>
          <div>
            <h3>Product</h3>
            <ul className="footer-links">
              <li><a href="#">Dashboard</a></li>
              <li><a href="#">Practice</a></li>
              <li><a href="#">Community</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} PolyLingo. All rights reserved. | CMSE 405 - Group 13 Project</p>
        </div>
      </div>
    </footer>
  )
}
