const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(picks.includes('Choose how many prediction points to risk first. Then choose an answer and confirm the pick.'));
assert(picks.includes('No amount is selected automatically.'));
assert(picks.includes('STEP 1'));
assert(picks.includes('STEP 2'));
assert(picks.includes('Choose your risk amount above before selecting an answer.'));
assert(picks.includes('stakeMustBeChosenFirst'));
assert(picks.includes('syncStakedPickControls(categoryId)'));
assert(picks.includes('window.confirm(confirmationMessage)'));
assert(picks.includes('Pick not saved. You can change the risk amount or answer.'));
assert(css.includes('STAKED PICK ORDER V1.0.10'));
assert(css.includes('.stake-step-status.is-ready'));
assert(sw.includes('awards-app-v263-canonical-question-scoremode'));

const context = {
  console,
  Math,
  Number,
  String,
  Array,
  Object,
  Boolean,
  Date,
  JSON,
  RegExp,
  isFinite,
  parseInt,
  parseFloat,
  setTimeout() {},
  clearTimeout() {},
  setInterval() {},
  clearInterval() {},
  document: {
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  }
};
vm.createContext(context);
vm.runInContext(picks, context);
vm.runInContext(`
  PICKS_PAGE_DATA = {
    session: null,
    gameId: 'stake-test',
    game: {
      stakedPointsEnabled: true,
      minStake: 10,
      maxStake: 100,
      stakeIncrement: 10,
      startingPoints: 100,
      stakeWinMultiplier: 1,
      stakeLossMultiplier: 1
    },
    categories: [],
    picks: {},
    changeCounts: {},
    originalPicks: {},
    confidencePoints: {},
    stakePoints: {},
    stakeSummary: {
      currentBalance: 100,
      pendingStakes: 0,
      availablePoints: 100,
      settledNet: 0
    },
    pickMeta: {}
  };
`, context);

const category = {
  id: 'q1',
  scoreMode: 'staked-points',
  minStake: 0,
  maxStake: 0,
  stakeIncrement: 0,
  stakeWinMultiplier: 0,
  stakeLossMultiplier: 0,
  nominees: []
};

const emptyControl = context.renderStakedPointsControl(category, false);
assert(emptyControl.includes('value=""'));
assert(/id="stake-q1"[\s\S]*?value=""/.test(emptyControl));
assert(emptyControl.includes('placeholder="Choose amount"'));

const missing = context.validateSelectedStakeForCategory_(category, 0);
assert.strictEqual(missing.valid, false);
assert.strictEqual(missing.message, 'Choose your risk amount first.');

const valid = context.validateSelectedStakeForCategory_(category, 20);
assert.strictEqual(valid.valid, true);
assert(valid.message.includes('Risking 20 points'));

const invalidIncrement = context.validateSelectedStakeForCategory_(category, 25);
assert.strictEqual(invalidIncrement.valid, false);
assert(invalidIncrement.message.includes('10-point increments'));

console.log('staked-pick-risk-first-tests: PASS');
