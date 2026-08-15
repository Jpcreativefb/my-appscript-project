'use strict';

function assertCurrentReleaseMarkers(assert, app, html, sw) {
  const assetMatch = String(app || '').match(/^const APP_ASSET_VERSION\s*=\s*"([^"]+)"/m);
  const routeMatch = String(app || '').match(/^const APP_ROUTE_HOTFIX_VERSION\s*=\s*"([^"]+)"/m);

  assert(assetMatch && assetMatch[1], 'Current APP_ASSET_VERSION marker is missing.');
  assert(routeMatch && routeMatch[1], 'Current APP_ROUTE_HOTFIX_VERSION marker is missing.');

  const assetVersion = assetMatch[1];
  const routeVersion = routeMatch[1];

  assert(String(html || '').includes(assetVersion), 'App shell is not requesting the current asset version.');
  assert(String(html || '').includes(routeVersion), 'App shell is not requesting the current route hotfix version.');
  assert(String(sw || '').includes(assetVersion), 'Service worker cache is not using the current asset version.');

  return { assetVersion, routeVersion };
}

module.exports = { assertCurrentReleaseMarkers };
