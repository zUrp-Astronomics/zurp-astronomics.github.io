// SOURCE: zurp-astronomics-site — the status badge of a product README: the shields.io « endpoint » JSON published by the site at each build, its stable URL
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #53
//
// WHY. The README header of a product repository (content/readme-kit/product-header.md) is pasted
// ONCE and never again: it holds only URLs whose content is served, and kept up to date, elsewhere.
// Its status badge is rendered by shields.io (https://img.shields.io/endpoint?url=…) from a JSON
// file the site publishes at each build, one per product:
//
//   https://zurp-astronomics.github.io/brand/status/<slug>.json
//
// ⚠ A README links this URL FOREVER: never move or rename it (same rule as the other stable URLs of
// src/lib/brand-images.ts).
//
// THE JSON (shields' endpoint schema): `schemaVersion: 1`, `label` and `message` (both required),
// `color` (optional). Label, message and colour are texts of content/catalog.yml (`statuses`,
// `statusBadge`): the status label, plus the tag of the latest release when the product has one —
// the form of the message is the `statusBadge.message` template, not this code.
//
// Plain JavaScript, so that the site (src/pages/brand/status/[slug].json.ts), the README kit
// (scripts/readme-kit.mjs), the post-build guard (scripts/check-dist.mjs) and the tests share it.

import { fill } from './content.mjs';

/** Published path, relative to the site root. */
export const statusBadgePath = (slug) => `brand/status/${slug}.json`;

/** The shields.io badge that renders the JSON at `jsonUrl` (an absolute URL). */
export const shieldsEndpoint = (jsonUrl) => `https://img.shields.io/endpoint?url=${encodeURIComponent(jsonUrl)}`;

/**
 * The endpoint JSON of `product` (its `status`, its `release` or null), from the texts of
 * content/catalog.yml (`catalogContent()`: `statuses`, `statusBadge`).
 */
export function statusBadge(product, { statuses, statusBadge: texts }) {
  const status = statuses[product.status];
  if (!status) throw new Error(`status badge: no status ${JSON.stringify(product.status)} in content/catalog.yml`);
  const message = fill(texts.message, { status: status.label, release: product.release?.tag ?? null }).trim();
  return { schemaVersion: 1, label: texts.label, message, color: status.badgeColor };
}

/** The file served at `statusBadgePath(slug)`: the JSON, serialised. */
export const statusBadgeJson = (product, content) => `${JSON.stringify(statusBadge(product, content), null, 2)}\n`;
