// SOURCE: zurp-astronomics-site — the catalog report of a build: every product published (origin, « Source » link), every product skipped and release ignored, with the reason — in the build log and, on GitHub Actions, in the job summary
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #72
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ is gone: no folder ignored to
//   report any more
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
 * The report of a built catalog.
 * @param {{ read: string, products: Array<{ slug: string, name: string, origin: string, repo: string }>, skipped: Array<{ problems: string[] }>, ignoredReleases: Array<{ message: string }> }} catalog
 * @returns {{ lines: string[], warnings: string[], markdown: string }}
 */
export function catalogReport({ read, products, skipped, ignoredReleases }) {
  const warnings = [
    ...skipped.map((s) => `product skipped — ${s.problems.join('; ')}`),
    ...ignoredReleases.map((r) => r.message),
  ];
  const counts = `${products.length} product(s) published, ${skipped.length} skipped, ${ignoredReleases.length} release(s) ignored`;
  const width = (key) => Math.max(0, ...products.map((p) => p[key].length));
  const lines = [
    `catalog of this build — source: ${read} — ${counts}`,
    ...products.map((p) => `  ${p.slug.padEnd(width('slug'))}  ${p.origin.padEnd(width('origin'))}  ${p.repo}`),
    ...warnings.map((w) => `  ${w}`),
  ];

  const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const md = [
    '## Catalog of this build',
    '',
    `Source: ${cell(read)} — ${counts}.`,
    '',
    '| Product | Slug | Origin | Source link |',
    '| --- | --- | --- | --- |',
    ...products.map((p) => `| ${cell(p.name)} | \`${cell(p.slug)}\` | ${cell(p.origin)} | ${cell(p.repo)} |`),
    '',
  ];
  const section = (title, items) => (items.length ? [`### ${title}`, '', ...items.map((i) => `- ${cell(i)}`), ''] : []);
  md.push(
    ...section('Products skipped (not published)', skipped.flatMap((s) => s.problems)),
    ...section('Releases ignored', ignoredReleases.map((r) => r.message)),
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
