const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const engine = read('backend/engines/NotificationsEngine.js');
const api = read('backend/Api.js');
const apiJs = read('frontend/js/api.js');
const apiMirror = read('frontend/api.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const profile = read('frontend/js/pages/profile.js');
const notifications = read('frontend/js/pages/notifications.js');
const pushSend = read('functions/api/push-send.js');
const pushKey = read('functions/api/push-public-key.js');
const pushSubscription = read('functions/api/push-subscription.js');
const pkg = JSON.parse(read('package.json'));
const routeHelper = read('tools/update_cloudflare_routes_v1218f.js');

assert.strictEqual(apiJs, apiMirror, 'frontend API mirrors must stay identical');
assert(!('type' in pkg), 'package.json must not set type=module because existing regression tests are CommonJS');
assert(pkg.dependencies && pkg.dependencies['@pushforge/builder'], 'Cloudflare Web Push builder dependency missing');

[
  'const PUSH_SUBSCRIPTIONS_SHEET = "PushSubscriptions"',
  'return "OFF";',
  'enabled: false',
  'testOnly: true',
  'apiRegisterPushSubscription',
  'apiRemovePushSubscription',
  'apiAdminGetPushControlCenter',
  'apiAdminSavePushGatewayConfig',
  'apiAdminSavePushSystemMode',
  'apiAdminSaveGameNotificationSettings',
  'apiAdminSendPushNotification',
  'globalMode === "TEST"',
  'gameSetting.testOnly === true',
  'notificationPushGameParticipants_',
  '["UserGameProfiles", "Picks", "Bets"]',
  'PUSH_GATEWAY_TOKEN',
  'PropertiesService.getScriptProperties()'
].forEach(text => assert(engine.includes(text), 'NotificationsEngine missing: ' + text));

[
  'registerPushSubscription',
  'removePushSubscription',
  'adminSavePushGatewayConfig',
  'adminSavePushSystemMode',
  'adminSaveGameNotificationSettings',
  'adminSendPushNotification',
  'getPushSubscriptionSummary',
  'adminGetPushControlCenter'
].forEach(action => assert(api.includes('action === "' + action + '"'), 'Api route missing: ' + action));

[
  'apiRegisterPushSubscription',
  'apiRemovePushSubscription',
  'apiAdminGetPushControlCenter',
  'apiAdminSavePushGatewayConfig',
  'apiAdminSavePushSystemMode',
  'apiAdminSaveGameNotificationSettings',
  'apiAdminSendPushNotification'
].forEach(fn => assert(apiJs.includes('function ' + fn) || apiJs.includes('async function ' + fn), 'frontend API missing: ' + fn));

assert(pwa.includes('Notification.requestPermission()'), 'push permission request missing');
assert(pwa.includes('userVisibleOnly: true'), 'PushManager subscription must be userVisibleOnly');
assert(pwa.includes('applicationServerKey'), 'VAPID applicationServerKey missing');
assert(pwa.includes('./api/push-public-key'), 'Cloudflare public key route missing from client');
assert(profile.includes('Enable Push on This Device'), 'profile device-enable control missing');
assert(profile.includes('Disable on This Device'), 'profile device-disable control missing');

assert(sw.includes('self.addEventListener("push"'), 'service worker push handler missing');
assert(sw.includes('showNotification'), 'service worker must show a visible notification');
assert(sw.includes('self.addEventListener("notificationclick"'), 'notification click handler missing');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'service-worker cache marker missing');

['OFF — send nothing', 'TEST — admin only', 'LIVE — normal delivery', 'Notifications ON for this game', 'Pause this game', 'Test only', 'Players in this game only', 'Send Notification'].forEach(text => {
  assert(notifications.includes(text), 'Admin Notification Center missing: ' + text);
});

assert(pushSend.includes('buildPushHTTPRequest'), 'Cloudflare sender must build standards-based Web Push request');
assert(pushSend.includes('Authorization'), 'Cloudflare sender must require gateway authorization');
assert(pushSend.includes('PUSH_GATEWAY_TOKEN'), 'Cloudflare sender token secret missing');
assert(pushSend.includes('VAPID_PRIVATE_JWK'), 'Cloudflare private VAPID secret missing');
assert(pushSend.includes('VAPID_SUBJECT'), 'VAPID subject missing');
assert(pushKey.includes('VAPID_PUBLIC_KEY'), 'public VAPID key endpoint missing');

assert(fs.existsSync(path.join(root, 'tools/generate_push_cloudflare_setup.js')), 'Cloudflare setup generator missing');

assert(routeHelper.includes('/api/push-public-key'), 'Cloudflare route helper missing public-key route');
assert(routeHelper.includes('/api/push-send'), 'Cloudflare route helper missing push-send route');
assert(routeHelper.includes('/api/push-subscription'), 'Cloudflare route helper missing push-subscription route');
assert(pushSubscription.includes('registerPushSubscription'), 'push subscription bridge missing register action');
assert(pushSubscription.includes('removePushSubscription'), 'push subscription bridge missing remove action');
const routeFile = path.join(root, 'frontend/_routes.json');
if (fs.existsSync(routeFile)) {
  const routes = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
  assert(Array.isArray(routes.include) && routes.include.includes('/api/push-public-key'), 'frontend/_routes.json missing public-key route');
  assert(routes.include.includes('/api/push-send'), 'frontend/_routes.json missing push-send route');
  assert(routes.include.includes('/api/push-subscription'), 'frontend/_routes.json missing push-subscription route');
}


console.log('v1.2.18f push notification infrastructure/admin control tests passed.');
