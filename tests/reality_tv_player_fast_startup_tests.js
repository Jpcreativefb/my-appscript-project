const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const appData = read('backend/engines/AppDataEngine.js');
const season = read('backend/engines/RealityTvSeasonEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const picks = read('frontend/js/pages/picks.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

assert(appData.includes('includePlayerStats: false'), 'Core startup must defer Reality TV statistics.');
assert(appData.includes('deferred: typeof seasonAnchorUserPayload_'), 'Season Survivor details must be deferred.');
assert(season.includes('function apiGetRealityTvPlayerStats'), 'Deferred Reality TV stats endpoint is missing.');
assert(season.includes('rtv_user_core_'), 'Shared Reality TV core cache is missing.');
assert(season.includes('playerStatsDeferred: true'), 'Core payload must advertise deferred stats.');

const coreStart = season.indexOf('function realityTvUserGameViewPayload_');
const coreEnd = season.indexOf('function apiGetRealityTvPlayerStats', coreStart);
const coreBody = season.slice(coreStart, coreEnd);
assert(!coreBody.includes('realityTvEnsureSystem_();'), 'Player core load must not perform setup writes.');
assert(!coreBody.includes('realityTvSyncGroupsFromContestants_'), 'Player core load must not synchronize groups.');
assert(!coreBody.includes('realityTvEnsureContestantGroupHistory_'), 'Player core load must not create group history.');
assert(!coreBody.includes('realityTvContestantGroupProfile_'), 'Player core load must not reread history per contestant.');
assert(!coreBody.includes('realityTvGroupAssignmentForEpisode_'), 'Player core load must not reread history per eliminated contestant.');

assert(backendApi.includes('action === "getRealityTvPlayerStats"'), 'Backend stats action is not registered.');
assert(frontendApi.includes('function apiGetRealityTvPlayerStats'), 'Frontend stats API wrapper is missing.');
assert(!frontendApi.match(/API_LONG_TIMEOUT_ACTIONS[\s\S]{0,250}"getStartupPayload"/), 'Core startup should not use the two-minute timeout.');
assert(picks.includes('hydratePicksEnhancements_'), 'Picks page deferred hydrator is missing.');
assert(picks.includes('realityTvPlayerSummaryMount'), 'Player summary mount is missing.');
assert(picks.includes('seasonAnchorPickMount'), 'Season Survivor mount is missing.');
assert(picks.includes('refreshPicksEnhancementUi_'), 'Deferred enhancement UI refresh is missing.');
assert(html.includes('306-reality-tv-player-flow'), 'Frontend cache version was not bumped.');
assert(sw.includes('306-reality-tv-player-flow'), 'Service worker cache version was not bumped.');

console.log('Reality TV player fast startup tests passed.');
