const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const betting = fs.readFileSync(path.join(root, 'backend/engines/BettingEngine.js'), 'utf8');

assert(betting.includes('function getCanonicalHybridBettingSource_'));
assert(betting.includes('newly saved wager question cannot disappear'));
assert(betting.includes('"canonical-hybrid"'));
assert(betting.includes('mode === "sports-wager"'));

const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  Boolean,
  RegExp,
  isFinite,
  parseInt,
  parseFloat,
  Logger: { log() {} }
};
vm.createContext(context);
vm.runInContext(betting, context);

context.getDefaultGameId = () => 'hybrid-test';
context.validateGameId = () => true;
context.getBettingGameConfig = () => ({
  enabled: true,
  mixedGame: true,
  defaultOdds: 2,
  startingBankroll: 1000,
  minBet: 1,
  maxBet: 100
});
context.getCategories = () => [
  {
    id: 'fixed-question',
    name: 'Fixed question',
    scoreMode: 'fixed-points',
    nominees: [
      { id: 'yes', name: 'Yes' },
      { id: 'no', name: 'No' }
    ]
  }
];
context.getCategorySettings = () => ({
  'fixed-question': { scoreMode: 'fixed-points' }
});
context.getBettingOddsMap_ = () => ({});
context.adminGetGameSetup = () => ({
  categories: [
    {
      categoryId: 'fixed-question',
      category: 'Fixed question',
      active: true,
      settings: { scoreMode: 'fixed-points', displayOrder: 1 },
      nominees: [
        { nomineeId: 'yes', nominee: 'Yes', active: true },
        { nomineeId: 'no', nominee: 'No', active: true }
      ]
    },
    {
      categoryId: 'manual-wager',
      category: 'Manual wager',
      active: true,
      settings: {
        scoreMode: 'wager',
        oddsSource: 'manual',
        displayOrder: 2
      },
      nominees: [
        { nomineeId: 'a', nominee: 'A', active: true },
        { nomineeId: 'b', nominee: 'B', active: true }
      ]
    }
  ]
});

const result = context.getBettingOptions('hybrid-test');
assert.strictEqual(result.success, true);
assert.strictEqual(result.sourceMode, 'canonical-hybrid');
assert.strictEqual(result.categories.length, 1);
assert.strictEqual(result.categories[0].id, 'manual-wager');
assert.strictEqual(result.categories[0].nominees.length, 2);
assert.strictEqual(result.categories[0].oddsReady, true);
assert.deepStrictEqual(
  Array.from(result.categories[0].nominees, nominee => Number(nominee.odds)),
  [2, 2]
);

assert.strictEqual(
  context.normalizeBettingScoreMode_('sports-wager'),
  'wager'
);
assert.strictEqual(
  context.normalizeBettingScoreMode_('wager-odds'),
  'wager'
);

console.log('hybrid-wager-visibility-tests: PASS');
