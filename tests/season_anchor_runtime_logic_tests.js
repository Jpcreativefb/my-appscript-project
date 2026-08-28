const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class FakeRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet; this.row = row; this.col = col; this.numRows = numRows; this.numCols = numCols;
  }
  getValues() {
    return Array.from({ length: this.numRows }, (_, r) =>
      Array.from({ length: this.numCols }, (_, c) => (this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? '')
    );
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
  getLastColumn() { return this.rows.reduce((m, row) => Math.max(m, row.length), 0); }
  getLastRow() { let last = 0; this.rows.forEach((row, i) => { if (row.some(v => v !== '' && v !== null && v !== undefined)) last = i + 1; }); return last; }
  getRange(row, col, numRows = 1, numCols = 1) { return new FakeRange(this, row, col, numRows, numCols); }
  getDataRange() { return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  appendRow(row) { this.rows.push(row.slice()); return this; }
  clear() { this.rows = []; return this; }
  setFrozenRows() { return this; }
}
class FakeSpreadsheet {
  constructor(name) { this.name = name; this.sheets = new Map(); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
  insertSheet(name) { const sh = new FakeSheet(name); this.sheets.set(name, sh); return sh; }
  getName() { return this.name; }
}

const main = new FakeSpreadsheet('Main');
const gameSetups = new Map();
const categoryResults = [];
const userPicks = {};
let uuid = 0;

function resultMapForGame(gameId) {
  const out = {};
  categoryResults.filter(r => r.gameId === gameId).forEach(row => {
    const key = String(row.categoryId || '').toLowerCase();
    if (!out[key]) out[key] = { resolved: false, result: '', winnerNomineeId: '' };
    if (String(row.resultStatus || '').toLowerCase() === 'push') {
      out[key] = { resolved: true, result: 'push', winnerNomineeId: '' };
    } else if (row.isWinner === true) {
      out[key] = { resolved: true, result: 'winner', winnerNomineeId: String(row.nomineeId || '').toLowerCase() };
    }
  });
  return out;
}

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  Utilities: { getUuid: () => `${++uuid}-0000-0000-0000-000000000000` },
  SpreadsheetApp: { getActive: () => main, openById: () => { throw new Error('Hub not configured'); } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '', setProperty: () => {} }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  requireAdmin_: () => true,
  validateUserSession_: (username, token) => { if (!username || token !== 'token') throw new Error('Invalid session'); },
  clearGameCaches: () => {},
  adminCreateGame: payload => { gameSetups.set(payload.gameId, { game: payload, categories: [] }); return { success: true }; },
  adminGetGameSetup: ({ gameId }) => ({ success: true, categories: gameSetups.get(gameId).categories }),
  adminCreateCategory: payload => {
    gameSetups.get(payload.gameId).categories.push({ categoryId: payload.categoryId, category: payload.category, nominees: [], settings: { ...payload } });
    return { success: true };
  },
  adminBulkCreateNominees: payload => {
    const category = gameSetups.get(payload.gameId).categories.find(c => c.categoryId === payload.categoryId);
    category.nominees.push(...JSON.parse(payload.itemsJSON).map(item => ({ nomineeId: item.nomineeId, nominee: item.nominee })));
    return { success: true };
  },
  adminUpdateCategory: payload => {
    const category = gameSetups.get(payload.gameId).categories.find(c => c.categoryId === payload.categoryId);
    category.settings = { ...category.settings, ...payload };
    return { success: true };
  },
  upsertCategoryResultsBulk_: payloads => payloads.forEach(payload => {
    const i = categoryResults.findIndex(row => row.gameId === payload.gameId && row.categoryId === payload.categoryId && row.nomineeId === payload.nomineeId);
    if (i >= 0) categoryResults[i] = { ...categoryResults[i], ...payload }; else categoryResults.push({ ...payload });
  }),
  getCategorySettings: gameId => {
    const out = {};
    gameSetups.get(gameId).categories.forEach(c => { out[String(c.categoryId).toLowerCase()] = { ...c.settings, points: Number(c.settings.points || 0), scoreMode: 'correct-pick' }; });
    return out;
  },
  getCategoryResultsResolutionMap: gameId => resultMapForGame(gameId),
  getHybridCategoryResolution_: (categoryId, config, resolutions) => resolutions[String(categoryId).toLowerCase()] || { resolved: false, result: '', winnerNomineeId: '' },
  normalizeCategoryScoreMode_: value => String(value || 'correct-pick').toLowerCase(),
  buildUserPicksMap_: () => userPicks
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/SeasonAnchorEngine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);

const created = context.apiAdminCreateRealityTvSeason({
  username: 'admin', token: 'x', showName: 'Anchor Show', seasonName: 'Season 1', seasonNumber: 1, year: 2030,
  firstEpisodeDateTime: '2030-08-05T20:00:00-05:00', weeklyIntervalDays: 7, lockOffsetMinutes: 5,
  points: 10, publishGame: false, autoCreateNextEpisode: true,
  seasonAnchorEnabled: true, seasonAnchorStartMultiplier: 1, seasonAnchorGrowthPerSuccess: 0.05,
  seasonAnchorMaxMultiplier: 1.1, seasonAnchorEligiblePointsCap: 20, seasonAnchorLossPenalty: 5,
  seasonAnchorWithdrawalBehavior: 'penalty', seasonAnchorManualSwitchAllowed: true,
  contestantsJSON: JSON.stringify([{ name: 'A' }, { name: 'B' }, { name: 'C' }])
});
assert.strictEqual(created.success, true);
const gameId = created.gameId;
context.apiSaveRealityTvSpoilerPreference({ username: 'alice', token: 'token', gameId, enabled: false });
context.apiSaveRealityTvSpoilerPreference({ username: 'bob', token: 'token', gameId, enabled: false });
const dash1 = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' }).seasons[0];
const ep1 = dash1.episodes[0];
const a = dash1.contestants.find(c => c.Name === 'A');
const b = dash1.contestants.find(c => c.Name === 'B');
const cBeforeElimination = dash1.contestants.find(c => c.Name === 'C');

assert.strictEqual(context.apiSaveSeasonAnchorPick({ username: 'alice', token: 'token', gameId, entityId: a.ContestantId }).success, true);
assert.throws(
  () => context.apiSaveSeasonAnchorPick({ username: 'alice', token: 'token', gameId, entityId: cBeforeElimination.ContestantId }),
  /finalized/i,
  'A finalized Sole Survivor pick must not be switchable before elimination.'
);
assert.strictEqual(context.apiSaveSeasonAnchorPick({ username: 'bob', token: 'token', gameId, entityId: b.ContestantId }).success, true);
userPicks.alice = { [ep1.CategoryId]: { nomineeId: b.ContestantId, changeCount: 0 } };
userPicks.bob = { [ep1.CategoryId]: { nomineeId: b.ContestantId, changeCount: 0 } };

let submitted = context.apiAdminSubmitRealityTvResult({ username: 'admin', token: 'x', seasonId: dash1.season.SeasonId, episodeId: ep1.EpisodeId, outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify([b.ContestantId]) });
let state = context.apiAdminApproveRealityTvResult({ username: 'admin', token: 'x', queueId: submitted.queueId });
for (let i = 0; i < 5 && !state.complete; i++) state = context.apiAdminContinueRealityTvApproval({ username: 'admin', token: 'x', queueId: submitted.queueId });
assert.strictEqual(state.complete, true);
// RC16 Results Ready keeps next-episode construction off the approval request.
// Drive the durable background job explicitly in this local runtime fixture.
for (let i = 0; i < 5; i++) context.realityTvContinueNextEpisodeJobs();

let alice = context.apiGetSeasonAnchor({ username: 'alice', token: 'token', gameId }).seasonAnchor.user;
let bob = context.apiGetSeasonAnchor({ username: 'bob', token: 'token', gameId }).seasonAnchor.user;
assert.strictEqual(alice.streak, 1);
assert.strictEqual(alice.currentMultiplier, 1.05);
assert.strictEqual(bob.status, 'NEEDS_PICK');
assert.strictEqual(bob.currentMultiplier, 1);
let adjustments = context.seasonAnchorAdjustmentsForGame_(gameId);
assert.strictEqual(adjustments.alice.net, 0, 'Episode 1 starts at 1.00x, so no bonus');
assert.strictEqual(adjustments.bob.net, -5, 'Loss penalty should apply');

const dash2 = context.apiAdminGetRealityTvDashboard({ username: 'admin', token: 'x' }).seasons[0];
const ep2 = dash2.episodes[1];
const c = dash2.contestants.find(row => row.Name === 'C');
assert.strictEqual(context.apiSaveSeasonAnchorPick({ username: 'bob', token: 'token', gameId, entityId: c.ContestantId }).success, true);
userPicks.alice[ep2.CategoryId] = { nomineeId: c.ContestantId, changeCount: 0 };
userPicks.bob[ep2.CategoryId] = { nomineeId: c.ContestantId, changeCount: 0 };

submitted = context.apiAdminSubmitRealityTvResult({ username: 'admin', token: 'x', seasonId: dash2.season.SeasonId, episodeId: ep2.EpisodeId, outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify([c.ContestantId]) });
state = context.apiAdminApproveRealityTvResult({ username: 'admin', token: 'x', queueId: submitted.queueId });
for (let i = 0; i < 5 && !state.complete; i++) state = context.apiAdminContinueRealityTvApproval({ username: 'admin', token: 'x', queueId: submitted.queueId });
assert.strictEqual(state.complete, true);
adjustments = context.seasonAnchorAdjustmentsForGame_(gameId);
assert.strictEqual(adjustments.alice.net, 0.5, '10 eligible points at 1.05x should add 0.5');
assert.strictEqual(adjustments.bob.net, -10, 'Second eliminated pick should add another -5 penalty');
assert.strictEqual(adjustments.alice.currentMultiplier, 1.1, 'Multiplier should stop at configured cap');

context.apiAdminSaveSeasonAnchorSettings({
  username: 'admin', token: 'x', gameId, seasonId: dash2.season.SeasonId,
  enabled: true, startMultiplier: 1, growthPerSuccess: 0.05, maxMultiplier: 1.02,
  eligiblePointsCap: 5, lossPenalty: 2, manualSwitchAllowed: true, sourceType: 'reality-tv'
});
alice = context.apiGetSeasonAnchor({ username: 'alice', token: 'token', gameId }).seasonAnchor.user;
assert.strictEqual(alice.currentMultiplier, 1.02, 'Lowering the admin cap should clamp current multipliers immediately');
adjustments = context.seasonAnchorAdjustmentsForGame_(gameId);
assert.strictEqual(adjustments.alice.net, 0.5, 'Changing settings must not rewrite past episode bonuses');

context.apiAdminSaveSeasonAnchorSettings({ username: 'admin', token: 'x', gameId, seasonId: dash2.season.SeasonId, enabled: false });
assert.strictEqual(context.apiGetSeasonAnchor({ username: 'alice', token: 'token', gameId }).seasonAnchor.enabled, false);
adjustments = context.seasonAnchorAdjustmentsForGame_(gameId);
assert.strictEqual(adjustments.alice.net, 0.5, 'Disabling future Survivor picks must preserve earned leaderboard adjustments');

console.log('Season Anchor runtime logic tests passed.');
