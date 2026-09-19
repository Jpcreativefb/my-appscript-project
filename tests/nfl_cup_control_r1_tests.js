'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('frontend/js/pages/adminGamesRc24e.js','utf8');
assert(src.includes('PATTC NFL Cup Admin Control Center R1'));
for(const f of ['frontend/js/app.js','frontend/app.js'])assert(fs.readFileSync(f,'utf8').includes('v1221-nfl-cup-weekly-season-r2'));
assert(fs.readFileSync('frontend/app.html','utf8').includes('cupControl=v1221-nfl-cup-weekly-season-r2'));
const section=src.slice(src.indexOf('/* PATTC NFL Cup Admin Control Center R1;'));
const sourceGames=[{gameId:'nfl-cup-2026',name:'NFL Cup',type:'season-cup',status:'Draft',active:false,lockAllPicks:false,gameRole:'parent',parentBestCount:0,placementPointsJSON:'{"points":[25,20,16,13,11,9,7,6,5,4,3,2,1],"minPlayers":4,"fullFieldSize":8,"minParticipationPct":50,"fieldAdjustment":true}'},{gameId:'nfl-futures-2026',name:'NFL Futures',parentGameId:'nfl-cup-2026',gameRole:'mini',status:'Draft',active:false,lockAllPicks:true,includeInParent:false,parentContributionWeight:1},{gameId:'nfl-confidence-2026',name:'NFL Confidence',parentGameId:'nfl-cup-2026',gameRole:'mini',status:'Preview',active:true,lockAllPicks:true,includeInParent:true,parentContributionWeight:1}];
const elements={},writes=[],publishes=[];
function element(id,value){elements[id]={value,disabled:false,textContent:'',style:{},querySelectorAll:()=>[]};return elements[id];}
element('pattcCupCtrlMessage','');element('pattcCupControlR1','');element('pattcCupWeight_nfl-futures-2026','1.25');element('pattcCupInclude_nfl-futures-2026','false');element('pattcCupWeight_nfl-confidence-2026','1');element('pattcCupInclude_nfl-confidence-2026','true');
['pattcCupPoints','pattcCupBest','pattcCupMin','pattcCupFull','pattcCupPct','pattcCupAdjust'].forEach((k,i)=>element(k,['25,20,16,13,11,9,7,6,5,4,3,2,1','0','4','8','50','true'][i]));
const window={renderAdminGamesPage:async()=>'<div class="page admin-games-page"><section><button id="nflCupFuturesBuildButton"></button></section></div>',confirm:()=>true};
const context={window,document:{getElementById:id=>elements[id]||null},apiAdminGetGames:async()=>({success:true,games:sourceGames}),apiAdminUpdateGame:async payload=>{writes.push(payload);Object.assign(sourceGames.find(g=>g.gameId===payload.gameId),payload);return{success:true,result:{success:true}};},apiAdminRunGamePreflight:async()=>({success:true,errorCount:0,warningCount:0,issues:[]}),apiAdminFinalizeGamePublication:async payload=>{publishes.push(payload);Object.assign(sourceGames.find(g=>g.gameId===payload.gameId),{status:'Active',active:true,lockAllPicks:payload.lockAllPicks});return{success:true,activated:true};},navigate:()=>{},console};
vm.runInNewContext(section,context,{filename:'cup-controller.js'});
(async()=>{
 const html=await window.renderAdminGamesPage();
 assert(html.includes('NFL Cup · Control Center'));assert(html.includes('NFL Confidence'));assert(html.includes('NFL Futures'));assert(html.includes('Minimum field participation %'));assert(html.includes('Best mini-games'));
 await window.pattcCupSaveRulesR1_();
 assert.strictEqual(sourceGames[0].parentBestCount,0);
 assert.strictEqual(JSON.parse(sourceGames[0].placementPointsJSON).minPlayers,4);
 await window.pattcCupSaveChildR1_('nfl-futures-2026');
 assert.strictEqual(writes[1].includeInParent,false);assert.strictEqual(writes[1].parentContributionWeight,1.25);
 await window.pattcCupHoldR1_('nfl-confidence-2026');
 assert.strictEqual(sourceGames[2].active,false);assert.strictEqual(sourceGames[2].lockAllPicks,true);assert.strictEqual(sourceGames[2].includeInParent,false);
 await window.pattcCupLiveR1_('nfl-cup-2026');
 assert.strictEqual(publishes[0].lockAllPicks,true);assert.strictEqual(sourceGames[0].active,true);
 // No automatic inclusion of a previously held game on publication.
 await window.pattcCupLiveR1_('nfl-confidence-2026');
 assert.strictEqual(publishes[1].lockAllPicks,false);assert.strictEqual(sourceGames[2].includeInParent,false);
 console.log('PATTC NFL Cup Control Center R1 tests: PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
