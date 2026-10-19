/* =====================================================
   PREDICTION MARKET COMMUNITY MOVEMENT R1
   Aggregate/read-only analytics over accepted Prediction Market stores.
   Never supplies or changes external/reference trade pricing.
===================================================== */

function predictionMarketCommunityR1String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketCommunityR1Finite_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : (fallback == null ? 0 : fallback);
}

function predictionMarketCommunityR1Round_(value) {
  return Math.round(predictionMarketCommunityR1Finite_(value) * 1000000) / 1000000;
}

function predictionMarketCommunityR1Percent_(yes, no) {
  var total = predictionMarketCommunityR1Finite_(yes) + predictionMarketCommunityR1Finite_(no);
  return total > 0 ? predictionMarketCommunityR1Round_(predictionMarketCommunityR1Finite_(yes) * 100 / total) : null;
}

function predictionMarketCommunityR1Timestamp_(transaction) {
  var value = predictionMarketCommunityR1String_(transaction && (transaction.committedAt || transaction.requestedAt));
  var millis = Date.parse(value);
  return isFinite(millis) ? millis : null;
}

function predictionMarketCommunityR1CommittedTransactions_(rows, marketId, knownPlayers) {
  marketId = predictionMarketCommunityR1String_(marketId);
  return (rows || []).filter(function(transaction) {
    var playerId = predictionMarketCommunityR1String_(transaction && transaction.playerId);
    var side = predictionMarketCommunityR1String_(transaction && transaction.side).toUpperCase();
    var outcome = predictionMarketCommunityR1String_(transaction && transaction.outcome).toUpperCase();
    var quantity = Number(transaction && transaction.quantity);
    var grossCredits = Number(transaction && transaction.grossCredits);
    return predictionMarketCommunityR1String_(transaction && transaction.marketId) === marketId &&
      predictionMarketCommunityR1String_(transaction && transaction.status).toUpperCase() === "COMMITTED" &&
      (!knownPlayers || knownPlayers[playerId] === true) &&
      (side === "BUY" || side === "SELL") &&
      (outcome === "YES" || outcome === "NO") &&
      isFinite(quantity) && quantity > 0 && isFinite(grossCredits) && grossCredits >= 0 &&
      predictionMarketCommunityR1Timestamp_(transaction) != null;
  }).slice().sort(function(a, b) {
    return predictionMarketCommunityR1Timestamp_(a) - predictionMarketCommunityR1Timestamp_(b);
  });
}

function predictionMarketCommunityR1Replay_(transactions, throughMillis) {
  var yes = 0;
  var no = 0;
  var saw = false;
  var valid = true;
  (transactions || []).forEach(function(transaction) {
    var timestamp = predictionMarketCommunityR1Timestamp_(transaction);
    if (timestamp == null || timestamp > throughMillis) return;
    var quantity = Number(transaction.quantity);
    var signed = String(transaction.side).toUpperCase() === "BUY" ? quantity : -quantity;
    if (String(transaction.outcome).toUpperCase() === "YES") yes += signed;
    else no += signed;
    if (yes < -0.000001 || no < -0.000001) valid = false;
    yes = Math.max(0, yes);
    no = Math.max(0, no);
    saw = true;
  });
  var percent = valid && saw ? predictionMarketCommunityR1Percent_(yes, no) : null;
  return {
    supported: valid && saw && percent != null,
    yesShares: predictionMarketCommunityR1Round_(yes),
    noShares: predictionMarketCommunityR1Round_(no),
    yesPositioningPercent: percent
  };
}

function predictionMarketCommunityR1Movement_(transactions, currentYesPercent, nowMillis, ageMillis) {
  if (currentYesPercent == null) return { supported:false, yesPointChange:null };
  var baseline = predictionMarketCommunityR1Replay_(transactions, nowMillis - ageMillis);
  return {
    supported: baseline.supported,
    yesPointChange: baseline.supported
      ? predictionMarketCommunityR1Round_(currentYesPercent - baseline.yesPositioningPercent)
      : null
  };
}

function predictionMarketCommunityR1Activity_(transactions) {
  var buckets = {};
  var yes = 0;
  var no = 0;
  var replayValid = true;
  (transactions || []).forEach(function(transaction) {
    var timestamp = predictionMarketCommunityR1Timestamp_(transaction);
    var date = new Date(timestamp).toISOString().slice(0, 10);
    var side = String(transaction.side).toUpperCase();
    var outcome = String(transaction.outcome).toUpperCase();
    var quantity = Number(transaction.quantity);
    var gross = Math.abs(Number(transaction.grossCredits));
    var signed = side === "BUY" ? quantity : -quantity;
    if (outcome === "YES") yes += signed;
    else no += signed;
    if (yes < -0.000001 || no < -0.000001) replayValid = false;
    yes = Math.max(0, yes);
    no = Math.max(0, no);
    var bucket = buckets[date] || { date:date, tradeCount:0, volumeCredits:0, buyCredits:0, sellCredits:0, yesPositioningPercent:null };
    bucket.tradeCount += 1;
    bucket.volumeCredits += gross;
    if (side === "BUY") bucket.buyCredits += gross;
    else bucket.sellCredits += gross;
    bucket.yesPositioningPercent = replayValid ? predictionMarketCommunityR1Percent_(yes, no) : null;
    buckets[date] = bucket;
  });
  return Object.keys(buckets).sort().map(function(date) {
    var bucket = buckets[date];
    bucket.volumeCredits = predictionMarketCommunityR1Round_(bucket.volumeCredits);
    bucket.buyCredits = predictionMarketCommunityR1Round_(bucket.buyCredits);
    bucket.sellCredits = predictionMarketCommunityR1Round_(bucket.sellCredits);
    return bucket;
  });
}

function predictionMarketCommunityR1Derive_(marketId, positions, transactions, wallets, nowMillis) {
  marketId = predictionMarketCommunityR1String_(marketId);
  var knownPlayers = {};
  (wallets || []).forEach(function(wallet) {
    var playerId = predictionMarketCommunityR1String_(wallet && wallet.playerId);
    if (playerId) knownPlayers[playerId] = true;
  });
  var useKnownPlayers = Object.keys(knownPlayers).length ? knownPlayers : null;
  var current = (positions || []).filter(function(position) {
    var playerId = predictionMarketCommunityR1String_(position && position.playerId);
    var outcome = predictionMarketCommunityR1String_(position && position.outcome).toUpperCase();
    var quantity = Number(position && position.quantity);
    return predictionMarketCommunityR1String_(position && position.marketId) === marketId &&
      (!useKnownPlayers || useKnownPlayers[playerId] === true) &&
      (outcome === "YES" || outcome === "NO") && isFinite(quantity) && quantity > 0;
  });
  var committed = predictionMarketCommunityR1CommittedTransactions_(transactions, marketId, useKnownPlayers);
  var yesUsers = {};
  var noUsers = {};
  var participants = {};
  var yesShares = 0;
  var noShares = 0;
  current.forEach(function(position) {
    var playerId = predictionMarketCommunityR1String_(position.playerId);
    var quantity = Number(position.quantity);
    participants[playerId] = true;
    if (String(position.outcome).toUpperCase() === "YES") {
      yesUsers[playerId] = true;
      yesShares += quantity;
    } else {
      noUsers[playerId] = true;
      noShares += quantity;
    }
  });
  var buyCredits = 0;
  var sellCredits = 0;
  committed.forEach(function(transaction) {
    var playerId = predictionMarketCommunityR1String_(transaction.playerId);
    participants[playerId] = true;
    var gross = Math.abs(Number(transaction.grossCredits));
    if (String(transaction.side).toUpperCase() === "BUY") buyCredits += gross;
    else sellCredits += gross;
  });
  yesShares = predictionMarketCommunityR1Round_(yesShares);
  noShares = predictionMarketCommunityR1Round_(noShares);
  var yesPercent = predictionMarketCommunityR1Percent_(yesShares, noShares);
  var noPercent = yesPercent == null ? null : predictionMarketCommunityR1Round_(100 - yesPercent);
  var activity = predictionMarketCommunityR1Activity_(committed);
  return {
    label:"PATTC Community",
    marketId:marketId,
    usersPositionedYes:Object.keys(yesUsers).length,
    usersPositionedNo:Object.keys(noUsers).length,
    yesShareQuantity:yesShares,
    noShareQuantity:noShares,
    yesPositioningPercent:yesPercent,
    noPositioningPercent:noPercent,
    participatingPlayers:Object.keys(participants).length,
    tradingVolumeCredits:predictionMarketCommunityR1Round_(buyCredits + sellCredits),
    buyVolumeCredits:predictionMarketCommunityR1Round_(buyCredits),
    sellVolumeCredits:predictionMarketCommunityR1Round_(sellCredits),
    tradeCount:committed.length,
    hasPositioning:yesPercent != null,
    hasActivity:committed.length > 0,
    activity:activity,
    movement24h:predictionMarketCommunityR1Movement_(committed, yesPercent, nowMillis, 24 * 60 * 60 * 1000),
    movement7d:predictionMarketCommunityR1Movement_(committed, yesPercent, nowMillis, 7 * 24 * 60 * 60 * 1000)
  };
}

function predictionMarketCommunityR1CreateService(options) {
  options = options || {};
  var repository = options.repository;
  var now = typeof options.now === "function" ? options.now : function() { return new Date(); };
  if (!repository || typeof repository.listPositions !== "function" || typeof repository.listTransactions !== "function" || typeof repository.listWallets !== "function") {
    throw new Error("Prediction Market community analytics require read-only repository list APIs");
  }
  function snapshot_() {
    return {
      positions:repository.listPositions() || [],
      transactions:repository.listTransactions() || [],
      wallets:repository.listWallets() || [],
      nowMillis:now().getTime()
    };
  }
  function market(marketId) {
    var snapshot = snapshot_();
    return predictionMarketCommunityR1Derive_(marketId, snapshot.positions, snapshot.transactions, snapshot.wallets, snapshot.nowMillis);
  }
  function forMarkets(marketIds) {
    var snapshot = snapshot_();
    var result = {};
    (marketIds || []).forEach(function(marketId) {
      marketId = predictionMarketCommunityR1String_(marketId);
      if (marketId) result[marketId] = predictionMarketCommunityR1Derive_(marketId, snapshot.positions, snapshot.transactions, snapshot.wallets, snapshot.nowMillis);
    });
    return result;
  }
  return { market:market, forMarkets:forMarkets };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketCommunityR1CreateService:predictionMarketCommunityR1CreateService,
    predictionMarketCommunityR1Derive_:predictionMarketCommunityR1Derive_,
    predictionMarketCommunityR1Replay_:predictionMarketCommunityR1Replay_
  };
}
