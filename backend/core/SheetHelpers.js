/* =========================
   SHEET HELPERS
========================= */

function getSheetOrThrow_(
  sheetName
){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        sheetName
      );

  if (!sh) {

    throw new Error(
      "Missing sheet: " +
      sheetName
    );

  }

  return sh;

}