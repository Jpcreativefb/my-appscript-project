/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/

/************************************************************
 RACING SCORE ENGINE - HELPERS
 Standalone helpers used by racing results, paste import, driver DB,
 supplemental data, and API output.
************************************************************/

const SPORTS_RACING_LOGS_SHEET =
  "SportsRacingLogs";

const SPORTS_RACING_LOG_HEADERS = [
  "Timestamp",
  "Level",
  "FunctionName",
  "Message",
  "Details"
];

function getSportsHeaderMap_(headers) {
  const map = {};

  headers.forEach(function(header, index) {
    map[String(header || "").trim()] = index;
  });

  return map;
}

function sportsRowToObject_(headers, row) {
  const obj = {};

  headers.forEach(function(header, index) {
    obj[String(header || "").trim()] = row[index];
  });

  return obj;
}

function normalizeSportsBoolean_(value) {
  return (
    value === true ||
    String(value)
      .trim()
      .toLowerCase() === "true" ||
    String(value)
      .trim()
      .toLowerCase() === "yes" ||
    String(value)
      .trim() === "1"
  );
}

function sportsRacingEnsureLogSheet_() {
  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_RACING_LOGS_SHEET
    );

  if (!sh) {
    sh = ss.insertSheet(SPORTS_RACING_LOGS_SHEET);
  }

  if (sh.getLastRow() === 0) {
    sh
      .getRange(1, 1, 1, SPORTS_RACING_LOG_HEADERS.length)
      .setValues([SPORTS_RACING_LOG_HEADERS]);

    try {
      sh.setFrozenRows(1);
    } catch (err) {}
  }

  return sh;
}

function logSports_(
  level,
  functionName,
  message,
  details
) {
  try {
    sportsRacingEnsureLogSheet_()
      .appendRow([
        new Date(),
        level,
        functionName,
        message,
        details || ""
      ]);
  } catch (err) {
    // Logging should never break racing imports.
  }
}

function sportsApiDateReplacer_(key, value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function sportsApiOutput_(payload, callback) {
  const json =
    JSON.stringify(
      payload,
      sportsApiDateReplacer_
    );

  callback =
    String(callback || "")
      .trim();

  if (callback) {
    return ContentService
      .createTextOutput(
        callback + "(" + json + ");"
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(
      ContentService.MimeType.JSON
    );
}