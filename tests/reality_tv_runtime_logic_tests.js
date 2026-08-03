const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class FakeRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push((this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? '');
      }
      out.push(row);
    }
    return out;
  }
  setValues(values) {
    values.forEach((inputRow, r) => inputRow.forEach((value, c) => {
      this.sheet.ensureCell(this.row - 1 + r, this.col - 1 + c);
      this.sheet.rows[this.row - 1 + r][this.col - 1 + c] = value;
    }));
    return this;
  }
  setValue(value) { return this.setValues([[value]]); }
  setFontWeight() { return this; }
}

class FakeSheet {
  constructor(name) { this.name = name; this.rows = []; }
  ensureCell(r, c) {
    while (this.rows.length <= r) this.rows.push([]);
    while (this.rows[r].length <= c) this.rows[r].push('');
  }
  getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
  getLastRow() {
    let last = 0;
    this.rows.forEach((row, i) => { if (row.some(v => v !== '' && v !== null && v !== undefined)) last = i + 1; });
    return last;
  }
  getRange(row, col, numRows = 1, numCols = 1) { return new FakeRange(this, row, col, numRows, numCols); }
  getDataRange() { return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  appendRow(row) { this.rows.push(row.slice()); return this; }
  clear() { this.rows = []; return this; }
  setFrozenRows() { return this; }
}

class FakeSpreadsheet {
  constructor(name) { this.name = name; this.sheets = new Map(); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
  insertSheet(name) { const sheet = new FakeSheet(name); this.sheets.set(name, sheet); return sheet; }
  getName() { return this.name; }
}

const main = new FakeSpreadsheet('Main Awards App');
const hub = new FakeSpreadsheet('External Results Hub');
const props = new Map();
const gameSetups = new Map();
const categoryResults = [];
let uuidCounter = 0;

const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  Error,
  Utilities: { getUuid: () => `${String(++uuidCounter).padStart(8, '0')}-0000-0000-0000-000000000000` },
  SpreadsheetApp: {
    getActive: () => main,
    openById: id => {
      if (id !== 'hub-id') throw new Error('Unknown spreadsheet');
      return hub;
    }
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: key => props.get(key) || '',
      setProperty: (key, value) => props.set(key, value)
    })
  },
  LockService: {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => true
    })
  },
  requireAdmin_: () => true,
  adminCreateGame: payload => {
    if (!gameSetups.has(payload.gameId)) gameSetups.set(payload.gameId, { game: payload, categories: [] });
    return { success: true, gameId: payload.gameId };
  },
  adminGetGameSetup: ({ gameId }) => {
    const setup = gameSetups.get(gameId);
    if (!setup) throw new Error(`Unknown game ${gameId}`);
    return { success: true, gameId, categories: setup.categories };
  },
  adminCreateCategory: payload => {
    const setup = gameSetups.get(payload.gameId);
    setup.categories.push({
      categoryId: payload.categoryId,
      category: payload.category,
      nominees: [],
      settings: { ...payload }
    });
    return { success: true, categoryId: payload.categoryId };
  },
  adminBulkCreateNominees: payload => {
    const setup = gameSetups.get(payload.gameId);
    const category = setup.categories.find(c => c.categoryId === payload.categoryId);
    const items = JSON.parse(payload.itemsJSON);
    category.nominees.push(...items.map(item => ({ nomineeId: item.nomineeId, nominee: item.nominee })));
    return { success: true, createdCount: items.length };
  },
  upsertCategoryResult_: payload => {
    const index = categoryResults.findIndex(row => row.gameId === payload.gameId && row.categoryId === payload.categoryId && row.nomineeId === payload.nomineeId);
    if (index >= 0) categoryResults[index] = { ...categoryResults[index], ...payload };
    else categoryResults.push({ ...payload });
    return { success: true };
  },
  adminUpdateCategory: payload => {
    const category = gameSetups.get(payload.gameId).categories.find(c => c.categoryId === payload.categoryId);
    category.settings = { ...category.settings, ...payload };
    return { success: true };
  }
};

vm.createContext(context);
const engine = fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8');
vm.runInContext(engine, context);

function completeApproval(queueId) {
  let state = context.apiAdminApproveRealityTvResult({ username: 'admin', token: 'x', queueId });
  for (let i = 0; i < 6 && !state.complete; i++) {
    state = context.apiAdminContinueRealityTvApproval({ username: 'admin', token: 'x', queueId });
  }
  assert.strictEqual(state.complete, true, `Approval did not complete; stage=${state.stage}`);
  return state;
}

context.apiAdminConfigureRealityTvHub({ username: 'admin', token: 'x', spreadsheetId: 'hub-id' });
const created = context.apiAdminCreateRealityTvSeason({
  username: 'admin', token: 'x',
  showName: 'Test Show', seasonName: 'Season 1', seasonNumber: '1', year: 2026,
  firstEpisodeDateTime: '2026-08-05T20:00:00-05:00', weeklyIntervalDays: 7,
  lockOffsetMinutes: 5, points: 1, publishGame: false, autoCreateNextEpisode: true,
  contestantsJSON: JSON.stringify([
    { name: 'Contestant A' },
    { name: 'Contestant B' },
    { name: 'Contestant C' }
  ])
});

assert.strictEqual(created.success, true);
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 1);
assert.strictEqual(gameSetups.get(created.gameId).categories[0].nominees.length, 3);
assert(hub.getSheetByName('AppMappings').getLastRow() === 4, 'Expected three Hub mappings plus header');

const dashboard1 = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' });
const bundle1 = dashboard1.seasons[0];
const episode1 = bundle1.episodes[0];
const contestantB = bundle1.contestants.find(c => c.Name === 'Contestant B');
const submitted = context.apiAdminSubmitRealityTvResult({
  username: 'admin', token: 'x',
  seasonId: bundle1.season.SeasonId,
  episodeId: episode1.EpisodeId,
  outcomeType: 'elimination',
  selectedContestantIdsJSON: JSON.stringify([contestantB.ContestantId]),
  evidenceUrl: 'https://example.com/recap',
  notes: 'Test result'
});
assert.strictEqual(submitted.success, true);

const dashboard2 = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' });
const pending = dashboard2.seasons[0].queue.find(q => q.ReviewStatus === 'PENDING');
assert(pending, 'Expected pending review queue item');
const approved = completeApproval(pending.QueueId);
assert.strictEqual(approved.success, true);
assert(approved.nextEpisode || approved.nextEpisodeId, 'Expected Episode 2 to be created');

const dashboard3 = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' });
const finalBundle = dashboard3.seasons[0];
assert.strictEqual(finalBundle.episodes.length, 2);
assert.strictEqual(finalBundle.episodes[0].Status, 'FINAL');
assert.strictEqual(finalBundle.episodes[1].Status, 'OPEN');
assert.strictEqual(finalBundle.contestants.find(c => c.Name === 'Contestant B').Active, false);
assert.strictEqual(gameSetups.get(created.gameId).categories[1].nominees.length, 2);
assert(categoryResults.some(r => r.nomineeId === contestantB.ContestantId && r.isWinner === true), 'Expected winner result for eliminated contestant');


// Episode 2 no-elimination: settle as push, keep both active, and build Episode 3.
const episode2 = finalBundle.episodes[1];
const submitNoElim = context.apiAdminSubmitRealityTvResult({
  username: 'admin', token: 'x',
  seasonId: finalBundle.season.SeasonId,
  episodeId: episode2.EpisodeId,
  outcomeType: 'no-elimination',
  selectedContestantIdsJSON: '[]',
  evidenceUrl: '', notes: 'No one left'
});
assert.strictEqual(submitNoElim.success, true);
const dashNoElim = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' });
const pendingNoElim = dashNoElim.seasons[0].queue.find(q => q.EpisodeId === episode2.EpisodeId && q.ReviewStatus === 'PENDING');
assert(pendingNoElim, 'Expected no-elimination result to require review');
const approveNoElim = completeApproval(pendingNoElim.QueueId);
assert(approveNoElim.nextEpisode || approveNoElim.nextEpisodeId, 'Expected Episode 3 after a no-elimination result');
const finalNoElim = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' }).seasons[0];
assert.strictEqual(finalNoElim.episodes.length, 3);
assert.strictEqual(finalNoElim.contestants.filter(c => c.Active === true).length, 2);
assert(categoryResults.some(r => r.categoryId === episode2.CategoryId && r.resultStatus === 'push'), 'Expected no-elimination question to be pushed');

// Bulk-add supports full contestant profiles, skips duplicates, and does not change existing episode questions.
const episodeCountBeforeBulk = gameSetups.get(created.gameId).categories.length;
const bulkAdded = context.apiAdminBulkAddRealityTvContestants({
  username: 'admin', token: 'x', seasonId: finalNoElim.season.SeasonId,
  contestantsJSON: JSON.stringify([
    { name: 'Contestant D', fullName: 'D Example', age: '34', hometown: 'Dallas, TX', occupation: 'Chef', biography: 'Late arrival', externalSubjectId: 'contestant-d-ext' },
    { name: 'Contestant A' }
  ])
});
assert.strictEqual(bulkAdded.success, true);
assert.strictEqual(bulkAdded.createdCount, 1);
assert.strictEqual(bulkAdded.skippedCount, 1);
const afterBulk = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' }).seasons[0];
const contestantD = afterBulk.contestants.find(c => c.Name === 'Contestant D');
assert(contestantD, 'Expected Contestant D to be added');
assert.strictEqual(contestantD.FullName, 'D Example');
assert.strictEqual(contestantD.ExternalSubjectId, 'contestant-d-ext');
assert.strictEqual(gameSetups.get(created.gameId).categories.length, episodeCountBeforeBulk, 'Bulk add must not alter existing episode questions');

console.log('Reality TV runtime logic tests passed.');
