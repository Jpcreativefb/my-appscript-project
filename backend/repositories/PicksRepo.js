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

  updatePick: function(rowNumber, colNumber, value){

    return updatePickCell_(
      rowNumber,
      colNumber,
      value
    );

  },

  insertPick: function(row){

    return appendPickRow_(row);

  },

  flush: function(){

    SpreadsheetApp.flush();

    return true;

  }

};