import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EVENT } from '@/lib/brand';
import { siteOrigin } from '@/lib/site';
import { isValidId, shareExists } from '@/lib/store';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ n?: string; t?: string; f?: string; b?: string }>;
};

/**
 * The whole point of this page: give X's crawler an absolute og:image that
 * resolves to the graphic the user just made, so the tweet preview is the card
 * itself rather than a default thumbnail.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const origin = await siteOrigin();

  // Prefer the 1200×630 banner: X crops summary_large_image to about 1.91:1,
  // which would slice the ends off a 4:5 card or a square PFP.
  const hasBanner = sp.b === '1';
  const image = hasBanner ? `${origin}/api/img/${id}?v=og` : `${origin}/api/img/${id}`;

  const who = (sp.n || '').slice(0, 40).trim();
  const klass = (sp.t || '').slice(0, 40).trim();
  const isFrame = sp.f === 'frame';

  const title = who
    ? `${who} — ${klass || 'Builder'} · Hacker House Goa 2026`
    : isFrame
      ? 'Framed for Hacker House Goa 2026'
      : 'Hacker House Goa 2026 Builder ID';

  return {
    title,
    description: `${EVENT.dates} · ${EVENT.place}. ${EVENT.tagline} Make yours at Frame in Goa.`,
    openGraph: {
      title,
      description: `${EVENT.dates} · ${EVENT.place}. ${EVENT.tagline}`,
      images: [
        hasBanner
          ? { url: image, width: 1200, height: 630 }
          : { url: image, width: 2160, height: isFrame ? 2160 : 2700 },
      ],
      type: 'website',
      url: `${origin}/s/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `${EVENT.dates} · ${EVENT.place}. ${EVENT.tagline}`,
      images: [image],
    },
  };
}

export default async function SharePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isValidId(id) || !(await shareExists(id))) notFound();

  const who = (sp.n || '').slice(0, 40).trim();
  const klass = (sp.t || '').slice(0, 40).trim();

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

      <div className="share-page">
        <h1 className="serif">{who ? who : 'Locked in.'}</h1>
        <div className="sub">
          {klass ? `${klass} · ` : ''}
          {EVENT.dates}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/img/${id}`} alt={`${who || 'Builder'} — Hacker House Goa 2026`} />

        <div className="actions" style={{ maxWidth: 420, margin: '0 auto' }}>
          <a className="btn btn-primary" href={`/api/img/${id}`} download={`hh-goa-2026-${id}.jpg`}>
            ↓ DOWNLOAD
          </a>
          <Link className="btn btn-ghost" href="/">
            ✦ MAKE YOURS
          </Link>
        </div>

        <p className="note">
          {EVENT.tagline} · {EVENT.hashtag}
        </p>
      </div>
    </>
  );
}
