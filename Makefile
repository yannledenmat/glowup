.PHONY: help all up down restart logs clean

# Variables
COMPOSE = docker compose
SERVICES = database backend frontend prometheus grafana portainer pgadmin

# Couleurs pour l'affichage
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## Affiche cette aide
	@echo "$(GREEN)=== GlowCommerce - Commandes disponibles ===$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)=== Services individuels ===$(NC)"
	@echo "  $(YELLOW)database$(NC)                Lance uniquement PostgreSQL"
	@echo "  $(YELLOW)backend$(NC)                 Lance uniquement le backend Spring Boot"
	@echo "  $(YELLOW)frontend$(NC)                Lance uniquement le frontend React"
	@echo "  $(YELLOW)prometheus$(NC)              Lance uniquement Prometheus"
	@echo "  $(YELLOW)grafana$(NC)                 Lance uniquement Grafana"
	@echo "  $(YELLOW)portainer$(NC)               Lance uniquement Portainer"
	@echo "  $(YELLOW)pgadmin$(NC)                 Lance uniquement pgAdmin"
	@echo ""

# === Commandes globales ===

all: up ## Lance tous les services

up: ## Lance tous les services
	@echo "$(GREEN)Démarrage de tous les services...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)Tous les services sont démarrés!$(NC)"

down: ## Arrête tous les services
	@echo "$(RED)Arrêt de tous les services...$(NC)"
	$(COMPOSE) down
	@echo "$(RED)Tous les services sont arrêtés!$(NC)"

restart: down up ## Redémarre tous les services

logs: ## Affiche les logs de tous les services
	$(COMPOSE) logs -f

status: ## Affiche le statut de tous les services
	@echo "$(GREEN)=== Status des services ===$(NC)"
	@$(COMPOSE) ps

clean: ## Nettoie les volumes (ATTENTION: supprime les données!)
	@echo "$(RED)Arrêt et suppression des conteneurs et volumes...$(NC)"
	$(COMPOSE) down -v
	@echo "$(RED)Nettoyage terminé!$(NC)"

# === Services individuels ===

database: ## Lance uniquement PostgreSQL
	@echo "$(GREEN)Démarrage de PostgreSQL...$(NC)"
	$(COMPOSE) up -d database
	@echo "$(GREEN)PostgreSQL démarré sur le port 5432$(NC)"

database-stop: ## Arrête PostgreSQL
	@echo "$(RED)Arrêt de PostgreSQL...$(NC)"
	$(COMPOSE) stop database
	@echo "$(RED)PostgreSQL arrêté$(NC)"

database-logs: ## Affiche les logs de PostgreSQL
	$(COMPOSE) logs -f database

database-restart: ## Redémarre PostgreSQL
	@echo "$(YELLOW)Redémarrage de PostgreSQL...$(NC)"
	$(COMPOSE) restart database

backend: database ## Lance le backend (démarre la DB si nécessaire)
	@echo "$(GREEN)Démarrage du backend Spring Boot...$(NC)"
	$(COMPOSE) up -d backend
	@echo "$(GREEN)Backend démarré sur le port 8080$(NC)"
	@echo "$(YELLOW)API disponible sur: http://localhost:8080$(NC)"

backend-stop: ## Arrête le backend
	@echo "$(RED)Arrêt du backend...$(NC)"
	$(COMPOSE) stop backend
	@echo "$(RED)Backend arrêté$(NC)"

backend-logs: ## Affiche les logs du backend
	$(COMPOSE) logs -f backend

backend-restart: ## Redémarre le backend
	@echo "$(YELLOW)Redémarrage du backend...$(NC)"
	$(COMPOSE) restart backend

backend-build: ## Reconstruit et redémarre le backend
	@echo "$(YELLOW)Reconstruction du backend...$(NC)"
	$(COMPOSE) build backend
	$(COMPOSE) up -d backend

frontend: backend ## Lance le frontend (démarre le backend si nécessaire)
	@echo "$(GREEN)Démarrage du frontend React...$(NC)"
	$(COMPOSE) up -d frontend
	@echo "$(GREEN)Frontend démarré sur le port 3000$(NC)"
	@echo "$(YELLOW)Application disponible sur: http://localhost:3000$(NC)"

frontend-stop: ## Arrête le frontend
	@echo "$(RED)Arrêt du frontend...$(NC)"
	$(COMPOSE) stop frontend
	@echo "$(RED)Frontend arrêté$(NC)"

frontend-logs: ## Affiche les logs du frontend
	$(COMPOSE) logs -f frontend

frontend-restart: ## Redémarre le frontend
	@echo "$(YELLOW)Redémarrage du frontend...$(NC)"
	$(COMPOSE) restart frontend

frontend-build: ## Reconstruit et redémarre le frontend
	@echo "$(YELLOW)Reconstruction du frontend...$(NC)"
	$(COMPOSE) build frontend
	$(COMPOSE) up -d frontend

prometheus: ## Lance Prometheus
	@echo "$(GREEN)Démarrage de Prometheus...$(NC)"
	$(COMPOSE) up -d prometheus
	@echo "$(GREEN)Prometheus démarré sur le port 9090$(NC)"
	@echo "$(YELLOW)Interface disponible sur: http://localhost:9090$(NC)"

prometheus-stop: ## Arrête Prometheus
	@echo "$(RED)Arrêt de Prometheus...$(NC)"
	$(COMPOSE) stop prometheus

prometheus-logs: ## Affiche les logs de Prometheus
	$(COMPOSE) logs -f prometheus

prometheus-restart: ## Redémarre Prometheus
	@echo "$(YELLOW)Redémarrage de Prometheus...$(NC)"
	$(COMPOSE) restart prometheus

grafana: prometheus ## Lance Grafana (démarre Prometheus si nécessaire)
	@echo "$(GREEN)Démarrage de Grafana...$(NC)"
	$(COMPOSE) up -d grafana
	@echo "$(GREEN)Grafana démarré sur le port 3001$(NC)"
	@echo "$(YELLOW)Interface disponible sur: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Login: admin / Password: admin123$(NC)"

grafana-stop: ## Arrête Grafana
	@echo "$(RED)Arrêt de Grafana...$(NC)"
	$(COMPOSE) stop grafana

grafana-logs: ## Affiche les logs de Grafana
	$(COMPOSE) logs -f grafana

grafana-restart: ## Redémarre Grafana
	@echo "$(YELLOW)Redémarrage de Grafana...$(NC)"
	$(COMPOSE) restart grafana

portainer: ## Lance Portainer
	@echo "$(GREEN)Démarrage de Portainer...$(NC)"
	$(COMPOSE) up -d portainer
	@echo "$(GREEN)Portainer démarré sur les ports 9000 et 9443$(NC)"
	@echo "$(YELLOW)Interface disponible sur: http://localhost:9000$(NC)"

portainer-stop: ## Arrête Portainer
	@echo "$(RED)Arrêt de Portainer...$(NC)"
	$(COMPOSE) stop portainer

portainer-logs: ## Affiche les logs de Portainer
	$(COMPOSE) logs -f portainer

portainer-restart: ## Redémarre Portainer
	@echo "$(YELLOW)Redémarrage de Portainer...$(NC)"
	$(COMPOSE) restart portainer

pgadmin: database ## Lance pgAdmin (démarre la DB si nécessaire)
	@echo "$(GREEN)Démarrage de pgAdmin...$(NC)"
	$(COMPOSE) up -d pgadmin
	@echo "$(GREEN)pgAdmin démarré sur le port 5050$(NC)"
	@echo "$(YELLOW)Interface disponible sur: http://localhost:5050$(NC)"
	@echo "$(YELLOW)Login: admin@glowcommerce.local / Password: admin123$(NC)"

pgadmin-stop: ## Arrête pgAdmin
	@echo "$(RED)Arrêt de pgAdmin...$(NC)"
	$(COMPOSE) stop pgadmin

pgadmin-logs: ## Affiche les logs de pgAdmin
	$(COMPOSE) logs -f pgadmin

pgadmin-restart: ## Redémarre pgAdmin
	@echo "$(YELLOW)Redémarrage de pgAdmin...$(NC)"
	$(COMPOSE) restart pgadmin

# === Groupes de services ===

app: database backend frontend ## Lance uniquement l'application (DB + Backend + Frontend)
	@echo "$(GREEN)Application GlowCommerce démarrée!$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Backend API: http://localhost:8080$(NC)"

monitoring: prometheus grafana ## Lance uniquement les outils de monitoring
	@echo "$(GREEN)Outils de monitoring démarrés!$(NC)"
	@echo "$(YELLOW)Prometheus: http://localhost:9090$(NC)"
	@echo "$(YELLOW)Grafana: http://localhost:3001$(NC)"

tools: portainer pgadmin ## Lance uniquement les outils d'administration
	@echo "$(GREEN)Outils d'administration démarrés!$(NC)"
	@echo "$(YELLOW)Portainer: http://localhost:9000$(NC)"
	@echo "$(YELLOW)pgAdmin: http://localhost:5050$(NC)"

dev: app monitoring tools ## Lance l'environnement de développement complet
	@echo "$(GREEN)Environnement de développement complet démarré!$(NC)"

# === Commandes utiles ===

shell-backend: ## Ouvre un shell dans le conteneur backend
	$(COMPOSE) exec backend /bin/sh

shell-frontend: ## Ouvre un shell dans le conteneur frontend
	$(COMPOSE) exec frontend /bin/sh

shell-database: ## Ouvre un shell dans le conteneur database
	$(COMPOSE) exec database psql -U glowcommerce_app -d glowcommerce

rebuild: ## Reconstruit tous les conteneurs
	@echo "$(YELLOW)Reconstruction de tous les conteneurs...$(NC)"
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d

prune: ## Nettoie Docker (images, conteneurs, volumes non utilisés)
	@echo "$(RED)Nettoyage de Docker...$(NC)"
	docker system prune -af --volumes
	@echo "$(RED)Nettoyage terminé!$(NC)"

health: ## Vérifie la santé de tous les services
	@echo "$(GREEN)=== Vérification de la santé des services ===$(NC)"
	@for service in $(SERVICES); do \
		echo -n "$$service: "; \
		if $(COMPOSE) ps $$service | grep -q "Up"; then \
			echo "$(GREEN)✓ Running$(NC)"; \
		else \
			echo "$(RED)✗ Stopped$(NC)"; \
		fi; \
	done
