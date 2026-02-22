import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Instance axios configurée
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
}

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  search: (query) => api.get('/products/search', { params: { query } }),
}

// Orders API
export const ordersAPI = {
  getMyOrders: () => api.get('/customer/orders'),
  getOrderById: (id) => api.get(`/customer/orders/${id}`),
  createOrder: (orderData) => api.post('/customer/orders', orderData),
}

// Cart API (local storage for now)
export const cartAPI = {
  getCart: () => {
    const cart = localStorage.getItem('cart')
    return cart ? JSON.parse(cart) : []
  },
  addToCart: (product, quantity = 1) => {
    const cart = cartAPI.getCart()
    const existingItem = cart.find((item) => item.id === product.id)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cart.push({ ...product, quantity })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    return cart
  },
  removeFromCart: (productId) => {
    const cart = cartAPI.getCart()
    const updatedCart = cart.filter((item) => item.id !== productId)
    localStorage.setItem('cart', JSON.stringify(updatedCart))
    return updatedCart
  },
  updateQuantity: (productId, quantity) => {
    const cart = cartAPI.getCart()
    const item = cart.find((item) => item.id === productId)
    if (item) {
      item.quantity = quantity
      localStorage.setItem('cart', JSON.stringify(cart))
    }
    return cart
  },
  clearCart: () => {
    localStorage.removeItem('cart')
    return []
  },
  getTotal: () => {
    const cart = cartAPI.getCart()
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  },
}

export default api
