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
      opensearch: 'http://a9.com/-/spec/opensearch/1.1/',
      media: 'http://search.yahoo.com/mrss/'
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
    let courseInfo = null;
    if (!_.isNull(value.associations.parent)) {
      courseInfo = [
        '<span>From course: </span>',
        '<ul>',
        `<li><a href="${value.associations.parent.link}" target="_blank">${
          value.associations.parent.title
        }</a></li>`,
        '</ul>'
      ].join('');
    }

    let channelInfo = null;
    if (!_.isNull(value.associations.channels) && !_.isEmpty(value.associations.channels)) {
      const channelInfoArray = ['<span>From channel: </span>', '<ul>'];

      _.forEach(value.associations.channels, channelValue => {
        channelInfoArray.push(
          `<li><a href="${channelValue.link}" class="card-link" target="_blank">${
            channelValue.title
          }</a></li>`
        );
      });
      channelInfoArray.push('</ul>');

      channelInfo = channelInfoArray.join('');
    }

    const htmlDescription = [
      '<div>',
      `<a href="${value.link}" target="_blank">`,
      `<img alt="${value.contentType.displayLabel} | ${value.localizedMetadata[0].title}" src="${
        value.imageUrl
      }?width=200" width="200">`,
      '</a>',
      '</div>',
      '<div>',
      `${value.localizedMetadata[0].description}`,
      '</div>',
      '<div>',
      `${!_.isNull(courseInfo) ? courseInfo : ''}`,
      '</div>',
      '<div>',
      `${!_.isNull(channelInfo) ? channelInfo : ''}`,
      '</div>'
    ].join('');

    feed.item({
      title: `${value.contentType.displayLabel} | ${value.localizedMetadata[0].title}`,
      description: htmlDescription,
      url: value.link,
      author: _.join(value.by, ','),
      // enclosure: { url: value.imageUrl },
      custom_elements: [
        {
          'media:thumbnail': [
            {
              _attr: {
                url: value.imageUrl
              }
            }
          ]
        }
      ],
      categories: [value.contentType.displayLabel]
    });
  });

  res.send(feed.xml({ indent: '\t' }));
});

module.exports = {
  view,
  asyncview
};
