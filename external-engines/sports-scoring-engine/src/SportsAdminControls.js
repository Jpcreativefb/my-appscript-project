/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/

/************************************************************
 CLEAN SPLIT v11
 Older duplicate patch functions removed; latest definitions retained.
************************************************************/

/* =====================================================
   SPORTS ADMIN CONTROLS
   Lives in Sports Scores Engine.

   Purpose:
   - Admin control of score leagues
   - Admin control of schedule batch jobs/triggers
   - Admin control of hybrid odds refresh
   - Protect Odds API 500/month limit

   IMPORTANT:
   Set Script Property:
   SPORTS_ADMIN_API_KEY = your-secret-key

   Awards App backend should call these admin actions.
   Do NOT expose SPORTS_ADMIN_API_KEY in frontend JS.
===================================================== */

/* =====================================================
   CONFIG
===================================================== */

const SPORTS_ADMIN_API_KEY_PROPERTY =
  "SPORTS_ADMIN_API_KEY";

const SPORTS_ODDS_SETTINGS_SHEET =
  "SportsOddsSettings";

const SPORTS_ODDS_USAGE_SHEET =
  "SportsOddsUsage";

const SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION =
  "runSportsOddsHybridRefresh";

const SPORTS_ODDS_SETTINGS_HEADERS = [
  "League",
  "SportKey",
  "OddsEnabled",
  "AutoRefreshEnabled",
  "ManualRefreshEnabled",
  "MaxRefreshesPerDay",
  "MonthlyBudget",
  "StopAtMonthlyCalls",
  "DefaultMarkets",
  "DefaultRegions",
  "EstimatedCostPerRefresh",
  "CallsToday",
  "CallsThisMonth",
  "LastRefreshDate",
  "LastRefreshAt",
  "LastRefreshStatus",
  "LastRefreshMessage",
  "LastApiCost",
  "LastApiRemaining",
  "UpdatedAt",
  "Notes"
];

const SPORTS_ODDS_USAGE_HEADERS = [
  "Month",
  "TotalCallsUsed",
  "WarnAt",
  "HardCap",
  "UpdatedAt",
  "Notes"
];

/* =====================================================
   ADMIN SECURITY
===================================================== */

function assertSportsAdmin_(params) {

  params =
    params || {};

  const expected =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          SPORTS_ADMIN_API_KEY_PROPERTY
        ) || ""
    ).trim();

  if (!expected) {
    throw new Error(
      "Missing script property: " +
      SPORTS_ADMIN_API_KEY_PROPERTY
    );
  }

  const supplied =
    String(
      params.adminKey ||
      params.apiKey ||
      params.key ||
      ""
    ).trim();

  if (!supplied || supplied !== expected) {
    throw new Error(
      "Unauthorized sports admin request"
    );
  }

  return true;

}

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsAdminString_(value) {

  return String(value || "")
    .trim();

}

function sportsAdminKey_(value) {

  return sportsAdminString_(value)
    .toLowerCase();

}

function sportsAdminBoolean_(value, fallback) {

  if (
    value === true ||
    value === false
  ) {
    return value;
  }

  const raw =
    sportsAdminString_(value)
      .toLowerCase();

  if (
    raw === "true" ||
    raw === "yes" ||
    raw === "1" ||
    raw === "on"
  ) {
    return true;
  }

  if (
    raw === "false" ||
    raw === "no" ||
    raw === "0" ||
    raw === "off"
  ) {
    return false;
  }

  return fallback;

}

function sportsAdminNumber_(value, fallback) {

  const n =
    Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return fallback;
  }

  return n;

}

function sportsAdminToday_() {

  return normalizeSportsDateOnly_(
    new Date()
  );

}

function sportsAdminMonthKey_() {

  const d =
    new Date();

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1)
      .padStart(2, "0")
  );

}

function sportsAdminHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {

    map[
      sportsAdminString_(header)
    ] = index;

  });

  return map;

}

function sportsAdminEnsureSheet_(
  sheetName,
  headers
) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      sheetName
    );

  if (!sh) {
    sh =
      ss.insertSheet(
        sheetName
      );
  }

  if (sh.getLastRow() === 0) {
    sh
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([
        headers
      ]);

    sh.setFrozenRows(1);

    return sh;
  }

  const existing =
    sh
      .getRange(
        1,
        1,
        1,
        sh.getLastColumn()
      )
      .getValues()[0]
      .map(function(header) {
        return sportsAdminString_(header);
      });

  const missing =
    headers.filter(function(header) {
      return existing.indexOf(header) === -1;
    });

  if (missing.length) {
    sh
      .getRange(
        1,
        sh.getLastColumn() + 1,
        1,
        missing.length
      )
      .setValues([
        missing
      ]);
  }

  return sh;

}

function sportsAdminRowObject_(
  headers,
  row
) {

  const obj = {};

  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });

  return obj;

}

/* =====================================================
   SETUP
===================================================== */

function setupSportsAdminControlSystem() {

  setupSportsOddsAdminSettingsSheet_();
  setupSportsOddsUsageSheet_();
  seedSportsOddsAdminSettingsFromSportsSettings_();

  return {
    success: true,
    message:
      "Sports admin control system setup complete",
    sheets: [
      SPORTS_ODDS_SETTINGS_SHEET,
      SPORTS_ODDS_USAGE_SHEET
    ]
  };

}

function apiSetupSportsAdminControls_(params) {

  assertSportsAdmin_(
    params
  );

  return setupSportsAdminControlSystem();

}

/* =====================================================
   SPORTS SETTINGS ADMIN
   Controls score pulling by league.
===================================================== */

function readAllSportsSettingsRows_() {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SETTINGS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SETTINGS
    );
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  return data
    .slice(1)
    .map(function(row, index) {

      const obj =
        sportsAdminRowObject_(
          headers,
          row
        );

      obj._rowNumber =
        index + 2;

      return obj;

    });

}

function apiGetSportsSettingsAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  const rows =
    readAllSportsSettingsRows_()
      .map(function(row) {
        return {
          sport:
            sportsAdminString_(row.Sport),
          league:
            sportsAdminString_(row.League),
          enabled:
            normalizeSportsBoolean_(
              row.Enabled
            ),
          pollPreGameMinutes:
            sportsAdminNumber_(
              row.PollPreGameMinutes,
              30
            ),
          pollLiveMinutes:
            sportsAdminNumber_(
              row.PollLiveMinutes,
              1
            ),
          pollFinalMinutes:
            sportsAdminNumber_(
              row.PollFinalMinutes,
              60
            ),
          savePeriodSnapshots:
            normalizeSportsBoolean_(
              row.SavePeriodSnapshots
            ),
          espnScoreboardUrl:
            sportsAdminString_(
              row.ESPNScoreboardUrl
            )
        };
      });

  return {
    success: true,
    count: rows.length,
    leagues: rows
  };

}

function apiUpdateSportsLeagueSetting_(params) {

  assertSportsAdmin_(
    params
  );

  const league =
    sportsAdminKey_(
      params.league
    );

  const sport =
    sportsAdminKey_(
      params.sport
    );

  if (!league) {
    throw new Error(
      "league is required"
    );
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SETTINGS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SETTINGS
    );
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    throw new Error(
      "SportsSettings has no rows"
    );
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  let updated = 0;
  let updatedRow = null;

  for (let i = 1; i < data.length; i++) {

    const rowSport =
      sportsAdminKey_(
        data[i][col.Sport]
      );

    const rowLeague =
      sportsAdminKey_(
        data[i][col.League]
      );

    if (rowLeague !== league) {
      continue;
    }

    if (
      sport &&
      rowSport !== sport
    ) {
      continue;
    }

    const patch = {};

    if (params.enabled !== undefined) {
      patch.Enabled =
        sportsAdminBoolean_(
          params.enabled,
          true
        );
    }

    if (params.pollPreGameMinutes !== undefined) {
      patch.PollPreGameMinutes =
        sportsAdminNumber_(
          params.pollPreGameMinutes,
          30
        );
    }

    if (params.pollLiveMinutes !== undefined) {
      patch.PollLiveMinutes =
        sportsAdminNumber_(
          params.pollLiveMinutes,
          1
        );
    }

    if (params.pollFinalMinutes !== undefined) {
      patch.PollFinalMinutes =
        sportsAdminNumber_(
          params.pollFinalMinutes,
          60
        );
    }

    if (params.savePeriodSnapshots !== undefined) {
      patch.SavePeriodSnapshots =
        sportsAdminBoolean_(
          params.savePeriodSnapshots,
          true
        );
    }

    if (params.espnScoreboardUrl !== undefined) {
      patch.ESPNScoreboardUrl =
        sportsAdminString_(
          params.espnScoreboardUrl
        );
    }

    Object.keys(patch).forEach(function(key) {

      if (col[key] === undefined) {
        return;
      }

      sh
        .getRange(
          i + 1,
          col[key] + 1
        )
        .setValue(
          patch[key]
        );

    });

    updated++;
    updatedRow = i + 1;

  }

  if (!updated) {
    throw new Error(
      "No SportsSettings row found for league: " +
      league
    );
  }

  logSports_(
    "INFO",
    "apiUpdateSportsLeagueSetting_",
    "Updated sports league setting",
    JSON.stringify({
      league: league,
      sport: sport,
      row: updatedRow,
      updated: updated
    })
  );

  return {
    success: true,
    updated: updated,
    league: league,
    sport: sport || "",
    row: updatedRow
  };

}

/* =====================================================
   SCORE REFRESH ADMIN
===================================================== */

function apiRefreshSportsScoresNowAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return runSportsScoresUpdate();

}

function apiRefreshSportsScoresWindowAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  let daysBack =
    sportsAdminNumber_(
      params.daysBack,
      2
    );

  let daysForward =
    sportsAdminNumber_(
      params.daysForward,
      7
    );

  daysBack =
    Math.max(
      0,
      Math.min(
        7,
        Math.floor(daysBack)
      )
    );

  daysForward =
    Math.max(
      0,
      Math.min(
        14,
        Math.floor(daysForward)
      )
    );

  return runSportsScoresDateWindowUpdate_(
    daysBack,
    daysForward,
    {
      leagues:
        params.leagues ||
        params.league ||
        ""
    }
  );

}

/* =====================================================
   TRIGGER ADMIN
===================================================== */

function apiInstallSportsScoresTriggerAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return installSportsScoresTrigger();

}

function apiRemoveSportsScoresTriggerAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return removeSportsScoresTriggers();

}

function apiInstallSportsScoresWindowTriggerAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return installSportsScoresWindowTrigger();

}

function apiRemoveSportsScoresWindowTriggerAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return removeSportsScoresWindowTriggers();

}

function apiInstallSportsSeasonBatchTriggerAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return installSportsSeasonBatchTrigger();

}

function apiRemoveSportsSeasonBatchTriggerAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return removeSportsSeasonBatchTriggers();

}

/* =====================================================
   SEASON JOB ADMIN
===================================================== */

function apiCreateSportsSeasonJobsAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  const startDate =
    normalizeSportsDateOnly_(
      params.startDate
    );

  const endDate =
    normalizeSportsDateOnly_(
      params.endDate
    );

  const batchDays =
    sportsAdminNumber_(
      params.batchDays,
      2
    );

  if (
    !startDate ||
    !endDate
  ) {
    throw new Error(
      "startDate and endDate are required"
    );
  }

  return createSportsSeasonJobsForDateRange_(
    startDate,
    endDate,
    batchDays
  );

}

function apiRunSportsSeasonBatchAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  return runSportsSeasonBatchUpdate();

}

function apiUpdateSportsSeasonJobStatus_(params) {

  assertSportsAdmin_(
    params
  );

  const jobId =
    sportsAdminString_(
      params.jobId
    );

  const league =
    sportsAdminKey_(
      params.league
    );

  const status =
    sportsAdminString_(
      params.status
    )
      .toUpperCase();

  const allowed = [
    "ACTIVE",
    "PAUSED",
    "COMPLETE",
    "ERROR"
  ];

  if (allowed.indexOf(status) === -1) {
    throw new Error(
      "Invalid status. Use ACTIVE, PAUSED, COMPLETE, or ERROR"
    );
  }

  if (
    !jobId &&
    !league
  ) {
    throw new Error(
      "jobId or league is required"
    );
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SEASON_JOBS_SHEET
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SEASON_JOBS_SHEET
    );
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      success: true,
      updated: 0
    };
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  let updated = 0;

  for (let i = 1; i < data.length; i++) {

    const rowJobId =
      sportsAdminString_(
        data[i][col.JobId]
      );

    const rowLeague =
      sportsAdminKey_(
        data[i][col.League]
      );

    if (
      jobId &&
      rowJobId !== jobId
    ) {
      continue;
    }

    if (
      league &&
      rowLeague !== league
    ) {
      continue;
    }

    updateSportsSeasonJobRow_(
      sh,
      headers,
      i + 1,
      {
        Status: status,
        LastRun: new Date()
      }
    );

    updated++;

  }

  return {
    success: true,
    updated: updated,
    status: status,
    jobId: jobId,
    league: league
  };

}

/* =====================================================
   ODDS SETTINGS + USAGE SETUP
===================================================== */

function setupSportsOddsAdminSettingsSheet_() {

  return sportsAdminEnsureSheet_(
    SPORTS_ODDS_SETTINGS_SHEET,
    SPORTS_ODDS_SETTINGS_HEADERS
  );

}

function setupSportsOddsUsageSheet_() {

  const sh =
    sportsAdminEnsureSheet_(
      SPORTS_ODDS_USAGE_SHEET,
      SPORTS_ODDS_USAGE_HEADERS
    );

  ensureSportsOddsUsageMonth_();

  return sh;

}

function ensureSportsOddsUsageMonth_() {

  const sh =
    sportsAdminEnsureSheet_(
      SPORTS_ODDS_USAGE_SHEET,
      SPORTS_ODDS_USAGE_HEADERS
    );

  const month =
    sportsAdminMonthKey_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  for (let i = 1; i < data.length; i++) {

    if (
      sportsAdminString_(
        data[i][col.Month]
      ) === month
    ) {
      return {
        rowNumber: i + 1,
        month: month,
        totalCallsUsed:
          sportsAdminNumber_(
            data[i][col.TotalCallsUsed],
            0
          ),
        warnAt:
          sportsAdminNumber_(
            data[i][col.WarnAt],
            400
          ),
        hardCap:
          sportsAdminNumber_(
            data[i][col.HardCap],
            500
          )
      };
    }

  }

  const row = {};

  SPORTS_ODDS_USAGE_HEADERS.forEach(function(header) {
    row[header] = "";
  });

  row.Month = month;
  row.TotalCallsUsed = 0;
  row.WarnAt = 400;
  row.HardCap = 500;
  row.UpdatedAt = new Date();
  row.Notes = "Auto-created";

  sh
    .getRange(
      sh.getLastRow() + 1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers.map(function(header) {
        return row[header] !== undefined
          ? row[header]
          : "";
      })
    ]);

  return {
    rowNumber: sh.getLastRow(),
    month: month,
    totalCallsUsed: 0,
    warnAt: 400,
    hardCap: 500
  };

}

function seedSportsOddsAdminSettingsFromSportsSettings_() {

  const sh =
    setupSportsOddsAdminSettingsSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  const existing = {};

  for (let i = 1; i < data.length; i++) {

    const league =
      sportsAdminKey_(
        data[i][col.League]
      );

    if (league) {
      existing[league] = true;
    }

  }

  const sportsSettings =
    readAllSportsSettingsRows_();

  const newRows = [];

  sportsSettings.forEach(function(setting) {

    const sport =
      sportsAdminString_(
        setting.Sport
      )
        .toLowerCase();

    const league =
      sportsAdminString_(
        setting.League
      )
        .toUpperCase();

    if (!league) {
      return;
    }

    if (sport === "racing") {
      return;
    }

    if (existing[sportsAdminKey_(league)]) {
      return;
    }

    const sportKey =
      typeof sportsOddsLeagueToSportKey_ === "function"
        ? sportsOddsLeagueToSportKey_(
            league
          )
        : "";

    if (!sportKey) {
      return;
    }

    if (
      String(sportKey || "")
        .indexOf("motorsport_") === 0
    ) {
      return;
    }

    const rowObj = {
      League: league,
      SportKey: sportKey,
      OddsEnabled: true,
      AutoRefreshEnabled: false,
      ManualRefreshEnabled: true,
      MaxRefreshesPerDay: 1,
      MonthlyBudget: 30,
      StopAtMonthlyCalls: 450,
      DefaultMarkets:
        typeof sportsOddsGetMarketsForLeague_ === "function"
          ? sportsOddsGetMarketsForLeague_(league)
          : "h2h",
      DefaultRegions:
        typeof sportsOddsGetRegionsForLeague_ === "function"
          ? sportsOddsGetRegionsForLeague_(league)
          : "us",
      EstimatedCostPerRefresh:
        typeof sportsOddsEstimateRequestCost_ === "function"
          ? sportsOddsEstimateRequestCost_(
              typeof sportsOddsGetMarketsForLeague_ === "function"
                ? sportsOddsGetMarketsForLeague_(league)
                : "h2h",
              typeof sportsOddsGetRegionsForLeague_ === "function"
                ? sportsOddsGetRegionsForLeague_(league)
                : "us"
            )
          : 1,
      CallsToday: 0,
      CallsThisMonth: 0,
      LastRefreshDate: "",
      LastRefreshAt: "",
      LastRefreshStatus: "NEVER",
      LastRefreshMessage: "",
      UpdatedAt: new Date(),
      Notes: "Seeded from SportsSettings"
    };

    newRows.push(
      headers.map(function(header) {
        return rowObj[header] !== undefined
          ? rowObj[header]
          : "";
      })
    );

  });

  if (newRows.length) {
    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        newRows.length,
        headers.length
      )
      .setValues(
        newRows
      );
  }

  return {
    success: true,
    added: newRows.length
  };

}

/* =====================================================
   ODDS SETTINGS READ / UPDATE
===================================================== */

function readSportsOddsAdminSettings_() {

  setupSportsOddsAdminSettingsSheet_();

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_SETTINGS_SHEET
      );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const today =
    sportsAdminToday_();

  return data
    .slice(1)
    .map(function(row, index) {

      const obj =
        sportsAdminRowObject_(
          headers,
          row
        );

      obj._rowNumber =
        index + 2;

      obj.League =
        sportsAdminString_(
          obj.League
        )
          .toUpperCase();

      obj.SportKey =
        sportsAdminString_(
          obj.SportKey
        );

      obj.OddsEnabled =
        sportsAdminBoolean_(
          obj.OddsEnabled,
          true
        );

      obj.AutoRefreshEnabled =
        sportsAdminBoolean_(
          obj.AutoRefreshEnabled,
          false
        );

      obj.ManualRefreshEnabled =
        sportsAdminBoolean_(
          obj.ManualRefreshEnabled,
          true
        );

      obj.MaxRefreshesPerDay =
        sportsAdminNumber_(
          obj.MaxRefreshesPerDay,
          1
        );

      obj.MonthlyBudget =
        sportsAdminNumber_(
          obj.MonthlyBudget,
          30
        );

      obj.StopAtMonthlyCalls =
        sportsAdminNumber_(
          obj.StopAtMonthlyCalls,
          450
        );

      obj.DefaultMarkets =
        sportsAdminString_(
          obj.DefaultMarkets ||
          (typeof sportsOddsGetMarketsForLeague_ === "function"
            ? sportsOddsGetMarketsForLeague_(obj.League)
            : "h2h")
        );

      obj.DefaultRegions =
        sportsAdminString_(
          obj.DefaultRegions ||
          (typeof sportsOddsGetRegionsForLeague_ === "function"
            ? sportsOddsGetRegionsForLeague_(obj.League)
            : "us")
        );

      obj.EstimatedCostPerRefresh =
        sportsAdminNumber_(
          obj.EstimatedCostPerRefresh,
          typeof sportsOddsEstimateRequestCost_ === "function"
            ? sportsOddsEstimateRequestCost_(
                obj.DefaultMarkets,
                obj.DefaultRegions
              )
            : 1
        );

      obj.LastApiCost =
        sportsAdminNumber_(
          obj.LastApiCost,
          0
        );

      obj.LastApiRemaining =
        sportsAdminNumber_(
          obj.LastApiRemaining,
          0
        );

      obj.CallsToday =
        sportsAdminNumber_(
          obj.CallsToday,
          0
        );

      obj.CallsThisMonth =
        sportsAdminNumber_(
          obj.CallsThisMonth,
          0
        );

      obj.LastRefreshDate =
        normalizeSportsDateOnly_(
          obj.LastRefreshDate
        );

      if (
        obj.LastRefreshDate &&
        obj.LastRefreshDate !== today
      ) {
        obj.CallsToday = 0;
      }

      return obj;

    })
    .filter(function(row) {
      return !!row.League;
    });

}

function apiGetSportsOddsAdminSettings_(params) {

  assertSportsAdmin_(
    params
  );

  seedSportsOddsAdminSettingsFromSportsSettings_();

  return {
    success: true,
    settings:
      readSportsOddsAdminSettings_(),
    usage:
      ensureSportsOddsUsageMonth_()
  };

}

function apiUpdateSportsOddsAdminSetting_(params) {

  assertSportsAdmin_(
    params
  );

  const league =
    sportsAdminString_(
      params.league
    )
      .toUpperCase();

  if (!league) {
    throw new Error(
      "league is required"
    );
  }

  setupSportsOddsAdminSettingsSheet_();

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_SETTINGS_SHEET
      );

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  let rowNumber = 0;

  for (let i = 1; i < data.length; i++) {
    if (
      sportsAdminString_(
        data[i][col.League]
      )
        .toUpperCase() === league
    ) {
      rowNumber = i + 1;
      break;
    }
  }

  if (!rowNumber) {

    const sportKey =
      typeof sportsOddsLeagueToSportKey_ === "function"
        ? sportsOddsLeagueToSportKey_(
            league
          )
        : "";

    if (!sportKey) {
      throw new Error(
        "Unsupported odds league: " +
        league
      );
    }

    const rowObj = {
      League: league,
      SportKey: sportKey,
      OddsEnabled: true,
      AutoRefreshEnabled: false,
      ManualRefreshEnabled: true,
      MaxRefreshesPerDay: 1,
      MonthlyBudget: 30,
      StopAtMonthlyCalls: 450,
      DefaultMarkets:
        typeof sportsOddsGetMarketsForLeague_ === "function"
          ? sportsOddsGetMarketsForLeague_(league)
          : "h2h",
      DefaultRegions:
        typeof sportsOddsGetRegionsForLeague_ === "function"
          ? sportsOddsGetRegionsForLeague_(league)
          : "us",
      EstimatedCostPerRefresh:
        typeof sportsOddsEstimateRequestCost_ === "function"
          ? sportsOddsEstimateRequestCost_(
              typeof sportsOddsGetMarketsForLeague_ === "function"
                ? sportsOddsGetMarketsForLeague_(league)
                : "h2h",
              typeof sportsOddsGetRegionsForLeague_ === "function"
                ? sportsOddsGetRegionsForLeague_(league)
                : "us"
            )
          : 1,
      CallsToday: 0,
      CallsThisMonth: 0,
      LastRefreshDate: "",
      LastRefreshAt: "",
      LastRefreshStatus: "NEVER",
      LastRefreshMessage: "",
      UpdatedAt: new Date(),
      Notes: ""
    };

    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        1,
        headers.length
      )
      .setValues([
        headers.map(function(header) {
          return rowObj[header] !== undefined
            ? rowObj[header]
            : "";
        })
      ]);

    rowNumber =
      sh.getLastRow();

  }

  const patch = {};

  if (params.oddsEnabled !== undefined) {
    patch.OddsEnabled =
      sportsAdminBoolean_(
        params.oddsEnabled,
        true
      );
  }

  if (params.autoRefreshEnabled !== undefined) {
    patch.AutoRefreshEnabled =
      sportsAdminBoolean_(
        params.autoRefreshEnabled,
        false
      );
  }

  if (params.manualRefreshEnabled !== undefined) {
    patch.ManualRefreshEnabled =
      sportsAdminBoolean_(
        params.manualRefreshEnabled,
        true
      );
  }

  if (params.maxRefreshesPerDay !== undefined) {
    patch.MaxRefreshesPerDay =
      sportsAdminNumber_(
        params.maxRefreshesPerDay,
        1
      );
  }

  if (params.monthlyBudget !== undefined) {
    patch.MonthlyBudget =
      sportsAdminNumber_(
        params.monthlyBudget,
        30
      );
  }

  if (params.stopAtMonthlyCalls !== undefined) {
    patch.StopAtMonthlyCalls =
      sportsAdminNumber_(
        params.stopAtMonthlyCalls,
        450
      );
  }

  if (params.notes !== undefined) {
    patch.Notes =
      sportsAdminString_(
        params.notes
      );
  }

  patch.UpdatedAt =
    new Date();

  Object.keys(patch).forEach(function(key) {

    if (col[key] === undefined) {
      return;
    }

    sh
      .getRange(
        rowNumber,
        col[key] + 1
      )
      .setValue(
        patch[key]
      );

  });

  return {
    success: true,
    league: league,
    row: rowNumber,
    updated: patch
  };

}

/* =====================================================
   ODDS USAGE
===================================================== */

function sportsOddsGetMonthlyUsageRow_() {

  return ensureSportsOddsUsageMonth_();

}

function sportsOddsIncrementUsage_(
  league,
  amount
) {

  amount =
    sportsAdminNumber_(
      amount,
      1
    );

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_USAGE_SHEET
      );

  const usage =
    sportsOddsGetMonthlyUsageRow_();

  const headers =
    sh
      .getRange(
        1,
        1,
        1,
        sh.getLastColumn()
      )
      .getValues()[0]
      .map(function(header) {
        return sportsAdminString_(header);
      });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  const newTotal =
    usage.totalCallsUsed + amount;

  sh
    .getRange(
      usage.rowNumber,
      col.TotalCallsUsed + 1
    )
    .setValue(
      newTotal
    );

  sh
    .getRange(
      usage.rowNumber,
      col.UpdatedAt + 1
    )
    .setValue(
      new Date()
    );

  incrementSportsOddsLeagueUsage_(
    league,
    amount
  );

  return {
    month: usage.month,
    totalCallsUsed: newTotal,
    warnAt: usage.warnAt,
    hardCap: usage.hardCap
  };

}

function incrementSportsOddsLeagueUsage_(
  league,
  amount
) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_SETTINGS_SHEET
      );

  if (!sh) {
    return;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  const target =
    sportsAdminString_(
      league
    )
      .toUpperCase();

  const today =
    sportsAdminToday_();

  for (let i = 1; i < data.length; i++) {

    const rowLeague =
      sportsAdminString_(
        data[i][col.League]
      )
        .toUpperCase();

    if (rowLeague !== target) {
      continue;
    }

    const lastDate =
      normalizeSportsDateOnly_(
        data[i][col.LastRefreshDate]
      );

    const callsToday =
      lastDate === today
        ? sportsAdminNumber_(
            data[i][col.CallsToday],
            0
          )
        : 0;

    sh
      .getRange(
        i + 1,
        col.CallsToday + 1
      )
      .setValue(
        callsToday + amount
      );

    sh
      .getRange(
        i + 1,
        col.CallsThisMonth + 1
      )
      .setValue(
        sportsAdminNumber_(
          data[i][col.CallsThisMonth],
          0
        ) + amount
      );

    sh
      .getRange(
        i + 1,
        col.LastRefreshDate + 1
      )
      .setValue(
        today
      );

    sh
      .getRange(
        i + 1,
        col.UpdatedAt + 1
      )
      .setValue(
        new Date()
      );

    return;
  }

}

/* =====================================================
   ODDS REFRESH GUARDS
===================================================== */

function sportsLeagueHasUpcomingOrLiveGame_(
  league,
  daysForward
) {

  league =
    sportsAdminString_(
      league
    )
      .toLowerCase();

  daysForward =
    sportsAdminNumber_(
      daysForward,
      2
    );

  if (
    !league ||
    typeof readSportsScoresRows_ !== "function"
  ) {
    return true;
  }

  const today =
    sportsAdminToday_();

  const end =
    addSportsDays_(
      today,
      daysForward
    );

  const rows =
    readSportsScoresRows_();

  for (let i = 0; i < rows.length; i++) {

    const row =
      rows[i];

    const rowLeague =
      sportsAdminString_(
        row.League
      )
        .toLowerCase();

    if (rowLeague !== league) {
      continue;
    }

    if (
      normalizeSportsBoolean_(
        row.Completed
      )
    ) {
      continue;
    }

    const gameDate =
      normalizeSportsDateOnly_(
        row.GameDateTime
      );

    if (
      gameDate &&
      gameDate >= today &&
      gameDate <= end
    ) {
      return true;
    }

  }

  return false;

}

function getSportsOddsSettingForLeague_(
  league
) {

  league =
    sportsAdminString_(
      league
    )
      .toUpperCase();

  const rows =
    readSportsOddsAdminSettings_();

  return rows.find(function(row) {
    return row.League === league;
  }) || null;

}

function updateSportsOddsRefreshStatus_(
  league,
  status,
  message
) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_SETTINGS_SHEET
      );

  if (!sh) {
    return;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  const target =
    sportsAdminString_(
      league
    )
      .toUpperCase();

  for (let i = 1; i < data.length; i++) {

    const rowLeague =
      sportsAdminString_(
        data[i][col.League]
      )
        .toUpperCase();

    if (rowLeague !== target) {
      continue;
    }

    sh
      .getRange(
        i + 1,
        col.LastRefreshAt + 1
      )
      .setValue(
        new Date()
      );

    sh
      .getRange(
        i + 1,
        col.LastRefreshDate + 1
      )
      .setValue(
        sportsAdminToday_()
      );

    sh
      .getRange(
        i + 1,
        col.LastRefreshStatus + 1
      )
      .setValue(
        status
      );

    sh
      .getRange(
        i + 1,
        col.LastRefreshMessage + 1
      )
      .setValue(
        message || ""
      );

    sh
      .getRange(
        i + 1,
        col.UpdatedAt + 1
      )
      .setValue(
        new Date()
      );

    return;

  }

}

function refreshSportsOddsForLeagueControlled_(
  league,
  reason
) {

  league =
    sportsAdminString_(
      league
    )
      .toUpperCase();

  reason =
    sportsAdminString_(
      reason || "manual"
    )
      .toLowerCase();

  if (!league) {
    throw new Error(
      "league is required"
    );
  }

  setupSportsAdminControlSystem();

  const setting =
    getSportsOddsSettingForLeague_(
      league
    );

  if (!setting) {
    return {
      success: false,
      skipped: true,
      league: league,
      reason:
        "No SportsOddsSettings row found"
    };
  }

  if (!setting.OddsEnabled) {
    return {
      success: true,
      skipped: true,
      league: league,
      reason:
        "Odds disabled for league"
    };
  }

  if (
    reason === "auto" &&
    !setting.AutoRefreshEnabled
  ) {
    return {
      success: true,
      skipped: true,
      league: league,
      reason:
        "Auto refresh disabled for league"
    };
  }

  if (
    reason === "manual" &&
    !setting.ManualRefreshEnabled
  ) {
    return {
      success: true,
      skipped: true,
      league: league,
      reason:
        "Manual refresh disabled for league"
    };
  }

  const usage =
    sportsOddsGetMonthlyUsageRow_();

  const stopAt =
    Math.min(
      setting.StopAtMonthlyCalls,
      usage.hardCap
    );

  if (usage.totalCallsUsed >= stopAt) {
    updateSportsOddsRefreshStatus_(
      league,
      "BLOCKED",
      "Monthly call limit reached: " +
        usage.totalCallsUsed +
        " / " +
        stopAt
    );

    return {
      success: false,
      blocked: true,
      league: league,
      totalCallsUsed:
        usage.totalCallsUsed,
      stopAt: stopAt,
      reason:
        "Monthly call limit reached"
    };
  }

  if (
    setting.CallsThisMonth >=
    setting.MonthlyBudget
  ) {
    updateSportsOddsRefreshStatus_(
      league,
      "BLOCKED",
      "League monthly budget reached"
    );

    return {
      success: false,
      blocked: true,
      league: league,
      reason:
        "League monthly budget reached"
    };
  }

  if (
    setting.CallsToday >=
    setting.MaxRefreshesPerDay
  ) {
    return {
      success: true,
      skipped: true,
      league: league,
      reason:
        "League daily refresh limit reached"
    };
  }

  const sportKey =
    typeof sportsOddsLeagueToSportKey_ === "function"
      ? sportsOddsLeagueToSportKey_(
          league
        )
      : "";

  if (!sportKey) {
    return {
      success: false,
      skipped: true,
      league: league,
      reason:
        "Unsupported odds league"
    };
  }

  /*
    Count before the external fetch because once we call
    The Odds API, the request may count even if the response
    returns an error. Use estimated market x region cost,
    then store the real response header usage after the call.
  */
  const estimatedCost =
    typeof sportsOddsEstimateRequestCost_ === "function"
      ? sportsOddsEstimateRequestCost_(
          setting.DefaultMarkets ||
            (typeof sportsOddsGetMarketsForLeague_ === "function"
              ? sportsOddsGetMarketsForLeague_(league)
              : "h2h"),
          setting.DefaultRegions ||
            (typeof sportsOddsGetRegionsForLeague_ === "function"
              ? sportsOddsGetRegionsForLeague_(league)
              : "us")
        )
      : 1;

  const newUsage =
    sportsOddsIncrementUsage_(
      league,
      estimatedCost
    );

  try {

    const result =
      refreshSportsOddsForLeague(
        league
      );

    if (
      result &&
      result.apiUsage &&
      typeof sportsOddsUpdateLastApiUsage_ === "function"
    ) {
      sportsOddsUpdateLastApiUsage_(
        league,
        result.apiUsage
      );
    }

    updateSportsOddsRefreshStatus_(
      league,
      "OK",
      "Refresh complete. Usable odds rows: " +
        result.usable
    );

    return {
      success: true,
      league: league,
      reason: reason,
      usage: newUsage,
      result: result
    };

  } catch (err) {

    const message =
      err && err.message
        ? err.message
        : String(err);

    updateSportsOddsRefreshStatus_(
      league,
      "ERROR",
      message
    );

    return {
      success: false,
      league: league,
      reason: reason,
      usage: newUsage,
      error: message
    };

  }

}

/* =====================================================
   HYBRID ODDS REFRESH
===================================================== */


function parseSportsOddsLeagueFilter_(value) {

  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(function(item) {
        return String(item || "").trim();
      })
      .filter(function(item) {
        return !!item;
      });
  }

  return String(value || "")
    .split(/[|,]/)
    .map(function(item) {
      return String(item || "").trim();
    })
    .filter(function(item) {
      return !!item;
    });

}

function runSportsOddsHybridRefresh(params) {

  params = params || {};

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return {
      success: false,
      skipped: true,
      message:
        "Hybrid odds refresh already running"
    };
  }

  const summary = {
    success: true,
    startedAt: new Date(),
    refreshed: [],
    skipped: [],
    errors: [],
    usageBefore:
      sportsOddsGetMonthlyUsageRow_()
  };

  try {

    setupSportsAdminControlSystem();

    let settings =
      readSportsOddsAdminSettings_();

    const requestedLeagues =
      parseSportsOddsLeagueFilter_(
        params.leagues ||
        params.league
      );

    if (requestedLeagues.length) {
      const allowed = {};

      requestedLeagues.forEach(function(league) {
        allowed[String(league || "").trim().toLowerCase()] = true;
      });

      settings = settings.filter(function(setting) {
        return allowed[String(setting.League || "").trim().toLowerCase()] === true;
      });

      summary.requestedLeagues = requestedLeagues;
    }

    settings.forEach(function(setting) {

      if (!setting.OddsEnabled) {
        summary.skipped.push({
          league: setting.League,
          reason: "Odds disabled"
        });
        return;
      }

      if (!setting.AutoRefreshEnabled) {
        summary.skipped.push({
          league: setting.League,
          reason: "Auto refresh disabled"
        });
        return;
      }

      const hasGame =
        sportsLeagueHasUpcomingOrLiveGame_(
          setting.League,
          2
        );

      if (!hasGame) {
        summary.skipped.push({
          league: setting.League,
          reason:
            "No upcoming/live game in next 2 days"
        });
        return;
      }

      const result =
        refreshSportsOddsForLeagueControlled_(
          setting.League,
          "auto"
        );

      if (result.success && !result.skipped) {
        summary.refreshed.push(
          result
        );
      } else if (result.skipped || result.blocked) {
        summary.skipped.push(
          result
        );
      } else {
        summary.errors.push(
          result
        );
      }

    });

    summary.finishedAt =
      new Date();

    summary.usageAfter =
      sportsOddsGetMonthlyUsageRow_();

    return summary;

  } finally {

    lock.releaseLock();

  }

}

function apiRunSportsOddsHybridRefresh_(params) {

  assertSportsAdmin_(
    params
  );

  return runSportsOddsHybridRefresh(
    params || {}
  );

}

function apiRefreshSportsOddsLeagueAdmin_(params) {

  assertSportsAdmin_(
    params
  );

  const league =
    params.league ||
    params.leagues;

  return refreshSportsOddsForLeagueControlled_(
    league,
    "manual"
  );

}

function installSportsOddsHybridDailyTrigger(
  hour
) {

  removeSportsOddsHybridTriggers();

  /*
    Important:
    Remove old every-30-minute odds trigger if it exists.
    This protects the 500/month Odds API limit.
  */
  if (
    typeof removeSportsOddsRefreshTriggers === "function"
  ) {
    removeSportsOddsRefreshTriggers();
  }

  hour =
    sportsAdminNumber_(
      hour,
      8
    );

  if (hour < 0 || hour > 23) {
    hour = 8;
  }

  ScriptApp
    .newTrigger(
      SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  return {
    success: true,
    functionName:
      SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION,
    message:
      "Hybrid odds refresh trigger installed once daily around hour " +
      hour
  };

}


/* Removed older duplicate function apiInstallSportsOddsHybridTrigger_ during v11 cleanup. */

function removeSportsOddsHybridTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION
    ) {
      ScriptApp.deleteTrigger(
        trigger
      );
      removed++;
    }

  });

  return {
    success: true,
    removed: removed
  };

}

function apiRemoveSportsOddsHybridTrigger_(params) {

  assertSportsAdmin_(
    params
  );

  return removeSportsOddsHybridTriggers();

}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

function apiGetSportsAdminDashboard_(params) {

  assertSportsAdmin_(
    params
  );

  setupSportsAdminControlSystem();

  return {
    success: true,
    checkedAt: new Date(),
    sportsSettings:
      apiGetSportsSettingsAdmin_(
        params
      ).leagues,
    odds:
      apiGetSportsOddsAdminSettings_(
        params
      ),
    engineStatus:
      typeof checkSportsEngineStatus === "function"
        ? checkSportsEngineStatus()
        : null,
    scoreTriggers:
      typeof checkSportsScoresTriggers === "function"
        ? checkSportsScoresTriggers()
        : [],
    scoreWindowTriggers:
      typeof checkSportsScoresWindowTriggers === "function"
        ? checkSportsScoresWindowTriggers()
        : [],
    seasonBatchTriggers:
      typeof checkSportsSeasonBatchTriggers === "function"
        ? checkSportsSeasonBatchTriggers()
        : []
  };

}

/* =====================================================
   PATCH v3 - ODDS ADMIN USAGE DETAILS
===================================================== */

function sportsOddsUpdateLastApiUsage_(
  league,
  apiUsage
) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_SETTINGS_SHEET
      );

  if (!sh) {
    return;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const col =
    sportsAdminHeaderMap_(
      headers
    );

  const target =
    sportsAdminString_(league)
      .toUpperCase();

  for (let i = 1; i < data.length; i++) {

    const rowLeague =
      sportsAdminString_(
        data[i][col.League]
      )
        .toUpperCase();

    if (rowLeague !== target) {
      continue;
    }

    if (col.LastApiCost !== undefined) {
      sh
        .getRange(
          i + 1,
          col.LastApiCost + 1
        )
        .setValue(
          apiUsage.costLast || ""
        );
    }

    if (col.LastApiRemaining !== undefined) {
      sh
        .getRange(
          i + 1,
          col.LastApiRemaining + 1
        )
        .setValue(
          apiUsage.requestsRemaining || ""
        );
    }

    if (col.UpdatedAt !== undefined) {
      sh
        .getRange(
          i + 1,
          col.UpdatedAt + 1
        )
        .setValue(
          new Date()
        );
    }

    return;

  }

}

function apiInstallSportsOddsHybridTrigger_(params) {

  assertSportsAdmin_(
    params
  );

  return installSportsOddsHybridDailyTrigger(
    params.hour
  );

}