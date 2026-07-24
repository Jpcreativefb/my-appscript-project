/* =====================================================
   LIVE RESULTS ENGINE
   ResultEvents audit log for live scoring
===================================================== */

const LIVE_RESULTS_EVENTS_SHEET =
  "ResultEvents";

const LIVE_RESULTS_EVENTS_HEADERS = [
  "Timestamp",
  "GameId",
  "CategoryId",
  "CategoryName",
  "OldWinnerNomineeId",
  "OldWinnerName",
  "NewWinnerNomineeId",
  "NewWinnerName",
  "Source",
  "UpdatedBy",
  "Notes"
];

/* =====================================================
   NORMALIZERS
===================================================== */

function normalizeLiveResultsValue_(value) {

  return String(value || "")
    .trim();

}

function normalizeLiveResultsId_(value) {

  return normalizeLiveResultsValue_(value)
    .toLowerCase();

}

/* =====================================================
   SETUP
===================================================== */

function setupLiveResultsSystem() {

  const sheet =
    ensureLiveResultsEventsSheet_();

  return {
    success: true,
    message: "Live results system ready",
    sheet: sheet.getName(),
    headers: LIVE_RESULTS_EVENTS_HEADERS
  };

}

function apiSetupLiveResultsSystem(payload) {

  requireAdmin_(payload);

  return setupLiveResultsSystem();

}

function ensureLiveResultsEventsSheet_() {

  const ss =
    SpreadsheetApp.getActive();

  let sheet =
    ss.getSheetByName(
      LIVE_RESULTS_EVENTS_SHEET
    );

  if (!sheet) {

    sheet =
      ss.insertSheet(
        LIVE_RESULTS_EVENTS_SHEET
      );

  }

  if (sheet.getLastRow() === 0) {

    sheet.getRange(
      1,
      1,
      1,
      LIVE_RESULTS_EVENTS_HEADERS.length
    ).setValues([
      LIVE_RESULTS_EVENTS_HEADERS
    ]);

    sheet.setFrozenRows(1);

    return sheet;

  }

  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      lastColumn
    )
    .getValues()[0]
    .map(header =>
      normalizeLiveResultsValue_(header)
    );

  if (headers.join("") === "") {

    sheet.getRange(
      1,
      1,
      1,
      LIVE_RESULTS_EVENTS_HEADERS.length
    ).setValues([
      LIVE_RESULTS_EVENTS_HEADERS
    ]);

    sheet.setFrozenRows(1);

    return sheet;

  }

  LIVE_RESULTS_EVENTS_HEADERS
    .forEach(header => {

      if (headers.indexOf(header) === -1) {

        sheet.getRange(
          1,
          sheet.getLastColumn() + 1
        ).setValue(header);

      }

    });

  sheet.setFrozenRows(1);

  return sheet;

}

function getLiveResultsEventsColumnMap_(headers) {

  return {
    timestamp:
      headers.indexOf("Timestamp"),

    gameId:
      headers.indexOf("GameId"),

    categoryId:
      headers.indexOf("CategoryId"),

    categoryName:
      headers.indexOf("CategoryName"),

    oldWinnerNomineeId:
      headers.indexOf("OldWinnerNomineeId"),

    oldWinnerName:
      headers.indexOf("OldWinnerName"),

    newWinnerNomineeId:
      headers.indexOf("NewWinnerNomineeId"),

    newWinnerName:
      headers.indexOf("NewWinnerName"),

    source:
      headers.indexOf("Source"),

    updatedBy:
      headers.indexOf("UpdatedBy"),

    notes:
      headers.indexOf("Notes")
  };

}

/* =====================================================
   CATEGORY / NOMINEE LOOKUPS
===================================================== */

function getLiveResultsCategoryInfo_(
  gameId,
  categoryId
) {

  gameId =
    normalizeLiveResultsValue_(
      gameId || getDefaultGameId()
    );

  categoryId =
    normalizeLiveResultsId_(
      categoryId
    );

  const categories =
    getCategories(gameId);

  const category =
    categories.find(cat =>
      normalizeLiveResultsId_(
        cat.id ||
        cat.categoryId
      ) === categoryId
    );

  if (!category) {

    return {
      categoryName:
        categoryId,

      nominees:
        []
    };

  }

  return {
    categoryName:
      category.name ||
      category.category ||
      categoryId,

    nominees:
      category.nominees || []
  };

}

function getLiveResultsNomineeName_(
  gameId,
  categoryId,
  nomineeId
) {

  nomineeId =
    normalizeLiveResultsId_(
      nomineeId
    );

  if (!nomineeId) {
    return "";
  }

  const info =
    getLiveResultsCategoryInfo_(
      gameId,
      categoryId
    );

  const nominee =
    info.nominees.find(item =>
      normalizeLiveResultsId_(
        item.id ||
        item.nomineeId
      ) === nomineeId
    );

  if (!nominee) {
    return nomineeId;
  }

  return (
    nominee.name ||
    nominee.nominee ||
    nominee.shortAnswer ||
    nominee.title ||
    nomineeId
  );

}

function getLiveResultsCurrentWinnerId_(
  gameId,
  categoryId
) {

  gameId =
    normalizeLiveResultsValue_(
      gameId || getDefaultGameId()
    );

  categoryId =
    normalizeLiveResultsId_(
      categoryId
    );

  const settings =
    getCategorySettings(gameId);

  const setting =
    settings[categoryId] || {};

  return normalizeLiveResultsId_(
    setting.winnerNomineeId || ""
  );

}

/* =====================================================
   AUDIT WRITE
===================================================== */

function recordLiveWinnerChange_(payload) {

  payload =
    payload || {};

  const gameId =
    normalizeLiveResultsValue_(
      payload.gameId || getDefaultGameId()
    );

  const categoryId =
    normalizeLiveResultsId_(
      payload.categoryId
    );

  const oldWinnerNomineeId =
    normalizeLiveResultsId_(
      payload.oldWinnerNomineeId
    );

  const newWinnerNomineeId =
    normalizeLiveResultsId_(
      payload.newWinnerNomineeId
    );

  if (
    oldWinnerNomineeId ===
    newWinnerNomineeId
  ) {

    return {
      success: true,
      noChange: true
    };

  }

  const info =
    getLiveResultsCategoryInfo_(
      gameId,
      categoryId
    );

  const sheet =
    ensureLiveResultsEventsSheet_();

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(header =>
      normalizeLiveResultsValue_(header)
    );

  const col =
    getLiveResultsEventsColumnMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  row[col.timestamp] =
    new Date();

  row[col.gameId] =
    gameId;

  row[col.categoryId] =
    categoryId;

  row[col.categoryName] =
    info.categoryName;

  row[col.oldWinnerNomineeId] =
    oldWinnerNomineeId;

  row[col.oldWinnerName] =
    getLiveResultsNomineeName_(
      gameId,
      categoryId,
      oldWinnerNomineeId
    );

  row[col.newWinnerNomineeId] =
    newWinnerNomineeId;

  row[col.newWinnerName] =
    getLiveResultsNomineeName_(
      gameId,
      categoryId,
      newWinnerNomineeId
    );

  row[col.source] =
    payload.source || "admin";

  row[col.updatedBy] =
    payload.updatedBy || "";

  row[col.notes] =
    payload.notes || "";

  sheet.appendRow(row);

  return {
    success: true,
    gameId: gameId,
    categoryId: categoryId,
    oldWinnerNomineeId: oldWinnerNomineeId,
    newWinnerNomineeId: newWinnerNomineeId
  };

}

/* =====================================================
   CACHE
===================================================== */

function clearLiveResultsCaches(gameId) {

  gameId =
    normalizeLiveResultsValue_(
      gameId || getDefaultGameId()
    );

  const cache =
    CacheService.getScriptCache();

  const keys = [
    "sheet_CategorySettings",
    "categories_" + gameId,
    "settings_" + gameId,
    "leaderboard_" + gameId,
    "projected_" + gameId,
    "results_v4__" +
      normalizeLiveResultsId_(gameId)
  ];

  keys.forEach(key =>
    cache.remove(key)
  );

  if (
    typeof clearGameCaches ===
    "function"
  ) {

    clearGameCaches(gameId);

  }

  if (
    typeof clearResultsCache ===
    "function"
  ) {

    clearResultsCache(gameId);

  }

  return {
    success: true,
    gameId: gameId,
    message: "Live results caches cleared"
  };

}

/* =====================================================
   LIVE READ API WRAPPERS
===================================================== */

function apiGetLiveGameState(payload) {

  payload =
    payload || {};

  const gameId =
    normalizeLiveResultsValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const categories =
    getCategories(gameId);

  const settings =
    typeof getCategorySettings === "function"
      ? getCategorySettings(gameId)
      : {};

  const categoryResolutions =
    typeof getCategoryResultsResolutionMap === "function"
      ? getCategoryResultsResolutionMap(gameId)
      : {};

  const isResolved =
    function(category) {

      const categoryId =
        normalizeLiveResultsId_(
          category.id ||
          category.categoryId ||
          ""
        );

      const config =
        settings[categoryId] ||
        category ||
        {};

      if (
        typeof getHybridCategoryResolution_ === "function"
      ) {
        return getHybridCategoryResolution_(
          categoryId,
          config,
          categoryResolutions
        ).resolved === true;
      }

      const mappedResolution =
        categoryResolutions[categoryId];

      if (
        mappedResolution &&
        typeof mappedResolution === "object" &&
        mappedResolution.resolved === true
      ) {
        return true;
      }

      return normalizeLiveResultsId_(
        config.winnerNomineeId ||
        category.winnerNomineeId ||
        ""
      ) !== "";

    };

  const resolved =
    categories.filter(isResolved);

  const unresolved =
    categories.filter(function(category) {
      return !isResolved(category);
    });

  return {
    success: true,
    gameId: gameId,
    totalCategories: categories.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
    isFinal:
      categories.length > 0 &&
      unresolved.length === 0,
    updatedAt:
      new Date().toISOString()
  };

}

function apiGetLiveResults(payload) {

  payload =
    payload || {};

  const gameId =
    normalizeLiveResultsValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const categories =
    getCategories(gameId);

  const settings =
    typeof getCategorySettings === "function"
      ? getCategorySettings(gameId)
      : {};

  const categoryResolutions =
    typeof getCategoryResultsResolutionMap === "function"
      ? getCategoryResultsResolutionMap(gameId)
      : {};

  const rows =
    categories.map(category => {

      const categoryId =
        normalizeLiveResultsId_(
          category.id ||
          category.categoryId
        );

      const config =
        settings[categoryId] ||
        category ||
        {};

      const resolution =
        typeof getHybridCategoryResolution_ === "function"
          ? getHybridCategoryResolution_(
              categoryId,
              config,
              categoryResolutions
            )
          : {
              resolved:
                normalizeLiveResultsId_(
                  config.winnerNomineeId ||
                  category.winnerNomineeId ||
                  ""
                ) !== "",
              result:
                normalizeLiveResultsId_(
                  config.winnerNomineeId ||
                  category.winnerNomineeId ||
                  ""
                ) !== ""
                  ? "winner"
                  : "pending",
              winnerNomineeId:
                normalizeLiveResultsId_(
                  config.winnerNomineeId ||
                  category.winnerNomineeId ||
                  ""
                )
            };

      const winnerNomineeId =
        resolution.result === "winner"
          ? normalizeLiveResultsId_(
              resolution.winnerNomineeId
            )
          : "";

      return {
        gameId:
          gameId,
        categoryId:
          categoryId,
        categoryName:
          category.name ||
          category.category ||
          categoryId,
        points:
          Number(category.points) || 0,
        locked:
          category.locked === true,
        winnerNomineeId:
          winnerNomineeId,
        winnerName:
          getLiveResultsNomineeName_(
            gameId,
            categoryId,
            winnerNomineeId
          ),
        resolved:
          resolution.resolved === true,
        resultStatus:
          resolution.result || "pending",
        isPush:
          resolution.result === "push",
        nominees:
          category.nominees || []
      };

    });

  return {
    success: true,
    gameId: gameId,
    liveState:
      apiGetLiveGameState({
        gameId:
          gameId
      }),
    categories:
      rows
  };

}

function apiGetLiveLeaderboard(payload) {

  payload =
    payload || {};

  const gameId =
    normalizeLiveResultsValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  return {
    success: true,
    gameId: gameId,
    liveState:
      apiGetLiveGameState({
        gameId:
          gameId
      }),
    leaderboard:
      getLeaderboardData(gameId),
    projected:
      typeof getProjectedResults === "function"
        ? getProjectedResults(gameId)
        : [],
    results:
      apiGetLiveResults({
        gameId:
          gameId
      }).categories,
    updatedAt:
      new Date().toISOString()
  };

}

/* =====================================================
   ADMIN LIVE WINNER WRAPPERS
   These keep Api.js compatibility.
===================================================== */

function apiAdminSetLiveWinner(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return apiAdminUpdateCategorySetting({
    username:
      payload.username,
    token:
      payload.token,
    gameId:
      payload.gameId,
    categoryId:
      payload.categoryId,
    winnerNomineeId:
      payload.nomineeId,
    notes:
      payload.notes || "Winner selected from admin panel"
  });

}

function apiAdminClearLiveWinner(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return apiAdminClearCategoryWinner({
    username:
      payload.username,
    token:
      payload.token,
    gameId:
      payload.gameId,
    categoryId:
      payload.categoryId,
    notes:
      payload.notes || "Winner cleared"
  });

}