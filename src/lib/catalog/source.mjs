// SOURCE: zurp-astronomics-site — where the catalog is read: the explicit source (simulator | github) and the two backends behind the same interface
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #66) — listRepos() also gives each repository's licence, as GitHub detects it
//
// THE SOURCE IS ALWAYS NAMED. The environment variable ZURP_CATALOG says where the build reads the
// product repositories: `github` (the organisation on GitHub, what is deployed) or `simulator`
// (imitation repositories in catalog-simulator/, offline). There is NO default, and a build without
// it fails: a `simulator` default would deploy the simulator at the first omission in the deploy
// workflow, a `github` default would make the Gitea CI (no GitHub token) call the GitHub API.
// The same variable everywhere: .github/workflows/deploy.yml (github), CLAUDE.md `## Test`,
// .gitea/workflows/ci.yml and the trials (simulator).
//
// THE SIMULATOR IS NEVER DEPLOYED. The site is only deployed by .github/workflows/deploy.yml, on
// GitHub Actions, where GITHUB_SERVER_URL is https://github.com: there, `simulator` is refused,
// whatever the workflow says.
//
// ONE INTERFACE, TWO BACKENDS. The reader (read.mjs) sees only:
//   listRepos()               → [{ name, url, license }]  public repositories of the organisation;
//                               `license` is the licence GitHub detects in the repository's LICENSE
//                               (repoLicense below), null when there is none
//   readFile(repo, path)      → Buffer | null    a file of the default branch, null when absent
//   listReleases(repo)        → [{ tag_name, published_at, draft, prerelease }]  (GitHub's objects)
// so the simulator exercises exactly the code that reads GitHub.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export const ORG = 'zUrp-Astronomics';
export const SOURCE_VAR = 'ZURP_CATALOG';
export const TOKEN_VAR = 'ZURP_GITHUB_TOKEN';
export const SOURCES = ['simulator', 'github'];

/**
 * The catalog source named by the environment. Throws when it is missing or unknown, and when the
 * simulator is asked for on GitHub Actions (the only place the site is deployed from).
 * @param {Record<string, string | undefined>} env
 * @returns {'simulator' | 'github'}
 */
export function catalogSource(env = process.env) {
  const value = (env[SOURCE_VAR] ?? '').trim();
  if (!value) {
    throw new Error(
      `catalog: no source named. Set ${SOURCE_VAR} to choose where the product repositories are read:\n` +
        `  ${SOURCE_VAR}=simulator   the imitation repositories of catalog-simulator/ (offline: tests, CI)\n` +
        `  ${SOURCE_VAR}=github      the ${ORG} organisation on GitHub (what is deployed; token in ${TOKEN_VAR})\n` +
        `e.g. \`${SOURCE_VAR}=simulator npm run build\`. There is no default, on purpose.`,
    );
  }
  if (!SOURCES.includes(value)) {
    throw new Error(`catalog: unknown source ${SOURCE_VAR}=${JSON.stringify(value)} — expected one of: ${SOURCES.join(', ')}`);
  }
  if (value === 'simulator' && (env.GITHUB_SERVER_URL ?? '').replace(/\/+$/, '') === 'https://github.com') {
    throw new Error(
      `catalog: ${SOURCE_VAR}=simulator refused on GitHub Actions — the site is deployed from there, and the simulator must never be. Use ${SOURCE_VAR}=github.`,
    );
  }
  return /** @type {'simulator' | 'github'} */ (value);
}

/**
 * The licence of a repository as GitHub's API lists it (`license` of a repository object:
 * `{ key, name, spdx_id, url, node_id }`, or null when GitHub detects no LICENSE), kept as
 * `{ spdx_id, name }`. GitHub says `spdx_id: "NOASSERTION"` (name « Other ») for a LICENSE it does
 * not recognise. Nothing here is a judgement on the licence: the site shows what GitHub detects
 * (the human's rule, ticket #66), and no licence is never an error.
 * @param {unknown} raw
 * @param {string} where for the message when `raw` is not a licence object
 * @returns {{ spdx_id: string | null, name: string | null } | null}
 */
export function repoLicense(raw, where = 'repository') {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`catalog: ${where}: \`license\` is not a licence object (${JSON.stringify(raw)})`);
  const text = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  return { spdx_id: text(raw.spdx_id), name: text(raw.name) };
}

// --- Simulator ----------------------------------------------------------------------------------

/**
 * Imitation repositories on disk:
 *   <dir>/repos/<name>/…           the tree of repository <name> (default branch)
 *   <dir>/releases/<name>.json     its releases, as GitHub's API lists them (absent: none)
 *   <dir>/licenses/<name>.json     its `license`, as GitHub's API lists it in the repositories of the
 *                                  organisation (absent, or `null`: no LICENSE detected)
 * @param {string} dir
 */
export function simulatorBackend(dir, { org = ORG } = {}) {
  const root = resolve(dir);
  const reposDir = join(root, 'repos');
  if (!existsSync(reposDir) || !statSync(reposDir).isDirectory()) {
    throw new Error(`catalog (simulator): no repository directory at ${reposDir}`);
  }
  const repoDir = (repo) => {
    const p = resolve(reposDir, repo);
    if (!p.startsWith(reposDir + sep)) throw new Error(`catalog (simulator): bad repository name ${JSON.stringify(repo)}`);
    return p;
  };
  return {
    describe: `simulator (${root})`,
    async listRepos() {
      return readdirSync(reposDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .map((name) => {
          const p = join(root, 'licenses', `${name}.json`);
          const license = existsSync(p) ? repoLicense(JSON.parse(readFileSync(p, 'utf8')), `simulator ${p}`) : null;
          return { name, url: `https://github.com/${org}/${name}`, license };
        });
    },
    async readFile(repo, path) {
      const base = repoDir(repo);
      const p = resolve(base, path);
      if (!p.startsWith(base + sep)) throw new Error(`catalog (simulator): path outside the repository: ${repo}/${path}`);
      return existsSync(p) && statSync(p).isFile() ? readFileSync(p) : null;
    },
    async listReleases(repo) {
      repoDir(repo);
      const p = join(root, 'releases', `${repo}.json`);
      if (!existsSync(p)) return [];
      const list = JSON.parse(readFileSync(p, 'utf8'));
      if (!Array.isArray(list)) throw new Error(`catalog (simulator): ${p} is not a JSON array`);
      return list;
    },
  };
}

// --- GitHub (REST) ------------------------------------------------------------------------------

/** URL of the `rel="next"` page in a Link header, or null. */
function nextLink(link) {
  if (!link) return null;
  for (const part of link.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/);
    if (m) return m[1];
  }
  return null;
}

/**
 * The organisation's public repositories through the REST API (api.github.com only: files are read
 * through the contents endpoint, with the token, never from raw.githubusercontent.com, which is
 * rate-limited per IP). Any failure throws: no retry, no fallback (the build fails, Pages keeps the
 * previous deployment).
 * @param {{ token?: string, org?: string, fetchImpl?: typeof fetch, api?: string }} options
 */
export function githubBackend({ token, org = ORG, fetchImpl = globalThis.fetch, api = 'https://api.github.com' } = {}) {
  let requests = 0;
  async function get(url, { accept = 'application/vnd.github+json', allow404 = false } = {}) {
    const headers = {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zurp-astronomics-site',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    requests++;
    let res;
    try {
      res = await fetchImpl(url, { headers });
    } catch (e) {
      throw new Error(`catalog (github): GET ${url} failed: ${e?.message ?? e}`);
    }
    if (res.status === 404 && allow404) return null;
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300);
      const remaining = res.headers.get('x-ratelimit-remaining');
      const limit = remaining === '0' ? ' (rate limit exhausted)' : '';
      throw new Error(`catalog (github): GET ${url} → HTTP ${res.status}${limit} ${body}`.trim());
    }
    return res;
  }
  async function getAll(url) {
    const all = [];
    for (let next = url; next; ) {
      const res = await get(next);
      const page = await res.json();
      if (!Array.isArray(page)) throw new Error(`catalog (github): GET ${next} did not return a list`);
      all.push(...page);
      next = nextLink(res.headers.get('link'));
    }
    return all;
  }
  const repoPath = (repo) => `${api}/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}`;
  return {
    describe: `GitHub (${org}, ${token ? 'authenticated' : 'unauthenticated'})`,
    get requests() {
      return requests;
    },
    async listRepos() {
      const repos = await getAll(`${api}/orgs/${encodeURIComponent(org)}/repos?type=public&per_page=100`);
      return repos
        .map((r) => ({ name: r.name, url: r.html_url, license: repoLicense(r.license, `repository ${r.name}`) }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    },
    async readFile(repo, path) {
      const encoded = path.split('/').map(encodeURIComponent).join('/');
      const res = await get(`${repoPath(repo)}/contents/${encoded}`, { accept: 'application/vnd.github.raw+json', allow404: true });
      return res ? Buffer.from(await res.arrayBuffer()) : null;
    },
    async listReleases(repo) {
      return getAll(`${repoPath(repo)}/releases?per_page=100`);
    },
  };
}
