// SOURCE: zurp-astronomics-site — reads the product repositories: the sheet 9_Assets/zurp.yml, its poster, the GitHub releases; validates the sheet
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #62) — the status is the sheet's, never deduced from a release (the
//   human: « repo public != projet releasé »); a release gives the version, the rank, a rebuild
//
// THE RULES (the human's, 2026-10-06 — see the workshop's plans/catalogue-dynamique.md):
//   - the site reads ONLY 9_Assets/ of a product repository, plus its GitHub releases. Never the
//     README, never the docs, no other directory;
//   - the sheet is 9_Assets/zurp.yml. A repository without it is not in the catalog (that leaves out
//     `.github`, the site's own repository, drafts);
//   - its fields are those of `Product` (src/data/catalog.ts), minus what is deduced:
//       slug      the repository name in lower case (`Kraken` → `kraken`)
//       repo      the repository's URL (the « Source » link)
//       release   the latest release: its tag, as is (the version shown), and its `published_at`
//                 (the moment it appears on the Releases page; it ranks the product in its section)
//     The poster is the file of 9_Assets/ named by `poster:`;
//   - the status (`wip`, `future`, `released`) is WRITTEN in the sheet: the human decides it. It is
//     never deduced from the releases — an alpha release of a firmware does not make the product
//     released (« repo public != projet releasé »);
//   - a release gives the version shown, the rank in the section and a rebuild — nothing else. NO
//     analysis of a release's name, tag or pre-release box: « tant que ça pop ça update ». A
//     prerelease counts like any other. Only drafts are left out: they are not on the Releases page
//     (no `published_at`, and invisible without push access anyway);
//   - the sheets come from elsewhere, so they are validated here: an invalid one (missing field,
//     unknown section, missing poster, …) fails the build with a message naming the repository and
//     the field. Every problem of every repository is reported at once.
//
// The products not migrated yet (content/products/<slug>/, ticket #49) are read by THIS code too,
// through a third backend that sees each folder as a repository's 9_Assets/ (local.mjs): same
// sheet, same validation. A backend may name its places itself (`where`, `origin`, `filePath`)
// for the messages.

import yaml from 'js-yaml';

/** Where a product repository keeps what the site reads. */
export const ASSETS_DIR = '9_Assets';
export const SHEET_PATH = `${ASSETS_DIR}/zurp.yml`;

const STRING_FIELDS = ['name', 'tagline', 'slogan', 'category', 'posterAlt'];
const SHEET_STATUSES = ['wip', 'future', 'released'];
const POSTER_EXT = /\.(png|jpe?g|webp|avif)$/i;
const ALLOWED = new Set([...STRING_FIELDS, 'section', 'status', 'description', 'basedOn', 'poster', 'accent']);
const DEDUCED = {
  slug: 'the slug is the repository name in lower case',
  repo: 'the « Source » link is the repository URL',
  release: 'the release comes from the GitHub releases',
  version: 'the version is the tag of the latest GitHub release',
  order: 'the order inside a section comes from the release dates, then the names',
};
/** Slugs that would collide with the site's own paths. */
const RESERVED_SLUGS = new Set(['brand']);

const isText = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Validates a parsed sheet. Returns the list of problems (empty when valid), each naming its field.
 * @param {unknown} sheet
 * @param {readonly string[]} sectionIds
 */
export function sheetProblems(sheet, sectionIds) {
  if (sheet === null || typeof sheet !== 'object' || Array.isArray(sheet)) {
    return ['the sheet is not a YAML mapping of fields'];
  }
  const problems = [];
  for (const key of Object.keys(sheet)) {
    if (DEDUCED[key]) problems.push(`field \`${key}\`: not allowed in the sheet (${DEDUCED[key]})`);
    else if (!ALLOWED.has(key)) problems.push(`field \`${key}\`: unknown field`);
  }
  for (const f of STRING_FIELDS) {
    if (!(f in sheet)) problems.push(`field \`${f}\`: missing`);
    else if (!isText(sheet[f])) problems.push(`field \`${f}\`: must be a non-empty text`);
  }
  if (!('section' in sheet)) problems.push('field `section`: missing');
  else if (!sectionIds.includes(sheet.section)) {
    problems.push(`field \`section\`: unknown section ${JSON.stringify(sheet.section)} (expected one of: ${sectionIds.join(', ')})`);
  }
  if (!('status' in sheet)) problems.push('field `status`: missing');
  else if (!SHEET_STATUSES.includes(sheet.status)) {
    problems.push(`field \`status\`: ${JSON.stringify(sheet.status)} is not one of: ${SHEET_STATUSES.join(', ')}`);
  }
  if (!('description' in sheet)) problems.push('field `description`: missing');
  else if (!Array.isArray(sheet.description) || sheet.description.length === 0 || !sheet.description.every(isText)) {
    problems.push('field `description`: must be a non-empty list of paragraphs (texts)');
  }
  if ('basedOn' in sheet && !isText(sheet.basedOn)) problems.push('field `basedOn`: must be a non-empty text when present');
  if (!('accent' in sheet)) problems.push('field `accent`: missing');
  else if (typeof sheet.accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(sheet.accent)) {
    problems.push(`field \`accent\`: ${JSON.stringify(sheet.accent)} is not a #rrggbb colour`);
  }
  if (!('poster' in sheet)) problems.push('field `poster`: missing');
  else {
    const p = sheet.poster;
    if (!isText(p)) problems.push('field `poster`: must name a file of 9_Assets/');
    else if (p.startsWith('/') || p.split('/').some((s) => s === '..' || s === '.' || s === '')) {
      problems.push(`field \`poster\`: ${JSON.stringify(p)} must be a path inside 9_Assets/ (no leading /, no ..)`);
    } else if (!POSTER_EXT.test(p)) {
      problems.push(`field \`poster\`: ${JSON.stringify(p)} is not a PNG, JPEG, WebP or AVIF file`);
    }
  }
  return problems;
}

/**
 * The latest release of a list as GitHub returns it, by `published_at`; null when there is none.
 * Drafts (not on the Releases page) are left out; nothing else is looked at.
 * @param {Array<{ tag_name?: string, published_at?: string | null, draft?: boolean }>} releases
 * @returns {{ tag: string, publishedAt: string } | null}
 */
export function latestRelease(releases) {
  let best = null;
  for (const r of releases) {
    if (r.draft || !r.published_at) continue;
    const t = Date.parse(r.published_at);
    if (Number.isNaN(t)) throw new Error(`release ${JSON.stringify(r.tag_name)}: unreadable published_at ${JSON.stringify(r.published_at)}`);
    if (!best || t > best.t) best = { t, tag: String(r.tag_name), publishedAt: new Date(t).toISOString() };
  }
  return best && { tag: best.tag, publishedAt: best.publishedAt };
}

/**
 * Reads every repository of the backend and returns the products it holds, in repository-name
 * order. Throws one error listing every problem found, each prefixed by its repository.
 * Each product also carries `posterPath`, the poster's path inside 9_Assets/ as the sheet names it.
 * @param {{ listRepos(): Promise<Array<{name: string, url: string}>>, readFile(repo: string, path: string): Promise<Buffer | null>, listReleases(repo: string): Promise<any[]>, describe?: string, where?(repo: string): string, origin?(repo: string): string, filePath?(repo: string, path: string): string }} backend
 * @param {{ sectionIds: readonly string[] }} options
 */
export async function readRepoProducts(backend, { sectionIds }) {
  const products = [];
  const problems = [];
  for (const { name: repoName, url } of await backend.listRepos()) {
    const raw = await backend.readFile(repoName, SHEET_PATH);
    if (raw === null) continue; // no sheet: not in the catalog
    const where = backend.where?.(repoName) ?? `repository ${repoName} (${SHEET_PATH})`;
    let sheet;
    try {
      sheet = yaml.load(raw.toString('utf8'), { filename: `${repoName}/${SHEET_PATH}` });
    } catch (e) {
      problems.push(`${where}: not valid YAML — ${e.message.split('\n')[0]}`);
      continue;
    }
    const slug = repoName.toLowerCase();
    const own = sheetProblems(sheet, sectionIds);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug) || RESERVED_SLUGS.has(slug)) {
      own.push(`repository name: slug ${JSON.stringify(slug)} cannot be a page of the site (lower-case letters, digits, - and _ only; not ${[...RESERVED_SLUGS].join(', ')})`);
    }
    let posterBytes = null;
    if (!own.some((p) => p.startsWith('field `poster`'))) {
      posterBytes = await backend.readFile(repoName, `${ASSETS_DIR}/${sheet.poster}`);
      if (posterBytes === null) {
        const shown = backend.filePath?.(repoName, `${ASSETS_DIR}/${sheet.poster}`);
        own.push(`field \`poster\`: ${shown ?? `${ASSETS_DIR}/${sheet.poster}`} does not exist${shown ? '' : ' in the repository'}`);
      }
    }
    let release = null;
    try {
      release = latestRelease(await backend.listReleases(repoName));
    } catch (e) {
      if (/^release /.test(e.message)) own.push(e.message);
      else throw e;
    }
    if (own.length) {
      problems.push(...own.map((p) => `${where}: ${p}`));
      continue;
    }
    const ext = sheet.poster.match(POSTER_EXT)[0].toLowerCase();
    products.push({
      slug,
      origin: backend.origin?.(repoName) ?? `repository ${repoName}`,
      name: sheet.name.trim(),
      tagline: sheet.tagline.trim(),
      slogan: sheet.slogan.trim(),
      category: sheet.category.trim(),
      section: sheet.section,
      repo: url,
      status: sheet.status,
      description: sheet.description.map((d) => d.trim()),
      ...(sheet.basedOn !== undefined ? { basedOn: sheet.basedOn.trim() } : {}),
      posterAlt: sheet.posterAlt.trim(),
      accent: sheet.accent,
      release,
      // Named after the slug, not after the sheet's file: Astro names the optimised variants after
      // the source file (_astro/<name>.<hash>.webp).
      posterFile: `${slug}${ext}`,
      posterPath: sheet.poster,
      posterBytes,
    });
  }
  if (problems.length) {
    throw new Error(
      `catalog: ${problems.length} problem(s) in the product sheets read from ${backend.describe ?? 'the source'}:\n` +
        problems.map((p) => `  - ${p}`).join('\n'),
    );
  }
  return products;
}
