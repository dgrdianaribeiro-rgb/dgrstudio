import { NextResponse } from 'next/server';
import { COOKIE, checkPassword, isAuthed, isConfigured, sessionToken } from '@/lib/server/auth';
import { storageConfigured } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  return Response.json({
    configured: isConfigured(),
    authed: isAuthed(req),
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    storage: storageConfigured(),
  });
}

export async function POST(req) {
  if (!isConfigured()) return Response.json({ error: 'not_configured' }, { status: 503 });
  const { password } = await req.json().catch(() => ({}));
  // small delay to slow down guessing
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password || '')) {
    return Response.json({ error: 'Senha incorreta.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
