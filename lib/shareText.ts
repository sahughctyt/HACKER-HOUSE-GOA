/** Client-safe share copy. Kept out of lib/site.ts so the browser bundle
 *  never pulls in next/headers. */

/** The caption we pre-fill into the X composer. */
export function tweetText(opts: { name?: string; title?: string; format: 'frame' | 'card' }) {
  if (opts.format === 'frame') {
    return `New pfp, who dis. Locked in for Hacker House Goa 2026 — 28–31 Oct, 500 builders, one house by the ocean.\n\nLess noise. More building. #FrameInGoa`;
  }
  const klass = (opts.title || '').trim().toLowerCase();
  const line = klass ? ` Turns out I'm ${klass}.` : '';
  return `My Hacker House Goa 2026 Builder ID is live.${line} 28–31 Oct · Goa, India.\n\nLess noise. More building. #FrameInGoa`;
}

export function xIntentUrl(text: string, url?: string) {
  const p = new URLSearchParams({ text });
  if (url) p.set('url', url);
  return `https://x.com/intent/post?${p.toString()}`;
}
