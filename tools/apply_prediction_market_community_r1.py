from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(rel, old, new):
    path = ROOT / rel
    text = path.read_text()
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one anchor in {rel}: {old[:100]!r}; found {text.count(old)}")
    path.write_text(text.replace(old, new, 1))


community_source = r'''/* =====================================================
   PREDICTION MARKET COMMUNITY MOVEMENT R1
   Aggregate/read-only analytics over accepted Prediction Market stores.
   Never supplies or changes external/reference trade pricing.
===================================================== */

function predictionMarketCommunityR1String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketCommunityR1Finite_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : (fallback == null ? 0 : fallback);
}

function predictionMarketCommunityR1Round_(value) {
  return Math.round(predictionMarketCommunityR1Finite_(value) * 1000000) / 1000000;
}

function predictionMarketCommunityR1Percent_(yes, no) {
  var total = predictionMarketCommunityR1Finite_(yes) + predictionMarketCommunityR1Finite_(no);
  return total > 0 ? predictionMarketCommunityR1Round_(predictionMarketCommunityR1Finite_(yes) * 100 / total) : null;
}

function predictionMarketCommunityR1Timestamp_(transaction) {
  var value = predictionMarketCommunityR1String_(transaction && (transaction.committedAt || transaction.requestedAt));
  var millis = Date.parse(value);
  return isFinite(millis) ? millis : null;
}

function predictionMarketCommunityR1CommittedTransactions_(rows, marketId, knownPlayers) {
  marketId = predictionMarketCommunityR1String_(marketId);
  return (rows || []).filter(function(transaction) {
    var playerId = predictionMarketCommunityR1String_(transaction && transaction.playerId);
    var side = predictionMarketCommunityR1String_(transaction && transaction.side).toUpperCase();
    var outcome = predictionMarketCommunityR1String_(transaction && transaction.outcome).toUpperCase();
    var quantity = Number(transaction && transaction.quantity);
    var grossCredits = Number(transaction && transaction.grossCredits);
    return predictionMarketCommunityR1String_(transaction && transaction.marketId) === marketId &&
      predictionMarketCommunityR1String_(transaction && transaction.status).toUpperCase() === "COMMITTED" &&
      (!knownPlayers || knownPlayers[playerId] === true) &&
      (side === "BUY" || side === "SELL") &&
      (outcome === "YES" || outcome === "NO") &&
      isFinite(quantity) && quantity > 0 && isFinite(grossCredits) && grossCredits >= 0 &&
      predictionMarketCommunityR1Timestamp_(transaction) != null;
  }).slice().sort(function(a, b) {
    return predictionMarketCommunityR1Timestamp_(a) - predictionMarketCommunityR1Timestamp_(b);
  });
}

function predictionMarketCommunityR1Replay_(transactions, throughMillis) {
  var yes = 0;
  var no = 0;
  var saw = false;
  var valid = true;
  (transactions || []).forEach(function(transaction) {
    var timestamp = predictionMarketCommunityR1Timestamp_(transaction);
    if (timestamp == null || timestamp > throughMillis) return;
    var quantity = Number(transaction.quantity);
    var signed = String(transaction.side).toUpperCase() === "BUY" ? quantity : -quantity;
    if (String(transaction.outcome).toUpperCase() === "YES") yes += signed;
    else no += signed;
    if (yes < -0.000001 || no < -0.000001) valid = false;
    yes = Math.max(0, yes);
    no = Math.max(0, no);
    saw = true;
  });
  var percent = valid && saw ? predictionMarketCommunityR1Percent_(yes, no) : null;
  return {
    supported: valid && saw && percent != null,
    yesShares: predictionMarketCommunityR1Round_(yes),
    noShares: predictionMarketCommunityR1Round_(no),
    yesPositioningPercent: percent
  };
}

function predictionMarketCommunityR1Movement_(transactions, currentYesPercent, nowMillis, ageMillis) {
  if (currentYesPercent == null) return { supported:false, yesPointChange:null };
  var baseline = predictionMarketCommunityR1Replay_(transactions, nowMillis - ageMillis);
  return {
    supported: baseline.supported,
    yesPointChange: baseline.supported
      ? predictionMarketCommunityR1Round_(currentYesPercent - baseline.yesPositioningPercent)
      : null
  };
}

function predictionMarketCommunityR1Activity_(transactions) {
  var buckets = {};
  var yes = 0;
  var no = 0;
  var replayValid = true;
  (transactions || []).forEach(function(transaction) {
    var timestamp = predictionMarketCommunityR1Timestamp_(transaction);
    var date = new Date(timestamp).toISOString().slice(0, 10);
    var side = String(transaction.side).toUpperCase();
    var outcome = String(transaction.outcome).toUpperCase();
    var quantity = Number(transaction.quantity);
    var gross = Math.abs(Number(transaction.grossCredits));
    var signed = side === "BUY" ? quantity : -quantity;
    if (outcome === "YES") yes += signed;
    else no += signed;
    if (yes < -0.000001 || no < -0.000001) replayValid = false;
    yes = Math.max(0, yes);
    no = Math.max(0, no);
    var bucket = buckets[date] || { date:date, tradeCount:0, volumeCredits:0, buyCredits:0, sellCredits:0, yesPositioningPercent:null };
    bucket.tradeCount += 1;
    bucket.volumeCredits += gross;
    if (side === "BUY") bucket.buyCredits += gross;
    else bucket.sellCredits += gross;
    bucket.yesPositioningPercent = replayValid ? predictionMarketCommunityR1Percent_(yes, no) : null;
    buckets[date] = bucket;
  });
  return Object.keys(buckets).sort().map(function(date) {
    var bucket = buckets[date];
    bucket.volumeCredits = predictionMarketCommunityR1Round_(bucket.volumeCredits);
    bucket.buyCredits = predictionMarketCommunityR1Round_(bucket.buyCredits);
    bucket.sellCredits = predictionMarketCommunityR1Round_(bucket.sellCredits);
    return bucket;
  });
}

function predictionMarketCommunityR1Derive_(marketId, positions, transactions, wallets, nowMillis) {
  marketId = predictionMarketCommunityR1String_(marketId);
  var knownPlayers = {};
  (wallets || []).forEach(function(wallet) {
    var playerId = predictionMarketCommunityR1String_(wallet && wallet.playerId);
    if (playerId) knownPlayers[playerId] = true;
  });
  var useKnownPlayers = Object.keys(knownPlayers).length ? knownPlayers : null;
  var current = (positions || []).filter(function(position) {
    var playerId = predictionMarketCommunityR1String_(position && position.playerId);
    var outcome = predictionMarketCommunityR1String_(position && position.outcome).toUpperCase();
    var quantity = Number(position && position.quantity);
    return predictionMarketCommunityR1String_(position && position.marketId) === marketId &&
      (!useKnownPlayers || useKnownPlayers[playerId] === true) &&
      (outcome === "YES" || outcome === "NO") && isFinite(quantity) && quantity > 0;
  });
  var committed = predictionMarketCommunityR1CommittedTransactions_(transactions, marketId, useKnownPlayers);
  var yesUsers = {};
  var noUsers = {};
  var participants = {};
  var yesShares = 0;
  var noShares = 0;
  current.forEach(function(position) {
    var playerId = predictionMarketCommunityR1String_(position.playerId);
    var quantity = Number(position.quantity);
    participants[playerId] = true;
    if (String(position.outcome).toUpperCase() === "YES") {
      yesUsers[playerId] = true;
      yesShares += quantity;
    } else {
      noUsers[playerId] = true;
      noShares += quantity;
    }
  });
  var buyCredits = 0;
  var sellCredits = 0;
  committed.forEach(function(transaction) {
    var playerId = predictionMarketCommunityR1String_(transaction.playerId);
    participants[playerId] = true;
    var gross = Math.abs(Number(transaction.grossCredits));
    if (String(transaction.side).toUpperCase() === "BUY") buyCredits += gross;
    else sellCredits += gross;
  });
  yesShares = predictionMarketCommunityR1Round_(yesShares);
  noShares = predictionMarketCommunityR1Round_(noShares);
  var yesPercent = predictionMarketCommunityR1Percent_(yesShares, noShares);
  var noPercent = yesPercent == null ? null : predictionMarketCommunityR1Round_(100 - yesPercent);
  var activity = predictionMarketCommunityR1Activity_(committed);
  return {
    label:"PATTC Community",
    marketId:marketId,
    usersPositionedYes:Object.keys(yesUsers).length,
    usersPositionedNo:Object.keys(noUsers).length,
    yesShareQuantity:yesShares,
    noShareQuantity:noShares,
    yesPositioningPercent:yesPercent,
    noPositioningPercent:noPercent,
    participatingPlayers:Object.keys(participants).length,
    tradingVolumeCredits:predictionMarketCommunityR1Round_(buyCredits + sellCredits),
    buyVolumeCredits:predictionMarketCommunityR1Round_(buyCredits),
    sellVolumeCredits:predictionMarketCommunityR1Round_(sellCredits),
    tradeCount:committed.length,
    hasPositioning:yesPercent != null,
    hasActivity:committed.length > 0,
    activity:activity,
    movement24h:predictionMarketCommunityR1Movement_(committed, yesPercent, nowMillis, 24 * 60 * 60 * 1000),
    movement7d:predictionMarketCommunityR1Movement_(committed, yesPercent, nowMillis, 7 * 24 * 60 * 60 * 1000)
  };
}

function predictionMarketCommunityR1CreateService(options) {
  options = options || {};
  var repository = options.repository;
  var now = typeof options.now === "function" ? options.now : function() { return new Date(); };
  if (!repository || typeof repository.listPositions !== "function" || typeof repository.listTransactions !== "function" || typeof repository.listWallets !== "function") {
    throw new Error("Prediction Market community analytics require read-only repository list APIs");
  }
  function snapshot_() {
    return {
      positions:repository.listPositions() || [],
      transactions:repository.listTransactions() || [],
      wallets:repository.listWallets() || [],
      nowMillis:now().getTime()
    };
  }
  function market(marketId) {
    var snapshot = snapshot_();
    return predictionMarketCommunityR1Derive_(marketId, snapshot.positions, snapshot.transactions, snapshot.wallets, snapshot.nowMillis);
  }
  function forMarkets(marketIds) {
    var snapshot = snapshot_();
    var result = {};
    (marketIds || []).forEach(function(marketId) {
      marketId = predictionMarketCommunityR1String_(marketId);
      if (marketId) result[marketId] = predictionMarketCommunityR1Derive_(marketId, snapshot.positions, snapshot.transactions, snapshot.wallets, snapshot.nowMillis);
    });
    return result;
  }
  return { market:market, forMarkets:forMarkets };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketCommunityR1CreateService:predictionMarketCommunityR1CreateService,
    predictionMarketCommunityR1Derive_:predictionMarketCommunityR1Derive_,
    predictionMarketCommunityR1Replay_:predictionMarketCommunityR1Replay_
  };
}
'''

community_test = r'''const assert = require('assert');
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
assert.equal(history.activity.length,5);
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
'''

(ROOT / 'backend/player/PredictionMarketCommunityR1.js').write_text(community_source)
(ROOT / 'tests/prediction_market_community_r1_tests.js').write_text(community_test)

# Read-only repository enumeration APIs for analytics. No setup/store changes.
replace_once(
    'backend/engines/PredictionMarketStoreR2.js',
    '  function getTransaction(id) { var r=findRow("transactions","TransactionId",id); return r?txFromSheet(r):null; }\n  function saveTransaction(t) { return writeRecord("transactions","TransactionId",t.transactionId,t,txToSheet); }',
    '  function getTransaction(id) { var r=findRow("transactions","TransactionId",id); return r?txFromSheet(r):null; }\n  function listTransactions() { return readRows("transactions").map(txFromSheet); }\n  function saveTransaction(t) { return writeRecord("transactions","TransactionId",t.transactionId,t,txToSheet); }'
)
replace_once(
    'backend/engines/PredictionMarketStoreR2.js',
    '  function listPositionsByPlayer(playerId) { return readRows("positions").filter(function(r){return predictionMarketR2String_(r.PlayerId)===playerId;}).map(positionFromSheet); }',
    '  function listPositions() { return readRows("positions").map(positionFromSheet); }\n  function listPositionsByPlayer(playerId) { return readRows("positions").filter(function(r){return predictionMarketR2String_(r.PlayerId)===playerId;}).map(positionFromSheet); }'
)
replace_once(
    'backend/engines/PredictionMarketStoreR2.js',
    'getWallet:getWallet,listWallets:listWallets,saveWallet:saveWallet,getTransaction:getTransaction,saveTransaction:saveTransaction,getPosition:getPosition,listPositionsByPlayer:listPositionsByPlayer',
    'getWallet:getWallet,listWallets:listWallets,saveWallet:saveWallet,getTransaction:getTransaction,listTransactions:listTransactions,saveTransaction:saveTransaction,getPosition:getPosition,listPositions:listPositions,listPositionsByPlayer:listPositionsByPlayer'
)

# Mirror the read-only list APIs in the memory repository used by tests and local contracts.
replace_once(
    'backend/engines/PredictionMarketEngineR2.js',
    '    getPosition: function(playerId, marketId, outcome) { return predictionMarketR2Clone_(stores.positions[predictionMarketR2PositionKey_(playerId, marketId, outcome)] || null); },',
    '    listTransactions: function() { return Object.keys(stores.transactions).map(function(k) { return predictionMarketR2Clone_(stores.transactions[k]); }); },\n    getPosition: function(playerId, marketId, outcome) { return predictionMarketR2Clone_(stores.positions[predictionMarketR2PositionKey_(playerId, marketId, outcome)] || null); },'
)
replace_once(
    'backend/engines/PredictionMarketEngineR2.js',
    '    listPositionsByPlayer: function(playerId) { return Object.keys(stores.positions).map(function(k) { return stores.positions[k]; }).filter(function(p) { return p.playerId === playerId; }).map(predictionMarketR2Clone_); },',
    '    listPositions: function() { return Object.keys(stores.positions).map(function(k) { return predictionMarketR2Clone_(stores.positions[k]); }); },\n    listPositionsByPlayer: function(playerId) { return Object.keys(stores.positions).map(function(k) { return stores.positions[k]; }).filter(function(p) { return p.playerId === playerId; }).map(predictionMarketR2Clone_); },'
)

# Player adapter exposes aggregate community data, still using authenticated R2 trade authority.
replace_once(
    'backend/player/PredictionMarketPlayerR4.js',
    '  var now = typeof options.now === "function" ? options.now : function() { return new Date(); };\n  if (!engine) throw new Error("Prediction Market R2 engine is required");',
    '  var now = typeof options.now === "function" ? options.now : function() { return new Date(); };\n  var communityService = options.communityService || null;\n  if (!engine) throw new Error("Prediction Market R2 engine is required");\n  if (!communityService && typeof predictionMarketCommunityR1CreateService === "function") {\n    communityService = predictionMarketCommunityR1CreateService({ repository:engine.repository, now:now });\n  }'
)
replace_once(
    'backend/player/PredictionMarketPlayerR4.js',
    '    var markets = (engine.getMarkets() || []).map(function(market) {\n      return predictionMarketPlayerR4MarketView_(market, nowMs);\n    });',
    '    var marketRows = engine.getMarkets() || [];\n    var communityByMarket = communityService ? communityService.forMarkets(marketRows.map(function(market) { return market.marketId; })) : {};\n    var markets = marketRows.map(function(market) {\n      return Object.assign(predictionMarketPlayerR4MarketView_(market, nowMs), { community:communityByMarket[market.marketId] || null });\n    });'
)
replace_once(
    'backend/player/PredictionMarketPlayerR4.js',
    '      market:predictionMarketPlayerR4MarketView_(market, nowMs),\n      positions:positions,',
    '      market:Object.assign(predictionMarketPlayerR4MarketView_(market, nowMs), { community:communityService ? communityService.market(market.marketId) : null }),\n      positions:positions,'
)

# Player UI: explicit external-vs-community comparison plus aggregate trend only.
community_ui = r'''function predictionMarketR4CommunityHtml_(community) {
  community=community||{};
  var yes=community.yesPositioningPercent;
  var no=community.noPositioningPercent;
  var hasPositioning=yes!=null && no!=null;
  var movement=function(row,label){
    if (!row || row.supported!==true || row.yesPointChange==null) return `${label}: not enough history`;
    var value=predictionMarketR4Num_(row.yesPointChange);
    return `${label}: ${value>0?"+":""}${value.toFixed(1)} pts toward YES`;
  };
  var trend=(community.activity||[]).slice(-7).map(function(point){
    var value=point.yesPositioningPercent;
    var height=value==null?4:Math.max(4,Math.min(100,predictionMarketR4Num_(value)));
    return `<span title="${predictionMarketR4Esc_(point.date)} · ${value==null?"no positioning":predictionMarketR4Num_(value).toFixed(1)+"% YES"} · ${predictionMarketR4Credits_(point.volumeCredits)} credits" style="display:inline-block;width:12px;height:${height}px;max-height:52px;background:currentColor;opacity:.62;border-radius:4px 4px 0 0"></span>`;
  }).join("");
  return `<div class="pmr4-community" style="margin:14px 0;padding:14px;border:1px solid rgba(127,127,127,.24);border-radius:12px">
    <div class="pmr4-card-top"><div><div class="pmr4-kicker">PATTC Community</div><h3 style="margin:.2rem 0">PATTC Positioning</h3></div><span class="pmr4-meta">${predictionMarketR4Esc_(community.participatingPlayers||0)} participating players</span></div>
    ${hasPositioning?`<div class="pmr4-prices"><b>YES ${predictionMarketR4Num_(yes).toFixed(1)}%</b><b>NO ${predictionMarketR4Num_(no).toFixed(1)}%</b></div>`:`<div class="pmr4-meta">No active PATTC positioning yet.</div>`}
    <div class="pmr4-facts"><span>YES shares <b>${predictionMarketR4Credits_(community.yesShareQuantity)}</b></span><span>NO shares <b>${predictionMarketR4Credits_(community.noShareQuantity)}</b></span><span>BUY volume <b>${predictionMarketR4Credits_(community.buyVolumeCredits)}</b></span><span>SELL volume <b>${predictionMarketR4Credits_(community.sellVolumeCredits)}</b></span><span>Total traded <b>${predictionMarketR4Credits_(community.tradingVolumeCredits)}</b> credits</span></div>
    <div class="pmr4-meta">${predictionMarketR4Esc_(movement(community.movement24h,"24h"))} · ${predictionMarketR4Esc_(movement(community.movement7d,"7d"))}</div>
    ${trend?`<div style="display:flex;align-items:flex-end;gap:4px;height:56px;margin-top:10px" aria-label="PATTC Community positioning trend">${trend}</div>`:""}
    <div class="pmr4-meta">Aggregate PATTC activity only. This does not set or move the external reference price.</div>
  </div>`;
}

'''
replace_once(
    'frontend/js/pages/predictionMarketsR4.js',
    'function predictionMarketR4DetailHtml_() {',
    community_ui + 'function predictionMarketR4DetailHtml_() {'
)
replace_once(
    'frontend/js/pages/predictionMarketsR4.js',
    '${predictionMarketR4Esc_(market.yesLabel||"YES")}: <b>${predictionMarketR4Price_(market.referenceYesPrice)}</b>',
    'External market ${predictionMarketR4Esc_(market.yesLabel||"YES")}: <b>${predictionMarketR4Price_(market.referenceYesPrice)}</b>'
)
replace_once(
    'frontend/js/pages/predictionMarketsR4.js',
    '${predictionMarketR4Esc_(market.noLabel||"NO")}: <b>${predictionMarketR4Price_(market.referenceNoPrice)}</b>',
    'External market ${predictionMarketR4Esc_(market.noLabel||"NO")}: <b>${predictionMarketR4Price_(market.referenceNoPrice)}</b>'
)
replace_once(
    'frontend/js/pages/predictionMarketsR4.js',
    '    ${market.priceStale?`<div class="pmr4-alert">Reference pricing is stale or unavailable. Trading is disabled until R2 accepts fresh pricing.</div>`:""}',
    '    ${predictionMarketR4CommunityHtml_(market.community)}\n    ${market.priceStale?`<div class="pmr4-alert">Reference pricing is stale or unavailable. Trading is disabled until R2 accepts fresh pricing.</div>`:""}'
)

# Remove the one-shot patch machinery from the final specialist branch.
for rel in ['tools/apply_prediction_market_community_r1.py', '.github/workflows/prediction-market-community-r1-patch.yml']:
    path = ROOT / rel
    if path.exists():
        path.unlink()
