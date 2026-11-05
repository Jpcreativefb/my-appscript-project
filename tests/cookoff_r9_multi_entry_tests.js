const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const engine=fs.readFileSync(path.join(__dirname,'../backend/engines/VotingCompetitionEngine.js'),'utf8');
const ctx={Date,Math,JSON,Object,Array,String,Number,Boolean,Set,RegExp,parseInt,parseFloat,isFinite};
vm.createContext(ctx);
vm.runInContext(engine,ctx);
const headers=Array.from(vm.runInContext('VOTING_COMPETITION_PARTICIPANT_HEADERS',ctx));
const map={};headers.forEach((h,i)=>{map[h.toLowerCase()]=i;});
const rows=[];
let held=false,issued=0,nested=false,nestedRejected=false;
const sheet={
  getLastRow:()=>rows.length+1,
  getLastColumn:()=>headers.length,
  getRange:(at,col,n,width)=>({
    getValues:()=>at===1?[headers.slice()]:rows.slice(at-2,at-2+n).map(r=>r.slice()),
    setValues:(values)=>{
      for(let i=0;i<values.length;i++)rows[at-2+i]=values[i].slice();
      if(nested && !nestedRejected) {
        try {ctx.votingCompetitionSaveParticipant_({gameId:'cookoff',username:'racer',entryName:'Simultaneous',submissionId:'nested'});}
        catch(e){nestedRejected=/Another entry/.test(e.message);}
        nested=false;
      }
    }
  })
};
const settings=Object.assign({},ctx.votingCompetitionDefaultSettings_('cookoff'),{
  entryIdentifierMode:'color',entryColorPalette:['Red','Blue'],
  allowMultipleEntries:true,maxEntriesPerParticipant:2,
  entryCategories:[{id:'overall',label:'Best Overall',defaultSelected:true,audience:'both'}]
});
ctx.votingCompetitionGetSettings_=()=>settings;
ctx.getGameRuntimeConfig=()=>({type:'voting'});
ctx.clearGameCaches=()=>{};
ctx.Utilities={getUuid:()=>String(++issued).padStart(16,'0')};
ctx.LockService={getScriptLock:()=>({
  tryLock:()=>{if(held)return false;held=true;return true;},
  releaseLock:()=>{held=false;}
})};
ctx.votingCompetitionEnsureSheet_=()=>sheet;
ctx.votingCompetitionReadParticipants_=(gameId)=>rows.map((r,i)=>({
  rowNumber:i+2,gameId:r[map.gameid],username:r[map.username],
  entryId:r[map.entryid],displayNumber:r[map.displaynumber],displayColor:r[map.displaycolor],
  entryName:r[map.entryname],customData:JSON.parse(r[map.customdatajson]||'{}'),
  imageUrl:r[map.imageurl],imageFileId:r[map.imagefileid],description:r[map.description],
  ingredients:r[map.ingredients],status:r[map.status],published:r[map.published],
  adminNotes:r[map.adminnotes],timestamp:r[map.timestamp]
})).filter(r=>r.gameId===gameId);
nested=true;
const first=ctx.votingCompetitionSaveParticipant_({
 gameId:'cookoff',username:'chef1',participantName:'Chef One',
 entryName:'Chili A',submissionId:'submission-a',customData:{cookoffCategoryIds:['overall']}
});
assert.strictEqual(nestedRejected,true,'simultaneous request must be refused while lock held');
assert.strictEqual(rows.length,1,'one dish should be written under lock');
const again=ctx.votingCompetitionSaveParticipant_({
 gameId:'cookoff',username:'chef1',entryName:'Chili A',submissionId:'submission-a'
});
assert.strictEqual(again.entryId,first.entryId,'request retry must be idempotent');
assert.strictEqual(rows.length,1,'retry must not create duplicate');
const second=ctx.votingCompetitionSaveParticipant_({
 gameId:'cookoff',username:'chef1',entryName:'Chili B',submissionId:'submission-b'
});
assert.notStrictEqual(first.entryId,second.entryId,'new dish must have its own entry id');
assert.notStrictEqual(first.displayColor,second.displayColor,'color must be unique');
assert.strictEqual(rows.length,2);
assert.throws(()=>ctx.votingCompetitionSaveParticipant_({gameId:'cookoff',username:'chef1',entryName:'Chili C',submissionId:'c'}),/maximum number/i);
assert.throws(()=>ctx.votingCompetitionSaveParticipant_({gameId:'cookoff',username:'chef2',entryId:first.entryId,entryName:'Tampered'}),/do not own/i);
assert.throws(()=>ctx.votingCompetitionSaveParticipant_({gameId:'cookoff',username:'chef2',entryName:'Chili C',submissionId:'new'}),/colors are assigned/i);
const edited=ctx.votingCompetitionSaveParticipant_({
 gameId:'cookoff',username:'chef1',entryId:second.entryId,entryName:'Chili B Updated'
});
assert.strictEqual(edited.entryId,second.entryId);
assert.strictEqual(edited.displayColor,second.displayColor);
assert.strictEqual(ctx.votingCompetitionReadParticipants_('cookoff')[0].entryName,'Chili A');
assert.strictEqual(ctx.votingCompetitionReadParticipants_('cookoff')[1].entryName,'Chili B Updated');
settings.registrationLocked=true;
assert.throws(()=>ctx.votingCompetitionSaveParticipant_({gameId:'cookoff',username:'chef1',entryName:'Too Late'}),/registration is closed/i);
assert.strictEqual(held,false,'script lock must always be released');
console.log('cookoff-r9-multi-entry-tests: PASS');