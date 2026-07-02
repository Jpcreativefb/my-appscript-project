/* =====================================================
   RACING WAGER ENGINE
   Production-safe bridge from the separate Racing Score Engine
   into Awards App Categories / CategorySettings / CategoryResults.

   Core model:
   - One race/category can have many driver nominee rows.
   - Settlement uses the driver with Winner=TRUE or FinalPosition=1.
   - BettingEngine remains shared for bankroll/payouts.
===================================================== */

const RACING_WAGER_DEFAULT_MARKET =
  "race-winner";

const RACING_WAGER_SCORE_VERSION =
  "racing-wager-v1";

function racingWagerString_(value) {

  return String(value || "")
    .trim();

}

function racingWagerKey_(value) {

  return racingWagerString_(value)
    .toLowerCase();

}

function racingWagerSlug_(value) {

  return racingWagerString_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function racingWagerBool_(value) {

  return (
    value === true ||
    racingWagerString_(value)
      .toLowerCase() === "true" ||
    racingWagerString_(value) === "1" ||
    racingWagerString_(value)
      .toLowerCase() === "yes"
  );

}

function racingWagerNumber_(value, fallback) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const num = Number(value);

  return isNaN(num)
    ? fallback
    : num;

}

function racingWagerHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {
    const key = racingWagerString_(header);
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;

}

function racingWagerGetSheet_(sheetName) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh) {
    throw new Error(sheetName + " sheet missing");
  }

  return sh;

}

function racingWagerEnsureColumns_(sheetName, headers) {

  const sh =
    racingWagerGetSheet_(sheetName);

  const lastColumn =
    Math.max(sh.getLastColumn(), 1);

  const existing =
    sh
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(function(header) {
        return racingWagerString_(header);
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

function racingWagerSetIfExists_(row, col, header, value) {

  if (col[header] !== undefined) {
    row[col[header]] = value;
  }

}

function racingWagerGetProp_(name, fallback) {

  const props =
    PropertiesService.getScriptProperties();

  return racingWagerString_(
    props.getProperty(name) || fallback || ""
  );

}

function setupRacingWagerSystem() {

  if (typeof setupUniversalQuestionSystem === "function") {
    setupUniversalQuestionSystem();
  }

  const categories =
    racingWagerEnsureColumns_(
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
        "SportsGameId",
        "ESPNEventId",
        "SportsLeague",
        "SportsMarket",
        "SportsSelection",
        "SportsLine",
        "SportsStatus",
        "SportsState",
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
    racingWagerEnsureColumns_(
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

  const results =
    typeof setupCategoryResultsSystem === "function"
      ? setupCategoryResultsSystem()
      : null;

  return {
    success: true,
    message: "Racing wager system columns are ready.",
    categories: categories,
    categorySettings: settings,
    categoryResults: results
  };

}

function racingWagerBuildUrl_(baseUrl, params) {

  const pairs = [];

  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }
    pairs.push(
      encodeURIComponent(key) +
      "=" +
      encodeURIComponent(value)
    );
  });

  return baseUrl +
    (baseUrl.indexOf("?") === -1 ? "?" : "&") +
    pairs.join("&");

}

function fetchRacingResultsForWager_(payload) {

  payload = payload || {};

  const apiUrl =
    racingWagerGetProp_(
      "RACING_SCORE_ENGINE_API_URL",
      ""
    );

  if (!apiUrl) {
    throw new Error(
      "Missing script property RACING_SCORE_ENGINE_API_URL."
    );
  }

  const apiKey =
    racingWagerGetProp_(
      "RACING_SCORE_ENGINE_API_KEY",
      racingWagerGetProp_(
        "RACING_SCORE_ENGINE_ADMIN_KEY",
        ""
      )
    );

  const url =
    racingWagerBuildUrl_(
      apiUrl,
      {
        action: "getSportsRacingResults",
        league: payload.league || payload.racingLeague,
        gameId: payload.racingGameId || payload.sportsGameId,
        espnEventId: payload.espnEventId,
        includeSupplemental: "true",
        includeDriverDatabase: "true",
        apiKey: apiKey,
        adminKey: apiKey
      }
    );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const text =
    response.getContentText() || "";

  if (status < 200 || status >= 300) {
    throw new Error(
      "Racing Score Engine returned HTTP " +
      status +
      ": " +
      text.slice(0, 300)
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(
      "Racing Score Engine returned invalid JSON: " +
      text.slice(0, 300)
    );
  }

  if (data.success === false) {
    throw new Error(
      data.error ||
      "Racing Score Engine returned success=false."
    );
  }

  const rows =
    data.results ||
    data.rows ||
    [];

  return rows;

}

function racingWagerNormalizeDriverRow_(row) {

  row = row || {};

  const driverName =
    racingWagerString_(
      row.DriverName ||
      row.driverName ||
      row.Name ||
      row.name
    );

  const driverId =
    racingWagerString_(
      row.DriverId ||
      row.driverId ||
      row.AthleteId ||
      row.athleteId ||
      row.Id ||
      row.id
    );

  const nomineeId =
    driverId
      ? racingWagerKey_("driver-" + driverId)
      : racingWagerSlug_(driverName);

  const logo =
    racingWagerString_(
      row.HeadshotUrl ||
      row.DriverImageUrl ||
      row.ImageUrl ||
      row.LogoUrl ||
      row.logoUrl ||
      row.Logo ||
      ""
    );

  return {
    raw: row,
    nomineeId: nomineeId,
    driverId: driverId,
    name: driverName,
    team:
      racingWagerString_(row.Team || row.team),
    carNumber:
      racingWagerString_(row.CarNumber || row.carNumber),
    manufacturer:
      racingWagerString_(row.Manufacturer || row.manufacturer),
    startingPosition:
      row.StartingPosition || row.startingPosition || "",
    currentPosition:
      row.CurrentPosition || row.currentPosition || "",
    finalPosition:
      row.FinalPosition || row.finalPosition || "",
    winner:
      racingWagerBool_(row.Winner || row.winner),
    status:
      racingWagerString_(row.Status || row.status),
    state:
      racingWagerString_(row.State || row.state),
    completed:
      racingWagerBool_(row.Completed || row.completed),
    raceName:
      racingWagerString_(row.RaceName || row.raceName),
    raceDateTime:
      row.RaceDateTime || row.raceDateTime || "",
    gameId:
      racingWagerString_(row.GameId || row.gameId),
    espnEventId:
      racingWagerString_(row.ESPNEventId || row.espnEventId),
    league:
      racingWagerString_(row.League || row.league),
    logo: logo
  };

}

function racingWagerBuildEntries_(rows, payload) {

  payload = payload || {};

  let oddsByDriver = {};

  if (payload.oddsByDriverJson) {
    try {
      oddsByDriver = JSON.parse(payload.oddsByDriverJson);
    } catch (err) {
      oddsByDriver = {};
    }
  }

  return (rows || [])
    .map(function(row) {
      const entry =
        racingWagerNormalizeDriverRow_(row);

      if (!entry.name) {
        return null;
      }

      const odds =
        oddsByDriver[entry.nomineeId] ||
        oddsByDriver[entry.driverId] ||
        oddsByDriver[entry.name] ||
        "";

      entry.odds = odds;

      return entry;
    })
    .filter(function(entry) {
      return !!entry;
    });

}

function racingWagerRaceName_(entries, payload) {

  payload = payload || {};

  if (payload.categoryName) {
    return racingWagerString_(payload.categoryName);
  }

  const first =
    entries && entries.length
      ? entries[0]
      : {};

  return (
    racingWagerString_(first.raceName) ||
    racingWagerString_(payload.raceName) ||
    "Racing Event"
  );

}

function racingWagerCategoryId_(entries, payload, market) {

  payload = payload || {};

  if (payload.categoryId) {
    return racingWagerKey_(payload.categoryId);
  }

  const first =
    entries && entries.length
      ? entries[0]
      : {};

  const league =
    racingWagerSlug_(
      payload.league ||
      payload.racingLeague ||
      first.league ||
      "racing"
    );

  const eventId =
    racingWagerSlug_(
      payload.espnEventId ||
      payload.racingGameId ||
      payload.sportsGameId ||
      first.espnEventId ||
      first.gameId ||
      first.raceName ||
      "event"
    );

  return racingWagerKey_(
    "racing-" +
    league +
    "-" +
    racingWagerSlug_(market) +
    "-" +
    eventId
  );

}

function racingWagerCategoryExists_(awardsGameId, categoryId) {

  const sh = racingWagerGetSheet_(CATEGORIES_SHEET);
  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers = data[0].map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined
  ) {
    return false;
  }

  for (let i = 1; i < data.length; i++) {
    if (
      racingWagerString_(data[i][col.GameId]) === awardsGameId &&
      racingWagerKey_(data[i][col.CategoryId]) === racingWagerKey_(categoryId)
    ) {
      return true;
    }
  }

  return false;

}

function racingWagerAppendCategoryRow_(
  awardsGameId,
  categoryId,
  categoryName,
  entry,
  market,
  oddsMode
) {

  const sh = racingWagerGetSheet_(CATEGORIES_SHEET);
  const headers =
    sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);
  const row = new Array(headers.length).fill("");

  const sportsGameId =
    entry.gameId || "";

  const espnEventId =
    entry.espnEventId || "";

  racingWagerSetIfExists_(row, col, "GameId", awardsGameId);
  racingWagerSetIfExists_(row, col, "Category", categoryName);
  racingWagerSetIfExists_(row, col, "CategoryId", categoryId);
  racingWagerSetIfExists_(row, col, "Nominee", entry.name);
  racingWagerSetIfExists_(row, col, "NomineeId", entry.nomineeId);
  racingWagerSetIfExists_(row, col, "Section", (entry.league || "RACING").toUpperCase());
  racingWagerSetIfExists_(row, col, "ShortAnswer", entry.name);
  racingWagerSetIfExists_(row, col, "Active", true);
  racingWagerSetIfExists_(row, col, "PredictionGame", true);
  racingWagerSetIfExists_(row, col, "CommunityRank", false);
  racingWagerSetIfExists_(row, col, "QuestionType", "racing-winner");
  racingWagerSetIfExists_(row, col, "ScoringEngine", "racing");
  racingWagerSetIfExists_(row, col, "SelectionMode", "single");
  racingWagerSetIfExists_(row, col, "EntryType", "driver");
  racingWagerSetIfExists_(row, col, "OddsMode", oddsMode);
  racingWagerSetIfExists_(row, col, "ResultSource", "racing-engine");
  racingWagerSetIfExists_(row, col, "SportsProvider", "ESPN");
  racingWagerSetIfExists_(row, col, "SportsGameId", sportsGameId);
  racingWagerSetIfExists_(row, col, "ESPNEventId", espnEventId);
  racingWagerSetIfExists_(row, col, "SportsLeague", entry.league);
  racingWagerSetIfExists_(row, col, "SportsMarket", market);
  racingWagerSetIfExists_(row, col, "SportsSelection", entry.nomineeId);
  racingWagerSetIfExists_(row, col, "SportsStatus", entry.status);
  racingWagerSetIfExists_(row, col, "SportsState", entry.state);
  racingWagerSetIfExists_(row, col, "BettingOdds", entry.odds || "");
  racingWagerSetIfExists_(row, col, "OddsSource", entry.odds ? "manual" : (oddsMode === "none" ? "none" : "pending-real-odds"));
  racingWagerSetIfExists_(row, col, "OddsLastUpdated", entry.odds ? new Date() : "");
  racingWagerSetIfExists_(row, col, "LogoUrl", entry.logo || "");
  racingWagerSetIfExists_(row, col, "RacingDriverId", entry.driverId);
  racingWagerSetIfExists_(row, col, "RacingCarNumber", entry.carNumber);
  racingWagerSetIfExists_(row, col, "RacingTeam", entry.team);
  racingWagerSetIfExists_(row, col, "RacingManufacturer", entry.manufacturer);
  racingWagerSetIfExists_(row, col, "RacingStartingPosition", entry.startingPosition);
  racingWagerSetIfExists_(row, col, "RacingCurrentPosition", entry.currentPosition);
  racingWagerSetIfExists_(row, col, "RacingFinalPosition", entry.finalPosition);
  racingWagerSetIfExists_(row, col, "RacingWinner", entry.winner === true);

  sh.appendRow(row);

}

function racingWagerUpdateCategoryRows_(
  awardsGameId,
  categoryId,
  categoryName,
  entries,
  market,
  oddsMode
) {

  const sh = racingWagerGetSheet_(CATEGORIES_SHEET);
  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      matchedRows: 0,
      updatedRows: 0,
      insertedRows: 0
    };
  }

  const headers = data[0].map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);
  const existingKeys = {};
  let matchedRows = 0;
  let updatedRows = 0;

  entries.forEach(function(entry) {
    existingKeys[entry.nomineeId] = false;
  });

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      racingWagerString_(data[i][col.GameId]);

    const rowCategoryId =
      racingWagerKey_(data[i][col.CategoryId]);

    if (
      rowGameId !== awardsGameId ||
      rowCategoryId !== racingWagerKey_(categoryId)
    ) {
      continue;
    }

    matchedRows++;

    const rowNomineeId =
      racingWagerKey_(data[i][col.NomineeId]);

    const rowDriverId =
      col.RacingDriverId !== undefined
        ? racingWagerString_(data[i][col.RacingDriverId])
        : "";

    const entry =
      entries.find(function(item) {
        return (
          item.nomineeId === rowNomineeId ||
          (
            item.driverId &&
            rowDriverId &&
            item.driverId === rowDriverId
          )
        );
      });

    if (!entry) {
      continue;
    }

    existingKeys[entry.nomineeId] = true;

    function setCell_(header, value) {
      if (col[header] === undefined) {
        return;
      }
      sh.getRange(i + 1, col[header] + 1).setValue(value);
    }

    setCell_("Category", categoryName);
    setCell_("Nominee", entry.name);
    setCell_("ShortAnswer", entry.name);
    setCell_("QuestionType", "racing-winner");
    setCell_("ScoringEngine", "racing");
    setCell_("SelectionMode", "single");
    setCell_("EntryType", "driver");
    setCell_("OddsMode", oddsMode);
    setCell_("ResultSource", "racing-engine");
    setCell_("SportsProvider", "ESPN");
    setCell_("SportsGameId", entry.gameId || "");
    setCell_("ESPNEventId", entry.espnEventId || "");
    setCell_("SportsLeague", entry.league || "");
    setCell_("SportsMarket", market);
    setCell_("SportsSelection", entry.nomineeId);
    setCell_("SportsStatus", entry.status || "");
    setCell_("SportsState", entry.state || "");
    setCell_("LogoUrl", entry.logo || "");
    setCell_("RacingDriverId", entry.driverId || "");
    setCell_("RacingCarNumber", entry.carNumber || "");
    setCell_("RacingTeam", entry.team || "");
    setCell_("RacingManufacturer", entry.manufacturer || "");
    setCell_("RacingStartingPosition", entry.startingPosition || "");
    setCell_("RacingCurrentPosition", entry.currentPosition || "");
    setCell_("RacingFinalPosition", entry.finalPosition || "");
    setCell_("RacingWinner", entry.winner === true);

    if (entry.odds) {
      setCell_("BettingOdds", entry.odds);
      setCell_("OddsSource", "manual");
      setCell_("OddsLastUpdated", new Date());
    } else if (oddsMode === "none") {
      setCell_("OddsSource", "none");
    }

    updatedRows++;

  }

  let insertedRows = 0;

  entries.forEach(function(entry) {
    if (existingKeys[entry.nomineeId] === true) {
      return;
    }
    racingWagerAppendCategoryRow_(
      awardsGameId,
      categoryId,
      categoryName,
      entry,
      market,
      oddsMode
    );
    insertedRows++;
  });

  return {
    matchedRows: matchedRows,
    updatedRows: updatedRows,
    insertedRows: insertedRows
  };

}

function racingWagerUpsertSettings_(
  awardsGameId,
  categoryId,
  categoryName,
  firstEntry,
  market,
  oddsMode
) {

  const sh = racingWagerGetSheet_(CATEGORY_SETTINGS_SHEET);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);

  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (
      racingWagerString_(data[i][col.GameId]) === awardsGameId &&
      racingWagerKey_(data[i][col.CategoryId]) === racingWagerKey_(categoryId)
    ) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    const row = new Array(headers.length).fill("");
    sh.appendRow(row);
    targetRow = sh.getLastRow();
  }

  function set_(header, value, onlyBlank) {
    if (col[header] === undefined) {
      return;
    }

    const range = sh.getRange(targetRow, col[header] + 1);

    if (onlyBlank) {
      const existing = racingWagerString_(range.getValue());
      if (existing) {
        return;
      }
    }

    range.setValue(value);
  }

  const oddsReady =
    oddsMode === "none" ||
    oddsMode === "manual";

  set_("GameId", awardsGameId);
  set_("CategoryId", categoryId);
  set_("Points", 1, true);
  set_("Locked", false, true);
  set_("WinnerNomineeId", "", true);
  set_("ChangePenalty", 0, true);
  set_("MaxChanges", 0, true);
  set_("LockDateTime", firstEntry.raceDateTime || "", true);
  set_("DisplayOrder", targetRow - 1, true);
  set_("GroupId", "racing-" + racingWagerSlug_(firstEntry.league || "racing"));
  set_("LayoutType", "wager", true);
  set_("ShortName", categoryName);
  set_("CountsAsStatue", false, true);
  set_("ScoreVersion", RACING_WAGER_SCORE_VERSION);
  set_("VotingTypes", "wager");
  set_("QuestionType", "racing-winner");
  set_("ScoringEngine", "racing");
  set_("SelectionMode", "single");
  set_("ScoreMode", "wager");
  set_("OddsMode", oddsMode);
  set_("ResultSource", "racing-engine");
  set_("SettlementStatus", "pending", true);
  set_("MaxSelections", 1, true);
  set_("MinSelections", 1, true);
  set_("SportsGameId", firstEntry.gameId || "");
  set_("ESPNEventId", firstEntry.espnEventId || "");
  set_("SportsMarket", market);
  set_("SportsLeague", firstEntry.league || "");
  set_("WagerResultType", "", true);
  set_("OddsReady", oddsReady);
  set_("OddsSource", oddsMode === "none" ? "none" : "manual");
  set_("OddsLastUpdated", oddsMode === "none" ? "" : new Date());

  return {
    success: true,
    row: targetRow
  };

}

function createRacingWagerFromRace(payload) {

  payload = payload || {};

  setupRacingWagerSystem();

  const awardsGameId =
    racingWagerString_(
      payload.awardsGameId ||
      payload.gameId ||
      getDefaultGameId()
    );

  validateGameId(awardsGameId);

  const rows =
    fetchRacingResultsForWager_(payload);

  const entries =
    racingWagerBuildEntries_(rows, payload);

  if (!entries.length) {
    throw new Error(
      "No racing driver rows were returned for this race."
    );
  }

  const market =
    racingWagerString_(
      payload.market ||
      payload.racingMarket ||
      RACING_WAGER_DEFAULT_MARKET
    ) || RACING_WAGER_DEFAULT_MARKET;

  const oddsMode =
    racingWagerKey_(
      payload.oddsMode ||
      "none"
    ) || "none";

  const categoryName =
    racingWagerRaceName_(entries, payload) +
    " - Race Winner";

  const categoryId =
    racingWagerCategoryId_(
      entries,
      payload,
      market
    );

  const lock =
    LockService.getDocumentLock() ||
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(30000);

  if (!gotLock) {
    throw new Error(
      "Create racing wager is busy. Please try again in a few seconds."
    );
  }

  try {

    const duplicate =
      racingWagerCategoryExists_(
        awardsGameId,
        categoryId
      );

    const updateResult =
      racingWagerUpdateCategoryRows_(
        awardsGameId,
        categoryId,
        categoryName,
        entries,
        market,
        oddsMode
      );

    const settingsResult =
      racingWagerUpsertSettings_(
        awardsGameId,
        categoryId,
        categoryName,
        entries[0],
        market,
        oddsMode
      );

    SpreadsheetApp.flush();

    if (typeof clearAppCaches === "function") {
      clearAppCaches();
    }

    return {
      success: true,
      duplicate: duplicate,
      awardsGameId: awardsGameId,
      categoryId: categoryId,
      market: market,
      oddsMode: oddsMode,
      driverCount: entries.length,
      update: updateResult,
      settings: settingsResult
    };

  } finally {

    lock.releaseLock();

  }

}

function refreshRacingWagerScores(payload) {

  payload = payload || {};

  setupRacingWagerSystem();

  const awardsGameId =
    racingWagerString_(
      payload.awardsGameId ||
      payload.gameId ||
      getDefaultGameId()
    );

  validateGameId(awardsGameId);

  const sh = racingWagerGetSheet_(CATEGORY_SETTINGS_SHEET);
  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      success: true,
      refreshed: 0,
      message: "No CategorySettings rows found."
    };
  }

  const headers = data[0].map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);
  let refreshed = 0;
  const errors = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (racingWagerString_(row[col.GameId]) !== awardsGameId) {
      continue;
    }

    if (
      col.ScoringEngine !== undefined &&
      racingWagerKey_(row[col.ScoringEngine]) !== "racing"
    ) {
      continue;
    }

    const categoryId =
      racingWagerKey_(row[col.CategoryId]);

    if (!categoryId) {
      continue;
    }

    try {
      const rows = fetchRacingResultsForWager_({
        league:
          col.SportsLeague !== undefined
            ? row[col.SportsLeague]
            : "",
        racingGameId:
          col.SportsGameId !== undefined
            ? row[col.SportsGameId]
            : "",
        espnEventId:
          col.ESPNEventId !== undefined
            ? row[col.ESPNEventId]
            : ""
      });

      const entries = racingWagerBuildEntries_(rows, {});

      if (!entries.length) {
        continue;
      }

      const categoryName =
        racingWagerRaceName_(entries, {}) +
        " - Race Winner";

      const market =
        col.SportsMarket !== undefined
          ? racingWagerString_(row[col.SportsMarket] || RACING_WAGER_DEFAULT_MARKET)
          : RACING_WAGER_DEFAULT_MARKET;

      const oddsMode =
        col.OddsMode !== undefined
          ? racingWagerKey_(row[col.OddsMode] || "none")
          : "none";

      racingWagerUpdateCategoryRows_(
        awardsGameId,
        categoryId,
        categoryName,
        entries,
        market,
        oddsMode
      );

      refreshed++;

    } catch (err) {
      errors.push({
        categoryId: categoryId,
        error: err && err.message ? err.message : String(err)
      });
    }

  }

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return {
    success: errors.length === 0,
    awardsGameId: awardsGameId,
    refreshed: refreshed,
    errors: errors
  };

}

function racingWagerFindWinner_(entries) {

  const explicit =
    entries.find(function(entry) {
      return entry.winner === true;
    });

  if (explicit) {
    return explicit;
  }

  return entries.find(function(entry) {
    return Number(entry.finalPosition) === 1;
  }) || null;

}

function racingWagerSetSettingWinner_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  winnerEntry
) {

  const sh = racingWagerGetSheet_(CATEGORY_SETTINGS_SHEET);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);
  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (
      racingWagerString_(data[i][col.GameId]) === awardsGameId &&
      racingWagerKey_(data[i][col.CategoryId]) === racingWagerKey_(categoryId)
    ) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return false;
  }

  function set_(header, value) {
    if (col[header] === undefined) {
      return;
    }
    sh.getRange(targetRow, col[header] + 1).setValue(value);
  }

  set_("WinnerNomineeId", winnerNomineeId);
  set_("Locked", true);
  set_("SettlementStatus", "settled");
  set_("WagerResultType", "win");
  set_("ResultSource", "racing-engine");
  set_("ScoreVersion", RACING_WAGER_SCORE_VERSION);

  if (typeof upsertCategoryResult_ === "function") {
    upsertCategoryResult_({
      gameId: awardsGameId,
      categoryId: categoryId,
      nomineeId: winnerNomineeId,
      resultStatus: "settled",
      isWinner: true,
      finalPosition: winnerEntry ? winnerEntry.finalPosition : 1,
      resultSource: "racing-engine",
      notes:
        winnerEntry && winnerEntry.name
          ? "Racing winner: " + winnerEntry.name
          : "Racing winner settled"
    });
  }

  return true;

}

function settleRacingWagers(payload) {

  payload = payload || {};

  setupRacingWagerSystem();

  const awardsGameId =
    racingWagerString_(
      payload.awardsGameId ||
      payload.gameId ||
      getDefaultGameId()
    );

  validateGameId(awardsGameId);

  const force =
    racingWagerBool_(payload.force);

  const sh = racingWagerGetSheet_(CATEGORY_SETTINGS_SHEET);
  const data = sh.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      success: true,
      settled: 0,
      message: "No CategorySettings rows found."
    };
  }

  const headers = data[0].map(racingWagerString_);
  const col = racingWagerHeaderMap_(headers);
  let settled = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (racingWagerString_(row[col.GameId]) !== awardsGameId) {
      continue;
    }

    if (
      col.ScoringEngine !== undefined &&
      racingWagerKey_(row[col.ScoringEngine]) !== "racing"
    ) {
      continue;
    }

    const categoryId =
      racingWagerKey_(row[col.CategoryId]);

    const existingWinner =
      col.WinnerNomineeId !== undefined
        ? racingWagerString_(row[col.WinnerNomineeId])
        : "";

    if (existingWinner && !force) {
      skipped++;
      continue;
    }

    try {
      const rows = fetchRacingResultsForWager_({
        league:
          col.SportsLeague !== undefined
            ? row[col.SportsLeague]
            : "",
        racingGameId:
          col.SportsGameId !== undefined
            ? row[col.SportsGameId]
            : "",
        espnEventId:
          col.ESPNEventId !== undefined
            ? row[col.ESPNEventId]
            : ""
      });

      const entries = racingWagerBuildEntries_(rows, {});
      const winner = racingWagerFindWinner_(entries);

      if (!winner) {
        skipped++;
        continue;
      }

      if (!winner.completed && !force) {
        skipped++;
        continue;
      }

      racingWagerSetSettingWinner_(
        awardsGameId,
        categoryId,
        winner.nomineeId,
        winner
      );

      const categoryName =
        racingWagerRaceName_(entries, {}) +
        " - Race Winner";

      const market =
        col.SportsMarket !== undefined
          ? racingWagerString_(row[col.SportsMarket] || RACING_WAGER_DEFAULT_MARKET)
          : RACING_WAGER_DEFAULT_MARKET;

      racingWagerUpdateCategoryRows_(
        awardsGameId,
        categoryId,
        categoryName,
        entries,
        market,
        "none"
      );

      settled++;

    } catch (err) {
      errors.push({
        categoryId: categoryId,
        error: err && err.message ? err.message : String(err)
      });
    }

  }

  SpreadsheetApp.flush();

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return {
    success: errors.length === 0,
    awardsGameId: awardsGameId,
    settled: settled,
    skipped: skipped,
    errors: errors
  };

}

function apiAdminSetupRacingWagerSystem(payload) {

  payload = payload || {};

  requireAdmin_(payload);

  return setupRacingWagerSystem();

}

function apiAdminCreateRacingWager(payload) {

  payload = payload || {};

  requireAdmin_(payload);

  return createRacingWagerFromRace(payload);

}

function apiAdminRefreshRacingWagerScores(payload) {

  payload = payload || {};

  requireAdmin_(payload);

  return refreshRacingWagerScores(payload);

}

function apiAdminSettleRacingWagers(payload) {

  payload = payload || {};

  requireAdmin_(payload);

  return settleRacingWagers(payload);

}
