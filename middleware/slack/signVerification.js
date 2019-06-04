const crypto = require('crypto');
const qs = require('qs');

// fetch this from environment variables
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

// eslint-disable-next-line consistent-return
const signVerification = (req, res, next) => {
  const slackSignature = req.headers['x-slack-signature'];
  const requestBody = qs.stringify(req.body, { format: 'RFC1738' });
  const timestamp = req.headers['x-slack-request-timestamp'];
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return res.status(404);
  }
  if (!slackSigningSecret) {
    return res.status(404);
  }
  if (!slackSignature) {
    return res.status(404);
  }
  const sigBasestring = `v0:${timestamp}:${requestBody}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', slackSigningSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex')}`;

  if (
    crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))
  ) {
    next();
  } else {
    return res.status(404);
  }
};

module.exports = signVerification;
