// SOURCE: zurp-astronomics-site — the catalog of the last build, for the scripts that run after it (check-dist, readme-kit)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the local products are read from content/products/ (src/data/products.ts and its esbuild bundling are gone)
//
// The same catalog the site was built with, assembled by the same function
// (src/lib/catalog/assemble.mjs) from the same inputs:
//   - the products not migrated yet, content/products/<slug>/, read and validated by the site's own
//     function (src/lib/catalog/local.mjs). These scripts never read pixels;
//   - the snapshot the build's loader wrote, .zurp-catalog/remote.json (src/lib/catalog/loader.mjs):
//     the products read from their repositories, from the source the build named. These scripts
//     never read GitHub (or the simulator) themselves: what they check and publish is what was
//     built. No snapshot (no build yet, or a build that failed reading) → they fail;
//   - the published list, src/data/published-slugs.mjs;
//   - the sections (content/catalog.yml).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleCatalog } from '../../src/lib/catalog/assemble.mjs';
import { SNAPSHOT_FILE } from '../../src/lib/catalog/loader.mjs';
import { readLocalProducts } from '../../src/lib/catalog/local.mjs';
import { catalogContent } from '../../src/lib/content.mjs';
import { publishedSlugs } from '../../src/data/published-slugs.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The snapshot written by the build (default: .zurp-catalog/remote.json). */
export function readSnapshot(file = join(repoRoot, SNAPSHOT_FILE)) {
  if (!existsSync(file)) {
    throw new Error(`no catalog snapshot at ${file} — run the build first (ZURP_CATALOG=simulator|github npm run build)`);
  }
  const snapshot = JSON.parse(readFileSync(file, 'utf8'));
  if (!snapshot || !Array.isArray(snapshot.products)) throw new Error(`${file}: not a catalog snapshot`);
  return snapshot;
}

/**
 * The full catalog of the last build, in display order.
 * @param {{ snapshotFile?: string, root?: string }} options
 */
export async function loadBuiltCatalog({ snapshotFile, root = repoRoot } = {}) {
  const { sections } = catalogContent(root);
  const local = (await readLocalProducts({ root, sectionIds: sections.map((s) => s.id) })).map(
    ({ posterBytes, ...p }) => p,
  );
  const snapshot = readSnapshot(snapshotFile);
  const { products, unguarded } = assembleCatalog({
    local,
    remote: snapshot.products,
    published: publishedSlugs,
    sections,
  });
  return { products, unguarded, sections, source: snapshot.source, read: snapshot.read };
}
