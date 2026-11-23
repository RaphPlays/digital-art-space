const { getPool } = require('./db');
const { readSession } = require('./session');

async function getSessionUser(req) {
  const userId = readSession(req);
  if (!userId) return null;

  const [rows] = await getPool().execute(
    'SELECT id, email, display_name, role, artist_status FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;

  const forwardedHost = req.headers['x-forwarded-host'];
  const host = String(forwardedHost || req.headers.host || '').split(',')[0].trim().toLowerCase();
  if (!host) return false;

  try {
    const url = new URL(origin);
    const forwardedProto = String(req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim().toLowerCase();
    return url.host.toLowerCase() === host && url.protocol === forwardedProto + ':';
  } catch (error) {
    return false;
  }
}

async function requireAdmin(req, res, options) {
  const settings = options || {};
  if (settings.write && !isSameOrigin(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'This request did not come from this website.' }));
    return null;
  }

  const user = await getSessionUser(req);
  if (!user) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Please sign in with an administrator account.' }));
    return null;
  }
  if (user.role !== 'admin') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Administrator access is required.' }));
    return null;
  }
  return user;
}

module.exports = { getSessionUser, requireAdmin };