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
  showName: 'Survivor Vote Test', seasonName: 'Season 1', seasonNumber: '1', year: 2026,
  showFormat: 'survivor-tribal', participantType: 'individual', participantLabel: 'Contestant', groupLabel: 'Tribe', periodLabel: 'Episode',
  firstEpisodeDateTime: '2026-08-06T20:00:00-05:00', weeklyIntervalDays: 7,
  lockOffsetMinutes: 5, points: 10, autoCreateNextEpisode: false,
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
assert(build && build.complete, 'Episode 1 extra question build should complete');
const episode1 = context.realityTvGetEpisode_(created.episode.EpisodeId);
const episode2Response = context.apiAdminCreateNextRealityTvEpisode({ seasonId: created.seasonId, username: 'admin' });
const episode2 = context.realityTvGetEpisode_(episode2Response.episode.EpisodeId);

const contestants = context.realityTvContestantsForSeason_(created.seasonId);
const vote1 = context.apiAdminSaveRealityTvEpisodeVote({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  voteRoundLabel: 'Round 1 — Initial Vote',
  voterContestantId: contestants[0].ContestantId,
  targetContestantId: contestants[1].ContestantId,
  voteStatus: 'VALID',
  voteValue: 1,
  notes: 'Standard vote',
  username: 'admin'
});
assert.strictEqual(vote1.success, true);
const vote2 = context.apiAdminSaveRealityTvEpisodeVote({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  voteRoundLabel: 'Round 1 — Initial Vote',
  voterContestantId: contestants[2].ContestantId,
  targetContestantId: contestants[1].ContestantId,
  voteStatus: 'NULLIFIED',
  voteValue: 2,
  notes: 'Extra vote nullified by idol',
  username: 'admin'
});
assert.strictEqual(vote2.success, true);
let detail = context.apiAdminGetRealityTvSeasonDetails({ seasonId: created.seasonId, username: 'admin' });
assert.strictEqual(detail.bundle.episodeVotes.length, 2, 'Both vote records should be returned with the season details');
assert.strictEqual(detail.performance.episodeVotes, 2, 'Vote count should be included in the detail performance summary');
const deleted = context.apiAdminDeleteRealityTvEpisodeVote({ voteId: vote2.vote.VoteId, username: 'admin' });
assert.strictEqual(deleted.success, true);
assert.strictEqual(context.realityTvEpisodeVotesForSeason_(created.seasonId).length, 1, 'Deleting a vote should remove only that ballot');

const bulkRound = context.apiAdminSaveRealityTvEpisodeVotesBulk({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  votingGroupName: 'Red',
  votes: [
    { voterContestantId: contestants[0].ContestantId, targetContestantId: contestants[1].ContestantId, voteStatus: 'VALID', voteValue: 1, voteRoundLabel: 'Round 1 — Initial Vote' },
    { voterContestantId: contestants[1].ContestantId, targetContestantId: contestants[0].ContestantId, voteStatus: 'VALID', voteValue: 1, voteRoundLabel: 'Round 1 — Initial Vote' }
  ],
  username: 'admin'
});
assert.strictEqual(bulkRound.success, true, 'The losing tribe vote round should save in one request');
assert.strictEqual(context.realityTvEpisodeVotesForSeason_(created.seasonId).length, 2, 'Bulk save should update an existing ballot and add the missing tribe member');

const outsideVote = context.apiAdminSaveRealityTvEpisodeVotesBulk({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  votingGroupName: 'Red',
  votes: [
    { voterContestantId: contestants[2].ContestantId, targetContestantId: contestants[0].ContestantId, voteStatus: 'VALID', voteValue: 1, voteRoundLabel: 'Round 1 — Initial Vote', outsideVoter: true }
  ],
  username: 'admin'
});
assert.strictEqual(outsideVote.success, true, 'An explicitly added outside voter should be allowed to vote for a member of the voting tribe');
assert.throws(() => context.apiAdminSaveRealityTvEpisodeVotesBulk({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  votingGroupName: 'Red',
  votes: [
    { voterContestantId: contestants[2].ContestantId, targetContestantId: contestants[0].ContestantId, voteStatus: 'VALID', voteValue: 1, voteRoundLabel: 'Round 2 — Revote' }
  ],
  username: 'admin'
}), /Add Outside Voter/, 'A different-tribe voter must be explicitly marked as an outside voter');
assert.throws(() => context.apiAdminSaveRealityTvEpisodeVotesBulk({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  votingGroupName: 'Red',
  votes: [
    { voterContestantId: contestants[2].ContestantId, targetContestantId: contestants[3].ContestantId, voteStatus: 'VALID', voteValue: 1, voteRoundLabel: 'Round 2 — Revote', outsideVoter: true }
  ],
  username: 'admin'
}), /targets must be members/, 'Targets should remain restricted to the selected voting tribe');

const oldEpisode1Air = new Date(episode1.AirDateTime).getTime();
const oldEpisode2Air = new Date(episode2.AirDateTime).getTime();
const schedule = context.apiAdminUpdateRealityTvEpisodeSchedule({
  seasonId: created.seasonId,
  episodeId: episode1.EpisodeId,
  scheduleStatus: 'RESCHEDULED',
  airDateTime: '2026-08-13T20:00:00-05:00',
  lockDateTime: '2026-08-13T19:55:00-05:00',
  scheduleNotes: 'Delayed for tournament coverage',
  shiftFutureEpisodes: true,
  username: 'admin'
});
assert.strictEqual(schedule.success, true);
assert.strictEqual(schedule.shiftedFutureCount, 1, 'The later open episode should shift by the same amount');
const shifted1 = context.realityTvGetEpisode_(episode1.EpisodeId);
const shifted2 = context.realityTvGetEpisode_(episode2.EpisodeId);
const delta = new Date(shifted1.AirDateTime).getTime() - oldEpisode1Air;
assert.strictEqual(new Date(shifted2.AirDateTime).getTime(), oldEpisode2Air + delta, 'Future episode air date should shift by the same delta');
assert.strictEqual(shifted1.ScheduleStatus, 'RESCHEDULED');
assert(shifted1.OriginalAirDateTime, 'Original air time should be preserved after a schedule change');
assert.strictEqual(shifted2.ScheduleStatus, 'RESCHEDULED');
const episode3Response = context.apiAdminCreateNextRealityTvEpisode({ seasonId: created.seasonId, username: 'admin' });
const episode3 = context.realityTvGetEpisode_(episode3Response.episode.EpisodeId);
assert.strictEqual(new Date(episode3.AirDateTime).getTime(), new Date(shifted2.AirDateTime).getTime() + (7 * 86400000), 'Future episodes created later should use the shifted season schedule anchor');

const setup = gameSetups.get(created.gameId);
const mainCategory = setup.categories.find(row => row.categoryId === shifted1.CategoryId);
assert(mainCategory && mainCategory.settings.lockDateTime, 'Main elimination question lock should be updated');
const reward = context.realityTvEpisodeQuestionsForSeason_(created.seasonId).find(row => row.EpisodeId === shifted1.EpisodeId && row.QuestionType === 'reward-winner');
const rewardCategory = setup.categories.find(row => row.categoryId === reward.CategoryId);
assert(rewardCategory && rewardCategory.settings.lockDateTime, 'Extra question lock should be updated with the episode schedule');

const tba = context.apiAdminUpdateRealityTvEpisodeSchedule({
  seasonId: created.seasonId,
  episodeId: shifted2.EpisodeId,
  scheduleStatus: 'TBA',
  scheduleNotes: 'Network has not announced the replacement date',
  username: 'admin'
});
assert.strictEqual(tba.success, true);
const tbaEpisode = context.realityTvGetEpisode_(shifted2.EpisodeId);
assert.strictEqual(tbaEpisode.ScheduleStatus, 'TBA');
assert.strictEqual(tbaEpisode.AirDateTime, '');
assert.strictEqual(tbaEpisode.LockDateTime, '');
const tbaMainCategory = setup.categories.find(row => row.categoryId === tbaEpisode.CategoryId);
assert.strictEqual(tbaMainCategory.settings.lockDateTime, '', 'TBA episodes should remain unlocked until rescheduled');

const episodeSheet = main.getSheetByName('RealityEpisodes');
context.realityTvUpdateObjectRow_(episodeSheet, context.realityTvGetEpisode_(episode1.EpisodeId).__rowNumber, { Status: 'FINAL', UpdatedAt: new Date() });
const publicView = context.realityTvUserGameViewPayload_(created.gameId, 'viewer', { includePlayerStats: false });
const publicEpisode1 = publicView.episodes.find(row => row.episodeId === episode1.EpisodeId);
const publicEpisode2 = publicView.episodes.find(row => row.episodeId === episode2.EpisodeId);
assert(publicEpisode1.voteDetails && publicEpisode1.voteDetails.rows.length === 3, 'Finalized episode vote details should be visible to players');
assert.strictEqual(publicEpisode2.voteDetails, null, 'Open episode vote details must stay hidden from players');
assert.strictEqual(publicEpisode2.scheduleStatus, 'TBA', 'Player episode data should include the schedule status');

const ui = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../frontend/css/styles.css'), 'utf8');
const picksUi = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/picks.js'), 'utf8');
const picksCss = fs.readFileSync(path.join(__dirname, '../frontend/css/picks.css'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '../backend/Api.js'), 'utf8');
assert(ui.includes('Episode Vote Details'), 'The manager should include episode vote details');
assert(ui.includes('adminRealityTvSaveEpisodeVote_'), 'The manager should save vote rows without leaving the season');
assert(ui.includes('Episode Schedule &amp; Delays'), 'The manager should include schedule and delay controls');
assert(ui.includes('shiftFutureEpisodes: moveFuture'), 'The UI should support shifting later open episodes');
assert(css.includes('.reality-tv-vote-summary-grid'), 'Vote summary should have production styling');
assert(css.includes('.reality-tv-schedule-card'), 'Schedule controls should have production styling');
assert(picksUi.includes('realityTvEpisodeVoteDetailsHtml_'), 'Final episode vote details should render on the player picks page');
assert(picksUi.includes('Air date TBA · picks remain open'), 'TBA schedule state should be clear to players');
assert(picksCss.includes('.reality-player-vote-details'), 'Player vote history should have production styling');
assert(api.includes('adminUpdateRealityTvEpisodeSchedule'), 'The schedule action should be routed by the backend API');

console.log('Reality TV votes and schedule v1.1.12 tests passed.');
