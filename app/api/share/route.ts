import { NextResponse } from 'next/server';
import { newId, saveShare } from '@/lib/store';
import { originFromRequest } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  // Magic numbers — a cheap guard against anything else being posted here.
  const isPng = (b: Buffer) => b.length >= 8 && b.readUInt32BE(0) === 0x89504e47;
  const isJpeg = (b: Buffer) =>
    b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

  const readImage = async (
    value: FormDataEntryValue | null,
    allow: readonly string[]
  ) => {
    if (!(value instanceof File)) return null;
    if (value.size > MAX_BYTES) throw new Response(null, { status: 413 });
    if (value.type && !allow.includes(value.type)) throw new Response(null, { status: 415 });
    const buf = Buffer.from(await value.arrayBuffer());
    const ok = (allow.includes('image/png') && isPng(buf)) ||
      (allow.includes('image/jpeg') && isJpeg(buf));
    if (!ok) throw new Response(null, { status: 415 });
    return buf;
  };

  let buf: Buffer | null;
  let ogBuf: Buffer | null;
  try {
    buf = await readImage(form.get('image'), ['image/png', 'image/jpeg']);
    ogBuf = await readImage(form.get('og'), ['image/png']);
  } catch (r) {
    const status = r instanceof Response ? r.status : 400;
    return NextResponse.json(
      { error: status === 413 ? 'Image too large.' : 'Expected a PNG or JPEG.' },
      { status }
    );
  }
  if (!buf) return NextResponse.json({ error: 'Missing image.' }, { status: 400 });

  const id = newId();
  try {
    await saveShare(id, buf);
    if (ogBuf) await saveShare(id, ogBuf, 'og');
  } catch (err) {
    console.error('share save failed', err);
    return NextResponse.json({ error: 'Could not save the graphic.' }, { status: 500 });
  }

  const origin = originFromRequest(req);
  const format = form.get('format') === 'frame' ? 'frame' : 'card';
  const name = String(form.get('name') || '').slice(0, 40);
  const title = String(form.get('title') || '').slice(0, 40);
  const q = new URLSearchParams();
  if (name) q.set('n', name);
  if (title) q.set('t', title);
  q.set('f', format);
  if (ogBuf) q.set('b', '1');

  return NextResponse.json({
    id,
    url: `${origin}/s/${id}?${q.toString()}`,
    imageUrl: `${origin}/api/img/${id}`,
  });
}
