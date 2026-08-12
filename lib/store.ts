/**
 * Storage for shared graphics.
 *
 * The X link-preview path needs the PNG to live at a public URL so the
 * crawler can fetch it as an og:image. Two backends, picked automatically:
 *
 *   - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production).
 *   - Plain filesystem otherwise (local dev, or any node host with a disk).
 */
const PREFIX = 'frame-in-goa';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function newId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

export function isValidId(id: string): boolean {
  return /^[a-z0-9]{6,24}$/.test(id);
}

function fsDir(): string {
  if (process.env.SHARE_DIR) return process.env.SHARE_DIR;
  // Serverless filesystems are read-only apart from /tmp.
  return process.env.VERCEL ? `/tmp/${PREFIX}` : `.data/${PREFIX}`;
}

/**
 * Two files per share: the graphic itself, and the 1200×630 link-preview
 * banner that the X crawler gets as og:image.
 */
export type Variant = 'full' | 'og';

/**
 * The stored graphic is a JPEG (it exists to be displayed and previewed, and
 * full-size PNGs of photos run to several MB); the banner stays PNG for crisp
 * type. Fixed formats per variant means no extension bookkeeping.
 */
function key(id: string, variant: Variant) {
  return variant === 'og' ? `${id}.og.png` : `${id}.jpg`;
}

export function contentType(variant: Variant) {
  return variant === 'og' ? 'image/png' : 'image/jpeg';
}

export async function saveShare(id: string, data: Buffer, variant: Variant = 'full'): Promise<void> {
  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    await put(`${PREFIX}/${key(id, variant)}`, data, {
      access: 'public',
      contentType: contentType(variant),
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return;
  }
  const { mkdir, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const dir = fsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key(id, variant)), data);
}

export type ShareHit =
  | { kind: 'buffer'; body: Buffer }
  | { kind: 'redirect'; url: string };

/** Blob lookups are a network call, so remember the resolved URL per instance. */
const blobUrlCache = new Map<string, string>();

export async function readShare(id: string, variant: Variant = 'full'): Promise<ShareHit | null> {
  if (!isValidId(id)) return null;
  const name = key(id, variant);

  if (useBlob()) {
    const cached = blobUrlCache.get(name);
    if (cached) return { kind: 'redirect', url: cached };
    const { list } = await import('@vercel/blob');
    const res = await list({ prefix: `${PREFIX}/${name}`, limit: 2 });
    const hit = res.blobs.find((b) => b.pathname === `${PREFIX}/${name}`);
    if (!hit) return null;
    blobUrlCache.set(name, hit.url);
    return { kind: 'redirect', url: hit.url };
  }

  const { readFile, stat } = await import('node:fs/promises');
  const path = await import('node:path');
  const file = path.join(fsDir(), name);
  try {
    const s = await stat(file);
    if (Date.now() - s.mtimeMs > TTL_MS) return null;
    return { kind: 'buffer', body: await readFile(file) };
  } catch {
    return null;
  }
}

export async function shareExists(id: string): Promise<boolean> {
  return (await readShare(id)) !== null;
}
