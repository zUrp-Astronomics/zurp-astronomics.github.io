# content/ — les textes et les ressources du site

**Date** : 2026-10-06
**Dernière révision** : 2026-10-06 (ticket #72 : découverte intégrale — le dépôt d'un produit d'ici est découvert, aucune liste de produits)
**Statut** : actif — tout texte destiné au lecteur vit ici ; le code (`src/`, `scripts/`) ne fait que le placer
**Référencé par** : `src/lib/content.mjs`, `src/lib/catalog/local.mjs`, `src/lib/status-badge.mjs`, `src/lib/license-stamp.mjs`, `scripts/readme-kit.mjs`, `CLAUDE.md`

Une structure fixe d'un côté (`src/`, `scripts/`), les ressources de l'autre : ce dossier. Pour
changer un mot du site ou du README de l'organisation, on édite un fichier d'ici, jamais du code. Le
changement part au déploiement suivant (push sur `main`).

## Ce qui est où

| Fichier | Ce qu'il porte | Où ça sort |
|---|---|---|
| `site.yml` | le nom, l'accroche, l'affiliation (« a subsidiary of… », écrite une fois : la signature et la ligne produit du pied de page la reprennent), la signature, l'organisation GitHub, les titres, libellés et textes alternatifs des pages (dont `product.licenseOther`, le tampon d'une licence que GitHub ne reconnaît pas) | tout le site ; nom, accroche et signature aussi dans le README de l'org, le nom aussi sur les cartes d'aperçu |
| `catalog.yml` | les sections (ordre, titres), les libellés de statut (et la couleur de leur badge README), les textes du badge de statut (`statusBadge`) | accueil, pages produit, README de l'org et JSON de statut des badges (`/brand/status/<slug>.json`, rendu par shields.io dans l'en-tête de chaque README produit) |
| `home/pitch.md` | le pitch, sur une ligne | accueil (étiquette de l'affiche), README de l'org (« Hi here ») |
| `home/manifesto.md` | le manifeste | accueil |
| `footer/legalese.md` | la ligne en petit du pied de page | toutes les pages |
| `readme-kit/org-readme.md` | le gabarit du README de l'organisation | `zUrp-Astronomics/.github` → `profile/README.md` |
| `readme-kit/projects-table.md` | le tableau d'une liste de projets de ce README | idem |
| `readme-kit/product-header.md` | le gabarit de l'en-tête de README d'un produit, collé une fois : que des URL (affiche, badge de statut), aucun texte de la fiche | `…/.github` → `readme-kit/repos/<slug>.md` |
| `readme-kit/guide.md` | le gabarit du mode d'emploi du kit (en français) | `…/.github` → `readme-kit/README.md` |
| `readme-kit/kit.yml` | les textes courts partagés par ces gabarits (dont `header` : marqueurs, commentaire et textes alternatifs de l'en-tête produit) | idem |
| `products/<slug>/` | un produit pas encore migré vers son dépôt : sa fiche `zurp.yml` et son affiche | une page `/<slug>/`, sa tuile, ses images `/brand/…`, ses lignes du README |

**Les licences ne sont pas ici.** La licence d'un produit, c'est le fichier `LICENSE` à la racine
de son dépôt, telle que GitHub la détecte : la page du produit l'affiche (un tampon, son identifiant
SPDX, ou `product.licenseOther` de `site.yml` quand GitHub ne la reconnaît pas), et rien quand il
n'y en a pas — pas de dépôt, ou un dépôt sans `LICENSE`. Le site ne tient aucune règle de licence,
et le README de l'organisation n'en affiche aucune. Pour changer la licence d'un produit, on change
le `LICENSE` de son dépôt.

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
réécrire, puis le retirer d'ici. Tant qu'il est aux deux endroits, la fiche du dépôt gagne et ce
dossier est ignoré, avec un avertissement dans le rapport du build ; si la fiche du dépôt est
invalide, le dépôt est sauté et ce dossier reste publié. Aucune liste de produits n'est tenue à la
main : le site publie ce qu'il découvre, dans les dépôts de l'organisation et ici. Une fiche
invalide **ici** fait échouer le build.

Le lien « Source » d'un produit d'ici est **découvert** : le dépôt de l'organisation qui porte son
nom (casse ignorée — `Kaiju` pour `kaiju`), à son URL telle que GitHub la donne, et sa licence est
celle que GitHub détecte dans ce dépôt. S'il n'a pas de dépôt (Cyclops, Wraith), le lien mène à
l'organisation elle-même, sans licence ; le jour où le dépôt est créé, le build suivant le trouve.
Une fiche ne porte jamais de champ `repo` : il est déduit.
