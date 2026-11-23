const bcrypt = require('bcryptjs');
const { getPool } = require('../lib/db');
const { setSession } = require('../lib/session');
const { json, guardJsonPost, publicUser } = require('../lib/http');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

module.exports = async function (req, res) {
  if (!guardJsonPost(req, res)) return;

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json(res, 400, { error: 'Enter your email and password.' });

  try {
    const [rows] = await getPool().execute(
      'SELECT id, email, display_name, password_hash, role, artist_status FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return json(res, 401, { error: 'Invalid email or password.' });

    setSession(res, user.id);
    return json(res, 200, { user: publicUser(user) });
  } catch (err) {
    console.error('login failed:', err);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};