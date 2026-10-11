// SOURCE: zurp-astronomics-site — stable URLs /<slug>/firmware/<chip>.toml: the ESP Launchpad TOML of each chip of a product's firmware
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #96
//
// Published at https://zurp-astronomics.github.io/<slug>/firmware/<chip>.toml — one per chip of the
// firmware a product's release publishes (src/lib/catalog/firmware.mjs), rewritten at each build.
// THE URL OF THE CONTRACT with the products: their READMEs link it forever through Launchpad
// (`?flashConfigURL=`) — never move or rename it. Its content (TOML, absolute URLs of the parts):
// src/lib/firmware.mjs; the name Launchpad shows: content/site.yml (`product.flash.appName`).
import type { APIRoute } from 'astro';
import { getCatalog, type CatalogProduct, type Firmware } from '../../../data/catalog';
import { fill, siteContent } from '../../../lib/content.mjs';
import { chipLabel, firmwareToml } from '../../../lib/firmware.mjs';

export async function getStaticPaths() {
  return (await getCatalog()).flatMap((p) =>
    (p.firmware?.chips ?? []).map((chip) => ({ params: { slug: p.slug, chip: chip.chip }, props: { product: p, chip } })),
  );
}

export const GET: APIRoute<{ product: CatalogProduct; chip: Firmware['chips'][number] }> = ({ props, site }) => {
  const { product, chip } = props;
  if (!site || !product.firmware) throw new Error('firmware TOML: no `site` in astro.config.mjs, or no firmware');
  const appName = fill(siteContent().product.flash.appName, { product: product.name, tag: product.firmware.tag, chip: chipLabel(chip.chip) });
  return new Response(firmwareToml({ site: site.href, slug: product.slug, appName, chip }), {
    headers: { 'Content-Type': 'application/toml; charset=utf-8' },
  });
};
