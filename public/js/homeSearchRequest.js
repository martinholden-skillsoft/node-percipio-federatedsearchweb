/* eslint-disable */
$(document).ready(function() {
  var recordsPerRequest = 15;

  var Shuffle = window.Shuffle;

  var shuffleInstance = new Shuffle($('.results-container')[0], {
    itemSelector: '.percipio-item',
    sizer: $('.my-sizer-element')[0],
    delimited: ','
  });

  // GET REQUEST
  $('#searchForm').submit(function(event) {
    event.preventDefault();
    // PREPARE FORM DATA
    var q = $('#searchPhrase').val();
    if (isValue(q)) {
      //Remove all elements in Shuffle
      var allItemsInGrid = document.getElementsByClassName('percipio-item');
      if (isValue(allItemsInGrid)) {
        shuffleInstance.remove(allItemsInGrid);
      }
      $('#resultsRow').empty();
      $('#resultsCountText').empty();
      $('#resultsCount').addClass('d-none');
      $('#moreRecordsDiv').addClass('d-none');
      $('#moreRecords').removeData('request');
      getSearchResults(q);
    }
  });

  $('#moreRecords').click(function(event) {
    var request = $('#moreRecords').data('request');
    getSearchResults(request.q, request.max, request.offset);
  });

  $('#sort-btns .btn').on('click', function(event) {
    var $input = $(this).find('input');
    var $icon = $(this).find('i');

    var val = $input.val();

    function sortByDate(element) {
      return element.getAttribute('data-lastupdated');
    }

    function sortByTitle(element) {
      return element.getAttribute('data-title').toLowerCase();
    }

    function sortByType(element) {
      return element.getAttribute('data-type').toLowerCase();
    }

    var inReverse = null;
    if ($input.data().sort == 'desc') {
      inReverse = true;
      $input.data().sort = 'asc';
    } else if ($input.data().sort == 'asc') {
      inReverse = false;
      $input.data().sort = 'desc';
    } else {
      inReverse = null;
    }


    if (val === 'lastupdated') {
      options = {
        reverse: inReverse,
        by: sortByDate
      };
    } else if (val === 'title') {
      options = {
        reverse: inReverse,
        by: sortByTitle
      };
    } else if (val === 'type') {
      options = {
        reverse: inReverse,
        by: sortByType
      };
    } else {
      options = {};
    }

    if (isValue(inReverse)) {
      //Toggle the class
      if (inReverse) {
        $icon.removeClass('fa-sort-up');
        $icon.addClass('fa-sort-down');
      } else {
        $icon.removeClass('fa-sort-down');
        $icon.addClass('fa-sort-up');
      }
    } else {
      //reset all buttons
      $('.sort-direction-button').data('sort','desc');
      $('.sort-icon').removeClass('fa-sort-down').removeClass('fa-sort-up');
    }

    shuffleInstance.sort(options);
  });

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

  function durationInMinutes(isoDuration) {
    return Math.round(moment.duration(isoDuration).as('minutes'));
  }

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

  // DO GET
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
            (isValue(obj.duration) ? ' | ' + durationInMinutes(obj.duration) + ' minutes' : '') +
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
        var allItemsInGrid = Array.from($('.percipio-item').get());
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
