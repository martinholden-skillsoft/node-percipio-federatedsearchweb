/* eslint-disable */
$(document).ready(function() {
  var recordsPerRequest = 20;

  _.templateSettings = {
    evaluate: /{{([\s\S]+?)}}/g,
    interpolate: /{{=([\s\S]+?)}}/g,
    escape: /{{-([\s\S]+?)}}/g
  };

  var shuffleInstance = new window.Shuffle($('.results-container')[0], {
    itemSelector: '.percipio-item',
    sizer: $('.my-sizer-element')[0],
    delimited: ','
  });

  function getElementDataValue(element, key) {
    return element.getAttribute('data-' + key).toLowerCase();
  }

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
          return getElementDataValue(element, sortKey);
        }
      };
    }

    shuffleInstance.sort(options);
  }

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

  // Handle searchForm submit
  $('#searchForm').submit(function(event) {
    event.preventDefault();
    // PREPARE FORM DATA
    var q = $('#searchPhrase').val();
    if (isValue(q)) {
      resetSearchUI();
      getSearchResults(q);
    }
  });

  // Handle click on moreRecords button
  $('#moreRecords').click(function(event) {
    //Get the data from the button
    var request = $('#moreRecords').data('request');
    getSearchResults(request.q, request.max, request.offset);
  });

  // Process the sort buttons
  $('#sort-btns .btn').on('click', function(event) {
    applySort($(this));
  });

  // Check for a valid value, and optional type
  function isValue(value, def, is_return) {
    if (
      $.type(value) == 'null' ||
      $.type(value) == 'undefined' ||
      $.trim(value) == '' ||
      ($.type(value) == 'number' && !$.isNumeric(value)) ||
      ($.type(value) == 'array' && value.length == 0) ||
      ($.type(value) == 'object' && $.isEmptyObject(value))
    ) {
      return $.type(def) != 'undefined' ? def : false;
    } else {
      return $.type(is_return) == 'boolean' && is_return === true ? value : true;
    }
  }

  // Template Helpers
  // Format ISO8601 Duration
  function durationValue(isoDuration, blnRound, strUnits) {
    var unit = $.type(strUnits) != 'undefined' ? strUnits : 'minutes';
    var blnRound = $.type(blnRound) != 'undefined' ? blnRound : 'minutes';

    var value = moment.duration(isoDuration).as(unit);

    if (blnRound) {
      value = Math.round(value);
    }
    return value;
  }

  // Ajax Helpers
  // Add a filter to add all the response headers so they can be easily referenced.
  $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    jqXHR.done(function(results, responseText, jqXHR) {
      getResponseHeaders(jqXHR);
    });
  });

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

  // Call the local proxied Percipio API
  function getSearchResults(q, max, offset) {
    //Set default for offset/max
    if (!isValue(offset)) {
      offset = 0;
    }
    if (!isValue(max)) {
      max = recordsPerRequest;
    }

    $('#indicator').removeClass('d-none');

    var baseuri = 'percipio/content-discovery/v1/organizations/ORGID/content';

    var url = new URI(baseuri);
    url.addQuery('offset', offset);
    url.addQuery('max', max);

    if (isValue(q)) {
      url.addQuery('q', q);
    }

    $.ajax({
      type: 'GET',
      url: url,
      success: function(result, textStatus, request) {
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

        $.each(result, function(index, obj) {
          var template =
            '<div class="col-12 col-md-6 col-xl-4 percipio-item" ' +
            'data-groups="' +
            obj.contentType.displayLabel +
            '" ' +
            'data-lastupdated="' +
            (isValue(obj.lifecycle.lastUpdatedDate)
              ? obj.lifecycle.lastUpdatedDate
              : obj.lifecycle.publishDate) +
            '" ' +
            'data-title="' +
            obj.localizedMetadata[0].title +
            '" ' +
            'data-type="' +
            obj.contentType.displayLabel +
            '" ' +
            '>' +
            '<div class="card mb-4 box-shadow">' +
            '<a href="' +
            obj.link +
            '" target="_blank">' +
            '<div class="embed-responsive embed-responsive-16by9">' +
            '<img class="card-img-top embed-responsive-item" alt="' +
            obj.localizedMetadata[0].title +
            '" src="' +
            obj.imageUrl +
            '" style="height: 200px; width: 100%; display: block;" /></a>' +
            '</div>' +
            '<div class="card-body">' +
            '<h5 class="card-title">' +
            obj.localizedMetadata[0].title +
            '</h5>' +
            '<p class="card-subtitle text-muted">' +
            obj.contentType.displayLabel +
            (isValue(obj.duration)
              ? ' | ' + durationValue(obj.duration, true, 'minutes') + ' minutes'
              : '') +
            '</p>' +
            '<p class="card-text text-truncate">' +
            (isValue(obj.localizedMetadata[0].description)
              ? obj.localizedMetadata[0].description
              : '') +
            '</p>' +
            '<div class="d-flex justify-content-between align-items-center">' +
            '<div class="btn-group">' +
            '<a class="btn btn-sm btn-outline-secondary" href="' +
            obj.link +
            '" role="button" target="_blank">Launch</a>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="card-footer">' +
            '<small class="text-muted">Last Updated: ' +
            (isValue(obj.lifecycle.lastUpdatedDate)
              ? obj.lifecycle.lastUpdatedDate
              : obj.lifecycle.publishDate) +
            '</small><br/>' +
            '</div>' +
            '</div>' +
            '</div>';

          $('#resultsRow').append(template);
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
});
