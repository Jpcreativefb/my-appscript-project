'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CONFIG_PATH = path.join(__dirname, '..', 'frontend', 'js', 'config.js');
const STUDIO_PATH = path.join(__dirname, '..', 'frontend', 'js', 'ownerVisualStudioR3.js');
const configSource = fs.readFileSync(CONFIG_PATH, 'utf8');
const studioSource = fs.readFileSync(STUDIO_PATH, 'utf8');
const studio = require(STUDIO_PATH);

function createBootHarness() {
  const listeners = {};
  const delegatedTimers = [];
  const microtasks = [];
  const animationFrames = [];
  const originalSetTimeout = function(fn, delay) {
    delegatedTimers.push({fn, delay});
    return delegatedTimers.length + 100;
  };
  const originalClearTimeout = function() {};
  const document = {
    readyState: 'loading',
    documentElement: {},
    body: {},
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
    getElementById() { return null; },
    querySelectorAll() { return []; }
  };
  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; this.observed = false; }
    observe() { this.observed = true; }
    disconnect() { this.observed = false; }
  }
  const window = {
    document,
    setTimeout: originalSetTimeout,
    clearTimeout: originalClearTimeout,
    queueMicrotask(fn) { microtasks.push(fn); },
    requestAnimationFrame(fn) { animationFrames.push(fn); return animationFrames.length; },
    MutationObserver: FakeMutationObserver,
    console: {warn() {}},
    localStorage: {setItem() {}, getItem() { return null; }}
  };
  const sandbox = {window, console, Promise, Function, Object, Array, String, Number, RegExp, Math, JSON, Set, Map};
  vm.runInNewContext(configSource, sandbox, {filename: CONFIG_PATH});
  return {window, listeners, delegatedTimers, microtasks, animationFrames, originalSetTimeout};
}

function fakeStyle(initial) {
  const values = Object.assign({}, initial || {});
  return {
    values,
    getPropertyPriority(name) { return values[name] && values[name].priority || ''; },
    removeProperty(name) { delete values[name]; }
  };
}

function fakeNode(kind, category, style) {
  const hub = category ? {
    getAttribute(name) { return name === 'data-dashboard-hub-category' ? category : ''; }
  } : null;
  const node = {
    nodeType: 1,
    style: style || fakeStyle(),
    closest(selector) {
      if (kind === 'profile' && selector.indexOf('data-dashboard-profile-card') !== -1) return node;
      if (kind === 'hub' && selector === '[data-dashboard-hub-category]') return hub;
      if (kind === 'nav' && selector === '.bottom-nav') return node;
      return null;
    },
    querySelectorAll() { return []; }
  };
  return node;
}

function row(type, id, manifest) {
  return {
    EntityType: type,
    EntityId: id,
    Active: true,
    ThemeOverrideJSON: JSON.stringify(manifest)
  };
}

function makeManifest(pageKey, color) {
  return studio.normalize({
    pageKey,
    items: {
      'id:sample': {
        style: {backgroundMode: 'color', backgroundColor: color}
      }
    }
  });
}

async function saveRestoreContractTest(rescue) {
  const pageKey = 'dashboard';
  const published = makeManifest(pageKey, 'rgb(10, 20, 30)');
  let draft = makeManifest(pageKey, 'rgb(20, 120, 60)');
  let writes = 0;
  let delegated = 0;

  const adapter = {
    async readFresh() {
      return {
        success: true,
        overrides: [
          row(studio.TYPES.published, pageKey, published),
          row(studio.TYPES.draft, pageKey, draft)
        ]
      };
    },
    async write(scope, type, id, manifest) {
      assert.strictEqual(scope.pageKey, pageKey);
      assert.strictEqual(type, studio.TYPES.draft);
      assert.strictEqual(id, pageKey);
      writes += 1;
      draft = JSON.parse(JSON.stringify(manifest));
      return {success: true};
    }
  };

  const guardedTimeout = function(fn, delay) {
    if (rescue.isVisualStudioAutosave(fn, delay)) return 0;
    delegated += 1;
    return delegated;
  };

  const controller = studio.createController(adapter, {
    assertWritable() {},
    setTimeout: guardedTimeout,
    clearTimeout() {}
  });

  await controller.open({pageKey, gameId: '__pattc_global__'});
  assert.strictEqual(controller.snapshot().manifest.items['id:sample'].style.backgroundColor, 'rgb(20, 120, 60)');

  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(19, 70, 124)';
  });
  assert.strictEqual(writes, 0, 'unsaved Visual Studio edit must not write');
  assert.strictEqual(delegated, 0, 'R3 autosave callback must not be delegated');

  controller.restoreSelected('id:sample');
  assert.strictEqual(
    controller.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(20, 120, 60)',
    'Restore Selected Last Saved must immediately return to the persisted Draft'
  );
  assert.strictEqual(writes, 0);

  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(15, 90, 45)';
  });
  await controller.flush();
  assert.strictEqual(writes, 1, 'explicit Save must persist exactly once');
  assert.strictEqual(draft.items['id:sample'].style.backgroundColor, 'rgb(15, 90, 45)');

  const reloaded = studio.createController(adapter, {
    assertWritable() {},
    setTimeout: guardedTimeout,
    clearTimeout() {}
  });
  await reloaded.open({pageKey, gameId: '__pattc_global__'});
  assert.strictEqual(
    reloaded.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(15, 90, 45)',
    'saved section change must remain after reload'
  );

  reloaded.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(19, 70, 124)';
  });
  assert.strictEqual(writes, 1);
  await reloaded.revert();
  assert.strictEqual(
    reloaded.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(15, 90, 45)',
    'Revert to Server Draft must discard stale local paint'
  );
  assert.strictEqual(reloaded.snapshot().dirty, false);
  assert.strictEqual(writes, 1, 'Revert must not allow a stale local autosave to win');
}

function colorAuthorityTest(rescue, window) {
  window.APP_STATE = {
    profile: {
      profileColor: '#178443',
      profileColor2: '#0F5F36',
      profileColorMode: 'gradient'
    },
    dashboardHubAppearanceMap: {
      sports: {HubCategory: 'sports', Color: '#14532d', SecondaryColor: '#052e16'}
    },
    dashboardHubAppearanceRows: [
      {SettingKey: 'sports', HubCategory: 'sports', Color: '#14532d'},
      {SettingKey: 'nav:1', HubCategory: 'navigation', Color: '#14532d', ShowNavIcon: true, ShowNavLabel: false}
    ]
  };

  const profileStyle = fakeStyle({
    'background-color': {value: 'rgb(19, 70, 124)', priority: 'important'},
    'color': {value: 'white', priority: 'important'},
    'padding': {value: '12px', priority: 'important'}
  });
  const profile = fakeNode('profile', '', profileStyle);
  const sports = fakeNode('hub', 'sports', fakeStyle({
    'background-color': {value: 'rgb(19, 70, 124)', priority: 'important'},
    'margin': {value: '8px', priority: 'important'}
  }));
  const nav = fakeNode('nav', '', fakeStyle({
    'color': {value: 'rgb(19, 70, 124)', priority: 'important'},
    'gap': {value: '4px', priority: 'important'}
  }));
  const realityWithoutSavedRow = fakeNode('hub', 'reality', fakeStyle({
    'background-color': {value: 'rgb(19, 70, 124)', priority: 'important'}
  }));

  assert.strictEqual(rescue.runtimeOwnsPaint(profile), true);
  assert.strictEqual(rescue.runtimeOwnsPaint(sports), true);
  assert.strictEqual(rescue.runtimeOwnsPaint(nav), true);
  assert.strictEqual(rescue.runtimeOwnsPaint(realityWithoutSavedRow), false,
    'Visual Studio remains fallback when no runtime Appearance row exists');

  assert.strictEqual(rescue.stripVisualStudioPaint(profile), true);
  assert.strictEqual(profileStyle.values['background-color'], undefined,
    'saved green/gradient profile must be allowed to replace Visual Studio blue');
  assert.strictEqual(profileStyle.values.color, undefined);
  assert(profileStyle.values.padding, 'Visual Studio layout authority must remain');

  rescue.stripVisualStudioPaint(sports);
  assert.strictEqual(sports.style.values['background-color'], undefined);
  assert(sports.style.values.margin, 'Hub layout must remain under Visual Studio control');

  rescue.stripVisualStudioPaint(nav);
  assert.strictEqual(nav.style.values.color, undefined);
  assert(nav.style.values.gap, 'Bottom Nav geometry must not be changed by color authority rescue');

  assert.strictEqual(rescue.stripVisualStudioPaint(realityWithoutSavedRow), false);
  assert(realityWithoutSavedRow.style.values['background-color'],
    'Visual Studio paint stays available as fallback without saved runtime Appearance');
}

function bootTimerContractTest(harness) {
  const rescue = harness.window.PATTC_VISUAL_STUDIO_RESCUE_R1;
  assert(rescue, 'Visual Studio rescue API must install during config boot');
  const autosave = function() { timer = null; api.flush().catch(() => {}); }; // eslint-disable-line no-undef
  assert.strictEqual(rescue.isVisualStudioAutosave(autosave, 650), true);
  assert.strictEqual(rescue.isVisualStudioAutosave(function() {}, 650), false);
  assert.strictEqual(rescue.isVisualStudioAutosave(autosave, 500), false);

  const before = harness.delegatedTimers.length;
  assert.strictEqual(harness.window.setTimeout(autosave, 650), 0,
    'R3 implicit autosave timer must be suppressed');
  assert.strictEqual(harness.delegatedTimers.length, before);
  harness.window.setTimeout(function() {}, 650);
  assert.strictEqual(harness.delegatedTimers.length, before + 1,
    'unrelated 650ms application timers must continue normally');

  const domReady = harness.listeners.DOMContentLoaded || [];
  domReady.forEach(fn => fn({}));
  assert.notStrictEqual(harness.window.setTimeout, harness.originalSetTimeout,
    'timer guard must remain installed through synchronous DOMContentLoaded listeners');
  harness.microtasks.forEach(fn => fn());
  assert.strictEqual(harness.window.setTimeout, harness.originalSetTimeout,
    'global setTimeout must be restored after R3 has mounted');
}

function sourceContractTest() {
  assert(studioSource.includes("button('Restore Selected Original', restoreOriginal)"),
    'Restore Selected Original control must remain wired');
  assert(studioSource.includes("button('Restore Selected Last Saved'"),
    'Restore Selected Last Saved control must remain wired');
  assert(studioSource.includes("button('Undo'"), 'Undo control must remain wired');
  assert(studioSource.includes("button('Revert to Server Draft'"), 'server Draft revert must remain wired');
  assert(studioSource.includes("['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts']"),
    'all explicit Save controls must remain available');
  assert(configSource.includes('Visual Studio Save/Restore + Color Authority Rescue R1'),
    'rescue must remain a narrow boot shim, not a Visual Studio redesign');
  assert(configSource.includes('api.flush().catch'),
    'rescue must target only the known R3 implicit autosave callback');
  assert(configSource.includes('getPropertyPriority(property)==="important"'),
    'only R3 important paint declarations should be stripped');
}

(async function run() {
  const harness = createBootHarness();
  const rescue = harness.window.PATTC_VISUAL_STUDIO_RESCUE_R1;
  bootTimerContractTest(harness);
  colorAuthorityTest(rescue, harness.window);
  await saveRestoreContractTest(rescue);
  sourceContractTest();
  console.log('PASS visual_studio_save_restore_color_authority_r1_tests');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
