# GlowCommerce Frontend - Application React

## Description

Application frontend React moderne pour la plateforme e-commerce GlowCommerce, développée dans le cadre de la formation Bac+5 sur la sécurité, les performances et le DevSecOps.

## Stack Technique

- **React 18** - Bibliothèque UI
- **Vite** - Build tool ultra-rapide
- **React Router v6** - Routing
- **Axios** - Client HTTP
- **CSS3** - Styling (CSS custom properties)

## Architecture

```
glowcommerce-frontend/
├── public/                      # Assets statiques
├── src/
│   ├── components/              # Composants réutilisables
│   │   ├── Header.jsx          # En-tête avec navigation
│   │   ├── Header.css
│   │   ├── Footer.jsx          # Pied de page
│   │   └── Footer.css
│   ├── pages/                   # Pages de l'application
│   │   ├── Home.jsx            # Page d'accueil
│   │   ├── Home.css
│   │   ├── Products.jsx        # Liste des produits
│   │   ├── ProductDetail.jsx   # Détail d'un produit
│   │   ├── Login.jsx           # Connexion
│   │   ├── Register.jsx        # Inscription
│   │   ├── Cart.jsx            # Panier
│   │   └── Profile.jsx         # Profil utilisateur
│   ├── services/                # Services API
│   │   └── api.js              # Client Axios configuré
│   ├── utils/                   # Utilitaires
│   ├── hooks/                   # Custom hooks React
│   ├── App.jsx                 # Composant racine
│   ├── App.css                 # Styles globaux
│   ├── main.jsx                # Point d'entrée
│   └── index.css               # Variables CSS
├── index.html                   # Template HTML
├── vite.config.js              # Configuration Vite
├── package.json                # Dépendances npm
└── Dockerfile                  # Build Docker
```

## Installation

### Prérequis

- Node.js 20+
- npm 10+

### Installation des dépendances

```bash
cd glowcommerce-frontend
npm install
```

## Développement

### Démarrer le serveur de développement

```bash
npm run dev
```

L'application sera disponible sur : http://localhost:3000

**Hot reload activé** - Les modifications sont visibles immédiatement.

### Variables d'environnement

Créer un fichier `.env.local` :

```env
VITE_API_URL=http://localhost:8080/api
```

### Structure du projet de base

Le projet utilise :
- **React Router** pour la navigation
- **Axios** pour les appels API
- **localStorage** pour la gestion du panier et du token JWT

## Build de production

```bash
# Build optimisé
npm run build

# Preview du build
npm run preview
```

Le build sera généré dans le dossier `dist/`.

## API Client (Axios)

### Configuration

Le fichier `src/services/api.js` configure un client Axios avec :
- Base URL configurable
- Intercepteur de requête pour ajouter le token JWT
- Intercepteur de réponse pour gérer les erreurs 401
- Gestion automatique du refresh token

### Utilisation

```javascript
import { authAPI, productsAPI, ordersAPI, cartAPI } from './services/api'

// Authentification
const response = await authAPI.login({ username, password })
const token = response.data.token

// Récupérer les produits
const products = await productsAPI.getAll()

// Créer une commande
const order = await ordersAPI.createOrder(orderData)

// Gestion du panier (localStorage)
cartAPI.addToCart(product, quantity)
const cart = cartAPI.getCart()
const total = cartAPI.getTotal()
```

## Routing

Les routes sont définies dans `App.jsx` :

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | `Home` | Page d'accueil |
| `/products` | `Products` | Liste des produits |
| `/products/:id` | `ProductDetail` | Détail d'un produit |
| `/login` | `Login` | Connexion |
| `/register` | `Register` | Inscription |
| `/cart` | `Cart` | Panier d'achat |
| `/profile` | `Profile` | Profil utilisateur |

## Composants

### Header

Navigation principale avec :
- Logo GlowCommerce
- Liens de navigation
- Authentification (Login/Logout)
- Indicateur panier

```jsx
import Header from './components/Header'

<Header />
```

### Footer

Pied de page avec :
- Informations sur le projet
- Technologies utilisées
- Sécurité
- Contact

```jsx
import Footer from './components/Footer'

<Footer />
```

## Authentification JWT

### Flow d'authentification

1. L'utilisateur se connecte via `/login`
2. Le backend renvoie un JWT token
3. Le token est stocké dans `localStorage`
4. Toutes les requêtes API incluent le token dans le header `Authorization: Bearer <token>`
5. En cas d'erreur 401, l'utilisateur est redirigé vers `/login`

### Exemple de connexion

```javascript
import { authAPI } from './services/api'

async function login(username, password) {
  try {
    const response = await authAPI.login({ username, password })
    const { token, user } = response.data

    // Stocker le token et les infos user
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))

    // Rediriger
    window.location.href = '/'
  } catch (error) {
    console.error('Login failed:', error)
  }
}
```

### Exemple de déconnexion

```javascript
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}
```

## Gestion du panier

Le panier est géré via `localStorage` :

```javascript
import { cartAPI } from './services/api'

// Ajouter un produit
cartAPI.addToCart(product, quantity)

// Récupérer le panier
const cart = cartAPI.getCart()

// Mettre à jour la quantité
cartAPI.updateQuantity(productId, newQuantity)

// Retirer un produit
cartAPI.removeFromCart(productId)

// Calculer le total
const total = cartAPI.getTotal()

// Vider le panier
cartAPI.clearCart()
```

## Styling

### Variables CSS

Le fichier `index.css` définit les variables CSS :

```css
:root {
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --secondary-color: #8b5cf6;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --gray-50: #f9fafb;
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
```

### Classes utilitaires

```css
/* Buttons */
.btn                  /* Base button */
.btn-primary         /* Primary button */
.btn-secondary       /* Secondary button */
.btn-large           /* Large button */

/* Layout */
.container           /* Centered container (1200px) */
.card                /* Card component */

/* Text */
.hero-title          /* Hero title */
.hero-subtitle       /* Hero subtitle */
```

## Tests

```bash
# Lancer les tests
npm test

# Couverture de code
npm run test:coverage
```

## Linting

```bash
# Vérifier le code
npm run lint

# Auto-fix
npm run lint:fix
```

## Docker

### Build de l'image

```bash
docker build -t glowcommerce-frontend .
```

### Lancer le conteneur

```bash
docker run -p 3000:80 glowcommerce-frontend
```

### Avec Docker Compose

```bash
docker-compose up frontend
```

## Performances

### Optimisations implémentées

✅ Lazy loading des composants (à implémenter)
✅ Code splitting avec React Router
✅ Compression Gzip (Nginx)
✅ Cache browser pour les assets
✅ Images optimisées

### Optimisations recommandées

- [ ] Lazy loading avec `React.lazy()` et `Suspense`
- [ ] Memoization avec `useMemo` et `useCallback`
- [ ] Virtual scrolling pour les longues listes
- [ ] Service Worker pour le cache
- [ ] WebP pour les images

## Sécurité

### Bonnes pratiques implémentées

✅ JWT stocké dans `localStorage` (alternative : `httpOnly` cookie)
✅ Validation côté client (doublée côté serveur)
✅ Échappement XSS automatique par React
✅ CORS configuré
✅ HTTPS en production

### Recommandations

- [ ] Implémenter Content Security Policy (CSP)
- [ ] Ajouter des headers de sécurité
- [ ] Rate limiting côté client
- [ ] Validation renforcée des formulaires
- [ ] Sanitization des entrées utilisateur

## Configuration Nginx (Production)

Le Dockerfile utilise Nginx pour servir l'application :

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Déploiement

### Build de production

```bash
# Build
npm run build

# Les fichiers statiques sont dans dist/
ls -la dist/
```

### Déploiement sur Netlify/Vercel

```bash
# Netlify
netlify deploy --prod

# Vercel
vercel --prod
```

### Déploiement avec Docker

```bash
# Build
docker build -t glowcommerce-frontend:latest .

# Run
docker run -d -p 80:80 glowcommerce-frontend:latest
```

## Développement de nouvelles fonctionnalités

### Ajouter une nouvelle page

1. Créer le composant dans `src/pages/` :

```jsx
// src/pages/NewPage.jsx
import './NewPage.css'

function NewPage() {
  return (
    <div className="new-page">
      <h1>Ma nouvelle page</h1>
    </div>
  )
}

export default NewPage
```

2. Ajouter la route dans `App.jsx` :

```jsx
import NewPage from './pages/NewPage'

<Route path="/new" element={<NewPage />} />
```

### Ajouter un nouveau service API

Éditer `src/services/api.js` :

```javascript
export const newServiceAPI = {
  getData: () => api.get('/new-endpoint'),
  postData: (data) => api.post('/new-endpoint', data),
}
```

## Troubleshooting

### Problème : Module non trouvé

```bash
rm -rf node_modules package-lock.json
npm install
```

### Problème : Port 3000 déjà utilisé

Changer le port dans `vite.config.js` :

```javascript
export default defineConfig({
  server: {
    port: 3001,  // Nouveau port
  },
})
```

### Problème : CORS en développement

Vérifier la configuration du proxy dans `vite.config.js` :

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

## Ressources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Axios](https://axios-http.com/)

## Contribution

Pour contribuer au projet :

1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Licence

© 2024 - Formation GlowCommerce - Tous droits réservés

---

**Version :** 1.0.0
**Dernière mise à jour :** 1er décembre 2024
