const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const shellSource = fs.readFileSync(shellPath, 'utf8');
assert.doesNotThrow(() => new Function(shellSource), 'R3B shell must parse');

function makeContext(apiImpl) {
  const calls = { api: [], nav: [], gameIds: [] };
  const host = { innerHTML: '', attrs: {}, getAttribute(k) { return this.attrs[k] || ''; }, setAttribute(k,v) { this.attrs[k] = String(v); } };
  const shell = {
    querySelector(selector) {
      if (selector === '[data-admin-r3b-builder-host]') return host;
      if (selector === '[data-admin-r2-selection-message]') return { textContent: '' };
      return null;
    },
    querySelectorAll() { return []; }
  };
  const document = {
    querySelector(selector) {
      if (selector === '[data-admin-games-design-r1="1"]') return host;
      if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]') return shell;
      return null;
    }
  };
  const context = {
    window: {},
    document,
    console,
    apiAdminCreateGame: async payload => { calls.api.push(payload); return apiImpl ? apiImpl(payload) : { success: true, gameId: payload.gameId, result: { success: true, gameId: payload.gameId } }; },
    navigate: route => calls.nav.push(route),
    setFrontendGameId: gameId => calls.gameIds.push(gameId)
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(shellSource, context);
  return { context, calls, host, shell };
}

function makeForm(overrides = {}) {
  const values = Object.assign({ gameName: 'NFL Test', gameId: 'nfl-test-2026', year: '2026', gameType: 'prediction' }, overrides);
  const status = { textContent: '', attrs: {}, setAttribute(k,v) { this.attrs[k] = String(v); } };
  const button = { disabled: false };
  return {
    elements: Object.fromEntries(Object.entries(values).map(([k,v]) => [k, { value: v }])),
    dataset: {},
    status,
    button,
    querySelector(selector) {
      if (selector === '[data-admin-r3b-status]') return status;
      if (selector === '[data-admin-r3b-submit]') return button;
      return null;
    }
  };
}

async function submit(context, form, choice) {
  return context.pattcAdminGameBuilderR3BSubmit_({ preventDefault() {}, currentTarget: form }, choice);
}

(async () => {
  for (const [choice, type, route] of [
    ['confidence', 'confidence', 'admin-game-setup:nfl-test-2026'],
    ['survivor', 'survivor', 'admin-game-setup:nfl-test-2026'],
    ['team-fantasy', 'team-fantasy', 'admin-team-fantasy']
  ]) {
    const { context, calls } = makeContext();
    const form = makeForm();
    assert.strictEqual(await submit(context, form, choice), true, choice + ' should create');
    assert.strictEqual(calls.api.length, 1, choice + ' must call authoritative create API once');
    assert.strictEqual(calls.api[0].type, type, choice + ' canonical type mismatch');
    assert.deepStrictEqual(
      { active: calls.api[0].active, archived: calls.api[0].archived, defaultGame: calls.api[0].defaultGame, status: calls.api[0].status, lockAllPicks: calls.api[0].lockAllPicks },
      { active: false, archived: false, defaultGame: false, status: 'Draft', lockAllPicks: true },
      choice + ' must preserve authoritative Draft semantics'
    );
    assert.deepStrictEqual(calls.nav, [route], choice + ' destination mismatch');
    if (choice === 'team-fantasy') assert.deepStrictEqual(calls.gameIds, ['nfl-test-2026'], 'Team Fantasy must use setFrontendGameId before manager route');
    else assert.deepStrictEqual(calls.gameIds, [], choice + ' must not use Team Fantasy selection state');
  }

  {
    let initializerCalls = 0;
    const state = makeContext();
    state.context.apiAdminInitializeTeamFantasy = () => { initializerCalls += 1; };
    await submit(state.context, makeForm(), 'team-fantasy');
    assert.strictEqual(initializerCalls, 0, 'R3B must not invoke a Team Fantasy initializer');
    assert.deepStrictEqual(state.calls.gameIds, ['nfl-test-2026']);
    assert.deepStrictEqual(state.calls.nav, ['admin-team-fantasy']);
  }

  {
    const state = makeContext(() => ({ success: false, message: 'Validation failed' }));
    const form = makeForm();
    assert.strictEqual(await submit(state.context, form, 'confidence'), false, 'reported failure must fail');
    assert.strictEqual(state.calls.nav.length, 0, 'reported failure must not navigate');
    assert.strictEqual(form.status.textContent, 'Validation failed', 'failure must be visible');
  }

  {
    const state = makeContext(() => { throw new Error('Network failure'); });
    const form = makeForm();
    assert.strictEqual(await submit(state.context, form, 'survivor'), false, 'thrown failure must fail');
    assert.strictEqual(state.calls.nav.length, 0, 'thrown failure must not navigate');
    assert.strictEqual(form.status.textContent, 'Network failure', 'thrown failure must be visible');
  }

  {
    const state = makeContext(payload => ({ success: true, message: 'Game created', gameId: payload.gameId, result: { success: true, message: 'Game already exists', gameId: payload.gameId, duplicate: true } }));
    const form = makeForm();
    assert.strictEqual(await submit(state.context, form, 'confidence'), true, 'duplicate should safely open existing game');
    assert.strictEqual(state.calls.api.length, 1, 'duplicate must not retry create');
    assert(!/created/i.test(form.status.textContent), 'duplicate must not be labeled newly created');
    assert(/already exists/i.test(form.status.textContent), 'duplicate must show existing-game message');
    assert.deepStrictEqual(state.calls.nav, ['admin-game-setup:nfl-test-2026']);
  }

  {
    let resolveCreate;
    const state = makeContext(() => new Promise(resolve => { resolveCreate = resolve; }));
    const form = makeForm();
    const first = submit(state.context, form, 'confidence');
    const second = await submit(state.context, form, 'confidence');
    assert.strictEqual(second, false, 'second in-flight submit must be ignored');
    assert.strictEqual(state.calls.api.length, 1, 'double-submit must produce one API request');
    assert.strictEqual(form.button.disabled, true, 'submit button must be disabled while in flight');
    resolveCreate({ success: true, result: { success: true } });
    assert.strictEqual(await first, true);
    assert.strictEqual(form.button.disabled, false, 'submit button must re-enable after completion');
  }

  {
    const state = makeContext();
    state.context.pattcAdminGameBuilderR3BOpenPlayoffRace_();
    assert.strictEqual(state.calls.api.length, 0, 'Playoff / Forecast must never create');
    assert.deepStrictEqual(state.calls.nav, ['admin-playoff-race'], 'Playoff / Forecast must open existing manager');
  }

  {
    const allowed = ['prediction','head-to-head','staked-prediction','wager','racing-wager','mixed','voting','ranking'];
    const state = makeContext();
    assert.deepStrictEqual(Array.from(state.context.PATTC_ADMIN_OTHER_GAME_TYPES_R3B), allowed, 'Other Game allowlist mismatch');
    for (const type of allowed) {
      const form = makeForm({ gameId: 'other-' + type, gameType: type });
      assert.strictEqual(await submit(state.context, form, 'other'), true, 'allowed Other Game type must create: ' + type);
      assert.strictEqual(state.calls.api[state.calls.api.length - 1].type, type);
    }
    for (const type of ['confidence','survivor','team-fantasy','season-cup','combo','playoff-race','forecast','traitors','dwts','castle','made-up']) {
      const before = state.calls.api.length;
      const form = makeForm({ gameId: 'blocked-' + type, gameType: type });
      assert.strictEqual(await submit(state.context, form, 'other'), false, 'unsupported Other Game type must be rejected: ' + type);
      assert.strictEqual(state.calls.api.length, before, 'unsupported type must not reach API: ' + type);
      assert(/unsupported/i.test(form.status.textContent));
    }
  }

  {
    const state = makeContext();
    assert.strictEqual(state.context.pattcAdminGameBuilderNavigationShellR2Mount(), true, 'R2 shell should mount');
    const html = state.host.innerHTML;
    for (const heading of ['1. Game Builder','2. Manage Existing Games','3. Competitions','4. League / Season Data','5. Operations']) {
      assert(html.includes(heading), 'R2 lifecycle group missing: ' + heading);
    }
    for (const route of ['admin-games','admin-nfl-cup','admin-nfl-season-setup','admin-sports-engine']) {
      assert(html.includes(route), 'preserved R2 route missing: ' + route);
    }
    assert(html.includes('Manage Games keeps its existing New Game capability.'), 'Manage Games New Game preservation must remain explicit');
    assert(html.includes('Playoff / Forecast'), 'Playoff / Forecast choice must remain visible');
    assert(html.includes('Game Builder Workspace'), 'selected builder must use a dedicated full-width workspace');
    assert(html.indexOf('data-admin-r3b-builder-host') > html.indexOf('5. Operations'), 'workspace must render after lifecycle navigation cards');
    assert(!html.includes('Open Existing Team Fantasy Manager'), 'Team Fantasy manager action must not be duplicated permanently in navigation');
    assert(!html.includes('Open Existing Playoff Race Configuration'), 'Playoff Race manager action must not be duplicated permanently in navigation');
    assert(!html.includes('value="playoff-race"') && !html.includes('value="forecast"'), 'unsupported Playoff / Forecast types must not be emitted');

    state.context.pattcAdminGameBuilderR2Select_('other', 'builder');
    const otherHtml = state.host.innerHTML;
    for (const [value, label] of [
      ['prediction', 'Prediction'],
      ['head-to-head', 'Head-to-Head'],
      ['staked-prediction', 'Staked Prediction'],
      ['wager', 'Wager'],
      ['racing-wager', 'Racing Wager'],
      ['mixed', 'Mixed'],
      ['voting', 'Voting'],
      ['ranking', 'Ranking']
    ]) {
      assert(otherHtml.includes(`value="${value}"`), 'Other Game value missing: ' + value);
      assert(otherHtml.includes(`>${label}</option>`), 'Other Game human label missing: ' + label);
    }

    state.context.pattcAdminGameBuilderR2Select_('playoff-forecast', 'builder');
    const playoffHtml = state.host.innerHTML;
    assert(playoffHtml.includes('New game creation is not available here yet.'), 'Playoff workspace must use admin-facing wording');
    assert(playoffHtml.includes('Open Playoff Race Configuration'), 'Playoff workspace must expose one existing-manager action');
    assert(!playoffHtml.includes('canonical Games type'), 'Playoff workspace must not expose backend implementation terminology');

    state.context.pattcAdminGameBuilderR2Select_('team-fantasy', 'builder');
    const teamFantasyHtml = state.host.innerHTML;
    assert(teamFantasyHtml.includes('Selected Builder — Team Fantasy'), 'Team Fantasy must render in selected workspace');
    assert(teamFantasyHtml.includes('Open Existing Team Fantasy Manager'), 'Team Fantasy selected workspace must offer one existing-manager action');
  }

  console.log('PASS sports game builder orchestration R3B behavior and Preview polish');
})().catch(err => { console.error(err); process.exit(1); });
