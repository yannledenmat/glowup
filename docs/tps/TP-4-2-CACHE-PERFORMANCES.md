# TP 4.2 : Implémentation d'une stratégie de cache multi-niveaux

**Module :** Optimisation des performances
**Durée :** 1h30
**Niveau :** Avancé

---

## Contexte métier

Malgré les optimisations SQL, certains endpoints restent sollicités massivement avec les mêmes données (catalogue produits, catégories). Vous devez implémenter un système de cache multi-niveaux pour réduire la charge sur la base de données.

---

## Objectifs du TP

1. ✅ Implémenter un cache L1 (Caffeine, in-memory)
2. ✅ Implémenter un cache L2 (Redis, distribué)
3. ✅ Mesurer le hit rate du cache
4. ✅ Configurer des stratégies d'invalidation
5. ✅ Optimiser les performances avec compression HTTP

---

## Énoncé détaillé

### Partie 1 : Cache L1 avec Caffeine (25 min)

**Tâches :**

1. Ajoutez les dépendances Maven :
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

2. Configurez Caffeine :
```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
            "products", "categories", "productDetails"
        );

        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)  // Max 1000 entrées
            .expireAfterWrite(5, TimeUnit.MINUTES)  // TTL 5 min
            .recordStats());  // Activer les stats (hit rate)

        return cacheManager;
    }
}
```

3. Annotez les méthodes à mettre en cache :
```java
@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public ProductDTO getProductById(Long id) {
        log.info("Cache MISS - Fetching product {} from DB", id);
        return productRepository.findById(id)
            .map(ProductDTO::fromEntity)
            .orElseThrow(() -> new NotFoundException("Product not found"));
    }

    @Cacheable(value = "products", key = "'all'")
    public List<ProductDTO> getAllProducts() {
        log.info("Cache MISS - Fetching all products from DB");
        return productRepository.findAll().stream()
            .map(ProductDTO::fromEntity)
            .collect(Collectors.toList());
    }

    @CacheEvict(value = "products", key = "#id")
    public ProductDTO updateProduct(Long id, ProductDTO dto) {
        log.info("Cache EVICTED for product {}", id);
        Product product = productRepository.findById(id).orElseThrow();
        // ... mise à jour
        productRepository.save(product);
        return ProductDTO.fromEntity(product);
    }

    @CacheEvict(value = "products", allEntries = true)
    public void clearAllProductsCache() {
        log.info("All products cache cleared");
    }
}
```

4. Testez le cache :
```bash
# Requête 1 : Cache MISS (log "Fetching from DB")
time curl http://localhost:8080/api/products/1
# Temps : 120ms

# Requête 2 : Cache HIT (pas de log)
time curl http://localhost:8080/api/products/1
# Temps : 5ms ← 95% plus rapide !
```

---

### Partie 2 : Mesurer le hit rate (15 min)

**Tâches :**

Créez un endpoint pour consulter les statistiques de cache :

```java
@RestController
@RequestMapping("/api/admin/cache")
public class CacheStatsController {

    @Autowired
    private CacheManager cacheManager;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, CacheStats>> getCacheStats() {
        Map<String, CacheStats> stats = new HashMap<>();

        cacheManager.getCacheNames().forEach(cacheName -> {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache instanceof CaffeineCache) {
                com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache =
                    (com.github.benmanes.caffeine.cache.Cache<Object, Object>)
                    ((CaffeineCache) cache).getNativeCache();

                com.github.benmanes.caffeine.cache.stats.CacheStats caffeineStats = nativeCache.stats();

                CacheStats statsDTO = new CacheStats();
                statsDTO.setHitCount(caffeineStats.hitCount());
                statsDTO.setMissCount(caffeineStats.missCount());
                statsDTO.setHitRate(caffeineStats.hitRate() * 100);
                statsDTO.setEvictionCount(caffeineStats.evictionCount());
                statsDTO.setLoadSuccessCount(caffeineStats.loadSuccessCount());

                stats.put(cacheName, statsDTO);
            }
        });

        return ResponseEntity.ok(stats);
    }
}

@Data
class CacheStats {
    private long hitCount;
    private long missCount;
    private double hitRate;  // Pourcentage
    private long evictionCount;
    private long loadSuccessCount;
}
```

**Test :**
```bash
# Faire plusieurs requêtes
for i in {1..100}; do
  curl -s http://localhost:8080/api/products/$((RANDOM % 50 + 1)) > /dev/null
done

# Consulter les stats
curl http://localhost:8080/api/admin/cache/stats
```

**
```json
{
  "products": {
    "hitCount": 85,
    "missCount": 15,
    "hitRate": 85.0,
    "evictionCount": 0,
    "loadSuccessCount": 15
  }
}
```

**Objectif hit rate : > 80%**

---

### Partie 3 : Cache L2 avec Redis (30 min)

**Tâches :**

1. Ajoutez Redis dans `docker-compose.yml` :
```yaml
redis:
  image: redis:7-alpine
  container_name: glowcommerce-redis
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
  networks:
    - backend

volumes:
  redis_data:
```

2. Ajoutez la dépendance :
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

3. Configurez Redis :
```yaml
# application.properties
spring.redis.host=redis
spring.redis.port=6379
spring.redis.timeout=2000ms
spring.cache.type=redis
spring.cache.redis.time-to-live=600000  # 10 minutes
```

```java
@Configuration
public class RedisCacheConfig {

    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .disableCachingNullValues()
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()
                )
            );
    }
}
```

4. Utilisez Redis pour les sessions utilisateurs :
```java
@Service
public class SessionService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    public void saveUserSession(String username, UserSession session) {
        String key = "session:" + username;
        redisTemplate.opsForValue().set(key, session, Duration.ofHours(24));
    }

    public UserSession getUserSession(String username) {
        String key = "session:" + username;
        return (UserSession) redisTemplate.opsForValue().get(key);
    }

    public void invalidateSession(String username) {
        String key = "session:" + username;
        redisTemplate.delete(key);
    }
}
```

---

### Partie 4 : Stratégies d'invalidation (15 min)

**Tâches :**

Implémentez 3 stratégies d'invalidation :

#### 1. Write-Through (invalidation immédiate)

```java
@CacheEvict(value = "products", key = "#id")
public ProductDTO updateProduct(Long id, ProductDTO dto) {
    // Mise à jour
    // Cache automatiquement invalidé
}
```

#### 2. Cache Stampede Protection

```java
@Cacheable(value = "products", key = "#id", sync = true)  // ✅ sync = true
public ProductDTO getProductById(Long id) {
    // Une seule requête DB, même avec 1000 requêtes simultanées
}
```

#### 3. Invalidation conditionnelle

```java
@CacheEvict(value = "products", key = "#product.id",
            condition = "#product.active == false")
public void updateProduct(Product product) {
    // Cache invalidé seulement si le produit est désactivé
}
```

---

### Partie 5 : Compression HTTP (10 min)

**Tâches :**

Activez la compression Gzip dans `application.properties` :

```properties
server.compression.enabled=true
server.compression.mime-types=application/json,application/xml,text/html,text/xml,text/plain,application/javascript,text/css
server.compression.min-response-size=1024  # Compresser si > 1 KB
```

**Test :**
```bash
# Sans compression
curl -s http://localhost:8080/api/products | wc -c
# Résultat : 45321 bytes

# Avec compression
curl -s -H "Accept-Encoding: gzip" http://localhost:8080/api/products | wc -c
# Résultat : 7834 bytes ← 82% de réduction !
```

---

### Partie 6 : Benchmark avant/après (5 min)

**Tâches :**

Créez un script de benchmark :

```bash
#!/bin/bash
# benchmark.sh

echo "=== Benchmark sans cache ==="
curl -s http://localhost:8080/api/admin/cache/clear  # Clear cache
time {
  for i in {1..100}; do
    curl -s http://localhost:8080/api/products/1 > /dev/null
  done
}

echo "=== Benchmark avec cache ==="
time {
  for i in {1..100}; do
    curl -s http://localhost:8080/api/products/1 > /dev/null
  done
}
```

**Résultats attendus :**
```
Sans cache : 12.5 secondes (125ms × 100)
Avec cache : 0.5 secondes (5ms × 100)
Gain : 96% plus rapide
```

---

## Critères de réussite

| Critère | Points |
|---------|--------|
| Cache L1 Caffeine configuré et fonctionnel | 20 |
| Méthodes annotées @Cacheable correctement | 15 |
| Hit rate > 80% | 15 |
| Cache L2 Redis implémenté | 20 |
| Stratégies d'invalidation (3 types) | 15 |
| Compression HTTP activée | 10 |
| Benchmark montrant gains de performance | 5 |
| **TOTAL** | **100** |

---

## Livrables attendus

1. **Configuration** : `CacheConfig.java` et `RedisCacheConfig.java`
2. **Services** : Méthodes avec annotations cache
3. **Tests** : `CacheTest.java` validant le hit rate
4. **Rapport** : `cache-performance-report.md` avec benchmarks

---

## Tests de validation

### Test 1 : Cache fonctionne

```bash
# 1ère requête : Log "Cache MISS"
curl http://localhost:8080/api/products/1

# 2ème requête : Pas de log (Cache HIT)
curl http://localhost:8080/api/products/1
```

### Test 2 : Invalidation fonctionne

```bash
# Mettre en cache
curl http://localhost:8080/api/products/1

# Modifier le produit
curl -X PUT http://localhost:8080/api/admin/products/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "price": 99.99}'

# Requête suivante : Cache MISS (cache invalidé)
curl http://localhost:8080/api/products/1
```

### Test 3 : Hit rate > 80%

```bash
# Générer du trafic
for i in {1..100}; do
  curl -s http://localhost:8080/api/products/$((RANDOM % 20 + 1)) > /dev/null
done

# Vérifier hit rate
curl http://localhost:8080/api/admin/cache/stats | jq '.products.hitRate'
# Attendu : > 80.0
```

---

## Compétences mobilisées

- **C19** : Optimisation (cache multi-niveaux, compression)
- **C6** : Architecture (stratégie de cache)
- **C8** : Tests de performance (benchmarks)

---

## Bonus (facultatif)

1. **Cache warming** : Pré-charger le cache au démarrage
2. **Cache aside pattern** : Gérer manuellement le cache
3. **Distributed lock** : Éviter les race conditions avec Redis
4. **Cache monitoring** : Dashboard Grafana pour hit rate

---

**Bon courage !** 🚀
