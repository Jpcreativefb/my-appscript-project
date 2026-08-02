const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const storageSource = fs.readFileSync(
  path.join(root, 'backend/engines/NormalizedQuestionStorageEngine.js'),
  'utf8'
);
const modeSource = fs.readFileSync(
  path.join(root, 'backend/engines/QuestionModeEngine.js'),
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

assert(storageSource.includes('const NORMALIZED_STORAGE_VERSION = 2;'));
assert(!/const QUESTIONS_HEADERS = \[[\s\S]*?"ScoreMode"/.test(storageSource));
assert(modeSource.includes('const QUESTION_MODES_SHEET = "QuestionModes";'));
assert(modeSource.includes('function questionModeUpsert_'));
assert(modeSource.includes('function repairQuestionsSheetAfterV115Now'));
assert(adminSource.includes('questionModeReadMapForGame_'));
assert(adminSource.includes('questionModeUpsert_'));
assert(adminSource.includes('delete normalizedQuestionPayload.scoreMode'));
assert(setupSource.includes('dedicated QuestionModes table'));

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

const context = { String, Array, Object };
vm.createContext(context);
vm.runInContext(extractFunction(modeSource, 'questionModeString_'), context);
vm.runInContext(extractFunction(modeSource, 'questionModeKey_'), context);
vm.runInContext(extractFunction(modeSource, 'questionModeNormalize_'), context);
vm.runInContext(extractFunction(modeSource, 'questionModeIsRecognized_'), context);

assert.strictEqual(context.questionModeNormalize_('WAGER'), 'wager');
assert.strictEqual(context.questionModeNormalize_('correct-pick'), 'fixed-points');
assert.strictEqual(context.questionModeNormalize_('sports-wager'), 'wager');
assert.strictEqual(context.questionModeIsRecognized_('staked-points'), true);
assert.strictEqual(context.questionModeIsRecognized_('not-a-mode'), false);

console.log('canonical-question-score-mode-source-tests: PASS');
