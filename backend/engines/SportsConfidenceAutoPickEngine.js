/* =========================================================
   PATTC CONFIDENCE R8 — AUTO PICK + HISTORY
   ========================================================= */

const CONFIDENCE_R8_SETTINGS_SHEET = "ConfidenceAutoPickSettings";
const CONFIDENCE_R8_AUDIT_SHEET = "AutoPickAudit";
const CONFIDENCE_R8_SETTINGS_HEADERS = [
  "GameId","Username","CategoryId","Enabled","Strategy","UpdatedAt"
];
const CONFIDENCE_R8_AUDIT_HEADERS = [
  "AuditId","CreatedAt","SeasonYear","Week","GameId","CategoryId","SportsGameId","ESPNEventId",
  "Username","RequestedStrategy","StrategyScope","SeasonDefaultStrategy","GameOverrideStrategy",
  "ResolvedStrategy","FallbackLevel","FallbackReason","FallbackDetail",
  "AwayNomineeId","AwayTeam","HomeNomineeId","HomeTeam","SelectedNomineeId","SelectedTeam","SelectedSide",
  "ConfidenceAssigned","ManualPickExisted","LockTime","DecisionTime","SaveTime","SourceDataAsOf","SourceDataVersion",
  "DecisionSeed","DecisionStatus","FailureReason",
  "AwayPersonalPickCount","AwayPersonalWins","AwayPersonalLosses","AwayPersonalWinPct","AwayPersonalPoints","AwayPersonalAvgConfidence",
  "HomePersonalPickCount","HomePersonalWins","HomePersonalLosses","HomePersonalWinPct","HomePersonalPoints","HomePersonalAvgConfidence",
  "AwayCommunityPickCount","AwayCommunityWins","AwayCommunityLosses","AwayCommunityWinPct",
  "HomeCommunityPickCount","HomeCommunityWins","HomeCommunityLosses","HomeCommunityWinPct",
  "AwaySeasonWins","AwaySeasonLosses","AwaySeasonTies","AwaySeasonWinPct",
  "HomeSeasonWins","HomeSeasonLosses","HomeSeasonTies","HomeSeasonWinPct",
  "SourceStatsJSON","SupersedesAuditId","CorrectionReason"
];

function confidenceR8String_(v){return String(v===undefined||v===null?"":v).trim();}
function confidenceR8Key_(v){return confidenceR8String_(v).toLowerCase().replace(/_/g,"-");}
function confidenceR8Bool_(v,f){if(v===undefined||v===null||v==="")return f===true;if(v===true||v===1)return true;return ["true","yes","1","on"].indexOf(confidenceR8Key_(v))!==-1;}
function confidenceR8Strategy_(v){var k=confidenceR8Key_(v);return ["historical","random","home","away","best-record"].indexOf(k)!==-1?k:"historical";}
function confidenceR8Sheet_(name,headers,create){
  var ss=SpreadsheetApp.getActive(),sh=ss.getSheetByName(name);
  if(!sh&&!create)return null;
  if(!sh)sh=ss.insertSheet(name);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);return sh;}
  var current=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(confidenceR8String_);
  var missing=headers.filter(function(h){return current.indexOf(h)===-1;});
  if(missing.length)sh.getRange(1,current.length+1,1,missing.length).setValues([missing]);
  return sh;
}
function confidenceR8Objects_(sh){
  if(!sh||sh.getLastRow()<=1)return [];
  var data=sh.getDataRange().getValues(),headers=data[0].map(confidenceR8String_);
  return data.slice(1).map(function(row,i){var o={__rowNumber:i+2};headers.forEach(function(h,c){if(h)o[h]=row[c];});return o;});
}
function confidenceR8WriteObject_(sh,obj){
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(confidenceR8String_);
  sh.appendRow(headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:"";}));
}
function confidenceR8Week_(category,config){
  var n=Number(category&&(category.week||category.sportsWeek)||config&&config.week||0);
  if(Number.isFinite(n)&&n>0)return Math.floor(n);
  var raw=config&&(config.sourceConfigJSON||config.SourceConfigJSON)||"";
  if(raw){try{var o=typeof raw==="string"?JSON.parse(raw):raw;var w=Number(o&&o.week);if(Number.isFinite(w)&&w>0)return Math.floor(w);}catch(e){}}
  return 0;
}
function confidenceR8SettingsRows_(gameId,username){
  var sh=confidenceR8Sheet_(CONFIDENCE_R8_SETTINGS_SHEET,CONFIDENCE_R8_SETTINGS_HEADERS,false);
  return confidenceR8Objects_(sh).filter(function(r){
    return confidenceR8String_(r.GameId)===confidenceR8String_(gameId)&&confidenceR8Key_(r.Username)===confidenceR8Key_(username);
  });
}
function confidenceR8Preference_(gameId,username,categoryId){
  var rows=confidenceR8SettingsRows_(gameId,username);
  var season=rows.find(function(r){return !confidenceR8String_(r.CategoryId);})||null;
  var base={gameId:gameId,username:username,enabled:false,strategy:"historical",scope:"season",categoryId:"",configured:!!season};
  if(season){base.enabled=confidenceR8Bool_(season.Enabled,false);base.strategy=confidenceR8Strategy_(season.Strategy);}
  base.seasonDefaultStrategy=base.strategy;base.gameOverrideStrategy="";
  if(!categoryId)return base;
  var override=rows.find(function(r){return confidenceR8Key_(r.CategoryId)===confidenceR8Key_(categoryId);})||null;
  if(!override)return base;
  return {
    gameId:gameId,username:username,enabled:confidenceR8Bool_(override.Enabled,base.enabled),
    strategy:confidenceR8Strategy_(override.Strategy||base.strategy),scope:"game",categoryId:categoryId,configured:true,
    seasonDefaultStrategy:base.strategy,gameOverrideStrategy:confidenceR8Strategy_(override.Strategy||base.strategy)
  };
}
function confidenceR8SavePreference_(payload){
  payload=payload||{};
  var gameId=confidenceR8String_(payload.gameId),username=confidenceR8String_(payload.username),categoryId=confidenceR8String_(payload.categoryId);
  if(!gameId||!username)throw new Error("Username and gameId are required.");
  var sh=confidenceR8Sheet_(CONFIDENCE_R8_SETTINGS_SHEET,CONFIDENCE_R8_SETTINGS_HEADERS,true);
  var rows=confidenceR8Objects_(sh),match=rows.find(function(r){
    return confidenceR8String_(r.GameId)===gameId&&confidenceR8Key_(r.Username)===confidenceR8Key_(username)&&confidenceR8Key_(r.CategoryId)===confidenceR8Key_(categoryId);
  });
  if(categoryId&&payload.clearOverride===true){
    if(match)sh.deleteRow(match.__rowNumber);
    confidenceR8ReconcileTrigger_();
    return {success:true,preference:confidenceR8Preference_(gameId,username,categoryId),cleared:true};
  }
  var obj={GameId:gameId,Username:username,CategoryId:categoryId,Enabled:confidenceR8Bool_(payload.enabled,false),Strategy:confidenceR8Strategy_(payload.strategy),UpdatedAt:new Date().toISOString()};
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(confidenceR8String_);
  var row=headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:"";});
  if(match)sh.getRange(match.__rowNumber,1,1,row.length).setValues([row]);else sh.appendRow(row);
  confidenceR8ReconcileTrigger_();
  return {success:true,preference:confidenceR8Preference_(gameId,username,categoryId)};
}
function confidenceR8LatestAuditMap_(gameId,username){
  var sh=confidenceR8Sheet_(CONFIDENCE_R8_AUDIT_SHEET,CONFIDENCE_R8_AUDIT_HEADERS,false),map={},current={};
  (getUserPicks(username,gameId)||[]).forEach(function(p){
    var k=confidenceR8Key_(p.categoryId);if(k)current[k]=p;
  });
  confidenceR8Objects_(sh).forEach(function(r){
    if(confidenceR8String_(r.GameId)!==confidenceR8String_(gameId)||confidenceR8Key_(r.Username)!==confidenceR8Key_(username)||confidenceR8Key_(r.DecisionStatus)!=="selected")return;
    var k=confidenceR8Key_(r.CategoryId),pick=current[k];if(!pick)return;
    if(confidenceR8Key_(pick.nomineeId)!==confidenceR8Key_(r.SelectedNomineeId))return;
    if(Number(pick.changeCount||0)>0)return;
    var pickMs=pick.timestamp?new Date(pick.timestamp).getTime():NaN;
    var auditMs=new Date(r.SaveTime||r.DecisionTime||r.CreatedAt||"").getTime();
    if(Number.isFinite(pickMs)&&Number.isFinite(auditMs)&&pickMs>auditMs)return;
    if(!map[k]||String(map[k].SaveTime||"")<String(r.SaveTime||""))map[k]=r;
  });return map;
}
function confidenceR8State_(payload){
  payload=payload||{};var gameId=confidenceR8String_(payload.gameId),username=confidenceR8String_(payload.username),rows=confidenceR8SettingsRows_(gameId,username),overrides={};
  rows.forEach(function(r){var c=confidenceR8String_(r.CategoryId);if(c)overrides[c]=confidenceR8Preference_(gameId,username,c);});
  return {success:true,season:confidenceR8Preference_(gameId,username,""),overrides:overrides,audits:confidenceR8LatestAuditMap_(gameId,username)};
}
function confidenceR8Record_(text){
  var m=confidenceR8String_(text).match(/(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
  if(!m)return {wins:0,losses:0,ties:0,pct:null};
  var w=Number(m[1]),l=Number(m[2]),t=Number(m[3]||0),d=w+l+t;return {wins:w,losses:l,ties:t,pct:d?(w+0.5*t)/d:null};
}
function confidenceR8Deterministic_(seed){
  var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,confidenceR8String_(seed));return ((b[0]+256)%256)%2;
}
function confidenceR8HistoryStats_(gameId,username,teamId,community){
  var settings=typeof getCategorySettingsCached==="function"?getCategorySettingsCached(gameId):getCategorySettings(gameId);
  var data=typeof PicksRepo!=="undefined"&&PicksRepo.getPicksForGame?PicksRepo.getPicksForGame(gameId):[];
  if(!data||data.length<=1)return {pickCount:0,wins:0,losses:0,winPct:null,points:0,avgConfidence:0};
  var h=data[0],col=getPicksColumnMap_(h),team=confidenceR8Key_(teamId),user=confidenceR8Key_(username),p=0,w=0,l=0,pts=0,conf=0;
  for(var i=1;i<data.length;i++){var row=data[i];if(!community&&confidenceR8Key_(row[col.username])!==user)continue;if(confidenceR8Key_(row[col.nominee])!==team)continue;
    var cfg=settings[confidenceR8Key_(row[col.category])]||{},winner=confidenceR8Key_(cfg.winnerNomineeId||"");if(!winner)continue;
    p++;var cp=getPickConfidencePoints_(row,col)||0;conf+=cp;if(winner===team){w++;pts+=cp>0?cp:1;}else l++;
  }
  return {pickCount:p,wins:w,losses:l,winPct:p?w/p:null,points:pts,avgConfidence:p?conf/p:0};
}
function confidenceR8Side_(category,nominee){
  var s=confidenceR8Key_(nominee&&(nominee.sportsSelection||nominee.side)||"");if(s==="home"||s==="away")return s;
  var id=confidenceR8Key_(nominee&&nominee.id),home=confidenceR8Key_(category&&category.homeTeamId),away=confidenceR8Key_(category&&category.awayTeamId);
  if(id&&id===home)return "home";if(id&&id===away)return "away";return "";
}
function confidenceR8Resolve_(gameId,username,category,pref){
  var n=Array.isArray(category&&category.nominees)?category.nominees:[];if(n.length!==2)throw new Error("Auto Pick requires a two-team matchup.");
  var away=n.find(function(x){return confidenceR8Side_(category,x)==="away";})||n[0],home=n.find(function(x){return confidenceR8Side_(category,x)==="home";})||n[1];
  var pa=confidenceR8HistoryStats_(gameId,username,away.id,false),ph=confidenceR8HistoryStats_(gameId,username,home.id,false),ca=confidenceR8HistoryStats_(gameId,username,away.id,true),ch=confidenceR8HistoryStats_(gameId,username,home.id,true);
  var ar=confidenceR8Record_(
    category.awayRecord||category.AwayRecord||(away&&(away.teamRecord||away.TeamRecord||away.record||away.Record))||""
  ),hr=confidenceR8Record_(
    category.homeRecord||category.HomeRecord||(home&&(home.teamRecord||home.TeamRecord||home.record||home.Record))||""
  );
  function stats(a,h,min){var av=a.pickCount>=min,hv=h.pickCount>=min;if(!av&&!hv)return null;if(av&&!hv)return away;if(hv&&!av)return home;
    if(a.winPct!==h.winPct)return a.winPct>h.winPct?away:home;if(a.wins!==h.wins)return a.wins>h.wins?away:home;if(a.pickCount!==h.pickCount)return a.pickCount>h.pickCount?away:home;if(a.points!==h.points)return a.points>h.points?away:home;return null;}
  function record(){if(ar.pct===null&&hr.pct===null)return null;if(ar.pct!==null&&hr.pct===null)return away;if(hr.pct!==null&&ar.pct===null)return home;if(ar.pct!==hr.pct)return ar.pct>hr.pct?away:home;if(ar.wins!==hr.wins)return ar.wins>hr.wins?away:home;if(ar.losses!==hr.losses)return ar.losses<hr.losses?away:home;return null;}
  var req=confidenceR8Strategy_(pref.strategy),sel=null,res=req,level=0,reason="none",detail="";
  if(req==="home")sel=home;else if(req==="away")sel=away;else if(req==="random"){sel=confidenceR8Deterministic_(username+"|"+gameId+"|"+category.id)?home:away;}
  else if(req==="best-record"){sel=record();if(!sel){level=1;reason="record_tied";res="random_fallback";sel=confidenceR8Deterministic_(username+"|"+gameId+"|"+category.id)?home:away;}}
  else {sel=stats(pa,ph,3);if(sel)res="historical_personal";else{level=1;reason="insufficient_personal_history";detail="Personal history below 3 picks or tied.";
      sel=stats(ca,ch,5);if(sel)res="historical_community";else{level=2;reason="insufficient_community_history";detail+=" Community history below 5 picks or tied.";
        sel=record();if(sel)res="best_record";else{level=3;reason="final_random_fallback";res="random_fallback";sel=confidenceR8Deterministic_(username+"|"+gameId+"|"+category.id)?home:away;}}}}
  return {selected:sel,away:away,home:home,requested:req,resolved:res,fallbackLevel:level,fallbackReason:reason,fallbackDetail:detail,pa:pa,ph:ph,ca:ca,ch:ch,ar:ar,hr:hr,seed:username+"|"+gameId+"|"+category.id};
}
function confidenceR8Audit_(obj){var sh=confidenceR8Sheet_(CONFIDENCE_R8_AUDIT_SHEET,CONFIDENCE_R8_AUDIT_HEADERS,true);confidenceR8WriteObject_(sh,obj);return obj;}
function confidenceR8TerminalAudit_(gameId,username,categoryId){
  var sh=confidenceR8Sheet_(CONFIDENCE_R8_AUDIT_SHEET,CONFIDENCE_R8_AUDIT_HEADERS,false),rows=confidenceR8Objects_(sh);
  for(var i=rows.length-1;i>=0;i--){var r=rows[i];if(confidenceR8String_(r.GameId)!==confidenceR8String_(gameId)||confidenceR8Key_(r.Username)!==confidenceR8Key_(username)||confidenceR8Key_(r.CategoryId)!==confidenceR8Key_(categoryId))continue;
    var status=confidenceR8Key_(r.DecisionStatus),reason=confidenceR8Key_(r.FailureReason);
    if(status==="selected"||(status==="skipped"&&reason==="manual-pick-exists"))return r;
  }
  return null;
}
function confidenceR8RunCategory_(gameId,username,category,config,pref){
  var terminal=confidenceR8TerminalAudit_(gameId,username,category.id);
  if(terminal)return {skipped:true,reason:"terminal_audit_exists",auditId:terminal.AuditId||""};
  var existing=(getUserPicks(username,gameId)||[]).find(function(p){return confidenceR8Key_(p.categoryId)===confidenceR8Key_(category.id);});
  var d=confidenceR8Resolve_(gameId,username,category,pref),now=new Date(),sel=d.selected,side=confidenceR8Side_(category,sel),lock=category.lockDateTime||config.lockDateTime||category.gameDateTime||"";
  var a={AuditId:Utilities.getUuid(),CreatedAt:now.toISOString(),SeasonYear:category.seasonYear||"",Week:confidenceR8Week_(category,config),GameId:gameId,CategoryId:category.id,
    SportsGameId:category.sportsGameId||"",ESPNEventId:category.espnEventId||"",Username:username,RequestedStrategy:d.requested,StrategyScope:pref.scope||"season",
    SeasonDefaultStrategy:pref.seasonDefaultStrategy||pref.strategy||"historical",GameOverrideStrategy:pref.gameOverrideStrategy||"",ResolvedStrategy:d.resolved,FallbackLevel:d.fallbackLevel,
    FallbackReason:d.fallbackReason,FallbackDetail:d.fallbackDetail,AwayNomineeId:d.away.id,AwayTeam:d.away.name||d.away.shortAnswer||d.away.id,HomeNomineeId:d.home.id,
    HomeTeam:d.home.name||d.home.shortAnswer||d.home.id,SelectedNomineeId:sel.id,SelectedTeam:sel.name||sel.shortAnswer||sel.id,SelectedSide:side,ConfidenceAssigned:0,
    ManualPickExisted:!!existing,LockTime:lock,DecisionTime:now.toISOString(),SaveTime:"",SourceDataAsOf:now.toISOString(),SourceDataVersion:"confidence-r8",DecisionSeed:d.seed,
    DecisionStatus:"",FailureReason:"",AwayPersonalPickCount:d.pa.pickCount,AwayPersonalWins:d.pa.wins,AwayPersonalLosses:d.pa.losses,AwayPersonalWinPct:d.pa.winPct,
    AwayPersonalPoints:d.pa.points,AwayPersonalAvgConfidence:d.pa.avgConfidence,HomePersonalPickCount:d.ph.pickCount,HomePersonalWins:d.ph.wins,HomePersonalLosses:d.ph.losses,
    HomePersonalWinPct:d.ph.winPct,HomePersonalPoints:d.ph.points,HomePersonalAvgConfidence:d.ph.avgConfidence,AwayCommunityPickCount:d.ca.pickCount,AwayCommunityWins:d.ca.wins,
    AwayCommunityLosses:d.ca.losses,AwayCommunityWinPct:d.ca.winPct,HomeCommunityPickCount:d.ch.pickCount,HomeCommunityWins:d.ch.wins,HomeCommunityLosses:d.ch.losses,
    HomeCommunityWinPct:d.ch.winPct,AwaySeasonWins:d.ar.wins,AwaySeasonLosses:d.ar.losses,AwaySeasonTies:d.ar.ties,AwaySeasonWinPct:d.ar.pct,HomeSeasonWins:d.hr.wins,
    HomeSeasonLosses:d.hr.losses,HomeSeasonTies:d.hr.ties,HomeSeasonWinPct:d.hr.pct,SourceStatsJSON:JSON.stringify({personal:{away:d.pa,home:d.ph},community:{away:d.ca,home:d.ch},records:{away:d.ar,home:d.hr}}),
    SupersedesAuditId:"",CorrectionReason:""};
  if(existing){a.DecisionStatus="skipped";a.FailureReason="manual_pick_exists";confidenceR8Audit_(a);return {skipped:true,reason:"manual_pick_exists"};}
  var result=saveConfidencePicksBatch({username:username,gameId:gameId,onlyIfEmpty:true,picks:[{categoryId:category.id,nomineeId:sel.id,confidencePoints:0}]});
  if(result&&result.skipped===true&&result.reason==="pick_exists"){a.ManualPickExisted=true;a.DecisionStatus="skipped";a.FailureReason="manual_pick_exists";confidenceR8Audit_(a);return {skipped:true,reason:"manual_pick_exists"};}
  if(!result||result.success===false){a.DecisionStatus="failed";a.FailureReason=result&&(result.message||result.error)||"save_failed";confidenceR8Audit_(a);return {success:false,error:a.FailureReason};}
  a.DecisionStatus="selected";a.SaveTime=new Date().toISOString();confidenceR8Audit_(a);return {success:true,categoryId:category.id,selectedNomineeId:sel.id,strategy:d.resolved,auditId:a.AuditId};
}
function confidenceAutoPickAutomationTick(){
  var sh=confidenceR8Sheet_(CONFIDENCE_R8_SETTINGS_SHEET,CONFIDENCE_R8_SETTINGS_HEADERS,false),rows=confidenceR8Objects_(sh).filter(function(r){return confidenceR8Bool_(r.Enabled,false);}),keys={},results=[],now=Date.now();
  rows.forEach(function(r){var k=confidenceR8String_(r.GameId)+"|"+confidenceR8Key_(r.Username);keys[k]={gameId:confidenceR8String_(r.GameId),username:confidenceR8String_(r.Username)};});
  Object.keys(keys).forEach(function(k){var x=keys[k],cats=typeof getCategoriesCached==="function"?getCategoriesCached(x.gameId):getCategories(x.gameId),settings=typeof getCategorySettingsCached==="function"?getCategorySettingsCached(x.gameId):getCategorySettings(x.gameId);
    (cats||[]).forEach(function(category){var cid=confidenceR8Key_(category.id),cfg=settings[cid]||{},pref=confidenceR8Preference_(x.gameId,x.username,category.id);if(!pref.enabled)return;
      var raw=category.lockDateTime||cfg.lockDateTime||category.gameDateTime||"",ms=raw?new Date(raw).getTime():0;if(!Number.isFinite(ms)||ms<=now||ms-now>120000)return;
      try{results.push(confidenceR8RunCategory_(x.gameId,x.username,category,cfg,pref));}catch(err){results.push({success:false,gameId:x.gameId,username:x.username,categoryId:category.id,error:err.message||String(err)});}
    });
  });return results;
}
function confidenceR8Triggers_(){return ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==="confidenceAutoPickAutomationTick";});}
function confidenceR8ReconcileTrigger_(){
  if(typeof ScriptApp==="undefined")return {available:false};
  var sh=confidenceR8Sheet_(CONFIDENCE_R8_SETTINGS_SHEET,CONFIDENCE_R8_SETTINGS_HEADERS,false),required=confidenceR8Objects_(sh).some(function(r){return confidenceR8Bool_(r.Enabled,false);});
  var t=confidenceR8Triggers_(),removed=0,created=false;if(!required){t.forEach(function(x){ScriptApp.deleteTrigger(x);removed++;});t=[];}
  else{t.slice(1).forEach(function(x){ScriptApp.deleteTrigger(x);removed++;});t=t.slice(0,1);if(!t.length){ScriptApp.newTrigger("confidenceAutoPickAutomationTick").timeBased().everyMinutes(1).create();created=true;t=confidenceR8Triggers_();}}
  return {success:true,required:required,active:t.length>0,count:t.length,created:created,removed:removed};
}
function confidenceR8HistoryCompare_(payload){
  payload=payload||{};var gameId=confidenceR8String_(payload.gameId),users=Array.isArray(payload.usernames)?payload.usernames:[],settings=typeof getCategorySettingsCached==="function"?getCategorySettingsCached(gameId):getCategorySettings(gameId);
  if(!users.length&&payload.username)users=[payload.username];
  var cats=typeof getCategoriesCached==="function"?getCategoriesCached(gameId):getCategories(gameId),catMap={};(cats||[]).forEach(function(c){catMap[confidenceR8Key_(c.id)]=c;});
  var data=typeof PicksRepo!=="undefined"&&PicksRepo.getPicksForGame?PicksRepo.getPicksForGame(gameId):[],h=data&&data[0]||[],col=h.length?getPicksColumnMap_(h):null,ash=confidenceR8Sheet_(CONFIDENCE_R8_AUDIT_SHEET,CONFIDENCE_R8_AUDIT_HEADERS,false),audits=confidenceR8Objects_(ash);
  var result=users.slice(0,6).map(function(username){var map={};if(col){for(var i=1;i<data.length;i++){var row=data[i];if(confidenceR8Key_(row[col.username])!==confidenceR8Key_(username))continue;
      var cid=confidenceR8Key_(row[col.category]),cfg=settings[cid]||{},winner=confidenceR8Key_(cfg.winnerNomineeId||"");if(!winner)continue;var team=confidenceR8Key_(row[col.nominee]),cat=catMap[cid]||{},nom=(cat.nominees||[]).find(function(n){return confidenceR8Key_(n.id)===team;})||{};
      if(!map[team])map[team]={teamId:team,team:nom.name||nom.shortAnswer||team,logo:nom.image||nom.logoUrl||"",selections:0,correct:0,settled:0,points:0,confidenceTotal:0,autoPicks:0};
      var x=map[team],cp=getPickConfidencePoints_(row,col)||0;x.selections++;x.settled++;x.confidenceTotal+=cp;if(winner===team){x.correct++;x.points+=cp>0?cp:1;}
    }}
    var activeAuto=confidenceR8LatestAuditMap_(gameId,username);
    Object.keys(activeAuto).forEach(function(categoryId){var a=activeAuto[categoryId],k=confidenceR8Key_(a.SelectedNomineeId);if(map[k])map[k].autoPicks++;});
    var trends=Object.keys(map).map(function(k){var x=map[k];x.winPercentage=x.settled?Math.round(x.correct/x.settled*1000)/10:null;x.avgConfidence=x.selections?Math.round(x.confidenceTotal/x.selections*10)/10:0;return x;}).sort(function(a,b){return b.selections-a.selections||b.correct-a.correct||String(a.team).localeCompare(String(b.team));});
    return {username:username,trends:trends.slice(0,5),allTrends:trends};
  });return {success:true,gameId:gameId,users:result};
}
