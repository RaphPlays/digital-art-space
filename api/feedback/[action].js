const handler = require('../../lib/feedback/handler');

module.exports = async function (req, res) {
  return handler(req, res);
};
