const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('backend/admin/AdminPredictionMarketsR3.js', 'utf8');
assert(source.includes('apiAdminAwardsSearchExternalMarkets'), 'Awards search authority must be reused');
assert(source.includes('apiAdminAwardsGetExternalEvent'), 'Awards detail authority must be reused');
assert(!source.includes('PredictionMarketMarkets'), 'Admin adapter must not name/write raw PM sheets');
assert(!/\.setup\s*\(/.test(source), 'Admin import must not invoke setup');
assert(!/executeTrade\s*\(/.test(source), 'Admin import must not invoke trading');
assert(!/settlePlayerMarket\s*\(/.test(source), 'Admin import must not invoke settlement');

const context = { module: { exports: {} }, exports: {}, console, Date, JSON, Object, String, Number, Math, isFinite, Error };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'AdminPredictionMarketsR3.js' });
const api = context.module.exports;

let markets = [{
  marketId: 'existing', title: 'Existing', status: 'DRAFT', category: '', yesLabel: 'YES', noLabel: 'NO',
  referenceYesPrice: 0.5, referenceNoPrice: 0.5, referencePriceAsOf: '', referencePriceTrusted: false,
  providerKind: 'KALSHI', providerId: 'EV-DUP', externalMarketId: 'MK-DUP', sourceUrl: '', providerMetadata: {}, openTime: '', lockTime: ''
}];
let createCalls = [];
let forbiddenCalls = [];
const engine = {
  getMarkets() { return markets.slice(); },
  createMarket(ctx, input) {
    createCalls.push({ ctx, input: JSON.parse(JSON.stringify(input)) });
    const market = Object.assign({}, input, { status: 'DRAFT' });
    markets.push(market);
    return market;
  },
  editDraftMarket(ctx, id, patch) { return Object.assign({}, markets.find(m => m.marketId === id), patch, { status: 'DRAFT' }); },
  setManualPrice() { forbiddenCalls.push('setManualPrice'); throw new Error('not expected'); },
  setReferencePrice() { forbiddenCalls.push('setReferencePrice'); throw new Error('not expected'); },
  openMarket() { forbiddenCalls.push('openMarket'); throw new Error('not expected'); },
  lockMarket() { forbiddenCalls.push('lockMarket'); throw new Error('not expected'); },
  resolveMarket() { forbiddenCalls.push('resolveMarket'); throw new Error('not expected'); },
  voidMarket() { forbiddenCalls.push('voidMarket'); throw new Error('not expected'); },
  validatePriceState() { return true; }
};
const searchCalls = [];
const detailCalls = [];
const service = api.predictionMarketAdminR3CreateService({
  engine,
  externalSearch(payload) { searchCalls.push(payload); return { success: true, provider: payload.provider, events: [] }; },
  externalDetail(payload) { detailCalls.push(payload); return { success: true, provider: payload.provider, externalEventId: payload.eventId, markets: [] }; }
});

const kalshiSearch = service.searchExternal('admin', { provider: 'kalshi', query: 'oscars' });
assert.strictEqual(kalshiSearch.provider, 'kalshi');
const polySearch = service.searchExternal('admin', { provider: 'polymarket', query: 'oscars' });
assert.strictEqual(polySearch.provider, 'polymarket');
const allSearch = service.searchExternal('admin', { provider: 'all', query: 'oscars' });
assert.strictEqual(allSearch.provider, 'both', 'All-provider search must route to Awards both-provider authority');
assert.deepStrictEqual(searchCalls.map(x => x.provider), ['kalshi', 'polymarket', 'both']);

service.getExternalDetail('admin', { provider: 'kalshi', eventId: 'EV-1' });
assert.strictEqual(detailCalls[0].eventId, 'EV-1');

const items = [
  {
    market: {
      provider: 'kalshi', externalEventId: 'EV-1', externalMarketId: 'MK-1', eventName: 'Event One',
      marketQuestion: 'Will X happen?', outcomes: ['Yes', 'No'], prices: { Yes: 62, No: 38 },
      referencePriceAsOf: '2026-10-19T12:00:00Z', closeTime: '2026-11-01T00:00:00Z',
      sourceUrl: 'https://kalshi.com/markets/example', raw: { ticker: 'MK-1' }
    },
    config: { category: 'Politics' }
  },
  {
    market: {
      provider: 'polymarket', externalEventId: 'EV-2', externalMarketId: 'MK-2', eventName: 'Event Two',
      marketQuestion: 'Who wins?', outcomes: ['Alice', 'Bob'], prices: { Alice: 0.7, Bob: 0.3 },
      closeTime: '2026-12-01T00:00:00Z', sourceUrl: 'https://polymarket.com/event/example', raw: { conditionId: 'cond-2' }
    },
    config: { selectedOutcome: 'Bob', category: 'Election' }
  },
  {
    market: {
      provider: 'kalshi', externalEventId: 'EV-DUP', externalMarketId: 'MK-DUP',
      marketQuestion: 'Duplicate?', outcomes: ['Yes', 'No'], prices: { Yes: 50, No: 50 }
    }
  },
  {
    market: {
      provider: 'polymarket', externalEventId: 'EV-3', externalMarketId: 'MK-3',
      marketQuestion: 'Invalid missing price?', outcomes: ['Yes', 'No'], prices: {}
    }
  }
];

const bulk = service.importExternalDrafts('admin', { externalImportItems: items });
assert.strictEqual(bulk.requested, 4, 'multi-select count must survive');
assert.strictEqual(bulk.created, 2, 'two valid selections should create');
assert.strictEqual(bulk.failed, 2, 'duplicate and invalid should report independently');
assert.strictEqual(bulk.results[0].status, 'CREATED');
assert.strictEqual(bulk.results[1].status, 'CREATED');
assert.strictEqual(bulk.results[2].status, 'DUPLICATE');
assert.strictEqual(bulk.results[3].status, 'INVALID');
assert.strictEqual(createCalls.length, 2, 'valid imports should continue despite per-item failure');

const first = createCalls[0].input;
assert.strictEqual(first.providerKind, 'KALSHI');
assert.strictEqual(first.providerId, 'EV-1');
assert.strictEqual(first.externalMarketId, 'MK-1');
assert.strictEqual(first.referenceYesPrice, 0.62);
assert.strictEqual(first.referenceNoPrice, 0.38);
assert.strictEqual(first.referencePriceAsOf, '2026-10-19T12:00:00Z');
assert.strictEqual(first.lockTime, '2026-11-01T00:00:00Z');
assert.strictEqual(first.sourceUrl, 'https://kalshi.com/markets/example');
assert.strictEqual(first.providerMetadata.raw.ticker, 'MK-1');
assert.strictEqual(first.openTime, '', 'external import must not auto-open or schedule open');

const second = createCalls[1].input;
assert.strictEqual(second.yesLabel, 'Bob', 'selected child outcome must map to PATTC YES');
assert.strictEqual(second.noLabel, 'Alice', 'opposing binary outcome must map to PATTC NO');
assert.strictEqual(second.referenceYesPrice, 0.3);
assert.strictEqual(second.referenceNoPrice, 0.7);
assert.strictEqual(second.referencePriceTrusted, false, 'missing provider timestamp must not be fabricated/trusted');
assert.strictEqual(second.providerMetadata.selectedOutcome, 'Bob');
assert.strictEqual(bulk.results[1].importMapping.transformedToBinary, true);
assert.strictEqual(forbiddenCalls.length, 0, 'import must not open/trade/settle/reprice');

const manual = service.create('admin', {
  marketId: 'manual-1', title: 'Manual', referenceYesPrice: 0.4, referenceNoPrice: 0.6,
  referencePriceAsOf: '2026-10-19T12:00:00Z', providerKind: 'MANUAL', lockTime: '2026-11-01T00:00:00Z'
});
assert.strictEqual(manual.success, true, 'manual Draft creation must remain intact');
assert.strictEqual(manual.market.status, 'DRAFT');

let dispatched = [];
context.predictionMarketAdminR3ProductionService_ = function() {
  return {
    list() { dispatched.push('list'); return { success: true, markets: [] }; },
    searchExternal(user, payload) { dispatched.push('search:' + payload.provider); return { success: true, events: [] }; },
    getExternalDetail() { dispatched.push('detail'); return { success: true, markets: [] }; },
    create() { dispatched.push('create'); return { success: true, market: { status: 'DRAFT' } }; },
    importExternalDrafts() { dispatched.push('import'); return { success: true, requested: 2, created: 2, failed: 0, results: [] }; },
    edit(){}, price(){}, refreshReference(){}, open(){}, lock(){}, resolve(){}, voidMarket(){}
  };
};
context.apiAdminPredictionMarketR3Dispatch('adminGetPredictionMarkets', { username: 'admin', externalAction: 'search', provider: 'all' });
context.apiAdminPredictionMarketR3Dispatch('adminGetPredictionMarkets', { username: 'admin', externalAction: 'detail', provider: 'kalshi', eventId: 'EV' });
context.apiAdminPredictionMarketR3Dispatch('adminCreatePredictionMarket', { username: 'admin', externalImportItems: [{}, {}] });
context.apiAdminPredictionMarketR3Dispatch('adminCreatePredictionMarket', { username: 'admin', marketId: 'manual' });
assert.deepStrictEqual(dispatched, ['search:all', 'detail', 'import', 'create'], 'existing PM dispatcher must remain the authority for search/detail/import/manual create modes');

console.log('PASS prediction_market_external_import_r1_tests');
