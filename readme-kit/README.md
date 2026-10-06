# Kit README — où le trouver

**Date** : 2026-10-03
**Dernière révision** : 2026-10-06 (ticket #66 : plus de licence dans le kit)
**Statut** : actif — page fixe, sans donnée du catalogue
**Référencé par** : `scripts/readme-kit.mjs`, `.github/workflows/deploy.yml`, `content/README.md`

Le kit README (README de l'organisation, en-tête de README de chaque produit, mode d'emploi) n'est
plus commité dans ce dépôt. Une partie du catalogue est lue sur GitHub au moment du build (fiches
`9_Assets/zurp.yml` et releases des dépôts produit) : un fichier commité ici ne pourrait plus être la
vérité du README de l'organisation, il divergerait sans bruit du site en ligne.

**Il est régénéré à chaque déploiement du site**, depuis le catalogue avec lequel le site vient
d'être construit, par le workflow GitHub Actions `.github/workflows/deploy.yml` (job « README de
l'org »), et copié dans le dépôt [zUrp-Astronomics/.github](https://github.com/zUrp-Astronomics/.github) :

| Quoi | Où |
|---|---|
| README de l'organisation (affiché sur la page de l'org) | [`profile/README.md`](https://github.com/zUrp-Astronomics/.github/blob/main/profile/README.md) |
| **En-tête de README de chaque produit**, à coller **une fois** en tête du README de son dépôt (que des URL : il se met à jour seul) | [`readme-kit/repos/<produit>.md`](https://github.com/zUrp-Astronomics/.github/tree/main/readme-kit/repos) |
| Mode d'emploi complet (en-têtes, cartes d'aperçu, avatar, liens) | [`readme-kit/README.md`](https://github.com/zUrp-Astronomics/.github/blob/main/readme-kit/README.md) |

**Pour changer un texte ou la mise en page du kit**, édite ses gabarits, `content/readme-kit/`
(README de l'org, en-tête produit, mode d'emploi), et les textes qu'il partage avec le site dans
`content/` (accroche, pitch, signature, titres des sections, statuts) :
`content/README.md` dit ce qui est où. Aucun code à toucher.

Rien à lancer sur ta machine. Pour régénérer sans rien changer : onglet **Actions** du dépôt du site
→ « Deploy to GitHub Pages » → **Run workflow** (le kit suit chaque déploiement, y compris ceux
qu'envoie un dépôt produit à sa release).

Pour le voir en local après un build : `ZURP_CATALOG=simulator npm run build && npm run readme-kit`
écrit le kit dans `.zurp-catalog/readme-kit/` (ignoré par git), depuis le catalogue du simulateur.
