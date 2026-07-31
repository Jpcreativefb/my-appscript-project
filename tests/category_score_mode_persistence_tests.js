const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'backend/admin/AdminCategories.js'),
  'utf8'
);

const rows = [
  ['GameId', 'CategoryId', 'ScoreMode', 'MinStake', 'MaxStake', 'StakeIncrement'],
  ['stake-test', 'question-1', 'fixed-points', 0, 0, 0],
  ['stake-test', 'question-1', 'fixed-points', 5, 25, 5],
  ['other-game', 'question-1', 'fixed-points', 1, 10, 1]
];

const sheet = {
  getDataRange() {
    return {
      getValues() {
        return rows.map(row => row.slice());
      }
    };
  },
  getRange(rowIndex, columnIndex, rowCount, columnCount) {
    return {
      setValues(values) {
        for (let r = 0; r < rowCount; r += 1) {
          for (let c = 0; c < columnCount; c += 1) {
            rows[rowIndex - 1 + r][columnIndex - 1 + c] = values[r][c];
          }
        }
      }
    };
  },
  appendRow(row) {
    rows.push(row.slice());
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
  Boolean,
  RegExp,
  isFinite,
  parseInt,
  parseFloat,
  getCategorySettingsSheet_: () => sheet,
  validateCategorySettingsColumns_: () => {},
  getCategorySettingsColumnMap_: headers => {
    const known = {
      gameId: headers.indexOf('GameId'),
      categoryId: headers.indexOf('CategoryId'),
      scoreMode: headers.indexOf('ScoreMode'),
      minStake: headers.indexOf('MinStake'),
      maxStake: headers.indexOf('MaxStake'),
      stakeIncrement: headers.indexOf('StakeIncrement')
    };

    return new Proxy(known, {
      get(target, key) {
        return Object.prototype.hasOwnProperty.call(target, key)
          ? target[key]
          : -1;
      }
    });
  }
};

vm.createContext(context);
vm.runInContext(source, context);

const dataBefore = sheet.getDataRange().getValues();
const col = context.getCategorySettingsColumnMap_(dataBefore[0]);
const matchingRows = context.adminCatFindSettingsRows_(
  dataBefore,
  col,
  'stake-test',
  'question-1'
);

assert.deepStrictEqual(Array.from(matchingRows), [2, 3]);
assert.strictEqual(
  context.adminCatFindSettingsRow_(dataBefore, col, 'stake-test', 'question-1'),
  3,
  'The canonical single row must match the final row read by adminGetGameSetup.'
);

context.adminCatUpsertCategorySettings_({
  gameId: 'stake-test',
  categoryId: 'question-1',
  scoreMode: 'staked-points',
  minStake: 0,
  maxStake: 0,
  stakeIncrement: 0
});

assert.strictEqual(rows[1][2], 'staked-points');
assert.strictEqual(rows[2][2], 'staked-points');
assert.strictEqual(rows[3][2], 'fixed-points');
assert.strictEqual(rows[1][3], 0);
assert.strictEqual(rows[2][3], 0);

console.log('category-score-mode-persistence-tests: PASS');
