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
test('provider CLOSED does not resolve PATTC market',()=>assert.equal(engine.getMarkets().find(x=>x.marketId===valid.marketId).status,'OPEN'));
test('provider refresh failures remain explicit',()=>{const failing=predictionMarketAdminR3CreateService({engine,providerRegistry:{fetchReference:()=>({success:false,providerStatus:'UNCONFIGURED',message:'Not available'})}});const r=failing.refreshReference('director',{marketId:stale.marketId});assert.equal(r.success,false);assert.equal(r.providerStatus,'UNCONFIGURED');});
test('Admin frontend syntax',()=>{const src=fs.readFileSync(path.join(__dirname,'../frontend/js/pages/adminPredictionMarketsR3.js'),'utf8');assert.doesNotThrow(()=>new Function(src));});
console.log('PASS prediction_market_live_repair_r1_tests ('+passed+' checks)');
