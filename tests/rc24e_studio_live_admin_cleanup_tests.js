const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const app = read('frontend/app.html');
const index = read('frontend/index.html');
const jsApp = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const sw = read('frontend/sw.js');
const studio = read('frontend/js/ownerVisualStudioRc24e.js');
const admin = read('frontend/js/pages/adminGamesRc24e.js');

assert(app.includes('v1219rc24e-studio-live-admin-cleanup-r1'));
assert(index.includes('v1219rc24e-studio-live-admin-cleanup-r1'));
assert(sw.includes('v1219rc24e-studio-live-admin-cleanup-r1'));
assert(app.includes('./js/ownerVisualStudioRc24e.js?release=v1219rc24e-studio-live-admin-cleanup-r1'));
assert(jsApp.includes('"admin-games": ["admin", "adminUi", "adminGamesRc24e"]'));
assert.strictEqual(jsApp, appMirror, 'frontend app.js mirrors must match');
assert(sw.includes('"./js/ownerVisualStudioRc24e.js"'));
assert(sw.includes('"./js/pages/adminGamesRc24e.js"'));

assert(studio.includes('rc24e-owner-visual-studio-r1'));
assert(studio.includes('state.picking=true'));
assert(studio.includes('state.picking = state.open === true'));
assert(studio.includes('Cursor Select: ON'));
assert(studio.includes('scheduleLaunchRetries_'));
assert(studio.includes('bottom:calc(76px + env(safe-area-inset-bottom))'));
assert(studio.includes('selectionDefault:true'));

assert(admin.includes('PATTC_ADMIN_GAMES_VERSION = "rc24e-admin-games-live-r1"'));
assert(admin.includes('id="adminPermanentPurgeDangerZone"'));
assert(admin.includes('RC24E LIVE CLEANUP'));
assert(admin.includes('Run Deletion Preview'));
assert(admin.includes('adminPermanentPurgeAttemptDelete_'));
const purgeUse = admin.indexOf('${renderAdminPermanentPurgeDangerZone(games)}');
const existing = admin.indexOf('class="card admin-card admin-collapsible-card admin-games-panel"');
assert(purgeUse > 0 && existing > 0 && purgeUse < existing, 'Danger Zone must render above Existing Games');

// Preserve RC24D historical contracts while RC24E uses unique live asset paths.
assert(app.includes('ownerVisualStudio.js?release=v1219rc24d-launch-cleanup-visual-studio-r1'));
assert(sw.includes('"./js/ownerVisualStudio.js"'));
assert(sw.includes('"./js/pages/adminGames.js"'));

console.log('RC24E Studio live selection + Admin cleanup wiring tests: PASS');
