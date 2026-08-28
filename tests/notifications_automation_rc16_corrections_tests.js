const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const notifications = read('backend/engines/NotificationsEngine.js');
const teamFantasy = read('backend/engines/SportsTeamFantasyEngine.js');
const automation = read('backend/engines/AutomationHealthEngine.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert.strictEqual(app, appMirror, 'frontend app mirrors must remain synchronized');

function functionSource(source, name) {
  const asyncNeedle = 'async function ' + name + '(';
  const plainNeedle = 'function ' + name + '(';
  let start = source.indexOf(asyncNeedle);
  if (start < 0) start = source.indexOf(plainNeedle);
  assert(start >= 0, 'Missing function ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escape = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unclosed function ' + name);
}

function makeContext(extra = {}) {
  return vm.createContext(Object.assign({
    console, Date, Math, Number, String, Array, Object, Boolean, JSON, RegExp,
    isFinite, encodeURIComponent, decodeURIComponent, URL, Promise, setTimeout, clearTimeout
  }, extra));
}

// ---------------------------------------------------------------------------
// 1. Canonical game-safe push routing
// ---------------------------------------------------------------------------
{
  const c = makeContext();
  vm.runInContext(notifications, c);
  const dest = vm.runInContext('notificationPushGameDestination_("game A/1", "picks")', c);
  assert.strictEqual(dest.gameId, 'game A/1');
  assert.strictEqual(dest.route, 'picks');
  assert(dest.url.includes('notificationGameId=game%20A%2F1'));
  assert(dest.url.endsWith('#picks'));

  const canonical = vm.runInContext(`notificationPushCanonicalizeDestination_({
    title:'x', route:'picks', data:{gameId:'game-new',route:'picks',url:'./app.html?notificationGameId=game-old#notifications'}
  })`, c);
  assert(canonical.data.url.includes('notificationGameId=game-new'), 'canonical URL must carry exact notification GameId');
  assert(!canonical.data.url.includes('game-old'), 'stale previously selected GameId must be replaced');
  assert.strictEqual(canonical.data.route, 'picks');

  let captured = null;
  c.teamFantasyIsGame_ = () => true;
  c.notificationPushAudienceResolution_ = () => ({
    gameParticipants: 1, requiredPickQuestions: 8, missingPicksUsers: 1,
    recipientUsers: 1, recipients: ['alice'],
    subscriptions: [{subscriptionId:'s1',endpoint:'e1',keys:{p256dh:'p',auth:'a'}}]
  });
  c.notificationPushGameName_ = () => 'TF';
  c.createUserNotification_ = () => {};
  c.notificationPushGatewaySend_ = (subs, notification) => {
    captured = notification;
    return {success:true,sent:1,failed:0,expired:0,results:[{subscriptionId:'s1',ok:true}]};
  };
  c.notificationPushMarkDeliveryResult_ = () => {};
  c.notificationPushLogBatch_ = () => {};
  c.SpreadsheetApp = {flush(){}};
  const result = c.notificationPushDeliverScheduledReminder_('tf-game', 2, '2026-09-01T17:00:00.000Z');
  assert.strictEqual(result.status, 'COMPLETE');
  assert.strictEqual(captured.data.route, 'team-fantasy', 'automatic Team Fantasy reminder must route to Team Fantasy');
  assert(captured.data.url.includes('notificationGameId=tf-game'));
  assert(captured.data.url.endsWith('#team-fantasy'));
}

// Service worker must honor route + GameId even when supplied URL is stale/default.
{
  const c = makeContext({ self: { registration: { scope: 'https://example.test/' } } });
  vm.runInContext(functionSource(sw, 'awardsPushNotificationTargetUrl_'), c);
  const tf = c.awardsPushNotificationTargetUrl_({
    url:'./app.html#notifications', route:'team-fantasy', gameId:'tf-2'
  });
  assert(tf.includes('notificationGameId=tf-2'));
  assert(tf.endsWith('#team-fantasy'));
  const ordinary = c.awardsPushNotificationTargetUrl_({
    url:'./app.html?notificationGameId=wrong#notifications', route:'picks', gameId:'game-7'
  });
  assert(ordinary.includes('notificationGameId=game-7'));
  assert(!ordinary.includes('notificationGameId=wrong'));
  assert(ordinary.endsWith('#picks'));
}

// App startup must consume notification GameId before routing and remove the one-time parameter.
{
  let selected = '';
  let replaced = '';
  const c = makeContext({
    window: {
      location: { href:'https://example.test/app.html?notificationGameId=tf-9#team-fantasy' },
      history: { replaceState(_a,_b,url){ replaced = url; } }
    },
    document: { title:'PATTC Predicts' },
    setFrontendGameId(id){ selected = id; }
  });
  vm.runInContext(functionSource(app, 'appConsumeNotificationDestination_'), c);
  const consumed = c.appConsumeNotificationDestination_();
  assert.strictEqual(selected, 'tf-9');
  assert.strictEqual(consumed.gameId, 'tf-9');
  assert(!replaced.includes('notificationGameId='), 'notification GameId must be one-time so later reloads do not force an old game');
  assert(replaced.endsWith('#team-fantasy'));
}

// ---------------------------------------------------------------------------
// 2. Team Fantasy Auto-Fill durable worker + Automation Health
// ---------------------------------------------------------------------------
{
  const c = makeContext();
  vm.runInContext(teamFantasy, c);
  let playerRows = [{GameId:'tf1',Username:'alice',AutoFillMode:'auto'}];
  let triggers = [];
  const trigger = handler => ({ getHandlerFunction(){ return handler; }, getEventType(){return 'CLOCK';}, getTriggerSource(){return 'CLOCK';}, getUniqueId(){return Math.random().toString();} });
  triggers = [trigger('teamFantasyAutoFillTriggerHandler'), trigger('teamFantasyAutoFillTriggerHandler'), trigger('teamFantasySyncTriggerHandler')];
  c.teamFantasyReadRows_ = name => playerRows;
  c.teamFantasyIsGame_ = () => true;
  c.ScriptApp = {
    getProjectTriggers(){ return triggers.slice(); },
    deleteTrigger(t){ triggers = triggers.filter(x => x !== t); },
    newTrigger(handler){ return {timeBased(){return this;},everyMinutes(){return this;},create(){triggers.push(trigger(handler));}}; }
  };

  let status = c.teamFantasyReconcileAutoFillTrigger_();
  assert.strictEqual(status.required, true);
  assert.strictEqual(status.count, 1, 'duplicates must converge to one Auto-Fill worker');
  assert.strictEqual(triggers.filter(t => t.getHandlerFunction()==='teamFantasyAutoFillTriggerHandler').length, 1);
  assert.strictEqual(triggers.filter(t => t.getHandlerFunction()==='teamFantasySyncTriggerHandler').length, 1, 'Auto-Fill reconciliation must not touch sync worker');

  playerRows = [{GameId:'tf1',Username:'alice',AutoFillMode:'manual'}];
  status = c.teamFantasyReconcileAutoFillTrigger_();
  assert.strictEqual(status.required, false);
  assert.strictEqual(status.count, 0, 'stale Auto-Fill worker must be removed when nobody requires it');
  assert.strictEqual(triggers.filter(t => t.getHandlerFunction()==='teamFantasySyncTriggerHandler').length, 1);

  playerRows = [{GameId:'tf1',Username:'alice',AutoFillMode:'random'}];
  status = c.teamFantasyReconcileAutoFillTrigger_();
  assert.strictEqual(status.created, true, 'Auto-Fill worker must be recreated when it becomes required');
  assert.strictEqual(status.count, 1);

  // A completed/closed season must no longer keep the durable Auto-Fill worker alive.
  c.getGame = () => ({type:'team-fantasy',status:'completed'});
  status = c.teamFantasyReconcileAutoFillTrigger_();
  assert.strictEqual(status.required, false);
  assert.strictEqual(status.count, 0, 'completed Team Fantasy season must remove stale Auto-Fill worker');
  delete c.getGame;
  status = c.teamFantasyReconcileAutoFillTrigger_();
  assert.strictEqual(status.required, true);
  assert.strictEqual(status.count, 1, 'active Auto-Fill configuration must safely recreate worker after stale removal');

  c.requireAdmin_ = () => true;
  vm.runInContext(automation, c);
  assert.strictEqual(c.automationHealthClassify_('teamFantasyAutoFillTriggerHandler').kind, 'durable');
  const snap = c.automationHealthSnapshot_();
  assert(snap.durableTriggers.some(row => row.handler === 'teamFantasyAutoFillTriggerHandler'));
  assert(snap.teamFantasyAutoFill && snap.teamFantasyAutoFill.required === true, 'Automation Health must expose Auto-Fill requirement/status');
}

// ---------------------------------------------------------------------------
// 3. Logout disables backend + browser push, but cleanup failure cannot trap logout
// ---------------------------------------------------------------------------
(async () => {
  let unsubscribed = 0;
  const subscription = { endpoint:'https://push.example/sub', async unsubscribe(){ unsubscribed++; return true; } };
  const pwaCtx = makeContext({
    awardsPushSupported_: () => true,
    awardsPushDeviceId_: () => 'device-1',
    navigator: { serviceWorker: { ready: Promise.resolve({ pushManager:{ async getSubscription(){ return subscription; } } }) } },
    apiRemovePushSubscription: async () => { throw new Error('backend unavailable'); }
  });
  vm.runInContext(functionSource(pwa, 'awardsPushCleanupDeviceRegistration_'), pwaCtx);
  const cleanup = await pwaCtx.awardsPushCleanupDeviceRegistration_();
  assert.strictEqual(cleanup.success, false);
  assert.strictEqual(unsubscribed, 1, 'browser unsubscribe must still be attempted when backend cleanup fails');
  assert(cleanup.errors.some(x => x.includes('backend-disable')));

  const events = [];
  const appCtx = makeContext({
    getSession: () => ({username:'alice',token:'token'}),
    awardsPushDisableForLogout_: async () => { events.push('push-cleanup'); return {success:false,errors:['simulated']}; },
    apiLogout: async () => { events.push('api-logout'); },
    appClearStoredStartupPayloadsForUser_: () => events.push('clear-startup'),
    clearSession: () => events.push('clear-session'),
    sessionStorage: { setItem(){ events.push('diagnostic'); } },
    window: { location:{ replace(){ events.push('redirect'); } } }
  });
  vm.runInContext(functionSource(app, 'logout'), appCtx);
  await appCtx.logout();
  assert(events.indexOf('push-cleanup') < events.indexOf('api-logout'), 'push cleanup must occur before session revocation');
  assert(events.includes('clear-session') && events.includes('redirect'), 'cleanup failure must never trap the user in a logged-in state');

  // -------------------------------------------------------------------------
  // 4. Failed reminder bounded retry and success terminality
  // -------------------------------------------------------------------------
  const n = makeContext();
  vm.runInContext(notifications, n);
  const headers = Array.from(vm.runInContext('PUSH_REMINDER_LOG_HEADERS', n));
  const now = Date.now();
  function row({status,attempt=0,sent=0,retry=[],success=[],permanent=[],timestamp=now-10*60*1000,offset=2}) {
    const obj = {
      ReminderKey:'g|lock|'+offset, Timestamp:new Date(timestamp).toISOString(), GameId:'g', LockDateTime:'lock', OffsetHours:offset,
      Status:status, RecipientUsers:1, SubscriptionsAttempted:1, Sent:sent, Failed:status.indexOf('FAILED')===0?1:0, Error:'',
      AttemptNumber:attempt, SuccessfulSubscriptionIdsJSON:JSON.stringify(success), RetryableSubscriptionIdsJSON:JSON.stringify(retry), PermanentSubscriptionIdsJSON:JSON.stringify(permanent)
    };
    return headers.map(h => obj[h] === undefined ? '' : obj[h]);
  }
  let data = [headers, row({status:'FAILED_RETRYABLE',attempt:1,retry:['s2']})];
  n.notificationPushReminderLogSheet_ = () => ({getDataRange(){return {getValues(){return data;}}}});
  let terminal = n.notificationPushReminderTerminalOffsetsForLock_('g','lock',now);
  assert.strictEqual(terminal['2'], undefined, 'retryable failure after backoff must not be terminal');
  let state = n.notificationPushReminderRetryStateForOffset_('g','lock',2,now);
  assert.strictEqual(state.attempts, 1);
  assert.deepStrictEqual(Array.from(state.retryableSubscriptionIds), ['s2']);

  data = [headers, row({status:'FAILED_RETRYABLE',attempt:1,retry:['s2'],timestamp:now-60*1000})];
  terminal = n.notificationPushReminderTerminalOffsetsForLock_('g','lock',now);
  assert.strictEqual(terminal['2'], 'RETRY_BACKOFF', 'retry must be bounded by a backoff interval');

  data = [headers,
    row({status:'FAILED_RETRYABLE',attempt:1,retry:['s2'],timestamp:now-30*60*1000}),
    row({status:'FAILED_RETRYABLE',attempt:2,retry:['s2'],timestamp:now-20*60*1000}),
    row({status:'FAILED_RETRYABLE',attempt:3,retry:['s2'],timestamp:now-10*60*1000})
  ];
  terminal = n.notificationPushReminderTerminalOffsetsForLock_('g','lock',now);
  assert.strictEqual(terminal['2'], 'FAILED_MAX_RETRIES', 'retry loop must stop after bounded attempts');

  data = [headers,
    row({status:'FAILED_RETRYABLE',attempt:1,retry:['s2'],timestamp:now-30*60*1000}),
    row({status:'COMPLETE',attempt:2,success:['s2'],sent:1,timestamp:now-20*60*1000})
  ];
  terminal = n.notificationPushReminderTerminalOffsetsForLock_('g','lock',now);
  assert.strictEqual(terminal['2'], 'COMPLETE', 'successful delivery must become terminal');

  // Process retry must carry only failed subscription IDs and increment attempt.
  n.notificationPushUpcomingLock_ = () => ({lockAtMs:now+60*60*1000,lockDateTime:'lock',source:'game'});
  n.notificationPushReminderTerminalOffsetsForLock_ = () => ({});
  n.notificationPushReminderRetryStateForOffset_ = () => ({attempts:1,retryableSubscriptionIds:['s2']});
  n.notificationPushRecentCompletedReminderForGame_ = () => false;
  n.teamFantasyIsGame_ = () => false;
  n.notificationPushReminderLog_ = entry => { n.__lastReminderLog = entry; };
  n.notificationPushDeliverScheduledReminder_ = (_g,_o,_l,opts) => {
    n.__retryOpts = opts;
    return {status:'COMPLETE',recipientUsers:1,subscriptionsAttempted:1,sent:1,failed:0,error:'',successfulSubscriptionIds:['s2'],retryableSubscriptionIds:[],permanentSubscriptionIds:[]};
  };
  const processed = n.notificationPushProcessScheduledGame_({gameId:'g',enabled:true,paused:false,testOnly:false,autoReminderEnabled:true,reminderOffsetsHours:[2]},now);
  assert.strictEqual(processed.status,'COMPLETE');
  assert.strictEqual(n.__retryOpts.attemptNumber,2);
  assert.deepStrictEqual(Array.from(n.__retryOpts.onlySubscriptionIds),['s2']);
  assert.strictEqual(n.__lastReminderLog.attemptNumber,2);

  // Delivery retry must never recreate in-app reminder or resend successful s1.
  const d = makeContext();
  vm.runInContext(notifications, d);
  let created = 0, sentSubs = [];
  d.notificationPushAudienceResolution_ = () => ({
    gameParticipants:1,requiredPickQuestions:1,missingPicksUsers:1,recipientUsers:1,recipients:['alice'],
    subscriptions:[
      {subscriptionId:'s1',endpoint:'e1',keys:{p256dh:'p1',auth:'a1'}},
      {subscriptionId:'s2',endpoint:'e2',keys:{p256dh:'p2',auth:'a2'}}
    ]
  });
  d.notificationPushGameName_ = () => 'Game';
  d.teamFantasyIsGame_ = () => false;
  d.createUserNotification_ = () => { created++; };
  d.notificationPushGatewaySend_ = subs => { sentSubs = subs.map(x=>x.subscriptionId); return {success:true,sent:1,failed:0,expired:0,results:[{subscriptionId:'s2',ok:true}]}; };
  d.notificationPushMarkDeliveryResult_ = () => {};
  d.notificationPushLogBatch_ = () => {};
  d.SpreadsheetApp = {flush(){}};
  const retryDelivery = d.notificationPushDeliverScheduledReminder_('g',2,'lock',{attemptNumber:2,onlySubscriptionIds:['s2']});
  assert.strictEqual(created,0,'retry must not create a duplicate in-app reminder');
  assert.deepStrictEqual(sentSubs,['s2'],'retry must not resend to subscription that already succeeded');
  assert.strictEqual(retryDelivery.status,'COMPLETE');

  d.notificationPushGatewaySend_ = subs => ({success:true,sent:0,failed:1,expired:1,results:[{subscriptionId:subs[0].subscriptionId,ok:false,expired:true,statusCode:410}]});
  const expired = d.notificationPushDeliverScheduledReminder_('g',2,'lock',{attemptNumber:1,onlySubscriptionIds:['s1']});
  assert.strictEqual(expired.status,'COMPLETE_WITH_EXPIRED','permanent expired endpoint should be terminal, not retried forever');
  assert.strictEqual(expired.retryableSubscriptionIds.length,0);

  // A gateway-level failure with partial results must retry only IDs with no
  // successful/permanent result instead of silently losing them.
  d.notificationPushGatewaySend_ = subs => ({success:false,sent:1,failed:1,expired:0,message:'partial gateway failure',results:[{subscriptionId:'s1',ok:true}]});
  const partialFailure = d.notificationPushDeliverScheduledReminder_('g',2,'lock',{attemptNumber:1});
  assert.deepStrictEqual(Array.from(partialFailure.successfulSubscriptionIds),['s1']);
  assert.deepStrictEqual(Array.from(partialFailure.retryableSubscriptionIds),['s2']);
  assert.strictEqual(partialFailure.status,'FAILED_RETRYABLE');

  console.log('notifications-automation-rc16-corrections-tests: PASS');
})().catch(err => { console.error(err); process.exit(1); });
