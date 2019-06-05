const _ = require('lodash');
const moment = require('moment');

/**
 * Get a plain text representation of a HTML string
 *
 * @param {string} value - HTML to clean
 * @returns string
 */
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

/**
 * Convert and ISO Duration value to a friendly display string
 *
 * @param {string} isoDuration - The ISO duration string
 * @param {string} [units=minutes] - A valid moment unit [hours|minutes|seconds|milliseconds]
 * @param {boolean} [roundDown=false] - Round down the value to whole number
 * @param {string} [prefix=''] - A prefix string to add
 * @example
 * // returns '15 minutes'
 * getFriendlyDuration('PT0H15M0S')
 * @example
 * // returns '1.5 hours'
 * getFriendlyDuration('PT1H30M5S', 'hours', true);
 * @returns {string} Friendly duration string
 */
const getFriendlyDuration = (isoDuration, units, roundDown, prefix) => {
  // Check if valid units option
  const unit = /^(hours|minutes|seconds|milliseconds)$/.test(units) ? units : 'minutes';
  // Check if we are rounding the value
  const rounddown = _.isBoolean(roundDown) ? roundDown : false;

  let value = moment.duration(isoDuration).as(unit);

  if (rounddown) {
    value = Math.round(value);
  }

  return value !== 0 ? `${_.isNil(prefix) ? '' : prefix}${value} ${unit}` : '';
};

/**
 * Return a Markdown text to indicate the modality
 *
 * @param {object} request - Percipio parameters for /search-content
 * @returns
 */
const getModalityMarkdown = request => {
  let modalityString = '';

  if (_.isObject(request) && request.modality) {
    // READ, WATCH, LISTEN, PRACTICE

    switch (_.upperCase(request.modality).substring(0, 4)) {
      case 'READ': // READ
        modalityString = ' that you can *READ ABOUT*';
        break;
      case 'WATC': // WATCH
        modalityString = ' that you can *WATCH*';
        break;
      case 'LIST': // LISTEN
        modalityString = ' that you can *LISTEN TO*';
        break;
      case 'PRAC': // PRACTICE
        modalityString = ' that you can *PRACTICE WITH*';
        break;
      default:
        break;
    }
  }
  return modalityString;
};

module.exports = {
  getPlainText,
  getFriendlyDuration,
  getModalityMarkdown
};
