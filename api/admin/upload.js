const { handleUpload } = require('@vercel/blob/client');
const { getSessionUser } = require('../../lib/admin-auth');
const { json } = require('../../lib/http');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const PATH_PATTERN = /^digital-art-space\/(?:artworks|artists)\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$/;

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const origin = req.headers.origin;
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
    if (origin) {
      const originUrl = new URL(origin);
      const forwardedProto = String(req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim().toLowerCase();
      if (!host || originUrl.host.toLowerCase() !== host || originUrl.protocol !== forwardedProto + ':') {
        return json(res, 403, { error: 'This request did not come from this website.' });
      }
    }
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(String(req.body || '{}'));
    const token = process.env.DARTS_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    const result = await handleUpload({
      body,
      request: req,
      ...(token ? { token: token } : {}),
      onBeforeGenerateToken: async function (pathname, clientPayload, multipart) {
        const user = await getSessionUser(req);
        if (!user) {
          const error = new Error('Please sign in with an administrator account.');
          error.statusCode = 401;
          throw error;
        }
        if (user.role !== 'admin') {
          const error = new Error('Administrator access is required to upload images.');
          error.statusCode = 403;
          throw error;
        }
        if (!PATH_PATTERN.test(pathname)) {
          const error = new Error('Invalid upload filename.');
          error.statusCode = 400;
          throw error;
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: Number(user.id), purpose: 'admin-image' })
        };
      },
      onUploadCompleted: async function ({ blob, tokenPayload }) {
        console.info('Digital Art Space image upload completed:', blob.pathname, tokenPayload || '');
      }
    });
    return json(res, 200, result);
  } catch (err) {
    const status = Number(err && err.statusCode) || 400;
    console.error('admin upload failed:', err);
    return json(res, status, { error: status === 400 ? (err.message || 'The upload could not be started.') : err.message });
  }
};