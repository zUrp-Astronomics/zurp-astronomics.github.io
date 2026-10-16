// SOURCE: zurp-astronomics-site — reads the product repositories: the sheet 9_Assets/zurp.yml, its poster, the GitHub releases, what a release publishes to install; validates the sheet
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #62) — the status is the sheet's, never deduced from a release (the
//   human: « repo public != projet releasé »); a release gives the version, the rank, a rebuild
// REVISED: 2026-10-06 (ticket #66) — each product carries `license`, its repository's licence as the
//   backend lists it (GitHub's detection of the LICENSE file; null when there is none)
// REVISED: 2026-10-06 (ticket #72) — full discovery: an invalid product is SKIPPED (reported, never
//   thrown: a repository's product is left out, the others are published); the poster is
//   decoded (sharp); a release with an unreadable `published_at` is ignored, reported
// REVISED: 2026-10-06 (ticket #75) — the hardware licence: LICENSE-HARDWARE at the root of a product's
//   repository, its first non-empty line (`hardwareLicense`), the one file read outside 9_Assets/
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ and its backend are gone:
//   every backend is a set of repositories, and every product's hardware licence is read from its
//   repository
// REVISED: 2026-10-12 (ticket #96) — the firmware: the manifest zurp-firmware.json of ONE release and
//   the files it names, the second exception to the rule below (arbitrated by the human); each
//   product carries `firmware`, the release rejected in `firmwareRejected`
// REVISED: 2026-10-12 (ticket #101) — the ESP Launchpad publication is gone: what a release publishes
//   to install (ESP Web Tools manifest.json, .hex, .img.xz) is `install`, a rejected manifest in
//   `installRejected`; the second exception below is rewritten
// REVISED: 2026-10-16 (ticket #107) — the web bench of the release selected (`install.bench`),
//   downloaded beside an install only; its problems in `benchProblems`, a key of their own
//
// THE RULES (the human's, 2026-10-06 — see the workshop's plans/catalogue-dynamique.md):
//   - the site reads ONLY 9_Assets/ of a product repository, plus its GitHub releases, plus ONE file
//     at its root: LICENSE-HARDWARE, its hardware licence (ticket #75 — an exception arbitrated by the
//     human). Never the README, never the docs, no other file, no other directory;
//   - of the files attached to the releases, it downloads ONLY the ESP Web Tools manifest
//     `manifest.json` of ONE release — the latest published one carrying an installable file
//     (manifest.json, *.hex, *.img.xz) — and the files THAT manifest names (the second exception,
//     arbitrated by the human: ticket #96, rewritten by ticket #101 on 2026-10-12) — and the web
//     bench `*_bench.html` of that same release, when it is its only one and the release publishes
//     an install (ticket #107). The .hex and
//     .img.xz of that release are only LISTED (their name, size and browser_download_url, from the
//     list of releases), never downloaded; nothing else attached is read. The selection, the
//     validation and the download are src/lib/catalog/install.mjs; what is published of it,
//     src/lib/install.mjs;
//   - the sheet is 9_Assets/zurp.yml. A repository without it is not in the catalog (that leaves out
//     `.github`, the site's own repository, drafts);
//   - its fields are those of `Product` (src/data/catalog.ts), minus what is deduced:
//       slug      the repository name in lower case (`Kraken` → `kraken`)
//       repo      the repository's URL (the « Source » link)
//       release   the latest release: its tag, as is (the version shown), and its `published_at`
//                 (the moment it appears on the Releases page; it ranks the product in its section)
//       license   the SOFTWARE licence: the one GitHub detects in the repository's LICENSE file, as
//                 the list of the organisation's repositories gives it (no other request, LICENSE is
//                 never read); null when there is none — never an error
//       install   null, or what the product page offers to install: the release that provides it
//                 (its tag, its `published_at` — it may be older than `release`), its ESP Web Tools
//                 manifest (null when absent or invalid) and its .hex / .img.xz links; an invalid
//                 manifest is reported (`installRejected`), the product is published all the same;
//                 and its web bench (`bench`, null when there is none), whose problems (two benches,
//                 or a bench without an install) are reported apart (`benchProblems`)
//       hardwareLicense
//                 the HARDWARE licence: { title }, the first non-empty line of LICENSE-HARDWARE at the
//                 root of the repository (ticket #75), read through the backend's readFile; null when
//                 the file is absent (a 404) or holds no text — never an error. Any other failure of
//                 the read is the backend's, and fails the build like any other. It is identified
//                 (its title looked up in content/licences.yml) where it is shown,
//                 src/lib/license-stamp.mjs
//     The poster is the file of 9_Assets/ named by `poster:`;
//   - the status (`wip`, `future`, `released`) is WRITTEN in the sheet: the human decides it. It is
//     never deduced from the releases — an alpha release of a firmware does not make the product
//     released (« repo public != projet releasé »);
//   - a release gives the version shown, the rank in the section, a rebuild — and, when it carries
//     an installable file, the install (above) — nothing else. NO
//     analysis of a release's name, tag or pre-release box: « tant que ça pop ça update ». A
//     prerelease counts like any other. Only drafts are left out: they are not on the Releases page
//     (no `published_at`, and invisible without push access anyway);
//   - the sheets come from elsewhere, so they are validated here. An invalid product (missing or
//     forbidden field, unknown section or status, unreadable YAML, poster absent, of a refused
//     extension, or whose bytes do not decode as an image) is SKIPPED: it is returned in `skipped`,
//     with every problem naming the repository and the field, and the others are read (ticket #72,
//     the human: « le site publie ce qu'il découvre »): the loader leaves it out of the catalog
//     with a warning (loader.mjs);
//   - a release whose `published_at` cannot be read is IGNORED (`ignoredReleases`), the product is
//     read with its other releases;
//   - an invalid ESP manifest, or a file it names that the release does not carry, never skips the
//     product: it is published WITHOUT its ESP install (no fall back to an older release), the
//     problems in `installRejected`, each naming the repository, the release and the field;
//   - only what was READ and is wrong, or is absent (a 404), skips a product: an error of the
//     backend itself (GitHub answering badly, source.mjs) is never caught here, it fails the build.
//
// The backends are the two of source.mjs, the simulator and GitHub (ticket #92: the third one, for
// the products folder of content/, is gone with that folder).

import yaml from 'js-yaml';
import sharp from 'sharp';
import { readInstall } from './install.mjs';

/** Where a product repository keeps what the site reads. */
export const ASSETS_DIR = '9_Assets';
export const SHEET_PATH = `${ASSETS_DIR}/zurp.yml`;
/** The hardware licence of a product repository, at its root (ticket #75). */
export const HARDWARE_LICENSE_PATH = 'LICENSE-HARDWARE';

const STRING_FIELDS = ['name', 'tagline', 'slogan', 'category', 'posterAlt'];
const SHEET_STATUSES = ['wip', 'future', 'released'];
const POSTER_EXT = /\.(png|jpe?g|webp|avif)$/i;
/** What sharp reports for the formats of POSTER_EXT (AVIF is a HEIF container). */
const POSTER_FORMATS = new Set(['png', 'jpeg', 'webp', 'heif']);
const ALLOWED = new Set([...STRING_FIELDS, 'section', 'status', 'description', 'basedOn', 'poster', 'accent']);
const DEDUCED = {
  slug: 'the slug is the repository name in lower case',
  repo: 'the « Source » link is the repository URL',
  release: 'the release comes from the GitHub releases',
  license: "the licence is the repository's LICENSE file, as GitHub detects it",
  install: 'what installs is read from the files attached to a release',
  hardwareLicense: "it is the first line of the repository's LICENSE-HARDWARE file",
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
 * Drafts (not on the Releases page) are left out; nothing else is looked at. A release whose
 * `published_at` cannot be read is left out too, and described in `ignored` (when given).
 * @param {Array<{ tag_name?: string, published_at?: string | null, draft?: boolean }>} releases
 * @param {string[]} [ignored] receives one message per release left out for an unreadable date
 * @returns {{ tag: string, publishedAt: string } | null}
 */
export function latestRelease(releases, ignored = []) {
  let best = null;
  for (const r of releases) {
    if (r.draft || !r.published_at) continue;
    const t = Date.parse(r.published_at);
    if (Number.isNaN(t)) {
      ignored.push(`release ${JSON.stringify(r.tag_name)}: unreadable published_at ${JSON.stringify(r.published_at)} — release ignored`);
      continue;
    }
    if (!best || t > best.t) best = { t, tag: String(r.tag_name), publishedAt: new Date(t).toISOString() };
  }
  return best && { tag: best.tag, publishedAt: best.publishedAt };
}

/**
 * The hardware licence a LICENSE-HARDWARE file declares: its first non-empty line, trimmed (a byte
 * order mark dropped), as { title }; null for a file without any text (equivalent to no licence).
 * @param {Buffer | string} bytes
 * @returns {{ title: string } | null}
 */
export function hardwareLicenseOf(bytes) {
  const text = (Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes)).replace(/^\uFEFF/, '');
  const title = text.split(/\r\n|\r|\n/).map((l) => l.trim()).find((l) => l !== '');
  return title ? { title } : null;
}

/**
 * The hardware licence of repository `repo`: LICENSE-HARDWARE at its root, read through the backend
 * (null when the file is absent). A failed read (anything but a 404) is not caught: it throws.
 */
export async function readHardwareLicense(backend, repo) {
  const raw = await backend.readFile(repo, HARDWARE_LICENSE_PATH);
  return raw === null ? null : hardwareLicenseOf(raw);
}

/**
 * Why `bytes` cannot be a poster, or null when they decode as a PNG, JPEG, WebP or AVIF image.
 * Decoded in full here, so that a corrupt file is a problem of its product, not a failure of Astro's
 * image pipeline later in the build.
 * @param {Buffer} bytes
 */
export async function posterImageProblem(bytes) {
  try {
    const meta = await sharp(bytes).metadata();
    if (!POSTER_FORMATS.has(meta.format) || !meta.width || !meta.height) {
      return `is not a PNG, JPEG, WebP or AVIF image (read as ${JSON.stringify(meta.format ?? null)})`;
    }
    await sharp(bytes).stats();
    return null;
  } catch (e) {
    return `does not decode as an image (${String(e?.message ?? e).split('\n')[0]})`;
  }
}

/**
 * Reads every repository of the backend and returns the products it holds, in repository-name
 * order, with the products skipped and the releases ignored — never throws for a product: an
 * invalid one is in `skipped`, with every problem prefixed by its place. An error of the backend
 * (a failed request) is not caught: it throws.
 * Its hardware licence is read (LICENSE-HARDWARE) and its install (install.mjs) once the product is
 * valid; a product whose ESP manifest is invalid is published without its ESP install, the manifest
 * in `installRejected`; a bench of its install release that is not published, in `benchProblems`.
 * @param {{ listRepos(): Promise<Array<{name: string, url: string, license?: { spdx_id: string | null, name: string | null } | null}>>, readFile(repo: string, path: string): Promise<Buffer | null>, listReleases(repo: string): Promise<any[]>, downloadAsset(repo: string, release: any, asset: any): Promise<Buffer>, describe?: string }} backend
 * @param {{ sectionIds: readonly string[] }} options
 * @returns {Promise<{ products: any[], skipped: Array<{ repo: string, origin: string, problems: string[] }>, ignoredReleases: Array<{ repo: string, origin: string, message: string }>, installRejected: Array<{ repo: string, origin: string, problems: string[] }>, benchProblems: Array<{ repo: string, origin: string, problems: string[] }> }>}
 */
export async function readRepoProducts(backend, { sectionIds }) {
  const products = [];
  const skipped = [];
  const ignoredReleases = [];
  const installRejected = [];
  const benchProblems = [];
  for (const { name: repoName, url, license } of await backend.listRepos()) {
    const raw = await backend.readFile(repoName, SHEET_PATH);
    if (raw === null) continue; // no sheet: not in the catalog
    const where = `repository ${repoName} (${SHEET_PATH})`;
    const origin = `repository ${repoName}`;
    const skip = (problems) => skipped.push({ repo: repoName, origin, problems: problems.map((p) => `${where}: ${p}`) });
    let sheet;
    try {
      sheet = yaml.load(raw.toString('utf8'), { filename: `${repoName}/${SHEET_PATH}` });
    } catch (e) {
      skip([`not valid YAML — ${e.message.split('\n')[0]}`]);
      continue;
    }
    const slug = repoName.toLowerCase();
    const own = sheetProblems(sheet, sectionIds);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug) || RESERVED_SLUGS.has(slug)) {
      own.push(`repository name: slug ${JSON.stringify(slug)} cannot be a page of the site (lower-case letters, digits, - and _ only; not ${[...RESERVED_SLUGS].join(', ')})`);
    }
    let posterBytes = null;
    if (!own.some((p) => p.startsWith('field `poster`'))) {
      const path = `${ASSETS_DIR}/${sheet.poster}`;
      posterBytes = await backend.readFile(repoName, path);
      if (posterBytes === null) {
        own.push(`field \`poster\`: ${path} does not exist in the repository`);
      } else {
        const bad = await posterImageProblem(posterBytes);
        if (bad) own.push(`field \`poster\`: ${path} ${bad}`);
      }
    }
    if (own.length) {
      skip(own);
      continue;
    }
    const ignored = [];
    const releases = await backend.listReleases(repoName);
    const release = latestRelease(releases, ignored);
    for (const message of ignored) ignoredReleases.push({ repo: repoName, origin, message: `${origin}: ${message}` });
    const hardwareLicense = await readHardwareLicense(backend, repoName);
    const { install, rejected, benchProblems: bench, files: installFiles } = await readInstall(backend, repoName, releases);
    if (rejected) installRejected.push({ repo: repoName, origin, problems: rejected });
    if (bench) benchProblems.push({ repo: repoName, origin, problems: bench });
    const ext = sheet.poster.match(POSTER_EXT)[0].toLowerCase();
    products.push({
      slug,
      origin,
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
      license: license ?? null,
      hardwareLicense,
      install,
      // Named after the slug, not after the sheet's file: Astro names the optimised variants after
      // the source file (_astro/<name>.<hash>.webp).
      posterFile: `${slug}${ext}`,
      posterBytes,
      // sha256 → bytes of the ESP manifest, its files and the bench: written next to the posters, never in the snapshot.
      installFiles,
    });
  }
  return { products, skipped, ignoredReleases, installRejected, benchProblems };
}
