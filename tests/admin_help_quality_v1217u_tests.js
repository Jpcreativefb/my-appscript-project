const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const ui = read('frontend/js/pages/adminUi.js');
const css = read('frontend/css/styles.css');
const app = read('frontend/js/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Auto-help no longer manufactures vague descriptions for unknown controls.
assert(ui.includes('return "";'));
assert(!ui.includes('Review the value before saving because it can affect future application behavior.'));
assert(!ui.includes('return "Controls " + labelText'));

// Exact descriptions prevent broad words such as Status/Layout from hijacking unrelated Studio fields.
assert(ui.includes('"status alignment":'));
assert(ui.includes('"game default question layout":'));
assert(ui.includes('"image canvas mode":'));
assert(ui.includes('"scoreboard background":'));
assert(ui.includes('"question area designer":'));

// Existing label title nodes are reused and legacy duplicate auto-labels are repaired.
assert(ui.includes('function adminUiFindTitleHost_'));
assert(ui.includes('function adminUiRemoveDuplicateTitleNodes_'));
assert(ui.includes('function adminUiRepairLegacyDuplicateLabels_'));
assert(ui.includes('host.classList.add("admin-field-label-auto-host")'));
assert(css.includes('.admin-field-label-auto-host'));

// Section help is only added when useful help text exists.
assert(ui.includes('if (!help) return;'));

// Cache marker forces the repaired shared admin module to load on all admin routes.
assert(app.includes('v1217u-admin-help'));
assert(html.includes('v1217u-admin-help'));
assert(sw.includes('v1217u-admin-help'));

console.log('PASS admin_help_quality_v1217u_tests');
