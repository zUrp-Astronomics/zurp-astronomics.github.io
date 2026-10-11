# Simulateur du catalogue

**Date** : 2026-10-06
**Dernière révision** : 2026-10-12 (ticket #96 : les fichiers attachés aux releases ; Basilisk publie un firmware)
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
simulateur les liste comme GitHub (`assets` de chaque release : `{ id, name, size }`, la taille lue
sur le disque) et les sert tels quels. Un `assets` écrit dans `releases/<nom>.json` est refusé : le
dossier est la seule vérité. C'est là qu'un produit attache son firmware et son manifeste
`zurp-firmware.json` (norme : § 6 de `content/readme-kit/guide.md`).

**Basilisk publie un firmware** : sa release `v0.1.0` porte un manifeste valide pour deux puces
(`esp32s3` en trois parts, `esp32c3` en une image fusionnée) ; sa release `v0.2.0`, plus récente,
n'a qu'un binaire et pas de manifeste (ses fichiers « en cours d'attache »). Le build publie donc le
firmware de `v0.1.0`, et la version du produit reste `v0.2.0`. Ces binaires sont de petits fichiers
texte factices : **ce ne sont pas des firmwares**.

Les noms de dossier sont en minuscules : ils font l'URL du dépôt, donc le lien « Source ».

**Il n'est jamais déployé** : sur GitHub Actions, d'où le site est déployé, `ZURP_CATALOG=simulator`
est refusé.
