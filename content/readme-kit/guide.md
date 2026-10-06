---
Date: 2026-10-06
Statut: actif — gabarit du mode d'emploi du kit (zUrp-Astronomics/.github → readme-kit/README.md), en français
Référencé par: scripts/readme-kit.mjs
Marqueurs: siteUrl, orgUrl, orgSettingsUrl, avatarUrl, begin / end ; products (name, slug, hasRepo, repo, repoPath, socialUrl) ; noRepo (name, last), noRepoOne / noRepoMany
---

# Kit README — mode d'emploi

**Date** : 2026-10-03
**Dernière révision** : 2026-10-06
**Statut** : généré par `scripts/readme-kit.mjs` (dépôt du site) à chaque déploiement — ne pas éditer à la main
**Référencé par** : `.github/workflows/deploy.yml` du site (job « README de l'org »), `readme-kit/README.md` du site

<!-- {{{generated}}} -->

Ce dossier (`readme-kit/` du dépôt [zUrp-Astronomics/.github]({{{orgUrl}}}/.github)) et le README de
l'organisation (`profile/README.md`, même dépôt) sont **régénérés à chaque déploiement du site**
({{{siteUrl}}}), depuis le catalogue avec lequel le site vient d'être construit : noms, accroches,
slogans, statuts, sections, ordre, « based on », licences et liens sont ceux du site en ligne.
N'édite aucun de ces fichiers : ils sont écrasés au déploiement suivant. Pour changer un texte,
change la fiche du produit (`9_Assets/zurp.yml` de son dépôt) ou, pour un produit pas encore
migré, `content/products/<slug>/` du site.

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
lui seul, mène au dépôt du produit. Un produit sans dépôt dédié ({{#noRepo}}{{{name}}}{{^last}}, {{/last}}{{/noRepo}}{{^noRepo}}aucun aujourd’hui{{/noRepo}}) n'a pas de badge. Dans une section, le produit dont la release
est la plus récente vient en tête ; les produits sans release suivent, par ordre alphabétique.

## 2. En-tête de README de chaque produit

Pour chaque produit, copie le bloc de `repos/<produit>.md` (ce dossier) **en tête** du `README.md`
de son dépôt. Le bloc va du commentaire `<!-- {{{begin}}} … -->` au commentaire `<!-- {{{end}}} -->`,
tous deux inclus. À la mise à jour suivante, remplace tout ce qui se trouve entre ces deux marqueurs
(marqueurs compris) par le nouveau bloc : le reste du README du dépôt n'est pas touché.

L'affiche et le nom du produit mènent à sa page sur le site. Pas de badge GitHub : on est déjà dans
le dépôt.

## 3. Carte d'aperçu (Social preview) de chaque dépôt

Chaque dépôt a sa carte, 1280 × 640 px, JPEG de moins de 1 Mo, servie par le site à une URL stable.
Ouvre l'URL, enregistre l'image, puis dans le dépôt : **Settings → General → Social preview → Edit →
Upload an image…** Les cartes sont produites par le build du site : elles sont en ligne une fois le
site déployé.

| Produit | En-tête à coller | Dépôt GitHub | Carte d'aperçu à téléverser |
|---|---|---|---|
{{#products}}
| {{{name}}} | [`repos/{{{slug}}}.md`](repos/{{{slug}}}.md) | {{#hasRepo}}[{{{repoPath}}}]({{{repo}}}){{/hasRepo}}{{^hasRepo}}*pas encore de dépôt*{{/hasRepo}} | {{{socialUrl}}} |
{{/products}}

{{#noRepoMany}}
{{#noRepo}}{{{name}}}{{^last}}, {{/last}}{{/noRepo}} n'ont pas encore de dépôt : leurs en-têtes et leurs cartes sont prêts pour le jour où ils seront créés.

{{/noRepoMany}}
{{#noRepoOne}}
{{#noRepo}}{{{name}}}{{/noRepo}} n'a pas encore de dépôt : son en-tête et sa carte sont prêts pour le jour où il sera créé.

{{/noRepoOne}}
## 4. Avatar de l'organisation

L'avatar (le télescope steampunk, dessin complet, 480 × 480 px, PNG) est servi par le site à
{{{avatarUrl}}} : enregistre l'image, puis téléverse-la dans les **Settings** de l'organisation
({{{orgSettingsUrl}}}), rubrique **Profile picture** (**Edit → Upload a photo…**). Il est produit
par le build du site : en ligne une fois le site déployé.
