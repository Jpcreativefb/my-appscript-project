const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const rankingEngine = read('backend/engines/RankingGameEngine.js');
const survivorEngine = read('backend/engines/SurvivorGameEngine.js');
const api = read('backend/Api.js');
const scoring = read('backend/engines/ScoringEngine.js');
const preflight = read('backend/admin/AdminPreflight.js');
const adminSetup = read('frontend/js/pages/adminGameSetup.js');
const adminCategories = read('backend/admin/AdminCategories.js');
const rankingPage = read('frontend/js/pages/ranking.js');
const survivorPage = read('frontend/js/pages/survivor.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const apiClient = read('frontend/js/api.js');
const apiMirror = read('frontend/api.js');
const css = read('frontend/css/pages.css');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

assert(app.includes('"survivor": ["survivor"]'));
assert(app.includes('"ranking": ["ranking"]'));
assert(app.includes('await navigate("survivor")'));
assert(app.includes('await navigate("ranking")'));
assert(app.includes('case "survivor":'));
assert(app.includes('case "ranking":'));
assert.strictEqual(app, appMirror, 'frontend app mirror must stay synchronized');

for (const action of ['getRankingState', 'saveRanking', 'getSurvivorState', 'saveSurvivorPick', 'adminSaveRankingResults']) {
  assert(api.includes(`action === "${action}"`), `Missing backend API route: ${action}`);
}
assert(apiClient.includes('function apiGetRankingState'));
assert(apiClient.includes('function apiSaveRanking'));
assert(apiClient.includes('function apiGetSurvivorState'));
assert(apiClient.includes('function apiSaveSurvivorPick'));
assert(apiClient.includes('function apiAdminSaveRankingResults'));
assert.strictEqual(apiClient, apiMirror, 'frontend API mirror must stay synchronized');

assert(scoring.includes('survivorLeaderboardData_(gameId)'));
assert(scoring.includes('rankingLeaderboardData_(gameId)'));
assert(scoring.includes('survivorUserScoring_(username, gameId)'));
assert(scoring.includes('rankingUserScoring_(username, gameId)'));

assert(!preflight.includes('Survivor publishing is blocked'));
assert(!preflight.includes('Ranking publishing is blocked'));
assert(!preflight.includes('ranking entry/scoring is not production-ready yet'));
assert(preflight.includes('Ranking games need at least one active ranking question.'));

assert(adminSetup.includes('Official Ranking Result'));
assert(adminSetup.includes('adminSetupSaveRankingResults'));
assert(adminSetup.includes('Elimination Result'));
assert(adminSetup.includes('Eliminated Entry'));
assert(adminSetup.includes('"ranking"].indexOf(scoreMode)'));
assert(adminCategories.includes('nominee.finalRank = finalRank'));

assert(rankingPage.includes('Exact') || rankingPage.includes('exact 100%'));
assert(rankingPage.includes('Save Ranking'));
assert(survivorPage.includes('You Are Still Alive'));
assert(survivorPage.includes('Save Survivor Pick'));
assert(css.includes('v1.2.18w Survivor + Ranking games'));
assert(html.includes('v1218w-survivor-ranking'));
assert(sw.includes('v1218w-survivor-ranking'));

const context = { console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp, Set, isFinite, parseInt, parseFloat };
vm.createContext(context);
vm.runInContext(rankingEngine, context);
vm.runInContext(survivorEngine, context);

assert.strictEqual(context.rankingPositionCredit_(0), 1);
assert.strictEqual(context.rankingPositionCredit_(1), 0.8);
assert.strictEqual(context.rankingPositionCredit_(2), 0.6);
assert(Math.abs(context.rankingPositionCredit_(3) - 0.4) < 1e-9);
assert(Math.abs(context.rankingPositionCredit_(4) - 0.2) < 1e-9);
assert.strictEqual(context.rankingPositionCredit_(5), 0);

const rankCategory = {
  id: 'final-order',
  points: 10,
  nominees: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
};
const perfect = context.rankingScoreBallot_(rankCategory, [
  { nomineeId: 'a', rank: 1 }, { nomineeId: 'b', rank: 2 }, { nomineeId: 'c', rank: 3 }
], { a: 1, b: 2, c: 3 });
assert.strictEqual(perfect.earnedPoints, 10);
assert.strictEqual(perfect.accuracyPercent, 100);

const near = context.rankingScoreBallot_(rankCategory, [
  { nomineeId: 'a', rank: 2 }, { nomineeId: 'b', rank: 1 }, { nomineeId: 'c', rank: 3 }
], { a: 1, b: 2, c: 3 });
assert.strictEqual(near.earnedPoints, 8.67);
assert.strictEqual(near.exactCount, 1);

const survivorCategories = [
  { id: 'r1', name: 'Round 1', points: 2 },
  { id: 'r2', name: 'Round 2', points: 3 },
  { id: 'r3', name: 'Round 3', points: 4 }
];
const survivorEvaluation = context.survivorEvaluateUser_('player', 'game', {
  r1: { nomineeId: 'safe' },
  r2: { nomineeId: 'gone' }
}, survivorCategories, {
  r1: { resolved: true, result: 'winner', winnerNomineeId: 'out1', winnerNomineeIds: ['out1'] },
  r2: { resolved: true, result: 'winner', winnerNomineeId: 'gone', winnerNomineeIds: ['gone'] }
});
assert.strictEqual(survivorEvaluation.alive, false);
assert.strictEqual(survivorEvaluation.eliminatedRound, 2);
assert.strictEqual(survivorEvaluation.roundsSurvived, 1);
assert.strictEqual(survivorEvaluation.totalPoints, 2);
assert.strictEqual(survivorEvaluation.rounds[0].status, 'survived');
assert.strictEqual(survivorEvaluation.rounds[1].status, 'eliminated');

const missed = context.survivorEvaluateUser_('player', 'game', {}, [survivorCategories[0]], {
  r1: { resolved: true, result: 'winner', winnerNomineeId: 'out1', winnerNomineeIds: ['out1'] }
});
assert.strictEqual(missed.alive, false);
assert.strictEqual(missed.eliminatedReason, 'missed');

const outOfOrder = context.survivorEvaluateUser_('player', 'game', {}, survivorCategories.slice(0, 2), {
  r2: { resolved: true, result: 'winner', winnerNomineeId: 'gone', winnerNomineeIds: ['gone'] }
});
assert.strictEqual(outOfOrder.alive, true, 'A future round result must not eliminate a player while an earlier round is open.');
assert.strictEqual(outOfOrder.currentRoundIndex, 0);
assert.strictEqual(outOfOrder.rounds[1].resolved, false);

console.log('survivor-ranking-games-v1218w-tests: PASS');
