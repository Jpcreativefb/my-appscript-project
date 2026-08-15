const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { assertCurrentReleaseMarkers } = require('../tools/release_test_helpers');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const categoryResults = fs.readFileSync(path.join(root, 'backend/engines/CategoryResultsEngine.js'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'backend/engines/ExternalResultsHubBridgeEngine.js'), 'utf8');
const adminCategories = fs.readFileSync(path.join(root, 'backend/admin/AdminCategories.js'), 'utf8');
const adminUi = fs.readFileSync(path.join(root, 'frontend/js/pages/adminUi.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} is missing`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

const dedupe = functionSource(categoryResults, 'dedupeCategoryResultsForCategory_');
assert(dedupe.includes('newestByKey'), 'CategoryResults dedupe must keep one canonical row per key');
assert(dedupe.includes('candidate.time > current.time'), 'CategoryResults dedupe must prefer the newest settled row');
assert(dedupe.includes('candidate.rowNumber > current.rowNumber'), 'CategoryResults dedupe needs a deterministic row-order tiebreaker');
assert(dedupe.includes('duplicateRows') && dedupe.includes('.sort(function(a, b)'), 'Duplicate rows must be deleted bottom-up');
assert(dedupe.includes('sh.deleteRow'), 'CategoryResults dedupe must physically remove duplicate legacy rows');


// Runtime check: only duplicate keys in the target category are removed, and the newest row survives.
const headers = ['Timestamp','GameId','CategoryId','NomineeId','ResultStatus','IsWinner','FinalRank','FinalPosition','ResultValue','ResultSource','SettledAt','Notes'];
const rows = [
  headers.slice(),
  [new Date('2026-08-09T10:00:00Z'),'winn-2026','cool-dude','tkaiya','settled',true,'','','Test Nominee A','external-results-hub:manual-awards',new Date('2026-08-09T10:00:00Z'),'old winner'],
  [new Date('2026-08-09T10:00:00Z'),'winn-2026','cool-dude','john','settled',false,'','','Test Nominee A','external-results-hub:manual-awards',new Date('2026-08-09T10:00:00Z'),'old duplicate'],
  [new Date('2026-08-09T10:05:00Z'),'winn-2026','cool-dude','john','settled',false,'','','Test Nominee A','external-results-hub:manual-awards',new Date('2026-08-09T10:05:00Z'),'new canonical'],
  [new Date('2026-08-09T10:00:00Z'),'other-game','cool-dude','john','settled',false,'','','Other','manual',new Date('2026-08-09T10:00:00Z'),'must remain']
];
const deletedRows = [];
const fakeSheet = {
  getLastRow: () => rows.length,
  getDataRange: () => ({ getValues: () => rows.map(row => row.slice()) }),
  deleteRow: rowNumber => { deletedRows.push(rowNumber); rows.splice(rowNumber - 1, 1); }
};
const ctx = {
  Date,
  String,
  isNaN,
  CATEGORY_RESULTS_SHEET: 'CategoryResults',
  setupCategoryResultsSystem: () => {},
  clearAppCaches: () => {},
  SpreadsheetApp: { getActive: () => ({ getSheetByName: () => fakeSheet }) }
};
vm.createContext(ctx);
vm.runInContext(`
  ${functionSource(categoryResults, 'categoryResultsString_')}
  ${functionSource(categoryResults, 'categoryResultsKey_')}
  ${functionSource(categoryResults, 'categoryResultsHeaderMap_')}
  ${dedupe}
`, ctx);
const dedupeResult = ctx.dedupeCategoryResultsForCategory_('winn-2026', 'cool-dude');
assert.strictEqual(dedupeResult.removed, 1, 'One duplicate john row should be removed');
assert.deepStrictEqual(deletedRows, [3], 'The older duplicate row should be deleted');
assert.strictEqual(rows.length, 4, 'Non-target rows must remain');
assert.strictEqual(rows[2][11], 'new canonical', 'Newest duplicate must survive');

const applyGeneric = functionSource(bridge, 'externalResultsInboxApplyGeneric_');
assert(applyGeneric.includes('externalResultsInboxDedupeCategoryResults_'), 'External Results Inbox generic apply must repair duplicate CategoryResults rows');
assert(applyGeneric.includes('duplicateRowsRemoved'), 'Apply result should report how many duplicate result rows were removed');
const dedupeBridge = functionSource(bridge, 'externalResultsInboxDedupeCategoryResults_');
assert(dedupeBridge.includes('dedupeCategoryResultsForCategory_'), 'Inbox idempotent paths must be able to repair legacy duplicate CategoryResults rows');
const validateInbox = functionSource(bridge, 'apiAdminValidateExternalResultsInbox');
assert(validateInbox.includes('externalResultsInboxDedupeCategoryResults_(result)'), 'Already-applied validation must repair duplicates without re-settling');
assert(applyGeneric.includes('skipCategoryResultWrite: true'), 'External Results apply must prevent adminUpdateCategory from overwriting the authoritative Hub result row');
const adminUpdateCategory = functionSource(adminCategories, 'adminUpdateCategory');
assert(adminUpdateCategory.includes('payload.skipCategoryResultWrite !== true'), 'adminUpdateCategory must support an internal skip for duplicate CategoryResults writes');

assert(adminUi.includes('__adminApiLastEndAt'), 'Admin action progress must record completed API requests');
assert(adminUi.includes('Number(button.__adminApiLastEndAt || 0) >= actionAt'), 'Fallback Starting bar must not appear after a fast API request already completed');
assert(adminUi.includes('ADMIN_UI_LAST_ACTION = null'), 'Completed API requests must clear the pending click fallback');

assertCurrentReleaseMarkers(assert, app, html, sw);
assert.strictEqual(app, appCompat, 'Frontend app loader copies must match');

console.log('External Results Inbox cleanup v1.2.7 tests passed.');
