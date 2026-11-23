const { json } = require('./http');

function requireJsonBody(req, res) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (!type.includes('application/json')) {
    json(res, 415, { error: 'Send JSON.' });
    return false;
  }
  return true;
}

function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return json(res, 405, { error: 'Method not allowed.' });
}

module.exports = { requireJsonBody, methodNotAllowed };