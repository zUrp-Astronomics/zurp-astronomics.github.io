#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — README kit generator: GitHub organisation README, product README headers, user guide (readme-kit/), from src/data/products.ts
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Usage:
//   npm run readme-kit          writes readme-kit/ (and removes any file there it did not write)
//   npm run readme-kit:check    writes nothing; exit 1 if readme-kit/ differs from what would be
//                               generated (CI: editing products.ts without regenerating turns red)
//
// WHY GENERATED. These files are published on GitHub outside the fleet:
// readme-kit/profile/README.md is synchronised into the special repository zUrp-Astronomics/.github
// by .github/workflows/org-readme.yml (GitHub Actions, on push to main touching readme-kit/profile/),
// and the human copies readme-kit/repos/<slug>.md BY HAND at the top of each product repository's
// README. Generating them from
// the site's single catalog source keeps names, taglines, slogans, statuses, sections, "based on",
// licences and links identical to the site. Never edit readme-kit/ by hand: edit products.ts (or
// this script) and regenerate.
//
// DETERMINISTIC ON PURPOSE. The output depends only on src/data/products.ts,
// src/data/licenses.ts, the `site` of astro.config.mjs and this script: no date, no hash, no build
// stamp. Otherwise the CI check could never be green.
//
// READING products.ts. It is TypeScript and imports the poster files. The script bundles it with
// esbuild — the bundler Astro uses, declared in package.json at the version Astro pulls (ticket
// #43: it used to be only a transitive dependency), so it needs `npm ci` first — stubbing every image import (the kit links images by their stable URLs, it never
// reads pixels). Nothing is parsed by regex: the kit sees exactly the objects the site sees.
//
// URLS. The image URLs mirror the convention of src/lib/brand-images.ts (panel, series 2 posters,
// social preview cards) — change both together, or never. scripts/check-dist.mjs fails the build
// when one of those files is missing from dist/.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kitDir = join(repoRoot, 'readme-kit');
const check = process.argv.includes('--check');

// --- Sources ---------------------------------------------------------------------------------------

async function loadCatalog() {
  const result = await build({
    stdin: {
      contents:
        "export { products, sections } from './src/data/products.ts';\n" +
        "export { licenses } from './src/data/licenses.ts';\n",
      resolveDir: repoRoot,
      sourcefile: 'readme-kit-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    plugins: [
      {
        name: 'stub-images',
        setup(b) {
          b.onResolve({ filter: /\.(webp|png|jpe?g|avif|gif|svg)$/i }, (args) => ({
            path: args.path,
            namespace: 'stub-image',
          }));
          b.onLoad({ filter: /.*/, namespace: 'stub-image' }, () => ({ contents: 'export default null;', loader: 'js' }));
        },
      },
    ],
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const { products, sections, licenses } = await loadCatalog();

const astroConfig = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');
const SITE = astroConfig.match(/\bsite:\s*['"`]([^'"`]+)['"`]/)?.[1]?.replace(/\/+$/, '');
if (!SITE) throw new Error('readme-kit: no `site` found in astro.config.mjs');
if (!products?.length || !sections?.length || !licenses) throw new Error('readme-kit: empty catalog — products.ts changed shape?');

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
  'generated by scripts/readme-kit.mjs (zurp-astronomics-site) from src/data/products.ts — do not edit by hand: edit products.ts and regenerate';

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
**Dernière révision** : 2026-10-03
**Statut** : généré par \`scripts/readme-kit.mjs\` depuis \`src/data/products.ts\` — ne pas éditer à la main
**Référencé par** : \`.gitea/workflows/ci.yml\` (étape « Kit README à jour »), \`.github/workflows/org-readme.yml\` (synchronisation de \`profile/README.md\`)

Ce répertoire contient ce qui est publié sur GitHub : le README de l'organisation s'y synchronise
seul (section 1), le reste se recopie à la main (sections 2 à 4). Tout y est **généré** depuis
\`src/data/products.ts\`, la source du catalogue du site : noms, accroches, slogans, statuts,
sections, « based on », licences et liens sont ceux du site. Pour changer un texte, modifie
\`products.ts\` (ou le script), régénère, commite : n'édite jamais ces fichiers directement.

## 1. README de l'organisation

[\`profile/README.md\`](profile/README.md) est **synchronisé automatiquement** dans le fichier
\`profile/README.md\` du dépôt [zUrp-Astronomics/.github](${ORG_URL}/.github) par le workflow GitHub
Actions \`.github/workflows/org-readme.yml\` : à chaque push sur \`main\` qui modifie \`readme-kit/profile/\`,
ou à la main depuis l'onglet **Actions** du dépôt du site (« README de l'org » → **Run workflow**).
Il ne commite dans \`.github\` que si le fichier a changé, et n'écrit jamais dans le dépôt du site.

**Ne le recopie plus à la main** : une modification faite directement dans \`.github\` serait écrasée à
la synchronisation suivante. Pour changer ce README, modifie \`products.ts\` (ou le script) et régénère.

Le workflow s'authentifie avec le secret d'Actions \`README_SYNC_TOKEN\` (jeton à accès fin, Contents en
lecture-écriture sur le seul dépôt \`.github\`). Si la synchronisation échoue, c'est probablement le
jeton : expiré, pas encore approuvé par l'organisation, ou branche protégée dans \`.github\`.

L'en-tête affiche la plaque patinée Low-Tech & DIY depuis le site (${panelUrl}) : l'ancienne image
\`profile/Low_tech_DIY.png\` du dépôt \`.github\` n'est plus utilisée par le README.

**Où mènent les liens.** Dans la liste des projets, la miniature et le nom mènent tous deux à la page
du produit sur le site (\`${SITE}/<produit>/\`). Le petit badge **GitHub** placé après l'accroche, et
lui seul, mène au dépôt du produit. Un produit sans dépôt dédié (${products
    .filter((p) => !hasRepo(p))
    .map((p) => p.name)
    .join(', ') || 'aucun aujourd’hui'}) n'a pas de badge.

## 2. En-tête de README de chaque produit

Pour chaque produit, copie le bloc de \`repos/<produit>.md\` **en tête** du \`README.md\` de son dépôt.
Le bloc va du commentaire \`<!-- ${BEGIN} … -->\` au commentaire \`<!-- ${END} -->\`, tous deux
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
${rows.join('\n')}
${noRepoNote}
## 4. Avatar de l'organisation

L'avatar (le télescope steampunk, dessin complet, 480 × 480 px, PNG) est servi par le site à
${avatarUrl} : enregistre l'image, puis téléverse-la dans les **Settings** de l'organisation
(${ORG_URL.replace('github.com/', 'github.com/organizations/')}/settings/profile), rubrique **Profile picture** (**Edit → Upload a photo…**). Il est produit
par le build du site : en ligne une fois le site déployé.

## 5. Régénérer

Après \`npm ci\` (le script lit \`products.ts\` avec esbuild, fourni avec Astro) :

- \`npm run readme-kit\` réécrit ce répertoire ; commite le résultat avec la modification de
  \`products.ts\`.
- \`npm run readme-kit:check\` ne réécrit rien et échoue si le répertoire n'est pas à jour. La CI
  (\`.gitea/workflows/ci.yml\`, job \`build\`) le lance : modifier \`products.ts\` sans régénérer la fait
  échouer.

Les images (plaque, affiches, cartes, avatar) ne sont pas dans ce répertoire : le site les sert, et le
contrôle \`scripts/check-dist.mjs\` fait échouer le build si l'une manque.
`;
}

// --- Write or check ----------------------------------------------------------------------------------

const files = new Map([
  ['README.md', guide()],
  ['profile/README.md', orgReadme()],
  ...products.map((p) => [`repos/${p.slug}.md`, repoHeader(p)]),
]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [relative(kitDir, p).split(sep).join('/')];
  });
}

const onDisk = walk(kitDir);

if (check) {
  const problems = [];
  for (const [path, content] of files) {
    const abs = join(kitDir, path);
    if (!existsSync(abs)) {
      problems.push(`missing: readme-kit/${path}`);
      continue;
    }
    const current = readFileSync(abs, 'utf8');
    if (current !== content) {
      const a = current.split('\n');
      const b = content.split('\n');
      const i = a.findIndex((line, n) => line !== b[n]);
      const at = i === -1 ? Math.min(a.length, b.length) : i;
      problems.push(
        `out of date: readme-kit/${path} (line ${at + 1})\n      committed: ${JSON.stringify(a[at] ?? '<end of file>')}\n      expected:  ${JSON.stringify(b[at] ?? '<end of file>')}`,
      );
    }
  }
  for (const path of onDisk) {
    if (!files.has(path)) problems.push(`not generated (stale?): readme-kit/${path}`);
  }
  if (problems.length) {
    console.error(`FAIL: readme-kit/ is not up to date with src/data/products.ts (${problems.length} problem(s))`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error('Run `npm run readme-kit` and commit readme-kit/.');
    process.exit(1);
  }
  console.log(`OK: readme-kit/ is up to date (${files.size} files, ${products.length} products).`);
} else {
  for (const path of onDisk) {
    if (!files.has(path)) rmSync(join(kitDir, path));
  }
  for (const [path, content] of files) {
    const abs = join(kitDir, path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  console.log(`readme-kit/ written: ${[...files.keys()].join(', ')}`);
}
