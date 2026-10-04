'use strict';
/* Intended to run from repository root after PATCH.diff is applied. */
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const helper=fs.readFileSync('backend/engines/NflCurrentWeekEngine.js','utf8');
const survivor=fs.readFileSync('backend/engines/SportsSurvivorEngine.js','utf8');
const playoff=fs.readFileSync('backend/engines/NflPlayoffRaceEngine.js','utf8');
const ranking=fs.readFileSync('frontend/js/pages/rankingSportsR1.js','utf8');
const adminWeek=fs.readFileSync('frontend/js/nflWeekSurvivorPlayoffR1.js','utf8');

const c={console,Date,Math,JSON,Number,String,Array,Object,Boolean,RegExp,Set,isFinite,parseInt,parseFloat};
vm.createContext(c);vm.runInContext(helper,c);vm.runInContext(survivor,c);vm.runInContext(playoff,c);

// Shared automatic week: explicit override wins; auto ignores stale override.
const day=86400000, first=Date.parse('2026-09-10T00:00:00Z');
const weeks={};for(let w=1;w<=18;w++)weeks[w]=[{GameDateTime:new Date(first+(w-1)*7*day).toISOString(),Completed:w<4,Status:w<4?'Final':'Scheduled'}];
let timing=c.pattcNflResolveCurrentWeek_({mode:'auto',overrideWeek:1,nowMs:first+2.5*7*day,fetchWeek:w=>weeks[w]});
assert.equal(timing.week,4,'automatic week advances from NFL schedule state');
timing=c.pattcNflResolveCurrentWeek_({mode:'override',overrideWeek:6,nowMs:first+2.5*7*day,fetchWeek:w=>weeks[w]});
assert.equal(timing.week,6,'explicit override wins');
timing=c.pattcNflResolveCurrentWeek_({mode:'auto',overrideWeek:6,nowMs:first+2.5*7*day,fetchWeek:w=>weeks[w]});
assert.equal(timing.week,4,'removing override returns to automatic');

// Survivor source contract: current round is selected by resolved NFL week rather
// than first unresolved historical scoring round; auto-build targets resolved week.
assert(survivor.includes('scheduledIndex = categories.findIndex'));
assert(survivor.includes('sportsSurvivorRoundWeek_(category, index) === nflWeekTiming.week'));
assert(survivor.includes('startWeek: 1'),'Survivor timing must anchor to NFL Week 1, not the Survivor game start week');
assert(survivor.includes('timing.week = Math.max(settings.startWeek || 1'),'resolved NFL week is clamped back to the playable Survivor range');
assert(survivor.includes('const targetWeek = nflTiming ? nflTiming.week : settings.startWeek'));
assert(survivor.includes('sportsSurvivorBuildWeek_(gameId, targetWeek'));
assert(survivor.includes('teamUseLimit'));
assert(survivor.includes('resultMode === "spread"'));
assert(survivor.includes('settings.pickLockMode === "team-kickoff"'));
assert(survivor.includes('sportsSurvivorSavePickMeta_'),'earlier week picks remain durable');

// Existing Survivor is Save/Update only; this repair must not invent Finalize.
const survivorPage=fs.readFileSync('frontend/js/pages/survivor.js','utf8');
assert(survivorPage.includes('SAVE SURVIVOR PICK'));
assert(survivorPage.includes('UPDATE SURVIVOR PICK'));
assert(!survivorPage.includes('FINALIZE SURVIVOR PICK'));

// Playoff Race Draft != Finalize and stale dated generic lock is ignored.
assert(playoff.includes('function nflPlayoffRaceSaveDraftR3_('),'Draft save path exists');
assert(playoff.includes('function nflPlayoffRaceFinalizeR3_('),'Finalize path exists');
assert(playoff.includes('NflForecastDrafts'),'Drafts use separate draft storage');
const draftSection=playoff.slice(
  playoff.indexOf('function nflPlayoffRaceSaveDraftR3_('),
  playoff.indexOf('function nflPlayoffRaceClearDraftR3_(')
);
assert(!draftSection.includes('saveNflPlayoffRaceRanking_'),'Saving a Draft must not create a scoring forecast');
assert(playoff.includes('if(!payload||payload.confirmed!==true)'));
assert.equal(c.nflPlayoffRaceStaticLockedR3_({},{locked:true,lockDateTime:'2026-09-01'}),false,'stale dated generic lock does not block Race timing');
assert.equal(c.nflPlayoffRaceStaticLockedR3_({},{locked:true}),true,'explicit/manual category lock still wins');
assert.equal(c.nflPlayoffRaceStaticLockedR3_({lockAllPicks:true},{locked:false}),true,'legitimate global admin lock still wins');
assert.equal(c.nflPlayoffRaceStaticLockReasonR3_({lockAllPicks:true},{locked:false}),'Game-wide admin lock is enabled.');
assert.equal(c.nflPlayoffRaceStaticLockReasonR3_({},{locked:true}),'This conference was manually locked by the admin.');
assert(ranking.includes('category.lockReason'),'UI reports the concrete lock reason');

// Admin override UI exists for Survivor and is explicitly auto/override.
assert(adminWeek.includes('Automatic'));
assert(adminWeek.includes('Override Automatic Week'));
assert(adminWeek.includes('Current NFL Week'));
assert(adminWeek.includes('saveWeekTiming:true'));

// Preserve current Playoff Race team-multiplier / accuracy scoring implementation.
assert(playoff.includes('nflPlayoffRaceAdjustedTeamMultipliers_'));
assert(playoff.includes('nflPlayoffRaceWeightedScore_'));
assert(playoff.includes('if(diff===0)return 20;if(diff===1)return 15;if(diff===2)return 10;if(diff===3)return 6;if(diff===4)return 3'));

console.log('NFL week / Survivor / Playoff Race R1 targeted regression contract: PASS');
