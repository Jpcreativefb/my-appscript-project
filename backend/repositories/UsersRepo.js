/* =========================
   USERS REPO
   Signup / contact preference / free notification ready
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

function ensureUsersColumns_(){

  const sh =
    getUsersSheet_();

  let headers =
    sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(h => String(h || "").trim());

  const required = [
    "Username",
    "PIN",
    "IsAdmin",
    "Avatar",
    "ThemeColor",
    "CreatedAt",
    "UsernameKey",
    "Email",
    "EmailKey",
    "Phone",
    "PhoneKey",
    "DisplayName",
    "RealName",
    "AccountStatus",
    "Active",
    "PreferredContactMethod",
    "NotificationOptIn",
    "NotificationChannel",
    "NotificationEmail",
    "NotificationPhone",
    "NotificationOptInAt",
    "NotificationOptOutAt",
    "ResetCodeHash",
    "ResetCodeExpiresAt",
    "ResetRequestedAt",
    "ResetCodeFailedAttempts",
    "SessionToken",
    "SessionExpiresAt",
    "LastLogin",
    "LastUpdated"
  ];

  required.forEach(header => {

    const hasHeader =
      headers.some(existing =>
        existing.toLowerCase() ===
          header.toLowerCase()
      );

    if (!hasHeader) {

      headers.push(header);

      sh
        .getRange(1, headers.length)
        .setValue(header);

    }

  });

  try {
    if (typeof migrateLegacyUserCredentialsV1216_ === "function") {
      migrateLegacyUserCredentialsV1216_();
    }
  } catch (err) {
    // Do not block authentication if the one-time migration is temporarily
    // unable to acquire a lock; legacy verification remains supported.
    Logger.log(
      "Credential migration deferred: " +
      (err && err.message ? err.message : String(err))
    );
  }

  return headers;

}

function getUsersHeaders_(){

  ensureUsersColumns_();

  return getUsersSheet_()
    .getRange(1, 1, 1, getUsersSheet_().getLastColumn())
    .getValues()[0]
    .map(h => String(h || "").trim());

}

function getUserRecordFromRow_(headers, row, rowNumber){

  const obj = {};

  headers.forEach((h, i) => {

    obj[h] = row[i];

  });

  return {
    user: obj,
    row: row,
    rowNumber: rowNumber,
    headers: headers,
    col: getUsersColumnMap_(headers)
  };

}

function getAllUserRecords_(){

  ensureUsersColumns_();

  const data =
    getAllUsersData_();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(h => String(h || "").trim());

  return data
    .slice(1)
    .map((row, index) =>
      getUserRecordFromRow_(
        headers,
        row,
        index + 2
      )
    );

}

function findUserRecordByUsername_(username){

  ensureUsersColumns_();

  const data =
    getAllUsersData_();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h => String(h || "").trim());

  const col =
    getUsersColumnMap_(headers);

  validateUsersColumns_(col);

  const usernameKey =
    buildUsernameKey_(username);

  if (!usernameKey) {
    return null;
  }

  const rows =
    data.slice(1);

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    const rowUsernameKey =
      col.usernameKey > -1
        ? String(row[col.usernameKey] || "").trim()
        : "";

    const fallbackKey =
      buildUsernameKey_(row[col.username]);

    if (
      rowUsernameKey === usernameKey ||
      fallbackKey === usernameKey
    ) {

      return getUserRecordFromRow_(
        headers,
        row,
        i + 2
      );

    }

  }

  return null;

}

function findUserRecordByEmail_(email){

  ensureUsersColumns_();

  const emailKey =
    normalizeEmail_(email);

  if (!emailKey) {
    return null;
  }

  const data =
    getAllUsersData_();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h => String(h || "").trim());

  const col =
    getUsersColumnMap_(headers);

  const rows =
    data.slice(1);

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    const rowEmailKey =
      col.emailKey > -1
        ? normalizeEmail_(row[col.emailKey])
        : "";

    const fallbackEmail =
      col.email > -1
        ? normalizeEmail_(row[col.email])
        : "";

    if (
      rowEmailKey === emailKey ||
      fallbackEmail === emailKey
    ) {

      return getUserRecordFromRow_(
        headers,
        row,
        i + 2
      );

    }

  }

  return null;

}

function findUserRecordByPhone_(phone){

  ensureUsersColumns_();

  const phoneKey =
    buildPhoneKey_(phone);

  if (!phoneKey) {
    return null;
  }

  const data =
    getAllUsersData_();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h => String(h || "").trim());

  const col =
    getUsersColumnMap_(headers);

  const rows =
    data.slice(1);

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    const rowPhoneKey =
      col.phoneKey > -1
        ? buildPhoneKey_(row[col.phoneKey])
        : "";

    const fallbackPhone =
      col.phone > -1
        ? buildPhoneKey_(row[col.phone])
        : "";

    if (
      rowPhoneKey === phoneKey ||
      fallbackPhone === phoneKey
    ) {

      return getUserRecordFromRow_(
        headers,
        row,
        i + 2
      );

    }

  }

  return null;

}

function findUserRecordByIdentifier_(identifier){

  identifier =
    String(identifier || "").trim();

  if (!identifier) {
    return null;
  }

  if (identifier.indexOf("@") > -1) {

    return findUserRecordByEmail_(
      identifier
    );

  }

  const phoneKey =
    buildPhoneKey_(identifier);

  if (phoneKey && phoneKey.length >= 10) {

    const phoneRecord =
      findUserRecordByPhone_(
        identifier
      );

    if (phoneRecord) {
      return phoneRecord;
    }

  }

  return findUserRecordByUsername_(
    identifier
  );

}

function findUserByUsername_(username){

  const record =
    findUserRecordByUsername_(
      username
    );

  return record
    ? record.user
    : null;

}

function updateUserFields_(rowNumber, fields){

  const sh =
    getUsersSheet_();

  const headers =
    getUsersHeaders_();

  const col =
    getUsersColumnMap_(headers);

  Object.keys(fields).forEach(key => {

    const idx =
      getUsersFieldIndex_(
        col,
        key
      );

    if (idx > -1) {

      sh
        .getRange(rowNumber, idx + 1)
        .setValue(fields[key]);

    }

  });

}
