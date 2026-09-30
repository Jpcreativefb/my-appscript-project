'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('frontend/js/sportsShell.js','utf8');
const feature=source.slice(source.indexOf('PATTC Loading / How-to-Play R1'));
assert(feature.length>1000,'Loading How-to R1 feature marker missing');
assert(!/\bfetch\s*\(/.test(feature),'Feature must not add a network fetch');
assert(!/\bapi[A-Z]\w*\s*\(/.test(feature),'Feature must not call backend APIs');
assert(feature.includes('3600'),'Tip rotation should be local timer-driven');

class ClassList{
  constructor(seed=[]){this.s=new Set(seed)}
  contains(x){return this.s.has(x)} add(x){this.s.add(x)} remove(x){this.s.delete(x)} toggle(x,on){on?this.add(x):this.remove(x)}
}
class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.className='';this.classList=new ClassList();this.children=[];this.parentNode=null;this.attrs={};this.innerHTML='';this.textContent='';this.isConnected=true;this.onclick=null;this.onchange=null;}
  appendChild(n){n.parentNode=this;n.isConnected=true;this.children.push(n);return n}
  removeChild(n){this.children=this.children.filter(x=>x!==n);n.parentNode=null;n.isConnected=false;return n}
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]||''}
  matches(sel){if(sel.startsWith('.'))return this.className.split(/\s+/).includes(sel.slice(1));if(sel.startsWith('#'))return this.id===sel.slice(1);if(sel==='[data-howto-prev]')return this.attrs['data-howto-prev']!==undefined;if(sel==='[data-howto-next]')return this.attrs['data-howto-next']!==undefined;return false}
  querySelector(sel){
    if(this.matches(sel))return this;
    for(const c of this.children){const v=c.querySelector(sel);if(v)return v}
    return null;
  }
  querySelectorAll(sel){let out=[];if(this.matches(sel))out.push(this);for(const c of this.children)out=out.concat(c.querySelectorAll(sel));return out}
}
function makeEnv(){
  const storage=new Map([['gameMode','team-fantasy']]);
  const root=new Node('html'),head=new Node('head'),body=new Node('body');root.appendChild(head);root.appendChild(body);
  const loader=new Node('div');loader.id='loader';loader.classList=new ClassList();
  const loaderCard=new Node('div');loaderCard.className='app-loader-card';loader.appendChild(loaderCard);body.appendChild(loader);
  const app=new Node('main');app.id='app';body.appendChild(app);
  const ids={loader,app};
  const listeners={};
  const document={
    head,body,documentElement:root,
    createElement:t=>new Node(t),
    getElementById:id=>ids[id]||findById(root,id),
    querySelectorAll:sel=>root.querySelectorAll(sel),
    addEventListener:(name,fn)=>{listeners[name]=fn}
  };
  function findById(n,id){if(n.id===id)return n;for(const c of n.children){const x=findById(c,id);if(x)return x}return null}
  let timerId=0;const timers=new Map();
  const window={document,localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))},location:{hash:'#team-fantasy'},APP_STATE:{currentPage:'team-fantasy',gameId:'league-of-fantasy-champions-2026'},getFrontendGameId:()=>window.APP_STATE.gameId,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)};
  let showCalls=0,hideCalls=0,progressCalls=0,paintCalls=0;
  window.showLoader=function(){showCalls++;return 'shown'};
  window.hideLoader=function(){hideCalls++;return 'hidden'};
  window.updateLoaderProgress=function(){progressCalls++};
  window.appPaintProgressiveRouteShell_=function(page,target){paintCalls++;const shell=new Node('div'),card=new Node('div');shell.className='app-route-loading-shell';card.className='app-route-loading-shell-card';shell.appendChild(card);target.children=[];target.appendChild(shell);return Promise.resolve(true)};
  return {window,document,loader,loaderCard,app,storage,listeners,timers,calls:()=>({showCalls,hideCalls,progressCalls,paintCalls})};
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

// 1. Long overlay load can render a local tip and start rotation.
env.window.showLoader({percent:8});
assert.strictEqual(env.calls().showCalls,1,'Original loader must still run');
assert(env.loader.querySelector('.pattc-loading-howto'),'Team Fantasy tip must render inside existing loader card');
assert(env.timers.size>0,'Long load can rotate tips without blocking page work');

// 2 + 3. hideLoader is called immediately; slideshow never gates page exit.
const beforeHide=env.calls().hideCalls;
const result=env.window.hideLoader();
assert.strictEqual(result,'hidden');
assert.strictEqual(env.calls().hideCalls,beforeHide+1,'Fast completion must immediately call authoritative hideLoader');
assert.strictEqual(env.loader.querySelector('.pattc-loading-howto'),null,'Tip card is removed when page is ready');

// 4. Unknown game-specific content on a game route safely uses generic content.
env.storage.set('gameMode','mystery');env.window.APP_STATE.currentPage='ranking';env.window.APP_STATE.gameId='custom-game';
assert.strictEqual(api.contextKey(),'generic');

// Known Phase 1 game mappings.
env.window.APP_STATE.currentPage='team-fantasy';env.storage.set('gameMode','team-fantasy');assert.strictEqual(api.contextKey(),'team-fantasy');
env.window.APP_STATE.currentPage='picks';env.storage.set('gameMode','confidence');assert.strictEqual(api.contextKey(),'confidence');
env.window.APP_STATE.currentPage='survivor';env.storage.set('gameMode','survivor');assert.strictEqual(api.contextKey(),'survivor');
env.window.APP_STATE.currentPage='ranking';env.window.APP_STATE.gameId='nfl-playoff-race-2026';assert.strictEqual(api.contextKey(),'playoff-race');

// Progressive-shell route gets tips without converting it to a blocking overlay.
env.storage.set('gameMode','team-fantasy');env.window.APP_STATE.currentPage='team-fantasy';env.window.APP_STATE.gameId='league-of-fantasy-champions-2026';
env.window.appPaintProgressiveRouteShell_('team-fantasy',env.app);
assert.strictEqual(env.calls().paintCalls,1,'Authoritative progressive-shell painter must still run');
assert(env.app.querySelector('.pattc-loading-howto'),'Progressive route shell can host the same tip content');

// 7. Admin detailed loader remains untouched and receives no tip.
env.loader.classList.add('is-admin');env.window.APP_STATE.currentPage='admin-games';env.window.showLoader({percent:8,detail:'Admin detail'});
assert.strictEqual(env.loader.querySelector('.pattc-loading-howto'),null,'Admin loader must not show player how-to content');

// First-visit preference is local-only and suppresses a previously seen key.
env.loader.classList.remove('is-admin');env.storage.set('pattcLoadingHowToMode:v1','first');env.storage.set('pattcLoadingHowToSeen:v1:team-fantasy','1');env.window.APP_STATE.currentPage='team-fantasy';env.storage.set('gameMode','team-fantasy');
assert.strictEqual(api.shouldShow('team-fantasy'),false);

console.log('Loading / How-to-Play R1 tests: PASS');
