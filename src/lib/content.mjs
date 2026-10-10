// SOURCE: zurp-astronomics-site — reads content/: the texts and short data of the site and of the README kit (YAML, Markdown, Mustache markers)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #66) — content/licences/ is gone: a product's licence is its repository's
//   LICENSE, as GitHub detects it (src/lib/license-stamp.mjs); the site holds no licence rule of its own
// REVISED: 2026-10-06 (ticket #72) — content/catalog.yml lists no products any more: the site
//   publishes the products it discovers in the organisation's repositories (src/lib/catalog/)
// REVISED: 2026-10-06 (ticket #75) — content/licences.yml (licenseContent): the vocabulary of the two
//   licences of a product, software and hardware — stamps, badges, the titles of the hardware
//   licences. Still no licence of a product here: each one is its repository's file
//
// THE RULE (the human's, ticket #49): a fixed structure on one side (src/, scripts/), the resources
// on the other — content/, at the repository root. Every text meant for a reader (prose, titles, link
// texts, labels, alt / title / aria-label, meta, the README templates) is in
// content/, and the code only places it. content/README.md says what is where.
//
// Plain JavaScript, so that the site (Astro), the scripts that run after the build
// (scripts/readme-kit.mjs, scripts/check-dist.mjs) and the tests read content/ through the SAME
// functions. Read with node:fs from the repository root (the working directory of `npm run …`,
// like src/lib/social-card.ts and its font), never cached: `astro dev` sees an edit at the next
// page load.
//
// FORMATS
//   *.yml   short data (js-yaml);
//   *.md    prose and templates. A YAML front matter (`---` … `---`, the file's own header) opens
//           every one of them and is never part of the text. Markers `{{…}}` are filled by Mustache
//           (logic-less: values, `{{#list}}…{{/list}}` loops and `{{^x}}…{{/x}}` when-absent blocks,
//           no code); prose is then rendered by markdown-it (CommonMark, inline HTML allowed, no
//           typographic substitution: the text comes out as written).

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import Mustache from 'mustache';
import MarkdownIt from 'markdown-it';

export const CONTENT_DIR = 'content';

/** content/ under `root` (default: the working directory, the repository root for `npm run …`). */
export function contentDir(root = process.cwd()) {
  const dir = resolve(root, CONTENT_DIR);
  if (!existsSync(dir)) {
    throw new Error(`content: no ${CONTENT_DIR}/ directory at ${dir} — run from the repository root`);
  }
  return dir;
}

function readFile(rel, root) {
  const file = join(contentDir(root), rel);
  if (!existsSync(file)) throw new Error(`content: missing file ${CONTENT_DIR}/${rel}`);
  return readFileSync(file, 'utf8');
}

/** A YAML file of content/, parsed. */
export function readYaml(rel, root) {
  return yaml.load(readFile(rel, root), { filename: `${CONTENT_DIR}/${rel}` });
}

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * A Markdown file of content/, without its front matter (and the blank lines right after it).
 * The rest is returned as written, trailing newline included: a template keeps its exact layout.
 */
export function readMarkdown(rel, root) {
  const text = readFile(rel, root);
  if (!FRONT_MATTER.test(text)) throw new Error(`content: ${CONTENT_DIR}/${rel} has no front matter (--- … ---)`);
  return text.replace(FRONT_MATTER, '').replace(/^(?:[ \t]*\r?\n)+/, '');
}

/** The escape of `{{x}}` in the README templates: HTML special characters (`{{{x}}}` is as is). */
export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Fills the Mustache markers of `template` with `view`. `escape` is what `{{x}}` applies (default:
 * nothing — the text is Markdown, rendered and escaped afterwards); `{{{x}}}` is never escaped.
 */
export function fill(template, view = {}, { escape = (s) => String(s) } = {}) {
  return Mustache.render(template, view, {}, { escape });
}

const markdown = new MarkdownIt({ html: true, linkify: false, typographer: false });
// An HTML entity is written out as the author wrote it (`10&nbsp;million` stays `&nbsp;`, not the
// raw U+00A0 character markdown-it would decode it to: the same text, but invisible in the page
// source). That needs the entity tokens kept apart from the text around them (core rule
// `text_join` off) and rendered by hand; a backslash escape (`\*`) renders its character, escaped.
markdown.core.ruler.disable('text_join');
markdown.renderer.rules.text_special = (tokens, idx) =>
  tokens[idx].info === 'entity' ? tokens[idx].markup : markdown.utils.escapeHtml(tokens[idx].content);

/** One paragraph of Markdown as inline HTML (no <p> around it: the page places it). */
export function inlineMarkdown(text) {
  return markdown.renderInline(text.trim());
}

/** Markdown prose as a list of paragraphs (blank-line separated), each as inline HTML. */
export function markdownParagraphs(text) {
  return text
    .trim()
    .split(/\r?\n[ \t]*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => markdown.renderInline(p));
}

// --- The files ------------------------------------------------------------------------------------

/**
 * content/site.yml: the site's name, tagline, signature, titles, labels and alt texts.
 * `signature` comes back filled (its `{{name}}` / `{{affiliation}}` markers: one source for the
 * affiliation, which the footer's `productLine` shares — that one is filled where its product is
 * known, with `siteView(site)` plus `product`).
 */
export function siteContent(root) {
  const site = readYaml('site.yml', root);
  return { ...site, signature: fill(site.signature, siteView(site)) };
}

/** The site-wide markers of content/site.yml's texts: `{{name}}`, `{{affiliation}}`. */
export const siteView = (site) => ({ name: site.name, affiliation: site.affiliation });

/**
 * content/catalog.yml: the sections (display order, titles), the status labels and badge colours,
 * the texts of the status badge JSON (src/lib/status-badge.mjs).
 */
export function catalogContent(root) {
  const c = readYaml('catalog.yml', root);
  const problems = [];
  if (!Array.isArray(c?.sections) || !c.sections.length || !c.sections.every((s) => s && typeof s.id === 'string' && typeof s.title === 'string')) {
    problems.push('`sections` must be a non-empty list of { id, title }');
  }
  for (const status of ['wip', 'future', 'released']) {
    if (typeof c?.statuses?.[status]?.label !== 'string') problems.push(`\`statuses.${status}.label\` missing`);
    if (typeof c?.statuses?.[status]?.badgeColor !== 'string') problems.push(`\`statuses.${status}.badgeColor\` missing`);
  }
  for (const key of ['label', 'message']) {
    if (typeof c?.statusBadge?.[key] !== 'string' || !c.statusBadge[key].trim()) problems.push(`\`statusBadge.${key}\` missing`);
  }
  if (problems.length) throw new Error(`content: ${CONTENT_DIR}/catalog.yml: ${problems.join('; ')}`);
  return { sections: c.sections, statuses: c.statuses, statusBadge: c.statusBadge };
}

/** The two kinds of licence of a product (ticket #75), in the order they are shown. */
export const LICENSE_KINDS = /** @type {const} */ (['software', 'hardware']);

/**
 * content/licences.yml: the stamps of the product pages, the licence badges of the README headers,
 * the titles of the hardware licences (src/lib/license-stamp.mjs, src/lib/license-badge.mjs).
 * Validated here: a missing text or colour, or two hardware titles that read the same (case and
 * spaces aside), fails with the key named.
 */
export function licenseContent(root) {
  const c = readYaml('licences.yml', root);
  const problems = [];
  const text = (v) => typeof v === 'string' && v.trim() !== '';
  const colour = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  for (const kind of LICENSE_KINDS) {
    const k = c?.[kind];
    if (!text(k?.stamp) || !k.stamp.includes('{{licence}}')) problems.push(`\`${kind}.stamp\` missing, or without its {{licence}} marker`);
    if (!text(k?.unrecognised)) problems.push(`\`${kind}.unrecognised\` missing`);
    if (!text(k?.badge?.label)) problems.push(`\`${kind}.badge.label\` missing`);
    if (!colour(k?.badge?.color)) problems.push(`\`${kind}.badge.color\` is not a #rrggbb colour`);
  }
  if (!colour(c?.badge?.labelColor)) problems.push('`badge.labelColor` is not a #rrggbb colour');
  const titles = c?.hardware?.titles;
  if (!Array.isArray(titles)) problems.push('`hardware.titles` must be a list of { title, label, name }');
  else {
    const seen = new Map();
    titles.forEach((t, i) => {
      for (const key of ['title', 'label', 'name']) if (!text(t?.[key])) problems.push(`\`hardware.titles[${i}].${key}\` missing`);
      if (!text(t?.title)) return;
      const key = licenseTitleKey(t.title);
      if (seen.has(key)) problems.push(`\`hardware.titles[${i}].title\` reads like \`hardware.titles[${seen.get(key)}].title\` (case and spaces aside)`);
      else seen.set(key, i);
    });
  }
  if (problems.length) throw new Error(`content: ${CONTENT_DIR}/licences.yml: ${problems.join('; ')}`);
  const trim = (s) => s.trim();
  const kindTexts = (k) => ({ stamp: trim(k.stamp), unrecognised: trim(k.unrecognised), badge: { label: trim(k.badge.label), color: k.badge.color } });
  return {
    software: kindTexts(c.software),
    hardware: { ...kindTexts(c.hardware), titles: titles.map((t) => ({ title: trim(t.title), label: trim(t.label), name: trim(t.name) })) },
    badge: { labelColor: c.badge.labelColor },
  };
}

/**
 * How a licence title is compared (ticket #75: « la correspondance tolère la casse et les espaces »):
 * case folded, every white space removed.
 */
export const licenseTitleKey = (title) => String(title).normalize('NFC').toLowerCase().replace(/\s+/g, '');
