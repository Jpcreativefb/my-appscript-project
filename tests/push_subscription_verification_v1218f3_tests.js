const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const apiJs = read('frontend/js/api.js');
const apiMirror = read('frontend/api.js');
const pwa = read('frontend/js/pwa.js');
const profile = read('frontend/js/pages/profile.js');
const backendApi = read('backend/Api.js');
const engine = read('backend/engines/NotificationsEngine.js');
const bridge = read('functions/api/push-subscription.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const sw = read('frontend/sw.js');
const appHtml = read('frontend/app.html');
const indexHtml = read('frontend/index.html');

assert.strictEqual(apiJs, apiMirror, 'frontend API mirrors must stay identical');
assert.strictEqual(app, appMirror, 'frontend app mirrors must stay identical');

assert(apiJs.includes('apiPushSubscriptionPost_("getPushSubscriptionSummary"'), 'summary verification must use the same-origin push bridge');
assert(apiJs.includes('endpoint: endpoint || ""'), 'summary verification must send the browser push endpoint');
assert(bridge.includes('"getPushSubscriptionSummary"'), 'push bridge must allow exact registration-status checks');

assert(backendApi.includes('body.endpoint'), 'POST summary route must forward the push endpoint');
assert(backendApi.includes('e.parameter.endpoint'), 'GET compatibility summary route must forward the push endpoint');
assert(engine.includes('function apiGetPushSubscriptionSummary(token, deviceId, endpoint)'), 'backend summary must accept endpoint verification');
assert(engine.includes('rowEndpoint === requestedEndpoint'), 'backend must match the exact push endpoint');
assert(engine.includes('matchedBy = "endpoint"'), 'backend must report endpoint matching');
assert(engine.includes('matchedBy = "deviceId"'), 'backend must retain device-id fallback matching');

assert(pwa.includes('awardsPushBackendDeviceStatus_(deviceId, endpoint)'), 'PWA backend status must accept endpoint');
assert(pwa.includes('String(subscription.endpoint || "")'), 'PWA must verify the actual browser endpoint');
assert(pwa.includes('awardsPushVerifyBackendRegistration_(\n    deviceId,\n    String(subscription.endpoint || "")'), 'post-save verification must use the exact endpoint');

assert(profile.includes('let PROFILE_PUSH_STATUS_REQUEST_ = 0;'), 'Profile must track push-status request sequence');
assert(profile.includes('const requestId = ++PROFILE_PUSH_STATUS_REQUEST_;'), 'Profile status checks must receive a sequence id');
assert(profile.includes('if (requestId !== PROFILE_PUSH_STATUS_REQUEST_) return;'), 'stale status responses must not overwrite newer registration state');
assert(profile.includes('PROFILE_PUSH_STATUS_REQUEST_++;'), 'registration must invalidate older status requests');

[
  app,
  pwa,
  sw,
  appHtml,
  indexHtml
].forEach((source, i) => {
  assert(source.includes('v1218f3-registration-verification'), '18f3 cache marker missing in shell file #' + i);
});

console.log('v1.2.18f3 push subscription verification tests passed.');

// Runtime backend matching test: endpoint is authoritative even if a client-side
// device id changes, while device id remains a compatibility fallback.
const vm = require('vm');
const context = { console };
vm.createContext(context);
vm.runInContext(engine, context);
context.requireUserFromToken_ = () => 'testuser';
context.notificationPushSubscriptionsSheet_ = () => ({
  getDataRange: () => ({
    getValues: () => [
      ['SubscriptionId','Username','DeviceId','DeviceLabel','Endpoint','P256dh','Auth','UserAgent','Enabled','CreatedAt','UpdatedAt','LastSuccessAt','FailureCount','LastError','DisabledAt'],
      ['sub-1','testuser','device-original','iPhone','https://push.example/sub-abc','pkey','authkey','ua',true,'','','',0,'','']
    ]
  })
});

const byEndpoint = context.apiGetPushSubscriptionSummary('token', 'device-changed', 'https://push.example/sub-abc');
assert.strictEqual(byEndpoint.thisDeviceActive, true, 'exact endpoint must survive a changed client device id');
assert.strictEqual(byEndpoint.matchedBy, 'endpoint');

const byDevice = context.apiGetPushSubscriptionSummary('token', 'device-original', 'https://push.example/other');
assert.strictEqual(byDevice.thisDeviceActive, true, 'device id must remain a fallback');
assert.strictEqual(byDevice.matchedBy, 'deviceId');

const noMatch = context.apiGetPushSubscriptionSummary('token', 'device-other', 'https://push.example/other');
assert.strictEqual(noMatch.thisDeviceActive, false, 'unrelated device must not be marked registered');
