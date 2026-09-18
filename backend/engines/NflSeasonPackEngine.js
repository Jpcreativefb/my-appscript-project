/* =========================================================
   PATTC NFL SPORTS PACK R1
   Resumable setup builder for:
   - NFL Cup parent (Season Cup)
   - NFL Playoff Race
   - NFL Full League Forecast
   - NFL Bottom Dwellers

   The ranking mini-games use the existing Ranking engine.
   Category max = number of teams * 10, which makes each team's
   positional credit exactly:
     exact 10, +/-1 8, +/-2 6, +/-3 4, +/-4 2, farther 0.
========================================================= */

const NFL_SEASON_PACK_VERSION_ = "nfl-sports-pack-r1";

const NFL_SEASON_PACK_TEAMS_ = [
  {abbr:"BUF",name:"Buffalo Bills",conference:"AFC",division:"East"},
  {abbr:"MIA",name:"Miami Dolphins",conference:"AFC",division:"East"},
  {abbr:"NE",name:"New England Patriots",conference:"AFC",division:"East"},
  {abbr:"NYJ",name:"New York Jets",conference:"AFC",division:"East"},
  {abbr:"BAL",name:"Baltimore Ravens",conference:"AFC",division:"North"},
  {abbr:"CIN",name:"Cincinnati Bengals",conference:"AFC",division:"North"},
  {abbr:"CLE",name:"Cleveland Browns",conference:"AFC",division:"North"},
  {abbr:"PIT",name:"Pittsburgh Steelers",conference:"AFC",division:"North"},
  {abbr:"HOU",name:"Houston Texans",conference:"AFC",division:"South"},
  {abbr:"IND",name:"Indianapolis Colts",conference:"AFC",division:"South"},
  {abbr:"JAX",name:"Jacksonville Jaguars",conference:"AFC",division:"South"},
  {abbr:"TEN",name:"Tennessee Titans",conference:"AFC",division:"South"},
  {abbr:"DEN",name:"Denver Broncos",conference:"AFC",division:"West"},
  {abbr:"KC",name:"Kansas City Chiefs",conference:"AFC",division:"West"},
  {abbr:"LV",name:"Las Vegas Raiders",conference:"AFC",division:"West"},
  {abbr:"LAC",name:"Los Angeles Chargers",conference:"AFC",division:"West"},
  {abbr:"DAL",name:"Dallas Cowboys",conference:"NFC",division:"East"},
  {abbr:"NYG",name:"New York Giants",conference:"NFC",division:"East"},
  {abbr:"PHI",name:"Philadelphia Eagles",conference:"NFC",division:"East"},
  {abbr:"WAS",name:"Washington Commanders",conference:"NFC",division:"East"},
  {abbr:"CHI",name:"Chicago Bears",conference:"NFC",division:"North"},
  {abbr:"DET",name:"Detroit Lions",conference:"NFC",division:"North"},
  {abbr:"GB",name:"Green Bay Packers",conference:"NFC",division:"North"},
  {abbr:"MIN",name:"Minnesota Vikings",conference:"NFC",division:"North"},
  {abbr:"ATL",name:"Atlanta Falcons",conference:"NFC",division:"South"},
  {abbr:"CAR",name:"Carolina Panthers",conference:"NFC",division:"South"},
  {abbr:"NO",name:"New Orleans Saints",conference:"NFC",division:"South"},
  {abbr:"TB",name:"Tampa Bay Buccaneers",conference:"NFC",division:"South"},
  {abbr:"ARI",name:"Arizona Cardinals",conference:"NFC",division:"West"},
  {abbr:"LA",name:"Los Angeles Rams",conference:"NFC",division:"West"},
  {abbr:"SF",name:"San Francisco 49ers",conference:"NFC",division:"West"},
  {abbr:"SEA",name:"Seattle Seahawks",conference:"NFC",division:"West"}
];

function nflSeasonPackString_(value) { return String(value === undefined || value === null ? "" : value).trim(); }
function nflSeasonPackKey_(value) { return nflSeasonPackString_(value).toLowerCase(); }
function nflSeasonPackYear_(value) { const n = Math.floor(Number(value) || new Date().getFullYear()); return Math.max(2020, Math.min(2100, n)); }
function nflSeasonPackLogo_(abbr) { const map = { JAX:"jax", LA:"lar", WAS:"wsh" }; const code = map[abbr] || String(abbr || "").toLowerCase(); return "https://a.espncdn.com/i/teamlogos/nfl/500/" + code + ".png"; }
function nflSeasonPackIds_(year) { year=nflSeasonPackYear_(year); return {parent:"nfl-cup-"+year,playoff:"nfl-playoff-race-"+year,league:"nfl-full-league-"+year,bottom:"nfl-bottom-dwellers-"+year}; }

function nflSeasonPackGamePayloads_(year) {
  year=nflSeasonPackYear_(year); const ids=nflSeasonPackIds_(year);
  const placement=JSON.stringify({points:[25,20,16,13,11,9,7,6,5,4,3,2,1],minPlayers:4,fullFieldSize:8,minParticipationPct:50,fieldAdjustment:true});
  return [
    {gameId:ids.parent,name:"NFL Cup "+year,year:year,type:"season-cup",gameRole:"parent",hubMode:"leaderboard-only",showMiniGameLinks:true,includeParentQuestions:false,scoringEngine:"season-cup",parentBestCount:0,placementPointsJSON:placement,themeColor:"#0b5f97",icon:"🏆",sortOrder:10,showLeaderboard:true,description:"Season-long NFL Cup. Mini-game finishes convert into protected Cup placement points."},
    {gameId:ids.playoff,name:"NFL Playoff Race "+year,year:year,type:"ranking",gameRole:"mini",parentGameId:ids.parent,includeInParent:true,parentContributionMode:"placement-points",parentContributionWeight:1.25,themeColor:"#0b5f97",icon:"🏈",sortOrder:20,showLeaderboard:true,description:"Rank every AFC and NFC team. Positions 1-7 are your projected playoff seeds."},
    {gameId:ids.league,name:"NFL Full League Forecast "+year,year:year,type:"ranking",gameRole:"mini",parentGameId:ids.parent,includeInParent:true,parentContributionMode:"placement-points",parentContributionWeight:1,themeColor:"#0b5f97",icon:"🏈",sortOrder:30,showLeaderboard:true,description:"Rank all 32 NFL teams from strongest final regular-season finish to weakest."},
    {gameId:ids.bottom,name:"NFL Bottom Dwellers "+year,year:year,type:"ranking",gameRole:"mini",parentGameId:ids.parent,includeInParent:true,parentContributionMode:"placement-points",parentContributionWeight:.75,themeColor:"#0b5f97",icon:"🏈",sortOrder:40,showLeaderboard:true,description:"The reverse challenge: rank all 32 NFL teams from worst final finish to best."}
  ];
}

function nflSeasonPackCategoryPayloads_(year) {
  const ids=nflSeasonPackIds_(year);
  const afc=NFL_SEASON_PACK_TEAMS_.filter(function(t){return t.conference==="AFC";});
  const nfc=NFL_SEASON_PACK_TEAMS_.filter(function(t){return t.conference==="NFC";});
  return [
    {gameId:ids.playoff,categoryId:"afc-playoff-seeds",category:"AFC Playoff Race — Rank 1 through 16",shortName:"AFC Playoff Seeds",section:"NFL Playoff Race",points:afc.length*10,teams:afc},
    {gameId:ids.playoff,categoryId:"nfc-playoff-seeds",category:"NFC Playoff Race — Rank 1 through 16",shortName:"NFC Playoff Seeds",section:"NFL Playoff Race",points:nfc.length*10,teams:nfc},
    {gameId:ids.league,categoryId:"nfl-full-league-order",category:"NFL Final Order — Rank All 32 Teams",shortName:"Full League Forecast",section:"NFL Full League",points:NFL_SEASON_PACK_TEAMS_.length*10,teams:NFL_SEASON_PACK_TEAMS_.slice()},
    {gameId:ids.bottom,categoryId:"nfl-bottom-dwellers-order",category:"Bottom Dwellers — Rank Worst to Best",shortName:"Bottom Dwellers",section:"NFL Bottom Dwellers",points:NFL_SEASON_PACK_TEAMS_.length*10,teams:NFL_SEASON_PACK_TEAMS_.slice()}
  ];
}

function nflSeasonPackExistingGame_(gameId){try{return typeof getGame==="function"?getGame(gameId):null;}catch(err){return null;}}
function nflSeasonPackEnsureGame_(payload){
  const existing=nflSeasonPackExistingGame_(payload.gameId);
  if(!existing){return {action:"created",result:adminCreateGame(Object.assign({},payload,{active:false,archived:false,defaultGame:false,status:"Draft",lockAllPicks:false}))};}
  const structural={gameId:payload.gameId,name:payload.name,year:payload.year,type:payload.type,gameRole:payload.gameRole,hubMode:payload.hubMode,showMiniGameLinks:payload.showMiniGameLinks,includeParentQuestions:payload.includeParentQuestions,parentGameId:payload.parentGameId||"",includeInParent:payload.includeInParent,parentContributionMode:payload.parentContributionMode,parentContributionWeight:payload.parentContributionWeight,parentBestCount:payload.parentBestCount,placementPointsJSON:payload.placementPointsJSON,scoringEngine:payload.scoringEngine,themeColor:payload.themeColor,icon:payload.icon,sortOrder:payload.sortOrder,showLeaderboard:payload.showLeaderboard,description:payload.description};
  Object.keys(structural).forEach(function(key){if(structural[key]===undefined)delete structural[key];});
  return {action:"verified",result:adminUpdateGame(structural)};
}
function nflSeasonPackEnsureCategory_(payload){
  const setup=adminGetGameSetup({gameId:payload.gameId});
  const existing=(setup.categories||[]).find(function(row){return nflSeasonPackKey_(row.categoryId)===nflSeasonPackKey_(payload.categoryId);});
  if(!existing){return {action:"created",result:adminCreateCategory({gameId:payload.gameId,categoryId:payload.categoryId,category:payload.category,shortName:payload.shortName,section:payload.section,points:payload.points,locked:false,displayOrder:100,layoutType:"sports-ranking",questionType:"sports-ranking",scoringEngine:"manual",selectionMode:"rank-all",scoreMode:"ranking",resultSource:"manual",settlementStatus:"pending",sportsLeague:"NFL"})};}
  return {action:"verified",result:adminUpdateCategory({gameId:payload.gameId,categoryId:payload.categoryId,category:payload.category,shortName:payload.shortName,section:payload.section,points:payload.points,layoutType:"sports-ranking",questionType:"sports-ranking",scoringEngine:"manual",selectionMode:"rank-all",scoreMode:"ranking",sportsLeague:"NFL"})};
}
function nflSeasonPackEnsureNominee_(task){
  const setup=adminGetGameSetup({gameId:task.gameId});
  const category=(setup.categories||[]).find(function(row){return nflSeasonPackKey_(row.categoryId)===nflSeasonPackKey_(task.categoryId);});
  const exists=category&&(category.nominees||[]).some(function(row){return nflSeasonPackKey_(row.nomineeId)===nflSeasonPackKey_(task.team.abbr);});
  if(exists)return {action:"verified"};
  return {action:"created",result:adminCreateNominee({gameId:task.gameId,categoryId:task.categoryId,nomineeId:task.team.abbr,nominee:task.team.name,shortAnswer:task.team.abbr,logoUrl:nflSeasonPackLogo_(task.team.abbr),person:task.team.conference+" "+task.team.division,active:true,predictionGame:false})};
}
function nflSeasonPackTasks_(year){
  const tasks=[];
  nflSeasonPackGamePayloads_(year).forEach(function(game){tasks.push({type:"game",payload:game,label:game.name});});
  nflSeasonPackCategoryPayloads_(year).forEach(function(category){tasks.push({type:"category",payload:category,label:category.category});(category.teams||[]).forEach(function(team){tasks.push({type:"nominee",gameId:category.gameId,categoryId:category.categoryId,team:team,label:category.shortName+" · "+team.abbr});});});
  return tasks;
}
function apiAdminBuildNflSeasonPack(payload){
  payload=payload||{}; if(typeof requireAdmin_==="function")requireAdmin_(payload);
  const year=nflSeasonPackYear_(payload.year),tasks=nflSeasonPackTasks_(year),cursor=Math.max(0,Math.floor(Number(payload.cursor)||0)),batchSize=Math.max(1,Math.min(12,Math.floor(Number(payload.batchSize)||10))),end=Math.min(tasks.length,cursor+batchSize),completed=[];
  for(let i=cursor;i<end;i++){const task=tasks[i];let result;if(task.type==="game")result=nflSeasonPackEnsureGame_(task.payload);else if(task.type==="category")result=nflSeasonPackEnsureCategory_(task.payload);else result=nflSeasonPackEnsureNominee_(task);completed.push({index:i,type:task.type,label:task.label,action:result&&result.action||"verified"});}
  const nextCursor=end,done=nextCursor>=tasks.length; if(typeof clearGamesCache==="function")clearGamesCache();
  return {success:true,version:NFL_SEASON_PACK_VERSION_,year:year,ids:nflSeasonPackIds_(year),cursor:cursor,nextCursor:nextCursor,total:tasks.length,done:done,percent:Math.round((nextCursor/Math.max(1,tasks.length))*100),completed:completed,message:done?"NFL Cup and ranking mini-game setup is ready in Draft.":"NFL Sports Pack setup progress: "+nextCursor+" / "+tasks.length};
}
