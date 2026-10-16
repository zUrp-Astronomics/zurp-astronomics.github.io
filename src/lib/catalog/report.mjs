// SOURCE: zurp-astronomics-site — the catalog report of a build: every product published (origin, « Source » link, what it installs, its bench), every product skipped, release ignored, ESP manifest rejected and bench not published, with the reason — in the build log and, on GitHub Actions, in the job summary
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #72
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ is gone: no folder ignored to
//   report any more
// REVISED: 2026-10-12 (ticket #101) — per product, what it publishes to install (version, ESP chip
//   families, files to download), « nothing to install », or that its ESP manifest was rejected
// REVISED: 2026-10-16 (ticket #107) — the web bench: per product, its bench or that it is not
//   published; the benches not published (`benchProblems`) in their own warnings, count and section,
//   apart from the ESP manifests rejected (whose labels are unchanged)
//
// WHY (ticket #72). The site publishes what it discovers: a repository whose sheet or poster is
// invalid is skipped, not fatal. Nothing fails any more, so it must be SEEN: each build writes, at
// its end, the catalog it found and what it left out, with the reason. On GitHub Actions (`GITHUB_STEP_SUMMARY` set by the
// runner for each step) the same report goes to the job summary of the build job of
// .github/workflows/deploy.yml, and every skipped product or ignored release is also
// a `::warning::` annotation of the run.
//
// Called at the end of `astro build` (astro.config.mjs, hook `astro:build:done`) on the catalog the
// scripts after the build see (scripts/lib/catalog.mjs: the snapshot, assembled by
// src/lib/catalog/assemble.mjs) — the catalog that was built, read once more from what
// the build left, never from the source again.
//
// These are build messages, for the maintainer: not a text of the site (content/ holds those).

import { appendFileSync } from 'node:fs';

/**
 * What the report says a product publishes to install.
 * @param {{ origin: string, install?: { tag: string, esp: null | { builds: Array<{ chipFamily: string }> }, downloads: Array<{ name: string }>, bench?: null | { name: string } } | null }} product
 * @param {Array<{ origin: string }>} rejected
 * @param {Array<{ origin: string }>} benchProblems
 */
function installState(product, rejected, benchProblems) {
  const parts = [];
  const install = product.install;
  if (install?.esp) parts.push(`ESP ${[...new Set(install.esp.builds.map((b) => b.chipFamily))].join(', ')}`);
  if (install?.downloads.length) parts.push(`download ${install.downloads.map((d) => d.name).join(', ')}`);
  if (install?.bench) parts.push(`bench ${install.bench.name}`);
  const refused = rejected.some((r) => r.origin === product.origin) ? 'ESP manifest REJECTED, not published' : null;
  const noBench = benchProblems.some((r) => r.origin === product.origin) ? 'bench NOT published' : null;
  const notes = [refused, noBench].filter(Boolean);
  if (!install) return notes.length ? notes.join('; ') : 'nothing to install';
  return `install ${install.tag}: ${[...parts, ...notes].join('; ')}`;
}

/**
 * The report of a built catalog.
 * @param {{ read: string, products: Array<{ slug: string, name: string, origin: string, repo: string, install?: any }>, skipped: Array<{ problems: string[] }>, ignoredReleases: Array<{ message: string }>, installRejected?: Array<{ origin: string, problems: string[] }>, benchProblems?: Array<{ origin: string, problems: string[] }> }} catalog
 * @returns {{ lines: string[], warnings: string[], markdown: string }}
 */
export function catalogReport({ read, products, skipped, ignoredReleases, installRejected = [], benchProblems = [] }) {
  const warnings = [
    ...skipped.map((s) => `product skipped — ${s.problems.join('; ')}`),
    ...ignoredReleases.map((r) => r.message),
    ...installRejected.map((r) => `ESP manifest rejected — ${r.problems.join('; ')}`),
    ...benchProblems.map((r) => `bench not published — ${r.problems.join('; ')}`),
  ];
  const withInstall = products.filter((p) => p.install).length;
  const withBench = products.filter((p) => p.install?.bench).length;
  // The bench counts before the install counts: the ESP labels end the line, as they did (test 3b).
  const counts =
    `${products.length} product(s) published, ${skipped.length} skipped, ${ignoredReleases.length} release(s) ignored, ` +
    `${withBench} bench(es) published, ${benchProblems.length} bench(es) not published, ` +
    `${withInstall} with something to install, ${installRejected.length} ESP manifest(s) rejected`;
  const install = (p) => installState(p, installRejected, benchProblems);
  const width = (key) => Math.max(0, ...products.map((p) => p[key].length));
  const lines = [
    `catalog of this build — source: ${read} — ${counts}`,
    ...products.map((p) => `  ${p.slug.padEnd(width('slug'))}  ${p.origin.padEnd(width('origin'))}  ${p.repo}  ${install(p)}`),
    ...warnings.map((w) => `  ${w}`),
  ];

  const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const md = [
    '## Catalog of this build',
    '',
    `Source: ${cell(read)} — ${counts}.`,
    '',
    '| Product | Slug | Origin | Source link | Install |',
    '| --- | --- | --- | --- | --- |',
    ...products.map((p) => `| ${cell(p.name)} | \`${cell(p.slug)}\` | ${cell(p.origin)} | ${cell(p.repo)} | ${cell(install(p))} |`),
    '',
  ];
  const section = (title, items) => (items.length ? [`### ${title}`, '', ...items.map((i) => `- ${cell(i)}`), ''] : []);
  md.push(
    ...section('Products skipped (not published)', skipped.flatMap((s) => s.problems)),
    ...section('Releases ignored', ignoredReleases.map((r) => r.message)),
    ...section('ESP manifests rejected (ESP install not published)', installRejected.flatMap((r) => r.problems)),
    ...section('Benches not published', benchProblems.flatMap((r) => r.problems)),
  );
  return { lines, warnings, markdown: md.join('\n') + '\n' };
}

/**
 * Writes a report: its lines to the log; on GitHub Actions, each warning as a `::warning::`
 * annotation; when `GITHUB_STEP_SUMMARY` names a file, the Markdown appended to it.
 * @param {{ lines: string[], warnings: string[], markdown: string }} report
 * @param {{ env?: Record<string, string | undefined>, log?: (line: string) => void }} [options]
 */
export function publishCatalogReport(report, { env = process.env, log = console.log } = {}) {
  for (const line of report.lines) log(line);
  if (env.GITHUB_ACTIONS === 'true') {
    for (const w of report.warnings) log(`::warning title=catalog::${w.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
  }
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, report.markdown);
}
