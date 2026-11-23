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
    const userId = Number(body.userId);
    const decision = String(body.decision || '');
    const artistId = body.artistId === null || body.artistId === undefined || body.artistId === '' ? null : Number(body.artistId);
    if (!Number.isInteger(userId) || userId < 1 || !['approve', 'reject'].includes(decision)) {
      return json(res, 400, { error: 'Choose a valid application and an approve or reject decision.' });
    }
    if (decision === 'approve' && (!Number.isInteger(artistId) || artistId < 1)) {
      return json(res, 400, { error: 'Choose an unassigned artist profile to link to this account before approving it.' });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute(
        "SELECT id FROM users WHERE id = ? AND artist_status = 'pending' FOR UPDATE", [userId]
      );
      if (!users[0]) {
        await connection.rollback();
        return json(res, 404, { error: 'That application is no longer pending.' });
      }

      if (decision === 'approve') {
        const [existingLinks] = await connection.execute(
          'SELECT id FROM artists WHERE user_id = ? LIMIT 1', [userId]
        );
        if (existingLinks[0]) {
          await connection.rollback();
          return json(res, 409, { error: 'This account is already linked to an artist profile.' });
        }
        const [artistResult] = await connection.execute(
          'UPDATE artists SET user_id = ? WHERE id = ? AND user_id IS NULL', [userId, artistId]
        );
        if (!artistResult.affectedRows) {
          await connection.rollback();
          return json(res, 409, { error: 'That artist profile is already linked to another account, or no longer exists. Refresh and choose another profile.' });
        }
        await connection.execute(
          "UPDATE users SET role = 'artist', artist_status = 'verified' WHERE id = ?", [userId]
        );
      } else {
        await connection.execute(
          "UPDATE users SET role = 'viewer', artist_status = 'none' WHERE id = ?", [userId]
        );
      }
      await connection.commit();
      return json(res, 200, { ok: true, status: decision === 'approve' ? 'verified' : 'rejected', artistId: decision === 'approve' ? artistId : null });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('admin applications failed:', err);
    return json(res, 500, { error: 'The application could not be updated. Check the Vercel function logs for details.' });
  }
};