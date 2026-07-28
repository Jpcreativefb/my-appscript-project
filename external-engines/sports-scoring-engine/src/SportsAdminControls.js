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
  "OddsWindow",
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
  const upgrade = typeof upgradeSportsControlsV12 === "function"
    ? upgradeSportsControlsV12()
    : null;

  setupSportsOddsAdminSettingsSheet_();
  setupSportsOddsUsageSheet_();
  seedSportsOddsAdminSettingsFromSportsSettings_();
  cleanSportsOddsSettingsForUserFriendlyAdmin_();
  if (typeof setupSportsPlayersSystem === "function") setupSportsPlayersSystem();

  return {
    success: true,
    version: "12",
    message: "Sports admin control system v12 setup complete",
    upgrade: upgrade,
    sheets: [SPORTS_ODDS_SETTINGS_SHEET, SPORTS_ODDS_USAGE_SHEET, SPORTS_SCORES_ARCHIVE_SHEET, SPORTS_SNAPSHOTS_ARCHIVE_SHEET, "SportsPlayers", "SportsPlayerGameStats"]
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

/* Removed earlier duplicate function apiGetSportsSettingsAdmin_ during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function apiUpdateSportsLeagueSetting_ during production cleanup; final definition retained later in file. */


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

/* Removed earlier duplicate function apiCreateSportsSeasonJobsAdmin_ during production cleanup; final definition retained later in file. */


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

    const league =
      sportsAdminString_(
        setting.League
      )
        .toUpperCase();

    if (!league) {
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

    const rowObj = {
      League: league,
      SportKey: sportKey,
      OddsEnabled:
        sportsAdminBoolean_(setting.Enabled, false) &&
        sportsAdminBoolean_(setting.OddsEnabled, false),
      AutoRefreshEnabled: false,
      ManualRefreshEnabled: true,
      MaxRefreshesPerDay:
        Math.max(0, sportsAdminNumber_(setting.OddsDailyMaxPulls, 1)),
      MonthlyBudget:
        Math.max(0, sportsAdminNumber_(setting.OddsMonthlyMaxPulls, 30)),
      StopAtMonthlyCalls: 450,
      DefaultMarkets:
        typeof sportsOddsGetMarketsForLeague_ === "function"
          ? sportsOddsGetMarketsForLeague_(league)
          : "h2h",
      DefaultRegions:
        typeof sportsOddsGetRegionsForLeague_ === "function"
          ? sportsOddsGetRegionsForLeague_(league)
          : "us",
      OddsWindow: "STANDARD",
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
   USER-FRIENDLY ODDS CLEANUP / LEAGUE GUARDS
===================================================== */

function sportsAdminGetLeagueControlState_(league) {

  const target =
    sportsAdminKey_(league);

  const rows =
    readAllSportsSettingsRows_();

  const today =
    normalizeSportsDateOnly_(new Date());

  for (let i = 0; i < rows.length; i++) {

    const rowLeague =
      sportsAdminKey_(rows[i].League);

    if (rowLeague !== target) {
      continue;
    }

    const enabled =
      normalizeSportsBoolean_(rows[i].Enabled);

    let phase = {
      active:
        rows[i].SeasonActive === undefined ||
        rows[i].SeasonActive === ""
          ? true
          : normalizeSportsBoolean_(rows[i].SeasonActive),
      phase: "SEASON ACTIVE"
    };

    if (typeof sportsGetSeasonPhase_ === "function") {
      phase = sportsGetSeasonPhase_(
        {
          SeasonStartDate: normalizeSportsDateOnly_(rows[i].SeasonStartDate),
          SeasonEndDate: normalizeSportsDateOnly_(rows[i].SeasonEndDate),
          RegularSeasonStartDate: normalizeSportsDateOnly_(rows[i].RegularSeasonStartDate),
          RegularSeasonEndDate: normalizeSportsDateOnly_(rows[i].RegularSeasonEndDate),
          PreseasonEnabled: normalizeSportsBoolean_(rows[i].PreseasonEnabled),
          PreseasonStartDate: normalizeSportsDateOnly_(rows[i].PreseasonStartDate),
          PreseasonEndDate: normalizeSportsDateOnly_(rows[i].PreseasonEndDate),
          PostseasonEnabled: normalizeSportsBoolean_(rows[i].PostseasonEnabled),
          PostseasonStartDate: normalizeSportsDateOnly_(rows[i].PostseasonStartDate),
          PostseasonEndDate: normalizeSportsDateOnly_(rows[i].PostseasonEndDate),
          TournamentEnabled: normalizeSportsBoolean_(rows[i].TournamentEnabled),
          TournamentStartDate: normalizeSportsDateOnly_(rows[i].TournamentStartDate),
          TournamentEndDate: normalizeSportsDateOnly_(rows[i].TournamentEndDate),
          BowlEnabled: normalizeSportsBoolean_(rows[i].BowlEnabled),
          BowlStartDate: normalizeSportsDateOnly_(rows[i].BowlStartDate),
          BowlEndDate: normalizeSportsDateOnly_(rows[i].BowlEndDate)
        },
        today
      );
    }

    const seasonActive =
      !!(phase && phase.active);

    return {
      found: true,
      league: sportsAdminString_(rows[i].League),
      sport: sportsAdminString_(rows[i].Sport),
      enabled: enabled,
      seasonActive: seasonActive,
      seasonPhase: phase && phase.phase ? phase.phase : "",
      seasonStartDate: normalizeSportsDateOnly_(rows[i].SeasonStartDate),
      seasonEndDate: normalizeSportsDateOnly_(rows[i].SeasonEndDate),
      regularSeasonStartDate: normalizeSportsDateOnly_(rows[i].RegularSeasonStartDate),
      regularSeasonEndDate: normalizeSportsDateOnly_(rows[i].RegularSeasonEndDate),
      canRun: enabled && seasonActive
    };

  }

  return {
    found: false,
    league: sportsAdminString_(league),
    sport: "",
    enabled: false,
    seasonActive: false,
    seasonPhase: "OFF SEASON",
    canRun: false
  };

}

function sportsAdminNormalizeOddsMarkets_(value, league) {

  const allowed = {
    h2h: true,
    spreads: true,
    totals: true,
    outrights: true
  };

  const fallback =
    typeof sportsOddsGetMarketsForLeague_ === "function"
      ? sportsOddsGetMarketsForLeague_(league)
      : "h2h";

  const markets =
    sportsAdminString_(value || fallback)
      .toLowerCase()
      .split(",")
      .map(function(item) {
        return sportsAdminString_(item).toLowerCase();
      })
      .filter(function(item, index, arr) {
        return !!item && allowed[item] && arr.indexOf(item) === index;
      });

  if (!markets.length) {
    return fallback || "h2h";
  }

  if (
    markets.indexOf("outrights") !== -1 &&
    markets.length > 1
  ) {
    return "outrights";
  }

  return markets.join(",");

}

function sportsAdminNormalizeOddsWindow_(value) {

  const raw =
    sportsAdminString_(value || "STANDARD")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  if (raw === "LONG" || raw === "MONTH" || raw === "MONTHLY") {
    return "LONG";
  }

  if (
    raw === "HALF" ||
    raw === "HALF_SEASON" ||
    raw === "HALFSEASON"
  ) {
    return "HALF_SEASON";
  }

  if (
    raw === "FULL" ||
    raw === "FULL_SEASON" ||
    raw === "FULLSEASON" ||
    raw === "SEASON"
  ) {
    return "FULL_SEASON";
  }

  return "STANDARD";

}

function sportsAdminDaysBetweenTodayAnd_(dateValue) {

  const end =
    normalizeSportsDateOnly_(dateValue);

  if (!end) {
    return 0;
  }

  const endDate =
    new Date(end + "T00:00:00");

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  if (isNaN(endDate.getTime()) || endDate < today) {
    return 0;
  }

  return Math.ceil(
    (endDate.getTime() - today.getTime()) / 86400000
  );

}

function sportsAdminOddsWindowDays_(oddsWindow, leagueState) {

  const normalized =
    sportsAdminNormalizeOddsWindow_(oddsWindow);

  if (normalized === "LONG") {
    return 30;
  }

  if (normalized === "HALF_SEASON") {
    const remaining =
      sportsAdminDaysBetweenTodayAnd_(
        leagueState && leagueState.seasonEndDate
      );

    if (remaining > 0) {
      return Math.max(14, Math.ceil(remaining / 2));
    }

    return 60;
  }

  if (normalized === "FULL_SEASON") {
    const remaining =
      sportsAdminDaysBetweenTodayAnd_(
        leagueState && leagueState.seasonEndDate
      );

    if (remaining > 0) {
      return Math.max(14, remaining);
    }

    return 120;
  }

  return 14;

}

function cleanSportsOddsSettingsForUserFriendlyAdmin_() {

  setupSportsOddsAdminSettingsSheet_();

  const oddsSheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_ODDS_SETTINGS_SHEET
      );

  const oddsData =
    oddsSheet.getDataRange()
      .getValues();

  if (oddsData.length <= 1) {
    return {
      success: true,
      updatedOddsRows: 0,
      updatedSportsRows: 0
    };
  }

  const oddsHeaders =
    oddsData[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const oddsCol =
    sportsAdminHeaderMap_(oddsHeaders);

  const sportsSheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SETTINGS
      );

  if (!sportsSheet) {
    return {
      success: true,
      updatedOddsRows: 0,
      updatedSportsRows: 0
    };
  }

  const sportsData =
    sportsSheet.getDataRange()
      .getValues();

  if (sportsData.length <= 1) {
    return {
      success: true,
      updatedOddsRows: 0,
      updatedSportsRows: 0
    };
  }

  const sportsHeaders =
    sportsData[0].map(function(header) {
      return sportsAdminString_(header);
    });

  const sportsCol =
    sportsAdminHeaderMap_(sportsHeaders);

  const sportsByLeague = {};

  for (let i = 1; i < sportsData.length; i++) {
    const key =
      sportsAdminKey_(sportsData[i][sportsCol.League]);

    if (key) {
      sportsByLeague[key] = {
        row: i + 1,
        values: sportsData[i]
      };
    }
  }

  let updatedOddsRows = 0;
  let updatedSportsRows = 0;

  for (let i = 1; i < oddsData.length; i++) {

    const league =
      sportsAdminString_(oddsData[i][oddsCol.League])
        .toUpperCase();

    if (!league) {
      continue;
    }

    const sportsRow =
      sportsByLeague[sportsAdminKey_(league)] || null;

    const leagueEnabled =
      sportsRow
        ? normalizeSportsBoolean_(sportsRow.values[sportsCol.Enabled])
        : true;

    const sportsOddsOn =
      sportsRow && sportsCol.OddsEnabled !== undefined
        ? normalizeSportsBoolean_(sportsRow.values[sportsCol.OddsEnabled])
        : true;

    const currentOddsOn =
      sportsAdminBoolean_(oddsData[i][oddsCol.OddsEnabled], sportsOddsOn);

    const effectiveOddsOn =
      leagueEnabled && currentOddsOn;

    const dailyLimit =
      Math.max(
        0,
        Math.min(
          24,
          sportsAdminNumber_(oddsData[i][oddsCol.MaxRefreshesPerDay], 1)
        )
      );

    const monthlyBudget =
      Math.max(
        0,
        Math.min(
          500,
          sportsAdminNumber_(oddsData[i][oddsCol.MonthlyBudget], 30)
        )
      );

    const patch = {
      OddsEnabled: effectiveOddsOn,
      AutoRefreshEnabled: leagueEnabled
        ? sportsAdminBoolean_(oddsData[i][oddsCol.AutoRefreshEnabled], false)
        : false,
      ManualRefreshEnabled: true,
      MaxRefreshesPerDay: dailyLimit,
      MonthlyBudget: monthlyBudget,
      StopAtMonthlyCalls: Math.max(
        monthlyBudget,
        Math.min(
          500,
          sportsAdminNumber_(oddsData[i][oddsCol.StopAtMonthlyCalls], 450)
        )
      ),
      DefaultMarkets: sportsAdminNormalizeOddsMarkets_(
        oddsData[i][oddsCol.DefaultMarkets],
        league
      ),
      DefaultRegions: "us",
      OddsWindow: sportsAdminNormalizeOddsWindow_(
        oddsCol.OddsWindow !== undefined
          ? oddsData[i][oddsCol.OddsWindow]
          : "STANDARD"
      ),
      EstimatedCostPerRefresh:
        typeof sportsOddsEstimateRequestCost_ === "function"
          ? sportsOddsEstimateRequestCost_(
              sportsAdminNormalizeOddsMarkets_(
                oddsData[i][oddsCol.DefaultMarkets],
                league
              ),
              "us"
            )
          : 1,
      UpdatedAt: new Date()
    };

    Object.keys(patch).forEach(function(key) {
      if (oddsCol[key] === undefined) {
        return;
      }
      oddsSheet
        .getRange(i + 1, oddsCol[key] + 1)
        .setValue(patch[key]);
    });

    updatedOddsRows++;

    if (sportsRow) {
      const sportsPatch = {
        OddsEnabled: effectiveOddsOn,
        OddsCooldownMinutes: 240,
        OddsDailyMaxPulls: dailyLimit,
        OddsMonthlyMaxPulls: monthlyBudget
      };

      Object.keys(sportsPatch).forEach(function(key) {
        if (sportsCol[key] === undefined) {
          return;
        }
        sportsSheet
          .getRange(sportsRow.row, sportsCol[key] + 1)
          .setValue(sportsPatch[key]);
      });

      updatedSportsRows++;
    }

  }

  return {
    success: true,
    updatedOddsRows: updatedOddsRows,
    updatedSportsRows: updatedSportsRows
  };

}

function setupSportsOddsUserFriendlyAdmin() {

  assertSportsAdmin_({
    adminKey:
      PropertiesService
        .getScriptProperties()
        .getProperty(
          SPORTS_ADMIN_API_KEY_PROPERTY
        )
  });

  seedSportsOddsAdminSettingsFromSportsSettings_();

  return cleanSportsOddsSettingsForUserFriendlyAdmin_();

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

      obj.OddsWindow =
        sportsAdminNormalizeOddsWindow_(
          obj.OddsWindow
        );

      obj.OddsWindowDays =
        obj.OddsWindow === "LONG"
          ? 30
          : obj.OddsWindow === "STANDARD"
            ? 14
            : "Season";

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
  assertSportsAdmin_(params);
  seedSportsOddsAdminSettingsFromSportsSettings_();
  cleanSportsOddsSettingsForUserFriendlyAdmin_();

  const counts = sportsOddsApiRequestCountsByLeague_();
  const settings = readSportsOddsAdminSettings_().map(function(row) {
    const stats = counts[row.League] || {
      requestsToday: 0,
      requestsThisMonth: 0,
      requestsAllTime: 0,
      requestCostThisMonth: 0
    };
    row.ApiRequestsToday = stats.requestsToday;
    row.ApiRequestsThisMonth = stats.requestsThisMonth;
    row.ApiRequestsAllTime = stats.requestsAllTime;
    row.ApiRequestCostThisMonth = stats.requestCostThisMonth;
    return row;
  });

  return { success: true, settings: settings, usage: ensureSportsOddsUsageMonth_() };
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
      OddsEnabled: false,
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
      OddsWindow: "STANDARD",
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

  if (params.defaultMarkets !== undefined) {
    patch.DefaultMarkets =
      sportsAdminNormalizeOddsMarkets_(
        params.defaultMarkets,
        league
      );
  }

  if (params.oddsWindow !== undefined) {
    patch.OddsWindow =
      sportsAdminNormalizeOddsWindow_(
        params.oddsWindow
      );
  }

  patch.DefaultRegions =
    "us";

  patch.EstimatedCostPerRefresh =
    typeof sportsOddsEstimateRequestCost_ === "function"
      ? sportsOddsEstimateRequestCost_(
          patch.DefaultMarkets ||
            sportsAdminString_(
              data[rowNumber - 1][col.DefaultMarkets]
            ) ||
            "h2h",
          "us"
        )
      : 1;

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

  const leagueState =
    sportsAdminGetLeagueControlState_(
      league
    );

  if (!leagueState.enabled) {
    updateSportsOddsRefreshStatus_(
      league,
      "PAUSED",
      "League is OFF. Turn the league ON before refreshing odds."
    );

    return {
      success: true,
      skipped: true,
      league: league,
      reason:
        "League is OFF"
    };
  }

  if (!leagueState.seasonActive) {
    const seasonMessage =
      "Season inactive. Update the Season Start/End dates or wait until the season starts.";

    updateSportsOddsRefreshStatus_(
      league,
      "PAUSED",
      seasonMessage
    );

    return {
      success: true,
      skipped: true,
      league: league,
      reason:
        "Season inactive",
      message:
        seasonMessage
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
    const dailyMessage =
      "Odds limit met for the day: " +
      setting.CallsToday +
      " / " +
      setting.MaxRefreshesPerDay +
      ". No Odds API call was used.";

    updateSportsOddsRefreshStatus_(
      league,
      "BLOCKED",
      dailyMessage
    );

    return {
      success: true,
      skipped: true,
      blocked: true,
      league: league,
      callsToday: setting.CallsToday,
      maxRefreshesPerDay: setting.MaxRefreshesPerDay,
      reason:
        "League daily refresh limit reached",
      message:
        dailyMessage
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
      typeof refreshSportsOddsForLeagueWithOptions === "function"
        ? refreshSportsOddsForLeagueWithOptions(
            league,
            {
              markets:
                setting.DefaultMarkets || "h2h",
              regions:
                "us",
              oddsWindow:
                setting.OddsWindow || "STANDARD",
              daysForward:
                sportsAdminOddsWindowDays_(
                  setting.OddsWindow,
                  leagueState
                )
            }
          )
        : refreshSportsOddsForLeague(
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

function runSportsOddsHybridRefresh() {

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

    const settings =
      readSportsOddsAdminSettings_();

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

      const leagueState =
        sportsAdminGetLeagueControlState_(
          setting.League
        );

      const windowDays =
        sportsAdminOddsWindowDays_(
          setting.OddsWindow,
          leagueState
        );

      const hasGame =
        sportsLeagueHasUpcomingOrLiveGame_(
          setting.League,
          windowDays
        );

      if (!hasGame) {
        summary.skipped.push({
          league: setting.League,
          reason:
            "No upcoming/live game in odds window"
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

  return runSportsOddsHybridRefresh();

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

/* Removed earlier duplicate function apiGetSportsAdminDashboard_ during production cleanup; final definition retained later in file. */


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

/* =====================================================
   SPORTS CONTROLS v12 - UNIFIED AUTOMATION / ARCHIVE / USAGE
===================================================== */

function sportsOddsApiRequestCountsByLeague_() {
  const result = {};
  const sh = SpreadsheetApp.getActive().getSheetByName("SportsOddsApiLog");
  if (!sh || sh.getLastRow() <= 1) return result;

  const data = sh.getDataRange().getValues();
  const headers = data[0].map(function(header) { return sportsAdminString_(header); });
  const col = sportsAdminHeaderMap_(headers);
  const today = sportsAdminToday_();
  const month = sportsAdminMonthKey_();

  for (let i = 1; i < data.length; i++) {
    const league = sportsAdminString_(data[i][col.League]).toUpperCase();
    if (!league) continue;
    if (!result[league]) {
      result[league] = { requestsToday: 0, requestsThisMonth: 0, requestsAllTime: 0, requestCostThisMonth: 0 };
    }

    const timestamp = data[i][col.Timestamp];
    const dateOnly = normalizeSportsDateOnly_(timestamp);
    const monthKey = dateOnly ? dateOnly.slice(0, 7) : "";
    const cost = col.CostLast === undefined ? 1 : sportsAdminNumber_(data[i][col.CostLast], 1);

    result[league].requestsAllTime++;
    if (dateOnly === today) result[league].requestsToday++;
    if (monthKey === month) {
      result[league].requestsThisMonth++;
      result[league].requestCostThisMonth += cost;
    }
  }

  return result;
}

function apiSetSmartSportsAutomationAdmin_(params) {
  assertSportsAdmin_(params);
  return setSmartSportsAutomationEnabled_(
    sportsAdminBoolean_(params.enabled, false),
    sportsAdminNumber_(params.oddsHour, 8),
    sportsAdminNumber_(params.archiveHour, 3)
  );
}

function apiGetSportsArchiveStatusAdmin_(params) {
  assertSportsAdmin_(params);
  return getSportsArchiveStatus_();
}

function apiPreviewSportsLeagueArchiveAdmin_(params) {
  assertSportsAdmin_(params);
  return previewSportsLeagueArchive_(
    params.league || ""
  );
}

function apiRunSportsArchiveNowAdmin_(params) {
  assertSportsAdmin_(params);
  return runSportsArchiveUpdate(
    params.league || ""
  );
}


/* =====================================================
   PATCH v13 ADMIN OVERRIDES
   College coverage + ESPN season type fields.
===================================================== */

function sportsAdminV13SettingFields_() {
  return [
    ["regularSeasonStartDate", "RegularSeasonStartDate", normalizeSportsDateOnly_],
    ["regularSeasonEndDate", "RegularSeasonEndDate", normalizeSportsDateOnly_],
    ["seasonYear", "SeasonYear", sportsAdminString_],
    ["scheduleSource", "ScheduleSource", function(v) { return sportsAdminString_(v || "HYBRID").toUpperCase(); }],
    ["scheduleBatchDays", "ScheduleBatchDays", function(v) { return Math.max(1, Math.min(30, sportsAdminNumber_(v, 14))); }],
    ["espnSeasonTypesEnabled", "ESPNSeasonTypesEnabled", function(v) { return sportsAdminBoolean_(v, true); }],
    ["espnPreseasonType", "ESPNPreseasonType", function(v) { return sportsAdminNumber_(v, 1); }],
    ["espnRegularSeasonType", "ESPNRegularSeasonType", function(v) { return sportsAdminNumber_(v, 2); }],
    ["espnPostseasonType", "ESPNPostseasonType", function(v) { return sportsAdminNumber_(v, 3); }],
    ["espnTournamentType", "ESPNTournamentType", function(v) { return sportsAdminNumber_(v, 3); }],
    ["espnBowlType", "ESPNBowlType", function(v) { return sportsAdminNumber_(v, 3); }],
    ["collegeCoverageMode", "CollegeCoverageMode", function(v) { return sportsAdminString_(v || "ALL_D1").toUpperCase(); }],
    ["espnGroupIds", "ESPNGroupIds", sportsAdminString_],
    ["espnResultLimit", "ESPNResultLimit", function(v) { return Math.max(25, sportsAdminNumber_(v, 500)); }],
    ["selectedTeamIds", "SelectedTeamIds", sportsAdminString_]
  ];
}

function apiGetSportsSettingsAdmin_(params) {
  assertSportsAdmin_(params);
  ensureSportsControlsV12SettingsColumns_();

  const today = normalizeSportsDateOnly_(new Date());
  const rows = readAllSportsSettingsRows_().map(function(row) {
    const setting = {
      sport: sportsAdminString_(row.Sport),
      league: sportsAdminString_(row.League),
      enabled: normalizeSportsBoolean_(row.Enabled),
      pollPreGameMinutes: sportsAdminNumber_(row.PollPreGameMinutes, 30),
      pollLiveMinutes: sportsAdminNumber_(row.PollLiveMinutes, 1),
      pollFinalMinutes: sportsAdminNumber_(row.PollFinalMinutes, 60),
      savePeriodSnapshots: normalizeSportsBoolean_(row.SavePeriodSnapshots),
      espnScoreboardUrl: sportsAdminString_(row.ESPNScoreboardUrl),
      seasonTitle: sportsAdminString_(row.SeasonTitle || row.League),
      seasonYear: sportsAdminString_(row.SeasonYear || row.SeasonTitle || ""),
      scheduleSource: sportsAdminString_(row.ScheduleSource || "HYBRID").toUpperCase(),
      scheduleBatchDays: sportsAdminNumber_(row.ScheduleBatchDays, sportsAdminString_(row.League).toLowerCase().indexOf("college") !== -1 ? 7 : 14),
      espnSeasonTypesEnabled: row.ESPNSeasonTypesEnabled === "" || row.ESPNSeasonTypesEnabled === undefined ? true : normalizeSportsBoolean_(row.ESPNSeasonTypesEnabled),
      espnPreseasonType: sportsAdminNumber_(row.ESPNPreseasonType, 1),
      espnRegularSeasonType: sportsAdminNumber_(row.ESPNRegularSeasonType, 2),
      espnPostseasonType: sportsAdminNumber_(row.ESPNPostseasonType, 3),
      espnTournamentType: sportsAdminNumber_(row.ESPNTournamentType, 3),
      espnBowlType: sportsAdminNumber_(row.ESPNBowlType, 3),
      collegeCoverageMode: sportsAdminString_(row.CollegeCoverageMode || "ALL_D1").toUpperCase(),
      espnGroupIds: sportsAdminString_(row.ESPNGroupIds),
      espnResultLimit: sportsAdminNumber_(row.ESPNResultLimit, 500),
      selectedTeamIds: sportsAdminString_(row.SelectedTeamIds),
      seasonStartDate: normalizeSportsDateOnly_(row.SeasonStartDate),
      seasonEndDate: normalizeSportsDateOnly_(row.SeasonEndDate),
      regularSeasonStartDate: normalizeSportsDateOnly_(row.RegularSeasonStartDate),
      regularSeasonEndDate: normalizeSportsDateOnly_(row.RegularSeasonEndDate),
      preseasonEnabled: normalizeSportsBoolean_(row.PreseasonEnabled),
      preseasonStartDate: normalizeSportsDateOnly_(row.PreseasonStartDate),
      preseasonEndDate: normalizeSportsDateOnly_(row.PreseasonEndDate),
      postseasonEnabled: normalizeSportsBoolean_(row.PostseasonEnabled),
      postseasonStartDate: normalizeSportsDateOnly_(row.PostseasonStartDate),
      postseasonEndDate: normalizeSportsDateOnly_(row.PostseasonEndDate),
      tournamentEnabled: normalizeSportsBoolean_(row.TournamentEnabled),
      tournamentStartDate: normalizeSportsDateOnly_(row.TournamentStartDate),
      tournamentEndDate: normalizeSportsDateOnly_(row.TournamentEndDate),
      bowlEnabled: normalizeSportsBoolean_(row.BowlEnabled),
      bowlStartDate: normalizeSportsDateOnly_(row.BowlStartDate),
      bowlEndDate: normalizeSportsDateOnly_(row.BowlEndDate),
      snapshotRetentionDays: sportsAdminNumber_(row.SnapshotRetentionDays, 14),
      archiveEnabled: normalizeSportsBoolean_(row.ArchiveEnabled),
      archiveAfterDays: sportsAdminNumber_(row.ArchiveAfterDays, 30),
      archiveMode: sportsAdminString_(row.ArchiveMode || "MOVE").toUpperCase(),
      archiveLastRunAt: row.ArchiveLastRunAt || "",
      archiveLastStatus: sportsAdminString_(row.ArchiveLastStatus),
      archiveRowsLastRun: sportsAdminNumber_(row.ArchiveRowsLastRun, 0)
    };

    const phase = sportsGetSeasonPhase_({
      SeasonStartDate: setting.seasonStartDate,
      SeasonEndDate: setting.seasonEndDate,
      RegularSeasonStartDate: setting.regularSeasonStartDate,
      RegularSeasonEndDate: setting.regularSeasonEndDate,
      PreseasonEnabled: setting.preseasonEnabled,
      PreseasonStartDate: setting.preseasonStartDate,
      PreseasonEndDate: setting.preseasonEndDate,
      PostseasonEnabled: setting.postseasonEnabled,
      PostseasonStartDate: setting.postseasonStartDate,
      PostseasonEndDate: setting.postseasonEndDate,
      TournamentEnabled: setting.tournamentEnabled,
      TournamentStartDate: setting.tournamentStartDate,
      TournamentEndDate: setting.tournamentEndDate,
      BowlEnabled: setting.bowlEnabled,
      BowlStartDate: setting.bowlStartDate,
      BowlEndDate: setting.bowlEndDate
    }, today);
    setting.seasonActive = phase.active;
    setting.seasonPhase = phase.phase;
    return setting;
  });

  return { success: true, count: rows.length, leagues: rows };
}

function apiUpdateSportsLeagueSetting_(params) {
  assertSportsAdmin_(params);
  ensureSportsControlsV12SettingsColumns_();

  const league = sportsAdminKey_(params.league);
  const sport = sportsAdminKey_(params.sport);
  if (!league) throw new Error("league is required");

  const scheduleSource = sportsAdminString_(params.scheduleSource || "HYBRID").toUpperCase();
  const requireDates = scheduleSource === "MANUAL";

  function validateRange_(label, enabled, startDate, endDate) {
    if (!enabled) return;
    const start = normalizeSportsDateOnly_(startDate);
    const end = normalizeSportsDateOnly_(endDate);
    if (requireDates && (!start || !end)) throw new Error(label + " start and end dates are required when Manual Dates mode is used");
    if (start && end && start > end) throw new Error(label + " start date cannot be after end date");
  }

  const mainStart = normalizeSportsDateOnly_(params.seasonStartDate);
  const mainEnd = normalizeSportsDateOnly_(params.seasonEndDate);
  if (mainStart && mainEnd && mainStart > mainEnd) throw new Error("Season start date cannot be after end date");
  if (requireDates && ((mainStart && !mainEnd) || (!mainStart && mainEnd))) throw new Error("Season start and end dates must both be entered in Manual Dates mode");

  validateRange_("Preseason", sportsAdminBoolean_(params.preseasonEnabled, false), params.preseasonStartDate, params.preseasonEndDate);
  validateRange_("Regular season", true, params.regularSeasonStartDate, params.regularSeasonEndDate);
  validateRange_("Postseason", sportsAdminBoolean_(params.postseasonEnabled, false), params.postseasonStartDate, params.postseasonEndDate);
  validateRange_("Tournament", sportsAdminBoolean_(params.tournamentEnabled, false), params.tournamentStartDate, params.tournamentEndDate);
  validateRange_("Bowl", sportsAdminBoolean_(params.bowlEnabled, false), params.bowlStartDate, params.bowlEndDate);

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (!sh) throw new Error("Missing sheet: " + SPORTS_SHEETS.SETTINGS);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) throw new Error("SportsSettings has no rows");
  const headers = data[0].map(function(header) { return sportsAdminString_(header); });
  const col = sportsAdminHeaderMap_(headers);
  let updated = 0;
  let updatedRow = null;

  for (let i = 1; i < data.length; i++) {
    const rowSport = sportsAdminKey_(data[i][col.Sport]);
    const rowLeague = sportsAdminKey_(data[i][col.League]);
    if (rowLeague !== league || (sport && rowSport !== sport)) continue;

    const patch = {};
    const fields = [
      ["enabled", "Enabled", function(v) { return sportsAdminBoolean_(v, true); }],
      ["pollPreGameMinutes", "PollPreGameMinutes", function(v) { return sportsAdminNumber_(v, 30); }],
      ["pollLiveMinutes", "PollLiveMinutes", function(v) { return sportsAdminNumber_(v, 1); }],
      ["pollFinalMinutes", "PollFinalMinutes", function(v) { return sportsAdminNumber_(v, 60); }],
      ["savePeriodSnapshots", "SavePeriodSnapshots", function(v) { return sportsAdminBoolean_(v, true); }],
      ["espnScoreboardUrl", "ESPNScoreboardUrl", sportsAdminString_],
      ["seasonTitle", "SeasonTitle", sportsAdminString_],
      ["seasonStartDate", "SeasonStartDate", normalizeSportsDateOnly_],
      ["seasonEndDate", "SeasonEndDate", normalizeSportsDateOnly_],
      ["preseasonEnabled", "PreseasonEnabled", function(v) { return sportsAdminBoolean_(v, false); }],
      ["preseasonStartDate", "PreseasonStartDate", normalizeSportsDateOnly_],
      ["preseasonEndDate", "PreseasonEndDate", normalizeSportsDateOnly_],
      ["postseasonEnabled", "PostseasonEnabled", function(v) { return sportsAdminBoolean_(v, false); }],
      ["postseasonStartDate", "PostseasonStartDate", normalizeSportsDateOnly_],
      ["postseasonEndDate", "PostseasonEndDate", normalizeSportsDateOnly_],
      ["tournamentEnabled", "TournamentEnabled", function(v) { return sportsAdminBoolean_(v, false); }],
      ["tournamentStartDate", "TournamentStartDate", normalizeSportsDateOnly_],
      ["tournamentEndDate", "TournamentEndDate", normalizeSportsDateOnly_],
      ["bowlEnabled", "BowlEnabled", function(v) { return sportsAdminBoolean_(v, false); }],
      ["bowlStartDate", "BowlStartDate", normalizeSportsDateOnly_],
      ["bowlEndDate", "BowlEndDate", normalizeSportsDateOnly_],
      ["snapshotRetentionDays", "SnapshotRetentionDays", function(v) { return Math.max(1, sportsAdminNumber_(v, 14)); }],
      ["archiveEnabled", "ArchiveEnabled", function(v) { return sportsAdminBoolean_(v, false); }],
      ["archiveAfterDays", "ArchiveAfterDays", function(v) { return Math.max(1, sportsAdminNumber_(v, 30)); }],
      ["archiveMode", "ArchiveMode", function(v) { return sportsAdminString_(v).toUpperCase() === "COPY" ? "COPY" : "MOVE"; }]
    ].concat(sportsAdminV13SettingFields_());

    fields.forEach(function(field) {
      if (params[field[0]] !== undefined) patch[field[1]] = field[2](params[field[0]]);
    });

    Object.keys(patch).forEach(function(key) {
      if (col[key] !== undefined) sh.getRange(i + 1, col[key] + 1).setValue(patch[key]);
    });

    updated++;
    updatedRow = i + 1;
  }

  if (!updated) throw new Error("No SportsSettings row found for league: " + league);
  logSports_("INFO", "apiUpdateSportsLeagueSetting_", "Updated sports league v13 settings", JSON.stringify({ league: league, sport: sport, row: updatedRow, scheduleSource: scheduleSource }));
  return { success: true, updated: updated, league: league, sport: sport || "", row: updatedRow };
}

function apiCreateSportsSeasonJobsAdmin_(params) {
  assertSportsAdmin_(params);

  const startDate = normalizeSportsDateOnly_(params.startDate);
  const endDate = normalizeSportsDateOnly_(params.endDate);
  const batchDays = sportsAdminNumber_(params.batchDays, 14);

  if (!startDate || !endDate) throw new Error("startDate and endDate are required");

  return createSportsSeasonJobsForDateRange_(startDate, endDate, batchDays, {
    league: params.league || "",
    sport: params.sport || "",
    season: params.season || "",
    seasonName: params.seasonName || params.season || "",
    seasonYear: params.seasonYear || "",
    scheduleSource: params.scheduleSource || "HYBRID"
  });
}


/* =====================================================
   PRODUCTION CLEANUP v14 - SCORE WINDOW TRIGGER ROUTES
===================================================== */

function apiInstallSportsScoresWindowTriggerAdmin_(params) {
  assertSportsAdmin_(params || {});
  return installSportsScoresWindowTrigger();
}

function apiRemoveSportsScoresWindowTriggerAdmin_(params) {
  assertSportsAdmin_(params || {});
  return removeSportsScoresWindowTriggers();
}

function apiGetSportsAdminDashboard_(params) {
  assertSportsAdmin_(params);
  setupSportsAdminControlSystem();
  cleanSportsOddsSettingsForUserFriendlyAdmin_();

  return {
    success: true,
    version: "15-advanced-stats-v1",
    checkedAt: new Date(),
    smartAutomation: getSmartSportsAutomationStatus_(),
    sportsSettings: apiGetSportsSettingsAdmin_(params).leagues,
    odds: apiGetSportsOddsAdminSettings_(params),
    archive: getSportsArchiveStatus_(),
    players: typeof getSportsPlayersStatus_ === "function" ? getSportsPlayersStatus_() : null,
    advancedStats: typeof getSportsAdvancedStatsStatus_ === "function" ? getSportsAdvancedStatsStatus_() : null,
    engineStatus: typeof checkSportsEngineStatus === "function" ? checkSportsEngineStatus() : null,
    scoreTriggers: typeof checkSportsScoresTriggers === "function" ? checkSportsScoresTriggers() : [],
    scoreWindowTriggers: typeof checkSportsScoresWindowTriggers === "function" ? checkSportsScoresWindowTriggers() : [],
    seasonBatchTriggers: typeof checkSportsSeasonBatchTriggers === "function" ? checkSportsSeasonBatchTriggers() : [],
    archiveTriggers: typeof checkSportsArchiveTriggers === "function" ? checkSportsArchiveTriggers() : []
  };
}

function repairSportsScoreDisplayAdmin() {
  return repairSportsScoreDisplayAdmin_();
}
