const { getPool } = require('../../lib/db');
const { json } = require('../../lib/http');
const { getSessionUser } = require('../../lib/admin-auth');
const { cleanText, cleanImageUrl } = require('../../lib/admin-validation');

async function verifiedArtist(req, res) {
  const user = await getSessionUser(req);
  if (!user) { json(res, 401, { error: 'Please sign in first.' }); return null; }
  if (user.role !== 'artist' || user.artist_status !== 'verified') {
    json(res, 403, { error: 'A verified artist account is required.' }); return null;
  }
  const [rows] = await getPool().execute(
    'SELECT id, slug, name, role_label, bio, portrait_url, portrait_alt FROM artists WHERE user_id = ? LIMIT 1', [user.id]
  );
  if (!rows[0]) { json(res, 403, { error: 'Your account is not linked to an artist profile. Contact an administrator.' }); return null; }
  return { user, artist: rows[0] };
}

module.exports = async function (req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH'); return json(res, 405, { error: 'Method not allowed.' }); }
  if (req.method === 'PATCH' && !String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'Send JSON.' });
  try {
    const context = await verifiedArtist(req, res);
    if (!context) return;
    const { artist } = context;
    if (req.method === 'GET') return json(res, 200, { artist: {
      id: Number(artist.id), slug: artist.slug, name: artist.name, roleLabel: artist.role_label,
      bio: artist.bio || '', portraitUrl: artist.portrait_url || '', portraitAlt: artist.portrait_alt || ''
    }});

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = cleanText(body.name === undefined ? artist.name : body.name, 120, 'Artist name', { required: true });
    const roleLabel = cleanText(body.roleLabel === undefined ? artist.role_label : body.roleLabel, 120, 'Role', { required: true });
    const bio = cleanText(body.bio === undefined ? artist.bio : body.bio, 1600, 'Bio');
    const portraitUrl = cleanImageUrl(body.portraitUrl === undefined ? artist.portrait_url : body.portraitUrl, 'Portrait URL', false);
    const portraitAlt = cleanText(body.portraitAlt === undefined ? artist.portrait_alt : body.portraitAlt, 200, 'Portrait description');
    await getPool().execute(
      'UPDATE artists SET name = ?, role_label = ?, bio = ?, portrait_url = ?, portrait_alt = ? WHERE id = ? AND user_id = ?',
      [name, roleLabel, bio, portraitUrl, portraitAlt, artist.id, context.user.id]
    );
    return json(res, 200, { ok: true });
  } catch (err) {
    if (err && err.message && !err.code) return json(res, 400, { error: err.message });
    console.error('artist profile failed:', err);
    return json(res, 500, { error: 'Your profile could not be saved. Check the server logs for details.' });
  }
};