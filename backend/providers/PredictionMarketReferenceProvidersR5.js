/* =====================================================
   PREDICTION MARKET REFERENCE PROVIDERS R5

   Read-only provider abstraction. External sources propose reference prices;
   the accepted R2 engine remains the only market-price persistence authority.
   No provider here writes wallets, positions, transactions, settlements, or
   lifecycle state. Production network transports are deliberately not enabled
   in R5; live adapters may be injected and tested without external CI calls.
===================================================== */

var PREDICTION_MARKET_R5_PROVIDER_KINDS = Object.freeze({
  MANUAL: "MANUAL",
  KALSHI: "KALSHI",
  POLYMARKET: "POLYMARKET",
  DIRECTOR_APPROVED: "DIRECTOR_APPROVED"
});

var PREDICTION_MARKET_R5_PRICE_TOLERANCE = 0.000001;

function predictionMarketProviderR5String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketProviderR5Number_(value, label) {
  var n = Number(value);
  if (!isFinite(n)) throw new Error((label || "value") + " must be a finite number");
  return n;
}

function predictionMarketProviderR5Price_(value, label) {
  var n = predictionMarketProviderR5Number_(value, label || "price");
  if (n < 0 || n > 1) throw new Error((label || "price") + " must be between 0 and 1");
  return Math.round(n * 1000000) / 1000000;
}

function predictionMarketProviderR5Iso_(value) {
  var text = predictionMarketProviderR5String_(value);
  if (!text) throw new Error("referencePriceAsOf is required");
  var d = new Date(text);
  if (isNaN(d.getTime())) throw new Error("referencePriceAsOf is invalid");
  return d.toISOString();
}

function predictionMarketProviderR5Kind_(value) {
  var kind = predictionMarketProviderR5String_(value).toUpperCase();
  if (!PREDICTION_MARKET_R5_PROVIDER_KINDS[kind]) throw new Error("Unsupported Prediction Market provider kind: " + kind);
  return kind;
}

function predictionMarketProviderR5Normalize_(input, options) {
  input = input || {};
  options = options || {};
  var kind = predictionMarketProviderR5Kind_(input.providerKind);
  var providerId = predictionMarketProviderR5String_(input.providerId);
  var externalMarketId = predictionMarketProviderR5String_(input.externalMarketId);
  if (!providerId) throw new Error("providerId is required");
  if (!externalMarketId) throw new Error("externalMarketId is required");
  if (typeof input.trusted !== "boolean") throw new Error("trusted must be explicit");
  var yes = predictionMarketProviderR5Price_(input.referenceYesPrice, "referenceYesPrice");
  var no = predictionMarketProviderR5Price_(input.referenceNoPrice, "referenceNoPrice");
  if (Math.abs((yes + no) - 1) > PREDICTION_MARKET_R5_PRICE_TOLERANCE) {
    throw new Error("Binary reference YES and NO prices must sum to 1");
  }
  var asOf = predictionMarketProviderR5Iso_(input.referencePriceAsOf);
  var nowMs = options.nowMs == null ? Date.now() : Number(options.nowMs);
  var ageMs = Math.max(0, nowMs - new Date(asOf).getTime());
  var maxAgeMs = options.maxAgeMs == null ? null : Number(options.maxAgeMs);
  var freshness = maxAgeMs != null && isFinite(maxAgeMs) && ageMs > maxAgeMs ? "STALE" : "FRESH";
  return {
    providerKind: kind,
    providerId: providerId,
    externalMarketId: externalMarketId,
    referenceYesPrice: yes,
    referenceNoPrice: no,
    referencePriceAsOf: asOf,
    trusted: input.trusted,
    sourceUrl: predictionMarketProviderR5String_(input.sourceUrl),
    providerMetadata: input.providerMetadata && typeof input.providerMetadata === "object" ? input.providerMetadata : {},
    providerStatus: freshness,
    ageMs: ageMs
  };
}

function predictionMarketProviderR5Failure_(kind, status, message, metadata) {
  return {
    success: false,
    providerKind: predictionMarketProviderR5String_(kind).toUpperCase(),
    providerStatus: status || "PROVIDER_ERROR",
    message: message || "Prediction Market provider refresh failed",
    providerMetadata: metadata && typeof metadata === "object" ? metadata : {}
  };
}

function predictionMarketProviderR5ManualAdapter_(options) {
  options = options || {};
  return {
    kind: "MANUAL",
    fetchReference: function(market) {
      market = market || {};
      try {
        return {
          success: true,
          snapshot: predictionMarketProviderR5Normalize_({
            providerKind: "MANUAL",
            providerId: predictionMarketProviderR5String_(market.providerId) || "PATTC_MANUAL",
            externalMarketId: predictionMarketProviderR5String_(market.externalMarketId) || predictionMarketProviderR5String_(market.marketId),
            referenceYesPrice: market.referenceYesPrice,
            referenceNoPrice: market.referenceNoPrice,
            referencePriceAsOf: market.referencePriceAsOf,
            trusted: market.referencePriceTrusted === true,
            sourceUrl: market.sourceUrl,
            providerMetadata: market.providerMetadata || {}
          }, options)
        };
      } catch (err) {
        return predictionMarketProviderR5Failure_("MANUAL", "INVALID", err && err.message);
      }
    }
  };
}

function predictionMarketProviderR5ParseJsonResponse_(response) {
  if (!response) throw new Error("Provider returned no response");
  var status = Number(response.status == null ? response.statusCode : response.status);
  if (!isFinite(status)) status = 0;
  if (status === 429) {
    var rateErr = new Error("Provider rate limit reached");
    rateErr.providerStatus = "RATE_LIMITED";
    throw rateErr;
  }
  if (status < 200 || status >= 300) {
    var httpErr = new Error("Provider HTTP failure: " + status);
    httpErr.providerStatus = status === 404 ? "UNAVAILABLE" : "PROVIDER_ERROR";
    throw httpErr;
  }
  var body = response.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch (err) {
      var jsonErr = new Error("Provider returned malformed JSON");
      jsonErr.providerStatus = "INVALID";
      throw jsonErr;
    }
  }
  if (!body || typeof body !== "object") {
    var shapeErr = new Error("Provider returned an invalid payload");
    shapeErr.providerStatus = "INVALID";
    throw shapeErr;
  }
  return body;
}

function predictionMarketProviderR5KalshiMap_(marketPayload, configuredMarket, options) {
  marketPayload = marketPayload || {};
  configuredMarket = configuredMarket || {};
  var market = marketPayload.market || marketPayload;
  if (!market || typeof market !== "object" || !predictionMarketProviderR5String_(market.ticker)) {
    throw new Error("Kalshi market payload is missing the requested market");
  }
  var configuredTicker = predictionMarketProviderR5String_(configuredMarket.externalMarketId);
  if (configuredTicker && predictionMarketProviderR5String_(market.ticker) !== configuredTicker) {
    throw new Error("Kalshi market payload does not match externalMarketId");
  }
  var yes = predictionMarketProviderR5Price_(market.last_price_dollars, "Kalshi last_price_dollars");
  var no = Math.round((1 - yes) * 1000000) / 1000000;
  return predictionMarketProviderR5Normalize_({
    providerKind: "KALSHI",
    providerId: predictionMarketProviderR5String_(configuredMarket.providerId) || "KALSHI_PUBLIC_MARKET_DATA",
    externalMarketId: predictionMarketProviderR5String_(market.ticker),
    referenceYesPrice: yes,
    referenceNoPrice: no,
    referencePriceAsOf: market.updated_time,
    trusted: true,
    sourceUrl: "https://external-api.kalshi.com/trade-api/v2/markets/" + encodeURIComponent(predictionMarketProviderR5String_(market.ticker)),
    providerMetadata: {
      sourceField: "last_price_dollars",
      eventTicker: predictionMarketProviderR5String_(market.event_ticker),
      marketStatus: predictionMarketProviderR5String_(market.status),
      officialApi: "Kalshi Trade API v2"
    }
  }, options);
}

function predictionMarketProviderR5KalshiAdapter_(options) {
  options = options || {};
  var transport = options.transport;
  return {
    kind: "KALSHI",
    liveEnabled: typeof transport === "function",
    fetchReference: function(market) {
      market = market || {};
      var ticker = predictionMarketProviderR5String_(market.externalMarketId);
      if (!ticker) return predictionMarketProviderR5Failure_("KALSHI", "UNAVAILABLE", "Kalshi externalMarketId is required");
      if (typeof transport !== "function") {
        return predictionMarketProviderR5Failure_("KALSHI", "UNCONFIGURED", "Kalshi live network transport is not enabled in R5");
      }
      var url = "https://external-api.kalshi.com/trade-api/v2/markets/" + encodeURIComponent(ticker);
      try {
        var response = transport(url, { method: "GET", timeoutMs: Number(options.timeoutMs || 5000), maxAttempts: 1 });
        var body = predictionMarketProviderR5ParseJsonResponse_(response);
        return { success: true, snapshot: predictionMarketProviderR5KalshiMap_(body, market, options) };
      } catch (err) {
        var state = err && err.providerStatus ? err.providerStatus : (err && err.code === "TIMEOUT" ? "PROVIDER_ERROR" : "PROVIDER_ERROR");
        return predictionMarketProviderR5Failure_("KALSHI", state, err && err.message ? err.message : "Kalshi provider failure", {
          timeout: !!(err && err.code === "TIMEOUT"), maxAttempts: 1
        });
      }
    }
  };
}

function predictionMarketProviderR5UnconfiguredAdapter_(kind, message) {
  return {
    kind: kind,
    liveEnabled: false,
    fetchReference: function() {
      return predictionMarketProviderR5Failure_(kind, "UNCONFIGURED", message || (kind + " live provider is not configured in R5"));
    }
  };
}

function predictionMarketReferenceProvidersR5CreateRegistry(options) {
  options = options || {};
  var normalizeOptions = {
    nowMs: options.nowMs,
    maxAgeMs: options.maxAgeMs
  };
  var adapters = {
    MANUAL: predictionMarketProviderR5ManualAdapter_(normalizeOptions),
    KALSHI: predictionMarketProviderR5KalshiAdapter_(Object.assign({}, normalizeOptions, {
      transport: options.kalshiTransport,
      timeoutMs: options.timeoutMs || 5000
    })),
    POLYMARKET: predictionMarketProviderR5UnconfiguredAdapter_("POLYMARKET", "Polymarket live mapping is intentionally unconfigured in R5"),
    DIRECTOR_APPROVED: predictionMarketProviderR5UnconfiguredAdapter_("DIRECTOR_APPROVED", "Director-approved live provider transport is not configured in R5")
  };
  return {
    getAdapter: function(kind) {
      kind = predictionMarketProviderR5Kind_(kind);
      return adapters[kind];
    },
    fetchReference: function(market) {
      market = market || {};
      var kind = predictionMarketProviderR5Kind_(market.providerKind || "MANUAL");
      return adapters[kind].fetchReference(market);
    },
    liveExternalProvidersEnabled: !!options.kalshiTransport,
    kinds: Object.keys(adapters)
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PREDICTION_MARKET_R5_PROVIDER_KINDS: PREDICTION_MARKET_R5_PROVIDER_KINDS,
    predictionMarketProviderR5Normalize_: predictionMarketProviderR5Normalize_,
    predictionMarketProviderR5ManualAdapter_: predictionMarketProviderR5ManualAdapter_,
    predictionMarketProviderR5KalshiMap_: predictionMarketProviderR5KalshiMap_,
    predictionMarketProviderR5KalshiAdapter_: predictionMarketProviderR5KalshiAdapter_,
    predictionMarketReferenceProvidersR5CreateRegistry: predictionMarketReferenceProvidersR5CreateRegistry
  };
}
