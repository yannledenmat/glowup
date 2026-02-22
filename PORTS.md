# Ports et Accès - GlowCommerce

## 📊 Vue d'ensemble des services

| Service | Port(s) | URL d'accès | Identifiants | Description |
|---------|---------|-------------|--------------|-------------|
| **Frontend** | 3000 | http://localhost:3000 | - | Application React (Interface utilisateur) |
| **Backend API** | 8080 | http://localhost:8080 | - | Spring Boot REST API |
| **PostgreSQL** | 5432 | `localhost:5432` | `glowcommerce_app` / `changeme123` | Base de données |
| **Prometheus** | 9090 | http://localhost:9090 | - | Collecte de métriques |
| **Grafana** | 3001 | http://localhost:3001 | `admin` / `admin123` | Dashboards de monitoring |
| **Portainer** | 9000, 9443 | http://localhost:9000 | Créer au 1er accès | Gestion Docker (web UI) |
| **pgAdmin** | 5050 | http://localhost:5050 | `admin@glowcommerce.local` / `admin123` | Client PostgreSQL (web UI) |

---

## 🚀 Démarrage rapide

### Démarrer tous les services

```bash
docker-compose up -d
```

### Vérifier que tous les services sont actifs

```bash
docker-compose ps
```

Résultat attendu :
```
NAME                       STATUS
glowcommerce-backend       Up (healthy)
glowcommerce-db            Up (healthy)
glowcommerce-frontend      Up
glowcommerce-grafana       Up
glowcommerce-pgadmin       Up
glowcommerce-portainer     Up
glowcommerce-prometheus    Up
```

---

## 🌐 Accès aux interfaces web

### 1. Application GlowCommerce

**URL** : http://localhost:3000

**Fonctionnalités** :
- Parcourir le catalogue produits
- Créer un compte / Se connecter
- Ajouter au panier et commander
- Voir son profil et historique de commandes

**Comptes de test** :
```
Username: testuser
Password: Test123!

Username: admin
Password: Admin123!
```

---

### 2. API Backend (Actuator)

**URL** : http://localhost:8080/actuator

**Endpoints utiles** :
```bash
# Health check
curl http://localhost:8080/actuator/health

# Métriques Prometheus
curl http://localhost:8080/actuator/prometheus

# Info application
curl http://localhost:8080/actuator/info

# Liste des endpoints disponibles
curl http://localhost:8080/actuator
```

**API REST** :
```bash
# Liste des produits
curl http://localhost:8080/api/products

# Détail d'un produit
curl http://localhost:8080/api/products/1

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}'
```

---

### 3. Prometheus (Métriques)

**URL** : http://localhost:9090

**Utilisation** :
1. Aller dans **"Status" → "Targets"** pour voir les services monitorés
2. Aller dans **"Graph"** pour exécuter des requêtes PromQL

**Requêtes exemple** :
```promql
# Requêtes HTTP par seconde
rate(http_server_requests_seconds_count[1m])

# Utilisation mémoire JVM
jvm_memory_used_bytes{area="heap"}

# Nombre de threads actifs
jvm_threads_live_threads
```

---

### 4. Grafana (Dashboards)

**URL** : http://localhost:3001

**Identifiants** :
- Username : `admin`
- Password : `admin123`

**Première utilisation** :
1. Se connecter
2. Aller dans **"Configuration" → "Data sources"**
3. Vérifier que Prometheus est configuré (URL: `http://prometheus:9090`)
4. Créer un dashboard ou importer le dashboard **4701** (Spring Boot Statistics)

**Dashboards à créer** :
- Business metrics (CA, commandes, conversion)
- Technical metrics (CPU, mémoire, latence, erreurs)
- Database metrics (connexions, requêtes lentes)

---

### 5. Portainer (Docker Management)

**URL** : http://localhost:9000 ou https://localhost:9443

**Première connexion** :
1. Créer un compte admin (username + password fort)
2. Sélectionner **"Get Started"** → **"Local"**
3. Voir tous les conteneurs GlowCommerce

**Fonctionnalités** :
- 🐳 Gérer les conteneurs (start/stop/restart/logs)
- 📊 Voir les stats en temps réel (CPU, RAM, réseau)
- 💾 Gérer les volumes et réseaux
- 📦 Gérer les images Docker
- 🔧 Accéder au shell d'un conteneur

---

### 6. pgAdmin (PostgreSQL Client)

**URL** : http://localhost:5050

**Identifiants** :
- Email : `admin@glowcommerce.local`
- Password : `admin123`

**Configuration initiale** :
1. Clic droit sur **"Servers"** → **"Register" → "Server"**
2. **General** :
   - Name : `GlowCommerce DB`
3. **Connection** :
   - Host : `database`
   - Port : `5432`
   - Database : `glowcommerce`
   - Username : `glowcommerce_app`
   - Password : `changeme123`
   - ✅ Save password
4. **Save**

**Utilisation** :
- Query Tool : Exécuter des requêtes SQL
- View/Edit Data : Visualiser et modifier les données
- EXPLAIN ANALYZE : Analyser les performances des requêtes
- Backup/Restore : Sauvegarder et restaurer la base

---

### 7. PostgreSQL (Ligne de commande)

**Connexion directe** :
```bash
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce
```

**Commandes utiles** :
```sql
-- Lister les tables
\dt

-- Lister les utilisateurs
\du

-- Voir la structure d'une table
\d products

-- Quitter
\q
```

---

## 🔒 Variables d'environnement

Créez un fichier `.env` à la racine du projet pour personnaliser les identifiants :

```bash
# Base de données
DB_PASSWORD=VotreMotDePasseSecure123!

# JWT
JWT_SECRET=VotreCleSecrete256BitsMinimum

# Grafana
GRAFANA_PASSWORD=AdminGrafana123!

# pgAdmin
PGADMIN_EMAIL=votre-email@example.com
PGADMIN_PASSWORD=AdminPgAdmin123!
```

**⚠️ Important** : Ne jamais commiter le fichier `.env` dans Git !

Ajoutez dans `.gitignore` :
```
.env
```

---

## 📋 Checklist de démarrage

### Avant le premier lancement

- [ ] Docker Desktop installé et démarré
- [ ] Ports libres (3000, 5050, 8080, 9000, 9090, 3001)
- [ ] Fichier `.env` créé (optionnel, sinon valeurs par défaut)
- [ ] Git clone du repository effectué

### Lancement

```bash
# 1. Démarrer tous les services
docker-compose up -d

# 2. Attendre que tout démarre (~30 secondes)
docker-compose ps

# 3. Vérifier les logs si besoin
docker-compose logs -f backend
```

### Vérification

- [ ] Frontend accessible : http://localhost:3000
- [ ] Backend health : http://localhost:8080/actuator/health → `{"status":"UP"}`
- [ ] Prometheus targets UP : http://localhost:9090/targets
- [ ] Grafana accessible : http://localhost:3001
- [ ] Portainer accessible : http://localhost:9000
- [ ] pgAdmin accessible : http://localhost:5050

---

## 🛠️ Dépannage

### Port déjà utilisé

**Erreur** : `bind: address already in use`

**Solution** :
```bash
# Trouver quel processus utilise le port (exemple: 8080)
lsof -i :8080

# Arrêter le processus ou changer le port dans docker-compose.yml
ports:
  - "8081:8080"  # Utiliser 8081 au lieu de 8080
```

### Service ne démarre pas

```bash
# Voir les logs du service
docker-compose logs backend

# Redémarrer un service spécifique
docker-compose restart backend

# Reconstruire et redémarrer
docker-compose up -d --build backend
```

### Base de données vide

```bash
# Vérifier que init-db.sql a été exécuté
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce -c "\dt"

# Si vide, recréer les volumes
docker-compose down -v
docker-compose up -d
```

---

## 📞 Support

Pour toute question :
- Documentation complète : `/docs/`
- Guide monitoring : `MONITORING.md`
- Guide installation : `docs/guides/GUIDE-INSTALLATION.md`

---

**Dernière mise à jour** : 29 décembre 2024
