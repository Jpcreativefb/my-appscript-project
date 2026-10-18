/* =====================================================
   PREDICTION MARKET FOUNDATION CONTRACTS R1

   Contract-only foundation. This file intentionally does not:
   - register Prediction Market as a GamesEngine game type
   - call SportsWagerEngine / BettingEngine
   - read or write production sheets
   - contact an external provider
   - implement a player trading UI
===================================================== */

var PREDICTION_MARKET_PRODUCT_KEY = "prediction-market";

var PREDICTION_MARKET_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  LOCKED: "LOCKED",
  RESOLVED: "RESOLVED",
  VOID: "VOID"
});

var PREDICTION_MARKET_OUTCOME = Object.freeze({
  YES: "YES",
  NO: "NO"
});

var PREDICTION_MARKET_TRADE_SIDE = Object.freeze({
  BUY: "BUY",
  SELL: "SELL"
});

var PREDICTION_MARKET_TRANSACTION_STATUS = Object.freeze({
  PENDING: "PENDING",
  COMMITTED: "COMMITTED",
  REJECTED: "REJECTED"
});

var PREDICTION_MARKET_RESOLUTION_STATUS = Object.freeze({
  UNRESOLVED: "UNRESOLVED",
  RESOLVED: "RESOLVED",
  VOID: "VOID"
});

var PREDICTION_MARKET_PROVIDER_KIND = Object.freeze({
  MANUAL: "MANUAL",
  KALSHI: "KALSHI",
  POLYMARKET: "POLYMARKET",
  DIRECTOR_APPROVED: "DIRECTOR_APPROVED"
});

var PREDICTION_MARKET_ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(["OPEN", "VOID"]),
  OPEN: Object.freeze(["LOCKED", "VOID"]),
  LOCKED: Object.freeze(["RESOLVED", "VOID"]),
  RESOLVED: Object.freeze([]),
  VOID: Object.freeze([])
});

function predictionMarketString_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketNumber_(value, label) {
  var n = Number(value);
  if (!isFinite(n)) {
    throw new Error((label || "value") + " must be a finite number");
  }
  return n;
}

function predictionMarketNonNegative_(value, label) {
  var n = predictionMarketNumber_(value, label);
  if (n < 0) {
    throw new Error((label || "value") + " cannot be negative");
  }
  return n;
}

function predictionMarketPrice_(value, label) {
  var n = predictionMarketNumber_(value, label || "referencePrice");
  if (n < 0 || n > 1) {
    throw new Error((label || "referencePrice") + " must be between 0 and 1");
  }
  return n;
}

function predictionMarketRequireId_(value, label) {
  var text = predictionMarketString_(value);
  if (!text) {
    throw new Error((label || "id") + " is required");
  }
  return text;
}

function predictionMarketNormalizeStatus_(value) {
  var status = predictionMarketString_(value).toUpperCase();
  if (!PREDICTION_MARKET_ALLOWED_TRANSITIONS.hasOwnProperty(status)) {
    throw new Error("Unsupported prediction market status: " + status);
  }
  return status;
}

function predictionMarketCanTransition(fromStatus, toStatus) {
  var from = predictionMarketNormalizeStatus_(fromStatus);
  var to = predictionMarketNormalizeStatus_(toStatus);
  return PREDICTION_MARKET_ALLOWED_TRANSITIONS[from].indexOf(to) !== -1;
}

function predictionMarketAssertTransition(fromStatus, toStatus) {
  if (!predictionMarketCanTransition(fromStatus, toStatus)) {
    throw new Error(
      "Invalid prediction market transition: " +
      predictionMarketString_(fromStatus).toUpperCase() +
      " -> " +
      predictionMarketString_(toStatus).toUpperCase()
    );
  }
  return true;
}

function predictionMarketTradesPermitted(status) {
  return predictionMarketNormalizeStatus_(status) === PREDICTION_MARKET_STATUS.OPEN;
}

function predictionMarketCreateBinaryMarket(input) {
  var source = input || {};
  var status = predictionMarketNormalizeStatus_(
    source.status || PREDICTION_MARKET_STATUS.DRAFT
  );
  var yesPrice = predictionMarketPrice_(source.referenceYesPrice, "referenceYesPrice");
  var noPrice = predictionMarketPrice_(source.referenceNoPrice, "referenceNoPrice");

  if (Math.abs((yesPrice + noPrice) - 1) > 0.000001) {
    throw new Error("Binary reference YES and NO prices must sum to 1");
  }

  var resolutionStatus = predictionMarketString_(
    source.resolutionStatus || PREDICTION_MARKET_RESOLUTION_STATUS.UNRESOLVED
  ).toUpperCase();

  if (!PREDICTION_MARKET_RESOLUTION_STATUS.hasOwnProperty(resolutionStatus)) {
    throw new Error("Unsupported prediction market resolution status: " + resolutionStatus);
  }

  var winningOutcome = source.winningOutcome == null
    ? ""
    : predictionMarketString_(source.winningOutcome).toUpperCase();

  if (winningOutcome && !PREDICTION_MARKET_OUTCOME.hasOwnProperty(winningOutcome)) {
    throw new Error("winningOutcome must be YES, NO, or empty");
  }

  if (status === PREDICTION_MARKET_STATUS.RESOLVED && !winningOutcome) {
    throw new Error("RESOLVED markets require a winningOutcome");
  }

  if (status === PREDICTION_MARKET_STATUS.VOID) {
    winningOutcome = "";
    resolutionStatus = PREDICTION_MARKET_RESOLUTION_STATUS.VOID;
  }

  return {
    marketId: predictionMarketRequireId_(source.marketId, "marketId"),
    title: predictionMarketRequireId_(source.title, "title"),
    description: predictionMarketString_(source.description),
    category: predictionMarketString_(source.category),
    status: status,
    outcomes: {
      YES: predictionMarketString_(source.yesLabel || "YES") || "YES",
      NO: predictionMarketString_(source.noLabel || "NO") || "NO"
    },
    referencePrices: {
      YES: yesPrice,
      NO: noPrice,
      asOf: predictionMarketString_(source.referencePriceAsOf)
    },
    provider: predictionMarketNormalizeProviderDescriptor(source.provider || {}),
    openTime: predictionMarketString_(source.openTime),
    lockTime: predictionMarketString_(source.lockTime),
    resolutionStatus: resolutionStatus,
    winningOutcome: winningOutcome,
    voided: status === PREDICTION_MARKET_STATUS.VOID,
    createdAt: predictionMarketString_(source.createdAt),
    createdBy: predictionMarketString_(source.createdBy),
    updatedAt: predictionMarketString_(source.updatedAt),
    updatedBy: predictionMarketString_(source.updatedBy)
  };
}

function predictionMarketNormalizeProviderDescriptor(provider) {
  var source = provider || {};
  var kind = predictionMarketString_(source.kind || PREDICTION_MARKET_PROVIDER_KIND.MANUAL).toUpperCase();

  if (!PREDICTION_MARKET_PROVIDER_KIND.hasOwnProperty(kind)) {
    throw new Error("Unsupported prediction market provider kind: " + kind);
  }

  return {
    kind: kind,
    providerId: predictionMarketString_(source.providerId),
    externalMarketId: predictionMarketString_(source.externalMarketId),
    sourceUrl: predictionMarketString_(source.sourceUrl),
    metadata: source.metadata && typeof source.metadata === "object" ? source.metadata : {}
  };
}

function predictionMarketProviderContract(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("Prediction market provider is required");
  }
  if (typeof provider.getReferencePrices !== "function") {
    throw new Error("Provider must implement getReferencePrices(market)");
  }
  if (typeof provider.getResolution !== "function") {
    throw new Error("Provider must implement getResolution(market)");
  }
  return provider;
}

function predictionMarketCreateWallet(input) {
  var source = input || {};
  var available = predictionMarketNonNegative_(source.availableCredits || 0, "availableCredits");
  var reserved = predictionMarketNonNegative_(source.reservedCredits || 0, "reservedCredits");
  return {
    playerId: predictionMarketRequireId_(source.playerId, "playerId"),
    availableCredits: available,
    reservedCredits: reserved,
    totalCashCredits: available + reserved,
    version: Math.max(0, Math.floor(Number(source.version || 0)))
  };
}

function predictionMarketCreateTradeIntent(input) {
  var source = input || {};
  var side = predictionMarketString_(source.side).toUpperCase();
  var outcome = predictionMarketString_(source.outcome).toUpperCase();
  var quantity = predictionMarketNonNegative_(source.quantity, "quantity");
  var referencePrice = predictionMarketPrice_(source.referencePrice, "referencePrice");

  if (quantity <= 0) {
    throw new Error("quantity must be greater than zero");
  }
  if (!PREDICTION_MARKET_TRADE_SIDE.hasOwnProperty(side)) {
    throw new Error("side must be BUY or SELL");
  }
  if (!PREDICTION_MARKET_OUTCOME.hasOwnProperty(outcome)) {
    throw new Error("outcome must be YES or NO");
  }

  return {
    transactionId: predictionMarketRequireId_(source.transactionId, "transactionId"),
    playerId: predictionMarketRequireId_(source.playerId, "playerId"),
    marketId: predictionMarketRequireId_(source.marketId, "marketId"),
    side: side,
    outcome: outcome,
    quantity: quantity,
    referencePrice: referencePrice,
    grossCredits: quantity * referencePrice,
    requestedAt: predictionMarketString_(source.requestedAt),
    expectedWalletVersion: source.expectedWalletVersion == null
      ? null
      : Math.max(0, Math.floor(Number(source.expectedWalletVersion)))
  };
}

function predictionMarketTransactionFingerprint(intent) {
  var tx = predictionMarketCreateTradeIntent(intent);
  return [
    tx.playerId,
    tx.marketId,
    tx.side,
    tx.outcome,
    tx.quantity,
    tx.referencePrice
  ].join("|");
}

function predictionMarketResolveIdempotentTrade(existingTransaction, requestedIntent) {
  var requested = predictionMarketCreateTradeIntent(requestedIntent);
  if (!existingTransaction) {
    return { duplicate: false, transaction: null };
  }

  if (predictionMarketString_(existingTransaction.transactionId) !== requested.transactionId) {
    throw new Error("Existing transaction id does not match requested transaction id");
  }

  var existingFingerprint = predictionMarketString_(existingTransaction.fingerprint);
  var requestedFingerprint = predictionMarketTransactionFingerprint(requested);

  if (existingFingerprint && existingFingerprint !== requestedFingerprint) {
    throw new Error("Idempotency conflict: transactionId was already used for a different trade");
  }

  if (predictionMarketString_(existingTransaction.status).toUpperCase() === PREDICTION_MARKET_TRANSACTION_STATUS.COMMITTED) {
    return { duplicate: true, transaction: existingTransaction };
  }

  return { duplicate: true, transaction: existingTransaction };
}

function predictionMarketAssertBuyCapacity(wallet, intent) {
  var normalizedWallet = predictionMarketCreateWallet(wallet);
  var trade = predictionMarketCreateTradeIntent(intent);

  if (trade.side !== PREDICTION_MARKET_TRADE_SIDE.BUY) {
    return true;
  }
  if (trade.grossCredits > normalizedWallet.availableCredits) {
    throw new Error("Insufficient available prediction market credits");
  }
  if (trade.expectedWalletVersion != null && trade.expectedWalletVersion !== normalizedWallet.version) {
    throw new Error("Stale prediction market wallet version");
  }
  return true;
}

function predictionMarketCreatePosition(input) {
  var source = input || {};
  var outcome = predictionMarketString_(source.outcome).toUpperCase();
  if (!PREDICTION_MARKET_OUTCOME.hasOwnProperty(outcome)) {
    throw new Error("position outcome must be YES or NO");
  }
  var quantity = predictionMarketNonNegative_(source.quantity || 0, "quantity");
  var costBasis = predictionMarketNonNegative_(source.costBasisCredits || 0, "costBasisCredits");
  return {
    playerId: predictionMarketRequireId_(source.playerId, "playerId"),
    marketId: predictionMarketRequireId_(source.marketId, "marketId"),
    outcome: outcome,
    quantity: quantity,
    costBasisCredits: costBasis,
    averageCostCredits: quantity > 0 ? costBasis / quantity : 0,
    realizedCredits: predictionMarketNumber_(source.realizedCredits || 0, "realizedCredits"),
    settledCredits: predictionMarketNonNegative_(source.settledCredits || 0, "settledCredits")
  };
}

function predictionMarketMarkPosition(position, referencePrice) {
  var normalized = predictionMarketCreatePosition(position);
  var price = predictionMarketPrice_(referencePrice, "referencePrice");
  var marketValue = normalized.quantity * price;
  return {
    marketValueCredits: marketValue,
    unrealizedCredits: marketValue - normalized.costBasisCredits
  };
}

function predictionMarketPortfolioValue(wallet, markedPositionValues) {
  var normalizedWallet = predictionMarketCreateWallet(wallet);
  var positions = Array.isArray(markedPositionValues) ? markedPositionValues : [];
  var positionValue = positions.reduce(function(total, value) {
    return total + predictionMarketNonNegative_(value || 0, "positionValue");
  }, 0);
  var portfolioValue = normalizedWallet.availableCredits + normalizedWallet.reservedCredits + positionValue;
  return {
    availableCredits: normalizedWallet.availableCredits,
    reservedCredits: normalizedWallet.reservedCredits,
    positionValueCredits: positionValue,
    portfolioValueCredits: portfolioValue,
    leaderboardValueCredits: portfolioValue
  };
}

function predictionMarketSettlementKey(marketId, playerId) {
  return predictionMarketRequireId_(marketId, "marketId") + ":" +
    predictionMarketRequireId_(playerId, "playerId");
}

function predictionMarketSettlementValue(position, market) {
  var normalized = predictionMarketCreatePosition(position);
  if (!market || typeof market !== "object") {
    throw new Error("market is required for settlement");
  }
  var status = predictionMarketNormalizeStatus_(market.status);

  if (status === PREDICTION_MARKET_STATUS.VOID) {
    return {
      settlementKey: predictionMarketSettlementKey(normalized.marketId, normalized.playerId),
      payoutCredits: normalized.costBasisCredits,
      reason: "VOID_COST_BASIS_RETURN"
    };
  }

  if (status !== PREDICTION_MARKET_STATUS.RESOLVED) {
    throw new Error("Only RESOLVED or VOID markets may settle");
  }

  var winner = predictionMarketString_(market.winningOutcome).toUpperCase();
  if (!PREDICTION_MARKET_OUTCOME.hasOwnProperty(winner)) {
    throw new Error("Resolved market requires YES or NO winningOutcome");
  }

  return {
    settlementKey: predictionMarketSettlementKey(normalized.marketId, normalized.playerId),
    payoutCredits: normalized.outcome === winner ? normalized.quantity : 0,
    reason: normalized.outcome === winner ? "WINNING_SHARES" : "LOSING_SHARES"
  };
}

function predictionMarketResolveIdempotentSettlement(existingSettlement, requestedSettlement) {
  if (!existingSettlement) {
    return { duplicate: false, settlement: null };
  }
  if (predictionMarketString_(existingSettlement.settlementKey) !== predictionMarketString_(requestedSettlement.settlementKey)) {
    throw new Error("Settlement key mismatch");
  }
  if (Number(existingSettlement.payoutCredits) !== Number(requestedSettlement.payoutCredits)) {
    throw new Error("Idempotency conflict: settlement payload changed after first commit");
  }
  return { duplicate: true, settlement: existingSettlement };
}

function predictionMarketAtomicityContract() {
  return Object.freeze({
    transactionIdUnique: true,
    transactionIdScope: "prediction-market",
    walletVersionCompareAndSetRequired: true,
    tradeAndWalletMutationSameCriticalSection: true,
    playerMarketLockRequired: true,
    committedTransactionReplayReturnsOriginal: true,
    conflictingReplayRejected: true,
    settlementKeyUnique: true,
    settlementAndPayoutSameCriticalSection: true,
    voidReturnsOpenPositionCostBasis: true,
    negativeAvailableCreditsForbidden: true
  });
}

function predictionMarketAdminPlacementContract() {
  return Object.freeze({
    root: "Admin > Games & Design > Prediction Market",
    destinations: Object.freeze([
      "Market Builder",
      "Manage Markets",
      "Providers & Reference Prices",
      "Resolution & Settlement",
      "Operations"
    ]),
    usesOrdinaryManageGames: false,
    changesSportsNavigation: false,
    canonicalGeneralCustomType: false
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PREDICTION_MARKET_PRODUCT_KEY: PREDICTION_MARKET_PRODUCT_KEY,
    PREDICTION_MARKET_STATUS: PREDICTION_MARKET_STATUS,
    PREDICTION_MARKET_OUTCOME: PREDICTION_MARKET_OUTCOME,
    PREDICTION_MARKET_TRADE_SIDE: PREDICTION_MARKET_TRADE_SIDE,
    PREDICTION_MARKET_TRANSACTION_STATUS: PREDICTION_MARKET_TRANSACTION_STATUS,
    PREDICTION_MARKET_RESOLUTION_STATUS: PREDICTION_MARKET_RESOLUTION_STATUS,
    PREDICTION_MARKET_PROVIDER_KIND: PREDICTION_MARKET_PROVIDER_KIND,
    PREDICTION_MARKET_ALLOWED_TRANSITIONS: PREDICTION_MARKET_ALLOWED_TRANSITIONS,
    predictionMarketCanTransition: predictionMarketCanTransition,
    predictionMarketAssertTransition: predictionMarketAssertTransition,
    predictionMarketTradesPermitted: predictionMarketTradesPermitted,
    predictionMarketCreateBinaryMarket: predictionMarketCreateBinaryMarket,
    predictionMarketNormalizeProviderDescriptor: predictionMarketNormalizeProviderDescriptor,
    predictionMarketProviderContract: predictionMarketProviderContract,
    predictionMarketCreateWallet: predictionMarketCreateWallet,
    predictionMarketCreateTradeIntent: predictionMarketCreateTradeIntent,
    predictionMarketTransactionFingerprint: predictionMarketTransactionFingerprint,
    predictionMarketResolveIdempotentTrade: predictionMarketResolveIdempotentTrade,
    predictionMarketAssertBuyCapacity: predictionMarketAssertBuyCapacity,
    predictionMarketCreatePosition: predictionMarketCreatePosition,
    predictionMarketMarkPosition: predictionMarketMarkPosition,
    predictionMarketPortfolioValue: predictionMarketPortfolioValue,
    predictionMarketSettlementKey: predictionMarketSettlementKey,
    predictionMarketSettlementValue: predictionMarketSettlementValue,
    predictionMarketResolveIdempotentSettlement: predictionMarketResolveIdempotentSettlement,
    predictionMarketAtomicityContract: predictionMarketAtomicityContract,
    predictionMarketAdminPlacementContract: predictionMarketAdminPlacementContract
  };
}
