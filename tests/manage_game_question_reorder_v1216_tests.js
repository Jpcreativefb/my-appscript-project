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
assert(setup.includes('apiAdminSetQuestionOrder('), 'Question reorder must persist the full final order in one API request.');
assert(api.includes('async function apiAdminSetQuestionOrder'), 'Frontend full-order API wrapper missing.');
assert(backendApi.includes('action === "adminSetQuestionOrder"'), 'Backend full-order route missing.');
assert(categories.includes('function adminSetQuestionOrder(payload)'), 'Backend full-order handler missing.');
assert(categories.includes('function adminCatPersistQuestionOrder_'), 'Batch question-order persistence helper missing.');
assert(setup.includes('aria-label="Move question up"') && setup.includes('aria-label="Move question down"'), 'Question reorder buttons missing.');
assert(setup.includes('adminSetupQuestionDragStart_') && setup.includes('adminSetupQuestionDrop_'), 'Desktop drag/drop question reorder missing.');
assert(setup.includes('onchange="event.stopPropagation();adminSetupMoveQuestionToPosition_'), 'Direct position input must save on change.');
assert(setup.includes('"reorder-question": "Question reordered"'), 'Question reorder feedback banner missing.');
assert(css.includes('.admin-question-order-controls'), 'Question reorder controls need responsive styling.');

// Execute the real reorder planning function with persistence stubbed. This
// catches the class of bug where the UI changes but the canonical server order
// is not the order that gets saved.
const context = { console };
vm.createContext(context);
vm.runInContext(categories, context);
let persisted = [];
context.validateGameId = () => {};
context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
context.adminGetGameSetup = () => ({ categories: [
  { categoryId: 'one' },
  { categoryId: 'two' },
  { categoryId: 'three' }
] });
context.adminCatPersistQuestionOrder_ = (_gameId, ids) => { persisted = ids.slice(); };
const result = context.adminReorderQuestion({ gameId: 'demo', categoryId: 'two', direction: -1 });
assert.strictEqual(result.success, true, 'Atomic reorder should succeed.');
assert.deepStrictEqual(
  persisted,
  ['two', 'one', 'three'],
  'Moving question two up must persist the new canonical order.'
);

console.log('PASS: Manage Games shared question-order tests');
