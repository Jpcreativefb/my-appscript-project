const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const bridge = fs.readFileSync(path.join(root, 'backend/engines/ExternalResultsHubBridgeEngine.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const frontendApiCompat = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');

assert(bridge.includes('"TargetSpreadsheetId", "TargetSpreadsheetName", "WriteReceiptJSON", "VerifiedAt"'), 'Outbox write receipt columns are missing');
assert(bridge.includes('function externalResultsBridgeVerifiedUpsert_'), 'Verified Hub upsert helper is missing');
assert(bridge.includes('Hub write verification failed for'), 'Hub writes must fail when expected rows cannot be read back');
assert(bridge.includes('Hub job produced zero verified rows'), 'Zero-row Hub jobs must not be marked complete');
assert(bridge.includes('TargetSpreadsheetId: receipt.targetSpreadsheetId'), 'Completed jobs must record the target spreadsheet ID');
assert(bridge.includes('WriteReceiptJSON: JSON.stringify(receipt)'), 'Completed jobs must save a write receipt');
assert(bridge.includes('VerifiedAt: receipt.verifiedAt'), 'Completed jobs must save verification time');
assert(bridge.includes('unverifiedComplete:'), 'Health must expose old unverified COMPLETE jobs');
assert(bridge.includes('hubRowCounts:'), 'Health must expose actual Hub row counts');
assert(bridge.includes('function apiAdminRequeueUnverifiedExternalResultsBridgeJobs'), 'Unverified COMPLETE recovery API is missing');
assert(api.includes('adminRequeueUnverifiedExternalResultsBridgeJobs'), 'API route for unverified jobs is missing');
assert(frontendApi.includes('apiAdminRequeueUnverifiedExternalResultsBridgeJobs'), 'Frontend recovery helper is missing');
assert.strictEqual(frontendApi, frontendApiCompat, 'Frontend API copies must match');
assert(ui.includes('Requeue Unverified'), 'Reality TV Hub card must expose unverified job recovery');
assert(ui.includes('unverified complete'), 'Reality TV Hub health must display unverified completed jobs');
assert(ui.includes('health.spreadsheetName'), 'Hub card must identify the actual configured target spreadsheet');
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1260-external-results-inbox"'), 'v1.2.1 cache version is missing');
assert(html.includes('hotfix=v1260-external-results-inbox'), 'App shell must load the v1.2.1 cache version');

console.log('External Results Hub verification v1.2.1 tests passed.');
