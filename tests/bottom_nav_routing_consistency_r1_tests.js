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
assert(!app.includes('APP_NAVIGATION_SEQUENCE_'), 'broad navigation generation must not return.');
assert(!app.includes('appNavigationIsCurrent_'), 'broad route-current checks must not return.');
assert(app.includes('async function appCommitAsyncRouteHtml_(app, page, renderer)'), 'commit-only stale guard must exist.');
assert(app.includes('if (String(APP_STATE.currentPage || "") !== String(page || "")) return false;'), 'stale async commit must be rejected.');
assert(app.includes('if (appRoutePageFromLocation_() !== page) return;'), 'stale history completion must be rejected.');
assert(app.includes('if (String(APP_STATE.currentPage || "") !== String(page || "")) return;\n\n      app.classList.remove("page-enter");'), 'stale deferred route finalization must be rejected.');

const renderStart = app.indexOf('async function renderPage(page)');
const renderEnd = app.indexOf('\nasync function handleGameSwitch', renderStart);
const renderPage = app.slice(renderStart, renderEnd);
assert(!renderPage.includes('APP_STATE.currentPage =\n    page;'), 'renderPage must not reclaim stale route state.');
assert(renderPage.includes('appCommitAsyncRouteHtml_(app, page, function() { return renderSurvivorPage(); })'), 'Survivor must use guarded commit.');
assert(renderPage.includes('appCommitAsyncRouteHtml_(app, page, function() { return renderVotingPage(); })'), 'similar page-to-page routes must use same guarded commit.');

// Home compact renderer remains direct: no helper, generation, Appearance, or extra await around it.
const homeNeedle = `case "dashboard":

      app.innerHTML =
        await renderDashboardPage();`;
assert(renderPage.includes(homeNeedle), 'Home compact renderer call must remain unchanged.');
const homeBlockStart = renderPage.indexOf('case "dashboard":');
const homeBlockEnd = renderPage.indexOf('case "trophy-room":', homeBlockStart);
const homeBlock = renderPage.slice(homeBlockStart, homeBlockEnd);
assert(!homeBlock.includes('appCommitAsyncRouteHtml_'), 'Home compact first paint must not use stale-route helper.');
assert(!homeBlock.includes('APP_NAVIGATION_SEQUENCE_'), 'Home compact first paint must not add generation work.');
assert(!homeBlock.includes('appPrepareAppearanceSnapshotReuse_'), 'Home compact first paint must not add Appearance work.');

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
  const oldSurvivor = vm.runInContext(
    'appCommitAsyncRouteHtml_(appNode, "survivor", function(){ return survivorPromise; })',
    context
  );

  // One Bottom Nav tap changes route ownership to Home.
  context.APP_STATE.currentPage = 'dashboard';
  context.appNode.innerHTML = 'HOME';
  releaseSurvivor('SURVIVOR-STALE');

  assert.strictEqual(await oldSurvivor, false, 'late Survivor commit must be rejected.');
  assert.strictEqual(context.appNode.innerHTML, 'HOME', 'Survivor -> Home must remain one clean Home transition.');

  let releaseVoting;
  context.APP_STATE.currentPage = 'voting';
  context.votingPromise = new Promise(resolve => { releaseVoting = resolve; });
  const oldVoting = vm.runInContext(
    'appCommitAsyncRouteHtml_(appNode, "voting", function(){ return votingPromise; })',
    context
  );
  context.APP_STATE.currentPage = 'ranking';
  context.appNode.innerHTML = 'RANKING';
  releaseVoting('VOTING-STALE');

  assert.strictEqual(await oldVoting, false, 'older page-to-page commit must be rejected.');
  assert.strictEqual(context.appNode.innerHTML, 'RANKING');

  console.log('PASS bottom_nav_routing_consistency_r1_tests.js');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
