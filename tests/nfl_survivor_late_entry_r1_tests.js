'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'backend/engines/SportsSurvivorEngine.js'), 'utf8');
const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set,
  isFinite, parseInt, parseFloat
};
context.survivorCategoryLocked_ = function(){ return false; };
vm.createContext(context);
vm.runInContext(engine, context);

function category(week) {
  return { id:'w'+week, name:'Week '+week, roundNumber:week, points:1, nominees:[{id:'t'+week,name:'Team '+week}] };
}
function option(team, game) {
  return { optionId:team, teamId:team, team:team, sportsGameId:game, side:'home', kickoff:'2099-01-01T00:00:00Z' };
}
function completed(home, away) {
  return { Completed:true, Cancelled:false, HomeScore:home, AwayScore:away };
}

const categories=[category(2),category(3),category(4)];
const optionMeta={
  w2:{t2:option('t2','g2')},
  w3:{t3:option('t3','g3')},
  w4:{t4:option('t4','g4')}
};
const resultMap={
  w2:{g2:completed(20,10)},
  w3:{g3:completed(17,10)},
  w4:{g4:{Completed:false,Cancelled:false}}
};
const settings=context.sportsSurvivorNormalizeSettings_({
  mode:'sports-survivor',league:'nfl',startWeek:2,endWeek:18,
  lossesAllowed:3,missedPickRule:'loss',teamUseLimit:1,pickLockMode:'team-kickoff'
},'g');

// New entrant: completed historical weeks before resolved Week 4 are pre-entry, not misses.
let evaluation=context.sportsSurvivorEvaluateUser_('newuser','g',categories,settings,optionMeta,resultMap,{}, {resolvedWeek:4});
assert.strictEqual(evaluation.alive,true);
assert.strictEqual(evaluation.lossesUsed,0);
assert.strictEqual(evaluation.livesRemaining,3);
assert.strictEqual(evaluation.currentRoundIndex,2);
assert.strictEqual(evaluation.rounds[0].preEntry,true);
assert.strictEqual(evaluation.rounds[0].status,'pre-entry');
assert.strictEqual(evaluation.rounds[0].missed,false);
assert.strictEqual(evaluation.rounds[1].preEntry,true);
assert.strictEqual(evaluation.rounds[1].status,'pre-entry');
assert.strictEqual(evaluation.rounds[1].missed,false);
assert.strictEqual(evaluation.rounds[2].preEntry,false);

// The actual Week 4 browser round is editable for the alive late entrant.
const week4=context.sportsSurvivorWeekBrowserRound_(
  {},settings,evaluation,optionMeta,resultMap,categories[2],evaluation.rounds[2],2,4,
  context.sportsSurvivorWeekBrowserUsedWeekMap_(evaluation.rounds)
);
assert.strictEqual(week4.relation,'current');
assert.strictEqual(week4.canPick,true);
assert.strictEqual(week4.historicalReadOnly,false);

// Once participation exists, later completed no-pick weeks keep normal missed/life semantics.
const picks={user:{
  w2:{nomineeIds:['t2'],snapshots:[{sportsGameId:'g2',side:'home'}],confidencePoints:0}
}};
evaluation=context.sportsSurvivorEvaluateUser_('user','g',categories,settings,optionMeta,resultMap,picks,{resolvedWeek:4});
assert.strictEqual(evaluation.rounds[0].preEntry,false);
assert.strictEqual(evaluation.rounds[1].preEntry,false);
assert.strictEqual(evaluation.rounds[1].missed,true);
assert.strictEqual(evaluation.rounds[1].status,'life-used');
assert.strictEqual(evaluation.lossesUsed,1);
assert.strictEqual(evaluation.livesRemaining,2);
assert.strictEqual(evaluation.alive,true);

// Prior participation cannot be reclassified as late entry.
assert.strictEqual(evaluation.rounds[0].status,'survived');
assert.strictEqual(evaluation.currentRoundIndex,2);

// State path reuses the existing resolved NFL week; it does not add a second resolver.
assert(engine.includes('const evaluationContext = { resolvedWeek: nflWeekTiming.week };'));
assert(engine.includes('sportsSurvivorStandings_(gameId, [username], evaluationContext)'));
assert(engine.includes('preEntry: preEntry'));
assert(engine.includes('NFL_SURVIVOR_PLAYER_R1_REQUEST_CACHE'));
assert(!engine.includes('CacheService'));

console.log('NFL Survivor Late Entry R1 tests: PASS');
