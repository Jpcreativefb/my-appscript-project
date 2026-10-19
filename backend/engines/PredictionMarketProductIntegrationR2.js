/* =====================================================
   PREDICTION MARKET PRODUCT INTEGRATION R2

   Schema-neutral coordination across accepted Multi-Outcome Core R2,
   External Discovery R2 and Provider Resolution R2 authorities.
   No store creation, setup, provider transport duplication, or direct
   wallet/transaction/position/settlement writes live here.
===================================================== */

var PREDICTION_MARKET_PRODUCT_INTEGRATION_R2 = Object.freeze({
  MARKET_TYPE_MULTI: "MULTI_OUTCOME",
  REVIEW_REQUIRED: "REVIEW_REQUIRED"
});

function predictionMarketProductR2String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketProductR2Upper_(value) {
  return predictionMarketProductR2String_(value).toUpperCase();
}

function predictionMarketProductR2Clone_(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function predictionMarketProductR2Metadata_(market) {
  if (typeof predictionMarketMultiOutcomeR2GetMetadata_ !== "function") return null;
  return predictionMarketMultiOutcomeR2GetMetadata_(market || {});
}

function predictionMarketProductR2GroupId_(market) {
  var metadata = predictionMarketProductR2Metadata_(market);
  return metadata && (metadata.logicalMarketId || metadata.groupMarketId) || "";
}

function predictionMarketProductR2GroupStatus_(children) {
  children = Array.isArray(children) ? children : [];
  var statuses = children.map(function(row) { return predictionMarketProductR2Upper_(row && row.status); });
  if (!statuses.length) return "";
  if (statuses.every(function(status) { return status === statuses[0]; })) return statuses[0];
  if (statuses.some(function(status) { return status === "OPEN"; })) return "OPEN";
  if (statuses.some(function(status) { return status === "LOCKED"; })) return "LOCKED";
  return PREDICTION_MARKET_PRODUCT_INTEGRATION_R2.REVIEW_REQUIRED;
}

function predictionMarketProductR2CreateCoordinator(options) {
  options = options || {};
  var engine = options.engine;
  var repository = options.repository || (engine && engine.repository) || null;
  var discoveryDetail = options.discoveryDetail || null;
  var providerResolution = options.providerResolution || null;
  var nowIso = typeof options.nowIso === "function" ? options.nowIso : function() { return new Date().toISOString(); };
  if (!engine) throw new Error("Prediction Market R2 engine is required");
  if (typeof predictionMarketMultiOutcomeR2CreateCoordinator !== "function") throw new Error("Prediction Market Multi-Outcome Core R2 is unavailable");
  var multi = predictionMarketMultiOutcomeR2CreateCoordinator({ engine:engine, idFactory:options.idFactory });

  function context_(username, role) {
    username = predictionMarketProductR2String_(username) || "prediction-market-product-r2";
    return { role:role || "ADMIN", playerId:username, username:username };
  }

  function marketMap_() {
    var map = {};
    (engine.getMarkets() || []).forEach(function(row) { map[predictionMarketProductR2String_(row.marketId)] = row; });
    return map;
  }

  function groups_() {
    var grouped = {}, order = [];
    (engine.getMarkets() || []).forEach(function(market) {
      var metadata = predictionMarketProductR2Metadata_(market);
      if (!metadata) return;
      var id = metadata.logicalMarketId || metadata.groupMarketId;
      if (!grouped[id]) { grouped[id] = []; order.push(id); }
      grouped[id].push(market);
    });
    return order.map(function(id) { return groupView_(id, grouped[id]); });
  }

  function groupView_(groupId, children) {
    children = (children || multi.getGroup(groupId) || []).slice().sort(function(a,b) {
      return Number(predictionMarketProductR2Metadata_(a).outcomeOrder) - Number(predictionMarketProductR2Metadata_(b).outcomeOrder);
    });
    if (!children.length) return null;
    var first = children[0], metadata = predictionMarketProductR2Metadata_(first), providerMetadata = first.providerMetadata || {};
    var resolution = providerMetadata.providerResolutionR2 || {};
    return {
      marketType:PREDICTION_MARKET_PRODUCT_INTEGRATION_R2.MARKET_TYPE_MULTI,
      logicalMarketId:metadata.logicalMarketId,
      groupMarketId:metadata.groupMarketId,
      logicalTitle:metadata.logicalTitle,
      logicalQuestion:metadata.logicalQuestion,
      category:first.category || "",
      status:predictionMarketProductR2GroupStatus_(children),
      providerKind:first.providerKind || "MANUAL",
      providerId:first.providerId || "",
      sourceUrl:first.sourceUrl || "",
      lockTime:first.lockTime || "",
      tradingFeeMode:providerMetadata.tradingFeeMode || "INHERIT",
      tradingFeeBps:providerMetadata.tradingFeeBps == null ? null : providerMetadata.tradingFeeBps,
      sourceSnapshot:providerMetadata.sourceSnapshot || {},
      providerResolutionR2:resolution,
      outcomes:children.map(function(child) {
        var childMeta = predictionMarketProductR2Metadata_(child);
        var childProvider = child.providerMetadata || {};
        return {
          outcomeId:childMeta.outcomeId,
          outcomeLabel:childMeta.outcomeLabel,
          outcomeOrder:childMeta.outcomeOrder,
          marketId:child.marketId,
          status:child.status,
          referenceProbability:child.referenceYesPrice,
          referenceYesPrice:child.referenceYesPrice,
          referenceNoPrice:child.referenceNoPrice,
          referencePriceAsOf:child.referencePriceAsOf,
          referencePriceTrusted:child.referencePriceTrusted === true,
          providerKind:child.providerKind,
          providerId:child.providerId,
          externalMarketId:child.externalMarketId,
          sourceUrl:child.sourceUrl,
          providerResolutionR2:childProvider.providerResolutionR2 || {}
        };
      }),
      children:children
    };
  }

  function getGroup(groupId) {
    return groupView_(groupId, multi.getGroup(groupId));
  }

  function createDraftGroup(username, input) {
    input = predictionMarketProductR2Clone_(input || {});
    input.marketType = PREDICTION_MARKET_PRODUCT_INTEGRATION_R2.MARKET_TYPE_MULTI;
    var result = multi.createDraftGroup(context_(username, "ADMIN"), input);
    return groupView_(result.logicalMarketId, result.children);
  }

  function selectedOutcome_(row, config) {
    var outcomes = Array.isArray(row.outcomes) ? row.outcomes.map(predictionMarketProductR2String_) : [];
    var selected = predictionMarketProductR2String_(config && config.selectedOutcome);
    var lower = outcomes.map(function(value) { return value.toLowerCase(); });
    if (!selected && lower.indexOf("yes") !== -1) selected = outcomes[lower.indexOf("yes")];
    if (!selected && outcomes.length === 1) selected = outcomes[0];
    return selected;
  }

  function priceForOutcome_(row, selected) {
    var prices = row && row.prices && typeof row.prices === "object" ? row.prices : {};
    var keys = Object.keys(prices), wanted = predictionMarketProductR2String_(selected).toLowerCase();
    for (var i=0;i<keys.length;i+=1) if (predictionMarketProductR2String_(keys[i]).toLowerCase() === wanted) return Number(prices[keys[i]]);
    if (row && row.primaryProbability != null) return Number(row.primaryProbability);
    return NaN;
  }

  function labelForChild_(row, index, config) {
    return predictionMarketProductR2String_(config && config.outcomeLabel) ||
      predictionMarketProductR2String_(row.yesLabel) ||
      predictionMarketProductR2String_(selectedOutcome_(row, config)) ||
      predictionMarketProductR2String_(row.marketQuestion) ||
      ("Outcome " + (index + 1));
  }

  function importExternalGroup(username, payload) {
    payload = payload || {};
    var detail = payload.externalGroup || payload.event || {};
    var rows = Array.isArray(detail.markets) ? detail.markets : [];
    if (rows.length < 2) throw new Error("Grouped external import requires at least two child markets");
    var provider = predictionMarketProductR2String_(detail.provider).toUpperCase();
    if (provider !== "KALSHI" && provider !== "POLYMARKET") throw new Error("External grouped import requires Kalshi or Polymarket");
    var providerId = predictionMarketProductR2String_(detail.externalEventId);
    if (!providerId) throw new Error("External grouped event identity is required");
    var duplicate = groups_().some(function(group) {
      return predictionMarketProductR2Upper_(group.providerKind) === provider && predictionMarketProductR2String_(group.providerId) === providerId;
    });
    if (duplicate) throw new Error("This external grouped event is already stored in PATTC Prediction Markets");
    var configs = Array.isArray(payload.outcomeConfigs) ? payload.outcomeConfigs : [];
    var referencePriceAsOf = predictionMarketProductR2String_(payload.referencePriceAsOf || detail.referencePriceAsOf || nowIso());
    var outcomes = rows.map(function(row,index) {
      var config = configs[index] || {};
      var selected = selectedOutcome_(row, config);
      var probability = priceForOutcome_(row, selected);
      if (!isFinite(probability) || probability < 0 || probability > 1) throw new Error("External reference probability is unavailable for " + labelForChild_(row,index,config));
      return {
        outcomeId:predictionMarketProductR2String_(config.outcomeId || row.externalMarketId) || ("outcome-" + index),
        outcomeLabel:labelForChild_(row,index,config),
        referenceProbability:probability,
        referencePriceAsOf:predictionMarketProductR2String_(row.referencePriceAsOf || referencePriceAsOf),
        referencePriceTrusted:true,
        providerKind:provider,
        providerId:providerId,
        externalMarketId:predictionMarketProductR2String_(row.externalMarketId),
        sourceUrl:predictionMarketProductR2String_(row.sourceUrl || detail.sourceUrl),
        lockTime:predictionMarketProductR2String_(row.closeTime || detail.closeTime),
        category:predictionMarketProductR2String_(row.category || detail.category),
        providerMetadata:{
          source:"awards-external-markets",
          externalEventId:providerId,
          eventName:predictionMarketProductR2String_(detail.eventName || detail.logicalQuestion),
          marketQuestion:predictionMarketProductR2String_(row.marketQuestion),
          outcomes:Array.isArray(row.outcomes) ? row.outcomes.slice() : [],
          prices:row.prices && typeof row.prices === "object" ? predictionMarketProductR2Clone_(row.prices) : {},
          selectedOutcome:selected,
          sourceSnapshot:detail.sourceSnapshot || {},
          providerStatus:predictionMarketProductR2String_(row.status || detail.status)
        }
      };
    });
    var feeMetadata = payload.providerMetadata && typeof payload.providerMetadata === "object" ? predictionMarketProductR2Clone_(payload.providerMetadata) : {};
    if (payload.tradingFeeMode) feeMetadata.tradingFeeMode = predictionMarketProductR2Upper_(payload.tradingFeeMode) === "CUSTOM" ? "CUSTOM" : "INHERIT";
    if (payload.tradingFeeBps != null && payload.tradingFeeBps !== "") feeMetadata.tradingFeeBps = Number(payload.tradingFeeBps);
    feeMetadata.source = "awards-external-markets";
    feeMetadata.externalEventId = providerId;
    feeMetadata.sourceSnapshot = detail.sourceSnapshot || {};
    var group = createDraftGroup(username, {
      logicalMarketId:payload.logicalMarketId,
      logicalTitle:predictionMarketProductR2String_(payload.logicalTitle || detail.logicalQuestion || detail.eventName || providerId),
      logicalQuestion:predictionMarketProductR2String_(payload.logicalQuestion || detail.logicalQuestion || detail.eventName || providerId),
      description:predictionMarketProductR2String_(payload.description || detail.contextSubtitle),
      category:predictionMarketProductR2String_(payload.category || detail.category),
      providerKind:provider,
      providerId:providerId,
      sourceUrl:predictionMarketProductR2String_(detail.sourceUrl),
      providerMetadata:feeMetadata,
      lockTime:predictionMarketProductR2String_(payload.lockTime || detail.closeTime),
      referencePriceAsOf:referencePriceAsOf,
      referencePriceTrusted:true,
      outcomes:outcomes
    });
    return { success:true, created:group.outcomes.length, failed:0, requested:group.outcomes.length, group:group };
  }

  function applyGroupLifecycle(username, groupId, action, winningOutcomeId) {
    var children = multi.getGroup(groupId);
    if (children.length < 2) throw new Error("Prediction Market multi-outcome group not found");
    var ctx = context_(username, "ADMIN");
    action = predictionMarketProductR2Upper_(action);
    if (action === "OPEN") children.forEach(function(row) { if (predictionMarketProductR2Upper_(row.status) === "DRAFT") engine.openMarket(ctx,row.marketId); });
    else if (action === "LOCK") children.forEach(function(row) { if (predictionMarketProductR2Upper_(row.status) === "OPEN") engine.lockMarket(ctx,row.marketId); });
    else if (action === "VOID") multi.voidGroup(ctx,groupId);
    else if (action === "RESOLVE") multi.resolveGroup(ctx,groupId,winningOutcomeId);
    else throw new Error("Unsupported multi-outcome lifecycle action");
    return getGroup(groupId);
  }

  function settleGroup_(username, groupId) {
    if (!repository || typeof repository.listPositions !== "function") return [];
    var ctx = context_(username, "SYSTEM"), children = multi.getGroup(groupId), childIds = {};
    children.forEach(function(row) { childIds[row.marketId] = true; });
    var players = {};
    repository.listPositions().forEach(function(position) { if (childIds[position.marketId]) players[predictionMarketProductR2String_(position.playerId)] = true; });
    var settlements = [];
    Object.keys(players).filter(Boolean).forEach(function(playerId) {
      children.forEach(function(child) { settlements.push(engine.settlePlayerMarket(ctx,child.marketId,playerId)); });
    });
    return settlements;
  }

  function syncProviderGroup(username, groupId) {
    if (!providerResolution || typeof providerResolution.fetchResult !== "function") throw new Error("Provider Resolution R2 authority is unavailable");
    var group = getGroup(groupId);
    if (!group) throw new Error("Prediction Market multi-outcome group not found");
    if (predictionMarketProductR2Upper_(group.providerKind) === "MANUAL") return { success:true, skipped:true, reason:"MANUAL_MARKET", group:group, settlements:[] };
    var children = multi.getGroup(groupId);
    var results = children.map(function(child) {
      try { return { child:child, result:providerResolution.fetchResult(child) }; }
      catch (err) { return { child:child, result:{ lifecycle:"REVIEW_REQUIRED", reviewRequired:true, reviewReason:"PROVIDER_API_UNAVAILABLE", providerStatus:"PROVIDER_ERROR", evidence:{message:err&&err.message?err.message:String(err)} } }; }
    });
    var currentStatus = predictionMarketProductR2Upper_(group.status);
    if (currentStatus === "RESOLVED" || currentStatus === "VOID") {
      return { success:true, completed:true, noOverride:true, providerLifecycle:"FINAL", reviewRequired:false, group:group, childResults:results, settlements:[] };
    }
    if (currentStatus === "DRAFT") {
      results.forEach(function(entry) { if (typeof providerResolution.sync === "function") providerResolution.sync(username,entry.child.marketId); });
      var draftNeedsReview = results.some(function(entry) { return entry.result.final === true || entry.result.tradingClosed === true || entry.result.reviewRequired === true; });
      return { success:true, providerLifecycle:draftNeedsReview?"REVIEW_REQUIRED":"OPEN", reviewRequired:draftNeedsReview, reviewReason:draftNeedsReview?"DRAFT_PROVIDER_STATE_REQUIRES_ADMIN_REVIEW":"", group:getGroup(groupId), childResults:results, settlements:[] };
    }
    var anyReview = results.some(function(entry) { return entry.result.reviewRequired === true || entry.result.lifecycle === "REVIEW_REQUIRED"; });
    if (anyReview) return { success:true, providerLifecycle:"REVIEW_REQUIRED", reviewRequired:true, reviewReason:"PROVIDER_RESULT_AMBIGUOUS_OR_UNMAPPED", group:group, childResults:results, settlements:[] };
    var anyClosed = results.some(function(entry) { return entry.result.tradingClosed === true; });
    if (anyClosed && currentStatus === "OPEN") {
      applyGroupLifecycle(username,groupId,"LOCK");
      group = getGroup(groupId);
      currentStatus = "LOCKED";
    }
    var allFinal = results.every(function(entry) { return entry.result.final === true; });
    if (!allFinal) {
      results.forEach(function(entry) { if (typeof providerResolution.sync === "function") providerResolution.sync(username,entry.child.marketId); });
      return { success:true, providerLifecycle:anyClosed?"CLOSED":"OPEN", reviewRequired:false, group:getGroup(groupId), childResults:results, settlements:[] };
    }
    var allVoid = results.every(function(entry) { return entry.result.voided === true || entry.result.lifecycle === "VOID"; });
    if (allVoid) {
      if (currentStatus === "LOCKED" || currentStatus === "OPEN") applyGroupLifecycle(username,groupId,"VOID");
      var voidSettlements = settleGroup_(username,groupId);
      return { success:true, providerLifecycle:"FINAL", voided:true, group:getGroup(groupId), childResults:results, settlements:voidSettlements };
    }
    var winners = results.filter(function(entry) { return predictionMarketProductR2Upper_(entry.result.mappedWinningOutcome) === "YES"; });
    var losersOk = results.every(function(entry) { var mapped=predictionMarketProductR2Upper_(entry.result.mappedWinningOutcome); return mapped === "YES" || mapped === "NO"; });
    if (winners.length !== 1 || !losersOk) return { success:true, providerLifecycle:"REVIEW_REQUIRED", reviewRequired:true, reviewReason:"GROUP_WINNER_AMBIGUOUS_OR_UNMAPPED", group:getGroup(groupId), childResults:results, settlements:[] };
    if (currentStatus !== "LOCKED") return { success:true, providerLifecycle:"REVIEW_REQUIRED", reviewRequired:true, reviewReason:"FINAL_GROUP_NOT_LOCKED", group:getGroup(groupId), childResults:results, settlements:[] };
    var winnerMeta = predictionMarketProductR2Metadata_(winners[0].child);
    multi.resolveGroup(context_(username,"SYSTEM"),groupId,winnerMeta.outcomeId);
    var settlements = settleGroup_(username,groupId);
    return { success:true, providerLifecycle:"FINAL", reviewRequired:false, winningOutcomeId:winnerMeta.outcomeId, winningOutcomeLabel:winnerMeta.outcomeLabel, group:getGroup(groupId), childResults:results, settlements:settlements };
  }

  function sourceDiff_(stored, current) {
    stored = stored || {}; current = current || {};
    var oldIds = Array.isArray(stored.childMarketIds) ? stored.childMarketIds.map(predictionMarketProductR2String_) : [];
    var newIds = Array.isArray(current.childMarketIds) ? current.childMarketIds.map(predictionMarketProductR2String_) : [];
    return {
      titleChanged:predictionMarketProductR2String_(stored.eventName || stored.question) !== predictionMarketProductR2String_(current.eventName || current.question),
      closeTimeChanged:predictionMarketProductR2String_(stored.closeTime) !== predictionMarketProductR2String_(current.closeTime),
      statusChanged:predictionMarketProductR2String_(stored.status) !== predictionMarketProductR2String_(current.status),
      addedOutcomeIds:newIds.filter(function(id){return oldIds.indexOf(id)===-1;}),
      removedOutcomeIds:oldIds.filter(function(id){return newIds.indexOf(id)===-1;})
    };
  }

  function refreshGroupSource(username, groupId) {
    if (typeof discoveryDetail !== "function") throw new Error("External Discovery R2 detail authority is unavailable");
    var group = getGroup(groupId);
    if (!group) throw new Error("Prediction Market multi-outcome group not found");
    var detail = discoveryDetail({ username:username, provider:predictionMarketProductR2String_(group.providerKind).toLowerCase(), eventId:group.providerId, status:"all", includeClosed:true });
    var currentSnapshot = detail && detail.sourceSnapshot || {};
    var diff = sourceDiff_(group.sourceSnapshot || {}, currentSnapshot);
    var structural = diff.addedOutcomeIds.length > 0 || diff.removedOutcomeIds.length > 0;
    var changed = structural || diff.titleChanged || diff.closeTimeChanged || diff.statusChanged;
    var open = predictionMarketProductR2Upper_(group.status) !== "DRAFT";
    return {
      success:true,
      changed:changed,
      structuralChange:structural,
      reviewRequired:open && changed,
      reviewReason:open && changed ? "OPEN_EXTERNAL_SOURCE_CHANGED" : "",
      canApply:!open,
      diff:diff,
      sourceSnapshot:currentSnapshot,
      detail:detail,
      group:group
    };
  }

  function groupedPortfolio(portfolio) {
    portfolio = portfolio || {};
    var map = marketMap_(), grouped = {}, order = [];
    (portfolio.positions || []).forEach(function(position) {
      var market = map[position.marketId], metadata = market && predictionMarketProductR2Metadata_(market);
      if (!metadata) return;
      var id = metadata.logicalMarketId || metadata.groupMarketId;
      if (!grouped[id]) { grouped[id] = { logicalMarketId:id, logicalTitle:metadata.logicalTitle, logicalQuestion:metadata.logicalQuestion, outcomes:[] }; order.push(id); }
      grouped[id].outcomes.push({ outcomeId:metadata.outcomeId, outcomeLabel:metadata.outcomeLabel, marketId:position.marketId, side:position.outcome, quantity:position.quantity, markedValueCredits:position.markedValueCredits, unrealizedCredits:position.unrealizedCredits, realizedCredits:position.realizedCredits, settled:position.settled, settledCredits:position.settledCredits });
    });
    return order.map(function(id){return grouped[id];});
  }

  function groupedCommunity(groupId) {
    var group = getGroup(groupId);
    if (!group || !repository) return null;
    var childIds = {}, labels = {};
    group.outcomes.forEach(function(outcome) { childIds[outcome.marketId]=true; labels[outcome.marketId]=outcome; });
    var positions = typeof repository.listPositions === "function" ? repository.listPositions() : [];
    var transactions = typeof repository.listTransactions === "function" ? repository.listTransactions() : [];
    var players = {}, outcomeStats = {}, totalYesShares = 0;
    group.outcomes.forEach(function(outcome) { outcomeStats[outcome.marketId]={ outcomeId:outcome.outcomeId, outcomeLabel:outcome.outcomeLabel, marketId:outcome.marketId, usersPositioned:0, shareQuantity:0, positioningPercent:0, volumeCredits:0, tradeCount:0 }; });
    positions.forEach(function(position) {
      if (!childIds[position.marketId] || predictionMarketProductR2Upper_(position.outcome) !== "YES" || Number(position.quantity) <= 0) return;
      var stat=outcomeStats[position.marketId]; stat.usersPositioned += 1; stat.shareQuantity += Number(position.quantity||0); totalYesShares += Number(position.quantity||0); players[predictionMarketProductR2String_(position.playerId)] = true;
    });
    var totalVolume=0, tradeCount=0;
    transactions.forEach(function(tx) {
      if (!childIds[tx.marketId] || predictionMarketProductR2Upper_(tx.status) !== "COMMITTED") return;
      var gross=Number(tx.grossCredits||0), stat=outcomeStats[tx.marketId]; stat.volumeCredits += gross; stat.tradeCount += 1; totalVolume += gross; tradeCount += 1; players[predictionMarketProductR2String_(tx.playerId)] = true;
    });
    var outcomes=group.outcomes.map(function(outcome){var stat=outcomeStats[outcome.marketId];stat.positioningPercent=totalYesShares?Math.round((stat.shareQuantity/totalYesShares)*10000)/100:0;return stat;});
    return { logicalMarketId:group.logicalMarketId, participatingPlayers:Object.keys(players).filter(Boolean).length, tradingVolumeCredits:totalVolume, tradeCount:tradeCount, outcomes:outcomes, note:"Aggregate PATTC activity only; external/reference probabilities remain independent." };
  }

  return {
    groups:groups_,
    getGroup:getGroup,
    createDraftGroup:createDraftGroup,
    importExternalGroup:importExternalGroup,
    applyGroupLifecycle:applyGroupLifecycle,
    syncProviderGroup:syncProviderGroup,
    refreshGroupSource:refreshGroupSource,
    groupedPortfolio:groupedPortfolio,
    groupedCommunity:groupedCommunity,
    settleGroup:settleGroup_
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PREDICTION_MARKET_PRODUCT_INTEGRATION_R2:PREDICTION_MARKET_PRODUCT_INTEGRATION_R2,
    predictionMarketProductR2Metadata_:predictionMarketProductR2Metadata_,
    predictionMarketProductR2GroupId_:predictionMarketProductR2GroupId_,
    predictionMarketProductR2GroupStatus_:predictionMarketProductR2GroupStatus_,
    predictionMarketProductR2CreateCoordinator:predictionMarketProductR2CreateCoordinator
  };
}
