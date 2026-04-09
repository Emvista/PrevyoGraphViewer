# Prevyo Graph Viewer

Application web statique pour **visualiser un graphe** à partir du **JSON produit en sortie par Prevyo** (listes `nodes` et `edges`). Le rendu interactif utilise [vis-network](https://github.com/visjs/vis-network) (CDN unpkg).

## Démo en ligne

L’application est disponible à l’adresse **[https://emvista.github.io/PrevyoGraphViewer/](https://emvista.github.io/PrevyoGraphViewer/)**.

## Éditeur

Ce code est édité par **[Emvista](https://emvista.com)**. Emvista propose **[Prevyo Events](https://emvista.com/fr-prevyo-events/)**, la solution de veille stratégique basée sur la technologie Prevyo.

## Fonctionnalités

- Éditeur JSON à gauche, graphe à droite, avec **splitter** redimensionnable (largeur mémorisée dans le navigateur).
- Bouton **Afficher le graphe** pour re-parser le JSON et mettre à jour la vue.
- Les nœuds dont au moins un label contient `Event` sont affichés en **vert** (y compris au survol).
- Affichage des erreurs de parsing JSON dans l’interface (sans `alert`).
- Prêt pour un déploiement **GitHub Pages** (fichiers HTML/CSS/JS uniquement).

## Format JSON attendu

Le schéma correspond à la **sortie graphique Prevyo** : un objet racine avec :

- **`nodes`** : tableau d’objets (champs typiques : `id`, `form`, `labels`, `properties`, etc.).
- **`edges`** : tableau d’objets avec au minimum **`source`**, **`target`**, et éventuellement **`type`**, **`id`**.

## Fichiers principaux

| Fichier       | Rôle                                      |
| ------------- | ----------------------------------------- |
| `index.html`  | Page, métadonnées, CSP, version (`application-version`) |
| `app.js`      | Parsing, conversion vis-network, splitter |
| `styles.css`  | Mise en page et styles                    |

## Utilisation en local

Ouvrir `index.html` dans le navigateur, ou servir le dossier avec un serveur HTTP statique (recommandé pour éviter les écarts de comportement selon les navigateurs).
