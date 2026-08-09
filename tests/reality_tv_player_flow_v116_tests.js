const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const season = read('backend/engines/RealityTvSeasonEngine.js');
const questions = read('backend/engines/RealityTvQuestionPackEngine.js');
const anchor = read('backend/engines/SeasonAnchorEngine.js');
const picksEngine = read('backend/engines/PicksEngine.js');
const picksRepo = read('backend/repositories/PicksRepo.js');
const cache = read('backend/services/AppCache.js');
const player = read('frontend/js/pages/picks.js');
const admin = read('frontend/js/pages/adminRealityTv.js');
const app = read('frontend/js/app.js');
const css = read('frontend/css/picks.css');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

assert(season.includes('"PickChangesAllowed", "MaxPickChanges", "PickChangePenalty"'));
assert(season.includes('function realityTvPickRules_'));
assert(season.includes('maxChanges: realityTvPickRules_(season).maxChanges'));
assert(questions.includes('Hub sync is optional and deferred'));
assert(questions.includes('Recovery for builds created before v1.1.6'));
assert(!questions.includes('was built. Preparing Hub mappings.'));
assert(admin.includes('How Save & Build and Resume Build work'));
assert(admin.includes('Normally click Save Format & Build once'));
assert(admin.includes('realityTvPickChangesAllowed_'));
assert(admin.includes('realityTvMaxPickChanges_'));
assert(admin.includes('realityTvPickChangePenalty_'));

const anchorPayloadStart = anchor.indexOf('function seasonAnchorUserPayload_');
const anchorPayloadEnd = anchor.indexOf('function apiGetSeasonAnchor', anchorPayloadStart);
const anchorPayload = anchor.slice(anchorPayloadStart, anchorPayloadEnd);
assert(!anchorPayload.includes('seasonAnchorEnsureSystem_()'), 'Player Survivor read must not create or repair sheets.');
assert.strictEqual((anchorPayload.match(/realityTvUserGameViewPayload_\(gameId/g) || []).length, 1, 'Survivor payload must reuse one Reality TV core view.');
assert(anchorPayload.includes('seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET, true)'));
assert(anchorPayload.includes('seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET, true)'));
assert(player.includes('anchor && anchor.deferred === true'));
assert(player.indexOf('apiGetSeasonAnchor') < player.indexOf('apiGetRealityTvPlayerStats', player.indexOf('async function hydratePicksEnhancements_')));

assert(picksEngine.includes('MAX_CHANGES >= 0'));
assert(picksEngine.includes('unlimitedChanges:'));
assert(picksEngine.includes('AppCache.clearPicksCaches(gameId, username)'));
assert(!picksEngine.includes('PicksRepo.flush();'));
assert(picksRepo.includes('range.setValues([row])'));
assert(cache.includes('function clearPicksCaches(gameId, username)'));
const targetedCacheStart = cache.indexOf('function clearPicksCaches(gameId, username)');
const targetedCacheEnd = cache.indexOf('/* =========================\n   APP CACHE API', targetedCacheStart);
const targetedCache = cache.slice(targetedCacheStart, targetedCacheEnd);
assert(targetedCache.includes('cache.remove("sheet_Picks")'));
assert(targetedCache.includes('rtv_player_stats_'));
assert(!targetedCache.includes('getGames()'));

assert(player.includes('scheduleRealityTvPickAutoAdvance_'));
assert(player.includes('scrollIntoView({ behavior: "smooth", block: "start" })'));
assert(player.includes('data-has-pick='));
assert(player.includes('(penalty > 0 || maxChanges > 0)'));
assert(css.includes('overflow-wrap: anywhere'));
assert(css.includes('white-space: normal'));
assert(app.includes('startPageLoadPulse_'));
assert(app.includes('313-external-results-hub-end-to-end'));
assert(html.includes('313-external-results-hub-end-to-end'));
assert(sw.includes('313-external-results-hub-end-to-end'));

console.log('Reality TV player flow v1.1.6 tests passed.');
