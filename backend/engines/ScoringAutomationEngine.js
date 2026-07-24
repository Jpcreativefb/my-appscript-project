/* =====================================================
   SCORING AUTOMATION ENGINE
   Refreshes scoring + records live leaderboard snapshots
===================================================== */

const SCORING_AUTOMATION_RUNS_SHEET =
  "ScoringRuns";

const SCORING_AUTOMATION_SNAPSHOT_SHEET =
  "LiveLeaderboardSnapshot";

const SCORING_AUTOMATION_RUNS_HEADERS = [
  "Timestamp",
  "GameId",
  "Source",
  "Status",
  "TotalCategories",
  "ResolvedCount",
  "UnresolvedCount",
  "PlayerCount",
  "LeaderUser",
  "LeaderDisplayName",
  "LeaderScore",
  "Message"
];

const SCORING_AUTOMATION_SNAPSHOT_HEADERS = [
  "Timestamp",
  "GameId",
  "Rank",
  "Username",
  "DisplayName",
  "Total",
  "Remaining",
  "Max",
  "Statues",
  "Eliminated",
  "WinChance",
  "Source"
];

/* =====================================================
   NORMALIZERS
===================================================== */

function normalizeScoringAutomationValue_(value) {

  return String(value || "")
    .trim();

}

function normalizeScoringAutomationId_(value) {

  return normalizeScoringAutomationValue_(value)
    .toLowerCase();

}

/* =====================================================
   SETUP
===================================================== */

function setupScoringAutomationSystem() {

  ensureScoringAutomationRunsSheet_();
  ensureScoringAutomationSnapshotSheet_();

  return {
    success: true,
    message: "Scoring automation system ready",
    sheets: [
      SCORING_AUTOMATION_RUNS_SHEET,
      SCORING_AUTOMATION_SNAPSHOT_SHEET
    ]
  };

}

function apiAdminSetupScoringAutomationSystem(payload) {

  requireAdmin_(payload);

  return setupScoringAutomationSystem();

}

function ensureScoringAutomationRunsSheet_() {

  return ensureScoringAutomationSheet_(
    SCORING_AUTOMATION_RUNS_SHEET,
    SCORING_AUTOMATION_RUNS_HEADERS
  );

}

function ensureScoringAutomationSnapshotSheet_() {

  return ensureScoringAutomationSheet_(
    SCORING_AUTOMATION_SNAPSHOT_SHEET,
    SCORING_AUTOMATION_SNAPSHOT_HEADERS
  );

}

function ensureScoringAutomationSheet_(
  sheetName,
  headers
) {

  const ss =
    SpreadsheetApp.getActive();

  let sheet =
    ss.getSheetByName(sheetName);

  if (!sheet) {

    sheet =
      ss.insertSheet(sheetName);

  }

  if (sheet.getLastRow() === 0) {

    sheet.getRange(
      1,
      1,
      1,
      headers.length
    ).setValues([
      headers
    ]);

    sheet.setFrozenRows(1);

    return sheet;

  }

  const existingHeaders =
    sheet.getRange(
      1,
      1,
      1,
      Math.max(sheet.getLastColumn(), 1)
    )
    .getValues()[0]
    .map(header =>
      normalizeScoringAutomationValue_(header)
    );

  if (existingHeaders.join("") === "") {

    sheet.getRange(
      1,
      1,
      1,
      headers.length
    ).setValues([
      headers
    ]);

    sheet.setFrozenRows(1);

    return sheet;

  }

  headers.forEach(header => {

    if (existingHeaders.indexOf(header) === -1) {

      sheet.getRange(
        1,
        sheet.getLastColumn() + 1
      ).setValue(header);

    }

  });

  sheet.setFrozenRows(1);

  return sheet;

}

/* =====================================================
   COLUMN MAPS
===================================================== */

function getScoringRunsColumnMap_(headers) {

  return {
    timestamp:
      headers.indexOf("Timestamp"),

    gameId:
      headers.indexOf("GameId"),

    source:
      headers.indexOf("Source"),

    status:
      headers.indexOf("Status"),

    totalCategories:
      headers.indexOf("TotalCategories"),

    resolvedCount:
      headers.indexOf("ResolvedCount"),

    unresolvedCount:
      headers.indexOf("UnresolvedCount"),

    playerCount:
      headers.indexOf("PlayerCount"),

    leaderUser:
      headers.indexOf("LeaderUser"),

    leaderDisplayName:
      headers.indexOf("LeaderDisplayName"),

    leaderScore:
      headers.indexOf("LeaderScore"),

    message:
      headers.indexOf("Message")
  };

}

function getScoringSnapshotColumnMap_(headers) {

  return {
    timestamp:
      headers.indexOf("Timestamp"),

    gameId:
      headers.indexOf("GameId"),

    rank:
      headers.indexOf("Rank"),

    username:
      headers.indexOf("Username"),

    displayName:
      headers.indexOf("DisplayName"),

    total:
      headers.indexOf("Total"),

    remaining:
      headers.indexOf("Remaining"),

    max:
      headers.indexOf("Max"),

    statues:
      headers.indexOf("Statues"),

    eliminated:
      headers.indexOf("Eliminated"),

    winChance:
      headers.indexOf("WinChance"),

    source:
      headers.indexOf("Source")
  };

}

/* =====================================================
   GAME STATE
===================================================== */

function getScoringAutomationGameState_(gameId) {

  gameId =
    normalizeScoringAutomationValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const categories =
    getCategories(gameId);

  const totalCategories =
    categories.length;

  const settings =
    typeof getCategorySettings === "function"
      ? getCategorySettings(gameId)
      : {};

  const categoryResolutions =
    typeof getCategoryResultsResolutionMap === "function"
      ? getCategoryResultsResolutionMap(gameId)
      : {};

  const resolvedCount =
    categories.filter(function(category) {

      const categoryId =
        normalizeScoringAutomationId_(
          category.id ||
          category.categoryId ||
          ""
        );

      const config =
        settings[categoryId] ||
        category ||
        {};

      if (
        typeof getHybridCategoryResolution_ === "function"
      ) {
        return getHybridCategoryResolution_(
          categoryId,
          config,
          categoryResolutions
        ).resolved === true;
      }

      const mappedResolution =
        categoryResolutions[categoryId];

      if (
        mappedResolution &&
        typeof mappedResolution === "object" &&
        mappedResolution.resolved === true
      ) {
        return true;
      }

      return normalizeScoringAutomationId_(
        config.winnerNomineeId ||
        category.winnerNomineeId ||
        ""
      ) !== "";

    }).length;

  const unresolvedCount =
    totalCategories - resolvedCount;

  return {
    gameId:
      gameId,

    totalCategories:
      totalCategories,

    resolvedCount:
      resolvedCount,

    unresolvedCount:
      unresolvedCount,

    isFinal:
      totalCategories > 0 &&
      unresolvedCount === 0
  };

}

/* =====================================================
   ACTIVE GAME LIST
===================================================== */

function getScoringAutomationGameIds_(requestedGameId) {

  requestedGameId =
    normalizeScoringAutomationValue_(
      requestedGameId
    );

  if (requestedGameId) {

    validateGameId(requestedGameId);

    return [
      requestedGameId
    ];

  }

  if (typeof getActiveGames === "function") {

    return getActiveGames()
      .map(game =>
        game.gameId
      )
      .filter(Boolean);

  }

  return [
    getDefaultGameId()
  ].filter(Boolean);

}

/* =====================================================
   MAIN RUNNER
===================================================== */

function runScoringAutomation(options) {

  options =
    options || {};

  setupScoringAutomationSystem();

  const gameIds =
    getScoringAutomationGameIds_(
      options.gameId
    );

  if (!gameIds.length) {

    return {
      success: true,
      message: "No active games found for scoring automation",
      runs: []
    };

  }

  const runs =
    gameIds.map(gameId =>
      runScoringAutomationForGame_(
        gameId,
        options.source || "trigger",
        options.updatedBy || ""
      )
    );

  return {
    success: true,
    message: "Scoring automation completed",
    runs: runs
  };

}

function apiAdminRunScoringAutomation(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return runScoringAutomation({
    gameId:
      payload.gameId || "",

    source:
      "admin",

    updatedBy:
      payload.username || ""
  });

}

function runScoringAutomationForGame_(
  gameId,
  source,
  updatedBy
) {

  gameId =
    normalizeScoringAutomationValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  try {

    if (
      typeof clearLiveResultsCaches === "function"
    ) {

      clearLiveResultsCaches(gameId);

    } else if (
      typeof adminRefreshResultsCaches === "function"
    ) {

      adminRefreshResultsCaches({
        gameId:
          gameId
      });

    } else if (
      typeof clearAppCaches === "function"
    ) {

      clearAppCaches();

    }

    const leaderboard =
      getLeaderboardData(gameId) || [];

    const gameState =
      getScoringAutomationGameState_(
        gameId
      );

    replaceScoringLeaderboardSnapshot_(
      gameId,
      leaderboard,
      source || "automation"
    );

    const leader =
      leaderboard.length
        ? leaderboard[0]
        : {};

    const run = {
      gameId:
        gameId,

      source:
        source || "automation",

      status:
        "success",

      totalCategories:
        gameState.totalCategories,

      resolvedCount:
        gameState.resolvedCount,

      unresolvedCount:
        gameState.unresolvedCount,

      playerCount:
        leaderboard.length,

      leaderUser:
        leader.user || "",

      leaderDisplayName:
        leader.displayName || "",

      leaderScore:
        Number(leader.total) || 0,

      message:
        "Leaderboard refreshed and snapshot saved"
    };

    appendScoringAutomationRun_(run);

    return {
      success: true,
      ...run
    };

  } catch (err) {

    const run = {
      gameId:
        gameId,

      source:
        source || "automation",

      status:
        "error",

      totalCategories:
        0,

      resolvedCount:
        0,

      unresolvedCount:
        0,

      playerCount:
        0,

      leaderUser:
        "",

      leaderDisplayName:
        "",

      leaderScore:
        0,

      message:
        err && err.message
          ? err.message
          : String(err)
    };

    appendScoringAutomationRun_(run);

    return {
      success: false,
      ...run
    };

  }

}

/* =====================================================
   WRITE RUN LOG
===================================================== */

function appendScoringAutomationRun_(run) {

  const sheet =
    ensureScoringAutomationRunsSheet_();

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(header =>
      normalizeScoringAutomationValue_(header)
    );

  const col =
    getScoringRunsColumnMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  row[col.timestamp] =
    new Date();

  row[col.gameId] =
    run.gameId || "";

  row[col.source] =
    run.source || "";

  row[col.status] =
    run.status || "";

  row[col.totalCategories] =
    run.totalCategories || 0;

  row[col.resolvedCount] =
    run.resolvedCount || 0;

  row[col.unresolvedCount] =
    run.unresolvedCount || 0;

  row[col.playerCount] =
    run.playerCount || 0;

  row[col.leaderUser] =
    run.leaderUser || "";

  row[col.leaderDisplayName] =
    run.leaderDisplayName || "";

  row[col.leaderScore] =
    run.leaderScore || 0;

  row[col.message] =
    run.message || "";

  sheet.appendRow(row);

}

/* =====================================================
   SNAPSHOT
===================================================== */

function replaceScoringLeaderboardSnapshot_(
  gameId,
  leaderboard,
  source
) {

  gameId =
    normalizeScoringAutomationValue_(
      gameId
    );

  const sheet =
    ensureScoringAutomationSnapshotSheet_();

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(header =>
      normalizeScoringAutomationValue_(header)
    );

  const col =
    getScoringSnapshotColumnMap_(
      headers
    );

  const existing =
    sheet.getDataRange()
      .getValues();

  const keptRows =
    existing.length > 1
      ? existing
          .slice(1)
          .filter(row =>
            normalizeScoringAutomationValue_(
              row[col.gameId]
            ) !== gameId
          )
      : [];

  const now =
    new Date();

  const newRows =
    leaderboard.map((row, index) => {

      const out =
        new Array(headers.length)
          .fill("");

      out[col.timestamp] =
        now;

      out[col.gameId] =
        gameId;

      out[col.rank] =
        index + 1;

      out[col.username] =
        row.user || "";

      out[col.displayName] =
        row.displayName || row.user || "";

      out[col.total] =
        Number(row.total) || 0;

      out[col.remaining] =
        Number(row.remaining) || 0;

      out[col.max] =
        Number(row.max) || 0;

      out[col.statues] =
        Number(row.statues) || 0;

      out[col.eliminated] =
        row.eliminated === true;

      out[col.winChance] =
        Number(row.winChance) || 0;

      out[col.source] =
        source || "automation";

      return out;

    });

  const output =
    [
      headers,
      ...keptRows,
      ...newRows
    ];

  sheet.clearContents();

  sheet.getRange(
    1,
    1,
    output.length,
    headers.length
  ).setValues(output);

  sheet.setFrozenRows(1);

}

/* =====================================================
   STATUS
===================================================== */

function getScoringAutomationStatus(gameId) {

  gameId =
    normalizeScoringAutomationValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  setupScoringAutomationSystem();

  const runsSheet =
    ensureScoringAutomationRunsSheet_();

  const runsData =
    runsSheet.getDataRange()
      .getValues();

  const runHeaders =
    runsData[0].map(header =>
      normalizeScoringAutomationValue_(header)
    );

  const runCol =
    getScoringRunsColumnMap_(
      runHeaders
    );

  const matchingRuns =
    runsData
      .slice(1)
      .filter(row =>
        normalizeScoringAutomationValue_(
          row[runCol.gameId]
        ) === gameId
      );

  const latestRun =
    matchingRuns.length
      ? matchingRuns[matchingRuns.length - 1]
      : null;

  const snapshotSheet =
    ensureScoringAutomationSnapshotSheet_();

  const snapshotData =
    snapshotSheet.getDataRange()
      .getValues();

  const snapshotHeaders =
    snapshotData[0].map(header =>
      normalizeScoringAutomationValue_(header)
    );

  const snapshotCol =
    getScoringSnapshotColumnMap_(
      snapshotHeaders
    );

  const snapshot =
    snapshotData
      .slice(1)
      .filter(row =>
        normalizeScoringAutomationValue_(
          row[snapshotCol.gameId]
        ) === gameId
      )
      .map(row => ({
        rank:
          row[snapshotCol.rank],

        username:
          row[snapshotCol.username],

        displayName:
          row[snapshotCol.displayName],

        total:
          row[snapshotCol.total],

        remaining:
          row[snapshotCol.remaining],

        max:
          row[snapshotCol.max],

        statues:
          row[snapshotCol.statues],

        eliminated:
          row[snapshotCol.eliminated],

        winChance:
          row[snapshotCol.winChance],

        source:
          row[snapshotCol.source]
      }));

  return {
    success: true,
    gameId: gameId,
    latestRun: latestRun
      ? {
          timestamp:
            latestRun[runCol.timestamp],

          source:
            latestRun[runCol.source],

          status:
            latestRun[runCol.status],

          resolvedCount:
            latestRun[runCol.resolvedCount],

          unresolvedCount:
            latestRun[runCol.unresolvedCount],

          playerCount:
            latestRun[runCol.playerCount],

          leaderUser:
            latestRun[runCol.leaderUser],

          leaderDisplayName:
            latestRun[runCol.leaderDisplayName],

          leaderScore:
            latestRun[runCol.leaderScore],

          message:
            latestRun[runCol.message]
        }
      : null,
    snapshot: snapshot
  };

}

function apiAdminGetScoringAutomationStatus(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return getScoringAutomationStatus(
    payload.gameId || getDefaultGameId()
  );

}

/* =====================================================
   TIME-BASED TRIGGER
===================================================== */

function installScoringAutomationTrigger() {

  deleteScoringAutomationTriggers_();

  ScriptApp
    .newTrigger("runScoringAutomation")
    .timeBased()
    .everyMinutes(1)
    .create();

  return {
    success: true,
    message: "Scoring automation trigger installed for every 1 minute"
  };

}

function apiAdminInstallScoringAutomationTrigger(payload) {

  requireAdmin_(payload);

  setupScoringAutomationSystem();

  return installScoringAutomationTrigger();

}

function uninstallScoringAutomationTrigger() {

  const deleted =
    deleteScoringAutomationTriggers_();

  return {
    success: true,
    message: "Scoring automation trigger removed",
    deleted: deleted
  };

}

function apiAdminUninstallScoringAutomationTrigger(payload) {

  requireAdmin_(payload);

  return uninstallScoringAutomationTrigger();

}

function deleteScoringAutomationTriggers_() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let deleted = 0;

  triggers.forEach(trigger => {

    if (
      trigger.getHandlerFunction() ===
      "runScoringAutomation"
    ) {

      ScriptApp.deleteTrigger(trigger);
      deleted++;

    }

  });

  return deleted;

}