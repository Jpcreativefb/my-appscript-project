const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const admin = read('frontend/js/pages/admin.js');
const app = read('frontend/js/app.js');
const games = read('frontend/js/pages/adminGamesRc24e.js');
const managers = read('frontend/js/pages/adminSportsManagersR3.js');

assert.doesNotThrow(() => new Function(admin));
assert.doesNotThrow(() => new Function(app));
assert.doesNotThrow(() => new Function(games));
assert.doesNotThrow(() => new Function(managers));

// Confidence + Survivor remain ordinary Manage Games navigation.
assert(admin.includes("onclick=\"navigate('admin-games')\">Confidence</button>"));
assert(admin.includes("onclick=\"navigate('admin-games')\">Survivor</button>"));
assert(!admin.includes('adminOpenSportsManageGamesR2_'));
assert(!games.includes('adminManageGamesApplyFocusR2_'));
assert(!games.includes('adminManageGamesScheduleFocusR2_'));

// Dedicated destinations.
assert(admin.includes(`navigate('admin-team-fantasy')">Team Fantasy Football`));
assert(admin.includes(`navigate('admin-playoff-race')">Playoff Race`));
assert(admin.includes(`navigate('admin-nfl-cup')">Cups / Combined Competitions → NFL Cup`));
assert(admin.includes(`navigate('admin-nfl-season-setup')">Season / Sports Setup → NFL Sports Pack`));
assert(admin.includes(`navigate('admin-sports-engine')">Sports Engine Controls`));
assert.strictEqual((admin.match(/Sports Scores &amp; Game Builder/g) || []).length, 1);
assert(!admin.includes('id="adminSportsControlPanel"'), 'Sports Engine panel must not render on Admin landing');

['admin-nfl-cup','admin-nfl-season-setup','admin-playoff-race','admin-sports-engine'].forEach(route => {
  assert(app.includes('"' + route + '"'), 'route missing: ' + route);
  assert(app.includes('case "' + route + '"'), 'render switch missing: ' + route);
});

// Existing operational implementations remain, but no longer wrap Manage Games.
assert(games.includes('root.nflSeasonPackAdminCardR3_=nflSeasonPackAdminCard_'));
assert(games.includes('root.nflPlayoffRaceTimingAdminCardR3_=nflPlayoffRaceTimingAdminCard_'));
assert(games.includes('root.nflCupFuturesAdminCardR3_=function()'));
assert(games.includes('root.pattcCupControlAdminCardR3_ = async function'));
assert(!games.includes('const base=root.renderAdminGamesPage;if(typeof base==="function"){root.renderAdminGamesPage=async function(){const html=String(await base()),card=nflSeasonPackAdminCard_()'));
assert(!games.includes("const BASE=root.renderAdminGamesPage;\nif(typeof BASE==='function'){root.renderAdminGamesPage=async function(){"));
assert(!games.includes('const BASE = root.renderAdminGamesPage;\n  if (typeof BASE === \'function\') root.renderAdminGamesPage = async function () {'));
assert(games.includes("var BASE=root.pattcCupControlAdminCardR3_"), 'Cup weekly/season extension must decorate dedicated Cup renderer');

// New pages reuse existing functions/handlers rather than fork APIs.
assert(managers.includes('nflCupFuturesAdminCardR3_()'));
assert(managers.includes('await pattcCupControlAdminCardR3_()'));
assert(managers.includes('nflSeasonPackAdminCardR3_()'));
assert(managers.includes('nflPlayoffRaceTimingAdminCardR3_()'));
assert(managers.includes('adminOpenSportsControls()'));
['apiAdminUpdateGame','apiAdminFinalizeGamePublication','adminBuildNflSeasonPack','adminSaveNflPlayoffRaceSettings'].forEach(token => {
  assert(!managers.includes(token), 'new presentation page must not fork API ownership: ' + token);
});

// Protected backend/engine sources are untouched by this presentation test contract.
console.log('PASS admin specialized manager pages R3');
