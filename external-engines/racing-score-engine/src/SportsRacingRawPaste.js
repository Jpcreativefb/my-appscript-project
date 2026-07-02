/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/

/************************************************************
 CLEAN SPLIT v11
 This file was rebuilt from the working v6 baseline and later racing modules.
 Duplicate patch functions were removed so the project is easier to debug.
************************************************************/



/************************************************************
 v11 module source: v9_raw_paste
************************************************************/

/************************************
 PATCH v9 - RACING OPTION 1 RAW PASTE IMPORTER
 Free/stable workflow for ESPN racing grid/results data when
 UrlFetchApp is blocked by ESPN HTTP 202.

 Adds:
 - SportsRacingRawPaste
 - setupSportsRacingOption1RawPasteSystem
 - prepareSportsRacingRawPasteForRace
 - prepareSportsRacingRawPasteForSanDiego
 - importSportsRacingRawPasteSupplemental
 - clearSportsRacingRawPaste

 Workflow:
 1. Run setupSportsRacingOption1RawPasteSystem
 2. Run prepareSportsRacingRawPasteForRace("nascar-premier", "202606214266")
 3. Open ESPN grid/results page in your browser
 4. Copy the table
 5. Paste it into SportsRacingRawPaste starting at A5
 6. Set ImportType in A2 to grid or results
 7. Run importSportsRacingRawPasteSupplemental
************************************/

var SPORTS_RACING_RAW_PASTE_SHEET_V9 =
  "SportsRacingRawPaste";

var SPORTS_RACING_RAW_PASTE_META_HEADERS_V9 = [
  "ImportType",
  "League",
  "ESPNEventId",
  "GameId",
  "RaceName",
  "RaceDateTime",
  "Series",
  "Notes"
];

function setupSportsRacingOption1RawPasteSystem() {

  if (typeof setupSportsRacingSupplementalSystem === "function") {
    setupSportsRacingSupplementalSystem();
  }

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  return {
    success: true,
    sheets: {
      rawPaste: SPORTS_RACING_RAW_PASTE_SHEET_V9,
      supplemental:
        typeof SPORTS_RACING_SUPPLEMENTAL_SHEET !== "undefined"
          ? SPORTS_RACING_SUPPLEMENTAL_SHEET
          : "SportsRacingSupplemental",
      racingResults:
        typeof SPORTS_RACING_RESULTS_SHEET !== "undefined"
          ? SPORTS_RACING_RESULTS_SHEET
          : "SportsRacingResults"
    },
    message:
      "Option 1 setup complete. Fill row 2 metadata, paste ESPN table at A5, then run importSportsRacingRawPasteSupplemental.",
    rawPasteRows: sh.getLastRow(),
    rawPasteColumns: sh.getLastColumn()
  };

}

function sportsRacingRawPasteGetSheetV9_() {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_RACING_RAW_PASTE_SHEET_V9
    );

  if (!sh) {
    sh = ss.insertSheet(SPORTS_RACING_RAW_PASTE_SHEET_V9);
  }

  const lastRow = sh.getLastRow();
  const lastColumn = sh.getLastColumn();

  let hasMeta = false;

  if (lastRow >= 1 && lastColumn >= 1) {
    const firstRow =
      sh
        .getRange(1, 1, 1, Math.max(lastColumn, SPORTS_RACING_RAW_PASTE_META_HEADERS_V9.length))
        .getValues()[0]
        .map(function(value) {
          return sportsRacingRawPasteStringV9_(value);
        });

    hasMeta =
      firstRow.indexOf("ImportType") !== -1 &&
      firstRow.indexOf("ESPNEventId") !== -1;
  }

  if (!hasMeta) {
    sh
      .getRange(
        1,
        1,
        1,
        SPORTS_RACING_RAW_PASTE_META_HEADERS_V9.length
      )
      .setValues([
        SPORTS_RACING_RAW_PASTE_META_HEADERS_V9
      ]);

    sh
      .getRange(
        2,
        1,
        1,
        SPORTS_RACING_RAW_PASTE_META_HEADERS_V9.length
      )
      .setValues([["", "", "", "", "", "", "", "Paste ESPN grid/results table starting at A5"]]);

    sh
      .getRange(4, 1, 1, 8)
      .setValues([[
        "Paste ESPN table below this row at A5.",
        "Grid headers: POS DRIVER MANUFACTURER CAR SPEED",
        "Results headers: POS DRIVER CAR MANUFACTURER LAPS START LED PTS BONUS PENALTY",
        "Run importSportsRacingRawPasteSupplemental after pasting.",
        "",
        "",
        "",
        ""
      ]]);
  }

  try {
    sh.setFrozenRows(4);
  } catch (err) {
    // Non-critical formatting.
  }

  SpreadsheetApp.flush();

  return sh;

}

function clearSportsRacingRawPaste() {

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  const lastRow =
    sh.getLastRow();

  const lastColumn =
    Math.max(
      sh.getLastColumn(),
      SPORTS_RACING_RAW_PASTE_META_HEADERS_V9.length,
      12
    );

  if (lastRow >= 5) {
    sh
      .getRange(5, 1, lastRow - 4, lastColumn)
      .clearContent();
  }

  return {
    success: true,
    clearedFromRow: 5,
    sheet: SPORTS_RACING_RAW_PASTE_SHEET_V9
  };

}

function prepareSportsRacingRawPasteForSanDiego() {

  return prepareSportsRacingRawPasteForRace(
    "nascar-premier",
    "202606214266"
  );

}

function prepareSportsRacingRawPasteForRace(
  league,
  espnEventId,
  importType
) {

  setupSportsRacingOption1RawPasteSystem();

  league =
    sportsRacingRawPasteStringV9_(league)
      .toLowerCase();

  espnEventId =
    sportsRacingRawPasteStringV9_(espnEventId);

  importType =
    sportsRacingRawPasteStringV9_(importType || "grid")
      .toLowerCase();

  const links =
    typeof readSportsRacingSourceLinkRows_ === "function"
      ? readSportsRacingSourceLinkRows_()
      : [];

  let match =
    links.find(function(link) {
      const rowLeague =
        sportsRacingRawPasteStringV9_(link.League)
          .toLowerCase();

      const rowEventId =
        sportsRacingRawPasteStringV9_(link.ESPNEventId);

      return (
        (!league || rowLeague === league) &&
        (!espnEventId || rowEventId === espnEventId)
      );
    });

  if (!match) {
    match = {
      League: league,
      ESPNEventId: espnEventId,
      GameId:
        league && espnEventId
          ? league + "_" + espnEventId
          : "",
      RaceName: "",
      RaceDateTime: "",
      Series:
        sportsRacingSeriesForLeagueV9_(league)
    };
  }

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  sh
    .getRange(2, 1, 1, SPORTS_RACING_RAW_PASTE_META_HEADERS_V9.length)
    .setValues([[
      importType,
      sportsRacingRawPasteStringV9_(match.League || league),
      sportsRacingRawPasteStringV9_(match.ESPNEventId || espnEventId),
      sportsRacingRawPasteStringV9_(match.GameId || (league + "_" + espnEventId)),
      sportsRacingRawPasteStringV9_(match.RaceName),
      sportsRacingRawPasteStringV9_(match.RaceDateTime),
      sportsRacingRawPasteStringV9_(match.Series || sportsRacingSeriesForLeagueV9_(match.League || league)),
      "Prepared for ESPN table paste. Put grid or results in ImportType, paste table at A5."
    ]]);

  clearSportsRacingRawPaste();

  return {
    success: true,
    sheet: SPORTS_RACING_RAW_PASTE_SHEET_V9,
    importType: importType,
    league: sportsRacingRawPasteStringV9_(match.League || league),
    espnEventId: sportsRacingRawPasteStringV9_(match.ESPNEventId || espnEventId),
    gameId: sportsRacingRawPasteStringV9_(match.GameId || (league + "_" + espnEventId)),
    raceName: sportsRacingRawPasteStringV9_(match.RaceName),
    message: "Now paste the copied ESPN table into SportsRacingRawPaste starting at A5."
  };

}

function importSportsRacingRawPasteSupplemental() {

  setupSportsRacingOption1RawPasteSystem();

  const sh =
    sportsRacingRawPasteGetSheetV9_();

  const data =
    sh.getDataRange()
      .getValues();

  const meta =
    sportsRacingRawPasteReadMetaV9_(data);

  const parsed =
    sportsRacingRawPasteParseTableV9_(
      data,
      meta.ImportType
    );

  if (!parsed.rows.length) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      importType: parsed.importType,
      message:
        "No driver rows were parsed. Make sure you pasted the ESPN table starting at A5 and row 5 includes headers like POS / DRIVER.",
      meta: meta,
      parseDetails: parsed.details
    };
  }

  const sourceLink =
    sportsRacingRawPasteMetaToSourceLinkV9_(meta);

  const supplementalRows =
    parsed.rows.map(function(item) {

      if (parsed.importType === "results") {
        item.Source =
          item.Source || "raw_paste_results";

        return sportsRacingResultsRowToSupplemental_(
          sourceLink,
          item
        );
      }

      item.Source =
        item.Source || "raw_paste_grid";

      return sportsRacingGridRowToSupplemental_(
        sourceLink,
        item
      );

    });

  const writeResult =
    upsertSportsRacingSupplementalRows_(
      supplementalRows
    );

  if (typeof sportsRacingImportLogV8_ === "function") {
    sportsRacingImportLogV8_(
      "INFO",
      "importSportsRacingRawPasteSupplemental",
      sourceLink,
      "raw_paste_import",
      "IMPORTED",
      "Imported raw pasted ESPN racing table",
      {
        importType: parsed.importType,
        parsedRows: parsed.rows.length,
        inserted: writeResult.inserted,
        updated: writeResult.updated,
        firstRows: parsed.rows.slice(0, 3)
      }
    );
  }

  return {
    success: true,
    importType: parsed.importType,
    parsedRows: parsed.rows.length,
    inserted: writeResult.inserted,
    updated: writeResult.updated,
    meta: meta,
    firstRows: parsed.rows.slice(0, 5),
    message:
      "Raw paste imported into SportsRacingSupplemental. getSportsRacingResults will merge these fields into the racing results."
  };

}

function sportsRacingRawPasteReadMetaV9_(data) {

  data =
    Array.isArray(data)
      ? data
      : [];

  const headers =
    (data[0] || [])
      .map(function(value) {
        return sportsRacingRawPasteStringV9_(value);
      });

  const values =
    data[1] || [];

  const meta = {};

  headers.forEach(function(header, index) {
    if (header) {
      meta[header] = values[index];
    }
  });

  meta.ImportType =
    sportsRacingRawPasteStringV9_(meta.ImportType || "auto")
      .toLowerCase();

  meta.League =
    sportsRacingRawPasteStringV9_(meta.League)
      .toLowerCase();

  meta.ESPNEventId =
    sportsRacingRawPasteStringV9_(meta.ESPNEventId);

  meta.GameId =
    sportsRacingRawPasteStringV9_(meta.GameId);

  if (!meta.GameId && meta.League && meta.ESPNEventId) {
    meta.GameId =
      meta.League + "_" + meta.ESPNEventId;
  }

  meta.RaceName =
    sportsRacingRawPasteStringV9_(meta.RaceName);

  meta.RaceDateTime =
    sportsRacingRawPasteStringV9_(meta.RaceDateTime);

  meta.Series =
    sportsRacingRawPasteStringV9_(meta.Series || sportsRacingSeriesForLeagueV9_(meta.League));

  if (!meta.League || !meta.ESPNEventId || !meta.GameId) {
    const inferred =
      sportsRacingRawPasteInferMetaFromLinksV9_(meta);

    Object.keys(inferred).forEach(function(key) {
      if (!meta[key]) {
        meta[key] = inferred[key];
      }
    });
  }

  return meta;

}

function sportsRacingRawPasteInferMetaFromLinksV9_(meta) {

  const result = {};

  const links =
    typeof readSportsRacingSourceLinkRows_ === "function"
      ? readSportsRacingSourceLinkRows_()
      : [];

  if (!links.length) {
    return result;
  }

  let match = null;

  if (meta.ESPNEventId) {
    match =
      links.find(function(link) {
        return sportsRacingRawPasteStringV9_(link.ESPNEventId) === meta.ESPNEventId;
      });
  }

  if (!match && links.length === 1) {
    match = links[0];
  }

  if (!match) {
    return result;
  }

  result.League =
    sportsRacingRawPasteStringV9_(match.League).toLowerCase();

  result.ESPNEventId =
    sportsRacingRawPasteStringV9_(match.ESPNEventId);

  result.GameId =
    sportsRacingRawPasteStringV9_(match.GameId);

  result.RaceName =
    sportsRacingRawPasteStringV9_(match.RaceName);

  result.RaceDateTime =
    sportsRacingRawPasteStringV9_(match.RaceDateTime);

  result.Series =
    sportsRacingRawPasteStringV9_(match.Series || sportsRacingSeriesForLeagueV9_(result.League));

  return result;

}

function sportsRacingRawPasteMetaToSourceLinkV9_(meta) {

  meta =
    meta || {};

  if (!meta.League || !meta.ESPNEventId || !meta.GameId) {
    throw new Error(
      "SportsRacingRawPaste is missing required metadata in row 2. Required: League, ESPNEventId, GameId."
    );
  }

  return {
    League: meta.League,
    GameId: meta.GameId,
    ESPNEventId: meta.ESPNEventId,
    RaceName: meta.RaceName || "",
    RaceDateTime: meta.RaceDateTime || "",
    Series: meta.Series || sportsRacingSeriesForLeagueV9_(meta.League)
  };

}

/* Removed older duplicate function during v11 cleanup. */

function sportsRacingRawPasteHeaderIndexV9_(headers) {

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
    pos: find(["pos", "position", "finish"]),
    driver: find(["driver", "racer", "name"]),
    manufacturer: find(["manufacturer", "make", "mfr"]),
    car: find(["car", "car number", "number", "no"]),
    speed: find(["speed", "qualifying speed"]),
    laps: find(["laps", "lap"]),
    start: find(["start", "starting position", "startingposition"]),
    led: find(["led", "laps led", "lapsled"]),
    pts: find(["pts", "points"]),
    bonus: find(["bonus"]),
    penalty: find(["penalty", "pen"])
  };

}

function sportsRacingRawPasteAllTextV9_(data) {

  const parts = [];

  data.forEach(function(row) {
    row.forEach(function(cell) {
      const value = sportsRacingRawPasteStringV9_(cell);
      if (value) {
        parts.push(value);
      }
    });
  });

  return parts.join(" ");

}

function sportsRacingRawPasteLooksLikeResultsV9_(text) {

  text =
    sportsRacingRawPasteKeyV9_(text);

  return (
    text.indexOf("laps") !== -1 &&
    text.indexOf("led") !== -1 &&
    text.indexOf("pts") !== -1
  );

}

function sportsRacingSeriesForLeagueV9_(league) {

  league =
    sportsRacingRawPasteStringV9_(league)
      .toLowerCase();

  if (
    league === "nascar-premier" ||
    league === "nascar-cup"
  ) {
    return "sprint";
  }

  if (
    league === "nascar-secondary" ||
    league === "nascar-xfinity" ||
    league === "xfinity"
  ) {
    return "nationwide";
  }

  if (
    league === "nascar-truck" ||
    league === "nascar-trucks"
  ) {
    return "truck";
  }

  if (league === "f1") {
    return "f1";
  }

  return league;

}

function sportsRacingRawPasteStringV9_(value) {

  return String(value || "")
    .trim();

}

function sportsRacingRawPasteKeyV9_(value) {

  return sportsRacingRawPasteStringV9_(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


/************************************************************
 v11 module source: v10_header_fix
************************************************************/

/************************************
 PATCH v10 - RACING OPTION 1 RAW PASTE HEADER FIX
 Paste this at the very bottom of SportsScoresEngine.gs AFTER the v9 raw paste patch.

 Fix:
 - v9 could accidentally detect the instruction row (row 4) as the ESPN table header.
 - v10 only looks for the real pasted table starting at row 5 (A5).
 - Adds a direct test function that should insert/update two supplemental rows.
************************************/

function sportsRacingRawPasteFindHeaderV9_(data, requestedType) {

  requestedType =
    sportsRacingRawPasteStringV9_(requestedType || "auto")
      .toLowerCase();

  data =
    Array.isArray(data)
      ? data
      : [];

  // IMPORTANT:
  // Row 4 contains instructions that include words like POS / DRIVER / RESULTS.
  // The actual ESPN pasted table must start at row 5, which is zero-based index 4.
  for (let r = 4; r < data.length; r++) {

    const cells =
      (data[r] || [])
        .map(function(value) {
          return sportsRacingRawPasteStringV9_(value);
        });

    const normalized =
      cells.map(function(value) {
        return sportsRacingRawPasteKeyV9_(value);
      });

    const hasExactPos =
      normalized.indexOf("pos") !== -1 ||
      normalized.indexOf("position") !== -1 ||
      normalized.indexOf("finish") !== -1;

    const hasExactDriver =
      normalized.indexOf("driver") !== -1 ||
      normalized.indexOf("racer") !== -1 ||
      normalized.indexOf("name") !== -1;

    if (!hasExactPos || !hasExactDriver) {
      continue;
    }

    const looksResults =
      normalized.indexOf("laps") !== -1 ||
      normalized.indexOf("led") !== -1 ||
      normalized.indexOf("pts") !== -1 ||
      normalized.indexOf("points") !== -1 ||
      normalized.indexOf("bonus") !== -1 ||
      normalized.indexOf("penalty") !== -1;

    const looksGrid =
      normalized.indexOf("manufacturer") !== -1 ||
      normalized.indexOf("mfr") !== -1 ||
      normalized.indexOf("speed") !== -1;

    if (requestedType === "results" && looksResults) {
      return {
        rowIndex: r,
        type: "results"
      };
    }

    if (requestedType === "grid" && looksGrid) {
      return {
        rowIndex: r,
        type: "grid"
      };
    }

    if (requestedType === "auto" || !requestedType) {
      return {
        rowIndex: r,
        type: looksResults ? "results" : "grid"
      };
    }
  }

  return null;

}

function sportsRacingRawPasteParseTableV9_(data, requestedType) {

  requestedType =
    sportsRacingRawPasteStringV9_(requestedType || "auto")
      .toLowerCase();

  const details = {
    requestedType: requestedType,
    headerRowIndex: -1,
    detectedType: "",
    directRows: 0,
    fallbackRows: 0,
    fixVersion: "v10_header_fix"
  };

  const detected =
    sportsRacingRawPasteFindHeaderV9_(data, requestedType);

  let rows = [];
  let importType = requestedType;

  if (detected) {
    // Return user-facing 1-based row number.
    details.headerRowIndex = detected.rowIndex + 1;
    details.detectedType = detected.type;

    importType =
      requestedType === "auto" || !requestedType
        ? detected.type
        : requestedType;

    rows =
      importType === "results"
        ? sportsRacingRawPasteParseResultsRowsV9_(data, detected.rowIndex)
        : sportsRacingRawPasteParseGridRowsV9_(data, detected.rowIndex);

    details.directRows = rows.length;
  }

  // Only use fallback when no real pasted header was found.
  // This prevents the row-4 instruction text from forcing a wrong fallback type.
  if (!rows.length && !detected) {
    const text =
      sportsRacingRawPasteAllTextFromPasteAreaV10_(data);

    if (requestedType === "results" || sportsRacingRawPasteLooksLikeResultsV9_(text)) {
      importType = "results";
      rows =
        typeof parseESPNRacingResultsPage_ === "function"
          ? parseESPNRacingResultsPage_(text)
          : [];
    } else {
      importType = "grid";
      rows =
        typeof parseESPNRacingGridPage_ === "function"
          ? parseESPNRacingGridPage_(text)
          : [];
    }

    details.fallbackRows = rows.length;
  }

  rows =
    rows.map(function(row) {
      row.Source =
        importType === "results"
          ? "raw_paste_results"
          : "raw_paste_grid";

      return row;
    });

  return {
    importType: importType === "auto" ? "grid" : importType,
    rows: rows,
    details: details
  };

}

function sportsRacingRawPasteAllTextFromPasteAreaV10_(data) {

  const parts = [];

  data =
    Array.isArray(data)
      ? data
      : [];

  // Only rows 5 and lower. Do not include metadata or instruction rows.
  for (let r = 4; r < data.length; r++) {
    (data[r] || []).forEach(function(cell) {
      const value = sportsRacingRawPasteStringV9_(cell);
      if (value) {
        parts.push(value);
      }
    });
  }

  return parts.join(" ");

}

function sportsRacingRawPasteParseGridRowsV9_(data, headerRowIndex) {

  const headers =
    (data[headerRowIndex] || [])
      .map(function(value) {
        return sportsRacingRawPasteKeyV9_(value);
      });

  const index =
    sportsRacingRawPasteHeaderIndexV9_(headers);

  if (index.pos < 0 || index.driver < 0) {
    return [];
  }

  const rows = [];

  for (let r = headerRowIndex + 1; r < data.length; r++) {
    const row = data[r] || [];

    const pos =
      sportsRacingSupplementalNumberOrBlank_(
        row[index.pos]
      );

    const driverName =
      sportsRacingRawPasteStringV9_(
        row[index.driver]
      );

    if (pos === "" || !driverName) {
      continue;
    }

    rows.push({
      StartingPosition: pos,
      DriverName: driverName,
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
      Source: "raw_paste_grid",
      RawCells: row
    });
  }

  return rows;

}

function sportsRacingRawPasteParseResultsRowsV9_(data, headerRowIndex) {

  const headers =
    (data[headerRowIndex] || [])
      .map(function(value) {
        return sportsRacingRawPasteKeyV9_(value);
      });

  const index =
    sportsRacingRawPasteHeaderIndexV9_(headers);

  if (index.pos < 0 || index.driver < 0) {
    return [];
  }

  const rows = [];

  for (let r = headerRowIndex + 1; r < data.length; r++) {
    const row = data[r] || [];

    const pos =
      sportsRacingSupplementalNumberOrBlank_(
        row[index.pos]
      );

    const driverName =
      sportsRacingRawPasteStringV9_(
        row[index.driver]
      );

    if (pos === "" || !driverName) {
      continue;
    }

    rows.push({
      FinalPosition: pos,
      DriverName: driverName,
      CarNumber:
        index.car >= 0
          ? sportsRacingRawPasteStringV9_(row[index.car])
          : "",
      Manufacturer:
        index.manufacturer >= 0
          ? sportsRacingRawPasteStringV9_(row[index.manufacturer])
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
      Winner: Number(pos) === 1,
      Source: "raw_paste_results",
      RawCells: row
    });
  }

  return rows;

}

function testOption1RawPasteGridImportNowV10() {

  setupSportsRacingOption1RawPasteSystem();

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName("SportsRacingRawPaste");

  if (!sh) {
    throw new Error("SportsRacingRawPaste sheet not found");
  }

  sh
    .getRange(2, 1, 1, 8)
    .setValues([[
      "grid",
      "nascar-premier",
      "202606214266",
      "nascar-premier_202606214266",
      "NASCAR Cup Series at San Diego",
      "",
      "sprint",
      "Test grid import v10"
    ]]);

  const lastRow =
    Math.max(sh.getLastRow(), 20);

  const lastCol =
    Math.max(sh.getLastColumn(), 10);

  sh
    .getRange(5, 1, lastRow - 4, lastCol)
    .clearContent();

  sh
    .getRange(5, 1, 3, 5)
    .setValues([
      [
        "POS",
        "DRIVER",
        "MANUFACTURER",
        "CAR",
        "SPEED"
      ],
      [
        1,
        "Shane van Gisbergen",
        "Chevrolet",
        97,
        "90.809 mph"
      ],
      [
        13,
        "Corey Heim",
        "Toyota",
        67,
        "89.785 mph"
      ]
    ]);

  SpreadsheetApp.flush();

  const result =
    importSportsRacingRawPasteSupplemental();

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;

}