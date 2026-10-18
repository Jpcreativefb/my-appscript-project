const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const {
  predictionMarketR2CreateMemoryRepository,
  predictionMarketR2CreateEngine
} = require('../backend/engines/PredictionMarketEngineR2.js');
const {
  predictionMarketPlayerR4CreateService,
  predictionMarketPlayerR4MarketView_
} = require('../backend/player/PredictionMarketPlayerR4.js');
const {
  predictionMarketR4IntentKey_,
  predictionMarketR4PrepareSubmission_,
  predictionMarketR4FailureUncertain_
} = require('../frontend/js/pages/predictionMarketsR4.js');

const appSource=read('frontend/js/app.js');
const htmlSource=read('frontend/app.html');
const apiSource=read('frontend/js/api.js');
const backendApiSource=read('backend/Api.js');
const securitySource=read('backend/core/ApiSecurity.js');
const pageSource=read('frontend/js/pages/predictionMarketsR4.js');
const playerAdapterSource=read('backend/player/PredictionMarketPlayerR4.js');
const adminSource=read('frontend/js/pages/adminPredictionMarketsR3.js');
const shellSource=read('frontend/js/adminGameBuilderNavigationShellR2.js');
const sportsWagerSource=read('backend/engines/SportsWagerEngine.js');

// Navigation / isolation.
assert(appSource.includes('"prediction-markets": ["predictionMarketsR4"]'));
assert(appSource.includes('case "prediction-markets"'));
assert(htmlSource.includes("navigate('prediction-markets')"));
assert(adminSource.includes('adminGetPredictionMarkets'));
assert(!pageSource.includes('adminGetPredictionMarkets'));
assert(!sportsWagerSource.includes('prediction-markets'));
['prediction','head-to-head','staked-prediction','wager','racing-wager','voting','ranking','mixed'].forEach(t=>assert(shellSource.includes('"'+t+'"')));
assert(!shellSource.includes('"prediction-market"'));

let nowMs=Date.parse('2026-10-18T12:00:00.000Z');
function build(displayNameResolver){
  const repository=predictionMarketR2CreateMemoryRepository();
  const engine=predictionMarketR2CreateEngine({repository,now:()=>new Date(nowMs),displayNameResolver:displayNameResolver||((id)=>id)});
  const service=predictionMarketPlayerR4CreateService({engine,now:()=>new Date(nowMs)});
  return {repository,engine,service};
}
function addDraft(engine,id,yes=0.6,no=0.4){
  return engine.createMarket({role:'ADMIN',playerId:'director'},{marketId:id,title:id+'?',description:'desc',category:'Test',referenceYesPrice:yes,referenceNoPrice:no,referencePriceAsOf:new Date(nowMs).toISOString(),referencePriceTrusted:true,providerKind:'MANUAL',lockTime:new Date(nowMs+3600000).toISOString()});
}

// Wallet bootstrap: authenticated actor, fixed engine default, no client amount/reset.
let x=build();
let state=x.service.state('alice');
assert.equal(state.wallet.availableCredits,1000);
assert.equal(state.wallet.version,0);
x.engine.bootstrapWallet({role:'PLAYER',playerId:'alice'},'alice',2500); // existing wallet must not reset
assert.equal(x.service.state('alice').wallet.availableCredits,1000);
assert.throws(()=>x.engine.getWallet({role:'PLAYER',playerId:'alice'},'bob'),/authorization/);
assert(!pageSource.includes('availableCredits ='));
assert(!pageSource.includes('SpreadsheetApp'));

// Browser status/read projection.
addDraft(x.engine,'draft');
addDraft(x.engine,'open'); x.engine.openMarket({role:'ADMIN',playerId:'director'},'open');
addDraft(x.engine,'locked'); x.engine.openMarket({role:'ADMIN',playerId:'director'},'locked'); x.engine.lockMarket({role:'ADMIN',playerId:'director'},'locked');
addDraft(x.engine,'resolved'); x.engine.openMarket({role:'ADMIN',playerId:'director'},'resolved'); x.engine.lockMarket({role:'ADMIN',playerId:'director'},'resolved'); x.engine.resolveMarket({role:'ADMIN',playerId:'director'},'resolved','YES');
addDraft(x.engine,'void'); x.engine.voidMarket({role:'ADMIN',playerId:'director'},'void');
const byId=Object.fromEntries(x.service.state('alice').markets.map(m=>[m.marketId,m]));
assert.equal(byId.open.tradingAvailable,true);
['draft','locked','resolved','void'].forEach(id=>assert.equal(byId[id].tradingAvailable,false,id));
assert.equal(predictionMarketPlayerR4MarketView_({...byId.open,referencePriceAsOf:new Date(nowMs-16*60*1000).toISOString()},nowMs).tradingAvailable,false);

// BUY YES/NO uses authenticated identity and server execution result.
let r=x.service.trade('alice',{transactionId:'buy-y',playerId:'mallory',marketId:'open',side:'BUY',outcome:'YES',quantity:10,referencePrice:0.99,expectedWalletVersion:0});
assert.equal(r.trade.playerId,'alice');
assert.equal(r.trade.executionReferencePrice,0.6);
assert.equal(r.trade.position.quantity,10);
r=x.service.trade('alice',{transactionId:'buy-n',marketId:'open',side:'BUY',outcome:'NO',quantity:5,referencePrice:0.01,expectedWalletVersion:1});
assert.equal(r.trade.executionReferencePrice,0.4);
assert.equal(r.trade.position.quantity,5);

// Insufficient credits, stale version, oversell/no short selling.
assert.throws(()=>x.service.trade('alice',{transactionId:'too-big',marketId:'open',side:'BUY',outcome:'YES',quantity:99999,referencePrice:0.6,expectedWalletVersion:2}),/Insufficient/);
assert.throws(()=>x.service.trade('alice',{transactionId:'stale-v',marketId:'open',side:'BUY',outcome:'YES',quantity:1,referencePrice:0.6,expectedWalletVersion:1}),/Stale/);
assert.throws(()=>x.service.trade('alice',{transactionId:'short',marketId:'open',side:'SELL',outcome:'NO',quantity:6,referencePrice:0.4,expectedWalletVersion:2}),/Cannot sell more/);

// Partial/full SELL for both outcomes; R2 owns accounting.
r=x.service.trade('alice',{transactionId:'sell-y-part',marketId:'open',side:'SELL',outcome:'YES',quantity:4,referencePrice:0.6,expectedWalletVersion:2});
assert.equal(r.trade.position.quantity,6);
r=x.service.trade('alice',{transactionId:'sell-y-full',marketId:'open',side:'SELL',outcome:'YES',quantity:6,referencePrice:0.6,expectedWalletVersion:3});
assert.equal(r.trade.position.quantity,0);
r=x.service.trade('alice',{transactionId:'sell-n-part',marketId:'open',side:'SELL',outcome:'NO',quantity:2,referencePrice:0.4,expectedWalletVersion:4});
assert.equal(r.trade.position.quantity,3);
r=x.service.trade('alice',{transactionId:'sell-n-full',marketId:'open',side:'SELL',outcome:'NO',quantity:3,referencePrice:0.4,expectedWalletVersion:5});
assert.equal(r.trade.position.quantity,0);

// Locked/expired and stale price failures are authoritative engine rejections.
addDraft(x.engine,'late'); x.engine.openMarket({role:'ADMIN',playerId:'director'},'late'); x.engine.lockMarket({role:'ADMIN',playerId:'director'},'late');
assert.throws(()=>x.service.trade('alice',{transactionId:'locked',marketId:'late',side:'BUY',outcome:'YES',quantity:1,referencePrice:0.6,expectedWalletVersion:6}),/not OPEN/);
addDraft(x.engine,'stale'); x.engine.openMarket({role:'ADMIN',playerId:'director'},'stale');
nowMs += 16*60*1000;
assert.throws(()=>x.service.trade('alice',{transactionId:'stale-price',marketId:'stale',side:'BUY',outcome:'YES',quantity:1,referencePrice:0.6,expectedWalletVersion:6}),/stale|fresh/i);
nowMs -= 16*60*1000;

// Idempotent browser request state: uncertain retry same id, changed trade new id, no parallel id for same pending intent.
const intent={marketId:'open',side:'BUY',outcome:'YES',quantity:2,expectedWalletVersion:6,referencePrice:0.6,requestedAt:'2026-10-18T12:00:00Z'};
let pending=predictionMarketR4PrepareSubmission_(intent,null); const firstId=pending.transactionId; pending.uncertain=true;
let retry=predictionMarketR4PrepareSubmission_(intent,pending); assert.equal(retry.transactionId,firstId);
let sameWhilePending=predictionMarketR4PrepareSubmission_(intent,retry); assert.equal(sameWhilePending.transactionId,firstId);
let changed=predictionMarketR4PrepareSubmission_({...intent,quantity:3},retry); assert.notEqual(changed.transactionId,firstId);
assert.notEqual(predictionMarketR4IntentKey_(intent),predictionMarketR4IntentKey_({...intent,outcome:'NO'}));
assert.equal(predictionMarketR4FailureUncertain_({success:false,error:'Connection timed out'}),true);
assert.equal(predictionMarketR4FailureUncertain_({success:false,error:'Insufficient available prediction market credits'}),false);
assert(pageSource.includes('pending.uncertain'));
assert(pageSource.includes('await predictionMarketR4Load_(true)'));

// Positions remain independent and portfolio is backend-produced.
x=build(); addDraft(x.engine,'both'); x.engine.openMarket({role:'ADMIN',playerId:'director'},'both'); x.service.state('alice');
x.service.trade('alice',{transactionId:'b1',marketId:'both',side:'BUY',outcome:'YES',quantity:2,referencePrice:0.6,expectedWalletVersion:0});
x.service.trade('alice',{transactionId:'b2',marketId:'both',side:'BUY',outcome:'NO',quantity:3,referencePrice:0.4,expectedWalletVersion:1});
const portfolio=x.service.state('alice').portfolio;
assert.equal(portfolio.positions.filter(p=>p.marketId==='both').length,2);
assert(portfolio.positions.some(p=>p.outcome==='YES'&&p.averageCostCredits===0.6));
assert(portfolio.positions.some(p=>p.outcome==='NO'&&p.averageCostCredits===0.4));
assert(pageSource.includes('portfolioValueCredits'));
assert(!pageSource.includes('costBasisCredits /'));

// Prediction Market leaderboard is R2 ranking with stable tie behavior.
x=build(id=>({a:'Amy',b:'Ben'}[id]||id)); x.service.state('a'); x.service.state('b');
const board=x.service.leaderboard('a').leaderboard;
assert.equal(board[0].displayName,'Amy'); assert.equal(board[1].displayName,'Ben'); assert.equal(board[0].rank,1);

// Security/API boundary: session username is authoritative; trade is POST-only; no raw store mutation/setup/settlement in player adapter.
assert(securitySource.includes('payload.username = sessionUsername'));
assert(securitySource.includes('executePredictionMarketTrade: true'));
assert(backendApiSource.includes('apiPredictionMarketPlayerR4Dispatch'));
['SpreadsheetApp','saveWallet','savePosition','commitTrade','commitSettlement','repository.setup','settlePlayerMarket'].forEach(token=>assert(!playerAdapterSource.includes(token),token));
assert(apiSource.includes('function apiPredictionMarketPlayerR4'));
assert(pageSource.includes('window.confirm'));
assert(pageSource.includes('Final server reference price is authoritative'));

console.log('PASS prediction_market_player_r4_tests');
