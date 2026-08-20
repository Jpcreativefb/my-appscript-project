'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const admin = read('frontend/js/pages/adminAppearance.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const appearanceEngine = read('backend/engines/AppearanceEngine.js');
const appearanceCss = read('frontend/css/appearance.css');
const pagesCss = read('frontend/css/pages.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(admin.includes('appearanceHubImageOpacity'), 'Hub image opacity control is missing.');
assert(admin.includes('appearanceHubImageDarken'), 'Hub image darken control is missing.');
assert(admin.includes('adminAppearancePreviewHubImageTone_'), 'Hub image tone should update the live preview immediately.');
assert(admin.includes('League Card —'), 'Appearance editor should expose per-league card settings.');
assert(admin.includes('Appearance label only — this does not rename the league.'), 'League appearance label should not imply the league itself is renamed.');

assert(appearanceEngine.includes('"ImageOpacity"'), 'AppearanceHubSettings schema is missing ImageOpacity.');
assert(appearanceEngine.includes('"ImageDarken"'), 'AppearanceHubSettings schema is missing ImageDarken.');
assert(appearanceEngine.includes('appearanceLeagueDefaultRows_'), 'Dynamic league appearance defaults are missing.');
assert(appearanceEngine.includes('appearanceHubSettingKey_("league", leagueId)'), 'League card appearance needs stable league setting keys.');
assert(appearanceEngine.includes('appearance-hub-settings-v1218c4'), 'Hub appearance cache was not bumped for 18c4.');

assert(dashboard.includes('dashboardHubImageTone_'), 'Runtime hub image tone resolver is missing.');
assert((dashboard.match(/const tone = dashboardHubImageTone_\(setting\);/g) || []).length >= 4, 'Hub launcher, hub header, subhub and league card must each resolve image tone before rendering.');
assert(dashboard.includes('dashboardLeagueCardAppearance_'), 'League cards should consume their own appearance settings.');
assert(dashboard.includes('dashboardHubSetting_("league", leagueId)'), 'League cards are not looking up league-specific appearance.');
assert(dashboard.includes('--dashboard-league-fill'), 'League gradient fill runtime variable is missing.');
assert(dashboard.includes('--dashboard-league-image-opacity'), 'League image opacity runtime variable is missing.');
assert(dashboard.includes('--dashboard-league-image-darken'), 'League image darken runtime variable is missing.');

assert(appearanceCss.includes('.appearance-hub-image-controls'), 'Hub image tone control styles are missing.');
assert(appearanceCss.includes('--appearance-hub-image-opacity'), 'Hub image preview does not consume opacity.');
assert(pagesCss.includes('var(--dashboard-league-fill'), 'League cards do not consume saved solid/gradient colors.');
assert(pagesCss.includes('var(--dashboard-league-image-opacity'), 'League cards do not consume saved image opacity.');
assert(pagesCss.includes('var(--dashboard-league-image-darken'), 'League cards do not consume saved image darkening.');

assert(app.includes('v1218c3-live-preview-v1218c4-image-tone-league-cards'), 'Frontend cache was not bumped for 18c4 while preserving 18c3.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(pwa.includes('v1218c4-image-tone-league-cards'), 'PWA cache was not bumped for 18c4.');
assert(sw.includes('v1218c4-image-tone-league-cards'), 'Service worker cache was not bumped for 18c4.');

console.log('v1.2.18c4 hub image tone + league card appearance tests passed.');
