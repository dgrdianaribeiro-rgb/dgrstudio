import { guard, validId } from '@/lib/server/auth';
import { deletePrefix, readCollection, writeJSON } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const clientId = new URL(req.url).searchParams.get('clientId');
  if (!validId(clientId)) return Response.json({ error: 'Cliente inválido.' }, { status: 400 });
  const posts = await readCollection(`data/posts/${clientId}/`);
  posts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return Response.json({ posts });
}

export async function POST(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const { post } = await req.json().catch(() => ({}));
  if (!post || !validId(post.id) || !validId(post.clientId) || !Array.isArray(post.pages)) {
    return Response.json({ error: 'Post inválido.' }, { status: 400 });
  }
  post.updatedAt = Date.now();
  await writeJSON(`data/posts/${post.clientId}/${post.id}.json`, post);
  return Response.json({ post });
}

export async function DELETE(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const sp = new URL(req.url).searchParams;
  const id = sp.get('id');
  const clientId = sp.get('clientId');
  if (!validId(id) || !validId(clientId)) return Response.json({ error: 'ID inválido.' }, { status: 400 });
  await deletePrefix(`data/posts/${clientId}/${id}.json`);
  return Response.json({ ok: true });
}
