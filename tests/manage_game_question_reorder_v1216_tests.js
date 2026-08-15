'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const setup = fs.readFileSync('frontend/js/pages/adminGameSetup.js', 'utf8');
const api = fs.readFileSync('frontend/js/api.js', 'utf8');
const backendApi = fs.readFileSync('backend/Api.js', 'utf8');
const categories = fs.readFileSync('backend/admin/AdminCategories.js', 'utf8');
const css = fs.readFileSync('frontend/css/styles.css', 'utf8');

assert(setup.includes('function adminSetupMoveQuestionOrder_'), 'Manage Games question reorder handler missing.');
assert(setup.includes('apiAdminReorderQuestion('), 'Question reorder must use the atomic reorder API.');
assert(api.includes('async function apiAdminReorderQuestion'), 'Frontend atomic reorder API wrapper missing.');
assert(backendApi.includes('action === "adminReorderQuestion"'), 'Backend reorder route missing.');
assert(categories.includes('function adminReorderQuestion(payload)'), 'Atomic backend question reorder handler missing.');
assert(categories.includes('displayOrder: (orderIndex + 1) * 10'), 'Question reorder must rewrite stable DisplayOrder values for the full game.');
assert(setup.includes('aria-label="Move question up"') && setup.includes('aria-label="Move question down"'), 'Question reorder buttons missing.');
assert(setup.includes('"reorder-question": "Question reordered"'), 'Question reorder feedback banner missing.');
assert(css.includes('.admin-question-order-controls'), 'Question reorder controls need responsive styling.');

// Execute the real backend reorder function with sheet/lock writes stubbed. This
// catches the exact class of bug where the arrows exist but the stored order
// never changes.
const context = { console };
vm.createContext(context);
vm.runInContext(categories, context);
const writes = [];
context.validateGameId = () => {};
context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
context.SpreadsheetApp = { flush: () => {} };
context.adminGetGameSetup = () => ({ categories: [
  { categoryId: 'one' },
  { categoryId: 'two' },
  { categoryId: 'three' }
] });
context.adminCatUpsertCategorySettings_ = payload => writes.push(payload);
context.adminCatClearCaches_ = () => {};
const result = context.adminReorderQuestion({ gameId: 'demo', categoryId: 'two', direction: -1 });
assert.strictEqual(result.success, true, 'Atomic reorder should succeed.');
assert.deepStrictEqual(
  writes.map(item => [item.categoryId, item.displayOrder]),
  [['two', 10], ['one', 20], ['three', 30]],
  'Moving question two up must persist the new canonical order.'
);

console.log('PASS: Manage Games atomic question reorder tests');
