'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('frontend/js/app.js');
const mirror = read('frontend/app.js');

assert.strictEqual(mirror, app, 'frontend app mirrors must remain exact.');

// Stale protection must be commit-only, not spread through Home startup/navigation.
assert(!app.includes('APP_NAVIGATION_SEQUENCE_'), 'broad navigation-generation checks must not remain.');
assert(!app.includes('appNavigationIsCurrent_'), 'broad route-current helper must not remain.');
assert(app.includes('async function appCommitAsyncRouteHtml_(app, page, renderer)'), 'shared async commit guard must exist.');
assert(app.includes('if (String(APP_STATE.currentPage || "") !== String(page || "")) return false;'), 'commit guard must reject stale page completion.');
assert(app.includes('const rendered = await renderPage(page);'), 'navigate must observe render commit result.');
assert(app.includes('if (rendered === false) return false;'), 'stale render must stop stale route finalization.');
assert(app.includes('if (handled === false || appRoutePageFromLocation_() !== page) return;'), 'stale history completion must be rejected.');

// No route-time navigation restore/re-render is reintroduced.
const setActiveStart = app.indexOf('function setActiveNav(page)');
const setActiveEnd = app.indexOf('\n/* ======================\n   GAME SWITCHER', setActiveStart);
const setActive = app.slice(setActiveStart, setActiveEnd);
assert(!setActive.includes('appRestoreBottomNavAppearance_();'));
assert(!setActive.includes('appApplyNavigationSlots_'));
assert(!setActive.includes('appRestoreNavigationSlots_'));

// renderPage no longer reclaims route state after a newer tap.
const renderStart = app.indexOf('async function renderPage(page)');
const renderEnd = app.indexOf('\nasync function handleGameSwitch', renderStart);
const renderPage = app.slice(renderStart, renderEnd);
assert(!renderPage.includes('APP_STATE.currentPage =\n    page;'), 'renderPage must not reclaim stale route state.');
assert(renderPage.includes('renderSurvivorPage()'), 'Survivor remains on guarded async commit path.');
assert(renderPage.includes('const dashboardHtml = await renderDashboardPage();'), 'Home keeps direct compact renderer call.');
assert(renderPage.includes('if (String(APP_STATE.currentPage || "") !== "dashboard") return false;'), 'late Home result cannot overwrite a newer route.');

// Execute only the tiny commit helper to prove newest route wins.
const helperStart = app.indexOf('async function appCommitAsyncRouteHtml_');
const helperEnd = app.indexOf('\nasync function renderPage(page)', helperStart);
const helper = app.slice(helperStart, helperEnd);
const context = {
  APP_STATE: { currentPage: 'survivor' },
  appNode: { innerHTML: 'SURVIVOR' },
  Promise
};
vm.createContext(context);
vm.runInContext(helper, context);

(async function() {
  let releaseSurvivor;
  context.survivorPromise = new Promise(resolve => { releaseSurvivor = resolve; });

  // Older Survivor render begins.
  const stale = vm.runInContext(
    'appCommitAsyncRouteHtml_(appNode, "survivor", function(){ return survivorPromise; })',
    context
  );

  // One Bottom Nav tap selects Home; Home becomes current.
  context.APP_STATE.currentPage = 'dashboard';
  context.appNode.innerHTML = 'HOME';

  // Older Survivor request returns afterward.
  releaseSurvivor('SURVIVOR-STALE');
  assert.strictEqual(await stale, false, 'older Survivor render must be rejected.');
  assert.strictEqual(context.appNode.innerHTML, 'HOME', 'Survivor -> Home must remain one clean Home transition.');

  // Similar page-to-page race.
  let releaseSports;
  context.APP_STATE.currentPage = 'hub:sports';
  context.sportsPromise = new Promise(resolve => { releaseSports = resolve; });
  const oldSports = vm.runInContext(
    'appCommitAsyncRouteHtml_(appNode, "hub:sports", function(){ return sportsPromise; })',
    context
  );
  context.APP_STATE.currentPage = 'hub:reality';
  context.appNode.innerHTML = 'REALITY';
  releaseSports('SPORTS-STALE');
  assert.strictEqual(await oldSports, false);
  assert.strictEqual(context.appNode.innerHTML, 'REALITY');

  console.log('PASS bottom_nav_routing_consistency_r1_tests.js');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
