/* =====================================================
   APPS SCRIPT SHEET REPOSITORY
   Explicit setup only. Read paths never create sheets or headers.
===================================================== */

function predictionMarketR2CreateAppsScriptRepository(options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || (typeof SpreadsheetApp !== "undefined" ? SpreadsheetApp.getActive() : null);
  if (!spreadsheet) throw new Error("SpreadsheetApp is unavailable");

  function getSheet(storeName) {
    var sheetName = PREDICTION_MARKET_R2_SHEETS[storeName];
    var sh = spreadsheet.getSheetByName(sheetName);
    if (!sh) throw new Error("Prediction Market storage is not initialized: " + sheetName);
    return sh;
  }

  function setupSheet(storeName) {
    var sheetName = PREDICTION_MARKET_R2_SHEETS[storeName];
    var headers = PREDICTION_MARKET_R2_HEADERS[storeName];
    var sh = spreadsheet.getSheetByName(sheetName);
    var created = false;
    if (!sh) { sh = spreadsheet.insertSheet(sheetName); created = true; }
    var lastColumn = sh.getLastColumn();
    if (lastColumn === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      var existing = sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(v) { return String(v || "").trim(); });
      var missing = headers.filter(function(h) { return existing.indexOf(h) === -1; });
      if (missing.length) sh.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]);
    }
    return { store: storeName, sheetName: sheetName, created: created };
  }

  function headersFor(sh) {
    if (sh.getLastColumn() < 1) return [];
    return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(v) { return String(v || "").trim(); });
  }

  function readRows(storeName) {
    var sh = getSheet(storeName);
    if (sh.getLastRow() < 2) return [];
    var headers = headersFor(sh);
    return sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().map(function(values, index) {
      var row = { __rowNumber: index + 2 };
      headers.forEach(function(h, i) { row[h] = values[i]; });
      return row;
    });
  }

  function findRow(storeName, headerName, key) {
    var rows = readRows(storeName);
    var target = predictionMarketR2String_(key);
    for (var i = 0; i < rows.length; i += 1) {
      if (predictionMarketR2String_(rows[i][headerName]) === target) return rows[i];
    }
    return null;
  }

  function writeRecord(storeName, keyHeader, key, record, toSheet) {
    var sh = getSheet(storeName);
    var headers = headersFor(sh);
    var found = findRow(storeName, keyHeader, key);
    var values = headers.map(function(h) { return toSheet(record)[h]; });
    if (found) sh.getRange(found.__rowNumber, 1, 1, headers.length).setValues([values]);
    else sh.appendRow(values);
    return record;
  }

  function deleteRecord(storeName, keyHeader, key) {
    var found = findRow(storeName, keyHeader, key);
    if (found) getSheet(storeName).deleteRow(found.__rowNumber);
  }

  function parseJson(text, fallback) {
    try { return JSON.parse(String(text || "")); } catch (ignore) { return fallback; }
  }

  function marketFromSheet(r) { return predictionMarketR2NormalizeMarket_({
    marketId:r.MarketId,title:r.Title,description:r.Description,category:r.Category,status:r.Status,
    yesLabel:r.YesLabel,noLabel:r.NoLabel,referenceYesPrice:r.ReferenceYesPrice,referenceNoPrice:r.ReferenceNoPrice,
    referencePriceAsOf:r.ReferencePriceAsOf,referencePriceTrusted:String(r.ReferencePriceTrusted).toLowerCase()==="true",
    providerKind:r.ProviderKind,providerId:r.ProviderId,externalMarketId:r.ExternalMarketId,sourceUrl:r.SourceUrl,
    providerMetadata:parseJson(r.ProviderMetadataJson,{}),openTime:r.OpenTime,lockTime:r.LockTime,
    resolutionStatus:r.ResolutionStatus,winningOutcome:r.WinningOutcome,voided:String(r.Voided).toLowerCase()==="true",
    createdAt:r.CreatedAt,createdBy:r.CreatedBy,updatedAt:r.UpdatedAt,updatedBy:r.UpdatedBy
  }); }
  function marketToSheet(m) { return {
    MarketId:m.marketId,Title:m.title,Description:m.description,Category:m.category,Status:m.status,
    YesLabel:m.yesLabel,NoLabel:m.noLabel,ReferenceYesPrice:m.referenceYesPrice,ReferenceNoPrice:m.referenceNoPrice,
    ReferencePriceAsOf:m.referencePriceAsOf,ReferencePriceTrusted:m.referencePriceTrusted,ProviderKind:m.providerKind,
    ProviderId:m.providerId,ExternalMarketId:m.externalMarketId,SourceUrl:m.sourceUrl,ProviderMetadataJson:JSON.stringify(m.providerMetadata||{}),
    OpenTime:m.openTime,LockTime:m.lockTime,ResolutionStatus:m.resolutionStatus,WinningOutcome:m.winningOutcome,Voided:m.voided,
    CreatedAt:m.createdAt,CreatedBy:m.createdBy,UpdatedAt:m.updatedAt,UpdatedBy:m.updatedBy
  }; }
  function walletFromSheet(r) { return predictionMarketR2NormalizeWallet_({playerId:r.PlayerId,availableCredits:r.AvailableCredits,reservedCredits:r.ReservedCredits,version:r.Version,createdAt:r.CreatedAt,createdBy:r.CreatedBy,updatedAt:r.UpdatedAt,updatedBy:r.UpdatedBy}); }
  function walletToSheet(w) { return {PlayerId:w.playerId,AvailableCredits:w.availableCredits,ReservedCredits:w.reservedCredits,Version:w.version,CreatedAt:w.createdAt,CreatedBy:w.createdBy,UpdatedAt:w.updatedAt,UpdatedBy:w.updatedBy}; }
  function positionFromSheet(r) { return predictionMarketR2NormalizePosition_({playerId:r.PlayerId,marketId:r.MarketId,outcome:r.Outcome,quantity:r.Quantity,costBasisCredits:r.CostBasisCredits,averageCostCredits:r.AverageCostCredits,realizedCredits:r.RealizedCredits,settledCredits:r.SettledCredits,settledCostBasisCredits:r.SettledCostBasisCredits,settled:String(r.Settled).toLowerCase()==="true",createdAt:r.CreatedAt,updatedAt:r.UpdatedAt}); }
  function positionToSheet(p) { return {PlayerId:p.playerId,MarketId:p.marketId,Outcome:p.outcome,Quantity:p.quantity,CostBasisCredits:p.costBasisCredits,AverageCostCredits:p.averageCostCredits,RealizedCredits:p.realizedCredits,SettledCredits:p.settledCredits,SettledCostBasisCredits:p.settledCostBasisCredits,Settled:p.settled,CreatedAt:p.createdAt,UpdatedAt:p.updatedAt}; }
  function txFromSheet(r) { return {transactionId:r.TransactionId,fingerprint:r.Fingerprint,playerId:r.PlayerId,marketId:r.MarketId,side:r.Side,outcome:r.Outcome,quantity:Number(r.Quantity),executionReferencePrice:Number(r.ExecutionReferencePrice),grossCredits:Number(r.GrossCredits),status:r.Status,walletVersionBefore:Number(r.WalletVersionBefore),walletVersionAfter:Number(r.WalletVersionAfter),requestedAt:r.RequestedAt,committedAt:r.CommittedAt,committedResult:parseJson(r.CommittedResultJson,null)}; }
  function txToSheet(t) { return {TransactionId:t.transactionId,Fingerprint:t.fingerprint,PlayerId:t.playerId,MarketId:t.marketId,Side:t.side,Outcome:t.outcome,Quantity:t.quantity,ExecutionReferencePrice:t.executionReferencePrice,GrossCredits:t.grossCredits,Status:t.status,WalletVersionBefore:t.walletVersionBefore,WalletVersionAfter:t.walletVersionAfter,RequestedAt:t.requestedAt,CommittedAt:t.committedAt,CommittedResultJson:JSON.stringify(t.committedResult||{})}; }
  function settlementFromSheet(r) { return {settlementKey:r.SettlementKey,marketId:r.MarketId,playerId:r.PlayerId,marketStatus:r.MarketStatus,winningOutcome:r.WinningOutcome,payoutCredits:Number(r.PayoutCredits),returnedCostBasisCredits:Number(r.ReturnedCostBasisCredits),walletVersionBefore:Number(r.WalletVersionBefore),walletVersionAfter:Number(r.WalletVersionAfter),positionResults:parseJson(r.PositionResultsJson,[]),status:r.Status||"COMMITTED",committedAt:r.CommittedAt,committedResult:parseJson(r.CommittedResultJson,null)}; }
  function settlementToSheet(s) { return {SettlementKey:s.settlementKey,MarketId:s.marketId,PlayerId:s.playerId,MarketStatus:s.marketStatus,WinningOutcome:s.winningOutcome,PayoutCredits:s.payoutCredits,ReturnedCostBasisCredits:s.returnedCostBasisCredits,WalletVersionBefore:s.walletVersionBefore,WalletVersionAfter:s.walletVersionAfter,PositionResultsJson:JSON.stringify(s.positionResults||[]),Status:s.status||"COMMITTED",CommittedAt:s.committedAt,CommittedResultJson:JSON.stringify(s.committedResult||{})}; }

  function criticalSection(fn) {
    var lock = (typeof LockService !== "undefined") ? (LockService.getDocumentLock() || LockService.getScriptLock()) : null;
    if (!lock) return fn();
    if (!lock.tryLock(Number(opts.lockTimeoutMs || PREDICTION_MARKET_R2_CONFIG.lockTimeoutMs))) throw new Error("Prediction Market storage is busy; retry safely with the same transactionId");
    try { return fn(); } finally { lock.releaseLock(); }
  }

  function setupStore(storeName) {
    if (!Object.prototype.hasOwnProperty.call(PREDICTION_MARKET_R2_SHEETS, storeName)) {
      throw new Error("Unknown Prediction Market store: " + storeName);
    }

    return criticalSection(function() {
      return setupSheet(storeName);
    });
  }

  function setup() {
    return criticalSection(function() {
      return Object.keys(PREDICTION_MARKET_R2_SHEETS).map(setupSheet);
    });
  }

  function getMarket(id) { var r=findRow("markets","MarketId",id); return r?marketFromSheet(r):null; }
  function listMarkets() { return readRows("markets").map(marketFromSheet); }
  function saveMarket(m) { return writeRecord("markets","MarketId",m.marketId,m,marketToSheet); }
  function getWallet(id) { var r=findRow("wallets","PlayerId",id); return r?walletFromSheet(r):null; }
  function listWallets() { return readRows("wallets").map(walletFromSheet); }
  function saveWallet(w) { return writeRecord("wallets","PlayerId",w.playerId,w,walletToSheet); }
  function getTransaction(id) { var r=findRow("transactions","TransactionId",id); return r?txFromSheet(r):null; }
  function saveTransaction(t) { return writeRecord("transactions","TransactionId",t.transactionId,t,txToSheet); }
  function getPosition(playerId,marketId,outcome) { var key=predictionMarketR2PositionKey_(playerId,marketId,outcome); var rows=readRows("positions"); for(var i=0;i<rows.length;i+=1){ if(predictionMarketR2PositionKey_(rows[i].PlayerId,rows[i].MarketId,rows[i].Outcome)===key)return positionFromSheet(rows[i]); } return null; }
  function listPositionsByPlayer(playerId) { return readRows("positions").filter(function(r){return predictionMarketR2String_(r.PlayerId)===playerId;}).map(positionFromSheet); }
  function listPositionsByPlayerMarket(playerId,marketId) { return readRows("positions").filter(function(r){return predictionMarketR2String_(r.PlayerId)===playerId&&predictionMarketR2String_(r.MarketId)===marketId;}).map(positionFromSheet); }
  function savePosition(p) { var key=predictionMarketR2PositionKey_(p.playerId,p.marketId,p.outcome); var rows=readRows("positions"), found=null; for(var i=0;i<rows.length;i+=1){if(predictionMarketR2PositionKey_(rows[i].PlayerId,rows[i].MarketId,rows[i].Outcome)===key){found=rows[i];break;}} var sh=getSheet("positions"),headers=headersFor(sh),values=headers.map(function(h){return positionToSheet(p)[h];}); if(found)sh.getRange(found.__rowNumber,1,1,headers.length).setValues([values]); else sh.appendRow(values); return p; }
  function deletePosition(playerId,marketId,outcome) { var key=predictionMarketR2PositionKey_(playerId,marketId,outcome); var rows=readRows("positions"); for(var i=0;i<rows.length;i+=1){if(predictionMarketR2PositionKey_(rows[i].PlayerId,rows[i].MarketId,rows[i].Outcome)===key){getSheet("positions").deleteRow(rows[i].__rowNumber);return true;}} return false; }
  function getSettlement(key) { var r=findRow("settlements","SettlementKey",key); return r?settlementFromSheet(r):null; }
  function saveSettlement(s) { return writeRecord("settlements","SettlementKey",s.settlementKey,s,settlementToSheet); }

  function commitTrade(payload) {
    if (getTransaction(payload.transaction.transactionId)) throw new Error("transactionId already exists");
    var oldWallet = getWallet(payload.wallet.playerId);
    var oldPosition = getPosition(payload.position.playerId,payload.position.marketId,payload.position.outcome);
    try {
      saveTransaction(Object.assign({}, payload.transaction, { status:"PENDING" }));
      saveWallet(payload.wallet);
      savePosition(payload.position);
      saveTransaction(payload.transaction);
      if (typeof SpreadsheetApp !== "undefined") SpreadsheetApp.flush();
      return payload.transaction;
    } catch (err) {
      try { if (oldWallet) saveWallet(oldWallet); } catch(ignore1) {}
      try { if (oldPosition) savePosition(oldPosition); else deletePosition(payload.position.playerId,payload.position.marketId,payload.position.outcome); } catch(ignore2) {}
      try { deleteRecord("transactions","TransactionId",payload.transaction.transactionId); } catch(ignore3) {}
      throw err;
    }
  }

  function recoverPendingTrade(row) {
    if (!row || !row.committedResult) throw new Error("Pending transaction cannot be recovered");
    saveWallet(row.committedResult.wallet);
    savePosition(row.committedResult.position);
    row.status = "COMMITTED";
    saveTransaction(row);
    if (typeof SpreadsheetApp !== "undefined") SpreadsheetApp.flush();
    return row;
  }

  function recoverPendingSettlement(row) {
    if (!row || !row.committedResult) throw new Error("Pending settlement cannot be recovered");
    saveWallet(row.committedResult.wallet);
    (row.committedResult.positions || []).forEach(savePosition);
    row.status = "COMMITTED";
    saveSettlement(row);
    if (typeof SpreadsheetApp !== "undefined") SpreadsheetApp.flush();
    return row;
  }

  function commitSettlement(payload) {
    if (getSettlement(payload.settlement.settlementKey)) throw new Error("settlement already exists");
    var oldWallet = getWallet(payload.wallet.playerId);
    var oldPositions = payload.positions.map(function(p){return getPosition(p.playerId,p.marketId,p.outcome);});
    try {
      saveSettlement(Object.assign({}, payload.settlement, { status:"PENDING" }));
      saveWallet(payload.wallet);
      payload.positions.forEach(savePosition);
      saveSettlement(payload.settlement);
      if (typeof SpreadsheetApp !== "undefined") SpreadsheetApp.flush();
      return payload.settlement;
    } catch (err) {
      try { if(oldWallet)saveWallet(oldWallet); } catch(ignore1) {}
      payload.positions.forEach(function(p,index){ try{ if(oldPositions[index])savePosition(oldPositions[index]); else deletePosition(p.playerId,p.marketId,p.outcome); }catch(ignore2){} });
      try { deleteRecord("settlements","SettlementKey",payload.settlement.settlementKey); } catch(ignore3) {}
      throw err;
    }
  }

  return {kind:"APPS_SCRIPT_SHEETS",setup:setup,setupStore:setupStore,criticalSection:criticalSection,getMarket:getMarket,listMarkets:listMarkets,saveMarket:saveMarket,getWallet:getWallet,listWallets:listWallets,saveWallet:saveWallet,getTransaction:getTransaction,saveTransaction:saveTransaction,getPosition:getPosition,listPositionsByPlayer:listPositionsByPlayer,listPositionsByPlayerMarket:listPositionsByPlayerMarket,savePosition:savePosition,deletePosition:deletePosition,getSettlement:getSettlement,saveSettlement:saveSettlement,recoverPendingTrade:recoverPendingTrade,recoverPendingSettlement:recoverPendingSettlement,commitTrade:commitTrade,commitSettlement:commitSettlement};
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { predictionMarketR2CreateAppsScriptRepository: predictionMarketR2CreateAppsScriptRepository };
}
