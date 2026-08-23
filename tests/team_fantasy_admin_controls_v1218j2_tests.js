const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const engine = read('backend/engines/SportsTeamFantasyEngine.js');
const api = read('frontend/js/api.js');
const apiMirror = read('frontend/api.js');
const player = read('frontend/js/pages/teamFantasy.js');
const admin = read('frontend/js/pages/adminTeamFantasy.js');
const bridge = read('functions/api/team-fantasy.js');
const sw = read('frontend/sw.js');

assert(engine.includes('TEAM_FANTASY_VERSION = "1.2.18r"'), 'current Team Fantasy engine version marker missing');
['LastSyncAt','LastSyncStatus','LastSyncMessage'].forEach((name) => assert(engine.includes('"' + name + '"'), 'missing settings audit header ' + name));
assert(engine.includes('function teamFantasySyncTriggerStatus_()'), 'trigger verification helper missing');
assert(engine.includes('function teamFantasyRecordSyncStatus_('), 'sync audit helper missing');
assert(engine.includes('scheduleGames: schedule.games.length'), 'manual sync does not report schedule count');
assert(engine.includes('triggerActive: triggerStatus.active === true'), 'dashboard trigger status missing');
assert(engine.includes('lastSyncMessage: settings.lastSyncMessage'), 'dashboard last-sync audit missing');
assert(engine.includes('The Team Fantasy 5-minute trigger was not found after installation.'), '5-minute trigger install is not verified');

assert(api.includes('function apiTeamFantasyPost_('), 'dedicated Team Fantasy POST helper missing');
assert(api.includes('fetch("./api/team-fantasy"'), 'Team Fantasy helper is not using repo-owned bridge');
assert.strictEqual(apiMirror.includes('function apiTeamFantasyPost_('), true, 'frontend api mirror missing Team Fantasy helper');

assert(!/\bapiPost\s*\(/.test(player), 'player Team Fantasy page still uses generic external POST bridge');
assert(!/\bapiPost\s*\(/.test(admin), 'admin Team Fantasy page still uses generic external POST bridge');
assert(player.includes('apiTeamFantasyPost_('), 'player Team Fantasy page does not use dedicated bridge');
assert(admin.includes('apiTeamFantasyPost_('), 'admin Team Fantasy page does not use dedicated bridge');
assert(admin.includes('Run Team Fantasy Sync Now'), 'sync button label not clarified');
assert(admin.includes('adminTfSystemStatus'), 'admin system status panel missing');
assert(admin.includes('5-minute game-day sync installed and verified'), '5-minute trigger verification success message missing');
assert(admin.includes('NFL games checked'), 'sync result does not visibly report schedule check');
assert(admin.includes('✅ Saved'), 'save persistence confirmation missing');

[
  'saveTeamFantasyPick','randomTeamFantasyPicks','autoPickTeamFantasy',
  'adminSaveTeamFantasySettings','adminSaveTeamFantasyRules','adminCreateTeamFantasyLeague',
  'adminAssignTeamFantasyLeagueMember','adminRunTeamFantasySync',
  'adminInstallTeamFantasySyncTrigger','adminSendTeamFantasyReminder'
].forEach((action) => assert(bridge.includes('"' + action + '"'), 'Cloudflare Team Fantasy bridge missing action ' + action));
assert(bridge.includes('redirect: "follow"'), 'Cloudflare bridge must follow Apps Script redirects');
assert(sw.includes('v1218j2-team-fantasy-controls'), 'service worker cache was not bumped');

console.log('Team Fantasy Football v1.2.18j2 admin-control tests passed.');
