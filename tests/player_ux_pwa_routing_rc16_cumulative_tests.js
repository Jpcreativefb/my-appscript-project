const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const appData = read('backend/engines/AppDataEngine.js');
const appCache = read('backend/services/AppCache.js');
const adminGames = read('backend/admin/AdminGames.js');
const app = read('frontend/app.js');
const appMirror = read('frontend/js/app.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const html = read('frontend/app.html');
const indexHtml = read('frontend/index.html');

assert.strictEqual(app, appMirror, 'frontend app mirrors must remain synchronized');

function functionSource(source, name) {
  const needles = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const needle of needles) {
    start = source.indexOf(needle);
    if (start >= 0) break;
  }
  assert(start >= 0, 'Missing function ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escape = false, lineComment = false, blockComment = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i], next = source[i + 1] || '';
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
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
  throw new Error('Unclosed function ' + name);
}

function ctx(extra = {}) {
  return vm.createContext(Object.assign({
    console, Date, Math, Number, String, Array, Object, Boolean, JSON, RegExp,
    isFinite, isNaN, encodeURIComponent, decodeURIComponent, URL, Promise,
    setTimeout, clearTimeout
  }, extra));
}

function runFunctions(source, names, extra = {}) {
  const c = ctx(extra);
  vm.runInContext(names.map(name => functionSource(source, name)).join('\n'), c);
  return c;
}

// ---------------------------------------------------------------------------
// 1. Voting remains Voting through dashboard normalization.
// ---------------------------------------------------------------------------
{
  const c = runFunctions(appData, ['getDashboardGameMode_']);
  assert.strictEqual(c.getDashboardGameMode_({type:'voting'}), 'voting');
  assert.strictEqual(c.getDashboardGameMode_({type:'ranking'}), 'ranking');
  assert.strictEqual(c.getDashboardGameMode_({type:'survivor'}), 'survivor');
  assert.strictEqual(c.getDashboardGameMode_({type:'team-fantasy'}), 'team-fantasy');
}

// Home card construction must export the normalized mode as the entry type.
{
  const c = runFunctions(appData, ['buildDashboardGameHubItemLite_'], {
    getDashboardGameMode_: game => String(game.type || '').toLowerCase(),
    getDashboardAvailability_: () => ({available:true,statusLabel:'Open'}),
    getDashboardGameProgressLite_: () => ({madeCount:0,totalCount:1,progressAvailable:true,progressLabel:'1 vote left',progressValue:0,userSummary:'Voting',actionLabel:'Vote Now'}),
    getDashboardEnterLabel_: () => 'Enter',
    getDashboardGameTypeLabel_: (_g, mode) => mode,
    getDashboardHubPlacement_: () => ({category:'general',group:'Games'}),
    getDashboardGameDescription_: () => 'desc'
  });
  const item = c.buildDashboardGameHubItemLite_({gameId:'vote-B',type:'voting',active:true}, 'alice', false, null);
  assert.strictEqual(item.gameId, 'vote-B');
  assert.strictEqual(item.type, 'voting');
  assert.strictEqual(item.enterLabel, 'Vote Now');
}

// ---------------------------------------------------------------------------
// 2. Cross-type game switcher uses the newly selected GameId + actual mode.
// ---------------------------------------------------------------------------
{
  const calls = [];
  const c = runFunctions(app, ['handleGameSwitch'], {
    APP_STATE: {
      currentPage:'picks',
      gameSwitcherGames:[
        {gameId:'game-A',type:'prediction'},
        {gameId:'game-B',type:'team-fantasy',gameRole:'standalone'},
        {gameId:'game-C',type:'voting',gameRole:'standalone'}
      ]
    },
    setFrontendGameId: id => calls.push(['set',id]),
    clearStartupPayload: () => calls.push(['clear']),
    enterGame: async (...args) => calls.push(['enter',...args]),
    navigate: async page => calls.push(['navigate',page]),
    getFrontendLeagueId: () => ''
  });
  (async () => {
    await c.handleGameSwitch('game-B');
    const enterB = calls.find(x => x[0] === 'enter');
    assert.deepStrictEqual(Array.from(enterB.slice(1,3)), ['game-B','team-fantasy']);
    assert(!calls.some(x => x[0] === 'navigate' && x[1] === 'picks'), 'must not reuse old Picks route');

    calls.length = 0;
    await c.handleGameSwitch('game-C');
    const enterC = calls.find(x => x[0] === 'enter');
    assert.deepStrictEqual(Array.from(enterC.slice(1,3)), ['game-C','voting']);
  })().catch(err => { throw err; });
}

// ---------------------------------------------------------------------------
// 3. Standard Home progress counts only actionable missing picks.
// ---------------------------------------------------------------------------
{
  const c = runFunctions(appData, ['dashboardCategoryIsActionable_', 'dashboardActionablePickTotals_'], {
    getCategorySettingsCached: () => ({
      q1:{}, q2:{}, q3:{}, q4:{}, q5:{}, q6:{}, q7:{},
      q8:{locked:true},
      q9:{lockDateTime:'2000-01-01T00:00:00.000Z'},
      q10:{lockDateTime:'2999-01-01T00:00:00.000Z'}
    })
  });
  const seven = ['q1','q2','q3','q4','q5','q6','q7'];
  const lockedMissing = c.dashboardActionablePickTotals_({lockAllPicks:false}, 'g1', seven.concat('q8'), seven);
  assert.strictEqual(lockedMissing.madeCount, 7);
  assert.strictEqual(lockedMissing.totalCount, 7, 'locked missing pick must not remain actionable');
  assert.strictEqual(lockedMissing.actionableMissing, 0);

  const openMissing = c.dashboardActionablePickTotals_({lockAllPicks:false}, 'g1', seven.concat('q10'), seven);
  assert.strictEqual(openMissing.totalCount, 8);
  assert.strictEqual(openMissing.actionableMissing, 1);

  const pastLock = c.dashboardActionablePickTotals_({lockAllPicks:false}, 'g1', seven.concat('q9'), seven);
  assert.strictEqual(pastLock.totalCount, 7);

  const gameLocked = c.dashboardActionablePickTotals_({lockAllPicks:true}, 'g1', seven.concat('q10'), seven);
  assert.strictEqual(gameLocked.totalCount, 7);
}

// ---------------------------------------------------------------------------
// 4. Survivor/KOTH/Ranking/Voting Home obligation contracts.
// ---------------------------------------------------------------------------
function specialProgress(extra) {
  return runFunctions(appData, ['dashboardProgressResult_', 'dashboardSpecialGameProgress_'], Object.assign({
    getDashboardProgressPercent_: (made,total) => total ? Math.round(made * 100 / total) : 0
  }, extra));
}

{
  let state = {currentRound:{canPick:true,pickNomineeId:''},rounds:[],alive:true};
  let c = specialProgress({apiGetSurvivorState_: () => state});
  let p = c.dashboardSpecialGameProgress_({gameId:'surv-A'}, 'alice', 'survivor');
  assert.strictEqual(p.madeCount, 0); assert.strictEqual(p.totalCount, 1); assert.strictEqual(p.remainingCount, 1);
  assert.strictEqual(p.actionLabel, 'Make Survivor Pick');

  state = {currentRound:{canPick:false,pickNomineeId:''},rounds:[],alive:true};
  c = specialProgress({apiGetSurvivorState_: () => state});
  p = c.dashboardSpecialGameProgress_({gameId:'surv-A'}, 'alice', 'survivor');
  assert.strictEqual(p.totalCount, 0, 'locked Survivor round must not create Home obligation');

  state = {currentRound:{canPick:false,pickNomineeId:'team-1'},rounds:[{pickNomineeId:'team-1'}],alive:true};
  c = specialProgress({apiGetSurvivorState_: () => state});
  p = c.dashboardSpecialGameProgress_({gameId:'surv-A'}, 'alice', 'survivor');
  assert.strictEqual(p.madeCount, 1); assert.strictEqual(p.totalCount, 1); assert.strictEqual(p.hasStarted, true);

  state = {passiveKoth:true,mode:'king-of-the-hill',history:[{week:1}],latestWeek:1};
  c = specialProgress({apiGetSurvivorState_: () => state});
  p = c.dashboardSpecialGameProgress_({gameId:'koth-A'}, 'alice', 'survivor');
  assert.strictEqual(p.totalCount, 0); assert.strictEqual(p.hasStarted, true); assert.strictEqual(p.actionLabel, 'View KOTH');
}

{
  const c = specialProgress({apiGetRankingState_: () => ({categories:[
    {locked:false,nominees:[1,2,3],ballot:[1,2,3]},
    {locked:false,nominees:[1,2],ballot:[]},
    {locked:true,nominees:[1,2],ballot:[]}
  ]})});
  const p = c.dashboardSpecialGameProgress_({gameId:'rank-A'}, 'alice', 'ranking');
  assert.strictEqual(p.madeCount, 1); assert.strictEqual(p.totalCount, 2); assert.strictEqual(p.remainingCount, 1);
  assert.strictEqual(p.hasStarted, true); assert.strictEqual(p.actionLabel, 'Finish Rankings');
}

{
  let state = {votingOpen:true,ballotLimit:3,ballot:[],ownEntry:null};
  let c = specialProgress({apiGetVotingCompetitionState_: () => state});
  let p = c.dashboardSpecialGameProgress_({gameId:'vote-A'}, 'alice', 'voting');
  assert.strictEqual(p.totalCount, 1); assert.strictEqual(p.remainingCount, 1); assert.strictEqual(p.hasStarted, false);

  state = {votingOpen:true,ballotLimit:3,ballot:['a','b','c'],ownEntry:null};
  c = specialProgress({apiGetVotingCompetitionState_: () => state});
  p = c.dashboardSpecialGameProgress_({gameId:'vote-A'}, 'alice', 'voting');
  assert.strictEqual(p.madeCount, 1); assert.strictEqual(p.totalCount, 1); assert.strictEqual(p.hasStarted, true);

  state = {votingOpen:false,ballotLimit:3,ballot:[],ownEntry:{entryId:'mine'}};
  c = specialProgress({apiGetVotingCompetitionState_: () => state});
  p = c.dashboardSpecialGameProgress_({gameId:'vote-A'}, 'alice', 'voting');
  assert.strictEqual(p.totalCount, 0); assert.strictEqual(p.hasStarted, true, 'existing competition participation counts as started');
}

// ---------------------------------------------------------------------------
// 5. Game-level ResultsFinalized is a Home past/results source of truth.
// ---------------------------------------------------------------------------
{
  const c = runFunctions(appData, ['isDashboardPastGame_']);
  assert.strictEqual(c.isDashboardPastGame_({status:'Active',active:true,resultsFinalized:true}), true);
  assert.strictEqual(c.isDashboardPastGame_({status:'Active',active:true,resultsFinalized:false}), false);
  assert.strictEqual(c.isDashboardPastGame_({status:'Final',active:true}), true);
}

// ---------------------------------------------------------------------------
// 6. Dashboard publication uses a global revision so all user cache keys move.
// ---------------------------------------------------------------------------
{
  let revision = 'r1';
  const props = {getProperty: () => revision, setProperty: (_k,v) => { revision = v; }};
  const c = runFunctions(appCache, ['appDashboardRevision_', 'appDashboardBumpRevision_', 'appDashboardCacheKey_'], {
    PropertiesService:{getScriptProperties:()=>props},
    appCacheUsernameKey_: user => String(user || '').toLowerCase()
  });
  const beforeA = c.appDashboardCacheKey_('Alice');
  const beforeB = c.appDashboardCacheKey_('Bob');
  c.appDashboardBumpRevision_();
  const afterA = c.appDashboardCacheKey_('Alice');
  const afterB = c.appDashboardCacheKey_('Bob');
  assert.notStrictEqual(beforeA, afterA);
  assert.notStrictEqual(beforeB, afterB);
  assert(afterA.includes('dashboard_hub_v2_'));
  assert(functionSource(adminGames, 'adminClearCaches_').includes('appDashboardBumpRevision_'), 'Admin game publication/update must bump dashboard discovery revision');
  assert(functionSource(app, 'navigate').includes('if (page === "dashboard")'), 'Home navigation must force a new discovery request');
}

// ---------------------------------------------------------------------------
// 7. Browser/PWA Back keeps hash and rendered route synchronized, while still
//    honoring dirty-form leave protection inside navigate().
// ---------------------------------------------------------------------------
{
  let navigated = '';
  let replaced = '';
  const state = {currentPage:'team-fantasy'};
  const c = runFunctions(app, ['appRoutePageFromLocation_', 'appWriteRouteHistory_', 'appHandleBrowserRoute_'], {
    APP_STATE: state,
    window:{
      location:{hash:'#dashboard',pathname:'/app.html',search:''},
      history:{
        pushState(){},
        replaceState(_s,_t,url){ replaced = url; }
      }
    },
    document:{title:'PATTC'},
    navigate: async page => { navigated = page; state.currentPage = page; }
  });
  (async () => {
    await c.appHandleBrowserRoute_();
    assert.strictEqual(navigated, 'dashboard');
    assert.strictEqual(state.currentPage, 'dashboard');

    // Simulate a dirty-form refusal: navigate leaves currentPage unchanged.
    navigated = ''; replaced = ''; state.currentPage = 'admin-games'; c.window.location.hash = '#dashboard';
    c.navigate = async page => { navigated = page; /* refused; page stays admin-games */ };
    await c.appHandleBrowserRoute_();
    assert.strictEqual(navigated, 'dashboard');
    assert(replaced.endsWith('#admin-games'), 'URL must be restored to the page that actually remains visible');
  })().catch(err => { throw err; });
}

// ---------------------------------------------------------------------------
// 8. PWA/service-worker/page assets share one explicit release boundary.
// ---------------------------------------------------------------------------
{
  const releaseMatch = html.match(/<meta\s+name=["']pattc-release["']\s+content=["']([^"']+)["']/i);
  assert(releaseMatch && releaseMatch[1], 'canonical pattc-release marker missing');
  const release = releaseMatch[1];
  assert(html.includes('name="pattc-release" content="' + release + '"'));
  assert(indexHtml.includes('name="pattc-release" content="' + release + '"'));
  assert(html.includes('release=' + release), 'authenticated shell assets must carry the production release boundary');
  assert(indexHtml.includes('release=' + release), 'login/PWA shell assets must carry the production release boundary');
  assert(app.includes('window.PATTC_FRONTEND_RELEASE || "' + release + '"'));
  assert(pwa.includes('window.PATTC_FRONTEND_RELEASE || "' + release + '"'));
  assert(pwa.includes('"./sw.js?v=" + encodeURIComponent(PWA_VERSION)'));
  assert(sw.includes('new URL(self.location.href).searchParams.get("v")'));
  assert(sw.includes('const AWARDS_CACHE = "awards-app-" + AWARDS_RELEASE'));
  assert(sw.includes('fetch(request)'), 'network-first behavior must remain');
}

// Home action rendering must use each mode's own action label rather than a
// hard-coded generic Finish Picks string.
assert(dashboard.includes('game.actionLabel || game.enterLabel || "Finish Picks"'));

console.log('player-ux-pwa-routing-rc16-cumulative-tests: PASS');
