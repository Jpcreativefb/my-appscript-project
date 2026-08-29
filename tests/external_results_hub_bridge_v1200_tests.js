const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bridge = fs.readFileSync(path.join(root, 'backend/engines/ExternalResultsHubBridgeEngine.js'), 'utf8');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const hubCore = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/HubCore.js'), 'utf8');
const hubBridge = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/ReviewAndBridge.js'), 'utf8');
const hubDiagnostics = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/Diagnostics.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const frontendApiCompat = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

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

assert(bridge.includes('const EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET = "ExternalResultsHubOutbox"'), 'Local Hub outbox is missing');
assert(bridge.includes('const EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET = "ExternalResultsInbox"'), 'Local Hub inbox is missing');
assert(bridge.includes('function externalResultsBridgeEnqueue_'), 'Hub enqueue function is missing');
assert(bridge.includes('function externalResultsProcessHubOutbox'), 'Background Hub worker is missing');
assert(bridge.includes('ScriptApp.newTrigger(EXTERNAL_RESULTS_BRIDGE_TRIGGER)'), 'Hub worker must schedule a continuation trigger');
assert(bridge.includes('EXTERNAL_RESULTS_BRIDGE_MAX_ATTEMPTS = 5'), 'Hub worker retry limit is missing');
assert(bridge.includes('Status: retry ? "RETRY" : "ERROR"'), 'Hub worker must preserve failed jobs for retry');
assert(bridge.includes('function externalResultsBridgeHealth_'), 'Hub health report is missing');

['realityTvSyncEpisodeToHub_', 'realityTvSyncEpisodeScheduleToHub_', 'realityTvCreateHubPendingResult_', 'realityTvUpdateHubReview_'].forEach(name => {
  const fn = functionSource(season, name);
  assert(fn.includes('externalResultsBridgeEnqueue_'), `${name} must enqueue local Hub work`);
  assert(!fn.includes('SpreadsheetApp.openById'), `${name} must not open the Hub spreadsheet directly`);
  assert(!fn.includes('realityTvOpenHub_'), `${name} must not open the Hub synchronously`);
});
assert(functionSource(season, 'realityTvSyncApprovalHub_').includes('queued: true'), 'Approval should report queued Hub synchronization');
assert(api.includes('adminGetExternalResultsBridgeHealth'), 'Hub health API route is missing');
assert(api.includes('adminRunExternalResultsBridgeNow'), 'Hub manual sync API route is missing');
assert(api.includes('adminRetryExternalResultsBridgeFailures'), 'Hub retry API route is missing');

const pushFn = functionSource(hubBridge, 'pushApprovedExternalResultsNow');
assert(pushFn.includes('ExternalResultsInbox'), 'Hub must deliver to the Awards App inbox');
assert(pushFn.includes('Status: "READY"'), 'Inbound deliveries must be staged as READY');
assert(pushFn.includes('"DELIVERED"'), 'Hub review rows must be marked DELIVERED');
assert(!pushFn.includes('CategoryResults'), 'Hub must not write directly to CategoryResults');
assert(hubBridge.includes('function erhWinningOutcomeList_'), 'Multiple-winner normalization is missing');
assert(hubCore.includes('const ERH_SCHEMA_VERSION = "2.3.1"'), 'Hub schema version was not advanced');
assert(hubCore.includes('Deliver Approved Results to App Inbox'), 'Hub menu still describes direct settlement');
assert(hubDiagnostics.includes('mainAppInboxReady'), 'Hub health must verify the Awards App inbox');

assert(frontendApi.includes('apiAdminGetExternalResultsBridgeHealth'), 'Frontend Hub health API helper is missing');
assert.strictEqual(frontendApi, frontendApiCompat, 'Both frontend API copies must match');
assert(ui.includes('Sync Queue Now'), 'Reality TV manager Hub sync control is missing');
assert(ui.includes('Retry Failed'), 'Reality TV manager Hub retry control is missing');
assert(ui.includes('adminRealityTvRefreshHubBridgeHealth_'), 'Reality TV manager Hub health display is missing');
assert.strictEqual(app, appCompat, 'Both app loader copies must match');

const context = { console, JSON, String, Array, Object, Error };
vm.createContext(context);
vm.runInContext(`
  function erhString_(value) { return String(value == null ? '' : value).trim(); }
  function erhKey_(value) { return erhString_(value).toLowerCase(); }
  ${functionSource(hubBridge, 'erhWinningOutcomeList_')}
`, context);
assert.deepStrictEqual(
  Array.from(context.erhWinningOutcomeList_({ WinningOutcome: '["A","B"]' })),
  ['A', 'B'],
  'JSON multiple winners should remain separate'
);
assert.deepStrictEqual(
  Array.from(context.erhWinningOutcomeList_({ WinningOutcome: 'A, B' })),
  ['A', 'B'],
  'Comma-separated multiple winners should be normalized'
);

console.log('External Results Hub queued bridge v1.2.0 tests passed.');
