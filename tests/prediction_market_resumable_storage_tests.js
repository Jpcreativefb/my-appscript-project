const assert = require("assert");
const path = require("path");

const SHEETS = Object.freeze({
  markets: "PredictionMarketMarkets",
  wallets: "PredictionMarketWallets",
  transactions: "PredictionMarketTransactions",
  positions: "PredictionMarketPositions",
  settlements: "PredictionMarketSettlements"
});

const HEADERS = Object.freeze({
  markets: Object.freeze([
    "MarketId", "Title", "Description", "Category", "Status",
    "YesLabel", "NoLabel", "ReferenceYesPrice", "ReferenceNoPrice",
    "ReferencePriceAsOf", "ReferencePriceTrusted", "ProviderKind",
    "ProviderId", "ExternalMarketId", "SourceUrl", "ProviderMetadataJson",
    "OpenTime", "LockTime", "ResolutionStatus", "WinningOutcome", "Voided",
    "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy"
  ]),
  wallets: Object.freeze([
    "PlayerId", "AvailableCredits", "ReservedCredits", "Version",
    "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy"
  ]),
  transactions: Object.freeze([
    "TransactionId", "Fingerprint", "PlayerId", "MarketId", "Side", "Outcome",
    "Quantity", "ExecutionReferencePrice", "GrossCredits", "Status",
    "WalletVersionBefore", "WalletVersionAfter", "RequestedAt", "CommittedAt",
    "CommittedResultJson"
  ]),
  positions: Object.freeze([
    "PlayerId", "MarketId", "Outcome", "Quantity", "CostBasisCredits",
    "AverageCostCredits", "RealizedCredits", "SettledCredits",
    "SettledCostBasisCredits", "Settled", "CreatedAt", "UpdatedAt"
  ]),
  settlements: Object.freeze([
    "SettlementKey", "MarketId", "PlayerId", "MarketStatus", "WinningOutcome",
    "PayoutCredits", "ReturnedCostBasisCredits", "WalletVersionBefore",
    "WalletVersionAfter", "PositionResultsJson", "Status", "CommittedAt",
    "CommittedResultJson"
  ])
});

global.PREDICTION_MARKET_R2_SHEETS = SHEETS;
global.PREDICTION_MARKET_R2_HEADERS = HEADERS;
global.PREDICTION_MARKET_R2_CONFIG = { lockTimeoutMs: 5000 };

const storeModule = require(path.join("..", "backend", "engines", "PredictionMarketStoreR2.js"));
const createRepository = storeModule.predictionMarketR2CreateAppsScriptRepository;

function FakeRange(sheet, row, column, numRows, numColumns) {
  this.sheet = sheet;
  this.row = row;
  this.column = column;
  this.numRows = numRows;
  this.numColumns = numColumns;
}

FakeRange.prototype.getValues = function() {
  const values = [];
  for (let r = 0; r < this.numRows; r += 1) {
    const row = [];
    for (let c = 0; c < this.numColumns; c += 1) {
      row.push(this.sheet.values[this.row - 1 + r]?.[this.column - 1 + c] ?? "");
    }
    values.push(row);
  }
  return values;
};

FakeRange.prototype.setValues = function(values) {
  for (let r = 0; r < values.length; r += 1) {
    const targetRow = this.row - 1 + r;
    if (!this.sheet.values[targetRow]) this.sheet.values[targetRow] = [];
    for (let c = 0; c < values[r].length; c += 1) {
      this.sheet.values[targetRow][this.column - 1 + c] = values[r][c];
    }
  }
  this.sheet.writeCount += 1;
  return this;
};

function FakeSheet(name, firstRow) {
  this.name = name;
  this.values = firstRow ? [firstRow.slice()] : [];
  this.writeCount = 0;
}

FakeSheet.prototype.getLastColumn = function() {
  return this.values.length ? this.values[0].length : 0;
};

FakeSheet.prototype.getLastRow = function() {
  return this.values.length;
};

FakeSheet.prototype.getRange = function(row, column, numRows, numColumns) {
  return new FakeRange(this, row, column, numRows, numColumns);
};

function FakeSpreadsheet(seed) {
  this.sheets = {};
  this.lookups = [];
  this.inserts = [];
  Object.keys(seed || {}).forEach((name) => {
    this.sheets[name] = new FakeSheet(name, seed[name]);
  });
}

FakeSpreadsheet.prototype.getSheetByName = function(name) {
  this.lookups.push(name);
  return this.sheets[name] || null;
};

FakeSpreadsheet.prototype.insertSheet = function(name) {
  this.inserts.push(name);
  const sheet = new FakeSheet(name);
  this.sheets[name] = sheet;
  return sheet;
};

function makeRepository(seed) {
  const spreadsheet = new FakeSpreadsheet(seed);
  return {
    spreadsheet,
    repository: createRepository({ spreadsheet })
  };
}

function firstRow(spreadsheet, storeName) {
  const sheet = spreadsheet.sheets[SHEETS[storeName]];
  return sheet && sheet.values[0] ? sheet.values[0].slice() : [];
}

(function positionsOnly() {
  const ctx = makeRepository();
  const result = ctx.repository.setupStore("positions");
  assert.strictEqual(result.store, "positions");
  assert.deepStrictEqual(ctx.spreadsheet.inserts, [SHEETS.positions]);
  assert.deepStrictEqual(ctx.spreadsheet.lookups, [SHEETS.positions]);
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "positions"), HEADERS.positions);
  assert.strictEqual(ctx.spreadsheet.sheets[SHEETS.markets], undefined);
  assert.strictEqual(ctx.spreadsheet.sheets[SHEETS.wallets], undefined);
  assert.strictEqual(ctx.spreadsheet.sheets[SHEETS.transactions], undefined);
  assert.strictEqual(ctx.spreadsheet.sheets[SHEETS.settlements], undefined);
})();

(function settlementsOnly() {
  const ctx = makeRepository();
  const result = ctx.repository.setupStore("settlements");
  assert.strictEqual(result.store, "settlements");
  assert.deepStrictEqual(ctx.spreadsheet.inserts, [SHEETS.settlements]);
  assert.deepStrictEqual(ctx.spreadsheet.lookups, [SHEETS.settlements]);
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "settlements"), HEADERS.settlements);
})();

(function blankExistingStoreGetsExactHeaders() {
  const ctx = makeRepository({ [SHEETS.positions]: [] });
  const sheet = ctx.spreadsheet.sheets[SHEETS.positions];
  ctx.repository.setupStore("positions");
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "positions"), HEADERS.positions);
  assert.strictEqual(sheet.writeCount, 1);
  assert.deepStrictEqual(ctx.spreadsheet.inserts, []);
})();

(function completeStoreIsIdempotent() {
  const ctx = makeRepository({ [SHEETS.positions]: HEADERS.positions });
  const sheet = ctx.spreadsheet.sheets[SHEETS.positions];
  ctx.repository.setupStore("positions");
  ctx.repository.setupStore("positions");
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "positions"), HEADERS.positions);
  assert.strictEqual(sheet.writeCount, 0);
  assert.deepStrictEqual(ctx.spreadsheet.inserts, []);
})();

(function unknownStoreRejected() {
  const ctx = makeRepository();
  assert.throws(
    () => ctx.repository.setupStore("not-a-store"),
    /Unknown Prediction Market store: not-a-store/
  );
  assert.deepStrictEqual(ctx.spreadsheet.lookups, []);
  assert.deepStrictEqual(ctx.spreadsheet.inserts, []);
})();

(function otherPredictionMarketStoresUntouched() {
  const seed = {
    [SHEETS.markets]: ["MARKETS_SENTINEL"],
    [SHEETS.wallets]: ["WALLETS_SENTINEL"],
    [SHEETS.transactions]: ["TRANSACTIONS_SENTINEL"],
    [SHEETS.settlements]: ["SETTLEMENTS_SENTINEL"]
  };
  const ctx = makeRepository(seed);
  ctx.repository.setupStore("positions");
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "markets"), ["MARKETS_SENTINEL"]);
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "wallets"), ["WALLETS_SENTINEL"]);
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "transactions"), ["TRANSACTIONS_SENTINEL"]);
  assert.deepStrictEqual(firstRow(ctx.spreadsheet, "settlements"), ["SETTLEMENTS_SENTINEL"]);
  assert.deepStrictEqual(ctx.spreadsheet.lookups, [SHEETS.positions]);
})();

(function nonPredictionMarketSheetsCannotBeTargeted() {
  const ctx = makeRepository({ Users: ["UserId"] });
  assert.throws(
    () => ctx.repository.setupStore("Users"),
    /Unknown Prediction Market store: Users/
  );
  assert.deepStrictEqual(ctx.spreadsheet.lookups, []);
  assert.deepStrictEqual(ctx.spreadsheet.inserts, []);
  assert.deepStrictEqual(ctx.spreadsheet.sheets.Users.values[0], ["UserId"]);
})();

(function fullSetupStillWorks() {
  const ctx = makeRepository();
  const result = ctx.repository.setup();
  assert.strictEqual(result.length, Object.keys(SHEETS).length);
  assert.deepStrictEqual(result.map((entry) => entry.store), Object.keys(SHEETS));
  assert.deepStrictEqual(ctx.spreadsheet.inserts, Object.keys(SHEETS).map((name) => SHEETS[name]));
  Object.keys(SHEETS).forEach((name) => {
    assert.deepStrictEqual(firstRow(ctx.spreadsheet, name), HEADERS[name]);
  });
})();

console.log("PASS: prediction market resumable storage setup");
