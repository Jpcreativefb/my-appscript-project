/* =========================
   APP CACHE HELPERS
========================= */

const CACHE_TTL = 600;

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
    1800
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


function appCacheUsernameKey_(username){
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 120);
}

function appDashboardCacheKey_(username){
  const userKey = appCacheUsernameKey_(username);
  return userKey ? "dashboard_hub_v2_" + userKey : "";
}

/* Keep a warm whole-sheet cache coherent after a targeted batch write instead
   of deleting it and forcing the next request to re-read the entire Sheet. */
function appCacheSyncSheetRows_(sheetName, rowUpdates){
  sheetName = String(sheetName || "").trim();
  if (!sheetName || !Array.isArray(rowUpdates) || !rowUpdates.length) return false;

  const cache = CacheService.getScriptCache();
  const key = "sheet_" + sheetName;
  let raw = null;
  try { raw = cache.get(key); } catch (err) { raw = null; }
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    rowUpdates.forEach(function(update){
      const rowNumber = Number(update && update.rowNumber || 0);
      const row = update && Array.isArray(update.row) ? update.row.slice() : null;
      if (!rowNumber || !row) return;
      while (data.length < rowNumber) data.push([]);
      data[rowNumber - 1] = row;
    });
    safeScriptCachePut_(cache, key, JSON.stringify(data), CACHE_TTL);
    APP_RUNTIME_CACHE[key] = data;
    return true;
  } catch (err) {
    try { cache.remove(key); } catch (removeError) {}
    delete APP_RUNTIME_CACHE[key];
    return false;
  }
}

/* =========================
   CACHE INVALIDATION HELPERS
   v1.2.18x1b
========================= */

function appCacheRemoveKeys_(cache, keys){

  if (!cache) return;

  const seen = {};
  const clean = (keys || []).map(function(key) {
    return String(key || "").trim();
  }).filter(function(key) {
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });

  if (!clean.length) return;

  // CacheService.removeAll is substantially cheaper than dozens of
  // individual remote cache operations. Keep batches conservative.
  if (typeof cache.removeAll === "function") {
    for (let i = 0; i < clean.length; i += 75) {
      cache.removeAll(clean.slice(i, i + 75));
    }
    return;
  }

  clean.forEach(function(key) {
    cache.remove(key);
  });
}

function appGameCacheKeys_(gameId, username){

  gameId = String(gameId || "").trim();
  username = String(username || "").trim();
  if (!gameId) return [];

  const keys = [
    "categories_" + gameId,
    "settings_" + gameId,
    "leaderboard_" + gameId,
    "projected_" + gameId,
    "normalized_sync_" + gameId,
    "external_live_probabilities_v1_" + String(gameId || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 120),
    "normalized_question_game_map_v1",
    "rtv_season_game_ids_v1"
  ];

  if (username && typeof realityTvSlug_ === "function") {
    keys.push("rtv_player_stats_" + realityTvSlug_(gameId) + "_" + realityTvSlug_(username));
  }

  return keys;
}

function clearPlayerActionCaches(gameId, sheetNames, username){

  APP_RUNTIME_CACHE = {};

  gameId = String(gameId || "").trim();
  username = String(username || "").trim();
  const cache = CacheService.getScriptCache();
  const keys = [];

  (sheetNames || []).forEach(function(sheetName) {
    sheetName = String(sheetName || "").trim();
    if (sheetName) keys.push("sheet_" + sheetName);
  });

  if (gameId) {
    keys.push("leaderboard_" + gameId);
    keys.push("projected_" + gameId);
    if (username && typeof getUserPicksCacheKey_ === "function") {
      keys.push(getUserPicksCacheKey_(username, gameId));
    }
    if (username && typeof appStartupPayloadCacheKey_ === "function") {
      keys.push(appStartupPayloadCacheKey_(username, gameId));
    }
    if (username && typeof realityTvSlug_ === "function") {
      keys.push("rtv_player_stats_" + realityTvSlug_(gameId) + "_" + realityTvSlug_(username));
    }
  }

  const dashboardKey = appDashboardCacheKey_(username);
  if (dashboardKey) keys.push(dashboardKey);

  appCacheRemoveKeys_(cache, keys);
}

function clearGameDataCaches(gameId, sheetNames, username){

  APP_RUNTIME_CACHE = {};

  if (typeof NORMALIZED_STORAGE_RUNTIME_CACHE !== "undefined") {
    delete NORMALIZED_STORAGE_RUNTIME_CACHE["question-game-map:all"];
    delete NORMALIZED_STORAGE_RUNTIME_CACHE["data-index:all"];
  }

  gameId = String(gameId || "").trim();
  const cache = CacheService.getScriptCache();
  const keys = appGameCacheKeys_(gameId, username);

  (sheetNames || []).forEach(function(sheetName) {
    sheetName = String(sheetName || "").trim();
    if (sheetName) keys.push("sheet_" + sheetName);
  });

  appCacheRemoveKeys_(cache, keys);
}

/* =========================
   CLEAR GAME CACHE
========================= */

function clearGameCaches(
  gameId
){

  APP_RUNTIME_CACHE = {};

  if (typeof NORMALIZED_STORAGE_RUNTIME_CACHE !== "undefined") {
    delete NORMALIZED_STORAGE_RUNTIME_CACHE["question-game-map:all"];
    delete NORMALIZED_STORAGE_RUNTIME_CACHE["data-index:all"];
  }

  gameId =
    gameId ||
    getDefaultGameId();

  const cache =
    CacheService.getScriptCache();

  const keys = appGameCacheKeys_(gameId);
  appCacheRemoveKeys_(cache, keys);

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

  if (typeof NORMALIZED_STORAGE_RUNTIME_CACHE !== "undefined") {
    NORMALIZED_STORAGE_RUNTIME_CACHE = {};
  }

  const cache =
    CacheService
      .getScriptCache();

  // Snapshot the current game list BEFORE invalidating the Games cache.
  // The old implementation removed sheet_Games first and immediately forced
  // another full Games sheet read just to discover cache keys to delete.
  const games =
    typeof getGames === "function"
      ? getGames()
      : [];

  /* =========================
     RAW SHEETS
  ========================= */

  const baseKeys = [

    "sheet_Categories",

    "sheet_CategorySettings",

    "sheet_Picks",

    "sheet_Users",

    "sheet_Games",

    "sheet_Questions",

    "sheet_QuestionOptions",

    "sheet_DataIndex",

    "sheet_ArchiveManifest",

    "normalized_question_game_map_v1",

    "rtv_season_game_ids_v1"

  ];

  /* =========================
     GAME CACHES
  ========================= */

  const keys = baseKeys.slice();

  (games || []).forEach(function(game) {
    appGameCacheKeys_(game && game.gameId).forEach(function(key) {
      keys.push(key);
    });
  });

  appCacheRemoveKeys_(cache, keys);
  clearGamesCache();

  Logger.log(
    "All app caches cleared"
  );

}

function clearPicksCaches(gameId, username){

  APP_RUNTIME_CACHE = {};
  const cache = CacheService.getScriptCache();
  cache.remove("sheet_Picks");

  gameId = String(gameId || "").trim();
  username = String(username || "").trim();

  if (gameId) {
    if (username && typeof realityTvSlug_ === "function") {
      cache.remove("rtv_player_stats_" + realityTvSlug_(gameId) + "_" + realityTvSlug_(username));
    }
    clearPlayerActionCaches(gameId, [], "");
    return;
  }

  // Backward-compatible maintenance path only. Normal saves pass a Game ID.
  if (typeof clearAppCaches === "function") clearAppCaches();

}

/* =========================
   APP CACHE API
========================= */

var AppCache = {

  clearPicksCaches,
  clearPlayerActionCaches,
  clearGameDataCaches,
  clearAppCaches,
  clearGameCaches,
  syncSheetRows: appCacheSyncSheetRows_,
  dashboardCacheKey: appDashboardCacheKey_

};