'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

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

const adminGamesSource = fs.readFileSync('backend/admin/AdminGames.js', 'utf8');
const apiSource = fs.readFileSync('backend/Api.js', 'utf8');
const frontendAdmin = fs.readFileSync('frontend/js/pages/admin.js', 'utf8');
const frontendApi = fs.readFileSync('frontend/api.js', 'utf8');
const frontendApiMirror = fs.readFileSync('frontend/js/api.js', 'utf8');
const gamesEngineSource = fs.readFileSync('backend/engines/GamesEngine.js', 'utf8');
const appDataSource = fs.readFileSync('backend/engines/AppDataEngine.js', 'utf8');

// ---------------------------------------------------------------------------
// Backend publication state machine. The warning decision is explicit, and
// success is returned only after a readback confirms Status/Active/LockAllPicks.
// ---------------------------------------------------------------------------
function makePublicationContext(preflight) {
  const state = {
    gameId: 'test-kitchen-test',
    status: 'Setup',
    active: false,
    archived: false,
    defaultGame: false,
    lockAllPicks: true,
    showLeaderboard: true
  };
  const season = { SeasonId: 'test-kitchen-test', GameId: 'test-kitchen-test' };

  const dashboardClears = [];
  const context = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, Error,
    adminRunGamePreflight: () => ({ success: true, ...preflight }),
    adminUpdateGame: (payload) => {
      Object.keys(payload || {}).forEach((key) => {
        if (key === 'gameId') return;
        state[key] = payload[key];
      });
      return { success: true, gameId: state.gameId };
    },
    getGame: () => ({ ...state }),
    clearGamesCache: () => {},
    clearPlayerActionCaches: (gameId, sheets, username) => dashboardClears.push({ gameId, sheets, username }),
    __state: state,
    __season: season,
    __dashboardClears: dashboardClears
  };
  vm.createContext(context);
  ['adminNormalizeGameId_', 'adminNormalizeValue_', 'adminToBoolean_',
   'adminPublicationStateSnapshot_', 'adminSetPublicationSetupState_',
   'adminFinalizeGamePublication'].forEach((name) => {
    vm.runInContext(functionSource(adminGamesSource, name), context);
  });
  return context;
}

// 0 errors / 0 warnings => Live.
{
  const c = makePublicationContext({ errorCount: 0, warningCount: 0, issues: [] });
  const result = c.adminFinalizeGamePublication({
    gameId: 'test-kitchen-test', warningsApproved: false,
    defaultGame: false, lockAllPicks: false
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.activated, true);
  assert.strictEqual(c.__state.status, 'Active');
  assert.strictEqual(c.__state.active, true);
  assert.strictEqual(c.__state.lockAllPicks, false);
  assert.strictEqual(c.__state.defaultGame, false,
    'Default Game = NO must be valid for a Live Reality game.');
}

// 0 errors / 1 warning + explicit approve => Live, not Setup.
{
  const c = makePublicationContext({
    errorCount: 0, warningCount: 1,
    issues: [{ severity: 'warning', message: 'No default game is currently set.' }]
  });
  const result = c.adminFinalizeGamePublication({
    gameId: 'test-kitchen-test', warningsApproved: true,
    defaultGame: false, lockAllPicks: false, username: 'cert-admin'
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.activated, true);
  assert.strictEqual(result.game.status, 'Active');
  assert.strictEqual(result.game.active, true);
  assert.strictEqual(result.game.lockAllPicks, false);
  assert.strictEqual(result.game.defaultGame, false);
  assert.strictEqual(c.__season.GameId, 'test-kitchen-test',
    'Publishing must not unlink the Reality season from its game.');
  assert(c.__dashboardClears.some(row => row.username === 'cert-admin' && row.gameId === 'test-kitchen-test'),
    'Publishing should clear the current admin/player dashboard cache so discovery reflects LIVE immediately.');
}

// 0 errors / warning + user cancels => Setup + locked.
{
  const c = makePublicationContext({ errorCount: 0, warningCount: 1, issues: [] });
  const result = c.adminFinalizeGamePublication({
    gameId: 'test-kitchen-test', warningsApproved: false,
    defaultGame: false, lockAllPicks: false
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.activated, false);
  assert.strictEqual(result.setupOnly, true);
  assert.strictEqual(c.__state.status, 'Setup');
  assert.strictEqual(c.__state.active, false);
  assert.strictEqual(c.__state.lockAllPicks, true);
}

// Any preflight error => Setup + locked even if warnings are approved.
{
  const c = makePublicationContext({ errorCount: 1, warningCount: 0, issues: [] });
  const result = c.adminFinalizeGamePublication({
    gameId: 'test-kitchen-test', warningsApproved: true,
    defaultGame: false, lockAllPicks: false
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.setupOnly, true);
  assert.strictEqual(c.__state.status, 'Setup');
  assert.strictEqual(c.__state.active, false);
  assert.strictEqual(c.__state.lockAllPicks, true);
}

// ---------------------------------------------------------------------------
// Frontend must use the explicit post-preflight finalizer rather than a second
// ambiguous generic update. Approved warnings must be passed as true; cancel as
// false, with the backend response deciding the truthful final state.
// ---------------------------------------------------------------------------
assert(frontendAdmin.includes('apiAdminFinalizeGamePublication({'),
  'Manage Games publish path must use explicit publication finalizer.');
assert(frontendAdmin.includes('warningsApproved: continueWithWarnings === true'),
  'Warning confirmation must be carried explicitly to activation.');
assert(frontendAdmin.includes('res.activated !== true'),
  'Frontend must reject an activation response that does not confirm persisted LIVE state.');
assert(!frontendAdmin.includes('res = await apiAdminUpdateGame({\n            gameId: game.gameId,\n            status: "Active"'),
  'Warning approval must not use the old generic second-save activation block.');
assert(apiSource.includes('action === "adminFinalizeGamePublication"'),
  'Backend API must route explicit publication finalization.');
assert(frontendApi.includes('function apiAdminFinalizeGamePublication'),
  'Frontend API must expose explicit publication finalization.');
assert.strictEqual(frontendApi, frontendApiMirror,
  'Frontend API mirrors must remain byte-identical.');

// ---------------------------------------------------------------------------
// Normal player discovery: active, non-archived game remains discoverable.
// ---------------------------------------------------------------------------
{
  const context = {
    getGames: () => [{
      gameId: 'test-kitchen-test', active: true, archived: false, status: 'Active'
    }]
  };
  vm.createContext(context);
  vm.runInContext(functionSource(gamesEngineSource, 'getActiveGames'), context);
  const active = context.getActiveGames();
  assert.strictEqual(active.length, 1);
  assert.strictEqual(active[0].gameId, 'test-kitchen-test');
}

// Reality Hub classification must use the authoritative season link, not only
// title keywords. "Test Kitchen — test" intentionally contains no known show
// keyword and previously fell into General Games.
{
  const context = {
    String, Array,
    realityTvHasSeasonForGameCached_: (gameId) => gameId === 'test-kitchen-test',
    getDashboardGameTypeLabel_: () => 'Prediction'
  };
  vm.createContext(context);
  vm.runInContext(functionSource(appDataSource, 'getDashboardHubPlacement_'), context);
  const placement = context.getDashboardHubPlacement_({
    gameId: 'test-kitchen-test',
    name: 'Test Kitchen — test',
    type: 'prediction',
    description: ''
  }, 'prediction');
  assert.strictEqual(placement.category, 'reality');
  assert.strictEqual(placement.group, 'Other Reality');
}

console.log('reality-awards-rc15-publication-warning-tests: PASS');
