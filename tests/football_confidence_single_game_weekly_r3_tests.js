'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('backend/engines/SportsConfidenceRC24ACompletionEngine.js','utf8');
const game={gameId:'nfl-confidence-2026',type:'confidence',confidenceEnabled:true,confidenceScoringMode:'win_only'};
const cats=[
 {id:'w3a',section:'NFL Week 3',nominees:[{id:'BUF',name:'Buffalo'},{id:'MIA',name:'Miami'}],lockDateTime:'2026-09-18T00:00:00Z'},
 {id:'w3b',section:'NFL Week 3',nominees:[{id:'KC',name:'Kansas City'},{id:'DEN',name:'Denver'}],lockDateTime:'2026-09-18T00:00:00Z'},
 {id:'w4a',section:'NFL Week 4',nominees:[{id:'GB',name:'Green Bay'},{id:'CHI',name:'Chicago'}],lockDateTime:'2099-09-18T00:00:00Z'}
];
const settings={w3a:{winnerNomineeId:'BUF'},w3b:{winnerNomineeId:'DEN'},w4a:{winnerNomineeId:''}};
const picks={alice:[{categoryId:'w3a',nomineeId:'BUF',confidencePoints:2},{categoryId:'w3b',nomineeId:'KC',confidencePoints:1},{categoryId:'w4a',nomineeId:'GB',confidencePoints:3}],bob:[{categoryId:'w3a',nomineeId:'MIA',confidencePoints:1},{categoryId:'w3b',nomineeId:'DEN',confidencePoints:2}],mallory:[{categoryId:'w3a',nomineeId:'BUF',confidencePoints:9}]};
let reads=0;const ctx={console,Date,Math,Number,JSON,
 getDefaultGameId:()=>game.gameId,getGameRuntimeConfig:()=>game,
 getCategories:()=>cats,getCategorySettings:()=>settings,
 getUserPicks:(u,id)=>{assert.equal(id,game.gameId);reads++;return picks[u]||[];},
 getGames:()=>[game],getAccessibleLeaguesForGame_:()=>[{leagueId:'local',leagueName:'Local'}],
 getActiveLeagueMembers_:()=>[{username:'alice'},{username:'bob'}],
 getLeaderboardData:()=>[{username:'alice',fixedPoints:50},{username:'bob',fixedPoints:40},{username:'mallory',fixedPoints:99}],
 filterLeaderboardRowsForLeague_:rows=>rows.filter(r=>r.username!=='mallory')
};vm.createContext(ctx);vm.runInContext(src,ctx);
const w3=ctx.apiGetSportsConfidenceCompletion_({username:'alice',gameId:game.gameId,leagueId:'local',week:3});
assert.equal(w3.week,3);assert.equal(w3.myWeek.currentPoints,2);
assert.equal(w3.myWeek.possibleRemaining,0);assert.equal(w3.myWeek.gamesRemaining,0);
assert.equal(w3.standings.length,2);assert.equal(w3.standings[0].username,'alice');
assert.equal(w3.standings[1].points,2); // bob has 2, tied for first.
assert.equal(w3.season.weeks.length,2);assert.equal(w3.season.weeks[0].points,2);
assert.equal(w3.season.weeks[1].points,0);assert.equal(w3.season.totalPoints,2);
assert.equal(w3.compare.find(r=>r.username==='alice').matchups.length,2);
assert(!w3.compare.some(r=>r.username==='mallory'));
assert.equal(reads,2,'each authorized player pick history read once per request');
const w4=ctx.apiGetSportsConfidenceCompletion_({username:'alice',gameId:game.gameId,leagueId:'local',week:4});
assert.equal(w4.myWeek.currentPoints,0);assert.equal(w4.myWeek.possibleRemaining,3);
assert.equal(w4.myWeek.gamesRemaining,1);assert.equal(w4.compare.find(r=>r.username==='alice').matchups.length,1);
assert.equal(w4.compare.find(r=>r.username==='alice').matchups[0].hidden,true);
assert.equal(w4.season.totalPoints,2,'unresolved week must not inflate season points');
// A negative-scoring Confidence season uses the same individual-week boundaries.
game.confidenceScoringMode='risk_penalty';
settings.w3b.changePenalty=0.25;
picks.alice[1].changeCount=1;
const risk=ctx.apiGetSportsConfidenceCompletion_({username:'alice',gameId:game.gameId,leagueId:'local',week:3});
assert.equal(risk.myWeek.currentPoints,1.25,'Week 3 win (2) minus changed wrong pick (0.75)');
assert.equal(risk.season.weeks[1].points,0,'risk score must not leak to Week 4');
game.confidenceScoringMode='win_only';
const page=fs.readFileSync('frontend/js/pages/picks.js','utf8');
assert(page.includes('week:pattcConfidenceWeeklyEnabledR1_()?pattcConfidenceCurrentWeekR1_():0'));
assert(page.includes('data-week="${confidenceRc24aEscape_(w.week)}"'));
assert(page.includes('pattcConfidenceChooseWeekR1_(selected)'));
console.log('Single-game Confidence: week 3/4 independent totals, league scope, persisted picks, pending points, week selector PASS');
