const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const setup = fs.readFileSync(path.join(root, 'frontend/js/pages/adminGameSetup.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const backendApi = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const categories = fs.readFileSync(path.join(root, 'backend/admin/AdminCategories.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/styles.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(setup.includes('Set automatically by Game Type'));
assert(setup.includes('adminSetupDefaultScoreMode_(game)'));
assert(setup.includes('Delete Question'));
assert(setup.includes('adminSetupDeleteCategory'));
assert(setup.includes('CHANGES MADE — SAVE NOW'));
assert(setup.includes('CHANGES MADE — SAVE ALL NOW'));
assert(setup.includes('ALL CHANGES SAVED ✓'));
assert(setup.includes('apiAdminBulkUpdateGameSetup'));
assert(setup.includes('data-question-editor'));
assert(setup.includes('data-answer-editor'));
assert(api.includes('async function apiAdminBulkUpdateGameSetup'));
assert(api.includes('async function apiAdminDeleteCategory'));
assert(backendApi.includes('"adminBulkUpdateGameSetup"'));
assert(backendApi.includes('"adminDeleteCategory"'));
assert(categories.includes('function adminCatResolveScoreModeForGame_'));
assert(categories.includes('function adminBulkUpdateGameSetup'));
assert(categories.includes('function adminDeleteCategory'));
assert(categories.includes('cannot be permanently deleted'));
assert(css.includes('.admin-save-state-button.is-dirty'));
assert(css.includes('.admin-save-state-button.is-saved'));
assert(sw.includes('awards-app-v256-game-setup-save-delete'));

console.log('game-setup-editor-workflow-tests: PASS');
