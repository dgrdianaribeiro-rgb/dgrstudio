import { guard } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// Fontshare (Indian Type Foundry) fonts are free for personal and commercial use.
// The catalog is fetched server-side and font files are proxied so they can be
// embedded in exported images (same-origin, no CORS surprises).

const API = 'https://api.fontshare.com/v2/fonts';
const CAT = (c) => {
  const s = String(c || '').toLowerCase();
  if (s.includes('hand') || s.includes('script')) return 'script';
  if (s.startsWith('serif') || s.includes('slab')) return 'serif';
  if (s.includes('display')) return 'display';
  return 'sans';
};

let memo = null;
let memoAt = 0;

async function loadCatalog() {
  if (memo && Date.now() - memoAt < 6 * 3600 * 1000) return memo;
  const fonts = [];
  let offset = 0;
  for (let guardLoop = 0; guardLoop < 20; guardLoop++) {
    const res = await fetch(`${API}?limit=100&offset=${offset}`, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Fontshare ${res.status}`);
    const data = await res.json();
    const batch = Array.isArray(data.fonts) ? data.fonts : [];
    fonts.push(...batch);
    if (!data.has_more || !batch.length) break;
    offset += batch.length;
  }
  const seen = new Set();
  const out = [];
  for (const f of fonts) {
    if (!f?.slug || seen.has(f.slug)) continue;
    seen.add(f.slug);
    const files = {};
    for (const st of f.styles || []) {
      if (st.is_variable) continue;
      const w = Number(st.weight?.number ?? st.weight?.weight);
      if (!w || !st.file) continue;
      const key = `${w}-${st.is_italic ? 'italic' : 'normal'}`;
      if (!files[key]) files[key] = st.file.startsWith('//') ? 'https:' + st.file : st.file;
    }
    const weights = [...new Set(Object.keys(files).filter((k) => k.endsWith('normal')).map((k) => Number(k.split('-')[0])))].sort((a, b) => a - b);
    if (!weights.length) continue;
    out.push({ name: f.name, slug: f.slug, cat: CAT(f.category), w: weights, files });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  memo = out;
  memoAt = Date.now();
  return out;
}

export async function GET(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const sp = new URL(req.url).searchParams;
  const file = sp.get('file');

  if (file) {
    let url;
    try {
      url = new URL(file);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (url.protocol !== 'https:' || url.hostname !== 'cdn.fontshare.com') return new Response('Forbidden', { status: 403 });
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return new Response('Not found', { status: 404 });
    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'font/woff2',
        'Cache-Control': 'private, max-age=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  try {
    const fonts = await loadCatalog();
    return Response.json({ fonts }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch (e) {
    return Response.json({ fonts: [], error: 'Catálogo do Fontshare indisponível no momento.' }, { status: 200 });
  }
}
