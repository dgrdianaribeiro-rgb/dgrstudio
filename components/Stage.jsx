'use client';
import React from 'react';
import { PAGE_H as H, PAGE_W as W } from '@/lib/catalog';
import { alpha, bestOn, contrast, mix } from '@/lib/color';
import { fontSpec, fontStack, nearestWeight } from '@/lib/fonts';
import { textureStyle } from '@/lib/textures';

export const fileUrl = (p) => `/api/file?p=${encodeURIComponent(p)}`;

/* ---------- color context per page ---------- */
function pageColors(pg, client, index, total) {
  const p = client.palette;
  let bg = p.bg;
  let bgCss = p.bg;
  switch (pg.bg) {
    case 'surface': bg = p.surface; bgCss = bg; break;
    case 'primary': bg = p.primary; bgCss = bg; break;
    case 'accent': bg = p.accent; bgCss = bg; break;
    case 'dark': bg = p.dark; bgCss = bg; break;
    case 'gradient':
      bg = mix(p.primary, p.dark, 0.45);
      bgCss = `linear-gradient(160deg, ${p.primary} 0%, ${mix(p.primary, p.dark, 0.55)} 55%, ${p.dark} 100%)`;
      break;
    case 'continuous': {
      const t = total > 1 ? (index + 0.5) / total : 0.5;
      bg = t < 0.5 ? mix(p.primary, p.accent, t * 2) : mix(p.accent, p.dark, (t - 0.5) * 2);
      bgCss = null; // handled with strip-wide background
      break;
    }
    case 'image': bg = p.dark; bgCss = p.dark; break;
    default: break;
  }
  const ink = bestOn(bg, [p.ink, p.bg, p.surface]);
  let hl = p.accent;
  if (contrast(bg, hl) < 2.2) hl = contrast(bg, p.primary) >= 2.2 && pg.bg !== 'primary' ? p.primary : ink;
  const onHl = bestOn(hl, [p.ink, p.bg, p.dark, '#ffffff']);
  return { bg, bgCss, ink, hl, onHl, muted: alpha(ink, 0.74), line: alpha(ink, 0.18), soft: alpha(ink, 0.07) };
}

function lightOnDark(client) {
  const p = client.palette;
  const ink = bestOn(p.dark, [p.bg, p.surface, '#ffffff']);
  const hl = contrast(p.dark, p.accent) >= 2.2 ? p.accent : ink;
  return { bg: p.dark, ink, hl, onHl: bestOn(hl, [p.ink, p.bg, p.dark, '#ffffff']), muted: alpha(ink, 0.8), line: alpha(ink, 0.25), soft: alpha(ink, 0.1) };
}

/* ---------- text helpers ---------- */
function hlStyle(type, c) {
  switch (type) {
    case 'marca': return { backgroundImage: `linear-gradient(transparent 58%, ${alpha(c.hl, 0.9)} 58%, ${alpha(c.hl, 0.9)} 92%, transparent 92%)`, padding: '0 .06em', color: 'inherit' };
    case 'sublinhado': return { textDecoration: 'underline', textDecorationColor: c.hl, textDecorationThickness: '.09em', textUnderlineOffset: '.14em' };
    case 'italico': return { fontStyle: 'italic', color: c.hl };
    case 'caixa': return { background: c.hl, color: c.onHl, padding: '0 .14em', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' };
    default: return { color: c.hl };
  }
}

function Rich({ text, hl }) {
  const parts = String(text).split(/(\*[^*\n]+\*)/g);
  return parts.map((s, i) =>
    s.length > 2 && s.startsWith('*') && s.endsWith('*') ? (
      <span key={i} style={hl}>{s.slice(1, -1)}</span>
    ) : (
      <React.Fragment key={i}>{s}</React.Fragment>
    )
  );
}

function fit(text, base, scale = 1) {
  const n = String(text || '').replace(/\*/g, '').length;
  let f = 1;
  if (n > 150) f = 0.46;
  else if (n > 110) f = 0.54;
  else if (n > 75) f = 0.64;
  else if (n > 48) f = 0.76;
  else if (n > 26) f = 0.88;
  return Math.round(base * f * scale);
}

function T({ v, ph, ctx, style, as: Tag = 'div' }) {
  const has = v != null && String(v).trim() !== '';
  if (!has && ctx.mode !== 'edit') return null;
  if (!has) return <Tag className="ph" style={style}>{ph}</Tag>;
  return <Tag style={{ whiteSpace: 'pre-line', ...style }}><Rich text={v} hl={ctx.hl} /></Tag>;
}

function Img({ src, ctx, style, pos = 'center', label = 'Imagem' }) {
  if (src) {
    return (
      <img
        src={fileUrl(src)}
        alt=""
        crossOrigin="use-credentials"
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, display: 'block', ...style }}
      />
    );
  }
  if (ctx.mode !== 'edit') return <div style={{ width: '100%', height: '100%', background: ctx.c.soft, ...style }} />;
  return (
    <div className="ph-img" style={{ color: ctx.c.ink, ...style }}>
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
      <span>{label}</span>
    </div>
  );
}

/* ---------- layouts ---------- */
const PAD = { padding: '150px 96px 170px' };

function frame(pg, extra = {}) {
  const center = pg.align === 'center';
  const vmap = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
  return {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    textAlign: center ? 'center' : 'left',
    alignItems: center ? 'center' : 'flex-start',
    ...PAD,
    paddingBottom: pg._pb || 170,
    ...extra,
    ...(pg.valign ? { justifyContent: vmap[pg.valign] } : {}),
  };
}

function Kicker({ v, ctx }) {
  return (
    <T v={v} ph="Chamada" ctx={ctx} style={{
      display: 'inline-block', fontSize: 28, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 600,
      color: ctx.c.hl, border: `2.5px solid ${ctx.c.hl}`, padding: '12px 26px', borderRadius: 999, marginBottom: 44,
    }} />
  );
}

function headingStyle(ctx, size) {
  const display = fontSpec(ctx.client.fonts.heading).cat === 'display';
  return {
    fontFamily: ctx.fontH, fontWeight: ctx.weightH, fontSize: size,
    lineHeight: display ? 0.98 : 1.04, letterSpacing: display ? '0.005em' : '-0.022em',
    textTransform: display ? 'uppercase' : 'none',
  };
}

const L = {};

L.capa = ({ pg, f, ctx }) => (
  <div style={frame(pg, { justifyContent: 'flex-end' })}>
    <Kicker v={f.kicker} ctx={ctx} />
    <T v={f.title} ph="Título da capa" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Título da capa grande', 132, pg.scale)), maxWidth: 900 }} />
    <T v={f.subtitle} ph="Linha de apoio" ctx={ctx} style={{ fontSize: Math.round(40 * pg.scale), lineHeight: 1.4, color: ctx.c.muted, marginTop: 40, maxWidth: 820 }} />
  </div>
);

L['capa-foto'] = ({ pg, f, ctx, client }) => {
  const c = lightOnDark(client);
  const cx = { ...ctx, c, hl: hlStyle(ctx.effects.hlStyle, c) };
  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}><Img src={f.image} ctx={ctx} pos={f.imagePos} label="Foto de fundo" /></div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${alpha(client.palette.dark, 0.94)} 0%, ${alpha(client.palette.dark, 0.6)} 42%, ${alpha(client.palette.dark, 0)} 78%)` }} />
      <div style={{ ...frame(pg, { justifyContent: 'flex-end' }), color: c.ink }}>
        <Kicker v={f.kicker} ctx={cx} />
        <T v={f.title} ph="Título sobre a foto" ctx={cx} style={{ ...headingStyle(ctx, fit(f.title || 'Título sobre a foto', 120, pg.scale)), maxWidth: 900 }} />
        <T v={f.subtitle} ph="Linha de apoio" ctx={cx} style={{ fontSize: Math.round(38 * pg.scale), lineHeight: 1.4, color: c.muted, marginTop: 36, maxWidth: 820 }} />
      </div>
    </>
  );
};

L.topico = ({ pg, f, ctx }) => (
  <div style={frame(pg, { justifyContent: 'center' })}>
    <T v={f.number} ph={String(ctx.index + 1).padStart(2, '0')} ctx={ctx} style={{ ...headingStyle(ctx, 190), color: ctx.c.hl, lineHeight: 0.9, marginBottom: 48 }} />
    <T v={f.title} ph="Título do tópico" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Título do tópico', 86, pg.scale)), maxWidth: 900 }} />
    <div style={{ width: 120, height: 7, background: ctx.c.hl, borderRadius: 4, margin: '44px 0' }} />
    <T v={f.body} ph="Explique este ponto em poucas linhas." ctx={ctx} style={{ fontSize: Math.round(38 * pg.scale), lineHeight: 1.48, color: ctx.c.muted, maxWidth: 880 }} />
  </div>
);

L.lista = ({ pg, f, ctx }) => {
  const items = String(f.items || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const show = items.length ? items : ctx.mode === 'edit' ? ['Primeiro item', 'Segundo item', 'Terceiro item'] : [];
  const ph = !items.length;
  const size = Math.round((show.length > 4 ? 34 : 38) * pg.scale);
  return (
    <div style={frame(pg, { justifyContent: 'center', alignItems: 'stretch', textAlign: 'left' })}>
      <div style={{ textAlign: pg.align === 'center' ? 'center' : 'left' }}><Kicker v={f.kicker} ctx={ctx} /></div>
      <T v={f.title} ph="Título da lista" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Título da lista', 80, pg.scale)), marginBottom: 60, textAlign: pg.align === 'center' ? 'center' : 'left' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: show.length > 4 ? 26 : 34 }} className={ph ? 'ph' : ''}>
        {show.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 66px', height: 66, borderRadius: 999, background: ctx.c.hl, color: ctx.c.onHl, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ctx.fontH, fontWeight: 700, fontSize: 30 }}>{i + 1}</div>
            <div style={{ fontSize: size, lineHeight: 1.36, paddingTop: 8 }}><Rich text={it} hl={ctx.hl} /></div>
          </div>
        ))}
      </div>
    </div>
  );
};

L.citacao = ({ pg, f, ctx }) => (
  <div style={frame(pg, { justifyContent: 'center' })}>
    <div style={{ fontFamily: ctx.fontH, fontSize: 300, lineHeight: 1, height: 170, color: ctx.c.hl, fontWeight: 700 }}>“</div>
    <T v={f.quote} ph="A frase que merece destaque." ctx={ctx} style={{ fontFamily: ctx.fontH, fontWeight: Math.min(ctx.weightH, 600), fontSize: fit(f.quote || 'A frase que merece destaque aqui.', 78, pg.scale), lineHeight: 1.18, letterSpacing: '-0.01em', maxWidth: 900 }} />
    {(f.author || ctx.mode === 'edit') && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 56 }}>
        <div style={{ width: 64, height: 4, background: ctx.c.hl }} />
        <T v={f.author} ph="Autor" ctx={ctx} style={{ fontSize: 30, letterSpacing: '.12em', textTransform: 'uppercase', color: ctx.c.muted }} />
      </div>
    )}
  </div>
);

L.dado = ({ pg, f, ctx }) => {
  const num = f.number || '';
  const n = (num || '73%').length;
  const size = Math.round((n <= 4 ? 300 : n <= 6 ? 230 : 170) * pg.scale);
  return (
    <div style={frame(pg, { justifyContent: 'center' })}>
      <T v={num} ph="73%" ctx={ctx} style={{ ...headingStyle(ctx, size), color: ctx.c.hl, lineHeight: 0.88, letterSpacing: '-0.045em' }} />
      <T v={f.title} ph="O que esse número significa" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'O que esse número significa', 66, pg.scale)), marginTop: 40, maxWidth: 900 }} />
      <T v={f.body} ph="Contexto em uma ou duas frases." ctx={ctx} style={{ fontSize: Math.round(36 * pg.scale), lineHeight: 1.45, color: ctx.c.muted, marginTop: 30, maxWidth: 860 }} />
      <T v={f.source ? `Fonte: ${f.source}` : ''} ph="Fonte: pesquisa ou estudo" ctx={ctx} style={{ fontSize: 24, color: ctx.c.muted, marginTop: 56, letterSpacing: '.02em' }} />
    </div>
  );
};

L['foto-texto'] = ({ pg, f, ctx, client }) => (
  <div style={frame(pg, { justifyContent: 'flex-start', paddingTop: 130 })}>
    <div style={{ width: '100%', height: 620, borderRadius: client.radius ?? 28, overflow: 'hidden', marginBottom: 56, flex: '0 0 auto' }}>
      <Img src={f.image} ctx={ctx} pos={f.imagePos} />
    </div>
    <T v={f.title} ph="Título" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Título da página', 70, pg.scale)), maxWidth: 900 }} />
    <T v={f.body} ph="Texto de apoio." ctx={ctx} style={{ fontSize: Math.round(36 * pg.scale), lineHeight: 1.45, color: ctx.c.muted, marginTop: 28, maxWidth: 900 }} />
  </div>
);

L.comparativo = ({ pg, f, ctx, client }) => {
  const r = Math.min(client.radius ?? 28, 40);
  const size = Math.round(34 * pg.scale);
  return (
    <div style={frame(pg, { justifyContent: 'center', alignItems: 'stretch' })}>
      <T v={f.title} ph="Título do comparativo" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Título do comparativo', 72, pg.scale)), marginBottom: 60 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, textAlign: 'left' }}>
        <div style={{ background: ctx.c.soft, border: `2px solid ${ctx.c.line}`, borderRadius: r, padding: 46 }}>
          <T v={f.labelA} ph="Mito" ctx={ctx} style={{ fontSize: 28, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 22, color: ctx.c.muted }} />
          <T v={f.textA} ph="O que se costuma dizer." ctx={ctx} style={{ fontSize: size, lineHeight: 1.4 }} />
        </div>
        <div style={{ background: ctx.c.hl, color: ctx.c.onHl, borderRadius: r, padding: 46 }}>
          <T v={f.labelB} ph="Verdade" ctx={{ ...ctx, hl: { textDecoration: 'underline' } }} style={{ fontSize: 28, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 22 }} />
          <T v={f.textB} ph="O que a evidência mostra." ctx={{ ...ctx, hl: { textDecoration: 'underline' } }} style={{ fontSize: size, lineHeight: 1.4 }} />
        </div>
      </div>
    </div>
  );
};

L.texto = ({ pg, f, ctx }) => (
  <div style={frame(pg, { justifyContent: 'center' })}>
    <Kicker v={f.kicker} ctx={ctx} />
    <T v={f.title} ph="Título" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Título da página', 76, pg.scale)), maxWidth: 900 }} />
    <T v={f.body} ph="Desenvolva a ideia desta página com calma e clareza." ctx={ctx} style={{ fontSize: Math.round((String(f.body || '').length > 380 ? 32 : 38) * pg.scale), lineHeight: 1.52, color: ctx.c.muted, marginTop: 44, maxWidth: 900 }} />
  </div>
);

L['foto-inteira'] = ({ f, ctx, client }) => (
  <>
    <div style={{ position: 'absolute', inset: 0 }}><Img src={f.image} ctx={ctx} pos={f.imagePos} label="Foto inteira" /></div>
    {(f.caption || ctx.mode === 'edit') && (
      <div style={{ position: 'absolute', left: 72, right: 72, bottom: 150, display: 'flex' }}>
        <T v={f.caption} ph="Legenda curta" ctx={{ ...ctx, hl: {} }} style={{ background: alpha(client.palette.dark, 0.78), color: bestOn(client.palette.dark, [client.palette.bg, '#ffffff']), fontSize: 30, padding: '18px 30px', borderRadius: 999 }} />
      </div>
    )}
  </>
);

L.cta = ({ pg, f, ctx, client }) => (
  <div style={frame({ ...pg, align: pg.align || 'center' }, { justifyContent: 'center' })}>
    <T v={f.title} ph="Conclusão com força" ctx={ctx} style={{ ...headingStyle(ctx, fit(f.title || 'Conclusão com força', 96, pg.scale)), maxWidth: 900 }} />
    <T v={f.body} ph="Uma frase final que convide a agir." ctx={ctx} style={{ fontSize: Math.round(38 * pg.scale), lineHeight: 1.45, color: ctx.c.muted, marginTop: 36, maxWidth: 820 }} />
    <T v={f.cta} ph="Salve e compartilhe" ctx={{ ...ctx, hl: {} }} style={{ marginTop: 60, background: ctx.c.hl, color: ctx.c.onHl, fontSize: 34, fontWeight: 700, padding: '28px 58px', borderRadius: 999, letterSpacing: '.01em' }} />
    {client.logo && ctx.effects.logo !== 'off' && (
      <img src={fileUrl(client.logo)} alt="" crossOrigin="use-credentials" style={{ height: 96, marginTop: 70, objectFit: 'contain', maxWidth: 360 }} />
    )}
  </div>
);

/* ---------- strip-wide flow element ---------- */
const FLOW_PAD = { onda: 280, linha: 270, faixa: 320, circulos: 190 };
function Flow({ type, N, c1, c2 }) {
  const T = W * N;
  if (!type || type === 'nenhum') return null;
  let body = null;
  if (type === 'onda') {
    const mk = (y0, A, phase) => {
      let d = '';
      for (let x = -40; x <= T + 40; x += 18) {
        const y = y0 + A * Math.sin((2 * Math.PI * x) / (W * 1.3) + phase);
        d += (d ? ' L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return d;
    };
    body = (
      <>
        <path d={mk(H - 205, 46, 0)} stroke={c1} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d={mk(H - 168, 46, 0.9)} stroke={c2} strokeWidth="3" fill="none" opacity="0.7" />
      </>
    );
  } else if (type === 'linha') {
    const pts = [];
    const steps = N * 2;
    for (let i = 0; i <= steps; i++) pts.push([(i / steps) * T, i % 2 ? H - 120 : H - 230]);
    let d = `M ${pts[0][0] - 60} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    body = (
      <>
        <path d={d} stroke={c1} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx={pts[0][0] + 96} cy={pts[0][1] + 2} r="14" fill={c1} />
      </>
    );
  } else if (type === 'circulos') {
    const items = [];
    const seams = N > 1 ? N - 1 : 1;
    for (let i = 1; i <= seams; i++) {
      const cx = N > 1 ? i * W : W - 60;
      const cy = i % 2 ? 30 : H - 30;
      items.push(<circle key={'a' + i} cx={cx} cy={cy} r="230" stroke={c1} strokeWidth="5" fill="none" />);
      items.push(<circle key={'b' + i} cx={cx} cy={cy} r="64" fill={c1} />);
    }
    body = <>{items}</>;
  } else if (type === 'faixa') {
    body = <polygon points={`0,${H - 235} ${T},${H - 300} ${T},${H - 262} 0,${H - 197}`} fill={c1} />;
  }
  return (
    <svg width={T} height={H} viewBox={`0 0 ${T} ${H}`} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {body}
    </svg>
  );
}

/* ---------- overlays ---------- */
function Overlays({ i, N, ctx, client, effects, isImageLayout }) {
  const c = isImageLayout ? lightOnDark(client) : ctx.c;
  const out = [];
  if (effects.counter && N > 1) {
    out.push(
      <div key="cnt" style={{ position: 'absolute', top: 64, right: 72, fontSize: 26, letterSpacing: '.14em', color: c.muted, fontWeight: 600 }}>
        {String(i + 1).padStart(2, '0')} <span style={{ opacity: 0.5 }}>/ {String(N).padStart(2, '0')}</span>
      </div>
    );
  }
  const showLogo = client.logo && (effects.logo === 'all' || (effects.logo === 'ends' && i === 0));
  if (showLogo) {
    out.push(<img key="logo" src={fileUrl(client.logo)} alt="" crossOrigin="use-credentials" style={{ position: 'absolute', top: 56, left: 72, height: 58, maxWidth: 260, objectFit: 'contain' }} />);
  }
  if (effects.handle && client.handle) {
    out.push(
      <div key="h" style={{ position: 'absolute', bottom: 66, left: 72, fontSize: 26, letterSpacing: '.04em', color: c.muted, fontWeight: 500 }}>
        @{String(client.handle).replace(/^@/, '')}
      </div>
    );
  }
  if (effects.arrow && N > 1 && i < N - 1) {
    out.push(
      <div key="arr" style={{ position: 'absolute', bottom: 50, right: 72, width: 68, height: 68, borderRadius: 999, border: `2.5px solid ${c.hl}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.hl} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
      </div>
    );
  }
  if (effects.frame) {
    out.push(<div key="frame" style={{ position: 'absolute', inset: 36, border: `2px solid ${c.line}`, borderRadius: Math.min(client.radius ?? 28, 36), pointerEvents: 'none' }} />);
  }
  return out;
}

/* ---------- stage ---------- */
export default function Stage({ post, client, mode = 'edit', selected = -1, onSelect, innerRef }) {
  const pages = post.format === 'single' ? post.pages.slice(0, 1) : post.pages;
  const N = pages.length;
  const total = W * N;
  const p = client.palette;
  const effects = post.effects || {};
  const fontH = fontStack(client.fonts.heading);
  const fontB = fontStack(client.fonts.body);
  const weightH = nearestWeight(client.fonts.heading, client.headingWeight || 700);
  const contBg = `linear-gradient(90deg, ${p.primary} 0%, ${p.accent} 50%, ${p.dark} 100%)`;

  const ctxs = pages.map((pg, i) => {
    const c = pageColors(pg, client, i, N);
    return { c, hl: hlStyle(effects.hlStyle, c), mode, index: i, client, effects, fontH, weightH };
  });
  const texture = textureStyle(effects.texture, effects.textureOpacity ?? 0.22, p.ink);

  return (
    <div
      ref={innerRef}
      className="stage"
      style={{ width: total, height: H, position: 'relative', overflow: 'hidden', background: p.bg, fontFamily: fontB, color: p.ink, WebkitFontSmoothing: 'antialiased' }}
    >
      {/* backgrounds */}
      {pages.map((pg, i) => {
        const c = ctxs[i].c;
        const style = { position: 'absolute', left: i * W, top: 0, width: W, height: H, overflow: 'hidden' };
        if (pg.bg === 'continuous') {
          style.backgroundImage = contBg;
          style.backgroundSize = `${total}px ${H}px`;
          style.backgroundPosition = `${-i * W}px 0`;
        } else {
          style.background = c.bgCss;
        }
        return (
          <div key={'bg' + pg.id} style={style}>
            {pg.bg === 'image' && pg.bgImage && (
              <>
                <img src={fileUrl(pg.bgImage)} alt="" crossOrigin="use-credentials" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: alpha(p.dark, pg.overlay ?? 0.45) }} />
              </>
            )}
            {effects.glow && (
              <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(p.accent, 0.42)} 0%, ${alpha(p.accent, 0)} 68%)`, left: i % 2 ? -330 : W - 570, top: i % 2 ? H - 560 : -340 }} />
            )}
          </div>
        );
      })}

      <Flow type={effects.flow} N={N} c1={p.accent} c2={p.primary === p.dark ? p.surface : p.primary} />

      {/* content */}
      {pages.map((pg, i) => {
        const Layout = L[pg.layout] || L.texto;
        const ctx = ctxs[i];
        const isImg = pg.layout === 'capa-foto' || pg.layout === 'foto-inteira';
        return (
          <div
            key={'c' + pg.id}
            onClick={onSelect ? () => onSelect(i) : undefined}
            style={{ position: 'absolute', left: i * W, top: 0, width: W, height: H, color: ctx.c.ink, overflow: 'hidden', cursor: onSelect ? 'pointer' : 'default' }}
          >
            <Layout pg={{ scale: 1, ...pg, _pb: FLOW_PAD[effects.flow] || 170 }} f={pg.fields || {}} ctx={ctx} client={client} />
            <Overlays i={i} N={N} ctx={ctx} client={client} effects={effects} isImageLayout={isImg} />
          </div>
        );
      })}

      {texture && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...texture }} />}

      {mode === 'edit' && (
        <>
          {pages.slice(1).map((pg, k) => (
            <div key={'sep' + pg.id} style={{ position: 'absolute', top: 0, bottom: 0, left: (k + 1) * W - 2, width: 4, background: 'repeating-linear-gradient(180deg, rgba(212,255,63,.9) 0 18px, transparent 18px 34px)', pointerEvents: 'none' }} />
          ))}
          {selected >= 0 && selected < N && (
            <div style={{ position: 'absolute', top: 0, left: selected * W, width: W, height: H, boxShadow: 'inset 0 0 0 8px #D4FF3F', pointerEvents: 'none' }} />
          )}
        </>
      )}
    </div>
  );
}
