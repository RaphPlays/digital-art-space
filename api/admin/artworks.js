const { getPool } = require('../../lib/db');
const { json } = require('../../lib/http');
const { requireJsonBody, methodNotAllowed } = require('../../lib/admin-http');
const { requireAdmin } = require('../../lib/admin-auth');
const { cleanArtwork } = require('../../lib/admin-validation');

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
      const [rows] = await pool.execute(
        'SELECT w.id, w.slug, a.slug AS artist_slug, w.card_title, w.dialog_title, w.meta, w.description, ' +
        'w.category, w.orientation, w.is_wide, w.image_url, w.image_alt, w.hero_order, w.sort_order ' +
        'FROM artworks w JOIN artists a ON a.id = w.artist_id ORDER BY w.sort_order, w.id'
      );
      return json(res, 200, { artworks: rows.map(function (row) {
        return {
          id: Number(row.id), slug: row.slug, artistSlug: row.artist_slug,
          cardTitle: row.card_title, dialogTitle: row.dialog_title, meta: row.meta || '',
          description: row.description || '', category: row.category, orientation: row.orientation,
          wide: Boolean(row.is_wide), imageUrl: row.image_url, imageAlt: row.image_alt || '',
          heroOrder: row.hero_order === null ? null : Number(row.hero_order), sortOrder: Number(row.sort_order || 0)
        };
      }) });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (req.method === 'POST') {
      const artwork = cleanArtwork(body);
      const [artistRows] = await pool.execute('SELECT id FROM artists WHERE slug = ? LIMIT 1', [artwork.artistSlug]);
      if (!artistRows[0]) return json(res, 400, { error: 'Choose an artist that already exists.' });

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        if (artwork.heroOrder !== null) {
          await connection.execute('UPDATE artworks SET hero_order = NULL WHERE hero_order = ?', [artwork.heroOrder]);
        }
        const [result] = await connection.execute(
          'INSERT INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, hero_order, sort_order, created_by) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [artwork.slug, artistRows[0].id, artwork.cardTitle, artwork.dialogTitle, artwork.meta, artwork.description,
            artwork.category, artwork.orientation, artwork.wide ? 1 : 0, artwork.imageUrl, artwork.imageAlt,
            artwork.heroOrder, artwork.sortOrder, admin.id]
        );
        await connection.commit();
        return json(res, 201, { ok: true, id: result.insertId });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'A valid artwork ID is required.' });
    if (req.method === 'DELETE') {
      const [result] = await pool.execute('DELETE FROM artworks WHERE id = ?', [id]);
      if (!result.affectedRows) return json(res, 404, { error: 'That artwork no longer exists.' });
      return json(res, 200, { ok: true });
    }

    const [currentRows] = await pool.execute(
      'SELECT w.id, w.slug, a.slug AS artist_slug, w.card_title, w.dialog_title, w.meta, w.description, ' +
      'w.category, w.orientation, w.is_wide, w.image_url, w.image_alt, w.hero_order, w.sort_order ' +
      'FROM artworks w JOIN artists a ON a.id = w.artist_id WHERE w.id = ? LIMIT 1', [id]
    );
    const row = currentRows[0];
    if (!row) return json(res, 404, { error: 'That artwork no longer exists.' });
    const artwork = cleanArtwork(body, {
      slug: row.slug, artistSlug: row.artist_slug, cardTitle: row.card_title, dialogTitle: row.dialog_title,
      meta: row.meta, description: row.description, category: row.category, orientation: row.orientation,
      wide: Boolean(row.is_wide), imageUrl: row.image_url, imageAlt: row.image_alt,
      heroOrder: row.hero_order, sortOrder: row.sort_order
    });
    const [artistRows] = await pool.execute('SELECT id FROM artists WHERE slug = ? LIMIT 1', [artwork.artistSlug]);
    if (!artistRows[0]) return json(res, 400, { error: 'Choose an artist that already exists.' });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (artwork.heroOrder !== null) {
        await connection.execute('UPDATE artworks SET hero_order = NULL WHERE hero_order = ? AND id <> ?', [artwork.heroOrder, id]);
      }
      await connection.execute(
        'UPDATE artworks SET slug = ?, artist_id = ?, card_title = ?, dialog_title = ?, meta = ?, description = ?, ' +
        'category = ?, orientation = ?, is_wide = ?, image_url = ?, image_alt = ?, hero_order = ?, sort_order = ? WHERE id = ?',
        [artwork.slug, artistRows[0].id, artwork.cardTitle, artwork.dialogTitle, artwork.meta, artwork.description,
          artwork.category, artwork.orientation, artwork.wide ? 1 : 0, artwork.imageUrl, artwork.imageAlt,
          artwork.heroOrder, artwork.sortOrder, id]
      );
      await connection.commit();
      return json(res, 200, { ok: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    if (err && err.message && !err.code) return json(res, 400, { error: err.message });
    if (duplicateError(err)) return json(res, 409, { error: 'That slug is already in use. Choose a different one.' });
    console.error('admin artworks failed:', err);
    return json(res, 500, { error: 'The artwork could not be saved. Check the Vercel function logs for details.' });
  }
};