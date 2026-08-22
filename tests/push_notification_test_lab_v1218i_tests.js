const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const engine = read('backend/engines/NotificationsEngine.js');
const ui = read('frontend/js/pages/notifications.js');

[
  'v1.2.18i NOTIFICATION TEST LAB',
  'notificationPushTestLabSynthetic_',
  'notificationPushTestLabReal_',
  'notificationPushTestLabPreview_',
  'testLabPreview',
  'testLabSendToSelf',
  'Test Lab phone delivery requires Global Mode = TEST.',
  'wrotePicks = false',
  'sentPush = false'
].forEach(text => assert(engine.includes(text), 'NotificationsEngine missing 18i contract: ' + text));

[
  '5. Notification Test Lab',
  'Synthetic 5-player simulation',
  'Real game dry run',
  'Run Dry Test',
  'Send TEST Push to Me',
  'runNotificationTestLab_',
  'sendNotificationTestLabPush_',
  'No Picks rows were changed and no push was sent.'
].forEach(text => assert(ui.includes(text), 'Notification Center missing 18i UI contract: ' + text));

const context = vm.createContext({ console });
vm.runInContext(engine, context);

const synthetic = vm.runInContext('notificationPushTestLabSynthetic_(5)', context);
assert.strictEqual(synthetic.success, true);
assert.strictEqual(synthetic.mode, 'synthetic');
assert.strictEqual(synthetic.requiredPickQuestions, 5);
assert.strictEqual(synthetic.players, 5);
assert.strictEqual(synthetic.noPicksUsers, 1);
assert.strictEqual(synthetic.incompletePicksUsers, 3);
assert.strictEqual(synthetic.completePicksUsers, 1);
assert.strictEqual(synthetic.reminderEligibleUsers, 3, 'no-picks + incomplete + no-device are reminder eligible; opted-out is not');
assert.strictEqual(synthetic.wouldReceiveLiveUsers, 2, 'only the no-picks and incomplete synthetic users with devices should receive LIVE');
assert.strictEqual(synthetic.wouldReceiveLiveDevices, 2);
assert.strictEqual(synthetic.rows.find(r => r.username === 'synthetic-complete').wouldReceiveLive, false);
assert.strictEqual(synthetic.rows.find(r => r.username === 'synthetic-no-device').reminderEligible, true);
assert.strictEqual(synthetic.rows.find(r => r.username === 'synthetic-no-device').wouldReceiveLive, false);
assert.strictEqual(synthetic.rows.find(r => r.username === 'synthetic-opted-out').reminderEligible, false);

vm.runInContext(`
  notificationPushGameParticipants_ = function(){ return ["alice","bob","carol","dave"]; };
  notificationPushOutstandingPickSummary_ = function(){ return {
    requiredQuestionIds:["q1","q2","q3"],
    requiredQuestions:3,
    rosterUsers:4,
    noPicksUsers:["carol","dave"],
    incompleteUsers:["alice"],
    completeUsers:["bob"],
    missingUsers:["alice","carol","dave"],
    details:{
      alice:{answered:2,required:3,missing:1},
      bob:{answered:3,required:3,missing:0},
      carol:{answered:0,required:3,missing:3},
      dave:{answered:0,required:3,missing:3}
    }
  }; };
  notificationPushPreferenceSnapshot_ = function(){ return {
    dave:{app:true,makePicks:false}
  }; };
  notificationPushGetActiveSubscriptionsForUsers_ = function(usernames){
    var out=[];
    (usernames || []).forEach(function(username){
      if (username === "alice") out.push({username:"alice",endpoint:"alice-phone"});
      if (username === "bob") out.push({username:"bob",endpoint:"bob-phone"});
      if (username === "dave") out.push({username:"dave",endpoint:"dave-phone"});
    });
    return out;
  };
`, context);

const real = vm.runInContext('notificationPushTestLabReal_("game-1")', context);
assert.strictEqual(real.success, true);
assert.strictEqual(real.mode, 'real');
assert.strictEqual(real.players, 4);
assert.strictEqual(real.requiredPickQuestions, 3);
assert.strictEqual(real.reminderEligibleUsers, 2, 'alice and carol should be reminder eligible; dave opted out');
assert.strictEqual(real.wouldReceiveLiveUsers, 1, 'only alice has missing picks, preference enabled and an active device');
assert.strictEqual(real.wouldReceiveLiveDevices, 1);
assert.strictEqual(real.rows.find(r => r.username === 'bob').reason, 'Excluded — picks complete.');
assert.strictEqual(real.rows.find(r => r.username === 'carol').reason, 'Eligible — but no active push device is registered.');
assert.strictEqual(real.rows.find(r => r.username === 'dave').reason, 'Excluded — player disabled Make Picks alerts.');

const syntheticPreview = vm.runInContext('notificationPushTestLabPreview_({testLabMode:"synthetic",syntheticRequiredPicks:7}, "OFF", null)', context);
assert.strictEqual(syntheticPreview.requiredPickQuestions, 7);
assert.strictEqual(syntheticPreview.dryRunOnly, true);
assert.strictEqual(syntheticPreview.wrotePicks, false);
assert.strictEqual(syntheticPreview.sentPush, false);
assert.strictEqual(syntheticPreview.globalMode, 'OFF', 'dry-run preview must work even while global delivery is OFF');

console.log('v1.2.18i notification test lab tests passed.');
