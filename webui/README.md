# Web UI AMS GLA

Cette petite interface web permet d’afficher le contenu de `collector/data/assets.json` dans un tableau, après un écran de connexion simulé.

## Lancer l’interface

Ouvre le fichier `webui/index.html` dans ton navigateur (idéalement via une petite extension de serveur statique dans VS Code, pour éviter certains problèmes de CORS avec `fetch`).

- Écran de connexion : entre un identifiant quelconque et valide.
- Appuie sur **Entrée** ou sur le bouton **Se connecter** : la connexion est simulée et tu arrives sur le tableau.
- Le tableau affiche les informations principales des cryptomonnaies présentes dans `collector/data/assets.json`.

Le design est volontairement sobre, sur fond sombre, avec un champ de recherche pour filtrer par nom ou symbole.
