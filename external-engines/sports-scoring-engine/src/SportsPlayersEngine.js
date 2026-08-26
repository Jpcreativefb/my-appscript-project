/************************************************************
 SPORTS PLAYERS ENGINE v1.1.0
 Lives in the separate Sports Scores Engine project.

 First production release:
 - SportsPlayers sheet
 - SportsPlayerGameStats sheet
 - ESPN roster sync by league
 - ESPN current/live/final game-stat refresh
 - Public read-only APIs
 - Protected admin setup/sync/refresh APIs

 Supported team sports:
 - NFL and NCAA football
 - MLB
 - NBA, WNBA, NCAA men's and women's basketball
 - NHL
 - Every configured ESPN soccer competition

 Player rows are populated from league rosters and game summaries.
 Unsupported or unavailable source statistics are skipped rather than guessed.
************************************************************/

const SPORTS_PLAYERS_SHEET = "SportsPlayers";
const SPORTS_PLAYER_GAME_STATS_SHEET = "SportsPlayerGameStats";

const SPORTS_PLAYERS_HEADERS = [
  "PlayerId",
  "ESPNPlayerId",
  "Sport",
  "League",
  "TeamId",
  "Team",
  "TeamAbbreviation",
  "FullName",
  "ShortName",
  "Position",
  "JerseyNumber",
  "HeadshotUrl",
  "Active",
  "LastUpdated",
  "Source"
];

const SPORTS_PLAYER_GAME_STATS_HEADERS = [
  "GameId",
  "ESPNEventId",
  "PlayerId",
  "ESPNPlayerId",
  "Sport",
  "League",
  "TeamId",
  "TeamAbbreviation",
  "PlayerName",
  "Position",
  "StatType",
  "StatValue",
  "DisplayValue",
  "Completed",
  "LastUpdated",
  "Source"
];

const SPORTS_PLAYERS_DEFAULT_MAX_GAMES = 20;
const SPORTS_PLAYERS_DEFAULT_DAYS_BACK = 1;
const SPORTS_PLAYERS_DEFAULT_DAYS_FORWARD = 1;

const SPORTS_PLAYERS_SUPPORTED_SPORTS = {
  football: true,
  baseball: true,
  basketball: true,
  hockey: true,
  soccer: true
};

const SPORTS_PLAYERS_SUPPORTED_LEAGUES = {
  nfl: true,
  "college-football": true,
  mlb: true,
  nba: true,
  wnba: true,
  "mens-college-basketball": true,
  "womens-college-basketball": true,
  nhl: true
};

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsPlayersString_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function sportsPlayersKey_(value) {
  return sportsPlayersString_(value).toLowerCase();
}

function sportsPlayersBoolean_(value, fallback) {
  if (value === true || value === false) return value;

  const raw = sportsPlayersKey_(value);

  if (["true", "yes", "1", "on", "active"].indexOf(raw) !== -1) return true;
  if (["false", "no", "0", "off", "inactive"].indexOf(raw) !== -1) return false;

  return fallback;
}

function sportsPlayersNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;

  const cleaned = sportsPlayersString_(value)
    .replace(/,/g, "")
    .replace(/%$/, "");

  if (!/^[-+]?\d*\.?\d+$/.test(cleaned)) return fallback;

  const number = Number(cleaned);
  return isFinite(number) ? number : fallback;
}

function sportsPlayersSlug_(value) {
  return sportsPlayersString_(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function sportsPlayersHeaderMap_(headers) {
  const map = {};

  (headers || []).forEach(function(header, index) {
    const key = sportsPlayersString_(header);
    if (key && map[key] === undefined) map[key] = index;
  });

  return map;
}

function sportsPlayersRowObject_(headers, row) {
  const object = {};

  (headers || []).forEach(function(header, index) {
    object[header] = row[index];
  });

  return object;
}

function sportsPlayersSafeDateOnly_(value) {
  if (typeof normalizeSportsDateOnly_ === "function") {
    return normalizeSportsDateOnly_(value);
  }

  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";

  return Utilities.formatDate(date, Session.getScriptTimeZone() || "America/Chicago", "yyyy-MM-dd");
}

function sportsPlayersAddDays_(dateOnly, days) {
  if (typeof addSportsDays_ === "function") {
    return addSportsDays_(dateOnly, days);
  }

  const date = new Date(dateOnly + "T12:00:00");
  date.setDate(date.getDate() + Number(days || 0));
  return sportsPlayersSafeDateOnly_(date);
}

function sportsPlayersPlayerId_(league, espnPlayerId) {
  const leagueKey = sportsPlayersSlug_(league);
  const playerKey = sportsPlayersString_(espnPlayerId);
  return leagueKey && playerKey ? leagueKey + "_" + playerKey : "";
}

function sportsPlayersGetHeadshot_(athlete) {
  athlete = athlete || {};

  if (typeof athlete.headshot === "string") return athlete.headshot;
  if (athlete.headshot && athlete.headshot.href) return athlete.headshot.href;
  if (athlete.headshot && athlete.headshot.url) return athlete.headshot.url;

  const headshots = athlete.headshots || athlete.images || [];
  if (headshots.length) return headshots[0].href || headshots[0].url || "";

  return "";
}

function sportsPlayersPosition_(athlete) {
  athlete = athlete || {};
  const position = athlete.position || {};

  if (typeof position === "string") return position;

  return sportsPlayersString_(
    position.abbreviation ||
    position.shortName ||
    position.displayName ||
    position.name
  );
}

function sportsPlayersAthleteActive_(athlete) {
  athlete = athlete || {};

  if (athlete.active !== undefined) {
    return sportsPlayersBoolean_(athlete.active, true);
  }

  const status = athlete.status || {};
  const raw = sportsPlayersKey_(status.type || status.name || status.abbreviation);

  if (!raw) return true;
  return raw !== "inactive" && raw !== "retired" && raw !== "suspended";
}

function sportsPlayersTeamName_(team) {
  team = team || {};

  return sportsPlayersString_(
    team.displayName ||
    team.shortDisplayName ||
    team.name ||
    team.location
  );
}

function sportsPlayersTeamAbbreviation_(team) {
  team = team || {};
  return sportsPlayersString_(
    team.abbreviation ||
    team.shortName ||
    team.slug ||
    ""
  ).toUpperCase();
}

function sportsPlayersFindSetting_(league, sport) {
  const targetLeague = sportsPlayersKey_(league);
  const targetSport = sportsPlayersKey_(sport);
  const ss = SpreadsheetApp.getActive();

  const sh = sportsPlayersSpreadsheetRetry_(
    "open SportsSettings for player sync",
    function() {
      return ss.getSheetByName("SportsSettings");
    }
  );

  if (!sh) return null;

  const data = sportsPlayersSpreadsheetRetry_(
    "read SportsSettings for player sync",
    function() {
      return sh.getDataRange().getValues();
    }
  );

  if (data.length <= 1) return null;

  const headers = data[0].map(sportsPlayersString_);
  const col = sportsPlayersHeaderMap_(headers);

  if (col.League === undefined || col.Sport === undefined) {
    throw new Error("SportsSettings is missing Sport or League headers");
  }

  for (let i = 1; i < data.length; i++) {
    const rowLeague = sportsPlayersKey_(data[i][col.League]);
    const rowSport = sportsPlayersKey_(data[i][col.Sport]);

    if (targetLeague && rowLeague !== targetLeague) continue;
    if (targetSport && rowSport !== targetSport) continue;

    return sportsPlayersRowObject_(headers, data[i]);
  }

  return null;
}

function sportsPlayersAssertSupportedLeague_(league, sport) {
  const leagueKey = sportsPlayersKey_(league);
  const sportKey = sportsPlayersKey_(sport);

  if (!SPORTS_PLAYERS_SUPPORTED_SPORTS[sportKey]) {
    throw new Error(
      "Sports Players does not support the requested sport: " +
      sportsPlayersString_(sport || league)
    );
  }

  // Soccer competition codes are intentionally dynamic. Any soccer league
  // present in SportsSettings can use the same roster and summary pipeline.
  if (sportKey === "soccer") return leagueKey;

  if (!SPORTS_PLAYERS_SUPPORTED_LEAGUES[leagueKey]) {
    throw new Error(
      "Sports Players does not support the requested league: " +
      sportsPlayersString_(league)
    );
  }

  return leagueKey;
}

// Backward-compatible alias retained for older admin calls and tests.
function sportsPlayersAssertV1League_(league, sport) {
  return sportsPlayersAssertSupportedLeague_(league, sport);
}

function sportsPlayersResolveLeague_(league, sport) {
  const setting = sportsPlayersFindSetting_(league, sport);

  if (!setting) {
    throw new Error("No SportsSettings row found for league: " + sportsPlayersString_(league));
  }

  const resolvedSport = sportsPlayersKey_(setting.Sport || sport);
  const resolvedLeague = sportsPlayersKey_(setting.League || league);

  if (!resolvedSport || !resolvedLeague) {
    throw new Error("SportsSettings row is missing Sport or League");
  }

  if (resolvedSport === "racing") {
    throw new Error("Racing players belong in the separate Racing Score Engine");
  }

  return {
    Sport: resolvedSport,
    League: resolvedLeague,
    Enabled: setting.Enabled === undefined ? true : sportsPlayersBoolean_(setting.Enabled, true)
  };
}

/* =====================================================
   SHEET SETUP
===================================================== */

function sportsPlayersSpreadsheetRetry_(label, fn) {
  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;

      const message =
        err && err.message
          ? err.message
          : String(err);

      const retryable =
        message.indexOf("Service Spreadsheets timed out") !== -1 ||
        message.indexOf("Service Spreadsheets failed") !== -1 ||
        message.indexOf("Service Spreadsheets") !== -1 ||
        message.indexOf("Internal error") !== -1;

      if (!retryable || attempt === 5) {
        throw err;
      }

      Utilities.sleep(attempt * 1200);
    }
  }

  throw lastError || new Error("Spreadsheet operation failed: " + label);
}

function sportsPlayersEnsureSheet_(sheetName, requiredHeaders) {
  requiredHeaders = Array.isArray(requiredHeaders)
    ? requiredHeaders.filter(Boolean)
    : [];

  if (!sheetName || !requiredHeaders.length) {
    throw new Error("sheetName and requiredHeaders are required");
  }

  const ss = SpreadsheetApp.getActive();

  let sh = sportsPlayersSpreadsheetRetry_(
    "open player sheet " + sheetName,
    function() {
      return ss.getSheetByName(sheetName);
    }
  );

  if (!sh) {
    sh = sportsPlayersSpreadsheetRetry_(
      "create player sheet " + sheetName,
      function() {
        return ss.insertSheet(sheetName);
      }
    );

    Utilities.sleep(250);
  }

  let lastColumn = 0;

  try {
    lastColumn = sportsPlayersSpreadsheetRetry_(
      "read player sheet last column " + sheetName,
      function() {
        return sh.getLastColumn();
      }
    );
  } catch (lastColumnError) {
    lastColumn = requiredHeaders.length;
  }

  const readWidth = Math.max(
    1,
    Math.min(Math.max(lastColumn, requiredHeaders.length), 100)
  );

  if (sh.getMaxColumns() < readWidth) {
    sportsPlayersSpreadsheetRetry_(
      "expand player sheet columns " + sheetName,
      function() {
        sh.insertColumnsAfter(sh.getMaxColumns(), readWidth - sh.getMaxColumns());
        return true;
      }
    );
  }

  const headers = sportsPlayersSpreadsheetRetry_(
    "read player sheet headers " + sheetName,
    function() {
      return sh
        .getRange(1, 1, 1, readWidth)
        .getDisplayValues()[0]
        .map(sportsPlayersString_);
    }
  );

  const hasAnyHeader = headers.some(Boolean);

  if (!hasAnyHeader) {
    sportsPlayersSpreadsheetRetry_(
      "write player sheet headers " + sheetName,
      function() {
        sh
          .getRange(1, 1, 1, requiredHeaders.length)
          .setValues([requiredHeaders]);
      }
    );
  } else {
    const missing = requiredHeaders.filter(function(header) {
      return headers.indexOf(header) === -1;
    });

    if (missing.length) {
      const appendColumn = Math.max(lastColumn, headers.filter(Boolean).length) + 1;
      const requiredMaxColumn = appendColumn + missing.length - 1;
      if (sh.getMaxColumns() < requiredMaxColumn) {
        sh.insertColumnsAfter(sh.getMaxColumns(), requiredMaxColumn - sh.getMaxColumns());
      }

      sportsPlayersSpreadsheetRetry_(
        "append player sheet headers " + sheetName,
        function() {
          sh
            .getRange(1, appendColumn, 1, missing.length)
            .setValues([missing]);
        }
      );
    }
  }

  try {
    sh.setFrozenRows(1);
  } catch (ignoreFreezeError) {}

  return sh;
}

function sportsPlayersColumnLetter_(columnNumber) {
  let number = Number(columnNumber || 0);
  let result = "";

  while (number > 0) {
    number--;
    result = String.fromCharCode(65 + (number % 26)) + result;
    number = Math.floor(number / 26);
  }

  return result;
}

function sportsPlayersApplyFormats_() {
  const ss = SpreadsheetApp.getActive();
  const warnings = [];

  [SPORTS_PLAYERS_SHEET, SPORTS_PLAYER_GAME_STATS_SHEET].forEach(function(sheetName) {
    try {
      const sh = sportsPlayersSpreadsheetRetry_(
        "open player format sheet " + sheetName,
        function() {
          return ss.getSheetByName(sheetName);
        }
      );

      if (!sh) return;

      const expectedHeaders =
        sheetName === SPORTS_PLAYERS_SHEET
          ? SPORTS_PLAYERS_HEADERS
          : SPORTS_PLAYER_GAME_STATS_HEADERS;

      const headers = sportsPlayersSpreadsheetRetry_(
        "read player format headers " + sheetName,
        function() {
          return sh
            .getRange(1, 1, 1, expectedHeaders.length)
            .getDisplayValues()[0]
            .map(sportsPlayersString_);
        }
      );

      const maxRows = sportsPlayersSpreadsheetRetry_(
        "read player format row count " + sheetName,
        function() {
          return sh.getMaxRows();
        }
      );

      const dataRows = Math.max(maxRows - 1, 1);
      const textRanges = [];

      ["PlayerId", "ESPNPlayerId", "TeamId", "GameId", "ESPNEventId", "JerseyNumber", "StatType", "DisplayValue"].forEach(function(header) {
        const index = headers.indexOf(header);

        if (index !== -1) {
          const column = sportsPlayersColumnLetter_(index + 1);
          textRanges.push(column + "2:" + column + (dataRows + 1));
        }
      });

      if (textRanges.length) {
        sportsPlayersSpreadsheetRetry_(
          "format player text columns " + sheetName,
          function() {
            sh.getRangeList(textRanges).setNumberFormat("@");
          }
        );
      }

      const updatedIndex = headers.indexOf("LastUpdated");

      if (updatedIndex !== -1) {
        sportsPlayersSpreadsheetRetry_(
          "format player updated column " + sheetName,
          function() {
            sh
              .getRange(2, updatedIndex + 1, dataRows, 1)
              .setNumberFormat("yyyy-mm-dd hh:mm:ss");
          }
        );
      }
    } catch (err) {
      warnings.push({
        sheet: sheetName,
        warning:
          err && err.message
            ? err.message
            : String(err)
      });
    }
  });

  return warnings;
}

function setupSportsPlayersSystem() {
  sportsPlayersEnsureSheet_(SPORTS_PLAYERS_SHEET, SPORTS_PLAYERS_HEADERS);
  sportsPlayersEnsureSheet_(SPORTS_PLAYER_GAME_STATS_SHEET, SPORTS_PLAYER_GAME_STATS_HEADERS);

  const formatWarnings = sportsPlayersApplyFormats_();

  if (typeof logSports_ === "function") {
    logSports_(
      formatWarnings.length ? "WARN" : "INFO",
      "setupSportsPlayersSystem",
      "Sports player sheets are ready",
      JSON.stringify({ formatWarnings: formatWarnings })
    );
  }

  return {
    success: true,
    version: "1.1.0",
    sheets: [SPORTS_PLAYERS_SHEET, SPORTS_PLAYER_GAME_STATS_SHEET],
    formatWarnings: formatWarnings,
    message: "SportsPlayers and SportsPlayerGameStats are ready"
  };
}

/* =====================================================
   SHEET READ / WRITE
===================================================== */

function readSportsPlayersRows_() {
  sportsPlayersEnsureSheet_(SPORTS_PLAYERS_SHEET, SPORTS_PLAYERS_HEADERS);

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_PLAYERS_SHEET);
  const data = sportsPlayersSpreadsheetRetry_(
    "read SportsPlayers rows",
    function() {
      return sh.getDataRange().getValues();
    }
  );

  if (data.length <= 1) return [];

  const headers = data[0].map(sportsPlayersString_);

  return data.slice(1).map(function(row) {
    const object = sportsPlayersRowObject_(headers, row);
    object.Active = sportsPlayersBoolean_(object.Active, false);
    return object;
  }).filter(function(row) {
    return !!sportsPlayersString_(row.PlayerId);
  });
}

function readSportsPlayerGameStatsRows_() {
  sportsPlayersEnsureSheet_(SPORTS_PLAYER_GAME_STATS_SHEET, SPORTS_PLAYER_GAME_STATS_HEADERS);

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_PLAYER_GAME_STATS_SHEET);
  const data = sportsPlayersSpreadsheetRetry_(
    "read SportsPlayerGameStats rows",
    function() {
      return sh.getDataRange().getValues();
    }
  );

  if (data.length <= 1) return [];

  const headers = data[0].map(sportsPlayersString_);

  return data.slice(1).map(function(row) {
    const object = sportsPlayersRowObject_(headers, row);
    object.Completed = sportsPlayersBoolean_(object.Completed, false);
    object.StatValue = sportsPlayersNumber_(object.StatValue, object.StatValue);
    return object;
  }).filter(function(row) {
    return !!sportsPlayersString_(row.GameId) && !!sportsPlayersString_(row.PlayerId) && !!sportsPlayersString_(row.StatType);
  });
}

function sportsPlayersObjectToRow_(headers, object) {
  return headers.map(function(header) {
    return object[header] !== undefined ? object[header] : "";
  });
}

function sportsPlayersWriteRowBatches_(sh, headers, updateByRow, appendObjects) {
  const rowNumbers = Object.keys(updateByRow || {})
    .map(Number)
    .filter(function(rowNumber) { return rowNumber >= 2; })
    .sort(function(a, b) { return a - b; });

  let index = 0;

  while (index < rowNumbers.length) {
    const startRow = rowNumbers[index];
    const rows = [sportsPlayersObjectToRow_(headers, updateByRow[startRow])];
    let previousRow = startRow;
    index++;

    while (index < rowNumbers.length && rowNumbers[index] === previousRow + 1) {
      previousRow = rowNumbers[index];
      rows.push(sportsPlayersObjectToRow_(headers, updateByRow[previousRow]));
      index++;
    }

    sportsPlayersSpreadsheetRetry_(
      "update player rows starting at " + startRow,
      function() {
        sh.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
      }
    );
  }

  const appendRows = (appendObjects || []).map(function(object) {
    return sportsPlayersObjectToRow_(headers, object);
  });

  if (appendRows.length) {
    const appendStartRow = sportsPlayersSpreadsheetRetry_(
      "find player append row",
      function() {
        return sh.getLastRow() + 1;
      }
    );

    sportsPlayersSpreadsheetRetry_(
      "append player rows",
      function() {
        sh
          .getRange(appendStartRow, 1, appendRows.length, headers.length)
          .setValues(appendRows);
      }
    );
  }

  try {
    SpreadsheetApp.flush();
  } catch (flushError) {
    // The values are already queued. A transient flush timeout should not
    // discard the completed writes or force the caller to repeat API pulls.
  }

  return {
    updatedRows: rowNumbers.length,
    appendedRows: appendRows.length
  };
}

function upsertSportsPlayersRows_(incomingRows, options) {
  options = options || {};
  incomingRows = Array.isArray(incomingRows) ? incomingRows : [];

  sportsPlayersEnsureSheet_(SPORTS_PLAYERS_SHEET, SPORTS_PLAYERS_HEADERS);

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_PLAYERS_SHEET);
  const data = sportsPlayersSpreadsheetRetry_(
    "read SportsPlayers rows",
    function() {
      return sh.getDataRange().getValues();
    }
  );
  const headers = data[0].map(sportsPlayersString_);
  const col = sportsPlayersHeaderMap_(headers);
  const existing = {};
  const updateByRow = {};
  const appendObjects = [];
  const targetLeague = sportsPlayersKey_(options.markLeagueInactive || "");
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const rowObject = sportsPlayersRowObject_(headers, data[i]);
    const id = sportsPlayersString_(rowObject.PlayerId);
    if (!id || existing[id]) continue;

    existing[id] = {
      rowNumber: i + 1,
      object: rowObject
    };

    if (targetLeague && sportsPlayersKey_(rowObject.League) === targetLeague) {
      rowObject.Active = false;
      rowObject.LastUpdated = now;
      updateByRow[i + 1] = rowObject;
    }
  }

  const deduped = {};
  incomingRows.forEach(function(row) {
    const id = sportsPlayersString_(row && row.PlayerId);
    if (id) deduped[id] = row;
  });

  let inserted = 0;
  let updated = 0;

  Object.keys(deduped).forEach(function(id) {
    const incoming = deduped[id];

    if (existing[id]) {
      const object = existing[id].object;

      SPORTS_PLAYERS_HEADERS.forEach(function(header) {
        if (incoming[header] !== undefined) object[header] = incoming[header];
      });

      updateByRow[existing[id].rowNumber] = object;
      updated++;
      return;
    }

    const object = {};
    SPORTS_PLAYERS_HEADERS.forEach(function(header) {
      object[header] = incoming[header] !== undefined ? incoming[header] : "";
    });

    appendObjects.push(object);
    inserted++;
  });

  const writeResult = sportsPlayersWriteRowBatches_(sh, headers, updateByRow, appendObjects);

  return {
    success: true,
    inserted: inserted,
    updated: updated,
    rowsWritten: writeResult.updatedRows + writeResult.appendedRows,
    total: Math.max(data.length - 1, 0) + inserted
  };
}

function upsertSportsPlayerGameStatsRows_(incomingRows) {
  incomingRows = Array.isArray(incomingRows) ? incomingRows : [];

  sportsPlayersEnsureSheet_(SPORTS_PLAYER_GAME_STATS_SHEET, SPORTS_PLAYER_GAME_STATS_HEADERS);

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_PLAYER_GAME_STATS_SHEET);
  const data = sportsPlayersSpreadsheetRetry_(
    "read SportsPlayerGameStats rows",
    function() {
      return sh.getDataRange().getValues();
    }
  );
  const headers = data[0].map(sportsPlayersString_);
  const col = sportsPlayersHeaderMap_(headers);
  const existing = {};
  const updateByRow = {};
  const appendObjects = [];

  function rowKey_(row) {
    return [
      sportsPlayersString_(row.GameId),
      sportsPlayersString_(row.PlayerId),
      sportsPlayersString_(row.StatType)
    ].join("|");
  }

  for (let i = 1; i < data.length; i++) {
    const rowObject = sportsPlayersRowObject_(headers, data[i]);
    const key = rowKey_(rowObject);
    if (!key || key === "||" || existing[key]) continue;

    existing[key] = {
      rowNumber: i + 1,
      object: rowObject
    };
  }

  const deduped = {};
  incomingRows.forEach(function(row) {
    const key = rowKey_(row || {});
    if (key && key !== "||") deduped[key] = row;
  });

  let inserted = 0;
  let updated = 0;

  Object.keys(deduped).forEach(function(key) {
    const incoming = deduped[key];

    if (existing[key]) {
      const object = existing[key].object;

      SPORTS_PLAYER_GAME_STATS_HEADERS.forEach(function(header) {
        if (incoming[header] !== undefined) object[header] = incoming[header];
      });

      updateByRow[existing[key].rowNumber] = object;
      updated++;
      return;
    }

    const object = {};
    SPORTS_PLAYER_GAME_STATS_HEADERS.forEach(function(header) {
      object[header] = incoming[header] !== undefined ? incoming[header] : "";
    });

    appendObjects.push(object);
    inserted++;
  });

  const writeResult = sportsPlayersWriteRowBatches_(sh, headers, updateByRow, appendObjects);

  return {
    success: true,
    inserted: inserted,
    updated: updated,
    rowsWritten: writeResult.updatedRows + writeResult.appendedRows,
    total: Math.max(data.length - 1, 0) + inserted
  };
}

/* =====================================================
   ESPN FETCH HELPERS
===================================================== */

function sportsPlayersFetchJson_(url, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const fetchOptions = {
        method: "get",
        muteHttpExceptions: true,
        followRedirects: true,
        headers: { Accept: "application/json" }
      };
      const response = typeof sportsEspnFetch_ === "function"
        ? sportsEspnFetch_(url, fetchOptions)
        : UrlFetchApp.fetch(url, fetchOptions);

      const code = response.getResponseCode();
      const text = response.getContentText();

      if (code < 200 || code >= 300) {
        throw new Error((label || "ESPN request") + " failed. HTTP " + code + ": " + text.slice(0, 300));
      }

      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      if (attempt < 3) Utilities.sleep(attempt * 750);
    }
  }

  throw lastError || new Error((label || "ESPN request") + " failed");
}

function sportsPlayersTeamsUrl_(sport, league) {
  return "https://site.api.espn.com/apis/site/v2/sports/" +
    encodeURIComponent(sport) + "/" + encodeURIComponent(league) + "/teams?limit=1000";
}

function sportsPlayersRosterUrl_(sport, league, teamId) {
  return "https://site.api.espn.com/apis/site/v2/sports/" +
    encodeURIComponent(sport) + "/" + encodeURIComponent(league) +
    "/teams/" + encodeURIComponent(teamId) + "/roster";
}

function sportsPlayersSummaryUrl_(sport, league, espnEventId) {
  return "https://site.api.espn.com/apis/site/v2/sports/" +
    encodeURIComponent(sport) + "/" + encodeURIComponent(league) +
    "/summary?event=" + encodeURIComponent(espnEventId);
}

function sportsPlayersExtractTeams_(payload) {
  const output = [];
  const sports = payload && payload.sports || [];

  sports.forEach(function(sport) {
    (sport.leagues || []).forEach(function(league) {
      (league.teams || []).forEach(function(wrapper) {
        const team = wrapper.team || wrapper;
        const id = sportsPlayersString_(team.id);
        if (id) output.push(team);
      });
    });
  });

  if (!output.length && payload && Array.isArray(payload.teams)) {
    payload.teams.forEach(function(wrapper) {
      const team = wrapper.team || wrapper;
      if (sportsPlayersString_(team.id)) output.push(team);
    });
  }

  return output;
}

function sportsPlayersExtractRosterAthletes_(payload) {
  const output = [];
  const groups = []
    .concat(payload && payload.athletes || [])
    .concat(payload && payload.roster || [])
    .concat(payload && payload.squad || [])
    .concat(payload && payload.items || [])
    .concat(payload && payload.team && payload.team.athletes || []);

  function append_(entry) {
    if (!entry) return;
    if (Array.isArray(entry)) {
      entry.forEach(append_);
      return;
    }
    if (Array.isArray(entry.items)) {
      entry.items.forEach(append_);
      return;
    }
    if (Array.isArray(entry.athletes)) {
      entry.athletes.forEach(append_);
      return;
    }
    const athlete = entry.athlete || entry.player || entry;
    if (athlete && (athlete.id || athlete.uid)) output.push(athlete);
  }

  groups.forEach(append_);

  const unique = {};
  output.forEach(function(athlete) {
    const id = sportsPlayersString_(athlete.id || athlete.uid);
    if (id) unique[id] = athlete;
  });
  return Object.keys(unique).map(function(id) { return unique[id]; });
}

function sportsPlayersNormalizeRosterAthlete_(athlete, team, sport, league, now) {
  athlete = athlete || {};
  team = team || {};

  const espnPlayerId = sportsPlayersString_(athlete.id || athlete.uid);
  const fullName = sportsPlayersString_(athlete.fullName || athlete.displayName || athlete.name);

  if (!espnPlayerId || !fullName) return null;

  return {
    PlayerId: sportsPlayersPlayerId_(league, espnPlayerId),
    ESPNPlayerId: espnPlayerId,
    Sport: sport,
    League: league,
    TeamId: sportsPlayersString_(team.id || (athlete.team && athlete.team.id)),
    Team: sportsPlayersTeamName_(team || athlete.team),
    TeamAbbreviation: sportsPlayersTeamAbbreviation_(team || athlete.team),
    FullName: fullName,
    ShortName: sportsPlayersString_(athlete.shortName || athlete.displayName || fullName),
    Position: sportsPlayersPosition_(athlete),
    JerseyNumber: sportsPlayersString_(athlete.jersey || athlete.jerseyNumber),
    HeadshotUrl: sportsPlayersGetHeadshot_(athlete),
    Active: sportsPlayersAthleteActive_(athlete),
    LastUpdated: now,
    Source: "ESPN_ROSTER"
  };
}

/* =====================================================
   ROSTER SYNC
===================================================== */

function syncSportsPlayersForLeague(league, sport) {
  const resolved = sportsPlayersResolveLeague_(league, sport);
  sportsPlayersAssertSupportedLeague_(resolved.League, resolved.Sport);

  if (!resolved.Enabled) {
    return {
      success: true,
      skipped: true,
      sport: resolved.Sport,
      league: resolved.League,
      reason: "League is OFF"
    };
  }

  setupSportsPlayersSystem();

  const teamsPayload = sportsPlayersFetchJson_(
    sportsPlayersTeamsUrl_(resolved.Sport, resolved.League),
    "ESPN team list"
  );

  const teams = sportsPlayersExtractTeams_(teamsPayload);

  if (!teams.length) {
    throw new Error("ESPN returned no teams for " + resolved.Sport + " / " + resolved.League);
  }

  const requests = teams.map(function(team) {
    return {
      url: sportsPlayersRosterUrl_(resolved.Sport, resolved.League, team.id),
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { Accept: "application/json" }
    };
  });

  const responses = typeof sportsEspnFetchAll_ === "function"
    ? sportsEspnFetchAll_(requests)
    : UrlFetchApp.fetchAll(requests);
  const now = new Date();
  const players = [];
  const errors = [];

  responses.forEach(function(response, index) {
    const team = teams[index] || {};
    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code < 200 || code >= 300) {
      errors.push({
        teamId: sportsPlayersString_(team.id),
        team: sportsPlayersTeamName_(team),
        httpCode: code,
        error: text.slice(0, 200)
      });
      return;
    }

    try {
      const payload = JSON.parse(text);

      sportsPlayersExtractRosterAthletes_(payload).forEach(function(athlete) {
        const row = sportsPlayersNormalizeRosterAthlete_(
          athlete,
          team,
          resolved.Sport,
          resolved.League,
          now
        );

        if (row) players.push(row);
      });
    } catch (error) {
      errors.push({
        teamId: sportsPlayersString_(team.id),
        team: sportsPlayersTeamName_(team),
        error: error && error.message ? error.message : String(error)
      });
    }
  });

  const deduped = {};
  players.forEach(function(row) { deduped[row.PlayerId] = row; });
  const uniquePlayers = Object.keys(deduped).map(function(id) { return deduped[id]; });

  const writeResult = upsertSportsPlayersRows_(uniquePlayers, {
    markLeagueInactive: errors.length === 0 ? resolved.League : ""
  });

  const result = {
    success: errors.length === 0,
    partial: errors.length > 0,
    sport: resolved.Sport,
    league: resolved.League,
    teamsFound: teams.length,
    teamsSynced: teams.length - errors.length,
    playersFound: uniquePlayers.length,
    inserted: writeResult.inserted,
    updated: writeResult.updated,
    errors: errors,
    lastUpdated: now
  };

  if (typeof logSports_ === "function") {
    logSports_(
      errors.length ? "WARN" : "INFO",
      "syncSportsPlayersForLeague",
      "Sports player roster sync complete",
      JSON.stringify(result)
    );
  }

  return result;
}

/* =====================================================
   GAME / STAT NORMALIZATION
===================================================== */

function sportsPlayersStatAlias_(sport, category, rawName, label) {
  const sportKey = sportsPlayersKey_(sport);
  const categoryKey = sportsPlayersSlug_(category);
  const nameKey = sportsPlayersSlug_(rawName || label);
  const labelKey = sportsPlayersKey_(label).replace(/[^a-z0-9]+/g, "");
  const compactName = nameKey.replace(/-/g, "");
  const compact = compactName || labelKey;

  const aliases = {
    rbis: "runs-batted-in",
    rbi: "runs-batted-in",
    homeruns: categoryKey.indexOf("pitch") !== -1 ? "home-runs-allowed" : "home-runs",
    hr: categoryKey.indexOf("pitch") !== -1 ? "home-runs-allowed" : "home-runs",
    strikeouts: categoryKey.indexOf("pitch") !== -1 ? "pitching-strikeouts" : "batting-strikeouts",
    so: categoryKey.indexOf("pitch") !== -1 ? "pitching-strikeouts" : "batting-strikeouts",
    k: categoryKey.indexOf("pitch") !== -1 ? "pitching-strikeouts" : "batting-strikeouts",
    pts: "points",
    points: "points",
    min: "minutes",
    minutes: "minutes",
    toi: "minutes",
    timeonice: "minutes",
    passingyards: "passing-yards",
    rushingyards: "rushing-yards",
    receivingyards: "receiving-yards",
    passingtouchdowns: "passing-touchdowns",
    rushingtouchdowns: "rushing-touchdowns",
    receivingtouchdowns: "receiving-touchdowns",
    interceptions: categoryKey.indexOf("pass") !== -1 ? "interceptions-thrown" : "interceptions",
    int: categoryKey.indexOf("pass") !== -1 ? "interceptions-thrown" : "interceptions",
    receptions: "receptions",
    rec: "receptions",
    targets: "receiving-targets",
    tgts: "receiving-targets",
    carries: "rushing-attempts",
    car: "rushing-attempts",
    atbats: "at-bats",
    earnedruns: "earned-runs",
    inningspitched: "innings-pitched",
    walks: categoryKey.indexOf("pitch") !== -1 ? "pitching-walks" : "walks",
    hits: categoryKey.indexOf("pitch") !== -1 ? "hits-allowed" : "hits",
    runs: categoryKey.indexOf("pitch") !== -1 ? "runs-allowed" : "runs",

    // Basketball
    oreb: "offensive-rebounds",
    offensiverebounds: "offensive-rebounds",
    dreb: "defensive-rebounds",
    defensiverebounds: "defensive-rebounds",
    reb: "rebounds",
    rebounds: "rebounds",
    ast: "assists",
    assists: "assists",
    stl: "steals",
    steals: "steals",
    blk: sportKey === "hockey" ? "blocked-shots" : "blocks",
    blocks: sportKey === "hockey" ? "blocked-shots" : "blocks",
    to: "turnovers",
    tov: "turnovers",
    turnovers: "turnovers",
    pf: "fouls",
    personalfouls: "fouls",
    fouls: "fouls",
    plusminus: "plus-minus",

    // Hockey
    g: sportKey === "soccer" || sportKey === "hockey" ? "goals" : "games",
    goals: "goals",
    a: "assists",
    sog: sportKey === "soccer" ? "shots-on-target" : "shots-on-goal",
    shotsongoal: sportKey === "soccer" ? "shots-on-target" : "shots-on-goal",
    shotsontarget: "shots-on-target",
    shots: "shots",
    s: "shots",
    pim: "penalty-minutes",
    penaltyminutes: "penalty-minutes",
    hitsdelivered: "hits",
    faceoffwins: "faceoff-wins",
    faceoffpercentage: "faceoff-percentage",
    fo: "faceoff-wins",
    saves: "saves",
    sv: "saves",
    goalsagainst: "goals-against",
    ga: "goals-against",
    savepercentage: "save-percentage",
    svpct: "save-percentage",

    // Soccer
    totalshots: "shots",
    sh: "shots",
    fc: "fouls-committed",
    foulscommitted: "fouls-committed",
    fs: "fouls-suffered",
    foulssuffered: "fouls-suffered",
    yc: "yellow-cards",
    yellowcards: "yellow-cards",
    rc: "red-cards",
    redcards: "red-cards",
    off: "offsides",
    offsides: "offsides",
    tkl: "tackles",
    tackles: "tackles",
    clr: "clearances",
    clearances: "clearances",
    interceptionswon: "interceptions",
    passescompleted: "passes-completed",
    completedpasses: "passes-completed",
    passattempts: "passes-attempted",
    passesattempted: "passes-attempted",
    chancescreated: "chances-created",
    keypasses: "chances-created"
  };

  if (aliases[compactName]) return aliases[compactName];
  if (aliases[labelKey]) return aliases[labelKey];

  if (nameKey && ["yds", "td", "avg", "fg", "3pt", "ft"].indexOf(nameKey) === -1) {
    return nameKey;
  }

  if (labelKey === "yds") {
    if (categoryKey.indexOf("pass") !== -1) return "passing-yards";
    if (categoryKey.indexOf("rush") !== -1) return "rushing-yards";
    if (categoryKey.indexOf("receiv") !== -1) return "receiving-yards";
  }

  if (labelKey === "td") {
    if (categoryKey.indexOf("pass") !== -1) return "passing-touchdowns";
    if (categoryKey.indexOf("rush") !== -1) return "rushing-touchdowns";
    if (categoryKey.indexOf("receiv") !== -1) return "receiving-touchdowns";
    return "touchdowns";
  }

  if (labelKey === "avg") {
    if (sportKey === "baseball" && categoryKey.indexOf("bat") !== -1) return "batting-average";
    return categoryKey ? categoryKey + "-average" : "average";
  }

  if (compact === "fg") return sportKey === "football" ? "field-goals-made" : "field-goals-made";
  if (compact === "3pt") return "three-pointers-made";
  if (compact === "ft") return "free-throws-made";

  return sportsPlayersSlug_([categoryKey, nameKey || label].filter(Boolean).join("-"));
}

function sportsPlayersShouldTrackStat_(sport, statType) {
  const sportKey = sportsPlayersKey_(sport);
  const key = sportsPlayersSlug_(statType);

  const football = {
    "passing-completions": true, "passing-attempts": true, "passing-yards": true,
    "passing-touchdowns": true, "interceptions-thrown": true,
    "rushing-attempts": true, "rushing-yards": true, "rushing-touchdowns": true,
    "receptions": true, "receiving-targets": true, "receiving-yards": true,
    "receiving-touchdowns": true, "field-goals-made": true,
    "field-goals-attempted": true, "extra-points-made": true,
    "extra-points-attempted": true, "sacks": true, "interceptions": true,
    "tackles": true, "solo-tackles": true
  };

  const baseball = {
    "at-bats": true, "runs": true, "hits": true, "home-runs": true,
    "runs-batted-in": true, "walks": true, "batting-strikeouts": true,
    "stolen-bases": true, "total-bases": true, "batting-average": true,
    "innings-pitched": true, "hits-allowed": true, "runs-allowed": true,
    "earned-runs": true, "pitching-walks": true, "pitching-strikeouts": true,
    "home-runs-allowed": true, "pitches": true, "strikes": true
  };

  const basketball = {
    "minutes": true, "points": true, "field-goals-made": true,
    "field-goals-attempted": true, "three-pointers-made": true,
    "three-pointers-attempted": true, "free-throws-made": true,
    "free-throws-attempted": true, "offensive-rebounds": true,
    "defensive-rebounds": true, "rebounds": true, "assists": true,
    "steals": true, "blocks": true, "turnovers": true, "fouls": true,
    "plus-minus": true
  };

  const hockey = {
    "minutes": true, "goals": true, "assists": true, "points": true,
    "plus-minus": true, "shots": true, "shots-on-goal": true,
    "hits": true, "blocked-shots": true, "penalty-minutes": true,
    "faceoff-wins": true, "faceoff-percentage": true,
    "saves": true, "goals-against": true, "save-percentage": true
  };

  const soccer = {
    "minutes": true, "goals": true, "assists": true, "shots": true,
    "shots-on-target": true, "saves": true, "fouls-committed": true,
    "fouls-suffered": true, "yellow-cards": true, "red-cards": true,
    "offsides": true, "tackles": true, "interceptions": true,
    "clearances": true, "passes-completed": true, "passes-attempted": true,
    "chances-created": true
  };

  if (sportKey === "football") return !!football[key];
  if (sportKey === "baseball") return !!baseball[key];
  if (sportKey === "basketball") return !!basketball[key];
  if (sportKey === "hockey") return !!hockey[key];
  if (sportKey === "soccer") return !!soccer[key];
  return false;
}

function sportsPlayersCompositeStats_(sport, category, label, displayValue) {
  const raw = sportsPlayersString_(displayValue);
  const compactLabel = sportsPlayersKey_(label).replace(/[^a-z0-9]+/g, "");
  const match = raw.match(/^\s*(\d+)\s*[\/-]\s*(\d+)\s*$/);

  if (!match) return [];

  const first = Number(match[1]);
  const second = Number(match[2]);
  const categoryKey = sportsPlayersSlug_(category);

  if (compactLabel === "catt" || compactLabel === "cmpatt") {
    return [
      { StatType: "passing-completions", StatValue: first, DisplayValue: String(first) },
      { StatType: "passing-attempts", StatValue: second, DisplayValue: String(second) }
    ];
  }

  if (compactLabel === "fg" && categoryKey.indexOf("kick") !== -1) {
    return [
      { StatType: "field-goals-made", StatValue: first, DisplayValue: String(first) },
      { StatType: "field-goals-attempted", StatValue: second, DisplayValue: String(second) }
    ];
  }

  if (compactLabel === "xp") {
    return [
      { StatType: "extra-points-made", StatValue: first, DisplayValue: String(first) },
      { StatType: "extra-points-attempted", StatValue: second, DisplayValue: String(second) }
    ];
  }

  if (compactLabel === "fg") {
    return [
      { StatType: "field-goals-made", StatValue: first, DisplayValue: String(first) },
      { StatType: "field-goals-attempted", StatValue: second, DisplayValue: String(second) }
    ];
  }

  if (compactLabel === "3pt") {
    return [
      { StatType: "three-pointers-made", StatValue: first, DisplayValue: String(first) },
      { StatType: "three-pointers-attempted", StatValue: second, DisplayValue: String(second) }
    ];
  }

  if (compactLabel === "ft") {
    return [
      { StatType: "free-throws-made", StatValue: first, DisplayValue: String(first) },
      { StatType: "free-throws-attempted", StatValue: second, DisplayValue: String(second) }
    ];
  }

  if (compactLabel === "pcst") {
    return [
      { StatType: "pitches", StatValue: first, DisplayValue: String(first) },
      { StatType: "strikes", StatValue: second, DisplayValue: String(second) }
    ];
  }

  return [];
}

function sportsPlayersStatNumericValue_(statType, displayValue) {
  const raw = sportsPlayersString_(displayValue);
  if (!raw) return "";

  if (sportsPlayersSlug_(statType) === "minutes") {
    const time = raw.match(/^(\d+):(\d{1,2})$/);
    if (time) {
      return Number(time[1]) + Number(time[2]) / 60;
    }
  }

  return sportsPlayersNumber_(raw, "");
}

function sportsPlayersNormalizeStatCells_(sport, category, statGroup, athleteEntry) {
  const labels = statGroup.labels || statGroup.abbreviations || [];
  const names = statGroup.names || statGroup.keys || [];
  const values = athleteEntry.stats || athleteEntry.statistics || [];
  const rows = [];
  const max = Math.max(labels.length, names.length, values.length);

  for (let i = 0; i < max; i++) {
    const label = sportsPlayersString_(labels[i] || names[i]);
    const rawName = sportsPlayersString_(names[i] || label);
    const displayValue = sportsPlayersString_(values[i]);

    if (!displayValue || displayValue === "--" || displayValue.toUpperCase() === "DNP") continue;

    const composite = sportsPlayersCompositeStats_(sport, category, label, displayValue);
    if (composite.length) {
      composite.forEach(function(item) {
        if (sportsPlayersShouldTrackStat_(sport, item.StatType)) rows.push(item);
      });
      continue;
    }

    const statType = sportsPlayersStatAlias_(sport, category, rawName, label);
    if (!statType || !sportsPlayersShouldTrackStat_(sport, statType)) continue;

    const statValue = sportsPlayersStatNumericValue_(statType, displayValue);
    if (statValue === "") continue;

    rows.push({
      StatType: statType,
      StatValue: statValue,
      DisplayValue: displayValue
    });
  }

  return rows;
}

function sportsPlayersNormalizeLooseStatistics_(sport, category, statistics) {
  const rows = [];
  if (!statistics) return rows;

  const items = Array.isArray(statistics)
    ? statistics
    : Object.keys(statistics).map(function(key) {
        const value = statistics[key];
        return value && typeof value === "object"
          ? Object.assign({ name: key }, value)
          : { name: key, value: value, displayValue: value };
      });

  items.forEach(function(stat) {
    if (stat === null || stat === undefined) return;
    if (typeof stat !== "object") return;

    const rawName = sportsPlayersString_(stat.name || stat.key || stat.abbreviation || stat.label || stat.displayName);
    const label = sportsPlayersString_(stat.displayName || stat.shortDisplayName || stat.label || stat.abbreviation || rawName);
    const displayValue = sportsPlayersString_(
      stat.displayValue !== undefined ? stat.displayValue :
      (stat.value !== undefined ? stat.value : stat.stat)
    );
    if (!rawName || !displayValue || displayValue === "--" || displayValue.toUpperCase() === "DNP") return;

    const composite = sportsPlayersCompositeStats_(sport, category, label, displayValue);
    if (composite.length) {
      composite.forEach(function(item) {
        if (sportsPlayersShouldTrackStat_(sport, item.StatType)) rows.push(item);
      });
      return;
    }

    const statType = sportsPlayersStatAlias_(sport, category, rawName, label);
    if (!statType || !sportsPlayersShouldTrackStat_(sport, statType)) return;
    const statValue = sportsPlayersStatNumericValue_(statType, displayValue);
    if (statValue === "") return;

    rows.push({ StatType: statType, StatValue: statValue, DisplayValue: displayValue });
  });

  return rows;
}

function sportsPlayersFindScoreById_(gameId, espnEventId) {
  if (typeof readSportsScoresRows_ !== "function") return null;

  const targetGameId = sportsPlayersString_(gameId);
  const targetEventId = sportsPlayersString_(espnEventId);
  const scores = readSportsScoresRows_();

  for (let i = 0; i < scores.length; i++) {
    if (targetGameId && sportsPlayersString_(scores[i].GameId) === targetGameId) return scores[i];
    if (targetEventId && sportsPlayersString_(scores[i].ESPNEventId) === targetEventId) return scores[i];
  }

  return null;
}

function sportsPlayersNormalizeSummary_(summary, score) {
  summary = summary || {};
  score = score || {};

  const boxscore = summary.boxscore || {};
  const teamGroups = boxscore.players || [];
  const statRows = [];
  const playerRows = [];
  const now = new Date();
  const sport = sportsPlayersKey_(score.Sport);
  const league = sportsPlayersKey_(score.League);
  const gameId = sportsPlayersString_(score.GameId || (league + "_" + score.ESPNEventId));
  const eventId = sportsPlayersString_(score.ESPNEventId);
  const completed = sportsPlayersBoolean_(score.Completed, false);

  teamGroups.forEach(function(teamGroup) {
    const team = teamGroup.team || {};
    const teamId = sportsPlayersString_(team.id);
    const teamName = sportsPlayersTeamName_(team);

    (teamGroup.statistics || []).forEach(function(statGroup) {
      const category = sportsPlayersString_(statGroup.name || statGroup.displayName || statGroup.shortDisplayName);

      (statGroup.athletes || []).forEach(function(athleteEntry) {
        const athlete = athleteEntry.athlete || athleteEntry.player || {};
        const espnPlayerId = sportsPlayersString_(athlete.id || athlete.uid);
        const playerName = sportsPlayersString_(athlete.fullName || athlete.displayName || athlete.shortName);

        if (!espnPlayerId || !playerName) return;

        const playerId = sportsPlayersPlayerId_(league, espnPlayerId);
        const position = sportsPlayersPosition_(athlete);

        playerRows.push({
          PlayerId: playerId,
          ESPNPlayerId: espnPlayerId,
          Sport: sport,
          League: league,
          TeamId: teamId || sportsPlayersString_(athlete.team && athlete.team.id),
          Team: teamName,
          TeamAbbreviation: sportsPlayersTeamAbbreviation_(team || athlete.team),
          FullName: playerName,
          ShortName: sportsPlayersString_(athlete.shortName || athlete.displayName || playerName),
          Position: position,
          JerseyNumber: sportsPlayersString_(athlete.jersey || athlete.jerseyNumber),
          HeadshotUrl: sportsPlayersGetHeadshot_(athlete),
          Active: true,
          LastUpdated: now,
          Source: "ESPN_GAME_SUMMARY"
        });

        sportsPlayersNormalizeStatCells_(sport, category, statGroup, athleteEntry).forEach(function(stat) {
          statRows.push({
            GameId: gameId,
            ESPNEventId: eventId,
            PlayerId: playerId,
            ESPNPlayerId: espnPlayerId,
            Sport: sport,
            League: league,
            TeamId: teamId || sportsPlayersString_(athlete.team && athlete.team.id),
            TeamAbbreviation: sportsPlayersTeamAbbreviation_(team || athlete.team),
            PlayerName: playerName,
            Position: position,
            StatType: stat.StatType,
            StatValue: stat.StatValue,
            DisplayValue: stat.DisplayValue,
            Completed: completed,
            LastUpdated: now,
            Source: "ESPN_GAME_SUMMARY"
          });
        });
      });
    });
  });

  // Soccer summaries and some tournament feeds expose player rows under
  // summary.rosters instead of boxscore.players. Normalize both shapes.
  (summary.rosters || []).forEach(function(rosterGroup) {
    const team = rosterGroup.team || {};
    const teamId = sportsPlayersString_(team.id || team.uid);
    const teamName = sportsPlayersTeamName_(team);
    const teamAbbreviation = sportsPlayersTeamAbbreviation_(team);
    const roster = rosterGroup.roster || rosterGroup.athletes || rosterGroup.entries || [];

    (roster || []).forEach(function(athleteEntry) {
      const athlete = athleteEntry.athlete || athleteEntry.player || athleteEntry || {};
      const espnPlayerId = sportsPlayersString_(athlete.id || athlete.uid);
      const playerName = sportsPlayersString_(athlete.fullName || athlete.displayName || athlete.shortName || athlete.name);
      if (!espnPlayerId || !playerName) return;

      const playerId = sportsPlayersPlayerId_(league, espnPlayerId);
      const position = sportsPlayersPosition_(athleteEntry.position ? athleteEntry : athlete);
      const resolvedTeamId = teamId || sportsPlayersString_(athlete.team && athlete.team.id);

      playerRows.push({
        PlayerId: playerId,
        ESPNPlayerId: espnPlayerId,
        Sport: sport,
        League: league,
        TeamId: resolvedTeamId,
        Team: teamName || sportsPlayersTeamName_(athlete.team),
        TeamAbbreviation: teamAbbreviation || sportsPlayersTeamAbbreviation_(athlete.team),
        FullName: playerName,
        ShortName: sportsPlayersString_(athlete.shortName || athlete.displayName || playerName),
        Position: position,
        JerseyNumber: sportsPlayersString_(athleteEntry.jersey || athlete.jersey || athlete.jerseyNumber),
        HeadshotUrl: sportsPlayersGetHeadshot_(athlete),
        Active: true,
        LastUpdated: now,
        Source: "ESPN_GAME_ROSTER"
      });

      const looseStats = athleteEntry.statistics || athleteEntry.stats || athlete.statistics || [];
      sportsPlayersNormalizeLooseStatistics_(sport, rosterGroup.name || "roster", looseStats).forEach(function(stat) {
        statRows.push({
          GameId: gameId,
          ESPNEventId: eventId,
          PlayerId: playerId,
          ESPNPlayerId: espnPlayerId,
          Sport: sport,
          League: league,
          TeamId: resolvedTeamId,
          TeamAbbreviation: teamAbbreviation || sportsPlayersTeamAbbreviation_(athlete.team),
          PlayerName: playerName,
          Position: position,
          StatType: stat.StatType,
          StatValue: stat.StatValue,
          DisplayValue: stat.DisplayValue,
          Completed: completed,
          LastUpdated: now,
          Source: "ESPN_GAME_ROSTER"
        });
      });
    });
  });

  const playersById = {};
  playerRows.forEach(function(row) {
    if (row.PlayerId) playersById[row.PlayerId] = row;
  });
  const statsByKey = {};
  statRows.forEach(function(row) {
    const key = [row.GameId, row.PlayerId, row.StatType].join("|");
    if (row.GameId && row.PlayerId && row.StatType) statsByKey[key] = row;
  });

  return {
    players: Object.keys(playersById).map(function(key) { return playersById[key]; }),
    stats: Object.keys(statsByKey).map(function(key) { return statsByKey[key]; })
  };
}

function refreshSportsPlayerGameStatsForGame(gameId, espnEventId) {
  const score = sportsPlayersFindScoreById_(gameId, espnEventId);

  if (!score) {
    throw new Error("SportsScores game not found for gameId/espnEventId");
  }

  const sport = sportsPlayersKey_(score.Sport);
  const league = sportsPlayersKey_(score.League);
  const eventId = sportsPlayersString_(score.ESPNEventId);

  if (!sport || !league || !eventId) {
    throw new Error("SportsScores row is missing Sport, League, or ESPNEventId");
  }

  if (sport === "racing") {
    throw new Error("Racing stats belong in the separate Racing Score Engine");
  }

  sportsPlayersAssertSupportedLeague_(league, sport);

  const summary = sportsPlayersFetchJson_(
    sportsPlayersSummaryUrl_(sport, league, eventId),
    "ESPN game summary"
  );

  const normalized = sportsPlayersNormalizeSummary_(summary, score);
  const playerWrite = upsertSportsPlayersRows_(normalized.players, {});
  const statsWrite = upsertSportsPlayerGameStatsRows_(normalized.stats);

  return {
    success: true,
    gameId: sportsPlayersString_(score.GameId),
    espnEventId: eventId,
    sport: sport,
    league: league,
    completed: sportsPlayersBoolean_(score.Completed, false),
    playersFound: normalized.players.length,
    statsFound: normalized.stats.length,
    playerWrite: playerWrite,
    statsWrite: statsWrite,
    lastUpdated: new Date()
  };
}

function sportsPlayersCurrentGames_(league, sport, options) {
  options = options || {};

  if (typeof readSportsScoresRows_ !== "function") {
    throw new Error("readSportsScoresRows_ is not available");
  }

  const resolved = sportsPlayersResolveLeague_(league, sport);
  sportsPlayersAssertSupportedLeague_(resolved.League, resolved.Sport);
  const gameId = sportsPlayersString_(options.gameId);
  const espnEventId = sportsPlayersString_(options.espnEventId);
  const daysBack = Math.max(0, Number(options.daysBack === undefined ? SPORTS_PLAYERS_DEFAULT_DAYS_BACK : options.daysBack));
  const daysForward = Math.max(0, Number(options.daysForward === undefined ? SPORTS_PLAYERS_DEFAULT_DAYS_FORWARD : options.daysForward));
  const maxGames = Math.max(1, Math.min(50, Number(options.maxGames || SPORTS_PLAYERS_DEFAULT_MAX_GAMES)));
  const today = sportsPlayersSafeDateOnly_(new Date());
  const start = sportsPlayersAddDays_(today, -daysBack);
  const end = sportsPlayersAddDays_(today, daysForward);

  return readSportsScoresRows_().filter(function(score) {
    if (sportsPlayersKey_(score.Sport) !== resolved.Sport) return false;
    if (sportsPlayersKey_(score.League) !== resolved.League) return false;
    if (gameId && sportsPlayersString_(score.GameId) !== gameId) return false;
    if (espnEventId && sportsPlayersString_(score.ESPNEventId) !== espnEventId) return false;

    if (gameId || espnEventId) return true;

    const state = sportsPlayersKey_(score.State);
    const completed = sportsPlayersBoolean_(score.Completed, false);
    const dateOnly = sportsPlayersSafeDateOnly_(score.GameDateTime);

    if (!completed && state !== "in" && state !== "post") return false;
    if (dateOnly && (dateOnly < start || dateOnly > end)) return false;

    return true;
  }).sort(function(a, b) {
    return new Date(a.GameDateTime || 0).getTime() - new Date(b.GameDateTime || 0).getTime();
  }).slice(0, maxGames);
}

function refreshCurrentSportsPlayerGameStats(league, sport, options) {
  const games = sportsPlayersCurrentGames_(league, sport, options || {});
  const summary = {
    success: true,
    league: sportsPlayersKey_(league),
    gamesFound: games.length,
    gamesRefreshed: 0,
    playersFound: 0,
    statsFound: 0,
    results: [],
    errors: [],
    startedAt: new Date()
  };

  const allPlayers = [];
  const allStats = [];

  games.forEach(function(game) {
    try {
      const sportKey = sportsPlayersKey_(game.Sport);
      const leagueKey = sportsPlayersKey_(game.League);
      const eventId = sportsPlayersString_(game.ESPNEventId);

      sportsPlayersAssertSupportedLeague_(leagueKey, sportKey);

      const payload = sportsPlayersFetchJson_(
        sportsPlayersSummaryUrl_(sportKey, leagueKey, eventId),
        "ESPN game summary"
      );

      const normalized = sportsPlayersNormalizeSummary_(payload, game);

      normalized.players.forEach(function(row) { allPlayers.push(row); });
      normalized.stats.forEach(function(row) { allStats.push(row); });

      summary.results.push({
        success: true,
        gameId: sportsPlayersString_(game.GameId),
        espnEventId: eventId,
        playersFound: normalized.players.length,
        statsFound: normalized.stats.length
      });
      summary.gamesRefreshed++;
      summary.playersFound += normalized.players.length;
      summary.statsFound += normalized.stats.length;
    } catch (error) {
      summary.errors.push({
        gameId: sportsPlayersString_(game.GameId),
        espnEventId: sportsPlayersString_(game.ESPNEventId),
        error: error && error.message ? error.message : String(error)
      });
    }
  });

  summary.playerWrite = upsertSportsPlayersRows_(allPlayers, {});
  summary.statsWrite = upsertSportsPlayerGameStatsRows_(allStats);
  summary.success = summary.errors.length === 0;
  summary.partial = summary.errors.length > 0 && summary.gamesRefreshed > 0;
  summary.finishedAt = new Date();

  if (typeof logSports_ === "function") {
    logSports_(
      summary.errors.length ? "WARN" : "INFO",
      "refreshCurrentSportsPlayerGameStats",
      "Current sports player game-stat refresh complete",
      JSON.stringify(summary)
    );
  }

  return summary;
}

/* =====================================================
   STATUS
===================================================== */

function getSportsPlayersStatus_() {
  const players = readSportsPlayersRows_();
  const stats = readSportsPlayerGameStatsRows_();
  const leagues = {};

  function ensureLeague_(league, sport) {
    const key = sportsPlayersKey_(league);
    if (!key) return null;

    if (!leagues[key]) {
      leagues[key] = {
        sport: sportsPlayersKey_(sport),
        league: key,
        playerCount: 0,
        activePlayerCount: 0,
        statRowCount: 0,
        lastPlayerUpdated: "",
        lastStatsUpdated: ""
      };
    }

    return leagues[key];
  }

  players.forEach(function(player) {
    const row = ensureLeague_(player.League, player.Sport);
    if (!row) return;

    row.playerCount++;
    if (sportsPlayersBoolean_(player.Active, false)) row.activePlayerCount++;

    const updated = player.LastUpdated instanceof Date ? player.LastUpdated : new Date(player.LastUpdated || 0);
    const current = row.lastPlayerUpdated ? new Date(row.lastPlayerUpdated) : new Date(0);
    if (!isNaN(updated.getTime()) && updated > current) row.lastPlayerUpdated = updated;
  });

  stats.forEach(function(stat) {
    const row = ensureLeague_(stat.League, stat.Sport);
    if (!row) return;

    row.statRowCount++;

    const updated = stat.LastUpdated instanceof Date ? stat.LastUpdated : new Date(stat.LastUpdated || 0);
    const current = row.lastStatsUpdated ? new Date(row.lastStatsUpdated) : new Date(0);
    if (!isNaN(updated.getTime()) && updated > current) row.lastStatsUpdated = updated;
  });

  return {
    success: true,
    version: "1.1.0",
    playerCount: players.length,
    statRowCount: stats.length,
    leagues: Object.keys(leagues).sort().map(function(key) { return leagues[key]; }),
    checkedAt: new Date()
  };
}

/* =====================================================
   PUBLIC READ-ONLY API ACTIONS
===================================================== */

function apiGetSportsPlayers_(params) {
  params = params || {};

  const playerId = sportsPlayersString_(params.playerId || params.sportsPlayerId);
  const espnPlayerId = sportsPlayersString_(params.espnPlayerId || params.ESPNPlayerId);
  const sport = sportsPlayersKey_(params.sport);
  const league = sportsPlayersKey_(params.league);
  const teamId = sportsPlayersString_(params.teamId);
  const team = sportsPlayersKey_(params.team);
  const search = sportsPlayersKey_(params.search || params.q);
  const activeFilter = params.active === undefined || params.active === ""
    ? null
    : sportsPlayersBoolean_(params.active, false);
  const limit = Math.max(1, Math.min(5000, Number(params.limit || 1000)));

  const players = readSportsPlayersRows_().filter(function(player) {
    if (playerId && sportsPlayersString_(player.PlayerId) !== playerId) return false;
    if (espnPlayerId && sportsPlayersString_(player.ESPNPlayerId) !== espnPlayerId) return false;
    if (sport && sportsPlayersKey_(player.Sport) !== sport) return false;
    if (league && sportsPlayersKey_(player.League) !== league) return false;
    if (teamId && sportsPlayersString_(player.TeamId) !== teamId) return false;
    if (team && sportsPlayersKey_(player.Team).indexOf(team) === -1) return false;
    if (activeFilter !== null && sportsPlayersBoolean_(player.Active, false) !== activeFilter) return false;

    if (search) {
      const haystack = [player.FullName, player.ShortName, player.Team, player.Position, player.JerseyNumber]
        .map(sportsPlayersKey_)
        .join(" ");
      if (haystack.indexOf(search) === -1) return false;
    }

    return true;
  }).sort(function(a, b) {
    const teamCompare = sportsPlayersString_(a.Team).localeCompare(sportsPlayersString_(b.Team));
    if (teamCompare) return teamCompare;
    return sportsPlayersString_(a.FullName).localeCompare(sportsPlayersString_(b.FullName));
  }).slice(0, limit);

  return {
    success: true,
    count: players.length,
    players: players,
    filters: {
      playerId: playerId,
      espnPlayerId: espnPlayerId,
      sport: sport,
      league: league,
      teamId: teamId,
      team: team,
      active: activeFilter,
      search: search
    },
    timestamp: new Date()
  };
}

function apiGetSportsPlayerGameStats_(params) {
  params = params || {};

  const gameId = sportsPlayersString_(params.gameId || params.sportsGameId);
  const espnEventId = sportsPlayersString_(params.espnEventId || params.ESPNEventId);
  const playerId = sportsPlayersString_(params.playerId || params.sportsPlayerId);
  const espnPlayerId = sportsPlayersString_(params.espnPlayerId || params.ESPNPlayerId);
  const sport = sportsPlayersKey_(params.sport);
  const league = sportsPlayersKey_(params.league);
  const statType = sportsPlayersSlug_(params.statType || params.sportsStatType);
  const completedFilter = params.completed === undefined || params.completed === ""
    ? null
    : sportsPlayersBoolean_(params.completed, false);
  const limit = Math.max(1, Math.min(10000, Number(params.limit || 5000)));

  const stats = readSportsPlayerGameStatsRows_().filter(function(stat) {
    if (gameId && sportsPlayersString_(stat.GameId) !== gameId) return false;
    if (espnEventId && sportsPlayersString_(stat.ESPNEventId) !== espnEventId) return false;
    if (playerId && sportsPlayersString_(stat.PlayerId) !== playerId) return false;
    if (espnPlayerId && sportsPlayersString_(stat.ESPNPlayerId) !== espnPlayerId) return false;
    if (sport && sportsPlayersKey_(stat.Sport) !== sport) return false;
    if (league && sportsPlayersKey_(stat.League) !== league) return false;
    if (statType && sportsPlayersSlug_(stat.StatType) !== statType) return false;
    if (completedFilter !== null && sportsPlayersBoolean_(stat.Completed, false) !== completedFilter) return false;
    return true;
  }).sort(function(a, b) {
    const gameCompare = sportsPlayersString_(a.GameId).localeCompare(sportsPlayersString_(b.GameId));
    if (gameCompare) return gameCompare;
    const playerCompare = sportsPlayersString_(a.PlayerName).localeCompare(sportsPlayersString_(b.PlayerName));
    if (playerCompare) return playerCompare;
    return sportsPlayersString_(a.StatType).localeCompare(sportsPlayersString_(b.StatType));
  }).slice(0, limit);

  return {
    success: true,
    count: stats.length,
    stats: stats,
    filters: {
      gameId: gameId,
      espnEventId: espnEventId,
      playerId: playerId,
      espnPlayerId: espnPlayerId,
      sport: sport,
      league: league,
      statType: statType,
      completed: completedFilter
    },
    timestamp: new Date()
  };
}

/* =====================================================
   PROTECTED ADMIN API ACTIONS
===================================================== */

function apiSetupSportsPlayersAdmin_(params) {
  assertSportsAdmin_(params || {});
  return setupSportsPlayersSystem();
}

function apiSyncSportsPlayersAdmin_(params) {
  params = params || {};
  assertSportsAdmin_(params);
  return syncSportsPlayersForLeague(params.league, params.sport);
}

function apiRefreshSportsPlayerGameStatsAdmin_(params) {
  params = params || {};
  assertSportsAdmin_(params);

  if (params.gameId || params.espnEventId) {
    return refreshSportsPlayerGameStatsForGame(params.gameId, params.espnEventId);
  }

  return refreshCurrentSportsPlayerGameStats(params.league, params.sport, {
    daysBack: params.daysBack,
    daysForward: params.daysForward,
    maxGames: params.maxGames
  });
}

function apiGetSportsPlayerStatusAdmin_(params) {
  assertSportsAdmin_(params || {});
  return getSportsPlayersStatus_();
}

/* =====================================================
   MANUAL TEST HELPERS
===================================================== */

function testSetupSportsPlayersSystem() {
  return setupSportsPlayersSystem();
}

function testSyncNFLPlayers() {
  return syncSportsPlayersForLeague("nfl", "football");
}

function testSyncMLBPlayers() {
  return syncSportsPlayersForLeague("mlb", "baseball");
}

function testSyncNBAPlayers() {
  return syncSportsPlayersForLeague("nba", "basketball");
}

function testSyncWNBAPlayers() {
  return syncSportsPlayersForLeague("wnba", "basketball");
}

function testSyncNHLPlayers() {
  return syncSportsPlayersForLeague("nhl", "hockey");
}

function testSyncCollegeFootballPlayers() {
  return syncSportsPlayersForLeague("college-football", "football");
}

function testSyncMensCollegeBasketballPlayers() {
  return syncSportsPlayersForLeague("mens-college-basketball", "basketball");
}

function testSyncWomensCollegeBasketballPlayers() {
  return syncSportsPlayersForLeague("womens-college-basketball", "basketball");
}

function testSyncMLSPlayers() {
  return syncSportsPlayersForLeague("usa.1", "soccer");
}

function testSyncSoccerLeaguePlayers(league) {
  league = sportsPlayersKey_(league || "usa.1");
  return syncSportsPlayersForLeague(league, "soccer");
}

function testRefreshNFLCurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("nfl", "football", {});
}

function testRefreshMLBCurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("mlb", "baseball", {});
}

function testRefreshNBACurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("nba", "basketball", {});
}

function testRefreshWNBACurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("wnba", "basketball", {});
}

function testRefreshNHLCurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("nhl", "hockey", {});
}

function testRefreshCollegeFootballCurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("college-football", "football", {});
}

function testRefreshMensCollegeBasketballCurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("mens-college-basketball", "basketball", {});
}

function testRefreshWomensCollegeBasketballCurrentPlayerStats() {
  return refreshCurrentSportsPlayerGameStats("womens-college-basketball", "basketball", {});
}

function testRefreshSoccerCurrentPlayerStats(league) {
  league = sportsPlayersKey_(league || "usa.1");
  return refreshCurrentSportsPlayerGameStats(league, "soccer", {});
}

function testSportsPlayersStatParser() {
  const nflSummary = {
    boxscore: {
      players: [{
        team: { id: "12", displayName: "Kansas City Chiefs" },
        statistics: [{
          name: "passing",
          labels: ["C/ATT", "YDS", "TD", "INT"],
          athletes: [{
            athlete: {
              id: "3139477",
              fullName: "Patrick Mahomes",
              shortName: "P. Mahomes",
              jersey: "15",
              position: { abbreviation: "QB" }
            },
            stats: ["25/32", "327", "3", "1"]
          }]
        }]
      }]
    }
  };

  const parsed = sportsPlayersNormalizeSummary_(nflSummary, {
    GameId: "nfl_test",
    ESPNEventId: "test",
    Sport: "football",
    League: "nfl",
    Completed: true
  });

  const values = {};
  parsed.stats.forEach(function(row) {
    values[row.StatType] = row.StatValue;
  });

  const passed =
    values["passing-completions"] === 25 &&
    values["passing-attempts"] === 32 &&
    values["passing-yards"] === 327 &&
    values["passing-touchdowns"] === 3 &&
    values["interceptions-thrown"] === 1;

  if (!passed) {
    throw new Error("Sports player stat parser self-test failed: " + JSON.stringify(values));
  }

  return {
    success: true,
    message: "Sports player stat parser self-test passed",
    values: values
  };
}

function testGetSportsPlayerStatusAdmin() {

  const adminKey =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        "SPORTS_ADMIN_API_KEY"
      );

  if (!adminKey) {
    throw new Error(
      "Missing Script Property: SPORTS_ADMIN_API_KEY"
    );
  }

  const result =
    apiGetSportsPlayerStatusAdmin_({
      adminKey: adminKey
    });

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}

function testGetSportsPlayerStatusDirect() {
  const result =
    getSportsPlayersStatus_();

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}