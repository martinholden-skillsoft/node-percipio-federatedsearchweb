/* eslint-disable */
// make sure js/utils.js is loaded
$(document).ready(function() {
  // Prepare the lodash template
  var compiledPercipioItemTemplate = _.template(Templates.percipioitem);

  // Determine if we will use chromeless
  var uri = URI();
  var showPercipioUI = uri.hasQuery('chromeless') ? false : true;

  // Add Ajax handler so for every Ajax call so that we extract the headers on return
  $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    jqXHR.done(function(results, responseText, jqXHR) {
      utils.jqxhrGetResponseHeaders(jqXHR);
    });
  });

  // Setup shuffle js
  var Shuffle = window.Shuffle;

  var shuffleInstance = new Shuffle($('.results-container')[0], {
    itemSelector: '.percipio-item',
    sizer: $('.my-sizer-element')[0],
    delimited: ','
  });

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
    $('.sort-icon').removeClass('fa-sort-down fa-sort-up');

    var sortKey = $sortElement.val();
    var currentDirection = !_.isNil($sortElement.data().sort) ? $sortElement.data().sort : 'asc';
    var newDirection = !_.isNil($sortElement.data().sort)
      ? $sortElement.data().sort == 'asc'
        ? 'desc'
        : 'asc'
      : currentDirection;

    var options = {};

    if (!_.isEmpty(sortKey)) {
      //Set the data element
      $sortElement.data().sort = newDirection;

      //Is this a descending sort
      var sortDescending = newDirection == 'desc' ? true : false;
      // Set the icon on this button
      $icon.addClass(sortDescending ? 'fa-sort-down' : 'fa-sort-up');

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
   * Process the filterButton click, applies the filter
   * and updates the indicators next to the button
   *
   * @param {*} $filterButton
   */
  function applyFilter($filterButton) {
    var filterElement = $filterButton.find('input');
    var filterValue = _.isEmpty(filterElement.val()) ? [] : filterElement.val().split(',');

    if (filterValue.length > 0) {
      shuffleInstance.filter(filterValue);
    } else {
      shuffleInstance.filter();
    }
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

    // Explicitly uncheck all of your radio buttons
    $('#filteroption-all').click();
    $('#sortoption-default').click();
      
    // Clear the divs and hide them
    $('#resultsRow').empty();
    $('#resultsCountText').empty();
    $('.resultsHeader').addClass('d-none');
    $('#moreRecordsDiv').addClass('d-none');
    $('#moreRecords').removeData('request');
  }

  /**
   * Send the API call to the proxied Percipio API
   *
   * @param {*} q The query string default is NULL
   * @param {*} modality The modality default is NULL
   * @param {*} max The maxnumber of records to return, default is 20
   * @param {*} offset The offset, default is 0
   * @param {*} useChrome Boolean to indicate if we use "Chrome" (i.e. full UI on links)
   */
  function getSearchResults(q, modality, max, offset, useChrome) {
    //Set default for offset/max
    if (_.isNil(offset)) {
      offset = 0;
    }
    if (_.isNil(max)) {
      max = 20;
    }

    $('#indicator').removeClass('d-none');
    $('#errorDiv').addClass('d-none');

    var baseuri = 'percipio/content-discovery/v1/organizations/ORGID/search-content';

    if (_.isNil(useChrome)) {
      useChrome = true;
    }

    var url = new URI(baseuri);
    url.addQuery('offset', offset);
    url.addQuery('max', max);

    if (!_.isNil(q)) {
      url.addQuery('q', q);
    }

    if (!_.isEmpty(modality)) {
      url.addQuery('modality', modality);
    }

    // Assign handlers immediately after making the request,
    // and remember the jqXHR object for this request
    var jqxhr = $.ajax({ type: 'GET', url: url })
      .done(function(data, textStatus, jqXHR) {
        var totalRecords = parseInt(jqXHR.responseHeaders['x-total-count'], 10);
        var currentOffset = parseInt(jqXHR.responseHeaders['x-request-offset'], 10);
        var currentRecords = data.length + currentOffset;

        $('#resultsCountText').html(
          'Showing ' +
            currentRecords.toLocaleString('en') +
            ' of ' +
            totalRecords.toLocaleString('en') +
            ' for ' +
            q
        );

        $('#indicator').addClass('d-none');
        $('.resultsHeader').removeClass('d-none');

        // Add the calculated fields to each record
        _.map(data, function(value, index, collection) {
          value.calculated = {};
          value.calculated.durationMinutes = !_.isNil(value.duration)
            ? utils.isoDurationToUnits(value.duration, 'minutes', true)
            : 0;
          value.calculated.durationDisplay =
            value.calculated.durationMinutes != 0
              ? ' | ' + value.calculated.durationMinutes + ' minutes'
              : '';

          value.calculated.description = !_.isNil(value.localizedMetadata[0].description)
            ? value.localizedMetadata[0].description
            : '';

          switch (value.modalities[0]) {
            case 'WATCH':
              value.calculated.icon = 'fa-video';
              break;
            case 'READ':
              value.calculated.icon = 'fa-book';
              break;
            case 'LISTEN':
              value.calculated.icon = 'fa-headphones';
              break;
            case 'PRACTICE':
              value.calculated.icon = 'fa-chalkboard-teacher';
              break;
            default:
              value.calculated.icon = 'fa-th';
              break;
          }

          value.calculated.chromeless = useChrome ? null : '?chromeless';
        });

        _.forEach(data, function(value, index, collection) {
          $('#resultsRow').append(compiledPercipioItemTemplate(value));
        });

        if (currentRecords < totalRecords) {
          $('#moreRecordsDiv').removeClass('d-none');
          $('#moreRecords').data('request', {
            q: q,
            modality: modality,
            max: max,
            offset: offset + max
          });
        } else {
          $('#moreRecordsDiv').addClass('d-none');
          $('#moreRecords').removeData('request');
        }

        // Save the total number of new items returned from the API.
        var itemsFromResponse = data.length;
        // Get an array of elements that were just added to the grid above.
        var allItemsInGrid = Array.from(document.getElementsByClassName('percipio-item'));
        // Use negative beginning index to extract items from the end of the array.
        var newItems = allItemsInGrid.slice(-itemsFromResponse);

        shuffleInstance.add(newItems);

        $('[data-toggle="tooltip"]').tooltip();
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        $('#indicator').addClass('d-none');
        $('#errorText').html('<strong>Error : ' + errorThrown + '</strong>');
        $('#errorDiv').removeClass('d-none');
      });
  }

  // Event Handlers

  $('#searchForm').submit(function(event) {
    event.preventDefault();
    var q = $('#searchPhrase').val();
    var modality = $('#searchModality').val();
    if (!_.isEmpty(q)) {
      resetSearchUI();
      getSearchResults(q, modality, null, null, showPercipioUI);
    }
  });

  // Process the sort buttons
  $('#sort-btns .btn').on('click', function(event) {
    applySort($(this));
  });

  // Process the sort buttons
  $('#filter-btns .btn').on('click', function(event) {
    applyFilter($(this));
  });

  // Handle click on moreRecords button
  $('#moreRecords').click(function(event) {
    //Get the data from the button
    var request = $('#moreRecords').data('request');
    getSearchResults(request.q, request.modality, request.max, request.offset, showPercipioUI);
  });
});
