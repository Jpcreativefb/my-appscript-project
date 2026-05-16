/* =========================
   CATEGORY SETTINGS
   MULTIGAME PRODUCTION VERSION

   REQUIRED SHEET HEADERS

   GameId
   CategoryId
   Points
   Locked
   WinnerNomineeId
   ChangePenalty
   MaxChanges
   LockDateTime
   DisplayOrder
   GroupId
   ParentCategoryId
   FollowUpCategoryId
   FollowUpMapJSON
   LayoutType
   ShortName
   CountsAsStatue
   ScoreVersion
   FavoriteNomineeId
========================= */

/* =========================================================
   HELPERS
========================================================= */

function getCategorySettingsSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        CATEGORY_SETTINGS_SHEET
      );

  if (!sh) {

    throw new Error(
      "CategorySettings sheet not found"
    );

  }

  return sh;

}

function normalizeCategoryId_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeGameId_(value){

  return String(value || "")
    .trim();

}

function getCategorySettingsColumnMap_(headers){

  return {

    gameId:
      headers.indexOf("GameId"),

    categoryId:
      headers.indexOf("CategoryId"),

    points:
      headers.indexOf("Points"),

    locked:
      headers.indexOf("Locked"),

    winnerNomineeId:
      headers.indexOf("WinnerNomineeId"),

    changePenalty:
      headers.indexOf("ChangePenalty"),

    maxChanges:
      headers.indexOf("MaxChanges"),

    lockDateTime:
      headers.indexOf("LockDateTime"),

    displayOrder:
      headers.indexOf("DisplayOrder"),

    groupId:
      headers.indexOf("GroupId"),

    parentCategoryId:
      headers.indexOf("ParentCategoryId"),

    followUpCategoryId:
      headers.indexOf("FollowUpCategoryId"),

    followUpMapJSON:
      headers.indexOf("FollowUpMapJSON"),

    layoutType:
      headers.indexOf("LayoutType"),

    shortName:
      headers.indexOf("ShortName"),

    countsAsStatue:
      headers.indexOf("CountsAsStatue"),

    scoreVersion:
      headers.indexOf("ScoreVersion"),

    favoriteNomineeId:
      headers.indexOf("FavoriteNomineeId")

  };

}

function validateCategorySettingsColumns_(col){

  const required = [
    "gameId",
    "categoryId",
    "points",
    "locked"
  ];

  const missing =
    required.filter(
      key => col[key] === -1
    );

  if (missing.length) {

    throw new Error(
      "Missing CategorySettings headers: " +
      missing.join(", ")
    );

  }

}

/* =========================================================
   GET CATEGORY SETTINGS
========================================================= */

function getCategorySettings(gameId){

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  const sh =
    getCategorySettingsSheet_();

  const values =
    sh.getDataRange().getValues();

  if (values.length <= 1) {
    return {};
  }

  const headers =
    values[0].map(h =>
      String(h).trim()
    );

  const col =
    getCategorySettingsColumnMap_(
      headers
    );

  validateCategorySettingsColumns_(
    col
  );

  const map = {};

  for (let r = 1; r < values.length; r++) {

    const row = values[r];

    const rowGameId =
      normalizeGameId_(
        row[col.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    const categoryId =
      normalizeCategoryId_(
        row[col.categoryId]
      );

    if (!categoryId) {
      continue;
    }

    /* =========================
       SAFE LOCK DATE PARSE
    ========================= */

    let lockISO = null;

    const rawLock =
      row[col.lockDateTime];

    if (rawLock) {

      try {

        lockISO =
          new Date(rawLock)
            .toISOString();

      } catch (err) {

        lockISO = null;

      }

    }

    const item = {

      gameId: gameId,

      categoryId: categoryId,

      points:
        Number(
          row[col.points]
        ) || 0,

      locked:
        row[col.locked] === true ||

        String(
          row[col.locked]
        ).toLowerCase() === "true",

      winnerNomineeId:
        String(
          row[col.winnerNomineeId] || ""
        ).trim(),

      changePenalty:
        Number(
          row[col.changePenalty]
        ) || 0,

      maxChanges:
        Number(
          row[col.maxChanges]
        ) || 0,

      lockDateTime:
        lockISO,

      // backward compatibility
      lockTime:
        lockISO,

      displayOrder:
        Number(
          row[col.displayOrder]
        ) || 999,

      groupId:
        String(
          row[col.groupId] || ""
        ).trim(),

      parentCategoryId:
        String(
          row[col.parentCategoryId] || ""
        ).trim(),

      followUpCategoryId:
        String(
          row[col.followUpCategoryId] || ""
        ).trim(),

      followUpMapJSON:
        String(
          row[col.followUpMapJSON] || ""
        ).trim(),

      layoutType:
        String(
          row[col.layoutType] || ""
        ).trim() || "image",

      shortName:
        String(
          row[col.shortName] || ""
        ).trim(),

      countsAsStatue:
        row[col.countsAsStatue] === true ||

        String(
          row[col.countsAsStatue]
        ).toLowerCase() === "true",

      scoreVersion:
        String(
          row[col.scoreVersion] || ""
        ).trim(),

      favoriteNomineeId:
        String(
          row[col.favoriteNomineeId] || ""
        ).trim()

    };

    map[categoryId] = item;

  }

  Logger.log(
    "CategorySettings loaded for game: " +
    gameId
  );

  return map;

}

/* =========================================================
   SAVE CATEGORY SETTINGS
   MULTIGAME SAFE
========================================================= */

function saveCategorySettings(
  gameId,
  payload
){

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  if (!payload) {

    throw new Error(
      "Category settings payload missing"
    );

  }

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sh =
      getCategorySettingsSheet_();

    const data =
      sh.getDataRange().getValues();

    if (data.length === 0) {

      throw new Error(
        "CategorySettings sheet empty"
      );

    }

    const headers =
      data[0].map(h =>
        String(h).trim()
      );

    const col =
      getCategorySettingsColumnMap_(
        headers
      );

    validateCategorySettingsColumns_(
      col
    );

    /* =========================
       REMOVE OLD GAME ROWS
    ========================= */

    const keepRows = [
      data[0]
    ];

    for (let i = 1; i < data.length; i++) {

      const row = data[i];

      const rowGameId =
        normalizeGameId_(
          row[col.gameId]
        );

      if (rowGameId !== gameId) {
        keepRows.push(row);
      }

    }

    /* =========================
       ADD NEW GAME ROWS
    ========================= */

    Object.keys(payload).forEach(id => {

      const c =
        payload[id] || {};

      const row =
        new Array(headers.length)
          .fill("");

      row[col.gameId] =
        gameId;

      row[col.categoryId] =
        normalizeCategoryId_(id);

      row[col.points] =
        Number(c.points) || 0;

      row[col.locked] =
        c.locked === true;

      row[col.winnerNomineeId] =
        c.winnerNomineeId || "";

      row[col.changePenalty] =
        Number(c.changePenalty) || 0;

      row[col.maxChanges] =
        Number(c.maxChanges) || 0;

      row[col.lockDateTime] =
        c.lockDateTime || "";

      row[col.displayOrder] =
        Number(c.displayOrder) || 999;

      row[col.groupId] =
        c.groupId || "";

      row[col.parentCategoryId] =
        c.parentCategoryId || "";

      row[col.followUpCategoryId] =
        c.followUpCategoryId || "";

      row[col.followUpMapJSON] =
        c.followUpMapJSON || "";

      row[col.layoutType] =
        c.layoutType || "image";

      row[col.shortName] =
        c.shortName || "";

      row[col.countsAsStatue] =
        c.countsAsStatue === true;

      row[col.scoreVersion] =
        c.scoreVersion || "";

      row[col.favoriteNomineeId] =
        c.favoriteNomineeId || "";

      keepRows.push(row);

    });

    /* =========================
       REWRITE SHEET
    ========================= */

    sh.clearContents();

    sh.getRange(
      1,
      1,
      keepRows.length,
      headers.length
    ).setValues(keepRows);

    SpreadsheetApp.flush();

    if (
      typeof clearAppCaches ===
      "function"
    ) {
      clearAppCaches();
    }

    return {
      success: true,
      gameId: gameId
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   UPDATE SINGLE CATEGORY
========================================================= */

function updateCategorySetting(
  gameId,
  categoryId,
  patch
){

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  categoryId =
    normalizeCategoryId_(
      categoryId
    );

  if (!patch) {

    throw new Error(
      "Patch payload missing"
    );

  }

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sh =
      getCategorySettingsSheet_();

    const data =
      sh.getDataRange().getValues();

    if (data.length === 0) {

      throw new Error(
        "CategorySettings sheet empty"
      );

    }

    const headers =
      data[0].map(h =>
        String(h).trim()
      );

    const col =
      getCategorySettingsColumnMap_(
        headers
      );

    validateCategorySettingsColumns_(
      col
    );

    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {

      const row = data[i];

      const rowGameId =
        normalizeGameId_(
          row[col.gameId]
        );

      const rowCategoryId =
        normalizeCategoryId_(
          row[col.categoryId]
        );

      if (
        rowGameId === gameId &&
        rowCategoryId === categoryId
      ) {

        rowIndex = i + 1;
        break;

      }

    }

    /* =========================
       CREATE ROW
    ========================= */

    if (rowIndex === -1) {

      const row =
        new Array(headers.length)
          .fill("");

      row[col.gameId] =
        gameId;

      row[col.categoryId] =
        categoryId;

      row[col.points] =
        Number(patch.points) || 0;

      row[col.locked] =
        patch.locked === true;

      row[col.winnerNomineeId] =
        patch.winnerNomineeId || "";

      sh.appendRow(row);

    }

    /* =========================
       UPDATE EXISTING ROW
    ========================= */

    else {

      if ("points" in patch) {

        sh.getRange(
          rowIndex,
          col.points + 1
        ).setValue(
          Number(patch.points) || 0
        );

      }

      if ("locked" in patch) {

        sh.getRange(
          rowIndex,
          col.locked + 1
        ).setValue(
          patch.locked === true
        );

      }

      if (
        "winnerNomineeId" in patch
      ) {

        sh.getRange(
          rowIndex,
          col.winnerNomineeId + 1
        ).setValue(
          patch.winnerNomineeId || ""
        );

      }

      if (
        "maxChanges" in patch
      ) {

        sh.getRange(
          rowIndex,
          col.maxChanges + 1
        ).setValue(
          Number(patch.maxChanges) || 0
        );

      }

      if (
        "lockDateTime" in patch
      ) {

        sh.getRange(
          rowIndex,
          col.lockDateTime + 1
        ).setValue(
          patch.lockDateTime || ""
        );

      }

    }

    SpreadsheetApp.flush();

    if (
      typeof clearAppCaches ===
      "function"
    ) {
      clearAppCaches();
    }

    return {
      success: true,
      gameId: gameId,
      categoryId: categoryId
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   USER STATS
========================================================= */

function getUserStats(
  username,
  gameId
){

  if (!username) {
    return null;
  }

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  const board =
    getLeaderboardData(gameId);

  if (
    !board ||
    !board.length
  ) {
    return null;
  }

  const userSearch =
    String(username)
      .trim()
      .toLowerCase();

  const row =
    board.find(r =>

      String(r.user || "")
        .trim()
        .toLowerCase() ===

      userSearch

    );

  if (!row) {
    return null;
  }

  const sorted =
    [...board].sort(
      (a,b) =>
        Number(b.total || 0) -
        Number(a.total || 0)
    );

  let rank = 1;

  sorted.forEach((u,i) => {

    if (

      String(u.user || "")
        .trim()
        .toLowerCase() ===

      userSearch

    ) {

      rank = i + 1;

    }

  });

  const leader =
    sorted[0];

  const behind =
    Number(leader.total || 0) -
    Number(row.total || 0);

  return {

    gameId:
      gameId,

    points:
      Number(row.total || 0),

    statues:
      Number(row.statues || 0),

    remaining:
      Number(row.remaining || 0),

    max:
      Number(row.max || 0),

    rank:
      rank,

    behind:
      behind,

    winChance:
      Number(row.winChance || 0)

  };

}


