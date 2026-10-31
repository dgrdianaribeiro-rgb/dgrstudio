import { put, list, del, get } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';

const ACCESS = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

// Development-only fallback: set LOCAL_STORE_DIR to keep data on disk instead of Vercel Blob.
const LOCAL = process.env.LOCAL_STORE_DIR && process.env.NODE_ENV !== 'production' ? process.env.LOCAL_STORE_DIR : null;
const localPath = (p) => path.join(LOCAL, p);

async function walk(dir, base = '') {
  let out = [];
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(await walk(path.join(dir, e.name), rel));
    else {
      const st = await fs.stat(path.join(dir, e.name));
      out.push({ pathname: rel, url: rel, size: st.size, uploadedAt: st.mtime });
    }
  }
  return out;
}

export async function listAll(prefix) {
  if (LOCAL) return (await walk(LOCAL)).filter((b) => b.pathname.startsWith(prefix));
  const out = [];
  let cursor;
  do {
    const res = await list({ prefix, cursor, limit: 1000 });
    out.push(...res.blobs);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return out;
}

export async function readJSON(pathname) {
  if (LOCAL) {
    try { return JSON.parse(await fs.readFile(localPath(pathname), 'utf8')); } catch { return null; }
  }
  const res = await get(pathname, { access: ACCESS, useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return await new Response(res.stream).json();
}

export async function writeJSON(pathname, data) {
  if (LOCAL) {
    await fs.mkdir(path.dirname(localPath(pathname)), { recursive: true });
    await fs.writeFile(localPath(pathname), JSON.stringify(data));
    return data;
  }
  await put(pathname, JSON.stringify(data), {
    access: ACCESS,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return data;
}

export async function readCollection(prefix) {
  const blobs = (await listAll(prefix)).filter((b) => b.pathname.endsWith('.json'));
  const docs = await Promise.all(blobs.map((b) => readJSON(b.pathname).catch(() => null)));
  return docs.filter(Boolean);
}

export async function deletePrefix(prefix) {
  const blobs = await listAll(prefix);
  if (!blobs.length) return 0;
  if (LOCAL) await Promise.all(blobs.map((b) => fs.rm(localPath(b.pathname), { force: true })));
  else await del(blobs.map((b) => b.url));
  return blobs.length;
}

export async function deletePath(pathname) {
  if (LOCAL) return fs.rm(localPath(pathname), { force: true });
  await del(pathname);
}

export async function putAsset(pathname, body, contentType) {
  if (LOCAL) {
    const rnd = Math.random().toString(36).slice(2, 10);
    const final = pathname.replace(/(\.[a-z0-9]+)$/i, `-${rnd}$1`);
    await fs.mkdir(path.dirname(localPath(final)), { recursive: true });
    await fs.writeFile(localPath(final), Buffer.from(await body.arrayBuffer()));
    return { pathname: final };
  }
  return await put(pathname, body, {
    access: ACCESS,
    contentType,
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
}

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function getStream(pathname) {
  if (LOCAL) {
    const buf = await fs.readFile(localPath(pathname));
    const ext = pathname.split('.').pop().toLowerCase();
    return { statusCode: 200, stream: new Response(buf).body, blob: { contentType: MIME[ext] || 'application/octet-stream' } };
  }
  return await get(pathname, { access: ACCESS });
}

export function storageConfigured() {
  return Boolean(LOCAL || process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}
