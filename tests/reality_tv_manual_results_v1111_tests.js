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
  getValue() { return this.getValues()[0][0]; }
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
  ensureCell(r, c) { while (this.rows.length <= r) this.rows.push([]); while (this.rows[r].length <= c) this.rows[r].push(''); }
  getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
  getLastRow() { let last = 0; this.rows.forEach((row, i) => { if (row.some(v => v !== '' && v != null)) last = i + 1; }); return last; }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  getRange(row, col, numRows = 1, numCols = 1) { return new FakeRange(this, row, col, numRows, numCols); }
  getDataRange() { return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  appendRow(row) { this.rows.push(row.slice()); return this; }
  deleteRow(row) { this.rows.splice(row - 1, 1); return this; }
  insertRowsAfter(afterRow, count) { this.rows.splice(afterRow, 0, ...Array.from({ length: count }, () => [])); return this; }
  insertRowsBefore(beforeRow, count) { this.rows.splice(beforeRow - 1, 0, ...Array.from({ length: count }, () => [])); return this; }
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
const props = new Map();
const gameSetups = new Map();
let uuid = 0;
const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  Utilities: { getUuid: () => `${++uuid}-0000-0000-0000-000000000000` },
  SpreadsheetApp: { getActive: () => main, openById: () => { throw new Error('Hub not configured'); }, flush: () => true },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) || '', setProperty: (k, v) => props.set(k, v) }) },
  LockService: {
    getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => true }),
    getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => true })
  },
  requireAdmin_: () => true,
  validateGameId: () => true,
  clearAppCaches: () => true,
  clearGameCaches: () => true,
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
  adminUpdateCategory: p => {
    const c = gameSetups.get(p.gameId).categories.find(x => x.categoryId === p.categoryId);
    if (c) c.settings = { ...(c.settings || {}), ...p };
    return { success: true };
  }
};
vm.createContext(context);
['CategoryResultsEngine.js', 'RealityTvSeasonEngine.js', 'RealityTvQuestionPackEngine.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/' + file), 'utf8'), context);
});

const created = context.apiAdminCreateRealityTvSeason({
  showName: 'Survivor Multi Result Test', seasonName: 'Season 1', seasonNumber: '1', year: 2026,
  showFormat: 'survivor-tribal', participantType: 'individual', participantLabel: 'Contestant', groupLabel: 'Tribe', periodLabel: 'Episode',
  firstEpisodeDateTime: '2026-08-06T20:00:00-05:00', weeklyIntervalDays: 7,
  lockOffsetMinutes: 5, points: 10, autoCreateNextEpisode: true,
  enabledQuestionTypesJSON: JSON.stringify(['reward-winner']),
  contestantsJSON: JSON.stringify([
    { name: 'A', teamOrTribe: 'Red' }, { name: 'B', teamOrTribe: 'Red' },
    { name: 'C', teamOrTribe: 'Blue' }, { name: 'D', teamOrTribe: 'Blue' }
  ])
});
let build = created.questionBuild;
for (let i = 0; build && !build.complete && i < 12; i++) {
  build = context.apiAdminContinueRealityTvQuestionPackBuild({ buildId: build.buildId, username: 'admin' });
}
assert(build && build.complete, 'Reward question build should complete');
const reward = context.realityTvEpisodeQuestionsForSeason_(created.seasonId).find(row => row.QuestionType === 'reward-winner');
assert(reward, 'Reward question should exist');
const episodePlan = context.apiAdminApplyRealityTvEpisodeQuestionPlan({
  seasonId: created.seasonId,
  episodeId: created.episode.EpisodeId,
  enabledQuestionTypesJSON: JSON.stringify(['reward-winner']),
  questionPointsJSON: JSON.stringify({ 'reward-winner': 15 }),
  questionDisplayJSON: JSON.stringify({ 'reward-winner': { layoutType: 'compact', imageSource: 'group' } }),
  username: 'admin'
});
assert.strictEqual(episodePlan.success, true, 'This-episode-only question plan should save');
const updatedReward = context.realityTvGetEpisodeQuestion_(reward.EpisodeQuestionId);
assert.strictEqual(Number(updatedReward.Points), 15, 'This episode should receive the one-off point value');
const rewardTemplate = context.realityTvQuestionTemplatesForSeason_(created.seasonId).find(row => row.TemplateId === 'reward-winner');
assert.strictEqual(Number(rewardTemplate.Points), 10, 'Future episode defaults must remain unchanged');

const rewardOptions = JSON.parse(updatedReward.AnswerOptionsJSON);
assert(rewardOptions.length >= 2, 'At least two active tribes should be available');
const winningOptions = rewardOptions.filter(item => !/no reward/i.test(String(item.label || ''))).slice(0, 2);
assert.strictEqual(winningOptions.length, 2, 'Red and Blue tribes should be available as winners');

const submitted = context.apiAdminSubmitRealityTvQuestionResult({
  episodeQuestionId: reward.EpisodeQuestionId,
  resultMode: 'multiple-winners',
  selectedOutcomeIdsJSON: JSON.stringify(winningOptions.map(item => item.id)),
  username: 'admin'
});
assert.strictEqual(submitted.success, true);
let approval = context.apiAdminApproveRealityTvQuestionResult({ queueId: submitted.queueId, username: 'admin' });
for (let i = 0; approval && !approval.complete && i < 5; i++) {
  approval = context.apiAdminContinueRealityTvQuestionApproval({ queueId: submitted.queueId, username: 'admin' });
}
assert(approval && approval.complete, 'Multi-winner question approval should complete');
const finalReward = context.realityTvGetEpisodeQuestion_(reward.EpisodeQuestionId);
assert.deepStrictEqual(JSON.parse(finalReward.WinningOutcomeIds).sort(), winningOptions.map(item => item.id.toLowerCase()).sort());

const resolution = context.getCategoryResultsResolutionMap(created.gameId)[reward.CategoryId];
assert(resolution && resolution.resolved, 'CategoryResults should resolve the question');
assert.strictEqual(resolution.result, 'winner');
assert.deepStrictEqual(Array.from(resolution.winnerNomineeIds).sort(), winningOptions.map(item => item.id.toLowerCase()).sort(), 'Both tribes must remain winners');
const firstScore = context.realityTvScoreEpisodeQuestionForUser_({}, { scoreMode: 'correct-pick', points: 10 }, resolution, { nomineeId: winningOptions[0].id });
const secondScore = context.realityTvScoreEpisodeQuestionForUser_({}, { scoreMode: 'correct-pick', points: 10 }, resolution, { nomineeId: winningOptions[1].id });
assert.strictEqual(firstScore.points, 10);
assert.strictEqual(secondScore.points, 10);

const contestantIds = context.realityTvContestantsForSeason_(created.seasonId).slice(0, 3).map(row => row.ContestantId);
const multiExit = context.apiAdminSubmitRealityTvResult({
  seasonId: created.seasonId,
  episodeId: created.episode.EpisodeId,
  outcomeType: 'multiple-elimination',
  selectedContestantIdsJSON: JSON.stringify(contestantIds),
  username: 'admin'
});
assert.strictEqual(multiExit.success, true, 'An unexpected elimination of two or more contestants should be accepted without rebuilding the episode');
let mainApproval = context.apiAdminApproveRealityTvResult({ queueId: multiExit.queueId, username: 'admin' });
const resetApproval = context.apiAdminResetRealityTvApproval({ queueId: multiExit.queueId, username: 'admin' });
assert.strictEqual(resetApproval.success, true, 'A stuck approval should reset safely');
assert.strictEqual(resetApproval.stage, 'SETTLE', 'An unsettled episode should resume at settlement');
for (let i = 0; mainApproval && !mainApproval.complete && i < 8; i++) {
  mainApproval = context.apiAdminContinueRealityTvApproval({ queueId: multiExit.queueId, username: 'admin' });
}
assert(mainApproval && mainApproval.complete, 'Multiple-elimination approval should complete');
const mainResolution = context.getCategoryResultsResolutionMap(created.gameId)[created.episode.CategoryId];
assert(mainResolution && mainResolution.resolved && mainResolution.result === 'winner', 'Multiple elimination must settle as winners, not a push');
assert.deepStrictEqual(Array.from(mainResolution.winnerNomineeIds).sort(), contestantIds.map(id => id.toLowerCase()).sort(), 'Every eliminated contestant must be a valid winner');
contestantIds.forEach(id => {
  const scored = context.realityTvScoreEpisodeQuestionForUser_({}, { scoreMode: 'correct-pick', points: 10 }, mainResolution, { nomineeId: id });
  assert.strictEqual(scored.points, 10, 'Each eliminated contestant pick should receive normal points');
});

const ui = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../frontend/css/styles.css'), 'utf8');
assert(ui.includes('adminRealityTvRefreshSeasonDetails_'), 'Result actions should refresh only the active season');
assert(ui.includes('value="multiple-winners"'), 'Supplemental questions should support multiple winners');
assert(ui.includes('selectedOutcomeIdsJSON: JSON.stringify(selectedIds)'), 'The frontend must submit every selected winner');
assert(ui.includes('value="multiple-elimination"'), 'Main episode results should support two or more unexpected eliminations');
assert(css.includes('.reality-tv-question-result-mode-grid'), 'Multiple-result controls should have production styling');

const submitQuestionSource = ui.slice(ui.indexOf('async function adminRealityTvSubmitQuestionResult'), ui.indexOf('async function adminRealityTvApproveQuestionResult'));
assert(!submitQuestionSource.includes('navigate("admin-reality-tv")'), 'Submitting a question result must not return the administrator to the manager start');

console.log('Reality TV manual results v1.1.11 tests passed.');
