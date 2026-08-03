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

function buildContext() {
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
    adminCreateCategory: p => {
      const setup = gameSetups.get(p.gameId);
      if (setup.categories.some(c => c.categoryId === p.categoryId)) throw new Error('Category already exists');
      setup.categories.push({ categoryId: p.categoryId, category: p.category, nominees: [], settings: { ...p } });
      return { success: true };
    },
    adminBulkCreateNominees: p => {
      const category = gameSetups.get(p.gameId).categories.find(c => c.categoryId === p.categoryId);
      JSON.parse(p.itemsJSON).forEach(item => {
        if (!category.nominees.some(n => n.nomineeId === item.nomineeId)) category.nominees.push({ nomineeId: item.nomineeId, nominee: item.nominee });
      });
      return { success: true };
    },
    adminUpdateCategory: () => ({ success: true }),
    upsertCategoryResult_: () => ({ success: true })
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8'), context);
  return { context, main, gameSetups };
}

// A full Amazing Race preset must build every checked question and retain a per-question verification result.
{
  const { context, gameSetups } = buildContext();
  const created = context.apiAdminCreateRealityTvSeason({
    showName: 'Amazing Race Test', seasonName: 'Season 1', year: 2026,
    showFormat: 'amazing-race', participantType: 'team', participantLabel: 'Team', periodLabel: 'Leg',
    firstEpisodeDateTime: '2026-08-10T20:00:00-05:00', enabledQuestionTypesJSON: '[]',
    contestantsJSON: JSON.stringify([{ name: 'Team A' }, { name: 'Team B' }, { name: 'Team C' }])
  });
  const selected = ['leg-winner', 'last-place-team', 'non-elimination-leg', 'fast-forward', 'u-turn-recipient', 'time-penalty'];
  let state = context.apiAdminUpdateRealityTvQuestionPack({
    seasonId: created.seasonId,
    episodeId: created.episode.EpisodeId,
    showFormat: 'amazing-race',
    enabledQuestionTypesJSON: JSON.stringify(selected),
    buildCurrentEpisode: true
  });
  for (let i = 0; i < 30 && !state.complete; i++) state = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: state.buildId });
  assert.strictEqual(state.complete, true, 'Full Amazing Race pack should finish');
  assert.strictEqual(state.results.length, selected.length, 'Every checked question should have a verification result');
  assert.strictEqual(state.skippedDetails.length, 0, 'Amazing Race team questions should not be silently skipped');
  assert.strictEqual(gameSetups.get(created.gameId).categories.length, 1 + selected.length, 'Elimination plus all six checked questions should exist');
  const dashboard = context.apiAdminGetRealityTvDashboard({});
  assert(dashboard.seasons[0].questionBuildSummary, 'Dashboard should retain the latest completed build summary');
  assert.strictEqual(dashboard.seasons[0].questionBuildSummary.results.length, selected.length);
}

// Group-based questions without Team / Tribe data should explain why they were skipped.
{
  const { context } = buildContext();
  const created = context.apiAdminCreateRealityTvSeason({
    showName: 'Group Data Test', seasonName: 'Season 1', year: 2026,
    showFormat: 'survivor-tribal', firstEpisodeDateTime: '2026-08-10T20:00:00-05:00',
    enabledQuestionTypesJSON: '[]', contestantsJSON: JSON.stringify([{ name: 'A' }, { name: 'B' }, { name: 'C' }])
  });
  let state = context.apiAdminUpdateRealityTvQuestionPack({
    seasonId: created.seasonId,
    episodeId: created.episode.EpisodeId,
    enabledQuestionTypesJSON: JSON.stringify(['tribal-attendee']),
    buildCurrentEpisode: true
  });
  for (let i = 0; i < 10 && !state.complete; i++) state = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: state.buildId });
  assert.strictEqual(state.complete, true);
  assert.strictEqual(state.skippedDetails.length, 1);
  assert(/Team \/ Tribe information/i.test(state.skippedDetails[0].message), 'Skipped result should explain missing group data');
}

const page = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../frontend/css/styles.css'), 'utf8');
assert(page.includes('Last build results'));
assert(page.includes('adminRealityTvHelp_'));
assert(page.includes('maxCompletedRequests'));
assert(page.includes('reality-tv-config-section'));
assert(engine.includes('BuildResultsJSON'));
assert(engine.includes('Verification found an unchecked build result'));
assert(css.includes('reality-tv-question-build-status'));
console.log('Reality TV question pack verification and UI tests passed.');
