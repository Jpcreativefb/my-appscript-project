'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function src(path) { return fs.readFileSync(path, 'utf8'); }
function exists(path) { assert.ok(fs.existsSync(path), `required file missing: ${path}`); }
function extractFunction(source, name) {
  const needle = `function ${name}`;
  let start = source.indexOf(needle);
  if (start < 0) {
    start = source.indexOf(`async function ${name}`);
    if (start < 0) throw new Error(`function not found: ${name}`);
  } else {
    const asyncStart = source.lastIndexOf('async ', start);
    if (asyncStart >= 0 && asyncStart + 6 === start) start = asyncStart;
  }
  const brace = source.indexOf('{', start);
  if (brace < 0) throw new Error(`function brace not found: ${name}`);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i], next = source[i + 1] || '';
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function: ${name}`);
}

const RELEASE = 'v1219rc20-postdeploy-first-entry-performance-r2';
const OLD_RELEASE = 'v1219rc19-mobile-pwa-performance-1';
const files = {
  app: 'frontend/js/app.js', appMirror: 'frontend/app.js',
  api: 'frontend/js/api.js', apiMirror: 'frontend/api.js',
  dash: 'frontend/js/pages/dashboard.js', tf: 'frontend/js/pages/teamFantasy.js',
  appData: 'backend/engines/AppDataEngine.js', tfBackend: 'backend/engines/SportsTeamFantasyEngine.js',
  appHtml: 'frontend/app.html', indexHtml: 'frontend/index.html', pwa: 'frontend/js/pwa.js',
  sw: 'frontend/sw.js', css: 'frontend/css/rc19-mobile-pwa.css',
  pwaSuite: 'tests/player_ux_pwa_routing_rc16_cumulative_tests.js'
};
Object.values(files).forEach(exists);
const app = src(files.app), api = src(files.api), dash = src(files.dash), tf = src(files.tf);
const appData = src(files.appData), tfBackend = src(files.tfBackend);
let count = 0;
function ok(value, message) { count++; assert.ok(value, message); }
function eq(a, b, message) { count++; assert.strictEqual(a, b, message); }

// -------------------------------------------------------------------------
// R2 gate 1: production mirrors + complete release boundary.
// -------------------------------------------------------------------------
eq(fs.readFileSync(files.app).compare(fs.readFileSync(files.appMirror)), 0, 'app.js mirrors must be byte-identical');
eq(fs.readFileSync(files.api).compare(fs.readFileSync(files.apiMirror)), 0, 'api.js mirrors must be byte-identical');
[
  files.appHtml, files.indexHtml, files.app, files.appMirror,
  files.pwa, files.sw, files.pwaSuite
].forEach(path => {
  const text = src(path);
  ok(text.includes(RELEASE), `${path} contains R2 release token`);
  ok(!text.includes(OLD_RELEASE), `${path} no longer contains prior release token`);
});
ok(src(files.appHtml).includes('rc19-mobile-pwa.css'), 'accepted RC20 mobile stylesheet remains referenced');
ok(src(files.css).includes('dashboard-current-games-carousel'), 'accepted Current Games local containment remains present');
ok(/<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width[^"']*initial-scale=1/i.test(src(files.appHtml)), 'app viewport meta remains mobile-correct');

// -------------------------------------------------------------------------
// R2 gate 2: executable fast Dashboard must exit before every noncritical
// progress/profile/appearance helper. Stubs throw if any forbidden helper runs.
// -------------------------------------------------------------------------
const counters = Object.create(null);
function forbidden(name) {
  counters[name] = 0;
  return function() { counters[name]++; throw new Error(`fastStartup invoked forbidden helper: ${name}`); };
}
const sandbox = {
  CacheService: { getScriptCache() { return { get() { return null; }, put() { throw new Error('fast payload must not write full Dashboard cache'); } }; } },
  validateUserSession_() { return true; },
  appDashboardCacheKey_() { return 'dash-user'; },
  filterGamesForUser_(games) { return games; },
  getGames() { return [{ gameId:'active-1', name:'Active One', active:true, status:'open', type:'prediction' }]; },
  getDefaultGameId() { return 'active-1'; },
  isDashboardPastGame_() { return false; },
  getDashboardGameMode_() { return 'prediction'; },
  getDashboardAvailability_() { return { available:true, statusLabel:'Open', label:'Open', actionLabel:'Play' }; },
  getDashboardHubPlacement_() { return { category:'general', group:'' }; },
  getDashboardGameTypeLabel_() { return 'Prediction'; },
  getDashboardGameDescription_() { return 'Game'; },
  safeScriptCachePut_: forbidden('safeScriptCachePut_'),
  buildDashboardProgressContext_: forbidden('buildDashboardProgressContext_'),
  buildDashboardGameHubItemLite_: forbidden('buildDashboardGameHubItemLite_'),
  teamFantasyDashboardProgress_: forbidden('teamFantasyDashboardProgress_'),
  survivorDashboardProgress_: forbidden('survivorDashboardProgress_'),
  rankingDashboardProgress_: forbidden('rankingDashboardProgress_'),
  votingDashboardProgress_: forbidden('votingDashboardProgress_'),
  getDashboardTotalCategories_: forbidden('getDashboardTotalCategories_'),
  getDashboardUserProgressFromAllRows_: forbidden('getDashboardUserProgressFromAllRows_'),
  getDashboardUserPickProgress_: forbidden('getDashboardUserPickProgress_'),
  getDashboardUserWagerProgress_: forbidden('getDashboardUserWagerProgress_'),
  getCategories: forbidden('getCategories'),
  seasonAnchorUserPayload_: forbidden('seasonAnchorUserPayload_'),
  apiGetEditableProfile: forbidden('apiGetEditableProfile'),
  appearanceGetHubAppearanceRows_: forbidden('appearanceGetHubAppearanceRows_')
};
vm.createContext(sandbox);
vm.runInContext(extractFunction(appData, 'buildDashboardFastStartupGameHubItem_'), sandbox);
vm.runInContext(extractFunction(appData, 'apiGetDashboardGamesHub'), sandbox);
const compact = sandbox.apiGetDashboardGamesHub({ username:'player', token:'token', fastStartup:true });
ok(compact && compact.success === true, 'fast Dashboard succeeds');
ok(compact.fastStartup === true && compact.progressDeferred === true && compact.classificationDeferred === true, 'fast Dashboard explicitly marks deferred progress/classification');
eq(compact.activeGames.length, 1, 'active game survives compact payload');
eq(compact.activeGames[0].gameId, 'active-1', 'compact payload preserves direct game identity');
eq(compact.activeGames[0].hasStarted, null, 'compact Home does not invent started state');
eq(compact.activeGames[0].madeCount, null, 'compact Home does not invent picks completed');
Object.entries(counters).forEach(([name, value]) => eq(value, 0, `fast Dashboard never calls ${name}`));

// -------------------------------------------------------------------------
// R2 gate 3: compact Home classification keeps active games accessible and
// does not invoke normal progress-based Attention/Discover classification.
// -------------------------------------------------------------------------
const classifySandbox = {
  dashboardGetPlayingGames_() { throw new Error('normal classification must not run for compact Home'); },
  dashboardGetAttentionGames_() { throw new Error('attention classification must not run for compact Home'); }
};
vm.createContext(classifySandbox);
vm.runInContext(extractFunction(dash, 'dashboardClassifyHomeGames_'), classifySandbox);
const classified = classifySandbox.dashboardClassifyHomeGames_({ fastStartup:true, activeGames:[{gameId:'g1'}, {gameId:'g2'}] });
eq(classified.currentGames.length, 2, 'all compact active games render as Current Games');
eq(classified.attentionGames.length, 0, 'compact Home defers Attention classification');
eq(classified.offeredGames.length, 0, 'compact Home defers Discover classification');
ok(classified.classificationDeferred === true, 'compact classification is explicitly deferred');

// -------------------------------------------------------------------------
// R2 gate 4: exactly one controlled Home enrichment chain, delayed to idle
// window and checking Home state before expensive API starts.
// -------------------------------------------------------------------------
const scheduler = extractFunction(dash, 'dashboardScheduleHomeEnrichment_');
const refresh = extractFunction(dash, 'dashboardRefreshHomePayloadInBackground_');
ok(scheduler.includes('6500'), 'full Home enrichment waits for 6.5-second idle window');
ok(!dash.includes('}, 250);'), 'R1 250ms full Dashboard launch is absent');
const homeCheckPos = refresh.indexOf('dashboardStillOnHome_');
const apiPos = refresh.indexOf('apiGetDashboardGamesHub');
ok(homeCheckPos >= 0 && apiPos > homeCheckPos, 'still-on-Home check occurs before full Dashboard API');
ok(refresh.includes('hydrateDashboardHomeExtras_'), 'secondary Home extras belong to the same controlled chain');
const dashboardCase = app.slice(app.indexOf('case "dashboard":'), app.indexOf('case "trophy-room":'));
ok(dashboardCase.includes('dashboardScheduleHomeEnrichment_'), 'app Dashboard route schedules controlled chain');
ok(!dashboardCase.includes('hydrateDashboardHomeExtras_'), 'app route no longer starts competing extras timer');
const snapshotRefresh = extractFunction(app, 'appScheduleDashboardRefreshAfterSnapshot_');
ok(snapshotRefresh.includes('dashboardScheduleHomeEnrichment_'), 'cached Home snapshot uses same controlled enrichment scheduler');
ok(!snapshotRefresh.includes('dashboardRefreshHomePayloadInBackground_'), 'cached snapshot no longer starts a second direct Dashboard request');
ok(!snapshotRefresh.includes('3500'), 'legacy 3.5-second competing Dashboard refresh is removed');

// -------------------------------------------------------------------------
// R2 gate 5: accepted profile/Team Fantasy/snapshot corrections stay intact.
// -------------------------------------------------------------------------
ok(app.includes('APP_GAME_PROFILE_PROMPT_INFLIGHT'), 'profile prompt same-game single-flight exists');
ok(app.includes('if (existing) return existing;'), 'concurrent prompt entries share one Promise');
const promptOnce = extractFunction(app, 'maybeOfferGameProfileOnce_');
const localAck = promptOnce.indexOf('localStorage.setItem(cacheKey, "done")');
const serverAck = promptOnce.indexOf('apiSetGameProfilePromptChoice');
ok(localAck >= 0 && serverAck > localAck, 'General profile choice is acknowledged locally before server persistence');
const enterGameR2 = extractFunction(app, 'enterGame');
ok(!enterGameR2.includes('teamFantasyPrewarmState_'),
  'RC22: Team Fantasy state prewarm is not started during entry/profile gating');
ok(enterGameR2.includes('ensurePageModules_("team-fantasy")'),
  'RC22: Team Fantasy module prewarm remains during entry');
ok(tf.includes('TEAM_FANTASY_STATE_REQUESTS'), 'Team Fantasy state requests use single-flight');
ok(tf.includes('data-page-load-failed="true"'), 'Team Fantasy failed render has explicit marker');
ok(app.includes('appPageSnapshotHtmlValid_'), 'snapshot validity helper exists');
ok(app.includes('appDiscardPageSnapshot_'), 'invalid snapshots are actively evicted');
ok(app.includes('Could not load Team Fantasy.'), 'Team Fantasy failed HTML is explicitly rejected');
const tfState = extractFunction(tfBackend, 'apiGetTeamFantasyState');
ok(!tfState.includes('setupSportsTeamFantasySystem()'), 'Team Fantasy hot state read does not run all-sheet setup');

// -------------------------------------------------------------------------
// R2 gate 6: Reality/prediction fresh entry keeps startup prewarm before the
// optional profile await; no Reality finality/spoiler code is modified here.
// -------------------------------------------------------------------------
const enterGame = extractFunction(app, 'enterGame');
const startupPrewarm = enterGame.indexOf('loadStartupPayload()');
const profileAwait = enterGame.indexOf('await maybeOfferGameProfile_');
ok(startupPrewarm >= 0 && profileAwait > startupPrewarm, 'prediction/Reality startup prewarm begins before optional profile await');
ok(app.includes('APP_STARTUP_PAYLOAD_REQUESTS'), 'startup payload remains single-flight/deduped');


(async function runtimeSingleFlightChecks() {
  // Concurrent same-game entry must open at most one profile flow.
  const profileStart = app.indexOf('const APP_GAME_PROFILE_PROMPT_INFLIGHT = new Map();');
  const profileEnd = app.indexOf('/* ======================\n   GAME CARD ACTIONS', profileStart);
  ok(profileStart >= 0 && profileEnd > profileStart, 'profile single-flight runtime block can be isolated');
  let promptCalls = 0;
  const promptSandbox = {
    console: console,
    setTimeout: setTimeout,
    gameProfilePromptCacheKey_(gameId, username) { return String(username) + '|' + String(gameId); },
    getCurrentUsername() { return 'player'; },
    maybeOfferGameProfileOnce_: async function() {
      promptCalls++;
      await new Promise(resolve => setTimeout(resolve, 15));
      return 'continue';
    }
  };
  vm.createContext(promptSandbox);
  vm.runInContext(app.slice(profileStart, profileEnd), promptSandbox);
  await Promise.all([
    promptSandbox.maybeOfferGameProfile_('g1'),
    promptSandbox.maybeOfferGameProfile_('g1'),
    promptSandbox.maybeOfferGameProfile_('g1')
  ]);
  eq(promptCalls, 1, 'three concurrent same-game entries invoke one profile prompt request');

  // Snapshot validity is behavior-tested, not only marker-tested.
  const snapSandbox = {};
  vm.createContext(snapSandbox);
  vm.runInContext(extractFunction(app, 'appPageSnapshotHtmlValid_'), snapSandbox);
  eq(snapSandbox.appPageSnapshotHtmlValid_('team-fantasy', '<div data-page-load-failed="true">failed</div>'), false, 'failed Team Fantasy marker is not snapshot-valid');
  eq(snapSandbox.appPageSnapshotHtmlValid_('team-fantasy', '<div>Could not load Team Fantasy.</div>'), false, 'Team Fantasy business failure is not snapshot-valid');
  eq(snapSandbox.appPageSnapshotHtmlValid_('team-fantasy', '<div class="tf-page">valid lineup</div>'), true, 'valid Team Fantasy page remains snapshot-eligible');

  // Team Fantasy state prewarm/render pair shares one route-critical request.
  const tfStart = tf.indexOf('const TEAM_FANTASY_STATE_REQUESTS = Object.create(null);');
  const tfEnd = tf.indexOf('async function renderTeamFantasyPage()', tfStart);
  ok(tfStart >= 0 && tfEnd > tfStart, 'Team Fantasy single-flight runtime block can be isolated');
  let tfCalls = 0;
  const tfSandbox = {
    console: console,
    teamFantasyCurrentUser_() { return 'player'; },
    api: async function() {
      tfCalls++;
      await new Promise(resolve => setTimeout(resolve, 15));
      return { success:true };
    }
  };
  vm.createContext(tfSandbox);
  vm.runInContext(tf.slice(tfStart, tfEnd), tfSandbox);
  await Promise.all([
    tfSandbox.teamFantasyPrewarmState_('tf1', 'league1'),
    tfSandbox.teamFantasyLoadState_('tf1', 'player', 'league1')
  ]);
  eq(tfCalls, 1, 'Team Fantasy prewarm and renderer share one state request');

  console.log(`PASS: ${count} RC20 R2 post-deploy first-entry/PWA/performance checks`);
})().catch(function(err) {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
