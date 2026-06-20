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

  const sh =
    getPicksSheet_();

  return sh
    .getDataRange()
    .getValues();

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