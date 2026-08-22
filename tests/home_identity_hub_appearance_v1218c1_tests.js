'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const pagesCss = read('frontend/css/pages.css');
const stylesCss = read('frontend/css/styles.css');
const appearanceCss = read('frontend/css/appearance.css');
const adminAppearance = read('frontend/js/pages/adminAppearance.js');
const appearanceEngine = read('backend/engines/AppearanceEngine.js');
const appData = read('backend/engines/AppDataEngine.js');
const api = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('dashboard-colored-game-card'), 'Home game cards should use assigned game color/artwork.');
assert(dashboard.includes('heroImageFileId'), 'Dashboard game images should fall back to Drive hero image IDs.');
assert(dashboard.includes('dashboard-player-sticky'), 'Sticky compact player identity is missing.');
assert(dashboard.includes('dashboard-career-more'), 'Compact Career Stats more affordance is missing.');
assert(dashboard.includes('dashboardApplyHubAppearance_'), 'Runtime hub/nav appearance application is missing.');
assert(dashboard.includes('bottom-nav-custom-icon'), 'Bottom navigation custom icon support is missing.');
assert(dashboard.includes('ShowNavLabel'), 'Bottom navigation label visibility support is missing.');
assert(pagesCss.includes('@keyframes dashboardSnarkFade'), 'Snark line fade behavior is missing.');
assert(pagesCss.includes('.dashboard-compact-game.has-game-image'), 'Mobile game artwork treatment is missing.');
assert(stylesCss.includes('--bottom-nav-accent'), 'Per-hub bottom navigation color styling is missing.');

assert(adminAppearance.includes('Hub + Navigation Appearance'), 'Admin Hub Appearance editor is missing.');
assert(adminAppearance.includes('adminAppearanceUploadHubAsset_'), 'Hub image/icon upload workflow is missing.');
assert(adminAppearance.includes('appearanceHubShowNavLabel'), 'Admin nav label toggle is missing.');
assert(appearanceCss.includes('.appearance-hub-media-grid'), 'Hub Appearance editor styles are missing.');

assert(appearanceEngine.includes('AppearanceHubSettings'), 'Hub appearance settings sheet is missing.');
assert(appearanceEngine.includes('appearanceGetHubAppearanceRows_'), 'Hub appearance runtime resolver is missing.');
assert(appearanceEngine.includes('adminSaveAppearanceHubSetting'), 'Hub appearance save endpoint is missing.');
assert(appData.includes('hubAppearance: hubAppearance'), 'Dashboard payload must include hub appearance settings.');
assert(api.includes('adminSaveAppearanceHubSetting'), 'Hub appearance API route is missing.');
assert(frontendApi.includes('apiAdminSaveAppearanceHubSetting'), 'Frontend Hub Appearance API helper is missing.');
assert.strictEqual(frontendApi, frontendApiMirror, 'Frontend API mirrors are out of sync.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(app.includes('v1218c1-home-identity'), 'App cache version was not bumped for 18c1.');
assert(pwa.includes('v1218c1-home-identity'), 'PWA version was not bumped for 18c1.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service worker cache was not bumped for 18c1.');

console.log('v1.2.18c1 Home identity + Hub Appearance tests passed.');
