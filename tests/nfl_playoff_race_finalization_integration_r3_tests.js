'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const c={console,Date,Math,JSON,Number,String,Array,Object,RegExp};vm.createContext(c);
vm.runInContext(fs.readFileSync('backend/engines/NflPlayoffRaceEngine.js','utf8'),c);
const gameId='nfl-playoff-race-2026',categoryId='afc-playoff-seeds';
const rankings=Array.from({length:16},(_,i)=>({nomineeId:'team'+i,rank:i+1}));
let week=3,rows=[],writes=0;
c.rankingGameCategories_=()=>[{id:categoryId}];c.rankingValidateBallot_=()=>{};
c.getGameRuntimeConfig=()=>({});c.nflPlayoffRaceClearDraftR3_=()=>{};
c.nflPlayoffRaceMeta_=()=>({rows,timing:{currentWeek:week,seasonStarted:true,currentWindow:week===4?{week:4,multiplier:.85}:null},canEnter:!rows.length,canUpdate:week===4});
c.saveRankingBallot_=()=>{writes++;return {success:true};};
c.nflPlayoffRaceAppendSnapshot_=r=>rows.push({...r,isActive:true,rankingsJSON:JSON.stringify(r.rankings),teamMultipliersJSON:JSON.stringify(r.teamMultipliers)});
for(const [w,expected] of [[3,1],[4,.95],[5,.9],[10,.65]]){
 week=w;rows=[];const result=c.nflPlayoffRaceFinalizeR3_({gameId,categoryId,username:'synthetic',rankings,confirmed:true});
 assert.equal(result.forecastMultiplier,expected,'Finalized original Week '+w);
 assert(Object.values(result.teamMultipliers).every(v=>v===expected));assert.equal(rows[0].multiplier,expected);
}
week=3;rows=[];c.nflPlayoffRaceFinalizeR3_({gameId,categoryId,username:'synthetic',rankings,confirmed:true});
const original=JSON.stringify(rows[0]);week=4;
const moved=rankings.map(r=>({...r,rank:r.rank===1?3:r.rank===2?1:r.rank===3?2:r.rank}));
const adjusted=c.nflPlayoffRaceFinalizeR3_({gameId,categoryId,username:'synthetic',rankings:moved,confirmed:true});
assert.deepEqual(JSON.parse(JSON.stringify(adjusted.teamMultipliers)),Object.fromEntries(rankings.map((r,i)=>[r.nomineeId,i<3?.85:1])));
assert.equal(JSON.stringify(rows[0]),original,'Existing finalized original preserved');
week=5;const before=writes;assert.throws(()=>c.nflPlayoffRaceFinalizeR3_({gameId,categoryId,username:'synthetic',rankings,confirmed:true}),/locked/);assert.equal(writes,before);
console.log('Playoff R3 real finalization path: Week 3 original=100%, delayed finalization, displaced team rates, original preservation and adjustment lock PASS');
