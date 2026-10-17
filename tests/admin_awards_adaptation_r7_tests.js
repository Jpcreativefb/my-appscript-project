const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const r7Path = path.join(root, 'frontend/js/pages/adminAwardsLifecycleR7.js');
const appPath = path.join(root, 'frontend/app.html');
const awardsEnginePath = path.join(root, 'backend/engines/AwardsManagerEngine.js');
const categoryAdminPath = path.join(root, 'backend/admin/AdminCategories.js');
const scoringPath = path.join(root, 'backend/engines/ScoringEngine.js');

const r7Source = fs.readFileSync(r7Path, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');
const awardsEngineSource = fs.readFileSync(awardsEnginePath, 'utf8');
const categoryAdminSource = fs.readFileSync(categoryAdminPath, 'utf8');
const scoringSource = fs.readFileSync(scoringPath, 'utf8');

assert.doesNotThrow(() => new Function(r7Source), 'Awards R7 lifecycle module must parse');
assert(appSource.includes('./js/pages/adminAwardsLifecycleR7.js?release=awards-adaptation-r7'), 'app shell must load Awards R7 lifecycle module');

function makeClassList() {
  return { toggle() {}, add() {}, remove() {} };
}

function makeHarness(options = {}) {
  const elements = {
    adminAwardsR7GameName: { value: options.name || '2027 Oscars Pool' },
    adminAwardsR7GameId: { value: options.gameId || 'oscars-2027' },
    adminAwardsR7Year: { value: options.year || '2027' },
    adminAwardsR7Type: { value: options.type || 'prediction' },
    adminAwardsR7Message: { textContent: '', classList: makeClassList() },
    adminAwardsR7CreateButton: { disabled: false }
  };
  const state = {
    createCalls: [],
    gamesCalls: 0,
    navigations: [],
    injectedHtml: '',
    eventHandlers: {}
  };
  const sportsCard = {
    insertAdjacentHTML(position, html) {
      assert.strictEqual(position, 'afterend');
      state.injectedHtml = html;
    }
  };
  const document = {
    readyState: 'loading',
    body: {},
    addEventListener(name, fn) { state.eventHandlers[name] = fn; },
    getElementById(id) { return elements[id] || null; },
    querySelector(selector) {
      if (selector === '[data-admin-awards-adaptation-r7="1"]') return null;
      if (selector === '.admin-page [data-admin-games-design-r1="1"]') return sportsCard;
      return null;
    }
  };
  const windowObj = {};
  const context = {
    window: windowObj,
    document,
    MutationObserver: function MutationObserver() { this.observe = function() {}; },
    console,
    setTimeout,
    clearTimeout,
    Promise
  };
  windowObj.window = windowObj;
  windowObj.document = document;
  windowObj.apiAdminGetGames = async function() {
    state.gamesCalls += 1;
    if (options.getGamesResult) return options.getGamesResult;
    return { success: true, games: options.games || [] };
  };
  windowObj.apiAdminCreateGame = options.createGame || (async function(payload) {
    state.createCalls.push(payload);
    return { success: true, gameId: payload.gameId };
  });
  windowObj.navigate = async function(route) {
    state.navigations.push(route);
  };
  vm.createContext(context);
  vm.runInContext(r7Source, context, { filename: r7Path });
  return { context, window: windowObj, document, elements, state };
}

(async () => {
  const expectedTypes = [
    'prediction',
    'confidence',
    'staked-prediction',
    'wager',
    'ranking',
    'mixed'
  ];

  // 1-13: Generic Draft creation contract, allowed types, no Awards/ceremony authority.
  {
    const h = makeHarness();
    assert.deepStrictEqual(Array.from(h.window.ADMIN_AWARDS_R7_TYPES), expectedTypes, 'Awards builder must expose only approved canonical types');

    const defaultPayload = h.window.adminAwardsR7BuildCreatePayload_({
      name: '2027 Oscars Pool',
      gameId: 'Oscars 2027',
      year: '2027'
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(defaultPayload)), {
      name: '2027 Oscars Pool',
      gameId: 'oscars-2027',
      year: '2027',
      type: 'prediction',
      active: false,
      archived: false,
      defaultGame: false,
      status: 'Draft',
      lockAllPicks: true
    }, 'Awards builder must create an ordinary locked inactive Draft game');

    for (const forbiddenType of ['awards', 'oscars', 'emmys', 'grammys', 'survivor', 'season-cup']) {
      assert.throws(
        () => h.window.adminAwardsR7BuildCreatePayload_({ name: 'Test', gameId: 'test', year: '2027', type: forbiddenType }),
        /supported Awards play type/,
        'forbidden/non-R7 game type must be rejected: ' + forbiddenType
      );
    }

    const ceremonyNamePayload = h.window.adminAwardsR7BuildCreatePayload_({
      name: 'Emmys 2028',
      gameId: 'grammys-2028',
      year: '2028'
    });
    assert.strictEqual(ceremonyNamePayload.type, 'prediction', 'ceremony words in Name/GameId must not infer a game type');
    for (const key of Object.keys(ceremonyNamePayload)) {
      assert(!/ceremony|externalEvent|externalMarket/i.test(key), 'Games payload must not gain ceremony/event/market identity: ' + key);
    }
  }

  // 14: normalized duplicate GameId must stop before generic creator runs.
  {
    const h = makeHarness({ games: [{ gameId: 'oscars-2027' }], gameId: 'Oscars 2027' });
    const result = await h.window.adminAwardsR7CreateGame();
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.duplicate, true);
    assert.strictEqual(h.state.createCalls.length, 0, 'duplicate GameId must not call generic creator');
    assert.deepStrictEqual(h.state.navigations, [], 'duplicate GameId must not navigate as if creation succeeded');
    assert(!/^Created\b/.test(h.elements.adminAwardsR7Message.textContent), 'duplicate GameId must not produce false success copy');
  }

  // 15: API failure must produce no false success and no post-create navigation.
  {
    const h = makeHarness({
      createGame: async function(payload) {
        h.state.createCalls.push(payload);
        return { success: false, error: 'Synthetic create failure' };
      }
    });
    const result = await h.window.adminAwardsR7CreateGame();
    assert.strictEqual(result.success, false);
    assert.strictEqual(h.state.navigations.length, 0);
    assert(!/^Created\b/.test(h.elements.adminAwardsR7Message.textContent));
    assert(h.elements.adminAwardsR7Message.textContent.includes('Synthetic create failure'));
  }

  // Generic creator's duplicate response is also treated as failure, not success.
  {
    const h = makeHarness({
      createGame: async function(payload) {
        h.state.createCalls.push(payload);
        return { success: true, duplicate: true, gameId: payload.gameId };
      }
    });
    const result = await h.window.adminAwardsR7CreateGame();
    assert.strictEqual(result.success, false, 'late duplicate response must be converted to R7 failure state');
    assert.strictEqual(h.state.navigations.length, 0);
    assert(!/^Created\b/.test(h.elements.adminAwardsR7Message.textContent));
  }

  // 16: double-submit remains blocked while the first create is unresolved.
  {
    let releaseCreate;
    const firstCreate = new Promise(resolve => { releaseCreate = resolve; });
    const h = makeHarness({
      createGame: async function(payload) {
        h.state.createCalls.push(payload);
        await firstCreate;
        return { success: true, gameId: payload.gameId };
      }
    });
    const first = h.window.adminAwardsR7CreateGame();
    await Promise.resolve();
    await Promise.resolve();
    const second = await h.window.adminAwardsR7CreateGame();
    assert.strictEqual(second.blocked, true, 'second submission must be blocked');
    assert.strictEqual(second.duplicateSubmit, true);
    assert.strictEqual(h.state.createCalls.length, 1, 'double-submit must call creator once');
    releaseCreate();
    await first;
    assert.deepStrictEqual(h.state.navigations, ['admin-awards']);
  }

  // Successful create sends the exact generic payload and opens existing Awards Manager.
  {
    const h = makeHarness({ type: 'confidence' });
    const result = await h.window.adminAwardsR7CreateGame();
    assert.strictEqual(result.success, true);
    assert.strictEqual(h.state.createCalls.length, 1);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(h.state.createCalls[0])), {
      name: '2027 Oscars Pool',
      gameId: 'oscars-2027',
      year: '2027',
      type: 'confidence',
      active: false,
      archived: false,
      defaultGame: false,
      status: 'Draft',
      lockAllPicks: true
    });
    assert.deepStrictEqual(h.state.navigations, ['admin-awards'], 'post-create must open existing Awards Manager');
  }

  // 17-18: lifecycle shell reuses authoritative Manage Existing and Awards routes.
  {
    const h = makeHarness();
    assert.strictEqual(h.window.adminAwardsR7Inject_(), true);
    const html = h.state.injectedHtml;
    assert(html.includes("navigate('admin-games')"), 'Manage Existing must route to admin-games');
    assert(html.includes("navigate('admin-awards')"), 'Awards Manager must route to admin-awards');
    assert(html.includes('Admin → Games &amp; Design → Awards'), 'Awards hierarchy label missing');
    assert.strictEqual((html.match(/value="prediction"/g) || []).length, 1);
    for (const type of expectedTypes) assert(html.includes('value="' + type + '"'), 'missing approved Awards builder type: ' + type);
    for (const type of ['awards', 'survivor', 'season-cup', 'oscars', 'emmys', 'grammys']) {
      assert(!html.includes('value="' + type + '"'), 'forbidden type leaked into Awards builder: ' + type);
    }
    assert(!/ceremony[^<]{0,30}(select|id=|name=)/i.test(html), 'R7 must not add a ceremony selector');
  }

  // 19-21: R7 does not duplicate category/nominee/scoring/settlement ownership.
  for (const forbiddenCall of [
    'apiAdminCreateCategory(',
    'apiAdminCreateNominee(',
    'apiAdminBulkCreateNominees(',
    'adminCreateCategory(',
    'adminBulkCreateNominees(',
    'getLeaderboardData(',
    'CategoryResults',
    'ExternalResultsHubOutbox'
  ]) {
    assert(!r7Source.includes(forbiddenCall), 'R7 shell must not duplicate existing authority: ' + forbiddenCall);
  }
  assert(!/AwardsCeremonyId|ceremonyId|ceremony_id/.test(r7Source), 'R7 must not introduce ceremony schema identity');
  assert(categoryAdminSource.includes('"ExternalEventId"'), 'external event ID must remain category/question-level storage');
  assert(categoryAdminSource.includes('"ExternalMarketId"'), 'external market ID must remain category/question-level storage');
  assert(awardsEngineSource.includes('externalEventId'), 'existing Awards engine must remain event mapping owner');
  assert(awardsEngineSource.includes('externalMarketId'), 'existing Awards engine must remain market mapping owner');
  assert(scoringSource.includes('function getLeaderboardData'), 'generic scoring engine must remain present and untouched by R7 shell');

  // 22-24: static regression guards — no Sports/Reality/R8 routes or implementations are introduced by R7.
  for (const protectedMarker of [
    "navigate('admin-team-fantasy')",
    "navigate('admin-playoff-race')",
    "navigate('admin-nfl-cup')",
    "navigate('admin-reality-tv')"
  ]) {
    assert(!r7Source.includes(protectedMarker), 'R7 must not take over protected Sports/Reality route: ' + protectedMarker);
  }
  for (const r8Marker of ['Prediction Market R8', 'Cookoff', 'generic Voting', 'generic Ranking builder']) {
    assert(!r7Source.includes(r8Marker), 'R7 must not introduce R8 scope: ' + r8Marker);
  }

  console.log('PASS Awards Adaptation R7 lifecycle shell and generic Draft creation contract');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
