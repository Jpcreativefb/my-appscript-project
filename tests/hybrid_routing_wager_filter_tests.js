const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const appData = read('backend/engines/AppDataEngine.js');
const betting = read('backend/engines/BettingEngine.js');
const sw = read('frontend/sw.js');

assert(appData.includes('The explicit Game Type must win before feature flags are inspected.'));
assert(appData.includes('"mixed",'));
assert(appData.includes('"hybrid",'));
assert(appData.includes('"combo",'));
assert(appData.includes('return type === "betting" ? "wager" : type;'));
assert(appData.includes('return "Hybrid Game";'));

assert(betting.includes('function isWagerBettingCategory_'));
assert(betting.includes('return scoreMode === "wager";'));
assert(betting.includes('The Wager page must receive only ScoreMode=wager.'));
assert(betting.includes('return isWagerBettingCategory_(category, setting);'));
assert(betting.includes('Number(config.defaultOdds || DEFAULT_BETTING_ODDS)'));
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'));

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} missing`);
  let brace = source.indexOf('{', start);
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

const appContext = { String, Array };
vm.createContext(appContext);
vm.runInContext(extractFunction(appData, 'getDashboardGameMode_'), appContext);
vm.runInContext(extractFunction(appData, 'getDashboardGameTypeLabel_'), appContext);

assert.strictEqual(appContext.getDashboardGameMode_({
  type: 'hybrid',
  predictionEnabled: true,
  wagerEnabled: true
}), 'hybrid');
assert.strictEqual(appContext.getDashboardGameMode_({
  type: 'mixed',
  predictionEnabled: true,
  wagerEnabled: true
}), 'mixed');
assert.strictEqual(appContext.getDashboardGameMode_({
  type: '',
  predictionEnabled: true,
  wagerEnabled: true
}), 'hybrid');
assert.strictEqual(appContext.getDashboardGameMode_({
  type: 'wager',
  predictionEnabled: false,
  wagerEnabled: true
}), 'wager');
assert.strictEqual(appContext.getDashboardGameTypeLabel_({}, 'hybrid'), 'Hybrid Game');

const bettingContext = {
  String,
  Array,
  Object,
  normalizeBetKey_(value) { return String(value || '').trim().toLowerCase(); }
};
vm.createContext(bettingContext);
vm.runInContext(extractFunction(betting, 'normalizeBettingScoreMode_'), bettingContext);
vm.runInContext(extractFunction(betting, 'isWagerBettingCategory_'), bettingContext);
vm.runInContext(extractFunction(betting, 'isSportsWagerBettingCategory_'), bettingContext);

assert.strictEqual(
  bettingContext.isWagerBettingCategory_({ scoreMode: 'fixed-points' }, {}),
  false
);
assert.strictEqual(
  bettingContext.isWagerBettingCategory_({ scoreMode: 'wager' }, {}),
  true
);
assert.strictEqual(
  bettingContext.isWagerBettingCategory_({}, { ScoreMode: 'WAGER' }),
  true
);
assert.strictEqual(
  bettingContext.isSportsWagerBettingCategory_({ scoreMode: 'wager' }, {}),
  false
);
assert.strictEqual(
  bettingContext.isSportsWagerBettingCategory_({ scoreMode: 'wager', sportsGameId: '401123' }, {}),
  true
);
assert.strictEqual(
  bettingContext.isSportsWagerBettingCategory_({ scoreMode: 'wager' }, { oddsSource: 'manual' }),
  false
);
assert.strictEqual(
  bettingContext.isSportsWagerBettingCategory_({ scoreMode: 'wager' }, { oddsSource: 'espn' }),
  true
);

console.log('hybrid-routing-wager-filter-tests: PASS');

// Exercise the real BettingEngine option builder with a Hybrid-style mix.
const fullBettingContext = {
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
vm.createContext(fullBettingContext);
vm.runInContext(betting, fullBettingContext);

fullBettingContext.getDefaultGameId = () => 'hybrid-test';
fullBettingContext.validateGameId = () => true;
fullBettingContext.getBettingGameConfig = () => ({
  enabled: true,
  defaultOdds: 2,
  startingBankroll: 1000,
  minBet: 1,
  maxBet: 100
});
fullBettingContext.getCategories = () => [
  {
    id: 'prediction-question',
    name: 'Prediction question',
    displayOrder: 1,
    scoreMode: 'fixed-points',
    nominees: [
      { id: 'yes', name: 'Yes' },
      { id: 'no', name: 'No' }
    ]
  },
  {
    id: 'manual-wager',
    name: 'Manual wager',
    displayOrder: 2,
    scoreMode: 'wager',
    nominees: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' }
    ]
  }
];
fullBettingContext.getCategorySettings = () => ({
  'prediction-question': { scoreMode: 'fixed-points' },
  'manual-wager': { scoreMode: 'wager', oddsSource: 'manual' }
});
fullBettingContext.getBettingOddsMap_ = () => ({});

const manualOptions = fullBettingContext.getBettingOptions('hybrid-test');
assert.strictEqual(manualOptions.success, true);
assert.strictEqual(manualOptions.categories.length, 1);
assert.strictEqual(manualOptions.categories[0].id, 'manual-wager');
assert.strictEqual(manualOptions.categories[0].oddsReady, true);
assert.deepStrictEqual(
  Array.from(manualOptions.categories[0].nominees, n => Number(n.odds)),
  [2, 2]
);

fullBettingContext.getCategories = () => [
  {
    id: 'sports-wager',
    name: 'Sports wager',
    displayOrder: 1,
    scoreMode: 'wager',
    sportsGameId: '401234',
    nominees: [
      { id: 'home', name: 'Home' },
      { id: 'away', name: 'Away' }
    ]
  }
];
fullBettingContext.getCategorySettings = () => ({
  'sports-wager': {
    scoreMode: 'wager',
    sportsGameId: '401234',
    oddsSource: 'espn'
  }
});
const sportsOptions = fullBettingContext.getBettingOptions('hybrid-test');
assert.strictEqual(sportsOptions.categories.length, 1);
assert.strictEqual(sportsOptions.categories[0].oddsReady, false);
assert.strictEqual(sportsOptions.categories[0].oddsPending, true);

console.log('hybrid-routing-wager-filter-runtime-tests: PASS');
