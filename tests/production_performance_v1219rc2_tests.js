const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const auth = read('backend/AuthEngine.js');
const sessions = read('backend/engines/DeviceSessionEngine.js');
const leagues = read('backend/engines/LeagueAccessEngine.js');
const appearance = read('backend/engines/AppearanceEngine.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const routes = JSON.parse(read('frontend/_routes.json'));
const sw = read('frontend/sw.js');
const status = read('PRODUCTION_STATUS.md');

assert(/^1\.2\.19-rc\.[23]$/.test(pkg.version), 'package version must identify rc2 or its final-performance successor');
assert(routes.include.includes('/api/app'), 'Cloudflare /api/app route must remain enabled');
assert(/v1219rc(2-performance-certification|3-final-performance)/.test(app), 'app asset marker must identify rc2 or its successor');
assert(/v1219rc(2-performance-certification|3-final-performance)/.test(sw), 'service worker cache must identify rc2 or its successor');
assert.strictEqual(app, appMirror, 'frontend app compatibility mirror must remain synchronized');

assert(auth.includes('function authGetCachedSessionUsername_'), 'short-lived session lookup cache missing');
assert(auth.includes('authCacheSessionUsername_(token, canonicalUsername)'), 'login must warm the session lookup cache');
assert(auth.includes('const cachedUsername = authGetCachedSessionUsername_(token)'), 'session validation must consult cache before Sheets');
assert(auth.includes('CacheService.getScriptCache().put(key, username, 120)'), 'session cache must remain short-lived');
assert(sessions.includes('authClearCachedSessionToken_(token)'), 'single-device revocation must invalidate session cache');
assert(sessions.includes('authClearCachedSessionToken_(row[data.col.TokenHash])'), 'revoke-all must invalidate hashed session cache keys');

assert(leagues.includes('league_sheet_v1219rc2_'), 'league sheet cross-execution cache missing');
assert(leagues.includes('CacheService.getScriptCache().put(scriptCacheKey, serialized, 300)'), 'league cache TTL must be bounded');
assert(leagues.includes('clearScriptKey(sheetName)'), 'league writes must invalidate script cache');

assert(appearance.includes('appearanceRuntimeCacheGeneration_'), 'appearance runtime generation cache missing');
assert(appearance.includes('appearanceInvalidateRuntimeCache_'), 'appearance cache invalidation missing');
assert(appearance.includes('appearance-runtime-v1219rc2-'), 'appearance runtime bundle cache key missing');
assert(appearance.includes('CacheService.getScriptCache().put(cacheKey, serialized, 300)'), 'appearance bundle should use bounded cache');

assert(/CacheService\.getScriptCache\(\)\.put\(coreCacheKey, serialized, (300|900)\)/.test(reality), 'Reality TV core cache should remain bounded');
assert(/CacheService\.getScriptCache\(\)\.put\(cacheKey, serialized, (300|900)\)/.test(reality), 'Reality TV player-stat cache should remain bounded');

assert(/\}, (1800|6500)\);/.test(app), 'Home optional hydration must be delayed');
assert(dashboard.includes('Do not launch 20 independent Apps Script executions at once'), 'dashboard standings serialization guard missing');
assert(!dashboard.includes('const jobs = unique.slice(0, 20).map'), 'dashboard must not fan out 20 leaderboard calls');
assert(!dashboard.includes('await Promise.allSettled([\n    hydrateDashboardLeagueStandings_'), 'Home league/game standings must not hydrate concurrently');
assert(!dashboard.includes('const jobs = leagueItems.map'), 'league cards must not fan out concurrent Apps Script calls');

assert(/v1\.2\.19-rc(2|3)/.test(status), 'production status must identify rc2 or its successor');

console.log('production-performance-v1.2.19-rc2-tests: PASS');
