const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js');
const shellSource = fs.readFileSync(shellPath, 'utf8');

assert.doesNotThrow(() => new Function(shellSource), 'Other Games builder shell must parse');

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

const canonicalMatch = shellSource.match(/const OTHER_GAME_TYPES_R3B = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert(canonicalMatch, 'canonical type allowlist missing');
const canonicalActual = Array.from(canonicalMatch[1].matchAll(/"([^"]+)"/g), match => match[1]);
assert.deepStrictEqual(canonicalActual, EXACT_TYPES, 'canonical General / Custom types must remain exactly unchanged');
for (const forbidden of ['cookoff', 'movie-ballot', 'community-awards']) {
  assert(!canonicalActual.includes(forbidden), 'product label leaked into canonical types: ' + forbidden);
}

function sourceBlock(key, nextKey) {
  const start = shellSource.indexOf(`data-admin-other-game="${key}"`);
  assert(start >= 0, 'Other Games card missing: ' + key);
  const end = nextKey ? shellSource.indexOf(`data-admin-other-game="${nextKey}"`, start + 1) : shellSource.indexOf('</div>`;', start);
  return shellSource.slice(start, end > start ? end : undefined);
}

const cards = [
  ['cookoff', 'movie-ranking'],
  ['movie-ranking', 'voting'],
  ['voting', 'ranking'],
  ['ranking', 'general-custom'],
  ['general-custom', 'manage-existing']
];
for (const [key, next] of cards) {
  const block = sourceBlock(key, next);
  assert(block.includes('pattcAdminOtherGameBuilderR3Select_'), key + ' must open the shared in-page builder workspace');
  assert(!block.includes("navigate('admin-games')"), key + ' must not route directly to Manage Existing Games');
}
const manageBlock = sourceBlock('manage-existing', null);
assert(manageBlock.includes("navigate('admin-games')"), 'Manage Existing Games must retain admin-games route');
assert(shellSource.includes('data-admin-other-game-builder-host'), 'Other Games must expose one shared builder workspace');

const productMapMatch = shellSource.match(/const OTHER_GAME_PRODUCT_BUILDERS_R3 = Object\.freeze\(\{([\s\S]*?)\n  \}\);/);
assert(productMapMatch, 'Other Games product-to-canonical builder map missing');
for (const expected of [
  ['cookoff', 'voting'],
  ['movie-ranking', 'ranking'],
  ['voting', 'voting'],
  ['ranking', 'ranking']
]) {
  assert(productMapMatch[1].includes(expected[0]), 'product builder mapping missing: ' + expected[0]);
  assert(productMapMatch[1].includes(`type: "${expected[1]}"`), 'canonical backing type missing for ' + expected[0]);
}

function makeForm(name, gameId, year, gameType) {
  const values = { gameName: name, gameId, year };
  if (gameType) values.gameType = gameType;
  const status = { textContent: '', setAttribute() {} };
  const button = { disabled: false };
  return {
    elements: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }])),
    dataset: {},
    querySelector(selector) {
      if (selector === '[data-admin-r3b-status]') return status;
      if (selector === '[data-admin-r3b-submit]') return button;
      return null;
    }
  };
}

function makeContext() {
  const calls = { api: [], nav: [] };
  const otherHost = { innerHTML: '', scrollIntoView() {} };
  const sportsHost = { innerHTML: '' };
  const message = { textContent: '' };
  const shell = {
    querySelector(selector) {
      if (selector === '[data-admin-other-game-builder-host]') return otherHost;
      if (selector === '[data-admin-r3b-builder-host]') return sportsHost;
      if (selector === '[data-admin-r2-selection-message]') return message;
      return null;
    },
    querySelectorAll() { return []; }
  };
  const context = {
    window: {},
    document: {
      querySelector(selector) {
        if (selector === '[data-shared-game-builder-navigation-shell-r2="1"]') return shell;
        return null;
      }
    },
    console,
    navigate(route) { calls.nav.push(route); },
    apiAdminCreateGame: async payload => {
      calls.api.push(payload);
      return { success: true, result: { success: true, gameId: payload.gameId } };
    },
    setFrontendGameId() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(shellSource, context);
  return { context, calls, otherHost };
}

async function assertProductBuilder(choice, label, expectedType) {
  const state = makeContext();
  assert.strictEqual(state.context.pattcAdminOtherGameBuilderR3Select_(choice), true, label + ' builder should open');
  assert(state.otherHost.innerHTML.includes('Selected Builder — ' + label), label + ' should render a product-focused builder');
  assert(state.otherHost.innerHTML.includes(`<code>${expectedType}</code>`), label + ' should show its canonical backing type');
  assert(!state.otherHost.innerHTML.includes('<select name="gameType"'), label + ' should not ask the user to choose its internal canonical type');

  const form = makeForm(label + ' Test', 'other-r4-' + choice, '2026');
  const result = await state.context.pattcAdminGameBuilderR3BSubmit_({ preventDefault() {}, currentTarget: form }, choice);
  assert.strictEqual(result, true, label + ' Draft creation should succeed');
  assert.strictEqual(state.calls.api.length, 1, label + ' must call the authoritative create API exactly once');
  assert.strictEqual(state.calls.api[0].type, expectedType, label + ' canonical type mismatch');
  assert.strictEqual(state.calls.api[0].status, 'Draft', label + ' must remain Draft creation');
  assert.deepStrictEqual(state.calls.nav, ['admin-game-setup:other-r4-' + choice], label + ' must continue into existing setup authority');
}

(async () => {
  await assertProductBuilder('cookoff', 'Cookoff', 'voting');
  await assertProductBuilder('movie-ranking', 'Movie Ranking / Community Awards', 'ranking');
  await assertProductBuilder('voting', 'Voting / Competition', 'voting');
  await assertProductBuilder('ranking', 'Ranking', 'ranking');

  const general = makeContext();
  assert.strictEqual(general.context.pattcAdminOtherGameBuilderR3Select_('general-custom'), true, 'General / Custom builder should open in-page');
  assert(general.otherHost.innerHTML.includes('General / Custom Game Builder'), 'General / Custom must open the existing generic builder');
  for (const type of EXACT_TYPES) {
    assert(general.otherHost.innerHTML.includes(`<option value="${type}">`), 'General / Custom option missing: ' + type);
  }

  const genericForm = makeForm('General Test', 'other-r4-general', '2026', 'prediction');
  assert.strictEqual(await general.context.pattcAdminGameBuilderR3BSubmit_({ preventDefault() {}, currentTarget: genericForm }, 'other'), true);
  assert.strictEqual(general.calls.api[0].type, 'prediction', 'General / Custom must preserve user-selected canonical type');
  assert.deepStrictEqual(general.calls.nav, ['admin-game-setup:other-r4-general'], 'General / Custom must continue into existing setup authority');

  assert(shellSource.includes('apiAdminCreateGame(payload)'), 'Draft creation must continue to use the existing authoritative API');
  assert(shellSource.includes('navigate("admin-game-setup:" + gameId)'), 'created games must continue into the existing setup authority');
  for (const forbiddenAuthority of [
    'function createCookoff',
    'function createMovieRanking',
    'function saveCookoff',
    'function saveMovieRanking',
    'sportsSurvivorSettle',
    'saveConfidencePicksBatch'
  ]) {
    assert(!shellSource.includes(forbiddenAuthority), 'frontend shell must not duplicate gameplay/backend authority: ' + forbiddenAuthority);
  }

  console.log('PASS Other Games builder routing R4 canonical Draft creation contract');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
