#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — README kit generator: GitHub organisation README, product README headers, user guide, from the catalog the site was built with
// AUTHOR: engineer
// DATE: 2026-10-03 (revised 2026-10-06, ticket #46: generated at each deployment, no longer committed)
// STATUS: active
//
// Usage (after the build, which writes the catalog snapshot .zurp-catalog/remote.json):
//   npm run readme-kit                     writes the kit into .zurp-catalog/readme-kit/ (git-ignored)
//   node scripts/readme-kit.mjs [--catalog <remote.json>] [--out <dir>]
//
// The output mirrors the repository zUrp-Astronomics/.github, where .github/workflows/deploy.yml
// copies it after EACH deployment (dispatches from product repositories included):
//   profile/README.md                  the organisation README (GitHub shows it on the org page)
//   readme-kit/README.md               the user guide (French: the human is a French speaker)
//   readme-kit/repos/<slug>.md         the header block of each product repository's README
//
// WHY NOT COMMITTED ANY MORE. Part of the catalog is read on GitHub at build time (the product
// repositories' sheets and releases): a file committed here could not be the truth of the org
// README, it would silently drift from the deployed site. The kit is generated from the SAME
// catalog the site was just built with (scripts/lib/catalog.mjs: products.ts + the build's
// snapshot, assembled by the site's own function), so the org README always shows what the site
// shows, in the same order. Nothing is committed in THIS repository by any workflow (it is
// published by the fleet: a pushed commit would stop the next publication).
//
// DETERMINISTIC. The output depends only on the catalog, src/data/licenses.ts, the `site` of
// astro.config.mjs and this script: no date, no hash, no build stamp — so the sync only commits in
// .github when something really changed.
//
// URLS. The image URLs mirror the convention of src/lib/brand-images.ts (panel, series 2 posters,
// social preview cards) — change both together, or never. scripts/check-dist.mjs fails the build
// when one of those files is missing from dist/.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadBuiltCatalog, repoRoot } from './lib/catalog.mjs';
import { SNAPSHOT_DIR } from '../src/lib/catalog/loader.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const outDir = resolve(arg('--out') ?? join(repoRoot, SNAPSHOT_DIR, 'readme-kit'));
const snapshotFile = arg('--catalog') && resolve(arg('--catalog'));

// --- Sources ---------------------------------------------------------------------------------------

const { products, sections, licenses } = await loadBuiltCatalog({ snapshotFile });

const astroConfig = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');
const SITE = astroConfig.match(/\bsite:\s*['"`]([^'"`]+)['"`]/)?.[1]?.replace(/\/+$/, '');
if (!SITE) throw new Error('readme-kit: no `site` found in astro.config.mjs');
if (!products?.length || !sections?.length || !licenses) throw new Error('readme-kit: empty catalog — products.ts or the snapshot changed shape?');

// --- URLs (mirror of src/lib/brand-images.ts) ---------------------------------------------------------

const ORG_URL = 'https://github.com/zUrp-Astronomics';
const panelUrl = `${SITE}/brand/low-tech-diy.webp`;
const posterUrl = (p) => `${SITE}/brand/posters/${p.slug}.webp`;
const socialUrl = (p) => `${SITE}/brand/social/${p.slug}.jpg`;
// Organisation avatar: mirror of src/lib/site-icons.ts (checked in dist/ by scripts/check-dist.mjs).
const avatarUrl = `${SITE}/brand/avatar.png`;
const pageUrl = (p) => `${SITE}/${p.slug}/`;
const siteHost = SITE.replace(/^https?:\/\//, '');

/** A product with no dedicated repository yet has the organisation itself as its `repo`. */
const hasRepo = (p) => p.repo.replace(/\/+$/, '') !== ORG_URL;

// Alt text of the panel: the site's own, for the same drawing (src/components/v2/Footer.astro).
const PANEL_ALT =
  'Worn, creased “Low-Tech & DIY” panel: a riveted Nyan Cat trailing a pixel rainbow in front of a moon, on a blueprint with red rays.';

// --- Helpers ---------------------------------------------------------------------------------------

const html = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** shields.io static badge: `-` and `_` are escaped by doubling, the rest is URL-encoded. */
const shieldPart = (s) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__'));
const badge = (label, message, color) =>
  `![${label}: ${message}](https://img.shields.io/badge/${shieldPart(label)}-${shieldPart(message)}-${color})`;
const linkedBadge = (label, message, color, href) => `[${badge(label, message, color)}](${href})`;

// Status words: the site's badges (src/pages/[slug]/index.astro).
const STATUS = {
  wip: { label: 'WIP', color: 'orange' },
  future: { label: 'Future', color: 'lightgrey' },
  released: { label: 'Released', color: 'brightgreen' },
};

const { hardware, software } = licenses;
const licenceBadges = [
  linkedBadge('hardware', hardware.short, 'blue', hardware.url),
  linkedBadge('software', software.short, 'blue', software.url),
];

const GENERATED =
  'generated by scripts/readme-kit.mjs (zurp-astronomics-site) at each deployment of the site, from its catalog — do not edit by hand: it is overwritten at the next deployment';

// --- 1. Organisation README (zUrp-Astronomics/.github → profile/README.md) ---------------------------

// LINK RULE (ticket #35, the human's): the thumbnail and the name both lead to the product's page on
// the site; a small GitHub badge after the tagline, and it alone, leads to the repository. No badge
// for a product without a dedicated repository (`hasRepo`). Same look as the badges at the top.
const GITHUB_BADGE = 'https://img.shields.io/badge/-GitHub-181717?logo=github';
const repoBadge = (p) => `<a href="${p.repo}"><img src="${GITHUB_BADGE}" alt="GitHub repository"></a>`;

function projectTable(list) {
  const rows = list.map((p) => {
    const tagline = [html(p.tagline), hasRepo(p) && repoBadge(p)].filter(Boolean).join(' ');
    const extra = p.basedOn ? `<br><sub>Based on ${html(p.basedOn)}</sub>` : '';
    return [
      '<tr>',
      `<td width="112"><a href="${pageUrl(p)}"><img src="${posterUrl(p)}" alt="${html(p.name)} poster" width="100"></a></td>`,
      `<td><b><a href="${pageUrl(p)}">${html(p.name)}</a></b> — ${tagline}${extra}</td>`,
      '</tr>',
    ].join('\n');
  });
  return ['<table>', ...rows, '</table>'].join('\n');
}

/** Products of `list`, one `####` sub-heading per catalog section (sections order, empty ones skipped). */
function bySection(list) {
  return sections
    .map((s) => ({ s, items: list.filter((p) => p.section === s.id) }))
    .filter(({ items }) => items.length > 0)
    .map(({ s, items }) => `#### ${s.title}\n\n${projectTable(items)}`)
    .join('\n\n');
}

function orgReadme() {
  // Grouping (the human's README, kept): work in progress by catalog section — Mounts, Cameras,
  // Gadgets — then the Future section as "Future projects", then "Released ✅" (*Soon ©️* while it
  // is empty). A released product leaves the work-in-progress list for the Released one.
  const FUTURE = 'future';
  const notReleased = products.filter((p) => p.status !== 'released');
  const released = products.filter((p) => p.status === 'released');
  const wip = notReleased.filter((p) => p.section !== FUTURE);
  const future = notReleased.filter((p) => p.section === FUTURE);
  const futureTitle = sections.find((s) => s.id === FUTURE)?.title ?? 'Future';

  const projects = [
    '### Work in Progress ⚠ NOT YET VALIDATED ⚠',
    bySection(wip),
    ...(future.length ? [`### ${futureTitle} projects`, projectTable(future)] : []),
    '### Released ✅',
    released.length ? bySection(released) : '*Soon ©️*',
  ];

  return `<!-- zUrp-Astronomics/.github → profile/README.md — ${GENERATED}. Copy the whole file. -->
<div align="center">

<img src="${panelUrl}" alt="${html(PANEL_ALT)}" width="480">

# zUrp Astronomics

*Low-tech, DIY, amateur astronomy hardware.*

${badge('status', 'work in progress', 'orange')}
${licenceBadges.join('\n')}
${badge('tech', 'open hardware', 'informational')}

<sub>Hardware under ${hardware.short} · software and firmware under ${software.short} · a project based on upstream work follows its upstream licence</sub>

[**🌐 ${siteHost}**](${SITE})

</div>

---

## 👋 Hi here

Welcome to DIY hell. We build astronomy gear with harmonic drives, 3D printers, and stubbornness. Open hardware by default, over-engineered by principle.

## 🚀 Projects

${projects.join('\n\n')}

---

<div align="center">

*zUrp Astronomics — a subsidiary of zUrp Industries.*

</div>
`;
}

// --- 2. Product README headers (top of each product repository's README.md) -------------------------

const BEGIN = 'zurp-readme-header:begin';
const END = 'zurp-readme-header:end';

function licenceSentence(p) {
  const rule = `hardware (BOM, 3D/CAD files, PCB, mechanics) under [${hardware.short}](${hardware.url}), software and firmware under [${software.short}](${software.url})`;
  // A derived project follows its upstream licence, never named here: none has been checked (spec,
  // section Licences; same rule as the site, src/data/licenses.ts).
  if (p.basedOn) {
    return `**Licence.** zUrp Astronomics publishes ${rule}. This project is based on **${p.basedOn}**: it follows the licence of that upstream project, and the licence files of this repository have the final word.`;
  }
  return `**Licence.** This project publishes its ${rule}.`;
}

// Same link rule as the organisation README: the poster and the name lead to the product's page on
// the site. No GitHub badge (the reader is already in the repository) and no separate
// "product page" link (it would repeat the poster's and the name's).
function repoHeader(p) {
  const status = STATUS[p.status] ?? { label: p.status, color: 'lightgrey' };
  const badges = [
    badge('status', status.label, status.color),
    ...licenceBadges,
    ...(p.basedOn ? [badge('based on', p.basedOn, 'informational')] : []),
  ];
  return `<!-- ${BEGIN} — ${p.name} — ${GENERATED}. At the next update, replace everything from this line down to the ${END} marker. -->
<div align="center">

<a href="${pageUrl(p)}"><img src="${posterUrl(p)}" alt="${html(p.posterAlt)}" width="420"></a>

# [${p.name}](${pageUrl(p)})

***${p.slogan}***

${p.tagline}

${badges.join('\n')}

</div>

${licenceSentence(p)}

<!-- ${END} -->
`;
}

// --- 3. User guide (French: the human is a French speaker) -------------------------------------------

function guide() {
  const rows = products.map((p) => {
    const repo = hasRepo(p) ? `[${p.repo.replace('https://github.com/', '')}](${p.repo})` : '*pas encore de dépôt*';
    return `| ${p.name} | [\`repos/${p.slug}.md\`](repos/${p.slug}.md) | ${repo} | ${socialUrl(p)} |`;
  });
  const noRepo = products.filter((p) => !hasRepo(p)).map((p) => p.name);
  const noRepoNote = noRepo.length
    ? noRepo.length > 1
      ? `\n${noRepo.join(', ')} n'ont pas encore de dépôt : leurs en-têtes et leurs cartes sont prêts pour le jour où ils seront créés.\n`
      : `\n${noRepo[0]} n'a pas encore de dépôt : son en-tête et sa carte sont prêts pour le jour où il sera créé.\n`
    : '';

  return `# Kit README — mode d'emploi

**Date** : 2026-10-03
**Dernière révision** : 2026-10-06
**Statut** : généré par \`scripts/readme-kit.mjs\` (dépôt du site) à chaque déploiement — ne pas éditer à la main
**Référencé par** : \`.github/workflows/deploy.yml\` du site (job « README de l'org »), \`readme-kit/README.md\` du site

<!-- ${GENERATED} -->

Ce dossier (\`readme-kit/\` du dépôt [zUrp-Astronomics/.github](${ORG_URL}/.github)) et le README de
l'organisation (\`profile/README.md\`, même dépôt) sont **régénérés à chaque déploiement du site**
(${SITE}), depuis le catalogue avec lequel le site vient d'être construit : noms, accroches,
slogans, statuts, sections, ordre, « based on », licences et liens sont ceux du site en ligne.
N'édite aucun de ces fichiers : ils sont écrasés au déploiement suivant. Pour changer un texte,
change la fiche du produit (\`9_Assets/zurp.yml\` de son dépôt) ou, pour un produit pas encore
migré, \`src/data/products.ts\` du site.

Le travail est fait par le workflow GitHub Actions \`.github/workflows/deploy.yml\` du dépôt du
site : construction, déploiement, puis copie du kit ici (job « README de l'org »). Il tourne à chaque
push sur \`main\` du site, à chaque signal \`zurp-catalog\` envoyé par un dépôt produit (release
publiée, \`9_Assets/\` modifié), ou à la main (onglet **Actions** du site → « Deploy to GitHub
Pages » → **Run workflow**).

## 1. README de l'organisation

\`profile/README.md\` est le README affiché sur la page de l'organisation. **Ne le modifie pas à la
main** : il est réécrit à chaque déploiement.

Le job s'authentifie avec le secret d'Actions \`README_SYNC_TOKEN\` du dépôt du site (jeton à accès
fin, Contents en lecture-écriture sur le seul dépôt \`.github\`). S'il échoue, c'est probablement le
jeton : expiré, pas encore approuvé par l'organisation, ou branche protégée dans \`.github\`. Le
site, lui, est déjà déployé à ce moment-là.

**Où mènent les liens.** Dans la liste des projets, la miniature et le nom mènent tous deux à la page
du produit sur le site (\`${SITE}/<produit>/\`). Le petit badge **GitHub** placé après l'accroche, et
lui seul, mène au dépôt du produit. Un produit sans dépôt dédié (${products
    .filter((p) => !hasRepo(p))
    .map((p) => p.name)
    .join(', ') || 'aucun aujourd’hui'}) n'a pas de badge. Dans une section, le produit dont la release
est la plus récente vient en tête ; les produits sans release suivent, par ordre alphabétique.

## 2. En-tête de README de chaque produit

Pour chaque produit, copie le bloc de \`repos/<produit>.md\` (ce dossier) **en tête** du \`README.md\`
de son dépôt. Le bloc va du commentaire \`<!-- ${BEGIN} … -->\` au commentaire \`<!-- ${END} -->\`,
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
${rows.join('\n')}
${noRepoNote}
## 4. Avatar de l'organisation

L'avatar (le télescope steampunk, dessin complet, 480 × 480 px, PNG) est servi par le site à
${avatarUrl} : enregistre l'image, puis téléverse-la dans les **Settings** de l'organisation
(${ORG_URL.replace('github.com/', 'github.com/organizations/')}/settings/profile), rubrique **Profile picture** (**Edit → Upload a photo…**). Il est produit
par le build du site : en ligne une fois le site déployé.
`;
}

// --- Write ------------------------------------------------------------------------------------------

const files = new Map([
  ['profile/README.md', orgReadme()],
  ['readme-kit/README.md', guide()],
  ...products.map((p) => [`readme-kit/repos/${p.slug}.md`, repoHeader(p)]),
]);

rmSync(outDir, { recursive: true, force: true });
for (const [path, content] of files) {
  const abs = join(outDir, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
console.log(`README kit written to ${outDir} (${files.size} files, ${products.length} products): ${[...files.keys()].join(', ')}`);
