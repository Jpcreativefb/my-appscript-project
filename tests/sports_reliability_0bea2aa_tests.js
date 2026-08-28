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
const scoresEngine = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');
const espnProxy = read('functions/api/espn-proxy.js');

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
const oddsSettingsReadFn = functionSource(admin, 'apiGetSportsOddsAdminSettings_');
assert(oddsSettingsReadFn.includes('if (!lightweight)'), 'Lightweight odds dashboard reads must skip seed/cleanup writes');
assert(oddsSettingsReadFn.includes('readSportsOddsAdminSettings_({ skipSetup: lightweight })'), 'Lightweight odds read must avoid setup work');
const sportsSettingsReadFn = functionSource(admin, 'apiGetSportsSettingsAdmin_');
assert(sportsSettingsReadFn.includes('params.lightweight'), 'Lightweight SportsSettings read must avoid column migrations');
const controlsLoadFn = functionSource(adminPage, 'adminLoadSportsControls');
assert(!controlsLoadFn.includes('await apiAdminGetSmartSportsAutomationStatus()'), 'Sports Controls first paint must not wait for Awards wager-trigger status');
assert(functionSource(admin, 'apiGetSportsAdminDashboard_').includes('dashboardTriggers = ScriptApp.getProjectTriggers()'), 'Sports dashboard must snapshot project triggers once');

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

const oddsUrlCtx = runFunctions(odds, ['sportsOddsUtcTimestamp_', 'buildSportsOddsApiUrl_'], {
  getSportsOddsApiKey_: () => 'TEST_KEY_NOT_REAL',
  SPORTS_ODDS_API_BASE: 'https://api.the-odds-api.com/v4/sports',
  SPORTS_ODDS_REGIONS: 'us',
  SPORTS_ODDS_MARKETS: 'h2h',
  SPORTS_ODDS_FORMAT: 'decimal',
  SPORTS_ODDS_DATE_FORMAT: 'iso'
});
const generatedOddsUrl = oddsUrlCtx.buildSportsOddsApiUrl_(
  'baseball_mlb',
  'h2h',
  'us',
  {
    commenceTimeFrom: '2026-08-26T21:17:34.987Z',
    commenceTimeTo: '2026-09-09T21:17:34.123Z'
  }
);
const generatedOddsParams = new URL(generatedOddsUrl).searchParams;
assert.strictEqual(generatedOddsParams.get('commenceTimeFrom'), '2026-08-26T21:17:34Z', 'Generated Odds URL must use second-precision UTC commenceTimeFrom');
assert.strictEqual(generatedOddsParams.get('commenceTimeTo'), '2026-09-09T21:17:34Z', 'Generated Odds URL must use second-precision UTC commenceTimeTo');
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(generatedOddsParams.get('commenceTimeFrom')), 'commenceTimeFrom must exactly match YYYY-MM-DDTHH:MM:SSZ');
assert(!generatedOddsUrl.includes('.987Z') && !generatedOddsUrl.includes('.123Z'), 'Outgoing Odds API URL must not contain timestamp milliseconds');

const oddsFetchCtx = runFunctions(odds, ['fetchSportsOddsApiJsonWithLog_'], {
  UrlFetchApp: {
    fetch: () => ({
      getResponseCode: () => 200,
      getContentText: () => '[]',
      getHeaders: () => ({ 'x-requests-last': '1', 'x-requests-used': '24', 'x-requests-remaining': '476' })
    })
  },
  sportsOddsHeaderValue_: (headers, key) => headers[key] || '',
  sportsOddsLogApiCall_: () => { throw new Error('Could not lock script while setting up sheet: SportsOddsApiLog'); },
  sportsOddsProviderErrorMessage_: () => 'provider failed',
  SPORTS_ODDS_LAST_API_USAGE_: null
});
const loggedButNonfatal = oddsFetchCtx.fetchSportsOddsApiJsonWithLog_('https://example.invalid/odds', { league: 'MLB' });
assert.deepStrictEqual(Array.from(loggedButNonfatal.payload), [], 'Successful provider payload must survive diagnostic log failure');
assert.strictEqual(loggedButNonfatal.usage.requestsRemaining, '476');
assert(loggedButNonfatal.usage.logWarning.includes('SportsOddsApiLog'), 'Diagnostic log lock failure must be retained only as a warning');

const odds422Ctx = runFunctions(odds, ['sportsOddsProviderErrorMessage_', 'fetchSportsOddsApiJsonWithLog_'], {
  sportsOddsString_: (v) => v == null ? '' : String(v).trim(),
  UrlFetchApp: {
    fetch: () => ({
      getResponseCode: () => 422,
      getContentText: () => JSON.stringify({ error_code: 'INVALID_COMMENCE_TIME', message: 'commenceTimeFrom must be ISO UTC seconds' }),
      getHeaders: () => ({})
    })
  },
  sportsOddsHeaderValue_: () => '',
  sportsOddsLogApiCall_: () => { throw new Error('Could not lock script while setting up sheet: SportsOddsApiLog'); },
  SPORTS_ODDS_LAST_API_USAGE_: null
});
assert.throws(
  () => odds422Ctx.fetchSportsOddsApiJsonWithLog_('https://example.invalid/odds', { league: 'MLB' }),
  /Odds API HTTP 422: INVALID_COMMENCE_TIME: commenceTimeFrom must be ISO UTC seconds/,
  'Provider HTTP 422 must remain the operational error even when SportsOddsApiLog diagnostics also fail'
);

const oddsSetupCtx = runFunctions(odds, ['setupSportsOddsSystem'], {
  SPORTS_ODDS_SHEET: 'SportsOdds',
  SPORTS_ODDS_HEADERS: ['A'],
  SPORTS_ODDS_API_LOG_SHEET: 'SportsOddsApiLog',
  SPORTS_ODDS_API_LOG_HEADERS: ['A'],
  sportsOddsEnsureHeaderSheetSafe_: (name) => {
    if (name === 'SportsOdds') return { added: [] };
    throw new Error('diagnostic lock busy: ' + name);
  }
});
const oddsSetup = oddsSetupCtx.setupSportsOddsSystem();
assert.strictEqual(oddsSetup.success, true, 'Diagnostic API-log setup failure must not abort the operational SportsOdds sheet');
assert.strictEqual(oddsSetup.warnings.length, 2, 'Both diagnostic log setup failures should be reported as warnings');
const controlledOddsFn = functionSource(admin, 'refreshSportsOddsForLeagueControlled_');
assert(!controlledOddsFn.includes('setupSportsAdminControlSystem()'), 'Controlled odds refresh must not run full Admin setup under the odds path');
assert(controlledOddsFn.includes('sportsAdminPrepareOddsRefresh_()'), 'Controlled odds refresh must use narrow operational preparation');
assert(controlledOddsFn.includes('\"RUNNING\"'), 'Every operational odds attempt must clear stale Last ERROR before provider/usage work starts');
assert(controlledOddsFn.includes('diagnosticWarning: diagnosticLogWarning'), 'Diagnostic logging warnings must be returned separately from operational LastRefreshMessage');
assert(!controlledOddsFn.includes('Diagnostic logging warning (refresh still succeeded)'), 'Diagnostic logging warnings must not be persisted into operational LastRefreshMessage');
assert(controlledOddsFn.indexOf('\"RUNNING\"') < controlledOddsFn.indexOf('refreshSportsOddsForLeagueWithOptions('), 'Operational RUNNING status must replace stale diagnostic errors before the provider request begins');
assert(controlledOddsFn.indexOf('sportsOddsIncrementUsage_(') < controlledOddsFn.indexOf('\"RUNNING\"'), 'Daily usage accounting must run before RUNNING changes LastRefreshDate so prior-day counters reset correctly');

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
const queuedMessageFn = functionSource(adminPage, 'adminRunFullSportsSyncNow');
assert(!queuedMessageFn.includes('Finished-game finalizer ran now'), 'Queued Smart Sync success wording must not claim an inline finalizer ran');
assert(
  queuedMessageFn.includes('Smart Sports Sync queued. Scores, odds, wager settlement, and finalization will run in the background shortly'),
  'Queued Smart Sync success wording must describe background processing'
);
assert(queuedMessageFn.includes('Queueing Smart Sports Sync...'), 'First Smart Sync click must immediately show queue acknowledgement');
assert(queuedMessageFn.includes('requestAnimationFrame'), 'Smart Sync must yield a paint before waiting on Apps Script');
assert(queuedMessageFn.includes('adminSportsHoldActionProgress_'), 'Smart Sync final result must be held near the action button');
assert(queuedMessageFn.includes('15000'), 'Smart Sync final status must remain visible for about 15 seconds');
const holdProgressFn = functionSource(adminPage, 'adminSportsHoldActionProgress_');
assert(holdProgressFn.includes('Math.max(10000'), 'Action-result hold must never be shorter than 10 seconds');
assert.strictEqual(adminSportsProgressLabelTest_(), 'Queueing sync...', 'Smart Sync button progress text must say it is queueing');

function adminSportsProgressLabelTest_() {
  const ctx = runFunctions(adminPage, ['adminSportsActionProgressText_']);
  return ctx.adminSportsActionProgressText_({ textContent: 'Run Smart Sports Sync Now' });
}

// 4) Sports Scores & Game Builder transport must be server-side, not browser JSONP.
assert(!sportsPage.includes('function sportsJsonp('), 'Browser JSONP helper must be removed');
assert(!sportsPage.includes('SPORTS_API_URL'), 'Browser must not call the separate Apps Script project directly');
assert(sportsPage.includes('adminGetSportsEngineScores') && sportsPage.includes('sportsScoresEngineApi_'), 'Sports page must use Awards POST server bridge');
assert(bridge.includes('function apiAdminGetSportsEngineLeagues') && bridge.includes('function apiAdminGetSportsEngineScores') && bridge.includes('function apiAdminGetSportsEngineSnapshots'), 'Server bridge read wrappers are incomplete');
assert(api.includes('action === "adminGetSportsEngineScores"') && api.includes('action === "adminGetSportsEngineSnapshots"'), 'Awards API routes for Sports Engine reads are missing');
const sportsInitFn = functionSource(sportsPage, 'initSportsPage');
assert(sportsInitFn.includes('Promise.all(['), 'Builder must load leagues and scores concurrently');
const sportsScoresLoadFn = functionSource(sportsPage, 'loadSportsScores');
assert(!sportsScoresLoadFn.includes('await loadSportsUsageForScores_()'), 'Builder first paint must not block on Awards usage scan');
assert(sportsScoresLoadFn.indexOf('renderSportsScores(') < sportsScoresLoadFn.indexOf('loadSportsUsageForScores_()'), 'Score cards must render before supplemental usage lookup');

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
const rosterOrderedSummary = {
  header: probableSummary.header,
  rosters: [
    { roster: [{ starter: true, athlete: { id: '41', displayName: 'Home Ordered Starter', position: { abbreviation: 'SP' } } }] },
    { roster: [{ starter: true, athlete: { id: '42', displayName: 'Away Ordered Starter', position: { abbreviation: 'SP' } } }] }
  ]
};
assert.strictEqual(liveCtx.sportsLiveDisplayFindProbable_(rosterOrderedSummary, 'home').name, 'Home Ordered Starter', 'ESPN roster[0] without side metadata must resolve as home');
assert.strictEqual(liveCtx.sportsLiveDisplayFindProbable_(rosterOrderedSummary, 'away').name, 'Away Ordered Starter', 'ESPN roster[1] without side metadata must resolve as away');

// RC13 live follow-up: ESPN's current MLB scoreboard exposes probables on each
// competition competitor. Preserve that data on SportsScores so Builder is not
// dependent on a second summary request for names already present upstream.
const scoreboardProbableCtx = runFunctions(scoresEngine, ['sportsScoreboardProbablePitcherName_']);
const liveScoreboardCompetitorFixture = {
  homeAway: 'away',
  probables: [{
    name: 'probableStartingPitcher',
    displayName: 'Probable Starting Pitcher',
    abbreviation: 'SP',
    playerId: 39825,
    athlete: {
      id: '39825',
      fullName: 'Freddy Peralta',
      displayName: 'Freddy Peralta',
      position: 'SP'
    }
  }]
};
assert.strictEqual(scoreboardProbableCtx.sportsScoreboardProbablePitcherName_(liveScoreboardCompetitorFixture), 'Freddy Peralta', 'Live ESPN scoreboard probableStartingPitcher shape must resolve directly');
const teamNormalizerFn = functionSource(scoresEngine, 'normalizeESPNTeamEvent_');
assert(teamNormalizerFn.includes('HomeProbablePitcher') && teamNormalizerFn.includes('AwayProbablePitcher'), 'SportsScores normalization must preserve scoreboard probable pitcher names');
assert(functionSource(scoresEngine, 'sportsV13ScoresExtraHeaders_').includes('HomeProbablePitcher'), 'SportsScores sheet must persist probable pitcher columns');
const detailLoadFn = functionSource(sportsPage, 'loadSportsGameDetailsForScores_');
assert(detailLoadFn.includes('AwayProbablePitcher') && detailLoadFn.includes('HomeProbablePitcher'), 'Builder should skip supplemental summary calls when scoreboard already supplied both probables');
assert(sportsPage.includes('parser candidates H/A'), 'Admin TBD trace must expose parser candidate counts for live diagnosis');


// 5b) Starting-pitcher summary transport must go through the Sports Engine proxy bridge.
const summaryFetchFn = functionSource(live, 'sportsLiveDisplayFetchEspnSummaries_');
assert(summaryFetchFn.includes('"getSportsMlbSummary"'), 'Awards App pitcher lookup must call the Sports Engine MLB summary endpoint');
assert(!summaryFetchFn.includes('site.api.espn.com'), 'Primary Awards App pitcher lookup must not fetch ESPN directly');
const summaryEngineFn = functionSource(scoresEngine, 'apiGetSportsMlbSummary_');
assert(summaryEngineFn.includes('sportsEspnFetch_('), 'Sports Engine MLB summary endpoint must reuse the authenticated ESPN transport helper');
assert(!summaryEngineFn.includes('UrlFetchApp.fetch('), 'Sports Engine MLB summary endpoint must not bypass its proxy-aware ESPN helper');
assert(scoresEngine.includes('action === "getSportsMlbSummary"'), 'Sports Engine API dispatcher must expose the authenticated MLB summary action');
assert(scoresEngine.includes('ESPNEventId: String(event.id || "")'), 'Sports score rows must preserve the raw ESPN event ID used by summary?event=');
assert(espnProxy.includes('WEB_API_HOST = "site.web.api.espn.com"'), 'Cloudflare proxy must define the MLB summary web-API fallback host');
assert(espnProxy.includes('function mlbSummaryWebFallbackUrl'), 'Cloudflare proxy must have a narrow MLB summary fallback');
assert(espnProxy.includes('target.pathname !== "/apis/site/v2/sports/baseball/mlb/summary"'), 'MLB summary fallback must be endpoint-scoped');
assert(espnProxy.includes('x-awards-sports-fallback-from-status'), 'Proxy must expose safe fallback trace status');

let summaryFetchUrl = '';
const safeToken = 'SPORTS-SECRET-TOKEN-DO-NOT-RETURN-1234567890';
const summaryEngineCtx = runFunctions(scoresEngine, [
  'sportsEspnPublicErrorMessage_',
  'sportsEspnResponseHeader_',
  'sportsEspnResponseTrace_',
  'apiGetSportsMlbSummary_'
], {
  assertSportsAdmin_: () => true,
  sportsEspnProxyBaseUrl_: () => 'https://example.pages.dev/api/espn-proxy',
  sportsEspnProxyToken_: () => safeToken,
  sportsEspnFetch_: (url) => {
    summaryFetchUrl = url;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ header: { competitions: [] } }),
      getHeaders: () => ({ 'x-awards-sports-source': 'site.web.api.espn.com', 'x-upstream-status': '200', 'x-awards-sports-fallback-from-status': '403' })
    };
  }
});
const summaryTransport = summaryEngineCtx.apiGetSportsMlbSummary_({ espnEventId: '401234567' });
assert(summaryFetchUrl.includes('/baseball/mlb/summary?event=401234567'), 'Sports Engine must request the ESPN MLB summary for the requested event');
assert.strictEqual(summaryTransport.success, true);
assert.strictEqual(summaryTransport.transport, 'espn-proxy');
assert.strictEqual(summaryTransport.transportStatus, 'ok');
assert.strictEqual(summaryTransport.proxySource, 'site.web.api.espn.com', 'Sports Engine must return the actual proxy source');
assert.strictEqual(summaryTransport.proxyFallbackFromStatus, '403', 'Sports Engine must expose safe proxy fallback status');
assert(!JSON.stringify(summaryTransport).includes(safeToken), 'Sports Engine summary success payload must never expose the proxy token');

const summaryFailureCtx = runFunctions(scoresEngine, [
  'sportsEspnPublicErrorMessage_',
  'sportsEspnResponseHeader_',
  'sportsEspnResponseTrace_',
  'apiGetSportsMlbSummary_'
], {
  assertSportsAdmin_: () => true,
  sportsEspnProxyBaseUrl_: () => 'https://example.pages.dev/api/espn-proxy',
  sportsEspnProxyToken_: () => safeToken,
  sportsEspnFetch_: () => {
    throw new Error('proxy request failed ' + safeToken + ' x-awards-sports-token=' + safeToken);
  }
});
const summaryTransportFailure = summaryFailureCtx.apiGetSportsMlbSummary_({ espnEventId: '401234567' });
assert.strictEqual(summaryTransportFailure.success, false);
assert.strictEqual(summaryTransportFailure.transportError, true);
assert.strictEqual(summaryTransportFailure.transportStatus, 'error');
assert(!JSON.stringify(summaryTransportFailure).includes(safeToken), 'Sports Engine summary errors must redact proxy secrets/tokens');
assert(JSON.stringify(summaryTransportFailure).includes('[redacted]'), 'Sports Engine summary errors should explicitly redact sensitive token material');

const pitcherStatusCtx = runFunctions(live, [
  'sportsLiveDisplaySummarySuccess_',
  'sportsLiveDisplaySummaryFailure_'
], {
  sportsLiveDisplayParseGameSummary_: () => ({
    espnEventId: '401234567',
    homeStarter: null,
    awayStarter: null,
    startersAvailable: false,
    summaryRecognized: true
  }),
  sportsLiveDisplayString_: (v) => v == null ? '' : String(v).trim(),
  sportsLiveDisplayNumber_: (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback
});
const legitimateTbd = pitcherStatusCtx.sportsLiveDisplaySummarySuccess_('401234567', {}, 'espn-proxy');
assert.strictEqual(legitimateTbd.transportStatus, 'ok');
assert.strictEqual(legitimateTbd.pitcherStatus, 'upstream-tbd', 'Successful ESPN summary with no pitcher must be a legitimate upstream TBD');
const visibleTransportFailure = pitcherStatusCtx.sportsLiveDisplaySummaryFailure_('401234567', 'ESPN HTTP 403', 'espn-proxy', 403);
assert.strictEqual(visibleTransportFailure.transportStatus, 'error');
assert.strictEqual(visibleTransportFailure.pitcherStatus, 'transport-error', 'Transport failure must not collapse into upstream TBD');
assert.strictEqual(visibleTransportFailure.httpStatus, 403);

assert(sportsPage.includes('Pitcher lookup transport error'), 'Admin Sports Builder must display pitcher transport failures');
assert(sportsPage.includes('Pitcher lookup parser error'), 'Admin Sports Builder must distinguish parser/schema failure from upstream TBD');
assert(sportsPage.includes('has no ESPN event ID'), 'MLB rows missing an ESPN event ID must show lookup failure instead of plain TBD');
assert(sportsPage.includes('Event ${escapeSportsHtml(String(game.ESPNEventId'), 'Admin pitcher status must expose the event ID used for summary lookup');
assert(sportsPage.includes('not an upstream TBD'), 'Admin Sports Builder must distinguish transport failures from genuine TBD');
assert(sportsPage.includes('ESPN summary loaded; probable pitchers are not available upstream yet.'), 'Admin Sports Builder must label genuine upstream TBD separately');
const engineSummaryParserFn = functionSource(live, 'sportsLiveDisplayEngineSummaryResponse_');
assert(engineSummaryParserFn.includes('Unknown action:'), 'Direct ESPN fallback must be limited to rolling deployment compatibility when the Sports Engine action is unavailable');

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
  'getBetResolution_', 'buildUserBettingSummary_', 'getUserBettingSummary'
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
