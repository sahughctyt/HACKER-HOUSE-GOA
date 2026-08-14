/**
 * Photo filter effects for photo processing in Hacker House Goa ID cards.
 */

export type PhotoFilter = 'normal' | 'duotone' | 'dither' | 'ascii' | 'grayscale' | 'pixelate';

export const PHOTO_FILTERS: { id: PhotoFilter; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'duotone', label: 'Dual Tone' },
  { id: 'dither', label: 'Dither' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'pixelate', label: 'Pixelate' },
];

/**
 * Applies selected filter to a target canvas context containing a photo.
 */
export function applyFilterToCanvas(
  canvas: HTMLCanvasElement,
  filter: PhotoFilter
) {
  if (filter === 'normal') return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  if (filter === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (filter === 'duotone') {
    // Brand duotone: Deep Green #0B6839 to Bright Yellow #FEE101 / Pink #FF0080
    for (let i = 0; i < data.length; i += 4) {
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      data[i] = Math.round(11 + lum * (254 - 11));
      data[i + 1] = Math.round(104 + lum * (225 - 104));
      data[i + 2] = Math.round(57 + lum * (1 - 57));
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (filter === 'pixelate') {
    const size = Math.max(8, Math.floor(Math.min(w, h) / 48));
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const smallW = Math.max(1, Math.floor(w / size));
    const smallH = Math.max(1, Math.floor(h / size));

    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(canvas, 0, 0, smallW, smallH);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  } else if (filter === 'dither') {
    // 4x4 Bayer Dithering Matrix
    const bayerMatrix = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const oldPixel = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const threshold = (bayerMatrix[y % 4][x % 4] / 16) * 255;
        const newPixel = oldPixel < threshold ? 0 : 255;
        data[idx] = newPixel;
        data[idx + 1] = newPixel;
        data[idx + 2] = newPixel;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (filter === 'ascii') {
    const tileSize = 8;
    const chars = ' .:-=+*#%@';
    ctx.fillStyle = '#084e2a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FEE101';
    ctx.font = `bold ${tileSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const idx = (Math.min(y, h - 1) * w + Math.min(x, w - 1)) * 4;
        const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
        const charIdx = Math.floor(lum * (chars.length - 1));
        const char = chars[charIdx];
        if (char !== ' ') {
          ctx.fillText(char, x + tileSize / 2, y + tileSize / 2);
        }
      }
    }
  }
}
