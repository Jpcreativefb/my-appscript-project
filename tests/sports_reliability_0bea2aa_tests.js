const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const admin = read('external-engines/sports-scoring-engine/src/SportsAdminControls.js');
const players = read('external-engines/sports-scoring-engine/src/SportsPlayersEngine.js');
const advanced = read('external-engines/sports-scoring-engine/src/SportsAdvancedStatsEngine.js');
const odds = read('external-engines/sports-scoring-engine/src/SportsOddsEngine.js');
const sportsPage = read('frontend/js/sports.js');
const adminPage = read('frontend/js/pages/admin.js');
const sportsWager = read('backend/engines/SportsWagerEngine.js');
const live = read('backend/engines/SportsLiveDisplayEngine.js');
const betting = read('backend/engines/BettingEngine.js');
const bridge = read('backend/engines/SportsAdminBridgeEngine.js');
const api = read('backend/Api.js');

function functionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name}`);
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

function runFunctions(source, names, context = {}) {
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON }, context);
  vm.createContext(sandbox);
  names.forEach((name) => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

// 1) Sports Controls first-paint reliability.
const dashboardFn = functionSource(admin, 'apiGetSportsAdminDashboard_');
assert(!dashboardFn.includes('setupSportsAdminControlSystem()'), 'Dashboard open must not run Sports Engine setup/migrations');
assert(!dashboardFn.includes('getSportsPlayersStatus_()'), 'Dashboard first paint must not scan player/stat tables');
assert(!dashboardFn.includes('getSportsAdvancedStatsStatus_()'), 'Dashboard first paint must not scan advanced/checkpoint tables');
assert(!dashboardFn.includes('checkSportsEngineStatus()'), 'Dashboard first paint must not run full engine diagnostics');
assert(!dashboardFn.includes('sportsWorkbookCapacityReport_()'), 'Dashboard first paint must not scan workbook capacity');
assert(dashboardFn.includes('lightweightOddsParams.lightweight = true'), 'Dashboard must defer full odds API-log aggregation');
assert(dashboardFn.includes('diagnosticsDeferred: true'), 'Dashboard must advertise deferred diagnostics');
const openFn = functionSource(adminPage, 'adminOpenSportsControls');
assert(!openFn.includes('apiAdminSetupSportsControls'), 'Opening Sports Controls must not run setup synchronously');
assert(adminPage.includes('function adminLoadSportsSupplementalStatus_'), 'Player/advanced diagnostics must lazy-load after first paint');
assert(players.includes('SPORTS_PLAYERS_STATUS_CACHE_SECONDS = 300') && players.includes('CacheService.getScriptCache()'), 'Player status must use a short diagnostic cache');
assert(advanced.includes('SPORTS_ADVANCED_STATUS_CACHE_SECONDS = 300') && advanced.includes('CacheService.getScriptCache()'), 'Advanced/checkpoint status must use a short diagnostic cache');
assert(admin.includes('SPORTS_ODDS_ADMIN_USAGE_CACHE_SECONDS = 300'), 'Odds API-log aggregation must be cached');

// 2) Odds error observability + v48 limits, without making a provider call.
assert(adminPage.includes('oddsUsage.LastRefreshMessage'), 'Odds status must surface the persisted provider/engine error message');
assert(/league\.oddsDailyMaxPulls \|\|\s*5/.test(adminPage), 'Frontend daily limit fallback must remain 5/day');
assert(/league\.oddsMonthlyMaxPulls \|\|\s*100/.test(adminPage), 'Frontend monthly limit fallback must remain 100/month');
const oddsCtx = runFunctions(odds, ['sportsOddsProviderErrorMessage_'], {
  sportsOddsString_: (v) => v == null ? '' : String(v).trim()
});
assert.strictEqual(
  oddsCtx.sportsOddsProviderErrorMessage_(422, '{"error_code":"INVALID_MARKETS","message":"Unsupported market"}', { error_code: 'INVALID_MARKETS', message: 'Unsupported market' }),
  'Odds API HTTP 422: INVALID_MARKETS: Unsupported market',
  'Provider HTTP errors must preserve provider code/message'
);

// 3) Manual Smart Sync must only queue work.
let queueCalls = 0;
const syncCtx = runFunctions(sportsWager, ['apiAdminRunSportsFullSync'], {
  requireAdmin_: () => true,
  queueSportsWagerSmartAutomationNow_: (reason) => {
    queueCalls++;
    assert.strictEqual(reason, 'manual-full-sync');
    return { installed: true, handler: 'runSportsWagerSmartAutomationQueued' };
  },
  finalizeSportsWagerResultsFromSourceScoresForAllGames_: () => { throw new Error('must not run inline'); },
  settleSportsPlayerPropsForAllGames_: () => { throw new Error('must not run inline'); },
  settleSportsPlayerMatchupsForAllGames_: () => { throw new Error('must not run inline'); },
  settleSportsAdvancedQuestionsForAllGames_: () => { throw new Error('must not run inline'); }
});
const queued = syncCtx.apiAdminRunSportsFullSync({ username: 'admin', token: 'x' });
assert.strictEqual(queueCalls, 1, 'Manual Smart Sync must create/coalesce exactly one queued trigger');
assert.strictEqual(queued.success, true);
assert.strictEqual(queued.queued, true);
assert.deepStrictEqual(Array.from(queued.sync.results), [], 'Manual Smart Sync response must not contain synchronous settlement work');

// 4) Sports Scores & Game Builder transport must be server-side, not browser JSONP.
assert(!sportsPage.includes('function sportsJsonp('), 'Browser JSONP helper must be removed');
assert(!sportsPage.includes('SPORTS_API_URL'), 'Browser must not call the separate Apps Script project directly');
assert(sportsPage.includes('adminGetSportsEngineScores') && sportsPage.includes('sportsScoresEngineApi_'), 'Sports page must use Awards POST server bridge');
assert(bridge.includes('function apiAdminGetSportsEngineLeagues') && bridge.includes('function apiAdminGetSportsEngineScores') && bridge.includes('function apiAdminGetSportsEngineSnapshots'), 'Server bridge read wrappers are incomplete');
assert(api.includes('action === "adminGetSportsEngineScores"') && api.includes('action === "adminGetSportsEngineSnapshots"'), 'Awards API routes for Sports Engine reads are missing');

// 5) Starting-pitcher ingestion: ESPN side-keyed probable containers must resolve correctly.
const liveCtx = runFunctions(live, [
  'sportsLiveDisplayAthlete_',
  'sportsLiveDisplayHeaderCompetition_',
  'sportsLiveDisplayCompetitorSideMap_',
  'sportsLiveDisplayAppendProbableCandidates_',
  'sportsLiveDisplayProbableCandidates_',
  'sportsLiveDisplayFindProbable_'
], {
  sportsLiveDisplayString_: (v) => v == null ? '' : String(v).trim(),
  sportsLiveDisplayKey_: (v) => v == null ? '' : String(v).trim().toLowerCase()
});
const probableSummary = {
  header: { competitions: [{ competitors: [
    { homeAway: 'away', team: { id: 'A', displayName: 'Away Club' } },
    { homeAway: 'home', team: { id: 'H', displayName: 'Home Club' } }
  ] }] },
  gameInfo: {
    probablePitchers: {
      away: { athlete: { id: '11', displayName: 'Away Starter', position: { abbreviation: 'SP' } } },
      home: { athlete: { id: '22', displayName: 'Home Starter', position: { abbreviation: 'SP' } } }
    }
  }
};
assert.strictEqual(liveCtx.sportsLiveDisplayFindProbable_(probableSummary, 'away').name, 'Away Starter');
assert.strictEqual(liveCtx.sportsLiveDisplayFindProbable_(probableSummary, 'home').name, 'Home Starter');
const rosterOnlySummary = {
  header: probableSummary.header,
  rosters: [
    { homeAway: 'away', roster: [{ starter: true, athlete: { id: '31', displayName: 'Away Roster Starter', position: { abbreviation: 'SP' } } }] },
    { homeAway: 'home', roster: [{ starter: true, athlete: { id: '32', displayName: 'Home Roster Starter', position: { abbreviation: 'SP' } } }] }
  ]
};
assert.strictEqual(liveCtx.sportsLiveDisplayFindProbable_(rosterOnlySummary, 'home').name, 'Home Roster Starter');

// 6) Sports Wager certification: market creation + real-odds ingestion.
const marketCtx = runFunctions(sportsWager, [
  'sportsWagerString_', 'sportsWagerKey_', 'sportsWagerSlug_', 'sportsWagerNumber_',
  'sportsWagerNormalizeMarket_', 'sportsWagerFormatLine_', 'buildSportsWagerEntries_'
], {
  SPORTS_WAGER_DEFAULT_MARKET: 'moneyline',
  SPORTS_WAGER_DEFAULT_ODDS: 2,
  getSportsWagerRealOddsForScore_: () => ({ awayOdds: 2.35, homeOdds: 1.68, source: 'real-odds:testbook' }),
  calculateSportsWagerAutoOdds_: () => ({ awayOdds: 2, homeOdds: 2, source: 'record' }),
  buildSportsWagerPendingEntries_: () => ({ pending: true }),
  sportsWagerMarketLabel_: (m) => m
});
const game = { AwayTeam: 'Chicago Cubs', HomeTeam: 'Milwaukee Brewers', AwayLogo: 'a.png', HomeLogo: 'h.png' };
const manualMarket = marketCtx.buildSportsWagerEntries_(game, 'moneyline', 'manual', { awayOdds: 2.1, homeOdds: 1.8 });
assert.strictEqual(manualMarket.source, 'manual');
assert.strictEqual(manualMarket.entries.length, 2);
assert.strictEqual(manualMarket.entries[0].nomineeId, 'chicago-cubs');
assert.strictEqual(manualMarket.entries[1].odds, 1.8);
const realMarket = marketCtx.buildSportsWagerEntries_(game, 'moneyline', 'real', {});
assert.strictEqual(realMarket.source, 'real-odds:testbook');
assert.strictEqual(realMarket.entries[0].odds, 2.35);
assert.strictEqual(realMarket.entries[1].odds, 1.68);

// 7) Wager locking.
const lockCtx = runFunctions(betting, ['isBettingCategoryLocked_']);
assert.strictEqual(lockCtx.isBettingCategoryLocked_({ locked: true }, {}), true, 'Explicit category lock must block wager changes');
assert.strictEqual(lockCtx.isBettingCategoryLocked_({}, { locked: true }), true, 'Explicit setting lock must block wager changes');
assert.strictEqual(lockCtx.isBettingCategoryLocked_({}, { lockDateTime: '2000-01-01T00:00:00Z' }), true, 'Past lock time must block wager changes');
assert.strictEqual(lockCtx.isBettingCategoryLocked_({}, { lockDateTime: '2999-01-01T00:00:00Z' }), false, 'Future lock time must remain open');

// 8) Settlement mapping, including the historical tied-moneyline half refund.
const settleCtx = runFunctions(sportsWager, ['sportsWagerGetSettlementResult_'], {
  SPORTS_WAGER_DRAW_NOMINEE_ID: 'draw',
  sportsWagerNormalizeMarket_: (v) => String(v || '').toLowerCase(),
  sportsWagerIsCompletedScore_: () => true,
  sportsWagerHasScoreValue_: (v) => v !== '' && v !== null && v !== undefined,
  sportsWagerNumber_: (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback,
  sportsWagerKey_: (v) => String(v || '').trim().toLowerCase(),
  sportsWagerSlug_: (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  sportsWagerFindWinnerNomineeId_: () => 'home-team'
});
const tieSettlement = settleCtx.sportsWagerGetSettlementResult_({ Completed: true, HomeScore: 4, AwayScore: 4 }, [], 'moneyline');
assert.strictEqual(tieSettlement.resolved, true);
assert.strictEqual(tieSettlement.winnerNomineeId, 'draw');
assert.strictEqual(tieSettlement.wagerResultType, 'half-refund');
const winSettlement = settleCtx.sportsWagerGetSettlementResult_({ Completed: true, HomeScore: 5, AwayScore: 2 }, [], 'moneyline');
assert.strictEqual(winSettlement.winnerNomineeId, 'home-team');
assert.strictEqual(winSettlement.wagerResultType, 'win');

// 9) Bankroll / payout behavior used by Sports Wagers.
const betCtx = runFunctions(betting, [
  'normalizeBetString_', 'normalizeBetKey_', 'normalizeBetGameId_', 'roundBetMoney_', 'slugifyBet_',
  'getBetResolution_', 'getUserBettingSummary'
], {
  getDefaultGameId: () => 'sports-wagers',
  validateGameId: () => true,
  getBettingGameConfig: () => ({ startingBankroll: 100, minBet: 1, maxBet: 100, minWager: 1, maxWager: 100 }),
  getCategorySettings: () => ({
    win: { winnerNomineeId: 'home' },
    lose: { winnerNomineeId: 'away' },
    push: { wagerResultType: 'push' },
    half: { winnerNomineeId: 'draw', wagerResultType: 'half-refund' },
    pending: {}
  }),
  getUserBets: () => [
    { categoryId: 'win', nomineeId: 'home', betAmount: 10, odds: 2, potentialReturn: 20 },
    { categoryId: 'lose', nomineeId: 'home', betAmount: 10, odds: 2, potentialReturn: 20 },
    { categoryId: 'push', nomineeId: 'home', betAmount: 10, odds: 2, potentialReturn: 20 },
    { categoryId: 'half', nomineeId: 'home', betAmount: 10, odds: 2, potentialReturn: 20 },
    { categoryId: 'pending', nomineeId: 'home', betAmount: 10, odds: 3, potentialReturn: 30 }
  ]
});
const summary = betCtx.getUserBettingSummary('alice', 'sports-wagers');
assert.strictEqual(summary.totalStaked, 50);
assert.strictEqual(summary.payout, 35, 'Win 20 + push 10 + half refund 5 must pay 35');
assert.strictEqual(summary.bankroll, 85, '100 bankroll - 50 staked + 35 payout must equal 85');
assert.strictEqual(summary.pendingStake, 10);
assert.strictEqual(summary.pendingPotentialReturn, 30);
assert.strictEqual(summary.maxBankroll, 115);
assert.strictEqual(summary.wonBets, 1);
assert.strictEqual(summary.lostBets, 1);
assert.strictEqual(summary.refundedBets, 2);
assert.strictEqual(summary.pendingBets, 1);

console.log('sports-reliability-0bea2aa-tests: PASS');
