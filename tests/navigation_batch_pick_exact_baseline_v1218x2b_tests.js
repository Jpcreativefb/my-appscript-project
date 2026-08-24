const fs = require('fs');
const assert = require('assert');
function read(p){ return fs.readFileSync(p, 'utf8'); }
const app = read('frontend/js/app.js');
const mirror = read('frontend/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');
for (const [name,text] of [['js/app',app],['app mirror',mirror],['app.html',html],['sw',sw]]) {
  assert(text.includes('v1218v4-reality-draft-switch'), name + ' lost Reality v4 cache marker');
  assert(text.includes('v1218x1b-performance'), name + ' lost x1b performance marker');
  assert(text.includes('v1218x2-fast-nav-batch-picks'), name + ' x2 marker missing');
}
assert(sw.includes('v1218j-team-fantasy'), 'service worker lost Team Fantasy cache history');
assert.strictEqual(app, mirror, 'frontend app mirrors diverged');
assert(app.includes('return [username, "account", pageName].join("|")'), 'Home snapshots are still selected-game keyed');
assert(app.includes('APP_PAGE_SNAPSHOT_STORAGE_PREFIX'), 'persisted page snapshot support missing');
assert(!read('frontend/css/picks.css').includes('content:"Loading game style…"'), 'blocking style loader returned');
console.log('navigation-batch-pick exact baseline v1.2.18x2b tests passed.');
