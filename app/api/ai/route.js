import { guard } from '@/lib/server/auth';
import { FLOWS, HIGHLIGHTS, LAYOUTS, LAYOUT_IDS, MAX_PAGES, TEXTURES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FIELD_KEYS = ['kicker', 'title', 'subtitle', 'body', 'number', 'items', 'quote', 'author', 'source', 'labelA', 'textA', 'labelB', 'textB', 'cta', 'caption'];

function catalogText() {
  return LAYOUTS.map((l) => {
    const slots = l.slots.filter((s) => s.type !== 'image').map((s) => s.k).join(', ');
    const img = l.slots.some((s) => s.type === 'image') ? ' (usa imagem que a designer escolhe)' : '';
    return `- ${l.id}: ${l.desc}${img}. Campos: ${slots}`;
  }).join('\n');
}

function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Resposta sem JSON');
  return JSON.parse(text.slice(start, end + 1));
}

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : Array.isArray(v) ? v.map(String).join('\n').slice(0, n) : '');

export async function POST(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'IA não configurada: adicione ANTHROPIC_API_KEY no Vercel.' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject || '').trim().slice(0, 2000);
  if (!subject) return Response.json({ error: 'Descreva o assunto do post.' }, { status: 400 });
  const count = Math.max(1, Math.min(MAX_PAGES, Number(body.count) || 1));
  const mode = body.mode === 'rascunho' ? 'rascunho' : 'estrutura';
  const client = body.client || {};

  const system = `Você é diretora de arte e estrategista de conteúdo de uma agência de social media brasileira. Você transforma um assunto em uma estrutura de post para Instagram (páginas de 1080x1350). Escreva sempre em português do Brasil. Responda SOMENTE com um objeto JSON válido, sem comentários e sem texto fora do JSON.`;

  const user = `CLIENTE: ${client.name || 'sem nome'}${client.handle ? ` (@${String(client.handle).replace(/^@/, '')})` : ''}
MÉTODO E REGRAS DO CLIENTE (siga à risca quando houver): ${client.method ? client.method.slice(0, 2500) : 'não informado'}

FORMATO: ${count === 1 ? 'arte única (1 página)' : `carrossel com EXATAMENTE ${count} páginas`}
ASSUNTO: ${subject}
OBJETIVO / PÚBLICO: ${String(body.goal || 'não informado').slice(0, 600)}
MODO: ${mode === 'estrutura'
    ? 'SOMENTE ESTRUTURA. A designer escreverá todos os textos. Deixe todos os campos de texto como string vazia "". Preencha apenas "layout", "fundo" e "hint".'
    : 'ESTRUTURA + RASCUNHO. Preencha os campos com textos curtos e prontos para revisão: títulos até 60 caracteres, textos até 220 caracteres, itens de lista curtos (um por linha, separados por \\n). Marque 1 ou 2 palavras-chave por título entre *asteriscos* para destaque.'}

LAYOUTS DISPONÍVEIS (use somente estes ids):
${catalogText()}

FUNDOS DISPONÍVEIS: bg, surface, primary, accent, dark, gradient, continuous
TEXTURAS: ${TEXTURES.map((t) => t.id).join(', ')}
ELEMENTOS CONTÍNUOS (atravessam as páginas do carrossel): ${FLOWS.map((f) => f.id).join(', ')}
ESTILOS DE DESTAQUE: ${HIGHLIGHTS.map((h) => h.id).join(', ')}

REGRAS DE ESTRUTURA:
- A primeira página deve prender a atenção (capa, capa-foto ou dado).
- Em carrosséis com 3 páginas ou mais, a última página é cta.
- Varie os layouts para criar ritmo visual; evite três páginas seguidas iguais, exceto em passo a passo.
- Alterne fundos para dar ritmo, mantendo coerência.
- "hint": uma frase objetiva dizendo o que a designer deve comunicar naquela página (sempre preencha).
- Em "referencias", cite estilos, movimentos e linguagens visuais (ex.: editorial suíço, colagem analógica, minimalismo japonês). Nunca cite obras, marcas ou personagens protegidos.

FORMATO DA RESPOSTA:
{
  "titulo_interno": "nome curto do post",
  "direcao": {
    "conceito": "ideia central em uma frase",
    "tom": "tom de voz recomendado",
    "referencias": ["3 a 5 referências visuais descritas em poucas palavras"],
    "efeitos": { "textura": "id", "fluxo": "id", "destaque": "id" }
  },
  "paginas": [
    { "layout": "id", "fundo": "id", "hint": "...", "campos": { ${FIELD_KEYS.map((k) => `"${k}": ""`).join(', ')} } }
  ]
}`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  let data;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
    });
    const out = await res.json();
    if (!res.ok) {
      return Response.json({ error: `Falha na IA (${res.status}): ${out?.error?.message || 'erro desconhecido'}` }, { status: 502 });
    }
    const text = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    data = extractJSON(text);
  } catch (e) {
    return Response.json({ error: 'Não consegui interpretar a resposta da IA. Tente novamente.' }, { status: 502 });
  }

  const bgs = ['bg', 'surface', 'primary', 'accent', 'dark', 'gradient', 'continuous'];
  let pages = Array.isArray(data.paginas) ? data.paginas : [];
  pages = pages.slice(0, count).map((p) => {
    const fields = {};
    for (const k of FIELD_KEYS) {
      const v = clip(p?.campos?.[k], k === 'body' || k === 'items' ? 600 : 240);
      if (mode === 'rascunho' && v) fields[k] = v;
    }
    return {
      layout: LAYOUT_IDS.includes(p?.layout) ? p.layout : 'texto',
      bg: bgs.includes(p?.fundo) ? p.fundo : 'bg',
      hint: clip(p?.hint, 300),
      fields,
    };
  });
  while (pages.length < count) pages.push({ layout: 'texto', bg: 'bg', hint: '', fields: {} });

  const ef = data?.direcao?.efeitos || {};
  const direction = {
    concept: clip(data?.direcao?.conceito, 400),
    tone: clip(data?.direcao?.tom, 300),
    references: (Array.isArray(data?.direcao?.referencias) ? data.direcao.referencias : []).slice(0, 6).map((r) => clip(r, 160)),
    effects: {
      texture: TEXTURES.some((t) => t.id === ef.textura) ? ef.textura : null,
      flow: FLOWS.some((f) => f.id === ef.fluxo) ? ef.fluxo : null,
      hlStyle: HIGHLIGHTS.some((h) => h.id === ef.destaque) ? ef.destaque : null,
    },
  };

  return Response.json({ title: clip(data.titulo_interno, 80), direction, pages });
}
