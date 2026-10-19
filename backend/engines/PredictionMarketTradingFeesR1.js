/* =====================================================
   PREDICTION MARKET TRADING FEES R1
   Additive fee/accounting layer over accepted R2 repository authority.
   Virtual credits only. Default fee is zero. No settlement fee.
===================================================== */

var PREDICTION_MARKET_TRADING_FEES_R1_PROPERTY = "PREDICTION_MARKET_DEFAULT_TRADING_FEE_BPS";
var PREDICTION_MARKET_TRADING_FEES_R1_FALLBACK_BPS = 0;

function predictionMarketTradingFeesR1Round_(value) {
  return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function predictionMarketTradingFeesR1Bps_(value) {
  var n = Number(value);
  if (!isFinite(n)) throw new Error("Prediction Market trading fee must be a finite basis-point value");
  n = Math.round(n);
  if (n < 0 || n > 10000) throw new Error("Prediction Market trading fee must be between 0 and 10000 basis points");
  return n;
}

function predictionMarketTradingFeesR1Properties_() {
  if (typeof PropertiesService !== "undefined" && PropertiesService && typeof PropertiesService.getScriptProperties === "function") {
    return PropertiesService.getScriptProperties();
  }
  return null;
}

function predictionMarketTradingFeesR1GetDefaultFeeBps_() {
  var props = predictionMarketTradingFeesR1Properties_();
  var raw = props ? props.getProperty(PREDICTION_MARKET_TRADING_FEES_R1_PROPERTY) : PREDICTION_MARKET_TRADING_FEES_R1_FALLBACK_BPS;
  if (raw == null || raw === "") return 0;
  return predictionMarketTradingFeesR1Bps_(raw);
}

function predictionMarketTradingFeesR1SetDefaultFeeBps_(value) {
  var bps = predictionMarketTradingFeesR1Bps_(value);
  var props = predictionMarketTradingFeesR1Properties_();
  if (props) props.setProperty(PREDICTION_MARKET_TRADING_FEES_R1_PROPERTY, String(bps));
  else PREDICTION_MARKET_TRADING_FEES_R1_FALLBACK_BPS = bps;
  return bps;
}

function predictionMarketTradingFeesR1MarketConfig_(market) {
  var metadata = market && market.providerMetadata && typeof market.providerMetadata === "object" ? market.providerMetadata : {};
  var mode = String(metadata.tradingFeeMode || "INHERIT").trim().toUpperCase();
  if (mode !== "CUSTOM") mode = "INHERIT";
  var customBps = mode === "CUSTOM" ? predictionMarketTradingFeesR1Bps_(metadata.tradingFeeBps == null ? 0 : metadata.tradingFeeBps) : null;
  var effectiveBps = mode === "CUSTOM" ? customBps : predictionMarketTradingFeesR1GetDefaultFeeBps_();
  return {
    mode: mode,
    customFeeBps: customBps,
    effectiveFeeBps: effectiveBps,
    effectiveFeePercent: effectiveBps / 100,
    source: mode === "CUSTOM" ? "MARKET" : "DEFAULT"
  };
}

function predictionMarketTradingFeesR1ApplyMarketConfig_(metadata, mode, customBps) {
  var out = Object.assign({}, metadata && typeof metadata === "object" ? metadata : {});
  var normalizedMode = String(mode || "INHERIT").trim().toUpperCase() === "CUSTOM" ? "CUSTOM" : "INHERIT";
  out.tradingFeeMode = normalizedMode;
  if (normalizedMode === "CUSTOM") out.tradingFeeBps = predictionMarketTradingFeesR1Bps_(customBps == null ? 0 : customBps);
  else delete out.tradingFeeBps;
  return out;
}

function predictionMarketTradingFeesR1Fee_(grossCredits, bps) {
  return predictionMarketTradingFeesR1Round_(Number(grossCredits || 0) * predictionMarketTradingFeesR1Bps_(bps) / 10000);
}

function predictionMarketTradingFeesR1RowsFromSheet_(storeKey) {
  if (typeof SpreadsheetApp === "undefined" || !SpreadsheetApp || typeof SpreadsheetApp.getActiveSpreadsheet !== "function") return [];
  if (typeof PREDICTION_MARKET_R2_SHEETS === "undefined") return [];
  var sheetName = PREDICTION_MARKET_R2_SHEETS[storeKey];
  if (!sheetName) return [];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(value) { return String(value || "").trim(); });
  return values.slice(1).filter(function(row) { return row.some(function(value) { return String(value || "") !== ""; }); }).map(function(row) {
    var result = {};
    headers.forEach(function(header, index) { result[header] = row[index]; });
    return result;
  });
}

function predictionMarketTradingFeesR1Transactions_(repository) {
  if (repository && typeof repository.dump === "function") {
    var dump = repository.dump() || {};
    return Object.keys(dump.transactions || {}).map(function(key) { return dump.transactions[key]; });
  }
  return predictionMarketTradingFeesR1RowsFromSheet_("transactions").map(function(row) {
    var committed = {};
    try { committed = row.CommittedResultJson ? JSON.parse(String(row.CommittedResultJson)) : {}; } catch (ignore) {}
    return {
      transactionId: row.TransactionId,
      playerId: row.PlayerId,
      marketId: row.MarketId,
      outcome: row.Outcome,
      status: row.Status,
      committedResult: committed
    };
  });
}

function predictionMarketTradingFeesR1Settlements_(repository) {
  if (repository && typeof repository.dump === "function") {
    var dump = repository.dump() || {};
    return Object.keys(dump.settlements || {}).map(function(key) { return dump.settlements[key]; });
  }
  return predictionMarketTradingFeesR1RowsFromSheet_("settlements").map(function(row) {
    var committed = {};
    try { committed = row.CommittedResultJson ? JSON.parse(String(row.CommittedResultJson)) : {}; } catch (ignore) {}
    return { status: row.Status, committedResult: committed };
  });
}

function predictionMarketTradingFeesR1FeeCharges_(repository, playerId, marketId) {
  return predictionMarketTradingFeesR1Transactions_(repository).filter(function(tx) {
    return String(tx.status || "COMMITTED").toUpperCase() === "COMMITTED" &&
      (!playerId || String(tx.playerId) === String(playerId)) &&
      (!marketId || String(tx.marketId) === String(marketId));
  }).map(function(tx) {
    var result = tx.committedResult || {};
    return {
      playerId: tx.playerId,
      marketId: tx.marketId,
      outcome: String(tx.outcome || result.outcome || "").toUpperCase(),
      feeCredits: predictionMarketTradingFeesR1Round_(Number(result.feeCredits || 0))
    };
  }).filter(function(row) { return row.feeCredits > 0; });
}

function predictionMarketTradingFeesR1Stats_(repository) {
  var charges = predictionMarketTradingFeesR1FeeCharges_(repository);
  var charged = charges.reduce(function(sum, row) { return sum + row.feeCredits; }, 0);
  var refunded = predictionMarketTradingFeesR1Settlements_(repository).reduce(function(sum, settlement) {
    var result = settlement.committedResult || settlement || {};
    return sum + Number(result.returnedTradingFeeCredits || 0);
  }, 0);
  charged = predictionMarketTradingFeesR1Round_(charged);
  refunded = predictionMarketTradingFeesR1Round_(refunded);
  return {
    feeBearingTrades: charges.length,
    chargedFeeCredits: charged,
    refundedFeeCredits: refunded,
    netFeeCredits: predictionMarketTradingFeesR1Round_(charged - refunded)
  };
}

function predictionMarketTradingFeesR1DecorateRepository(baseRepository) {
  if (!baseRepository) throw new Error("Prediction Market R2 repository is required for trading fees");
  var repository = Object.create(baseRepository);

  repository.commitTrade = function(payload) {
    payload = payload || {};
    var tx = payload.transaction || {};
    var market = baseRepository.getMarket(tx.marketId);
    if (!market) throw new Error("Prediction Market not found while applying trading fee");
    var config = predictionMarketTradingFeesR1MarketConfig_(market);
    var fee = predictionMarketTradingFeesR1Fee_(tx.grossCredits, config.effectiveFeeBps);
    var side = String(tx.side || "").toUpperCase();
    if (fee > 0) {
      if (side === "BUY" && Number(payload.wallet.availableCredits || 0) + 0.0000001 < fee) {
        throw new Error("Insufficient available prediction market credits including trading fee");
      }
      payload.wallet.availableCredits = predictionMarketTradingFeesR1Round_(Number(payload.wallet.availableCredits || 0) - fee);
      if (payload.wallet.availableCredits < -0.0000001) throw new Error("Prediction Market wallet cannot become negative after trading fee");
      payload.position.realizedCredits = predictionMarketTradingFeesR1Round_(Number(payload.position.realizedCredits || 0) - fee);
    }
    var result = Object.assign({}, tx.committedResult || {});
    result.feeBps = config.effectiveFeeBps;
    result.feePercent = config.effectiveFeePercent;
    result.feeSource = config.source;
    result.feeCredits = fee;
    result.netCredits = predictionMarketTradingFeesR1Round_(side === "BUY" ? Number(tx.grossCredits || 0) + fee : Number(tx.grossCredits || 0) - fee);
    result.creditDelta = predictionMarketTradingFeesR1Round_(side === "BUY" ? -result.netCredits : result.netCredits);
    result.wallet = JSON.parse(JSON.stringify(payload.wallet));
    result.position = JSON.parse(JSON.stringify(payload.position));
    tx.committedResult = result;
    return baseRepository.commitTrade(payload);
  };

  repository.commitSettlement = function(payload) {
    payload = payload || {};
    var settlement = payload.settlement || {};
    if (String(settlement.marketStatus || "").toUpperCase() === "VOID") {
      var charges = predictionMarketTradingFeesR1FeeCharges_(baseRepository, settlement.playerId, settlement.marketId);
      var totalRefund = predictionMarketTradingFeesR1Round_(charges.reduce(function(sum, row) { return sum + row.feeCredits; }, 0));
      if (totalRefund > 0) {
        payload.wallet.availableCredits = predictionMarketTradingFeesR1Round_(Number(payload.wallet.availableCredits || 0) + totalRefund);
        settlement.payoutCredits = predictionMarketTradingFeesR1Round_(Number(settlement.payoutCredits || 0) + totalRefund);
        settlement.returnedTradingFeeCredits = totalRefund;
        var byOutcome = {};
        charges.forEach(function(row) { byOutcome[row.outcome] = predictionMarketTradingFeesR1Round_(Number(byOutcome[row.outcome] || 0) + row.feeCredits); });
        (payload.positions || []).forEach(function(position) {
          var refund = Number(byOutcome[String(position.outcome || "").toUpperCase()] || 0);
          if (refund > 0) position.realizedCredits = predictionMarketTradingFeesR1Round_(Number(position.realizedCredits || 0) + refund);
        });
        var committed = Object.assign({}, settlement.committedResult || {});
        committed.payoutCredits = settlement.payoutCredits;
        committed.returnedTradingFeeCredits = totalRefund;
        committed.wallet = JSON.parse(JSON.stringify(payload.wallet));
        committed.positions = JSON.parse(JSON.stringify(payload.positions || []));
        settlement.committedResult = committed;
      } else {
        settlement.returnedTradingFeeCredits = 0;
        if (settlement.committedResult) settlement.committedResult.returnedTradingFeeCredits = 0;
      }
    }
    return baseRepository.commitSettlement(payload);
  };

  repository.tradingFeeStats = function() { return predictionMarketTradingFeesR1Stats_(baseRepository); };
  repository.tradingFeeBaseRepository = baseRepository;
  return repository;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketTradingFeesR1Bps_: predictionMarketTradingFeesR1Bps_,
    predictionMarketTradingFeesR1GetDefaultFeeBps_: predictionMarketTradingFeesR1GetDefaultFeeBps_,
    predictionMarketTradingFeesR1SetDefaultFeeBps_: predictionMarketTradingFeesR1SetDefaultFeeBps_,
    predictionMarketTradingFeesR1MarketConfig_: predictionMarketTradingFeesR1MarketConfig_,
    predictionMarketTradingFeesR1ApplyMarketConfig_: predictionMarketTradingFeesR1ApplyMarketConfig_,
    predictionMarketTradingFeesR1Fee_: predictionMarketTradingFeesR1Fee_,
    predictionMarketTradingFeesR1Stats_: predictionMarketTradingFeesR1Stats_,
    predictionMarketTradingFeesR1DecorateRepository: predictionMarketTradingFeesR1DecorateRepository
  };
}
