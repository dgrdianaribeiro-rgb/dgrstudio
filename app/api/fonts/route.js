import { guard, validId } from '@/lib/server/auth';
import { deletePath, deletePrefix, putAsset, readCollection, readJSON, writeJSON } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

const TYPES = { woff2: 'font/woff2', woff: 'font/woff', otf: 'font/otf', ttf: 'font/ttf' };
const CATS = ['sans', 'serif', 'display'];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function cleanFamily(v) {
  return String(v || '').replace(/['"\\;{}<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export async function GET(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const fonts = await readCollection('data/fonts/');
  fonts.sort((a, b) => a.family.localeCompare(b.family) || a.weight - b.weight);
  return Response.json({ fonts });
}

export async function POST(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const form = await req.formData();
  const file = form.get('file');
  const id = String(form.get('id') || '');
  const family = cleanFamily(form.get('family'));
  const weight = Number(form.get('weight'));
  const style = form.get('style') === 'italic' ? 'italic' : 'normal';
  const cat = CATS.includes(form.get('cat')) ? form.get('cat') : 'sans';
  if (!validId(id)) return Response.json({ error: 'ID inválido.' }, { status: 400 });
  if (!family) return Response.json({ error: 'Informe o nome da família.' }, { status: 400 });
  if (!WEIGHTS.includes(weight)) return Response.json({ error: 'Peso inválido.' }, { status: 400 });
  if (!file || typeof file === 'string') return Response.json({ error: 'Arquivo ausente.' }, { status: 400 });
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (!TYPES[ext]) return Response.json({ error: `${file.name}: use .otf, .ttf, .woff ou .woff2.` }, { status: 415 });
  if (file.size > 4.3 * 1024 * 1024) return Response.json({ error: `${file.name}: arquivo acima de 4 MB.` }, { status: 413 });

  const slug = `${family}-${weight}${style === 'italic' ? '-italic' : ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const blob = await putAsset(`fonts/${slug}.${ext}`, file, TYPES[ext]);
  const font = { id, family, weight, style, cat, format: ext, pathname: blob.pathname, original: String(file.name).slice(0, 120), uploadedAt: Date.now() };
  await writeJSON(`data/fonts/${id}.json`, font);
  return Response.json({ font });
}

/** Rename a family, change category, or fix a weight/style without re-uploading. */
export async function PATCH(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  if (!validId(body.id)) return Response.json({ error: 'ID inválido.' }, { status: 400 });
  const font = await readJSON(`data/fonts/${body.id}.json`);
  if (!font) return Response.json({ error: 'Fonte não encontrada.' }, { status: 404 });
  if (body.family !== undefined) {
    const fam = cleanFamily(body.family);
    if (!fam) return Response.json({ error: 'Nome inválido.' }, { status: 400 });
    font.family = fam;
  }
  if (body.weight !== undefined && WEIGHTS.includes(Number(body.weight))) font.weight = Number(body.weight);
  if (body.style !== undefined) font.style = body.style === 'italic' ? 'italic' : 'normal';
  if (body.cat !== undefined && CATS.includes(body.cat)) font.cat = body.cat;
  await writeJSON(`data/fonts/${font.id}.json`, font);
  return Response.json({ font });
}

export async function DELETE(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const id = new URL(req.url).searchParams.get('id');
  if (!validId(id)) return Response.json({ error: 'ID inválido.' }, { status: 400 });
  const font = await readJSON(`data/fonts/${id}.json`);
  if (font?.pathname) await deletePath(font.pathname).catch(() => {});
  await deletePrefix(`data/fonts/${id}.json`);
  return Response.json({ ok: true });
}
