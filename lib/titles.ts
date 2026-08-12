/**
 * "Builder title" generator. Deterministic from a seed so a card can be
 * reproduced, but re-rollable from the UI.
 */
import { Rng } from './random';

export const BUILDER_TITLES = [
  'THE SHIPPER',
  'THE ARCHITECT',
  'THE DEGEN',
  'THE DESIGNER',
  'THE DEBUGGER',
  'THE NIGHT OWL',
  'THE PROMPT WHISPERER',
  'THE REFACTORER',
  'THE PIXEL PUSHER',
  'THE LATENCY HUNTER',
  'THE DEMO GOD',
  'THE SCHEMA POET',
  'THE COMMIT MACHINE',
  'THE EDGE CASE',
  'THE RUBBER DUCK',
  'THE 3AM IDEA GUY',
  'THE MERGE CONFLICT',
  'THE SIDE QUEST',
  'THE COLD BREW RUNTIME',
  'THE SUNSET SHIPPER',
  'THE BEACH DEPLOYER',
  'THE ZERO TO ONE',
  'THE LAST MINUTE HERO',
  'THE STACK OVERFLOWER',
  'THE CTRL+Z ARTIST',
  'THE FEATURE CREEP',
  'THE UPTIME MONK',
  'THE VIBE COMPILER',
] as const;

/** Flavour line stamped in small type on some layouts. */
export const BUILDER_MOTTOS = [
  'SHIPS BEFORE SUNRISE',
  'READS THE DOCS. SOMETIMES.',
  'RUNS ON FILTER COFFEE',
  'DEPLOYS ON FRIDAY',
  'ONE MORE COMMIT',
  'BUILT DIFFERENT, LITERALLY',
  'TALKS IN COMMITS',
  'BREAKS PROD, FIXES FASTER',
  'IDEA → REPO IN 20 MIN',
  'SAND IN THE KEYBOARD',
  'NO NOISE. JUST BUILD.',
  'WILL PITCH AT 3AM',
] as const;

export function titleFor(seed: string): string {
  return new Rng(`title:${seed}`).pick(BUILDER_TITLES);
}

export function mottoFor(seed: string): string {
  return new Rng(`motto:${seed}`).pick(BUILDER_MOTTOS);
}

/** HH-26-0241 style pass number. */
export function passNumber(seed: string): string {
  const n = new Rng(`pass:${seed}`).int(1, 500);
  return `HH-26-${String(n).padStart(4, '0')}`;
}
