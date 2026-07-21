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

const SPORTS_ADMIN_BRIDGE_FALLBACK_KEY_PROPERTY =
  "SPORTS_ADMIN_API_KEY";

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

  let url =
    sportsAdminBridgeString_(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          SPORTS_ADMIN_BRIDGE_URL_PROPERTY
        )
    );

  if (
    !url &&
    typeof sportsWagerGetApiUrl_ === "function"
  ) {
    url = sportsWagerGetApiUrl_();
  }

  /*
    Last fallback:
    SportsWagerEngine keeps a fallback URL for backward compatibility.
  */
  if (
    !url &&
    typeof SPORTS_WAGER_API_URL !== "undefined" &&
    SPORTS_WAGER_API_URL
  ) {
    url = SPORTS_WAGER_API_URL;
  }

  url =
    sportsAdminBridgeString_(url)
      .replace(/\?+$/, "");

  if (url) {
    return url;
  }

  throw new Error(
    "Missing script property: " +
    SPORTS_ADMIN_BRIDGE_URL_PROPERTY
  );

}

function sportsAdminBridgeGetKey_() {

  const props =
    PropertiesService
      .getScriptProperties();

  const key =
    sportsAdminBridgeString_(
      props.getProperty(
        SPORTS_ADMIN_BRIDGE_KEY_PROPERTY
      )
    ) ||
    sportsAdminBridgeString_(
      props.getProperty(
        SPORTS_ADMIN_BRIDGE_FALLBACK_KEY_PROPERTY
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
        followRedirects: true,
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
   SCORE REFRESH CONTROLS
===================================================== */

function apiAdminRefreshSportsScoresNow(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "refreshSportsScoresNowAdmin",
    {}
  );

}

function apiAdminRefreshSportsScoresWindow(payload) {

  payload =
    payload || {};

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "refreshSportsScoresWindowAdmin",
    {
      daysBack:
        payload.daysBack || 2,

      daysForward:
        payload.daysForward || 7
    }
  );

}

function apiAdminInstallSportsScoresWindowTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "installSportsScoresWindowTriggerAdmin",
    {}
  );

}

function apiAdminRemoveSportsScoresWindowTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "removeSportsScoresWindowTriggerAdmin",
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
        payload.espnScoreboardUrl,

      season:
        payload.season,

      seasonTitle:
        payload.seasonTitle,

      seasonYear:
        payload.seasonYear,

      scheduleSource:
        payload.scheduleSource,

      espnSeasonTypesEnabled:
        payload.espnSeasonTypesEnabled,

      espnPreseasonType:
        payload.espnPreseasonType,

      espnRegularSeasonType:
        payload.espnRegularSeasonType,

      espnPostseasonType:
        payload.espnPostseasonType,

      espnTournamentType:
        payload.espnTournamentType,

      espnBowlType:
        payload.espnBowlType,

      collegeCoverageMode:
        payload.collegeCoverageMode,

      espnGroupIds:
        payload.espnGroupIds,

      espnResultLimit:
        payload.espnResultLimit,

      selectedTeamIds:
        payload.selectedTeamIds,

      seasonActive:
        payload.seasonActive,

      seasonStartDate:
        payload.seasonStartDate,

      seasonEndDate:
        payload.seasonEndDate,

      preseasonEnabled:
        payload.preseasonEnabled,

      preseasonStartDate:
        payload.preseasonStartDate,

      preseasonEndDate:
        payload.preseasonEndDate,

      regularSeasonStartDate:
        payload.regularSeasonStartDate,

      regularSeasonEndDate:
        payload.regularSeasonEndDate,

      postseasonEnabled:
        payload.postseasonEnabled,

      postseasonStartDate:
        payload.postseasonStartDate,

      postseasonEndDate:
        payload.postseasonEndDate,

      tournamentEnabled:
        payload.tournamentEnabled,

      tournamentStartDate:
        payload.tournamentStartDate,

      tournamentEndDate:
        payload.tournamentEndDate,

      bowlEnabled:
        payload.bowlEnabled,

      bowlStartDate:
        payload.bowlStartDate,

      bowlEndDate:
        payload.bowlEndDate,

      oddsEnabled:
        payload.oddsEnabled,

      oddsCooldownMinutes:
        payload.oddsCooldownMinutes,

      oddsDailyMaxPulls:
        payload.oddsDailyMaxPulls,

      oddsMonthlyMaxPulls:
        payload.oddsMonthlyMaxPulls,

      snapshotRetentionDays:
        payload.snapshotRetentionDays,

      archiveEnabled:
        payload.archiveEnabled,

      archiveAfterDays:
        payload.archiveAfterDays,

      archiveMode:
        payload.archiveMode,

      keepSnapshotsDays:
        payload.keepSnapshotsDays,

      keepLogsDays:
        payload.keepLogsDays
    }
  );

}

function apiAdminPreviewSportsLeagueArchive(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "previewSportsLeagueArchiveAdmin",
    {
      league:
        payload.league
    }
  );

}

function apiAdminRunSportsArchiveNow(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "runSportsArchiveNowAdmin",
    {
      league:
        payload.league || ""
    }
  );

}

function apiAdminRepairSportsScoreDisplay(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "repairSportsScoreDisplayAdmin",
    {}
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
        payload.batchDays,

      league:
        payload.league || "",

      sport:
        payload.sport || "",

      season:
        payload.season || "",

      seasonYear:
        payload.seasonYear || "",

      scheduleSource:
        payload.scheduleSource || "HYBRID",

      seasonName:
        payload.seasonName || ""
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

function apiAdminRunSportsScheduleReconcile(payload) {

  payload =
    payload || {};

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "runSportsScheduleReconcileAdmin",
    {
      league:
        payload.league || "",

      daysBack:
        payload.daysBack || 1,

      daysForward:
        payload.daysForward || 21
    }
  );

}

function apiAdminInstallSportsScheduleReconcileTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "installSportsScheduleReconcileTriggerAdmin",
    {}
  );

}

function apiAdminRemoveSportsScheduleReconcileTrigger(payload) {

  sportsAdminBridgeRequireAdmin_(
    payload
  );

  return sportsAdminBridgeCall_(
    "removeSportsScheduleReconcileTriggerAdmin",
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