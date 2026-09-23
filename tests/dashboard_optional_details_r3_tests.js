"use strict";
const fs=require("fs"),vm=require("vm"),assert=require("assert");
const source=fs.readFileSync("frontend/js/pages/dashboard.js","utf8");
const backend=fs.readFileSync("backend/engines/AppDataEngine.js","utf8");
let network=0,resolveRequest;const status={textContent:""};
const c={console,Date,Math,Promise,APP_STATE:{currentPage:"dashboard",dashboardHomeHydrationId:"one"},
 document:{getElementById:()=>status},appPageSnapshotKey_:()=>"owner-session",getSession:()=>({username:"owner",token:"session"})};
vm.createContext(c);vm.runInContext(source,c);
c.dashboardApplyHubAppearance_=()=>{};c.dashboardMountStickyPlayer_=()=>{};c.dashboardHydrateCareerFromCache_=()=>{};
c.dashboardRefreshHomePayloadInBackground_=()=>{network++;return new Promise(resolve=>{resolveRequest=resolve;});};
(async()=>{
 c.dashboardScheduleHomeEnrichment_("owner-session","one");assert.equal(network,0,"Home mount does not start optional requests");
 const button={disabled:false,isConnected:true};const pending=c.dashboardLoadHomeDetails_(button);
 assert.equal(network,1);assert(button.disabled);assert.match(status.textContent,/still open any game/);
 resolveRequest(null);await pending;assert(!button.disabled);assert.match(status.textContent,/games are still available/);
 c.dashboardRefreshHomePayloadInBackground_=async()=>{throw Error("Failed to fetch");};
 await c.dashboardLoadHomeDetails_(button);assert.match(status.textContent,/Try again/);assert(!button.disabled);
 c.dashboardRefreshHomePayloadInBackground_=()=>new Promise(r=>{resolveRequest=r;});
 const navigated=c.dashboardLoadHomeDetails_(button);c.APP_STATE.currentPage="ranking";status.textContent="new page";resolveRequest({success:true});await navigated;
 assert.equal(status.textContent,"new page","Late Home response must not alter the destination");
 c.APP_STATE.currentPage="dashboard";c.dashboardRefreshHomePayloadInBackground_=async()=>({success:true});
 await c.dashboardLoadHomeDetails_(button);assert.match(status.textContent,/Progress updated/);
 assert(source.includes('cachedDashboard || await apiGetDashboardGamesHub({ fastStartup: true })'));
 assert(source.includes('onclick="dashboardLoadHomeDetails_(this)"'));
 assert(backend.indexOf('validateUserSession_(',backend.indexOf('function getDashboard'))!==-1 || backend.includes('validateUserSession_('));
 assert(backend.includes('filterGamesForUser_('),'Game availability remains server filtered');
 console.log("Home optional details: no auto network, explicit loading, recoverable failure, navigation isolation, successful feedback and authenticated compact path PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
