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

async function apiLiveLeaderboard(gameId) {

  return api("liveLeaderboard", {
    gameId
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
    gameId
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
        : ""
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

      allowBetRemoval: payload.allowBetRemoval,

      wagerEditMode: payload.wagerEditMode,

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

async function apiGetBettingOptions(gameId) {

  return api("getBettingOptions", {
    gameId
  });

}

async function apiGetMyBets(username, gameId) {

  return api("getMyBets", {
    username,
    gameId
  });

}

async function apiSaveBet(payload) {

  payload = payload || {};

  return api("saveBet", {
    username: payload.username,
    gameId: payload.gameId,
    categoryId: payload.categoryId,
    nomineeId: payload.nomineeId,
    betAmount: payload.betAmount
  });

}

async function apiBettingLeaderboard(gameId) {

  return api("bettingLeaderboard", {
    gameId
  });

}

async function apiRemoveBet(payload) {

  payload = payload || {};

  return api("removeBet", {
    username: payload.username,
    gameId: payload.gameId,
    categoryId: payload.categoryId
  });

}

async function apiAdminRefreshSportsWagerScores(gameId) {

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
        gameId
    }
  );

}

async function apiAdminSettleSportsWagers(gameId) {

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
        gameId
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
        gameId
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
        options.espnScoreboardUrl
    }
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
  batchDays
) {

  return apiAdminSportsControl_(
    "adminCreateSportsSeasonJobs",
    {
      startDate:
        startDate,

      endDate:
        endDate,

      batchDays:
        batchDays
    }
  );

}

async function apiAdminRunSportsSeasonBatch() {

  return apiAdminSportsControl_(
    "adminRunSportsSeasonBatch"
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

      stopAtMonthlyCalls:
        patch.stopAtMonthlyCalls,

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