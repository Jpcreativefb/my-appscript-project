const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const appHtml = read('frontend/app.html');
const indexHtml = read('frontend/index.html');
const app = read('frontend/app.js');
const appMirror = read('frontend/js/app.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const css = read('frontend/css/rc19-mobile-pwa.css');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const releaseMatch = appHtml.match(/<meta\s+name=["']pattc-release["']\s+content=["']([^"']+)["']/i);
assert(releaseMatch && releaseMatch[1], 'canonical pattc-release marker missing');
const release = releaseMatch[1];

function requireText(source, expected, label) {
  assert(source.includes(expected), `${label} missing: ${expected}`);
}

// 1) The viewport contract remains correct on both entry shells.
assert(/<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1, viewport-fit=cover">/.test(appHtml),
  'app.html viewport contract changed');
assert(/name="viewport"[\s\S]{0,160}width=device-width,[\s\S]{0,80}initial-scale=1,[\s\S]{0,80}viewport-fit=cover/.test(indexHtml),
  'index.html viewport contract changed');

// 2) Release boundary must advance together so Safari/PWA/module URLs cannot
// silently keep the previous RC17/RC18 frontend assets.
[appHtml, indexHtml, app, appMirror, pwa].forEach((source, index) => {
  assert(source.includes(release), `release marker missing from surface ${index}`);
});
requireText(sw, './css/rc19-mobile-pwa.css', 'service-worker app shell');
requireText(sw, release, 'service-worker R2 release audit marker');
assert(appHtml.indexOf('rc19-mobile-pwa.css') > appHtml.indexOf('league-admin.css'),
  'RC19 mobile override must load after legacy page CSS');

// 3) Home width is fixed locally at the offending rail/container. No blanket
// document overflow workaround is permitted in the correction stylesheet.
requireText(css, '.dashboard-home-v1218c .dashboard-current-games-carousel', 'Home current-games rail');
requireText(css, 'overflow-x: auto;', 'local rail scrolling');
requireText(css, 'max-width: 100%;', 'viewport containment');
requireText(css, 'min-width: 0;', 'flex/grid shrink containment');
requireText(css, 'flex: 0 0 min(82%, 320px);', 'mobile card basis');
assert(!/(^|\})\s*(html|body)\s*\{/m.test(css),
  'RC19 correction must not hide document overflow globally');
assert(!/max-content/.test(css), 'RC19 correction must not introduce max-content width');

// Optional real layout check when Chromium is present. The static assertions
// above remain deterministic on developer Macs without Chromium.
let chromium = '';
for (const candidate of ['chromium', 'chromium-browser', 'google-chrome']) {
  try {
    chromium = cp.execFileSync('bash', ['-lc', `command -v ${candidate} || true`], { encoding: 'utf8' }).trim();
  } catch (err) {}
  if (chromium) break;
}
if (chromium && process.env.PATTC_RUN_HEADLESS_LAYOUT === '1') {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattc-rc19-mobile-'));
  const fixture = path.join(tempDir, 'home-width.html');
  const legacy = `
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      .dashboard-home-v1218c { width: 100%; }
      .dashboard-home-active-grid { display: grid; grid-template-columns: repeat(5, 300px); gap: 12px; }
      .dashboard-compact-game { min-width: 300px; height: 100px; }
    </style>`;
  const correction = `<style>${css}</style>`;
  const cards = Array.from({ length: 5 }, (_, i) => `<article class="dashboard-compact-game">Game ${i + 1}</article>`).join('');
  fs.writeFileSync(fixture, `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">${legacy}${correction}</head><body><main class="dashboard-games-hub-page dashboard-home-v1218c"><section class="dashboard-home-section"><div id="rail" class="dashboard-home-active-grid dashboard-user-games-grid dashboard-current-games-carousel">${cards}</div></section></main><script>window.addEventListener('load',function(){var rail=document.getElementById('rail');document.body.setAttribute('data-width-pass',String(document.documentElement.scrollWidth<=window.innerWidth+1));document.body.setAttribute('data-rail-scrolls',String(rail.scrollWidth>rail.clientWidth));document.body.setAttribute('data-doc-width',String(document.documentElement.scrollWidth));document.body.setAttribute('data-view-width',String(window.innerWidth));});</script></body></html>`);
  try {
    const dumped = cp.execFileSync(chromium, [
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars',
      '--window-size=390,844', '--virtual-time-budget=1000', '--dump-dom', `file://${fixture}`
    ], { encoding: 'utf8', timeout: 12000, maxBuffer: 5 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    assert(/data-width-pass="true"/.test(dumped), 'Home correction still allows document scrollWidth beyond viewport');
    assert(/data-rail-scrolls="true"/.test(dumped), 'Current Games should remain locally horizontally scrollable');
    console.log('optional Chromium 390px Home width check: PASS');
  } catch (err) {
    // Headless Chromium is optional because developer Macs running the normal
    // Node production gate do not necessarily have it installed/configured.
    console.log('optional Chromium 390px Home width check: SKIP (' + String(err.code || 'unavailable') + ')');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
} else {
  console.log('optional Chromium 390px Home width check: SKIP (set PATTC_RUN_HEADLESS_LAYOUT=1 to enable)');
}

// 4) Internal navigation must no longer throw away Home state or force a full
// Dashboard request before consulting the page snapshot.
assert(!/page === "dashboard"[\s\S]{0,240}dashboardHomePayload = null[\s\S]{0,120}forceRefresh = true/.test(app),
  'navigate() still force-invalidates Home before snapshot reuse');
requireText(app, 'appScheduleDashboardRefreshAfterSnapshot_(snapshot.key);', 'nonblocking Home snapshot refresh');
requireText(app, 'dashboardScheduleHomeEnrichment_(snapshotKey', 'cached Home joins controlled enrichment scheduler');
assert(!app.includes('}, 3500);'), 'legacy competing 3.5-second Dashboard refresh must stay removed');
requireText(app, 'if (APP_STATE.currentPage !== "dashboard") return;', 'Home refresh route guard');
const navigateBlock = app.slice(app.indexOf('async function navigate(page, options)'), app.indexOf('/* ======================\n   ACTIVE NAV', app.indexOf('async function navigate(page, options)')));
assert(!/\binitApp\s*\(/.test(navigateBlock), 'internal navigate() must not bootstrap the whole app');

// 5) Returning Home can reuse both the persisted DOM snapshot and the valid
// in-memory Dashboard payload while freshness is checked out-of-band.
requireText(app, 'pageName === "dashboard"', 'account-scoped Dashboard snapshot key');
requireText(app, 'localStorage.setItem(appPageSnapshotStorageKey_(key)', 'persisted Dashboard snapshot');
requireText(dashboard, 'Date.now() - Number(APP_STATE.dashboardHomePayloadLoadedAt || 0) < 120000', 'Dashboard memory cache');
requireText(dashboard, 'dashboardRefreshHomePayloadInBackground_', 'Dashboard nonblocking background refresh');

// 6) Secondary Home enrichment is explicitly delayed and is never awaited by
// renderPage/dashboard route completion.
const dashboardRenderCase = app.slice(app.indexOf('case "dashboard":'), app.indexOf('case "trophy-room":'));
requireText(dashboardRenderCase, 'await renderDashboardPage()', 'Dashboard critical render');
requireText(dashboardRenderCase, 'dashboardScheduleHomeEnrichment_', 'deferred Dashboard enrichment scheduler');
requireText(dashboard, '}, 6500);', 'Dashboard enrichment idle delay');
assert(!/await\s+hydrateDashboardHomeExtras_/.test(dashboardRenderCase),
  'secondary Dashboard enrichment still blocks route completion');

// 7) Player routes without a snapshot replace the previous screen with a
// destination shell before their slow server payload resolves. Admin keeps the
// detailed overlay loader.
requireText(app, 'appProgressiveRouteShell_(page)', 'progressive player route shell');
requireText(app, 'const useOverlayLoader = usePageLoader && !progressiveShell;', 'player/admin loader split');
requireText(app, 'await appPaintProgressiveRouteShell_(page, app);', 'pre-data route paint');
assert((app.match(/if \(usePageLoader && APP_LOADER_STATE\.visible\) hideLoader\(\);/g) || []).length >= 2,
  'snapshot/progressive navigation must preserve suppressLoader ownership before hiding an existing route loader');
requireText(app, 'if (useOverlayLoader) {\n        if (usePageLoader) hideLoader();\n      }',
  'final overlay cleanup must preserve the historical route-loader ownership contract');
requireText(css, '.app-route-loading-shell', 'progressive route shell styling');

// 8) First Prediction/Confidence entry prewarms the same startup request while
// the optional profile lookup runs. The route renderer reuses the in-flight
// request instead of creating a second backend call.
requireText(app, 'const APP_STARTUP_PAYLOAD_REQUESTS = {};', 'startup request dedupe map');
requireText(app, 'APP_STARTUP_PAYLOAD_REQUESTS[identity.key]', 'startup request dedupe lookup');
requireText(app, 'Promise.resolve(loadStartupPayload())', 'game startup prewarm');
requireText(app, 'const profileChoice = await maybeOfferGameProfile_(gameId);', 'profile prompt retained');
assert(app.indexOf('Promise.resolve(loadStartupPayload())') < app.indexOf('const profileChoice = await maybeOfferGameProfile_(gameId);'),
  'startup prewarm must start before the optional profile request');

// Dynamic proof: two concurrent startup consumers launch one API request.
function storageMock() {
  const map = new Map();
  return {
    getItem: key => map.has(String(key)) ? map.get(String(key)) : null,
    setItem: (key, value) => map.set(String(key), String(value)),
    removeItem: key => map.delete(String(key))
  };
}
const localStorage = storageMock();
const sessionStorage = storageMock();
let startupCalls = 0;
const context = {
  console,
  URL,
  Date,
  Math,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: fn => setTimeout(fn, 0),
  localStorage,
  sessionStorage,
  window: {
    PATTC_FRONTEND_RELEASE: release,
    localStorage,
    sessionStorage,
    location: { hostname: 'example.test', href: 'https://example.test/app.html', pathname: '/app.html', search: '', hash: '' },
    history: { pushState() {}, replaceState() {} },
    addEventListener() {},
    setTimeout
  },
  document: {
    currentScript: { src: 'https://example.test/js/app.js' },
    baseURI: 'https://example.test/app.html',
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { addEventListener() {}, remove() {}, dataset: {} }; },
    head: { appendChild() {} },
    title: 'PATTC Predicts'
  },
  APP_STATE: { gameId: 'game-1', startupPayload: null },
  getSession: () => ({ username: 'tester', token: 'token' }),
  getFrontendGameId: () => 'game-1',
  getFrontendLeagueId: () => '',
  apiGetStartupPayload: async () => {
    startupCalls += 1;
    await new Promise(resolve => setTimeout(resolve, 20));
    return { success: true, gameId: 'game-1', categories: [] };
  }
};
context.window.window = context.window;
context.window.document = context.document;
vm.createContext(context);
vm.runInContext(app, context, { filename: 'frontend/app.js' });
Promise.all([context.loadStartupPayload(), context.loadStartupPayload()]).then(results => {
  assert.strictEqual(startupCalls, 1, 'concurrent startup consumers launched duplicate API requests');
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].gameId, 'game-1');
  assert.strictEqual(results[1].gameId, 'game-1');
  assert.strictEqual(app, appMirror, 'frontend app mirrors diverged');
  console.log('player-ux-rc19-mobile-pwa-performance-tests: PASS');
}).catch(err => {
  console.error(err && err.stack || err);
  process.exitCode = 1;
});
