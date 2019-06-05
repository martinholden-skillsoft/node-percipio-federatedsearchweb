const crypto = require('crypto');
const qs = require('qs');

/**
 * Parse request and validate the Slack Signing Value
 * For any errors and to obfuscate the response always return a 404 error
 *
 * @param {string} [secret] A string representing Slack signing secret value.
 * @return {Function}
 * @public
 */

function verifySlackSignature(secret) {
  const signingSecret = secret;

  return function verifySignature(req, res, next) {
    // Signing secret not defined end
    if (!signingSecret) {
      // debug('signingSecret not defined');
      return res.status(404).end();
    }

    const requestHeaders = req.headers;

    // Request signature
    const signature = requestHeaders['x-slack-signature'];

    // Slack signature missing
    if (!signature) {
      // debug('slack signature missing');
      return res.status(404).end();
    }

    // Request timestamp
    const ts = requestHeaders['x-slack-request-timestamp'];

    // Slack timestamp missing
    if (!ts) {
      // debug('slack timestamp missing');
      return res.status(404).end();
    }

    // Request body
    const body = qs.stringify(req.body, { format: 'RFC1738' });

    // Divide current date to match Slack ts format
    // Subtract 5 minutes from current time
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

    if (ts < fiveMinutesAgo) {
      // debug('request is older than 5 minutes');
      return res.status(404).end();
    }

    const hmac = crypto.createHmac('sha256', signingSecret);
    const [version, hash] = signature.split('=');
    hmac.update(`${version}:${ts}:${body}`);

    if (crypto.timingSafeCompare(hash, hmac.digest('hex'))) {
      next();
    }

    // debug('request signature is not valid');
    return res.status(404).end();
  };
}

module.exports = verifySlackSignature;
