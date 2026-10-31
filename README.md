# Dgr Studio · gerador de posts

Estúdio da Dgr Creative para criar artes únicas (1080 × 1350) e carrosséis de 2 a 20 páginas com a identidade de cada cliente. O carrossel é montado como uma tira contínua (1080 × N por 1350) e exportado fatiado em PNGs de 1080 × 1350, numerados, em um ZIP.

## O que tem dentro

- **Clientes**: paleta de 6 cores, fontes de título e texto, peso, cantos, logo, textura padrão e o método de copy de cada cliente.
- **Formato**: arte única ou carrossel com a quantidade de páginas que você definir; o tamanho do canvas é calculado na hora.
- **11 layouts com espaços reservados**: capa, capa com foto, tópico, lista, citação, dado em destaque, foto + texto, comparativo, texto livre, foto inteira e fechamento/CTA. Campos vazios não aparecem na exportação.
- **Referências de estrutura**: sequências prontas (educativo, mito x verdade, lista, reflexão, passo a passo, dado de impacto, vitrine).
- **Efeitos**: texturas (granulado, papel, pontilhado, grade, linhas), elementos contínuos que atravessam as emendas do carrossel (onda, linha, círculos, faixa), fundo em gradiente contínuo, brilho, moldura, numeração, @, seta e logo.
- **Destaque de palavras**: escreva entre `*asteriscos*` e escolha o estilo (cor, marca-texto, sublinhado, itálico, caixa).
- **Biblioteca de imagens** por cliente, mais uma pasta geral.
- **IA (opcional)**: a partir do assunto, define layouts, fundos e o que dizer em cada página, sugere direção criativa e referências visuais. Pode só estruturar ou também rascunhar textos, respeitando o método do cliente.
- **Posts salvos** por cliente, com "duplicar só a estrutura" para produção em massa.

## Publicar no Vercel

### Caminho A · pelo GitHub (recomendado)

1. Crie um repositório no GitHub e envie o conteúdo desta pasta (sem `node_modules` e `.next`).
2. No Vercel: **Add New → Project → Import** o repositório. O framework Next.js é detectado sozinho. Clique em **Deploy**.
3. Siga a seção **Configurar** abaixo.

### Caminho B · pelo terminal

```bash
npm i -g vercel
vercel login
vercel          # dentro desta pasta; aceite as sugestões
vercel --prod
```

## Configurar (uma vez)

1. **Armazenamento**: no projeto, aba **Storage → Create → Blob**, escolha acesso **Private** e conecte ao projeto. Isso cria a variável `BLOB_READ_WRITE_TOKEN` automaticamente.
   - Se criar como Public por engano, adicione a variável `BLOB_ACCESS` = `public`.
2. **Variáveis** em **Settings → Environment Variables**:
   - `APP_PASSWORD`: a senha para entrar no estúdio (obrigatória).
   - `ANTHROPIC_API_KEY`: sua chave da API da Anthropic, para ativar a IA (opcional).
   - `ANTHROPIC_MODEL`: opcional; o padrão é `claude-sonnet-5-5`.
3. **Deployments → ⋯ → Redeploy** para as variáveis valerem.

## Rodar no computador

```bash
npm install
APP_PASSWORD=teste LOCAL_STORE_DIR=./dados-locais npm run dev
```

Com `LOCAL_STORE_DIR`, clientes, posts e imagens ficam numa pasta local em vez do Vercel Blob (só em desenvolvimento).

## Atalhos

- `Ctrl/Cmd + S` salva o post.
- `Ctrl/Cmd + Z` desfaz (fora dos campos de texto).
