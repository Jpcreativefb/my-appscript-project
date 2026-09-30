'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('frontend/js/app.js');
const mirror = read('frontend/app.js');

function sliceFunction(source, name, nextMarker) {
  const start = source.indexOf('function ' + name);
  assert(start >= 0, 'Missing function ' + name);
  const end = source.indexOf(nextMarker, start + 1);
  assert(end > start, 'Missing end marker for ' + name);
  return source.slice(start, end);
}

assert.strictEqual(mirror, app, 'frontend app mirrors must remain exact.');
assert(app.includes('let APP_NAVIGATION_SEQUENCE_ = 0;'), 'router must own one navigation generation.');
assert(app.includes('const navigationSequence = ++APP_NAVIGATION_SEQUENCE_;'), 'each navigate call must get a newer generation.');
assert(app.includes('await renderPage(page, navigationSequence);'), 'navigate must pass its generation into renderPage.');
assert(app.includes('if (rendered === false || !appNavigationIsCurrent_(navigationSequence, page)) return false;'), 'stale render completion must stop route finalization.');
assert(app.includes('if (!appNavigationIsCurrent_(navigationSequence, page)) return;'), 'requestAnimationFrame finalization must ignore stale routes.');

const renderPage = sliceFunction(app, 'renderPage', '\nasync function handleGameSwitch');
assert(renderPage.includes('return commit(function() { return renderSurvivorPage(); });'), 'Survivor render must use guarded commit.');
assert(renderPage.includes('renderDashboardPage()'), 'Home render must use shared guarded commit.');
assert(!renderPage.includes('APP_STATE.currentPage =\n    page;'), 'renderPage must not let an older render reclaim route state.');

const helperStart = app.indexOf('let APP_NAVIGATION_SEQUENCE_ = 0;');
const helperEnd = app.indexOf('function appProgressiveRouteLabel_', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'navigation guard helpers must exist.');

const context = {
  APP_STATE: { currentPage: 'survivor' },
  app: { innerHTML: 'SURVIVOR' }
};
vm.createContext(context);
vm.runInContext(app.slice(helperStart, helperEnd), context);

// Survivor request begins first.
vm.runInContext('APP_NAVIGATION_SEQUENCE_ = 1; APP_STATE.currentPage = "survivor";', context);
const survivorSequence = 1;

// Player taps Home. Home becomes the newer route and commits once.
vm.runInContext('APP_NAVIGATION_SEQUENCE_ = 2; APP_STATE.currentPage = "dashboard";', context);
const homeCommitted = vm.runInContext(
  'appCommitRouteHtml_(app, "dashboard", 2, "HOME")',
  context
);
assert.strictEqual(homeCommitted, true, 'new Home route must commit.');
assert.strictEqual(context.app.innerHTML, 'HOME');

// Older Survivor request finishes afterward. It must not repaint Survivor.
context.survivorSequence = survivorSequence;
const staleSurvivorCommitted = vm.runInContext(
  'appCommitRouteHtml_(app, "survivor", survivorSequence, "SURVIVOR-STALE")',
  context
);
assert.strictEqual(staleSurvivorCommitted, false, 'older Survivor completion must be rejected.');
assert.strictEqual(context.app.innerHTML, 'HOME', 'Survivor -> Home must end with exactly one Home transition and no stale Survivor redraw.');

// Similar page-to-page race: Sports then Reality. Newest route wins.
vm.runInContext('APP_NAVIGATION_SEQUENCE_ = 3; APP_STATE.currentPage = "hub:sports";', context);
vm.runInContext('APP_NAVIGATION_SEQUENCE_ = 4; APP_STATE.currentPage = "hub:reality";', context);
assert.strictEqual(
  vm.runInContext('appCommitRouteHtml_(app, "hub:sports", 3, "SPORTS-STALE")', context),
  false
);
assert.strictEqual(
  vm.runInContext('appCommitRouteHtml_(app, "hub:reality", 4, "REALITY")', context),
  true
);
assert.strictEqual(context.app.innerHTML, 'REALITY');

console.log('PASS bottom_nav_routing_consistency_r1_tests.js');
