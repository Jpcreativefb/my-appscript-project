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
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

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
