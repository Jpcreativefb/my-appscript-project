const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const engine = fs.readFileSync('backend/engines/AwardsManagerEngine.js', 'utf8');

const captured = { categories: [], nominees: [], bridge: [] };
const sandbox = {
  console,
  requireAdmin_: () => true,
  adminCatResolveScoreModeForGame_: (_gameId, mode) => mode || 'fixed-points',
  adminCreateCategory: payload => { captured.categories.push(payload); return { success: true, categoryId: payload.categoryId }; },
  adminBulkCreateNominees: payload => {
    const items = JSON.parse(payload.itemsJSON || '[]');
    captured.nominees.push({ payload, items });
    return { createdCount: items.length, created: items.map(item => ({ nomineeId: item.nomineeId })) };
  },
  externalResultsBridgeEnqueue_: (type, key, provider, payload) => {
    captured.bridge.push({ type, key, provider, payload });
    return { queued: true, type };
  }
};
vm.createContext(sandbox);
vm.runInContext(engine, sandbox);

const market = {
  provider: 'polymarket',
  externalEventId: 'emmys-drama',
  externalMarketId: 'best-drama',
  eventName: 'Best Drama Series',
  marketQuestion: 'Which show wins Best Drama Series?',
  outcomes: ['Show A', 'Show B', 'Show C'],
  prices: { 'Show A': 0.55, 'Show B': 0.25, 'Show C': 0.20 },
  sourceUrl: 'https://polymarket.com/event/emmys-drama'
};

const result = sandbox.apiAdminAwardsCreateQuestionFromMarket({
  gameId: 'emmys-2026',
  question: 'Best Drama Series',
  section: 'Drama',
  points: 15,
  displayOrder: 30,
  layoutType: 'compact',
  scoreMode: 'fixed-points',
  maxChanges: -1,
  showMarketProbabilities: true,
  probabilityDisplayJSON: JSON.stringify({ 'outcome:Show A': true, 'outcome:Show C': false }),
  selectedOutcomesJSON: JSON.stringify(['Show A', 'Show C']),
  answerLabelsJSON: JSON.stringify({ 'outcome:Show A': 'Show Alpha', 'outcome:Show C': 'Show Charlie' }),
  officialSourceUrl: 'https://www.emmys.com/awards/nominees-winners',
  marketJSON: JSON.stringify(market)
});

assert.strictEqual(result.success, true);
assert.strictEqual(captured.categories.length, 1);
const category = captured.categories[0];
assert.strictEqual(category.layoutType, 'compact');
assert.strictEqual(category.displayOrder, 30);
assert.strictEqual(category.points, 15);
assert.strictEqual(category.maxChanges, -1);
const sourceConfig = JSON.parse(category.sourceConfigJSON);
assert.strictEqual(sourceConfig.showMarketProbabilities, true);
assert.strictEqual(sourceConfig.probabilityDisplayByNomineeId['show-alpha'], true);
assert.strictEqual(sourceConfig.probabilityDisplayByNomineeId['show-charlie'], false);
assert.strictEqual(JSON.stringify(Array.from(sourceConfig.selectedOutcomes)), JSON.stringify(['Show A', 'Show C']));

assert.strictEqual(captured.nominees.length, 1);
const nominees = captured.nominees[0].items;
assert.deepStrictEqual(nominees.map(item => item.nominee), ['Show Alpha', 'Show Charlie']);
assert.strictEqual(nominees.length, 2, 'Disabled outcome must not be created.');

assert.strictEqual(captured.bridge.length, 1);
const mappings = captured.bridge[0].payload.mappings;
assert.strictEqual(JSON.stringify(mappings.map(item => item.ExpectedOutcome).sort()), JSON.stringify(['Show A', 'Show C']));
assert.strictEqual(mappings.some(item => item.ExpectedOutcome === 'Show B'), false, 'Disabled outcome must not be mapped into the Hub.');

console.log('PASS: Awards Manager batch-builder behavior tests');
