# 🍎 Guide d'Installation - macOS

## Vue d'ensemble

Ce guide détaille l'installation complète de GlowCommerce sur macOS (Big Sur 11+, Monterey, Ventura, Sonoma).

## Prérequis système

- macOS 11 Big Sur ou supérieur
- 8 GB RAM minimum (16 GB recommandé)
- 20 GB d'espace disque libre
- Architecture Intel ou Apple Silicon (M1/M2/M3)

---

## 1. Installation de Homebrew

Homebrew est le gestionnaire de paquets pour macOS, indispensable pour installer les outils.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Configuration du PATH (Apple Silicon uniquement)

Si vous avez un Mac M1/M2/M3, ajouter à `~/.zshrc` :

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

### Vérification

```bash
brew --version
# Attendu : Homebrew 4.x.x
```

---

## 2. Installation de Docker Desktop

### Téléchargement et installation

```bash
# Télécharger via Homebrew
brew install --cask docker
```

**Ou manuellement :**
1. Télécharger depuis https://www.docker.com/products/docker-desktop
2. Choisir la version pour votre architecture :
   - **Intel** : Docker Desktop for Mac (Intel chip)
   - **Apple Silicon** : Docker Desktop for Mac (Apple chip)
3. Glisser Docker.app dans Applications
4. Lancer Docker Desktop

### Configuration

1. Ouvrir Docker Desktop
2. Preferences → Resources
   - **CPUs** : 4 minimum (8 recommandé)
   - **Memory** : 8 GB minimum (16 GB recommandé)
   - **Disk** : 20 GB minimum

### Vérification

```bash
docker --version
# Attendu : Docker version 24.x.x

docker compose version
# Attendu : Docker Compose version v2.x.x
```

---

## 3. Installation de Java 21

### Avec Homebrew (recommandé)

```bash
# Installer OpenJDK 21
brew install openjdk@21

# Créer un lien symbolique
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

### Configuration JAVA_HOME

Ajouter à `~/.zshrc` ou `~/.bash_profile` :

```bash
# Pour Apple Silicon (M1/M2/M3)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21

# Pour Intel
# export JAVA_HOME=/usr/local/opt/openjdk@21

export PATH="$JAVA_HOME/bin:$PATH"
```

Recharger :
```bash
source ~/.zshrc
```

### Vérification

```bash
java -version
# Attendu : openjdk version "21.0.x"

javac -version
# Attendu : javac 21.0.x
```

---

## 4. Installation de Maven

### Avec Homebrew

```bash
brew install maven
```

### Vérification

```bash
mvn -version
# Attendu : Apache Maven 3.9.x
```

---

## 5. Installation de Node.js et npm

### Avec Homebrew (version LTS)

```bash
brew install node@20
```

### Ajouter au PATH

```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Avec NVM (Node Version Manager, recommandé)

```bash
# Installer NVM
brew install nvm

# Créer le dossier NVM
mkdir ~/.nvm

# Ajouter à ~/.zshrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

# Installer Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

### Vérification

```bash
node --version
# Attendu : v20.x.x

npm --version
# Attendu : 10.x.x
```

---

## 6. Installation de Git

### Avec Homebrew

```bash
brew install git
```

Git est normalement déjà installé sur macOS, mais Homebrew fournit une version plus récente.

### Configuration

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
```

### Vérification

```bash
git --version
# Attendu : git version 2.x.x
```

---

## 7. Cloner et configurer le projet

### Clonage

```bash
# Créer un dossier de travail
mkdir -p ~/Documents/dev
cd ~/Documents/dev

# Cloner le projet
git clone <repository-url> glowup
cd glowup
```

### Créer le fichier .env

```bash
cat > .env << 'EOF'
DB_PASSWORD=GlowCommerce2024!
DB_USERNAME=glowcommerce_app
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
GRAFANA_PASSWORD=admin123
EOF
```

---

## 8. Lancer le projet avec Docker

### Démarrage

```bash
# S'assurer que Docker Desktop est démarré

# Lancer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f
```

### Vérifier le statut

```bash
docker compose ps
```

### Accéder aux services

| Service | URL | Credentials |
|---------|-----|-------------|
| 🌐 Frontend | http://localhost:3000 | - |
| 🔧 Backend API | http://localhost:8080 | - |
| 📊 Actuator | http://localhost:8080/actuator/health | - |
| 📈 Prometheus | http://localhost:9090 | - |
| 📊 Grafana | http://localhost:3001 | admin / admin123 |

### Arrêter les services

```bash
docker compose down
```

---

## 9. Développement local (optionnel)

### Backend

```bash
cd glowcommerce-backend

# Build
mvn clean install -DskipTests

# Lancer
mvn spring-boot:run
```

**Backend disponible sur :** http://localhost:8080

### Frontend

```bash
cd glowcommerce-frontend

# Installer les dépendances
npm install

# Lancer en mode dev
npm run dev
```

**Frontend disponible sur :** http://localhost:3000

---

## 10. Génération des PDFs

### Installation de Pandoc et LaTeX

```bash
# Installer Pandoc
brew install pandoc

# Installer BasicTeX (distribution LaTeX légère)
brew install --cask basictex

# Ajouter LaTeX au PATH
echo 'export PATH="/Library/TeX/texbin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Installer les packages LaTeX nécessaires

```bash
# Mise à jour de tlmgr
sudo tlmgr update --self

# Installer les packages requis
sudo tlmgr install collection-fontsrecommended
sudo tlmgr install collection-latexextra
```

### Générer les PDFs

```bash
# Rendre le script exécutable
chmod +x generate-pdfs.sh

# Exécuter
./generate-pdfs.sh
```

Les PDFs seront dans le dossier `pdfs/`.

---

## 11. Outils recommandés (optionnels)

### IDE / Éditeurs

```bash
# VS Code
brew install --cask visual-studio-code

# IntelliJ IDEA Community
brew install --cask intellij-idea-ce
```

### Client PostgreSQL

```bash
# pgAdmin 4
brew install --cask pgadmin4

# Postico (natif macOS, payant mais excellent)
brew install --cask postico

# DBeaver
brew install --cask dbeaver-community
```

### Connexion à la base

```
Host: localhost
Port: 5432
Database: glowcommerce
Username: glowcommerce_app
Password: GlowCommerce2024!
```

### Client REST API

```bash
# Postman
brew install --cask postman

# Insomnia
brew install --cask insomnia
```

---

## Résolution de problèmes

### Problème : Port déjà utilisé

**Erreur :** "Bind for 0.0.0.0:8080 failed: port is already allocated"

**Solution :**
```bash
# Trouver le processus utilisant le port
lsof -i :8080

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans docker-compose.yml
```

### Problème : Docker manque de mémoire (Apple Silicon)

**Solution :**
1. Ouvrir Docker Desktop
2. Settings → Resources
3. Augmenter Memory à 8 GB minimum
4. Apply & Restart

### Problème : npm install échoue avec EACCES

**Solution :**
```bash
# Changer le propriétaire du dossier npm global
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Ou utiliser NVM (recommandé)
```

### Problème : Command not found après installation

**Solution :**
```bash
# Recharger le shell
source ~/.zshrc

# Ou redémarrer le terminal
```

### Problème : Permission denied sur generate-pdfs.sh

**Solution :**
```bash
chmod +x generate-pdfs.sh
```

### Problème : pdflatex not found

**Solution :**
```bash
# Vérifier que le PATH inclut LaTeX
echo $PATH | grep texbin

# Si absent, ajouter à ~/.zshrc
echo 'export PATH="/Library/TeX/texbin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Problème : Maven build échoue

**Solution :**
```bash
# Nettoyer le cache Maven
rm -rf ~/.m2/repository

# Rebuild
mvn clean install -U
```

---

## Commandes utiles

### Docker

```bash
# Lister les conteneurs
docker ps

# Voir les logs
docker logs glowcommerce-backend -f

# Entrer dans un conteneur
docker exec -it glowcommerce-backend sh

# Nettoyer Docker
docker system prune -a
```

### Homebrew

```bash
# Mettre à jour Homebrew
brew update

# Mettre à jour les packages
brew upgrade

# Lister les packages installés
brew list
```

---

## Optimisations macOS

### Augmenter les limites de fichiers ouverts

```bash
# Ajouter à ~/.zshrc
echo 'ulimit -n 65536' >> ~/.zshrc
source ~/.zshrc
```

### Désactiver le Gatekeeper pour les développeurs

```bash
# Pour ne pas avoir à autoriser chaque nouvel outil
sudo spctl --master-disable
```

**⚠️ Attention :** Réactiver après les installations :
```bash
sudo spctl --master-enable
```

---

## Architectures supportées

| Architecture | Statut | Notes |
|--------------|--------|-------|
| **Intel x86_64** | ✅ Testé | Toutes les versions macOS 11+ |
| **Apple Silicon (M1)** | ✅ Testé | Rosetta 2 non nécessaire |
| **Apple Silicon (M2/M3)** | ✅ Testé | Performance optimale |

### Spécificités Apple Silicon

Les Macs M1/M2/M3 utilisent une architecture ARM. Toutes les dépendances du projet (Docker, Java, Node.js) ont des versions natives ARM.

**Chemins différents :**
- Homebrew : `/opt/homebrew` (au lieu de `/usr/local`)
- Java : `/opt/homebrew/opt/openjdk@21`

---

## Raccourcis clavier macOS utiles

| Raccourci | Action |
|-----------|--------|
| `Cmd + Space` | Spotlight (recherche) |
| `Cmd + Tab` | Changer d'application |
| `Cmd + T` | Nouvel onglet Terminal |
| `Cmd + K` | Nettoyer Terminal |
| `Cmd + Q` | Quitter l'application |

---

## Versions macOS testées

| Version | Nom | Statut |
|---------|-----|--------|
| 14.x | Sonoma | ✅ Testé |
| 13.x | Ventura | ✅ Testé |
| 12.x | Monterey | ✅ Testé |
| 11.x | Big Sur | ✅ Compatible |

---

## Prochaines étapes

1. ✅ Installation terminée
2. ✅ Services Docker démarrés
3. 📚 Lire la [documentation principale](../../README.md)
4. 🎓 Suivre la [formation](README-FORMATION.md)
5. 💻 Développer avec le projet

---

## Ressources

- [Homebrew](https://brew.sh/)
- [Docker Desktop pour Mac](https://docs.docker.com/desktop/install/mac-install/)
- [Node.js](https://nodejs.org/)
- [OpenJDK](https://openjdk.org/)
- [MacTeX](https://www.tug.org/mactex/)

---

**Dernière mise à jour :** 1er décembre 2024
**Testé sur :** macOS Sonoma 14.1, Ventura 13.6 (Intel & Apple Silicon)
**Version :** 1.0.0

© 2024 - Formation GlowCommerce
