# 🐧 Guide d'Installation - Linux (Ubuntu/Debian)

## Vue d'ensemble

Ce guide détaille l'installation complète de GlowCommerce sur Linux (Ubuntu 20.04+, Debian 11+).

## Prérequis système

- Ubuntu 20.04 LTS ou supérieur / Debian 11 ou supérieur
- 4 GB RAM minimum (8 GB recommandé)
- 20 GB d'espace disque libre
- Accès sudo

---

## 1. Mise à jour du système

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 2. Installation de Docker

### Désinstaller les anciennes versions

```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

### Installation via le script officiel (recommandé)

```bash
# Télécharger et exécuter le script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Activer le service
sudo systemctl enable docker
sudo systemctl start docker
```

### Installation manuelle

```bash
# Installer les dépendances
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Ajouter la clé GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajouter le repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### Vérification

```bash
docker --version
# Attendu : Docker version 24.x.x

docker compose version
# Attendu : Docker Compose version v2.x.x
```

### Se déconnecter et reconnecter

```bash
# Pour appliquer l'ajout au groupe docker
exit
# Se reconnecter
```

---

## 3. Installation de Java 21

### Avec APT (Ubuntu 22.04+ / Debian 12+)

```bash
sudo apt install -y openjdk-21-jdk
```

### Avec SDKMAN (toutes versions, recommandé)

```bash
# Installer SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Installer Java 21
sdk install java 21-tem
sdk use java 21-tem
sdk default java 21-tem
```

### Configuration JAVA_HOME

Ajouter à `~/.bashrc` ou `~/.zshrc` :

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
```

Recharger :
```bash
source ~/.bashrc
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

### Avec APT

```bash
sudo apt install -y maven
```

### Installation manuelle (version récente)

```bash
# Télécharger Maven
cd /opt
sudo wget https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
sudo tar xzf apache-maven-3.9.6-bin.tar.gz
sudo ln -s apache-maven-3.9.6 maven

# Configurer les variables d'environnement
echo 'export M2_HOME=/opt/maven' | sudo tee -a /etc/profile.d/maven.sh
echo 'export PATH=${M2_HOME}/bin:${PATH}' | sudo tee -a /etc/profile.d/maven.sh
source /etc/profile.d/maven.sh
```

### Vérification

```bash
mvn -version
# Attendu : Apache Maven 3.9.x
```

---

## 5. Installation de Node.js et npm

### Avec NodeSource (version LTS recommandée)

```bash
# Installer Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node --version
npm --version
```

### Avec NVM (Node Version Manager, flexible)

```bash
# Installer NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

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

### Avec APT

```bash
sudo apt install -y git
```

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

#### Ubuntu/Debian

```bash
sudo apt install -y pandoc texlive-latex-base texlive-latex-extra texlive-fonts-recommended
```

#### Fedora/RHEL

```bash
sudo dnf install -y pandoc texlive-scheme-medium
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
sudo snap install code --classic

# IntelliJ IDEA Community
sudo snap install intellij-idea-community --classic
```

### Client PostgreSQL

```bash
# pgAdmin 4
sudo apt install -y pgadmin4

# DBeaver
sudo snap install dbeaver-ce
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
sudo snap install postman

# Insomnia
echo "deb https://download.konghq.com/insomnia-ubuntu/ default all" \
    | sudo tee -a /etc/apt/sources.list.d/insomnia.list
wget --quiet -O - https://insomnia.rest/keys/debian-public.key.asc \
    | sudo apt-key add -
sudo apt update
sudo apt install -y insomnia
```

---

## Résolution de problèmes

### Problème : Permission denied sur Docker

**Erreur :** "Got permission denied while trying to connect to the Docker daemon socket"

**Solution :**
```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Se déconnecter et reconnecter
# Ou activer les nouveaux groupes
newgrp docker
```

### Problème : Port déjà utilisé

**Erreur :** "Bind for 0.0.0.0:8080 failed: port is already allocated"

**Solution :**
```bash
# Trouver le processus utilisant le port
sudo lsof -i :8080

# Tuer le processus
sudo kill -9 <PID>

# Ou changer le port dans docker-compose.yml
```

### Problème : Docker manque de mémoire

**Solution :**
```bash
# Augmenter la limite mémoire Docker
sudo nano /etc/docker/daemon.json
```

Ajouter :
```json
{
  "default-address-pools": [
    {"base":"172.17.0.0/16","size":24}
  ],
  "default-ulimits": {
    "memlock": {
      "Hard": -1,
      "Name": "memlock",
      "Soft": -1
    }
  }
}
```

Redémarrer Docker :
```bash
sudo systemctl restart docker
```

### Problème : npm install échoue

**Erreur :** "EACCES: permission denied"

**Solution :**
```bash
# Changer le propriétaire du dossier global npm
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /usr/local/lib/node_modules

# Ou utiliser un prefix local
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
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

### Système

```bash
# Voir l'utilisation mémoire
free -h

# Voir l'espace disque
df -h

# Processus actifs
htop
```

---

## Optimisations Linux

### Augmenter les limites de fichiers ouverts

```bash
# Éditer limits.conf
sudo nano /etc/security/limits.conf

# Ajouter
* soft nofile 65536
* hard nofile 65536
```

### Optimiser les paramètres réseau

```bash
# Éditer sysctl.conf
sudo nano /etc/sysctl.conf

# Ajouter
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
```

Appliquer :
```bash
sudo sysctl -p
```

---

## Distributions supportées

| Distribution | Version | Testé |
|--------------|---------|-------|
| Ubuntu | 20.04 LTS | ✅ |
| Ubuntu | 22.04 LTS | ✅ |
| Ubuntu | 24.04 LTS | ✅ |
| Debian | 11 (Bullseye) | ✅ |
| Debian | 12 (Bookworm) | ✅ |
| Fedora | 38+ | ⚠️ (commandes différentes) |
| RHEL/CentOS | 8+ | ⚠️ (commandes différentes) |

---

## Prochaines étapes

1. ✅ Installation terminée
2. ✅ Services Docker démarrés
3. 📚 Lire la [documentation principale](../../README.md)
4. 🎓 Suivre la [formation](README-FORMATION.md)
5. 💻 Développer avec le projet

---

## Ressources

- [Docker Documentation](https://docs.docker.com/engine/install/ubuntu/)
- [Node.js Distributions](https://github.com/nodesource/distributions)
- [SDKMAN](https://sdkman.io/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

---

**Dernière mise à jour :** 1er décembre 2024
**Testé sur :** Ubuntu 22.04 LTS, Debian 12
**Version :** 1.0.0

© 2024 - Formation GlowCommerce
