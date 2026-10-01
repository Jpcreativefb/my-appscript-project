'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=process.argv[2]||process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('frontend/js/app.js');
const r4=read('frontend/js/pages/survivorR4.js');
const css=read('frontend/css/survivor-r4.css');
const be=read('backend/engines/SportsSurvivorEngine.js');
const worker=read('functions/api/app.js');

assert(app.includes('NFL_SURVIVOR_PLAYER_R2_MODULE_CACHE'));
assert(app.includes('name === "survivor" || name === "survivorR4"'));
assert(app.includes('url.searchParams.set("survivorPlayer", "v1230-nfl-survivor-player-r2")'));

assert(worker.includes('SURVIVOR_R3_PREVIEW_READ_ACTIONS'));
const previewReadSet=worker.slice(worker.indexOf('const SURVIVOR_R3_PREVIEW_READ_ACTIONS'),worker.indexOf(']);',worker.indexOf('const SURVIVOR_R3_PREVIEW_READ_ACTIONS'))+3);
assert(previewReadSet.includes('"getSurvivorState"'),'Director Preview must route Survivor state to the aligned Preview Apps Script deployment');
assert(previewReadSet.includes('"getSurvivorTeamSchedule"'),'unrelated Survivor preview read routing remains unchanged');
assert(worker.includes('SURVIVOR_R3_PREVIEW_BLOCKED_WRITE_ACTIONS'));
assert(worker.includes('"saveSurvivorPick"')&&worker.includes('"saveSportsSurvivorAutoPickPreference"'),'Preview Survivor writes remain blocked');
assert(be.includes('state.weekRounds = categories.map'),'canonical Survivor state includes weekRounds');
assert(be.includes('state.availableWeeks = state.weekRounds.map'),'canonical Survivor state includes built week list');
assert(be.includes('state.resolvedWeek'),'canonical Survivor state retains shared resolved NFL week');


assert(r4.includes('NFL_SURVIVOR_WEEK_BROWSER_UI_R1'));
assert(r4.includes('survivor-r5-week-picker'));
assert(r4.includes('— CURRENT')&&r4.includes('— PAST')&&r4.includes('— UPCOMING'));
assert(r4.includes('survivorRecoveryR5ClearPick_'));
assert(r4.includes('nomineeId:"__clear__"'));
assert(be.includes('NFL_SURVIVOR_WEEK_BROWSER_R1'));
assert(be.includes('if(enabled&&!settings.autoPickEnabled)throw new Error("Missed-pick Auto Pick protection is disabled by the game admin.")'));
assert(be.includes('if(!settings.autoPickEnabled||!settings.automationEnabled)return{enabled:false,picked:[]}'));
assert(be.includes('state.resolvedWeek'));
assert(be.includes('startWeek: 1'),'Start Week 2 must not become the NFL calendar anchor');
assert(be.includes('state.weekRounds = categories.map'),'built Survivor weeks remain included in the player payload');
assert(be.includes('sportsSurvivorOptionEligible_(meta, rules, evaluation.usage, selected, settings)'));
assert(be.includes('selectedStarted'));

assert(r4.includes('NFL_SURVIVOR_PLAYER_R2_LIVE_UX'));
for(const value of ['best-odds','biggest-favorite','best-record','best-rank','random']) assert(r4.includes(`option("${value}"`));
assert(r4.includes('Random Eligible'));
assert(r4.includes('selected===value?"checked":""'));
assert(r4.includes('survivorRecoveryR6SaveAutoSettings_'));
assert(r4.includes('survivorR4AutoTrigger'));
assert(r4.includes('survivorR3AutoScope'));

assert(r4.includes('MISSED PICK PROTECTION'));
assert(r4.includes('survivorRecoveryR6ToggleProtection_'));
assert(r4.includes('survivor-r6-protection-row'));
assert(r4.includes('settings.automationEnabled!==false&&settings.autoPickEnabled===true'));
assert(r4.includes('wanted&&!adminAutoPickAllowed()'));
assert(r4.includes('Missed-pick AutoPick is disabled by the admin.'));
const r2=r4.slice(r4.indexOf('NFL_SURVIVOR_PLAYER_R2_LIVE_UX'));
const modalStart=r2.indexOf('root.survivorRecoveryR3OpenAutoPick_=function()');
const modalEnd=r2.indexOf('async function savePreference',modalStart);
const modal=r2.slice(modalStart,modalEnd);
assert(!modal.includes('id="survivorR3AutoProtect"'));
assert(!modal.includes('MISSED PICK PROTECTION'));

assert(r2.includes('saveSportsSurvivorAutoPickPreference'));
assert(!r2.includes('apiGetSurvivorState'));
assert(!r2.includes('apiGetSportsSurvivorState'));
assert(be.includes('NFL_SURVIVOR_PLAYER_R1_REQUEST_CACHE'));
assert(r2.includes('html.indexOf(clearRow)!==-1'));

assert(css.includes('NFL_SURVIVOR_PLAYER_R2_VISIBILITY'));
assert(css.includes('font-size:1.08rem!important'));
assert(css.includes('.survivor-r3-game-index{font-size:1.2em!important'));
assert(css.includes('NFL_SURVIVOR_WEEK_BROWSER_NAV_R1'));
assert(css.includes('width:54px!important')||css.includes('width:52px!important'));

console.log('NFL Survivor Player R2 live UX/integration contracts: PASS');
