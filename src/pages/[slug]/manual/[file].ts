// SOURCE: zurp-astronomics-site — /<slug>/manual/<id>.webp: an image of a product's manual, as the build re-encoded it, under a name that changes with its content
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #111
//
// An image a manual of the product's repository shows (9_Assets/…, src/lib/catalog/manual.mjs):
// decoded and re-encoded as WebP at read time, under the 600 KB ceiling of scripts/check-dist.mjs
// (an original is never served as is). The bytes are those the build kept in
// .zurp-catalog/manual/<sha256> (src/lib/catalog/loader.mjs); the name, the start of their SHA-256
// (src/lib/manual.mjs: Pages caches 10 minutes). Shown by the product page's manual tabs only.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { getCatalog } from '../../../data/catalog';
import { manualFile } from '../../../lib/catalog/loader.mjs';

export async function getStaticPaths() {
  return (await getCatalog()).flatMap((p) =>
    (p.manual?.images ?? []).map((image) => ({ params: { slug: p.slug, file: image.name }, props: { sha256: image.sha256 } })),
  );
}

export const GET: APIRoute<{ sha256: string }> = ({ props }) =>
  new Response(readFileSync(manualFile(process.cwd(), props.sha256)), { headers: { 'Content-Type': 'image/webp' } });
