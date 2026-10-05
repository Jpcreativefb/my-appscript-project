'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const nav = read('frontend/js/navigationSlotsR1.js');
const app = read('frontend/js/app.js');
const mirror = read('frontend/app.js');

assert.strictEqual(mirror, app, 'frontend app mirrors must remain exact.');
assert(nav.includes("page === 'dashboard' || page === 'team-fantasy'"), 'Home and Team Fantasy must bypass rescue route wrapping.');
assert(!nav.includes("guardRenderer_('renderDashboardPage'"), 'Home compact renderer must never be wrapped.');
assert(!nav.includes("guardRenderer_('renderTeamFantasyPage'"), 'Team Fantasy must remain untouched.');
assert(nav.includes("guardRenderer_('renderSurvivorPage', 'survivor')"), 'Survivor must receive stale-render protection.');
assert(nav.includes('installSnapshotGuard_();'), 'Stale route completion must not poison page snapshots.');
assert(nav.includes("if (str_(page) !== 'dashboard' && current && current !== str_(page)) return true;"), 'Stale deferred active-nav finalization must be consumed without a nav restore/re-render.');

// Home compact route in app.js remains unchanged: no generation counter / no new Home await.
assert(!app.includes('APP_NAVIGATION_SEQUENCE_'), 'No broad navigation generation counter may be introduced.');
const homeNeedle = `case "dashboard":\n\n      app.innerHTML =\n        await renderDashboardPage();`;
assert(app.includes(homeNeedle), 'Home compact render call must remain in its existing direct form.');

const callbacks = {};
const appNode = { innerHTML: 'SURVIVOR' };
const document = {
  readyState: 'loading',
  addEventListener(name, fn) { (callbacks[name] || (callbacks[name] = [])).push(fn); },
  getElementById(id) { return id === 'app' ? appNode : null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { dataset:{}, style:{setProperty(){}}, classList:{toggle(){}}, setAttribute(){}, addEventListener(){}, appendChild(){}, hidden:false }; }
};
const storage = new Map();
const localStorage = { setItem(k,v){storage.set(k,String(v));}, getItem(k){return storage.get(k)||null;}, removeItem(k){storage.delete(k);} };
const windowObj = {
  document,
  localStorage,
  location: { hash: '#survivor' },
  APP_STATE: { currentPage: 'survivor' },
  setTimeout() {},
  Promise
};
windowObj.window = windowObj;
const context = { window:windowObj, document, localStorage, console, setTimeout(){}, encodeURIComponent, isFinite, Promise };
vm.createContext(context);
vm.runInContext(nav, context, { filename:'frontend/js/navigationSlotsR1.js' });

let releaseSurvivor;
windowObj.renderSurvivorPage = function() {
  return new Promise(resolve => { releaseSurvivor = resolve; });
};
windowObj.appCapturePageSnapshot_ = function() { throw new Error('stale snapshot capture should be blocked'); };
windowObj.ensurePageModules_ = function() { return Promise.resolve(); };
windowObj.appRememberBottomNavAppearance_ = function() { return true; };
windowObj.appRestoreBottomNavAppearance_ = function() { return true; };
(callbacks.DOMContentLoaded || []).forEach(fn => fn());

(async function() {
  // Loading Survivor installs the guard before renderPage invokes its renderer.
  await windowObj.ensurePageModules_('survivor');
  const oldSurvivor = windowObj.renderSurvivorPage();

  // One Bottom Nav tap selects Home while Survivor data is still pending.
  windowObj.location.hash = '#dashboard';
  windowObj.APP_STATE.currentPage = 'dashboard';
  appNode.innerHTML = 'HOME';
  releaseSurvivor('SURVIVOR-STALE');

  const staleHtml = await oldSurvivor;
  assert.strictEqual(staleHtml, 'HOME', 'late Survivor result must resolve to the already-current Home DOM.');
  assert.strictEqual(windowObj.APP_STATE.currentPage, 'dashboard', 'late Survivor completion must not reclaim route state.');

  // Stale snapshot capture is ignored after the newer Home route wins.
  assert.doesNotThrow(() => windowObj.appCapturePageSnapshot_('survivor', appNode));

  // Similar page-to-page transition.
  let releaseVoting;
  windowObj.renderVotingPage = function() { return new Promise(resolve => { releaseVoting = resolve; }); };
  windowObj.location.hash = '#voting';
  windowObj.APP_STATE.currentPage = 'voting';
  appNode.innerHTML = 'VOTING';
  await windowObj.ensurePageModules_('voting');
  const oldVoting = windowObj.renderVotingPage();
  windowObj.location.hash = '#ranking';
  windowObj.APP_STATE.currentPage = 'ranking';
  appNode.innerHTML = 'RANKING';
  releaseVoting('VOTING-STALE');
  assert.strictEqual(await oldVoting, 'RANKING');
  assert.strictEqual(windowObj.APP_STATE.currentPage, 'ranking');

  console.log('PASS bottom_nav_routing_consistency_r1_tests.js');
})().catch(err => { console.error(err); process.exitCode = 1; });
