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
const modes = fs.readFileSync(
  path.join(root, 'backend/engines/QuestionModeEngine.js'),
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

const hybrid = {
  type: 'hybrid',
  predictionEnabled: true,
  fixedPointsEnabled: true,
  wagerEnabled: true,
  stakedPointsEnabled: true
};
assert.strictEqual(context.adminSetupDefaultScoreMode_(hybrid), 'fixed-points');
assert.deepStrictEqual(
  Array.from(context.adminSetupAllowedScoreModes_(hybrid, 'wager'), item => item.value),
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
assert(html.includes('dedicated QuestionModes table'));
assert(backend.includes('questionModeUpsert_'));
assert(backend.includes('delete normalizedQuestionPayload.scoreMode'));
assert(modes.includes('QUESTION_MODES_SHEET'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

console.log('hybrid-question-score-mode-persistence-tests: PASS');
