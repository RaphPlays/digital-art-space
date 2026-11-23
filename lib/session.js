// A login is remembered with a signed cookie. The browser cannot read it
// (HttpOnly) and cannot forge it (it is signed with SESSION_SECRET).
const jwt = require('jsonwebtoken');

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  return s;
}

function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, secret(), { expiresIn: MAX_AGE });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

// Returns the logged-in user's id, or null.
function readSession(req) {
  const header = String(req.headers.cookie || '');
  const part = header.split(';').map(function (c) { return c.trim(); })
    .find(function (c) { return c.startsWith(COOKIE + '='); });
  if (!part) return null;
  try {
    return jwt.verify(part.slice(COOKIE.length + 1), secret()).uid || null;
  } catch (e) {
    return null;
  }
}

module.exports = { setSession, clearSession, readSession };
