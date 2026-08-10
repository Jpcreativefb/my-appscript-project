const fs = require('fs');
const path = require('path');
const assert = require('assert');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const engine = read('backend/engines/AwardsManagerEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const admin = read('frontend/js/pages/admin.js');
const page = read('frontend/js/pages/adminAwards.js');
const bridge = read('backend/engines/ExternalResultsHubBridgeEngine.js');

[
  'apiAdminAwardsGetDashboard',
  'apiAdminAwardsGetGameSetup',
  'apiAdminAwardsSearchExternalMarkets',
  'apiAdminAwardsCreateQuestionFromMarket',
  'apiAdminAwardsLinkMarket'
].forEach(name => assert(engine.includes('function ' + name), name + ' missing'));

assert(engine.includes('AWARDS_MANAGER_KALSHI_BASE'), 'Kalshi live-search base missing');
assert(engine.includes('AWARDS_MANAGER_POLYMARKET_BASE'), 'Polymarket live-search base missing');
assert(engine.includes('/public-search?q='), 'Polymarket public-search missing');
assert(engine.includes('/markets?status=open'), 'Kalshi live-market search missing');
assert(engine.includes('function awardsManagerMarketIsLive_'), 'Live-market filter missing');
assert(engine.includes('market.closed === true'), 'Closed markets must be filtered');
assert(engine.includes('market.active === false'), 'Inactive markets must be filtered');
assert(engine.includes('closeMs < Date.now()'), 'Expired markets must be filtered');
assert(engine.includes('\"/series\"'), 'Kalshi live-series discovery missing');
assert(engine.includes('settlement_sources'), 'Kalshi settlement-source metadata missing');
assert(engine.includes('AutoSettle: false'), 'Mappings must force AutoSettle false');
assert(engine.includes('RequireAdminReview: true'), 'Mappings must require admin review');
assert(engine.includes('UPSERT_EXTERNAL_MARKET_MAPPING'), 'Awards Manager must use Hub bridge job');
assert(bridge.includes('UPSERT_EXTERNAL_MARKET_MAPPING'), 'Hub bridge job type missing');

[
  'adminAwardsGetDashboard',
  'adminAwardsGetGameSetup',
  'adminAwardsSearchExternalMarkets',
  'adminAwardsCreateQuestionFromMarket',
  'adminAwardsLinkMarket'
].forEach(action => assert(backendApi.includes('"' + action + '"'), 'Backend API missing ' + action));

[
  'apiAdminAwardsGetDashboard',
  'apiAdminAwardsGetGameSetup',
  'apiAdminAwardsSearchExternalMarkets',
  'apiAdminAwardsCreateQuestionFromMarket',
  'apiAdminAwardsLinkMarket'
].forEach(name => {
  assert(frontendApi.includes('function ' + name), 'Frontend API missing ' + name);
  assert(frontendApiMirror.includes('function ' + name), 'Frontend API mirror missing ' + name);
});

assert(app.includes('"admin-awards": ["admin", "adminUi", "adminAwards"]'), 'admin-awards route module missing');
assert(appMirror.includes('"admin-awards": ["admin", "adminUi", "adminAwards"]'), 'admin-awards mirror route missing');
assert(app.includes('case "admin-awards"'), 'admin-awards render route missing');
assert(admin.includes("navigate('admin-awards')"), 'Admin dashboard Awards Manager card missing');
assert(page.includes('Search Providers'), 'Awards Manager search UI missing');
assert(page.includes('View Event'), 'View Event action missing');
assert(page.includes('Select Markets / Answers'), 'Event market selection UI missing');

console.log('Awards Manager regression tests passed.');


assert(engine.includes('adminBulkCreateNominees({'), 'Awards Manager create must use bulk answer creation');
assert(engine.includes('function awardsManagerQueueMarketGroup_'), 'Grouped event Hub queue helper missing');
assert(engine.includes('"UPSERT_EXTERNAL_MARKET_GROUP"'), 'Grouped event Hub job type missing');
assert(bridge.includes('type === "UPSERT_EXTERNAL_MARKET_MAPPING"'), 'Hub bridge must support single Awards market jobs');
assert(bridge.includes('type === "UPSERT_EXTERNAL_MARKET_GROUP"'), 'Hub bridge must support grouped Awards market jobs');
assert(page.includes('Select Markets / Answers'), 'Event market selection UI missing');
assert(page.includes('awards-event-answer-label'), 'Event editable answer labels missing');


assert(engine.includes('function apiAdminAwardsGetExternalEvent(payload)'), 'Awards Manager full-event API missing');
assert(engine.includes('function awardsManagerKalshiEvent_'), 'Awards Manager Kalshi event loader missing');
assert(engine.includes('function awardsManagerPolymarketEvent_'), 'Awards Manager Polymarket event loader missing');
assert(backendApi.includes('"adminAwardsGetExternalEvent"'), 'Awards Manager event API route missing');
assert(page.includes('View Event'), 'Awards Manager event-first search UI missing');
assert(page.includes('Loading full provider event and all live markets'), 'Awards Manager full-event loader missing');
assert(page.includes('Select Markets / Answers'), 'Awards Manager event market selector missing');
assert(page.includes('awards-event-market-use'), 'Awards Manager event market checkboxes missing');
assert(page.includes('awards-event-answer-label'), 'Awards Manager event answer labels missing');
