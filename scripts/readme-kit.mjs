#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — README kit generator: GitHub organisation README, product README headers, user guide, from the catalog the site was built with
// AUTHOR: engineer
// DATE: 2026-10-03 (revised 2026-10-06, ticket #46: generated at each deployment, no longer committed)
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the texts and the layout are Mustache templates in content/readme-kit/; this script only computes what they show
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
// catalog the site was just built with (scripts/lib/catalog.mjs: content/products/ + the build's
// snapshot, assembled by the site's own function), so the org README always shows what the site
// shows, in the same order. Nothing is committed in THIS repository by any workflow (it is
// published by the fleet: a pushed commit would stop the next publication).
//
// TEMPLATES (ticket #49). Every word and the whole layout of the three kinds of file are in
// content/readme-kit/ — org-readme.md (+ projects-table.md), product-header.md, guide.md — and
// content/ (site.yml, catalog.yml, home/pitch.md, licences/): logic-less Mustache templates, which
// the human edits without touching this script. This script computes their values (URLs, the
// grouping of the projects, which product has a repository, the licence sentences filled) and
// provides one helper, `{{#badge}}label|message|colour{{/badge}}`: a shields.io static badge.
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
import { catalogContent, escapeHtml, fill, licencesContent, readMarkdown, readYaml, siteContent } from '../src/lib/content.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const outDir = resolve(arg('--out') ?? join(repoRoot, SNAPSHOT_DIR, 'readme-kit'));
const snapshotFile = arg('--catalog') && resolve(arg('--catalog'));

// --- Sources ---------------------------------------------------------------------------------------

const { products, sections } = await loadBuiltCatalog({ snapshotFile });
const site = siteContent(repoRoot);
const { statuses } = catalogContent(repoRoot);
const licences = licencesContent(repoRoot);
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
const socialUrl = (p) => `${SITE}/brand/social/${p.slug}.jpg`;
// Organisation avatar: mirror of src/lib/site-icons.ts (checked in dist/ by scripts/check-dist.mjs).
const avatarUrl = `${SITE}/brand/avatar.png`;
const pageUrl = (p) => `${SITE}/${p.slug}/`;
const siteHost = SITE.replace(/^https?:\/\//, '');

/** A product with no dedicated repository yet has the organisation itself as its `repo`. */
const hasRepo = (p) => p.repo.replace(/\/+$/, '') !== ORG_URL;

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

/** A licence sentence of content/licences/, its markers filled (Markdown, inserted as is). */
const licenceSentence = (name, view = {}) => fill(readMarkdown(`licences/${name}.md`, repoRoot), { ...licences, ...view }).trim();

const common = { generated: kit.generated, licences, siteUrl: SITE, orgUrl: ORG_URL };

// --- 1. Organisation README (zUrp-Astronomics/.github → profile/README.md) ---------------------------

const projectView = (p) => ({
  name: p.name,
  tagline: p.tagline,
  basedOn: p.basedOn,
  repo: p.repo,
  hasRepo: hasRepo(p),
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
      licence: licenceSentence('org-readme'),
      wipSections: bySection(notReleased.filter((p) => p.section !== FUTURE)),
      future: future.length ? { title: sections.find((s) => s.id === FUTURE).title, products: future.map(projectView) } : null,
      releasedSections: bySection(released),
    },
    { projects: template('projects-table') },
  );
}

// --- 2. Product README headers (top of each product repository's README.md) -------------------------

const BEGIN = 'zurp-readme-header:begin';
const END = 'zurp-readme-header:end';

function repoHeader(p) {
  const status = statuses[p.status];
  if (!status) throw new Error(`readme-kit: no status ${JSON.stringify(p.status)} in content/catalog.yml`);
  return render('product-header', {
    ...common,
    begin: BEGIN,
    end: END,
    name: p.name,
    slogan: p.slogan,
    tagline: p.tagline,
    posterAlt: p.posterAlt,
    basedOn: p.basedOn,
    pageUrl: pageUrl(p),
    posterUrl: posterUrl(p),
    statusLabel: status.label,
    statusColor: status.badgeColor,
    licence: licenceSentence('product-readme', { basedOn: p.basedOn }),
  });
}

// --- 3. User guide (French: the human is a French speaker) -------------------------------------------

function guide() {
  const noRepo = products.filter((p) => !hasRepo(p));
  return render('guide', {
    ...common,
    begin: BEGIN,
    end: END,
    avatarUrl,
    orgSettingsUrl: `${ORG_URL.replace('github.com/', 'github.com/organizations/')}/settings/profile`,
    products: products.map((p) => ({
      name: p.name,
      slug: p.slug,
      hasRepo: hasRepo(p),
      repo: p.repo,
      repoPath: p.repo.replace('https://github.com/', ''),
      socialUrl: socialUrl(p),
    })),
    noRepo: noRepo.map((p, i) => ({ name: p.name, last: i === noRepo.length - 1 })),
    noRepoOne: noRepo.length === 1,
    noRepoMany: noRepo.length > 1,
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
