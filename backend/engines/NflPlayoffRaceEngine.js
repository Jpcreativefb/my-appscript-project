/* =====================================================
   NFL PLAYOFF RACE ENGINE R1
   Isolated forecast snapshots + late entry/checkpoint rules.
===================================================== */

const NFL_PLAYOFF_RACE_SNAPSHOT_SHEET_ = "NflForecastSnapshots";
const NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_ = [
  "GameId","Username","CategoryId","ForecastId","ForecastType","EffectiveWeek",
  "Multiplier","RankingsJSON","SubmittedAt","IsActive","Source","TeamMultipliersJSON"
];
const NFL_PLAYOFF_RACE_CHECKPOINTS_ = {4:0.95,8:0.85,12:0.65,15:0.40};
const NFL_PLAYOFF_RACE_CHECKPOINT_WEEKS_ = [4,8,12,15];
const NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_SHEET_ = "NflForecastCheckpointScores";
const NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_HEADERS_ = ["GameId","Username","CategoryId","CheckpointWeek","ForecastId","ExactSeedPoints","NearSeedPoints","PlayoffFieldPoints","TotalPoints","AwardedAt"];
const NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_ = 10;
const NFL_PLAYOFF_RACE_SETTINGS_SHEET_ = "NflPlayoffRaceSettings";
const NFL_PLAYOFF_RACE_SETTINGS_HEADERS_ = [
  "GameId","SeasonStartDate","CurrentWeekMode","CurrentWeekOverride",
  "UpdateWindowMode","UpdateWindowWeek","MultiplierOverride","DivisionSweepBonus","PerfectSeedsBonus","UpdatedAt","UpdatedBy"
];
const NFL_PLAYOFF_RACE_TEAM_BONUS_ = 3;
const NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_ = 5;
const NFL_PLAYOFF_RACE_FIELD_SIZE_ = 7;
const NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_ = 10;
const NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_ = 20;
const NFL_PLAYOFF_RACE_WEEKLY_SCORE_SHEET_ = "NflForecastWeeklyScores";
const NFL_PLAYOFF_RACE_WEEKLY_SCORE_HEADERS_ = [
  "GameId","Username","NFLWeek","MiniGameNumber","QuarterNumber","ForecastId",
  "RaceScore","PreviousRaceScore","ScoreDelta","WeeklyPlacement","Wins","Losses","Ties",
  "ExactSeedCount","DivisionSweepCount","DivisionSweepBonus","PerfectSeedBonus","ScoringDetailJSON","FinalizedAt"
];
const NFL_PLAYOFF_RACE_GAME_RESULT_SHEET_ = "NflForecastGameResults";
const NFL_PLAYOFF_RACE_GAME_RESULT_HEADERS_ = [
  "GameId","Username","MiniGameNumber","ThroughWeek","Wins","Losses","Ties","WinPct",
  "RaceScoreTotal","ExactSeedCount","DivisionSweepBonus","Placement","DetailJSON","FinalizedAt"
];

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

function nflPlayoffRaceEnsureSettingsSheet_(){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(NFL_PLAYOFF_RACE_SETTINGS_SHEET_);
  if(!sh)sh=ss.insertSheet(NFL_PLAYOFF_RACE_SETTINGS_SHEET_);
  const lastColumn=Math.max(1,sh.getLastColumn());
  let headers=sh.getLastRow()?sh.getRange(1,1,1,lastColumn).getValues()[0].map(nflPlayoffRaceString_):[];
  if(!headers.some(Boolean)){
    sh.getRange(1,1,1,NFL_PLAYOFF_RACE_SETTINGS_HEADERS_.length).setValues([NFL_PLAYOFF_RACE_SETTINGS_HEADERS_]);
    sh.setFrozenRows(1);
    headers=NFL_PLAYOFF_RACE_SETTINGS_HEADERS_.slice();
  }
  const missing=NFL_PLAYOFF_RACE_SETTINGS_HEADERS_.filter(function(header){return headers.indexOf(header)===-1;});
  if(missing.length)sh.getRange(1,headers.length+1,1,missing.length).setValues([missing]);
  return sh;
}

function nflPlayoffRaceDefaultSettings_(gameId){
  return {
    gameId:nflPlayoffRaceString_(gameId),
    seasonStartDate:"",
    currentWeekMode:"auto",
    currentWeekOverride:1,
    updateWindowMode:"auto",
    updateWindowWeek:0,
    multiplierOverride:0,
    divisionSweepBonus:NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_,
    perfectSeedsBonus:NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_,
    updatedAt:"",
    updatedBy:""
  };
}

function nflPlayoffRaceGetSettings_(gameId){
  gameId=nflPlayoffRaceString_(gameId);
  const fallback=nflPlayoffRaceDefaultSettings_(gameId);
  const sh=nflPlayoffRaceEnsureSettingsSheet_();
  if(sh.getLastRow()<=1)return fallback;
  const data=sh.getDataRange().getValues();
  const headers=data[0].map(nflPlayoffRaceString_);
  const col=nflPlayoffRaceHeaderMap_(headers);
  for(let i=1;i<data.length;i++){
    if(nflPlayoffRaceString_(data[i][col.gameid])!==gameId)continue;
    const weekMode=nflPlayoffRaceKey_(data[i][col.currentweekmode]);
    const windowMode=nflPlayoffRaceKey_(data[i][col.updatewindowmode]);
    return {
      gameId:gameId,
      seasonStartDate:data[i][col.seasonstartdate] instanceof Date
        ? Utilities.formatDate(data[i][col.seasonstartdate],SpreadsheetApp.getActive().getSpreadsheetTimeZone(),"yyyy-MM-dd")
        : nflPlayoffRaceString_(data[i][col.seasonstartdate]),
      currentWeekMode:weekMode==="override"?"override":"auto",
      currentWeekOverride:Math.max(1,Math.min(18,Math.floor(nflPlayoffRaceNumber_(data[i][col.currentweekoverride],1)))),
      updateWindowMode:["open","closed"].indexOf(windowMode)!==-1?windowMode:"auto",
      updateWindowWeek:Math.max(0,Math.min(18,Math.floor(nflPlayoffRaceNumber_(data[i][col.updatewindowweek],0)))),
      multiplierOverride:Math.max(0,Math.min(1,nflPlayoffRaceNumber_(data[i][col.multiplieroverride],0))),
      divisionSweepBonus:col.divisionsweepbonus===undefined?NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_:Math.max(0,nflPlayoffRaceNumber_(data[i][col.divisionsweepbonus],NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_)),
      perfectSeedsBonus:col.perfectseedsbonus===undefined?NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_:Math.max(0,nflPlayoffRaceNumber_(data[i][col.perfectseedsbonus],NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_)),
      updatedAt:nflPlayoffRaceString_(data[i][col.updatedat]),
      updatedBy:nflPlayoffRaceString_(data[i][col.updatedby])
    };
  }
  return fallback;
}

function apiAdminGetNflPlayoffRaceSettings_(payload){
  payload=payload||{};
  if(typeof requireAdmin_==="function")requireAdmin_(payload);
  const gameId=nflPlayoffRaceString_(payload.gameId);
  if(!nflPlayoffRaceIsGame_(gameId))throw new Error("NFL Playoff Race game is required.");
  return {success:true,settings:nflPlayoffRaceGetSettings_(gameId)};
}

function apiAdminSaveNflPlayoffRaceSettings_(payload){
  payload=payload||{};
  if(typeof requireAdmin_==="function")requireAdmin_(payload);
  const gameId=nflPlayoffRaceString_(payload.gameId);
  if(!nflPlayoffRaceIsGame_(gameId))throw new Error("NFL Playoff Race game is required.");
  const seasonStartDate=nflPlayoffRaceString_(payload.seasonStartDate);
  if(seasonStartDate&&!/^\d{4}-\d{2}-\d{2}$/.test(seasonStartDate))throw new Error("Season Start Date must use YYYY-MM-DD.");
  const currentWeekMode=nflPlayoffRaceKey_(payload.currentWeekMode)==="override"?"override":"auto";
  const updateKey=nflPlayoffRaceKey_(payload.updateWindowMode);
  const updateWindowMode=["open","closed"].indexOf(updateKey)!==-1?updateKey:"auto";
  const currentWeekOverride=Math.max(1,Math.min(18,Math.floor(nflPlayoffRaceNumber_(payload.currentWeekOverride,1))));
  const updateWindowWeek=Math.max(0,Math.min(18,Math.floor(nflPlayoffRaceNumber_(payload.updateWindowWeek,0))));
  const multiplierOverride=Math.max(0,Math.min(1,nflPlayoffRaceNumber_(payload.multiplierOverride,0)));
  const divisionSweepBonus=Math.max(0,nflPlayoffRaceNumber_(payload.divisionSweepBonus,NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_));
  const perfectSeedsBonus=Math.max(0,nflPlayoffRaceNumber_(payload.perfectSeedsBonus,NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_));
  const sh=nflPlayoffRaceEnsureSettingsSheet_();
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
  const col=nflPlayoffRaceHeaderMap_(headers);
  let rowNumber=0;
  if(sh.getLastRow()>1){
    const rows=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
    for(let i=0;i<rows.length;i++){
      if(nflPlayoffRaceString_(rows[i][col.gameid])===gameId){rowNumber=i+2;break;}
    }
  }
  const values={
    GameId:gameId,
    SeasonStartDate:seasonStartDate,
    CurrentWeekMode:currentWeekMode,
    CurrentWeekOverride:currentWeekOverride,
    UpdateWindowMode:updateWindowMode,
    UpdateWindowWeek:updateWindowWeek||"",
    MultiplierOverride:multiplierOverride||"",
    DivisionSweepBonus:divisionSweepBonus,
    PerfectSeedsBonus:perfectSeedsBonus,
    UpdatedAt:new Date().toISOString(),
    UpdatedBy:nflPlayoffRaceString_(payload.username||"admin")
  };
  const row=headers.map(function(header){return values[header]===undefined?"":values[header];});
  if(rowNumber)sh.getRange(rowNumber,1,1,headers.length).setValues([row]);
  else sh.appendRow(row);
  return {success:true,settings:nflPlayoffRaceGetSettings_(gameId),message:"Playoff Race timing saved."};
}

function nflPlayoffRaceBonusMax_(){
  return (NFL_PLAYOFF_RACE_FIELD_SIZE_*NFL_PLAYOFF_RACE_TEAM_BONUS_)+NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_;
}

function nflPlayoffRaceBonusForBallot_(categoryId,ballot,finalRanks){
  if(!/playoff-seeds/.test(nflPlayoffRaceKey_(categoryId))){
    return {resolved:false,correctPlayoffTeams:0,teamBonus:0,perfectFieldBonus:0,total:0,maxBonus:0};
  }
  const predicted={};
  (ballot||[]).forEach(function(row){
    const id=nflPlayoffRaceKey_(row&&row.nomineeId);
    const rank=Math.floor(nflPlayoffRaceNumber_(row&&row.rank,0));
    if(id&&rank>=1&&rank<=NFL_PLAYOFF_RACE_FIELD_SIZE_)predicted[id]=true;
  });
  const actual={};
  Object.keys(finalRanks||{}).forEach(function(id){
    const rank=Math.floor(nflPlayoffRaceNumber_(finalRanks[id],0));
    if(rank>=1&&rank<=NFL_PLAYOFF_RACE_FIELD_SIZE_)actual[nflPlayoffRaceKey_(id)]=true;
  });
  const resolved=Object.keys(finalRanks||{}).length>=16;
  if(!resolved){
    return {resolved:false,correctPlayoffTeams:0,teamBonus:0,perfectFieldBonus:0,total:0,maxBonus:nflPlayoffRaceBonusMax_()};
  }
  let correct=0;
  Object.keys(predicted).forEach(function(id){if(actual[id])correct++;});
  const teamBonus=correct*NFL_PLAYOFF_RACE_TEAM_BONUS_;
  const perfectFieldBonus=correct===NFL_PLAYOFF_RACE_FIELD_SIZE_?NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_:0;
  return {
    resolved:true,
    correctPlayoffTeams:correct,
    teamBonus:teamBonus,
    perfectFieldBonus:perfectFieldBonus,
    total:teamBonus+perfectFieldBonus,
    maxBonus:nflPlayoffRaceBonusMax_()
  };
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
      source:nflPlayoffRaceString_(row[col.source]),
      teamMultipliersJSON:col.teammultipliersjson===undefined?"":nflPlayoffRaceString_(row[col.teammultipliersjson])
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
      SubmittedAt:snapshot.submittedAt,IsActive:true,Source:snapshot.source||"nfl-playoff-race",
      TeamMultipliersJSON:JSON.stringify(snapshot.teamMultipliers||{})
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
  const base={
    action:"getSportsScores",
    sport:"football",
    league:"NFL",
    seasonYear:year,
    week:week
  };
  const attempts=[
    Object.assign({},base,{seasonType:2}),
    base
  ];
  for(let i=0;i<attempts.length;i++){
    try{
      const result=sportsWagerFetchJson_(attempts[i],"NFL Playoff Race schedule");
      if(!result||result.success===false)continue;
      const scores=nflPlayoffRaceExtractScores_(result);
      if(!scores.length)continue;
      return scores.map(function(score){
        return typeof sportsWagerNormalizeScore_==="function"?sportsWagerNormalizeScore_(score):score;
      });
    }catch(err){}
  }
  return [];
}

function nflPlayoffRaceRequestContext_(gameId){
  return {gameId:nflPlayoffRaceString_(gameId),year:nflPlayoffRaceYear_(gameId),weekCache:{},standingsCache:{},weekScheduleFetches:0,weekScheduleCacheHits:0};
}
function nflPlayoffRaceFetchWeekContext_(context,week){
  context=context||nflPlayoffRaceRequestContext_("");
  const key=String(Math.floor(Number(week)||0));
  if(Object.prototype.hasOwnProperty.call(context.weekCache,key)){
    context.weekScheduleCacheHits++;
    return context.weekCache[key];
  }
  context.weekScheduleFetches++;
  const games=nflPlayoffRaceFetchWeek_(context.year,Number(key));
  context.weekCache[key]=games;
  return games;
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

function nflPlayoffRaceDerivedWeekFromStart_(startDate,now){
  startDate=nflPlayoffRaceString_(startDate);
  if(!startDate)return 0;
  const start=new Date(startDate+"T00:00:00").getTime();
  if(!Number.isFinite(start)||now<start)return 0;
  return Math.max(1,Math.min(18,Math.floor((now-start)/(7*24*60*60*1000))+1));
}

function nflPlayoffRaceTiming_(gameId,requestContext){
  const context=requestContext||nflPlayoffRaceRequestContext_(gameId);
  const year=context.year;
  const now=Date.now();
  const settings=nflPlayoffRaceGetSettings_(gameId);
  const sheetWeek=nflPlayoffRaceSettingsWeek_(year);
  const dateWeek=nflPlayoffRaceDerivedWeekFromStart_(settings.seasonStartDate,now);
  const fallbackWeek=Math.max(sheetWeek,dateWeek||1);
  const sharedTiming=typeof pattcNflResolveCurrentWeek_==="function"
    ?pattcNflResolveCurrentWeek_({
       mode:settings.currentWeekMode,
       overrideWeek:settings.currentWeekOverride,
       startWeek:1,endWeek:18,fallbackWeek:fallbackWeek,
       fetchWeek:function(week){return nflPlayoffRaceFetchWeekContext_(context,week);}
     })
    :{week:settings.currentWeekMode==="override"?settings.currentWeekOverride:fallbackWeek,
      mode:settings.currentWeekMode,source:"legacy-fallback"};
  const currentWeek=sharedTiming.week;

  let seasonStarted=false;
  if(settings.seasonStartDate){
    const start=new Date(settings.seasonStartDate+"T00:00:00").getTime();
    seasonStarted=Number.isFinite(start)&&start<=now;
  }else{
    seasonStarted=currentWeek>1;
    if(currentWeek<=1){
      const week1=nflPlayoffRaceFetchWeekContext_(context,1);
      const first=nflPlayoffRaceFirstKickoffMs_(week1);
      if(first)seasonStarted=first<=now;
    }
  }

  let currentWindow=null;
  if(settings.updateWindowMode==="open"){
    const manualWeek=settings.updateWindowWeek||currentWeek;
    currentWindow={
      week:manualWeek,
      multiplier:settings.multiplierOverride>0?settings.multiplierOverride:1,
      opensAfterWeek:Math.max(0,manualWeek-1),
      closesAt:"",
      manual:true
    };
  }else if(settings.updateWindowMode!=="closed"){
    const candidates=[currentWeek,currentWeek+1].filter(function(week){return !!nflPlayoffRaceCheckpointMultiplier_(week);});
    for(let i=0;i<candidates.length&&!currentWindow;i++){
      const checkpoint=candidates[i];
      const prior=nflPlayoffRaceFetchWeekContext_(context,checkpoint-1);
      const next=nflPlayoffRaceFetchWeekContext_(context,checkpoint);
      const priorFinal=prior.length>0&&prior.every(nflPlayoffRaceGameFinal_);
      const firstKickoff=nflPlayoffRaceFirstKickoffMs_(next);
      if(priorFinal&&firstKickoff>now){
        currentWindow={
          week:checkpoint,
          multiplier:nflPlayoffRaceCheckpointMultiplier_(checkpoint),
          opensAfterWeek:checkpoint-1,
          closesAt:new Date(firstKickoff).toISOString(),
          manual:false
        };
      }
    }
  }

  const checkpoints=[4,8,12,15];
  const referenceWeek=currentWindow&&currentWindow.week?Math.max(currentWeek,currentWindow.week):currentWeek;
  const nextWeek=checkpoints.find(function(week){return week>referenceWeek;})||0;
  return {
    year:year, weekSource:sharedTiming.source,
    currentWeek:currentWeek,
    seasonStarted:seasonStarted,
    currentWindow:currentWindow,
    nextWindow:nextWeek?{week:nextWeek,multiplier:nflPlayoffRaceCheckpointMultiplier_(nextWeek)}:null,
    settings:{
      seasonStartDate:settings.seasonStartDate,
      currentWeekMode:settings.currentWeekMode,
      currentWeekOverride:settings.currentWeekOverride,
      updateWindowMode:settings.updateWindowMode,
      updateWindowWeek:settings.updateWindowWeek,
      multiplierOverride:settings.multiplierOverride
    }
  };
}

function nflPlayoffRaceTeamCatalog_(){
  return (typeof NFL_SEASON_PACK_TEAMS_!=="undefined"&&Array.isArray(NFL_SEASON_PACK_TEAMS_))
    ?NFL_SEASON_PACK_TEAMS_.slice()
    :[];
}
function nflPlayoffRaceTeamToken_(value){return nflPlayoffRaceKey_(value).replace(/[^a-z0-9]+/g,"");}
function nflPlayoffRaceTeamFromValue_(value){
  const token=nflPlayoffRaceTeamToken_(value);
  if(!token)return null;
  const teams=nflPlayoffRaceTeamCatalog_();
  for(let i=0;i<teams.length;i++){
    if(nflPlayoffRaceTeamToken_(teams[i].abbr)===token||nflPlayoffRaceTeamToken_(teams[i].name)===token)return teams[i];
  }
  return null;
}
function nflPlayoffRaceParseRecord_(value){
  const match=nflPlayoffRaceString_(value).match(/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/);
  if(!match)return null;
  const wins=Number(match[1])||0,losses=Number(match[2])||0,ties=Number(match[3])||0;
  const games=wins+losses+ties;
  return {wins:wins,losses:losses,ties:ties,games:games,pct:games?((wins+(ties*0.5))/games):0,text:wins+"-"+losses+"-"+ties};
}
function nflPlayoffRaceWeekFinal_(games){
  return Array.isArray(games)&&games.length>0&&games.every(nflPlayoffRaceGameFinal_);
}
function nflPlayoffRaceLatestFinalWeek_(year,currentWeek,requestContext){
  const context=requestContext||nflPlayoffRaceRequestContext_("nfl-playoff-race-"+year);
  for(let week=Math.max(1,Math.min(18,currentWeek));week>=1;week--){
    const games=nflPlayoffRaceFetchWeekContext_(context,week);
    if(nflPlayoffRaceWeekFinal_(games))return week;
  }
  return 0;
}
function nflPlayoffRaceRecordMap_(weekSets,cutoffWeek){
  const result={};
  (weekSets||[]).slice().sort(function(a,b){return b.week-a.week;}).forEach(function(set){
    if(set.week>cutoffWeek)return;
    (set.games||[]).forEach(function(game){
      [["HomeTeam","HomeRecord"],["AwayTeam","AwayRecord"]].forEach(function(pair){
        const team=nflPlayoffRaceTeamFromValue_(game[pair[0]]);
        if(!team||result[team.abbr])return;
        const record=nflPlayoffRaceParseRecord_(game[pair[1]]);
        if(record)result[team.abbr]=Object.assign({week:set.week},record);
      });
    });
  });
  return result;
}
function nflPlayoffRaceRecordCompare_(a,b){
  if(b.pct!==a.pct)return b.pct-a.pct;
  if(b.wins!==a.wins)return b.wins-a.wins;
  if(b.ties!==a.ties)return b.ties-a.ties;
  if(a.losses!==b.losses)return a.losses-b.losses;
  return String(a.name||"").localeCompare(String(b.name||""));
}
function nflPlayoffRaceSeedConference_(conference,recordMap){
  const teams=nflPlayoffRaceTeamCatalog_().filter(function(team){return team.conference===conference;}).map(function(team){
    const record=recordMap[team.abbr]||{wins:0,losses:0,ties:0,games:0,pct:0,text:"0-0-0"};
    return Object.assign({},team,record);
  });
  const leaders=[],divisionRanks={};
  ["East","North","South","West"].forEach(function(division){
    const rows=teams.filter(function(team){return team.division===division;}).sort(nflPlayoffRaceRecordCompare_);
    rows.forEach(function(team,index){divisionRanks[team.abbr]=index+1;});
    if(rows.length)leaders.push(rows[0]);
  });
  leaders.sort(nflPlayoffRaceRecordCompare_);
  const leaderSet={};leaders.forEach(function(team){leaderSet[team.abbr]=true;});
  const rest=teams.filter(function(team){return !leaderSet[team.abbr];}).sort(nflPlayoffRaceRecordCompare_);
  const ordered=leaders.concat(rest);
  const recordCounts={};
  ordered.forEach(function(team){
    const sig=[team.wins,team.losses,team.ties].join("-");
    recordCounts[sig]=(recordCounts[sig]||0)+1;
  });
  return ordered.map(function(team,index){
    const sig=[team.wins,team.losses,team.ties].join("-");
    return {
      nomineeId:team.abbr,name:team.name,conference:team.conference,division:team.division,
      divisionRank:divisionRanks[team.abbr]||0,
      record:team.text,rank:index+1,provisionalTie:(recordCounts[sig]||0)>1
    };
  });
}
function nflPlayoffRaceStandingsMap_(rows){
  const map={};(rows||[]).forEach(function(row){map[nflPlayoffRaceKey_(row.nomineeId)]=row;});return map;
}
function nflPlayoffRaceStandingsAtWeek_(gameId,completedWeek,requestContext){
  const context=requestContext||nflPlayoffRaceRequestContext_(gameId);
  const key=String(Math.floor(Number(completedWeek)||0));
  if(context.standingsCache[key])return context.standingsCache[key];
  if(!completedWeek)return null;
  const cutoffGames=nflPlayoffRaceFetchWeekContext_(context,completedWeek);
  if(!nflPlayoffRaceWeekFinal_(cutoffGames))return null;
  const weekNumbers=[completedWeek,completedWeek-1,completedWeek-2].filter(function(week,index,arr){return week>0&&arr.indexOf(week)===index;});
  const weekSets=weekNumbers.map(function(week){return {week:week,games:nflPlayoffRaceFetchWeekContext_(context,week)};});
  const currentRecords=nflPlayoffRaceRecordMap_(weekSets,completedWeek);
  const previousRecords=completedWeek>1?nflPlayoffRaceRecordMap_(weekSets,completedWeek-1):{};
  const result={
    week:completedWeek,updatedAt:new Date().toISOString(),provisionalTiebreakers:true,
    current:{AFC:nflPlayoffRaceSeedConference_("AFC",currentRecords),NFC:nflPlayoffRaceSeedConference_("NFC",currentRecords)},
    previous:{AFC:completedWeek>1?nflPlayoffRaceSeedConference_("AFC",previousRecords):[],NFC:completedWeek>1?nflPlayoffRaceSeedConference_("NFC",previousRecords):[]}
  };
  ["AFC","NFC"].forEach(function(conf){
    const prev=nflPlayoffRaceStandingsMap_(result.previous[conf]);
    result.current[conf]=result.current[conf].map(function(row){
      const prior=prev[nflPlayoffRaceKey_(row.nomineeId)];
      const previousRank=prior?prior.rank:0;
      return Object.assign({},row,{previousRank:previousRank,movement:previousRank?previousRank-row.rank:0});
    });
  });
  context.standingsCache[key]=result;
  return result;
}
function nflPlayoffRaceLiveStandings_(gameId,currentWeek,requestContext){
  const context=requestContext||nflPlayoffRaceRequestContext_(gameId);
  const year=context.year;
  const completedWeek=nflPlayoffRaceLatestFinalWeek_(year,currentWeek,context);
  if(!completedWeek)return {week:0,updatedAt:new Date().toISOString(),provisionalTiebreakers:true,current:{AFC:[],NFC:[]},previous:{AFC:[],NFC:[]}};
  const cacheKey="nfl-playoff-race-live-r2:"+year+":"+completedWeek;
  try{
    const cache=CacheService.getScriptCache(),cached=cache.get(cacheKey);
    if(cached)return JSON.parse(cached);
  }catch(err){}
  const result=nflPlayoffRaceStandingsAtWeek_(gameId,completedWeek,context);
  if(!result)return {week:0,updatedAt:new Date().toISOString(),provisionalTiebreakers:true,current:{AFC:[],NFC:[]},previous:{AFC:[],NFC:[]}};
  try{CacheService.getScriptCache().put(cacheKey,JSON.stringify(result),300);}catch(err){}
  return result;
}
function nflPlayoffRacePositionPoints_(predictedRank,currentRank){
  const diff=Math.abs((Number(predictedRank)||0)-(Number(currentRank)||0));
  if(diff===0)return 20;if(diff===1)return 15;if(diff===2)return 10;if(diff===3)return 6;if(diff===4)return 3;return 0;
}
function nflPlayoffRaceSnapshotRankings_(snapshot){
  if(!snapshot)return [];
  try{return JSON.parse(snapshot.rankingsJSON||"[]");}catch(err){return [];}
}
function nflPlayoffRaceLiveCategory_(category,activeSnapshot,live){
  const categoryId=nflPlayoffRaceKey_(category&&category.id);
  const conference=categoryId.indexOf("afc-")===0?"AFC":categoryId.indexOf("nfc-")===0?"NFC":"";
  if(!conference||!live||!live.current||!live.week)return null;
  const current=nflPlayoffRaceStandingsMap_(live.current[conference]||[]);
  const forecast=nflPlayoffRaceSnapshotRankings_(activeSnapshot);
  const teamMultipliers=nflPlayoffRaceSnapshotTeamMultipliers_(activeSnapshot);
  const fallback=activeSnapshot?nflPlayoffRaceNumber_(activeSnapshot.multiplier,1):1;
  const ballot=forecast.length?forecast:(Array.isArray(category.ballot)?category.ballot:[]);
  let correctPlayoffTeams=0,weightedBonus=0,weightedMax=0;
  const playoffValues=[];
  const rows=ballot.slice().sort(function(a,b){return Number(a.rank||0)-Number(b.rank||0);}).map(function(pick){
    const currentRow=current[nflPlayoffRaceKey_(pick.nomineeId)];
    const currentRank=currentRow?currentRow.rank:0;
    const predictedRank=Number(pick.rank)||0;
    const pct=Object.prototype.hasOwnProperty.call(teamMultipliers,nflPlayoffRaceKey_(pick.nomineeId))
      ?teamMultipliers[nflPlayoffRaceKey_(pick.nomineeId)]:fallback;
    const positionPoints=currentRank?nflPlayoffRacePositionPoints_(predictedRank,currentRank):0;
    const playoffBonus=predictedRank<=NFL_PLAYOFF_RACE_FIELD_SIZE_&&currentRank>0&&currentRank<=NFL_PLAYOFF_RACE_FIELD_SIZE_?NFL_PLAYOFF_RACE_TEAM_BONUS_:0;
    if(predictedRank<=NFL_PLAYOFF_RACE_FIELD_SIZE_){playoffValues.push(pct);weightedMax+=NFL_PLAYOFF_RACE_TEAM_BONUS_*pct;}
    if(playoffBonus)correctPlayoffTeams++;
    weightedBonus+=playoffBonus*pct;
    return {
      nomineeId:pick.nomineeId,predictedRank:predictedRank,
      record:currentRow?currentRow.record:"",currentRank:currentRank,division:currentRow?currentRow.division:"",divisionRank:currentRow?currentRow.divisionRank:0,conference:currentRow?currentRow.conference:"",
      previousRank:currentRow?currentRow.previousRank:0,movement:currentRow?currentRow.movement:0,
      provisionalTie:currentRow?currentRow.provisionalTie:false,teamMultiplier:pct,
      positionPoints:Math.round(positionPoints*pct*100)/100,
      playoffBonus:Math.round(playoffBonus*pct*100)/100,points:Math.round((positionPoints+playoffBonus)*pct*100)/100
    };
  });
  const perfectPct=playoffValues.length===7?Math.min.apply(Math,playoffValues):0;
  const perfectFieldBonus=correctPlayoffTeams===NFL_PLAYOFF_RACE_FIELD_SIZE_?NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_*perfectPct:0;
  const round=function(value){return Math.round(value*100)/100;};
  return {
    week:live.week,updatedAt:live.updatedAt,provisionalTiebreakers:live.provisionalTiebreakers,
    correctPlayoffTeams:correctPlayoffTeams,teamBonus:round(weightedBonus),
    perfectFieldBonus:round(perfectFieldBonus),
    totalPoints:round(rows.reduce(function(sum,row){return sum+row.points;},0)+perfectFieldBonus),
    maxPoints:round(rows.reduce(function(sum,row){return sum+20*row.teamMultiplier;},0)+weightedMax+NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_*perfectPct),rows:rows
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
    submittedAt:row.submittedAt,active:row.isActive,source:row.source,
    teamMultipliers:nflPlayoffRaceSnapshotTeamMultipliers_(row)
  };
}

/* R3: keep multiplier for each team's last FINALIZED predicted position.
   Legacy snapshots have only a category-wide multiplier; they stay compatible. */
function nflPlayoffRaceSnapshotTeamMultipliers_(snapshot){
  if(!snapshot)return {};
  let stored={};
  try{stored=typeof snapshot.teamMultipliersJSON==="string"?JSON.parse(snapshot.teamMultipliersJSON||"{}"):snapshot.teamMultipliersJSON||{};}catch(err){stored={};}
  const fallback=Math.max(0,Math.min(1,nflPlayoffRaceNumber_(snapshot.multiplier,1)));
  const out={};
  nflPlayoffRaceSnapshotRankings_(snapshot).forEach(function(row){
    const team=nflPlayoffRaceKey_(row.nomineeId);
    if(!team)return;
    const value=Object.prototype.hasOwnProperty.call(stored,team)?Number(stored[team]):fallback;
    out[team]=Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
  });
  return out;
}

/* =====================================================
   NFL PLAYOFF RACE QUARTER GAME R2
   Weekly history is finalized explicitly and is read-only during player load.
===================================================== */
function nflPlayoffRaceQuarterForWeek_(week){
  const w=Math.max(1,Math.min(18,Math.floor(nflPlayoffRaceNumber_(week,1))));
  if(w<=16){
    return {week:w,phase:"regular",miniGameNumber:Math.floor((w-1)/4)+1,quarterNumber:((w-1)%4)+1};
  }
  return {week:w,phase:"final-preview",miniGameNumber:0,quarterNumber:0};
}
function nflPlayoffRaceScoringConfig_(gameId){
  const settings=nflPlayoffRaceGetSettings_(gameId);
  return {
    divisionSweepBonus:Math.max(0,nflPlayoffRaceNumber_(settings.divisionSweepBonus,NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_)),
    perfectSeedsBonus:Math.max(0,nflPlayoffRaceNumber_(settings.perfectSeedsBonus,NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_))
  };
}
function nflPlayoffRaceDivisionSweepBonus_(categoryId,rankings,actualRanks,snapshot,config){
  const conference=nflPlayoffRaceKey_(categoryId).indexOf("afc-")===0?"AFC":"NFC";
  const teams=nflPlayoffRaceTeamCatalog_().filter(function(team){return team.conference===conference;});
  const predicted={};(rankings||[]).forEach(function(row){predicted[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  const values=nflPlayoffRaceSnapshotTeamMultipliers_(snapshot),fallback=snapshot?nflPlayoffRaceNumber_(snapshot.multiplier,1):1;
  let count=0,total=0;
  ["East","North","South","West"].forEach(function(division){
    const ids=teams.filter(function(team){return team.division===division;}).map(function(team){return nflPlayoffRaceKey_(team.abbr);});
    if(ids.length!==4||ids.some(function(id){return !predicted[id]||!actualRanks[id];}))return;
    const p=ids.slice().sort(function(a,b){return predicted[a]-predicted[b];});
    const a=ids.slice().sort(function(x,y){return actualRanks[x]-actualRanks[y];});
    if(p.join("|")!==a.join("|"))return;
    const pct=Math.min.apply(Math,ids.map(function(id){return Object.prototype.hasOwnProperty.call(values,id)?values[id]:fallback;}));
    count++;total+=Math.max(0,nflPlayoffRaceNumber_(config&&config.divisionSweepBonus,NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_))*pct;
  });
  return {count:count,bonus:Math.round(total*100)/100};
}
function nflPlayoffRacePerfectSeedsBonus_(rankings,actualRanks,snapshot,config){
  const predicted={};(rankings||[]).forEach(function(row){predicted[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  const exact=Object.keys(predicted).filter(function(id){return predicted[id]>=1&&predicted[id]<=7&&actualRanks[id]===predicted[id];});
  if(exact.length!==7)return 0;
  const values=nflPlayoffRaceSnapshotTeamMultipliers_(snapshot),fallback=snapshot?nflPlayoffRaceNumber_(snapshot.multiplier,1):1;
  const pct=Math.min.apply(Math,exact.map(function(id){return Object.prototype.hasOwnProperty.call(values,id)?values[id]:fallback;}));
  return Math.round(Math.max(0,nflPlayoffRaceNumber_(config&&config.perfectSeedsBonus,NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_))*pct*100)/100;
}
function nflPlayoffRaceRaceScoreForCategory_(categoryId,snapshot,standingsRows,config){
  const rankings=nflPlayoffRaceSnapshotRankings_(snapshot);
  const actual={};(standingsRows||[]).forEach(function(row){actual[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  if(rankings.length!==16||Object.keys(actual).length<16)return null;
  const values=nflPlayoffRaceSnapshotTeamMultipliers_(snapshot),fallback=nflPlayoffRaceNumber_(snapshot&&snapshot.multiplier,1);
  let positionPoints=0,fieldBonus=0,correctField=0,exactSeedCount=0;const topValues=[];
  rankings.forEach(function(row){
    const id=nflPlayoffRaceKey_(row.nomineeId),pred=Number(row.rank)||0,act=actual[id]||0;
    const pct=Object.prototype.hasOwnProperty.call(values,id)?values[id]:fallback;
    const pos=nflPlayoffRacePositionPoints_(pred,act);positionPoints+=pos*pct;if(pred===act)exactSeedCount++;
    if(pred>=1&&pred<=7){topValues.push(pct);if(act>=1&&act<=7){fieldBonus+=NFL_PLAYOFF_RACE_TEAM_BONUS_*pct;correctField++;}}
  });
  const perfectFieldBonus=correctField===7&&topValues.length===7?NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_*Math.min.apply(Math,topValues):0;
  const division=nflPlayoffRaceDivisionSweepBonus_(categoryId,rankings,actual,snapshot,config);
  const perfectSeedsBonus=nflPlayoffRacePerfectSeedsBonus_(rankings,actual,snapshot,config);
  const raceScore=positionPoints+fieldBonus+perfectFieldBonus+division.bonus+perfectSeedsBonus;
  return {
    categoryId:nflPlayoffRaceKey_(categoryId),forecastId:snapshot.forecastId||"",raceScore:Math.round(raceScore*100)/100,
    positionPoints:Math.round(positionPoints*100)/100,fieldBonus:Math.round(fieldBonus*100)/100,
    perfectFieldBonus:Math.round(perfectFieldBonus*100)/100,divisionSweepCount:division.count,
    divisionSweepBonus:division.bonus,perfectSeedBonus:perfectSeedsBonus,exactSeedCount:exactSeedCount
  };
}
function nflPlayoffRaceSnapshotForWeek_(rows,categoryId,week){
  const list=nflPlayoffRaceCategorySnapshots_(rows,categoryId).filter(function(row){
    return Math.floor(nflPlayoffRaceNumber_(row.effectiveWeek,0))<=week;
  });
  return list.length?list[list.length-1]:null;
}
function nflPlayoffRaceAllPlay_(rows){
  const result=(rows||[]).map(function(row){return Object.assign({},row,{wins:0,losses:0,ties:0,weeklyPlacement:0});});
  result.forEach(function(row,i){
    result.forEach(function(other,j){
      if(i===j)return;
      if(row.raceScore>other.raceScore)row.wins++;
      else if(row.raceScore<other.raceScore)row.losses++;
      else row.ties++;
    });
  });
  const sorted=result.slice().sort(function(a,b){return b.raceScore-a.raceScore||nflPlayoffRaceKey_(a.username).localeCompare(nflPlayoffRaceKey_(b.username));});
  let last=null,rank=0;sorted.forEach(function(row,index){if(last===null||row.raceScore!==last)rank=index+1;last=row.raceScore;row.weeklyPlacement=rank;});
  const placements={};sorted.forEach(function(row){placements[nflPlayoffRaceKey_(row.username)]=row.weeklyPlacement;});
  result.forEach(function(row){row.weeklyPlacement=placements[nflPlayoffRaceKey_(row.username)];});
  return result;
}
function nflPlayoffRaceAggregateRecord_(rows){
  return (rows||[]).reduce(function(out,row){
    out.wins+=nflPlayoffRaceNumber_(row.wins,0);out.losses+=nflPlayoffRaceNumber_(row.losses,0);out.ties+=nflPlayoffRaceNumber_(row.ties,0);
    return out;
  },{wins:0,losses:0,ties:0});
}
function nflPlayoffRaceRecordText_(record){return [record.wins||0,record.losses||0,record.ties||0].join("-");}
function nflPlayoffRaceGameResultsFromWeekly_(weeklyRows,miniGameNumber){
  const rows=(weeklyRows||[]).filter(function(row){return Number(row.miniGameNumber)===Number(miniGameNumber);});
  const users={};rows.forEach(function(row){const id=nflPlayoffRaceKey_(row.username);if(!users[id])users[id]=[];users[id].push(row);});
  const out=Object.keys(users).map(function(id){
    const list=users[id],record=nflPlayoffRaceAggregateRecord_(list),games=record.wins+record.losses+record.ties;
    return {username:list[0].username,miniGameNumber:Number(miniGameNumber),wins:record.wins,losses:record.losses,ties:record.ties,
      winPct:games?(record.wins+record.ties*.5)/games:0,
      raceScoreTotal:list.reduce(function(sum,row){return sum+nflPlayoffRaceNumber_(row.raceScore,0);},0),
      exactSeedCount:list.reduce(function(sum,row){return sum+nflPlayoffRaceNumber_(row.exactSeedCount,0);},0),
      divisionSweepBonus:list.reduce(function(sum,row){return sum+nflPlayoffRaceNumber_(row.divisionSweepBonus,0);},0)};
  });
  out.sort(function(a,b){return b.winPct-a.winPct||b.raceScoreTotal-a.raceScoreTotal||b.exactSeedCount-a.exactSeedCount||b.divisionSweepBonus-a.divisionSweepBonus||nflPlayoffRaceKey_(a.username).localeCompare(nflPlayoffRaceKey_(b.username));});
  let last="",rank=0;out.forEach(function(row,index){const sig=[row.winPct,row.raceScoreTotal,row.exactSeedCount,row.divisionSweepBonus].join("|");if(sig!==last)rank=index+1;last=sig;row.placement=rank;});
  return out;
}
function nflPlayoffRaceEnsureWeeklyScoreSheet_(){
  const ss=SpreadsheetApp.getActive();let sh=ss.getSheetByName(NFL_PLAYOFF_RACE_WEEKLY_SCORE_SHEET_);
  if(!sh)sh=ss.insertSheet(NFL_PLAYOFF_RACE_WEEKLY_SCORE_SHEET_);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,NFL_PLAYOFF_RACE_WEEKLY_SCORE_HEADERS_.length).setValues([NFL_PLAYOFF_RACE_WEEKLY_SCORE_HEADERS_]);sh.setFrozenRows(1);}
  return sh;
}
function nflPlayoffRaceReadWeeklyScores_(gameId,username){
  const sh=SpreadsheetApp.getActive().getSheetByName(NFL_PLAYOFF_RACE_WEEKLY_SCORE_SHEET_);
  if(!sh||sh.getLastRow()<=1)return [];
  const data=sh.getDataRange().getValues(),headers=data[0].map(nflPlayoffRaceString_),col=nflPlayoffRaceHeaderMap_(headers);
  return data.slice(1).map(function(row){
    let detail={};try{detail=JSON.parse(row[col.scoringdetailjson]||"{}");}catch(err){}
    return {gameId:nflPlayoffRaceString_(row[col.gameid]),username:nflPlayoffRaceString_(row[col.username]),nflWeek:Number(row[col.nflweek])||0,
      miniGameNumber:Number(row[col.minigamenumber])||0,quarterNumber:Number(row[col.quarternumber])||0,forecastId:nflPlayoffRaceString_(row[col.forecastid]),
      raceScore:nflPlayoffRaceNumber_(row[col.racescore],0),previousRaceScore:nflPlayoffRaceNumber_(row[col.previousracescore],0),scoreDelta:nflPlayoffRaceNumber_(row[col.scoredelta],0),
      weeklyPlacement:Number(row[col.weeklyplacement])||0,wins:Number(row[col.wins])||0,losses:Number(row[col.losses])||0,ties:Number(row[col.ties])||0,
      exactSeedCount:Number(row[col.exactseedcount])||0,divisionSweepCount:Number(row[col.divisionsweepcount])||0,divisionSweepBonus:nflPlayoffRaceNumber_(row[col.divisionsweepbonus],0),
      perfectSeedBonus:nflPlayoffRaceNumber_(row[col.perfectseedbonus],0),detail:detail,finalizedAt:nflPlayoffRaceString_(row[col.finalizedat])};
  }).filter(function(row){return (!gameId||row.gameId===gameId)&&(!username||nflPlayoffRaceKey_(row.username)===nflPlayoffRaceKey_(username));})
    .sort(function(a,b){return a.nflWeek-b.nflWeek;});
}
function nflPlayoffRacePersistWeeklyRows_(gameId,week,rows,repair){
  const sh=nflPlayoffRaceEnsureWeeklyScoreSheet_(),data=sh.getDataRange().getValues(),headers=data[0].map(nflPlayoffRaceString_),col=nflPlayoffRaceHeaderMap_(headers);
  const existing={};for(let i=1;i<data.length;i++){if(nflPlayoffRaceString_(data[i][col.gameid])===gameId&&Number(data[i][col.nflweek])===week)existing[nflPlayoffRaceKey_(data[i][col.username])]=i+1;}
  if(Object.keys(existing).length&&!repair)return {written:0,skipped:true};
  let written=0;
  (rows||[]).forEach(function(row){
    const values={GameId:gameId,Username:row.username,NFLWeek:week,MiniGameNumber:row.miniGameNumber,QuarterNumber:row.quarterNumber,ForecastId:row.forecastId,
      RaceScore:row.raceScore,PreviousRaceScore:row.previousRaceScore,ScoreDelta:row.scoreDelta,WeeklyPlacement:row.weeklyPlacement,Wins:row.wins,Losses:row.losses,Ties:row.ties,
      ExactSeedCount:row.exactSeedCount,DivisionSweepCount:row.divisionSweepCount,DivisionSweepBonus:row.divisionSweepBonus,PerfectSeedBonus:row.perfectSeedBonus,
      ScoringDetailJSON:JSON.stringify(row.detail||{}),FinalizedAt:row.finalizedAt};
    const arr=headers.map(function(h){return values[h]===undefined?"":values[h];}),rowNum=existing[nflPlayoffRaceKey_(row.username)];
    if(rowNum)sh.getRange(rowNum,1,1,headers.length).setValues([arr]);else sh.appendRow(arr);written++;
  });
  return {written:written,skipped:false};
}
function nflPlayoffRaceEnsureGameResultSheet_(){
  const ss=SpreadsheetApp.getActive();let sh=ss.getSheetByName(NFL_PLAYOFF_RACE_GAME_RESULT_SHEET_);
  if(!sh)sh=ss.insertSheet(NFL_PLAYOFF_RACE_GAME_RESULT_SHEET_);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,NFL_PLAYOFF_RACE_GAME_RESULT_HEADERS_.length).setValues([NFL_PLAYOFF_RACE_GAME_RESULT_HEADERS_]);sh.setFrozenRows(1);}
  return sh;
}
function nflPlayoffRaceReadGameResults_(gameId,username){
  const sh=SpreadsheetApp.getActive().getSheetByName(NFL_PLAYOFF_RACE_GAME_RESULT_SHEET_);
  if(!sh||sh.getLastRow()<=1)return [];
  const data=sh.getDataRange().getValues(),headers=data[0].map(nflPlayoffRaceString_),col=nflPlayoffRaceHeaderMap_(headers);
  return data.slice(1).map(function(row){let detail={};try{detail=JSON.parse(row[col.detailjson]||"{}");}catch(err){}
    return {gameId:nflPlayoffRaceString_(row[col.gameid]),username:nflPlayoffRaceString_(row[col.username]),miniGameNumber:Number(row[col.minigamenumber])||0,throughWeek:Number(row[col.throughweek])||0,
      wins:Number(row[col.wins])||0,losses:Number(row[col.losses])||0,ties:Number(row[col.ties])||0,winPct:nflPlayoffRaceNumber_(row[col.winpct],0),raceScoreTotal:nflPlayoffRaceNumber_(row[col.racescoretotal],0),
      exactSeedCount:Number(row[col.exactseedcount])||0,divisionSweepBonus:nflPlayoffRaceNumber_(row[col.divisionsweepbonus],0),placement:Number(row[col.placement])||0,detail:detail,finalizedAt:nflPlayoffRaceString_(row[col.finalizedat])};
  }).filter(function(row){return (!gameId||row.gameId===gameId)&&(!username||nflPlayoffRaceKey_(row.username)===nflPlayoffRaceKey_(username));});
}
function nflPlayoffRacePersistGameResults_(gameId,miniGameNumber,rows,repair){
  const sh=nflPlayoffRaceEnsureGameResultSheet_(),data=sh.getDataRange().getValues(),headers=data[0].map(nflPlayoffRaceString_),col=nflPlayoffRaceHeaderMap_(headers);
  const existing={};for(let i=1;i<data.length;i++){if(nflPlayoffRaceString_(data[i][col.gameid])===gameId&&Number(data[i][col.minigamenumber])===miniGameNumber)existing[nflPlayoffRaceKey_(data[i][col.username])]=i+1;}
  if(Object.keys(existing).length&&!repair)return {written:0,skipped:true};
  const throughWeek=miniGameNumber*4,now=new Date().toISOString();let written=0;
  rows.forEach(function(row){const values={GameId:gameId,Username:row.username,MiniGameNumber:miniGameNumber,ThroughWeek:throughWeek,Wins:row.wins,Losses:row.losses,Ties:row.ties,WinPct:row.winPct,
    RaceScoreTotal:row.raceScoreTotal,ExactSeedCount:row.exactSeedCount,DivisionSweepBonus:row.divisionSweepBonus,Placement:row.placement,DetailJSON:JSON.stringify(row),FinalizedAt:now};
    const arr=headers.map(function(h){return values[h]===undefined?"":values[h];}),rowNum=existing[nflPlayoffRaceKey_(row.username)];
    if(rowNum)sh.getRange(rowNum,1,1,headers.length).setValues([arr]);else sh.appendRow(arr);written++;});
  return {written:written,skipped:false};
}
function apiAdminFinalizeNflPlayoffRaceWeek_(payload){
  payload=payload||{};if(typeof requireAdmin_==="function")requireAdmin_(payload);
  const gameId=nflPlayoffRaceString_(payload.gameId),week=Math.max(1,Math.min(18,Math.floor(nflPlayoffRaceNumber_(payload.week,0)))),repair=payload.repair===true;
  if(!nflPlayoffRaceIsGame_(gameId)||!week)throw new Error("Playoff Race GameId and NFL week are required.");
  const existing=nflPlayoffRaceReadWeeklyScores_(gameId).filter(function(row){return row.nflWeek===week;});
  if(existing.length&&!repair)return {success:true,alreadyFinalized:true,week:week,rows:existing};
  const context=nflPlayoffRaceRequestContext_(gameId),standings=nflPlayoffRaceStandingsAtWeek_(gameId,week,context);
  if(!standings)throw new Error("NFL Week "+week+" is not fully final yet.");
  const allSnapshots=nflPlayoffRaceReadSnapshots_(gameId),byUser={};
  allSnapshots.forEach(function(row){const u=nflPlayoffRaceKey_(row.username);if(!byUser[u])byUser[u]={username:row.username,rows:[]};byUser[u].rows.push(row);});
  const config=nflPlayoffRaceScoringConfig_(gameId),previous=nflPlayoffRaceReadWeeklyScores_(gameId),mapped=nflPlayoffRaceQuarterForWeek_(week);
  const scored=[];
  Object.keys(byUser).forEach(function(u){const user=byUser[u],parts=[],ids=["afc-playoff-seeds","nfc-playoff-seeds"];
    ids.forEach(function(categoryId){const snap=nflPlayoffRaceSnapshotForWeek_(user.rows,categoryId,week),conf=categoryId.indexOf("afc-")===0?"AFC":"NFC";if(snap){const part=nflPlayoffRaceRaceScoreForCategory_(categoryId,snap,standings.current[conf],config);if(part)parts.push(part);}});
    if(parts.length!==2)return;
    const prevRows=previous.filter(function(row){return nflPlayoffRaceKey_(row.username)===u&&row.nflWeek<week;}),prev=prevRows.length?prevRows[prevRows.length-1].raceScore:0;
    const score=parts.reduce(function(sum,p){return sum+p.raceScore;},0);
    scored.push({username:user.username,nflWeek:week,miniGameNumber:mapped.miniGameNumber,quarterNumber:mapped.quarterNumber,forecastId:parts.map(function(p){return p.forecastId;}).join("|"),
      raceScore:Math.round(score*100)/100,previousRaceScore:prev,scoreDelta:Math.round((score-prev)*100)/100,
      exactSeedCount:parts.reduce(function(s,p){return s+p.exactSeedCount;},0),divisionSweepCount:parts.reduce(function(s,p){return s+p.divisionSweepCount;},0),
      divisionSweepBonus:parts.reduce(function(s,p){return s+p.divisionSweepBonus;},0),perfectSeedBonus:parts.reduce(function(s,p){return s+p.perfectSeedBonus;},0),
      detail:{conferences:parts},finalizedAt:new Date().toISOString()});
  });
  const allPlay=nflPlayoffRaceAllPlay_(scored);nflPlayoffRacePersistWeeklyRows_(gameId,week,allPlay,repair);
  let gameResult=null;if(week<=16&&week%4===0){const history=nflPlayoffRaceReadWeeklyScores_(gameId);const summaries=nflPlayoffRaceGameResultsFromWeekly_(history,mapped.miniGameNumber);gameResult=nflPlayoffRacePersistGameResults_(gameId,mapped.miniGameNumber,summaries,repair);}
  return {success:true,week:week,miniGameNumber:mapped.miniGameNumber,quarterNumber:mapped.quarterNumber,rows:allPlay,gameResult:gameResult,
    performance:{weekScheduleFetches:context.weekScheduleFetches,weekScheduleCacheHits:context.weekScheduleCacheHits}};
}
function nflPlayoffRaceCompetitionState_(gameId,username,currentWeek){
  const weekly=nflPlayoffRaceReadWeeklyScores_(gameId,username),games=nflPlayoffRaceReadGameResults_(gameId,username),map=nflPlayoffRaceQuarterForWeek_(currentWeek);
  const latest=weekly.length?weekly[weekly.length-1]:null;
  const currentGame=map.miniGameNumber||4,currentRows=weekly.filter(function(row){return row.miniGameNumber===currentGame;}),gameRecord=nflPlayoffRaceAggregateRecord_(currentRows);
  const seasonRows=weekly.filter(function(row){return row.nflWeek<=16;}),seasonRecord=nflPlayoffRaceAggregateRecord_(seasonRows);
  const stages=[1,2,3,4].map(function(n){const final=games.find(function(row){return row.miniGameNumber===n;}),rows=weekly.filter(function(row){return row.miniGameNumber===n;});
    if(final)return {kind:"game",gameNumber:n,status:"FINAL",record:nflPlayoffRaceRecordText_(final),placement:final.placement,detail:rows};
    if(n===currentGame&&map.phase==="regular")return {kind:"game",gameNumber:n,status:"Q"+map.quarterNumber,record:nflPlayoffRaceRecordText_(nflPlayoffRaceAggregateRecord_(rows)),placement:latest&&latest.miniGameNumber===n?latest.weeklyPlacement:0,detail:rows};
    return {kind:"game",gameNumber:n,status:"UPCOMING",record:"0-0-0",placement:0,detail:rows};});
  stages.push({kind:"final",status:"PLAYOFFS"});
  return {phase:map.phase,gameNumber:map.miniGameNumber,quarterNumber:map.quarterNumber,nflWeek:map.week,
    latestWeek:latest?latest.nflWeek:0,raceScore:latest?latest.raceScore:0,scoreDelta:latest?latest.scoreDelta:0,weeklyPlacement:latest?latest.weeklyPlacement:0,
    weeklyFieldSize:latest?latest.wins+latest.losses+latest.ties+1:0,weeklyRecord:latest?nflPlayoffRaceRecordText_(latest):"0-0-0",
    gameRecord:nflPlayoffRaceRecordText_(gameRecord),seasonRecord:nflPlayoffRaceRecordText_(seasonRecord),stages:stages,history:weekly};
}
function nflPlayoffRaceCupEvents_(gameId){
  const results=nflPlayoffRaceReadGameResults_(gameId),events=[1,2,3,4].map(function(n){
    const rows=results.filter(function(row){return row.miniGameNumber===n;});
    return {eventId:gameId+"-game-"+n,gameId:gameId,eventType:"placement",name:"Playoff Race Game "+n,status:rows.length?"final":"pending",
      results:rows.map(function(row){return {username:row.username,placementRank:row.placement,rawScore:row.raceScoreTotal,record:nflPlayoffRaceRecordText_(row)};})};
  });
  let finalRows=[];const game=typeof getGame==="function"?getGame(gameId):null;
  if(game&&game.resultsFinalized===true&&typeof rankingLeaderboardData_==="function"){
    const board=rankingLeaderboardData_(gameId);finalRows=(board&&board.rows||[]).map(function(row,index){return {username:row.username||row.user,placementRank:index+1,rawScore:Number(row.total)||0};});
  }
  events.push({eventId:gameId+"-final",gameId:gameId,eventType:"placement",name:"Playoff Race Final",status:finalRows.length?"final":"pending",results:finalRows});
  return events;
}

function nflPlayoffRaceCheckpointScore_(rankings,standingsRows){
  const standings=nflPlayoffRaceStandingsMap_(standingsRows||[]);
  let exactSeedPoints=0,nearSeedPoints=0,playoffFieldPoints=0;
  (rankings||[]).forEach(function(row){
    const current=standings[nflPlayoffRaceKey_(row&&row.nomineeId)];
    const predicted=Math.floor(nflPlayoffRaceNumber_(row&&row.rank,0));
    const actual=current?Math.floor(nflPlayoffRaceNumber_(current.rank,0)):0;
    if(!predicted||!actual)return;
    const diff=Math.abs(predicted-actual);
    if(diff===0)exactSeedPoints+=3;
    else if(diff===1)nearSeedPoints+=1;
    if(predicted<=NFL_PLAYOFF_RACE_FIELD_SIZE_&&actual<=NFL_PLAYOFF_RACE_FIELD_SIZE_)playoffFieldPoints+=1;
  });
  return {exactSeedPoints:exactSeedPoints,nearSeedPoints:nearSeedPoints,playoffFieldPoints:playoffFieldPoints,total:exactSeedPoints+nearSeedPoints+playoffFieldPoints};
}
function nflPlayoffRaceCheckpointKey_(gameId,username,categoryId,week){
  return [nflPlayoffRaceString_(gameId),nflPlayoffRaceKey_(username),nflPlayoffRaceKey_(categoryId),Math.floor(Number(week)||0)].join("|");
}
function nflPlayoffRaceEnsureCheckpointScoreSheet_(){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_SHEET_);
  if(!sh)sh=ss.insertSheet(NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_SHEET_);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_HEADERS_.length).setValues([NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_HEADERS_]);sh.setFrozenRows(1);}
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
  const missing=NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_HEADERS_.filter(function(h){return headers.indexOf(h)===-1;});
  if(missing.length)sh.getRange(1,headers.length+1,1,missing.length).setValues([missing]);
  return sh;
}
function nflPlayoffRaceReadCheckpointScores_(gameId,username){
  const sh=SpreadsheetApp.getActive().getSheetByName(NFL_PLAYOFF_RACE_CHECKPOINT_SCORE_SHEET_);
  if(!sh||sh.getLastRow()<=1)return [];
  const data=sh.getDataRange().getValues(),headers=data[0].map(nflPlayoffRaceString_),col=nflPlayoffRaceHeaderMap_(headers);
  return data.slice(1).map(function(row){
    return {
      gameId:nflPlayoffRaceString_(row[col.gameid]),username:nflPlayoffRaceString_(row[col.username]),categoryId:nflPlayoffRaceKey_(row[col.categoryid]),
      checkpointWeek:Math.floor(nflPlayoffRaceNumber_(row[col.checkpointweek],0)),forecastId:nflPlayoffRaceString_(row[col.forecastid]),
      exactSeedPoints:nflPlayoffRaceNumber_(row[col.exactseedpoints],0),nearSeedPoints:nflPlayoffRaceNumber_(row[col.nearseedpoints],0),
      playoffFieldPoints:nflPlayoffRaceNumber_(row[col.playofffieldpoints],0),total:nflPlayoffRaceNumber_(row[col.totalpoints],0),
      awardedAt:nflPlayoffRaceString_(row[col.awardedat])
    };
  }).filter(function(row){return (!gameId||row.gameId===gameId)&&(!username||nflPlayoffRaceKey_(row.username)===nflPlayoffRaceKey_(username));});
}
function nflPlayoffRaceBankCheckpoint_(award){
  const lock=(LockService.getDocumentLock&&LockService.getDocumentLock())||LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const existing=nflPlayoffRaceReadCheckpointScores_(award.gameId,award.username).find(function(row){
      return nflPlayoffRaceCheckpointKey_(row.gameId,row.username,row.categoryId,row.checkpointWeek)===nflPlayoffRaceCheckpointKey_(award.gameId,award.username,award.categoryId,award.checkpointWeek);
    });
    if(existing)return Object.assign({banked:false},existing);
    const sh=nflPlayoffRaceEnsureCheckpointScoreSheet_(),headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
    const values={GameId:award.gameId,Username:award.username,CategoryId:award.categoryId,CheckpointWeek:award.checkpointWeek,ForecastId:award.forecastId,
      ExactSeedPoints:award.exactSeedPoints,NearSeedPoints:award.nearSeedPoints,PlayoffFieldPoints:award.playoffFieldPoints,TotalPoints:award.total,AwardedAt:new Date().toISOString()};
    sh.appendRow(headers.map(function(h){return values[h]===undefined?"":values[h];}));
    return Object.assign({banked:true,awardedAt:values.AwardedAt},award);
  }finally{lock.releaseLock();}
}
function nflPlayoffRaceSnapshotAtCheckpoint_(rows,categoryId,checkpointWeek){
  const list=nflPlayoffRaceCategorySnapshots_(rows,categoryId).filter(function(row){
    return Math.floor(nflPlayoffRaceNumber_(row.effectiveWeek,0))<checkpointWeek;
  });
  return list.length?list[list.length-1]:null;
}
function nflPlayoffRaceBankDueCheckpoints_(gameId,username,rows,timing,requestContext){
  if(!timing||!timing.currentWeek)return nflPlayoffRaceReadCheckpointScores_(gameId,username);
  const context=requestContext||nflPlayoffRaceRequestContext_(gameId);
  const categories=rankingGameCategories_(gameId)||[];
  NFL_PLAYOFF_RACE_CHECKPOINT_WEEKS_.forEach(function(checkpointWeek){
    if(timing.currentWeek<checkpointWeek)return;
    const standings=nflPlayoffRaceStandingsAtWeek_(gameId,checkpointWeek-1,context);
    if(!standings)return;
    categories.forEach(function(category){
      const categoryId=nflPlayoffRaceKey_(category.id);
      const snapshot=nflPlayoffRaceSnapshotAtCheckpoint_(rows,categoryId,checkpointWeek);
      if(!snapshot)return;
      const conf=categoryId.indexOf("afc-")===0?"AFC":categoryId.indexOf("nfc-")===0?"NFC":"";
      if(!conf)return;
      const score=nflPlayoffRaceCheckpointScore_(nflPlayoffRaceSnapshotRankings_(snapshot),standings.current[conf]||[]);
      nflPlayoffRaceBankCheckpoint_(Object.assign({gameId:gameId,username:username,categoryId:categoryId,checkpointWeek:checkpointWeek,forecastId:snapshot.forecastId},score));
    });
  });
  return nflPlayoffRaceReadCheckpointScores_(gameId,username);
}
function nflPlayoffRaceCheckpointSummary_(rows){
  const out={exactSeedPoints:0,nearSeedPoints:0,playoffFieldPoints:0,total:0,byWeek:[]};
  (rows||[]).forEach(function(row){
    out.exactSeedPoints+=nflPlayoffRaceNumber_(row.exactSeedPoints,0);out.nearSeedPoints+=nflPlayoffRaceNumber_(row.nearSeedPoints,0);
    out.playoffFieldPoints+=nflPlayoffRaceNumber_(row.playoffFieldPoints,0);out.total+=nflPlayoffRaceNumber_(row.total,0);
  });
  NFL_PLAYOFF_RACE_CHECKPOINT_WEEKS_.forEach(function(week){
    const list=(rows||[]).filter(function(row){return row.checkpointWeek===week;});
    out.byWeek.push({week:week,banked:list.length>0,points:list.reduce(function(sum,row){return sum+nflPlayoffRaceNumber_(row.total,0);},0)});
  });
  return out;
}
function nflPlayoffRaceCheckpointTotalsForGame_(gameId){
  const totals={};nflPlayoffRaceReadCheckpointScores_(gameId).forEach(function(row){
    const user=nflPlayoffRaceKey_(row.username);totals[user]=(totals[user]||0)+nflPlayoffRaceNumber_(row.total,0);
  });return totals;
}
function nflPlayoffRaceOriginalHoldBonus_(history,finalRanks){
  const list=(history||[]).slice().sort(function(a,b){return String(a.submittedAt||"").localeCompare(String(b.submittedAt||""));});
  const original=list.find(function(row){return nflPlayoffRaceKey_(row.forecastType)==="original";});
  if(!original)return {count:0,total:0,maxBonus:0,eligibleTeams:[]};
  const originalRanks={};nflPlayoffRaceSnapshotRankings_(original).forEach(function(row){originalRanks[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  const later=list.filter(function(row){return row!==original;});
  const eligible=Object.keys(originalRanks).filter(function(team){
    return later.every(function(snapshot){
      const ranks={};nflPlayoffRaceSnapshotRankings_(snapshot).forEach(function(row){ranks[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
      return !Object.prototype.hasOwnProperty.call(ranks,team)||ranks[team]===originalRanks[team];
    });
  });
  const resolved=Object.keys(finalRanks||{}).length>=16;
  const winners=resolved?eligible.filter(function(team){return Number(finalRanks[team])===originalRanks[team];}):[];
  return {count:winners.length,total:winners.length*5,maxBonus:eligible.length*5,eligibleTeams:eligible};
}

function nflPlayoffRaceAdjustedTeamMultipliers_(previous,newRankings,roundMultiplier){
  const priorRankings=nflPlayoffRaceSnapshotRankings_(previous);
  const priorPositions={};
  priorRankings.forEach(function(row){priorPositions[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  const priorValues=nflPlayoffRaceSnapshotTeamMultipliers_(previous);
  const round=Math.max(0,Math.min(1,nflPlayoffRaceNumber_(roundMultiplier,1)));
  const result={};
  (newRankings||[]).forEach(function(row){
    const team=nflPlayoffRaceKey_(row.nomineeId);
    if(!team)return;
    const old=Object.prototype.hasOwnProperty.call(priorValues,team)?priorValues[team]:round;
    result[team]=Number(row.rank)===priorPositions[team]?old:Math.min(old,round);
  });
  return result;
}
function nflPlayoffRaceWeightedScore_(category,ballot,finalRanks,snapshot,history,scoringConfig){
  const nominees=(category&&category.nominees||[]).filter(function(row){return row&&row.id;});
  const valid=typeof rankingBallotValid_==="function"&&rankingBallotValid_(category,ballot);
  const resolved=typeof rankingFinalOrderComplete_==="function"&&rankingFinalOrderComplete_(category,finalRanks||{});
  const values=nflPlayoffRaceSnapshotTeamMultipliers_(snapshot);
  const fallback=snapshot?Math.max(0,Math.min(1,nflPlayoffRaceNumber_(snapshot.multiplier,1))):1;
  const ranks={};
  (ballot||[]).forEach(function(row){ranks[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  let max=0,earned=0,exactCount=0,baseEarned=0;
  const finalUnitMax=20;
  const playoff=/playoff-seeds/.test(nflPlayoffRaceKey_(category&&category.id));
  const top=[];let correctPlayoffTeams=0,bonus=0,bonusMax=0;
  nominees.forEach(function(nominee){
    const id=nflPlayoffRaceKey_(nominee.id);
    const pct=Object.prototype.hasOwnProperty.call(values,id)?values[id]:fallback;
    if(valid)max+=finalUnitMax*pct;
    const predicted=ranks[id],actual=Number(finalRanks&&finalRanks[id])||0;
    if(valid&&resolved&&predicted>0&&actual>0){
      const points=nflPlayoffRacePositionPoints_(predicted,actual);
      earned+=points*pct;baseEarned+=points;
      if(predicted===actual)exactCount++;
    }
    if(valid&&playoff&&predicted>=1&&predicted<=7){
      top.push(pct);bonusMax+=3*pct;
      if(resolved&&actual>=1&&actual<=7){bonus+=3*pct;correctPlayoffTeams++;}
    }
  });
  if(valid&&playoff&&top.length===7){
    const perfect=5*Math.min.apply(Math,top);
    bonusMax+=perfect;
    if(resolved&&correctPlayoffTeams===7)bonus+=perfect;
  }
  const config=scoringConfig||{divisionSweepBonus:NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_,perfectSeedsBonus:NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_};
  let divisionSweep={count:0,bonus:0},perfectSeedsBonus=0;
  if(valid&&resolved&&playoff){
    divisionSweep=nflPlayoffRaceDivisionSweepBonus_(category&&category.id,ballot,finalRanks,snapshot,config);
    perfectSeedsBonus=nflPlayoffRacePerfectSeedsBonus_(ballot,finalRanks,snapshot,config);
    bonus+=divisionSweep.bonus+perfectSeedsBonus;
  }
  bonusMax+=4*Math.max(0,nflPlayoffRaceNumber_(config.divisionSweepBonus,NFL_PLAYOFF_RACE_DIVISION_SWEEP_BONUS_DEFAULT_))+Math.max(0,nflPlayoffRaceNumber_(config.perfectSeedsBonus,NFL_PLAYOFF_RACE_PERFECT_SEEDS_BONUS_DEFAULT_));
  if(valid&&resolved)baseEarned+=playoff?(correctPlayoffTeams*3+(correctPlayoffTeams===7?5:0)+divisionSweep.bonus+perfectSeedsBonus):0;
  const hold=valid?nflPlayoffRaceOriginalHoldBonus_(history||[],finalRanks||{}):{count:0,total:0,maxBonus:0,eligibleTeams:[]};
  if(valid&&resolved)baseEarned+=hold.total;
  const round=function(v){return Math.round(v*100)/100;};
  return {
    earnedPoints:round(resolved&&valid?earned+bonus+hold.total:0),
    remainingPoints:round(!resolved&&valid?max+bonusMax+hold.maxBonus:0),
    finalPointsAvailable:round(valid?max+bonusMax+hold.maxBonus:0),
    baseEarnedPoints:round(baseEarned),
    finalForecastPoints:round(resolved&&valid?earned:0),
    playoffFieldBonus:round(resolved?bonus-divisionSweep.bonus-perfectSeedsBonus:0),
    divisionSweepBonus:round(resolved?divisionSweep.bonus:0),divisionSweepCount:divisionSweep.count,
    perfectSeedsBonus:round(resolved?perfectSeedsBonus:0),
    originalHoldBonus:round(resolved?hold.total:0),
    originalHoldCount:hold.count,
    bonusPoints:round(resolved?bonus+hold.total:0),bonusMax:round(bonusMax+hold.maxBonus),
    exactCount:exactCount,resolved:resolved,validBallot:valid,
    correctPlayoffTeams:correctPlayoffTeams,teamMultipliers:values
  };
}
function nflPlayoffRaceInitialMultiplier_(gameId,week,seasonStarted){
  // The 2026 event starts at Week 3, at full value. Other seasons retain legacy policy.
  if(/-2026$/.test(String(gameId||""))){
    if(!seasonStarted||week<=3)return 1;
    return Math.max(.5,Math.round((1-(week-3)*.05)*100)/100);
  }
  return nflPlayoffRaceLateEntryMultiplier_(week,seasonStarted);
}

/* Draft rows are independent of RankingEntries and NflForecastSnapshots. A saved
   Draft has no scoring status and does not create an original prediction. */
const NFL_PLAYOFF_RACE_DRAFT_SHEET_R3_="NflForecastDrafts";
const NFL_PLAYOFF_RACE_DRAFT_HEADERS_R3_=["GameId","Username","CategoryId","RankingsJSON","UpdatedAt"];
function nflPlayoffRaceDraftSheetR3_(){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(NFL_PLAYOFF_RACE_DRAFT_SHEET_R3_);
  if(!sh)sh=ss.insertSheet(NFL_PLAYOFF_RACE_DRAFT_SHEET_R3_);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,NFL_PLAYOFF_RACE_DRAFT_HEADERS_R3_.length).setValues([NFL_PLAYOFF_RACE_DRAFT_HEADERS_R3_]);sh.setFrozenRows(1);}
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
  if(NFL_PLAYOFF_RACE_DRAFT_HEADERS_R3_.some(function(h){return headers.indexOf(h)===-1;}))throw new Error("Invalid NflForecastDrafts columns.");
  return sh;
}
function nflPlayoffRaceDraftRowsR3_(gameId,username){
  // Reading Drafts must not create a Sheet as an unintended side effect.
  const sh=SpreadsheetApp.getActive().getSheetByName(NFL_PLAYOFF_RACE_DRAFT_SHEET_R3_);
  if(!sh||sh.getLastRow()<=1)return [];
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
  const map=nflPlayoffRaceHeaderMap_(headers);
  return sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues().map(function(row,i){
    let rankings=[];try{rankings=JSON.parse(row[map.rankingsjson]||"[]");}catch(err){}
    return {rowNumber:i+2,gameId:nflPlayoffRaceString_(row[map.gameid]),username:nflPlayoffRaceString_(row[map.username]),categoryId:nflPlayoffRaceKey_(row[map.categoryid]),rankings:rankings,updatedAt:nflPlayoffRaceString_(row[map.updatedat])};
  }).filter(function(row){return row.gameId===gameId&&nflPlayoffRaceKey_(row.username)===nflPlayoffRaceKey_(username);});
}
// The dated preseason Ranking lock is not the Playoff Race update-window rule.
// Respect explicit admin/game locks; the Race timing state governs entry and updates.
function nflPlayoffRaceStaticLockedR3_(game,category){
  if(!game||!category)return true;
  const status=nflPlayoffRaceKey_(game.status||game.gameStatus);
  const explicitCategoryLock=category.locked===true&&!nflPlayoffRaceString_(category.lockDateTime||category.LockDateTime);
  return game.lockAllPicks===true||game.votingLocked===true||game.resultsFinalized===true||
    explicitCategoryLock||category.resolved===true||
    status==="archived"||status==="archive";
}

function nflPlayoffRaceStaticLockReasonR3_(game,category){
  if(!game||!category)return "Game or conference entry is unavailable.";
  const status=nflPlayoffRaceKey_(game.status||game.gameStatus);
  if(game.lockAllPicks===true)return "Game-wide admin lock is enabled.";
  if(game.votingLocked===true)return "Game voting/entry lock is enabled.";
  if(game.resultsFinalized===true)return "Game results are finalized.";
  if(category.resolved===true)return "This conference is resolved/final.";
  if(category.locked===true&&!nflPlayoffRaceString_(category.lockDateTime||category.LockDateTime))return "This conference was manually locked by the admin.";
  if(status==="archived"||status==="archive")return "This game is archived.";
  return "";
}
function nflPlayoffRaceSaveDraftR3_(payload){
  const gameId=nflPlayoffRaceString_(payload&&payload.gameId),username=nflPlayoffRaceString_(payload&&payload.username);
  const categoryId=nflPlayoffRaceKey_(payload&&payload.categoryId),rankings=payload&&payload.rankings;
  if(!nflPlayoffRaceIsGame_(gameId)||!username)throw new Error("Invalid Playoff Race request.");
  const category=(rankingGameCategories_(gameId)||[]).find(function(row){return nflPlayoffRaceKey_(row.id)===categoryId;});
  if(!category)throw new Error("Playoff Race conference not found.");
  rankingValidateBallot_(category,rankings);
  const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId);
  if(nflPlayoffRaceStaticLockedR3_(game,category))throw new Error("Game or conference entry is closed.");
  const meta=nflPlayoffRaceMeta_(gameId,username);
  const existing=nflPlayoffRaceOriginalSnapshot_(meta.rows,categoryId);
  if(existing&&!meta.canUpdate)throw new Error(meta.lockReason||"Adjustment window is closed.");
  if(!existing&&!meta.canEnter)throw new Error(meta.lockReason||"Original entry is closed.");
  const lock=(LockService.getDocumentLock&&LockService.getDocumentLock())||LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const sh=nflPlayoffRaceDraftSheetR3_(),rows=nflPlayoffRaceDraftRowsR3_(gameId,username);
    const prior=rows.find(function(row){return row.categoryId===categoryId;});
    const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(nflPlayoffRaceString_);
    const values={GameId:gameId,Username:username,CategoryId:categoryId,RankingsJSON:JSON.stringify(rankings),UpdatedAt:new Date().toISOString()};
    const row=headers.map(function(h){return values[h]===undefined?"":values[h];});
    if(prior)sh.getRange(prior.rowNumber,1,1,row.length).setValues([row]);else sh.appendRow(row);
    return {success:true,draftSaved:true,categoryId:categoryId,updatedAt:values.UpdatedAt};
  }finally{lock.releaseLock();}
}
function nflPlayoffRaceClearDraftR3_(gameId,username,categoryId){
  const sh=nflPlayoffRaceDraftSheetR3_();
  nflPlayoffRaceDraftRowsR3_(gameId,username).filter(function(row){return row.categoryId===categoryId;}).sort(function(a,b){return b.rowNumber-a.rowNumber;}).forEach(function(row){sh.deleteRow(row.rowNumber);});
}
function nflPlayoffRaceFinalizeR3_(payload){
  if(!payload||payload.confirmed!==true)throw new Error("Confirm the forecast and its team multipliers before finalizing.");
  const gameId=nflPlayoffRaceString_(payload.gameId),username=nflPlayoffRaceString_(payload.username);
  const categoryId=nflPlayoffRaceKey_(payload.categoryId),rankings=payload.rankings;
  const category=(rankingGameCategories_(gameId)||[]).find(function(row){return nflPlayoffRaceKey_(row.id)===categoryId;});
  if(!category)throw new Error("Playoff Race conference not found.");
  rankingValidateBallot_(category,rankings);
  const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId);
  if(nflPlayoffRaceStaticLockedR3_(game,category))throw new Error("Game or conference entry is closed.");
  const result=saveNflPlayoffRaceRanking_(payload);
  if(!result||result.success===false)return result;
  try{nflPlayoffRaceClearDraftR3_(gameId,username,categoryId);}
  catch(err){return Object.assign({},result,{finalized:true,draftCleanupPending:true});}
  return Object.assign({},result,{finalized:true});
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
      multiplier:1,
      rankings:ballots[categoryId],submittedAt:new Date().toISOString(),
      source:"legacy-ranking-migration"
    });
    rows=nflPlayoffRaceReadSnapshots_(gameId,username);
  });
  return rows;
}

function nflPlayoffRaceLiveGame_(game){
  if(!game)return false;
  const status=nflPlayoffRaceKey_(game.status||game.gameStatus);
  return game.active===true&&game.archived!==true&&["draft","setup","unpublished"].indexOf(status)===-1;
}

function nflPlayoffRaceMeta_(gameId,username,requestContext,gameConfig){
  const context=requestContext||nflPlayoffRaceRequestContext_(gameId);
  const game=gameConfig||(typeof getGame==="function"?getGame(gameId):getGameRuntimeConfig(gameId));
  let timing=nflPlayoffRaceTiming_(gameId,context);
  const setupMode=!nflPlayoffRaceLiveGame_(game);
  if(setupMode)timing=Object.assign({},timing,{seasonStarted:false,currentWindow:null,nextWindow:{week:4,multiplier:nflPlayoffRaceCheckpointMultiplier_(4)}});
  const rows=nflPlayoffRaceMigrateLegacy_(gameId,username,timing);
  const categories=typeof rankingGameCategories_==="function"?rankingGameCategories_(gameId):[];
  const missingOriginal=categories.map(function(category){return nflPlayoffRaceKey_(category.id);}).filter(function(categoryId){
    return !nflPlayoffRaceOriginalSnapshot_(rows,categoryId);
  });
  const active=rows.filter(function(row){return row.isActive;});
  const currentMultiplier=setupMode?1:(active.length
    ?Math.min.apply(Math,active.map(function(row){return nflPlayoffRaceNumber_(row.multiplier,1);}))
    :nflPlayoffRaceInitialMultiplier_(gameId,timing.currentWeek,timing.seasonStarted));
  const canEnter=setupMode?missingOriginal.length>0:(missingOriginal.length>0&&(!timing.seasonStarted||timing.currentWeek<=NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_));
  const allOriginal=missingOriginal.length===0;
  const canUpdate=setupMode?allOriginal:(allOriginal&&!!timing.currentWindow);
  const saveMultiplier=setupMode?1:(canEnter?nflPlayoffRaceInitialMultiplier_(gameId,timing.currentWeek,timing.seasonStarted)
    :timing.currentWindow?timing.currentWindow.multiplier:currentMultiplier);
  let lockReason="";
  if(setupMode)lockReason="Setup / Original Forecast mode. NFL week timing does not reduce forecast value until this PATTC game is live.";
  else if(missingOriginal.length&&!canEnter)lockReason="New scoring forecasts closed after Week "+NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_+".";
  else if(allOriginal&&!timing.currentWindow&&timing.currentWeek>=15)lockReason="Final lock. The Week 15 update window has closed.";
  else if(allOriginal&&!timing.currentWindow)lockReason="Original Prediction saved. Updates open before Weeks 4, 8, 12 and 15 after the prior NFL week is final.";
  else if(timing.currentWindow)lockReason="Week "+timing.currentWindow.week+" update window is open until the first kickoff of Week "+timing.currentWindow.week+".";
  else lockReason="Complete your Original Prediction.";
  return {
    timing:timing,rows:rows,missingOriginal:missingOriginal,currentMultiplier:currentMultiplier,
    saveMultiplier:saveMultiplier,canEnter:canEnter,canUpdate:canUpdate,canEdit:canEnter||canUpdate,
    lockReason:lockReason,setupMode:setupMode,requestContext:context,game:game
  };
}

function apiGetNflPlayoffRaceState_(payload){
  payload=payload||{};
  const gameId=nflPlayoffRaceString_(payload.gameId);
  const username=nflPlayoffRaceString_(payload.username);
  if(!nflPlayoffRaceIsGame_(gameId))throw new Error("NFL Playoff Race game is required.");
  if(!username)throw new Error("Username is required.");
  const base=apiGetRankingState_({gameId:gameId,username:username});
  const requestContext=nflPlayoffRaceRequestContext_(gameId);
  const game=typeof getGame==="function"?getGame(gameId):getGameRuntimeConfig(gameId);
  const meta=nflPlayoffRaceMeta_(gameId,username,requestContext,game);
  const live=nflPlayoffRaceLiveStandings_(gameId,meta.timing.currentWeek,requestContext);
  const competition=nflPlayoffRaceCompetitionState_(gameId,username,meta.timing.currentWeek);
  const scoringConfig=nflPlayoffRaceScoringConfig_(gameId);
  const drafts=nflPlayoffRaceDraftRowsR3_(gameId,username);
  const rawCategories={};
  rankingGameCategories_(gameId).forEach(function(row){rawCategories[nflPlayoffRaceKey_(row.id)]=row;});
  base.categories=(base.categories||[]).map(function(category){
    const categoryId=nflPlayoffRaceKey_(category.id);
    const original=nflPlayoffRaceOriginalSnapshot_(meta.rows,categoryId);
    const active=nflPlayoffRaceActiveSnapshot_(meta.rows,categoryId);
    const draft=drafts.find(function(row){return row.categoryId===categoryId;});
    const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId);
    const sourceCategory=rawCategories[categoryId]||category;
    const staticReason=nflPlayoffRaceStaticLockReasonR3_(game,sourceCategory);
    const canEdit=!staticReason&&!category.resolved&&
      (original?meta.canUpdate:meta.canEnter);
    const multiplier=active?nflPlayoffRaceNumber_(active.multiplier,1):meta.saveMultiplier;
    const finalRanks={};
    (category.officialOrder||[]).forEach(function(row){finalRanks[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
    const finalBonus=nflPlayoffRaceBonusForBallot_(categoryId,category.ballot||[],finalRanks);
    const basePositionEarned=nflPlayoffRaceNumber_(category.earnedPoints,0);
    const basePositionRemaining=nflPlayoffRaceNumber_(category.remainingPoints,0);
    const weighted=active?nflPlayoffRaceWeightedScore_(
      Object.assign({},category,{points:nflPlayoffRaceNumber_(category.points,0)}),
      category.ballot||[],finalRanks,active,nflPlayoffRaceCategorySnapshots_(meta.rows,categoryId),scoringConfig):null;
    const baseEarned=basePositionEarned+(finalBonus.resolved?finalBonus.total:0);
    const baseRemaining=category.resolved?0:(basePositionRemaining+finalBonus.maxBonus);
    return Object.assign({},category,{
      points:weighted?weighted.finalPointsAvailable:nflPlayoffRaceNumber_(category.points,0)+finalBonus.maxBonus,
      basePositionPoints:nflPlayoffRaceNumber_(category.points,0),
      playoffBonusMax:finalBonus.maxBonus,
      locked:category.resolved||!!staticReason||!canEdit,
      canEdit:canEdit,
      lockReason:category.resolved?"This conference is resolved/final.":(staticReason||(!canEdit?meta.lockReason:"")),
      draftRankings:draft?draft.rankings:[],draftUpdatedAt:draft?draft.updatedAt:"",
      originalSnapshot:nflPlayoffRacePublicSnapshot_(original),
      activeSnapshot:(function(){const snap=nflPlayoffRacePublicSnapshot_(active);if(meta.setupMode&&snap){snap.multiplier=1;Object.keys(snap.teamMultipliers||{}).forEach(function(team){snap.teamMultipliers[team]=1;});}return snap;})(),
      forecastMultiplier:meta.setupMode?1:multiplier,
      finalizeMultiplier:meta.setupMode?1:(original?(meta.timing.currentWindow?meta.timing.currentWindow.multiplier:multiplier)
        :nflPlayoffRaceInitialMultiplier_(gameId,meta.timing.currentWeek,meta.timing.seasonStarted)),
      baseEarnedPoints:baseEarned,
      baseRemainingPoints:baseRemaining,
      playoffBonus:finalBonus,
      earnedPoints:weighted?weighted.earnedPoints:Math.round(baseEarned*multiplier*100)/100,
      remainingPoints:weighted?weighted.remainingPoints:Math.round(baseRemaining*multiplier*100)/100,
      teamMultipliers:meta.setupMode&&active?Object.fromEntries(nflPlayoffRaceSnapshotRankings_(active).map(function(row){return [nflPlayoffRaceKey_(row.nomineeId),1];})):active?nflPlayoffRaceSnapshotTeamMultipliers_(active):{},
      scoreBreakdown:weighted?{finalForecastPoints:weighted.finalForecastPoints,playoffFieldBonuses:weighted.playoffFieldBonus,divisionSweepBonus:weighted.divisionSweepBonus,perfectSeedsBonus:weighted.perfectSeedsBonus,originalHoldBonuses:weighted.originalHoldBonus}:null,
      liveStandings:nflPlayoffRaceLiveCategory_(category,active,live)
    });
  });
  base.nflPlayoffRace={
    currentWeek:meta.timing.currentWeek,weekSource:meta.timing.weekSource,seasonStarted:meta.timing.seasonStarted,
    setupMode:meta.setupMode,currentWindow:meta.timing.currentWindow,nextWindow:meta.timing.nextWindow,
    canEnter:meta.canEnter,canUpdate:meta.canUpdate,canEdit:meta.canEdit,
    currentMultiplier:meta.currentMultiplier,saveMultiplier:meta.saveMultiplier,
    finalLateEntryWeek:NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_,lockReason:meta.lockReason,
    timingSettings:meta.timing.settings,
    teamPlayoffBonus:NFL_PLAYOFF_RACE_TEAM_BONUS_,
    perfectFieldBonus:NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_,
    adjustmentSchedule:[
      {week:4,multiplier:0.95},{week:8,multiplier:0.85},
      {week:12,multiplier:0.65},{week:15,multiplier:0.40}
    ],
    competition:competition,
    scoringConfig:scoringConfig,
    legacyCheckpointScoringActive:false,
    performance:{requestScopedTiming:true,weekScheduleFetches:requestContext.weekScheduleFetches,weekScheduleCacheHits:requestContext.weekScheduleCacheHits},
    liveWeek:live.week,liveUpdatedAt:live.updatedAt,provisionalTiebreakers:live.provisionalTiebreakers,
    originalForecast:meta.rows.filter(function(row){return nflPlayoffRaceKey_(row.forecastType)==="original";}).map(nflPlayoffRacePublicSnapshot_),
    activeForecast:meta.rows.filter(function(row){return row.isActive;}).map(nflPlayoffRacePublicSnapshot_),
    history:meta.rows.map(nflPlayoffRacePublicSnapshot_)
  };
  const finalParts=(base.categories||[]).reduce(function(out,category){
    const row=category.scoreBreakdown||{};out.finalForecastPoints+=nflPlayoffRaceNumber_(row.finalForecastPoints,0);
    out.playoffFieldBonuses+=nflPlayoffRaceNumber_(row.playoffFieldBonuses,0);out.divisionSweepBonus+=nflPlayoffRaceNumber_(row.divisionSweepBonus,0);
    out.perfectSeedsBonus+=nflPlayoffRaceNumber_(row.perfectSeedsBonus,0);out.originalHoldBonuses+=nflPlayoffRaceNumber_(row.originalHoldBonuses,0);return out;
  },{finalForecastPoints:0,playoffFieldBonuses:0,divisionSweepBonus:0,perfectSeedsBonus:0,originalHoldBonuses:0});
  base.nflPlayoffRace.scoreBreakdown={
    finalForecastPoints:Math.round(finalParts.finalForecastPoints*100)/100,
    playoffFieldBonuses:Math.round(finalParts.playoffFieldBonuses*100)/100,
    divisionSweepBonus:Math.round(finalParts.divisionSweepBonus*100)/100,
    perfectSeedsBonus:Math.round(finalParts.perfectSeedsBonus*100)/100,
    originalHoldBonuses:Math.round(finalParts.originalHoldBonuses*100)/100,
    total:Math.round((finalParts.finalForecastPoints+finalParts.playoffFieldBonuses+finalParts.divisionSweepBonus+finalParts.perfectSeedsBonus+finalParts.originalHoldBonuses)*100)/100
  };
  return base;
}
function saveNflPlayoffRaceRanking_(payload){
  payload=payload||{};
  const gameId=nflPlayoffRaceString_(payload.gameId);
  const username=nflPlayoffRaceString_(payload.username);
  const categoryId=nflPlayoffRaceKey_(payload.categoryId);
  const rankings=Array.isArray(payload.rankings)?payload.rankings:[];
  if(payload.confirmed!==true)throw new Error("Use Finalize Picks to submit an official Playoff Race forecast.");
  if(!nflPlayoffRaceIsGame_(gameId))throw new Error("NFL Playoff Race game is required.");
  if(!username||!categoryId)throw new Error("Username and CategoryId are required.");
  const category=(rankingGameCategories_(gameId)||[]).find(function(item){return nflPlayoffRaceKey_(item.id)===categoryId;});
  if(!category)throw new Error("NFL Playoff Race section was not found.");
  rankingValidateBallot_(category,rankings);

  const meta=nflPlayoffRaceMeta_(gameId,username);
  const original=nflPlayoffRaceOriginalSnapshot_(meta.rows,categoryId);
  let forecastType="original";
  let effectiveWeek=meta.timing.seasonStarted?meta.timing.currentWeek:0;
  let multiplier=nflPlayoffRaceInitialMultiplier_(gameId,meta.timing.currentWeek,meta.timing.seasonStarted);

  if(original){
    if(!meta.canUpdate)throw new Error(meta.lockReason||"Playoff Race is locked outside an update window.");
    forecastType="update";
    effectiveWeek=meta.setupMode?0:meta.timing.currentWindow.week;
    multiplier=meta.setupMode?1:meta.timing.currentWindow.multiplier;
  }else if(!meta.canEnter){
    throw new Error(meta.lockReason||"New scoring forecasts closed after Week "+NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_+".");
  }

  const previous=nflPlayoffRaceActiveSnapshot_(meta.rows,categoryId);
  const teamMultipliers=meta.setupMode
    ?Object.fromEntries(rankings.map(function(row){return [nflPlayoffRaceKey_(row.nomineeId),1];}))
    :previous?nflPlayoffRaceAdjustedTeamMultipliers_(previous,rankings,multiplier)
    :Object.fromEntries(rankings.map(function(row){return [nflPlayoffRaceKey_(row.nomineeId),multiplier];}));
  const saved=saveRankingBallot_({username:username,gameId:gameId,categoryId:categoryId,
    rankings:rankings,playoffRaceTimingAuthorized:true});
  nflPlayoffRaceAppendSnapshot_({
    gameId:gameId,username:username,categoryId:categoryId,
    forecastId:nflPlayoffRaceForecastId_(),forecastType:forecastType,
    effectiveWeek:effectiveWeek,multiplier:multiplier,rankings:rankings,teamMultipliers:teamMultipliers,
    submittedAt:new Date().toISOString(),
    source:meta.setupMode?(forecastType==="original"?"setup-original":"setup-original-update"):(forecastType==="original"?"player-original":"player-checkpoint-update")
  });
  NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_={};
  NFL_PLAYOFF_RACE_SNAPSHOT_HISTORY_CACHE_R1_={};
  return Object.assign({},saved,{
    forecastType:forecastType,effectiveWeek:effectiveWeek,forecastMultiplier:multiplier,
    originalPreserved:!!original,teamMultipliers:teamMultipliers
  });
}

var NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_={};
var NFL_PLAYOFF_RACE_SNAPSHOT_HISTORY_CACHE_R1_={};
function nflPlayoffRaceHistoryForUser_(gameId,username){
  const key=gameId+"|"+nflPlayoffRaceKey_(username);
  if(!NFL_PLAYOFF_RACE_SNAPSHOT_HISTORY_CACHE_R1_[key])NFL_PLAYOFF_RACE_SNAPSHOT_HISTORY_CACHE_R1_[key]=nflPlayoffRaceReadSnapshots_(gameId,username);
  return NFL_PLAYOFF_RACE_SNAPSHOT_HISTORY_CACHE_R1_[key].slice();
}
function nflPlayoffRaceActiveSnapshotForUser_(gameId,username,categoryId){
  if(!NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_[gameId]){
    const map={};nflPlayoffRaceReadSnapshots_(gameId).forEach(function(row){
      if(!row.isActive)return;
      const user=nflPlayoffRaceKey_(row.username);
      if(!map[user])map[user]={};
      map[user][row.categoryId]=row;
    });
    NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_[gameId]=map;
  }
  const userMap=NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_[gameId][nflPlayoffRaceKey_(username)]||{};
  return userMap[nflPlayoffRaceKey_(categoryId)]||null;
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
