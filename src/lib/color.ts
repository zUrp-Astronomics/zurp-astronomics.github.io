// SOURCE: zurp-astronomics-site — text colour that stays readable on a product accent fill, and the accent fill nudged to reach WCAG AA
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active

const INK = '#1a1714';
const PAPER = '#f7eed6';

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Ink or paper, whichever contrasts best with the given accent fill (WCAG ratio). */
export function onAccent(accent: string): string {
  return contrast(accent, INK) >= contrast(accent, PAPER) ? INK : PAPER;
}

/** Minimum WCAG contrast for running text (AA). */
export const MIN_TEXT_CONTRAST = 4.5;

function mix(hex: string, target: number, t: number): string {
  const h = hex.replace('#', '');
  return (
    '#' +
    [0, 2, 4]
      .map((i) => {
        const c = parseInt(h.slice(i, i + 2), 16);
        return Math.round(c + (target - c) * t)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

/**
 * A text-bearing accent fill (status badge) and its text colour, with at least `min` contrast.
 * An accent that already passes comes back untouched. One that does not is pushed away from its
 * text colour (darkened under paper, lightened under ink) by the smallest step that passes, so it
 * stays the product's colour, only a shade deeper. Kaiju's red #d81f15 under paper is 4.40:1: it
 * comes back a few % darker. Throws if no shade passes (cannot happen with ink / paper, but a
 * silent unreadable badge must never ship).
 */
export function accessibleFill(accent: string, min = MIN_TEXT_CONTRAST): { fill: string; text: string } {
  const target = onAccent(accent) === PAPER ? 0 : 255;
  for (let step = 0; step <= 100; step++) {
    const fill = mix(accent, target, step / 100);
    const text = onAccent(fill);
    if (contrast(fill, text) >= min) return { fill, text };
  }
  throw new Error(`accessibleFill: no shade of ${accent} reaches ${min}:1 with ink or paper`);
}
