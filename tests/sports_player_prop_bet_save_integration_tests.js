const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bettingEngine = fs.readFileSync(
  path.join(root, 'backend/engines/BettingEngine.js'),
  'utf8'
);

function assert(condition, label) {
  if (!condition) throw new Error(label);
}

let appendedRow = null;
let released = false;

const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object,
  isFinite,
  Logger: { log() {} },
  LockService: {
    getScriptLock() {
      return {
        tryLock() { return true; },
        releaseLock() { released = true; }
      };
    }
  },
  SpreadsheetApp: { flush() {} },
  GAMES_SHEET: 'Games',
  getDefaultGameId() { return 'sports-test'; },
  validateGameId() { return true; },
  clearAppCaches() {}
};

vm.createContext(context);
vm.runInContext(bettingEngine, context);

context.getBettingGameConfig = function() {
  return {
    enabled: true,
    startingBankroll: 1000,
    minBet: 1,
    maxBet: 100,
    minWager: 1,
    maxWager: 100,
    wagerEditMode: 'editable_until_lock'
  };
};

context.getCategories = function() {
  return [{
    id: 'mlb-123-player-home-runs-0-5',
    locked: false,
    lockDateTime: '2099-01-01T00:00:00.000Z',
    sportsGameId: 'mlb_123',
    sportsLeague: 'mlb',
    nominees: [
      { id: 'over', name: 'Over 0.5' },
      { id: 'under', name: 'Under 0.5' }
    ]
  }];
};

context.getCategorySettings = function() {
  return {
    'mlb-123-player-home-runs-0-5': {
      layoutType: 'wager',
      scoreMode: 'wager',
      oddsReady: true,
      locked: false,
      lockDateTime: '2099-01-01T00:00:00.000Z'
    }
  };
};

context.getBettingOddsMap_ = function() {
  return {
    'mlb-123-player-home-runs-0-5': {
      over: 1.91,
      under: 1.91
    }
  };
};

context.getUserBettingSummary = function() {
  return {
    bankroll: 1000,
    availablePoints: 1000,
    bets: []
  };
};

context.getAllBetsData_ = function() {
  return [[
    'GameId',
    'Timestamp',
    'Username',
    'CategoryId',
    'NomineeId',
    'BetAmount',
    'Odds',
    'LastUpdated'
  ]];
};

context.appendBetRow_ = function(row) {
  appendedRow = row.slice();
};

const result = context.saveBet({
  username: 'testuser',
  gameId: 'sports-test',
  categoryId: 'mlb-123-player-home-runs-0-5',
  nomineeId: 'over',
  betAmount: 10
});

assert(result && result.success === true, 'Player-prop saveBet did not succeed');
assert(Array.isArray(appendedRow), 'Player-prop saveBet did not append a Bets row');
assert(appendedRow[0] === 'sports-test', 'Saved Bets GameId is incorrect');
assert(appendedRow[2] === 'testuser', 'Saved Bets Username is incorrect');
assert(appendedRow[3] === 'mlb-123-player-home-runs-0-5', 'Saved Bets CategoryId is incorrect');
assert(appendedRow[4] === 'over', 'Saved Bets NomineeId is incorrect');
assert(appendedRow[5] === 10, 'Saved Bets amount is incorrect');
assert(appendedRow[6] === 1.91, 'Saved Bets odds are incorrect');
assert(released === true, 'saveBet did not release its lock');

console.log('Sports Player Prop bet-save integration test passed.');
