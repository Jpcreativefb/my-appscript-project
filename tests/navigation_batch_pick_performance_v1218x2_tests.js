const fs = require('fs');
const path = require('path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(cond,msg){ if(!cond) throw new Error(msg); }
function fnSlice(src,name){
  const start = src.indexOf('function ' + name + '(');
  ok(start >= 0, 'Missing function: ' + name);
  const next = src.indexOf('\nfunction ', start + 10);
  return src.slice(start, next >= 0 ? next : src.length);
}

const app = read('frontend/js/app.js');
ok(app.includes('APP_PAGE_SNAPSHOT_STORAGE_PREFIX'), 'Snapshots must persist for the current tab/PWA session');
ok(app.includes('sessionStorage.setItem(appPageSnapshotStorageKey_(key)'), 'Rendered pages must be stored in sessionStorage');
ok(app.includes('sessionStorage.getItem(appPageSnapshotStorageKey_(key)'), 'Navigation must restore session snapshots');
const snapshotKey = fnSlice(app, 'appPageSnapshotKey_');
ok(snapshotKey.includes('[username, "account", pageName]'), 'Home/hub snapshots must not be keyed by selected game');
ok(app.includes('-v1218x2-fast-nav-batch-picks'), 'x2 asset marker missing');

const appHtml = read('frontend/app.html');
const sw = read('frontend/sw.js');
ok(appHtml.includes('-v1218x2-fast-nav-batch-picks'), 'App shell must request x2 assets');
ok(sw.includes('-v1218x2-fast-nav-batch-picks'), 'Service worker must use x2 cache namespace');

const picksFrontend = read('frontend/js/pages/picks.js');
ok(picksFrontend.includes('PICKS_STANDARD_AUTOSAVE_QUEUE'), 'Standard pick autosave queue missing');
ok(picksFrontend.includes('PICKS_STANDARD_AUTOSAVE_DEBOUNCE_MS = 1800'), 'Standard pick batching debounce missing');
ok(picksFrontend.includes('localStorage.setItem(key, JSON.stringify(rows))'), 'Pending picks must survive transient navigation/network failure');
ok(picksFrontend.includes('apiSavePicksBatch({'), 'Standard picks must use batch API');
ok(picksFrontend.includes('Pick selected · syncing automatically'), 'Pick UI must update without waiting for server round trip');
ok(picksFrontend.includes('scheduleRealityTvPickAutoAdvance_(categoryId);\n    return;'), 'Reality/Awards question flow must advance immediately after local selection');
ok(picksFrontend.includes('hydratePicksLiveProbabilities_();'), 'Deferred market probabilities must hydrate after core page render');
ok(picksFrontend.includes('PICKS_LIVE_PROBABILITY_REQUEST'), 'Deferred probability request must be deduplicated');

const picksCss = read('frontend/css/picks.css');
ok(!picksCss.includes('.picks-page.picks-appearance-loading > *{visibility:hidden;}'), 'Appearance loading must not hide already-rendered questions');
ok(picksCss.includes('.picks-page.picks-appearance-loading::after{display:none;'), 'Appearance loader overlay must stay disabled during deferred styling');
ok(picksFrontend.includes('PICKS_APPEARANCE_CACHE'), 'Game appearance should be cached in the current session');
ok(picksFrontend.includes('pattcGameAppearance:'), 'Game appearance should persist in sessionStorage');
const hydrateAppearance = fnSlice(picksFrontend, 'hydrateConfidenceAppearance_');
ok(hydrateAppearance.includes('applyPicksAppearanceToPage_()'), 'Deferred appearance should apply in place');
ok(!hydrateAppearance.includes('refreshPicksPage()'), 'Deferred appearance must not rerender the full picks page');
ok(app.includes('localStorage.setItem(appPageSnapshotStorageKey_(key)'), 'Home/hub snapshots should survive PWA shell restarts for the short TTL');

const apiFrontend = read('frontend/js/api.js');
ok(apiFrontend.includes('async function apiSavePicksBatch'), 'Frontend batch API helper missing');
ok(apiFrontend.includes('async function apiGetGameLiveProbabilities'), 'Deferred probability API helper missing');

const picksBackend = read('backend/engines/PicksEngine.js');
const saveBatch = fnSlice(picksBackend, 'savePicksBatch');
ok(saveBatch.includes('lock.waitLock(2500)'), 'Batch pick lock wait must stay below 5 seconds');
ok(!saveBatch.includes('.getDataRange('), 'Batch route must not full-read the Picks sheet');
ok(saveBatch.includes('normalizedStorageGetIndexEntry_'), 'Batch route must use the game-indexed Picks row lookup');
ok(saveBatch.includes('setValues(newRows.map'), 'New picks must be written in one batch');
ok(saveBatch.includes('AppCache.syncSheetRows'), 'Batch save must keep warm Picks cache coherent');
ok(!saveBatch.includes('clearPicksCaches('), 'Batch save must not dump the whole Picks cache');
ok(saveBatch.includes('AppCache.clearPlayerActionCaches'), 'Batch save must still invalidate derived user/game results');

const cache = read('backend/services/AppCache.js');
ok(cache.includes('function appCacheSyncSheetRows_'), 'Warm sheet cache synchronization helper missing');
ok(cache.includes('function appDashboardCacheKey_'), 'Dashboard cache helper missing');
ok(cache.includes('dashboard_hub_v2_'), 'Dashboard response cache namespace missing');

const appData = read('backend/engines/AppDataEngine.js');
const startup = fnSlice(appData, 'apiGetStartupPayload');
ok(startup.includes('liveProbabilitiesDeferred'), 'Startup payload must mark deferred live probabilities');
ok(!startup.includes('externalResultsBridgeEnrichCategoriesWithLiveProbabilities_('), 'Cold External Results Hub reads must not block core startup payload');
const livePrices = fnSlice(appData, 'apiGetGameLiveProbabilities');
ok(livePrices.includes('externalResultsBridgeEnrichCategoriesWithLiveProbabilities_'), 'Deferred price route must still load live probabilities');
ok(appData.includes('cachedDashboard = dashboardCache.get(dashboardCacheKey)'), 'Dashboard should reuse a short server-side payload cache');

const api = read('backend/Api.js');
ok(api.includes('action === "savePicksBatch"'), 'Backend savePicksBatch route missing');
ok(api.includes('action === "getGameLiveProbabilities"'), 'Backend deferred probability route missing');

console.log('navigation-batch-pick-performance-v1218x2-tests: PASS');
