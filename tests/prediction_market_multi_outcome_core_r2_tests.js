const assert = require('assert');
const engineModule = require('../backend/engines/PredictionMarketEngineR2.js');
const multiModule = require('../backend/engines/PredictionMarketMultiOutcomeR2.js');
const adminModule = require('../backend/admin/AdminPredictionMarketMultiOutcomeR2.js');

function adminContext() {
  return { role:'ADMIN', playerId:'admin-test', username:'admin-test' };
}

function makeHarness() {
  const repository = engineModule.predictionMarketR2CreateMemoryRepository();
  const engine = engineModule.predictionMarketR2CreateEngine({ repository });
  let sequence = 0;
  const idFactory = prefix => prefix + '-test-' + (++sequence);
  const coordinator = multiModule.predictionMarketMultiOutcomeR2CreateCoordinator({ engine, idFactory });
  const admin = adminModule.predictionMarketAdminMultiOutcomeR2CreateService({ engine, idFactory });
  return { repository, engine, coordinator, admin };
}

(function testFiveStoresAndSchemasRemainExact() {
  assert.deepStrictEqual(Object.keys(engineModule.PREDICTION_MARKET_R2_SHEETS).sort(), [
    'markets', 'positions', 'settlements', 'transactions', 'wallets'
  ]);
  assert.strictEqual(Object.keys(engineModule.PREDICTION_MARKET_R2_SHEETS).length, 5);
  assert.deepStrictEqual(engineModule.PREDICTION_MARKET_R2_HEADERS.markets, [
    'MarketId', 'Title', 'Description', 'Category', 'Status',
    'YesLabel', 'NoLabel', 'ReferenceYesPrice', 'ReferenceNoPrice',
    'ReferencePriceAsOf', 'ReferencePriceTrusted', 'ProviderKind',
    'ProviderId', 'ExternalMarketId', 'SourceUrl', 'ProviderMetadataJson',
    'OpenTime', 'LockTime', 'ResolutionStatus', 'WinningOutcome', 'Voided',
    'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy'
  ]);
  assert.deepStrictEqual(engineModule.PREDICTION_MARKET_R2_HEADERS.wallets, [
    'PlayerId', 'AvailableCredits', 'ReservedCredits', 'Version',
    'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy'
  ]);
  assert.deepStrictEqual(engineModule.PREDICTION_MARKET_R2_HEADERS.transactions, [
    'TransactionId', 'Fingerprint', 'PlayerId', 'MarketId', 'Side', 'Outcome',
    'Quantity', 'ExecutionReferencePrice', 'GrossCredits', 'Status',
    'WalletVersionBefore', 'WalletVersionAfter', 'RequestedAt', 'CommittedAt',
    'CommittedResultJson'
  ]);
  assert.deepStrictEqual(engineModule.PREDICTION_MARKET_R2_HEADERS.positions, [
    'PlayerId', 'MarketId', 'Outcome', 'Quantity', 'CostBasisCredits',
    'AverageCostCredits', 'RealizedCredits', 'SettledCredits',
    'SettledCostBasisCredits', 'Settled', 'CreatedAt', 'UpdatedAt'
  ]);
  assert.deepStrictEqual(engineModule.PREDICTION_MARKET_R2_HEADERS.settlements, [
    'SettlementKey', 'MarketId', 'PlayerId', 'MarketStatus', 'WinningOutcome',
    'PayoutCredits', 'ReturnedCostBasisCredits', 'WalletVersionBefore',
    'WalletVersionAfter', 'PositionResultsJson', 'Status', 'CommittedAt',
    'CommittedResultJson'
  ]);
})();

(function testBinaryMarketUnaffected() {
  const { engine } = makeHarness();
  const binary = engine.createMarket(adminContext(), {
    marketId:'binary-1',
    title:'Binary unchanged?',
    yesLabel:'YES',
    noLabel:'NO',
    referenceYesPrice:0.6,
    referenceNoPrice:0.4,
    referencePriceAsOf:new Date().toISOString(),
    referencePriceTrusted:true,
    providerKind:'MANUAL',
    providerMetadata:{ keep:'binary' },
    lockTime:'2099-01-01T00:00:00.000Z'
  });
  assert.strictEqual(binary.status, 'DRAFT');
  assert.strictEqual(binary.providerMetadata.keep, 'binary');
  assert.strictEqual(multiModule.predictionMarketMultiOutcomeR2GetMetadata_(binary), null);
})();

(function testThreeOutcomeDraftCreationAndMetadata() {
  const { admin, engine } = makeHarness();
  const result = admin.createDraftGroup('admin-test', {
    logicalMarketId:'best-actor-2027',
    groupMarketId:'best-actor-2027',
    logicalTitle:'Who will win Best Actor?',
    logicalQuestion:'Who will win Best Actor?',
    category:'Awards',
    referencePriceAsOf:new Date().toISOString(),
    referencePriceTrusted:true,
    providerMetadata:{ source:'manual-admin', unrelated:{ preserve:true } },
    lockTime:'2099-01-01T00:00:00.000Z',
    outcomes:[
      { outcomeId:'actor-a', outcomeLabel:'Actor A', marketId:'best-actor-a', referenceProbability:0.50 },
      { outcomeId:'actor-b', outcomeLabel:'Actor B', marketId:'best-actor-b', referenceProbability:0.30 },
      { outcomeId:'actor-c', outcomeLabel:'Actor C', marketId:'best-actor-c', referenceProbability:0.20 }
    ]
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.group.children.length, 3);
  assert.deepStrictEqual(result.group.children.map(m => m.status), ['DRAFT', 'DRAFT', 'DRAFT']);
  assert.strictEqual(new Set(result.group.children.map(m => m.marketId)).size, 3);

  result.group.children.forEach((market, index) => {
    const metadata = multiModule.predictionMarketMultiOutcomeR2GetMetadata_(market);
    assert.strictEqual(metadata.metadataVersion, 1);
    assert.strictEqual(metadata.marketType, 'MULTI_OUTCOME');
    assert.strictEqual(metadata.logicalMarketId, 'best-actor-2027');
    assert.strictEqual(metadata.groupMarketId, 'best-actor-2027');
    assert.strictEqual(metadata.logicalTitle, 'Who will win Best Actor?');
    assert.strictEqual(metadata.logicalQuestion, 'Who will win Best Actor?');
    assert.strictEqual(metadata.outcomeOrder, index);
    assert.strictEqual(market.providerMetadata.source, 'manual-admin');
    assert.deepStrictEqual(market.providerMetadata.unrelated, { preserve:true });
  });
  assert.strictEqual(engine.getMarkets().length, 3);
})();

(function testMetadataMergePreservesNamespaceAndUnrelatedFields() {
  const baseGroup = multiModule.predictionMarketMultiOutcomeR2BuildMetadata_({
    logicalMarketId:'group-merge',
    groupMarketId:'group-merge',
    logicalTitle:'Merge question',
    logicalQuestion:'Merge question',
    outcomeId:'merge-a',
    outcomeLabel:'Merge A',
    outcomeOrder:0
  });
  const current = {
    providerToken:'old-token',
    retained:{ a:1 },
    pattcMultiOutcomeR2:baseGroup
  };
  const incoming = {
    providerToken:'new-token',
    refreshed:true,
    pattcMultiOutcomeR2:{ maliciousReplacement:true }
  };
  const merged = multiModule.predictionMarketMultiOutcomeR2MergeProviderMetadata_(current, incoming);
  assert.strictEqual(merged.providerToken, 'new-token');
  assert.strictEqual(merged.refreshed, true);
  assert.deepStrictEqual(merged.retained, { a:1 });
  assert.deepStrictEqual(merged.pattcMultiOutcomeR2, baseGroup);
})();

(function testResolveWinnerSiblingsAndRepeatSafety() {
  const { coordinator, engine } = makeHarness();
  const created = coordinator.createDraftGroup(adminContext(), {
    logicalMarketId:'resolve-group',
    logicalTitle:'Resolve one winner',
    logicalQuestion:'Resolve one winner',
    referencePriceAsOf:new Date().toISOString(),
    referencePriceTrusted:true,
    lockTime:'2099-01-01T00:00:00.000Z',
    outcomes:[
      { outcomeId:'a', outcomeLabel:'A', marketId:'resolve-a', referenceProbability:0.4 },
      { outcomeId:'b', outcomeLabel:'B', marketId:'resolve-b', referenceProbability:0.35 },
      { outcomeId:'c', outcomeLabel:'C', marketId:'resolve-c', referenceProbability:0.25 }
    ]
  });
  created.children.forEach(market => {
    engine.openMarket(adminContext(), market.marketId);
    engine.lockMarket(adminContext(), market.marketId);
  });

  const first = coordinator.resolveGroup(adminContext(), 'resolve-group', 'b');
  const byOutcome = {};
  first.children.forEach(market => {
    byOutcome[multiModule.predictionMarketMultiOutcomeR2GetMetadata_(market).outcomeId] = market;
  });
  assert.strictEqual(byOutcome.b.status, 'RESOLVED');
  assert.strictEqual(byOutcome.b.winningOutcome, 'YES');
  assert.strictEqual(byOutcome.a.winningOutcome, 'NO');
  assert.strictEqual(byOutcome.c.winningOutcome, 'NO');

  const second = coordinator.resolveGroup(adminContext(), 'resolve-group', 'b');
  assert.strictEqual(second.status, 'RESOLVED');
  assert.deepStrictEqual(
    second.children.map(m => [m.marketId, m.status, m.winningOutcome]),
    first.children.map(m => [m.marketId, m.status, m.winningOutcome])
  );
})();

(function testGroupVoidAndRepeatSafety() {
  const { coordinator } = makeHarness();
  coordinator.createDraftGroup(adminContext(), {
    logicalMarketId:'void-group',
    logicalTitle:'Void this group',
    logicalQuestion:'Void this group',
    referencePriceAsOf:new Date().toISOString(),
    referencePriceTrusted:true,
    outcomes:[
      { outcomeId:'one', outcomeLabel:'One', marketId:'void-one', referenceProbability:0.55 },
      { outcomeId:'two', outcomeLabel:'Two', marketId:'void-two', referenceProbability:0.45 }
    ]
  });
  const first = coordinator.voidGroup(adminContext(), 'void-group');
  assert.deepStrictEqual(first.children.map(m => m.status), ['VOID', 'VOID']);
  const second = coordinator.voidGroup(adminContext(), 'void-group');
  assert.deepStrictEqual(second.children.map(m => m.status), ['VOID', 'VOID']);
})();

console.log('PASS prediction_market_multi_outcome_core_r2_tests');
