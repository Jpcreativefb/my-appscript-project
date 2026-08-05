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
  deleteRow(row) { this.rows.splice(row - 1, 1); return this; }
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
  SpreadsheetApp: { getActive: () => main, openById: id => { if (id !== 'hub-id') throw new Error('bad hub'); return hub; }, flush: () => true },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) || '', setProperty: (k, v) => props.set(k, v) }) },
  LockService: {
    getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => true }),
    getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => true })
  },
  requireAdmin_: () => true,
  validateGameId: () => true,
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
  adminDeleteCategory: p => {
    const setup = gameSetups.get(p.gameId);
    const before = setup.categories.length;
    setup.categories = setup.categories.filter(x => x.categoryId !== p.categoryId);
    return { success: setup.categories.length < before, blocked: false };
  },
  upsertCategoryResult_: () => ({ success: true }),
  adminUpdateCategory: () => ({ success: true })
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8'), context);

context.apiAdminConfigureRealityTvHub({ spreadsheetId: 'hub-id' });
const created = context.apiAdminCreateRealityTvSeason({
  showName: 'MasterChef Build Test', seasonName: 'Season 16', seasonNumber: '16', year: 2026,
  showFormat: 'cooking', participantType: 'individual', participantLabel: 'Chef', groupLabel: 'Team', periodLabel: 'Episode',
  firstEpisodeDateTime: '2026-08-05T20:00:00-05:00', weeklyIntervalDays: 7,
  lockOffsetMinutes: 5, points: 10, autoCreateNextEpisode: true,
  enabledQuestionTypesJSON: JSON.stringify(['individual-challenge-winner', 'team-challenge-winner', 'safety-winner', 'bottom-finish']),
  contestantsJSON: JSON.stringify([
    { name: 'Chef A', teamOrTribe: 'Red' }, { name: 'Chef B', teamOrTribe: 'Red' },
    { name: 'Chef C', teamOrTribe: 'Blue' }, { name: 'Chef D', teamOrTribe: 'Blue' }
  ])
});

let state = created.questionBuild;
for (let i = 0; state && !state.complete && i < 20; i++) {
  state = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: state.buildId, username: 'admin' });
}
assert(state && state.complete, 'Cooking preset build should complete automatically or through resumable stages');

const physicalTemplates = context.realityTvReadObjects_(main, 'RealityQuestionTemplates')
  .filter(row => row.SeasonId === created.seasonId);
assert.deepStrictEqual(
  physicalTemplates.filter(row => String(row.TemplateSource || 'preset') !== 'custom').map(row => row.TemplateId).sort(),
  ['bottom-finish', 'individual-challenge-winner', 'safety-winner', 'team-challenge-winner'].sort(),
  'A cooking season must not store Survivor, Amazing Race, performance, or social-deduction presets'
);
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 5, 'Main elimination plus four cooking questions should exist');

// Simulate a legacy cross-theme preset row and confirm Verify & Repair removes it.
const templateSheet = main.getSheetByName('RealityQuestionTemplates');
const templateHeaders = templateSheet.rows[0];
const legacyRow = templateHeaders.map(header => ({
  SeasonId: created.seasonId,
  GameId: created.gameId,
  TemplateId: 'immunity-winner',
  QuestionType: 'immunity-winner',
  Label: 'Immunity winner',
  QuestionTemplate: 'Who will win immunity?',
  AnswerSource: 'active-participants',
  ResultKey: 'immunity-winner',
  Points: 25,
  Enabled: false,
  DisplayOrder: 20,
  ShowFormatsJSON: JSON.stringify(['survivor-tribal']),
  TemplateSource: 'preset'
})[header] ?? '');
templateSheet.appendRow(legacyRow);
assert(context.realityTvReadObjects_(main, 'RealityQuestionTemplates').some(row => row.SeasonId === created.seasonId && row.TemplateId === 'immunity-winner'));
let repair = context.apiAdminRepairRealityTvQuestionPack({ seasonId: created.seasonId, episodeId: created.episode.EpisodeId, username: 'admin' });
for (let i = 0; repair && !repair.complete && i < 20; i++) {
  repair = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: repair.buildId, username: 'admin' });
}
assert(!context.realityTvReadObjects_(main, 'RealityQuestionTemplates').some(row => row.SeasonId === created.seasonId && row.TemplateId === 'immunity-winner'), 'Repair must prune legacy cross-theme preset rows');

// Remove one local category to verify the master readiness detects and repairs it.
const removedCategoryId = 'episode-1-team-challenge-winner';
gameSetups.get(created.gameId).categories = gameSetups.get(created.gameId).categories.filter(row => row.categoryId !== removedCategoryId);
let brokenDetails = context.apiAdminGetRealityTvSeasonDetails({ seasonId: created.seasonId, username: 'admin' });
assert.strictEqual(brokenDetails.bundle.questionReadiness.status, 'NEEDS_BUILD');
assert.strictEqual(brokenDetails.bundle.questionReadiness.readyCount, 3);
repair = context.apiAdminRepairRealityTvQuestionPack({ seasonId: created.seasonId, episodeId: created.episode.EpisodeId, username: 'admin' });
for (let i = 0; repair && !repair.complete && i < 20; i++) {
  repair = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: repair.buildId, username: 'admin' });
}
assert(gameSetups.get(created.gameId).categories.some(row => row.categoryId === removedCategoryId), 'Verify & Repair should restore a missing current-episode category');

let customState = context.apiAdminAddRealityTvCustomQuestionTemplate({
  seasonId: created.seasonId,
  episodeId: created.episode.EpisodeId,
  questionTemplate: 'Which judge will praise the winning dish in Episode {episode}?',
  answerSource: 'manual-options',
  manualOptionsJSON: JSON.stringify(['Judge A', 'Judge B', 'Judge C']),
  points: 15,
  username: 'admin'
});
for (let i = 0; customState && !customState.complete && i < 20; i++) {
  customState = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: customState.buildId, username: 'admin' });
}
assert(customState && customState.complete, 'A saved custom question should join and complete the current episode build automatically');
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 6, 'Custom question should be inserted into the current episode');

let details = context.apiAdminGetRealityTvSeasonDetails({ seasonId: created.seasonId, username: 'admin' });
assert.strictEqual(details.bundle.questionReadiness.status, 'READY');
assert.strictEqual(details.bundle.questionReadiness.selectedCount, 5);
assert.strictEqual(details.bundle.questionReadiness.readyCount, 5);
assert(details.bundle.questionReadiness.stages.every(stage => stage.complete), 'Every master build stage should be complete');
const customTemplate = details.bundle.questionTemplates.find(row => row.TemplateSource === 'custom');
assert(customTemplate, 'Custom template should be visible in the season manager');

const deleted = context.apiAdminDeleteRealityTvCustomQuestionTemplate({
  seasonId: created.seasonId,
  episodeId: created.episode.EpisodeId,
  templateId: customTemplate.TemplateId,
  username: 'admin'
});
assert.strictEqual(deleted.success, true);
assert.strictEqual(deleted.deletedCurrentQuestion, true);
assert.strictEqual(gameSetups.get(created.gameId).categories.length, 5, 'Deleting an unused custom question should remove its current-episode category');
assert(!context.realityTvQuestionTemplatesForSeason_(created.seasonId).some(row => row.TemplateId === customTemplate.TemplateId));

details = context.apiAdminGetRealityTvSeasonDetails({ seasonId: created.seasonId, username: 'admin' });
assert.strictEqual(details.bundle.questionReadiness.status, 'READY');
assert.strictEqual(details.bundle.questionReadiness.selectedCount, 4);
assert.strictEqual(details.bundle.questionReadiness.readyCount, 4);

const apiSource = fs.readFileSync(path.join(__dirname, '../frontend/js/api.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
assert(apiSource.includes('apiAdminDeleteRealityTvCustomQuestionTemplate'));
assert(apiSource.includes('apiAdminRealityTvPostRequest_("adminUpdateRealityTvQuestionPack"'));
assert(adminSource.includes('Current ${adminRealityTvEscape_(season.PeriodLabel || "Episode")} Build Status'));
assert(adminSource.includes('Available but not selected'));
assert(adminSource.includes('adminRealityTvDeleteCustomQuestion'));

console.log('Reality TV extra-question production v1.1.9 tests passed.');
