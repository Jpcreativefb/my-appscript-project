const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const engine = read('backend/engines/NotificationsEngine.js');
const notifications = read('frontend/js/pages/notifications.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');

assert.strictEqual(app, appMirror, 'frontend app mirrors must stay synchronized');

[
  'notificationPushAudienceResolution_',
  'previewOnly === true',
  'gameParticipants',
  'gameEligibleUsers',
  'gameActiveUsers',
  'gameActiveDevices',
  'No players have entered this game yet.',
  'seenEndpoints[endpoint]',
  'notificationPushPreferenceSnapshot_'
].forEach(text => assert(engine.includes(text), 'NotificationsEngine missing v1.2.18g targeting contract: ' + text));

[
  'notificationAudiencePreview',
  'previewAdminPushAudience_',
  'previewOnly: true',
  'Game audience:',
  'player(s)',
  'active device(s)',
  'onchange="previewAdminPushAudience_()"'
].forEach(text => assert(notifications.includes(text), 'Notification Center missing v1.2.18g preview: ' + text));

assert(app.includes('name === "notifications"'), 'Notification page module-specific cache buster missing');
assert(app.includes('v1218j-automatic-pick-reminders'), 'notification module cache marker must include the current v1.2.18j automatic reminder release');

// Runtime-check the audience resolver without touching Sheets.
const context = vm.createContext({ console });
vm.runInContext(engine, context);
vm.runInContext(`
  notificationPushGameParticipants_ = function(){ return ["Alice", "bob", "alice"]; };
  notificationPushOutstandingPickSummary_ = function(){ return {
    requiredQuestionIds:["q1"], requiredQuestions:1, rosterUsers:2,
    noPicksUsers:["alice"], incompleteUsers:[], completeUsers:["bob"],
    missingUsers:["alice"], details:{}
  }; };
  notificationPushAllUsernames_ = function(){ return ["alice", "bob", "carol"]; };
  notificationPushPreferenceSnapshot_ = function(){ return { bob: { app: true, lock: false } }; };
  notificationPushUserAllowsType_ = function(username, type, prefs){
    username = String(username || "").toLowerCase();
    if (username === "bob" && type === "lock") return false;
    return true;
  };
  notificationPushGetActiveSubscriptionsForUsers_ = function(usernames){
    return (usernames || []).map(function(username, i){
      return { username: username, endpoint: "endpoint-" + username + "-" + i };
    });
  };
`, context);

const live = vm.runInContext(`notificationPushAudienceResolution_({
  adminUsername: "admin",
  gameId: "game-1",
  audience: "game",
  type: "lock",
  forceTestRecipient: false
})`, context);

assert.strictEqual(live.gameParticipants, 2, 'game participants should be unique');
assert.strictEqual(live.gameEligibleUsers, 1, 'preferences should filter the game audience');
assert.strictEqual(live.recipientUsers, 1, 'LIVE game delivery should resolve eligible game players');
assert.strictEqual(live.activeDevices, 1, 'LIVE game delivery should count active devices');
assert.strictEqual(live.effectiveAudience, 'game');

const testMode = vm.runInContext(`notificationPushAudienceResolution_({
  adminUsername: "admin",
  gameId: "game-1",
  audience: "game",
  type: "lock",
  forceTestRecipient: true
})`, context);

assert.strictEqual(testMode.gameParticipants, 2, 'TEST preview must still report actual game participants');
assert.strictEqual(testMode.recipientUsers, 1, 'TEST delivery must resolve only the admin');
assert.strictEqual(testMode.effectiveAudience, 'self-test', 'TEST mode must remain admin-only');

// The newest registration owns a browser endpoint. A stale older user's row
// must not receive a notification after that endpoint is reassigned.
const subscriptionContext = vm.createContext({ console });
vm.runInContext(engine, subscriptionContext);
vm.runInContext(`
  notificationPushSubscriptionsSheet_ = function(){
    return {
      getDataRange: function(){
        return { getValues: function(){ return [
          ["SubscriptionId","Username","Endpoint","P256dh","Auth","Enabled"],
          ["old-alice","alice","endpoint-shared","key-old","auth-old",true],
          ["alice-own","alice","endpoint-alice","key-a","auth-a",true],
          ["new-bob","bob","endpoint-shared","key-new","auth-new",true]
        ]; }};
      }
    };
  };
`, subscriptionContext);

const aliceSubs = vm.runInContext(`notificationPushGetActiveSubscriptionsForUsers_(["alice"])`, subscriptionContext);
assert.strictEqual(aliceSubs.length, 1, 'stale shared endpoint must not be delivered to the old user');
assert.strictEqual(aliceSubs[0].endpoint, 'endpoint-alice');
const bobSubs = vm.runInContext(`notificationPushGetActiveSubscriptionsForUsers_(["bob"])`, subscriptionContext);
assert.strictEqual(bobSubs.length, 1, 'newest endpoint owner should receive the shared device');
assert.strictEqual(bobSubs[0].endpoint, 'endpoint-shared');

// Preview mode must resolve counts without creating an in-app notification or
// invoking the Cloudflare push gateway.
vm.runInContext(`
  requireAdminFromToken_ = function(){ return "admin"; };
  notificationPushGetSystemMode_ = function(){ return "TEST"; };
  notificationPushGetGameSetting_ = function(){ return { enabled:true, paused:false, testOnly:false }; };
  notificationPushAudienceResolution_ = function(){ return {
    requestedAudience:"game", effectiveAudience:"self-test",
    gameParticipants:4, gameEligibleUsers:3, gameActiveUsers:2, gameActiveDevices:3,
    recipientUsers:1, activeUsers:1, activeDevices:1,
    recipients:["admin"], subscriptions:[{username:"admin"}]
  }; };
  createUserNotification_ = function(){ throw new Error("preview created a notification"); };
  notificationPushGatewaySend_ = function(){ throw new Error("preview invoked gateway"); };
`, context);
const preview = vm.runInContext(`apiAdminSendPushNotification({
  token:"t", gameId:"game-1", audience:"game", type:"lock",
  previewOnly:true
})`, context);
assert.strictEqual(preview.success, true);
assert.strictEqual(preview.preview, true);
assert.strictEqual(preview.gameParticipants, 4);
assert.strictEqual(preview.gameActiveDevices, 3);
assert.strictEqual(preview.testDelivery, true);

console.log('v1.2.18g game-specific push audience targeting tests passed.');
