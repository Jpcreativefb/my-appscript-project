const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  PREDICTION_MARKET_R2_SHEETS,
  predictionMarketR2CreateMemoryRepository,
  predictionMarketR2CreateEngine
} = require('../backend/engines/PredictionMarketEngineR2.js');

let nowMs = Date.parse('2026-10-18T12:00:00.000Z');
const now = () => new Date(nowMs);
const admin = { role: 'ADMIN', playerId: 'director' };
const player = id => ({ role: 'PLAYER', playerId: id });

function makeEngine(extra = {}) {
  const repository = extra.repository || predictionMarketR2CreateMemoryRepository();
  return predictionMarketR2CreateEngine(Object.assign({
    repository,
    now,
    bootstrapCredits: 1000,
    maxReferencePriceAgeMs: 15 * 60 * 1000,
    displayNameResolver: id => ({ alice: 'Alice', bob: 'Bob', carol: 'Carol' }[id] || id)
  }, extra));
}

function createOpen(engine, id = 'm1', yes = 0.6) {
  engine.createMarket(admin, {
    marketId: id,
    title: 'Will the event happen?',
    description: 'Binary test market',
    category: 'TEST',
    referenceYesPrice: yes,
    referenceNoPrice: 1 - yes,
    referencePriceAsOf: new Date(nowMs).toISOString(),
    referencePriceTrusted: true,
    providerKind: 'MANUAL',
    openTime: new Date(nowMs).toISOString(),
    lockTime: new Date(nowMs + 60 * 60 * 1000).toISOString()
  });
  engine.openMarket(admin, id);
}

function buy(engine, tx, user, market, outcome, quantity, version, referencePrice) {
  return engine.executeTrade(player(user), {
    transactionId: tx, playerId: user, marketId: market, side: 'BUY', outcome,
    quantity, expectedWalletVersion: version, referencePrice
  });
}

function sell(engine, tx, user, market, outcome, quantity, version, referencePrice) {
  return engine.executeTrade(player(user), {
    transactionId: tx, playerId: user, marketId: market, side: 'SELL', outcome,
    quantity, expectedWalletVersion: version, referencePrice
  });
}

(function walletCoverage() {
  const e = makeEngine();
  const first = e.bootstrapWallet(player('alice'), 'alice');
  assert.equal(first.availableCredits, 1000);
  assert.equal(first.version, 0);
  const second = e.bootstrapWallet(player('alice'), 'alice', 50);
  assert.equal(second.availableCredits, 1000, 'existing wallet must not silently reset');
  createOpen(e);
  const result = buy(e, 'wallet-v1', 'alice', 'm1', 'YES', 10, 0, 0.6);
  assert.equal(result.wallet.version, 1);
  assert.equal(result.wallet.availableCredits, 994);
  assert.throws(() => buy(e, 'negative', 'alice', 'm1', 'YES', 2000, 1, 0.6), /Insufficient/);
})();

(function buyCoverage() {
  const e = makeEngine();
  e.bootstrapWallet(player('alice'), 'alice');
  createOpen(e, 'buy-market', 0.6);
  let r = buy(e, 'buy-yes', 'alice', 'buy-market', 'YES', 5, 0, 0.6);
  assert.equal(r.executionReferencePrice, 0.6);
  assert.equal(r.position.quantity, 5);
  assert.equal(r.position.costBasisCredits, 3);
  r = buy(e, 'buy-no', 'alice', 'buy-market', 'NO', 10, 1, 0.4);
  assert.equal(r.executionReferencePrice, 0.4);
  assert.equal(r.position.costBasisCredits, 4);
  assert.throws(() => buy(e, 'stale-version', 'alice', 'buy-market', 'YES', 1, 0, 0.6), /Stale/);
  assert.throws(() => buy(e, 'insufficient', 'alice', 'buy-market', 'YES', 999999, 2, 0.6), /Insufficient/);

  const replay = buy(e, 'buy-no', 'alice', 'buy-market', 'NO', 10, 1, 0.4);
  assert.equal(replay.transactionId, 'buy-no');
  assert.equal(e.getWallet(player('alice'), 'alice').version, 2, 'identical retry must not mutate twice');
  assert.throws(() => buy(e, 'buy-no', 'alice', 'buy-market', 'NO', 11, 2, 0.4), /Idempotency conflict/);

  e.lockMarket(admin, 'buy-market');
  assert.throws(() => buy(e, 'locked', 'alice', 'buy-market', 'YES', 1, 2, 0.6), /not OPEN/);
})();

(function expiredAndStalePrices() {
  const e1 = makeEngine();
  e1.bootstrapWallet(player('alice'), 'alice');
  createOpen(e1, 'expired', 0.5);
  nowMs += 2 * 60 * 60 * 1000;
  assert.throws(() => buy(e1, 'expired-tx', 'alice', 'expired', 'YES', 1, 0, 0.5), /lockTime has passed/);
  nowMs -= 2 * 60 * 60 * 1000;

  const e2 = makeEngine();
  e2.bootstrapWallet(player('alice'), 'alice');
  e2.createMarket(admin, {
    marketId:'stale', title:'Stale?', referenceYesPrice:0.5, referenceNoPrice:0.5,
    referencePriceAsOf:new Date(nowMs - 30*60*1000).toISOString(), referencePriceTrusted:true,
    providerKind:'MANUAL', lockTime:new Date(nowMs+60*60*1000).toISOString()
  });
  assert.throws(() => e2.openMarket(admin, 'stale'), /stale/);
})();

(function serverAuthoritativePrice() {
  const e = makeEngine();
  e.bootstrapWallet(player('alice'), 'alice');
  createOpen(e, 'server-price', 0.7);
  const r = buy(e, 'server-price-tx', 'alice', 'server-price', 'YES', 10, 0, 0.2);
  assert.equal(r.executionReferencePrice, 0.7, 'client proposed price must not control execution');
  assert.equal(r.grossCredits, 7);
})();

(function sellCoverage() {
  const e = makeEngine();
  e.bootstrapWallet(player('alice'), 'alice');
  createOpen(e, 'sell-market', 0.5);
  buy(e, 'seed-buy', 'alice', 'sell-market', 'YES', 10, 0, 0.5);
  e.setManualPrice(admin, 'sell-market', 0.8, 0.2, new Date(nowMs).toISOString());
  const partial = sell(e, 'partial-sell', 'alice', 'sell-market', 'YES', 4, 1, 0.8);
  assert.equal(partial.grossCredits, 3.2);
  assert.equal(partial.position.quantity, 6);
  assert.equal(partial.position.costBasisCredits, 3);
  assert.equal(partial.position.averageCostCredits, 0.5);
  assert.equal(partial.position.realizedCredits, 1.2);
  assert.equal(partial.wallet.availableCredits, 998.2);
  assert.throws(() => sell(e, 'oversell', 'alice', 'sell-market', 'YES', 7, 2, 0.8), /more.*owned/);
  const full = sell(e, 'full-sell', 'alice', 'sell-market', 'YES', 6, 2, 0.8);
  assert.equal(full.position.quantity, 0);
  assert.equal(full.position.costBasisCredits, 0);
  assert.equal(full.position.realizedCredits, 3);
  assert.equal(full.wallet.availableCredits, 1003);
})();

(function lifecycleCoverage() {
  const e = makeEngine();
  e.createMarket(admin, {marketId:'life',title:'Life?',referenceYesPrice:0.5,referenceNoPrice:0.5,referencePriceAsOf:new Date(nowMs).toISOString(),referencePriceTrusted:true,providerKind:'MANUAL',lockTime:new Date(nowMs+3600000).toISOString()});
  e.openMarket(admin, 'life');
  e.lockMarket(admin, 'life');
  e.setManualResolution(admin, 'life', 'YES');
  assert.equal(e.repository.getMarket('life').status, 'RESOLVED');
  assert.throws(() => e.openMarket(admin, 'life'), /Invalid/);

  e.createMarket(admin, {marketId:'void-draft',title:'Void?',referenceYesPrice:0.5,referenceNoPrice:0.5,referencePriceAsOf:new Date(nowMs).toISOString(),referencePriceTrusted:true,providerKind:'MANUAL',lockTime:new Date(nowMs+3600000).toISOString()});
  e.voidMarket(admin, 'void-draft');
  assert.equal(e.repository.getMarket('void-draft').winningOutcome, '');
  assert.throws(() => e.openMarket(admin, 'void-draft'), /Invalid/);
})();

(function settlementYesAndBothOutcomes() {
  const e = makeEngine();
  e.bootstrapWallet(player('alice'), 'alice');
  createOpen(e, 'settle-yes', 0.6);
  buy(e, 'yes-hold', 'alice', 'settle-yes', 'YES', 10, 0, 0.6);
  buy(e, 'no-hold', 'alice', 'settle-yes', 'NO', 5, 1, 0.4);
  e.lockMarket(admin, 'settle-yes');
  e.resolveMarket(admin, 'settle-yes', 'YES');
  const s = e.settlePlayerMarket(admin, 'settle-yes', 'alice');
  assert.equal(s.payoutCredits, 10);
  assert.equal(s.positionResults.length, 2);
  assert.equal(s.wallet.availableCredits, 1002);
  assert.equal(s.wallet.version, 3);
  const repeat = e.settlePlayerMarket(admin, 'settle-yes', 'alice');
  assert.equal(repeat.payoutCredits, 10);
  assert.equal(e.getWallet(player('alice'), 'alice').version, 3, 'repeated settlement must not pay twice');
})();

(function settlementNoAndVoid() {
  const e = makeEngine();
  e.bootstrapWallet(player('bob'), 'bob');
  createOpen(e, 'settle-no', 0.7);
  buy(e, 'bob-no', 'bob', 'settle-no', 'NO', 10, 0, 0.3);
  e.lockMarket(admin, 'settle-no');
  e.resolveMarket(admin, 'settle-no', 'NO');
  const noSettle = e.settlePlayerMarket(admin, 'settle-no', 'bob');
  assert.equal(noSettle.payoutCredits, 10);
  assert.equal(noSettle.wallet.availableCredits, 1007);

  const v = makeEngine();
  v.bootstrapWallet(player('carol'), 'carol');
  createOpen(v, 'void-market', 0.25);
  buy(v, 'void-buy', 'carol', 'void-market', 'YES', 20, 0, 0.25);
  v.voidMarket(admin, 'void-market');
  const voidSettle = v.settlePlayerMarket(admin, 'void-market', 'carol');
  assert.equal(voidSettle.returnedCostBasisCredits, 5);
  assert.equal(voidSettle.payoutCredits, 5);
  assert.equal(voidSettle.wallet.availableCredits, 1000);
})();

(function losingOutcomeCoverage() {
  const e = makeEngine();
  e.bootstrapWallet(player('alice'), 'alice');
  createOpen(e, 'lose', 0.4);
  buy(e, 'lose-buy', 'alice', 'lose', 'YES', 10, 0, 0.4);
  e.lockMarket(admin, 'lose');
  e.resolveMarket(admin, 'lose', 'NO');
  const s = e.settlePlayerMarket(admin, 'lose', 'alice');
  assert.equal(s.payoutCredits, 0);
  assert.equal(s.wallet.availableCredits, 996);
})();

(function portfolioAndLeaderboard() {
  const e = makeEngine();
  e.bootstrapWallet(player('alice'), 'alice');
  e.bootstrapWallet(player('bob'), 'bob');
  createOpen(e, 'portfolio', 0.5);
  buy(e, 'a-buy', 'alice', 'portfolio', 'YES', 10, 0, 0.5);
  e.setManualPrice(admin, 'portfolio', 0.8, 0.2, new Date(nowMs).toISOString());
  const p = e.getPortfolio(player('alice'), 'alice');
  assert.equal(p.availableCredits, 995);
  assert.equal(p.currentMarkedPositionValueCredits, 8);
  assert.equal(p.unrealizedGainLossCredits, 3);
  assert.equal(p.realizedGainLossCredits, 0);
  assert.equal(p.portfolioValueCredits, 1003);
  const board = e.getLeaderboard(admin);
  assert.equal(board[0].playerId, 'alice');
  assert.equal(board[0].portfolioValueCredits, 1003);
  assert.equal(board[1].playerId, 'bob');
})();

(function tieBehavior() {
  const e = makeEngine();
  e.bootstrapWallet(player('bob'), 'bob');
  e.bootstrapWallet(player('alice'), 'alice');
  const board = e.getLeaderboard(admin);
  assert.deepEqual(board.map(x => x.playerId), ['alice', 'bob']);
})();

(function authCoverage() {
  const e = makeEngine();
  assert.throws(() => e.createMarket(player('alice'), {marketId:'bad',title:'Bad',referenceYesPrice:0.5,referenceNoPrice:0.5}), /Admin/);
  e.bootstrapWallet(player('alice'), 'alice');
  assert.throws(() => e.getWallet(player('bob'), 'alice'), /authorization/);
})();

(function storageIsolation() {
  assert.equal(PREDICTION_MARKET_R2_SHEETS.markets, 'PredictionMarketMarkets');
  assert.equal(PREDICTION_MARKET_R2_SHEETS.wallets, 'PredictionMarketWallets');
  assert.equal(PREDICTION_MARKET_R2_SHEETS.transactions, 'PredictionMarketTransactions');
  assert.equal(PREDICTION_MARKET_R2_SHEETS.positions, 'PredictionMarketPositions');
  assert.equal(PREDICTION_MARKET_R2_SHEETS.settlements, 'PredictionMarketSettlements');
  Object.values(PREDICTION_MARKET_R2_SHEETS).forEach(name => assert.notEqual(name, 'Bets'));

  const root = path.resolve(__dirname, '..');
  const games = path.join(root, 'backend/engines/GamesEngine.js');
  const betting = path.join(root, 'backend/engines/BettingEngine.js');
  const sportsWager = path.join(root, 'backend/engines/SportsWagerEngine.js');
  const gameSource = fs.readFileSync(games, 'utf8');
  ['prediction','head-to-head','staked-prediction','wager','racing-wager','voting','ranking','mixed'].forEach(type => {
    assert(gameSource.includes(`id: "${type}"`) || gameSource.includes(`id: '${type}'`), `missing canonical type ${type}`);
  });
  assert(!/id:\s*["']prediction-market["']/.test(gameSource));
  assert(fs.readFileSync(betting,'utf8').includes('const BETS_SHEET = "Bets"'));
  assert(fs.readFileSync(sportsWager,'utf8').includes('SPORTS WAGER ENGINE'));
})();

require('./prediction_market_store_r2_failure_tests.js');

console.log('PASS prediction_market_engine_r2_tests');
