const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyEngine.js'), 'utf8');
const gameDaySource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyGameDayEngine.js'), 'utf8');
const playerSource = fs.readFileSync(path.join(root, 'frontend/js/pages/teamFantasy.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'frontend/js/pages/adminTeamFantasy.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const apiMirrorSource = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const bridgeSource = fs.readFileSync(path.join(root, 'functions/api/team-fantasy.js'), 'utf8');
const gamesSource = fs.readFileSync(path.join(root, 'backend/engines/GamesEngine.js'), 'utf8');

function makeHarness() {
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
  vm.runInContext(engineSource, context, { filename: 'SportsTeamFantasyEngine.js' });
  vm.runInContext(gameDaySource, context, { filename: 'SportsTeamFantasyGameDayEngine.js' });

  const db = {};
  const rawRows = name => db[name] || (db[name] = []);
  const readRows = name => rawRows(name).map((row, index) => ({ ...row, _rowNumber: index + 2 }));
  context.teamFantasyEnsureSheet_ = () => ({});
  context.setupSportsTeamFantasySystem = () => ({ success: true });
  context.teamFantasyReadRows_ = readRows;
  context.teamFantasyWriteObjectRow_ = (name, rowNumber, values) => {
    const rows = rawRows(name);
    rows[rowNumber - 2] = { ...values };
  };
  context.teamFantasyAppendObject_ = (name, values) => {
    const rows = rawRows(name);
    rows.push({ ...values });
    return rows.length + 1;
  };
  context.teamFantasyUpsert_ = (name, matcher, values) => {
    const rows = rawRows(name);
    const found = readRows(name).findIndex(matcher);
    if (found >= 0) {
      rows[found] = { ...rows[found], ...(values || {}) };
      return found + 2;
    }
    rows.push({ ...(values || {}) });
    return rows.length + 1;
  };

  function setSettings(gameId = 'g', extra = {}) {
    db.TeamFantasySettings = [{ ...context.teamFantasyDefaultSettings_(gameId), ...extra }];
  }
  function seedCompleteLeague(gameId = 'g', extra = {}) {
    db.TeamFantasyLeagues = [{
      GameId: gameId, LeagueId: 'complete', LeagueName: 'Complete League', LeagueType: 'complete',
      StandingMode: 'combined-user', PlayoffTeams: 2, Active: true, CreatedAt: '2026-01-01', UpdatedAt: '2026-01-01', ...extra
    }];
  }
  return { context, db, setSettings, seedCompleteLeague };
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function expectThrow(fn, pattern) {
  let err = null;
  try { fn(); } catch (e) { err = e; }
  assert(err, 'Expected function to throw');
  if (pattern) assert(pattern.test(String(err.message || err)), `Expected ${pattern}, got: ${err.message || err}`);
}

// RC10 already contains the old routing/sync fixes: prevent regression of the observed blank/write-control failures.
{
  assert(apiSource.includes('function apiTeamFantasyPost_('), 'Team Fantasy POST helper must exist');
  assert(apiMirrorSource.includes('function apiTeamFantasyPost_('), 'Team Fantasy POST helper mirror must exist');
  assert(playerSource.includes("apiTeamFantasyPost_('saveTeamFantasyPick'"), 'player picks must use Team Fantasy POST helper');
  assert(adminSource.includes("apiTeamFantasyPost_('adminRunTeamFantasySync'"), 'manual sync must use Team Fantasy POST helper');
  assert(bridgeSource.includes('"adminRunTeamFantasySync"') && bridgeSource.includes('"adminInstallTeamFantasySyncTrigger"'), 'bridge must allow sync controls');
  assert(playerSource.includes("if (!res || res.success === false) return `<div class=\"page tf-page\""), 'state failure must render an error card rather than a blank picks page');
  assert(gamesSource.includes('id: "team-fantasy"'), 'Team Fantasy must remain a creatable game type');
}

// Position contract and configurable scoring remain complete across all eight roster slots.
{
  const { context } = makeHarness();
  assert.deepStrictEqual(clone(context.TEAM_FANTASY_POSITIONS), ['QB','RB','WRTE','K','OL','DL','LB','DB']);
  const rules = [
    ['QB','passingYards',0.1], ['RB','rushingYards',0.1], ['WRTE','receivingYards',0.1], ['OL','totalYards',0.01],
    ['K','fieldGoalsMade',3], ['DL','sacks',2], ['LB','tacklesTotal',0.5], ['DB','interceptions',3]
  ].map((r, i) => ({ ruleId:'r'+i, active:true, position:r[0], statKey:r[1], ruleType:'unit', pointsPerUnit:r[2], threshold:null, bonusPoints:0, label:r[1] }));
  const stats = {
    QB:{passingYards:300}, RB:{rushingYards:100}, WRTE:{receivingYards:120}, OL:{totalYards:400},
    K:{fieldGoalsMade:2}, DL:{sacks:3}, LB:{tacklesTotal:10}, DB:{interceptions:2}
  };
  const points = Object.fromEntries(context.TEAM_FANTASY_POSITIONS.map(pos => [pos, context.teamFantasyScoreStats_(rules, pos, stats[pos]).points]));
  assert.deepStrictEqual(clone(points), { QB:30, RB:10, WRTE:12, K:6, OL:4, DL:6, LB:5, DB:6 });
}

// Complete League disabling must really hide/deactivate an already-created Complete League, then safely reactivate it.
{
  const { context, db, setSettings, seedCompleteLeague } = makeHarness();
  setSettings('g'); seedCompleteLeague('g');
  context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'single', completeLeagueEnabled:false });
  assert.strictEqual(db.TeamFantasyLeagues[0].Active, false, 'Complete League must be inactive after disabling');
  assert.strictEqual(context.teamFantasyLeagueRow_('g','complete'), null, 'inactive Complete League must not be returned as active');
  context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'single', completeLeagueEnabled:true });
  assert.strictEqual(db.TeamFantasyLeagues[0].Active, true, 'Complete League must reactivate safely');
}

// Single <-> AFC/NFC mode can be changed before play, but incompatible ghost entries are deactivated.
{
  const { context, db, setSettings, seedCompleteLeague } = makeHarness();
  setSettings('g', { EntryMode:'single' }); seedCompleteLeague('g');
  let entries = context.teamFantasyEnsureEntriesForUser_('g','alice');
  assert.strictEqual(entries.length, 1); assert.strictEqual(entries[0].conference, 'ALL');
  context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'afc-nfc' });
  entries = context.teamFantasyEnsureEntriesForUser_('g','alice');
  assert.deepStrictEqual(clone(entries.map(e => e.conference).sort()), ['AFC','NFC']);
  const active = db.TeamFantasyEntries.filter(r => r.Active !== false);
  assert.deepStrictEqual(active.map(r => r.Conference).sort(), ['AFC','NFC'], 'old ALL entry must not remain a ghost competitor');
}

// Structural season settings freeze once picks/scores exist, preventing orphaned history.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g', { EntryMode:'single', SeasonYear:2026, RegularSeasonEndWeek:18 });
  db.TeamFantasyPicks = [{ GameId:'g', SeasonYear:2026, Week:1, EntryId:'e', Position:'QB', TeamAbbr:'BUF' }];
  expectThrow(() => context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'afc-nfc' }), /Entry mode cannot change/);
  expectThrow(() => context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'single', seasonYear:2027 }), /Season year cannot change/);
  expectThrow(() => context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'single', regularSeasonEndWeek:17 }), /Regular-season end week cannot change/);
  const ok = context.apiAdminSaveTeamFantasySettings({ gameId:'g', entryMode:'single', teamUseLimit:4 });
  assert.strictEqual(ok.settings.teamUseLimit, 4, 'non-structural future-use setting should remain adjustable');
}

// League membership policy: validate league, enforce same-entry-multiple-leagues setting, and avoid partial AFC/NFC writes.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g', { EntryMode:'afc-nfc', SameEntryMultipleLeagues:false });
  db.TeamFantasyLeagues = [
    {GameId:'g',LeagueId:'complete',LeagueName:'Complete',LeagueType:'complete',Active:true,StandingMode:'combined-user',PlayoffTeams:4},
    {GameId:'g',LeagueId:'east',LeagueName:'East',LeagueType:'subleague',Active:true,StandingMode:'entries',PlayoffTeams:2},
    {GameId:'g',LeagueId:'west',LeagueName:'West',LeagueType:'subleague',Active:true,StandingMode:'entries',PlayoffTeams:2}
  ];
  const first = context.apiAdminAssignTeamFantasyLeagueMember({gameId:'g',leagueId:'east',memberUsername:'alice'});
  assert.strictEqual(first.assigned, 2, 'AFC/NFC user should assign both controlled entries');
  const before = db.TeamFantasyLeagueMemberships.length;
  expectThrow(() => context.apiAdminAssignTeamFantasyLeagueMember({gameId:'g',leagueId:'west',memberUsername:'alice'}), /already assigned to another subleague/);
  assert.strictEqual(db.TeamFantasyLeagueMemberships.length, before, 'conflicting multi-entry assignment must be atomic');
  expectThrow(() => context.apiAdminAssignTeamFantasyLeagueMember({gameId:'g',leagueId:'missing',memberUsername:'alice'}), /active Team Fantasy league/);
  expectThrow(() => context.apiAdminAssignTeamFantasyLeagueMember({gameId:'g',leagueId:'east',memberUsername:'alice',entryId:'not-owned'}), /not found for that user/);
}

// Team-use limits are per position; regular-season usage can reset or carry into playoffs.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g', { TeamUseLimit:2, RegularSeasonEndWeek:2, PlayoffUsageMode:'reset' });
  db.TeamFantasyPicks = [
    {GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Position:'QB',TeamAbbr:'BUF'},
    {GameId:'g',SeasonYear:2026,Week:2,EntryId:'e',Position:'QB',TeamAbbr:'BUF'},
    {GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Position:'RB',TeamAbbr:'BUF'}
  ];
  let settings = context.teamFantasyGetSettings_('g');
  let usage = context.teamFantasyUsageCounts_('g',settings,'e',3);
  assert.strictEqual(usage.QB.BUF || 0, 0, 'playoff reset must clear regular QB usage');
  assert.strictEqual(usage.RB.BUF || 0, 0, 'playoff reset must clear regular RB usage');
  db.TeamFantasySettings[0].PlayoffUsageMode = 'carry';
  settings = context.teamFantasyGetSettings_('g');
  usage = context.teamFantasyUsageCounts_('g',settings,'e',3);
  assert.strictEqual(usage.QB.BUF, 2); assert.strictEqual(usage.RB.BUF, 1);
  assert.strictEqual(usage.DB.BUF || 0, 0, 'usage must never bleed between positions');
  db.TeamFantasyPicks.push({GameId:'g',SeasonYear:2026,Week:5,EntryId:'e',Position:'QB',TeamAbbr:'KC'});
  usage = context.teamFantasyUsageCounts_('g',settings,'e',4);
  assert.strictEqual(usage.QB.KC || 0, 0, 'future-week picks must not consume an earlier week use limit');
}

// Auto-pick historical rankings deduplicate the same NFL unit across many fantasy entries.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g',{SeasonYear:2026});
  db.TeamFantasyUnitScores = [];
  for (let i=0;i<10;i++) db.TeamFantasyUnitScores.push({GameId:'g',SeasonYear:2026,Week:1,EntryId:'e'+i,Position:'QB',TeamAbbr:'BUF',ESPNEventId:'w1',FantasyPoints:10,Final:true,UpdatedAt:'2026-09-01T00:00:00Z'});
  db.TeamFantasyUnitScores.push({GameId:'g',SeasonYear:2026,Week:2,EntryId:'later',Position:'QB',TeamAbbr:'BUF',ESPNEventId:'w2',FantasyPoints:20,Final:true,UpdatedAt:'2026-09-08T00:00:00Z'});
  db.TeamFantasyUnitScores.push({GameId:'g',SeasonYear:2025,Week:1,EntryId:'old',Position:'QB',TeamAbbr:'BUF',ESPNEventId:'old',FantasyPoints:100,Final:true,UpdatedAt:'2025-09-01T00:00:00Z'});
  db.TeamFantasyUnitScores.push({GameId:'g',SeasonYear:2026,Week:1,EntryId:'kc1',Position:'QB',TeamAbbr:'KC',ESPNEventId:'kcw1',FantasyPoints:14,Final:true,UpdatedAt:'2026-09-01T00:00:00Z'});
  db.TeamFantasyUnitScores.push({GameId:'g',SeasonYear:2026,Week:2,EntryId:'kc2',Position:'QB',TeamAbbr:'KC',ESPNEventId:'kcw2',FantasyPoints:14,Final:true,UpdatedAt:'2026-09-08T00:00:00Z'});
  const ranking=context.teamFantasyRankings_('g','QB',3,2026);
  assert.strictEqual(ranking.BUF.games,2,'popular picks must not count the same NFL game repeatedly');
  assert.strictEqual(ranking.BUF.average,15,'BUF average must be one score per NFL week/event');
  assert.strictEqual(ranking.BUF.rank,1,'2025 data must not contaminate current-season auto rankings');
  assert.strictEqual(ranking.KC.rank,2);
}

// Kickoff locking: a saved pick cannot be changed once its selected NFL game starts.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g');
  db.TeamFantasyEntries = [{GameId:'g',EntryId:'e',Username:'alice',EntryName:'Alice',Conference:'ALL',Active:true}];
  db.TeamFantasyPicks = [{GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF',GameDateTime:'2020-01-01T00:00:00Z',CreatedAt:'x'}];
  const past = {eventId:'old',gameDateTime:'2020-01-01T00:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',homeTeamId:'1',awayTeamId:'2',completed:false};
  const future = {eventId:'new',gameDateTime:'2099-01-01T00:00:00Z',homeAbbr:'KC',awayAbbr:'DEN',homeTeamId:'3',awayTeamId:'4',completed:false};
  const schedule = {games:[past,future],byTeam:{BUF:past,MIA:past,KC:future,DEN:future}};
  expectThrow(() => context.teamFantasySavePick_({username:'alice',gameId:'g',entryId:'e',week:1,position:'QB',teamAbbr:'KC',_settings:context.teamFantasyGetSettings_('g'),_entries:[{entryId:'e',username:'alice',conference:'ALL'}],_schedule:schedule}), /locked because its NFL game has started/);
  const bufFuture = {eventId:'buf-future',gameDateTime:'2099-01-02T00:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',homeTeamId:'1',awayTeamId:'2',completed:false};
  db.TeamFantasyPicks[0].GameDateTime = bufFuture.gameDateTime;
  db.TeamFantasyPicks[0].ESPNEventId = bufFuture.eventId;
  const openSchedule = {games:[bufFuture,future],byTeam:{BUF:bufFuture,MIA:bufFuture,KC:future,DEN:future}};
  const changed = context.teamFantasySavePick_({username:'alice',gameId:'g',entryId:'e',week:1,position:'QB',teamAbbr:'KC',_settings:context.teamFantasyGetSettings_('g'),_entries:[{entryId:'e',username:'alice',conference:'ALL'}],_schedule:openSchedule,_deferFlush:true});
  assert.strictEqual(changed.success,true,'pick change must remain allowed before the selected NFL game kicks off');
  assert.strictEqual(db.TeamFantasyPicks[0].TeamAbbr,'KC');
}

function finalSummaryFor(team='BUF') {
  const athlete = (pos, stats) => ({ athlete:{position:{abbreviation:pos}}, stats });
  return {
    header:{competitions:[{status:{type:{completed:true,state:'post'}}}]},
    boxscore:{
      players:[{team:{abbreviation:team},statistics:[
        {name:'passing',labels:['YDS','TD','INT','C/ATT'],athletes:[athlete('QB',['300','2','1','20/30'])]},
        {name:'rushing',labels:['YDS','TD'],athletes:[athlete('QB',['20','0']),athlete('RB',['100','1'])]},
        {name:'receiving',labels:['REC','YDS','TD','TGTS'],athletes:[athlete('RB',['2','20','0','3']),athlete('WR',['5','120','1','8']),athlete('TE',['2','30','0','3'])]},
        {name:'kicking',labels:['FG','XP','PTS'],athletes:[athlete('K',['2/2','3/3','9'])]},
        {name:'defensive',labels:['TOT','SACKS','TFL','PD','QB HTS','FF','FR','TD'],athletes:[
          athlete('DE',['5','2','2','0','3','1','0','0']), athlete('LB',['10','1','1','1','1','0','0','0']), athlete('CB',['4','0','0','2','0','0','0','0'])
        ]},
        {name:'interceptions',labels:['INT','YDS','TD'],athletes:[athlete('CB',['1','20','0'])]}
      ]}],
      teams:[{team:{abbreviation:team},statistics:[
        {name:'rushingYards',value:150},{name:'totalYards',value:400},{name:'netPassingYards',value:250},{name:'sacksYardsLost',displayValue:'2-15'},{name:'turnovers',value:1}
      ]}]
    }
  };
}

// Final source data must be present before a unit can become final. Missing Sports data is not a legitimate zero.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g');
  db.TeamFantasyEntries = [{GameId:'g',EntryId:'e',Username:'alice',EntryName:'Alice',Conference:'ALL',Active:true}];
  db.TeamFantasyPicks = [{GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF',ESPNEventId:'evt'}];
  db.TeamFantasyScoringRules = [{GameId:'g',RuleId:'qb',Position:'QB',StatKey:'passingYards',Label:'Pass yds',RuleType:'unit',PointsPerUnit:.04,Threshold:'',BonusPoints:0,Active:true}];
  context.teamFantasyFetchWeekSchedule_ = () => ({games:[{completed:true,state:'post',status:'Final'}],byTeam:{}});
  context.teamFantasyFetchEspnSummary_ = () => ({header:{competitions:[{status:{type:{completed:true,state:'post'}}}]},boxscore:{}});
  const result = context.teamFantasyRefreshAndScoreWeek_('g',1);
  assert.strictEqual(result.success, false); assert.strictEqual(result.scored, 0); assert.strictEqual(result.pending, 1);
  assert.strictEqual(db.TeamFantasyUnitScores.length, 0, 'missing final player stats must not create a false final zero');
  assert.strictEqual(db.TeamFantasyWeekScores[0].Final, false, 'week must remain unresolved while picked source stats are missing');
  assert(/missing player statistics/.test(result.errors[0].error));
  const manual = context.apiAdminRunTeamFantasySync({gameId:'g',week:1});
  assert.strictEqual(manual.success,false);
  assert(/First error: Final NFL summary is missing player statistics/.test(manual.message), 'manual sync must explain the first source-data error');
  assert.strictEqual(db.TeamFantasySettings[0].LastSyncStatus,'error');
  db.TeamFantasySettings[0].SyncTriggerEnabled=true;
  context.teamFantasyGameDayTriggerWindow_=()=>({active:true,reason:'test'});
  const trigger=context.teamFantasySyncTriggerHandler();
  assert.strictEqual(trigger.results[0].success,false);
  assert(/First error: Final NFL summary is missing player statistics/.test(db.TeamFantasySettings[0].LastSyncMessage), 'automatic sync audit must retain the source-data reason');
}

// Real 8-position extraction/scoring, idempotent rerun, and intentional deterministic rescore after rule edits.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g');
  db.TeamFantasyEntries = [{GameId:'g',EntryId:'e',Username:'alice',EntryName:'Alice',Conference:'ALL',Active:true}];
  db.TeamFantasyPicks = context.TEAM_FANTASY_POSITIONS.map(pos => ({GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Username:'alice',Conference:'ALL',Position:pos,TeamAbbr:'BUF',ESPNEventId:'evt'}));
  const defs = [
    ['QB','passingYards',.1],['RB','rushingYards',.1],['WRTE','receivingYards',.1],['K','fieldGoalsMade',3],['OL','totalYards',.01],['DL','sacks',2],['LB','tacklesTotal',.5],['DB','interceptions',3]
  ];
  db.TeamFantasyScoringRules = defs.map((r,i)=>({GameId:'g',RuleId:'r'+i,Position:r[0],StatKey:r[1],Label:r[1],RuleType:'unit',PointsPerUnit:r[2],Active:true}));
  context.teamFantasyFetchWeekSchedule_ = () => ({games:[{completed:true,state:'post',status:'Final'}],byTeam:{}});
  context.teamFantasyFetchEspnSummary_ = () => finalSummaryFor('BUF');
  let result = context.teamFantasyRefreshAndScoreWeek_('g',1);
  assert.strictEqual(result.success,true); assert.strictEqual(result.scored,8); assert.strictEqual(db.TeamFantasyUnitScores.length,8); assert.strictEqual(db.TeamFantasyWeekScores.length,1);
  const firstTotal = db.TeamFantasyWeekScores[0].FantasyPoints;
  assert.strictEqual(firstTotal, 30+10+15+6+4+4+5+3, 'all eight position groups must contribute');
  result = context.teamFantasyRefreshAndScoreWeek_('g',1);
  assert.strictEqual(db.TeamFantasyUnitScores.length,8,'rerun must upsert, not duplicate unit scores');
  assert.strictEqual(db.TeamFantasyWeekScores.length,1,'rerun must upsert, not duplicate week scores');
  assert.strictEqual(db.TeamFantasyWeekScores[0].FantasyPoints,firstTotal,'same source/rules must be idempotent');
  db.TeamFantasyScoringRules.find(r=>r.Position==='QB').PointsPerUnit=.2;
  context.teamFantasyRefreshAndScoreWeek_('g',1);
  assert.strictEqual(db.TeamFantasyUnitScores.length,8);
  assert.strictEqual(db.TeamFantasyWeekScores[0].FantasyPoints,firstTotal+30,'configured rule edit must consistently rescore existing unit instead of mixing old/new rows');
}

// Missing-pick contract: incomplete lineups stay pending live, but once NFL week closes empty slots become zero and all-play can settle.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g');
  db.TeamFantasyEntries = [{GameId:'g',EntryId:'e',Username:'alice',EntryName:'Alice',Conference:'ALL',Active:true}];
  db.TeamFantasyPicks = [{GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF'}];
  db.TeamFantasyUnitScores = [{GameId:'g',SeasonYear:2026,Week:1,EntryId:'e',Username:'alice',Conference:'ALL',Position:'QB',TeamAbbr:'BUF',FantasyPoints:20,Final:true}];
  context.teamFantasyRefreshWeekScores_('g',1,false);
  assert.strictEqual(db.TeamFantasyWeekScores[0].Final,false);
  context.teamFantasyRefreshWeekScores_('g',1,true);
  assert.strictEqual(db.TeamFantasyWeekScores[0].Final,true);
  assert.strictEqual(db.TeamFantasyWeekScores[0].FantasyPoints,20);
  assert.strictEqual(JSON.parse(db.TeamFantasyWeekScores[0].MissingPositionsJSON).length,7);
}

// Multi-user, multi-week all-play + ties + two entries per user + playoffs + H2H.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g',{EntryMode:'afc-nfc',StandingMode:'combined-user',RegularSeasonEndWeek:2,OverallPlayoffTeams:2,PostseasonScoringMode:'cumulative'});
  db.TeamFantasyLeagues = [{GameId:'g',LeagueId:'complete',LeagueName:'Complete',LeagueType:'complete',StandingMode:'combined-user',PlayoffTeams:2,Active:true}];
  const entries = [
    ['a','alice','ALL'],['b','bob','ALL'],['c','carol','ALL'],['da','dave','AFC'],['dn','dave','NFC']
  ];
  db.TeamFantasyEntries = entries.map(([id,u,c])=>({GameId:'g',EntryId:id,Username:u,EntryName:id,Conference:c,Active:true}));
  db.TeamFantasyLeagueMemberships = entries.map(([id,u])=>({GameId:'g',LeagueId:'complete',EntryId:id,Username:u}));
  function ws(week,id,user,score,final=true){ const c=entries.find(e=>e[0]===id)[2]; return {GameId:'g',SeasonYear:2026,Week:week,EntryId:id,Username:user,Conference:c,FantasyPoints:score,Final:final}; }
  db.TeamFantasyWeekScores = [
    ws(1,'a','alice',100),ws(1,'b','bob',90),ws(1,'c','carol',90),ws(1,'da','dave',40),ws(1,'dn','dave',50),
    ws(2,'a','alice',80),ws(2,'b','bob',100),ws(2,'c','carol',80),ws(2,'da','dave',45),ws(2,'dn','dave',50),
    ws(3,'a','alice',70),ws(3,'b','bob',60),ws(3,'c','carol',999),ws(3,'da','dave',40),ws(3,'dn','dave',40)
  ];
  const standings = context.teamFantasyBuildStandings_('g','complete');
  assert.strictEqual(standings.success,true); assert.strictEqual(standings.rows.length,4,'AFC/NFC entries must combine into one user competitor');
  const alice=standings.rows.find(r=>r.username==='alice'), bob=standings.rows.find(r=>r.username==='bob'), carol=standings.rows.find(r=>r.username==='carol'), dave=standings.rows.find(r=>r.username==='dave');
  assert.strictEqual(alice.regularWins,3); assert.strictEqual(alice.regularLosses,2); assert.strictEqual(alice.regularTies,1);
  assert.strictEqual(bob.regularWins,3); assert.strictEqual(bob.regularLosses,1); assert.strictEqual(bob.regularTies,2);
  assert.strictEqual(dave.regularPoints,185,'two controlled entries must sum into player score in combined mode');
  assert.deepStrictEqual(clone(standings.qualifiers), [bob.competitorId, alice.competitorId], 'playoff field must come from regular-season standings');
  assert(!standings.playoffStandings.some(r=>r.username==='carol'),'nonqualifier must not enter playoff leaderboard even with huge postseason score');
  const h2h = context.apiGetTeamFantasyHeadToHead({gameId:'g',leagueId:'complete',username:'alice',competitorA:'user:alice',competitorB:'user:bob'});
  assert.strictEqual(h2h.success,true); assert.strictEqual(h2h.history.length,3); assert.strictEqual(h2h.aWins,2); assert.strictEqual(h2h.bWins,1); assert.strictEqual(h2h.ties,0);
}

// Deterministic multi-user season simulation: every finalized week produces true all-play W/L/T decisions and playoff filtering.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g',{EntryMode:'single',StandingMode:'entries',RegularSeasonEndWeek:5,OverallPlayoffTeams:4,PostseasonScoringMode:'cumulative'});
  db.TeamFantasyLeagues=[{GameId:'g',LeagueId:'complete',LeagueName:'Complete',LeagueType:'complete',StandingMode:'entries',PlayoffTeams:4,Active:true}];
  const users=['a','b','c','d','e','f'];
  db.TeamFantasyEntries=users.map(u=>({GameId:'g',EntryId:u,Username:u,EntryName:u.toUpperCase(),Conference:'ALL',Active:true}));
  db.TeamFantasyLeagueMemberships=users.map(u=>({GameId:'g',LeagueId:'complete',EntryId:u,Username:u}));
  db.TeamFantasyWeekScores=[];
  const weeks=[
    [100,90,90,80,70,60],
    [60,70,80,90,100,100],
    [85,85,85,85,85,85],
    [110,100,90,80,70,60],
    [75,95,65,105,85,55]
  ];
  weeks.forEach((scores,w)=>scores.forEach((score,i)=>db.TeamFantasyWeekScores.push({GameId:'g',SeasonYear:2026,Week:w+1,EntryId:users[i],Username:users[i],Conference:'ALL',FantasyPoints:score,Final:true})));
  // Everyone has a Week 6 score, but only the regular-season top four may count in postseason standings/H2H.
  [10,20,999,30,888,40].forEach((score,i)=>db.TeamFantasyWeekScores.push({GameId:'g',SeasonYear:2026,Week:6,EntryId:users[i],Username:users[i],Conference:'ALL',FantasyPoints:score,Final:true}));
  const standings=context.teamFantasyBuildStandings_('g','complete');
  assert.strictEqual(standings.rows.length,6);
  users.forEach((u,i)=>{
    let wins=0,losses=0,ties=0;
    weeks.forEach(scores=>scores.forEach((other,j)=>{
      if (j===i) return;
      if (scores[i]>other) wins++; else if (scores[i]<other) losses++; else ties++;
    }));
    const row=standings.rows.find(r=>r.entryId===u);
    assert.strictEqual(row.regularWins,wins,`${u} all-play wins`);
    assert.strictEqual(row.regularLosses,losses,`${u} all-play losses`);
    assert.strictEqual(row.regularTies,ties,`${u} all-play ties`);
    assert.strictEqual(row.regularWins+row.regularLosses+row.regularTies,25,`${u} must receive five decisions against five opponents each regular week`);
  });
  assert.strictEqual(standings.qualifiers.length,4);
  const qualifierSet=new Set(standings.qualifiers);
  assert(standings.playoffStandings.every(r=>qualifierSet.has(r.competitorId)),'postseason leaderboard must contain qualifiers only');
  assert(!standings.playoffStandings.some(r=>r.entryId==='c' && r.postseasonPoints===999 && !qualifierSet.has(r.competitorId)),'huge nonqualifier postseason score must not enter playoff standings');
  const qualifierIds=standings.qualifiers.slice(0,2);
  const qH2h=context.apiGetTeamFantasyHeadToHead({gameId:'g',leagueId:'complete',username:qualifierIds[0].slice(6),competitorA:qualifierIds[0],competitorB:qualifierIds[1]});
  assert.strictEqual(qH2h.history.length,6,'two league qualifiers should retain postseason H2H');
  const nonqualifier=standings.rows.find(r=>!qualifierSet.has(r.competitorId));
  const qVsOut=context.apiGetTeamFantasyHeadToHead({gameId:'g',leagueId:'complete',username:qualifierIds[0].slice(6),competitorA:qualifierIds[0],competitorB:nonqualifier.competitorId});
  assert.strictEqual(qVsOut.history.length,5,'postseason H2H must stop when one competitor failed the league cut');
}

// Home Hub/reminder outstanding counts: AFC+NFC mode has 16 required slots and counts only actionable missing picks.
{
  const { context, db, setSettings, seedCompleteLeague } = makeHarness();
  setSettings('g',{EntryMode:'afc-nfc',TeamUseLimit:3}); seedCompleteLeague('g');
  const entries=context.teamFantasyEnsureEntriesForUser_('g','alice');
  const afc=entries.find(e=>e.conference==='AFC'), nfc=entries.find(e=>e.conference==='NFC');
  const futureA={eventId:'a',gameDateTime:'2099-01-01T00:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',homeTeamId:'1',awayTeamId:'2',completed:false};
  const futureN={eventId:'n',gameDateTime:'2099-01-01T00:00:00Z',homeAbbr:'DAL',awayAbbr:'PHI',homeTeamId:'3',awayTeamId:'4',completed:false};
  const schedule={games:[futureA,futureN],byTeam:{BUF:futureA,MIA:futureA,DAL:futureN,PHI:futureN}};
  context.teamFantasyFetchWeekSchedule_=()=>schedule;
  db.TeamFantasyPicks = context.TEAM_FANTASY_POSITIONS.map(pos=>({GameId:'g',SeasonYear:2026,Week:1,EntryId:afc.entryId,Username:'alice',Conference:'AFC',Position:pos,TeamAbbr:'BUF',ESPNEventId:'a',GameDateTime:futureA.gameDateTime}));
  db.TeamFantasyPicks.push({GameId:'g',SeasonYear:2026,Week:1,EntryId:nfc.entryId,Username:'alice',Conference:'NFC',Position:'QB',TeamAbbr:'DAL',ESPNEventId:'n',GameDateTime:futureN.gameDateTime});
  const summary=context.teamFantasyNotificationOutstandingSummary_('g',['alice']);
  assert.strictEqual(summary.details[0].required,16); assert.strictEqual(summary.details[0].picked,9); assert.strictEqual(summary.details[0].missingCount,7);
  assert.deepStrictEqual(clone(summary.incompleteUsers),['alice']);
}

// Postseason eligibility is league-aware: nonqualifiers stop accruing obligations, while qualifying in any active league keeps the entry alive.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g',{EntryMode:'single',StandingMode:'combined-user',RegularSeasonEndWeek:2,OverallPlayoffTeams:2,CurrentWeek:3,PostseasonScoringMode:'cumulative'});
  db.TeamFantasyLeagues = [
    {GameId:'g',LeagueId:'complete',LeagueName:'Complete',LeagueType:'complete',StandingMode:'combined-user',PlayoffTeams:2,Active:true},
    {GameId:'g',LeagueId:'side',LeagueName:'Side',LeagueType:'subleague',StandingMode:'entries',PlayoffTeams:2,Active:true}
  ];
  const entries = [
    {entryId:'a',username:'alice',entryName:'Alice',conference:'ALL',active:true},
    {entryId:'b',username:'bob',entryName:'Bob',conference:'ALL',active:true},
    {entryId:'c',username:'carol',entryName:'Carol',conference:'ALL',active:true},
    {entryId:'d',username:'dave',entryName:'Dave',conference:'ALL',active:true},
    {entryId:'e',username:'erin',entryName:'Erin',conference:'ALL',active:true}
  ];
  db.TeamFantasyEntries = entries.map(e=>({GameId:'g',EntryId:e.entryId,Username:e.username,EntryName:e.entryName,Conference:e.conference,Active:true}));
  db.TeamFantasyLeagueMemberships = entries.map(e=>({GameId:'g',LeagueId:'complete',EntryId:e.entryId,Username:e.username})).concat([
    {GameId:'g',LeagueId:'side',EntryId:'c',Username:'carol'},
    {GameId:'g',LeagueId:'side',EntryId:'d',Username:'dave'},
    {GameId:'g',LeagueId:'side',EntryId:'e',Username:'erin'}
  ]);
  const regular = {alice:[90,90],bob:[100,100],carol:[80,80],dave:[70,70],erin:[60,60]};
  db.TeamFantasyWeekScores = [];
  entries.forEach(e=>regular[e.username].forEach((score,i)=>db.TeamFantasyWeekScores.push({GameId:'g',SeasonYear:2026,Week:i+1,EntryId:e.entryId,Username:e.username,Conference:'ALL',FantasyPoints:score,Final:true})));
  // Stale/legacy postseason rows prove nonqualifiers cannot sneak into playoff obligations/H2H merely because a week score exists.
  db.TeamFantasyWeekScores.push(
    {GameId:'g',SeasonYear:2026,Week:3,EntryId:'a',Username:'alice',Conference:'ALL',FantasyPoints:50,Final:true},
    {GameId:'g',SeasonYear:2026,Week:3,EntryId:'c',Username:'carol',Conference:'ALL',FantasyPoints:55,Final:true},
    {GameId:'g',SeasonYear:2026,Week:3,EntryId:'d',Username:'dave',Conference:'ALL',FantasyPoints:45,Final:true},
    {GameId:'g',SeasonYear:2026,Week:3,EntryId:'e',Username:'erin',Conference:'ALL',FantasyPoints:999,Final:true}
  );
  const settings=context.teamFantasyGetSettings_('g');
  const eligibility=context.teamFantasyPostseasonEligibility_('g',settings,3,entries);
  assert.strictEqual(eligibility.a,true); assert.strictEqual(eligibility.b,true,'Complete League qualifiers stay eligible');
  assert.strictEqual(eligibility.c,true,'entry outside Complete cut remains eligible after qualifying in a subleague');
  assert.strictEqual(eligibility.d,true,'second subleague qualifier stays eligible');
  assert.strictEqual(eligibility.e,false,'entry missing every league cut must be postseason-ineligible');

  const future={eventId:'evt3',gameDateTime:'2099-01-01T00:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',homeTeamId:'1',awayTeamId:'2',completed:false};
  const schedule={games:[future],byTeam:{BUF:future,MIA:future}};
  const carol=entries.find(e=>e.entryId==='c'), erin=entries.find(e=>e.entryId==='e');
  const saved=context.teamFantasySavePick_({gameId:'g',username:'carol',entryId:'c',position:'QB',teamAbbr:'BUF',week:3,_settings:settings,_entries:[carol],_schedule:schedule,_deferFlush:true});
  assert.strictEqual(saved.success,true,'subleague qualifier must be able to keep playing postseason');
  expectThrow(()=>context.teamFantasySavePick_({gameId:'g',username:'erin',entryId:'e',position:'QB',teamAbbr:'BUF',week:3,_settings:settings,_entries:[erin],_schedule:schedule,_deferFlush:true}),/did not qualify for the postseason/);

  const completeH2h=context.apiGetTeamFantasyHeadToHead({gameId:'g',leagueId:'complete',username:'alice',competitorA:'user:alice',competitorB:'user:erin'});
  assert.strictEqual(completeH2h.history.length,2,'Complete League H2H must exclude postseason when either competitor missed that league cut');
  const sideH2h=context.apiGetTeamFantasyHeadToHead({gameId:'g',leagueId:'side',username:'carol',competitorA:'entry:c',competitorB:'entry:d'});
  assert.strictEqual(sideH2h.history.length,3,'subleague H2H may include postseason when both entries qualified in that league');

  context.teamFantasyFetchWeekSchedule_=()=>({games:[],byTeam:{}});
  const outstanding=context.teamFantasyNotificationOutstandingSummary_('g',['erin']);
  const erinDetail=outstanding.details.find(d=>d.username==='erin');
  assert.strictEqual(erinDetail.required,0); assert.strictEqual(erinDetail.missingCount,0);
  assert(!outstanding.missingUsers.includes('erin'),'eliminated postseason entries must not create Home Hub/reminder obligations');

  context.teamFantasyRefreshWeekScores_('g',3,true);
  const erinWeek3=db.TeamFantasyWeekScores.find(r=>r.EntryId==='e' && Number(r.Week)===3);
  assert.strictEqual(erinWeek3.Final,false,'stale postseason score for a nonqualifier must be neutralized rather than finalized');
  assert.strictEqual(erinWeek3.FantasyPoints,0);
}

// Player UX must explain postseason elimination instead of rendering an empty lineup with action buttons.
{
  assert(playerSource.includes('lineup.postseasonEligible === false'));
  assert(playerSource.includes('Postseason Complete'));
  assert(playerSource.includes('no outstanding picks for this week'));
}

// Run Check/preflight must catch a missing Sports dependency and conflicting memberships.
{
  const { context, db, setSettings } = makeHarness();
  setSettings('g',{SameEntryMultipleLeagues:false});
  db.TeamFantasyScoringRules=context.teamFantasyDefaultRules_().map((r,i)=>({GameId:'g',RuleId:'r'+i,Position:r[0],StatKey:r[1],Label:r[2],RuleType:r[3],PointsPerUnit:r[4],Threshold:r[5],BonusPoints:r[6],Active:(r.length>7?r[7]===true:true) && r[0] !== 'QB'}));
  db.TeamFantasyLeagues=[{GameId:'g',LeagueId:'a',LeagueType:'subleague',Active:true},{GameId:'g',LeagueId:'b',LeagueType:'subleague',Active:true}];
  db.TeamFantasyLeagueMemberships=[{GameId:'g',LeagueId:'a',EntryId:'e'},{GameId:'g',LeagueId:'b',EntryId:'e'}];
  const issues=context.teamFantasyPreflightIssues_('g');
  assert(issues.some(i=>/QB has no active scoring rule/.test(i.message) && i.severity==='error'));
  assert(issues.some(i=>/Sports Scores Engine URL is not configured/.test(i.message)));
  assert(issues.some(i=>/multiple subleagues/.test(i.message)));
}

// The separate Sports Scores Engine remains a dependency only; Team Fantasy's own source names the required contracts.
{
  assert(engineSource.includes('getTeamFantasyNflSchedule'));
  assert(engineSource.includes('getTeamFantasyNflSummary'));
  assert(engineSource.includes('Direct ESPN fetch is disabled'));
}

console.log('team-fantasy-rc10-reliability-tests: PASS');
