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

// Reality cast updates: blank staging cells must preserve existing profile data,
// while nonblank cells still replace it.
{
  const c = load('backend/engines/RealityTvSeasonEngine.js');
  assert.strictEqual(typeof c.realityTvCastImportMergedValue_, 'function', 'cast merge helper missing');
  assert.strictEqual(c.realityTvCastImportMergedValue_('', 'Existing bio'), 'Existing bio');
  assert.strictEqual(c.realityTvCastImportMergedValue_('New bio', 'Existing bio'), 'New bio');
  assert.strictEqual(c.realityTvCastImportMergedValue_('   ', 'Existing bio'), 'Existing bio');
}

// Main Reality result submission: duplicate IDs cannot masquerade as a double
// elimination, and contestants gone before the episode cannot be selected.
{
  const c = load('backend/engines/RealityTvSeasonEngine.js');
  assert.strictEqual(typeof c.realityTvValidateEpisodeResultSelection_, 'function', 'result selection validator missing');
  const season = { SeasonId: 'season-1', ParticipantLabel: 'Contestant' };
  const episode = { EpisodeId: 'ep-3', EpisodeNumber: 3 };
  const contestants = [
    { ContestantId: 'a', Name: 'A', Status: 'ACTIVE', Active: true, EliminatedEpisode: '' },
    { ContestantId: 'b', Name: 'B', Status: 'ELIMINATED', Active: false, EliminatedEpisode: 2 },
    { ContestantId: 'c', Name: 'C', Status: 'ACTIVE', Active: true, EliminatedEpisode: '' }
  ];
  assert.throws(
    () => c.realityTvValidateEpisodeResultSelection_(season, episode, 'double-elimination', ['a', 'a'], contestants),
    /same contestant|duplicate/i
  );
  assert.throws(
    () => c.realityTvValidateEpisodeResultSelection_(season, episode, 'elimination', ['b'], contestants),
    /not eligible/i
  );
  const valid = c.realityTvValidateEpisodeResultSelection_(season, episode, 'double-elimination', ['a', 'c'], contestants);
  assert.strictEqual(JSON.stringify(Array.from(valid.selectedIds)), JSON.stringify(['a', 'c']));
  assert.strictEqual(valid.selected.length, 2);
}

// Awards question creation: a retry after category + answer creation must resume
// instead of creating duplicate categories/answers. This simulates a first Hub
// enqueue failure after the local question is already persisted.
{
  const state = {
    categories: [],
    createCategoryCalls: 0,
    bulkNomineeCalls: 0,
    updateCategoryCalls: 0,
    bridgeCalls: 0,
    failBridgeOnce: true
  };
  const c = load('backend/engines/AwardsManagerEngine.js', {
    requireAdmin_: () => true,
    adminCatResolveScoreModeForGame_: (_gameId, mode) => mode || 'fixed-points',
    adminGetGameSetup: ({ gameId }) => ({
      success: true,
      gameId,
      categories: state.categories
    }),
    adminCreateCategory: payload => {
      state.createCategoryCalls += 1;
      if (state.categories.some(row => row.categoryId === payload.categoryId)) {
        throw new Error('Category already exists: ' + payload.categoryId);
      }
      state.categories.push({
        categoryId: payload.categoryId,
        category: payload.category,
        resultProvider: payload.resultProvider,
        externalEventId: payload.externalEventId,
        externalMarketId: payload.externalMarketId,
        sourceConfigJSON: payload.sourceConfigJSON,
        nominees: []
      });
      return { success: true, categoryId: payload.categoryId };
    },
    adminUpdateCategory: payload => {
      state.updateCategoryCalls += 1;
      const row = state.categories.find(item => item.categoryId === payload.categoryId);
      Object.assign(row, payload);
      return { success: true, categoryId: payload.categoryId };
    },
    adminBulkCreateNominees: payload => {
      state.bulkNomineeCalls += 1;
      const items = JSON.parse(payload.itemsJSON || '[]');
      const row = state.categories.find(item => item.categoryId === payload.categoryId);
      const created = items.map(item => {
        let id = item.nomineeId;
        let suffix = 2;
        while (row.nominees.some(existing => existing.nomineeId === id)) id = item.nomineeId + '-' + suffix++;
        const nominee = { nomineeId: id, nominee: item.nominee };
        row.nominees.push(nominee);
        return nominee;
      });
      return { success: true, createdCount: created.length, created };
    },
    externalResultsBridgeEnqueue_: () => {
      state.bridgeCalls += 1;
      if (state.failBridgeOnce) {
        state.failBridgeOnce = false;
        throw new Error('simulated Hub timeout');
      }
      return { queued: true };
    }
  });

  const market = {
    provider: 'polymarket',
    externalEventId: 'event-1',
    externalMarketId: 'market-1',
    eventName: 'Best Series',
    marketQuestion: 'Who wins Best Series?',
    outcomes: ['Show A', 'Show B'],
    prices: { 'Show A': 0.6, 'Show B': 0.4 },
    sourceUrl: 'https://polymarket.com/event/event-1'
  };
  const payload = {
    gameId: 'awards-2026',
    categoryId: 'best-series',
    question: 'Best Series',
    selectedOutcomesJSON: JSON.stringify(['Show A', 'Show B']),
    marketJSON: JSON.stringify(market)
  };

  assert.throws(() => c.apiAdminAwardsCreateQuestionFromMarket(payload), /simulated Hub timeout/);
  assert.strictEqual(state.createCategoryCalls, 1);
  assert.strictEqual(state.bulkNomineeCalls, 1);
  assert.strictEqual(state.categories[0].nominees.length, 2);

  const retry = c.apiAdminAwardsCreateQuestionFromMarket(payload);
  assert.strictEqual(retry.success, true);
  assert.strictEqual(retry.resumed, true, 'retry should report that it resumed existing local work');
  assert.strictEqual(state.createCategoryCalls, 1, 'retry must not recreate the category');
  assert.strictEqual(state.bulkNomineeCalls, 1, 'retry must not duplicate answers');
  assert.strictEqual(state.categories[0].nominees.length, 2);
  assert.strictEqual(state.bridgeCalls, 2);

  const conflictingLabels = {
    ...payload,
    categoryId: 'slug-collision',
    answerLabelsJSON: JSON.stringify({
      'outcome:Show A': 'Alpha & Beta',
      'outcome:Show B': 'Alpha Beta'
    })
  };
  assert.throws(
    () => c.apiAdminAwardsCreateQuestionFromMarket(conflictingLabels),
    /unique|same answer id|duplicate/i,
    'slug-colliding answer labels must be rejected before persistence'
  );
}

console.log('reality-awards-parallel-hardening-ba38ccd-tests: PASS');
