/* =====================================================
   PREDICTION MARKET MULTI-OUTCOME ADMIN AUTHORITY R2

   Backend/Admin surface for the schema-neutral multi-outcome coordinator.
   Trading, wallet, position, fee and settlement writes remain owned by the
   accepted PredictionMarketEngineR2 authority.
===================================================== */

function predictionMarketAdminMultiOutcomeR2Module_() {
  if (typeof predictionMarketMultiOutcomeR2CreateCoordinator === "function") {
    return {
      createCoordinator: predictionMarketMultiOutcomeR2CreateCoordinator,
      mergeProviderMetadata: predictionMarketMultiOutcomeR2MergeProviderMetadata_
    };
  }
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    var required = require("../engines/PredictionMarketMultiOutcomeR2.js");
    return {
      createCoordinator: required.predictionMarketMultiOutcomeR2CreateCoordinator,
      mergeProviderMetadata: required.predictionMarketMultiOutcomeR2MergeProviderMetadata_
    };
  }
  throw new Error("Prediction Market multi-outcome R2 authority is unavailable");
}

function predictionMarketAdminMultiOutcomeR2Context_(username) {
  username = String(username == null ? "" : username).trim();
  if (!username) throw new Error("Authenticated Admin username is required");
  return { role: "ADMIN", playerId: username, username: username };
}

function predictionMarketAdminMultiOutcomeR2CreateService(options) {
  options = options || {};
  var engine = options.engine;
  if (!engine) throw new Error("Prediction Market R2 engine is required");
  var multi = predictionMarketAdminMultiOutcomeR2Module_();
  var coordinator = multi.createCoordinator({ engine:engine, idFactory:options.idFactory });

  function createDraftGroup(username, payload) {
    payload = Object.assign({}, payload || {}, { marketType:"MULTI_OUTCOME" });
    var result = coordinator.createDraftGroup(predictionMarketAdminMultiOutcomeR2Context_(username), payload);
    return { success:true, group:result };
  }

  function resolveGroup(username, payload) {
    payload = payload || {};
    var groupId = payload.logicalMarketId || payload.groupMarketId;
    var result = coordinator.resolveGroup(
      predictionMarketAdminMultiOutcomeR2Context_(username),
      groupId,
      payload.winningOutcomeId
    );
    return { success:true, group:result };
  }

  function voidGroup(username, payload) {
    payload = payload || {};
    var groupId = payload.logicalMarketId || payload.groupMarketId;
    var result = coordinator.voidGroup(predictionMarketAdminMultiOutcomeR2Context_(username), groupId);
    return { success:true, group:result };
  }

  function mergeProviderMetadata(currentMetadata, refreshedMetadata) {
    return multi.mergeProviderMetadata(currentMetadata || {}, refreshedMetadata || {});
  }

  return {
    createDraftGroup:createDraftGroup,
    resolveGroup:resolveGroup,
    voidGroup:voidGroup,
    mergeProviderMetadata:mergeProviderMetadata,
    coordinator:coordinator
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketAdminMultiOutcomeR2CreateService: predictionMarketAdminMultiOutcomeR2CreateService,
    predictionMarketAdminMultiOutcomeR2Context_: predictionMarketAdminMultiOutcomeR2Context_
  };
}
