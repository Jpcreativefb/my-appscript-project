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

const headers = [
  'GameId',
  'Timestamp',
  'Username',
  'CategoryId',
  'NomineeId',
  'BetAmount',
  'Odds',
  'LastUpdated'
];

let sheetData = [
  headers.slice(),
  ['sports-test', new Date('2026-07-27T23:17:45Z'), 'testuser', 'player-prop-test', 'over', 1, 1.91, new Date('2026-07-27T23:17:45Z')],
  ['sports-test', new Date('2026-07-27T23:18:15Z'), 'testuser', 'player-prop-test', 'over', 6, 1.91, new Date('2026-07-27T23:18:15Z')],
  ['sports-test', new Date('2026-07-27T23:18:38Z'), 'testuser', 'player-prop-test', 'over', 5, 1.91, new Date('2026-07-27T23:18:38Z')]
];

let released = 0;

function cloneData() {
  return sheetData.map(row => row.slice());
}

const sheet = {
  getDataRange() {
    return { getValues: cloneData };
  },
  getRange(row, col, numRows, numCols) {
    return {
      setValues(values) {
        for (let r = 0; r < numRows; r++) {
          const targetRow = row - 1 + r;
          if (!sheetData[targetRow]) sheetData[targetRow] = new Array(headers.length).fill('');
          for (let c = 0; c < numCols; c++) {
            sheetData[targetRow][col - 1 + c] = values[r][c];
          }
        }
      },
      setValue(value) {
        if (!sheetData[row - 1]) sheetData[row - 1] = new Array(headers.length).fill('');
        sheetData[row - 1][col - 1] = value;
      }
    };
  },
  deleteRow(row) {
    sheetData.splice(row - 1, 1);
  },
  deleteRows(startRow, count) {
    sheetData.splice(startRow - 1, count);
  },
  appendRow(row) {
    sheetData.push(row.slice());
  }
};

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
  isNaN,
  Logger: { log() {} },
  LockService: {
    getScriptLock() {
      return {
        tryLock() { return true; },
        releaseLock() { released++; }
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

context.getBetsSheet_ = () => sheet;
context.getAllBetsData_ = cloneData;
context.appendBetRow_ = row => sheet.appendRow(row);
context.getBettingGameConfig = () => ({
  enabled: true,
  startingBankroll: 1000,
  minBet: 1,
  maxBet: 100,
  minWager: 1,
  maxWager: 100,
  wagerEditMode: 'editable_until_lock'
});
context.getCategories = () => [{
  id: 'player-prop-test',
  locked: false,
  lockDateTime: '2099-01-01T00:00:00.000Z',
  nominees: [
    { id: 'over', name: 'Over' },
    { id: 'under', name: 'Under' }
  ]
}];
context.getCategorySettings = () => ({
  'player-prop-test': {
    layoutType: 'wager',
    scoreMode: 'wager',
    oddsReady: true,
    locked: false,
    lockDateTime: '2099-01-01T00:00:00.000Z'
  }
});
context.getBettingOddsMap_ = () => ({
  'player-prop-test': { over: 1.91, under: 1.91 }
});
context.getUserBettingSummary = () => ({
  bankroll: 1000,
  bets: [{ categoryId: 'player-prop-test', betAmount: 5 }]
});

const saveResult = context.saveBet({
  username: 'testuser',
  gameId: 'sports-test',
  categoryId: 'player-prop-test',
  nomineeId: 'under',
  betAmount: 9
});

assert(saveResult.success === true, 'saveBet should succeed');
assert(saveResult.action === 'updated', 'saveBet should report updated');
assert(saveResult.duplicatesRemoved === 2, 'saveBet should remove two duplicates');
assert(sheetData.length === 2, 'Only header and one wager row should remain');
assert(sheetData[1][4] === 'under', 'Latest side should be stored');
assert(sheetData[1][5] === 9, 'Latest wager amount should be stored');
assert(sheetData[1][1].getTime() === new Date('2026-07-27T23:17:45Z').getTime(), 'Original wager timestamp should be retained');

sheetData = [
  headers.slice(),
  ['sports-test', new Date('2026-07-27T23:17:45Z'), 'testuser', 'prop-a', 'over', 1, 1.91, new Date('2026-07-27T23:17:45Z')],
  ['sports-test', new Date('2026-07-27T23:18:38Z'), 'testuser', 'prop-a', 'under', 5, 1.91, new Date('2026-07-27T23:18:38Z')],
  ['sports-test', new Date('2026-07-27T23:20:00Z'), 'otheruser', 'prop-b', 'over', 3, 1.91, new Date('2026-07-27T23:20:00Z')],
  ['sports-test', new Date('2026-07-27T23:21:00Z'), 'otheruser', 'prop-b', 'under', 4, 1.91, new Date('2026-07-27T23:21:00Z')]
];

const previewResult = context.previewDuplicateBetsCleanup();

assert(previewResult.success === true, 'previewDuplicateBetsCleanup should succeed');
assert(previewResult.duplicateGroups === 2, 'Preview should find two duplicate groups');
assert(previewResult.duplicateRows === 2, 'Preview should find two removable rows');

const cleanupResult = context.cleanupDuplicateBets();

assert(cleanupResult.success === true, 'cleanupDuplicateBets should succeed');
assert(cleanupResult.groupsConsolidated === 2, 'Two duplicate groups should be consolidated');
assert(cleanupResult.rowsRemoved === 2, 'Two duplicate rows should be removed');
assert(sheetData.length === 3, 'Header and two canonical wager rows should remain');
assert(sheetData[1][4] === 'under' && sheetData[1][5] === 5, 'Latest prop-a wager should be retained');
assert(sheetData[2][4] === 'under' && sheetData[2][5] === 4, 'Latest prop-b wager should be retained');
assert(released === 2, 'Both operations should release their locks');

console.log('Single-row wager upsert and duplicate cleanup tests passed.');
