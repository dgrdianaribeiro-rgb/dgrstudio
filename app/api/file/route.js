import { guard } from '@/lib/server/auth';
import { getStream } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const p = new URL(req.url).searchParams.get('p');
  if (!p || !/^(assets\/[a-z0-9-]+|fonts)\/[^/]+$/i.test(p)) {
    return new Response('Bad request', { status: 400 });
  }
  const result = await getStream(p).catch(() => null);
  if (!result || result.statusCode !== 200) return new Response('Not found', { status: 404 });
  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
