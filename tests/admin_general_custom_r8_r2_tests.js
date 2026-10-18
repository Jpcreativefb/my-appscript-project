const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const shellSource = fs.readFileSync(shellPath, 'utf8');
assert.doesNotThrow(() => new Function(shellSource), 'R8 R2 shell must parse');

const EXACT_TYPES = [
  'prediction',
  'head-to-head',
  'staked-prediction',
  'wager',
  'racing-wager',
  'mixed',
  'voting',
  'ranking'
];

function makeContext(apiImpl) {
  const calls = { api: [], nav: [] };
  const host = {
    innerHTML: '',
    attrs: {},
    getAttribute(key) { return this.attrs[key] || ''; },
    setAttribute(key, value) { this.attrs[key] = String(value); }
  };
  const workspaceHost = {
    innerHTML: '',
    scrollIntoView() {}
  };
  const shell = {
    querySelector(selector) {
      if (selector === '[data-admin-go-live-workspace-host]') return workspaceHost;
      if (selector === '[data-admin-r3b-builder-host]') return host;
      if (selector === '[data-admin-r2-selection-message]') return { textContent: '' };
      return null;
    },
    querySelectorAll() { return []; }
  };
  const context = {
    window: {},
    document: {
      querySelector(selector) {
        if (selector === '[data-admin-games-design-r1="1"]') return host;
        if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]') return shell;
        return null;
      }
    },
    console,
    apiAdminCreateGame: async payload => {
      calls.api.push(payload);
      return apiImpl ? apiImpl(payload) : {
        success: true,
        gameId: payload.gameId,
        result: { success: true, gameId: payload.gameId }
      };
    },
    navigate: route => calls.nav.push(route),
    setFrontendGameId() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(shellSource, context);
  return { context, calls, host, workspaceHost };
}

function makeForm(overrides = {}) {
  const values = Object.assign({
    gameName: 'General Test',
    gameId: 'general-test-2026',
    year: '2026',
    gameType: 'prediction'
  }, overrides);
  const status = { textContent: '', setAttribute() {} };
  const button = { disabled: false };
  return {
    elements: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }])),
    dataset: {},
    querySelector(selector) {
      if (selector === '[data-admin-r3b-status]') return status;
      if (selector === '[data-admin-r3b-submit]') return button;
      return null;
    },
    status,
    button
  };
}

async function submit(context, form) {
  return context.pattcAdminGameBuilderR3BSubmit_({ preventDefault() {}, currentTarget: form }, 'other');
}

(async () => {
  const state = makeContext();
  assert.deepStrictEqual(Array.from(state.context.PATTC_ADMIN_GENERAL_CUSTOM_TYPES_R8_R2), EXACT_TYPES, 'General / Custom must expose exactly the eight approved canonical types');
  assert.deepStrictEqual(Array.from(state.context.PATTC_ADMIN_OTHER_GAME_TYPES_R3B), EXACT_TYPES, 'R3 allowlist must remain unchanged');

  assert.strictEqual(state.context.pattcAdminGameBuilderNavigationShellR2Mount(), true, 'shared shell should mount');
  const landingHtml = state.host.innerHTML;
  assert(landingHtml.includes('data-admin-go-live-destination="general-custom"'), 'Games & Design landing hub must contain the General / Custom destination');
  assert(landingHtml.includes('General / Custom'), 'Games & Design landing hub must label the General / Custom destination');

  assert.strictEqual(state.context.pattcAdminGamesDesignOpenR2_('general-custom'), true, 'General / Custom destination should open its workspace');
  const html = state.workspaceHost.innerHTML;
  assert(html.includes('Admin → Games &amp; Design → General / Custom'), 'General / Custom workspace must identify its destination');
  assert(html.includes('Manage Existing Games'), 'General / Custom must retain Manage Existing');
  assert(html.includes("navigate('admin-games')"), 'Manage Existing must route to admin-games');
  assert(html.includes('admin-game-setup:&lt;gameId&gt;'), 'generic post-create setup authority must be documented');
  assert(!/Prediction Market/i.test(html), 'R8 must not expose Prediction Market UI');
  assert(!/market shares|trading|portfolio|AMM|LMSR/i.test(html), 'R8 must not expose parked R9 concepts');

  for (const forbidden of ['general', 'custom', 'cookoff', 'judging', 'movie-ballot', 'community-awards', 'prediction-market']) {
    assert(!EXACT_TYPES.includes(forbidden), 'forbidden canonical type leaked into General / Custom: ' + forbidden);
  }

  for (const type of EXACT_TYPES) {
    const local = makeContext();
    const form = makeForm({ gameId: 'r8r2-' + type, gameType: type });
    assert.strictEqual(await submit(local.context, form), true, type + ' should create through the shared creator');
    assert.strictEqual(local.calls.api.length, 1, type + ' should call create exactly once');
    const payload = local.calls.api[0];
    assert.strictEqual(payload.type, type, type + ' canonical type mismatch');
    assert.strictEqual(typeof payload.year, 'number', 'year must be numeric');
    assert.deepStrictEqual(
      { active: payload.active, archived: payload.archived, defaultGame: payload.defaultGame, status: payload.status, lockAllPicks: payload.lockAllPicks },
      { active: false, archived: false, defaultGame: false, status: 'Draft', lockAllPicks: true },
      type + ' Draft flags mismatch'
    );
    assert.deepStrictEqual(local.calls.nav, ['admin-game-setup:r8r2-' + type], type + ' should open existing generic setup authority');
  }

  {
    const local = makeContext();
    const form = makeForm({ year: '20x6' });
    assert.strictEqual(await submit(local.context, form), false, 'invalid year must fail validation');
    assert.strictEqual(local.calls.api.length, 0, 'invalid year must not reach API');
    assert(/four-digit year/i.test(form.status.textContent));
  }

  {
    const local = makeContext(payload => ({
      success: true,
      gameId: payload.gameId,
      result: { success: true, gameId: payload.gameId, duplicate: true, message: 'Game already exists' }
    }));
    const form = makeForm();
    assert.strictEqual(await submit(local.context, form), true, 'duplicate create should safely open the existing game');
    assert.strictEqual(local.calls.api.length, 1, 'duplicate create must not retry');
    assert(/already exists/i.test(form.status.textContent), 'duplicate create must not show false new-create success');
  }

  {
    const local = makeContext(() => ({ success: false, message: 'Create blocked' }));
    const form = makeForm();
    assert.strictEqual(await submit(local.context, form), false, 'reported create failure must fail');
    assert.strictEqual(local.calls.nav.length, 0, 'reported create failure must not navigate');
    assert.strictEqual(form.status.textContent, 'Create blocked');
  }

  {
    let resolveCreate;
    const local = makeContext(() => new Promise(resolve => { resolveCreate = resolve; }));
    const form = makeForm();
    const first = submit(local.context, form);
    const second = await submit(local.context, form);
    assert.strictEqual(second, false, 'second in-flight submit must be blocked');
    assert.strictEqual(local.calls.api.length, 1, 'double-submit must produce one create request');
    assert.strictEqual(form.button.disabled, true, 'submit button must be disabled while create is in flight');
    resolveCreate({ success: true, result: { success: true } });
    assert.strictEqual(await first, true);
    assert.strictEqual(form.button.disabled, false, 'submit button must re-enable after create completes');
  }

  console.log('PASS General / Custom R8 R2 corrected shell and create behavior');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
