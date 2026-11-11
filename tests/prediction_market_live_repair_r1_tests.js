/* PATTC Prediction Markets Release Repair R1: isolated in-memory regression fixtures.
   Run: node tests/prediction_market_live_repair_r1_tests.js
   Never connects to Apps Script or production Sheets. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {predictionMarketR2CreateMemoryRepository,predictionMarketR2CreateEngine} =
  require('../backend/engines/PredictionMarketEngineR2.js');
const {predictionMarketAdminR3CreateService} = require('../backend/admin/AdminPredictionMarketsR3.js');
const {predictionMarketReferenceProvidersR5CreateR2PriceProviders} =
  require('../backend/providers/PredictionMarketStoredPriceProvidersR5.js');
const now = Date.now(), iso = offset => new Date(now + offset).toISOString();
const repo = predictionMarketR2CreateMemoryRepository();
const engine = predictionMarketR2CreateEngine({repository:repo,providers:predictionMarketReferenceProvidersR5CreateR2PriceProviders()});
const admin = predictionMarketAdminR3CreateService({engine});
let passed=0;
function test(name,fn){fn();passed+=1;console.log('PASS '+name);}
function row(id,asOf,lock){return {market:{provider:'kalshi',externalEventId:'test-event',externalMarketId:id,outcomes:['Yes','No'],prices:{Yes:0.6,No:0.4},referencePriceAsOf:asOf,closeTime:lock,marketQuestion:'Test market?'}};}
function importOne(id,asOf,lock){const result=admin.importExternalDrafts('director',{externalImportItems:[row(id,asOf,lock)]});assert.equal(result.created,1);return result.results[0].market;}
const valid=importOne('valid',iso(-60000),iso(3600000));
test('external import starts DRAFT',()=>assert.equal(valid.status,'DRAFT'));
test('valid Draft readiness from backend',()=>assert.equal(admin.list('director').markets.find(x=>x.marketId===valid.marketId).openReadiness.ready,true));
test('valid Draft opens and persists',()=>{assert.equal(admin.open('director',{marketId:valid.marketId}).market.status,'OPEN');assert.equal(engine.getMarkets().find(x=>x.marketId===valid.marketId).status,'OPEN');});
test('duplicate import rejected without second market',()=>{const r=admin.importExternalDrafts('director',{externalImportItems:[row('valid',iso(-60000),iso(3600000))]});assert.equal(r.created,0);assert.equal(r.results[0].status,'DUPLICATE');});
const absent=importOne('missing-time','',iso(3600000));
test('missing timestamp imports untrusted Draft',()=>assert.equal(absent.referencePriceTrusted,false));
test('missing timestamp rejects Open and remains Draft',()=>{assert.throws(()=>admin.open('director',{marketId:absent.marketId}),/not trusted/);assert.equal(engine.getMarkets().find(x=>x.marketId===absent.marketId).status,'DRAFT');});
test('missing timestamp surfaced by backend readiness',()=>assert.equal(admin.list('director').markets.find(x=>x.marketId===absent.marketId).openReadiness.ready,false));
const stale=importOne('stale',iso(-172800000),iso(3600000));
test('stale reference rejects Open and remains Draft',()=>{assert.throws(()=>admin.open('director',{marketId:stale.marketId}),/stale/);assert.equal(engine.getMarkets().find(x=>x.marketId===stale.marketId).status,'DRAFT');});
test('stale reference surfaced by backend readiness',()=>assert(admin.list('director').markets.find(x=>x.marketId===stale.marketId).openReadiness.reasons.some(s=>s.includes('stale'))));
const oldlock=importOne('expired',iso(-60000),iso(-60000));
test('expired lock time rejects Open',()=>assert.throws(()=>admin.open('director',{marketId:oldlock.marketId}),/future/));
test('missing YES mapping fails safely',()=>{const r=admin.importExternalDrafts('director',{externalImportItems:[{market:{provider:'kalshi',externalEventId:'event2',externalMarketId:'map',outcomes:['A','B'],prices:{A:0.2,B:0.8},referencePriceAsOf:iso(-60000),closeTime:iso(3600000)}}]});assert.equal(r.failed,1);assert.match(r.results[0].message,/map to PATTC YES/);});
test('anonymous Admin request rejected',()=>assert.throws(()=>admin.list(''),/Authenticated Admin username/));
test('manual override keeps original provider provenance',()=>{const m=admin.price('director',{marketId:valid.marketId,referenceYesPrice:0.7,referenceNoPrice:0.3,referencePriceAsOf:iso(-5000)}).market;assert.equal(m.providerKind,'MANUAL');assert.equal(m.providerMetadata.priceOverrideSource,'PATTC_ADMIN_MANUAL');assert.equal(m.providerMetadata.originalProviderKind,'KALSHI');assert.equal(m.providerMetadata.originalExternalMarketId,'valid');});
const providerClosed=admin.importExternalDrafts('director',{externalImportItems:[{market:Object.assign({},row('provider-closed',iso(-60000),iso(3600000)).market,{status:'closed'})}]});
test('provider CLOSED imports as PATTC DRAFT without settlement',()=>{assert.equal(providerClosed.created,1);assert.equal(providerClosed.results[0].market.status,'DRAFT');assert.equal(providerClosed.results[0].market.resolutionStatus,'UNRESOLVED');});
test('provider refresh failures remain explicit',()=>{const failing=predictionMarketAdminR3CreateService({engine,providerRegistry:{fetchReference:()=>({success:false,providerStatus:'UNCONFIGURED',message:'Not available'})}});const r=failing.refreshReference('director',{marketId:stale.marketId});assert.equal(r.success,false);assert.equal(r.providerStatus,'UNCONFIGURED');});
test('Admin frontend syntax',()=>{const src=fs.readFileSync(path.join(__dirname,'../frontend/js/pages/adminPredictionMarketsR3.js'),'utf8');assert.doesNotThrow(()=>new Function(src));});

// Isolated accounting smoke: does not load Apps Script or Sheets.
const ctx={role:'ADMIN',playerId:'director'}, player={role:'PLAYER',playerId:'r1-fixture-player'};
test('bootstrap in-memory wallet',()=>assert.equal(engine.bootstrapWallet(player,'r1-fixture-player',100).availableCredits,100));
const buyReq={transactionId:'r1-buy',playerId:'r1-fixture-player',marketId:valid.marketId,side:'BUY',outcome:'YES',quantity:10,expectedWalletVersion:0};
test('BUY debits wallet and creates position',()=>{const r=engine.executeTrade(player,buyReq);assert.equal(r.wallet.availableCredits,93);assert.equal(r.position.quantity,10);assert.equal(r.position.costBasisCredits,7);});
test('BUY retry is idempotent',()=>{const r=engine.executeTrade(player,buyReq);assert.equal(r.wallet.version,1);assert.equal(engine.getWallet(player,'r1-fixture-player').availableCredits,93);});
const sellReq={transactionId:'r1-sell',playerId:'r1-fixture-player',marketId:valid.marketId,side:'SELL',outcome:'YES',quantity:4,expectedWalletVersion:1};
test('SELL credits wallet and reduces quantity',()=>{const r=engine.executeTrade(player,sellReq);assert.equal(r.wallet.availableCredits,95.8);assert.equal(r.position.quantity,6);});
test('LOCK rejects further trades',()=>{admin.lock('director',{marketId:valid.marketId});assert.throws(()=>engine.executeTrade(player,{transactionId:'r1-late',playerId:'r1-fixture-player',marketId:valid.marketId,side:'BUY',outcome:'YES',quantity:1,expectedWalletVersion:2}),/not OPEN/);});
test('settlement rejects unresolved market',()=>assert.throws(()=>engine.settlePlayerMarket(ctx,providerClosed.results[0].market.marketId,'r1-fixture-player'),/Only RESOLVED or VOID/));
test('verified manual resolution settles eligible position',()=>{admin.resolve('director',{marketId:valid.marketId,winningOutcome:'YES'});const r=engine.settlePlayerMarket(ctx,valid.marketId,'r1-fixture-player');assert.equal(r.payoutCredits,6);assert.equal(r.wallet.availableCredits,101.8);});
test('settlement replay cannot double-pay',()=>{const r=engine.settlePlayerMarket(ctx,valid.marketId,'r1-fixture-player');assert.equal(r.payoutCredits,6);assert.equal(engine.getWallet(player,'r1-fixture-player').availableCredits,101.8);});
const voidMarket=importOne('void-test',iso(-60000),iso(3600000));
test('VOID market opens with valid imported reference',()=>assert.equal(admin.open('director',{marketId:voidMarket.marketId}).market.status,'OPEN'));
test('VOID refund restores open cost basis once',()=>{const trade=engine.executeTrade(player,{transactionId:'r1-void-buy',playerId:'r1-fixture-player',marketId:voidMarket.marketId,side:'BUY',outcome:'YES',quantity:10,expectedWalletVersion:3});assert.equal(trade.wallet.availableCredits,95.8);admin.voidMarket('director',{marketId:voidMarket.marketId});const refund=engine.settlePlayerMarket(ctx,voidMarket.marketId,'r1-fixture-player');assert.equal(refund.returnedCostBasisCredits,6);assert.equal(refund.wallet.availableCredits,101.8);const again=engine.settlePlayerMarket(ctx,voidMarket.marketId,'r1-fixture-player');assert.equal(again.returnedCostBasisCredits,6);assert.equal(engine.getWallet(player,'r1-fixture-player').availableCredits,101.8);});

console.log('PASS prediction_market_live_repair_r1_tests ('+passed+' checks)');
