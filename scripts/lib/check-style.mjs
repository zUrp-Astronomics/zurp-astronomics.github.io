// SOURCE: zurp-astronomics-site — what the built styles of dist/ must hold: nothing tilted but the three chosen exceptions, nothing moving under the pointer but the footer's signature; every link opening a new tab marked ↗, no other
// AUTHOR: engineer
// DATE: 2026-10-21
// STATUS: active — ticket #117
//
// Pure checks, called by scripts/check-dist.mjs on the CSS and the pages of dist/ and tested by
// test/style.test.mjs. Each returns the list of its problems, empty when the build keeps the rules.
//
// THE RULES (ticket #117, the human's, 2026-10-21 — « on est punk mais on est rigoureux »):
//   - STRAIGHT: no rule tilts anything (a `rotate()`, `skew()` or `matrix()` transform, a `rotate`
//     property) other than the three tilted on purpose, one gesture in one place each:
//     the home page's poster (`.affiche`) and the tape at its corners (`.tape`), its label
//     (`.cartel`), the footer's signature (`.lowtech-panel`, src/components/v2/Footer.astro);
//   - STILL UNDER THE POINTER: no `:hover` rule moves anything (transform, translate, rotate, scale)
//     but the footer's signature. A state is not a hover: the selected tab stays raised;
//   - ↗ FOR A NEW TAB: every link of a page opening a new tab (`target="_blank"`) shows
//     content/site.yml `product.newTabArrow`; no other link does (the downloads keep their ⟶).
// The CSS is read as Astro writes it (dist/_astro/*.css, the <style> of each page, minified, the
// scope attribute on each selector): the exceptions are found by their class, the one thing the
// styles name them by.

/** The classes allowed to tilt, and the one allowed to move under the pointer. */
export const TILTED = ['affiche', 'tape', 'cartel', 'lowtech-panel'];
export const MOVING_ON_HOVER = ['lowtech-panel'];

const MOVES = new Set(['transform', 'translate', 'rotate', 'scale']);

/** `text` split on `sep` outside of quotes, parentheses and brackets. */
function splitTop(text, sep) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === sep && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Offset of the `}` closing the block opened at `open` (a `{`), quotes and comments-free text. */
function closing(css, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return css.length;
}

/**
 * The style rules of a stylesheet: each with its selectors and its declarations, through the
 * conditional at-rules (@media, @supports, @layer, @container); @keyframes and @font-face are not
 * rules of an element and are left out.
 * @param {string} css
 * @returns {Array<{ selectors: string[], declarations: Array<{ property: string, value: string }> }>}
 */
export function cssRules(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    // A statement at-rule (@import …;) before the block belongs to nothing.
    const prelude = text.slice(i, open).split(';').pop().trim();
    const end = closing(text, open);
    const body = text.slice(open + 1, end);
    if (prelude.startsWith('@')) {
      if (/^@(media|supports|layer|container|scope|document)\b/i.test(prelude)) rules.push(...cssRules(body));
    } else {
      const declarations = splitTop(body, ';')
        .map((d) => d.match(/^([-\w]+)\s*:\s*([\s\S]*)$/))
        .filter(Boolean)
        .map(([, property, value]) => ({ property: property.toLowerCase(), value: value.replace(/\s*!important\s*$/i, '').trim() }));
      rules.push({ selectors: splitTop(prelude, ','), declarations });
    }
    i = end + 1;
  }
  return rules;
}

const hasClass = (selector, names) => names.some((n) => new RegExp(`\\.${n}(?![-\\w])`).test(selector));

/** A non-zero angle in a CSS value (`rotate(0)`, `rotate(0deg)` are straight). */
const tilts = (value) =>
  [...value.matchAll(/\b(rotate[xyz]?|rotate3d|skew[xy]?|matrix(?:3d)?)\(([^)]*)\)/gi)].some(([, fn, args]) => {
    if (/^matrix/i.test(fn)) {
      const n = args.split(',').map(Number);
      return n.length >= 4 && (n[1] !== 0 || n[2] !== 0);
    }
    const angle = /^rotate3d$/i.test(fn) ? args.split(',').pop() : args;
    return angle.split(',').some((a) => parseFloat(a) !== 0);
  });

/** A declaration that moves its element (any transform, translate, rotate or scale but `none`). */
const moves = ({ property, value }) => MOVES.has(property) && !/^(none|initial|unset|inherit|revert)$/i.test(value);

/**
 * The problems of a stylesheet of dist/.
 * @param {string} css
 * @param {string} where its file, for the messages
 * @returns {string[]}
 */
export function styleProblems(css, where) {
  const problems = [];
  for (const { selectors, declarations } of cssRules(css)) {
    for (const d of declarations) {
      const tilted = (d.property === 'transform' && tilts(d.value)) || (d.property === 'rotate' && tilts(`rotate(${d.value.split(/\s+/).pop()})`));
      for (const s of selectors) {
        if (tilted && !hasClass(s, TILTED)) problems.push(`${where}: \`${s}\` tilts (${d.property}: ${d.value}) — only ${TILTED.map((c) => `.${c}`).join(', ')} may`);
        if (/:hover\b/.test(s) && moves(d) && !hasClass(s, MOVING_ON_HOVER)) {
          problems.push(`${where}: \`${s}\` moves under the pointer (${d.property}: ${d.value}) — only ${MOVING_ON_HOVER.map((c) => `.${c}`).join(', ')} may`);
        }
      }
    }
  }
  return problems;
}

/** The CSS a page carries itself: its <style> elements and its style="" attributes. */
export function inlineStyles(html) {
  const blocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const attrs = [...html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*?\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => `[style]{${m[2] ?? m[3]}}`);
  return [...blocks, ...attrs].join('\n');
}

/**
 * The problems of the links of a page that open a new tab: each shows `arrow`, no other link does.
 * @param {string} html
 * @param {string} where the page, for the messages
 * @param {string} arrow content/site.yml `product.newTabArrow`
 * @returns {string[]}
 */
export function newTabProblems(html, where, arrow) {
  const problems = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const blank = /\btarget\s*=\s*["']?_blank\b/i.test(m[1]);
    const shows = m[2].replace(/<[^>]*>/g, '').includes(arrow);
    const href = (m[1].match(/\bhref\s*=\s*"([^"]*)"/i) ?? [])[1] ?? '';
    if (blank && !shows) problems.push(`${where}: the link to ${JSON.stringify(href)} opens a new tab without ${arrow}`);
    if (!blank && shows) problems.push(`${where}: the link to ${JSON.stringify(href)} shows ${arrow}, it does not open a new tab`);
    if (blank && !/\brel\s*=\s*["'][^"']*\bnoopener\b/i.test(m[1])) problems.push(`${where}: the link to ${JSON.stringify(href)} opens a new tab without rel="noopener"`);
  }
  return problems;
}
