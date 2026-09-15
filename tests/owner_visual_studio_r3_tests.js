'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R3 = require('../frontend/js/ownerVisualStudioR3.js');
const scope = { gameId: 'fixture-team-fantasy', pageKey: 'team-fantasy' };
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

// Actual Appearance backend serializer/upsert/read/ACK routines against an in-memory
// Sheet double. No live API or Google Sheet access is possible in this test.
function server() {
  const tables = new Map();
  class Sheet {
    constructor(headers = []) { this.values = [headers]; }
    getLastRow() { return this.values.length; }
    getLastColumn() { return this.values[0].length; }
    getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
    getRange(row, column, rows, columns) {
      return {
        getValues: () => Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) => this.values[row+r-1]?.[column+c-1] ?? '')),
        setValues: values => values.forEach((v, r) => { this.values[row+r-1] ||= []; v.forEach((x, c) => this.values[row+r-1][column+c-1] = x); })
      };
    }
    appendRow(row) { this.values.push(row.slice()); }
  }
  const spreadsheet = { getSheetByName: name => tables.get(name) || null };
  const engine = { console, SpreadsheetApp: { getActive: () => spreadsheet, flush() {} } };
  vm.createContext(engine);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/AppearanceEngine.js'), 'utf8'), engine);
  // The existing system already exists. No setup or seeded data writes are needed.
  engine.appearanceSetupSystem = () => {};
  for (const name of ['AppearanceImagePacks','AppearanceImagePackItems','AppearanceThemePacks','GameAppearance','AppearanceOverrides','AppearanceHubSettings']) tables.set(name, new Sheet(['id']));
  tables.set('AppearanceOverrides', new Sheet(['GameId','EntityType','EntityId','ImageUrl','ImageFileId','SourceType','SourceUrl','ThemeOverrideJSON','Active','UpdatedAt']));
  const events = []; let active = 0, maxActive = 0, fail = null, stale = null, gate = null;
  const frontend = { console, sessionStorage: { removeItem() {}, setItem() {}, getItem() { throw new Error('Editable Draft must not come from client storage'); } } };
  frontend.window = frontend;
  frontend.api = async (action, payload) => {
    events.push({ action, payload: clone(payload) });
    if (action === 'adminGetAppearanceDashboard') {
      assert(payload._fresh, 'Every Studio read must force freshness');
      return clone(stale || engine.apiAdminGetAppearanceDashboard(payload));
    }
    assert.equal(action, 'adminSaveAppearanceOverride');
    active++; maxActive = Math.max(maxActive, active);
    try { if (gate) { const wait = gate; gate = null; await wait.promise; } if (fail) return fail; return clone(engine.apiAdminSaveAppearanceOverride(payload)); }
    finally { active--; }
  };
  // Load the shipping frontend wrappers, not a replacement serializer/read helper.
  const apiSource = fs.readFileSync(path.join(__dirname, '../frontend/js/api.js'), 'utf8');
  vm.createContext(frontend);
  vm.runInContext(apiSource.slice(apiSource.indexOf('async function apiAdminGetAppearanceDashboard'), apiSource.indexOf('/* ======================\n   ADMIN: REALITY TV SEASON MANAGER')), frontend);
  // Public cache is intentionally wrong; editable Studio must never ask for it.
  frontend.apiGetGameAppearance = () => { throw new Error('Public stale Appearance cache was used'); };
  return { adapter: R3.serverAdapter(frontend), events, tables,
    maxActive: () => maxActive, fail: value => fail = value, stale: value => stale = value, gate: value => gate = value,
    fresh: () => clone(engine.apiAdminGetAppearanceDashboard({ gameId: scope.gameId })) };
}
function controller(backend) {
  const timers = new Map(); let count = 0; const rendered = [], statuses = [];
  const controller = R3.createController(backend.adapter, {
    setTimeout: fn => { const id = ++count; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
    versionId: () => 'test-version-' + (++count), render: manifest => rendered.push(clone(manifest)), onChange: state => statuses.push(state.status)
  });
  return { controller, timers, rendered, statuses };
}
async function main() {
  const backend = server(); let ui = controller(backend), studio = ui.controller;
  await studio.open(scope);
  assert.equal(Object.keys(studio.snapshot().manifest.items).length, 0);
  studio.edit(m => { m.items['id:weeklyPicks'] = { style: { backgroundMode: 'color', backgroundColor: '#8741ad', heightMode: 'fixed', heightPx: 333 } }; m.moves.label = 'id:weeklyPicks'; m.collapse['id:weeklyPicks'] = { collapsible: true, defaultOpen: true, collapseStyle: 'blind', rememberPlayerState: false }; m.responsive = { mobile: { items: { 'id:weeklyPicks': { style: { padding: 12 }, columns: 1 } }, hidden: {}, collapse: { 'id:weeklyPicks': { defaultOpen: false } } }, tablet: { items: { 'id:weeklyPicks': { style: { padding: 18 } } }, hidden: {}, collapse: {} } }; });
  const intended = studio.snapshot().manifest;
  assert.equal(ui.timers.size, 1);
  const autosave = [...ui.timers.values()][0]; autosave(); await studio.flush();
  assert(ui.statuses.includes('Draft Saved')); assert.equal(studio.snapshot().dirty, false);
  assert.equal(R3.exact(R3.rowManifest(backend.fresh(), R3.TYPES.draft, scope.pageKey)), R3.exact(intended));
  const write = backend.events.find(e => e.action === 'adminSaveAppearanceOverride');
  assert.equal(write.payload.entityType, R3.TYPES.draft);
  assert.equal(typeof write.payload.themeOverrideJSON, 'string', 'Real frontend wrapper must serialize the entire manifest');
  assert.equal(R3.exact(JSON.parse(write.payload.themeOverrideJSON)), R3.exact(intended));
  // Simulated hard browser refresh: discard the controller, timers, and every
  // client appearance object. Only the server Sheet rows survive.
  ui = controller(backend); studio = ui.controller; await studio.open(scope);
  assert.equal(R3.exact(studio.snapshot().manifest), R3.exact(intended));
  assert.equal(R3.exact(ui.rendered.at(-1)), R3.exact(intended));

  const gate = deferred(); backend.gate(gate);
  studio.edit(m => m.items['id:weeklyPicks'].style.padding = 20);
  const first = studio.flush(); await tick();
  assert(!studio.snapshot().status.includes('Draft Saved'));
  studio.edit(m => m.items['id:weeklyPicks'].style.padding = 41);
  const second = studio.flush(); gate.resolve(); await Promise.all([first, second]);
  assert.equal(backend.maxActive(), 1, 'Autosaves must never overlap');
  assert.equal(R3.rowManifest(backend.fresh(), R3.TYPES.draft, scope.pageKey).items['id:weeklyPicks'].style.padding, 41);
  assert(!studio.snapshot().dirty);

  backend.fail({ success: false, error: 'fixture write denied' });
  studio.edit(m => m.items['id:weeklyPicks'].style.gap = 9);
  await assert.rejects(studio.flush(), /fixture write denied/);
  assert(studio.snapshot().status.startsWith('Save Failed')); assert(studio.snapshot().dirty);
  backend.fail(null); await studio.flush();
  const stale = backend.fresh(); backend.stale(stale);
  studio.edit(m => m.items['id:weeklyPicks'].style.gap = 17);
  let start = backend.events.length; await assert.rejects(studio.flush(), /5 reads/);
  assert(studio.snapshot().dirty); assert(studio.snapshot().status.startsWith('Save Failed'));
  assert.equal(backend.events.slice(start).filter(e => e.action === 'adminGetAppearanceDashboard').length, 5);
  backend.stale(null); await studio.flush();

  // Live Chrome trace, 2026-09-13: credential-free getGameAppearance returned
  // this body even though the authenticated Draft write succeeded. Never
  // interpret a rejected read as an absent Draft or show ACK-only success.
  const liveReadFailure = { success: false, error: 'Authentication required' };
  backend.stale(liveReadFailure);
  studio.edit(m => m.items['id:weeklyPicks'].style.padding = 43);
  const beforeFailedRead = R3.exact(studio.snapshot().manifest);
  const statusStart = ui.statuses.length;
  await assert.rejects(studio.flush(), /Authentication required/);
  assert(studio.snapshot().dirty);
  assert(!ui.statuses.slice(statusStart).includes('Draft Saved'));
  assert.equal(R3.exact(studio.snapshot().manifest), beforeFailedRead);
  const deniedRefresh = controller(backend);
  await assert.rejects(deniedRefresh.controller.open(scope), /Authentication required/);
  assert.equal(deniedRefresh.rendered.length, 0, 'Rejected read must not render original/default');
  assert.equal(deniedRefresh.controller.snapshot().opened, false);
  backend.stale(null); await studio.flush();
  const authenticatedRefresh = controller(backend);
  await authenticatedRefresh.controller.open(scope);
  assert.equal(R3.exact(authenticatedRefresh.controller.snapshot().manifest), beforeFailedRead);

  studio.edit(m => m.items['id:weeklyPicks'].style.fontSize = 21);
  start = backend.events.length; await studio.publish();
  const types = backend.events.slice(start).map(e => e.action === 'adminGetAppearanceDashboard' ? 'READ' : e.payload.entityType);
  assert.deepEqual(types, [R3.TYPES.draft, 'READ', R3.TYPES.published, 'READ', R3.TYPES.version]);
  assert.equal(studio.snapshot().status, 'Published + VERIFIED');
  const version = (await studio.versions())[0]; const historical = R3.rowManifest(backend.fresh(), R3.TYPES.version, version);
  studio.edit(m => m.items['id:weeklyPicks'].style.fontSize = 55); await studio.flush();
  start = backend.events.length; await studio.restore(version);
  assert.deepEqual(backend.events.slice(start).map(e => e.action === 'adminGetAppearanceDashboard' ? 'READ' : e.payload.entityType), ['READ', R3.TYPES.draft, 'READ']);
  assert.equal(R3.exact(studio.snapshot().manifest), R3.exact(historical));
  assert.equal(R3.exact(ui.rendered.at(-1)), R3.exact(historical));
  const refresh = controller(backend); await refresh.controller.open(scope);
  assert.equal(R3.exact(refresh.controller.snapshot().manifest), R3.exact(historical));

  studio.edit(m => m.items['id:weeklyPicks'].style.fontSize = 24); await studio.flush();
  backend.stale(stale); start = backend.events.length;
  await assert.rejects(studio.publish(), /5 reads/);
  assert(!backend.events.slice(start).some(e => e.payload.entityType === R3.TYPES.version), 'No false Version after a stale Published read');
  backend.stale(null);
  const beforePreview = studio.snapshot().manifest; const calls = backend.events.length;
  const preview = studio.preview(true); preview.items = {};
  assert.equal(R3.exact(studio.snapshot().manifest), R3.exact(beforePreview));
  assert.throws(() => studio.edit(m => m.items = {}), /not editable/);
  await assert.rejects(studio.flush(), /Preview/); await assert.rejects(studio.publish()); await assert.rejects(studio.restore(version));
  assert.equal(backend.events.length, calls, 'Demo must cause zero reads or writes'); studio.preview(false);
  await studio.close(); assert.equal(R3.exact(ui.rendered.at(-1)), R3.exact(studio.snapshot().published));

  // Fallback and malformed/duplicate rows must be deterministic, never silently
  // replace an unreadable Draft with Published/original.
  const published = R3.normalize({ pageKey: scope.pageKey, items: { title: { style: { fontSize: 44 } } } });
  const bundle = { success: true, overrides: [{ EntityType: R3.TYPES.published, EntityId: scope.pageKey, ThemeOverrideJSON: JSON.stringify(published) }] };
  const fallback = R3.createController({ readFresh: async () => bundle, write: async () => ({ success: true }) });
  await fallback.open(scope); assert.equal(R3.exact(fallback.snapshot().manifest), R3.exact(published));
  assert.throws(() => R3.rowManifest({ success: false, overrides: [] }, R3.TYPES.draft, scope.pageKey), /read failed/);
  assert.throws(() => R3.rowManifest({ success: true, overrides: [{ EntityType: R3.TYPES.draft, EntityId: scope.pageKey, ThemeOverrideJSON: '{bad' }] }, R3.TYPES.draft, scope.pageKey));
  const duplicate = clone(bundle); duplicate.overrides.push({ ...duplicate.overrides[0], ThemeOverrideJSON: '{}' });
  assert.throws(() => R3.rowManifest(duplicate, R3.TYPES.published, scope.pageKey), /Conflicting/);
  assert(R3.safeSimilar('span.tf-edit-label')); ['span','button','*','span.x,button'].forEach(s => assert(!R3.safeSimilar(s)));

  const source = fs.readFileSync(path.join(__dirname, '../frontend/js/ownerVisualStudioR3.js'), 'utf8');
  assert(!source.slice(source.indexOf('function createController'), source.indexOf('const safeSimilar')).includes('localStorage'), 'Manifest persistence remains server-only'); assert(!source.includes('sessionStorage'));
  for (const label of ['Whole Page','Element','Section','Cursor selection','Background color','Body font','Header font','Height mode','Fixed + Scroll','Scale %','Move → Pick Destination','Split / Extract','Undo','Original Page','Revert to Server Draft','Apply Style to Similar','Hide Similar','Show Similar','Restore Version']) assert(source.includes(label), label);
  console.log('Owner Visual Studio R3: real wrapper/backend round trip, refresh, autosave serialization, failure, publish, version, restore, stale rejection and demo isolation PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
