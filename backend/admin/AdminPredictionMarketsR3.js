/* =====================================================
   PREDICTION MARKET ADMIN MANAGER R3
   Thin Admin adapter over the accepted R2 engine.
   No direct wallet/position/transaction/settlement writes live here.
===================================================== */

function predictionMarketAdminR3String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketAdminR3Json_(value, fallback) {
  if (value && typeof value === "object") return value;
  var text = predictionMarketAdminR3String_(value);
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (err) { throw new Error("providerMetadata must be valid JSON"); }
}

function predictionMarketAdminR3Context_(username) {
  username = predictionMarketAdminR3String_(username);
  if (!username) throw new Error("Authenticated Admin username is required");
  return { role: "ADMIN", playerId: username, username: username };
}

function predictionMarketAdminR3AllowedActions_(status) {
  status = predictionMarketAdminR3String_(status).toUpperCase();
  if (status === "DRAFT") return ["EDIT", "SET_PRICE", "OPEN", "VOID"];
  if (status === "OPEN") return ["SET_PRICE", "LOCK", "VOID"];
  if (status === "LOCKED") return ["RESOLVE_YES", "RESOLVE_NO", "VOID"];
  return [];
}

function predictionMarketAdminR3FeeConfig_(market) {
  if (typeof predictionMarketTradingFeesR1MarketConfig_ === "function") return predictionMarketTradingFeesR1MarketConfig_(market || {});
  return { mode:"INHERIT", customFeeBps:null, effectiveFeeBps:0, effectiveFeePercent:0, source:"DEFAULT" };
}

function predictionMarketAdminR3MarketView_(market) {
  market = market || {};
  var allowed = predictionMarketAdminR3AllowedActions_(market.status).slice();
  var status = predictionMarketAdminR3String_(market.status).toUpperCase();
  var providerKind = predictionMarketAdminR3String_(market.providerKind || "MANUAL").toUpperCase();
  var fee = predictionMarketAdminR3FeeConfig_(market);
  if (providerKind !== "MANUAL" && status !== "RESOLVED" && status !== "VOID") allowed.push("REFRESH_PROVIDER");
  return Object.assign({}, market, {
    allowedAdminActions: allowed,
    tradingAvailable: status === "OPEN",
    providerRefreshAvailable: allowed.indexOf("REFRESH_PROVIDER") !== -1,
    tradingFeeMode: fee.mode,
    customTradingFeeBps: fee.customFeeBps,
    tradingFeeBps: fee.effectiveFeeBps,
    tradingFeePercent: fee.effectiveFeePercent,
    tradingFeeSource: fee.source
  });
}

function predictionMarketAdminR3CreateService(options) {
  options = options || {};
  var engine = options.engine;
  var repository = options.repository || null;
  var providerRegistry = options.providerRegistry || null;
  if (!engine) throw new Error("Prediction Market R2 engine is required");

  function actor(username) { return predictionMarketAdminR3Context_(username); }
  function defaultFeeBps_() {
    return typeof predictionMarketTradingFeesR1GetDefaultFeeBps_ === "function" ? predictionMarketTradingFeesR1GetDefaultFeeBps_() : 0;
  }
  function feeStats_() {
    if (repository && typeof repository.tradingFeeStats === "function") return repository.tradingFeeStats();
    return { feeBearingTrades:0, chargedFeeCredits:0, refundedFeeCredits:0, netFeeCredits:0 };
  }
  function feeMetadata_(payload, fallbackMetadata) {
    payload = payload || {};
    var metadata = predictionMarketAdminR3Json_(payload.providerMetadata, fallbackMetadata || {});
    var fallbackMode = fallbackMetadata && fallbackMetadata.tradingFeeMode ? fallbackMetadata.tradingFeeMode : "INHERIT";
    var mode = payload.tradingFeeMode == null || payload.tradingFeeMode === "" ? fallbackMode : payload.tradingFeeMode;
    var custom = payload.tradingFeeBps == null || payload.tradingFeeBps === "" ? (fallbackMetadata || {}).tradingFeeBps : payload.tradingFeeBps;
    if (typeof predictionMarketTradingFeesR1ApplyMarketConfig_ === "function") return predictionMarketTradingFeesR1ApplyMarketConfig_(metadata, mode, custom);
    return metadata;
  }
  function list(username) {
    actor(username);
    var defaultBps = defaultFeeBps_();
    return {
      success: true,
      markets: (engine.getMarkets() || []).map(predictionMarketAdminR3MarketView_),
      tradingFeeSettings: { defaultFeeBps:defaultBps, defaultFeePercent:defaultBps / 100 },
      tradingFeeStats: feeStats_()
    };
  }
  function create(username, payload) {
    payload = payload || {};
    var result = engine.createMarket(actor(username), {
      marketId: payload.marketId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      yesLabel: payload.yesLabel || "YES",
      noLabel: payload.noLabel || "NO",
      referenceYesPrice: payload.referenceYesPrice,
      referenceNoPrice: payload.referenceNoPrice,
      referencePriceAsOf: payload.referencePriceAsOf,
      referencePriceTrusted: payload.referencePriceTrusted !== false && String(payload.referencePriceTrusted).toLowerCase() !== "false",
      providerKind: payload.providerKind || "MANUAL",
      providerId: payload.providerId,
      externalMarketId: payload.externalMarketId,
      sourceUrl: payload.sourceUrl,
      providerMetadata: feeMetadata_(payload, {}),
      openTime: payload.openTime,
      lockTime: payload.lockTime
    });
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function edit(username, payload) {
    payload = payload || {};
    actor(username);
    if (payload.settingsOnly === true || String(payload.settingsOnly).toLowerCase() === "true") {
      if (typeof predictionMarketTradingFeesR1SetDefaultFeeBps_ !== "function") throw new Error("Prediction Market trading fee authority is unavailable");
      var bps = predictionMarketTradingFeesR1SetDefaultFeeBps_(payload.defaultTradingFeeBps);
      return { success:true, tradingFeeSettings:{ defaultFeeBps:bps, defaultFeePercent:bps / 100 }, tradingFeeStats:feeStats_() };
    }
    var current = (engine.getMarkets() || []).filter(function(row) { return predictionMarketAdminR3String_(row.marketId) === predictionMarketAdminR3String_(payload.marketId); })[0] || null;
    var result = engine.editDraftMarket(actor(username), payload.marketId, {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      yesLabel: payload.yesLabel,
      noLabel: payload.noLabel,
      referenceYesPrice: payload.referenceYesPrice,
      referenceNoPrice: payload.referenceNoPrice,
      referencePriceAsOf: payload.referencePriceAsOf,
      referencePriceTrusted: payload.referencePriceTrusted !== false && String(payload.referencePriceTrusted).toLowerCase() !== "false",
      providerKind: payload.providerKind || "MANUAL",
      providerId: payload.providerId,
      externalMarketId: payload.externalMarketId,
      sourceUrl: payload.sourceUrl,
      providerMetadata: feeMetadata_(payload, current && current.providerMetadata || {}),
      openTime: payload.openTime,
      lockTime: payload.lockTime
    });
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function price(username, payload) {
    payload = payload || {};
    var result = engine.setManualPrice(actor(username), payload.marketId, payload.referenceYesPrice, payload.referenceNoPrice, payload.referencePriceAsOf);
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function refreshReference(username, payload) {
    payload = payload || {};
    var ctx = actor(username);
    if (!providerRegistry || typeof providerRegistry.fetchReference !== "function") throw new Error("Prediction Market provider registry is unavailable");
    var marketId = predictionMarketAdminR3String_(payload.marketId);
    var current = (engine.getMarkets() || []).filter(function(row) { return predictionMarketAdminR3String_(row.marketId) === marketId; })[0];
    if (!current) throw new Error("Prediction Market not found");
    if (predictionMarketAdminR3String_(current.providerKind || "MANUAL").toUpperCase() === "MANUAL") {
      return { success:false, providerStatus:"UNAVAILABLE", message:"MANUAL markets use Update Price rather than external refresh.", market:predictionMarketAdminR3MarketView_(current) };
    }
    var fetched = providerRegistry.fetchReference(current);
    if (!fetched || fetched.success !== true || !fetched.snapshot) {
      return { success:false, providerStatus:(fetched && fetched.providerStatus) || "PROVIDER_ERROR", message:(fetched && fetched.message) || "Provider refresh failed", market:predictionMarketAdminR3MarketView_(current) };
    }
    var snapshot = fetched.snapshot;
    var refreshedMetadata = Object.assign({}, snapshot.providerMetadata || {});
    if (current.providerMetadata && current.providerMetadata.tradingFeeMode) refreshedMetadata.tradingFeeMode = current.providerMetadata.tradingFeeMode;
    if (current.providerMetadata && current.providerMetadata.tradingFeeBps != null) refreshedMetadata.tradingFeeBps = current.providerMetadata.tradingFeeBps;
    snapshot = Object.assign({}, snapshot, { providerMetadata:refreshedMetadata });
    var prospective = Object.assign({}, current, {
      referenceYesPrice:snapshot.referenceYesPrice, referenceNoPrice:snapshot.referenceNoPrice,
      referencePriceAsOf:snapshot.referencePriceAsOf, referencePriceTrusted:snapshot.trusted,
      providerKind:snapshot.providerKind, providerId:snapshot.providerId, externalMarketId:snapshot.externalMarketId,
      sourceUrl:snapshot.sourceUrl, providerMetadata:snapshot.providerMetadata || {}
    });
    try {
      engine.validatePriceState(prospective, new Date().toISOString());
    } catch (err) {
      var msg = err && err.message ? err.message : "Provider reference failed R2 validation";
      var providerStatus = /stale/i.test(msg) ? "STALE" : "INVALID";
      return { success:false, providerStatus:providerStatus, message:msg, proposed:snapshot, market:predictionMarketAdminR3MarketView_(current) };
    }
    var applied = engine.setReferencePrice(ctx, marketId, snapshot);
    return { success:true, providerStatus:"FRESH", proposed:snapshot, market:predictionMarketAdminR3MarketView_(applied) };
  }
  function open(username, payload) {
    var result = engine.openMarket(actor(username), (payload || {}).marketId);
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function lock(username, payload) {
    var result = engine.lockMarket(actor(username), (payload || {}).marketId);
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function resolve(username, payload) {
    payload = payload || {};
    var result = engine.resolveMarket(actor(username), payload.marketId, payload.winningOutcome);
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function voidMarket(username, payload) {
    var result = engine.voidMarket(actor(username), (payload || {}).marketId);
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }

  return { list:list, create:create, edit:edit, price:price, refreshReference:refreshReference, open:open, lock:lock, resolve:resolve, voidMarket:voidMarket };
}

function predictionMarketAdminR3ProductionService_() {
  var baseRepository = predictionMarketR2CreateAppsScriptRepository();
  var repository = typeof predictionMarketTradingFeesR1DecorateRepository === "function"
    ? predictionMarketTradingFeesR1DecorateRepository(baseRepository)
    : baseRepository;
  var engine = predictionMarketR2CreateEngine({ repository: repository, providers: predictionMarketReferenceProvidersR5CreateR2PriceProviders() });
  var providerRegistry = predictionMarketReferenceProvidersR5CreateRegistry({ maxAgeMs: PREDICTION_MARKET_R2_CONFIG.maxReferencePriceAgeMs });
  return predictionMarketAdminR3CreateService({ engine: engine, repository: repository, providerRegistry: providerRegistry });
}

function apiAdminPredictionMarketR3Dispatch(action, payload) {
  payload = payload || {};
  var service = predictionMarketAdminR3ProductionService_();
  var username = predictionMarketAdminR3String_(payload.username);
  switch (String(action || "")) {
    case "adminGetPredictionMarkets": return service.list(username);
    case "adminCreatePredictionMarket": return service.create(username, payload);
    case "adminEditPredictionMarket": return service.edit(username, payload);
    case "adminSetPredictionMarketPrice": return service.price(username, payload);
    case "adminRefreshPredictionMarketReference": return service.refreshReference(username, payload);
    case "adminOpenPredictionMarket": return service.open(username, payload);
    case "adminLockPredictionMarket": return service.lock(username, payload);
    case "adminResolvePredictionMarket": return service.resolve(username, payload);
    case "adminVoidPredictionMarket": return service.voidMarket(username, payload);
    default: throw new Error("Unsupported Prediction Market Admin action: " + action);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketAdminR3CreateService: predictionMarketAdminR3CreateService,
    predictionMarketAdminR3AllowedActions_: predictionMarketAdminR3AllowedActions_,
    predictionMarketAdminR3MarketView_: predictionMarketAdminR3MarketView_
  };
}
