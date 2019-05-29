const asyncHandler = require('express-async-handler');
const axios = require('axios');
const _ = require('lodash');

const orgid = process.env.CUSTOMER_ORGID || null;
const bearer = process.env.CUSTOMER_BEARER || null;
// const slackToken = process.env.SLACKTOKEN || null;

const createErrorAttachment = error => ({
  color: 'danger',
  text: `*Error*:\n${error.message}`,
  mrkdwn_in: ['text']
});

const createSuccessAttachment = value => ({
  color: 'good',
  text: `*${value.contentType.displayLabel} | ${value.localizedMetadata[0].title}* (${value.link})`,
  mrkdwn_in: ['text']
});

const createAttachment = value => {
  return createSuccessAttachment(value);
};

const getSearchResults = async request => {
  let requestParams = request || {};

  const requestDefaults = {
    max: 5,
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

const asyncview = asyncHandler(async (req, res) => {
  let result;

  if (!req.body) {
    result = {
      response_type: 'ephemeral',
      text: '',
      attachments: [createErrorAttachment(new Error('Invalid body'))]
    };
    return res.json(result);
  }

  // if (slackToken !== req.body.token) {
  //   result = {
  //     response_type: 'ephemeral',
  //     text: '',
  //     attachments: [createErrorAttachment(new Error('Invalid token'))]
  //   };
  //   return res.json(result);
  // }

  const request = {
    q: req.body.text
  };

  // const user = await getUserFromDb({ id: req.params.id })
  const { data } = await getSearchResults(request);

  result = {
    response_type: 'ephemeral',
    text: `${data.length} results for ${req.body.text}`,
    attachments: data.map(createAttachment)
  };

  return res.json(result);
});

module.exports = {
  asyncview
};
