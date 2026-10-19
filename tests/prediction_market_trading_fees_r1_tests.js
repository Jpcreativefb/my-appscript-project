'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  vm.runInThisContext(source, { filename: relativePath });
}

load('backend/engines/PredictionMarketEngineR2.js');
load('backend/engines/PredictionMarketTradingFeesR1.js');

const NOW = '2026-10-19T12:00:00.000Z';
const LATER = '2026-10-20T12:00:00.000Z';

function market(id, metadata) {
  return {
    marketId:id,title:id,description:'',category:'Test',status:'OPEN',yesLabel:'YES',noLabel:'NO',
    referenceYesPrice:0.6,referenceNoPrice:0.4,referencePriceAsOf:NOW,referencePriceTrusted:true,
    providerKind:'MANUAL',providerId:'',externalMarketId:'',sourceUrl:'',providerMetadata:metadata||{},
    openTime:NOW,lockTime:LATER,resolutionStatus:'UNRESOLVED',winningOutcome:'',voided:false,
    createdAt:NOW,createdBy:'ADMIN',updatedAt:NOW,updatedBy:'ADMIN'
  };
}
function wallet(playerId, credits) {
  return {playerId,availableCredits:credits,reservedCredits:0,version:0,createdAt:NOW,createdBy:'SYSTEM',updatedAt:NOW,updatedBy:'SYSTEM'};
}
function engineFor(seed) {
  const base = predictionMarketR2CreateMemoryRepository(seed);
  const repository = predictionMarketTradingFeesR1DecorateRepository(base);
  const engine = predictionMarketR2CreateEngine({repository,now:()=>new Date(NOW)});
  return {base,repository,engine};
}
function player(id){ return {role:'PLAYER',playerId:id,username:id}; }
function admin(){ return {role:'ADMIN',playerId:'admin',username:'admin'}; }
function trade(engine, playerId, transactionId, side, quantity, version, marketId='m1') {
  return engine.executeTrade(player(playerId), {
    transactionId,playerId,marketId,side,outcome:'YES',quantity,referencePrice:0.6,
    expectedWalletVersion:version,requestedAt:NOW
  });
}

predictionMarketTradingFeesR1SetDefaultFeeBps_(0);
{
  const {base,engine} = engineFor({markets:[market('m1')],wallets:[wallet('p0',100)]});
  trade(engine,'p0','zero-fee','BUY',10,0);
  const tx=base.getTransaction('zero-fee');
  assert.strictEqual(tx.committedResult.feeCredits,0,'0% default must preserve no-fee behavior');
  assert.strictEqual(base.getWallet('p0').availableCredits,94,'0% BUY should debit gross only');
}

predictionMarketTradingFeesR1SetDefaultFeeBps_(100);
{
  const {base,repository,engine} = engineFor({markets:[market('m1')],wallets:[wallet('p1',1000)]});
  trade(engine,'p1','buy-1pct','BUY',10,0);
  let tx=base.getTransaction('buy-1pct');
  assert.strictEqual(tx.committedResult.grossCredits,6);
  assert.strictEqual(tx.committedResult.feeBps,100);
  assert.strictEqual(tx.committedResult.feeCredits,0.06);
  assert.strictEqual(tx.committedResult.netCredits,6.06);
  assert.strictEqual(tx.committedResult.creditDelta,-6.06);
  assert.strictEqual(base.getWallet('p1').availableCredits,993.94,'BUY must debit gross + fee');
  assert.strictEqual(base.getPosition('p1','m1','YES').realizedCredits,-0.06,'fee must affect P/L');

  const replay=trade(engine,'p1','buy-1pct','BUY',10,0);
  assert.strictEqual(replay.feeCredits,0.06,'idempotent replay must return committed fee result');
  assert.strictEqual(base.getWallet('p1').availableCredits,993.94,'replay must not charge fee twice');

  trade(engine,'p1','sell-1pct','SELL',5,1);
  tx=base.getTransaction('sell-1pct');
  assert.strictEqual(tx.committedResult.grossCredits,3);
  assert.strictEqual(tx.committedResult.feeCredits,0.03);
  assert.strictEqual(tx.committedResult.netCredits,2.97);
  assert.strictEqual(base.getWallet('p1').availableCredits,996.91,'SELL must credit proceeds minus fee');
  assert.strictEqual(base.getPosition('p1','m1','YES').realizedCredits,-0.09,'BUY + SELL fees must be reflected in realized P/L');

  const stats=repository.tradingFeeStats();
  assert.strictEqual(stats.feeBearingTrades,2);
  assert.strictEqual(stats.chargedFeeCredits,0.09);
  assert.strictEqual(stats.refundedFeeCredits,0);
  assert.strictEqual(stats.netFeeCredits,0.09);

  const voided=base.getMarket('m1'); voided.status='VOID'; voided.voided=true; voided.resolutionStatus='VOID'; base.saveMarket(voided);
  const settled=engine.settlePlayerMarket(admin(),'m1','p1');
  assert.strictEqual(base.getWallet('p1').availableCredits,1000,'VOID must restore open basis plus all related trading fees');
  const savedSettlement=base.getSettlement('m1:p1');
  assert.strictEqual(savedSettlement.committedResult.returnedTradingFeeCredits,0.09,'VOID audit must record refunded fees');
  assert.strictEqual(savedSettlement.payoutCredits,3.09,'VOID payout must include open basis plus fee refund');
  assert.strictEqual(savedSettlement.returnedCostBasisCredits,3,'fee refund must remain separate from returned cost basis');
  assert.strictEqual(base.getPosition('p1','m1','YES').realizedCredits,0,'VOID must reverse fee P/L impact');
  const replaySettlement=engine.settlePlayerMarket(admin(),'m1','p1');
  assert.strictEqual(replaySettlement.returnedTradingFeeCredits,0.09);
  assert.strictEqual(base.getWallet('p1').availableCredits,1000,'settlement replay must not refund fees twice');
  const after=repository.tradingFeeStats();
  assert.strictEqual(after.refundedFeeCredits,0.09);
  assert.strictEqual(after.netFeeCredits,0);
  assert.strictEqual(settled.wallet.availableCredits,1000,'first VOID settlement result must report post-refund wallet');
}

predictionMarketTradingFeesR1SetDefaultFeeBps_(100);
{
  const custom=market('custom',{tradingFeeMode:'CUSTOM',tradingFeeBps:50});
  const {base,engine}=engineFor({markets:[custom],wallets:[wallet('p2',100)]});
  trade(engine,'p2','custom-fee','BUY',10,0,'custom');
  const tx=base.getTransaction('custom-fee');
  assert.strictEqual(tx.committedResult.feeBps,50,'custom market fee must override default');
  assert.strictEqual(tx.committedResult.feeCredits,0.03);
  assert.strictEqual(tx.committedResult.feeSource,'MARKET');
}

predictionMarketTradingFeesR1SetDefaultFeeBps_(100);
{
  const {base,engine}=engineFor({markets:[market('m1')],wallets:[wallet('tight',6)]});
  assert.throws(()=>trade(engine,'tight','insufficient-with-fee','BUY',10,0),/including trading fee/,'BUY affordability must include fee');
  assert.strictEqual(base.getWallet('tight').availableCredits,6,'failed fee-inclusive affordability check must not mutate wallet');
  assert.strictEqual(base.getTransaction('insufficient-with-fee'),null,'failed trade must not persist transaction');
}

assert.strictEqual(predictionMarketTradingFeesR1MarketConfig_({providerMetadata:{tradingFeeMode:'INHERIT'}}).effectiveFeeBps,100);
assert.strictEqual(predictionMarketTradingFeesR1MarketConfig_({providerMetadata:{tradingFeeMode:'CUSTOM',tradingFeeBps:25}}).effectiveFeeBps,25);
assert.throws(()=>predictionMarketTradingFeesR1SetDefaultFeeBps_(-1),/between 0 and 10000/);
assert.throws(()=>predictionMarketTradingFeesR1SetDefaultFeeBps_(10001),/between 0 and 10000/);

console.log('prediction_market_trading_fees_r1_tests: PASS');
