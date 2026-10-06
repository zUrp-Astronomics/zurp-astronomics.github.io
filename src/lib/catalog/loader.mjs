// SOURCE: zurp-astronomics-site — Astro content loader of the product repositories: reads the named source once per build, writes the posters and the catalog snapshot, fills the `repoProducts` collection
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
//
// Declared in src/content.config.ts. At each build (and `astro dev`/`astro sync`) it:
//   1. reads the source named by ZURP_CATALOG (source.mjs) — the build fails without it;
//   2. reads and validates every product sheet (read.mjs) — any problem fails the build;
//   3. EMPTIES .zurp-catalog/ (git-ignored) and writes there:
//        posters/<slug>.<ext>   each poster, named after the SLUG (Astro names the optimised
//                               variants after the source file: _astro/<slug>.<hash>.webp, the
//                               names the posters imported from src/assets/posters/ always had);
//        remote.json            the snapshot of what was read (no image bytes): the scripts that run
//                               after the build (scripts/check-dist.mjs, scripts/readme-kit.mjs)
//                               read THIS, so they see the catalog that was built — the source is
//                               never read twice. It is emptied first, so it never outlives a
//                               failed read: there is no fallback copy;
//   4. stores one entry per product, its `poster` given to the schema's image() as a local file:
//      Astro imports it like a poster of src/assets/ (same `fsPath`, same variants, no original
//      copied to dist/ as long as only `fsPath` is read outside <Image>/getImage).

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogSource, githubBackend, simulatorBackend, TOKEN_VAR } from './source.mjs';
import { readRepoProducts } from './read.mjs';

export const SNAPSHOT_DIR = '.zurp-catalog';
export const SNAPSHOT_FILE = `${SNAPSHOT_DIR}/remote.json`;
export const SIMULATOR_DIR = 'catalog-simulator';

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
  const products = await readRepoProducts(be, { sectionIds });
  mkdirSync(join(outDir, 'posters'), { recursive: true });
  for (const p of products) writeFileSync(join(outDir, 'posters', p.posterFile), p.posterBytes);
  const snapshot = {
    source,
    read: be.describe ?? source,
    products: products.map(({ posterBytes, ...rest }) => rest),
  };
  writeFileSync(join(root, SNAPSHOT_FILE), JSON.stringify(snapshot, null, 2) + '\n');
  return { snapshot, requests: be.requests };
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
      logger.info(
        `catalog source: ${snapshot.read} — ${snapshot.products.length} product(s) with a sheet` +
          (snapshot.products.length ? ` (${snapshot.products.map((p) => p.slug + (p.release ? ` ${p.release.tag}` : '')).join(', ')})` : '') +
          (requests !== undefined ? `, ${requests} API request(s)` : ''),
      );
    },
  };
}
