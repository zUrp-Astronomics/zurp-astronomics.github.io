#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — README kit generator: GitHub organisation README, product README headers, user guide, from the catalog the site was built with
// AUTHOR: engineer
// DATE: 2026-10-03 (revised 2026-10-06, ticket #46: generated at each deployment, no longer committed)
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the texts and the layout are Mustache templates in content/readme-kit/; this script only computes what they show
// REVISED: 2026-10-06 (ticket #53) — the product header is pasted ONCE: URLs only (poster, status badge served from the site's JSON, GitHub licence badge), no text of the sheet
// REVISED: 2026-10-06 (ticket #66) — no licence anywhere in the kit: the org README's licence badges
//   and sentence and the product header's GitHub licence badge are gone (a project's licence is its
//   repository's LICENSE, which GitHub shows in the repository's « About » box)
// REVISED: 2026-10-06 (ticket #75) — the product header carries the two licence badges the site draws
//   (software, hardware: /brand/badges/<slug>/<kind>.svg, empty when the repository declares none),
//   after the status badge; the org README still carries no licence
// REVISED: 2026-10-10 (ticket #83) — the product header shows the poster by a RELATIVE path,
//   9_Assets/<slug>.webp of the product repository itself (the human's decision: a README points at
//   the folder beside it, so an offline clone shows it); the org README keeps the absolute poster URLs
// REVISED: 2026-10-10 (ticket #92) — every product has its repository: no « product without a
//   repository » any more (`hasRepo`, `noRepo` gone, the templates show the repository of each)
//
// Usage (after the build, which writes the catalog snapshot .zurp-catalog/remote.json):
//   npm run readme-kit                     writes the kit into .zurp-catalog/readme-kit/ (git-ignored)
//   node scripts/readme-kit.mjs [--catalog <remote.json>] [--out <dir>]
//
// The output mirrors the repository zUrp-Astronomics/.github, where .github/workflows/deploy.yml
// copies it after EACH deployment (dispatches from product repositories included):
//   profile/README.md                  the organisation README (GitHub shows it on the org page)
//   readme-kit/README.md               the user guide (French: the human is a French speaker)
//   readme-kit/repos/<slug>.md         the header block of each product repository's README, pasted
//                                      ONCE: it holds only URLs whose content is served and kept up
//                                      to date elsewhere (ticket #53, see repoHeader below)
//
// WHY NOT COMMITTED ANY MORE. Part of the catalog is read on GitHub at build time (the product
// repositories' sheets and releases): a file committed here could not be the truth of the org
// README, it would silently drift from the deployed site. The kit is generated from the SAME
// catalog the site was just built with (scripts/lib/catalog.mjs: the build's snapshot, assembled
// by the site's own function), so the org README always shows what the site
// shows, in the same order. Nothing is committed in THIS repository by any workflow (it is
// published by the fleet: a pushed commit would stop the next publication).
//
// TEMPLATES (ticket #49). Every word and the whole layout of the three kinds of file are in
// content/readme-kit/ — org-readme.md (+ projects-table.md), product-header.md, guide.md — and
// content/ (site.yml, catalog.yml, home/pitch.md): logic-less Mustache templates, which the human
// edits without touching this script. This script computes their values (URLs, the grouping of the
// projects) and provides one helper, `{{#badge}}label|message|colour{{/badge}}`: a shields.io static badge.
// `{{x}}` is HTML-escaped (for HTML tags), `{{{x}}}` is inserted as is (for Markdown).
//
// DETERMINISTIC. The output depends only on the catalog, content/, the `site` of astro.config.mjs
// and this script: no date, no hash, no build stamp — so the sync only commits in .github when
// something really changed.
//
// URLS. The image URLs mirror the convention of src/lib/brand-images.ts (panel, series 2 posters,
// social preview cards) — change both together, or never. scripts/check-dist.mjs fails the build
// when one of those files is missing from dist/.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import Mustache from 'mustache';
import { loadBuiltCatalog, repoRoot } from './lib/catalog.mjs';
import { SNAPSHOT_DIR } from '../src/lib/catalog/loader.mjs';
import { escapeHtml, readMarkdown, readYaml, siteContent } from '../src/lib/content.mjs';
import { shieldsEndpoint, statusBadgePath } from '../src/lib/status-badge.mjs';
import { licenseBadgePath } from '../src/lib/license-badge.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const outDir = resolve(arg('--out') ?? join(repoRoot, SNAPSHOT_DIR, 'readme-kit'));
const snapshotFile = arg('--catalog') && resolve(arg('--catalog'));

// --- Sources ---------------------------------------------------------------------------------------

const { products, sections } = await loadBuiltCatalog({ snapshotFile });
const site = siteContent(repoRoot);
const kit = readYaml('readme-kit/kit.yml', repoRoot);
const template = (name) => readMarkdown(`readme-kit/${name}.md`, repoRoot);

const astroConfig = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');
const SITE = astroConfig.match(/\bsite:\s*['"`]([^'"`]+)['"`]/)?.[1]?.replace(/\/+$/, '');
if (!SITE) throw new Error('readme-kit: no `site` found in astro.config.mjs');
if (!products?.length || !sections?.length) throw new Error('readme-kit: empty catalog — content/ or the snapshot changed shape?');

// --- URLs (mirror of src/lib/brand-images.ts) ---------------------------------------------------------

const ORG_URL = site.org.url.replace(/\/+$/, '');
const panelUrl = `${SITE}/brand/low-tech-diy.webp`;
const posterUrl = (p) => `${SITE}/brand/posters/${p.slug}.webp`;
// The poster as the product repository itself holds it (ticket #83), relative to its README: the
// product header only. Generated, never checked: the campaign #81 aligns the repositories on it.
const posterPath = (p) => `9_Assets/${p.slug}.webp`;
const socialUrl = (p) => `${SITE}/brand/social/${p.slug}.jpg`;
// Organisation avatar: mirror of src/lib/site-icons.ts (checked in dist/ by scripts/check-dist.mjs).
const avatarUrl = `${SITE}/brand/avatar.png`;
const pageUrl = (p) => `${SITE}/${p.slug}/`;
// Status JSON of a product (src/lib/status-badge.mjs, published by src/pages/brand/status/[slug].json.ts).
const statusJsonUrl = (p) => `${SITE}/${statusBadgePath(p.slug)}`;
// Licence badges of a product (src/lib/license-badge.mjs, published by src/pages/brand/badges/[slug]/[kind].svg.ts).
const licenseBadgeUrl = (p, kind) => `${SITE}/${licenseBadgePath(p.slug, kind)}`;
const siteHost = SITE.replace(/^https?:\/\//, '');

/** `zUrp-Astronomics/Basilisk` for https://github.com/zUrp-Astronomics/Basilisk. */
const repoPath = (p) => p.repo.replace(/^https:\/\/github\.com\//, '').replace(/\/+$/, '');

// --- Template helpers ---------------------------------------------------------------------------------

/** shields.io static badge: `-` and `_` are escaped by doubling, the rest is URL-encoded. */
const shieldPart = (s) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__'));
const shield = (label, message, color) =>
  `![${label}: ${message}](https://img.shields.io/badge/${shieldPart(label)}-${shieldPart(message)}-${color})`;

/** `{{#badge}}label|message|colour{{/badge}}` (the message may itself hold a `|`). */
const badge = () => (text, render) => {
  const s = render(text);
  const first = s.indexOf('|');
  const last = s.lastIndexOf('|');
  if (first < 0 || first === last) throw new Error(`readme-kit: badge ${JSON.stringify(s)} is not label|message|colour`);
  return shield(s.slice(0, first).trim(), s.slice(first + 1, last).trim(), s.slice(last + 1).trim());
};

const render = (name, view, partials = {}) =>
  Mustache.render(template(name), { ...view, badge }, partials, { escape: escapeHtml });

const common = { generated: kit.generated, siteUrl: SITE, orgUrl: ORG_URL };

// --- 1. Organisation README (zUrp-Astronomics/.github → profile/README.md) ---------------------------

const projectView = (p) => ({
  name: p.name,
  tagline: p.tagline,
  basedOn: p.basedOn,
  repo: p.repo,
  pageUrl: pageUrl(p),
  posterUrl: posterUrl(p),
});

/** Products of `list`, one entry per catalog section (sections order, empty ones skipped). */
const bySection = (list) =>
  sections
    .map((s) => ({ title: s.title, products: list.filter((p) => p.section === s.id).map(projectView) }))
    .filter((s) => s.products.length > 0);

function orgReadme() {
  // Grouping (the human's README, kept): work in progress by catalog section, then the `future`
  // section on its own (its title + " projects"), then the released products by section (the
  // template says what shows while there is none). A released product leaves the work-in-progress
  // list for the released one.
  const FUTURE = 'future';
  const notReleased = products.filter((p) => p.status !== 'released');
  const released = products.filter((p) => p.status === 'released');
  const future = notReleased.filter((p) => p.section === FUTURE);
  return render(
    'org-readme',
    {
      ...common,
      name: site.name,
      tagline: site.tagline,
      signature: site.signature,
      pitch: readMarkdown('home/pitch.md', repoRoot).trim(),
      panelUrl,
      panelAlt: kit.panelAlt,
      siteHost,
      wipSections: bySection(notReleased.filter((p) => p.section !== FUTURE)),
      future: future.length ? { title: sections.find((s) => s.id === FUTURE).title, products: future.map(projectView) } : null,
      releasedSections: bySection(released),
    },
    { projects: template('projects-table') },
  );
}

// --- 2. Product README headers (top of each product repository's README.md) -------------------------
//
// PASTED ONCE (ticket #53, the human's decision). The site never writes in the product repositories,
// so a header that copied the sheet went stale at the first change or release. The block holds only
// URLs whose content is served, and kept up to date, elsewhere — and no text of the sheet (name,
// slogan, tagline, « based on », posterAlt): it is never pasted again, such a text would go stale:
//   - the poster, 9_Assets/<slug>.webp of the repository itself, a relative path (ticket #83: an
//     offline clone shows it too), linking to the product page;
//   - the status badge: shields.io renders /brand/status/<slug>.json, which the site rewrites at each
//     build (src/lib/status-badge.mjs);
//   - the software licence badge, then the hardware one (ticket #75: « je veux la licence hardware »):
//     SVG files the site draws at each build, /brand/badges/<slug>/software.svg and hardware.svg
//     (src/lib/license-badge.mjs) — the licence the repository declares (LICENSE, LICENSE-HARDWARE),
//     or an empty SVG GitHub shows as nothing. So the block pasted today shows a licence the day its
//     file arrives in the repository, and never « not specified » (why #66 had dropped the GitHub
//     licence badge).
// Its alt texts and the comments around it come from content/readme-kit/kit.yml (`header`).

function repoHeader(p) {
  return render('product-header', {
    header: kit.header,
    pageUrl: pageUrl(p),
    posterPath: posterPath(p),
    statusBadgeUrl: shieldsEndpoint(statusJsonUrl(p)),
    softwareBadgeUrl: licenseBadgeUrl(p, 'software'),
    hardwareBadgeUrl: licenseBadgeUrl(p, 'hardware'),
  });
}

// --- 3. User guide (French: the human is a French speaker) -------------------------------------------

function guide() {
  return render('guide', {
    ...common,
    begin: kit.header.begin,
    end: kit.header.end,
    statusJsonUrl: `${SITE}/${statusBadgePath('<produit>')}`,
    softwareBadgeUrl: `${SITE}/${licenseBadgePath('<produit>', 'software')}`,
    hardwareBadgeUrl: `${SITE}/${licenseBadgePath('<produit>', 'hardware')}`,
    avatarUrl,
    orgSettingsUrl: `${ORG_URL.replace('github.com/', 'github.com/organizations/')}/settings/profile`,
    products: products.map((p) => ({
      name: p.name,
      slug: p.slug,
      repo: p.repo,
      repoPath: repoPath(p),
      socialUrl: socialUrl(p),
    })),
  });
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
