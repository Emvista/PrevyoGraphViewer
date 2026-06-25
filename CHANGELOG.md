# Change log

## 0.2.0
* [JB] Filtre d'edges : possibilité de masquer les relations `ContextSmall` et `ContextLarge` depuis le header
* [JB] Séparation automatique des edges parallèles (même source et même cible) par des courbes distinctes (fix [#2](https://github.com/Emvista/PrevyoGraphViewer/issues/2))
* [JB] Correction de la longueur des edges pour que les labels soient lisibles sans chevauchement
* [JB] Amélioration du layout : les nœuds ne se superposent plus entre eux ni avec les edges (`avoidOverlap`)
* [JB] Thème sombre / clair avec bascule via un bouton en haut à droite, persisté en localStorag
* [JB] Le label des nœuds de type Event affiche uniquement le dernier segment du chemin (ex. `Thing/Abstract/Event/Attack` → `Attack`)

## 0.1.0
* [JB] First version