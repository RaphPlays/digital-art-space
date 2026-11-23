// POST /api/logout
const { clearSession } = require('../lib/session');
const { json, guardJsonPost } = require('../lib/http');

module.exports = function (req, res) {
  if (!guardJsonPost(req, res)) return;
  clearSession(res);
  return json(res, 200, { ok: true });
};
