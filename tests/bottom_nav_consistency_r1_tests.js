'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const navPath = 'frontend/js/navigationSlotsR1.js';
const nav = read(navPath);
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const appearance = read('backend/engines/AppearanceEngine.js');

assert.strictEqual(appMirror, app, 'frontend app mirrors must remain exact.');

// Backend/Appearance contract.
assert(appearance.includes('"ShowNavIcon",'), 'AppearanceHubSettings must persist ShowNavIcon.');
assert(appearance.includes('row.ShowNavIcon = appearanceBool_(row.ShowNavIcon, true);'), 'Appearance reads must normalize ShowNavIcon.');
assert(appearance.includes('ShowNavIcon: appearanceBool_'), 'Appearance saves must persist ShowNavIcon.');

// Dashboard no longer owns a second nav renderer/cache.
assert(dashboard.includes('appApplyNavigationSlots_(slotRows)'), 'Dashboard must hand nav Appearance to navigationSlotsR1.');
assert(!dashboard.includes('appRememberBottomNavAppearance_();'), 'Dashboard must not remember a second rendered-DOM nav state.');
assert(!dashboard.includes('icon.innerHTML = iconUrl'), 'Dashboard must not directly rewrite bottom-nav icons.');
assert(!dashboard.includes('label.textContent = String(row.DisplayName'), 'Dashboard must not directly rewrite bottom-nav labels.');
assert(dashboard.includes('setTimeout(function() {'), 'Home Appearance application must remain deferred from compact first render.');

// Canonical resolver behavior.
assert(nav.includes('ShowNavIcon:true'), 'Six-slot defaults must carry ShowNavIcon.');
assert(nav.includes("['DisplayName','Color','IconText','IconUrl','IconFileId','ShowNavIcon','ShowNavLabel']"), 'ShowNavIcon must participate in resolver inheritance.');
assert(nav.includes('row.ShowNavIcon = bool(row.ShowNavIcon, true);'), 'Explicit icon OFF must survive normalization.');
assert(nav.includes('if (!hasNavigationRows(rows)) return false;'), 'Empty Appearance must be a no-op.');
assert(nav.includes("button.dataset.navIconState = 'disabled';"), 'Intentional icon OFF needs its own state.');
assert(nav.includes("button.dataset.navIconState = 'load-failed';"), 'Remote icon failure must remain distinct from OFF.');
assert(!nav.includes("icon.textContent = row.IconText || ALLOWED[row.NavDestination].icon;"), 'Blank/disabled icons must not revive destination emoji fallback.');
assert(nav.includes("label.textContent = row.ShowNavLabel === false ? '' : row.DisplayName;"), 'Label OFF must have no stale/fallback text.');
assert(nav.includes('function currentRowsFromAdminState()'), 'Persisted Appearance admin state must participate in the resolved nav source.');
assert(nav.includes('function syncAuthoritativeRows()'), 'Route activation must reapply authoritative persisted Appearance rows.');
assert(nav.includes('syncAuthoritativeRows();'), 'Route changes must not restore stale label state.');
assert(nav.includes('if (hasNavigationRows(source)) remember(rows);'), 'Opening persisted Appearance state must refresh the canonical nav cache.');

// Production still contains legacy cache helpers, but rescue neutralizes them before startup.
assert(nav.includes('root.appRememberBottomNavAppearance_ = function() { return false; };'), 'Rescue must neutralize legacy nav remember cache.');
assert(nav.includes('root.appRestoreBottomNavAppearance_ = function() { return false; };'), 'Rescue must neutralize legacy nav restore cache.');

// Normalization behavior in a browser-free VM.
const callbacks = {};
const storage = new Map();
const localStorage = {
  setItem(k, v) { storage.set(k, String(v)); },
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  removeItem(k) { storage.delete(k); }
};
const noopNav = { innerHTML: '', setAttribute() {}, appendChild() {} };
const document = {
  readyState: 'loading',
  addEventListener(name, fn) { (callbacks[name] || (callbacks[name] = [])).push(fn); },
  getElementById() { return null; },
  querySelector(sel) { return sel === '.bottom-nav' ? noopNav : null; },
  querySelectorAll() { return []; },
  createElement() {
    return {
      dataset: {}, style: { setProperty() {} }, classList: { toggle() {} },
      setAttribute() {}, addEventListener() {}, appendChild() {},
      className: '', textContent: '', hidden: false
    };
  }
};
const windowObj = {
  document,
  localStorage,
  location: { hash: '#dashboard' },
  setTimeout() {},
  Promise
};
windowObj.window = windowObj;
const context = { window: windowObj, document, localStorage, console, setTimeout() {}, encodeURIComponent, isFinite, Promise };
vm.createContext(context);
vm.runInContext(nav, context, { filename: navPath });
const api = windowObj.PATTC_NAVIGATION_SLOTS_R1;
assert(api, 'Navigation R1 API must be exported.');
const rows = api.normalize([
  { SettingKey:'nav:1', HubCategory:'navigation', NavSlot:1, NavDestination:'dashboard', Active:true, ShowNavIcon:false, IconText:'', ShowNavLabel:false, DisplayName:'' },
  { SettingKey:'nav:2', HubCategory:'navigation', NavSlot:2, NavDestination:'hub:sports', Active:true, ShowNavIcon:true, IconText:'', IconUrl:'https://example.invalid/icon.png', ShowNavLabel:true, DisplayName:'Sports' }
]);
assert.strictEqual(rows.length, 6, 'Six-slot navigation contract must be preserved.');
assert.strictEqual(rows[0].ShowNavIcon, false);
assert.strictEqual(rows[0].IconText, '');
assert.strictEqual(rows[0].ShowNavLabel, false);
assert.strictEqual(rows[1].IconText, '');

// Persisted-source conflict: nav:* is the Bottom Nav authority. Hub rows may
// provide inheritance only when an explicit navigation row does not provide the value.
const conflicting = api.normalize([
  { SettingKey:'home', HubCategory:'home', DisplayName:'Home Hub', ShowNavLabel:true, IconText:'H' },
  { SettingKey:'nav:1', HubCategory:'navigation', NavSlot:1, NavDestination:'dashboard', Active:true, ShowNavLabel:false, DisplayName:'Home' },
  { SettingKey:'sports', HubCategory:'sports', DisplayName:'Sports Hub', ShowNavLabel:true, IconText:'S' },
  { SettingKey:'nav:2', HubCategory:'navigation', NavSlot:2, NavDestination:'hub:sports', Active:true, ShowNavLabel:false, DisplayName:'Sports' }
]);
assert.strictEqual(conflicting[0].ShowNavLabel, false, 'nav:1 ShowNavLabel OFF must beat conflicting home row ON.');
assert.strictEqual(conflicting[1].ShowNavLabel, false, 'nav:2 ShowNavLabel OFF must beat conflicting sports row ON.');

// Reproduce the persisted-admin path rather than only synthetic direct apply().
// A stale remembered cache says labels ON; loaded persisted admin rows say OFF.
storage.set('pattcBottomNavSlotsR1', JSON.stringify({version:1, rows:[
  {SettingKey:'nav:1',HubCategory:'navigation',HubGroup:'1',DisplayName:'Home',ShowNavLabel:true,ShowNavIcon:true,Active:true,NavSlot:1,NavDestination:'dashboard'},
  {SettingKey:'nav:2',HubCategory:'navigation',HubGroup:'2',DisplayName:'Sports',ShowNavLabel:true,ShowNavIcon:true,Active:true,NavSlot:2,NavDestination:'hub:sports'}
]}));
windowObj.ADMIN_APPEARANCE_STATE = {dashboard:{hubAppearance:[
  {SettingKey:'home',HubCategory:'home',DisplayName:'Home Hub',ShowNavLabel:true},
  {SettingKey:'sports',HubCategory:'sports',DisplayName:'Sports Hub',ShowNavLabel:true},
  {SettingKey:'nav:1',HubCategory:'navigation',HubGroup:'1',DisplayName:'Home',ShowNavLabel:false,ShowNavIcon:true,Active:true,NavSlot:1,NavDestination:'dashboard'},
  {SettingKey:'nav:2',HubCategory:'navigation',HubGroup:'2',DisplayName:'Sports',ShowNavLabel:false,ShowNavIcon:true,Active:true,NavSlot:2,NavDestination:'hub:sports'}
]}};
windowObj.appSetActiveNavigationSlot_('dashboard');
const rememberedAfterPersistedRoute = JSON.parse(storage.get('pattcBottomNavSlotsR1'));
assert.strictEqual(rememberedAfterPersistedRoute.rows[0].ShowNavLabel, false, 'route activation must replace stale cached Home label ON with persisted nav:1 OFF.');
assert.strictEqual(rememberedAfterPersistedRoute.rows[1].ShowNavLabel, false, 'route activation must replace stale cached Sports label ON with persisted nav:2 OFF.');

// Simulate app.js having defined its old compatibility cache before DOM ready.
let legacyRestoreCalls = 0;
windowObj.appRememberBottomNavAppearance_ = function() { throw new Error('legacy remember should be neutralized'); };
windowObj.appRestoreBottomNavAppearance_ = function() { legacyRestoreCalls += 1; return true; };
windowObj.ensurePageModules_ = function() { return Promise.resolve(); };
(callbacks.DOMContentLoaded || []).forEach(fn => fn());
assert.strictEqual(windowObj.appRememberBottomNavAppearance_(), false);
assert.strictEqual(windowObj.appRestoreBottomNavAppearance_(), false);
assert.strictEqual(legacyRestoreCalls, 0, 'legacy restore must never be replayed after rescue startup.');

console.log('PASS bottom_nav_consistency_r1_tests.js');
