const { getPool } = require('../db');
const { json } = require('../http');
const { getSessionUser, requireAdmin } = require('../admin-auth');

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

function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return json(res, 405, { error: 'Method not allowed.' });
}

module.exports = async function (req, res) {
  const action = typeof req.query.action === 'string' ? req.query.action : '';
  const pool = getPool();

  try {
    if (action === 'artwork' && req.method === 'GET') {
      const slug = String(req.query.slug || '').trim();
      if (!slug || slug.length > 80) return json(res, 400, { error: 'A valid artwork slug is required.' });
      const [works] = await pool.execute('SELECT id FROM artworks WHERE slug = ? LIMIT 1', [slug]);
      if (!works[0]) return json(res, 404, { error: 'Artwork not found.' });
      const [summary] = await pool.execute(
        "SELECT COUNT(rating) AS rating_count, AVG(rating) AS average_rating FROM artwork_feedback WHERE artwork_id = ? AND status = 'approved'",
        [works[0].id]
      );
      const [items] = await pool.execute(
        "SELECT f.id, f.comment, f.rating, f.created_at, u.display_name AS display_name FROM artwork_feedback f JOIN users u ON u.id = f.user_id WHERE f.artwork_id = ? AND f.status = 'approved' ORDER BY f.created_at DESC LIMIT 100",
        [works[0].id]
      );
      return json(res, 200, {
        ratingCount: Number(summary[0].rating_count || 0),
        averageRating: summary[0].average_rating === null ? null : Number(Number(summary[0].average_rating).toFixed(1)),
        feedback: items.map(row => ({ id: Number(row.id), comment: row.comment || '', rating: row.rating === null ? null : Number(row.rating), displayName: row.display_name, createdAt: row.created_at }))
      });
    }

    if (action === 'queue' && req.method === 'GET') {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const [rows] = await pool.execute(
        "SELECT f.id, f.comment, f.rating, f.created_at, w.slug AS artwork_slug, w.card_title, u.display_name FROM artwork_feedback f JOIN artworks w ON w.id = f.artwork_id JOIN users u ON u.id = f.user_id WHERE f.status = 'pending' ORDER BY f.created_at ASC LIMIT 200"
      );
      return json(res, 200, { feedback: rows.map(row => ({ id: Number(row.id), comment: row.comment || '', rating: row.rating === null ? null : Number(row.rating), createdAt: row.created_at, artworkSlug: row.artwork_slug, artworkTitle: row.card_title, displayName: row.display_name })) });
    }

    if (action === 'submit' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'This request did not come from this website.' });
      if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'Send JSON.' });
      const user = await getSessionUser(req);
      if (!user) return json(res, 401, { error: 'Sign in to leave feedback.' });
      if (user.role === 'admin') return json(res, 403, { error: 'Administrator accounts cannot submit visitor feedback.' });
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const slug = String(body.artworkSlug || '').trim();
      const comment = String(body.comment || '').trim();
      const rating = body.rating === null || body.rating === '' || body.rating === undefined ? null : Number(body.rating);
      if (!slug || slug.length > 80) return json(res, 400, { error: 'Choose a valid artwork.' });
      if (comment.length > 2000 || (comment && comment.length < 3)) return json(res, 400, { error: 'Comments must be between 3 and 2,000 characters.' });
      if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return json(res, 400, { error: 'Choose a rating from 1 to 5.' });
      if (!comment && rating === null) return json(res, 400, { error: 'Add a comment or choose a rating.' });
      const [works] = await pool.execute('SELECT id FROM artworks WHERE slug = ? LIMIT 1', [slug]);
      if (!works[0]) return json(res, 404, { error: 'Artwork not found.' });
      await pool.execute(
        "INSERT INTO artwork_feedback (artwork_id, user_id, comment, rating, status) VALUES (?, ?, ?, ?, 'pending') ON DUPLICATE KEY UPDATE comment = VALUES(comment), rating = VALUES(rating), status = 'pending', updated_at = CURRENT_TIMESTAMP",
        [works[0].id, user.id, comment || null, rating]
      );
      return json(res, 200, { ok: true, status: 'pending', message: 'Thanks! Your feedback is waiting for admin approval.' });
    }

    if (action === 'moderate' && req.method === 'PATCH') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'This request did not come from this website.' });
      if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'Send JSON.' });
      const admin = await requireAdmin(req, res, { write: true });
      if (!admin) return;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const id = Number(body.id);
      const status = String(body.status || '');
      if (!Number.isInteger(id) || id < 1 || !['approved', 'rejected'].includes(status)) return json(res, 400, { error: 'A valid feedback ID and moderation decision are required.' });
      const [result] = await pool.execute('UPDATE artwork_feedback SET status = ? WHERE id = ? AND status = \'pending\'', [status, id]);
      if (!result.affectedRows) return json(res, 404, { error: 'That pending feedback could not be found.' });
      return json(res, 200, { ok: true });
    }

    if (action === 'remove' && req.method === 'DELETE') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'This request did not come from this website.' });
      const user = await getSessionUser(req);
      if (!user) return json(res, 401, { error: 'Sign in to remove your feedback.' });
      const id = Number(req.query.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'A valid feedback ID is required.' });
      const [result] = await pool.execute('DELETE FROM artwork_feedback WHERE id = ? AND user_id = ?', [id, user.id]);
      if (!result.affectedRows) return json(res, 404, { error: 'Your feedback could not be found.' });
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: 'Not found.' });
  } catch (err) {
    console.error('feedback API failed:', err);
    return json(res, 500, { error: 'Feedback could not be processed. Please try again.' });
  }
};
