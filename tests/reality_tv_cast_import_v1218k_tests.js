'use strict';
const assert = require('assert');
const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
const backend = read('backend/engines/RealityTvSeasonEngine.js');
const api = read('backend/Api.js');
const front = read('frontend/js/pages/adminRealityTv.js');
const apiJs = read('frontend/js/api.js');
const apiMirror = read('frontend/api.js');
const appJs = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const sw = read('frontend/sw.js');

const notifications = read('backend/engines/NotificationsEngine.js');
const teamFantasy = read('backend/engines/SportsTeamFantasyEngine.js');

assert(backend.includes('const REALITY_TV_CAST_IMPORT_SHEET = "RealityCastImport";'), 'RealityCastImport sheet constant missing');
assert(backend.includes('const REALITY_TV_CAST_IMPORT_HEADERS = ['), 'RealityCastImport headers missing');
['KnownFor', 'OriginalShowOrSport', 'RecruitNumber', 'SourceUrl', 'ImageSourceUrl'].forEach(field => {
  assert(backend.includes(`"${field}"`), `${field} profile field missing`);
});
assert(backend.includes('function apiAdminPrepareRealityCastImport(payload)'), 'prepare cast API missing');
assert(backend.includes('function apiAdminPreviewRealityCastImport(payload)'), 'preview cast API missing');
assert(backend.includes('function apiAdminImportRealityCastImport(payload)'), 'import cast API missing');
assert(backend.includes('Do not put secret Faithful/Traitor roles here.'), 'Traitors spoiler safeguard missing');
assert(backend.includes('if (!realityTvString_(contestant.CurrentGroup) && startingGroup)'), 'existing current-group preservation missing');
assert(backend.includes('const base = match ? Object.assign({}, match) : {};'), 'existing contestant preservation missing');

['adminPrepareRealityCastImport', 'adminPreviewRealityCastImport', 'adminImportRealityCastImport'].forEach(action => {
  assert(api.includes(`action === "${action}"`), `${action} backend route missing`);
  assert(apiJs.includes(`"${action}"`), `${action} frontend wrapper missing`);
});
assert.strictEqual(apiJs, apiMirror, 'frontend API mirrors are not synchronized');
assert(front.includes('Reality Cast Import Sheet'), 'Reality Manager cast sheet card missing');
assert(front.includes('Prepare / Open Cast Sheet'), 'prepare/open button missing');
assert(front.includes('Preview Sheet'), 'preview button missing');
assert(front.includes('Import Selected Rows'), 'import-selected button missing');
assert(front.includes('Existing elimination/status history will be preserved.'), 'safe update confirmation missing');
assert(appJs.includes('v1218k-reality-cast-import'), 'frontend asset version not bumped');
assert(appMirror.includes('v1218k-reality-cast-import'), 'frontend app mirror version not bumped');
assert(sw.includes('v1218k-reality-cast-import'), 'service worker cache not bumped');

assert(notifications.includes('teamFantasyNotificationOutstandingSummary_'), 'Team Fantasy notification compatibility hook missing');
assert(notifications.includes('function notificationPushRunScheduledPickReminders()'), 'Automatic notification scheduler compatibility missing');
assert(teamFantasy.includes('teamFantasyNotificationOutstandingSummary_'), 'Team Fantasy outstanding-summary helper missing');

console.log('Reality TV cast import v1.2.18k contract tests passed.');
