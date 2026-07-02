/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/

/************************************************************
 RACING SCORE ENGINE - API ROUTER
 Deploy this project as a web app if you want external calls.
************************************************************/

function racingApiGetAdminKey_() {

  const props =
    PropertiesService.getScriptProperties();

  return String(
    props.getProperty("RACING_SCORE_ENGINE_API_KEY") ||
    props.getProperty("RACING_SCORE_ENGINE_ADMIN_KEY") ||
    ""
  ).trim();

}

function racingApiRequireAdmin_(params) {

  params = params || {};

  const expected =
    racingApiGetAdminKey_();

  const provided =
    String(
      params.apiKey ||
      params.adminKey ||
      ""
    ).trim();

  if (!expected) {
    throw new Error(
      "Racing API admin key is not configured. Set RACING_SCORE_ENGINE_API_KEY in Script Properties."
    );
  }

  if (provided !== expected) {
    throw new Error(
      "Unauthorized racing admin request"
    );
  }

}

function doGet(e) {

  const params =
    e && e.parameter
      ? e.parameter
      : {};

  const action =
    String(params.action || "ping")
      .trim();

  try {

    let payload;

    if (action === "ping") {
      payload = {
        success: true,
        app: "Racing Score Engine",
        timestamp: new Date()
      };
    }

    else if (action === "setupRacing") {
      racingApiRequireAdmin_(params);
      payload = setupRacingScoreEngine();
    }

    else if (action === "refreshRacingLeague") {
      racingApiRequireAdmin_(params);
      payload = apiRefreshSportsRacingLeague_(params);
    }

    else if (action === "getSportsRacingResults") {
      payload = apiGetSportsRacingResults_(params);
    }

    else if (action === "getSportsRacingSupplemental") {
      payload = apiGetSportsRacingSupplemental_(params);
    }

    else {
      payload = {
        success: false,
        error: "Unknown action: " + action
      };
    }

    return sportsApiOutput_(
      payload,
      params.callback
    );

  } catch (err) {

    return sportsApiOutput_(
      {
        success: false,
        error:
          err && err.message
            ? err.message
            : String(err)
      },
      params.callback
    );

  }

}

function setupRacingScoreEngine() {

  const results =
    setupSportsRacingSystem();

  const supplemental =
    typeof setupSportsRacingSupplementalSystem === "function"
      ? setupSportsRacingSupplementalSystem()
      : null;

  const drivers =
    typeof setupSportsRacingDriverDatabaseSystem === "function"
      ? setupSportsRacingDriverDatabaseSystem()
      : null;

  const paste =
    typeof setupSportsRacingOption1RawPasteSystem === "function"
      ? setupSportsRacingOption1RawPasteSystem()
      : null;

  return {
    success: true,
    app: "Racing Score Engine",
    results: results,
    supplemental: supplemental,
    drivers: drivers,
    paste: paste,
    message:
      "Racing Score Engine setup complete. Use prepareSportsRacingGridPasteForRaceV13 and prepareSportsRacingResultsStatsPasteForRaceV13 for copy/paste workflow."
  };

}

function testRefreshRacingCup() {
  return apiRefreshSportsRacingLeague_({
    league: "nascar-premier"
  });
}

function testRefreshRacingXfinity() {
  return apiRefreshSportsRacingLeague_({
    league: "nascar-secondary"
  });
}

function testRefreshRacingTruck() {
  return apiRefreshSportsRacingLeague_({
    league: "nascar-truck"
  });
}

function testRefreshRacingCupByDate() {
  return apiRefreshSportsRacingLeague_({
    league: "nascar-premier",
    date: "20260621"
  });
}