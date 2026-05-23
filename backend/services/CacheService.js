/* =========================
   CACHE HELPERS
========================= */

const CACHE_TTL = 120;

/* =========================
   RAW SHEET CACHE
========================= */

function getSheetDataCached(
  sheetName
){

  if (!sheetName) {

    throw new Error(
      "Sheet name missing"
    );

  }

  const cache =
    CacheService.getScriptCache();

  const key =
    "sheet_" + sheetName;

  const cached =
    cache.get(key);

  if (cached) {

    try {

      return JSON.parse(cached);

    } catch (err) {

      Logger.log(
        "Cache parse failed for " +
        sheetName
      );

    }

  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh) {

    throw new Error(
      "Sheet not found: " +
      sheetName
    );

  }

  const data =
    sh.getDataRange()
      .getValues();

  cache.put(
    key,
    JSON.stringify(data),
    CACHE_TTL
  );

  return data;

}

/* =========================
   CATEGORY SETTINGS CACHE
========================= */

function getCategorySettingsCached(
  gameId
){

  gameId =
    gameId ||
    getDefaultGameId();

  const cache =
    CacheService.getScriptCache();

  const key =
    "settings_" + gameId;

  const cached =
    cache.get(key);

  if (cached) {

    try {

      return JSON.parse(cached);

    } catch (err) {

      Logger.log(
        "Settings cache parse failed"
      );

    }

  }

  const settings =
    getCategorySettings(
      gameId
    );

  cache.put(
    key,
    JSON.stringify(settings),
    CACHE_TTL
  );

  return settings;

}

/* =========================
   CATEGORY CACHE
========================= */

function getCategoriesCached(
  gameId
){

  gameId =
    gameId ||
    getDefaultGameId();

  const cache =
    CacheService.getScriptCache();

  const key =
    "categories_" + gameId;

  const cached =
    cache.get(key);

  if (cached) {

    try {

      return JSON.parse(cached);

    } catch (err) {

      Logger.log(
        "Categories cache parse failed"
      );

    }

  }

  const categories =
    getCategories(
      gameId
    );

  cache.put(
    key,
    JSON.stringify(categories),
    CACHE_TTL
  );

  return categories;

}

/* =========================
   LEADERBOARD CACHE
========================= */

function getLeaderboardCached(
  gameId,
  projected
){

  gameId =
    gameId ||
    getDefaultGameId();

  const cache =
    CacheService.getScriptCache();

  const key =

    projected

      ? "projected_" + gameId

      : "leaderboard_" + gameId;

  const cached =
    cache.get(key);

  if (cached) {

    try {

      return JSON.parse(cached);

    } catch (err) {

      Logger.log(
        "Leaderboard cache parse failed"
      );

    }

  }

  const data =
    projected

      ? getProjectedResults(
          gameId
        )

      : getLeaderboardData(
          gameId
        );

  cache.put(
    key,
    JSON.stringify(data),
    CACHE_TTL
  );

  return data;

}

/* =========================
   CLEAR GAME CACHE
========================= */

function clearGameCaches(
  gameId
){

  gameId =
    gameId ||
    getDefaultGameId();

  const cache =
    CacheService.getScriptCache();

  const keys = [

    "categories_" + gameId,

    "settings_" + gameId,

    "leaderboard_" + gameId,

    "projected_" + gameId

  ];

  keys.forEach(key =>
    cache.remove(key)
  );

  Logger.log(
    "Game caches cleared: " +
    gameId
  );

}

/* =========================
   CLEAR ALL APP CACHES
========================= */

function clearAppCaches(){

  const cache =
    CacheService
      .getScriptCache();

  /* =========================
     RAW SHEETS
  ========================= */

  const baseKeys = [

    "sheet_Categories",

    "sheet_CategorySettings",

    "sheet_Picks",

    "sheet_Users",

    "sheet_Games"

  ];

  baseKeys.forEach(key =>
    cache.remove(key)
  );

  /* =========================
     GAME CACHES
  ========================= */

  const games =
    getGames();

  games.forEach(game => {

    clearGameCaches(
      game.gameId
    );

  });

  clearGamesCache();

  Logger.log(
    "All app caches cleared"
  );

}

function clearPicksCaches(){

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  }

}

const CacheService = {

  clearPicksCaches

};