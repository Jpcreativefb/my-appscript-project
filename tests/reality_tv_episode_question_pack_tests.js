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
const categoryResults = [];
let uuid = 0;
const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  Utilities: { getUuid: () => `${++uuid}-0000-0000-0000-000000000000` },
  SpreadsheetApp: { getActive: () => main, openById: id => { if (id !== 'hub-id') throw new Error('bad hub'); return hub; } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) || '', setProperty: (k, v) => props.set(k, v) }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => true }) },
  requireAdmin_: () => true,
  adminCreateGame: p => { if (!gameSetups.has(p.gameId)) gameSetups.set(p.gameId, { categories: [] }); return { success: true }; },
  adminGetGameSetup: ({ gameId }) => ({ success: true, gameId, categories: gameSetups.get(gameId).categories }),
  adminCreateCategory: p => { gameSetups.get(p.gameId).categories.push({ categoryId: p.categoryId, category: p.category, nominees: [], settings: { ...p } }); return { success: true }; },
  adminBulkCreateNominees: p => {
    const c = gameSetups.get(p.gameId).categories.find(x => x.categoryId === p.categoryId);
    JSON.parse(p.itemsJSON).forEach(item => c.nominees.push({ nomineeId: item.nomineeId, nominee: item.nominee }));
    return { success: true };
  },
  upsertCategoryResult_: p => {
    const i = categoryResults.findIndex(x => x.gameId === p.gameId && x.categoryId === p.categoryId && x.nomineeId === p.nomineeId);
    if (i >= 0) categoryResults[i] = { ...categoryResults[i], ...p }; else categoryResults.push({ ...p });
    return { success: true };
  },
  adminUpdateCategory: p => { const c = gameSetups.get(p.gameId).categories.find(x => x.categoryId === p.categoryId); c.settings = { ...c.settings, ...p }; return { success: true }; }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8'), context);

function completeQuestionApproval(queueId) {
  let state = context.apiAdminApproveRealityTvQuestionResult({ queueId, username: 'admin' });
  for (let i = 0; i < 5 && !state.complete; i++) state = context.apiAdminContinueRealityTvQuestionApproval({ queueId, username: 'admin' });
  assert.strictEqual(state.complete, true);
  return state;
}
function completeElimination(queueId) {
  let state = context.apiAdminApproveRealityTvResult({ queueId, username: 'admin' });
  for (let i = 0; i < 30 && !state.complete; i++) state = context.apiAdminContinueRealityTvApproval({ queueId, username: 'admin' });
  assert.strictEqual(state.complete, true);
  return state;
}

context.apiAdminConfigureRealityTvHub({ spreadsheetId: 'hub-id' });
const created = context.apiAdminCreateRealityTvSeason({
  showName: 'Survivor Test', seasonName: 'Season 1', seasonNumber: '1', year: 2026,
  firstEpisodeDateTime: '2026-08-05T20:00:00-05:00', weeklyIntervalDays: 7,
  lockOffsetMinutes: 5, points: 1, autoCreateNextEpisode: true,
  enabledQuestionTypesJSON: JSON.stringify(['immunity-winner', 'tribal-attendee', 'reward-winner', 'idol-finder']),
  contestantsJSON: JSON.stringify([
    { name: 'A', teamOrTribe: 'Cila' }, { name: 'B', teamOrTribe: 'Cila' },
    { name: 'C', teamOrTribe: 'Vatu' }, { name: 'D', teamOrTribe: 'Vatu' }
  ])
});
assert.strictEqual(created.success, true);
let initialBuild = created.questionBuild || null;
for (let i = 0; initialBuild && !initialBuild.complete && i < 50; i++) initialBuild = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: initialBuild.buildId });
if (initialBuild) assert.strictEqual(initialBuild.complete, true);
let dashboard = context.apiAdminGetRealityTvDashboard({});
let bundle = dashboard.seasons[0];
assert.strictEqual(bundle.questionTemplates.filter(t => t.Enabled === true).length, 4);
assert.strictEqual(bundle.episodeQuestions.length, 4);
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 5, 'Elimination plus four extra questions');
assert.strictEqual(hub.getSheetByName('ExternalMarkets').getLastRow(), 2, 'Only the main elimination Hub market is synchronous; supplemental mappings are deferred');

const immunity = bundle.episodeQuestions.find(q => q.QuestionType === 'immunity-winner');
const immunityOptions = JSON.parse(immunity.AnswerOptionsJSON);
assert.deepStrictEqual(immunityOptions.map(o => o.label), ['Cila', 'Vatu']);
const submitQ = context.apiAdminSubmitRealityTvQuestionResult({ episodeQuestionId: immunity.EpisodeQuestionId, selectedOutcomeId: immunityOptions[0].id });
assert.strictEqual(submitQ.success, true);
dashboard = context.apiAdminGetRealityTvDashboard({});
bundle = dashboard.seasons[0];
const pendingQ = bundle.questionQueue.find(q => q.ReviewStatus === 'PENDING');
completeQuestionApproval(pendingQ.QueueId);
dashboard = context.apiAdminGetRealityTvDashboard({});
bundle = dashboard.seasons[0];
assert.strictEqual(bundle.episodeQuestions.find(q => q.EpisodeQuestionId === immunity.EpisodeQuestionId).Status, 'FINAL');
assert.strictEqual(bundle.contestants.filter(c => c.Active === true).length, 4, 'Extra question must not eliminate contestants');
assert.strictEqual(bundle.episodes.length, 1, 'Extra question must not build next episode');
assert(categoryResults.some(r => r.categoryId === immunity.CategoryId && r.isWinner === true && r.nomineeId === immunityOptions[0].id));

const episode1 = bundle.episodes[0];
const contestantA = bundle.contestants.find(c => c.Name === 'A');
context.apiAdminSubmitRealityTvResult({ seasonId: bundle.season.SeasonId, episodeId: episode1.EpisodeId, outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify([contestantA.ContestantId]) });
dashboard = context.apiAdminGetRealityTvDashboard({});
bundle = dashboard.seasons[0];
const eliminationState = completeElimination(bundle.queue.find(q => q.ReviewStatus === 'PENDING').QueueId);
let episode2Build = eliminationState.questionBuild || null;
for (let i = 0; episode2Build && !episode2Build.complete && i < 50; i++) episode2Build = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: episode2Build.buildId });
if (episode2Build) assert.strictEqual(episode2Build.complete, true);
dashboard = context.apiAdminGetRealityTvDashboard({});
bundle = dashboard.seasons[0];
assert.strictEqual(bundle.episodes.length, 2);
assert.strictEqual(bundle.episodeQuestions.filter(q => Number(q.EpisodeNumber) === 2).length, 4, 'Episode 2 should inherit the question pack');
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 10, 'Episode 2 should add elimination plus four extra questions');

console.log('Reality TV episode question pack tests passed.');

const frontend = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '../frontend/js/api.js'), 'utf8');
assert(frontend.includes('Episode Question Pack'));
assert(frontend.includes('adminRealityTvSupplementalQuestionsPanel_'));
assert(frontend.includes('adminRealityTvApproveQuestionResult'));
assert(api.includes('adminUpdateRealityTvQuestionPack'));
assert(api.includes('adminSubmitRealityTvQuestionResult'));
