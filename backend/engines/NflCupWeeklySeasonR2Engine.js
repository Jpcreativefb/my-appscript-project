/* PATTC NFL CUP R2 — read-only weekly and season Cup awards.
 * Enabled only after Admin saves a weeklySeasonR2 configuration to the Cup.
 * Does not change child picks, Team Fantasy league standings, or settle a game.
 */
function cupR2String_(v) { return String(v === undefined || v === null ? '' : v).trim(); }
function cupR2Key_(v) { return cupR2String_(v).toLowerCase(); }
function cupR2Number_(v, d) { var n=Number(v); return Number.isFinite(n)?n:(d||0); }
function cupR2Week_(category) {
  var text = cupR2String_(category && category.section);
  var match=text.match(/(?:^|\b)(?:week|wk)\s*[-:#]?\s*(\d{1,2})(?:\b|$)/i);
  if(match) return Number(match[1]);
  var raw=category && (category.sourceConfigJSON || (category.settings && category.settings.sourceConfigJSON));
  if(raw){try{var data=typeof raw==='string'?JSON.parse(raw):raw; var n=Number(data.week); if(Number.isInteger(n)&&n>=1&&n<=22) return n;}catch(e){}}
  return 0;
}
function cupR2Config_(parent,child) {
  if(!parent || cupR2Key_(parent.gameId)!=='nfl-cup-2026' || !child) return null;
  var id=cupR2Key_(child.gameId);
  if(id!=='nfl-confidence-2026' && id!=='league-of-fantasy-champions-2026') return null;
  var rule={};
  try {rule=JSON.parse(parent.placementPointsJSON||'{}')||{};} catch(e){return null;}
  var all=rule.weeklySeasonR2;
  if(!all || all.enabled!==true || !all.games || !all.games[id]) return null;
  var raw=all.games[id];
  var points=Array.isArray(raw.weeklyPoints)?raw.weeklyPoints:[5,3,1];
  if(!points.length || points.some(function(v){return !Number.isFinite(Number(v)) || Number(v)<0;})) return null;
  var weeks=Array.isArray(raw.finalizedWeeks)?raw.finalizedWeeks:[];
  return {
    id:id, weeklyEnabled:raw.weeklyEnabled===true, seasonEnabled:raw.seasonEnabled===true,
    seasonFinalized:raw.seasonFinalized===true, weeklyWeight:Math.max(0,cupR2Number_(raw.weeklyWeight,1)),
    seasonWeight:Math.max(0,cupR2Number_(raw.seasonWeight,1)),
    weeklyPoints:points.map(Number), finalizedWeeks:weeks.map(Number).filter(function(n){return Number.isInteger(n)&&n>=1&&n<=22;}),
    bestWeeklyCount:Math.max(0,Math.floor(cupR2Number_(raw.bestWeeklyCount,0)))
  };
}
function cupR2Field_(count, rules) {
  var min=Math.max(1,Math.floor(cupR2Number_(rules.minPlayers,4)));
  var full=Math.max(min,Math.floor(cupR2Number_(rules.fullFieldSize,8)));
  var pct=cupR2Number_(rules.minParticipationPct,50);
  var qualified=count>=min && count/full*100>=pct;
  return {qualified:qualified, multiplier:rules.fieldAdjustment===false?1:Math.min(1,count/full),pct:count/full*100};
}
function cupR2AwardsForWeek_(child,week,config,rules,source) {
  source=source||{};
  var rows=[];
  if(config.id==='nfl-confidence-2026') {
    var categories=source.categories||[]; var settings=source.settings||{}; var picks=source.picks||{}; var resolution=source.resolution||{};
    var selected=categories.filter(function(c){return cupR2Week_(c)===week;});
    if(!selected.length) return [];
    // Admin finalization alone is insufficient: every known matchup must have an official result.
    var outcomes=selected.map(function(c){
      var id=cupR2String_(c.id||c.categoryId);var cfg=settings[id]||{};
      var resolved=typeof getHybridCategoryResolution_==='function' ? getHybridCategoryResolution_(id,cfg,resolution) : {resolved:!!cfg.winnerNomineeId,result:'winner',winnerNomineeId:cfg.winnerNomineeId};
      return {id:id,cfg:cfg,resolved:resolved};
    });
    if(outcomes.some(function(o){return !o.resolved || !o.resolved.resolved;})) return [];
    Object.keys(picks).forEach(function(username){
      var user=picks[username]||{};var entries=outcomes.filter(function(o){return user[o.id] && cupR2String_(user[o.id].nomineeId);});
      if(!entries.length) return;
      var total=0;entries.forEach(function(o){
        var p=user[o.id], result=o.resolved, winnerIds=Array.isArray(result.winnerNomineeIds)&&result.winnerNomineeIds.length?result.winnerNomineeIds:[result.winnerNomineeId];
        if(result.result==='push')return;
        var chosen=cupR2Key_(p.nomineeId);
        var correct=winnerIds.some(function(w){return cupR2Key_(w)===chosen;});
        var raw=cupR2Number_(p.confidencePoints,0);raw=raw>0?raw:1;
        var base=Math.max(0,raw-Math.max(0,cupR2Number_(o.cfg.changePenalty,0))*Math.max(0,cupR2Number_(p.changeCount,0)));
        if(correct)total+=base;
        else if(source.riskPenalty===true && cupR2Number_(p.confidencePoints,0)>0)total-=base;
      });
      rows.push({username:username,displayName:username,total:total});
    });
  } else {
    var snapshot=source.snapshot;
    if(!snapshot||snapshot.success===false||snapshot.settled!==true) return [];
    var aggregate={};
    (snapshot.rows||[]).forEach(function(row){
      if(row.participated!==true||row.dnp===true||row.final!==true||!Number.isFinite(Number(row.score)))return;
      var username=cupR2String_(row.username),id=cupR2Key_(username);if(!id)return;
      if(!aggregate[id])aggregate[id]={username:username,displayName:username,total:0};
      aggregate[id].total+=Number(row.score);
    });
    rows=Object.keys(aggregate).map(function(id){return aggregate[id];});
  }
  var field=cupR2Field_(rows.length,rules);
  if(!field.qualified)return [];
  rows.sort(function(a,b){return b.total-a.total||cupR2Key_(a.username).localeCompare(cupR2Key_(b.username));});
  var last=null,rank=0;
  return rows.map(function(row,i){
    if(last===null||row.total!==last)rank=i+1;
    last=row.total;
    var base=config.weeklyPoints[rank-1]||0;
    var contribution=base*field.multiplier*config.weeklyWeight;
    return {
      username:row.username,displayName:row.displayName,
      gameId:child.gameId, gameName:child.name+' · Week '+week, component:'weekly',week:week,
      mode:'placement-points',placementRank:rank,weeklyWin:rank===1,rawScore:row.total,
      contribution:contribution, fixedContribution:contribution, remainingContribution:0,
      fixedRemainingContribution:0, stakedNetContribution:0,stakedPotentialContribution:0,
      pendingStakesContribution:0, stakedWins:0,stakedLosses:0,stakedPushes:0,
      seasonCupQualified:true,seasonCupFieldSize:rows.length,
      seasonCupFieldMultiplier:field.multiplier,seasonCupParticipationPct:field.pct
    };
  });
}
function cupR2WeeklyAwards_(parent,child,config,rules) {
  if(!config.weeklyEnabled||!config.finalizedWeeks.length)return [];
  var common=null;
  if(config.id==='nfl-confidence-2026') {
    if(typeof getCategories!=='function'||typeof getCategorySettings!=='function'||typeof buildUserPicksMap_!=='function')return [];
    common={categories:getCategories(child.gameId)||[],settings:getCategorySettings(child.gameId)||{},picks:buildUserPicksMap_(child.gameId)||{},
      resolution:typeof getCategoryResultsResolutionMap==='function'?getCategoryResultsResolutionMap(child.gameId)||{}:{},
      riskPenalty:typeof getConfidenceScoringMode_==='function'&&getConfidenceScoringMode_(child.gameId)==='risk_penalty'};
  }
  var groups={};
  config.finalizedWeeks.forEach(function(week){
    var source=common;
    if(config.id!=='nfl-confidence-2026'){
      if(typeof teamFantasyWeeklyAllPlaySnapshot_!=='function')return;
      source={snapshot:teamFantasyWeeklyAllPlaySnapshot_(child.gameId,'complete',week)};
    }
    var awards=cupR2AwardsForWeek_(child,week,config,rules,source);
    awards.forEach(function(a){var id=cupR2Key_(a.username);if(!groups[id])groups[id]=[];groups[id].push(a);});
  });
  var result=[];
  Object.keys(groups).forEach(function(id){
    var awards=groups[id];
    if(config.bestWeeklyCount>0){awards=awards.slice().sort(function(a,b){return b.contribution-a.contribution||a.week-b.week;}).slice(0,config.bestWeeklyCount);}
    awards.forEach(function(a){result.push(a);});
  });
  return result;
}
/* Team Fantasy season Cup rank uses accumulated, FINAL fantasy points for the
 * complete league. Multiple entries owned by one person are combined once.
 * Team Fantasy's existing league standings / all-play record remain unchanged. */
function cupR2FantasySeasonRows_(gameId) {
  if(typeof teamFantasyBuildStandings_!=='function')return [];
  var standings=teamFantasyBuildStandings_(gameId,'complete');
  if(!standings||standings.success===false||!Array.isArray(standings.rows))return [];
  var users={};
  standings.rows.forEach(function(row){
    var username=cupR2String_(row.username),id=cupR2Key_(username);
    if(!id||!Number.isFinite(Number(row.fantasyPoints)))return;
    if(!users[id])users[id]={username:username,displayName:username,total:0,fixedPoints:0,remaining:0,stakedNet:0};
    users[id].total+=Number(row.fantasyPoints);
    users[id].fixedPoints=users[id].total;
  });
  return Object.keys(users).map(function(id){return users[id];}).sort(function(a,b){return b.total-a.total||cupR2Key_(a.username).localeCompare(cupR2Key_(b.username));});
}

function cupR2ParentEnabled_(parent){
  if(!parent||cupR2Key_(parent.gameId)!=='nfl-cup-2026')return false;
  try{var v=JSON.parse(parent.placementPointsJSON||'{}');return !!(v&&v.weeklySeasonR2&&v.weeklySeasonR2.enabled===true);}catch(e){return false;}
}
