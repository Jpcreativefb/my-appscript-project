const assert=require('assert'),fs=require('fs'),vm=require('vm');
const awards=fs.readFileSync('backend/engines/AwardsManagerEngine.js','utf8'),discovery=fs.readFileSync('backend/engines/PredictionMarketExternalDiscoveryR2.js','utf8');
function context(){const ctx={console,requireAdmin_:()=>{}};vm.createContext(ctx);vm.runInContext(awards,ctx);vm.runInContext(discovery,ctx);return ctx;}
const c=context(),parse=c.predictionMarketExternalDiscoveryR2ParseReference_;
assert.equal(parse('https://polymarket.com/sports/futures/nfl').collection,'polymarket-sports');
assert.throws(()=>parse('https://polymarket.com/sports'),/listing\/category page/);
assert.throws(()=>parse('https://polymarket.com.evil.example/event/foo'),/Only official/);
assert.throws(()=>parse('https://evil.example/polymarket.com/event/foo'),/Only official/);
assert.throws(()=>parse('https://kalshi.com/markets'),/specific event/);
assert.equal(parse('https://kalshi.com/markets/kxnfl/football/kxnfl-26?utm_source=test').eventId,'KXNFL-26');
assert.equal(parse('https://polymarket.com/event/champion/team?tid=1').slug,'champion');
assert.equal(parse('market:321','polymarket').marketId,'321');
const options={searchIn:'both',exactPhrase:false},match=c.predictionMarketExternalDiscoveryR2Matches_;
assert(match({title:'Chicago Bears win totals'},'Chicago Bears',options));
assert(!match({title:'Election',description:'Chicago Bears are mentioned in the rules'},'Chicago Bears',options));
assert(!match({title:'Different nominees',markets:[{question:'Chicago'},{question:'Bears'}]},'Chicago Bears',options));
assert(!match({title:'Bearskin coat sales'},'Bears',options));
assert(match({title:'Oscars',markets:[{question:'Best Actor'}]},'Oscars Best Actor',options));
assert(!match({title:'Best Supporting Actor'},'Best Actor',{...options,exactPhrase:true}));
assert(match({title:'Best—Actor'},'Best Actor',{...options,exactPhrase:true}));
assert(!match({title:'NFL champion'},'NFL',{...options,searchIn:'markets'}));
assert(match({title:'Pro Football: 2027 Champion',tags:[{label:'Sports'}]},'NFL',{...options,category:'Sports'}));
assert(!match({title:'NFL champion',markets:[]},'NFL',{...options,marketType:'Oscars'}));
assert(!match({title:'NFL champion'},'NFL',{...options,closeAfter:'2027-01-01'}));
assert.throws(()=>c.predictionMarketExternalDiscoveryR2Options_({closeAfter:'2027-02-01',closeBefore:'2027-01-01'}),/must be before/);
const event=(id,title,extra={})=>({id,slug:'slug-'+id,title,active:true,closed:false,markets:[{id:'m'+id,question:title,outcomes:['Yes','No'],outcomePrices:['0.5','0.5']}],...extra});
let urls=[];c.awardsManagerFetchJson_=url=>{urls.push(url);if(url.includes('/public-search'))return url.includes('page=2')?{events:[event('2','Chicago Bears postseason')],pagination:{hasMore:false}}:{events:[event('1','Chicago Bears champion'),event('bad','Unrelated election',{description:'Chicago Bears'})],pagination:{hasMore:true}};throw Error('Unexpected '+url);};
let result=c.predictionMarketExternalDiscoveryR2Search({query:'Chicago Bears',provider:'polymarket'});assert.equal(result.events.length,1);assert(result.hasMore);assert.equal(result.scannedPages,1);assert.equal(urls.length,1,'bounded first response');
result=c.predictionMarketExternalDiscoveryR2Search({query:'Chicago Bears',provider:'polymarket',searchStateJSON:JSON.stringify(result.searchState)});assert.equal(result.events[0].externalEventId,'2');assert(!result.hasMore);assert.equal(urls.length,2);
// Open filters operate on complete raw events, before summary previews truncate children.
c.awardsManagerFetchJson_=()=>({events:[event('3','Chicago Bears',{markets:[{id:'a',question:'Chicago Bears',market_type:'NFL',outcomes:['Yes','No']}]})],pagination:{hasMore:false}});
assert.equal(c.predictionMarketExternalDiscoveryR2Search({query:'Chicago Bears',provider:'polymarket',marketType:'Oscars'}).events.length,0);
// Closed continuation traverses closed then settled, without silently rescanning the first pages.
urls=[];c.awardsManagerFetchJson_=url=>{urls.push(url);return {events:[{event_ticker:'KX-26',title:'Chicago Bears',status:url.includes('settled')?'settled':'closed',markets:[]}],cursor:''};};
let closed=c.predictionMarketExternalDiscoveryR2Search({query:'Chicago Bears',provider:'kalshi',status:'closed'});assert(closed.hasMore);closed=c.predictionMarketExternalDiscoveryR2Search({query:'Chicago Bears',provider:'kalshi',status:'closed',searchStateJSON:JSON.stringify(closed.searchState)});assert(!closed.hasMore);assert(urls[1].includes('status=settled'));
// Whole NFL futures pages browse API collections with continuation and no import writes.
urls=[];c.awardsManagerFetchJson_=url=>{urls.push(url);if(url.endsWith('/sports'))return [{sport:'nfl',name:'NFL'}];if(url.endsWith('/tags/slug/nfl'))return {id:'450'};if(url.endsWith('/tags/slug/games'))return {id:'100639'};if(url.includes('/events?tag_id=450'))return Array.from({length:url.includes('offset=50')?1:50},(_,i)=>event('browse-'+i,'Pro Football Champion'));throw Error(url);};
let browsed=c.predictionMarketExternalDiscoveryR2Resolve({reference:'https://polymarket.com/sports/futures/nfl'});assert(browsed.collection);const adapter=require('../backend/admin/AdminPredictionMarketsR3.js').predictionMarketAdminR3CreateService({engine:{},externalResolve:p=>c.predictionMarketExternalDiscoveryR2Resolve(p)});assert(adapter.resolveExternal('fixture-admin',{reference:'https://polymarket.com/sports/futures/nfl'}).collection);assert.equal(browsed.events.length,50);assert(browsed.hasMore);assert(urls.some(url=>url.includes('exclude_tag_id=100639')));
browsed=c.predictionMarketExternalDiscoveryR2Resolve({reference:'https://polymarket.com/sports/futures/nfl',searchStateJSON:JSON.stringify(browsed.searchState)});assert(!browsed.hasMore);assert(urls.some(url=>url.includes('offset=50')));
// Exact resolution never asks broad search or chooses an unrelated fallback.
urls=[];c.predictionMarketExternalDiscoveryR2Search=()=>{throw Error('URL resolution must not use text search');};
c.awardsManagerFetchJson_=url=>{urls.push(url);if(url.endsWith('/events/slug/champion'))return event('123','Championship',{slug:'champion'});if(url.endsWith('/events/123'))return event('123','Championship',{slug:'champion'});throw Error('Provider request failed (404).');};
let resolved=c.predictionMarketExternalDiscoveryR2Resolve({reference:'https://polymarket.com/event/champion'});assert.equal(resolved.event.externalEventId,'123');assert.equal(urls.length,2);assert(urls[0].endsWith('/events/slug/champion'));
assert.throws(()=>c.predictionMarketExternalDiscoveryR2Resolve({reference:'https://polymarket.com/event/not-found'}),/404/);
c.awardsManagerFetchJson_=()=>event('999','Wrong event',{slug:'unrelated'});assert.throws(()=>c.predictionMarketExternalDiscoveryR2Resolve({reference:'https://polymarket.com/event/champion'}),/exact event/);
c.awardsManagerFetchJson_=url=>{if(url.endsWith('/events/KX-26-A'))throw Error('Provider request failed (404).');if(url.endsWith('/markets/KX-26-A'))return {market:{ticker:'KX-26-A',event_ticker:'KX-26'}};if(url.includes('/events/KX-26?'))return {event:{event_ticker:'KX-26',title:'NFL champion'},markets:[{ticker:'KX-26-A',title:'Team',yes_bid:50,no_bid:50}]};throw Error(url);};
assert.equal(c.predictionMarketExternalDiscoveryR2Resolve({reference:'KX-26-A',providerHint:'kalshi'}).event.externalEventId,'KX-26');
// Frontend pending/elapsed state, provider warning visibility, continuation, and failure cleanup.
(async()=>{
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',hidden:false,disabled:false,setAttribute(){}});return nodes.get(id);}const buttons=[node('search'),node('resolve')];let release,requests=[],timers=new Map(),timerId=0;
const window={setInterval:fn=>{timers.set(++timerId,fn);return timerId;},clearInterval:id=>timers.delete(id),setTimeout(){}};
let handler=()=>new Promise(r=>release=r);const ui={window,document:{getElementById:node,querySelectorAll:()=>buttons},api:async(a,p)=>{requests.push(p);return handler(p);},console};vm.createContext(ui);vm.runInContext(fs.readFileSync('frontend/js/pages/adminPredictionMarketsR3.js','utf8'),ui);
const form={elements:Object.fromEntries(Object.entries({query:'Chicago Bears',provider:'polymarket',status:'open'}).map(([k,value])=>[k,{value}]))};
const pending=window.predictionMarketAdminR3ExternalSearch_({currentTarget:form,preventDefault(){}});assert(node('adminPredictionMarketDiscoveryStatus').textContent.includes('Searching'));assert(buttons.every(b=>b.disabled));for(const tick of timers.values())tick();assert(node('adminPredictionMarketDiscoveryStatus').textContent.includes('elapsed'));release({success:true,events:[{provider:'polymarket',externalEventId:'1',eventName:'Chicago Bears'}],hasMore:true,searchState:{open:{polymarket:{page:2}}},scannedPages:1,errors:['Kalshi unavailable']});await pending;assert(buttons.every(b=>!b.disabled));assert.equal(timers.size,0);assert(node('adminPredictionMarketDiscoveryStatus').textContent.includes('Kalshi unavailable'));assert(!node('adminPredictionMarketExternalMore').hidden);
handler=async()=>({success:true,events:[{provider:'polymarket',externalEventId:'1',eventName:'Chicago Bears'},{provider:'polymarket',externalEventId:'2',eventName:'Chicago Bears postseason'}],hasMore:false,scannedPages:1});await window.predictionMarketAdminR3ExternalMore_();assert(requests[1].searchStateJSON.includes('page'));assert(node('adminPredictionMarketDiscoveryStatus').textContent.includes('2 matching event'));assert(node('adminPredictionMarketExternalMore').hidden);
handler=async()=>({success:true,collection:true,collectionLabel:'NFL futures',events:[{provider:'polymarket',externalEventId:'nfl-1',eventName:'Championship'}],searchState:{offset:50},hasMore:true,scannedPages:1});await window.predictionMarketAdminR3BrowseFutures_({preventDefault(){},currentTarget:{elements:{listingSport:{value:'nfl'},listingKind:{value:'futures'}}}});assert(requests.at(-1).reference.endsWith('/sports/futures/nfl'));assert(node('adminPredictionMarketDiscoveryStatus').textContent.includes('NFL futures'));
handler=async()=>{throw Error('Provider request failed (429).');};await window.predictionMarketAdminR3ExternalSearch_({currentTarget:form,preventDefault(){}});assert(node('adminPredictionMarketDiscoveryStatus').textContent.includes('429'));assert(buttons.every(b=>!b.disabled));assert.equal(timers.size,0);
console.log('Prediction discovery repair: exact URL/ID lookup, listing/host validation, strict scope/type/date filters, bounded open/closed continuation, dedupe, pending/elapsed/errors and read-only UI passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
