const { getPool } = require('../lib/db');
const { json } = require('../lib/http');

module.exports = async function (req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  try {
    const pool = getPool();
    const [artists] = await pool.execute(
      'SELECT id, slug, name, role_label, bio, portrait_url, portrait_alt FROM artists ORDER BY sort_order, id'
    );
    const [artworks] = await pool.execute(
      'SELECT w.slug, a.slug AS artist_slug, w.card_title, w.dialog_title, w.meta, w.description, ' +
      'w.category, w.orientation, w.is_wide, w.image_url, w.image_alt, w.hero_order ' +
      'FROM artworks w JOIN artists a ON a.id = w.artist_id ORDER BY w.sort_order, w.id'
    );
    return json(res, 200, {
      artists: artists.map(function (a) {
        return { slug: a.slug, name: a.name, role: a.role_label, bio: a.bio, portraitUrl: a.portrait_url, portraitAlt: a.portrait_alt };
      }),
      artworks: artworks.map(function (w) {
        return {
          slug: w.slug, artist: w.artist_slug, cardTitle: w.card_title, dialogTitle: w.dialog_title,
          meta: w.meta, description: w.description, category: w.category, orientation: w.orientation,
          wide: Boolean(w.is_wide), imageUrl: w.image_url, imageAlt: w.image_alt,
          heroOrder: w.hero_order === null || w.hero_order === undefined ? null : Number(w.hero_order)
        };
      })
    });
  } catch (err) {
    console.error('gallery failed:', err);
    return json(res, 500, { error: 'Could not load the gallery.' });
  }
};