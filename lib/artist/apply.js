const { getPool } = require('../db');
const { json, publicUser } = require('../http');
const { getSessionUser } = require('../admin-auth');

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  if (!host) return false;
  try {
    const url = new URL(origin);
    const proto = String(req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim().toLowerCase();
    return url.host.toLowerCase() === host && url.protocol === proto + ':';
  } catch (_) { return false; }
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return json(res, 415, { error: 'Send JSON.' });
  }
  if (!sameOrigin(req)) return json(res, 403, { error: 'This request did not come from this website.' });

  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return json(res, 401, { error: 'Please sign in before applying.' });
    if (sessionUser.role !== 'viewer' || !['none', 'pending'].includes(sessionUser.artist_status)) {
      return json(res, 403, { error: 'Only viewer accounts can submit an artist application.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const portfolioUrl = String(body.portfolioUrl || '').trim();
    const artistBio = String(body.artistBio || '').trim();
    const statement = String(body.statement || '').trim();

    if (portfolioUrl.length > 500) return json(res, 400, { error: 'Portfolio link must be 500 characters or fewer.' });
    if (portfolioUrl) {
      try {
        const parsed = new URL(portfolioUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
      } catch (_) { return json(res, 400, { error: 'Enter a valid portfolio URL beginning with https:// or http://.' }); }
    }
    if (artistBio.length < 30 || artistBio.length > 1200) {
      return json(res, 400, { error: 'Artist bio must be between 30 and 1,200 characters.' });
    }
    if (statement.length < 30 || statement.length > 1500) {
      return json(res, 400, { error: 'Application statement must be between 30 and 1,500 characters.' });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute(
        'SELECT id, email, display_name, role, artist_status FROM users WHERE id = ? FOR UPDATE',
        [sessionUser.id]
      );
      const user = users[0];
      if (!user || user.role !== 'viewer' || !['none', 'pending'].includes(user.artist_status)) {
        await connection.rollback();
        return json(res, 409, { error: 'Your account status changed. Refresh the page and try again.' });
      }
      await connection.execute(
        'INSERT INTO artist_applications (user_id, portfolio_url, artist_bio, statement, submitted_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ' +
        'ON DUPLICATE KEY UPDATE portfolio_url = VALUES(portfolio_url), artist_bio = VALUES(artist_bio), statement = VALUES(statement), submitted_at = CURRENT_TIMESTAMP',
        [user.id, portfolioUrl || null, artistBio, statement]
      );
      await connection.execute(
        "UPDATE users SET artist_status = 'pending' WHERE id = ? AND role = 'viewer'",
        [user.id]
      );
      await connection.commit();
      user.artist_status = 'pending';
      return json(res, 200, { ok: true, user: publicUser(user), message: 'Your application has been submitted for review.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('artist application failed:', err);
    return json(res, 500, { error: 'Your application could not be submitted. Check the Vercel function logs for details.' });
  }
};