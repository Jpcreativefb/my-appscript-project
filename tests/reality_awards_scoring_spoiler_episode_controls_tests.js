'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function load(file, extra = {}) {
  const c = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, ...extra
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(file, 'utf8'), c);
  return c;
}

function loadMany(files, extra = {}) {
  const c = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, ...extra
  };
  vm.createContext(c);
  files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), c));
  return c;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// 1. Reality scoring integrity: settlement -> CategoryResults -> scoring/UI ->
// leaderboard. Multiple winners must use one canonical winner set everywhere.
// A configured zero-point question may be correct and legitimately award 0.
// ---------------------------------------------------------------------------
{
  const settledRows = [];
  const q = loadMany(['backend/engines/RealityTvSeasonEngine.js', 'backend/engines/RealityTvQuestionPackEngine.js'], {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({}) }) },
    adminGetGameSetup: () => ({
      categories: [{
        categoryId: 'episode-2-reward',
        nominees: [
          { nomineeId: 'red', nominee: 'Red' },
          { nomineeId: 'blue', nominee: 'Blue' },
          { nomineeId: 'green', nominee: 'Green' }
        ]
      }]
    }),
    upsertCategoryResultsBulk_: rows => settledRows.push(...rows),
    adminUpdateCategory: () => ({ success: true })
  });
  q.realityTvUpdateObjectRow_ = () => {};
  q.seasonAnchorRecalculateEpisodeScores_ = () => ({ success: true });

  const settlement = q.realityTvSettleSupplementalQuestion_(
    {
      __rowNumber: 2,
      GameId: 'game-1', SeasonId: 'season-1', EpisodeId: 'ep-2',
      CategoryId: 'episode-2-reward', ExternalEventId: 'ev', ExternalMarketId: 'mk', ResultKey: 'reward'
    },
    {
      ResultMode: 'multiple-winners',
      SelectedOutcomeIdsJSON: JSON.stringify(['red', 'blue']),
      SelectedOutcomeLabelsJSON: JSON.stringify(['Red', 'Blue'])
    },
    'admin'
  );
  assert.deepStrictEqual(plain(settlement.winnerIds).sort(), ['blue', 'red']);
  assert.strictEqual(settledRows.filter(row => row.isWinner).length, 2, 'Settlement must persist both winners to CategoryResults.');

  const cr = load('backend/engines/CategoryResultsEngine.js');
  cr.getCategoryResultsRows_ = () => settledRows.map(row => ({
    categoryId: row.categoryId,
    nomineeId: row.nomineeId,
    resultStatus: row.resultStatus,
    isWinner: row.isWinner,
    settledAt: row.settledAt
  }));
  const resolutions = cr.getCategoryResultsResolutionMap('game-1');
  assert.deepStrictEqual(plain(resolutions['episode-2-reward'].winnerNomineeIds).sort(), ['blue', 'red']);

  const sc = load('backend/engines/ScoringEngine.js');
  sc.validateGameId = () => true;
  sc.getDefaultGameId = () => 'game-1';
  sc.getGameRuntimeConfig = () => ({ type: 'prediction', fixedPointsEnabled: true, confidenceEnabled: false, stakedPointsEnabled: false });
  sc.getGame = sc.getGameRuntimeConfig;
  sc.isConfidenceScoringGame_ = () => false;
  sc.getConfidenceScoringMode_ = () => 'win_only';
  sc.normalizeCategoryScoreMode_ = value => String(value || 'correct-pick').toLowerCase();
  sc.isFixedPointScoringEnabledForGame_ = () => true;
  sc.getHybridCategoryResolution_ = (id, _config, map) => map[id] || { resolved: false, result: 'pending' };
  sc.getCategoryResultsResolutionMap = () => resolutions;
  sc.getCategories = () => [{ id: 'episode-2-reward', name: 'Reward winner' }];
  sc.getCategorySettings = () => ({ 'episode-2-reward': { points: 8, scoreMode: 'correct-pick', changePenalty: 0 } });
  sc.apiGetMyPicks = () => ({ picks: { 'episode-2-reward': 'blue' }, changeCounts: {}, confidencePoints: {}, stakePoints: {} });
  sc.buildUserPicksMap_ = () => ({ alice: { 'episode-2-reward': { nomineeId: 'blue', changeCount: 0 } } });
  sc.seasonAnchorAdjustmentsForGame_ = () => ({});
  sc.getLeaderboardUserProfile_ = () => ({});

  const scoring = sc.getUserScoring('alice', 'game-1')['episode-2-reward'];
  assert.strictEqual(scoring.correct, true);
  assert.strictEqual(scoring.earnedPoints, 8, 'A valid secondary winner must receive the configured points.');
  const leaderboard = sc.getLeaderboardData('game-1');
  assert.strictEqual(leaderboard[0].total, 8, 'The same correct multi-winner pick must reach the leaderboard.');

  const ui = load('frontend/js/pages/picks.js', {
    localStorage: { getItem: () => '', setItem: () => {} },
    window: {}, document: {}, navigator: {}, location: {},
    setTimeout, clearTimeout, setInterval, clearInterval, fetch: async () => ({})
  });
  const uiState = ui.getPickStatus({
    id: 'episode-2-reward',
    winnerNomineeId: 'red', winnerNomineeIds: ['red', 'blue'], resultStatus: 'settled'
  }, 'blue');
  assert.strictEqual(uiState.className, 'correct', 'Player-facing correct/wrong state must agree with backend scoring.');

  sc.getCategorySettings = () => ({ 'episode-2-reward': { points: 0, scoreMode: 'correct-pick', changePenalty: 0 } });
  const zero = sc.getUserScoring('alice', 'game-1')['episode-2-reward'];
  assert.strictEqual(zero.correct, true, 'Zero configured points does not make a correct pick wrong.');
  assert.strictEqual(zero.earnedPoints, 0, 'A zero-point question must remain a legitimate zero-point result.');
}

// ---------------------------------------------------------------------------
// 2. Sole Survivor multiplier + MasterChef-style replacement reopening + Home
// Hub progress. Duplicate settlement must never award a second adjustment.
// ---------------------------------------------------------------------------
{
  const users = [{
    __rowNumber: 2, GameId: 'game-1', SeasonId: 'season-1', Username: 'alice', Active: true,
    CurrentEntityId: 'chef-a', CurrentEntityName: 'Chef A', SelectedEpisodeNumber: 1,
    LastSettledEpisodeNumber: 0, Streak: 0, CurrentMultiplier: 1, Status: 'ACTIVE'
  }];
  const history = [];
  const fakeSheets = {
    UserSeasonAnchors: { name: 'UserSeasonAnchors' },
    SeasonAnchorHistory: { name: 'SeasonAnchorHistory' }
  };
  const settings = {
    Enabled: true, SourceType: 'reality-tv', StartMultiplier: 1,
    GrowthPerSuccess: 0.5, MaxMultiplier: 2, EligiblePointsCap: 20,
    LossPenalty: 4, WithdrawalBehavior: 'penalty'
  };
  const c = load('backend/engines/SeasonAnchorEngine.js', {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: name => fakeSheets[name] || { name } }) }
  });
  c.seasonAnchorGetSettings_ = () => settings;
  c.seasonAnchorEnsureSystem_ = () => {};
  c.seasonAnchorReadObjects_ = sheetName => sheetName === 'UserSeasonAnchors' ? users : history;
  c.seasonAnchorUpsert_ = (_sheet, _headers, _keys, row) => {
    const found = history.find(item => item.HistoryId === row.HistoryId);
    if (found) Object.assign(found, row);
    else history.push({ ...row, __rowNumber: history.length + 2 });
  };
  c.seasonAnchorUpdateObjectRow_ = (sheet, rowNumber, patch) => {
    if (sheet && sheet.name === 'UserSeasonAnchors') {
      const row = users.find(item => item.__rowNumber === rowNumber);
      if (row) Object.assign(row, patch);
    } else {
      const row = history.find(item => item.__rowNumber === rowNumber);
      if (row) Object.assign(row, patch);
    }
  };
  c.seasonAnchorEpisodeCategoryIds_ = () => ['q'];
  c.seasonAnchorUserFixedPointsForCategories_ = () => 10;
  c.clearGameCaches = () => {};

  // Episode 1 survives at 1.0x; next multiplier grows to 1.5x.
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'game-1', SeasonId: 'season-1' }, { EpisodeId: 'e1', EpisodeNumber: 1 }, ['other'], 'elimination', 'admin');
  assert.strictEqual(users[0].Streak, 1);
  assert.strictEqual(users[0].CurrentMultiplier, 1.5);
  assert.strictEqual(history[0].BonusPoints, 0);

  // No elimination preserves the multiplier/streak and awards no multiplier bonus.
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'game-1', SeasonId: 'season-1' }, { EpisodeId: 'e2', EpisodeNumber: 2 }, [], 'no-elimination', 'admin');
  assert.strictEqual(users[0].Streak, 1);
  assert.strictEqual(users[0].CurrentMultiplier, 1.5);
  assert.strictEqual(history[1].Outcome, 'PRESERVED');
  assert.strictEqual(history[1].NetAdjustment, 0);

  // Next survival applies 1.5x to eligible episode points: 10 base => +5 bonus.
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'game-1', SeasonId: 'season-1' }, { EpisodeId: 'e3', EpisodeNumber: 3 }, ['other'], 'elimination', 'admin');
  assert.strictEqual(users[0].CurrentMultiplier, 2, 'Growth must respect the configured multiplier cap.');
  assert.strictEqual(history[2].MultiplierApplied, 1.5);
  assert.strictEqual(history[2].BonusPoints, 5);

  // At cap, another survival uses 2x but never grows above 2x.
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'game-1', SeasonId: 'season-1' }, { EpisodeId: 'e4', EpisodeNumber: 4 }, ['other'], 'elimination', 'admin');
  assert.strictEqual(users[0].CurrentMultiplier, 2);
  assert.strictEqual(history[3].BonusPoints, 10);
  const duplicate = c.seasonAnchorSettleRealityEpisode_({ GameId: 'game-1', SeasonId: 'season-1' }, { EpisodeId: 'e4', EpisodeNumber: 4 }, ['other'], 'elimination', 'admin');
  assert.strictEqual(duplicate.usersSettled, 0, 'Duplicate episode processing must not add the multiplier twice.');
  assert.strictEqual(history.length, 4);

  // MasterChef-style elimination: the finalized chef is eliminated and the live
  // anchor is cleared/reopened instead of remaining stuck finalized.
  c.seasonAnchorSettleRealityEpisode_({ GameId: 'game-1', SeasonId: 'season-1' }, { EpisodeId: 'e5', EpisodeNumber: 5 }, ['chef-a'], 'elimination', 'admin');
  assert.strictEqual(users[0].Status, 'NEEDS_PICK');
  assert.strictEqual(users[0].CurrentEntityId, '');
  assert.strictEqual(users[0].CurrentMultiplier, 1);
  assert.strictEqual(history[4].PenaltyPoints, 4);

  // Home Hub state: no selection/reopened is outstanding; replacement finalized is complete.
  c.seasonAnchorGetUserRow_ = () => users[0];
  c.realityTvSpoilerStateForGame_ = () => ({ hasHiddenResults: false });
  let progress = c.seasonAnchorDashboardProgress_('alice', 'game-1');
  assert.strictEqual(progress.outstanding, 1);
  users[0].CurrentEntityId = 'chef-b'; users[0].CurrentEntityName = 'Chef B'; users[0].Status = 'ACTIVE'; users[0].SelectedEpisodeNumber = 6;
  progress = c.seasonAnchorDashboardProgress_('alice', 'game-1');
  assert.strictEqual(progress.outstanding, 0);
  assert.strictEqual(progress.made, 1);

  // A never-selected player remains outstanding.
  c.seasonAnchorGetUserRow_ = () => null;
  progress = c.seasonAnchorDashboardProgress_('bob', 'game-1');
  assert.strictEqual(progress.outstanding, 1);

  // If the replacement reopen itself is a hidden spoiler, Home Hub stays at the
  // pre-result complete state until the player reveals the episode.
  c.seasonAnchorGetUserRow_ = () => ({ Status: 'NEEDS_PICK', CurrentEntityId: '', LastSettledEpisodeNumber: 6 });
  c.realityTvSpoilerStateForGame_ = () => ({ hasHiddenResults: true });
  progress = c.seasonAnchorDashboardProgress_('alice', 'game-1');
  assert.strictEqual(progress.outstanding, 0);
  assert.strictEqual(progress.hiddenBySpoiler, true);

  // Aggregate history is the exact contribution consumed by the leaderboard.
  const adjustments = c.seasonAnchorAdjustmentsForGame_('game-1');
  assert.strictEqual(adjustments.alice.net, history.reduce((sum, row) => sum + Number(row.NetAdjustment || 0), 0));

  const sc = load('backend/engines/ScoringEngine.js');
  sc.validateGameId = () => true;
  sc.getGameRuntimeConfig = () => ({ type: 'prediction', fixedPointsEnabled: true, confidenceEnabled: false, stakedPointsEnabled: false });
  sc.getGame = sc.getGameRuntimeConfig;
  sc.isConfidenceScoringGame_ = () => false;
  sc.getConfidenceScoringMode_ = () => 'win_only';
  sc.getCategorySettings = () => ({});
  sc.getCategoryResultsResolutionMap = () => ({});
  sc.buildUserPicksMap_ = () => ({ alice: {} });
  sc.seasonAnchorAdjustmentsForGame_ = () => adjustments;
  sc.isFixedPointScoringEnabledForGame_ = () => true;
  sc.getLeaderboardUserProfile_ = () => ({});
  const board = sc.getLeaderboardData('game-1');
  assert.strictEqual(board[0].seasonAnchorNet, adjustments.alice.net);
  assert.strictEqual(board[0].total, adjustments.alice.net, 'Sole Survivor adjustment must be included in leaderboard total exactly once.');
}

// ---------------------------------------------------------------------------
// 3. Per-episode question enable/disable + ordering: disabled questions are not
// player-visible, do not require results, survive repair, and do not carry to a
// new episode when the season default is still enabled.
// ---------------------------------------------------------------------------
{
  const q = loadMany(['backend/engines/RealityTvSeasonEngine.js', 'backend/engines/RealityTvQuestionPackEngine.js'], {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({}) }) }
  });
  assert.strictEqual(q.realityTvEpisodeQuestionEnabled_({ Enabled: '' }), true);
  assert.strictEqual(q.realityTvEpisodeQuestionEnabled_({ Enabled: false }), false);
  assert.deepStrictEqual(plain(q.realityTvQuestionOrderMap_({ reward: 10, immunity: 20 })), { reward: 10, immunity: 20 });

  // Repair sees a deliberately disabled current-episode row as complete work.
  q.adminGetGameSetup = () => ({ categories: [{ categoryId: 'episode-1-reward', nominees: [{ nomineeId: 'a' }, { nomineeId: 'b' }] }] });
  q.realityTvEpisodeQuestionsForSeason_ = () => [{ EpisodeId: 'e1', EpisodeQuestionId: 'e1-reward', TemplateId: 'reward', CategoryId: 'episode-1-reward', Enabled: false }];
  q.realityTvAnswerOptionsForTemplate_ = () => ({ skipped: false, options: [{ id: 'a' }, { id: 'b' }] });
  const defs = { reward: { TemplateId: 'reward', QuestionType: 'reward', Enabled: true } };
  assert.strictEqual(q.realityTvQuestionPackMissingTemplateIndex_({ GameId: 'g' }, { EpisodeId: 'e1', EpisodeNumber: 1 }, ['reward'], defs), -1,
    'Recovery must not silently re-enable a per-episode disabled question.');
  q.realityTvEpisodeQuestionsForSeason_ = () => [];
  assert.strictEqual(q.realityTvQuestionPackMissingTemplateIndex_({ GameId: 'g' }, { EpisodeId: 'e2', EpisodeNumber: 2 }, ['reward'], defs), 0,
    'A new episode must inherit the enabled season default rather than the prior episode disable.');

  // Disabled questions cannot accept results.
  q.requireAdmin_ = () => true;
  q.realityTvEnsureSystem_ = () => {};
  q.realityTvEnsureQuestionPackSystem_ = () => {};
  q.realityTvGetEpisodeQuestion_ = () => ({ Enabled: false, Status: 'OPEN' });
  assert.throws(() => q.apiAdminSubmitRealityTvQuestionResult({ episodeQuestionId: 'e1-reward' }), /disabled for this episode/i);

  // Saved picks/results protect a question from being disabled; otherwise the
  // episode row and underlying category are both deactivated, not deleted.
  let categoryPatch = null;
  let rowPatch = null;
  const question = { __rowNumber: 2, EpisodeQuestionId: 'e1-reward', CategoryId: 'episode-1-reward', Enabled: true, Status: 'OPEN' };
  q.adminUpdateCategory = payload => { categoryPatch = payload; return { success: true }; };
  q.realityTvUpdateObjectRow_ = (_sheet, _row, patch) => { rowPatch = patch; };
  q.realityTvEpisodeQuestionHasProtectedState_ = () => ({ blocked: true, reason: 'saved picks' });
  let result = q.realityTvSetEpisodeQuestionEnabled_({ GameId: 'g' }, question, false);
  assert.strictEqual(result.preserved, true);
  assert.strictEqual(categoryPatch, null);
  q.realityTvEpisodeQuestionHasProtectedState_ = () => ({ blocked: false, reason: '' });
  result = q.realityTvSetEpisodeQuestionEnabled_({ GameId: 'g' }, question, false);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(rowPatch.Enabled, false);
  assert.strictEqual(categoryPatch.active, false);

  // Compatibility recovery builder receives template order directly; this
  // catches the undefined order/id regression in the fallback path.
  let fallbackOrder = null;
  q.realityTvBuildSupplementalQuestionForTemplate_ = (_season, _episode, template, options) => {
    fallbackOrder = options.displayOrder;
    return { skipped: false, createdCategory: true, question: { EpisodeQuestionId: 'e2-reward' } };
  };
  q.realityTvFinalizeBulkQuestionBuildJob_ = () => ({ buildId: 'b', complete: true });
  const fallback = q.realityTvMaterializeEpisodeQuestionPackFallback_({ GameId: 'g' }, { EpisodeId: 'e2' }, [{ TemplateId: 'reward', QuestionType: 'reward', DisplayOrder: 17 }], {});
  assert.strictEqual(fallback.success, true);
  assert.strictEqual(fallbackOrder, 17);

  // If a partial episode build never created an inherited question, disabling
  // it must still persist an episode-only tombstone so repair does not recreate
  // it. This action must not require creating an active category first.
  let disabledOverride = null;
  const partialSeason = { SeasonId: 's', GameId: 'g', Points: 5 };
  const partialEpisode = { EpisodeId: 'e-partial', EpisodeNumber: 3, ExternalEventId: 'event-3', Status: 'OPEN' };
  const partialTemplate = { TemplateId: 'reward', QuestionType: 'reward', QuestionTemplate: 'Who wins reward?', AnswerSource: 'manual', ResultKey: 'reward', Points: 5, Enabled: true, DisplayOrder: 10, CustomAnswerOptionsJSON: JSON.stringify(['A', 'B']) };
  q.realityTvGetSeason_ = () => partialSeason;
  q.realityTvResolveQuestionBuildEpisode_ = () => partialEpisode;
  q.realityTvQuestionTemplatesForSeason_ = () => [partialTemplate];
  q.realityTvEpisodeQuestionsForSeason_ = () => [];
  q.realityTvGetEpisodeQuestion_ = () => null;
  q.realityTvUpsertObject_ = (_ss, _sheet, _headers, _keys, row) => { disabledOverride = row; return row; };
  q.realityTvCancelOtherQuestionBuildsForEpisode_ = () => {};
  q.realityTvClearRuntimeCaches_ = () => {};
  q.realityTvSyncAllSupplementalQuestionsToHub_ = () => ({ success: true, skipped: true });
  q.realityTvEnsureSystem_ = () => {};
  q.realityTvEnsureQuestionPackSystem_ = () => {};
  q.requireAdmin_ = () => true;
  q.adminGetGameSetup = () => ({ categories: [] });
  const partialPlan = q.apiAdminApplyRealityTvEpisodeQuestionPlan({ seasonId: 's', episodeId: 'e-partial', enabledQuestionTypesJSON: '[]' });
  assert.strictEqual(partialPlan.disabledCount, 1);
  assert(disabledOverride && disabledOverride.Enabled === false);
  assert.strictEqual(disabledOverride.EpisodeQuestionId, 'e-partial-reward');

  // Hub mirroring uses the enabled current-episode set as a replacement pack.
  // That lets the bridge deactivate stale markets/mappings for questions that
  // were disabled after the episode was first created.
  q.realityTvEpisodeQuestionsForSeason_ = () => [
    { EpisodeId: 'e1', EpisodeQuestionId: 'eq-enabled', CategoryId: 'enabled-q', ExternalMarketId: 'market-enabled', ResultKey: 'reward', QuestionText: 'Reward?', Enabled: true, Status: 'OPEN', AnswerOptionsJSON: JSON.stringify([{ id: 'a', label: 'A', subjectType: 'outcome' }]) },
    { EpisodeId: 'e1', EpisodeQuestionId: 'eq-disabled', CategoryId: 'disabled-q', ExternalMarketId: 'market-disabled', ResultKey: 'bottom', QuestionText: 'Bottom?', Enabled: false, Status: 'OPEN', AnswerOptionsJSON: JSON.stringify([{ id: 'b', label: 'B', subjectType: 'outcome' }]) }
  ];
  const hubEntries = q.realityTvSupplementalHubEntriesForEpisode_({ SeasonId: 's', GameId: 'g' }, { EpisodeId: 'e1' });
  assert.strictEqual(hubEntries.length, 1);
  assert.strictEqual(hubEntries[0].question.CategoryId, 'enabled-q');
  const hubPayload = q.realityTvBuildSupplementalHubPayload_({ SeasonId: 's', GameId: 'g', ShowName: 'Show' }, { EpisodeId: 'e1', EpisodeName: 'Episode 1', ExternalEventId: 'event-1' }, hubEntries);
  assert.strictEqual(hubPayload.replaceQuestionPack, true);
  assert.deepStrictEqual(plain(hubPayload.markets.map(row => row.ExternalMarketId)), ['market-enabled']);

  const bridgeUpdates = [];
  const bridge = load('backend/engines/ExternalResultsHubBridgeEngine.js', { SpreadsheetApp: { flush: () => {} } });
  const marketSheet = { kind: 'markets' };
  const mappingSheet = { kind: 'mappings' };
  bridge.externalResultsBridgeEnsureSheet_ = (_hub, name) => name === 'ExternalMarkets' ? marketSheet : mappingSheet;
  bridge.externalResultsBridgeReadObjects_ = sheet => sheet === marketSheet ? [
    { __rowNumber: 2, Provider: 'manual-reality-tv', ExternalEventId: 'event-1', ExternalMarketId: 'market-enabled', RawJSON: JSON.stringify({ episodeQuestionId: 'eq-enabled' }) },
    { __rowNumber: 3, Provider: 'manual-reality-tv', ExternalEventId: 'event-1', ExternalMarketId: 'market-disabled', RawJSON: JSON.stringify({ episodeQuestionId: 'eq-disabled' }) }
  ] : [
    { __rowNumber: 2, MappingId: 'g-enabled-q-a', Provider: 'manual-reality-tv', ExternalEventId: 'event-1', SourceConfigJSON: JSON.stringify({ episodeQuestionId: 'eq-enabled' }) },
    { __rowNumber: 3, MappingId: 'g-disabled-q-b', Provider: 'manual-reality-tv', ExternalEventId: 'event-1', SourceConfigJSON: JSON.stringify({ episodeQuestionId: 'eq-disabled' }) }
  ];
  bridge.externalResultsBridgeUpdateRow_ = (sheet, rowNumber, patch) => bridgeUpdates.push({ kind: sheet.kind, rowNumber, patch });
  const cleanup = bridge.externalResultsBridgeDeactivateStaleRealityQuestionPack_({}, hubPayload);
  assert.strictEqual(cleanup.markets, 1);
  assert.strictEqual(cleanup.mappings, 1);
  assert(bridgeUpdates.some(update => update.kind === 'markets' && update.rowNumber === 3 && update.patch.ResolutionStatus === 'inactive'));
  assert(bridgeUpdates.some(update => update.kind === 'mappings' && update.rowNumber === 3 && update.patch.Active === false));
}

// Player-facing Reality payload excludes disabled episode questions and keeps
// remaining enabled questions in persistent DisplayOrder.
{
  const rows = {
    RealitySeasons: [{ SeasonId: 's', GameId: 'g', ShowName: 'MasterChef', SeasonName: 'S', ShowFormat: 'general-elimination', ParticipantType: 'individual', ParticipantLabel: 'Cook', GroupLabel: 'Team', PeriodLabel: 'Episode', CurrentEpisodeNumber: 1 }],
    RealityContestants: [], RealityGroups: [], RealityContestantGroupHistory: [], RealityEpisodeVotes: [],
    RealityEpisodes: [{ SeasonId: 's', GameId: 'g', EpisodeId: 'e1', EpisodeNumber: 1, EpisodeName: 'Episode 1', CategoryId: 'elim', Status: 'OPEN' }],
    RealityEpisodeQuestions: [
      { SeasonId: 's', GameId: 'g', EpisodeId: 'e1', EpisodeNumber: 1, CategoryId: 'disabled-q', QuestionType: 'reward', Enabled: false, DisplayOrder: 10, Status: 'OPEN' },
      { SeasonId: 's', GameId: 'g', EpisodeId: 'e1', EpisodeNumber: 1, CategoryId: 'enabled-b', QuestionType: 'bottom', Enabled: true, DisplayOrder: 30, Status: 'OPEN' },
      { SeasonId: 's', GameId: 'g', EpisodeId: 'e1', EpisodeNumber: 1, CategoryId: 'enabled-a', QuestionType: 'safety', Enabled: true, DisplayOrder: 20, Status: 'OPEN' }
    ],
    RealitySpoilerShield: []
  };
  const c = loadMany(['backend/engines/RealityTvSeasonEngine.js', 'backend/engines/RealityTvQuestionPackEngine.js'], {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => null }) }
  });
  c.realityTvHasSeasonForGameCached_ = () => true;
  c.realityTvReadObjects_ = (_ss, name) => rows[name] || [];
  c.realityTvReadOnlyGroupBundle_ = () => [];
  c.realityTvReadOnlyGroupHistory_ = () => [];
  c.realityTvReadOnlyGroupProfiles_ = () => ({});
  const view = c.realityTvUserGameViewPayload_('g', 'alice', {});
  assert.deepStrictEqual(plain(view.episodeQuestions.map(item => item.categoryId)), ['enabled-a', 'enabled-b']);
}

// Disabled category rows do not count toward Home Hub outstanding picks because
// the dashboard context uses the same Active flag that getCategories uses.
{
  const c = load('backend/engines/AppDataEngine.js');
  c.getAllCategoriesData_ = () => [
    ['GameId', 'Category', 'Nominee', 'CategoryId', 'Active'],
    ['g', 'Reward', 'A', 'reward', false],
    ['g', 'Reward', 'B', 'reward', false],
    ['g', 'Safety', 'A', 'safety', true],
    ['g', 'Safety', 'B', 'safety', true]
  ];
  c.getCategoriesColumnMap_ = headers => ({
    gameId: headers.indexOf('GameId'), category: headers.indexOf('Category'), nominee: headers.indexOf('Nominee'),
    categoryId: headers.indexOf('CategoryId'), active: headers.indexOf('Active')
  });
  c.validateCategoriesColumns_ = () => {};
  c.normalizeBoolean_ = value => value === true || String(value).toLowerCase() === 'true';
  const context = { totalCategoriesByGame: { g: 0 }, pickCategoryIdsByGame: { g: [] }, betCategoryIdsByGame: { g: [] } };
  c.buildDashboardCategoryTotalsIntoContext_(context, { g: true });
  assert.strictEqual(context.totalCategoriesByGame.g, 1, 'Disabled episode question must not count as a pick remaining.');
}

// ---------------------------------------------------------------------------
// 4. Spoiler Shield: per-game preference, per-episode reveal/reset, payload
// redaction, anchor/dashboard concealment, and safe notification presentation.
// ---------------------------------------------------------------------------
{
  const c = load('backend/engines/RealityTvSeasonEngine.js');
  const episodes = [
    { EpisodeId: 'e1', EpisodeNumber: 1, Status: 'FINAL' },
    { EpisodeId: 'e2', EpisodeNumber: 2, Status: 'FINAL' },
    { EpisodeId: 'e3', EpisodeNumber: 3, Status: 'FINAL' }
  ];
  const pref = { Username: 'alice', GameId: 'g', RecordType: 'PREFERENCE', ShieldEnabled: true, EpisodeNumber: 2 };
  let state = c.realityTvSpoilerStateFromRows_('alice', 'g', 's', episodes, [pref]);
  assert.deepStrictEqual(plain(state.hiddenEpisodeIds), ['e3'], 'Enabling the shield must not retroactively hide already-final episodes.');
  state = c.realityTvSpoilerStateFromRows_('alice', 'g', 's', episodes, [pref, { Username: 'alice', GameId: 'g', RecordType: 'REVEAL', EpisodeId: 'e3', Revealed: true }]);
  assert.deepStrictEqual(plain(state.hiddenEpisodeIds), []);
  state = c.realityTvSpoilerStateFromRows_('alice', 'g', 's', episodes.concat([{ EpisodeId: 'e4', EpisodeNumber: 4, Status: 'FINAL' }]), [pref, { Username: 'alice', GameId: 'g', RecordType: 'REVEAL', EpisodeId: 'e3', Revealed: true }]);
  assert.deepStrictEqual(plain(state.hiddenEpisodeIds), ['e4'], 'Reveal state must reset naturally for the next episode.');

  const payload = {
    episodes: [{ episodeId: 'e4', episodeNumber: 4, eliminated: [{ id: 'chef-a' }], voteDetails: { rows: [1] } }],
    episodeQuestions: [{ episodeId: 'e4', categoryId: 'q4', status: 'FINAL' }]
  };
  c.realityTvApplySpoilerShield_(payload, { enabled: true, hiddenEpisodeIds: ['e4'], hasHiddenResults: true });
  assert.strictEqual(payload.episodes[0].resultsHidden, true);
  assert.deepStrictEqual(plain(payload.episodes[0].eliminated), []);
  assert.strictEqual(payload.episodes[0].voteDetails, null);
  assert.strictEqual(payload.episodeQuestions[0].status, 'HIDDEN');
}

{
  const c = load('backend/engines/SeasonAnchorEngine.js');
  c.validateUserSession_ = () => true;
  c.seasonAnchorUserPayload_ = () => ({ enabled: true, user: { currentEntityId: '', status: 'NEEDS_PICK' }, entities: [{ id: 'chef-b' }] });
  c.realityTvSpoilerStateForGame_ = () => ({ enabled: true, hasHiddenResults: true, hiddenEpisodeIds: ['e5'] });
  const hidden = c.apiGetSeasonAnchor({ username: 'alice', token: 't', gameId: 'g' });
  assert.strictEqual(hidden.seasonAnchor.hiddenBySpoiler, true, 'Eliminated anchor/replacement state must not leak before episode reveal.');
  assert.throws(() => c.apiSaveSeasonAnchorPick({ username: 'alice', token: 't', gameId: 'g', entityId: 'chef-b' }), /Reveal the settled Reality episode/i);
}

{
  const n = load('backend/engines/NotificationsEngine.js');
  const safe = n.notificationPushRealitySpoilerPresentation_('alice', 'g', 'results', { alice: true });
  assert(safe && /results are ready/i.test(safe.title));
  assert(!/eliminat|winner|correct|wrong/i.test(safe.message), 'Shielded push copy must not reveal a result.');
  assert.strictEqual(n.notificationPushRealitySpoilerPresentation_('alice', 'g', 'reminder', { alice: true }), null);
}

{
  const ui = load('frontend/js/pages/picks.js', {
    localStorage: { getItem: () => '', setItem: () => {} }, window: {}, document: {}, navigator: {}, location: {},
    setTimeout, clearTimeout, setInterval, clearInterval, fetch: async () => ({})
  });
  const html = vm.runInContext("PICKS_PAGE_DATA.seasonAnchor={enabled:true,hiddenBySpoiler:true}; renderSeasonAnchorPickCard_();", ui);
  assert(/Sole Survivor status hidden/i.test(html));
}

// Shared API guards are intentionally narrow and only activate when the Reality
// per-user spoiler state reports unrevealed finalized results.
{
  const api = fs.readFileSync('backend/Api.js', 'utf8');
  assert(api.includes('apiRealityTvSpoilerGuard_'));
  assert(api.includes('spoilerShieldHidden: true'));
  assert(api.includes('Standings are hidden until you reveal the settled Reality episode.'));
  assert(api.includes('Results are hidden until you reveal the settled Reality episode.'));
}

// Admin UI exposes separate season defaults and current-episode controls plus
// persistent episode/season order inputs in the same workflow.
{
  const admin = fs.readFileSync('frontend/js/pages/adminRealityTv.js', 'utf8');
  assert(admin.includes('Use This Episode'));
  assert(admin.includes('Season default'));
  assert(admin.includes('rt-episode-question-order'));
  assert(admin.includes('rt-season-question-order'));
  assert(admin.includes('Elimination episode order'));
}

console.log('reality-awards-scoring-spoiler-episode-controls-tests: PASS');
