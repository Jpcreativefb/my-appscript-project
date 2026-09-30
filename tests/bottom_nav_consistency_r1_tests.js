const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function repoFile(rel) { return path.resolve(process.cwd(), rel); }
function read(rel) { return fs.readFileSync(repoFile(rel), 'utf8'); }
function expectContains(text, needle, message) {
  assert.ok(text.includes(needle), message + `\nMissing: ${needle}`);
}
function expectNotContains(text, needle, message) {
  assert.ok(!text.includes(needle), message + `\nUnexpected: ${needle}`);
}
function functionSlice(source, name, nextName) {
  const start = source.indexOf('function ' + name);
  assert.ok(start >= 0, 'Missing function ' + name);
  const end = nextName ? source.indexOf('function ' + nextName, start + 1) : -1;
  return source.slice(start, end >= 0 ? end : source.length);
}

const navPath = 'frontend/js/navigationSlotsR1.js';
const appPath = 'frontend/js/app.js';
const appMirrorPath = 'frontend/app.js';
const dashboardPath = 'frontend/js/pages/dashboard.js';
const appearancePath = 'backend/engines/AppearanceEngine.js';

const nav = read(navPath);
const app = read(appPath);
const appMirror = read(appMirrorPath);
const dashboard = read(dashboardPath);
const appearance = read(appearancePath);

// Backend contract explicitly carries icon visibility.
expectContains(appearance, '"ShowNavIcon",', 'AppearanceHubSettings must persist ShowNavIcon.');
expectContains(appearance, 'ShowNavIcon: appearanceBool_', 'Appearance save/normalization must preserve ShowNavIcon.');

// app.js must not keep/replay a second rendered-HTML navigation cache.
expectNotContains(app, 'APP_BOTTOM_NAV_APPEARANCE_KEY_', 'app.js must not own a second bottom-nav storage key.');
expectNotContains(app, 'iconHtml:icon.innerHTML', 'app.js must not keep a second HTML/icon cache.');
expectNotContains(app, 'if (icon&&saved.iconHtml) icon.innerHTML=saved.iconHtml;', 'route changes must not replay stale icon HTML.');
assert.strictEqual(appMirror, app, 'frontend/app.js mirror must match frontend/js/app.js exactly.');

// Route completion must be active-state-only: no navigation restore/re-resolution.
const setActiveNav = functionSlice(app, 'setActiveNav', 'app');
expectNotContains(setActiveNav, 'appRestoreBottomNavAppearance_();', 'setActiveNav must not restore/re-render navigation on route completion.');
const navSetActive = functionSlice(nav, 'setActive', 'rawAdminRows');
expectNotContains(navSetActive, 'refresh();', 'navigation setActive must not refresh/re-render all slots.');
expectNotContains(navSetActive, 'restore();', 'navigation setActive must not restore storage state.');
expectNotContains(nav, 'appRefreshNavigationSlots_', 'No public route-time full navigation refresh should remain.');

// Dashboard/Home Hub hands valid nav rows to the resolver but never restores on empty payload.
expectContains(dashboard, 'appApplyNavigationSlots_(slotRows)', 'Dashboard must apply valid Appearance rows through shared navigation resolver.');
expectNotContains(dashboard, 'appRestoreNavigationSlots_()', 'Dashboard empty Appearance must leave the currently resolved nav untouched.');
expectNotContains(dashboard, 'icon.innerHTML = iconUrl', 'Dashboard must not directly rewrite bottom-nav icons.');
expectNotContains(dashboard, 'label.textContent = String(row.DisplayName', 'Dashboard must not directly rewrite bottom-nav labels.');
expectContains(dashboard, 'setTimeout(function() {', 'Home Appearance application must remain deferred from compact first render.');
expectContains(dashboard, 'dashboardApplyHubAppearance_();', 'Deferred Home Appearance application must remain present.');

// Shared resolver preserves explicit OFF and empty Appearance performs no render/restore work.
expectContains(nav, 'ShowNavIcon:true', 'Default six-slot model must carry ShowNavIcon.');
expectContains(nav, 'row.ShowNavIcon = bool(row.ShowNavIcon, true);', 'Normalization must preserve explicit icon OFF.');
expectContains(nav, 'function hasNavigationRows(rows)', 'Resolver must distinguish real nav Appearance from empty input.');
expectContains(nav, 'if (!hasNavigationRows(rows)) return false;', 'Empty Appearance must be a no-op, preserving last resolved navigation.');
expectContains(nav, "button.dataset.navIconState = 'disabled';", 'Intentionally disabled icon must have its own state.');
expectContains(nav, "button.dataset.navIconState = 'load-failed';", 'Remote icon load failure must be distinct from disabled icon.');
expectNotContains(nav, "icon.textContent = row.IconText || ALLOWED[row.NavDestination].icon;", 'Blank/disabled icon must never revive destination emoji fallback.');
expectContains(nav, "label.textContent = row.ShowNavLabel === false ? '' : row.DisplayName;", 'Label OFF must render no fallback text.');

// Execute normalization contract without a browser.
const storage = new Map();
const localStorage = {
  setItem(k, v) { storage.set(k, String(v)); },
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  removeItem(k) { storage.delete(k); }
};
const noopNav = { innerHTML: '', setAttribute() {}, appendChild() {} };
const document = {
  readyState: 'loading',
  addEventListener() {},
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
const context = { window: {}, document, localStorage, console, setTimeout() {}, encodeURIComponent, isFinite };
context.window.window = context.window;
context.window.document = document;
context.window.localStorage = localStorage;
vm.createContext(context);
vm.runInContext(nav, context, { filename: navPath });
const api = context.window.PATTC_NAVIGATION_SLOTS_R1;
assert.ok(api, 'Navigation R1 API must be exported.');
const rows = api.normalize([
  { SettingKey:'nav:1', HubCategory:'navigation', NavSlot:1, NavDestination:'dashboard', Active:true, ShowNavIcon:false, IconText:'', ShowNavLabel:false, DisplayName:'' },
  { SettingKey:'nav:2', HubCategory:'navigation', NavSlot:2, NavDestination:'hub:sports', Active:true, ShowNavIcon:true, IconText:'', IconUrl:'https://example.invalid/icon.png', ShowNavLabel:true, DisplayName:'Sports' }
]);
assert.strictEqual(rows.length, 6, 'Six-slot navigation contract must be preserved.');
assert.strictEqual(rows[0].ShowNavIcon, false, 'Icon OFF must remain false after normalization.');
assert.strictEqual(rows[0].IconText, '', 'Icon OFF/blank icon text must remain blank.');
assert.strictEqual(rows[0].ShowNavLabel, false, 'Label OFF must remain false after normalization.');
assert.strictEqual(rows[1].IconText, '', 'Remote icon row must not gain emoji fallback text.');

console.log('PASS bottom_nav_consistency_r1_tests.js');
