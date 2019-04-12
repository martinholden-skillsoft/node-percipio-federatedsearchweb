const proxy = require('http-proxy-middleware');

const orgid = process.env.CUSTOMER_ORGID || null;
const bearer = process.env.CUSTOMER_BEARER || null;

// eslint-disable-next-line no-unused-vars
const onProxyReq = (proxyReq, _req, _res) => {
  // add new header to request
  proxyReq.setHeader('Authorization', `Bearer ${bearer}`);
};

// eslint-disable-next-line no-unused-vars
const onProxyRes = (proxyRes, _req, _res) => {
  // add new header to response
  // eslint-disable-next-line no-param-reassign
  proxyRes.headers['x-request-offset'] = _req.query.offset;
  // eslint-disable-next-line no-param-reassign
  proxyRes.headers['x-request-max'] = _req.query.max;
};

// eslint-disable-next-line no-unused-vars
const pathRewrite = (path, _req) => {
  const localPath = path.replace(/^\/percipio\//, '');
  return localPath.replace(/\/ORGID\//, `/${orgid}/`);
};

const proxyOptions = {
  target: 'https://api.percipio.com', // target host
  changeOrigin: true, // needed for virtual hosted sites
  pathRewrite,
  onProxyReq,
  onProxyRes
};

const percipio = proxy(proxyOptions);

module.exports = {
  percipio
};
