'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const pagesCss = read('frontend/css/pages.css');
const stylesCss = read('frontend/css/styles.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const appHtml = read('frontend/app.html');
const appData = read('backend/engines/AppDataEngine.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('dashboard-player-card'), 'Player-first Home card is missing.');
assert(dashboard.includes('dashboard-snark-line'), 'Snark message line is missing.');
assert(dashboard.includes('dashboardGetSnarkMessage_'), 'Situation-based snark helper is missing.');
assert(dashboard.includes('dashboard-profile-photo'), 'Profile photo block is missing.');
assert(dashboard.includes('profile.bio || profile.Bio'), 'Short profile note is not wired into Home.');
assert(dashboard.includes('dashboard-career-details'), 'Career stats should be collapsible inside the player card.');
assert(dashboard.includes("navigate('trophy-room')"), 'Trophy Room button/page route is missing.');
assert(dashboard.includes('renderDashboardTrophyRoomPage_'), 'Trophy Room foundation page is missing.');
assert(dashboard.includes('Needs Your Attention'), 'Needs-attention section is missing.');
assert(dashboard.includes("total > 0 && made < total"), 'Newly-added/unmade picks should return a game to Needs Attention.');
assert(dashboard.includes("Games You're Playing"), 'Home should show user-started games separately.');
assert(dashboard.includes('New Games Available'), 'Available/new game discovery section is missing.');
assert(!dashboard.includes('<small>Archive</small>\n            Past Games'), 'Archived games should no longer live on Home.');
assert(dashboard.includes('renderDashboardHubLauncher_'), 'Collapsible Home hub launcher is missing.');
assert(dashboard.includes('renderDashboardSubHub_'), 'League/show/event subhub renderer is missing.');
assert(dashboard.includes('Past / Archived Games'), 'Archive should live inside its respective subhub.');
assert(dashboard.includes('sports: "Sports"'), 'Sports hub is missing.');
assert(dashboard.includes('reality: "Reality Shows"'), 'Reality hub is missing.');
assert(dashboard.includes('awards: "Awards Shows"'), 'Awards hub is missing.');
assert(dashboard.includes('general: "General Games"'), 'General hub is missing.');

assert(appData.includes('apiGetEditableProfile(username, "")'), 'Dashboard payload should carry the lightweight general profile without another browser request.');
assert(appData.includes('hubCategory:'), 'Dashboard game payload should include hub category.');
assert(appData.includes('hubGroup:'), 'Dashboard game payload should include hub subgroup.');
assert(appData.includes('function getDashboardHubPlacement_'), 'Backend hub placement helper is missing.');
assert(appData.includes('category: "sports"'), 'Sports classification is missing.');
assert(appData.includes('category: "reality"'), 'Reality classification is missing.');
assert(appData.includes('category: "awards"'), 'Awards classification is missing.');

assert(app.includes('"hub": ["dashboard"]'), 'Dynamic hub routes must load the Dashboard module.');
assert(app.includes('page.indexOf("hub:") === 0'), 'Dynamic hub route handling is missing.');
assert(app.includes('renderDashboardHubPage_'), 'Hub route renderer is missing.');
assert(app.includes('renderDashboardMorePage_'), 'More route renderer is missing.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

assert(appHtml.includes('data-page="hub:sports"'), 'Sports bottom nav button is missing.');
assert(appHtml.includes('data-page="hub:reality"'), 'Reality bottom nav button is missing.');
assert(appHtml.includes('data-page="hub:awards"'), 'Awards bottom nav button is missing.');
assert(appHtml.includes('data-page="more"'), 'More bottom nav button is missing.');
assert(!appHtml.includes('data-page="profile"'), 'Profile should no longer consume a bottom-nav slot.');

assert(pagesCss.includes('.dashboard-player-card'), 'Player card styles are missing.');
assert(pagesCss.includes('.dashboard-hub-launcher-grid'), 'Hub launcher styles are missing.');
assert(pagesCss.includes('.dashboard-subhub'), 'Subhub styles are missing.');
assert(stylesCss.includes('.bottom-nav-icon'), 'Condensed bottom-nav icon styling is missing.');

assert(app.includes('v1218c-player-hubs'), 'App asset version was not bumped for v1.2.18c.');
assert(pwa.includes('v1218c-player-hubs'), 'PWA version was not bumped for v1.2.18c.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service worker cache was not bumped for v1.2.18c.');

console.log('v1.2.18c player Home + game hub tests passed.');
