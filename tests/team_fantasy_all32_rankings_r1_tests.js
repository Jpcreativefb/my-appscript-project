const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'backend/engines/SportsTeamFantasyEngine.js'),'utf8');
const context={console};
vm.createContext(context);
vm.runInContext(src,context,{filename:'SportsTeamFantasyEngine.js'});

const positions=['QB','RB','WRTE','OL','K','DL','LB','DB'];
const teams=context.TEAM_FANTASY_NFL_TEAMS.map(t=>t.abbr);
assert.strictEqual(teams.length,32,'NFL universe must contain exactly 32 teams');

// Ranking rows are independent NFL-source rows, not PATTC entry rows.
const rows=[];
positions.forEach((pos,pIndex)=>{
  teams.forEach((team,tIndex)=>{
    rows.push({
      GameId:'g',SeasonYear:2026,Week:1,
      EntryId:`__ranking__:${team}:${pos}`,Username:'__ranking__',Conference:'ALL',
      Position:pos,TeamAbbr:team,ESPNEventId:`evt-${Math.floor(tIndex/2)}`,
      FantasyPoints:(32-tIndex)*10+pIndex,Final:true,UpdatedAt:'2026-09-10T00:00:00Z'
    });
  });
});
// A PATTC-selected score with an absurd value must have zero effect on rankings.
rows.push({GameId:'g',SeasonYear:2026,Week:1,EntryId:'real-user-entry',Username:'alice',Position:'QB',TeamAbbr:'SEA',ESPNEventId:'user-only',FantasyPoints:99999,Final:true,UpdatedAt:'2026-09-10T00:00:00Z'});

const maps={};
positions.forEach(pos=>{
  const map=context.teamFantasyRankingsFromRows_(rows,'g',pos,2,2026);
  maps[pos]=map;
  assert.strictEqual(Object.keys(map).length,32,`exactly 32 ranked NFL teams for ${pos}`);
  teams.forEach(team=>assert(Number(map[team].rank)>0,`${pos} ${team} rank must exist`));
  assert.deepStrictEqual(Object.values(map).map(v=>v.rank).sort((a,b)=>a-b),Array.from({length:32},(_,i)=>i+1),`${pos} ranks must be complete 1-32`);
});
assert.strictEqual(maps.QB.SEA.games,1,'PATTC pick-specific unit row must not add ranking games');
assert(maps.QB.BUF.rank < maps.QB.SEA.rank,'picker ranking must follow calculated NFL metric, not user activity');

// Week 1 / no-history still produces a complete deterministic backend map.
positions.forEach(pos=>{
  const map=context.teamFantasyRankingsFromRows_([],'g',pos,1,2026);
  assert.strictEqual(Object.keys(map).length,32,`Week 1 must still rank 32 ${pos} teams`);
  assert.strictEqual(Object.values(map).filter(v=>v.games===0).length,32,`Week 1 ${pos} must report zero history for all teams`);
});

// Build future schedule with SEA on bye. Ranking must survive eligibility filtering.
const byTeam={};
teams.filter(t=>t!=='SEA').forEach((team,i)=>{
  byTeam[team]={eventId:`future-${i}`,gameDateTime:'2099-10-01T18:00:00Z',homeAbbr:team,awayAbbr:'XXX',completed:false,state:'pre',status:'scheduled'};
});
const schedule={byTeam,games:Object.values(byTeam)};
const settings={seasonYear:2026,teamUseLimit:1,regularSeasonEndWeek:18,playoffUsageMode:'reset'};
const entry={entryId:'entry-a',conference:'ALL'};
const pickRows=[];
let eligible=context.teamFantasyEligibleTeamsFromRows_('g',settings,entry,'QB',2,schedule,null,pickRows,maps.QB);
const sea=eligible.find(t=>t.abbr==='SEA');
assert(sea,'SEA must remain present in ranked list while on bye');
assert.strictEqual(sea.eligible,false,'bye team must remain ineligible to select');
assert(Number(sea.rank)>0,'bye team must retain its calculated rank');

// Usage limit changes eligibility, never the underlying rank.
const bufRank=maps.QB.BUF.rank;
const used=[{GameId:'g',SeasonYear:2026,Week:1,EntryId:'entry-a',Position:'QB',TeamAbbr:'BUF'}];
eligible=context.teamFantasyEligibleTeamsFromRows_('g',settings,entry,'QB',2,schedule,null,used,maps.QB);
const buf=eligible.find(t=>t.abbr==='BUF');
assert.strictEqual(buf.rank,bufRank,'usage limit must not alter BUF ranking');
assert.strictEqual(buf.eligible,false,'usage limit must still make exhausted BUF unavailable');
assert(/Usage limit/i.test(buf.reason));

// With no usage blocks, selectable picker order must be rank order.
eligible=context.teamFantasyEligibleTeamsFromRows_('g',{...settings,teamUseLimit:99},entry,'QB',2,schedule,null,[],maps.QB);
const selectable=eligible.filter(t=>t.eligible);
for(let i=1;i<selectable.length;i++) assert(selectable[i-1].rank < selectable[i].rank,'selectable picker rows must follow calculated rank order');

function athlete(pos, stats){return {athlete:{position:{abbreviation:pos}},stats};}
function playerBlock(team){
  return {team:{abbreviation:team},statistics:[
    {name:'passing',labels:['YDS','TD','INT','C/ATT'],athletes:[athlete('QB',['300','2','1','20/30'])]},
    {name:'rushing',labels:['YDS','TD'],athletes:[athlete('QB',['20','0']),athlete('RB',['100','1'])]},
    {name:'receiving',labels:['REC','YDS','TD','TGTS'],athletes:[athlete('RB',['2','20','0','3']),athlete('WR',['5','120','1','8']),athlete('TE',['2','30','0','3'])]},
    {name:'kicking',labels:['FG','XP','PTS'],athletes:[athlete('K',['2/2','3/3','9'])]},
    {name:'defensive',labels:['TOT','SACKS','TFL','PD','QB HTS','FF','FR','TD'],athletes:[
      athlete('DE',['5','2','2','0','3','1','0','0']),athlete('LB',['10','1','1','1','1','0','0','0']),athlete('CB',['4','0','0','2','0','0','0','0'])
    ]},
    {name:'interceptions',labels:['INT','YDS','TD'],athletes:[athlete('CB',['1','20','0'])]}
  ]};
}
function teamBlock(team){return {team:{abbreviation:team},statistics:[
  {name:'rushingYards',value:150},{name:'totalYards',value:400},{name:'netPassingYards',value:250},{name:'sacksYardsLost',displayValue:'2-15'},{name:'turnovers',value:1}
]};}
const summary={header:{competitions:[{status:{type:{completed:true,state:'post'}}}]},boxscore:{players:[playerBlock('BUF'),playerBlock('KC')],teams:[teamBlock('BUF'),teamBlock('KC')]}};
const rules=context.teamFantasyDefaultRules_().map((r,i)=>({ruleId:'r'+i,position:r[0],statKey:r[1],label:r[2],ruleType:r[3],pointsPerUnit:r[4],threshold:r[5]===''?null:Number(r[5]),bonusPoints:r[6],active:r.length>7?r[7]===true:true}));
const sourceRows=context.teamFantasyRankingRowsFromSummary_('g',{seasonYear:2026},1,'evt-final',['BUF','KC'],summary,rules);
assert.strictEqual(sourceRows.length,16,'one final NFL game must create 2 teams x 8 ranking-source position rows');
positions.forEach(pos=>{
  assert(sourceRows.some(r=>r.TeamAbbr==='BUF'&&r.Position===pos),`BUF ${pos} ranking-source row missing`);
  assert(sourceRows.some(r=>r.TeamAbbr==='KC'&&r.Position===pos),`KC ${pos} ranking-source row missing`);
});
assert(sourceRows.every(r=>String(r.EntryId).startsWith('__ranking__:')),'ranking rows must be isolated from real PATTC entries');
assert(sourceRows.every(r=>r.Final===true),'only final game summaries may become historical ranking rows');


// Full weekly ranking-source refresh must score all 32 NFL teams, regardless of picks.
const fullGames=[];
const summaryByEvent={};
for(let i=0;i<teams.length;i+=2){
  const home=teams[i],away=teams[i+1],eventId='full-'+(i/2+1);
  fullGames.push({eventId,homeAbbr:home,awayAbbr:away,completed:true,state:'post',status:'Final'});
  summaryByEvent[eventId]={header:{competitions:[{status:{type:{completed:true,state:'post'}}}]},boxscore:{players:[playerBlock(home),playerBlock(away)],teams:[teamBlock(home),teamBlock(away)]}};
}
let written=[];
context.teamFantasyFetchEspnSummary_=eventId=>summaryByEvent[eventId];
context.teamFantasyUpsertRankingRowsBatch_=batch=>{written=batch.slice();return{inserted:batch.length,updated:0,unchanged:0};};
const fullRefresh=context.teamFantasyRefreshRankingUniverseWeek_('g',1,{seasonYear:2026},{games:fullGames,byTeam:{}},rules,{},[]);
assert.strictEqual(fullRefresh.generated,256,'16 NFL games must generate 32 teams x 8 ranking-source rows');
assert.strictEqual(written.length,256,'all generated ranking rows must reach the ranking data-layer batch writer');
positions.forEach(pos=>assert.strictEqual(new Set(written.filter(r=>r.Position===pos).map(r=>r.TeamAbbr)).size,32,`${pos} source refresh must cover all 32 NFL teams`));
assert(written.every(r=>String(r.Username).startsWith('__ranking__:')),'ranking source rows must remain isolated from PATTC users and carry the scoring-rule signature');

console.log('Team Fantasy all-32 rankings R1 tests: PASS');
