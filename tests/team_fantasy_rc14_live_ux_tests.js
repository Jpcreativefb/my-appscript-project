const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyEngine.js'), 'utf8');
const pageSource = fs.readFileSync(path.join(root, 'frontend/js/pages/teamFantasy.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'frontend/css/team-fantasy.css'), 'utf8');
const appDataSource = fs.readFileSync(path.join(root, 'backend/engines/AppDataEngine.js'), 'utf8');

function fnBlock(source, name) {
  const starts = [source.indexOf('function ' + name + '('), source.indexOf('async function ' + name + '(')].filter(i => i >= 0);
  assert(starts.length, 'Missing function ' + name);
  const start = Math.min(...starts);
  const next = source.indexOf('\nfunction ', start + 10);
  const nextAsync = source.indexOf('\nasync function ', start + 10);
  const ends = [next, nextAsync].filter(i => i >= 0);
  return source.slice(start, ends.length ? Math.min(...ends) : source.length);
}

// ---- Static UX/performance contracts ----
const saveUi = fnBlock(pageSource, 'teamFantasySaveSlot_');
assert(saveUi.includes("teamFantasySetStatus_('Saving '"), 'Pick save must immediately show Saving state');
assert(saveUi.includes('teamFantasyApplySavedPickResponse_'), 'Successful save must apply returned pick into loaded lineup state');
assert(saveUi.includes('teamFantasyRefreshLineupCard_'), 'Successful save must immediately re-render lineup card');
assert(!saveUi.includes('teamFantasyReload_'), 'Single-pick save must not reload the entire Team Fantasy page');
assert(saveUi.includes("teamFantasySetStatus_('Saved '"), 'Successful save must show Saved acknowledgement');
assert(saveUi.includes('previous selection is unchanged') || saveUi.includes('teamFantasySetSlotSaving_'), 'Failed save must preserve/restore prior visible state');

const saveBackend = fnBlock(engineSource, 'teamFantasySavePick_');
assert(!saveBackend.includes('teamFantasyEligibleTeams_('), 'Manual save must not calculate full rankings/eligible lists just to validate one team');
assert(saveBackend.includes('teamFantasyUsageCountFromRows_'), 'Manual save must still enforce per-position season usage limits');
assert(saveBackend.includes('teamFantasyWritePickRow_'), 'Manual save must use targeted pick-row write');
assert(!saveBackend.includes('SpreadsheetApp.flush()'), 'Manual single-pick fast path must not force an Apps Script flush');
assert(engineSource.includes('teamFantasyScheduleCacheGet_') && engineSource.includes('teamFantasyScheduleCachePut_'), 'Week schedule must be cached so loaded state can be reused by saves');

const collapsed = fnBlock(pageSource, 'teamFantasyLineupCollapsed_');
assert(collapsed.includes('if (!teamFantasyLineupComplete_(lineup)) return false'), 'Incomplete Weekly Picks must always remain expanded');
const lineupRender = fnBlock(pageSource, 'teamFantasyRenderLineup_');
assert(lineupRender.includes('Lineup Set'), 'Complete lineup must show Lineup Set');
assert(lineupRender.includes('Make changes before kickoff'), 'Complete lineup must offer Make changes before kickoff');
assert(cssSource.includes('.tf-lineup-card.is-change-mode .tf-slot.is-locked{display:none'), 'Change mode must expose only legally editable positions');
assert(pageSource.includes('🔒 Locked') && pageSource.includes('tf-edit-label'), 'Editable and locked positions must be visually distinct');

assert(pageSource.includes('Random Pick</strong> chooses a random valid NFL team'), 'Random Pick help contract missing');
assert(pageSource.includes('Auto Pick</strong> chooses the highest-ranked valid available team'), 'Auto Pick help contract missing');
assert(pageSource.includes("teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}'"), 'Random/Auto actions must be tied to an explicit position');
assert(pageSource.includes('Only this position will be filled.'), 'Random/Auto fill must confirm the explicit position before applying');
assert(engineSource.includes('const choice = randomOnly ? eligible[Math.floor(Math.random() * eligible.length)] : eligible[0]'), 'Auto Pick must choose the first eligible team after ranking sort');
assert(fnBlock(engineSource, 'teamFantasyEligibleTeamsFromRows_').includes('if(ar!==br)return ar-br'), 'Eligible-team list must sort ranked teams highest-first for deterministic Auto Pick');

['Manual Only','Random Fill Remaining','Auto Pick Remaining','Before Thursday games','Before Saturday games','Before Sunday early games','Before Sunday afternoon games','Custom deadline'].forEach(text => {
  assert(pageSource.includes(text), 'Missing player protection option: ' + text);
});
assert(engineSource.includes('PLAYER_SETTINGS: "TeamFantasyPlayerSettings"'), 'Player auto-fill settings must be game-scoped Team Fantasy data');
assert(engineSource.includes('mode: "manual"'), 'Existing players must default to Manual Only');
assert(engineSource.includes('teamFantasyAutoFillTriggerHandler'), 'Automatic missed-lineup protection needs a durable Team Fantasy trigger');
assert(engineSource.includes('if (current) return;'), 'Auto fill must never replace an already-saved manual pick');

assert(pageSource.includes('window.TEAM_FANTASY_GAME_DAY_WEEK = Number(res.week || 1)'), 'Weekly Standings must reset to current NFL week on page open');
assert(pageSource.includes('sort(function(a,b){ return b-a; })'), 'Week selector should list current/recent weeks first');
assert(appDataSource.includes('return "Fill Remaining Picks"'), 'Home Hub incomplete Team Fantasy quick action missing');
assert(cssSource.includes('.tf-team-picker-button{min-height:46px') && cssSource.includes('.tf-picker-team{min-height:52px'), 'Team selection touch targets were not increased ~20%');

function makeHarness() {
  let uuid = 0;
  const cache = new Map();
  const triggers = [];
  const context = {
    console, Date, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map,
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    Math: Object.create(Math),
    Utilities: { getUuid: () => 'uuid-' + (++uuid) + '-abcdefghij' },
    SpreadsheetApp: { flush() {} },
    CacheService: { getScriptCache: () => ({ get:k => cache.has(k) ? cache.get(k) : null, put:(k,v) => cache.set(k,v) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      newTrigger: handler => ({
        timeBased(){ return this; }, everyMinutes(){ return this; },
        create(){ triggers.push({ getHandlerFunction: () => handler }); return this; }
      }),
      deleteTrigger: trigger => { const i = triggers.indexOf(trigger); if (i >= 0) triggers.splice(i,1); }
    },
    getGame: id => ({ id, gameId:id, type:'team-fantasy', year:2099 }),
    requireAdminFromToken_: () => 'admin'
  };
  context.Math.random = () => 0;
  vm.createContext(context);
  vm.runInContext(engineSource, context, { filename:'SportsTeamFantasyEngine.js' });

  const db = {};
  const rawRows = name => db[name] || (db[name] = []);
  const readRows = name => rawRows(name).map((row,index) => ({ ...row, _rowNumber:index+2 }));
  context.teamFantasyEnsureSheet_ = () => ({});
  context.setupSportsTeamFantasySystem = () => ({ success:true });
  context.teamFantasyReadRows_ = readRows;
  context.teamFantasyWriteObjectRow_ = (name,rowNumber,values) => { rawRows(name)[rowNumber-2] = { ...values }; };
  context.teamFantasyAppendObject_ = (name,values) => { rawRows(name).push({ ...values }); return rawRows(name).length+1; };
  context.teamFantasyUpsert_ = (name,matcher,values) => {
    const rows = rawRows(name); const objects = readRows(name); const idx = objects.findIndex(matcher);
    if (idx >= 0) { rows[idx] = { ...rows[idx], ...(values||{}) }; return idx+2; }
    rows.push({ ...(values||{}) }); return rows.length+1;
  };
  return { context, db, cache, triggers, rawRows, readRows };
}

function settingRow(ctx, gameId, extra={}) { return { ...ctx.teamFantasyDefaultSettings_(gameId), SeasonYear:2099, CurrentWeek:1, TeamUseLimit:2, ...extra }; }
function entryRow(gameId, user, id=user+'-entry', conference='ALL') { return { GameId:gameId, EntryId:id, Username:user, EntryName:id, Conference:conference, Active:true, CreatedAt:'2099-01-01', UpdatedAt:'2099-01-01' }; }
function game(eventId, dt, homeAbbr, awayAbbr) { return { eventId, sportsGameId:'nfl_'+eventId, gameDateTime:dt, homeTeam:homeAbbr, awayTeam:awayAbbr, homeAbbr, awayAbbr, homeTeamId:'h'+eventId, awayTeamId:'a'+eventId, completed:false, status:'scheduled', state:'pre', seasonYear:2099, seasonType:2, week:1 }; }
function schedule(rows) { const byTeam={}; rows.forEach(g=>{byTeam[g.homeAbbr]=g;byTeam[g.awayAbbr]=g;}); return { games:rows, byTeam }; }
const futureSchedule = schedule([
  game('1','2099-09-10T18:00:00Z','BUF','MIA'),
  game('2','2099-09-12T18:00:00Z','KC','DEN'),
  game('3','2099-09-13T12:00:00Z','PHI','DAL'),
  game('4','2099-09-13T20:00:00Z','GB','CHI')
]);

// ---- Schedule cache eliminates repeated Sports request after state load ----
{
  const { context } = makeHarness();
  context.teamFantasyGetSettings_ = () => context.teamFantasyNormalizeSettings_(settingRow(context,'g1'));
  let networkCalls = 0;
  context.teamFantasyFetchScheduleFromSportsEngine_ = () => { networkCalls++; return futureSchedule.games; };
  context.teamFantasyFetchScheduleFromEspn_ = () => { throw new Error('should not fallback'); };
  const first = context.teamFantasyFetchWeekSchedule_('g1',1,context.teamFantasyGetSettings_('g1'));
  const second = context.teamFantasyFetchWeekSchedule_('g1',1,context.teamFantasyGetSettings_('g1'));
  assert.strictEqual(first.games.length,4);
  assert.strictEqual(second.games.length,4);
  assert.strictEqual(networkCalls,1,'Second save/state schedule lookup should reuse 5-minute cache');
}

// ---- Save acknowledgement payload + pre-kickoff replacement + persistence ----
{
  const { context, db } = makeHarness();
  db.TeamFantasySettings = [settingRow(context,'g1')];
  db.TeamFantasyEntries = [entryRow('g1','alice','g1-a')];
  db.TeamFantasyPicks = [{ GameId:'g1', SeasonYear:2099, Week:1, EntryId:'g1-a', Username:'alice', Conference:'ALL', Position:'QB', TeamAbbr:'BUF', TeamName:'Buffalo Bills', ESPNEventId:'1', GameDateTime:'2099-09-10T18:00:00Z', PickMethod:'manual', CreatedAt:'x', UpdatedAt:'x' }];
  const settings = context.teamFantasyGetSettings_('g1');
  const entries = context.teamFantasyEntriesForUser_('g1','alice');
  const res = context.teamFantasySavePick_({ username:'alice', gameId:'g1', entryId:'g1-a', week:1, position:'QB', teamAbbr:'KC', _settings:settings, _entries:entries, _schedule:futureSchedule });
  assert.strictEqual(res.success,true);
  assert.strictEqual(res.previousTeamAbbr,'BUF');
  assert.strictEqual(res.savedPick.teamAbbr,'KC');
  assert.strictEqual(db.TeamFantasyPicks[0].TeamAbbr,'KC','Replacement must persist to TeamFantasyPicks');
}

// ---- Post-kickoff lock rejects replacement and preserves original ----
{
  const { context, db } = makeHarness();
  db.TeamFantasySettings = [settingRow(context,'g1')];
  db.TeamFantasyEntries = [entryRow('g1','alice','g1-a')];
  const past = schedule([game('p','2000-01-01T18:00:00Z','BUF','MIA'), game('2','2099-09-12T18:00:00Z','KC','DEN')]);
  db.TeamFantasyPicks = [{ GameId:'g1', SeasonYear:2099, Week:1, EntryId:'g1-a', Username:'alice', Conference:'ALL', Position:'QB', TeamAbbr:'BUF', TeamName:'Buffalo Bills', ESPNEventId:'p', GameDateTime:'2000-01-01T18:00:00Z', PickMethod:'manual', CreatedAt:'x', UpdatedAt:'x' }];
  let err=''; try { context.teamFantasySavePick_({ username:'alice',gameId:'g1',entryId:'g1-a',week:1,position:'QB',teamAbbr:'KC',_settings:context.teamFantasyGetSettings_('g1'),_entries:context.teamFantasyEntriesForUser_('g1','alice'),_schedule:past }); } catch(e){ err=String(e.message||e); }
  assert(/locked because its NFL game has started/i.test(err));
  assert.strictEqual(db.TeamFantasyPicks[0].TeamAbbr,'BUF','Locked failure must preserve original pick');
}

// ---- Random Fill explicit position obeys usage / Auto Pick chooses highest-ranked valid ----
{
  const { context, db } = makeHarness();
  db.TeamFantasySettings = [settingRow(context,'g1',{TeamUseLimit:1,CurrentWeek:2})];
  db.TeamFantasyEntries = [entryRow('g1','alice','g1-a')];
  db.TeamFantasyPicks = [{ GameId:'g1',SeasonYear:2099,Week:1,EntryId:'g1-a',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF',TeamName:'Buffalo Bills',ESPNEventId:'old',GameDateTime:'2098-01-01T00:00:00Z',PickMethod:'manual' }];
  const random = context.teamFantasyAutoPick_({ username:'alice',gameId:'g1',entryId:'g1-a',week:2,positions:['QB'],_settings:context.teamFantasyGetSettings_('g1'),_entries:context.teamFantasyEntriesForUser_('g1','alice'),_schedule:futureSchedule }, true);
  assert.strictEqual(random.saved,1);
  assert.notStrictEqual(random.results[0].teamAbbr,'BUF','Random Fill must not use a team whose QB usage limit is exhausted');
  assert.strictEqual(random.results[0].position,'QB','Random Fill must fill only explicitly requested position');

  // Fresh game for deterministic Auto ranking.
  db.TeamFantasySettings.push(settingRow(context,'g2',{TeamUseLimit:2}));
  db.TeamFantasyEntries.push(entryRow('g2','alice','g2-a'));
  db.TeamFantasyUnitScores = [
    {GameId:'g2',SeasonYear:2099,Week:0,EntryId:'x',Position:'RB',TeamAbbr:'KC',ESPNEventId:'old1',FantasyPoints:10,Final:true,UpdatedAt:'1'},
    {GameId:'g2',SeasonYear:2099,Week:0,EntryId:'y',Position:'RB',TeamAbbr:'BUF',ESPNEventId:'old2',FantasyPoints:30,Final:true,UpdatedAt:'1'}
  ];
  const auto = context.teamFantasyAutoPick_({ username:'alice',gameId:'g2',entryId:'g2-a',week:1,positions:['RB'],_settings:context.teamFantasyGetSettings_('g2'),_entries:context.teamFantasyEntriesForUser_('g2','alice'),_schedule:futureSchedule }, false);
  assert.strictEqual(auto.saved,1);
  assert.strictEqual(auto.results[0].teamAbbr,'BUF','Auto Pick must choose highest-ranked valid team');
  assert.strictEqual(auto.results[0].position,'RB');
}

// ---- Player season defaults + activation windows + Manual default ----
{
  const { context, db, triggers } = makeHarness();
  db.TeamFantasySettings = [settingRow(context,'g1'),settingRow(context,'g2')];
  assert.strictEqual(context.teamFantasyGetPlayerPreference_('g1','alice').mode,'manual','No stored preference must default to Manual Only');
  const r1 = context.apiSaveTeamFantasyPick({ username:'alice',gameId:'g1',preferenceOnly:true,autoFillMode:'random',autoFillWindow:'thursday',customLeadMinutes:60 });
  const r2 = context.apiSaveTeamFantasyPick({ username:'alice',gameId:'g2',preferenceOnly:true,autoFillMode:'auto',autoFillWindow:'sunday-afternoon',customLeadMinutes:90 });
  assert.strictEqual(r1.preference.mode,'random'); assert.strictEqual(r1.preference.window,'thursday');
  assert.strictEqual(r2.preference.mode,'auto'); assert.strictEqual(r2.preference.window,'sunday-afternoon');
  assert(triggers.some(t=>t.getHandlerFunction()==='teamFantasyAutoFillTriggerHandler'),'Enabling automatic protection must ensure durable trigger');
  const a1 = context.teamFantasyAutoFillActivation_('g1',context.teamFantasyGetSettings_('g1'),1,r1.preference,futureSchedule);
  assert.strictEqual(a1.activeAt,'2099-09-10T17:30:00.000Z','Thursday protection should activate 30 minutes before Thursday first kickoff');
  const customPref = {mode:'random',window:'custom',customLeadMinutes:120};
  const ac = context.teamFantasyAutoFillActivation_('g1',context.teamFantasyGetSettings_('g1'),1,customPref,futureSchedule);
  assert.strictEqual(ac.activeAt,'2099-09-10T16:00:00.000Z','Custom deadline must be relative to real first weekly kickoff');
}

// ---- Automatic fill never overwrites manual pick ----
{
  const { context, db } = makeHarness();
  db.TeamFantasySettings = [settingRow(context,'g1')];
  db.TeamFantasyEntries = [entryRow('g1','alice','g1-a')];
  db.TeamFantasyPicks = [{ GameId:'g1',SeasonYear:2099,Week:1,EntryId:'g1-a',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF',TeamName:'Buffalo Bills',ESPNEventId:'1',GameDateTime:'2099-09-10T18:00:00Z',PickMethod:'manual' }];
  const res = context.teamFantasyAutoPick_({ username:'alice',gameId:'g1',entryId:'g1-a',week:1,positions:['QB'],_settings:context.teamFantasyGetSettings_('g1'),_entries:context.teamFantasyEntriesForUser_('g1','alice'),_schedule:futureSchedule }, false);
  assert.strictEqual(res.saved,0,'Auto fill must skip a position with an existing manual pick');
  assert.strictEqual(db.TeamFantasyPicks[0].TeamAbbr,'BUF');
  assert.strictEqual(db.TeamFantasyPicks[0].PickMethod,'manual');
}

// ---- GameId isolation across progress, usage, standings, reminders, preferences, auto-trigger rows ----
{
  const { context, db } = makeHarness();
  db.TeamFantasySettings = [settingRow(context,'gA',{ReminderEnabled:true}),settingRow(context,'gB',{ReminderEnabled:false})];
  db.TeamFantasyEntries = [entryRow('gA','alice','a1'),entryRow('gA','bob','a2'),entryRow('gB','alice','b1'),entryRow('gB','bob','b2')];
  db.TeamFantasyLeagues = [
    {GameId:'gA',LeagueId:'complete',LeagueName:'A',LeagueType:'complete',StandingMode:'entries',PlayoffTeams:2,Active:true},
    {GameId:'gB',LeagueId:'complete',LeagueName:'B',LeagueType:'complete',StandingMode:'entries',PlayoffTeams:2,Active:true}
  ];
  db.TeamFantasyLeagueMemberships = [
    {GameId:'gA',LeagueId:'complete',EntryId:'a1',Username:'alice'},{GameId:'gA',LeagueId:'complete',EntryId:'a2',Username:'bob'},
    {GameId:'gB',LeagueId:'complete',EntryId:'b1',Username:'alice'},{GameId:'gB',LeagueId:'complete',EntryId:'b2',Username:'bob'}
  ];
  db.TeamFantasyPicks = [
    ...['QB','RB','WRTE','OL'].map((pos,i)=>({GameId:'gA',SeasonYear:2099,Week:1,EntryId:'a1',Username:'alice',Conference:'ALL',Position:pos,TeamAbbr:['BUF','KC','PHI','GB'][i],PickMethod:'manual'})),
    {GameId:'gB',SeasonYear:2099,Week:1,EntryId:'b1',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'MIA',PickMethod:'manual'},
    {GameId:'gA',SeasonYear:2099,Week:0,EntryId:'a1',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF'},
    {GameId:'gB',SeasonYear:2099,Week:0,EntryId:'b1',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF'}
  ];
  db.TeamFantasyWeekScores = [
    {GameId:'gA',SeasonYear:2099,Week:1,EntryId:'a1',Username:'alice',Conference:'ALL',FantasyPoints:20,Final:true},
    {GameId:'gA',SeasonYear:2099,Week:1,EntryId:'a2',Username:'bob',Conference:'ALL',FantasyPoints:10,Final:true},
    {GameId:'gB',SeasonYear:2099,Week:1,EntryId:'b1',Username:'alice',Conference:'ALL',FantasyPoints:5,Final:true},
    {GameId:'gB',SeasonYear:2099,Week:1,EntryId:'b2',Username:'bob',Conference:'ALL',FantasyPoints:25,Final:true}
  ];
  db.TeamFantasyPlayerSettings = [
    {GameId:'gA',Username:'alice',AutoFillMode:'random',AutoFillWindow:'thursday',CustomLeadMinutes:60},
    {GameId:'gB',Username:'alice',AutoFillMode:'auto',AutoFillWindow:'sunday-early',CustomLeadMinutes:60}
  ];
  const pa = context.teamFantasyDashboardProgress_('gA','alice');
  const pb = context.teamFantasyDashboardProgress_('gB','alice');
  assert.strictEqual(pa.madeCount,4); assert.strictEqual(pa.remainingCount,4,'Game A progress must remain 4/8');
  assert.strictEqual(pb.madeCount,1); assert.strictEqual(pb.remainingCount,7,'Game B progress must be independent');
  const sa = context.teamFantasyBuildStandings_('gA','complete');
  const sb = context.teamFantasyBuildStandings_('gB','complete');
  assert.strictEqual(sa.rows[0].entryId,'a1','Game A standings must use only Game A scores');
  assert.strictEqual(sb.rows[0].entryId,'b2','Game B standings must use only Game B scores');
  assert.strictEqual(context.teamFantasyReminderPolicy_('gA').enabled,true);
  assert.strictEqual(context.teamFantasyReminderPolicy_('gB').enabled,false,'Reminder policy must be isolated by GameId');
  assert.strictEqual(context.teamFantasyGetPlayerPreference_('gA','alice').mode,'random');
  assert.strictEqual(context.teamFantasyGetPlayerPreference_('gB','alice').mode,'auto','Random/Auto season settings must be isolated by GameId');
  const settingsA=context.teamFantasyGetSettings_('gA'), settingsB=context.teamFantasyGetSettings_('gB');
  const isolatedUsageRows = [
    {GameId:'gA',SeasonYear:2099,Week:1,EntryId:'a1',Position:'QB',TeamAbbr:'BUF'},
    {GameId:'gB',SeasonYear:2099,Week:1,EntryId:'b1',Position:'QB',TeamAbbr:'BUF'}
  ];
  assert.strictEqual(context.teamFantasyUsageCountFromRows_(isolatedUsageRows,'gA',settingsA,'a1','QB','BUF',2),1);
  assert.strictEqual(context.teamFantasyUsageCountFromRows_(isolatedUsageRows,'gB',settingsB,'b1','QB','BUF',2),1);
  const called=[];
  context.teamFantasyRunAutomaticFillForPlayer_=(g,u)=>{called.push(g+'|'+u);return{success:true,gameId:g,username:u};};
  context.teamFantasyAutoFillTriggerHandler();
  assert.deepStrictEqual(called.sort(),['gA|alice','gB|alice'],'Automatic fill trigger must execute each GameId/user preference independently');
}

// ---- Frontend response -> state -> rendered team immediately ----
{
  const document = {
    querySelector: () => null,
    createElement: () => ({ dataset:{} }),
    currentScript: null,
    head: { appendChild(){} },
    getElementById: () => null,
    body: { insertAdjacentHTML(){} }
  };
  const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Boolean, RegExp, Set, Map, document, window:{}, localStorage:{getItem(){return'';},setItem(){}}, URL, setTimeout(){}, clearInterval(){}, setInterval(){}, encodeURIComponent };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(pageSource, ctx, { filename:'teamFantasy.js' });
  ctx.TEAM_FANTASY_STATE = { settings:{teamUseLimit:3}, lineups:[{ entry:{entryId:'e1'}, required:8, picked:3, complete:false, missing:['OL','K','DL','LB','DB'], slots:[
    {position:'QB',label:'QB',pick:{teamAbbr:'BUF'},locked:false,teams:[]},
    {position:'RB',label:'RB',pick:{teamAbbr:'KC'},locked:false,teams:[]},
    {position:'WRTE',label:'WR/TE',pick:{teamAbbr:'PHI'},locked:false,teams:[]},
    {position:'OL',label:'OL',pick:null,locked:false,teams:[{abbr:'GB',uses:0,usesRemaining:3,current:false,game:{homeAbbr:'GB',awayAbbr:'CHI'}}]},
    {position:'K',label:'K',pick:null,locked:false,teams:[]},{position:'DL',label:'DL',pick:null,locked:false,teams:[]},{position:'LB',label:'LB',pick:null,locked:false,teams:[]},{position:'DB',label:'DB',pick:null,locked:false,teams:[]}
  ]}] };
  const ok = ctx.teamFantasyApplySavedPickResponse_({entryId:'e1',position:'OL',teamAbbr:'GB',previousTeamAbbr:'',usageLimit:3,savedPick:{teamAbbr:'GB',teamName:'Green Bay Packers',eventId:'4',gameDateTime:'2099-09-13T20:00:00Z',locked:false,pickMethod:'manual'},picked:4,required:8,complete:false,missingPositions:['K','DL','LB','DB']});
  assert.strictEqual(ok,true);
  assert.strictEqual(ctx.TEAM_FANTASY_STATE.lineups[0].slots[3].pick.teamAbbr,'GB','Returned save must populate selected team immediately');
  assert.strictEqual(ctx.TEAM_FANTASY_STATE.lineups[0].picked,4);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.TEAM_FANTASY_STATE.lineups[0].missing)),['K','DL','LB','DB']);
  const html = ctx.teamFantasyRenderSlot_(ctx.TEAM_FANTASY_STATE,ctx.TEAM_FANTASY_STATE.lineups[0],ctx.TEAM_FANTASY_STATE.lineups[0].slots[3]);
  assert(html.includes('GB') && html.includes('Edit'),'Re-rendered saved slot must visibly show the newly saved team');
}

console.log('team-fantasy-rc14-live-ux-tests: PASS');
