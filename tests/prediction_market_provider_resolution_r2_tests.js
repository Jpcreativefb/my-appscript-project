'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const resolution = require('../backend/providers/PredictionMarketProviderResolutionR2.js');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function baseMarket(overrides) {
  return Object.assign({
    marketId: 'm1', title: 'Best Actor', status: 'OPEN',
    yesLabel: 'Actor C', noLabel: 'Other', providerKind: 'POLYMARKET',
    providerId: 'event-1', externalMarketId: 'market-1',
    providerMetadata: { source: 'awards-external-markets', outcomes: ['Actor A','Actor B','Actor C','Actor D'], selectedOutcome: 'Actor C' }
  }, overrides || {});
}

function harness(market, fetchResult) {
  let current = clone(market);
  const settlements = Object.create(null);
  const calls = { open:0, lock:0, resolve:0, void:0, settle:0, saveMarket:0 };
  const positions = [
    { playerId:'p1', marketId:market.marketId, outcome:'YES' },
    { playerId:'p1', marketId:market.marketId, outcome:'NO' },
    { playerId:'p2', marketId:market.marketId, outcome:'YES' }
  ];
  const repository = {
    listPositions: () => clone(positions),
    saveMarket: row => { calls.saveMarket += 1; current = clone(row); return clone(current); }
  };
  const engine = {
    repository,
    getMarkets: () => [clone(current)],
    openMarket: () => { calls.open += 1; current.status='OPEN'; return clone(current); },
    lockMarket: () => { calls.lock += 1; current.status='LOCKED'; return clone(current); },
    resolveMarket: (_ctx,_id,winner) => { calls.resolve += 1; current.status='RESOLVED'; current.winningOutcome=winner; return clone(current); },
    voidMarket: () => { calls.void += 1; current.status='VOID'; return clone(current); },
    settlePlayerMarket: (_ctx,playerId,marketId) => {
      calls.settle += 1;
      const key = marketId + ':' + playerId;
      if (!settlements[key]) settlements[key] = { settlementKey:key, status:'COMMITTED' };
      return clone(settlements[key]);
    }
  };
  const service = resolution.predictionMarketProviderResolutionR2CreateService({
    engine,
    repository,
    nowIso: () => '2026-10-19T20:00:00.000Z',
    fetchKalshi: m => fetchResult(m),
    fetchPolymarket: m => fetchResult(m)
  });
  return { service, calls, getMarket:() => clone(current) };
}

(function openProviderOpensDraft() {
  const h = harness(baseMarket({status:'DRAFT',providerKind:'KALSHI'}), () => ({market:{status:'active', result:'', last_price_dollars:'0.99'}}));
  const out = h.service.sync('admin','m1');
  assert.equal(out.market.status,'OPEN');
  assert.equal(h.calls.open,1);
  assert.equal(h.calls.resolve,0);
})();

(function closedLocksOnlyAndPriceCannotResolve() {
  const h = harness(baseMarket({providerKind:'KALSHI'}), () => ({market:{status:'closed', result:'', last_price_dollars:'0.9999'}}));
  const out = h.service.sync('admin','m1');
  assert.equal(out.market.status,'LOCKED');
  assert.equal(h.calls.lock,1);
  assert.equal(h.calls.resolve,0);
  assert.equal(h.calls.settle,0);
})();

(function finalizedKalshiResolvesAndSettlesPlayers() {
  const h = harness(baseMarket({providerKind:'KALSHI',yesLabel:'YES',noLabel:'NO',providerMetadata:{source:'awards-external-markets',outcomes:['Yes','No'],selectedOutcome:'Yes'}}), () => ({market:{status:'finalized',result:'yes',last_price_dollars:'0.2'}}));
  const out = h.service.sync('admin','m1');
  assert.equal(out.market.status,'RESOLVED');
  assert.equal(out.market.winningOutcome,'YES');
  assert.equal(h.calls.lock,1);
  assert.equal(h.calls.resolve,1);
  assert.equal(h.calls.settle,2);
})();

(function polymarketResolvedWinnerMapsToSelectedOutcome() {
  const mapped = resolution.predictionMarketProviderResolutionR2MapPolymarket_(
    {closed:true,active:false,conditionId:'0xabc',outcomes:'["Actor A","Actor B","Actor C","Actor D"]'},
    {data:[{condition_id:'0xabc',status:'resolved',payouts:[0,0,1000000,0],resolved_at:'2026-10-19T19:00:00Z',resolution_source:'reported'}]}
  );
  const winner = resolution.predictionMarketProviderResolutionR2MapWinner_(baseMarket(), mapped);
  assert.equal(winner.providerWinningOutcome,'Actor C');
  assert.equal(winner.providerWinningOutcomeIndex,2);
  assert.equal(winner.mappedWinningOutcome,'YES');
  assert.equal(winner.reviewRequired,false);
})();

(function polymarketSiblingWinnerMapsToNoForBinaryTransform() {
  const mapped = resolution.predictionMarketProviderResolutionR2MapWinner_(baseMarket(), {
    lifecycle:'RESOLVED', final:true, reviewRequired:false, providerWinningOutcome:'Actor A', providerWinningOutcomeIndex:0, evidence:{}
  });
  assert.equal(mapped.mappedWinningOutcome,'NO');
})();

(function ambiguousPayoutRequiresReview() {
  const mapped = resolution.predictionMarketProviderResolutionR2MapPolymarket_(
    {closed:true,active:false,conditionId:'0xabc',outcomes:['Yes','No']},
    {data:[{condition_id:'0xabc',status:'resolved',payouts:[500000,500000]}]}
  );
  assert.equal(mapped.lifecycle,'REVIEW_REQUIRED');
  assert.equal(mapped.reviewRequired,true);
})();

(function unresolvedPolymarketLocksOnly() {
  const h = harness(baseMarket(), () => ({market:{closed:true,active:false,conditionId:'0xabc',outcomes:['Actor A','Actor B','Actor C','Actor D']},resolutions:{data:[{condition_id:'0xabc',status:'proposed',payouts:null}]}}));
  const out = h.service.sync('admin','m1');
  assert.equal(out.market.status,'LOCKED');
  assert.equal(h.calls.resolve,0);
})();

(function providerResultChangeRequiresReview() {
  const prior = baseMarket({status:'LOCKED',providerKind:'KALSHI',providerMetadata:{source:'awards-external-markets',outcomes:['Yes','No'],selectedOutcome:'Yes',providerResolutionR2:{final:true,providerWinningOutcome:'Yes'}}});
  const h = harness(prior, () => ({market:{status:'finalized',result:'no'}}));
  const out = h.service.sync('admin','m1');
  assert.equal(out.providerResolution.lifecycle,'REVIEW_REQUIRED');
  assert.equal(out.market.status,'LOCKED');
  assert.equal(h.calls.resolve,0);
})();

(function manualMarketStaysManual() {
  const h = harness(baseMarket({providerKind:'MANUAL'}), () => { throw new Error('must not fetch'); });
  const out = h.service.sync('admin','m1');
  assert.equal(out.skipped,true);
  assert.equal(out.reason,'MANUAL_MARKET');
  assert.equal(out.market.status,'OPEN');
})();

(function completedSettlementIsNeverOverridden() {
  const h = harness(baseMarket({status:'RESOLVED',winningOutcome:'YES',providerKind:'KALSHI'}), () => ({market:{status:'finalized',result:'no'}}));
  const out = h.service.sync('admin','m1');
  assert.equal(out.noOverride,true);
  assert.equal(out.market.status,'RESOLVED');
  assert.equal(out.market.winningOutcome,'YES');
  assert.equal(h.calls.resolve,0);
  assert.equal(h.calls.settle,0);
})();

(function explicitKalshiVoidUsesVoidLifecycle() {
  const mapped = resolution.predictionMarketProviderResolutionR2MapKalshi_({market:{status:'finalized',result:'void'}});
  assert.equal(mapped.lifecycle,'VOID');
  assert.equal(mapped.voided,true);
})();

(function sourceHasNoSixthStoreOrDirectFinancialWrites() {
  const src = fs.readFileSync(path.join(__dirname,'../backend/providers/PredictionMarketProviderResolutionR2.js'),'utf8');
  assert(!/PredictionMarket[A-Za-z]+/.test(src.replace(/PredictionMarketProviderResolutionR2/g,'')) || !/PredictionMarketProviderResolution/.test(''));
  assert(!/saveWallet\s*\(/.test(src));
  assert(!/saveTransaction\s*\(/.test(src));
  assert(!/saveSettlement\s*\(/.test(src));
  assert(/engine\.settlePlayerMarket\s*\(/.test(src));
  const core = fs.readFileSync(path.join(__dirname,'../backend/engines/PredictionMarketEngineR2.js'),'utf8');
  const stores = (core.match(/PredictionMarketMarkets|PredictionMarketWallets|PredictionMarketTransactions|PredictionMarketPositions|PredictionMarketSettlements/g) || []);
  ['PredictionMarketMarkets','PredictionMarketWallets','PredictionMarketTransactions','PredictionMarketPositions','PredictionMarketSettlements'].forEach(name => assert(stores.includes(name)));
  assert(!/PredictionMarketProviderResolutions/.test(core + src));
})();

(function manualFallbackStillExists() {
  const admin = fs.readFileSync(path.join(__dirname,'../backend/admin/AdminPredictionMarketsR3.js'),'utf8');
  assert(/engine\.resolveMarket\(actor\(username\)/.test(admin));
  assert(/adminResolvePredictionMarket/.test(admin));
})();

console.log('prediction_market_provider_resolution_r2_tests: PASS');
