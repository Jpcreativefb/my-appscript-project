/* =====================================================
   NFL PLAYOFF RACE ENGINE R1
   Isolated forecast snapshots + late entry/checkpoint rules.
===================================================== */

const NFL_PLAYOFF_RACE_SNAPSHOT_SHEET_ = "NflForecastSnapshots";
const NFL_PLAYOFF_RACE_SNAPSHOT_HEADERS_ = [
  "GameId","Username","CategoryId","ForecastId","ForecastType","EffectiveWeek",
  "Multiplier","RankingsJSON","SubmittedAt","IsActive","Source","TeamMultipliersJSON"
];
const NFL_PLAYOFF_RACE_CHECKPOINTS_ = {4:0.85,8:0.70,12:0.55,15:0.40};
const NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_ = 10;
const NFL_PLAYOFF_RACE_SETTINGS_SHEET_ = "NflPlayoffRaceSettings";
const NFL_PLAYOFF_RACE_SETTINGS_HEADERS_ = [
  "GameId","SeasonStartDate","CurrentWeekMode","CurrentWeekOverride",
  "UpdateWindowMode","UpdateWindowWeek","MultiplierOverride","UpdatedAt","UpdatedBy"
];
const NFL_PLAYOFF_RACE_TEAM_BONUS_ = 3;
const NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_ = 5;
const NFL_PLAYOFF_RACE_FIELD_SIZE_ = 7;

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

function nflPlayoffRaceTiming_(gameId){
  const year=nflPlayoffRaceYear_(gameId);
  const now=Date.now();
  const settings=nflPlayoffRaceGetSettings_(gameId);
  const sheetWeek=nflPlayoffRaceSettingsWeek_(year);
  const dateWeek=nflPlayoffRaceDerivedWeekFromStart_(settings.seasonStartDate,now);
  const currentWeek=settings.currentWeekMode==="override"
    ?settings.currentWeekOverride
    :Math.max(sheetWeek,dateWeek||1);

  let seasonStarted=false;
  if(settings.seasonStartDate){
    const start=new Date(settings.seasonStartDate+"T00:00:00").getTime();
    seasonStarted=Number.isFinite(start)&&start<=now;
  }else{
    seasonStarted=currentWeek>1;
    if(currentWeek<=1){
      const week1=nflPlayoffRaceFetchWeek_(year,1);
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
      const prior=nflPlayoffRaceFetchWeek_(year,checkpoint-1);
      const next=nflPlayoffRaceFetchWeek_(year,checkpoint);
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
    year:year,
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
function nflPlayoffRaceLatestFinalWeek_(year,currentWeek){
  for(let week=Math.max(1,Math.min(18,currentWeek));week>=1;week--){
    const games=nflPlayoffRaceFetchWeek_(year,week);
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
  const leaders=[];
  ["East","North","South","West"].forEach(function(division){
    const rows=teams.filter(function(team){return team.division===division;}).sort(nflPlayoffRaceRecordCompare_);
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
      record:team.text,rank:index+1,provisionalTie:(recordCounts[sig]||0)>1
    };
  });
}
function nflPlayoffRaceStandingsMap_(rows){
  const map={};(rows||[]).forEach(function(row){map[nflPlayoffRaceKey_(row.nomineeId)]=row;});return map;
}
function nflPlayoffRaceLiveStandings_(gameId,currentWeek){
  const year=nflPlayoffRaceYear_(gameId);
  const completedWeek=nflPlayoffRaceLatestFinalWeek_(year,currentWeek);
  if(!completedWeek)return {week:0,updatedAt:new Date().toISOString(),provisionalTiebreakers:true,current:{AFC:[],NFC:[]},previous:{AFC:[],NFC:[]}};
  const cacheKey="nfl-playoff-race-live-r2:"+year+":"+completedWeek;
  try{
    const cache=CacheService.getScriptCache(),cached=cache.get(cacheKey);
    if(cached)return JSON.parse(cached);
  }catch(err){}
  const weekNumbers=[completedWeek,completedWeek-1,completedWeek-2].filter(function(week,index,arr){return week>0&&arr.indexOf(week)===index;});
  const weekSets=weekNumbers.map(function(week){return {week:week,games:nflPlayoffRaceFetchWeek_(year,week)};});
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
  try{CacheService.getScriptCache().put(cacheKey,JSON.stringify(result),300);}catch(err){}
  return result;
}
function nflPlayoffRacePositionPoints_(predictedRank,currentRank){
  const diff=Math.abs((Number(predictedRank)||0)-(Number(currentRank)||0));
  if(diff===0)return 10;if(diff===1)return 8;if(diff===2)return 6;if(diff===3)return 4;if(diff===4)return 2;return 0;
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
      record:currentRow?currentRow.record:"",currentRank:currentRank,
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
    maxPoints:round(rows.reduce(function(sum,row){return sum+10*row.teamMultiplier;},0)+weightedMax+NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_*perfectPct),rows:rows
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
function nflPlayoffRaceWeightedScore_(category,ballot,finalRanks,snapshot){
  const nominees=(category&&category.nominees||[]).filter(function(row){return row&&row.id;});
  const valid=typeof rankingBallotValid_==="function"&&rankingBallotValid_(category,ballot);
  const resolved=typeof rankingFinalOrderComplete_==="function"&&rankingFinalOrderComplete_(category,finalRanks||{});
  const values=nflPlayoffRaceSnapshotTeamMultipliers_(snapshot);
  const fallback=snapshot?Math.max(0,Math.min(1,nflPlayoffRaceNumber_(snapshot.multiplier,1))):1;
  const ranks={};
  (ballot||[]).forEach(function(row){ranks[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
  let max=0,earned=0,exactCount=0,baseEarned=0;
  const unit=nominees.length?Math.max(0,Number(category.points)||0)/nominees.length:0;
  const playoff=/playoff-seeds/.test(nflPlayoffRaceKey_(category&&category.id));
  const top=[];let correctPlayoffTeams=0,bonus=0,bonusMax=0;
  nominees.forEach(function(nominee){
    const id=nflPlayoffRaceKey_(nominee.id);
    const pct=Object.prototype.hasOwnProperty.call(values,id)?values[id]:fallback;
    if(valid)max+=unit*pct;
    const predicted=ranks[id],actual=Number(finalRanks&&finalRanks[id])||0;
    if(valid&&resolved&&predicted>0&&actual>0){
      const credit=Math.max(0,1-Math.abs(predicted-actual)*.2);
      earned+=unit*credit*pct;baseEarned+=unit*credit;
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
  if(valid&&resolved)baseEarned+=playoff?(correctPlayoffTeams*3+(correctPlayoffTeams===7?5:0)):0;
  const round=function(v){return Math.round(v*100)/100;};
  return {
    earnedPoints:round(resolved&&valid?earned+bonus:0),
    remainingPoints:round(!resolved&&valid?max+bonusMax:0),
    finalPointsAvailable:round(valid?max+bonusMax:0),
    baseEarnedPoints:round(baseEarned),
    bonusPoints:round(resolved?bonus:0),bonusMax:round(bonusMax),
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
  return game.lockAllPicks===true||game.votingLocked===true||game.resultsFinalized===true||
    category.locked===true||category.resolved===true||
    status==="archived"||status==="archive";
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
    :nflPlayoffRaceInitialMultiplier_(gameId,timing.currentWeek,timing.seasonStarted);
  const canEnter=missingOriginal.length>0&&(!timing.seasonStarted||timing.currentWeek<=NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_);
  const allOriginal=missingOriginal.length===0;
  const canUpdate=allOriginal&&!!timing.currentWindow;
  // New original forecasts use late-entry value even during an update window.
  const saveMultiplier=canEnter?nflPlayoffRaceInitialMultiplier_(gameId,timing.currentWeek,timing.seasonStarted)
    :timing.currentWindow?timing.currentWindow.multiplier:currentMultiplier;
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
  const live=nflPlayoffRaceLiveStandings_(gameId,meta.timing.currentWeek);
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
    const canEdit=!nflPlayoffRaceStaticLockedR3_(game,sourceCategory)&&!category.resolved&&
      (original?meta.canUpdate:meta.canEnter);
    const multiplier=active?nflPlayoffRaceNumber_(active.multiplier,1):meta.saveMultiplier;
    const finalRanks={};
    (category.officialOrder||[]).forEach(function(row){finalRanks[nflPlayoffRaceKey_(row.nomineeId)]=Number(row.rank)||0;});
    const finalBonus=nflPlayoffRaceBonusForBallot_(categoryId,category.ballot||[],finalRanks);
    const basePositionEarned=nflPlayoffRaceNumber_(category.earnedPoints,0);
    const basePositionRemaining=nflPlayoffRaceNumber_(category.remainingPoints,0);
    const weighted=active?nflPlayoffRaceWeightedScore_(
      Object.assign({},category,{points:nflPlayoffRaceNumber_(category.points,0)}),
      category.ballot||[],finalRanks,active):null;
    const baseEarned=basePositionEarned+(finalBonus.resolved?finalBonus.total:0);
    const baseRemaining=category.resolved?0:(basePositionRemaining+finalBonus.maxBonus);
    return Object.assign({},category,{
      points:weighted?weighted.finalPointsAvailable:nflPlayoffRaceNumber_(category.points,0)+finalBonus.maxBonus,
      basePositionPoints:nflPlayoffRaceNumber_(category.points,0),
      playoffBonusMax:finalBonus.maxBonus,
      locked:category.resolved||nflPlayoffRaceStaticLockedR3_(game,sourceCategory)||!canEdit,
      canEdit:canEdit,
      draftRankings:draft?draft.rankings:[],draftUpdatedAt:draft?draft.updatedAt:"",
      originalSnapshot:nflPlayoffRacePublicSnapshot_(original),
      activeSnapshot:nflPlayoffRacePublicSnapshot_(active),
      forecastMultiplier:multiplier,
      finalizeMultiplier:original?(meta.timing.currentWindow?meta.timing.currentWindow.multiplier:multiplier)
        :nflPlayoffRaceInitialMultiplier_(gameId,meta.timing.currentWeek,meta.timing.seasonStarted),
      baseEarnedPoints:baseEarned,
      baseRemainingPoints:baseRemaining,
      playoffBonus:finalBonus,
      earnedPoints:weighted?weighted.earnedPoints:Math.round(baseEarned*multiplier*100)/100,
      remainingPoints:weighted?weighted.remainingPoints:Math.round(baseRemaining*multiplier*100)/100,
      teamMultipliers:active?nflPlayoffRaceSnapshotTeamMultipliers_(active):{},
      liveStandings:nflPlayoffRaceLiveCategory_(category,active,live)
    });
  });
  base.nflPlayoffRace={
    currentWeek:meta.timing.currentWeek,seasonStarted:meta.timing.seasonStarted,
    currentWindow:meta.timing.currentWindow,nextWindow:meta.timing.nextWindow,
    canEnter:meta.canEnter,canUpdate:meta.canUpdate,canEdit:meta.canEdit,
    currentMultiplier:meta.currentMultiplier,saveMultiplier:meta.saveMultiplier,
    finalLateEntryWeek:NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_,lockReason:meta.lockReason,
    timingSettings:meta.timing.settings,
    teamPlayoffBonus:NFL_PLAYOFF_RACE_TEAM_BONUS_,
    perfectFieldBonus:NFL_PLAYOFF_RACE_PERFECT_FIELD_BONUS_,
    adjustmentSchedule:[
      {week:4,multiplier:0.85},{week:8,multiplier:0.70},
      {week:12,multiplier:0.55},{week:15,multiplier:0.40}
    ],
    liveWeek:live.week,liveUpdatedAt:live.updatedAt,provisionalTiebreakers:live.provisionalTiebreakers,
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
    effectiveWeek=meta.timing.currentWindow.week;
    multiplier=meta.timing.currentWindow.multiplier;
  }else if(!meta.canEnter){
    throw new Error(meta.lockReason||"New scoring forecasts closed after Week "+NFL_PLAYOFF_RACE_FINAL_ENTRY_WEEK_+".");
  }

  const previous=nflPlayoffRaceActiveSnapshot_(meta.rows,categoryId);
  const teamMultipliers=previous
    ?nflPlayoffRaceAdjustedTeamMultipliers_(previous,rankings,multiplier)
    :Object.fromEntries(rankings.map(function(row){return [nflPlayoffRaceKey_(row.nomineeId),multiplier];}));
  const saved=saveRankingBallot_({username:username,gameId:gameId,categoryId:categoryId,
    rankings:rankings,playoffRaceTimingAuthorized:true});
  nflPlayoffRaceAppendSnapshot_({
    gameId:gameId,username:username,categoryId:categoryId,
    forecastId:nflPlayoffRaceForecastId_(),forecastType:forecastType,
    effectiveWeek:effectiveWeek,multiplier:multiplier,rankings:rankings,teamMultipliers:teamMultipliers,
    submittedAt:new Date().toISOString(),
    source:forecastType==="original"?"player-original":"player-checkpoint-update"
  });
  NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_={};
  return Object.assign({},saved,{
    forecastType:forecastType,effectiveWeek:effectiveWeek,forecastMultiplier:multiplier,
    originalPreserved:!!original,teamMultipliers:teamMultipliers
  });
}

var NFL_PLAYOFF_RACE_SNAPSHOT_READ_CACHE_R3_={};
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
