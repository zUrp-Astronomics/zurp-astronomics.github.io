// SOURCE: zurp-astronomics-site — what a product publishes to install: the release that provides it, its ESP Web Tools manifest (validated, downloaded with the files it names), its .hex and .img.xz (linked, never downloaded)
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #101 (replaces the ESP Launchpad publication of ticket #96)
//
// WHY (ticket #101, the human: « on n'invente pas la roue »). One publication for every product, in
// the 2026 canon of the OSS tinker world:
//   - ESP: ESP Web Tools (esphome/esp-web-tools, used by ESPHome, WLED, Tasmota…). ONE manifest.json
//     per product covers all its chips: the tool detects the chip plugged in and picks its build. It
//     downloads from the browser, so the site serves the manifest and the files it names from Pages
//     (src/lib/install.mjs: the paths);
//   - STM32: a `.hex` (it carries its load address), flashed over SWD (ST-Link, STM32CubeProgrammer);
//   - RPi: an `.img.xz`, written by Raspberry Pi Imager or Etcher.
// The .hex and the .img.xz are LINKED where GitHub serves them (`browser_download_url`): the site
// never copies them.
//
// THE CONTRACT WITH THE PRODUCTS (sent to starfleet and to Basilisk on 2026-10-12 — FIXED):
//   - the product pushes a semver tag; its GitHub Actions build, create the release with its files,
//     then send the `zurp-catalog` dispatch (secret ZURP_SITE_DISPATCH);
//   - files are named `<product>_<version>_<target>.<ext>`, lower case; the one exception is the ESP
//     manifest, recognised by its exact name `manifest.json`;
//   - ESP: one merged image per chip (offset 0) and a `manifest.json` in the ESP Web Tools format,
//     each `path` the name of a file attached to the same release; STM32: a `.hex`; RPi: an `.img.xz`;
//     a product running an upstream firmware (Unicorn, TeenAstro) publishes nothing.
// The site does not judge the names (only the manifest's exact name and the two extensions are
// read): the naming is the products' norm, § 5-6 of content/readme-kit/guide.md.
//
// THE RELEASE: the latest published release (drafts and unreadable dates left out, by `published_at`,
// prereleases included — read.mjs's latestRelease, « tant que ça pop ça update ») that carries AT
// LEAST ONE INSTALLABLE FILE: `manifest.json`, a `*.hex` or a `*.img.xz`. A later release without one
// takes nothing away: that is the nominal case while a release is being built.
//
// THE MANIFEST (validated against ESP Web Tools 10.4.0, the version the page loads, package.json —
// checked in its sources, src/const.ts and src/flash.ts):
//   - an object, `name` and `version` non-empty texts, `builds` a non-empty list;
//   - each `chipFamily` one of the families of src/const.ts (ESP_CHIP_FAMILIES below; test/install.test.mjs
//     compares it with node_modules/esp-web-tools/src/const.ts, so a new pin cannot leave it stale);
//   - `serialType`, when present, `cdc` or `uart`; the pair (chipFamily, serialType) appears once: since
//     10.3.0 a canonical manifest may carry two builds of one chip that differ by serialType, and
//     src/flash.ts picks the build by that pair (an absent serialType is the fallback, a value of its
//     own). The site never refuses a canonical manifest;
//   - each build has a non-empty list of parts, each with `path` the bare name of a file attached to
//     the same release (no `/`, no URL: the browser resolves it relative to the manifest's URL and
//     must find that very file) and `offset` an integer ≥ 0.
//   Every other field (new_install_prompt_erase, improv, funding_url…) passes as is: not judged.
//   An invalid manifest, or one naming a file the release does not carry: the ESP part is NOT
//   published — no fall back to an older release, the product page stays online (with its .hex or
//   .img.xz if the release carries some), the problems are reported (`rejected`), never thrown.
//   A failure of the backend (GitHub answering badly) throws: the build fails, as everywhere.
//
// WHAT IS READ (the human's rule, read.mjs): of everything attached to the releases, ONLY the
// manifest.json of the release selected and the files THAT manifest names are downloaded. The .hex
// and .img.xz are never downloaded. The list of releases the backend already returned gives the
// assets (name, size, id, browser_download_url): no other request to find them.

import { createHash } from 'node:crypto';

/** The ESP Web Tools manifest a product attaches to a release, recognised by this exact name. */
export const ESP_MANIFEST = 'manifest.json';

/** The ESP Web Tools the product page loads: exactly this version (package.json pins it). */
export const ESP_WEB_TOOLS_VERSION = '10.4.0';

/**
 * The chip families ESP Web Tools 10.4.0 knows: `Build["chipFamily"]` in its src/const.ts (the names
 * esptool-js gives the chip it detects). test/install.test.mjs reads them from the installed package.
 */
export const ESP_CHIP_FAMILIES = Object.freeze([
  'ESP32',
  'ESP32-C2',
  'ESP32-C3',
  'ESP32-C5',
  'ESP32-C6',
  'ESP32-C61',
  'ESP32-H2',
  'ESP32-P4',
  'ESP32-S2',
  'ESP32-S3',
  'ESP8266',
]);

/** `Build["serialType"]` in ESP Web Tools' src/const.ts. */
export const ESP_SERIAL_TYPES = Object.freeze(['cdc', 'uart']);

/** The files linked for download, by kind: an STM32 `.hex`, a Raspberry Pi `.img.xz`. */
export const DOWNLOAD_KINDS = Object.freeze([
  { kind: 'hex', suffix: '.hex' },
  { kind: 'img', suffix: '.img.xz' },
]);

/** The kind of a file a product links for download (`hex`, `img`), or null. */
export const downloadKind = (name) => DOWNLOAD_KINDS.find((k) => name.endsWith(k.suffix) && name.length > k.suffix.length)?.kind ?? null;

/** Whether a file attached to a release is installable: the ESP manifest, a .hex, an .img.xz. */
export const isInstallable = (name) => typeof name === 'string' && (name === ESP_MANIFEST || downloadKind(name) !== null);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Whether a manifest's `path` is the bare name of a file, which a browser resolving it relative to
 * the manifest's URL finds under that very name (no directory, no URL, no query, no fragment).
 */
export function isBareFileName(path) {
  if (!isText(path) || path === '.' || path === '..' || /[/\\]/.test(path)) return false;
  try {
    const url = new URL(path, 'https://site.invalid/dir/');
    return url.origin === 'https://site.invalid' && !url.search && !url.hash && decodeURIComponent(url.pathname) === `/dir/${path}`;
  } catch {
    return false;
  }
}

/**
 * The release that provides what a product installs: the latest published one (drafts and
 * unreadable dates left out, as latestRelease does) carrying at least one installable file; null
 * when none does.
 * @param {any[]} releases as the backend lists them (GitHub's objects, `assets` included)
 * @returns {{ tag: string, publishedAt: string, release: any } | null}
 */
export function installRelease(releases) {
  let best = null;
  for (const r of releases) {
    if (r.draft || !r.published_at) continue;
    const t = Date.parse(r.published_at);
    if (Number.isNaN(t)) continue; // reported by latestRelease (read.mjs)
    if (!(r.assets ?? []).some((a) => isInstallable(a?.name))) continue;
    if (!best || t > best.t) best = { t, tag: String(r.tag_name), publishedAt: new Date(t).toISOString(), release: r };
  }
  return best && { tag: best.tag, publishedAt: best.publishedAt, release: best.release };
}

/**
 * Validates a parsed ESP Web Tools manifest against the files attached to its release. Returns the
 * list of problems (empty when valid), each naming its field.
 * @param {unknown} manifest
 * @param {Array<{ name: string }>} assets the files attached to the same release
 */
export function espManifestProblems(manifest, assets) {
  if (!isObject(manifest)) return ['the manifest is not a JSON object'];
  const problems = [];
  for (const key of ['name', 'version']) {
    if (!(key in manifest)) problems.push(`field \`${key}\`: missing`);
    else if (!isText(manifest[key])) problems.push(`field \`${key}\`: must be a non-empty text`);
  }
  const builds = manifest.builds;
  if (!('builds' in manifest)) return [...problems, 'field `builds`: missing'];
  if (!Array.isArray(builds) || builds.length === 0) return [...problems, 'field `builds`: must be a list of at least one build'];
  const attached = new Set(assets.map((a) => a.name));
  const pairs = new Map();
  builds.forEach((build, b) => {
    const at = `builds[${b}]`;
    if (!isObject(build)) {
      problems.push(`field \`${at}\`: must be an object { chipFamily, parts }`);
      return;
    }
    let pairOk = true;
    if (!('chipFamily' in build)) {
      problems.push(`field \`${at}.chipFamily\`: missing`);
      pairOk = false;
    } else if (!ESP_CHIP_FAMILIES.includes(build.chipFamily)) {
      problems.push(`field \`${at}.chipFamily\`: ${JSON.stringify(build.chipFamily)} is not a chip family of ESP Web Tools ${ESP_WEB_TOOLS_VERSION} (${ESP_CHIP_FAMILIES.join(', ')})`);
      pairOk = false;
    }
    if ('serialType' in build && build.serialType !== undefined && !ESP_SERIAL_TYPES.includes(build.serialType)) {
      problems.push(`field \`${at}.serialType\`: ${JSON.stringify(build.serialType)} is not one of: ${ESP_SERIAL_TYPES.join(', ')}`);
      pairOk = false;
    }
    if (pairOk) {
      const key = `${build.chipFamily}\u0000${build.serialType ?? ''}`;
      const label = build.serialType === undefined ? `${build.chipFamily} without serialType` : `${build.chipFamily} with serialType ${build.serialType}`;
      if (pairs.has(key)) problems.push(`field \`${at}\`: a second build for ${label} (the first is builds[${pairs.get(key)}]) — ESP Web Tools picks a build by chipFamily and serialType`);
      else pairs.set(key, b);
    }
    const parts = build.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      problems.push(`field \`${at}.parts\`: must be a list of at least one part`);
      return;
    }
    parts.forEach((part, i) => {
      const where = `${at}.parts[${i}]`;
      if (!isObject(part)) {
        problems.push(`field \`${where}\`: must be an object { path, offset }`);
        return;
      }
      const path = part.path;
      if (!('path' in part)) problems.push(`field \`${where}.path\`: missing`);
      else if (!isBareFileName(path)) problems.push(`field \`${where}.path\`: ${JSON.stringify(path)} must be the bare name of a file attached to this release (no /, no URL)`);
      else if (path === ESP_MANIFEST || !attached.has(path)) problems.push(`field \`${where}.path\`: ${JSON.stringify(path)} is not a file attached to this release`);
      if (!('offset' in part)) problems.push(`field \`${where}.offset\`: missing`);
      else if (!Number.isSafeInteger(part.offset) || part.offset < 0) problems.push(`field \`${where}.offset\`: ${JSON.stringify(part.offset)} is not an integer ≥ 0`);
    });
  });
  return problems;
}

/** The id of a published ESP folder: it changes as soon as the manifest or a file it names does. */
export function espId(manifestSha256, files) {
  const lines = [manifestSha256, ...[...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map((f) => `${f.name} ${f.sha256}`)];
  return createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * What repository `repo` publishes to install, from the releases the backend listed. Returns:
 *   install    null (no release carries an installable file, or only an invalid manifest), or
 *              { tag, publishedAt,
 *                esp: null | { id, name, version, builds: [{ chipFamily, serialType }],
 *                              manifest: { name, size, sha256 }, files: [{ name, size, sha256 }] },
 *                downloads: [{ kind: 'hex' | 'img', name, size, url }] }
 *              (builds in the manifest's order, files in the order the manifest first names them,
 *              downloads by name);
 *   rejected   null, or the problems of the manifest of the release selected (each naming the
 *              repository, the release and the field): then `esp` is null;
 *   files      Map sha256 → bytes of the manifest and every file it names (never in the snapshot).
 * Downloads the manifest of the release selected and, when it is valid, the files it names — nothing
 * else. A failure of the backend is not caught: it throws.
 * @param {{ downloadAsset(repo: string, release: any, asset: any): Promise<Buffer> }} backend
 * @param {string} repo
 * @param {any[]} releases
 */
export async function readInstall(backend, repo, releases) {
  const files = new Map();
  const selected = installRelease(releases);
  if (!selected) return { install: null, rejected: null, files };
  const { tag, publishedAt, release } = selected;
  const assets = (release.assets ?? []).filter((a) => a && typeof a.name === 'string');

  const downloads = assets
    .filter((a) => downloadKind(a.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((a) => {
      if (typeof a.browser_download_url !== 'string' || !/^https:\/\//.test(a.browser_download_url)) {
        throw new Error(`catalog: repository ${repo}, release ${JSON.stringify(tag)}: the backend lists ${a.name} without a browser_download_url`);
      }
      return { kind: downloadKind(a.name), name: a.name, size: a.size, url: a.browser_download_url };
    });

  let esp = null;
  let rejected = null;
  const manifestAsset = assets.find((a) => a.name === ESP_MANIFEST);
  if (manifestAsset) {
    const where = `repository ${repo}, release ${JSON.stringify(tag)} (${ESP_MANIFEST})`;
    const raw = await download(backend, repo, release, manifestAsset);
    let manifest;
    let problems;
    try {
      manifest = JSON.parse(raw.toString('utf8').replace(/^﻿/, ''));
      problems = espManifestProblems(manifest, assets);
    } catch (e) {
      problems = [`not valid JSON — ${String(e?.message ?? e).split('\n')[0]}`];
    }
    if (problems.length) {
      rejected = problems.map((p) => `${where}: ${p}`);
    } else {
      const named = [];
      for (const name of new Set(manifest.builds.flatMap((b) => b.parts.map((p) => p.path)))) {
        const bytes = await download(backend, repo, release, assets.find((a) => a.name === name));
        const file = { name, size: bytes.length, sha256: sha256(bytes) };
        files.set(file.sha256, bytes);
        named.push(file);
      }
      const own = { name: ESP_MANIFEST, size: raw.length, sha256: sha256(raw) };
      files.set(own.sha256, raw); // copied as is: the bytes attached to the release
      esp = {
        id: espId(own.sha256, named),
        name: manifest.name.trim(),
        version: manifest.version.trim(),
        builds: manifest.builds.map((b) => ({ chipFamily: b.chipFamily, serialType: b.serialType ?? null })),
        manifest: own,
        files: named,
      };
    }
  }
  const install = esp || downloads.length ? { tag, publishedAt, esp, downloads } : null;
  return { install, rejected, files };
}

/** The bytes of `asset`, checked against the size the release lists: a mismatch is the backend's failure. */
async function download(backend, repo, release, asset) {
  const bytes = await backend.downloadAsset(repo, release, asset);
  if (typeof asset.size === 'number' && bytes.length !== asset.size) {
    throw new Error(
      `catalog: repository ${repo}, release ${JSON.stringify(release.tag_name)}: ${asset.name} downloaded as ${bytes.length} bytes, the release lists ${asset.size}`,
    );
  }
  return bytes;
}
