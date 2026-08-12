# Frame in Goa — HH Goa 2026 graphic generator

Upload a photo, get a branded **Hacker House Goa 2026** graphic back in about a
second, download it, and post it to X with the caption already written.

No login. No signup gate. The result appears before you're asked for anything.

---

## What it makes

Downloads are PNG while the file stays comfortably small, and JPEG (q0.94)
once the photograph makes it heavy — X rejects composer attachments over 5 MB,
and a 2160×2700 PNG of a real photo lands right about there.

**Format A — PFP frame** (1080×1080, exported at 2160×2160)

| Style | Look |
| --- | --- |
| `THE SEAL` | Cream ring, official-stamp arc lockup, tick marks |
| `THE SUNSET` | Plum→gold duotone photo, pixel ring ticker, `गोवा` badge |
| `THE TERMINAL` | Console grid, dashed pixel ring, scanlines, pass number |

Every frame is built as a **ring**: X crops profile pictures to a circle, so
nothing that matters sits outside the inscribed circle. The square corners
carry extra branding for when the file is posted as an image instead.

**Format B — Builder ID card** (1080×1350, exported at 2160×2700)

| Style | Look |
| --- | --- |
| `THE PASSPORT` | Cream document, guilloché wash, `ADMITTED` stamp, MRZ strip |
| `THE BOARDING PASS` | Ticket stub, perforation, barcode, yellow header rail |
| `THE POSTCARD` | Illustrated beach scrapbook — postage stamp, ribbon banner, road sign, surfboards, speech bubble, Goan bungalow, palms, scalloped photo ring, faux-QR + barcode, bottom hill band |

Fields: name, stack/role, and a **generated builder title** (`THE SHIPPER`,
`THE 3AM IDEA GUY`, …) that can be re-rolled or typed over.

### Randomness

Each upload picks a **random style and a fresh seed**. The seed drives the
builder title, the motto, the pass number (`HH-26-0241`), the stamp's rotation
and the barcode — so two people uploading the same photo get different cards.
`SHUFFLE THE LOOK` re-rolls into a *different* style, never the current one.
Seeds are deterministic (`lib/random.ts`), so a given seed always reproduces
the same graphic.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build
```

---

## The share flow

Two paths, chosen automatically:

**Phones — direct image attach.** If `navigator.canShare({ files })` is
supported, the PNG goes straight into the OS share sheet, so X opens with the
image already attached. The caption is also copied to the clipboard, because
some Android share targets drop the text.

**Desktop — link with a real preview.** The graphic is uploaded, the PNG lands
in the user's Downloads (ready to drag into the composer), and X opens at
`/intent/post` with the caption and a link to `/s/<id>`.

That share page carries `og:image` / `twitter:image` pointing at the graphic,
so the tweet preview shows the card rather than a blank thumbnail.

One wrinkle worth knowing: X crops `summary_large_image` previews to roughly
**1.91:1**, which would slice the ends off a 4:5 card or a square PFP. So the
client also composes a **1200×630 banner** (`lib/render/og.ts`) — the whole
graphic on a branded backdrop with the name, title, dates and `#FrameInGoa` —
and *that* is what the crawler is served. The full-resolution graphic is still
what gets downloaded and what the share page displays.

Caption (pre-filled, includes `#FrameInGoa`):

> My Hacker House Goa 2026 Builder ID is live. Turns out I'm the shipper.
> 28–31 Oct · Goa, India.
>
> Less noise. More building. #FrameInGoa

---

## Storage & deployment

Shared graphics need a public URL for the crawler to fetch. `lib/store.ts`
picks a backend automatically:

The stored graphic is a JPEG (it exists to be displayed and previewed); the
1200×630 banner is stored as PNG for crisp type.

| Condition | Backend | Notes |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` set | Vercel Blob | Use this in production |
| otherwise | Filesystem | `.data/frame-in-goa` locally, `/tmp` on Vercel |

**Deploying to Vercel:** create a Blob store and link it (that sets
`BLOB_READ_WRITE_TOKEN`). Without it the app still runs and still shares, but
serverless `/tmp` is per-instance and short-lived, so link previews will be
unreliable.

**Deploying anywhere with a disk:** no token needed. Set `SHARE_DIR` to a
writable path if you don't want `.data/`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | production | Enables the Vercel Blob backend |
| `NEXT_PUBLIC_SITE_URL` | no | Pins the origin used in OG tags. Derived from request headers when unset |
| `SHARE_DIR` | no | Override the filesystem store location |

Stored graphics expire after 30 days on the filesystem backend.

---

## How photos are handled

Real camera rolls, not pre-cropped avatars:

- **HEIC/HEIF** from iPhone — native decode where the browser supports it,
  otherwise a wasm fallback (`heic-to`) that is code-split and only fetched
  when someone actually picks a HEIC.
- **EXIF rotation** honoured via `createImageBitmap(…, { imageOrientation: 'from-image' })`.
- **Any aspect ratio** — portrait, landscape, square — cover-fitted without
  distortion into each layout's photo window.
- **Off-centre subjects** — drag the preview to reposition, pinch/scroll/slider
  to zoom. The drag maths uses the real photo window per layout
  (`lib/render/photoRect.ts`), so a pixel of finger travel moves the photo by a
  pixel.
- Originals are downscaled to a 2000px long edge on intake, which is what keeps
  every re-render instant.
- Paste from clipboard and drag-and-drop both work.

---

## Layout of the code

```
app/
  page.tsx              the studio (single client component)
  s/[id]/page.tsx       share landing + OG metadata
  api/share/route.ts    accepts the PNG + banner, returns a share URL
  api/img/[id]/route.ts serves a stored graphic (?v=og for the banner)
lib/
  brand.ts              palette, event copy, canvas font warm-up
  image.ts              HEIC / EXIF / downscale intake
  random.ts             seeded PRNG
  titles.ts             builder titles, mottos, pass numbers
  shareText.ts          the pre-filled caption (client-safe)
  site.ts               absolute-URL resolution (server-only)
  store.ts              Blob / filesystem storage
  render/
    index.ts            paint + export entry point
    frames.ts           Format A — the three PFP frames
    cards.ts            Format B — the three ID cards
    og.ts               the 1200×630 link-preview banner
    primitives.ts       duotone, halftone, arc text, barcode, MRZ, grain…
    photoRect.ts        photo window per layout, for accurate panning
```

Everything renders in the browser on a 2D canvas — there is no server-side
image pipeline, which is why upload-to-result is roughly a second. The
renderers draw in a fixed design space (1080 wide) and the context is scaled
once, so the same code paints a 300px phone preview and a 2160px export.

### Fonts

`Bodoni Moda` (display), `IBM Plex Mono` (labels/data), `Silkscreen` (pixel
accents), `Yatra One` (`गोवा`) — self-hosted via `next/font`. Canvas silently
falls back to a default face if a webfont hasn't been used yet, so
`ensureFontsReady()` warms every family and weight before the first paint.

---

## Brand notes

Palette lives in one place (`lib/brand.ts` + `app/globals.css`):

| | |
| --- | --- |
| Deep green | `#08381F` · `#0F2E1D` · `#0B6839` |
| Cream | `#FAF0D7` |
| Acid yellow | `#FEE101` |
| Hot pink | `#FF007A` |

Recurring motifs: the `✦` sparkle, the `गोवा` Devanagari mark, halftone dot
fields, ticket perforations, barcodes, `28—31 OCT 2026 · GOA, INDIA`, and
*Less noise. More building.*
