import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsAPI, cartAPI } from '../services/api'
import './ProductDetail.css'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await productsAPI.getById(id)
      setProduct(response.data)
      setError(null)
    } catch (err) {
      setError('Erreur lors du chargement du produit')
      console.error('Error fetching product:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (product) {
      cartAPI.addToCart(product, quantity)
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2000)
    }
  }

  const handleBuyNow = () => {
    handleAddToCart()
    setTimeout(() => navigate('/cart'), 500)
  }

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="loading">Chargement du produit...</div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="error">{error || 'Produit non trouvé'}</div>
          <button onClick={() => navigate('/products')} className="btn btn-primary">
            Retour aux produits
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <button onClick={() => navigate('/products')} className="back-button">
          ← Retour aux produits
        </button>

        <div className="product-detail">
          <div className="product-images">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="main-image" />
            ) : (
              <div className="placeholder-image-large">📦</div>
            )}
          </div>

          <div className="product-content">
            <h1 className="product-title">{product.name}</h1>

            <div className="product-meta">
              <span className="product-category">
                {product.category?.name || 'Non catégorisé'}
              </span>
              {product.stockQuantity > 0 ? (
                <span className="stock-badge in-stock">En stock</span>
              ) : (
                <span className="stock-badge out-of-stock">Rupture de stock</span>
              )}
            </div>

            <div className="product-price-section">
              <span className="price">{product.price?.toFixed(2)} €</span>
            </div>

            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            {product.stockQuantity > 0 && (
              <div className="purchase-section">
                <div className="quantity-selector">
                  <label htmlFor="quantity">Quantité :</label>
                  <div className="quantity-controls">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="qty-btn"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      id="quantity"
                      min="1"
                      max={product.stockQuantity}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(1, Math.min(product.stockQuantity, parseInt(e.target.value) || 1))
                        )
                      }
                      className="qty-input"
                    />
                    <button
                      onClick={() =>
                        setQuantity(Math.min(product.stockQuantity, quantity + 1))
                      }
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <span className="stock-info">
                    {product.stockQuantity} disponible(s)
                  </span>
                </div>

                <div className="action-buttons">
                  <button
                    onClick={handleAddToCart}
                    className="btn btn-secondary btn-large"
                  >
                    {addedToCart ? '✓ Ajouté au panier' : 'Ajouter au panier'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="btn btn-primary btn-large"
                  >
                    Acheter maintenant
                  </button>
                </div>
              </div>
            )}

            {product.stockQuantity === 0 && (
              <div className="out-of-stock-message">
                <p>Ce produit est actuellement en rupture de stock.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
