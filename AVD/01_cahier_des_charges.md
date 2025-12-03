# Cahier des charges – Projet AMS GLA

Ce document présente, de manière rédigée et synthétique, le cahier des charges du projet AMS GLA tel qu’il ressort du sujet et de l’état actuel du dépôt `AMS_GLA`. Il sert de référence pour expliquer ce que l’application doit faire, dans quelles conditions techniques elle doit fonctionner et quels livrables sont attendus.

Le projet consiste à mettre en place un collecteur de données écrit en Node.js. Ce collecteur suit un ensemble d’actifs (par exemple des cryptomonnaies ou des actions) et interroge régulièrement des API externes, comme l’API CoinCap, afin de récupérer leurs valeurs. Le travail est réalisé en individuel, dans le cadre du module AMS / GLA, avec une logique de déploiement moderne basée sur les conteneurs (Docker, éventuellement Kubernetes) et une exigence minimale de qualité de code via des tests unitaires. En complément du code, un rapport doit décrire la démarche, les choix effectués et l’organisation du projet.

Sur le plan fonctionnel, l’application doit d’abord être capable de gérer une liste d’actifs à suivre. Cette liste est définie dans un fichier de configuration, par exemple `collector/data/assets.json`, qui précise quels actifs doivent être collectés. Pour chaque actif, le collecteur interroge périodiquement l’API distante au moyen d’un service dédié, comme `coincapService.js`. Il ne s’agit pas uniquement de faire un appel réussi dans le cas idéal : le collecteur doit également prendre en compte les erreurs réseau (timeouts, indisponibilité de l’API, codes HTTP d’erreur) et les cas où les données renvoyées sont incomplètes ou incohérentes.

L’exécution de cette collecte ne doit pas rester purement manuelle. Le cahier des charges prévoit qu’elle soit automatisée à intervalles réguliers, par exemple grâce à un système de planification de type cron implémenté dans `utils/cron.js`. Il doit cependant rester possible de lancer la collecte manuellement, avec un simple script Node, afin de faciliter les tests et le débogage. Cette double possibilité (planification automatique et lancement manuel) permet à la fois d’industrialiser la solution et de la rendre confortable à développer.

Une fois les données récupérées, l’application doit les stocker ou les exposer de manière claire. Selon les contraintes exactes du sujet, cette sortie peut prendre la forme d’un fichier, de simples logs console ou d’un futur service API. Dans tous les cas, le format de sortie doit être explicite et cohérent : chaque mesure doit être associée au moins à un horodatage, à l’identifiant de l’actif concerné et à une ou plusieurs valeurs collectées. Cette structuration est essentielle pour pouvoir exploiter ou analyser les données par la suite.

Le projet impose également des exigences de qualité. L’usage du framework Jest est prévu pour écrire des tests unitaires. Ces tests doivent couvrir a minima la lecture de la configuration (par exemple à partir d’`assets.json`), le comportement du fetcher et la gestion des erreurs lors des appels à l’API. L’objectif n’est pas d’atteindre une couverture parfaite, mais de garantir un socle de fiabilité sur les parties critiques : configuration, communication réseau et logique de collecte.

Enfin, le cahier des charges inclut un volet d’industrialisation. Le collecteur doit pouvoir être exécuté dans un conteneur Docker à partir du `Dockerfile` fourni. Idéalement, une configuration Kubernetes est également proposée, par exemple sous la forme d’un CronJob décrit dans `k8s/collector/collector-cron.yaml`, afin de montrer comment la collecte pourrait être planifiée dans un cluster. Le projet n’exige pas nécessairement une mise en production réelle, mais il demande une réflexion concrète sur le déploiement.

Sur le plan technique, le langage retenu est Node.js, dans la version indiquée dans `package.json`. Des bibliothèques telles que `node-fetch` (ou équivalent) peuvent être utilisées pour réaliser les appels HTTP, tandis qu’une librairie de type `node-cron` (ou une implémentation maison) peut servir pour la planification. La configuration non sensible (comme la liste des actifs) est gérée via des fichiers JSON, alors que les paramètres plus critiques (par exemple les clés d’API, les URL de base) doivent, dans l’idéal, être passés par des variables d’environnement. Le Dockerfile s’appuie sur une image Node LTS et, si nécessaire, peut être optimisé pour réduire la taille de l’image (par exemple en utilisant un multi-stage build).

Les contraintes non fonctionnelles complètent ce cadre. L’application doit être robuste : elle ne doit pas s’arrêter brutalement en cas d’erreur d’API ou de données incomplètes, et doit produire au minimum des logs clairs au niveau information et erreur. Les performances doivent être raisonnables pour un nombre classique d’actifs à suivre (quelques dizaines à quelques centaines) sans viser l’optimisation extrême. La maintenance doit être facilitée par une bonne organisation du code : séparation en dossiers `services/`, `utils/`, `data/`, et présence de tests automatisables via une simple commande `npm test`.

Les livrables attendus sont multiples. On attend d’abord le code source complet dans le dépôt `AMS_GLA`, accompagné de tests Jest fonctionnels. Le Dockerfile doit permettre de construire et de lancer le conteneur sans modification supplémentaire. Si le sujet le prévoit, un manifeste Kubernetes est fourni pour la planification. Enfin, un rapport AMS GLA accompagne le tout. Il décrit la conception, explique comment le projet a été organisé (notamment au travers de la méthode Kanban ou Agile retenue) et revient sur les difficultés rencontrées ainsi que sur les pistes d’amélioration.

Au moment de la rédaction de ce cahier des charges, plusieurs éléments sont déjà présents dans le dépôt : les fichiers `collector/index.js`, `collector/services/coincapService.js`, `collector/utils/fetcher.js` et `collector/utils/cron.js` constituent le squelette de l’application de collecte. Le fichier `collector/data/assets.json` propose une première configuration d’actifs à suivre. Le dossier `tests/` contient déjà un test Jest (`getAssets.test.js`), ce qui montre que la démarche de qualité a été entamée. Le `Dockerfile` et le fichier `k8s/collector/collector-cron.yaml` donnent une base de travail pour la conteneurisation et la planification Kubernetes. Enfin, le répertoire `Rapport/` contient une version en cours du rapport (`Rapport_AMS_GLA_v2.pdf`).

Ce cahier des charges se veut volontairement clair et humain plutôt que purement listé. Il peut être affiné ou enrichi directement à partir du sujet PDF officiel, en complétant notamment le contexte pédagogique, les cas d’usage précis ou les contraintes d’évaluation imposées par l’enseignant.
# Cahier des charges – Projet AMS GLA

## 1. Contexte

- Mise en place d’un **collecteur de données** (type Node.js) sur des actifs (crypto / actions) à partir d’API externes (ex. CoinCap) – voir `collector/`.
- Projet réalisé **en individuel**, dans le cadre du module AMS / GLA.
- Livraison attendue : application containerisable (Docker, éventuellement k8s), tests unitaires, et rapport.

## 2. Objectifs fonctionnels

1. **Collecte d’actifs**
   - Récupérer la liste des actifs à suivre depuis un fichier de configuration (ex. `collector/data/assets.json`).
   - Pour chaque actif, interroger l’API distante (ex. CoinCap) via un service (ex. `coincapService.js`).
   - Gérer les erreurs réseau (timeouts, codes HTTP d’erreur) et les cas de données manquantes.

2. **Planification / automatisation**
   - Planifier l’exécution de la collecte à intervalle régulier (ex. cron dans `utils/cron.js`).
   - Permettre un lancement manuel (script Node) pour les tests / débogage.

3. **Persistance / sortie**
   - Stocker ou exposer les données collectées (fichier, console, ou futur service API selon le sujet exact).
   - Garantir un format de sortie clair : au minimum horodatage, identifiant de l’actif, valeur(s) collectée(s).

4. **Qualité / tests**
   - Mettre en place des **tests unitaires Jest** (voir `tests/getAssets.test.js`).
   - Couvrir au minimum :
     - Lecture de la configuration (`assets.json`).
     - Appel API et gestion des erreurs.

5. **Déploiement / industrialisation**
   - Fournir un `Dockerfile` permettant d’exécuter le collecteur.
   - Fournir au moins un manifeste k8s (ex. `k8s/collector/collector-cron.yaml`) pour une exécution planifiée en cluster.

## 3. Contraintes techniques

- **Langage** : Node.js (version indiquée dans `package.json`).
- **Librairies** : utilisation de `node-fetch` ou équivalent pour les appels HTTP, et de `node-cron` ou équivalent pour la planification (selon ce que tu as réellement utilisé).
- **Gestion de configuration** :
  - Fichier JSON pour la liste des actifs.
  - Variables d’environnement pour les paramètres sensibles (clé API, URL de base, etc.).
- **Conteneurisation** : image basée sur Node LTS, taille raisonnable (multi-stage build si demandé).

## 4. Contraintes non fonctionnelles

- **Robustesse** :
  - Pas de crash de l’application en cas d’erreur API ou de données incomplètes.
  - Journalisation minimale (logs niveau info/erreur).
- **Performance** :
  - Collecte raisonnablement rapide pour une dizaine / centaine d’actifs.
- **Maintenance** :
  - Code découpé par responsabilités : `services/`, `utils/`, `data/`.
  - Tests automatisables via `npm test`.

## 5. Livrables attendus

- **Code source** complet dans le dépôt `AMS_GLA`.
- **Tests Jest** passants.
- **Dockerfile** fonctionnel.
- **(Optionnel / sujet) Manifeste k8s** pour la planification.
- **Rapport AMS GLA** décrivant :
  - Conception.
  - Organisation du projet (KANBAN / AGILE).
  - Difficultés rencontrées et pistes d’amélioration.

## 6. Ce qui est actuellement présent dans le dépôt

- `collector/index.js`, `collector/services/coincapService.js`, `collector/utils/fetcher.js`, `collector/utils/cron.js` : squelette de l’application de collecte.
- `collector/data/assets.json` : configuration des actifs à suivre.
- `tests/getAssets.test.js` : début de tests Jest.
- `Dockerfile` : base de conteneurisation.
- `k8s/collector/collector-cron.yaml` : base de cron Kubernetes.
- `Rapport/` : PDF du rapport en cours (`Rapport_AMS_GLA_v2.pdf`).

Ce cahier des charges est volontairement synthétique : tu peux le détailler en reprenant précisément le sujet PDF dans la partie contexte et objectifs fonctionnels.