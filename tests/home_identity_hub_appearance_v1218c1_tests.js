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
assert(sw.includes('v1218c1-home-identity'), 'Service worker cache was not bumped for 18c1.');

console.log('v1.2.18c1 Home identity + Hub Appearance tests passed.');
