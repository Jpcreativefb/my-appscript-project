/* =====================================================
   RANKING GAME ENGINE v1.2.18w3

   Game-native ordered ballots for Ranking games.
   Movie Community Awards remains a Ranking-game specialization and
   delegates to MovieCommunityAwardsEngine without adding a game type.
===================================================== */

const RANKING_ENTRIES_SHEET = "RankingEntries";
const RANKING_ENTRIES_HEADERS = ["Timestamp","UpdatedAt","GameId","Username","CategoryId","NomineeId","Rank","Locked"];

function rankingString_(value){ return String(value === undefined || value === null ? "" : value).trim(); }
function rankingKey_(value){ return rankingString_(value).toLowerCase(); }
function rankingNumber_(value,fallback){ const n=Number(value); return Number.isFinite(n)?n:(fallback===undefined?0:fallback); }
function rankingBool_(value){ return value===true || rankingKey_(value)==="true" || rankingString_(value)==="1"; }

function rankingEnsureSheet_(){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(RANKING_ENTRIES_SHEET);
  if(!sh){
    const lock=LockService.getScriptLock(); let locked=false;
    try{
      lock.waitLock(10000); locked=true; sh=ss.getSheetByName(RANKING_ENTRIES_SHEET);
      if(!sh){ try{ sh=ss.insertSheet(RANKING_ENTRIES_SHEET); }catch(error){ sh=ss.getSheetByName(RANKING_ENTRIES_SHEET); if(!sh) throw error; } }
    } finally { if(locked) lock.releaseLock(); }
  }
  const lastColumn=Math.max(sh.getLastColumn(),1);
  let headers=sh.getLastRow()>=1?sh.getRange(1,1,1,lastColumn).getValues()[0].map(rankingString_):[];
  if(!headers.some(Boolean)){ sh.getRange(1,1,1,RANKING_ENTRIES_HEADERS.length).setValues([RANKING_ENTRIES_HEADERS]); headers=RANKING_ENTRIES_HEADERS.slice(); }
  const missing=RANKING_ENTRIES_HEADERS.filter(function(h){return headers.indexOf(h)===-1;});
  if(missing.length) sh.getRange(1,headers.length+1,1,missing.length).setValues([missing]);
  return sh;
}

function rankingHeaderMap_(headers){
  const map={}; (headers||[]).forEach(function(header,index){const key=rankingKey_(header); if(key&&map[key]===undefined) map[key]=index;}); return map;
}

function rankingReadRows_(gameId){
  gameId=rankingString_(gameId); const sh=rankingEnsureSheet_(); if(sh.getLastRow()<=1) return [];
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(rankingString_); const col=rankingHeaderMap_(headers);
  const rows=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
  return rows.map(function(row,index){return {rowNumber:index+2,timestamp:row[col.timestamp],updatedAt:row[col.updatedat],gameId:rankingString_(row[col.gameid]),username:rankingString_(row[col.username]),categoryId:rankingKey_(row[col.categoryid]),nomineeId:rankingKey_(row[col.nomineeid]),rank:rankingNumber_(row[col.rank],0),locked:rankingBool_(row[col.locked])};}).filter(function(row){return !gameId||row.gameId===gameId;});
}

function rankingGetEntriesByUser_(gameId){
  const map={}; rankingReadRows_(gameId).forEach(function(row){if(!row.username||!row.categoryId||!row.nomineeId||row.rank<=0)return;if(!map[row.username])map[row.username]={};if(!map[row.username][row.categoryId])map[row.username][row.categoryId]=[];map[row.username][row.categoryId].push({nomineeId:row.nomineeId,rank:row.rank});});
  Object.keys(map).forEach(function(username){Object.keys(map[username]).forEach(function(categoryId){map[username][categoryId].sort(function(a,b){return a.rank-b.rank;});});}); return map;
}
function rankingGetUserEntries_(username,gameId){username=rankingString_(username);return rankingGetEntriesByUser_(gameId)[username]||{};}

function rankingGameCategories_(gameId){
  const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId);
  const categories=typeof getCategoriesCached==="function"?getCategoriesCached(gameId):getCategories(gameId);
  return (categories||[]).filter(function(category){const mode=typeof normalizeCategoryScoreMode_==="function"?normalizeCategoryScoreMode_(category.scoreMode||""):rankingKey_(category.scoreMode||"").replace(/_/g,"-");return mode==="ranking"||rankingKey_(game&&game.type)==="ranking";}).sort(function(a,b){const s=rankingString_(a.section).localeCompare(rankingString_(b.section));return s||rankingNumber_(a.displayOrder,999)-rankingNumber_(b.displayOrder,999);});
}
function rankingCategoryLocked_(game,category){if(!game||!category)return true;if(game.lockAllPicks===true||game.votingLocked===true||category.locked===true)return true;const d=category.lockDateTime?new Date(category.lockDateTime):null;return !!(d&&!isNaN(d.getTime())&&Date.now()>=d.getTime());}

function rankingFinalRanksForGame_(gameId){
  const rows=typeof getCategoryResultsRows_==="function"?getCategoryResultsRows_(gameId):[];const map={};
  (rows||[]).forEach(function(row){const categoryId=rankingKey_(row.categoryId),nomineeId=rankingKey_(row.nomineeId),rank=rankingNumber_(row.finalRank||row.finalPosition,0),status=rankingKey_(row.resultStatus);if(!categoryId||!nomineeId||rank<=0)return;if(["pending","open","cleared","unsettled","push","pushed","void","cancelled","canceled"].indexOf(status)!==-1)return;if(!map[categoryId])map[categoryId]={};map[categoryId][nomineeId]=rank;});return map;
}
function rankingFinalOrderComplete_(category,finalRanks){const nominees=(category&&category.nominees||[]).filter(function(n){return n&&n.id;});if(!nominees.length)return false;const ranks=nominees.map(function(n){return rankingNumber_(finalRanks&&finalRanks[rankingKey_(n.id)],0);}).sort(function(a,b){return a-b;});if(ranks.length!==nominees.length||ranks.some(function(r){return r<=0;}))return false;return ranks.every(function(r,i){return r===i+1;});}
function rankingPositionCredit_(distance){return Math.max(0,1-(Math.abs(rankingNumber_(distance,0))*0.20));}
function rankingScoreBallot_(category,ballot,finalRanks){
  const maxPoints=Math.max(0,rankingNumber_(category&&category.points,0));const nominees=(category&&category.nominees||[]).filter(function(n){return n&&n.id;});const resolved=rankingFinalOrderComplete_(category,finalRanks||{});const ballotValid=rankingBallotValid_(category,ballot);const ballotMap={};(ballot||[]).forEach(function(row){const id=rankingKey_(row.nomineeId),rank=rankingNumber_(row.rank,0);if(id&&rank>0)ballotMap[id]=rank;});
  if(!resolved)return {resolved:false,earnedPoints:0,remainingPoints:ballotValid?maxPoints:0,maxPoints:maxPoints,accuracyPercent:0,exactCount:0,validBallot:ballotValid};
  if(!ballotValid)return {resolved:true,earnedPoints:0,remainingPoints:0,maxPoints:maxPoints,accuracyPercent:0,exactCount:0,validBallot:false};
  let creditTotal=0,exactCount=0;nominees.forEach(function(n){const id=rankingKey_(n.id),predicted=rankingNumber_(ballotMap[id],0),actual=rankingNumber_(finalRanks[id],0);if(predicted<=0||actual<=0)return;const distance=Math.abs(predicted-actual),credit=rankingPositionCredit_(distance);creditTotal+=credit;if(distance===0)exactCount++;});
  const accuracy=nominees.length?creditTotal/nominees.length:0;return {resolved:true,earnedPoints:Math.round(maxPoints*accuracy*100)/100,remainingPoints:0,maxPoints:maxPoints,accuracyPercent:Math.round(accuracy*1000)/10,exactCount:exactCount,validBallot:true};
}
function rankingBallotValid_(category,rankings){try{rankingValidateBallot_(category,rankings);return true;}catch(err){return false;}}
function rankingValidateBallot_(category,rankings){
  const nominees=(category&&category.nominees||[]).filter(function(n){return n&&n.id;}),nomineeSet={};nominees.forEach(function(n){nomineeSet[rankingKey_(n.id)]=true;});
  if(!Array.isArray(rankings)||rankings.length!==nominees.length)throw new Error("Rank every answer before saving this question.");
  const usedNominees={},usedRanks={};rankings.forEach(function(item){const id=rankingKey_(item&&item.nomineeId),rank=rankingNumber_(item&&item.rank,0);if(!nomineeSet[id])throw new Error("Invalid answer in ranking ballot: "+id);if(usedNominees[id])throw new Error("Each answer can only appear once in a ranking ballot.");if(rank<1||rank>nominees.length||Math.floor(rank)!==rank)throw new Error("Ranking positions must be 1 through "+nominees.length+".");if(usedRanks[rank])throw new Error("Each ranking position can only be used once.");usedNominees[id]=true;usedRanks[rank]=true;});
}

function apiGetRankingState_(payload){
  payload=payload||{};const gameId=rankingString_(payload.gameId||(typeof getDefaultGameId==="function"?getDefaultGameId():""));const username=rankingString_(payload.username);if(!gameId)throw new Error("GameId is required.");if(!username)throw new Error("Username is required.");
  if(typeof movieCommunityAwardsIsGame_==="function"&&movieCommunityAwardsIsGame_(gameId))return movieCommunityAwardsGetState_({username:username,gameId:gameId});
  const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId);if(!game||(rankingKey_(game.type)!=="ranking"&&game.rankingEnabled!==true))throw new Error("This game is not configured for Ranking play.");
  const categories=rankingGameCategories_(gameId),ballots=rankingGetUserEntries_(username,gameId),finalRanks=rankingFinalRanksForGame_(gameId);
  return {success:true,gameId:gameId,gameName:game.name||gameId,rules:{exact:100,oneAway:80,twoAway:60,threeAway:40,fourAway:20,farther:0},categories:categories.map(function(category){const categoryId=rankingKey_(category.id),ballot=ballots[categoryId]||[],categoryFinalRanks=finalRanks[categoryId]||{},score=rankingScoreBallot_(category,ballot,categoryFinalRanks);return {id:category.id,name:category.name,section:category.section||"Main",displayOrder:category.displayOrder,points:rankingNumber_(category.points,0),locked:rankingCategoryLocked_(game,category)||score.resolved,lockDateTime:category.lockDateTime||"",resolved:score.resolved,earnedPoints:score.earnedPoints,remainingPoints:score.remainingPoints,accuracyPercent:score.accuracyPercent,exactCount:score.exactCount,ballot:ballot,officialOrder:Object.keys(categoryFinalRanks).map(function(id){return{nomineeId:id,rank:categoryFinalRanks[id]};}).sort(function(a,b){return a.rank-b.rank;}),nominees:(category.nominees||[]).map(function(n){return{id:n.id,name:n.name,shortAnswer:n.shortAnswer||n.name,image:n.image||"",movie:n.movie||"",person:n.person||""};})};})};
}

function saveRankingBallot_(payload){
  payload=payload||{};const gameId=rankingString_(payload.gameId),username=rankingString_(payload.username),categoryId=rankingKey_(payload.categoryId),rankings=Array.isArray(payload.rankings)?payload.rankings:[];if(!gameId||!username||!categoryId)throw new Error("Username, GameId, and CategoryId are required.");
  if(typeof movieCommunityAwardsIsGame_==="function"&&movieCommunityAwardsIsGame_(gameId))return movieCommunityAwardsSave_({username:username,gameId:gameId,categoryId:categoryId,rankings:rankings});
  if(typeof nflPlayoffRaceIsGame_==="function"&&nflPlayoffRaceIsGame_(gameId)&&payload.playoffRaceTimingAuthorized!==true)throw new Error("Use Finalize Picks for Playoff Race.");
  const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId);if(!game||(rankingKey_(game.type)!=="ranking"&&game.rankingEnabled!==true))throw new Error("Ranking is not enabled for this game.");
  const category=rankingGameCategories_(gameId).find(function(item){return rankingKey_(item.id)===categoryId;});if(!category)throw new Error("Ranking question not found.");
  const raceTimingAuthorized=payload.playoffRaceTimingAuthorized===true&&typeof nflPlayoffRaceIsGame_==="function"&&nflPlayoffRaceIsGame_(gameId)&&typeof nflPlayoffRaceStaticLockedR3_==="function"&&!nflPlayoffRaceStaticLockedR3_(game,category);if(!raceTimingAuthorized&&rankingCategoryLocked_(game,category))throw new Error("This ranking question is locked.");
  const finalRanks=rankingFinalRanksForGame_(gameId)[categoryId]||{};if(rankingFinalOrderComplete_(category,finalRanks))throw new Error("This ranking question has already been settled.");rankingValidateBallot_(category,rankings);
  const lock=((typeof LockService.getDocumentLock==="function"?LockService.getDocumentLock():null)||LockService.getScriptLock());if(!lock.tryLock(2500))throw new Error("Could not save ranking: another write is finishing. Please try once more.");
  try{const sh=rankingEnsureSheet_(),data=sh.getDataRange().getValues(),headers=data[0].map(rankingString_),col=rankingHeaderMap_(headers),matchingRows=[];for(let i=1;i<data.length;i++){const same=rankingString_(data[i][col.gameid])===gameId&&rankingString_(data[i][col.username])===username&&rankingKey_(data[i][col.categoryid])===categoryId;if(same)matchingRows.push(i+1);}const now=new Date(),newRows=rankings.map(function(item){const row=new Array(headers.length).fill("");row[col.timestamp]=now;row[col.updatedat]=now;row[col.gameid]=gameId;row[col.username]=username;row[col.categoryid]=categoryId;row[col.nomineeid]=rankingKey_(item.nomineeId);row[col.rank]=rankingNumber_(item.rank,0);row[col.locked]=false;return row;}),reuseCount=Math.min(matchingRows.length,newRows.length);for(let i=0;i<reuseCount;i++)sh.getRange(matchingRows[i],1,1,headers.length).setValues([newRows[i]]);if(newRows.length>reuseCount){const appendRows=newRows.slice(reuseCount);sh.getRange(sh.getLastRow()+1,1,appendRows.length,headers.length).setValues(appendRows);}if(matchingRows.length>newRows.length)matchingRows.slice(newRows.length).sort(function(a,b){return b-a;}).forEach(function(rowNumber){sh.deleteRow(rowNumber);});SpreadsheetApp.flush();if(typeof clearPlayerActionCaches==="function")clearPlayerActionCaches(gameId,[RANKING_ENTRIES_SHEET],username);else if(typeof clearGameCaches==="function")clearGameCaches(gameId);return{success:true,gameId:gameId,categoryId:categoryId,saved:newRows.length};}finally{lock.releaseLock();}
}

function adminSaveRankingResults_(payload){
  payload=payload||{};const gameId=rankingString_(payload.gameId),categoryId=rankingKey_(payload.categoryId),rankings=Array.isArray(payload.rankings)?payload.rankings:[];if(!gameId||!categoryId)throw new Error("GameId and CategoryId are required.");const category=rankingGameCategories_(gameId).find(function(item){return rankingKey_(item.id)===categoryId;});if(!category)throw new Error("Ranking question not found.");rankingValidateBallot_(category,rankings);const now=new Date(),payloads=rankings.map(function(item){const rank=rankingNumber_(item.rank,0);return{timestamp:now,settledAt:now,gameId:gameId,categoryId:categoryId,nomineeId:rankingKey_(item.nomineeId),resultStatus:"settled",isWinner:rank===1,finalRank:rank,finalPosition:rank,resultValue:rank,resultSource:"manual-ranking",notes:"Official Ranking result saved from Manage Games."};});const result=upsertCategoryResultsBulk_(payloads);if(typeof adminUpdateCategory==="function"){const winner=rankings.find(function(item){return rankingNumber_(item.rank,0)===1;});adminUpdateCategory({gameId:gameId,categoryId:categoryId,winnerNomineeId:winner?rankingKey_(winner.nomineeId):"",settlementStatus:"settled",locked:true,notes:"Ranking result finalized."});upsertCategoryResultsBulk_(payloads);}if(typeof clearGameDataCaches==="function")clearGameDataCaches(gameId,["CategoryResults","CategorySettings"]);else if(typeof clearGameCaches==="function")clearGameCaches(gameId);return{success:true,gameId:gameId,categoryId:categoryId,saved:rankings.length,updated:result&&result.updated||0,appended:result&&result.appended||0};
}

function rankingLeaderboardData_(gameId){
  const game=typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId),categories=rankingGameCategories_(gameId),entriesByUser=rankingGetEntriesByUser_(gameId),finalRanks=rankingFinalRanksForGame_(gameId),rows=[];
  const nflMultiplierByUser=typeof nflPlayoffRaceIsGame_==="function"&&nflPlayoffRaceIsGame_(gameId)&&typeof nflPlayoffRaceMultiplierMapForGame_==="function"?nflPlayoffRaceMultiplierMapForGame_(gameId):null;
  Object.keys(entriesByUser).forEach(function(username){let total=0,remaining=0,baseTotal=0,baseRemaining=0,exactCount=0,resolvedQuestions=0;const userMultipliers=nflMultiplierByUser?(nflMultiplierByUser[rankingKey_(username)]||{}):null;Object.keys(entriesByUser[username]).forEach(function(categoryId){const category=categories.find(function(item){return rankingKey_(item.id)===categoryId;});if(!category)return;const ballot=entriesByUser[username][categoryId],score=rankingScoreBallot_(category,ballot,finalRanks[categoryId]||{}),playoffBonus=nflMultiplierByUser&&typeof nflPlayoffRaceBonusForBallot_==="function"?nflPlayoffRaceBonusForBallot_(categoryId,ballot,finalRanks[categoryId]||{}):{resolved:false,total:0,maxBonus:0},multiplier=userMultipliers&&userMultipliers[categoryId]!==undefined?Number(userMultipliers[categoryId])||0:1,baseEarned=score.earnedPoints+(playoffBonus.resolved?playoffBonus.total:0),baseRemain=score.resolved?0:score.remainingPoints+playoffBonus.maxBonus;snap=nflMultiplierByUser&&typeof nflPlayoffRaceActiveSnapshotForUser_==="function"?nflPlayoffRaceActiveSnapshotForUser_(gameId,username,categoryId):null;const weighted=snap&&typeof nflPlayoffRaceWeightedScore_==="function"?nflPlayoffRaceWeightedScore_(category,ballot,finalRanks[categoryId]||{},snap,typeof nflPlayoffRaceHistoryForUser_==="function"?nflPlayoffRaceHistoryForUser_(gameId,username).filter(function(row){return row.categoryId===categoryId;}):[],typeof nflPlayoffRaceScoringConfig_==="function"?nflPlayoffRaceScoringConfig_(gameId):null):null;baseTotal+=baseEarned;baseRemaining+=baseRemain;total+=weighted?weighted.earnedPoints:baseEarned*multiplier;remaining+=weighted?weighted.remainingPoints:baseRemain*multiplier;exactCount+=score.exactCount;if(score.resolved)resolvedQuestions++;});const profile=typeof getLeaderboardUserProfile_==="function"?(getLeaderboardUserProfile_(username,gameId)||{}):{};rows.push({user:username,username:username,displayName:profile.displayName||username,avatar:profile.avatar||"👤",themeColor:profile.themeColor||profile.profileColor||"#354785",profileColor:profile.profileColor||profile.themeColor||"#354785",profileColorMode:profile.profileColorMode||"solid",profileColor2:profile.profileColor2||"#354785",profileGradientAngle:profile.profileGradientAngle||"135",total:Math.round(total*100)/100,remaining:Math.round(remaining*100)/100,max:Math.round((total+remaining)*100)/100,baseTotal:Math.round(baseTotal*100)/100,baseRemaining:Math.round(baseRemaining*100)/100,baseMax:Math.round((baseTotal+baseRemaining)*100)/100,statues:0,fixedPointsEnabled:false,fixedPoints:Math.round(total*100)/100,fixedRemaining:Math.round(remaining*100)/100,rankingExactCount:exactCount,rankingResolvedQuestions:resolvedQuestions,eliminated:false,winChance:0,scoringMode:"ranking",leaderboardScoreMode:"ranking"});});rows.sort(function(a,b){if(b.total!==a.total)return b.total-a.total;if(b.rankingExactCount!==a.rankingExactCount)return b.rankingExactCount-a.rankingExactCount;return rankingString_(a.displayName).localeCompare(rankingString_(b.displayName));});return rows;
}

function rankingUserScoring_(username,gameId){
  const categories=rankingGameCategories_(gameId),ballots=rankingGetUserEntries_(username,gameId),finalRanks=rankingFinalRanksForGame_(gameId),scoring={};const nflMultipliers=typeof nflPlayoffRaceIsGame_==="function"&&nflPlayoffRaceIsGame_(gameId)&&typeof nflPlayoffRaceMultiplierMapForUser_==="function"?nflPlayoffRaceMultiplierMapForUser_(username,gameId):null;
  categories.forEach(function(category){const categoryId=rankingKey_(category.id),ballot=ballots[categoryId]||[],score=rankingScoreBallot_(category,ballot,finalRanks[categoryId]||{}),playoffBonus=nflMultipliers&&typeof nflPlayoffRaceBonusForBallot_==="function"?nflPlayoffRaceBonusForBallot_(categoryId,ballot,finalRanks[categoryId]||{}):{resolved:false,total:0,maxBonus:0},multiplier=nflMultipliers&&nflMultipliers[categoryId]!==undefined?Number(nflMultipliers[categoryId])||0:1,snap=nflMultipliers&&typeof nflPlayoffRaceActiveSnapshotForUser_==="function"?nflPlayoffRaceActiveSnapshotForUser_(gameId,username,categoryId):null,weighted=snap&&typeof nflPlayoffRaceWeightedScore_==="function"?nflPlayoffRaceWeightedScore_(category,ballot,finalRanks[categoryId]||{},snap,typeof nflPlayoffRaceHistoryForUser_==="function"?nflPlayoffRaceHistoryForUser_(gameId,username).filter(function(row){return row.categoryId===categoryId;}):[],typeof nflPlayoffRaceScoringConfig_==="function"?nflPlayoffRaceScoringConfig_(gameId):null):null;scoring[categoryId]={shortName:category.shortName||category.name,nomineeId:ballot.length?"ranking-ballot":"",winnerNomineeId:"",earnedPoints:weighted?weighted.earnedPoints:Math.round((score.earnedPoints+(playoffBonus.resolved?playoffBonus.total:0))*multiplier*100)/100,remainingPoints:weighted?weighted.remainingPoints:Math.round((score.resolved?0:score.remainingPoints+playoffBonus.maxBonus)*multiplier*100)/100,finalPointsAvailable:weighted?weighted.finalPointsAvailable:Math.round((score.maxPoints+playoffBonus.maxBonus)*multiplier*100)/100,baseEarnedPoints:score.earnedPoints+(playoffBonus.resolved?playoffBonus.total:0),baseRemainingPoints:score.resolved?0:score.remainingPoints+playoffBonus.maxBonus,baseFinalPointsAvailable:score.maxPoints+playoffBonus.maxBonus,playoffBonus:playoffBonus,forecastMultiplier:multiplier,locked:rankingCategoryLocked_(typeof getGameRuntimeConfig==="function"?getGameRuntimeConfig(gameId):getGame(gameId),category),resolved:score.resolved,correct:score.resolved&&score.accuracyPercent===100,wrong:false,push:false,status:score.resolved?"ranked":(ballot.length?"pending":"no-pick"),scoringMode:"ranking",confidenceScoringMode:"",rankingAccuracyPercent:score.accuracyPercent,rankingExactCount:score.exactCount};});return scoring;
}
