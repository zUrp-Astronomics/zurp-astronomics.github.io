---
Date: 2026-10-06
Dernière révision: 2026-10-10 (ticket #92 : tout produit a son dépôt, la notion de produit sans dépôt disparaît)
Statut: actif — gabarit du mode d'emploi du kit (zUrp-Astronomics/.github → readme-kit/README.md), en français
Référencé par: scripts/readme-kit.mjs
Marqueurs: siteUrl, orgUrl, orgSettingsUrl, avatarUrl, begin / end (kit.yml, header), statusJsonUrl (l'adresse du JSON de statut, `<produit>` à la place du slug), softwareBadgeUrl / hardwareBadgeUrl (les adresses des badges de licence, idem) ; products (name, slug, repo, repoPath, socialUrl)
---

# Kit README — mode d'emploi

**Date** : 2026-10-03
**Dernière révision** : 2026-10-10
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

## 2. En-tête de README de chaque produit

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

**La norme du README produit** (décision de l'humain, 2026-10-10). En anglais. Dans l'ordre : le
bloc d'en-tête ; le nom en titre centré, le slogan dessous, une barre de liens (site, documentation
si `7_Docs/` existe, releases, organisation) ; la bannière de statut (`wip` : « Work in progress — do
not build yet » ; `future` : « Design phase ») ; `## Why <Nom>?`, le paragraphe qui promet de
ridiculiser l'équivalent du commerce, bâti uniquement sur des faits du dépôt ; `## At a glance`, les
caractéristiques ; puis, quand le dépôt a de quoi les remplir, `## Hardware`, `## Software`,
`## Build`, `## Documentation`, `## Status & roadmap`, `## Credits` ; enfin `## Repository layout`,
`## License` et la signature. Toute image est un chemin relatif vers `9_Assets/`, en WebP à la taille
d'affichage ; l'original reste là où il est produit. Le détail technique vit dans `7_Docs/`, au
projet. L'org rédige le README et `9_Assets/` ; le projet tient tout le reste.

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
| `9_Assets/` | images des README et de la doc ; vitrine du site (`zurp.yml` + affiche) | Les ressources pour l'extérieur, et la vitrine lue par le site. |

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
