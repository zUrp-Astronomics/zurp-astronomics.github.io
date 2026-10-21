// SOURCE: zurp-astronomics-site — what the site publishes of a product's manual: the tabs of its page (in order, the Setup tab that carries the Install block), the paths of its images in dist/, the tab titles of content/site.yml
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #111
// REVISED: 2026-10-21 (ticket #119) — the tabs, their order and their titles come from the
//   vocabulary of content/site.yml `product.manual.tabs` (src/lib/content.mjs, manualContentOf):
//   no list of tabs in the code; the Setup tab is MANUAL_INSTALL_TAB
//
// What the site publishes of the manual read by src/lib/catalog/manual.mjs. Plain JavaScript, so that
// the page (src/pages/[slug]/…), the catalog report, the post-build guard (scripts/check-dist.mjs)
// and the tests share it.
//
// THE TABS OF A PAGE (the agency's, with the human's decision of 2026-10-20 on the Install block):
//   - a product WITHOUT a manual (no manual file read) has no tabs: its page is the page it had
//     before ticket #111, its #install block in its place;
//   - a product WITH a manual has one tab per manual file shown, in the order of the vocabulary; the
//     Install block (#install) is in the Setup tab and in no other. A product with a manual and
//     something to install but no setup.*.md still has a Setup tab, holding only the Install block;
//   - each tab's anchor is its id (`#overview`, `#setup`…); `#install` opens
//     the Setup tab. Without an anchor, the page opens on its first tab;
//   - the titles of the tabs are the site's (content/site.yml, `product.manual.tabs[].title`), never the
//     product's: the same words on every page;
//   - when the Overview tab exists, it replaces the « About » section (the sheet's `description`,
//     which stays required in the sheet).
//
// PATHS IN dist/: <slug>/manual/<id>.webp, each image of the manual as served (re-encoded, under
// the 600 KB ceiling); <id> is the start of the SHA-256 of those bytes: it changes as soon as they
// do (Pages caches 10 minutes).

import { MANUAL_INSTALL_TAB, manualContentOf, manualTabIds } from './content.mjs';

/** The published path of an image of a manual, relative to the site root. */
export const manualImagePath = (slug, image) => `${slug}/manual/${image.name}`;

/** Its URL path on the site (the `src` of its <img>). */
export const manualImageUrlPath = (slug, image) => `/${manualImagePath(slug, image)}`;

/**
 * The tabs of a product's page, in order: null without a manual. Each: its id (its anchor), the
 * language and HTML of its file (null for a Setup tab that only carries the Install block), and
 * whether the Install block is in it.
 * @param {{ manual?: null | { tabs: Array<{ id: string, lang: string, html: string }> }, install?: unknown }} product
 * @param {readonly string[]} [order] the ids of the vocabulary (default: content/site.yml's)
 * @returns {null | Array<{ id: string, lang: string | null, html: string | null, install: boolean }>}
 */
export function manualTabs(product, order) {
  const read = product.manual?.tabs ?? [];
  if (!read.length) return null;
  return (order ?? manualTabIds()).flatMap((id) => {
    const tab = read.find((t) => t.id === id);
    const install = id === MANUAL_INSTALL_TAB && Boolean(product.install);
    if (!tab && !install) return [];
    return [{ id, lang: tab?.lang ?? null, html: tab?.html ?? null, install }];
  });
}

/**
 * The texts of the tabs, from content/site.yml `product.manual`: `label` (the tab list's name for
 * screen readers, `{{product}}` the product's name) and `tabs`, each tab's title by its id. Fails
 * with the key named when the vocabulary is malformed (src/lib/content.mjs, manualContentOf).
 * @param {unknown} site content/site.yml, parsed
 * @returns {{ label: string, tabs: Record<string, string> }}
 */
export function manualTexts(site) {
  const { label, tabs } = manualContentOf(site);
  return { label, tabs: Object.fromEntries(tabs.map((t) => [t.id, t.title])) };
}
