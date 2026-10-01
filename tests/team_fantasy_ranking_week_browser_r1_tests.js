const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/SportsTeamFantasyEngine.js'), 'utf8');
const frontendSource = fs.readFileSync(path.join(root, 'frontend/js/pages/teamFantasy.js'), 'utf8');

const context = { console, Date, JSON, String, Number, Array, Object, Boolean, RegExp, Set, Map, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Math };
vm.createContext(context);
vm.runInContext(engineSource, context, { filename: 'SportsTeamFantasyEngine.js' });

const positions = context.TEAM_FANTASY_POSITIONS.slice();
const teams = context.TEAM_FANTASY_NFL_TEAMS.map(t => t.abbr);

function rankingRow(team, position, week, points, eventId) {
  return {
    GameId:'g', SeasonYear:2026, Week:week,
    EntryId:context.teamFantasyRankingEntryId_(team, position),
    Username:'__ranking__:fixture',
    Position:position, TeamAbbr:team, ESPNEventId:eventId || ('evt-'+week+'-'+team),
    FantasyPoints:points, Final:true, UpdatedAt:'2026-09-'+String(week+10).padStart(2,'0')+'T00:00:00Z'
  };
}

// Week 4 rankings use only completed Weeks 1-3 and always rank all 32 NFL teams.
const rows = [];
positions.forEach((position,pIndex) => {
  teams.forEach((team,tIndex) => {
    if (team === 'ARI') return; // zero-game team remains in universe but must rank below scored teams.
    for (let week=1; week<=3; week++) {
      let points = 10 + tIndex + pIndex + week;
      if (team === 'DET') points = 100 + pIndex; // force a non-alphabetical leader.
      if (team === 'BAL') points = -5; // completed scoring data still outranks a zero-game team.
      if (team === 'BUF' || team === 'MIA') points = 30 + pIndex; // equal averages: abbreviation tie-break.
      rows.push(rankingRow(team, position, week, points));
    }
  });
});
// Week 4 data must not influence the Week 4 pre-week ranking.
rows.push(rankingRow('ARI','QB',4,9999,'future-week-4'));

positions.forEach(position => {
  const map = context.teamFantasyRankingsFromRows_(rows,'g',position,4,2026);
  assert.strictEqual(Object.keys(map).length,32,'all 32 NFL teams ranked for '+position);
  assert.strictEqual(map.DET.rank,1,'real average points, not alphabet, lead '+position);
  assert(map.BAL.rank < map.ARI.rank,'completed-game team must rank above zero-game team even with a negative average');
  if (position === 'QB') {
    assert(map.BUF.rank < map.MIA.rank,'equal averages use deterministic abbreviation tie-break');
    assert.strictEqual(map.ARI.games,0,'Week 4 row must not count before Week 4');
  }
});
const coverage = context.teamFantasyRankingCoverage_(rows,'g',4,2026);
positions.forEach(position => {
  assert.strictEqual(coverage[position].teams,31,'fixture intentionally has 31 scored historical teams; ranking still seeds team 32');
});

// Mathematical scoring proof: raw ESPN-shaped stats -> rules -> persisted ranking FantasyPoints.
function athlete(pos, stats){ return { athlete:{ position:{ abbreviation:pos } }, stats }; }
function playerBlock(team){
  return { team:{abbreviation:team}, statistics:[
    {name:'passing',labels:['YDS','TD','INT','C/ATT'],athletes:[athlete('QB',['300','2','1','20/30'])]},
    {name:'rushing',labels:['YDS','TD'],athletes:[athlete('QB',['20','0']),athlete('RB',['100','1'])]},
    {name:'receiving',labels:['REC','YDS','TD','TGTS'],athletes:[athlete('RB',['2','20','0','3']),athlete('WR',['5','120','1','8']),athlete('TE',['2','30','0','3'])]},
    {name:'kicking',labels:['FG','XP','PTS'],athletes:[athlete('K',['2/2','3/3','9'])]},
    {name:'defensive',labels:['TOT','SACKS','TFL','PD','QB HTS','FF','FR','TD'],athletes:[
      athlete('DE',['5','2','2','0','3','1','0','0']),
      athlete('LB',['10','1','1','1','1','0','0','0']),
      athlete('CB',['4','0','0','2','0','0','0','0'])
    ]},
    {name:'interceptions',labels:['INT','YDS','TD'],athletes:[athlete('CB',['1','20','0'])]}
  ]};
}
function teamBlock(team){ return { team:{abbreviation:team}, statistics:[
  {name:'rushingYards',value:150},{name:'totalYards',value:400},{name:'netPassingYards',value:250},{name:'sacksYardsLost',displayValue:'2-15'},{name:'turnovers',value:1}
]};}
const summary = {
  header:{competitions:[{status:{type:{completed:true,state:'post'}}}]},
  boxscore:{players:[playerBlock('BUF'),playerBlock('KC')],teams:[teamBlock('BUF'),teamBlock('KC')]}
};
const rules = context.teamFantasyDefaultRules_().map((r,i)=>({
  ruleId:'r'+i, position:r[0], statKey:r[1], label:r[2], ruleType:r[3],
  pointsPerUnit:r[4], threshold:r[5]===''?null:Number(r[5]), bonusPoints:r[6], active:r.length>7?r[7]===true:true
}));
const persisted = context.teamFantasyRankingRowsFromSummary_('g',{seasonYear:2026},1,'401000001',['BUF','KC'],summary,rules);
assert.strictEqual(persisted.length,16,'completed NFL game persists 2 teams x 8 position-unit rows');
function persistedRow(team,position){ return persisted.find(r=>r.TeamAbbr===team&&r.Position===position); }
const qb = persistedRow('BUF','QB');
const k = persistedRow('BUF','K');
const lb = persistedRow('BUF','LB');
assert(qb && k && lb,'QB, K and LB persisted rows required');
assert.strictEqual(qb.FantasyPoints,23,'QB: 300 pass yds(12)+2 TD(8)-1 INT(2)+20 rush yds(2)+300 bonus(3)=23');
assert.strictEqual(k.FantasyPoints,9,'K: 2 FG(6)+3 XP(3)=9');
assert.strictEqual(lb.FantasyPoints,8,'LB: 10 tackles(5)+1 sack(2)+1 TFL(1)=8');
[qb,k,lb].forEach(row=>{
  assert.strictEqual(row.Final,true,'ranking source must be final');
  assert.strictEqual(row.ESPNEventId,'401000001','ranking source must retain ESPN event');
  const stats=JSON.parse(row.StatsJSON);
  const rescored=context.teamFantasyScoreStats_(rules,row.Position,stats);
  assert.strictEqual(row.FantasyPoints,rescored.points,'persisted FantasyPoints must equal scoring-rule calculation for '+row.Position);
});

// Previously persisted all-zero completed-game rows are not trusted forever: they are recomputed.
{
  const zeroRows = persisted.map(r=>({...r,FantasyPoints:0}));
  let rewritten=[];
  context.teamFantasyFetchEspnSummary_=()=>summary;
  context.teamFantasyUpsertRankingRowsBatch_=batch=>{ rewritten=batch.slice(); return {inserted:0,updated:batch.length,unchanged:0}; };
  const result=context.teamFantasyRefreshRankingUniverseWeek_(
    'g',1,{seasonYear:2026},
    {games:[{eventId:'401000001',homeAbbr:'BUF',awayAbbr:'KC',completed:true,state:'post',status:'Final'}],byTeam:{}},
    rules,{},zeroRows
  );
  assert.strictEqual(result.generated,16,'all-zero completed-game ranking set must be recomputed');
  assert(rewritten.some(r=>r.Position==='QB'&&r.FantasyPoints===23),'recomputed QB row must carry real scoring points');
  assert(rewritten.some(r=>r.Position==='K'&&r.FantasyPoints===9),'recomputed K row must carry real scoring points');
}

// Main state week browser: default current Week 4, explicit Week 2, and scheduled future Week 5.
{
  const schedule = week => ({
    games:[{eventId:'w'+week,gameDateTime:'2099-10-0'+Math.min(week,9)+'T18:00:00Z',homeAbbr:'BUF',awayAbbr:'MIA',completed:false,state:'pre',status:'Scheduled'}],
    byTeam:{}
  });
  const schedules={2:schedule(2),4:schedule(4),5:schedule(5)};
  schedules[2].byTeam={BUF:schedules[2].games[0],MIA:schedules[2].games[0]};
  schedules[4].byTeam={BUF:schedules[4].games[0],MIA:schedules[4].games[0]};
  schedules[5].byTeam={BUF:schedules[5].games[0],MIA:schedules[5].games[0]};
  const settings={gameId:'g',seasonYear:2026,currentWeek:2,regularSeasonEndWeek:18,teamUseLimit:3,playoffUsageMode:'reset'};
  context.teamFantasyGetSettings_=()=>settings;
  context.teamFantasyRequireGameAccess_=()=>({allowed:true});
  context.teamFantasyIsGame_=()=>true;
  context.teamFantasyNflWeekTiming_=()=>({week:4,mode:'auto',source:'nfl-schedule-state',storedWeek:2,scheduleByWeek:{4:schedules[4]}});
  context.teamFantasyEnsureEntriesForUser_=()=>[];
  context.teamFantasyPostseasonEligibility_=()=>({});
  context.teamFantasyEnsureRankingUniverseBeforeWeek_=()=>({success:true,weeks:[],errors:[]});
  context.teamFantasyReadRows_=()=>[];
  context.teamFantasyLeaguesForEntries_=()=>[];
  context.teamFantasyBuildStandings_=()=>({success:false});
  context.teamFantasyGetPlayerPreference_=()=>({mode:'auto',scope:'week',autoFillWeek:4,window:'sunday-early',customLeadMinutes:60});
  context.teamFantasyAutoFillActivation_=()=>({available:true,label:'Before Sunday early games'});
  context.teamFantasyRules_=()=>[];
  context.teamFantasyFetchWeekSchedule_=(gameId,week)=>schedules[week]||{games:[],byTeam:{}};

  const current=context.apiGetTeamFantasyState({username:'alice',gameId:'g'});
  assert.strictEqual(current.week,4,'current Week 4 default');
  assert.strictEqual(current.currentWeek,4);
  assert(current.availableWeeks.includes(5),'scheduled future Week 5 exposed');

  const historical=context.apiGetTeamFantasyState({username:'alice',gameId:'g',week:2});
  assert.strictEqual(historical.week,2,'explicit Week 2 loads Week 2');
  assert.strictEqual(historical.currentWeek,4,'historical browse does not overwrite current week');

  const future=context.apiGetTeamFantasyState({username:'alice',gameId:'g',week:5});
  assert.strictEqual(future.week,5,'explicit scheduled future Week 5 loads Week 5');
  assert.strictEqual(future.currentWeek,4,'future browse does not overwrite current week');
  assert.strictEqual(future.playerAutoFill.autoFillWeek,4,'week browsing does not rewrite unrelated saved protection/current-week data');
}

// Frontend week selector and protection UX use existing state/persistence only.
assert(frontendSource.includes('function teamFantasyMainWeekBrowser_'));
assert(frontendSource.includes("payload.week = Number(week)"),'explicit week must be sent to getTeamFantasyState');
assert(frontendSource.includes("teamFantasyChangeMainWeek_"),'main week selector change handler required');
assert(frontendSource.includes("id=\"tfAutoFillScope\""),'existing protection scope must be editable');
assert(frontendSource.includes('Random Fill Selected'),'existing Random control preserved');
assert(frontendSource.includes('Auto Pick Selected'),'existing Auto control preserved');
assert(frontendSource.includes("WR/TE"),'full WR/TE label remains outside compact scoreboard');
assert(engineSource.includes('WRTE: "WR/TE"'),'backend/internal WRTE key and normal visible label remain intact');

function block(source,start,end){
  const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
  if(a<0||b<0) throw new Error('Could not extract '+start);
  return source.slice(a,b);
}
const uiContext={
  console,
  window:{
    TEAM_FANTASY_STATE:{
      gameId:'g',week:4,currentWeek:4,
      playerAutoFill:{mode:'auto',scope:'week',autoFillWeek:4,window:'sunday-early',customLeadMinutes:60},
      settings:{allowRandomPick:true,allowSmartAutoPick:true},
      lineups:[{entry:{entryId:'e1'},slots:[{position:'QB',pick:{teamAbbr:'BUF'}}]}]
    }
  },
  teamFantasyEscape_:v=>String(v),
  teamFantasySetStatus_:()=>{},
  teamFantasyReload_:async()=>{},
  apiTeamFantasyPost_:async(action,payload)=>{
    uiContext.lastPayload=payload;
    return {success:true,preference:{mode:payload.autoFillMode,scope:payload.autoFillScope,autoFillWeek:payload.autoFillWeek,window:payload.autoFillWindow,customLeadMinutes:payload.customLeadMinutes}};
  }
};
vm.createContext(uiContext);
vm.runInContext(
  block(frontendSource,'async function teamFantasyToggleProtection_','function teamFantasyRenderTopFillControls_')+
  block(frontendSource,'function teamFantasyRenderTopFillControls_','function teamFantasyRenderLineup_'),
  uiContext
);
const lineup={entry:{entryId:'e1'},complete:false,postseasonEligible:true,slots:[{position:'QB',pick:null,locked:false}]};
const rendered=uiContext.teamFantasyRenderTopFillControls_(uiContext.window.TEAM_FANTASY_STATE,lineup);
assert(rendered.includes('Protection ON'),'switch reflects saved backend preference');
assert(rendered.includes('Auto Pick · This Week'),'saved method/scope visible beside switch');
assert(rendered.includes('Random Fill Selected')&&rendered.includes('Auto Pick Selected'),'Random/Auto controls unchanged');

(async()=>{
  const before=JSON.stringify(uiContext.window.TEAM_FANTASY_STATE.lineups);
  await uiContext.teamFantasyToggleProtection_(false);
  assert.strictEqual(uiContext.lastPayload.preferenceOnly,true,'protection toggle uses preference-only persistence');
  assert.strictEqual(uiContext.lastPayload.autoFillMode,'manual','OFF maps to existing manual preference');
  assert.strictEqual(JSON.stringify(uiContext.window.TEAM_FANTASY_STATE.lineups),before,'Protection OFF must not alter manual picks');

  uiContext.window.TEAM_FANTASY_STATE.playerAutoFill={mode:'manual',scope:'week',autoFillWeek:4,window:'sunday-early',customLeadMinutes:60};
  await uiContext.teamFantasyToggleProtection_(true);
  assert.strictEqual(uiContext.lastPayload.autoFillMode,'auto','ON reuses existing Auto protection mode when coming from manual');
  assert.strictEqual(JSON.stringify(uiContext.window.TEAM_FANTASY_STATE.lineups),before,'Protection ON must not alter manual picks');

  console.log('Team Fantasy Ranking + Week Browser R1 tests: PASS');
})().catch(err=>{ console.error(err); process.exitCode=1; });
