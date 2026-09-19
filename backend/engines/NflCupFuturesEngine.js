/* PATTC NFL Cup + Futures R1. Existing game IDs and picks are never replaced. */
const NFL_CUP_FUTURES_R1_VERSION_ = 'nfl-cup-futures-r1';

function nflCupFuturesYear_(value) {
  const year = Math.floor(Number(value) || new Date().getFullYear());
  if (year !== 2026) throw new Error('This launch builder is scoped to NFL 2026 only.');
  return year;
}
function nflCupFuturesGameIds_(year) {
  return {
    cup: 'nfl-cup-' + year,
    futures: 'nfl-futures-' + year,
    confidence: 'nfl-confidence-' + year,
    survivor: 'nfl-survivor-' + year,
    fantasy: 'league-of-fantasy-champions-' + year,
    playoff: 'nfl-playoff-race-' + year
  };
}
function nflCupFuturesMarkets_() {
  if (!Array.isArray(NFL_SEASON_PACK_TEAMS_) || NFL_SEASON_PACK_TEAMS_.length !== 32) {
    throw new Error('NFL team template is missing or incomplete.');
  }
  const teams = NFL_SEASON_PACK_TEAMS_;
  const market = function(id, name, section, teamsInMarket, multiplier, order) {
    return {id:id,name:name,section:section,teams:teamsInMarket,multiplier:multiplier,order:order};
  };
  const result = [
    market('super-bowl-champion','Super Bowl Champion','Championship Futures',teams,32,10),
    market('afc-champion','AFC Champion','Championship Futures',teams.filter(t=>t.conference==='AFC'),16,20),
    market('nfc-champion','NFC Champion','Championship Futures',teams.filter(t=>t.conference==='NFC'),16,30)
  ];
  ['AFC','NFC'].forEach(function(conference){
    ['East','North','South','West'].forEach(function(division){
      const id=conference.toLowerCase()+'-'+division.toLowerCase()+'-winner';
      result.push(market(id,conference+' '+division+' Winner','Division Futures',
        teams.filter(t=>t.conference===conference&&t.division===division),4,40+result.length*10));
    });
  });
  result.push(market('best-record','Best Regular-Season Record','Season Futures',teams,32,140));
  result.push(market('worst-record','Worst Regular-Season Record','Season Futures',teams,32,150));
  return result;
}
function nflCupFuturesEnsureExistingLinks_(ids) {
  const cup=getGame(ids.cup);
  if (!cup || cup.type!=='season-cup') throw new Error('Build/repair NFL Sports Pack first: missing season-cup parent '+ids.cup);
  const linked=[];
  [
    {id:ids.confidence,weight:1, label:'Confidence'},
    {id:ids.survivor,weight:1, label:'Survivor'},
    {id:ids.fantasy,weight:1, label:'Team Fantasy'},
    {id:ids.playoff,weight:1.25, label:'Playoff Race'}
  ].forEach(function(item){
    const existing=getGame(item.id);
    if (!existing) { linked.push({name:item.label,gameId:item.id,status:'missing — no duplicate created'});return; }
    if (existing.parentGameId && existing.parentGameId!==ids.cup) {
      linked.push({name:item.label,gameId:item.id,status:'another parent — unchanged'});return;
    }
    const result=adminUpdateGame({gameId:item.id,gameRole:'mini',parentGameId:ids.cup,
      includeInParent:true,parentContributionMode:'placement-points',parentContributionWeight:item.weight});
    if (!result || result.success===false) throw new Error('Cannot link '+item.id+': '+(result&&result.error||'unknown error'));
    linked.push({name:item.label,gameId:item.id,status:'linked; publication settings unchanged'});
  });
  return linked;
}
function nflCupFuturesEnsureGame_(ids,year) {
  const existing=getGame(ids.futures);
  if (existing) {
    if (existing.type!=='wager' || (existing.parentGameId && existing.parentGameId!==ids.cup)) {
      throw new Error('Existing '+ids.futures+' has a conflicting game type or parent. Review manually.');
    }
    const res=adminUpdateGame({gameId:ids.futures,gameRole:'mini',parentGameId:ids.cup,
      includeInParent:true,parentContributionMode:'placement-points',parentContributionWeight:1});
    if (!res || res.success===false) throw new Error('Cannot verify existing Futures game.');
    return 'verified (publication, stakes, and existing bets retained)';
  }
  const result=adminCreateGame({
    gameId:ids.futures,name:'NFL Futures '+year,year:year,type:'wager',gameRole:'mini',
    parentGameId:ids.cup,includeInParent:true,parentContributionMode:'placement-points',
    parentContributionWeight:1,themeColor:'#0b5f97',icon:'🏈',sortOrder:60,
    description:'Season-long virtual-stakes Futures. One irrevocable pick per market. Admin-set PATTC game multipliers; not sportsbook odds.',
    startingBankroll:1000,minWager:10,maxWager:200,wagerEditMode:'final_once_selected',allowBetRemoval:false,
    active:false,archived:false,defaultGame:false,status:'Draft',lockAllPicks:true,showLeaderboard:true
  });
  if (!result || result.success===false) throw new Error('Could not create Futures game: '+(result&&result.error||''));
  return 'created in Draft (no player bets enabled)';
}
function nflCupFuturesEnsureMarket_(ids,market) {
  const setup=adminGetGameSetup({gameId:ids.futures});
  const category=(setup.categories||[]).find(c=>String(c.categoryId||'').toLowerCase()===market.id);
  if (category && category.nominees && category.nominees.length) {
    const existing={};category.nominees.forEach(n=>{existing[String(n.nomineeId||'').toUpperCase()]=true;});
    const missing=market.teams.filter(t=>!existing[t.abbr]);
    if (!missing.length) return {action:'verified',answers:category.nominees.length};
    const result=adminBulkCreateNominees({gameId:ids.futures,categoryId:market.id,category:market.name,
      section:market.section,itemsJSON:JSON.stringify(missing.map(t=>({
        nomineeId:t.abbr,nominee:t.name,shortAnswer:t.abbr,logoUrl:nflSeasonPackLogo_(t.abbr),
        person:t.conference+' '+t.division,bettingOdds:market.multiplier,oddsSource:'manual',active:true,predictionGame:false
      })))});
    if (!result || result.success===false) throw new Error('Could not repair '+market.id);
    return {action:'repaired',answers:(category.nominees||[]).length+missing.length};
  }
  if (!category) {
    const created=adminCreateCategory({gameId:ids.futures,categoryId:market.id,category:market.name,
      shortName:market.name,section:market.section,points:0,locked:false,displayOrder:market.order,
      layoutType:'wager',questionType:'award-single-winner',scoringEngine:'manual',selectionMode:'single',
      scoreMode:'wager',oddsMode:'manual',oddsSource:'manual',resultSource:'manual',settlementStatus:'pending',sportsLeague:'NFL'});
    if (!created || created.success===false) throw new Error('Cannot create Futures market '+market.id);
  }
  const result=adminBulkCreateNominees({gameId:ids.futures,categoryId:market.id,category:market.name,
    section:market.section,itemsJSON:JSON.stringify(market.teams.map(t=>({
      nomineeId:t.abbr,nominee:t.name,shortAnswer:t.abbr,logoUrl:nflSeasonPackLogo_(t.abbr),
      person:t.conference+' '+t.division,bettingOdds:market.multiplier,oddsSource:'manual',active:true,predictionGame:false
    })))});
  if (!result || result.success===false) throw new Error('Cannot create Futures options '+market.id);
  return {action:'created',answers:market.teams.length};
}
function apiAdminPrepareNflCupFuturesR1_(payload) {
  payload=payload||{};
  if (typeof requireAdmin_==='function') requireAdmin_(payload);
  const year=nflCupFuturesYear_(payload.year);
  const ids=nflCupFuturesGameIds_(year);
  const markets=nflCupFuturesMarkets_();
  const cursor=Math.max(0,Math.floor(Number(payload.cursor)||0));
  if (cursor>markets.length+1) throw new Error('Invalid Futures build cursor.');
  let completed=[];
  if (cursor===0) {
    const links=nflCupFuturesEnsureExistingLinks_(ids);
    completed=links;
  } else if (cursor===1) {
    completed=[{name:'NFL Futures',gameId:ids.futures,status:nflCupFuturesEnsureGame_(ids,year)}];
  } else if (cursor<=markets.length+1) {
    if (!getGame(ids.futures)) throw new Error('Futures game not created; resume from step 0.');
    const market=markets[cursor-2];
    completed=[Object.assign({name:market.name,gameId:ids.futures},nflCupFuturesEnsureMarket_(ids,market))];
  }
  if (typeof clearGamesCache==='function') clearGamesCache();
  const nextCursor=Math.min(markets.length+2,cursor+1);
  return {success:true,version:NFL_CUP_FUTURES_R1_VERSION_,ids:ids,cursor:cursor,nextCursor:nextCursor,
    total:markets.length+2,percent:Math.round(nextCursor/(markets.length+2)*100),done:nextCursor>=markets.length+2,
    completed:completed,message:nextCursor>=markets.length+2
      ? 'Cup links and Futures Draft setup ready. Review markets/multipliers, run checks, then publish explicitly.'
      : 'Preparing Cup + Futures '+nextCursor+'/'+(markets.length+2)};
}

/* Keep Futures Cup points pending until ALL enabled markets have an official result. */
function nflCupFuturesSettledForCup_(gameId) {
  if (!/^nfl-futures-\d{4}$/.test(String(gameId||''))) return true;
  const categories=getCategories(gameId)||[], settings=getCategorySettings(gameId)||{};
  return categories.length>0 && categories.every(c=>{
    const s=settings[c.id]||{};
    return !!(s.winnerNomineeId||s.wagerResultType||c.winnerNomineeId);
  });
}
function nflCupFuturesLeaderboard_(gameId) {
  const rows=getBettingLeaderboardData(gameId,{skipParentRollup:true})||[];
  return rows.map(r=>Object.assign({},r,{total:Number(r.bankroll)||0,fixedPoints:Number(r.bankroll)||0,
    remaining:Number(r.pendingPotentialReturn)||0,stakedNet:0}));
}
/* Cup-only Team Fantasy adapter; the underlying Team Fantasy league is unchanged.
   If two entries share an owner, count the owner's best-ranked entry once. */
function nflCupTeamFantasyLeaderboard_(gameId) {
  if (typeof teamFantasyBuildStandings_!=='function') return [];
  const standings=teamFantasyBuildStandings_(gameId,'complete');
  if (!standings||standings.success===false) return [];
  const byUser={};
  (standings.rows||[]).forEach(function(r){
    const username=String(r.username||'').trim(),rank=Number(r.rank)||9999;
    if (username && (!byUser[username]||rank<byUser[username].rank)) byUser[username]={username:username,rank:rank,
      displayName:r.name||username,avatar:'👤',fantasyPoints:Number(r.fantasyPoints)||0};
  });
  return Object.keys(byUser).map(k=>byUser[k]).sort((a,b)=>a.rank-b.rank).map(r=>Object.assign(r,{
    total:10000-r.rank,fixedPoints:10000-r.rank,remaining:0,stakedNet:0
  }));
}
