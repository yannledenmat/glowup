import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>GlowCommerce</h3>
          <p>Plateforme e-commerce moderne et sécurisée</p>
          <p className="formation-info">
            Projet de formation Bac+5 - Sécurité, Performance & DevSecOps
          </p>
        </div>

        <div className="footer-section">
          <h4>Technologies</h4>
          <ul>
            <li>React 18</li>
            <li>Spring Boot 3.2</li>
            <li>PostgreSQL 16</li>
            <li>Docker</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Sécurité</h4>
          <ul>
            <li>JWT Authentication</li>
            <li>BCrypt Password Hashing</li>
            <li>HTTPS/TLS</li>
            <li>OWASP Top 10</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <p>Email: contact@glowcommerce.com</p>
          <p>© 2024 GlowCommerce. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
