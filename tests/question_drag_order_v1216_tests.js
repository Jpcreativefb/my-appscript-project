'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const setup = fs.readFileSync('frontend/js/pages/adminGameSetup.js', 'utf8');
const awards = fs.readFileSync('frontend/js/pages/adminAwards.js', 'utf8');
const api = fs.readFileSync('frontend/js/api.js', 'utf8');
const backendApi = fs.readFileSync('backend/Api.js', 'utf8');
const categories = fs.readFileSync('backend/admin/AdminCategories.js', 'utf8');

assert(setup.includes('class="admin-question-drag-handle"'), 'Manage Games drag handle missing.');
assert(setup.includes('adminSetupQuestionDrop_'), 'Manage Games drop handler missing.');
assert(setup.includes('apiAdminSetQuestionOrder'), 'Manage Games must save one final ordered list.');
assert(!setup.includes('admin-question-position-total">/ ${questionCount}'), 'Redundant question total text should be removed.');
assert(awards.includes('class="awards-drag-handle"'), 'Awards Manager drag handle missing.');
assert(!awards.includes('<span>/ ${rows.length}</span>'), 'Awards Manager redundant total text should be removed.');
assert(api.includes('return apiPost(\n    "adminSetQuestionOrder"'), 'Question order must use POST so orderedCategoryIds remains an array.');
assert(backendApi.includes('if (action === "adminSetQuestionOrder")'), 'Question-order POST route missing.');

// Exercise the batch DisplayOrder writer. Five questions are contiguous in the
// settings sheet, so they should be written in one setValues call.
const context = { console };
vm.createContext(context);
vm.runInContext(categories, context);
const values = [
  ['GameId', 'CategoryId', 'DisplayOrder'],
  ['demo', 'q1', 10],
  ['demo', 'q2', 20],
  ['demo', 'q3', 30],
  ['demo', 'q4', 40],
  ['demo', 'q5', 50]
];
const rangeWrites = [];
const fakeSheet = {
  getDataRange: () => ({ getValues: () => values.map(row => row.slice()) }),
  getRange: (row, col, count, width) => ({
    setValues: next => rangeWrites.push({ row, col, count, width, next })
  })
};
context.getCategorySettingsSheet_ = () => fakeSheet;
context.getCategorySettingsColumnMap_ = () => ({ gameId: 0, categoryId: 1, displayOrder: 2 });
context.validateCategorySettingsColumns_ = () => {};
context.adminCatEnsureHybridHeaders_ = () => {};
context.SpreadsheetApp = { flush: () => {} };
context.adminCatClearCaches_ = () => {};
context.adminCatUpsertCategorySettings_ = () => { throw new Error('No missing rows expected'); };
context.adminCatPersistQuestionOrder_('demo', ['q1', 'q4', 'q2', 'q3', 'q5']);
assert.strictEqual(rangeWrites.length, 1, 'Contiguous question-order rows should be written as one batch.');
assert.strictEqual(
  JSON.stringify(rangeWrites[0].next),
  JSON.stringify([[10], [30], [40], [20], [50]]),
  'Batch writer must assign canonical order values matching the final ordered ID list.'
);

console.log('PASS: Question drag/drop batch persistence');
