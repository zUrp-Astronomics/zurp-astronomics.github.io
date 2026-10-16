// SOURCE: zurp-astronomics-site — Astro content loader of the product repositories: reads the named source once per build, writes the posters and the catalog snapshot, fills the `repoProducts` collection
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #72) — full discovery: a repository whose product is invalid is
//   skipped, not fatal (`skipped`), a release with an unreadable date ignored (`ignoredReleases`),
//   both kept in the snapshot for the catalog report
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ is gone: the snapshot no
//   longer lists the organisation's repositories (`repositories` served only to discover the
//   repository of a product of that folder); each product carries its licences and its URL itself
// REVISED: 2026-10-12 (ticket #96) — the firmware: its files written under firmware/, each product's
//   `firmware` and the manifests rejected (`firmwareRejected`) kept in the snapshot
// REVISED: 2026-10-12 (ticket #101) — `install` replaces `firmware` (ESP Web Tools manifest, .hex,
//   .img.xz), `installRejected` replaces `firmwareRejected`; firmware/ holds the manifest and its files
// REVISED: 2026-10-16 (ticket #107) — firmware/ holds the web bench too; `benchProblems` (a bench not
//   published) kept in the snapshot, required by readSnapshot, warned at the build
//
// Declared in src/content.config.ts. At each build (and `astro dev`/`astro sync`) it:
//   1. reads the source named by ZURP_CATALOG (source.mjs) — the build fails without it;
//   2. reads and validates every product sheet (read.mjs): a product whose sheet or poster is invalid
//      is SKIPPED, with a warning naming the repository and the field (ticket #72: the site
//      publishes what it discovers); a failed read of the source (GitHub answering badly) still
//      fails the build;
//   3. EMPTIES .zurp-catalog/ (git-ignored) and writes there:
//        posters/<slug>.<ext>   each poster, named after the SLUG (Astro names the optimised
//                               variants after the source file: _astro/<slug>.<hash>.webp, the
//                               names the posters of src/assets/posters/ had before ticket #49);
//        firmware/<sha256>      a product's ESP Web Tools manifest and each file it names (ticket
//                               #101), and its web bench (ticket #107), named after the SHA-256 of
//                               its bytes; published by src/pages/[slug]/firmware/ and
//                               src/pages/[slug]/bench/ (src/lib/install.mjs) — their bytes never
//                               go in the snapshot;
//        remote.json            the snapshot of what was read (no image bytes): the scripts that run
//                               after the build (scripts/check-dist.mjs, scripts/readme-kit.mjs)
//                               read THIS, so they see the catalog that was built — the source is
//                               never read twice. It is emptied first, so it never outlives a
//                               failed read: there is no fallback copy. Besides the products (each
//                               with its URL and its two licences, so the page and the README kit
//                               see the same ones), it keeps what was left out: `skipped` (the
//                               repositories whose product is invalid, with the problems),
//                               `ignoredReleases`, `installRejected` (the ESP manifests rejected,
//                               with the problems) and `benchProblems` (the benches not published,
//                               with the reason): src/lib/catalog/report.mjs prints them;
//   4. stores one entry per product, its `poster` given to the schema's image() as a local file:
//      Astro imports it like a poster of src/assets/ (same `fsPath`, same variants, no original
//      copied to dist/ as long as only `fsPath` is read outside <Image>/getImage).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogSource, githubBackend, simulatorBackend, TOKEN_VAR } from './source.mjs';
import { readRepoProducts } from './read.mjs';

export const SNAPSHOT_DIR = '.zurp-catalog';
export const SNAPSHOT_FILE = `${SNAPSHOT_DIR}/remote.json`;
export const SIMULATOR_DIR = 'catalog-simulator';
/** Where the build keeps the bytes of an ESP manifest, of a file it names or of a bench, named after its SHA-256. */
export const firmwareFile = (root, sha256) => join(root, SNAPSHOT_DIR, 'firmware', sha256);

/**
 * Reads the named source and writes .zurp-catalog/ under `root`. Returns the snapshot.
 * @param {{ root: string, env?: Record<string, string | undefined>, sectionIds: readonly string[], backend?: any }} options
 */
export async function readAndSnapshot({ root, env = process.env, sectionIds, backend }) {
  const outDir = join(root, SNAPSHOT_DIR);
  // Emptied BEFORE anything else: if the source is missing or the read fails, nothing of a previous
  // build is left to be used.
  rmSync(outDir, { recursive: true, force: true });
  const source = catalogSource(env);
  const be =
    backend ??
    (source === 'github' ? githubBackend({ token: env[TOKEN_VAR] || undefined }) : simulatorBackend(join(root, SIMULATOR_DIR)));
  const { products, skipped, ignoredReleases, installRejected, benchProblems } = await readRepoProducts(be, { sectionIds });
  mkdirSync(join(outDir, 'posters'), { recursive: true });
  mkdirSync(join(outDir, 'firmware'), { recursive: true });
  for (const p of products) {
    writeFileSync(join(outDir, 'posters', p.posterFile), p.posterBytes);
    for (const [sha256, bytes] of p.installFiles) writeFileSync(firmwareFile(root, sha256), bytes);
  }
  const snapshot = {
    source,
    read: be.describe ?? source,
    products: products.map(({ posterBytes, installFiles, ...rest }) => rest),
    skipped,
    ignoredReleases,
    installRejected,
    benchProblems,
  };
  writeFileSync(join(root, SNAPSHOT_FILE), JSON.stringify(snapshot, null, 2) + '\n');
  return { snapshot, requests: be.requests };
}

/**
 * The snapshot a build wrote (default: .zurp-catalog/remote.json under `root`). Throws when there is
 * none (no build yet, or a build that failed reading) or when it is not one — never a fallback.
 * @param {string} file
 */
export function readSnapshot(file) {
  if (!existsSync(file)) {
    throw new Error(`no catalog snapshot at ${file} — run the build first (ZURP_CATALOG=simulator|github npm run build)`);
  }
  const snapshot = JSON.parse(readFileSync(file, 'utf8'));
  const lists = ['products', 'skipped', 'ignoredReleases', 'installRejected', 'benchProblems'];
  if (!snapshot || !lists.every((k) => Array.isArray(snapshot[k]))) {
    throw new Error(`${file}: not a catalog snapshot (${lists.join(', ')}) — rebuild`);
  }
  return snapshot;
}

/**
 * The Astro loader (src/content.config.ts).
 * @param {{ sectionIds: readonly string[] }} options
 */
export function repoProductsLoader({ sectionIds }) {
  return {
    name: 'zurp-repo-products',
    async load({ store, parseData, logger, config }) {
      const root = fileURLToPath(config.root);
      const { snapshot, requests } = await readAndSnapshot({ root, sectionIds });
      store.clear();
      for (const p of snapshot.products) {
        const { posterFile, ...fields } = p;
        const data = await parseData({
          id: p.slug,
          data: { ...fields, poster: `./posters/${posterFile}` },
          filePath: join(root, SNAPSHOT_FILE),
        });
        store.set({ id: p.slug, data, filePath: SNAPSHOT_FILE });
      }
      for (const s of snapshot.skipped) logger.warn(`product SKIPPED — ${s.problems.join('; ')}`);
      for (const r of snapshot.ignoredReleases) logger.warn(r.message);
      for (const r of snapshot.installRejected) logger.warn(`ESP install NOT PUBLISHED — ${r.problems.join('; ')}`);
      for (const r of snapshot.benchProblems) logger.warn(`bench NOT PUBLISHED — ${r.problems.join('; ')}`);
      logger.info(
        `catalog source: ${snapshot.read} — ${snapshot.products.length} product(s) with a sheet` +
          (snapshot.skipped.length ? `, ${snapshot.skipped.length} skipped` : '') +
          (snapshot.products.length ? ` (${snapshot.products.map((p) => p.slug + (p.release ? ` ${p.release.tag}` : '')).join(', ')})` : '') +
          `; licences detected by GitHub: ${snapshot.products.filter((p) => p.license).map((p) => `${p.slug} ${p.license.spdx_id ?? p.license.name}`).join(', ') || 'none'}` +
          `; LICENSE-HARDWARE: ${snapshot.products.filter((p) => p.hardwareLicense).map((p) => `${p.slug} « ${p.hardwareLicense.title} »`).join(', ') || 'none'}` +
          `; install: ${snapshot.products.filter((p) => p.install).map((p) => `${p.slug} ${p.install.tag}`).join(', ') || 'none'}` +
          `; bench: ${snapshot.products.filter((p) => p.install?.bench).map((p) => `${p.slug} ${p.install.bench.name}`).join(', ') || 'none'}` +
          (requests !== undefined ? `, ${requests} API request(s)` : ''),
      );
    },
  };
}
