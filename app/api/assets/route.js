import { guard, validId } from '@/lib/server/auth';
import { deletePath, listAll, putAsset } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function GET(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const folder = new URL(req.url).searchParams.get('folder');
  if (!validId(folder)) return Response.json({ error: 'Pasta inválida.' }, { status: 400 });
  const blobs = await listAll(`assets/${folder}/`);
  const assets = blobs
    .map((b) => ({ pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  return Response.json({ assets });
}

export async function POST(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const form = await req.formData();
  const folder = form.get('folder');
  const file = form.get('file');
  if (!validId(folder)) return Response.json({ error: 'Pasta inválida.' }, { status: 400 });
  if (!file || typeof file === 'string') return Response.json({ error: 'Arquivo ausente.' }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return Response.json({ error: 'Use JPG, PNG ou WebP.' }, { status: 415 });
  if (file.size > 4.3 * 1024 * 1024) return Response.json({ error: 'Arquivo acima de 4 MB.' }, { status: 413 });
  const base = String(file.name || 'imagem')
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'imagem';
  const blob = await putAsset(`assets/${folder}/${base}.${ext}`, file, file.type);
  return Response.json({ asset: { pathname: blob.pathname, size: file.size, uploadedAt: new Date().toISOString() } });
}

export async function DELETE(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const p = new URL(req.url).searchParams.get('p');
  if (!p || !/^assets\/[a-z0-9-]+\/[^/]+$/i.test(p)) {
    return Response.json({ error: 'Caminho inválido.' }, { status: 400 });
  }
  await deletePath(p);
  return Response.json({ ok: true });
}
