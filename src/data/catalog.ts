// SOURCE: zurp-astronomics-site — the site's full catalog: the products read from their repositories, in display order
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the sections come from content/catalog.yml
// REVISED: 2026-10-06 (ticket #66) — every product carries `license`, the licence GitHub detects in its
//   repository, from the build's snapshot
// REVISED: 2026-10-06 (ticket #75) — and `hardwareLicense`, the first line of its repository's
//   LICENSE-HARDWARE
// REVISED: 2026-10-12 (ticket #96) — and `firmware`, the firmware a release of its repository
//   publishes (src/lib/catalog/firmware.mjs), declared in src/content.config.ts too
// REVISED: 2026-10-12 (ticket #101) — `install` replaces `firmware`: what a release of its repository
//   publishes to install (src/lib/catalog/install.mjs), declared in src/content.config.ts too
// REVISED: 2026-10-16 (ticket #107) — `install.bench`, the web bench of the release it installs from
// REVISED: 2026-10-20 (ticket #111) — `manual`, the manual of its repository (src/lib/catalog/manual.mjs)
// REVISED: 2026-10-21 (ticket #119) — a tab's `id` is a string: the tabs are the vocabulary of
//   content/site.yml, data
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ is gone: the catalog comes
//   only from the organisation's repositories (the collection `repoProducts`)
//
// THE LICENCE AND THE « SOURCE » LINK (tickets #66, #72). A product gets them through the collection
// (the loader stores them with the sheet; src/content.config.ts declares them, or zod would drop
// them): its repository's URL, and the licences its repository declares.
//
// Every page and endpoint that lists products reads `getCatalog()`: src/pages/index.astro,
// src/pages/[slug]/index.astro, src/pages/brand/posters/[slug].webp.ts,
// src/pages/brand/social/[slug].jpg.ts. The scripts that run after the build assemble the same
// catalog from the same snapshot (scripts/lib/catalog.mjs), with the same function
// (src/lib/catalog/assemble.mjs): sections in their fixed order, inside a section the latest release
// first, then by name. The catalog report (what was found, skipped, ignored) is written once, at the
// end of the build (astro.config.mjs, src/lib/catalog/report.mjs).
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { assembleCatalog } from '../lib/catalog/assemble.mjs';
import { catalogContent } from '../lib/content.mjs';

export type ProductStatus = 'wip' | 'future' | 'released';

/** The software licence: the one GitHub detects in a repository's LICENSE (its `license`, src/lib/catalog/source.mjs). */
export interface RepoLicense {
  /** SPDX id (`GPL-3.0`), or `NOASSERTION` for a LICENSE GitHub does not recognise. */
  spdx_id: string | null;
  name: string | null;
}

/** The hardware licence a repository declares in LICENSE-HARDWARE: its first non-empty line. */
export interface HardwareLicense {
  title: string;
}

/** A file the site copies from a release, as is (src/lib/catalog/install.mjs). */
export interface InstallFile {
  /** Its name, as attached to the release. */
  name: string;
  size: number;
  /** SHA-256 of its bytes. */
  sha256: string;
}

/**
 * A product's ESP Web Tools publication: its release's manifest.json, copied as is with the files
 * it names under <slug>/firmware/<id>/ (src/lib/install.mjs).
 */
export interface EspInstall {
  /** Changes as soon as the manifest or one of its files does: the folder's name. */
  id: string;
  /** The manifest's `name` and `version`, as ESP Web Tools shows them. */
  name: string;
  version: string;
  /** Its builds, in its order: ESP Web Tools picks one by chip family and serial type. */
  builds: Array<{ chipFamily: string; serialType: string | null }>;
  manifest: InstallFile;
  /** The files it names, each once. */
  files: InstallFile[];
}

/** A file the product page links where GitHub serves it, never copied: an STM32 `.hex`, an RPi `.img.xz`. */
export interface InstallDownload {
  kind: 'hex' | 'img';
  name: string;
  size: number;
  /** GitHub's `browser_download_url` of the asset. */
  url: string;
}

/**
 * What a product publishes to install (ticket #101): the latest release carrying an installable file
 * (manifest.json, *.hex, *.img.xz), its ESP Web Tools manifest and its downloads.
 */
export interface Install {
  /** Tag of ITS release: may be older than the product's `release`. */
  tag: string;
  publishedAt: string;
  /** null: no manifest.json in that release, or one that was rejected (the catalog report says why). */
  esp: EspInstall | null;
  downloads: InstallDownload[];
  /**
   * The web bench of that same release (ticket #107): its `*_bench.html`, copied as is under
   * <slug>/bench/<id>/ (src/lib/install.mjs); null: none, or more than one (the catalog report says so).
   */
  bench: (InstallFile & { id: string }) | null;
}

/** One tab of a product's manual: one file of 9_Assets/manual/, rendered (src/lib/catalog/manual.mjs). */
export interface ManualTab {
  /** A tab of the vocabulary of content/site.yml (`product.manual.tabs`, ticket #119): data, not a type. */
  id: string;
  /** The language of the file shown: `en`, or `fr` when there is no readable `.en.md`. */
  lang: 'en' | 'fr';
  /** Its path in the repository. */
  file: string;
  /** Its Markdown rendered: raw HTML escaped, links and images rewritten. */
  html: string;
}

/** An image of a manual, re-encoded and served by the site under <slug>/manual/ (src/lib/manual.mjs). */
export interface ManualImage {
  /** Its published name, `<id>.webp`. */
  name: string;
  /** Its path in the repository. */
  source: string;
  size: number;
  /** SHA-256 of the bytes served. */
  sha256: string;
  width: number;
  height: number;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  /**
   * The slogan printed on the series 2 poster, transcribed from the artwork (the poster sets it in
   * capitals). Used by the README kit (scripts/readme-kit.mjs) and the GitHub social preview cards.
   */
  slogan: string;
  category: string;
  /** Catalog section on the home page: an `id` of content/catalog.yml. */
  section: string;
  repo: string;
  status: ProductStatus;
  description: string[];
  basedOn?: string;
  /** Series 2 poster (1254×1254 source, worn plate with near-black opaque corners). */
  poster: ImageMetadata;
  /** What the poster shows — its creature and slogan. Used as the image's alt text. */
  posterAlt: string;
  /** Accent, read off the poster's rays. Tints the product page (badge fill nudged to ≥ 4.5:1). */
  accent: string;
  /** Software licence of its repository as GitHub detects it; null: no LICENSE — no stamp. */
  license: RepoLicense | null;
  /**
   * Hardware licence of its repository: the first non-empty line of its LICENSE-HARDWARE (ticket #75,
   * src/lib/catalog/read.mjs); null: no LICENSE-HARDWARE — no stamp, an empty badge.
   */
  hardwareLicense: HardwareLicense | null;
  /** What it publishes to install; null: nothing (no #install block on its page). */
  install: Install | null;
  /** The manual of its repository (ticket #111); null: no manual file — the page has no tabs. */
  manual: { tabs: ManualTab[]; images: ManualImage[] } | null;
}

export interface Release {
  /** Tag of the latest release, as is: the version shown on the product page. */
  tag: string;
  /** Its `published_at` (ISO 8601): when it appeared on the repository's Releases page. */
  publishedAt: string;
}

export type CatalogProduct = Product & {
  /** Latest GitHub release; null for a product without one. */
  release: Release | null;
};

let catalog: Promise<CatalogProduct[]> | undefined;

export function getCatalog(): Promise<CatalogProduct[]> {
  catalog ??= (async () => {
    const { sections } = catalogContent();
    const products = (await getCollection('repoProducts')).map((entry) => entry.data as CatalogProduct);
    return assembleCatalog({ products, sections });
  })();
  return catalog;
}
