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

function predictionMarketAdminR3MarketView_(market) {
  market = market || {};
  return Object.assign({}, market, {
    allowedAdminActions: predictionMarketAdminR3AllowedActions_(market.status),
    tradingAvailable: predictionMarketAdminR3String_(market.status).toUpperCase() === "OPEN"
  });
}

function predictionMarketAdminR3CreateService(options) {
  options = options || {};
  var engine = options.engine;
  if (!engine) throw new Error("Prediction Market R2 engine is required");

  function actor(username) { return predictionMarketAdminR3Context_(username); }
  function list(username) {
    actor(username);
    return {
      success: true,
      markets: (engine.getMarkets() || []).map(predictionMarketAdminR3MarketView_)
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
      providerMetadata: predictionMarketAdminR3Json_(payload.providerMetadata, {}),
      openTime: payload.openTime,
      lockTime: payload.lockTime
    });
    return { success: true, market: predictionMarketAdminR3MarketView_(result) };
  }
  function edit(username, payload) {
    payload = payload || {};
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
      providerMetadata: predictionMarketAdminR3Json_(payload.providerMetadata, {}),
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

  return { list:list, create:create, edit:edit, price:price, open:open, lock:lock, resolve:resolve, voidMarket:voidMarket };
}

function predictionMarketAdminR3ProductionService_() {
  var repository = predictionMarketR2CreateAppsScriptRepository();
  var engine = predictionMarketR2CreateEngine({ repository: repository });
  return predictionMarketAdminR3CreateService({ engine: engine });
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
