# Guide de Lancement des Services GlowCommerce

Ce guide explique comment lancer les services individuellement sur **Linux/macOS** et **Windows**.

## Table des matières

- [Prérequis](#prérequis)
- [Sur Linux/macOS (avec Make)](#sur-linuxmacos-avec-make)
- [Sur Windows](#sur-windows)
- [Services disponibles](#services-disponibles)
- [Ports utilisés](#ports-utilisés)
- [Dépannage](#dépannage)

---

## Prérequis

### Pour tous les systèmes

- **Docker** installé et en cours d'exécution
- **Docker Compose** (inclus avec Docker Desktop)

### Pour Linux/macOS

- `make` (généralement préinstallé)

### Pour Windows

- **PowerShell** ou **CMD**
- Pas besoin de `make` - utilisez directement les commandes `docker-compose`

---

## Sur Linux/macOS (avec Make)

### Afficher l'aide

```bash
make help
```

### Lancer tous les services

```bash
make all
# ou
make up
```

### Lancer des services individuels

```bash
make database    # PostgreSQL uniquement
make backend     # Backend Spring Boot (+ DB automatiquement)
make frontend    # Frontend React (+ Backend + DB automatiquement)
make prometheus  # Prometheus uniquement
make grafana     # Grafana (+ Prometheus automatiquement)
make portainer   # Portainer uniquement
make pgadmin     # pgAdmin (+ DB automatiquement)
```

### Lancer des groupes de services

```bash
make app         # Application complète (DB + Backend + Frontend)
make monitoring  # Outils de monitoring (Prometheus + Grafana)
make tools       # Outils d'administration (Portainer + pgAdmin)
make dev         # Environnement complet de développement
```

### Arrêter des services

```bash
make down              # Arrête tous les services
make database-stop     # Arrête PostgreSQL
make backend-stop      # Arrête le backend
make frontend-stop     # Arrête le frontend
# etc...
```

### Redémarrer des services

```bash
make restart           # Redémarre tous les services
make database-restart  # Redémarre PostgreSQL
make backend-restart   # Redémarre le backend
make frontend-restart  # Redémarre le frontend
# etc...
```

### Voir les logs

```bash
make logs             # Tous les services
make database-logs    # PostgreSQL uniquement
make backend-logs     # Backend uniquement
make frontend-logs    # Frontend uniquement
# etc...
```

### Autres commandes utiles

```bash
make status           # Statut de tous les services
make health           # Vérifie la santé des services
make rebuild          # Reconstruit tous les conteneurs
make clean            # Nettoie tout (⚠️ supprime les données!)
make shell-backend    # Ouvre un shell dans le backend
make shell-database   # Ouvre un shell PostgreSQL
```

---

## Sur Windows

Sur Windows, utilisez directement les commandes `docker-compose` dans **PowerShell** ou **CMD**.

### Afficher les services actifs

```powershell
docker-compose ps
```

### Lancer tous les services

```powershell
docker-compose up -d
```

### Lancer des services individuels

```powershell
# PostgreSQL uniquement
docker-compose up -d database

# Backend Spring Boot (+ DB automatiquement si elle n'est pas démarrée)
docker-compose up -d backend

# Frontend React (+ Backend + DB automatiquement)
docker-compose up -d frontend

# Prometheus uniquement
docker-compose up -d prometheus

# Grafana (+ Prometheus automatiquement)
docker-compose up -d grafana

# Portainer uniquement
docker-compose up -d portainer

# pgAdmin (+ DB automatiquement)
docker-compose up -d pgadmin
```

### Lancer des groupes de services

```powershell
# Application complète (DB + Backend + Frontend)
docker-compose up -d database backend frontend

# Outils de monitoring (Prometheus + Grafana)
docker-compose up -d prometheus grafana

# Outils d'administration (Portainer + pgAdmin)
docker-compose up -d portainer pgadmin

# Environnement complet
docker-compose up -d
```

### Arrêter des services

```powershell
# Arrêter tous les services
docker-compose down

# Arrêter un service spécifique
docker-compose stop database
docker-compose stop backend
docker-compose stop frontend
docker-compose stop prometheus
docker-compose stop grafana
docker-compose stop portainer
docker-compose stop pgadmin
```

### Redémarrer des services

```powershell
# Redémarrer tous les services
docker-compose restart

# Redémarrer un service spécifique
docker-compose restart database
docker-compose restart backend
docker-compose restart frontend
docker-compose restart prometheus
docker-compose restart grafana
docker-compose restart portainer
docker-compose restart pgadmin
```

### Voir les logs

```powershell
# Tous les services (mode suivi)
docker-compose logs -f

# Service spécifique (mode suivi)
docker-compose logs -f database
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f portainer
docker-compose logs -f pgadmin

# Dernières lignes uniquement (sans suivi)
docker-compose logs --tail=100 backend
```

### Autres commandes utiles

```powershell
# Vérifier le statut des services
docker-compose ps

# Reconstruire les conteneurs
docker-compose build
docker-compose up -d --build

# Reconstruire un service spécifique
docker-compose build backend
docker-compose up -d backend

# Ouvrir un shell dans un conteneur
docker-compose exec backend /bin/sh
docker-compose exec frontend /bin/sh

# Ouvrir un shell PostgreSQL
docker-compose exec database psql -U glowcommerce_app -d glowcommerce

# Nettoyer tout (⚠️ supprime les volumes/données!)
docker-compose down -v

# Nettoyer Docker complètement
docker system prune -af --volumes
```

### Script PowerShell (optionnel)

Pour faciliter l'utilisation sur Windows, vous pouvez créer un fichier `run.ps1`:

```powershell
# run.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$Command = "help",

    [Parameter(Mandatory=$false)]
    [string]$Service = ""
)

switch ($Command) {
    "up" {
        if ($Service) {
            docker-compose up -d $Service
        } else {
            docker-compose up -d
        }
    }
    "down" {
        docker-compose down
    }
    "stop" {
        if ($Service) {
            docker-compose stop $Service
        } else {
            docker-compose stop
        }
    }
    "restart" {
        if ($Service) {
            docker-compose restart $Service
        } else {
            docker-compose restart
        }
    }
    "logs" {
        if ($Service) {
            docker-compose logs -f $Service
        } else {
            docker-compose logs -f
        }
    }
    "status" {
        docker-compose ps
    }
    "clean" {
        docker-compose down -v
    }
    "help" {
        Write-Host "Usage: .\run.ps1 [command] [service]" -ForegroundColor Green
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  up [service]      - Lance les services"
        Write-Host "  down              - Arrête tous les services"
        Write-Host "  stop [service]    - Arrête un service"
        Write-Host "  restart [service] - Redémarre un service"
        Write-Host "  logs [service]    - Affiche les logs"
        Write-Host "  status            - Statut des services"
        Write-Host "  clean             - Nettoie tout"
        Write-Host ""
        Write-Host "Services:" -ForegroundColor Yellow
        Write-Host "  database, backend, frontend, prometheus, grafana, portainer, pgadmin"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Cyan
        Write-Host "  .\run.ps1 up database"
        Write-Host "  .\run.ps1 logs backend"
        Write-Host "  .\run.ps1 restart frontend"
    }
    default {
        Write-Host "Commande inconnue. Utilisez '.\run.ps1 help' pour voir les commandes disponibles." -ForegroundColor Red
    }
}
```

Ensuite, utilisez-le comme ceci:

```powershell
.\run.ps1 help
.\run.ps1 up database
.\run.ps1 logs backend
.\run.ps1 restart frontend
.\run.ps1 status
```

---

## Services disponibles

| Service | Description | Port(s) | Commande Make | Commande Docker |
|---------|-------------|---------|---------------|-----------------|
| **database** | PostgreSQL 16 | 5432 | `make database` | `docker-compose up -d database` |
| **backend** | Spring Boot API | 8080 | `make backend` | `docker-compose up -d backend` |
| **frontend** | React/Vite | 3000 | `make frontend` | `docker-compose up -d frontend` |
| **prometheus** | Monitoring | 9090 | `make prometheus` | `docker-compose up -d prometheus` |
| **grafana** | Visualisation | 3001 | `make grafana` | `docker-compose up -d grafana` |
| **portainer** | Docker UI | 9000, 9443 | `make portainer` | `docker-compose up -d portainer` |
| **pgadmin** | PostgreSQL UI | 5050 | `make pgadmin` | `docker-compose up -d pgadmin` |

---

## Ports utilisés

| Port | Service | URL |
|------|---------|-----|
| **3000** | Frontend | http://localhost:3000 |
| **8080** | Backend API | http://localhost:8080 |
| **5432** | PostgreSQL | localhost:5432 |
| **9090** | Prometheus | http://localhost:9090 |
| **3001** | Grafana | http://localhost:3001 |
| **9000** | Portainer HTTP | http://localhost:9000 |
| **9443** | Portainer HTTPS | https://localhost:9443 |
| **5050** | pgAdmin | http://localhost:5050 |

---

## Identifiants par défaut

### Grafana
- **URL**: http://localhost:3001
- **Login**: `admin`
- **Password**: `admin123`

### pgAdmin
- **URL**: http://localhost:5050
- **Email**: `admin@glowcommerce.local`
- **Password**: `admin123`

### PostgreSQL (connexion directe)
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `glowcommerce`
- **User**: `glowcommerce_app`
- **Password**: `changeme123`

---

## Dépendances entre services

Certains services dépendent d'autres services. Docker Compose les démarre automatiquement:

- **backend** → nécessite **database**
- **frontend** → nécessite **backend** (donc aussi **database**)
- **grafana** → nécessite **prometheus**
- **pgadmin** → nécessite **database**

### Exemple:
Si vous lancez `make frontend` ou `docker-compose up -d frontend`, Docker va automatiquement démarrer:
1. **database** (PostgreSQL)
2. **backend** (Spring Boot)
3. **frontend** (React)

---

## Dépannage

### Les services ne démarrent pas

**Vérifier que Docker est lancé:**
```bash
docker ps
```

**Vérifier les logs d'erreur:**
```bash
# Linux/macOS
make logs

# Windows
docker-compose logs
```

### Port déjà utilisé

Si un port est déjà utilisé, modifiez le `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3001:80"  # Change 3000 en 3001
```

### Problèmes de connexion backend/database

**Attendre que la base soit prête:**
```bash
# Linux/macOS
make database-logs

# Windows
docker-compose logs -f database
```

Attendez le message: `database system is ready to accept connections`

### Nettoyer et recommencer

**Attention: cela supprime toutes les données!**

```bash
# Linux/macOS
make clean
make up

# Windows
docker-compose down -v
docker-compose up -d
```

### Vérifier l'état de santé

```bash
# Linux/macOS
make health

# Windows
docker-compose ps
```

### Reconstruire les images

Si vous avez modifié le code:

```bash
# Linux/macOS
make rebuild

# Windows
docker-compose build --no-cache
docker-compose up -d
```

---

## Exemples d'utilisation

### Scénario 1: Développement Frontend uniquement

```bash
# Linux/macOS
make backend  # Lance backend + database
# Développez votre frontend en local (npm run dev)

# Windows
docker-compose up -d backend
# Développez votre frontend en local (npm run dev)
```

### Scénario 2: Développement Backend uniquement

```bash
# Linux/macOS
make database  # Lance uniquement la base de données
# Développez votre backend en local (./mvnw spring-boot:run)

# Windows
docker-compose up -d database
# Développez votre backend en local
```

### Scénario 3: Tester l'application complète

```bash
# Linux/macOS
make app  # Lance database + backend + frontend

# Windows
docker-compose up -d database backend frontend
```

### Scénario 4: Monitoring uniquement

```bash
# Linux/macOS
make monitoring  # Lance Prometheus + Grafana

# Windows
docker-compose up -d prometheus grafana
```

### Scénario 5: Tout l'environnement

```bash
# Linux/macOS
make dev  # Lance tous les services

# Windows
docker-compose up -d
```

---

## Commandes rapides

### Linux/macOS

```bash
make help              # Aide
make app               # Lance l'application
make monitoring        # Lance le monitoring
make logs              # Voir tous les logs
make backend-logs      # Logs du backend
make status            # Statut des services
make down              # Tout arrêter
```

### Windows

```powershell
docker-compose ps                          # Statut
docker-compose up -d backend               # Lancer backend
docker-compose logs -f backend             # Logs backend
docker-compose restart backend             # Redémarrer backend
docker-compose stop backend                # Arrêter backend
docker-compose down                        # Tout arrêter
docker-compose up -d database backend frontend  # App complète
```

---

## Notes importantes

1. **Première exécution**: La première fois, Docker va télécharger toutes les images (ça peut prendre du temps)

2. **Build des images**: Si vous modifiez le code, pensez à reconstruire:
   ```bash
   # Linux/macOS
   make backend-build
   make frontend-build

   # Windows
   docker-compose build backend
   docker-compose build frontend
   ```

3. **Volumes persistants**: Les données sont sauvegardées dans des volumes Docker:
   - `postgres_data`: Base de données
   - `grafana_data`: Configuration Grafana
   - `prometheus_data`: Données Prometheus
   - `portainer_data`: Configuration Portainer
   - `pgadmin_data`: Configuration pgAdmin

4. **Nettoyage**: Pour libérer de l'espace disque:
   ```bash
   # Linux/macOS
   make prune

   # Windows
   docker system prune -af --volumes
   ```

---

## Support

Pour plus d'informations, consultez:
- [README.md](README.md) - Documentation générale
- [MONITORING.md](MONITORING.md) - Guide de monitoring
- [PORTS.md](PORTS.md) - Liste des ports utilisés
- [docker-compose.yml](docker-compose.yml) - Configuration Docker

---

**Bon développement! 🚀**
