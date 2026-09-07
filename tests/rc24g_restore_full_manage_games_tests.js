const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const jsApp = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const admin = read('frontend/js/pages/admin.js');
const cleanup = read('frontend/js/pages/adminGamesRc24e.js');
const shell = read('frontend/app.html');
const api = read('backend/Api.js');

assert.strictEqual(jsApp, appMirror, 'frontend app.js mirrors must match');
const route = jsApp.slice(jsApp.indexOf('case "admin-games":'), jsApp.indexOf('case "admin-awards":'));
assert(route.includes('renderAdminGamesPage()'), 'Manage Games must keep the RC24F module entry point');
assert(!route.includes('await renderAdminGamesPanel()'), 'router must not bypass the page module');
assert(route.includes('Manage Games page script is not loaded.'), 'Manage Games route guard missing');
assert(cleanup.includes('async function renderAdminGamesPage()'), 'RC24G page wrapper missing');
assert(cleanup.includes('return renderAdminGamesPanel();'), 'RC24G page wrapper must delegate to the full editor');

const panelStart = admin.indexOf('async function renderAdminGamesPanel()');
const panelEnd = admin.indexOf('\nfunction adminCurrentYear_', panelStart);
assert(panelStart >= 0 && panelEnd > panelStart, 'full Manage Games panel not found');
const panel = admin.slice(panelStart, panelEnd);
assert(panel.includes('renderAdminGameForm('), 'full per-game forms must remain');
assert(panel.includes('renderAdminPermanentPurgeDangerZone(games)'), 'purge must remain above full game list');
assert(panel.includes('adminGamesFilterMarkup_(games)'), 'cleanup filters must remain with full game list');

['Game Basics','Game Structure','Availability','Player Entries','Default Game','Leaderboard','Advanced game controls'].forEach(label => {
  assert(admin.includes(label), 'missing restored full-editor control: ' + label);
});
assert(admin.includes('data-admin-game-filterable="${isNew ? "false" : "true"}"'), 'full game cards must be filterable');
assert(cleanup.includes('[data-admin-game-filterable=\"true\"]'), 'cleanup filter must target restored full editor cards');
assert(cleanup.includes('window.PATTC_ADMIN_GAMES_VERSION = "rc24e-admin-games-live-r1";'), 'RC24E compatibility marker must remain');
assert(cleanup.includes('window.PATTC_ADMIN_GAMES_RESTORE_VERSION = "rc24g-full-editor-plus-cleanup-r1";'), 'RC24G restoration marker missing');
assert(shell.includes('adminrestore=rc24g-full-manage-games-r1'), 'RC24G shell cache-bust marker missing');
assert(jsApp.includes('rc24g-full-manage-games-r1'), 'RC24G lazy-module cache-bust marker missing');

// Preserve the RC24F purge transport correction while this frontend-only restoration lands.
assert(api.includes('return json(apiAdminPermanentGamePurgeDryRun(params));'));
assert(api.includes('return json(apiAdminPermanentGamePurge(params));'));
assert(!api.includes('return json(apiAdminPermanentGamePurgeDryRun(body));'));
assert(!api.includes('return json(apiAdminPermanentGamePurge(body));'));

console.log('RC24G full Manage Games restoration tests: PASS');
