const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const engine = read('backend/engines/NotificationsEngine.js');
const ui = read('frontend/js/pages/notifications.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');

assert.strictEqual(app, appMirror, 'frontend app mirrors must stay synchronized');
assert(app.includes('v1218j-automatic-pick-reminders'), 'notification module cache marker must be v1.2.18j');

[
  'v1.2.18j AUTOMATIC OUTSTANDING-PICK REMINDER SCHEDULING',
  'AutoReminderEnabled',
  'ReminderOffsetsHours',
  'PUSH_REMINDER_LOG_SHEET',
  'notificationPushReminderOffsets_',
  'notificationPushUpcomingLock_',
  'notificationPushReminderSelectDueOffset_',
  'notificationPushReminderTerminalOffsetsForLock_',
  'notificationPushRunScheduledPickReminders',
  '.everyHours(1)',
  'globalMode === "LIVE"',
  'setting.testOnly',
  'SKIPPED_SUPERSEDED',
  'audience: "missing_picks"',
  'type: "make_picks"',
  'route: "picks"',
  'PUSH_REMINDER_LAST_RUN_AT'
].forEach(text => assert(engine.includes(text), 'NotificationsEngine missing 18j contract: ' + text));

[
  'Automatic outstanding-pick reminders',
  'Reminder hours before lock',
  '24,2',
  'Preview Reminder Timing',
  'previewNotificationReminderSchedule_',
  'Automatic delivery requires Global LIVE + Game ON + not paused + Test only OFF.',
  'Hourly reminder checker installed'
].forEach(text => assert(ui.includes(text), 'Notification Center missing 18j UI contract: ' + text));

const context = vm.createContext({
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Boolean,
  JSON,
  RegExp,
  isFinite
});
vm.runInContext(engine, context);

const offsets = vm.runInContext('notificationPushReminderOffsets_("24, 2, 2, -1, 200")', context);
assert.deepStrictEqual(Array.from(offsets), [24, 2]);

const fractional = vm.runInContext('notificationPushReminderOffsets_("12,1.5,0.5")', context);
assert.deepStrictEqual(Array.from(fractional), [12, 1.5, 0.5]);

const notDue = vm.runInContext('notificationPushReminderSelectDueOffset_([24,2], 30, {})', context);
assert.strictEqual(notDue.offsetHours, 0);

const firstDue = vm.runInContext('notificationPushReminderSelectDueOffset_([24,2], 23.4, {})', context);
assert.strictEqual(firstDue.offsetHours, 24);
assert.deepStrictEqual(Array.from(firstDue.superseded), []);

const urgentDue = vm.runInContext('notificationPushReminderSelectDueOffset_([24,2], 1.4, {})', context);
assert.strictEqual(urgentDue.offsetHours, 2, 'the more urgent 2h reminder must win when both thresholds are already crossed');
assert.deepStrictEqual(Array.from(urgentDue.superseded), [24], 'missed 24h window must be superseded, not sent after the 2h reminder');

const after24 = vm.runInContext('notificationPushReminderSelectDueOffset_([24,2], 1.4, {"24":"COMPLETE"})', context);
assert.strictEqual(after24.offsetHours, 2, '2h reminder must still run after the 24h reminder was sent');

const afterBoth = vm.runInContext('notificationPushReminderSelectDueOffset_([24,2], 1.0, {"24":"COMPLETE","2":"COMPLETE"})', context);
assert.strictEqual(afterBoth.offsetHours, 0, 'same reminder window must never send twice');

const schedulerStart = engine.indexOf('function notificationPushRunScheduledPickReminders()');
assert(schedulerStart >= 0, 'scheduler function missing');
const schedulerBlock = engine.slice(schedulerStart, schedulerStart + 3200);
assert(schedulerBlock.includes('if (globalMode === "LIVE")'), 'automatic delivery must be blocked outside LIVE mode');
assert(!schedulerBlock.includes('forceTestRecipient: true'), 'scheduler must never convert automatic delivery into an admin TEST send');

const processStart = engine.indexOf('function notificationPushProcessScheduledGame_');
const processBlock = engine.slice(processStart, processStart + 3400);
assert(processBlock.includes('setting.testOnly'), 'per-game Test only must block automatic reminders');
assert(processBlock.includes('notificationPushRecentCompletedReminderForGame_'), 'nearby lock times need cooldown protection');


// Runtime-check per-game safety and urgent-window selection without touching Sheets.
vm.runInContext(`
  notificationPushUpcomingLock_ = function(){ return {lockAtMs: Date.now() + (90 * 60 * 1000), lockDateTime:"2026-08-23T18:00:00.000Z", source:"game"}; };
  notificationPushReminderTerminalOffsetsForLock_ = function(){ return {"24":"COMPLETE"}; };
  notificationPushRecentCompletedReminderForGame_ = function(){ return false; };
  __scheduledDeliveries = [];
  notificationPushDeliverScheduledReminder_ = function(gameId, offsetHours, lockDateTime){
    __scheduledDeliveries.push({gameId:gameId, offsetHours:offsetHours, lockDateTime:lockDateTime});
    return {status:"COMPLETE",recipientUsers:2,subscriptionsAttempted:2,sent:2,failed:0,error:""};
  };
  __reminderLogs = [];
  notificationPushReminderLog_ = function(entry){ __reminderLogs.push(entry); };
`, context);

const scheduled = vm.runInContext(`notificationPushProcessScheduledGame_({
  gameId:"game-1", enabled:true, paused:false, testOnly:false,
  autoReminderEnabled:true, reminderOffsetsHours:[24,2]
}, Date.now())`, context);
assert.strictEqual(scheduled.status, 'COMPLETE');
assert.strictEqual(scheduled.offsetHours, 2);
assert.strictEqual(vm.runInContext('__scheduledDeliveries.length', context), 1);
assert.strictEqual(vm.runInContext('__scheduledDeliveries[0].offsetHours', context), 2);

const testOnly = vm.runInContext(`notificationPushProcessScheduledGame_({
  gameId:"game-1", enabled:true, paused:false, testOnly:true,
  autoReminderEnabled:true, reminderOffsetsHours:[24,2]
}, Date.now())`, context);
assert.strictEqual(testOnly.status, 'SKIPPED_SAFETY');
assert.strictEqual(vm.runInContext('__scheduledDeliveries.length', context), 1, 'Test-only game must never create an automatic delivery');

// Runtime-check that the hourly handler does not process games in TEST mode.
vm.runInContext(`
  __props = {};
  PropertiesService = { getScriptProperties:function(){ return {
    setProperty:function(k,v){ __props[k]=String(v); },
    getProperty:function(k){ return __props[k] || ""; }
  }; } };
  LockService = { getScriptLock:function(){ return {tryLock:function(){return true;},releaseLock:function(){}}; } };
  notificationPushGetSystemMode_ = function(){ return "TEST"; };
  notificationPushListAutoReminderSettings_ = function(){ return [{gameId:"game-1",enabled:true,paused:false,testOnly:false,autoReminderEnabled:true,reminderOffsetsHours:[24,2]}]; };
  __schedulerProcessCalls = 0;
  notificationPushProcessScheduledGame_ = function(){ __schedulerProcessCalls++; throw new Error("TEST mode should not process"); };
`, context);
const testScheduler = vm.runInContext('notificationPushRunScheduledPickReminders()', context);
assert.strictEqual(testScheduler.globalMode, 'TEST');
assert.strictEqual(testScheduler.sentBatches, 0);
assert.strictEqual(vm.runInContext('__schedulerProcessCalls', context), 0);

console.log('v1.2.18j automatic outstanding-pick reminder scheduling tests passed.');
