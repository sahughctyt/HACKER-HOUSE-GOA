/**
 * The HH Goa 2026 brand kit.
 * Palette + copy live here so the canvas renderers and the DOM stay in sync.
 */

export const C = {
  greenDeep: '#08381F',
  greenNight: '#0F2E1D',
  green: '#0B6839',
  greenDark: '#084D2A',
  greenPanel: '#17251C',
  greenLine: '#1E5B3A',
  cream: '#FAF0D7',
  creamDim: '#E7DCBC',
  yellow: '#FEE101',
  yellowDeep: '#D4BE1F',
  pink: '#FF007A',
  pinkDeep: '#E62E78',
  ink: '#0A2114',
} as const;

export const EVENT = {
  name: 'HACKER HOUSE',
  nameShort: 'HH GOA',
  hindi: 'गोवा',
  year: '2026',
  dates: '28—31 OCT 2026',
  datesShort: 'OCT 28-31',
  place: 'GOA, INDIA',
  tagline: 'LESS NOISE. MORE BUILDING.',
  ticker: 'HACKER HOUSE GOA 2026 · 500 BUILDERS · 4 DAYS · ONE HOUSE BY THE OCEAN ·',
  hashtag: '#FrameInGoa',
} as const;

/** Font stacks. The real families are loaded by next/font and exposed as CSS vars. */
export type Fonts = {
  display: string; // Bodoni Moda
  mono: string; // IBM Plex Mono
  pixel: string; // Silkscreen
  hindi: string; // Yatra One
};

export const FALLBACK_FONTS: Fonts = {
  display: 'Georgia, serif',
  mono: 'ui-monospace, monospace',
  pixel: 'ui-monospace, monospace',
  hindi: 'Georgia, serif',
};

/** Reads the live font families off :root so canvas text matches the page. */
export function readFonts(): Fonts {
  if (typeof window === 'undefined') return FALLBACK_FONTS;
  const s = getComputedStyle(document.documentElement);
  const pick = (v: string, fb: string) => (s.getPropertyValue(v).trim() || fb);
  return {
    display: pick('--font-display', FALLBACK_FONTS.display),
    mono: pick('--font-mono', FALLBACK_FONTS.mono),
    pixel: pick('--font-pixel', FALLBACK_FONTS.pixel),
    hindi: pick('--font-hindi', FALLBACK_FONTS.hindi),
  };
}

/**
 * Canvas will silently fall back to a default face if a webfont has not been
 * pulled in yet, so warm every family/weight we draw with before rendering.
 */
export async function ensureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const f = readFonts();
  const specs = [
    `400 64px ${f.display}`,
    `700 64px ${f.display}`,
    `900 64px ${f.display}`,
    `italic 700 64px ${f.display}`,
    `400 32px ${f.mono}`,
    `500 32px ${f.mono}`,
    `600 32px ${f.mono}`,
    `700 32px ${f.mono}`,
    `400 32px ${f.pixel}`,
    `700 32px ${f.pixel}`,
    `400 64px ${f.hindi}`,
  ];
  await Promise.all(
    specs.map((s) => document.fonts.load(s).catch(() => undefined))
  );
  await document.fonts.ready;
}
