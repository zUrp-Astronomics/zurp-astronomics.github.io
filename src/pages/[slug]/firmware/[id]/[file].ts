// SOURCE: zurp-astronomics-site — /<slug>/firmware/<id>/<file>: a product's ESP Web Tools manifest, copied as is, and the files it names, in one folder that changes with their content
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #101 (replaces the ESP Launchpad TOML and binaries of ticket #96)
//
// The manifest.json of the release a product installs from, and each file it names
// (src/lib/catalog/install.mjs), in ONE folder: ESP Web Tools reads each part's `path` relative to
// the manifest's URL, so the manifest is served byte for byte as the release carries it. The folder's
// <id> changes as soon as one of these files does (src/lib/install.mjs says why: Pages caches 10
// minutes). The bytes are those the build downloaded from the release, kept in
// .zurp-catalog/firmware/<sha256> (src/lib/catalog/loader.mjs). Nothing but the product page's
// install button links them.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { getCatalog } from '../../../../data/catalog';
import { firmwareFile } from '../../../../lib/catalog/loader.mjs';

export async function getStaticPaths() {
  return (await getCatalog()).flatMap((p) => {
    const esp = p.install?.esp;
    if (!esp) return [];
    return [esp.manifest, ...esp.files].map((f) => ({
      params: { slug: p.slug, id: esp.id, file: f.name },
      props: { sha256: f.sha256, json: f === esp.manifest },
    }));
  });
}

export const GET: APIRoute<{ sha256: string; json: boolean }> = ({ props }) =>
  new Response(readFileSync(firmwareFile(process.cwd(), props.sha256)), {
    headers: { 'Content-Type': props.json ? 'application/json' : 'application/octet-stream' },
  });
