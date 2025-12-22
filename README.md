# Plateforme de Surveillance et d’Analyse des Marchés de Cryptomonnaies

Ce projet a pour but de créer une plateforme capable de collecter, stocker et analyser des données de cryptomonnaies.  
Le développement suit une approche structurée et met en avant les bonnes pratiques du génie logiciel.

## Fonctionnalités prévues

### Collecte des données
- Récupération automatique des données via des APIs publiques. (fini)
- Planification de la collecte. (fini)
- Tolérance aux pannes via une file de tâches. (fini)
- Stockage des données dans une base dédiée.

### API Backend
- Accès aux données collectées. (fini)
- Authentification sécurisée.
- Gestion des utilisateurs et des rôles.
- Endpoints pour les graphiques, les alertes et les prévisions.

### Application Web
- Tableau de bord interactif.
- Graphiques dynamiques (courbes, chandeliers, comparaisons).
- Filtres temporels.
- Alertes personnalisées et notifications.
- Portefeuille virtuel.

### Prévision
- Moyennes mobiles.
- Régression linéaire simple.

### DevOps
- Dockerisation de l’ensemble des services. (presque fini)
- Pipeline CI/CD. (fini. mais à revoir plus tard)
- Déploiement Kubernetes. (fini)
- Monitoring via Prometheus et Grafana.

## Organisation du projet

Le projet suit une gestion **Kanban** adaptée à un développement individuel :
un tableau simple pour suivre les tâches (À faire → En cours → Fait).

Les tests occupent une place centrale :
tests unitaires, intégration, performance et sécurité.

## Structure générale du dépôt

/collector → application console de collecte
/backend → API de traitement et d’exposition des données
/frontend → application web
/infrastructure → Docker, CI/CD, Kubernetes
/docs → documentation et schémas


## Installation (à venir)

J'ajouterai les instructions une fois les premiers modules mis en place.