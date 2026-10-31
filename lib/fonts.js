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

export function fontSpec(name) {
  return FONTS.find((f) => f.name === name) || FONTS[0];
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
  const uniq = [...new Set(names.filter(Boolean))].map(fontSpec);
  const fam = uniq
    .map((f) => `family=${f.name.replace(/ /g, '+')}:wght@${f.w.join(';')}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}

export function ensureFontLink(names, id = 'client-fonts') {
  if (typeof document === 'undefined') return;
  const href = cssUrl(names);
  let link = document.getElementById(id);
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

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const embedCache = new Map();

/** Builds @font-face CSS with fonts inlined as data URLs (latin subsets only) for image export. */
export function getFontEmbedCSS(names) {
  const url = cssUrl(names);
  if (embedCache.has(url)) return embedCache.get(url);
  const job = (async () => {
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
  })();
  embedCache.set(url, job);
  job.catch(() => embedCache.delete(url));
  return job;
}
