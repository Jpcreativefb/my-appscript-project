const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const games = read('backend/engines/GamesEngine.js');
const admin = read('frontend/js/pages/admin.js');
const sw = read('frontend/sw.js');

assert(games.includes('id: "team-fantasy"'), 'backend Team Fantasy game type missing');
assert(admin.includes('["team-fantasy", "Team Fantasy Football"]'), 'Manage Games dropdown option missing');
assert(admin.includes('Team Fantasy Engine: ON • Normal Predictions/Wagers: OFF'), 'Team Fantasy game type summary missing');
assert(admin.includes('TEAM_FANTASY_V1218J1 DEFAULTS'), 'Team Fantasy default branch marker missing');
assert(sw.includes('v1218j1-team-fantasy-create'), 'service-worker cache hotfix marker missing');

const optionCount = (admin.match(/\["team-fantasy", "Team Fantasy Football"\]/g) || []).length;
assert.strictEqual(optionCount, 1, 'Team Fantasy dropdown option must appear exactly once');

const ordered = admin.indexOf('["team-fantasy", "Team Fantasy Football"]');
const hybrid = admin.indexOf('["mixed", "Hybrid Game"]', ordered);
assert(ordered !== -1 && hybrid !== -1 && ordered < hybrid, 'Team Fantasy option should appear before Hybrid Game');

console.log('Team Fantasy v1.2.18j1 create-game hotfix tests passed.');
