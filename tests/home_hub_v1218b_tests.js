'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const pagesCss = read('frontend/css/pages.css');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const appData = read('backend/engines/AppDataEngine.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('dashboard-home-stats-bar'), 'Career stats bar is missing from Home.');
assert(dashboard.includes('Games'), 'Games-played stat is missing.');
assert(dashboard.includes('Wins'), 'Wins stat is missing.');
assert(dashboard.includes('Top 3'), 'Top-three stat is missing.');
assert(dashboard.includes('Avg Finish'), 'Average-finish stat is missing.');
assert(dashboard.includes('Accuracy'), 'Accuracy stat is missing.');
assert(dashboard.includes('renderDashboardFeaturedGame_'), 'Featured/current game renderer is missing.');
assert(dashboard.includes('Current Standings'), 'League standings section is missing.');
assert(dashboard.includes('dashboard-league-scoreboard'), 'League scoreboard markup is missing.');
assert(dashboard.includes('Trophy Room'), 'Trophy Room foundation is missing.');
assert(dashboard.includes('Admin Awards'), 'Future admin-created awards placeholder is missing.');
assert(dashboard.includes('async function hydrateDashboardHomeExtras_()'), 'Home extras should load in the background rather than block initial game rendering.');
assert(dashboard.includes('apiGetUserProfileHistory(username, "")'), 'Career stats should reuse verified archive history.');
assert(dashboard.includes('apiGetLeaderboardForLeague'), 'League cards must request league-specific standings.');

assert(frontendApi.includes('async function apiGetLeaderboardForLeague'), 'League-specific leaderboard API helper is missing.');
assert(frontendApi.includes('leagueId: leagueId || ""'), 'League-specific leaderboard request must send an explicit league ID.');
assert.strictEqual(frontendApi, frontendApiMirror, 'Frontend API mirrors are out of sync.');

assert(
  app.includes('hydrateDashboardHomeExtras_().catch') ||
    (app.includes('dashboardScheduleHomeEnrichment_') && dashboard.includes('await hydrateDashboardHomeExtras_();')),
  'Dashboard post-render hydration hook is missing.'
);
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(appData.includes('defaultGameId: defaultGameId'), 'Dashboard payload must identify the default game for the featured card.');

assert(pagesCss.includes('.dashboard-home-stats-bar'), 'Home stats styles are missing.');
assert(pagesCss.includes('.dashboard-featured-game'), 'Featured-game styles are missing.');
assert(pagesCss.includes('.dashboard-league-home-strip'), 'League home strip styles are missing.');
assert(pagesCss.includes('.dashboard-trophy-room-preview'), 'Trophy Room preview styles are missing.');
assert(pagesCss.includes('@media (max-width: 760px)'), 'Home needs a dedicated mobile layout.');
assert(pagesCss.includes('overflow-x: auto'), 'Mobile stats/leagues should support compact horizontal scrolling.');

assert(app.includes('v1218b-home-hub'), 'App asset version was not bumped for v1.2.18b.');
assert(pwa.includes('v1218b-home-hub'), 'PWA version was not bumped for v1.2.18b.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service-worker cache version was not bumped for v1.2.18b.');

console.log('v1.2.18b Home hub tests passed.');
