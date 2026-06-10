import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div>
            <Link to="/" className="logo" style={{ color: 'white', marginBottom: '1.5rem', display: 'inline-flex', textDecoration: 'none' }}>
              <div className="logo-icon"><i className="fas fa-language" /></div>
              <span>FluentPeak</span>
            </Link>
            <p style={{ color: 'var(--gray-light)', marginBottom: '1.5rem' }}>The future of language learning, powered by AI.</p>
            <div className="social-links">
              <span style={{ cursor: 'default' }}><i className="fab fa-facebook-f" /></span>
              <span style={{ cursor: 'default' }}><i className="fab fa-twitter" /></span>
              <span style={{ cursor: 'default' }}><i className="fab fa-instagram" /></span>
              <span style={{ cursor: 'default' }}><i className="fab fa-linkedin-in" /></span>
            </div>
          </div>
          <div>
            <h3>Product</h3>
            <ul className="footer-links">
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/practice">Practice</Link></li>
              <li><Link to="/community">Community</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FluentPeak. All rights reserved. | CMSE 405 - Group 13 Project</p>
        </div>
      </div>
    </footer>
  );
}
