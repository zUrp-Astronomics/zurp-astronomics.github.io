---
Date: 2026-10-06
Dernière révision: 2026-10-21 (ticket #119 : § 7, la table des onglets tirée du vocabulaire de `site.yml`, un nom hors vocabulaire signalé au build et non publié, demander un onglet à l'architecte du site) — 2026-10-20 (ticket #115 : § 2, le bloc de pied de page des README produit, `footer.md`, collé une fois à la fin à la place de la signature écrite à la main) — 2026-10-20 (ticket #113 : § 2, la norme du README produit — français puis anglais, la ligne de langue et son ancre, le projet écrit le fond et l'architecte du site relit la forme, la section Assembly, une liste de sections ouverte, le ton) — 2026-10-20 (ticket #111 : § 7, le manuel d'un produit, `9_Assets/manual/` ; § 6, le bloc Install dans l'onglet Setup ; § 5, `manual/` dans `9_Assets/`) — 2026-10-16 (ticket #107 : § 6, le banc web d'un produit, `<produit>_<version>_bench.html`) — 2026-10-13 (ticket #102 : § 6, la phrase de README ESP nomme Firefox, Chrome et Edge, les navigateurs d'ESP Web Tools ; ticket #101 : § 6 réécrit, « Publier un logiciel » — ESP Web Tools, `.hex`, `.img.xz`, ESP Launchpad abandonné ; ticket #98 : § 6, le nom réel du secret du signal ; ticket #96 : § 6, publier un firmware flashable par ESP Launchpad)
Statut: actif — gabarit du mode d'emploi du kit (zUrp-Astronomics/.github → readme-kit/README.md), en français
Référencé par: scripts/readme-kit.mjs
Marqueurs: siteUrl, orgUrl, orgSettingsUrl, avatarUrl, begin / end (kit.yml, header), footerBegin / footerEnd (kit.yml, footer), plateUrl (la plaque émaillée du pied de page), signatureUrl (la signature du pied de page, dessinée depuis site.yml), statusJsonUrl (l'adresse du JSON de statut, `<produit>` à la place du slug), softwareBadgeUrl / hardwareBadgeUrl (les adresses des badges de licence, idem) ; products (name, slug, repo, repoPath, socialUrl) ; espManifest (le nom exact du manifeste ESP), espWebToolsVersion (la version d'ESP Web Tools que charge le site), espChipFamilies (ses familles de puces, séparées par des virgules), siteRepo (le dépôt du site, `owner/nom`, à qui envoyer le signal) ; manualTabs (le vocabulaire des onglets du manuel, `site.yml` `product.manual.tabs`, dans l'ordre de la page : id, title, holds, last pour le dernier), manualLangs (les langues d'un fichier de manuel, séparées par des virgules). Le § 6 change de délimiteurs (`<% %>`) le temps d'un extrait de workflow, dont les `${{ … }}` ne sont pas des marqueurs
---

# Kit README — mode d'emploi

**Date** : 2026-10-03
**Dernière révision** : 2026-10-21
**Statut** : généré par `scripts/readme-kit.mjs` (dépôt du site) à chaque déploiement — ne pas éditer à la main
**Référencé par** : `.github/workflows/deploy.yml` du site (job « README de l'org »), `readme-kit/README.md` du site

<!-- {{{generated}}} -->

Ce dossier (`readme-kit/` du dépôt [zUrp-Astronomics/.github]({{{orgUrl}}}/.github)) et le README de
l'organisation (`profile/README.md`, même dépôt) sont **régénérés à chaque déploiement du site**
({{{siteUrl}}}), depuis le catalogue avec lequel le site vient d'être construit : noms, accroches,
slogans, statuts, sections, ordre, « based on » et liens sont ceux du site en ligne.
N'édite aucun de ces fichiers : ils sont écrasés au déploiement suivant. Pour changer un texte,
change la fiche du produit (`9_Assets/zurp.yml` de son dépôt).

Le travail est fait par le workflow GitHub Actions `.github/workflows/deploy.yml` du dépôt du
site : construction, déploiement, puis copie du kit ici (job « README de l'org »). Il tourne à chaque
push sur `main` du site, à chaque signal `zurp-catalog` envoyé par un dépôt produit (release
publiée, `9_Assets/` modifié), ou à la main (onglet **Actions** du site → « Deploy to GitHub
Pages » → **Run workflow**).

## 1. README de l'organisation

`profile/README.md` est le README affiché sur la page de l'organisation. **Ne le modifie pas à la
main** : il est réécrit à chaque déploiement.

Le job s'authentifie avec le secret d'Actions `README_SYNC_TOKEN` du dépôt du site (jeton à accès
fin, Contents en lecture-écriture sur le seul dépôt `.github`). S'il échoue, c'est probablement le
jeton : expiré, pas encore approuvé par l'organisation, ou branche protégée dans `.github`. Le
site, lui, est déjà déployé à ce moment-là.

**Où mènent les liens.** Dans la liste des projets, la miniature et le nom mènent tous deux à la page
du produit sur le site (`{{{siteUrl}}}/<produit>/`). Le petit badge **GitHub** placé après l'accroche, et
lui seul, mène au dépôt du produit. Dans une section, le produit dont la release
est la plus récente vient en tête ; les produits sans release suivent, par ordre alphabétique.

## 2. En-tête et pied de page de README de chaque produit

Pour chaque produit, copie le bloc de `repos/<produit>.md` (ce dossier) **en tête** du `README.md`
de son dépôt, **une seule fois**. Le bloc va du commentaire `<!-- {{{begin}}} … -->` au commentaire
`<!-- {{{end}}} -->`, tous deux inclus. Il ne contient que des adresses, dont le contenu est servi
ailleurs : **il se met à jour seul** quand le site se reconstruit (release publiée dans un dépôt,
`9_Assets/` modifié). Ne le recolle pas, ne le modifie pas. Le texte du README (titre, présentation,
documentation) s'écrit à la main sous le bloc, comme dans tout dépôt.

Dans l'ordre :

- **L'affiche** du produit, `9_Assets/<produit>.webp` du dépôt lui-même, en chemin relatif : elle s'affiche aussi dans un clone hors ligne. Elle mène à la page du produit sur le site.
- **Le badge de statut**, dessiné par shields.io depuis `{{{statusJsonUrl}}}`, que le site réécrit à
  chaque build : le statut du produit et, s'il en a une, le tag de sa dernière release.
- **Le badge de licence logicielle**, `{{{softwareBadgeUrl}}}`, dessiné par le site à chaque build :
  la licence du fichier `LICENSE` à la racine du dépôt, telle que GitHub la détecte (`MIT`,
  `GPL-3.0`…).
- **Le badge de licence matérielle**, `{{{hardwareBadgeUrl}}}`, dessiné de même : la licence du
  fichier `LICENSE-HARDWARE` à la racine du dépôt, reconnue à sa première ligne, son titre officiel
  (« Open Community License (OCL v1.1) » donne `OCL v1.1`).

Un dépôt sans `LICENSE`, ou sans `LICENSE-HARDWARE`, n'affiche rien à la place du badge
correspondant : l'image existe, vide. Le badge apparaît au build du site qui suit l'arrivée du
fichier, sans toucher au README. La page du produit sur le site porte les mêmes licences, en deux
tampons « Software · … » et « Hardware · … ».

GitHub met en cache les images des README : après un build, un badge peut montrer l'ancienne valeur
pendant quelques minutes.

**Un bloc collé avant cette version** (affiche et badge de statut seulement, ou avec l'ancien badge
de licence de GitHub, `![licence](https://img.shields.io/github/license/…)`) : **recolle-le une
fois**, marqueurs compris, pour recevoir les deux badges de licence. Un dépôt qui porte encore un
ancien en-tête (nom, slogan, badges de licence, phrase de licence) : remplace-le de même, une
dernière fois, par ce bloc.

**Le pied de page**, le même pour tous les produits. Copie le bloc de `footer.md` (ce dossier :
[`zUrp-Astronomics/.github` → `readme-kit/footer.md`]({{{orgUrl}}}/.github/blob/main/readme-kit/footer.md))
**à la fin** du `README.md` de chaque dépôt, après les deux parties de langue, **une seule fois**. Le
bloc va du commentaire `<!-- {{{footerBegin}}} … -->` au commentaire `<!-- {{{footerEnd}}} -->`, tous
deux inclus. Il **remplace la signature écrite à la main** : un README n'a pas d'autre signature.
Comme l'en-tête, il ne contient que des adresses, et il **se met à jour seul** : ne le recolle pas,
ne le modifie pas. Dans l'ordre :

- **La plaque émaillée** zUrp Astronomics, {{{plateUrl}}}, la photo de l'en-tête du site. Elle mène
  au site.
- **La signature**, {{{signatureUrl}}}, une image que le site dessine à chaque build depuis ses
  textes (`content/site.yml` du dépôt du site : `signature` et `header.subtitle`) : changer la
  signature, c'est changer ce fichier, et tous les README suivent au build suivant (après le cache de
  GitHub, quelques minutes). Elle se lit sur le fond clair comme sur le fond sombre de GitHub.
- **Les liens** vers le site et vers l'organisation GitHub, en texte.

**Un README qui porte encore une signature écrite à la main** (`<p align="center"><sub><a
href="{{{siteUrl}}}/">zUrp Astronomics</a> — a subsidiary of zUrp Industries. …</sub></p>`, ou toute
autre) : remplace-la par ce bloc, une dernière fois.

**La norme du README produit** (décisions de l'humain, 2026-10-10 et 2026-10-20). Elle vaut pour
tous les produits. Le README de [Basilisk]({{{orgUrl}}}/Basilisk) est le premier à la suivre : il
sert de modèle, la norme reste générique.

**Qui écrit quoi.** Le **projet écrit le fond** de son README, dans les deux langues, et de
`9_Assets/` : sa fiche, son manuel (§ 7), ses images. **L'architecte du site tient la forme** :
cette norme, les blocs communs, et une relecture de forme avant la première publication du README et
avant chaque release. Le projet lui envoie ses fichiers ; l'architecte du site renvoie des
corrections de forme, jamais une réécriture du fond. En cas de désaccord, l'humain tranche. Le bloc
d'en-tête et le bloc de pied de page ne sont ni écrits ni modifiés par le projet (ci-dessus).

**Deux langues : le français, puis l'anglais.** Les deux parties portent les mêmes sections, dans le
même ordre. De haut en bas :

1. **La tête commune**, une seule fois : le bloc d'en-tête ; le nom en titre centré, le slogan
   dessous ; une barre de liens (site, documentation si `7_Docs/` existe, releases, organisation) ;
   la bannière de statut quand il y en a une (`wip` : « Work in progress — do not build yet » ;
   `future` : « Design phase »).
2. **La ligne de langue**, sous la tête : elle mène à la partie anglaise par une ancre.
3. **La partie française**, de `## Pourquoi <Nom> ?` à `## Licence`.
4. **La partie anglaise**, de `## Why <Nom>?` à `## License`. Elle commence par ce titre, et c'est
   son ancre que vise la ligne de langue.
5. **Le bloc de pied de page**, une seule fois, qui ferme le fichier : il porte la signature (ci-dessus),
   à la place de toute signature écrite à la main.

Le squelette, sur l'exemple de Basilisk (`…` : ce que le projet écrit) :

```markdown
<!-- {{{begin}}} … -->
… le bloc d'en-tête de repos/<produit>.md, collé une fois …
<!-- {{{end}}} -->

<h1 align="center">Basilisk</h1>

<p align="center"><strong><em>Bend the glass to your will</em></strong></p>

<p align="center">… la barre de liens …</p>

<p align="center"><strong>Français</strong> · <a href="#why-basilisk"><strong>English below</strong></a></p>

---

## Pourquoi Basilisk ?
…
## Licence
…

---

## Why Basilisk?
…
## License
…

---

<!-- {{{footerBegin}}} … -->
… le bloc de pied de page de footer.md, collé une fois …
<!-- {{{footerEnd}}} -->
```

**L'ancre de la ligne de langue** est celle que GitHub donne au titre `## Why <Nom>?` : le texte du
titre en minuscules, chaque espace remplacé par `-`, la ponctuation retirée (`?`, `.`, `&`… ; les
`-` et `_` restent). `## Why Basilisk?` donne `#why-basilisk` ; un nom en deux mots, `## Why Iron
Maiden?`, donne `#why-iron-maiden`.

**Les sections**, dans chaque langue, dans cet ordre :

| partie anglaise | partie française |
|---|---|
| `## Why <Nom>?` | `## Pourquoi <Nom> ?` |
| `## At a glance` | `## En bref` |
| `## Hardware` | `## Matériel` |
| `## Assembly` | `## Assemblage` |
| `## Software` | `## Logiciel` |
| `## Build` | `## Fabrication` |
| `## Documentation` | `## La documentation` |
| `## Status & roadmap` | `## État et feuille de route` |
| `## Credits` | `## Remerciements` |
| `## Repository layout` | `## Contenu du dépôt` |
| `## License` | `## Licence` |

`Why <Nom>?` est le paragraphe qui promet de ridiculiser l'équivalent du commerce, bâti uniquement sur
des faits du dépôt ; `At a glance`, les caractéristiques. **La liste n'est pas fermée** : un projet
ajoute la section dont il a besoin, à sa place (Basilisk a une section `Flash`, entre `Software` et
`Build`). **Une section n'existe que si le dépôt a de quoi la remplir** : un produit qui n'a rien à
assembler n'a pas de section Assembly.

**Assembly** résume l'assemblage : les pièces, les grandes étapes. Elle vient après Hardware et
renvoie au détail : l'information brute reste dans les dossiers du dépôt (`1_Board/`, `2_Hardware/`,
`3_3D-Models/`), le pas-à-pas complet dans l'onglet Assembly du manuel de la page produit (§ 7).

**Le ton**, que relit l'architecte du site : une seule voix, « we » / « nous », comme le manifeste du
site ; aucun texte qui vieillit (date relative, « cette semaine », numéro de version écrit dans la
prose) — un état plutôt qu'une date. `Why <Nom>?` reste bâti uniquement sur des faits du dépôt.

**Les images et la documentation.** Toute image est un chemin relatif vers `9_Assets/`, en WebP à la
taille d'affichage ; l'original reste là où il est produit. Le détail technique vit dans `7_Docs/`,
au projet.

**Les deux fichiers de licence.** `LICENSE` porte la licence **logicielle** (MIT, GPL…) : c'est
celle que GitHub reconnaît et affiche dans l'encadré « About » du dépôt. `LICENSE-HARDWARE` porte la
licence **matérielle** (OCL v1.1, CERN-OHL…), son titre officiel en première ligne. Le site ne
déplace ni ne corrige aucune licence : il affiche ce que le dépôt déclare, à l'endroit où il le
déclare — une licence matérielle posée dans `LICENSE` s'affiche comme la licence logicielle du
produit.

## 3. Carte d'aperçu (Social preview) de chaque dépôt

Chaque dépôt a sa carte, 1280 × 640 px, JPEG de moins de 1 Mo, servie par le site à une URL stable.
Ouvre l'URL, enregistre l'image, puis dans le dépôt : **Settings → General → Social preview → Edit →
Upload an image…** Les cartes sont produites par le build du site : elles sont en ligne une fois le
site déployé.

| Produit | En-tête à coller | Dépôt GitHub | Carte d'aperçu à téléverser |
|---|---|---|---|
{{#products}}
| {{{name}}} | [`repos/{{{slug}}}.md`](repos/{{{slug}}}.md) | [{{{repoPath}}}]({{{repo}}}) | {{{socialUrl}}} |
{{/products}}

## 4. Avatar de l'organisation

L'avatar (le télescope steampunk, dessin complet, 480 × 480 px, PNG) est servi par le site à
{{{avatarUrl}}} : enregistre l'image, puis téléverse-la dans les **Settings** de l'organisation
({{{orgSettingsUrl}}}), rubrique **Profile picture** (**Edit → Upload a photo…**). Il est produit
par le build du site : en ligne une fois le site déployé.

## 5. Arborescence et nommage des dépôts produit

Chaque dépôt produit suit la même arborescence. Un dossier sans objet est absent ; chaque dossier
présent porte un `README.md` d'une phrase (colonne de droite, adaptée au produit). Git refuse un
fichier de plus de 100 Mo.

| dossier | contenu | phrase du `README.md` du dossier |
|---|---|---|
| `0_Datasheets/` | datasheets des composants | Les datasheets des composants utilisés (PDF du fabricant, nom d'origine). |
| `1_Board/` | fabrication de la carte électronique | Les fichiers de fabrication de la carte, tels que les sort l'outil de CAO. |
| `2_Hardware/` | mécanique hors carte : boîtier, pièces, sources de conception (STEP, F3D), nomenclature mécanique | La mécanique hors carte. |
| `3_3D-Models/` | fichiers prêts à imprimer (3MF, STL) | Les fichiers prêts à imprimer, tirés de `2_Hardware/`. |
| `4_Firmware/` | firmware : sources, build, tests | Le firmware de la carte. |
| `5_App/` | applications PC / téléphone, outils de configuration | Les applications qui parlent au produit. |
| `6_Driver/` | drivers (INDI, ASCOM…) | Les drivers. |
| `7_Docs/` | documentation du projet : protocole, notes de conception | La documentation du projet ; le README racine reste la porte d'entrée. |
| `8_References/` | documents de référence externes (normes, projets amont) | Ce que le projet consulte, pas ce qu'il produit. |
| `9_Assets/` | images des README et de la doc ; vitrine du site (`zurp.yml` + affiche) ; manuel du produit, publié par le site (`manual/`, § 7) | Les ressources pour l'extérieur, et la vitrine lue par le site. |

### Fichiers de carte (`1_Board/`)

`<Produit>-v<version>_<n>-<Nature>.<ext>`, où `n` dit la nature du fichier :

| n | fichier | exemple |
|---|---|---|
| 0 | fiche de la carte, texte | `Basilisk-v1.0b_0-README.txt` |
| 1 | schéma, PDF et PNG | `…_1-Schematics.pdf`, `…_1-Schematics.png` |
| 2 | vues : 3D (PNG + STEP), dessus, dessous | `…_2-view_3D.png`, `…_2-view_3D.step`, `…_2-view_top.png`, `…_2-view_bot.png` |
| 3 | Gerber RS-274X + perçages Excellon, zippés | `…_3-Gerber.zip` |
| 4 | nomenclature (références LCSC) | `…_4-BoM.xlsx` |
| 5 | placement, coordonnées en mm | `…_5-PnP.xlsx` |

**Plusieurs cartes** : un sous-dossier par carte, `1_Board/<Carte>/` (ex. `1_Board/Main-board/`,
`1_Board/SHC/`). Le nom de la carte entre dans le préfixe :
`<Produit>-<Carte>-v<version>_<n>-<Nature>.<ext>`. Une carte unique reste à plat dans `1_Board/`.

Modèle de la fiche `_0-README.txt` :

```
<Produit> - <Carte> v<X.Y>
zUrp Astronomics - lordzurp.dev@gmail.com
Projet : <lien EasyEDA/OSHWLab>   Repo : <lien GitHub>

FICHIERS
  1-Schematics.pdf   schéma
  2-Views            vues dessus / dessous / 3D
  3-Gerber.zip       Gerbers RS-274X + perçages Excellon
  4-BoM.xlsx         nomenclature, références LCSC
  5-PnP.xlsx         placement, coordonnées en mm

PCB
  Couches      : <n>
  Dimensions   : <L> x <l> mm
  Épaisseur    : <mm>
  Cuivre       : <oz>
  Vernis       : <couleur>      Sérigraphie : <couleur>
  Finition     : <HASL ROHS / ENIG>

ASSEMBLAGE
  Face         : <dessus uniquement / deux faces>
  Composants   : <n> lignes BoM, <n> placements
  Non montés   : <n>

POINTS D'ATTENTION
  - <à remplir>
```

## 6. Publier un logiciel

Un produit publie le logiciel de sa carte dans une release GitHub, construite par GitHub Actions. Le
site la lit et, sur la page du produit, dans son bloc **Install** (ancre `#install`), propose de
l'installer. Quand le produit a un manuel (§ 7), ce bloc est dans l'onglet **Setup** de sa page ;
sans manuel, il est dans la page, sous la présentation du produit. Une seule façon de faire pour tous les produits, avec l'outil habituel de chaque
famille : ESP Web Tools pour un ESP, un `.hex` pour un STM32, une image `.img.xz` pour un Raspberry
Pi. Ce qui suit est le contrat entre le site et les produits ; le site le vérifie à chaque build.

### Commun à toutes les familles

1. **Un tag semver** (`v1.2.0`), poussé sur le dépôt, lance le workflow de release.
2. **GitHub Actions construit** les fichiers, **crée la release** et les y attache, avec
   `softprops/action-gh-release`.
3. **Les fichiers sont nommés** `<produit>_<version>_<cible>.<ext>`, en minuscules : `<produit>` est
   le slug (le nom du dépôt en minuscules), `<version>` le tag sans le `v`, `<cible>` la puce ou la
   carte. Par exemple : `basilisk_1.2.0_esp32s3.bin`, `maelstrom_1.2.0_stm32f411.hex`,
   `cyclops_1.2.0_rpi4.img.xz`. **Seule exception : le manifeste ESP**, reconnu par son nom exact
   `{{{espManifest}}}`.
4. **Le workflow envoie ensuite le signal `zurp-catalog`** au site, avec `ZURP_SITE_DISPATCH`, le
   secret de l'org qu'utilisent déjà les signaux de `zurp-site.yml`. Tant que ce signal n'est pas
   parti, la release n'apparaît pas : le build que lance la publication de la release peut partir
   avant que les fichiers soient attachés.

{{=<% %>=}}
```yaml
on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # … construire les fichiers de la release dans out/ …
      - name: Release
        uses: softprops/action-gh-release@v2
        with:
          files: out/*
      - name: Signal the site (zurp-catalog)
        env:
          GH_TOKEN: ${{ secrets.ZURP_SITE_DISPATCH }}
        run: gh api repos/<%& siteRepo %>/dispatches -f event_type=zurp-catalog
```
<%={{ }}=%>

**La release retenue.** La plus récente release publiée (brouillons exclus, prereleases comprises)
**qui porte au moins un fichier installable** : `{{{espManifest}}}`, un `*.hex` ou un `*.img.xz`. Une
release plus récente sans fichier installable laisse publiée la précédente : c'est le cas normal
pendant qu'une release se construit. La version installée est le tag de cette release ; elle peut
être plus ancienne que la version affichée du produit.

### ESP : ESP Web Tools

Une **image fusionnée par puce** (`esptool.py merge_bin`, écrite à l'offset 0) et un
**`{{{espManifest}}}`** au format d'[ESP Web Tools](https://github.com/esphome/esp-web-tools). Le
bouton de la page détecte la puce branchée et choisit son build : un seul manifeste couvre toutes
les puces du produit.

```json
{
  "name": "Basilisk",
  "version": "1.2.0",
  "new_install_prompt_erase": true,
  "builds": [
    { "chipFamily": "ESP32-S3", "parts": [ { "path": "basilisk_1.2.0_esp32s3.bin", "offset": 0 } ] },
    { "chipFamily": "ESP32-C3", "parts": [ { "path": "basilisk_1.2.0_esp32c3.bin", "offset": 0 } ] }
  ]
}
```

- `name` et `version` : des textes non vides (la version : le tag sans le `v`).
- `builds` : au moins un. `chipFamily` est une famille que reconnaît ESP Web Tools
  {{{espWebToolsVersion}}}, la version que charge le site : {{{espChipFamilies}}}.
- `serialType`, facultatif : `cdc` (USB natif de la puce) ou `uart` (pont USB-série). Deux builds
  d'une même puce peuvent ne différer que par lui ; le couple (`chipFamily`, `serialType`)
  n'apparaît qu'une fois.
- Chaque part : `path`, le nom d'un fichier attaché à la **même** release (sans `/`, jamais une URL),
  et `offset`, un entier (`0` pour une image fusionnée).
- Les autres champs d'ESP Web Tools (`new_install_prompt_erase`, `funding_url`…) passent tels quels.

Le site copie le manifeste tel quel, avec les fichiers qu'il nomme, sur GitHub Pages : ESP Web Tools
les télécharge depuis le navigateur. Un manifeste invalide, ou un fichier qu'il nomme que la release
ne porte pas : **l'ESP n'est pas publié**, et le site ne revient pas à une release plus ancienne. La
page du produit reste en ligne ; le rapport du catalogue (résumé du job `build` du déploiement du
site, onglet **Actions**) dit pourquoi, champ par champ. Corrige la release, puis renvoie le signal.

### STM32 : un `.hex`

Un `.hex`, qui porte son adresse de chargement. La page du produit le lie là où GitHub le sert, avec
une notice courte : un ST-Link en SWD, STM32CubeProgrammer, ouvrir le `.hex`, **Download**. Ce qui
est propre au produit (où sont ses pastilles SWD…) va dans son README.

### Raspberry Pi : un `.img.xz`

Une image `.img.xz`, que l'utilisateur écrit sur une carte microSD avec Raspberry Pi Imager
(« Use custom ») ou Etcher. La page du produit la lie là où GitHub la sert, avec cette notice.

### Banc web : un `_bench.html`

Un produit peut joindre à sa release un **banc web** : une page HTML autonome (sans dépendance ni
appel réseau) qui pilote la carte par Web Serial et parle le protocole du firmware de **cette**
release. La page du produit l'ouvre, dans son bloc Install, par-dessus la page (bouton **Bench**) ou
dans un nouvel onglet.

- **Son nom** : `<produit>_<version>_bench.html`, en minuscules (par exemple
  `basilisk_1.2.0_bench.html`). Le site le reconnaît au suffixe exact `_bench.html` ; un seul par
  release : avec deux bancs ou plus, aucun n'est publié.
- **La même release que le firmware** : le banc est pris dans la release retenue (ci-dessus), et
  dans aucune autre. Il suit le firmware dont il parle le protocole : une release retenue sans banc
  n'a pas de banc, le site ne reprend pas celui d'une release plus ancienne.
- **Un banc seul ne publie rien** : il ne rend pas une release installable, et il n'est publié qu'à
  côté d'une installation publiée (un ESP valide, un `.hex` ou un `.img.xz`). Une release dont le
  seul fichier installable est un manifeste invalide ne publie pas non plus son banc ; le rapport du
  catalogue le dit, à part des manifestes rejetés.
- **Servi par le site, sur sa propre origine** : le site copie le banc tel quel, octet pour octet, sur
  GitHub Pages, et la page l'ouvre dans un cadre qui a le droit d'accéder au port série. Web Serial est
  refusé dans un cadre d'une autre origine, et les fichiers d'une release GitHub sont d'une autre
  origine : un lien vers la release ne marcherait pas.

### Firmware de l'amont

Un produit qui tourne sous le firmware d'un projet amont (Unicorn, sous le firmware TeenAstro) **ne
publie rien** : le site n'a rien à faire, et sa page n'a pas de bloc Install.

### La phrase du README du produit

Mot pour mot, dans le texte du README (jamais dans le bloc d'en-tête du § 2, collé dans tous les
produits), `<slug>` remplacé par le slug du produit :

- ESP :

  ```markdown
  Install it from your browser on the [product page]({{{siteUrl}}}/<slug>/) (Firefox, Chrome or Edge).
  ```

- STM32 et Raspberry Pi :

  ```markdown
  Install it from your browser on the [product page]({{{siteUrl}}}/<slug>/).
  ```

Le signal à la main, avec `gh` connecté sous un compte qui peut écrire dans le dépôt du site :
`gh api repos/{{{siteRepo}}}/dispatches -f event_type=zurp-catalog` — ou, dans l'onglet **Actions**
du site, « Deploy to GitHub Pages » → **Run workflow**.

## 7. Le manuel d'un produit

La page d'un produit sur le site est son **manuel d'assemblage et d'utilisation**, en onglets ; son
README présente le projet et le contenu du dépôt. Le projet écrit le fond du manuel ; le site en
tient la forme : mêmes onglets, mêmes titres, même style sur toutes les pages. Ce qui s'écarte de
cette norme est signalé au build, jamais corrigé en silence.

### Les fichiers

Les onglets forment un **vocabulaire commun**, tenu par l'agence (l'architecte du site) et le même
pour tous les produits. Le voici, dans l'ordre de la page ; chaque onglet est un fichier facultatif
de `9_Assets/manual/`, au nom fixe :

| onglet | fichier | ce qu'il porte |
|---|---|---|
{{#manualTabs}}
| {{{title}}} | `{{{id}}}.en.md` | {{{holds}}} |
{{/manualTabs}}

- **Aucun autre nom n'est publié.** Un fichier `.md` de `9_Assets/manual/` dont le nom n'est pas
  `<onglet>.<langue>.md`, avec un onglet de ce vocabulaire et une langue parmi {{{manualLangs}}}
  (`api.en.md`, `Overview.md`, `setup.md`, `notes.en.md`…), n'est pas publié, et il est **signalé
  au build** (voir plus bas). Les images du manuel, et ce qui est rangé dans un sous-dossier, ne
  sont pas concernés.
- **Les titres des onglets sont ceux du site**, pas ceux du projet : le fichier n'en porte pas.
- **Un onglet sans fichier n'apparaît pas.** Un produit sans aucun fichier de manuel garde sa page
  sans onglets : la présentation de sa fiche (`description` de `zurp.yml`), puis son bloc Install.

### La langue

Chaque fichier existe en anglais, `<onglet>.en.md`, et en français, `<onglet>.fr.md`. La page montre
l'anglais ; quand il manque (ou qu'il est illisible), elle montre le français à sa place, marqué
comme tel. Le site est en anglais : un `.fr.md` seul est un repli, pas une traduction.

### Le Markdown

- **Un en-tête facultatif** entre deux lignes `---`, en tête du fichier (date, statut…) : il n'est
  jamais affiché.
- **Pas de titre de niveau 1** (`# …`) : le site pose le nom du produit et le titre de l'onglet. Les
  sections commencent à `##`. Un `#` est affiché tel quel, et signalé.
- **Pas de HTML** : une balise écrite dans un manuel s'affiche en texte, elle n'est pas interprétée.
  Tout ce qui se met en forme passe par le Markdown.
- **Les liens** : un lien vers un autre fichier du manuel (`[Setup](setup.en.md)`) mène à son onglet
  sur la page ; un lien relatif vers un autre fichier du dépôt (`[schéma](../../1_Board/…pdf)`, relatif
  au fichier `.md`) mène à ce fichier sur GitHub ; un lien absolu (`https://…`) est inchangé.

### Les images

- **Relatives au fichier `.md`** (`![légende](images/vue.png)`, depuis `9_Assets/manual/`), et
  **seulement sous `9_Assets/`** : une image ailleurs dans le dépôt, ou en ligne, n'est pas affichée.
- **PNG, JPEG, WebP ou AVIF.** Le site les décode et les sert lui-même, réencodées en WebP : aucune
  image de plus de 600 Ko dans le site construit. Une source plus lourde passe, mais elle alourdit le
  dépôt : vise moins de 1 Mo, 1600 px de large au plus (le site ne sert pas plus large).
- **Une image absente, hors de `9_Assets/` ou illisible n'est pas affichée**, et elle est signalée.
  Le reste du manuel est publié.

### Le bloc Install dans Setup

Quand le produit a quelque chose à installer (§ 6), le bloc **Install** du site (bouton ESP,
téléchargements, banc) est dans l'onglet **Setup**, après le texte du projet, et dans aucun autre.
Un produit qui a un manuel et quelque chose à installer a un onglet Setup même sans `setup.*.md` :
il ne porte alors que le bloc Install. L'ancre `#install` de la page ouvre l'onglet Setup.

Chaque onglet a son ancre, stable, son nom de fichier sans la langue : {{#manualTabs}}`{{{siteUrl}}}/<slug>/#{{{id}}}`{{^last}}, {{/last}}{{/manualTabs}}.
Sans ancre, la page s'ouvre sur son premier onglet.

### Demander un onglet

Un manuel qui a besoin d'un onglet absent du vocabulaire ne l'invente pas : son projet le demande
à l'architecte du site, en disant ce que l'onglet porterait. L'architecte l'ajoute au vocabulaire
s'il n'existe pas déjà sous un autre nom, et s'il peut servir à d'autres produits que celui qui le
demande. L'onglet sert alors à tous les produits, avec le même titre sur toutes les pages : le
projet écrit son fichier, et le site le publie au build suivant.

Tant que l'onglet n'existe pas, son fichier est signalé au build et n'est pas publié : le reste
du manuel l'est.

### Ce que le site signale

Le rapport du catalogue (résumé du job `build` du déploiement du site, onglet **Actions**) dit, par
produit, quels onglets ont été publiés et dans quelle langue, puis chaque problème de manuel, en
nommant le dépôt et le fichier :

- un fichier hors vocabulaire : un `.md` de `9_Assets/manual/` dont le nom n'est pas celui d'un
  onglet (voir « Demander un onglet ») ;
- une image écartée : absente, hors de `9_Assets/`, d'un autre format ou illisible ;
- un titre de niveau 1 (`# …`) ;
- un fichier illisible (pas du texte UTF-8).

Aucun de ces problèmes ne retire le produit du site ni n'interrompt le build : le site publie, le
rapport signale, et la correction se fait dans le dépôt du produit.
