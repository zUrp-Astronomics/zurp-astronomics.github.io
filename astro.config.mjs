import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';

const commitHash = (
  process.env.GITHUB_SHA ||
  execSync('git rev-parse HEAD').toString().trim()
).slice(0, 7);
const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';

export default defineConfig({
  site: 'https://zurp-astronomics.github.io',
  // Astro 7 defaults to 'jsx': JSX whitespace rules, which drop the whitespace around elements at a
  // line break — in running text too: the licence sentence of the product pages read "…firmware
  // underGPL-3.0" (src/components/LicenseText.astro, measured in ticket #43). `true` is the lossless
  // compression Astro 4 applied by default: the pages render as they did, templates untouched.
  compressHTML: true,
  vite: {
    define: {
      'import.meta.env.PUBLIC_COMMIT_HASH': JSON.stringify(commitHash),
      'import.meta.env.PUBLIC_BUILD_DATE': JSON.stringify(buildDate),
    },
  },
});
