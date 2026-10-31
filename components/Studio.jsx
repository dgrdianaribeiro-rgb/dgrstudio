'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart,
  ArrowRight, ChartColumn, ChevronLeft, ChevronRight, Columns2, Copy, Download, Eraser, FilePlus2, FolderOpen,
  GalleryHorizontal, Hash, Image as ImageIcon, ImagePlus, LayoutPanelTop, Library, List, LoaderCircle, LogOut,
  Maximize2, MousePointerClick, Palette, Plus, Quote, RectangleVertical, Save, SlidersHorizontal, Sparkles,
  Trash2, Type, Undo2, Users, WandSparkles, X, ZoomIn, ZoomOut, AlignLeft as TextIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  BACKGROUNDS, FLOWS, HIGHLIGHTS, LAYOUTS, MAX_PAGES, PAGE_H, PAGE_W, PRESETS, TEXTURES,
  defaultBgFor, layoutById, newPage, newPost, presetLayouts, uid,
} from '@/lib/catalog';
import { ensureFontLink, getFontEmbedCSS } from '@/lib/fonts';
import { downloadBlob, renderPages, renderStrip, slugify, waitForImages, zipPages } from '@/lib/exporter';
import Stage, { fileUrl } from './Stage';
import ClientsModal from './ClientsModal';
import LibraryModal from './LibraryModal';
import PostsModal from './PostsModal';
import { Chips, Toggle } from './ui';

const LAYOUT_ICONS = {
  capa: Type, 'capa-foto': ImageIcon, topico: Hash, lista: List, citacao: Quote, dado: ChartColumn,
  'foto-texto': LayoutPanelTop, comparativo: Columns2, texto: TextIcon, 'foto-inteira': ImagePlus, cta: MousePointerClick,
};

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export default function Studio({ aiEnabled, onLogout }) {
  const [clients, setClients] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [post, setPost] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState('formato');
  const [modal, setModal] = useState(null); // 'clients' | 'library' | 'posts'
  const [picker, setPicker] = useState(null); // { onPick, client }
  const [logoPicked, setLogoPicked] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const [exportJob, setExportJob] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(0.4);
  const [aiForm, setAiForm] = useState({ goal: '', mode: 'estrutura' });
  const history = useRef({ stack: [], last: 0 });
  const scrollRef = useRef(null);
  const exportRef = useRef(null);

  const client = useMemo(() => clients?.find((c) => c.id === clientId) || null, [clients, clientId]);

  const toast = useCallback((msg, kind = 'ok') => {
    setToastMsg({ msg, kind, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), toastMsg.kind === 'error' ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [toastMsg]);

  /* ---------- load clients ---------- */
  useEffect(() => {
    api.clients()
      .then((list) => {
        setClients(list);
        const saved = store.get('dgr.client');
        const pick = list.find((c) => c.id === saved) || list[0];
        if (pick) setClientId(pick.id);
        else setModal('clients');
      })
      .catch((e) => { setClients([]); toast(e.message, 'error'); });
  }, [toast]);

  const clientKey = client?.id;
  useEffect(() => {
    if (!client) return;
    store.set('dgr.client', client.id);
    setPost((p) => (p && p.clientId === client.id ? p : newPost(client)));
    setSel(0);
    setDirty(false);
    history.current = { stack: [], last: 0 };
  }, [clientKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (client) ensureFontLink([client.fonts.heading, client.fonts.body]);
  }, [client?.fonts.heading, client?.fonts.body]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- post updates + undo ---------- */
  const update = useCallback((fn, coalesce = false) => {
    setPost((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : { ...prev, ...fn };
      const h = history.current;
      const now = Date.now();
      if (!coalesce || now - h.last > 800) {
        h.stack.push(prev);
        if (h.stack.length > 60) h.stack.shift();
      }
      h.last = now;
      return next;
    });
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.stack.pop();
    if (prev) { setPost(prev); setDirty(true); }
  }, []);

  const pages = post ? (post.format === 'single' ? post.pages.slice(0, 1) : post.pages) : [];
  const N = pages.length;
  const page = pages[Math.min(sel, N - 1)];

  const updatePage = (patch, coalesce = false) =>
    update((p) => ({ ...p, pages: p.pages.map((pg, i) => (i === sel ? { ...pg, ...(typeof patch === 'function' ? patch(pg) : patch) } : pg)) }), coalesce);
  const setField = (k, v, coalesce = true) => updatePage((pg) => ({ fields: { ...pg.fields, [k]: v } }), coalesce);
  const setEffect = (k, v) => update((p) => ({ ...p, effects: { ...p.effects, [k]: v } }));

  /* ---------- fit to viewport ---------- */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const calc = () => {
      const h = el.clientHeight - 56;
      const w = el.clientWidth - 56;
      const byH = h / PAGE_H;
      const byW = w / (PAGE_W * Math.max(1, N));
      setFitScale(Math.max(0.12, Math.min(byH, N <= 2 ? byW : byH, 0.8)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [N, post?.format]);
  const scale = fitScale * zoom;

  // scroll selected page into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = sel * PAGE_W * scale;
    if (left < el.scrollLeft || left + PAGE_W * scale > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: Math.max(0, left - 40), behavior: 'smooth' });
    }
  }, [sel, scale]);

  /* ---------- save ---------- */
  const save = useCallback(async () => {
    if (!post) return;
    setBusy('Salvando…');
    try {
      const saved = await api.savePost(post);
      setPost((p) => ({ ...p, updatedAt: saved.updatedAt }));
      setDirty(false);
      toast('Post salvo.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  }, [post, toast]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      const tag = document.activeElement?.tagName;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, undo]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const confirmDiscard = () => !dirty || confirm('Há alterações não salvas neste post. Continuar mesmo assim?');

  /* ---------- format & pages ---------- */
  const setFormat = (format) => {
    update((p) => {
      let pgs = p.pages;
      if (format === 'carousel' && pgs.length < 2) {
        const layouts = presetLayouts(PRESETS[0], 5);
        pgs = [pgs[0], ...layouts.slice(1).map((l, i) => newPage(l, { bg: defaultBgFor(l, i + 1, 5) }))];
      }
      return { ...p, format, pages: pgs };
    });
    setSel(0);
  };

  const setCount = (n) => {
    n = Math.max(2, Math.min(MAX_PAGES, Number(n) || 2));
    if (n === post.pages.length) return;
    if (n < post.pages.length) {
      const removed = post.pages.slice(n);
      const hasContent = removed.some((pg) => Object.values(pg.fields || {}).some((v) => String(v || '').trim()));
      if (hasContent && !confirm(`As últimas ${removed.length} página(s) têm conteúdo. Remover mesmo assim?`)) return;
    }
    update((p) => {
      const pgs = p.pages.slice(0, n);
      while (pgs.length < n) pgs.push(newPage('texto', { bg: pgs.length % 2 ? 'bg' : 'surface' }));
      return { ...p, pages: pgs };
    });
    setSel((s) => Math.min(s, n - 1));
  };

  const movePage = (dir) => {
    const j = sel + dir;
    if (j < 0 || j >= N) return;
    update((p) => {
      const pgs = [...p.pages];
      [pgs[sel], pgs[j]] = [pgs[j], pgs[sel]];
      return { ...p, pages: pgs };
    });
    setSel(j);
  };
  const duplicatePage = () => {
    if (N >= MAX_PAGES) return toast(`O limite é de ${MAX_PAGES} páginas.`, 'error');
    update((p) => {
      const pgs = [...p.pages];
      pgs.splice(sel + 1, 0, { ...structuredClone(pgs[sel]), id: uid() });
      return { ...p, pages: pgs };
    });
    setSel(sel + 1);
  };
  const deletePage = () => {
    if (N <= 2) return toast('Um carrossel precisa de pelo menos 2 páginas.', 'error');
    update((p) => ({ ...p, pages: p.pages.filter((_, i) => i !== sel) }));
    setSel(Math.max(0, sel - 1));
  };
  const addPage = () => setCount(N + 1);

  const applyPreset = (preset) => {
    const layouts = presetLayouts(preset, N);
    update((p) => ({
      ...p,
      pages: p.pages.map((pg, i) => (i < layouts.length ? { ...pg, layout: layouts[i], bg: defaultBgFor(layouts[i], i, layouts.length) } : pg)),
    }));
    toast(`Estrutura “${preset.nome}” aplicada. Seus textos foram mantidos.`);
  };

  const clearTexts = () => {
    if (!confirm('Limpar todos os textos deste post? Layouts, imagens e efeitos ficam.')) return;
    update((p) => ({ ...p, pages: p.pages.map((pg) => ({ ...pg, fields: pg.fields?.image ? { image: pg.fields.image, imagePos: pg.fields.imagePos } : {} })) }));
  };

  /* ---------- AI ---------- */
  const runAI = async () => {
    if (!post.subject?.trim()) return toast('Escreva o assunto do post primeiro.', 'error');
    setBusy('Estruturando com IA…');
    try {
      const res = await api.ai({ subject: post.subject, goal: aiForm.goal, mode: aiForm.mode, count: N, client: { name: client.name, handle: client.handle, method: client.method } });
      update((p) => ({
        ...p,
        title: p.title === 'Novo post' && res.title ? res.title : p.title,
        direction: res.direction,
        pages: p.pages.map((pg, i) => {
          const r = res.pages[i];
          if (!r || i >= N) return pg;
          const keep = pg.fields || {};
          const fields = aiForm.mode === 'rascunho' ? { ...keep, ...r.fields } : keep;
          return { ...pg, layout: r.layout, bg: r.bg, hint: r.hint, fields };
        }),
      }));
      setSel(0);
      toast('Estrutura criada. Revise página por página.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const applyDirectionEffects = () => {
    const ef = post.direction?.effects || {};
    update((p) => ({
      ...p,
      effects: {
        ...p.effects,
        ...(ef.texture ? { texture: ef.texture } : {}),
        ...(ef.flow ? { flow: ef.flow } : {}),
        ...(ef.hlStyle ? { hlStyle: ef.hlStyle } : {}),
      },
    }));
  };

  /* ---------- export ---------- */
  const startExport = (kind) => setExportJob({ kind, id: Date.now() });

  useEffect(() => {
    if (!exportJob) return;
    let cancelled = false;
    (async () => {
      try {
        setBusy('Preparando fontes e imagens…');
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const node = exportRef.current;
        await document.fonts.ready;
        await waitForImages(node);
        const fontCSS = await getFontEmbedCSS([client.fonts.heading, client.fonts.body]).catch(() => '');
        const base = `${slugify(client.name)}-${slugify(post.title)}`;
        if (exportJob.kind === 'strip') {
          setBusy('Gerando tira panorâmica…');
          const blob = await renderStrip(node, N, fontCSS);
          downloadBlob(blob, `${base}-panorama.png`);
        } else {
          const blobs = await renderPages(node, N, fontCSS, (i, n) => !cancelled && setBusy(`Gerando página ${i} de ${n}…`));
          if (blobs.length === 1) downloadBlob(blobs[0], `${base}.png`);
          else {
            setBusy('Compactando…');
            downloadBlob(await zipPages(blobs, base), `${base}.zip`);
          }
        }
        toast('Exportação concluída.');
      } catch (e) {
        console.error(e);
        toast('Falha ao exportar: ' + (e?.message || 'erro desconhecido'), 'error');
      } finally {
        if (!cancelled) { setBusy(null); setExportJob(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [exportJob]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- modals helpers ---------- */
  const openPicker = (onPick, forClient = client) => setPicker({ onPick, client: forClient });

  if (!clients) {
    return <div className="gate"><LoaderCircle className="spin" /></div>;
  }

  const layoutMeta = page ? layoutById(page.layout) : null;
  const totalW = PAGE_W * N;

  return (
    <div className="app">
      {/* ---------- top bar ---------- */}
      <header className="topbar">
        <div className="brand"><div className="mark">D</div>Dgr Studio <small>gerador de posts</small></div>
        {clients.length > 0 && (
          <div className="client-pick">
            {client && <span className="dots">{['primary', 'accent', 'bg'].map((k) => <i key={k} style={{ background: client.palette[k] }} />)}</span>}
            <select className="select" style={{ width: 200, height: 36, padding: '0 30px 0 10px' }} value={clientId || ''} onChange={(e) => { if (confirmDiscard()) { setPost(null); setClientId(e.target.value); } }}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <button className="btn" onClick={() => setModal('clients')}><Users size={15} /> Clientes</button>
        {client && <button className="btn" onClick={() => setModal('library')}><Library size={15} /> Biblioteca</button>}
        {client && <button className="btn" onClick={() => setModal('posts')}><FolderOpen size={15} /> Posts</button>}
        <div className="spacer" />
        {dirty && <span className="dirty">Não salvo</span>}
        {post && <button className="btn icon" title="Desfazer (Ctrl+Z)" onClick={undo} disabled={!history.current.stack.length}><Undo2 size={16} /></button>}
        {post && <button className="btn" onClick={save}><Save size={15} /> Salvar</button>}
        {post && (
          <>
            <button className="btn primary" onClick={() => startExport('pages')}>
              <Download size={15} /> {N > 1 ? `Exportar ${N} PNGs` : 'Exportar PNG'}
            </button>
            {N > 1 && <button className="btn icon" title="Baixar tira panorâmica completa" onClick={() => startExport('strip')}><GalleryHorizontal size={16} /></button>}
          </>
        )}
        <button className="btn ghost icon" title="Sair" onClick={onLogout}><LogOut size={16} /></button>
      </header>

      {!client || !post ? (
        <div className="empty" style={{ paddingTop: 120 }}>
          <Palette size={34} style={{ color: 'var(--accent)' }} />
          <h2 style={{ color: 'var(--text)', fontFamily: 'Bricolage Grotesque, sans-serif' }}>Comece cadastrando um cliente</h2>
          <p>Cada cliente guarda paleta, fontes, logo, textura e o método de copy.<br />Depois é só escolher o cliente e criar.</p>
          <button className="btn primary" onClick={() => setModal('clients')}><Plus size={15} /> Cadastrar cliente</button>
        </div>
      ) : (
        <div className="work">
          {/* ---------- left panel ---------- */}
          <aside className="side">
            <div className="tabs">
              <button className={tab === 'formato' ? 'on' : ''} onClick={() => setTab('formato')}><RectangleVertical size={16} />Formato</button>
              <button className={tab === 'estrutura' ? 'on' : ''} onClick={() => setTab('estrutura')}><WandSparkles size={16} />Estrutura</button>
              <button className={tab === 'efeitos' ? 'on' : ''} onClick={() => setTab('efeitos')}><SlidersHorizontal size={16} />Efeitos</button>
            </div>

            {tab === 'formato' && (
              <>
                <div className="section">
                  <label className="field"><span>Nome do post</span>
                    <input className="input" value={post.title} onChange={(e) => update({ title: e.target.value }, true)} />
                  </label>
                  <div className="format-cards">
                    <button className={'format-card' + (post.format === 'single' ? ' on' : '')} onClick={() => setFormat('single')}>
                      <RectangleVertical size={18} /><b>Arte única</b><small>Feed · 1080 × 1350</small>
                    </button>
                    <button className={'format-card' + (post.format === 'carousel' ? ' on' : '')} onClick={() => setFormat('carousel')}>
                      <GalleryHorizontal size={18} /><b>Carrossel</b><small>2 a {MAX_PAGES} páginas</small>
                    </button>
                  </div>
                  {post.format === 'carousel' && (
                    <div style={{ marginTop: 14 }}>
                      <div className="label" style={{ marginBottom: 8 }}>Quantidade de páginas</div>
                      <div className="stepper">
                        <button className="btn icon" onClick={() => setCount(N - 1)} disabled={N <= 2}>–</button>
                        <input className="input num" type="number" min="2" max={MAX_PAGES} value={N} onChange={(e) => setCount(e.target.value)} />
                        <button className="btn icon" onClick={() => setCount(N + 1)} disabled={N >= MAX_PAGES}>+</button>
                      </div>
                    </div>
                  )}
                  <div className="readout">
                    Canvas: <b>{(PAGE_W * N).toLocaleString('pt-BR')} × {PAGE_H.toLocaleString('pt-BR')} px</b>
                    {N > 1 && <> ({PAGE_W} × {N})</>}<br />
                    Exporta: <b>{N} {N > 1 ? 'PNGs' : 'PNG'} de 1080 × 1350</b>{N > 1 && ', numerados, em um ZIP'}
                  </div>
                </div>
                <div className="section">
                  <h4><Sparkles size={14} /> Referências de estrutura</h4>
                  <p className="hint" style={{ marginTop: -4 }}>Aplica a sequência de layouts às {N} {N > 1 ? 'páginas' : 'página'}, mantendo seus textos.</p>
                  {PRESETS.map((pr) => (
                    <button key={pr.id} className="preset" onClick={() => applyPreset(pr)}>
                      <b>{pr.nome}</b><span className="hint">{pr.desc}</span>
                      <div className="seq">{presetLayouts(pr, N).map((l, i) => <span key={i}>{layoutById(l).nome}</span>)}</div>
                    </button>
                  ))}
                </div>
                <div className="section">
                  <button className="btn" style={{ width: '100%' }} onClick={clearTexts}><Eraser size={15} /> Limpar textos e reaproveitar</button>
                </div>
              </>
            )}

            {tab === 'estrutura' && (
              <div className="section">
                <h4><WandSparkles size={14} /> Estruturar com IA</h4>
                <label className="field"><span>Assunto</span>
                  <textarea className="textarea" rows={5} value={post.subject} onChange={(e) => update({ subject: e.target.value }, true)} placeholder="Ex.: 5 sinais de que você precisa descansar, com base em estudos sobre burnout" />
                </label>
                <label className="field"><span>Objetivo ou público (opcional)</span>
                  <input className="input" value={aiForm.goal} onChange={(e) => setAiForm({ ...aiForm, goal: e.target.value })} placeholder="Ex.: gerar salvamentos; mulheres de 25 a 40" />
                </label>
                <div className="field"><span>O que a IA faz</span>
                  <Chips
                    options={[{ id: 'estrutura', nome: 'Só estrutura' }, { id: 'rascunho', nome: 'Estrutura + rascunho' }]}
                    value={aiForm.mode}
                    onChange={(v) => setAiForm({ ...aiForm, mode: v })}
                  />
                  <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
                    {aiForm.mode === 'estrutura' ? 'Define layouts, fundos e o que dizer em cada página. Os textos ficam com você.' : 'Também sugere textos curtos, seguindo o método do cliente, para você revisar.'}
                  </span>
                </div>
                <button className="btn primary" style={{ width: '100%' }} onClick={runAI} disabled={!aiEnabled}>
                  <Sparkles size={15} /> Estruturar {N} {N > 1 ? 'páginas' : 'página'}
                </button>
                {!aiEnabled && <p className="hint">Para ativar, adicione <b>ANTHROPIC_API_KEY</b> nas variáveis de ambiente do projeto no Vercel e faça um novo deploy.</p>}
                {client.method ? <p className="hint">O método cadastrado para {client.name} é enviado junto.</p> : <p className="hint">Dica: cadastre o método de copy do cliente para a IA respeitá-lo.</p>}

                {post.direction && (
                  <div className="direction">
                    <div className="label" style={{ marginBottom: 8 }}>Direção criativa</div>
                    {post.direction.concept && <p><b>Conceito:</b> {post.direction.concept}</p>}
                    {post.direction.tone && <p><b>Tom:</b> {post.direction.tone}</p>}
                    {post.direction.references?.length > 0 && (
                      <>
                        <b>Referências visuais</b>
                        <ul>{post.direction.references.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      </>
                    )}
                    {post.direction.effects && (
                      <button className="btn sm" onClick={applyDirectionEffects}><Sparkles size={13} /> Aplicar efeitos sugeridos</button>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'efeitos' && (
              <>
                <div className="section">
                  <h4>Textura</h4>
                  <Chips options={TEXTURES} value={post.effects.texture} onChange={(v) => setEffect('texture', v)} />
                  {post.effects.texture !== 'nenhuma' && (
                    <label className="field" style={{ marginTop: 12 }}><span>Intensidade</span>
                      <input type="range" min="0.05" max="0.6" step="0.01" value={post.effects.textureOpacity} onChange={(e) => update((p) => ({ ...p, effects: { ...p.effects, textureOpacity: Number(e.target.value) } }), true)} />
                    </label>
                  )}
                </div>
                <div className="section">
                  <h4>Elemento contínuo</h4>
                  <p className="hint" style={{ marginTop: -4 }}>Atravessa as emendas do carrossel e cria a sensação de painel único ao deslizar.</p>
                  <Chips options={FLOWS} value={post.effects.flow} onChange={(v) => setEffect('flow', v)} />
                </div>
                <div className="section">
                  <h4>Palavras em destaque</h4>
                  <p className="hint" style={{ marginTop: -4 }}>Marque no texto com *asteriscos*.</p>
                  <Chips options={HIGHLIGHTS} value={post.effects.hlStyle} onChange={(v) => setEffect('hlStyle', v)} />
                </div>
                <div className="section">
                  <h4>Acabamento</h4>
                  <Toggle on={post.effects.glow} onChange={(v) => setEffect('glow', v)}>Brilho suave de cor</Toggle>
                  <Toggle on={post.effects.frame} onChange={(v) => setEffect('frame', v)}>Moldura fina</Toggle>
                  <Toggle on={post.effects.counter} onChange={(v) => setEffect('counter', v)}>Numeração das páginas</Toggle>
                  <Toggle on={post.effects.handle} onChange={(v) => setEffect('handle', v)}>@ do cliente no rodapé</Toggle>
                  <Toggle on={post.effects.arrow} onChange={(v) => setEffect('arrow', v)}>Seta “arraste para o lado”</Toggle>
                  <div className="field" style={{ marginTop: 8 }}><span>Logo</span>
                    <Chips options={[{ id: 'off', nome: 'Não mostrar' }, { id: 'ends', nome: 'Capa e fechamento' }, { id: 'all', nome: 'Todas' }]} value={post.effects.logo} onChange={(v) => setEffect('logo', v)} />
                    {!client.logo && <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Este cliente ainda não tem logo cadastrada.</span>}
                  </div>
                </div>
              </>
            )}
          </aside>

          {/* ---------- canvas ---------- */}
          <main className="center">
            <div className="canvas-bar">
              <span className="info">{N > 1 ? `Carrossel · ${N} páginas` : 'Arte única'} · {client.name}</span>
              <div className="spacer" />
              <button className="btn sm icon" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}><ZoomOut size={15} /></button>
              <span className="info" style={{ width: 44, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
              <button className="btn sm icon" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}><ZoomIn size={15} /></button>
              <button className="btn sm icon" title="Ajustar à tela" onClick={() => setZoom(1)}><Maximize2 size={14} /></button>
            </div>
            <div className={'canvas-scroll' + (totalW * scale < 900 ? ' fit-center' : '')} ref={scrollRef}>
              <div className="stage-wrap" style={{ width: totalW * scale, height: PAGE_H * scale }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
                  <Stage post={post} client={client} mode="edit" selected={sel} onSelect={setSel} />
                </div>
              </div>
            </div>
            <div className="page-strip">
              {pages.map((pg, i) => (
                <button key={pg.id} className={'page-chip' + (i === sel ? ' on' : '')} onClick={() => setSel(i)}>
                  <b>{String(i + 1).padStart(2, '0')}</b><small>{layoutById(pg.layout).nome}</small>
                </button>
              ))}
              {post.format === 'carousel' && N < MAX_PAGES && (
                <button className="page-chip add" onClick={addPage} title="Adicionar página"><Plus size={16} /></button>
              )}
            </div>
          </main>

          {/* ---------- right panel: selected page ---------- */}
          <aside className="side right">
            {page && (
              <>
                <div className="section" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <b style={{ fontSize: 14 }}>Página {String(sel + 1).padStart(2, '0')}</b>
                  <span className="hint">de {N}</span>
                  <div className="spacer" />
                  {N > 1 && (
                    <>
                      <button className="btn sm icon" title="Mover para a esquerda" onClick={() => movePage(-1)} disabled={sel === 0}><ChevronLeft size={15} /></button>
                      <button className="btn sm icon" title="Mover para a direita" onClick={() => movePage(1)} disabled={sel === N - 1}><ChevronRight size={15} /></button>
                      <button className="btn sm icon" title="Duplicar página" onClick={duplicatePage}><Copy size={14} /></button>
                      <button className="btn sm icon danger" title="Excluir página" onClick={deletePage}><Trash2 size={14} /></button>
                    </>
                  )}
                </div>

                <div className="section">
                  {page.hint && <div className="ai-hint"><Sparkles size={15} style={{ flex: '0 0 auto', marginTop: 2 }} /><span>{page.hint}</span></div>}
                  <h4>Layout</h4>
                  <div className="layout-grid">
                    {LAYOUTS.map((l) => {
                      const Icon = LAYOUT_ICONS[l.id] || Type;
                      return (
                        <button key={l.id} className={'layout-btn' + (page.layout === l.id ? ' on' : '')} onClick={() => updatePage({ layout: l.id })} title={l.desc}>
                          <Icon size={15} />{l.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="section">
                  <h4>Textos e imagem</h4>
                  {layoutMeta.slots.map((s) => {
                    const v = page.fields?.[s.k] || '';
                    if (s.type === 'image') {
                      return (
                        <div className="field" key={s.k}><span>{s.label}</span>
                          <div className="img-slot">
                            <div className="thumb" style={{ backgroundImage: v ? `url(${fileUrl(v)})` : 'none' }}>{!v && <ImagePlus size={16} />}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn sm" onClick={() => openPicker((path) => setField('image', path, false))}><Library size={13} /> {v ? 'Trocar' : 'Escolher'}</button>
                                {v && <button className="btn sm ghost icon" onClick={() => setField('image', '', false)}><X size={14} /></button>}
                              </div>
                              {v && (
                                <select className="select" style={{ height: 30, padding: '0 28px 0 8px', fontSize: 12.5 }} value={page.fields.imagePos || 'center'} onChange={(e) => setField('imagePos', e.target.value, false)}>
                                  <option value="center">Enquadrar no centro</option>
                                  <option value="top">Enquadrar no topo</option>
                                  <option value="bottom">Enquadrar na base</option>
                                  <option value="left">Enquadrar à esquerda</option>
                                  <option value="right">Enquadrar à direita</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const Tag = s.type === 'text' ? 'input' : 'textarea';
                    return (
                      <label className="field" key={s.k}><span>{s.label}</span>
                        <Tag className={Tag === 'input' ? 'input' : 'textarea'} rows={s.type === 'lines' ? 5 : 3} value={v} placeholder={s.ph} onChange={(e) => setField(s.k, e.target.value)} />
                      </label>
                    );
                  })}
                  <p className="hint" style={{ margin: 0 }}>Use *asteriscos* para destacar palavras. Campos vazios não aparecem na exportação.</p>
                </div>

                <div className="section">
                  <h4>Fundo</h4>
                  <div className="chips">
                    {BACKGROUNDS.map((b) => {
                      const p = client.palette;
                      const sw = { bg: p.bg, surface: p.surface, primary: p.primary, accent: p.accent, dark: p.dark, gradient: `linear-gradient(135deg, ${p.primary}, ${p.dark})`, continuous: `linear-gradient(90deg, ${p.primary}, ${p.accent}, ${p.dark})`, image: '#333' }[b.id];
                      return (
                        <button key={b.id} className={'chip' + (page.bg === b.id ? ' on' : '')} onClick={() => updatePage({ bg: b.id })}>
                          <span className="swatch" style={{ background: sw }} />{b.nome}
                        </button>
                      );
                    })}
                  </div>
                  {page.bg === 'continuous' && <p className="hint">O gradiente contínuo atravessa todas as páginas que usam este fundo.</p>}
                  {page.bg === 'image' && (
                    <div style={{ marginTop: 12 }}>
                      <div className="img-slot">
                        <div className="thumb" style={{ backgroundImage: page.bgImage ? `url(${fileUrl(page.bgImage)})` : 'none' }}>{!page.bgImage && <ImagePlus size={16} />}</div>
                        <button className="btn sm" onClick={() => openPicker((path) => updatePage({ bgImage: path }))}><Library size={13} /> {page.bgImage ? 'Trocar' : 'Escolher imagem'}</button>
                      </div>
                      <label className="field" style={{ marginTop: 10 }}><span>Escurecer imagem</span>
                        <input type="range" min="0" max="0.9" step="0.01" value={page.overlay ?? 0.45} onChange={(e) => updatePage({ overlay: Number(e.target.value) }, true)} />
                      </label>
                    </div>
                  )}
                </div>

                <div className="section">
                  <h4>Composição</h4>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    <button className={'chip' + (page.align !== 'center' ? ' on' : '')} onClick={() => updatePage({ align: 'left' })}><AlignLeft size={13} /> Esquerda</button>
                    <button className={'chip' + (page.align === 'center' ? ' on' : '')} onClick={() => updatePage({ align: 'center' })}><AlignCenter size={13} /> Centro</button>
                  </div>
                  {layoutMeta.valign && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      <button className={'chip' + (!page.valign ? ' on' : '')} onClick={() => updatePage({ valign: '' })}>Automático</button>
                      <button className={'chip' + (page.valign === 'top' ? ' on' : '')} onClick={() => updatePage({ valign: 'top' })}><AlignVerticalJustifyStart size={13} /></button>
                      <button className={'chip' + (page.valign === 'center' ? ' on' : '')} onClick={() => updatePage({ valign: 'center' })}><AlignVerticalJustifyCenter size={13} /></button>
                      <button className={'chip' + (page.valign === 'bottom' ? ' on' : '')} onClick={() => updatePage({ valign: 'bottom' })}><AlignVerticalJustifyEnd size={13} /></button>
                    </div>
                  )}
                  <label className="field" style={{ marginBottom: 0 }}><span>Tamanho do texto · {Math.round((page.scale || 1) * 100)}%</span>
                    <input type="range" min="0.6" max="1.4" step="0.02" value={page.scale || 1} onChange={(e) => updatePage({ scale: Number(e.target.value) }, true)} />
                  </label>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* hidden full-size stage used only for export */}
      {exportJob && post && client && (
        <div className="export-host" aria-hidden="true">
          <Stage post={post} client={client} mode="export" innerRef={exportRef} />
        </div>
      )}

      {modal === 'clients' && (
        <ClientsModal
          clients={clients}
          currentId={clientId}
          toast={toast}
          logoPicked={logoPicked}
          onClose={() => setModal(null)}
          onPickLogo={(editing) => openPicker((path) => setLogoPicked({ path, n: Date.now() }), editing)}
          onSaved={(c) => {
            const existed = clients.some((x) => x.id === c.id);
            setClients((list) => {
              const exists = list.some((x) => x.id === c.id);
              return (exists ? list.map((x) => (x.id === c.id ? c : x)) : [...list, c]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            });
            if (!clientId || (!existed && clientId !== c.id)) {
              if (confirmDiscard()) { setPost(null); setClientId(c.id); }
            }
          }}
          onDeleted={(id) => {
            setClients((list) => {
              const rest = list.filter((x) => x.id !== id);
              if (clientId === id) { setPost(null); setClientId(rest[0]?.id || null); }
              return rest;
            });
          }}
        />
      )}
      {modal === 'library' && client && <LibraryModal client={client} toast={toast} onClose={() => setModal(null)} />}
      {modal === 'posts' && client && (
        <PostsModal
          client={client}
          toast={toast}
          onClose={() => setModal(null)}
          onNew={() => { if (!confirmDiscard()) return; setPost(newPost(client)); setSel(0); setDirty(false); history.current = { stack: [], last: 0 }; setModal(null); }}
          onOpen={(p, isCopy) => {
            if (!confirmDiscard()) return;
            setPost({ ...p, effects: { ...newPost(client).effects, ...p.effects } });
            setSel(0);
            setDirty(Boolean(isCopy));
            history.current = { stack: [], last: 0 };
            setModal(null);
          }}
        />
      )}
      {picker && (
        <LibraryModal
          client={picker.client}
          toast={toast}
          onClose={() => setPicker(null)}
          onPick={(path) => { picker.onPick(path); setPicker(null); }}
        />
      )}

      {busy && (
        <div className="busy-overlay"><div className="card"><LoaderCircle size={18} className="spin" /> {busy}</div></div>
      )}
      {toastMsg && (
        <div className={'toast' + (toastMsg.kind === 'error' ? ' error' : '')} key={toastMsg.id}>
          {toastMsg.kind === 'error' ? <X size={15} style={{ color: 'var(--danger)' }} /> : <ArrowRight size={15} style={{ color: 'var(--accent)' }} />}
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}
