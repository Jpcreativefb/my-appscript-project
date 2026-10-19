const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const discoverySource = read('backend/engines/PredictionMarketExternalDiscoveryR2.js');
const adminSource = read('backend/admin/AdminPredictionMarketsR3.js');
const frontendSource = read('frontend/js/pages/adminPredictionMarketsR3.js');
const awardsSource = read('backend/engines/AwardsManagerEngine.js');

assert.doesNotThrow(() => new Function(discoverySource));
assert.doesNotThrow(() => new Function(adminSource));
assert.doesNotThrow(() => new Function(frontendSource));

const discoveryContext = { module:{exports:{}}, exports:{}, console, Date, JSON, Object, String, Number, Math, isFinite, Error, Array, RegExp, encodeURIComponent, decodeURIComponent };
vm.createContext(discoveryContext);
vm.runInContext(discoverySource, discoveryContext, {filename:'PredictionMarketExternalDiscoveryR2.js'});
const discovery = discoveryContext.module.exports;

// 1–3: provider routing remains in the existing Admin adapter and maps All -> Awards "both".
const admin = require('../backend/admin/AdminPredictionMarketsR3.js');
const writes = [];
const engine = {
  getMarkets(){ return []; },
  createMarket(){ writes.push('create'); throw new Error('unexpected write'); },
  editDraftMarket(){ writes.push('edit'); throw new Error('unexpected write'); },
  setManualPrice(){ writes.push('price'); throw new Error('unexpected write'); },
  setReferencePrice(){ writes.push('reference'); throw new Error('unexpected write'); },
  openMarket(){ writes.push('open'); throw new Error('unexpected write'); },
  lockMarket(){ writes.push('lock'); throw new Error('unexpected write'); },
  resolveMarket(){ writes.push('resolve'); throw new Error('unexpected write'); },
  voidMarket(){ writes.push('void'); throw new Error('unexpected write'); },
  validatePriceState(){ return true; }
};
const searchCalls = [], detailCalls = [], resolveCalls = [];
const service = admin.predictionMarketAdminR3CreateService({
  engine,
  repository:{ save(){writes.push('repository-save');}, append(){writes.push('repository-append');} },
  externalSearch(payload){ searchCalls.push(payload); return {success:true, contractVersion:'prediction-market-external-discovery-r2', events:[]}; },
  externalDetail(payload){ detailCalls.push(payload); return {success:true, provider:payload.provider, externalEventId:payload.eventId, eventName:'Best Actor', groupedEvent:true, logicalQuestion:'Best Actor', status:'open', closeTime:'2027-03-01T00:00:00Z', markets:[{provider:payload.provider,externalEventId:payload.eventId,externalMarketId:'NOM-A',marketQuestion:'Will Nominee A win?',outcomes:['Yes','No'],prices:{Yes:0.4,No:0.6}}], sourceSnapshot:{childMarketIds:['NOM-A']}}; },
  externalResolve(payload){ resolveCalls.push(payload); return {success:true,event:{provider:'kalshi',externalEventId:'EV-A',eventName:'Best Actor',groupedEvent:true,logicalQuestion:'Best Actor',markets:[{provider:'kalshi',externalEventId:'EV-A',externalMarketId:'NOM-A',outcomes:['Yes','No'],prices:{Yes:0.4,No:0.6}}]}}; }
});
service.searchExternal('admin',{provider:'all',query:'Best Actor'});
service.searchExternal('admin',{provider:'kalshi',query:'NFL'});
service.searchExternal('admin',{provider:'polymarket',query:'Election'});
assert.deepStrictEqual(searchCalls.map(x=>x.provider), ['both','kalshi','polymarket']);

// 4: R2 delegates to the established Awards authority instead of owning provider clients.
['apiAdminAwardsSearchExternalMarkets','apiAdminAwardsGetExternalEvent','awardsManagerFetchJson_','awardsManagerKalshiResult_','awardsManagerPolymarketResult_'].forEach(token => {
  assert(discoverySource.includes(token) || adminSource.includes(token), 'missing Awards authority reuse: '+token);
});
assert(awardsSource.includes('AWARDS_MANAGER_KALSHI_BASE'));
assert(awardsSource.includes('AWARDS_MANAGER_POLYMARKET_BASE'));
assert(!discoverySource.includes('UrlFetchApp'), 'R2 discovery must not create a provider HTTP client');
assert(!adminSource.includes('UrlFetchApp'), 'PM Admin adapter must not create a provider HTTP client');
assert(!discoverySource.includes('https://external-api.kalshi.com/trade-api/v2'));
assert(!discoverySource.includes('https://gamma-api.polymarket.com'));

// 5: advanced filter contract is preserved by service routing and frontend mapping.
const advanced = {provider:'all',query:'Chicago Bears',category:'Sports',marketType:'NFL',searchIn:'markets',status:'closed',closeDays:14,closeAfter:'2026-10-01T00:00:00Z',closeBefore:'2026-12-01T00:00:00Z',exactPhrase:true,sort:'closing'};
service.searchExternal('admin',advanced);
const mapped = searchCalls[3];
assert.strictEqual(mapped.provider,'both');
['query','category','marketType','searchIn','status','closeDays','closeAfter','closeBefore','exactPhrase','sort'].forEach(k=>assert.deepStrictEqual(mapped[k],advanced[k], 'advanced mapping '+k));
const opts = discovery.predictionMarketExternalDiscoveryR2Options_(advanced);
assert.strictEqual(opts.status,'closed');
assert.strictEqual(opts.category,'Sports');
assert.strictEqual(opts.marketType,'NFL');
assert.strictEqual(opts.searchIn,'markets');
assert.strictEqual(opts.exactPhrase,true);

// 6–8: event grouping, child outcomes, and multi-select review are preserved.
const detail = service.getExternalDetail('admin',{provider:'kalshi',eventId:'EV-A'});
assert.strictEqual(detail.groupedEvent,true);
assert.strictEqual(detail.logicalQuestion,'Best Actor');
assert.strictEqual(detail.markets.length,1);
assert.deepStrictEqual(detail.markets[0].outcomes,['Yes','No']);
assert(frontendSource.includes('STATE.externalSelected'));
assert(frontendSource.includes('predictionMarketAdminR3ExternalToggle_'));
assert(frontendSource.includes('Selected / Review'));

// 9–10: provider browsing uses official sites in new tabs and never iframes them.
assert(frontendSource.includes('href="https://kalshi.com/markets"'));
assert(frontendSource.includes('href="https://polymarket.com/"'));
assert(frontendSource.includes('target="_blank"'));
assert(!/<iframe/i.test(frontendSource));

// 11–12: URL and provider-ID parsing feed the same resolver/review contract.
let ref = discovery.predictionMarketExternalDiscoveryR2ParseReference_('https://kalshi.com/markets/foo/x/KXOSCARS?op_market_ticker=KXOSCARS-ACTOR-A','auto');
assert.strictEqual(ref.provider,'kalshi');
assert.strictEqual(ref.eventId,'KXOSCARS');
assert.strictEqual(ref.marketId,'KXOSCARS-ACTOR-A');
ref = discovery.predictionMarketExternalDiscoveryR2ParseReference_('https://polymarket.com/event/oscars-best-actor','auto');
assert.strictEqual(ref.provider,'polymarket');
assert.strictEqual(ref.slug,'oscars-best-actor');
ref = discovery.predictionMarketExternalDiscoveryR2ParseReference_('KXOSCARS-ACTOR-A','kalshi');
assert.strictEqual(ref.provider,'kalshi');
assert.strictEqual(ref.marketId,'KXOSCARS-ACTOR-A');
service.resolveExternal('admin',{reference:'KXOSCARS-ACTOR-A',providerHint:'kalshi'});
assert.strictEqual(resolveCalls.length,1);
assert(frontendSource.includes("externalAction:'resolve'"));

// 13–14: grouped identity + source-change-relevant fields are retained.
const snapshot = discovery.predictionMarketExternalDiscoveryR2Snapshot_({provider:'polymarket',externalEventId:'EV-2',eventName:'Best Actor',closeTime:'2027-03-01T00:00:00Z',status:'open',markets:[{externalMarketId:'A',marketQuestion:'Will A win?',outcomes:['Yes','No'],prices:{Yes:0.35,No:0.65},primaryProbability:0.35,closeTime:'2027-03-01T00:00:00Z',status:'open',sourceUrl:'https://polymarket.com/event/x'}]});
assert.strictEqual(snapshot.externalEventId,'EV-2');
assert.strictEqual(snapshot.eventName,'Best Actor');
assert.strictEqual(snapshot.closeTime,'2027-03-01T00:00:00Z');
assert.strictEqual(snapshot.status,'open');
assert.deepStrictEqual(snapshot.childMarketIds,['A']);
assert.strictEqual(snapshot.children[0].marketQuestion,'Will A win?');
assert.deepStrictEqual(snapshot.children[0].outcomes,['Yes','No']);
assert.strictEqual(snapshot.children[0].prices.Yes,0.35);

// 15: incompatible backend contracts surface an explicit error instead of zero matches.
const mismatchService = admin.predictionMarketAdminR3CreateService({engine,externalSearch(){return{success:true};}});
assert.throws(()=>mismatchService.searchExternal('admin',{provider:'all',query:'Oscars'}),/External market search is unavailable on the current backend deployment\./);
assert(frontendSource.includes('External market search is unavailable on the current backend deployment.'));

// 16–17, 19–20: discovery/detail/resolve are read-only and create no Draft/setup/storage mutation.
assert.strictEqual(writes.length,0,'search/detail/resolve must not mutate PM storage');
['searchExternal','getExternalDetail','resolveExternal'].forEach(name=>assert.strictEqual(typeof service[name],'function'));
assert(!/\.setup\s*\(/.test(discoverySource+adminSource));
assert(!/setupStore\s*\(/.test(discoverySource+adminSource));
assert(!discoverySource.includes('PredictionMarketMarkets'));
assert(!discoverySource.includes('PredictionMarketWallets'));
assert(!discoverySource.includes('PredictionMarketTransactions'));
assert(!discoverySource.includes('PredictionMarketPositions'));
assert(!discoverySource.includes('PredictionMarketSettlements'));
const searchBody = frontendSource.slice(frontendSource.indexOf('root.predictionMarketAdminR3ExternalSearch_'), frontendSource.indexOf('root.predictionMarketAdminR3ExternalDetail_'));
const detailBody = frontendSource.slice(frontendSource.indexOf('root.predictionMarketAdminR3ExternalDetail_'), frontendSource.indexOf('root.predictionMarketAdminR3ExternalResolve_'));
const resolveBody = frontendSource.slice(frontendSource.indexOf('root.predictionMarketAdminR3ExternalResolve_'), frontendSource.indexOf('root.predictionMarketAdminR3ExternalToggle_'));
assert(!searchBody.includes('adminCreatePredictionMarket'));
assert(!detailBody.includes('adminCreatePredictionMarket'));
assert(!resolveBody.includes('adminCreatePredictionMarket'));
assert(frontendSource.includes("root.predictionMarketAdminR3ExternalImport_"));
assert(frontendSource.includes("call('adminCreatePredictionMarket',{externalImportItems:STATE.externalSelected})"));

// 18: R2 has no duplicate provider client; Awards remains the only HTTP/base authority.
assert.strictEqual((discoverySource.match(/UrlFetchApp/g)||[]).length,0);
assert.strictEqual((adminSource.match(/UrlFetchApp/g)||[]).length,0);
assert(awardsSource.includes('UrlFetchApp.fetch'));

// UX contract coverage: simple/advanced, status/date/type, practical examples and review flow.
['Simple Search','Advanced Search','Open / Live','Closed / Resolved','Category','Market / Type','Close on/after','Close on/before','Best Actor','Oscars','NFL','Chicago Bears','Election','President','Reality TV','Import by Provider URL / Market ID'].forEach(token=>assert(frontendSource.includes(token),'missing UX token '+token));

console.log('PASS prediction_market_external_discovery_r2_tests');
