'use strict';
const assert=require('assert');
const sheets={};
class Sheet{
  constructor(name){this.rows=[];}
  getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};}
  getRange(row,col,height,width){return {setValues:(values)=>{values.forEach((v,i)=>{while(this.rows.length<row+i)this.rows.push([]);this.rows[row+i-1].splice(col-1,width,...v);});}};}
  appendRow(values){this.rows.push(values.slice());}
  setFrozenRows(){}
}
global.SpreadsheetApp={getActive:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=new Sheet(n)})};
global.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
const cast=[
  {ContestantId:'t1',Name:'Traitor One',EliminatedEpisode:''},
  {ContestantId:'t2',Name:'Traitor Two',EliminatedEpisode:''},
  {ContestantId:'f1',Name:'Faithful One',EliminatedEpisode:''},
  {ContestantId:'f2',Name:'Faithful Two',EliminatedEpisode:''},
  {ContestantId:'f3',Name:'Faithful Three',EliminatedEpisode:''},
  {ContestantId:'f4',Name:'Faithful Four',EliminatedEpisode:''}
];
global.realityTvGetSeasonByGameId_=id=>id?{SeasonId:'s',GameId:id}:null;
global.realityTvContestantsForSeason_=id=>id==='s'?cast:[];
const cd=require('../backend/engines/CastleDuelEngine');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function config(gameId,extra={}){
  return cd.apiAdminCastleDuelConfigure(Object.assign({gameId,roles:{t1:'TRAITOR',t2:'TRAITOR',f1:'FAITHFUL',f2:'FAITHFUL',f3:'FAITHFUL',f4:'FAITHFUL'},maskChance:0,hostChance:0,humanChance:0},extra));
}
function join(gameId,user){return cd.apiCastleDuelJoin({gameId,username:user,alliance:['t1','t2','f1','f2','f3']});}
function seedRound(gameId,key='E1',number=1){cd.cdSaveRound_(gameId,{key,number,lockAt:new Date(Date.now()+3600000).toISOString(),status:'OPEN',finale:false,announcement:null});return cd.cdRound_(gameId,key);}
function botCast(){return [{id:'t1',name:'Traitor One',role:'TRAITOR'},{id:'t2',name:'Traitor Two',role:'TRAITOR'},{id:'f1',name:'Faithful One',role:'FAITHFUL'}];}

test('Banish threshold tightens as season advances',()=>{
  config('thresholds');const c=cd.cdConfig_('thresholds');
  assert.equal(cd.cdBanishThreshold_(1,c),5);assert.equal(cd.cdBanishThreshold_(3,c),5);
  assert.equal(cd.cdBanishThreshold_(4,c),4);assert.equal(cd.cdBanishThreshold_(7,c),3);assert.equal(cd.cdBanishThreshold_(10,c),2);
});

test('multiple active Traitors stay hidden until player identifies the correct one',()=>{
  const gameId='hidden';config(gameId);join(gameId,'Art');const r=seedRound(gameId);
  const m=cd.cdBotMatch_(cd.cdConfig_(gameId),r,cd.cdPlayer_(gameId,'Art'),1,'TRAITOR',botCast(),{});cd.cdMatchWrite_(gameId,r.key,m);
  let pub=cd.apiCastleDuelGetState({gameId,username:'Art'}).matches[0];
  assert.equal(pub.status,'IDENTIFY_REQUIRED');assert.equal(pub.opponent,'A Traitor');assert.equal(pub.traitorCandidates.length,2);
  assert(!JSON.stringify(pub).includes('traitorActualId'));assert(!JSON.stringify(pub).includes('traitorActualName'));
  const internal=cd.cdMatches_(gameId,r.key)[0],wrong=internal.traitorActualId==='t1'?'t2':'t1';
  pub=cd.apiCastleDuelSubmit({gameId,username:'Art',roundKey:r.key,matchId:m.id,step:'TRAITOR_IDENTITY',traitorId:wrong}).match;
  assert.equal(pub.identityCorrect,false);assert.equal(pub.status,'FATE_REQUIRED');assert.equal(pub.opponent,'A Traitor');
});

test('correct Traitor identity grants murder safety while a wrong duel read adds Banish',()=>{
  const gameId='correct';config(gameId);join(gameId,'Art');const r=seedRound(gameId);
  let p=cd.cdPlayer_(gameId,'Art');p.banish=1;cd.cdSavePlayer_(gameId,p);
  const m=cd.cdBotMatch_(cd.cdConfig_(gameId),r,p,1,'TRAITOR',botCast(),{});cd.cdMatchWrite_(gameId,r.key,m);
  let internal=cd.cdMatches_(gameId,r.key)[0];
  let pub=cd.apiCastleDuelSubmit({gameId,username:'Art',roundKey:r.key,matchId:m.id,step:'TRAITOR_IDENTITY',traitorId:internal.traitorActualId}).match;
  assert.equal(pub.identityCorrect,true);assert.equal(pub.status,'OPEN');assert.notEqual(pub.opponent,'A Traitor');
  internal=cd.cdMatches_(gameId,r.key)[0];const wrongRead=internal.answer==='COOPERATE'?'BETRAY':'COOPERATE';
  cd.apiCastleDuelSubmit({gameId,username:'Art',roundKey:r.key,matchId:m.id,choice:'COOPERATE',guess:wrongRead});
  cd.cdSaveRound_(gameId,Object.assign({},r,{lockAt:new Date(Date.now()-1000).toISOString()}));
  cd.apiAdminCastleDuelSettleRound({gameId});
  const after=cd.cdPlayer_(gameId,'Art'),settled=cd.apiCastleDuelGetState({gameId,username:'Art'}).matches[0];
  assert.equal(after.lives,3,'correct identity must prevent Traitor murder');
  assert.equal(settled.points,0);assert.equal(settled.banishAdded,1);
  assert.equal(after.banish,1,'wrong read adds one, then surviving episode removes one');
});

test('reaching Banish limit costs one life, resets pressure, and does not consume a Secret Shield',()=>{
  const gameId='banish-life';config(gameId);join(gameId,'Art');const r=seedRound(gameId);
  let p=cd.cdPlayer_(gameId,'Art');p.banish=4;p.shield=1;cd.cdSavePlayer_(gameId,p);
  const m=cd.cdBotMatch_(cd.cdConfig_(gameId),r,p,1,'FAITHFUL',botCast(),{});cd.cdMatchWrite_(gameId,r.key,m);
  const internal=cd.cdMatches_(gameId,r.key)[0],wrongRead=internal.answer==='COOPERATE'?'BETRAY':'COOPERATE';
  cd.apiCastleDuelSubmit({gameId,username:'Art',roundKey:r.key,matchId:m.id,choice:'COOPERATE',guess:wrongRead});
  cd.cdSaveRound_(gameId,Object.assign({},r,{lockAt:new Date(Date.now()-1000).toISOString()}));
  const result=cd.apiAdminCastleDuelSettleRound({gameId}),after=cd.cdPlayer_(gameId,'Art');
  assert.equal(after.lives,2);assert.equal(after.banish,0);assert.equal(after.shield,1);
  assert(result.announcement.events.some(e=>e.victim==='Art'&&e.banishLife===true));
});

test('Masked Traitor fate reveals immediately and Host uses one of three sealed rewards',()=>{
  const gameId='masked';config(gameId);join(gameId,'Art');const r=seedRound(gameId),p=cd.cdPlayer_(gameId,'Art');
  let traitor=cd.cdBotMatch_(cd.cdConfig_(gameId),r,p,1,'MASK',botCast(),{});traitor.outcome='TRAITOR';traitor.opponent='Traitor One';traitor.contestantId='t1';traitor.role='TRAITOR';traitor.status='FATE_REQUIRED';traitor.fateSafeSlot=1;cd.cdMatchWrite_(gameId,r.key,traitor);
  let pub=cd.apiCastleDuelMaskedAccept({gameId,username:'Art',roundKey:r.key,matchId:traitor.id,step:'FATE',fateSlot:2}).match;
  assert.equal(pub.status,'LOCKED');assert.equal(pub.fateResult,'MURDERED');
  let host=cd.cdBotMatch_(cd.cdConfig_(gameId),r,p,2,'MASK',botCast(),{});host.outcome='HOST';host.status='HOST_REQUIRED';host.hostRewards=['GOLD','PROTECTION','MERCY'];host.wager=20;cd.cdMatchWrite_(gameId,r.key,host);
  pub=cd.apiCastleDuelMaskedAccept({gameId,username:'Art',roundKey:r.key,matchId:host.id,step:'HOST',hostSlot:1}).match;
  assert.equal(pub.status,'LOCKED');assert.equal(pub.hostReward,'GOLD');
});

console.log('PASS '+count+'/'+count+' Castle Duel R3 rules tests');
