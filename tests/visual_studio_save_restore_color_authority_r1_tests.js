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

function adapterFor(pageKey, published, initialDraft) {
  let draft = JSON.parse(JSON.stringify(initialDraft));
  let writes = 0;
  return {
    adapter: {
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
    },
    getDraft() { return JSON.parse(JSON.stringify(draft)); },
    getWrites() { return writes; }
  };
}

async function saveRestoreReloadTest() {
  const pageKey = 'dashboard';
  const published = makeManifest(pageKey, 'rgb(10, 20, 30)');
  const savedDraft = makeManifest(pageKey, 'rgb(20, 120, 60)');
  const server = adapterFor(pageKey, published, savedDraft);
  let scheduled = 0;

  const controller = studio.createController(server.adapter, {
    autosave: false,
    assertWritable() {},
    setTimeout() { scheduled += 1; return scheduled; },
    clearTimeout() {}
  });

  await controller.open({ pageKey, gameId: '__pattc_global__' });
  assert.strictEqual(controller.snapshot().manifest.items['id:sample'].style.backgroundColor, 'rgb(20, 120, 60)');

  // Change without Save: Last Saved must remain the persisted Draft.
  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(19, 70, 124)';
  });
  assert.strictEqual(scheduled, 0, 'browser explicit-save mode must schedule no autosave');
  assert.strictEqual(server.getWrites(), 0, 'unsaved edit must not write');

  controller.restoreSelected('id:sample');
  assert.strictEqual(
    controller.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(20, 120, 60)',
    'Restore Selected Last Saved must immediately restore persisted state'
  );
  assert.strictEqual(server.getWrites(), 0, 'Last Saved restore stays local until explicit Save');

  // Explicit Save must persist and survive a fresh controller reload.
  controller.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(15, 90, 45)';
  });
  await controller.flush();
  assert.strictEqual(server.getWrites(), 1, 'explicit Save must persist exactly once');
  assert.strictEqual(server.getDraft().items['id:sample'].style.backgroundColor, 'rgb(15, 90, 45)');

  const reloaded = studio.createController(server.adapter, {
    autosave: false,
    assertWritable() {},
    setTimeout() { scheduled += 1; return scheduled; },
    clearTimeout() {}
  });
  await reloaded.open({ pageKey, gameId: '__pattc_global__' });
  assert.strictEqual(
    reloaded.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(15, 90, 45)',
    'Save -> reload must retain the saved section state'
  );

  // Stale local blue must not overwrite the real server Draft before Revert.
  reloaded.edit(manifest => {
    manifest.items['id:sample'].style.backgroundColor = 'rgb(19, 70, 124)';
  });
  assert.strictEqual(server.getWrites(), 1);
  await reloaded.revert();
  assert.strictEqual(
    reloaded.snapshot().manifest.items['id:sample'].style.backgroundColor,
    'rgb(15, 90, 45)',
    'Revert to Server Draft must discard stale local state'
  );
  assert.strictEqual(reloaded.snapshot().dirty, false);
  assert.strictEqual(server.getWrites(), 1, 'Revert must not race an implicit autosave');
}

function restoreOriginalTest() {
  const manifest = studio.normalize({
    pageKey: 'dashboard',
    items: { 'id:sample': { style: { backgroundColor: 'rgb(19, 70, 124)', padding: 12 } } },
    moves: { 'id:sample': 'id:destination' },
    hidden: { 'id:sample': true },
    collapse: { 'id:sample': { collapsible: true, collapsedColor: '#123456' } },
    responsive: {
      tablet: {
        items: { 'id:sample': { style: { color: '#111111' } } },
        hidden: { 'id:sample': true },
        collapse: { 'id:sample': { defaultOpen: false } }
      },
      mobile: {
        items: { 'id:sample': { style: { color: '#ffffff' } } },
        hidden: { 'id:sample': true },
        collapse: { 'id:sample': { defaultOpen: false } }
      }
    }
  });

  studio.restoreOriginalSelected_(manifest, 'id:sample');
  assert.deepStrictEqual(manifest.items['id:sample'], { original: true, style: {} });
  assert.strictEqual(manifest.moves['id:sample'], undefined);
  assert.strictEqual(manifest.hidden['id:sample'], undefined);
  assert.strictEqual(manifest.collapse['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.tablet.items['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.tablet.hidden['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.tablet.collapse['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.mobile.items['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.mobile.hidden['id:sample'], undefined);
  assert.strictEqual(manifest.responsive.mobile.collapse['id:sample'], undefined);
}

function fakeNode(kind, category) {
  const hub = category ? { getAttribute: name => name === 'data-dashboard-hub-category' ? category : '' } : null;
  const node = {
    closest(selector) {
      if (kind === 'profile' && selector.indexOf('data-dashboard-profile-card') !== -1) return node;
      if (kind === 'hub' && selector === '[data-dashboard-hub-category]') return hub;
      if (kind === 'nav' && selector === '.bottom-nav') return node;
      return null;
    }
  };
  return node;
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
      reality: { HubCategory: 'reality', Color: '#7c3aed' },
      awards: { HubCategory: 'awards', Color: '#b45309' },
      general: { HubCategory: 'general', Color: '#475569' }
    },
    dashboardHubAppearanceRows: [
      { SettingKey: 'nav:1', HubCategory: 'navigation', Color: '#14532d' }
    ]
  };

  const profile = fakeNode('profile');
  const sports = fakeNode('hub', 'sports');
  const reality = fakeNode('hub', 'reality');
  const awards = fakeNode('hub', 'awards');
  const general = fakeNode('hub', 'general');
  const nav = fakeNode('nav');

  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'background-color', state), false,
    'saved profile appearance must beat stored Visual Studio blue');
  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'background-image', state), false,
    'saved profile gradient must beat Visual Studio paint');
  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'color', state), false);
  assert.strictEqual(studio.visualStudioPaintAllowed_(profile, 'padding', state), true,
    'Visual Studio must retain layout authority');

  [sports, reality, awards, general].forEach(node => {
    assert.strictEqual(studio.runtimeManagedPaintTarget_(node), true,
      'Hub card must be recognized as runtime-managed paint');
    assert.strictEqual(studio.visualStudioPaintAllowed_(node, 'background-color', state), false,
      'saved Hub Appearance must beat Visual Studio paint');
    assert.strictEqual(studio.visualStudioPaintAllowed_(node, 'gap', state), true,
      'Hub spacing remains Visual Studio-owned');
  });

  assert.strictEqual(studio.runtimeManagedPaintTarget_(profile), true);
  assert.strictEqual(studio.runtimeManagedPaintTarget_(nav), true);
  assert.strictEqual(studio.visualStudioPaintAllowed_(nav, 'color', state), false,
    'saved Bottom Nav Appearance must beat Visual Studio paint');
  assert.strictEqual(studio.visualStudioPaintAllowed_(nav, 'padding', state), true,
    'Bottom Nav geometry must remain outside the paint authority correction');

  // Cold-load invariant: runtime-managed surfaces reserve paint authority even
  // before Profile/Hub/Nav Appearance data finishes resolving. This prevents a
  // published Visual Studio blue from flashing and then disappearing after a restore.
  const unresolvedAppearance = { profile: {}, dashboardHubAppearanceMap: {}, dashboardHubAppearanceRows: [] };
  [profile, sports, reality, awards, general, nav].forEach(node => {
    assert.strictEqual(studio.visualStudioPaintAllowed_(node, 'background-color', unresolvedAppearance), false,
      'cold-load runtime-managed paint must not fall back to Visual Studio blue');
  });
  assert.strictEqual(studio.visualStudioPaintAllowed_(fakeNode('other'), 'background-color', unresolvedAppearance), true,
    'non-runtime-managed paint remains available to Visual Studio');
}

function sourceContractTest() {
  assert(source.includes('autosave: false'), 'live browser controller must use explicit Save mode');
  assert(source.includes("controller.restoreSelected(existing || selected)"),
    'Last Saved restore must use the resolved selected target');
  assert(source.includes('runtimeManagedPaintTarget_'),
    'runtime paint ownership must not depend on a restore/revert action');
  assert(source.includes("paintAllowed(node, k)"),
    'renderer must honor runtime paint authority');
  assert(source.includes('paintAllowed(node,property)===false'),
    'Original mode must not bypass runtime paint authority');
  assert(source.includes("paintAllowed(header, 'background-color')"),
    'section/collapse header paint must honor runtime authority');
  assert(source.includes("Cold/runtime published Visual Studio manifest"),
    'cold/runtime manifest repaint must be traceable');
  assert(source.includes("Quick Edit / mode switch"),
    'Quick Edit transition must be logged as a non-render transition');
  assert(source.includes("Clear Selection"),
    'selection clearing must be logged as a non-render transition');
  assert(source.includes("authorityTrace: () => copy(authorityTrace)"),
    'live authority trace must be available for Director review');
  assert(source.includes("button('Undo'"), 'Undo control must remain present');
  assert(source.includes("button('Revert to Server Draft'"), 'server Draft revert control must remain present');
  assert(source.includes("button('Restore Selected Original', restoreOriginal)"),
    'Restore Selected Original must remain present');
  assert(source.includes("['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts']"),
    'explicit Save controls must remain present');
}

(async function run() {
  await saveRestoreReloadTest();
  restoreOriginalTest();
  colorAuthorityTest();
  sourceContractTest();
  console.log('PASS visual_studio_save_restore_color_authority_r1_tests');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
