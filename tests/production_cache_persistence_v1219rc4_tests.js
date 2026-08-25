const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const appHtml = read('frontend/app.html');
const sw = read('frontend/sw.js');
const pwa = read('frontend/js/pwa.js');
const picksPage = read('frontend/js/pages/picks.js');
const games = read('backend/engines/GamesEngine.js');
const appCache = read('backend/services/AppCache.js');
const picks = read('backend/engines/PicksEngine.js');
const leagues = read('backend/engines/LeagueAccessEngine.js');
const appearance = read('backend/engines/AppearanceEngine.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');
const auth = read('backend/AuthEngine.js');
const routes = JSON.parse(read('frontend/_routes.json'));

assert(['1.2.19-rc.4', '1.2.19-rc.5', '1.2.19-rc.6'].includes(pkg.version), 'package version must identify rc4 or its certified successor');
assert.strictEqual(app, appMirror, 'frontend app mirrors must remain synchronized');
assert(appHtml.includes('v1219rc4-cache-persistence') || appHtml.includes('v1219rc5-admin-question-performance') || appHtml.includes('v1219rc6-admin-question-ux-performance'), 'app shell marker must identify rc4 or its certified successor');
assert(sw.includes('v1219rc4-cache-persistence') || sw.includes('v1219rc5-admin-question-performance') || sw.includes('v1219rc6-admin-question-ux-performance'), 'service worker marker must identify rc4 or its certified successor');
assert(pwa.includes('v1219rc4-cache-persistence') || pwa.includes('v1219rc5-admin-question-performance') || pwa.includes('v1219rc6-admin-question-ux-performance'), 'PWA registration marker must identify rc4 or its certified successor');
assert(routes.include.includes('/api/app'), 'Cloudflare /api/app route must remain enabled');

assert(app.includes('APP_STARTUP_PAYLOAD_MAX_AGE_MS = 6 * 60 * 60 * 1000'), 'device startup cache should survive the 10-minute failure window');
assert(app.includes('APP_STARTUP_PAYLOAD_REFRESH_AFTER_MS = 5 * 60 * 1000'), 'device startup cache must refresh quietly on a bounded cadence');
assert(app.includes('APP_STARTUP_PAYLOAD_STORAGE_MAX_ENTRIES = 3'), 'device cache must keep a bounded LRU');
assert(app.includes('appReadStoredStartupPayload_()'), 'startup loader must read the device snapshot');
assert(app.includes('appRefreshStartupPayloadQuietly_(cached)'), 'stale device data must refresh quietly');
assert(app.includes('APP_STARTUP_PAYLOAD_LOCAL_GENERATION !== localGeneration'), 'an in-flight stale refresh must not overwrite a newer saved pick');
assert(app.includes('appClearStoredStartupPayloadsForUser_(session.username)'), 'logout must remove stored player startup payloads');
assert.strictEqual((picksPage.match(/clearStartupPayload\(true\);/g) || []).length, 3, 'all standard/season-anchor pick writes must invalidate device startup data');

assert(games.includes('JSON.stringify(games),\n    1800'), 'Games cache should remain warm for 30 minutes');
assert(appCache.includes('JSON.stringify(categories),\n    1800'), 'category cache should remain warm for 30 minutes');
assert(picks.includes('JSON.stringify(result),\n      1800'), 'per-user picks cache should remain warm and write-invalidated');
assert(leagues.includes('CacheService.getScriptCache().put(scriptCacheKey, serialized, 900)'), 'league reads should remain warm for 15 minutes');
assert(appearance.includes('CacheService.getScriptCache().put(cacheKey, serialized, 1800)'), 'appearance bundle should remain warm for 30 minutes');
assert(reality.includes('CacheService.getScriptCache().put(cacheKey, JSON.stringify(lookup), 1800)'), 'Reality TV season detection should not reopen its sheet every two minutes');
assert(reality.includes('CacheService.getScriptCache().put(coreCacheKey, serialized, 1800)'), 'Reality TV core should remain warm for 30 minutes');
assert(reality.includes('CacheService.getScriptCache().put(cacheKey, serialized, 1800)'), 'Reality TV player stats should remain warm for 30 minutes');
assert(auth.includes('CacheService.getScriptCache().put(key, username, 300)'), 'session lookup cache should remain short-lived and revocation-aware');
assert(auth.includes('authClearCachedSessionToken_'), 'session cache revocation hook must remain present');
assert(appCache.includes('keys.push(getUserPicksCacheKey_(username, gameId))'), 'pick writes must invalidate user picks cache');
assert(appCache.includes('keys.push(appStartupPayloadCacheKey_(username, gameId))'), 'pick writes must invalidate server startup payload cache');

console.log('production-cache-persistence-v1.2.19-rc4-tests: PASS');
