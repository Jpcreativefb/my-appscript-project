'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const engineApi = require('../backend/engines/PredictionMarketEngineR2.js');
const feeApi = require('../backend/engines/PredictionMarketTradingFeesR1.js');
const multiApi = require('../backend/engines/PredictionMarketMultiOutcomeR2.js');
Object.assign(global, engineApi, feeApi, multiApi);
const productApi = require('../backend/engines/PredictionMarketProductIntegrationR2.js');
Object.assign(global, productApi);
const draftEditApi = require('../backend/engines/PredictionMarketDraftGroupEditingR2.js');
const providerApi = require('../backend/providers/PredictionMarketProviderResolutionR2.js');
const adminApi = require('../backend/admin/AdminPredictionMarketsR3.js');
const communityApi = require('../backend/player/PredictionMarketCommunityR1.js');
const playerApi = require('../backend/player/PredictionMarketPlayerR4.js');

const NOW = '2026-10-19T20:00:00.000Z';
const LOCK = '2099-01-01T00:00:00.000Z';
const adminCtx = {role:'ADMIN',playerId:'admin',username:'admin'};
const playerCtx = {role:'PLAYER',playerId:'alice',username:'alice'};

feeApi.predictionMarketTradingFeesR1SetDefaultFeeBps_(100);
const base = engineApi.predictionMarketR2CreateMemoryRepository();
const repository = feeApi.predictionMarketTradingFeesR1DecorateRepository(base);
const engine = engineApi.predictionMarketR2CreateEngine({repository,now:()=>new Date(NOW)});
let detailByEvent = Object.create(null);
const providerState = Object.create(null);
const providerResolution = providerApi.predictionMarketProviderResolutionR2CreateService({
  engine, repository, nowIso:()=>NOW,
  fetchKalshi: market => ({market:Object.assign({status:'active',result:''},providerState[market.externalMarketId]||{})}),
  fetchPolymarket: () => { throw new Error('not used in lifecycle fixture'); }
});
const discoveryDetail = payload => JSON.parse(JSON.stringify(detailByEvent[payload.eventId]));
let idSeq = 0;
const product = productApi.predictionMarketProductR2CreateCoordinator({engine,repository,providerResolution,discoveryDetail,nowIso:()=>NOW,idFactory:p=>p+'-int-'+(++idSeq)});
const draftEditing = draftEditApi.predictionMarketDraftGroupR2CreateService({engine,discoveryDetail,idFactory:p=>p+'-edit-'+(++idSeq)});
const admin = adminApi.predictionMarketAdminR3CreateService({engine,repository,productCoordinator:product,providerResolution,draftGroupEditing:draftEditing,externalDetail:discoveryDetail});
const community = communityApi.predictionMarketCommunityR1CreateService({repository,now:()=>new Date(NOW)});
const player = playerApi.predictionMarketPlayerR4CreateService({engine,repository,productCoordinator:product,communityService:community,now:()=>new Date(NOW)});

function eventDetail(eventId, labels) {
  labels = labels || ['Actor A','Actor B','Actor C'];
  const probs = [0.45,0.35,0.20,0.10,0.05];
  const ids = labels.map((_,i)=>eventId+'-'+String.fromCharCode(65+i));
  return {
    provider:'kalshi', externalEventId:eventId, eventName:'Who will win Best Actor?', logicalQuestion:'Who will win Best Actor?',
    category:'Awards', status:'open', closeTime:LOCK, sourceUrl:'https://kalshi.com/events/'+eventId,
    sourceSnapshot:{eventName:'Who will win Best Actor?',question:'Who will win Best Actor?',closeTime:LOCK,status:'open',childMarketIds:ids.slice()},
    markets:labels.map((label,i)=>({
      provider:'kalshi', externalEventId:eventId, externalMarketId:ids[i], eventName:'Who will win Best Actor?',
      marketQuestion:label, category:'Awards', status:'open', closeTime:LOCK, referencePriceAsOf:NOW,
      outcomes:['Yes','No'], prices:{Yes:probs[i],No:1-probs[i]}, primaryProbability:probs[i],
      sourceUrl:'https://kalshi.com/markets/'+ids[i]
    }))
  };
}

function groupImport(eventId, labels) {
  const detail = eventDetail(eventId,labels);
  detailByEvent[eventId] = detail;
  return product.importExternalGroup('admin',{
    externalGroup:detail,
    logicalMarketId:eventId,
    logicalTitle:detail.logicalQuestion,
    logicalQuestion:detail.logicalQuestion,
    tradingFeeMode:'INHERIT',
    outcomeConfigs:detail.markets.map((row,i)=>({outcomeId:row.externalMarketId,outcomeLabel:(labels||['Actor A','Actor B','Actor C'])[i],selectedOutcome:'Yes'}))
  }).group;
}

const binary = admin.create('admin',{marketId:'binary-manual',title:'Binary manual?',referenceYesPrice:0.55,referenceNoPrice:0.45,referencePriceAsOf:NOW,providerKind:'MANUAL',lockTime:LOCK,tradingFeeMode:'INHERIT'});
assert.strictEqual(binary.market.status,'DRAFT');
assert.strictEqual(binary.market.tradingFeeBps,100);

const manualGroup = admin.create('admin',{
  marketType:'MULTI_OUTCOME',logicalMarketId:'manual-multi',logicalTitle:'Manual favorite?',logicalQuestion:'Manual favorite?',category:'Awards',referencePriceAsOf:NOW,referencePriceTrusted:true,providerKind:'MANUAL',lockTime:LOCK,tradingFeeMode:'INHERIT',
  outcomes:[{outcomeId:'a',outcomeLabel:'A',marketId:'manual-a',referenceProbability:0.5},{outcomeId:'b',outcomeLabel:'B',marketId:'manual-b',referenceProbability:0.3},{outcomeId:'c',outcomeLabel:'C',marketId:'manual-c',referenceProbability:0.2}]
}).group;
assert.strictEqual(manualGroup.status,'DRAFT');
assert.strictEqual(manualGroup.outcomes.length,3);
const editedManual = admin.edit('admin',{marketType:'MULTI_OUTCOME',logicalMarketId:'manual-multi',logicalTitle:'Manual favorite updated?',logicalQuestion:'Manual favorite updated?',category:'Awards',referencePriceAsOf:NOW,referencePriceTrusted:true,providerKind:'MANUAL',lockTime:LOCK,tradingFeeMode:'INHERIT',outcomes:[{outcomeId:'a',outcomeLabel:'A',referenceProbability:0.55},{outcomeId:'b',outcomeLabel:'B',referenceProbability:0.25},{outcomeId:'d',outcomeLabel:'D',referenceProbability:0.20}]}).group;
assert.strictEqual(editedManual.length,3);
assert.deepStrictEqual(editedManual.map(x=>multiApi.predictionMarketMultiOutcomeR2GetMetadata_(x).outcomeId),['a','b','d']);
assert.strictEqual(base.getMarket('manual-c').status,'VOID');
assert(base.getMarket('manual-c').providerMetadata.retiredFromMultiOutcomeR2);

const extGroup = groupImport('BEST-ACTOR',['Actor A','Actor B','Actor C']);
assert.strictEqual(extGroup.outcomes.length,3);
assert.strictEqual(extGroup.logicalQuestion,'Who will win Best Actor?');

const binaryImported = admin.importExternalDrafts('admin',{externalImportItems:[{market:{provider:'kalshi',externalEventId:'BIN-EVENT',externalMarketId:'BIN-MKT',eventName:'Binary event',marketQuestion:'Will it happen?',outcomes:['Yes','No'],prices:{Yes:60,No:40},referencePriceAsOf:NOW,closeTime:LOCK,sourceUrl:'https://kalshi.com/markets/BIN-MKT'},config:{category:'Integration'}}]});
assert.strictEqual(binaryImported.created,1);
assert.strictEqual(binaryImported.results[0].market.status,'DRAFT');
assert(extGroup.outcomes.every(o=>o.status==='DRAFT'));

extGroup.outcomes.forEach(o=>{providerState[o.externalMarketId]={status:'active',result:''};});
const draftOpenSync = product.syncProviderGroup('admin','BEST-ACTOR');
assert.strictEqual(draftOpenSync.group.status,'DRAFT');
assert.strictEqual(draftOpenSync.providerLifecycle,'OPEN');

const opened = admin.open('admin',{logicalMarketId:'BEST-ACTOR'}).group;
assert.strictEqual(opened.status,'OPEN');

engine.bootstrapWallet(playerCtx,'alice');
const winnerChild = product.getGroup('BEST-ACTOR').outcomes[2];
const refBefore = base.getMarket(winnerChild.marketId).referenceYesPrice;
engine.executeTrade(playerCtx,{transactionId:'group-buy-c',playerId:'alice',marketId:winnerChild.marketId,side:'BUY',outcome:'YES',quantity:10,referencePrice:0.01,expectedWalletVersion:0,requestedAt:NOW});
const committed = base.getTransaction('group-buy-c').committedResult;
assert.strictEqual(committed.feeCredits,Math.round((10*winnerChild.referenceProbability)*0.01*1000000)/1000000);

extGroup.outcomes.forEach(o=>{providerState[o.externalMarketId]={status:'closed',result:''};});
const closedSync = product.syncProviderGroup('admin','BEST-ACTOR');
assert.strictEqual(closedSync.group.status,'LOCKED');
assert(closedSync.group.outcomes.every(o=>o.status==='LOCKED'));

extGroup.outcomes.forEach((o,i)=>{providerState[o.externalMarketId]={status:'finalized',result:i===2?'yes':'no'};});
const finalSync = product.syncProviderGroup('admin','BEST-ACTOR');
assert.strictEqual(finalSync.group.status,'RESOLVED');
const resolvedByLabel = Object.fromEntries(finalSync.group.outcomes.map(o=>[o.outcomeLabel,base.getMarket(o.marketId).winningOutcome]));
assert.strictEqual(resolvedByLabel['Actor C'],'YES');
assert.strictEqual(resolvedByLabel['Actor A'],'NO');
assert.strictEqual(resolvedByLabel['Actor B'],'NO');
assert(finalSync.settlements.length>=1);

const settlementBefore = finalSync.settlements.map(s=>s.settlementKey).sort();
const repeatFinal = product.syncProviderGroup('admin','BEST-ACTOR');
assert.strictEqual(repeatFinal.completed,true);
assert.deepStrictEqual(repeatFinal.settlements,[]);
assert.strictEqual(product.getGroup('BEST-ACTOR').status,'RESOLVED');
assert(settlementBefore.length>=1);

const ambiguous = groupImport('AMBIG',['One','Two','Three']);
admin.open('admin',{logicalMarketId:'AMBIG'});
ambiguous.outcomes.forEach((o,i)=>{providerState[o.externalMarketId]={status:'finalized',result:i<2?'yes':'no'};});
const ambiguousSync = product.syncProviderGroup('admin','AMBIG');
assert.strictEqual(ambiguousSync.reviewRequired,true);
assert.strictEqual(ambiguousSync.providerLifecycle,'REVIEW_REQUIRED');
assert.strictEqual(ambiguousSync.group.status,'LOCKED');
assert.deepStrictEqual(ambiguousSync.settlements,[]);

const refreshGroup = groupImport('REFRESH',['Red','Blue','Green']);
detailByEvent.REFRESH = eventDetail('REFRESH',['Red','Blue','Green','Gold']);
const refreshReview = product.refreshGroupSource('admin','REFRESH');
assert.deepStrictEqual(refreshReview.diff.addedOutcomeIds,['REFRESH-D']);
assert.strictEqual(refreshReview.canApply,true);
assert.strictEqual(refreshReview.reviewRequired,false);
const appliedSource = draftEditing.applyProviderSource('admin','REFRESH');
assert.strictEqual(appliedSource.group.length,4);

admin.open('admin',{logicalMarketId:'REFRESH'});
const beforeOpenIds = product.getGroup('REFRESH').outcomes.map(o=>o.externalMarketId);
detailByEvent.REFRESH = eventDetail('REFRESH',['Red','Blue','Green','Gold','Silver']);
const openReview = product.refreshGroupSource('admin','REFRESH');
assert.strictEqual(openReview.reviewRequired,true);
assert.strictEqual(openReview.reviewReason,'OPEN_EXTERNAL_SOURCE_CHANGED');
assert.deepStrictEqual(product.getGroup('REFRESH').outcomes.map(o=>o.externalMarketId),beforeOpenIds);
assert.throws(()=>draftEditing.applyProviderSource('admin','REFRESH'),/Only DRAFT/);

const playerState = player.state('alice');
const playerGroup = playerState.marketGroups.find(g=>g.logicalMarketId==='BEST-ACTOR');
assert(playerGroup);
assert.strictEqual(playerGroup.outcomes.length,3);
assert(playerGroup.outcomes.every(o=>typeof o.referenceProbability==='number'));

const groupedPortfolio = playerState.groupedPortfolio.find(g=>g.logicalMarketId==='BEST-ACTOR');
assert(groupedPortfolio);
assert(groupedPortfolio.outcomes.some(o=>o.outcomeLabel==='Actor C'&&Number(o.quantity)===10));

const groupedCommunity = product.groupedCommunity('BEST-ACTOR');
assert.strictEqual(groupedCommunity.participatingPlayers,1);
assert(groupedCommunity.outcomes.find(o=>o.outcomeLabel==='Actor C').shareQuantity===10);
assert(groupedCommunity.tradingVolumeCredits>0);

assert.strictEqual(base.getMarket(winnerChild.marketId).referenceYesPrice,refBefore);
const viewerSource = read('frontend/js/pages/predictionMarketsR4.js');
assert(viewerSource.includes('External Market Probability'));
assert(viewerSource.includes('PATTC Community'));
assert(viewerSource.includes('PATTC trades never populate this reference history'));

assert(committed.feeCredits>0);
assert.strictEqual(committed.netCredits,committed.grossCredits+committed.feeCredits);
assert.strictEqual(playerGroup.outcomes[2].tradingFeeBps,100);
assert(!viewerSource.includes('predictionMarketR4FeeEstimate_'));

engine.createMarket(adminCtx,{marketId:'void-fee',title:'Void fee',referenceYesPrice:0.5,referenceNoPrice:0.5,referencePriceAsOf:NOW,referencePriceTrusted:true,providerKind:'MANUAL',lockTime:LOCK});
engine.openMarket(adminCtx,'void-fee');
const walletBeforeVoidTrade=base.getWallet('alice');
engine.executeTrade(playerCtx,{transactionId:'void-fee-buy',playerId:'alice',marketId:'void-fee',side:'BUY',outcome:'YES',quantity:2,referencePrice:0.5,expectedWalletVersion:walletBeforeVoidTrade.version,requestedAt:NOW});
const chargedVoidFee=base.getTransaction('void-fee-buy').committedResult.feeCredits;
engine.voidMarket(adminCtx,'void-fee');
engine.settlePlayerMarket(adminCtx,'void-fee','alice');
assert.strictEqual(base.getSettlement('void-fee:alice').committedResult.returnedTradingFeeCredits,chargedVoidFee);

assert.deepStrictEqual(Object.keys(engineApi.PREDICTION_MARKET_R2_SHEETS).sort(),['markets','positions','settlements','transactions','wallets']);
assert.strictEqual(Object.keys(engineApi.PREDICTION_MARKET_R2_SHEETS).length,5);
assert.deepStrictEqual(Object.fromEntries(Object.entries(engineApi.PREDICTION_MARKET_R2_HEADERS).map(([k,v])=>[k,v.length])),{markets:25,wallets:8,transactions:15,positions:12,settlements:13});
assert.deepStrictEqual(engineApi.PREDICTION_MARKET_R2_HEADERS.markets.slice(0,5),['MarketId','Title','Description','Category','Status']);
assert.strictEqual(engineApi.PREDICTION_MARKET_R2_HEADERS.settlements[0],'SettlementKey');
assert.strictEqual(engineApi.PREDICTION_MARKET_R2_HEADERS.settlements.at(-1),'CommittedResultJson');

['backend/engines/PredictionMarketProductIntegrationR2.js','backend/engines/PredictionMarketDraftGroupEditingR2.js','backend/admin/AdminPredictionMarketsR3.js','backend/player/PredictionMarketPlayerR4.js'].forEach(file=>assert(!/\bsetup\s*\(/.test(read(file)),file+' must not invoke setup'));
const adminFrontend = read('frontend/js/pages/adminPredictionMarketsR3.js');
assert(!/SpreadsheetApp|PredictionMarketMarkets|PredictionMarketWallets|PredictionMarketTransactions|PredictionMarketPositions|PredictionMarketSettlements/.test(adminFrontend));
assert(!/SpreadsheetApp|PredictionMarketMarkets|PredictionMarketWallets|PredictionMarketTransactions|PredictionMarketPositions|PredictionMarketSettlements/.test(viewerSource));
const providerSource = read('backend/providers/PredictionMarketProviderResolutionR2.js');
const productSource = read('backend/engines/PredictionMarketProductIntegrationR2.js');
const editSource = read('backend/engines/PredictionMarketDraftGroupEditingR2.js');
const adminSource = read('backend/admin/AdminPredictionMarketsR3.js');
assert(!/UrlFetchApp/.test(productSource+editSource+adminSource));
assert(!/UrlFetchApp/.test(providerSource));
assert(providerSource.includes('awardsManagerFetchJson_'));

console.log('PASS prediction_market_r2_product_integration_tests');
