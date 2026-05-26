/* =========================
   PROFILE ENGINE

   Profiles are game-specific.

   Stable account identity:
   Username

   Public display identity:
   DisplayName per GameId
========================= */

const PROFILES_SHEET =
  "Profiles";

/* =========================
   HELPERS
========================= */

function normalizeProfileUsername_(
  value
){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeProfileGameId_(
  value
){

  return String(
    value ||
    getDefaultGameId()
  ).trim();

}

function getProfilesSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        PROFILES_SHEET
      );

  if (!sh) {

    throw new Error(
      "Profiles sheet missing"
    );

  }

  return sh;

}

function getProfilesColumnMap_(
  headers
){

  return {
    username:
      headers.indexOf("Username"),

    gameId:
      headers.indexOf("GameId"),

    displayName:
      headers.indexOf("DisplayName"),

    avatar:
      headers.indexOf("Avatar"),

    themeColor:
      headers.indexOf("ThemeColor"),

    createdAt:
      headers.indexOf("CreatedAt"),

    updatedAt:
      headers.indexOf("UpdatedAt")
  };

}

function validateProfilesColumns_(
  col
){

  const missing = [];

  Object.entries(col)
    .forEach(([key, value]) => {

      if (value === -1) {
        missing.push(key);
      }

    });

  if (missing.length) {

    throw new Error(
      "Missing Profiles columns: " +
      missing.join(", ")
    );

  }

}

/* =========================
   DEFAULT PROFILE
========================= */

function buildDefaultProfile_(
  username,
  gameId
){

  return {
    username:
      username,

    gameId:
      gameId,

    displayName:
      username,

    avatar:
      "default",

    themeColor:
      "#354785"
  };

}

/* =========================
   GET USER PROFILE
========================= */

function getUserProfile(
  username,
  gameId
){

  if (!username) {
    return null;
  }

  gameId =
    normalizeProfileGameId_(
      gameId
    );

  const sh =
    getProfilesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return buildDefaultProfile_(
      username,
      gameId
    );

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getProfilesColumnMap_(
      headers
    );

  validateProfilesColumns_(
    col
  );

  const targetUsername =
    normalizeProfileUsername_(
      username
    );

  const targetGameId =
    normalizeProfileGameId_(
      gameId
    );

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowUsername =
      normalizeProfileUsername_(
        row[col.username]
      );

    const rowGameId =
      normalizeProfileGameId_(
        row[col.gameId]
      );

    if (
      rowUsername === targetUsername &&
      rowGameId === targetGameId
    ) {

      return {
        username:
          row[col.username] ||
          username,

        gameId:
          row[col.gameId] ||
          gameId,

        displayName:
          row[col.displayName] ||
          username,

        avatar:
          row[col.avatar] ||
          "default",

        themeColor:
          row[col.themeColor] ||
          "#354785"
      };

    }

  }

  return buildDefaultProfile_(
    username,
    gameId
  );

}

/* =========================
   SAVE USER PROFILE
========================= */

function saveUserProfile(
  profile
){

  if (
    !profile ||
    !profile.username
  ) {

    throw new Error(
      "Invalid profile payload"
    );

  }

  const username =
    String(profile.username || "")
      .trim();

  const gameId =
    normalizeProfileGameId_(
      profile.gameId
    );

  const displayName =
    String(
      profile.displayName ||
      username
    ).trim();

  const avatar =
    String(
      profile.avatar ||
      "default"
    ).trim();

  const themeColor =
    String(
      profile.themeColor ||
      "#354785"
    ).trim();

  const sh =
    getProfilesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (!data.length) {

    throw new Error(
      "Profiles sheet has no headers"
    );

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getProfilesColumnMap_(
      headers
    );

  validateProfilesColumns_(
    col
  );

  const now =
    new Date();

  const targetUsername =
    normalizeProfileUsername_(
      username
    );

  const targetGameId =
    normalizeProfileGameId_(
      gameId
    );

  let rowIndex =
    -1;

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowUsername =
      normalizeProfileUsername_(
        row[col.username]
      );

    const rowGameId =
      normalizeProfileGameId_(
        row[col.gameId]
      );

    if (
      rowUsername === targetUsername &&
      rowGameId === targetGameId
    ) {

      rowIndex =
        i + 1;

      break;

    }

  }

  if (rowIndex === -1) {

    const row =
      new Array(headers.length)
        .fill("");

    row[col.username] =
      username;

    row[col.gameId] =
      gameId;

    row[col.displayName] =
      displayName;

    row[col.avatar] =
      avatar;

    row[col.themeColor] =
      themeColor;

    row[col.createdAt] =
      now;

    row[col.updatedAt] =
      now;

    sh.appendRow(
      row
    );

  } else {

    sh.getRange(
      rowIndex,
      col.displayName + 1
    ).setValue(
      displayName
    );

    sh.getRange(
      rowIndex,
      col.avatar + 1
    ).setValue(
      avatar
    );

    sh.getRange(
      rowIndex,
      col.themeColor + 1
    ).setValue(
      themeColor
    );

    sh.getRange(
      rowIndex,
      col.updatedAt + 1
    ).setValue(
      now
    );

  }

  return {
    success: true,
    username: username,
    gameId: gameId,
    displayName: displayName,
    avatar: avatar,
    themeColor: themeColor
  };

}