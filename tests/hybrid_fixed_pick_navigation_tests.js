const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const admin = read('frontend/js/pages/admin.js');
const adminBackend = read('backend/admin/AdminGames.js');
const games = read('backend/engines/GamesEngine.js');
const picksEngine = read('backend/engines/PicksEngine.js');
const scoring = read('backend/engines/ScoringEngine.js');
const bettingEngine = read('backend/engines/BettingEngine.js');
const picksPage = read('frontend/js/pages/picks.js');
const bettingPage = read('frontend/js/pages/betting.js');
const leaderboardPage = read('frontend/js/pages/leaderboard.js');
const sw = read('frontend/sw.js');

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} missing`);
  const brace = source.indexOf('{', start);
  assert(brace >= 0, `${name} opening brace missing`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} closing brace missing`);
}

// Hybrid Standard Predictions must be represented by one synchronized setting.
assert(admin.includes('Standard Predictions (Fixed Points)'));
assert(admin.includes('flags.predictionEnabled = standardPredictionsEnabled;'));
assert(admin.includes('flags.fixedPointsEnabled = standardPredictionsEnabled;'));
assert(adminBackend.includes('const standardPredictionsEnabled ='));
assert(adminBackend.includes('predictionEnabled: standardPredictionsEnabled'));
assert(adminBackend.includes('fixedPointsEnabled: standardPredictionsEnabled'));
assert(games.includes('games_v3_hybrid_standard_predictions'));
assert(games.includes('const hybridStandardPredictionsEnabled ='));

// Runtime pick and scoring compatibility for older Hybrid rows.
const pickContext = {
  String,
  normalizeLower_(value) { return String(value || '').trim().toLowerCase(); }
};
vm.createContext(pickContext);
vm.runInContext(extractFunction(picksEngine, 'isFixedPointPredictionEnabledForGame_'), pickContext);

assert.strictEqual(pickContext.isFixedPointPredictionEnabledForGame_({
  type: 'mixed',
  predictionEnabled: true,
  fixedPointsEnabled: false
}), true);
assert.strictEqual(pickContext.isFixedPointPredictionEnabledForGame_({
  type: 'staked-prediction',
  predictionEnabled: true,
  fixedPointsEnabled: false
}), false);
assert.strictEqual(pickContext.isFixedPointPredictionEnabledForGame_({
  type: 'prediction',
  fixedPointsEnabled: true
}), true);

const scoreContext = { String };
vm.createContext(scoreContext);
vm.runInContext(extractFunction(scoring, 'normalizeScoreString_'), scoreContext);
vm.runInContext(extractFunction(scoring, 'isFixedPointScoringEnabledForGame_'), scoreContext);
assert.strictEqual(scoreContext.isFixedPointScoringEnabledForGame_({
  gameFormat: 'hybrid',
  predictionEnabled: true,
  fixedPointsEnabled: false
}), true);
assert.strictEqual(scoreContext.isFixedPointScoringEnabledForGame_({
  type: 'staked-prediction',
  predictionEnabled: true,
  fixedPointsEnabled: false
}), false);

// Every Hybrid section must provide a return path to the section hub.
for (const source of [picksPage, bettingPage, leaderboardPage]) {
  assert(source.includes('← Back to Game Sections'));
  assert(source.includes("navigate('game-hub')"));
}
assert(picksPage.includes('function isHybridPicksGame_'));
assert(bettingPage.includes('function isHybridBettingGame_'));
assert(leaderboardPage.includes('function isHybridLeaderboardGame_'));
assert(bettingEngine.includes('gameType: normalizeBetKey_(game.type || "")'));
assert(bettingEngine.includes('mixedGame:'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

console.log('hybrid-fixed-pick-navigation-tests: PASS');
