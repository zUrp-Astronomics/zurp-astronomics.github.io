# Simulateur du catalogue

**Date** : 2026-10-06
**Dernière révision** : 2026-10-12 (ticket #101 : `browser_download_url` des fichiers attachés ; Basilisk publie un manifeste ESP Web Tools, Maelstrom un `.hex`, Cyclops un `.img.xz` — ticket #96 : les fichiers attachés aux releases)
**Statut** : actif — source `ZURP_CATALOG=simulator` du build (tests, CI Gitea)
**Référencé par** : `src/lib/catalog/source.mjs`, `src/lib/catalog/loader.mjs`, `CLAUDE.md` (`## Test`)

Des dépôts produit imités, pour construire le site sans réseau ni jeton GitHub. Ils sont lus par le
même code que les dépôts de l'organisation (`src/lib/catalog/source.mjs`) : seul le « backend » change.

```
repos/<nom>/…            l'arbre du dépôt <nom> : 9_Assets/zurp.yml et son affiche, LICENSE-HARDWARE
releases/<nom>.json      ses releases, comme l'API GitHub les liste, SANS `assets` ; absent = aucune release
releases/<nom>/<tag>/…   les fichiers attachés à sa release <tag> ; absent = aucun
licenses/<nom>.json      sa licence, comme l'API GitHub la donne dans la liste des dépôts ; absent = aucune
```

**Les fichiers attachés à une release** sont ceux de son dossier `releases/<nom>/<tag>/` : le
simulateur les liste comme GitHub (`assets` de chaque release : `{ id, name, size,
browser_download_url }`, la taille lue sur le disque, l'adresse construite comme GitHub la donne :
`https://github.com/<org>/<dépôt>/releases/download/<tag>/<nom>`) et les sert tels quels. Un
`assets` écrit dans `releases/<nom>.json` est refusé : le dossier est la seule vérité. C'est là
qu'un produit attache ce qu'il publie (norme : § 6 de `content/readme-kit/guide.md`).

- **Basilisk** (ESP) : sa release `v0.1.0` porte un `manifest.json` d'ESP Web Tools valide pour deux
  familles de puces (`ESP32-S3`, `ESP32-C3`, une image fusionnée chacune) ; sa release `v0.2.0`,
  plus récente, n'a qu'une image et pas de manifeste (ses fichiers « en cours d'attache »). Le build
  publie donc l'ESP de `v0.1.0`, et la version du produit reste `v0.2.0`.
- **Maelstrom** (STM32) : sa release `v0.1.0` porte un `.hex`.
- **Cyclops** (Raspberry Pi) : sa release `v0.1.0` porte un `.img.xz`.

Ces fichiers sont de petits fichiers texte factices : **ce ne sont ni des firmwares ni des
images**.

Les noms de dossier sont en minuscules : ils font l'URL du dépôt, donc le lien « Source ».

**Il n'est jamais déployé** : sur GitHub Actions, d'où le site est déployé, `ZURP_CATALOG=simulator`
est refusé.
