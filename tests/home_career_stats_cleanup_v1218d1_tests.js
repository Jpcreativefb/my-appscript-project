'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const dashboard = read('frontend/js/pages/dashboard.js');
const css = read('frontend/css/pages.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(dashboard.includes('<div class="dashboard-career-fixed-title">Career Stats</div>'),
  'Career Stats title should sit outside the collapsible details.');
assert(dashboard.includes('dashboard-career-primary dashboard-home-stats-bar'),
  'Primary Games/Wins/Top 3 row is missing.');
assert(dashboard.includes('<b>⌄</b><small>more</small>'),
  'Tiny more disclosure is missing.');
assert(css.includes('.dashboard-career-fixed-title'),
  'Fixed Career Stats title styling is missing.');
assert(css.includes('font-size: 28px'),
  'Primary career stat values were not enlarged.');
assert(css.includes('.dashboard-career-primary > span + span::before'),
  'Primary career stat white separators are missing.');
assert(css.includes('.dashboard-career-extra > span + span::before'),
  'Expanded career stat separator is missing.');
assert(css.includes('grid-template-columns: repeat(3,minmax(0,1fr))'),
  'Mobile Games/Wins/Top 3 layout should remain on one row.');
assert(app.includes('v1218d1-career-stats-cleanup'),
  'App asset marker missing v1.2.18d1.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
assert(pwa.includes('v1218d1-career-stats-cleanup'),
  'PWA marker missing v1.2.18d1.');
assert(sw.includes('v1218d1-career-stats-cleanup'),
  'Service-worker cache marker missing v1.2.18d1.');

console.log('v1.2.18d1 Home Career Stats cleanup tests passed.');
