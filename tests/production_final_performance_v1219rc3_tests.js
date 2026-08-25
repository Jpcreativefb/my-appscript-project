const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const appData = read('backend/engines/AppDataEngine.js');
const picks = read('backend/engines/PicksEngine.js');
const cache = read('backend/services/AppCache.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');
const adminTools = read('backend/admin/AdminTools.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const admin = read('frontend/js/pages/admin.js');
const picksPage = read('frontend/js/pages/picks.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const sw = read('frontend/sw.js');

assert(/^1\.2\.19-rc\.[345678]$/.test(pkg.version), 'package version must remain rc3/rc4 compatible');
assert(app.includes('v1219rc3-final-performance'), 'app asset marker must identify rc3');
assert(sw.includes('v1219rc3-final-performance'), 'service worker marker must identify rc3');
assert.strictEqual(app, appMirror, 'frontend app mirrors must remain synchronized');

assert(picks.includes('function getUserPicksCacheKey_'), 'per-user picks cache key missing');
assert(picks.includes('safeScriptCachePut_') && picks.includes('JSON.stringify(result)') && /(300|1800)/.test(picks), 'user picks cache must remain bounded');
assert(cache.includes('keys.push(getUserPicksCacheKey_(username, gameId))'), 'pick writes must invalidate the user-picks cache');
assert(appData.includes('function appStartupPayloadCacheKey_'), 'startup payload cache missing');
assert(appData.includes('JSON.stringify(startupPayload)') && appData.includes('45'), 'startup payload cache must remain very short-lived');
assert(cache.includes('keys.push(appStartupPayloadCacheKey_(username, gameId))'), 'player writes must invalidate startup payload cache');

assert(dashboard.includes('dashboardHomePayloadLoadedAt'), 'Dashboard core payload client reuse missing');
assert(dashboard.includes('< 120000'), 'Dashboard client cache must be bounded');
assert(dashboard.includes('Career history can traverse archived workbooks'), 'career history must remain off the Home critical path');
assert(app.includes('}, 6500);'), 'Home optional hydration should wait long enough for game navigation');

assert(admin.includes('adminHydrateSummary_().catch'), 'Admin summary must hydrate after the shell renders');
assert(admin.includes('adminSummaryUsers">—</span>'), 'Admin shell should render count placeholders immediately');
assert(adminTools.includes('admin_summary_lite_v1219rc3_'), 'Admin lite summary cache missing');

assert(picksPage.includes('}, 5000);'), 'Reality TV optional enhancements must be delayed');
assert(/CacheService\.getScriptCache\(\)\.put\(coreCacheKey, serialized, (900|1800)\)/.test(reality), 'Reality TV core cache must remain bounded');
assert(/CacheService\.getScriptCache\(\)\.put\(cacheKey, serialized, (900|1800)\)/.test(reality), 'Reality TV player-stat cache must remain bounded');

console.log('production-final-performance-v1.2.19-rc3-tests: PASS');
