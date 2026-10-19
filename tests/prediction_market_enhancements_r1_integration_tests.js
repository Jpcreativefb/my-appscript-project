'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const engineApi = require('../backend/engines/PredictionMarketEngineR2.js');
const feeApi = require('../backend/engines/PredictionMarketTradingFeesR1.js');
Object.keys(feeApi).forEach(key => { global[key] = feeApi[key]; });
const adminApi = require('../backend/admin/AdminPredictionMarketsR3.js');
const communityApi = require('../backend/player/PredictionMarketCommunityR1.js');
const viewer = require('../frontend/js/pages/predictionMarketsR4.js');

const NOW = '2026-10-19T12:00:00.000Z';
const LATER = '2026-10-20T12:00:00.000Z';

function externalItem(eventId, marketId, config) {
  return {
    market: {
      provider:'kalshi', externalEventId:eventId, externalMarketId:marketId,
      eventName:'Integration Event', marketQuestion:'Will integration pass?',
      outcomes:['Yes','No'], prices:{Yes:60,No:40}, referencePriceAsOf:NOW,
      closeTime:LATER, sourceUrl:'https://example.com/'+marketId, raw:{ticker:marketId}
    },
    config: Object.assign({category:'Integration'}, config || {})
  };
}

// External import + fee model: imported Drafts inherit the global/default fee unless explicitly overridden.
feeApi.predictionMarketTradingFeesR1SetDefaultFeeBps_(125);
let adminMarkets = [];
const adminEngine = {
  getMarkets(){ return adminMarkets.slice(); },
  createMarket(ctx,input){ const row=Object.assign({}, input, {status:'DRAFT'}); adminMarkets.push(row); return row; },
  editDraftMarket(ctx,id,patch){ const row=adminMarkets.find(m=>m.marketId===id); Object.assign(row,patch); return row; },
  setManualPrice(){ throw new Error('not used'); }, setReferencePrice(){ throw new Error('not used'); },
  openMarket(){ throw new Error('not used'); }, lockMarket(){ throw new Error('not used'); },
  resolveMarket(){ throw new Error('not used'); }, voidMarket(){ throw new Error('not used'); },
  validatePriceState(){ return true; }
};
const admin = adminApi.predictionMarketAdminR3CreateService({engine:adminEngine});
let imported = admin.importExternalDrafts('admin',{externalImportItems:[externalItem('EV-DEFAULT','MK-DEFAULT')]});
assert.strictEqual(imported.created,1);
assert.strictEqual(imported.results[0].market.status,'DRAFT','external import must not auto-open');
assert.strictEqual(imported.results[0].market.tradingFeeSource,'DEFAULT');
assert.strictEqual(imported.results[0].market.tradingFeeBps,125,'imported Draft must inherit global/default PM fee');
assert.strictEqual(imported.results[0].market.providerMetadata.tradingFeeMode,'INHERIT');

imported = admin.importExternalDrafts('admin',{externalImportItems:[externalItem('EV-CUSTOM','MK-CUSTOM',{tradingFeeMode:'CUSTOM',tradingFeeBps:50})]});
assert.strictEqual(imported.created,1);
assert.strictEqual(imported.results[0].market.tradingFeeSource,'MARKET');
assert.strictEqual(imported.results[0].market.tradingFeeBps,50,'imported Draft custom fee must override default');
assert.strictEqual(imported.results[0].market.providerMetadata.tradingFeeMode,'CUSTOM');
assert.strictEqual(imported.results[0].market.providerMetadata.tradingFeeBps,50);

const duplicate = admin.importExternalDrafts('admin',{externalImportItems:[externalItem('EV-DEFAULT','MK-DEFAULT')]});
assert.strictEqual(duplicate.created,0);
assert.strictEqual(duplicate.results[0].status,'DUPLICATE','duplicate external import must remain blocked');

const manual = admin.create('admin',{
  marketId:'manual-integration',title:'Manual integration',referenceYesPrice:0.55,referenceNoPrice:0.45,
  referencePriceAsOf:NOW,providerKind:'MANUAL',lockTime:LATER,tradingFeeMode:'INHERIT'
});
assert.strictEqual(manual.success,true,'manual PM Draft creation must remain intact');
assert.strictEqual(manual.market.status,'DRAFT');
assert.strictEqual(manual.market.tradingFeeBps,125);

// Fee + Community + reference-price authority: community uses gross transaction credits; fees stay separate; PATTC trades never move reference price.
feeApi.predictionMarketTradingFeesR1SetDefaultFeeBps_(100);
const base = engineApi.predictionMarketR2CreateMemoryRepository();
const repository = feeApi.predictionMarketTradingFeesR1DecorateRepository(base);
let nowMs = Date.parse(NOW);
const engine = engineApi.predictionMarketR2CreateEngine({repository, now:()=>new Date(nowMs)});
const ctxAdmin = {role:'ADMIN',playerId:'admin',username:'admin'};
const ctxPlayer = {role:'PLAYER',playerId:'alice',username:'alice'};
engine.createMarket(ctxAdmin,{
  marketId:'combo',title:'Combo',description:'',category:'Integration',
  referenceYesPrice:0.6,referenceNoPrice:0.4,referencePriceAsOf:NOW,referencePriceTrusted:true,
  providerKind:'MANUAL',providerId:'',externalMarketId:'',sourceUrl:'',providerMetadata:{},
  lockTime:LATER
});
engine.openMarket(ctxAdmin,'combo');
engine.bootstrapWallet(ctxPlayer,'alice');
const referenceBefore = engine.getMarkets().find(m=>m.marketId==='combo').referenceYesPrice;
const trade = engine.executeTrade(ctxPlayer,{
  transactionId:'combo-buy',playerId:'alice',marketId:'combo',side:'BUY',outcome:'YES',quantity:10,
  referencePrice:0.01,expectedWalletVersion:0,requestedAt:NOW
});
assert.strictEqual(trade.grossCredits,6);
const committedTrade = base.getTransaction('combo-buy').committedResult;
assert.strictEqual(committedTrade.grossCredits,6);
assert.strictEqual(committedTrade.feeCredits,0.06);
assert.strictEqual(committedTrade.netCredits,6.06);
const referenceAfter = engine.getMarkets().find(m=>m.marketId==='combo').referenceYesPrice;
assert.strictEqual(referenceAfter,referenceBefore,'PATTC trades must not move external/reference price');
const community = communityApi.predictionMarketCommunityR1CreateService({repository,now:()=>new Date(nowMs)}).market('combo');
assert.strictEqual(community.tradeCount,1);
assert.strictEqual(community.tradingVolumeCredits,6,'community volume must use gross trade credits, not fee-inclusive net credits');
assert.strictEqual(community.buyVolumeCredits,6);
assert.strictEqual(community.yesShareQuantity,10);

// VOID still refunds the trading fee after the community/repository integration.
const voided = base.getMarket('combo');
voided.status='VOID'; voided.voided=true; voided.resolutionStatus='VOID'; base.saveMarket(voided);
engine.settlePlayerMarket(ctxAdmin,'combo','alice');
const savedSettlement = base.getSettlement('combo:alice');
assert.strictEqual(savedSettlement.committedResult.returnedTradingFeeCredits,0.06,'VOID must refund trading fees after integration');
assert.strictEqual(base.getWallet('alice').availableCredits,1000);

// Viewer keeps authoritative fee fields and presents external probability separately from PATTC Community.
const viewerSource = read('frontend/js/pages/predictionMarketsR4.js');
const adminSource = read('backend/admin/AdminPredictionMarketsR3.js');
const adminPageSource = read('frontend/js/pages/adminPredictionMarketsR3.js');
const storeSource = read('backend/engines/PredictionMarketStoreR2.js');
const engineSource = read('backend/engines/PredictionMarketEngineR2.js');
assert(viewerSource.includes('External Market Probability'));
assert(viewerSource.includes('PATTC Community'));
assert(viewerSource.includes('PATTC Positioning'));
assert(viewerSource.includes('Final accepted server reference price and fee calculation are authoritative'));
assert(!viewerSource.includes('predictionMarketR4FeeEstimate_'),'viewer must not restore client-side fee calculation');
assert.strictEqual(viewer.predictionMarketR4TradePreview_(10,0.6,'BUY',{}).tradingFeeCredits,null);
assert.strictEqual(viewer.predictionMarketR4TradePreview_(10,0.6,'BUY',{tradingFeeCredits:0.06,totalCostCredits:6.06}).tradingFeeCredits,0.06);

// Architecture/integrity guards: five PM stores, no setup invocation, no frontend direct sheet writes.
const sheetsBlock = engineSource.match(/var PREDICTION_MARKET_R2_SHEETS = Object\.freeze\(\{[\s\S]*?\}\);/)[0];
assert.strictEqual((sheetsBlock.match(/PredictionMarket/g)||[]).length,5,'integration must not add a sixth Prediction Market store');
assert(!sheetsBlock.includes('Community'));
assert(!/\.setup\s*\(/.test(adminSource),'Admin integration must not invoke PM setup');
assert(!/\.setup\s*\(/.test(viewerSource),'Viewer must not invoke setup');
assert(!adminPageSource.includes('SpreadsheetApp'),'Admin frontend must not write Sheets directly');
assert(!viewerSource.includes('SpreadsheetApp'),'Player frontend must not write Sheets directly');
assert(storeSource.includes('listTransactions:listTransactions'));
assert(storeSource.includes('listPositions:listPositions'));

console.log('PASS prediction_market_enhancements_r1_integration_tests');
