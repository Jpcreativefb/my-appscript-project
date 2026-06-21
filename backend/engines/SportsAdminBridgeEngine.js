/* =====================================================
   SPORTS ADMIN BRIDGE ENGINE
   Lives in Awards App backend.

   Purpose:
   - Lets Awards App Admin control the separate
     Sports Scores Engine safely.
   - Keeps SPORTS_ADMIN_API_KEY out of frontend JS.

   Required Awards App Script Properties:
   SPORTS_SCORES_ADMIN_API_URL
   SPORTS_SCORES_ADMIN_API_KEY
===================================================== */

/* =====================================================
   CONFIG
===================================================== */

const SPORTS_ADMIN_BRIDGE_URL_PROPERTY =
  "SPORTS_SCORES_ADMIN_API_URL";

const SPORTS_ADMIN_BRIDGE_KEY_PROPERTY =
  "SPORTS_SCORES_ADMIN_API_KEY";

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsAdminBridgeString_(value) {

  return String(value || "")
    .trim();

}

function sportsAdminBridgeBoolean_(value) {

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "").trim() === "1"
  );

}

function sportsAdminBridgeGetUrl_() {

  const url =
    sportsAdminBridgeString_(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          SPORTS_ADMIN_BRIDGE_URL_PROPERTY
        )
    );

  if (url) {
    return url;
  }

  /*
    Fallback:
    SportsWagerEngine already has the Sports Scores
    Engine URL as SPORTS_WAGER_API_URL.
  */
  if (
    typeof SPORTS_WAGER_API_URL !== "undefined" &&
    SPORTS_WAGER_API_URL
  ) {
    return SPORTS_WAGER_API_URL;
  }

  throw new Error(
    "Missing script property: " +
    SPORTS_ADMIN_BRIDGE_URL_PROPERTY
  );

}

function sportsAdminBridgeGetKey_() {

  const key =
    sportsAdminBridgeString_(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          SPORTS_ADMIN_BRIDGE_KEY_PROPERTY
        )
    );

  if (!key) {
    throw new Error(
      "Missing script property: " +
      SPORTS_ADMIN_BRIDGE_KEY_PROPERTY
    );
  }

  return key;

}

function sportsAdminBridgeCall_(
  sportsAction,
  params
) {

  sportsAction =
    sportsAdminBridgeString_(
      sportsAction
    );

  params =
    params || {};

  if (!sportsAction) {
    throw new Error(
      "sportsAction is required"
    );
  }

  const query = {
    action:
      sportsAction,

    adminKey:
      sportsAdminBridgeGetKey_()
  };

  Object.keys(params)
    .forEach(function(key) {

      const value =
        params[key];

      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      query[key] =
        value;

    });

  const queryString =
    Object.keys(query)
      .map(function(key) {
        return (
          encodeURIComponent(key) +
          "=" +
          encodeURIComponent(query[key])
        );
      })
      .join("&");

  const url =
    sportsAdminBridgeGetUrl_() +
    "?" +
    queryString;

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  const body =
    response.getContentText();

  let parsed;

  try {

    parsed =
      JSON.parse(
        body
      );

  } catch (err) {

    throw new Error(
      "Sports Scores Engine returned non-JSON response. HTTP " +
      code +
      ": " +
      body.slice(0, 300)
    );

  }

  if (
    code < 200 ||
    code >= 300
  ) {
    return {
      success: false,
      error:
        "Sports Scores Engine HTTP " +
        code,
      response:
        parsed
    };
  }

  return parsed;

}

/* =====================================================
   ADMIN WRAPPER
===================================================== */

function sportsAdminBridgeRequireAdmin_(payload) {

  payload =
    payload || {};

  if (typeof requireAdmin_ === "function") {
    requireAdmin_(
      payload
    );
    return true;
  }

  if (typeof requireAdminFromToken_ === "function") {
    requireAdminFromToken_(
      payload.token
    );
    return true;
  }

  throw new Error(
    "No admin authorization helper found"
  );

}

/* =====================================================
   DASHBOARD / SETUP
===================================================== */

function apiAdminSetupSportsControls(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "setupSportsAdminControls",
    {}
  );

}

function apiAdminGetSportsControlDashboard(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "getSportsAdminDashboard",
    {}
  );

}

/* =====================================================
   SCORE LEAGUE CONTROLS
===================================================== */

function apiAdminGetSportsLeagueSettings(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "getSportsSettingsAdmin",
    {}
  );

}

function apiAdminUpdateSportsLeagueSetting(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "updateSportsLeagueSetting",
    {
      sport:
        payload.sport,

      league:
        payload.league,

      enabled:
        payload.enabled,

      pollPreGameMinutes:
        payload.pollPreGameMinutes,

      pollLiveMinutes:
        payload.pollLiveMinutes,

      pollFinalMinutes:
        payload.pollFinalMinutes,

      savePeriodSnapshots:
        payload.savePeriodSnapshots,

      espnScoreboardUrl:
        payload.espnScoreboardUrl
    }
  );

}

function apiAdminInstallSportsScoresTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "installSportsScoresTriggerAdmin",
    {}
  );

}

function apiAdminRemoveSportsScoresTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "removeSportsScoresTriggerAdmin",
    {}
  );

}

/* =====================================================
   SCHEDULE / SEASON JOB CONTROLS
===================================================== */

function apiAdminCreateSportsSeasonJobs(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "createSportsSeasonJobsAdmin",
    {
      startDate:
        payload.startDate,

      endDate:
        payload.endDate,

      batchDays:
        payload.batchDays
    }
  );

}

function apiAdminRunSportsSeasonBatch(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "runSportsSeasonBatchAdmin",
    {}
  );

}

function apiAdminUpdateSportsSeasonJobStatus(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "updateSportsSeasonJobStatus",
    {
      jobId:
        payload.jobId,

      league:
        payload.league,

      status:
        payload.status
    }
  );

}

function apiAdminInstallSportsSeasonBatchTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "installSportsSeasonBatchTriggerAdmin",
    {}
  );

}

function apiAdminRemoveSportsSeasonBatchTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "removeSportsSeasonBatchTriggerAdmin",
    {}
  );

}

/* =====================================================
   ODDS CONTROLS
===================================================== */

function apiAdminGetSportsOddsSettings(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "getSportsOddsAdminSettings",
    {}
  );

}

function apiAdminUpdateSportsOddsSetting(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "updateSportsOddsAdminSetting",
    {
      league:
        payload.league,

      oddsEnabled:
        payload.oddsEnabled,

      autoRefreshEnabled:
        payload.autoRefreshEnabled,

      manualRefreshEnabled:
        payload.manualRefreshEnabled,

      maxRefreshesPerDay:
        payload.maxRefreshesPerDay,

      monthlyBudget:
        payload.monthlyBudget,

      stopAtMonthlyCalls:
        payload.stopAtMonthlyCalls,

      notes:
        payload.notes
    }
  );

}

function apiAdminRefreshSportsOddsLeague(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "refreshSportsOddsLeagueAdmin",
    {
      league:
        payload.league
    }
  );

}

function apiAdminRunSportsOddsHybridRefresh(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "runSportsOddsHybridRefresh",
    {}
  );

}

function apiAdminInstallSportsOddsHybridTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "installSportsOddsHybridTrigger",
    {
      hour:
        payload.hour || 8
    }
  );

}

function apiAdminRemoveSportsOddsHybridTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "removeSportsOddsHybridTrigger",
    {}
  );

}