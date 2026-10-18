const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contracts = require(path.join(root, 'backend/engines/PredictionMarketContracts.js'));

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const directorStatus = read('docs/PATTC_DIRECTOR_CURRENT_STATUS_20261015.md');
const gamesEngine = read('backend/engines/GamesEngine.js');
const sportsWager = read('backend/engines/SportsWagerEngine.js');
const bettingEngine = read('backend/engines/BettingEngine.js');
const app = read('frontend/js/app.js');

(function canonicalGeneralCustomTypesRemainUnchanged() {
  const expected = [
    'prediction',
    'head-to-head',
    'staked-prediction',
    'wager',
    'racing-wager',
    'voting',
    'ranking',
    'mixed'
  ];

  const sectionMatch = directorStatus.match(
    /Approved General \/ Custom canonical types are exactly:([\s\S]*?)Generic create payload/
  );
  assert(sectionMatch, 'Director General / Custom canonical type section must remain present');

  const actual = Array.from(sectionMatch[1].matchAll(/`([^`]+)`/g)).map(match => match[1]);
  assert.deepStrictEqual(actual, expected, 'R8 General / Custom canonical types must remain exactly unchanged');
})();

(function predictionMarketIsNotARegisteredGamesEngineType() {
  assert(!/id:\s*["']prediction-market["']/.test(gamesEngine),
    'Prediction Market must not register itself in GamesEngine');
  assert(/id:\s*["']wager["']/.test(gamesEngine),
    'Existing wager canonical type must remain registered');
})();

(function sportsWagerBehaviorIsNotReplaced() {
  assert(sportsWager.includes('SPORTS WAGER'), 'SportsWagerEngine authority must remain present');
  assert(bettingEngine.includes('Supported game type:'), 'BettingEngine wager contract must remain present');
  assert(bettingEngine.includes('wager'), 'BettingEngine must remain tied to existing wager behavior');
  assert(!sportsWager.includes('PredictionMarketContracts'),
    'SportsWagerEngine must not be replaced or coupled to Prediction Market');
})();

(function acceptedGameBuilderRoutingRemainsIntact() {
  [
    'admin-team-fantasy',
    'admin-playoff-race',
    'admin-nfl-cup',
    'admin-nfl-season-setup',
    'admin-sports-engine',
    'admin-game-setup:'
  ].forEach(route => {
    assert(app.includes(route), `Accepted app route must remain present: ${route}`);
  });
})();

(function lifecycleContract() {
  const S = contracts.PREDICTION_MARKET_STATUS;
  assert.strictEqual(contracts.predictionMarketCanTransition(S.DRAFT, S.OPEN), true);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.DRAFT, S.VOID), true);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.OPEN, S.LOCKED), true);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.OPEN, S.VOID), true);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.LOCKED, S.RESOLVED), true);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.LOCKED, S.VOID), true);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.RESOLVED, S.OPEN), false);
  assert.strictEqual(contracts.predictionMarketCanTransition(S.VOID, S.OPEN), false);
  assert.strictEqual(contracts.predictionMarketTradesPermitted(S.OPEN), true);
  assert.strictEqual(contracts.predictionMarketTradesPermitted(S.LOCKED), false);
})();

(function binaryMarketContract() {
  const market = contracts.predictionMarketCreateBinaryMarket({
    marketId: 'market-1',
    title: 'Will the event occur?',
    category: 'example',
    status: 'OPEN',
    referenceYesPrice: 0.62,
    referenceNoPrice: 0.38,
    provider: { kind: 'MANUAL', providerId: 'admin' },
    openTime: '2026-10-17T20:00:00Z',
    lockTime: '2026-10-20T20:00:00Z'
  });
  assert.strictEqual(market.outcomes.YES, 'YES');
  assert.strictEqual(market.outcomes.NO, 'NO');
  assert.strictEqual(market.referencePrices.YES, 0.62);
  assert.strictEqual(market.provider.kind, 'MANUAL');
  assert.throws(() => contracts.predictionMarketCreateBinaryMarket({
    marketId: 'bad', title: 'bad', status: 'OPEN',
    referenceYesPrice: 0.75, referenceNoPrice: 0.35, provider: { kind: 'MANUAL' }
  }), /sum to 1/);
})();

(function duplicateTransactionIdsCannotProduceTwoSuccessfulTrades() {
  const intent = {
    transactionId: 'tx-123',
    playerId: 'player-1',
    marketId: 'market-1',
    side: 'BUY',
    outcome: 'YES',
    quantity: 10,
    referencePrice: 0.6,
    expectedWalletVersion: 3
  };
  const fingerprint = contracts.predictionMarketTransactionFingerprint(intent);
  const existing = {
    transactionId: 'tx-123',
    fingerprint,
    status: 'COMMITTED',
    result: { quantity: 10 }
  };

  const replay = contracts.predictionMarketResolveIdempotentTrade(existing, intent);
  assert.strictEqual(replay.duplicate, true);
  assert.strictEqual(replay.transaction, existing);

  assert.throws(() => contracts.predictionMarketResolveIdempotentTrade(existing, {
    ...intent,
    quantity: 11
  }), /Idempotency conflict/);
})();

(function walletRaceAndOverspendContract() {
  const wallet = contracts.predictionMarketCreateWallet({
    playerId: 'player-1', availableCredits: 5, reservedCredits: 0, version: 4
  });
  assert.throws(() => contracts.predictionMarketAssertBuyCapacity(wallet, {
    transactionId: 'tx-over', playerId: 'player-1', marketId: 'market-1',
    side: 'BUY', outcome: 'YES', quantity: 10, referencePrice: 0.6,
    expectedWalletVersion: 4
  }), /Insufficient/);
  assert.throws(() => contracts.predictionMarketCreateWallet({
    playerId: 'player-1', availableCredits: -1
  }), /cannot be negative/);
  assert.throws(() => contracts.predictionMarketAssertBuyCapacity({
    playerId: 'player-1', availableCredits: 100, reservedCredits: 0, version: 5
  }, {
    transactionId: 'tx-stale', playerId: 'player-1', marketId: 'market-1',
    side: 'BUY', outcome: 'YES', quantity: 10, referencePrice: 0.6,
    expectedWalletVersion: 4
  }), /Stale/);
})();

(function settlementIsIdempotentAndVoidReturnsCostBasis() {
  const position = {
    playerId: 'player-1', marketId: 'market-1', outcome: 'YES',
    quantity: 20, costBasisCredits: 11, realizedCredits: 0, settledCredits: 0
  };
  const resolved = contracts.predictionMarketSettlementValue(position, {
    status: 'RESOLVED', winningOutcome: 'YES'
  });
  assert.strictEqual(resolved.payoutCredits, 20);

  const existingSettlement = { ...resolved, status: 'COMMITTED' };
  const replay = contracts.predictionMarketResolveIdempotentSettlement(existingSettlement, resolved);
  assert.strictEqual(replay.duplicate, true);
  assert.strictEqual(replay.settlement, existingSettlement);

  const voided = contracts.predictionMarketSettlementValue(position, { status: 'VOID' });
  assert.strictEqual(voided.payoutCredits, 11);
  assert.strictEqual(voided.reason, 'VOID_COST_BASIS_RETURN');
})();

(function providerContractIsSourceAgnostic() {
  function provider(name) {
    return {
      name,
      getReferencePrices() { return { YES: 0.5, NO: 0.5 }; },
      getResolution() { return { status: 'UNRESOLVED' }; }
    };
  }
  ['manual', 'kalshi', 'polymarket', 'future-approved-provider'].forEach(name => {
    assert.strictEqual(contracts.predictionMarketProviderContract(provider(name)).name, name);
  });
  assert.throws(() => contracts.predictionMarketProviderContract({
    getReferencePrices() { return {}; }
  }), /getResolution/);
})();

(function adminPlacementAndAtomicityContracts() {
  const admin = contracts.predictionMarketAdminPlacementContract();
  assert.strictEqual(admin.root, 'Admin > Games & Design > Prediction Market');
  assert.strictEqual(admin.usesOrdinaryManageGames, false);
  assert.strictEqual(admin.changesSportsNavigation, false);
  assert.strictEqual(admin.canonicalGeneralCustomType, false);

  const atomic = contracts.predictionMarketAtomicityContract();
  assert.strictEqual(atomic.transactionIdUnique, true);
  assert.strictEqual(atomic.walletVersionCompareAndSetRequired, true);
  assert.strictEqual(atomic.settlementKeyUnique, true);
  assert.strictEqual(atomic.settlementAndPayoutSameCriticalSection, true);
})();

console.log('PASS prediction_market_foundation_r9_tests');
