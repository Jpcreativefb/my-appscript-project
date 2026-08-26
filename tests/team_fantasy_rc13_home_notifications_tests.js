const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const tfSource = read('backend/engines/SportsTeamFantasyEngine.js');
const notificationsSource = read('backend/engines/NotificationsEngine.js');
const appDataSource = read('backend/engines/AppDataEngine.js');
const adminSource = read('frontend/js/pages/adminTeamFantasy.js');

function makeTfHarness() {
  let uuid = 0;
  const context = {
    console, Date, Math, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map,
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    Utilities: { getUuid: () => 'uuid-' + (++uuid) + '-abcdefghij' },
    SpreadsheetApp: { flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    getGame: id => ({ id, gameId: id, type: 'team-fantasy', year: 2026 }),
    requireAdminFromToken_: () => 'admin'
  };
  vm.createContext(context);
  vm.runInContext(tfSource, context, { filename: 'SportsTeamFantasyEngine.js' });
  const db = {};
  const rawRows = name => db[name] || (db[name] = []);
  const readRows = name => rawRows(name).map((row, index) => ({ ...row, _rowNumber: index + 2 }));
  context.teamFantasyEnsureSheet_ = () => ({});
  context.setupSportsTeamFantasySystem = () => ({ success: true });
  context.teamFantasyReadRows_ = readRows;
  context.teamFantasyWriteObjectRow_ = (name, rowNumber, values) => { rawRows(name)[rowNumber - 2] = { ...values }; };
  context.teamFantasyAppendObject_ = (name, values) => { rawRows(name).push({ ...values }); return rawRows(name).length + 1; };
  context.teamFantasyUpsert_ = (name, matcher, values) => {
    const rows = rawRows(name); const found = readRows(name).findIndex(matcher);
    if (found >= 0) { rows[found] = { ...rows[found], ...(values || {}) }; return found + 2; }
    rows.push({ ...(values || {}) }); return rows.length + 1;
  };
  const setSettings = (extra = {}) => { db.TeamFantasySettings = [{ ...context.teamFantasyDefaultSettings_('g'), ...extra }]; };
  return { context, db, setSettings };
}

// Home Hub: one 8-position lineup with 3 saved picks must report exactly 5 remaining.
{
  const { context, db, setSettings } = makeTfHarness();
  setSettings({ SeasonYear: 2026, CurrentWeek: 1, EntryMode: 'single', RegularSeasonEndWeek: 18 });
  db.TeamFantasyEntries = [{ GameId:'g', EntryId:'e1', Username:'alice', EntryName:'alice', Conference:'ALL', Active:true }];
  db.TeamFantasyPicks = ['QB','RB','WRTE'].map((pos, i) => ({
    GameId:'g', SeasonYear:2026, Week:1, EntryId:'e1', Username:'alice', Position:pos, TeamAbbr:['BUF','KC','DET'][i]
  }));
  const progress = context.teamFantasyDashboardProgress_('g','alice');
  assert.strictEqual(progress.totalCount, 8);
  assert.strictEqual(progress.madeCount, 3);
  assert.strictEqual(progress.remainingCount, 5);
  assert.strictEqual(progress.userSummary, '5 picks remaining');

  const app = { console, Date, Math, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map, isNaN, isFinite, parseInt, parseFloat };
  vm.createContext(app); vm.runInContext(appDataSource, app);
  app.teamFantasyDashboardProgress_ = () => progress;
  const home = app.getDashboardGameProgressLite_({gameId:'g'}, 'alice', 'team-fantasy', {});
  assert.strictEqual(home.remainingCount, 5, 'Home Hub must expose Team Fantasy picks remaining');
}

// Before first Team Fantasy open, AFC/NFC mode is still deterministically 16 required picks without creating entries.
{
  const { context, db, setSettings } = makeTfHarness();
  setSettings({ SeasonYear:2026, CurrentWeek:1, EntryMode:'afc-nfc', RegularSeasonEndWeek:18 });
  const before = (db.TeamFantasyEntries || []).length;
  const progress = context.teamFantasyDashboardProgress_('g','alice');
  assert.strictEqual(progress.totalCount, 16);
  assert.strictEqual(progress.remainingCount, 16);
  assert.strictEqual((db.TeamFantasyEntries || []).length, before, 'Home progress must remain read-only');
}

// Team Fantasy kickoff windows: enabled toggles select Thursday first kickoff, Sunday first kickoff, and final kickoff.
{
  const { context, setSettings } = makeTfHarness();
  setSettings({ ReminderEnabled:true, ReminderThursday:true, ReminderSunday:true, ReminderFinalWindow:true });
  context.teamFantasyFetchWeekSchedule_ = () => ({ games: [
    {gameDateTime:'2026-09-10T18:00:00Z'}, // Thursday
    {gameDateTime:'2026-09-13T17:00:00Z'}, // Sunday first
    {gameDateTime:'2026-09-13T23:00:00Z'}, // Sunday late
    {gameDateTime:'2026-09-14T23:00:00Z'}  // Monday / final
  ] });
  let windows = context.teamFantasyReminderKickoffWindows_('g', Date.parse('2026-09-09T00:00:00Z')).windows;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(windows.map(w => w.window))), ['thursday','sunday','final']);
  assert.strictEqual(windows[0].lockDateTime, '2026-09-10T18:00:00.000Z');
  assert.strictEqual(windows[1].lockDateTime, '2026-09-13T17:00:00.000Z');
  assert.strictEqual(windows[2].lockDateTime, '2026-09-14T23:00:00.000Z');

  setSettings({ ReminderEnabled:true, ReminderThursday:false, ReminderSunday:true, ReminderFinalWindow:false });
  context.teamFantasyFetchWeekSchedule_ = () => ({ games: [
    {gameDateTime:'2026-09-10T18:00:00Z'}, {gameDateTime:'2026-09-13T17:00:00Z'}, {gameDateTime:'2026-09-14T23:00:00Z'}
  ] });
  windows = context.teamFantasyReminderKickoffWindows_('g', Date.parse('2026-09-09T00:00:00Z')).windows;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(windows.map(w => w.window))), ['sunday']);
}

// Send Reminder Now: Global TEST must resolve only to the signed-in admin, never missing players.
for (const scenario of [
  { globalMode:'TEST', gameTestOnly:false, label:'Global TEST' },
  { globalMode:'LIVE', gameTestOnly:true, label:'per-game Test Only' }
]) {
  const { context, setSettings } = makeTfHarness();
  setSettings({ ReminderEnabled:true });
  context.teamFantasyParticipantUsernames_ = () => ['alice','bob'];
  context.teamFantasyNotificationOutstandingSummary_ = () => ({
    missingUsers:['alice','bob'],
    details:[
      {username:'alice',picked:2,required:8,missing:['QB'],missingCount:1},
      {username:'bob',picked:0,required:8,missing:['RB'],missingCount:1}
    ]
  });
  context.notificationPushGetSystemMode_ = () => scenario.globalMode;
  context.notificationPushGetGameSetting_ = () => ({ enabled:true, paused:false, testOnly:scenario.gameTestOnly });
  context.notificationPushPreferenceSnapshot_ = () => ({});
  context.notificationPushUserAllowsType_ = () => true;
  const requested = [];
  context.notificationPushGetActiveSubscriptionsForUsers_ = users => {
    requested.push(users.slice());
    return users.map(username => ({ username, subscriptionId:'sub-'+username }));
  };
  let gatewaySubs = null;
  context.notificationPushGatewaySend_ = (subs) => { gatewaySubs = subs.map(x => x.username); return {success:true,sent:subs.length,failed:0,results:[]}; };
  context.notificationPushMarkDeliveryResult_ = () => {};
  const result = context.apiAdminSendTeamFantasyReminder({gameId:'g'});
  assert.strictEqual(result.testDelivery, true, scenario.label + ' must be test delivery');
  assert.strictEqual(JSON.stringify(requested), JSON.stringify([['admin']]), scenario.label + ' must request only admin subscription');
  assert.strictEqual(JSON.stringify(gatewaySubs), JSON.stringify(['admin']), scenario.label + ' must never send to players');
}

// LIVE + not test-only keeps the existing targeted player behavior.
{
  const { context, setSettings } = makeTfHarness();
  setSettings({ ReminderEnabled:true });
  context.teamFantasyParticipantUsernames_ = () => ['alice'];
  context.teamFantasyNotificationOutstandingSummary_ = () => ({ missingUsers:['alice'], details:[{username:'alice',picked:7,required:8,missing:['DB'],missingCount:1}] });
  context.notificationPushGetSystemMode_ = () => 'LIVE';
  context.notificationPushGetGameSetting_ = () => ({ enabled:true, paused:false, testOnly:false });
  context.notificationPushPreferenceSnapshot_ = () => ({});
  context.notificationPushUserAllowsType_ = () => true;
  let requested = [];
  context.notificationPushGetActiveSubscriptionsForUsers_ = users => { requested.push(users[0]); return [{username:users[0],subscriptionId:'s'}]; };
  context.notificationPushGatewaySend_ = subs => ({success:true,sent:subs.length,failed:0,results:[]});
  context.notificationPushMarkDeliveryResult_ = () => {};
  const result = context.apiAdminSendTeamFantasyReminder({gameId:'g'});
  assert.strictEqual(result.testDelivery, false);
  assert.deepStrictEqual(requested, ['alice']);
}

// Notification Center scheduler: Team Fantasy master toggle is an AND-gate, and Team Fantasy supplies the kickoff lock.
{
  const n = { console, Date, Math, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map, isNaN, isFinite, parseInt, parseFloat };
  vm.createContext(n); vm.runInContext(notificationsSource, n);
  n.teamFantasyIsGame_ = () => true;
  n.teamFantasyReminderPolicy_ = () => ({enabled:false,message:'disabled'});
  let result = n.notificationPushProcessScheduledGame_({gameId:'g',autoReminderEnabled:true,enabled:true,paused:false,testOnly:false,reminderOffsetsHours:[24,2]}, Date.parse('2026-09-09T00:00:00Z'));
  assert.strictEqual(result.status, 'SKIPPED_TEAM_FANTASY_DISABLED');

  n.teamFantasyReminderPolicy_ = () => ({enabled:true});
  n.teamFantasyUpcomingReminderLock_ = () => ({lockAtMs:Date.parse('2026-09-10T18:00:00Z'),lockDateTime:'2026-09-10T18:00:00.000Z',source:'team-fantasy-kickoff',reminderWindow:'thursday'});
  const lock = n.notificationPushUpcomingLock_('g', Date.parse('2026-09-09T00:00:00Z'));
  assert.strictEqual(lock.source, 'team-fantasy-kickoff');
  assert.strictEqual(lock.reminderWindow, 'thursday');

  // A distinct Team Fantasy kickoff window must not be suppressed by the generic cross-lock cooldown.
  n.notificationPushReminderTerminalOffsetsForLock_ = () => ({});
  n.notificationPushReminderSelectDueOffset_ = () => ({offsetHours:2,superseded:[]});
  n.notificationPushRecentCompletedReminderForGame_ = () => true;
  n.notificationPushDeliverScheduledReminder_ = () => ({status:'COMPLETE',recipientUsers:1,subscriptionsAttempted:1,sent:1,failed:0,error:''});
  n.notificationPushReminderLog_ = () => {};
  result = n.notificationPushProcessScheduledGame_({gameId:'g',autoReminderEnabled:true,enabled:true,paused:false,testOnly:false,reminderOffsetsHours:[24,2]}, Date.parse('2026-09-10T16:30:00Z'));
  assert.strictEqual(result.status, 'COMPLETE', 'Team Fantasy explicit kickoff windows must bypass generic cross-lock cooldown');
  assert.strictEqual(result.reminderWindow, 'thursday');
}

// Admin text must reflect the real 5-minute sync and explain the dual-gate reminder policy.
assert(adminSource.includes('<strong>5-min sync</strong>'), 'Admin status must show 5-min sync');
assert(!adminSource.includes('<strong>15-min sync</strong>'), 'Stale Team Fantasy 15-min sync label must be gone');
assert(adminSource.includes('Team Fantasy Missing-pick reminders is the master gate'), 'Admin must explain Team Fantasy master reminder gate');
assert(adminSource.includes('Notification Center must also have this game enabled with Automatic Reminders on'), 'Admin must explain Notification Center AND-gate');

console.log('team-fantasy-rc13-home-notifications-tests: PASS');
