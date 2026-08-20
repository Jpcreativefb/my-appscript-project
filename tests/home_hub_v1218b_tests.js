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
assert(dashboard.includes('Promise.allSettled([careerPromise, leaguesPromise])'), 'Home extras should load in the background rather than block initial game rendering.');
assert(dashboard.includes('apiGetUserProfileHistory(username, "")'), 'Career stats should reuse verified archive history.');
assert(dashboard.includes('apiGetLeaderboardForLeague'), 'League cards must request league-specific standings.');

assert(frontendApi.includes('async function apiGetLeaderboardForLeague'), 'League-specific leaderboard API helper is missing.');
assert(frontendApi.includes('leagueId: leagueId || ""'), 'League-specific leaderboard request must send an explicit league ID.');
assert.strictEqual(frontendApi, frontendApiMirror, 'Frontend API mirrors are out of sync.');

assert(app.includes('hydrateDashboardHomeExtras_().catch'), 'Dashboard post-render hydration hook is missing.');
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
assert(sw.includes('v1218b-home-hub'), 'Service-worker cache version was not bumped for v1.2.18b.');

console.log('v1.2.18b Home hub tests passed.');
