'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('frontend/js/app.js', 'utf8');
assert.strictEqual(source, fs.readFileSync('frontend/app.js', 'utf8'));
function extract(name) {
  const match = source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'));
  assert(match, name);
  return match[0];
}
function storage() {
  const rows = new Map();
  return {getItem:k=>rows.get(k)||null, setItem:(k,v)=>rows.set(k,String(v)), removeItem:k=>rows.delete(k)};
}
const key = 'testuser|account|dashboard';
const context = vm.createContext({
  APP_PAGE_SNAPSHOT_CACHE:{}, APP_PAGE_SNAPSHOT_STORAGE_MAX_CHARS:700000,
  APP_PAGE_SNAPSHOT_MAX_MS:600000, localStorage:storage(),sessionStorage:storage(),
  appPageSnapshotEligible_:()=>true,
  appPageSnapshotKey_:()=>key,
  appPageSnapshotStorageKey_:key=>'snapshot:'+key,
  appAppearanceSnapshotSensitivePage_:()=>false
});
for (const name of ['appPageSnapshotHtmlValid_','appDiscardPageSnapshot_',
  'appCapturePageSnapshot_','appReadPageSnapshot_']) vm.runInContext(extract(name),context);
const failed = '<div class="page dashboard-page"><h1>Home</h1><div class="error-card"><h3>Could not load games</h3><p>Failed to fetch</p></div></div>';
const healthy = '<div class="page dashboard-page"><h1>Saved player</h1><h2>My Current Games</h2></div>';
const storageKey = 'snapshot:'+key;

// Reproduce a failure cached by an older build, including copies persisted
// across hard reloads and logout/login. A new render must request Home again.
for (const layer of ['memory','sessionStorage','localStorage']) {
  const item={html:failed,savedAt:Date.now()};
  context.localStorage.setItem('unrelated','keep');
  if(layer==='memory') context.APP_PAGE_SNAPSHOT_CACHE[key]=item;
  else context[layer].setItem(storageKey,JSON.stringify(item));
  assert.strictEqual(context.appReadPageSnapshot_('dashboard'),null,layer+' must reject the cached Home failure');
  assert.strictEqual(context.APP_PAGE_SNAPSHOT_CACHE[key],undefined);
  assert.strictEqual(context.sessionStorage.getItem(storageKey),null);
  assert.strictEqual(context.localStorage.getItem(storageKey),null);
  assert.strictEqual(context.localStorage.getItem('unrelated'),'keep');
}
// New failures must not poison any cache; backend error remains visible in
// the original HTML. Success and unrelated route behavior stay unchanged.
context.appCapturePageSnapshot_('dashboard',{innerHTML:failed});
assert.strictEqual(context.appReadPageSnapshot_('dashboard'),null);
assert(failed.includes('Failed to fetch'));
context.appCapturePageSnapshot_('dashboard',{innerHTML:healthy});
assert.strictEqual(context.appReadPageSnapshot_('dashboard').html,healthy);
assert.strictEqual(context.appPageSnapshotHtmlValid_('more',failed),true);
assert.strictEqual(context.appPageSnapshotHtmlValid_('dashboard','Page failed to load'),false);
assert.strictEqual(context.appPageSnapshotHtmlValid_('dashboard','<div data-route-loading="true">Loading</div>'),false);
console.log('PASS: failed Home snapshots evicted from memory/session/local storage; new errors not cached; successful snapshots and unrelated storage preserved');
