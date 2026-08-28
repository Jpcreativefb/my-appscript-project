const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const adminPage = read('frontend/js/pages/admin.js');
const adminEngine = read('external-engines/sports-scoring-engine/src/SportsAdminControls.js');
const bettingPage = read('frontend/js/pages/betting.js');
const bettingCss = read('frontend/css/betting.css');
const bettingEngine = read('backend/engines/BettingEngine.js');
const sportsHtml = read('frontend/sports.html');

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

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing marker ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing marker ${endMarker}`);
  return source.slice(start, end);
}

function runFunctions(source, names, context = {}) {
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON, Promise, setTimeout, clearTimeout }, context);
  vm.createContext(sandbox);
  names.forEach((name) => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

// 1) Sports is an Admin workflow. Its Back target must be Admin without changing
// normal app Home navigation elsewhere.
assert(
  sportsHtml.includes('<a href="./app.html#admin">← Back to Admin</a>'),
  'Sports page Back must return to Admin'
);

// 2) Smart Sync result lives beside the Smart Sync control and persists 15s.
const syncFn = functionSource(adminPage, 'adminRunFullSportsSyncNow');
const syncStatusFn = functionSource(adminPage, 'adminSportsSmartSyncStatus_');
const smartButtonIndex = adminPage.indexOf('Run Smart Sports Sync Now');
const smartStatusIndex = adminPage.indexOf('id="adminSportsSmartSyncMessage"', smartButtonIndex);
assert(smartButtonIndex >= 0 && smartStatusIndex > smartButtonIndex && smartStatusIndex - smartButtonIndex < 1000,
  'Smart Sync status must render adjacent to the Smart Sync control');
assert(syncFn.includes('adminSportsSmartSyncStatus_') && syncFn.includes('15000'),
  'Smart Sync final queued/success/error message must use the adjacent 15s status');
assert(syncStatusFn.includes('__adminSportsSmartSyncTimer'),
  'Smart Sync status must cancel/replace its prior timer on the next action');

// 3) One mocked paid refresh changes server usage once and returns absolute
// Today / Month / API-left values for an in-place UI update. No provider call is real.
const setting = {
  League: 'MLB', OddsEnabled: true, AutoRefreshEnabled: true, ManualRefreshEnabled: true,
  StopAtMonthlyCalls: 450, CallsThisMonth: 35, MonthlyBudget: 100,
  CallsToday: 1, MaxRefreshesPerDay: 5, DefaultMarkets: 'h2h', DefaultRegions: 'us',
  OddsWindow: 'STANDARD', LastApiRemaining: 498
};
let incrementCalls = 0;
let providerCalls = 0;
const oddsCtx = runFunctions(adminEngine, ['refreshSportsOddsForLeagueControlled_'], {
  sportsAdminString_: (v) => v == null ? '' : String(v).trim(),
  sportsAdminPrepareOddsRefresh_: () => true,
  getSportsOddsSettingForLeague_: () => Object.assign({}, setting),
  sportsAdminGetLeagueControlState_: () => ({ enabled: true, seasonActive: true }),
  sportsOddsGetMonthlyUsageRow_: () => ({ totalCallsUsed: setting.CallsThisMonth, hardCap: 500 }),
  sportsOddsLeagueToSportKey_: () => 'baseball_mlb',
  sportsOddsEstimateRequestCost_: () => 1,
  sportsOddsIncrementUsage_: () => {
    incrementCalls++;
    setting.CallsToday += 1;
    setting.CallsThisMonth += 1;
    return { month: '2026-08', totalCallsUsed: setting.CallsThisMonth, warnAt: 400, hardCap: 500 };
  },
  updateSportsOddsRefreshStatus_: () => true,
  refreshSportsOddsForLeagueWithOptions: () => {
    providerCalls++;
    return { success: true, usable: 13, apiUsage: { requestsRemaining: 497 } };
  },
  sportsOddsUpdateLastApiUsage_: (league, usage) => {
    setting.LastApiRemaining = Number(usage.requestsRemaining);
  },
  sportsAdminOddsWindowDays_: () => 14
});
const paid = oddsCtx.refreshSportsOddsForLeagueControlled_('MLB', 'manual');
assert.strictEqual(incrementCalls, 1, 'one provider refresh must increment accounting exactly once');
assert.strictEqual(providerCalls, 1, 'mock provider transport must run exactly once');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(paid.displayUsage)),
  { callsToday: 2, maxRefreshesPerDay: 5, callsThisMonth: 36, monthlyBudget: 100, apiRemaining: 497 },
  'refresh response must return current absolute Today/Month/API-left values'
);

const usageNodes = {
  '[data-sports-odds-today="mlb"]': [{ textContent: '1' }, { textContent: '1' }],
  '[data-sports-odds-month="mlb"]': [{ textContent: '35' }, { textContent: '35' }],
  '[data-sports-odds-api-left="mlb"]': [{ textContent: '498' }, { textContent: '498' }]
};
const usageUiCtx = runFunctions(adminPage, ['adminSportsSetOddsUsage_'], {
  adminSportsKey_: (v) => String(v || '').trim().toLowerCase(),
  document: { querySelectorAll: (selector) => usageNodes[selector] || [] }
});
usageUiCtx.adminSportsSetOddsUsage_('MLB', paid.displayUsage);
usageNodes['[data-sports-odds-today="mlb"]'].forEach((n) => assert.strictEqual(n.textContent, '2'));
usageNodes['[data-sports-odds-month="mlb"]'].forEach((n) => assert.strictEqual(n.textContent, '36'));
usageNodes['[data-sports-odds-api-left="mlb"]'].forEach((n) => assert.strictEqual(n.textContent, '497'));
assert(functionSource(adminPage, 'adminRefreshSportsOddsLeague').includes('res.displayUsage'),
  'successful odds refresh must update counters from the same response without full dashboard reload');
assert(functionSource(adminPage, 'adminRefreshSportsOddsLeague').includes('adminSportsSetOddsLastStatus_'),
  'shared Last-Odds updater must remain in the successful refresh path');

// 4) Wager save: preserve bankroll/duplicate checks while avoiding repeated Bets
// sheet scans and return an immediate post-save summary.
const saveFn = functionSource(bettingEngine, 'saveBet');
assert.strictEqual((saveFn.match(/getAllBetsData_\(\)/g) || []).length, 1,
  'interactive wager save must read the Bets sheet only once');
assert(!saveFn.includes('getUserBettingSummary('),
  'interactive wager save must not rebuild the summary by re-reading Sheets');
assert(saveFn.includes('getLatestBetsForSingleUserFromData_') && saveFn.includes('buildUserBettingSummary_'),
  'wager save must reuse the locked Bets snapshot for bankroll validation and response summary');
assert(saveFn.includes('findExistingBetRows_') && saveFn.includes('duplicatesRemoved'),
  'duplicate-wager protection must remain in the save path');
assert(saveFn.includes('Bet exceeds available bankroll'),
  'bankroll protection must remain in the save path');
assert(saveFn.includes('summary: nextSummary'),
  'wager save response must carry authoritative bankroll/Pending summary immediately');

const summaryCtx = runFunctions(bettingEngine, [
  'normalizeBetString_', 'normalizeBetKey_', 'roundBetMoney_', 'slugifyBet_',
  'getBetResolution_', 'buildUserBettingSummary_'
]);
const onePending = summaryCtx.buildUserBettingSummary_(
  'alice', 'sports-wager',
  { startingBankroll: 100, minBet: 1, maxBet: 100, minWager: 1, maxWager: 100 },
  { game1: {} },
  [{ categoryId: 'game1', nomineeId: 'cubs', betAmount: 10, odds: 2, potentialReturn: 20 }]
);
assert.strictEqual(onePending.bankroll, 90, '10-point pending wager must immediately reserve bankroll from 100 to 90');
assert.strictEqual(onePending.pendingBets, 1);
assert.strictEqual(onePending.pendingStake, 10);
assert.strictEqual(onePending.maxBankroll, 110);

// 5) Explicit form flow + double-submit prevention + local feedback.
const placeFn = functionSource(bettingPage, 'placeBettingWager');
const saveUiFn = sourceBetween(bettingPage, 'async function saveBetSelectionNow_(', '\nfunction saveBetSelection(');
const markSavingFn = functionSource(bettingPage, 'markBettingCategorySaving_');
assert(bettingPage.includes('onclick="placeBettingWager('), 'wager UI must have an explicit Place Wager action');
assert(bettingPage.includes('onclick="${categoryFinished || locked || !nomineeOddsAvailable ? "" : `selectBettingNominee'),
  'selection click must choose a side rather than immediately writing the wager');
assert(markSavingFn.includes('data-betting-place-category') && markSavingFn.includes('button.disabled = saving === true'),
  'Place Wager button must disable while saving');
assert(saveUiFn.includes('setBettingActionStatus_') && saveUiFn.includes('Saving wager...'),
  'saving feedback must appear in the wager form immediately');
assert(saveUiFn.includes('Wager placed — ') && saveUiFn.includes('updateBettingSummaryFromSave_(res.summary)') && saveUiFn.includes('updateBettingCurrentFromSave_'),
  'successful save must update local card Pending state and returned bankroll immediately');
assert(bettingPage.includes('data-betting-action-status='),
  'success/error feedback must render inside each wager card/form');
assert(functionSource(bettingPage, 'updateBettingCurrentFromSave_').includes('Pending · '),
  'saved wager card must immediately show Pending / wagered / possible return state');

let saveStarts = 0;
const button = { value: '10' };
const submitCtx = runFunctions(bettingPage, ['placeBettingWager'], {
  BETTING_STATE: { savingCategories: {}, saveTokens: {}, latestSaveDrafts: {} },
  getSelectedBettingNomineeId_: () => 'cubs',
  getBetAmountInputId_: () => 'amount',
  document: { getElementById: () => button },
  setBettingActionStatus_: () => {},
  saveBetSelectionNow_: function(categoryId) {
    saveStarts++;
    submitCtx.BETTING_STATE.savingCategories[categoryId] = true;
  }
});
submitCtx.placeBettingWager('game1');
submitCtx.placeBettingWager('game1');
assert.strictEqual(saveStarts, 1, 'double click while saving must start only one wager request');

// 6) MLB starter is rendered with its corresponding team, not as a detached
// duplicate pitcher section.
const pitcherCtx = runFunctions(bettingPage, [
  'normalizeBettingLiveKey_', 'getBettingLiveSideForNominee_', 'getBettingLiveGameDetails_', 'getBettingNomineePitcher_'
], {
  BETTING_LIVE_GAME_DETAILS_BY_EVENT: {}
});
const mlbCategory = {
  league: 'mlb',
  homeTeam: 'Detroit Tigers',
  awayTeam: 'Chicago Cubs',
  homeProbablePitcher: 'Tarik Skubal',
  awayProbablePitcher: 'Matthew Boyd',
  liveGameDetails: {
    homeStarter: { name: 'Tarik Skubal' },
    awayStarter: { name: 'Matthew Boyd' }
  }
};
assert.strictEqual(pitcherCtx.getBettingNomineePitcher_(mlbCategory, { id: 'home', name: 'Detroit Tigers' }), 'Tarik Skubal');
assert.strictEqual(pitcherCtx.getBettingNomineePitcher_(mlbCategory, { id: 'away', name: 'Chicago Cubs' }), 'Matthew Boyd');
assert(bettingPage.includes('${renderBettingNomineePitcher_(category, nominee)}'),
  'MLB probable pitcher must render inside the corresponding team selection card');
const categoryRender = sourceBetween(bettingPage, 'function renderBettingCategory_(', '\nasync function removeBetSelection(');
assert(!categoryRender.includes('renderBettingStartingPitchers_(category)'),
  'wager matchup must not duplicate pitchers in a detached pitcher section');

// 7) Compact Game Info is a renderer over already-cached category/score fields.
const gameInfoFn = sourceBetween(bettingPage, 'function renderBettingGameInfo_(', '\nfunction getBettingCategoryFromBatch_(');
assert(gameInfoFn.includes('Venue') && gameInfoFn.includes('Scheduled') && gameInfoFn.includes('Records'),
  'Game Info must expose cached venue/time/records when available');
assert(!/refreshSportsOdds|apiAdminRefreshSportsOdds|refreshSportsOddsForLeague/.test(gameInfoFn),
  'Game Info renderer must not trigger a paid Odds refresh');
assert(functionSource(bettingPage, 'applyBettingLiveScores_').includes('score.HomeProbablePitcher'),
  'cached SportsScores probable pitchers must be carried into wager categories');
assert(bettingCss.includes('.betting-wager-layout') && bettingCss.includes('@media (max-width: 760px)'),
  'wager layout must support wide two-panel and mobile stacked flow');

console.log('sports-wager-rc15-live-followup-tests: PASS');
