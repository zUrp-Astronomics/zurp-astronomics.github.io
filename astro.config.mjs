import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';

const commitHash = (
  process.env.GITHUB_SHA ||
  execSync('git rev-parse HEAD').toString().trim()
).slice(0, 7);
const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';

// The catalog report (ticket #72, src/lib/catalog/report.mjs): at the end of every build, the catalog
// that was built — each product with its origin and « Source » link, each product skipped and release
// ignored with its reason — in the build log and, on GitHub Actions, in the job summary.
const catalogReport = {
  name: 'zurp-catalog-report',
  hooks: {
    'astro:build:done': async () => {
      const { loadBuiltCatalog } = await import('./scripts/lib/catalog.mjs');
      const { catalogReport: report, publishCatalogReport } = await import('./src/lib/catalog/report.mjs');
      publishCatalogReport(report(await loadBuiltCatalog()));
    },
  },
};

export default defineConfig({
  site: 'https://zurp-astronomics.github.io',
  integrations: [catalogReport],
  // Astro 7 defaults to 'jsx': JSX whitespace rules, which drop the whitespace around elements at a
  // line break — in running text too: a sentence whose link starts a new line read "…firmware
  // underGPL-3.0" (measured in ticket #43 on the licence sentence of the product pages, removed in
  // ticket #66). `true` is the lossless compression Astro 4 applied by default: the pages render as
  // they did, templates untouched.
  compressHTML: true,
  vite: {
    define: {
      'import.meta.env.PUBLIC_COMMIT_HASH': JSON.stringify(commitHash),
      'import.meta.env.PUBLIC_BUILD_DATE': JSON.stringify(buildDate),
    },
  },
});
