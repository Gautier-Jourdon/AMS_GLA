# Cahier des charges – AMS GLA

## 1. Contexte et objectif

Le projet consiste à développer un **collecteur de données** en Node.js qui suit une liste d’actifs (cryptomonnaies, actions…) en interrogeant régulièrement une API externe (par exemple CoinCap). Le travail est individuel, dans le cadre du module AMS/GLA, et doit aboutir à une solution exécutable en local et dans un conteneur Docker, accompagnée d’un court rapport.

Objectif principal : disposer d’un script fiable qui, à intervalles réguliers, récupère les dernières valeurs des actifs configurés et les enregistre dans un format exploitable.

**Remarque :** au fil du développement, le périmètre a été étendu au-delà du collecteur initial afin de constituer une plateforme plus complète : API backend, interface web, authentification (avec fallbacks), alertes/notifications, portefeuille virtuel, tests de charge, et éléments DevOps (CI/CD et Kubernetes). Ces ajouts ont été intégrés progressivement, tout en conservant les livrables attendus.

## 2. Fonctionnalités attendues

1. **Configuration des actifs** :
  - Liste des actifs à suivre stockée dans `collector/data/assets.json`.

2. **Collecte de données** :
  - Appel périodique à l’API distante pour chaque actif.
  - Gestion simple des erreurs réseau (ne pas crasher, loguer clairement).

3. **Planification** :
  - Lancement automatique via un mécanisme de type cron (ex. `utils/cron.js`).
  - Possibilité de lancer manuellement la collecte pour les tests.

4. **Sortie des données** :
  - Écriture des résultats (au minimum : horodatage, identifiant de l’actif, valeur) dans un fichier ou dans les logs, de façon homogène.

## 3. Contraintes techniques et qualité

- **Technos** : Node.js (version du projet), bibliothèques HTTP et de planification au choix.
- **Structure du code** : séparation minimale en `services/`, `utils/`, `data/`.
- **Tests** : quelques tests Jest couvrant la lecture de la configuration et le comportement de base de la collecte.
- **Conteneurisation** : Dockerfile permettant d’exécuter le collecteur sans modification.

## 4. Livrables

- Code source du collecteur et scripts liés.
- Tests Jest fonctionnels.
- Dockerfile opérationnel (et éventuellement manifeste k8s fourni).
- Court rapport décrivant le fonctionnement, les choix techniques et l’organisation (Kanban).