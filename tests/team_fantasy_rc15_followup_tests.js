const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyEngine.js'), 'utf8');
const pageSource = fs.readFileSync(path.join(root, 'frontend/js/pages/teamFantasy.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'frontend/js/pages/adminTeamFantasy.js'), 'utf8');

function fnBlock(source, name) {
  const starts = [source.indexOf('function ' + name + '('), source.indexOf('async function ' + name + '(')].filter(i => i >= 0);
  assert(starts.length, 'Missing function ' + name);
  const start = Math.min(...starts);
  const candidates = [source.indexOf('\nfunction ', start + 10), source.indexOf('\nasync function ', start + 10)].filter(i => i >= 0);
  return source.slice(start, candidates.length ? Math.min(...candidates) : source.length);
}

// Static RC15 UX/performance contracts.
assert(pageSource.includes('Random Fill Selected'), 'Bulk Random control must be near Weekly Picks');
assert(pageSource.includes('Auto Pick Selected'), 'Bulk Auto control must be near Weekly Picks');
assert(pageSource.includes('You are about to select RANDOM.'), 'Random confirmation wording missing');
assert(pageSource.includes('No points are deducted.'), 'Random confirmation must say no points are deducted');
assert(pageSource.includes('Top Ranked Team Selected'), 'Auto Pick help must identify Top Ranked Team Selected');
assert(pageSource.includes('Auto Pick carries a points penalty.'), 'Auto Pick confirmation must explain penalty');
assert(pageSource.includes('positions ×') && pageSource.includes('points = -'), 'Bulk Auto must preview total penalty');
assert(pageSource.includes('Lineup Set') && pageSource.includes('Make changes before kickoff'), 'Complete lineup header/action contract missing');
assert(pageSource.includes('Make Changes Before Kickoff'), 'Filled editable positions need clear change wording');
assert(pageSource.includes('CURRENT WEEK'), 'Weekly standings selector must label real current week');
assert(adminSource.includes('Auto Pick Penalty Per Position'), 'Admin Auto Pick penalty setting missing');
const autoFn = fnBlock(engineSource, 'teamFantasyAutoPick_');
assert(autoFn.includes('teamFantasyAppendPickRowsBatch_(plannedRows)'), 'Auto Pick must batch planned pick writes');
assert(autoFn.includes('_collectOnly:true'), 'Auto Pick must validate/plan without per-position sheet writes');
assert(engineSource.includes('AutoPickPenaltyPerPosition') && engineSource.includes('AutoPickPenalty'), 'Penalty must be stored in settings and by pick position');

function makeHarness() {
  let uuid = 0;
  const cache = new Map();
  const context = {
    console, Date, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map,
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    Math: Object.create(Math),
    Utilities: { getUuid: () => 'uuid-' + (++uuid) + '-abcdefghij' },
    SpreadsheetApp: { flush() {} },
    CacheService: { getScriptCache: () => ({ get:k => cache.has(k) ? cache.get(k) : null, put:(k,v) => cache.set(k,v) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    ScriptApp: { getProjectTriggers:()=>[], newTrigger:()=>({timeBased(){return this;},everyMinutes(){return this;},create(){return this;}}), deleteTrigger(){} },
    getGame: id => ({ id, gameId:id, type:'team-fantasy', year:2099 }),
    requireAdminFromToken_: () => 'admin'
  };
  context.Math.random = () => 0;
  vm.createContext(context);
  vm.runInContext(engineSource, context, { filename:'SportsTeamFantasyEngine.js' });

  const db = {};
  const rawRows = name => db[name] || (db[name] = []);
  const readRows = name => rawRows(name).map((row,index) => ({ ...row, _rowNumber:index+2 }));
  context.setupSportsTeamFantasySystem = () => ({ success:true });
  context.teamFantasyEnsureSheet_ = () => ({});
  context.teamFantasyReadRows_ = readRows;
  context.teamFantasyWriteObjectRow_ = (name,rowNumber,values) => { rawRows(name)[rowNumber-2] = { ...values }; };
  context.teamFantasyAppendObject_ = (name,values) => { rawRows(name).push({ ...values }); return rawRows(name).length+1; };
  context.teamFantasyUpsert_ = (name,matcher,values) => {
    const rows = rawRows(name), objects = readRows(name), idx = objects.findIndex(matcher);
    if (idx >= 0) { rows[idx] = { ...rows[idx], ...(values||{}) }; return idx+2; }
    rows.push({ ...(values||{}) }); return rows.length+1;
  };
  context.teamFantasyWritePickRow_ = (current,values) => {
    if (current && current._rowNumber) rawRows('TeamFantasyPicks')[current._rowNumber-2] = { ...values };
    else rawRows('TeamFantasyPicks').push({ ...values });
    return current && current._rowNumber || rawRows('TeamFantasyPicks').length+1;
  };
  context.teamFantasyAppendPickRowsBatch_ = values => { values.forEach(v => rawRows('TeamFantasyPicks').push({ ...v })); return values.length; };
  return { context, db, rawRows, readRows };
}

function settingRow(ctx, gameId, extra={}) {
  return { ...ctx.teamFantasyDefaultSettings_(gameId), SeasonYear:2099, CurrentWeek:1, TeamUseLimit:3, ...extra };
}
function entryRow(gameId,user,id=user+'-entry',conference='ALL') { return {GameId:gameId,EntryId:id,Username:user,EntryName:id,Conference:conference,Active:true}; }
function nflGame(eventId,home,away,dt='2099-09-10T18:00:00Z') { return {eventId,gameDateTime:dt,homeAbbr:home,awayAbbr:away,homeTeamId:'h'+eventId,awayTeamId:'a'+eventId,completed:false,status:'scheduled',state:'pre'}; }
function makeSchedule() {
  const games=[
    nflGame('1','BUF','MIA'), nflGame('2','KC','DEN'), nflGame('3','PHI','DAL'), nflGame('4','GB','CHI'),
    nflGame('5','BAL','CIN'), nflGame('6','HOU','IND'), nflGame('7','SF','SEA'), nflGame('8','TB','ATL')
  ];
  const byTeam={}; games.forEach(g=>{byTeam[g.homeAbbr]=g;byTeam[g.awayAbbr]=g;}); return {games,byTeam};
}
const schedule = makeSchedule();

// Mixed manual / Random / Auto Home Hub count: exactly 7/8 = 1 remaining.
{
  const {context,db}=makeHarness();
  db.TeamFantasySettings=[settingRow(context,'g1')]; db.TeamFantasyEntries=[entryRow('g1','alice','e1')];
  const methods=['manual','manual','random','random','auto','auto','manual'];
  const positions=['QB','RB','WRTE','OL','K','DL','LB'];
  db.TeamFantasyPicks=positions.map((pos,i)=>({GameId:'g1',SeasonYear:2099,Week:1,EntryId:'e1',Username:'alice',Position:pos,TeamAbbr:['BUF','KC','PHI','GB','BAL','HOU','SF'][i],PickMethod:methods[i]}));
  let p=context.teamFantasyDashboardProgress_('g1','alice');
  assert.strictEqual(p.madeCount,7); assert.strictEqual(p.remainingCount,1,'Mixed-source 7/8 lineup must report exactly 1 remaining');
  db.TeamFantasyPicks=db.TeamFantasyPicks.slice(0,3); p=context.teamFantasyDashboardProgress_('g1','alice');
  assert.strictEqual(p.madeCount,3); assert.strictEqual(p.remainingCount,5,'3/8 regression');
  db.TeamFantasyPicks.push({GameId:'g1',SeasonYear:2099,Week:1,EntryId:'e1',Username:'alice',Position:'OL',TeamAbbr:'GB',PickMethod:'auto'}); p=context.teamFantasyDashboardProgress_('g1','alice');
  assert.strictEqual(p.madeCount,4); assert.strictEqual(p.remainingCount,4,'4/8 regression');
}

// Default penalty = 0 and Admin can configure 2.
{
  const {context,db}=makeHarness();
  db.TeamFantasySettings=[settingRow(context,'g1')];
  assert.strictEqual(context.teamFantasyGetSettings_('g1').autoPickPenaltyPerPosition,0);
  const res=context.apiAdminSaveTeamFantasySettings({token:'x',gameId:'g1',autoPickPenaltyPerPosition:2});
  assert.strictEqual(res.settings.autoPickPenaltyPerPosition,2);
}

// Auto save penalty, Auto->manual clears, Auto->Auto replaces (does not double charge).
{
  const {context,db}=makeHarness();
  db.TeamFantasySettings=[settingRow(context,'g1',{AutoPickPenaltyPerPosition:2})]; db.TeamFantasyEntries=[entryRow('g1','alice','e1')];
  const settings=context.teamFantasyGetSettings_('g1'), entries=context.teamFantasyEntriesForUser_('g1','alice');
  let r=context.teamFantasySavePick_({username:'alice',gameId:'g1',entryId:'e1',week:1,position:'QB',teamAbbr:'BUF',pickMethod:'auto',_settings:settings,_entries:entries,_schedule:schedule,_validatedGame:true});
  assert.strictEqual(r.savedPick.autoPickPenalty,2); assert.strictEqual(db.TeamFantasyPicks[0].AutoPickPenalty,2);
  r=context.teamFantasySavePick_({username:'alice',gameId:'g1',entryId:'e1',week:1,position:'QB',teamAbbr:'MIA',pickMethod:'manual',_settings:settings,_entries:entries,_schedule:schedule,_validatedGame:true});
  assert.strictEqual(db.TeamFantasyPicks[0].AutoPickPenalty,0,'Auto->manual must remove penalty');
  r=context.teamFantasySavePick_({username:'alice',gameId:'g1',entryId:'e1',week:1,position:'QB',teamAbbr:'BUF',pickMethod:'auto',_settings:settings,_entries:entries,_schedule:schedule,_validatedGame:true});
  assert.strictEqual(db.TeamFantasyPicks[0].AutoPickPenalty,2,'Auto->Auto must store one configured penalty, not accumulate');
}

// Bulk Random / Auto selected positions and penalty preview math from backend response.
{
  const {context,db}=makeHarness();
  db.TeamFantasySettings=[settingRow(context,'g1',{AutoPickPenaltyPerPosition:2})]; db.TeamFantasyEntries=[entryRow('g1','alice','e1')];
  const settings=context.teamFantasyGetSettings_('g1'), entries=context.teamFantasyEntriesForUser_('g1','alice');
  let res=context.teamFantasyAutoPick_({username:'alice',gameId:'g1',entryId:'e1',week:1,positions:['QB','RB'],_settings:settings,_entries:entries,_schedule:schedule,_validatedGame:true},true);
  assert.strictEqual(res.saved,2); assert.strictEqual(res.totalPenalty,0); assert.deepStrictEqual(Array.from(res.positions),['QB','RB']);
  res=context.teamFantasyAutoPick_({username:'alice',gameId:'g1',entryId:'e1',week:1,positions:['WRTE','OL','K','DL'],_settings:settings,_entries:entries,_schedule:schedule,_validatedGame:true},false);
  assert.strictEqual(res.saved,4); assert.strictEqual(res.totalPenalty,8,'4 positions × 2 = -8');
  assert.strictEqual(db.TeamFantasyPicks.filter(r=>r.PickMethod==='auto').length,4);
}

// Eight Auto Pick positions = -16 and week score/rescore idempotent; standings/H2H consume net score once.
{
  const {context,db}=makeHarness();
  db.TeamFantasySettings=[settingRow(context,'g1',{AutoPickPenaltyPerPosition:2})];
  db.TeamFantasyEntries=[entryRow('g1','alice','a'),entryRow('g1','bob','b')];
  db.TeamFantasyLeagues=[{GameId:'g1',LeagueId:'complete',LeagueName:'Complete',LeagueType:'complete',StandingMode:'entries',PlayoffTeams:2,Active:true}];
  db.TeamFantasyLeagueMemberships=[{GameId:'g1',LeagueId:'complete',EntryId:'a',Username:'alice'},{GameId:'g1',LeagueId:'complete',EntryId:'b',Username:'bob'}];
  const teams=['BUF','KC','PHI','GB','BAL','HOU','SF','TB'];
  db.TeamFantasyPicks=[]; db.TeamFantasyUnitScores=[];
  ['a','b'].forEach((entryId,ei)=>context.TEAM_FANTASY_POSITIONS.forEach((pos,i)=>{
    db.TeamFantasyPicks.push({GameId:'g1',SeasonYear:2099,Week:1,EntryId:entryId,Username:entryId==='a'?'alice':'bob',Conference:'ALL',Position:pos,TeamAbbr:teams[i],PickMethod:entryId==='a'?'auto':'manual',AutoPickPenalty:entryId==='a'?2:0});
    db.TeamFantasyUnitScores.push({GameId:'g1',SeasonYear:2099,Week:1,EntryId:entryId,Username:entryId==='a'?'alice':'bob',Conference:'ALL',Position:pos,TeamAbbr:teams[i],FantasyPoints:entryId==='a'?10:9,Final:true});
  }));
  context.teamFantasyPostseasonEligibility_=()=>({a:true,b:true});
  context.teamFantasyRefreshWeekScores_('g1',1,true);
  let a=db.TeamFantasyWeekScores.find(r=>r.EntryId==='a'), b=db.TeamFantasyWeekScores.find(r=>r.EntryId==='b');
  assert.strictEqual(a.FantasyPoints,64,'80 base - 16 penalty'); assert.strictEqual(b.FantasyPoints,72);
  context.teamFantasyRefreshWeekScores_('g1',1,true);
  a=db.TeamFantasyWeekScores.find(r=>r.EntryId==='a');
  assert.strictEqual(a.FantasyPoints,64,'Rescore must not double-charge penalty'); assert.strictEqual(db.TeamFantasyWeekScores.filter(r=>r.EntryId==='a').length,1,'Rescore must upsert idempotently');
  const standings=context.teamFantasyBuildStandings_('g1','complete');
  const ar=standings.rows.find(r=>r.entryId==='a'), br=standings.rows.find(r=>r.entryId==='b');
  assert.strictEqual(ar.regularPoints,64); assert.strictEqual(br.regularPoints,72); assert.strictEqual(ar.regularLosses,1); assert.strictEqual(br.regularWins,1);
  const h2h=context.apiGetTeamFantasyHeadToHead({gameId:'g1',leagueId:'complete',username:'alice',competitorA:'entry:a',competitorB:'entry:b'});
  assert.strictEqual(h2h.aPoints,64); assert.strictEqual(h2h.bPoints,72);
}

console.log('team-fantasy-rc15-followup-tests: PASS');
