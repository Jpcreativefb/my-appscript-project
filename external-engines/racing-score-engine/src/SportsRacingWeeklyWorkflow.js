/************************************************************
 SPORTS RACING WEEKLY WORKFLOW
 Simple weekly functions so you do not have to remember
 every setup/sync/import step.
************************************************************/

function onOpen() {
  SpreadsheetApp
    .getUi()
    .createMenu("Racing")
    .addItem(
      "1. Prep Latest Cup Grid Paste",
      "racingWorkflowPrepLatestCupGridPaste"
    )
    .addItem(
      "2. Import Pasted Grid + Prep Results Paste",
      "racingWorkflowImportGridAndPrepResults"
    )
    .addItem(
      "3. Import Pasted Results Stats",
      "racingWorkflowImportResultsStats"
    )
    .addSeparator()
    .addItem(
      "Refresh Cup Baseline Only",
      "racingWorkflowRefreshCupBaseline"
    )
    .addItem(
      "Debug Racing Driver DB",
      "debugSportsRacingDriverDatabaseStatusV14"
    )
    .addToUi();
}

/**
 * Step 1 weekly function.
 *
 * This:
 * - Runs setup
 * - Refreshes ESPN Cup baseline
 * - Builds source links
 * - Syncs DriverDB
 * - Finds latest Cup race
 * - Prepares SportsRacingRawPaste for GRID paste
 */
function racingWorkflowPrepLatestCupGridPaste() {

  return racingWorkflowPrepLatestGridPaste_(
    "nascar-premier"
  );

}

function racingWorkflowPrepLatestXfinityGridPaste() {

  return racingWorkflowPrepLatestGridPaste_(
    "nascar-secondary"
  );

}

function racingWorkflowPrepLatestTruckGridPaste() {

  return racingWorkflowPrepLatestGridPaste_(
    "nascar-truck"
  );

}

function racingWorkflowPrepLatestGridPaste_(league) {

  league =
    String(league || "nascar-premier")
      .trim()
      .toLowerCase();

  if (typeof setupRacingScoreEngine === "function") {
    setupRacingScoreEngine();
  }

  const refreshResult =
    apiRefreshSportsRacingLeague_({
      league: league
    });

  const linksResult =
    buildESPNRacingSourceLinksFromResults();

  const driverSyncResult =
    syncSportsRacingDriverDatabaseAllSources();

  const latest =
    racingWorkflowFindLatestSourceLink_(
      league
    );

  if (!latest) {
    throw new Error(
      "No source link found for league: " +
      league +
      ". Check SportsRacingResults and SportsRacingSourceLinks."
    );
  }

  const prepResult =
    prepareSportsRacingGridPasteForRaceV13(
      latest.League,
      latest.ESPNEventId
    );

  return {
    success: true,
    step: "prep_grid",
    league: latest.League,
    gameId: latest.GameId,
    espnEventId: latest.ESPNEventId,
    raceName: latest.RaceName,
    raceDateTime: latest.RaceDateTime,
    gridUrl: latest.GridUrl,
    resultsUrl: latest.ResultsUrl,
    refreshResult: refreshResult,
    linksResult: linksResult,
    driverSyncResult: driverSyncResult,
    prepResult: prepResult,
    next:
      "Open gridUrl, copy the grid table, paste it into SportsRacingRawPaste at A5, then run racingWorkflowImportGridAndPrepResults."
  };

}

/**
 * Step 2 weekly function.
 *
 * Run this AFTER pasting the starting grid table at A5.
 *
 * This:
 * - Imports the grid into SportsRacingRaceEntries
 * - Then prepares the same sheet for results-stats paste
 */
function racingWorkflowImportGridAndPrepResults() {

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  const dataBefore =
    sh.getDataRange()
      .getValues();

  const metaBefore =
    sportsRacingRawPasteReadMetaV9_(
      dataBefore
    );

  const gridImportResult =
    importSportsRacingGridOrStatsPasteV13();

  if (!gridImportResult.success) {
    return {
      success: false,
      step: "import_grid",
      gridImportResult: gridImportResult,
      message:
        "Grid import failed. Check that the ESPN grid table was pasted starting at A5."
    };
  }

  const prepResultsResult =
    prepareSportsRacingResultsStatsPasteForRaceV13(
      metaBefore.League,
      metaBefore.ESPNEventId
    );

  const latest =
    racingWorkflowFindSourceLinkByEvent_(
      metaBefore.League,
      metaBefore.ESPNEventId
    );

  return {
    success: true,
    step: "grid_imported_results_prepared",
    league: metaBefore.League,
    gameId: metaBefore.GameId,
    espnEventId: metaBefore.ESPNEventId,
    raceName: metaBefore.RaceName,
    gridImportResult: gridImportResult,
    prepResultsResult: prepResultsResult,
    resultsUrl:
      latest ? latest.ResultsUrl : "",
    next:
      "After the race, open resultsUrl, copy the results stats table, paste it into SportsRacingRawPaste at A5, then run racingWorkflowImportResultsStats."
  };

}

/**
 * Step 3 weekly function.
 *
 * Run this AFTER pasting the race results stats table at A5.
 *
 * This:
 * - Imports stats into SportsRacingSupplemental
 * - Stores START as race-entry data when present
 * - Returns final merged racing results preview
 */
function racingWorkflowImportResultsStats() {

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  const dataBefore =
    sh.getDataRange()
      .getValues();

  const metaBefore =
    sportsRacingRawPasteReadMetaV9_(
      dataBefore
    );

  const statsImportResult =
    importSportsRacingGridOrStatsPasteV13();

  if (!statsImportResult.success) {
    return {
      success: false,
      step: "import_results_stats",
      statsImportResult: statsImportResult,
      message:
        "Results stats import failed. Check that the results table was pasted starting at A5."
    };
  }

  const finalResults =
    apiGetSportsRacingResults_({
      league: metaBefore.League,
      espnEventId: metaBefore.ESPNEventId,
      includeSupplemental: "true",
      includeDriverDatabase: "true"
    });

  return {
    success: true,
    step: "results_stats_imported",
    league: metaBefore.League,
    gameId: metaBefore.GameId,
    espnEventId: metaBefore.ESPNEventId,
    raceName: metaBefore.RaceName,
    statsImportResult: statsImportResult,
    finalCount:
      finalResults && finalResults.results
        ? finalResults.results.length
        : 0,
    firstMergedRows:
      finalResults && finalResults.results
        ? finalResults.results.slice(0, 5)
        : [],
    message:
      "Race workflow complete. Final merged results include ESPN baseline, pasted stats, race entries, and DriverDB defaults."
  };

}

/**
 * Optional helper.
 * Refreshes only ESPN Cup baseline, links, and DriverDB.
 */
function racingWorkflowRefreshCupBaseline() {

  const refreshResult =
    apiRefreshSportsRacingLeague_({
      league: "nascar-premier"
    });

  const linksResult =
    buildESPNRacingSourceLinksFromResults();

  const driverSyncResult =
    syncSportsRacingDriverDatabaseAllSources();

  return {
    success: true,
    refreshResult: refreshResult,
    linksResult: linksResult,
    driverSyncResult: driverSyncResult
  };

}

/************************************************************
 LOOKUP HELPERS
************************************************************/

function racingWorkflowFindLatestSourceLink_(league) {

  league =
    String(league || "")
      .trim()
      .toLowerCase();

  const links =
    typeof readSportsRacingSourceLinkRows_ === "function"
      ? readSportsRacingSourceLinkRows_()
      : [];

  const matches =
    links.filter(function(link) {
      return (
        String(link.League || "")
          .trim()
          .toLowerCase() === league &&
        String(link.ESPNEventId || "")
          .trim() !== ""
      );
    });

  if (!matches.length) {
    return null;
  }

  matches.sort(function(a, b) {

    const ad =
      new Date(a.RaceDateTime || 0)
        .getTime();

    const bd =
      new Date(b.RaceDateTime || 0)
        .getTime();

    if (bd !== ad) {
      return bd - ad;
    }

    return String(b.ESPNEventId || "")
      .localeCompare(
        String(a.ESPNEventId || "")
      );

  });

  return matches[0];

}

function racingWorkflowFindSourceLinkByEvent_(
  league,
  espnEventId
) {

  league =
    String(league || "")
      .trim()
      .toLowerCase();

  espnEventId =
    String(espnEventId || "")
      .trim();

  const links =
    typeof readSportsRacingSourceLinkRows_ === "function"
      ? readSportsRacingSourceLinkRows_()
      : [];

  return links.find(function(link) {
    return (
      String(link.League || "")
        .trim()
        .toLowerCase() === league &&
      String(link.ESPNEventId || "")
        .trim() === espnEventId
    );
  }) || null;

}