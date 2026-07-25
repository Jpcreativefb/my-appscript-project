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

function categoryResultsLooksLikeHeaderRow_(row) {

  row = row || [];

  const keys = {};

  row.forEach(function(value) {
    const key = categoryResultsString_(value);
    if (key) {
      keys[key] = true;
    }
  });

  return (
    keys.GameId === true &&
    keys.CategoryId === true &&
    keys.NomineeId === true
  );

}

function categoryResultsNormalizeHeaderRow_(
  sh,
  headers,
  strictCategoryResultsHeader
) {

  const lastColumn =
    Math.max(sh.getLastColumn(), 1);

  let firstRow =
    sh.getLastRow() >= 1
      ? sh
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0]
      : [];

  const firstRowHasContent =
    firstRow.some(function(value) {
      return categoryResultsString_(value) !== "";
    });

  /*
    Only CategoryResults uses the strict header repair that can move a
    broken data row down. Games, Categories, CategorySettings, and Picks
    already have their own valid header shapes and must never be judged by
    the CategoryResults-specific GameId/CategoryId/NomineeId test.
  */
  if (strictCategoryResultsHeader !== true) {

    if (!firstRowHasContent) {
      sh
        .getRange(1, 1, 1, headers.length)
        .setValues([headers]);
    }

    const genericExisting =
      sh
        .getRange(
          1,
          1,
          1,
          Math.max(sh.getLastColumn(), 1)
        )
        .getValues()[0]
        .map(function(header) {
          return categoryResultsString_(header);
        });

    const genericMissing =
      headers.filter(function(header) {
        return genericExisting.indexOf(header) === -1;
      });

    if (genericMissing.length) {
      sh
        .getRange(
          1,
          genericExisting.length + 1,
          1,
          genericMissing.length
        )
        .setValues([genericMissing]);
    }

    return sh;

  }

  if (!categoryResultsLooksLikeHeaderRow_(firstRow)) {

    if (firstRowHasContent) {
      /*
        Protection: if a broken writer placed data on row 1, preserve it by
        pushing it down before writing the real headers.
      */
      sh.insertRowsBefore(1, 1);
    }

    sh
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    firstRow = headers.slice();

  }

  let existing =
    sh
      .getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1))
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

  return sh;

}

function categoryResultsGetOrCreateSheet_(sheetName, headers) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(sheetName);

  if (!sh) {
    sh = ss.insertSheet(sheetName);
  }

  categoryResultsNormalizeHeaderRow_(
    sh,
    headers,
    sheetName === CATEGORY_RESULTS_SHEET
  );

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

function setupUniversalQuestionSystem(payload) {

  payload = payload || {};

  const games =
    categoryResultsEnsureColumns_(
      GAMES_SHEET,
      [
        "MixedGame",
        "ScoringMode",
        "ScoringEngine",
        "RacingLeague",
        "RacingSeriesId",
        "RacingMarket",
        "GameRole",
        "HubMode",
        "ShowMiniGameLinks",
        "IncludeParentQuestions",
        "ParentGameId",
        "IncludeInParent",
        "ParentContributionMode",
        "ParentContributionWeight",
        "ParentBestCount",
        "PlacementPointsJSON",
        "LeaderboardScoreMode",
        "FixedPointsEnabled",
        "StakedPointsEnabled",
        "StartingPoints",
        "MinStake",
        "MaxStake",
        "StakeIncrement",
        "StakeWinMultiplier",
        "StakeLossMultiplier"
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
        "GameId",
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
        "VotingTypes",
        "MinStake",
        "MaxStake",
        "StakeIncrement",
        "StakeWinMultiplier",
        "StakeLossMultiplier",
        "ResultSourceType",
        "ResultProvider",
        "ExternalEventId",
        "ExternalMarketId",
        "ExternalSubjectId",
        "StatKey",
        "ComparisonOperator",
        "Threshold",
        "AutoSettle",
        "RequireAdminReview",
        "SourceUrl",
        "SourceConfigJSON"
      ]
    );

  const picks =
    categoryResultsEnsureColumns_(
      PICKS_SHEET,
      [
        "StakePoints"
      ]
    );

  const categoryResults =
    setupCategoryResultsSystem();

  const normalizedStorage =
    typeof setupNormalizedQuestionStorage === "function"
      ? setupNormalizedQuestionStorage({
          migrateExisting: payload.migrateExisting !== false,
          force: payload.forceNormalizedMigration === true
        })
      : {
          success: false,
          skipped: true,
          message: "Normalized storage engine is unavailable."
        };

  if (
    payload.skipCacheClear !== true &&
    typeof clearAppCaches === "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "Universal question system columns are ready.",
    games: games,
    categories: categories,
    categorySettings: settings,
    picks: picks,
    categoryResults: categoryResults,
    normalizedStorage: normalizedStorage
  };

}

function apiAdminSetupUniversalQuestionSystem(payload) {

  payload = payload || {};

  requireAdmin_(payload);

  return setupUniversalQuestionSystem(payload);

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
    typeof normalizedStorageReadRowsByGame_ === "function"
      ? normalizedStorageReadRowsByGame_(
          CATEGORY_RESULTS_SHEET,
          gameId,
          "CategoryResults",
          { trustIndex: false }
        )
      : sh.getDataRange().getValues();

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

function getCategoryResultsResolutionMap(gameId) {

  const rows =
    getCategoryResultsRows_(gameId);

  const map = {};

  function rowTime_(row, index) {

    const value =
      row.settledAt ||
      row.timestamp ||
      "";

    const time =
      value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();

    return isNaN(time)
      ? index
      : time;

  }

  const latestTimes = {};

  rows.forEach(function(row, index) {

    const categoryId =
      categoryResultsKey_(row.categoryId);

    if (!categoryId) {
      return;
    }

    const status =
      categoryResultsKey_(row.resultStatus);

    const time =
      rowTime_(row, index);

    const latestTime =
      latestTimes[categoryId];

    if (
      latestTime !== undefined &&
      latestTime > time
    ) {
      return;
    }

    latestTimes[categoryId] = time;

    if (
      status === "pending" ||
      status === "open" ||
      status === "cleared" ||
      status === "unsettled"
    ) {
      delete map[categoryId];
      return;
    }

    if (
      status === "push" ||
      status === "pushed" ||
      status === "void" ||
      status === "cancelled" ||
      status === "canceled"
    ) {
      map[categoryId] = {
        resolved: true,
        result: "push",
        winnerNomineeId: "",
        status: status,
        _time: time
      };
      return;
    }

    if (
      row.isWinner === true &&
      row.nomineeId
    ) {
      map[categoryId] = {
        resolved: true,
        result: "winner",
        winnerNomineeId:
          categoryResultsKey_(row.nomineeId),
        status: status || "settled",
        _time: time
      };
    }

  });

  Object.keys(map).forEach(function(categoryId) {
    delete map[categoryId]._time;
  });

  return map;

}

function getCategoryResultsWinnerMap(gameId) {

  const resolutions =
    getCategoryResultsResolutionMap(gameId);

  const map = {};

  Object.keys(resolutions)
    .forEach(function(categoryId) {

      const resolution =
        resolutions[categoryId];

      if (
        resolution &&
        resolution.result === "winner" &&
        resolution.winnerNomineeId
      ) {
        map[categoryId] =
          resolution.winnerNomineeId;
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

  const resultStatus =
    categoryResultsKey_(
      payload.resultStatus || "settled"
    );

  const allowsBlankNominee =
    resultStatus === "push" ||
    resultStatus === "pushed" ||
    resultStatus === "void" ||
    resultStatus === "cancelled" ||
    resultStatus === "canceled" ||
    resultStatus === "pending" ||
    resultStatus === "open" ||
    resultStatus === "cleared" ||
    resultStatus === "unsettled";

  if (
    !gameId ||
    !categoryId ||
    (!nomineeId && !allowsBlankNominee)
  ) {
    throw new Error(
      "Category result requires gameId, categoryId, and a nomineeId unless the result is pending, pushed, void, or cancelled."
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
    /*
      Do not append a fully blank row and then call getLastRow().
      Apps Script can ignore blank appended rows when calculating getLastRow(),
      which caused every new CategoryResults write to reuse/overwrite row 2.
      Insert a physical row after the current data and write values into that
      exact row instead.
    */
    const lastDataRow =
      Math.max(sh.getLastRow(), 1);

    sh.insertRowsAfter(lastDataRow, 1);

    rowIndex =
      lastDataRow + 1;
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
  set_("ResultStatus", resultStatus || "settled");
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
