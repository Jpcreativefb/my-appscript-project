/* =====================================================
   PREDICTION MARKET MULTI-OUTCOME CORE R2

   Logical grouping only. Each outcome remains an ordinary Prediction Market
   R2 binary child contract and all trading/settlement authority stays in the
   accepted R2 engine.
===================================================== */

var PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE = "pattcMultiOutcomeR2";
var PREDICTION_MARKET_MULTI_OUTCOME_R2_METADATA_VERSION = 1;
var PREDICTION_MARKET_MULTI_OUTCOME_R2_MARKET_TYPE = "MULTI_OUTCOME";

function predictionMarketMultiOutcomeR2String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketMultiOutcomeR2Clone_(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function predictionMarketMultiOutcomeR2Object_(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function predictionMarketMultiOutcomeR2Require_(value, label) {
  var text = predictionMarketMultiOutcomeR2String_(value);
  if (!text) throw new Error((label || "value") + " is required");
  return text;
}

function predictionMarketMultiOutcomeR2Id_(prefix) {
  if (typeof Utilities !== "undefined" && Utilities && typeof Utilities.getUuid === "function") {
    return prefix + "-" + Utilities.getUuid();
  }
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000000000);
}

function predictionMarketMultiOutcomeR2BuildMetadata_(input) {
  input = input || {};
  var logicalMarketId = predictionMarketMultiOutcomeR2Require_(input.logicalMarketId || input.groupMarketId, "logicalMarketId");
  var groupMarketId = predictionMarketMultiOutcomeR2Require_(input.groupMarketId || logicalMarketId, "groupMarketId");
  var logicalTitle = predictionMarketMultiOutcomeR2Require_(input.logicalTitle || input.logicalQuestion, "logicalTitle");
  var logicalQuestion = predictionMarketMultiOutcomeR2Require_(input.logicalQuestion || logicalTitle, "logicalQuestion");
  var outcomeId = predictionMarketMultiOutcomeR2Require_(input.outcomeId, "outcomeId");
  var outcomeLabel = predictionMarketMultiOutcomeR2Require_(input.outcomeLabel, "outcomeLabel");
  var outcomeOrder = Number(input.outcomeOrder);
  if (!isFinite(outcomeOrder) || outcomeOrder < 0 || Math.floor(outcomeOrder) !== outcomeOrder) {
    throw new Error("outcomeOrder must be a non-negative integer");
  }
  return {
    metadataVersion: PREDICTION_MARKET_MULTI_OUTCOME_R2_METADATA_VERSION,
    marketType: PREDICTION_MARKET_MULTI_OUTCOME_R2_MARKET_TYPE,
    logicalMarketId: logicalMarketId,
    groupMarketId: groupMarketId,
    logicalTitle: logicalTitle,
    logicalQuestion: logicalQuestion,
    outcomeId: outcomeId,
    outcomeLabel: outcomeLabel,
    outcomeOrder: outcomeOrder
  };
}

function predictionMarketMultiOutcomeR2GetMetadata_(marketOrMetadata) {
  var source = predictionMarketMultiOutcomeR2Object_(marketOrMetadata);
  var providerMetadata = source.providerMetadata && typeof source.providerMetadata === "object"
    ? source.providerMetadata
    : source;
  var metadata = predictionMarketMultiOutcomeR2Object_(providerMetadata[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE]);
  if (!metadata.metadataVersion || metadata.marketType !== PREDICTION_MARKET_MULTI_OUTCOME_R2_MARKET_TYPE) return null;
  return predictionMarketMultiOutcomeR2Clone_(metadata);
}

function predictionMarketMultiOutcomeR2MergeProviderMetadata_(currentMetadata, incomingMetadata, groupMetadata) {
  var current = predictionMarketMultiOutcomeR2Clone_(predictionMarketMultiOutcomeR2Object_(currentMetadata));
  var incoming = predictionMarketMultiOutcomeR2Clone_(predictionMarketMultiOutcomeR2Object_(incomingMetadata));
  var preservedGroup = current[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE]
    ? predictionMarketMultiOutcomeR2Clone_(current[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE])
    : null;
  delete incoming[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE];
  var merged = Object.assign({}, current, incoming);
  if (groupMetadata) {
    merged[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE] = predictionMarketMultiOutcomeR2BuildMetadata_(groupMetadata);
  } else if (preservedGroup) {
    merged[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE] = preservedGroup;
  }
  return merged;
}

function predictionMarketMultiOutcomeR2Probability_(value, label) {
  var n = Number(value);
  if (!isFinite(n) || n < 0 || n > 1) throw new Error((label || "reference probability") + " must be between 0 and 1");
  return Math.round(n * 1000000) / 1000000;
}

function predictionMarketMultiOutcomeR2CreateCoordinator(options) {
  options = options || {};
  var engine = options.engine;
  var idFactory = typeof options.idFactory === "function" ? options.idFactory : predictionMarketMultiOutcomeR2Id_;
  if (!engine) throw new Error("Prediction Market R2 engine is required");

  function groupMarkets_(groupId) {
    groupId = predictionMarketMultiOutcomeR2Require_(groupId, "logicalMarketId");
    return (engine.getMarkets() || []).filter(function(market) {
      var metadata = predictionMarketMultiOutcomeR2GetMetadata_(market);
      return metadata && (metadata.logicalMarketId === groupId || metadata.groupMarketId === groupId);
    }).sort(function(a, b) {
      return predictionMarketMultiOutcomeR2GetMetadata_(a).outcomeOrder - predictionMarketMultiOutcomeR2GetMetadata_(b).outcomeOrder;
    });
  }

  function createDraftGroup(context, input) {
    input = input || {};
    var logicalQuestion = predictionMarketMultiOutcomeR2Require_(input.logicalQuestion || input.logicalTitle || input.title, "logicalQuestion");
    var logicalTitle = predictionMarketMultiOutcomeR2Require_(input.logicalTitle || input.title || logicalQuestion, "logicalTitle");
    var logicalMarketId = predictionMarketMultiOutcomeR2String_(input.logicalMarketId || input.groupMarketId) || idFactory("pmg");
    var groupMarketId = predictionMarketMultiOutcomeR2String_(input.groupMarketId) || logicalMarketId;
    var outcomes = Array.isArray(input.outcomes) ? input.outcomes.slice() : [];
    if (outcomes.length < 2) throw new Error("MULTI_OUTCOME markets require at least two outcomes");

    var prepared = outcomes.map(function(rawOutcome, index) {
      var outcome = typeof rawOutcome === "string" ? { outcomeLabel: rawOutcome } : predictionMarketMultiOutcomeR2Object_(rawOutcome);
      var outcomeLabel = predictionMarketMultiOutcomeR2Require_(outcome.outcomeLabel || outcome.label || outcome.title, "outcomeLabel");
      var outcomeId = predictionMarketMultiOutcomeR2String_(outcome.outcomeId || outcome.id) || idFactory("outcome");
      var marketId = predictionMarketMultiOutcomeR2String_(outcome.marketId) || idFactory("pm");
      var yesPrice = predictionMarketMultiOutcomeR2Probability_(
        outcome.referenceYesPrice != null ? outcome.referenceYesPrice : outcome.referenceProbability,
        "reference probability"
      );
      var noPrice = outcome.referenceNoPrice == null
        ? Math.round((1 - yesPrice) * 1000000) / 1000000
        : predictionMarketMultiOutcomeR2Probability_(outcome.referenceNoPrice, "referenceNoPrice");
      if (Math.abs((yesPrice + noPrice) - 1) > 0.000001) throw new Error("Outcome reference YES and NO prices must sum to 1");
      return {
        marketId: marketId,
        outcomeId: outcomeId,
        outcomeLabel: outcomeLabel,
        outcomeOrder: index,
        referenceYesPrice: yesPrice,
        referenceNoPrice: noPrice,
        source: outcome
      };
    });

    var marketIds = {};
    var outcomeIds = {};
    prepared.forEach(function(outcome) {
      if (marketIds[outcome.marketId]) throw new Error("Multi-outcome child MarketIds must be distinct");
      if (outcomeIds[outcome.outcomeId]) throw new Error("Multi-outcome outcomeIds must be distinct");
      marketIds[outcome.marketId] = true;
      outcomeIds[outcome.outcomeId] = true;
    });

    var children = prepared.map(function(preparedOutcome) {
      var outcome = preparedOutcome.source;
      var groupMetadata = predictionMarketMultiOutcomeR2BuildMetadata_({
        logicalMarketId: logicalMarketId,
        groupMarketId: groupMarketId,
        logicalTitle: logicalTitle,
        logicalQuestion: logicalQuestion,
        outcomeId: preparedOutcome.outcomeId,
        outcomeLabel: preparedOutcome.outcomeLabel,
        outcomeOrder: preparedOutcome.outcomeOrder
      });
      var providerMetadata = predictionMarketMultiOutcomeR2MergeProviderMetadata_(
        predictionMarketMultiOutcomeR2Object_(input.providerMetadata),
        predictionMarketMultiOutcomeR2Object_(outcome.providerMetadata),
        groupMetadata
      );
      return engine.createMarket(context, {
        marketId: preparedOutcome.marketId,
        title: logicalTitle + " — " + preparedOutcome.outcomeLabel,
        description: predictionMarketMultiOutcomeR2String_(outcome.description || input.description),
        category: predictionMarketMultiOutcomeR2String_(outcome.category || input.category),
        yesLabel: preparedOutcome.outcomeLabel,
        noLabel: predictionMarketMultiOutcomeR2String_(outcome.noLabel) || "Does not win",
        referenceYesPrice: preparedOutcome.referenceYesPrice,
        referenceNoPrice: preparedOutcome.referenceNoPrice,
        referencePriceAsOf: outcome.referencePriceAsOf || input.referencePriceAsOf,
        referencePriceTrusted: outcome.referencePriceTrusted == null ? input.referencePriceTrusted !== false : outcome.referencePriceTrusted !== false,
        providerKind: outcome.providerKind || input.providerKind || "MANUAL",
        providerId: outcome.providerId || input.providerId,
        externalMarketId: outcome.externalMarketId || "",
        sourceUrl: outcome.sourceUrl || input.sourceUrl,
        providerMetadata: providerMetadata,
        openTime: "",
        lockTime: outcome.lockTime || input.lockTime
      });
    });

    return {
      marketType: PREDICTION_MARKET_MULTI_OUTCOME_R2_MARKET_TYPE,
      logicalMarketId: logicalMarketId,
      groupMarketId: groupMarketId,
      logicalTitle: logicalTitle,
      logicalQuestion: logicalQuestion,
      status: "DRAFT",
      children: children
    };
  }

  function resolveGroup(context, groupId, winningOutcomeId) {
    winningOutcomeId = predictionMarketMultiOutcomeR2Require_(winningOutcomeId, "winningOutcomeId");
    var children = groupMarkets_(groupId);
    if (children.length < 2) throw new Error("Prediction Market multi-outcome group not found");
    var winnerFound = children.some(function(market) {
      return predictionMarketMultiOutcomeR2GetMetadata_(market).outcomeId === winningOutcomeId;
    });
    if (!winnerFound) throw new Error("winningOutcomeId is not part of this multi-outcome group");

    var resolved = children.map(function(market) {
      var metadata = predictionMarketMultiOutcomeR2GetMetadata_(market);
      var wanted = metadata.outcomeId === winningOutcomeId ? "YES" : "NO";
      var status = predictionMarketMultiOutcomeR2String_(market.status).toUpperCase();
      if (status === "RESOLVED") {
        if (predictionMarketMultiOutcomeR2String_(market.winningOutcome).toUpperCase() !== wanted) {
          throw new Error("Multi-outcome group is already resolved with a conflicting result");
        }
        return market;
      }
      if (status === "VOID") throw new Error("Cannot resolve a VOID multi-outcome child market");
      if (status !== "LOCKED") throw new Error("All multi-outcome child markets must be LOCKED before resolution");
      return engine.resolveMarket(context, market.marketId, wanted);
    });
    return {
      logicalMarketId: predictionMarketMultiOutcomeR2GetMetadata_(resolved[0]).logicalMarketId,
      winningOutcomeId: winningOutcomeId,
      status: "RESOLVED",
      children: resolved
    };
  }

  function voidGroup(context, groupId) {
    var children = groupMarkets_(groupId);
    if (children.length < 2) throw new Error("Prediction Market multi-outcome group not found");
    var voided = children.map(function(market) {
      var status = predictionMarketMultiOutcomeR2String_(market.status).toUpperCase();
      if (status === "VOID") return market;
      if (status === "RESOLVED") throw new Error("Cannot VOID a resolved multi-outcome child market");
      return engine.voidMarket(context, market.marketId);
    });
    return {
      logicalMarketId: predictionMarketMultiOutcomeR2GetMetadata_(voided[0]).logicalMarketId,
      status: "VOID",
      children: voided
    };
  }

  return {
    createDraftGroup: createDraftGroup,
    getGroup: groupMarkets_,
    resolveGroup: resolveGroup,
    voidGroup: voidGroup
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE: PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE,
    PREDICTION_MARKET_MULTI_OUTCOME_R2_METADATA_VERSION: PREDICTION_MARKET_MULTI_OUTCOME_R2_METADATA_VERSION,
    PREDICTION_MARKET_MULTI_OUTCOME_R2_MARKET_TYPE: PREDICTION_MARKET_MULTI_OUTCOME_R2_MARKET_TYPE,
    predictionMarketMultiOutcomeR2BuildMetadata_: predictionMarketMultiOutcomeR2BuildMetadata_,
    predictionMarketMultiOutcomeR2GetMetadata_: predictionMarketMultiOutcomeR2GetMetadata_,
    predictionMarketMultiOutcomeR2MergeProviderMetadata_: predictionMarketMultiOutcomeR2MergeProviderMetadata_,
    predictionMarketMultiOutcomeR2CreateCoordinator: predictionMarketMultiOutcomeR2CreateCoordinator
  };
}
