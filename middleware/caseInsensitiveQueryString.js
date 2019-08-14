/**
 * Add proxy to allow all query string keys to lowercase
 *
 * @return {Function}
 * @public
 */

function caseInsensitiveQueryString(req, res, next) {
  req.query = new Proxy(req.query, {
    get: (target, name) =>
      target[Object.keys(target).find(key => key.toLowerCase() === name.toLowerCase())]
  });

  next();
}

module.exports = caseInsensitiveQueryString;
