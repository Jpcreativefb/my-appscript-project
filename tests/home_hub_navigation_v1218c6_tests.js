'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const pagesCss = read('frontend/css/pages.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const adminAppearance = read('frontend/js/pages/adminAppearance.js');
const appearanceCss = read('frontend/css/appearance.css');
const appearanceEngine = read('backend/engines/AppearanceEngine.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('const currentGames = playingGames.filter'), 'Home must split attention games from current games.');
assert(dashboard.includes('return attentionGames.indexOf(game) === -1'), 'Attention games must not be duplicated in Home current games.');
assert(dashboard.includes('const currentPlaying = playing.filter'), 'Hub current games must exclude games needing attention.');
assert(dashboard.includes('return attention.indexOf(game) === -1'), 'Hub attention games must not be duplicated in My Current Games.');
assert(dashboard.includes('What Needs Your Attention'), 'Hub needs-action section is missing.');
assert(dashboard.includes('dashboard-subhub-available'), 'Available games should live in a collapsible section.');
assert(dashboard.includes('dashboard-subhub-archive'), 'Archived games should live in a collapsible section.');
assert(dashboard.includes('dashboard-current-games-carousel'), 'Current games should support the mobile swipe carousel layout.');
assert(pagesCss.includes('scroll-snap-type:x mandatory'), 'Mobile current-game carousel needs snap scrolling.');

assert(dashboard.includes('dashboardGameStageLabel_'), 'Week/Episode stage helper is missing.');
assert(dashboard.includes('Episode '), 'Episode labels are not recognized.');
assert(dashboard.includes('Week '), 'Week labels are not recognized.');
assert(dashboard.includes('dashboardGameActivityLabel_'), 'Human game activity labels are missing.');
assert(dashboard.includes('In Progress'), 'In-progress status should be available instead of only Locked.');

assert(dashboard.includes('dashboardStandingsShell_'), 'Game cards need inline standings placeholders.');
assert(dashboard.includes('dashboardHydrateGameStandings_'), 'Game cards need background standings hydration.');
assert(dashboard.includes('>Standings</button>'), 'Current/attention cards need a Standings action.');
assert(app.includes('dashboardHydrateGameStandings_'), 'Hub router must hydrate standings after the hub is painted.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

assert(dashboard.includes('5000 + attention.length'), 'Subhub sort should prioritize areas needing attention.');
assert(dashboard.includes('if (hasLive) return 4000'), 'Subhub sort should prioritize live/in-progress areas next.');
assert(dashboard.includes('openByDefault: index === 0'), 'Only the highest-priority running subhub should auto-open when no other attention rule applies.');

assert(adminAppearance.includes('Subhub Card — '), 'Appearance selector should explicitly identify subhub cards.');
assert(adminAppearance.includes('Subhub Card Color Style'), 'Subhub card color controls should be explicitly labeled.');
assert(adminAppearance.includes('appearanceHubPanelTint'), 'Expanded subhub tint control is missing.');
assert(appearanceEngine.includes('"PanelTint"'), 'Hub settings sheet needs PanelTint storage.');
assert(appearanceEngine.includes('PanelTint: Math.max'), 'PanelTint must be persisted by the backend.');
assert(pagesCss.includes('--dashboard-subhub-panel-tint'), 'Runtime subhub panel tint variable is missing.');
assert(appearanceCss.includes('.appearance-subhub-panel-preview'), 'Admin subhub tint preview styling is missing.');

assert(app.includes('v1218c6-hub-nav-cleanup'), 'App cache version was not bumped for 18c6.');
assert(pwa.includes('v1218c6-hub-nav-cleanup'), 'PWA cache version was not bumped for 18c6.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service worker cache was not bumped for 18c6.');

console.log('v1.2.18c6 hub navigation cleanup tests passed.');
