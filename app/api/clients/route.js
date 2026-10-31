import { guard, validId } from '@/lib/server/auth';
import { deletePrefix, readCollection, writeJSON } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  try {
    const clients = await readCollection('data/clients/');
    clients.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
    return Response.json({ clients });
  } catch (e) {
    return Response.json({ error: 'Falha ao ler clientes: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const { client } = await req.json().catch(() => ({}));
  if (!client || !validId(client.id) || !String(client.name || '').trim()) {
    return Response.json({ error: 'Cliente inválido.' }, { status: 400 });
  }
  client.updatedAt = Date.now();
  await writeJSON(`data/clients/${client.id}.json`, client);
  return Response.json({ client });
}

export async function DELETE(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const id = new URL(req.url).searchParams.get('id');
  if (!validId(id)) return Response.json({ error: 'ID inválido.' }, { status: 400 });
  await deletePrefix(`data/clients/${id}.json`);
  await deletePrefix(`data/posts/${id}/`);
  await deletePrefix(`assets/${id}/`);
  return Response.json({ ok: true });
}
