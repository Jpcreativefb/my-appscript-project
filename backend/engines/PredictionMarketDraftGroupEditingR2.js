/* =====================================================
   PREDICTION MARKET DRAFT GROUP EDITING R2

   Draft-only editing for schema-neutral multi-outcome groups.
   Existing child contracts are edited in place, new outcomes create ordinary
   R2 child markets, and removed Draft outcomes are retired by removing group
   metadata and VOIDing the child. OPEN groups are never restructured here.
===================================================== */

function predictionMarketDraftGroupR2String_(value) {
  return String(value == null ? "" : value).trim();
}

function predictionMarketDraftGroupR2Clone_(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function predictionMarketDraftGroupR2CreateService(options) {
  options = options || {};
  var engine = options.engine;
  var discoveryDetail = options.discoveryDetail || null;
  var idFactory = typeof options.idFactory === "function" ? options.idFactory : function(prefix) {
    if (typeof predictionMarketMultiOutcomeR2Id_ === "function") return predictionMarketMultiOutcomeR2Id_(prefix);
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000000000);
  };
  if (!engine) throw new Error("Prediction Market R2 engine is required");

  function context_(username) {
    username = predictionMarketDraftGroupR2String_(username);
    if (!username) throw new Error("Authenticated Admin username is required");
    return { role:"ADMIN", playerId:username, username:username };
  }

  function group_(groupId) {
    groupId = predictionMarketDraftGroupR2String_(groupId);
    return (engine.getMarkets() || []).filter(function(market) {
      var metadata = typeof predictionMarketMultiOutcomeR2GetMetadata_ === "function" ? predictionMarketMultiOutcomeR2GetMetadata_(market) : null;
      return metadata && (metadata.logicalMarketId === groupId || metadata.groupMarketId === groupId);
    }).sort(function(a,b) {
      return predictionMarketMultiOutcomeR2GetMetadata_(a).outcomeOrder - predictionMarketMultiOutcomeR2GetMetadata_(b).outcomeOrder;
    });
  }

  function ensureDraft_(children) {
    if (children.length < 2) throw new Error("Prediction Market multi-outcome group not found");
    if (children.some(function(row) { return predictionMarketDraftGroupR2String_(row.status).toUpperCase() !== "DRAFT"; })) {
      throw new Error("Only DRAFT multi-outcome groups may be structurally edited");
    }
  }

  function probability_(value, label) {
    if (typeof predictionMarketMultiOutcomeR2Probability_ === "function") return predictionMarketMultiOutcomeR2Probability_(value,label);
    var n=Number(value); if(!isFinite(n)||n<0||n>1) throw new Error((label||"reference probability")+" must be between 0 and 1"); return n;
  }

  function editDraftGroup(username, groupId, input) {
    input = input || {};
    var ctx = context_(username), children = group_(groupId);
    ensureDraft_(children);
    var outcomes = Array.isArray(input.outcomes) ? input.outcomes.slice() : [];
    if (outcomes.length < 2) throw new Error("MULTI_OUTCOME markets require at least two outcomes");
    var firstMeta = predictionMarketMultiOutcomeR2GetMetadata_(children[0]);
    var logicalMarketId = firstMeta.logicalMarketId;
    var groupMarketId = firstMeta.groupMarketId;
    var logicalTitle = predictionMarketDraftGroupR2String_(input.logicalTitle || input.logicalQuestion || firstMeta.logicalTitle);
    var logicalQuestion = predictionMarketDraftGroupR2String_(input.logicalQuestion || logicalTitle || firstMeta.logicalQuestion);
    if (!logicalTitle || !logicalQuestion) throw new Error("logicalTitle and logicalQuestion are required");

    var byOutcome = {};
    children.forEach(function(child) {
      byOutcome[predictionMarketMultiOutcomeR2GetMetadata_(child).outcomeId] = child;
    });
    var wanted = {};
    var edited = [];

    outcomes.forEach(function(raw,index) {
      var outcome = raw && typeof raw === "object" ? raw : { outcomeLabel:raw };
      var outcomeId = predictionMarketDraftGroupR2String_(outcome.outcomeId || outcome.id) || idFactory("outcome");
      if (wanted[outcomeId]) throw new Error("Multi-outcome outcomeIds must be distinct");
      wanted[outcomeId] = true;
      var label = predictionMarketDraftGroupR2String_(outcome.outcomeLabel || outcome.label || outcome.title);
      if (!label) throw new Error("outcomeLabel is required");
      var yes = probability_(outcome.referenceProbability != null ? outcome.referenceProbability : outcome.referenceYesPrice,"reference probability");
      var no = outcome.referenceNoPrice == null ? Math.round((1-yes)*1000000)/1000000 : probability_(outcome.referenceNoPrice,"referenceNoPrice");
      if (Math.abs((yes+no)-1)>0.000001) throw new Error("Outcome reference YES and NO prices must sum to 1");
      var groupMetadata = predictionMarketMultiOutcomeR2BuildMetadata_({ logicalMarketId:logicalMarketId, groupMarketId:groupMarketId, logicalTitle:logicalTitle, logicalQuestion:logicalQuestion, outcomeId:outcomeId, outcomeLabel:label, outcomeOrder:index });
      var existing = byOutcome[outcomeId];
      if (existing) {
        var incomingMetadata = predictionMarketDraftGroupR2Clone_(input.providerMetadata || {});
        if (outcome.providerMetadata && typeof outcome.providerMetadata === "object") incomingMetadata = Object.assign(incomingMetadata,outcome.providerMetadata);
        var metadata = predictionMarketMultiOutcomeR2MergeProviderMetadata_(existing.providerMetadata,incomingMetadata,groupMetadata);
        edited.push(engine.editDraftMarket(ctx,existing.marketId,{
          title:logicalTitle+" — "+label,
          description:predictionMarketDraftGroupR2String_(outcome.description || input.description),
          category:predictionMarketDraftGroupR2String_(outcome.category || input.category || existing.category),
          yesLabel:label,
          noLabel:predictionMarketDraftGroupR2String_(outcome.noLabel || existing.noLabel || "Does not win"),
          referenceYesPrice:yes,
          referenceNoPrice:no,
          referencePriceAsOf:outcome.referencePriceAsOf || input.referencePriceAsOf || existing.referencePriceAsOf,
          referencePriceTrusted:outcome.referencePriceTrusted == null ? input.referencePriceTrusted !== false : outcome.referencePriceTrusted !== false,
          providerKind:outcome.providerKind || input.providerKind || existing.providerKind,
          providerId:outcome.providerId || input.providerId || existing.providerId,
          externalMarketId:outcome.externalMarketId == null ? existing.externalMarketId : outcome.externalMarketId,
          sourceUrl:outcome.sourceUrl || input.sourceUrl || existing.sourceUrl,
          providerMetadata:metadata,
          openTime:"",
          lockTime:outcome.lockTime || input.lockTime || existing.lockTime
        }));
      } else {
        var newMetadata = predictionMarketMultiOutcomeR2MergeProviderMetadata_(input.providerMetadata||{},outcome.providerMetadata||{},groupMetadata);
        edited.push(engine.createMarket(ctx,{
          marketId:predictionMarketDraftGroupR2String_(outcome.marketId) || idFactory("pm"),
          title:logicalTitle+" — "+label,
          description:predictionMarketDraftGroupR2String_(outcome.description || input.description),
          category:predictionMarketDraftGroupR2String_(outcome.category || input.category),
          yesLabel:label,
          noLabel:predictionMarketDraftGroupR2String_(outcome.noLabel)||"Does not win",
          referenceYesPrice:yes,
          referenceNoPrice:no,
          referencePriceAsOf:outcome.referencePriceAsOf || input.referencePriceAsOf,
          referencePriceTrusted:outcome.referencePriceTrusted == null ? input.referencePriceTrusted !== false : outcome.referencePriceTrusted !== false,
          providerKind:outcome.providerKind || input.providerKind || "MANUAL",
          providerId:outcome.providerId || input.providerId,
          externalMarketId:outcome.externalMarketId || "",
          sourceUrl:outcome.sourceUrl || input.sourceUrl,
          providerMetadata:newMetadata,
          openTime:"",
          lockTime:outcome.lockTime || input.lockTime
        }));
      }
    });

    children.forEach(function(child) {
      var meta = predictionMarketMultiOutcomeR2GetMetadata_(child);
      if (wanted[meta.outcomeId]) return;
      var metadata = predictionMarketDraftGroupR2Clone_(child.providerMetadata || {});
      delete metadata[PREDICTION_MARKET_MULTI_OUTCOME_R2_NAMESPACE];
      metadata.retiredFromMultiOutcomeR2 = {
        logicalMarketId:logicalMarketId,
        outcomeId:meta.outcomeId,
        outcomeLabel:meta.outcomeLabel,
        retiredAt:new Date().toISOString()
      };
      engine.editDraftMarket(ctx,child.marketId,{providerMetadata:metadata});
      engine.voidMarket(ctx,child.marketId);
    });

    return group_(logicalMarketId);
  }

  function selectedOutcome_(row, existing) {
    var outcomes = Array.isArray(row.outcomes) ? row.outcomes.map(predictionMarketDraftGroupR2String_) : [];
    var selected = existing && existing.providerMetadata ? predictionMarketDraftGroupR2String_(existing.providerMetadata.selectedOutcome) : "";
    var lower = outcomes.map(function(value){return value.toLowerCase();});
    if (!selected && lower.indexOf("yes") !== -1) selected=outcomes[lower.indexOf("yes")];
    if (!selected) selected=outcomes[0]||"Yes";
    return selected;
  }

  function priceFor_(row, selected) {
    var prices=row&&row.prices&&typeof row.prices==="object"?row.prices:{},wanted=predictionMarketDraftGroupR2String_(selected).toLowerCase(),keys=Object.keys(prices);
    for(var i=0;i<keys.length;i+=1) if(predictionMarketDraftGroupR2String_(keys[i]).toLowerCase()===wanted) return Number(prices[keys[i]]);
    return Number(row.primaryProbability);
  }

  function applyProviderSource(username, groupId) {
    if (typeof discoveryDetail !== "function") throw new Error("External Discovery R2 detail authority is unavailable");
    var children=group_(groupId); ensureDraft_(children);
    var first=children[0],firstMeta=predictionMarketMultiOutcomeR2GetMetadata_(first);
    var detail=discoveryDetail({username:username,provider:predictionMarketDraftGroupR2String_(first.providerKind).toLowerCase(),eventId:first.providerId,status:"all",includeClosed:true});
    var rows=detail&&Array.isArray(detail.markets)?detail.markets:[];
    if(rows.length<2) throw new Error("Provider source no longer exposes at least two outcomes");
    var existingByExternal={};children.forEach(function(child){existingByExternal[predictionMarketDraftGroupR2String_(child.externalMarketId)]=child;});
    var outcomes=rows.map(function(row,index){var existing=existingByExternal[predictionMarketDraftGroupR2String_(row.externalMarketId)],selected=selectedOutcome_(row,existing),price=priceFor_(row,selected);if(!isFinite(price)||price<0||price>1)throw new Error("Provider reference probability is unavailable for "+predictionMarketDraftGroupR2String_(row.marketQuestion||row.externalMarketId));var existingMeta=existing&&predictionMarketMultiOutcomeR2GetMetadata_(existing);return{outcomeId:existingMeta?existingMeta.outcomeId:predictionMarketDraftGroupR2String_(row.externalMarketId)||("outcome-"+index),outcomeLabel:existingMeta?existingMeta.outcomeLabel:predictionMarketDraftGroupR2String_(row.outcomeLabel||row.marketQuestion||row.externalMarketId),referenceProbability:price,referencePriceAsOf:row.referencePriceAsOf||new Date().toISOString(),referencePriceTrusted:true,providerKind:first.providerKind,providerId:first.providerId,externalMarketId:row.externalMarketId,sourceUrl:row.sourceUrl||detail.sourceUrl,lockTime:row.closeTime||detail.closeTime,category:row.category||detail.category,providerMetadata:{source:"awards-external-markets",externalEventId:first.providerId,eventName:detail.eventName||detail.logicalQuestion,marketQuestion:row.marketQuestion,outcomes:row.outcomes||[],prices:row.prices||{},selectedOutcome:selected,sourceSnapshot:detail.sourceSnapshot||{},providerStatus:row.status||detail.status}};});
    var input={logicalTitle:detail.logicalQuestion||detail.eventName||firstMeta.logicalTitle,logicalQuestion:detail.logicalQuestion||detail.eventName||firstMeta.logicalQuestion,description:detail.contextSubtitle||first.description,category:detail.category||first.category,providerKind:first.providerKind,providerId:first.providerId,sourceUrl:detail.sourceUrl||first.sourceUrl,providerMetadata:Object.assign({},first.providerMetadata||{},{sourceSnapshot:detail.sourceSnapshot||{}}),lockTime:detail.closeTime||first.lockTime,referencePriceAsOf:new Date().toISOString(),referencePriceTrusted:true,outcomes:outcomes};
    return {success:true,group:editDraftGroup(username,groupId,input),detail:detail};
  }

  return { editDraftGroup:editDraftGroup, applyProviderSource:applyProviderSource };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { predictionMarketDraftGroupR2CreateService:predictionMarketDraftGroupR2CreateService };
}
