# CLAUDE.md — zurp-astronomics-site

Site vitrine statique de **zUrp Astronomics** (matériel d'astronomie amateur low-tech, DIY), en
Astro, publié sur GitHub Pages par `.github/workflows/deploy.yml`.

## Stack

- Astro (Node 24, `engines` de `package.json`), ESM. Une structure fixe d'un côté (`src/`,
  `scripts/` : structure et logique), les ressources de l'autre : **`content/`**, à la racine, porte
  tout texte destiné au lecteur (YAML pour les données courtes, Markdown pour la prose et les
  gabarits, marqueurs Mustache). `content/README.md` dit ce qui est où ; `src/lib/content.mjs` le lit.
- Le catalogue est lu au build dans les dépôts produit de l'organisation (`9_Assets/zurp.yml` +
  releases GitHub, `src/lib/catalog/`), plus les produits pas encore migrés,
  `content/products/<slug>/` (une fiche `zurp.yml` au format des dépôts et son affiche, validées par
  le même code ; migrer = déplacer le dossier). Une page par produit.
- La source du catalogue est toujours nommée par `ZURP_CATALOG` : `github` (déploiement) ou
  `simulator` (`catalog-simulator/`, hors ligne — voir son `README.md`).
- Le kit README de l'organisation est généré au déploiement depuis ce même catalogue, par les
  gabarits de `content/readme-kit/` (`scripts/readme-kit.mjs`) ; `readme-kit/README.md` dit où il
  est publié.

## Commands

- `ZURP_CATALOG=simulator npm run dev` — serveur de développement (catalogue du simulateur).
- `ZURP_CATALOG=simulator npm run build` — build du site dans `dist/` ; `ZURP_CATALOG=github` lit
  l'organisation sur GitHub (jeton facultatif dans `ZURP_GITHUB_TOKEN`).
- `node scripts/check-dist.mjs` — après un build : contrôle `dist/` (poids des images, une page par
  produit, cartes d'aperçu).
- `npm run readme-kit` — après un build : écrit le kit README dans `.zurp-catalog/readme-kit/`
  depuis le catalogue construit et les gabarits de `content/readme-kit/`.
- `npm test` — tests du code de lecture du catalogue et de `content/` (`test/`) ; un seul test :
  `node --test --test-name-pattern='<motif>' test/catalog.test.mjs`.

## Conventions

- Changer un texte : éditer `content/` (jamais `src/` ni `scripts/`), puis les commandes ci-dessus
  pour le voir. Aucun texte destiné au lecteur dans le code.
- Le site publie le kit README de l'organisation et la norme des dépôts produit (arborescence,
  nommage des fichiers de carte : § 5 de `content/readme-kit/guide.md`) ; il ne commite pas le kit.
- Les produits pas encore migrés vivent dans `content/products/<slug>/` ; aucune liste de produits
  n'est tenue à la main (le site publie ce qu'il découvre). Règles de migration : `content/README.md`.

## Gotchas

- `ZURP_CATALOG` n'a aucun défaut : un build sans source échoue, et `simulator` est refusé sur
  GitHub Actions. En local et en CI Gitea, toujours `ZURP_CATALOG=simulator`.
- `npm run readme-kit` et `scripts/check-dist.mjs` lisent le catalogue construit
  (`.zurp-catalog/`, ignoré par git) : lance un build avant.
- Un slug présent à la fois dans un dépôt produit et dans `content/products/` : la fiche du dépôt
  gagne, le dossier local est ignoré. Une fiche invalide dans `content/products/` fait échouer le
  build.

## Test

```sh
npm ci && ZURP_CATALOG=simulator npm run build && node scripts/check-dist.mjs && npm run readme-kit && npm test
```

## Harness

```
scripts/check-dist.mjs test/catalog.test.mjs
```
