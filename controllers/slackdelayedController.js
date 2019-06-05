const axios = require('axios');
const _ = require('lodash');
const searchQuery = require('search-query-parser');
const slackBlockKit = require('slack-block-kit');

// Slack Block Items
const slackDivider = slackBlockKit.block.divider;
const slackImage = slackBlockKit.block.image;
const slackSection = slackBlockKit.block.section;
const slackText = slackBlockKit.object.text;
const slackMarkdownFormat = slackBlockKit.TEXT_FORMAT_MRKDWN;

const stringUtils = require('../lib/stringUtils');

const orgid = process.env.CUSTOMER_ORGID || null;
const bearer = process.env.CUSTOMER_BEARER || null;
const percipioSite = process.env.PERCIPIOSITE || null;
const maxItems = process.env.MAX_ITEMS || 5;

/**
 * Get a MarkDown representation of a Percipio Item
 *
 * @param {object} percipioItem - The Percipio Item from the Content Discovery response
 * @returns {string}
 */
const getPercipioItemMarkdown = percipioItem => {
  let courseInfo = null;
  if (!_.isNull(percipioItem.associations.parent)) {
    courseInfo = [
      '*From course:*',
      `* <${percipioItem.associations.parent.link}|${stringUtils.getPlainText(
        percipioItem.associations.parent.title
      )}>`
    ].join('\n');
  }

  let channelInfo = null;
  if (
    !_.isNull(percipioItem.associations.channels) &&
    !_.isEmpty(percipioItem.associations.channels)
  ) {
    const channelInfoArray = ['*From channel:*'];

    _.forEach(percipioItem.associations.channels, channelValue => {
      channelInfoArray.push(
        `* <${channelValue.link}|${stringUtils.getPlainText(channelValue.title)}>`
      );
    });
    channelInfo = channelInfoArray.join('\n');
  }

  const result = [
    `*<${percipioItem.link}|${stringUtils.getPlainText(percipioItem.localizedMetadata[0].title)}>*`,
    `${percipioItem.contentType.displayLabel} ${stringUtils.getFriendlyDuration(
      percipioItem.duration,
      'minutes',
      true,
      '| '
    )}`,
    `${
      !_.isNil(percipioItem.localizedMetadata[0].description)
        ? _.truncate(stringUtils.getPlainText(percipioItem.localizedMetadata[0].description), {
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

/**
 * Get a Slack Block representation of a Percipio Item
 *
 * @param {object} percipioItem- The Percipio Item from the Content Discovery response
 * @returns
 * @returns {object}
 */
const getPercipioItemSlackBlock = percipioItem => {
  return slackSection(slackText(getPercipioItemMarkdown(percipioItem), slackMarkdownFormat), {
    accessory: slackImage(
      percipioItem.imageUrl,
      stringUtils.getPlainText(percipioItem.localizedMetadata[0].title)
    )
  });
};

/**
 * Call the Percipio /content-discovery/v1/organizations/${orgid}/search-content
 *
 * @param {object} request
 * @returns {object} Axios promise
 */
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

/**
 * Generates the Slack Delayed Response to post back to Slack
 *
 * @param {object} request - Percipio parameters for /search-content
 * @param {*} slackResponseUrl - The slack url we will post our delayed response to.
 */
const generateSlackDelayedResponse = async (request, slackResponseUrl) => {
  await getSearchResults(request)
    .catch(error => {
      // handle error
      if (error.response) {
        axios.post(slackResponseUrl, {
          response_type: 'ephemeral',
          blocks: [
            slackDivider(),
            slackSection(
              slackText(
                'Oops! Something went wrong when we tried to get the information for you',
                slackMarkdownFormat
              )
            )
          ]
        });
      }
    })
    .then(response => {
      const blocks = [];
      const totalRecords = parseInt(response.headers['x-total-count'], 10);

      // Build the Percipio Search Link
      const percipioSearchUrl = new URL(percipioSite);
      percipioSearchUrl.pathname = '/search';
      percipioSearchUrl.searchParams.append('q', request.q);

      if (request.modality) {
        percipioSearchUrl.searchParams.append('modalities', _.lowerCase(request.modality));
      }

      // Add a block with details of what we found
      blocks.push(
        slackSection(
          slackText(
            `These are top ${response.data.length} things I found for you about *${
              request.q
            }*${stringUtils.getModalityMarkdown(request)}`,
            slackMarkdownFormat
          )
        )
      );
      // Add a block with link to the Percipio Site Search Results Page
      blocks.push(
        slackSection(
          slackText(
            `You can see all *${totalRecords}* items we found on *<${percipioSearchUrl}|${percipioSite}>*`,
            slackMarkdownFormat
          )
        )
      );
      // Add a divider
      blocks.push(slackDivider());
      // For each item in the results add a Slack block
      _.forEach(response.data, value => {
        blocks.push(getPercipioItemSlackBlock(value));
        blocks.push(slackDivider());
      });

      const result = {
        response_type: 'ephemeral',
        blocks
      };

      if (!_.isNil(slackResponseUrl)) {
        axios.post(slackResponseUrl, result);
      }
    });
};

const view = (slackReqObj, res) => {
  if (!slackReqObj.body) {
    res.json({
      response_type: 'ephemeral',
      blocks: slackSection(slackText('Invalid request', slackMarkdownFormat))
    });
  }

  const options = { keywords: ['prefer'] };
  const searchQueryObj = searchQuery.parse(slackReqObj.body.text, options);

  const request = {
    q: _.isObject(searchQueryObj) ? searchQueryObj.text : slackReqObj.body.text,
    max: maxItems
  };

  if (_.isEmpty(request.q)) {
    res.json({
      response_type: 'ephemeral',
      blocks: slackSection(slackText('Invalid query', slackMarkdownFormat))
    });
  }

  if (_.isObject(searchQueryObj) && searchQueryObj.prefer) {
    // READ, WATCH, LISTEN, PRACTICE
    switch (_.upperCase(searchQueryObj.prefer).substring(0, 4)) {
      case 'READ': // READ
        request.modality = 'READ';
        break;
      case 'WATC': // WATCH
        request.modality = 'WATCH';
        break;
      case 'LIST': // LISTEN
        request.modality = 'LISTEN';
        break;
      case 'PRAC': // PRACTICE
        request.modality = 'PRACTICE';
        break;
      default:
        break;
    }
  }

  generateSlackDelayedResponse(request, slackReqObj.body.response_url);
  res.json({
    response_type: 'ephemeral',
    blocks: [
      slackSection(
        slackText(
          `Let me see what I can find for you about *${request.q}*${stringUtils.getModalityMarkdown(
            request
          )}`,
          slackMarkdownFormat
        )
      )
    ]
  });
};

module.exports = {
  view
};
