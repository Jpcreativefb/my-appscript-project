'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function load(relative, extra = {}) {
  const context = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, ...extra
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(relative, 'utf8'), context);
  return context;
}

// Awards retries must preserve the exact grouped market/outcome scope that was
// recorded when the local question was first created. Order may differ, scope may not.
{
  const c = load('backend/engines/AwardsManagerEngine.js');
  const answers = [
    { nomineeId: 'show-a', nominee: 'Show A' },
    { nomineeId: 'show-b', nominee: 'Show B' }
  ];
  const grouped = {
    sourceConfigJSON: JSON.stringify({ marketIds: ['market-a', 'market-b'], selectedOutcomes: [] }),
    nominees: [{ nomineeId: 'show-a', nominee: 'Show A' }]
  };
  assert.doesNotThrow(() => c.awardsManagerVerifyResumeScope_(
    grouped,
    true,
    [{ externalMarketId: 'market-b' }, { externalMarketId: 'market-a' }],
    [],
    answers
  ));
  assert.throws(() => c.awardsManagerVerifyResumeScope_(
    grouped,
    true,
    [{ externalMarketId: 'market-a' }, { externalMarketId: 'market-c' }],
    [],
    answers
  ), /different grouped Awards market set/i);

  const single = {
    sourceConfigJSON: JSON.stringify({ marketIds: ['market-1'], selectedOutcomes: ['Alpha', 'Beta'] }),
    nominees: [{ nomineeId: 'alpha', nominee: 'Alpha' }]
  };
  assert.doesNotThrow(() => c.awardsManagerVerifyResumeScope_(
    single,
    false,
    [{ externalMarketId: 'market-1' }],
    ['Beta', 'Alpha'],
    [{ nomineeId: 'alpha', nominee: 'Alpha' }, { nomineeId: 'beta', nominee: 'Beta' }]
  ));
  assert.throws(() => c.awardsManagerVerifyResumeScope_(
    single,
    false,
    [{ externalMarketId: 'market-1' }],
    ['Alpha', 'Gamma'],
    [{ nomineeId: 'alpha', nominee: 'Alpha' }, { nomineeId: 'gamma', nominee: 'Gamma' }]
  ), /different selected Awards outcome set/i);

  const staleAnswer = {
    sourceConfigJSON: JSON.stringify({ marketIds: ['market-1'], selectedOutcomes: ['Alpha', 'Beta'] }),
    nominees: [{ nomineeId: 'old-answer', nominee: 'Old Answer' }]
  };
  assert.throws(() => c.awardsManagerVerifyResumeScope_(
    staleAnswer,
    false,
    [{ externalMarketId: 'market-1' }],
    ['Alpha', 'Beta'],
    [{ nomineeId: 'alpha', nominee: 'Alpha' }, { nomineeId: 'beta', nominee: 'Beta' }]
  ), /answers outside this retry request/i);
}

// Repeated next-episode calls are idempotent once the deterministic episode row exists.
{
  let unexpectedCalls = 0;
  const existing = { EpisodeId: 'season-1-episode-2', EpisodeNumber: 2, CategoryId: 'episode-2-eliminated' };
  const c = load('backend/engines/RealityTvSeasonEngine.js', {
    SpreadsheetApp: { getActive: () => ({}) },
    adminCreateCategory: () => { unexpectedCalls += 1; },
    adminBulkCreateNominees: () => { unexpectedCalls += 1; }
  });
  c.realityTvEpisodesForSeason_ = () => [existing];
  const result = c.realityTvCreateEpisode_({ SeasonId: 'season-1', GameId: 'game-1' }, 2, {});
  assert.strictEqual(result.EpisodeId, existing.EpisodeId);
  assert.strictEqual(unexpectedCalls, 0, 'An already-created episode must return without rebuilding its question or answers.');
}

// The automatic season funnel stops cleanly at one remaining contestant instead
// of attempting an invalid one-answer elimination episode.
{
  let createCalls = 0;
  const c = load('backend/engines/RealityTvSeasonEngine.js');
  c.realityTvGetSeason_ = () => ({ SeasonId: 'season-1', GameId: 'game-1', AutoCreateNextEpisode: true });
  c.realityTvGetEpisode_ = () => ({ EpisodeId: 'ep-4', EpisodeNumber: 4, __rowNumber: 2 });
  c.realityTvContestantsForSeason_ = () => [{ ContestantId: 'winner', Active: true, Status: 'ACTIVE' }];
  c.realityTvCreateEpisode_ = () => { createCalls += 1; return { EpisodeId: 'ep-5' }; };
  const finalState = c.realityTvBuildNextEpisodeAfterApproval_(
    { SeasonId: 'season-1' },
    { EpisodeId: 'ep-4' }
  );
  assert.strictEqual(finalState.remainingCount, 1);
  assert.strictEqual(finalState.nextEpisode, null);
  assert.strictEqual(createCalls, 0, 'One remaining contestant must end automatic episode creation.');
}

// Sole Survivor: withdrawal policy, duplicate settlement idempotency, and the
// weekly eligible-points cap are deterministic without live Sheets.
{
  const fakeSheet = {};
  const users = [{
    __rowNumber: 2,
    GameId: 'game-1', Username: 'alice', Active: true,
    CurrentEntityId: 'a', CurrentEntityName: 'A', SelectedEpisodeNumber: 1,
    LastSettledEpisodeNumber: 0, Streak: 2, CurrentMultiplier: 1.2, Status: 'ACTIVE'
  }];
  const history = [];
  const updates = [];
  const settings = {
    Enabled: true, SourceType: 'reality-tv', StartMultiplier: 1,
    GrowthPerSuccess: 0.1, MaxMultiplier: 2, EligiblePointsCap: 20,
    LossPenalty: 5, WithdrawalBehavior: 'free-reset'
  };
  const c = load('backend/engines/SeasonAnchorEngine.js', {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => fakeSheet }) }
  });
  c.seasonAnchorGetSettings_ = () => settings;
  c.seasonAnchorEnsureSystem_ = () => {};
  c.seasonAnchorReadObjects_ = sheetName => sheetName === 'UserSeasonAnchors' ? users : history;
  c.seasonAnchorUpsert_ = (_sheet, _headers, _keys, row) => {
    const i = history.findIndex(item => item.HistoryId === row.HistoryId);
    if (i >= 0) history[i] = { ...history[i], ...row }; else history.push({ ...row, __rowNumber: history.length + 2 });
  };
  c.seasonAnchorUpdateObjectRow_ = (_sheet, rowNumber, patch) => {
    updates.push({ rowNumber, patch });
    const user = users.find(item => item.__rowNumber === rowNumber);
    if (user) Object.assign(user, patch);
    const hist = history.find(item => item.__rowNumber === rowNumber);
    if (hist) Object.assign(hist, patch);
  };
  const originalRecalculateEpisodeScores = c.seasonAnchorRecalculateEpisodeScores_;
  c.seasonAnchorRecalculateEpisodeScores_ = () => ({ success: true });

  const episode = { EpisodeId: 'ep-1', EpisodeNumber: 1 };
  const first = c.seasonAnchorSettleRealityEpisode_(
    { GameId: 'game-1', SeasonId: 'season-1' }, episode, ['a'], 'quit', 'admin'
  );
  assert.strictEqual(first.usersSettled, 1);
  assert.strictEqual(history[0].Outcome, 'RESET');
  assert.strictEqual(history[0].PenaltyPoints, 0);
  assert.strictEqual(users[0].Status, 'NEEDS_PICK');
  const second = c.seasonAnchorSettleRealityEpisode_(
    { GameId: 'game-1', SeasonId: 'season-1' }, episode, ['a'], 'quit', 'admin'
  );
  assert.strictEqual(second.usersSettled, 0, 'The same episode must not settle a Sole Survivor selection twice.');

  // Recalculate a survived history row with 50 earned points at 1.5x. Only the
  // recorded 20-point cap is eligible, producing a 10-point bonus.
  history.length = 0;
  history.push({
    __rowNumber: 2, HistoryId: 'h-2', GameId: 'game-1', SeasonId: 'season-1',
    Username: 'alice', EpisodeId: 'ep-2', EpisodeNumber: 2, Outcome: 'SURVIVED',
    MultiplierApplied: 1.5, EligiblePointsCapApplied: 20, PenaltyPoints: 0
  });
  c.seasonAnchorEpisodeCategoryIds_ = () => ['q1'];
  c.seasonAnchorUserFixedPointsForCategories_ = () => 50;
  c.seasonAnchorRecalculateEpisodeScores_ = originalRecalculateEpisodeScores;
  c.seasonAnchorRecalculateEpisodeScores_('game-1', 'season-1', 'ep-2');
  assert.strictEqual(history[0].EligiblePoints, 20);
  assert.strictEqual(history[0].BonusPoints, 10);
  assert.strictEqual(history[0].NetAdjustment, 10);
}

console.log('reality-awards-rc9-edge-cases-tests: PASS');

// Reality scheduling must preserve the local wall-clock hour across DST and when
// a postponed episode shifts future episodes by calendar days.
{
  const previousTz = process.env.TZ;
  process.env.TZ = 'America/Chicago';
  try {
    const c = load('backend/engines/RealityTvSeasonEngine.js');
    const timing = c.realityTvEpisodeTiming_({
      FirstEpisodeDateTime: '2026-10-25T20:00:00-05:00',
      WeeklyIntervalDays: 7,
      LockOffsetMinutes: 5
    }, 2);
    assert.strictEqual(timing.airDateTime.getHours(), 20, 'Episode air time must stay at 8 PM after DST falls back.');
    assert.strictEqual(timing.airDateTime.getTimezoneOffset(), 360, 'Episode 2 should use Central Standard Time after fallback.');
    assert.strictEqual(timing.lockDateTime.getHours(), 19);
    assert.strictEqual(timing.lockDateTime.getMinutes(), 55);

    const delta = c.realityTvScheduleDelta_(
      new Date('2026-10-25T20:00:00-05:00'),
      new Date('2026-11-01T20:00:00-06:00')
    );
    assert.strictEqual(delta.dayOffset, 7);
    assert.strictEqual(delta.minuteOffset, 0);
    const shifted = c.realityTvShiftLocalSchedule_(new Date('2026-11-01T20:00:00-06:00'), delta.dayOffset, delta.minuteOffset);
    assert.strictEqual(shifted.getHours(), 20, 'A postponed weekly schedule must not drift to 9 PM after DST.');
    assert.strictEqual(shifted.getDate(), 8);
  } finally {
    process.env.TZ = previousTz;
  }
}

// Next-episode recovery: a category created by a racing/partial call is reused,
// and only missing answers are added. Manual creation remains available even when
// AutoCreateNextEpisode is disabled.
{
  const added = [];
  let createCategoryCalls = 0;
  let updateCategoryCalls = 0;
  const partialCategory = {
    categoryId: 'episode-2-eliminated',
    nominees: [{ nomineeId: 'a', nominee: 'A' }]
  };
  const c = load('backend/engines/RealityTvSeasonEngine.js', {
    adminCreateCategory: () => {
      createCategoryCalls += 1;
      throw new Error('Category already exists');
    },
    adminGetGameSetup: () => ({ categories: [partialCategory] }),
    adminUpdateCategory: () => { updateCategoryCalls += 1; return { success: true }; },
    adminBulkCreateNominees: payload => {
      const items = JSON.parse(payload.itemsJSON);
      added.push(...items);
      partialCategory.nominees.push(...items.map(item => ({ nomineeId: item.nomineeId, nominee: item.nominee })));
      return { success: true, createdCount: items.length, created: items };
    }
  });
  c.realityTvPickRules_ = () => ({ maxChanges: -1, changePenalty: 0 });
  c.realityTvContestantGroupProfile_ = () => ({ startingGroup: '', currentGroup: '', finalGroup: '', history: [] });

  const result = c.realityTvEnsureMainEpisodeQuestion_({
    season: { GameId: 'game-1', SeasonId: 'season-1', Points: 1 },
    episodeNumber: 2,
    categoryId: 'episode-2-eliminated',
    question: 'Who leaves Episode 2?',
    timing: { lockDateTime: new Date('2026-09-01T19:55:00-05:00') },
    periodLabel: 'Episode',
    externalEventId: 'event-2',
    externalMarketId: 'market-2',
    eliminationLayout: 'text',
    eliminationAnswers: [
      { contestant: { ContestantId: 'a' }, imageUrl: '' },
      { contestant: { ContestantId: 'b' }, imageUrl: '' },
      { contestant: { ContestantId: 'c' }, imageUrl: '' }
    ],
    eligibleContestants: [
      { ContestantId: 'a', Name: 'A', Status: 'ACTIVE' },
      { ContestantId: 'b', Name: 'B', Status: 'ACTIVE' },
      { ContestantId: 'c', Name: 'C', Status: 'ACTIVE' }
    ],
    existingCategory: null
  }, {});
  assert.strictEqual(createCategoryCalls, 1, 'The racing call should be allowed to encounter an already-created category.');
  assert.strictEqual(updateCategoryCalls, 1, 'The recovered category should be refreshed instead of duplicated.');
  assert.strictEqual(result.nomineesCreated, 2);
  assert.deepStrictEqual(added.map(item => item.nomineeId).sort(), ['b', 'c']);

  let manualNumber = 0;
  c.requireAdmin_ = () => true;
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvGetSeason_ = () => ({ SeasonId: 'season-1', GameId: 'game-1', AutoCreateNextEpisode: false });
  c.realityTvEpisodesForSeason_ = () => [{ EpisodeNumber: 1 }, { EpisodeNumber: 2 }];
  c.realityTvCreateEpisode_ = (_season, number) => { manualNumber = number; return { EpisodeName: 'Episode ' + number, EpisodeNumber: number }; };
  const manual = c.apiAdminCreateNextRealityTvEpisode({ seasonId: 'season-1' });
  assert.strictEqual(manual.success, true);
  assert.strictEqual(manualNumber, 3, 'Manual episode creation must work while automatic creation is disabled.');
}

// Result lifecycle: reject -> corrected resubmit, a second simultaneous pending
// result is blocked, finalized episodes reject new submissions, and contestants
// who become ineligible before approval are rejected. Same-episode exit state is
// still eligible so a partially persisted settlement can resume idempotently.
{
  const season = { SeasonId: 'season-1', GameId: 'game-1' };
  const episode = { EpisodeId: 'ep-3', EpisodeNumber: 3, CategoryId: 'q3', Status: 'OPEN', __rowNumber: 2 };
  const contestants = [
    { ContestantId: 'a', Name: 'A', Status: 'ACTIVE', Active: true, EliminatedEpisode: '' },
    { ContestantId: 'b', Name: 'B', Status: 'ACTIVE', Active: true, EliminatedEpisode: '' },
    { ContestantId: 'c', Name: 'C', Status: 'ACTIVE', Active: true, EliminatedEpisode: '' }
  ];
  const queues = [];
  let nextQueue = 0;
  const c = load('backend/engines/RealityTvSeasonEngine.js', {
    requireAdmin_: () => true,
    SpreadsheetApp: { getActive: () => ({ getSheetByName: name => ({ name }) }) }
  });
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvGetSeason_ = () => season;
  c.realityTvGetEpisode_ = () => episode;
  c.realityTvContestantsForSeason_ = () => contestants;
  c.realityTvQueueForSeason_ = () => queues;
  c.realityTvId_ = () => 'queue-' + (++nextQueue);
  c.realityTvCreateHubPendingResult_ = () => ({ importedResultId: '', reviewId: '' });
  c.realityTvAppendObject_ = (sheet, row) => {
    const saved = { ...row, __rowNumber: queues.length + 2 };
    queues.push(saved);
  };
  c.realityTvUpdateObjectRow_ = (sheet, rowNumber, patch) => {
    if (sheet.name === 'RealityEpisodes') Object.assign(episode, patch);
    if (sheet.name === 'RealityResultQueue') {
      const queue = queues.find(item => item.__rowNumber === rowNumber);
      if (queue) Object.assign(queue, patch);
    }
  };
  c.realityTvGetQueue_ = id => queues.find(item => item.QueueId === id) || null;
  c.realityTvUpdateHubReview_ = () => ({ success: true });

  let submitted = c.apiAdminSubmitRealityTvResult({
    seasonId: season.SeasonId, episodeId: episode.EpisodeId,
    outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify(['a']), username: 'admin'
  });
  assert.strictEqual(queues[0].ReviewStatus, 'PENDING');
  assert.throws(() => c.apiAdminSubmitRealityTvResult({
    seasonId: season.SeasonId, episodeId: episode.EpisodeId,
    outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify(['b']), username: 'admin'
  }), /already has a pending result/i);

  const rejected = c.apiAdminRejectRealityTvResult({ queueId: submitted.queueId, username: 'admin', notes: 'wrong person' });
  assert.strictEqual(rejected.success, true);
  assert.strictEqual(episode.Status, 'OPEN');
  assert.strictEqual(queues[0].ReviewStatus, 'REJECTED');

  submitted = c.apiAdminSubmitRealityTvResult({
    seasonId: season.SeasonId, episodeId: episode.EpisodeId,
    outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify(['b']), username: 'admin'
  });
  assert.strictEqual(JSON.parse(queues[1].SelectedContestantIds)[0], 'b', 'Corrected resubmission must create a new pending row.');

  queues[1].ReviewStatus = 'REJECTED';
  episode.Status = 'FINAL';
  assert.throws(() => c.apiAdminSubmitRealityTvResult({
    seasonId: season.SeasonId, episodeId: episode.EpisodeId,
    outcomeType: 'elimination', selectedContestantIdsJSON: JSON.stringify(['c']), username: 'admin'
  }), /already finalized/i);
  episode.Status = 'OPEN';

  contestants[1].Active = false;
  contestants[1].Status = 'QUIT';
  contestants[1].EliminatedEpisode = '';
  assert.throws(() => c.realityTvValidateEpisodeResultSelection_(season, episode, 'elimination', ['b'], contestants), /not eligible/i);

  contestants[1].Status = 'ELIMINATED';
  contestants[1].EliminatedEpisode = 3;
  const retrySelection = c.realityTvValidateEpisodeResultSelection_(season, episode, 'elimination', ['b'], contestants);
  assert.strictEqual(retrySelection.selectedIds[0], 'b', 'A same-episode partially persisted exit must remain retryable.');

  assert.strictEqual(c.realityTvStatusForExitReason_('', 'medical-withdrawal'), 'WITHDRAWN');
  assert.strictEqual(c.realityTvStatusForExitReason_('', 'quit'), 'QUIT');
  const allRemaining = c.realityTvValidateEpisodeResultSelection_(season, episode, 'double-elimination', ['a', 'c'], contestants);
  assert.throws(() => c.realityTvValidateRemainingContestantsAfterResult_(allRemaining, episode, contestants), /remove every remaining contestant/i);
}

// Exit/cloning eligibility: double/multiple elimination, medical withdrawal, and
// quit rows disappear from the following episode while same-episode retries remain valid.
{
  const c = load('backend/engines/RealityTvSeasonEngine.js');
  const rows = [
    { ContestantId: 'a', Status: 'ACTIVE', Active: true, EliminatedEpisode: '' },
    { ContestantId: 'b', Status: 'ELIMINATED', Active: false, EliminatedEpisode: 2 },
    { ContestantId: 'c', Status: 'WITHDRAWN', Active: false, EliminatedEpisode: 2 },
    { ContestantId: 'd', Status: 'QUIT', Active: false, EliminatedEpisode: 2 },
    { ContestantId: 'e', Status: 'ELIMINATED', Active: false, EliminatedEpisode: 2 }
  ];
  assert.deepStrictEqual(
    Array.from(c.realityTvContestantsEligibleFromRows_(rows, 3)).map(row => row.ContestantId),
    ['a'],
    'Exited contestants must not be cloned into the next episode.'
  );
  assert.strictEqual(c.realityTvContestantsEligibleFromRows_(rows, 2).length, 5, 'Current-episode exits remain visible for settlement retry.');
}

// Sole Survivor deterministic edge cases: late join/no initial pick, multi-exit
// anchor loss, no-elimination preservation, withdrawal variants, disable/re-enable,
// last-contestant survival, and safe two-finalist behavior.
{
  const fakeSheet = {};
  const users = [];
  const history = [];
  const settings = {
    Enabled: true, SourceType: 'reality-tv', StartMultiplier: 1,
    GrowthPerSuccess: 0.1, MaxMultiplier: 2, EligiblePointsCap: 20,
    LossPenalty: 5, WithdrawalBehavior: 'penalty'
  };
  const c = load('backend/engines/SeasonAnchorEngine.js', {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => fakeSheet }) }
  });
  c.seasonAnchorGetSettings_ = () => settings;
  c.seasonAnchorEnsureSystem_ = () => {};
  c.seasonAnchorReadObjects_ = sheetName => sheetName === 'UserSeasonAnchors' ? users : history;
  c.seasonAnchorUpsert_ = (_sheet, _headers, _keys, row) => {
    const i = history.findIndex(item => item.HistoryId === row.HistoryId);
    if (i >= 0) history[i] = { ...history[i], ...row }; else history.push({ ...row, __rowNumber: history.length + 2 });
  };
  c.seasonAnchorUpdateObjectRow_ = (_sheet, rowNumber, patch) => {
    const user = users.find(item => item.__rowNumber === rowNumber);
    if (user) Object.assign(user, patch);
    const hist = history.find(item => item.__rowNumber === rowNumber);
    if (hist) Object.assign(hist, patch);
  };
  c.seasonAnchorRecalculateEpisodeScores_ = () => ({ success: true });

  // A player who never picked and a late joiner who selects after Episode 1 are
  // not retroactively settled for prior episodes.
  assert.strictEqual(c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e1', EpisodeNumber: 1 }, ['x'], 'elimination', 'admin').usersSettled, 0);
  users.push({
    __rowNumber: 2, GameId: 'g', Username: 'late', Active: true,
    CurrentEntityId: 'a', CurrentEntityName: 'A', SelectedEpisodeNumber: 2,
    LastSettledEpisodeNumber: 0, Streak: 0, CurrentMultiplier: 1, Status: 'ACTIVE'
  });
  assert.strictEqual(c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e1', EpisodeNumber: 1 }, ['x'], 'elimination', 'admin').usersSettled, 0);

  // Multi-elimination catches the anchor if it is anywhere in the selected set.
  const multi = c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e2', EpisodeNumber: 2 }, ['a', 'b'], 'multiple-elimination', 'admin');
  assert.strictEqual(multi.usersSettled, 1);
  assert.strictEqual(history[0].Outcome, 'LOSS');
  assert.strictEqual(users[0].Status, 'NEEDS_PICK');

  // New pick, then a no-elimination week preserves streak and multiplier.
  Object.assign(users[0], { CurrentEntityId: 'c', CurrentEntityName: 'C', SelectedEpisodeNumber: 3, LastSettledEpisodeNumber: 2, Streak: 2, CurrentMultiplier: 1.2, Status: 'ACTIVE' });
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e3', EpisodeNumber: 3 }, [], 'no-elimination', 'admin');
  const e3 = history.find(row => row.EpisodeId === 'e3');
  assert.strictEqual(e3.Outcome, 'PRESERVED');
  assert.strictEqual(users[0].Streak, 2);
  assert.strictEqual(users[0].CurrentMultiplier, 1.2);

  // Penalty and free-reset withdrawal variants are deterministic.
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e4', EpisodeNumber: 4 }, ['c'], 'medical-withdrawal', 'admin');
  const e4 = history.find(row => row.EpisodeId === 'e4');
  assert.strictEqual(e4.Outcome, 'LOSS');
  assert.strictEqual(e4.PenaltyPoints, 5);
  Object.assign(users[0], { CurrentEntityId: 'd', CurrentEntityName: 'D', SelectedEpisodeNumber: 5, LastSettledEpisodeNumber: 4, Streak: 1, CurrentMultiplier: 1.1, Status: 'ACTIVE' });
  settings.WithdrawalBehavior = 'free-reset';
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e5', EpisodeNumber: 5 }, ['d'], 'quit', 'admin');
  const e5 = history.find(row => row.EpisodeId === 'e5');
  assert.strictEqual(e5.Outcome, 'RESET');
  assert.strictEqual(e5.PenaltyPoints, 0);

  // Disable/re-enable gates future settlement without rewriting history.
  Object.assign(users[0], { CurrentEntityId: 'winner', CurrentEntityName: 'Winner', SelectedEpisodeNumber: 6, LastSettledEpisodeNumber: 5, Streak: 0, CurrentMultiplier: 1, Status: 'ACTIVE' });
  const historyCount = history.length;
  settings.Enabled = false;
  assert.strictEqual(c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e6', EpisodeNumber: 6 }, ['other'], 'elimination', 'admin').skipped, true);
  assert.strictEqual(history.length, historyCount);
  settings.Enabled = true;
  const final = c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e6', EpisodeNumber: 6 }, ['other'], 'elimination', 'admin');
  assert.strictEqual(final.usersSettled, 1);
  assert.strictEqual(history.find(row => row.EpisodeId === 'e6').Outcome, 'SURVIVED', 'An anchor on the last remaining contestant survives the finale cut.');

  // A two-finalist no-elimination outcome preserves both; current data has no
  // explicit co-winner flag, so it must not invent losses or penalties.
  users.push({ __rowNumber: 3, GameId: 'g', Username: 'co', Active: true, CurrentEntityId: 'co2', CurrentEntityName: 'Co 2', SelectedEpisodeNumber: 7, LastSettledEpisodeNumber: 6, Streak: 3, CurrentMultiplier: 1.3, Status: 'ACTIVE' });
  Object.assign(users[0], { SelectedEpisodeNumber: 7, LastSettledEpisodeNumber: 6, Status: 'ACTIVE' });
  const co = c.seasonAnchorSettleRealityEpisode_({ GameId: 'g', SeasonId: 's' }, { EpisodeId: 'e7', EpisodeNumber: 7 }, [], 'no-elimination', 'admin');
  assert.strictEqual(co.usersSettled, 2);
  assert.strictEqual(history.filter(row => row.EpisodeId === 'e7').every(row => row.Outcome === 'PRESERVED'), true);
}

// Awards grouped build recovery: recover from a partially persisted answer set,
// then from a Hub response timeout using the same idempotency key. Repeated category
// update failure is also safe to retry without duplicating local answers.
{
  const state = { categories: [], createCalls: 0, updateCalls: 0, bulkCalls: 0, bridgeKeys: [], partialOnce: true, timeoutOnce: true, failUpdateOnce: false };
  const c = load('backend/engines/AwardsManagerEngine.js', {
    requireAdmin_: () => true,
    adminCatResolveScoreModeForGame_: (_g, mode) => mode || 'fixed-points',
    adminGetGameSetup: () => ({ categories: state.categories }),
    adminCreateCategory: payload => {
      state.createCalls += 1;
      const row = { ...payload, category: payload.category, categoryId: payload.categoryId, nominees: [] };
      state.categories.push(row);
      return { success: true, categoryId: payload.categoryId };
    },
    adminUpdateCategory: payload => {
      state.updateCalls += 1;
      if (state.failUpdateOnce) { state.failUpdateOnce = false; throw new Error('simulated category update timeout'); }
      const row = state.categories.find(item => item.categoryId === payload.categoryId);
      Object.assign(row, payload);
      return { success: true };
    },
    adminBulkCreateNominees: payload => {
      state.bulkCalls += 1;
      const row = state.categories.find(item => item.categoryId === payload.categoryId);
      const items = JSON.parse(payload.itemsJSON);
      if (state.partialOnce) {
        state.partialOnce = false;
        const first = items[0];
        row.nominees.push({ nomineeId: first.nomineeId, nominee: first.nominee });
        return { success: true, createdCount: 1, created: [{ nomineeId: first.nomineeId }] };
      }
      const created = items.map(item => ({ nomineeId: item.nomineeId }));
      row.nominees.push(...items.map(item => ({ nomineeId: item.nomineeId, nominee: item.nominee })));
      return { success: true, createdCount: items.length, created };
    },
    externalResultsBridgeEnqueue_: (_type, key) => {
      state.bridgeKeys.push(key);
      if (state.timeoutOnce) { state.timeoutOnce = false; throw new Error('simulated Hub response timeout'); }
      return { success: true, jobId: 'hub-job' };
    }
  });

  const markets = [
    { provider: 'polymarket', externalEventId: 'event-1', externalMarketId: 'market-a', eventName: 'Best Show', marketQuestion: 'Will Show A win?', outcomes: ['Yes', 'No'], prices: { Yes: 55, No: 45 }, sourceUrl: 'https://example.com/a' },
    { provider: 'polymarket', externalEventId: 'event-1', externalMarketId: 'market-b', eventName: 'Best Show', marketQuestion: 'Will Show B win?', outcomes: ['Yes', 'No'], prices: { Yes: 45, No: 55 }, sourceUrl: 'https://example.com/b' }
  ];
  const payload = {
    gameId: 'awards-1', categoryId: 'best-show', question: 'Who wins Best Show?', section: 'Awards',
    groupMarketsJSON: JSON.stringify(markets),
    answerLabelsJSON: JSON.stringify({ 'market-a': 'Show A', 'market-b': 'Show B' })
  };
  assert.throws(() => c.apiAdminAwardsCreateQuestionFromMarket(payload), /confirm every missing answer/i);
  assert.strictEqual(state.categories[0].nominees.length, 1, 'The simulated partial write should leave one answer persisted.');
  assert.throws(() => c.apiAdminAwardsCreateQuestionFromMarket(payload), /simulated Hub response timeout/i);
  assert.strictEqual(state.categories[0].nominees.length, 2, 'Retry must create only the missing grouped answer.');
  const success = c.apiAdminAwardsCreateQuestionFromMarket(payload);
  assert.strictEqual(success.resumed, true);
  assert.strictEqual(state.createCalls, 1);
  assert.strictEqual(state.bulkCalls, 2);
  assert.strictEqual(state.bridgeKeys.length, 2);
  assert.strictEqual(state.bridgeKeys[0], state.bridgeKeys[1], 'Hub retry must use the same grouped idempotency key after a response timeout.');

  state.failUpdateOnce = true;
  assert.throws(() => c.apiAdminAwardsCreateQuestionFromMarket(payload), /category update timeout/i);
  const afterUpdateRetry = c.apiAdminAwardsCreateQuestionFromMarket(payload);
  assert.strictEqual(afterUpdateRetry.resumed, true);
  assert.strictEqual(state.categories[0].nominees.length, 2, 'Category-update retry must not duplicate answers.');
}

// Awards relinking records the new mapping and retires prior mapping IDs when
// provider outcome names/IDs change. Partial outcome mapping remains supported.
{
  const queued = [];
  const category = {
    categoryId: 'best-picture',
    nominees: [{ nomineeId: 'a', nominee: 'Film A' }, { nomineeId: 'b', nominee: 'Film B' }],
    resultProvider: 'kalshi', externalEventId: 'old-event', externalMarketId: 'old-market',
    sourceConfigJSON: JSON.stringify({
      provider: 'kalshi', externalEventId: 'old-event', externalMarketId: 'old-market',
      marketIds: ['old-market'], selectedOutcomes: ['Film A', 'Film B'], outcomeMap: { 'Film A': 'a', 'Film B': 'b' }
    })
  };
  const c = load('backend/engines/AwardsManagerEngine.js', {
    requireAdmin_: () => true,
    adminGetGameSetup: () => ({ categories: [category] }),
    adminUpdateCategory: payload => { Object.assign(category, payload); return { success: true }; },
    externalResultsBridgeEnqueue_: (_type, _key, _provider, payload) => { queued.push(payload); return { success: true }; }
  });
  const market = {
    provider: 'kalshi', externalEventId: 'new-event', externalMarketId: 'new-market',
    eventName: 'Best Picture', marketQuestion: 'Best Picture?', outcomes: ['Movie A', 'Movie B', 'Movie C'],
    prices: {}, sourceUrl: 'https://example.com/new'
  };
  const linked = c.apiAdminAwardsLinkMarket({
    gameId: 'awards', categoryId: 'best-picture', marketJSON: JSON.stringify(market),
    outcomeMapJSON: JSON.stringify({ 'Movie A': 'a', 'Movie B': 'b' })
  });
  assert.strictEqual(linked.success, true);
  assert.deepStrictEqual(Object.keys(linked.outcomeMap).sort(), ['Movie A', 'Movie B'], 'Only explicitly mapped provider outcomes should be active.');
  const mappings = queued[0].mappings;
  assert.strictEqual(mappings.filter(row => row.Active === true).length, 2);
  assert.strictEqual(mappings.filter(row => row.Active === false).length, 2, 'Prior provider mappings must be retired on relink.');
  const savedConfig = JSON.parse(category.sourceConfigJSON);
  assert.deepStrictEqual(savedConfig.outcomeMap, { 'Movie A': 'a', 'Movie B': 'b' });
}

// Mocked Awards result lifecycle through the main-app Inbox validator/apply path:
// FINAL external result -> validation -> CategoryResults; conflicting corrections
// are blocked until the prior result is explicitly cleared; void/cancel acts as a
// push; grouped categories can settle with multiple delivered mapping rows.
{
  const setup = {
    game: { type: 'prediction' },
    categories: [{
      categoryId: 'best-show',
      nominees: [{ nomineeId: 'a' }, { nomineeId: 'b' }, { nomineeId: 'c' }]
    }]
  };
  let existingResolution = null;
  const resultRows = [];
  const categoryUpdates = [];
  const c = load('backend/engines/ExternalResultsHubBridgeEngine.js', {
    adminGetGameSetup: () => setup,
    getCategoryResultsResolutionMap: () => existingResolution ? { 'best-show': existingResolution } : {},
    upsertCategoryResultsBulk_: rows => { resultRows.splice(0, resultRows.length, ...rows); },
    adminUpdateCategory: payload => { categoryUpdates.push(payload); return { success: true }; },
    clearAppCaches: () => {},
    dedupeCategoryResultsForCategory_: () => ({ success: true, removed: 0 })
  });
  c.externalResultsInboxQueueHubAck_ = () => ({ success: true });
  c.externalResultsInboxExistingRealityDelivery_ = () => null;
  c.externalResultsInboxRealityMain_ = () => null;
  c.externalResultsInboxRealityQuestion_ = () => null;

  const batch = (winnerIds, resultValue = 'FINAL') => ['a', 'b', 'c'].map(id => ({
    Provider: 'polymarket', Finality: 'FINAL', AppGameId: 'awards', CategoryId: 'best-show',
    NomineeId: id, IsWinner: winnerIds.includes(id), WinnersJSON: JSON.stringify(winnerIds),
    ResultValue: resultValue, WinningOutcome: resultValue, ResultKey: 'winning-outcome',
    ExternalEventId: 'event', ExternalMarketId: 'market-' + id,
    ImportedResultId: 'ir-1', ReviewId: 'review-1', DeliveryBatchId: 'batch-1'
  }));

  let rows = batch(['b']);
  let validation = c.externalResultsInboxValidateGroup_(rows);
  assert.strictEqual(validation.ok, true);
  assert.strictEqual(validation.route, 'GENERIC');
  c.externalResultsInboxApplyGeneric_(validation, rows, 'admin');
  assert.strictEqual(resultRows.find(row => row.nomineeId === 'b').isWinner, true);
  assert.strictEqual(categoryUpdates[0].winnerNomineeId, 'b');

  existingResolution = { resolved: true, result: 'winner', winnerNomineeId: 'b', winnerNomineeIds: ['b'] };
  const conflict = c.externalResultsInboxValidateGroup_(batch(['c']));
  assert.strictEqual(conflict.ok, false);
  assert.strictEqual(conflict.conflict, true, 'A corrected result may not silently overwrite an approved different result.');

  existingResolution = null; // models explicit admin reset before corrected re-apply
  validation = c.externalResultsInboxValidateGroup_(batch(['c']));
  assert.strictEqual(validation.ok, true);
  c.externalResultsInboxApplyGeneric_(validation, batch(['c']), 'admin');
  assert.strictEqual(resultRows.find(row => row.nomineeId === 'c').isWinner, true);

  existingResolution = null;
  rows = batch([], 'market cancelled / void');
  validation = c.externalResultsInboxValidateGroup_(rows);
  assert.strictEqual(validation.ok, true);
  assert.strictEqual(validation.isPush, true);
  c.externalResultsInboxApplyGeneric_(validation, rows, 'admin');
  assert.strictEqual(resultRows.every(row => row.resultStatus === 'push'), true);

  existingResolution = null;
  rows = batch(['a', 'c'], 'grouped awards settlement');
  validation = c.externalResultsInboxValidateGroup_(rows);
  assert.strictEqual(validation.ok, true);
  c.externalResultsInboxApplyGeneric_(validation, rows, 'admin');
  assert.deepStrictEqual(resultRows.filter(row => row.isWinner).map(row => row.nomineeId).sort(), ['a', 'c']);
}

console.log('reality-awards-rc9-priority-certification: PASS');
