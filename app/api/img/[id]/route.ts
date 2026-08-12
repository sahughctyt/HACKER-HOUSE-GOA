import { NextResponse } from 'next/server';
import { contentType, readShare } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = new URL(req.url).searchParams.get('v') === 'og' ? 'og' : 'full';
  const hit = await readShare(id, variant);
  if (!hit) return new NextResponse('Not found', { status: 404 });

  if (hit.kind === 'redirect') {
    // Blob storage serves the bytes; send the crawler straight there.
    return NextResponse.redirect(hit.url, 307);
  }

  return new NextResponse(new Uint8Array(hit.body), {
    headers: {
      'Content-Type': contentType(variant),
      'Content-Length': String(hit.body.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
