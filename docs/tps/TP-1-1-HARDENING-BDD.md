# TP 1.1 : Hardening complet de la base de données GlowCommerce

**Module :** Sécurité des systèmes et bases de données
**Durée :** 2 heures
**Niveau :** Intermédiaire
**Prérequis :** MODULE-1-SLIDE-1 (Hardening PostgreSQL)

---

## 🎯 Contexte métier

Vous êtes DevOps chez **GlowCommerce**, une plateforme e-commerce en pleine croissance. Suite à un audit de sécurité externe réalisé avant le Black Friday, plusieurs **vulnérabilités critiques** ont été identifiées dans la configuration de votre base de données PostgreSQL.

**Extrait du rapport d'audit :**
```
🔴 CRITIQUE - Score de sécurité : 2/10

Vulnérabilités identifiées :
1. Compte postgres avec mot de passe faible exposé
2. Aucun chiffrement SSL/TLS des connexions
3. Port 5432 accessible depuis Internet (0.0.0.0/0)
4. Application utilise le superuser postgres (violation du moindre privilège)
5. Pas de logs d'audit des connexions/requêtes
6. Aucune limite de connexions par utilisateur

Impact potentiel :
- Vol de 100 000 comptes clients (emails, adresses, historique commandes)
- Exposition des hash de mots de passe BCrypt
- Exfiltration de données bancaires (si stockées)
- Déni de service (saturation connexions)
- Injection SQL facilitée

Recommandation : SÉCURISATION IMMÉDIATE AVANT BLACK FRIDAY
```

La direction vous mandate pour **sécuriser l'infrastructure dans les 48h**.

---

## 📋 Objectifs du TP

À la fin de ce TP, vous aurez :

1. ✅ **Audité** la configuration actuelle et identifié les risques
2. ✅ **Créé** des utilisateurs dédiés avec principe du moindre privilège
3. ✅ **Configuré** SSL/TLS pour chiffrer les connexions
4. ✅ **Restreint** l'accès réseau avec pg_hba.conf
5. ✅ **Activé** les logs d'audit PostgreSQL
6. ✅ **Testé** la configuration finale et validé la sécurisation

---

## 🔍 Partie 1 : Audit initial et analyse des risques (20 min)

### Étape 1.1 : État actuel de la base de données

**Connectez-vous à PostgreSQL :**

```bash
# Connexion avec le compte postgres (vulnérable)
docker exec -it glowcommerce-db psql -U postgres -d glowcommerce
```

**Exécutez les requêtes suivantes pour auditer :**

```sql
-- 1. Lister tous les utilisateurs et leurs privilèges
\du

-- Résultat attendu (VULNÉRABLE) :
-- postgres  | Superuser, Create role, Create DB, Replication, Bypass RLS | {}
-- (Un seul compte avec TOUS les droits)

-- 2. Voir les connexions actives
SELECT
    usename AS user,
    application_name,
    client_addr,
    state,
    backend_start
FROM pg_stat_activity
WHERE datname = 'glowcommerce';

-- 3. Configuration d'authentification actuelle
SELECT * FROM pg_hba_file_rules;

-- Résultat attendu (VULNÉRABLE) :
-- trust pour localhost (pas de mot de passe)
-- md5 pour 0.0.0.0/0 (accepte tout le monde)

-- 4. Vérifier SSL
SHOW ssl;
-- Résultat attendu : off (VULNÉRABLE)

-- 5. Limites de connexions
SHOW max_connections;
SELECT count(*) FROM pg_stat_activity;

-- 6. Voir les privilèges sur les tables
SELECT
    grantee,
    privilege_type,
    table_schema,
    table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
LIMIT 10;
```

---

### Étape 1.2 : Document d'analyse des risques

**Créez le fichier `docs/tp1/01-analyse-risques.md` :**

```markdown
# Analyse des risques - Base de données GlowCommerce

**Date :** [AUJOURD'HUI]
**Auditeur :** [VOTRE NOM]

## Vulnérabilités identifiées

| # | Vulnérabilité | Gravité | Impact | Priorité |
|---|--------------|---------|--------|----------|
| 1 | Compte postgres utilisé par l'application | 🔴 CRITIQUE | Accès complet à toutes les données, DROP DATABASE possible | P0 |
| 2 | Pas de SSL/TLS | 🔴 CRITIQUE | Man-in-the-middle, interception des mots de passe, vol de données | P0 |
| 3 | pg_hba.conf accepte 0.0.0.0/0 | 🔴 CRITIQUE | Attaques par brute force depuis Internet | P0 |
| 4 | Mot de passe faible "glowcommerce123" | 🟠 ÉLEVÉE | Crackable en quelques secondes avec hashcat | P1 |
| 5 | Pas de logs d'audit | 🟠 ÉLEVÉE | Impossible de détecter une intrusion | P1 |
| 6 | Pas de limite de connexions | 🟡 MOYENNE | Déni de service possible | P2 |

## Scénarios d'attaque possibles

### Scénario 1 : Brute force + Vol de données
```
1. Attaquant scanne Internet → Trouve port 5432 ouvert
2. Brute force sur compte postgres → Mot de passe craqué en 2 min
3. Connexion réussie → SELECT * FROM users (100 000 comptes volés)
4. Exfiltration via COPY TO CSV
5. Vente sur le dark web (5€/compte = 500 000€)
```

### Scénario 2 : Man-in-the-middle
```
1. Attaquant sur le même réseau WiFi (café, hôtel)
2. Pas de SSL → Capture trafic avec Wireshark
3. Voit le mot de passe en clair dans le paquet PostgreSQL
4. Se connecte avec les credentials volés
```

### Scénario 3 : Destruction malveillante
```
1. Connexion avec compte postgres (superuser)
2. DROP DATABASE glowcommerce; (tout est perdu)
3. Ransomware : "Payez 100 000€ ou vos données sont perdues"
```

## Actions correctives (plan de remédiation)

1. ⚠️ **IMMÉDIAT (aujourd'hui)**
   - Créer utilisateur glowcommerce_app avec droits minimaux
   - Changer mot de passe postgres (32 caractères minimum)
   - Restreindre pg_hba.conf aux IPs autorisées uniquement

2. 🔒 **URGENT (48h)**
   - Activer SSL/TLS avec certificat
   - Configurer logs d'audit
   - Implémenter limites de connexions

3. 📊 **SUIVI (1 semaine)**
   - Monitoring des logs d'audit
   - Scan de sécurité avec sqlmap
   - Formation équipe sur les bonnes pratiques
```

**✅ Validation :** Faites valider ce document par votre formateur avant de passer à la suite.

---

## 🔐 Partie 2 : Principe du moindre privilège (30 min)

### Étape 2.1 : Génération de mots de passe forts

**Utilisez ce script pour générer des mots de passe sécurisés :**

```bash
# Créer le répertoire de travail
mkdir -p docs/tp1/secrets

# Générer 3 mots de passe forts (32 caractères)
openssl rand -base64 32 > docs/tp1/secrets/postgres_password.txt
openssl rand -base64 32 > docs/tp1/secrets/glowcommerce_app_password.txt
openssl rand -base64 32 > docs/tp1/secrets/glowcommerce_readonly_password.txt

# Afficher les mots de passe
echo "=== MOTS DE PASSE GÉNÉRÉS ==="
echo "Postgres superuser:"
cat docs/tp1/secrets/postgres_password.txt
echo ""
echo "Application (glowcommerce_app):"
cat docs/tp1/secrets/glowcommerce_app_password.txt
echo ""
echo "Read-only (glowcommerce_readonly):"
cat docs/tp1/secrets/glowcommerce_readonly_password.txt

# ⚠️ IMPORTANT : Ajouter au .gitignore
echo "docs/tp1/secrets/" >> .gitignore
```

**Exemple de mots de passe générés :**
```
xK8mN3pQ7rL2vC9wB4yT6aU1E5oI0sD8fG3hJ9kM2nP5
```

---

### Étape 2.2 : Création des utilisateurs dédiés

**Créez le fichier `scripts/tp1/01-create-users.sql` :**

```sql
-- ========================================
-- TP 1.1 : Création des utilisateurs
-- ========================================

-- 1. Utilisateur APPLICATION (lecture/écriture)
CREATE USER glowcommerce_app WITH
  PASSWORD 'REMPLACER_PAR_PASSWORD_GENERE'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  LOGIN
  CONNECTION LIMIT 20;  -- Max 20 connexions simultanées

-- Commentaire de documentation
COMMENT ON ROLE glowcommerce_app IS
  'Utilisateur applicatif pour le backend Spring Boot. Droits : SELECT, INSERT, UPDATE, DELETE sur tables métier.';

-- 2. Utilisateur READ-ONLY (business intelligence)
CREATE USER glowcommerce_readonly WITH
  PASSWORD 'REMPLACER_PAR_PASSWORD_GENERE'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  LOGIN
  CONNECTION LIMIT 5;

COMMENT ON ROLE glowcommerce_readonly IS
  'Utilisateur read-only pour BI, Metabase, rapports. Aucune modification autorisée.';

-- 3. Changer le mot de passe du superuser
ALTER USER postgres WITH PASSWORD 'REMPLACER_PAR_PASSWORD_POSTGRES_GENERE';

-- Vérification
\du
```

**Exécutez le script :**

```bash
# Remplacer les mots de passe dans le fichier
# Puis exécuter

docker exec -i glowcommerce-db psql -U postgres -d glowcommerce < scripts/tp1/01-create-users.sql
```

---

### Étape 2.3 : Attribution des privilèges (GRANT)

**Créez le fichier `scripts/tp1/02-grant-privileges.sql` :**

```sql
-- ========================================
-- TP 1.1 : Attribution des privilèges
-- ========================================

-- Connexion à la database
\c glowcommerce

-- ========================================
-- 1. PRIVILEGES POUR glowcommerce_app
-- ========================================

-- Autoriser la connexion
GRANT CONNECT ON DATABASE glowcommerce TO glowcommerce_app;

-- Utiliser le schema public
GRANT USAGE ON SCHEMA public TO glowcommerce_app;

-- Droits sur TOUTES les tables existantes
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO glowcommerce_app;

-- Droits sur les séquences (pour les ID auto-increment)
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO glowcommerce_app;

-- ⚠️ IMPORTANT : Droits sur les FUTURES tables
-- (quand on créera de nouvelles tables via Flyway)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO glowcommerce_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO glowcommerce_app;

-- ========================================
-- 2. PRIVILEGES POUR glowcommerce_readonly
-- ========================================

GRANT CONNECT ON DATABASE glowcommerce TO glowcommerce_readonly;
GRANT USAGE ON SCHEMA public TO glowcommerce_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO glowcommerce_readonly;

-- Futures tables (read-only)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO glowcommerce_readonly;

-- ========================================
-- 3. REVOKE sur postgres (optionnel mais recommandé)
-- ========================================

-- L'application NE DOIT PLUS utiliser postgres
-- Optionnel : révoquer les connexions distantes pour postgres
-- (garder seulement pour maintenance manuelle)

-- ========================================
-- Vérification
-- ========================================

-- Voir les privilèges accordés
SELECT
    grantee,
    privilege_type,
    table_name
FROM information_schema.role_table_grants
WHERE grantee IN ('glowcommerce_app', 'glowcommerce_readonly')
  AND table_schema = 'public'
ORDER BY grantee, table_name;
```

**Exécutez :**

```bash
docker exec -i glowcommerce-db psql -U postgres -d glowcommerce < scripts/tp1/02-grant-privileges.sql
```

---

### Étape 2.4 : Test des privilèges

**Testez avec glowcommerce_app :**

```bash
# Connexion avec glowcommerce_app
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce

# Test SELECT (devrait fonctionner)
SELECT * FROM products LIMIT 5;

# Test INSERT (devrait fonctionner)
INSERT INTO categories (name, description)
VALUES ('Test Category', 'TP 1.1 test');

# Test UPDATE (devrait fonctionner)
UPDATE categories SET description = 'Updated' WHERE name = 'Test Category';

# Test DELETE (devrait fonctionner)
DELETE FROM categories WHERE name = 'Test Category';

# Test DROP (devrait ÉCHOUER - permission denied)
DROP TABLE products;
-- Erreur attendue : ERROR: must be owner of table products

# Test CREATE DATABASE (devrait ÉCHOUER)
CREATE DATABASE evil_database;
-- Erreur attendue : ERROR: permission denied to create database
```

**Testez avec glowcommerce_readonly :**

```bash
# Connexion
docker exec -it glowcommerce-db psql -U glowcommerce_readonly -d glowcommerce

# Test SELECT (devrait fonctionner)
SELECT * FROM users LIMIT 5;

# Test INSERT (devrait ÉCHOUER)
INSERT INTO users (email, password_hash) VALUES ('hacker@evil.com', 'xxx');
-- Erreur attendue : ERROR: permission denied for table users
```

**✅ Validation :** Les erreurs attendues confirment que le principe du moindre privilège fonctionne !

---

## 🔒 Partie 3 : Configuration SSL/TLS (30 min)

### Étape 3.1 : Générer les certificats SSL

**Créez le répertoire et générez les certificats :**

```bash
# Créer le répertoire
mkdir -p config/ssl

# Générer la clé privée du serveur (4096 bits)
openssl genrsa -out config/ssl/server.key 4096

# Générer un certificat auto-signé (valide 365 jours)
openssl req -new -x509 -days 365 -key config/ssl/server.key -out config/ssl/server.crt \
  -subj "/C=FR/ST=IleDeFrance/L=Paris/O=GlowCommerce/OU=IT/CN=glowcommerce.local"

# Permissions correctes (PostgreSQL refuse si trop permissif)
chmod 600 config/ssl/server.key
chmod 644 config/ssl/server.crt

# Vérifier le certificat
openssl x509 -in config/ssl/server.crt -text -noout
```

**Note :** En production, utilisez un certificat signé par une CA (Let's Encrypt, DigiCert, etc.).

---

### Étape 3.2 : Configurer PostgreSQL pour SSL

**Modifiez `config/postgresql.conf` :**

```conf
# ============================================
# SSL/TLS CONFIGURATION
# ============================================

# Activer SSL
ssl = on

# Certificat et clé privée
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'

# Version TLS minimale (TLS 1.2+)
ssl_min_protocol_version = 'TLSv1.2'

# Ciphers recommandés (sécurisés)
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'

# Préférer les ciphers du serveur
ssl_prefer_server_ciphers = on
```

**Modifiez `docker-compose.yml` pour monter les certificats :**

```yaml
services:
  database:
    image: postgres:16-alpine
    container_name: glowcommerce-db
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./config/pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
      - ./config/ssl/server.crt:/etc/ssl/certs/server.crt:ro
      - ./config/ssl/server.key:/etc/ssl/private/server.key:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    ports:
      - "5432:5432"
```

**Redémarrez PostgreSQL :**

```bash
docker-compose restart database

# Attendre le démarrage
sleep 5

# Vérifier que SSL est activé
docker exec -it glowcommerce-db psql -U postgres -c "SHOW ssl;"
# Résultat attendu : on
```

---

### Étape 3.3 : Test de connexion SSL

**Test 1 : Connexion SSL depuis l'hôte**

```bash
# Connexion SSL obligatoire
psql "host=localhost port=5432 dbname=glowcommerce user=glowcommerce_app sslmode=require" \
  -c "SELECT version();"

# Vérifier le chiffrement
psql "host=localhost port=5432 dbname=glowcommerce user=glowcommerce_app sslmode=require" \
  -c "SELECT ssl_is_used();"
# Résultat attendu : t (true)
```

**Test 2 : Depuis le backend Spring Boot**

**Modifiez `application.properties` :**

```properties
# AVANT (non sécurisé)
spring.datasource.url=jdbc:postgresql://database:5432/glowcommerce

# APRÈS (SSL obligatoire)
spring.datasource.url=jdbc:postgresql://database:5432/glowcommerce?\
  sslmode=require&\
  ssl=true

spring.datasource.username=glowcommerce_app
spring.datasource.password=${DB_PASSWORD}
```

**Testez :**

```bash
# Mettre à jour les variables d'environnement
export DB_PASSWORD=$(cat docs/tp1/secrets/glowcommerce_app_password.txt)

# Redémarrer le backend
docker-compose restart backend

# Vérifier les logs
docker-compose logs backend | grep -i "ssl\|connection"
# Devrait voir : "SSL connection from ..."
```

---

## 🛡️ Partie 4 : Restriction réseau avec pg_hba.conf (20 min)

### Étape 4.1 : Configuration restrictive

**Modifiez `config/pg_hba.conf` :**

```conf
# ============================================
# PostgreSQL Client Authentication Configuration
# ============================================
# Format : TYPE  DATABASE  USER  ADDRESS  METHOD  [OPTIONS]

# ========================================
# 1. CONNEXIONS LOCALES (depuis le conteneur)
# ========================================

# Localhost Unix socket - Permet maintenance
local   all             postgres                                peer

# ========================================
# 2. CONNEXIONS RÉSEAU DOCKER
# ========================================

# Application backend (Spring Boot)
hostssl glowcommerce    glowcommerce_app    172.18.0.0/16    scram-sha-256

# Read-only (BI/Metabase)
hostssl glowcommerce    glowcommerce_readonly  172.18.0.0/16    scram-sha-256

# ========================================
# 3. MAINTENANCE (Admin depuis l'hôte)
# ========================================

# Superuser SEULEMENT depuis localhost avec SSL
hostssl all             postgres            127.0.0.1/32     scram-sha-256
hostssl all             postgres            ::1/128          scram-sha-256

# ========================================
# 4. REJECT ALL (sécurité par défaut)
# ========================================

# Rejeter toutes les autres connexions
host    all             all                 0.0.0.0/0        reject
host    all             all                 ::/0             reject

# ============================================
# NOTES :
# - hostssl : Force SSL/TLS (rejette les connexions non chiffrées)
# - scram-sha-256 : Algorithme de hash moderne (remplace md5)
# - 172.18.0.0/16 : Réseau Docker par défaut
# - reject : Refuse explicitement (plus sûr que de ne rien mettre)
# ============================================
```

**Redémarrez PostgreSQL :**

```bash
docker-compose restart database
sleep 5
```

---

### Étape 4.2 : Tests de restriction

**Test 1 : Connexion depuis le backend (devrait fonctionner)**

```bash
docker exec -it glowcommerce-backend psql \
  "host=database port=5432 dbname=glowcommerce user=glowcommerce_app sslmode=require" \
  -c "SELECT current_user, inet_server_addr();"
```

**Test 2 : Connexion sans SSL (devrait ÉCHOUER)**

```bash
psql "host=localhost port=5432 dbname=glowcommerce user=glowcommerce_app sslmode=disable"
# Erreur attendue : connection requires SSL
```

**Test 3 : Connexion avec mauvais utilisateur (devrait ÉCHOUER)**

```bash
psql "host=localhost port=5432 dbname=glowcommerce user=hacker sslmode=require"
# Erreur attendue : authentication failed
```

**✅ Validation :** Les rejets confirment que les restrictions fonctionnent.

---

## 📊 Partie 5 : Activation des logs d'audit (20 min)

### Étape 5.1 : Configuration des logs

**Ajoutez dans `config/postgresql.conf` :**

```conf
# ============================================
# LOGGING CONFIGURATION
# ============================================

# Activer le collecteur de logs
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'

# Rotation
log_rotation_age = 1d
log_rotation_size = 100MB

# ========================================
# QUE LOGGER ?
# ========================================

# Connexions/Déconnexions
log_connections = on
log_disconnections = on

# Type de requêtes
log_statement = 'ddl'  # CREATE, DROP, ALTER uniquement

# Requêtes lentes (> 1 seconde)
log_min_duration_statement = 1000

# Niveau de log
log_min_messages = warning

# ========================================
# FORMAT
# ========================================

log_line_prefix = '%t [%p] %u@%d from %h '
log_error_verbosity = default
log_lock_waits = on
log_checkpoints = on
```

**Créez le répertoire de logs :**

```bash
mkdir -p logs/postgresql
chmod 777 logs/postgresql
```

**Mettez à jour `docker-compose.yml` :**

```yaml
services:
  database:
    volumes:
      - ./logs/postgresql:/var/log/postgresql
```

**Redémarrez :**

```bash
docker-compose restart database
sleep 5
```

---

### Étape 5.2 : Test et analyse des logs

**Générez de l'activité :**

```bash
# Connexion réussie
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT COUNT(*) FROM products;"

# Tentative d'intrusion (échec attendu)
docker exec -it glowcommerce-db psql -U hacker -d glowcommerce 2>/dev/null || echo "Bloqué"

# Requête lente (> 1s)
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT pg_sleep(2);"
```

**Analysez les logs :**

```bash
# Voir les logs en temps réel
tail -f logs/postgresql/postgresql-$(date +%Y-%m-%d).log

# Rechercher les connexions réussies
grep "connection authorized" logs/postgresql/*.log

# Rechercher les échecs d'authentification
grep "authentication failed" logs/postgresql/*.log

# Rechercher les requêtes lentes
grep "duration:" logs/postgresql/*.log | awk '$8 > 1000'
```

---

## 🧪 Partie 6 : Validation finale et tests de sécurité (20 min)

### Étape 6.1 : Checklist de sécurité

**Créez `docs/tp1/03-checklist-securite.md` :**

```markdown
# Checklist de sécurité - TP 1.1

## Utilisateurs et privilèges

- [x] Utilisateur glowcommerce_app créé avec droits minimaux
- [x] Utilisateur glowcommerce_readonly créé (SELECT uniquement)
- [x] Mot de passe postgres changé (32 caractères)
- [x] Application backend utilise glowcommerce_app (pas postgres)
- [x] Connexion limitée à 20 pour app, 5 pour readonly

## Chiffrement

- [x] SSL/TLS activé (certificat généré)
- [x] TLS 1.2 minimum configuré
- [x] Connexions sans SSL rejetées
- [x] Backend Spring Boot utilise sslmode=require

## Restriction réseau

- [x] pg_hba.conf restreint aux IPs autorisées (172.18.0.0/16)
- [x] Connexions externes rejetées (reject 0.0.0.0/0)
- [x] hostssl obligatoire (pas de host)
- [x] scram-sha-256 (pas md5)

## Logs d'audit

- [x] log_connections = on
- [x] log_disconnections = on
- [x] log_statement = 'ddl'
- [x] log_min_duration_statement = 1000ms
- [x] Logs visibles dans logs/postgresql/

## Tests de non-régression

- [x] Application backend se connecte correctement
- [x] SELECT fonctionne
- [x] INSERT/UPDATE/DELETE fonctionnent
- [x] DROP TABLE échoue (permission denied)
- [x] Connexion sans SSL échoue
- [x] Connexion depuis IP non autorisée échoue
```

---

### Étape 6.2 : Scan de sécurité avec nmap

```bash
# Installer nmap si nécessaire
# brew install nmap (macOS)
# sudo apt install nmap (Linux)

# Scanner le port PostgreSQL
nmap -p 5432 -sV --script ssl-enum-ciphers localhost

# Résultat attendu :
# - Port ouvert
# - SSL/TLS détecté
# - Ciphers sécurisés uniquement
```

---

### Étape 6.3 : Test de charge

**Testez la limite de connexions :**

```bash
# Script pour créer 25 connexions simultanées
for i in {1..25}; do
  (docker exec -i glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
    -c "SELECT pg_sleep(10), $i;" &)
done

# Résultat attendu : 20 connexions OK, 5 rejetées (limite atteinte)
```

---

## 📊 Livrables attendus

À la fin du TP, vous devez avoir :

1. **Documentation :**
   - `docs/tp1/01-analyse-risques.md` (analyse initiale)
   - `docs/tp1/03-checklist-securite.md` (validation finale)

2. **Scripts SQL :**
   - `scripts/tp1/01-create-users.sql`
   - `scripts/tp1/02-grant-privileges.sql`

3. **Configuration :**
   - `config/postgresql.conf` (SSL + logs)
   - `config/pg_hba.conf` (restrictions)
   - `config/ssl/` (certificats)

4. **Preuve de fonctionnement :**
   - Screenshots des tests de connexion SSL
   - Logs d'audit montrant connexions/déconnexions
   - Capture de l'erreur "permission denied" lors du DROP TABLE

---

## 🎯 Critères d'évaluation

| Critère | Points | Détails |
|---------|--------|---------|
| Analyse des risques complète | 15 | Document 01-analyse-risques.md avec 6 vulnérabilités + impacts |
| Utilisateurs créés correctement | 20 | glowcommerce_app + readonly avec privilèges minimaux |
| SSL/TLS fonctionnel | 20 | Connexions chiffrées obligatoires |
| pg_hba.conf sécurisé | 20 | Restrictions IP + reject par défaut |
| Logs d'audit activés | 10 | Connexions + requêtes lentes loggées |
| Tests de validation | 15 | Tous les tests passent avec succès |
| **TOTAL** | **100** | |

---

## 🔗 Ressources complémentaires

- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [pg_hba.conf Guide](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [OWASP Database Security](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)
- MODULE-1-SLIDE-1 (référence du cours)

---

## ❓ Aide et debugging

**Problème : SSL ne fonctionne pas**
```bash
# Vérifier les permissions
ls -la config/ssl/
# server.key doit être 600

# Voir les logs d'erreur
docker-compose logs database | grep -i ssl
```

**Problème : Connexion rejetée**
```bash
# Voir les règles pg_hba.conf actives
docker exec -it glowcommerce-db psql -U postgres \
  -c "SELECT * FROM pg_hba_file_rules;"
```

**Problème : Mot de passe oublié**
```bash
# Régénérer
openssl rand -base64 32 > docs/tp1/secrets/new_password.txt
```

---

**Bon courage pour le TP ! 🚀**
