'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const adminAppearance = read('frontend/js/pages/adminAppearance.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const appearanceEngine = read('backend/engines/AppearanceEngine.js');
const appearanceCss = read('frontend/css/appearance.css');
const pagesCss = read('frontend/css/pages.css');
const stylesCss = read('frontend/css/styles.css');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(adminAppearance.includes('Use Web URL'), 'Hub image/icon controls should support external web URLs.');
assert(adminAppearance.includes('Import URL to Drive'), 'Hub image/icon controls should import web images to Google Drive.');
assert(adminAppearance.includes("appearanceHubImageCamera"), 'Hub image controls should support direct camera capture.');
assert(adminAppearance.includes("appearanceHubIconCamera"), 'Hub icon controls should support direct camera capture.');
assert(adminAppearance.includes('adminAppearanceUseHubAssetUrl_'), 'Shared hub web image save/import workflow is missing.');
assert(adminAppearance.includes('apiAdminImportImageFromUrl'), 'Hub URL import should reuse the secure image importer.');
assert(adminAppearance.includes('drive-upload'), 'Uploaded hub assets should record Drive ownership.');
assert(adminAppearance.includes('drive-import'), 'Imported hub assets should record Drive ownership.');
assert(adminAppearance.includes('external-url'), 'Externally hosted hub assets should remain identifiable.');

assert(adminAppearance.includes('appearanceHubColorMode'), 'Hub Appearance needs a Solid/Gradient mode control.');
assert(adminAppearance.includes('appearanceHubGradientStart'), 'Hub gradient start control is missing.');
assert(adminAppearance.includes('appearanceHubGradientEnd'), 'Hub gradient end control is missing.');
assert(adminAppearance.includes('appearanceHubGradientAngle'), 'Hub gradient angle control is missing.');
assert(adminAppearance.includes('adminAppearancePreviewHubColor_'), 'Hub gradient preview wiring is missing.');

['ColorMode','GradientStart','GradientEnd','GradientAngle','ImageSourceType','ImageSourceUrl','IconSourceType','IconSourceUrl'].forEach(field => {
  assert(appearanceEngine.includes('"' + field + '"'), 'AppearanceHubSettings is missing ' + field + '.');
});
assert(appearanceEngine.includes('appearance-hub-settings-v1218c2'), 'Hub settings cache should be bumped for the new schema.');

assert(dashboard.includes('dashboardHubColorSpec_'), 'Dashboard gradient resolver is missing.');
assert(dashboard.includes('--dashboard-hub-fill'), 'Main hub gradient runtime variable is missing.');
assert(dashboard.includes('--dashboard-domain-fill'), 'Hub page gradient runtime variable is missing.');
assert(dashboard.includes('--dashboard-subhub-fill'), 'Subhub gradient runtime variable is missing.');
assert(dashboard.includes('--bottom-nav-accent-bg'), 'Bottom-nav gradient runtime variable is missing.');
assert(pagesCss.includes('var(--dashboard-hub-fill'), 'Hub cards do not consume saved gradients.');
assert(pagesCss.includes('var(--dashboard-domain-fill'), 'Hub page header does not consume saved gradients.');
assert(pagesCss.includes('var(--dashboard-subhub-fill'), 'Subhub header does not consume saved gradients.');
assert(stylesCss.includes('var(--bottom-nav-accent-bg'), 'Bottom nav does not consume saved gradients.');
assert(appearanceCss.includes('.appearance-hub-gradient-grid'), 'Hub gradient editor styles are missing.');

assert(frontendApi.includes('apiAdminImportImageFromUrl'), 'Frontend web-image import API helper is missing.');
assert.strictEqual(frontendApi, frontendApiMirror, 'Frontend API mirrors are out of sync.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(app.includes('v1218c2-hub-media-gradients'), 'App asset cache was not bumped for 18c2.');
assert(pwa.includes('v1218c2-hub-media-gradients'), 'PWA version was not bumped for 18c2.');
assert(sw.includes('v1218c2-hub-media-gradients'), 'Service worker cache was not bumped for 18c2.');

console.log('v1.2.18c2 hub media + gradients tests passed.');
