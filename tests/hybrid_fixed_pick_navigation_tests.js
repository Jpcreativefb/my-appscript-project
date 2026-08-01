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
assert(sw.includes('awards-app-v262-hybrid-question-scoremode'));

console.log('hybrid-fixed-pick-navigation-tests: PASS');
