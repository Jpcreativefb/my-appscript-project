const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const adminUiPath = path.join(root, 'frontend/js/pages/adminUi.js');
const helperPath = path.join(root, 'frontend/js/nflWeekSurvivorPlayoffR1.js');

const shell = fs.readFileSync(shellPath, 'utf8');
const adminUi = fs.readFileSync(adminUiPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');

assert.doesNotThrow(() => new Function(shell), 'R2 shell module must parse');
assert.doesNotThrow(() => new Function(adminUi), 'shared Admin UI module must parse');
assert.doesNotThrow(() => new Function(helper), 'NFL Survivor/Playoff helper must parse');

assert(adminUi.includes('function adminUiEnsureGameBuilderNavigationShellR2_'), 'shared Admin UI must own the R2 shell loader');
assert(adminUi.includes('./js/adminGameBuilderNavigationShellR2.js?release=shared-game-builder-navigation-shell-r2'), 'shared Admin UI must load the R2 shell module');
assert(adminUi.includes('adminUiEnsureGameBuilderNavigationShellR2_(root);'), 'shared Admin render enhancement lifecycle must invoke the R2 shell loader');
assert(adminUi.includes('window.pattcAdminGameBuilderNavigationShellR2Mount();'), 'shared Admin lifecycle must mount the R2 shell after load and on revisits');
assert(!helper.includes('adminGameBuilderNavigationShellR2'), 'Survivor/Playoff helper must not own or load the shared R2 shell');
assert(!helper.includes('shared-game-builder-navigation-shell-r2'), 'Survivor/Playoff helper must contain no R2 shell-loader dependency');

for (const heading of [
  'Game Builder',
  'Manage Existing Games',
  'Competitions',
  'League / Season Data',
  'Operations'
]) {
  assert(shell.includes(heading), 'missing Sports lifecycle destination: ' + heading);
}
for (const section of ['Sports', 'Reality TV', 'Awards', 'Other Games', 'Prediction Markets', 'Appearance / Visual Design']) {
  assert(shell.includes(section), 'missing Games & Design section: ' + section);
}
for (const level of ['>League<', '>NFL<', '>2026<']) {
  assert(shell.includes(level), 'missing Sports hierarchy level: ' + level);
}
assert(shell.includes('admin-card admin-collapsible-card admin-games-design-section'), 'Games & Design must reuse the Manage Games accordion card pattern');
assert(shell.includes('class="admin-card-summary"') && shell.includes('admin-collapse-icon'), 'Games & Design must reuse the Manage Games native summary interaction');

for (const builder of ['Confidence', 'Survivor', 'Team Fantasy', 'Playoff / Forecast', 'Other Game']) {
  assert(shell.includes(builder), 'missing builder destination: ' + builder);
}
for (const competition of ['Cups', 'Series', 'Tournaments']) {
  assert(shell.includes(competition), 'missing competition destination: ' + competition);
}
for (const dataArea of ['Teams', 'Schedule', 'Scores', 'Standings', 'Odds', 'Season Timing']) {
  assert(shell.includes(dataArea), 'missing league/season destination: ' + dataArea);
}

for (const route of [
  'admin-games',
  'admin-team-fantasy',
  'admin-playoff-race',
  'admin-nfl-cup',
  'admin-nfl-season-setup',
  'admin-sports-engine',
  "window.location.href='./sports.html'"
]) {
  assert(shell.includes(route), 'authoritative route must remain preserved: ' + route);
}
assert(shell.includes('apiAdminCreateGame(payload)'), 'R3B shell must orchestrate Draft creation through the authoritative create API');

for (const forbidden of [
  'saveConfidencePicksBatch',
  'saveSurvivorPick',
  'sportsSurvivorSettle',
  'nflPlayoffRaceSaveDraftR3_',
  'apiAdminSaveGame',
  'apiAdminRunSportsSurvivor'
]) {
  assert(!shell.includes(forbidden), 'shared shell must not add unauthorized gameplay/backend behavior: ' + forbidden);
}

function makeHost() {
  const attrs = {};
  return {
    innerHTML: '',
    getAttribute(name) { return attrs[name] || null; },
    setAttribute(name, value) { attrs[name] = String(value); },
    querySelector(selector) {
      if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]' && this.innerHTML.includes('data-shared-game-builder-navigation-shell-r2="1"')) {
        return { nodeType: 1 };
      }
      return null;
    },
    querySelectorAll() { return []; }
  };
}

let currentHost = makeHost();
const context = {
  window: {},
  document: {
    querySelector(selector) {
      if (selector === '[data-admin-games-design-r1="1"]') return currentHost;
      if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]') return currentHost;
      return null;
    }
  }
};
vm.createContext(context);
vm.runInContext(shell, context);

assert.strictEqual(typeof context.window.pattcAdminGameBuilderNavigationShellR2Mount, 'function', 'shell must expose one shared Admin mount hook');
assert.strictEqual(context.window.pattcAdminGameBuilderNavigationShellR2Mount(), true, 'shell must mount when Games & Design Admin host is rendered');
assert(currentHost.innerHTML.includes('Game Builder'), 'mounted shell must contain Sports lifecycle presentation');
assert(currentHost.innerHTML.includes('data-admin-games-design-section="sports"'), 'mounted shell must contain collapsible Sports section');
assert(currentHost.innerHTML.includes('Game Builder Workspace'), 'mounted shell must expose a separate builder workspace');
assert(
  currentHost.innerHTML.indexOf('data-admin-r3b-builder-host') > currentHost.innerHTML.indexOf('<h3>Operations</h3>'),
  'builder workspace must render after the Sports lifecycle cards instead of inside the Game Builder card'
);
assert(!currentHost.innerHTML.includes('Existing manager remains authoritative.'), 'navigation card must not carry the old Team Fantasy note');
assert(!currentHost.innerHTML.includes('Opens existing Playoff Race configuration; it does not create a game.'), 'navigation card must not carry the old Playoff note');
assert.strictEqual(currentHost.getAttribute('data-shared-game-builder-navigation-shell-r2'), '1', 'mounted host must be marked');

const firstHtml = currentHost.innerHTML;
assert.strictEqual(context.window.pattcAdminGameBuilderNavigationShellR2Mount(), false, 'rerender/enhance of the same Admin host must not duplicate shell');
assert.strictEqual(currentHost.innerHTML, firstHtml, 'duplicate mount must not rewrite or append a second shell');

currentHost = null;
assert.strictEqual(context.window.pattcAdminGameBuilderNavigationShellR2Mount(), false, 'navigation away from Admin must be a no-op');

currentHost = makeHost();
assert.strictEqual(context.window.pattcAdminGameBuilderNavigationShellR2Mount(), true, 'returning to Admin must mount into the newly rendered Games & Design host');
assert(currentHost.innerHTML.includes('<h3>Operations</h3>'), 'shell must remain available after normal Admin navigation away and back');
assert.strictEqual(context.window.pattcAdminGameBuilderNavigationShellR2Mount(), false, 'revisited Admin host must also remain duplicate-safe');

console.log('PASS shared game builder navigation shell R2 ownership, organized hierarchy, and mount coverage');
