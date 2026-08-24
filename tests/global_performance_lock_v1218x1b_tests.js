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

const cache = read('backend/services/AppCache.js');
ok(/const CACHE_TTL = 600;/.test(cache), 'Cache TTL must be 10 minutes');
ok(cache.includes('function appCacheRemoveKeys_'), 'Missing batched cache remover');
ok(cache.includes('cache.removeAll(clean.slice(i, i + 75))'), 'Cache invalidation must batch removeAll');
ok(cache.includes('function clearPlayerActionCaches'), 'Missing player-action cache invalidation');
ok(cache.includes('function clearGameDataCaches'), 'Missing game-scoped cache invalidation');
const clearApp = fnSlice(cache, 'clearAppCaches');
ok(clearApp.indexOf('const games =') < clearApp.indexOf('const baseKeys ='), 'clearAppCaches must snapshot games before invalidating raw keys');
ok(clearApp.includes('appCacheRemoveKeys_(cache, keys)'), 'clearAppCaches must batch invalidation');
const clearPicks = fnSlice(cache, 'clearPicksCaches');
ok(clearPicks.includes('clearPlayerActionCaches('), 'Pick saves must use targeted cache invalidation');

const sports = read('backend/engines/SportsWagerEngine.js');
ok(sports.includes('SPORTS_WAGER_AUTOMATION_LEASE_V1218X1'), 'Missing sports automation lease');
for (const name of ['runSportsWagerScoreRefresh','runSportsWagerSmartAutomation']) {
  const body = fnSlice(sports, name);
  ok(body.includes('sportsWagerAcquireAutomationLease_'), name + ' must acquire short lease');
  ok(!body.includes('LockService.getScriptLock()'), name + ' must not hold global ScriptLock during work');
}
const scoreRefresh = fnSlice(sports, 'runSportsWagerScoreRefresh');
ok(scoreRefresh.includes('skipCacheClear: true'), 'Sports batch must suppress repeated cache clears');
ok(scoreRefresh.includes('sportsWagerClearCachesForGames_(gameIds)'), 'Sports batch must invalidate affected games once after batch');
ok(!sports.includes('clearAppCaches();'), 'Sports wager engine must not globally clear all game caches');

const notifications = read('backend/engines/NotificationsEngine.js');
ok(notifications.includes('PUSH_REMINDER_RUN_LEASE_V1218X1'), 'Missing notification reminder lease');
const reminders = fnSlice(notifications, 'notificationPushRunScheduledPickReminders');
ok(reminders.includes('notificationPushAcquireReminderLease_'), 'Reminder scheduler must use lease');
ok(!reminders.includes('LockService.getScriptLock()'), 'Reminder scheduler must not hold global ScriptLock during delivery');

const ranking = read('backend/engines/RankingGameEngine.js');
const rankingEnsure = fnSlice(ranking, 'rankingEnsureSheet_');
const rankingSave = fnSlice(ranking, 'saveRankingBallot_');
ok(rankingEnsure.includes('LockService.getScriptLock()'), 'Ranking first-use sheet creation must retain w3 race protection');
ok(rankingSave.includes('getDocumentLock'), 'Ranking ballot saves must use interactive document lock domain');
ok(rankingSave.includes('tryLock(2500)'), 'Ranking ballot save contention must be capped below 5 seconds');
ok(!rankingSave.includes('waitLock(10000)'), 'Ranking ballot saves must not wait 10 seconds');
ok(!rankingSave.includes('clearContents()'), 'Ranking ballot save must not clear/rewrite entire sheet');
ok(!rankingSave.includes('clearAppCaches'), 'Ranking ballot save must not globally clear caches');
ok(rankingSave.includes('matchingRows'), 'Ranking ballot save must update only matching rows');
ok(rankingSave.includes('clearPlayerActionCaches'), 'Ranking ballot save must target cache invalidation');

const betting = read('backend/engines/BettingEngine.js');
const saveBet = fnSlice(betting, 'saveBet');
ok(saveBet.includes('getDocumentLock'), 'Bet saves must use interactive document lock domain');
ok(!saveBet.includes('clearAppCaches'), 'Bet save must not globally clear caches');
ok(saveBet.indexOf('lock.releaseLock()') < saveBet.lastIndexOf('getUserBettingSummary'), 'Bet save must release write lock before summary reconstruction');

const picks = read('backend/engines/PicksEngine.js');
ok(picks.includes('typeof LockService.getDocumentLock === "function"'), 'Pick saves must prefer document lock with safe fallback');

const adminCategories = read('backend/admin/AdminCategories.js');
ok(adminCategories.includes('typeof LockService.getDocumentLock === "function"'), 'Admin category saves must use interactive lock domain');

const racing = read('backend/engines/RacingWagerEngine.js');
ok(!racing.includes('clearAppCaches();'), 'Racing engine must not globally clear all game caches');
ok(racing.includes('clearGameDataCaches(awardsGameId'), 'Racing engine must invalidate only affected game');

console.log('Global performance / lock contention v1.2.18x1b tests passed.');

const app = read('frontend/js/app.js');
ok(app.includes('-v1218x1b-performance'), 'App runtime asset marker must be bumped for x1b');
ok(/const APP_ASSET_VERSION\s*=\s*"[^"]*-v1218x1b-performance(?:-[^"]+)?";/.test(app), 'Production one-line APP_ASSET_VERSION must retain the x1b marker when later hotfixes append a suffix');
ok(app.includes('APP_PAGE_SNAPSHOT_CACHE'), 'Public navigation must keep in-session page snapshots');
ok(app.includes('APP_PAGE_SNAPSHOT_FRESH_MS'), 'Page snapshot freshness window missing');
ok(app.includes('appRefreshSnapshotQuietly_'), 'Cached pages must refresh quietly instead of blocking navigation');
ok(app.includes('const usePageLoader = options.suppressLoader !== true;'), 'Navigation must preserve suppressLoader compatibility');
ok(app.includes('if (snapshot) {'), 'Cached navigation must short-circuit before opening the route loader');

const adminPage = read('frontend/js/pages/admin.js');
ok(adminPage.includes('Sports Scores & Game Builder'), 'Admin page must restore Sports Scores & Game Builder launcher');
ok(adminPage.includes("window.location.href='./sports.html'"), 'Admin Sports launcher must open sports.html');

const sportsPage = read('frontend/js/sports.js');
ok(sportsPage.includes('Admin access required.'), 'Sports page must be admin-gated');
ok(sportsPage.includes('sportsSessionIsAdmin_(session)'), 'Sports startup must verify admin session');

const adminCats = read('backend/admin/AdminCategories.js');
ok(adminCats.includes('function adminCatClearCaches_(gameId)'), 'Admin category cache invalidation must be game-scoped');
ok(adminCats.includes('clearGameDataCaches(gameId'), 'Admin category saves must target the affected game cache');

const normalized = read('backend/engines/NormalizedQuestionStorageEngine.js');
ok(normalized.includes('function normalizedStorageClearCaches_(gameId)'), 'Normalized storage cache clear must accept game scope');

const confidence = read('backend/engines/SportsConfidenceBuilderEngine.js');
ok(!confidence.includes('clearAppCaches();'), 'Sports Confidence builder must not dump all app caches');

const advanced = read('backend/engines/SportsAdvancedQuestionEngine.js');
ok(!advanced.includes('clearAppCaches();'), 'Sports Advanced builder must not dump all app caches');

const betSave = fnSlice(betting, 'saveBet');
ok(betSave.indexOf('validateGameId(gameId)') < betSave.indexOf('lock.tryLock(2500)'), 'Wager validation must happen before the shared write lock');
ok(betSave.includes('lock.tryLock(2500)'), 'Interactive wager lock wait must be capped below 5 seconds');

// Interactive timeout caps: never make a user/admin stare at a 10-30 second lock wait.
ok(!adminCats.match(/waitLock\((?:10000|15000|20000)\)/), 'Admin category writes must not wait 10-20 seconds on a lock');
const settings = read('backend/engines/SettingsEngine.js');
ok(!settings.includes('waitLock(10000)'), 'Settings writes must cap lock waits below 10 seconds');
const appearance = read('backend/engines/AppearanceEngine.js');
ok(!appearance.includes('tryLock(10000)'), 'Appearance writes must cap lock waits below 10 seconds');
ok(!sports.includes('lock.tryLock(30000);'), 'Sports Wager interactive/background paths must not hold a 30 second shared lock');
ok(sports.includes('lock.tryLock(5000);'), 'Sports Wager admin creation should cap contention at 5 seconds');

const appHtml = read('frontend/app.html');
ok(appHtml.includes('-v1218x1b-performance'), 'App shell must request the x1b performance asset');
const sw = read('frontend/sw.js');
ok(sw.includes('-v1218x1b-performance'), 'Service worker cache must be bumped for x1b');

console.log('Global performance x1b timeout/cache-shell assertions passed.');
