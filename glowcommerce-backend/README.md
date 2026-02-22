# GlowCommerce Backend - API REST Sécurisée

## Description

Backend Java/Spring Boot pour la plateforme e-commerce GlowCommerce, développé dans le cadre de la formation Bac+5 sur la sécurité, les performances et le DevSecOps.

## Stack Technique

- **Java 21**
- **Spring Boot 3.2.0**
- **Spring Security** avec JWT
- **Spring Data JPA**
- **PostgreSQL 16**
- **Flyway** (migrations)
- **Spring Boot Actuator** (monitoring)
- **Micrometer + Prometheus** (métriques)
- **Caffeine** (cache)

## Architecture

```
glowcommerce-backend/
├── src/main/java/com/glowcommerce/
│   ├── model/               # Entités JPA
│   │   ├── User.java
│   │   ├── Product.java
│   │   ├── Order.java
│   │   ├── OrderItem.java
│   │   ├── Category.java
│   │   └── Address.java
│   ├── repository/          # Repositories Spring Data
│   ├── service/             # Logique métier
│   ├── controller/          # Controllers REST
│   ├── security/            # JWT + Spring Security
│   ├── config/              # Configurations
│   └── dto/                 # Data Transfer Objects
└── src/main/resources/
    ├── application.properties
    └── db/migration/        # Scripts Flyway
