'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { CATEGORIES, CANVA_POPULAR, fontSpec, previewFonts, searchFonts } from '@/lib/fonts';

const CAT_LABEL = { sans: 'Sem serifa', serif: 'Serifada', display: 'Display', script: 'Manuscrita', mono: 'Monoespaçada' };

/** Searchable font chooser across uploaded fonts and the full Google Fonts catalog. */
export default function FontPicker({ value, onChange, label, id }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const box = useRef(null);
  const input = useRef(null);

  const results = useMemo(() => (open ? searchFonts(q, cat, 80) : []), [open, q, cat]);

  useEffect(() => {
    if (open) previewFonts(results.map((f) => f.name), `font-previews-${id}`);
  }, [open, results, id]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    setTimeout(() => input.current?.focus(), 0);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const spec = fontSpec(value);

  return (
    <div className="field" ref={box} style={{ position: 'relative' }}>
      <span>{label}</span>
      <button type="button" className="select font-trigger" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontFamily: `'${value}'`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <small className="hint" style={{ marginLeft: 'auto' }}>{spec.custom ? 'sua fonte' : CANVA_POPULAR.includes(value) ? 'Canva' : ''}</small>
        <ChevronDown size={14} style={{ flex: '0 0 auto', color: 'var(--muted)' }} />
      </button>
      {open && (
        <div className="font-pop">
          <div className="font-search">
            <Search size={15} />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar entre +1.800 fontes…" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
          </div>
          <div className="chips" style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={'chip' + (cat === c.id ? ' on' : '')} style={{ height: 26, fontSize: 11.5 }} onClick={() => setCat(c.id)}>{c.nome}</button>
            ))}
          </div>
          <div className="font-list">
            {results.length === 0 && (
              <div className="empty" style={{ padding: 20 }}>
                {cat === 'mine' ? 'Nenhuma fonte enviada ainda. Use o botão Fontes na barra superior.' : 'Nenhuma fonte encontrada. Se for exclusiva do Canva, envie o arquivo em Fontes.'}
              </div>
            )}
            {results.map((f) => (
              <button key={f.name} type="button" className={'font-item' + (f.name === value ? ' on' : '')} onClick={() => { onChange(f.name); setOpen(false); setQ(''); }}>
                <span style={{ fontFamily: `'${f.name}'`, fontSize: 18 }}>{f.name}</span>
                <small>{f.source === 'mine' ? 'Sua fonte' : CAT_LABEL[f.cat] || ''}{f.w.length > 1 ? ` · ${f.w.length} pesos` : ''}</small>
                {f.name === value && <Check size={15} style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
            {results.length >= 80 && <div className="hint" style={{ padding: '8px 12px' }}>Digite para refinar a busca.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
