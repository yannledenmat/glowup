import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, ordersAPI } from '../services/api'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    fetchUserData()
    fetchOrders()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser()
      setUser(response.data)
    } catch (err) {
      console.error('Error fetching user:', err)
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
      }
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getMyOrders()
      setOrders(response.data)
      setError('')
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'status-pending',
      CONFIRMED: 'status-confirmed',
      PROCESSING: 'status-processing',
      SHIPPED: 'status-shipped',
      DELIVERED: 'status-delivered',
      CANCELLED: 'status-cancelled',
    }
    return colors[status] || 'status-pending'
  }

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      PROCESSING: 'En cours',
      SHIPPED: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    }
    return labels[status] || status
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>Mon Profil</h1>
          <button onClick={handleLogout} className="btn btn-secondary">
            Déconnexion
          </button>
        </div>

        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Informations
          </button>
          <button
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Commandes ({orders.length})
          </button>
        </div>

        {activeTab === 'info' && (
          <div className="tab-content">
            <div className="info-card">
              <div className="user-avatar">
                {user.username?.charAt(0).toUpperCase()}
              </div>

              <div className="info-section">
                <h2>Informations personnelles</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Nom d'utilisateur</label>
                    <p>{user.username}</p>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                  <div className="info-item">
                    <label>Rôle</label>
                    <p className="role-badge">{user.role || 'CLIENT'}</p>
                  </div>
                  <div className="info-item">
                    <label>Membre depuis</label>
                    <p>
                      {user.createdAt
                        ? formatDate(user.createdAt)
                        : 'Non disponible'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="tab-content">
            {loading ? (
              <div className="loading">Chargement des commandes...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : orders.length === 0 ? (
              <div className="empty-orders">
                <div className="empty-icon">📦</div>
                <h3>Aucune commande</h3>
                <p>Vous n'avez pas encore passé de commande</p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <h3>Commande #{order.id}</h3>
                        <p className="order-date">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="order-items">
                      {order.items?.map((item, index) => (
                        <div key={index} className="order-item">
                          <span className="item-name">
                            {item.productName || `Produit #${item.productId}`}
                          </span>
                          <span className="item-quantity">x{item.quantity}</span>
                          <span className="item-price">
                            {item.price?.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer">
                      <span className="order-total">
                        Total: {order.totalAmount?.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
