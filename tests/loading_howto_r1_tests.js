'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('frontend/js/sportsShell.js','utf8');
const feature=source.slice(source.indexOf('PATTC Loading / How-to-Play R2'));
assert(feature.length>4000,'Loading How-to R2 feature marker missing');
assert(!/\bfetch\s*\(/.test(feature),'Feature must not add a network fetch');
assert(!/\bapi[A-Z]\w*\s*\(/.test(feature),'Feature must not directly call backend APIs');
assert(feature.includes('ROTATION_MS=7000'),'Rotation must be slowed to a comfortable reading interval');
assert(feature.includes('Finish How-To'),'Finish How-To control missing');
assert(feature.includes('data-howto-skip'),'Skip control missing');
assert(feature.includes('data-howto-prev')&&feature.includes('data-howto-next'),'Previous/Next controls missing');
assert(feature.includes('pattcLoadingHowToCompleted:v2:'),'Local completion state missing');
assert(feature.includes('pattcLoadingHowToSeen:v1:'),'Legacy seen-state migration missing');
assert(feature.includes('originalHomeApi.apply(this,arguments)'),'Home discovery must observe the existing Home request instead of creating another request');
assert(feature.includes('@media(max-width:560px)'),'Mobile-first layout rule missing');
assert(feature.includes('bottom:calc(env(safe-area-inset-bottom) + 86px)'),'Help button should sit low but above Bottom Navigation');
assert(feature.includes('width:38px;height:38px'),'Help button should be smaller while remaining tappable');
assert(feature.includes('min-height:calc(100dvh - 24px)'),'Mobile loader guide should fill most available viewport');
for(const visual of ['lineup','confidence-numbers','survivor-path','playoff-seeds']){
  assert(feature.includes('kind==="'+visual+'"'),'Missing local/static illustration: '+visual);
}

class ClassList{
  constructor(seed=[]){this.s=new Set(seed)}
  contains(x){return this.s.has(x)} add(x){this.s.add(x)} remove(x){this.s.delete(x)} toggle(x,on){on?this.add(x):this.remove(x)}
}
class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.className='';this.classList=new ClassList();this.children=[];this.parentNode=null;this.attrs={};this.innerHTML='';this.textContent='';this.isConnected=true;this.onclick=null;this.onchange=null;}
  appendChild(n){n.parentNode=this;n.isConnected=true;this.children.push(n);return n}
  removeChild(n){this.children=this.children.filter(x=>x!==n);n.parentNode=null;n.isConnected=false;return n}
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]||''}
  matches(sel){if(sel.startsWith('.'))return this.className.split(/\s+/).includes(sel.slice(1));if(sel.startsWith('#'))return this.id===sel.slice(1);return false}
  querySelector(sel){if(this.matches(sel))return this;for(const c of this.children){const v=c.querySelector(sel);if(v)return v}return null}
  querySelectorAll(sel){let out=[];if(this.matches(sel))out.push(this);for(const c of this.children)out=out.concat(c.querySelectorAll(sel));return out}
}
function makeEnv(){
  const storage=new Map([['gameMode','team-fantasy']]);
  const root=new Node('html'),head=new Node('head'),body=new Node('body');root.appendChild(head);root.appendChild(body);
  const loader=new Node('div');loader.id='loader';loader.classList=new ClassList();
  const loaderCard=new Node('div');loaderCard.className='app-loader-card';loader.appendChild(loaderCard);body.appendChild(loader);
  const app=new Node('main');app.id='app';body.appendChild(app);
  const listeners={};
  function findById(n,id){if(n.id===id)return n;for(const c of n.children){const x=findById(c,id);if(x)return x}return null}
  const document={head,body,documentElement:root,createElement:t=>new Node(t),getElementById:id=>findById(root,id),querySelectorAll:sel=>root.querySelectorAll(sel),addEventListener:(name,fn)=>{listeners[name]=fn}};
  let timerId=0;const timers=new Map();
  const window={document,localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))},location:{hash:'#team-fantasy'},APP_STATE:{currentPage:'team-fantasy',gameId:'league-of-fantasy-champions-2026'},getFrontendGameId:()=>window.APP_STATE.gameId,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)};
  let showCalls=0,hideCalls=0,progressCalls=0,paintCalls=0,homeApiCalls=0;
  const homePayload={success:true,fastStartup:true,activeGames:[
    {GameId:'team-fantasy-2026',Name:'Team Fantasy',GameType:'team-fantasy'},
    {GameId:'traitors-2026',Name:'The Traitors',Category:'Reality TV'}
  ]};
  const homeThenable={then(fn){fn(homePayload);return {catch(){return this}}}};
  window.showLoader=function(){showCalls++;return 'shown'};
  window.hideLoader=function(){hideCalls++;return 'hidden'};
  window.updateLoaderProgress=function(){progressCalls++};
  window.appPaintProgressiveRouteShell_=function(page,target){paintCalls++;const shell=new Node('div'),card=new Node('div');shell.className='app-route-loading-shell';card.className='app-route-loading-shell-card';shell.appendChild(card);target.children=[];target.appendChild(shell);return Promise.resolve(true)};
  window.apiGetDashboardGamesHub=function(){homeApiCalls++;return homeThenable};
  return {window,document,loader,loaderCard,app,storage,listeners,timers,homePayload,homeThenable,calls:()=>({showCalls,hideCalls,progressCalls,paintCalls,homeApiCalls})};
}

const env=makeEnv();
const originalProgress=env.window.updateLoaderProgress;
const context={window:env.window,document:env.document,console,Array,String,Number,Math,Object,Promise};
vm.createContext(context);vm.runInContext(source,context,{filename:'sportsShell.js'});
assert(env.listeners.DOMContentLoaded,'Component must install at DOMContentLoaded without changing startup ordering');
env.listeners.DOMContentLoaded();
const api=env.window.PATTCLoadingHowToR1;
assert(api,'Reusable loader How-to API missing');
assert.strictEqual(env.window.updateLoaderProgress,originalProgress,'Existing loader progress function must remain authoritative');
assert.strictEqual(api.rotationMs,7000);

// First visit = full How to Play. Completion is local-only and later visits = tips.
assert.strictEqual(api.deckFor('team-fantasy',false),'howto');
api.markCompleted('team-fantasy');
assert.strictEqual(api.completed('team-fantasy'),true);
assert.strictEqual(api.deckFor('team-fantasy',false),'tips');
assert.strictEqual(api.deckFor('team-fantasy',true),'howto','Reopen path must still support the full guide');
env.storage.delete('pattcLoadingHowToCompleted:v2:team-fantasy');
env.storage.set('pattcLoadingHowToSeen:v1:team-fantasy','1');
assert.strictEqual(api.deckFor('team-fantasy',false),'tips','Legacy R1 seen state must migrate to returning Tips behavior');
env.storage.delete('pattcLoadingHowToSeen:v1:team-fantasy');

// All requested games have richer How-to + returning-tip content.
for(const key of ['team-fantasy','confidence','survivor','playoff-race']){
  assert(api.content[key],key+' content missing');
  assert(api.content[key].howto.length>=5,key+' needs a complete guide sequence');
  assert(api.content[key].tips.length>=3,key+' needs returning tips');
  const combined=api.content[key].howto.map(x=>x.text).join(' ');
  assert(/lock|kickoff|deadline/i.test(combined),key+' lock/deadline explanation missing');
  assert(/score|result|settle|points/i.test(combined),key+' scoring/result explanation missing');
}

// Slow overlay load can mount locally and starts only a timer, no request.
env.storage.delete('pattcLoadingHowToCompleted:v2:team-fantasy');
env.window.showLoader({percent:8});
assert.strictEqual(env.calls().showCalls,1,'Original loader must still run');
assert(env.loader.querySelector('.pattc-loading-howto'),'Guide must render inside existing loader card');
assert(env.loader.classList.contains('pattc-howto-active'),'Mobile presentation class should be active');
assert([...env.timers.values()].some(x=>x.ms===7000),'Guide should rotate at the R2 reading interval');

// hideLoader remains immediate and completing a real loading visit records the first-view state.
const beforeHide=env.calls().hideCalls;
const result=env.window.hideLoader();
assert.strictEqual(result,'hidden');
assert.strictEqual(env.calls().hideCalls,beforeHide+1,'Page-ready hide must immediately call authoritative hideLoader');
assert.strictEqual(env.loader.querySelector('.pattc-loading-howto'),null,'Guide is removed when page is ready');
assert(!env.loader.classList.contains('pattc-howto-active'),'Expanded mobile state must be removed on page-ready');
assert.strictEqual(api.completed('team-fantasy'),true,'A completed loading visit must record the first-view guide locally');
assert.strictEqual(api.deckFor('team-fantasy',false),'tips','Returning visits must use the shorter Tips deck');

// A later load now visibly mounts Game Tips, while full How-to remains available through openHelp(true).
env.window.showLoader({percent:8});
const returningCard=env.loader.querySelector('.pattc-loading-howto');
assert(returningCard&&returningCard.innerHTML.includes('Game Tips'),'Returning load must render the shorter Game Tips experience');
env.window.hideLoader();

// Removed loader cards must clear transient active state so a later unrelated Home load cannot mark a stale game complete.
env.storage.delete('pattcLoadingHowToCompleted:v2:team-fantasy');
env.window.APP_STATE.currentPage='team-fantasy';env.window.location.hash='#team-fantasy';env.storage.set('gameMode','team-fantasy');env.window.APP_STATE.gameId='league-of-fantasy-champions-2026';
api.mountLoaderTip('team-fantasy');
api.removeLoadingCards();
api.completeLoadingVisit();
assert.strictEqual(api.completed('team-fantasy'),false,'Removed/stale loader state must not complete a later unrelated visit');

// Home discovery observes the already-running fast Home request and returns the exact original thenable.
env.window.APP_STATE.currentPage='dashboard';env.window.location.hash='#dashboard';
env.window.showLoader({percent:8});
const beforeHomeCalls=env.calls().homeApiCalls;
const homeResult=env.window.apiGetDashboardGamesHub({fastStartup:true});
assert.strictEqual(homeResult,env.homeThenable,'Home observer must return the original request unchanged so first paint is not blocked');
assert.strictEqual(env.calls().homeApiCalls,beforeHomeCalls+1,'Home discovery must not issue an additional Home backend request');
const discovery=env.loader.querySelector('.pattc-home-discovery');
assert(discovery,'Home loader should show informational active-game discovery after the existing payload resolves');
assert(discovery.innerHTML.includes('Team Fantasy')&&discovery.innerHTML.includes('Available in Sports Hub'),'Sports discovery card/location missing');
assert(discovery.innerHTML.includes('The Traitors')&&discovery.innerHTML.includes('Available in Reality Hub'),'Reality discovery card/location missing');
assert(!discovery.innerHTML.includes('Open Game'),'Discovery must remain informational and must not add an Open Game control');
env.window.hideLoader();
assert.strictEqual(env.loader.querySelector('.pattc-home-discovery'),null,'Home discovery must disappear immediately with the authoritative loader');

// Generic fallback remains safe.
env.storage.set('gameMode','mystery');env.window.APP_STATE.currentPage='ranking';env.window.APP_STATE.gameId='custom-game';
assert.strictEqual(api.contextKey(),'generic');

// Known game mappings remain intact.
env.window.APP_STATE.currentPage='team-fantasy';env.storage.set('gameMode','team-fantasy');assert.strictEqual(api.contextKey(),'team-fantasy');
env.window.APP_STATE.currentPage='picks';env.storage.set('gameMode','confidence');env.window.APP_STATE.gameId='confidence-2026';assert.strictEqual(api.contextKey(),'confidence');
env.window.APP_STATE.currentPage='survivor';env.storage.set('gameMode','survivor');env.window.APP_STATE.gameId='survivor-2026';assert.strictEqual(api.contextKey(),'survivor');
env.window.APP_STATE.currentPage='ranking';env.window.APP_STATE.gameId='nfl-playoff-race-2026';assert.strictEqual(api.contextKey(),'playoff-race');

// Progressive shell can host guide without changing the authoritative painter.
env.storage.set('gameMode','team-fantasy');env.window.APP_STATE.currentPage='team-fantasy';env.window.APP_STATE.gameId='league-of-fantasy-champions-2026';
env.window.appPaintProgressiveRouteShell_('team-fantasy',env.app);
assert.strictEqual(env.calls().paintCalls,1,'Authoritative progressive-shell painter must still run');
assert(env.app.querySelector('.pattc-loading-howto'),'Progressive route shell can host the same local guide');

// Admin detailed loader remains untouched and receives no guide.
env.loader.classList.add('is-admin');env.window.APP_STATE.currentPage='admin-games';env.window.showLoader({percent:8,detail:'Admin detail'});
assert.strictEqual(env.loader.querySelector('.pattc-loading-howto'),null,'Admin loader must not show player how-to content');

console.log('Loading / How-to-Play R2 tests: PASS');
