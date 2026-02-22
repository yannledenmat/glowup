# 🌍 Compatibilité Cross-Platform - GlowCommerce

## Vue d'ensemble

Ce document détaille la compatibilité du projet GlowCommerce sur différents systèmes d'exploitation et fournit des solutions aux problèmes spécifiques de chaque plateforme.

---

## ✅ Plateformes supportées

| Plateforme | Version | Statut | Guide |
|------------|---------|--------|-------|
| **Windows** | 10 (2004+), 11 | ✅ Testé | [Guide Windows](docs/guides/INSTALLATION-WINDOWS.md) |
| **macOS** | 11 Big Sur+ | ✅ Testé | [Guide macOS](docs/guides/INSTALLATION-MACOS.md) |
| **Linux** | Ubuntu 20.04+, Debian 11+ | ✅ Testé | [Guide Linux](docs/guides/INSTALLATION-LINUX.md) |

---

## 🔧 Technologies cross-platform

### Docker

✅ **Compatible sur toutes les plateformes**
- Windows : Docker Desktop avec WSL 2
- macOS : Docker Desktop natif (Intel & Apple Silicon)
- Linux : Docker Engine natif

### Java 21

✅ **Compatible sur toutes les plateformes**
- Adoptium/Temurin OpenJDK 21
- Binaires natifs pour chaque OS

### Node.js 20

✅ **Compatible sur toutes les plateformes**
- Binaires natifs disponibles
- npm fonctionne identiquement partout

### Maven 3.9+

✅ **Compatible sur toutes les plateformes**
- Même comportement sur tous les OS

---

## 📝 Scripts adaptés par plateforme

### Génération de PDFs

| Plateforme | Script | Commande |
|------------|--------|----------|
| **Windows** | `generate-pdfs.ps1` (PowerShell) | `.\generate-pdfs.ps1` |
| **macOS/Linux** | `generate-pdfs.sh` (Bash) | `./generate-pdfs.sh` |

**Contenu identique**, syntaxe adaptée à chaque shell.

---

## 🔀 Différences par plateforme

### Chemins de fichiers

| Plateforme | Séparateur | Exemple |
|------------|------------|---------|
| Windows | `\` | `C:\Users\nom\Documents\glowup` |
| macOS/Linux | `/` | `/Users/nom/Documents/glowup` |

**Solution :** Java, Node.js et Docker gèrent automatiquement les chemins sur toutes les plateformes.

### Variables d'environnement

#### Windows (PowerShell)

```powershell
# Définir
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"

# Lire
echo $env:JAVA_HOME
```

#### macOS/Linux (Bash/Zsh)

```bash
# Définir
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk

# Lire
echo $JAVA_HOME
```

### Exécution de scripts

#### Windows

```powershell
# PowerShell script
.\script.ps1

# Batch script
script.bat
```

#### macOS/Linux

```bash
# Bash script (nécessite chmod +x)
./script.sh
```

---

## 🐳 Docker : Points d'attention

### Windows

**Prérequis :** WSL 2 activé
```powershell
wsl --install
```

**Chemins de volumes :**
```yaml
# Utiliser des chemins Windows
volumes:
  - C:\Users\nom\data:/data

# Ou des chemins WSL
volumes:
  - /mnt/c/Users/nom/data:/data
```

### macOS (Apple Silicon)

**Images multi-architecture :**
Docker pull automatiquement les images ARM64 si disponibles, sinon émule x86_64.

**Performance :**
- Native ARM : performances optimales
- Émulation x86 : légèrement plus lent

### Linux

**Pas de virtualisation :**
Docker s'exécute nativement, performances maximales.

---

## 📦 Installation des dépendances

### Gestionnaires de paquets

| Plateforme | Gestionnaire | Installation |
|------------|--------------|--------------|
| Windows | Chocolatey | https://chocolatey.org/install |
| macOS | Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Linux | apt/yum/dnf | Pré-installé |

### Commandes équivalentes

| Action | Windows | macOS | Linux |
|--------|---------|-------|-------|
| Installer Java | `choco install temurin21` | `brew install openjdk@21` | `sudo apt install openjdk-21-jdk` |
| Installer Node | `choco install nodejs-lts` | `brew install node@20` | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install nodejs` |
| Installer Docker | Installer Docker Desktop | `brew install --cask docker` | `curl -fsSL https://get.docker.com \| sh` |

---

## 🔧 Configuration IDE

### IntelliJ IDEA

✅ **Compatible toutes plateformes**

**JDK Configuration :**
1. File → Project Structure → Project
2. SDK → Add JDK
3. Sélectionner le chemin du JDK 21

**Chemins par défaut :**
- Windows : `C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot`
- macOS : `/opt/homebrew/opt/openjdk@21` (Apple Silicon) ou `/usr/local/opt/openjdk@21` (Intel)
- Linux : `/usr/lib/jvm/java-21-openjdk-amd64`

### VS Code

✅ **Compatible toutes plateformes**

**Extensions recommandées :**
- Java Extension Pack
- Spring Boot Extension Pack
- ES7+ React/Redux/React-Native snippets
- Prettier
- ESLint

---

## 🚨 Problèmes connus et solutions

### Problème 1 : Line endings (CRLF vs LF)

**Symptôme :** Scripts bash ne fonctionnent pas sur Windows

**Solution :**

Git configuration :
```bash
# Windows : Convertir CRLF → LF à la commit
git config --global core.autocrlf true

# macOS/Linux : Pas de conversion
git config --global core.autocrlf input
```

### Problème 2 : Permissions sur scripts

**Symptôme :** `Permission denied` sur Linux/macOS

**Solution :**
```bash
chmod +x generate-pdfs.sh
chmod +x *.sh
```

### Problème 3 : Chemins trop longs (Windows)

**Symptôme :** `npm install` échoue avec erreurs de chemins

**Solution :**
```powershell
# Activer les chemins longs (Admin)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Ou utiliser npm avec chemins courts
npm config set cache C:\tmp\npm-cache --global
```

### Problème 4 : Port déjà utilisé

**Détection et solution par OS :**

**Windows :**
```powershell
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

**macOS/Linux :**
```bash
lsof -i :8080
kill -9 <PID>
```

### Problème 5 : Docker ne démarre pas

**Windows :** WSL 2 non configuré
```powershell
wsl --install
wsl --set-default-version 2
```

**macOS :** Rosetta 2 manquante (M1/M2/M3)
```bash
softwareupdate --install-rosetta
```

**Linux :** Service Docker non démarré
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 🏗️ Structure de fichiers cross-platform

### .gitattributes (recommandé)

Créer un fichier `.gitattributes` à la racine :

```
# Auto detect text files
* text=auto

# Force LF for shell scripts
*.sh text eol=lf

# Force CRLF for batch/PowerShell
*.bat text eol=crlf
*.ps1 text eol=crlf

# Binary files
*.jar binary
*.pdf binary
*.png binary
*.jpg binary
```

---

## 📊 Matrice de compatibilité complète

### Backend (Java/Spring Boot)

| Composant | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| Java 21 | ✅ | ✅ | ✅ |
| Maven | ✅ | ✅ | ✅ |
| Spring Boot | ✅ | ✅ | ✅ |
| PostgreSQL (Docker) | ✅ | ✅ | ✅ |
| Tests JUnit | ✅ | ✅ | ✅ |

### Frontend (React)

| Composant | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| Node.js 20 | ✅ | ✅ | ✅ |
| npm | ✅ | ✅ | ✅ |
| Vite | ✅ | ✅ | ✅ |
| React 18 | ✅ | ✅ | ✅ |

### DevOps

| Composant | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| Docker | ✅ (WSL 2) | ✅ | ✅ (natif) |
| Docker Compose | ✅ | ✅ | ✅ |
| Prometheus | ✅ | ✅ | ✅ |
| Grafana | ✅ | ✅ | ✅ |

### Génération PDF

| Composant | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| Pandoc | ✅ | ✅ | ✅ |
| LaTeX (MiKTeX/BasicTeX) | ✅ | ✅ | ✅ |

---

## 🎯 Recommandations

### Pour les développeurs

1. **Utiliser Docker** pour l'environnement de dev (uniformité garantie)
2. **Configurer Git** avec `core.autocrlf` approprié
3. **Tester sur la plateforme cible** avant le déploiement
4. **Utiliser des chemins relatifs** dans le code

### Pour la formation

1. **Fournir les 3 guides** d'installation (Windows, macOS, Linux)
2. **Docker Desktop obligatoire** pour tous les étudiants
3. **Scripts multiples** : .sh ET .ps1
4. **Tests sur toutes les plateformes** avant la session

### Pour la production

1. **Déployer sur Linux** (Docker) pour les meilleures performances
2. **CI/CD multi-plateforme** pour valider la compatibilité
3. **Images Docker multi-arch** pour supporter ARM et x86

---

## 📚 Ressources par plateforme

### Windows

- [WSL 2 Guide](https://docs.microsoft.com/en-us/windows/wsl/)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [Chocolatey](https://chocolatey.org/)

### macOS

- [Homebrew](https://brew.sh/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)

### Linux

- [Ubuntu Documentation](https://ubuntu.com/server/docs)
- [Docker on Linux](https://docs.docker.com/engine/install/)

---

## ✅ Checklist de validation cross-platform

Avant de distribuer le projet :

- [ ] Tester sur Windows 10/11
- [ ] Tester sur macOS (Intel)
- [ ] Tester sur macOS (Apple Silicon)
- [ ] Tester sur Linux (Ubuntu 22.04)
- [ ] Vérifier les scripts PowerShell
- [ ] Vérifier les scripts Bash
- [ ] Tester Docker Compose sur les 3 OS
- [ ] Valider les chemins de fichiers
- [ ] Tester la génération de PDFs
- [ ] Vérifier les variables d'environnement
- [ ] Valider la documentation

---

**Dernière mise à jour :** 1er décembre 2024
**Version :** 1.0.0

© 2024 - Formation GlowCommerce
