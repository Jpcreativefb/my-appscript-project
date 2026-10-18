const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const adminPath = path.join(root, 'frontend/js/pages/admin.js');
const gamesPath = path.join(root, 'frontend/js/pages/adminGamesRc24e.js');
const helperPath = path.join(root, 'frontend/js/nflWeekSurvivorPlayoffR1.js');
const managersPath = path.join(root, 'frontend/js/pages/adminSportsManagersR3.js');
const appPath = path.join(root, 'frontend/js/app.js');
const sidecarPath = path.join(root, 'frontend/js/adminSportsGameOrganizationR2.js');

const adminSource = fs.readFileSync(adminPath, 'utf8');
const gamesSource = fs.readFileSync(gamesPath, 'utf8');
const helperSource = fs.readFileSync(helperPath, 'utf8');
const managersSource = fs.readFileSync(managersPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');

assert.strictEqual(
  fs.existsSync(sidecarPath),
  false,
  'R2 side-car must remain removed'
);

assert(
  !helperSource.includes('adminSportsGameOrganizationR2'),
  'NFL helper must not load removed R2 side-car'
);

assert.doesNotThrow(
  () => new Function(adminSource),
  'authoritative Admin module must parse'
);

assert.doesNotThrow(
  () => new Function(gamesSource),
  'authoritative Manage Games module must parse'
);

assert.doesNotThrow(
  () => new Function(managersSource),
  'specialized Sports manager module must parse'
);

assert.doesNotThrow(
  () => new Function(appSource),
  'authoritative app router must parse'
);

assert(
  adminSource.includes('data-admin-sports-organization-r2="1"'),
  'Admin must retain Sports R2 hierarchy'
);

assert(
  adminSource.includes('Sports → NFL → 2026'),
  'NFL 2026 hierarchy missing'
);

assert(
  adminSource.includes('Cups / Combined Competitions → NFL Cup'),
  'NFL Cup hierarchy missing'
);

assert.strictEqual(
  (adminSource.match(/Sports Scores &amp; Game Builder/g) || []).length,
  1,
  'Sports Scores & Game Builder must render once'
);

assert.strictEqual(
  (adminSource.match(/Sports Engine Controls/g) || []).length,
  1,
  'Sports Engine Controls must render once'
);

assert(
  adminSource.includes(
    "onclick=\"navigate('admin-games')\">Confidence</button>"
  ),
  'Confidence must use ordinary Manage Games'
);

assert(
  adminSource.includes(
    "onclick=\"navigate('admin-games')\">Survivor</button>"
  ),
  'Survivor must use ordinary Manage Games'
);

assert(
  !adminSource.includes('adminOpenSportsManageGamesR2_'),
  'obsolete R2 Manage Games focus helper must stay removed'
);

assert(
  !gamesSource.includes('adminManageGamesApplyFocusR2_'),
  'obsolete Manage Games R2 focus behavior must stay removed'
);

assert(
  !gamesSource.includes('adminManageGamesScheduleFocusR2_'),
  'obsolete Manage Games R2 focus scheduling must stay removed'
);

assert(
  adminSource.includes(
    "navigate('admin-team-fantasy')\">Team Fantasy Football"
  ),
  'Team Fantasy must retain dedicated route'
);

assert(
  adminSource.includes(
    "navigate('admin-playoff-race')\">Playoff Race"
  ),
  'Playoff Race must retain dedicated route'
);

assert(
  adminSource.includes(
    "navigate('admin-nfl-cup')\">Cups / Combined Competitions → NFL Cup"
  ),
  'NFL Cup must retain dedicated route'
);

assert(
  adminSource.includes(
    "navigate('admin-nfl-season-setup')\">Season / Sports Setup → NFL Sports Pack"
  ),
  'NFL Sports Pack must retain dedicated route'
);

assert(
  adminSource.includes(
    "navigate('admin-sports-engine')\">Sports Engine Controls"
  ),
  'Sports Engine must retain dedicated route'
);

assert(
  !adminSource.includes('id="adminSportsControlPanel"'),
  'Sports Engine controls must not expand inline on Admin landing'
);

[
  'admin-nfl-cup',
  'admin-nfl-season-setup',
  'admin-playoff-race',
  'admin-sports-engine'
].forEach(route => {
  assert(
    appSource.includes('"' + route + '"'),
    'app router missing specialized route: ' + route
  );

  assert(
    appSource.includes('case "' + route + '"'),
    'app render switch missing specialized route: ' + route
  );
});

assert(
  gamesSource.includes(
    'root.nflSeasonPackAdminCardR3_=nflSeasonPackAdminCard_'
  ),
  'existing NFL Season Pack implementation must remain authoritative'
);

assert(
  gamesSource.includes(
    'root.nflPlayoffRaceTimingAdminCardR3_=nflPlayoffRaceTimingAdminCard_'
  ),
  'existing Playoff Race implementation must remain authoritative'
);

assert(
  gamesSource.includes(
    'root.nflCupFuturesAdminCardR3_=function()'
  ),
  'existing NFL Cup Futures implementation must remain authoritative'
);

assert(
  gamesSource.includes(
    'root.pattcCupControlAdminCardR3_ = async function'
  ),
  'existing NFL Cup Control Center must remain authoritative'
);

assert(
  managersSource.includes('nflCupFuturesAdminCardR3_()'),
  'dedicated NFL Cup page must reuse existing Cup Futures implementation'
);

assert(
  managersSource.includes('await pattcCupControlAdminCardR3_()'),
  'dedicated NFL Cup page must reuse existing Cup Control Center'
);

assert(
  managersSource.includes('nflSeasonPackAdminCardR3_()'),
  'dedicated Season Setup page must reuse existing Season Pack'
);

assert(
  managersSource.includes('nflPlayoffRaceTimingAdminCardR3_()'),
  'dedicated Playoff Race page must reuse existing timing manager'
);

assert(
  managersSource.includes('adminOpenSportsControls()'),
  'dedicated Sports Engine page must reuse existing Sports controls'
);

console.log(
  'PASS admin sports / game organization R2 current authoritative routing contract'
);
