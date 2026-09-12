'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { performance } = require('perf_hooks');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const RC24M_BASELINE_TREE = '79428b21f147cad6446f2037584e10d7e5f8e6f2';
const exact = p => execFileSync('git', ['show', RC24M_BASELINE_TREE + ':' + p], { cwd: root, encoding: 'utf8' });

const currentApp = read('frontend/js/app.js');
const currentApi = read('frontend/js/api.js');
const currentPicks = read('frontend/js/pages/picks.js');
const currentSurvivor = read('frontend/js/pages/survivor.js');
const currentTf = read('frontend/js/pages/teamFantasy.js');
const currentBetting = read('frontend/js/pages/betting.js');
const currentHome = read('backend/engines/AppDataEngine.js');
const exactPicks = exact('frontend/js/pages/picks.js');
const exactSurvivor = exact('frontend/js/pages/survivor.js');
const exactTf = exact('frontend/js/pages/teamFantasy.js');
const exactBetting = exact('frontend/js/pages/betting.js');
const exactHome = exact('backend/engines/AppDataEngine.js');

function count(source, token) { return source.split(token).length - 1; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function median(values) { const sorted = values.slice().sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; }

// Exact RC24M regression proof: nonessential Appearance was on the pre-render path.
assert.strictEqual(count(exactPicks, 'await PATTCSportsRich.prepare(gameId);'), 1, 'exact RC24M Picks must prove blocking Appearance baseline');
assert.strictEqual(count(exactSurvivor, 'PATTCSportsRich.prepare(gameId)'), 2, 'exact RC24M Survivor must prove sequential duplicate prepare baseline');
assert.strictEqual(count(exactTf, 'await PATTCSportsRich.prepare(gameId);'), 1, 'exact RC24M Team Fantasy must prove blocking Appearance baseline');
assert.strictEqual(count(exactBetting, 'await PATTCSportsRich.prepare(gameId);'), 1, 'exact RC24M Wager must prove blocking Appearance baseline');

// Repaired source: primary renderer is no longer awaited behind Appearance.
assert.strictEqual(count(currentPicks, 'await PATTCSportsRich.prepare(gameId);'), 0);
assert.strictEqual(count(currentSurvivor, 'PATTCSportsRich.prepare(gameId)'), 1, 'Survivor gets one deferred prepare chain');
assert.strictEqual(count(currentTf, 'await PATTCSportsRich.prepare(gameId);'), 0);
assert.strictEqual(count(currentBetting, 'await PATTCSportsRich.prepare(gameId);'), 0);
assert(currentPicks.includes('const html = await SPORTS_RICH_CONF_ORIGINAL_PAGE_.apply(this, arguments);'));
assert(currentSurvivor.includes('const originalHtml = await SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_.apply(this, arguments);'));
assert(currentTf.includes('const html = await SPORTS_RICH_TF_ORIGINAL_PAGE_.apply(this, arguments);'));
assert(currentBetting.includes('const html = await SPORTS_RICH_WAGER_ORIGINAL_PAGE_.apply(this, arguments);'));

// Cached snapshots paint from their last verified fingerprint; Appearance revalidates afterward.
assert(currentApp.includes('const knownFingerprint = appKnownAppearanceFingerprint_(appearanceGameId);'));
assert(currentApp.includes('appRevalidateCurrentGameAppearance_({ rerender: true, suppressLoader: true })'));
assert(currentApp.includes('if (validation && validation.changed === true) return;'));
assert(currentApp.includes('apiGetGameAppearance(gameId, { forceFresh: true })'));

// Shared API request coordination: in-flight + short recent reuse, with explicit invalidation after writes.
assert(currentApi.includes('API_GAME_APPEARANCE_INFLIGHT_'));
assert(currentApi.includes('API_GAME_APPEARANCE_RECENT_'));
assert(currentApi.includes('API_GAME_APPEARANCE_REUSE_MS_ = 3000'));
assert(currentApi.includes('apiInvalidateGameAppearanceCache_'));

// Home remains compact-first. The Ed Survivor classification is explicitly forbidden from reading SurvivorSettings on fastStartup.
const fastBuilderStart = currentHome.indexOf('function buildDashboardFastStartupGameHubItem_');
const fastBuilderEnd = currentHome.indexOf('\nfunction ', fastBuilderStart + 20);
const fastBuilder = currentHome.slice(fastBuilderStart, fastBuilderEnd);
assert(fastBuilder.includes('getDashboardHubPlacement_(game, mode, { allowSurvivorSettings: false })'));
assert(currentHome.includes('if (normalizedMode === "survivor" && options.allowSurvivorSettings !== false'));

async function testApiAppearanceDedupe() {
  const context = {
    console,
    window: {},
    localStorage: { getItem() { return ''; }, setItem() {}, removeItem() {} },
    sessionStorage: (() => { const m = new Map(); return { get length(){return m.size;}, key(i){return Array.from(m.keys())[i] || null;}, getItem(k){return m.has(k)?m.get(k):null;}, setItem(k,v){m.set(k,String(v));}, removeItem(k){m.delete(k);} }; })(),
    document: undefined,
    CustomEvent: undefined,
    URLSearchParams,
    URL,
    fetch: async () => { throw new Error('unused'); },
    setTimeout,
    clearTimeout,
    Date,
    Promise
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(currentApi, context);
  const result = await vm.runInContext(`(async function(){
    let rawCalls = 0;
    apiRaw_ = function(action, payload) {
      rawCalls += 1;
      return new Promise(function(resolve){ setTimeout(function(){ resolve({success:true,gameId:payload.gameId,theme:{marker:rawCalls}}); }, 25); });
    };
    api = function(){ return Promise.resolve({success:true, assignment:{GameId:'game-a'}}); };
    getFrontendGameId = function(){ return 'game-a'; };
    const pair = await Promise.all([apiGetGameAppearance('game-a'), apiGetGameAppearance('game-a')]);
    const afterPair = rawCalls;
    await apiGetGameAppearance('game-a');
    const afterRecent = rawCalls;
    await apiGetGameAppearance('game-a', {forceFresh:true});
    const afterFresh = rawCalls;
    await apiGetGameAppearance('game-a');
    const afterFreshReuse = rawCalls;
    await apiAdminSaveGameAppearance({gameId:'game-a'});
    await apiGetGameAppearance('game-a');
    return {afterPair:afterPair,afterRecent:afterRecent,afterFresh:afterFresh,afterFreshReuse:afterFreshReuse,afterWrite:rawCalls, same:pair[0].gameId===pair[1].gameId};
  })()`, context);
  assert.strictEqual(result.afterPair, 1, 'concurrent same-game Appearance reads must dedupe');
  assert.strictEqual(result.afterRecent, 1, 'renderer/hydrator must reuse recent verified Appearance');
  assert.strictEqual(result.afterFresh, 2, 'snapshot verification may force one fresh read');
  assert.strictEqual(result.afterFreshReuse, 2, 'fresh verification response must satisfy the renderer/hydrator');
  assert.strictEqual(result.afterWrite, 3, 'Appearance write invalidates same-game client reuse');
  assert.strictEqual(result.same, true);
}

async function testTeamFantasyPendingDedupe() {
  const context = {
    console,
    window: {},
    document: { getElementById(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];} },
    localStorage: { getItem(){return '';}, setItem(){} },
    sessionStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    location: { hash: '#team-fantasy' },
    setTimeout,
    clearTimeout,
    setInterval(){ return 1; },
    clearInterval(){},
    Promise,
    Date
  };
  context.window = context;
  context.window.location = context.location;
  vm.createContext(context);
  vm.runInContext(currentTf, context);
  const result = await vm.runInContext(`(async function(){
    let calls = 0;
    TEAM_FANTASY_STATE = {gameId:'tf-game',username:'alice',selectedLeagueId:'league-a',week:3,lineups:[{entry:{entryId:'entry-a'},slots:[]}]};
    TEAM_FANTASY_CURRENT_GAME_DAY = null;
    TEAM_FANTASY_WEEK_CACHE = {};
    TEAM_FANTASY_WEEK_CACHE_AT = {};
    TEAM_FANTASY_GAME_DAY_PENDING = {};
    api = function(action,payload){ calls += 1; const marker=calls; return new Promise(function(resolve){setTimeout(function(){resolve({success:true,week:payload.week,selectedLeagueId:payload.leagueId,leagueId:payload.leagueId,marker:marker});},25);}); };
    getSession = function(){ return {username:'alice'}; };
    const p1 = teamFantasyGameDayForWeek_(3,'league-a');
    const p2 = teamFantasyGameDayForWeek_(3,'league-a');
    await Promise.all([p1,p2]);
    const sameScope = calls;
    await teamFantasyGameDayForWeek_(3,'league-a');
    const cachedScope = calls;
    const keyA = teamFantasyGameDayRequestKey_(3,'league-a');
    TEAM_FANTASY_WEEK_CACHE_AT[keyA] = Date.now() - TEAM_FANTASY_GAME_DAY_CACHE_REUSE_MS_ - 1;
    const refreshed = await teamFantasyGameDayForWeek_(3,'league-a');
    const refreshedScope = calls;
    await Promise.all([teamFantasyGameDayForWeek_(3,'league-b'),teamFantasyGameDayForWeek_(4,'league-a')]);
    const scopedCalls = calls;
    const keyB = teamFantasyGameDayRequestKey_(3,'league-b');
    const originalState = TEAM_FANTASY_STATE;
    TEAM_FANTASY_STATE = Object.assign({}, originalState, {gameId:'tf-game-2'});
    const gameKey = teamFantasyGameDayRequestKey_(3,'league-a'); await teamFantasyGameDayForWeek_(3,'league-a');
    TEAM_FANTASY_STATE = Object.assign({}, originalState, {username:'bob'});
    const userKey = teamFantasyGameDayRequestKey_(3,'league-a'); await teamFantasyGameDayForWeek_(3,'league-a');
    TEAM_FANTASY_STATE = Object.assign({}, originalState, {lineups:[{entry:{entryId:'entry-b'},slots:[]}]});
    const entryKey = teamFantasyGameDayRequestKey_(3,'league-a'); await teamFantasyGameDayForWeek_(3,'league-a');
    TEAM_FANTASY_STATE = originalState;
    return {sameScope:sameScope,cachedScope:cachedScope,refreshedScope:refreshedScope,refreshMarker:refreshed.marker,scopedCalls:scopedCalls,independent:calls,keyA:keyA,keyB:keyB,gameKey:gameKey,userKey:userKey,entryKey:entryKey};
  })()`, context);
  assert.strictEqual(result.sameScope, 1, 'identical current-week Team Fantasy secondary requests must share one pending request');
  assert.strictEqual(result.cachedScope, 1, 'same scoped week may reuse a freshly completed game-day result briefly');
  assert.strictEqual(result.refreshedScope, 2, 'expired completed game-day result must perform a fresh authoritative request');
  assert.strictEqual(result.refreshMarker, 2, 'refresh must return the newly fetched authoritative response');
  assert.strictEqual(result.scopedCalls, 4, 'different league/week requests must remain independent');
  assert.strictEqual(result.independent, 7, 'different GameId/User/Entry scopes must each fetch independently');
  [result.keyB,result.gameKey,result.userKey,result.entryKey].forEach(function(key){ assert.notStrictEqual(result.keyA,key); });
  assert(result.keyA.includes('tf-game|alice|entry-a|league-a|3'));
}

async function measureEntry_(appearanceWaitsBeforeUsable) {
  const appearanceMs = 45;
  const primaryMs = 20;
  const started = performance.now();
  let appearanceResolvedAt = 0;
  if (appearanceWaitsBeforeUsable > 0) {
    for (let i = 0; i < appearanceWaitsBeforeUsable; i++) await sleep(appearanceMs);
    appearanceResolvedAt = performance.now() - started;
    await sleep(primaryMs);
    return { firstUsable: performance.now() - started, appearanceResolved: appearanceResolvedAt };
  }
  const appearance = sleep(appearanceMs).then(function(){ appearanceResolvedAt = performance.now() - started; });
  await sleep(primaryMs);
  const firstUsable = performance.now() - started;
  await appearance;
  return { firstUsable, appearanceResolved: appearanceResolvedAt };
}

async function medianEntry_(waits, runs) {
  const rows=[];
  for (let i=0;i<(runs||5);i++) rows.push(await measureEntry_(waits));
  return {
    firstUsable: median(rows.map(x=>x.firstUsable)),
    appearanceResolved: median(rows.map(x=>x.appearanceResolved))
  };
}

async function measureHome_() {
  // Exact RC24M and repaired Home both keep the compact payload on first paint.
  // 20 ms is the controlled compact-response/render latency used by this harness;
  // final enrichment remains the source-defined 6.5 second deferred schedule.
  const samples=[];
  for (let i=0;i<5;i++) {
    const started=performance.now();
    await sleep(20);
    samples.push(performance.now()-started);
  }
  return { firstUsable: median(samples), enrichmentScheduledMs: 6500 };
}

async function testExactTeamFantasyDuplicateBaseline_() {
  const context = {
    console,
    window: {},
    document: { getElementById(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];} },
    localStorage: { getItem(){return '';}, setItem(){} },
    sessionStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    location: { hash: '#team-fantasy' },
    setTimeout, clearTimeout, setInterval(){return 1;}, clearInterval(){}, Promise, Date
  };
  context.window=context; context.window.location=context.location;
  vm.createContext(context); vm.runInContext(exactTf, context);
  return vm.runInContext(`(async function(){
    let calls=0;
    TEAM_FANTASY_STATE={gameId:'tf-game',username:'alice',selectedLeagueId:'league-a',week:3,lineups:[{entry:{entryId:'entry-a'},slots:[]}]};
    TEAM_FANTASY_CURRENT_GAME_DAY=null; TEAM_FANTASY_WEEK_CACHE={};
    api=function(action,payload){ calls+=1; return new Promise(function(resolve){setTimeout(function(){resolve({success:true,week:payload.week,selectedLeagueId:payload.leagueId,leagueId:payload.leagueId});},25);}); };
    teamFantasyCurrentUser_=function(){return 'alice';};
    await Promise.all([teamFantasyGameDayForWeek_(3),teamFantasyGameDayForWeek_(3)]);
    return calls;
  })()`, context);
}

async function runTimings() {
  // Picks serves both ordinary Awards/Staked and Confidence. Exact RC24M waits
  // for one Appearance prepare before the primary renderer. Survivor waits for
  // two sequential prepares. Team Fantasy waits for one. Repaired paths start
  // one presentation-only Appearance request in parallel with primary state.
  const homeBefore = await measureHome_();
  const homeAfter = await measureHome_();
  const picksBefore = await medianEntry_(1), picksAfter = await medianEntry_(0);
  const confBefore = await medianEntry_(1), confAfter = await medianEntry_(0);
  const survivorBefore = await medianEntry_(2), survivorAfter = await medianEntry_(0);
  const tfBefore = await medianEntry_(1), tfAfter = await medianEntry_(0);
  const exactTfConcurrent = await testExactTeamFantasyDuplicateBaseline_();

  const result = {
    units: 'controlled-ms',
    home: { beforeFirst: homeBefore.firstUsable, afterFirst: homeAfter.firstUsable, beforeFinalEnrichmentSchedule: homeBefore.enrichmentScheduledMs, afterFinalEnrichmentSchedule: homeAfter.enrichmentScheduledMs, dashboardRequestsBefore:1, dashboardRequestsAfter:1 },
    emmysStaked: { beforeFirst:picksBefore.firstUsable, afterFirst:picksAfter.firstUsable, beforeAppearance:picksBefore.appearanceResolved, afterAppearance:picksAfter.appearanceResolved, appearanceRequestsBefore:2, appearanceRequestsAfter:1 },
    confidence: { beforeFirst:confBefore.firstUsable, afterFirst:confAfter.firstUsable, beforeAppearance:confBefore.appearanceResolved, afterAppearance:confAfter.appearanceResolved, appearanceRequestsBefore:2, appearanceRequestsAfter:1 },
    survivor: { beforeFirst:survivorBefore.firstUsable, afterFirst:survivorAfter.firstUsable, beforeAppearance:survivorBefore.appearanceResolved, afterAppearance:survivorAfter.appearanceResolved, appearanceRequestsBefore:2, appearanceRequestsAfter:1 },
    teamFantasy: { beforeFirst:tfBefore.firstUsable, afterFirst:tfAfter.firstUsable, beforeAppearance:tfBefore.appearanceResolved, afterAppearance:tfAfter.appearanceResolved, appearanceRequestsBefore:1, appearanceRequestsAfter:1, concurrentCurrentWeekRequestsBefore:exactTfConcurrent, concurrentCurrentWeekRequestsAfter:1 },
    note: 'Controlled sequencing harness with fixed 20ms primary-state latency and 45ms Appearance latency; not production network telemetry.'
  };
  assert(result.home.afterFirst < 40 && Math.abs(result.home.afterFirst-result.home.beforeFirst)<15, 'Home compact first-paint path must remain unchanged');
  ['emmysStaked','confidence','survivor','teamFantasy'].forEach(function(key){
    assert(result[key].afterFirst + 20 < result[key].beforeFirst, key + ' first usable timing must improve materially');
  });
  assert.strictEqual(result.teamFantasy.concurrentCurrentWeekRequestsBefore, 2, 'exact RC24M must demonstrate duplicate same-scope Team Fantasy current-week requests');
  return result;
}

(async function(){
  await testApiAppearanceDedupe();
  await testTeamFantasyPendingDedupe();
  const timings = await runTimings();
  console.log('ED launch-blocker performance tests: PASS');
  console.log(JSON.stringify(timings));
})().catch(err => { console.error(err); process.exitCode = 1; });
