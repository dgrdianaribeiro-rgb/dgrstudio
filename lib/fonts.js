// Curated Google Fonts with weights known to exist (css2 rejects missing weights).
export const FONTS = [
  { name: 'Inter', w: [400, 500, 600, 700, 800, 900], cat: 'sans' },
  { name: 'DM Sans', w: [400, 500, 600, 700, 800, 900], cat: 'sans' },
  { name: 'Manrope', w: [400, 500, 600, 700, 800], cat: 'sans' },
  { name: 'Plus Jakarta Sans', w: [400, 500, 600, 700, 800], cat: 'sans' },
  { name: 'Montserrat', w: [400, 500, 600, 700, 800, 900], cat: 'sans' },
  { name: 'Poppins', w: [400, 500, 600, 700, 800, 900], cat: 'sans' },
  { name: 'Outfit', w: [400, 500, 600, 700, 800, 900], cat: 'sans' },
  { name: 'Sora', w: [400, 500, 600, 700, 800], cat: 'sans' },
  { name: 'Archivo', w: [400, 500, 600, 700, 800, 900], cat: 'sans' },
  { name: 'Space Grotesk', w: [400, 500, 600, 700], cat: 'sans' },
  { name: 'Bricolage Grotesque', w: [400, 500, 600, 700, 800], cat: 'sans' },
  { name: 'Syne', w: [400, 500, 600, 700, 800], cat: 'sans' },
  { name: 'Unbounded', w: [400, 500, 600, 700, 800, 900], cat: 'display' },
  { name: 'Bebas Neue', w: [400], cat: 'display' },
  { name: 'Anton', w: [400], cat: 'display' },
  { name: 'Fraunces', w: [400, 500, 600, 700, 800, 900], cat: 'serif' },
  { name: 'Playfair Display', w: [400, 500, 600, 700, 800, 900], cat: 'serif' },
  { name: 'Cormorant Garamond', w: [400, 500, 600, 700], cat: 'serif' },
  { name: 'Lora', w: [400, 500, 600, 700], cat: 'serif' },
  { name: 'Libre Baskerville', w: [400, 700], cat: 'serif' },
  { name: 'DM Serif Display', w: [400], cat: 'serif' },
  { name: 'Instrument Serif', w: [400], cat: 'serif' },
];

/* ---------- custom (uploaded) fonts ---------- */
// Each entry: { id, family, weight, style, cat, pathname, format }
let CUSTOM = [];
const listeners = new Set();

export function setCustomFonts(list) {
  CUSTOM = Array.isArray(list) ? list : [];
  injectCustomFaces();
  listeners.forEach((fn) => fn(CUSTOM));
}
export function getCustomFonts() {
  return CUSTOM;
}
export function onCustomFonts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** One entry per uploaded family, in the same shape as FONTS. */
export function customFamilies() {
  const map = new Map();
  for (const f of CUSTOM) {
    const cur = map.get(f.family) || { name: f.family, w: [], cat: f.cat || 'sans', custom: true };
    if (!cur.w.includes(f.weight)) cur.w.push(f.weight);
    map.set(f.family, cur);
  }
  return [...map.values()].map((f) => ({ ...f, w: f.w.sort((a, b) => a - b) })).sort((a, b) => a.name.localeCompare(b.name));
}

export function allFonts() {
  return [...customFamilies(), ...FONTS];
}

const isCustom = (name) => CUSTOM.some((f) => f.family === name);

const fontFileUrl = (p) => `/api/file?p=${encodeURIComponent(p)}`;
const FORMAT = { woff2: 'woff2', woff: 'woff', otf: 'opentype', ttf: 'truetype' };

function faceRule(f, src) {
  const fmt = FORMAT[f.format] || 'opentype';
  return `@font-face{font-family:'${f.family.replace(/'/g, "\\'")}';src:url(${src}) format('${fmt}');font-weight:${f.weight};font-style:${f.style === 'italic' ? 'italic' : 'normal'};font-display:block;}`;
}

function injectCustomFaces() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('custom-font-faces');
  if (!el) {
    el = document.createElement('style');
    el.id = 'custom-font-faces';
    document.head.appendChild(el);
  }
  el.textContent = CUSTOM.map((f) => faceRule(f, fontFileUrl(f.pathname))).join('\n');
}

export function fontSpec(name) {
  return customFamilies().find((f) => f.name === name) || FONTS.find((f) => f.name === name) || FONTS[0];
}

export function fontStack(name) {
  const f = fontSpec(name);
  const fallback = f.cat === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif';
  return `'${f.name}', ${fallback}`;
}

export function nearestWeight(name, wanted) {
  const ws = fontSpec(name).w;
  return ws.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), ws[0]);
}

export function cssUrl(names) {
  const uniq = [...new Set(names.filter((n) => n && !isCustom(n)))]
    .map((n) => FONTS.find((f) => f.name === n))
    .filter(Boolean);
  if (!uniq.length) return null;
  const fam = uniq.map((f) => `family=${f.name.replace(/ /g, '+')}:wght@${f.w.join(';')}`).join('&');
  return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}

export function ensureFontLink(names, id = 'client-fonts') {
  if (typeof document === 'undefined') return;
  const href = cssUrl(names);
  let link = document.getElementById(id);
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
}

export function loadAllFontsForPicker() {
  ensureFontLink(FONTS.map((f) => f.name), 'picker-fonts');
}

/** Waits until the given families (all weights in use) are ready to draw. */
export async function waitForFamilies(names) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const loads = [];
  for (const n of new Set(names.filter(Boolean))) {
    for (const w of fontSpec(n).w) loads.push(document.fonts.load(`${w} 40px '${n}'`).catch(() => {}));
  }
  await Promise.all(loads);
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const embedCache = new Map();

async function googleEmbed(url) {
  const css = await (await fetch(url)).text();
  const tagged = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  let blocks = tagged.filter((m) => m[1] === 'latin' || m[1] === 'latin-ext').map((m) => m[2]);
  if (!blocks.length) blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  const out = await Promise.all(
    blocks.map(async (block) => {
      const m = block.match(/url\(([^)]+)\)/);
      if (!m) return block;
      const src = m[1].replace(/["']/g, '');
      const data = await blobToDataURL(await (await fetch(src)).blob());
      return block.replace(m[0], `url(${data})`);
    })
  );
  return out.join('\n');
}

async function customEmbed(f) {
  const res = await fetch(fontFileUrl(f.pathname), { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Fonte ${f.family} indisponível`);
  return faceRule(f, await blobToDataURL(await res.blob()));
}

function cached(key, make) {
  if (embedCache.has(key)) return embedCache.get(key);
  const job = make();
  embedCache.set(key, job);
  job.catch(() => embedCache.delete(key));
  return job;
}

/** Builds @font-face CSS with every font inlined as data URLs, for image export. */
export async function getFontEmbedCSS(names) {
  const parts = [];
  const url = cssUrl(names);
  if (url) parts.push(cached(url, () => googleEmbed(url)).catch(() => ''));
  const wanted = new Set(names);
  for (const f of CUSTOM.filter((c) => wanted.has(c.family))) {
    parts.push(cached('custom:' + f.id, () => customEmbed(f)));
  }
  return (await Promise.all(parts)).join('\n');
}
