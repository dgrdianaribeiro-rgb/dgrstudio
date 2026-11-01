'use client';
import { useMemo, useRef, useState } from 'react';
import { LoaderCircle, Trash2, Type, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { uid } from '@/lib/catalog';
import { getCustomFonts, setCustomFonts } from '@/lib/fonts';
import { Modal } from './ui';

const WEIGHT_WORDS = [
  [/(extra|ultra)[\s_-]?light/i, 200],
  [/(extra|ultra)[\s_-]?bold/i, 800],
  [/(semi|demi)[\s_-]?bold/i, 600],
  [/hairline|thin/i, 100],
  [/light/i, 300],
  [/regular|normal|book|roman/i, 400],
  [/medium/i, 500],
  [/heavy/i, 800],
  [/black/i, 900],
  [/bold/i, 700],
];

export const WEIGHT_NAMES = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

/** "Gilroy-SemiBoldItalic.otf" → { family: "Gilroy", weight: 600, style: "italic" } */
export function guessFromFilename(name) {
  let base = String(name).replace(/\.[^.]+$/, '');
  let style = 'normal';
  if (/italic|oblique/i.test(base)) {
    style = 'italic';
    base = base.replace(/italic|oblique/gi, '');
  }
  let weight = 400;
  for (const [re, w] of WEIGHT_WORDS) {
    if (re.test(base)) {
      weight = w;
      base = base.replace(re, '');
      break;
    }
  }
  base = base
    .replace(/\b(webfont|web|font|otf|ttf|woff2?|desktop|pro|std|var|variable)\b/gi, (m) => (/^(pro|std)$/i.test(m) ? m : ''))
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { family: base || 'Minha fonte', weight, style };
}

export default function FontsModal({ onClose, toast }) {
  const [fonts, setFonts] = useState(() => getCustomFonts());
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const input = useRef(null);

  const apply = (next) => {
    setFonts(next);
    setCustomFonts(next);
  };

  const families = useMemo(() => {
    const map = new Map();
    for (const f of fonts) {
      if (!map.has(f.family)) map.set(f.family, []);
      map.get(f.family).push(f);
    }
    return [...map.entries()]
      .map(([family, list]) => ({ family, list: list.sort((a, b) => a.weight - b.weight || (a.style > b.style ? 1 : -1)) }))
      .sort((a, b) => a.family.localeCompare(b.family));
  }, [fonts]);

  const upload = async (files) => {
    const list = [...files];
    if (!list.length) return;
    setBusy(list.length);
    let current = getCustomFonts();
    for (const file of list) {
      try {
        const g = guessFromFilename(file.name);
        const sameFamily = current.find((f) => f.family.toLowerCase() === g.family.toLowerCase());
        const font = await api.uploadFont({ id: uid(), family: sameFamily?.family || g.family, weight: g.weight, style: g.style, cat: sameFamily?.cat || 'sans' }, file);
        current = [...current, font];
        apply(current);
      } catch (e) {
        toast(e.message, 'error');
      }
      setBusy((b) => b - 1);
    }
  };

  const patch = async (font, changes) => {
    try {
      const updated = await api.updateFont({ id: font.id, ...changes });
      apply(getCustomFonts().map((f) => (f.id === font.id ? updated : f)));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const patchFamily = async (family, changes) => {
    const targets = getCustomFonts().filter((f) => f.family === family);
    try {
      const updated = await Promise.all(targets.map((f) => api.updateFont({ id: f.id, ...changes })));
      const byId = new Map(updated.map((f) => [f.id, f]));
      apply(getCustomFonts().map((f) => byId.get(f.id) || f));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const remove = async (font) => {
    if (!confirm(`Remover ${font.family} ${WEIGHT_NAMES[font.weight]}${font.style === 'italic' ? ' Italic' : ''}?`)) return;
    try {
      await api.deleteFont(font.id);
      apply(getCustomFonts().filter((f) => f.id !== font.id));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Modal title="Suas fontes" icon={<Type size={18} />} onClose={onClose}>
      <div
        className={'dropzone' + (over ? ' over' : '')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
      >
        {busy > 0 ? (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><LoaderCircle size={16} className="spin" /> Enviando {busy} {busy > 1 ? 'arquivos' : 'arquivo'}…</span>
        ) : (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Upload size={17} /> Arraste os arquivos de fonte ou clique para enviar (.otf, .ttf, .woff, .woff2)</span>
        )}
        <input ref={input} type="file" accept=".otf,.ttf,.woff,.woff2" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </div>
      <p className="hint" style={{ marginTop: -4 }}>
        Envie todos os pesos de uma família de uma vez. A família e o peso são reconhecidos pelo nome do arquivo e podem ser corrigidos abaixo. As fontes ficam privadas, visíveis só para quem entra com a senha.
      </p>

      {families.length === 0 ? (
        <div className="empty">Nenhuma fonte enviada ainda.</div>
      ) : (
        families.map(({ family, list }) => (
          <div className="card" key={family} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ maxWidth: 260, fontWeight: 600 }}
                defaultValue={family}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== family) patchFamily(family, { family: v }); }}
                title="Nome da família"
              />
              <select className="select" style={{ width: 150 }} value={list[0].cat || 'sans'} onChange={(e) => patchFamily(family, { cat: e.target.value })}>
                <option value="sans">Sem serifa</option>
                <option value="serif">Serifada</option>
                <option value="display">Display</option>
              </select>
              <span className="hint">{list.length} {list.length > 1 ? 'estilos' : 'estilo'}</span>
            </div>
            <div style={{ fontFamily: `'${family}'`, fontSize: 30, lineHeight: 1.2, marginBottom: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              Conteúdo que conecta e transforma
            </div>
            {list.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontFamily: `'${family}'`, fontWeight: f.weight, fontStyle: f.style, fontSize: 18, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Aa {WEIGHT_NAMES[f.weight]}{f.style === 'italic' ? ' Italic' : ''}
                </span>
                <small className="hint" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original}</small>
                <select className="select" style={{ width: 140, height: 30, padding: '0 28px 0 8px', fontSize: 12.5 }} value={f.weight} onChange={(e) => patch(f, { weight: Number(e.target.value) })}>
                  {Object.entries(WEIGHT_NAMES).map(([w, n]) => <option key={w} value={w}>{w} · {n}</option>)}
                </select>
                <select className="select" style={{ width: 110, height: 30, padding: '0 28px 0 8px', fontSize: 12.5 }} value={f.style} onChange={(e) => patch(f, { style: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="italic">Itálico</option>
                </select>
                <button className="btn sm ghost icon danger" onClick={() => remove(f)} aria-label="Remover"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        ))
      )}
    </Modal>
  );
}
