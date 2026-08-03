const API_BASE =
  "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

const API_UPLOAD_PROXY =
  "https://awards-upload-proxy.jpcreativefb.workers.dev";  

function getApiLeagueId_() {

  return typeof getFrontendLeagueId === "function"
    ? getFrontendLeagueId()
    : localStorage.getItem("leagueId") || "";

}

/* ======================
   GENERIC API FETCH / JSONP
====================== */

const API_TIMEOUT_MS =
  45000;

const API_LONG_TIMEOUT_MS =
  120000;

const API_LONG_TIMEOUT_ACTIONS =
  new Set([
    "getStartupPayload",
    "getDashboardGamesHub",
    "getEditableProfile",
    "getUserProfileHistory",
    "getArchivedGameHistory",
    "getArchivedGamesHistory",
    "getBettingPagePayload",
    "getSportsGameDetails",
    "getSportsLiveQuestionStatus",
    "adminSummary",
    "adminGetGames",
    "adminGetGameSetup",
    "adminGetRealityTvDashboard",
    "adminCreateRealityTvSeason",
    "adminBulkAddRealityTvContestants",
    "adminAddRealityTvCustomQuestionTemplate",
    "adminSubmitRealityTvResult",
    "adminApproveRealityTvResult",
    "adminContinueRealityTvApproval",
    "adminCreateNextRealityTvEpisode",
    "adminGetArchiveDashboard",
    "adminArchiveGameData",
    "adminCloneCategory",
    "adminBulkCreateNominees",
    "adminBulkUpdateGameSetup",
    "adminCloneNominee",
    "adminGetLeagueAccessDashboard",
    "adminGetSportsControlDashboard",
    "adminGetSportsPlayerStatus",
    "adminRefreshSportsWagerScores",
    "adminRefreshAndSettleSportsWagers",
    "adminAutoSetSportsWagerOdds",
    "adminRunSportsFullSync",
    "adminSettleSportsWagers",
    "adminRefreshSportsScoresNow",
    "adminRefreshSportsScoresWindow",
    "adminRunSportsScheduleReconcile",
    "adminRunSportsOddsHybridRefresh",
    "adminRefreshSportsOddsLeague",
    "adminSyncSportsPlayers",
    "adminRefreshSportsPlayerGameStats",
    "adminGetSportsPlayerPropPlayers",
    "adminCreateSportsPlayerProp",
    "adminCreateSportsPlayerMatchup",
    "adminGetSportsAdvancedQuestionOptions",
    "adminCreateSportsAdvancedQuestion",
    "adminSettleSportsAdvancedQuestions",
    "adminSetupSportsAdvancedStats",
    "adminRefreshSportsAdvancedStats",
    "adminGetSportsAdvancedStatsStatus",
    "adminSettleSportsPlayerProps",
    "adminSettleSportsPlayerMatchups",
    "adminRefreshRacingWagerScores",
    "adminSettleRacingWagers"
  ]);

function getApiTimeoutMs_(action) {

  return API_LONG_TIMEOUT_ACTIONS.has(String(action || ""))
    ? API_LONG_TIMEOUT_MS
    : API_TIMEOUT_MS;

}

function buildApiUrl_(action, params = {}) {

  const url =
    new URL(API_BASE);

  url.searchParams.set(
    "action",
    action
  );

  Object.entries(params || {})
    .forEach(([key, value]) => {

      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      url.searchParams.set(
        key,
        String(value)
      );

    });

  return url;

}

function shouldUseJsonpApi_() {

  return String(API_BASE || "")
    .indexOf("script.google.com/macros/") > -1;

}

function apiJsonp_(action, params = {}) {

  const timeoutMs =
    getApiTimeoutMs_(action);

  return new Promise((resolve) => {

    const callbackName =
      "__awardsApiCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 1000000);

    const url =
      buildApiUrl_(
        action,
        {
          ...params,
          callback: callbackName,
          _ts: Date.now()
        }
      );

    const script =
      document.createElement("script");

    let finished =
      false;

    function cleanup(keepLateCallback) {

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      if (keepLateCallback) {

        // Apps Script can finish after our UI timeout.
        // Keep a harmless callback temporarily so a late JSONP response
        // does not throw "callback is not defined" in the console.
        window[callbackName] = function() {};

        setTimeout(() => {
          try {
            delete window[callbackName];
          } catch (err) {
            window[callbackName] = undefined;
          }
        }, 120000);

        return;

      }

      try {
        delete window[callbackName];
      } catch (err) {
        window[callbackName] = undefined;
      }

    }

    const timer =
      setTimeout(() => {

        if (finished) {
          return;
        }

        finished = true;
        cleanup(true);

        resolve({
          success: false,
          message: "Connection timed out. Please try again."
        });

      }, timeoutMs);

    window[callbackName] = function(data) {

      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);
      cleanup(false);
      resolve(data);

    };

    script.onerror = function() {

      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);
      cleanup(false);

      resolve({
        success: false,
        message: "Connection error. Please refresh and try again."
      });

    };

    script.src =
      url.toString();

    document.head.appendChild(script);

  });

}

async function apiFetch_(action, params = {}) {

  const timeoutMs =
    getApiTimeoutMs_(action);

  const controller =
    typeof AbortController !== "undefined"
      ? new AbortController()
      : null;

  const timer =
    controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {

    const response =
      await fetch(
        buildApiUrl_(action, params),
        controller
          ? { signal: controller.signal }
          : {}
      );

    if (timer) {
      clearTimeout(timer);
    }

    const text =
      await response.text();

    try {
      return JSON.parse(text);
    } catch (err) {
      return {
        success: false,
        message: "API returned an invalid response."
      };
    }

  } catch (err) {

    if (timer) {
      clearTimeout(timer);
    }

    console.error(
      "API ERROR",
      err
    );

    return {
      success: false,
      message:
        err && err.name === "AbortError"
          ? "Connection timed out. Please try again."
          : "Network error"
    };

  }

}

async function api(action, params = {}) {

  if (shouldUseJsonpApi_()) {
    return apiJsonp_(action, params);
  }

  return apiFetch_(action, params);

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

    const text = await response.text();
    let parsed = null;

    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (parseError) {
      const detail = String(text || "").trim().slice(0, 180);
      return {
        success: false,
        status: response.status,
        error: response.status === 524
          ? "The server timed out before confirming the operation. The work may have partially completed; refresh and retry safely."
          : "Server returned an invalid response" + (detail ? ": " + detail : "."),
        message: response.status === 524
          ? "The server timed out before confirming the operation. The work may have partially completed; refresh and retry safely."
          : "Server returned an invalid response."
      };
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: (parsed && (parsed.error || parsed.message)) || ("Server returned status " + response.status + "."),
        message: (parsed && (parsed.message || parsed.error)) || ("Server returned status " + response.status + ".")
      };
    }

    return parsed || { success: true };

  } catch (err) {

    console.error(
      "API POST ERROR",
      err
    );

    return {
      success:
        false,

      error:
        err && err.message ? err.message : "Network error",

      message:
        err && err.message ? err.message : "Network error"
    };

  }

}

/* ======================
   LOGIN
====================== */

async function apiLogin(username, pin, rememberMe) {

  return api("login", {
    username,
    pin,
    rememberMe:
      rememberMe === false
        ? "false"
        : "true"
  });

}

async function apiValidateSession(token) {

  return api("validateSession", {
    token
  });

}

async function apiSignup(username, realName, pin, email, phone, contactMethod) {

  return api("signup", {
    username,
    realName,
    pin,
    email,
    phone,
    contactMethod
  });

}

async function apiRequestPinReset(identifier) {

  return api("requestPinReset", {
    identifier
  });

}

async function apiResetPin(identifier, resetCode, newPin) {

  return api("resetPin", {
    identifier,
    resetCode,
    newPin
  });

}

async function apiGetNotificationPreference(token) {

  return api("getNotificationPreference", {
    token
  });

}

async function apiSetNotificationPreference(token, contactMethod, email, phone) {

  return api("setNotificationPreference", {
    token,
    contactMethod,
    email,
    phone
  });

}

async function apiAdminSendMassNotification(token, subject, message, gameId) {

  return api("adminSendMassNotification", {
    token,
    subject,
    message,
    gameId
  });

}

async function apiAdminGetPhoneNotificationList(token) {

  return api("adminGetPhoneNotificationList", {
    token
  });

}

/* ======================
   EDITABLE PROFILE
====================== */

async function apiGetEditableProfile(username, gameId) {

  return api("getEditableProfile", {
    username,
    gameId
  });

}

async function apiSaveEditableProfile(profile) {

  return api("saveEditableProfile", profile);

}

async function apiUploadProfileAvatar(payload) {

  return apiPost(
    "uploadProfileAvatar",
    payload || {}
  );

}

/* ======================
   CATEGORIES
====================== */

async function apiGetCategories(gameId) {

  const session = getSession ? getSession() : {};

  return api("getCategories", {
    username: session && session.username ? session.username : "",
    gameId,
    leagueId: getApiLeagueId_()
  });

}

/* ======================
   PICKS
====================== */

async function apiGetMyPicks(username, gameId) {

  return api("getMyPicks", {
    username,
    gameId,
    leagueId: getApiLeagueId_()
  });

}

async function apiSavePick(payload) {

  return api("savePick", {
    username:
      payload.username,

    gameId:
      payload.gameId,

    leagueId:
      payload.leagueId || getApiLeagueId_(),

    categoryId:
      payload.categoryId,

    nomineeId:
      payload.nomineeId,

    confidencePoints:
      payload.confidencePoints,

    stakePoints:
      payload.stakePoints
  });

}

async function apiGetSeasonAnchor(gameId) {
  const session = getSession ? getSession() : {};
  return api("getSeasonAnchor", {
    username: session.username || "",
    token: session.token || "",
    gameId: gameId,
    leagueId: getApiLeagueId_()
  });
}

async function apiSaveSeasonAnchorPick(gameId, entityId) {
  const session = getSession ? getSession() : {};
  return api("saveSeasonAnchorPick", {
    username: session.username || "",
    token: session.token || "",
    gameId: gameId,
    entityId: entityId,
    leagueId: getApiLeagueId_()
  });
}

/* ======================
   LEADERBOARD
====================== */

async function apiGetLeaderboard(gameId) {

  const session = getSession ? getSession() : {};

  return api("leaderboard", {
    username: session && session.username ? session.username : "",
    gameId,
    leagueId: getApiLeagueId_()
  });

}

async function apiLiveLeaderboard(gameId) {

  const session = getSession ? getSession() : {};

  return api("liveLeaderboard", {
    username: session && session.username ? session.username : "",
    gameId,
    leagueId: getApiLeagueId_()
  });

}

async function apiLiveResults(gameId) {

  return api("liveResults", {
    gameId
  });

}

async function apiLiveGameState(gameId) {

  return api("liveGameState", {
    gameId
  });

}

/* ======================
   USER BREAKDOWN
====================== */

async function apiGetUserBreakdown(username, gameId) {

  return api("userBreakdown", {
    username,
    gameId,
    leagueId: getApiLeagueId_()
  });

}

/* ======================
   COMPATIBILITY WRAPPERS
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

  const session = getSession();

  return api("getUserProfileHistory", {
    username,
    gameId: gameId || "",
    token: session && session.token ? session.token : ""
  });

}

async function apiGetArchivedGameHistory(gameId, username) {

  const session = getSession();

  return api("getArchivedGameHistory", {
    gameId,
    username: username || "",
    token: session && session.token ? session.token : ""
  });

}

async function apiGetArchivedGamesHistory() {

  const session = getSession();

  return api("getArchivedGamesHistory", {
    token: session && session.token ? session.token : ""
  });

}

async function apiGetStartupPayload() {

  const session =
    getSession();

  return api("getStartupPayload", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || "",
    leagueId: getApiLeagueId_()
  });

}

/* ======================
   DASHBOARD GAMES HUB
====================== */

async function apiGetDashboardGamesHub() {

  const session =
    getSession();

  return api("getDashboardGamesHub", {
    username:
      session && session.username
        ? session.username
        : "",

    token:
      session && session.token
        ? session.token
        : "",

    leagueId:
      getApiLeagueId_()
  });

}

/* ======================
   ACTIVE GAMES
====================== */

async function apiGetActiveGames() {

  const session = getSession ? getSession() : {};

  return api(
    "getActiveGames",
    {
      username: session && session.username ? session.username : "",
      leagueId: getApiLeagueId_()
    }
  );

}


/* ======================
   LEAGUES
====================== */

async function apiGetMyLeagues(gameId) {

  const session = getSession ? getSession() : {};

  return api("getMyLeagues", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    gameId: gameId || getFrontendGameId() || "",
    leagueId: getApiLeagueId_()
  });

}

async function apiCreateLeague(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("createLeague", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId,
    leagueName: payload.leagueName || payload.name,
    gameId: payload.gameId || getFrontendGameId() || "",
    gameIds: payload.gameIds || payload.gameId || "",
    visibility: payload.visibility || "private",
    accessMode: payload.accessMode || payload.gameAccessMode || payload.visibility || "private",
    pickScope: payload.pickScope || "universal",
    joinMode: payload.joinMode || "invite"
  });

}

async function apiAddLeagueMember(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("addLeagueMember", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    memberUsername: payload.memberUsername || payload.targetUsername,
    role: payload.role || "member"
  });

}

async function apiAdminSetupLeagueAccessSystem() {

  const session = getSession ? getSession() : {};

  return api("adminSetupLeagueAccessSystem", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : ""
  });

}

async function apiAssignGameToLeague(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("assignGameToLeague", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    gameId: payload.gameId || getFrontendGameId() || "",
    accessMode: payload.accessMode || payload.gameAccessMode || "private",
    pickScope: payload.pickScope || "universal"
  });

}

async function apiGetLeagueMembers(leagueId) {

  const session = getSession ? getSession() : {};

  return api("getLeagueMembers", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: leagueId || getApiLeagueId_()
  });

}

async function apiRemoveLeagueMember(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("removeLeagueMember", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    memberUsername: payload.memberUsername || payload.targetUsername
  });

}

async function apiSaveLeagueFeatureAccess(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("saveLeagueFeatureAccess", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    gameId: payload.gameId || getFrontendGameId() || "",
    feature: payload.feature,
    accessRule: payload.accessRule,
    rolesAllowed: payload.rolesAllowed,
    usersAllowed: payload.usersAllowed,
    usersBlocked: payload.usersBlocked || "",
    active: payload.active === undefined ? "true" : payload.active
  });

}


async function apiAdminGetLeagueAccessDashboard() {

  const session = getSession ? getSession() : {};

  return api("adminGetLeagueAccessDashboard", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : ""
  });

}

async function apiSetGameLeagueVisibility(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("setGameLeagueVisibility", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    gameId: payload.gameId || getFrontendGameId() || "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    leagueIds: payload.leagueIds || payload.leagueId || "",
    accessMode: payload.accessMode || payload.mode || "private",
    pickScope: payload.pickScope || "universal",
    replace: payload.replace === false ? "false" : "true"
  });

}

async function apiRemoveGameFromLeague(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("removeGameFromLeague", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    gameId: payload.gameId || getFrontendGameId() || ""
  });

}

async function apiUpdateLeague(payload) {

  const session = getSession ? getSession() : {};
  payload = payload || {};

  return api("updateLeague", {
    username: session && session.username ? session.username : "",
    token: session && session.token ? session.token : "",
    leagueId: payload.leagueId || getApiLeagueId_(),
    leagueName: payload.leagueName || payload.name || "",
    visibility: payload.visibility || "private",
    accessMode: payload.accessMode || payload.gameAccessMode || payload.visibility || "private",
    pickScope: payload.pickScope || "universal",
    gameIds: payload.gameIds || payload.gameId || "",
    joinMode: payload.joinMode || "invite",
    active: payload.active === undefined ? "true" : payload.active,
    notes: payload.notes || ""
  });

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
    gameId: APP_STATE.gameId || "",
    leagueId: getApiLeagueId_()
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

async function apiAdminSetupLiveResultsSystem() {

  const session =
    getSession();

  return api("adminSetupLiveResultsSystem", {
    username:
      session.username,

    token:
      session.token
  });

}

async function apiAdminUpdateCategorySetting(categoryId, patch) {

  const session =
    getSession();

  patch =
    patch || {};

  const params = {
    username:
      session.username,

    token:
      session.token,

    gameId:
      APP_STATE.gameId || "",

    categoryId:
      categoryId
  };

  if (patch.locked !== undefined) {
    params.locked =
      patch.locked;
  }

  if (patch.points !== undefined) {
    params.points =
      patch.points;
  }

  if (
    patch.winnerNomineeId !== undefined &&
    patch.winnerNomineeId !== ""
  ) {

    params.winnerNomineeId =
      patch.winnerNomineeId;

  }

  if (patch.notes !== undefined) {
    params.notes =
      patch.notes;
  }

  return api(
    "adminUpdateCategorySetting",
    params
  );

}

async function apiAdminClearCategoryWinner(categoryId) {

  const session =
    getSession();

  return api("adminClearCategoryWinner", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || "",
    leagueId: getApiLeagueId_(),
    categoryId: categoryId
  });

}

async function apiAdminSetLiveWinner(
  categoryId,
  nomineeId,
  notes = ""
) {

  const session =
    getSession();

  return api("adminSetLiveWinner", {
    username:
      session.username,

    token:
      session.token,

    gameId:
      APP_STATE.gameId || "",

    categoryId:
      categoryId,

    nomineeId:
      nomineeId,

    source:
      "admin",

    notes:
      notes
  });

}

async function apiAdminClearLiveWinner(
  categoryId,
  notes = ""
) {

  const session =
    getSession();

  return api("adminClearLiveWinner", {
    username:
      session.username,

    token:
      session.token,

    gameId:
      APP_STATE.gameId || "",

    categoryId:
      categoryId,

    source:
      "admin",

    notes:
      notes
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

const ADMIN_GAME_SAVE_REQUESTS = {};

function adminGameSaveRequestKey_(action, payload) {

  const gameId =
    payload && payload.gameId
      ? String(payload.gameId)
      : payload && payload.newGameId
        ? String(payload.newGameId)
        : payload && payload.sourceGameId
          ? String(payload.sourceGameId)
          : "new-game";

  return "admin-game-save:" + action + ":" + gameId;

}

async function apiAdminGameSaveRequest_(action, payload) {

  const key =
    adminGameSaveRequestKey_(
      action,
      payload
    );

  if (ADMIN_GAME_SAVE_REQUESTS[key]) {
    return ADMIN_GAME_SAVE_REQUESTS[key];
  }

  ADMIN_GAME_SAVE_REQUESTS[key] =
    api(
      action,
      payload
    ).finally(function() {
      delete ADMIN_GAME_SAVE_REQUESTS[key];
    });

  return ADMIN_GAME_SAVE_REQUESTS[key];

}

async function apiAdminSaveGame(payload) {

  return apiAdminGameSaveRequest_(
    "adminSaveGame",
    Object.assign(
      {},
      payload || {}
    )
  );

}

async function apiAdminCreateGame(payload) {

  return apiAdminGameSaveRequest_(
    "adminSaveGame",
    Object.assign(
      {},
      payload || {}
    )
  );

}

async function apiAdminUpdateGame(payload) {

  return apiAdminGameSaveRequest_(
    "adminSaveGame",
    Object.assign(
      {},
      payload || {}
    )
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

async function apiAdminSetupNormalizedQuestionStorage(force) {

  const session =
    getSession() || {};

  return api(
    "adminSetupNormalizedQuestionStorage",
    {
      username: session.username || "",
      token: session.token || "",
      migrateExisting: true,
      force: force === true
    }
  );

}

async function apiAdminGetStorageHealth(gameId) {

  const session =
    getSession() || {};

  return api(
    "adminGetStorageHealth",
    {
      username: session.username || "",
      token: session.token || "",
      gameId: gameId || ""
    }
  );

}

async function apiAdminArchiveGameDataPhase_(payload) {

  const session =
    getSession() || {};

  return api(
    "adminArchiveGameData",
    {
      username: session.username || "",
      token: session.token || "",
      gameId: payload.gameId || "",
      mode: payload.mode || "COPY",
      notes: payload.notes || "",
      confirmMove: payload.confirmMove === true,
      confirmRestore: payload.confirmRestore === true,
      confirmationText: payload.confirmationText || "",
      phase: payload.phase || "",
      jobId: payload.jobId || ""
    }
  );

}

function apiAdminArchiveRetryableResult_(result) {

  if (!result || result.success !== false) {
    return false;
  }

  const message = String(
    result.error || result.message || ""
  ).toLowerCase();

  return (
    result.retryable === true ||
    message.indexOf("timed out") >= 0 ||
    message.indexOf("connection error") >= 0 ||
    message.indexOf("please try again") >= 0 ||
    message.indexOf("another storage or archive operation") >= 0
  );

}

async function apiAdminArchiveGameDataPhaseWithRetry_(
  payload,
  maxAttempts
) {

  maxAttempts = Math.max(1, Number(maxAttempts || 3));
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await apiAdminArchiveGameDataPhase_(payload);

    if (
      !apiAdminArchiveRetryableResult_(lastResult) ||
      attempt === maxAttempts
    ) {
      return lastResult;
    }

    await new Promise(resolve =>
      setTimeout(resolve, 900 * attempt)
    );
  }

  return lastResult;

}

async function apiAdminGetArchiveDashboard() {

  const session = getSession() || {};

  return api("adminGetArchiveDashboard", {
    username: session.username || "",
    token: session.token || ""
  });

}

async function apiAdminGetArchiveGameStatus(gameId) {

  return apiAdminArchiveGameDataPhaseWithRetry_({
    gameId: gameId || "",
    mode: "COPY",
    phase: "STATUS"
  }, 2);

}

async function apiAdminArchiveGameData(
  gameId,
  mode,
  notes,
  confirmMove,
  onProgress,
  options
) {

  options = options || {};

  const base = {
    gameId: gameId || "",
    mode: mode || "COPY",
    notes: notes || "",
    confirmMove: confirmMove === true,
    confirmRestore: options.confirmRestore === true,
    confirmationText: options.confirmationText || ""
  };

  let current = await apiAdminArchiveGameDataPhaseWithRetry_({
    ...base,
    phase: "START"
  }, 3);

  if (!current || current.success === false) {
    return current;
  }

  if (typeof onProgress === "function") {
    onProgress(current);
  }

  const jobId = current.jobId || "";
  let guard = 0;

  while (
    current &&
    current.complete !== true &&
    guard < 20
  ) {
    guard++;

    const stepResult =
      await apiAdminArchiveGameDataPhaseWithRetry_({
        ...base,
        phase: "STEP",
        jobId: jobId
      }, 3);

    if (!stepResult || stepResult.success === false) {
      return stepResult;
    }

    current = stepResult;

    if (typeof onProgress === "function") {
      onProgress(current);
    }
  }

  if (!current || current.complete !== true) {
    return {
      success: false,
      message: "Archive stopped before all sheets were processed."
    };
  }

  const finalResult =
    await apiAdminArchiveGameDataPhaseWithRetry_({
      ...base,
      phase: "FINALIZE",
      jobId: jobId
    }, 3);

  if (typeof onProgress === "function") {
    onProgress(finalResult);
  }

  return finalResult;

}

async function apiAdminCloneGame(payload) {

  return apiAdminGameSaveRequest_(
    "adminCloneGame",
    payload
  );

}

async function apiAdminCloneGameSetup(payload) {

  return apiAdminGameSaveRequest_(
    "adminCloneGameSetup",
    payload
  );

}


/* ======================
   ADMIN: REALITY TV SEASON MANAGER
====================== */

function apiAdminRealityTvRequest_(action, payload) {

  const session = getSession();

  return api(
    action,
    {
      ...(payload || {}),
      username: session.username,
      token: session.token
    }
  );

}

function apiAdminRealityTvPostRequest_(action, payload) {

  const session = getSession();

  return apiPost(
    action,
    {
      ...(payload || {}),
      username: session.username,
      token: session.token
    }
  );

}

async function apiAdminSetupRealityTvSystem() {
  return apiAdminRealityTvRequest_("adminSetupRealityTvSystem", {});
}

async function apiAdminConfigureRealityTvHub(spreadsheetId) {
  return apiAdminRealityTvRequest_("adminConfigureRealityTvHub", {
    spreadsheetId: spreadsheetId
  });
}

async function apiAdminGetRealityTvDashboard() {
  return apiAdminRealityTvRequest_("adminGetRealityTvDashboard", {});
}

async function apiAdminSaveSeasonAnchorSettings(payload) {
  return apiAdminRealityTvRequest_("adminSaveSeasonAnchorSettings", payload || {});
}

async function apiAdminCreateRealityTvSeason(payload) {
  return apiAdminRealityTvPostRequest_("adminCreateRealityTvSeason", payload || {});
}

async function apiAdminAddRealityTvContestant(payload) {
  return apiAdminRealityTvRequest_("adminAddRealityTvContestant", payload || {});
}

async function apiAdminBulkAddRealityTvContestants(payload) {
  return apiAdminRealityTvPostRequest_("adminBulkAddRealityTvContestants", payload || {});
}

async function apiAdminSubmitRealityTvResult(payload) {
  return apiAdminRealityTvRequest_("adminSubmitRealityTvResult", payload || {});
}

async function apiAdminApproveRealityTvResult(queueId) {
  return apiAdminRealityTvRequest_("adminApproveRealityTvResult", { queueId: queueId });
}

async function apiAdminContinueRealityTvApproval(queueId) {
  return apiAdminRealityTvRequest_("adminContinueRealityTvApproval", { queueId: queueId });
}

async function apiAdminRejectRealityTvResult(queueId, notes) {
  return apiAdminRealityTvRequest_("adminRejectRealityTvResult", {
    queueId: queueId,
    notes: notes || ""
  });
}

async function apiAdminCreateNextRealityTvEpisode(seasonId) {
  return apiAdminRealityTvRequest_("adminCreateNextRealityTvEpisode", { seasonId: seasonId });
}

async function apiAdminUpdateRealityTvQuestionPack(payload) {
  return apiAdminRealityTvRequest_("adminUpdateRealityTvQuestionPack", payload || {});
}

async function apiAdminAddRealityTvCustomQuestionTemplate(payload) {
  return apiAdminRealityTvPostRequest_("adminAddRealityTvCustomQuestionTemplate", payload || {});
}

async function apiAdminBuildRealityTvEpisodeQuestions(payload) {
  return apiAdminRealityTvRequest_("adminBuildRealityTvEpisodeQuestions", payload || {});
}

async function apiAdminContinueRealityTvQuestionPackBuild(buildId) {
  return apiAdminRealityTvRequest_("adminContinueRealityTvQuestionPackBuild", { buildId: buildId });
}

async function apiAdminSubmitRealityTvQuestionResult(payload) {
  return apiAdminRealityTvRequest_("adminSubmitRealityTvQuestionResult", payload || {});
}

async function apiAdminApproveRealityTvQuestionResult(queueId) {
  return apiAdminRealityTvRequest_("adminApproveRealityTvQuestionResult", { queueId: queueId });
}

async function apiAdminContinueRealityTvQuestionApproval(queueId) {
  return apiAdminRealityTvRequest_("adminContinueRealityTvQuestionApproval", { queueId: queueId });
}

async function apiAdminRejectRealityTvQuestionResult(queueId, notes) {
  return apiAdminRealityTvRequest_("adminRejectRealityTvQuestionResult", {
    queueId: queueId,
    notes: notes || ""
  });
}

/* ======================
   ADMIN: GAME SETUP
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

  payload =
    payload || {};

  return api(
    "adminCreateCategory",
    payload
  );

}


async function apiAdminCloneCategory(payload) {

  return api(
    "adminCloneCategory",
    payload || {}
  );

}

async function apiAdminUpdateCategory(payload) {

  const session =
    getSession();

  payload =
    payload || {};

  return api(
    "adminUpdateCategory",
    {
      ...payload,

      username:
        session.username,

      token:
        session.token
    }
  );

}

async function apiAdminBulkUpdateGameSetup(gameId, questions, answers) {

  const session =
    getSession();

  const questionItems =
    Array.isArray(questions)
      ? questions
      : [];

  const answerItems =
    Array.isArray(answers)
      ? answers
      : [];

  const bulkResult = await api(
    "adminBulkUpdateGameSetup",
    {
      gameId: gameId,
      questionsJSON: JSON.stringify(questionItems),
      answersJSON: JSON.stringify(answerItems),
      username: session.username,
      token: session.token
    }
  );

  const bulkMessage = String(
    bulkResult && (bulkResult.message || bulkResult.error)
      ? bulkResult.message || bulkResult.error
      : ""
  );

  const bulkActionIsUnavailable =
    bulkResult &&
    bulkResult.success === false &&
    /Unknown action:\s*adminBulkUpdateGameSetup/i.test(bulkMessage);

  if (!bulkActionIsUnavailable) {
    return bulkResult;
  }

  // Compatibility fallback for a frontend that has deployed before the
  // matching Apps Script web-app version. Save each dirty item through the
  // long-standing individual update actions rather than losing the edits.
  const failures = [];
  let questionsSaved = 0;
  let answersSaved = 0;

  for (const item of questionItems) {
    const result = await apiAdminUpdateCategory({
      ...(item || {}),
      gameId: gameId
    });

    if (!result || result.success === false) {
      failures.push({
        type: "question",
        categoryId: String(item && item.categoryId || ""),
        error: result && (result.message || result.error)
          ? result.message || result.error
          : "Question could not be saved."
      });
    } else {
      questionsSaved += 1;
    }
  }

  for (const item of answerItems) {
    const result = await apiAdminUpdateNominee({
      ...(item || {}),
      gameId: gameId
    });

    if (!result || result.success === false) {
      failures.push({
        type: "answer",
        categoryId: String(item && item.categoryId || ""),
        nomineeId: String(item && item.nomineeId || ""),
        error: result && (result.message || result.error)
          ? result.message || result.error
          : "Answer could not be saved."
      });
    } else {
      answersSaved += 1;
    }
  }

  return {
    success: failures.length === 0,
    message: failures.length
      ? "Some Game Setup changes could not be saved."
      : "All Game Setup changes saved using compatibility mode.",
    questionsSaved: questionsSaved,
    answersSaved: answersSaved,
    failures: failures,
    compatibilityFallback: true
  };

}

async function apiAdminDeleteCategory(gameId, categoryId) {

  const session =
    getSession();

  return api(
    "adminDeleteCategory",
    {
      gameId: gameId,
      categoryId: categoryId,
      username: session.username,
      token: session.token
    }
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

async function apiAdminBulkCreateNominees(payload) {

  return api(
    "adminBulkCreateNominees",
    payload || {}
  );

}

async function apiAdminCloneNominee(payload) {

  return api(
    "adminCloneNominee",
    payload || {}
  );

}

async function apiAdminUpdateNominee(payload) {

  return api(
    "adminUpdateNominee",
    payload
  );

}

async function apiAdminDeleteNominee(gameId, categoryId, nomineeId) {

  const session = getSession();

  return api(
    "adminDeleteNominee",
    {
      gameId: gameId,
      categoryId: categoryId,
      nomineeId: nomineeId,
      username: session.username,
      token: session.token
    }
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

async function apiAdminImportImageFromUrl(payload) {

  return apiPost(
    "adminImportImageFromUrl",
    {
      gameId:
        payload.gameId,

      categoryId:
        payload.categoryId,

      nomineeId:
        payload.nomineeId,

      imageUrl:
        payload.imageUrl
    }
  );

}

async function apiAdminDeleteImageFromDrive(payload) {

  return apiPost(
    "adminDeleteImageFromDrive",
    {
      fileId:
        payload.fileId
    }
  );

}

async function apiAdminSearchTmdbMoviePosters(payload) {

  return apiPost(
    "adminSearchTmdbMoviePosters",
    {
      query:
        payload.query
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

async function apiAdminSetupScoringAutomationSystem(gameId) {

  const session =
    getSession();

  return api(
    "adminSetupScoringAutomationSystem",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminRunScoringAutomation(gameId) {

  const session =
    getSession();

  return api(
    "adminRunScoringAutomation",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminGetScoringAutomationStatus(gameId) {

  const session =
    getSession();

  return api(
    "adminGetScoringAutomationStatus",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminInstallScoringAutomationTrigger() {

  const session =
    getSession();

  return api(
    "adminInstallScoringAutomationTrigger",
    {
      username:
        session.username,

      token:
        session.token
    }
  );

}

async function apiAdminUninstallScoringAutomationTrigger() {

  const session =
    getSession();

  return api(
    "adminUninstallScoringAutomationTrigger",
    {
      username:
        session.username,

      token:
        session.token
    }
  );

}

/* ======================
   INTERNET RESULTS IMPORT
====================== */

async function apiAdminSetupInternetResultsSystem(gameId) {

  const session =
    getSession();

  return api(
    "adminSetupInternetResultsSystem",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminPullInternetResults(payload) {

  const session =
    getSession();

  payload =
    payload || {};

  return api(
    "adminPullInternetResults",
    {
      ...payload,

      username:
        session.username,

      token:
        session.token
    }
  );

}

async function apiAdminGetLastInternetImport(gameId) {

  const session =
    getSession();

  return api(
    "adminGetLastInternetImport",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminGetInternetSources(gameId) {

  const session =
    getSession();

  return api(
    "adminGetInternetSources",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminSaveInternetSource(payload) {

  const session =
    getSession();

  payload =
    payload || {};

  return api(
    "adminSaveInternetSource",
    {
      ...payload,

      username:
        session.username,

      token:
        session.token
    }
  );

}

async function apiAdminGenerateResultSuggestions(gameId) {

  const session =
    getSession();

  return api(
    "adminGenerateResultSuggestions",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminGetResultSuggestions(gameId) {

  const session =
    getSession();

  return api(
    "adminGetResultSuggestions",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

async function apiAdminApplyResultSuggestion(
  gameId,
  suggestionId
) {

  const session =
    getSession();

  return api(
    "adminApplyResultSuggestion",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      suggestionId:
        suggestionId
    }
  );

}

async function apiAdminRejectResultSuggestion(
  gameId,
  suggestionId
) {

  const session =
    getSession();

  return api(
    "adminRejectResultSuggestion",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      suggestionId:
        suggestionId
    }
  );

}

async function apiAdminApplyHighConfidenceSuggestions(
  gameId,
  minConfidence = 90
) {

  const session =
    getSession();

  return api(
    "adminApplyHighConfidenceSuggestions",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      minConfidence:
        minConfidence,

      latestOnly:
        true
    }
  );

}

async function apiAdminParseSportsScoreboard(gameId) {

  const session =
    getSession();

  return api(
    "adminParseSportsScoreboard",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId
    }
  );

}

/* ======================
   BETTING
====================== */

async function apiBuildLegacyBettingPagePayload_(username, gameId, firstError, options = {}) {

  const includeSummary =
    options.includeSummary !== false;

  const [optionsRes, betsRes] =
    await Promise.all([
      apiGetBettingOptions(gameId),
      includeSummary
        ? apiGetMyBets(username, gameId)
        : Promise.resolve({ summary: {} })
    ]);

  if (!optionsRes || optionsRes.success === false) {
    return optionsRes || {
      success: false,
      message:
        firstError ||
        "Could not load wager options."
    };
  }

  const categories =
    Array.isArray(optionsRes.categories)
      ? optionsRes.categories
      : [];

  const offset = Number(options.offset || 0);
  const limit = Number(options.limit || categories.length || 12);

  const batchCategories = categories.slice(
    offset,
    offset + limit
  );

  const nextOffset = offset + batchCategories.length;

  return {
    success: true,
    optimized: false,
    fallback: true,
    batched: true,
    payloadType: "betting_page_light_fallback",
    gameId,
    config: optionsRes.config || {},
    categories: batchCategories,
    categoryBatch: {
      offset: offset,
      limit: limit,
      count: batchCategories.length,
      total: categories.length,
      nextOffset: nextOffset,
      hasMore: nextOffset < categories.length
    },
    hasMoreCategories: nextOffset < categories.length,
    nextCategoryOffset: nextOffset,
    summary:
      betsRes && betsRes.summary
        ? betsRes.summary
        : {},
    leaderboard: [],
    leaderboardDeferred: true
  };

}

async function apiGetBettingPagePayload(username, gameId, options = {}) {

  options = options || {};

  const session =
    typeof getSession === "function"
      ? getSession() || {}
      : {};

  const res =
    await api("getBettingPagePayload", {
      username,
      token:
        session.token || "",
      gameId,
      leagueId:
        getApiLeagueId_(),
      offset:
        options.offset !== undefined
          ? options.offset
          : 0,
      limit:
        options.limit !== undefined
          ? options.limit
          : 12,
      includeSummary:
        options.includeSummary !== undefined
          ? options.includeSummary
          : true,
      includeLeaderboard:
        options.includeLeaderboard === true
    });

  if (res && res.success !== false) {
    return res;
  }

  const firstError =
    res && (res.message || res.error)
      ? String(res.message || res.error)
      : "";

  console.warn(
    "Optimized betting payload unavailable; using legacy wager calls.",
    firstError
  );

  return apiBuildLegacyBettingPagePayload_(
    username,
    gameId,
    firstError,
    options
  );

}

async function apiGetBettingOptions(gameId) {

  const session = getSession ? getSession() : {};

  return api("getBettingOptions", {
    username: session && session.username ? session.username : "",
    gameId,
    leagueId: getApiLeagueId_()
  });

}

async function apiGetMyBets(username, gameId) {

  return api("getMyBets", {
    username,
    gameId,
    leagueId: getApiLeagueId_()
  });

}

async function apiSaveBet(payload) {

  payload = payload || {};

  return api("saveBet", {
    username: payload.username,
    gameId: payload.gameId,
    leagueId: payload.leagueId || getApiLeagueId_(),
    categoryId: payload.categoryId,
    nomineeId: payload.nomineeId,
    betAmount: payload.betAmount
  });

}

async function apiBettingLeaderboard(gameId) {

  const session = getSession ? getSession() : {};

  return api("bettingLeaderboard", {
    username: session && session.username ? session.username : "",
    gameId,
    leagueId: getApiLeagueId_()
  });

}

async function apiRemoveBet(payload) {

  payload = payload || {};

  return api("removeBet", {
    username: payload.username,
    gameId: payload.gameId,
    leagueId: payload.leagueId || getApiLeagueId_(),
    categoryId: payload.categoryId
  });

}

async function apiAdminRefreshSportsWagerScores(
  gameId,
  options = {}
) {

  const session =
    getSession();

  return api(
    "adminRefreshSportsWagerScores",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      awardsGameId:
        gameId,

      refreshEngineFirst:
        options.refreshEngineFirst,

      scoreRefreshMode:
        options.scoreRefreshMode,

      daysBack:
        options.daysBack,

      daysForward:
        options.daysForward
    }
  );

}



async function apiAdminSettleSportsWagers(
  gameId,
  options = {}
) {

  const session =
    getSession();

  return api(
    "adminSettleSportsWagers",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      awardsGameId:
        gameId,

      skipRefresh:
        options.skipRefresh === undefined
          ? true
          : options.skipRefresh,

      refreshEngineFirst:
        options.refreshEngineFirst,

      scoreRefreshMode:
        options.scoreRefreshMode,

      daysBack:
        options.daysBack,

      daysForward:
        options.daysForward
    }
  );

}

async function apiAdminRefreshAndSettleSportsWagers(
  gameId,
  options = {}
) {

  const session =
    getSession();

  return api(
    "adminRefreshAndSettleSportsWagers",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      awardsGameId:
        gameId,

      scoreRefreshMode:
        options.scoreRefreshMode || "window",

      daysBack:
        options.daysBack === undefined
          ? 2
          : options.daysBack,

      daysForward:
        options.daysForward === undefined
          ? 2
          : options.daysForward,

      force:
        options.force
    }
  );

}



async function apiAdminAutoSetSportsWagerOdds(gameId) {

  const session =
    getSession();

  return api(
    "adminAutoSetSportsWagerOdds",
    {
      username:
        session.username,

      token:
        session.token,

      gameId:
        gameId,

      awardsGameId:
        gameId
    }
  );

}



async function apiAdminRunSportsFullSync() {

  return apiAdminSportsControl_(
    "adminRunSportsFullSync",
    {
      refreshOddsEngineFirst:
        true
    }
  );

}



/* ======================
   SPORTS CONTROL ADMIN
====================== */

function apiAdminSportsSession_() {

  const session =
    getSession();

  return {
    username:
      session && session.username
        ? session.username
        : "",

    token:
      session && session.token
        ? session.token
        : ""
  };

}

async function apiAdminSportsControl_(
  action,
  params = {}
) {

  const session =
    apiAdminSportsSession_();

  return api(
    action,
    {
      username:
        session.username,

      token:
        session.token,

      ...params
    }
  );

}

async function apiAdminGetSportsControlDashboard() {

  return apiAdminSportsControl_(
    "adminGetSportsControlDashboard"
  );

}

async function apiAdminSetupSportsControls() {

  return apiAdminSportsControl_(
    "adminSetupSportsControls"
  );

}

async function apiAdminGetSportsPlayerStatus() {

  return apiAdminSportsControl_(
    "adminGetSportsPlayerStatus"
  );

}

async function apiAdminSyncSportsPlayers(
  league,
  sport
) {

  return apiAdminSportsControl_(
    "adminSyncSportsPlayers",
    {
      league:
        league,

      sport:
        sport
    }
  );

}

async function apiAdminRefreshSportsPlayerGameStats(
  league,
  sport,
  options = {}
) {

  return apiAdminSportsControl_(
    "adminRefreshSportsPlayerGameStats",
    {
      league:
        league,

      sport:
        sport,

      daysBack:
        options.daysBack === undefined
          ? 1
          : options.daysBack,

      daysForward:
        options.daysForward === undefined
          ? 1
          : options.daysForward,

      maxGames:
        options.maxGames || 20
    }
  );

}

async function apiAdminGetSportsPlayerPropPlayers(
  league,
  sport,
  options = {}
) {

  return apiAdminSportsControl_(
    "adminGetSportsPlayerPropPlayers",
    {
      league: league,
      sport: sport,
      team: options.team || "",
      search: options.search || "",
      limit: options.limit || 2000
    }
  );

}

async function apiAdminGetSportsPlayerPropStatTypes(
  league,
  sport
) {

  return apiAdminSportsControl_(
    "adminGetSportsPlayerPropStatTypes",
    {
      league: league,
      sport: sport
    }
  );

}

async function apiAdminCreateSportsPlayerProp(payload = {}) {

  return apiAdminSportsControl_(
    "adminCreateSportsPlayerProp",
    payload
  );

}

async function apiAdminCreateSportsPlayerMatchup(payload = {}) {

  return apiAdminSportsControl_(
    "adminCreateSportsPlayerMatchup",
    payload
  );

}

async function apiAdminGetSportsAdvancedQuestionOptions(
  league,
  sport
) {

  return apiAdminSportsControl_(
    "adminGetSportsAdvancedQuestionOptions",
    {
      league: league,
      sport: sport
    }
  );

}

async function apiAdminCreateSportsAdvancedQuestion(payload = {}) {

  return apiAdminSportsControl_(
    "adminCreateSportsAdvancedQuestion",
    payload
  );

}

async function apiAdminSettleSportsAdvancedQuestions(
  gameId,
  options = {}
) {

  return apiAdminSportsControl_(
    "adminSettleSportsAdvancedQuestions",
    {
      gameId: gameId,
      awardsGameId: gameId,
      force: options.force === undefined ? true : options.force,
      refreshStats: options.refreshStats === undefined ? true : options.refreshStats
    }
  );

}

async function apiAdminSetupSportsAdvancedStats() {

  return apiAdminSportsControl_(
    "adminSetupSportsAdvancedStats"
  );

}

async function apiAdminRefreshSportsAdvancedStats(
  options = {}
) {

  return apiAdminSportsControl_(
    "adminRefreshSportsAdvancedStats",
    options
  );

}

async function apiAdminGetSportsAdvancedStatsStatus() {

  return apiAdminSportsControl_(
    "adminGetSportsAdvancedStatsStatus"
  );

}

async function apiAdminSettleSportsPlayerMatchups(
  gameId,
  options = {}
) {

  return apiAdminSportsControl_(
    "adminSettleSportsPlayerMatchups",
    {
      gameId: gameId,
      awardsGameId: gameId,
      force: options.force === undefined ? true : options.force,
      refreshStats: options.refreshStats === undefined ? true : options.refreshStats
    }
  );

}

async function apiAdminSettleSportsPlayerProps(
  gameId,
  options = {}
) {

  return apiAdminSportsControl_(
    "adminSettleSportsPlayerProps",
    {
      gameId: gameId,
      awardsGameId: gameId,
      force: options.force === undefined ? true : options.force,
      refreshStats: options.refreshStats === undefined ? true : options.refreshStats
    }
  );

}

async function apiAdminRefreshSportsScoresNow() {

  return apiAdminSportsControl_(
    "adminRefreshSportsScoresNow"
  );

}

async function apiAdminRefreshSportsScoresWindow(
  daysBack = 2,
  daysForward = 7
) {

  return apiAdminSportsControl_(
    "adminRefreshSportsScoresWindow",
    {
      daysBack:
        daysBack,

      daysForward:
        daysForward
    }
  );

}

async function apiAdminInstallSportsScoresWindowTrigger() {

  return apiAdminSportsControl_(
    "adminInstallSportsScoresWindowTrigger"
  );

}

async function apiAdminRemoveSportsScoresWindowTrigger() {

  return apiAdminSportsControl_(
    "adminRemoveSportsScoresWindowTrigger"
  );

}

async function apiAdminInstallSportsWagerAutoSyncTrigger() {

  return apiAdminSportsControl_(
    "adminInstallSportsWagerAutoSyncTrigger"
  );

}

async function apiAdminRemoveSportsWagerAutoSyncTrigger() {

  return apiAdminSportsControl_(
    "adminRemoveSportsWagerAutoSyncTrigger"
  );

}

async function apiAdminGetSportsWagerAutoSyncStatus() {

  return apiAdminSportsControl_(
    "adminGetSportsWagerAutoSyncStatus"
  );

}

async function apiAdminInstallSmartSportsAutomation() {

  return apiAdminSportsControl_(
    "adminSetSportsEngineSmartAutomation",
    {
      enabled: true
    }
  );

}

async function apiAdminRemoveSmartSportsAutomation() {

  return apiAdminSportsControl_(
    "adminSetSportsEngineSmartAutomation",
    {
      enabled: false
    }
  );

}

async function apiAdminGetSmartSportsAutomationStatus() {

  return apiAdminSportsControl_(
    "adminGetSmartSportsAutomationStatus"
  );

}

async function apiAdminGetSportsLeagueSettings() {

  return apiAdminSportsControl_(
    "adminGetSportsLeagueSettings"
  );

}

async function apiAdminUpdateSportsLeagueSetting(
  league,
  enabled,
  options = {}
) {

  return apiAdminSportsControl_(
    "adminUpdateSportsLeagueSetting",
    {
      league:
        league,

      enabled:
        enabled,

      sport:
        options.sport,

      pollPreGameMinutes:
        options.pollPreGameMinutes,

      pollLiveMinutes:
        options.pollLiveMinutes,

      pollFinalMinutes:
        options.pollFinalMinutes,

      savePeriodSnapshots:
        options.savePeriodSnapshots,

      espnScoreboardUrl:
        options.espnScoreboardUrl,

      season:
        options.season,

      seasonTitle:
        options.seasonTitle,

      seasonYear:
        options.seasonYear,

      scheduleSource:
        options.scheduleSource,

      espnSeasonTypesEnabled:
        options.espnSeasonTypesEnabled,

      espnPreseasonType:
        options.espnPreseasonType,

      espnRegularSeasonType:
        options.espnRegularSeasonType,

      espnPostseasonType:
        options.espnPostseasonType,

      espnTournamentType:
        options.espnTournamentType,

      espnBowlType:
        options.espnBowlType,

      collegeCoverageMode:
        options.collegeCoverageMode,

      espnGroupIds:
        options.espnGroupIds,

      espnResultLimit:
        options.espnResultLimit,

      selectedTeamIds:
        options.selectedTeamIds,

      seasonActive:
        options.seasonActive,

      seasonStartDate:
        options.seasonStartDate,

      seasonEndDate:
        options.seasonEndDate,

      preseasonEnabled:
        options.preseasonEnabled,

      preseasonStartDate:
        options.preseasonStartDate,

      preseasonEndDate:
        options.preseasonEndDate,

      regularSeasonStartDate:
        options.regularSeasonStartDate,

      regularSeasonEndDate:
        options.regularSeasonEndDate,

      postseasonEnabled:
        options.postseasonEnabled,

      postseasonStartDate:
        options.postseasonStartDate,

      postseasonEndDate:
        options.postseasonEndDate,

      tournamentEnabled:
        options.tournamentEnabled,

      tournamentStartDate:
        options.tournamentStartDate,

      tournamentEndDate:
        options.tournamentEndDate,

      bowlEnabled:
        options.bowlEnabled,

      bowlStartDate:
        options.bowlStartDate,

      bowlEndDate:
        options.bowlEndDate,

      oddsEnabled:
        options.oddsEnabled,

      oddsCooldownMinutes:
        options.oddsCooldownMinutes,

      oddsDailyMaxPulls:
        options.oddsDailyMaxPulls,

      oddsMonthlyMaxPulls:
        options.oddsMonthlyMaxPulls,

      snapshotRetentionDays:
        options.snapshotRetentionDays,

      archiveEnabled:
        options.archiveEnabled,

      archiveAfterDays:
        options.archiveAfterDays,

      archiveMode:
        options.archiveMode,

      keepSnapshotsDays:
        options.keepSnapshotsDays,

      keepLogsDays:
        options.keepLogsDays
    }
  );

}

async function apiAdminPreviewSportsLeagueArchive(
  league
) {

  return apiAdminSportsControl_(
    "adminPreviewSportsLeagueArchive",
    {
      league:
        league
    }
  );

}

async function apiAdminRunSportsArchiveNow(
  league
) {

  return apiAdminSportsControl_(
    "adminRunSportsArchiveNow",
    {
      league:
        league || ""
    }
  );

}

async function apiAdminRepairSportsScoreDisplay() {

  return apiAdminSportsControl_(
    "adminRepairSportsScoreDisplay"
  );

}

async function apiAdminInstallSportsScoresTrigger() {

  return apiAdminSportsControl_(
    "adminInstallSportsScoresTrigger"
  );

}

async function apiAdminRemoveSportsScoresTrigger() {

  return apiAdminSportsControl_(
    "adminRemoveSportsScoresTrigger"
  );

}

async function apiAdminCreateSportsSeasonJobs(
  startDate,
  endDate,
  batchDays,
  options
) {

  options =
    options || {};

  return apiAdminSportsControl_(
    "adminCreateSportsSeasonJobs",
    {
      startDate:
        startDate,

      endDate:
        endDate,

      batchDays:
        batchDays,

      league:
        options.league || "",

      sport:
        options.sport || "",

      season:
        options.season || "",

      seasonYear:
        options.seasonYear || "",

      scheduleSource:
        options.scheduleSource || "HYBRID",

      seasonName:
        options.seasonName || ""
    }
  );

}

async function apiAdminRunSportsSeasonBatch() {

  return apiAdminSportsControl_(
    "adminRunSportsSeasonBatch"
  );

}

async function apiAdminRunSportsScheduleReconcile(options = {}) {

  return apiAdminSportsControl_(
    "adminRunSportsScheduleReconcile",
    {
      league:
        options.league || "",

      daysBack:
        options.daysBack || 1,

      daysForward:
        options.daysForward || 21
    }
  );

}

async function apiAdminInstallSportsScheduleReconcileTrigger() {

  return apiAdminSportsControl_(
    "adminInstallSportsScheduleReconcileTrigger"
  );

}

async function apiAdminRemoveSportsScheduleReconcileTrigger() {

  return apiAdminSportsControl_(
    "adminRemoveSportsScheduleReconcileTrigger"
  );

}

async function apiAdminUpdateSportsSeasonJobStatus(
  league,
  status,
  jobId
) {

  return apiAdminSportsControl_(
    "adminUpdateSportsSeasonJobStatus",
    {
      league:
        league,

      status:
        status,

      jobId:
        jobId
    }
  );

}

async function apiAdminInstallSportsSeasonBatchTrigger() {

  return apiAdminSportsControl_(
    "adminInstallSportsSeasonBatchTrigger"
  );

}

async function apiAdminRemoveSportsSeasonBatchTrigger() {

  return apiAdminSportsControl_(
    "adminRemoveSportsSeasonBatchTrigger"
  );

}

async function apiAdminGetSportsOddsSettings() {

  return apiAdminSportsControl_(
    "adminGetSportsOddsSettings"
  );

}

async function apiAdminUpdateSportsOddsSetting(
  league,
  patch = {}
) {

  return apiAdminSportsControl_(
    "adminUpdateSportsOddsSetting",
    {
      league:
        league,

      oddsEnabled:
        patch.oddsEnabled,

      autoRefreshEnabled:
        patch.autoRefreshEnabled,

      manualRefreshEnabled:
        patch.manualRefreshEnabled,

      maxRefreshesPerDay:
        patch.maxRefreshesPerDay,

      monthlyBudget:
        patch.monthlyBudget,

      oddsWindow:
        patch.oddsWindow,

      stopAtMonthlyCalls:
        patch.stopAtMonthlyCalls,

      defaultMarkets:
        patch.defaultMarkets,

      notes:
        patch.notes
    }
  );

}

async function apiAdminRefreshSportsOddsLeague(
  league
) {

  return apiAdminSportsControl_(
    "adminRefreshSportsOddsLeague",
    {
      league:
        league
    }
  );

}

async function apiAdminRunSportsOddsHybridRefresh() {

  return apiAdminSportsControl_(
    "adminRunSportsOddsHybridRefresh"
  );

}

async function apiAdminInstallSportsOddsHybridTrigger(
  hour = 8
) {

  return apiAdminSportsControl_(
    "adminInstallSportsOddsHybridTrigger",
    {
      hour:
        hour
    }
  );

}

async function apiAdminRemoveSportsOddsHybridTrigger() {

  return apiAdminSportsControl_(
    "adminRemoveSportsOddsHybridTrigger"
  );

}