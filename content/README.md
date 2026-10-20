# content/ — les textes et les ressources du site

**Date** : 2026-10-06
**Dernière révision** : 2026-10-20 (ticket #115 : le pied de page des README produit, `readme-kit/product-footer.md` et `kit.yml` `footer` ; la signature, dessinée en image depuis `site.yml`) — 2026-10-20 (ticket #111 : les onglets du manuel d'un produit, leurs titres dans `site.yml` `product.manual` ; la norme du manuel, § 7 de `readme-kit/guide.md`) — 2026-10-16 (ticket #107 : le banc web d'un produit dans le bloc « Install », `site.yml` `product.install.bench`) — 2026-10-12 (ticket #101 : le bloc « Install » des pages produit remplace le bloc « Flash » d'ESP Launchpad, `site.yml` ; la norme de publication d'un logiciel, § 6 de `readme-kit/guide.md`)
**Statut** : actif — tout texte destiné au lecteur vit ici ; le code (`src/`, `scripts/`) ne fait que le placer
**Référencé par** : `src/lib/content.mjs`, `src/lib/status-badge.mjs`, `src/lib/license-stamp.mjs`, `src/lib/license-badge.mjs`, `src/lib/signature-image.mjs`, `scripts/readme-kit.mjs`, `CLAUDE.md`

Une structure fixe d'un côté (`src/`, `scripts/`), les ressources de l'autre : ce dossier. Pour
changer un mot du site ou du README de l'organisation, on édite un fichier d'ici, jamais du code. Le
changement part au déploiement suivant (push sur `main`).

## Ce qui est où

| Fichier | Ce qu'il porte | Où ça sort |
|---|---|---|
| `site.yml` | le nom, l'accroche, l'affiliation (« a subsidiary of… », écrite une fois : la signature et la ligne produit du pied de page la reprennent), la signature, l'organisation GitHub, les titres, libellés et textes alternatifs des pages ; le bloc « Install » d'une page produit (`product.install` : titre, version, bouton ESP, liens de téléchargement et leurs notices, et le banc web : son intro, son bouton, son lien « nouvel onglet », le bouton qui le ferme, le nom de son cadre) ; les titres des onglets du manuel d'un produit (`product.manual.tabs` : Overview, Assembly, Setup, Usage) et le nom de leur rangée pour les lecteurs d'écran (`product.manual.label`) | tout le site ; nom, accroche et signature aussi dans le README de l'org, le nom aussi sur les cartes d'aperçu ; la signature et le sous-titre (`header.subtitle`) aussi sur l'image de signature du pied de page des README produit (`/brand/signature.png`) |
| `catalog.yml` | les sections (ordre, titres), les libellés de statut (et la couleur de leur badge README), les textes du badge de statut (`statusBadge`) | accueil, pages produit, README de l'org et JSON de statut des badges (`/brand/status/<slug>.json`, rendu par shields.io dans l'en-tête de chaque README produit) |
| `licences.yml` | le vocabulaire des deux licences d'un produit : le texte des tampons « Software · … » et « Hardware · … », le libellé générique d'une licence non reconnue, le libellé et la couleur des badges de licence, la table des titres de licences matérielles (titre officiel → libellé court, nom complet) | pages produit (tampons), en-tête de README de chaque produit (badges `/brand/badges/<slug>/software.svg` et `hardware.svg`) |
| `home/pitch.md` | le pitch, sur une ligne | accueil (étiquette de l'affiche), README de l'org (« Hi here ») |
| `home/manifesto.md` | le manifeste | accueil |
| `footer/legalese.md` | la ligne en petit du pied de page | toutes les pages |
| `readme-kit/org-readme.md` | le gabarit du README de l'organisation | `zUrp-Astronomics/.github` → `profile/README.md` |
| `readme-kit/projects-table.md` | le tableau d'une liste de projets de ce README | idem |
| `readme-kit/product-header.md` | le gabarit de l'en-tête de README d'un produit, collé une fois : que des URL (affiche, badge de statut, badges de licence logicielle et matérielle), aucun texte de la fiche | `…/.github` → `readme-kit/repos/<slug>.md` |
| `readme-kit/product-footer.md` | le gabarit du pied de page des README produit, le même pour tous, collé une fois à la fin à la place de la signature écrite à la main : la plaque émaillée et la signature (images servies par le site), les liens vers le site et l'org | `…/.github` → `readme-kit/footer.md` |
| `readme-kit/guide.md` | le gabarit du mode d'emploi du kit (en français), dont les normes des dépôts produit : README (§ 2), arborescence (§ 5), publication d'un logiciel (§ 6), manuel d'un produit (§ 7) | `…/.github` → `readme-kit/README.md` |
| `readme-kit/kit.yml` | les textes courts partagés par ces gabarits (dont `header` : marqueurs, commentaire et textes alternatifs de l'en-tête produit ; `footer` : ceux du pied de page, et les libellés de ses liens) | idem |

**Les licences des produits ne sont pas ici**, seulement leur vocabulaire (`licences.yml`). Un
produit a deux licences, chacune déclarée par un fichier à la racine de son dépôt :

- la licence **logicielle**, le fichier `LICENSE`, telle que GitHub la détecte : le tampon porte son
  identifiant SPDX (« Software · GPL-3.0 »), ou le libellé générique (`software.unrecognised`) quand
  GitHub ne la reconnaît pas ;
- la licence **matérielle**, le fichier `LICENSE-HARDWARE`, reconnue à sa première ligne non vide
  dans la table `hardware.titles` (casse et espaces ignorés) : le tampon porte son libellé court
  (« Hardware · OCL v1.1 »), ou le libellé générique (`hardware.unrecognised`) pour un titre absent
  de la table.

Un fichier absent (ou vide) : rien pour cette licence, ni tampon ni badge — jamais une erreur. Le
site n'invente ni ne corrige aucune licence : il affiche ce que le dépôt déclare, à l'endroit où il
le déclare. Le README de l'organisation n'en affiche aucune. Pour changer la licence d'un produit,
on change le fichier de son dépôt ; pour qu'une licence matérielle de plus soit nommée, on ajoute son
titre officiel à `hardware.titles`.

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

## Les produits : dans leur dépôt, pas ici

Aucun produit n'est décrit dans ce dossier. Chaque produit a son dépôt dans l'organisation, qui porte
sa fiche `9_Assets/zurp.yml` et son affiche : le site les lit au build, avec ses releases et ses
licences (`src/lib/catalog/`), et publie ce qu'il y découvre — aucune liste de produits n'est tenue à
la main. Le lien « Source » d'un produit est son dépôt. Pour changer le texte d'un produit, on change
sa fiche, dans son dépôt.

## Les logiciels : dans les releases des produits, pas ici

Un produit publie son logiciel dans une release de son dépôt (la norme : § 6 de
`readme-kit/guide.md`) : pour un ESP, un `manifest.json` d'ESP Web Tools et ses images ; pour un
STM32, un `.hex` ; pour un Raspberry Pi, un `.img.xz`. Sa page porte alors un bloc « Install » (ancre
`#install`) : le bouton d'ESP Web Tools, ou les liens de téléchargement, chacun suivi de sa notice.
Quand la même release joint un banc web (`<produit>_<version>_bench.html`), le bloc porte aussi un
bouton qui l'ouvre par-dessus la page et un lien qui l'ouvre dans un nouvel onglet.
Ici ne vivent que les mots de ce bloc (`site.yml`, `product.install`, le banc sous
`product.install.bench`) ; `{{tag}}` y est le tag de la release installée, `{{file}}` le nom d'un
fichier à télécharger, `{{product}}` (dans `bench.frame`) le nom du produit. Aucun texte sur les
navigateurs : quand un navigateur ne sait pas installer, ESP Web Tools le dit lui-même. Un produit
sans rien à installer n'a pas de bloc, ni de banc.

## Les manuels : dans les dépôts des produits, pas ici

Le manuel d'un produit est écrit par son projet, dans son dépôt : `9_Assets/manual/`, un fichier
Markdown par onglet et par langue (la norme : § 7 de `readme-kit/guide.md`). Sa page porte alors des
onglets, dans cet ordre : Overview, Assembly, Setup, Usage — chacun seulement quand son fichier
existe ; le bloc « Install » est dans l'onglet Setup, et l'onglet Overview remplace la section
« About ». Ici ne vivent que les **titres des onglets** (`site.yml`, `product.manual.tabs`), les
mêmes sur toutes les pages, et le nom de leur rangée pour les lecteurs d'écran
(`product.manual.label`, `{{product}}` : le nom du produit). Un produit sans manuel garde sa page
sans onglets.
