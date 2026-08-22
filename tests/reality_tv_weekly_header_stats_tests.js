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
assert(html.includes('313-external-results-hub-end-to-end'), 'Frontend cache version was not bumped.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service worker cache version was not bumped.');

console.log('Reality TV weekly header stats tests passed.');
