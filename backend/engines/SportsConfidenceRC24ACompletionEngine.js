/* =========================================================
   RC24A CONFIDENCE / PICK'EM COMPLETION ENGINE
   Awards-side aggregation only. No Sports Engine/provider calls.
   ========================================================= */
function confidenceRc24aString_(v){ return String(v===undefined||v===null?'':v).trim(); }
function confidenceRc24aKey_(v){ return confidenceRc24aString_(v).toLowerCase().replace(/_/g,'-'); }
function confidenceRc24aNumber_(v,d){ var n=Number(v); return isNaN(n)?(d||0):n; }
function confidenceRc24aWeek_(game){
  game=game||{}; var source=confidenceRc24aString_(game.week||game.Week||game.period||game.Period||game.name||game.gameName||game.gameId||game.GameId);
  var m=source.match(/(?:week|wk)[\s_-]*(\d{1,2})/i); if(m) return Math.max(1,Math.min(18,Number(m[1])||1));
  var n=Number(source); return Number.isFinite(n)&&n>=1&&n<=18?n:0;
}
function confidenceRc24aCategories_(gameId){
  try {
    if(typeof getCategories==='function') return getCategories(gameId)||[];
    if(typeof apiGetCategories==='function'){ var r=apiGetCategories(gameId); return Array.isArray(r)?r:((r&&r.categories)||[]); }
  } catch(e){}
  return [];
}
function confidenceRc24aWinningPlaces_(game){
  game=game||{};
  var direct=Number(game.weeklyWinningPlaces||game.winningPlaces||game.prizePlaces||game.qualifyingPlaces||0);
  if(Number.isFinite(direct)&&direct>0) return Math.floor(direct);
  var raw=game.placementPointsJSON||game.PlacementPointsJSON||'';
  if(raw){ try { var obj=typeof raw==='string'?JSON.parse(raw):raw; var keys=Object.keys(obj||{}).map(Number).filter(function(n){return Number.isFinite(n)&&n>0&&Number(obj[String(n)])!==0;}); if(keys.length) return Math.max.apply(null,keys); } catch(e){} }
  return 0;
}
function confidenceRc24aLeagueContext_(username,gameId,requested){
  var leagues=typeof getAccessibleLeaguesForGame_==='function'?getAccessibleLeaguesForGame_(username,gameId):[];
  var id=confidenceRc24aString_(requested||'');
  if(id&&!leagues.some(function(l){return confidenceRc24aKey_(l.leagueId)===confidenceRc24aKey_(id);})){id='';}
  if(!id&&leagues.length) id=leagues[0].leagueId;
  return {leagueId:id,leagueName:(leagues.find(function(l){return confidenceRc24aKey_(l.leagueId)===confidenceRc24aKey_(id);})||{}).leagueName||id,leagues:leagues};
}
function confidenceRc24aLeaderboard_(gameId,leagueId){
  var rows=typeof getLeaderboardData==='function'?getLeaderboardData(gameId):[];
  rows=Array.isArray(rows)?rows:((rows&&rows.leaderboard)||[]);
  if(leagueId&&typeof filterLeaderboardRowsForLeague_==='function') rows=filterLeaderboardRowsForLeague_(rows,gameId,leagueId);
  return rows;
}

function confidenceRc24aGamesRemaining_(gameId){
  var cats=confidenceRc24aCategories_(gameId);
  var settings=typeof getCategorySettings==='function'?getCategorySettings(gameId):{};
  return (cats||[]).reduce(function(count,c){
    var cid=confidenceRc24aKey_(c.id||c.categoryId);
    var cfg=(settings||{})[cid]||{};
    // Locked/LIVE games are still games left. Only an authoritative resolved winner closes the matchup.
    var resolved=!!confidenceRc24aString_(cfg.winnerNomineeId||c.winnerNomineeId||'');
    return count+(resolved?0:1);
  },0);
}
function confidenceRc24aWeeklyGames_(game){
  game=game||{};
  var parentId=confidenceRc24aString_(game.parentGameId||game.ParentGameId||'');
  var currentId=confidenceRc24aString_(game.gameId||game.GameId||'');
  var games=typeof getGames==='function'?getGames():[];
  return (games||[]).filter(function(g){
    var gid=confidenceRc24aString_(g.gameId||g.GameId);
    var parent=confidenceRc24aString_(g.parentGameId||g.ParentGameId||'');
    return gid===currentId||(parentId&&parent===parentId);
  }).filter(function(g){return confidenceRc24aWeek_(g)>=1&&confidenceRc24aWeek_(g)<=18;})
    .sort(function(a,b){return confidenceRc24aWeek_(a)-confidenceRc24aWeek_(b);});
}
function confidenceRc24aSeasonStandings_(game,leagueId){
  var weekly=confidenceRc24aWeeklyGames_(game), users={};
  if(leagueId&&typeof getActiveLeagueMembers_==='function'){
    (getActiveLeagueMembers_(leagueId)||[]).forEach(function(m){
      var u=confidenceRc24aString_(m.username||m.Username); if(u) users[confidenceRc24aKey_(u)]={username:u,displayName:u,totalPoints:0,weeksPlayed:0};
    });
  }
  weekly.forEach(function(g){
    var gid=g.gameId||g.GameId;
    confidenceRc24aStandings_(confidenceRc24aLeaderboard_(gid,leagueId),confidenceRc24aWinningPlaces_(g)).forEach(function(row){
      var k=confidenceRc24aKey_(row.username); if(!k)return;
      if(!users[k]) users[k]={username:row.username,displayName:row.displayName||row.username,totalPoints:0,weeksPlayed:0};
      users[k].displayName=row.displayName||users[k].displayName;
      users[k].totalPoints+=confidenceRc24aNumber_(row.points,0);
      users[k].weeksPlayed+=1;
    });
  });
  var rows=Object.keys(users).map(function(k){return users[k];});
  rows.sort(function(a,b){return b.totalPoints-a.totalPoints||b.weeksPlayed-a.weeksPlayed||a.displayName.localeCompare(b.displayName);});
  rows.forEach(function(r,i){r.seasonRank=i+1;});
  return rows;
}
function confidenceRc24aRowPoints_(row){ return confidenceRc24aNumber_(row&&(row.fixedPoints!==undefined?row.fixedPoints:(row.total!==undefined?row.total:row.score)),0); }
function confidenceRc24aRowRemaining_(row){ return Math.max(0,confidenceRc24aNumber_(row&&(row.fixedRemaining!==undefined?row.fixedRemaining:(row.remaining!==undefined?row.remaining:row.remainingPoints)),0)); }
function confidenceRc24aElimination_(target,rows,winningPlaces){
  if(!winningPlaces) return {status:'unknown',eliminated:null,reason:'winning-places-not-configured'};
  var max=target.points+target.possibleRemaining, ahead=0;
  rows.forEach(function(r){ if(confidenceRc24aKey_(r.username)===confidenceRc24aKey_(target.username)) return; if(r.points>max) ahead++; });
  return {status:ahead>=winningPlaces?'eliminated':'alive',eliminated:ahead>=winningPlaces,guaranteedAhead:ahead,winningPlaces:winningPlaces,maximumPossible:max};
}
function confidenceRc24aStandings_(raw,winningPlaces){
  var rows=(raw||[]).map(function(row){return {username:row.username||row.user||'',displayName:row.displayName||row.username||row.user||'Player',avatar:row.avatar||'👤',points:confidenceRc24aRowPoints_(row),possibleRemaining:confidenceRc24aRowRemaining_(row)};});
  rows.sort(function(a,b){return b.points-a.points||b.possibleRemaining-a.possibleRemaining||a.displayName.localeCompare(b.displayName);});
  rows.forEach(function(r,i){r.place=i+1;r.maximumPossible=r.points+r.possibleRemaining;});
  rows.forEach(function(r){r.elimination=confidenceRc24aElimination_(r,rows,winningPlaces);r.status=r.possibleRemaining<=0?'FINAL':(r.elimination.eliminated?'ELIMINATED':'LIVE');});
  return rows;
}
function confidenceRc24aGamePickHistory_(username,game){
  var gameId=game.gameId||game.GameId||''; var picks=typeof getUserPicks==='function'?getUserPicks(username,gameId):[]; var settings=typeof getCategorySettings==='function'?getCategorySettings(gameId):{}; var cats=confidenceRc24aCategories_(gameId); var catMap={};
  (cats||[]).forEach(function(c){catMap[confidenceRc24aKey_(c.id||c.categoryId)]=c;});
  return (picks||[]).map(function(p){var cid=confidenceRc24aKey_(p.categoryId);var cfg=(settings||{})[cid]||{};var cat=catMap[cid]||{};var nominees=cat.nominees||[];var n=nominees.find(function(x){return confidenceRc24aKey_(x.id||x.nomineeId)===confidenceRc24aKey_(p.nomineeId);})||{};var winner=confidenceRc24aKey_(cfg.winnerNomineeId||'');var settled=!!winner;return {gameId:gameId,week:confidenceRc24aWeek_(game),categoryId:p.categoryId,teamId:p.nomineeId,team:n.name||n.shortAnswer||p.nomineeId,logo:n.image||n.logoUrl||'',confidencePoints:p.confidencePoints||0,resolved:settled,correct:settled?winner===confidenceRc24aKey_(p.nomineeId):null,result:settled?(winner===confidenceRc24aKey_(p.nomineeId)?'correct':'wrong'):'pending'};});
}
function confidenceRc24aSeason_(username,game,leagueId){
  var weekly=confidenceRc24aWeeklyGames_(game);
  var weeks=weekly.map(function(g){
    var gid=g.gameId||g.GameId;
    var winning=confidenceRc24aWinningPlaces_(g);
    var lb=confidenceRc24aLeaderboard_(gid,leagueId);
    var sorted=confidenceRc24aStandings_(lb,winning);
    var row=sorted.find(function(r){return confidenceRc24aKey_(r.username)===confidenceRc24aKey_(username);});
    var picks=typeof getUserPicks==='function'?getUserPicks(username,gid):[];
    var complete=row?row.possibleRemaining<=0:false;
    return {week:confidenceRc24aWeek_(g),gameId:gid,points:row?row.points:0,place:row?row.place:null,played:(picks||[]).length>0,complete:complete,winner:!!(row&&complete&&winning>0&&row.place<=winning),winningPlaces:winning};
  }).sort(function(a,b){return a.week-b.week;});
  var total=weeks.reduce(function(s,w){return s+w.points;},0), played=weeks.filter(function(w){return w.played;}).length, wins=weeks.filter(function(w){return w.winner;}).length;
  var seasonStandings=confidenceRc24aSeasonStandings_(game,leagueId);
  var me=seasonStandings.find(function(r){return confidenceRc24aKey_(r.username)===confidenceRc24aKey_(username);})||null;
  return {weeks:weeks,totalPoints:total,seasonRank:me?me.seasonRank:null,weeksPlayed:played,weeklyWins:wins,seasonStandings:seasonStandings,lateJoinAllowed:true,missedWeekAllowed:true};
}
function confidenceRc24aTrends_(username,game){
  var parentId=confidenceRc24aString_(game.parentGameId||game.ParentGameId||'');var games=typeof getGames==='function'?getGames():[];var weekly=(games||[]).filter(function(g){var gid=confidenceRc24aString_(g.gameId||g.GameId);var parent=confidenceRc24aString_(g.parentGameId||g.ParentGameId||'');return gid===confidenceRc24aString_(game.gameId||game.GameId)||(parentId&&parent===parentId);});var map={};
  weekly.forEach(function(g){confidenceRc24aGamePickHistory_(username,g).forEach(function(h){var id=confidenceRc24aKey_(h.teamId);if(!map[id])map[id]={teamId:id,team:h.team,logo:h.logo,selections:0,correct:0,settled:0};var r=map[id];r.selections++;if(h.resolved){r.settled++;if(h.correct)r.correct++;}});});
  return Object.keys(map).map(function(id){var r=map[id];r.winPercentage=r.settled?Math.round((r.correct/r.settled)*1000)/10:null;return r;}).sort(function(a,b){return b.selections-a.selections||b.correct-a.correct||a.team.localeCompare(b.team);});
}
function confidenceRc24aCompare_(gameId,leagueId,week){
  var lb=confidenceRc24aStandings_(confidenceRc24aLeaderboard_(gameId,leagueId),0); var game=typeof getGameRuntimeConfig==='function'?getGameRuntimeConfig(gameId):getGame(gameId); var categories=confidenceRc24aCategories_(gameId);var settings=typeof getCategorySettings==='function'?getCategorySettings(gameId):{};
  return lb.map(function(row){var picks=typeof getUserPicks==='function'?getUserPicks(row.username,gameId):[];return {username:row.username,displayName:row.displayName,points:row.points,possibleRemaining:row.possibleRemaining,matchups:(picks||[]).map(function(p){var cfg=(settings||{})[confidenceRc24aKey_(p.categoryId)]||{};var category=(categories||[]).find(function(c){return confidenceRc24aKey_(c.id||c.categoryId)===confidenceRc24aKey_(p.categoryId);})||{};var lock=category.lockDateTime||cfg.lockDateTime||'';var locked=cfg.locked===true||(lock&&new Date(lock).getTime()<=Date.now());var resolved=!!cfg.winnerNomineeId;var reveal=locked||resolved;var nominee=(category.nominees||[]).find(function(n){return confidenceRc24aKey_(n.id||n.nomineeId)===confidenceRc24aKey_(p.nomineeId);})||{};return {categoryId:p.categoryId,hidden:!reveal,team:reveal?(nominee.name||nominee.shortAnswer||p.nomineeId):'',teamId:reveal?p.nomineeId:'',logo:reveal?(nominee.image||nominee.logoUrl||''):'',confidencePoints:reveal?p.confidencePoints:null,pointsEarned:resolved&&reveal?(confidenceRc24aKey_(cfg.winnerNomineeId)===confidenceRc24aKey_(p.nomineeId)?p.confidencePoints:0):null,result:resolved&&reveal?(confidenceRc24aKey_(cfg.winnerNomineeId)===confidenceRc24aKey_(p.nomineeId)?'correct':'wrong'):(reveal?'pending':'hidden')};})};});
}
function apiGetSportsConfidenceCompletion_(payload){
  payload=payload||{};var username=confidenceRc24aString_(payload.username);var gameId=confidenceRc24aString_(payload.gameId||getDefaultGameId());if(!username||!gameId)throw new Error('Username and GameId are required.');var game=typeof getGameRuntimeConfig==='function'?getGameRuntimeConfig(gameId):getGame(gameId);if(!game||!(game.confidenceEnabled===true||confidenceRc24aKey_(game.type)==='confidence'))throw new Error('This is not a Confidence game.');
  var lc=confidenceRc24aLeagueContext_(username,gameId,payload.leagueId||'');var winning=confidenceRc24aWinningPlaces_(game);var standings=confidenceRc24aStandings_(confidenceRc24aLeaderboard_(gameId,lc.leagueId),winning);var me=standings.find(function(r){return confidenceRc24aKey_(r.username)===confidenceRc24aKey_(username);})||{username:username,displayName:username,points:0,possibleRemaining:0,maximumPossible:0,place:null,status:'LIVE',elimination:{status:winning?'alive':'unknown',reason:winning?'':'winning-places-not-configured'}};var season=confidenceRc24aSeason_(username,game,lc.leagueId);var trends=confidenceRc24aTrends_(username,game);var gamesRemaining=confidenceRc24aGamesRemaining_(gameId);
  return {success:true,gameId:gameId,week:confidenceRc24aWeek_(game),leagueContext:lc,winningPlaces:winning,myWeek:{currentPoints:me.points,currentPlace:me.place,possibleRemaining:me.possibleRemaining,maximumPossible:me.maximumPossible,gamesRemaining:gamesRemaining,status:me.status,elimination:me.elimination},standings:standings,season:season,trends:trends.slice(0,5),allTrends:trends,compare:confidenceRc24aCompare_(gameId,lc.leagueId,confidenceRc24aWeek_(game)),gaps:{winningPlaces:winning?'':'No authoritative winning-place configuration found. Mathematical elimination remains UNKNOWN until configured.'}};
}
