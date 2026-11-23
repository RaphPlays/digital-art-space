const { getPool } = require('../db');
const { json } = require('../http');
const { getSessionUser } = require('../admin-auth');
const { cleanArtwork } = require('../admin-validation');

async function verifiedArtist(req, res) {
  const user = await getSessionUser(req);
  if (!user) { json(res, 401, { error: 'Please sign in first.' }); return null; }
  if (user.role !== 'artist' || user.artist_status !== 'verified') {
    json(res, 403, { error: 'A verified artist account is required.' }); return null;
  }
  const [rows] = await getPool().execute('SELECT id, slug FROM artists WHERE user_id = ? LIMIT 1', [user.id]);
  if (!rows[0]) { json(res, 403, { error: 'Your account is not linked to an artist profile. Contact an administrator.' }); return null; }
  return { user, artist: rows[0] };
}

function duplicateError(err) { return err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062); }

module.exports = async function (req, res) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE'); return json(res, 405, { error: 'Method not allowed.' });
  }
  if (req.method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'Send JSON.' });
  try {
    const context = await verifiedArtist(req, res);
    if (!context) return;
    const { user, artist } = context;
    const pool = getPool();
    if (req.method === 'GET') {
      const [rows] = await pool.execute(
        'SELECT id, slug, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order, created_at ' +
        'FROM artworks WHERE artist_id = ? ORDER BY sort_order, id', [artist.id]
      );
      return json(res, 200, { artworks: rows.map(row => ({
        id: Number(row.id), slug: row.slug, cardTitle: row.card_title, dialogTitle: row.dialog_title,
        meta: row.meta || '', description: row.description || '', category: row.category,
        orientation: row.orientation, wide: Boolean(row.is_wide), imageUrl: row.image_url,
        imageAlt: row.image_alt || '', sortOrder: Number(row.sort_order || 0), createdAt: row.created_at
      })) });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (req.method === 'POST') {
      const work = cleanArtwork({ ...body, artistSlug: artist.slug, heroOrder: null });
      const [result] = await pool.execute(
        'INSERT INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, hero_order, sort_order, created_by) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)',
        [work.slug, artist.id, work.cardTitle, work.dialogTitle, work.meta, work.description, work.category,
          work.orientation, work.wide ? 1 : 0, work.imageUrl, work.imageAlt, work.sortOrder, user.id]
      );
      return json(res, 201, { ok: true, id: result.insertId });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'A valid artwork ID is required.' });
    const [currentRows] = await pool.execute(
      'SELECT id, slug, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order ' +
      'FROM artworks WHERE id = ? AND artist_id = ? LIMIT 1', [id, artist.id]
    );
    if (!currentRows[0]) return json(res, 404, { error: 'That artwork was not found in your collection.' });
    if (req.method === 'DELETE') {
      await pool.execute('DELETE FROM artworks WHERE id = ? AND artist_id = ?', [id, artist.id]);
      return json(res, 200, { ok: true });
    }
    const row = currentRows[0];
    const work = cleanArtwork({ ...body, artistSlug: artist.slug, heroOrder: null }, {
      slug: row.slug, artistSlug: artist.slug, cardTitle: row.card_title, dialogTitle: row.dialog_title,
      meta: row.meta, description: row.description, category: row.category, orientation: row.orientation,
      wide: Boolean(row.is_wide), imageUrl: row.image_url, imageAlt: row.image_alt, heroOrder: null,
      sortOrder: row.sort_order
    });
    await pool.execute(
      'UPDATE artworks SET slug = ?, card_title = ?, dialog_title = ?, meta = ?, description = ?, category = ?, orientation = ?, is_wide = ?, image_url = ?, image_alt = ?, sort_order = ? WHERE id = ? AND artist_id = ?',
      [work.slug, work.cardTitle, work.dialogTitle, work.meta, work.description, work.category, work.orientation,
        work.wide ? 1 : 0, work.imageUrl, work.imageAlt, work.sortOrder, id, artist.id]
    );
    return json(res, 200, { ok: true });
  } catch (err) {
    if (err && err.message && !err.code) return json(res, 400, { error: err.message });
    if (duplicateError(err)) return json(res, 409, { error: 'That artwork slug is already in use. Choose a different one.' });
    console.error('artist artworks failed:', err);
    return json(res, 500, { error: 'Your artwork could not be saved. Check the server logs for details.' });
  }
};