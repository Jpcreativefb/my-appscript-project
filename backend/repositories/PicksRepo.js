function getPicksSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(PICKS_SHEET);

  if (!sh) {
    throw new Error(
      "Picks sheet not found"
    );
  }

  return sh;

}

function getAllPicks(){

  return getAllPicksData_();

}

function getAllPicksData_(){

  if (typeof getSheetDataCached === "function") {
    return getSheetDataCached(
      PICKS_SHEET
    );
  }

  const sh =
    getPicksSheet_();

  return sh
    .getDataRange()
    .getValues();

}


function getPicksDataForGame_(gameId){

  gameId = String(gameId || "").trim();

  if (!gameId) {
    return getAllPicksData_();
  }

  if (typeof normalizedStorageReadRowsByGame_ === "function") {
    return normalizedStorageReadRowsByGame_(
      PICKS_SHEET,
      gameId,
      "Picks",
      {
        trustIndex: true
      }
    );
  }

  const data = getAllPicksData_();

  if (!data || data.length <= 1) {
    return data || [];
  }

  const headers = data[0];
  const gameIdCol = headers.indexOf("GameId");

  if (gameIdCol === -1) {
    return data;
  }

  return [headers].concat(
    data.slice(1).filter(function(row) {
      return String(row[gameIdCol] || "").trim() === gameId;
    })
  );

}

function appendPickRow_(row){

  const sh =
    getPicksSheet_();

  sh.appendRow(row);

  const rowNumber = sh.getLastRow();

  // Keep the normalized game index current without rebuilding the whole sheet.
  if (
    typeof normalizedStorageGetIndexEntry_ === "function" &&
    typeof normalizedStorageUpsertIndexEntry_ === "function"
  ) {
    try {
      const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      const gameIdColumn = picksRepoHeaderIndex_(headers, ["GameId"]);
      const gameId = gameIdColumn === -1
        ? ""
        : String((row || [])[gameIdColumn] || "").trim();
      if (gameId) {
        const prior = normalizedStorageGetIndexEntry_("Picks", gameId);
        const rows = prior && Array.isArray(prior.rowNumbers)
          ? prior.rowNumbers.slice()
          : [];
        if (rows.indexOf(rowNumber) === -1) rows.push(rowNumber);
        normalizedStorageUpsertIndexEntry_({
          entityType: "Picks",
          gameId: gameId,
          sheetName: PICKS_SHEET,
          rowNumbers: rows
        });
      }
    } catch (indexError) {
      Logger.log("Pick index update skipped: " + indexError);
    }
  }

  return rowNumber;

}

function updatePickCell_(
  row,
  col,
  value
){

  const sh =
    getPicksSheet_();

  sh.getRange(row, col)
    .setValue(value);

}


function picksRepoNormalize_(value){
  return String(value === undefined || value === null ? "" : value)
    .trim()
    .toLowerCase();
}

function picksRepoHeaderIndex_(headers, names){
  const normalized = (headers || []).map(picksRepoNormalize_);
  for (let index = 0; index < names.length; index++) {
    const match = normalized.indexOf(picksRepoNormalize_(names[index]));
    if (match !== -1) return match;
  }
  return -1;
}

function picksRepoRowCacheKey_(gameId, username, categoryId){
  const raw = [gameId, username, categoryId].map(picksRepoNormalize_).join("|");
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw)
    .map(function(byte){ return (byte + 256).toString(16).slice(-2); })
    .join("");
  return "pick_row_" + digest;
}

function findPickRecord_(gameId, username, categoryId){
  const sh = getPicksSheet_();
  const lastColumn = sh.getLastColumn();
  if (sh.getLastRow() <= 1 || lastColumn <= 0) return null;

  const headers = sh.getRange(1, 1, 1, lastColumn).getValues()[0];
  const gameCol = picksRepoHeaderIndex_(headers, ["GameId"]);
  const userCol = picksRepoHeaderIndex_(headers, ["Username", "User"]);
  const categoryCol = picksRepoHeaderIndex_(headers, ["CategoryId", "Category"]);
  if (gameCol === -1 || userCol === -1 || categoryCol === -1) return null;

  const targetGame = String(gameId || "").trim();
  const targetUser = picksRepoNormalize_(username);
  const targetCategory = picksRepoNormalize_(categoryId);
  const cache = CacheService.getScriptCache();
  const cacheKey = picksRepoRowCacheKey_(targetGame, targetUser, targetCategory);
  const cachedRow = Number(cache.get(cacheKey) || 0);

  function validateRow(rowNumber){
    if (rowNumber <= 1 || rowNumber > sh.getLastRow()) return null;
    const row = sh.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
    if (
      String(row[gameCol] || "").trim() === targetGame &&
      picksRepoNormalize_(row[userCol]) === targetUser &&
      picksRepoNormalize_(row[categoryCol]) === targetCategory
    ) {
      cache.put(cacheKey, String(rowNumber), 21600);
      return { rowNumber: rowNumber, row: row, headers: headers };
    }
    return null;
  }

  const cached = validateRow(cachedRow);
  if (cached) return cached;

  let rowNumbers = [];
  if (typeof normalizedStorageGetIndexEntry_ === "function") {
    try {
      const entry = normalizedStorageGetIndexEntry_("Picks", targetGame);
      if (entry && Array.isArray(entry.rowNumbers)) rowNumbers = entry.rowNumbers.slice();
    } catch (indexError) {
      rowNumbers = [];
    }
  }

  if (!rowNumbers.length && typeof normalizedStorageFindRowsByGame_ === "function") {
    try {
      rowNumbers = normalizedStorageFindRowsByGame_(sh, targetGame);
      if (typeof normalizedStorageUpsertIndexEntry_ === "function") {
        normalizedStorageUpsertIndexEntry_({
          entityType: "Picks",
          gameId: targetGame,
          sheetName: PICKS_SHEET,
          rowNumbers: rowNumbers
        });
      }
    } catch (indexBuildError) {
      rowNumbers = [];
    }
  }

  for (let index = 0; index < rowNumbers.length; index++) {
    const found = validateRow(Number(rowNumbers[index]));
    if (found) return found;
  }

  // Safe fallback for projects where DataIndex has not been initialized yet.
  const matches = sh.getRange(2, categoryCol + 1, sh.getLastRow() - 1, 1)
    .createTextFinder(String(categoryId || ""))
    .matchEntireCell(true)
    .findAll();
  for (let index = 0; index < matches.length; index++) {
    const found = validateRow(matches[index].getRow());
    if (found) return found;
  }

  return null;
}

/* =========================
   PICKS REPOSITORY API
========================= */

var PicksRepo = {

  getAllPicks: function(){

    return getAllPicks();

  },

  getPicksForGame: function(gameId){

    return getPicksDataForGame_(gameId);

  },

  findPick: function(gameId, username, categoryId){

    return findPickRecord_(gameId, username, categoryId);

  },

  updatePick: function(rowNumber, updates){

    if (!rowNumber || rowNumber < 1) {

      throw new Error(
        "Invalid pick row number"
      );

    }

    if (!updates || typeof updates !== "object") {

      throw new Error(
        "Invalid pick update payload"
      );

    }

    const sh = getPicksSheet_();
    const lastColumn = sh.getLastColumn();
    const range = sh.getRange(rowNumber, 1, 1, lastColumn);
    const row = range.getValues()[0];

    Object.entries(updates).forEach(function(entry) {
      const columnNumber = Number(entry[0]);
      if (columnNumber >= 1 && columnNumber <= lastColumn) {
        row[columnNumber - 1] = entry[1];
      }
    });

    range.setValues([row]);
    return true;

  },

  insertPick: function(row){

    return appendPickRow_(row);

  },

  flush: function(){

    SpreadsheetApp.flush();

    return true;

  }

};