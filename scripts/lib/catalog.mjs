// SOURCE: zurp-astronomics-site — the catalog of the last build, for the scripts that run after it (check-dist, readme-kit)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
//
// The same catalog the site was built with, assembled by the same function
// (src/lib/catalog/assemble.mjs) from the same inputs:
//   - src/data/products.ts, bundled with esbuild (declared in package.json; `npm ci` first), every
//     image import stubbed: these scripts never read pixels;
//   - the snapshot the build's loader wrote, .zurp-catalog/remote.json (src/lib/catalog/loader.mjs):
//     the products read from their repositories, from the source the build named. These scripts
//     never read GitHub (or the simulator) themselves: what they check and publish is what was
//     built. No snapshot (no build yet, or a build that failed reading) → they fail;
//   - the published list, src/data/published-slugs.mjs.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { assembleCatalog } from '../../src/lib/catalog/assemble.mjs';
import { SNAPSHOT_FILE } from '../../src/lib/catalog/loader.mjs';
import { publishedSlugs } from '../../src/data/published-slugs.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** products.ts and licenses.ts, as the site sees them (images stubbed). */
export async function loadLocalData() {
  const result = await build({
    stdin: {
      contents:
        "export { products, sections } from './src/data/products.ts';\n" +
        "export { licenses } from './src/data/licenses.ts';\n",
      resolveDir: repoRoot,
      sourcefile: 'catalog-entry.ts',
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
          b.onResolve({ filter: /\.(webp|png|jpe?g|avif|gif|svg)$/i }, (args) => ({ path: args.path, namespace: 'stub-image' }));
          b.onLoad({ filter: /.*/, namespace: 'stub-image' }, () => ({ contents: 'export default null;', loader: 'js' }));
        },
      },
    ],
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

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
 * @param {{ snapshotFile?: string }} options
 */
export async function loadBuiltCatalog({ snapshotFile } = {}) {
  const { products: local, sections, licenses } = await loadLocalData();
  const snapshot = readSnapshot(snapshotFile);
  const { products, unguarded } = assembleCatalog({
    local: local.map((p) => ({ ...p, release: null })),
    remote: snapshot.products,
    published: publishedSlugs,
    sections,
  });
  return { products, unguarded, sections, licenses, source: snapshot.source, read: snapshot.read };
}
