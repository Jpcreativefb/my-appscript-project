const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const app = read('frontend/js/app.js');
const appRoot = read('frontend/app.js');
const appHtml = read('frontend/app.html');
const serviceWorker = read('frontend/sw.js');
const modeHub = read('frontend/js/pages/gameModeHub.js');
const adminGames = read('frontend/js/pages/adminGames.js');
const adminPage = read('frontend/js/pages/admin.js');
const adminBackend = read('backend/admin/AdminGames.js');
const gamesEngine = read('backend/engines/GamesEngine.js');
const preflightSource = read('backend/admin/AdminPreflight.js');

// Routing and page registration.
for (const source of [app, appRoot]) {
  assert(source.includes('gameType === "staked-prediction"'));
  assert(source.includes('await navigate("game-hub")'));
  assert(source.includes('case "game-hub":'));
  assert(source.includes('await renderGameModeHubPage()'));
}
assert(appHtml.includes('./js/pages/gameModeHub.js'));
assert(serviceWorker.includes('./js/pages/gameModeHub.js'));
assert(serviceWorker.includes('awards-app-v255-unified-game-status'));
assert(modeHub.includes('Make Picks'));
assert(modeHub.includes('Place Wagers'));
assert(modeHub.includes('View Leaderboard'));

// Publish actions must not rewrite game-type feature flags.
for (const functionName of [
  'adminSetGameDraft',
  'adminSetGameSetup',
  'adminSetGamePreview',
  'adminSetGameActive',
  'adminSetGameDefault'
]) {
  const start = adminGames.indexOf(`async function ${functionName}`);
  assert(start >= 0, `${functionName} missing`);
  const end = adminGames.indexOf('\nasync function ', start + 10);
  const block = adminGames.slice(start, end === -1 ? adminGames.length : end);
  assert(!block.includes('predictionEnabled:'), `${functionName} rewrites PredictionEnabled`);
  assert(!block.includes('rankingEnabled:'), `${functionName} rewrites RankingEnabled`);
}

// New guided forms are safe draft shells and active saves use preflight.
const newDefaultsStart = adminPage.indexOf('game = game || {');
const newDefaultsEnd = adminPage.indexOf('};', newDefaultsStart);
const newDefaultsBlock = adminPage.slice(newDefaultsStart, newDefaultsEnd);
assert(newDefaultsBlock.includes('active: false'));
assert(newDefaultsBlock.includes('status: "Draft"'));
assert(newDefaultsBlock.includes('lockAllPicks: true'));
assert(adminPage.includes('const publishRequested ='));
assert(adminPage.includes('await apiAdminRunGamePreflight'));
assert(adminPage.includes('savePayload.status = "Setup"'));

// Manage Games must use one workflow status control, not duplicate Publish Controls.
assert(adminPage.includes('adminRunPreflightCheck'));
assert(adminPage.includes('renderAdminGameStatusControl_'));
assert(adminPage.includes('adminSelectGameStatus'));
assert(adminPage.includes('adminCanonicalGameStatus_'));
assert(!adminPage.includes('renderAdminPublishControls(game)'));
assert(!adminGames.includes('${renderAdminPublishControls(game)}'));
assert(!adminPage.includes('Status Label'));
for (const label of [
  'DRAFT',
  'SETUP',
  'PREVIEW',
  'LIVE',
  'PICKS & WAGERS: OPEN',
  'PICKS & WAGERS: LOCKED',
  'DEFAULT GAME: YES',
  'DEFAULT GAME: NO',
  'LEADERBOARD: SHOWN',
  'LEADERBOARD: HIDDEN'
]) {
  assert(adminPage.includes(label), `Missing unified game workflow label: ${label}`);
}
assert(adminPage.includes('Draft → Setup → Preview → Live'));
assert(adminPage.includes('Default Game can only be turned on when Game Status is LIVE.'));
assert(adminPage.includes('Move to Archive'));
assert(adminPage.includes('Restore Game'));

// Game Type is the source of truth for non-Hybrid gameplay methods.
assert(adminPage.includes('Gameplay enabled by Game Type'));
assert(adminPage.includes('Only Hybrid Game lets you manually combine gameplay methods'));
assert(adminPage.includes('function adminGameTypeFeatureFlags_'));
assert(adminPage.includes('Sports Wagers: ON • Predictions: OFF'));
assert(adminPage.includes('const featureFlags = adminGameTypeFeatureFlags_(form)'));
assert(adminBackend.includes('function adminResolveGameTypeFeatureFlags_'));
assert(adminBackend.includes('Game Type is the single source of truth for non-Hybrid games.'));

// Unsaved-change save workflow must be visible, guarded, and publish-safe.
for (const label of [
  'CHANGES MADE — SAVE NOW',
  'Unsaved changes',
  'SAVED ✓'
]) {
  assert(adminPage.includes(label), `Missing save-state label: ${label}`);
}
for (const helper of [
  'adminMarkGameFormDirty',
  'adminConfirmLeaveDirtyGameForms_',
  'adminHandleGameCardToggle',
  'adminSavePendingGameChangesBeforeAction_'
]) {
  assert(adminPage.includes(`function ${helper}`) || adminPage.includes(`async function ${helper}`), `${helper} missing`);
}
assert(adminPage.includes('data-admin-game-save-button="true"'));
assert(adminPage.includes('data-admin-game-save-feedback="true"'));
assert(adminPage.includes('window.addEventListener("beforeunload"'));
for (const source of [app, appRoot]) {
  assert(source.includes('options.skipUnsavedCheck !== true'));
  assert(source.includes('adminConfirmLeaveDirtyGameForms_'));
}
for (const functionName of [
  'adminSetGameDraft',
  'adminSetGameSetup',
  'adminSetGamePreview',
  'adminSetGameActive',
  'adminSetGameDefault'
]) {
  const start = adminGames.indexOf(`async function ${functionName}`);
  const end = adminGames.indexOf('\nasync function ', start + 10);
  const block = adminGames.slice(start, end === -1 ? adminGames.length : end);
  assert(block.includes('adminSavePendingGameChangesBeforeAction_'), `${functionName} does not save pending changes first`);
}

// Backend type defaults and type enforcement remain available.
assert(adminBackend.includes('delete safePayload.predictionEnabled'));
assert(adminBackend.includes('delete safePayload.rankingEnabled'));
assert(adminBackend.includes('stakedPointsEnabled: featureFlags.stakedPointsEnabled === true'));
assert(adminBackend.includes('fixedPointsEnabled: featureFlags.fixedPointsEnabled === true'));

// Type defaults and legacy Combo behavior.
const engineContext = {
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
vm.createContext(engineContext);
vm.runInContext(gamesEngine, engineContext);

const stakedType = engineContext.getGameTypeConfig('staked-prediction');
assert.strictEqual(stakedType.stakedPointsEnabled, true);
assert.strictEqual(stakedType.fixedPointsEnabled, false);

const mixedType = engineContext.getGameTypeConfig('mixed');
assert.strictEqual(mixedType.mixedGame, true);
assert.strictEqual(mixedType.stakedPointsEnabled, true);
assert.strictEqual(mixedType.wagerEnabled, true);
assert.strictEqual(mixedType.rankingEnabled, false);

const comboType = engineContext.getGameTypeConfig('combo');
assert.strictEqual(comboType.legacyAliasOf, 'mixed');
assert.strictEqual(comboType.mixedGame, true);

// Type-aware preflight behavior.
const preflightContext = {
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
vm.createContext(preflightContext);
vm.runInContext(preflightSource, preflightContext);

function runPreflight(game, categories, games = [game]) {
  preflightContext.getGame = () => game;
  preflightContext.getGames = () => games;
  preflightContext.adminGetGameSetup = () => ({ categories });
  return preflightContext.adminRunGamePreflight({ gameId: game.gameId });
}

const baseGame = {
  gameId: 'test-game',
  name: 'Test Game',
  year: 2026,
  type: 'prediction',
  status: 'Setup',
  active: false,
  archived: false,
  defaultGame: false,
  predictionEnabled: true,
  rankingEnabled: false,
  confidenceEnabled: false,
  wagerEnabled: false,
  stakedPointsEnabled: false,
  fixedPointsEnabled: true,
  lockAllPicks: true,
  themeColor: '#123456',
  gameRole: 'standalone',
  hubMode: 'playable-aggregate'
};

function category(id, scoreMode, nomineeCount = 2) {
  return {
    categoryId: id,
    category: id,
    active: true,
    settings: {
      points: 1,
      displayOrder: 1,
      scoreMode,
      questionType: 'award-single-winner'
    },
    nominees: Array.from({ length: nomineeCount }, (_, index) => ({
      nomineeId: `${id}-${index + 1}`,
      nominee: `Choice ${index + 1}`,
      active: true
    }))
  };
}

const headResult = runPreflight(
  { ...baseGame, type: 'head-to-head' },
  [category('head', 'correct-pick', 3)]
);
assert(headResult.issues.some(issue => issue.message.includes('exactly 2 active choices')));

const stakedResult = runPreflight(
  {
    ...baseGame,
    type: 'staked-prediction',
    stakedPointsEnabled: false,
    minStake: 10,
    maxStake: 100,
    stakeIncrement: 10
  },
  [category('stake', 'correct-pick', 2)]
);
assert(stakedResult.issues.some(issue => issue.message.includes('requires StakedPointsEnabled')));
assert(stakedResult.issues.some(issue => issue.message.includes('no active question using ScoreMode staked-points')));

const mixedResult = runPreflight(
  {
    ...baseGame,
    type: 'mixed',
    mixedGame: true,
    predictionEnabled: true,
    wagerEnabled: true,
    stakedPointsEnabled: true,
    rankingEnabled: false
  },
  [category('pick', 'correct-pick', 2)]
);
assert.strictEqual(mixedResult.ready, true);
assert(mixedResult.issues.some(issue => issue.message.includes('no staked-points questions')));
assert(mixedResult.issues.some(issue => issue.message.includes('no wager questions')));

const parentGame = {
  ...baseGame,
  gameId: 'season-parent',
  gameRole: 'parent',
  hubMode: 'leaderboard-only'
};
const parentResult = runPreflight(parentGame, [], [
  parentGame,
  {
    ...baseGame,
    gameId: 'week-1',
    gameRole: 'mini',
    parentGameId: 'season-parent'
  }
]);
assert(!parentResult.issues.some(issue => issue.message === 'Game has no categories/questions.'));

const survivorResult = runPreflight(
  { ...baseGame, type: 'survivor' },
  [category('survivor', 'correct-pick', 2)]
);
assert(survivorResult.issues.some(issue => issue.message.includes('Survivor publishing is blocked')));

console.log('games-phase1-integration-tests: PASS');
