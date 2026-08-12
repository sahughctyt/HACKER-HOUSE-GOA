/**
 * Turning whatever the user picked from their phone into something we can draw.
 * Handles HEIC/HEIF from iPhone, EXIF rotation, and downscales huge originals
 * so every later redraw stays instant.
 */

const MAX_EDGE = 2000;

export type LoadedPhoto = {
  bitmap: ImageBitmap | HTMLCanvasElement;
  width: number;
  height: number;
};

export function isHeic(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  const n = file.name.toLowerCase();
  return (
    t === 'image/heic' ||
    t === 'image/heif' ||
    t === 'image/heic-sequence' ||
    t === 'image/heif-sequence' ||
    n.endsWith('.heic') ||
    n.endsWith('.heif')
  );
}

/** iOS Safari decodes HEIC natively; everywhere else we convert via wasm. */
async function toDrawableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  try {
    // Native decode first — free and instant when the browser supports it.
    const bmp = await createImageBitmap(file);
    bmp.close?.();
    return file;
  } catch {
    // The decoder is a few hundred KB of wasm, so it is only ever fetched
    // when someone actually uploads a HEIC.
    try {
      const { heicTo } = await import('heic-to');
      return await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
    } catch {
      throw new Error(
        "We couldn't read that HEIC. On iPhone, share it as JPG — or try another photo."
      );
    }
  }
}

export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  const blob = await toDrawableBlob(file);

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    source = await loadViaImgTag(blob);
  }

  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!w || !h) throw new Error("That file didn't decode as an image.");

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  if (scale === 1 && 'close' in source) {
    return { bitmap: source as ImageBitmap, width: w, height: h };
  }

  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, tw, th);
  if ('close' in source) source.close();
  return { bitmap: canvas, width: tw, height: th };
}

function loadViaImgTag(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn't read that image. Try a JPG or PNG."));
    };
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugify(s: string, fallback = 'builder'): string {
  const out = (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return out || fallback;
}
