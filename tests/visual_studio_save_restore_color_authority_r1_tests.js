'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(__dirname, '..', 'frontend', 'js', 'ownerVisualStudioR3.js');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const studio = require(SOURCE_PATH);

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
        style: { backgroundMode: 'color', backgroundColor: color }
      }
    }
  });
}

async function controllerSaveRestoreTest() {
  const pageKey = 'dashboard';
  const published = makeManifest(pageKey, 'rgb(10, 20, 30)');
  const persistedDraft = makeManifest(pageKey, 'rgb(20, 120, 60)');
  let draft = JSON.parse(JSON.stringify(persistedDraft));
  let writes = 0;
  let timers = 0;

  const adapter = {
    async readFresh() {
      const overrides = [row(studio.TYPES.published, pageKey, published)];
      if (draft) overrides.push(row(studio.TYPES.draft, pageKey, draft));
      return { success: true, overrides };
    },
    async write(scope, type, id, manifest) {
      assert.strictEqual(scope.pageKey, pageKey);
      assert.strictEqual(type, studio.TYPES.draft);
      assert.strictEqual(id, pageKey);
      writes += 1;
      draft = JSON.parse(JSON.stringify(manifest));
      return { success: true };
    }
  };

  const controller = studio.createController(adapter, {
    autosave: false,
    assertWritable() {},
    setTimeout() { timers += 1; return timers; },
    clearTimeout() {}
  });

  await controller.open({ pageKey, gameId: '__pattc_global__' });
  assert.strictEqual(controller.snapshot().manifest.items['id:sample'].style.backgroundColor, 'rgb(20, 120, 60)');

  // Unsaved edits must not silently become Last Saved.
  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(200, 100, 20)';
  });
  assert.strictEqual(timers, 0, 'explicit-save browser mode must schedule no autosave');
  assert.strictEqual(writes, 0, 'unsaved edit must not write');

  controller.restoreSelected('id:sample');
  assert.strictEqual(
    controller.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(20, 120, 60)',
    'Restore Last Saved must return to the persisted draft'
  );
  assert.strictEqual(writes, 0, 'Restore Last Saved is local until explicit Save');

  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(15, 90, 45)';
  });
  await controller.flush();
  assert.strictEqual(writes, 1, 'explicit Save must persist once');
  assert.strictEqual(draft.items['id:sample'].style.backgroundColor, 'rgb(15, 90, 45)');

  // A later unsaved change must not overwrite the server draft; Revert must
  // reload that actual persisted state.
  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(19, 70, 124)';
  });
  assert.strictEqual(writes, 1);
  await controller.revert();
  assert.strictEqual(
    controller.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(15, 90, 45)',
    'Revert to Server Draft must discard the unsaved blue edit'
  );
  assert.strictEqual(controller.snapshot().dirty, false);
}

function restoreOriginalTest() {
  const manifest = studio.normalize({
    pageKey: 'dashboard',
    items: { 'id:sample': { style: { backgroundColor: 'rgb(19, 70, 124)' } } },
    hidden: { 'id:sample': true },
    collapse: { 'id:sample': { collapsible: true, collapsedColor: '#123456' } },
    responsive: {
      mobile: {
        items: { 'id:sample': { style: { color: '#fff' } } },
        hidden: { 'id:sample': true },
        collapse: { 'id:sample': { defaultOpen: false } }
      }
    }
  });

  studio.restoreOriginalSelected_(manifest, 'id:sample');
  assert.deepStrictEqual(manifest.items['id:sample'], { original: true, style: {} });
  assert.strictEqual(manifest.hidden['id:sample'], undefined);
  assert.strictEqual(manifest.collapse['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.mobile.items['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.mobile.hidden['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.mobile.collapse['id:sample'], undefined);
}

function fakeNode(kind, category) {
  const hub = category ? { getAttribute: name => name === 'data-dashboard-hub-category' ? category : '' } : null;
  return {
    closest(selector) {
      if (kind === 'profile' && selector.indexOf('data-dashboard-profile-card') !== -1) return this;
      if (kind === 'hub' && selector === '[data-dashboard-hub-category]') return hub;
      if (kind === 'nav' && selector === '.bottom-nav') return this;
      return null;
    }
  };
}

function colorAuthorityTest() {
  const state = {
    profile: {
      profileColor: '#178443',
      profileColor2: '#0F5F36',
      profileColorMode: 'gradient'
    },
    dashboardHubAppearanceMap: {
      sports: { HubCategory: 'sports', Color: '#14532d', SecondaryColor: '#052e16' },
      navigation: { SettingKey: 'nav:1', HubCategory: 'navigation', Color: '#14532d' }
    }
  };

  const profile = fakeNode('profile');
  const sports = fakeNode('hub', 'sports');
  const nav = fakeNode('nav');

  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'background-color', state), false,
    'saved profile appearance must beat Visual Studio blue');
  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'color', state), false);
  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'padding', state), true,
    'Visual Studio must retain layout authority');
  assert.strictEqual(studio.visualStudioPaintAllowed_(sports, 'background-color', state), false,
    'saved hub appearance must beat Visual Studio color');
  assert.strictEqual(studio.visualStudioPaintAllowed_(nav, 'color', state), false,
    'saved navigation appearance must beat Visual Studio paint');

  const noSavedAppearance = { profile: {}, dashboardHubAppearanceMap: {} };
  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'background-color', noSavedAppearance), true,
    'Visual Studio color remains the fallback when runtime has no saved appearance');
}

function sourceContractTest() {
  assert(source.includes('autosave: false'), 'live browser controller must use explicit Save mode');
  assert(source.includes("controller.restoreSelected(existing || selected)"), 'Last Saved restore must use resolved selected key');
  assert(source.includes("paintAllowed(node, k)"), 'renderer must honor runtime paint authority');
  assert(source.includes("button('Undo'"), 'Undo control must remain present');
  assert(source.includes("button('Revert to Server Draft'"), 'server Draft revert control must remain present');
}

(async function run() {
  await controllerSaveRestoreTest();
  restoreOriginalTest();
  colorAuthorityTest();
  sourceContractTest();
  console.log('PASS visual_studio_save_restore_color_authority_r1_tests');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
