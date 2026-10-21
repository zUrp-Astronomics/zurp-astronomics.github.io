// SOURCE: zurp-astronomics-site — the schema of a product's `manual` in the content collection: a tab's id is one of the vocabulary of content/site.yml, its language one of MANUAL_LANGS — a closed enum
// AUTHOR: engineer
// DATE: 2026-10-21
// STATUS: active — ticket #119
//
// Used by src/content.config.ts (`manual` of `repoProducts`) and tested by test/manual.test.mjs: a
// module of its own because the config imports `astro:content`, which `node --test` cannot load.
// `z` is given (astro/zod in the config, the same in the test): this module imports no zod of its own.
//
// THE ENUM STAYS CLOSED (ticket #119). A tab's `id` is exactly one of the ids of the vocabulary
// (content/site.yml `product.manual.tabs`, src/lib/content.mjs manualTabIds), never any string: a tab
// added there is accepted here with no code change, and an id outside it is refused.

import { manualTabIds } from '../content.mjs';
import { MANUAL_LANGS } from './manual.mjs';

/**
 * The schema of `manual`: null, or its tabs and images (src/lib/catalog/manual.mjs readManual).
 * @param {typeof import('astro/zod').z} z
 * @param {readonly string[]} [tabIds] the ids of the vocabulary (default: content/site.yml's)
 */
export function manualSchema(z, tabIds = manualTabIds()) {
  return z
    .object({
      tabs: z.array(
        z.object({
          id: z.enum(/** @type {[string, ...string[]]} */ ([...tabIds])),
          lang: z.enum(/** @type {[string, ...string[]]} */ ([...MANUAL_LANGS])),
          file: z.string(),
          html: z.string(),
        }),
      ),
      images: z.array(
        z.object({ name: z.string(), source: z.string(), size: z.number(), sha256: z.string(), width: z.number(), height: z.number() }),
      ),
    })
    .nullable();
}
