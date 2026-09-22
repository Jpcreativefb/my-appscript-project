'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const fixture=fs.readFileSync('tests/owner_visual_studio_r3_dom_tests.js','utf8');
const env={require,console,__dirname};vm.createContext(env);
vm.runInContext(fixture.slice(0,fixture.indexOf('const {document,Node}=dom();'))+'\nthis.makeDOM=dom;',env);
const tick=()=>new Promise(r=>setImmediate(r));
async function main(){
 const {document,Node}=env.makeDOM();
 Node.prototype.hasAttribute=function(k){return this.getAttribute(k)!==null;};
 Object.defineProperty(Node.prototype,'dataset',{get(){if(!this.data)this.data=new Proxy({}, {set:(o,k,v)=>{o[k]=String(v);this.setAttribute('data-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v);return true;}});return this.data;}});
 Node.prototype.addEventListener=function(t,f){(this.listeners||={})[t]||=[];this.listeners[t].push(f);};
 Node.prototype.closest=function(s){return this.matches(s)?this:this.parentNode?.closest(s)||null;};
 Node.prototype.replaceChildren=function(...n){this.textContent='';n.forEach(x=>this.appendChild(x));};
 Node.prototype.getBoundingClientRect=()=>({left:0,top:0,width:300,height:200});
 Node.prototype.click=function(){this.onclick?.();};
 document.head=new Node('head');document.body.appendChild(document.head);document.readyState='complete';
 const root=new Node('main');root.id='app';document.body.appendChild(root);
 const section=new Node('section');section.id='career';root.appendChild(section);
 const heading=new Node('h2');heading.textContent='Career Stats';section.appendChild(heading);
 const events={},hostEvents={},popups=[],rows=[];let writes=0,fail=false,gate=null;
 document.addEventListener=(t,f)=>(events[t]||=[]).push(f);
 const identity={environment:'isolated-test',apiUrl:'https://script.google.com/macros/s/synthetic/exec',scriptId:'synthetic-script',spreadsheetId:'synthetic-sheet'};
 const preferences=new Map();
 const host={localStorage:{getItem:k=>preferences.get(k)||null,setItem:(k,v)=>preferences.set(k,v)},console,document,PATTC_STUDIO_R3_LOCAL:true,PATTC_STUDIO_R3_ENV:identity,API_BASE:identity.apiUrl,location:{hostname:'127.0.0.1',hash:'#dashboard'},getSession:()=>({isAdmin:true}),
 fetch:async()=>({json:async()=>identity}),api:async()=>identity,apiGetGameAppearance:async()=>({success:true,overrides:[]}),
 apiAdminGetAppearanceDashboard:async()=>({success:true,overrides:rows}),
 apiAdminSaveAppearanceOverride:async payload=>{writes++;if(gate)await gate;if(fail)throw Error('Test server unavailable; retry Save');rows.splice(0,rows.length,{EntityType:payload.entityType,EntityId:payload.entityId,ThemeOverrideJSON:JSON.stringify(payload.themeOverride),Active:true});return {success:true};},
 addEventListener:(t,f)=>(hostEvents[t]||=[]).push(f),setTimeout:()=>1,clearTimeout(){},getComputedStyle:()=>({backgroundColor:'white',color:'black',borderColor:'black'}),MutationObserver:class{observe(){}disconnect(){}},crypto:{randomUUID:()=> 'fixture'},
 open:(url,name)=>{assert.equal(name,'_blank','Never share a named popup across editors');const d=env.makeDOM().document;d.head=new Node('head');const listeners={};const popup={document:d,closed:false,focus(){this.focused=true;},addEventListener:(t,f)=>listeners[t]=f,close(){this.closed=true;listeners.beforeunload?.();},lateUnload(){listeners.beforeunload?.();}};popups.push(popup);return popup;}};
 host.window=host;vm.createContext(host);vm.runInContext(fs.readFileSync('frontend/js/ownerVisualStudioR3.js','utf8'),host);await tick();
 const api=host.PATTC_OWNER_VISUAL_STUDIO_R3;api.open();await tick();await tick();
 const panel=()=>document.getElementById('pattcStudioR3')||popups.find(p=>!p.closed)?.document.getElementById('pattcStudioR3');
 const button=name=>panel().querySelectorAll('button').find(n=>n.textContent===name);
 const status=()=>panel().querySelector('[data-status]').textContent;
 const click=async name=>{button(name).click();await tick();await tick();};
 const setColor=async value=>{const input=panel().querySelector('[data-field="backgroundColor"]');input.value=value;input.listeners.input.forEach(fn=>fn());await tick();};
 const event={target:heading,preventDefault(){},stopImmediatePropagation(){}};(events.click||[]).forEach(fn=>fn(event));await tick();
 for(const label of ['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts']){
   let release;gate=new Promise(r=>release=r);await setColor('rgb(35, 91, '+(100+writes)+')');
   await click(label);assert.equal(status(),'Saving…');assert(api.snapshot().opened);assert.equal(rows.length,writes===1?0:1,'No verified success while request is pending');
   release();gate=null;await tick();await tick();assert.equal(status(),'Draft Saved');
   assert.equal(JSON.parse(rows[0].ThemeOverrideJSON).items['id:career'].style.backgroundColor,api.snapshot().manifest.items['id:career'].style.backgroundColor);
   const count=writes;await click(label);assert.equal(status(),'No changes to save');assert.equal(writes,count,'Clean save must not rewrite Draft');
 }
 fail=true;await setColor('navy');await click('Save Section');assert.match(status(),/^Save Failed: .*retry Save/);assert(api.snapshot().dirty);fail=false;await click('Save Section');assert.equal(status(),'Draft Saved');
 // Color previews never mutate/save Draft until Apply; cancel/revert keep selection.
 const openColor=()=>panel().querySelector('[data-field="backgroundColor"]').listeners.click.forEach(fn=>fn());
 openColor();let dialog=panel().querySelector('.r3-color-editor');assert(dialog);
 const before=JSON.stringify(api.snapshot().manifest), beforeWrites=writes;
 let custom=dialog.querySelectorAll('input').find(n=>n.getAttribute('aria-label')==='Custom color');custom.value='#FFFFFF';custom.oninput();
 assert.equal(JSON.stringify(api.snapshot().manifest),before);assert.equal(writes,beforeWrites);assert(api.snapshot().opened);
 assert.equal(section.style.getPropertyValue('background-color'),'rgb(255, 255, 255)');
 await click('Save Section');assert.match(status(),/Apply or cancel/);assert.equal(writes,beforeWrites);
 await click('Revert color');assert.equal(JSON.stringify(api.snapshot().manifest),before);
 await click('Cancel color');assert(!panel().querySelector('.r3-color-editor'));assert.equal(JSON.stringify(api.snapshot().manifest),before);
 openColor();dialog=panel().querySelector('.r3-color-editor');custom=dialog.querySelectorAll('input').find(n=>n.getAttribute('aria-label')==='Custom color');
 custom.value='bad-color';custom.oninput();assert(button('Apply color').disabled);
 custom.value='rgba(35, 91, 132, 0.5)';custom.oninput();assert(!button('Apply color').disabled);
 await click('Save favorite');assert([...preferences.keys()].some(k=>k.endsWith('favorites')));assert.equal(writes,beforeWrites);
 await click('Apply color');assert(!panel().querySelector('.r3-color-editor'));assert(api.snapshot().dirty);await click('Save Section');assert.equal(status(),'Draft Saved');
 assert.equal(api.snapshot().manifest.items['id:career'].style.backgroundColor,'rgba(35, 91, 132, 0.5)');
 assert([...preferences.keys()].some(k=>k.endsWith('recent')));
 openColor();assert.equal(panel().querySelectorAll('input').find(n=>n.getAttribute('aria-label')==='Color opacity').value,'50');await click('Cancel color');
 await click('Separate Window');const popup=popups.at(-1);assert.equal(document.getElementById('pattcStudioR3'),null);
 await setColor('teal');assert(api.snapshot().opened);assert.equal(popup.document.querySelectorAll('#pattcStudioR3').length,1);await click('Save Section');assert.equal(status(),'Draft Saved');
 api.open();await tick();assert(popup.focused,'Launcher focuses existing detached editor');
 await click('Return to Dock');assert(document.getElementById('pattcStudioR3'));assert(popup.closed);
 await click('Separate Window');const next=popups.at(-1);popup.lateUnload();assert(next.document.getElementById('pattcStudioR3'),'Old unload must not steal current panel');
 next.close();assert(document.getElementById('pattcStudioR3'),'Closing popup returns controls without closing Studio');
 await click('Separate Window');const last=popups.at(-1);last.closed=true;api.open();await tick();assert(document.getElementById('pattcStudioR3'),'Launcher recovers a lost window even without unload');
 await click('Separate Window');hostEvents.pagehide.forEach(fn=>fn());assert(popups.at(-1).closed,'Refresh cannot leave stale popup controls');
 console.log('R3 owner acceptance: all four saves, clean feedback, verified persistence, failure/retry, detached color edit, focus/recovery, popup ownership and refresh cleanup PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
