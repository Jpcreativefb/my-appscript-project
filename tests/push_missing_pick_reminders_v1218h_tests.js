const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const engine = read('backend/engines/NotificationsEngine.js');
const notifications = read('frontend/js/pages/notifications.js');

[
  'notificationPushOutstandingPickSummary_',
  'notificationPushOpenPickQuestionIds_',
  'notificationPushPickedQuestionMapByUser_',
  'audience === "missing_picks"',
  'requiredPickQuestions',
  'noPicksUsers',
  'incompletePicksUsers',
  'completePicksUsers',
  'missingPicksUsers',
  'Players Missing Picks audience',
  'Everyone in this game has completed the currently open picks.'
].forEach(text => assert(engine.includes(text), 'NotificationsEngine missing v1.2.18h contract: ' + text));

[
  'value="missing_picks"',
  'Players who still owe picks',
  'excludes players who already completed every currently open pick question',
  'Pick reminder:',
  '? "picks" : "notifications"'
].forEach(text => assert(notifications.includes(text), 'Notification Center missing v1.2.18h UI contract: ' + text));

const context = vm.createContext({ console });
vm.runInContext(engine, context);

vm.runInContext(`
  getGameById_ = function(){ return { lockAllPicks:false, status:"Active" }; };
  getCategories = function(){ return [
    { categoryId:"q1", active:true, scoreMode:"fixed-points", nominees:[{nomineeId:"a",active:true},{nomineeId:"b",active:true}] },
    { categoryId:"q2", active:true, settings:{scoreMode:"staked-points"}, nominees:[{nomineeId:"a",active:true}] },
    { categoryId:"q3", active:true, scoreMode:"wager", nominees:[{nomineeId:"a",active:true}] },
    { categoryId:"q4", active:true, scoreMode:"ranking", nominees:[{nomineeId:"a",active:true}] },
    { categoryId:"q5", active:true, scoreMode:"correct-pick", nominees:[{nomineeId:"a",active:true}] },
    { categoryId:"q6", active:true, scoreMode:"correct-pick", nominees:[{nomineeId:"a",active:true}] },
    { categoryId:"q7", active:false, scoreMode:"correct-pick", nominees:[{nomineeId:"a",active:true}] },
    { categoryId:"q8", active:true, scoreMode:"correct-pick", nominees:[{nomineeId:"a",active:false}] }
  ]; };
  getCategorySettings = function(){ return {
    q5:{ locked:true },
    q6:{ lockDateTime:"2020-01-01T00:00:00Z" }
  }; };
  SpreadsheetApp = {
    getActive:function(){ return {
      getSheetByName:function(name){
        if (name !== "Picks") return null;
        return { getDataRange:function(){ return { getValues:function(){ return [
          ["GameId","Username","CategoryId","NomineeId"],
          ["game-1","alice","q1","a"],
          ["game-1","bob","q1","b"],
          ["game-1","bob","q2","a"],
          ["other","carol","q1","a"]
        ]; } }; } };
      }
    }; }
  };
`, context);

const openQuestions = vm.runInContext('notificationPushOpenPickQuestionIds_("game-1")', context);
assert.deepStrictEqual(Array.from(openQuestions), ['q1','q2'], 'only active, unlocked, non-wager/ranking questions should require picks');

const summary = vm.runInContext('notificationPushOutstandingPickSummary_("game-1", ["alice","bob","carol","dave"])', context);
assert.strictEqual(summary.requiredQuestions, 2);
assert.deepStrictEqual(Array.from(summary.noPicksUsers).sort(), ['carol','dave']);
assert.deepStrictEqual(Array.from(summary.incompleteUsers), ['alice']);
assert.deepStrictEqual(Array.from(summary.completeUsers), ['bob']);
assert.deepStrictEqual(Array.from(summary.missingUsers).sort(), ['alice','carol','dave']);
assert.strictEqual(summary.details.alice.answered, 1);
assert.strictEqual(summary.details.alice.missing, 1);
assert.strictEqual(summary.details.bob.missing, 0);

vm.runInContext(`
  notificationPushGameParticipants_ = function(){ return ["alice","bob","carol","dave"]; };
  notificationPushPreferenceSnapshot_ = function(){ return { dave:{ app:true, makePicks:false } }; };
  notificationPushGetActiveSubscriptionsForUsers_ = function(usernames){
    var out=[];
    (usernames || []).forEach(function(username){
      if (username === "alice") out.push({username:username,endpoint:"alice-phone"});
      if (username === "carol") {
        out.push({username:username,endpoint:"carol-phone"});
        out.push({username:username,endpoint:"carol-tablet"});
      }
      if (username === "admin") out.push({username:username,endpoint:"admin-phone"});
    });
    return out;
  };
`, context);

const live = vm.runInContext(`notificationPushAudienceResolution_({
  adminUsername:"admin", gameId:"game-1", audience:"missing_picks",
  type:"make_picks", forceTestRecipient:false
})`, context);

assert.strictEqual(live.requiredPickQuestions, 2);
assert.strictEqual(live.noPicksUsers, 2);
assert.strictEqual(live.incompletePicksUsers, 1);
assert.strictEqual(live.completePicksUsers, 1);
assert.strictEqual(live.missingPicksUsers, 3);
assert.strictEqual(live.missingPicksEligibleUsers, 2, 'make-picks preference should remove opted-out users');
assert.strictEqual(live.missingPicksActiveUsers, 2);
assert.strictEqual(live.missingPicksActiveDevices, 3);
assert.strictEqual(live.recipientUsers, 2);
assert.strictEqual(live.activeDevices, 3);
assert.deepStrictEqual(Array.from(live.recipients).sort(), ['alice','carol']);

const testMode = vm.runInContext(`notificationPushAudienceResolution_({
  adminUsername:"admin", gameId:"game-1", audience:"missing_picks",
  type:"make_picks", forceTestRecipient:true
})`, context);
assert.strictEqual(testMode.missingPicksUsers, 3, 'TEST preview must still report real missing-pick audience');
assert.strictEqual(testMode.recipientUsers, 1, 'TEST must still deliver only to the admin');
assert.deepStrictEqual(Array.from(testMode.recipients), ['admin']);
assert.strictEqual(testMode.effectiveAudience, 'self-test');

console.log('v1.2.18h outstanding-pick reminder targeting tests passed.');
