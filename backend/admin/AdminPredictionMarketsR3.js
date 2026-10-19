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
  var allowed = predictionMarketAdminR3AllowedActions_(market.status).slice();
  var status = predictionMarketAdminR3String_(market.status).toUpperCase();
  var providerKind = predictionMarketAdminR3String_(market.providerKind || "MANUAL").toUpperCase();
  if (providerKind !== "MANUAL" && status !== "RESOLVED" && status !== "VOID") allowed.push("REFRESH_PROVIDER");
  return Object.assign({}, market, {
    allowedAdminActions: allowed,
    tradingAvailable: status === "OPEN",
    providerRefreshAvailable: allowed.indexOf("REFRESH_PROVIDER") !== -1
  });
}

function predictionMarketAdminR3ImportArray_(value) {
  if (Array.isArray(value)) return value;
  var text = predictionMarketAdminR3String_(value);
  if (!text) return [];
  try {
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error("externalImportItems must be a valid JSON array");
  }
}

function predictionMarketAdminR3ImportSlug_(value) {
  return predictionMarketAdminR3String_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function predictionMarketAdminR3ImportMarketId_(providerKind, providerId, externalMarketId) {
  var provider = predictionMarketAdminR3ImportSlug_(providerKind) || "external";
  var eventId = predictionMarketAdminR3ImportSlug_(providerId).slice(-36);
  var marketId = predictionMarketAdminR3ImportSlug_(externalMarketId).slice(-72);
  var parts = ["pm", provider, eventId, marketId].filter(Boolean);
  return parts.join("-").slice(0, 180);
}

function predictionMarketAdminR3ImportProbability_(value) {
  var n = Number(value);
  if (!isFinite(n)) return null;
  if (n > 1 && n <= 100) n = n / 100;
  if (n < 0 || n > 1) return null;
  return Math.round(n * 1000000) / 1000000;
}

function predictionMarketAdminR3ImportPrice_(prices, outcome) {
  prices = prices && typeof prices === "object" ? prices : {};
  var wanted = predictionMarketAdminR3String_(outcome).toLowerCase();
  var keys = Object.keys(prices);
  for (var i = 0; i < keys.length; i += 1) {
    if (predictionMarketAdminR3String_(keys[i]).toLowerCase() === wanted) {
      return predictionMarketAdminR3ImportProbability_(prices[keys[i]]);
    }
  }
  return null;
}

function predictionMarketAdminR3ImportIdentity_(row) {
  row = row || {};
  return [
    predictionMarketAdminR3String_(row.providerKind).toUpperCase(),
    predictionMarketAdminR3String_(row.providerId),
    predictionMarketAdminR3String_(row.externalMarketId)
  ].join("|");
}

function predictionMarketAdminR3MapExternalDraft_(selection) {
  selection = selection || {};
  var market = selection.market && typeof selection.market === "object" ? selection.market : selection;
  var config = selection.config && typeof selection.config === "object" ? selection.config : {};
  var provider = predictionMarketAdminR3String_(market.provider || market.providerKind).toLowerCase();
  if (provider !== "kalshi" && provider !== "polymarket") throw new Error("External market provider must be Kalshi or Polymarket");

  var providerId = predictionMarketAdminR3String_(market.externalEventId || market.providerId);
  var externalMarketId = predictionMarketAdminR3String_(market.externalMarketId);
  if (!providerId || !externalMarketId) throw new Error("External market identity is incomplete");

  var outcomes = Array.isArray(market.outcomes) ? market.outcomes.map(predictionMarketAdminR3String_).filter(Boolean) : [];
  if (!outcomes.length) outcomes = ["Yes", "No"];
  var selectedOutcome = predictionMarketAdminR3String_(config.selectedOutcome || selection.selectedOutcome);
  var yesOutcome = "";
  var noOutcome = "";
  var yesIndex = outcomes.map(function(outcome) { return outcome.toLowerCase(); }).indexOf("yes");
  var noIndex = outcomes.map(function(outcome) { return outcome.toLowerCase(); }).indexOf("no");

  if (yesIndex !== -1 && noIndex !== -1) {
    yesOutcome = outcomes[yesIndex];
    noOutcome = outcomes[noIndex];
  } else {
    if (!selectedOutcome) throw new Error("Choose the external outcome that will map to PATTC YES");
    var selectedIndex = outcomes.map(function(outcome) { return outcome.toLowerCase(); }).indexOf(selectedOutcome.toLowerCase());
    if (selectedIndex === -1) throw new Error("Selected external outcome is not available on this market");
    yesOutcome = outcomes[selectedIndex];
    if (outcomes.length === 2) noOutcome = outcomes[selectedIndex === 0 ? 1 : 0];
    else noOutcome = "Other";
  }

  var yesPrice = predictionMarketAdminR3ImportPrice_(market.prices, yesOutcome);
  if (yesPrice === null && market.primaryProbability != null && (!selectedOutcome || yesIndex !== -1)) {
    yesPrice = predictionMarketAdminR3ImportProbability_(market.primaryProbability);
  }
  if (yesPrice === null) throw new Error("External YES reference price is unavailable");

  var noPrice = predictionMarketAdminR3ImportPrice_(market.prices, noOutcome);
  if (noPrice === null || Math.abs((yesPrice + noPrice) - 1) > 0.000001) {
    noPrice = Math.round((1 - yesPrice) * 1000000) / 1000000;
  }

  var referencePriceAsOf = predictionMarketAdminR3String_(
    config.referencePriceAsOf || selection.referencePriceAsOf || market.referencePriceAsOf
  );
  var providerMetadata = Object.assign({},
    market.providerMetadata && typeof market.providerMetadata === "object" ? market.providerMetadata : {},
    {
      source: "awards-external-markets",
      externalEventId: providerId,
      eventName: predictionMarketAdminR3String_(market.eventName),
      marketQuestion: predictionMarketAdminR3String_(market.marketQuestion),
      outcomes: outcomes,
      prices: market.prices && typeof market.prices === "object" ? market.prices : {},
      selectedOutcome: selectedOutcome || yesOutcome,
      resolutionSource: predictionMarketAdminR3String_(market.resolutionSource),
      raw: market.raw && typeof market.raw === "object" ? market.raw : {}
    }
  );

  return {
    marketId: predictionMarketAdminR3String_(config.marketId) || predictionMarketAdminR3ImportMarketId_(provider, providerId, externalMarketId),
    title: predictionMarketAdminR3String_(config.title || market.marketQuestion || market.eventName || externalMarketId),
    description: predictionMarketAdminR3String_(config.description || market.description),
    category: predictionMarketAdminR3String_(config.category || market.category),
    yesLabel: predictionMarketAdminR3String_(config.yesLabel) || yesOutcome || "YES",
    noLabel: predictionMarketAdminR3String_(config.noLabel) || noOutcome || "NO",
    referenceYesPrice: yesPrice,
    referenceNoPrice: noPrice,
    referencePriceAsOf: referencePriceAsOf,
    referencePriceTrusted: !!referencePriceAsOf && config.referencePriceTrusted !== false,
    providerKind: provider.toUpperCase(),
    providerId: providerId,
    externalMarketId: externalMarketId,
    sourceUrl: predictionMarketAdminR3String_(config.sourceUrl || market.sourceUrl),
    providerMetadata: providerMetadata,
    openTime: "",
    lockTime: predictionMarketAdminR3String_(config.lockTime || market.closeTime),
    importMapping: {
      yesOutcome: yesOutcome,
      noOutcome: noOutcome,
      selectedOutcome: selectedOutcome || yesOutcome,
      transformedToBinary: !(yesIndex !== -1 && noIndex !== -1)
    }
  };
}

function predictionMarketAdminR3CreateService(options) {
  options = options || {};
  var engine = options.engine;
  var providerRegistry = options.providerRegistry || null;
  var externalSearch = options.externalSearch || null;
  var externalDetail = options.externalDetail || null;
  if (!engine) throw new Error("Prediction Market R2 engine is required");

  function actor(username) { return predictionMarketAdminR3Context_(username); }
  function list(username) {
    actor(username);
    return {
      success: true,
      markets: (engine.getMarkets() || []).map(predictionMarketAdminR3MarketView_)
    };
  }
  function searchExternal(username, payload) {
    actor(username);
    if (typeof externalSearch !== "function") throw new Error("Awards external-market search authority is unavailable");
    payload = Object.assign({}, payload || {}, { username: username });
    var provider = predictionMarketAdminR3String_(payload.provider || "all").toLowerCase();
    payload.provider = provider === "all" ? "both" : provider;
    return externalSearch(payload);
  }
  function getExternalDetail(username, payload) {
    actor(username);
    if (typeof externalDetail !== "function") throw new Error("Awards external-market detail authority is unavailable");
    return externalDetail(Object.assign({}, payload || {}, { username: username }));
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
  function importExternalDrafts(username, payload) {
    actor(username);
    payload = payload || {};
    var items = predictionMarketAdminR3ImportArray_(payload.externalImportItems || payload.externalImportItemsJSON);
    if (!items.length) throw new Error("Select at least one external market to import");
    var results = [];
    var created = 0;
    var failed = 0;

    items.forEach(function(selection, index) {
      var mapped = null;
      try {
        mapped = predictionMarketAdminR3MapExternalDraft_(selection);
        var identity = predictionMarketAdminR3ImportIdentity_(mapped);
        var duplicate = (engine.getMarkets() || []).some(function(row) {
          return predictionMarketAdminR3ImportIdentity_(row) === identity;
        });
        if (duplicate) {
          failed += 1;
          results.push({
            index: index,
            success: false,
            status: "DUPLICATE",
            providerKind: mapped.providerKind,
            providerId: mapped.providerId,
            externalMarketId: mapped.externalMarketId,
            message: "This external market is already stored in PATTC Prediction Markets."
          });
          return;
        }
        var createdMarket = engine.createMarket(actor(username), mapped);
        created += 1;
        results.push({
          index: index,
          success: true,
          status: "CREATED",
          market: predictionMarketAdminR3MarketView_(createdMarket),
          importMapping: mapped.importMapping
        });
      } catch (err) {
        failed += 1;
        results.push({
          index: index,
          success: false,
          status: "INVALID",
          providerKind: mapped && mapped.providerKind || "",
          providerId: mapped && mapped.providerId || "",
          externalMarketId: mapped && mapped.externalMarketId || "",
          message: err && err.message ? err.message : String(err)
        });
      }
    });

    return {
      success: true,
      requested: items.length,
      created: created,
      failed: failed,
      results: results
    };
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

  return {
    list:list,
    searchExternal:searchExternal,
    getExternalDetail:getExternalDetail,
    create:create,
    importExternalDrafts:importExternalDrafts,
    edit:edit,
    price:price,
    refreshReference:refreshReference,
    open:open,
    lock:lock,
    resolve:resolve,
    voidMarket:voidMarket
  };
}

function predictionMarketAdminR3ProductionService_() {
  var repository = predictionMarketR2CreateAppsScriptRepository();
  var engine = predictionMarketR2CreateEngine({ repository: repository, providers: predictionMarketReferenceProvidersR5CreateR2PriceProviders() });
  var providerRegistry = predictionMarketReferenceProvidersR5CreateRegistry({ maxAgeMs: PREDICTION_MARKET_R2_CONFIG.maxReferencePriceAgeMs });
  return predictionMarketAdminR3CreateService({
    engine: engine,
    providerRegistry: providerRegistry,
    externalSearch: function(payload) { return apiAdminAwardsSearchExternalMarkets(payload); },
    externalDetail: function(payload) { return apiAdminAwardsGetExternalEvent(payload); }
  });
}

function apiAdminPredictionMarketR3Dispatch(action, payload) {
  payload = payload || {};
  var service = predictionMarketAdminR3ProductionService_();
  var username = predictionMarketAdminR3String_(payload.username);
  switch (String(action || "")) {
    case "adminGetPredictionMarkets":
      if (predictionMarketAdminR3String_(payload.externalAction).toLowerCase() === "search") return service.searchExternal(username, payload);
      if (predictionMarketAdminR3String_(payload.externalAction).toLowerCase() === "detail") return service.getExternalDetail(username, payload);
      return service.list(username);
    case "adminCreatePredictionMarket":
      if (payload.externalImportItems || payload.externalImportItemsJSON) return service.importExternalDrafts(username, payload);
      return service.create(username, payload);
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
    predictionMarketAdminR3MarketView_: predictionMarketAdminR3MarketView_,
    predictionMarketAdminR3MapExternalDraft_: predictionMarketAdminR3MapExternalDraft_,
    apiAdminPredictionMarketR3Dispatch: apiAdminPredictionMarketR3Dispatch
  };
}
