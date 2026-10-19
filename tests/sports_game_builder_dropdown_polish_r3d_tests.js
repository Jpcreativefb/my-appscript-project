const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const shellSource = fs.readFileSync(shellPath, 'utf8');

assert.doesNotThrow(() => new Function(shellSource), 'Sports Admin shell must parse');

// Accepted Games & Design IA: Sports is a Manage-Games-style collapsible section,
// with nested League -> NFL -> 2026 organization. Do not regress to the old flat shell.
assert(shellSource.includes('sectionHtml_("sports", "Sports"'), 'Sports must remain a top-level Games & Design product area');
assert(shellSource.includes('class="card admin-card admin-collapsible-card admin-games-design-section"'), 'top-level Games & Design sections must reuse the Manage Games collapsible card pattern');
assert(shellSource.includes('class="admin-card-summary"'), 'collapsible sections must reuse the existing Admin summary pattern');
assert(shellSource.includes('class="admin-collapse-icon"'), 'collapsible sections must reuse the existing Admin collapse affordance');
assert(shellSource.includes('Admin → Games &amp; Design → Sports → League → NFL → 2026'), 'Sports hierarchy must expose League -> NFL -> 2026');
for (const level of ['league', 'league-name', 'season']) {
  assert(shellSource.includes(`data-admin-sports-level="${level}"`), 'Sports hierarchy missing level: ' + level);
}

// Current accepted Game Builder contract: one selector drives the existing handlers/workspace.
assert(/data-admin-r2-shell-choice="game-builder"[\s\S]*onchange="pattcAdminGameBuilderR3BBuilderSelect_\(this\)"/.test(shellSource), 'Game Builder selector must use the accepted builder handler');
for (const value of ['confidence', 'survivor', 'team-fantasy', 'playoff-forecast', 'other']) {
  assert(new RegExp(`<option\\s+value="${value}"`).test(shellSource), 'Game Builder selector missing accepted choice: ' + value);
}
assert(!shellSource.includes('function builderChoice_'), 'Game Builder must not restore the old large button-stack renderer');
assert(!/onclick="pattcAdminGameBuilderR2Select_\('[^']+',\s*'builder'\)"/.test(shellSource), 'Game Builder choices must not regress to a large direct-action button stack');

// Current accepted League / Season Data contract: one selector drives the existing selection handler.
assert(/data-admin-r2-shell-choice="season-data"[\s\S]*onchange="pattcAdminGameBuilderR3BSeasonSelect_\(this\)"/.test(shellSource), 'League / Season Data selector must use the accepted season-data handler');
for (const value of ['teams', 'schedule', 'scores', 'standings', 'odds', 'season-timing']) {
  assert(new RegExp(`<option\\s+value="${value}"`).test(shellSource), 'League / Season Data selector missing accepted choice: ' + value);
}
assert(!shellSource.includes('function seasonChoice_'), 'League / Season Data must not restore the old six-button renderer');
assert(!/onclick="pattcAdminGameBuilderR2Select_\('[^']+',\s*'season-data'\)"/.test(shellSource), 'Season Data choices must not regress to a large direct-action button stack');

// Existing authoritative destinations remain reachable; the shell orchestrates rather than duplicates managers.
for (const route of [
  "navigate('admin-games')",
  "navigate('admin-team-fantasy')",
  'navigate("admin-playoff-race")',
  "navigate('admin-nfl-cup')",
  "navigate('admin-nfl-season-setup')",
  "navigate('admin-sports-engine')",
  "window.location.href='./sports.html'"
]) {
  assert(shellSource.includes(route), 'authoritative Sports destination must remain reachable: ' + route);
}
for (const duplicateAuthority of [
  'pattcCupControlAdminCardR3_',
  'renderAdminNflCupPage',
  'saveConfidencePicksBatch',
  'saveSurvivorPick',
  'sportsSurvivorSettle',
  'nflPlayoffRaceSaveDraftR3_',
  'apiAdminSaveGame',
  'apiAdminRunSportsSurvivor'
]) {
  assert(!shellSource.includes(duplicateAuthority), 'Sports shell must not duplicate manager/gameplay authority: ' + duplicateAuthority);
}

// Exercise the current handlers instead of coupling to obsolete whitespace/literal HTML.
const builderHost = { innerHTML: '' };
const message = { textContent: '' };
const controls = [
  {
    tagName: 'SELECT',
    value: '',
    getAttribute(name) { return name === 'data-admin-r2-shell-choice' ? 'game-builder' : ''; }
  },
  {
    tagName: 'SELECT',
    value: '',
    getAttribute(name) { return name === 'data-admin-r2-shell-choice' ? 'season-data' : ''; }
  }
];
const shell = {
  querySelector(selector) {
    if (selector === '[data-admin-r3b-builder-host]') return builderHost;
    if (selector === '[data-admin-r2-selection-message]') return message;
    return null;
  },
  querySelectorAll(selector) {
    return selector === '[data-admin-r2-shell-choice]' ? controls : [];
  }
};
const context = {
  window: {},
  document: {
    querySelector(selector) {
      if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]') return shell;
      return null;
    }
  },
  navigate() {},
  console
};
context.window = context;
vm.createContext(context);
vm.runInContext(shellSource, context);

assert.strictEqual(context.pattcAdminGameBuilderR3BBuilderSelect_({ value: 'confidence' }), true, 'accepted builder handler must select Confidence');
assert(builderHost.innerHTML.includes('Selected Builder — Confidence'), 'Confidence selection must open the existing full-width builder workspace');
assert.strictEqual(controls[0].value, 'confidence', 'builder selector state must stay synchronized');
assert(message.textContent.includes('Game Builder selected: Confidence'), 'builder selection must update the shared selection context');

assert.strictEqual(context.pattcAdminGameBuilderR3BBuilderSelect_({ value: 'team-fantasy' }), true, 'accepted builder handler must select Team Fantasy');
assert(builderHost.innerHTML.includes('Selected Builder — Team Fantasy'), 'Team Fantasy selection must open the existing builder workspace');
assert(builderHost.innerHTML.includes("navigate('admin-team-fantasy')"), 'Team Fantasy workspace must retain its authoritative manager route');

assert.strictEqual(context.pattcAdminGameBuilderR3BBuilderSelect_({ value: 'playoff-forecast' }), true, 'accepted builder handler must select Playoff / Forecast');
assert(builderHost.innerHTML.includes('Open Playoff Race Configuration'), 'Playoff / Forecast selection must retain the existing Playoff Race authority');

assert.strictEqual(context.pattcAdminGameBuilderR3BSeasonSelect_({ value: 'teams' }), true, 'accepted season-data handler must select Teams');
assert.strictEqual(controls[1].value, 'teams', 'season-data selector state must stay synchronized');
assert(message.textContent.includes('League / Season Data selected: Teams'), 'Season Data selection must update the selected data context');

assert.strictEqual(context.pattcAdminGameBuilderR3BSeasonSelect_({ value: 'season-timing' }), true, 'accepted season-data handler must select Season Timing');
assert.strictEqual(controls[1].value, 'season-timing', 'season timing selection must stay synchronized');
assert(message.textContent.includes('League / Season Data selected: Season Timing'), 'Season Timing must use the existing shared selection context');

console.log('PASS Sports Game Builder dropdown polish R3D accepted Games & Design contract');
