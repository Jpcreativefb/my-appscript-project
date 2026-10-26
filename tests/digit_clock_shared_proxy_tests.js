const assert=require('assert'),fs=require('fs');
(async()=>{const source=fs.readFileSync('functions/api/digit-leagues.js','utf8');const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const original=global.fetch;let calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return Response.json({success:true,leagues:[]});};try{
const request=(host,action)=>({request:new Request(`https://${host}/api/digit-leagues`,{method:'POST',body:JSON.stringify({action,token:'secret-fixture'})})});
let result=await api.onRequestPost(request('branch.pattc-predicts.pages.dev','adminSaveDigitClockLeague'));assert.equal(result.status,403);assert.equal(calls.length,0);
result=await api.onRequestPost(request('pattc-predicts.pages.dev','getDigitClockWorkspace'));assert.equal(result.status,200);assert(calls[0].url.includes('AKfycbyDdfv-'));assert(!calls[0].url.includes('secret-fixture'));assert.equal(JSON.parse(calls[0].options.body).token,'secret-fixture');assert.equal(result.headers.get('cache-control'),'no-store');
await api.onRequestPost(request('my-appscript-project.pages.dev','adminSaveDigitClockLeague'));assert(calls[1].url.includes('AKfycbyDdfv-'));
await api.onRequestPost(request('branch.pattc-predicts.pages.dev','getDigitClockWorkspace'));assert(calls[2].url.includes('AKfycbywlPw_'));
result=await api.onRequestPost(request('pattc-predicts.pages.dev','adminDeleteOtherGame'));assert.equal(result.status,400);assert.equal(calls.length,3);assert.equal(api.onRequestGet().status,405);
console.log('Digit Clock shared proxy: production/preview isolation, POST-only credentials, action allowlist and no-store responses passed.');
}finally{global.fetch=original;}})().catch(error=>{console.error(error);process.exitCode=1;});
