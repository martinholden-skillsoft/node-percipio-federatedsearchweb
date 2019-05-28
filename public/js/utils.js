/* eslint-disable */
var utils = (function(_, moment) {
  'use strict';

  /**
   *  Extract all the response headers and add to the jqXHR object
   *
   * @param {*} jqXHR
   */
  function jqxhrGetResponseHeaders(jqXHR) {
    jqXHR.responseHeaders = {};
    var headers = jqXHR.getAllResponseHeaders();
    headers = headers.split('\n');
    headers.forEach(function(header) {
      header = header.split(': ');
      var key = header.shift();
      if (key.length == 0) return;
      // chrome60+ force lowercase, other browsers can be different
      key = key.toLowerCase();
      jqXHR.responseHeaders[key] = header.join(': ');
    });
  }

  /**
   * Format the ISO8601 Duration
   *
   * @param {*} isoDuration ISO8601 Format duration
   * @param {*} sUnits The moment.js units (i.e. minutes)
   * @param {*} bRound boolean indicate if value should be rounded
   * @returns string
   */
  function isoDurationToUnits(isoDuration, sUnits, bRound) {
    // Check if valid units option
    var unit = /^(hours|minutes|seconds|milliseconds)$/.test(sUnits) ? sUnits : 'minutes';
    // Check if we are rounding the value
    var round = _.isBoolean(bRound) ? bRound : false;

    var value = moment.duration(isoDuration).as(unit);

    if (round) {
      value = Math.round(value);
    }
    return value;
  }

  return {
    jqxhrGetResponseHeaders: jqxhrGetResponseHeaders,
    isoDurationToUnits: isoDurationToUnits
  };
})(_, moment);
