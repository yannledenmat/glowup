# Monitoring et Administration - GlowCommerce

Ce guide explique comment accéder et utiliser les outils de monitoring et d'administration pour le projet GlowCommerce.

## Vue d'ensemble

L'infrastructure complète comprend :
- **Prometheus** : Collecte et stockage des métriques
- **Grafana** : Visualisation et création de dashboards
- **Portainer** : Interface web de gestion Docker
- **pgAdmin** : Client web PostgreSQL
- **Spring Boot Actuator** : Exposition des métriques de l'application backend

## Accès aux services

### Prometheus

**URL d'accès** : http://localhost:9090

Prometheus collecte automatiquement les métriques du backend Spring Boot toutes les 15 secondes.

#### Vérification du fonctionnement

1. Accédez à http://localhost:9090/targets
2. Vérifiez que le target `spring-boot-app` est dans l'état **UP**
3. Si le statut est DOWN, vérifiez que le backend est bien démarré

#### Requêtes utiles

Dans l'interface Prometheus (onglet Graph), vous pouvez exécuter ces requêtes :

```promql
# Requêtes HTTP par seconde
rate(http_server_requests_seconds_count[1m])

# Temps de réponse moyen
rate(http_server_requests_seconds_sum[1m]) / rate(http_server_requests_seconds_count[1m])

# Utilisation de la mémoire JVM
jvm_memory_used_bytes

# Nombre de threads actifs
jvm_threads_live_threads

# Requêtes par endpoint
sum by (uri) (rate(http_server_requests_seconds_count[5m]))
```

### Grafana

**URL d'accès** : http://localhost:3001

**Identifiants par défaut** :
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

#### Première connexion

1. Accédez à http://localhost:3001
2. Connectez-vous avec les identifiants ci-dessus
3. Grafana peut vous demander de changer le mot de passe (optionnel)

#### Configuration de la datasource

La datasource Prometheus est déjà configurée automatiquement. Pour vérifier :

1. Menu hamburger → **Connections** → **Data sources**
2. Vérifiez que **Prometheus** apparaît avec une coche verte
3. Cliquez dessus pour voir les détails :
   - **URL** : `http://prometheus:9090`
   - **Access** : Server (default)

Si la datasource n'apparaît pas :
1. Cliquez sur **Add data source**
2. Sélectionnez **Prometheus**
3. Configurez l'URL : `http://prometheus:9090`
4. Cliquez sur **Save & Test**

## Création de votre premier dashboard

### Méthode rapide : Import d'un dashboard Spring Boot

1. Menu hamburger → **Dashboards** → **New** → **Import**
2. Entrez l'ID du dashboard : **4701** (Spring Boot 2.1 Statistics)
3. Cliquez sur **Load**
4. Sélectionnez la datasource **Prometheus**
5. Cliquez sur **Import**

### Méthode manuelle : Création d'un dashboard personnalisé

#### Dashboard de performance HTTP

1. Menu hamburger → **Dashboards** → **New** → **New Dashboard**
2. Cliquez sur **Add visualization**
3. Sélectionnez **Prometheus** comme datasource
4. Configurez le premier panel :

**Panel 1 : Requêtes HTTP par seconde**
- **Titre** : "HTTP Requests Rate"
- **Query** :
  ```promql
  sum(rate(http_server_requests_seconds_count[1m])) by (uri, method)
  ```
- **Legend** : `{{method}} {{uri}}`
- **Type** : Time series

5. Cliquez sur **Add** → **Visualization** pour ajouter d'autres panels

**Panel 2 : Temps de réponse**
- **Titre** : "HTTP Response Time (avg)"
- **Query** :
  ```promql
  rate(http_server_requests_seconds_sum[1m]) / rate(http_server_requests_seconds_count[1m])
  ```
- **Unit** : seconds (s)
- **Type** : Time series

**Panel 3 : Statut HTTP**
- **Titre** : "HTTP Status Codes"
- **Query** :
  ```promql
  sum(rate(http_server_requests_seconds_count[1m])) by (status)
  ```
- **Legend** : `Status {{status}}`
- **Type** : Time series ou Stat

**Panel 4 : Utilisation mémoire JVM**
- **Titre** : "JVM Memory Usage"
- **Query** :
  ```promql
  jvm_memory_used_bytes{area="heap"}
  ```
- **Unit** : bytes (IEC)
- **Type** : Time series

**Panel 5 : Threads JVM**
- **Titre** : "JVM Threads"
- **Query** :
  ```promql
  jvm_threads_live_threads
  ```
- **Type** : Stat

6. Cliquez sur **Save dashboard** en haut à droite
7. Donnez un nom : "GlowCommerce Backend Monitoring"

## Métriques disponibles

### Métriques HTTP

| Métrique | Description |
|----------|-------------|
| `http_server_requests_seconds_count` | Nombre total de requêtes HTTP |
| `http_server_requests_seconds_sum` | Temps total de traitement des requêtes |
| `http_server_requests_seconds_max` | Temps maximum de réponse |

Labels disponibles : `uri`, `method`, `status`, `exception`

### Métriques JVM

| Métrique | Description |
|----------|-------------|
| `jvm_memory_used_bytes` | Mémoire utilisée (heap/non-heap) |
| `jvm_memory_max_bytes` | Mémoire maximum allouée |
| `jvm_threads_live_threads` | Nombre de threads actifs |
| `jvm_threads_daemon_threads` | Nombre de threads daemon |
| `jvm_gc_pause_seconds_count` | Nombre de pauses GC |
| `jvm_gc_pause_seconds_sum` | Temps total des pauses GC |

### Métriques système

| Métrique | Description |
|----------|-------------|
| `system_cpu_usage` | Utilisation CPU du système |
| `process_cpu_usage` | Utilisation CPU du processus |
| `system_load_average_1m` | Charge moyenne sur 1 minute |

### Métriques base de données (HikariCP)

| Métrique | Description |
|----------|-------------|
| `hikaricp_connections_active` | Connexions actives |
| `hikaricp_connections_idle` | Connexions inactives |
| `hikaricp_connections_pending` | Connexions en attente |
| `hikaricp_connections_timeout_total` | Timeouts de connexion |

## Configuration des alertes

### Créer une alerte de temps de réponse élevé

1. Créez un nouveau panel avec la query de temps de réponse
2. Cliquez sur l'onglet **Alert** dans le panel
3. Cliquez sur **Create alert rule from this panel**
4. Configurez la règle :
   - **Condition** : WHEN last() OF query(A) IS ABOVE 1 (1 seconde)
   - **Evaluate every** : 1m
   - **For** : 5m
5. Ajoutez une notification (Email, Slack, etc.)
6. Cliquez sur **Save**

### Créer une alerte de mémoire

1. Créez un panel avec la query de mémoire JVM
2. Configurez l'alerte :
   - **Condition** : WHEN last() OF query(A) IS ABOVE 800000000 (800 MB)
   - **Evaluate every** : 1m
   - **For** : 5m

## Dépannage

### Prometheus ne voit pas le backend

**Vérifications** :
1. Le backend est-il démarré ?
   ```bash
   docker-compose ps backend
   ```

2. L'endpoint actuator est-il accessible ?
   ```bash
   curl http://localhost:8080/actuator/prometheus
   ```

3. Vérifiez les logs Prometheus :
   ```bash
   docker-compose logs prometheus
   ```

### Grafana ne peut pas se connecter à Prometheus

**Vérifications** :
1. Prometheus est-il démarré ?
   ```bash
   docker-compose ps prometheus
   ```

2. Testez la connexion depuis Grafana :
   - Allez dans **Connections** → **Data sources** → **Prometheus**
   - Cliquez sur **Test**

3. Vérifiez que l'URL est `http://prometheus:9090` (pas localhost)

### Pas de métriques dans Grafana

**Vérifications** :
1. Vérifiez que la période sélectionnée contient des données (en haut à droite)
2. Essayez une requête simple dans l'explorateur :
   ```promql
   up
   ```
3. Vérifiez que le backend a bien été sollicité (faites quelques requêtes HTTP)

### Portainer

**URL d'accès** : http://localhost:9000 (HTTP) ou https://localhost:9443 (HTTPS)

**Première connexion** :
1. Accédez à http://localhost:9000
2. Créez un compte admin (première fois uniquement) :
   - Username : admin
   - Password : Choisissez un mot de passe fort (min. 12 caractères)
3. Sélectionnez **"Get Started"** puis **"Local"**
4. Vous verrez tous les conteneurs GlowCommerce

#### Fonctionnalités Portainer

**Gestion des conteneurs :**
- 🐳 **Containers** : Démarrer, arrêter, redémarrer, voir les logs
- 📊 **Stats** : CPU, RAM, réseau en temps réel
- 🔧 **Console** : Accéder au shell d'un conteneur
- 📝 **Logs** : Consulter les logs en temps réel

**Gestion des images :**
- 📦 **Images** : Liste des images Docker disponibles
- ⬇️ **Pull** : Télécharger de nouvelles images
- 🗑️ **Remove** : Supprimer des images inutilisées

**Gestion des volumes :**
- 💾 **Volumes** : Liste des volumes (postgres_data, grafana_data, etc.)
- 🔍 **Browse** : Explorer le contenu des volumes
- 📊 **Size** : Voir l'utilisation de l'espace disque

**Gestion des réseaux :**
- 🌐 **Networks** : Liste des réseaux Docker
- 🔗 **Inspect** : Voir quels conteneurs sont connectés

### pgAdmin

**URL d'accès** : http://localhost:5050

**Identifiants par défaut** :
- **Email** : `admin@glowcommerce.local`
- **Mot de passe** : `admin123`

#### Première configuration

1. **Ajouter un serveur** :
   - Clic droit sur "Servers" → "Register" → "Server"

2. **Onglet General** :
   - Name : `GlowCommerce DB`

3. **Onglet Connection** :
   - Host name/address : `database` (nom du service Docker)
   - Port : `5432`
   - Maintenance database : `glowcommerce`
   - Username : `glowcommerce_app`
   - Password : `changeme123` (ou votre DB_PASSWORD)
   - ✅ Save password

4. **Onglet Advanced** (optionnel) :
   - DB restriction : `glowcommerce` (pour ne voir que cette DB)

5. Cliquez sur **Save**

#### Utilisation de pgAdmin

**Requêtes SQL :**
1. Clic droit sur `GlowCommerce DB` → "Query Tool"
2. Écrivez votre requête :
   ```sql
   SELECT * FROM products LIMIT 10;
   ```
3. Cliquez sur ▶️ (ou F5) pour exécuter

**Explorer les tables :**
```
GlowCommerce DB
└── Databases
    └── glowcommerce
        └── Schemas
            └── public
                └── Tables
                    ├── products
                    ├── users
                    ├── orders
                    └── ...
```

**Visualiser les données :**
- Clic droit sur une table → "View/Edit Data" → "All Rows"

**Créer un backup :**
- Clic droit sur `glowcommerce` → "Backup..."
- Format : Custom
- Filename : `glowcommerce-backup-2024-12-29.backup`
- Cliquez sur "Backup"

**Restaurer un backup :**
- Clic droit sur `glowcommerce` → "Restore..."
- Sélectionnez le fichier .backup
- Cliquez sur "Restore"

**EXPLAIN ANALYZE (optimisation SQL) :**
```sql
EXPLAIN ANALYZE
SELECT p.*, c.name AS category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.active = true
ORDER BY p.created_at DESC
LIMIT 20;
```

---

## Commandes utiles

### Démarrer tous les services

```bash
docker-compose up -d
```

### Démarrer uniquement les services de monitoring

```bash
docker-compose up -d prometheus grafana portainer pgadmin
```

### Redémarrer Prometheus (après modification de la config)

```bash
docker-compose restart prometheus
```

### Voir les logs

```bash
# Logs Prometheus
docker-compose logs -f prometheus

# Logs Grafana
docker-compose logs -f grafana

# Logs backend
docker-compose logs -f backend
```

### Accéder aux métriques brutes

```bash
# Métriques du backend
curl http://localhost:8080/actuator/prometheus

# Health check
curl http://localhost:8080/actuator/health

# Info de l'application
curl http://localhost:8080/actuator/info
```

## Configuration avancée

### Ajouter des métriques personnalisées

Dans votre code Spring Boot, vous pouvez ajouter des métriques personnalisées :

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Counter;

@Service
public class OrderService {

    private final Counter orderCounter;

    public OrderService(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("type", "ecommerce")
            .register(registry);
    }

    public Order createOrder(Order order) {
        // ... logique métier
        orderCounter.increment();
        return savedOrder;
    }
}
```

Cette métrique sera automatiquement disponible dans Prometheus sous le nom `orders_created_total`.

### Modifier la fréquence de scraping

Éditez `prometheus/prometheus.yml` :

```yaml
scrape_configs:
  - job_name: 'spring-boot-app'
    scrape_interval: 30s  # Au lieu de 15s
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['backend:8080']
```

Puis redémarrez Prometheus :
```bash
docker-compose restart prometheus
```

## Ressources complémentaires

- [Documentation Prometheus](https://prometheus.io/docs/)
- [Documentation Grafana](https://grafana.com/docs/)
- [Spring Boot Actuator Metrics](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.metrics)
- [Dashboards Grafana communautaires](https://grafana.com/grafana/dashboards/)
