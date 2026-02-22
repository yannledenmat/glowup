# TP 3.1 : Création de dashboards Grafana pour GlowCommerce

**Module :** Surveillance et gestion des incidents
**Durée :** 2 heures
**Niveau :** Intermédiaire

---

## Contexte métier

GlowCommerce dispose désormais de métriques exposées via Spring Boot Actuator et Prometheus. Vous devez créer des dashboards Grafana pour surveiller la santé de l'application et détecter rapidement les incidents en production.

---

## Objectifs du TP

1. ✅ Configurer la connexion Prometheus → Grafana
2. ✅ Créer un dashboard "Business Metrics" (CA, commandes, conversion)
3. ✅ Créer un dashboard "Technical Metrics" (JVM, latence, erreurs)
4. ✅ Configurer des alertes sur métriques critiques
5. ✅ Créer des métriques custom avec Micrometer
6. ✅ Exporter et versionner les dashboards

---

## Énoncé détaillé

### Partie 1 : Configuration initiale (15 min)

**Pré-requis :**
- Stack Prometheus + Grafana démarrée (docker-compose)
- Backend expose `/actuator/prometheus`

**Tâches :**

1. Vérifiez que Prometheus collecte les métriques :
```bash
# Accéder à Prometheus
open http://localhost:9090

# Vérifier les targets
# Status → Targets → spring-boot-app doit être UP

# Tester une requête
# Exécuter : up{job="spring-boot-app"}
# Attendu : 1 (up)
```

2. Connectez-vous à Grafana :
```bash
open http://localhost:3001
# Login : admin / admin123
```

3. Ajoutez Prometheus comme datasource :
```
Configuration → Data sources → Add data source
- Type : Prometheus
- URL : http://prometheus:9090
- Access : Server (default)
→ Save & Test (doit être vert)
```

---

### Partie 2 : Dashboard Business Metrics (35 min)

**Tâches :**

Créez un nouveau dashboard "GlowCommerce - Business Metrics" avec les panels suivants :

#### Panel 1 : Commandes par heure

```
Titre : Commandes créées / heure
Type : Time series
Query :
  sum(increase(orders_created_total[1h]))

Unité : short (nombre)
Légende : Commandes
```

#### Panel 2 : Chiffre d'affaires aujourd'hui

```
Titre : CA aujourd'hui
Type : Stat
Query :
  sum(increase(orders_total_amount_sum[24h]))

Unité : currency (EUR)
Thresholds :
  - Base : green
  - > 5000 : yellow
  - > 10000 : green (bon CA)
```

#### Panel 3 : Taux de conversion

```
Titre : Taux de conversion (%)
Type : Gauge
Query :
  (sum(rate(orders_created_total[5m])) / sum(rate(http_server_requests_seconds_count{uri="/api/products"}[5m]))) * 100

Min : 0
Max : 10
Thresholds :
  - 0-1% : red
  - 1-3% : yellow
  - 3%+ : green
```

#### Panel 4 : Top 5 produits vendus

```
Titre : Top 5 produits vendus (dernière heure)
Type : Bar gauge
Query :
  topk(5, sum by (product_name) (increase(product_sales_total[1h])))

Orientation : Horizontal
```

#### Panel 5 : Paniers abandonnés

```
Titre : Paniers abandonnés vs Commandes
Type : Time series
Query A (Paniers créés) :
  sum(increase(cart_created_total[5m]))

Query B (Commandes) :
  sum(increase(orders_created_total[5m]))

Légendes :
  A : Paniers
  B : Commandes
```

---

### Partie 3 : Dashboard Technical Metrics (35 min)

**Tâches :**

Créez un dashboard "GlowCommerce - Technical Health" avec :

#### Row 1 : System Health

**Panel 1 : CPU Usage**
```
Titre : CPU Usage (%)
Type : Gauge
Query :
  system_cpu_usage * 100

Min : 0
Max : 100
Thresholds :
  - 0-70% : green
  - 70-85% : yellow
  - 85-100% : red
```

**Panel 2 : Memory Usage (JVM Heap)**
```
Titre : JVM Heap Memory
Type : Time series
Query A (Used) :
  jvm_memory_used_bytes{area="heap"}

Query B (Max) :
  jvm_memory_max_bytes{area="heap"}

Unité : bytes (IEC)
Fill : gradient
```

**Panel 3 : JVM Threads**
```
Titre : JVM Threads
Type : Stat
Query :
  jvm_threads_live_threads

Thresholds :
  - < 100 : green
  - 100-200 : yellow
  - > 200 : red (possible thread leak)
```

#### Row 2 : HTTP Performance

**Panel 4 : Requêtes HTTP par seconde**
```
Titre : HTTP Requests/sec (par endpoint)
Type : Time series
Query :
  sum by (uri) (rate(http_server_requests_seconds_count[1m]))

Legend : {{uri}}
```

**Panel 5 : Latence P50, P95, P99**
```
Titre : HTTP Response Time (percentiles)
Type : Time series
Query A (P50) :
  histogram_quantile(0.50, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))

Query B (P95) :
  histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))

Query C (P99) :
  histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))

Unité : seconds (s)
Légendes : P50, P95, P99
```

**Panel 6 : Taux d'erreur 5xx**
```
Titre : Error Rate (5xx %)
Type : Stat
Query :
  (sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m]))) * 100

Unité : percent (0-100)
Thresholds :
  - 0-1% : green
  - 1-5% : yellow
  - > 5% : red
```

#### Row 3 : Database

**Panel 7 : Connexions BDD actives**
```
Titre : HikariCP Connections
Type : Time series
Query A (Active) :
  hikaricp_connections_active

Query B (Idle) :
  hikaricp_connections_idle

Query C (Total) :
  hikaricp_connections

Légendes : Active, Idle, Total
Fill : stack
```

**Panel 8 : Requêtes SQL lentes**
```
Titre : Slow Queries (> 1s)
Type : Stat
Query :
  sum(increase(slow_queries_total[5m]))

Thresholds :
  - 0 : green
  - > 0 : red
```

---

### Partie 4 : Métriques custom avec Micrometer (25 min)

**Tâches :**

Ajoutez des métriques custom dans votre code Spring Boot :

#### 1. Métrique : Commandes créées

```java
@Service
public class OrderService {

    private final Counter orderCounter;
    private final DistributionSummary orderAmountSummary;

    public OrderService(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("type", "ecommerce")
            .register(registry);

        this.orderAmountSummary = DistributionSummary.builder("orders.total.amount")
            .description("Order total amounts")
            .baseUnit("EUR")
            .register(registry);
    }

    @Transactional
    public OrderDTO createOrder(CreateOrderRequest request, String username) {
        // ... logique de création

        orderCounter.increment();
        orderAmountSummary.record(order.getTotalAmount().doubleValue());

        return OrderDTO.fromOrder(order);
    }
}
```

#### 2. Métrique : Produits vendus par nom

```java
@Service
public class ProductSalesMetrics {

    private final MeterRegistry registry;

    public ProductSalesMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordSale(String productName, int quantity) {
        Counter.builder("product.sales")
            .description("Product sales count")
            .tag("product_name", productName)
            .register(registry)
            .increment(quantity);
    }
}
```

#### 3. Métrique : Paniers créés vs abandonnés

```java
@Service
public class CartMetrics {

    private final Counter cartCreatedCounter;
    private final Counter cartAbandonedCounter;

    public CartMetrics(MeterRegistry registry) {
        this.cartCreatedCounter = Counter.builder("cart.created")
            .description("Carts created")
            .register(registry);

        this.cartAbandonedCounter = Counter.builder("cart.abandoned")
            .description("Carts abandoned (not converted to order)")
            .register(registry);
    }

    // À appeler dans CartService
    public void recordCartCreated() {
        cartCreatedCounter.increment();
    }

    public void recordCartAbandoned() {
        cartAbandonedCounter.increment();
    }
}
```

#### 4. Métrique : Temps de traitement des paiements

```java
@Service
public class PaymentService {

    private final Timer paymentTimer;

    public PaymentService(MeterRegistry registry) {
        this.paymentTimer = Timer.builder("payment.processing.time")
            .description("Payment processing duration")
            .register(registry);
    }

    public PaymentResult processPayment(PaymentRequest request) {
        return paymentTimer.record(() -> {
            // Logique de paiement
            return paymentGateway.charge(request);
        });
    }
}
```

**Vérification :**
```bash
# Redémarrer le backend
docker-compose restart backend

# Créer quelques commandes via l'API
curl -X POST http://localhost:8080/api/orders ...

# Vérifier que les métriques apparaissent dans Prometheus
curl http://localhost:8080/actuator/prometheus | grep "orders_created"
# Attendu : orders_created_total{type="ecommerce"} 5.0
```

---

### Partie 5 : Alertes Grafana (15 min)

**Tâches :**

Configurez 3 alertes critiques :

#### Alerte 1 : Taux d'erreur élevé

```
Nom : High Error Rate
Panel : Error Rate (5xx %)
Condition : WHEN last() OF query(A) IS ABOVE 5
FOR : 5 minutes

Notification :
  - Canal : Slack / Email
  - Message : "⚠️ Taux d'erreur > 5% depuis 5 minutes sur GlowCommerce"
```

#### Alerte 2 : Latence checkout élevée

```
Nom : Slow Checkout
Panel : HTTP Response Time
Condition : WHEN percentile(0.95) OF query(checkout) IS ABOVE 2
FOR : 3 minutes

Notification :
  - Message : "🐌 Checkout lent (P95 > 2s) - Impact conversion !"
```

#### Alerte 3 : Mémoire JVM critique

```
Nom : JVM Memory Critical
Condition :
  (jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}) * 100 > 90
FOR : 2 minutes

Notification :
  - Message : "🔥 Mémoire JVM > 90% - Risque OutOfMemoryError"
```

**Configuration du canal de notification :**
```
Alerting → Contact points → Add contact point
- Name : Slack Incidents
- Type : Slack
- Webhook URL : https://hooks.slack.com/services/YOUR/WEBHOOK
→ Test & Save
```

---

### Partie 6 : Export et versioning (10 min)

**Tâches :**

1. Exportez vos dashboards en JSON :
```
Dashboard → Settings → JSON Model → Copy to clipboard
```

2. Sauvegardez dans le repository :
```bash
mkdir -p grafana/dashboards
# Coller le JSON dans :
# grafana/dashboards/business-metrics.json
# grafana/dashboards/technical-health.json
```

3. Provisionnez automatiquement les dashboards au démarrage :

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'GlowCommerce Dashboards'
    folder: 'GlowCommerce'
    type: file
    options:
      path: /etc/grafana/provisioning/dashboards
```

```yaml
# docker-compose.yml
grafana:
  image: grafana/grafana:latest
  volumes:
    - ./grafana/provisioning:/etc/grafana/provisioning
    - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
  # ...
```

---

## Critères de réussite

| Critère | Points | Validation |
|---------|--------|------------|
| Datasource Prometheus configurée | 5 | Test OK |
| Dashboard Business avec 5 panels | 25 | Affiche CA, commandes, conversion |
| Dashboard Technical avec 8 panels | 30 | Affiche CPU, mémoire, latence, erreurs |
| Métriques custom implémentées (4 types) | 20 | Visibles dans Prometheus |
| 3 alertes configurées | 15 | Alertes se déclenchent en simulation |
| Dashboards exportés et versionnés (JSON) | 5 | Fichiers dans git |
| **TOTAL** | **100** | |

---

## Livrables attendus

1. **Dashboards Grafana** (2 dashboards fonctionnels)
2. **Code source** : Métriques custom dans les services
3. **Fichiers JSON** :
   - `grafana/dashboards/business-metrics.json`
   - `grafana/dashboards/technical-health.json`
4. **Documentation** : `docs/GRAFANA-DASHBOARDS.md`
   - Screenshots des dashboards
   - Explication de chaque métrique
   - Guide pour créer de nouveaux panels

---

## Tests de validation

### Test 1 : Dashboard Business affiche des données

```bash
# Générer du trafic
for i in {1..100}; do
  curl http://localhost:8080/api/products
done

# Créer quelques commandes
curl -X POST http://localhost:8080/api/orders ...

# Vérifier Grafana
# Dashboard Business → Voir les commandes augmenter
```

### Test 2 : Alerte se déclenche

```bash
# Simuler des erreurs 500
for i in {1..50}; do
  curl http://localhost:8080/api/nonexistent
done

# Attendre 5 minutes
# → Alerte "High Error Rate" doit se déclencher
# → Notification Slack reçue
```

### Test 3 : Métriques custom disponibles

```bash
curl http://localhost:8080/actuator/prometheus | grep -E "orders_created|product_sales|cart_created"

# Attendu : Métriques présentes avec valeurs
```

---

## Compétences mobilisées

- **C6** : Architecture de monitoring (conception dashboards, métriques pertinentes)
- **C19** : Métriques optimisées (performance, ressources)
- **C25** : Surveillance sécurité (détection incidents, alerting)

---

## Bonus (facultatif)

Si vous avez terminé en avance :

1. **Variables de dashboard** : Filtrer par environnement (prod/staging)
2. **Annotations** : Marquer les déploiements sur les graphiques
3. **Dashboard Logs** : Intégrer Grafana Loki pour les logs
4. **Heatmap** : Visualiser la distribution des latences

---

**Bon courage !** 📊
