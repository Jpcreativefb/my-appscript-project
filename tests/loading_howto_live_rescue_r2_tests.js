'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const config=fs.readFileSync('frontend/js/config.js','utf8');
assert(!/\bfetch\s*\(/.test(config),'boot shim must not add network fetches');
assert(config.includes('awards:api-end'),'cold Home must observe the existing API completion event');
assert(config.includes('getDashboardGamesHub'),'observer must be scoped to Dashboard only');
assert(config.includes('pattcLoadingHowToCompleted:v2:'),'Finish must write current completion key');
assert(config.includes('pattcLoadingHowToSeen:v1:'),'Finish must preserve legacy seen compatibility');

const listeners={};
const storage=new Map();
const document={addEventListener(name,fn,opts){(listeners[name]||(listeners[name]=[])).push({fn,opts});}};
const window={document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))}};
const context={window,document,console,String};
vm.createContext(context);vm.runInContext(config,context,{filename:'config.js'});
assert(listeners['awards:api-end']&&listeners['awards:api-end'].length===1,'Home observer must install during config evaluation, before DOMContentLoaded');
assert(listeners.click&&listeners.click[0].opts===true,'Finish persistence must use capture phase before loader card removal');

let mounted=0;const payload={success:true,activeGames:[{GameId:'team-fantasy-2026'}]};
window.PATTCLoadingHowToR1={mountHomeDiscovery(result){mounted++;assert.strictEqual(result,payload);}};
listeners['awards:api-end'][0].fn({detail:{action:'getDashboardGamesHub',result:payload}});
assert.strictEqual(mounted,1,'existing Dashboard result must reach Home discovery without starting another request');
listeners['awards:api-end'][0].fn({detail:{action:'getUserProfileHistory',result:{}}});
assert.strictEqual(mounted,1,'unrelated API completions must be ignored');

const card={getAttribute:name=>name==='data-howto-key'?'team-fantasy':''};
const finish={closest:selector=>selector==='[data-howto-finish]'?finish:selector==='.pattc-loading-howto'?card:null};
listeners.click[0].fn({target:finish});
assert.strictEqual(storage.get('pattcLoadingHowToCompleted:v2:team-fantasy'),'1','Finish must persist current completion state');
assert.strictEqual(storage.get('pattcLoadingHowToSeen:v1:team-fantasy'),'1','Finish must persist legacy-compatible seen state');

console.log('Loading / How-to live rescue R2 tests: PASS');
