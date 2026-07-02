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
 v11 module source: v7_supplemental
************************************************************/

/************************************
 PATCH v7 - RACING SUPPLEMENTAL ESPN PAGE IMPORTS
 Adds separate supplemental/import/link sheets for richer racing data.
 Keeps SportsRacingResults as the honest ESPN scoreboard baseline.

 New sheets:
 - SportsRacingSourceLinks
 - SportsRacingSupplemental
 - SportsRacingManualImport

 Main functions to run:
 - setupSportsRacingSupplementalSystem
 - buildESPNRacingSourceLinksFromResults
 - importESPNRacingSupplemental
 - importSportsRacingManualSupplemental
************************************/

const SPORTS_RACING_SOURCE_LINKS_SHEET =
  "SportsRacingSourceLinks";

const SPORTS_RACING_SUPPLEMENTAL_SHEET =
  "SportsRacingSupplemental";

const SPORTS_RACING_MANUAL_IMPORT_SHEET =
  "SportsRacingManualImport";

const SPORTS_RACING_SOURCE_LINKS_HEADERS = [
  "SourceLinkId",
  "Timestamp",
  "League",
  "GameId",
  "ESPNEventId",
  "RaceName",
  "RaceDateTime",
  "Series",
  "GridUrl",
  "ResultsUrl",
  "Enabled",
  "LastImportedAt",
  "LastImportStatus",
  "LastImportMessage",
  "UpdatedAt"
];

const SPORTS_RACING_SUPPLEMENTAL_HEADERS = [
  "SupplementalId",
  "Timestamp",
  "GameId",
  "ESPNEventId",
  "League",
  "RaceName",
  "RaceDateTime",
  "DriverId",
  "DriverName",
  "Source",
  "SourceRaceId",
  "SourceDriverId",
  "Team",
  "CarNumber",
  "Manufacturer",
  "Sponsor",
  "StartingPosition",
  "StartingPositionSource",
  "QualifyingPosition",
  "QualifyingSpeed",
  "FinalPosition",
  "FinalPositionSource",
  "CurrentPosition",
  "CurrentPositionSource",
  "Laps",
  "LapsLed",
  "Points",
  "Bonus",
  "Penalty",
  "StageWins",
  "DNFStatus",
  "Winner",
  "Notes",
  "RawSourceJSON",
  "UpdatedAt"
];

const SPORTS_RACING_MANUAL_IMPORT_HEADERS = [
  "League",
  "ESPNEventId",
  "GameId",
  "RaceName",
  "RaceDateTime",
  "DriverName",
  "Team",
  "CarNumber",
  "Manufacturer",
  "Sponsor",
  "StartingPosition",
  "QualifyingPosition",
  "QualifyingSpeed",
  "FinalPosition",
  "Laps",
  "LapsLed",
  "Points",
  "Bonus",
  "Penalty",
  "StageWins",
  "DNFStatus",
  "Winner",
  "Notes"
];

function sportsRacingSupplementalString_(value) {

  return String(value || "")
    .trim();

}

function sportsRacingSupplementalKey_(value) {

  return sportsRacingSupplementalString_(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

function sportsRacingSupplementalSlug_(value) {

  return sportsRacingSupplementalKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}

function sportsRacingSupplementalNumberOrBlank_(value) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const cleaned =
    String(value)
      .replace(/,/g, "")
      .trim();

  const n =
    Number(cleaned);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return value;
  }

  return n;

}

function sportsRacingSupplementalBoolean_(value, fallback) {

  if (
    value === true ||
    value === false
  ) {
    return value;
  }

  const raw =
    sportsRacingSupplementalString_(value)
      .toLowerCase();

  if (
    raw === "true" ||
    raw === "yes" ||
    raw === "1" ||
    raw === "winner" ||
    raw === "y"
  ) {
    return true;
  }

  if (
    raw === "false" ||
    raw === "no" ||
    raw === "0" ||
    raw === "n"
  ) {
    return false;
  }

  return fallback;

}

function sportsRacingEnsureSheetHeadersV7_(
  sheetName,
  requiredHeaders
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

  const lastRow =
    sh.getLastRow();

  const lastColumn =
    sh.getLastColumn();

  let existingHeaders = [];

  if (lastRow >= 1 && lastColumn >= 1) {
    existingHeaders =
      sh
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0]
        .map(function(header) {
          return sportsRacingSupplementalString_(header);
        });
  }

  const hasAnyHeader =
    existingHeaders.some(function(header) {
      return !!header;
    });

  if (!hasAnyHeader) {

    sh
      .getRange(
        1,
        1,
        1,
        requiredHeaders.length
      )
      .setValues([
        requiredHeaders
      ]);

    try {
      sh.setFrozenRows(1);
    } catch (err) {
      // Formatting is non-critical.
    }

    SpreadsheetApp.flush();

    return {
      sheet: sh,
      added: requiredHeaders.slice()
    };

  }

  const missing =
    requiredHeaders.filter(function(header) {
      return existingHeaders.indexOf(header) === -1;
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

  try {
    sh.setFrozenRows(1);
  } catch (err2) {
    // Formatting is non-critical.
  }

  SpreadsheetApp.flush();

  return {
    sheet: sh,
    added: missing
  };

}

function setupSportsRacingSupplementalSystem() {

  const sourceLinks =
    sportsRacingEnsureSheetHeadersV7_(
      SPORTS_RACING_SOURCE_LINKS_SHEET,
      SPORTS_RACING_SOURCE_LINKS_HEADERS
    );

  const supplemental =
    sportsRacingEnsureSheetHeadersV7_(
      SPORTS_RACING_SUPPLEMENTAL_SHEET,
      SPORTS_RACING_SUPPLEMENTAL_HEADERS
    );

  const manualImport =
    sportsRacingEnsureSheetHeadersV7_(
      SPORTS_RACING_MANUAL_IMPORT_SHEET,
      SPORTS_RACING_MANUAL_IMPORT_HEADERS
    );

  if (typeof setupSportsRacingResultsSystem === "function") {
    setupSportsRacingResultsSystem();
  }

  return {
    success: true,
    sheets: {
      sourceLinks: SPORTS_RACING_SOURCE_LINKS_SHEET,
      supplemental: SPORTS_RACING_SUPPLEMENTAL_SHEET,
      manualImport: SPORTS_RACING_MANUAL_IMPORT_SHEET,
      racingResults:
        typeof SPORTS_RACING_RESULTS_SHEET !== "undefined"
          ? SPORTS_RACING_RESULTS_SHEET
          : "SportsRacingResults"
    },
    added: {
      sourceLinks: sourceLinks.added || [],
      supplemental: supplemental.added || [],
      manualImport: manualImport.added || []
    }
  };

}

function sportsRacingSourceLinksGetSheet_() {

  return sportsRacingEnsureSheetHeadersV7_(
    SPORTS_RACING_SOURCE_LINKS_SHEET,
    SPORTS_RACING_SOURCE_LINKS_HEADERS
  ).sheet;

}

function sportsRacingSupplementalGetSheet_() {

  return sportsRacingEnsureSheetHeadersV7_(
    SPORTS_RACING_SUPPLEMENTAL_SHEET,
    SPORTS_RACING_SUPPLEMENTAL_HEADERS
  ).sheet;

}

function sportsRacingManualImportGetSheet_() {

  return sportsRacingEnsureSheetHeadersV7_(
    SPORTS_RACING_MANUAL_IMPORT_SHEET,
    SPORTS_RACING_MANUAL_IMPORT_HEADERS
  ).sheet;

}

function sportsRacingRowObjectV7_(headers, row) {

  const obj = {};

  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });

  return obj;

}

function sportsRacingReadSheetObjectsV7_(sheetName, headers) {

  const setup =
    sportsRacingEnsureSheetHeadersV7_(
      sheetName,
      headers
    );

  const sh =
    setup.sheet;

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const actualHeaders =
    data[0].map(function(header) {
      return sportsRacingSupplementalString_(header);
    });

  return data
    .slice(1)
    .map(function(row, index) {
      const obj =
        sportsRacingRowObjectV7_(
          actualHeaders,
          row
        );

      obj._rowNumber =
        index + 2;

      return obj;
    });

}

function sportsRacingESPNSeriesForLeague_(league) {

  const key =
    sportsRacingSupplementalKey_(league)
      .replace(/ /g, "-");

  const map = {
    "nascar-premier": "sprint",
    "nascar-cup": "sprint",
    "sprint": "sprint",
    "cup": "sprint",
    "nascar-secondary": "nationwide",
    "nascar-xfinity": "nationwide",
    "xfinity": "nationwide",
    "nationwide": "nationwide",
    "nascar-truck": "truck",
    "truck": "truck",
    "nascar-trucks": "truck",
    "f1": "f1",
    "formula-1": "f1"
  };

  return map[key] || key;

}

function sportsRacingESPNGridUrl_(series, raceId) {

  return (
    "https://www.espn.com/racing/grid?series=" +
    encodeURIComponent(series) +
    "&raceId=" +
    encodeURIComponent(raceId)
  );

}

function sportsRacingESPNResultsUrl_(series, raceId) {

  return (
    "https://www.espn.com/racing/raceresults?series=" +
    encodeURIComponent(series) +
    "&raceId=" +
    encodeURIComponent(raceId)
  );

}

function buildESPNRacingSourceLinksFromResults() {

  setupSportsRacingSupplementalSystem();

  const racingRows =
    typeof readSportsRacingResultRows_ === "function"
      ? readSportsRacingResultRows_()
      : [];

  const sh =
    sportsRacingSourceLinksGetSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsRacingSupplementalString_(header);
    });

  const col =
    getSportsHeaderMap_(headers);

  const existing = {};

  for (let i = 1; i < data.length; i++) {
    const gameId =
      sportsRacingSupplementalString_(
        data[i][col.GameId]
      );

    if (gameId) {
      existing[gameId] = i + 1;
    }
  }

  const racesByGameId = {};

  racingRows.forEach(function(row) {

    const gameId =
      sportsRacingSupplementalString_(
        row.GameId
      );

    if (!gameId || racesByGameId[gameId]) {
      return;
    }

    const league =
      sportsRacingSupplementalString_(
        row.League
      );

    const espnEventId =
      sportsRacingSupplementalString_(
        row.ESPNEventId
      );

    if (!league || !espnEventId) {
      return;
    }

    const series =
      sportsRacingESPNSeriesForLeague_(
        league
      );

    racesByGameId[gameId] = {
      SourceLinkId: gameId,
      Timestamp: new Date(),
      League: league,
      GameId: gameId,
      ESPNEventId: espnEventId,
      RaceName:
        sportsRacingSupplementalString_(row.RaceName),
      RaceDateTime:
        sportsRacingSupplementalString_(row.RaceDateTime),
      Series: series,
      GridUrl:
        sportsRacingESPNGridUrl_(
          series,
          espnEventId
        ),
      ResultsUrl:
        sportsRacingESPNResultsUrl_(
          series,
          espnEventId
        ),
      Enabled: true,
      LastImportedAt: "",
      LastImportStatus: "NEW",
      LastImportMessage: "Auto-created from SportsRacingResults",
      UpdatedAt: new Date()
    };

  });

  const rowsToAppend = [];
  let updated = 0;
  let inserted = 0;

  Object.keys(racesByGameId).forEach(function(gameId) {

    const item =
      racesByGameId[gameId];

    if (existing[gameId]) {

      const rowNumber =
        existing[gameId];

      [
        "League",
        "ESPNEventId",
        "RaceName",
        "RaceDateTime",
        "Series",
        "GridUrl",
        "ResultsUrl",
        "Enabled",
        "UpdatedAt"
      ].forEach(function(header) {
        if (col[header] === undefined) {
          return;
        }

        sh
          .getRange(
            rowNumber,
            col[header] + 1
          )
          .setValue(
            item[header]
          );
      });

      updated++;

    } else {

      rowsToAppend.push(
        headers.map(function(header) {
          return item[header] !== undefined
            ? item[header]
            : "";
        })
      );

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
      .setValues(
        rowsToAppend
      );
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    racesFound: Object.keys(racesByGameId).length,
    inserted: inserted,
    updated: updated,
    sheet: SPORTS_RACING_SOURCE_LINKS_SHEET
  };

}

function sportsRacingFetchESPNPage_(url) {

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: "get",
        muteHttpExceptions: true,
        followRedirects: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language":
            "en-US,en;q=0.9"
        }
      }
    );

  const code =
    response.getResponseCode();

  const html =
    response.getContentText();

  return {
    code: code,
    url: url,
    html: html,
    blocked:
      sportsRacingESPNPageBlocked_(html, code)
  };

}

function sportsRacingESPNPageBlocked_(html, code) {

  html =
    String(html || "");

  if (code < 200 || code >= 300) {
    return true;
  }

  const lowered =
    html.toLowerCase();

  return (
    lowered.indexOf("verify you") !== -1 ||
    lowered.indexOf("not a robot") !== -1 ||
    lowered.indexOf("captcha") !== -1 ||
    lowered.indexOf("access denied") !== -1 ||
    lowered.indexOf("javascript is disabled") !== -1
  );

}

function sportsRacingHtmlEntityDecode_(value) {

  value =
    String(value || "");

  const map = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " "
  };

  Object.keys(map).forEach(function(key) {
    value =
      value.split(key)
        .join(map[key]);
  });

  value =
    value.replace(/&#(\d+);/g, function(match, code) {
      return String.fromCharCode(
        Number(code)
      );
    });

  return value;

}

function sportsRacingCleanHtmlCell_(value) {

  value =
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, " $1 ")
      .replace(/<[^>]+>/g, " ");

  value =
    sportsRacingHtmlEntityDecode_(value);

  return value
    .replace(/\s+/g, " ")
    .trim();

}

function sportsRacingExtractTableRows_(html) {

  const rows = [];

  html =
    String(html || "");

  const trRegex =
    /<tr[\s\S]*?<\/tr>/gi;

  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {

    const tr =
      trMatch[0];

    const cells = [];

    const cellRegex =
      /<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi;

    let cellMatch;

    while ((cellMatch = cellRegex.exec(tr)) !== null) {
      const cleaned =
        sportsRacingCleanHtmlCell_(
          cellMatch[0]
        );

      if (cleaned !== "") {
        cells.push(cleaned);
      }
    }

    if (cells.length) {
      rows.push(cells);
    }

  }

  return rows;

}

function sportsRacingPageTextLines_(html) {

  const text =
    sportsRacingCleanHtmlCell_(
      String(html || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
    );

  return text
    .split(/\n|\r/)
    .map(function(line) {
      return sportsRacingSupplementalString_(line);
    })
    .filter(Boolean);

}


/* Removed older duplicate function during v11 cleanup. */

function sportsRacingParseGridFromTextFallback_(html) {

  const lines =
    sportsRacingPageTextLines_(html);

  const manufacturers = [
    "Chevrolet",
    "Ford",
    "Toyota",
    "Honda",
    "Mercedes",
    "Ferrari",
    "Red Bull",
    "McLaren",
    "Aston Martin",
    "Alpine",
    "Williams",
    "Haas",
    "Sauber",
    "RB"
  ];

  const results = [];

  lines.forEach(function(line) {

    const match =
      line.match(/^(\d+)\s+(.+?)\s+(Chevrolet|Ford|Toyota|Honda|Mercedes|Ferrari|Red Bull|McLaren|Aston Martin|Alpine|Williams|Haas|Sauber|RB)\s+([A-Za-z0-9\-]*)\s*([0-9.]+\s*mph|[0-9.]+)?$/i);

    if (!match) {
      return;
    }

    results.push({
      StartingPosition:
        sportsRacingSupplementalNumberOrBlank_(match[1]),
      DriverName:
        sportsRacingSupplementalString_(match[2]),
      Manufacturer:
        sportsRacingSupplementalString_(match[3]),
      CarNumber:
        sportsRacingSupplementalString_(match[4]),
      QualifyingSpeed:
        sportsRacingSupplementalString_(match[5]),
      Source:
        "espn_grid_page_text_fallback",
      RawCells:
        [line]
    });

  });

  return results;

}


/* Removed older duplicate function during v11 cleanup. */

function sportsRacingParseResultsFromTextFallback_(html) {

  const lines =
    sportsRacingPageTextLines_(html);

  const results = [];

  lines.forEach(function(line) {

    const match =
      line.match(/^(\d+)\s+(.+?)\s+(\d+|[A-Za-z0-9\-]+)\s+(Chevrolet|Ford|Toyota|Honda|Mercedes|Ferrari|Red Bull|McLaren|Aston Martin|Alpine|Williams|Haas|Sauber|RB)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/i);

    if (!match) {
      return;
    }

    const finalPosition =
      sportsRacingSupplementalNumberOrBlank_(match[1]);

    results.push({
      FinalPosition: finalPosition,
      DriverName: sportsRacingSupplementalString_(match[2]),
      CarNumber: sportsRacingSupplementalString_(match[3]),
      Manufacturer: sportsRacingSupplementalString_(match[4]),
      Laps: sportsRacingSupplementalNumberOrBlank_(match[5]),
      StartingPosition: sportsRacingSupplementalNumberOrBlank_(match[6]),
      LapsLed: sportsRacingSupplementalNumberOrBlank_(match[7]),
      Points: sportsRacingSupplementalNumberOrBlank_(match[8]),
      Bonus: sportsRacingSupplementalNumberOrBlank_(match[9]),
      Penalty: sportsRacingSupplementalNumberOrBlank_(match[10]),
      Winner: Number(finalPosition) === 1,
      Source: "espn_results_page_text_fallback",
      RawCells: [line]
    });

  });

  return results;

}

function sportsRacingSupplementalId_(
  gameId,
  driverName,
  source
) {

  return [
    sportsRacingSupplementalString_(gameId),
    sportsRacingSupplementalSlug_(driverName),
    sportsRacingSupplementalSlug_(source)
  ].join("|");

}

function sportsRacingSupplementalDriverId_(driverName) {

  return sportsRacingSupplementalSlug_(
    driverName
  );

}

function sportsRacingGridRowToSupplemental_(sourceLink, item) {

  const driverName =
    sportsRacingSupplementalString_(
      item.DriverName
    );

  return {
    SupplementalId:
      sportsRacingSupplementalId_(
        sourceLink.GameId,
        driverName,
        item.Source || "espn_grid_page"
      ),
    Timestamp:
      new Date(),
    GameId:
      sourceLink.GameId,
    ESPNEventId:
      sourceLink.ESPNEventId,
    League:
      sourceLink.League,
    RaceName:
      sourceLink.RaceName,
    RaceDateTime:
      sourceLink.RaceDateTime,
    DriverId:
      sportsRacingSupplementalDriverId_(driverName),
    DriverName:
      driverName,
    Source:
      item.Source || "espn_grid_page",
    SourceRaceId:
      sourceLink.ESPNEventId,
    SourceDriverId:
      "",
    CarNumber:
      item.CarNumber || "",
    Manufacturer:
      item.Manufacturer || "",
    StartingPosition:
      item.StartingPosition || "",
    StartingPositionSource:
      item.StartingPosition !== ""
        ? (item.Source || "espn_grid_page")
        : "",
    QualifyingPosition:
      item.StartingPosition || "",
    QualifyingSpeed:
      item.QualifyingSpeed || "",
    Notes:
      "Imported from ESPN racing grid page",
    RawSourceJSON:
      JSON.stringify(item || {}),
    UpdatedAt:
      new Date()
  };

}

function sportsRacingResultsRowToSupplemental_(sourceLink, item) {

  const driverName =
    sportsRacingSupplementalString_(
      item.DriverName
    );

  return {
    SupplementalId:
      sportsRacingSupplementalId_(
        sourceLink.GameId,
        driverName,
        item.Source || "espn_results_page"
      ),
    Timestamp:
      new Date(),
    GameId:
      sourceLink.GameId,
    ESPNEventId:
      sourceLink.ESPNEventId,
    League:
      sourceLink.League,
    RaceName:
      sourceLink.RaceName,
    RaceDateTime:
      sourceLink.RaceDateTime,
    DriverId:
      sportsRacingSupplementalDriverId_(driverName),
    DriverName:
      driverName,
    Source:
      item.Source || "espn_results_page",
    SourceRaceId:
      sourceLink.ESPNEventId,
    SourceDriverId:
      "",
    CarNumber:
      item.CarNumber || "",
    Manufacturer:
      item.Manufacturer || "",
    StartingPosition:
      item.StartingPosition || "",
    StartingPositionSource:
      item.StartingPosition !== ""
        ? (item.Source || "espn_results_page")
        : "",
    FinalPosition:
      item.FinalPosition || "",
    FinalPositionSource:
      item.FinalPosition !== ""
        ? (item.Source || "espn_results_page")
        : "",
    CurrentPosition:
      item.FinalPosition || "",
    CurrentPositionSource:
      item.FinalPosition !== ""
        ? (item.Source || "espn_results_page")
        : "",
    Laps:
      item.Laps || "",
    LapsLed:
      item.LapsLed || "",
    Points:
      item.Points || "",
    Bonus:
      item.Bonus || "",
    Penalty:
      item.Penalty || "",
    Winner:
      item.Winner === true,
    Notes:
      "Imported from ESPN racing results page",
    RawSourceJSON:
      JSON.stringify(item || {}),
    UpdatedAt:
      new Date()
  };

}

function upsertSportsRacingSupplementalRows_(rows) {

  setupSportsRacingSupplementalSystem();

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  rows =
    rows.filter(function(row) {
      return !!(
        row &&
        row.SupplementalId &&
        row.DriverName
      );
    });

  if (!rows.length) {
    return {
      inserted: 0,
      updated: 0
    };
  }

  const sh =
    sportsRacingSupplementalGetSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsRacingSupplementalString_(header);
    });

  const col =
    getSportsHeaderMap_(headers);

  const existing = {};

  for (let i = 1; i < data.length; i++) {
    const id =
      sportsRacingSupplementalString_(
        data[i][col.SupplementalId]
      );

    if (id) {
      existing[id] = i + 1;
    }
  }

  const rowsToAppend = [];
  let updated = 0;
  let inserted = 0;

  rows.forEach(function(item) {

    const row =
      headers.map(function(header) {
        return item[header] !== undefined
          ? item[header]
          : "";
      });

    if (existing[item.SupplementalId]) {

      sh
        .getRange(
          existing[item.SupplementalId],
          1,
          1,
          headers.length
        )
        .setValues([
          row
        ]);

      updated++;

    } else {

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
    updated: updated
  };

}

function readSportsRacingSupplementalRows_() {

  return sportsRacingReadSheetObjectsV7_(
    SPORTS_RACING_SUPPLEMENTAL_SHEET,
    SPORTS_RACING_SUPPLEMENTAL_HEADERS
  ).filter(function(row) {
    return !!row.SupplementalId;
  });

}

function readSportsRacingSourceLinkRows_() {

  return sportsRacingReadSheetObjectsV7_(
    SPORTS_RACING_SOURCE_LINKS_SHEET,
    SPORTS_RACING_SOURCE_LINKS_HEADERS
  ).filter(function(row) {
    return !!row.SourceLinkId || !!row.GameId;
  });

}

function updateSportsRacingSourceLinkStatus_(
  rowNumber,
  status,
  message
) {

  const sh =
    sportsRacingSourceLinksGetSheet_();

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
        return sportsRacingSupplementalString_(header);
      });

  const col =
    getSportsHeaderMap_(headers);

  const patch = {
    LastImportedAt: new Date(),
    LastImportStatus: status,
    LastImportMessage: message,
    UpdatedAt: new Date()
  };

  Object.keys(patch).forEach(function(header) {
    if (col[header] === undefined) {
      return;
    }

    sh
      .getRange(
        rowNumber,
        col[header] + 1
      )
      .setValue(
        patch[header]
      );
  });

}


/* Removed older duplicate function during v11 cleanup. */

function importSportsRacingManualSupplemental() {

  setupSportsRacingSupplementalSystem();

  const rows =
    sportsRacingReadSheetObjectsV7_(
      SPORTS_RACING_MANUAL_IMPORT_SHEET,
      SPORTS_RACING_MANUAL_IMPORT_HEADERS
    );

  const supplementalRows = [];

  rows.forEach(function(row) {

    const driverName =
      sportsRacingSupplementalString_(
        row.DriverName
      );

    const gameId =
      sportsRacingSupplementalString_(
        row.GameId
      );

    const espnEventId =
      sportsRacingSupplementalString_(
        row.ESPNEventId
      );

    const raceName =
      sportsRacingSupplementalString_(
        row.RaceName
      );

    if (!driverName) {
      return;
    }

    if (!gameId && !espnEventId && !raceName) {
      return;
    }

    const source =
      "manual_import";

    supplementalRows.push({
      SupplementalId:
        sportsRacingSupplementalId_(
          gameId || espnEventId || raceName,
          driverName,
          source
        ),
      Timestamp: new Date(),
      GameId: gameId,
      ESPNEventId: espnEventId,
      League: sportsRacingSupplementalString_(row.League),
      RaceName: raceName,
      RaceDateTime: sportsRacingSupplementalString_(row.RaceDateTime),
      DriverId: sportsRacingSupplementalDriverId_(driverName),
      DriverName: driverName,
      Source: source,
      SourceRaceId: espnEventId || gameId,
      SourceDriverId: "",
      Team: sportsRacingSupplementalString_(row.Team),
      CarNumber: sportsRacingSupplementalString_(row.CarNumber),
      Manufacturer: sportsRacingSupplementalString_(row.Manufacturer),
      Sponsor: sportsRacingSupplementalString_(row.Sponsor),
      StartingPosition: sportsRacingSupplementalNumberOrBlank_(row.StartingPosition),
      StartingPositionSource:
        row.StartingPosition !== ""
          ? source
          : "",
      QualifyingPosition: sportsRacingSupplementalNumberOrBlank_(row.QualifyingPosition),
      QualifyingSpeed: sportsRacingSupplementalString_(row.QualifyingSpeed),
      FinalPosition: sportsRacingSupplementalNumberOrBlank_(row.FinalPosition),
      FinalPositionSource:
        row.FinalPosition !== ""
          ? source
          : "",
      CurrentPosition: sportsRacingSupplementalNumberOrBlank_(row.FinalPosition),
      CurrentPositionSource:
        row.FinalPosition !== ""
          ? source
          : "",
      Laps: sportsRacingSupplementalNumberOrBlank_(row.Laps),
      LapsLed: sportsRacingSupplementalNumberOrBlank_(row.LapsLed),
      Points: sportsRacingSupplementalNumberOrBlank_(row.Points),
      Bonus: sportsRacingSupplementalNumberOrBlank_(row.Bonus),
      Penalty: sportsRacingSupplementalNumberOrBlank_(row.Penalty),
      StageWins: sportsRacingSupplementalNumberOrBlank_(row.StageWins),
      DNFStatus: sportsRacingSupplementalString_(row.DNFStatus),
      Winner: sportsRacingSupplementalBoolean_(row.Winner, false),
      Notes: sportsRacingSupplementalString_(row.Notes),
      RawSourceJSON: JSON.stringify(row || {}),
      UpdatedAt: new Date()
    });

  });

  const writeResult =
    upsertSportsRacingSupplementalRows_(
      supplementalRows
    );

  return {
    success: true,
    rowsRead: rows.length,
    rowsPrepared: supplementalRows.length,
    inserted: writeResult.inserted,
    updated: writeResult.updated,
    sheet: SPORTS_RACING_SUPPLEMENTAL_SHEET
  };

}

function sportsRacingBestSupplementalRowsByDriver_() {

  const supplemental =
    readSportsRacingSupplementalRows_();

  const priority = {
    manual_import: 100,
    espn_results_page: 80,
    espn_results_page_text_fallback: 75,
    espn_grid_page: 60,
    espn_grid_page_text_fallback: 55
  };

  const byKey = {};

  supplemental.forEach(function(row) {

    const gameKey =
      sportsRacingSupplementalString_(row.GameId) ||
      sportsRacingSupplementalString_(row.ESPNEventId) ||
      sportsRacingSupplementalString_(row.RaceName);

    const driverKey =
      sportsRacingSupplementalKey_(
        row.DriverName
      );

    if (!gameKey || !driverKey) {
      return;
    }

    const key =
      gameKey + "|" + driverKey;

    if (!byKey[key]) {
      byKey[key] = [];
    }

    byKey[key].push(row);

  });

  Object.keys(byKey).forEach(function(key) {
    byKey[key].sort(function(a, b) {
      const ap =
        priority[
          sportsRacingSupplementalString_(a.Source)
        ] || 0;

      const bp =
        priority[
          sportsRacingSupplementalString_(b.Source)
        ] || 0;

      return bp - ap;
    });
  });

  return byKey;

}

function sportsRacingPickSupplementalValue_(
  candidates,
  field
) {

  for (let i = 0; i < candidates.length; i++) {
    const value =
      candidates[i][field];

    if (
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      return {
        value: value,
        source: candidates[i].Source || "supplemental"
      };
    }
  }

  return {
    value: "",
    source: ""
  };

}

function mergeSportsRacingSupplementalRows_(baseRows) {

  baseRows =
    Array.isArray(baseRows)
      ? baseRows
      : [];

  const supplementalByKey =
    sportsRacingBestSupplementalRowsByDriver_();

  const fillFields = [
    "Team",
    "CarNumber",
    "Manufacturer",
    "Sponsor",
    "StartingPosition",
    "QualifyingPosition",
    "QualifyingSpeed",
    "Laps",
    "LapsLed",
    "Points",
    "Bonus",
    "Penalty",
    "StageWins",
    "DNFStatus"
  ];

  return baseRows.map(function(base) {

    const merged =
      Object.assign({}, base);

    const gameKeys = [
      sportsRacingSupplementalString_(base.GameId),
      sportsRacingSupplementalString_(base.ESPNEventId),
      sportsRacingSupplementalString_(base.RaceName)
    ].filter(Boolean);

    const driverKey =
      sportsRacingSupplementalKey_(
        base.DriverName
      );

    let candidates = [];

    gameKeys.forEach(function(gameKey) {
      const key =
        gameKey + "|" + driverKey;

      if (supplementalByKey[key]) {
        candidates =
          candidates.concat(
            supplementalByKey[key]
          );
      }
    });

    if (!candidates.length) {
      merged.SupplementalSource = "";
      merged.SupplementalMatched = false;
      return merged;
    }

    const sources = {};

    candidates.forEach(function(item) {
      if (item.Source) {
        sources[item.Source] = true;
      }
    });

    fillFields.forEach(function(field) {

      const picked =
        sportsRacingPickSupplementalValue_(
          candidates,
          field
        );

      if (picked.value === "") {
        return;
      }

      if (
        merged[field] === "" ||
        merged[field] === null ||
        merged[field] === undefined
      ) {
        merged[field] = picked.value;
        merged[field + "Source"] = picked.source;
      } else if (
        String(merged[field]) !== String(picked.value)
      ) {
        merged["Supplemental" + field] = picked.value;
        merged["Supplemental" + field + "Source"] = picked.source;
      }

    });

    const finalPicked =
      sportsRacingPickSupplementalValue_(
        candidates,
        "FinalPosition"
      );

    if (finalPicked.value !== "") {
      if (
        merged.FinalPosition === "" ||
        merged.FinalPosition === null ||
        merged.FinalPosition === undefined
      ) {
        merged.FinalPosition = finalPicked.value;
        merged.FinalPositionSource = finalPicked.source;
      } else if (
        String(merged.FinalPosition) !== String(finalPicked.value)
      ) {
        merged.SupplementalFinalPosition = finalPicked.value;
        merged.SupplementalFinalPositionSource = finalPicked.source;

        merged.DataQualityNotes =
          sportsRacingSupplementalString_(merged.DataQualityNotes) +
          " | Supplemental final position differs from ESPN baseline: " +
          finalPicked.value +
          " from " +
          finalPicked.source;
      }
    }

    const winnerPicked =
      sportsRacingPickSupplementalValue_(
        candidates,
        "Winner"
      );

    if (winnerPicked.value !== "") {
      if (
        merged.Winner === "" ||
        merged.Winner === null ||
        merged.Winner === undefined
      ) {
        merged.Winner = winnerPicked.value;
        merged.WinnerSource = winnerPicked.source;
      }
    }

    merged.SupplementalMatched = true;
    merged.SupplementalSource =
      Object.keys(sources).join(",");

    return merged;

  });

}

/************************************
 API OVERRIDE
 Keeps the same action/getSportsRacingResults behavior,
 but now returns ESPN baseline merged with supplemental data.
************************************/

function apiGetSportsRacingResults_(params) {

  params =
    params || {};

  const league =
    String(params.league || "")
      .trim()
      .toLowerCase();

  const espnEventId =
    String(
      params.espnEventId ||
      params.ESPNEventId ||
      ""
    ).trim();

  const gameId =
    String(params.gameId || "")
      .trim();

  const includeSupplemental =
    String(params.includeSupplemental || "true")
      .trim()
      .toLowerCase() !== "false";

  let rows =
    readSportsRacingResultRows_()
      .filter(function(row) {

        if (
          league &&
          String(row.League || "")
            .trim()
            .toLowerCase() !== league
        ) {
          return false;
        }

        if (
          espnEventId &&
          String(row.ESPNEventId || "")
            .trim() !== espnEventId
        ) {
          return false;
        }

        if (
          gameId &&
          String(row.GameId || "")
            .trim() !== gameId
        ) {
          return false;
        }

        return true;

      });

  if (includeSupplemental) {
    rows =
      mergeSportsRacingSupplementalRows_(
        rows
      );
  }

  // v12: after supplemental merge, fill reusable driver/car/images
  // from SportsRacingDrivers and SportsRacingRaceEntries when available.
  if (
    typeof sportsRacingMergeDriverDatabaseRows_ === "function" &&
    String(params.includeDriverDatabase || "true")
      .trim()
      .toLowerCase() !== "false"
  ) {
    rows =
      sportsRacingMergeDriverDatabaseRows_(
        rows
      );
  }

  rows =
    rows.sort(function(a, b) {
      const ap =
        Number(
          a.CurrentPosition ||
          a.FinalPosition ||
          9999
        );

      const bp =
        Number(
          b.CurrentPosition ||
          b.FinalPosition ||
          9999
        );

      return ap - bp;
    });

  return {
    success: true,
    count: rows.length,
    supplementalMerged: includeSupplemental,
    results: rows,
    timestamp: new Date()
  };

}

function apiGetSportsRacingSupplemental_(params) {

  params =
    params || {};

  const gameId =
    sportsRacingSupplementalString_(
      params.gameId
    );

  const espnEventId =
    sportsRacingSupplementalString_(
      params.espnEventId ||
      params.ESPNEventId
    );

  const league =
    sportsRacingSupplementalKey_(
      params.league
    );

  const rows =
    readSportsRacingSupplementalRows_()
      .filter(function(row) {
        if (
          gameId &&
          sportsRacingSupplementalString_(row.GameId) !== gameId
        ) {
          return false;
        }

        if (
          espnEventId &&
          sportsRacingSupplementalString_(row.ESPNEventId) !== espnEventId
        ) {
          return false;
        }

        if (
          league &&
          sportsRacingSupplementalKey_(row.League) !== league
        ) {
          return false;
        }

        return true;
      });

  return {
    success: true,
    count: rows.length,
    supplemental: rows,
    timestamp: new Date()
  };

}


/* Removed older duplicate function during v11 cleanup. */


/************************************************************
 v11 module source: v8_parser
************************************************************/

/************************************
 PATCH v8 - ESPN RACING SUPPLEMENTAL TEXT PARSER + DIAGNOSTICS
 Fixes cases where ESPN racing grid/results pages render as page text
 instead of normal <tr>/<td> table rows.

 Main functions:
 - debugSportsRacingSupplementalStatusV8
 - testParseESPNRacingKnownPagesV8
 - repairAndImportESPNRacingSupplementalV8
 - importESPNRacingSupplemental  // override
************************************/

const SPORTS_RACING_IMPORT_LOG_SHEET_V8 =
  "SportsRacingImportLog";

const SPORTS_RACING_IMPORT_LOG_HEADERS_V8 = [
  "Timestamp",
  "Level",
  "FunctionName",
  "GameId",
  "ESPNEventId",
  "League",
  "Step",
  "Status",
  "Message",
  "Details"
];

function sportsRacingImportLogSheetV8_() {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_RACING_IMPORT_LOG_SHEET_V8
    );

  if (!sh) {
    sh =
      ss.insertSheet(
        SPORTS_RACING_IMPORT_LOG_SHEET_V8
      );
  }

  const lastRow =
    sh.getLastRow();

  const lastColumn =
    sh.getLastColumn();

  if (lastRow === 0 || lastColumn === 0) {
    sh
      .getRange(
        1,
        1,
        1,
        SPORTS_RACING_IMPORT_LOG_HEADERS_V8.length
      )
      .setValues([
        SPORTS_RACING_IMPORT_LOG_HEADERS_V8
      ]);

    try {
      sh.setFrozenRows(1);
    } catch (err) {}
  }

  return sh;

}

function sportsRacingImportLogV8_(
  level,
  functionName,
  link,
  step,
  status,
  message,
  details
) {

  try {

    link =
      link || {};

    sportsRacingImportLogSheetV8_()
      .appendRow([
        new Date(),
        level || "INFO",
        functionName || "",
        link.GameId || "",
        link.ESPNEventId || "",
        link.League || "",
        step || "",
        status || "",
        message || "",
        typeof details === "string"
          ? details
          : JSON.stringify(details || {})
      ]);

  } catch (logErr) {
    // Do not allow logging to break the import.
  }

}

function setupSportsRacingImportLogSystemV8() {

  sportsRacingImportLogSheetV8_();

  return {
    success: true,
    sheet: SPORTS_RACING_IMPORT_LOG_SHEET_V8
  };

}

function sportsRacingNormalizeESPNTextV8_(html) {

  let text =
    String(html || "");

  text =
    text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, " $1 ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ");

  text =
    sportsRacingHtmlEntityDecode_(text);

  text =
    text
      .replace(/\bImage\b/gi, " ")
      .replace(/\bChevrolet\s+Chevrolet\b/gi, "Chevrolet")
      .replace(/\bFord\s+Ford\b/gi, "Ford")
      .replace(/\bToyota\s+Toyota\b/gi, "Toyota")
      .replace(/\bHonda\s+Honda\b/gi, "Honda")
      .replace(/\s+/g, " ")
      .trim();

  return text;

}

function sportsRacingSliceAfterHeaderV8_(
  text,
  header,
  endWords
) {

  text =
    String(text || "");

  const lower =
    text.toLowerCase();

  const headerIndex =
    lower.indexOf(
      String(header || "")
        .toLowerCase()
    );

  if (headerIndex === -1) {
    return text;
  }

  let sliced =
    text.slice(
      headerIndex + String(header || "").length
    );

  endWords =
    endWords || [
      " SPORTS ",
      " Menu ",
      " ESPN.com"
    ];

  let endIndex = -1;

  endWords.forEach(function(word) {
    const idx =
      sliced
        .toLowerCase()
        .indexOf(
          String(word || "")
            .toLowerCase()
        );

    if (idx >= 0 && (endIndex === -1 || idx < endIndex)) {
      endIndex = idx;
    }
  });

  if (endIndex >= 0) {
    sliced =
      sliced.slice(0, endIndex);
  }

  return sliced.trim();

}

function sportsRacingManufacturerPatternV8_() {

  return "Chevrolet|Ford|Toyota|Honda|Mercedes|Ferrari|Red Bull|McLaren|Aston Martin|Alpine|Williams|Haas|Sauber|RB";

}

function sportsRacingCleanDriverNameV8_(name) {

  return sportsRacingSupplementalString_(name)
    .replace(/\s+/g, " ")
    .trim();

}

function parseESPNRacingGridPageV8_(html) {

  const text =
    sportsRacingNormalizeESPNTextV8_(html);

  const body =
    sportsRacingSliceAfterHeaderV8_(
      text,
      "POS DRIVER MANUFACTURER CAR SPEED"
    );

  const mfr =
    sportsRacingManufacturerPatternV8_();

  const regex =
    new RegExp(
      "(?:^|\\s)(\\d{1,2})\\s+(.+?)\\s+(" +
      mfr +
      ")\\s+(?:(\\d{1,3}|[A-Z0-9-]+)\\s+)?([0-9]+(?:\\.[0-9]+)?\\s*mph)",
      "gi"
    );

  const rows = [];
  let match;

  while ((match = regex.exec(body)) !== null) {

    const driverName =
      sportsRacingCleanDriverNameV8_(
        match[2]
      );

    if (!driverName) {
      continue;
    }

    rows.push({
      StartingPosition:
        sportsRacingSupplementalNumberOrBlank_(match[1]),
      DriverName:
        driverName,
      Manufacturer:
        sportsRacingSupplementalString_(match[3]),
      CarNumber:
        sportsRacingSupplementalString_(match[4]),
      QualifyingSpeed:
        sportsRacingSupplementalString_(match[5]),
      Source:
        "espn_grid_page_text_v8",
      RawCells:
        [match[0]]
    });

  }

  return rows;

}

function parseESPNRacingResultsPageV8_(html) {

  const text =
    sportsRacingNormalizeESPNTextV8_(html);

  const body =
    sportsRacingSliceAfterHeaderV8_(
      text,
      "POS DRIVER CAR MANUFACTURER LAPS START LED PTS BONUS PENALTY"
    );

  const mfr =
    sportsRacingManufacturerPatternV8_();

  const regex =
    new RegExp(
      "(?:^|\\s)(\\d{1,2})\\s+(.+?)\\s+([0-9A-Z-]+)\\s+(" +
      mfr +
      ")\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(-?\\d+)\\s+(-?\\d+)\\s+(-?\\d+)",
      "gi"
    );

  const rows = [];
  let match;

  while ((match = regex.exec(body)) !== null) {

    const finalPosition =
      sportsRacingSupplementalNumberOrBlank_(match[1]);

    const driverName =
      sportsRacingCleanDriverNameV8_(
        match[2]
      );

    if (!driverName) {
      continue;
    }

    rows.push({
      FinalPosition:
        finalPosition,
      DriverName:
        driverName,
      CarNumber:
        sportsRacingSupplementalString_(match[3]),
      Manufacturer:
        sportsRacingSupplementalString_(match[4]),
      Laps:
        sportsRacingSupplementalNumberOrBlank_(match[5]),
      StartingPosition:
        sportsRacingSupplementalNumberOrBlank_(match[6]),
      LapsLed:
        sportsRacingSupplementalNumberOrBlank_(match[7]),
      Points:
        sportsRacingSupplementalNumberOrBlank_(match[8]),
      Bonus:
        sportsRacingSupplementalNumberOrBlank_(match[9]),
      Penalty:
        sportsRacingSupplementalNumberOrBlank_(match[10]),
      Winner:
        Number(finalPosition) === 1,
      Source:
        "espn_results_page_text_v8",
      RawCells:
        [match[0]]
    });

  }

  return rows;

}

function parseESPNRacingGridPage_(html) {

  const v8Rows =
    parseESPNRacingGridPageV8_(
      html
    );

  if (v8Rows.length) {
    return v8Rows;
  }

  const tableRows =
    sportsRacingExtractTableRows_(html);

  const parsedRows = [];

  tableRows.forEach(function(cells) {

    const normalized =
      cells.map(function(cell) {
        return sportsRacingSupplementalKey_(cell);
      });

    if (
      normalized.indexOf("pos") !== -1 ||
      normalized.indexOf("driver") !== -1 ||
      normalized.indexOf("manufacturer") !== -1
    ) {
      return;
    }

    if (cells.length < 3) {
      return;
    }

    const pos =
      sportsRacingSupplementalNumberOrBlank_(cells[0]);

    if (pos === "" || isNaN(Number(pos))) {
      return;
    }

    parsedRows.push({
      StartingPosition: pos,
      DriverName: cells[1] || "",
      Manufacturer: cells[2] || "",
      CarNumber: cells[3] || "",
      QualifyingSpeed: cells[4] || "",
      Source: "espn_grid_page_table_v8",
      RawCells: cells
    });

  });

  return parsedRows;

}

function parseESPNRacingResultsPage_(html) {

  const v8Rows =
    parseESPNRacingResultsPageV8_(
      html
    );

  if (v8Rows.length) {
    return v8Rows;
  }

  const tableRows =
    sportsRacingExtractTableRows_(html);

  const parsedRows = [];

  tableRows.forEach(function(cells) {

    const normalized =
      cells.map(function(cell) {
        return sportsRacingSupplementalKey_(cell);
      });

    if (
      normalized.indexOf("pos") !== -1 ||
      normalized.indexOf("driver") !== -1 ||
      normalized.indexOf("laps") !== -1
    ) {
      return;
    }

    if (cells.length < 5) {
      return;
    }

    const pos =
      sportsRacingSupplementalNumberOrBlank_(cells[0]);

    if (pos === "" || isNaN(Number(pos))) {
      return;
    }

    parsedRows.push({
      FinalPosition: pos,
      DriverName: cells[1] || "",
      CarNumber: cells[2] || "",
      Manufacturer: cells[3] || "",
      Laps: sportsRacingSupplementalNumberOrBlank_(cells[4]),
      StartingPosition: sportsRacingSupplementalNumberOrBlank_(cells[5]),
      LapsLed: sportsRacingSupplementalNumberOrBlank_(cells[6]),
      Points: sportsRacingSupplementalNumberOrBlank_(cells[7]),
      Bonus: sportsRacingSupplementalNumberOrBlank_(cells[8]),
      Penalty: sportsRacingSupplementalNumberOrBlank_(cells[9]),
      Winner: Number(pos) === 1,
      Source: "espn_results_page_table_v8",
      RawCells: cells
    });

  });

  return parsedRows;

}

function sportsRacingEnsureKnownSanDiegoSourceLinkV8_() {

  setupSportsRacingSupplementalSystem();

  const sh =
    sportsRacingSourceLinksGetSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsRacingSupplementalString_(header);
    });

  const col =
    getSportsHeaderMap_(headers);

  const gameId =
    "nascar-premier_202606214266";

  for (let i = 1; i < data.length; i++) {
    if (
      sportsRacingSupplementalString_(data[i][col.GameId]) === gameId ||
      sportsRacingSupplementalString_(data[i][col.ESPNEventId]) === "202606214266"
    ) {
      if (col.Enabled !== undefined) {
        sh.getRange(i + 1, col.Enabled + 1).setValue(true);
      }
      return {
        existed: true,
        rowNumber: i + 1
      };
    }
  }

  const rowObj = {
    SourceLinkId: gameId,
    Timestamp: new Date(),
    League: "nascar-premier",
    GameId: gameId,
    ESPNEventId: "202606214266",
    RaceName: "NASCAR Cup Series at San Diego",
    RaceDateTime: "2026-06-21T20:00Z",
    Series: "sprint",
    GridUrl: sportsRacingESPNGridUrl_("sprint", "202606214266"),
    ResultsUrl: sportsRacingESPNResultsUrl_("sprint", "202606214266"),
    Enabled: true,
    LastImportedAt: "",
    LastImportStatus: "NEW",
    LastImportMessage: "Known race test link created by v8",
    UpdatedAt: new Date()
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

  return {
    existed: false,
    rowNumber: sh.getLastRow()
  };

}

function testParseESPNRacingKnownPagesV8() {

  const link = {
    League: "nascar-premier",
    GameId: "nascar-premier_202606214266",
    ESPNEventId: "202606214266",
    GridUrl: sportsRacingESPNGridUrl_("sprint", "202606214266"),
    ResultsUrl: sportsRacingESPNResultsUrl_("sprint", "202606214266")
  };

  const gridFetch =
    sportsRacingFetchESPNPage_(
      link.GridUrl
    );

  const resultsFetch =
    sportsRacingFetchESPNPage_(
      link.ResultsUrl
    );

  const gridRows =
    gridFetch.blocked
      ? []
      : parseESPNRacingGridPage_(gridFetch.html);

  const resultsRows =
    resultsFetch.blocked
      ? []
      : parseESPNRacingResultsPage_(resultsFetch.html);

  const result = {
    success: true,
    grid: {
      code: gridFetch.code,
      blocked: gridFetch.blocked,
      htmlLength: String(gridFetch.html || "").length,
      parsed: gridRows.length,
      firstRows: gridRows.slice(0, 5)
    },
    results: {
      code: resultsFetch.code,
      blocked: resultsFetch.blocked,
      htmlLength: String(resultsFetch.html || "").length,
      parsed: resultsRows.length,
      firstRows: resultsRows.slice(0, 5)
    }
  };

  sportsRacingImportLogV8_(
    "INFO",
    "testParseESPNRacingKnownPagesV8",
    link,
    "parse_known_pages",
    "DONE",
    "Known ESPN racing pages parsed",
    result
  );

  return result;

}

function debugSportsRacingSupplementalStatusV8() {

  setupSportsRacingSupplementalSystem();
  setupSportsRacingImportLogSystemV8();

  const links =
    readSportsRacingSourceLinkRows_();

  const enabledLinks =
    links.filter(function(link) {
      return sportsRacingSupplementalBoolean_(
        link.Enabled,
        true
      ) === true;
    });

  const supplementalRows =
    readSportsRacingSupplementalRows_();

  const racingRows =
    typeof readSportsRacingResultRows_ === "function"
      ? readSportsRacingResultRows_()
      : [];

  return {
    success: true,
    sheets: {
      sourceLinks: links.length,
      enabledSourceLinks: enabledLinks.length,
      supplementalRows: supplementalRows.length,
      racingResultRows: racingRows.length
    },
    firstEnabledLinks: enabledLinks.slice(0, 5).map(function(link) {
      return {
        rowNumber: link._rowNumber,
        league: link.League,
        gameId: link.GameId,
        espnEventId: link.ESPNEventId,
        gridUrl: link.GridUrl,
        resultsUrl: link.ResultsUrl,
        lastImportStatus: link.LastImportStatus,
        lastImportMessage: link.LastImportMessage
      };
    }),
    importLogSheet: SPORTS_RACING_IMPORT_LOG_SHEET_V8
  };

}

function importESPNRacingSupplemental() {

  setupSportsRacingSupplementalSystem();
  setupSportsRacingImportLogSystemV8();

  const links =
    readSportsRacingSourceLinkRows_()
      .filter(function(link) {
        return sportsRacingSupplementalBoolean_(
          link.Enabled,
          true
        ) === true;
      });

  const summary = {
    success: true,
    startedAt: new Date(),
    linksChecked: 0,
    enabledLinks: links.length,
    gridRowsParsed: 0,
    resultsRowsParsed: 0,
    inserted: 0,
    updated: 0,
    blocked: [],
    noRows: [],
    errors: []
  };

  if (!links.length) {
    sportsRacingImportLogV8_(
      "WARN",
      "importESPNRacingSupplemental",
      {},
      "read_links",
      "NO_ENABLED_LINKS",
      "No enabled rows found in SportsRacingSourceLinks",
      {}
    );
  }

  links.forEach(function(link) {

    const rowsToUpsert = [];
    let status = "SUCCESS";
    const messages = [];

    try {

      const gridUrl =
        sportsRacingSupplementalString_(
          link.GridUrl
        );

      if (gridUrl) {
        const gridFetch =
          sportsRacingFetchESPNPage_(
            gridUrl
          );

        sportsRacingImportLogV8_(
          "INFO",
          "importESPNRacingSupplemental",
          link,
          "fetch_grid",
          gridFetch.blocked ? "BLOCKED" : "FETCHED",
          "Grid fetch complete",
          {
            code: gridFetch.code,
            blocked: gridFetch.blocked,
            htmlLength: String(gridFetch.html || "").length,
            url: gridUrl
          }
        );

        if (gridFetch.blocked) {
          status = "PARTIAL_OR_BLOCKED";
          messages.push(
            "Grid page blocked or unavailable. HTTP " +
            gridFetch.code
          );
          summary.blocked.push({
            gameId: link.GameId,
            type: "grid",
            code: gridFetch.code,
            url: gridUrl
          });
        } else {
          const gridRows =
            parseESPNRacingGridPage_(
              gridFetch.html
            );

          gridRows.forEach(function(item) {
            rowsToUpsert.push(
              sportsRacingGridRowToSupplemental_(
                link,
                item
              )
            );
          });

          summary.gridRowsParsed +=
            gridRows.length;

          messages.push(
            "Grid rows: " + gridRows.length
          );

          sportsRacingImportLogV8_(
            "INFO",
            "importESPNRacingSupplemental",
            link,
            "parse_grid",
            gridRows.length ? "PARSED" : "NO_ROWS",
            "Grid parse complete",
            {
              count: gridRows.length,
              firstRows: gridRows.slice(0, 3)
            }
          );
        }
      }

      const resultsUrl =
        sportsRacingSupplementalString_(
          link.ResultsUrl
        );

      if (resultsUrl) {
        const resultsFetch =
          sportsRacingFetchESPNPage_(
            resultsUrl
          );

        sportsRacingImportLogV8_(
          "INFO",
          "importESPNRacingSupplemental",
          link,
          "fetch_results",
          resultsFetch.blocked ? "BLOCKED" : "FETCHED",
          "Results fetch complete",
          {
            code: resultsFetch.code,
            blocked: resultsFetch.blocked,
            htmlLength: String(resultsFetch.html || "").length,
            url: resultsUrl
          }
        );

        if (resultsFetch.blocked) {
          status = "PARTIAL_OR_BLOCKED";
          messages.push(
            "Results page blocked or unavailable. HTTP " +
            resultsFetch.code
          );
          summary.blocked.push({
            gameId: link.GameId,
            type: "results",
            code: resultsFetch.code,
            url: resultsUrl
          });
        } else {
          const resultRows =
            parseESPNRacingResultsPage_(
              resultsFetch.html
            );

          resultRows.forEach(function(item) {
            rowsToUpsert.push(
              sportsRacingResultsRowToSupplemental_(
                link,
                item
              )
            );
          });

          summary.resultsRowsParsed +=
            resultRows.length;

          messages.push(
            "Result rows: " + resultRows.length
          );

          sportsRacingImportLogV8_(
            "INFO",
            "importESPNRacingSupplemental",
            link,
            "parse_results",
            resultRows.length ? "PARSED" : "NO_ROWS",
            "Results parse complete",
            {
              count: resultRows.length,
              firstRows: resultRows.slice(0, 3)
            }
          );
        }
      }

      const writeResult =
        upsertSportsRacingSupplementalRows_(
          rowsToUpsert
        );

      summary.inserted +=
        writeResult.inserted;

      summary.updated +=
        writeResult.updated;

      if (!rowsToUpsert.length && status === "SUCCESS") {
        status = "NO_ROWS";
        summary.noRows.push({
          gameId: link.GameId,
          espnEventId: link.ESPNEventId,
          league: link.League
        });
      }

      messages.push(
        "Inserted: " + writeResult.inserted +
        ", Updated: " + writeResult.updated
      );

      updateSportsRacingSourceLinkStatus_(
        link._rowNumber,
        status,
        messages.join(" | ") || "No ESPN rows imported"
      );

    } catch (err) {

      const message =
        err && err.message
          ? err.message
          : String(err);

      summary.errors.push({
        gameId: link.GameId,
        error: message
      });

      sportsRacingImportLogV8_(
        "ERROR",
        "importESPNRacingSupplemental",
        link,
        "import_link",
        "ERROR",
        message,
        {}
      );

      updateSportsRacingSourceLinkStatus_(
        link._rowNumber,
        "ERROR",
        message
      );

    }

    summary.linksChecked++;

  });

  summary.finishedAt =
    new Date();

  if (typeof logSports_ === "function") {
    logSports_(
      "INFO",
      "importESPNRacingSupplemental",
      "ESPN racing supplemental import complete",
      JSON.stringify(summary)
    );
  }

  return summary;

}

function repairAndImportESPNRacingSupplementalV8() {

  setupSportsRacingSupplementalSystem();
  setupSportsRacingImportLogSystemV8();

  const linksBefore =
    readSportsRacingSourceLinkRows_()
      .length;

  const buildResult =
    buildESPNRacingSourceLinksFromResults();

  const linksAfterBuild =
    readSportsRacingSourceLinkRows_()
      .length;

  const importResult =
    importESPNRacingSupplemental();

  const supplementalRows =
    readSportsRacingSupplementalRows_()
      .length;

  return {
    success: true,
    linksBefore: linksBefore,
    buildResult: buildResult,
    linksAfterBuild: linksAfterBuild,
    importResult: importResult,
    supplementalRows: supplementalRows,
    logSheet: SPORTS_RACING_IMPORT_LOG_SHEET_V8
  };

}

function testESPNRacingSupplementalForSanDiego() {

  sportsRacingEnsureKnownSanDiegoSourceLinkV8_();

  const parseTest =
    testParseESPNRacingKnownPagesV8();

  const importResult =
    importESPNRacingSupplemental();

  return {
    success: true,
    parseTest: parseTest,
    importResult: importResult,
    supplementalRows:
      readSportsRacingSupplementalRows_()
        .filter(function(row) {
          return String(row.ESPNEventId || "") === "202606214266";
        }).length,
    logSheet: SPORTS_RACING_IMPORT_LOG_SHEET_V8
  };

}