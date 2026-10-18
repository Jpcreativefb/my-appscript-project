const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const providers = require('../backend/providers/PredictionMarketReferenceProvidersR5.js');
const stored = require('../backend/providers/PredictionMarketStoredPriceProvidersR5.js');
const {
  predictionMarketR2CreateMemoryRepository,
  predictionMarketR2CreateEngine
} = require('../backend/engines/PredictionMarketEngineR2.js');
const { predictionMarketAdminR3CreateService } = require('../backend/admin/AdminPredictionMarketsR3.js');
const { predictionMarketPlayerR4CreateService } = require('../backend/player/PredictionMarketPlayerR4.js');

const providerSource = read('backend/providers/PredictionMarketReferenceProvidersR5.js');
const storedSource = read('backend/providers/PredictionMarketStoredPriceProvidersR5.js');
const engineSource = read('backend/engines/PredictionMarketEngineR2.js');
const adminSource = read('backend/admin/AdminPredictionMarketsR3.js');
const adminUiSource = read('frontend/js/pages/adminPredictionMarketsR3.js');
const playerSource = read('backend/player/PredictionMarketPlayerR4.js');
const playerUiSource = read('frontend/js/pages/predictionMarketsR4.js');
const apiSource = read('backend/Api.js');
const securitySource = read('backend/core/ApiSecurity.js');

assert.doesNotThrow(() => new Function(providerSource));
assert.doesNotThrow(() => new Function(storedSource));

const NOW = Date.parse('2026-10-18T14:00:00.000Z');
const MAX_AGE = 15 * 60 * 1000;

// MANUAL remains a first-class provider and needs no network transport.
const manual = providers.predictionMarketProviderR5ManualAdapter_({nowMs:NOW,maxAgeMs:MAX_AGE});
const manualResult = manual.fetchReference({
  marketId:'manual-1', providerKind:'MANUAL', referenceYesPrice:0.6, referenceNoPrice:0.4,
  referencePriceAsOf:'2026-10-18T13:55:00.000Z', referencePriceTrusted:true
});
assert.equal(manualResult.success, true);
assert.equal(manualResult.snapshot.providerKind, 'MANUAL');
assert.equal(manualResult.snapshot.referenceYesPrice, 0.6);
assert.equal(manualResult.snapshot.referenceNoPrice, 0.4);
assert.equal(manualResult.snapshot.providerStatus, 'FRESH');

// Strict normalization: never silently repair malformed binary data.
const normalize = input => providers.predictionMarketProviderR5Normalize_(Object.assign({
  providerKind:'KALSHI', providerId:'kalshi-public', externalMarketId:'KXTEST',
  referencePriceAsOf:'2026-10-18T13:59:00.000Z', trusted:true
}, input), {nowMs:NOW,maxAgeMs:MAX_AGE});
assert.deepEqual(
  [normalize({referenceYesPrice:0.31,referenceNoPrice:0.69}).referenceYesPrice,
   normalize({referenceYesPrice:0.31,referenceNoPrice:0.69}).referenceNoPrice],
  [0.31,0.69]
);
assert.throws(() => normalize({referenceYesPrice:'bad',referenceNoPrice:0.5}), /finite/);
assert.throws(() => normalize({referenceYesPrice:-0.1,referenceNoPrice:1.1}), /between 0 and 1/);
assert.throws(() => normalize({referenceYesPrice:0.4,referenceNoPrice:0.4}), /sum to 1/);
assert.throws(() => providers.predictionMarketProviderR5Normalize_({
  providerKind:'KALSHI',providerId:'x',externalMarketId:'y',referenceYesPrice:0.5,referenceNoPrice:0.5,trusted:true
}, {nowMs:NOW,maxAgeMs:MAX_AGE}), /referencePriceAsOf is required/);
assert.throws(() => providers.predictionMarketProviderR5Normalize_({
  providerKind:'KALSHI',providerId:'x',externalMarketId:'y',referenceYesPrice:0.5,referenceNoPrice:0.5,
  referencePriceAsOf:'2026-10-18T13:59:00Z'
}, {nowMs:NOW,maxAgeMs:MAX_AGE}), /trusted must be explicit/);
assert.equal(normalize({referenceYesPrice:0.5,referenceNoPrice:0.5,referencePriceAsOf:'2026-10-18T13:00:00Z'}).providerStatus, 'STALE');

// Provider files are independent of wallets, positions, trade execution, settlement and lifecycle mutation.
['executeTrade','saveWallet','savePosition','commitTrade','commitSettlement','settlePlayerMarket','transitionMarket','repository.setup','SpreadsheetApp'].forEach(token => {
  assert(!providerSource.includes(token), 'provider layer must not own '+token);
  assert(!storedSource.includes(token), 'stored-price bridge must not own '+token);
});
assert(engineSource.includes('setReferencePrice'));
assert(engineSource.includes('assertAdmin(context)'));

// Kalshi mapping boundary: official public market shape -> normalized binary snapshot.
const mapped = providers.predictionMarketProviderR5KalshiMap_({market:{
  ticker:'KXTEST', event_ticker:'KXEVENT', last_price_dollars:'0.37', updated_time:'2026-10-18T13:58:00Z', status:'open'
}}, {providerId:'kalshi-public',externalMarketId:'KXTEST'}, {nowMs:NOW,maxAgeMs:MAX_AGE});
assert.equal(mapped.providerKind, 'KALSHI');
assert.equal(mapped.referenceYesPrice, 0.37);
assert.equal(mapped.referenceNoPrice, 0.63);
assert.equal(mapped.externalMarketId, 'KXTEST');
assert.equal(mapped.providerStatus, 'FRESH');
assert.equal(mapped.providerMetadata.sourceField, 'last_price_dollars');

// Production registry has NO live external transport enabled in R5.
const productionLikeRegistry = providers.predictionMarketReferenceProvidersR5CreateRegistry({maxAgeMs:MAX_AGE,nowMs:NOW});
assert.equal(productionLikeRegistry.liveExternalProvidersEnabled, false);
assert.equal(productionLikeRegistry.fetchReference({providerKind:'KALSHI',externalMarketId:'KXTEST'}).providerStatus, 'UNCONFIGURED');
assert.equal(productionLikeRegistry.fetchReference({providerKind:'POLYMARKET',externalMarketId:'pm-1'}).providerStatus, 'UNCONFIGURED');
assert.equal(productionLikeRegistry.fetchReference({providerKind:'DIRECTOR_APPROVED',externalMarketId:'dir-1'}).providerStatus, 'UNCONFIGURED');

// Injected Kalshi transport is read-only, bounded by contract, one attempt, and fully mockable.
let transportArgs = null;
const kalshi = providers.predictionMarketProviderR5KalshiAdapter_({
  nowMs:NOW,maxAgeMs:MAX_AGE,timeoutMs:4321,
  transport:(url, opts) => {
    transportArgs={url,opts};
    return {status:200,body:{market:{ticker:'KXTEST',event_ticker:'KXEVENT',last_price_dollars:'0.44',updated_time:'2026-10-18T13:59:00Z'}}};
  }
});
const kalshiOk = kalshi.fetchReference({providerKind:'KALSHI',providerId:'kalshi-public',externalMarketId:'KXTEST'});
assert.equal(kalshiOk.success,true);
assert.equal(kalshiOk.snapshot.referenceYesPrice,0.44);
assert.equal(kalshiOk.snapshot.referenceNoPrice,0.56);
assert.equal(transportArgs.opts.method,'GET');
assert.equal(transportArgs.opts.timeoutMs,4321);
assert.equal(transportArgs.opts.maxAttempts,1);

function adapterWith(responseOrThrow) {
  return providers.predictionMarketProviderR5KalshiAdapter_({nowMs:NOW,maxAgeMs:MAX_AGE,transport:() => {
    if (responseOrThrow instanceof Error) throw responseOrThrow;
    return responseOrThrow;
  }});
}
let timeoutErr = new Error('network timeout'); timeoutErr.code='TIMEOUT';
assert.equal(adapterWith(timeoutErr).fetchReference({externalMarketId:'KXTEST'}).success,false);
assert.equal(adapterWith({status:500,body:{}}).fetchReference({externalMarketId:'KXTEST'}).providerStatus,'PROVIDER_ERROR');
assert.equal(adapterWith({status:429,body:{}}).fetchReference({externalMarketId:'KXTEST'}).providerStatus,'RATE_LIMITED');
assert.equal(adapterWith({status:200,body:'{bad-json'}).fetchReference({externalMarketId:'KXTEST'}).providerStatus,'INVALID');
assert.equal(adapterWith({status:200,body:{market:null}}).fetchReference({externalMarketId:'KXTEST'}).success,false);
assert.equal(adapterWith({status:404,body:{}}).fetchReference({externalMarketId:'KXTEST'}).providerStatus,'UNAVAILABLE');

// Admin refresh: authenticated Admin only; failures and stale data preserve the last accepted snapshot.
const repo = predictionMarketR2CreateMemoryRepository();
const engine = predictionMarketR2CreateEngine({
  repository:repo,
  providers:stored.predictionMarketReferenceProvidersR5CreateR2PriceProviders(),
  now:() => new Date(NOW)
});
const adminCtx={role:'ADMIN',playerId:'director'};
engine.createMarket(adminCtx,{
  marketId:'external-1',title:'External?',status:'DRAFT',referenceYesPrice:0.52,referenceNoPrice:0.48,
  referencePriceAsOf:'2026-10-18T13:55:00Z',referencePriceTrusted:true,
  providerKind:'KALSHI',providerId:'kalshi-public',externalMarketId:'KXTEST',sourceUrl:'https://example.invalid/old',
  providerMetadata:{old:true},lockTime:'2026-10-18T16:00:00Z'
});
const original = engine.getMarkets()[0];
let registry = {fetchReference:() => ({success:false,providerStatus:'PROVIDER_ERROR',message:'upstream unavailable'})};
let service = predictionMarketAdminR3CreateService({engine,providerRegistry:registry});
let failed = service.refreshReference('director',{marketId:'external-1'});
assert.equal(failed.success,false);
assert.equal(failed.providerStatus,'PROVIDER_ERROR');
let unchanged = engine.getMarkets()[0];
assert.equal(unchanged.referenceYesPrice,original.referenceYesPrice);
assert.equal(unchanged.referencePriceAsOf,original.referencePriceAsOf);
assert.deepEqual(unchanged.providerMetadata,original.providerMetadata);
assert.throws(() => service.refreshReference('',{marketId:'external-1'}), /Authenticated Admin username/);

registry = {fetchReference:() => ({success:true,snapshot:{
  providerKind:'KALSHI',providerId:'kalshi-public',externalMarketId:'KXTEST',referenceYesPrice:0.7,referenceNoPrice:0.3,
  referencePriceAsOf:'2026-10-18T12:00:00Z',trusted:true,sourceUrl:'https://external-api.kalshi.com/test',providerMetadata:{stale:true}
}})};
service = predictionMarketAdminR3CreateService({engine,providerRegistry:registry});
const stale = service.refreshReference('director',{marketId:'external-1'});
assert.equal(stale.success,false);
assert.equal(stale.providerStatus,'STALE');
unchanged = engine.getMarkets()[0];
assert.equal(unchanged.referenceYesPrice,original.referenceYesPrice);
assert.equal(unchanged.referencePriceAsOf,original.referencePriceAsOf);

registry = {fetchReference:() => ({success:true,snapshot:{
  providerKind:'KALSHI',providerId:'kalshi-public',externalMarketId:'KXTEST',referenceYesPrice:0.61,referenceNoPrice:0.39,
  referencePriceAsOf:new Date().toISOString(),trusted:true,sourceUrl:'https://external-api.kalshi.com/test',providerMetadata:{sourceField:'last_price_dollars'}
}})};
service = predictionMarketAdminR3CreateService({engine,providerRegistry:registry});
const refreshed = service.refreshReference('director',{marketId:'external-1'});
assert.equal(refreshed.success,true);
assert.equal(refreshed.market.referenceYesPrice,0.61);
assert.equal(refreshed.market.referenceNoPrice,0.39);
assert.equal(refreshed.market.providerKind,'KALSHI');
assert.equal(refreshed.market.providerMetadata.sourceField,'last_price_dollars');

// Manual price authority still works after R5 and remains a complete fallback.
const manualUpdated = engine.setManualPrice(adminCtx,'external-1',0.55,0.45,new Date().toISOString());
assert.equal(manualUpdated.providerKind,'MANUAL');
assert.equal(manualUpdated.referenceYesPrice,0.55);
assert.equal(manualUpdated.referenceNoPrice,0.45);

// R4 consumes accepted server-side market state only and never calls external provider refresh/network APIs.
assert(playerSource.includes('predictionMarketReferenceProvidersR5CreateR2PriceProviders'));
assert(!playerSource.includes('predictionMarketReferenceProvidersR5CreateRegistry'));
assert(!playerUiSource.includes('adminRefreshPredictionMarketReference'));
assert(!playerUiSource.includes('external-api.kalshi.com'));
assert(!playerUiSource.includes('polymarket'));
assert(adminUiSource.includes('Refresh Reference Price'));
assert(adminUiSource.includes('adminRefreshPredictionMarketReference'));
assert(apiSource.includes('adminRefreshPredictionMarketReference'));
assert(securitySource.includes('if (apiSecurityIsAdminAction_(action))'));
assert(securitySource.includes('payload.username = sessionUsername'));

// Browser/provider sources contain no credential names or embedded secrets.
['KALSHI-ACCESS-KEY','KALSHI-ACCESS-SIGNATURE','KALSHI-ACCESS-TIMESTAMP','apiSecret','privateKey'].forEach(token => {
  assert(!adminUiSource.includes(token), 'frontend credential token: '+token);
  assert(!playerUiSource.includes(token), 'player credential token: '+token);
});

// Player service still reads the refreshed server snapshot; provider registry never enters the player API.
const playerRepo = predictionMarketR2CreateMemoryRepository({markets:[refreshed.market]});
const playerEngine = predictionMarketR2CreateEngine({
  repository:playerRepo,providers:stored.predictionMarketReferenceProvidersR5CreateR2PriceProviders(),now:() => new Date()
});
const playerSvc = predictionMarketPlayerR4CreateService({engine:playerEngine,now:() => new Date()});
const detail = playerSvc.detail('player-one',{marketId:'external-1'});
assert.equal(detail.market.referenceYesPrice,0.61);
assert.equal(detail.market.referenceNoPrice,0.39);

console.log('PASS prediction_market_reference_providers_r5_tests');
