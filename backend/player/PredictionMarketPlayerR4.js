/* =====================================================
   PREDICTION MARKET PLAYER TRADING R4
   Thin authenticated player adapter over accepted R2 authority.
   No raw sheet mutation, no setup(), no settlement invocation.
===================================================== */

function predictionMarketPlayerR4String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketPlayerR4Context_(username) {
  username = predictionMarketPlayerR4String_(username);
  if (!username) throw new Error("Authenticated player username is required");
  return { role: "PLAYER", playerId: username, username: username };
}

function predictionMarketPlayerR4Finite_(value, fallback) {
  var n = Number(value);
  return isFinite(n) ? n : (fallback == null ? 0 : fallback);
}

function predictionMarketPlayerR4MarketView_(market, nowMs) {
  market = market || {};
  var status = predictionMarketPlayerR4String_(market.status).toUpperCase();
  var asOfMs = Date.parse(predictionMarketPlayerR4String_(market.referencePriceAsOf));
  var lockMs = Date.parse(predictionMarketPlayerR4String_(market.lockTime));
  var maxAge = typeof PREDICTION_MARKET_R2_CONFIG !== "undefined"
    ? Number(PREDICTION_MARKET_R2_CONFIG.maxReferencePriceAgeMs || 0)
    : 15 * 60 * 1000;
  var trusted = market.referencePriceTrusted === true;
  var priceFresh = trusted && isFinite(asOfMs) && asOfMs <= nowMs && nowMs - asOfMs <= maxAge;
  var beforeLock = isFinite(lockMs) && nowMs < lockMs;
  return Object.assign({}, market, {
    priceFresh: priceFresh,
    priceStale: !priceFresh,
    tradingAvailable: status === "OPEN" && priceFresh && beforeLock,
    providerLabel: predictionMarketPlayerR4String_(market.providerId || market.providerKind || "MANUAL")
  });
}

function predictionMarketPlayerR4PositionView_(position, market) {
  position = position || {};
  market = market || {};
  var outcome = predictionMarketPlayerR4String_(position.outcome).toUpperCase();
  var mark = outcome === "YES" ? predictionMarketPlayerR4Finite_(market.referenceYesPrice) : predictionMarketPlayerR4Finite_(market.referenceNoPrice);
  return Object.assign({}, position, {
    currentMark: mark,
    marketTitle: predictionMarketPlayerR4String_(market.title || position.marketId),
    marketStatus: predictionMarketPlayerR4String_(market.status),
    winningOutcome: predictionMarketPlayerR4String_(market.winningOutcome)
  });
}

function predictionMarketPlayerR4CreateService(options) {
  options = options || {};
  var engine = options.engine;
  var now = typeof options.now === "function" ? options.now : function() { return new Date(); };
  if (!engine) throw new Error("Prediction Market R2 engine is required");

  function context(username) { return predictionMarketPlayerR4Context_(username); }
  function marketMap_() {
    var map = {};
    (engine.getMarkets() || []).forEach(function(market) { map[market.marketId] = market; });
    return map;
  }
  function ensureWallet_(ctx, username) {
    var wallet = engine.getWallet(ctx, username);
    if (!wallet) wallet = engine.bootstrapWallet(ctx, username);
    return wallet;
  }
  function state(username) {
    var ctx = context(username);
    var wallet = ensureWallet_(ctx, username);
    var portfolio = engine.getPortfolio(ctx, username);
    var nowMs = now().getTime();
    var markets = (engine.getMarkets() || []).map(function(market) {
      return predictionMarketPlayerR4MarketView_(market, nowMs);
    });
    return { success:true, playerId:username, wallet:wallet, portfolio:portfolio, markets:markets };
  }
  function detail(username, payload) {
    payload = payload || {};
    var ctx = context(username);
    ensureWallet_(ctx, username);
    var portfolio = engine.getPortfolio(ctx, username);
    var map = marketMap_();
    var market = map[predictionMarketPlayerR4String_(payload.marketId)];
    if (!market) throw new Error("Prediction Market not found");
    var nowMs = now().getTime();
    var positions = (portfolio.positions || []).filter(function(position) {
      return position.marketId === market.marketId;
    }).map(function(position) {
      return predictionMarketPlayerR4PositionView_(position, market);
    });
    return {
      success:true,
      market:predictionMarketPlayerR4MarketView_(market, nowMs),
      positions:positions,
      portfolio:portfolio
    };
  }
  function bootstrap(username) {
    var ctx = context(username);
    return { success:true, wallet:engine.bootstrapWallet(ctx, username), portfolio:engine.getPortfolio(ctx, username) };
  }
  function trade(username, payload) {
    payload = payload || {};
    var ctx = context(username);
    ensureWallet_(ctx, username);
    var request = {
      transactionId: payload.transactionId,
      playerId: username,
      marketId: payload.marketId,
      side: payload.side,
      outcome: payload.outcome,
      quantity: payload.quantity,
      referencePrice: payload.referencePrice,
      expectedWalletVersion: payload.expectedWalletVersion,
      requestedAt: payload.requestedAt
    };
    var result = engine.executeTrade(ctx, request);
    return {
      success:true,
      trade:result,
      portfolio:engine.getPortfolio(ctx, username)
    };
  }
  function leaderboard(username) {
    context(username);
    return { success:true, leaderboard:engine.getLeaderboard({ role:"SYSTEM", playerId:username, username:username }) };
  }

  return { state:state, detail:detail, bootstrap:bootstrap, trade:trade, leaderboard:leaderboard };
}

function predictionMarketPlayerR4ProductionService_() {
  var repository = predictionMarketR2CreateAppsScriptRepository();
  var engine = predictionMarketR2CreateEngine({ repository: repository, providers: predictionMarketReferenceProvidersR5CreateR2PriceProviders() });
  return predictionMarketPlayerR4CreateService({ engine: engine });
}

function apiPredictionMarketPlayerR4Dispatch(action, payload) {
  payload = payload || {};
  var service = predictionMarketPlayerR4ProductionService_();
  var username = predictionMarketPlayerR4String_(payload.username);
  switch (String(action || "")) {
    case "getPredictionMarketPlayerState": return service.state(username);
    case "getPredictionMarketPlayerDetail": return service.detail(username, payload);
    case "bootstrapPredictionMarketWallet": return service.bootstrap(username);
    case "executePredictionMarketTrade": return service.trade(username, payload);
    case "getPredictionMarketLeaderboard": return service.leaderboard(username);
    default: throw new Error("Unsupported Prediction Market player action: " + action);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketPlayerR4CreateService: predictionMarketPlayerR4CreateService,
    predictionMarketPlayerR4MarketView_: predictionMarketPlayerR4MarketView_,
    predictionMarketPlayerR4Context_: predictionMarketPlayerR4Context_
  };
}
