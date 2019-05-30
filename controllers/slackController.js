const asyncHandler = require('express-async-handler');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');

const searchQuery = require('search-query-parser');

const orgid = process.env.CUSTOMER_ORGID || null;
const bearer = process.env.CUSTOMER_BEARER || null;

const getPlainText = value => {
  const htmltags = /<\/?([a-z0-9]*)\b[^>]*>?/g;
  const dash = /[\u2010\u2013\u2014\u2015]|&(#8210;|#8211;|#8212;|#8213;|hyphen|dash|ndash;|mdash;|horbar;)/g;
  const apos = /&(#8217;|apos;|rsquo;)/g;
  const copy = /[\u00A9]|&(#169;|copy;)/g;
  const tm = /[\u2122]|&(#8482;|trade;)/g;
  const registered = /[\u00AE]|&(#174;|reg;)/g;
  const curylydoublequotes = /[\u201C\u201D\u201E\u201F\u2033\u2036]|&(ldquo;|rdquo;)/g;
  const pipe = /[\u007c]|&(verbar;|vert;|VerticalLine;)/g;
  const nbsp = /[\u00A0]|&(#160;|#xA0;|nbsp;)/g;
  const otherentities = /&(#?[\w\d]+;)/g;

  let result = value ? value.trim() : '';
  result = result.replace(htmltags, '');
  result = result.replace(pipe, '-');
  result = result.replace(dash, '-');
  result = result.replace(copy, '(c)');
  result = result.replace(registered, '(r)');
  result = result.replace(tm, '(tm)');
  result = result.replace(apos, "'");
  result = result.replace(curylydoublequotes, '"');
  result = result.replace(nbsp, ' ');
  result = result.replace(otherentities, '');

  return result;
};

const isoDurationToUnits = (isoDuration, sUnits, bRound) => {
  // Check if valid units option
  const unit = /^(hours|minutes|seconds|milliseconds)$/.test(sUnits) ? sUnits : 'minutes';
  // Check if we are rounding the value
  const round = _.isBoolean(bRound) ? bRound : false;

  let value = moment.duration(isoDuration).as(unit);

  if (round) {
    value = Math.round(value);
  }
  return value;
};

const durationDisplay = isoduration => {
  const value = isoDurationToUnits(isoduration, 'minutes', true);
  return value !== 0 ? ` | ${value} minutes` : '';
};

const buildMarkdown = value => {
  let courseInfo = null;
  if (!_.isNull(value.associations.parent)) {
    courseInfo = [
      '*From course:*',
      `* <${value.associations.parent.link}|${getPlainText(value.associations.parent.title)}>`
    ].join('\n');
  }

  let channelInfo = null;
  if (!_.isNull(value.associations.channels) && !_.isEmpty(value.associations.channels)) {
    const channelInfoArray = ['*From channel:*'];

    _.forEach(value.associations.channels, channelValue => {
      channelInfoArray.push(`* <${channelValue.link}|${getPlainText(channelValue.title)}>`);
    });
    channelInfo = channelInfoArray.join('\n');
  }

  const result = [
    `*<${value.link}|${getPlainText(value.localizedMetadata[0].title)}>*`,
    `${value.contentType.displayLabel} ${durationDisplay(value.duration)}`,
    `${
      !_.isNil(value.localizedMetadata[0].description)
        ? _.truncate(getPlainText(value.localizedMetadata[0].description), {
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

const createErrorAttachment = error => ({
  color: 'danger',
  text: `*Error*:\n${error.message}`,
  mrkdwn_in: ['text']
});

const createSuccessBlock = value => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: buildMarkdown(value)
  },
  accessory: {
    type: 'image',
    image_url: `${value.imageUrl}`,
    alt_text: `${getPlainText(value.localizedMetadata[0].title)}`
  }
});

const createBlock = value => {
  return createSuccessBlock(value);
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

  const options = { keywords: ['prefer'] };
  const searchQueryObj = searchQuery.parse(req.body.text, options);

  const request = {
    q: _.isObject(searchQueryObj) ? searchQueryObj.text : req.body.text
  };

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

  const { data } = await getSearchResults(request);

  const blocks = [];

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `These are top 5 things I found for you about *${request.q}*${modalityString}`
    }
  });

  blocks.push({
    type: 'divider'
  });

  _.forEach(data, value => {
    blocks.push(createBlock(value));
    blocks.push({
      type: 'divider'
    });
  });

  result = {
    response_type: 'ephemeral',
    blocks
  };

  return res.json(result);
});

module.exports = {
  asyncview
};
