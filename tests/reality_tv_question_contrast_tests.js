const fs = require('fs');
const path = require('path');
const assert = require('assert');

const css = fs.readFileSync(path.join(__dirname, '../frontend/css/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '../frontend/sw.js'), 'utf8');

assert(css.includes('v1.0.26 dark-admin contrast fix'));
assert(css.includes('.reality-tv-episode-questions-panel'));
assert(css.includes('background: rgba(15, 23, 42, 0.78)'));
assert(css.includes('color: #f8fafc'));
assert(css.includes('.reality-tv-question-card .reality-tv-result-choice'));
assert(!css.includes('background: var(--card-bg, #fff)'));
assert(app.includes('styles.css?v=281-reality-tv-question-points'));
assert(app.includes('adminRealityTv.js?v='));
assert(sw.includes('v274-reality-tv-question-contrast'));

console.log('Reality TV question contrast tests passed.');
