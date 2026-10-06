# Simulateur du catalogue

**Date** : 2026-10-06
**Dernière révision** : 2026-10-06 (ticket #72 : kaiju, kraken et berserker, dépôts réels sans fiche)
**Statut** : actif — source `ZURP_CATALOG=simulator` du build (tests, CI Gitea, essais)
**Référencé par** : `src/lib/catalog/source.mjs`, `src/lib/catalog/loader.mjs`, `CLAUDE.md` (`## Test`), `.gitea/workflows/ci.yml`

Des dépôts produit imités, lus par **le même code** que les dépôts de l'organisation sur GitHub
(`src/lib/catalog/` : seul le « backend » change). Les pods n'ont pas de réseau et la CI Gitea n'a
pas de jeton GitHub : c'est avec cette source que la suite de tests construit le site.

```
repos/<nom>/…              l'arbre du dépôt <nom> (branche par défaut) ; le site n'y lit que 9_Assets/
releases/<nom>.json        ses releases, comme l'API GitHub les liste ; absent = aucune release
licenses/<nom>.json        sa licence : le champ `license` du dépôt, comme l'API GitHub le donne dans
                           la liste des dépôts de l'organisation ; absent (ou `null`) = aucun LICENSE
```

**Les licences** (ticket #66). Sur GitHub, la licence d'un dépôt est celle que GitHub détecte dans
son fichier `LICENSE`, et la liste des dépôts de l'organisation la donne déjà (champ `license` :
`key`, `name`, `spdx_id`, `url`, ou `null`). Le site n'en garde que `spdx_id` et `name`
(`src/lib/catalog/source.mjs`, `repoLicense`) : un `spdx_id` reconnu (`GPL-3.0`) est le tampon de la
page produit, `NOASSERTION` (nom « Other », un `LICENSE` que GitHub ne reconnaît pas) donne le tampon
générique, et `null` aucun tampon. Le simulateur ne lit **aucun** fichier `LICENSE` : il donne ce que
l'API donnerait, relevé sur les vrais dépôts. Un fichier de `licenses/` vaut aussi pour un produit
encore dans `content/products/` du site, si son nom est celui du produit (casse ignorée) : c'est la
licence de son dépôt (ticket #72 : son dépôt est **découvert** dans la liste, et le lien « Source »
est l'URL de ce dépôt).

- **basilisk** : `9_Assets/zurp.yml` et `9_Assets/poster.png` sont copiés **à l'octet près** du kit de
  l'atelier (`kit-depot-enfant/basilisk/9_Assets/`). Aucune release, comme le vrai dépôt au relevé du
  2026-10-06. Ne pas les modifier : le site construit sur le simulateur doit rester identique à
  celui d'avant la migration. Licence (`licenses/basilisk.json`) : `NOASSERTION` / « Other », comme le
  vrai dépôt au relevé de l'API publique du 2026-10-06 — son `LICENSE` est l'OCL v1.1 (plus un
  `LICENSE-MIT`), que GitHub ne reconnaît pas.
- **maelstrom** (ticket #61) : `9_Assets/zurp.yml` et `9_Assets/maelstrom.webp` sont copiés **à l'octet
  près** du kit de l'atelier (`kit-depot-enfant/maelstrom/9_Assets/`), lui-même identique à l'octet à
  l'ancien `content/products/maelstrom/` du site. Aucune release. Licence (`licenses/maelstrom.json`) :
  GPL-3.0, comme le vrai dépôt au relevé de l'API publique du 2026-10-06.
- **unicorn** (ticket #61) : `9_Assets/zurp.yml` et `9_Assets/unicorn.png` sont copiés **à l'octet
  près** du kit de l'atelier (`kit-depot-enfant/unicorn/9_Assets/`) : la fiche du site avec la
  nouvelle affiche de l'humain (série 2.7, 1254 × 1254), son `posterAlt` et son `accent`. Aucune
  release. Licence (`licenses/unicorn.json`) : GPL-3.0, comme le vrai dépôt au relevé de l'API
  publique du 2026-10-06.
- **kaiju**, **kraken**, **berserker** (ticket #72) : trois dépôts réels de l'organisation qui n'ont
  **pas encore de fiche** — leur produit est encore dans `content/products/` du site. Leur dossier ne
  porte qu'un `.gitkeep` (pour que git garde le dossier), **aucun** `9_Assets/` : ils ne sont pas des
  produits du simulateur, seulement des dépôts de la liste, et le site y découvre le dépôt de ses
  produits locaux (lien « Source », licence). Licences (`licenses/<nom>.json`), relevées sur l'API
  publique le 2026-10-06 : `Kaiju` GPL-3.0, `Kraken` GPL-3.0, `berserker` CERN-OHL-S-2.0. Les vrais
  `Kaiju` et `Kraken` portent une majuscule ; ici ils sont en minuscules comme les autres (point
  suivant) : le lien « Source » construit sur le simulateur reste celui d'avant.
- **Cyclops** et **Wraith** n'ont pas de dépôt dans l'organisation : pas de dépôt imité. Leur produit,
  dans `content/products/`, a pour lien « Source » l'organisation, et pas de licence.
- Les dossiers sont en **minuscules** : le simulateur construit l'URL du dépôt avec le nom du dossier
  (`src/lib/catalog/source.mjs`), et une majuscule changerait le lien « Source » des pages et le
  README de l'organisation. Ne pas modifier ces fichiers : ils imitent ce que l'humain pose dans les
  dépôts de l'organisation.
- **Ce qui n'est pas ici.** Le simulateur imite l'organisation telle qu'elle est, rien de plus. Les
  cas qui n'y existent pas (une release, une prerelease, deux releases, une release à la date
  illisible, une fiche ou une affiche invalide — produit sauté —, un slug à la fois dans un dépôt et
  dans `content/products/`, un dépôt à la casse différente du dossier) sont prouvés par les tests
  (`test/catalog.test.mjs`), dans des simulateurs temporaires : aucun produit fictif n'entre dans un
  build déployable.
- **Il n'est jamais déployé.** Le site n'est déployé que par `.github/workflows/deploy.yml`, sur
  GitHub Actions, où `ZURP_CATALOG=simulator` est refusé quoi que dise le workflow
  (`src/lib/catalog/source.mjs`).
