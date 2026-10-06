'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(__dirname, '..', 'frontend', 'js', 'ownerVisualStudioR3.js');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const studio = require(SOURCE_PATH);

function row(type, id, manifest) {
  return { EntityType: type, EntityId: id, Active: true, ThemeOverrideJSON: JSON.stringify(manifest) };
}
function makeManifest(pageKey, color) {
  return studio.normalize({ pageKey, items: { 'id:sample': { style: { backgroundMode: 'color', backgroundColor: color } } } });
}
function adapterFor(pageKey, published, initialDraft) {
  let draft = JSON.parse(JSON.stringify(initialDraft)); let writes = 0;
  return {
    adapter: {
      async readFresh() { return { success: true, overrides: [row(studio.TYPES.published,pageKey,published), row(studio.TYPES.draft,pageKey,draft)] }; },
      async write(scope,type,id,manifest) { assert.strictEqual(scope.pageKey,pageKey); assert.strictEqual(type,studio.TYPES.draft); assert.strictEqual(id,pageKey); writes++; draft=JSON.parse(JSON.stringify(manifest)); return {success:true}; }
    },
    getDraft(){return JSON.parse(JSON.stringify(draft));}, getWrites(){return writes;}
  };
}
async function saveRestoreReloadTest() {
  const pageKey='dashboard', published=makeManifest(pageKey,'rgb(10, 20, 30)'), savedDraft=makeManifest(pageKey,'rgb(20, 120, 60)');
  const server=adapterFor(pageKey,published,savedDraft); let scheduled=0;
  const options={autosave:false,assertWritable(){},setTimeout(){scheduled++;return scheduled;},clearTimeout(){}};
  const controller=studio.createController(server.adapter,options);
  await controller.open({pageKey,gameId:'__pattc_global__'});
  controller.edit(m=>{m.items['id:sample'].style.backgroundColor='rgb(19, 70, 124)';});
  assert.strictEqual(scheduled,0); assert.strictEqual(server.getWrites(),0);
  controller.restoreSelected('id:sample');
  assert.strictEqual(controller.snapshot().manifest.items['id:sample'].style.backgroundColor,'rgb(20, 120, 60)');
  controller.edit(m=>{m.items['id:sample'].style.backgroundColor='rgb(15, 90, 45)';}); await controller.flush();
  assert.strictEqual(server.getWrites(),1);
  const reloaded=studio.createController(server.adapter,options); await reloaded.open({pageKey,gameId:'__pattc_global__'});
  assert.strictEqual(reloaded.snapshot().manifest.items['id:sample'].style.backgroundColor,'rgb(15, 90, 45)');
  reloaded.edit(m=>{m.items['id:sample'].style.backgroundColor='rgb(19, 70, 124)';}); await reloaded.revert();
  assert.strictEqual(reloaded.snapshot().manifest.items['id:sample'].style.backgroundColor,'rgb(15, 90, 45)');
  assert.strictEqual(server.getWrites(),1);
}
function restoreOriginalTest(){
  const m=studio.normalize({pageKey:'dashboard',items:{'id:sample':{style:{backgroundColor:'rgb(19, 70, 124)',padding:12}}},moves:{'id:sample':'id:x'},hidden:{'id:sample':true},collapse:{'id:sample':{collapsible:true}},responsive:{mobile:{items:{'id:sample':{style:{color:'#fff'}}},hidden:{'id:sample':true},collapse:{'id:sample':{defaultOpen:false}}}}});
  studio.restoreOriginalSelected_(m,'id:sample');
  assert.deepStrictEqual(m.items['id:sample'],{original:true,style:{}}); assert.strictEqual(m.moves['id:sample'],undefined); assert.strictEqual(m.hidden['id:sample'],undefined); assert.strictEqual(m.collapse['id:sample'],undefined); assert.strictEqual(m.responsive.mobile.items['id:sample'],undefined);
}
function fakeNode(kind,category){
  const hub=category?{getAttribute:n=>n==='data-dashboard-hub-category'?category:''}:null; const node={closest(selector){if(kind==='profile'&&selector.indexOf('data-dashboard-profile-card')!==-1)return node;if(kind==='hub'&&selector==='[data-dashboard-hub-category]')return hub;if(kind==='nav'&&selector==='.bottom-nav')return node;return null;}}; return node;
}
function colorAuthorityTest(){
  const profile=fakeNode('profile'), sports=fakeNode('hub','sports'), reality=fakeNode('hub','reality'), awards=fakeNode('hub','awards'), general=fakeNode('hub','general'), nav=fakeNode('nav');
  const loaded={profile:{profileColor:'#178443'},dashboardHubAppearanceMap:{sports:{},reality:{},awards:{},general:{}},dashboardHubAppearanceRows:[{SettingKey:'nav:1',HubCategory:'navigation'}]};
  [profile,sports,reality,awards,general,nav].forEach(node=>{
    assert.strictEqual(studio.runtimeManagedPaintTarget_(node),true);
    assert.strictEqual(studio.visualStudioPaintAllowed_(node,'background-color',loaded),false);
    assert.strictEqual(studio.visualStudioPaintAllowed_(node,'padding',loaded),true);
  });
  const unresolved={profile:{},dashboardHubAppearanceMap:{},dashboardHubAppearanceRows:[]};
  [profile,sports,reality,awards,general,nav].forEach(node=>assert.strictEqual(studio.visualStudioPaintAllowed_(node,'background-color',unresolved),false,'cold-load runtime-managed paint must never flash Visual Studio blue'));
  assert.strictEqual(studio.visualStudioPaintAllowed_(fakeNode('other'),'background-color',unresolved),true,'non-runtime-managed paint remains Visual Studio-controlled');
}
function sourceContractTest(){
  assert(source.includes('autosave: false')); assert(source.includes('controller.restoreSelected(existing || selected)')); assert(source.includes('runtimeManagedPaintTarget_')); assert(source.includes("paintAllowed(node, property) === false")); assert(source.includes("Cold/runtime published Visual Studio manifest")); assert(source.includes("Quick Edit / mode switch")); assert(source.includes("Clear Selection")); assert(source.includes("authorityTrace: () => copy(authorityTrace)")); assert(source.includes("button('Undo'")); assert(source.includes("button('Revert to Server Draft'")); assert(source.includes("['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts']"));
}
(async function(){await saveRestoreReloadTest();restoreOriginalTest();colorAuthorityTest();sourceContractTest();console.log('PASS visual_studio_save_restore_color_authority_r1_tests');})().catch(e=>{console.error(e);process.exit(1);});
