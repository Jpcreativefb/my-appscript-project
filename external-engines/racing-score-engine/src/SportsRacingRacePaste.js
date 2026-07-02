/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/


/************************************************************
 CLEAN SPLIT v13 - RACING GRID + RESULTS STATS WORKFLOW

Purpose:
- Use SportsRacingDrivers for stable driver/car/manufacturer/images.
- Use SportsRacingRaceEntries for race-specific grid/start info.
- Use SportsRacingSupplemental for post-race stats only.

This avoids depending on ESPN car-number images in copied tables.

Main functions:
- setupSportsRacingDriverGridStatsWorkflowV13
- prepareSportsRacingGridPasteForRaceV13
- prepareSportsRacingResultsStatsPasteForRaceV13
- importSportsRacingGridOrStatsPasteV13
- testSportsRacingGridNoCarPasteV13
- testSportsRacingResultsStatsPasteV13
************************************************************/

var SPORTS_RACING_GRID_STATS_WORKFLOW_VERSION_V13 =
  "v13_driver_grid_stats_workflow";

function setupSportsRacingDriverGridStatsWorkflowV13() {

  if (typeof setupSportsRacingSupplementalSystem === "function") {
    setupSportsRacingSupplementalSystem();
  }

  if (typeof setupSportsRacingDriverDatabaseSystem === "function") {
    setupSportsRacingDriverDatabaseSystem();
  }

  if (typeof setupSportsRacingOption1RawPasteSystem === "function") {
    setupSportsRacingOption1RawPasteSystem();
  }

  return {
    success: true,
    version: SPORTS_RACING_GRID_STATS_WORKFLOW_VERSION_V13,
    sheets: {
      drivers: "SportsRacingDrivers",
      raceEntries: "SportsRacingRaceEntries",
      rawPaste: "SportsRacingRawPaste",
      supplemental: "SportsRacingSupplemental",
      baseline: "SportsRacingResults"
    },
    message:
      "v13 setup complete. Use grid paste for start/speed only, and results-stats paste for laps/led/points only."
  };

}

function prepareSportsRacingGridPasteForSanDiegoV13() {

  return prepareSportsRacingGridPasteForRaceV13(
    "nascar-premier",
    "202606214266"
  );

}

function prepareSportsRacingResultsStatsPasteForSanDiegoV13() {

  return prepareSportsRacingResultsStatsPasteForRaceV13(
    "nascar-premier",
    "202606214266"
  );

}

function prepareSportsRacingGridPasteForRaceV13(
  league,
  espnEventId
) {

  return sportsRacingPreparePasteV13_(
    league,
    espnEventId,
    "grid_entry",
    "Paste ESPN starting grid at A5. You may omit the CAR column. Required: POS and DRIVER. Optional: MANUFACTURER, SPEED."
  );

}

function prepareSportsRacingResultsStatsPasteForRaceV13(
  league,
  espnEventId
) {

  return sportsRacingPreparePasteV13_(
    league,
    espnEventId,
    "results_stats",
    "Paste ESPN race results at A5. Car number/finish order can be ignored. Required: DRIVER. Useful columns: LAPS, START, LED, PTS, BONUS, PENALTY."
  );

}

function sportsRacingPreparePasteV13_(
  league,
  espnEventId,
  importType,
  notes
) {

  setupSportsRacingDriverGridStatsWorkflowV13();

  league =
    sportsRacingRawPasteStringV9_(league)
      .toLowerCase();

  espnEventId =
    sportsRacingRawPasteStringV9_(espnEventId);

  const prepared =
    typeof prepareSportsRacingRawPasteForRace === "function"
      ? prepareSportsRacingRawPasteForRace(
          league,
          espnEventId,
          importType
        )
      : { success: true };

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  const meta =
    sportsRacingRawPasteReadMetaV9_(
      sh.getDataRange().getValues()
    );

  sh
    .getRange(2, 1, 1, 8)
    .setValues([[
      importType,
      meta.League || league,
      meta.ESPNEventId || espnEventId,
      meta.GameId || (league + "_" + espnEventId),
      meta.RaceName || "",
      meta.RaceDateTime || "",
      meta.Series || sportsRacingSeriesForLeagueV9_(league),
      notes
    ]]);

  sh
    .getRange(4, 1, 1, 10)
    .setValues([[
      "Paste table at A5.",
      importType === "grid_entry"
        ? "GRID REQUIRED: POS, DRIVER. OPTIONAL: MANUFACTURER, SPEED. CAR can be missing."
        : "RESULTS STATS REQUIRED: DRIVER. OPTIONAL: LAPS, START, LED, PTS, BONUS, PENALTY. CAR can be missing.",
      "Run importSportsRacingGridOrStatsPasteV13 after pasting.",
      "Rows are stored by ESPNEventId/GameId + DriverName.",
      "Driver database fills car number/manufacturer/images.",
      "",
      "",
      "",
      "",
      ""
    ]]);

  return {
    success: true,
    prepared: prepared,
    importType: importType,
    league: league,
    espnEventId: espnEventId,
    gameId: meta.GameId || (league + "_" + espnEventId),
    sheet: "SportsRacingRawPaste",
    message:
      notes + " Paste the table starting at A5, then run importSportsRacingGridOrStatsPasteV13."
  };

}

function importSportsRacingGridOrStatsPasteV13() {

  setupSportsRacingDriverGridStatsWorkflowV13();

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  const data =
    sh.getDataRange()
      .getValues();

  const meta =
    sportsRacingRawPasteReadMetaV9_(data);

  const importType =
    sportsRacingRawPasteStringV9_(meta.ImportType || "")
      .toLowerCase();

  if (importType === "grid_entry" || importType === "grid") {
    return importSportsRacingGridEntryPasteV13_(data, meta);
  }

  if (
    importType === "results_stats" ||
    importType === "stats" ||
    importType === "results"
  ) {
    return importSportsRacingResultsStatsPasteV13_(data, meta);
  }

  return {
    success: false,
    message:
      "Unknown ImportType. Use grid_entry for starting grid or results_stats for post-race stats.",
    meta: meta
  };

}

function importSportsRacingGridEntryPasteV13_(data, meta) {

  const parsed =
    sportsRacingParseGridEntryRowsV13_(data);

  if (!parsed.rows.length) {
    return {
      success: false,
      importType: "grid_entry",
      inserted: 0,
      updated: 0,
      message:
        "No grid rows parsed. Paste grid at A5. Required columns are POS and DRIVER. CAR is optional and can be missing.",
      meta: meta,
      parseDetails: parsed.details
    };
  }

  const raceEntries =
    parsed.rows.map(function(item) {
      return sportsRacingGridParsedRowToRaceEntryV13_(
        meta,
        item
      );
    });

  const writeResult =
    upsertSportsRacingRaceEntryRowsV13_(
      raceEntries
    );

  return {
    success: true,
    importType: "grid_entry",
    parsedRows: parsed.rows.length,
    inserted: writeResult.inserted,
    updated: writeResult.updated,
    targetSheet: "SportsRacingRaceEntries",
    meta: meta,
    firstRows: parsed.rows.slice(0, 5),
    message:
      "Grid imported to SportsRacingRaceEntries. Car numbers are filled later from SportsRacingDrivers when missing."
  };

}

function importSportsRacingResultsStatsPasteV13_(data, meta) {

  const parsed =
    sportsRacingParseResultsStatsRowsV13_(data);

  if (!parsed.rows.length) {
    return {
      success: false,
      importType: "results_stats",
      inserted: 0,
      updated: 0,
      message:
        "No result-stat rows parsed. Paste results at A5. Required column is DRIVER. Useful columns are LAPS, START, LED, PTS, BONUS, PENALTY.",
      meta: meta,
      parseDetails: parsed.details
    };
  }

  const sourceLink =
    sportsRacingRawPasteMetaToSourceLinkV9_(meta);

  const supplementalRows = [];
  const raceEntryRows = [];

  parsed.rows.forEach(function(item) {
    supplementalRows.push(
      sportsRacingResultsStatsRowToSupplementalV13_(
        sourceLink,
        item
      )
    );

    // ESPN results page usually includes START. Store it in RaceEntries
    // because starting position is race-specific, not a driver default.
    if (
      item.StartingPosition !== "" &&
      item.StartingPosition !== null &&
      item.StartingPosition !== undefined
    ) {
      raceEntryRows.push(
        sportsRacingResultsStatsRowToRaceEntryV13_(
          meta,
          item
        )
      );
    }
  });

  const supplementalWrite =
    upsertSportsRacingSupplementalRows_(
      supplementalRows
    );

  const entryWrite =
    upsertSportsRacingRaceEntryRowsV13_(
      raceEntryRows
    );

  return {
    success: true,
    importType: "results_stats",
    parsedRows: parsed.rows.length,
    supplementalInserted: supplementalWrite.inserted,
    supplementalUpdated: supplementalWrite.updated,
    raceEntriesInserted: entryWrite.inserted,
    raceEntriesUpdated: entryWrite.updated,
    targetSheets: [
      "SportsRacingSupplemental",
      "SportsRacingRaceEntries"
    ],
    meta: meta,
    firstRows: parsed.rows.slice(0, 5),
    message:
      "Results stats imported. Finish order remains from the main ESPN scoreboard pull; pasted stats add laps/led/points/bonus/penalty and START when present."
  };

}

function sportsRacingFindPasteHeaderRowV13_(data, type) {

  data =
    Array.isArray(data)
      ? data
      : [];

  for (let r = 4; r < data.length; r++) {

    const raw = data[r] || [];

    const headers =
      raw.map(function(cell) {
        return sportsRacingRawPasteKeyV9_(cell);
      });

    const hasDriver =
      headers.indexOf("driver") !== -1 ||
      headers.indexOf("racer") !== -1 ||
      headers.indexOf("name") !== -1;

    const hasPos =
      headers.indexOf("pos") !== -1 ||
      headers.indexOf("position") !== -1 ||
      headers.indexOf("finish") !== -1 ||
      headers.indexOf("start") !== -1;

    const hasStats =
      headers.indexOf("laps") !== -1 ||
      headers.indexOf("led") !== -1 ||
      headers.indexOf("pts") !== -1 ||
      headers.indexOf("points") !== -1 ||
      headers.indexOf("bonus") !== -1 ||
      headers.indexOf("penalty") !== -1;

    if (type === "grid_entry" && hasDriver && hasPos) {
      return r;
    }

    if (type === "results_stats" && hasDriver && (hasStats || hasPos)) {
      return r;
    }

  }

  return -1;

}

function sportsRacingParseGridEntryRowsV13_(data) {

  const headerRow =
    sportsRacingFindPasteHeaderRowV13_(
      data,
      "grid_entry"
    );

  const details = {
    headerRowIndex: headerRow >= 0 ? headerRow + 1 : -1,
    required: "POS and DRIVER",
    optional: "MANUFACTURER, SPEED, CAR",
    carColumnRequired: false
  };

  if (headerRow < 0) {
    return {
      rows: [],
      details: details
    };
  }

  const headers =
    (data[headerRow] || [])
      .map(function(cell) {
        return sportsRacingRawPasteKeyV9_(cell);
      });

  const index =
    sportsRacingRawPasteHeaderIndexV13_(headers);

  if (index.pos < 0 || index.driver < 0) {
    return {
      rows: [],
      details: details
    };
  }

  const rows = [];

  for (let r = headerRow + 1; r < data.length; r++) {

    const row = data[r] || [];

    const startingPosition =
      sportsRacingSupplementalNumberOrBlank_(
        row[index.pos]
      );

    const driverName =
      sportsRacingRawPasteStringV9_(
        row[index.driver]
      );

    if (startingPosition === "" || !driverName) {
      continue;
    }

    rows.push({
      DriverName: driverName,
      StartingPosition: startingPosition,
      Manufacturer:
        index.manufacturer >= 0
          ? sportsRacingRawPasteStringV9_(row[index.manufacturer])
          : "",
      CarNumber:
        index.car >= 0
          ? sportsRacingRawPasteStringV9_(row[index.car])
          : "",
      QualifyingSpeed:
        index.speed >= 0
          ? sportsRacingRawPasteStringV9_(row[index.speed])
          : "",
      RawCells: row
    });

  }

  details.parsedRows = rows.length;

  return {
    rows: rows,
    details: details
  };

}

function sportsRacingParseResultsStatsRowsV13_(data) {

  const headerRow =
    sportsRacingFindPasteHeaderRowV13_(
      data,
      "results_stats"
    );

  const details = {
    headerRowIndex: headerRow >= 0 ? headerRow + 1 : -1,
    required: "DRIVER",
    useful: "LAPS, START, LED, PTS, BONUS, PENALTY",
    finishOrderSource: "Main ESPN scoreboard baseline, not this paste"
  };

  if (headerRow < 0) {
    return {
      rows: [],
      details: details
    };
  }

  const headers =
    (data[headerRow] || [])
      .map(function(cell) {
        return sportsRacingRawPasteKeyV9_(cell);
      });

  const index =
    sportsRacingRawPasteHeaderIndexV13_(headers);

  if (index.driver < 0) {
    return {
      rows: [],
      details: details
    };
  }

  const rows = [];

  for (let r = headerRow + 1; r < data.length; r++) {

    const row = data[r] || [];

    const driverName =
      sportsRacingRawPasteStringV9_(
        row[index.driver]
      );

    if (!driverName) {
      continue;
    }

    const item = {
      DriverName: driverName,
      FinishPosition:
        index.pos >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.pos])
          : "",
      Laps:
        index.laps >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.laps])
          : "",
      StartingPosition:
        index.start >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.start])
          : "",
      LapsLed:
        index.led >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.led])
          : "",
      Points:
        index.pts >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.pts])
          : "",
      Bonus:
        index.bonus >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.bonus])
          : "",
      Penalty:
        index.penalty >= 0
          ? sportsRacingSupplementalNumberOrBlank_(row[index.penalty])
          : "",
      RawCells: row
    };

    const hasAnyStats =
      item.Laps !== "" ||
      item.StartingPosition !== "" ||
      item.LapsLed !== "" ||
      item.Points !== "" ||
      item.Bonus !== "" ||
      item.Penalty !== "";

    if (!hasAnyStats) {
      continue;
    }

    rows.push(item);

  }

  details.parsedRows = rows.length;

  return {
    rows: rows,
    details: details
  };

}

function sportsRacingRawPasteHeaderIndexV13_(headers) {

  function find(names) {
    for (let i = 0; i < names.length; i++) {
      const idx = headers.indexOf(names[i]);
      if (idx !== -1) {
        return idx;
      }
    }
    return -1;
  }

  return {
    pos: find(["pos", "position", "finish", "fin"]),
    driver: find(["driver", "racer", "name"]),
    manufacturer: find(["manufacturer", "make", "mfr"]),
    car: find(["car", "car number", "number", "no"]),
    speed: find(["speed", "qualifying speed", "qual speed"]),
    laps: find(["laps", "lap"]),
    start: find(["start", "starting position", "startingposition"]),
    led: find(["led", "laps led", "lapsled"]),
    pts: find(["pts", "points"]),
    bonus: find(["bonus"]),
    penalty: find(["penalty", "pen"])
  };

}

function sportsRacingGridParsedRowToRaceEntryV13_(meta, item) {

  const league =
    sportsRacingRawPasteStringV9_(meta.League)
      .toLowerCase();

  const gameId =
    sportsRacingRawPasteStringV9_(meta.GameId);

  const espnEventId =
    sportsRacingRawPasteStringV9_(meta.ESPNEventId);

  const driverName =
    sportsRacingRawPasteStringV9_(item.DriverName);

  return {
    EntryId:
      sportsRacingRaceEntryIdFor_(
        league,
        gameId,
        espnEventId,
        meta.RaceName,
        driverName
      ),
    League: league,
    SeriesId: sportsRacingSeriesIdFromLeague_(league),
    Season: new Date().getFullYear(),
    GameId: gameId,
    ESPNEventId: espnEventId,
    NascarRaceId: "",
    RaceName: meta.RaceName || "",   
    DriverKey:
      sportsRacingDriverKeyFor_(
        league,
        driverName
      ),
    DriverName: driverName,
    CarNumber: item.CarNumber || "",
    Manufacturer: item.Manufacturer || "",
    Team: "",
    Sponsor: "",
    DriverImageUrl: "",
    CarNumberImageUrl: "",
    StartingPosition: item.StartingPosition || "",
    QualifyingSpeed: item.QualifyingSpeed || "",
    Source:
     "race_entry_grid_paste",
    SourceUpdatedAt:
      new Date(),
    ManualOverride:
      false,
    Notes:
     "v13 grid paste. Car number may be blank; driver database fills it.",
    CreatedAt:
       new Date(),
    UpdatedAt:
      new Date()
    };

}

function sportsRacingResultsStatsRowToRaceEntryV13_(meta, item) {

  const row =
    sportsRacingGridParsedRowToRaceEntryV13_(
      meta,
      {
        DriverName: item.DriverName,
        StartingPosition: item.StartingPosition,
        QualifyingSpeed: "",
        CarNumber: "",
        Manufacturer: ""
      }
    );

  row.Notes =
    "v13 results-stats paste stored START as race-specific starting position.";

  return row;

}

function sportsRacingResultsStatsRowToSupplementalV13_(sourceLink, item) {

  const driverName =
    sportsRacingSupplementalString_(
      item.DriverName
    );

  return {
    SupplementalId:
      sportsRacingSupplementalId_(
        sourceLink.GameId,
        driverName,
        "raw_paste_results_stats"
      ),
    Timestamp: new Date(),
    GameId: sourceLink.GameId,
    ESPNEventId: sourceLink.ESPNEventId,
    League: sourceLink.League,
    RaceName: sourceLink.RaceName,
    RaceDateTime: sourceLink.RaceDateTime,
    DriverId:
      sportsRacingSupplementalDriverId_(driverName),
    DriverName: driverName,
    Source: "raw_paste_results_stats",
    SourceRaceId: sourceLink.ESPNEventId,
    SourceDriverId: "",
    StartingPosition: item.StartingPosition || "",
    StartingPositionSource:
      item.StartingPosition !== ""
        ? "raw_paste_results_stats_start_column"
        : "",
    Laps: item.Laps || "",
    LapsLed: item.LapsLed || "",
    Points: item.Points || "",
    Bonus: item.Bonus || "",
    Penalty: item.Penalty || "",
    Notes:
      "v13 pasted results stats only. Finish position intentionally kept from ESPN scoreboard baseline.",
    RawSourceJSON:
      JSON.stringify(item || {}),
    UpdatedAt: new Date()
  };

}

function upsertSportsRacingRaceEntryRowsV13_(rows) {

  if (typeof setupSportsRacingDriverDatabaseSystem === "function") {
    setupSportsRacingDriverDatabaseSystem();
  }

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  rows =
    rows.filter(function(row) {
      return !!(
        row &&
        row.EntryId &&
        row.DriverName
      );
    });

  if (!rows.length) {
    return {
      inserted: 0,
      updated: 0,
      skippedManualOverrides: 0
    };
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName("SportsRacingRaceEntries");

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsRacingDriverDbString_(header);
    });

  const col = {};

  headers.forEach(function(header, index) {
    if (header) {
      col[header] = index;
    }
  });

  const existing = {};

  for (let i = 1; i < data.length; i++) {
    const id =
      sportsRacingDriverDbString_(
        data[i][col.EntryId]
      );

    if (id) {
      existing[id] = i + 1;
    }
  }

  const rowsToAppend = [];
  let inserted = 0;
  let updated = 0;
  let skippedManualOverrides = 0;

  const alwaysUpdate = {
    UpdatedAt: true,
    SourceUpdatedAt: true,
    Source: true,
    Notes: true
  };

  rows.forEach(function(item) {

    const now =
      new Date();

    if (!item.CreatedAt) {
      item.CreatedAt = now;
    }

    item.UpdatedAt = now;

    if (!item.Source) {
      item.Source = "race_entry_paste";
    }

    if (!item.SourceUpdatedAt) {
      item.SourceUpdatedAt = now;
    }

    if (item.ManualOverride === undefined) {
      item.ManualOverride = false;
    }

    if (existing[item.EntryId]) {

      const rowNumber =
        existing[item.EntryId];

      const existingRow =
        data[rowNumber - 1];

      const manualOverride =
        col.ManualOverride !== undefined &&
        sportsRacingDriverDbBoolean_(
          existingRow[col.ManualOverride],
          false
        ) === true;

      if (manualOverride) {
        skippedManualOverrides++;
        return;
      }

      const mergedRow =
        headers.map(function(header, index) {

          const incoming =
            item[header];

          const current =
            existingRow[index];

          if (header === "ManualOverride") {
            return current;
          }

          if (header === "CreatedAt") {
            return current || item.CreatedAt || now;
          }

          if (alwaysUpdate[header]) {
            return incoming !== undefined && incoming !== null
              ? incoming
              : current;
          }

          if (
            incoming === "" ||
            incoming === null ||
            incoming === undefined
          ) {
            return current;
          }

          return incoming;

        });

      sh
        .getRange(
          rowNumber,
          1,
          1,
          headers.length
        )
        .setValues([mergedRow]);

      updated++;

    } else {

      const row =
        headers.map(function(header) {

          if (item[header] !== undefined) {
            return item[header];
          }

          if (header === "ManualOverride") {
            return false;
          }

          if (
            header === "CreatedAt" ||
            header === "UpdatedAt" ||
            header === "SourceUpdatedAt"
          ) {
            return now;
          }

          return "";

        });

      rowsToAppend.push(row);
      inserted++;

    }

  });

  if (rowsToAppend.length) {
    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        rowsToAppend.length,
        headers.length
      )
      .setValues(rowsToAppend);
  }

  SpreadsheetApp.flush();

  return {
    inserted: inserted,
    updated: updated,
    skippedManualOverrides: skippedManualOverrides
  };

}

function testSportsRacingGridNoCarPasteV13() {

  setupSportsRacingDriverGridStatsWorkflowV13();

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  sh
    .getRange(2, 1, 1, 8)
    .setValues([[
      "grid_entry",
      "nascar-premier",
      "202606214266",
      "nascar-premier_202606214266",
      "NASCAR Cup Series at San Diego",
      "",
      "sprint",
      "v13 grid test with no car column"
    ]]);

  const lastRow = Math.max(sh.getLastRow(), 20);
  const lastCol = Math.max(sh.getLastColumn(), 10);

  sh
    .getRange(5, 1, lastRow - 4, lastCol)
    .clearContent();

  sh
    .getRange(5, 1, 3, 4)
    .setValues([
      ["POS", "DRIVER", "MANUFACTURER", "SPEED"],
      [1, "Shane van Gisbergen", "Chevrolet", "90.809 mph"],
      [13, "Corey Heim", "Toyota", "89.785 mph"]
    ]);

  const result =
    importSportsRacingGridOrStatsPasteV13();

  Logger.log(JSON.stringify(result, null, 2));

  return result;

}

function testSportsRacingResultsStatsPasteV13() {

  setupSportsRacingDriverGridStatsWorkflowV13();

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  sh
    .getRange(2, 1, 1, 8)
    .setValues([[
      "results_stats",
      "nascar-premier",
      "202606214266",
      "nascar-premier_202606214266",
      "NASCAR Cup Series at San Diego",
      "",
      "sprint",
      "v13 results stats test"
    ]]);

  const lastRow = Math.max(sh.getLastRow(), 20);
  const lastCol = Math.max(sh.getLastColumn(), 12);

  sh
    .getRange(5, 1, lastRow - 4, lastCol)
    .clearContent();

  sh
    .getRange(5, 1, 3, 8)
    .setValues([
      ["POS", "DRIVER", "LAPS", "START", "LED", "PTS", "BONUS", "PENALTY"],
      [1, "Corey Heim", 75, 13, 3, 0, 0, 0],
      [2, "Bubba Wallace", 75, 12, 0, 0, 0, 0]
    ]);

  const result =
    importSportsRacingGridOrStatsPasteV13();

  Logger.log(JSON.stringify(result, null, 2));

  return result;

}

function testSportsRacingFinalMergedAfterV13() {

  const gridResult =
    testSportsRacingGridNoCarPasteV13();

  const statsResult =
    testSportsRacingResultsStatsPasteV13();

  const merged =
    apiGetSportsRacingResults_({
      league: "nascar-premier",
      espnEventId: "202606214266"
    });

  return {
    success: true,
    gridResult: gridResult,
    statsResult: statsResult,
    mergedSample: merged.results ? merged.results.slice(0, 5) : merged
  };

}