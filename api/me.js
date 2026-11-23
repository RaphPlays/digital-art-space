const { getPool } = require('../lib/db');
const { readSession } = require('../lib/session');
const { json, publicUser } = require('../lib/http');

module.exports = async function (req, res) {
  const uid = readSession(req);
  if (!uid) return json(res, 200, { user: null });
  try {
    const [rows] = await getPool().execute(
      'SELECT id, email, display_name, role, artist_status FROM users WHERE id = ?',
      [uid]
    );
    return json(res, 200, { user: rows[0] ? publicUser(rows[0]) : null });
  } catch (err) {
    console.error('me failed:', err);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};