const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const appData = fs.readFileSync(path.join(root, 'backend/engines/AppDataEngine.js'), 'utf8');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(season.includes('realityTvPlayerStatsPayload_'), 'Reality TV player stats payload is missing.');
assert(season.includes('compactLeaderboard'), 'Compact leaderboard payload is missing.');
assert(season.includes('positionChange'), 'Per-episode position movement is missing.');
assert(season.includes('participant.eliminatedEpisode') && season.includes('row.EpisodeNumber'), 'Episode-specific eliminated participant mapping is missing.');
assert(appData.includes('realityTvUserGameViewPayload_(gameId, username, { includePlayerStats: false })'), 'The startup payload must load the Reality TV core without blocking on player statistics.');
assert(picks.includes('apiGetRealityTvPlayerStats') && picks.includes('hydratePicksEnhancements_'), 'Reality TV player statistics must hydrate after the core Picks page renders.');
assert(picks.includes('renderRealityTvPlayerSummary_'), 'Top player score summary is missing.');
assert(picks.includes('realityTvEpisodeHeaderStats_'), 'Per-episode header stats renderer is missing.');
assert(picks.includes('Week points') && picks.includes('Correct'), 'Weekly points/correct totals are missing from the collapsible header.');
assert(!picks.includes('Number(meta.eliminatedEpisode || 0) === categoryEpisodeNumber'), 'Elimination state must not bleed into every question in the same historical episode.');
assert(picks.includes('realityTvNomineeResultState_'), 'Historical result styling must be driven by the settled question result.');
assert(css.includes('.reality-player-summary-card'), 'Player summary styles are missing.');
assert(css.includes('.reality-episode-header-stats'), 'Episode header stat styles are missing.');
assert(html.includes('310-reality-tv-historical-results'), 'Frontend cache version was not bumped.');
assert(sw.includes('v310-reality-tv-historical-results'), 'Service worker cache version was not bumped.');

console.log('Reality TV weekly header stats tests passed.');
