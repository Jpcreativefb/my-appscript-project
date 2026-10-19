/* =====================================================
   PREDICTION MARKET ENGINE R2

   Isolated execution/persistence layer behind the accepted R1 contracts.
   This file intentionally does not register a GamesEngine type, modify
   BettingEngine/SportsWagerEngine, call external providers, or wire player UI.
===================================================== */

var PREDICTION_MARKET_R2_CONFIG = Object.freeze({
  defaultBootstrapCredits: 1000,
  maxReferencePriceAgeMs: 15 * 60 * 1000,
  lockTimeoutMs: 5000
});

var PREDICTION_MARKET_R2_SHEETS = Object.freeze({
  markets: "PredictionMarketMarkets",
  wallets: "PredictionMarketWallets",
  transactions: "PredictionMarketTransactions",
  positions: "PredictionMarketPositions",
  settlements: "PredictionMarketSettlements"
});

var PREDICTION_MARKET_R2_HEADERS = Object.freeze({
  markets: Object.freeze([
    "MarketId", "Title", "Description", "Category", "Status",
    "YesLabel", "NoLabel", "ReferenceYesPrice", "ReferenceNoPrice",
    "ReferencePriceAsOf", "ReferencePriceTrusted", "ProviderKind",
    "ProviderId", "ExternalMarketId", "SourceUrl", "ProviderMetadataJson",
    "OpenTime", "LockTime", "ResolutionStatus", "WinningOutcome", "Voided",
    "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy"
  ]),
  wallets: Object.freeze([
    "PlayerId", "AvailableCredits", "ReservedCredits", "Version",
    "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy"
  ]),
  transactions: Object.freeze([
    "TransactionId", "Fingerprint", "PlayerId", "MarketId", "Side", "Outcome",
    "Quantity", "ExecutionReferencePrice", "GrossCredits", "Status",
    "WalletVersionBefore", "WalletVersionAfter", "RequestedAt", "CommittedAt",
    "CommittedResultJson"
  ]),
  positions: Object.freeze([
    "PlayerId", "MarketId", "Outcome", "Quantity", "CostBasisCredits",
    "AverageCostCredits", "RealizedCredits", "SettledCredits",
    "SettledCostBasisCredits", "Settled", "CreatedAt", "UpdatedAt"
  ]),
  settlements: Object.freeze([
    "SettlementKey", "MarketId", "PlayerId", "MarketStatus", "WinningOutcome",
    "PayoutCredits", "ReturnedCostBasisCredits", "WalletVersionBefore",
    "WalletVersionAfter", "PositionResultsJson", "Status", "CommittedAt",
    "CommittedResultJson"
  ])
});

function predictionMarketR2String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketR2RequireId_(value, label) {
  var text = predictionMarketR2String_(value);
  if (!text) throw new Error((label || "id") + " is required");
  return text;
}

function predictionMarketR2Number_(value, label) {
  var n = Number(value);
  if (!isFinite(n)) throw new Error((label || "value") + " must be a finite number");
  return n;
}

function predictionMarketR2NonNegative_(value, label) {
  var n = predictionMarketR2Number_(value, label);
  if (n < 0) throw new Error((label || "value") + " cannot be negative");
  return n;
}

function predictionMarketR2Price_(value, label) {
  var n = predictionMarketR2Number_(value, label || "price");
  if (n < 0 || n > 1) throw new Error((label || "price") + " must be between 0 and 1");
  return n;
}

function predictionMarketR2Round_(value) {
  return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function predictionMarketR2Iso_(value) {
  if (value instanceof Date) return value.toISOString();
  var text = predictionMarketR2String_(value);
  if (!text) return "";
  var d = new Date(text);
  if (isNaN(d.getTime())) throw new Error("Invalid date/time: " + text);
  return d.toISOString();
}

function predictionMarketR2Millis_(value, label) {
  var text = predictionMarketR2String_(value);
  if (!text) throw new Error((label || "timestamp") + " is required");
  var ms = new Date(text).getTime();
  if (!isFinite(ms)) throw new Error((label || "timestamp") + " is invalid");
  return ms;
}

function predictionMarketR2Clone_(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function predictionMarketR2StableJson_(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(predictionMarketR2StableJson_).join(",") + "]";
  return "{" + Object.keys(value).sort().map(function(key) {
    return JSON.stringify(key) + ":" + predictionMarketR2StableJson_(value[key]);
  }).join(",") + "}";
}

function predictionMarketR2Outcome_(value) {
  var outcome = predictionMarketR2String_(value).toUpperCase();
  if (outcome !== "YES" && outcome !== "NO") throw new Error("outcome must be YES or NO");
  return outcome;
}

function predictionMarketR2Side_(value) {
  var side = predictionMarketR2String_(value).toUpperCase();
  if (side !== "BUY" && side !== "SELL") throw new Error("side must be BUY or SELL");
  return side;
}

function predictionMarketR2Status_(value) {
  var status = predictionMarketR2String_(value).toUpperCase();
  if (["DRAFT", "OPEN", "LOCKED", "RESOLVED", "VOID"].indexOf(status) === -1) {
    throw new Error("Unsupported prediction market status: " + status);
  }
  return status;
}

function predictionMarketR2PositionKey_(playerId, marketId, outcome) {
  return predictionMarketR2RequireId_(playerId, "playerId") + "|" +
    predictionMarketR2RequireId_(marketId, "marketId") + "|" + predictionMarketR2Outcome_(outcome);
}

function predictionMarketR2SettlementKey_(marketId, playerId) {
  return predictionMarketR2RequireId_(marketId, "marketId") + ":" +
    predictionMarketR2RequireId_(playerId, "playerId");
}

function predictionMarketR2Fingerprint_(request) {
  return predictionMarketR2StableJson_({
    playerId: predictionMarketR2RequireId_(request.playerId, "playerId"),
    marketId: predictionMarketR2RequireId_(request.marketId, "marketId"),
    side: predictionMarketR2Side_(request.side),
    outcome: predictionMarketR2Outcome_(request.outcome),
    quantity: predictionMarketR2NonNegative_(request.quantity, "quantity"),
    proposedReferencePrice: request.referencePrice == null ? null : predictionMarketR2Price_(request.referencePrice, "referencePrice"),
    expectedWalletVersion: request.expectedWalletVersion == null ? null : Number(request.expectedWalletVersion)
  });
}

function predictionMarketR2DefaultAuthorizer_() {
  return {
    assertPlayer: function(context, playerId) {
      var ctx = context || {};
      var role = predictionMarketR2String_(ctx.role).toUpperCase();
      if (role === "ADMIN" || role === "SYSTEM") return true;
      if (predictionMarketR2String_(ctx.playerId) !== predictionMarketR2String_(playerId)) {
        throw new Error("Prediction Market player authorization failed");
      }
      return true;
    },
    assertAdmin: function(context) {
      var role = predictionMarketR2String_((context || {}).role).toUpperCase();
      if (role !== "ADMIN" && role !== "SYSTEM") {
        throw new Error("Prediction Market Admin/system authorization required");
      }
      return true;
    }
  };
}

function predictionMarketR2NormalizeWallet_(wallet) {
  if (!wallet) return null;
  return {
    playerId: predictionMarketR2RequireId_(wallet.playerId, "playerId"),
    availableCredits: predictionMarketR2NonNegative_(wallet.availableCredits, "availableCredits"),
    reservedCredits: predictionMarketR2NonNegative_(wallet.reservedCredits || 0, "reservedCredits"),
    version: Math.max(0, Math.floor(Number(wallet.version || 0))),
    createdAt: predictionMarketR2String_(wallet.createdAt),
    createdBy: predictionMarketR2String_(wallet.createdBy),
    updatedAt: predictionMarketR2String_(wallet.updatedAt),
    updatedBy: predictionMarketR2String_(wallet.updatedBy)
  };
}

function predictionMarketR2NormalizePosition_(position) {
  if (!position) return null;
  var quantity = predictionMarketR2NonNegative_(position.quantity || 0, "quantity");
  var costBasis = predictionMarketR2NonNegative_(position.costBasisCredits || 0, "costBasisCredits");
  return {
    playerId: predictionMarketR2RequireId_(position.playerId, "playerId"),
    marketId: predictionMarketR2RequireId_(position.marketId, "marketId"),
    outcome: predictionMarketR2Outcome_(position.outcome),
    quantity: quantity,
    costBasisCredits: costBasis,
    averageCostCredits: quantity > 0 ? predictionMarketR2Round_(costBasis / quantity) : 0,
    realizedCredits: predictionMarketR2Number_(position.realizedCredits || 0, "realizedCredits"),
    settledCredits: predictionMarketR2NonNegative_(position.settledCredits || 0, "settledCredits"),
    settledCostBasisCredits: predictionMarketR2NonNegative_(position.settledCostBasisCredits || 0, "settledCostBasisCredits"),
    settled: position.settled === true,
    createdAt: predictionMarketR2String_(position.createdAt),
    updatedAt: predictionMarketR2String_(position.updatedAt)
  };
}

function predictionMarketR2NormalizeMarket_(market) {
  if (!market) return null;
  var yes = predictionMarketR2Price_(market.referenceYesPrice, "referenceYesPrice");
  var no = predictionMarketR2Price_(market.referenceNoPrice, "referenceNoPrice");
  if (Math.abs((yes + no) - 1) > 0.000001) throw new Error("Binary reference YES and NO prices must sum to 1");
  var status = predictionMarketR2Status_(market.status || "DRAFT");
  var winner = predictionMarketR2String_(market.winningOutcome).toUpperCase();
  if (winner && winner !== "YES" && winner !== "NO") throw new Error("winningOutcome must be YES, NO, or empty");
  if (status === "RESOLVED" && !winner) throw new Error("RESOLVED markets require a winningOutcome");
  if (status === "VOID") winner = "";
  return {
    marketId: predictionMarketR2RequireId_(market.marketId, "marketId"),
    title: predictionMarketR2RequireId_(market.title, "title"),
    description: predictionMarketR2String_(market.description),
    category: predictionMarketR2String_(market.category),
    status: status,
    yesLabel: predictionMarketR2String_(market.yesLabel || "YES") || "YES",
    noLabel: predictionMarketR2String_(market.noLabel || "NO") || "NO",
    referenceYesPrice: yes,
    referenceNoPrice: no,
    referencePriceAsOf: predictionMarketR2String_(market.referencePriceAsOf),
    referencePriceTrusted: market.referencePriceTrusted === true,
    providerKind: predictionMarketR2String_(market.providerKind || "MANUAL").toUpperCase(),
    providerId: predictionMarketR2String_(market.providerId),
    externalMarketId: predictionMarketR2String_(market.externalMarketId),
    sourceUrl: predictionMarketR2String_(market.sourceUrl),
    providerMetadata: market.providerMetadata && typeof market.providerMetadata === "object" ? market.providerMetadata : {},
    openTime: predictionMarketR2String_(market.openTime),
    lockTime: predictionMarketR2String_(market.lockTime),
    resolutionStatus: status === "RESOLVED" ? "RESOLVED" : (status === "VOID" ? "VOID" : "UNRESOLVED"),
    winningOutcome: winner,
    voided: status === "VOID",
    createdAt: predictionMarketR2String_(market.createdAt),
    createdBy: predictionMarketR2String_(market.createdBy),
    updatedAt: predictionMarketR2String_(market.updatedAt),
    updatedBy: predictionMarketR2String_(market.updatedBy)
  };
}

function predictionMarketR2CreateMemoryRepository(seed) {
  var stores = { markets: {}, wallets: {}, transactions: {}, positions: {}, settlements: {} };
  var source = seed || {};
  (source.markets || []).forEach(function(row) { stores.markets[row.marketId] = predictionMarketR2Clone_(row); });
  (source.wallets || []).forEach(function(row) { stores.wallets[row.playerId] = predictionMarketR2Clone_(row); });
  (source.transactions || []).forEach(function(row) { stores.transactions[row.transactionId] = predictionMarketR2Clone_(row); });
  (source.positions || []).forEach(function(row) { stores.positions[predictionMarketR2PositionKey_(row.playerId, row.marketId, row.outcome)] = predictionMarketR2Clone_(row); });
  (source.settlements || []).forEach(function(row) { stores.settlements[row.settlementKey] = predictionMarketR2Clone_(row); });
  function snap() { return predictionMarketR2Clone_(stores); }
  function restore(snapshot) { stores = predictionMarketR2Clone_(snapshot); }
  return {
    kind: "MEMORY",
    setup: function() { return { created: false, kind: "MEMORY" }; },
    criticalSection: function(fn) { return fn(); },
    getMarket: function(id) { return predictionMarketR2Clone_(stores.markets[id] || null); },
    listMarkets: function() { return Object.keys(stores.markets).map(function(k) { return predictionMarketR2Clone_(stores.markets[k]); }); },
    saveMarket: function(row) { stores.markets[row.marketId] = predictionMarketR2Clone_(row); return predictionMarketR2Clone_(row); },
    getWallet: function(id) { return predictionMarketR2Clone_(stores.wallets[id] || null); },
    listWallets: function() { return Object.keys(stores.wallets).map(function(k) { return predictionMarketR2Clone_(stores.wallets[k]); }); },
    saveWallet: function(row) { stores.wallets[row.playerId] = predictionMarketR2Clone_(row); return predictionMarketR2Clone_(row); },
    getTransaction: function(id) { return predictionMarketR2Clone_(stores.transactions[id] || null); },
    saveTransaction: function(row) {
      var old = stores.transactions[row.transactionId];
      if (old && predictionMarketR2String_(old.fingerprint) !== predictionMarketR2String_(row.fingerprint)) throw new Error("transactionId already exists with another fingerprint");
      stores.transactions[row.transactionId] = predictionMarketR2Clone_(row);
      return predictionMarketR2Clone_(row);
    },
    listTransactions: function() { return Object.keys(stores.transactions).map(function(k) { return predictionMarketR2Clone_(stores.transactions[k]); }); },
    getPosition: function(playerId, marketId, outcome) { return predictionMarketR2Clone_(stores.positions[predictionMarketR2PositionKey_(playerId, marketId, outcome)] || null); },
    listPositions: function() { return Object.keys(stores.positions).map(function(k) { return predictionMarketR2Clone_(stores.positions[k]); }); },
    listPositionsByPlayer: function(playerId) { return Object.keys(stores.positions).map(function(k) { return stores.positions[k]; }).filter(function(p) { return p.playerId === playerId; }).map(predictionMarketR2Clone_); },
    listPositionsByPlayerMarket: function(playerId, marketId) { return Object.keys(stores.positions).map(function(k) { return stores.positions[k]; }).filter(function(p) { return p.playerId === playerId && p.marketId === marketId; }).map(predictionMarketR2Clone_); },
    savePosition: function(row) { stores.positions[predictionMarketR2PositionKey_(row.playerId, row.marketId, row.outcome)] = predictionMarketR2Clone_(row); return predictionMarketR2Clone_(row); },
    getSettlement: function(key) { return predictionMarketR2Clone_(stores.settlements[key] || null); },
    saveSettlement: function(row) { stores.settlements[row.settlementKey] = predictionMarketR2Clone_(row); return predictionMarketR2Clone_(row); },
    recoverPendingTrade: function(row) {
      if (!row || !row.committedResult) throw new Error("Pending transaction cannot be recovered");
      var result = row.committedResult;
      stores.wallets[result.wallet.playerId] = predictionMarketR2Clone_(result.wallet);
      stores.positions[predictionMarketR2PositionKey_(result.position.playerId,result.position.marketId,result.position.outcome)] = predictionMarketR2Clone_(result.position);
      row.status = "COMMITTED"; stores.transactions[row.transactionId] = predictionMarketR2Clone_(row); return predictionMarketR2Clone_(row);
    },
    recoverPendingSettlement: function(row) {
      if (!row || !row.committedResult) throw new Error("Pending settlement cannot be recovered");
      var result = row.committedResult;
      stores.wallets[result.wallet.playerId] = predictionMarketR2Clone_(result.wallet);
      (result.positions || []).forEach(function(p){stores.positions[predictionMarketR2PositionKey_(p.playerId,p.marketId,p.outcome)] = predictionMarketR2Clone_(p);});
      row.status = "COMMITTED"; stores.settlements[row.settlementKey] = predictionMarketR2Clone_(row); return predictionMarketR2Clone_(row);
    },
    commitTrade: function(payload) {
      var before = snap();
      try {
        if (stores.transactions[payload.transaction.transactionId]) throw new Error("transactionId already exists");
        stores.wallets[payload.wallet.playerId] = predictionMarketR2Clone_(payload.wallet);
        stores.positions[predictionMarketR2PositionKey_(payload.position.playerId, payload.position.marketId, payload.position.outcome)] = predictionMarketR2Clone_(payload.position);
        stores.transactions[payload.transaction.transactionId] = predictionMarketR2Clone_(payload.transaction);
        return predictionMarketR2Clone_(payload.transaction);
      } catch (err) { restore(before); throw err; }
    },
    commitSettlement: function(payload) {
      var before = snap();
      try {
        if (stores.settlements[payload.settlement.settlementKey]) throw new Error("settlement already exists");
        stores.wallets[payload.wallet.playerId] = predictionMarketR2Clone_(payload.wallet);
        payload.positions.forEach(function(position) {
          stores.positions[predictionMarketR2PositionKey_(position.playerId, position.marketId, position.outcome)] = predictionMarketR2Clone_(position);
        });
        stores.settlements[payload.settlement.settlementKey] = predictionMarketR2Clone_(payload.settlement);
        return predictionMarketR2Clone_(payload.settlement);
      } catch (err) { restore(before); throw err; }
    },
    dump: function() { return snap(); }
  };
}

function predictionMarketR2CreateManualProvider() {
  return {
    kind: "MANUAL",
    getReferencePrices: function(market) {
      return {
        YES: predictionMarketR2Price_(market.referenceYesPrice, "referenceYesPrice"),
        NO: predictionMarketR2Price_(market.referenceNoPrice, "referenceNoPrice"),
        asOf: predictionMarketR2String_(market.referencePriceAsOf),
        trusted: market.referencePriceTrusted === true
      };
    },
    getResolution: function(market) {
      return {
        status: predictionMarketR2String_(market.resolutionStatus || "UNRESOLVED").toUpperCase(),
        winningOutcome: predictionMarketR2String_(market.winningOutcome).toUpperCase()
      };
    }
  };
}

function predictionMarketR2CreateEngine(options) {
  var opts = options || {};
  var repository = opts.repository || predictionMarketR2CreateMemoryRepository();
  var authorizer = opts.authorizer || predictionMarketR2DefaultAuthorizer_();
  var providers = opts.providers || { MANUAL: predictionMarketR2CreateManualProvider() };
  var bootstrapCredits = opts.bootstrapCredits == null ? PREDICTION_MARKET_R2_CONFIG.defaultBootstrapCredits : predictionMarketR2NonNegative_(opts.bootstrapCredits, "bootstrapCredits");
  var maxAgeMs = opts.maxReferencePriceAgeMs == null ? PREDICTION_MARKET_R2_CONFIG.maxReferencePriceAgeMs : predictionMarketR2NonNegative_(opts.maxReferencePriceAgeMs, "maxReferencePriceAgeMs");
  var nowFn = typeof opts.now === "function" ? opts.now : function() { return new Date(); };
  var displayNameResolver = typeof opts.displayNameResolver === "function" ? opts.displayNameResolver : function(playerId) { return playerId; };
  function nowIso() { return predictionMarketR2Iso_(nowFn()); }
  function assertAdmin(context) { return authorizer.assertAdmin(context || {}); }
  function assertPlayer(context, playerId) { return authorizer.assertPlayer(context || {}, playerId); }
  function validatePriceState(market, nowValue) {
    var provider = providers[predictionMarketR2String_(market.providerKind).toUpperCase()];
    if (!provider || typeof provider.getReferencePrices !== "function") throw new Error("Prediction Market price provider is unavailable");
    var snapshot = provider.getReferencePrices(market);
    var yes = predictionMarketR2Price_(snapshot.YES, "referenceYesPrice");
    var no = predictionMarketR2Price_(snapshot.NO, "referenceNoPrice");
    if (Math.abs((yes + no) - 1) > 0.000001) throw new Error("Binary reference YES and NO prices must sum to 1");
    if (snapshot.trusted !== true) throw new Error("Prediction Market reference price is not trusted");
    var age = predictionMarketR2Millis_(nowValue || nowIso(), "now") - predictionMarketR2Millis_(snapshot.asOf, "referencePriceAsOf");
    if (age < 0) age = 0;
    if (age > maxAgeMs) throw new Error("Prediction Market reference price is stale");
    return { YES: yes, NO: no, asOf: predictionMarketR2Iso_(snapshot.asOf), trusted: true, ageMs: age };
  }
  function validateOpenMarketConfig(market) {
    predictionMarketR2RequireId_(market.marketId, "marketId");
    predictionMarketR2RequireId_(market.title, "title");
    if (!market.lockTime) throw new Error("lockTime is required before opening a market");
    if (predictionMarketR2Millis_(market.lockTime, "lockTime") <= predictionMarketR2Millis_(nowIso(), "now")) throw new Error("lockTime must be in the future when opening a market");
    validatePriceState(market, nowIso());
    return true;
  }
  function setup(context) { assertAdmin(context); return repository.setup(); }
  function createMarket(context, input) {
    assertAdmin(context);
    var now = nowIso();
    var market = predictionMarketR2NormalizeMarket_(Object.assign({}, input || {}, {
      status: "DRAFT",
      providerKind: predictionMarketR2String_((input || {}).providerKind || "MANUAL").toUpperCase(),
      referencePriceTrusted: (input || {}).referencePriceTrusted === true,
      createdAt: now,
      createdBy: predictionMarketR2String_((context || {}).playerId || (context || {}).username || "SYSTEM"),
      updatedAt: now,
      updatedBy: predictionMarketR2String_((context || {}).playerId || (context || {}).username || "SYSTEM")
    }));
    return repository.criticalSection(function() {
      if (repository.getMarket(market.marketId)) throw new Error("Prediction Market marketId already exists");
      return repository.saveMarket(market);
    });
  }
  function editDraftMarket(context, marketId, patch) {
    assertAdmin(context);
    return repository.criticalSection(function() {
      var existing = repository.getMarket(marketId);
      if (!existing) throw new Error("Prediction Market not found");
      if (predictionMarketR2Status_(existing.status) !== "DRAFT") throw new Error("Only DRAFT markets may be edited");
      var merged = Object.assign({}, existing, patch || {}, {
        marketId: existing.marketId,
        status: "DRAFT",
        updatedAt: nowIso(),
        updatedBy: predictionMarketR2String_((context || {}).playerId || (context || {}).username || "SYSTEM")
      });
      return repository.saveMarket(predictionMarketR2NormalizeMarket_(merged));
    });
  }
  function setReferencePrice(context, marketId, snapshot) {
    assertAdmin(context);
    snapshot = snapshot || {};
    return repository.criticalSection(function() {
      var market = repository.getMarket(marketId);
      if (!market) throw new Error("Prediction Market not found");
      var status = predictionMarketR2Status_(market.status);
      if (status === "RESOLVED" || status === "VOID") throw new Error("Cannot price a terminal Prediction Market");
      var yes = predictionMarketR2Price_(snapshot.referenceYesPrice, "referenceYesPrice");
      var no = predictionMarketR2Price_(snapshot.referenceNoPrice, "referenceNoPrice");
      if (Math.abs((yes + no) - 1) > 0.000001) throw new Error("Binary reference YES and NO prices must sum to 1");
      var providerKind = predictionMarketR2RequireId_(snapshot.providerKind, "providerKind").toUpperCase();
      var providerId = predictionMarketR2RequireId_(snapshot.providerId, "providerId");
      var externalMarketId = predictionMarketR2RequireId_(snapshot.externalMarketId, "externalMarketId");
      if (typeof snapshot.trusted !== "boolean") throw new Error("trusted must be explicit");
      market.referenceYesPrice = yes;
      market.referenceNoPrice = no;
      market.referencePriceAsOf = predictionMarketR2Iso_(snapshot.referencePriceAsOf);
      market.referencePriceTrusted = snapshot.trusted;
      market.providerKind = providerKind;
      market.providerId = providerId;
      market.externalMarketId = externalMarketId;
      market.sourceUrl = predictionMarketR2String_(snapshot.sourceUrl);
      market.providerMetadata = snapshot.providerMetadata && typeof snapshot.providerMetadata === "object" ? snapshot.providerMetadata : {};
      market.updatedAt = nowIso();
      market.updatedBy = predictionMarketR2String_((context || {}).playerId || (context || {}).username || "SYSTEM");
      return repository.saveMarket(predictionMarketR2NormalizeMarket_(market));
    });
  }
  function setManualPrice(context, marketId, yesPrice, noPrice, asOf) {
    assertAdmin(context);
    return repository.criticalSection(function() {
      var market = repository.getMarket(marketId);
      if (!market) throw new Error("Prediction Market not found");
      var status = predictionMarketR2Status_(market.status);
      if (status === "RESOLVED" || status === "VOID") throw new Error("Cannot price a terminal Prediction Market");
      var yes = predictionMarketR2Price_(yesPrice, "referenceYesPrice");
      var no = predictionMarketR2Price_(noPrice, "referenceNoPrice");
      if (Math.abs((yes + no) - 1) > 0.000001) throw new Error("Binary reference YES and NO prices must sum to 1");
      market.referenceYesPrice = yes;
      market.referenceNoPrice = no;
      market.referencePriceAsOf = predictionMarketR2Iso_(asOf || nowIso());
      market.referencePriceTrusted = true;
      market.providerKind = "MANUAL";
      market.updatedAt = nowIso();
      market.updatedBy = predictionMarketR2String_((context || {}).playerId || (context || {}).username || "SYSTEM");
      return repository.saveMarket(predictionMarketR2NormalizeMarket_(market));
    });
  }
  function transitionMarket(context, marketId, targetStatus, winningOutcome) {
    assertAdmin(context);
    var target = predictionMarketR2Status_(targetStatus);
    return repository.criticalSection(function() {
      var market = repository.getMarket(marketId);
      if (!market) throw new Error("Prediction Market not found");
      var from = predictionMarketR2Status_(market.status);
      var allowed = { DRAFT: ["OPEN", "VOID"], OPEN: ["LOCKED", "VOID"], LOCKED: ["RESOLVED", "VOID"], RESOLVED: [], VOID: [] };
      if (allowed[from].indexOf(target) === -1) throw new Error("Invalid prediction market transition: " + from + " -> " + target);
      if (target === "OPEN") validateOpenMarketConfig(market);
      if (target === "RESOLVED") { market.winningOutcome = predictionMarketR2Outcome_(winningOutcome); market.resolutionStatus = "RESOLVED"; }
      if (target === "VOID") { market.winningOutcome = ""; market.resolutionStatus = "VOID"; market.voided = true; }
      market.status = target;
      market.updatedAt = nowIso();
      market.updatedBy = predictionMarketR2String_((context || {}).playerId || (context || {}).username || "SYSTEM");
      return repository.saveMarket(predictionMarketR2NormalizeMarket_(market));
    });
  }
  function openMarket(context, marketId) { return transitionMarket(context, marketId, "OPEN"); }
  function lockMarket(context, marketId) { return transitionMarket(context, marketId, "LOCKED"); }
  function resolveMarket(context, marketId, winningOutcome) { return transitionMarket(context, marketId, "RESOLVED", winningOutcome); }
  function voidMarket(context, marketId) { return transitionMarket(context, marketId, "VOID"); }
  function bootstrapWallet(context, playerId, amount) {
    assertPlayer(context, playerId);
    var credits = amount == null ? bootstrapCredits : predictionMarketR2NonNegative_(amount, "bootstrapCredits");
    return repository.criticalSection(function() {
      var existing = repository.getWallet(playerId);
      if (existing) return predictionMarketR2NormalizeWallet_(existing);
      var now = nowIso();
      var wallet = {
        playerId: predictionMarketR2RequireId_(playerId, "playerId"), availableCredits: predictionMarketR2Round_(credits), reservedCredits: 0, version: 0,
        createdAt: now, createdBy: predictionMarketR2String_((context || {}).playerId || "SYSTEM"), updatedAt: now, updatedBy: predictionMarketR2String_((context || {}).playerId || "SYSTEM")
      };
      return repository.saveWallet(wallet);
    });
  }
  function getWallet(context, playerId) { assertPlayer(context, playerId); var wallet = repository.getWallet(playerId); return wallet ? predictionMarketR2NormalizeWallet_(wallet) : null; }
  function getMarkets() { return repository.listMarkets().map(predictionMarketR2NormalizeMarket_); }
  function executeTrade(context, request) {
    var req = request || {};
    var playerId = predictionMarketR2RequireId_(req.playerId, "playerId");
    assertPlayer(context, playerId);
    var transactionId = predictionMarketR2RequireId_(req.transactionId, "transactionId");
    var fingerprint = predictionMarketR2Fingerprint_(req);
    var side = predictionMarketR2Side_(req.side);
    var outcome = predictionMarketR2Outcome_(req.outcome);
    var quantity = predictionMarketR2NonNegative_(req.quantity, "quantity");
    if (quantity <= 0) throw new Error("quantity must be greater than zero");
    if (req.expectedWalletVersion == null || !isFinite(Number(req.expectedWalletVersion))) throw new Error("expectedWalletVersion is required");
    return repository.criticalSection(function() {
      var existingTx = repository.getTransaction(transactionId);
      if (existingTx) {
        if (predictionMarketR2String_(existingTx.fingerprint) !== fingerprint) throw new Error("Idempotency conflict: transactionId was already used for a different trade");
        if (predictionMarketR2String_(existingTx.status).toUpperCase() === "COMMITTED") return predictionMarketR2Clone_(existingTx.committedResult);
        if (predictionMarketR2String_(existingTx.status).toUpperCase() === "PENDING" && typeof repository.recoverPendingTrade === "function") {
          var recoveredTx = repository.recoverPendingTrade(existingTx);
          return predictionMarketR2Clone_(recoveredTx.committedResult);
        }
        throw new Error("Prediction Market transaction is not safely replayable");
      }
      var market = repository.getMarket(req.marketId);
      if (!market) throw new Error("Prediction Market not found");
      market = predictionMarketR2NormalizeMarket_(market);
      if (market.status !== "OPEN") throw new Error("Prediction Market is not OPEN");
      var now = nowIso();
      if (!market.lockTime || predictionMarketR2Millis_(now, "now") >= predictionMarketR2Millis_(market.lockTime, "lockTime")) throw new Error("Prediction Market lockTime has passed");
      var priceState = validatePriceState(market, now);
      var executionPrice = outcome === "YES" ? priceState.YES : priceState.NO;
      var wallet = repository.getWallet(playerId);
      if (!wallet) throw new Error("Prediction Market wallet is not initialized");
      wallet = predictionMarketR2NormalizeWallet_(wallet);
      if (Number(req.expectedWalletVersion) !== wallet.version) throw new Error("Stale prediction market wallet version");
      var position = repository.getPosition(playerId, market.marketId, outcome);
      position = position ? predictionMarketR2NormalizePosition_(position) : predictionMarketR2NormalizePosition_({
        playerId: playerId, marketId: market.marketId, outcome: outcome, quantity: 0, costBasisCredits: 0, realizedCredits: 0,
        settledCredits: 0, settledCostBasisCredits: 0, settled: false, createdAt: now, updatedAt: now
      });
      if (position.settled) throw new Error("Prediction Market position is already settled");
      var gross = predictionMarketR2Round_(quantity * executionPrice);
      var walletBefore = wallet.version;
      if (side === "BUY") {
        if (gross > wallet.availableCredits + 0.0000001) throw new Error("Insufficient available prediction market credits");
        wallet.availableCredits = predictionMarketR2Round_(wallet.availableCredits - gross);
        if (wallet.availableCredits < -0.0000001) throw new Error("Prediction Market wallet cannot become negative");
        position.quantity = predictionMarketR2Round_(position.quantity + quantity);
        position.costBasisCredits = predictionMarketR2Round_(position.costBasisCredits + gross);
      } else {
        if (quantity > position.quantity + 0.0000001) throw new Error("Cannot sell more Prediction Market shares than owned");
        var avgCost = position.quantity > 0 ? position.costBasisCredits / position.quantity : 0;
        var removedCost = predictionMarketR2Round_(avgCost * quantity);
        var proceeds = gross;
        var realizedDelta = predictionMarketR2Round_(proceeds - removedCost);
        position.quantity = predictionMarketR2Round_(position.quantity - quantity);
        position.costBasisCredits = predictionMarketR2Round_(Math.max(0, position.costBasisCredits - removedCost));
        if (Math.abs(position.quantity) < 0.0000001) { position.quantity = 0; position.costBasisCredits = 0; }
        position.realizedCredits = predictionMarketR2Round_(position.realizedCredits + realizedDelta);
        wallet.availableCredits = predictionMarketR2Round_(wallet.availableCredits + proceeds);
      }
      position.averageCostCredits = position.quantity > 0 ? predictionMarketR2Round_(position.costBasisCredits / position.quantity) : 0;
      position.updatedAt = now;
      wallet.version += 1;
      wallet.updatedAt = now;
      wallet.updatedBy = playerId;
      var result = {
        transactionId: transactionId, playerId: playerId, marketId: market.marketId, side: side, outcome: outcome, quantity: quantity,
        executionReferencePrice: executionPrice, grossCredits: gross, wallet: predictionMarketR2Clone_(wallet), position: predictionMarketR2Clone_(position), committedAt: now
      };
      var transaction = {
        transactionId: transactionId, fingerprint: fingerprint, playerId: playerId, marketId: market.marketId, side: side, outcome: outcome,
        quantity: quantity, executionReferencePrice: executionPrice, grossCredits: gross, status: "COMMITTED", walletVersionBefore: walletBefore,
        walletVersionAfter: wallet.version, requestedAt: predictionMarketR2String_(req.requestedAt || now), committedAt: now, committedResult: predictionMarketR2Clone_(result)
      };
      repository.commitTrade({ wallet: wallet, position: position, transaction: transaction });
      return result;
    });
  }
  function settlePlayerMarket(context, marketId, playerId) {
    assertAdmin(context);
    return repository.criticalSection(function() {
      var key = predictionMarketR2SettlementKey_(marketId, playerId);
      var existing = repository.getSettlement(key);
      if (existing) {
        if (predictionMarketR2String_(existing.status || "COMMITTED").toUpperCase() === "COMMITTED") return predictionMarketR2Clone_(existing.committedResult || existing);
        if (predictionMarketR2String_(existing.status).toUpperCase() === "PENDING" && typeof repository.recoverPendingSettlement === "function") {
          var recoveredSettlement = repository.recoverPendingSettlement(existing);
          return predictionMarketR2Clone_(recoveredSettlement.committedResult || recoveredSettlement);
        }
        throw new Error("Prediction Market settlement is not safely replayable");
      }
      var market = repository.getMarket(marketId);
      if (!market) throw new Error("Prediction Market not found");
      market = predictionMarketR2NormalizeMarket_(market);
      if (market.status !== "RESOLVED" && market.status !== "VOID") throw new Error("Only RESOLVED or VOID markets may settle");
      var wallet = repository.getWallet(playerId);
      if (!wallet) throw new Error("Prediction Market wallet is not initialized");
      wallet = predictionMarketR2NormalizeWallet_(wallet);
      var positions = repository.listPositionsByPlayerMarket(playerId, marketId).map(predictionMarketR2NormalizePosition_);
      var now = nowIso();
      var payout = 0;
      var returnedCost = 0;
      var results = [];
      positions.forEach(function(position) {
        if (position.settled) return;
        var positionPayout = 0;
        if (market.status === "VOID") { positionPayout = position.costBasisCredits; returnedCost += positionPayout; }
        else if (position.outcome === market.winningOutcome) positionPayout = position.quantity;
        payout += positionPayout;
        var settlementDelta = predictionMarketR2Round_(positionPayout - position.costBasisCredits);
        position.realizedCredits = predictionMarketR2Round_(position.realizedCredits + settlementDelta);
        position.settledCredits = predictionMarketR2Round_(positionPayout);
        position.settledCostBasisCredits = predictionMarketR2Round_(position.costBasisCredits);
        position.quantity = 0;
        position.costBasisCredits = 0;
        position.averageCostCredits = 0;
        position.settled = true;
        position.updatedAt = now;
        results.push({ outcome: position.outcome, payoutCredits: predictionMarketR2Round_(positionPayout), realizedDeltaCredits: settlementDelta });
      });
      payout = predictionMarketR2Round_(payout);
      returnedCost = predictionMarketR2Round_(returnedCost);
      var versionBefore = wallet.version;
      wallet.availableCredits = predictionMarketR2Round_(wallet.availableCredits + payout);
      wallet.version += 1;
      wallet.updatedAt = now;
      wallet.updatedBy = predictionMarketR2String_((context || {}).playerId || "SYSTEM");
      var settlement = {
        settlementKey: key, marketId: marketId, playerId: playerId, marketStatus: market.status, winningOutcome: market.winningOutcome,
        payoutCredits: payout, returnedCostBasisCredits: returnedCost, walletVersionBefore: versionBefore, walletVersionAfter: wallet.version,
        positionResults: results, status: "COMMITTED", committedAt: now
      };
      var committedResult = Object.assign({}, settlement, { wallet: predictionMarketR2Clone_(wallet), positions: predictionMarketR2Clone_(positions) });
      settlement.committedResult = committedResult;
      repository.commitSettlement({ wallet: wallet, positions: positions, settlement: settlement });
      return committedResult;
    });
  }
  function getPortfolio(context, playerId) {
    assertPlayer(context, playerId);
    var wallet = repository.getWallet(playerId);
    if (!wallet) throw new Error("Prediction Market wallet is not initialized");
    wallet = predictionMarketR2NormalizeWallet_(wallet);
    var positions = repository.listPositionsByPlayer(playerId).map(predictionMarketR2NormalizePosition_);
    var currentValue = 0, unrealized = 0, realized = 0, settledValue = 0;
    var marked = positions.map(function(position) {
      realized += position.realizedCredits;
      settledValue += position.settledCredits;
      if (position.settled || position.quantity <= 0) return Object.assign({}, position, { markedValueCredits: 0, unrealizedCredits: 0 });
      var market = repository.getMarket(position.marketId);
      if (!market) throw new Error("Prediction Market missing for position " + position.marketId);
      market = predictionMarketR2NormalizeMarket_(market);
      var price = position.outcome === "YES" ? market.referenceYesPrice : market.referenceNoPrice;
      var value = predictionMarketR2Round_(position.quantity * price);
      var u = predictionMarketR2Round_(value - position.costBasisCredits);
      currentValue += value; unrealized += u;
      return Object.assign({}, position, { markedValueCredits: value, unrealizedCredits: u });
    });
    var portfolioValue = predictionMarketR2Round_(wallet.availableCredits + wallet.reservedCredits + currentValue);
    return {
      playerId: playerId, availableCredits: wallet.availableCredits, reservedCredits: wallet.reservedCredits,
      currentMarkedPositionValueCredits: predictionMarketR2Round_(currentValue), unrealizedGainLossCredits: predictionMarketR2Round_(unrealized),
      realizedGainLossCredits: predictionMarketR2Round_(realized), settledValueCredits: predictionMarketR2Round_(settledValue),
      portfolioValueCredits: portfolioValue, leaderboardValueCredits: portfolioValue, walletVersion: wallet.version, positions: marked
    };
  }
  function getLeaderboard(context) {
    assertAdmin(context);
    var rows = repository.listWallets().map(function(wallet) {
      var portfolio = getPortfolio({ role: "SYSTEM", playerId: wallet.playerId }, wallet.playerId);
      return { playerId: wallet.playerId, displayName: predictionMarketR2String_(displayNameResolver(wallet.playerId) || wallet.playerId), portfolioValueCredits: portfolio.portfolioValueCredits };
    });
    rows.sort(function(a, b) {
      if (b.portfolioValueCredits !== a.portfolioValueCredits) return b.portfolioValueCredits - a.portfolioValueCredits;
      var an = a.displayName.toLowerCase(), bn = b.displayName.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return a.playerId < b.playerId ? -1 : (a.playerId > b.playerId ? 1 : 0);
    });
    rows.forEach(function(row, index) { row.rank = index + 1; });
    return rows;
  }
  return {
    setup: setup, createMarket: createMarket, editDraftMarket: editDraftMarket, setManualPrice: setManualPrice, setReferencePrice: setReferencePrice,
    openMarket: openMarket, lockMarket: lockMarket, resolveMarket: resolveMarket, setManualResolution: resolveMarket, voidMarket: voidMarket,
    bootstrapWallet: bootstrapWallet, getWallet: getWallet, getMarkets: getMarkets, executeTrade: executeTrade,
    settlePlayerMarket: settlePlayerMarket, getPortfolio: getPortfolio, getLeaderboard: getLeaderboard,
    validatePriceState: validatePriceState, repository: repository
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PREDICTION_MARKET_R2_CONFIG: PREDICTION_MARKET_R2_CONFIG,
    PREDICTION_MARKET_R2_SHEETS: PREDICTION_MARKET_R2_SHEETS,
    PREDICTION_MARKET_R2_HEADERS: PREDICTION_MARKET_R2_HEADERS,
    predictionMarketR2CreateMemoryRepository: predictionMarketR2CreateMemoryRepository,
    predictionMarketR2CreateManualProvider: predictionMarketR2CreateManualProvider,
    predictionMarketR2CreateEngine: predictionMarketR2CreateEngine,
    predictionMarketR2Fingerprint_: predictionMarketR2Fingerprint_,
    predictionMarketR2SettlementKey_: predictionMarketR2SettlementKey_
  };
}
