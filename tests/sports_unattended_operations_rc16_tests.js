const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const scoresSource = read('external-engines/sports-scoring-engine/src/SportsScoresEngine.js');
const sportsAdminSource = read('external-engines/sports-scoring-engine/src/SportsAdminControls.js');
const wagerSource = read('backend/engines/SportsWagerEngine.js');
const adminPage = read('frontend/js/pages/admin.js');

function functionSource(source, name, which = 'first') {
  const marker = `function ${name}(`;
  const starts = [];
  let from = 0;
  while (true) {
    const start = source.indexOf(marker, from);
    if (start < 0) break;
    starts.push(start);
    from = start + marker.length;
  }
  if (!starts.length) throw new Error(`Missing function ${name}`);
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

function runFunctions(source, names, context = {}) {
  const sandbox = Object.assign({
    console, Date, Math, Number, String, Array, Object, JSON, RegExp,
    isNaN, isFinite
  }, context);
  vm.createContext(sandbox);
  names.forEach((spec) => {
    const name = typeof spec === 'string' ? spec : spec.name;
    const which = typeof spec === 'string' ? 'first' : (spec.which || 'first');
    vm.runInContext(functionSource(source, name, which), sandbox);
  });
  return sandbox;
}

function trigger(handler) {
  return {
    getHandlerFunction: () => handler,
    getEventType: () => 'CLOCK',
    getTriggerSource: () => 'CLOCK'
  };
}

// ---------------------------------------------------------------------------
// 1) Canonical Sports Engine topology = exactly one of all six data handlers.
// Duplicates are unhealthy, but a complete topology with a duplicate is not
// mislabeled "partial". A missing handler is partial.
// ---------------------------------------------------------------------------
const ENGINE = {
  scores: 'runSportsScoresUpdate',
  window: 'runSportsScoresWindowUpdate',
  reconcile: 'runSportsScheduleReconcileUpdate',
  season: 'runSportsSeasonBatchUpdate',
  odds: 'runSportsOddsHybridRefresh',
  archive: 'runSportsArchiveUpdate'
};
const engineCtx = runFunctions(scoresSource, ['sportsSmartAutomationStatusFromTriggers_'], {
  SPORTS_TRIGGER_FUNCTION: ENGINE.scores,
  sportsScoresWindowTriggerFunction_: () => ENGINE.window,
  SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION: ENGINE.reconcile,
  SPORTS_SEASON_BATCH_TRIGGER_FUNCTION: ENGINE.season,
  SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION: ENGINE.odds,
  SPORTS_ARCHIVE_TRIGGER_FUNCTION: ENGINE.archive
});
const canonicalEngineTriggers = Object.values(ENGINE).map(trigger);
const healthyEngine = engineCtx.sportsSmartAutomationStatusFromTriggers_(canonicalEngineTriggers);
assert.strictEqual(healthyEngine.enabled, true);
assert.strictEqual(healthyEngine.fullyEnabled, true);
assert.strictEqual(healthyEngine.healthy, true);
assert.strictEqual(healthyEngine.partiallyEnabled, false);
assert.strictEqual(healthyEngine.hasDuplicates, false);
assert.strictEqual(healthyEngine.topology, 'SPORTS_ENGINE_DATA_AUTOMATION');

const duplicateEngine = engineCtx.sportsSmartAutomationStatusFromTriggers_(canonicalEngineTriggers.concat(trigger(ENGINE.scores)));
assert.strictEqual(duplicateEngine.enabled, true, 'all six handlers are still present');
assert.strictEqual(duplicateEngine.healthy, false, 'duplicate recurring handler must be unhealthy');
assert.strictEqual(duplicateEngine.hasDuplicates, true);
assert.strictEqual(duplicateEngine.partiallyEnabled, false, 'complete topology with duplicate must not be mislabeled partial');
assert.strictEqual(duplicateEngine.duplicateHandlers[0].key, 'scoreUpdater');
assert.strictEqual(duplicateEngine.duplicateHandlers[0].count, 2);

const missingEngine = engineCtx.sportsSmartAutomationStatusFromTriggers_(canonicalEngineTriggers.filter((t) => t.getHandlerFunction() !== ENGINE.archive));
assert.strictEqual(missingEngine.enabled, false);
assert.strictEqual(missingEngine.healthy, false);
assert.strictEqual(missingEngine.partiallyEnabled, true);
assert(missingEngine.missingHandlers.includes('archiveUpdater'));

// Lightweight dashboard must use the same canonical semantics.
const dashboardCtx = runFunctions(sportsAdminSource, ['sportsAdminDashboardTriggerRows_', 'sportsAdminDashboardAutomationStatus_'], {
  SPORTS_TRIGGER_FUNCTION: ENGINE.scores,
  sportsScoresWindowTriggerFunction_: () => ENGINE.window,
  SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION: ENGINE.reconcile,
  SPORTS_SEASON_BATCH_TRIGGER_FUNCTION: ENGINE.season,
  SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION: ENGINE.odds,
  SPORTS_ARCHIVE_TRIGGER_FUNCTION: ENGINE.archive,
  sportsSmartAutomationStatusFromTriggers_: engineCtx.sportsSmartAutomationStatusFromTriggers_
});
const dashboardHealthy = dashboardCtx.sportsAdminDashboardAutomationStatus_(canonicalEngineTriggers);
assert.strictEqual(dashboardHealthy.healthy, true);
assert.strictEqual(dashboardHealthy.partiallyEnabled, false);
const dashboardDuplicate = dashboardCtx.sportsAdminDashboardAutomationStatus_(canonicalEngineTriggers.concat(trigger(ENGINE.odds)));
assert.strictEqual(dashboardDuplicate.healthy, false);
assert.strictEqual(dashboardDuplicate.hasDuplicates, true);
assert.strictEqual(dashboardDuplicate.partiallyEnabled, false);

// ---------------------------------------------------------------------------
// 2) Awards App owns exactly one wager-settlement trigger and no sports-data
// orchestration. Duplicate/legacy Awards handlers are explicitly unhealthy.
// ---------------------------------------------------------------------------
const WAGER = {
  smart: 'runSportsWagerSmartAutomation',
  queued: 'runSportsWagerSmartAutomationQueued',
  oldSettle: 'runSportsWagerAutoSettle',
  oldScore: 'runSportsWagerScoreRefresh'
};
function wagerStatusFor(triggers) {
  return runFunctions(wagerSource, ['checkSportsWagerSmartAutomationStatus'], {
    ScriptApp: { getProjectTriggers: () => triggers },
    SPORTS_WAGER_SMART_TRIGGER_FUNCTION: WAGER.smart,
    SPORTS_WAGER_SMART_QUEUED_FUNCTION: WAGER.queued,
    SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION: WAGER.oldSettle,
    SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION: WAGER.oldScore
  }).checkSportsWagerSmartAutomationStatus();
}
const wagerHealthy = wagerStatusFor([trigger(WAGER.smart)]);
assert.strictEqual(wagerHealthy.role, 'WAGER_SETTLEMENT_ONLY');
assert.strictEqual(wagerHealthy.enabled, true);
assert.strictEqual(wagerHealthy.healthy, true);
assert.strictEqual(wagerHealthy.partiallyEnabled, false);
assert.strictEqual(wagerHealthy.hasDuplicates, false);

const wagerDuplicate = wagerStatusFor([trigger(WAGER.smart), trigger(WAGER.smart)]);
assert.strictEqual(wagerDuplicate.healthy, false);
assert.strictEqual(wagerDuplicate.hasDuplicates, true);
assert.strictEqual(wagerDuplicate.partiallyEnabled, false);

const wagerLegacy = wagerStatusFor([trigger(WAGER.smart), trigger(WAGER.oldScore)]);
assert.strictEqual(wagerLegacy.healthy, false);
assert.strictEqual(wagerLegacy.legacyConflicts.length, 1);

const installSource = functionSource(wagerSource, 'installSportsWagerSmartAutomationTrigger');
assert(!installSource.includes('removeSportsScoresWindowTriggerAdmin'), 'Awards installer must not remove Engine score-window trigger');
assert(!installSource.includes('removeSportsOddsHybridTrigger'), 'Awards installer must not remove Engine Odds trigger');
assert(installSource.includes('removeSportsWagerAutoSettleTriggers'));
assert(installSource.includes('removeSportsWagerScoreRefreshTriggers'));

const smartRunSource = functionSource(wagerSource, 'runSportsWagerSmartAutomation');
[
  'sportsWagerSmartRefreshScoresEngine_(',
  'sportsWagerSmartRefreshOddsEngine_(',
  'sportsPlayerPropRefreshStatsForLeagues_('
].forEach((needle) => {
  assert(!smartRunSource.includes(needle), `Awards settlement automation must not call ${needle}`);
});
assert(smartRunSource.includes('refreshEngineFirst: false'), 'settlement transport must use cached Engine scores');
assert(smartRunSource.includes('refreshOddsIfStale: false'), 'settlement must not trigger paid odds refresh');
assert(smartRunSource.includes('refreshOddsEngineFirst: false'), 'settlement must not trigger paid odds refresh first');
assert(smartRunSource.includes('owner: "Sports Engine"'));

// ---------------------------------------------------------------------------
// 3) Per-league monthly Odds rollover. UsageMonth is normalized before the
// monthly provider gate and December -> January is covered explicitly.
// ---------------------------------------------------------------------------
assert(sportsAdminSource.includes('"UsageMonth"'), 'SportsOddsSettings must carry a usage month');

const oddsHeaders = [
  'League','SportKey','OddsEnabled','AutoRefreshEnabled','ManualRefreshEnabled',
  'MaxRefreshesPerDay','MonthlyBudget','StopAtMonthlyCalls','DefaultMarkets',
  'DefaultRegions','OddsWindow','EstimatedCostPerRefresh','CallsToday',
  'CallsThisMonth','UsageMonth','LastRefreshDate','LastRefreshAt',
  'LastRefreshStatus','LastRefreshMessage','LastApiCost','LastApiRemaining',
  'UpdatedAt','Notes'
];

function headerMap(headers) {
  const out = {};
  headers.forEach((h, i) => { out[String(h || '').trim()] = i; });
  return out;
}
function rowObject(headers, row) {
  const out = {};
  headers.forEach((h, i) => { out[h] = row[i]; });
  return out;
}
function normalizeDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  const m = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}
function makeOddsSheet(row) {
  const rows = [oddsHeaders.slice(), row.slice()];
  const writes = [];
  return {
    rows,
    writes,
    getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
    getRange: (r, c) => ({
      setValue(value) {
        while (rows.length < r) rows.push([]);
        rows[r - 1][c - 1] = value;
        writes.push({ row: r, col: c, value });
        return this;
      }
    })
  };
}
function oddsRow(overrides = {}) {
  const obj = Object.assign({
    League: 'MLB', SportKey: 'baseball_mlb', OddsEnabled: true,
    AutoRefreshEnabled: true, ManualRefreshEnabled: true,
    MaxRefreshesPerDay: 5, MonthlyBudget: 100, StopAtMonthlyCalls: 450,
    DefaultMarkets: 'h2h', DefaultRegions: 'us', OddsWindow: 'STANDARD',
    EstimatedCostPerRefresh: 1, CallsToday: 2, CallsThisMonth: 99,
    UsageMonth: '2026-08', LastRefreshDate: '2026-08-31', LastRefreshAt: '',
    LastRefreshStatus: 'OK', LastRefreshMessage: '', LastApiCost: 1,
    LastApiRemaining: 400, UpdatedAt: '', Notes: ''
  }, overrides);
  return oddsHeaders.map((h) => obj[h] === undefined ? '' : obj[h]);
}
function makeOddsContext(sheet, month, today) {
  return {
    SPORTS_ODDS_SETTINGS_SHEET: 'SportsOddsSettings',
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => sheet }) },
    sportsAdminString_: (v) => v == null ? '' : String(v).trim(),
    sportsAdminHeaderMap_: headerMap,
    sportsAdminRowObject_: rowObject,
    sportsAdminBoolean_: (v, fallback) => v === '' || v == null ? fallback : (v === true || String(v).toLowerCase() === 'true'),
    sportsAdminNumber_: (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback,
    sportsAdminNormalizeOddsWindow_: (v) => String(v || 'STANDARD').toUpperCase(),
    normalizeSportsDateOnly_: normalizeDateOnly,
    sportsAdminToday_: () => today,
    sportsAdminMonthKey_: () => month,
    sportsAdminMonthKeyFromDate_: (v) => {
      const d = normalizeDateOnly(v);
      return d ? d.slice(0, 7) : '';
    }
  };
}

function readOddsAtMonth(overrides, month, today) {
  const sheet = makeOddsSheet(oddsRow(overrides));
  const ctx = runFunctions(sportsAdminSource, ['readSportsOddsAdminSettings_'], makeOddsContext(sheet, month, today));
  const settings = ctx.readSportsOddsAdminSettings_({ skipSetup: true });
  return { sheet, settings };
}

let rollover = readOddsAtMonth({ UsageMonth: '2026-08', CallsThisMonth: 99, LastRefreshDate: '2026-08-31' }, '2026-09', '2026-09-01');
assert.strictEqual(rollover.settings[0].CallsThisMonth, 0, 'Sep must reset Aug league month usage before gating');
assert.strictEqual(rollover.settings[0].UsageMonth, '2026-09');
assert.strictEqual(rollover.sheet.rows[1][oddsHeaders.indexOf('CallsThisMonth')], 0);
assert.strictEqual(rollover.sheet.rows[1][oddsHeaders.indexOf('UsageMonth')], '2026-09');

rollover = readOddsAtMonth({ UsageMonth: '2026-12', CallsThisMonth: 100, LastRefreshDate: '2026-12-31' }, '2027-01', '2027-01-01');
assert.strictEqual(rollover.settings[0].CallsThisMonth, 0, 'Dec -> Jan must reset league monthly usage');
assert.strictEqual(rollover.settings[0].UsageMonth, '2027-01');

rollover = readOddsAtMonth({ UsageMonth: '', CallsThisMonth: 36, LastRefreshDate: '2026-08-28' }, '2026-08', '2026-08-28');
assert.strictEqual(rollover.settings[0].CallsThisMonth, 36, 'migration in same month must preserve the existing count');
assert.strictEqual(rollover.settings[0].UsageMonth, '2026-08');
assert.strictEqual(rollover.sheet.rows[1][oddsHeaders.indexOf('UsageMonth')], '2026-08');

// Increment itself must also be month-safe if called after Dec -> Jan.
const incrementSheet = makeOddsSheet(oddsRow({ UsageMonth: '2026-12', CallsThisMonth: 100, CallsToday: 5, LastRefreshDate: '2026-12-31' }));
const incrementCtx = runFunctions(sportsAdminSource, ['incrementSportsOddsLeagueUsage_'], makeOddsContext(incrementSheet, '2027-01', '2027-01-01'));
incrementCtx.incrementSportsOddsLeagueUsage_('MLB', 1);
assert.strictEqual(incrementSheet.rows[1][oddsHeaders.indexOf('CallsThisMonth')], 1, 'first Jan call must be 1, not stale Dec + 1');
assert.strictEqual(incrementSheet.rows[1][oddsHeaders.indexOf('UsageMonth')], '2027-01');
assert.strictEqual(incrementSheet.rows[1][oddsHeaders.indexOf('CallsToday')], 1);

const refreshSource = functionSource(sportsAdminSource, 'refreshSportsOddsForLeagueControlled_');
const settingReadIndex = refreshSource.indexOf('getSportsOddsSettingForLeague_');
const monthlyGateIndex = refreshSource.indexOf('setting.CallsThisMonth');
assert(settingReadIndex >= 0 && monthlyGateIndex > settingReadIndex,
  'month-normalized league setting must be read before the monthly provider gate');
assert(refreshSource.includes('refreshedSetting.CallsThisMonth'), 'display must use the same persisted current-month counter after refresh');

// ---------------------------------------------------------------------------
// 4) Ended/inactive seasons do not run window or schedule-reconcile polling.
// ---------------------------------------------------------------------------
function makeLock() {
  return { tryLock: () => true, releaseLock: () => {} };
}
function seasonRuntimeContext(fetchedLeagues) {
  return {
    LockService: { getScriptLock: makeLock },
    setupSportsScoresSheet: () => {},
    readEnabledSportsSettings_: () => [
      { League: 'MLB', Sport: 'baseball', SeasonActive: true, SeasonYear: 2026 },
      { League: 'NFL', Sport: 'football', SeasonActive: false, SeasonYear: 2025 }
    ],
    readLatestSportsScoresMap_: () => ({}),
    buildSportsDateStrings_: () => ['2026-08-28'],
    fetchAndNormalizeESPNScoreboardFromSetting_: (setting) => {
      fetchedLeagues.push(setting.League);
      return [];
    },
    detectAndSaveSportsSnapshots_: () => {},
    upsertLatestSportsScores_: () => {},
    logSports_: () => {}
  };
}
let fetched = [];
let seasonCtx = runFunctions(scoresSource, ['runSportsScoresDateWindowUpdate_'], seasonRuntimeContext(fetched));
let seasonResult = seasonCtx.runSportsScoresDateWindowUpdate_(2, 7);
assert.deepStrictEqual(fetched, ['MLB']);
assert.strictEqual(seasonResult.leaguesChecked, 1);
assert.strictEqual(seasonResult.leaguesSkippedInactive, 1);

fetched = [];
seasonCtx = runFunctions(scoresSource, ['runSportsScheduleReconcileUpdate'], seasonRuntimeContext(fetched));
seasonResult = seasonCtx.runSportsScheduleReconcileUpdate('', 1, 21);
assert.deepStrictEqual(fetched, ['MLB']);
assert.strictEqual(seasonResult.leaguesChecked, 1);
assert.strictEqual(seasonResult.leaguesSkippedInactive, 1);

// ---------------------------------------------------------------------------
// 5) Maintenance UX: season build errors are visible; misleading Log Days UI
// is removed instead of pretending to control the fixed SportsLogs row cap.
// ---------------------------------------------------------------------------
assert(functionSource(scoresSource, 'checkSportsEngineStatus').includes('seasonJobErrors'));
assert(functionSource(scoresSource, 'checkSportsEngineStatus').includes('withErrors'));
assert(adminPage.includes('Review SportsSeasonJobs Errors before launch/rollover'));
assert(!adminPage.includes('adminRenderSportsNumberField_("Log days", "sportsLogDays"'), 'Log Days control must be removed');
assert(!adminPage.includes('keepLogsDays: leagueValue_("sportsLogDays"'), 'unused Log Days save payload must be removed');
assert(!adminPage.includes('sportsLogDays: 14'), 'unused Log Days reset default must be removed');

console.log('sports-unattended-operations-rc16-tests: PASS');
