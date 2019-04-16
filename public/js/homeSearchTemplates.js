/* eslint-disable */
var Templates = {};

Templates.percipioitem = [
  '<div class="col-12 col-md-6 col-xl-4 percipio-item shuffle-item shuffle-item--visible" data-groups="${contentType.displayLabel}" data-lastupdated="${calculated.lastupdated}" data-title="${localizedMetadata[0].title}" data-type="${contentType.displayLabel}">',
  '<div class="card mb-4 box-shadow">',
  '<div class="embed-responsive embed-responsive-16by9">',
  '<a href="${link}" target="_blank">',
  '<img class="card-img-top embed-responsive-item" alt="${localizedMetadata[0].title}" src="${imageUrl}" style="height: 200px; width: 100%; display: block;">',
  '</a>',
  '</div>',
  '<div class="card-body">',
  '<h5 class="card-title">${localizedMetadata[0].title}</h5>',
  '<p class="card-subtitle text-muted">${contentType.displayLabel}${calculated.duration}</p>',
  '<p class="card-text text-truncate"/>',
  '<p>${calculated.description}</p>',
  '<div class="d-flex justify-content-between align-items-center">',
  '<div class="btn-group">',
  '<a class="btn btn-sm btn-outline-secondary" href="${link}" role="button" target="_blank">Launch</a>',
  '</div>',
  '</div>',
  '</div>',
  '<div class="card-footer">',
  '<small class="text-muted">Last Updated: ${calculated.lastupdated}</small>',
  '<br />',
  '</div>',
  '</div>',
  '</div>'
].join('\n');
