const assert = require('assert');
const engine = require('../backend/engines/PredictionMarketEngineR2.js');

global.PREDICTION_MARKET_R2_CONFIG = engine.PREDICTION_MARKET_R2_CONFIG;
global.PREDICTION_MARKET_R2_SHEETS = engine.PREDICTION_MARKET_R2_SHEETS;
global.PREDICTION_MARKET_R2_HEADERS = engine.PREDICTION_MARKET_R2_HEADERS;
global.predictionMarketR2String_ = value => String(value == null ? '' : value).trim();
global.predictionMarketR2PositionKey_ = (playerId, marketId, outcome) => [
  String(playerId || '').trim(),
  String(marketId || '').trim(),
  String(outcome || '').trim().toUpperCase()
].join('|');
global.predictionMarketR2NormalizeWallet_ = wallet => wallet ? {
  playerId: String(wallet.playerId || '').trim(),
  availableCredits: Number(wallet.availableCredits || 0),
  reservedCredits: Number(wallet.reservedCredits || 0),
  version: Number(wallet.version || 0),
  createdAt: String(wallet.createdAt || '').trim(),
  createdBy: String(wallet.createdBy || '').trim(),
  updatedAt: String(wallet.updatedAt || '').trim(),
  updatedBy: String(wallet.updatedBy || '').trim()
} : null;
global.predictionMarketR2NormalizePosition_ = position => {
  if (!position) return null;
  const quantity = Number(position.quantity || 0);
  const costBasisCredits = Number(position.costBasisCredits || 0);
  return {
    playerId: String(position.playerId || '').trim(),
    marketId: String(position.marketId || '').trim(),
    outcome: String(position.outcome || '').trim().toUpperCase(),
    quantity,
    costBasisCredits,
    averageCostCredits: quantity > 0 ? costBasisCredits / quantity : 0,
    realizedCredits: Number(position.realizedCredits || 0),
    settledCredits: Number(position.settledCredits || 0),
    settledCostBasisCredits: Number(position.settledCostBasisCredits || 0),
    settled: position.settled === true,
    createdAt: String(position.createdAt || '').trim(),
    updatedAt: String(position.updatedAt || '').trim()
  };
};
global.predictionMarketR2NormalizeMarket_ = market => market;

const { predictionMarketR2CreateAppsScriptRepository } = require('../backend/engines/PredictionMarketStoreR2.js');

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const source = this.sheet.rows[this.row - 1 + r] || [];
      const values = [];
      for (let c = 0; c < this.numColumns; c += 1) {
        const value = source[this.column - 1 + c];
        values.push(value === undefined ? '' : value);
      }
      result.push(values);
    }
    return result;
  }

  setValues(matrix) {
    this.sheet.maybeFail(matrix);
    for (let r = 0; r < this.numRows; r += 1) {
      const rowIndex = this.row - 1 + r;
      while (this.sheet.rows.length <= rowIndex) this.sheet.rows.push([]);
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.rows[rowIndex][this.column - 1 + c] = matrix[r][c];
      }
    }
    return this;
  }
}

class FakeSheet {
  constructor(name, failureController) {
    this.name = name;
    this.rows = [];
    this.failureController = failureController;
  }

  getLastColumn() {
    return this.rows.reduce((max, row) => Math.max(max, row.length), 0);
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  appendRow(values) {
    this.maybeFail([values]);
    this.rows.push(values.slice());
    return this;
  }

  deleteRow(rowNumber) {
    this.rows.splice(rowNumber - 1, 1);
  }

  maybeFail(matrix) {
    if (this.failureController) this.failureController(this, matrix);
  }
}

class FakeSpreadsheet {
  constructor(failureController) {
    this.failureController = failureController;
    this.sheets = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const sheet = new FakeSheet(name, this.failureController);
    this.sheets[name] = sheet;
    return sheet;
  }
}

function failOnceOnCommitted(sheetName) {
  let remaining = 1;
  return function(sheet, matrix) {
    if (!remaining || sheet.name !== sheetName || !sheet.rows.length) return;
    const headers = sheet.rows[0];
    const statusIndex = headers.indexOf('Status');
    if (statusIndex < 0) return;
    const row = matrix[0] || [];
    if (String(row[statusIndex] || '').toUpperCase() === 'COMMITTED') {
      remaining -= 1;
      throw new Error('injected final commit failure');
    }
  };
}

function makeRepository(failureController) {
  const spreadsheet = new FakeSpreadsheet(failureController);
  const repository = predictionMarketR2CreateAppsScriptRepository({ spreadsheet });
  repository.setup();
  return { repository, spreadsheet };
}

function wallet(playerId, availableCredits, version) {
  return {
    playerId,
    availableCredits,
    reservedCredits: 0,
    version,
    createdAt: '2026-10-18T00:00:00.000Z',
    createdBy: playerId,
    updatedAt: '2026-10-18T00:00:00.000Z',
    updatedBy: playerId
  };
}

function position(playerId, marketId, outcome, quantity, costBasisCredits) {
  return {
    playerId,
    marketId,
    outcome,
    quantity,
    costBasisCredits,
    averageCostCredits: quantity ? costBasisCredits / quantity : 0,
    realizedCredits: 0,
    settledCredits: 0,
    settledCostBasisCredits: 0,
    settled: false,
    createdAt: '2026-10-18T00:00:00.000Z',
    updatedAt: '2026-10-18T00:00:00.000Z'
  };
}

function transaction(id, playerId, marketId, outcome, walletBefore, walletAfter, committedResult) {
  return {
    transactionId: id,
    fingerprint: id + '-fingerprint',
    playerId,
    marketId,
    side: 'BUY',
    outcome,
    quantity: committedResult.position.quantity,
    executionReferencePrice: 0.6,
    grossCredits: walletBefore.availableCredits - walletAfter.availableCredits,
    status: 'COMMITTED',
    walletVersionBefore: walletBefore.version,
    walletVersionAfter: walletAfter.version,
    requestedAt: '2026-10-18T00:00:00.000Z',
    committedAt: '2026-10-18T00:00:01.000Z',
    committedResult
  };
}

(function firstBuyRollbackAndRetry() {
  const failure = failOnceOnCommitted(engine.PREDICTION_MARKET_R2_SHEETS.transactions);
  const { repository } = makeRepository(failure);
  const originalWallet = wallet('alice', 1000, 0);
  const committedWallet = Object.assign({}, originalWallet, { availableCredits: 994, version: 1, updatedAt: '2026-10-18T00:00:01.000Z' });
  const committedPosition = position('alice', 'm-first', 'YES', 10, 6);
  repository.saveWallet(originalWallet);
  const committedResult = { wallet: committedWallet, position: committedPosition };
  const tx = transaction('tx-first', 'alice', 'm-first', 'YES', originalWallet, committedWallet, committedResult);

  assert.throws(() => repository.commitTrade({ transaction: tx, wallet: committedWallet, position: committedPosition }), /injected final commit failure/);
  assert.deepStrictEqual(repository.getWallet('alice'), originalWallet, 'first BUY failure must restore original wallet');
  assert.equal(repository.getPosition('alice', 'm-first', 'YES'), null, 'first BUY failure must remove newly appended position');
  assert.equal(repository.getTransaction('tx-first'), null, 'failed first BUY must remove transaction journal');

  repository.commitTrade({ transaction: tx, wallet: committedWallet, position: committedPosition });
  assert.equal(repository.getWallet('alice').availableCredits, 994, 'retry must debit wallet exactly once');
  assert.equal(repository.getWallet('alice').version, 1, 'retry must advance wallet version exactly once');
  assert.equal(repository.getPosition('alice', 'm-first', 'YES').quantity, 10, 'retry must create one position');
  assert.equal(repository.getTransaction('tx-first').status, 'COMMITTED', 'retry must commit exactly one transaction');
  assert.equal(repository.listPositionsByPlayerMarket('alice', 'm-first').length, 1, 'retry must not duplicate the position row');
})();

(function existingPositionRollback() {
  const failure = failOnceOnCommitted(engine.PREDICTION_MARKET_R2_SHEETS.transactions);
  const { repository } = makeRepository(failure);
  const originalWallet = wallet('bob', 997, 1);
  const originalPosition = position('bob', 'm-existing', 'YES', 5, 3);
  const committedWallet = Object.assign({}, originalWallet, { availableCredits: 995.8, version: 2, updatedAt: '2026-10-18T00:00:01.000Z' });
  const committedPosition = position('bob', 'm-existing', 'YES', 7, 4.2);
  repository.saveWallet(originalWallet);
  repository.savePosition(originalPosition);
  const committedResult = { wallet: committedWallet, position: committedPosition };
  const tx = transaction('tx-existing', 'bob', 'm-existing', 'YES', originalWallet, committedWallet, committedResult);

  assert.throws(() => repository.commitTrade({ transaction: tx, wallet: committedWallet, position: committedPosition }), /injected final commit failure/);
  assert.deepStrictEqual(repository.getWallet('bob'), originalWallet, 'existing-position failure must restore original wallet');
  assert.deepStrictEqual(repository.getPosition('bob', 'm-existing', 'YES'), originalPosition, 'existing-position failure must restore original position');
  assert.equal(repository.getTransaction('tx-existing'), null, 'existing-position failure must not leave a successful transaction');
})();

(function settlementNewRecordRollbackAndRetry() {
  const failure = failOnceOnCommitted(engine.PREDICTION_MARKET_R2_SHEETS.settlements);
  const { repository } = makeRepository(failure);
  const originalWallet = wallet('carol', 995, 1);
  const committedWallet = Object.assign({}, originalWallet, { availableCredits: 1005, version: 2, updatedAt: '2026-10-18T00:00:02.000Z' });
  const settledPosition = Object.assign({}, position('carol', 'm-settle', 'YES', 0, 0), {
    settledCredits: 10,
    settledCostBasisCredits: 5,
    settled: true,
    updatedAt: '2026-10-18T00:00:02.000Z'
  });
  repository.saveWallet(originalWallet);
  const settlement = {
    settlementKey: 'm-settle:carol',
    marketId: 'm-settle',
    playerId: 'carol',
    marketStatus: 'RESOLVED',
    winningOutcome: 'YES',
    payoutCredits: 10,
    returnedCostBasisCredits: 0,
    walletVersionBefore: 1,
    walletVersionAfter: 2,
    positionResults: [{ outcome: 'YES', payoutCredits: 10 }],
    status: 'COMMITTED',
    committedAt: '2026-10-18T00:00:02.000Z',
    committedResult: { wallet: committedWallet, positions: [settledPosition] }
  };

  assert.throws(() => repository.commitSettlement({ settlement, wallet: committedWallet, positions: [settledPosition] }), /injected final commit failure/);
  assert.deepStrictEqual(repository.getWallet('carol'), originalWallet, 'settlement failure must restore original wallet');
  assert.equal(repository.getPosition('carol', 'm-settle', 'YES'), null, 'settlement failure must remove a position row that did not previously exist');
  assert.equal(repository.getSettlement('m-settle:carol'), null, 'settlement failure must remove PENDING settlement journal');

  repository.commitSettlement({ settlement, wallet: committedWallet, positions: [settledPosition] });
  assert.equal(repository.getWallet('carol').availableCredits, 1005, 'settlement retry must pay exactly once');
  assert.equal(repository.getPosition('carol', 'm-settle', 'YES').settled, true, 'settlement retry must persist final position state');
  assert.equal(repository.getSettlement('m-settle:carol').status, 'COMMITTED', 'settlement retry must commit exactly once');
})();

console.log('PASS prediction_market_store_r2_failure_tests');
