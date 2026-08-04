const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class FakeRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) { Object.assign(this, { sheet, row, col, numRows, numCols }); }
  getValues() { return Array.from({ length: this.numRows }, (_, r) => Array.from({ length: this.numCols }, (_, c) => (this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? '')); }
  setValues(values) { values.forEach((inputRow, r) => inputRow.forEach((value, c) => { this.sheet.ensureCell(this.row - 1 + r, this.col - 1 + c); this.sheet.rows[this.row - 1 + r][this.col - 1 + c] = value; })); return this; }
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
const gameSetups = new Map();
let uuid = 0;
const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  Utilities: { getUuid: () => `${++uuid}-0000-0000-0000-000000000000` },
  SpreadsheetApp: { getActive: () => main, openById: () => { throw new Error('hub not configured'); } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '', setProperty: () => {} }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => true }), getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => true }) },
  requireAdmin_: () => true,
  adminCreateGame: p => { gameSetups.set(p.gameId, { categories: [] }); return { success: true }; },
  adminGetGameSetup: ({ gameId }) => ({ success: true, gameId, categories: gameSetups.get(gameId).categories }),
  adminCreateCategory: p => { gameSetups.get(p.gameId).categories.push({ categoryId: p.categoryId, category: p.category, nominees: [], settings: { ...p } }); return { success: true }; },
  adminBulkCreateNominees: p => { const c = gameSetups.get(p.gameId).categories.find(x => x.categoryId === p.categoryId); JSON.parse(p.itemsJSON).forEach(item => c.nominees.push({ nomineeId: item.nomineeId, nominee: item.nominee })); return { success: true }; },
  adminUpdateCategory: p => { const c = gameSetups.get(p.gameId).categories.find(x => x.categoryId === p.categoryId); if (c) { if (p.category) c.category = p.category; c.settings = { ...c.settings, ...p }; } return { success: true }; },
  upsertCategoryResult_: () => ({ success: true })
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8'), context);

const created = context.apiAdminCreateRealityTvSeason({
  showName: 'Points Test', seasonName: 'Season 1', year: 2026,
  showFormat: 'survivor-tribal', firstEpisodeDateTime: '2026-08-05T20:00:00-05:00',
  points: 3,
  enabledQuestionTypesJSON: JSON.stringify(['immunity-winner', 'reward-winner']),
  questionPointsJSON: JSON.stringify({ 'immunity-winner': 5, 'reward-winner': 2 }),
  contestantsJSON: JSON.stringify([
    { name: 'A', teamOrTribe: 'Blue' }, { name: 'B', teamOrTribe: 'Blue' },
    { name: 'C', teamOrTribe: 'Red' }, { name: 'D', teamOrTribe: 'Red' }
  ])
});
assert.strictEqual(created.success, true);
let initialBuild = created.questionBuild || null;
for (let i = 0; initialBuild && !initialBuild.complete && i < 50; i++) initialBuild = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: initialBuild.buildId });
if (initialBuild) assert.strictEqual(initialBuild.complete, true);
let dashboard = context.apiAdminGetRealityTvDashboard({});
let bundle = dashboard.seasons[0];
const exitCategory = gameSetups.get(created.gameId).categories.find(c => c.categoryId === bundle.episodes[0].CategoryId);
assert.strictEqual(Number(exitCategory.settings.points), 3, 'Elimination points should use season Points');
const immunity = gameSetups.get(created.gameId).categories.find(c => c.categoryId === 'episode-1-immunity-winner');
const reward = gameSetups.get(created.gameId).categories.find(c => c.categoryId === 'episode-1-reward-winner');
assert.strictEqual(Number(immunity.settings.points), 5, 'Immunity points should be independently configurable');
assert.strictEqual(Number(reward.settings.points), 2, 'Reward points should be independently configurable');

let state = context.apiAdminUpdateRealityTvQuestionPack({
  seasonId: bundle.season.SeasonId,
  episodeId: bundle.episodes[0].EpisodeId,
  eliminationPoints: 4,
  enabledQuestionTypesJSON: JSON.stringify(['immunity-winner', 'reward-winner']),
  questionPointsJSON: JSON.stringify({ 'immunity-winner': 6, 'reward-winner': 1 }),
  buildCurrentEpisode: true
});
for (let i = 0; i < 20 && !state.complete; i++) state = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: state.buildId });
assert.strictEqual(state.complete, true);
dashboard = context.apiAdminGetRealityTvDashboard({});
bundle = dashboard.seasons[0];
assert.strictEqual(Number(bundle.season.Points), 4, 'Updated elimination points should persist on the season');
assert.strictEqual(Number(exitCategory.settings.points), 4, 'Current open elimination question should update');
assert.strictEqual(Number(immunity.settings.points), 6, 'Current open immunity question should update');
assert.strictEqual(Number(reward.settings.points), 1, 'Current open reward question should update');
const episodeImmunity = bundle.episodeQuestions.find(q => q.QuestionType === 'immunity-winner');
assert.strictEqual(Number(episodeImmunity.Points), 6, 'Episode question audit row should store applied points');

const page = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
assert(page.includes('Elimination / exit points'));
assert(page.includes('rt-question-points'));
assert(page.includes('questionPointsJSON'));
console.log('Reality TV individual question points tests passed.');
