// SOURCE: zurp-astronomics-site — the tests of the guard of the site's styles (ticket #117): nothing tilted but the poster, its tape, its label and the footer's signature; nothing moving under the pointer but that signature; ↗ on every link opening a new tab, on no other
// AUTHOR: engineer
// DATE: 2026-10-21
// STATUS: active
//
// Run with `npm test`. The CSS below is written as Astro minifies it (scope attributes, no spaces),
// one case per rule of scripts/lib/check-style.mjs; scripts/check-dist.mjs runs the same checks on
// the real dist/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cssRules, inlineStyles, newTabProblems, styleProblems } from '../scripts/lib/check-style.mjs';
import { siteContent } from '../src/lib/content.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = (css) => styleProblems(css, 'x.css');

test('1. the rules of a stylesheet: through @media and @supports, not @keyframes; a data: URI with « ; » is one value', () => {
  const rules = cssRules('@import "a.css";.a[data-astro-cid-x],.b{color:red;background:url(data:image/svg+xml;utf8,<svg/>)}@media (min-width:1px){.c{transform:none}}@keyframes k{to{transform:rotate(9deg)}}');
  assert.deepEqual(rules.map((r) => r.selectors), [['.a[data-astro-cid-x]', '.b'], ['.c']]);
  assert.equal(rules[0].declarations.length, 2);
});

test('2. straight: no rule tilts anything but .affiche, .tape, .cartel and .lowtech-panel; rotate(0) is straight', () => {
  // The three exceptions, as the home page and the footer write them, phone layout included.
  const exceptions =
    '.affiche[data-astro-cid-j7pv25f6]{transform:rotate(-1.5deg)}' +
    '.tape[data-astro-cid-j7pv25f6].tl{transform:translate(-42%,-38%) rotate(-42deg)}' +
    '@media (max-width:760px){.cartel[data-astro-cid-j7pv25f6]{transform:rotate(.6deg)}}' +
    '.lowtech-panel[data-astro-cid-sz7xmlte]{transform:rotate(-2deg)}' +
    '.stamp[data-astro-cid-j7pv25f6]{transform:rotate(0deg)}';
  assert.deepEqual(check(exceptions), []);
  // A title band, a tab, a stamp, a matrix and the `rotate` property: all tilted, all refused.
  assert.match(check('html.z2 .z2-band{transform:rotate(-2.2deg)}').join('\n'), /`html\.z2 \.z2-band` tilts/);
  assert.match(check('.manual-tab[data-astro-cid-a]:nth-child(2n){transform:rotate(.5deg)}').join('\n'), /tilts/);
  assert.match(check('.badge[data-astro-cid-b]{rotate:1deg}').join('\n'), /tilts \(rotate: 1deg\)/);
  assert.match(check('.x{transform:matrix(.99,.02,-.02,.99,0,0)}').join('\n'), /tilts/);
  assert.match(check('.x{transform:skew(2deg)}').join('\n'), /tilts/);
  // The home page's prefers-reduced-motion block (ticket #117 § 6): it must not tilt the stamp back.
  assert.match(check('@media (prefers-reduced-motion:reduce){.stamp[data-astro-cid-j7pv25f6]:hover{transform:rotate(-1.5deg)}}').join('\n'), /`\.stamp\[data-astro-cid-j7pv25f6\]:hover` tilts/);
  // A class that only starts like an exception's is not one.
  assert.match(check('.affiche-img{transform:rotate(1deg)}').join('\n'), /tilts/);
});

test('3. still under the pointer: no :hover rule moves anything but the footer signature; a state (the selected tab) is not a hover', () => {
  assert.deepEqual(check('.lowtech-link[data-astro-cid-s]:hover .lowtech-panel[data-astro-cid-s],.lowtech-link[data-astro-cid-s]:focus-visible .lowtech-panel[data-astro-cid-s]{transform:scale(1.1) rotate(1deg)}'), []);
  assert.deepEqual(check(".manual-tab[data-astro-cid-a][aria-selected=true]{transform:translateY(-3px)}"), []);
  assert.deepEqual(check('.tile[data-astro-cid-t]:hover .poster[data-astro-cid-t]{box-shadow:0 0 0 3px red}.esp-install:hover{transform:none}'), []);
  for (const css of [
    '.tile[data-astro-cid-t]:hover{transform:translateY(-4px)}',
    '.esp-install[data-astro-cid-e]:hover{transform:translate(-2px,-2px)}',
    '@media (prefers-reduced-motion:no-preference) and (min-width:761px){.affiche[data-astro-cid-j]:hover{transform:scale(1.01)}}',
    '.repo-link:hover{translate:-2px -2px}',
    '.manual-tab:hover{scale:1.05}',
  ]) assert.match(check(css).join('\n'), /moves under the pointer/, css);
});

test('4. the CSS a page carries itself: its <style> and its style="" attributes are read', () => {
  const html = '<html><head><style>.a{transform:rotate(1deg)}</style></head><body><div style="--x: 1; transform: rotate(2deg)"></div></body></html>';
  assert.equal(styleProblems(inlineStyles(html), 'p').length, 2);
});

test('5. ↗ for a new tab: every link with target="_blank" shows content/site.yml `product.newTabArrow` and has rel="noopener"; no other link shows it', () => {
  const { newTabArrow, downloadArrow } = siteContent(ROOT).product;
  assert.equal(newTabArrow, '↗');
  const html =
    `<a href="https://github.com/o/r" target="_blank" rel="noopener" data-repo-link>GitHub <span aria-hidden="true">${newTabArrow}</span></a>` +
    `<a class="repo-link" href="/r/bench/x/" target="_blank" rel="noopener" data-bench-tab><span>${newTabArrow}</span><span>Ouvrir dans un nouvel onglet</span></a>` +
    `<a class="repo-link" href="https://github.com/o/r/releases/download/v1/r.hex" data-download="hex"><span>${downloadArrow}</span><span>r.hex</span></a>`;
  assert.deepEqual(newTabProblems(html, 'p', newTabArrow), []);
  assert.match(newTabProblems(html.replace(`<span>${newTabArrow}</span><span>Ouvrir`, `<span>${downloadArrow}</span><span>Ouvrir`), 'p', newTabArrow).join('\n'), /"\/r\/bench\/x\/" opens a new tab without ↗/);
  assert.match(newTabProblems(`<a href="/x">x ${newTabArrow}</a>`, 'p', newTabArrow).join('\n'), /shows ↗, it does not open a new tab/);
  assert.match(newTabProblems(`<a href="/x" target="_blank">x ${newTabArrow}</a>`, 'p', newTabArrow).join('\n'), /without rel="noopener"/);
});
