const API_BASE =
  "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

const API_UPLOAD_PROXY =
  "https://awards-upload-proxy.jpcreativefb.workers.dev";  

/* ======================
   GENERIC API FETCH
====================== */

async function api(action, params = {}) {

  const url =
    new URL(API_BASE);

  url.searchParams.set(
    "action",
    action
  );

  Object.entries(params)
    .forEach(([key, value]) => {

      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      url.searchParams.set(
        key,
        value
      );

    });

  try {

    const response =
      await fetch(url);

    return await response.json();

  } catch (err) {

    console.error(
      "API ERROR",
      err
    );

    return {
      success: false,
      message: "Network error"
    };

  }

}

/* ======================
   GENERIC API POST
====================== */

async function apiPost(action, payload = {}) {

  try {

    const response =
      await fetch(
        API_UPLOAD_PROXY,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({
              action:
                action,

              ...payload
            })
        }
      );

    return await response.json();

  } catch (err) {

    console.error(
      "API POST ERROR",
      err
    );

    return {
      success:
        false,

      message:
        "Network error"
    };

  }

}

/* ======================
   LOGIN
====================== */

async function apiLogin(username, pin) {

  return api("login", {
    username,
    pin
  });

}

/* ======================
   CATEGORIES
====================== */

async function apiGetCategories(gameId) {

  return api("getCategories", {
    gameId
  });

}

/* ======================
   PICKS
====================== */

async function apiGetMyPicks(username, gameId) {

  return api("getMyPicks", {
    username,
    gameId
  });

}

async function apiSavePick(payload) {

  return api("savePick", {
    username:
      payload.username,

    gameId:
      payload.gameId,

    categoryId:
      payload.categoryId,

    nomineeId:
      payload.nomineeId,

    confidencePoints:
      payload.confidencePoints
  });

}

/* ======================
   LEADERBOARD
====================== */

async function apiGetLeaderboard(gameId) {

  return api("leaderboard", {
    gameId
  });

}

/* ======================
   USER BREAKDOWN
====================== */

async function apiGetUserBreakdown(username, gameId) {

  return api("userBreakdown", {
    username,
    gameId
  });

}

/* ======================
   COMPATIBILITY WRAPPERS
   Old page names -> cleaned API names
====================== */

async function apiLeaderboard(gameId) {

  return apiGetLeaderboard(
    gameId
  );

}

async function apiGetUserProfile(username, gameId) {

  return api("getUserProfile", {
    username,
    gameId
  });

}

async function apiGetUserProfileHistory(username, gameId) {

  return api("getUserProfileHistory", {
    username,
    gameId
  });

}

async function apiGetStartupPayload() {

  const session =
    getSession();

  return api("getStartupPayload", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || ""
  });

}

/* ======================
   ACTIVE GAMES
====================== */

async function apiGetActiveGames() {

  return api(
    "getActiveGames"
  );

}

/* ======================
   ADMIN
====================== */

async function apiAdminSummary() {

  const session =
    getSession();

  return api("adminSummary", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || ""
  });

}

async function apiAdminClearCaches() {

  const session =
    getSession();

  return api("adminClearCaches", {
    username: session.username,
    token: session.token
  });

}

async function apiAdminUpdateCategorySetting(categoryId, patch) {

  const session =
    getSession();

  return api("adminUpdateCategorySetting", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || "",
    categoryId: categoryId,
    locked:
      patch.locked !== undefined
        ? patch.locked
        : "",
    points:
      patch.points !== undefined
        ? patch.points
        : "",
    winnerNomineeId:
      patch.winnerNomineeId !== undefined
        ? patch.winnerNomineeId
        : ""
  });

}

async function apiAdminClearCategoryWinner(categoryId) {

  const session =
    getSession();

  return api("adminClearCategoryWinner", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || "",
    categoryId: categoryId
  });

}

async function apiAdminCreateUser(payload) {

  const session =
    getSession();

  return api("adminCreateUser", {
    username: session.username,
    token: session.token,
    newUsername: payload.username,
    pin: payload.pin,
    isAdmin: payload.isAdmin || false,
    avatar: payload.avatar || "avatar1",
    themeColor: payload.themeColor || "#ffcc00"
  });

}

async function apiAdminResetUserPin(targetUsername, pin) {

  const session =
    getSession();

  return api("adminResetUserPin", {
    username: session.username,
    token: session.token,
    targetUsername: targetUsername,
    pin: pin
  });

}

async function apiAdminToggleUserAdmin(targetUsername, isAdmin) {

  const session =
    getSession();

  return api("adminToggleUserAdmin", {
    username: session.username,
    token: session.token,
    targetUsername: targetUsername,
    isAdmin: isAdmin
  });

}

async function apiAdminToggleUserActive(targetUsername, active) {

  const session =
    getSession();

  return api("adminToggleUserActive", {
    username: session.username,
    token: session.token,
    targetUsername: targetUsername,
    active: active
  });

}

/* ======================
   ADMIN: GAMES
====================== */

async function apiAdminGetGames() {

  return api(
    "adminGetGames"
  );

}

async function apiAdminGetGameTypes() {

  return api(
    "adminGetGameTypes"
  );

}

async function apiAdminGetGameConfig(gameId) {

  return api(
    "adminGetGameConfig",
    {
      gameId: gameId || APP_STATE.gameId || ""
    }
  );

}

async function apiAdminSaveGame(payload) {

  return api(
    "adminSaveGame",
    {
      gameId: payload.gameId,

      name: payload.name,

      year: payload.year,

      type: payload.type,

      active: payload.active,

      archived: payload.archived,

      defaultGame: payload.defaultGame,

      predictionEnabled: payload.predictionEnabled,

      rankingEnabled: payload.rankingEnabled,

      confidenceEnabled: payload.confidenceEnabled,

      confidenceScoringMode: payload.confidenceScoringMode,

      wagerEnabled: payload.wagerEnabled,

      startingBankroll: payload.startingBankroll,

      minWager: payload.minWager,

      maxWager: payload.maxWager,

      themeColor: payload.themeColor,

      icon: payload.icon,

      sortOrder: payload.sortOrder,

      status: payload.status,

      lockAllPicks: payload.lockAllPicks,

      showLeaderboard: payload.showLeaderboard,

      showResultsBeforeLock: payload.showResultsBeforeLock,

      resultsFinalized: payload.resultsFinalized,

      votingLocked: payload.votingLocked
    }
  );

}

async function apiAdminCreateGame(payload) {

  return api(
    "adminCreateGame",
    payload
  );

}

async function apiAdminUpdateGame(payload) {

  return api(
    "adminUpdateGame",
    payload
  );

}

async function apiAdminArchiveGame(gameId) {

  return api(
    "adminArchiveGame",
    {
      gameId: gameId
    }
  );

}

async function apiAdminCloneGame(payload) {

  return api(
    "adminCloneGame",
    payload
  );

}

async function apiAdminCloneGameSetup(payload) {

  return api(
    "adminCloneGameSetup",
    payload
  );

}

/* ======================
   ADMIN: GAME SETUP
   Categories / Questions
====================== */

async function apiAdminGetGameSetup(gameId) {

  return api(
    "adminGetGameSetup",
    {
      gameId: gameId
    }
  );

}

async function apiAdminCreateCategory(payload) {

  return api(
    "adminCreateCategory",
    {
      gameId:
        payload.gameId,

      category:
        payload.category,

      categoryId:
        payload.categoryId,

      section:
        payload.section,

      points:
        payload.points,

      displayOrder:
        payload.displayOrder,

      layoutType:
        payload.layoutType,

      countsAsStatue:
        payload.countsAsStatue,

      locked:
        payload.locked,

      lockDateTime:
        payload.lockDateTime,

      groupId:
        payload.groupId,

      parentCategoryId:
        payload.parentCategoryId,

      followUpCategoryId:
        payload.followUpCategoryId,

      followUpMapJSON:
        payload.followUpMapJSON
    }
  );

}

async function apiAdminUpdateCategory(payload) {

  return api(
    "adminUpdateCategory",
    payload
  );

}

async function apiAdminArchiveCategory(gameId, categoryId) {

  return api(
    "adminArchiveCategory",
    {
      gameId: gameId,
      categoryId: categoryId
    }
  );

}

/* ======================
   ADMIN: NOMINEES / ANSWERS
====================== */

async function apiAdminCreateNominee(payload) {

  return api(
    "adminCreateNominee",
    payload
  );

}

async function apiAdminUpdateNominee(payload) {

  return api(
    "adminUpdateNominee",
    payload
  );

}

async function apiAdminUploadImage(payload) {

  return apiPost(
    "adminUploadImage",
    {
      gameId:
        payload.gameId,

      categoryId:
        payload.categoryId,

      nomineeId:
        payload.nomineeId,

      fileName:
        payload.fileName,

      mimeType:
        payload.mimeType,

      base64:
        payload.base64
    }
  );

}

async function apiAdminArchiveNominee(
  gameId,
  categoryId,
  nomineeId
) {

  return api(
    "adminArchiveNominee",
    {
      gameId: gameId,
      categoryId: categoryId,
      nomineeId: nomineeId
    }
  );

}

/* ======================
   ADMIN: PREFLIGHT
====================== */

async function apiAdminRunGamePreflight(gameId) {

  return api(
    "adminRunGamePreflight",
    {
      gameId: gameId
    }
  );

}

/* ======================
   ADMIN: RESULTS
====================== */

async function apiAdminSetResultsFinalized(
  gameId,
  finalized
) {

  return apiAdminUpdateGame({
    gameId: gameId,
    resultsFinalized: finalized
  });

}

/* ======================
   ADMIN: RESULTS REFRESH
====================== */

async function apiAdminRefreshResultsCaches(gameId) {

  return api(
    "adminRefreshResultsCaches",
    {
      gameId: gameId
    }
  );

}