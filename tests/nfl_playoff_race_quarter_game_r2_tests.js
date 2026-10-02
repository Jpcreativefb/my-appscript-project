'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const engine=fs.readFileSync('backend/engines/NflPlayoffRaceEngine.js','utf8');
const front=fs.readFileSync('frontend/js/pages/rankingSportsR1.js','utf8');
const css=fs.readFileSync('frontend/css/nfl-sports-pack-r1.css','utf8');
const rank=fs.readFileSync('backend/engines/RankingGameEngine.js','utf8');
const api=fs.readFileSync('backend/Api.js','utf8');
const pack=fs.readFileSync('backend/engines/NflSeasonPackEngine.js','utf8');
const ctx={console,Math,Date,JSON,Number,String,Array,Object,RegExp,Set};
ctx.rankingBallotValid_=()=>true;ctx.rankingFinalOrderComplete_=()=>true;
vm.createContext(ctx);vm.runInContext(pack,ctx);vm.runInContext(engine,ctx);
const run=s=>vm.runInContext(s,ctx);
function plain(x){return JSON.parse(JSON.stringify(x));}

// Week -> mini-game / quarter model.
assert.deepStrictEqual(plain(run('nflPlayoffRaceQuarterForWeek_(1)')),{week:1,phase:'regular',miniGameNumber:1,quarterNumber:1});
assert.deepStrictEqual(plain(run('nflPlayoffRaceQuarterForWeek_(4)')),{week:4,phase:'regular',miniGameNumber:1,quarterNumber:4});
assert.deepStrictEqual(plain(run('nflPlayoffRaceQuarterForWeek_(5)')),{week:5,phase:'regular',miniGameNumber:2,quarterNumber:1});
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(8).miniGameNumber'),2);
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(9).miniGameNumber'),3);
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(12).quarterNumber'),4);
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(13).miniGameNumber'),4);
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(16).quarterNumber'),4);
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(17).phase'),'final-preview');
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(17).miniGameNumber'),0);
assert.strictEqual(run('nflPlayoffRaceQuarterForWeek_(18).miniGameNumber'),0);

// Actual pairwise All-Play, including ties.
ctx.rows=Array.from({length:11},(_,i)=>({username:'U'+(i+1),raceScore:110-i}));
let all=plain(run('nflPlayoffRaceAllPlay_(rows)'));
assert.deepStrictEqual({w:all[0].wins,l:all[0].losses,t:all[0].ties},{w:10,l:0,t:0});
assert.deepStrictEqual({w:all[10].wins,l:all[10].losses,t:all[10].ties},{w:0,l:10,t:0});
ctx.rows[1].raceScore=110;all=plain(run('nflPlayoffRaceAllPlay_(rows)'));
assert.deepStrictEqual({w:all[0].wins,l:all[0].losses,t:all[0].ties},{w:9,l:0,t:1});
assert.deepStrictEqual({w:all[1].wins,l:all[1].losses,t:all[1].ties},{w:9,l:0,t:1});

// Game record accumulation and reset boundary.
ctx.weekly=[
 {username:'A',nflWeek:1,miniGameNumber:1,wins:9,losses:1,ties:0,raceScore:200,exactSeedCount:3,divisionSweepBonus:10},
 {username:'A',nflWeek:2,miniGameNumber:1,wins:6,losses:4,ties:0,raceScore:210,exactSeedCount:2,divisionSweepBonus:0},
 {username:'A',nflWeek:3,miniGameNumber:1,wins:10,losses:0,ties:0,raceScore:230,exactSeedCount:4,divisionSweepBonus:20},
 {username:'A',nflWeek:4,miniGameNumber:1,wins:7,losses:3,ties:0,raceScore:240,exactSeedCount:5,divisionSweepBonus:10},
 {username:'A',nflWeek:5,miniGameNumber:2,wins:4,losses:6,ties:0,raceScore:220,exactSeedCount:2,divisionSweepBonus:0}
];
assert.strictEqual(run('nflPlayoffRaceRecordText_(nflPlayoffRaceAggregateRecord_(weekly.filter(r=>r.miniGameNumber===1)))'),'32-8-0');
assert.strictEqual(run('nflPlayoffRaceRecordText_(nflPlayoffRaceAggregateRecord_(weekly.filter(r=>r.miniGameNumber===2)))'),'4-6-0');
assert.strictEqual(run('nflPlayoffRaceRecordText_(nflPlayoffRaceAggregateRecord_(weekly))'),'36-14-0');
let game=plain(run('nflPlayoffRaceGameResultsFromWeekly_(weekly,1)'));
assert.strictEqual(game[0].raceScoreTotal,880);assert.strictEqual(game[0].exactSeedCount,14);assert.strictEqual(game[0].divisionSweepBonus,40);

// Weekly score delta storage is explicit and immutable unless repair is requested.
assert(engine.includes('PreviousRaceScore:row.previousRaceScore'));
assert(engine.includes('ScoreDelta:row.scoreDelta'));
assert(engine.includes('if(Object.keys(existing).length&&!repair)return {written:0,skipped:true}'));
assert(engine.includes('week<=16&&week%4===0'));
assert(api.includes('adminFinalizeNflPlayoffRaceWeek'));

// Division Sweep + Perfect Seeds 1-7.
ctx.teams=run("nflPlayoffRaceTeamCatalog_().filter(t=>t.conference==='AFC')");
ctx.rankings=ctx.teams.map((t,i)=>({nomineeId:t.abbr,rank:i+1}));
ctx.actual=Object.fromEntries(ctx.rankings.map(r=>[r.nomineeId.toLowerCase(),r.rank]));
ctx.snap={forecastId:'f1',multiplier:1,rankingsJSON:JSON.stringify(ctx.rankings),teamMultipliersJSON:JSON.stringify(Object.fromEntries(ctx.rankings.map(r=>[r.nomineeId.toLowerCase(),1])))};
ctx.cfg={divisionSweepBonus:10,perfectSeedsBonus:20};
let div=plain(run("nflPlayoffRaceDivisionSweepBonus_('afc-playoff-seeds',rankings,actual,snap,cfg)"));
assert.deepStrictEqual(div,{count:4,bonus:40});
assert.strictEqual(run('nflPlayoffRacePerfectSeedsBonus_(rankings,actual,snap,cfg)'),20);

// Old +3/+1/+1 checkpoint ledger stays compatible but contributes no points.
assert(engine.includes('NflForecastCheckpointScores'));
assert(engine.includes('legacyCheckpointScoringActive:false'));
assert(!rank.includes('nflCheckpointByUser'));
const stateBody=engine.slice(engine.indexOf('function apiGetNflPlayoffRaceState_'),engine.indexOf('function saveNflPlayoffRaceRanking_'));
assert(!stateBody.includes('nflPlayoffRaceBankDueCheckpoints_'));
assert(stateBody.includes('nflPlayoffRaceCompetitionState_'));

// Final scoring / multipliers remain, with R2 bonuses added.
assert(engine.includes('nflPlayoffRaceAdjustedTeamMultipliers_'));
assert(engine.includes('divisionSweepBonus:round(resolved?divisionSweep.bonus:0)'));
assert(engine.includes('perfectSeedsBonus:round(resolved?perfectSeedsBonus:0)'));

// Player load reads persisted history; weekly finalization owns historical calculation.
const compBody=engine.slice(engine.indexOf('function nflPlayoffRaceCompetitionState_'),engine.indexOf('function nflPlayoffRaceCupEvents_'));
assert(compBody.includes('nflPlayoffRaceReadWeeklyScores_'));
assert(!compBody.includes('nflPlayoffRaceStandingsAtWeek_'));

// Five clean placement events for NFL Cup adapter; no duplicate Cup scoring engine.
assert(engine.includes('eventId:gameId+"-game-"+n'));
assert(engine.includes('eventId:gameId+"-final"'));
assert(engine.includes('eventType:"placement"'));
assert(!engine.includes('PlayoffRaceCupScoringEngine'));

// Compact quarter UI and accepted mobile row contracts remain.
assert(front.includes('GAME "+(comp.gameNumber||1)+" · Q"+(comp.quarterNumber||1)+" · W"+(comp.nflWeek||1)'));
assert(front.includes("comp.gameRecord")&&front.includes("comp.seasonRecord"));
assert(front.includes('nfl-race-quarter-detail'));
assert(!front.includes('<b>CP</b>'));
assert(css.includes('min-height:38px!important'));
assert(css.includes('grid-template-columns:18px 28px 18px 17px!important'));
assert(front.includes('compactMovement(liveRow)'));
assert(pack.includes('nflSeasonPackRepairPlayoffDisplayOrder_'));
assert(pack.includes('displayOrder:200'));

console.log('PATTC NFL Playoff Race Quarter Game R2 focused regression: PASS');

assert(front.includes("GAME REC ")&&front.includes("G REC "));
assert(front.includes("is-current")&&front.includes("data-current-game"));
assert(front.includes("nflRaceFocusCurrentStage_")&&front.includes("scrollIntoView"));
assert(front.includes("FINAL</b><em>PLAYOFFS</em>")&&!front.includes("5TH EVENT"));
assert(css.includes("font-size:15px!important")&&css.includes("font-size:10px!important"));
assert(css.includes(".nfl-race-stage[open]{min-width:260px!important"));
assert(css.includes("font-size:8.5px!important"));

assert(!front.includes("Checkpoint scoring:"));
assert(!front.includes("+3 exact current seed"));
assert(!front.includes("+1 within one seed"));
assert(front.includes("Each NFL week acts as a Quarter"));
assert(front.includes("Weeks 1–4 are Game 1"));
assert(front.includes("4 GAMES + FINAL"));
assert(front.includes("<strong>ADJUSTMENT WINDOWS</strong>"));
