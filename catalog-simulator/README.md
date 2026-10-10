# Simulateur du catalogue

**Date** : 2026-10-06
**Dernière révision** : 2026-10-10 (ticket #92 : cyclops et wraith ont leur fiche ici ; il imite les huit dépôts produit de l'organisation, seule source hors ligne du catalogue)
**Statut** : actif — source `ZURP_CATALOG=simulator` du build (tests, CI Gitea)
**Référencé par** : `src/lib/catalog/source.mjs`, `src/lib/catalog/loader.mjs`, `CLAUDE.md` (`## Test`)

Des dépôts produit imités, pour construire le site sans réseau ni jeton GitHub. Ils sont lus par le
même code que les dépôts de l'organisation (`src/lib/catalog/source.mjs`) : seul le « backend » change.

```
repos/<nom>/…          l'arbre du dépôt <nom> : 9_Assets/zurp.yml et son affiche, LICENSE-HARDWARE
releases/<nom>.json    ses releases, comme l'API GitHub les liste ; absent = aucune release
licenses/<nom>.json    sa licence, comme l'API GitHub la donne dans la liste des dépôts ; absent = aucune
```

Les noms de dossier sont en minuscules : ils font l'URL du dépôt, donc le lien « Source ».

**Il n'est jamais déployé** : sur GitHub Actions, d'où le site est déployé, `ZURP_CATALOG=simulator`
est refusé.
