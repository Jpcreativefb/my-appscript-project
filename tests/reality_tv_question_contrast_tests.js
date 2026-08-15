const fs = require('fs');
const path = require('path');
const assert = require('assert');

const css = fs.readFileSync(path.join(__dirname, '../frontend/css/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../frontend/app.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../frontend/js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '../frontend/sw.js'), 'utf8');

assert(css.includes('v1.0.26 dark-admin contrast fix'));
assert(css.includes('.reality-tv-episode-questions-panel'));
assert(css.includes('background: rgba(15, 23, 42, 0.78)'));
assert(css.includes('color: #f8fafc'));
assert(css.includes('.reality-tv-question-card .reality-tv-result-choice'));
assert(!css.includes('background: var(--card-bg, #fff)'));
assert(app.includes('styles.css?v=282-reality-tv-question-build-verification'));
assert(appJs.includes('adminRealityTv'), 'Reality TV admin page must remain reachable through the lazy page loader.');
assert(sw.includes('const AWARDS_CACHE ='), 'Service worker cache marker is missing.');

console.log('Reality TV question contrast tests passed.');
