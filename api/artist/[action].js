const { json } = require('../../lib/http');

const handlers = {
  apply: require('../../lib/artist/apply'),
  profile: require('../../lib/artist/profile'),
  artworks: require('../../lib/artist/artworks')
};

module.exports = async function (req, res) {
  const action = typeof req.query.action === 'string' ? req.query.action : '';
  const handler = handlers[action];
  if (!handler) return json(res, 404, { error: 'Not found.' });
  return handler(req, res);
};
