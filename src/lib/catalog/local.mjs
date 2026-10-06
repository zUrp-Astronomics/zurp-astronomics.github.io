// SOURCE: zurp-astronomics-site — the products not migrated to their repository yet: content/products/<slug>/ (zurp.yml + poster), read and validated by the code that reads the repositories
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — shrinking: a product leaves content/products/ when its folder moves to its repository's 9_Assets/
// REVISED: 2026-10-06 (ticket #66) — a local product carries the licence of its repository when the
//   organisation has one by its name (`repositories`, the list the build read, in its snapshot)
// REVISED: 2026-10-06 (ticket #72) — full discovery: the repository of a local product is found in
//   that list (its URL and its licence, one lookup); `withoutRepository` of content/catalog.yml is gone
//
// THE RULE (ticket #49). A product not migrated yet lives in content/products/<slug>/: its sheet
// `zurp.yml`, in the EXACT format of a repository's 9_Assets/zurp.yml, and its poster next to it.
// Migrating it to its repository is MOVING THAT FOLDER into the repository's 9_Assets/, nothing
// rewritten. So the folder is read as a repository whose 9_Assets/ it is, by the same reader
// (read.mjs: readRepoProducts, sheetProblems), through a third backend beside the simulator and
// GitHub:
//   slug      the folder name (lower case: it IS the slug, as the repository name is for GitHub);
//   repo, license
//             DISCOVERED (ticket #72, the human: « soit on peut faire de la découverte de repo, et
//             c'est full découverte, soit on peut pas »), in the organisation's repositories the
//             build listed (`repositories`: the snapshot's, src/lib/catalog/loader.mjs), by the name
//             of the folder, the case ignored (the real repositories are `Kraken`, `Kaiju`…):
//               - a repository found: the « Source » link is its URL as GitHub gives it (`html_url`,
//                 its case included), and its licence is the one GitHub detects in it (null without
//                 a LICENSE);
//               - none: the « Source » link is the organisation (content/site.yml, org.url), and
//                 there is no licence.
//             No list kept by hand: a repository created is found at the next build. A sheet may
//             not carry `repo` (read.mjs DEDUCED.repo);
//   releases  none (a product with releases has a repository, so its sheet is there).
// An invalid sheet here FAILS the build (every problem at once): this is the site's own repository,
// and the CI catches it before the merge. A slug both here and in a repository: the repository's
// sheet wins (src/lib/catalog/assemble.mjs).
//
// Read by the site (src/data/catalog.ts, which imports the posters) and by the scripts that run
// after the build (scripts/lib/catalog.mjs), with the same function: readLocalProducts().

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { ASSETS_DIR, readRepoProducts } from './read.mjs';
import { ORG } from './source.mjs';
import { CONTENT_DIR, contentDir, siteContent } from '../content.mjs';

/** Where the local products live, relative to the repository root. */
export const LOCAL_PRODUCTS_DIR = `${CONTENT_DIR}/products`;

/**
 * The repository of the organisation named `slug`, the case ignored; null when there is none.
 * @template {{ name: string }} R
 * @param {string} slug
 * @param {ReadonlyArray<R>} repositories
 * @returns {R | null}
 */
export function repositoryOf(slug, repositories) {
  const key = slug.toLowerCase();
  return repositories.find((r) => r.name.toLowerCase() === key) ?? null;
}

/**
 * content/products/ seen as repositories: each folder is a repository's 9_Assets/.
 * @param {string} dir content/products/
 * @param {{ orgUrl: string, repositories?: ReadonlyArray<{ name: string, url: string, license?: any }> }} options
 */
export function localBackend(dir, { orgUrl, repositories = [] }) {
  const root = resolve(dir);
  const org = orgUrl.replace(/\/+$/, '');
  const folder = (repo) => {
    const p = resolve(root, repo);
    if (!p.startsWith(root + sep)) throw new Error(`catalog (${LOCAL_PRODUCTS_DIR}): bad folder name ${JSON.stringify(repo)}`);
    return p;
  };
  return {
    describe: `${LOCAL_PRODUCTS_DIR}/`,
    where: (repo) => `${LOCAL_PRODUCTS_DIR}/${repo}/zurp.yml`,
    origin: (repo) => `${LOCAL_PRODUCTS_DIR}/${repo}/`,
    filePath: (repo, path) => `${LOCAL_PRODUCTS_DIR}/${repo}/${path.slice(ASSETS_DIR.length + 1)}`,
    async listRepos() {
      if (!existsSync(root)) return [];
      return readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .map((name) => {
          const found = repositoryOf(name, repositories);
          return found ? { name, url: found.url, license: found.license ?? null } : { name, url: org, license: null };
        });
    },
    async readFile(repo, path) {
      // Only 9_Assets/ exists in a product repository's eyes, and the folder is that 9_Assets/.
      if (!path.startsWith(`${ASSETS_DIR}/`)) return null;
      const base = folder(repo);
      const p = resolve(base, path.slice(ASSETS_DIR.length + 1));
      if (!p.startsWith(base + sep)) throw new Error(`catalog (${LOCAL_PRODUCTS_DIR}): path outside the folder: ${repo}/${path}`);
      return existsSync(p) && statSync(p).isFile() ? readFileSync(p) : null;
    },
    async listReleases() {
      return [];
    },
  };
}

/**
 * The local products, validated like the repositories' sheets. Each one also carries `posterFile`
 * (named after the slug), `posterPath` (as the sheet names it, relative to its folder) and
 * `posterBytes`. Throws on any problem, every problem at once: an invalid product here is never
 * skipped.
 * `repositories` is REQUIRED: the organisation's repositories as the build listed them, with their
 * URL and licence (the snapshot's `repositories`) — `[]` says on purpose that there is none to look
 * up. No default: a caller that forgot it would lose the links and the licences without a sound.
 * @param {{ root?: string, sectionIds: readonly string[], repositories: ReadonlyArray<{ name: string, url: string, license?: any }> }} options
 */
export async function readLocalProducts({ root = process.cwd(), sectionIds, repositories }) {
  if (!Array.isArray(repositories)) {
    throw new Error('catalog: readLocalProducts needs `repositories` (the organisation\'s repositories with their URL and licence, from the build\'s snapshot; [] for none)');
  }
  const bad = repositories.filter((r) => typeof r?.name !== 'string' || typeof r?.url !== 'string' || !r.url.startsWith('https://'));
  if (bad.length) {
    throw new Error(`catalog: readLocalProducts: a repository without its name or URL (${JSON.stringify(bad[0])}) — a snapshot of an older build? Rebuild`);
  }
  const dir = join(contentDir(root), 'products');
  const orgUrl = siteContent(root)?.org?.url;
  if (typeof orgUrl !== 'string' || !orgUrl.startsWith(`https://github.com/${ORG}`)) {
    throw new Error(`content: ${CONTENT_DIR}/site.yml: org.url must be the organisation's URL (https://github.com/${ORG})`);
  }
  const problems = [];
  const folders = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  for (const name of folders) {
    if (name !== name.toLowerCase()) problems.push(`${LOCAL_PRODUCTS_DIR}/${name}/: the folder name is the slug, in lower case`);
  }
  if (problems.length) throw new Error(`catalog: ${problems.length} problem(s) in ${LOCAL_PRODUCTS_DIR}/:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  const backend = localBackend(dir, { orgUrl, repositories });
  const { products, skipped } = await readRepoProducts(backend, { sectionIds });
  const invalid = skipped.flatMap((s) => s.problems);
  if (invalid.length) {
    throw new Error(
      `catalog: ${invalid.length} problem(s) in the product sheets read from ${backend.describe} (the site's own repository: an invalid sheet here fails the build):\n` +
        invalid.map((p) => `  - ${p}`).join('\n'),
    );
  }
  return products;
}
