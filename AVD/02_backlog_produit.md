# Backlog produit – AMS GLA

Backlog très synthétique des User Stories du projet. Chaque US a : un identifiant, un intitulé court, un type et une priorité (H = haute, M = moyenne, B = basse).

| ID   | Intitulé court                                             | Type            | Priorité |
|------|------------------------------------------------------------|-----------------|----------|
| US1  | Définir la liste des actifs dans `assets.json`            | Fonctionnelle   | H        |
| US2  | Appeler l’API CoinCap pour un actif                       | Fonctionnelle   | H        |
| US3  | Gérer les erreurs d’appel API                             | Technique       | H        |
| US4  | Structurer le format des données collectées               | Fonctionnelle   | M        |
| US5  | Planifier la collecte avec un cron local                  | Technique       | H        |
| US6  | Permettre un lancement manuel de la collecte              | Fonctionnelle   | M        |
| US7  | Écrire les résultats dans un fichier / logs structurés    | Fonctionnelle   | H        |
| US8  | Ajouter un horodatage et l’identifiant d’actif aux sorties| Fonctionnelle   | M        |
| US9  | Mettre en place Jest et la config de base                 | Technique       | H        |
| US10 | Tester la lecture d’`assets.json`                         | Test            | M        |
| US11 | Tester la gestion des erreurs API et du cron              | Test            | M        |
| US12 | Rédiger un Dockerfile pour le collecteur                  | Technique       | H        |
| US13 | Définir un CronJob Kubernetes (si demandé)                | Technique       | B        |
| US14 | Structurer le rapport AMS GLA                             | Documentation   | M        |
| US15 | Expliquer la démarche Agile / Kanban dans le rapport      | Documentation   | M        |
| US16 | Rédiger la conclusion et les pistes d’amélioration        | Documentation   | B        |
| US17 | Ajouter une petite interface web de consultation des données | Fonctionnelle| B        |
| US18 | Mettre en place un script `npm run webui` pour lancer l’interface | Technique | B |
| US19 | Implémenter le fallback BDD locale pour l'authentification | Technique | H |
| US20 | Refondre le calculateur en Simulateur d'Investissement | Fonctionnelle | M |
| US21 | Améliorer l'UX des graphiques (taille, défaut BTC, contrôles) | Fonctionnelle | M |
| US22 | Traduire l'intégralité de l'interface et des logs en FR | Fonctionnelle | M |
| US23 | Ajouter une Heatmap de marché | Fonctionnelle | B |
| US24 | Mettre en place les tests de charge K6 | Technique | M |
| US25 | Intégrer les notifications Discord (Webhook) | Fonctionnelle | M |
| US26 | Traduire le README et la documentation technique | Documentation | M |
| US27 | Mettre en place un Portefeuille Virtuel (création, trade simulé, historique) | Fonctionnelle | M |
| US28 | Ajouter les endpoints API liés au portefeuille | Technique | M |
| US29 | Améliorer le flux d’auth côté WebUI (écrans login/signup, wiring, états) | Fonctionnelle | M |
| US30 | Renforcer la robustesse serveur (cas limites, erreurs, réponses inattendues) | Technique | M |
| US31 | Renforcer la couverture et les tests orientés branches | Test | M |
| US32 | Ajouter un export / endpoints complémentaires (selon besoins) | Fonctionnelle | B |
| US33 | Réaliser un diagramme de Gantt propre (page HTML/CSS/JS) | Documentation | M |
| US34 | Rédiger / structurer le rapport au format LaTeX (couverture, sommaire, annexes) | Documentation | H |
| US35 | Documenter l’usage d’IA et les ressources web utilisées (annexe) | Documentation | M |

Le détail de l’avancement (À faire / En cours / Fait) est suivi dans le tableau Kanban.