/* eslint-disable */
$(document).ready(function() {
  var shuffleInstance = new window.Shuffle($('.results-container')[0], {
    itemSelector: '.percipio-item',
    sizer: $('.my-sizer-element')[0],
    delimited: ','
  });

  var compiledPercipioItemTemplate = _.template(Templates.percipioitem);

  /**
   * Process the sortButton click, applies the sort
   * and updates the indicators next to the button
   *
   * @param {*} $sortButton
   */
  function applySort($sortButton) {
    var $sortElement = $sortButton.find('input');
    var $icon = $sortButton.find('i');

    // Get all sort icons and reset
    $('.sort-icon')
      .removeClass('fa-sort-down')
      .removeClass('fa-sort-up');

    var sortKey = $sortElement.val();
    var sortDescending = true;
    var options = {};

    if (!_.isEmpty(sortKey)) {
      var currentDirection = $sortElement.data().sort;
      $('.sort-direction-button').removeData('sort');
      
      if (!_.isNil(currentDirection)) {
        var newDirection = currentDirection == 'asc' ? 'desc' : 'asc';
        $sortElement.data().sort = newDirection;
        sortDescending = newDirection == 'desc' ? true : false;

        // Set the icon on this button
        $icon.addClass(sortDescending ? 'fa-sort-down' : 'fa-sort-up');
      } else {
        $sortElement.data().sort = 'desc';
        sortDescending = true;

        // Set the icon on this button
        $icon.addClass('fa-sort-down');
      }

      options = {
        reverse: sortDescending,
        by: function(element) {
          return element.getAttribute('data-' + sortKey).toLowerCase();
        }
      };
    } else {
      // Default so remove data
      $('.sort-direction-button').removeData('sort');
    }

    shuffleInstance.sort(options);
  }

  /**
   * Reset the search UI and remove the current results.
   *
   */
  function resetSearchUI() {
    // Get all the percipio-item elements and remove from the Shuffle
    var allItemsInGrid = document.getElementsByClassName('percipio-item');

    if (allItemsInGrid.length > 0) {
      shuffleInstance.remove(allItemsInGrid);
    }

    // Clear the divs and hide them
    $('#resultsRow').empty();
    $('#resultsCountText').empty();
    $('#resultsCount').addClass('d-none');
    $('#moreRecordsDiv').addClass('d-none');
    $('#moreRecords').removeData('request');
  }

  /**
   * Format the ISO8601 Duration
   *
   * @param {*} isoDuration ISO8601 Format duration
   * @param {*} blnRound boolean indicate if value should be rounded
   * @param {*} strUnits The moment.js units (i.e. minutes)
   * @returns string
   */
  function durationValue(isoDuration, blnRound, strUnits) {
    var unit = $.type(strUnits) != 'undefined' ? strUnits : 'minutes';
    var blnRound = $.type(blnRound) != 'undefined' ? blnRound : 'minutes';

    var value = moment.duration(isoDuration).as(unit);

    if (blnRound) {
      value = Math.round(value);
    }
    return value;
  }

  /**
   *  Extract all the response headeers and add to the jqXHR object
   *
   * @param {*} jqXHR jQuery XKR Object
   */
  function getResponseHeaders(jqXHR) {
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
   * Send the API call to the proxied Percipio API
   *
   * @param {*} q The query string default is NULL
   * @param {*} max The maxnumber of records to return, default is 20
   * @param {*} offset The offset, default is 0
   */
  function getSearchResults(q, max, offset) {
    //Set default for offset/max
    if (_.isNil(offset)) {
      offset = 0;
    }
    if (_.isNil(max)) {
      max = 20;
    }

    $('#indicator').removeClass('d-none');

    var baseuri = 'percipio/content-discovery/v1/organizations/ORGID/content';

    var url = new URI(baseuri);
    url.addQuery('offset', offset);
    url.addQuery('max', max);

    if (!_.isNil(q)) {
      url.addQuery('q', q);
    }

    $.ajax({
      type: 'GET',
      url: url,
      success: function(result, textStatus, request) {
        getResponseHeaders(request);

        var totalRecords = parseInt(request.responseHeaders['x-total-count'], 10);
        var currentOffset = parseInt(request.responseHeaders['x-request-offset'], 10);
        var currentRecords = result.length + currentOffset;

        $('#resultsCountText').html(
          'Showing ' +
            currentRecords.toLocaleString('en') +
            ' of ' +
            totalRecords.toLocaleString('en') +
            ' for ' +
            q
        );

        $('#indicator').addClass('d-none');
        $('#resultsCount').removeClass('d-none');

        $.each(result, function(index, percipioItem) {
          percipioItem.calculated = {};
          percipioItem.calculated.lastupdated = !_.isNil(percipioItem.lifecycle.lastUpdatedDate)
            ? percipioItem.lifecycle.lastUpdatedDate
            : percipioItem.lifecycle.publishDate;
          percipioItem.calculated.duration = !_.isNil(percipioItem.duration)
            ? ' | ' + durationValue(percipioItem.duration, true, 'minutes') + ' minutes'
            : '';
          percipioItem.calculated.description = !_.isNil(
            percipioItem.localizedMetadata[0].description
          )
            ? percipioItem.localizedMetadata[0].description
            : '';

          $('#resultsRow').append(compiledPercipioItemTemplate(percipioItem));
        });

        if (currentRecords < totalRecords) {
          $('#moreRecordsDiv').removeClass('d-none');
          $('#moreRecords').data('request', { q: q, max: max, offset: offset + max });
        } else {
          $('#moreRecordsDiv').addClass('d-none');
          $('#moreRecords').removeData('request');
        }

        // Save the total number of new items returned from the API.
        var itemsFromResponse = result.length;
        // Get an array of elements that were just added to the grid above.
        var allItemsInGrid = Array.from(document.getElementsByClassName('percipio-item'));
        // Use negative beginning index to extract items from the end of the array.
        var newItems = allItemsInGrid.slice(-itemsFromResponse);

        shuffleInstance.add(newItems);
      },
      error: function(request, textStatus, errorThrown) {
        $('#indicator').addClass('d-none');
        $('#resultsRow').empty();
        $('#resultsRow').append('<strong>Error</strong>');
      }
    });
  }

  // Event Handlers

  $('#searchForm').submit(function(event) {
    event.preventDefault();
    var q = $('#searchPhrase').val();
    if (!_.isEmpty(q)) {
      resetSearchUI();
      getSearchResults(q);
    }
  });

  // Process the sort buttons
  $('#sort-btns .btn').on('click', function(event) {
    applySort($(this));
  });

  // Handle click on moreRecords button
  $('#moreRecords').click(function(event) {
    //Get the data from the button
    var request = $('#moreRecords').data('request');
    getSearchResults(request.q, request.max, request.offset);
  });
});
