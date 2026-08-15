const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('backend/engines/NormalizedQuestionStorageEngine.js', 'utf8');

const sandbox = {
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
  CATEGORIES_SHEET: 'Categories',
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: name => name === 'Categories' ? {} : null
    })
  }
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

sandbox.normalizedStorageGetHeaders_ = () => [
  'GameId',
  'CategoryId',
  'Category',
  'BettingOdds',
  'OddsSource',
  'OddsLastUpdated',
  'NomineeId',
  'Nominee'
];

sandbox.normalizedStorageGetQuestionSetup_ = () => ({
  questions: [{
    GameId: 'emmys-2026',
    QuestionId: 'best-drama',
    Question: 'Outstanding drama series',
    Section: 'Emmys',
    Active: true,
    PredictionGame: true,
    CommunityRank: false,
    QuestionType: 'category-winner',
    ScoringEngine: 'manual',
    SelectionMode: 'single',
    EntryType: '',
    OddsMode: 'external-market',
    ResultSource: 'external-results-hub',
    BettingOdds: 2,
    OddsSource: 'question-default',
    OddsLastUpdated: '2026-08-15T00:00:00Z',
    PayloadJSON: '{}'
  }],
  options: [{
    GameId: 'emmys-2026',
    QuestionId: 'best-drama',
    OptionId: 'show-a',
    Option: 'Show A',
    ShortAnswer: 'Show A',
    Active: true,
    PayloadJSON: JSON.stringify({
      BettingOdds: 3.5,
      OddsSource: 'polymarket',
      OddsLastUpdated: '2026-08-15T01:00:00Z'
    })
  }]
});

let rows;
assert.doesNotThrow(() => {
  rows = sandbox.getAdminCategoriesDataForGameScoped_('emmys-2026');
}, 'Admin normalized projection must not reference optionPayload before the option loop.');

assert.strictEqual(rows.length, 3, 'Expected headers, question anchor, and one option row.');
assert.strictEqual(rows[1][3], 2, 'Question anchor should use question-level BettingOdds.');
assert.strictEqual(rows[1][4], 'question-default', 'Question anchor should use question-level OddsSource.');
assert.strictEqual(rows[2][3], 3.5, 'Option row should merge per-option BettingOdds.');
assert.strictEqual(rows[2][4], 'polymarket', 'Option row should merge per-option OddsSource.');
assert.strictEqual(rows[2][6], 'show-a');
assert.strictEqual(rows[2][7], 'Show A');

console.log('PASS: normalized storage optionPayload scope hotfix tests');
