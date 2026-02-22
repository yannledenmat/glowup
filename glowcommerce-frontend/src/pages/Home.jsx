import { Link } from 'react-router-dom'
import './Home.css'

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Bienvenue sur GlowCommerce</h1>
          <p className="hero-subtitle">
            Votre plateforme e-commerce moderne, sécurisée et performante
          </p>
          <div className="hero-buttons">
            <Link to="/products" className="btn btn-primary btn-large">
              Découvrir nos produits
            </Link>
            <Link to="/register" className="btn btn-secondary btn-large">
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Pourquoi GlowCommerce ?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Sécurité renforcée</h3>
            <p>
              Authentification JWT, chiffrement BCrypt, conformité OWASP Top 10
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Performances optimisées</h3>
            <p>
              Cache multi-niveaux, optimisation SQL, monitoring en temps réel
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>DevSecOps</h3>
            <p>
              Pipeline CI/CD sécurisé, scans automatiques, déploiement continu
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Monitoring avancé</h3>
            <p>
              Prometheus, Grafana, alerting, SLI/SLO, gestion d'incidents
            </p>
          </div>
        </div>
      </section>

      <section className="tech-stack">
        <h2>Stack Technique</h2>
        <div className="tech-grid">
          <div className="tech-item">
            <h4>Frontend</h4>
            <ul>
              <li>React 18</li>
              <li>Vite</li>
              <li>Axios</li>
            </ul>
          </div>

          <div className="tech-item">
            <h4>Backend</h4>
            <ul>
              <li>Java 21</li>
              <li>Spring Boot 3.2</li>
              <li>Spring Security</li>
            </ul>
          </div>

          <div className="tech-item">
            <h4>Base de données</h4>
            <ul>
              <li>PostgreSQL 16</li>
              <li>Flyway</li>
              <li>HikariCP</li>
            </ul>
          </div>

          <div className="tech-item">
            <h4>DevOps</h4>
            <ul>
              <li>Docker</li>
              <li>Prometheus</li>
              <li>Grafana</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Prêt à commencer ?</h2>
        <p>Créez votre compte et découvrez nos produits dès maintenant</p>
        <Link to="/register" className="btn btn-primary btn-large">
          S'inscrire gratuitement
        </Link>
      </section>
    </div>
  )
}

export default Home
