const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const picksFrontend = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const apiFrontend = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const apiBackend = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const picksEngine = fs.readFileSync(path.join(root, 'backend/engines/PicksEngine.js'), 'utf8');
const confidenceBuilder = fs.readFileSync(path.join(root, 'backend/engines/SportsConfidenceBuilderEngine.js'), 'utf8');
const picksCss = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');

// Player UX contract.
assert(picksFrontend.includes('renderCompactConfidenceSlate_'));
assert(picksFrontend.includes('draftConfidenceNominee_'));
assert(picksFrontend.includes('saveConfidenceDraft_'));
assert(picksFrontend.includes('persistConfidenceDraft_'));
assert(picksFrontend.includes('Save All Picks'));
assert(picksFrontend.includes('apiSaveConfidencePicksBatch'));
assert(picksFrontend.includes('shouldRenderCompactConfidenceSlate_'));
assert(picksCss.includes('.confidence-game-row'));
assert(picksCss.includes('.confidence-team-city'));
assert(picksCss.includes('.confidence-team-nickname'));
assert(picksCss.includes('.confidence-team-choice.not-selected'));

// Transport/API contract.
assert(apiFrontend.includes('async function apiSaveConfidencePicksBatch'));
assert(apiFrontend.includes('apiPost("saveConfidencePicksBatch"'));
assert(apiBackend.includes('if (action === "saveConfidencePicksBatch")'));
assert(apiBackend.includes('return json(saveConfidencePicksBatch({'));
assert(picksEngine.includes('function saveConfidencePicksBatch(payload)'));
assert(picksEngine.includes('Build the final Confidence assignment before validating duplicates.'));

// Newly built Sports Confidence rows should remain changeable until kickoff.
assert(confidenceBuilder.includes('maxChanges: -1'));

const headers = [
  'GameId', 'Timestamp', 'Username', 'CategoryId', 'NomineeId', 'Points',
  'OriginalNomineeId', 'ChangeCount', 'LastUpdated', 'ConfidencePoints', 'StakePoints'
];

const rows = [
  headers.slice(),
  ['game-1', new Date('2026-08-17T12:00:00Z'), 'tester', 'cat-a', 'a1', 0, 'a1', 0, new Date('2026-08-17T12:00:00Z'), 2, 0],
  ['game-1', new Date('2026-08-17T12:00:00Z'), 'tester', 'cat-b', 'b1', 0, 'b1', 0, new Date('2026-08-17T12:00:00Z'), 1, 0]
];

const writes = [];
const fakeSheet = {
  getDataRange() {
    return {
      getValues() {
        return rows.map(row => row.slice());
      }
    };
  },
  getRange(row, col, numRows, numCols) {
    return {
      setValues(values) {
        writes.push({ row, col, numRows, numCols, values: values.map(v => v.slice()) });
        values.forEach((valueRow, offset) => {
          rows[row - 1 + offset] = valueRow.slice();
        });
        return this;
      }
    };
  },
  getLastRow() {
    return rows.length;
  }
};

const settings = {
  'cat-a': {
    scoreMode: 'confidence-points',
    locked: false,
    lockDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    maxChanges: 0,
    points: 1,
    changePenalty: 0,
    winnerNomineeId: ''
  },
  'cat-b': {
    scoreMode: 'confidence-points',
    locked: false,
    lockDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    maxChanges: 0,
    points: 1,
    changePenalty: 0,
    winnerNomineeId: ''
  }
};

const categories = [
  { id: 'cat-a', nominees: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'cat-b', nominees: [{ id: 'b1' }, { id: 'b2' }] }
];

const context = {
  console,
  String,
  Number,
  Boolean,
  Array,
  Object,
  JSON,
  Date,
  Math,
  isNaN,
  PICKS_SHEET: 'Picks',
  Logger: { log() {} },
  LockService: {
    getScriptLock() {
      return { waitLock() {}, releaseLock() {} };
    }
  },
  SpreadsheetApp: { flush() {} },
  getDefaultGameId() { return 'game-1'; },
  validateGameId() {},
  getGameRuntimeConfig() {
    return { gameId: 'game-1', type: 'confidence', confidenceEnabled: true };
  },
  getCategorySettingsCached() { return settings; },
  getCategoriesCached() { return categories; },
  getCategoryResultsResolutionMap() { return {}; },
  getHybridCategoryResolution_() { return { resolved: false }; },
  normalizeCategoryScoreMode_(value) {
    return String(value || 'correct-pick').trim().toLowerCase().replace(/_/g, '-');
  },
  getPicksSheet_() { return fakeSheet; },
  AppCache: { clearPicksCaches() {} }
};

vm.createContext(context);
vm.runInContext(picksEngine, context);

// This deliberately swaps 2 and 1 in one transaction while also changing cat-a's
// winner. The existing MaxChanges=0 must not block Confidence edits before kickoff.
const swap = context.saveConfidencePicksBatch({
  username: 'tester',
  gameId: 'game-1',
  picks: [
    { categoryId: 'cat-a', nomineeId: 'a2', confidencePoints: 1 },
    { categoryId: 'cat-b', nomineeId: 'b1', confidencePoints: 2 }
  ]
});

assert.strictEqual(swap.success, true, swap.message || 'batch should succeed');
assert.strictEqual(swap.savedCount, 2);
assert.strictEqual(swap.processedCount, 2);
assert.strictEqual(swap.results.find(r => r.categoryId === 'cat-a').changeCount, 1);
assert.strictEqual(rows[1][headers.indexOf('NomineeId')], 'a2');
assert.strictEqual(rows[1][headers.indexOf('ConfidencePoints')], 1);
assert.strictEqual(rows[2][headers.indexOf('ConfidencePoints')], 2);
assert.strictEqual(writes.length, 1, 'contiguous existing Confidence rows should write as one range');

const writesBeforeDuplicate = writes.length;
const duplicate = context.saveConfidencePicksBatch({
  username: 'tester',
  gameId: 'game-1',
  picks: [
    { categoryId: 'cat-a', nomineeId: 'a2', confidencePoints: 2 },
    { categoryId: 'cat-b', nomineeId: 'b1', confidencePoints: 2 }
  ]
});

assert.strictEqual(duplicate.success, false);
assert(/assigned more than once/i.test(duplicate.message));
assert.strictEqual(writes.length, writesBeforeDuplicate, 'invalid batches must not partially write');

console.log('confidence compact batch v1.2.17a tests passed');
