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
const routeHelper = read('tools/update_cloudflare_routes_v1218f.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const sw = read('frontend/sw.js');

assert.strictEqual(apiJs, apiMirror, 'frontend API mirrors must stay identical');
assert.strictEqual(app, appMirror, 'frontend app mirrors must stay identical');

assert(apiJs.includes('fetch("./api/push-subscription"'), 'push register/remove must use same-origin Cloudflare bridge');
assert(apiJs.includes('apiPushSubscriptionPost_("registerPushSubscription"'), 'register must use push bridge helper');
assert(apiJs.includes('apiPushSubscriptionPost_("removePushSubscription"'), 'remove must use push bridge helper');
assert(apiJs.includes('deviceId: deviceId ||'), 'summary request must send device id');

assert(bridge.includes('ALLOWED_ACTIONS'), 'bridge must restrict forwarded actions');
assert(bridge.includes('"registerPushSubscription"'), 'bridge must allow registration');
assert(bridge.includes('"removePushSubscription"'), 'bridge must allow removal');
assert(bridge.includes('text/plain;charset=utf-8'), 'bridge must use Apps Script POST-compatible content type');
assert(bridge.includes('AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo'), 'bridge must target existing production Apps Script deployment');

assert(backendApi.includes('e.parameter.deviceId'), 'push summary route must pass device id');
assert(engine.includes('function apiGetPushSubscriptionSummary(token, deviceId)'), 'backend summary must accept device id');
assert(engine.includes('thisDeviceActive: thisDeviceActive'), 'backend summary must report this exact device');

assert(pwa.includes('awardsPushBackendDeviceStatus_'), 'PWA must reconcile browser and backend status');
assert(pwa.includes('awardsPushVerifyBackendRegistration_'), 'PWA must verify registration after save');
assert(pwa.includes('backend.registered'), 'PWA must not treat browser-only subscription as complete');
assert(pwa.includes('Browser subscribed — repair Awards App registration'), 'PWA must explain repair state');
assert(pwa.includes('Push enabled and registered on this device ✓'), 'PWA success must require stored registration');

assert(profile.includes('const fullyRegistered = device.subscribed === true && device.registered === true'), 'Profile must only hide enable/repair button after backend registration');
assert(profile.includes('Repair Push Registration'), 'Profile must expose repair action');
assert(routeHelper.includes('/api/push-subscription'), 'Cloudflare route helper must include registration bridge');

[app, pwa, sw].forEach((source, i) => {
  assert(source.includes('v1218f2-push-registration'), '18f2 cache marker missing in shell file #' + i);
});

console.log('v1.2.18f2 push subscription registration tests passed.');
