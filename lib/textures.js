import { alpha } from './color';

const cache = {};

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function grain() {
  if (cache.grain) return cache.grain;
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cache.grain = c.toDataURL('image/png');
  return cache.grain;
}

function paper() {
  if (cache.paper) return cache.paper;
  const small = makeCanvas(48);
  const sctx = small.getContext('2d');
  const simg = sctx.createImageData(48, 48);
  for (let i = 0; i < simg.data.length; i += 4) {
    const v = 205 + Math.random() * 50;
    simg.data[i] = v;
    simg.data[i + 1] = v;
    simg.data[i + 2] = v - 4;
    simg.data[i + 3] = 255;
  }
  sctx.putImageData(simg, 0, 0);
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  // a few fibers
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(120,110,95,0.10)';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 70; k++) {
    ctx.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.random() * 40 - 20, y + Math.random() * 40 - 20, x + Math.random() * 60 - 30, y + Math.random() * 60 - 30);
    ctx.stroke();
  }
  cache.paper = c.toDataURL('image/png');
  return cache.paper;
}

/** CSS for a full-strip texture overlay. */
export function textureStyle(type, opacity, ink) {
  if (typeof document === 'undefined') return null;
  const o = Number(opacity) || 0;
  switch (type) {
    case 'granulado':
      return { backgroundImage: `url(${grain()})`, backgroundSize: '256px 256px', opacity: o, mixBlendMode: 'overlay' };
    case 'papel':
      return { backgroundImage: `url(${paper()})`, backgroundSize: '512px 512px', opacity: Math.min(1, o * 1.6), mixBlendMode: 'multiply' };
    case 'pontilhado':
      return { backgroundImage: `radial-gradient(${alpha(ink, 1)} 1.7px, transparent 2.3px)`, backgroundSize: '18px 18px', opacity: o * 0.55 };
    case 'grade': {
      const c = alpha(ink, 1);
      return {
        backgroundImage: `linear-gradient(${c} 1.5px, transparent 1.5px), linear-gradient(90deg, ${c} 1.5px, transparent 1.5px)`,
        backgroundSize: '67.5px 67.5px',
        opacity: o * 0.45,
      };
    }
    case 'linhas':
      return {
        backgroundImage: `repeating-linear-gradient(135deg, ${alpha(ink, 1)} 0 1.5px, transparent 1.5px 20px)`,
        opacity: o * 0.4,
      };
    default:
      return null;
  }
}
