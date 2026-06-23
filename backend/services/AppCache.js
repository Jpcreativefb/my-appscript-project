/* =========================
   APP CACHE HELPERS
========================= */

const CACHE_TTL = 120;

// Fast per-execution cache. Apps Script startup and Sheet reads are expensive;
// this avoids re-reading/re-parsing the same sheet several times during one API call.
var APP_RUNTIME_CACHE = APP_RUNTIME_CACHE || {};

// CacheService has a hard per-item size limit. Large sheets/categories can exceed it.
// Keep the fast per-execution cache, but skip ScriptCache writes that are too large
// so the app never crashes with: Argument too large: value.
const CACHE_MAX_SAFE_CHARS = 90000;

function safeScriptCachePut_(
  cache,
  key,
  value,
  ttl
){

  if (!cache || !key) {
    return false;
  }

  value =
    String(
      value || ""
    );

  if (
    value.length >
    CACHE_MAX_SAFE_CHARS
  ) {

    Logger.log(
      "Skipping ScriptCache put because value is too large: " +
      key +
      " (" +
      value.length +
      " chars)"
    );

    return false;

  }

  try {

    cache.put(
      key,
      value,
      ttl || CACHE_TTL
    );

    return true;

  } catch (err) {

    Logger.log(
      "Skipping ScriptCache put for " +
      key +
      ": " +
      err
    );

    return false;

  }

}

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

  if (
    APP_RUNTIME_CACHE &&
    APP_RUNTIME_CACHE[key]
  ) {
    return APP_RUNTIME_CACHE[key];
  }

  const cached =
    cache.get(key);

  if (cached) {

    try {

      const parsed =
        JSON.parse(cached);

      APP_RUNTIME_CACHE[key] = parsed;

      return parsed;

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

  safeScriptCachePut_(
    cache,
    key,
    JSON.stringify(data),
    CACHE_TTL
  );

  APP_RUNTIME_CACHE[key] = data;

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

  safeScriptCachePut_(
    cache,
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

  safeScriptCachePut_(
    cache,
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

  safeScriptCachePut_(
    cache,
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

  APP_RUNTIME_CACHE = {};

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

  APP_RUNTIME_CACHE = {};

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

/* =========================
   APP CACHE API
========================= */

var AppCache = {

  clearPicksCaches,
  clearAppCaches,
  clearGameCaches

};