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
  predictionMarketCommunityR1CreateService
} = require('../backend/player/PredictionMarketCommunityR1.js');
const {
  predictionMarketPlayerR4CreateService
} = require('../backend/player/PredictionMarketPlayerR4.js');

let nowMs = Date.parse('2026-10-19T12:00:00.000Z');
const repository = predictionMarketR2CreateMemoryRepository();
const engine = predictionMarketR2CreateEngine({repository, now:()=>new Date(nowMs)});
const community = predictionMarketCommunityR1CreateService({repository, now:()=>new Date(nowMs)});
const player = predictionMarketPlayerR4CreateService({engine, now:()=>new Date(nowMs), communityService:community});

function addOpen(id, yes, no) {
  engine.createMarket({role:'ADMIN',playerId:'director'}, {
    marketId:id,title:id,description:'Community analytics test',category:'Test',
    referenceYesPrice:yes,referenceNoPrice:no,referencePriceAsOf:new Date(nowMs).toISOString(),
    referencePriceTrusted:true,providerKind:'MANUAL',lockTime:new Date(nowMs+3600000).toISOString()
  });
  engine.openMarket({role:'ADMIN',playerId:'director'}, id);
}

addOpen('community-live',0.6,0.4);
player.state('alice');
player.state('bob');
const referenceBefore = engine.getMarkets().find(m=>m.marketId==='community-live').referenceYesPrice;
player.trade('alice',{transactionId:'c1',marketId:'community-live',side:'BUY',outcome:'YES',quantity:10,expectedWalletVersion:0,referencePrice:0.01});
player.trade('bob',{transactionId:'c2',marketId:'community-live',side:'BUY',outcome:'NO',quantity:5,expectedWalletVersion:0,referencePrice:0.99});
player.trade('bob',{transactionId:'c3',marketId:'community-live',side:'BUY',outcome:'YES',quantity:2,expectedWalletVersion:1,referencePrice:0.99});
player.trade('alice',{transactionId:'c4',marketId:'community-live',side:'SELL',outcome:'YES',quantity:4,expectedWalletVersion:1,referencePrice:0.01});
const referenceAfter = engine.getMarkets().find(m=>m.marketId==='community-live').referenceYesPrice;
assert.equal(referenceAfter, referenceBefore, 'PATTC trading must never move external/reference price');

const live = community.market('community-live');
assert.equal(live.usersPositionedYes,2);
assert.equal(live.usersPositionedNo,1);
assert.equal(live.yesShareQuantity,8);
assert.equal(live.noShareQuantity,5);
assert.equal(live.yesPositioningPercent,61.538462);
assert.equal(live.noPositioningPercent,38.461538);
assert.equal(live.participatingPlayers,2);
assert.equal(live.buyVolumeCredits,9.2);
assert.equal(live.sellVolumeCredits,2.4);
assert.equal(live.tradingVolumeCredits,11.6);
assert.equal(live.tradeCount,4);
assert.equal(live.activity.reduce((n,row)=>n+row.tradeCount,0),4);
assert(!JSON.stringify(live).includes('alice'));
assert(!JSON.stringify(live).includes('bob'));
assert(!Object.prototype.hasOwnProperty.call(live,'trades'));
assert(!Object.prototype.hasOwnProperty.call(live,'playerIds'));

const state = player.state('alice');
const projected = state.markets.find(m=>m.marketId==='community-live');
assert(projected.community, 'player state must expose aggregate community projection');
assert.equal(projected.referenceYesPrice,0.6);
assert.equal(projected.community.yesPositioningPercent,61.538462);

addOpen('empty-community',0.55,0.45);
const empty = community.market('empty-community');
assert.equal(empty.participatingPlayers,0);
assert.equal(empty.tradingVolumeCredits,0);
assert.equal(empty.yesPositioningPercent,null);
assert.equal(empty.noPositioningPercent,null);
assert.equal(empty.movement24h.supported,false);
assert.deepEqual(empty.activity,[]);

const historyNow = Date.parse('2026-10-19T12:00:00.000Z');
const iso = delta => new Date(historyNow + delta).toISOString();
const DAY = 24*60*60*1000;
const historyRepository = predictionMarketR2CreateMemoryRepository({
  wallets:[{playerId:'p1'},{playerId:'p2'}],
  positions:[
    {playerId:'p1',marketId:'history',outcome:'YES',quantity:10},
    {playerId:'p2',marketId:'history',outcome:'NO',quantity:3}
  ],
  transactions:[
    {transactionId:'h1',playerId:'p1',marketId:'history',side:'BUY',outcome:'YES',quantity:2,grossCredits:1.2,status:'COMMITTED',committedAt:iso(-8*DAY)},
    {transactionId:'h2',playerId:'p2',marketId:'history',side:'BUY',outcome:'NO',quantity:4,grossCredits:1.6,status:'COMMITTED',committedAt:iso(-6*DAY)},
    {transactionId:'h3',playerId:'p1',marketId:'history',side:'BUY',outcome:'YES',quantity:4,grossCredits:2.4,status:'COMMITTED',committedAt:iso(-2*DAY)},
    {transactionId:'h4',playerId:'p1',marketId:'history',side:'BUY',outcome:'YES',quantity:4,grossCredits:2.4,status:'COMMITTED',committedAt:iso(-12*60*60*1000)},
    {transactionId:'h5',playerId:'p2',marketId:'history',side:'SELL',outcome:'NO',quantity:1,grossCredits:0.4,status:'COMMITTED',committedAt:iso(-6*60*60*1000)}
  ]
});
const history = predictionMarketCommunityR1CreateService({historyRepository, repository:historyRepository, now:()=>new Date(historyNow)}).market('history');
assert.equal(history.yesPositioningPercent,76.923077);
assert.equal(history.buyVolumeCredits,7.6);
assert.equal(history.sellVolumeCredits,0.4);
assert.equal(history.movement24h.supported,true);
assert.equal(history.movement24h.yesPointChange,16.923077);
assert.equal(history.movement7d.supported,true);
assert.equal(history.movement7d.yesPointChange,-23.076923);
assert.equal(history.activity.length,4);
assert(history.activity.every(row=>!Object.prototype.hasOwnProperty.call(row,'playerId')));

const pageSource = read('frontend/js/pages/predictionMarketsR4.js');
const playerSource = read('backend/player/PredictionMarketPlayerR4.js');
const storeSource = read('backend/engines/PredictionMarketStoreR2.js');
const engineSource = read('backend/engines/PredictionMarketEngineR2.js');
assert(pageSource.includes('PATTC Community'));
assert(pageSource.includes('PATTC Positioning'));
assert(pageSource.includes('External market'));
assert(!pageSource.includes('SpreadsheetApp'));
assert(!pageSource.includes('PredictionMarketTransactions'));
assert(!pageSource.includes('PredictionMarketPositions'));
assert(!playerSource.includes('SpreadsheetApp'));
assert(storeSource.includes('listTransactions:listTransactions'));
assert(storeSource.includes('listPositions:listPositions'));
const sheetsBlock = engineSource.match(/var PREDICTION_MARKET_R2_SHEETS = Object\.freeze\(\{[\s\S]*?\}\);/)[0];
assert.equal((sheetsBlock.match(/PredictionMarket/g)||[]).length,5,'community analytics must not add a sixth Prediction Market store');
assert(!sheetsBlock.includes('Community'));

console.log('PASS prediction_market_community_r1_tests');
