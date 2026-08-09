const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bridge = fs.readFileSync(path.join(root, 'backend/engines/ExternalResultsHubBridgeEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const frontendApiCompat = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'frontend/js/pages/admin.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');
const hubBridge = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/ReviewAndBridge.js'), 'utf8');

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

assert(bridge.includes('const EXTERNAL_RESULTS_INBOX_ALLOWED_PROVIDERS'), 'Inbox provider allow-list is missing');
['manual-awards', 'manual-reality-tv', 'kalshi', 'polymarket'].forEach(provider => {
  assert(bridge.includes(`"${provider}"`), `${provider} must be allowed in the External Results Inbox`);
});
assert(functionSource(bridge, 'externalResultsInboxValidateGroup_').includes('Sports and racing must use their native engines'), 'Sports/racing exclusion is missing');
assert(functionSource(bridge, 'externalResultsInboxValidateGroup_').includes('Hub mapping coverage is incomplete'), 'Complete nominee mapping validation is missing');
assert(functionSource(bridge, 'externalResultsInboxValidateGroup_').includes('already settled with a different result'), 'Settlement conflict protection is missing');
assert(functionSource(bridge, 'externalResultsInboxStageRealityQuestion_').includes('REALITY_TV_QUESTION_QUEUE_SHEET'), 'Reality TV Extra Questions must stage into the native question queue');
assert(functionSource(bridge, 'externalResultsInboxStageRealityMain_').includes('REALITY_TV_RESULTS_QUEUE_SHEET'), 'Reality TV elimination must stage into the native episode queue');
assert(functionSource(bridge, 'externalResultsInboxApplyGeneric_').includes('upsertCategoryResultsBulk_'), 'Awards/prediction results must use CategoryResults');
assert(functionSource(bridge, 'externalResultsInboxApplyGeneric_').includes('adminUpdateCategory'), 'Awards/prediction results must update normal category settlement state');
assert(functionSource(bridge, 'externalResultsInboxApplyGeneric_').includes('external-results-hub:'), 'Applied result provenance is missing');
assert(functionSource(bridge, 'apiAdminApplyExternalResultsInbox').includes('STAGED_REALITY'), 'Reality TV inbox results must remain staged until native finalization');
assert(functionSource(bridge, 'externalResultsInboxSummary_').includes('autoApply: false'), 'Automatic inbound apply must remain off in v1.2.6');

['adminGetExternalResultsInboxStatus', 'adminValidateExternalResultsInbox', 'adminApplyExternalResultsInbox', 'adminRetryExternalResultsInboxErrors'].forEach(action => {
  assert(api.includes(`"${action}"`), `${action} API action is missing`);
  assert(frontendApi.includes(action), `${action} frontend helper is missing`);
});
assert.strictEqual(frontendApi, frontendApiCompat, 'Both frontend API copies must match');
assert(admin.includes('External Results Inbox'), 'Main Admin External Results Inbox card is missing');
assert(admin.includes('Validate Ready'), 'Inbox validation button is missing');
assert(admin.includes('Apply Validated'), 'Inbox apply button is missing');
assert(admin.includes('Automatic apply OFF'), 'Inbox UI must clearly show automatic apply is disabled');
assert(app.includes('APP_ASSET_VERSION = "313-external-results-hub-end-to-end"'), 'v1.2.6 asset cache version is missing');
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1280-external-results-hub-end-to-end"'), 'v1.2.6 route cache version is missing');
assert.strictEqual(app, appCompat, 'Both app-loader copies must match');
assert(html.includes('313-external-results-hub-end-to-end'), 'App shell must request v1.2.6 assets');
assert(sw.includes('awards-app-v313-external-results-hub-end-to-end'), 'Service worker cache must advance for v1.2.6');

const pushFn = functionSource(hubBridge, 'pushApprovedExternalResultsNow');
assert(pushFn.includes('ExternalResultsInbox'), 'Hub must still deliver only to ExternalResultsInbox');
assert(!pushFn.includes('CategoryResults'), 'Hub project must never directly settle CategoryResults');

const context = { String, Array, Object, JSON };
vm.createContext(context);
vm.runInContext(`
  ${functionSource(bridge, 'externalResultsBridgeString_')}
  ${functionSource(bridge, 'externalResultsBridgeKey_')}
  function externalResultsBridgeBool_(value) { return value === true || ['true','yes','1','on'].indexOf(externalResultsBridgeKey_(value)) !== -1; }
  ${functionSource(bridge, 'externalResultsInboxSortedUnique_')}
  ${functionSource(bridge, 'externalResultsInboxSameIds_')}
  ${functionSource(bridge, 'externalResultsInboxWinnerIds_')}
`, context);
const winners = context.externalResultsInboxWinnerIds_([
  { NomineeId: 'A', IsWinner: true },
  { NomineeId: 'B', IsWinner: 'TRUE' },
  { NomineeId: 'C', IsWinner: false },
  { NomineeId: 'A', IsWinner: true }
]);
assert.deepStrictEqual(Array.from(winners), ['a', 'b'], 'Multiple winners must remain distinct and deduplicated');
assert(context.externalResultsInboxSameIds_(['B', 'A'], ['a', 'b']), 'Winner-set comparison must be order independent');

console.log('External Results Inbox v1.2.6 tests passed.');
