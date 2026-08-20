
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const admin = read('frontend/js/pages/adminAppearance.js');
const css = read('frontend/css/appearance.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(admin.includes('appearanceHubLivePreview'), 'Hub Appearance needs a prominent live preview.');
assert(admin.includes('appearanceHubSaveState'), 'Hub Appearance needs visible saved/dirty state.');
assert(admin.includes('appearanceHubImageState'), 'Hub image needs a visible source/save state.');
assert(admin.includes('appearanceHubIconState'), 'Hub icon needs a visible source/save state.');
assert(admin.includes('adminAppearancePreviewHubUrl_'), 'Web URL should preview before save.');
assert(admin.includes('adminAppearancePreviewHubLocalFile_'), 'Local upload should preview immediately.');
assert(admin.includes('adminAppearanceSetHubAssetPreview_'), 'Hub asset preview updater is missing.');
assert(admin.includes('adminAppearanceMarkHubDirty_'), 'Hub controls should mark unsaved changes.');
assert(admin.includes('✓ Uploaded + saved to Google Drive'), 'Drive upload confirmation is missing.');
assert(admin.includes('✓ Saved to Google Drive'), 'Drive import confirmation is missing.');
assert(admin.includes('✓ External URL saved'), 'External URL confirmation is missing.');
assert(admin.includes('adminAppearanceUpdateLocalHubRow_'), 'Saved hub state should update in-place without losing the preview.');
assert(css.includes('.appearance-hub-live-preview'), 'Live preview styles are missing.');
assert(css.includes('.appearance-hub-asset-state.is-saved'), 'Saved asset feedback styles are missing.');
assert(css.includes('.appearance-hub-save-state.is-dirty'), 'Unsaved feedback styles are missing.');
assert(app.includes('v1218c3-live-preview'), 'Frontend cache was not bumped for 18c3.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(pwa.includes('v1218c3-live-preview'), 'PWA cache was not bumped for 18c3.');
assert(sw.includes('v1218c3-live-preview'), 'Service worker cache was not bumped for 18c3.');

console.log('v1.2.18c3 Hub Appearance live preview + save feedback tests passed.');
