// SOURCE: zurp-astronomics-site — /<slug>/firmware/<hash>/<file>: the files of a product's firmware, at a path that changes with their content
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #96
//
// Each file a product's firmware names (src/lib/catalog/firmware.mjs), under the first 16 hex digits
// of the SHA-256 of its bytes (src/lib/firmware.mjs says why: Pages caches 10 minutes, a TOML must
// never be paired with a stale binary). The bytes are those the build downloaded from the release,
// kept in .zurp-catalog/firmware/<sha256> (src/lib/catalog/loader.mjs); the TOML of each chip
// (./[chip].toml.ts) cites them by absolute URL. Not a stable URL: nothing but the TOML links them.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { getCatalog } from '../../../../data/catalog';
import { firmwareFile } from '../../../../lib/catalog/loader.mjs';
import { firmwarePartPath } from '../../../../lib/firmware.mjs';

export async function getStaticPaths() {
  const paths = new Map();
  for (const p of await getCatalog()) {
    for (const part of (p.firmware?.chips ?? []).flatMap((c) => c.parts)) {
      const path = firmwarePartPath(p.slug, part);
      const [, , hash, file] = path.split('/');
      paths.set(path, { params: { slug: p.slug, hash, file }, props: { sha256: part.sha256 } });
    }
  }
  return [...paths.values()];
}

export const GET: APIRoute<{ sha256: string }> = ({ props }) =>
  new Response(readFileSync(firmwareFile(process.cwd(), props.sha256)), {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
