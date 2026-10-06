# CLAUDE.md — zurp-astronomics-site

**Date** : 2026-10-03
**Dernière révision** : 2026-10-06
**Statut** : actif — conventions du dépôt, lues par les agents et par la sonde de pertinence
**Référencé par** : `.gitea/workflows/ci.yml`, `.gitea/workflows/probe-test-relevance.yml`

## Le dépôt

Site vitrine statique de **zUrp Astronomics** (matériel d'astronomie amateur low-tech, DIY), en
Astro, publié sur GitHub Pages par `.github/workflows/deploy.yml`. Le catalogue est lu au build
dans les dépôts produit de l'organisation (`9_Assets/zurp.yml` + releases GitHub,
`src/lib/catalog/`), plus les produits pas encore migrés de `src/data/products.ts` ; une page par
produit. La source est toujours nommée par `ZURP_CATALOG` : `github` (déploiement) ou `simulator`
(`catalog-simulator/`, hors ligne) — aucun défaut, un build sans source échoue. Le kit README de
l'organisation est généré au déploiement depuis ce même catalogue (`scripts/readme-kit.mjs`). Le
cadrage (pitch, contraintes, invariants) est dans `spec.md` de l'atelier, côté workshop.

## Commandes

- `ZURP_CATALOG=simulator npm run dev` — serveur de développement (catalogue du simulateur).
- `ZURP_CATALOG=simulator npm run build` — build du site dans `dist/` ; `ZURP_CATALOG=github` lit
  l'organisation sur GitHub (jeton facultatif dans `ZURP_GITHUB_TOKEN`).
- `npm run readme-kit` — après un build : écrit le kit README dans `.zurp-catalog/readme-kit/`
  depuis le catalogue construit.
- `npm test` — tests du code de lecture du catalogue (`test/`).

## Sections lues par machine

Les deux sections suivantes sont lues par machine : le rail prend le bloc de code de chacune, tel
quel. `## Test` est la commande de la suite, la même que les quatre étapes du job `build` de
`.gitea/workflows/ci.yml`, jouée par `sh -e`. `## Harness` liste les chemins de preuve, séparés par
des espaces. Aucun autre texte ne doit entrer dans ces sections.

## Test

```sh
npm ci && ZURP_CATALOG=simulator npm run build && node scripts/check-dist.mjs && npm run readme-kit && npm test
```

## Harness

```
scripts/check-dist.mjs test/catalog.test.mjs
```
