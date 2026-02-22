# 💻 Guide d'Installation - Windows 10/11

## Vue d'ensemble

Ce guide détaille l'installation complète de GlowCommerce sur Windows 10 ou Windows 11.

## Prérequis système

- Windows 10 (version 2004 ou supérieure) ou Windows 11
- 8 GB RAM minimum (16 GB recommandé)
- 20 GB d'espace disque libre
- Droits administrateur pour l'installation

---

## 1. Installation de Docker Desktop

### Téléchargement

1. Aller sur https://www.docker.com/products/docker-desktop
2. Télécharger Docker Desktop pour Windows
3. Exécuter l'installateur `Docker Desktop Installer.exe`

### Installation

1. **Activer WSL 2** (Windows Subsystem for Linux)
   ```powershell
   # Ouvrir PowerShell en administrateur
   wsl --install
   ```

2. **Redémarrer l'ordinateur**

3. **Lancer Docker Desktop**
   - Accepter les conditions d'utilisation
   - Créer un compte Docker Hub (optionnel)

### Vérification

```powershell
docker --version
# Attendu : Docker version 24.x.x

docker-compose --version
# Attendu : Docker Compose version v2.x.x
```

### Configuration recommandée

1. Ouvrir Docker Desktop
2. Settings → Resources
   - **Memory** : 4 GB minimum (8 GB recommandé)
   - **CPUs** : 2 minimum (4 recommandé)
   - **Disk** : 20 GB minimum

---

## 2. Installation de Java 21

### Avec Chocolatey (recommandé)

```powershell
# Installer Chocolatey si pas déjà fait
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Installer Java 21
choco install temurin21 -y
```

### Installation manuelle

1. Télécharger depuis https://adoptium.net/
2. Sélectionner **Temurin 21 (LTS)**
3. Choisir **Windows x64**
4. Installer le fichier `.msi`

### Configuration des variables d'environnement

1. Ouvrir **Panneau de configuration** → **Système** → **Paramètres système avancés**
2. Cliquer sur **Variables d'environnement**
3. Ajouter/Modifier :
   - `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot`
   - Ajouter `%JAVA_HOME%\bin` au `Path`

### Vérification

```powershell
java -version
# Attendu : openjdk version "21.0.x"

javac -version
# Attendu : javac 21.0.x
```

---

## 3. Installation de Maven

### Avec Chocolatey

```powershell
choco install maven -y
```

### Installation manuelle

1. Télécharger depuis https://maven.apache.org/download.cgi
2. Extraire l'archive dans `C:\Program Files\Apache\maven`
3. Ajouter `C:\Program Files\Apache\maven\bin` au `Path`

### Vérification

```powershell
mvn -version
# Attendu : Apache Maven 3.9.x
```

---

## 4. Installation de Node.js et npm

### Avec Chocolatey

```powershell
choco install nodejs-lts -y
```

### Installation manuelle

1. Télécharger depuis https://nodejs.org/
2. Choisir la version **LTS** (20.x)
3. Installer le fichier `.msi`

### Vérification

```powershell
node -version
# Attendu : v20.x.x

npm -version
# Attendu : 10.x.x
```

---

## 5. Installation de Git

### Avec Chocolatey

```powershell
choco install git -y
```

### Installation manuelle

1. Télécharger depuis https://git-scm.com/download/win
2. Installer avec les options par défaut

### Configuration Git Bash

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
```

### Vérification

```powershell
git --version
# Attendu : git version 2.x.x
```

---

## 6. Cloner et configurer le projet

### Clonage

```powershell
# Créer un dossier de travail
cd C:\Users\VotreNom\Documents
mkdir dev
cd dev

# Cloner le projet
git clone <repository-url> glowup
cd glowup
```

### Créer le fichier .env

```powershell
# Utiliser un éditeur de texte (notepad, VS Code)
notepad .env
```

Contenu du fichier `.env` :
```env
DB_PASSWORD=GlowCommerce2024!
DB_USERNAME=glowcommerce_app
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
GRAFANA_PASSWORD=admin123
```

---

## 7. Lancer le projet avec Docker

### Démarrage

```powershell
# S'assurer que Docker Desktop est démarré

# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### Attendre que tout démarre (~2-3 minutes)

Vérifier le statut :
```powershell
docker-compose ps
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

```powershell
docker-compose down
```

---

## 8. Développement local (optionnel)

### Backend

```powershell
cd glowcommerce-backend

# Build
mvn clean install -DskipTests

# Lancer
mvn spring-boot:run
```

**Backend disponible sur :** http://localhost:8080

### Frontend

```powershell
cd glowcommerce-frontend

# Installer les dépendances
npm install

# Lancer en mode dev
npm run dev
```

**Frontend disponible sur :** http://localhost:3000

---

## 9. Génération des PDFs

### Installation de Pandoc

#### Avec Chocolatey (recommandé)

```powershell
choco install pandoc miktex -y
```

#### Installation manuelle

1. **Pandoc** : https://pandoc.org/installing.html
   - Télécharger le `.msi` pour Windows
   - Installer normalement

2. **MiKTeX** : https://miktex.org/download
   - Télécharger le setup
   - Installer avec les options par défaut

### Générer les PDFs

```powershell
# Avec PowerShell
.\generate-pdfs.ps1

# Ou manuellement
pandoc docs\formation\formation-glowcommerce.md -o formation.pdf
```

Les PDFs seront dans le dossier `pdfs\`.

---

## 10. Outils recommandés (optionnels)

### IDE / Éditeurs

**Pour Java :**
- IntelliJ IDEA Community : https://www.jetbrains.com/idea/download/
- VS Code avec extensions Java

**Pour React :**
- VS Code : https://code.visualstudio.com/
  - Extensions : ESLint, Prettier, ES7+ React snippets

### Client PostgreSQL

- **pgAdmin 4** : https://www.pgadmin.org/download/
- **DBeaver** : https://dbeaver.io/download/

### Connexion à la base

```
Host: localhost
Port: 5432
Database: glowcommerce
Username: glowcommerce_app
Password: GlowCommerce2024!
```

### Client REST API

- **Postman** : https://www.postman.com/downloads/
- **Insomnia** : https://insomnia.rest/download

---

## Résolution de problèmes

### Problème : Docker ne démarre pas

**Erreur :** "WSL 2 installation is incomplete"

**Solution :**
```powershell
# Mettre à jour WSL
wsl --update

# Définir WSL 2 comme version par défaut
wsl --set-default-version 2
```

### Problème : Port déjà utilisé

**Erreur :** "Port 8080 is already allocated"

**Solution :**
```powershell
# Trouver le processus utilisant le port
netstat -ano | findstr :8080

# Tuer le processus (remplacer PID par le numéro)
taskkill /PID <PID> /F

# Ou changer le port dans docker-compose.yml
```

### Problème : Docker manque de mémoire

**Symptôme :** Conteneurs qui s'arrêtent de façon inattendue

**Solution :**
1. Ouvrir Docker Desktop
2. Settings → Resources
3. Augmenter Memory à 8 GB
4. Apply & Restart

### Problème : npm install échoue

**Erreur :** "Cannot find module" ou "EACCES"

**Solution :**
```powershell
# Nettoyer le cache npm
npm cache clean --force

# Supprimer node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Réinstaller
npm install
```

### Problème : Maven build échoue

**Erreur :** "Could not find or load main class"

**Solution :**
```powershell
# Nettoyer le projet
mvn clean

# Rebuild complet
mvn clean install -U
```

### Problème : Génération PDF échoue

**Erreur :** "pdflatex not found"

**Solution :**
1. Vérifier que MiKTeX est installé
2. Ajouter au Path : `C:\Program Files\MiKTeX\miktex\bin\x64`
3. Redémarrer PowerShell

---

## Commandes PowerShell utiles

### Docker

```powershell
# Lister les conteneurs
docker ps

# Voir les logs d'un conteneur
docker logs glowcommerce-backend

# Entrer dans un conteneur
docker exec -it glowcommerce-backend sh

# Nettoyer Docker
docker system prune -a
```

### Projet

```powershell
# Démarrer tout
docker-compose up -d

# Arrêter tout
docker-compose down

# Rebuild une image
docker-compose build backend

# Voir l'état
docker-compose ps
```

---

## Raccourcis clavier Windows utiles

| Raccourci | Action |
|-----------|--------|
| `Win + X` → `A` | PowerShell Admin |
| `Win + E` | Explorateur de fichiers |
| `Ctrl + Shift + Esc` | Gestionnaire des tâches |
| `Win + R` | Exécuter |

---

## Prochaines étapes

1. ✅ Installation terminée
2. ✅ Services Docker démarrés
3. 📚 Lire la [documentation principale](../../README.md)
4. 🎓 Suivre la [formation](README-FORMATION.md)
5. 💻 Développer avec le projet

---

## Ressources

- [Docker Desktop pour Windows](https://docs.docker.com/desktop/install/windows-install/)
- [WSL 2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [Java Adoptium](https://adoptium.net/)
- [Node.js](https://nodejs.org/)
- [Chocolatey](https://chocolatey.org/)

---

**Dernière mise à jour :** 1er décembre 2024
**Testé sur :** Windows 10 (2004), Windows 11
**Version :** 1.0.0

© 2024 - Formation GlowCommerce
