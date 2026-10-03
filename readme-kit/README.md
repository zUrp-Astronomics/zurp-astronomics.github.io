# Kit README — mode d'emploi

**Date** : 2026-10-03
**Dernière révision** : 2026-10-03
**Statut** : généré par `scripts/readme-kit.mjs` depuis `src/data/products.ts` — ne pas éditer à la main
**Référencé par** : `.gitea/workflows/ci.yml` (étape « Kit README à jour »), `.github/workflows/org-readme.yml` (synchronisation de `profile/README.md`)

Ce répertoire contient ce qui est publié sur GitHub : le README de l'organisation s'y synchronise
seul (section 1), le reste se recopie à la main (sections 2 à 4). Tout y est **généré** depuis
`src/data/products.ts`, la source du catalogue du site : noms, accroches, slogans, statuts,
sections, « based on », licences et liens sont ceux du site. Pour changer un texte, modifie
`products.ts` (ou le script), régénère, commite : n'édite jamais ces fichiers directement.

## 1. README de l'organisation

[`profile/README.md`](profile/README.md) est **synchronisé automatiquement** dans le fichier
`profile/README.md` du dépôt [zUrp-Astronomics/.github](https://github.com/zUrp-Astronomics/.github) par le workflow GitHub
Actions `.github/workflows/org-readme.yml` : à chaque push sur `main` qui modifie `readme-kit/profile/`,
ou à la main depuis l'onglet **Actions** du dépôt du site (« README de l'org » → **Run workflow**).
Il ne commite dans `.github` que si le fichier a changé, et n'écrit jamais dans le dépôt du site.

**Ne le recopie plus à la main** : une modification faite directement dans `.github` serait écrasée à
la synchronisation suivante. Pour changer ce README, modifie `products.ts` (ou le script) et régénère.

Le workflow s'authentifie avec le secret d'Actions `README_SYNC_TOKEN` (jeton à accès fin, Contents en
lecture-écriture sur le seul dépôt `.github`). Si la synchronisation échoue, c'est probablement le
jeton : expiré, pas encore approuvé par l'organisation, ou branche protégée dans `.github`.

L'en-tête affiche la plaque patinée Low-Tech & DIY depuis le site (https://zurp-astronomics.github.io/brand/low-tech-diy.webp) : l'ancienne image
`profile/Low_tech_DIY.png` du dépôt `.github` n'est plus utilisée par le README.

**Où mènent les liens.** Dans la liste des projets, la miniature et le nom mènent tous deux à la page
du produit sur le site (`https://zurp-astronomics.github.io/<produit>/`). Le petit badge **GitHub** placé après l'accroche, et
lui seul, mène au dépôt du produit. Un produit sans dépôt dédié (Cyclops, Wraith) n'a pas de badge.

## 2. En-tête de README de chaque produit

Pour chaque produit, copie le bloc de `repos/<produit>.md` **en tête** du `README.md` de son dépôt.
Le bloc va du commentaire `<!-- zurp-readme-header:begin … -->` au commentaire `<!-- zurp-readme-header:end -->`, tous deux
inclus. À la mise à jour suivante, remplace tout ce qui se trouve entre ces deux marqueurs (marqueurs
compris) par le nouveau bloc : le reste du README du dépôt n'est pas touché.

L'affiche et le nom du produit mènent à sa page sur le site. Pas de badge GitHub : on est déjà dans
le dépôt.

## 3. Carte d'aperçu (Social preview) de chaque dépôt

Chaque dépôt a sa carte, 1280 × 640 px, JPEG de moins de 1 Mo, servie par le site à une URL stable.
Ouvre l'URL, enregistre l'image, puis dans le dépôt : **Settings → General → Social preview → Edit →
Upload an image…** Les cartes sont produites par le build du site : elles sont en ligne une fois le
site déployé.

| Produit | En-tête à coller | Dépôt GitHub | Carte d'aperçu à téléverser |
|---|---|---|---|
| Kaiju | [`repos/kaiju.md`](repos/kaiju.md) | [zUrp-Astronomics/kaiju](https://github.com/zUrp-Astronomics/kaiju) | https://zurp-astronomics.github.io/brand/social/kaiju.jpg |
| Berserker | [`repos/berserker.md`](repos/berserker.md) | [zUrp-Astronomics/berserker](https://github.com/zUrp-Astronomics/berserker) | https://zurp-astronomics.github.io/brand/social/berserker.jpg |
| Unicorn | [`repos/unicorn.md`](repos/unicorn.md) | [zUrp-Astronomics/unicorn](https://github.com/zUrp-Astronomics/unicorn) | https://zurp-astronomics.github.io/brand/social/unicorn.jpg |
| Kraken | [`repos/kraken.md`](repos/kraken.md) | [zUrp-Astronomics/kraken](https://github.com/zUrp-Astronomics/kraken) | https://zurp-astronomics.github.io/brand/social/kraken.jpg |
| Maelstrom | [`repos/maelstrom.md`](repos/maelstrom.md) | [zUrp-Astronomics/maelstrom](https://github.com/zUrp-Astronomics/maelstrom) | https://zurp-astronomics.github.io/brand/social/maelstrom.jpg |
| Cyclops | [`repos/cyclops.md`](repos/cyclops.md) | *pas encore de dépôt* | https://zurp-astronomics.github.io/brand/social/cyclops.jpg |
| Wraith | [`repos/wraith.md`](repos/wraith.md) | *pas encore de dépôt* | https://zurp-astronomics.github.io/brand/social/wraith.jpg |
| Basilisk | [`repos/basilisk.md`](repos/basilisk.md) | [zUrp-Astronomics/basilisk](https://github.com/zUrp-Astronomics/basilisk) | https://zurp-astronomics.github.io/brand/social/basilisk.jpg |

Cyclops, Wraith n'ont pas encore de dépôt : leurs en-têtes et leurs cartes sont prêts pour le jour où ils seront créés.

## 4. Avatar de l'organisation

L'avatar (le télescope steampunk, dessin complet, 480 × 480 px, PNG) est servi par le site à
https://zurp-astronomics.github.io/brand/avatar.png : enregistre l'image, puis téléverse-la dans les **Settings** de l'organisation
(https://github.com/organizations/zUrp-Astronomics/settings/profile), rubrique **Profile picture** (**Edit → Upload a photo…**). Il est produit
par le build du site : en ligne une fois le site déployé.

## 5. Régénérer

Après `npm ci` (le script lit `products.ts` avec esbuild, fourni avec Astro) :

- `npm run readme-kit` réécrit ce répertoire ; commite le résultat avec la modification de
  `products.ts`.
- `npm run readme-kit:check` ne réécrit rien et échoue si le répertoire n'est pas à jour. La CI
  (`.gitea/workflows/ci.yml`, job `build`) le lance : modifier `products.ts` sans régénérer la fait
  échouer.

Les images (plaque, affiches, cartes, avatar) ne sont pas dans ce répertoire : le site les sert, et le
contrôle `scripts/check-dist.mjs` fait échouer le build si l'une manque.
