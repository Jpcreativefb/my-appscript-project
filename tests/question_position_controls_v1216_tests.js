'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const setup = fs.readFileSync('frontend/js/pages/adminGameSetup.js', 'utf8');
const awards = fs.readFileSync('frontend/js/pages/adminAwards.js', 'utf8');
const api = fs.readFileSync('frontend/js/api.js', 'utf8');
const categories = fs.readFileSync('backend/admin/AdminCategories.js', 'utf8');
const backendApi = fs.readFileSync('backend/Api.js', 'utf8');
const css = fs.readFileSync('frontend/css/styles.css', 'utf8');

assert(setup.includes('adminSetupQuestionDragStart_'), 'Manage Games drag-start handler missing.');
assert(setup.includes('adminSetupQuestionDrop_'), 'Manage Games drop handler missing.');
assert(setup.includes('adminSetupPersistQuestionOrder_'), 'Manage Games shared order persistence helper missing.');
assert(setup.includes('apiAdminSetQuestionOrder('), 'Manage Games must persist the full final question order in one request.');
assert(setup.includes('onchange="event.stopPropagation();adminSetupMoveQuestionToPosition_'), 'Manage Games direct position input must save on change.');
assert(!setup.includes('admin-question-position-total">/ ${questionCount}'), 'Manage Games should not show redundant / total position text.');
assert(setup.includes('Collapse All Questions') && setup.includes('Expand All Questions'), 'Manage Games compact question-list controls missing.');
assert(api.includes('async function apiAdminSetQuestionOrder'), 'Frontend full-order API helper missing.');
assert(backendApi.includes('action === "adminSetQuestionOrder"'), 'Backend full-order API route missing.');
assert(categories.includes('function adminSetQuestionOrder(payload)'), 'Backend full-order action missing.');
assert(categories.includes('function adminCatPersistQuestionOrder_'), 'Backend batch order persistence helper missing.');
assert(categories.includes('contiguous row groups'), 'Backend reorder should batch DisplayOrder writes instead of rereading settings per question.');

assert(awards.includes('adminAwardsBatchDragStart_'), 'Awards Manager drag reorder support missing.');
assert(awards.includes('onchange="event.stopPropagation();adminAwardsMoveBatchRowToPosition_'), 'Awards Manager position input must move on change.');
assert(!awards.includes('<span>/ ${rows.length}</span>'), 'Awards Manager should not show redundant / total position text.');
assert(awards.includes('adminAwardsSetBatchCardsExpanded_'), 'Awards Manager collapse/expand-all control missing.');
assert(css.includes('.admin-question-drag-handle') && css.includes('.awards-drag-handle'), 'Drag handles need shared responsive styling.');
assert(css.includes('@media (max-width: 720px)') && css.includes('display: none;'), 'Drag handles should be hidden on mobile in favor of touch-friendly position controls.');

// Execute the real reorder planning logic with 30 questions. Move #29 directly
// to #4 and verify a single canonical ordered ID list is handed to persistence.
const context = { console };
vm.createContext(context);
vm.runInContext(categories, context);
context.validateGameId = () => {};
context.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
context.adminGetGameSetup = () => ({
  categories: Array.from({ length: 30 }, (_, i) => ({ categoryId: 'q' + (i + 1) }))
});
let persistedGameId = '';
let persistedIds = [];
context.adminCatPersistQuestionOrder_ = (gameId, ids) => {
  persistedGameId = gameId;
  persistedIds = ids.slice();
};

const result = context.adminReorderQuestion({
  gameId: 'demo',
  categoryId: 'q29',
  targetPosition: 4
});
assert.strictEqual(result.success, true, 'Direct-position reorder should succeed.');
assert.strictEqual(result.position, 4, 'Question #29 should report new position #4.');
assert.strictEqual(persistedGameId, 'demo', 'Reorder should persist the correct game.');
assert.deepStrictEqual(
  persistedIds.slice(0, 7),
  ['q1', 'q2', 'q3', 'q29', 'q4', 'q5', 'q6'],
  'Moving #29 to #4 must insert it at #4 and shift following questions down.'
);
assert.strictEqual(persistedIds.length, 30, 'The server should persist one complete 30-question order.');

console.log('PASS: Shared question drag/position ordering controls');
