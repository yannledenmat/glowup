# TP 2.2 : Pipeline CI/CD DevSecOps complet

**Module :** Sécurité applicative et DevSecOps
**Durée :** 2 heures
**Niveau :** Avancé

---

## Contexte métier

GlowCommerce souhaite automatiser complètement son processus de déploiement tout en intégrant la sécurité à chaque étape (DevSecOps). Vous devez créer un pipeline GitHub Actions qui build, teste, scanne et déploie l'application de manière sécurisée.

---

## Objectifs du TP

1. ✅ Créer un pipeline CI/CD complet avec GitHub Actions
2. ✅ Intégrer des scans de sécurité (SAST, DAST, SCA)
3. ✅ Gérer les secrets de manière sécurisée
4. ✅ Implémenter des tests automatisés (unit, integration, security)
5. ✅ Déployer automatiquement sur Docker Hub
6. ✅ Configurer des notifications et des rapports

---

## Énoncé détaillé

### Partie 1 : Structure du pipeline (15 min)

**Tâches :**

Créez le fichier `.github/workflows/ci-cd-devsecops.yml` avec la structure suivante :

```yaml
name: CI/CD DevSecOps Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  JAVA_VERSION: '21'
  REGISTRY: docker.io
  IMAGE_NAME: glowcommerce/backend

jobs:
  # Job 1: Build & Test
  build-and-test:
    # ...

  # Job 2: Security Scans
  security-scan:
    # ...

  # Job 3: Build Docker Image
  docker-build:
    # ...

  # Job 4: Deploy (si main seulement)
  deploy:
    # ...
```

---

### Partie 2 : Job Build & Test (25 min)

**Tâches :**

Implémentez le job `build-and-test` :

```yaml
build-and-test:
  runs-on: ubuntu-latest

  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_DB: glowcommerce_test
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up JDK 21
      uses: actions/setup-java@v4
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: 'maven'

    - name: Cache Maven packages
      uses: actions/cache@v3
      with:
        path: ~/.m2/repository
        key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
        restore-keys: |
          ${{ runner.os }}-maven-

    - name: Run tests with coverage
      run: |
        cd glowcommerce-backend
        mvn clean verify -P coverage
      env:
        SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/glowcommerce_test
        SPRING_DATASOURCE_USERNAME: test
        SPRING_DATASOURCE_PASSWORD: test

    - name: Generate JaCoCo Badge
      id: jacoco
      uses: cicirello/jacoco-badge-generator@v2
      with:
        jacoco-csv-file: glowcommerce-backend/target/site/jacoco/jacoco.csv

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: glowcommerce-backend/target/site/jacoco/jacoco.xml
        fail_ci_if_error: true

    - name: Verify code coverage threshold
      run: |
        cd glowcommerce-backend
        mvn jacoco:check -Djacoco.minimum-coverage=0.80

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: glowcommerce-backend/target/surefire-reports/
```

---

### Partie 3 : Job Security Scans (30 min)

**Tâches :**

Implémentez 3 types de scans de sécurité :

#### 3.1 SAST (Static Application Security Testing) avec SpotBugs

```yaml
security-scan:
  runs-on: ubuntu-latest
  needs: build-and-test

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up JDK 21
      uses: actions/setup-java@v4
      with:
        java-version: '21'
        distribution: 'temurin'

    # SAST: Analyse statique du code
    - name: Run SpotBugs (SAST)
      run: |
        cd glowcommerce-backend
        mvn compile spotbugs:check

    - name: Upload SpotBugs report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: spotbugs-report
        path: glowcommerce-backend/target/spotbugsXml.xml
```

#### 3.2 SCA (Software Composition Analysis) avec OWASP Dependency-Check

```yaml
    # SCA: Scan des dépendances
    - name: Run OWASP Dependency-Check (SCA)
      run: |
        cd glowcommerce-backend
        mvn org.owasp:dependency-check-maven:check

    - name: Upload Dependency-Check report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: dependency-check-report
        path: glowcommerce-backend/target/dependency-check-report.html

    - name: Fail if vulnerabilities found
      run: |
        cd glowcommerce-backend
        if [ -f target/dependency-check-report.json ]; then
          HIGH_VULNS=$(jq '.dependencies | map(select(.vulnerabilities[]? | .severity == "HIGH")) | length' target/dependency-check-report.json)
          CRITICAL_VULNS=$(jq '.dependencies | map(select(.vulnerabilities[]? | .severity == "CRITICAL")) | length' target/dependency-check-report.json)

          echo "High vulnerabilities: $HIGH_VULNS"
          echo "Critical vulnerabilities: $CRITICAL_VULNS"

          if [ "$CRITICAL_VULNS" -gt "0" ]; then
            echo "❌ CRITICAL vulnerabilities found! Build failed."
            exit 1
          fi

          if [ "$HIGH_VULNS" -gt "5" ]; then
            echo "⚠️ Too many HIGH vulnerabilities (> 5). Build failed."
            exit 1
          fi
        fi
```

#### 3.3 Secrets Scanning avec Gitleaks

```yaml
    # Secrets Scanning
    - name: Run Gitleaks (Secrets Scanner)
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

    - name: Fail if secrets found
      if: failure()
      run: |
        echo "❌ Secrets found in repository! Please remove them."
        exit 1
```

#### 3.4 Ajout de Trivy pour scanner les vulnérabilités

```yaml
    # Container Scanning
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: './glowcommerce-backend'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy results to GitHub Security
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

---

### Partie 4 : Job Docker Build (20 min)

**Tâches :**

```yaml
docker-build:
  runs-on: ubuntu-latest
  needs: [build-and-test, security-scan]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=sha,prefix={{branch}}-
          type=semver,pattern={{version}}
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./glowcommerce-backend
        file: ./glowcommerce-backend/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
        cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
        build-args: |
          VERSION=${{ github.sha }}
          BUILD_DATE=${{ github.event.head_commit.timestamp }}

    - name: Scan Docker image with Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
        format: 'sarif'
        output: 'trivy-docker-results.sarif'

    - name: Upload Trivy Docker results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-docker-results.sarif'
```

---

### Partie 5 : Gestion des secrets (15 min)

**Tâches :**

1. Créez les secrets GitHub nécessaires :
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
   - `DB_PASSWORD`
   - `JWT_SECRET`

2. Utilisez les secrets dans le code :

```yaml
    - name: Deploy to production
      env:
        DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        JWT_SECRET: ${{ secrets.JWT_SECRET }}
      run: |
        echo "Deploying with secure secrets..."
        # Les secrets ne seront jamais affichés dans les logs
```

3. **Tâche bonus** : Utilisez HashiCorp Vault ou AWS Secrets Manager

```yaml
    - name: Import secrets from Vault
      uses: hashicorp/vault-action@v2
      with:
        url: ${{ secrets.VAULT_ADDR }}
        token: ${{ secrets.VAULT_TOKEN }}
        secrets: |
          secret/data/glowcommerce db_password | DB_PASSWORD ;
          secret/data/glowcommerce jwt_secret | JWT_SECRET
```

---

### Partie 6 : Notifications (15 min)

**Tâches :**

Ajoutez des notifications Slack en fin de pipeline :

```yaml
  notify:
    runs-on: ubuntu-latest
    needs: [build-and-test, security-scan, docker-build]
    if: always()

    steps:
      - name: Send Slack notification (success)
        if: success()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "✅ Pipeline SUCCESS",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*✅ Pipeline réussi pour GlowCommerce*\n*Commit:* ${{ github.sha }}\n*Branch:* ${{ github.ref_name }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Send Slack notification (failure)
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "❌ Pipeline FAILED",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*❌ Pipeline échoué pour GlowCommerce*\n*Commit:* ${{ github.sha }}\n*Branch:* ${{ github.ref_name }}\n*Author:* ${{ github.actor }}\n*Logs:* ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Critères de réussite

| Critère | Points | Validation |
|---------|--------|------------|
| Pipeline build & test fonctionnel | 15 | Tests passent sur GitHub Actions |
| Coverage > 80% avec fail si < seuil | 10 | JaCoCo check passe |
| SAST (SpotBugs) intégré | 10 | SpotBugs analyse le code |
| SCA (Dependency-Check) intégré | 15 | Dépendances scannées, fail si CRITICAL |
| Secrets scanning (Gitleaks) | 10 | Aucun secret dans le code |
| Docker image build et push | 15 | Image disponible sur Docker Hub |
| Trivy scan de l'image Docker | 10 | Image scannée, vulnérabilités reportées |
| Secrets gérés proprement (GitHub Secrets) | 10 | Pas de secrets en clair |
| Notifications Slack | 5 | Notifications envoyées |
| **TOTAL** | **100** | |

---

## Livrables attendus

1. **Fichier workflow** : `.github/workflows/ci-cd-devsecops.yml`

2. **Configuration Maven** : `pom.xml` avec plugins :
   - JaCoCo (coverage)
   - SpotBugs (SAST)
   - OWASP Dependency-Check (SCA)

3. **Dockerfile optimisé** pour production

4. **Documentation** : `docs/PIPELINE-CICD.md`
   - Architecture du pipeline
   - Comment ajouter un nouveau scan
   - Gestion des échecs et rollbacks
   - Métriques de qualité (coverage, vulnérabilités)

---

## Configuration Maven requise

Ajoutez dans `pom.xml` :

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>jacoco-check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>PACKAGE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>

<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.8.2.0</version>
    <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <xmlOutput>true</xmlOutput>
        <failOnError>true</failOnError>
    </configuration>
</plugin>

<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>9.0.7</version>
    <configuration>
        <format>ALL</format>
        <failBuildOnCVSS>7</failBuildOnCVSS>
    </configuration>
</plugin>
```

---

## Tests de validation

### Test 1 : Pipeline s'exécute sur push

```bash
# Faire un commit
git add .
git commit -m "feat: add new feature"
git push origin main

# Vérifier sur GitHub Actions
# https://github.com/YOUR_ORG/glowcommerce/actions
```

### Test 2 : Pipeline fail si tests échouent

```java
// Ajouter un test qui échoue
@Test
void testShouldFail() {
    assertTrue(false);
}

git add .
git commit -m "test: add failing test"
git push

# Attendu : Pipeline échoue au job build-and-test
```

### Test 3 : Pipeline fail si secret détecté

```bash
# Ajouter un secret dans le code
echo "JWT_SECRET=super-secret-key-123456" > application.properties
git add application.properties
git commit -m "config: add jwt secret"
git push

# Attendu : Pipeline échoue au job security-scan (Gitleaks)
```

### Test 4 : Docker image disponible

```bash
# Après un push réussi sur main
docker pull glowcommerce/backend:latest

# Attendu : Image téléchargée avec succès
```

---

## Compétences mobilisées

- **C18** : Intégrer DevSecOps dans le cycle de développement (cœur du TP)
- **C8** : Tests rigoureux et automatisés (TDD, coverage)
- **C19** : Optimisation et Clean Code (pipeline efficace, cache)
- **C6** : Architecture CI/CD (documentation, revue)

---

## Bonus (facultatif)

Si vous avez terminé en avance :

1. **Environnements multiples** : Déploiement staging + production
2. **Blue/Green deployment** : Déploiement sans downtime
3. **DAST** : Scan dynamique avec OWASP ZAP après déploiement
4. **Performance testing** : Gatling load tests dans le pipeline
5. **Auto-rollback** : Rollback automatique si healthcheck fail

---

**Bon courage !** 🚀
