'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EVENT } from '@/lib/brand';
import { ensureFontsReady } from '@/lib/brand';
import { downloadBlob, isHeic, loadPhoto, slugify, type LoadedPhoto } from '@/lib/image';
import { newSeed } from '@/lib/random';
import { titleFor } from '@/lib/titles';
import { CARD_VARIANTS, type CardVariant } from '@/lib/render/cards';
import { FRAME_VARIANTS, type FrameVariant } from '@/lib/render/frames';
import { photoRect } from '@/lib/render/photoRect';
import { clamp, DEFAULT_PLACEMENT, type Placement } from '@/lib/render/primitives';
import {
  canvasToBlob,
  designSize,
  exportBlob,
  paint,
  renderToCanvas,
  type Design,
  type Format,
} from '@/lib/render';
import { PHOTO_FILTERS, type PhotoFilter } from '@/lib/render/filters';
import { ThreeDCardViewer } from '@/app/components/ThreeDCardViewer';
import { renderOgBanner } from '@/lib/render/og';
import { tweetText, xIntentUrl } from '@/lib/shareText';

const PREVIEW_MAX = 760;

export default function Page() {
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [format, setFormat] = useState<Format>('card');
  const [frameVariant, setFrameVariant] = useState<FrameVariant>('seal');
  const [cardVariant, setCardVariant] = useState<CardVariant>('badge');
  const [seed, setSeed] = useState('goa2026');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [title, setTitle] = useState(() => titleFor('goa2026'));
  const [socials, setSocials] = useState('');
  const [filter, setFilter] = useState<PhotoFilter>('normal');
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);

  const [decoding, setDecoding] = useState(false);
  const [working, setWorking] = useState<'' | 'download' | 'share'>('');
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [pasteKey, setPasteKey] = useState('Ctrl+V');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const design: Design = useMemo(
    () => ({ format, frameVariant, cardVariant, seed, name, role, title, placement, filter }),
    [format, frameVariant, cardVariant, seed, name, role, title, placement, filter]
  );

  /* ---------------- fonts ---------------- */
  useEffect(() => {
    let alive = true;
    ensureFontsReady().then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setPasteKey('⌘V');
  }, []);

  /* ---------------- preview painting ---------------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const { w: dw, h: dh } = designSize(format);
    const cssW = Math.min(stage.clientWidth || PREVIEW_MAX, PREVIEW_MAX);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pxW = Math.round(cssW * dpr);
    const pxH = Math.round((cssW * dh) / dw) * dpr === 0 ? 1 : Math.round(((cssW * dh) / dw) * dpr);

    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    canvas.style.aspectRatio = `${dw} / ${dh}`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    paint(ctx, design, photo?.bitmap ?? null, pxW);
  }, [design, photo, format]);

  useEffect(() => {
    if (!photo && !fontsReady) return;
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw, photo, fontsReady, viewMode]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* ---------------- photo intake ---------------- */
  const accept = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/') && !isHeic(file)) {
        setError('That looks like a non-image file. JPG, PNG, WEBP or HEIC please.');
        return;
      }
      setError('');
      setShareUrl('');
      setDecoding(true);
      try {
        const loaded = await loadPhoto(file);
        setPhoto(loaded);
        setPlacement(DEFAULT_PLACEMENT);
        // Every upload gets a fresh look — new seed, new layout, new title.
        const s = newSeed();
        setSeed(s);
        setTitle(titleFor(s));
        setCardVariant(CARD_VARIANTS[Math.floor(Math.random() * CARD_VARIANTS.length)].id);
        setFrameVariant(FRAME_VARIANTS[Math.floor(Math.random() * FRAME_VARIANTS.length)].id);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "We couldn't read that image. Try a JPG or PNG."
        );
      } finally {
        setDecoding(false);
      }
    },
    []
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) =>
        i.type.startsWith('image/')
      );
      if (item) accept(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [accept]);

  /* ---------------- drag to reposition ---------------- */
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !photo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = photoRect(format, frameVariant, cardVariant);
    const { w: designW } = designSize(format);
    const perCss = designW / canvas.getBoundingClientRect().width;

    // How far the image can travel before it stops covering the photo window.
    const scale = Math.max(rect.w / photo.width, rect.h / photo.height) * placement.zoom;
    const slackX = photo.width * scale - rect.w;
    const slackY = photo.height * scale - rect.h;

    const dx = (e.clientX - d.x) * perCss;
    const dy = (e.clientY - d.y) * perCss;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };

    setPlacement((p) => ({
      ...p,
      fx: slackX > 1 ? clamp(p.fx - dx / slackX, 0, 1) : p.fx,
      fy: slackY > 1 ? clamp(p.fy - dy / slackY, 0, 1) : p.fy,
    }));
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    setPlacement((p) => ({ ...p, zoom: clamp(p.zoom * (e.deltaY > 0 ? 0.94 : 1.06), 1, 3) }));
  };

  /* ---------------- shuffle ---------------- */
  const shuffle = () => {
    const s = newSeed();
    setSeed(s);
    setTitle(titleFor(s));
    if (format === 'card') {
      const others = CARD_VARIANTS.filter((v) => v.id !== cardVariant);
      setCardVariant(others[Math.floor(Math.random() * others.length)].id);
    } else {
      const others = FRAME_VARIANTS.filter((v) => v.id !== frameVariant);
      setFrameVariant(others[Math.floor(Math.random() * others.length)].id);
    }
    setShareUrl('');
  };

  const rerollTitle = () => {
    const s = newSeed();
    setTitle(titleFor(s));
  };

  /* ---------------- output ---------------- */
  const baseName = useMemo(() => {
    const who = slugify(name || 'builder');
    return format === 'frame'
      ? `hh-goa-2026-pfp-${who}`
      : `hh-goa-2026-builder-id-${who}`;
  }, [name, format]);

  const onDownload = async () => {
    if (!photo) return;
    setWorking('download');
    setError('');
    try {
      const { blob, ext } = await exportBlob(await renderToCanvas(design, photo.bitmap, 2));
      downloadBlob(blob, `${baseName}.${ext}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setWorking('');
    }
  };

  const caption = useMemo(
    () => tweetText({ name, title, format }),
    [name, title, format]
  );

  const onShare = async () => {
    if (!photo) return;
    setError('');
    setImageCopied(false);
    setWorking('share');

    // Popup blockers only allow windows opened during the click, so claim one
    // now and point it at the intent once the upload resolves.
    let popup: Window | null = null;
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      typeof navigator.share === 'function';

    try {
      const graphic = await renderToCanvas(design, photo.bitmap, 2);
      const { blob, ext } = await exportBlob(graphic);
      const fileName = `${baseName}.${ext}`;
      const file = new File([blob], fileName, {
        type: ext === 'png' ? 'image/png' : 'image/jpeg',
      });

      // Best path (phones): hand X the actual image via the OS share sheet —
      // this is the only path where "share" can attach a file directly, since
      // X's web composer (x.com/intent/post) has no attachment parameter at
      // all. It only ever accepts a link, which is why the other two paths
      // exist to get the photo there some other way.
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        try {
          await navigator.clipboard?.writeText(caption).catch(() => undefined);
        } catch {
          /* clipboard is a nicety, not a requirement */
        }
        try {
          await navigator.share({ files: [file], text: caption });
        } catch (shareErr) {
          // The user closing the OS share sheet throws AbortError — that's a
          // cancel, not a failure, so don't surface it as one.
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            setWorking('');
            return;
          }
          throw shareErr;
        }
        setWorking('');
        return;
      }

      // Desktop has no OS share sheet, so there is no API that can attach a
      // file to the tweet directly. Best available substitute: put the actual
      // image on the clipboard so it can be pasted straight into the compose
      // box (X's composer accepts pasted images as an attachment), while the
      // caption still arrives pre-filled via the intent URL.
      let copiedImage = false;
      try {
        if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          const clipBlob = ext === 'png' ? blob : await canvasToBlob(graphic, 'image/png');
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': clipBlob })]);
          copiedImage = true;
        }
      } catch {
        /* clipboard image support varies by browser — fall through to download */
      }
      setImageCopied(copiedImage);

      // Upload too, so the tweet's link preview renders the real graphic even
      // if the user doesn't paste the image in.
      popup = window.open('', '_blank');
      const form = new FormData();
      // The stored copy only has to look right on the share page, so send a
      // JPEG and keep the upload small.
      const stored = await canvasToBlob(graphic, 'image/jpeg', 0.9);
      form.append('image', new File([stored], 'graphic.jpg', { type: 'image/jpeg' }));
      form.append('format', format);
      if (name) form.append('name', name);
      if (title) form.append('title', title);

      // The banner is what the crawler shows; if it fails, the raw graphic
      // still works as an og:image, so never let it block the share.
      try {
        const banner = await renderOgBanner({ graphic, format, name, title });
        form.append('og', new File([banner], 'og.png', { type: 'image/png' }));
      } catch {
        /* fall back to the graphic itself */
      }

      const res = await fetch('/api/share', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed.');
      const data = (await res.json()) as { url: string };

      // Also drop the file in Downloads, in case the clipboard copy didn't
      // land (older Firefox, permission denied, etc.).
      downloadBlob(blob, fileName);
      setShareUrl(data.url);
      const intent = xIntentUrl(caption, data.url);
      if (popup) popup.location.href = intent;
      else window.open(intent, '_blank', 'noopener');
    } catch (e) {
      popup?.close();
      // Even if storage is unavailable, the user should still get a composer.
      setError(
        (e instanceof Error ? e.message : 'Share failed.') +
          ' — the image was downloaded, attach it to the post manually.'
      );
      window.open(xIntentUrl(caption), '_blank', 'noopener');
    } finally {
      setWorking('');
    }
  };

  const variants = format === 'frame' ? FRAME_VARIANTS : CARD_VARIANTS;
  const activeVariant = format === 'frame' ? frameVariant : cardVariant;
  const busy = decoding || working !== '';

  return (
    <>
      <header className="topbar">
        <div className="wordmark">
          Hacker House <span className="hindi">{EVENT.hindi}</span>
        </div>
        <div className="meta">
          {EVENT.dates}
          <br />
          {EVENT.place}
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <span>
          {EVENT.ticker.repeat(3)}
          {EVENT.ticker.repeat(3)}
        </span>
      </div>

      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">✦ BUILDER IDENTIFICATION SYSTEM</div>
          <h1>
            THIS IS YOUR
            <br />
            <em>HACKER HOUSE</em>
            <br />
            IDENTITY.
          </h1>
          <p>
            Drop a photo. Get an official HH Goa 2026 profile frame or Builder ID card in
            seconds. No login, no signup, no waiting room.
          </p>
        </section>

        <div className="cols">
          {/* ---------------- stage ---------------- */}
          <div className="stage-col">
            <div className="panel">
              <div className="stage-header">
                <h2>
                  <span className="step">
                    <b>01</b> PREVIEW & PHOTO
                  </span>
                </h2>
                {format === 'card' && (
                  <div className="mode-toggle-group">
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === '3d' ? 'active' : ''}`}
                      onClick={() => setViewMode('3d')}
                    >
                      3D CARD
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === '2d' ? 'active' : ''}`}
                      onClick={() => setViewMode('2d')}
                    >
                      2D CARD
                    </button>
                  </div>
                )}
              </div>

              <p className="hint">
                JPG, PNG, WEBP or iPhone HEIC. Drag the photo to reposition — no need to crop
                it first.
              </p>

              {!photo && format === 'card' && viewMode === '3d' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: 12, padding: '12px', fontSize: 12, fontWeight: 900 }}
                  onClick={() => fileRef.current?.click()}
                >
                  📷 UPLOAD YOUR PHOTO
                </button>
              )}

              {format === 'card' && viewMode === '3d' ? (
                <ThreeDCardViewer
                  design={design}
                  photo={photo}
                  onUploadClick={() => fileRef.current?.click()}
                />
              ) : (

                <div
                  ref={stageRef}
                  className={`stage${photo ? '' : ' empty'}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    accept(e.dataTransfer.files?.[0]);
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onWheel={onWheel}
                    aria-label="Your generated HH Goa 2026 graphic"
                  />
                  {!photo && (
                    <button
                      type="button"
                      className={`dropzone${dragOver ? ' over' : ''}`}
                      onClick={() => fileRef.current?.click()}
                    >
                      <span className="sparkle">✦</span>
                      <span className="big serif">Drop your photo</span>
                      <span className="small">
                        TAP TO UPLOAD · JPG / PNG / WEBP / HEIC
                        <br />
                        OR PASTE FROM CLIPBOARD
                      </span>
                    </button>
                  )}
                  {decoding && <div className="busy">DECODING PHOTO…</div>}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,.heic,.heif"
                hidden
                onChange={(e) => {
                  accept(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />

              {photo && (
                <div className="stage-tools">
                  <span>ZOOM</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={placement.zoom}
                    onChange={(e) =>
                      setPlacement((p) => ({ ...p, zoom: Number(e.target.value) }))
                    }
                    aria-label="Zoom"
                  />
                  <button
                    type="button"
                    className="reroll"
                    style={{ fontSize: 10, letterSpacing: '0.1em', padding: '6px 10px' }}
                    onClick={() => fileRef.current?.click()}
                  >
                    CHANGE
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- controls ---------------- */}
          <div>
            <div className="panel">
              <h2>
                <span className="step">
                  <b>02</b> FORMAT
                </span>
              </h2>
              <div className="tabs">
                <button
                  type="button"
                  className="tab"
                  aria-pressed={format === 'frame'}
                  onClick={() => {
                    setFormat('frame');
                    setShareUrl('');
                  }}
                >
                  <span className="t">PFP FRAME</span>
                  <span className="d">Ready-to-use X profile picture</span>
                </button>
                <button
                  type="button"
                  className="tab"
                  aria-pressed={format === 'card'}
                  onClick={() => {
                    setFormat('card');
                    setShareUrl('');
                  }}
                >
                  <span className="t">BUILDER ID</span>
                  <span className="d">Event badge to post</span>
                </button>
              </div>
            </div>

            <div className="panel">
              <h2>
                <span className="step">
                  <b>03</b> STYLE & FILTERS
                </span>
              </h2>
              <p className="hint">
                Choose card style and apply aesthetic photo filters.
              </p>
              <div className="styles">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="style-chip"
                    aria-pressed={activeVariant === v.id}
                    onClick={() => {
                      if (format === 'frame') setFrameVariant(v.id as FrameVariant);
                      else setCardVariant(v.id as CardVariant);
                      setShareUrl('');
                    }}
                  >
                    <span className="n">{v.label}</span>
                    <span className="b">{v.blurb}</span>
                  </button>
                ))}
              </div>

              {/* Photo Filter Selection */}
              <div className="filter-section">
                <label className="filter-label">
                  PHOTO FILTERS
                </label>
                <div className="filter-grid">
                  {PHOTO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`filter-btn ${filter === f.id ? 'active' : ''}`}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 12, padding: '12px' }}
                onClick={shuffle}
              >
                ⇄ SHUFFLE THE LOOK
              </button>
            </div>

            {format === 'card' && mounted && (
              <div className="panel" suppressHydrationWarning>
                <h2>
                  <span className="step">
                    <b>04</b> YOUR DETAILS
                  </span>
                </h2>
                <div className="fields" suppressHydrationWarning>
                  <div className="field" suppressHydrationWarning>
                    <label htmlFor="name">Name</label>
                    <input
                      id="name"
                      value={name}
                      maxLength={26}
                      placeholder="Dev Dubey"
                      autoComplete="off"
                      data-lpignore="true"
                      suppressHydrationWarning
                      onChange={(e) => {
                        setName(e.target.value);
                        setShareUrl('');
                      }}
                    />
                  </div>
                  <div className="field" suppressHydrationWarning>
                    <label htmlFor="role">Stack / Role</label>
                    <input
                      id="role"
                      value={role}
                      maxLength={28}
                      placeholder="AI / Fullstack"
                      autoComplete="off"
                      data-lpignore="true"
                      suppressHydrationWarning
                      onChange={(e) => {
                        setRole(e.target.value);
                        setShareUrl('');
                      }}
                    />
                  </div>
                  <div className="field" suppressHydrationWarning>
                    <label htmlFor="title">Builder title</label>
                    <div className="with-btn" suppressHydrationWarning>
                      <input
                        id="title"
                        value={title}
                        maxLength={26}
                        autoComplete="off"
                        data-lpignore="true"
                        suppressHydrationWarning
                        onChange={(e) => {
                          setTitle(e.target.value.toUpperCase());
                          setShareUrl('');
                        }}
                      />
                      <button
                        type="button"
                        className="reroll"
                        onClick={rerollTitle}
                        aria-label="Roll a new builder title"
                        title="Roll a new builder title"
                      >
                        🎲
                      </button>
                    </div>
                  </div>
                  <div className="field" suppressHydrationWarning>
                    <label htmlFor="socials">Socials link</label>
                    <input
                      id="socials"
                      value={socials}
                      placeholder="https://x.com/yourhandle"
                      autoComplete="off"
                      data-lpignore="true"
                      suppressHydrationWarning
                      onChange={(e) => {
                        setSocials(e.target.value);
                        setShareUrl('');
                      }}
                    />
                  </div>
                </div>

              </div>
            )}

            <div className="panel">
              <h2>
                <span className="step">
                  <b>{format === 'card' ? '05' : '04'}</b> SHIP IT
                </span>
              </h2>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!photo || busy}
                  onClick={onDownload}
                >
                  {working === 'download' ? 'RENDERING…' : '↓ DOWNLOAD IMAGE'}
                </button>
                <button
                  type="button"
                  className="btn btn-x"
                  disabled={!photo || busy}
                  onClick={onShare}
                >
                  {working === 'share' ? 'PREPARING…' : '𝕏  SHARE TO X'}
                </button>
              </div>
              <p className="note">
                Caption is pre-filled with {EVENT.hashtag}. On phones the image is attached
                straight to the post. On desktop, X&apos;s composer can&apos;t accept an
                attachment via link — so the photo is copied to your clipboard, ready to paste
                ({pasteKey}) into the post, and also saved to your downloads as a backup.
              </p>

              {imageCopied && (
                <p className="note note-highlight">
                  ✦ Image copied — paste it into the post that just opened.
                </p>
              )}

              {shareUrl && (
                <div className="shared-link">
                  <code>{shareUrl.split('?')[0]}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                  >
                    {copied ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              )}

              {error && <div className="error">{error}</div>}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="hindi">{EVENT.hindi}</div>
        {EVENT.tagline}
        <br />
        HACKER HOUSE GOA 2026 · {EVENT.dates} · {EVENT.place} · {EVENT.hashtag}
      </footer>

      {/* Mobile only: keeps Download/Share reachable right under the
          preview instead of at the bottom of a long scroll. */}
      {photo && (
        <div className="mobile-actions" role="toolbar" aria-label="Download or share">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onDownload}>
            {working === 'download' ? 'RENDERING…' : '↓ DOWNLOAD'}
          </button>
          <button type="button" className="btn btn-x" disabled={busy} onClick={onShare}>
            {working === 'share' ? 'PREPARING…' : '𝕏  SHARE'}
          </button>
        </div>
      )}
    </>
  );
}
