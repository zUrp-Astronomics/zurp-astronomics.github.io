# CLAUDE.md — zurp-astronomics-site

**Date** : 2026-10-03
**Dernière révision** : 2026-10-03
**Statut** : actif — conventions du dépôt, lues par les agents et par la sonde de pertinence
**Référencé par** : `.gitea/workflows/ci.yml`, `.gitea/workflows/probe-test-relevance.yml`

## Le dépôt

Site vitrine statique de **zUrp Astronomics** (matériel d'astronomie amateur low-tech, DIY), en
Astro, publié sur GitHub Pages par `.github/workflows/deploy.yml`. Le catalogue vit dans
`src/data/products.ts` ; une page par produit. Le kit README de l'organisation (`readme-kit/`) est
généré depuis ce même catalogue. Le cadrage (pitch, contraintes, invariants) est dans `spec.md` de
l'atelier, côté workshop.

## Commandes

- `npm run dev` — serveur de développement.
- `npm run build` — build du site dans `dist/`.
- `npm run readme-kit` — régénère `readme-kit/` depuis `src/data/products.ts` (à lancer après toute
  modification du catalogue ; `npm run readme-kit:check` échoue s'il n'est pas à jour).

## Sections lues par machine

Les deux sections suivantes sont lues par machine : le rail prend le bloc de code de chacune, tel
quel. `## Test` est la commande de la suite, la même que les trois étapes du job `build` de
`.gitea/workflows/ci.yml`, jouée par `sh -e`. `## Harness` liste les chemins de preuve, séparés par
des espaces. Aucun autre texte ne doit entrer dans ces sections.

## Test

```sh
npm ci && npm run build && node scripts/check-dist.mjs && npm run readme-kit:check
```

## Harness

```
scripts/check-dist.mjs scripts/readme-kit.mjs
```
