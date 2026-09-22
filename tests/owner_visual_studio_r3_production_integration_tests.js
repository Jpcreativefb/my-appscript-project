'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const R3=require('../frontend/js/ownerVisualStudioR3.js');
const source=fs.readFileSync('frontend/js/ownerVisualStudioR3.js','utf8');
const api=fs.readFileSync('backend/Api.js','utf8');
const html=fs.readFileSync('frontend/app.html','utf8');
const bridgeCode=fs.readFileSync('functions/api/app.js','utf8');
const prod=source.match(/const PRODUCTION_BACKEND = '([^']+)'/)[1];
const allowedBridge={success:true,studioProductionBridge:true,apiUrl:prod};
const allowedIdentity={success:true,environment:'production',verified:true,apiUrl:prod};
assert(R3.productionWritePolicy('my-appscript-project.pages.dev',prod,true,allowedBridge,allowedIdentity).allowed);
for (const [hostname,url,enabled,bridge,identity] of [
  ['localhost',prod,true,allowedBridge,allowedIdentity],
  ['my-appscript-project.pages.dev','https://invalid.example/exec',true,allowedBridge,allowedIdentity],
  ['my-appscript-project.pages.dev',prod,false,allowedBridge,allowedIdentity],
  ['my-appscript-project.pages.dev',prod,true,{...allowedBridge,studioProductionBridge:false},allowedIdentity],
  ['my-appscript-project.pages.dev',prod,true,allowedBridge,{...allowedIdentity,verified:false}],
  ['my-appscript-project.pages.dev',prod,true,allowedBridge,null],
  ['my-appscript-project.pages.dev',prod,true,null,allowedIdentity]
]) assert(!R3.productionWritePolicy(hostname,url,enabled,bridge,identity).allowed);
async function main(){
  let token='first-owner-token', admin=true, writes=0, reads=0, identityReads=0;
  const host={
    getSession:()=>({token,isAdmin:admin}),isAdminSession:s=>admin&&s.token===token,
    fetch:async()=>{reads++;return {ok:true,json:async()=>allowedBridge}},
    api:async action=>{assert.equal(action,'adminGetStudioProductionIdentity');identityReads++;return allowedIdentity;},
    apiAdminSaveAppearanceOverride:async()=>{writes++;return {success:true}}
  };
  const adapter=R3.serverAdapter(host);
  assert.throws(()=>adapter.write({},R3.TYPES.draft,'dashboard',{}),/(blocked|READ ONLY)/);
  await R3.verifyProductionEnvironment(host,'my-appscript-project.pages.dev',true,prod);
  assert.equal(reads,1);assert.equal(identityReads,1);
  await adapter.write({gameId:'__pattc_global__'},R3.TYPES.draft,'dashboard',{});
  assert.equal(writes,1);
  token='another-owner-session';
  assert.throws(()=>adapter.write({},R3.TYPES.draft,'dashboard',{}),/session changed/);
  admin=false;
  await R3.verifyProductionEnvironment(host,'my-appscript-project.pages.dev',true,prod);
  assert.throws(()=>adapter.write({},R3.TYPES.draft,'dashboard',{}),/(blocked|READ ONLY)/);
  assert.equal(writes,1);
  const anonymous={getSession:()=>null,isAdminSession:()=>false,fetch:host.fetch,api:host.api};
  await R3.verifyProductionEnvironment(anonymous,'my-appscript-project.pages.dev',true,prod);
  assert.throws(()=>R3.serverAdapter(anonymous).write({},R3.TYPES.draft,'dashboard',{}),/(blocked|READ ONLY)/);
  assert(html.includes('ownerVisualStudioR3.js?release=vs-r3-prod-integration-r1'));
  assert(!/<script src="\.\/js\/ownerVisualStudioRc24e\.js/.test(html),'Legacy R2 must not mount alongside R3');
  assert(!html.includes('studio-owner') && !html.includes('studio-player'));
  assert(source.includes('if (localhost && admin()) verifyEnvironment()') && !source.includes('runtimeAppearance(); verifyEnvironment()'),'Player Home should not trigger admin identity request');
  assert(api.includes('if (action === "adminGetStudioProductionIdentity")'));
  const engineCtx={ScriptApp:{getScriptId:()=>''},SpreadsheetApp:{getActive:()=>({getId:()=>''})}};
  vm.createContext(engineCtx);
  vm.runInContext(fs.readFileSync('backend/engines/AppearanceEngine.js','utf8'),engineCtx);
  assert.equal(engineCtx.apiAdminGetStudioProductionIdentity_().verified,false);
  assert.equal(engineCtx.apiAdminGetStudioProductionIdentity_().environment,'production');
  assert.equal(engineCtx.apiAdminGetStudioProductionIdentity_().apiUrl,prod);
  const routeSource=bridgeCode.replace(/\bexport\s+(?=(async\s+)?function\b)/g,'');
  const ctx={Response,URL,fetch:async()=>{throw Error('Preview must reject before upstream fetch');}};
  vm.createContext(ctx);vm.runInContext(routeSource,ctx);
  const preview={request:{url:'https://preview-123.my-appscript-project.pages.dev/api/app',text:async()=>JSON.stringify({action:'adminSaveAppearanceOverride',entityType:'visual-studio-draft',gameId:'__pattc_global__'})},env:{}};
  const denied=await ctx.onRequestPost(preview);
  assert.equal(denied.status,403);
  assert.equal((await denied.json()).previewOnly,true);
  const prodBridge=await ctx.onRequestGet({request:{url:'https://my-appscript-project.pages.dev/api/app'},env:{}});
  assert.equal((await prodBridge.json()).studioProductionBridge,true);
  const previewBridge=await ctx.onRequestGet({request:{url:'https://preview-123.my-appscript-project.pages.dev/api/app'},env:{}});
  assert.equal((await previewBridge.json()).studioProductionBridge,false);
  console.log('R3 production integration: production host/backend/bridge/admin identity gates, session switch, player denial, Preview write block, exclusive R3 load, backend identity fail-closed PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1});
