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
      headers.indexOf("FavoriteNomineeId"),

    wagerResultType:
      headers.indexOf("WagerResultType"),

    sportsGameId:
      headers.indexOf("SportsGameId"),

    espnEventId:
      headers.indexOf("ESPNEventId"),

    oddsReady:
      headers.indexOf("OddsReady"),

    oddsSource:
      headers.indexOf("OddsSource"),

    oddsLastUpdated:
      headers.indexOf("OddsLastUpdated"),

    questionType:
      headers.indexOf("QuestionType"),

    scoringEngine:
      headers.indexOf("ScoringEngine"),

    selectionMode:
      headers.indexOf("SelectionMode"),

    scoreMode:
      headers.indexOf("ScoreMode"),

    oddsMode:
      headers.indexOf("OddsMode"),

    resultSource:
      headers.indexOf("ResultSource"),

    settlementStatus:
      headers.indexOf("SettlementStatus"),

    maxSelections:
      headers.indexOf("MaxSelections"),

    minSelections:
      headers.indexOf("MinSelections"),

    allowDraw:
      headers.indexOf("AllowDraw"),

    allowPush:
      headers.indexOf("AllowPush"),

    sportsMarket:
      headers.indexOf("SportsMarket"),

    sportsLeague:
      headers.indexOf("SportsLeague")

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

  const values =
    getAllCategorySettingsData_();

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
        col.favoriteNomineeId > -1
          ? String(
              row[col.favoriteNomineeId] || ""
            ).trim()
          : "",

      wagerResultType:
        col.wagerResultType > -1
          ? String(
              row[col.wagerResultType] || ""
            ).trim()
          : "",

      sportsGameId:
        col.sportsGameId > -1
          ? String(
              row[col.sportsGameId] || ""
            ).trim()
          : "",

      espnEventId:
        col.espnEventId > -1
          ? String(
              row[col.espnEventId] || ""
            ).trim()
          : "",

      oddsReady:
        col.oddsReady > -1
          ? (
              String(row[col.oddsReady] || "")
                .trim() === ""
                ? true
                : (
                    row[col.oddsReady] === true ||
                    String(row[col.oddsReady] || "")
                      .trim()
                      .toLowerCase() === "true" ||
                    String(row[col.oddsReady] || "")
                      .trim() === "1" ||
                    String(row[col.oddsReady] || "")
                      .trim()
                      .toLowerCase() === "yes"
                  )
            )
          : true,

      oddsSource:
        col.oddsSource > -1
          ? String(
              row[col.oddsSource] || ""
            ).trim()
          : "",

      oddsLastUpdated:
        col.oddsLastUpdated > -1 && row[col.oddsLastUpdated]
          ? String(
              row[col.oddsLastUpdated]
            ).trim()
          : "",

      questionType:
        col.questionType > -1
          ? String(row[col.questionType] || "").trim()
          : "award-single-winner",

      scoringEngine:
        col.scoringEngine > -1
          ? String(row[col.scoringEngine] || "").trim()
          : "manual",

      selectionMode:
        col.selectionMode > -1
          ? String(row[col.selectionMode] || "").trim()
          : "single",

      scoreMode:
        col.scoreMode > -1
          ? String(row[col.scoreMode] || "").trim()
          : "correct-pick",

      oddsMode:
        col.oddsMode > -1
          ? String(row[col.oddsMode] || "").trim()
          : "none",

      resultSource:
        col.resultSource > -1
          ? String(row[col.resultSource] || "").trim()
          : "manual",

      settlementStatus:
        col.settlementStatus > -1
          ? String(row[col.settlementStatus] || "").trim()
          : "pending",

      maxSelections:
        col.maxSelections > -1
          ? Number(row[col.maxSelections]) || 1
          : 1,

      minSelections:
        col.minSelections > -1
          ? Number(row[col.minSelections]) || 1
          : 1,

      allowDraw:
        col.allowDraw > -1
          ? (
              row[col.allowDraw] === true ||
              String(row[col.allowDraw] || "")
                .trim()
                .toLowerCase() === "true"
            )
          : false,

      allowPush:
        col.allowPush > -1
          ? (
              row[col.allowPush] === true ||
              String(row[col.allowPush] || "")
                .trim()
                .toLowerCase() === "true"
            )
          : false,

      sportsMarket:
        col.sportsMarket > -1
          ? String(row[col.sportsMarket] || "").trim()
          : "",

      sportsLeague:
        col.sportsLeague > -1
          ? String(row[col.sportsLeague] || "").trim()
          : ""

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

      if (col.favoriteNomineeId > -1) {
        row[col.favoriteNomineeId] =
          c.favoriteNomineeId || "";
      }

      if (col.oddsReady > -1) {
        row[col.oddsReady] =
          c.oddsReady === true;
      }

      if (col.oddsSource > -1) {
        row[col.oddsSource] =
          c.oddsSource || "";
      }

      if (col.oddsLastUpdated > -1) {
        row[col.oddsLastUpdated] =
          c.oddsLastUpdated || "";
      }

      const optionalStringFields = [
        "questionType",
        "scoringEngine",
        "selectionMode",
        "scoreMode",
        "oddsMode",
        "resultSource",
        "settlementStatus",
        "sportsMarket",
        "sportsLeague",
        "wagerResultType",
        "sportsGameId",
        "espnEventId"
      ];

      optionalStringFields.forEach(function(key) {
        if (col[key] > -1) {
          row[col[key]] = c[key] || "";
        }
      });

      if (col.maxSelections > -1) {
        row[col.maxSelections] = Number(c.maxSelections) || 1;
      }

      if (col.minSelections > -1) {
        row[col.minSelections] = Number(c.minSelections) || 1;
      }

      if (col.allowDraw > -1) {
        row[col.allowDraw] = c.allowDraw === true;
      }

      if (col.allowPush > -1) {
        row[col.allowPush] = c.allowPush === true;
      }

      keepRows.push(row);

    });

    /* =========================
       REWRITE SHEET
    ========================= */

    rewriteCategorySettings_(
      keepRows,
      headers.length
    );

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

    const data =
      getAllCategorySettingsData_();

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

      [
        "questionType",
        "scoringEngine",
        "selectionMode",
        "scoreMode",
        "oddsMode",
        "resultSource",
        "settlementStatus",
        "sportsMarket",
        "sportsLeague",
        "wagerResultType",
        "sportsGameId",
        "espnEventId"
      ].forEach(function(key) {
        if (
          key in patch &&
          col[key] > -1
        ) {
          row[col[key]] = patch[key] || "";
        }
      });

      if (col.maxSelections > -1) {
        row[col.maxSelections] = Number(patch.maxSelections) || 1;
      }

      if (col.minSelections > -1) {
        row[col.minSelections] = Number(patch.minSelections) || 1;
      }

      if (col.allowDraw > -1) {
        row[col.allowDraw] = patch.allowDraw === true;
      }

      if (col.allowPush > -1) {
        row[col.allowPush] = patch.allowPush === true;
      }

      appendCategorySettingsRow_(row);

    }

    /* =========================
       UPDATE EXISTING ROW
    ========================= */

    else {

      if ("points" in patch) {

        updateCategorySettingsCell_(
          rowIndex,
          col.points + 1,
          Number(patch.points) || 0
        );

      }

      if ("locked" in patch) {

        updateCategorySettingsCell_(
          rowIndex,
          col.locked + 1,
          patch.locked === true
        );

      }

      if (
        "winnerNomineeId" in patch
      ) {

        updateCategorySettingsCell_(
          rowIndex,
          col.winnerNomineeId + 1,
          patch.winnerNomineeId || ""
        );

      }

      if (
        "maxChanges" in patch
      ) {

        updateCategorySettingsCell_(
          rowIndex,
          col.maxChanges + 1,
          Number(patch.maxChanges) || 0
        );

      }

      if (
        "lockDateTime" in patch
      ) {

        updateCategorySettingsCell_(
          rowIndex,
          col.lockDateTime + 1,
          patch.lockDateTime || ""
        );

      }

      if (
        "oddsReady" in patch &&
        col.oddsReady > -1
      ) {

        updateCategorySettingsCell_(
          rowIndex,
          col.oddsReady + 1,
          patch.oddsReady === true
        );

      }

      if (
        "oddsSource" in patch &&
        col.oddsSource > -1
      ) {

        updateCategorySettingsCell_(
          rowIndex,
          col.oddsSource + 1,
          patch.oddsSource || ""
        );

      }

      if (
        "oddsLastUpdated" in patch &&
        col.oddsLastUpdated > -1
      ) {

        updateCategorySettingsCell_(
          rowIndex,
          col.oddsLastUpdated + 1,
          patch.oddsLastUpdated || ""
        );

      }

      const optionalPatchFields = [
        "questionType",
        "scoringEngine",
        "selectionMode",
        "scoreMode",
        "oddsMode",
        "resultSource",
        "settlementStatus",
        "sportsMarket",
        "sportsLeague",
        "wagerResultType",
        "sportsGameId",
        "espnEventId",
        "maxSelections",
        "minSelections",
        "allowDraw",
        "allowPush"
      ];

      optionalPatchFields.forEach(function(key) {
        if (
          key in patch &&
          col[key] > -1
        ) {
          let value = patch[key];

          if (
            key === "maxSelections" ||
            key === "minSelections"
          ) {
            value = Number(value) || 1;
          }

          if (
            key === "allowDraw" ||
            key === "allowPush"
          ) {
            value = value === true;
          }

          updateCategorySettingsCell_(
            rowIndex,
            col[key] + 1,
            value
          );
        }
      });

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


