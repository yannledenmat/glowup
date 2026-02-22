import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cartAPI, ordersAPI } from '../services/api'
import './Cart.css'

function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = () => {
    const cartData = cartAPI.getCart()
    setCart(cartData)
  }

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return
    cartAPI.updateQuantity(productId, newQuantity)
    loadCart()
  }

  const handleRemoveItem = (productId) => {
    cartAPI.removeFromCart(productId)
    loadCart()
  }

  const handleClearCart = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider le panier ?')) {
      cartAPI.clearCart()
      loadCart()
    }
  }

  const handleCheckout = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const orderItems = cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }))

      const orderData = {
        items: orderItems,
      }

      await ordersAPI.createOrder(orderData)
      cartAPI.clearCart()
      setSuccess('Commande créée avec succès !')

      setTimeout(() => {
        navigate('/profile')
      }, 2000)
    } catch (err) {
      console.error('Checkout error:', err)
      setError(
        err.response?.data?.message ||
          'Erreur lors de la création de la commande. Veuillez réessayer.'
      )
    } finally {
      setLoading(false)
    }
  }

  const total = cartAPI.getTotal()

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Votre panier est vide</h2>
            <p>Découvrez nos produits et ajoutez-les à votre panier</p>
            <Link to="/products" className="btn btn-primary btn-large">
              Voir les produits
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1>Panier</h1>
          <button onClick={handleClearCart} className="btn btn-secondary">
            Vider le panier
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <div className="placeholder-image">📦</div>
                  )}
                </div>

                <div className="item-info">
                  <Link to={`/products/${item.id}`} className="item-name">
                    {item.name}
                  </Link>
                  <p className="item-description">
                    {item.description?.substring(0, 80)}...
                  </p>
                  <span className="item-price">{item.price?.toFixed(2)} €</span>
                </div>

                <div className="item-actions">
                  <div className="quantity-controls">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      className="qty-btn"
                    >
                      -
                    </button>
                    <span className="qty-display">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    {(item.price * item.quantity).toFixed(2)} €
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="remove-btn"
                    title="Retirer du panier"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Récapitulatif</h2>

            <div className="summary-line">
              <span>Sous-total</span>
              <span>{total.toFixed(2)} €</span>
            </div>

            <div className="summary-line">
              <span>Livraison</span>
              <span>Gratuite</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-line summary-total">
              <span>Total</span>
              <span>{total.toFixed(2)} €</span>
            </div>

            <button
              onClick={handleCheckout}
              className="btn btn-primary btn-large btn-full"
              disabled={loading}
            >
              {loading ? 'Traitement...' : 'Passer la commande'}
            </button>

            <Link to="/products" className="continue-shopping">
              ← Continuer les achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
