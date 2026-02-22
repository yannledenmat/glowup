# 📘 Guide d'Installation Complet - GlowCommerce

## Table des matières

1. [Prérequis](#prérequis)
2. [Installation de l'environnement](#installation-environnement)
3. [Démarrage du projet](#démarrage)
4. [Génération des PDFs](#génération-pdfs)
5. [Résolution de problèmes](#troubleshooting)

---

## Prérequis

### Logiciels requis

| Logiciel | Version | Installation |
|----------|---------|--------------|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Java JDK | 21+ | https://adoptium.net/ |
| Maven | 3.9+ | https://maven.apache.org/ |
| Node.js | 20+ | https://nodejs.org/ |
| Git | Latest | https://git-scm.com/ |

### Vérification des installations

```bash
# Vérifier Java
java -version
# Attendu : openjdk version "21.0.x"

# Vérifier Maven
mvn -version
# Attendu : Apache Maven 3.9.x

# Vérifier Node.js
node -version
# Attendu : v20.x.x

# Vérifier npm
npm -version
# Attendu : 10.x.x

# Vérifier Docker
docker --version
# Attendu : Docker version 24.x.x

docker-compose --version
# Attendu : Docker Compose version 2.x.x
```

---

## Installation de l'environnement

### 1. Cloner le projet

```bash
cd ~/Documents/dev/git
git clone <repository-url> glowup
cd glowup
```

### 2. Configuration des variables d'environnement

Créer un fichier `.env` à la racine :

```bash
cat > .env << 'EOF'
# Database
DB_PASSWORD=GlowCommerce2024!
DB_USERNAME=glowcommerce_app

# JWT
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Grafana
GRAFANA_PASSWORD=admin123
EOF
```

**⚠️ IMPORTANT :** Ne jamais committer le fichier `.env` !

Ajouter au `.gitignore` :
```bash
echo ".env" >> .gitignore
```

---

## Démarrage du projet

### Option 1 : Tout avec Docker (Recommandé)

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Vérifier le statut
docker-compose ps
```

**Services disponibles :**
- ✅ Backend API : http://localhost:8080
- ✅ Frontend React : http://localhost:3000
- ✅ PostgreSQL : localhost:5432
- ✅ Prometheus : http://localhost:9090
- ✅ Grafana : http://localhost:3001 (admin/admin123)

**Temps de démarrage :** ~2-3 minutes

### Option 2 : Développement local (Backend + Frontend séparés)

#### A. Démarrer uniquement la base de données

```bash
docker-compose up -d database
```

#### B. Démarrer le backend

```bash
cd glowcommerce-backend

# Première fois : télécharger les dépendances
mvn clean install -DskipTests

# Démarrer l'application
mvn spring-boot:run
```

**Backend disponible sur :** http://localhost:8080

**Vérifier :**
```bash
curl http://localhost:8080/actuator/health
# Attendu : {"status":"UP"}
```

#### C. Démarrer le frontend

```bash
cd glowcommerce-frontend

# Première fois : installer les dépendances
npm install

# Démarrer en mode dev
npm run dev
```

**Frontend disponible sur :** http://localhost:3000

---

## Génération des PDFs

### Installer Pandoc

#### macOS

```bash
# Avec Homebrew
brew install pandoc

# Installer LaTeX (nécessaire pour PDF)
brew install --cask basictex

# Ajouter au PATH
echo 'export PATH="/Library/TeX/texbin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y pandoc texlive-latex-base texlive-latex-extra texlive-fonts-recommended
```

#### Windows

1. Télécharger Pandoc : https://pandoc.org/installing.html
2. Installer MiKTeX : https://miktex.org/download
3. Ajouter au PATH

### Générer tous les PDFs

```bash
cd ~/Documents/dev/git/glowup

# Rendre le script exécutable
chmod +x generate-pdfs.sh

# Lancer la génération
./generate-pdfs.sh
```

Les PDFs seront créés dans le dossier `pdfs/`.

### Générer un PDF spécifique

```bash
pandoc formation-glowcommerce.md \
  -o formation-glowcommerce.pdf \
  --toc \
  --toc-depth=3 \
  --number-sections \
  --highlight-style=tango \
  --pdf-engine=pdflatex \
  -V geometry:margin=2.5cm \
  -V linkcolor:blue \
  -V fontsize=11pt
```

### Alternative : Conversion en ligne

Si l'installation de Pandoc pose problème, utiliser des services en ligne :

1. **CloudConvert** : https://cloudconvert.com/md-to-pdf
2. **Dillinger** : https://dillinger.io/ (éditer + exporter)
3. **Markdown to PDF** (extension VS Code)

---

## Tests

### Backend

```bash
cd glowcommerce-backend

# Tests unitaires
mvn test

# Tests d'intégration
mvn verify

# Couverture de code
mvn jacoco:report
# Rapport dans : target/site/jacoco/index.html

# Scan de sécurité
mvn org.owasp:dependency-check-maven:check
```

### Frontend

```bash
cd glowcommerce-frontend

# Tests unitaires
npm test

# Linter
npm run lint

# Build de production
npm run build
```

---

## Résolution de problèmes

### Problème : Port déjà utilisé

**Symptôme :**
```
Error starting userland proxy: listen tcp4 0.0.0.0:8080: bind: address already in use
```

**Solution :**
```bash
# Trouver le processus utilisant le port 8080
lsof -i :8080

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans docker-compose.yml
ports:
  - "8081:8080"  # Utiliser 8081 au lieu de 8080
```

### Problème : Base de données non prête

**Symptôme :**
```
org.postgresql.util.PSQLException: Connection refused
```

**Solution :**
```bash
# Attendre que PostgreSQL soit prêt
docker-compose up -d database
sleep 10

# Vérifier les logs
docker-compose logs database

# Redémarrer le backend
docker-compose restart backend
```

### Problème : Erreur Maven - Dépendances manquantes

**Solution :**
```bash
cd glowcommerce-backend

# Nettoyer le cache Maven
mvn clean

# Re-télécharger les dépendances
mvn dependency:purge-local-repository
mvn clean install
```

### Problème : Erreur npm - Modules manquants

**Solution :**
```bash
cd glowcommerce-frontend

# Supprimer node_modules et package-lock.json
rm -rf node_modules package-lock.json

# Réinstaller
npm install
```

### Problème : Docker - Pas assez de mémoire

**Symptôme :**
```
killed
```

**Solution :**

Dans Docker Desktop :
1. Settings > Resources
2. Augmenter Memory à 4 GB minimum (8 GB recommandé)
3. Restart Docker Desktop

### Problème : PDF génération échoue

**Symptôme :**
```
pandoc: pdflatex not found
```

**Solution :**

Vérifier l'installation de LaTeX :
```bash
# macOS
which pdflatex
# Si non trouvé :
brew install --cask basictex

# Linux
sudo apt-get install texlive-latex-base
```

---

## Commandes utiles

### Docker

```bash
# Arrêter tous les services
docker-compose down

# Supprimer les volumes (ATTENTION : perte de données)
docker-compose down -v

# Rebuild une image
docker-compose build backend

# Voir les logs en temps réel
docker-compose logs -f backend

# Accéder à un conteneur
docker exec -it glowcommerce-backend sh
```

### PostgreSQL

```bash
# Se connecter à la DB
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce

# Lister les tables
\dt

# Voir le schéma d'une table
\d users

# Quitter
\q
```

### Prometheus / Grafana

**Prometheus :**
- Interface : http://localhost:9090
- Exemple query : `http_server_requests_seconds_count`

**Grafana :**
- Interface : http://localhost:3001
- Credentials : admin / admin123
- Ajouter datasource : http://prometheus:9090

---

## Structure finale du projet

```
glowup/
├── formation-glowcommerce.md                 # Modules 1-2
├── formation-glowcommerce-suite.md           # Modules 3-4
├── formation-glowcommerce-demos-tps.md       # Démos + TPs
├── formation-glowcommerce-evaluation.md      # QCM + Étude de cas
├── formation-glowcommerce-tracabilite.md     # Traçabilité compétences
├── formation-glowcommerce-diagrammes.md      # 20 diagrammes
├── slides-module1-securite-systemes.md       # Slides Module 1
├── slides-modules-2-3-4-resume.md            # Structure slides 2-3-4
├── README-FORMATION.md                       # Guide formation
├── SYNTHESE-FINALE-FORMATION.md              # Synthèse complète
├── README.md                                 # Documentation projet
├── GUIDE-INSTALLATION.md                     # Ce fichier
├── docker-compose.yml                        # Orchestration services
├── init-db.sql                               # Initialisation DB
├── generate-pdfs.sh                          # Script génération PDF
├── .env                                      # Variables d'environnement
├── .gitignore                                # Fichiers à ignorer
├── glowcommerce-backend/                     # Backend Java/Spring Boot
│   ├── src/main/java/com/glowcommerce/
│   ├── src/main/resources/
│   ├── pom.xml
│   ├── Dockerfile
│   └── README.md
├── glowcommerce-frontend/                    # Frontend React
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── prometheus/
│   └── prometheus.yml                        # Config Prometheus
├── grafana/
│   └── provisioning/                         # Dashboards
└── pdfs/                                     # PDFs générés
    ├── formation-glowcommerce.pdf
    ├── formation-glowcommerce-suite.pdf
    └── ...
```

---

## Prochaines étapes

1. ✅ Installation terminée
2. ✅ Services démarrés
3. ✅ PDFs générés
4. 📚 Lire la formation : `README-FORMATION.md`
5. 🎓 Suivre le planning des 5 jours
6. 💻 Réaliser les TPs et démos
7. 📝 Passer l'évaluation finale

---

## Support

En cas de problème :
1. Consulter la section [Résolution de problèmes](#résolution-de-problèmes)
2. Vérifier les logs : `docker-compose logs`
3. Relire attentivement les messages d'erreur

---

**Bonne formation ! 🚀**

© 2024 GlowCommerce - Formation Bac+5
