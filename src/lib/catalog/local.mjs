// SOURCE: zurp-astronomics-site — the products not migrated to their repository yet: content/products/<slug>/ (zurp.yml + poster), read and validated by the code that reads the repositories
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — shrinking: a product leaves content/products/ when its folder moves to its repository's 9_Assets/
//
// THE RULE (ticket #49). A product not migrated yet lives in content/products/<slug>/: its sheet
// `zurp.yml`, in the EXACT format of a repository's 9_Assets/zurp.yml, and its poster next to it.
// Migrating it to its repository is MOVING THAT FOLDER into the repository's 9_Assets/, nothing
// rewritten. So the folder is read as a repository whose 9_Assets/ it is, by the same reader
// (read.mjs: readRepoProducts, sheetProblems), through a third backend beside the simulator and
// GitHub:
//   slug      the folder name (lower case: it IS the slug, as the repository name is for GitHub);
//   repo      what the repository's URL will be, https://github.com/zUrp-Astronomics/<slug> —
//             or the organisation itself (content/site.yml, org.url) for a slug listed in
//             `withoutRepository` of content/catalog.yml (Cyclops, Wraith: no repository yet; a
//             sheet may not carry `repo`, it is deduced, read.mjs DEDUCED.repo);
//   releases  none (a product with releases has a repository, so its sheet is there).
// A slug both here and in a repository fails the build (src/lib/catalog/assemble.mjs).
//
// Read by the site (src/data/catalog.ts, which imports the posters) and by the scripts that run
// after the build (scripts/lib/catalog.mjs), with the same function: readLocalProducts().

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { ASSETS_DIR, readRepoProducts } from './read.mjs';
import { ORG } from './source.mjs';
import { CONTENT_DIR, catalogContent, contentDir, siteContent } from '../content.mjs';

/** Where the local products live, relative to the repository root. */
export const LOCAL_PRODUCTS_DIR = `${CONTENT_DIR}/products`;

/**
 * content/products/ seen as repositories: each folder is a repository's 9_Assets/.
 * @param {string} dir content/products/
 * @param {{ orgUrl: string, withoutRepository?: readonly string[] }} options
 */
export function localBackend(dir, { orgUrl, withoutRepository = [] }) {
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
        .map((name) => ({ name, url: withoutRepository.includes(name) ? org : `${org}/${name}` }));
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
 * `posterBytes`. Throws on any problem, every problem at once.
 * @param {{ root?: string, sectionIds: readonly string[] }} options
 */
export async function readLocalProducts({ root = process.cwd(), sectionIds }) {
  const dir = join(contentDir(root), 'products');
  const { withoutRepository } = catalogContent(root);
  const orgUrl = siteContent(root)?.org?.url;
  if (typeof orgUrl !== 'string' || !orgUrl.startsWith(`https://github.com/${ORG}`)) {
    throw new Error(`content: ${CONTENT_DIR}/site.yml: org.url must be the organisation's URL (https://github.com/${ORG})`);
  }
  const problems = [];
  const folders = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  for (const name of folders) {
    if (name !== name.toLowerCase()) problems.push(`${LOCAL_PRODUCTS_DIR}/${name}/: the folder name is the slug, in lower case`);
  }
  for (const slug of withoutRepository) {
    if (!folders.includes(slug)) {
      problems.push(`${CONTENT_DIR}/catalog.yml: withoutRepository names ${JSON.stringify(slug)}, which is not a folder of ${LOCAL_PRODUCTS_DIR}/ (remove it once its repository exists)`);
    }
  }
  if (problems.length) throw new Error(`catalog: ${problems.length} problem(s) in ${LOCAL_PRODUCTS_DIR}/:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  return readRepoProducts(localBackend(dir, { orgUrl, withoutRepository }), { sectionIds });
}
