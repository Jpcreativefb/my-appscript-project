const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const survivorEngine = fs.readFileSync(path.join(root, 'backend/engines/SurvivorGameEngine.js'), 'utf8');
const survivorPage = fs.readFileSync(path.join(root, 'frontend/js/pages/survivor.js'), 'utf8');

const categories = [
  { id: 'r1', name: 'Round 1', points: 10, displayOrder: 1 },
  { id: 'r2', name: 'Round 2', points: 10, displayOrder: 2 },
  { id: 'r3', name: 'Round 3', points: 10, displayOrder: 3 }
];

let resolutions = {
  r1: { resolved: true, result: 'winner', winnerNomineeId: 'alex', winnerNomineeIds: ['alex'] },
  r2: { resolved: true, result: 'winner', winnerNomineeId: 'brooke', winnerNomineeIds: ['brooke'] }
};
let pickMaps = {
  alpha: { r1: { nomineeId: 'chris' }, r2: { nomineeId: 'dana' } },
  bravo: { r1: { nomineeId: 'chris' }, r2: { nomineeId: 'brooke' } }
};

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set,
  isFinite, parseInt, parseFloat,
  getCategoriesCached: () => categories,
  getCategoryResultsResolutionMap: () => resolutions,
  buildUserPicksMap_: () => pickMaps,
  notificationPushGameParticipants_: () => ['alpha', 'bravo', 'charlie'],
  getLeaderboardUserProfile_: username => ({ displayName: username.toUpperCase() })
};
vm.createContext(context);
vm.runInContext(survivorEngine, context);

// A known game participant with no saved picks must remain visible and be eliminated for missing a settled round.
let standings = context.survivorLeaderboardData_('game');
assert.strictEqual(standings.length, 3, 'All known Survivor participants should appear in standings.');
const alpha = standings.find(row => row.username === 'alpha');
const bravo = standings.find(row => row.username === 'bravo');
const charlie = standings.find(row => row.username === 'charlie');
assert(alpha && bravo && charlie, 'Expected alpha, bravo, and no-pick participant charlie.');
assert.strictEqual(alpha.survivorAlive, true);
assert.strictEqual(alpha.total, 20);
assert.strictEqual(bravo.survivorAlive, false);
assert.strictEqual(bravo.survivorEliminatedRound, 2);
assert.strictEqual(charlie.survivorAlive, false);
assert.strictEqual(charlie.survivorEliminatedRound, 1);
assert.strictEqual(charlie.survivorEliminatedReason, 'missed');
assert.strictEqual(JSON.stringify(Array.from(standings, row => row.username)), JSON.stringify(['alpha', 'bravo', 'charlie']), 'Alive players should rank above later and earlier eliminations.');

// Final settlement promotes surviving entries to winner/co-winner instead of leaving them permanently ALIVE.
resolutions = {
  r1: { resolved: true, result: 'winner', winnerNomineeId: 'alex', winnerNomineeIds: ['alex'] },
  r2: { resolved: true, result: 'winner', winnerNomineeId: 'brooke', winnerNomineeIds: ['brooke'] },
  r3: { resolved: true, result: 'winner', winnerNomineeId: 'evan', winnerNomineeIds: ['evan'] }
};
pickMaps = {
  alpha: { r1: { nomineeId: 'chris' }, r2: { nomineeId: 'dana' }, r3: { nomineeId: 'dana' } },
  delta: { r1: { nomineeId: 'chris' }, r2: { nomineeId: 'dana' }, r3: { nomineeId: 'chris' } },
  bravo: { r1: { nomineeId: 'chris' }, r2: { nomineeId: 'brooke' } }
};
context.notificationPushGameParticipants_ = () => ['alpha', 'bravo', 'delta'];
standings = context.survivorLeaderboardData_('game');
const winners = standings.filter(row => row.survivorWinner);
assert.strictEqual(winners.length, 2, 'Multiple final survivors should be supported as co-winners.');
assert.strictEqual(JSON.stringify(Array.from(winners, row => row.username)), JSON.stringify(['alpha', 'delta']));
assert(winners.every(row => row.survivorAlive && row.survivorComplete));
assert.strictEqual(standings[2].username, 'bravo');
assert.strictEqual(standings[2].survivorWinner, false);

const completeEvaluation = context.survivorEvaluateUser_('alpha', 'game', pickMaps.alpha, categories, resolutions);
assert.strictEqual(completeEvaluation.complete, true);
assert.strictEqual(completeEvaluation.winner, true);
assert.strictEqual(completeEvaluation.totalPoints, 30);

// Current viewer should be included even before their first pick if roster discovery misses them.
context.notificationPushGameParticipants_ = () => [];
pickMaps = {};
resolutions = {};
standings = context.survivorLeaderboardData_('game', ['newplayer']);
assert.strictEqual(standings.length, 1);
assert.strictEqual(standings[0].username, 'newplayer');
assert.strictEqual(standings[0].survivorAlive, true);

assert(survivorPage.includes("row.survivorWinner ? 'WINNER'"));
assert(survivorPage.includes("payload.winner ? 'You Won Survivor'"));
assert(survivorPage.includes('You survived every round and finished as a Survivor winner.'));

console.log('survivor-edge-cases-v1218w4-tests: PASS');
