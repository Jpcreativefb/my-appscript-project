#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const viewerPath = path.join(__dirname, "..", "frontend", "js", "pages", "predictionMarketsR4.js");
const enginePath = path.join(__dirname, "..", "backend", "engines", "PredictionMarketEngineR2.js");
const viewerSource = fs.readFileSync(viewerPath, "utf8");
const engineSource = fs.readFileSync(enginePath, "utf8");
const viewer = require(viewerPath);

function memoryStorage() {
  const values = Object.create(null);
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    dump() { return JSON.parse(JSON.stringify(values)); }
  };
}

assert.strictEqual(viewer.predictionMarketR4Probability_(0.64), "64%", "probability should lead with human-readable percent");
assert.strictEqual(viewer.predictionMarketR4Probability_(0.36), "36%", "NO probability formatting should be symmetric");
assert.strictEqual(viewer.predictionMarketR4DisplayStatus_({status:"OPEN",lockTime:"2026-10-19T18:00:00Z"}, Date.parse("2026-10-19T17:00:00Z")), "OPEN");
assert.strictEqual(viewer.predictionMarketR4DisplayStatus_({status:"OPEN",lockTime:"2026-10-19T18:00:00Z"}, Date.parse("2026-10-19T19:00:00Z")), "LOCKED", "elapsed lock time must render locked");
assert.strictEqual(viewer.predictionMarketR4DisplayStatus_({status:"RESOLVED"}), "RESOLVED");
assert.strictEqual(viewer.predictionMarketR4DisplayStatus_({status:"VOID"}), "VOID");

const authoritativeBuy = viewer.predictionMarketR4TradePreview_(10, 0.60, "BUY", {
  tradeValueCredits: 6.00,
  tradingFeeCredits: 0.06,
  totalCostCredits: 6.06
});
assert.deepStrictEqual(
  {value:authoritativeBuy.tradeValueCredits, fee:authoritativeBuy.tradingFeeCredits, total:authoritativeBuy.totalCostCredits},
  {value:6, fee:0.06, total:6.06},
  "viewer must consume authoritative fee totals verbatim"
);
const authoritativeSell = viewer.predictionMarketR4TradePreview_(10, 0.60, "SELL", {
  grossProceedsCredits: 6.00,
  tradingFeeCredits: 0.06,
  netProceedsCredits: 5.94
});
assert.strictEqual(authoritativeSell.netProceedsCredits, 5.94, "SELL preview must consume authoritative net proceeds");
assert.strictEqual(viewer.predictionMarketR4TradePreview_(10,0.60,"BUY",{}).tradingFeeCredits, null, "viewer must not invent a fee when fee authority is absent");

const storage = memoryStorage();
const market = {
  marketId:"m-1", providerKind:"KALSHI", providerId:"kalshi", externalMarketId:"KX-1",
  referencePriceTrusted:true, referenceYesPrice:0.61, referenceNoPrice:0.39,
  referencePriceAsOf:"2026-10-19T16:00:00.000Z"
};
let history = viewer.predictionMarketR4RecordReferenceSnapshot_(market, storage);
assert.strictEqual(history.length, 1);
market.referenceYesPrice=0.64; market.referenceNoPrice=0.36; market.referencePriceAsOf="2026-10-19T17:00:00.000Z";
history = viewer.predictionMarketR4RecordReferenceSnapshot_(market, storage);
assert.deepStrictEqual(history.map(p=>p.y), [0.61,0.64], "chart history must contain accepted reference snapshots only");
const beforeTrade = storage.dump();
viewer.predictionMarketR4TradePreview_(5, 0.64, "BUY", {});
assert.deepStrictEqual(storage.dump(), beforeTrade, "PATTC trade/preview activity cannot mutate external reference history");
assert.ok(viewer.predictionMarketR4ChartPath_(history,600,180).startsWith("M"), "chart needs at least two real reference snapshots");
assert.strictEqual(viewer.predictionMarketR4ChartPath_([history[0]],600,180), "", "no fake line may be rendered for a single point");

assert.match(viewerSource, /\.priceStale/, "stale reference state must remain visible");
assert.match(viewerSource, /!m\.tradingAvailable/, "stale/unavailable server trading gate must still block submit");
assert.match(engineSource, /Prediction Market reference price is stale/, "accepted R2 stale-price authority must remain present");
assert.match(engineSource, /function executeTrade\(/, "accepted trade authority must remain present");
assert.match(engineSource, /function getPortfolio\(/, "accepted portfolio authority must remain present");
assert.match(viewer.predictionMarketR4Styles_(), /@media\(max-width:430px\)/, "430px responsive contract missing");
assert.match(viewer.predictionMarketR4Styles_(), /@media\(max-width:390px\)/, "390px responsive contract missing");
assert.match(viewer.predictionMarketR4Styles_(), /@media\(max-width:360px\)/, "360px responsive contract missing");
assert.match(viewer.predictionMarketR4Styles_(), /max-width:100%/, "mobile overflow guard missing");
assert.match(viewerSource, /Available Credits/);
assert.match(viewerSource, /Portfolio Value/);
assert.match(viewerSource, /Open Positions/);
assert.match(viewerSource, /Profit \/ Loss/);

console.log("Prediction Market viewer/reference charts R1: PASS");
