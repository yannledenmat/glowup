# TP 4.1 : Optimisation SQL - Résolution du problème N+1 et indexation stratégique

**Module :** Optimisation des performances
**Durée :** 2 heures
**Niveau :** Intermédiaire
**Prérequis :** MODULE-4-SLIDE-1 (Optimisation SQL et performances base de données)

---

## 🎯 Contexte métier

**Black Friday 2024 approche !** L'équipe de GlowCommerce a détecté des **problèmes de performance critiques** lors des tests de charge :

**Extrait du rapport de performance :**
```
🔴 ALERTE PERFORMANCE - Risque de crash le jour J

Problèmes identifiés lors du test de charge (1000 utilisateurs simultanés) :
1. Endpoint GET /api/orders : Timeout après 5 secondes (N+1 queries détecté)
2. Recherche produits : 450ms par requête (Seq Scan au lieu d'Index Scan)
3. Liste produits par catégorie : 125ms (pas d'index sur category_id)
4. Endpoint GET /api/products : 50 000 produits chargés en mémoire → OutOfMemoryError
5. Détail commande : 850ms pour charger 1 commande avec 5 items

Cas d'usage critique Black Friday :
- 10 000 utilisateurs simultanés
- Latence actuelle : 2-3 secondes
- Latence cible : < 200ms

Si non résolu : Site inaccessible pendant le Black Friday = perte de 500 000€
```

Vous devez **optimiser les requêtes SQL dans les 48h** avant le pic de trafic du Black Friday.

---

## 📋 Objectifs du TP

À la fin de ce TP, vous aurez :

1. ✅ **Identifié** les problèmes N+1 queries dans 2 endpoints critiques
2. ✅ **Résolu** les N+1 avec JOIN FETCH et @EntityGraph
3. ✅ **Analysé** les requêtes lentes avec EXPLAIN ANALYZE
4. ✅ **Créé** 8 index stratégiques (B-tree, GIN, composite, partiel)
5. ✅ **Implémenté** la pagination obligatoire sur tous les endpoints
6. ✅ **Optimisé** la recherche full-text avec tsvector + GIN
7. ✅ **Mesuré** les gains de performance (avant/après)

---

## 🐌 Partie 1 : Diagnostic initial - Identifier le problème N+1 (20 min)

### Étape 1.1 : Activer les logs Hibernate

**Modifiez `application.properties` :**

```properties
# Logs SQL
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Logs détaillés pour détecter N+1
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# Statistiques Hibernate
spring.jpa.properties.hibernate.generate_statistics=true
logging.level.org.hibernate.stat=DEBUG
```

**Redémarrez l'application :**

```bash
docker-compose restart backend

# Attendre le démarrage
docker-compose logs backend | grep "Started GlowcommerceApplication"
```

---

### Étape 1.2 : Reproduire le problème N+1

**Testez l'endpoint de liste de commandes :**

```bash
# Créer un utilisateur de test avec des commandes
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@glowcommerce.com",
    "password": "Test123!"
  }'

# Se connecter
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!"
  }' | jq -r '.token')

# Lister les commandes (PROBLÈME N+1 !)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/orders
```

**Observez les logs Hibernate :**

```bash
docker-compose logs backend --tail=100 | grep "select"

# Vous devriez voir :
# 1. SELECT * FROM orders WHERE user_id = 42;
# 2. SELECT * FROM order_items WHERE order_id = 1;
# 3. SELECT * FROM order_items WHERE order_id = 2;
# 4. SELECT * FROM order_items WHERE order_id = 3;
# ... 100 requêtes supplémentaires !
```

**💀 C'est le problème N+1 queries en action !**

---

### Étape 1.3 : Analyser avec PostgreSQL

**Connectez-vous à PostgreSQL :**

```bash
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce
```

**Exécutez la requête problématique :**

```sql
-- Requête 1 : Récupérer les commandes (rapide)
SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at
FROM orders o
WHERE o.user_id = 42;

-- Résultat : 100 lignes en 10ms

-- Requête 2 : Items de la commande 1 (répétée N fois !)
SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price
FROM order_items oi
WHERE oi.order_id = 1;

-- Total : 1 + 100 = 101 requêtes !!!
```

**Calculez le temps total :**

```
Avec 100 commandes :
├─ 101 requêtes
├─ Temps moyen par requête : 10ms
└─ Temps total : 101 × 10ms = 1010ms = 1 seconde

Avec 1000 commandes :
└─ Temps total : 1001 × 10ms = 10 secondes !!!
```

---

## 🔧 Partie 2 : Résoudre le N+1 queries (30 min)

### Étape 2.1 : Code actuel (VULNÉRABLE)

**Entités JPA :**

```java
package com.glowcommerce.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 20)
    private String status;  // PENDING, SHIPPED, DELIVERED, CANCELLED

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // ❌ LAZY par défaut = N+1 queries !
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();
}
```

```java
package com.glowcommerce.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    private Integer quantity;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
```

**Repository actuel :**

```java
package com.glowcommerce.repository;

import com.glowcommerce.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // ❌ N+1 queries : Charge seulement les commandes
    List<Order> findByUserId(Long userId);
}
```

**Controller actuel (PROBLÉMATIQUE) :**

```java
package com.glowcommerce.controller;

import com.glowcommerce.dto.OrderDTO;
import com.glowcommerce.dto.OrderItemDTO;
import com.glowcommerce.model.Order;
import com.glowcommerce.repository.OrderRepository;
import com.glowcommerce.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;

    // ❌ N+1 QUERIES ICI !
    @GetMapping
    public List<OrderDTO> getMyOrders(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        // Requête 1 : Récupérer les commandes
        List<Order> orders = orderRepository.findByUserId(userPrincipal.getId());

        // Pour chaque commande, accéder aux items déclenche une requête
        return orders.stream()
            .map(order -> {
                OrderDTO dto = new OrderDTO();
                dto.setId(order.getId());
                dto.setTotalAmount(order.getTotalAmount());
                dto.setStatus(order.getStatus());
                dto.setCreatedAt(order.getCreatedAt());

                // ❌ LAZY loading : 1 requête SQL par commande !
                dto.setItems(order.getItems().stream()
                    .map(item -> OrderItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .build())
                    .toList());

                return dto;
            })
            .toList();
    }
}
```

**Test de performance (AVANT optimisation) :**

```bash
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/orders

# Résultat : 1010ms (avec 100 commandes)
```

---

### Étape 2.2 : Solution avec JOIN FETCH

**Repository optimisé :**

```java
package com.glowcommerce.repository;

import com.glowcommerce.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // ❌ N+1 queries
    List<Order> findByUserId(Long userId);

    // ✅ 1 seule requête avec JOIN FETCH
    @Query("SELECT o FROM Order o " +
           "LEFT JOIN FETCH o.items " +
           "WHERE o.userId = :userId " +
           "ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);
}
```

**SQL généré par Hibernate (1 seule requête) :**

```sql
SELECT
    o.id AS order_id,
    o.user_id,
    o.total_amount,
    o.status,
    o.created_at,
    oi.id AS item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = 42
ORDER BY o.created_at DESC;

-- ✅ 1 seule requête au lieu de 101 !
```

**Controller optimisé :**

```java
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;

    // ✅ 1 seule requête grâce au JOIN FETCH
    @GetMapping
    public List<OrderDTO> getMyOrders(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        // ✅ 1 seule requête grâce au JOIN FETCH
        List<Order> orders = orderRepository.findByUserIdWithItems(userPrincipal.getId());

        return orders.stream()
            .map(order -> {
                OrderDTO dto = new OrderDTO();
                dto.setId(order.getId());
                dto.setTotalAmount(order.getTotalAmount());
                dto.setStatus(order.getStatus());
                dto.setCreatedAt(order.getCreatedAt());

                // ✅ Déjà chargé en mémoire, aucune requête supplémentaire
                dto.setItems(order.getItems().stream()
                    .map(item -> OrderItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .build())
                    .toList());

                return dto;
            })
            .toList();
    }
}
```

**Test de performance (APRÈS optimisation) :**

```bash
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/orders

# Résultat : 50ms (au lieu de 1010ms)
# Gain : 1010ms → 50ms = 95% plus rapide !!!
```

**Vérifiez les logs Hibernate :**

```bash
docker-compose logs backend --tail=20 | grep "select"

# Vous devriez voir :
# 1 seule requête SELECT avec LEFT JOIN !
```

---

## 🔍 Partie 3 : Utiliser EXPLAIN ANALYZE (25 min)

### Étape 3.1 : Analyser une requête lente

**Connectez-vous à PostgreSQL :**

```bash
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce
```

**Requête à analyser :**

```sql
-- Récupérer les produits d'une catégorie
SELECT p.id, p.name, p.price, p.stock, p.active
FROM products p
WHERE p.category_id = 5
ORDER BY p.created_at DESC;
```

**Exécutez EXPLAIN ANALYZE (AVANT index) :**

```sql
EXPLAIN ANALYZE
SELECT p.id, p.name, p.price, p.stock, p.active
FROM products p
WHERE p.category_id = 5
ORDER BY p.created_at DESC;
```

**Résultat AVANT optimisation :**

```
Sort  (cost=2234.56..2234.81 rows=100 width=128) (actual time=124.567..124.678 rows=100 loops=1)
  Sort Key: created_at DESC
  Sort Method: quicksort  Memory: 25kB
  ->  Seq Scan on products p  (cost=0.00..2234.56 rows=100 width=128) (actual time=0.123..124.234 rows=100 loops=1)
        Filter: (category_id = 5)
        Rows Removed by Filter: 49900

Planning Time: 0.234 ms
Execution Time: 125.123 ms

💀 PROBLÈMES :
- Seq Scan = Parcours SÉQUENTIEL (lit toutes les 50 000 lignes)
- Rows Removed by Filter = 49900 lignes lues pour rien !
- Execution Time = 125ms (trop lent)
```

**Décodage du résultat :**

```
Seq Scan on products p
├─ Seq Scan = Balayage séquentiel (lit TOUTES les lignes)
├─ cost=0.00..2234.56 = Coût estimé (unité arbitraire)
├─ rows=100 = Nombre de lignes attendues dans le résultat
├─ width=128 = Taille moyenne d'une ligne (bytes)
└─ actual time=0.123..124.234 = Temps réel (ms)
   ├─ 0.123 = Temps avant la première ligne
   └─ 124.234 = Temps pour toutes les lignes

Filter: (category_id = 5)
└─ Filtre appliqué APRÈS avoir lu toutes les lignes

Rows Removed by Filter: 49900
└─ 49900 lignes lues et jetées (très inefficace)
```

---

### Étape 3.2 : Créer un index B-tree

**Migration Flyway `V6__add_indexes.sql` :**

```sql
-- ========================================
-- TP 4.1 : Index stratégiques
-- ========================================

-- Index sur category_id (B-tree)
CREATE INDEX idx_products_category_id ON products(category_id);

-- Analyser la table pour mettre à jour les statistiques
ANALYZE products;

-- Commentaire
COMMENT ON INDEX idx_products_category_id IS
  'Index B-tree pour requêtes filtrant par category_id. Gain : 125ms → 1.5ms (99% plus rapide).';
```

**Exécutez la migration :**

```bash
# Redémarrer le backend (Flyway auto-exécute)
docker-compose restart backend

# Vérifier que l'index existe
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products';"
```

---

### Étape 3.3 : Ré-analyser avec EXPLAIN ANALYZE

**Exécutez EXPLAIN ANALYZE (APRÈS index) :**

```sql
EXPLAIN ANALYZE
SELECT p.id, p.name, p.price, p.stock, p.active
FROM products p
WHERE p.category_id = 5
ORDER BY p.created_at DESC;
```

**Résultat APRÈS optimisation :**

```
Sort  (cost=12.56..12.81 rows=100 width=128) (actual time=1.234..1.345 rows=100 loops=1)
  Sort Key: created_at DESC
  Sort Method: quicksort  Memory: 25kB
  ->  Index Scan using idx_products_category_id on products p  (cost=0.42..12.56 rows=100 width=128) (actual time=0.034..1.123 rows=100 loops=1)
        Index Cond: (category_id = 5)
        Buffers: shared hit=15

Planning Time: 0.089 ms
Execution Time: 1.456 ms

✅ OPTIMISÉ :
- Index Scan = Utilise l'index (accès direct aux 100 lignes)
- Buffers: shared hit=15 = Lit seulement 15 blocs (au lieu de 5000)
- Execution Time = 1.456ms (au lieu de 125ms)
- Gain : 125ms → 1.5ms = 99% plus rapide !!!
```

---

## 📊 Partie 4 : Créer des index stratégiques (30 min)

### Étape 4.1 : Checklist des colonnes à indexer

**Analysez le code pour identifier les colonnes fréquemment utilisées :**

```bash
# Rechercher WHERE dans les repositories
grep -r "WHERE" glowcommerce-backend/src/main/java/com/glowcommerce/repository/

# Rechercher ORDER BY
grep -r "ORDER BY" glowcommerce-backend/src/main/java/com/glowcommerce/repository/

# Rechercher JOIN ON
grep -r "JOIN" glowcommerce-backend/src/main/java/com/glowcommerce/repository/
```

**Résultats :**
- `orders.user_id` : Très fréquent (mes commandes)
- `orders.status` : Fréquent (filtrer par statut)
- `orders.created_at` : Fréquent (tri chronologique)
- `order_items.order_id` : Très fréquent (JOIN)
- `order_items.product_id` : Fréquent (statistiques produits)
- `products.category_id` : Très fréquent (filtrer par catégorie)
- `products.active` : Fréquent (afficher seulement les produits actifs)
- `users.email` : Très fréquent (login)

---

### Étape 4.2 : Migration complète

**Créez `src/main/resources/db/migration/V6__add_indexes.sql` :**

```sql
-- ========================================
-- TP 4.1 : Index stratégiques
-- ========================================

-- ========================================
-- USERS
-- ========================================

-- Email (login fréquent, UNIQUE)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Username (recherche utilisateur)
CREATE INDEX idx_users_username ON users(username);

-- Date de création (statistiques)
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ========================================
-- PRODUCTS
-- ========================================

-- Category ID (filtrer par catégorie)
CREATE INDEX idx_products_category_id ON products(category_id);

-- Prix (filtrer par fourchette de prix)
CREATE INDEX idx_products_price ON products(price);

-- Date de création (tri chronologique)
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Index PARTIEL : Seulement les produits actifs
CREATE INDEX idx_products_active ON products(category_id, price)
WHERE active = true;

-- Full-text search (GIN index)
-- Nécessite l'extension pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_gin ON products USING GIN (name gin_trgm_ops);

-- ========================================
-- ORDERS
-- ========================================

-- User ID (mes commandes)
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Status (filtrer par statut)
CREATE INDEX idx_orders_status ON orders(status);

-- Date de création (tri chronologique)
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Index COMPOSITE : user_id + status (requête fréquente)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Index PARTIEL : Seulement les commandes livrées
CREATE INDEX idx_orders_delivered ON orders(user_id)
WHERE status = 'DELIVERED';

-- ========================================
-- ORDER_ITEMS
-- ========================================

-- Order ID (JOIN fréquent)
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Product ID (statistiques produits)
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Index COMPOSITE : order_id + product_id
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);

-- ========================================
-- AUDIT_LOGS (du TP 1.2)
-- ========================================

-- Timestamp (tri chronologique)
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- User ID (logs d'un utilisateur)
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);

-- Action (filtrer par type d'action)
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Entité (logs d'une entité spécifique)
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Index COMPOSITE : user + action + timestamp
CREATE INDEX idx_audit_user_action_time ON audit_logs(user_id, action, timestamp DESC);

-- ========================================
-- STATISTIQUES
-- ========================================

-- Analyser toutes les tables pour mettre à jour les statistiques
ANALYZE users;
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
ANALYZE audit_logs;

-- ========================================
-- COMMENTAIRES DOCUMENTATION
-- ========================================

COMMENT ON INDEX idx_products_category_id IS
  'Index B-tree pour requêtes filtrant par category_id. Gain mesuré : 125ms → 1.5ms.';

COMMENT ON INDEX idx_products_active IS
  'Index partiel (seulement active=true) pour optimiser les recherches produits actifs.';

COMMENT ON INDEX idx_orders_user_status IS
  'Index composite pour requêtes filtrant par user_id ET status (ex: mes commandes livrées).';

COMMENT ON INDEX idx_products_name_gin IS
  'Index GIN pour recherche full-text avec ILIKE et pg_trgm.';
```

**Exécutez la migration :**

```bash
# Redémarrer le backend
docker-compose restart backend

# Vérifier tous les index créés
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;"
```

---

### Étape 4.3 : Test des index

**Test 1 : Index sur orders.user_id**

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42;

-- Résultat attendu :
-- Index Scan using idx_orders_user_id on orders
-- Execution Time: < 5ms
```

**Test 2 : Index composite (user_id + status)**

```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 42 AND status = 'DELIVERED';

-- Résultat attendu :
-- Index Scan using idx_orders_user_status on orders
-- Execution Time: < 2ms
```

**Test 3 : Index GIN pour recherche texte**

```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE name ILIKE '%laptop%';

-- Résultat attendu :
-- Bitmap Index Scan on idx_products_name_gin
-- Execution Time: < 15ms (au lieu de 450ms)
```

---

## 📄 Partie 5 : Pagination obligatoire (25 min)

### Étape 5.1 : Problème - Endpoint sans pagination

**Code actuel (DANGEREUX) :**

```java
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    // ❌ DANGEREUX : Charge tous les produits (50 000 lignes !)
    @GetMapping
    public List<ProductDTO> getAllProducts() {
        List<Product> products = productRepository.findAll();

        return products.stream()
            .map(ProductDTO::fromProduct)
            .toList();
    }
}
```

**Problèmes :**
- 50 000 produits chargés en mémoire → `OutOfMemoryError`
- Serialization JSON : 5 secondes
- Transfer réseau : 10 MB
- Frontend freeze pendant le chargement

**Test (CRASH attendu) :**

```bash
time curl http://localhost:8080/api/products

# Résultat : Timeout après 30 secondes
# Erreur backend : java.lang.OutOfMemoryError: Java heap space
```

---

### Étape 5.2 : Solution avec Pageable

**Repository :**

```java
package com.glowcommerce.repository;

import com.glowcommerce.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // ✅ Avec pagination
    Page<Product> findAll(Pageable pageable);

    // ✅ Avec pagination + filtre
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    // ✅ Avec pagination + filtre sur active
    Page<Product> findByActiveTrue(Pageable pageable);
}
```

**Controller optimisé :**

```java
package com.glowcommerce.controller;

import com.glowcommerce.dto.ProductDTO;
import com.glowcommerce.model.Product;
import com.glowcommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    // ✅ Pagination obligatoire
    @GetMapping
    public Page<ProductDTO> getAllProducts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "DESC") Sort.Direction direction
    ) {
        // Créer le Pageable
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        // Récupérer la page
        Page<Product> productPage = productRepository.findAll(pageable);

        // Mapper en DTO
        return productPage.map(ProductDTO::fromProduct);
    }

    // ✅ Pagination + filtre par catégorie
    @GetMapping("/category/{categoryId}")
    public Page<ProductDTO> getProductsByCategory(
        @PathVariable Long categoryId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "price") String sortBy,
        @RequestParam(defaultValue = "ASC") Sort.Direction direction
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<Product> productPage = productRepository.findByCategoryId(categoryId, pageable);
        return productPage.map(ProductDTO::fromProduct);
    }
}
```

**SQL généré par Hibernate :**

```sql
-- Page 0 (produits 1-20)
SELECT * FROM products
WHERE active = true
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Page 1 (produits 21-40)
SELECT * FROM products
WHERE active = true
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;

-- Compter le total (pour la pagination)
SELECT COUNT(*) FROM products WHERE active = true;
```

**Test :**

```bash
# Page 1 (20 produits)
time curl "http://localhost:8080/api/products?page=0&size=20"
# Résultat : 120ms

# Page 2
time curl "http://localhost:8080/api/products?page=1&size=20"
# Résultat : 120ms

# Tri par prix croissant
time curl "http://localhost:8080/api/products?page=0&size=20&sortBy=price&direction=ASC"
# Résultat : 125ms

# Filtrer par catégorie + tri par prix
time curl "http://localhost:8080/api/products/category/5?page=0&size=20&sortBy=price&direction=ASC"
# Résultat : 1.5ms (grâce à l'index idx_products_active)
```

**Réponse JSON :**

```json
{
  "content": [
    {"id": 1, "name": "Laptop Pro", "price": 999.99, "active": true},
    {"id": 2, "name": "Mouse Wireless", "price": 19.99, "active": true}
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "orders": [{"property": "createdAt", "direction": "DESC"}]
    }
  },
  "totalElements": 50000,
  "totalPages": 2500,
  "first": true,
  "last": false,
  "numberOfElements": 20
}
```

---

## 🔍 Partie 6 : Optimiser la recherche full-text (20 min)

### Étape 6.1 : Problème - Recherche LIKE lente

**Code actuel :**

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // ❌ LIKE est très lent (Seq Scan)
    List<Product> findByNameContainingIgnoreCase(String keyword);
}
```

**SQL généré :**

```sql
SELECT * FROM products
WHERE LOWER(name) LIKE LOWER('%laptop%');

-- Seq Scan: 450ms (balaye toute la table)
-- Ne peut PAS utiliser d'index B-tree standard
```

**Test :**

```bash
time curl "http://localhost:8080/api/products/search?q=laptop"

# Résultat : 450ms (trop lent)
```

---

### Étape 6.2 : Solution avec index GIN trigram

**L'index a déjà été créé dans V6__add_indexes.sql :**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_gin ON products USING GIN (name gin_trgm_ops);
```

**Repository optimisé :**

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // ✅ Utilise l'index GIN trigram
    @Query(value = "SELECT * FROM products " +
                   "WHERE name ILIKE %:keyword% " +
                   "ORDER BY created_at DESC " +
                   "LIMIT 50",
           nativeQuery = true)
    List<Product> searchByName(@Param("keyword") String keyword);
}
```

**Controller :**

```java
@GetMapping("/search")
public List<ProductDTO> searchProducts(@RequestParam String q) {
    List<Product> products = productRepository.searchByName(q);
    return products.stream()
        .map(ProductDTO::fromProduct)
        .toList();
}
```

**Test :**

```bash
time curl "http://localhost:8080/api/products/search?q=laptop"

# Résultat : 15ms (au lieu de 450ms)
# Gain : 450ms → 15ms = 97% plus rapide !
```

**Vérifiez avec EXPLAIN ANALYZE :**

```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE name ILIKE '%laptop%';

-- Résultat :
-- Bitmap Index Scan on idx_products_name_gin
-- Execution Time: 15.234 ms
```

---

## 📊 Partie 7 : Mesurer l'impact (15 min)

### Étape 7.1 : Créer un rapport de performance

**Créez `docs/tp4/performance-report.md` :**

```markdown
# Rapport d'optimisation SQL - TP 4.1

**Date :** [DATE]
**Réalisé par :** [VOTRE NOM]

---

## Résumé exécutif

Suite aux optimisations SQL réalisées (JOIN FETCH, indexation, pagination), les performances de GlowCommerce ont été **améliorées de 95% en moyenne**.

**Impact Black Friday :**
- ✅ Latence moyenne : 2.5s → 120ms (-95%)
- ✅ Capacité : 100 req/s → 2000 req/s (+1900%)
- ✅ Taux d'erreur : 15% → 0%

---

## Détail des optimisations

### 1. Résolution N+1 queries

| Endpoint | Avant | Après | Gain | Méthode |
|----------|-------|-------|------|---------|
| GET /api/orders | 1010ms | 50ms | **-95%** | JOIN FETCH |
| GET /api/orders/{id} | 850ms | 45ms | **-95%** | JOIN FETCH |

**Explication :**
- Problème : 1 + N requêtes (101 requêtes pour 100 commandes)
- Solution : JOIN FETCH → 1 seule requête
- Code : `@Query("SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.userId = :userId")`

---

### 2. Indexation stratégique

| Requête | Avant | Après | Gain | Index créé |
|---------|-------|-------|------|-----------|
| WHERE category_id = 5 | 125ms | 1.5ms | **-99%** | idx_products_category_id |
| WHERE user_id = 42 | 50ms | 2ms | **-96%** | idx_orders_user_id |
| WHERE name ILIKE '%laptop%' | 450ms | 15ms | **-97%** | idx_products_name_gin |

**Nombre d'index créés :** 18
**Taille totale des index :** 42 MB
**Gain moyen :** 98%

---

### 3. Pagination

| Endpoint | Avant | Après | Gain |
|----------|-------|-------|------|
| GET /api/products | Timeout (OutOfMemoryError) | 120ms | **✅ Résolu** |
| GET /api/orders | Timeout | 100ms | **✅ Résolu** |

**Problème résolu :** Chargement de 50 000 produits en mémoire → `OutOfMemoryError`
**Solution :** Pagination avec `Pageable` (20 résultats par page)

---

## Résultats globaux

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Latence moyenne | 2500ms | 120ms | **-95%** |
| P95 latency | 5000ms | 250ms | **-95%** |
| Throughput | 100 req/s | 2000 req/s | **+1900%** |
| Taux d'erreur | 15% (timeouts) | 0% | **-100%** |
| Utilisation CPU | 85% | 35% | **-50%** |
| Utilisation RAM | 90% (OutOfMemory) | 45% | **-50%** |

---

## Commandes SQL exécutées

```sql
-- Index B-tree (colonnes fréquentes)
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Index composite
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Index partiel
CREATE INDEX idx_products_active ON products(category_id, price) WHERE active = true;

-- Index GIN (full-text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_gin ON products USING GIN (name gin_trgm_ops);

-- Statistiques
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
```

---

## Preuves (screenshots)

### EXPLAIN ANALYZE - AVANT optimisation

```
Seq Scan on products  (cost=0.00..2234.56 rows=100 width=128) (actual time=0.123..124.234 rows=100 loops=1)
  Filter: (category_id = 5)
  Rows Removed by Filter: 49900
Execution Time: 125.123 ms
```

### EXPLAIN ANALYZE - APRÈS optimisation

```
Index Scan using idx_products_category_id on products  (cost=0.42..12.56 rows=100 width=128) (actual time=0.034..1.123 rows=100 loops=1)
  Index Cond: (category_id = 5)
Execution Time: 1.456 ms
```

**Gain : 125ms → 1.5ms = 99% plus rapide**

---

## Conclusion

**Objectif Black Friday atteint :**
- ✅ Latence < 200ms : **ATTEINT** (120ms)
- ✅ 10 000 utilisateurs simultanés : **ATTEINT** (capacité 15 000)
- ✅ Zéro timeout : **ATTEINT** (0% erreur)

**GlowCommerce est prêt pour le Black Friday ! 🚀**
```

---

### Étape 7.2 : Tests de performance avec JMeter

**Créez `docs/tp4/jmeter-test-plan.jmx` :**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.5">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="GlowCommerce Performance Test">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Black Friday Load">
        <intProp name="ThreadGroup.num_threads">1000</intProp>
        <intProp name="ThreadGroup.ramp_time">60</intProp>
        <longProp name="ThreadGroup.duration">300</longProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /api/products">
          <stringProp name="HTTPSampler.domain">localhost</stringProp>
          <stringProp name="HTTPSampler.port">8080</stringProp>
          <stringProp name="HTTPSampler.path">/api/products?page=0&size=20</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

**Exécutez JMeter :**

```bash
# Installer JMeter
brew install jmeter  # macOS

# Exécuter le test
jmeter -n -t docs/tp4/jmeter-test-plan.jmx -l docs/tp4/results.jtl

# Générer le rapport
jmeter -g docs/tp4/results.jtl -o docs/tp4/jmeter-report/
```

**Résultats attendus :**

```
Summary Report:
- Samples: 10000
- Average: 120ms
- Min: 45ms
- Max: 350ms
- Throughput: 2000 req/sec
- Error %: 0%
```

---

## 📊 Livrables attendus

À la fin du TP, vous devez avoir :

1. **Code corrigé :**
   - `OrderRepository.java` avec `findByUserIdWithItems()` (JOIN FETCH)
   - `ProductController.java` avec pagination (Pageable)
   - `ProductRepository.java` avec recherche optimisée

2. **Migration SQL :**
   - `V6__add_indexes.sql` avec 18 index stratégiques

3. **Rapport de performance :**
   - `docs/tp4/performance-report.md` avec métriques avant/après

4. **Preuves :**
   - Screenshots EXPLAIN ANALYZE (avant/après)
   - Logs Hibernate montrant 1 seule requête au lieu de N+1
   - Résultats JMeter

---

## 🎯 Critères d'évaluation

| Critère | Points | Détails |
|---------|--------|---------|
| N+1 queries résolu sur GET /api/orders | 15 | JOIN FETCH implémenté, 1 seule requête visible dans les logs |
| N+1 queries résolu sur GET /api/orders/{id} | 10 | JOIN FETCH sur order_items |
| Index créés (minimum 8) | 20 | B-tree, GIN, composite, partiel |
| EXPLAIN ANALYZE utilisé correctement | 15 | Screenshots avant/après avec interprétation |
| Pagination implémentée sur tous les endpoints | 15 | Pageable + tests de pagination |
| Recherche full-text optimisée (GIN) | 10 | Index GIN + tests < 20ms |
| Rapport de performance complet | 15 | Métriques avant/après, gains calculés, preuves |
| **TOTAL** | **100** | |

---

## 🔗 Ressources complémentaires

- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Use The Index, Luke!](https://use-the-index-luke.com/) - Guide complet sur les index SQL
- [Hibernate Performance Tuning](https://vladmihalcea.com/tutorials/hibernate/)
- [Spring Data JPA Query Methods](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#jpa.query-methods)
- MODULE-4-SLIDE-1 (référence du cours)

---

**Bon courage pour le Black Friday ! 🚀**
