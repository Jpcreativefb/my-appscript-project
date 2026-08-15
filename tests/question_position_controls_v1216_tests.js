'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const setup = fs.readFileSync('frontend/js/pages/adminGameSetup.js', 'utf8');
const awards = fs.readFileSync('frontend/js/pages/adminAwards.js', 'utf8');
const api = fs.readFileSync('frontend/js/api.js', 'utf8');
const categories = fs.readFileSync('backend/admin/AdminCategories.js', 'utf8');
const css = fs.readFileSync('frontend/css/styles.css', 'utf8');

assert(setup.includes('adminSetupMoveQuestionToPosition_'), 'Manage Games direct-position handler missing.');
assert(setup.includes('categoryPositionInput_'), 'Manage Games must render a visible question-position input.');
assert(setup.includes('Collapse All Questions') && setup.includes('Expand All Questions'), 'Manage Games compact question-list controls missing.');
assert(setup.includes('requested') && setup.includes('apiAdminReorderQuestion('), 'Manage Games reorder request must send an explicit requested position.');
assert(api.includes('targetPosition: Number(targetPosition || 0)'), 'Frontend reorder API must send targetPosition.');
assert(categories.includes('const requestedPosition = Number(payload.targetPosition || 0);'), 'Backend target-position reorder support missing.');
assert(awards.includes('adminAwardsMoveBatchRowToPosition_'), 'Awards Manager direct-position helper missing.');
assert(awards.includes('adminAwardsSetBatchCardsExpanded_'), 'Awards Manager collapse/expand-all control missing.');
assert(awards.includes('type="number"') && awards.includes('Question position'), 'Awards Manager question-position input missing.');
assert(css.includes('.admin-question-position-jump') && css.includes('.awards-position-jump'), 'Position controls need responsive styling.');
assert(css.includes('.awards-question-order-card:not([open]) .awards-build-card-meta'), 'Collapsed Awards cards must reduce to the question-focused summary.');

// Execute the real backend reorder with 30 questions. Move #29 directly to #4
// and verify all stored DisplayOrder values are rewritten canonically.
const context = { console };
vm.createContext(context);
vm.runInContext(categories, context);
const writes = [];
context.validateGameId = () => {};
context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
context.SpreadsheetApp = { flush: () => {} };
context.adminGetGameSetup = () => ({
  categories: Array.from({ length: 30 }, (_, i) => ({ categoryId: 'q' + (i + 1) }))
});
context.adminCatUpsertCategorySettings_ = payload => writes.push(payload);
context.adminCatClearCaches_ = () => {};

const result = context.adminReorderQuestion({
  gameId: 'demo',
  categoryId: 'q29',
  targetPosition: 4
});
assert.strictEqual(result.success, true, 'Direct-position reorder should succeed.');
assert.strictEqual(result.position, 4, 'Question #29 should report new position #4.');
assert.deepStrictEqual(
  writes.slice(0, 7).map(item => item.categoryId),
  ['q1', 'q2', 'q3', 'q29', 'q4', 'q5', 'q6'],
  'Moving #29 to #4 must insert it at #4 and shift following questions down.'
);
assert.deepStrictEqual(
  writes.slice(0, 7).map(item => item.displayOrder),
  [10, 20, 30, 40, 50, 60, 70],
  'Direct-position reorder must rewrite stable canonical display order values.'
);
assert.strictEqual(writes.length, 30, 'All 30 questions should be renumbered after a direct move.');

console.log('PASS: Shared question position controls');
