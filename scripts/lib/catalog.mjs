// SOURCE: zurp-astronomics-site — the catalog of the last build, for the scripts that run after it (check-dist, readme-kit)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #72) — no published list any more: the catalog is what was discovered;
//   it also gives what was left out (skipped, ignored releases)
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ is gone: the catalog is the
//   snapshot's products
//
// The same catalog the site was built with, assembled by the same function
// (src/lib/catalog/assemble.mjs) from the same inputs:
//   - the snapshot the build's loader wrote, .zurp-catalog/remote.json (src/lib/catalog/loader.mjs):
//     the products read from their repositories, from the source the build named. These scripts
//     never read GitHub (or the simulator) themselves: what they check and publish is what was
//     built. No snapshot (no build yet, or a build that failed reading) → they fail. It also holds
//     the repositories skipped and the releases ignored, for the catalog report
//     (src/lib/catalog/report.mjs);
//   - the sections (content/catalog.yml).

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleCatalog } from '../../src/lib/catalog/assemble.mjs';
import { SNAPSHOT_FILE, readSnapshot as readSnapshotFile } from '../../src/lib/catalog/loader.mjs';
import { catalogContent } from '../../src/lib/content.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The snapshot written by the build (default: .zurp-catalog/remote.json). */
export function readSnapshot(file = join(repoRoot, SNAPSHOT_FILE)) {
  return readSnapshotFile(file);
}

/**
 * The full catalog of the last build, in display order.
 * @param {{ snapshotFile?: string, root?: string }} options
 */
export async function loadBuiltCatalog({ snapshotFile, root = repoRoot } = {}) {
  const { sections } = catalogContent(root);
  const snapshot = readSnapshot(snapshotFile);
  return {
    products: assembleCatalog({ products: snapshot.products, sections }),
    sections,
    source: snapshot.source,
    read: snapshot.read,
    skipped: snapshot.skipped,
    ignoredReleases: snapshot.ignoredReleases,
  };
}
