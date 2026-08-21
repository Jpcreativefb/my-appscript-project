'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const adminAppearance = read('frontend/js/pages/adminAppearance.js');
const runtime = read('frontend/js/appearanceThemeRuntime.js');
const leaderboard = read('frontend/js/pages/leaderboard.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const pagesCss = read('frontend/css/pages.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(adminAppearance.includes('Leaderboard / Standings'), 'Appearance Studio leaderboard editor is missing.');
assert(adminAppearance.includes('appearanceThemeLeaderboardLayout'), 'Leaderboard layout control is missing.');
assert(adminAppearance.includes('appearanceThemeLeaderboardShowAvatar'), 'Player photo visibility control is missing.');
assert(adminAppearance.includes('appearanceThemeLeaderboardTopThree'), 'Top-three highlighting control is missing.');
assert(adminAppearance.includes('appearanceThemeLeaderboardCurrent'), 'Current-player highlight control is missing.');
assert(adminAppearance.includes('appearanceThemeLeaderboardShowWager'), 'Wager-stat visibility control is missing.');
assert(adminAppearance.includes('Home / Hub Mini Scoreboard'), 'Mini scoreboard controls are missing.');
assert(adminAppearance.includes('appearanceLeaderboardPreview'), 'Leaderboard live preview is missing.');

assert(runtime.includes('function leaderboardPresentation(theme)'), 'Shared leaderboard presentation serializer is missing.');
assert(runtime.includes('leaderboardPresentation: leaderboardPresentation'), 'Leaderboard serializer is not exported.');
assert(runtime.includes('lb-hide-avatar'), 'Leaderboard avatar visibility runtime class is missing.');
assert(runtime.includes('--lb-mini-gradient'), 'Mini scoreboard gradient runtime variable is missing.');

assert(leaderboard.includes('leaderboardAppearanceLoad_'), 'Full leaderboard does not load game appearance.');
assert(leaderboard.includes('apiGetGameAppearance(gameId)'), 'Full leaderboard is not tied to the game Theme Pack.');
assert(leaderboard.includes('leaderboardCardClasses_'), 'Top-three/current-user row classes are missing.');
assert(leaderboard.includes('leaderboard-stat-wager'), 'Wager stats are not individually style/visibility addressable.');
assert(leaderboard.includes('leaderboard-stat-season'), 'Season/survivor stats are not individually addressable.');

assert(dashboard.includes('leaderboard-mini-appearance'), 'Home league mini-scoreboard does not consume leaderboard appearance.');
assert(dashboard.includes('apiGetGameAppearance(item.game.gameId)'), 'Home mini-scoreboard does not load the game Theme Pack.');
assert(pagesCss.includes('.leaderboard-appearance-root'), 'Leaderboard runtime CSS is missing.');
assert(pagesCss.includes('.reality-compact-leaderboard-row'), 'Reality compact standings are not included in the shared appearance CSS.');
assert(pagesCss.includes('.lb-top-1'), 'Top-three styling is missing.');
assert(pagesCss.includes('.lb-current-user'), 'Current-user highlighting is missing.');

assert(app.includes('v1218d-scoreboard-leaderboard'), 'App asset version was not bumped for v1.2.18d.');
assert(pwa.includes('v1218d-scoreboard-leaderboard'), 'PWA version was not bumped for v1.2.18d.');
assert(sw.includes('v1218d-scoreboard-leaderboard'), 'Service-worker cache was not bumped for v1.2.18d.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

console.log('v1.2.18d scoreboard / leaderboard appearance tests passed.');
