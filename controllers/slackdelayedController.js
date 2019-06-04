const axios = require('axios');
const _ = require('lodash');
const searchQuery = require('search-query-parser');

const slackBlockUtils = require('../lib/slackBlockUtils');
const stringUtils = require('../lib/stringUtils');

const orgid = process.env.CUSTOMER_ORGID || null;
const bearer = process.env.CUSTOMER_BEARER || null;

const buildMarkdown = value => {
  let courseInfo = null;
  if (!_.isNull(value.associations.parent)) {
    courseInfo = [
      '*From course:*',
      `* <${value.associations.parent.link}|${stringUtils.getPlainText(
        value.associations.parent.title
      )}>`
    ].join('\n');
  }

  let channelInfo = null;
  if (!_.isNull(value.associations.channels) && !_.isEmpty(value.associations.channels)) {
    const channelInfoArray = ['*From channel:*'];

    _.forEach(value.associations.channels, channelValue => {
      channelInfoArray.push(
        `* <${channelValue.link}|${stringUtils.getPlainText(channelValue.title)}>`
      );
    });
    channelInfo = channelInfoArray.join('\n');
  }

  const result = [
    `*<${value.link}|${stringUtils.getPlainText(value.localizedMetadata[0].title)}>*`,
    `${value.contentType.displayLabel} ${stringUtils.getFriendlyDuration(value.duration)}`,
    `${
      !_.isNil(value.localizedMetadata[0].description)
        ? _.truncate(stringUtils.getPlainText(value.localizedMetadata[0].description), {
            length: 1000,
            separator: ' '
          })
        : ''
    }`,
    `${!_.isNull(courseInfo) ? courseInfo : ''}`,
    `${!_.isNull(channelInfo) ? channelInfo : ''}`,
    ''
  ].join('\n');
  return result;
};

const createBlock = value => {
  return slackBlockUtils.getSuccessBlock(
    buildMarkdown(value),
    value.imageUrl,
    stringUtils.getPlainText(value.localizedMetadata[0].title)
  );
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

const delayedResponse = async (request, modalityString, slackurl) => {
  const { data } = await getSearchResults(request);

  const blocks = [];

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `These are top 5 things I found for you about *${request.q}*${modalityString}`
    }
  });

  const divider = slackBlockUtils.getDividerBlock();

  blocks.push(divider);

  _.forEach(data, value => {
    blocks.push(createBlock(value));
    blocks.push(divider);
  });

  const result = {
    response_type: 'ephemeral',
    blocks
  };

  axios
    .post(slackurl, result)
    .then(res => {
      console.log(`statusCode: ${res.statusCode}`);
      console.log(res);
    })
    .catch(error => {
      console.error(error);
    });
};

const view = (slackReqObj, res) => {
  let result;
  if (!slackReqObj.body) {
    result = {
      response_type: 'ephemeral',
      text: '',
      attachments: [slackBlockUtils.getErrorBlock(new Error('Invalid body'))]
    };
    res.json(result);
  }

  const options = { keywords: ['prefer'] };
  const searchQueryObj = searchQuery.parse(slackReqObj.body.text, options);

  const request = {
    q: _.isObject(searchQueryObj) ? searchQueryObj.text : slackReqObj.body.text
  };

  if (_.isEmpty(request.q)) {
    result = {
      response_type: 'ephemeral',
      text: '',
      attachments: [slackBlockUtils.getErrorBlock(new Error('Invalid query'))]
    };
    res.json(result);
  }

  let modalityString = '';

  if (_.isObject(searchQueryObj) && searchQueryObj.prefer) {
    // READ, WATCH, LISTEN, PRACTICE

    switch (_.upperCase(searchQueryObj.prefer).substring(0, 4)) {
      case 'READ': // READ
        request.modality = 'READ';
        modalityString = ' that you can *READ ABOUT*';
        break;
      case 'WATC': // WATCH
        request.modality = 'WATCH';
        modalityString = ' that you can *WATCH*';
        break;
      case 'LIST': // LISTEN
        request.modality = 'LISTEN';
        modalityString = ' that you can *LISTEN TO*';
        break;
      case 'PRAC': // PRACTICE
        request.modality = 'PRACTICE';
        modalityString = ' that you can *PRACTICE WITH*';
        break;
      default:
        break;
    }
  }

  const blocks = [];

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `Let me see what I can find for you about *${request.q}*${modalityString}`
    }
  });

  result = {
    response_type: 'ephemeral',
    blocks
  };
  delayedResponse(request, modalityString, slackReqObj.body.response_url);
  res.json(result);
};

module.exports = {
  view
};
