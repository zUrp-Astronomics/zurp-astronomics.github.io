# Simulateur du catalogue

**Date** : 2026-10-06
**Dernière révision** : 2026-10-06
**Statut** : actif — source `ZURP_CATALOG=simulator` du build (tests, CI Gitea, essais)
**Référencé par** : `src/lib/catalog/source.mjs`, `src/lib/catalog/loader.mjs`, `CLAUDE.md` (`## Test`), `.gitea/workflows/ci.yml`

Des dépôts produit imités, lus par **le même code** que les dépôts de l'organisation sur GitHub
(`src/lib/catalog/` : seul le « backend » change). Les pods n'ont pas de réseau et la CI Gitea n'a
pas de jeton GitHub : c'est avec cette source que la suite de tests construit le site.

```
repos/<nom>/…              l'arbre du dépôt <nom> (branche par défaut) ; le site n'y lit que 9_Assets/
releases/<nom>.json        ses releases, comme l'API GitHub les liste ; absent = aucune release
```

- **basilisk** : `9_Assets/zurp.yml` et `9_Assets/poster.png` sont copiés **à l'octet près** du kit de
  l'atelier (`kit-depot-enfant/basilisk/9_Assets/`). Aucune release, comme le vrai dépôt au relevé du
  2026-10-06. Ne pas les modifier : le site construit sur le simulateur doit rester identique à
  celui d'avant la migration.
- **Rien d'autre ici.** Les cas qui n'existent pas dans l'organisation (une release, une
  prerelease, deux releases, une fiche invalide, un slug en double, un produit publié disparu) sont
  prouvés par les tests (`test/catalog.test.mjs`), dans des simulateurs temporaires : aucun produit
  fictif n'entre dans un build déployable.
- **Il n'est jamais déployé.** Le site n'est déployé que par `.github/workflows/deploy.yml`, sur
  GitHub Actions, où `ZURP_CATALOG=simulator` est refusé quoi que dise le workflow
  (`src/lib/catalog/source.mjs`).
