function getCategoriesSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        CATEGORIES_SHEET
      );

  if (!sh) {

    throw new Error(
      "Categories sheet not found"
    );

  }

  return sh;

}

function getAllCategoriesData_() {

    const sh =
      getCategoriesSheet_();
  
    return sh
      .getDataRange()
      .getValues();
  
  }
  
function updateNomineeId_(
    rowIndex,
    nomineeId
  ){
  
    const sh =
      getCategoriesSheet_();
  
    const headers =
      sh.getRange(
        1,
        1,
        1,
        sh.getLastColumn()
      ).getValues()[0];
  
    const col =
      getCategoriesColumnMap_(
        headers
      );
  
    sh.getRange(
      rowIndex,
      col.nomineeId + 1
    ).setValue(
      nomineeId
    );
  
  }  