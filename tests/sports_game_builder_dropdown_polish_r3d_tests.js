const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const shellSource = fs.readFileSync(shellPath, 'utf8');

assert.doesNotThrow(() => new Function(shellSource), 'Sports Admin shell must parse');
assert(shellSource.includes('Game Type\n              <select'), 'Game Builder must use one game-type dropdown');
assert(shellSource.includes('Choose a game type…'), 'Game Builder dropdown must have a clear placeholder');
for (const value of ['confidence','survivor','team-fantasy','playoff-forecast','other']) {
  assert(shellSource.includes(`option value="${value}"`), 'Game Builder dropdown missing: ' + value);
}
assert(!shellSource.includes('function builderChoice_'), 'Game Builder must not render the old large button stack');

assert(shellSource.includes('Season Data Tool\n              <select'), 'League / Season Data must use one data-tool dropdown');
assert(shellSource.includes('Choose a season data tool…'), 'Season Data dropdown must have a clear placeholder');
for (const value of ['teams','schedule','scores','standings','odds','season-timing']) {
  assert(shellSource.includes(`option value="${value}"`), 'Season Data dropdown missing: ' + value);
}
assert(!shellSource.includes('function seasonChoice_'), 'League / Season Data must not render the old six-button stack');
assert(shellSource.includes('Sports Scores &amp; Game Builder'), 'Sports Scores & Game Builder must remain a separate destination');
assert(shellSource.includes('NFL Season / Sports Setup'), 'NFL Season / Sports Setup must remain a separate destination');

const builderHost = { innerHTML: '' };
const message = { textContent: '' };
const shell = {
  querySelector(selector) {
    if (selector === '[data-admin-r3b-builder-host]') return builderHost;
    if (selector === '[data-admin-r2-selection-message]') return message;
    return null;
  },
  querySelectorAll() { return []; }
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

assert.strictEqual(context.pattcAdminGameBuilderR3BBuilderSelect_({ value: 'confidence' }), true);
assert(builderHost.innerHTML.includes('Selected Builder — Confidence'), 'Game dropdown must open the selected full-width builder workspace');
assert.strictEqual(context.pattcAdminGameBuilderR3BSeasonSelect_({ value: 'teams' }), true);
assert(message.textContent.includes('League / Season Data selected: Teams'), 'Season Data dropdown must update the selected data context');

console.log('PASS Sports Game Builder dropdown Preview polish R3D');
