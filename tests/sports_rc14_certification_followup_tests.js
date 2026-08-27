const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const scoresSource = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');
const adminSource = read('external-engines/sports-scoring-engine/src/SportsAdminControls.js');
const oddsSource = read('external-engines/sports-scoring-engine/src/SportsOddsEngine.js');
const bridgeSource = read('backend/engines/SportsAdminBridgeEngine.js');
const sportsPage = read('frontend/js/sports.js');
const adminPage = read('frontend/js/pages/admin.js');

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
  const sandbox = Object.assign({ console, Date, Math, Number, String, Array, Object, JSON, URL }, context);
  vm.createContext(sandbox);
  names.forEach((name) => vm.runInContext(functionSource(source, name), sandbox));
  return sandbox;
}

// ---------------------------------------------------------------------------
// 1) MLB probable pitcher: ESPN competitor -> SportsScores -> filtered API.
// Fixture matches the live ESPN MLB scoreboard shape: competitor.probables[]
// with name=probableStartingPitcher and athlete full/display name.
// ---------------------------------------------------------------------------
const pitcherExtractCtx = runFunctions(scoresSource, ['sportsScoreboardProbablePitcherName_']);
const awayCompetitor = {
  homeAway: 'away',
  team: { id: '8', displayName: 'Milwaukee Brewers' },
  probables: [{
    name: 'probableStartingPitcher',
    displayName: 'Probable Starting Pitcher',
    abbreviation: 'SP',
    playerId: 4683375,
    athlete: {
      id: '4683375',
      fullName: 'Kyle Harrison',
      displayName: 'Kyle Harrison',
      shortName: 'K. Harrison',
      position: 'SP',
      team: { id: '8' }
    }
  }]
};
const homeCompetitor = {
  homeAway: 'home',
  team: { id: '21', displayName: 'New York Mets' },
  probables: [{
    name: 'probableStartingPitcher',
    displayName: 'Probable Starting Pitcher',
    abbreviation: 'SP',
    playerId: 999001,
    athlete: {
      id: '999001',
      fullName: 'Production Fixture Home Starter',
      displayName: 'Production Fixture Home Starter',
      shortName: 'P. Starter',
      position: 'SP',
      team: { id: '21' }
    }
  }]
};
const awayPitcher = pitcherExtractCtx.sportsScoreboardProbablePitcherName_(awayCompetitor);
const homePitcher = pitcherExtractCtx.sportsScoreboardProbablePitcherName_(homeCompetitor);
assert.strictEqual(awayPitcher, 'Kyle Harrison');
assert.strictEqual(homePitcher, 'Production Fixture Home Starter');
assert(functionSource(scoresSource, 'normalizeESPNTeamEvent_').includes('sportsScoreboardProbablePitcherName_(home)'), 'MLB normalizer must use scoreboard probable extraction');
assert(functionSource(scoresSource, 'normalizeESPNTeamEvent_').includes('sportsScoreboardProbablePitcherName_(away)'), 'MLB normalizer must use scoreboard probable extraction for away side');

const headers = [
  'GameId','ESPNEventId','Sport','League','Status','State','Period','Clock',
  'HomeTeam','AwayTeam','HomeScore','AwayScore','Winner','Completed','LastUpdated',
  'GameDateTime','HomeProbablePitcher','AwayProbablePitcher'
];
const rows = [headers.slice()];

function makeRange(row, col, numRows, numCols) {
  return {
    getValues() {
      const out = [];
      for (let r = 0; r < numRows; r++) {
        const line = [];
        for (let c = 0; c < numCols; c++) {
          line.push((rows[row - 1 + r] || [])[col - 1 + c]);
        }
        out.push(line);
      }
      return out;
    },
    setValues(values) {
      for (let r = 0; r < values.length; r++) {
        while (rows.length < row + r) rows.push([]);
        for (let c = 0; c < values[r].length; c++) {
          rows[row - 1 + r][col - 1 + c] = values[r][c];
        }
      }
      return this;
    },
    setValue(value) {
      while (rows.length < row) rows.push([]);
      rows[row - 1][col - 1] = value;
      return this;
    }
  };
}

const sheet = {
  getLastColumn: () => headers.length,
  getLastRow: () => rows.length,
  getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
  getRange: (row, col, numRows = 1, numCols = 1) => makeRange(row, col, numRows, numCols),
  appendRow: (row) => rows.push(row.slice())
};
const SpreadsheetApp = {
  getActive: () => ({ getSheetByName: (name) => name === 'SportsScores' ? sheet : null })
};
const SPORTS_SHEETS = { SCORES: 'SportsScores', GAMES: 'SportsGames' };
const SPORTS_HEADERS = { SportsScores: headers.slice(0, 15) };
const getSportsHeaderMap_ = (hs) => Object.fromEntries(hs.map((h, i) => [String(h || '').trim(), i]));
const sportsRowToObject_ = (hs, row) => Object.fromEntries(hs.map((h, i) => [h, row[i]]));
const normalizeSportsScoreValue_ = (v) => v === '' || v == null ? '' : (Number.isNaN(Number(v)) ? v : Number(v));
const normalizeSportsBoolean_ = (v) => v === true || String(v).toLowerCase() === 'true';
const commonScoreContext = {
  SpreadsheetApp,
  SPORTS_SHEETS,
  SPORTS_HEADERS,
  sportsV13ScoresExtraHeaders_: () => headers.slice(15),
  sportsV13GamesHeaders_: () => ['GameId'],
  sportsV13EnsureSheetHeaders_: () => ({ sheet, added: [] }),
  applySportsRecordTextFormats_: () => {},
  getSportsHeaderMap_,
  cleanSportsRecordValue_: (v) => v == null ? '' : v,
  cleanSportsClockDisplayValue_: (v) => v == null ? '' : v,
  upsertSportsGamesFromScores_: () => ({ success: true }),
  sportsRowToObject_,
  normalizeSportsScoreValue_,
  normalizeSportsBoolean_
};
const scoreCtx = runFunctions(scoresSource, ['upsertLatestSportsScores_', 'readSportsScoresRows_'], commonScoreContext);
const game = {
  GameId: 'mlb_401999999', ESPNEventId: '401999999', Sport: 'baseball', League: 'mlb',
  Status: 'STATUS_SCHEDULED', State: 'pre', Period: 0, Clock: '',
  HomeTeam: 'New York Mets', AwayTeam: 'Milwaukee Brewers', HomeScore: 0, AwayScore: 0,
  Winner: '', Completed: false, LastUpdated: new Date('2026-08-26T20:00:00Z'),
  GameDateTime: '2026-08-26T23:10:00Z', HomeProbablePitcher: homePitcher, AwayProbablePitcher: awayPitcher
};
scoreCtx.upsertLatestSportsScores_([game]);
let stored = scoreCtx.readSportsScoresRows_();
assert.strictEqual(stored.length, 1);
assert.strictEqual(stored[0].HomeProbablePitcher, homePitcher, 'SportsScores write/read must retain home probable pitcher');
assert.strictEqual(stored[0].AwayProbablePitcher, awayPitcher, 'SportsScores write/read must retain away probable pitcher');
assert.strictEqual(stored[0].PitcherPersistenceStatus, 'stored', 'Read API must report stored pitcher persistence state');

// Production failure mode: a later schedule/score payload for the same event can
// omit probables. It must not erase names already learned from a richer response.
scoreCtx.upsertLatestSportsScores_([{ ...game, HomeProbablePitcher: '', AwayProbablePitcher: '', LastUpdated: new Date('2026-08-26T20:05:00Z') }]);
stored = scoreCtx.readSportsScoresRows_();
assert.strictEqual(stored[0].HomeProbablePitcher, homePitcher, 'Later partial score writes must not blank stored home probable pitcher');
assert.strictEqual(stored[0].AwayProbablePitcher, awayPitcher, 'Later partial score writes must not blank stored away probable pitcher');

const apiCtx = runFunctions(scoresSource, ['apiGetSportsScores_'], {
  readSportsScoresRows_: () => stored,
  normalizeSportsApiDate_: (v) => String(v || '').trim(),
  getSportsScoreDateOnly_: (v) => String(v || '').slice(0, 10),
  normalizeSportsBoolean_
});
const filtered = apiCtx.apiGetSportsScores_({ league: 'mlb', espnEventId: '401999999' });
assert.strictEqual(filtered.scores.length, 1);
assert.strictEqual(filtered.scores[0].HomeProbablePitcher, homePitcher, 'Filtered Sports Engine response must preserve home probable pitcher');
assert.strictEqual(filtered.scores[0].AwayProbablePitcher, awayPitcher, 'Filtered Sports Engine response must preserve away probable pitcher');
assert.strictEqual(filtered.scores[0].PitcherPersistenceStatus, 'stored');

const bridgeCtx = runFunctions(bridgeSource, ['apiAdminGetSportsEngineScores'], {
  sportsAdminBridgeRequireAdmin_: () => true,
  sportsAdminBridgeCall_: (action, params) => ({ ...filtered, bridgeAction: action, bridgeParams: params })
});
const bridged = bridgeCtx.apiAdminGetSportsEngineScores({ username: 'admin', token: 'x', league: 'mlb', espnEventId: '401999999' });
assert.strictEqual(bridged.bridgeAction, 'getSportsScores');
assert.strictEqual(bridged.scores[0].HomeProbablePitcher, homePitcher, 'Awards bridge must not strip probable pitcher fields');
assert.strictEqual(bridged.scores[0].AwayProbablePitcher, awayPitcher, 'Awards bridge must not strip probable pitcher fields');
assert(functionSource(sportsPage, 'sportsStarterFallback_').includes('game[prefix + "ProbablePitcher"]'), 'Builder must read Home/AwayProbablePitcher returned by Sports Engine');
assert(sportsPage.includes('SportsScores " + escapeSportsHtml(persistenceStatus)'), 'Admin pitcher diagnostics must surface SportsScores persistence stage/status');

// ---------------------------------------------------------------------------
// 2) Odds operational status: old ERROR -> RUNNING -> successful provider save
// -> OK. Diagnostic log warning remains separate and cannot preserve old error.
// No real provider request is made.
// ---------------------------------------------------------------------------
const operational = {
  status: 'ERROR',
  message: 'Odds API HTTP 422: INVALID_COMMENCE_TIME_FROM: stale error'
};
const transitions = [];
const controlledCtx = runFunctions(adminSource, ['refreshSportsOddsForLeagueControlled_'], {
  sportsAdminString_: (v) => v == null ? '' : String(v).trim(),
  sportsAdminPrepareOddsRefresh_: () => true,
  getSportsOddsSettingForLeague_: () => ({
    League: 'MLB', OddsEnabled: true, AutoRefreshEnabled: true, ManualRefreshEnabled: true,
    StopAtMonthlyCalls: 450, CallsThisMonth: 33, MonthlyBudget: 100, CallsToday: 1,
    MaxRefreshesPerDay: 5, DefaultMarkets: 'h2h', DefaultRegions: 'us', OddsWindow: 'STANDARD'
  }),
  sportsAdminGetLeagueControlState_: () => ({ enabled: true, seasonActive: true }),
  sportsOddsGetMonthlyUsageRow_: () => ({ totalCallsUsed: 33, hardCap: 500 }),
  sportsOddsLeagueToSportKey_: () => 'baseball_mlb',
  sportsOddsEstimateRequestCost_: () => 1,
  sportsOddsIncrementUsage_: () => ({ month: '2026-08', totalCallsUsed: 34, warnAt: 400, hardCap: 500 }),
  updateSportsOddsRefreshStatus_: (league, status, message) => {
    operational.status = status;
    operational.message = message || '';
    transitions.push({ league, status, message: message || '' });
  },
  refreshSportsOddsForLeagueWithOptions: () => ({
    success: true,
    usable: 13,
    inserted: 13,
    updated: 0,
    apiUsage: {
      requestsRemaining: '476',
      logWarning: 'Could not lock script while setting up sheet: SportsOddsApiLog'
    }
  }),
  sportsOddsUpdateLastApiUsage_: () => true,
  sportsAdminOddsWindowDays_: () => 14
});
const refreshed = controlledCtx.refreshSportsOddsForLeagueControlled_('MLB', 'manual');
assert.strictEqual(refreshed.success, true);
assert.deepStrictEqual(transitions.map((t) => t.status), ['RUNNING', 'OK'], 'Successful operational attempt must replace stale ERROR with RUNNING then OK');
assert.strictEqual(operational.status, 'OK', 'Current operational status must end successful');
assert.strictEqual(operational.message, 'Refresh complete. Usable odds rows: 13', 'Previous provider error must be cleared/replaced after success');
assert(!operational.message.includes('422'), 'Stale provider HTTP error must not survive a successful refresh');
assert(refreshed.diagnosticWarning.includes('SportsOddsApiLog'), 'Diagnostic log warning must remain separate from operational status');

// The dashboard deliberately stays open after a paid provider call, so the
// frontend must replace its already-rendered Last ERROR without forcing the
// expensive full Controls dashboard reload.
const staleOddsDisplay = 'ERROR: Odds API HTTP 422: INVALID_COMMENCE_TIME_FROM';
const lastOddsNodes = [
  { role: 'odds-subsection', textContent: staleOddsDisplay },
  { role: 'league-card', textContent: staleOddsDisplay },
  { role: 'odds-controls-card', textContent: staleOddsDisplay }
];
const uiCtx = runFunctions(adminPage, ['adminSportsSetOddsLastStatus_'], {
  adminSportsKey_: (v) => String(v || '').trim().toLowerCase(),
  document: {
    querySelectorAll: (selector) => selector === '[data-sports-odds-last="mlb"]' ? lastOddsNodes : []
  }
});
uiCtx.adminSportsSetOddsLastStatus_('MLB', 'OK', 'Refresh complete. Usable odds rows: 13');
lastOddsNodes.forEach((node) => {
  assert.strictEqual(
    node.textContent,
    'OK: Refresh complete. Usable odds rows: 13',
    node.role + ' must immediately replace the stale HTTP 422 Last ERROR after success'
  );
});
const refreshUiFn = functionSource(adminPage, 'adminRefreshSportsOddsLeague');
assert(refreshUiFn.includes('adminSportsSetOddsLastStatus_'), 'Odds refresh action must update the displayed operational status without full dashboard reload');
assert(functionSource(adminPage, 'adminSportsSetOddsLastStatus_').includes('querySelectorAll'), 'Shared Odds status updater must target every currently rendered Last-Odds node');
assert((adminPage.match(/data-sports-odds-last=/g) || []).length >= 3, 'Odds subsection, league card, and Odds Controls card must share the Last-Odds data attribute');

// Preserve the already-certified timestamp and quota protections.
const utcCtx = runFunctions(oddsSource, ['sportsOddsUtcTimestamp_']);
assert.strictEqual(utcCtx.sportsOddsUtcTimestamp_('2026-08-26T21:17:34.987Z'), '2026-08-26T21:17:34Z');
const controlledFnSource = functionSource(adminSource, 'refreshSportsOddsForLeagueControlled_');
assert(controlledFnSource.includes('setting.CallsToday >=') && controlledFnSource.includes('setting.MaxRefreshesPerDay'), '5/day protection path must remain present');
assert(controlledFnSource.includes('setting.CallsThisMonth >=') && controlledFnSource.includes('setting.MonthlyBudget'), '100/month protection path must remain present');
assert(controlledFnSource.includes('sportsOddsIncrementUsage_('), 'API accounting must remain before provider fetch');
assert(controlledFnSource.includes('diagnosticWarning: diagnosticLogWarning'), 'Diagnostic SportsOddsApiLog warning must remain nonfatal/separate');

console.log('sports-rc14-certification-followup-tests: PASS');
