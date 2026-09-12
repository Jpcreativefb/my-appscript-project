'use strict';

function isValidPattcReleaseMarker_(value) {
  return /^v\d{4,}rc\d+[a-z0-9-]*$/i.test(String(value || '').trim());
}

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
  assert(isValidPattcReleaseMarker_(assetVersion), 'Canonical pattc-release is not a valid PATTC release marker.');
  assert(isValidPattcReleaseMarker_(assetMatch[1]), 'APP_ASSET_VERSION fallback is not a valid historical PATTC release marker.');
  assert(isValidPattcReleaseMarker_(swMarkerMatch[1]), 'Service worker audit marker is not a valid historical PATTC release marker.');

  // RC24M deliberately keeps historical compatibility fallbacks in app.js/sw.js.
  // Runtime authority is the page-provided PATTC_FRONTEND_RELEASE, not literal
  // equality between those fallbacks and the canonical authenticated app shell.
  assert(
    String(app || '').includes('String(window.PATTC_FRONTEND_RELEASE ||'),
    'APP_ASSET_VERSION must resolve PATTC_FRONTEND_RELEASE before its historical fallback.'
  );
  assert(String(html || '').includes('release=' + assetVersion), 'App shell assets are not requesting the canonical release boundary.');
  const htmlText = String(html || '');
  const uiHotfixMatch = htmlText.match(/<meta\s+name=["']pattc-ui-hotfix["']\s+content=["']([^"']+)["']/i);
  assert(uiHotfixMatch && isValidPattcReleaseMarker_(uiHotfixMatch[1]), 'Current pattc-ui-hotfix marker is missing or invalid.');
  const appScriptMatch = htmlText.match(/<script[^>]+src=["'][^"']*js\/app\.js\?([^"']+)["'][^>]*><\/script>/i);
  assert(appScriptMatch && appScriptMatch[1], 'Current app.js shell request is missing.');
  const appQuery = new URLSearchParams(String(appScriptMatch[1]).replace(/&amp;/g, '&'));
  const shellRouteBoundary = appQuery.get('hotfix') === routeVersion || appQuery.get('tf') === uiHotfixMatch[1];
  assert(shellRouteBoundary, 'App shell route/cache boundary is not tied to the current runtime or UI hotfix marker.');
  assert(
    String(app || '').includes('url.searchParams.set("hotfix", APP_ROUTE_HOTFIX_VERSION)'),
    'Lazy route requests are not bound to APP_ROUTE_HOTFIX_VERSION.'
  );
  assert(String(app || '').includes('window.PATTC_FRONTEND_RELEASE'), 'App runtime is not consuming PATTC_FRONTEND_RELEASE.');
  assert(String(sw || '').includes('new URL(self.location.href).searchParams.get("v")'), 'Service worker does not derive its release from the registration query.');
  assert(String(sw || '').includes('const AWARDS_CACHE = "awards-app-" + AWARDS_RELEASE'), 'Service worker cache is not derived from AWARDS_RELEASE.');
  return { assetVersion, routeVersion };
}

module.exports = { assertCurrentReleaseMarkers };
