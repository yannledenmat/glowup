
# TP 2.1 : 

**Exploitation possible :**
```bash
curl "http://localhost:8080/api/products/search?query='; DROP TABLE products; --"
# Résultat : Table products supprimée !
```

#### Tâches

1. Identifiez le problème de sécurité
2. Corrigez en utilisant des requêtes paramétrées (JPA `@Query`)
3. Testez que l'exploitation ne fonctionne plus
4. Écrivez un test unitaire pour prévenir la régression

#### 

---

### Vulnérabilité 2 : Broken Authentication (25 min)

#### Situation actuelle (VULNÉRABLE)

```java
@Component
public class JwtUtil {

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                // ❌ PAS D'EXPIRATION !
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
}
```

**Problème :** Les tokens ne expirent jamais. Si un token est volé, l'attaquant a un accès permanent.

#### Tâches

1. Ajoutez une expiration de 15 minutes aux tokens
2. Implémentez un système de refresh token (validité 7 jours)
3. Créez un endpoint `/api/auth/refresh` pour renouveler le token
4. Invalidez les tokens lors du logout (blacklist Redis)

#### 

---

### Vulnérabilité 3 : Sensitive Data Exposure dans les logs (20 min)

#### Situation actuelle (VULNÉRABLE)

```java
@Service
public class AuthService {

    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt: username={}, password={}",
                 request.getUsername(), request.getPassword());  // ❌ PASSWORD EN CLAIR !

        // ...
    }
}
```

**Problème :** Les mots de passe apparaissent en clair dans les logs.

#### Tâches

1. Identifiez tous les endroits où des données sensibles sont loggées
2. Masquez les données sensibles (password, token, numéro de carte, etc.)
3. Créez un utilitaire `SensitiveDataMasker`
4. Configurez Logback pour masquer automatiquement certains patterns

#### 

---

### Vulnérabilité 4 : XML External Entities (XXE) (25 min)

#### Situation actuelle (VULNÉRABLE)

```java
@RestController
@RequestMapping("/api/admin/products")
public class ProductImportController {

    @PostMapping("/import")
    public ResponseEntity<String> importProducts(@RequestBody String xmlContent) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            // ❌ VULNERABLE : XXE activé par défaut
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new InputSource(new StringReader(xmlContent)));

            // Parser le XML et créer les produits...
            return ResponseEntity.ok("Products imported");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Import failed");
        }
    }
}
```

**Exploitation possible :**
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<products>
  <product>
    <name>&xxe;</name>
  </product>
</products>
```

#### Tâches

1. Désactivez les entités externes (XXE)
2. Désactivez les DOCTYPE
3. Utilisez une bibliothèque sécurisée (Jackson XML ou JAXB configuré)
4. Testez qu'un payload XXE ne fonctionne plus

#### 

---

### Vulnérabilité 5 : Security Misconfiguration - CORS (20 min)

#### Situation actuelle (VULNÉRABLE)

```java
@Configuration
public class SecurityConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.addAllowedOrigin("*");  // ❌ TOUS LES DOMAINES !
        configuration.addAllowedMethod("*");  // ❌ TOUTES LES MÉTHODES !
        configuration.addAllowedHeader("*");  // ❌ TOUS LES HEADERS !
        configuration.setAllowCredentials(true);  // ❌ INCOMPATIBLE AVEC "*"

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

**Problème :** Tout site web peut faire des requêtes à l'API et voler les données utilisateurs.

#### Tâches

1. Restreignez CORS aux domaines autorisés uniquement
2. Limitez les méthodes HTTP (GET, POST, PUT, DELETE)
3. Configurez les headers autorisés de manière restrictive
4. Testez avec un domaine non autorisé (doit être rejeté)

#### 

**application.properties :**
```properties
app.cors.allowed-origins=https://glowcommerce.com,https://admin.glowcommerce.com,http://localhost:3000
```

---

## Critères de réussite

| Critère | Points | Validation |
|---------|--------|------------|
| Injection SQL 

### Test 2 : Expiration JWT

```bash
# Générer un token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}' \
  | jq -r '.token')

# Utiliser le token immédiatement (OK)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/auth/me

# Attendre 16 minutes...
sleep 960

# Utiliser le token expiré (doit échouer)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/auth/me
# Attendu : 401 Unauthorized
```

### Test 3 : XXE

```bash
# Tentative d'exploitation XXE
curl -X POST http://localhost:8080/api/admin/products/import \
  -H "Content-Type: application/xml" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<products><product><name>&xxe;</name></product></products>'

# Attendu : 400 Bad Request (DOCTYPE non autorisé)
```

### Test 4 : CORS

```bash
# Requête depuis un domaine non autorisé
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:8080/api/products

# Attendu : Pas de header Access-Control-Allow-Origin dans la réponse
```

---

## Compétences mobilisées

- **C18** : DevSecOps (intégration de la sécurité dans le développement)
- **C25** : Implémenter stratégies de cybersécurité (correction vulnérabilités OWASP)
- **C8** : Tests de sécurité rigoureux
- **C19** : Clean Code (refactoring sécurisé)

---

## Ressources complémentaires

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Spring Security Documentation](https://docs.spring.io/spring-security/reference/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Bon courage !** 🚀
