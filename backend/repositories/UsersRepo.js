/* =========================
   USERS REPO
========================= */

function getUsersSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        USERS_SHEET
      );

  if (!sh) {

    throw new Error(
      "Users sheet not found"
    );

  }

  return sh;

}

function getAllUsersData_(){

  return getUsersSheet_()
    .getDataRange()
    .getValues();

}

function appendUserRow_(row){

  getUsersSheet_()
    .appendRow(row);

}

function findUserByUsername_(username){

  const data =
    getAllUsersData_();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const rows =
    data.slice(1);

  const col =
    getUsersColumnMap_(
      headers
    );

  validateUsersColumns_(
    col
  );

  const userSearch =
    normalizeUsername_(
      username
    );

  const row =
    rows.find(r =>

      normalizeUsername_(
        r[col.username]
      ) === userSearch

    );

  if (!row) {
    return null;
  }

  const obj = {};

  headers.forEach((h, i) => {

    obj[h] = row[i];

  });

  return obj;

}