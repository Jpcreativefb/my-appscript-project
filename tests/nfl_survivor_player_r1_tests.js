'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const r4=read('frontend/js/pages/survivorR4.js');
const engine=read('backend/engines/SportsSurvivorEngine.js');
const final=r4.slice(r4.lastIndexOf('NFL_SURVIVOR_PLAYER_R1_FINAL'));

// Handoff-file contracts: these run both before and after Director integration.
assert(final.includes('survivorRecoveryR3VisibleMatchupIndex_'),'1. carousel visible-index state is preserved');
assert(final.includes('restoreIndex(keep)'),'2. R3 refresh restores the same matchup index');
assert(final.includes('round.pickNomineeId=ids[0]'),'3. finalized pick updates in place instead of forcing a page reload');
assert(final.includes('USED WEEK $1'),'5. used-team overlay states the used week');
assert(final.includes('GAME TOTAL / O-U')&&final.includes('"N/A"'),'7. missing odds/total have explicit N/A rendering');
assert(final.includes('Use Random Pick on the Survivor page when you want an immediate random choice.'),'8. Random is documented as the immediate action');
const autoOpen=final.slice(final.indexOf('root.survivorRecoveryR3OpenAutoPick_='),final.indexOf('function compareKey()'));
assert(!autoOpen.includes('survivorRecoveryR3AutoPickNow_'),'9. AutoPick settings cannot immediately invoke Random/Select Team Now');
assert(autoOpen.includes('Best Moneyline Favorite')&&autoOpen.includes('Best Spread Favorite')&&autoOpen.includes('Highest-Ranked Eligible Team'),'9b. AutoPick exposes data-backed strategies');
assert(final.includes('survivor-r1-logo-only')&&final.includes('#39e76a')&&final.includes('#ef3345'),'10. compare uses centered logo-only outcome outlines');
const compareFinal=final.slice(final.indexOf('function pickCell'));
assert(!compareFinal.includes('<strong>SEASON</strong><small>Player stats</small>'),'10b. final compare removes stray season/player-stats row');
assert(compareFinal.includes('Matchup &amp; outcome'),'10c. compare detail label is matchup/outcome, not DETAIL Week');
assert(final.includes('pattc:survivor:compare-users:')&&final.includes('localStorage.setItem'),'11. compare-user display preference persists locally');
assert(!final.includes('apiAdmin')&&!final.includes('saveUser')&&!final.includes('deleteUser'),'11b. compare-user controls do not mutate accounts');
assert(engine.includes('NFL_SURVIVOR_PLAYER_R1_REQUEST_CACHE'),'performance request-scoped cache is integrated into SportsSurvivorEngine.js');
assert(engine.includes('NFL_SURVIVOR_PLAYER_R1_MEMO_ = null'),'performance cache is cleared after each state request');
assert(!engine.includes('CacheService'),'performance repair does not add CacheService');
assert(engine.includes('typeof survivorGameCategories_ === "function"'),'isolated engine load safely guards optional cross-file category helper');
assert(engine.includes('if (NFL_SURVIVOR_PLAYER_R1_CATEGORIES_BASE_)'),'category memo wrapper installs only when the helper exists');

// Regression for Work Mac failure: the complete engine must load without cross-file Survivor helpers.
const isolated={console,Date,JSON,Math,Number,String,Array,Object,Boolean,RegExp,Set,isFinite,parseInt,parseFloat};
vm.createContext(isolated);
assert.doesNotThrow(()=>vm.runInContext(engine,isolated),'SportsSurvivorEngine.js loads in isolation without SurvivorGameEngine globals');

// Execute the request-scope memoization overlay against a controlled state flow.
const counts={settings:0,categories:0,options:0,results:0,picks:0,evaluation:0,standings:0};
const context={console,Object,Array,String,Number,JSON,Math,Date};
context.survivorGetSettings_=function(){counts.settings++;return {mode:'sports-survivor'};};
context.survivorGameCategories_=function(){counts.categories++;return [{id:'w4'}];};
context.sportsSurvivorOptionMetaForGame_=function(){counts.options++;return {w4:{}};};
context.sportsSurvivorResultsForGame_=function(){counts.results++;return {w4:{}};};
context.sportsSurvivorPickMetaMap_=function(){counts.picks++;return {user:{}};};
context.sportsSurvivorEvaluateUser_=function(username){counts.evaluation++;return {username};};
context.sportsSurvivorStandings_=function(){counts.standings++;context.survivorGetSettings_('g');context.sportsSurvivorEvaluateUser_('user','g');return [{username:'user'}];};
context.apiGetSportsSurvivorState_=function(){
  context.survivorGetSettings_('g');context.survivorGetSettings_('g');
  context.survivorGameCategories_('g');context.survivorGameCategories_('g');
  context.sportsSurvivorOptionMetaForGame_('g');context.sportsSurvivorOptionMetaForGame_('g');
  context.sportsSurvivorResultsForGame_('g');context.sportsSurvivorResultsForGame_('g');
  context.sportsSurvivorPickMetaMap_('g');context.sportsSurvivorPickMetaMap_('g');
  context.sportsSurvivorEvaluateUser_('user','g');context.sportsSurvivorEvaluateUser_('user','g');
  context.sportsSurvivorStandings_('g',['user']);context.sportsSurvivorStandings_('g',['user']);
  return {success:true};
};
const perfStart=engine.indexOf('/* =========================================================\n   NFL SURVIVOR PLAYER EXPERIENCE R1');
assert(perfStart>=0,'integrated memoization block is present');
const perf=engine.slice(perfStart);
vm.createContext(context);vm.runInContext(perf,context);context.apiGetSportsSurvivorState_({gameId:'g',username:'user'});
assert.deepStrictEqual(counts,{settings:1,categories:1,options:1,results:1,picks:1,evaluation:1,standings:1},'duplicate reads/evaluations collapse inside one state request');
context.apiGetSportsSurvivorState_({gameId:'g',username:'user'});
assert.deepStrictEqual(counts,{settings:2,categories:2,options:2,results:2,picks:2,evaluation:2,standings:2},'memo is request-scoped and does not leak across state requests');

// Existing/base contracts preserved in the complete final engine/R4 source.
assert(engine.includes('sportsSurvivorOptionEligible_'),'5b. server eligibility remains authoritative');
assert(engine.includes('settings.pickLockMode === "team-kickoff"'),'3b/4b. kickoff lock contract remains intact');
assert(engine.includes('scheduledIndex = categories.findIndex'),'12. current-round selection still uses resolved NFL week');
assert(engine.includes('pattcNflResolveCurrentWeek_'),'12b. shared NFL current-week resolver remains authoritative');
assert(engine.includes('SPORTS_SURVIVOR_R3_AUTOPICK_PREF_CATEGORY_'),'8b. existing AutoPick preference architecture is reused');
assert(engine.includes('meta.total || meta.overUnder || ""'),'7b. total/O-U is reused from existing Survivor payload');
assert(final.includes('root.survivorRecoveryR2Refresh_'),'1b. R2 refresh is redirected to R3 instead of replacing the carousel');
assert(final.includes('root.survivorRecoveryR3ScrollMatchups_'),'1c. carousel arrows/scroll handler remain active after rerender');
assert(final.includes('state')||r4.includes('is-started'),'4c. started/final presentation contract remains in the Survivor page stack');
console.log('NFL Survivor Player R1 focused repository contracts: PASS');
