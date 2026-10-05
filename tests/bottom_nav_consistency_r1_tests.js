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
