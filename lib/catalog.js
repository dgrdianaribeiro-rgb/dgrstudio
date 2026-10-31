// Shared catalog: layouts, presets, effects. Used by the editor and the AI route.

export const PAGE_W = 1080;
export const PAGE_H = 1350;
export const MAX_PAGES = 20;

const S = {
  kicker: { k: 'kicker', label: 'Chamada', type: 'text', ph: 'Chamada ou categoria' },
  title: { k: 'title', label: 'Título', type: 'textarea', ph: 'Título da página' },
  subtitle: { k: 'subtitle', label: 'Subtítulo', type: 'textarea', ph: 'Linha de apoio' },
  body: { k: 'body', label: 'Texto', type: 'textarea', ph: 'Texto de apoio desta página' },
  number: { k: 'number', label: 'Número', type: 'text', ph: '01' },
  items: { k: 'items', label: 'Itens (um por linha)', type: 'lines', ph: 'Primeiro item\nSegundo item\nTerceiro item' },
  quote: { k: 'quote', label: 'Citação', type: 'textarea', ph: 'A frase que merece destaque' },
  author: { k: 'author', label: 'Autor / fonte', type: 'text', ph: 'Nome do autor' },
  source: { k: 'source', label: 'Fonte do dado', type: 'text', ph: 'Fonte da pesquisa' },
  labelA: { k: 'labelA', label: 'Rótulo A', type: 'text', ph: 'Mito' },
  textA: { k: 'textA', label: 'Texto A', type: 'textarea', ph: 'O que se costuma dizer' },
  labelB: { k: 'labelB', label: 'Rótulo B', type: 'text', ph: 'Verdade' },
  textB: { k: 'textB', label: 'Texto B', type: 'textarea', ph: 'O que a evidência mostra' },
  cta: { k: 'cta', label: 'Botão / chamada para ação', type: 'text', ph: 'Salve para lembrar' },
  image: { k: 'image', label: 'Imagem', type: 'image' },
  caption: { k: 'caption', label: 'Legenda', type: 'text', ph: 'Legenda curta' },
};

export const LAYOUTS = [
  { id: 'capa', nome: 'Capa', desc: 'Título forte para abrir o post', slots: [S.kicker, S.title, S.subtitle], valign: true },
  { id: 'capa-foto', nome: 'Capa com foto', desc: 'Foto de fundo e título sobreposto', slots: [S.image, S.kicker, S.title, S.subtitle] },
  { id: 'topico', nome: 'Tópico', desc: 'Número, título e explicação', slots: [S.number, S.title, S.body], valign: true },
  { id: 'lista', nome: 'Lista', desc: 'Título com até 6 itens numerados', slots: [S.kicker, S.title, S.items], valign: true },
  { id: 'citacao', nome: 'Citação', desc: 'Frase de impacto com autoria', slots: [S.quote, S.author], valign: true },
  { id: 'dado', nome: 'Dado em destaque', desc: 'Número grande, contexto e fonte', slots: [S.number, S.title, S.body, S.source], valign: true },
  { id: 'foto-texto', nome: 'Foto + texto', desc: 'Imagem no topo e texto abaixo', slots: [S.image, S.title, S.body] },
  { id: 'comparativo', nome: 'Comparativo', desc: 'Duas colunas: mito x verdade, antes x depois', slots: [S.title, S.labelA, S.textA, S.labelB, S.textB], valign: true },
  { id: 'texto', nome: 'Texto livre', desc: 'Título e parágrafo para explicar', slots: [S.kicker, S.title, S.body], valign: true },
  { id: 'foto-inteira', nome: 'Foto inteira', desc: 'Imagem ocupando a página', slots: [S.image, S.caption] },
  { id: 'cta', nome: 'Fechamento / CTA', desc: 'Conclusão com chamada para ação', slots: [S.title, S.body, S.cta], valign: true },
];

export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];

export const BACKGROUNDS = [
  { id: 'bg', nome: 'Fundo' },
  { id: 'surface', nome: 'Superfície' },
  { id: 'primary', nome: 'Primária' },
  { id: 'accent', nome: 'Destaque' },
  { id: 'dark', nome: 'Escura' },
  { id: 'gradient', nome: 'Gradiente' },
  { id: 'continuous', nome: 'Contínuo' },
  { id: 'image', nome: 'Imagem' },
];

export const TEXTURES = [
  { id: 'nenhuma', nome: 'Nenhuma' },
  { id: 'granulado', nome: 'Granulado' },
  { id: 'papel', nome: 'Papel' },
  { id: 'pontilhado', nome: 'Pontilhado' },
  { id: 'grade', nome: 'Grade' },
  { id: 'linhas', nome: 'Linhas' },
];

export const FLOWS = [
  { id: 'nenhum', nome: 'Nenhum' },
  { id: 'onda', nome: 'Onda' },
  { id: 'linha', nome: 'Linha contínua' },
  { id: 'circulos', nome: 'Círculos nas emendas' },
  { id: 'faixa', nome: 'Faixa diagonal' },
];

export const HIGHLIGHTS = [
  { id: 'cor', nome: 'Cor' },
  { id: 'marca', nome: 'Marca-texto' },
  { id: 'sublinhado', nome: 'Sublinhado' },
  { id: 'italico', nome: 'Itálico' },
  { id: 'caixa', nome: 'Caixa' },
];

// Reference sequences ("referências de estrutura")
export const PRESETS = [
  { id: 'educativo', nome: 'Educativo clássico', desc: 'Capa, tópicos numerados, dado e fechamento', first: ['capa'], middle: ['topico'], last: ['dado', 'cta'] },
  { id: 'mito', nome: 'Mito x verdade', desc: 'Desconstrói crenças comuns, uma por página', first: ['capa'], middle: ['comparativo'], last: ['cta'] },
  { id: 'lista', nome: 'Lista rápida', desc: 'Capa, lista direta e convite à ação', first: ['capa'], middle: ['lista', 'texto'], last: ['cta'] },
  { id: 'reflexao', nome: 'Reflexão', desc: 'Foto de abertura, citação e texto contemplativo', first: ['capa-foto'], middle: ['citacao', 'texto'], last: ['cta'] },
  { id: 'passos', nome: 'Passo a passo', desc: 'Sequência prática com tópicos', first: ['capa'], middle: ['topico'], last: ['cta'] },
  { id: 'impacto', nome: 'Dado de impacto', desc: 'Abre com um número que prende a atenção', first: ['dado'], middle: ['texto', 'lista'], last: ['cta'] },
  { id: 'vitrine', nome: 'Vitrine com fotos', desc: 'Para produtos, ambientes e bastidores', first: ['capa-foto'], middle: ['foto-texto', 'foto-inteira'], last: ['cta'] },
];

export function presetLayouts(preset, count) {
  if (count <= 1) return [preset.first[0]];
  const out = [...preset.first];
  const tail = [...preset.last];
  while (out.length + tail.length > count && tail.length > 1) tail.shift();
  let i = 0;
  while (out.length + tail.length < count) {
    out.push(preset.middle[i % preset.middle.length]);
    i++;
  }
  return [...out, ...tail].slice(0, count);
}

export const PALETTE_KEYS = [
  { k: 'bg', nome: 'Fundo' },
  { k: 'surface', nome: 'Superfície' },
  { k: 'ink', nome: 'Texto' },
  { k: 'primary', nome: 'Primária' },
  { k: 'accent', nome: 'Destaque' },
  { k: 'dark', nome: 'Escura' },
];

export const PALETTE_PRESETS = [
  { nome: 'Sálvia serena', p: { bg: '#F3EFE7', surface: '#E3E8DC', ink: '#22302A', primary: '#5F7A61', accent: '#C9784F', dark: '#1E2A24' } },
  { nome: 'Café quente', p: { bg: '#F6EEE3', surface: '#EADBC8', ink: '#2B1D14', primary: '#6B4226', accent: '#E07A2E', dark: '#24170F' } },
  { nome: 'Neon editorial', p: { bg: '#F4F4F0', surface: '#E6E6E0', ink: '#0B0B0C', primary: '#121214', accent: '#D4FF3F', dark: '#0B0B0C' } },
  { nome: 'Oceano', p: { bg: '#F2F5F7', surface: '#DCE7EE', ink: '#0E2233', primary: '#1D4E89', accent: '#2EC4B6', dark: '#0B1A2A' } },
  { nome: 'Vinho e rosa', p: { bg: '#FBF1F0', surface: '#F3D9D8', ink: '#3A1220', primary: '#7A1E3A', accent: '#FF6F91', dark: '#2A0C17' } },
  { nome: 'Causa vibrante', p: { bg: '#FFF8E8', surface: '#FFE9B8', ink: '#1F1235', primary: '#5B2A86', accent: '#FFC21A', dark: '#1A0F2E' } },
  { nome: 'Noite violeta', p: { bg: '#111014', surface: '#1E1B26', ink: '#F4F1FA', primary: '#7C5CFF', accent: '#FF5FA2', dark: '#09080C' } },
];

export const DEFAULT_EFFECTS = {
  texture: 'granulado',
  textureOpacity: 0.22,
  flow: 'nenhum',
  hlStyle: 'cor',
  glow: false,
  frame: false,
  counter: true,
  handle: true,
  arrow: true,
  logo: 'ends',
};

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newPage(layout = 'texto', extra = {}) {
  return { id: uid(), layout, bg: 'bg', fields: {}, align: 'left', valign: '', scale: 1, overlay: 0.45, hint: '', ...extra };
}

export function defaultBgFor(layout, index, total) {
  if (layout === 'capa-foto' || layout === 'foto-inteira') return 'bg';
  if (index === 0) return 'primary';
  if (index === total - 1 && total > 1) return 'dark';
  return index % 2 === 0 ? 'surface' : 'bg';
}

export function newPost(client, format = 'carousel', count = 5, presetId = 'educativo') {
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
  const n = format === 'single' ? 1 : count;
  const layouts = presetLayouts(preset, n);
  return {
    id: uid(),
    clientId: client.id,
    title: 'Novo post',
    subject: '',
    format,
    pages: layouts.map((l, i) => newPage(l, { bg: defaultBgFor(l, i, n) })),
    effects: { ...DEFAULT_EFFECTS, texture: client.texture || DEFAULT_EFFECTS.texture },
    direction: null,
    createdAt: Date.now(),
    updatedAt: null,
  };
}

export function newClient() {
  return {
    id: uid(),
    name: '',
    handle: '',
    palette: { ...PALETTE_PRESETS[0].p },
    fonts: { heading: 'Fraunces', body: 'DM Sans' },
    headingWeight: 600,
    radius: 28,
    texture: 'granulado',
    logo: null,
    method: '',
  };
}
