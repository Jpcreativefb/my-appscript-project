const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const helperPath = path.join(root, 'frontend/js/nflWeekSurvivorPlayoffR1.js');
const adminPath = path.join(root, 'frontend/js/pages/admin.js');
const managersPath = path.join(root, 'frontend/js/pages/adminSportsManagersR3.js');

const shell = fs.readFileSync(shellPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');
const admin = fs.readFileSync(adminPath, 'utf8');
const managers = fs.readFileSync(managersPath, 'utf8');

assert.doesNotThrow(() => new Function(shell), 'R2 shell module must parse');
assert.doesNotThrow(() => new Function(helper), 'NFL helper with R2 loader must parse');
assert(helper.includes('./js/adminGameBuilderNavigationShellR2.js?release=shared-game-builder-navigation-shell-r2'), 'existing NFL helper must load R2 shell');

for (const heading of [
  '1. Game Builder',
  '2. Manage Existing Games',
  '3. Competitions',
  '4. League / Season Data',
  '5. Operations'
]) {
  assert(shell.includes(heading), 'missing lifecycle destination: ' + heading);
}

for (const builder of ['Confidence', 'Survivor', 'Team Fantasy', 'Playoff / Forecast', 'Other Game']) {
  assert(shell.includes(builder), 'missing builder destination: ' + builder);
}

for (const competition of ['Cups', 'Series', 'Tournaments']) {
  assert(shell.includes(competition), 'missing competition destination: ' + competition);
}

for (const dataArea of ['Teams', 'Schedule', 'Scores', 'Standings', 'Odds', 'Season Timing']) {
  assert(shell.includes(dataArea), 'missing league/season destination: ' + dataArea);
}

assert(shell.includes("navigate('admin-games')"), 'Manage Existing Games must keep authoritative route');
assert(shell.includes("navigate('admin-team-fantasy')"), 'Team Fantasy dedicated manager must remain reachable');
assert(shell.includes("navigate('admin-playoff-race')"), 'Playoff Race timing dedicated page must remain reachable');
assert(shell.includes("navigate('admin-nfl-cup')"), 'NFL Cup dedicated page must remain reachable');
assert(shell.includes("navigate('admin-nfl-season-setup')"), 'NFL Sports Pack dedicated page must remain reachable');
assert(shell.includes("navigate('admin-sports-engine')"), 'Sports Engine dedicated page must remain reachable');
assert(shell.includes("window.location.href='./sports.html'"), 'existing Sports Scores & Game Builder must remain reachable');
assert(shell.includes('New Game stays available here until the R3 builder is accepted.'), 'New Game preservation must be explicit');

for (const forbidden of [
  'apiAdminCreateGame(',
  'saveConfidencePicksBatch',
  'saveSurvivorPick',
  'sportsSurvivorSettle',
  'nflPlayoffRaceSaveDraftR3_'
]) {
  assert(!shell.includes(forbidden), 'navigation shell must not invoke creation/gameplay write: ' + forbidden);
}

assert(admin.includes('data-admin-sports-organization-r2="1"'), 'existing authoritative Admin Sports host must remain');
assert(managers.includes('data-admin-specialized-manager-r3="nfl-cup"'), 'NFL Cup dedicated R3 page must remain');
assert(managers.includes('data-admin-specialized-manager-r3="nfl-season-setup"'), 'NFL Sports Pack dedicated R3 page must remain');
assert(managers.includes('data-admin-specialized-manager-r3="playoff-race"'), 'Playoff Race dedicated R3 page must remain');
assert(managers.includes('data-admin-specialized-manager-r3="sports-engine"'), 'Sports Engine dedicated R3 page must remain');

console.log('PASS shared game builder navigation shell R2');
