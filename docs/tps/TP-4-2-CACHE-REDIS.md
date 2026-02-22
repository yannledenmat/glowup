# TP 4.2 : Cache multi-niveaux avec Caffeine et Redis

**Module :** Optimisation des performances
**Durée :** 1h30
**Niveau :** Intermédiaire
**Prérequis :** MODULE-4-SLIDE-2 (Cache multi-niveaux et optimisation des performances)

---

## 🎯 Contexte métier

Suite aux optimisations SQL du TP 4.1, GlowCommerce a gagné **95% de performance**. Cependant, lors des tests de charge Black Friday, un nouveau problème apparaît :

**Extrait du test de charge (10 000 utilisateurs simultanés) :**
```
🔴 ALERTE - Base de données saturée

Problèmes identifiés :
1. PostgreSQL à 95% CPU (6000 connexions/sec)
2. GET /api/products/{id} : 50ms (optimisé avec index) mais appelé 50 000 fois/min
3. GET /api/categories : 15ms mais données identiques lues 100 000 fois/min
4. Base de données = goulot d'étranglement (bottleneck)

Calcul :
- 50 000 requêtes/min × 50ms = 2 500 000ms = 41 minutes de CPU/minute
- CPU disponible : 4 cores = 4 minutes de CPU/minute
- Ratio : 41 / 4 = 10x trop de charge !

Conséquence : PostgreSQL sature → Timeouts → Site inaccessible

Solution : CACHE pour réduire la charge DB de 99%
```

Vous devez **implémenter un cache multi-niveaux** pour réduire la charge sur PostgreSQL avant le Black Friday.

---

## 📋 Objectifs du TP

À la fin de ce TP, vous aurez :

1. ✅ **Configuré** Caffeine (L1 - cache local en mémoire)
2. ✅ **Configuré** Redis (L2 - cache distribué)
3. ✅ **Implémenté** @Cacheable/@CacheEvict/@CachePut sur 3 services
4. ✅ **Activé** Gzip compression
5. ✅ **Configuré** HikariCP connection pooling
6. ✅ **Mesuré** le cache hit rate avec des métriques Prometheus
7. ✅ **Créé** un dashboard Grafana "Cache Performance"

---

## 🏗️ Architecture cache multi-niveaux

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT                           │
│                 (Browser/Mobile)                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓ HTTP Request (GET /api/products/42)
┌─────────────────────────────────────────────────────┐
│              SPRING BOOT BACKEND                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  L1 CACHE (Caffeine)                         │  │
│  │  - En mémoire (JVM heap)                     │  │
│  │  - Ultra rapide (< 1ms)                      │  │
│  │  - TTL : 5 minutes                           │  │
│  │  - Taille : 1000 entrées                     │  │
│  │  - Hit rate : 90% après warmup               │  │
│  └──────────────────────────────────────────────┘  │
│                   ↓ Cache MISS                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  L2 CACHE (Redis)                            │  │
│  │  - Réseau (hors JVM)                         │  │
│  │  - Rapide (< 10ms)                           │  │
│  │  - TTL : 1 heure                             │  │
│  │  - Partagé entre instances                   │  │
│  │  - Hit rate : 95% global                     │  │
│  └──────────────────────────────────────────────┘  │
│                   ↓ Cache MISS                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  DATABASE (PostgreSQL)                       │  │
│  │  - Requête SQL                               │  │
│  │  - Lent (50-200ms)                           │  │
│  │  - Sollicité seulement si cache miss         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Flux de données :**
1. **Cache hit L1** → 1ms (90% des cas après warmup)
2. **Cache miss L1, hit L2** → 10ms (9% des cas)
3. **Cache miss L1+L2** → 150ms (1% des cas, première fois)

**Gain attendu :**
- 90% des requêtes : 150ms → 1ms = **99% plus rapide**
- Charge DB : 6000 req/s → 60 req/s = **99% de réduction**

---

## 🍃 Partie 1 : Cache local avec Caffeine (25 min)

### Étape 1.1 : Dépendances Maven

**Ajoutez dans `pom.xml` :**

```xml
<dependencies>
    <!-- Spring Cache abstraction -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>

    <!-- Caffeine cache -->
    <dependency>
        <groupId>com.github.ben-manes.caffeine</groupId>
        <artifactId>caffeine</artifactId>
    </dependency>

    <!-- Micrometer pour les métriques -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-core</artifactId>
    </dependency>
</dependencies>
```

**Reconstruisez le backend :**

```bash
docker-compose down
docker-compose build backend
docker-compose up -d
```

---

### Étape 1.2 : Configuration Caffeine

**Créez `src/main/java/com/glowcommerce/config/CacheConfig.java` :**

```java
package com.glowcommerce.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching  // ✅ Activer le cache Spring
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
            "products",      // Cache des produits
            "categories",    // Cache des catégories
            "users"          // Cache des utilisateurs
        );

        // Configuration Caffeine
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)                      // Max 1000 entrées en mémoire
            .expireAfterWrite(5, TimeUnit.MINUTES)  // TTL = 5 minutes
            .recordStats()                          // ✅ Activer les statistiques (hit rate)
        );

        return cacheManager;
    }
}
```

---

### Étape 1.3 : Utilisation avec @Cacheable

**Service ProductService avec cache :**

**Créez `src/main/java/com/glowcommerce/service/ProductService.java` :**

```java
package com.glowcommerce.service;

import com.glowcommerce.dto.ProductDTO;
import com.glowcommerce.model.Product;
import com.glowcommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;

    /**
     * ✅ @Cacheable : Met en cache le résultat
     * - value : Nom du cache
     * - key : Clé (ex: "product::42")
     * - unless : Condition pour NE PAS mettre en cache
     */
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public ProductDTO getProduct(Long id) {
        log.info("🔴 Cache MISS for product {}, fetching from DB", id);

        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException("Product not found: " + id));

        return ProductDTO.fromProduct(product);
    }

    /**
     * ✅ @CachePut : Met à jour le cache après l'exécution
     * Utilisé pour UPDATE
     */
    @CachePut(value = "products", key = "#id")
    @Transactional
    public ProductDTO updateProduct(Long id, UpdateProductRequest request) {
        log.info("📝 Updating product {} and refreshing cache", id);

        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException("Product not found: " + id));

        product.setName(request.getName());
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());

        Product saved = productRepository.save(product);
        return ProductDTO.fromProduct(saved);
    }

    /**
     * ✅ @CacheEvict : Supprime l'entrée du cache
     * Utilisé pour DELETE
     */
    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public void deleteProduct(Long id) {
        log.info("🗑️ Deleting product {} and evicting from cache", id);
        productRepository.deleteById(id);
    }

    /**
     * ✅ @CacheEvict avec allEntries=true : Vide TOUT le cache
     */
    @CacheEvict(value = "products", allEntries = true)
    public void clearProductCache() {
        log.info("🧹 Clearing entire product cache");
    }

    /**
     * Cache des listes (par catégorie)
     */
    @Cacheable(value = "categories", key = "#categoryId")
    public List<ProductDTO> getProductsByCategory(Long categoryId) {
        log.info("🔴 Cache MISS for category {}, fetching from DB", categoryId);

        List<Product> products = productRepository.findByCategoryIdAndActiveTrue(categoryId);
        return products.stream()
            .map(ProductDTO::fromProduct)
            .toList();
    }
}
```

---

### Étape 1.4 : Test du cache L1

**Testez avec curl :**

```bash
# Se connecter
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!"
  }' | jq -r '.token')

# Première requête (CACHE MISS)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1

# Vérifier les logs
docker-compose logs backend --tail=10 | grep "Cache MISS"
# Output : 🔴 Cache MISS for product 1, fetching from DB
# Temps : ~50ms (requête DB)

# Deuxième requête (CACHE HIT)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1

# Vérifier les logs
docker-compose logs backend --tail=10 | grep "Cache"
# Pas de log "Cache MISS" → Cache HIT !
# Temps : ~1ms (cache mémoire)

# Troisième requête (toujours CACHE HIT)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1
# Temps : ~1ms
```

**✅ Gain : 50ms → 1ms = 98% plus rapide !**

---

## 🔴 Partie 2 : Cache distribué avec Redis (30 min)

### Étape 2.1 : Configuration Docker Compose

**Ajoutez Redis dans `docker-compose.yml` :**

```yaml
services:
  database:
    # ... configuration existante

  redis:
    image: redis:7-alpine
    container_name: glowcommerce-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-Redis123!}
    volumes:
      - redis_data:/data
    networks:
      - glowcommerce-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "Redis123!", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  backend:
    # ... configuration existante
    depends_on:
      - database
      - redis
    environment:
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
      - SPRING_DATA_REDIS_PASSWORD=Redis123!

volumes:
  postgres_data:
  redis_data:  # ✅ Nouveau volume

networks:
  glowcommerce-network:
    driver: bridge
```

---

### Étape 2.2 : Dépendances Maven pour Redis

**Ajoutez dans `pom.xml` :**

```xml
<dependencies>
    <!-- Spring Data Redis -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

    <!-- Lettuce (client Redis, inclus dans spring-boot-starter-data-redis) -->
</dependencies>
```

---

### Étape 2.3 : Configuration Spring Boot

**Ajoutez dans `application.properties` :**

```properties
# ========================================
# REDIS CONFIGURATION
# ========================================

# Connexion Redis
spring.data.redis.host=redis
spring.data.redis.port=6379
spring.data.redis.password=Redis123!
spring.data.redis.timeout=2000ms

# Pool de connexions Lettuce
spring.data.redis.lettuce.pool.max-active=8
spring.data.redis.lettuce.pool.max-idle=8
spring.data.redis.lettuce.pool.min-idle=2

# Cache Redis
spring.cache.type=redis
spring.cache.redis.time-to-live=3600000  # 1 heure en ms
spring.cache.redis.cache-null-values=false
```

---

### Étape 2.4 : Configuration multi-niveaux (Caffeine + Redis)

**Modifiez `CacheConfig.java` :**

```java
package com.glowcommerce.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * L1 Cache : Caffeine (local, ultra rapide)
     */
    @Bean("caffeineCacheManager")
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
            "products-l1",
            "categories-l1"
        );

        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .recordStats()
        );

        return cacheManager;
    }

    /**
     * L2 Cache : Redis (distribué, partagé)
     */
    @Bean("redisCacheManager")
    @Primary  // ✅ Cache par défaut
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        // Configuration par défaut
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1))  // TTL = 1 heure
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new StringRedisSerializer()
                )
            )
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()
                )
            )
            .disableCachingNullValues();  // Ne pas mettre en cache les null

        // Configuration spécifique par cache
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // Products : TTL = 30 minutes
        cacheConfigurations.put("products", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        // Categories : TTL = 1 heure
        cacheConfigurations.put("categories", defaultConfig.entryTtl(Duration.ofHours(1)));

        // Users : TTL = 15 minutes
        cacheConfigurations.put("users", defaultConfig.entryTtl(Duration.ofMinutes(15)));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigurations)
            .build();
    }
}
```

---

### Étape 2.5 : Redémarrer avec Redis

```bash
# Arrêter les services
docker-compose down

# Reconstruire le backend
docker-compose build backend

# Démarrer avec Redis
docker-compose up -d

# Vérifier que Redis fonctionne
docker-compose logs redis | grep "Ready to accept connections"

# Vérifier la connexion du backend à Redis
docker-compose logs backend | grep -i redis
```

---

### Étape 2.6 : Test du cache L2 (Redis)

**Test 1 : Vérifier dans Redis**

```bash
# Se connecter à Redis
docker exec -it glowcommerce-redis redis-cli -a Redis123!

# Voir toutes les clés
127.0.0.1:6379> KEYS *
(empty array)  # Normal, cache vide au démarrage

# Faire une requête HTTP
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1

# Revérifier les clés Redis
127.0.0.1:6379> KEYS *
1) "products::1"

# Voir la valeur (JSON)
127.0.0.1:6379> GET "products::1"
"{\"id\":1,\"name\":\"Laptop Pro\",\"price\":999.99,\"active\":true}"

# Voir le TTL (en secondes)
127.0.0.1:6379> TTL "products::1"
(integer) 1798  # Reste ~30 minutes

# Quitter
127.0.0.1:6379> exit
```

**Test 2 : Cache persistence entre redémarrages**

```bash
# Faire une requête (met en cache)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1
# Temps : 50ms (cache miss → DB)

# Redémarrer le backend (L1 perdu, L2 conservé)
docker-compose restart backend
sleep 10

# Refaire la requête
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1
# Temps : 10ms (cache hit L2 → Redis) au lieu de 50ms (DB)

# Vérifier les logs
docker-compose logs backend --tail=10
# Pas de "Cache MISS" → L2 a servi depuis Redis !
```

---

## 🔌 Partie 3 : Connection pooling avec HikariCP (15 min)

### Étape 3.1 : Configuration HikariCP

**Ajoutez dans `application.properties` :**

```properties
# ========================================
# HIKARICP CONNECTION POOLING
# ========================================

# Nom du pool
spring.datasource.hikari.pool-name=GlowCommercePool

# Taille du pool
spring.datasource.hikari.minimum-idle=5       # Connexions minimum
spring.datasource.hikari.maximum-pool-size=20 # Connexions maximum

# Timeouts
spring.datasource.hikari.connection-timeout=30000       # 30s pour obtenir une connexion
spring.datasource.hikari.idle-timeout=600000            # 10min avant de fermer une connexion idle
spring.datasource.hikari.max-lifetime=1800000           # 30min durée de vie max

# Leak detection (connexions non fermées)
spring.datasource.hikari.leak-detection-threshold=60000 # 60s (log si gardée trop longtemps)

# Health check
spring.datasource.hikari.connection-test-query=SELECT 1
```

---

### Étape 3.2 : Exposer les métriques HikariCP

**Ajoutez dans `application.properties` :**

```properties
# Métriques HikariCP
management.endpoints.web.exposure.include=health,metrics,prometheus
management.metrics.enable.hikaricp=true
```

**Testez les métriques :**

```bash
# Connexions actives
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq

# Connexions idle
curl http://localhost:8080/actuator/metrics/hikaricp.connections.idle | jq

# Temps d'attente pour obtenir une connexion
curl http://localhost:8080/actuator/metrics/hikaricp.connections.acquire | jq
```

---

## 📦 Partie 4 : Compression Gzip (10 min)

### Étape 4.1 : Configuration Gzip

**Ajoutez dans `application.properties` :**

```properties
# ========================================
# GZIP COMPRESSION
# ========================================

# Activer la compression Gzip
server.compression.enabled=true

# Taille minimum (compresser seulement si > 1 KB)
server.compression.min-response-size=1024

# MIME types à compresser
server.compression.mime-types=\
  application/json,\
  application/xml,\
  text/html,\
  text/xml,\
  text/plain,\
  text/css,\
  text/javascript,\
  application/javascript
```

---

### Étape 4.2 : Test de compression

**Sans compression :**

```bash
curl -i http://localhost:8080/api/products?page=0&size=20 | head -20

# HTTP/1.1 200
# Content-Type: application/json
# Content-Length: 5234  # 5 KB
```

**Avec compression :**

```bash
curl -i -H "Accept-Encoding: gzip" http://localhost:8080/api/products?page=0&size=20 | head -20

# HTTP/1.1 200
# Content-Type: application/json
# Content-Encoding: gzip
# Content-Length: 523  # 523 bytes (90% réduction)
```

**Gain : 5234 bytes → 523 bytes = 90% de réduction**

---

## 📊 Partie 5 : Métriques du cache avec Prometheus (15 min)

### Étape 5.1 : Endpoint de statistiques du cache

**Créez `src/main/java/com/glowcommerce/controller/CacheStatsController.java` :**

```java
package com.glowcommerce.controller;

import com.github.benmanes.caffeine.cache.stats.CacheStats;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cache")
@RequiredArgsConstructor
public class CacheStatsController {

    private final CacheManager cacheManager;

    /**
     * Statistiques du cache Caffeine
     */
    @GetMapping("/stats")
    public Map<String, Object> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();

        cacheManager.getCacheNames().forEach(cacheName -> {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);

            if (cache instanceof CaffeineCache) {
                CaffeineCache caffeineCache = (CaffeineCache) cache;
                com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache =
                    caffeineCache.getNativeCache();

                CacheStats cacheStats = nativeCache.stats();

                Map<String, Object> cacheData = new HashMap<>();
                cacheData.put("hitCount", cacheStats.hitCount());
                cacheData.put("missCount", cacheStats.missCount());
                cacheData.put("hitRate", cacheStats.hitRate());
                cacheData.put("evictionCount", cacheStats.evictionCount());
                cacheData.put("averageLoadPenalty", cacheStats.averageLoadPenalty() / 1_000_000 + "ms");

                stats.put(cacheName, cacheData);
            }
        });

        return stats;
    }

    /**
     * Vider tous les caches
     */
    @DeleteMapping("/clear")
    public Map<String, String> clearAllCaches() {
        cacheManager.getCacheNames().forEach(cacheName -> {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        });

        return Map.of("status", "All caches cleared");
    }
}
```

**Testez :**

```bash
# Faire 100 requêtes pour générer des stats
for i in {1..100}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/products/1 > /dev/null
done

# Voir les statistiques
curl http://localhost:8080/api/admin/cache/stats | jq

# Résultat attendu :
# {
#   "products": {
#     "hitCount": 99,
#     "missCount": 1,
#     "hitRate": 0.99,
#     "evictionCount": 0,
#     "averageLoadPenalty": "50ms"
#   }
# }
```

**✅ Hit rate de 99% = Excellent cache !**

---

### Étape 5.2 : Métriques Prometheus

**Ajoutez des métriques custom dans ProductService :**

```java
package com.glowcommerce.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final Counter cacheHitCounter;
    private final Counter cacheMissCounter;

    public ProductService(ProductRepository productRepository, MeterRegistry meterRegistry) {
        this.productRepository = productRepository;

        // ✅ Compteurs pour cache hit/miss
        this.cacheHitCounter = Counter.builder("glowcommerce.cache.hit")
            .description("Cache hit count")
            .tag("cache", "products")
            .register(meterRegistry);

        this.cacheMissCounter = Counter.builder("glowcommerce.cache.miss")
            .description("Cache miss count")
            .tag("cache", "products")
            .register(meterRegistry);
    }

    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public ProductDTO getProduct(Long id) {
        // Incrémenter le compteur de cache miss
        cacheMissCounter.increment();
        log.info("🔴 Cache MISS for product {}", id);

        Product product = productRepository.findById(id).orElseThrow();
        return ProductDTO.fromProduct(product);
    }
}
```

**Exposez les métriques Prometheus :**

```bash
# Voir les métriques Prometheus
curl http://localhost:8080/actuator/prometheus | grep glowcommerce_cache

# Résultat :
# glowcommerce_cache_hit_total{cache="products",} 950.0
# glowcommerce_cache_miss_total{cache="products",} 50.0
```

---

## 📈 Partie 6 : Dashboard Grafana "Cache Performance" (10 min)

### Étape 6.1 : Requêtes PromQL

**1. Cache hit rate :**

```promql
# Hit rate (pourcentage de cache hits)
(
  sum(rate(glowcommerce_cache_hit_total[5m]))
  /
  (sum(rate(glowcommerce_cache_hit_total[5m])) + sum(rate(glowcommerce_cache_miss_total[5m])))
) * 100
```

**2. Nombre de cache hits/misses :**

```promql
# Cache hits par seconde
rate(glowcommerce_cache_hit_total[1m])

# Cache misses par seconde
rate(glowcommerce_cache_miss_total[1m])
```

**3. Latence des requêtes :**

```promql
# Latence P95
histogram_quantile(0.95,
  rate(http_server_requests_seconds_bucket{uri="/api/products/{id}"}[5m])
)
```

**4. Connexions HikariCP :**

```promql
# Connexions actives
hikaricp_connections_active{pool="GlowCommercePool"}

# Connexions idle
hikaricp_connections_idle{pool="GlowCommercePool"}
```

---

### Étape 6.2 : Créer le dashboard Grafana

**Connectez-vous à Grafana :**

```bash
open http://localhost:3001
# Login : admin / Admin123!
```

**Créez un nouveau dashboard "Cache Performance" :**

**Panel 1 : Cache Hit Rate**
- Type : Gauge
- Query : `(sum(rate(glowcommerce_cache_hit_total[5m])) / (sum(rate(glowcommerce_cache_hit_total[5m])) + sum(rate(glowcommerce_cache_miss_total[5m])))) * 100`
- Thresholds :
  - 0-70% : Red
  - 70-90% : Yellow
  - 90-100% : Green

**Panel 2 : Cache Hits vs Misses**
- Type : Time series
- Queries :
  - `rate(glowcommerce_cache_hit_total[1m])` (Hits)
  - `rate(glowcommerce_cache_miss_total[1m])` (Misses)

**Panel 3 : Latence P95**
- Type : Time series
- Query : `histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{uri="/api/products/{id}"}[5m]))`

**Panel 4 : HikariCP Connections**
- Type : Time series
- Queries :
  - `hikaricp_connections_active{pool="GlowCommercePool"}`
  - `hikaricp_connections_idle{pool="GlowCommercePool"}`

---

## 📊 Partie 7 : Mesurer les gains de performance (10 min)

### Étape 7.1 : Benchmark avant/après

**AVANT cache (TP 4.1 uniquement) :**

```bash
# Test de charge avec ApacheBench
ab -n 10000 -c 100 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1

# Résultats :
# Requests per second: 200 req/sec
# Time per request: 50ms (mean)
# Time per request: 500ms (mean, across all concurrent requests)
```

**APRÈS cache (TP 4.2) :**

```bash
# Même test
ab -n 10000 -c 100 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products/1

# Résultats :
# Requests per second: 10000 req/sec (50x amélioration)
# Time per request: 1ms (mean) (50x plus rapide)
# Time per request: 10ms (mean, across all concurrent requests)
```

**Gain :**
- Throughput : 200 → 10000 req/s = **50x amélioration**
- Latence : 50ms → 1ms = **98% plus rapide**
- Charge DB : 200 → 2 req/s = **99% de réduction**

---

### Étape 7.2 : Rapport de performance

**Créez `docs/tp4/cache-performance-report.md` :**

```markdown
# Rapport de performance - Cache multi-niveaux

**Date :** [DATE]
**Réalisé par :** [VOTRE NOM]

---

## Résumé exécutif

Suite à l'implémentation du cache multi-niveaux (Caffeine L1 + Redis L2), les performances de GlowCommerce ont été **améliorées de 98%**.

**Impact Black Friday :**
- ✅ Latence moyenne : 50ms → 1ms (-98%)
- ✅ Throughput : 200 req/s → 10 000 req/s (+4900%)
- ✅ Charge DB : 200 req/s → 2 req/s (-99%)
- ✅ CPU PostgreSQL : 95% → 5% (-90%)

---

## Architecture implémentée

```
Client → L1 Cache (Caffeine) → L2 Cache (Redis) → PostgreSQL
         90% hit (1ms)          9% hit (10ms)      1% miss (50ms)
```

---

## Métriques

### Cache hit rate

| Cache | Hit rate | Hit count | Miss count |
|-------|----------|-----------|------------|
| Products (L1) | 90% | 9000 | 1000 |
| Products (L2) | 95% | 950 | 50 |
| **Global** | **99.5%** | **9950** | **50** |

### Latence

| Scénario | Avant | Après | Gain |
|----------|-------|-------|------|
| Cache hit L1 | - | 1ms | - |
| Cache hit L2 | - | 10ms | - |
| Cache miss (DB) | 50ms | 50ms | 0% |
| **Moyenne pondérée** | **50ms** | **1.5ms** | **-97%** |

Calcul : (0.9 × 1ms) + (0.09 × 10ms) + (0.01 × 50ms) = 1.5ms

### Charge base de données

| Métrique | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| Requêtes/sec | 6000 | 60 | **-99%** |
| CPU PostgreSQL | 95% | 5% | **-90%** |
| Connexions actives | 200 | 20 | **-90%** |

---

## Configuration

### Caffeine (L1)
- Maximum size : 1000 entrées
- TTL : 5 minutes
- Éviction : LRU

### Redis (L2)
- TTL : 30 minutes (products), 1h (categories)
- Persistence : AOF
- Mémoire : 256 MB

### HikariCP
- Pool size : 20 connexions
- Idle timeout : 10 minutes

### Gzip
- Taille minimale : 1 KB
- Réduction moyenne : 90%

---

## Conclusion

**Objectif Black Friday atteint :**
- ✅ Latence < 5ms : **ATTEINT** (1.5ms)
- ✅ 10 000 req/s : **ATTEINT** (capacité réelle : 10 000 req/s)
- ✅ Réduction charge DB : **ATTEINT** (99%)

**GlowCommerce peut gérer le Black Friday ! 🚀**
```

---

## 📊 Livrables attendus

À la fin du TP, vous devez avoir :

1. **Configuration du cache :**
   - `CacheConfig.java` avec Caffeine et Redis
   - `application.properties` avec HikariCP et Gzip

2. **Services annotés :**
   - `ProductService.java` avec @Cacheable/@CacheEvict/@CachePut
   - `CategoryService.java` avec cache
   - `UserService.java` avec cache

3. **Métriques :**
   - `CacheStatsController.java` avec endpoint /api/admin/cache/stats
   - Métriques Prometheus exposées

4. **Dashboard Grafana :**
   - "Cache Performance" avec 4 panels
   - Alertes configurées si hit rate < 80%

5. **Rapport :**
   - `docs/tp4/cache-performance-report.md` avec gains mesurés

---

## 🎯 Critères d'évaluation

| Critère | Points | Détails |
|---------|--------|---------|
| Caffeine (L1) configuré | 15 | TTL 5 min, max 1000, stats activés |
| Redis (L2) configuré | 15 | TTL 30 min, sérialisation JSON |
| @Cacheable implémenté sur 3 services | 20 | Products, Categories, Users |
| Gzip activé | 10 | Compression fonctionnelle, gain mesuré |
| HikariCP configuré | 10 | Pool size 20, métriques exposées |
| Dashboard Grafana "Cache Performance" | 15 | 4 panels, hit rate, latence, HikariCP |
| Rapport avec gains mesurés | 15 | Avant/après, hit rate, charge DB |
| **TOTAL** | **100** | |

---

## 🔗 Ressources complémentaires

- [Caffeine GitHub](https://github.com/ben-manes/caffeine)
- [Spring Cache Abstraction](https://docs.spring.io/spring-framework/reference/integration/cache.html)
- [Redis Documentation](https://redis.io/docs/)
- [HikariCP Configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)
- MODULE-4-SLIDE-2 (référence du cours)

---

**Bon courage pour le Black Friday ! 🚀**
