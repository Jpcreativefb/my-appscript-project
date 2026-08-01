const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const storageSource = fs.readFileSync(
  path.join(root, 'backend/engines/NormalizedQuestionStorageEngine.js'),
  'utf8'
);
const adminSource = fs.readFileSync(
  path.join(root, 'backend/admin/AdminCategories.js'),
  'utf8'
);
const setupSource = fs.readFileSync(
  path.join(root, 'frontend/js/pages/adminGameSetup.js'),
  'utf8'
);

assert(storageSource.includes('const NORMALIZED_STORAGE_VERSION = 3;'));
assert(storageSource.includes('"ScoreMode"'));
assert(storageSource.includes('ScoreMode: normalizedStorageNormalizeScoreMode_'));
assert(storageSource.includes('ScoreMode: question.ScoreMode'));
assert(adminSource.includes('canonicalScoreModeByQuestion'));
assert(adminSource.includes('map[categoryId].settings.scoreMode = canonicalMode'));
assert(adminSource.includes('Once a question has an explicit ScoreMode, that question owns it.'));
assert(setupSource.includes('Existing questions always display their own canonical mode.'));

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} was not found`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

const context = {
  String,
  Object,
  Date,
  Boolean,
  JSON,
  NORMALIZED_STORAGE_VERSION: 3,
  normalizedStorageKey_: value => String(value == null ? '' : value).trim().toLowerCase(),
  normalizedStorageString_: value => String(value == null ? '' : value).trim(),
  normalizedStorageBool_: (value, fallback) => value === undefined ? fallback === true : value === true
};
vm.createContext(context);
vm.runInContext(extractFunction(storageSource, 'normalizedStorageNormalizeScoreMode_'), context);
vm.runInContext(extractFunction(storageSource, 'normalizedStorageQuestionObject_'), context);

let question = context.normalizedStorageQuestionObject_({
  gameId: 'hybrid-test',
  questionId: 'q1',
  question: 'Manual wager?',
  scoreMode: 'wager'
}, {});
assert.strictEqual(question.ScoreMode, 'wager');

question = context.normalizedStorageQuestionObject_({
  gameId: 'hybrid-test',
  questionId: 'q1',
  question: 'Renamed wager question'
}, question);
assert.strictEqual(
  question.ScoreMode,
  'wager',
  'Renaming a question without sending ScoreMode must preserve the canonical mode.'
);

question = context.normalizedStorageQuestionObject_({
  gameId: 'hybrid-test',
  questionId: 'q1',
  scoreMode: 'fixed-points'
}, question);
assert.strictEqual(
  question.ScoreMode,
  'fixed-points',
  'An explicit admin mode change must be stored exactly.'
);

console.log('canonical-question-score-mode-source-tests: PASS');
