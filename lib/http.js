// Small helpers shared by every API file.
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Only accept POST requests that send JSON. Refusing plain HTML-form posts
// is a cheap protection against other websites tricking a logged-in browser.
function guardJsonPost(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { error: 'Method not allowed.' });
    return false;
  }
  const type = String(req.headers['content-type'] || '');
  if (!type.includes('application/json')) {
    json(res, 415, { error: 'Send JSON.' });
    return false;
  }
  return true;
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    artistStatus: row.artist_status
  };
}

module.exports = { json, guardJsonPost, publicUser };
