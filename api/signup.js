// POST /api/signup  { email, displayName, password, wantsArtist? }
// Everyone starts as a "viewer". Asking to be an artist only sets the
// application to "pending"; an admin must verify it. The browser can never
// choose its own role.
const bcrypt = require('bcryptjs');
const { getPool } = require('../lib/db');
const { setSession } = require('../lib/session');
const { json, guardJsonPost, publicUser } = require('../lib/http');

module.exports = async function (req, res) {
  if (!guardJsonPost(req, res)) return;

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const displayName = String(body.displayName || '').trim();
  const password = String(body.password || '');
  const artistStatus = body.wantsArtist === true ? 'pending' : 'none';

  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { error: 'Enter a valid email address.' });
  }
  if (displayName.length < 2 || displayName.length > 80) {
    return json(res, 400, { error: 'Display name must be 2 to 80 characters.' });
  }
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return json(res, 400, { error: 'Password must be 8 to 72 characters.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await getPool().execute(
      'INSERT INTO users (email, display_name, password_hash, role, artist_status) VALUES (?, ?, ?, ?, ?)',
      [email, displayName, hash, 'viewer', artistStatus]
    );
    setSession(res, result.insertId);
    return json(res, 201, {
      user: publicUser({ id: result.insertId, email: email, display_name: displayName, role: 'viewer', artist_status: artistStatus })
    });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      return json(res, 409, { error: 'That email is already registered.' });
    }
    console.error('signup failed:', err);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};
