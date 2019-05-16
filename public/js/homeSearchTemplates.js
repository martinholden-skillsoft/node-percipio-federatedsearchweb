/* eslint-disable */
var Templates = {};

Templates.percipioitem = [
  '<div class="col-sm-12 col-md-6 col-xl-4 mb-4 px-2 percipio-item shuffle-item shuffle-item--visible" data-groups=\'["${contentType.displayLabel}"]\' data-title="${localizedMetadata[0].title}" data-type="${contentType.displayLabel}" data-durationminutes=${_.padStart(calculated.durationMinutes,6,"0")}>',
  '<div class="card box-shadow">',
  '<div class="embed-responsive embed-responsive-16by9">',
  '<a href="${link}${calculated.chromeless}" target="_blank">',
  '<img class="card-img-top embed-responsive-item" alt="${localizedMetadata[0].title}" src="${imageUrl}">',
  '</a>',
  '</div>',
  '<div class="card-body">',
  '<h5 class="card-title text-truncate" data-toggle="tooltip" data-placement="top" title="${localizedMetadata[0].title}">${localizedMetadata[0].title}</h5>',
  '<p class="card-subtitle text-muted font-weight-light small">${contentType.displayLabel}  <i class="fas ${calculated.icon}"></i>${calculated.durationDisplay}</p>',
  '<div class="mh-100" style="height:100px; overflow-y:auto;">',
  '<div class="card-text">${calculated.description}</div>',
  '</div>',
  '<div class="d-flex justify-content-between align-items-center">',
  '<div class="btn-group">',
  '<a class="btn btn-sm btn-outline-secondary" href="${link}${calculated.chromeless}" role="button" target="_blank">Launch</a>',
  '</div>',
  '</div>',
  '</div>',
  '<div class="card-footer mh-100 text-left font-weight-light small py-1" style="height:100px; overflow-y:auto;">',
  '<% if (!_.isNull(associations.parent)) { %>',
  '<span>From course: </span>',
  '<ul class="mb-1">',
  '<li><a href="${associations.parent.link}${calculated.chromeless}" class="card-link" target="_blank">${associations.parent.title}</a></li>',
  '</ul>',
  '<% } %>',
  '<% if (!_.isNull(associations.channels) && !_.isEmpty(associations.channels)) { %>',
  '<span>From channel: </span>',
  '<ul class="mb-1">',
  '<% _.forEach(associations.channels, function(value , key) { %>',
  '<li><a href="${value.link}${calculated.chromeless}" class="card-link" target="_blank">${value.title}</a></li>',
  '<% }); %>',
  '</ul>',
  '<% } %>',
  '',
  '</div>',
  '</div>',
  '</div>'
].join('\n');
