/* =====================================================
   PREDICTION MARKET PROVIDER RESOLUTION R2

   Safe external lifecycle adapter for imported Prediction Markets.
   CLOSED IS NOT RESOLVED. Price data is never used as resolution evidence.
   Financial writes remain inside PredictionMarketEngineR2.
===================================================== */

var PREDICTION_MARKET_PROVIDER_RESOLUTION_R2 = Object.freeze({
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  RESOLVED: "RESOLVED",
  VOID: "VOID"
});

function predictionMarketProviderResolutionR2String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketProviderResolutionR2Upper_(value) {
  return predictionMarketProviderResolutionR2String_(value).toUpperCase();
}

function predictionMarketProviderResolutionR2Json_(value) {
  if (value && typeof value === "object") return JSON.parse(JSON.stringify(value));
  var text = predictionMarketProviderResolutionR2String_(value);
  if (!text) return {};
  try { return JSON.parse(text); } catch (err) { return {}; }
}

function predictionMarketProviderResolutionR2Array_(value) {
  if (Array.isArray(value)) return value.slice();
  var text = predictionMarketProviderResolutionR2String_(value);
  if (!text) return [];
  try {
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function predictionMarketProviderResolutionR2Review_(providerKind, providerStatus, reason, evidence) {
  return {
    lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.REVIEW_REQUIRED,
    providerKind: predictionMarketProviderResolutionR2Upper_(providerKind),
    providerStatus: predictionMarketProviderResolutionR2String_(providerStatus),
    tradingClosed: false,
    final: false,
    voided: false,
    providerWinningOutcome: "",
    providerWinningOutcomeIndex: null,
    mappedWinningOutcome: "",
    reviewRequired: true,
    reviewReason: predictionMarketProviderResolutionR2String_(reason) || "PROVIDER_RESULT_UNSAFE",
    evidence: evidence || {}
  };
}

function predictionMarketProviderResolutionR2MapKalshi_(payload) {
  var market = payload && payload.market ? payload.market : (payload || {});
  var status = predictionMarketProviderResolutionR2String_(market.status).toLowerCase();
  var result = predictionMarketProviderResolutionR2String_(market.result).toLowerCase();
  var evidence = {
    status: status,
    result: result,
    settlementTs: predictionMarketProviderResolutionR2String_(market.settlement_ts || market.settlementTs),
    settlementValue: market.settlement_value != null ? market.settlement_value : market.settlementValue
  };

  if (status === "active") {
    return {
      lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.OPEN,
      providerKind: "KALSHI", providerStatus: status, tradingClosed: false,
      final: false, voided: false, providerWinningOutcome: "",
      providerWinningOutcomeIndex: null, mappedWinningOutcome: "",
      reviewRequired: false, reviewReason: "", evidence: evidence
    };
  }
  if (["closed", "determined", "disputed", "amended", "inactive", "initialized"].indexOf(status) !== -1) {
    return {
      lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.CLOSED,
      providerKind: "KALSHI", providerStatus: status, tradingClosed: true,
      final: false, voided: false, providerWinningOutcome: "",
      providerWinningOutcomeIndex: null, mappedWinningOutcome: "",
      reviewRequired: false, reviewReason: "", evidence: evidence
    };
  }
  if (status === "finalized") {
    if (result === "yes" || result === "no") {
      return {
        lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.RESOLVED,
        providerKind: "KALSHI", providerStatus: status, tradingClosed: true,
        final: true, voided: false,
        providerWinningOutcome: result === "yes" ? "Yes" : "No",
        providerWinningOutcomeIndex: result === "yes" ? 0 : 1,
        mappedWinningOutcome: result.toUpperCase(), reviewRequired: false,
        reviewReason: "", evidence: evidence
      };
    }
    if (["void", "cancelled", "canceled"].indexOf(result) !== -1) {
      return {
        lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.VOID,
        providerKind: "KALSHI", providerStatus: status, tradingClosed: true,
        final: true, voided: true, providerWinningOutcome: "",
        providerWinningOutcomeIndex: null, mappedWinningOutcome: "",
        reviewRequired: false, reviewReason: "", evidence: evidence
      };
    }
    return predictionMarketProviderResolutionR2Review_("KALSHI", status, "FINALIZED_WITHOUT_SUPPORTED_RESULT", evidence);
  }
  return predictionMarketProviderResolutionR2Review_("KALSHI", status, "UNSUPPORTED_PROVIDER_STATUS", evidence);
}

function predictionMarketProviderResolutionR2MapPolymarket_(gammaMarket, resolutionPayload) {
  gammaMarket = gammaMarket || {};
  var closed = gammaMarket.closed === true;
  var active = gammaMarket.active !== false;
  var outcomes = predictionMarketProviderResolutionR2Array_(gammaMarket.outcomes).map(predictionMarketProviderResolutionR2String_);
  var rows = resolutionPayload && Array.isArray(resolutionPayload.data) ? resolutionPayload.data :
    (Array.isArray(resolutionPayload) ? resolutionPayload : []);
  var conditionId = predictionMarketProviderResolutionR2String_(gammaMarket.conditionId || gammaMarket.condition_id);
  var row = rows.filter(function(candidate) {
    var candidateId = predictionMarketProviderResolutionR2String_(candidate && (candidate.condition_id || candidate.conditionId));
    return !conditionId || !candidateId || candidateId.toLowerCase() === conditionId.toLowerCase();
  })[0] || null;
  var status = predictionMarketProviderResolutionR2String_(row && row.status).toLowerCase();
  var payouts = row && Array.isArray(row.payouts) ? row.payouts.map(Number) : [];
  var evidence = {
    gammaClosed: closed,
    gammaActive: active,
    conditionId: conditionId,
    resolutionStatus: status,
    payouts: payouts,
    resolvedAt: predictionMarketProviderResolutionR2String_(row && row.resolved_at),
    resolutionSource: predictionMarketProviderResolutionR2String_(row && row.resolution_source),
    reporter: predictionMarketProviderResolutionR2String_(row && row.reporter)
  };

  if (row && status === "resolved") {
    if (!outcomes.length || payouts.length !== outcomes.length) {
      return predictionMarketProviderResolutionR2Review_("POLYMARKET", status, "RESOLVED_PAYOUT_MAPPING_INCOMPLETE", evidence);
    }
    var winners = [];
    payouts.forEach(function(value, index) {
      if (Number(value) === 1000000) winners.push(index);
    });
    var allBinary = payouts.every(function(value) { return Number(value) === 0 || Number(value) === 1000000; });
    if (!allBinary || winners.length !== 1) {
      return predictionMarketProviderResolutionR2Review_("POLYMARKET", status, "NON_BINARY_OR_AMBIGUOUS_FINAL_PAYOUT", evidence);
    }
    var winnerIndex = winners[0];
    return {
      lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.RESOLVED,
      providerKind: "POLYMARKET", providerStatus: status, tradingClosed: true,
      final: true, voided: false, providerWinningOutcome: outcomes[winnerIndex],
      providerWinningOutcomeIndex: winnerIndex, mappedWinningOutcome: "",
      reviewRequired: false, reviewReason: "", evidence: evidence
    };
  }

  if (closed || ["posed", "proposed", "challenged", "reproposed", "disputed", "arbitration"].indexOf(status) !== -1) {
    return {
      lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.CLOSED,
      providerKind: "POLYMARKET", providerStatus: status || "closed", tradingClosed: true,
      final: false, voided: false, providerWinningOutcome: "",
      providerWinningOutcomeIndex: null, mappedWinningOutcome: "",
      reviewRequired: false, reviewReason: "", evidence: evidence
    };
  }
  if (!closed && active) {
    return {
      lifecycle: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.OPEN,
      providerKind: "POLYMARKET", providerStatus: status || "active", tradingClosed: false,
      final: false, voided: false, providerWinningOutcome: "",
      providerWinningOutcomeIndex: null, mappedWinningOutcome: "",
      reviewRequired: false, reviewReason: "", evidence: evidence
    };
  }
  return predictionMarketProviderResolutionR2Review_("POLYMARKET", status, "PROVIDER_STATE_AMBIGUOUS", evidence);
}

function predictionMarketProviderResolutionR2MapWinner_(market, result) {
  if (!result || result.lifecycle !== PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.RESOLVED) return result;
  if (result.mappedWinningOutcome === "YES" || result.mappedWinningOutcome === "NO") return result;
  var metadata = predictionMarketProviderResolutionR2Json_(market && market.providerMetadata);
  var outcomes = Array.isArray(metadata.outcomes) ? metadata.outcomes.map(predictionMarketProviderResolutionR2String_) : [];
  var selected = predictionMarketProviderResolutionR2String_(metadata.selectedOutcome || market.yesLabel);
  var winner = predictionMarketProviderResolutionR2String_(result.providerWinningOutcome);
  var winnerLower = winner.toLowerCase();
  var selectedLower = selected.toLowerCase();
  var found = outcomes.some(function(outcome) { return outcome.toLowerCase() === winnerLower; });
  if (!winner || !selected || (outcomes.length && !found)) {
    result.lifecycle = PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.REVIEW_REQUIRED;
    result.reviewRequired = true;
    result.reviewReason = "PROVIDER_WINNER_UNMAPPED";
    result.final = false;
    return result;
  }
  result.mappedWinningOutcome = winnerLower === selectedLower ? "YES" : "NO";
  return result;
}

function predictionMarketProviderResolutionR2CreateService(options) {
  options = options || {};
  var engine = options.engine;
  var repository = options.repository || (engine && engine.repository);
  var fetchKalshi = options.fetchKalshi;
  var fetchPolymarket = options.fetchPolymarket;
  var nowIso = options.nowIso || function() { return new Date().toISOString(); };
  if (!engine || !repository) throw new Error("Prediction Market R2 engine/repository is required");

  function systemContext(username) {
    return { role: "SYSTEM", playerId: predictionMarketProviderResolutionR2String_(username) || "provider-resolution-r2", username: predictionMarketProviderResolutionR2String_(username) || "provider-resolution-r2" };
  }
  function getMarket(marketId) {
    return (engine.getMarkets() || []).filter(function(row) {
      return predictionMarketProviderResolutionR2String_(row.marketId) === predictionMarketProviderResolutionR2String_(marketId);
    })[0] || null;
  }
  function persistMetadata(market, resolution, username) {
    if (!repository || typeof repository.saveMarket !== "function") return market;
    var metadata = predictionMarketProviderResolutionR2Json_(market.providerMetadata);
    metadata.providerResolutionR2 = {
      lifecycle: resolution.lifecycle,
      providerStatus: resolution.providerStatus,
      final: resolution.final === true,
      voided: resolution.voided === true,
      providerWinningOutcome: resolution.providerWinningOutcome || "",
      providerWinningOutcomeIndex: resolution.providerWinningOutcomeIndex == null ? null : resolution.providerWinningOutcomeIndex,
      mappedWinningOutcome: resolution.mappedWinningOutcome || "",
      reviewRequired: resolution.reviewRequired === true,
      reviewReason: resolution.reviewReason || "",
      observedAt: nowIso(),
      evidence: resolution.evidence || {}
    };
    var updated = Object.assign({}, market, {
      providerMetadata: metadata,
      updatedAt: nowIso(),
      updatedBy: predictionMarketProviderResolutionR2String_(username) || "provider-resolution-r2"
    });
    return repository.saveMarket(updated);
  }
  function settleAll(ctx, marketId) {
    var positions = typeof repository.listPositions === "function" ? repository.listPositions() : [];
    var players = {};
    positions.forEach(function(position) {
      if (predictionMarketProviderResolutionR2String_(position.marketId) === predictionMarketProviderResolutionR2String_(marketId)) {
        players[predictionMarketProviderResolutionR2String_(position.playerId)] = true;
      }
    });
    return Object.keys(players).filter(Boolean).map(function(playerId) {
      return engine.settlePlayerMarket(ctx, marketId, playerId);
    });
  }
  function fetchResult(market) {
    var provider = predictionMarketProviderResolutionR2Upper_(market.providerKind);
    if (provider === "KALSHI") {
      if (typeof fetchKalshi !== "function") throw new Error("Kalshi lifecycle authority is unavailable");
      return predictionMarketProviderResolutionR2MapWinner_(market, predictionMarketProviderResolutionR2MapKalshi_(fetchKalshi(market)));
    }
    if (provider === "POLYMARKET") {
      if (typeof fetchPolymarket !== "function") throw new Error("Polymarket lifecycle authority is unavailable");
      var fetched = fetchPolymarket(market) || {};
      return predictionMarketProviderResolutionR2MapWinner_(market, predictionMarketProviderResolutionR2MapPolymarket_(fetched.market || fetched.gammaMarket, fetched.resolutions || fetched.resolution));
    }
    return predictionMarketProviderResolutionR2Review_(provider, "", "UNSUPPORTED_PROVIDER", {});
  }
  function sync(username, marketId) {
    var market = getMarket(marketId);
    if (!market) throw new Error("Prediction Market not found");
    var provider = predictionMarketProviderResolutionR2Upper_(market.providerKind || "MANUAL");
    if (provider === "MANUAL") {
      return { success: true, skipped: true, reason: "MANUAL_MARKET", market: market, settlements: [] };
    }
    var result;
    try {
      result = fetchResult(market);
    } catch (err) {
      result = predictionMarketProviderResolutionR2Review_(provider, "PROVIDER_ERROR", "PROVIDER_API_UNAVAILABLE", { message: err && err.message ? err.message : String(err) });
    }

    var previous = predictionMarketProviderResolutionR2Json_(market.providerMetadata).providerResolutionR2 || {};
    var previousWinner = predictionMarketProviderResolutionR2String_(previous.providerWinningOutcome);
    if (previous.final === true && previousWinner && result.final === true && predictionMarketProviderResolutionR2String_(result.providerWinningOutcome) && previousWinner.toLowerCase() !== predictionMarketProviderResolutionR2String_(result.providerWinningOutcome).toLowerCase()) {
      result = predictionMarketProviderResolutionR2Review_(provider, result.providerStatus, "PROVIDER_FINAL_RESULT_CHANGED", { previous: previous, current: result.evidence || {} });
    }

    var currentStatus = predictionMarketProviderResolutionR2Upper_(market.status);
    if (currentStatus === "RESOLVED" || currentStatus === "VOID") {
      // Compare with canonical completion even when a prior metadata write failed
      // or the group coordinator performed the original resolution.
      var matchesCompletion = result.final === true && result.reviewRequired !== true &&
        (currentStatus === "VOID" ? result.voided === true || result.lifecycle === "VOID" :
          result.lifecycle === "RESOLVED" && predictionMarketProviderResolutionR2Upper_(result.mappedWinningOutcome) === predictionMarketProviderResolutionR2Upper_(market.winningOutcome));
      if (!matchesCompletion && result.reviewRequired !== true) {
        result = predictionMarketProviderResolutionR2Review_(provider, result.providerStatus, "PROVIDER_COMPLETED_RESULT_CHANGED", { current:result, completedStatus:currentStatus, winningOutcome:market.winningOutcome });
      }
      persistMetadata(market, result, username);
      // Resolution and player settlements are separate durable operations. Resume
      // unfinished players through the idempotent engine after an interrupted sync.
      var pendingPlayers = {};
      if (matchesCompletion && typeof repository.listPositions === "function") {
        repository.listPositions().forEach(function(position) {
          if (predictionMarketProviderResolutionR2String_(position.marketId) !== predictionMarketProviderResolutionR2String_(marketId)) return;
          var playerId = predictionMarketProviderResolutionR2String_(position.playerId);
          var settlement = typeof repository.getSettlement === "function" ? repository.getSettlement(marketId + ":" + playerId) : null;
          if (position.settled !== true || settlement && predictionMarketProviderResolutionR2Upper_(settlement.status) === "PENDING") {
            pendingPlayers[playerId] = true;
          }
        });
      }
      var resumed = Object.keys(pendingPlayers).filter(Boolean).map(function(playerId) {
        return engine.settlePlayerMarket(systemContext(username), marketId, playerId);
      });
      return { success: true, completed: true, noOverride: true, providerResolution: result, market: getMarket(marketId), settlements: resumed };
    }

    var ctx = systemContext(username);
    // Provider OPEN is observational only for PATTC DRAFTs. Imported markets
    // remain DRAFT until an Admin explicitly opens them.
    if (result.tradingClosed === true && currentStatus === "OPEN") {
      market = engine.lockMarket(ctx, marketId);
      currentStatus = "LOCKED";
    }

    var settlements = [];
    if (result.lifecycle === PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.RESOLVED && result.reviewRequired !== true) {
      if (currentStatus === "DRAFT") {
        result = predictionMarketProviderResolutionR2Review_(provider, result.providerStatus, "FINAL_RESULT_REQUIRES_ADMIN_REVIEW_FOR_DRAFT", result.evidence);
      } else if (currentStatus === "LOCKED") {
        market = engine.resolveMarket(ctx, marketId, result.mappedWinningOutcome);
        settlements = settleAll(ctx, marketId);
      }
    } else if (result.lifecycle === PREDICTION_MARKET_PROVIDER_RESOLUTION_R2.VOID && result.reviewRequired !== true) {
      if (currentStatus === "DRAFT") {
        result = predictionMarketProviderResolutionR2Review_(provider, result.providerStatus, "VOID_RESULT_REQUIRES_ADMIN_REVIEW_FOR_DRAFT", result.evidence);
      } else {
        market = engine.voidMarket(ctx, marketId);
        settlements = settleAll(ctx, marketId);
      }
    }

    market = getMarket(marketId) || market;
    persistMetadata(market, result, username);
    return { success: true, providerResolution: result, market: getMarket(marketId), settlements: settlements };
  }

  return { sync: sync, fetchResult: fetchResult };
}

function predictionMarketProviderResolutionR2ProductionService_() {
  var repository = predictionMarketR2CreateAppsScriptRepository();
  if (typeof predictionMarketTradingFeesR1DecorateRepository === "function") repository = predictionMarketTradingFeesR1DecorateRepository(repository);
  var engine = predictionMarketR2CreateEngine({ repository: repository, providers: predictionMarketReferenceProvidersR5CreateR2PriceProviders() });
  return predictionMarketProviderResolutionR2CreateService({
    engine: engine,
    repository: repository,
    fetchKalshi: function(market) {
      var ticker = encodeURIComponent(predictionMarketProviderResolutionR2String_(market.externalMarketId));
      return awardsManagerFetchJson_("https://api.elections.kalshi.com/trade-api/v2/markets/" + ticker);
    },
    fetchPolymarket: function(market) {
      var id = encodeURIComponent(predictionMarketProviderResolutionR2String_(market.externalMarketId));
      var gamma = awardsManagerFetchJson_("https://gamma-api.polymarket.com/markets/" + id);
      var conditionId = predictionMarketProviderResolutionR2String_(gamma && (gamma.conditionId || gamma.condition_id));
      if (!conditionId) throw new Error("Polymarket conditionId is unavailable");
      var resolutions = awardsManagerFetchJson_("https://data-api.polymarket.com/v2/resolutions?condition=" + encodeURIComponent(conditionId));
      return { market: gamma, resolutions: resolutions };
    }
  });
}

function apiAdminSyncPredictionMarketProviderResolutionR2(payload) {
  payload = payload || {};
  if (typeof requireAdmin_ === "function") requireAdmin_(payload);
  return predictionMarketProviderResolutionR2ProductionService_().sync(payload.username, payload.marketId);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PREDICTION_MARKET_PROVIDER_RESOLUTION_R2: PREDICTION_MARKET_PROVIDER_RESOLUTION_R2,
    predictionMarketProviderResolutionR2MapKalshi_: predictionMarketProviderResolutionR2MapKalshi_,
    predictionMarketProviderResolutionR2MapPolymarket_: predictionMarketProviderResolutionR2MapPolymarket_,
    predictionMarketProviderResolutionR2MapWinner_: predictionMarketProviderResolutionR2MapWinner_,
    predictionMarketProviderResolutionR2CreateService: predictionMarketProviderResolutionR2CreateService
  };
}
