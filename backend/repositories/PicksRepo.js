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
        trustIndex: false
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

    Object.entries(updates)
      .forEach(([colNumber, value]) => {

        updatePickCell_(
          rowNumber,
          Number(colNumber),
          value
        );

      });

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