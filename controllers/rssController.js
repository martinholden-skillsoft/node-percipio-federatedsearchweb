const asyncHandler = require('express-async-handler');
const axios = require('axios');
const _ = require('lodash');
const RSS = require('rss');

const orgid = process.env.CUSTOMER_ORGID || null;
const bearer = process.env.CUSTOMER_BEARER || null;
const percipioSite = process.env.PERCIPIOSITE || null;

const getSearchResults = async request => {
  let requestParams = request || {};

  const requestDefaults = {
    max: 20,
    offset: 0,
    q: request.searchTerms
  };

  // merge opt with default config
  _.defaults(requestParams, requestDefaults);

  // Remove any nulls
  requestParams = _.omitBy(requestParams, _.isNil);

  const axiosConfig = {
    url: `https://api.percipio.com/content-discovery/v1/organizations/${orgid}/search-content`,
    headers: {
      Authorization: `Bearer ${bearer}`
    },
    method: 'GET',
    params: requestParams
  };

  return axios.request(axiosConfig);
};

// Handle rss
const view = (req, res) => {
  const { searchTerms } = req.query;
  res.header('Content-Type', 'application/rss+xml');
  res.render('rss', { title: 'Percipio Search', searchTerms });
};

const asyncview = asyncHandler(async (req, res) => {
  /* 
    if there is an error thrown in getUserFromDb, asyncMiddleware
    will pass it to next() and express will handle the error;
  */
  let { searchTerms, startIndex, count, diagnostics } = req.query;

  searchTerms = searchTerms || 'leadership';
  diagnostics = diagnostics || null;
  startIndex = parseInt(startIndex, 10) || 0;
  count = parseInt(count, 10) || 20;

  const request = {
    max: count,
    offset: startIndex,
    q: searchTerms
  };

  // const user = await getUserFromDb({ id: req.params.id })
  const { data, headers } = await getSearchResults(request);

  const totalRecords = parseInt(headers['x-total-count'], 10);

  const reformattedData = data.map(obj => {
    const rObj = obj;
    rObj.wrappedDescription = `<![CDATA[${obj.localizedMetadata[0].description}]]>`;
    return rObj;
  });

  res.header('Content-Type', 'application/rss+xml');

  /* lets create an rss feed */
  const feed = new RSS({
    title: 'Percipio Search',
    description: `Search results for "${searchTerms}" at ${percipioSite}`,
    feed_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    site_url: `${req.protocol}://${req.get('host')}`,
    ttl: '60',
    custom_namespaces: {
      opensearch: 'http://a9.com/-/spec/opensearch/1.1/'
    },
    custom_elements: [
      { 'opensearch:totalResults': totalRecords },
      { 'opensearch:startIndex': startIndex },
      { 'opensearch:itemsPerPage': count },
      {
        'opensearch:Query': [
          {
            _attr: {
              role: 'request'
            }
          },
          {
            _attr: {
              searchTerms
            }
          },
          {
            _attr: {
              startIndex
            }
          },
          {
            _attr: {
              count
            }
          }
        ]
      }
    ]
  });

  if (!_.isNull(diagnostics)) {
    feed.item({
      title: 'Diagnostics',
      description: JSON.stringify(req.query),
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`
    });
  }
  _.forEach(reformattedData, value => {
    feed.item({
      title: value.localizedMetadata[0].title,
      description: value.localizedMetadata[0].description,
      url: value.link,
      author: _.join(value.by, ','),
      enclosure: { url: value.imageUrl }
    });
  });

  res.send(feed.xml({ indent: '\t' }));
});

module.exports = {
  view,
  asyncview
};
