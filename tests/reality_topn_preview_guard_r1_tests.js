const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../functions/api/app.js'),'utf8');
 const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const actions=['saveRealityTopNBallot','adminSaveRealityTopNSettings','adminApproveRealityTopNPlacements','adminSaveRealityQuestionMix','adminSaveRealityAdvancedQuestion'];
 for(const action of actions){
  const request=new Request('https://preview-abc.my-appscript-project.pages.dev/api/app',{method:'POST',body:JSON.stringify({action,gameId:'test'})});
  const response=await mod.onRequestPost({request,env:{}});
  assert.equal(response.status,403,'Preview should refuse '+action);
  const json=await response.json();assert.equal(json.previewOnly,true);
 }
 console.log('PASS: Cloudflare Preview blocks all five Reality TV R1 mutation action names');
})().catch(err=>{console.error(err);process.exitCode=1;});
