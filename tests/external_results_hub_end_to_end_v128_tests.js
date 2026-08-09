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
const hubCore = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/HubCore.js'), 'utf8');
const providers = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/ProviderAdapters.js'), 'utf8');
const hubBridge = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/ReviewAndBridge.js'), 'utf8');
const diagnostics = fs.readFileSync(path.join(root, 'external-engines/external-results-hub/Diagnostics.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

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

// Inbox lifecycle + Reality TV reconciliation.
['NativeRoute', 'NativeQueueId', 'NativeStatus', 'NativeUpdatedAt'].forEach(header => {
  assert(bridge.includes(`"${header}"`), `Inbox native lifecycle header ${header} is missing`);
  assert(hubBridge.includes(`"${header}"`), `Hub delivery target header ${header} is missing`);
});
assert(bridge.includes('function externalResultsInboxReconcileReality_'), 'Reality TV Inbox reconciliation is missing');
assert(functionSource(bridge, 'externalResultsInboxSummary_').includes('externalResultsInboxReconcileReality_()'), 'Inbox refresh must reconcile staged Reality TV results');
assert(functionSource(bridge, 'externalResultsInboxValidateGroup_').includes('Reality TV native settlement only accepts the manual-reality-tv provider'), 'Reality native provider isolation is missing');
assert(functionSource(bridge, 'externalResultsInboxValidateGroup_').includes('already has a Reality TV native queue with a different result'), 'Reality duplicate/conflict protection is missing');
assert(functionSource(bridge, 'externalResultsInboxStageRealityQuestion_').includes('validation.nativeReality'), 'Reality Extra Question staging must reuse an existing native queue');
assert(functionSource(bridge, 'externalResultsInboxStageRealityMain_').includes('validation.nativeReality'), 'Reality elimination staging must reuse an existing native queue');
assert(functionSource(bridge, 'apiAdminApplyExternalResultsInbox').includes('NativeQueueId'), 'Staged Reality results must persist their native queue ID');
assert(api.includes('adminReconcileExternalResultsInbox'), 'Backend reconcile API action is missing');
assert(frontendApi.includes('apiAdminReconcileExternalResultsInbox'), 'Frontend reconcile API helper is missing');
assert.strictEqual(frontendApi, frontendApiCompat, 'Frontend API copies must match');
assert(admin.includes('Sync Reality Status'), 'Admin Inbox must expose Reality TV reconciliation');
assert(admin.includes('Reality queue:'), 'Admin Inbox must display native Reality queue state');
assert(admin.includes('rejected'), 'Admin Inbox must display rejected Reality deliveries');

// Runtime reconciliation behavior.
const reconcilePatches = [];
const reconcileCtx = {
  Date,
  Object,
  externalResultsInboxGroups_: () => ({
    approved: [{ DeliveryBatchId: 'approved' }],
    rejected: [{ DeliveryBatchId: 'rejected' }],
    pending: [{ DeliveryBatchId: 'pending' }],
    missing: [{ DeliveryBatchId: 'missing' }]
  }),
  externalResultsInboxExistingRealityDelivery_: rows => {
    const id = rows[0].DeliveryBatchId;
    if (id === 'approved') return { route: 'REALITY_QUESTION', queueId: 'q1', reviewStatus: 'APPROVED', pushStatus: 'PUSHED', completedAt: new Date('2026-08-09T10:00:00Z'), error: '' };
    if (id === 'rejected') return { route: 'REALITY_MAIN', queueId: 'q2', reviewStatus: 'REJECTED', pushStatus: 'NOT PUSHED', completedAt: '', error: 'Rejected for correction' };
    if (id === 'pending') return { route: 'REALITY_MAIN', queueId: 'q3', reviewStatus: 'APPROVING', pushStatus: 'ERROR', completedAt: '', error: 'Native worker needs recovery' };
    return null;
  },
  externalResultsInboxPatchRows_: (rows, patch) => reconcilePatches.push({ id: rows[0].DeliveryBatchId, patch })
};
vm.createContext(reconcileCtx);
vm.runInContext(functionSource(bridge, 'externalResultsInboxReconcileReality_'), reconcileCtx);
const reconcileResult = reconcileCtx.externalResultsInboxReconcileReality_();
assert.strictEqual(reconcileResult.applied, 1, 'Approved native Reality result must reconcile to APPLIED');
assert.strictEqual(reconcileResult.rejected, 1, 'Rejected native Reality result must reconcile to REJECTED');
assert.strictEqual(reconcileResult.nativeErrors, 1, 'Native worker errors must remain visible without restaging');
assert.strictEqual(reconcileResult.missing, 1, 'Missing native queues must be reported');
const approvedPatch = reconcilePatches.find(item => item.id === 'approved').patch;
const rejectedPatch = reconcilePatches.find(item => item.id === 'rejected').patch;
const pendingPatch = reconcilePatches.find(item => item.id === 'pending').patch;
assert.strictEqual(approvedPatch.Status, 'APPLIED');
assert.strictEqual(approvedPatch.NativeQueueId, 'q1');
assert.strictEqual(rejectedPatch.Status, 'REJECTED');
assert.strictEqual(pendingPatch.NativeStatus, 'ERROR');
assert(!Object.prototype.hasOwnProperty.call(pendingPatch, 'Status'), 'Native ERROR must not cause a second Inbox staging attempt');

// Mapped-only provider watching.
assert(hubCore.includes('const ERH_SCHEMA_VERSION = "2.2.0"'), 'Hub schema must be v2.2.0');
['Sync Mapped Kalshi Results', 'Sync Mapped Polymarket Results', 'Sync All Mapped Results', 'Install Hourly Mapped Result Watch'].forEach(label => {
  assert(hubCore.includes(label), `Hub menu item missing: ${label}`);
});
assert(functionSource(providers, 'erhMappedProviderTargets_').includes('ERH_SHEETS.MAPPINGS'), 'Mapped watch must derive targets from AppMappings');
assert(functionSource(providers, 'erhMappedProviderTargets_').includes('mapping.Active'), 'Mapped watch must ignore inactive mappings');
assert(functionSource(providers, 'syncMappedKalshiNow').includes('erhMappedProviderTargets_("kalshi")'), 'Kalshi mapped sync must poll active mappings only');
assert(functionSource(providers, 'syncMappedPolymarketNow').includes('erhMappedProviderTargets_("polymarket")'), 'Polymarket mapped sync must poll active mappings only');
assert(functionSource(providers, 'erhFetchKalshiMappedMarket_').includes('/historical/markets?'), 'Kalshi mapped sync needs historical-market fallback');
assert(functionSource(providers, 'erhFetchPolymarketMappedMarket_').includes('/markets/'), 'Polymarket mapped sync must support direct market-by-id lookup');
assert(functionSource(providers, 'installExternalResultsProviderWatch').includes('.everyHours(1)'), 'Mapped provider watch must run hourly');
assert(functionSource(providers, 'erhScheduledMappedProviderSync').includes('syncMappedKalshiNow()'), 'Scheduled watch must run mapped Kalshi sync');
assert(functionSource(providers, 'erhScheduledMappedProviderSync').includes('syncMappedPolymarketNow()'), 'Scheduled watch must run mapped Polymarket sync');
assert(diagnostics.includes('providerWatchInstalled'), 'Hub health check must report provider watch state');
assert(diagnostics.includes('mappedTargets'), 'Hub health check must report mapped provider target counts');

// Kalshi safety: a missing/blank settlement value on an open market must never become a false "No" result.
const kalshiCtx = {
  Number,
  Boolean,
  Date,
  String,
  NumberIsFinite: Number.isFinite,
  imported: [],
};
kalshiCtx.erhString_ = value => String(value === undefined || value === null ? '' : value).trim();
kalshiCtx.erhKey_ = value => kalshiCtx.erhString_(value).toLowerCase();
kalshiCtx.erhImportNormalizedResult_ = value => { kalshiCtx.imported.push(value); return { duplicate: false, queueCreated: true }; };
vm.createContext(kalshiCtx);
vm.runInContext(functionSource(providers, 'erhMaybeImportKalshiResult_'), kalshiCtx);
const openBlank = kalshiCtx.erhMaybeImportKalshiResult_({ status: 'open', settlement_value_dollars: '' }, null, { WinningOutcome: '', ExternalEventId: 'e', ExternalMarketId: 'm', SourceUrl: 'u', ResolutionSource: '' });
assert.strictEqual(openBlank, null, 'Open Kalshi market with blank settlement must not import a false No result');
assert.strictEqual(kalshiCtx.imported.length, 0);
const settledNo = kalshiCtx.erhMaybeImportKalshiResult_({ status: 'settled', settlement_value_dollars: '0.0000', settlement_ts: '2026-08-09T10:00:00Z', is_provisional: false }, null, { WinningOutcome: 'No', ExternalEventId: 'e', ExternalMarketId: 'm', SourceUrl: 'u', ResolutionSource: '' });
assert(settledNo, 'Settled Kalshi market must import');
assert.strictEqual(kalshiCtx.imported[0].WinningOutcome, 'No');
assert.strictEqual(kalshiCtx.imported[0].Finality, 'FINAL');

assert(functionSource(hubBridge, 'erhMappingDeliveryKey_').includes('erhSha256_'), 'Blank MappingId values need a deterministic delivery-key fallback');
assert(functionSource(hubBridge, 'pushApprovedExternalResultsNow').includes('erhMappingDeliveryKey_(mapping)'), 'Hub delivery must use the deterministic mapping key');
const importNormalized = functionSource(hubCore, 'erhImportNormalizedResult_');
assert(!importNormalized.slice(0, importNormalized.indexOf('const sourceFingerprint')).includes('ProviderTimestamp'), 'Provider result identity must not depend on a changing provider timestamp');
assert(importNormalized.includes('erhKey_(row.ExternalMarketId) === erhKey_(input.ExternalMarketId)'), 'Provider result dedupe must match the stable market/outcome identity');

// Delivery remains one-way into the Inbox and duplicate-safe.
const pushFn = functionSource(hubBridge, 'pushApprovedExternalResultsNow');
assert(pushFn.includes('existingDeliveryIds'), 'Hub delivery must detect previously delivered row IDs');
assert(pushFn.includes('Already delivered; no duplicate inbox rows added.'), 'Duplicate Hub delivery must be a no-op');
assert(pushFn.includes('ExternalResultsInbox'), 'Hub must deliver only to ExternalResultsInbox');
assert(!pushFn.includes('CategoryResults'), 'Hub must never settle CategoryResults directly');

// Current frontend checkpoint.
assert(app.includes('APP_ASSET_VERSION = "313-external-results-hub-end-to-end"'));
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1280-external-results-hub-end-to-end"'));
assert(html.includes('313-external-results-hub-end-to-end'));
assert(html.includes('hotfix=v1280-external-results-hub-end-to-end'));
assert(sw.includes('awards-app-v313-external-results-hub-end-to-end'));

console.log('External Results Hub end-to-end v1.2.8 tests passed.');
