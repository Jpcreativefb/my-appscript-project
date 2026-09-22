'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'frontend/js/pages/dashboard.js'),'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'),'utf8');
const appMirror = fs.readFileSync(path.join(root, 'frontend/app.js'),'utf8');
assert.strictEqual(app, appMirror, 'App JS mirrors remain identical');
const extras = source.slice(source.indexOf('async function hydrateDashboardHomeExtras_()'), source.indexOf('function hydrateDashboardCareerStats_(', source.indexOf('async function hydrateDashboardHomeExtras_()')));
assert(!extras.includes('apiGetUserProfileHistory('), 'Home enrichment must never automatically fetch archived career history');
assert(source.includes('ontoggle="dashboardCareerStatsToggle_(this)"'), 'Career history loads on expansion only');
assert(source.includes('dashboardHydrateCareerFromCache_();'), 'Home redraw must hydrate cached history');
assert(app.includes('dashboardHydrateCareerFromCache_();'), 'Initial Home navigation must restore cached history');
const start = source.indexOf('const DASHBOARD_CAREER_CACHE_TTL_MS_');
const end = source.indexOf('function dashboardStillOnHome_', start);
assert(start > 0 && end > start, 'Career code must appear before regular Hub functions');
const chunk = source.slice(start,end);
let user = { username: 'owner', token: 'test-token' };
let callCount = 0, resolveHistory;
const displayed = [];
const context = {
  console, Date, Promise,
  APP_STATE: {currentPage: 'dashboard'},
  getSession: () => user,
  apiGetUserProfileHistory: (username, gameId) => {callCount++;assert.strictEqual(username,'owner');assert.strictEqual(gameId,'');return new Promise(resolve=>{resolveHistory = resolve;});},
  hydrateDashboardCareerStats_: response => displayed.push(response.summary.wins)
};
vm.createContext(context);vm.runInContext(chunk,context);
function element() {const status={textContent:''};return {open:false,isConnected:true,status,querySelector:()=>status};}
function tick(){return new Promise(resolve => setImmediate(resolve));}
(async()=>{
  const first=element(), second=element();
  assert.strictEqual(callCount,0,'Loading Home should never fetch history');
  first.open=true; second.open=true;
  context.dashboardCareerStatsToggle_(first);
  context.dashboardCareerStatsToggle_(second);
  await tick();
  assert.strictEqual(callCount,1,'Concurrent expansion must coalesce into one history fetch');
  assert(first.status.textContent.includes('Loading'));
  resolveHistory({success:true,summary:{wins:4}});
  await tick(); await tick();
  assert.deepStrictEqual(displayed,[4,4]);
  assert.strictEqual(first.status.textContent,'Career stats updated');
  const third=element();third.open=true;
  context.dashboardCareerStatsToggle_(third);
  assert.strictEqual(callCount,1,'Reopening within cache lifetime must not refetch');
  assert.strictEqual(third.status.textContent,'Career stats updated');
  context.dashboardHydrateCareerFromCache_();
  assert.strictEqual(displayed[displayed.length-1],4,'New Home render rehydrates cached stats');
  user = {username:'other',token:'other-token'};
  context.dashboardHydrateCareerFromCache_();
  assert.strictEqual(displayed.length,4,'History cache cannot hydrate another account');
  assert.strictEqual(context.dashboardCachedCareerResponse_(),null,'History cache must be scoped to session');
  console.log('Dashboard career lazy-load: no automatic archival read, on-demand singleflight, cache, redraw, and session isolation PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
