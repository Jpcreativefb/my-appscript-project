const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class FakeRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) { Object.assign(this, { sheet, row, col, numRows, numCols }); }
  getValues() {
    return Array.from({ length: this.numRows }, (_, r) => Array.from({ length: this.numCols }, (_, c) =>
      (this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? ''));
  }
  setValues(values) {
    values.forEach((inputRow, r) => inputRow.forEach((value, c) => {
      this.sheet.ensureCell(this.row - 1 + r, this.col - 1 + c);
      this.sheet.rows[this.row - 1 + r][this.col - 1 + c] = value;
    }));
    return this;
  }
  setFontWeight() { return this; }
}
class FakeSheet {
  constructor(name) { this.name = name; this.rows = []; }
  ensureCell(r, c) { while (this.rows.length <= r) this.rows.push([]); while (this.rows[r].length <= c) this.rows[r].push(''); }
  getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
  getLastRow() { let last = 0; this.rows.forEach((row, i) => { if (row.some(v => v !== '' && v != null)) last = i + 1; }); return last; }
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

const main = new FakeSpreadsheet('Main');
const hub = new FakeSpreadsheet('Hub');
const props = new Map();
const gameSetups = new Map();
let uuid = 0;
const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  Utilities: { getUuid: () => `${++uuid}-0000-0000-0000-000000000000` },
  SpreadsheetApp: { getActive: () => main, openById: id => { if (id !== 'hub-id') throw new Error('bad hub'); return hub; } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) || '', setProperty: (k, v) => props.set(k, v) }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => true }) },
  requireAdmin_: () => true,
  adminCreateGame: p => { if (!gameSetups.has(p.gameId)) gameSetups.set(p.gameId, { categories: [] }); return { success: true }; },
  adminGetGameSetup: ({ gameId }) => ({ success: true, gameId, categories: gameSetups.get(gameId).categories }),
  adminCreateCategory: p => {
    const setup = gameSetups.get(p.gameId);
    if (setup.categories.some(x => x.categoryId === p.categoryId)) throw new Error(`Category already exists: ${p.categoryId}`);
    setup.categories.push({ categoryId: p.categoryId, category: p.category, nominees: [], settings: { ...p } });
    return { success: true };
  },
  adminBulkCreateNominees: p => {
    const c = gameSetups.get(p.gameId).categories.find(x => x.categoryId === p.categoryId);
    JSON.parse(p.itemsJSON).forEach(item => {
      if (!c.nominees.some(n => n.nomineeId === item.nomineeId)) c.nominees.push({ nomineeId: item.nomineeId, nominee: item.nominee });
    });
    return { success: true };
  },
  upsertCategoryResult_: () => ({ success: true }),
  adminUpdateCategory: () => ({ success: true })
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8'), context);

context.apiAdminConfigureRealityTvHub({ spreadsheetId: 'hub-id' });
const created = context.apiAdminCreateRealityTvSeason({
  showName: 'Staged Build Test', seasonName: 'Season 1', seasonNumber: '1', year: 2026,
  firstEpisodeDateTime: '2026-08-05T20:00:00-05:00', weeklyIntervalDays: 7,
  lockOffsetMinutes: 5, points: 1, autoCreateNextEpisode: true,
  enabledQuestionTypesJSON: '[]',
  contestantsJSON: JSON.stringify([
    { name: 'A', teamOrTribe: 'Cila' }, { name: 'B', teamOrTribe: 'Cila' },
    { name: 'C', teamOrTribe: 'Vatu' }, { name: 'D', teamOrTribe: 'Vatu' }
  ])
});
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 1, 'Only elimination should exist before the staged build');

let state = context.apiAdminUpdateRealityTvQuestionPack({
  seasonId: created.seasonId,
  episodeId: created.episode.EpisodeId,
  enabledQuestionTypesJSON: JSON.stringify(['immunity-winner', 'tribal-attendee', 'reward-winner', 'idol-finder']),
  buildCurrentEpisode: true
});
assert.strictEqual(state.success, true);
assert.strictEqual(state.complete, false);
assert.strictEqual(state.totalCount, 4);
assert(state.buildId, 'Build ID should be returned before long work starts');
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 1, 'Starting the build must remain a short request');

const firstBuildId = state.buildId;
for (let i = 0; i < 12 && !state.complete; i++) {
  state = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: firstBuildId, username: 'admin' });
}
assert.strictEqual(state.complete, true, 'Staged question build should complete');
assert.strictEqual(state.currentIndex, 4);
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 5, 'Elimination plus four supplemental questions');

// A completed build is idempotent.
const repeated = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: firstBuildId, username: 'admin' });
assert.strictEqual(repeated.complete, true);
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 5, 'Retrying a completed build must not duplicate questions');

const dashboard = context.apiAdminGetRealityTvDashboard({});
assert.strictEqual(dashboard.seasons[0].questionBuild, null, 'Completed builds should not display as pending');
assert(main.getSheetByName('RealityQuestionBuildJobs'), 'Normalized build-job sheet should exist');
assert.strictEqual(hub.getSheetByName('ExternalMarkets').getLastRow(), 6, 'Elimination plus four supplemental Hub markets');

const apiSource = fs.readFileSync(path.join(__dirname, '../backend/Api.js'), 'utf8');
const pageSource = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const browserApi = fs.readFileSync(path.join(__dirname, '../frontend/js/api.js'), 'utf8');
assert(apiSource.includes('adminContinueRealityTvQuestionPackBuild'));
assert(pageSource.includes('Resume Build'));
assert(pageSource.includes('adminRealityTvRunQuestionPackBuild_'));
assert(browserApi.includes('apiAdminContinueRealityTvQuestionPackBuild'));

console.log('Reality TV staged question pack build tests passed.');
