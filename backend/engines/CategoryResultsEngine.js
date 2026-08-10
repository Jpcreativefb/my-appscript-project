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


function dedupeCategoryResultsForCategory_(gameId, categoryId) {
  setupCategoryResultsSystem();

  gameId = categoryResultsString_(gameId);
  categoryId = categoryResultsKey_(categoryId);

  if (!gameId || !categoryId) {
    return { success: true, removed: 0 };
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORY_RESULTS_SHEET);

  if (!sh || sh.getLastRow() < 2) {
    return { success: true, removed: 0 };
  }

  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, removed: 0 };
  }

  const headers =
    data[0].map(function(header) {
      return categoryResultsString_(header);
    });

  const col =
    categoryResultsHeaderMap_(headers);

  const newestByKey = {};
  const duplicateRows = [];

  function rowTime_(row, rowNumber) {
    const value =
      (col.SettledAt !== undefined ? row[col.SettledAt] : "") ||
      (col.Timestamp !== undefined ? row[col.Timestamp] : "");

    const time =
      value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();

    return isNaN(time)
      ? rowNumber
      : time;
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (
      categoryResultsString_(row[col.GameId]) !== gameId ||
      categoryResultsKey_(row[col.CategoryId]) !== categoryId
    ) {
      continue;
    }

    const nomineeId =
      categoryResultsKey_(row[col.NomineeId]);

    const candidate = {
      rowNumber: i + 1,
      time: rowTime_(row, i + 1)
    };

    const current =
      newestByKey[nomineeId];

    if (!current) {
      newestByKey[nomineeId] = candidate;
      continue;
    }

    if (
      candidate.time > current.time ||
      (
        candidate.time === current.time &&
        candidate.rowNumber > current.rowNumber
      )
    ) {
      duplicateRows.push(current.rowNumber);
      newestByKey[nomineeId] = candidate;
    } else {
      duplicateRows.push(candidate.rowNumber);
    }
  }

  duplicateRows
    .sort(function(a, b) {
      return b - a;
    })
    .forEach(function(rowNumber) {
      sh.deleteRow(rowNumber);
    });

  if (
    duplicateRows.length &&
    typeof clearAppCaches === "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    removed: duplicateRows.length
  };
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
  const grouped = {};

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

  rows.forEach(function(row, index) {

    const categoryId =
      categoryResultsKey_(row.categoryId);

    if (!categoryId) {
      return;
    }

    const time =
      rowTime_(row, index);

    if (!grouped[categoryId] || time > grouped[categoryId].time) {
      grouped[categoryId] = {
        time: time,
        rows: [row]
      };
      return;
    }

    if (time === grouped[categoryId].time) {
      grouped[categoryId].rows.push(row);
    }

  });

  Object.keys(grouped).forEach(function(categoryId) {

    const batch = grouped[categoryId];
    const batchRows = batch.rows || [];
    const statuses = batchRows.map(function(row) {
      return categoryResultsKey_(row.resultStatus);
    });

    if (statuses.some(function(status) {
      return (
        status === "pending" ||
        status === "open" ||
        status === "cleared" ||
        status === "unsettled"
      );
    })) {
      return;
    }

    const pushStatus = statuses.find(function(status) {
      return (
        status === "push" ||
        status === "pushed" ||
        status === "void" ||
        status === "cancelled" ||
        status === "canceled"
      );
    });

    if (pushStatus) {
      map[categoryId] = {
        resolved: true,
        result: "push",
        winnerNomineeId: "",
        winnerNomineeIds: [],
        status: pushStatus
      };
      return;
    }

    const winnerNomineeIds = [];
    batchRows.forEach(function(row) {
      const nomineeId = categoryResultsKey_(row.nomineeId);
      if (
        row.isWinner === true &&
        nomineeId &&
        winnerNomineeIds.indexOf(nomineeId) === -1
      ) {
        winnerNomineeIds.push(nomineeId);
      }
    });

    if (winnerNomineeIds.length) {
      map[categoryId] = {
        resolved: true,
        result: "winner",
        winnerNomineeId: winnerNomineeIds[0],
        winnerNomineeIds: winnerNomineeIds,
        status: statuses.find(Boolean) || "settled"
      };
    }

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

function upsertCategoryResultsBulk_(payloads) {

  const items = Array.isArray(payloads)
    ? payloads.filter(Boolean)
    : [];

  if (!items.length) {
    return { success: true, updated: 0, appended: 0, total: 0 };
  }

  setupCategoryResultsSystem();

  const sh = SpreadsheetApp.getActive().getSheetByName(CATEGORY_RESULTS_SHEET);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(function(header) {
    return categoryResultsString_(header);
  });
  const col = categoryResultsHeaderMap_(headers);
  const width = headers.length;
  const existingByKey = {};

  for (let i = 1; i < data.length; i++) {
    const key = [
      categoryResultsString_(data[i][col.GameId]),
      categoryResultsKey_(data[i][col.CategoryId]),
      categoryResultsKey_(data[i][col.NomineeId])
    ].join("||");
    existingByKey[key] = i + 1;
  }

  const updates = {};
  const appends = [];
  const appendIndexByKey = {};
  const now = new Date();

  function setRowValue_(row, header, value) {
    if (col[header] === undefined) return;
    row[col[header]] = value;
  }

  items.forEach(function(payload) {
    payload = payload || {};
    const gameId = categoryResultsString_(payload.gameId);
    const categoryId = categoryResultsKey_(payload.categoryId);
    const nomineeId = categoryResultsKey_(payload.nomineeId);
    const resultStatus = categoryResultsKey_(payload.resultStatus || "settled");
    const allowsBlankNominee = [
      "push", "pushed", "void", "cancelled", "canceled",
      "pending", "open", "cleared", "unsettled"
    ].indexOf(resultStatus) !== -1;

    if (!gameId || !categoryId || (!nomineeId && !allowsBlankNominee)) {
      throw new Error(
        "Category result requires gameId, categoryId, and a nomineeId unless the result is pending, pushed, void, or cancelled."
      );
    }

    const key = [gameId, categoryId, nomineeId].join("||");
    const rowNumber = existingByKey[key];
    const appendIndex = appendIndexByKey[key];
    const row = rowNumber && rowNumber > 0
      ? data[rowNumber - 1].slice()
      : (appendIndex !== undefined ? appends[appendIndex].slice() : new Array(width).fill(""));

    setRowValue_(row, "Timestamp", payload.timestamp || now);
    setRowValue_(row, "GameId", gameId);
    setRowValue_(row, "CategoryId", categoryId);
    setRowValue_(row, "NomineeId", nomineeId);
    setRowValue_(row, "ResultStatus", resultStatus || "settled");
    setRowValue_(row, "IsWinner", payload.isWinner === true);
    setRowValue_(row, "FinalRank", payload.finalRank || "");
    setRowValue_(row, "FinalPosition", payload.finalPosition || "");
    setRowValue_(row, "ResultValue", payload.resultValue || "");
    setRowValue_(row, "ResultSource", payload.resultSource || "manual");
    setRowValue_(row, "SettledAt", payload.settledAt || now);
    setRowValue_(row, "Notes", payload.notes || "");

    if (rowNumber && rowNumber > 0) {
      updates[rowNumber] = row;
    } else if (appendIndex !== undefined) {
      appends[appendIndex] = row;
    } else {
      appendIndexByKey[key] = appends.length;
      appends.push(row);
      existingByKey[key] = -1;
    }
  });

  const updateRows = Object.keys(updates)
    .map(Number)
    .sort(function(a, b) { return a - b; });

  updateRows.forEach(function(rowNumber) {
    sh.getRange(rowNumber, 1, 1, width).setValues([updates[rowNumber]]);
  });

  if (appends.length) {
    const startRow = Math.max(sh.getLastRow(), 1) + 1;
    const requiredLastRow = startRow + appends.length - 1;
    if (typeof sh.getMaxRows === "function" && requiredLastRow > sh.getMaxRows()) {
      sh.insertRowsAfter(sh.getMaxRows(), requiredLastRow - sh.getMaxRows());
    }
    sh.getRange(startRow, 1, appends.length, width).setValues(appends);
  }

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return {
    success: true,
    updated: updateRows.length,
    appended: appends.length,
    total: items.length
  };
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
