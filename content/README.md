# content/ — les textes et les ressources du site

**Date** : 2026-10-06
**Dernière révision** : 2026-10-06
**Statut** : actif — tout texte destiné au lecteur vit ici ; le code (`src/`, `scripts/`) ne fait que le placer
**Référencé par** : `src/lib/content.mjs`, `src/lib/catalog/local.mjs`, `scripts/readme-kit.mjs`, `CLAUDE.md`

Une structure fixe d'un côté (`src/`, `scripts/`), les ressources de l'autre : ce dossier. Pour
changer un mot du site ou du README de l'organisation, on édite un fichier d'ici, jamais du code. Le
changement part au déploiement suivant (push sur `main`).

## Ce qui est où

| Fichier | Ce qu'il porte | Où ça sort |
|---|---|---|
| `site.yml` | le nom, l'accroche, la signature, l'organisation GitHub, les titres, libellés et textes alternatifs des pages | tout le site ; nom, accroche et signature aussi dans le README de l'org, le nom aussi sur les cartes d'aperçu |
| `catalog.yml` | les sections (ordre, titres), les libellés de statut (et la couleur de leur badge README), les produits sans dépôt | accueil, pages produit, README de l'org et en-têtes produit |
| `home/pitch.md` | le pitch, sur une ligne | accueil (étiquette de l'affiche), README de l'org (« Hi here ») |
| `home/manifesto.md` | le manifeste | accueil |
| `footer/legalese.md` | la ligne en petit du pied de page | toutes les pages |
| `licences/licences.yml` | les licences : nom, URL, libellé court, libellé de badge | pages produit, README |
| `licences/site.md` | la phrase de licence du site | pages produit (section « Source ») |
| `licences/org-readme.md` | la phrase de licence du README de l'org | README de l'org |
| `licences/product-readme.md` | la phrase de licence d'un en-tête produit (deux variantes) | en-têtes produit |
| `readme-kit/org-readme.md` | le gabarit du README de l'organisation | `zUrp-Astronomics/.github` → `profile/README.md` |
| `readme-kit/projects-table.md` | le tableau d'une liste de projets de ce README | idem |
| `readme-kit/product-header.md` | le gabarit de l'en-tête de README d'un produit | `…/.github` → `readme-kit/repos/<slug>.md` |
| `readme-kit/guide.md` | le gabarit du mode d'emploi du kit (en français) | `…/.github` → `readme-kit/README.md` |
| `readme-kit/kit.yml` | les textes courts partagés par ces gabarits | idem |
| `products/<slug>/` | un produit pas encore migré vers son dépôt : sa fiche `zurp.yml` et son affiche | une page `/<slug>/`, sa tuile, ses images `/brand/…`, ses lignes du README |

Les trois phrases de licence sont trois textes différents, exprès : chacune sert un lecteur.

## Les formats

- **YAML** (`.yml`) pour les données courtes. Un texte long s'écrit en bloc replié (`>-`) : les
  retours à la ligne y deviennent des espaces.
- **Markdown** (`.md`) pour la prose et les gabarits. Chaque fichier commence par un en-tête entre
  deux lignes `---` (date, statut, où il sert) : il ne fait jamais partie du texte. Dans la prose du
  site, un paragraphe se termine par une ligne vide ; `[texte](url "titre")` fait un lien ;
  `&nbsp;` est une espace insécable, gardée telle quelle.
- **Marqueurs** `{{…}}` (Mustache, sans logique) : le code les remplit, l'humain les place.
  `{{x}}` insère une valeur échappée pour le HTML (dans une balise : `alt="{{name}}"`), `{{{x}}}` la
  valeur telle quelle (dans du Markdown). `{{#liste}}…{{/liste}}` se répète pour chaque élément (et
  s'affiche si la valeur existe), `{{^x}}…{{/x}}` s'affiche quand `x` est absent ou vide.
  `{{> projects}}` insère `readme-kit/projects-table.md`. Dans les gabarits du kit,
  `{{#badge}}libellé|message|couleur{{/badge}}` écrit un badge shields.io. Ce que chaque gabarit
  reçoit est listé dans son en-tête (`Marqueurs`).

## Les produits pas encore migrés : `products/<slug>/`

Un dossier par produit, nommé par son slug (en minuscules : `/<slug>/` sur le site). Il contient
`zurp.yml`, **au format exact** de `9_Assets/zurp.yml` d'un dépôt produit, et l'affiche nommée
d'après le slug. Le site le lit et le valide avec le même code que les fiches des dépôts
(`src/lib/catalog/read.mjs`).

**Migrer un produit vers son dépôt = déplacer ce dossier** dans le `9_Assets/` du dépôt, sans rien
réécrire, puis le retirer d'ici (et, s'il y était, retirer son slug de `withoutRepository` dans
`catalog.yml`). Un slug présent ici ET dans un dépôt fait échouer le build ; un produit publié qui
disparaît aussi (`src/data/published-slugs.mjs`).

Le lien « Source » d'un produit d'ici est `https://github.com/zUrp-Astronomics/<slug>` — ou
l'organisation elle-même pour un produit listé dans `withoutRepository` de `catalog.yml` (Cyclops,
Wraith : pas encore de dépôt). Une fiche ne porte jamais de champ `repo` : il est déduit.
