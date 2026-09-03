'use strict';

function assertCurrentReleaseMarkers(assert, app, html, sw) {
  const htmlReleaseMatch = String(html || '').match(/<meta\s+name=["']pattc-release["']\s+content=["']([^"']+)["']/i);
  const assetMatch = String(app || '').match(/^const APP_ASSET_VERSION\s*=\s*String\(window\.PATTC_FRONTEND_RELEASE\s*\|\|\s*"([^"]+)"\)/m);
  const routeMatch = String(app || '').match(/^const APP_ROUTE_HOTFIX_VERSION\s*=\s*"([^"]+)"/m);
  const swMarkerMatch = String(sw || '').match(/^const PATTC_SW_RELEASE_MARKER\s*=\s*"([^"]+)"/m);

  assert(htmlReleaseMatch && htmlReleaseMatch[1], 'Canonical pattc-release meta marker is missing.');
  assert(assetMatch && assetMatch[1], 'Current APP_ASSET_VERSION fallback marker is missing.');
  assert(routeMatch && routeMatch[1], 'Current APP_ROUTE_HOTFIX_VERSION marker is missing.');
  assert(swMarkerMatch && swMarkerMatch[1], 'Service worker release audit marker is missing.');

  const assetVersion = htmlReleaseMatch[1];
  const routeVersion = routeMatch[1];
  assert.strictEqual(assetMatch[1], assetVersion, 'APP_ASSET_VERSION fallback does not match canonical pattc-release.');
  assert.strictEqual(swMarkerMatch[1], assetVersion, 'Service worker audit marker does not match canonical pattc-release.');
  assert(String(html || '').includes('release=' + assetVersion), 'App shell assets are not requesting the canonical release boundary.');
  assert(String(html || '').includes(routeVersion), 'App shell is not requesting the current route hotfix version.');
  assert(String(app || '').includes('window.PATTC_FRONTEND_RELEASE'), 'App runtime is not consuming PATTC_FRONTEND_RELEASE.');
  assert(String(sw || '').includes('new URL(self.location.href).searchParams.get("v")'), 'Service worker does not derive its release from the registration query.');
  assert(String(sw || '').includes('const AWARDS_CACHE = "awards-app-" + AWARDS_RELEASE'), 'Service worker cache is not derived from AWARDS_RELEASE.');
  return { assetVersion, routeVersion };
}

module.exports = { assertCurrentReleaseMarkers };
