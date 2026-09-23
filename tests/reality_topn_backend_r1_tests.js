const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm'),path=require('path');
const backend=path.join(__dirname,'../backend/engines');
const season={SeasonId:'dwts-s35-test',GameId:'dwts-test',CurrentEpisodeNumber:1};
const roster=Array.from({length:5},(_,i)=>({ContestantId:'cast-'+(i+1),Name:'Contestant '+(i+1),ImageUrl:'',EliminatedEpisode:''}));
const episodes=[{EpisodeId:'episode-1',EpisodeNumber:1,Status:'FINAL',OutcomeType:'no-elimination',EliminatedContestantIds:'[]',LockDateTime:'2030-02-10T19:00:00Z'},
  {EpisodeId:'episode-2',EpisodeNumber:2,Status:'OPEN',OutcomeType:'elimination',EliminatedContestantIds:'',LockDateTime:'2030-02-17T19:00:00Z'}];
const sheets={};const ss={getSheetByName:n=>sheets[n]?{name:n,__rowNumber:2}:null};
const sandbox={console,Date,JSON,Number,Math,SpreadsheetApp:{getActive:()=>ss,flush:()=>{}},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
 realityTvReadObjects_:(_,n)=>sheets[n]||[],
 realityTvUpsertObject_:(_,n,headers,keys,row)=>{const list=sheets[n]||(sheets[n]=[]);let i=list.findIndex(r=>keys.every(k=>String(r[k])===String(row[k])));if(i<0){list.push({...row,__rowNumber:list.length+2});}else list[i]={...list[i],...row};},
 realityTvUpdateObjectRow_:(_,rowNum,patch)=>{const item=(sheets.RealityTopNSettings||[])[rowNum-2];if(!item)throw Error('missing row');Object.assign(item,patch);},
 realityTvGetSeason_:id=>id===season.SeasonId?season:null,
 realityTvGetSeasonByGameId_:id=>id===season.GameId?season:null,
 realityTvContestantsForSeason_:id=>id===season.SeasonId?roster:[],
 realityTvEpisodesForSeason_:id=>id===season.SeasonId?episodes:[],
 requireAdmin_:p=>{if(p.token!=='admin')throw Error('Admin access denied');},
 validateUserSession_:(username,token)=>{if(token!==username&&token!=='admin')throw Error('Invalid session');},
 userCanAccessGameFeature_:(u,id,feature)=>({allowed:u==='alice'&&id==='dwts-test'})};
vm.createContext(sandbox);
for(const n of ['RealityTvSeasonGamesR1Core.js','RealityTvTopNSurvivalR1Engine.js'])vm.runInContext(fs.readFileSync(path.join(backend,n),'utf8'),sandbox,{filename:n});
assert.equal(sandbox.apiGetRealityTopN({username:'alice',token:'alice',gameId:'dwts-test'}).enabled,false);
assert.throws(()=>sandbox.apiGetRealityTopN({username:'bob',token:'bob',gameId:'dwts-test'}),/Access denied/);
assert.throws(()=>sandbox.apiAdminSaveRealityTopNSettings({token:'not-admin',seasonId:season.SeasonId}),/Admin access/);
const base={token:'admin',seasonId:season.SeasonId,enabled:true,n:3,startEpisodeNumber:1,ballotLockDateTime:'2030-01-31T19:00:00Z',contributionPercent:0,bonusMultiplier:1};
assert.throws(()=>sandbox.apiAdminSaveRealityTopNSettings({...base,contributionPercent:25}),/not yet connected/);
assert.equal(sandbox.apiAdminSaveRealityTopNSettings(base).success,true);
assert.equal(sandbox.apiAdminGetRealityTopNSettings({token:'admin',seasonId:season.SeasonId}).settings.n,3);
let view=sandbox.apiGetRealityTopN({username:'alice',token:'alice',gameId:'dwts-test'});
assert.equal(view.canSave,true);assert.equal(view.n,3);assert.deepEqual([...view.orderedIds],[]);
assert.throws(()=>sandbox.apiSaveRealityTopNBallot({username:'alice',token:'alice',gameId:'dwts-test',orderedIds:['cast-1','cast-1','cast-3']}),/only once/);
const save=sandbox.apiSaveRealityTopNBallot({username:'alice',token:'alice',gameId:'dwts-test',orderedIds:['cast-1','cast-2','cast-3']});
assert.equal(save.success,true);view=sandbox.apiGetRealityTopN({username:'alice',token:'alice',gameId:'dwts-test'});
assert.deepEqual([...view.orderedIds],['cast-1','cast-2','cast-3']);assert.equal(view.scoring.weekly[0].points,6);
assert.throws(()=>sandbox.apiAdminSaveRealityTopNSettings({...base,n:4}),/cannot be changed/);
assert.equal((sheets.RealityTopNBallots||[]).length,1);
console.log('PASS: Top N disabled default, session access, admin gate, weighted-release guard, settings, verified ballot, duplicate rejection, locked ballot settings');
