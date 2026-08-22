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
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service-worker cache was not bumped for v1.2.18d.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

console.log('v1.2.18d scoreboard / leaderboard appearance tests passed.');
