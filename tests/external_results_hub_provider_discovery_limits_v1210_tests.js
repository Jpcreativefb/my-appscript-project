const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const providers = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/ProviderAdapters.js'), 'utf8');
const hubCore = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/HubCore.js'), 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} is missing`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

assert(providers.includes('const ERH_DISCOVERY_MAX_ITEMS = 5;'), 'Broad provider discovery must be capped to five browse items');
assert(providers.includes('const ERH_DISCOVERY_MAX_HISTORICAL_ITEMS = 2;'), 'Historical discovery must use a smaller cap');
assert(providers.includes('const ERH_PROVIDER_RAW_JSON_CELL_LIMIT = 45000;'), 'Provider raw JSON needs a Sheets-safe ceiling');

const kalshi = functionSource(providers, 'syncKalshiNow');
assert(kalshi.includes('targetedDiscovery'), 'Kalshi must distinguish targeted lookups from broad discovery');
assert(kalshi.includes('ERH_DISCOVERY_MAX_ITEMS'), 'Kalshi broad discovery must use the browse cap');
assert(kalshi.includes('ERH_DISCOVERY_MAX_HISTORICAL_ITEMS'), 'Kalshi settled discovery must use the historical cap');
assert(kalshi.includes('with_nested_markets: false'), 'Kalshi broad event discovery must not request nested markets');
assert(kalshi.includes('processedMarkets >= ERH_DISCOVERY_MAX_ITEMS'), 'Kalshi broad processing must stop after the market cap');

const poly = functionSource(providers, 'syncPolymarketNow');
assert(poly.includes('targetedDiscovery'), 'Polymarket must distinguish targeted lookups from broad discovery');
assert(poly.includes('ERH_DISCOVERY_MAX_ITEMS'), 'Polymarket broad discovery must use the browse cap');
assert(poly.includes('ERH_DISCOVERY_MAX_HISTORICAL_ITEMS'), 'Polymarket closed discovery must use the historical cap');
assert(poly.includes('processedMarkets >= ERH_DISCOVERY_MAX_ITEMS'), 'Polymarket broad processing must stop after the market cap');

const safeJson = functionSource(providers, 'erhSafeProviderJson_');
const ctx = { JSON, Math, Object, String };
ctx.erhString_ = value => String(value == null ? '' : value).trim();
vm.createContext(ctx);
vm.runInContext('const ERH_PROVIDER_RAW_JSON_CELL_LIMIT = 45000;', ctx);
vm.runInContext(safeJson, ctx);
const huge = { title: 'huge', markets: Array.from({ length: 300 }, (_, i) => ({ ticker: `M${i}`, rules: 'x'.repeat(1000) })) };
const encoded = ctx.erhSafeProviderJson_(huge);
assert(encoded.length <= 45000, 'Safe provider JSON must stay below the Sheets cell limit');
const parsed = JSON.parse(encoded);
assert.strictEqual(parsed.truncated, true, 'Oversize raw provider data must be marked truncated');
assert(parsed.originalLength > encoded.length, 'Truncated payload should retain the original size');

['erhNormalizeKalshiEvent_', 'erhNormalizeKalshiMarket_', 'erhMaybeImportKalshiResult_', 'erhNormalizePolymarketEvent_', 'erhNormalizePolymarketMarket_', 'erhMaybeImportPolymarketResult_'].forEach(name => {
  assert(functionSource(providers, name).includes('erhSafeProviderJson_'), `${name} must use Sheets-safe raw JSON`);
});

const providerDefaults = functionSource(hubCore, 'erhSeedProviders_');
assert(providerDefaults.includes('limit: 5'), 'New provider defaults must use bounded discovery limits');
assert(providerDefaults.includes('includeNestedMarkets: false'), 'New Kalshi defaults must disable nested broad event payloads');
assert(providerDefaults.includes('settledLimit: 2'), 'New Kalshi defaults must bound settled discovery');
assert(providerDefaults.includes('closedLimit: 2'), 'New Polymarket defaults must bound closed discovery');

console.log('External Results Hub provider discovery limits v1.2.10 tests passed.');
