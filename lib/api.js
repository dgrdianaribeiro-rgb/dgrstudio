async function req(url, opts = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...opts });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Erro ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  status: () => req('/api/auth'),
  login: (password) => req('/api/auth', json({ password })),
  logout: () => req('/api/auth', { method: 'DELETE' }),

  clients: () => req('/api/clients').then((d) => d.clients),
  saveClient: (client) => req('/api/clients', json({ client })).then((d) => d.client),
  deleteClient: (id) => req(`/api/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  posts: (clientId) => req(`/api/posts?clientId=${encodeURIComponent(clientId)}`).then((d) => d.posts),
  savePost: (post) => req('/api/posts', json({ post })).then((d) => d.post),
  deletePost: (clientId, id) => req(`/api/posts?clientId=${encodeURIComponent(clientId)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  assets: (folder) => req(`/api/assets?folder=${encodeURIComponent(folder)}`).then((d) => d.assets),
  upload: (folder, file) => {
    const fd = new FormData();
    fd.append('folder', folder);
    fd.append('file', file);
    return req('/api/assets', { method: 'POST', body: fd }).then((d) => d.asset);
  },
  deleteAsset: (p) => req(`/api/assets?p=${encodeURIComponent(p)}`, { method: 'DELETE' }),

  ai: (payload) => req('/api/ai', json(payload)),

  fonts: () => req('/api/fonts').then((d) => d.fonts),
  uploadFont: (meta, file) => {
    const fd = new FormData();
    Object.entries(meta).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('file', file);
    return req('/api/fonts', { method: 'POST', body: fd }).then((d) => d.font);
  },
  updateFont: (patch) => req('/api/fonts', { ...json(patch), method: 'PATCH' }).then((d) => d.font),
  deleteFont: (id) => req(`/api/fonts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
