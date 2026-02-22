# TP 3.2 : Simulation et gestion d'un incident en production

**Module :** Surveillance et gestion des incidents
**Durée :** 1h30
**Niveau :** Avancé

---

## Contexte métier

C'est le Black Friday. À 14h30, GlowCommerce commence à recevoir des plaintes clients : le checkout ne fonctionne plus, les paiements échouent. Vous êtes le développeur on-call. Vous devez diagnostiquer, mitiger et résoudre l'incident, puis rédiger un post-mortem.

---

## Objectifs du TP

1. ✅ Détecter l'incident via Grafana/Prometheus
2. ✅ Diagnostiquer la cause racine avec logs et métriques
3. ✅ Appliquer une mitigation immédiate
4. ✅ Résoudre le problème de manière pérenne
5. ✅ Rédiger un post-mortem complet

---

## Scénario d'incident (fourni)

### Symptômes

- **14:30** : Alerte Grafana "High Error Rate" (15% d'erreurs 500)
- **14:32** : Alerte "Slow Checkout" (P95 > 3s, normalement 500ms)
- **14:35** : Support client : "Les clients ne peuvent plus payer"
- **14:36** : CA en chute libre (-80% par rapport à l'heure précédente)

### Métriques observées

```promql
# Taux d'erreur
sum(rate(http_server_requests_seconds_count{status="500"}[1m])) = 45 req/s

# Latence checkout
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{uri="/api/checkout"}[5m])) = 3.2s

# Connexions BDD
hikaricp_connections_active = 50 (pool saturé, max=50)

# Threads en attente
hikaricp_connections_pending = 120 (threads bloqués !)
```

---

## Partie 1 : Détection et triage (15 min)

**Tâches :**

1. Ouvrez Grafana et identifiez les anomalies
2. Consultez les alertes actives
3. Évaluez la sévérité : P0, P1, P2 ou P3 ?
4. Notifiez l'équipe sur Slack

**Questions à répondre :**
- Quelle est la métrique la plus alarmante ?
- Quel est l'impact business estimé ?
- Priorité de l'incident ?

**Réponse attendue :**
```
Sévérité : P0 (Checkout down = arrêt total des ventes)
Impact : -80% CA, ~500€/minute de pertes (Black Friday)
Action immédiate requise : OUI
```

---

## Partie 2 : Diagnostic (20 min)

**Tâches :**

1. **Consultez les logs backend** :
```bash
docker-compose logs backend --tail=100 | grep ERROR
```

Vous voyez :
```
[ERROR] HikariPool - Timeout waiting for connection (30000ms)
[ERROR] OrderService - Failed to create order: Connection timeout
[ERROR] HikariPool - 50/50 connections active, 120 threads waiting
```

2. **Vérifiez les connexions PostgreSQL** :
```bash
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

Résultat :
```
 count | state
-------+--------
   50  | active  ← TOUTES les connexions sont actives !
```

3. **Identifiez les requêtes lentes** :
```bash
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT pid, now() - query_start AS duration, query
      FROM pg_stat_activity
      WHERE state = 'active' AND now() - query_start > interval '5 seconds'
      ORDER BY duration DESC LIMIT 10;"
```

Résultat :
```
  pid  | duration | query
-------+----------+------------------------------------------
 12345 | 00:03:24 | SELECT * FROM orders o JOIN order_items oi ...
 12346 | 00:03:21 | SELECT * FROM orders o JOIN order_items oi ...
 ...
```

**Cause racine identifiée :**
```
Requête SQL non optimisée dans OrderService.getRecentOrders()
→ N+1 queries + pas de pagination
→ Pool de connexions saturé
→ Tous les threads backend bloqués
→ Checkout impossible
```

---

## Partie 3 : Mitigation immédiate (20 min)

**Objectif :** Rétablir le service RAPIDEMENT (quitte à faire du "sale")

**Actions possibles :**

### Option A : Augmenter le pool de connexions (rapide mais pas idéal)

```yaml
# docker-compose.yml
backend:
  environment:
    SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: 100  # 50 → 100
```

```bash
docker-compose up -d backend
```

**Temps de ré

**Temps de ré

**Temps de ré

### Étape 2 : Corriger avec JOIN FETCH + Pagination

```java
// OrderRepository.java (sql
-- Migration Flyway
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### Étape 4 : Déployer la 

### Étape 5 : Valider la ré

---

## Partie 5 : Post-mortem (20 min)

**Tâches :**

Rédigez un post-mortem en suivant ce template :

```markdown
# POST-MORTEM : Incident #2024-12-29-001 - Checkout down

## Résumé exécutif

**Date :** 29 décembre 2024, 14:30-15:15 CET
**Durée :** 45 minutes
**Sévérité :** P0 (service critique indisponible)
**Impact :**
- 234 commandes perdues
- CA perdu estimé : €22,500
- ~5,000 clients affectés

---

## Chronologie

| Heure | Événement |
|-------|-----------|
| 14:30 | 🔴 Alerte Grafana "High Error Rate" (15% erreurs 500) |
| 14:32 | 🔴 Alerte "Slow Checkout" (P95 > 3s) |
| 14:35 | 📞 Premier ticket support client |
| 14:37 | 🚨 Équipe DevOps notifiée |
| 14:42 | 🔍 Cause identifiée : pool connexions saturé |
| 14:50 | ⚡ Mitigation : augmentation pool 50 → 100 |
| 15:00 | ✅ Service restauré |
| 15:15 | ✅ Incident clos, surveillance active |

---

## Cause racine

**Problème :** Requête SQL non optimisée dans `OrderService.getRecentOrders()`

**Détails techniques :**
1. `findAll()` sans pagination → charge 150,000 commandes
2. N+1 queries : 1 requête par commande pour les items (150,000 requêtes !)
3. Chaque requête prend 200ms
4. Pool de connexions (max=50) saturé en quelques secondes
5. Tous les threads backend bloqués en attente de connexion
6. Checkout impossible, timeout après 30s

**Code problématique :**
```java
List<Order> orders = orderRepository.findAll();  // ❌
orders.stream().map(order -> {
    orderItemRepository.findByOrderId(order.getId());  // ❌ N+1
})
```

---

## Impact

### Business
- **CA perdu** : €22,500 (45 min × ~€500/min)
- **Commandes perdues** : 234
- **Clients affectés** : ~5,000 (abandons panier)
- **NPS** : Impact négatif estimé (clients mécontents)

### Technique
- **Disponibilité** : 99.5% → 98.9% (SLO breach)
- **Error Budget** : -43 minutes sur le mois

---

## Ce qui a bien fonctionné ✅

1. **Détection rapide** : Alertes Grafana en < 2 min
2. **Escalade** : Équipe notifiée immédiatement
3. **Diagnostic** : Cause racine trouvée en 12 min (logs + métriques)
4. **Mitigation** : Service restauré en 20 min
5. **Communication** : Clients informés via status page

---

## Ce qui peut être amélioré ⚠️

1. **Tests de charge** : Pas de load testing avant Black Friday
2. **Revue de code** : N+1 queries non détectées
3. **Monitoring** : Pas d'alerte sur "slow queries"
4. **Capacité** : Pool connexions sous-dimensionné

---

## Actions correctives

### Actions immédiates (fait) ✅
- [x] Augmentation pool connexions (50 → 100)
- [x] Correction requête SQL (JOIN FETCH + pagination)
- [x] Ajout index `orders.created_at`
- [x] Déploiement correction en production

### Actions préventives (à faire)
- [ ] **J+1** : Ajouter tests de performance (Gatling) dans CI/CD
- [ ] **J+3** : Revue de toutes les requêtes avec potentiel N+1
- [ ] **J+7** : Implémenter alerte "slow queries > 1s"
- [ ] **J+14** : Load testing complet avant toute promo
- [ ] **J+30** : Formation équipe sur optimisation SQL

### Responsables
- Tests perf : @dev-team
- Revue SQL : @senior-dev
- Alertes : @devops
- Load testing : @qa-team

---

## Métriques post-incident

**Avant correction :**
- Latence P95 checkout : 3.2s
- Pool connexions : 50/50 (saturé)
- Taux d'erreur : 15%

**Après correction :**
- Latence P95 checkout : 180ms ✅ (-94%)
- Pool connexions : 12/100 ✅
- Taux d'erreur : 0.1% ✅

---

## Leçons apprises

1. **Toujours paginer** les requêtes de liste
2. **Utiliser JOIN FETCH** pour éviter N+1
3. **Load testing obligatoire** avant événements à fort trafic
4. **Surveiller les slow queries** en temps réel
5. **Dimensionner le pool** selon le trafic peak (x2 minimum)

---

**Rédigé par :** Équipe DevOps
**Date :** 29 décembre 2024
**Approuvé par :** CTO

---

*Post-mortem sans blâme : l'objectif est d'apprendre, pas de pointer du doigt.*
```

---

## Critères de réussite

| Critère | Points |
|---------|--------|
| Incident détecté via monitoring | 10 |
| Cause racine identifiée correctement | 20 |
| Mitigation appliquée (service restauré) | 20 |
| Correction pérenne implémentée | 25 |
| Post-mortem complet et structuré | 20 |
| Actions préventives pertinentes | 5 |
| **TOTAL** | **100** |

---

## Livrables attendus

1. **Code corrigé** : `OrderService.java` et `OrderRepository.java`
2. **Migration SQL** : Index `orders.created_at`
3. **Post-mortem** : `docs/postmortems/2024-12-29-checkout-down.md`
4. **Runbook** : Procédure pour incidents similaires

---

## Compétences mobilisées

- **C6** : Gestion d'incident, communication technique
- **C19** : Diagnostic et optimisation (SQL, pool connexions)
- **C25** : Sécurité et disponibilité du service

---

**Bon courage !** 🚨
