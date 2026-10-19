const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const shellSource = fs.readFileSync(path.join(root, 'frontend/js/adminGameBuilderNavigationShellR2.js'), 'utf8');
const adminUiSource = fs.readFileSync(path.join(root, 'frontend/js/pages/adminUi.js'), 'utf8');

assert.doesNotThrow(() => new Function(shellSource), 'Other Games shell must parse');
assert.doesNotThrow(() => new Function(adminUiSource), 'shared Admin UI must parse');

const localChoices = [
  ['cookoff', 'Build Cookoff', 'Selected Builder — Cookoff'],
  ['movie-ranking', 'Build Movie Ranking / Community Awards', 'Selected Builder — Movie Ranking / Community Awards'],
  ['voting', 'Build Voting / Competition', 'Selected Builder — Voting / Competition'],
  ['ranking', 'Build Ranking', 'Selected Builder — Ranking'],
  ['general-custom', 'Open General / Custom Game Builder', 'General / Custom Game Builder']
];

function sourceBlock(choice, nextChoice) {
  const start = shellSource.indexOf(`data-admin-other-game="${choice}"`);
  assert(start >= 0, 'missing Other Games card: ' + choice);
  const end = nextChoice
    ? shellSource.indexOf(`data-admin-other-game="${nextChoice}"`, start + 1)
    : shellSource.indexOf('data-admin-other-game="manage-existing"', start + 1);
  return shellSource.slice(start, end > start ? end : undefined);
}

for (let i = 0; i < localChoices.length; i += 1) {
  const [choice, label] = localChoices[i];
  const next = i + 1 < localChoices.length ? localChoices[i + 1][0] : null;
  const block = sourceBlock(choice, next);
  assert(block.includes('data-admin-no-progress="true"'), label + ' must explicitly opt out of async Admin progress');
  assert(block.includes(`pattcAdminOtherGameBuilderR3Select_('${choice}')`), label + ' must remain a local builder-selection handler');
  assert(!block.includes('apiAdminCreateGame'), label + ' must not create a Draft game on selection');
  assert(!block.includes('navigate('), label + ' must not navigate on selection');
}

function makeClassList(classes) {
  const set = new Set(classes || []);
  return {
    contains(value) { return set.has(value); },
    add(value) { set.add(value); },
    remove(...values) { values.forEach(value => set.delete(value)); }
  };
}

function makeButton(text, dataset) {
  return {
    textContent: text,
    dataset: Object.assign({}, dataset || {}),
    disabled: false,
    isConnected: true,
    classList: makeClassList(['button', 'admin-button']),
    hasAttribute() { return false; },
    closest(selector) {
      if (selector === 'summary') return null;
      return null;
    },
    setAttribute() {},
    removeAttribute() {}
  };
}

function makeAdminUiContext() {
  const listeners = {};
  const timers = [];
  const starts = [];
  const document = {
    addEventListener(type, handler, options) {
      listeners[type] = listeners[type] || [];
      listeners[type].push({ handler, options });
    },
    querySelector() { return null; },
    createElement() { throw new Error('progress DOM creation should be intercepted by test spy'); }
  };
  const context = {
    window: {},
    document,
    console,
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout() {},
    Date,
    MutationObserver: function () { this.observe = function () {}; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(adminUiSource, context);
  context.adminUiStartButton_ = function (button, message) {
    starts.push({ button, message });
  };
  return { context, listeners, timers, starts };
}

function dispatchAdminClick(state, button) {
  const click = (state.listeners.click || []).find(entry => entry.options === true);
  assert(click, 'shared Admin UI capture-phase click interceptor must be registered');
  const event = {
    target: {
      closest(selector) {
        return selector === '.admin-page button' ? button : null;
      }
    }
  };
  click.handler(event);
}

const interceptor = makeAdminUiContext();
for (const [, label] of localChoices) {
  const button = makeButton(label, { adminNoProgress: 'true' });
  const timerCount = interceptor.timers.length;
  dispatchAdminClick(interceptor, button);
  assert.strictEqual(interceptor.timers.length, timerCount, label + ' must be rejected by the real Admin action classifier before Starting state is scheduled');
}
assert.strictEqual(interceptor.starts.length, 0, 'local builder choices must never enter Starting state');

const asyncButton = makeButton('Create Draft Game', {});
dispatchAdminClick(interceptor, asyncButton);
assert.strictEqual(interceptor.timers.length, 1, 'real create action must retain delayed progress instrumentation');
interceptor.timers.shift()();
assert.strictEqual(interceptor.starts.length, 1, 'real create action must still start Admin progress feedback');
assert.strictEqual(interceptor.starts[0].message, 'Starting…', 'real create action must retain Starting feedback before API attachment');

function makeShellContext() {
  const calls = { api: [], nav: [] };
  const otherHost = { innerHTML: '', scrollIntoView() {} };
  const shell = {
    querySelector(selector) {
      if (selector === '[data-admin-other-game-builder-host]') return otherHost;
      if (selector === '[data-admin-r3b-builder-host]') return { innerHTML: '' };
      if (selector === '[data-admin-r2-selection-message]') return { textContent: '' };
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
    apiAdminCreateGame(payload) {
      calls.api.push(payload);
      throw new Error('builder selection must not call apiAdminCreateGame');
    },
    setFrontendGameId() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(shellSource, context);
  return { context, calls, otherHost };
}

for (const [choice, label, expectedWorkspace] of localChoices) {
  const state = makeShellContext();
  assert.strictEqual(state.context.pattcAdminOtherGameBuilderR3Select_(choice), true, label + ' must synchronously open its workspace');
  assert(state.otherHost.innerHTML.includes(expectedWorkspace), label + ' must render the correct builder workspace immediately');
  assert.deepStrictEqual(state.calls.api, [], label + ' must not call apiAdminCreateGame merely by opening the builder');
  assert.deepStrictEqual(state.calls.nav, [], label + ' must not navigate away merely by opening the builder');
}

assert(adminUiSource.includes('button.dataset.adminNoProgress === "true"'), 'shared Admin UI must retain the semantic no-progress classifier');
assert(adminUiSource.includes('document.addEventListener("click"'), 'shared Admin UI must retain its global click instrumentation');
assert(adminUiSource.includes('adminUiStartButton_(button, "Starting…")'), 'genuine action progress feedback must remain active');

console.log('PASS Other Games local-action progress R5 interceptor contract');
