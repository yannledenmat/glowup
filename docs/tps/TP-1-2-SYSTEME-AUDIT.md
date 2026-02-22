# TP 1.2 : Implémentation d'un système d'audit complet et conformité RGPD

**Module :** Sécurité des systèmes et bases de données
**Durée :** 1h30
**Niveau :** Avancé
**Prérequis :** MODULE-1-SLIDE-2 (Logs d'audit et RGPD)

---

## 🎯 Contexte métier

Suite au TP 1.1, la base de données GlowCommerce est maintenant sécurisée. Cependant, l'audit de sécurité a révélé un **problème de conformité RGPD critique** :

**Extrait du rapport d'audit :**
```
🔴 NON-CONFORME RGPD - Risque d'amende : 20M€ ou 4% du CA

Problèmes identifiés :
1. Aucune traçabilité des accès aux données personnelles
2. Impossible de répondre aux demandes d'accès (Article 15 RGPD)
3. Pas d'audit trail pour le droit à l'oubli (Article 17)
4. Aucun log des modifications de données sensibles
5. Impossible de détecter une fuite de données a posteriori

Cas d'usage critique :
- Client demande : "Qui a accédé à mes données dans les 6 derniers mois ?"
- Réponse actuelle : "Nous ne savons pas" → NON-CONFORME

CNIL peut sanctionner à tout moment.
```

Vous devez **implémenter un système d'audit complet** permettant de :
- Tracer toutes les actions sensibles (CREATE, READ, UPDATE, DELETE)
- Répondre aux demandes d'accès RGPD
- Détecter les intrusions et comportements anormaux

---

## 📋 Objectifs du TP

À la fin de ce TP, vous aurez :

1. ✅ **Créé** la table `audit_logs` avec index optimisés
2. ✅ **Implémenté** un service d'audit avec `@Async`
3. ✅ **Créé** l'annotation `@Auditable` avec Spring AOP
4. ✅ **Loggé** automatiquement les opérations CRUD
5. ✅ **Implémenté** les endpoints RGPD (accès, oubli, portabilité)
6. ✅ **Testé** la conformité avec des scénarios réels

---

## 🗄️ Partie 1 : Table d'audit avec JSONB (20 min)

### Étape 1.1 : Migration Flyway

**Créez `src/main/resources/db/migration/V6__create_audit_table.sql` :**

```sql
-- ========================================
-- TP 1.2 : Table d'audit applicative
-- ========================================

CREATE TABLE audit_logs (
    -- Clé primaire
    id BIGSERIAL PRIMARY KEY,

    -- Horodatage (automatique)
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Utilisateur de l'application (pas l'user DB)
    user_id BIGINT,
    username VARCHAR(255),
    user_email VARCHAR(255),

    -- Action effectuée
    action VARCHAR(50) NOT NULL,
    -- Exemples : LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW

    -- Type d'entité et ID
    entity_type VARCHAR(100),
    -- Exemples : User, Product, Order, OrderItem
    entity_id BIGINT,

    -- Valeurs avant/après (JSON)
    old_values JSONB,
    new_values JSONB,

    -- Contexte réseau
    ip_address VARCHAR(45),  -- IPv6 = max 45 car.
    user_agent TEXT,

    -- Statut de l'opération
    status VARCHAR(20),
    -- SUCCESS, FAILED, UNAUTHORIZED

    -- Détails supplémentaires
    details TEXT,

    -- Endpoint API appelé (optionnel)
    endpoint VARCHAR(255)
);

-- ========================================
-- INDEX POUR PERFORMANCES
-- ========================================

-- Index sur timestamp (requêtes chronologiques)
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- Index sur user_id (logs d'un utilisateur)
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);

-- Index sur username
CREATE INDEX idx_audit_username ON audit_logs(username);

-- Index sur action (filtrer par type)
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Index composite pour recherches d'entité
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Index sur status (filtrer échecs)
CREATE INDEX idx_audit_status ON audit_logs(status);

-- Index composite pour recherches complexes
CREATE INDEX idx_audit_user_action_time
  ON audit_logs(user_id, action, timestamp DESC);

-- ========================================
-- PERMISSIONS
-- ========================================

-- glowcommerce_app peut INSERT et SELECT ses propres logs
GRANT INSERT, SELECT ON audit_logs TO glowcommerce_app;

-- glowcommerce_readonly peut voir tous les logs (BI/reporting)
GRANT SELECT ON audit_logs TO glowcommerce_readonly;

-- Séquence
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO glowcommerce_app;

-- ========================================
-- COMMENTAIRES DOCUMENTATION
-- ========================================

COMMENT ON TABLE audit_logs IS
  'Table d''audit applicative pour traçabilité RGPD. Contient toutes les actions sensibles sur les données personnelles.';

COMMENT ON COLUMN audit_logs.old_values IS
  'État AVANT modification (format JSONB). Utilisé pour audit trail et rollback.';

COMMENT ON COLUMN audit_logs.new_values IS
  'État APRÈS modification (format JSONB). Permet de voir exactement ce qui a changé.';
```

**Exécutez la migration :**

```bash
# Vérifier que Flyway est configuré
grep flyway application.properties

# Redémarrer le backend (Flyway auto-exécute)
docker-compose restart backend

# Vérifier que la table existe
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "\d audit_logs"

# Vérifier les index
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT indexname FROM pg_indexes WHERE tablename = 'audit_logs';"
```

---

### Étape 1.2 : Entité JPA

**Créez `src/main/java/com/glowcommerce/model/AuditLog.java` :**

```java
package com.glowcommerce.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // Utilisateur applicatif
    private Long userId;
    private String username;
    private String userEmail;

    @Column(nullable = false, length = 50)
    private String action;  // LOGIN, CREATE, UPDATE, DELETE, VIEW

    @Column(length = 100)
    private String entityType;  // User, Product, Order, etc.

    private Long entityId;

    // Stockage JSON pour flexibilité
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> oldValues;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> newValues;

    @Column(length = 45)
    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String userAgent;

    @Column(length = 20)
    private String status;  // SUCCESS, FAILED, UNAUTHORIZED

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(length = 255)
    private String endpoint;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
```

**Créez le repository `src/main/java/com/glowcommerce/repository/AuditLogRepository.java` :**

```java
package com.glowcommerce.repository;

import com.glowcommerce.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // Rechercher par utilisateur
    List<AuditLog> findByUserIdOrderByTimestampDesc(Long userId);

    // Rechercher par action
    List<AuditLog> findByActionOrderByTimestampDesc(String action);

    // Rechercher par entité
    List<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(
        String entityType,
        Long entityId
    );

    // Rechercher par plage de dates
    List<AuditLog> findByTimestampBetweenOrderByTimestampDesc(
        LocalDateTime start,
        LocalDateTime end
    );

    // Rechercher échecs d'authentification
    @Query("SELECT a FROM AuditLog a WHERE a.action = 'LOGIN' " +
           "AND a.status = 'FAILED' " +
           "AND a.timestamp > :since " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findFailedLoginsSince(@Param("since") LocalDateTime since);

    // Compter actions par utilisateur
    @Query("SELECT a.action, COUNT(a) FROM AuditLog a " +
           "WHERE a.userId = :userId " +
           "GROUP BY a.action")
    List<Object[]> countActionsByUser(@Param("userId") Long userId);

    // Rechercher modifications récentes d'une entité (audit trail)
    @Query("SELECT a FROM AuditLog a " +
           "WHERE a.entityType = :entityType " +
           "AND a.entityId = :entityId " +
           "AND a.action IN ('CREATE', 'UPDATE', 'DELETE') " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findAuditTrail(
        @Param("entityType") String entityType,
        @Param("entityId") Long entityId
    );
}
```

---

## 🔧 Partie 2 : Service d'audit avec @Async (25 min)

### Étape 2.1 : Configuration @Async

**Créez `src/main/java/com/glowcommerce/config/AsyncConfig.java` :**

```java
package com.glowcommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.context.annotation.Bean;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "auditExecutor")
    public Executor auditExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("audit-");
        executor.initialize();
        return executor;
    }
}
```

---

### Étape 2.2 : Service d'audit

**Créez `src/main/java/com/glowcommerce/service/AuditService.java` :**

```java
package com.glowcommerce.service;

import com.glowcommerce.model.AuditLog;
import com.glowcommerce.repository.AuditLogRepository;
import com.glowcommerce.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Enregistrer un événement d'audit
     * @Async pour ne pas ralentir le traitement principal
     */
    @Async("auditExecutor")
    public void log(
        String action,
        String entityType,
        Long entityId,
        Map<String, Object> oldValues,
        Map<String, Object> newValues,
        String status,
        String details
    ) {
        try {
            // Récupérer l'utilisateur connecté
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            // Récupérer la requête HTTP actuelle
            ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            HttpServletRequest request = attributes != null ? attributes.getRequest() : null;

            // Construire le log d'audit
            AuditLog auditLog = AuditLog.builder()
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValues(oldValues)
                .newValues(newValues)
                .status(status)
                .details(details)
                .build();

            // Ajouter informations utilisateur
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                Object principal = auth.getPrincipal();
                if (principal instanceof UserPrincipal) {
                    UserPrincipal userPrincipal = (UserPrincipal) principal;
                    auditLog.setUsername(userPrincipal.getUsername());
                    auditLog.setUserEmail(userPrincipal.getEmail());
                    auditLog.setUserId(userPrincipal.getId());
                }
            }

            // Ajouter informations réseau
            if (request != null) {
                auditLog.setIpAddress(getClientIpAddress(request));
                auditLog.setUserAgent(request.getHeader("User-Agent"));
                auditLog.setEndpoint(request.getRequestURI());
            }

            // Sauvegarder en base
            auditLogRepository.save(auditLog);

            log.debug("Audit log saved: action={}, entityType={}, entityId={}, status={}",
                     action, entityType, entityId, status);

        } catch (Exception e) {
            // Ne JAMAIS faire échouer la transaction principale à cause de l'audit
            log.error("Failed to save audit log: action={}, entityType={}, entityId={}",
                     action, entityType, entityId, e);
        }
    }

    /**
     * Récupérer la vraie IP du client (derrière un proxy/load balancer)
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String[] headers = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_CLIENT_IP"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // Prendre la première IP si plusieurs (proxy chain)
                return ip.split(",")[0].trim();
            }
        }

        return request.getRemoteAddr();
    }
}
```

---

## 🎨 Partie 3 : Annotation @Auditable avec AOP (30 min)

### Étape 3.1 : Annotation personnalisée

**Créez `src/main/java/com/glowcommerce/annotation/Auditable.java` :**

```java
package com.glowcommerce.annotation;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {

    /**
     * Action effectuée (CREATE, UPDATE, DELETE, etc.)
     */
    String action();

    /**
     * Type d'entité concernée
     */
    String entityType();

    /**
     * Expression SpEL pour récupérer l'ID de l'entité
     * Exemple : "#result.id" ou "#id"
     */
    String entityIdExpression() default "";

    /**
     * Logger les valeurs avant modification ?
     */
    boolean logOldValues() default false;

    /**
     * Logger les valeurs après modification ?
     */
    boolean logNewValues() default true;
}
```

---

### Étape 3.2 : Aspect AOP

**Configuration :**

```java
package com.glowcommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@EnableAspectJAutoProxy
public class AopConfig {
}
```

**Créez `src/main/java/com/glowcommerce/aspect/AuditAspect.java` :**

```java
package com.glowcommerce.aspect;

import com.glowcommerce.annotation.Auditable;
import com.glowcommerce.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditService auditService;
    private final ExpressionParser parser = new SpelExpressionParser();

    @Around("@annotation(auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        String action = auditable.action();
        String entityType = auditable.entityType();

        Map<String, Object> oldValues = null;
        Map<String, Object> newValues = null;
        Long entityId = null;
        String status = "SUCCESS";
        String details = null;

        try {
            // Exécuter la méthode métier
            Object result = joinPoint.proceed();

            // Récupérer valeurs APRÈS
            if (auditable.logNewValues() && result != null) {
                newValues = captureEntityState(result);
            }

            // Extraire l'ID de l'entité via SpEL
            if (!auditable.entityIdExpression().isEmpty()) {
                entityId = evaluateEntityId(auditable.entityIdExpression(), joinPoint, result);
            }

            return result;

        } catch (Exception e) {
            status = "FAILED";
            details = e.getMessage();
            throw e;

        } finally {
            // Logger l'audit (async)
            auditService.log(action, entityType, entityId, oldValues, newValues, status, details);
        }
    }

    private Map<String, Object> captureEntityState(Object entity) {
        // Implémentation simplifiée
        // En production : utiliser Jackson pour sérialiser
        Map<String, Object> state = new HashMap<>();
        // TODO: Implémenter avec réflexion ou Jackson
        return state;
    }

    private Long evaluateEntityId(String expression, ProceedingJoinPoint joinPoint, Object result) {
        StandardEvaluationContext context = new StandardEvaluationContext();

        // Ajouter les paramètres de la méthode au contexte
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = signature.getParameterNames();
        Object[] paramValues = joinPoint.getArgs();

        for (int i = 0; i < paramNames.length; i++) {
            context.setVariable(paramNames[i], paramValues[i]);
        }

        // Ajouter le résultat
        context.setVariable("result", result);

        // Évaluer l'expression SpEL
        Object value = parser.parseExpression(expression).getValue(context);
        return value != null ? ((Number) value).longValue() : null;
    }
}
```

---

### Étape 3.3 : Utilisation dans les services

**Exemple avec ProductService :**

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Auditable(
        action = "CREATE",
        entityType = "Product",
        entityIdExpression = "#result.id",
        logNewValues = true
    )
    public Product createProduct(CreateProductRequest request) {
        Product product = Product.builder()
            .name(request.getName())
            .price(request.getPrice())
            .stock(request.getStock())
            .categoryId(request.getCategoryId())
            .active(true)
            .build();

        return productRepository.save(product);
    }

    @Auditable(
        action = "UPDATE",
        entityType = "Product",
        entityIdExpression = "#id",
        logOldValues = true,
        logNewValues = true
    )
    public Product updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());
        return productRepository.save(product);
    }

    @Auditable(
        action = "DELETE",
        entityType = "Product",
        entityIdExpression = "#id",
        logOldValues = true
    )
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id).orElseThrow();
        productRepository.delete(product);
    }
}
```

---

## 🇪🇺 Partie 4 : Conformité RGPD (20 min)

### Étape 4.1 : Droit d'accès (Article 15)

**Créez `src/main/java/com/glowcommerce/controller/UserDataController.java` :**

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserDataController {

    private final UserService userService;
    private final OrderRepository orderRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * RGPD : Droit d'accès
     * GET /api/users/me
     */
    @GetMapping("/me")
    public UserDataDTO getMyData(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        User user = userService.findById(userPrincipal.getId());

        // Collecter toutes les données de l'utilisateur
        List<Order> orders = orderRepository.findByUserId(userPrincipal.getId());
        List<AuditLog> auditLogs = auditLogRepository.findByUserIdOrderByTimestampDesc(userPrincipal.getId());

        return UserDataDTO.builder()
            .user(UserDTO.fromUser(user))
            .orders(orders.stream().map(OrderDTO::fromOrder).toList())
            .auditLogs(auditLogs.stream().map(AuditLogDTO::from).toList())
            .build();
    }

    /**
     * RGPD : Portabilité (Article 20)
     * GET /api/users/me/export
     */
    @GetMapping("/me/export")
    public ResponseEntity<Resource> exportMyData(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        UserDataDTO data = userService.getUserData(userPrincipal.getId());

        // Sérialiser en JSON
        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        String json = mapper.writeValueAsString(data);

        ByteArrayResource resource = new ByteArrayResource(json.getBytes(StandardCharsets.UTF_8));

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=my-data-glowcommerce.json")
            .contentType(MediaType.APPLICATION_JSON)
            .contentLength(resource.contentLength())
            .body(resource);
    }

    /**
     * RGPD : Droit à l'oubli (Article 17)
     * DELETE /api/users/me
     */
    @DeleteMapping("/me")
    @Auditable(action = "DELETE", entityType = "User", entityIdExpression = "#userPrincipal.id")
    public ResponseEntity<Void> deleteMyAccount(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        userService.anonymizeUser(userPrincipal.getId());
        return ResponseEntity.noContent().build();
    }
}
```

---

## 🧪 Partie 5 : Tests et validation (15 min)

### Étape 5.1 : Tests manuels

```bash
# 1. Créer un produit (génère un log CREATE)
curl -X POST http://localhost:8080/api/admin/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 19.99,
    "stock": 50,
    "categoryId": 1
  }'

# 2. Vérifier dans la table audit_logs
docker exec -it glowcommerce-db psql -U glowcommerce_app -d glowcommerce \
  -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5;"

# 3. Obtenir mes données (RGPD)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/users/me

# 4. Exporter mes données
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/users/me/export \
  -o my-data.json
```

---

## 📊 Livrables attendus

1. **Code :**
   - Migration V6__create_audit_table.sql
   - AuditLog.java (entité)
   - AuditService.java (avec @Async)
   - @Auditable annotation + AuditAspect
   - UserDataController (endpoints RGPD)

2. **Tests :**
   - Logs visibles dans audit_logs
   - Endpoints RGPD fonctionnels
   - Export JSON complet

---

## 🎯 Critères d'évaluation

| Critère | Points |
|---------|--------|
| Table audit_logs créée avec index | 15 |
| AuditService fonctionnel (@Async) | 20 |
| @Auditable + AOP fonctionne | 25 |
| Endpoints RGPD implémentés | 25 |
| Tests de validation | 15 |
| **TOTAL** | **100** |

---

**Bon courage ! 🚀**
