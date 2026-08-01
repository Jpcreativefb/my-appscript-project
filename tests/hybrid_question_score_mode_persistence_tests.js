const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const setup = fs.readFileSync(
  path.join(root, 'frontend/js/pages/adminGameSetup.js'),
  'utf8'
);
const backend = fs.readFileSync(
  path.join(root, 'backend/admin/AdminCategories.js'),
  'utf8'
);
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

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
  parseFloat
};
vm.createContext(context);
vm.runInContext(setup, context);

assert.strictEqual(context.adminSetupCanonicalGameType_({ type: 'hybrid' }), 'mixed');
assert.strictEqual(context.adminSetupCanonicalGameType_({ type: 'combo' }), 'mixed');
assert.strictEqual(context.adminSetupCanonicalGameType_({ type: 'prediction', mixedGame: true }), 'mixed');
assert.strictEqual(context.adminSetupCanonicalGameType_({ type: 'prediction', gameFormat: 'hybrid' }), 'mixed');
assert.strictEqual(context.adminSetupCanonicalGameType_({ type: 'prediction', scoringMode: 'hybrid' }), 'mixed');

const hybrid = {
  type: 'hybrid',
  predictionEnabled: true,
  fixedPointsEnabled: true,
  wagerEnabled: true,
  stakedPointsEnabled: true
};
assert.strictEqual(context.adminSetupDefaultScoreMode_(hybrid), 'fixed-points');
assert.deepStrictEqual(
  Array.from(
    context.adminSetupAllowedScoreModes_(hybrid, 'wager'),
    item => item.value
  ),
  ['fixed-points', 'staked-points', 'wager']
);

const html = context.renderAdminSetupQuestionEngineFields_(
  'editCategory',
  '_wager-question',
  { scoreMode: 'wager' },
  hybrid
);
assert(html.includes('value="wager" selected'));
assert(!html.includes('disabled aria-disabled="true"'));
assert(backend.includes('Once a question has an explicit ScoreMode, that question owns it.'));
assert(backend.includes('canonicalScoreModeByQuestion'));
assert(sw.includes('awards-app-v263-canonical-question-scoremode'));

console.log('hybrid-question-score-mode-persistence-tests: PASS');
