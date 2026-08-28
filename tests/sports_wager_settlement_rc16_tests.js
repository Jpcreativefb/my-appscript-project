const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sports = fs.readFileSync(path.join(root, 'backend/engines/SportsWagerEngine.js'), 'utf8');
const betting = fs.readFileSync(path.join(root, 'backend/engines/BettingEngine.js'), 'utf8');

function functionSource(source, name, which = 'first') {
  const marker = `function ${name}`;
  const starts = [];
  let from = 0;
  while (true) {
    const index = source.indexOf(marker, from);
    if (index < 0) break;
    starts.push(index);
    from = index + marker.length;
  }
  assert(starts.length, `${name} missing`);
  const start = which === 'last' ? starts[starts.length - 1] : starts[0];
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

function runFunctions(source, specs, context = {}) {
  const sandbox = Object.assign({
    console, Date, Math, Number, String, Array, Object, JSON, RegExp,
    isNaN, isFinite
  }, context);
  vm.createContext(sandbox);
  specs.forEach((spec) => {
    const name = typeof spec === 'string' ? spec : spec.name;
    const which = typeof spec === 'string' ? 'first' : (spec.which || 'first');
    vm.runInContext(functionSource(source, name, which), sandbox);
  });
  return sandbox;
}

const sportsCtx = runFunctions(sports, [
  'sportsWagerString_',
  'sportsWagerKey_',
  'sportsWagerSlug_',
  'sportsWagerBoolean_',
  'sportsWagerNumber_',
  'sportsWagerNormalizeMarket_',
  'sportsWagerHasScoreValue_',
  'sportsWagerIsTerminalCancellation_',
  'sportsWagerIsRefundResultType_',
  'sportsWagerFindWinnerSideFromScore_',
  'sportsWagerGetSpreadSettlementResult_',
  'sportsWagerGetTotalSettlementResult_',
  'sportsWagerFindWinnerNomineeId_',
  'sportsWagerIsBaseballScore_',
  'sportsWagerScoresAreEqual_',
  { name: 'sportsWagerIsCompletedScore_', which: 'last' },
  { name: 'sportsWagerGetSettlementResult_', which: 'last' }
], {
  SPORTS_WAGER_DEFAULT_MARKET: 'moneyline',
  SPORTS_WAGER_DRAW_NOMINEE_ID: 'draw'
});

const awayHome = (awayLine, homeLine) => [
  { nomineeId: 'away', nominee: 'Away Team', selection: 'away', line: awayLine },
  { nomineeId: 'home', nominee: 'Home Team', selection: 'home', line: homeLine }
];
const totalNominees = (line) => [
  { nomineeId: 'over', nominee: `Over ${line}`, selection: 'over', line },
  { nomineeId: 'under', nominee: `Under ${line}`, selection: 'under', line }
];
const score = (away, home, extra = {}) => Object.assign({
  AwayTeam: 'Away Team', HomeTeam: 'Home Team', AwayScore: away, HomeScore: home,
  Status: 'Final', State: 'post', Completed: true
}, extra);

// 1. Terminal cancellation is settleable even when Completed=false.
[
  { Status: 'CANCELED' },
  { Status: 'Cancelled' },
  { Status: 'Game Canceled' },
  { Status: 'No Contest' },
  { State: 'NO_CONTEST' },
  { ScheduleStatus: 'CANCELED' }
].forEach((statusFields) => {
  const canceled = Object.assign({
    Sport: 'baseball', League: 'MLB', AwayScore: 0, HomeScore: 0, Completed: false
  }, statusFields);
  assert.strictEqual(sportsCtx.sportsWagerIsTerminalCancellation_(canceled), true,
    `terminal cancellation must be recognized: ${JSON.stringify(statusFields)}`);
  assert.strictEqual(sportsCtx.sportsWagerIsCompletedScore_(canceled), true,
    'terminal cancellation must bypass Completed=false and baseball tied-score hold');
  const result = sportsCtx.sportsWagerGetSettlementResult_(canceled, awayHome('', ''), 'moneyline');
  assert.strictEqual(result.resolved, true);
  assert.strictEqual(result.winnerNomineeId, '');
  assert.strictEqual(result.wagerResultType, 'void');
  assert.strictEqual(result.reason, 'terminal-cancellation');
});

// Postponed/rescheduled/delayed/suspended games remain pending.
['POSTPONED', 'RESCHEDULED', 'DELAYED', 'SUSPENDED'].forEach((status) => {
  const pending = { Sport: 'football', League: 'NFL', Status: status, State: 'pre', Completed: false };
  assert.strictEqual(sportsCtx.sportsWagerIsTerminalCancellation_(pending), false, `${status} is not cancellation`);
  assert.strictEqual(sportsCtx.sportsWagerIsCompletedScore_(pending), false, `${status} must remain pending`);
  assert.strictEqual(sportsCtx.sportsWagerGetSettlementResult_(pending, awayHome('', ''), 'moneyline').resolved, false);
});

// Tied/final MLB remains protected unless it is canceled.
const mlbTie = score(3, 3, { Sport: 'baseball', League: 'MLB' });
const mlbTieResult = sportsCtx.sportsWagerGetSettlementResult_(mlbTie, awayHome('', ''), 'moneyline');
assert.strictEqual(mlbTieResult.resolved, false);
assert.strictEqual(mlbTieResult.reason, 'baseball-tied-score-waiting-extra-innings');

// 2. Spread grading: selected side's raw score + its line vs opponent raw score.
function assertSpread(awayScore, homeScore, awayLine, homeLine, expectedType, expectedWinner = '') {
  const result = sportsCtx.sportsWagerGetSettlementResult_(
    score(awayScore, homeScore), awayHome(awayLine, homeLine), 'spread'
  );
  assert.strictEqual(result.resolved, true, `spread ${awayScore}-${homeScore} ${awayLine}/${homeLine} must resolve`);
  assert.strictEqual(result.wagerResultType, expectedType);
  assert.strictEqual(result.winnerNomineeId, expectedWinner);
}
assertSpread(24, 21, -3, +3, 'push', '');
assertSpread(25, 21, -3, +3, 'win', 'away');
assertSpread(23, 21, -3, +3, 'win', 'home');
assertSpread(21, 24, +3, -3, 'push', '');
assertSpread(22, 24, +3, -3, 'win', 'away');
assertSpread(20, 24, +3, -3, 'win', 'home');
assertSpread(24, 21, -2.5, +2.5, 'win', 'away');
assertSpread(23, 21, -2.5, +2.5, 'win', 'home');
assertSpread(20, 21, +1.5, -1.5, 'win', 'away');
assertSpread(19, 21, +1.5, -1.5, 'win', 'home');

const missingSpread = sportsCtx.sportsWagerGetSettlementResult_(score(24, 21), awayHome('', ''), 'spread');
assert.strictEqual(missingSpread.resolved, false, 'missing spread lines must not guess a winner');
assert.strictEqual(missingSpread.reason, 'spread-line-missing');

// 3. Totals: over / under / exact push.
function assertTotal(homeScore, awayScore, line, expectedType, expectedWinner = '') {
  const result = sportsCtx.sportsWagerGetSettlementResult_(
    score(awayScore, homeScore), totalNominees(line), 'total'
  );
  assert.strictEqual(result.resolved, true);
  assert.strictEqual(result.wagerResultType, expectedType);
  assert.strictEqual(result.winnerNomineeId, expectedWinner);
  return result;
}
assertTotal(5, 4, 8, 'win', 'over');
assertTotal(5, 2, 8, 'win', 'under');
const exactTotal = assertTotal(5, 3, 8, 'push', '');
assert.strictEqual(exactTotal.reason, 'total-push');
assert(!['winner-not-found', 'final-needs-review'].includes(exactTotal.reason),
  'ordinary total push must not route to review');
assertTotal(5, 4, 8.5, 'win', 'over');
assertTotal(5, 3, 8.5, 'win', 'under');

// 4. Moneyline remains unchanged.
const mlHome = sportsCtx.sportsWagerGetSettlementResult_(score(3, 5), awayHome('', ''), 'moneyline');
assert.strictEqual(mlHome.resolved, true);
assert.strictEqual(mlHome.winnerNomineeId, 'home');
assert.strictEqual(mlHome.wagerResultType, 'win');

// 5. Bankroll math and result aliases. Saved Bets-row odds remain authoritative.
const bettingCtx = runFunctions(betting, [
  'normalizeBetString_', 'normalizeBetKey_', 'roundBetMoney_', 'slugifyBet_',
  'getBetResolution_', 'buildUserBettingSummary_'
]);
const baseConfig = { startingBankroll: 100, minBet: 1, maxBet: 100, minWager: 1, maxWager: 100 };
const bet = { categoryId: 'g1', nomineeId: 'away', betAmount: 10, odds: 2.4, potentialReturn: 24 };

const pendingSummary = bettingCtx.buildUserBettingSummary_('alice', 'sports-wager', baseConfig, { g1: {} }, [bet]);
assert.strictEqual(pendingSummary.bankroll, 90, 'pending wager reserves the stake');
assert.strictEqual(pendingSummary.pendingStake, 10);

['void', 'refund', 'push', 'cancelled', 'canceled', 'no-contest', 'No Contest'].forEach((type) => {
  const settings = { g1: { wagerResultType: type } };
  const summary1 = bettingCtx.buildUserBettingSummary_('alice', 'sports-wager', baseConfig, settings, [bet]);
  const summary2 = bettingCtx.buildUserBettingSummary_('alice', 'sports-wager', baseConfig, settings, [bet]);
  assert.strictEqual(summary1.bankroll, 100, `${type} must restore exactly the 10-point stake`);
  assert.strictEqual(summary1.pendingBets, 0);
  assert.strictEqual(summary2.bankroll, 100, `${type} repeated resolution must be financially idempotent`);
});

const winningSummary = bettingCtx.buildUserBettingSummary_(
  'alice', 'sports-wager', baseConfig,
  { g1: { winnerNomineeId: 'away', wagerResultType: 'win', currentOdds: 99 } }, [bet]
);
assert.strictEqual(winningSummary.bankroll, 114,
  'winning payout must use saved Bets-row odds 2.4, not any later/current odds value');

const losingSummary = bettingCtx.buildUserBettingSummary_(
  'alice', 'sports-wager', baseConfig,
  { g1: { winnerNomineeId: 'home', wagerResultType: 'win' } }, [bet]
);
assert.strictEqual(losingSummary.bankroll, 90, 'loss must not deduct stake a second time');

// 6. Neutral settlements are recordable without a fake winner nominee.
let capturedResult = null;
const resultCtx = runFunctions(sports, [
  'sportsWagerString_', 'sportsWagerKey_', 'sportsWagerSlug_', 'sportsWagerIsRefundResultType_',
  'sportsWagerUpsertCategoryResultForSettlement_'
], {
  sportsWagerScoreSummaryValue_: () => 'Away 24 @ Home 21',
  upsertCategoryResult_: (payload) => { capturedResult = payload; return { success: true }; },
  sportsWagerDirectUpsertCategoryResult_: () => { throw new Error('direct fallback should not be needed'); }
});
const neutralWrite = resultCtx.sportsWagerUpsertCategoryResultForSettlement_(
  'sports-wagers', 'spread-1', '', 'push', score(24, 21), 'test-push'
);
assert.strictEqual(neutralWrite.success, true);
assert(capturedResult, 'push settlement must write CategoryResults without a fake nominee');
assert.strictEqual(capturedResult.nomineeId, '');
assert.strictEqual(capturedResult.isWinner, false);
assert.strictEqual(capturedResult.resultStatus, 'push');

// 7. Both finalizer paths use the completed/terminal gate, so Completed=false cancellation can settle.
const categoryFinalizer = functionSource(sports, 'finalizeSportsWagerResultsFromCategories_');
const sourceFinalizer = functionSource(sports, 'finalizeSportsWagerResultsFromSourceScores_');
assert(categoryFinalizer.includes('sportsWagerIsCompletedScore_(score)'), 'category finalizer must use the cancellation-aware completion gate');
assert(sourceFinalizer.includes('sportsWagerIsCompletedScore_(score)'), 'source-score finalizer must use the cancellation-aware completion gate');
assert(sourceFinalizer.includes('sportsWagerGetSettlementResult_'), 'source-score finalizer must use corrected grading');
assert(categoryFinalizer.includes('sportsWagerGetSettlementResult_'), 'category finalizer must use corrected grading');

// No Odds-provider dependency is introduced into settlement.
for (const body of [categoryFinalizer, sourceFinalizer]) {
  assert(!/refreshSportsOdds|apiAdminRefreshSportsOdds|refreshSportsOddsForLeague/.test(body),
    'settlement must not invoke paid Odds-provider refresh');
}

// Push/void must clear any stale winner ID rather than leaving a conflicting prior winner.
const settingWriter = functionSource(sports, 'sportsWagerSetCategorySettingWinnerAllMatches_');
assert(settingWriter.includes('sportsWagerIsRefundResultType_(cleanResultType)'),
  'neutral settlement writer must clear a stale winner nominee');

// Direct fallback must also permit a neutral CategoryResults record.
const directWriter = functionSource(sports, 'sportsWagerDirectUpsertCategoryResult_');
assert(directWriter.includes('!cleanNomineeId && !neutralSettlement'),
  'direct CategoryResults fallback must allow push/void with blank nominee');
assert(directWriter.includes('!!cleanNomineeId && !neutralSettlement'),
  'neutral result must never be marked IsWinner');

console.log('sports-wager-settlement-rc16-tests: PASS');
