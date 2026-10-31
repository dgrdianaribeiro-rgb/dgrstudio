import { toCanvas } from 'html-to-image';
import JSZip from 'jszip';
import { PAGE_H as H, PAGE_W as W } from './catalog';

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))), 'image/png')
  );
}

export async function waitForImages(node) {
  const imgs = [...node.querySelectorAll('img')];
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          })
    )
  );
}

/** Renders each 1080×1350 page of the strip separately (safe for every browser's canvas limits). */
export async function renderPages(node, count, fontEmbedCSS, onProgress) {
  const total = W * count;
  const base = { width: W, height: H, pixelRatio: 1, fontEmbedCSS, cacheBust: false, backgroundColor: null };
  const opts = (i) => ({ ...base, style: { width: `${total}px`, height: `${H}px`, transform: `translateX(${-i * W}px)`, transformOrigin: '0 0' } });
  // warm-up pass: some browsers only paint embedded images on the second render
  await toCanvas(node, opts(0)).catch(() => {});
  const blobs = [];
  for (let i = 0; i < count; i++) {
    onProgress?.(i + 1, count);
    const canvas = await toCanvas(node, opts(i));
    blobs.push(await canvasToBlob(canvas));
  }
  return blobs;
}

export async function renderStrip(node, count, fontEmbedCSS) {
  const total = W * count;
  const opts = { width: total, height: H, pixelRatio: 1, fontEmbedCSS, cacheBust: false };
  await toCanvas(node, opts).catch(() => {});
  return canvasToBlob(await toCanvas(node, opts));
}

export function slugify(s) {
  return (
    String(s || 'post')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 50) || 'post'
  );
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function zipPages(blobs, base) {
  const zip = new JSZip();
  blobs.forEach((b, i) => zip.file(`${base}-${String(i + 1).padStart(2, '0')}.png`, b));
  return zip.generateAsync({ type: 'blob' });
}

/** Client-side downscale so uploads stay under the serverless body limit. */
export async function prepareImage(file) {
  const okTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!okTypes.includes(file.type)) throw new Error(`${file.name}: use JPG, PNG ou WebP.`);
  const MAX = 2400;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const big = Math.max(bmp.width, bmp.height) > MAX;
  if (!big && file.size < 3.8 * 1024 * 1024) return file;
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  const blob = await new Promise((r) => c.toBlob(r, type, 0.9));
  const ext = type === 'image/jpeg' ? 'jpg' : 'webp';
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type });
}
