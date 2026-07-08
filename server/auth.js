// Простая аутентификация команды: общий пароль → подписанная httpOnly-кука.
// Без внешних зависимостей — только встроенный crypto (работает на любой Node 18+).
const crypto = require('crypto');

const COOKIE = 'pdc_auth';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

function secret() {
  return process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
}

// token = <expires>.<hmac(expires)>
function sign(expires) {
  const h = crypto.createHmac('sha256', secret()).update(String(expires)).digest('base64url');
  return `${expires}.${h}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return false;
  const [expStr, mac] = token.split('.');
  const exp = Number(expStr);
  if (!exp || !mac) return false;
  if (Date.now() > exp) return false;
  const expected = crypto.createHmac('sha256', secret()).update(String(exp)).digest('base64url');
  // сравнение постоянного времени
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function setAuthCookie(res) {
  const exp = Date.now() + TTL_MS;
  const token = sign(exp);
  const attrs = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
    'Secure',
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function isAuthed(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE]);
}

// Проверка пароля с защитой от тайминг-атак
function checkPassword(input) {
  const expected = process.env.APP_PASSWORD || '';
  if (!expected) return false;
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'unauthorized' });
}

module.exports = { setAuthCookie, clearAuthCookie, isAuthed, checkPassword, requireAuth };
