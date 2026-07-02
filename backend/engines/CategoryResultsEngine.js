/* =====================================================
   CATEGORY RESULTS / UNIVERSAL QUESTION FOUNDATION
   Production-safe additive layer.

   Purpose:
   - Keeps existing Categories + CategorySettings intact.
   - Adds a flexible result table for sports, racing, survivor,
     prop, ranking, and mixed-question games.
   - Existing simple games can still use CategorySettings.WinnerNomineeId.
===================================================== */

const CATEGORY_RESULTS_SHEET =
  "CategoryResults";

const CATEGORY_RESULTS_HEADERS = [
  "Timestamp",
  "GameId",
  "CategoryId",
  "NomineeId",
  "ResultStatus",
  "IsWinner",
  "FinalRank",
  "FinalPosition",
  "ResultValue",
  "ResultSource",
  "SettledAt",
  "Notes"
];

function categoryResultsString_(value) {

  return String(value || "")
    .trim();

}

function categoryResultsKey_(value) {

  return categoryResultsString_(value)
    .toLowerCase();

}

function categoryResultsBool_(value) {

  return (
    value === true ||
    categoryResultsString_(value)
      .toLowerCase() === "true" ||
    categoryResultsString_(value) === "1" ||
    categoryResultsString_(value)
      .toLowerCase() === "yes"
  );

}

function categoryResultsGetOrCreateSheet_(sheetName, headers) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(sheetName);

  if (!sh) {
    sh = ss.insertSheet(sheetName);
  }

  if (sh.getLastRow() < 1) {
    sh
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);
  }

  return sh;

}

function categoryResultsHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {
    const key = categoryResultsString_(header);
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;

}

function categoryResultsEnsureColumns_(sheetName, headers) {

  const sh =
    categoryResultsGetOrCreateSheet_(
      sheetName,
      headers
    );

  const lastColumn =
    Math.max(sh.getLastColumn(), 1);

  const existing =
    sh
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(function(header) {
        return categoryResultsString_(header);
      });

  const missing =
    headers.filter(function(header) {
      return existing.indexOf(header) === -1;
    });

  if (missing.length) {
    sh
      .getRange(1, existing.length + 1, 1, missing.length)
      .setValues([missing]);
  }

  return {
    success: true,
    sheet: sheetName,
    added: missing.length,
    columns: missing
  };

}

function setupCategoryResultsSystem() {

  return categoryResultsEnsureColumns_(
    CATEGORY_RESULTS_SHEET,
    CATEGORY_RESULTS_HEADERS
  );

}

function setupUniversalQuestionSystem() {

  const games =
    categoryResultsEnsureColumns_(
      GAMES_SHEET,
      [
        "MixedGame",
        "ScoringMode",
        "ScoringEngine",
        "RacingLeague",
        "RacingSeriesId",
        "RacingMarket"
      ]
    );

  const categories =
    categoryResultsEnsureColumns_(
      CATEGORIES_SHEET,
      [
        "QuestionType",
        "ScoringEngine",
        "SelectionMode",
        "EntryType",
        "OddsMode",
        "ResultSource",
        "RoundNumber",
        "SportsProvider",
        "SportsMarket",
        "SportsSelection",
        "SportsLine",
        "BettingOdds",
        "OddsSource",
        "OddsLastUpdated",
        "LogoUrl",
        "RacingDriverId",
        "RacingCarNumber",
        "RacingTeam",
        "RacingManufacturer",
        "RacingStartingPosition",
        "RacingCurrentPosition",
        "RacingFinalPosition",
        "RacingWinner"
      ]
    );

  const settings =
    categoryResultsEnsureColumns_(
      CATEGORY_SETTINGS_SHEET,
      [
        "QuestionType",
        "ScoringEngine",
        "SelectionMode",
        "ScoreMode",
        "OddsMode",
        "ResultSource",
        "SettlementStatus",
        "MaxSelections",
        "MinSelections",
        "AllowDraw",
        "AllowPush",
        "SportsGameId",
        "ESPNEventId",
        "SportsMarket",
        "SportsLeague",
        "WagerResultType",
        "OddsReady",
        "OddsSource",
        "OddsLastUpdated",
        "VotingTypes"
      ]
    );

  const categoryResults =
    setupCategoryResultsSystem();

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return {
    success: true,
    message: "Universal question system columns are ready.",
    games: games,
    categories: categories,
    categorySettings: settings,
    categoryResults: categoryResults
  };

}

function apiAdminSetupUniversalQuestionSystem(payload) {

  payload = payload || {};

  requireAdmin_(payload);

  return setupUniversalQuestionSystem();

}

function getCategoryResultsRows_(gameId) {

  setupCategoryResultsSystem();

  gameId =
    categoryResultsString_(
      gameId || getDefaultGameId()
    );

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORY_RESULTS_SHEET);

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return categoryResultsString_(header);
    });

  const col =
    categoryResultsHeaderMap_(headers);

  const rows = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      categoryResultsString_(row[col.GameId]);

    if (rowGameId !== gameId) {
      continue;
    }

    rows.push({
      timestamp:
        row[col.Timestamp] || "",
      gameId:
        rowGameId,
      categoryId:
        categoryResultsKey_(row[col.CategoryId]),
      nomineeId:
        categoryResultsKey_(row[col.NomineeId]),
      resultStatus:
        categoryResultsString_(row[col.ResultStatus]),
      isWinner:
        categoryResultsBool_(row[col.IsWinner]),
      finalRank:
        col.FinalRank !== undefined
          ? row[col.FinalRank]
          : "",
      finalPosition:
        col.FinalPosition !== undefined
          ? row[col.FinalPosition]
          : "",
      resultValue:
        col.ResultValue !== undefined
          ? row[col.ResultValue]
          : "",
      resultSource:
        col.ResultSource !== undefined
          ? categoryResultsString_(row[col.ResultSource])
          : "",
      settledAt:
        col.SettledAt !== undefined
          ? row[col.SettledAt]
          : "",
      notes:
        col.Notes !== undefined
          ? categoryResultsString_(row[col.Notes])
          : ""
    });

  }

  return rows;

}

function getCategoryResultsWinnerMap(gameId) {

  const rows =
    getCategoryResultsRows_(gameId);

  const map = {};

  rows.forEach(function(row) {

    const status =
      categoryResultsKey_(row.resultStatus);

    if (
      row.isWinner === true &&
      row.categoryId &&
      row.nomineeId &&
      status !== "void" &&
      status !== "push"
    ) {
      map[row.categoryId] = row.nomineeId;
    }

  });

  return map;

}

function upsertCategoryResult_(payload) {

  payload = payload || {};

  setupCategoryResultsSystem();

  const gameId =
    categoryResultsString_(payload.gameId);

  const categoryId =
    categoryResultsKey_(payload.categoryId);

  const nomineeId =
    categoryResultsKey_(payload.nomineeId);

  if (!gameId || !categoryId || !nomineeId) {
    throw new Error(
      "Category result requires gameId, categoryId, and nomineeId."
    );
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORY_RESULTS_SHEET);

  const data =
    sh.getDataRange().getValues();

  const headers =
    data[0].map(function(header) {
      return categoryResultsString_(header);
    });

  const col =
    categoryResultsHeaderMap_(headers);

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {

    if (
      categoryResultsString_(data[i][col.GameId]) === gameId &&
      categoryResultsKey_(data[i][col.CategoryId]) === categoryId &&
      categoryResultsKey_(data[i][col.NomineeId]) === nomineeId
    ) {
      rowIndex = i + 1;
      break;
    }

  }

  if (rowIndex === -1) {
    const row = new Array(headers.length).fill("");
    sh.appendRow(row);
    rowIndex = sh.getLastRow();
  }

  function set_(header, value) {
    if (col[header] === undefined) {
      return;
    }
    sh
      .getRange(rowIndex, col[header] + 1)
      .setValue(value);
  }

  const now = new Date();

  set_("Timestamp", payload.timestamp || now);
  set_("GameId", gameId);
  set_("CategoryId", categoryId);
  set_("NomineeId", nomineeId);
  set_("ResultStatus", payload.resultStatus || "settled");
  set_("IsWinner", payload.isWinner === true);
  set_("FinalRank", payload.finalRank || "");
  set_("FinalPosition", payload.finalPosition || "");
  set_("ResultValue", payload.resultValue || "");
  set_("ResultSource", payload.resultSource || "manual");
  set_("SettledAt", payload.settledAt || now);
  set_("Notes", payload.notes || "");

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return {
    success: true,
    gameId: gameId,
    categoryId: categoryId,
    nomineeId: nomineeId
  };

}
