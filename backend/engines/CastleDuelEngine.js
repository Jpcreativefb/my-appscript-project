/* PATTC Castle Duel R3 — Castle rooms, Banish pressure and hidden Traitor reads.
 * All API entry points remain authenticated through backend/Api.js. Never expose
 * private player rows, bot decisions, hidden Traitor identity, targets or
 * unearned rewards to other players.
 */
var CD_HEADERS_ = {
  CastleDuelGames: ['GameId','DataJSON'],
  CastleDuelPlayers: ['GameId','Username','DataJSON'],
  CastleDuelRounds: ['GameId','RoundKey','DataJSON'],
  CastleDuelMatches: ['GameId','RoundKey','MatchId','Username','DataJSON']
};
var CD_DEFAULTS_ = {
  encounters:3, lives:3, startingPoints:100, weeklyJackpot:100, startingJackpot:0,
  maskChance:15, hostChance:10, wagerOptions:[20,30,40,50,60],
  lateEntryCutoff:5, minEpisodesFinale:2, humanChance:50,
  finaleCounts:{faithful:2,traitor:2,allianceFaithful:1,allianceTraitor:1,allianceAny:1,former:2,host:1,mask:0,guard:0},
  pointsPerToken:100, maxTokens:5, creditsPerMurderAdvantage:2, maxMurderAdvantages:2,
  murderBonus:20, maxShields:1, bonusClue:5, bonusAlliance:10,
  banishThresholds:[5,4,3,2],
  roles:{}
};
function cdNum_(v,d){ var n=Number(v);return Number.isFinite(n)?n:d; }
function cdKey_(v){return String(v||'').trim().toLowerCase();}
function cdAssert_(condition,message){if(!condition)throw new Error(message);}
function cdLock_(fn){
  var lock=LockService.getScriptLock();
  cdAssert_(lock.tryLock(20000),'Castle busy; retry your request.');
  try{return fn();}finally{lock.releaseLock();}
}
function cdSheet_(name){
  var ss=SpreadsheetApp.getActive(),sheet=ss.getSheetByName(name);
  if(!sheet){sheet=ss.insertSheet(name);sheet.getRange(1,1,1,CD_HEADERS_[name].length).setValues([CD_HEADERS_[name]]);sheet.setFrozenRows(1);}
  return sheet;
}
function cdRows_(name){
  var sheet=cdSheet_(name),values=sheet.getDataRange().getValues();
  return values.slice(1).map(function(row,i){return {sheet:sheet,row:i+2,gameId:String(row[0]||''),key:String(row[1]||''),id:String(row[2]||''),data:JSON.parse(row[row.length-1]||'{}')};});
}
function cdRead_(name,gameId,key,id){return cdRows_(name).find(function(r){
  if(r.gameId!==gameId)return false;
  if(key!==undefined && cdKey_(r.key)!==cdKey_(key))return false;
  if(id!==undefined && String(r.id)!==String(id))return false;
  return true;
})||null;}
function cdWrite_(name,gameId,key,id,data){
  var existing=cdRead_(name,gameId,key,id),sheet=existing?existing.sheet:cdSheet_(name);
  var row=name==='CastleDuelGames'?[gameId,JSON.stringify(data)]:name==='CastleDuelMatches'?[gameId,key,id,arguments[5]||'',JSON.stringify(data)]:[gameId,key,JSON.stringify(data)];
  if(existing){sheet.getRange(existing.row,1,1,row.length).setValues([row]);}else{sheet.appendRow(row);}
  return data;
}
function cdMatches_(gameId,roundKey){return cdRows_('CastleDuelMatches').filter(function(r){return r.gameId===gameId&&r.key===roundKey;}).map(function(r){return r.data;});}
function cdMatchWrite_(gameId,roundKey,m){
  var sheet=cdSheet_('CastleDuelMatches'),rows=sheet.getDataRange().getValues();
  var row=[gameId,roundKey,m.id,m.user,JSON.stringify(m)],index=-1;
  for(var i=1;i<rows.length;i++){if(String(rows[i][0])===gameId&&String(rows[i][1])===roundKey&&String(rows[i][2])===m.id&&String(rows[i][3])===m.user){index=i+1;break;}}
  if(index>0)sheet.getRange(index,1,1,5).setValues([row]);else sheet.appendRow(row);
  return m;
}
function cdConfig_(gameId){var r=cdRead_('CastleDuelGames',gameId);cdAssert_(r,'Castle Duel is not configured for this game.');return r.data;}
function cdSaveConfig_(gameId,c){return cdWrite_('CastleDuelGames',gameId,undefined,undefined,c);}
function cdPlayers_(gameId){return cdRows_('CastleDuelPlayers').filter(function(r){return r.gameId===gameId;}).map(function(r){return r.data;});}
function cdPlayer_(gameId,username){return cdPlayers_(gameId).find(function(p){return cdKey_(p.user)===cdKey_(username);})||null;}
function cdPublicProfile_(username,gameId){
  username=String(username||'').trim();
  if(!username)return {name:'PATTC Player',imageUrl:''};
  try{
    if(typeof apiGetEditableProfile==='function'){
      var result=apiGetEditableProfile(username,gameId)||{},profile=result.profile||{};
      return {
        name:String(profile.displayName||username).trim()||username,
        imageUrl:String(profile.avatarUrl||'').trim()
      };
    }
  }catch(err){}
  return {name:username,imageUrl:''};
}
function cdSavePlayer_(gameId,p){return cdWrite_('CastleDuelPlayers',gameId,p.user,undefined,p);}
function cdRounds_(gameId){return cdRows_('CastleDuelRounds').filter(function(r){return r.gameId===gameId;}).map(function(r){return r.data;}).sort(function(a,b){return a.number-b.number;});}
function cdRound_(gameId,key){return cdRounds_(gameId).find(function(r){return r.key===key;})||null;}
function cdSaveRound_(gameId,r){return cdWrite_('CastleDuelRounds',gameId,r.key,undefined,r);}
function cdRandom_(list){cdAssert_(list.length,'No eligible opponents available.');return list[Math.floor(Math.random()*list.length)];}
function cdChoice_(){return Math.random()<0.5?'COOPERATE':'BETRAY';}
function cdShuffle_(items){return items.slice().sort(function(){return Math.random()-0.5;});}
function cdScore_(own,other){if(own==='COOPERATE'&&other==='COOPERATE')return 20;if(own==='BETRAY'&&other==='COOPERATE')return 30;if(own==='BETRAY'&&other==='BETRAY')return -10;return 0;}
function cdClue_(answer){return Math.random()<.75?answer:(answer==='COOPERATE'?'BETRAY':'COOPERATE');}
function cdRewardLife_(p,c){if(p.lives<=0)return;if(p.lives<c.lives)p.lives+=1;else p.shield=Math.min(c.maxShields,p.shield+1);}
function cdBanishThreshold_(episode,c){
  var levels=Array.isArray(c&&c.banishThresholds)&&c.banishThresholds.length>=4?c.banishThresholds:CD_DEFAULTS_.banishThresholds;
  episode=Math.max(1,cdNum_(episode,1));
  if(episode<=3)return cdNum_(levels[0],5);
  if(episode<=6)return cdNum_(levels[1],4);
  if(episode<=9)return cdNum_(levels[2],3);
  return cdNum_(levels[3],2);
}
function cdAddBanish_(p,amount){p.banish=Math.max(0,cdNum_(p.banish,0)+Math.max(0,cdNum_(amount,0)));return p.banish;}
function cdEligibleCast_(c,episode,includePast){
  var cast=realityTvContestantsForSeason_(c.seasonId);
  return cast.filter(function(item){return includePast||(!item.EliminatedEpisode||cdNum_(item.EliminatedEpisode,0)>=episode);}).map(function(item){
    return {id:String(item.ContestantId),name:String(item.Name||item.FullName||'Contestant'),role:String(c.roles[item.ContestantId]||'UNKNOWN').toUpperCase()};
  });
}
function cdEffectiveRole_(contestant){return contestant.role==='TRAITOR'?'TRAITOR':'FAITHFUL';}
function cdPrepareTraitorMatch_(m,cast,r){
  if(!m||r.finale||m.role!=='TRAITOR'||m.kind==='MASK')return m;
  var traitors=cast.filter(function(t){return cdEffectiveRole_(t)==='TRAITOR';}).map(function(t){return {id:t.id,name:t.name};});
  m.traitorCandidates=traitors;
  m.traitorActualId=m.contestantId;
  m.traitorActualName=m.opponent;
  m.fateSafeSlot=Math.random()<.5?1:2;
  m.traitorStage=traitors.length>1?'IDENTIFY':'FATE';
  m.status=traitors.length>1?'IDENTIFY_REQUIRED':'FATE_REQUIRED';
  m.identityGuess='';m.identityCorrect=null;m.identityRevealed=traitors.length<=1;
  m.fateResult='';m.traitorSafe=false;m.traitorAttack=false;
  return m;
}
function cdBotMatch_(c,r,p,n,type,cast,exclude){
  var filtered=cast.filter(function(t){return !exclude[t.id];});
  var pool=filtered.length?filtered:cast,selected=null,kind=type;
  if(type==='ALLIANCE_ANY'||type==='ALLIANCE_FAITHFUL'||type==='ALLIANCE_TRAITOR'){
    var allies=pool.filter(function(t){return p.alliance.indexOf(t.id)!==-1&&(type==='ALLIANCE_ANY'||cdEffectiveRole_(t)===(type==='ALLIANCE_TRAITOR'?'TRAITOR':'FAITHFUL'));});
    if(!allies.length)allies=pool.filter(function(t){return p.alliance.indexOf(t.id)!==-1;});
    if(allies.length)selected=cdRandom_(allies);else kind='FAITHFUL';
  }
  if(!selected&&type==='TV'&&pool.length)selected=cdRandom_(pool);
  if(!selected&&(type==='FAITHFUL'||type==='TRAITOR'||kind==='FAITHFUL')){
    var want=type==='TRAITOR'?'TRAITOR':'FAITHFUL',options=pool.filter(function(t){return cdEffectiveRole_(t)===want;});
    if(options.length)selected=cdRandom_(options);else kind='GUARD';
  }
  if(selected)exclude[selected.id]=true;
  if(type==='MASK'){var available=c.wagerOptions.filter(function(w){return w<=p.wallet;});kind='MASK';}
  var answer=cdChoice_(),allied=!!(selected&&p.alliance.indexOf(selected.id)!==-1);
  var m={id:r.key+'-'+p.user+'-'+n,user:p.user,number:n,kind:kind,contestantId:selected?selected.id:'',opponent:selected?selected.name:kind==='HOST'?'The Host':kind==='MASK'?'The Masked':'Castle Guard',role:selected?cdEffectiveRole_(selected):'FAITHFUL',allied:allied,answer:answer,clue:allied?cdClue_(answer):'',choice:'',guess:'',status:'OPEN',wager:type==='MASK'&&available.length?cdRandom_(available):0,outcome:'',target:'',points:0,banishAdded:0};
  return cdPrepareTraitorMatch_(m,cast,r);
}
function cdPublicMatch_(m,settled){
  var hiddenTraitor=m.traitorStage&&m.identityRevealed!==true&&m.role==='TRAITOR';
  var result={id:m.id,number:m.number,kind:m.kind,opponent:hiddenTraitor?'A Traitor':m.opponent,allied:hiddenTraitor?false:m.allied,clue:hiddenTraitor?'':m.clue,token:m.token||'',choice:m.choice,guess:m.guess,status:m.status,wager:m.wager,points:m.status==='SETTLED'?m.points:null,banishAdded:m.banishAdded||0};
  if(m.traitorStage){
    result.traitorStage=m.traitorStage;result.identityGuess=m.identityGuess||'';result.identityCorrect=m.identityCorrect;result.identityRevealed=!!m.identityRevealed;result.traitorSafe=!!m.traitorSafe;result.fateResult=m.fateResult||'';
    if(m.status==='IDENTIFY_REQUIRED')result.traitorCandidates=(m.traitorCandidates||[]).map(function(x){return {id:x.id,name:x.name};});
    if(m.identityCorrect===false&&m.status!=='SETTLED')result.opponent='A Traitor';
  }
  if(m.kind==='MASK'&&m.status!=='OPEN'){
    result.outcome=m.outcome;
    if(m.outcome==='HOST'&&m.hostReward)result.hostReward=m.hostReward;
    if(m.outcome==='TRAITOR'&&m.fateResult)result.fateResult=m.fateResult;
  }
  if(m.status==='SETTLED'||settled){result.answer=m.answer;result.role=m.role;}
  return result;
}
function cdGameId_(payload){var id=String(payload.gameId||'').trim();cdAssert_(id&&id.length<150,'Select a Castle Duel game.');return id;}
function apiAdminCastleDuelConfigure(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),season=realityTvGetSeasonByGameId_(gameId);cdAssert_(season,'Configure Castle Duel using a Reality TV season game ID.');
  var prior=cdRead_('CastleDuelGames',gameId),config=Object.assign({},CD_DEFAULTS_,prior?prior.data:{});
  if(!Array.isArray(config.wagerOptions))config.wagerOptions=CD_DEFAULTS_.wagerOptions.slice();
  if(!Array.isArray(config.banishThresholds))config.banishThresholds=CD_DEFAULTS_.banishThresholds.slice();
  var allowed=['encounters','lives','startingPoints','weeklyJackpot','startingJackpot','maskChance','hostChance','lateEntryCutoff','minEpisodesFinale','humanChance','maxShields','murderBonus'];
  allowed.forEach(function(k){if(payload[k]!==undefined){var n=cdNum_(payload[k],NaN);cdAssert_(Number.isInteger(n)&&n>=0&&n<=10000,'Invalid '+k);config[k]=n;}});
  cdAssert_(config.maskChance+config.hostChance<=100,'Encounter probabilities exceed 100%.');
  cdAssert_(config.encounters>=1&&config.lives>=1&&config.lateEntryCutoff>=1&&config.minEpisodesFinale>=1,'Encounters, lives and entry requirements must be positive.');
  if(payload.finaleCounts){var counts=payload.finaleCounts,keys=Object.keys(CD_DEFAULTS_.finaleCounts),sum=0;keys.forEach(function(k){var n=cdNum_(counts[k],NaN);cdAssert_(Number.isInteger(n)&&n>=0&&n<=10,'Invalid finale count: '+k);sum+=n;});cdAssert_(sum===10,'Finale encounters must total 10.');config.finaleCounts=keys.reduce(function(o,k){o[k]=Number(counts[k]);return o;},{});}
  if(payload.roles){var cast=realityTvContestantsForSeason_(season.SeasonId),valid={};cast.forEach(function(x){valid[String(x.ContestantId)]=true;});Object.keys(payload.roles).forEach(function(id){cdAssert_(valid[id],'Unknown contestant role ID.');cdAssert_(['TRAITOR','FAITHFUL','UNKNOWN'].indexOf(payload.roles[id])>=0,'Invalid contestant role.');});config.roles=Object.assign({},config.roles,payload.roles);}
  config.gameId=gameId;config.seasonId=season.SeasonId;config.enabled=true;
  if(!prior){config.jackpot=config.startingJackpot;config.phase='REGULAR';}
  else cdAssert_(config.seasonId===season.SeasonId,'Season cannot be changed.');
  cdSaveConfig_(gameId,config);return {success:true,config:config};
});}
function apiCastleDuelGetState(payload){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),username=payload.username,p=cdPlayer_(gameId,username),rounds=cdRounds_(gameId),r=rounds.length?rounds[rounds.length-1]:null;
  var matches=p&&r?cdMatches_(gameId,r.key).filter(function(m){return cdKey_(m.user)===cdKey_(username);}).sort(function(a,b){return a.number-b.number;}):[];
  var realityCast=realityTvContestantsForSeason_(c.seasonId)||[],castById={};
  realityCast.forEach(function(x){castById[String(x.ContestantId||'')]=x;});
  var profileCache={};
  function publicProfile(user){
    var key=cdKey_(user);
    if(!profileCache[key])profileCache[key]=cdPublicProfile_(user,gameId);
    return profileCache[key];
  }
  var publicPlayers=cdPlayers_(gameId).map(function(q){
    var profile=publicProfile(q.user);
    return {
      user:q.user,
      displayName:profile.name,
      imageUrl:profile.imageUrl,
      lives:q.publicLives===undefined?q.lives:q.publicLives,
      points:q.points,
      episodesPlayed:q.episodesPlayed,
      finalePoints:c.phase==='COMPLETE'?q.finalePoints:undefined
    };
  });
  var ownEvent=r&&r.status==='SETTLED'&&r.announcement&&r.announcement.events?r.announcement.events.find(function(e){return cdKey_(e.victim)===cdKey_(username);}):null;
  var murderHistory=c.phase==='COMPLETE'?rounds.filter(function(x){return !x.finale;}).reduce(function(history,round){var events=round.announcement&&round.announcement.events||[];cdMatches_(gameId,round.key).forEach(function(m){if(m.kind==='MASK'&&m.outcome==='MURDERER'&&m.target){var victimEvent=events.find(function(e){return cdKey_(e.victim)===cdKey_(m.target);});history.push({episode:round.number,murderer:m.user,victim:m.target,lifeLost:!!(victimEvent&&victimEvent.lost),shieldUsed:!!(victimEvent&&victimEvent.shieldUsed)});}});return history;},[]):null;
  var threshold=cdBanishThreshold_(r?r.number:1,c);
  return {success:true,config:{gameId:gameId,seasonId:c.seasonId,phase:c.phase,encounters:c.encounters,startingPoints:c.startingPoints,jackpot:c.jackpot,finaleCounts:c.finaleCounts,banishThreshold:threshold,banishThresholds:c.banishThresholds},player:p?{user:p.user,lives:p.lives,shield:p.shield,banish:cdNum_(p.banish,0),points:p.points,wallet:p.wallet,alliance:p.alliance,joinedRound:p.joinedRound,episodesPlayed:p.episodesPlayed,finaleTokens:p.finaleTokens,finaleLives:p.finaleLives,finaleShield:p.finaleShield,finalePoints:p.finalePoints}:null,
    cast:cdEligibleCast_(c,r?r.number:1,true).map(function(x){
      var row=castById[String(x.id)]||{};
      return {
        id:x.id,
        name:x.name,
        imageUrl:String(row.ImageUrl||'').trim(),
        active:!r||cdEligibleCast_(c,r.number,false).some(function(z){return z.id===x.id;})
      };
    }),
    round:r?{key:r.key,number:r.number,status:r.status,lockAt:r.lockAt,finale:r.finale,announcement:r.status==='OPEN'?r.announcement||null:null}:null,
    matches:matches.map(function(m){
      var out=cdPublicMatch_(m,r&&r.status==='SETTLED');

      // Never leak the identity or photo of a still-hidden Traitor.
      if(out.opponent==='A Traitor')return out;

      if(m.kind==='HUMAN'){
        var humanProfile=publicProfile(m.opponentUser||m.opponent);
        out.opponent=humanProfile.name||out.opponent;
        out.profileImageUrl=humanProfile.imageUrl||'';
      }else if(m.contestantId&&castById[String(m.contestantId)]){
        var castRow=castById[String(m.contestantId)];
        out.opponent=String(castRow.Name||castRow.FullName||out.opponent||'Contestant');
        out.imageUrl=String(castRow.ImageUrl||'').trim();
      }

      return out;
    }),leaderboard:publicPlayers,
    announcement:r&&r.status==='OPEN'?r.announcement||null:null,privateNotice:ownEvent?{lost:ownEvent.lost,shieldUsed:ownEvent.shieldUsed,source:ownEvent.source,banishLife:!!ownEvent.banishLife}:null,
    finale:c.phase==='COMPLETE'?{winner:c.winner,jackpot:c.winnerJackpot,murderHistory:murderHistory}:null};
}
function apiCastleDuelJoin(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),user=String(payload.username||'').trim();cdAssert_(user,'Login required.');
  var prior=cdPlayer_(gameId,user);if(prior){if(prior.banish===undefined){prior.banish=0;cdSavePlayer_(gameId,prior);}return {success:true,player:prior,alreadyJoined:true};}
  var rounds=cdRounds_(gameId),r=rounds.slice(-1)[0],next=r?r.number+1:1;cdAssert_(c.phase==='REGULAR'&&next<=c.lateEntryCutoff,'Castle Duel registration is closed.');
  var cast=cdEligibleCast_(c,next,true),ids=cast.map(function(x){return x.id;}),alliance=payload.alliance;
  cdAssert_(Array.isArray(alliance)&&alliance.length===5&&new Set(alliance).size===5&&alliance.every(function(id){return ids.indexOf(String(id))!==-1;}),'Select five different TV contestants.');
  var active=cdPlayers_(gameId).filter(function(x){return x.lives>0;}).map(function(x){return x.lives;}).sort(function(a,b){return a-b;});
  var startLives=active.length?active[Math.floor((active.length-1)/2)]:c.lives;
  var p={user:user,alliance:alliance.map(String),joinedRound:next,lives:startLives,publicLives:startLives,shield:0,banish:0,wallet:c.startingPoints,points:0,episodesPlayed:0,murderCredits:0,finaleTokens:0,finalePoints:0,finaleLives:1,finaleShield:0};
  cdSavePlayer_(gameId,p);return {success:true,player:p};
});}
function apiAdminCastleDuelOpenRound(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),rounds=cdRounds_(gameId),number=rounds.length?rounds[rounds.length-1].number+1:1;
  cdAssert_(c.phase==='REGULAR','Regular season is closed.');cdAssert_(!rounds.length||rounds[rounds.length-1].status==='SETTLED','Settle the previous episode first.');
  var deadline=new Date(payload.lockAt);cdAssert_(!isNaN(deadline.getTime())&&deadline.getTime()>Date.now(),'Choose a future lock deadline.');
  var players=cdShuffle_(cdPlayers_(gameId).filter(function(p){return p.joinedRound<=number;}));cdAssert_(players.length,'No registered Castle Duel players.');
  var cast=cdEligibleCast_(c,number,false),key='E'+number,round={key:key,number:number,lockAt:deadline.toISOString(),status:'OPEN',finale:false,announcement:rounds.length?rounds[rounds.length-1].announcement:null};
  players.forEach(function(p){p.publicLives=p.lives;if(p.banish===undefined)p.banish=0;cdSavePlayer_(gameId,p);});
  var humanSlots={};for(var i=0;i+1<players.length;i+=2){if(Math.random()*100<c.humanChance){humanSlots[players[i].user]=players[i+1].user;humanSlots[players[i+1].user]=players[i].user;}}
  players.forEach(function(p){var used={};for(var n=1;n<=c.encounters;n++){
    var m,partner=n===1?humanSlots[p.user]:null;
    if(partner){m=cdBotMatch_(c,round,p,n,'GUARD',cast,used);m.kind='HUMAN';m.opponent=partner;m.opponentUser=partner;m.clue='';m.allied=false;m.status='OPEN';delete m.traitorStage;delete m.traitorCandidates;}
    else{var roll=Math.random()*100,kind=roll<c.maskChance?'MASK':roll<c.maskChance+c.hostChance?'HOST':'TV';m=cdBotMatch_(c,round,p,n,kind,cast,used);}
    cdMatchWrite_(gameId,key,m);
  }});
  c.jackpot+=c.weeklyJackpot;cdSaveConfig_(gameId,c);cdSaveRound_(gameId,round);return {success:true,round:key,count:players.length};
});}
function cdAssertOpen_(r){cdAssert_(r&&r.status==='OPEN','This Castle round is closed.');cdAssert_(Date.now()<new Date(r.lockAt).getTime(),'This Castle round is locked.');}
function cdGetUserMatch_(gameId,roundKey,matchId,user){var r=cdRound_(gameId,roundKey);cdAssertOpen_(r);var m=cdMatches_(gameId,roundKey).find(function(x){return x.id===matchId&&cdKey_(x.user)===cdKey_(user);});cdAssert_(m,'Your encounter was not found.');return {r:r,m:m};}
function apiCastleDuelSubmit(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),user=payload.username,x=cdGetUserMatch_(gameId,payload.roundKey,payload.matchId,user),m=x.m;
  cdAssert_(m.kind!=='MASK','Use the Masked encounter action.');
  var step=String(payload.step||'').toUpperCase();
  if(m.status==='IDENTIFY_REQUIRED'&&m.traitorStage==='IDENTIFY'){
    cdAssert_(step==='TRAITOR_IDENTITY','Name the Traitor before making a duel decision.');
    var traitorId=String(payload.traitorId||''),candidate=(m.traitorCandidates||[]).find(function(t){return String(t.id)===traitorId;});cdAssert_(candidate,'Choose one of the active Traitors.');
    m.identityGuess=traitorId;m.identityCorrect=traitorId===String(m.traitorActualId||m.contestantId);
    if(m.identityCorrect){m.identityRevealed=true;m.traitorSafe=true;m.traitorStage='DUEL';m.status='OPEN';m.opponent=m.traitorActualName||m.opponent;}
    else{m.identityRevealed=false;m.traitorSafe=false;m.traitorStage='FATE';m.status='FATE_REQUIRED';if(!m.fateSafeSlot)m.fateSafeSlot=Math.random()<.5?1:2;}
    cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};
  }
  if(m.status==='FATE_REQUIRED'&&m.traitorStage==='FATE'){
    cdAssert_(step==='TRAITOR_FATE','Choose one of the two sealed fate cards.');var slot=Number(payload.fateSlot);cdAssert_(slot===1||slot===2,'Choose a sealed fate card.');
    m.fateChoice=slot;m.fateResult=slot===Number(m.fateSafeSlot)?'SAFE':'MURDERED';m.traitorAttack=m.fateResult==='MURDERED';m.traitorStage='DONE';m.status='LOCKED';
    cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};
  }
  cdAssert_(m.status==='OPEN','This encounter is already submitted.');
  var choice=String(payload.choice||'').toUpperCase(),guess=String(payload.guess||'').toUpperCase();cdAssert_(['COOPERATE','BETRAY'].indexOf(choice)>=0&&['COOPERATE','BETRAY'].indexOf(guess)>=0,'Choose a decision and opponent prediction.');
  m.choice=choice;m.guess=guess;if(m.traitorStage==='DUEL')m.traitorSafe=true;m.status='LOCKED';cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};
});}
function apiCastleDuelMaskedAccept(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),x=cdGetUserMatch_(gameId,payload.roundKey,payload.matchId,payload.username),m=x.m,c=cdConfig_(gameId),p=cdPlayer_(gameId,payload.username);cdAssert_(m.kind==='MASK','This is not a Masked Encounter.');
  var step=String(payload.step||'').toUpperCase();
  if(m.status==='FATE_REQUIRED'&&m.outcome==='TRAITOR'){
    if(!step)return {success:true,match:cdPublicMatch_(m,false),alreadyDecided:true};
    cdAssert_(step==='FATE','Choose one of the two sealed fate cards.');var fateSlot=Number(payload.fateSlot);cdAssert_(fateSlot===1||fateSlot===2,'Choose a sealed fate card.');
    m.fateChoice=fateSlot;m.fateResult=fateSlot===Number(m.fateSafeSlot)?'SAFE':'MURDERED';m.traitorAttack=m.fateResult==='MURDERED';m.status='LOCKED';cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false),shieldProjected:m.traitorAttack&&cdNum_(p.shield,0)>0};
  }
  if(m.status==='HOST_REQUIRED'&&m.outcome==='HOST'){
    if(!step)return {success:true,match:cdPublicMatch_(m,false),alreadyDecided:true};
    cdAssert_(step==='HOST','Choose one Host envelope.');var hostSlot=Number(payload.hostSlot);cdAssert_(hostSlot>=1&&hostSlot<=3,'Choose a Host envelope.');
    var reward=(m.hostRewards||[])[hostSlot-1];cdAssert_(reward,'Host reward was not prepared.');m.hostChoice=hostSlot;m.hostReward=reward;m.status='LOCKED';
    p.wallet+=m.wager;
    if(reward==='GOLD'){m.points=m.wager;}
    else if(reward==='PROTECTION'){cdRewardLife_(p,c);}
    else if(reward==='MERCY'){p.banish=0;}
    cdSavePlayer_(gameId,p);cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};
  }
  if(m.status==='MASK_DUEL_REQUIRED'&&m.outcome==='FAITHFUL'){
    if(!step)return {success:true,match:cdPublicMatch_(m,false),alreadyDecided:true};
    cdAssert_(step==='FAITHFUL_DUEL','Complete the Faithful trust duel.');var choice=String(payload.choice||'').toUpperCase(),guess=String(payload.guess||'').toUpperCase();cdAssert_(['COOPERATE','BETRAY'].indexOf(choice)>=0&&['COOPERATE','BETRAY'].indexOf(guess)>=0,'Choose a decision and opponent prediction.');
    m.choice=choice;m.guess=guess;m.status='LOCKED';cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};
  }
  if(m.status!=='OPEN')return {success:true,match:cdPublicMatch_(m,false),alreadyDecided:true};
  if(payload.accept!==true){m.status='DECLINED';m.declined=true;cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};}
  var wager=m.wager;cdAssert_(wager>0,'Insufficient Castle Points for the minimum wager.');
  var cast=cdEligibleCast_(c,x.r.number,x.r.finale),faithful=cast.filter(function(t){return t.role==='FAITHFUL';}),traitors=cast.filter(function(t){return t.role==='TRAITOR';});
  var outcomes=['HOST','MURDERER'];if(faithful.length)outcomes.push('FAITHFUL');if(traitors.length)outcomes.push('TRAITOR');
  p.wallet-=wager;if(!x.r.finale)c.jackpot+=wager/2;m.outcome=cdRandom_(outcomes);
  if(m.outcome==='FAITHFUL'||m.outcome==='TRAITOR'){var actual=cdRandom_(m.outcome==='TRAITOR'?traitors:faithful);m.opponent=actual.name;m.contestantId=actual.id;m.role=m.outcome;}
  if(x.r.finale&&m.outcome==='MURDERER')m.outcome='SOLO_SHIELD';
  if(m.outcome==='MURDERER')m.status='TARGET_REQUIRED';
  else if(m.outcome==='TRAITOR'){m.status='FATE_REQUIRED';m.fateSafeSlot=Math.random()<.5?1:2;m.fateResult='';}
  else if(m.outcome==='HOST'){m.status='HOST_REQUIRED';m.hostRewards=cdShuffle_(['GOLD','PROTECTION','MERCY']);}
  else if(m.outcome==='FAITHFUL'){m.status='MASK_DUEL_REQUIRED';}
  else m.status='LOCKED';
  cdSavePlayer_(gameId,p);cdSaveConfig_(gameId,c);cdMatchWrite_(gameId,x.r.key,m);return {success:true,match:cdPublicMatch_(m,false)};
});}
function apiCastleDuelTarget(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),x=cdGetUserMatch_(gameId,payload.roundKey,payload.matchId,payload.username),m=x.m;cdAssert_(m.kind==='MASK'&&m.outcome==='MURDERER','No Murderer Card is available.');
  if(m.status==='LOCKED')return {success:true,alreadySubmitted:true};cdAssert_(m.status==='TARGET_REQUIRED','This Murderer Card was already resolved.');
  var target=cdPlayer_(gameId,payload.targetUsername);cdAssert_(target&&cdKey_(target.user)!==cdKey_(payload.username)&&target.lives>0&&target.joinedRound<=x.r.number,'Select a different active human player.');
  m.target=target.user;m.status='LOCKED';cdMatchWrite_(gameId,x.r.key,m);return {success:true};
});}
function cdMatchParticipated_(m){return !!(m.choice||m.identityGuess||m.fateResult||m.hostReward||m.target||m.kind==='MASK'&&(m.outcome||m.declined));}
function cdSettleDuel_(m,c,p,other,traitor){
  var normal=cdScore_(m.choice,other),correct=m.guess===other;m.banishAdded=0;
  if(!correct){m.points=0;cdAddBanish_(p,1);m.banishAdded=1;return;}
  m.points=traitor?Math.max(10,normal*2,0):normal+c.bonusClue;
  if(m.allied){m.points+=c.bonusAlliance;p.allianceHits=(p.allianceHits||0)+1;}
}
function cdSettleMatch_(m,all,c,p,round){
  if(m.status==='SETTLED')return;
  if(m.kind==='MASK'){
    if(m.status==='TARGET_REQUIRED'){var options=all.filter(function(x){return x.lives>0&&x.joinedRound<=round.number&&cdKey_(x.user)!==cdKey_(p.user);});if(options.length)m.target=cdRandom_(options).user;else m.outcome='SOLO_SHIELD';}
    if(['DECLINED','OPEN','FATE_REQUIRED','HOST_REQUIRED','MASK_DUEL_REQUIRED'].indexOf(m.status)>=0){m.points=0;}
    else if(m.outcome==='TRAITOR'){m.points=0;if(m.traitorAttack||!m.fateResult){p.attacked=true;p.tvAttacked=true;}}
    else if(m.outcome==='MURDERER'){p.wallet+=m.wager;m.points=0;}
    else if(m.outcome==='SOLO_SHIELD'){p.wallet+=m.wager;cdRewardLife_(p,c);m.points=0;}
    else if(m.outcome==='HOST'){m.points=cdNum_(m.points,0);}
    else if(m.outcome==='FAITHFUL'){
      var correct=m.guess===m.answer;cdSettleDuel_(m,c,p,m.answer,false);if(correct)p.wallet+=m.wager;
    }
  }else if(m.status==='LOCKED'){
    if(m.traitorStage==='DONE'&&m.fateResult){m.points=0;if(m.traitorAttack){p.attacked=true;p.tvAttacked=true;}}
    else{
      var other=m.answer;if(m.kind==='HUMAN'){var counterpart=cdMatches_(c.gameId,round.key).find(function(x){return x.user===m.opponentUser&&x.opponentUser===m.user&&x.number===m.number;});other=counterpart&&counterpart.status==='LOCKED'?counterpart.choice:m.answer;if(!counterpart||counterpart.status!=='LOCKED')m.opponent='Castle Guard (substitute)';}
      if(m.traitorStage==='DUEL'){cdSettleDuel_(m,c,p,other,true);}
      else if(m.role==='TRAITOR'&&!m.traitorStage){var normal=cdScore_(m.choice,other),legacyCorrect=m.guess===other;if(legacyCorrect)m.points=Math.max(10,normal*2,0);else{m.points=0;p.attacked=true;p.tvAttacked=true;}}
      else cdSettleDuel_(m,c,p,other,false);
      if(m.kind==='HOST'&&m.points>0)cdRewardLife_(p,c);
      p.wallet=Math.max(0,p.wallet+m.points);
    }
  }else m.points=0;
  m.status='SETTLED';p.points+=cdNum_(m.points,0);
}
function apiAdminCastleDuelSettleRound(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),rounds=cdRounds_(gameId),r=rounds.slice(-1)[0];cdAssert_(r&&!r.finale,'No regular episode to settle.');
  if(r.status==='SETTLED')return {success:true,alreadySettled:true,announcement:r.announcement};cdAssert_(Date.now()>=new Date(r.lockAt).getTime(),'Cannot settle before the lock deadline.');
  var people=cdPlayers_(gameId),matches=cdMatches_(gameId,r.key),affected=people.filter(function(p){return matches.some(function(m){return m.user===p.user;});});
  affected.forEach(function(p){p.attacked=false;p.tvAttacked=false;p.allianceHits=p.allianceHits||0;p.banish=cdNum_(p.banish,0);var mine=matches.filter(function(m){return m.user===p.user;});mine.forEach(function(m){cdSettleMatch_(m,people,c,p,r);});p.missed=!mine.some(cdMatchParticipated_);if(p.missed)p.attacked=true;if(!p.missed)p.episodesPlayed+=1;p.banishLifePending=p.banish>=cdBanishThreshold_(r.number,c);if(p.banishLifePending)p.banish=0;});
  var attacks=[];matches.forEach(function(m){if(m.kind==='MASK'&&m.outcome==='MURDERER'&&m.target)attacks.push({actor:m.user,target:m.target,matchId:m.id});});
  var events=[];affected.forEach(function(p){var userAttacks=attacks.filter(function(a){return cdKey_(a.target)===cdKey_(p.user);}),murderAttempt=p.attacked||userAttacks.length>0,banishHit=!!p.banishLifePending;if(!murderAttempt&&!banishHit)return;
    var oldLives=p.lives,shielded=false;
    if(banishHit){if(p.lives>0)p.lives--;}
    else if(p.missed){if(p.lives>0)p.lives--;}
    else if(p.shield>0){p.shield--;shielded=true;}
    else if(p.lives>0)p.lives--;
    var lost=p.lives<oldLives;
    if(lost&&!banishHit)userAttacks.forEach(function(a){var murderer=affected.find(function(x){return cdKey_(x.user)===cdKey_(a.actor);});if(murderer)murderer.murderCredits+=1;});
    var source=banishHit?(userAttacks.length||p.tvAttacked?'BANISH+BOTH':'BANISH'):(userAttacks.length?(p.tvAttacked?'BOTH':'HUMAN'):(p.tvAttacked?'TV':'ABSENCE'));
    events.push({victim:p.user,lost:lost?1:0,shieldUsed:shielded,source:source,banishLife:banishHit});
  });
  affected.forEach(function(p){if(!p.missed&&p.lives>0&&!p.banishLifePending&&p.banish>0)p.banish=Math.max(0,p.banish-1);p.banishLifePending=false;cdSavePlayer_(gameId,p);});
  matches.forEach(function(m){cdMatchWrite_(gameId,r.key,m);});r.status='SETTLED';r.announcement={episode:r.number,events:events};cdSaveRound_(gameId,r);return {success:true,announcement:r.announcement};
});}
function apiAdminCastleDuelOpenFinale(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),rounds=cdRounds_(gameId);cdAssert_(c.phase==='REGULAR','Finale already started.');cdAssert_(rounds.length&&rounds[rounds.length-1].status==='SETTLED','Settle the regular season first.');
  var players=cdPlayers_(gameId).filter(function(p){return p.lives>0&&p.episodesPlayed>=c.minEpisodesFinale;}).sort(function(a,b){return b.lives-a.lives||(b.points/Math.max(1,b.episodesPlayed)-a.points/Math.max(1,a.episodesPlayed));}).slice(0,3);cdAssert_(players.length,'No eligible finalists.');
  var deadline=new Date(payload.lockAt);cdAssert_(!isNaN(deadline.getTime())&&deadline.getTime()>Date.now(),'Choose a future finale deadline.');
  var r={key:'FINAL',number:rounds.length+1,lockAt:deadline.toISOString(),status:'OPEN',finale:true,finalists:players.map(function(p){return p.user;}),announcement:rounds[rounds.length-1].announcement||null},cast=cdEligibleCast_(c,r.number,true),types=[];
  Object.keys(c.finaleCounts).forEach(function(k){for(var i=0;i<c.finaleCounts[k];i++)types.push(k.toUpperCase().replace('ALLIANCEFAITHFUL','ALLIANCE_FAITHFUL').replace('ALLIANCETRAITOR','ALLIANCE_TRAITOR').replace('ALLIANCEANY','ALLIANCE_ANY'));});
  players.forEach(function(p){p.publicLives=p.lives;p.finaleLives=1;p.finalePoints=0;p.finaleTokens=Math.min(c.maxTokens,Math.floor(Math.max(0,p.points)/c.pointsPerToken));p.finaleShield=Math.min(1,p.shield);var used={};cdShuffle_(types).forEach(function(type,i){if(type==='FORMER')type='GUARD';var m=cdBotMatch_(c,r,p,i+1,type,cast,used);m.finale=true;m.status='OPEN';delete m.traitorStage;delete m.traitorCandidates;cdMatchWrite_(gameId,r.key,m);});cdSavePlayer_(gameId,p);});
  c.phase='FINAL';cdSaveConfig_(gameId,c);cdSaveRound_(gameId,r);return {success:true,finalists:r.finalists};
});}
function apiCastleDuelFinaleToken(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),x=cdGetUserMatch_(gameId,'FINAL',payload.matchId,payload.username),m=x.m,p=cdPlayer_(gameId,payload.username),power=String(payload.power||'').toUpperCase();
  cdAssert_(c.phase==='FINAL'&&m.status==='OPEN','Finale token can only be used before submitting.');cdAssert_(['CLUE','DOUBLE','SHIELD'].indexOf(power)>=0,'Unknown finale power.');var cost=power==='SHIELD'?2:1;cdAssert_(p.finaleTokens>=cost,'Not enough finale tokens.');cdAssert_(!m.token,'Only one token per encounter.');p.finaleTokens-=cost;m.token=power;if(power==='CLUE')m.clue=cdClue_(m.answer);if(power==='SHIELD')p.finaleShield=1;cdSavePlayer_(gameId,p);cdMatchWrite_(gameId,'FINAL',m);return {success:true,match:cdPublicMatch_(m,false)};
});}
function apiAdminCastleDuelSettleFinale(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),r=cdRound_(gameId,'FINAL');cdAssert_(r,'Finale has not started.');if(r.status==='SETTLED')return {success:true,alreadySettled:true,winner:c.winner};cdAssert_(c.phase==='FINAL','Finale is not open.');cdAssert_(Date.now()>=new Date(r.lockAt).getTime(),'Cannot settle before finale lock.');
  var all=cdPlayers_(gameId),players=all.filter(function(p){return r.finalists.indexOf(p.user)>=0;}),matches=cdMatches_(gameId,'FINAL');
  players.forEach(function(p){matches.filter(function(m){return m.user===p.user;}).sort(function(a,b){return a.number-b.number;}).forEach(function(m){var points=0,hit=false;if(m.kind==='MASK'){if(m.status!=='DECLINED'&&m.wager){points=m.outcome==='HOST'||m.outcome==='FAITHFUL'?m.wager:0;if(m.outcome==='HOST'||m.outcome==='FAITHFUL')p.wallet+=m.wager*2;else if(m.outcome==='SOLO_SHIELD'){p.wallet+=m.wager;p.finaleShield=1;}if(m.outcome==='TRAITOR')hit=true;if(m.outcome==='HOST')p.finaleShield=1;}}else if(m.status==='LOCKED'){var correct=m.guess===m.answer,normal=cdScore_(m.choice,m.answer);if(m.role==='TRAITOR'){if(!correct)hit=true;else points=Math.max(10,normal*2,0);}else points=normal+(correct?c.bonusClue:0);if(m.allied&&correct)points+=c.bonusAlliance;if(m.kind==='HOST'&&normal>0)p.finaleShield=1;if(m.token==='DOUBLE'&&points>0&&correct)points*=2;}if(hit){if(p.finaleShield>0)p.finaleShield--;else p.finaleLives=0;}if(p.finaleLives===0&&points>0)points=Math.floor(points/2);p.finalePoints+=points;m.points=points;m.status='SETTLED';cdMatchWrite_(gameId,'FINAL',m);});cdSavePlayer_(gameId,p);});
  players.sort(function(a,b){return b.finalePoints-a.finalePoints||b.finaleLives-a.finaleLives||b.points-a.points;});c.winner=players[0].user;c.phase='COMPLETE';c.winnerJackpot=c.jackpot;c.jackpot=0;all.forEach(function(p){p.points+=p.murderCredits*c.murderBonus;cdSavePlayer_(gameId,p);});r.status='SETTLED';cdSaveRound_(gameId,r);cdSaveConfig_(gameId,c);return {success:true,winner:c.winner,jackpot:c.winnerJackpot,results:players.map(function(p){return {user:p.user,points:p.finalePoints};})};
});}
function apiAdminCastleDuelGetSettings(payload){var gameId=cdGameId_(payload),c=cdConfig_(gameId);return {success:true,config:c,cast:cdEligibleCast_(c,1,true),players:cdPlayers_(gameId).length,rounds:cdRounds_(gameId).map(function(r){return {key:r.key,number:r.number,status:r.status,lockAt:r.lockAt,finale:r.finale};})};}
function apiCastleDuelFinaleAdvantage(payload){return cdLock_(function(){
  var gameId=cdGameId_(payload),c=cdConfig_(gameId),r=cdRound_(gameId,'FINAL'),p=cdPlayer_(gameId,payload.username);cdAssert_(c.phase==='FINAL'&&r&&r.status==='OPEN'&&r.finalists.indexOf(p.user)!==-1,'Finale not available.');cdAssert_(Date.now()<new Date(r.lockAt).getTime(),'Finale is locked.');
  var allowances=Math.min(c.maxMurderAdvantages,Math.floor(p.murderCredits/c.creditsPerMurderAdvantage));cdAssert_((p.usedMurderAdvantages||0)<allowances,'No murder advantage remaining.');var matches=cdMatches_(gameId,'FINAL').filter(function(m){return m.user===p.user;});cdAssert_(matches.every(function(m){return m.status==='OPEN';}),'Use murder advantages before submitting finale picks.');
  var power=String(payload.power||'').toUpperCase();if(power==='BANISH'){var candidates=matches.filter(function(m){return m.role==='TRAITOR'&&m.kind!=='MASK'&&m.kind!=='HOST';});cdAssert_(candidates.length,'No Traitor encounter remains to banish.');var old=cdRandom_(candidates),cast=cdEligibleCast_(c,r.number,true).filter(function(t){return t.role==='FAITHFUL';});cdAssert_(cast.length,'No known Faithful contestant is available.');var replacement=cdRandom_(cast);old.contestantId=replacement.id;old.opponent=replacement.name;old.role='FAITHFUL';old.kind='FAITHFUL';old.answer=cdChoice_();old.allied=p.alliance.indexOf(replacement.id)!==-1;old.clue=old.allied?cdClue_(old.answer):'';cdMatchWrite_(gameId,'FINAL',old);}else if(power==='RECRUIT'){var allCast=cdEligibleCast_(c,r.number,true),ally=allCast.find(function(t){return t.id===String(payload.contestantId||'');});cdAssert_(ally&&p.alliance.indexOf(ally.id)===-1&&p.alliance.length<7,'Select a new eligible alliance contestant.');p.alliance.push(ally.id);matches.forEach(function(m){if(m.contestantId===ally.id){m.allied=true;m.clue=cdClue_(m.answer);cdMatchWrite_(gameId,'FINAL',m);}});}else throw new Error('Choose Banish or Recruit.');p.usedMurderAdvantages=(p.usedMurderAdvantages||0)+1;cdSavePlayer_(gameId,p);return {success:true,remaining:allowances-p.usedMurderAdvantages};
});}
if (typeof module !== 'undefined' && module.exports) module.exports = {
  cdScore_,cdClue_,cdBotMatch_,cdRewardLife_,cdBanishThreshold_,cdAddBanish_,cdRead_,cdRound_,cdSaveRound_,cdMatches_,cdMatchWrite_,cdPlayer_,cdSavePlayer_,cdPlayers_,cdConfig_,
  apiAdminCastleDuelConfigure,apiAdminCastleDuelGetSettings,apiCastleDuelGetState,apiCastleDuelJoin,
  apiAdminCastleDuelOpenRound,apiCastleDuelSubmit,apiCastleDuelMaskedAccept,
  apiCastleDuelTarget,apiAdminCastleDuelSettleRound,apiAdminCastleDuelOpenFinale,
  apiCastleDuelFinaleToken,apiCastleDuelFinaleAdvantage,apiAdminCastleDuelSettleFinale
};
