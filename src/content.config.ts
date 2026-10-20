// SOURCE: zurp-astronomics-site — content collections: `repoProducts`, the products read from their GitHub repositories (9_Assets/zurp.yml + releases)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the section ids come from content/catalog.yml
// REVISED: 2026-10-06 (ticket #66) — `license`, the repository's licence as GitHub detects it. zod
//   drops in silence every key this schema does not declare: a field of the snapshot missing here
//   never reaches the page
// REVISED: 2026-10-06 (ticket #75) — `hardwareLicense`, the first line of the repository's LICENSE-HARDWARE
// REVISED: 2026-10-12 (ticket #96) — `firmware`, the firmware a release publishes (zurp-firmware.json):
//   declared here, or zod drops it and the product page never shows its « Flash » block
// REVISED: 2026-10-12 (ticket #101) — `install` replaces `firmware`: the ESP Web Tools manifest and
//   the .hex / .img.xz links of a release; declared here, or the page never shows its #install block
// REVISED: 2026-10-16 (ticket #107) — `install.bench`, the web bench of that release; declared here,
//   or zod drops it and the page never shows its bench
// REVISED: 2026-10-20 (ticket #111) — `manual`, the manual of the product's repository (its tabs,
//   rendered, and the images they show); declared here, or zod drops it and the page has no tabs
//
// The loader (src/lib/catalog/loader.mjs) reads the source named by ZURP_CATALOG (simulator |
// github, no default) and validates every sheet with messages naming the repository and the field
// (src/lib/catalog/read.mjs). This schema only shapes what it stores, and turns the poster into an
// image import with image(). The site never reads this collection directly: it reads the full
// catalog (src/data/catalog.ts), this collection in display order (ticket #92: the only one).
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { repoProductsLoader } from './lib/catalog/loader.mjs';
import { MANUAL_LANGS, MANUAL_TABS } from './lib/catalog/manual.mjs';
import { catalogContent } from './lib/content.mjs';

const sectionIds = catalogContent().sections.map((s) => s.id);

const repoProducts = defineCollection({
  loader: repoProductsLoader({ sectionIds }),
  schema: ({ image }) =>
    z.object({
      slug: z.string(),
      origin: z.string(),
      name: z.string(),
      tagline: z.string(),
      slogan: z.string(),
      category: z.string(),
      section: z.enum(sectionIds as [string, ...string[]]),
      repo: z.string(),
      status: z.enum(['wip', 'future', 'released']),
      description: z.array(z.string()),
      basedOn: z.string().optional(),
      poster: image(),
      posterAlt: z.string(),
      accent: z.string(),
      release: z.object({ tag: z.string(), publishedAt: z.string() }).nullable(),
      license: z.object({ spdx_id: z.string().nullable(), name: z.string().nullable() }).nullable(),
      hardwareLicense: z.object({ title: z.string() }).nullable(),
      install: z
        .object({
          tag: z.string(),
          publishedAt: z.string(),
          esp: z
            .object({
              id: z.string(),
              name: z.string(),
              version: z.string(),
              builds: z.array(z.object({ chipFamily: z.string(), serialType: z.string().nullable() })),
              manifest: z.object({ name: z.string(), size: z.number(), sha256: z.string() }),
              files: z.array(z.object({ name: z.string(), size: z.number(), sha256: z.string() })),
            })
            .nullable(),
          downloads: z.array(z.object({ kind: z.enum(['hex', 'img']), name: z.string(), size: z.number(), url: z.string() })),
          bench: z.object({ id: z.string(), name: z.string(), size: z.number(), sha256: z.string() }).nullable(),
        })
        .nullable(),
      manual: z
        .object({
          tabs: z.array(
            z.object({
              id: z.enum(MANUAL_TABS as unknown as [string, ...string[]]),
              lang: z.enum(MANUAL_LANGS as unknown as [string, ...string[]]),
              file: z.string(),
              html: z.string(),
            }),
          ),
          images: z.array(
            z.object({ name: z.string(), source: z.string(), size: z.number(), sha256: z.string(), width: z.number(), height: z.number() }),
          ),
        })
        .nullable(),
    }),
});

export const collections = { repoProducts };
