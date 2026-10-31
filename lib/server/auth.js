import crypto from 'node:crypto';

export const COOKIE = 'dgr_session';

function expectedToken() {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return null;
  return crypto.createHmac('sha256', pass).update('dgr-studio-session-v1').digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function isConfigured() {
  return Boolean(process.env.APP_PASSWORD);
}

export function isAuthed(req) {
  const token = expectedToken();
  if (!token) return false;
  const cookie = req.cookies.get(COOKIE)?.value;
  return Boolean(cookie) && safeEqual(cookie, token);
}

export function checkPassword(input) {
  // trim both sides: pasted values often carry an invisible space or line break
  const pass = String(process.env.APP_PASSWORD || '').trim();
  input = String(input || '').trim();
  if (!pass) return false;
  const h = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
  return safeEqual(h(input), h(pass));
}

export function sessionToken() {
  return expectedToken();
}

/** Returns a Response when the request must be blocked, otherwise null. */
export function guard(req) {
  if (!isConfigured()) {
    return Response.json({ error: 'not_configured' }, { status: 503 });
  }
  if (!isAuthed(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export function validId(id) {
  return typeof id === 'string' && /^[a-z0-9-]{3,64}$/i.test(id);
}
