const { getPool } = require('../../lib/db');
const { json } = require('../../lib/http');
const { requireJsonBody, methodNotAllowed } = require('../../lib/admin-http');
const { requireAdmin } = require('../../lib/admin-auth');
const { cleanArtist } = require('../../lib/admin-validation');

function duplicateError(err) {
  return err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062);
}

module.exports = async function (req, res) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  if (req.method !== 'GET' && !requireJsonBody(req, res)) return;

  try {
    const admin = await requireAdmin(req, res, { write: req.method !== 'GET' });
    if (!admin) return;
    const pool = getPool();

    if (req.method === 'GET') {
      const [artists] = await pool.execute(
        'SELECT a.id, a.slug, a.name, a.role_label, a.bio, a.portrait_url, a.portrait_alt, a.user_id, u.display_name AS owner_name, a.sort_order ' +
        'FROM artists a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.sort_order, a.id'
      );
      const [applications] = await pool.execute(
        "SELECT id, email, display_name, created_at FROM users WHERE artist_status = 'pending' ORDER BY created_at, id"
      );
      return json(res, 200, {
        artists: artists.map(function (row) {
          return {
            id: Number(row.id), slug: row.slug, name: row.name, roleLabel: row.role_label,
            bio: row.bio || '', portraitUrl: row.portrait_url || '', portraitAlt: row.portrait_alt || '',
            ownerUserId: row.user_id === null ? null : Number(row.user_id), ownerName: row.owner_name || null,
            sortOrder: Number(row.sort_order || 0)
          };
        }),
        applications: applications.map(function (row) {
          return { id: Number(row.id), email: row.email, displayName: row.display_name, createdAt: row.created_at };
        })
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (req.method === 'POST') {
      const artist = cleanArtist(body);
      const [result] = await pool.execute(
        'INSERT INTO artists (slug, name, role_label, bio, portrait_url, portrait_alt, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [artist.slug, artist.name, artist.roleLabel, artist.bio, artist.portraitUrl, artist.portraitAlt, artist.sortOrder]
      );
      return json(res, 201, { ok: true, id: result.insertId });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'A valid artist ID is required.' });
    if (req.method === 'DELETE') {
      const [profileRows] = await pool.execute('SELECT user_id FROM artists WHERE id = ? LIMIT 1', [id]);
      if (!profileRows[0]) return json(res, 404, { error: 'That artist no longer exists.' });
      if (profileRows[0].user_id !== null) return json(res, 409, { error: 'This profile is linked to a verified artist account. Unlink the account before deleting the profile.' });
      const [workRows] = await pool.execute('SELECT COUNT(*) AS total FROM artworks WHERE artist_id = ?', [id]);
      const total = Number(workRows[0] && workRows[0].total || 0);
      if (total > 0) return json(res, 409, { error: 'This artist still has ' + total + ' artwork(s). Reassign or remove those works first.' });
      const [result] = await pool.execute('DELETE FROM artists WHERE id = ?', [id]);
      if (!result.affectedRows) return json(res, 404, { error: 'That artist no longer exists.' });
      return json(res, 200, { ok: true });
    }

    const [rows] = await pool.execute(
      'SELECT id, slug, name, role_label, bio, portrait_url, portrait_alt, sort_order FROM artists WHERE id = ? LIMIT 1', [id]
    );
    const row = rows[0];
    if (!row) return json(res, 404, { error: 'That artist no longer exists.' });
    const artist = cleanArtist(body, {
      slug: row.slug, name: row.name, roleLabel: row.role_label, bio: row.bio,
      portraitUrl: row.portrait_url, portraitAlt: row.portrait_alt, sortOrder: row.sort_order
    });
    await pool.execute(
      'UPDATE artists SET slug = ?, name = ?, role_label = ?, bio = ?, portrait_url = ?, portrait_alt = ?, sort_order = ? WHERE id = ?',
      [artist.slug, artist.name, artist.roleLabel, artist.bio, artist.portraitUrl, artist.portraitAlt, artist.sortOrder, id]
    );
    return json(res, 200, { ok: true });
  } catch (err) {
    if (err && err.message && !err.code) return json(res, 400, { error: err.message });
    if (duplicateError(err)) return json(res, 409, { error: 'That artist slug is already in use. Choose a different one.' });
    console.error('admin artists failed:', err);
    return json(res, 500, { error: 'The artist could not be saved. Check the Vercel function logs for details.' });
  }
};