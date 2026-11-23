const { getPool } = require('../../lib/db');
const { json } = require('../../lib/http');
const { requireJsonBody, methodNotAllowed } = require('../../lib/admin-http');
const { requireAdmin } = require('../../lib/admin-auth');

module.exports = async function (req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  if (!requireJsonBody(req, res)) return;
  try {
    const admin = await requireAdmin(req, res, { write: true });
    if (!admin) return;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const artistId = Number(body.artistId);
    if (!Number.isInteger(artistId) || artistId < 1) return json(res, 400, { error: 'A valid artist profile is required.' });

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT user_id FROM artists WHERE id = ? FOR UPDATE', [artistId]);
      if (!rows[0]) {
        await connection.rollback();
        return json(res, 404, { error: 'That artist profile no longer exists.' });
      }
      const userId = rows[0].user_id;
      if (userId === null) {
        await connection.rollback();
        return json(res, 409, { error: 'That artist profile is not linked to an account.' });
      }
      await connection.execute('UPDATE artists SET user_id = NULL WHERE id = ?', [artistId]);
      await connection.execute("UPDATE users SET role = CASE WHEN role = 'artist' THEN 'viewer' ELSE role END, artist_status = CASE WHEN artist_status = 'verified' THEN 'none' ELSE artist_status END WHERE id = ?", [userId]);
      await connection.commit();
      return json(res, 200, { ok: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('admin artist unlink failed:', err);
    return json(res, 500, { error: 'The artist account could not be unlinked. Check the Vercel function logs for details.' });
  }
};