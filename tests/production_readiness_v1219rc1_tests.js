const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const api = read('frontend/js/api.js');
const sports = read('frontend/js/sports.js');
const backendApi = read('backend/Api.js');
const security = read('backend/core/ApiSecurity.js');
const adminTools = read('backend/admin/AdminTools.js');
const admin = read('frontend/js/pages/admin.js');
const automation = read('backend/engines/AutomationHealthEngine.js');
const bridge = read('functions/api/app.js');
const app = read('frontend/js/app.js');
const sw = read('frontend/sw.js');
const html = read('frontend/app.html');
const status = read('PRODUCTION_STATUS.md');

assert(/^1\.2\.19-rc\.[1234]$/.test(pkg.version), 'package version must identify the v1.2.19 production candidate');
assert(/v1219rc[1234]-(production-readiness|performance-certification|final-performance|cache-persistence)/.test(app), 'app asset marker must include production candidate');
assert(/v1219rc[1234]-(production-readiness|performance-certification|final-performance|cache-persistence)/.test(sw), 'service worker marker must include production candidate');
assert(/prod=v1219rc[1234]-(production-readiness|performance-certification|final-performance|cache-persistence)/.test(html), 'app shell must force-refresh production candidate API/PWA assets');

assert(api.includes('const API_APP_PROXY = "./api/app";'), 'frontend must use repo-owned generic POST bridge');
assert(api.includes('const API_GET_SAFE_ACTIONS_ = new Set([\n  "health"'), 'only health may use the public GET helper');
assert(api.includes('method === "GET"\n      ? await apiRaw_'), 'api() must choose POST for authenticated actions');
assert(api.includes('await apiPostRaw_(action, params)'), 'authenticated generic API calls must route through POST');
assert(bridge.includes('export async function onRequestPost'), 'repo-owned /api/app POST handler is missing');
assert(bridge.includes('APPS_SCRIPT_API_URL'), 'repo-owned bridge must forward to Apps Script');
assert(!bridge.includes('token='), 'repo-owned bridge must not place auth tokens in URLs');

assert(security.includes('function apiSecurityAllowsGet_(action)'), 'backend GET allowlist helper is missing');
assert(security.includes('function apiSecurityRequiresPost_(action)'), 'backend POST requirement classifier is missing');
assert(security.includes('if (apiSecurityIsAdminAction_(action)) return !apiSecurityAdminReadAction_(action);'), 'admin mutations must default to POST-only');
assert(security.includes('savePick: true') && security.includes('createLeague: true'), 'player/account writes must be explicitly POST-only');
assert(backendApi.includes('var API_INTERNAL_POST_ROUTE_ = false;'), 'internal POST router flag is missing');
assert(backendApi.includes('return doGet({ parameter: body });'), 'POST router must reuse mature route table internally');
assert(backendApi.includes('!apiSecurityAllowsGet_(action)'), 'GET mutation boundary is not enforced');

assert(sports.includes('const SPORTS_AWARDS_POST_PROXY_URL = "./api/app";'), 'sports admin requests must use repo-owned POST bridge');
assert(sports.includes('return sportsAwardsPost_(action, params || {});'), 'sports Awards API must not send authenticated calls through JSONP');

assert(adminTools.includes('includeDetails'), 'admin summary must support compact/lazy details');
assert(adminTools.includes('adminQuickSheetRowCount_'), 'admin summary must use lightweight row counts');
assert(admin.includes('apiAdminSummary(false)'), 'admin landing page must request compact summary');
assert(admin.includes("adminLoadLegacyControls_('users')"), 'user controls must remain available lazily');
assert(admin.includes("adminLoadLegacyControls_('categories')"), 'category controls must remain available lazily');
assert(admin.includes('Games & Design'), 'organized Admin Games section missing');
assert(admin.includes('Results & Scoring'), 'organized Admin Results section missing');
assert(admin.includes('Players & Leagues'), 'organized Admin Players section missing');
assert(admin.includes('System & Automation'), 'organized Admin System section missing');
assert(admin.includes('Advanced / Repair'), 'organized Admin Advanced section missing');
assert(!/adminEnhanceMainAdminSections[\s\S]{0,900}adminExternalResultsInboxRefresh\(null, true\)/.test(admin), 'admin page must not auto-poll External Results Inbox on startup');

assert(admin.includes('Start From Template'), 'Create New Game template selector missing');
['Standard Prediction','NFL Confidence Pool','Sports Wager','Ranking Game','Manual Survivor / Elimination','NFL Survivor','NFL Streak Survivor','King of the Hill','Team Fantasy Football','Voting / Competition','Awards Show','Reality Competition','Hybrid / Multi-Mode']
  .forEach((label) => assert(admin.includes(label), `built-in game template missing: ${label}`));

assert(automation.includes('AUTOMATION_HEALTH_TRIGGER_LIMIT_ = 20'), 'automation trigger capacity guard missing');
assert(automation.includes('apiAdminGetAutomationHealth'), 'automation health API missing');
assert(automation.includes('apiAdminCleanupDuplicateAutomationTriggers'), 'safe duplicate trigger cleanup API missing');
assert(automation.includes('classification.kind === "durable"'), 'duplicate cleanup must be limited to durable workers');
assert(backendApi.includes('adminGetAutomationHealth'), 'automation health route missing');
assert(backendApi.includes('adminCleanupDuplicateAutomationTriggers'), 'automation cleanup route missing');

assert(status.includes('v1.2.19-rc'), 'production status still points to an obsolete release');
assert(!status.includes('Deliberately not production-enabled yet\n\n- Generic **Ranking**'), 'production status must not claim Ranking is still disabled');

console.log('production-readiness-v1.2.19-rc1-tests: PASS');
