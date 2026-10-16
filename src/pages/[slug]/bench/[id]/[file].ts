// SOURCE: zurp-astronomics-site — /<slug>/bench/<id>/<file>: a product's web bench, copied as is from the release it installs from, in a folder that changes with its content
// AUTHOR: engineer
// DATE: 2026-10-16
// STATUS: active — ticket #107
//
// The `*_bench.html` of the release a product installs from (src/lib/catalog/install.mjs): a
// self-contained page that drives the board over Web Serial. Served from the site's own origin,
// byte for byte as the release carries it, in text/html: Web Serial is refused in an iframe of
// another origin, and the files of a GitHub release are of another origin. The folder's <id>
// changes as soon as its bytes do (src/lib/install.mjs: Pages caches 10 minutes). The bytes are
// those the build downloaded, kept in .zurp-catalog/firmware/<sha256> (src/lib/catalog/loader.mjs).
// Linked by the product page's #install block only: its bench dialog and its « new tab » link.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { getCatalog } from '../../../../data/catalog';
import { firmwareFile } from '../../../../lib/catalog/loader.mjs';

export async function getStaticPaths() {
  return (await getCatalog()).flatMap((p) => {
    const bench = p.install?.bench;
    if (!bench) return [];
    return [{ params: { slug: p.slug, id: bench.id, file: bench.name }, props: { sha256: bench.sha256 } }];
  });
}

export const GET: APIRoute<{ sha256: string }> = ({ props }) =>
  new Response(readFileSync(firmwareFile(process.cwd(), props.sha256)), { headers: { 'Content-Type': 'text/html' } });
