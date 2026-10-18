const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const {
  PREDICTION_MARKET_R2_SHEETS,
  PREDICTION_MARKET_R2_HEADERS,
  predictionMarketR2CreateMemoryRepository,
  predictionMarketR2CreateEngine
} = require('../backend/engines/PredictionMarketEngineR2.js');
const { predictionMarketAdminR3CreateService } = require('../backend/admin/AdminPredictionMarketsR3.js');
const { predictionMarketPlayerR4CreateService } = require('../backend/player/PredictionMarketPlayerR4.js');
const providers = require('../backend/providers/PredictionMarketReferenceProvidersR5.js');
const storedProviders = require('../backend/providers/PredictionMarketStoredPriceProvidersR5.js');

const contractsSource = read('backend/engines/PredictionMarketContracts.js');
const gamesSource = read('backend/engines/GamesEngine.js');
const bettingSource = read('backend/engines/BettingEngine.js');
const sportsWagerSource = read('backend/engines/SportsWagerEngine.js');
const engineSource = read('backend/engines/PredictionMarketEngineR2.js');
const adminServiceSource = read('backend/admin/AdminPredictionMarketsR3.js');
const playerServiceSource = read('backend/player/PredictionMarketPlayerR4.js');
const providerSource = read('backend/providers/PredictionMarketReferenceProvidersR5.js');
const apiSource = read('backend/Api.js');
const securitySource = read('backend/core/ApiSecurity.js');
const appSource = read('frontend/js/app.js');
const adminUiSource = read('frontend/js/pages/adminPredictionMarketsR3.js');
const playerUiSource = read('frontend/js/pages/predictionMarketsR4.js');
const gameBuilderShellSource = read('frontend/js/adminGameBuilderNavigationShellR2.js');

// Combined R1-R5 product isolation and static release contract.
const canonical = ['prediction','head-to-head','staked-prediction','wager','racing-wager','voting','ranking','mixed'];
canonical.forEach(type => assert(gameBuilderShellSource.includes('"' + type + '"'), 'missing canonical General/Custom type: ' + type));
assert(!gameBuilderShellSource.includes('"prediction-market"'));
assert(!/id:\s*["']prediction-market["']/.test(gamesSource));
assert(contractsSource.includes('prediction-market'));
assert(contractsSource.includes('DRAFT') && contractsSource.includes('OPEN') && contractsSource.includes('LOCKED') && contractsSource.includes('RESOLVED') && contractsSource.includes('VOID'));
assert(contractsSource.includes('YES') && contractsSource.includes('NO'));
assert(appSource.includes('"admin-prediction-markets"'));
assert(appSource.includes('"prediction-markets"'));
assert(!adminUiSource.includes('SportsWagerEngine'));
assert(!playerUiSource.includes('SportsWagerEngine'));
assert(!adminUiSource.includes('BettingEngine'));
assert(!playerUiSource.includes('BettingEngine'));
assert(sportsWagerSource.includes('SPORTS WAGER ENGINE'));
assert(bettingSource.includes('Betting'));
assert(engineSource.includes('defaultBootstrapCredits: 1000'));
assert(engineSource.includes('settlePlayerMarket'));
assert(engineSource.includes('assertAdmin(context)'));
assert(engineSource.includes('executionReferencePrice'));
assert(providerSource.includes('MANUAL'));
assert(providerSource.includes('liveExternalProvidersEnabled'));

const BASE_NOW = Date.parse('2026-10-18T12:00:00.000Z');
function makeStack(seed, nowRef) {
  const repo = predictionMarketR2CreateMemoryRepository(seed || {});
  const engine = predictionMarketR2CreateEngine({
    repository: repo,
    providers: storedProviders.predictionMarketReferenceProvidersR5CreateR2PriceProviders(),
    now: () => new Date(nowRef.value)
  });
  return {
    repo,
    engine,
    admin: predictionMarketAdminR3CreateService({ engine }),
    player: predictionMarketPlayerR4CreateService({ engine, now: () => new Date(nowRef.value) })
  };
}

// Full MANUAL player lifecycle.
const nowRef = { value: BASE_NOW };
const stack = makeStack({}, nowRef);
const adminCtx = { role:'ADMIN', playerId:'director', username:'director' };
stack.admin.create('director', {
  marketId:'r6-manual', title:'Will R6 pass?', description:'R6 end-to-end market', category:'Validation',
  yesLabel:'YES', noLabel:'NO', referenceYesPrice:0.5, referenceNoPrice:0.5,
  referencePriceAsOf:new Date(nowRef.value).toISOString(), referencePriceTrusted:true,
  providerKind:'MANUAL', providerMetadata:'{}', openTime:new Date(nowRef.value).toISOString(),
  lockTime:new Date(nowRef.value + 60*60*1000).toISOString()
});
let market = stack.engine.getMarkets()[0];
assert.equal(market.status, 'DRAFT');
stack.admin.price('director', { marketId:'r6-manual', referenceYesPrice:0.6, referenceNoPrice:0.4, referencePriceAsOf:new Date(nowRef.value).toISOString() });
market = stack.admin.open('director', {marketId:'r6-manual'}).market;
assert.equal(market.status, 'OPEN');

let state = stack.player.state('player-one');
assert.equal(state.wallet.availableCredits, 1000);
assert.equal(state.wallet.version, 0);

let trade = stack.player.trade('player-one', {
  transactionId:'r6-tx-buy-yes', marketId:'r6-manual', side:'BUY', outcome:'YES', quantity:10,
  referencePrice:0.6, expectedWalletVersion:0, requestedAt:new Date(nowRef.value).toISOString()
});
assert.equal(trade.trade.executionReferencePrice, 0.6);
assert.equal(trade.trade.wallet.availableCredits, 994);

trade = stack.player.trade('player-one', {
  transactionId:'r6-tx-buy-no', marketId:'r6-manual', side:'BUY', outcome:'NO', quantity:5,
  referencePrice:0.4, expectedWalletVersion:1, requestedAt:new Date(nowRef.value).toISOString()
});
assert.equal(trade.trade.executionReferencePrice, 0.4);
assert.equal(trade.trade.wallet.availableCredits, 992);

let portfolio = stack.engine.getPortfolio({role:'PLAYER',playerId:'player-one'}, 'player-one');
let openPositions = portfolio.positions.filter(p => !p.settled && p.quantity > 0);
assert.equal(openPositions.length, 2);
assert(openPositions.some(p => p.outcome === 'YES' && p.quantity === 10 && p.costBasisCredits === 6));
assert(openPositions.some(p => p.outcome === 'NO' && p.quantity === 5 && p.costBasisCredits === 2));

trade = stack.player.trade('player-one', {
  transactionId:'r6-tx-sell-yes', marketId:'r6-manual', side:'SELL', outcome:'YES', quantity:4,
  referencePrice:0.6, expectedWalletVersion:2, requestedAt:new Date(nowRef.value).toISOString()
});
assert.equal(trade.trade.wallet.availableCredits, 994.4);
assert.equal(trade.trade.position.quantity, 6);
assert.equal(trade.trade.position.costBasisCredits, 3.6);
portfolio = stack.engine.getPortfolio({role:'PLAYER',playerId:'player-one'}, 'player-one');
assert.equal(portfolio.availableCredits, 994.4);
assert.equal(portfolio.currentMarkedPositionValueCredits, 5.6);
assert.equal(portfolio.portfolioValueCredits, 1000);

const acceptedPriceBeforeLock = stack.engine.getMarkets()[0].referenceYesPrice;
stack.admin.lock('director', {marketId:'r6-manual'});
assert.throws(() => stack.player.trade('player-one', {
  transactionId:'r6-tx-after-lock', marketId:'r6-manual', side:'BUY', outcome:'YES', quantity:1,
  referencePrice:0.6, expectedWalletVersion:3, requestedAt:new Date(nowRef.value).toISOString()
}), /not OPEN|lockTime/);
assert.equal(stack.engine.getMarkets()[0].referenceYesPrice, acceptedPriceBeforeLock, 'player trade must not move reference price');

stack.admin.resolve('director', {marketId:'r6-manual', winningOutcome:'YES'});
const settlement = stack.engine.settlePlayerMarket(adminCtx, 'r6-manual', 'player-one');
assert.equal(settlement.payoutCredits, 6);
assert.equal(settlement.wallet.availableCredits, 1000.4);
portfolio = stack.engine.getPortfolio({role:'PLAYER',playerId:'player-one'}, 'player-one');
assert.equal(portfolio.portfolioValueCredits, 1000.4);
assert.equal(portfolio.currentMarkedPositionValueCredits, 0);
assert.equal(portfolio.realizedGainLossCredits, 0.4);
assert(portfolio.positions.every(p => p.settled === true));
const settlementReplay = stack.engine.settlePlayerMarket(adminCtx, 'r6-manual', 'player-one');
assert.deepEqual(settlementReplay, settlement);
assert.throws(() => stack.engine.openMarket(adminCtx, 'r6-manual'), /Invalid prediction market transition/);
assert.throws(() => stack.engine.settlePlayerMarket({role:'PLAYER',playerId:'player-one'}, 'r6-manual', 'player-one'), /Admin\/system authorization required/);

// VOID settlement returns remaining cost basis exactly once.
const voidNow = { value: BASE_NOW };
const voidStack = makeStack({}, voidNow);
voidStack.admin.create('director', {
  marketId:'r6-void', title:'Void scenario', referenceYesPrice:0.7, referenceNoPrice:0.3,
  referencePriceAsOf:new Date(voidNow.value).toISOString(), referencePriceTrusted:true, providerKind:'MANUAL', providerMetadata:'{}',
  lockTime:new Date(voidNow.value + 60*60*1000).toISOString()
});
voidStack.admin.price('director',{marketId:'r6-void',referenceYesPrice:0.7,referenceNoPrice:0.3,referencePriceAsOf:new Date(voidNow.value).toISOString()});
voidStack.admin.open('director',{marketId:'r6-void'});
voidStack.player.state('void-player');
voidStack.player.trade('void-player',{transactionId:'void-yes',marketId:'r6-void',side:'BUY',outcome:'YES',quantity:10,referencePrice:0.7,expectedWalletVersion:0});
voidStack.player.trade('void-player',{transactionId:'void-no',marketId:'r6-void',side:'BUY',outcome:'NO',quantity:5,referencePrice:0.3,expectedWalletVersion:1});
assert.equal(voidStack.engine.getWallet({role:'PLAYER',playerId:'void-player'},'void-player').availableCredits, 991.5);
voidStack.admin.voidMarket('director',{marketId:'r6-void'});
const voidSettlement = voidStack.engine.settlePlayerMarket(adminCtx,'r6-void','void-player');
assert.equal(voidSettlement.returnedCostBasisCredits, 8.5);
assert.equal(voidSettlement.wallet.availableCredits, 1000);
assert.deepEqual(voidStack.engine.settlePlayerMarket(adminCtx,'r6-void','void-player'), voidSettlement);

// External-source snapshot scenario: mocked Kalshi mapping -> Admin refresh -> stored price -> player only sees stored snapshot.
const extNow = { value: BASE_NOW };
const extRepo = predictionMarketR2CreateMemoryRepository();
const extEngine = predictionMarketR2CreateEngine({
  repository: extRepo,
  providers: storedProviders.predictionMarketReferenceProvidersR5CreateR2PriceProviders(),
  now: () => new Date(extNow.value)
});
const goodRegistry = providers.predictionMarketReferenceProvidersR5CreateRegistry({
  nowMs: extNow.value,
  maxAgeMs: 15*60*1000,
  kalshiTransport: () => ({status:200, body:{market:{ticker:'KXR6',event_ticker:'KXR6E',last_price_dollars:'0.65',updated_time:'2026-10-18T11:59:00Z',status:'open'}}})
});
const extAdmin = predictionMarketAdminR3CreateService({engine:extEngine,providerRegistry:goodRegistry});
extAdmin.create('director', {
  marketId:'r6-external', title:'External snapshot?', referenceYesPrice:0.5, referenceNoPrice:0.5,
  referencePriceAsOf:'2026-10-18T11:58:00Z', referencePriceTrusted:true, providerKind:'KALSHI', providerId:'kalshi-public',
  externalMarketId:'KXR6', sourceUrl:'https://kalshi.com/markets/KXR6', providerMetadata:'{}', lockTime:'2026-10-18T13:00:00Z'
});
const refreshed = extAdmin.refreshReference('director',{marketId:'r6-external'});
assert.equal(refreshed.success,true);
assert.equal(refreshed.market.referenceYesPrice,0.65);
assert.equal(refreshed.market.referenceNoPrice,0.35);
assert.equal(refreshed.market.providerKind,'KALSHI');
extAdmin.open('director',{marketId:'r6-external'});
const extPlayer = predictionMarketPlayerR4CreateService({engine:extEngine,now:()=>new Date(extNow.value)});
let extState = extPlayer.state('external-player');
const storedMarket = extState.markets.find(m => m.marketId === 'r6-external');
assert.equal(storedMarket.referenceYesPrice,0.65);
assert.equal(storedMarket.referenceNoPrice,0.35);
const extTrade = extPlayer.trade('external-player',{transactionId:'ext-buy',marketId:'r6-external',side:'BUY',outcome:'YES',quantity:10,referencePrice:0.01,expectedWalletVersion:0});
assert.equal(extTrade.trade.executionReferencePrice,0.65, 'server stored price must override proposed client price');
assert.equal(extEngine.getMarkets().find(m=>m.marketId==='r6-external').referenceYesPrice,0.65);

const beforeFailure = extEngine.getMarkets().find(m=>m.marketId==='r6-external');
let failingAdmin = predictionMarketAdminR3CreateService({engine:extEngine,providerRegistry:{fetchReference:()=>({success:false,providerStatus:'PROVIDER_ERROR',message:'simulated upstream failure'})}});
const failResult = failingAdmin.refreshReference('director',{marketId:'r6-external'});
assert.equal(failResult.success,false);
let afterFailure = extEngine.getMarkets().find(m=>m.marketId==='r6-external');
assert.equal(afterFailure.referenceYesPrice,beforeFailure.referenceYesPrice);
assert.equal(afterFailure.referencePriceAsOf,beforeFailure.referencePriceAsOf);

failingAdmin = predictionMarketAdminR3CreateService({engine:extEngine,providerRegistry:{fetchReference:()=>({success:true,snapshot:{
  providerKind:'KALSHI',providerId:'kalshi-public',externalMarketId:'KXR6',referenceYesPrice:0.8,referenceNoPrice:0.2,
  referencePriceAsOf:'2026-10-18T10:00:00Z',trusted:true,sourceUrl:'https://example.invalid',providerMetadata:{}
}})}});
const staleResult = failingAdmin.refreshReference('director',{marketId:'r6-external'});
assert.equal(staleResult.success,false);
assert.equal(staleResult.providerStatus,'STALE');
afterFailure = extEngine.getMarkets().find(m=>m.marketId==='r6-external');
assert.equal(afterFailure.referenceYesPrice,0.65);
assert(!playerServiceSource.includes('predictionMarketReferenceProvidersR5CreateRegistry'));
assert(!playerUiSource.includes('adminRefreshPredictionMarketReference'));

// Security/readiness assertions.
assert(securitySource.includes('payload.username = sessionUsername'));
assert(apiSource.includes('executePredictionMarketTrade'));
assert(apiSource.includes('adminRefreshPredictionMarketReference'));
assert(adminServiceSource.includes('predictionMarketAdminR3Context_'));
assert(!playerServiceSource.includes('settlePlayerMarket('));
assert(!playerServiceSource.includes('openMarket('));
assert(!playerServiceSource.includes('lockMarket('));
assert(!playerServiceSource.includes('resolveMarket('));
assert(!playerServiceSource.includes('voidMarket('));
['SpreadsheetApp','PredictionMarketWallets','PredictionMarketTransactions','PredictionMarketPositions','PredictionMarketSettlements','saveWallet','savePosition','commitTrade','commitSettlement'].forEach(token => {
  assert(!playerUiSource.includes(token), 'player browser must not own raw storage: '+token);
  assert(!adminUiSource.includes(token), 'admin browser must not own raw storage: '+token);
});
['KALSHI-ACCESS-KEY','KALSHI-ACCESS-SIGNATURE','apiSecret','privateKey'].forEach(token => {
  assert(!adminUiSource.includes(token));
  assert(!playerUiSource.includes(token));
});
assert(securitySource.includes('executePredictionMarketTrade'));

// Storage readiness contract must stay isolated and explicit.
assert.deepEqual(PREDICTION_MARKET_R2_SHEETS, {
  markets:'PredictionMarketMarkets', wallets:'PredictionMarketWallets', transactions:'PredictionMarketTransactions',
  positions:'PredictionMarketPositions', settlements:'PredictionMarketSettlements'
});
assert.equal(Object.keys(PREDICTION_MARKET_R2_HEADERS).length,5);
Object.values(PREDICTION_MARKET_R2_HEADERS).forEach(headers => assert(Array.isArray(headers) && headers.length > 0));
assert(engineSource.includes('function setup(context) { assertAdmin(context); return repository.setup(); }'));

console.log('PASS prediction_market_release_validation_r6_tests');
