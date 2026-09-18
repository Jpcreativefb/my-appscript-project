/* =====================================================
   NFL PLAYOFF RACE ENGINE R1
   Isolated forecast snapshots + late entry/checkpoint rules.
===================================================== */

const NFL_PLAYOFF_RACE_SNAPSHOT_SHEET_ = "NflForecastSnapshots";
const NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_ = [
  "GameId","Username","CategoryId","ForecastId","ForecastType","EffectiveWeek",
  "Multiplier","RankingsJSON","SubmittedAt","IsActive","Source"
];
const NFL_PLAYOFF_RACE_CHECKPOINTS_ = {4:0.85,8:0.70,12:0.55,15:0.40};
const NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_ = 10;

function nflPlayoffRaceString_(value){return String(value===undefined||value===null?"":value).trim();}
function nflPlayoffRaceKey_(value){return nflPlayoffRaceString_(value).toLowerCase();}
function nflPlayoffRaceNumber_(value,fallback){const n=Number(value);return Number.isFinite(n)?n:(fallback===undefined?0:fallback);}
function nflPlayoffRaceBool_(value){const key=nflPlayoffRaceKey_(value);return value===true||key==="true"||key==="yes"||nflPlayoffRaceString_(value)==="1";}
function nflPlayoffRaceIsGame_(gameId){return /^nfl-playoff-race-\d{4}$/i.test(nflPlayoffRaceString_(gameId));}
function nflPlayoffRaceYear_(gameId){const match=nflPlayoffRaceString_(gameId).match(/(\d{4})$/);return match?Number(match[1]):new Date().getFullYear();}
function nflPlayoffRaceLateEntryMultiplier_(week,seasonStarted){
  if(seasonStarted===false)return 1;
  const w=Math.max(1,Math.floor(nflPlayoffRaceNumber_(week,1)));
  return Math.max(0.50,Math.round((1-(w*0.05))*100)/100);
}
function nflPlayoffRaceCheckpointMultiplier_(week){return NFL_PLAYOFF_RACE_CHECKPOINTS_[Math.floor(Number(week)||0)]||0;}
function nflPlayoffRaceForecastId_(){
  if(typeof Utilities!=="undefined"&&Utilities&&typeof Utilities.getUuid==="function")return Utilities.getUuid();
  return "forecast-"+Date.now()+"-"+Math.floor(Math.random()*1000000);
}

function nflPlayoffRaceHeaderMap_(headers){
  const map={};
  (headers||[]).forEach(function(header,index){const key=nflPlayoffRaceKey_(header);if(key)map[key]=index;});
  return map;
}

function nflPlayoffRaceEnsureSheet_(){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(NFL_PLAYOFF_RACE_SNAPSHOT_SHEET_);
  if(!sh){
    const lock=LockService.getScriptLock();
    let held=false;
    try{
      lock.waitLock(10000);held=true;
      sh=ss.getSheetByName(NFL_PLAYOFF_RACE_SNAPSHOT_SHEET_);
      if(!sh)sh=ss.insertSheet(NFL_PLAYOFF_RACE_SNAPSHOT_SHEET_);
    }finally{if(held)lock.releaseLock();}
  }
  const lastColumn=Math.max(1,sh.getLastColumn());
  let headers=sh.getLastRow()?sh.getRange(1,1,1,lastColumn).getValues()[0].map(nflPlayoffRaceString_):[];
  if(!headers.some(Boolean)){
    sh.getRange(1,1,1,NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_.length).setValues([NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_]);
    sh.setFrozenRows(1);
    headers=NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_.slice();
  }
  const missing=NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_.filter(function(header){return headers.indexOf(header)===-1;});
  if(missing.length)sh.getRange(1,headers.length+1,1,missing.length).setValues([missing]);
  return sh;
}

function nflPlayoffRaceReadSnapshots_(gameId,username){
  const sh=nflPlayoffRaceEnsureSheet_();
  if(sh.getLastRow()<=1)return [];
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
  const col=nflPlayoffRaceHeaderMap_(headers);
  return sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues().map(function(row,index){
    return {
      rowNumber:index+2,
      gameId:nflPlayoffRaceString_(row[col.gameid]),
      username:nflPlayoffRaceString_(row[col.username]),
      categoryId:nflPlayoffRaceKey_(row[col.categoryid]),
      forecastId:nflPlayoffRaceString_(row[col.forecastid]),
      forecastType:nflPlayoffRaceString_(row[col.forecasttype]),
      effectiveWeek:Math.floor(nflPlayoffRaceNumber_(row[col.effectiveweek],0)),
      multiplier:nflPlayoffRaceNumber_(row[col.multiplier],1),
      rankingsJSON:nflPlayoffRaceString_(row[col.rankingsjson]),
      submittedAt:nflPlayoffRaceString_(row[col.submittedat]),
      isActive:nflPlayoffRaceBool_(row[col.isactive]),
      source:nflPlayoffRaceString_(row[col.source])
    };
  }).filter(function(row){
    return (!gameId||row.gameId===gameId)&&(!username||nflPlayoffRaceKey_(row.username)===nflPlayoffRaceKey_(username));
  }).sort(function(a,b){return String(a.submittedAt).localeCompare(String(b.submittedAt));});
}

function nflPlayoffRaceAppendSnapshot_(snapshot){
  const lock=(typeof LockService.getDocumentLock==="function"?LockService.getDocumentLock():null)||LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const sh=nflPlayoffRaceEnsureSheet_();
    const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
    const col=nflPlayoffRaceHeaderMap_(headers);
    const data=sh.getDataRange().getValues();
    for(let i=1;i<data.length;i++){
      if(nflPlayoffRaceString_(data[i][col.gameid])===snapshot.gameId&&
         nflPlayoffRaceKey_(data[i][col.username])===nflPlayoffRaceKey_(snapshot.username)&&
         nflPlayoffRaceKey_(data[i][col.categoryid])===nflPlayoffRaceKey_(snapshot.categoryId)&&
         nflPlayoffRaceBool_(data[i][col.isactive])){
        sh.getRange(i+1,col.isactive+1).setValue(false);
      }
    }
    const values={
      GameId:snapshot.gameId,Username:snapshot.username,CategoryId:snapshot.categoryId,
      ForecastId:snapshot.forecastId,ForecastType:snapshot.forecastType,EffectiveWeek:snapshot.effectiveWeek,
      Multiplier:snapshot.multiplier,RankingsJSON:JSON.stringify(snapshot.rankings||[]),
      SubmittedAt:snapshot.submittedAt,IsActive:true,Source:snapshot.source||"nfl-playoff-race"
    };
    sh.appendRow(headers.map(function(header){return values[header]===undefined?"":values[header];}));
  }finally{lock.releaseLock();}
}

function nflPlayoffRaceExtractScores_(result){
  if(typeof sportsSurvivorExtractScores_==="function"){
    try{return sportsSurvivorExtractScores_(result)||[];}catch(err){}
  }
  if(Array.isArray(result))return result;
  if(!result||typeof result!=="object")return [];
  const candidates=[result.scores,result.games,result.events,result.data,result.results];
  for(let i=0;i<candidates.length;i++){
    const value=candidates[i];
    if(Array.isArray(value))return value;
    if(value&&typeof value==="object"){
      const nested=nflPlayoffRaceExtractScores_(value);
      if(nested.length)return nested;
    }
  }
  return [];
}

function nflPlayoffRaceFetchWeek_(year,week){
  if(typeof sportsWagerFetchJson_!=="function")return [];
  try{
    const result=sportsWagerFetchJson_({
      action:"getSportsScores",
      sport:"football",
      league:"NFL",
      seasonYear:year,
      week:week
    },"NFL Playoff Race schedule");
    if(!result||result.success===false)return [];
    return nflPlayoffRaceExtractScores_(result).map(function(score){
      return typeof sportsWagerNormalizeScore_==="function"?sportsWagerNormalizeScore_(score):score;
    });
  }catch(err){return [];}
}

function nflPlayoffRaceGameStartMs_(game){
  const value=game&&(game.GameDateTime||game.gameDateTime||game.StartTime||game.startTime||game.DateTime||game.dateTime||game.Date||game.date);
  if(!value)return 0;
  const ms=new Date(value).getTime();
  return Number.isFinite(ms)?ms:0;
}
function nflPlayoffRaceGameFinal_(game){
  const status=nflPlayoffRaceKey_(game&&(game.Status||game.status||game.GameStatus||game.gameStatus||game.State||game.state));
  return nflPlayoffRaceBool_(game&&(game.Completed||game.completed||game.Final||game.final||game.IsFinal||game.isFinal))||/final|closed|complete/.test(status);
}
function nflPlayoffRaceFirstKickoffMs_(games){
  const starts=(games||[]).map(nflPlayoffRaceGameStartMs_).filter(function(ms){return ms>0;});
  return starts.length?Math.min.apply(Math,starts):0;
}

function nflPlayoffRaceSettingsWeek_(year){
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName("TeamFantasySettings");
  if(!sh||sh.getLastRow()<=1)return 1;
  const data=sh.getDataRange().getValues();
  const headers=data[0].map(nflPlayoffRaceString_);
  const col=nflPlayoffRaceHeaderMap_(headers);
  let found=0;
  data.slice(1).forEach(function(row){
    const rowYear=col.seasonyear===undefined?year:Math.floor(nflPlayoffRaceNumber_(row[col.seasonyear],year));
    if(rowYear!==year)return;
    if(col.currentweek!==undefined)found=Math.max(found,Math.floor(nflPlayoffRaceNumber_(row[col.currentweek],0)));
  });
  return found||1;
}

function nflPlayoffRaceTiming_(gameId){
  const year=nflPlayoffRaceYear_(gameId);
  const now=Date.now();
  const currentWeek=nflPlayoffRaceSettingsWeek_(year);
  let seasonStarted=currentWeek>1;
  if(currentWeek<=1){
    const week1=nflPlayoffRaceFetchWeek_(year,1);
    const first=nflPlayoffRaceFirstKickoffMs_(week1);
    if(first)seasonStarted=first<=now;
  }

  let currentWindow=null;
  const candidates=[currentWeek,currentWeek+1].filter(function(week){return !!nflPlayoffRaceCheckpointMultiplier_(week);});
  for(let i=0;i<candidates.length&&!currentWindow;i++){
    const checkpoint=candidates[i];
    const prior=nflPlayoffRaceFetchWeek_(year,checkpoint-1);
    const next=nflPlayoffRaceFetchWeek_(year,checkpoint);
    const priorFinal=prior.length>0&&prior.every(nflPlayoffRaceGameFinal_);
    const firstKickoff=nflPlayoffRaceFirstKickoffMs_(next);
    if(priorFinal&&firstKickoff>now){
      currentWindow={
        week:checkpoint,
        multiplier:nflPlayoffRaceCheckpointMultiplier_(checkpoint),
        opensAfterWeek:checkpoint-1,
        closesAt:new Date(firstKickoff).toISOString()
      };
    }
  }

  const checkpoints=[4,8,12,15];
  const nextWeek=checkpoints.find(function(week){return week>currentWeek;})||0;
  return {
    year:year,
    currentWeek:currentWeek,
    seasonStarted:seasonStarted,
    currentWindow:currentWindow,
    nextWindow:nextWeek?{week:nextWeek,multiplier:nflPlayoffRaceCheckpointMultiplier_(nextWeek)}:null
  };
}

function nflPlayoffRaceCategorySnapshots_(rows,categoryId){
  return (rows||[]).filter(function(row){return row.categoryId===nflPlayoffRaceKey_(categoryId);});
}
function nflPlayoffRaceActiveSnapshot_(rows,categoryId){
  const list=nflPlayoffRaceCategorySnapshots_(rows,categoryId).filter(function(row){return row.isActive;});
  return list.length?list[list.length-1]:null;
}
function nflPlayoffRaceOriginalSnapshot_(rows,categoryId){
  const list=nflPlayoffRaceCategorySnapshots_(rows,categoryId).filter(function(row){return nflPlayoffRaceKey_(row.forecastType)==="original";});
  return list.length?list[0]:null;
}
function nflPlayoffRacePublicSnapshot_(row){
  if(!row)return null;
  let rankings=[];
  try{rankings=JSON.parse(row.rankingsJSON||"[]");}catch(err){rankings=[];}
  return {
    forecastId:row.forecastId,categoryId:row.categoryId,forecastType:row.forecastType,
    effectiveWeek:row.effectiveWeek,multiplier:row.multiplier,rankings:rankings,
    submittedAt:row.submittedAt,active:row.isActive,source:row.source
  };
}

function nflPlayoffRaceMigrateLegacy_(gameId,username,timing){
  const ballots=typeof rankingGetUserEntries_==="function"?rankingGetUserEntries_(username,gameId):{};
  let rows=nflPlayoffRaceReadSnapshots_(gameId,username);
  Object.keys(ballots||{}).forEach(function(categoryId){
    if(!ballots[categoryId]||!ballots[categoryId].length)return;
    if(nflPlayoffRaceCategorySnapshots_(rows,categoryId).length)return;
    nflPlayoffRaceAppendSnapshot_({
      gameId:gameId,username:username,categoryId:categoryId,
      forecastId:nflPlayoffRaceForecastId_(),forecastType:"original",
      effectiveWeek:timing.seasonStarted?timing.currentWeek:0,
      multiplier:nflPlayoffRaceLateEntryMultiplier_(timing.currentWeek,timing.seasonStarted),
      rankings:ballots[categoryId],submittedAt:new Date().toISOString(),
      source:"legacy-ranking-migration"
    });
    rows=nflPlayoffRaceReadSnapshots_(gameId,username);
  });
  return rows;
}

function nflPlayoffRaceMeta_(gameId,username){
  const timing=nflPlayoffRaceTiming_(gameId);
  const rows=nflPlayoffRaceMigrateLegacy_(gameId,username,timing);
  const categories=typeof rankingGameCategories_==="function"?rankingGameCategories_(gameId):[];
  const missingOriginal=categories.map(function(category){return nflPlayoffRaceKey_(category.id);}).filter(function(categoryId){
    return !nflPlayoffRaceOriginalSnapshot_(rows,categoryId);
  });
  const active=rows.filter(function(row){return row.isActive;});
  const currentMultiplier=active.length
    ?Math.min.apply(Math,active.map(function(row){return nflPlayoffRaceNumber_(row.multiplier,1);}))
    :nflPlayoffRaceLateEntryMultiplier_(timing.currentWeek,timing.seasonStarted);
  const canEnter=missingOriginal.length>0&&(!timing.seasonStarted||timing.currentWeek<=NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_);
  const allOriginal=missingOriginal.length===0;
  const canUpdate=allOriginal&&!!timing.currentWindow;
  const saveMultiplier=timing.currentWindow
    ?timing.currentWindow.multiplier
    :(canEnter?nflPlayoffRaceLateEntryMultiplier_(timing.currentWeek,timing.seasonStarted):currentMultiplier);
  let lockReason="";
  if(missingOriginal.length&&!canEnter)lockReason="New scoring forecasts closed after Week "+NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_+".";
  else if(allOriginal&&!timing.currentWindow&&timing.currentWeek>=15)lockReason="Final lock. The Week 15 update window has closed.";
  else if(allOriginal&&!timing.currentWindow)lockReason="Original Prediction saved. Updates open before Weeks 4, 8, 12 and 15 after the prior NFL week is final.";
  else if(timing.currentWindow)lockReason="Week "+timing.currentWindow.week+" update window is open until the first kickoff of Week "+timing.currentWindow.week+".";
  else lockReason="Complete your Original Prediction.";
  return {
    timing:timing,rows:rows,missingOriginal:missingOriginal,currentMultiplier:currentMultiplier,
    saveMultiplier:saveMultiplier,canEnter:canEnter,canUpdate:canUpdate,canEdit:canEnter||canUpdate,
    lockReason:lockReason
  };
}

function apiGetNflPlayoffRaceState_(payload){
  payload=payload||{};
  const gameId=nflPlayoffRaceString_(payload.gameId);
  const username=nflPlayoffRaceString_(payload.username);
  if(!nflPlayoffRaceIsGame_(gameId))throw new Error("NFL Playoff Race game is required.");
  if(!username)throw new Error("Username is required.");
  const base=apiGetRankingState_({gameId:gameId,username:username});
  const meta=nflPlayoffRaceMeta_(gameId,username);
  base.categories=(base.categories||[]).map(function(category){
    const categoryId=nflPlayoffRaceKey_(category.id);
    const original=nflPlayoffRaceOriginalSnapshot_(meta.rows,categoryId);
    const active=nflPlayoffRaceActiveSnapshot_(meta.rows,categoryId);
    const canEdit=original?meta.canUpdate:meta.canEnter;
    const multiplier=active?nflPlayoffRaceNumber_(active.multiplier,1):meta.saveMultiplier;
    const baseEarned=nflPlayoffRaceNumber_(category.earnedPoints,0);
    const baseRemaining=nflPlayoffRaceNumber_(category.remainingPoints,0);
    return Object.assign({},category,{
      locked:category.resolved||category.locked||!canEdit,
      canEdit:canEdit,
      originalSnapshot:nflPlayoffRacePublicSnapshot_(original),
      activeSnapshot:nflPlayoffRacePublicSnapshot_(active),
      forecastMultiplier:multiplier,
      baseEarnedPoints:baseEarned,
      baseRemainingPoints:baseRemaining,
      earnedPoints:Math.round(baseEarned*multiplier*100)/100,
      remainingPoints:Math.round(baseRemaining*multiplier*100)/100
    });
  });
  base.nflPlayoffRace={
    currentWeek:meta.timing.currentWeek,seasonStarted:meta.timing.seasonStarted,
    currentWindow:meta.timing.currentWindow,nextWindow:meta.timing.nextWindow,
    canEnter:meta.canEnter,canUpdate:meta.canUpdate,canEdit:meta.canEdit,
    currentMultiplier:meta.currentMultiplier,saveMultiplier:meta.saveMultiplier,
    finalLateEntryWeek:NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_,lockReason:meta.lockReason,
    originalForecast:meta.rows.filter(function(row){return nflPlayoffRaceKey_(row.forecastType)==="original";}).map(nflPlayoffRacePublicSnapshot_),
    activeForecast:meta.rows.filter(function(row){return row.isActive;}).map(nflPlayoffRacePublicSnapshot_),
    history:meta.rows.map(nflPlayoffRacePublicSnapshot_)
  };
  return base;
}

function saveNflPlayoffRaceRanking_(payload){
  payload=payload||{};
  const gameId=nflPlayoffRaceString_(payload.gameId);
  const username=nflPlayoffRaceString_(payload.username);
  const categoryId=nflPlayoffRaceKey_(payload.categoryId);
  const rankings=Array.isArray(payload.rankings)?payload.rankings:[];
  if(!nflPlayoffRaceIsGame_(gameId))throw new Error("NFL Playoff Race game is required.");
  if(!username||!categoryId)throw new Error("Username and CategoryId are required.");
  const category=(rankingGameCategories_(gameId)||[]).find(function(item){return nflPlayoffRaceKey_(item.id)===categoryId;});
  if(!category)throw new Error("NFL Playoff Race section was not found.");
  rankingValidateBallot_(category,rankings);

  const meta=nflPlayoffRaceMeta_(gameId,username);
  const original=nflPlayoffRaceOriginalSnapshot_(meta.rows,categoryId);
  let forecastType="original";
  let effectiveWeek=meta.timing.seasonStarted?meta.timing.currentWeek:0;
  let multiplier=nflPlayoffRaceLateEntryMultiplier_(meta.timing.currentWeek,meta.timing.seasonStarted);

  if(original){
    if(!meta.timing.currentWindow)throw new Error(meta.lockReason||"Playoff Race is locked outside an update window.");
    forecastType="update";
    effectiveWeek=meta.timing.currentWindow.week;
    multiplier=meta.timing.currentWindow.multiplier;
  }else if(meta.timing.seasonStarted&&meta.timing.currentWeek>NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_){
    throw new Error("New scoring forecasts closed after Week "+NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_+".");
  }

  const saved=saveRankingBallot_({username:username,gameId:gameId,categoryId:categoryId,rankings:rankings});
  nflPlayoffRaceAppendSnapshot_({
    gameId:gameId,username:username,categoryId:categoryId,
    forecastId:nflPlayoffRaceForecastId_(),forecastType:forecastType,
    effectiveWeek:effectiveWeek,multiplier:multiplier,rankings:rankings,
    submittedAt:new Date().toISOString(),
    source:forecastType==="original"?"player-original":"player-checkpoint-update"
  });
  return Object.assign({},saved,{
    forecastType:forecastType,effectiveWeek:effectiveWeek,forecastMultiplier:multiplier,
    originalPreserved:!!original
  });
}

function nflPlayoffRaceMultiplierMapForGame_(gameId){
  const result={};
  if(!nflPlayoffRaceIsGame_(gameId))return result;
  nflPlayoffRaceReadSnapshots_(gameId).forEach(function(row){
    if(!row.isActive)return;
    const userKey=nflPlayoffRaceKey_(row.username);
    if(!result[userKey])result[userKey]={};
    result[userKey][row.categoryId]=nflPlayoffRaceNumber_(row.multiplier,1);
  });
  return result;
}

function nflPlayoffRaceMultiplierMapForUser_(username,gameId){
  const all=nflPlayoffRaceMultiplierMapForGame_(gameId);
  return all[nflPlayoffRaceKey_(username)]||{};
}
