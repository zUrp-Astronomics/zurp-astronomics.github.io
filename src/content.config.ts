// SOURCE: zurp-astronomics-site — content collections: `repoProducts`, the products read from their GitHub repositories (9_Assets/zurp.yml + releases)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the section ids come from content/catalog.yml
//
// The loader (src/lib/catalog/loader.mjs) reads the source named by ZURP_CATALOG (simulator |
// github, no default) and validates every sheet with messages naming the repository and the field
// (src/lib/catalog/read.mjs). This schema only shapes what it stores, and turns the poster into an
// image import with image(). The site never reads this collection directly: it reads the full
// catalog (src/data/catalog.ts), this collection plus the products still in content/products/.
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { repoProductsLoader } from './lib/catalog/loader.mjs';
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
    }),
});

export const collections = { repoProducts };
