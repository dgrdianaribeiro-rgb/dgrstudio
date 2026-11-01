'use client';
import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, LoaderCircle, Plus, Trash2, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { PALETTE_KEYS, PALETTE_PRESETS, TEXTURES, newClient, newPage } from '@/lib/catalog';
import { isHex } from '@/lib/color';
import { ensureFontLink, fontSpec } from '@/lib/fonts';
import FontPicker from './FontPicker';
import Stage, { fileUrl } from './Stage';
import { Chips, Modal } from './ui';

function samplePost(client) {
  return {
    id: 'preview',
    clientId: client.id,
    format: 'carousel',
    pages: [
      newPage('capa', { id: 'p1', bg: 'primary', fields: { kicker: 'Prévia', title: `Sua marca com *identidade*`, subtitle: 'Assim os títulos e textos vão aparecer.' } }),
      newPage('lista', { id: 'p2', bg: 'bg', fields: { title: 'Paleta aplicada', items: 'Fundo e superfície\nTexto e destaque\nPrimária e escura' } }),
    ],
    effects: { texture: client.texture, textureOpacity: 0.22, flow: 'nenhum', hlStyle: 'cor', counter: true, handle: true, arrow: true, logo: 'ends' },
  };
}

export default function ClientsModal({ clients, currentId, onClose, onSaved, onDeleted, onPickLogo, toast, logoPicked }) {
  const [editing, setEditing] = useState(() => {
    const cur = clients.find((c) => c.id === currentId);
    return cur ? structuredClone(cur) : { ...newClient(), name: '' };
  });
  const [busy, setBusy] = useState(false);
  const isNew = !clients.some((c) => c.id === editing.id);

  useEffect(() => { ensureFontLink([editing.fonts.heading, editing.fonts.body], 'client-preview-fonts'); }, [editing.fonts.heading, editing.fonts.body]);
  useEffect(() => {
    if (logoPicked) setEditing((e) => ({ ...e, logo: logoPicked.path }));
  }, [logoPicked]);

  const set = (patch) => setEditing((e) => ({ ...e, ...patch }));
  const setPal = (k, v) => setEditing((e) => ({ ...e, palette: { ...e.palette, [k]: v } }));
  const preview = useMemo(() => samplePost(editing), [editing]);
  const headingWeights = fontSpec(editing.fonts.heading).w;

  const save = async () => {
    if (!editing.name.trim()) return toast('Dê um nome ao cliente.', 'error');
    if (!PALETTE_KEYS.every(({ k }) => isHex(editing.palette[k]))) return toast('Revise as cores: use o formato #RRGGBB.', 'error');
    setBusy(true);
    try {
      const saved = await api.saveClient(editing);
      onSaved(saved);
      toast('Cliente salvo.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Excluir "${editing.name}"? Isso apaga também os posts e a biblioteca deste cliente.`)) return;
    setBusy(true);
    try {
      await api.deleteClient(editing.id);
      onDeleted(editing.id);
      setEditing({ ...newClient(), name: '' });
      toast('Cliente excluído.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Clientes e identidades"
      icon={<Users size={18} />}
      onClose={onClose}
      footer={
        <>
          {!isNew && <button className="btn danger" onClick={remove} disabled={busy}><Trash2 size={15} /> Excluir</button>}
          <div className="spacer" />
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn primary" onClick={save} disabled={busy}>{busy && <LoaderCircle size={15} className="spin" />} Salvar cliente</button>
        </>
      }
    >
      <div className="clients-layout">
        <div>
          <button className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={() => setEditing({ ...newClient(), name: '' })}><Plus size={15} /> Novo cliente</button>
          {clients.length === 0 && <div className="hint">Cadastre o primeiro cliente para começar.</div>}
          {clients.map((c) => (
            <div key={c.id} className={'client-row' + (c.id === editing.id ? ' on' : '')} onClick={() => setEditing(structuredClone(c))}>
              <div style={{ display: 'flex' }}>
                {['primary', 'accent', 'bg'].map((k) => <span key={k} className="swatch" style={{ background: c.palette[k], marginLeft: -3, borderRadius: 999, width: 16, height: 16 }} />)}
              </div>
              <div style={{ minWidth: 0 }}>
                <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</b>
                {c.handle && <small className="hint">@{c.handle.replace(/^@/, '')}</small>}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field"><span>Nome do cliente</span><input className="input" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Psicóloga Ana" /></label>
            <label className="field"><span>@ do Instagram</span><input className="input" value={editing.handle} onChange={(e) => set({ handle: e.target.value.replace(/^@/, '') })} placeholder="perfil" /></label>
          </div>

          <div className="label" style={{ marginBottom: 8 }}>Paleta</div>
          <div className="preset-pal">
            {PALETTE_PRESETS.map((pp) => (
              <button key={pp.nome} type="button" onClick={() => set({ palette: { ...pp.p } })}>
                <i>{['primary', 'accent', 'bg', 'dark'].map((k) => <b key={k} style={{ background: pp.p[k] }} />)}</i>{pp.nome}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
            {PALETTE_KEYS.map(({ k, nome }) => (
              <div className="palette-row" key={k}>
                <span>{nome}</span>
                <input type="color" value={isHex(editing.palette[k]) && editing.palette[k].length === 7 ? editing.palette[k] : '#000000'} onChange={(e) => setPal(k, e.target.value)} />
                <input className="input" value={editing.palette[k]} onChange={(e) => setPal(k, e.target.value.trim())} maxLength={7} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: 12, marginTop: 10 }}>
            <FontPicker id="heading" label="Fonte dos títulos" value={editing.fonts.heading} onChange={(v) => set({ fonts: { ...editing.fonts, heading: v } })} />
            <FontPicker id="body" label="Fonte dos textos" value={editing.fonts.body} onChange={(v) => set({ fonts: { ...editing.fonts, body: v } })} />
            <label className="field"><span>Peso</span>
              <select className="select" value={editing.headingWeight} onChange={(e) => set({ headingWeight: Number(e.target.value) })}>
                {headingWeights.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field"><span>Cantos arredondados · {editing.radius}px</span>
              <input type="range" min="0" max="60" value={editing.radius} onChange={(e) => set({ radius: Number(e.target.value) })} />
            </label>
            <div className="field"><span>Logo</span>
              <div className="img-slot">
                <div className="thumb" style={{ backgroundImage: editing.logo ? `url(${fileUrl(editing.logo)})` : 'none', backgroundSize: 'contain', width: 48, height: 48 }}>{!editing.logo && <ImagePlus size={16} />}</div>
                <button className="btn sm" type="button" onClick={() => onPickLogo(editing)}>Escolher</button>
                {editing.logo && <button className="btn sm ghost icon" type="button" onClick={() => set({ logo: null })}><X size={14} /></button>}
              </div>
            </div>
          </div>

          <div className="field"><span>Textura padrão</span>
            <Chips options={TEXTURES} value={editing.texture} onChange={(v) => set({ texture: v })} />
          </div>

          <label className="field"><span>Método do cliente (a IA respeita)</span>
            <textarea className="textarea" rows={4} value={editing.method} onChange={(e) => set({ method: e.target.value })} placeholder="Tom de voz, estrutura de copy, palavras proibidas, público, pilares de conteúdo…" />
          </label>
        </div>

        <div className="client-preview">
          <div className="label" style={{ marginBottom: 8 }}>Prévia</div>
          <div style={{ width: 2160 * 0.13, height: 1350 * 0.13, overflow: 'hidden', borderRadius: 6, boxShadow: '0 0 0 1px rgba(255,255,255,.08)' }}>
            <div style={{ transform: 'scale(0.13)', transformOrigin: '0 0' }}>
              <Stage post={preview} client={editing} mode="export" />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>As cores de texto se ajustam sozinhas para manter contraste legível sobre cada fundo.</p>
        </div>
      </div>
    </Modal>
  );
}
