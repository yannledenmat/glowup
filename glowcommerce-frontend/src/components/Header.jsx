import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './Header.css'

function Header() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token')
    if (token) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      setUser(userData)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>✨ GlowCommerce</h1>
        </Link>

        <nav className="nav">
          <Link to="/" className="nav-link">Accueil</Link>
          <Link to="/products" className="nav-link">Produits</Link>

          {user ? (
            <>
              <Link to="/profile" className="nav-link">
                Profil ({user.username})
              </Link>
              <Link to="/cart" className="nav-link">
                🛒 Panier
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">
                Connexion
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
