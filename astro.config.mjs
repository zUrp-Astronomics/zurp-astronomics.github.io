import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';

const commitHash = (
  process.env.GITHUB_SHA ||
  execSync('git rev-parse HEAD').toString().trim()
).slice(0, 7);
const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';

export default defineConfig({
  site: 'https://zurp-astronomics.github.io',
  vite: {
    define: {
      'import.meta.env.PUBLIC_COMMIT_HASH': JSON.stringify(commitHash),
      'import.meta.env.PUBLIC_BUILD_DATE': JSON.stringify(buildDate),
    },
  },
});
