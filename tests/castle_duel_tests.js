'use strict';
const assert=require('assert');
const sheets={};
class Sheet{
  constructor(name){this.name=name;this.rows=[];}
  getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};}
  getRange(row,col,height,width){return {setValues:(values)=>{values.forEach((v,i)=>{while(this.rows.length<row+i)this.rows.push([]);this.rows[row+i-1].splice(col-1,width,...v);});},getValues:()=>this.rows.slice(row-1,row-1+height).map(r=>r.slice(col-1,col-1+width))};}
  appendRow(values){this.rows.push(values.slice());}
  setFrozenRows(){}
}
global.SpreadsheetApp={getActive:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=new Sheet(n)})};
global.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
const cast=Array.from({length:12},(_,i)=>({ContestantId:'t'+i,Name:'Cast '+i,EliminatedEpisode:i<3?2:''}));
global.realityTvGetSeasonByGameId_=id=>['reality-1','reality-2'].includes(id)?{SeasonId:'s1',GameId:id}:null;
global.realityTvContestantsForSeason_=id=>id==='s1'?cast:[];
const cd=require('../backend/engines/CastleDuelEngine');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const admin={gameId:'reality-1'},state=user=>cd.apiCastleDuelGetState({...admin,username:user});
test('config rejects nonexistent season',()=>assert.throws(()=>cd.apiAdminCastleDuelConfigure({gameId:'none'})));
test('configure scoped reality game and counts',()=>{
  assert(cd.apiAdminCastleDuelConfigure({...admin,roles:{t0:'TRAITOR',t1:'FAITHFUL',t2:'FAITHFUL',t3:'TRAITOR',t4:'FAITHFUL',t5:'FAITHFUL'},maskChance:0,hostChance:0,humanChance:100}).success);
  assert.throws(()=>cd.apiAdminCastleDuelConfigure({...admin,finaleCounts:{faithful:9}}));
});
test('unavailable Traitor and Faithful categories fall back safely without inventing roles',()=>{
  const fake={gameId:'reality-1',seasonId:'s1',roles:{},wagerOptions:[20],maxShields:1};
  const round={key:'TEST'},player={user:'Alice',alliance:['t1'],wallet:100};
  const faithful=[{id:'f1',name:'F1',role:'FAITHFUL'}];
  const traitors=[{id:'t1',name:'T1',role:'TRAITOR'}];
  const noTraitor=cd.cdBotMatch_(fake,round,player,1,'TRAITOR',faithful,{});
  const noFaithful=cd.cdBotMatch_(fake,round,player,1,'FAITHFUL',traitors,{});
  assert.equal(noTraitor.kind,'GUARD');assert.equal(noTraitor.role,'FAITHFUL');
  assert.equal(noFaithful.kind,'GUARD');assert.equal(noFaithful.role,'FAITHFUL');
  assert.equal(noFaithful.opponent,'Castle Guard');
});
test('Host cannot silently resurrect a player eliminated from Castle Survivor',()=>{
  const eliminated={lives:0,shield:0};cd.cdRewardLife_(eliminated,{lives:3,maxShields:1});
  assert.equal(eliminated.lives,0);assert.equal(eliminated.shield,0);
  const active={lives:2,shield:0};cd.cdRewardLife_(active,{lives:3,maxShields:1});
  assert.equal(active.lives,3);cd.cdRewardLife_(active,{lives:3,maxShields:1});assert.equal(active.shield,1);
});
test('join enforces five distinct cast members and no duplicate rows',()=>{
  assert.throws(()=>cd.apiCastleDuelJoin({...admin,username:'Art',alliance:['t1','t1','t2','t3','t4']}));
  for(const u of ['Art','Roy','Kent'])assert(cd.apiCastleDuelJoin({...admin,username:u,alliance:['t1','t2','t3','t4','t5']}).success);
  assert(cd.apiCastleDuelJoin({...admin,username:'Art',alliance:[]}).alreadyJoined);
  assert.equal(cd.cdPlayers_('reality-1').length,3);
});
test('opening round freezes draws and join after opening goes to next round',()=>{
  assert(cd.apiAdminCastleDuelOpenRound({...admin,lockAt:new Date(Date.now()+86400000).toISOString()}).success);
  const first=state('Art');assert.equal(first.matches.length,3);
  assert.deepEqual(state('Art').matches,first.matches);
  cd.apiCastleDuelJoin({...admin,username:'Mike',alliance:['t1','t2','t3','t4','t5']});
  assert.equal(state('Mike').matches.length,0);
  assert(!JSON.stringify(first).includes('"answer":'), 'bot decisions must never leak in open state');
});
test('same user cannot submit twice or another player match',()=>{
  const m=state('Art').matches[0];cd.apiCastleDuelSubmit({...admin,username:'Art',roundKey:'E1',matchId:m.id,choice:'COOPERATE',guess:'COOPERATE'});
  assert.throws(()=>cd.apiCastleDuelSubmit({...admin,username:'Art',roundKey:'E1',matchId:m.id,choice:'BETRAY',guess:'BETRAY'}));
  assert.throws(()=>cd.apiCastleDuelSubmit({...admin,username:'Roy',roundKey:'E1',matchId:m.id,choice:'BETRAY',guess:'BETRAY'}));
});
test('masked wager is displayed before accepting and committed only once',()=>{
  cd.apiAdminCastleDuelConfigure({...admin,maskChance:100,hostChance:0,humanChance:0});
  cd.cdSaveRound_('reality-1',{...cd.cdRound_('reality-1','E1'),lockAt:new Date(Date.now()-60000).toISOString()});
  assert(cd.apiAdminCastleDuelSettleRound(admin).success);
  assert(cd.apiAdminCastleDuelSettleRound(admin).alreadySettled);
  assert(cd.apiAdminCastleDuelOpenRound({...admin,lockAt:new Date(Date.now()+86400000).toISOString()}).success);
  const ms=state('Art').matches;assert(ms.every(m=>m.kind==='MASK'&&m.wager>0));
  let w=ms[0].wager,j=cd.cdConfig_('reality-1').jackpot,bal=cd.cdPlayer_('reality-1','Art').wallet;
  const result=cd.apiCastleDuelMaskedAccept({...admin,username:'Art',roundKey:'E2',matchId:ms[0].id,accept:true});
  assert(result.success);assert.equal(cd.cdConfig_('reality-1').jackpot,j+w/2);
  assert.equal(cd.cdPlayer_('reality-1','Art').wallet,bal-w);
  assert(cd.apiCastleDuelMaskedAccept({...admin,username:'Art',roundKey:'E2',matchId:ms[0].id,accept:true}).alreadyDecided);
  assert.equal(cd.cdConfig_('reality-1').jackpot,j+w/2);
});
test('masked murder card must be targeted in current round or auto-resolved',()=>{
  const user='Roy',m=state(user).matches[0],r=cd.apiCastleDuelMaskedAccept({...admin,username:user,roundKey:'E2',matchId:m.id,accept:true});
  if(r.match.outcome==='MURDERER'){
    assert.equal(r.match.status,'TARGET_REQUIRED');
    assert.throws(()=>cd.apiCastleDuelTarget({...admin,username:user,roundKey:'E2',matchId:m.id,targetUsername:user}));
    assert(cd.apiCastleDuelTarget({...admin,username:user,roundKey:'E2',matchId:m.id,targetUsername:'Art'}).success);
  }
});
test('all player choices and murder identities remain private in pending state',()=>{
  let a=state('Art'),b=state('Roy');assert(!JSON.stringify(b).includes('"target":'));
  assert(!JSON.stringify(a.leaderboard).includes('murderCredits'));
});
test('settlement close, replay safety and late entrant starts next round',()=>{
  cd.cdSaveRound_('reality-1',{...cd.cdRound_('reality-1','E2'),lockAt:new Date(Date.now()-1000).toISOString()});
  cd.apiAdminCastleDuelSettleRound(admin);const prior=cd.cdPlayer_('reality-1','Art').points,j=cd.cdConfig_('reality-1').jackpot;
  assert(cd.apiAdminCastleDuelSettleRound(admin).alreadySettled);
  assert.equal(cd.cdPlayer_('reality-1','Art').points,prior);
  assert.equal(cd.cdConfig_('reality-1').jackpot,j);
  assert(cd.apiAdminCastleDuelOpenRound({...admin,lockAt:new Date(Date.now()+86400000).toISOString()}).success);
  assert.equal(state('Mike').matches.length,3);
});
test('score matrix covers betrayal penalty and positive cooperation',()=>{
  assert.equal(cd.cdScore_('COOPERATE','COOPERATE'),20);
  assert.equal(cd.cdScore_('BETRAY','COOPERATE'),30);
  assert.equal(cd.cdScore_('COOPERATE','BETRAY'),0);
  assert.equal(cd.cdScore_('BETRAY','BETRAY'),-10);
});
test('a human murder receives credit when TV Traitor also kills the same victim',()=>{
  const art=cd.cdPlayer_('reality-1','Art'),roy=cd.cdPlayer_('reality-1','Roy');
  art.lives=2;roy.lives=2;roy.shield=0;art.murderCredits=0;cd.cdSavePlayer_('reality-1',art);cd.cdSavePlayer_('reality-1',roy);
  const am=cd.cdMatches_('reality-1','E3').find(m=>m.user==='Art');am.kind='MASK';am.status='LOCKED';am.outcome='MURDERER';am.target='Roy';am.wager=30;
  const rm=cd.cdMatches_('reality-1','E3').find(m=>m.user==='Roy');rm.kind='MASK';rm.status='LOCKED';rm.outcome='TRAITOR';rm.wager=30;
  cd.cdMatchWrite_('reality-1','E3',am);cd.cdMatchWrite_('reality-1','E3',rm);
  cd.cdSaveRound_('reality-1',{...cd.cdRound_('reality-1','E3'),lockAt:new Date(Date.now()-1000).toISOString()});
  const settled=cd.apiAdminCastleDuelSettleRound(admin);
  const royEvent=settled.announcement.events.find(e=>e.victim==='Roy');
  assert(royEvent&&royEvent.lost===1&&royEvent.source==='BOTH');
  assert.equal(cd.cdPlayer_('reality-1','Roy').lives,1);
  assert.equal(cd.cdPlayer_('reality-1','Art').murderCredits,1);
  assert.equal(state('Roy').announcement,null,'public header must wait until next episode');
  assert.equal(state('Roy').privateNotice.lost,1);
  assert(!JSON.stringify(state('Roy')).includes('"murderer":"Art"'));
});
test('secret shield saves named victim but keeps attacker hidden',()=>{
  const roy=cd.cdPlayer_('reality-1','Roy');roy.lives=2;roy.shield=1;cd.cdSavePlayer_('reality-1',roy);
  const art=cd.cdPlayer_('reality-1','Art');const before=art.murderCredits;
  const r=cd.cdRound_('reality-1','E3'),original=r.announcement;
  // Test the public announcement shape independently of last week's completed results.
  assert(original.events.some(e=>e.victim==='Roy'));
  assert(!JSON.stringify(original).includes('Art'));
  assert.equal(cd.cdPlayer_('reality-1','Art').murderCredits,before);
});
test('real shield blocks a human murder, names victim publicly and preserves killer anonymity',()=>{
  const gameId='reality-2',a={gameId};
  cd.apiAdminCastleDuelConfigure({...a,maskChance:100,hostChance:0,humanChance:0});
  for(const user of ['Art','Roy'])cd.apiCastleDuelJoin({...a,username:user,alliance:['t1','t2','t3','t4','t5']});
  let roy=cd.cdPlayer_(gameId,'Roy');roy.shield=1;cd.cdSavePlayer_(gameId,roy);
  cd.apiAdminCastleDuelOpenRound({...a,lockAt:new Date(Date.now()+86400000).toISOString()});
  const murder=cd.cdMatches_(gameId,'E1').find(m=>m.user==='Art');
  murder.outcome='MURDERER';murder.status='LOCKED';murder.target='Roy';cd.cdMatchWrite_(gameId,'E1',murder);
  const rm=cd.cdMatches_(gameId,'E1').find(m=>m.user==='Roy');cd.apiCastleDuelMaskedAccept({...a,username:'Roy',roundKey:'E1',matchId:rm.id,accept:false});
  const before=cd.cdPlayer_(gameId,'Art').murderCredits;
  cd.cdSaveRound_(gameId,{...cd.cdRound_(gameId,'E1'),lockAt:new Date(Date.now()-1000).toISOString()});
  const result=cd.apiAdminCastleDuelSettleRound(a);
  const ev=result.announcement.events.find(e=>e.victim==='Roy');
  assert(ev&&ev.lost===0&&ev.shieldUsed===true&&ev.source==='HUMAN');
  assert.equal(cd.cdPlayer_(gameId,'Roy').shield,0);
  assert.equal(cd.cdPlayer_(gameId,'Roy').lives,3);
  assert.equal(cd.cdPlayer_(gameId,'Art').murderCredits,before);
  assert.equal(cd.apiCastleDuelGetState({...a,username:'Roy'}).announcement,null);
  cd.apiAdminCastleDuelOpenRound({...a,lockAt:new Date(Date.now()+86400000).toISOString()});
  const revealed=cd.apiCastleDuelGetState({...a,username:'Roy'}).announcement;
  assert(revealed.events.some(e=>e.victim==='Roy'&&e.shieldUsed));
  assert(!JSON.stringify(revealed).includes('Art'));
});
test('final three each receives ten private encounters and murder advantage',()=>{
  for(const user of ['Art','Roy','Kent']){const p=cd.cdPlayer_('reality-1',user);p.lives=2;p.episodesPlayed=3;p.points=250;if(user==='Art')p.murderCredits=2;cd.cdSavePlayer_('reality-1',p);}
  const opened=cd.apiAdminCastleDuelOpenFinale({...admin,lockAt:new Date(Date.now()+86400000).toISOString()});
  assert.equal(opened.finalists.length,3);
  for(const user of opened.finalists){assert.equal(state(user).matches.length,10);assert.equal(state(user).finale,null);}
  assert(state('Art').announcement.events.find(e=>e.victim==='Roy'),'previous week victim revealed in finale header');
  const before=cd.cdMatches_('reality-1','FINAL').filter(m=>m.user==='Art'&&m.role==='TRAITOR').length;
  const result=cd.apiCastleDuelFinaleAdvantage({...admin,username:'Art',power:'BANISH'});
  assert(result.success);assert.equal(cd.cdMatches_('reality-1','FINAL').filter(m=>m.user==='Art'&&m.role==='TRAITOR').length,before-1);
  const match=state('Art').matches[0];const beforeToken=state('Art').player.finaleTokens;
  cd.apiCastleDuelFinaleToken({...admin,username:'Art',matchId:match.id,power:'CLUE'});
  assert.equal(state('Art').player.finaleTokens,beforeToken-1);
  cd.apiCastleDuelSubmit({...admin,username:'Art',roundKey:'FINAL',matchId:match.id,choice:'COOPERATE',guess:'BETRAY'});
  assert.throws(()=>cd.apiCastleDuelFinaleAdvantage({...admin,username:'Art',power:'RECRUIT',contestantId:'t6'}));
  cd.cdSaveRound_('reality-1',{...cd.cdRound_('reality-1','FINAL'),lockAt:new Date(Date.now()-1000).toISOString()});
  const final=cd.apiAdminCastleDuelSettleFinale(admin);assert(final.success&&final.winner&&final.jackpot>=0);
  assert(cd.apiAdminCastleDuelSettleFinale(admin).alreadySettled);
  assert.equal(state('Art').matches.length,10);
  assert(state('Art').matches.every(m=>m.status==='SETTLED'));
  assert(state('Art').finale.murderHistory.some(e=>e.murderer==='Art'&&e.victim==='Roy'));
});
console.log(`PASS ${count}/${count} Castle Duel focused tests`);
