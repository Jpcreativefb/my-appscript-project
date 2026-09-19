/* PATTC Cup + Futures R1.1: execute Pages request routing with fake upstream, never contact Google. */
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{
 const src=fs.readFileSync('functions/api/app.js','utf8');
 assert(src.includes('function pattcCupProductionRequest_'));
 assert(src.includes('adminPrepareNflCupFuturesR1'));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pattc-routing-test-'));
 const file=path.join(tmp,'app.mjs');fs.writeFileSync(file,src);
 const {onRequestPost}=await import(pathToFileURL(file).href);
 const prevFetch=global.fetch, prevResponse=global.Response;
 let seen=[];
 global.fetch=async function(url,options){seen.push({url:String(url),action:JSON.parse(options.body).action});return new Response(JSON.stringify({success:true}),{status:200});};
 const preview='https://random-hash.my-appscript-project.pages.dev/api/app';
 const production='https://my-appscript-project.pages.dev/api/app';
 const request=async(host,action,gameId,env)=>{
  const body={action:action,gameId:gameId||'nfl-cup-2026'};
  const response=await onRequestPost({request:{url:host,text:async()=>JSON.stringify(body)},env:env||{}});
  return response.json();
 };
 try{
  const blocked=['adminPrepareNflCupFuturesR1','adminBuildNflSeasonPack','adminSaveNflPlayoffRaceSettings','saveNflPlayoffRaceRanking'];
  for(const action of blocked){const n=seen.length,r=await request(preview,action);assert.strictEqual(r.previewOnly,true,action);assert.strictEqual(seen.length,n,action+' must never fetch upstream');}
  {const n=seen.length,r=await request(preview,'saveSurvivorPick','nfl-survivor-2026');assert.strictEqual(r.previewOnly,true);assert.strictEqual(seen.length,n);}
  for(const action of ['saveBet','removeBet']){const n=seen.length,r=await request(preview,action,'nfl-futures-2026');assert.strictEqual(r.previewOnly,true,action);assert.strictEqual(seen.length,n,action+' must never fetch upstream');}
  let r=await request(preview,'leaderboard','nfl-cup-2026');assert.strictEqual(r.success,true);assert(seen.at(-1).url.includes('AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0'));
  r=await request(preview,'getBettingPagePayload','nfl-futures-2026');assert.strictEqual(r.success,true);assert(seen.at(-1).url.includes('AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0'));
  for(const action of ['adminPrepareNflCupFuturesR1','leaderboard','getBettingPagePayload','saveBet','saveSurvivorPick']){
   r=await request(production,action,action==='adminPrepareNflCupFuturesR1'?'nfl-cup-2026':'nfl-futures-2026');
   assert.strictEqual(r.success,true,action);assert(seen.at(-1).url.includes('AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo'),action);
  }
  const custom='https://app.pattc-example.com/api/app';
  const n=seen.length;r=await request(custom,'adminPrepareNflCupFuturesR1');assert.strictEqual(r.previewOnly,true);assert.strictEqual(seen.length,n);
  r=await request(custom,'adminPrepareNflCupFuturesR1','nfl-cup-2026',{PATTC_PRODUCTION_HOSTNAME:'app.pattc-example.com'});assert.strictEqual(r.success,true);assert(seen.at(-1).url.includes('AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo'));
  console.log('PATTC NFL Cup + Futures R1.1 preview-write isolation and production routing tests: PASS');
 }finally{global.fetch=prevFetch;global.Response=prevResponse;fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
