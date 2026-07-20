/* =====================================================
   SPORTS WAGER ENGINE
   Bridges the separate Sports Scores Engine into
   Awards App wager games.

   What this does:
   1. Pulls one sports event from the Sports Scores API.
   2. Creates one Awards App category for that matchup.
   3. Creates wager nominees: away/home, or away/draw/home for soccer 3-way.
   4. Stores BettingOdds on the nominee rows.
   5. Settles completed games by updating
      CategorySettings.WinnerNomineeId.

   IMPORTANT:
   This file belongs in the Awards App backend, not inside
   the Sports Scores Engine project.
===================================================== */

/* =====================================================
   CONFIG
===================================================== */

/*
  Prefer Script Properties so the Awards App does not get stuck
  calling an old Sports Scores Engine deployment.

  Set these in Awards App -> Project Settings -> Script Properties:
  - SPORTS_SCORES_ADMIN_API_URL = current Sports Scores Engine web app /exec URL
  - SPORTS_SCORES_ADMIN_API_KEY = current Sports Scores Engine admin key

  The hard-coded URL below is only a last-resort fallback.
*/
const SPORTS_WAGER_API_URL_FALLBACK =
  "https://script.google.com/macros/s/AKfycbwVlgZa1FBvt99dpwr4PbrdBOs9IRcZ6BFlr-t6scTRNcVgQsJKpCWk1d8nxC681Sy0/exec";

const SPORTS_WAGER_API_URL_PROPERTY =
  "SPORTS_SCORES_ADMIN_API_URL";

const SPORTS_WAGER_API_KEY_PROPERTY =
  "SPORTS_SCORES_ADMIN_API_KEY";

const SPORTS_WAGER_API_KEY_FALLBACK_PROPERTY =
  "SPORTS_ADMIN_API_KEY";

/* Backward compatibility for older helper files. */
const SPORTS_WAGER_API_URL =
  SPORTS_WAGER_API_URL_FALLBACK;

const SPORTS_WAGER_DEFAULT_GAME_ID =
  "sports-wagers";

const SPORTS_WAGER_DEFAULT_MARKET =
  "moneyline";

const SPORTS_WAGER_DEFAULT_ODDS =
  2;

const SPORTS_WAGER_DRAW_NOMINEE_ID =
  "draw";

const SPORTS_WAGER_DRAW_RESULT_TYPE =
  "draw";

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsWagerString_(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim();

}

function sportsWagerKey_(value) {

  return sportsWagerString_(value)
    .toLowerCase();

}

function sportsWagerSlug_(value) {

  return sportsWagerString_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function sportsWagerBoolean_(value) {

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "").trim() === "1"
  );

}

function sportsWagerNumber_(value, fallback) {

  const n =
    Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return fallback;
  }

  return n;

}

function sportsWagerNormalizeGameId_(value) {

  return sportsWagerString_(
    value ||
    SPORTS_WAGER_DEFAULT_GAME_ID
  );

}

function sportsWagerNow_() {

  return new Date();

}

function sportsWagerSafeDateValue_(value) {

  if (!value) {
    return "";
  }

  const d =
    new Date(value);

  if (isNaN(d.getTime())) {
    return value;
  }

  return d;

}

function sportsWagerFirstPresent_(
  obj,
  names
) {

  obj =
    obj || {};

  for (let i = 0; i < names.length; i++) {

    const name =
      names[i];

    if (
      obj[name] !== undefined &&
      obj[name] !== null &&
      obj[name] !== ""
    ) {
      return obj[name];
    }

  }

  return "";

}

function sportsWagerIsValidRecordDisplay_(value) {

  value =
    sportsWagerString_(value);

  if (!value) {
    return false;
  }

  const lower =
    value.toLowerCase();

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) {
    return false;
  }

  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value)) {
    return false;
  }

  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(value)) {
    return false;
  }

  if (/^\d{1,2}:\d{2}(?:\s*[ap]m)?$/i.test(value)) {
    return false;
  }

  if (
    /\b(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/i.test(lower) ||
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i.test(lower)
  ) {
    return false;
  }

  return /^\d+\s*-\s*\d+(\s*-\s*\d+)?(\s+[A-Za-z][A-Za-z ]{1,24})?$/.test(value);

}

function sportsWagerCleanRecordDisplay_(value) {

  value =
    sportsWagerString_(value);

  return sportsWagerIsValidRecordDisplay_(value)
    ? value
    : "";

}


function sportsWagerNormalizeScore_(score) {

  score =
    score || {};

  const normalized =
    Object.assign(
      {},
      score
    );

  normalized.GameId =
    sportsWagerFirstPresent_(
      score,
      [
        "GameId",
        "gameId",
        "SportsGameId",
        "sportsGameId",
        "id"
      ]
    );

  normalized.ESPNEventId =
    sportsWagerFirstPresent_(
      score,
      [
        "ESPNEventId",
        "espnEventId",
        "EventId",
        "eventId",
        "event_id"
      ]
    );

  normalized.League =
    sportsWagerFirstPresent_(
      score,
      [
        "League",
        "league",
        "LeagueId",
        "leagueId"
      ]
    );

  normalized.AwayTeam =
    sportsWagerFirstPresent_(
      score,
      [
        "AwayTeam",
        "awayTeam",
        "AwayName",
        "awayName",
        "Away",
        "away"
      ]
    );

  normalized.HomeTeam =
    sportsWagerFirstPresent_(
      score,
      [
        "HomeTeam",
        "homeTeam",
        "HomeName",
        "homeName",
        "Home",
        "home"
      ]
    );

  normalized.AwayRecord =
    sportsWagerCleanRecordDisplay_(
      sportsWagerFirstPresent_(
        score,
        [
          "AwayRecord",
          "awayRecord"
        ]
      )
    );

  normalized.HomeRecord =
    sportsWagerCleanRecordDisplay_(
      sportsWagerFirstPresent_(
        score,
        [
          "HomeRecord",
          "homeRecord"
        ]
      )
    );

  normalized.AwayScore =
    sportsWagerFirstPresent_(
      score,
      [
        "AwayScore",
        "awayScore"
      ]
    );

  normalized.HomeScore =
    sportsWagerFirstPresent_(
      score,
      [
        "HomeScore",
        "homeScore"
      ]
    );

  normalized.Status =
    sportsWagerFirstPresent_(
      score,
      [
        "Status",
        "status",
        "StatusText",
        "statusText"
      ]
    );

  normalized.State =
    sportsWagerFirstPresent_(
      score,
      [
        "State",
        "state",
        "StatusState",
        "statusState"
      ]
    );

  normalized.Clock =
    sportsWagerFirstPresent_(
      score,
      [
        "Clock",
        "clock"
      ]
    );

  normalized.Period =
    sportsWagerFirstPresent_(
      score,
      [
        "Period",
        "period",
        "Quarter",
        "quarter"
      ]
    );

  normalized.Completed =
    sportsWagerFirstPresent_(
      score,
      [
        "Completed",
        "completed"
      ]
    );

  normalized.AwayLogo =
    sportsWagerFirstPresent_(
      score,
      [
        "AwayLogo",
        "awayLogo",
        "AwayLogoUrl",
        "awayLogoUrl"
      ]
    );

  normalized.HomeLogo =
    sportsWagerFirstPresent_(
      score,
      [
        "HomeLogo",
        "homeLogo",
        "HomeLogoUrl",
        "homeLogoUrl"
      ]
    );

  normalized.GameDateTime =
    sportsWagerFirstPresent_(
      score,
      [
        "GameDateTime",
        "gameDateTime",
        "DateTime",
        "dateTime",
        "StartDateTime",
        "startDateTime"
      ]
    );

  return normalized;

}

function sportsWagerScoreMatchesRequest_(
  score,
  sportsGameId,
  espnEventId
) {

  score =
    sportsWagerNormalizeScore_(
      score
    );

  const requestedSportsGameId =
    sportsWagerString_(
      sportsGameId
    );

  const requestedEspnEventId =
    sportsWagerString_(
      espnEventId
    );

  const scoreGameId =
    sportsWagerString_(
      score.GameId
    );

  const scoreEspnEventId =
    sportsWagerString_(
      score.ESPNEventId
    );

  if (
    requestedSportsGameId &&
    scoreGameId &&
    requestedSportsGameId === scoreGameId
  ) {
    return true;
  }

  if (
    requestedEspnEventId &&
    scoreEspnEventId &&
    requestedEspnEventId === scoreEspnEventId
  ) {
    return true;
  }

  return false;

}

function sportsWagerSelectionName_(
  score,
  selection
) {

  score =
    sportsWagerNormalizeScore_(
      score
    );

  selection =
    sportsWagerKey_(
      selection
    );

  if (selection === "home") {
    return sportsWagerString_(
      score.HomeTeam
    );
  }

  if (selection === "away") {
    return sportsWagerString_(
      score.AwayTeam
    );
  }

  if (selection === "draw") {
    return "Draw";
  }

  return "";

}

function sportsWagerGetScriptProperty_(name) {

  try {

    return sportsWagerString_(
      PropertiesService
        .getScriptProperties()
        .getProperty(name)
    );

  } catch (err) {

    return "";

  }

}

function sportsWagerGetApiUrl_() {

  let url =
    sportsWagerGetScriptProperty_(
      SPORTS_WAGER_API_URL_PROPERTY
    );

  if (!url) {
    url = SPORTS_WAGER_API_URL_FALLBACK;
  }

  url =
    sportsWagerString_(url)
      .replace(/\?+$/, "");

  if (!url) {
    throw new Error(
      "Missing Sports Scores Engine URL. Set Script Property " +
      SPORTS_WAGER_API_URL_PROPERTY
    );
  }

  return url;

}

function sportsWagerGetApiKey_() {

  return (
    sportsWagerGetScriptProperty_(
      SPORTS_WAGER_API_KEY_PROPERTY
    ) ||
    sportsWagerGetScriptProperty_(
      SPORTS_WAGER_API_KEY_FALLBACK_PROPERTY
    )
  );

}

function sportsWagerBuildQuery_(params) {

  params = params || {};

  const query = {};

  Object.keys(params)
    .forEach(function(key) {

      const value =
        params[key];

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      query[key] = value;

    });

  const adminKey =
    sportsWagerGetApiKey_();

  if (
    adminKey &&
    query.adminKey === undefined
  ) {
    query.adminKey = adminKey;
  }

  return Object.keys(query)
    .map(function(key) {
      return (
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(query[key])
      );
    })
    .join("&");

}

function sportsWagerFetchJson_(
  params,
  label
) {

  params = params || {};
  label = label || "Sports Scores Engine";

  const query =
    sportsWagerBuildQuery_(params);

  const url =
    sportsWagerGetApiUrl_() +
    (query ? "?" + query : "");

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: "get",
        followRedirects: true,
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  const body =
    response.getContentText();

  let parsed;

  try {

    parsed =
      JSON.parse(body);

  } catch (err) {

    throw new Error(
      label +
      " returned non-JSON. HTTP " +
      code +
      ": " +
      body.slice(0, 350)
    );

  }

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      label +
      " failed. HTTP " +
      code +
      ": " +
      JSON.stringify(parsed).slice(0, 350)
    );
  }

  return parsed;

}

function sportsWagerClampWholeNumber_(
  value,
  fallback,
  min,
  max
) {

  let n =
    sportsWagerNumber_(
      value,
      fallback
    );

  n =
    Math.floor(n);

  if (n < min) {
    n = min;
  }

  if (n > max) {
    n = max;
  }

  return n;

}

function sportsWagerThrowIfUnknownSportsAction_(
  result,
  label
) {

  const message =
    sportsWagerString_(
      result &&
      (
        result.error ||
        result.message ||
        result.reason
      )
    );

  if (
    result &&
    result.success === false &&
    message.indexOf("Unknown action") !== -1
  ) {
    throw new Error(
      label +
      ": " +
      message
    );
  }

  return result;

}

function sportsWagerRefreshScoresEngineNow_() {

  return sportsWagerThrowIfUnknownSportsAction_(
    sportsWagerFetchJson_(
      {
        action:
          "refreshSportsScoresNowAdmin"
      },
      "Sports Scores Engine current refresh"
    ),
    "Sports Scores Engine current refresh"
  );

}

function sportsWagerRefreshScoresEngineWindow_(payload) {

  payload =
    payload || {};

  return sportsWagerThrowIfUnknownSportsAction_(
    sportsWagerFetchJson_(
      {
        action:
          "refreshSportsScoresWindowAdmin",

        daysBack:
          sportsWagerClampWholeNumber_(
            payload.daysBack,
            2,
            0,
            7
          ),

        daysForward:
          sportsWagerClampWholeNumber_(
            payload.daysForward,
            2,
            0,
            14
          )
      },
      "Sports Scores Engine window refresh"
    ),
    "Sports Scores Engine window refresh"
  );

}

function sportsWagerMaybeRefreshScoresEngine_(payload) {

  payload =
    payload || {};

  if (
    !sportsWagerBoolean_(
      payload.refreshEngineFirst
    )
  ) {
    return null;
  }

  const mode =
    sportsWagerKey_(
      payload.scoreRefreshMode ||
      payload.refreshMode ||
      "window"
    );

  try {

    if (
      mode === "now" ||
      mode === "current" ||
      mode === "scoreboard"
    ) {
      return sportsWagerRefreshScoresEngineNow_();
    }

    return sportsWagerRefreshScoresEngineWindow_(
      payload
    );

  } catch (err) {

    if (
      mode !== "now" &&
      mode !== "current" &&
      mode !== "scoreboard"
    ) {

      try {
        return sportsWagerFetchJson_(
          {
            action:
              "runSportsScoresWindowUpdate"
          },
          "Sports Scores Engine window refresh fallback"
        );
      } catch (fallbackErr) {
        // Fall through to current-scoreboard fallback below.
      }

    }

    return sportsWagerFetchJson_(
      {
        action:
          "runSportsScoresUpdate"
      },
      "Sports Scores Engine current refresh fallback"
    );

  }

}



/* =====================================================
   SHEET HELPERS
===================================================== */

function sportsWagerGetSheet_(sheetName) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh) {
    throw new Error(
      "Missing sheet: " + sheetName
    );
  }

  return sh;

}

function sportsWagerGetHeaders_(sheetName) {

  const sh =
    sportsWagerGetSheet_(
      sheetName
    );

  if (sh.getLastRow() < 1) {
    throw new Error(
      sheetName + " sheet has no header row"
    );
  }

  return sh
    .getRange(
      1,
      1,
      1,
      sh.getLastColumn()
    )
    .getValues()[0]
    .map(function(header) {
      return String(header || "").trim();
    });

}

function sportsWagerHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {

    header =
      String(header || "").trim();

    if (!header) {
      return;
    }

    /*
      Important:
      Keep the FIRST matching header.
      If the sheet accidentally has duplicate headers,
      this prevents the new code from writing into a later duplicate.
    */
    if (map[header] === undefined) {
      map[header] = index;
    }

  });

  return map;

}

function sportsWagerSetIfExists_(
  row,
  col,
  header,
  value
) {

  if (
    col[header] !== undefined &&
    col[header] > -1
  ) {
    row[col[header]] = value;
  }

}

function sportsWagerEnsureColumns_(
  sheetName,
  requiredHeaders
) {

  const sh =
    sportsWagerGetSheet_(
      sheetName
    );

  const lastColumn =
    sh.getLastColumn();

  if (lastColumn < 1) {
    throw new Error(
      sheetName + " sheet has no header row"
    );
  }

  const headers =
    sportsWagerGetHeaders_(
      sheetName
    );

  const missing =
    requiredHeaders.filter(function(header) {
      return headers.indexOf(header) === -1;
    });

  if (!missing.length) {
    return {
      success: true,
      added: 0,
      columns: []
    };
  }

  sh
    .getRange(
      1,
      lastColumn + 1,
      1,
      missing.length
    )
    .setValues([
      missing
    ]);

  return {
    success: true,
    added: missing.length,
    columns: missing
  };

}

/* =====================================================
   SETUP
===================================================== */

function setupSportsWagerSystem() {

  const categoriesResult =
    sportsWagerEnsureColumns_(
      CATEGORIES_SHEET,
      [
        "QuestionType",
        "ScoringEngine",
        "SelectionMode",
        "EntryType",
        "OddsMode",
        "ResultSource",
        "SportsProvider",
        "SportsGameId",
        "ESPNEventId",
        "SportsLeague",
        "SportsMarket",
        "SportsSelection",
        "SportsLine",
        "HomeTeam",
        "AwayTeam",
        "HomeRecord",
        "AwayRecord",
        "HomeScore",
        "AwayScore",
        "SportsStatus",
        "SportsState",
        "SportsClock",
        "SportsPeriod",
        "BettingOdds",
        "OddsSource",
        "OddsLastUpdated",
        "LogoUrl"
      ]
    );

  const settingsResult =
    sportsWagerEnsureColumns_(
      CATEGORY_SETTINGS_SHEET,
      [
        "QuestionType",
        "ScoringEngine",
        "SelectionMode",
        "ScoreMode",
        "OddsMode",
        "ResultSource",
        "SettlementStatus",
        "SportsGameId",
        "ESPNEventId",
        "SportsMarket",
        "SportsLeague",
        "WagerResultType",
        "OddsReady",
        "OddsSource",
        "OddsLastUpdated"
      ]
    );

  return {
    success: true,
    message: "Sports wager columns are ready",
    categories: categoriesResult,
    categorySettings: settingsResult
  };

}


function sportsWagerMaybeRefreshOddsEngine_(payload) {

  payload =
    payload || {};

  if (
    payload.refreshOddsEngineFirst === false ||
    payload.skipOddsEngineRefresh === true
  ) {
    return null;
  }

  try {

    return sportsWagerThrowIfUnknownSportsAction_(
      sportsWagerFetchJson_(
        {
          action:
            "runSportsOddsHybridRefresh"
        },
        "Sports Scores Engine odds hybrid refresh"
      ),
      "Sports Scores Engine odds hybrid refresh"
    );

  } catch (err) {

    return {
      success: false,
      error:
        err && err.message
          ? err.message
          : String(err)
    };

  }

}

/* =====================================================
   SPORTS SCORES API FETCH
===================================================== */

function fetchSportsScoreForWager_(payload) {

  payload =
    payload || {};

  const sportsGameId =
    sportsWagerString_(
      payload.sportsGameId ||
      payload.gameId
    );

  const espnEventId =
    sportsWagerString_(
      payload.espnEventId
    );

  if (
    !sportsGameId &&
    !espnEventId
  ) {
    throw new Error(
      "Sports GameId or ESPNEventId is required"
    );
  }

  const params = {
    action: "getSportsScores"
  };

  if (sportsGameId) {
    params.gameId = sportsGameId;
  }

  if (espnEventId) {
    params.espnEventId = espnEventId;
  }

  const result =
    sportsWagerFetchJson_(
      params,
      "Sports Scores API"
    );

  if (!result.success) {
    throw new Error(
      result.error ||
      result.message ||
      "Sports Scores API returned failure"
    );
  }

  let scores =
    result.scores ||
    result.games ||
    result.events ||
    result.data ||
    [];

  if (
    !Array.isArray(scores) &&
    scores
  ) {
    scores = [scores];
  }

  if (
    !scores.length &&
    (
      result.HomeTeam ||
      result.homeTeam ||
      result.AwayTeam ||
      result.awayTeam
    )
  ) {
    scores = [result];
  }

  if (!scores.length) {
    throw new Error(
      "No sports score found for requested GameId / ESPNEventId"
    );
  }

  scores =
    scores.map(function(score) {
      return sportsWagerNormalizeScore_(
        score
      );
    });

  if (
    sportsGameId ||
    espnEventId
  ) {

    const exactMatches =
      scores.filter(function(score) {
        return sportsWagerScoreMatchesRequest_(
          score,
          sportsGameId,
          espnEventId
        );
      });

    if (exactMatches.length) {
      return exactMatches[0];
    }

    if (scores.length > 1) {
      throw new Error(
        "Sports Scores Engine returned multiple games but none matched the requested SportsGameId / ESPNEventId exactly. This update was skipped to prevent writing wrong teams."
      );
    }

  }

  return scores[0];

}

/* =====================================================
   CATEGORY LOOKUPS
===================================================== */

function sportsWagerCategoryExists_(
  awardsGameId,
  categoryId
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined
  ) {
    return false;
  }

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      sportsWagerString_(
        data[i][col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        data[i][col.CategoryId]
      );

    if (
      rowGameId === awardsGameId &&
      rowCategoryId === sportsWagerKey_(categoryId)
    ) {
      return true;
    }

  }

  return false;

}


function sportsWagerExtractEventIdFromCategoryId_(categoryId) {

  const clean =
    sportsWagerKey_(
      categoryId
    );

  if (!clean) {
    return "";
  }

  const parts =
    clean
      .split(/[-_]/)
      .filter(function(part) {
        return part !== "";
      });

  for (let i = parts.length - 1; i >= 0; i--) {

    const part =
      String(parts[i] || "")
        .trim();

    if (/^\d{5,}$/.test(part)) {
      return part;
    }

  }

  return "";

}

function sportsWagerGetCategorySettingsLookup_(awardsGameId) {

  const map = {};

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        CATEGORY_SETTINGS_SHEET
      );

  if (!sh) {
    return map;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return map;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (col.CategoryId === undefined) {
    return map;
  }

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      col.GameId !== undefined
        ? sportsWagerString_(row[col.GameId])
        : "";

    if (
      awardsGameId &&
      rowGameId &&
      rowGameId !== awardsGameId
    ) {
      continue;
    }

    const categoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    if (!categoryId) {
      continue;
    }

    const item = {
      rowNumber:
        i + 1,
      gameId:
        rowGameId,
      exactGameMatch:
        awardsGameId && rowGameId === awardsGameId,
      sportsGameId:
        col.SportsGameId !== undefined
          ? sportsWagerString_(row[col.SportsGameId])
          : "",
      espnEventId:
        col.ESPNEventId !== undefined
          ? sportsWagerString_(row[col.ESPNEventId])
          : "",
      sportsMarket:
        col.SportsMarket !== undefined
          ? sportsWagerNormalizeMarket_(row[col.SportsMarket])
          : ""
    };

    if (
      !map[categoryId] ||
      item.exactGameMatch
    ) {
      map[categoryId] = item;
    }

  }

  return map;

}

function sportsWagerResolveEventIdsForCategory_(
  categoryId,
  rowSportsGameId,
  rowEspnEventId,
  settingsLookup
) {

  const cleanCategoryId =
    sportsWagerKey_(
      categoryId
    );

  const settings =
    settingsLookup && settingsLookup[cleanCategoryId]
      ? settingsLookup[cleanCategoryId]
      : null;

  let sportsGameId =
    sportsWagerString_(
      rowSportsGameId
    );

  let espnEventId =
    sportsWagerString_(
      rowEspnEventId
    );

  if (settings) {

    if (
      settings.sportsGameId &&
      (
        !sportsGameId ||
        settings.exactGameMatch
      )
    ) {
      sportsGameId =
        settings.sportsGameId;
    }

    if (
      settings.espnEventId &&
      (
        !espnEventId ||
        settings.exactGameMatch
      )
    ) {
      espnEventId =
        settings.espnEventId;
    }

  }

  const idFromCategoryId =
    sportsWagerExtractEventIdFromCategoryId_(
      cleanCategoryId
    );

  /*
    Most wager CategoryIds are generated with the ESPN event id at the end.
    If the row IDs disagree with that stable CategoryId, trust the CategoryId
    and fetch by ESPNEventId only. This prevents old/stale row IDs from
    updating a hand-picked wager with the wrong teams.
  */
  if (idFromCategoryId) {

    if (
      sportsGameId !== idFromCategoryId &&
      espnEventId !== idFromCategoryId
    ) {
      sportsGameId = "";
      espnEventId = idFromCategoryId;
    } else if (!espnEventId) {
      espnEventId = idFromCategoryId;
    }

  }

  return {
    sportsGameId:
      sportsGameId,
    espnEventId:
      espnEventId,
    source:
      idFromCategoryId
        ? "category-id"
        : settings
          ? "category-settings"
          : "categories"
  };

}

function sportsWagerGetCategoryRows_(awardsGameId) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const settingsLookup =
    sportsWagerGetCategorySettingsLookup_(
      awardsGameId
    );

  const rows = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      col.GameId !== undefined
        ? sportsWagerString_(row[col.GameId])
        : "";

    if (
      awardsGameId &&
      rowGameId !== awardsGameId
    ) {
      continue;
    }

    const categoryId =
      col.CategoryId !== undefined
        ? sportsWagerKey_(row[col.CategoryId])
        : "";

    const resolvedIds =
      sportsWagerResolveEventIdsForCategory_(
        categoryId,
        col.SportsGameId !== undefined
          ? row[col.SportsGameId]
          : "",
        col.ESPNEventId !== undefined
          ? row[col.ESPNEventId]
          : "",
        settingsLookup
      );

    if (
      !resolvedIds.sportsGameId &&
      !resolvedIds.espnEventId
    ) {
      continue;
    }

    rows.push({
      rowNumber: i + 1,
      gameId: rowGameId,
      categoryId:
        categoryId,
      nomineeId:
        col.NomineeId !== undefined
          ? sportsWagerKey_(row[col.NomineeId])
          : sportsWagerSlug_(
              col.Nominee !== undefined
                ? row[col.Nominee]
                : ""
            ),
      nominee:
        col.Nominee !== undefined
          ? sportsWagerString_(row[col.Nominee])
          : "",
      sportsGameId:
        resolvedIds.sportsGameId,
      espnEventId:
        resolvedIds.espnEventId,
      sportsMarket:
        col.SportsMarket !== undefined
          ? sportsWagerNormalizeMarket_(row[col.SportsMarket])
          : "moneyline",
      sportsLeague:
        col.SportsLeague !== undefined
          ? sportsWagerString_(row[col.SportsLeague])
          : "",
      sportsSelection:
        col.SportsSelection !== undefined
          ? sportsWagerKey_(row[col.SportsSelection])
          : "",
      sportsLine:
        col.SportsLine !== undefined
          ? sportsWagerNumber_(row[col.SportsLine], "")
          : "",
      homeTeam:
        col.HomeTeam !== undefined
          ? sportsWagerString_(row[col.HomeTeam])
          : "",
      awayTeam:
        col.AwayTeam !== undefined
          ? sportsWagerString_(row[col.AwayTeam])
          : "",
      homeScore:
        col.HomeScore !== undefined
          ? row[col.HomeScore]
          : "",
      awayScore:
        col.AwayScore !== undefined
          ? row[col.AwayScore]
          : "",
      sportsStatus:
        col.SportsStatus !== undefined
          ? sportsWagerString_(row[col.SportsStatus])
          : "",
      sportsState:
        col.SportsState !== undefined
          ? sportsWagerString_(row[col.SportsState])
          : "",
      sportsClock:
        col.SportsClock !== undefined
          ? sportsWagerString_(row[col.SportsClock])
          : "",
      sportsPeriod:
        col.SportsPeriod !== undefined
          ? row[col.SportsPeriod]
          : "",
      homeRecord:
        col.HomeRecord !== undefined
          ? sportsWagerString_(row[col.HomeRecord])
          : "",
      awayRecord:
        col.AwayRecord !== undefined
          ? sportsWagerString_(row[col.AwayRecord])
          : ""
    });

  }

  return rows;

}



/* =====================================================
   SPORTS WAGER MARKET + ODDS HELPERS
===================================================== */

const SPORTS_WAGER_MIN_AUTO_ODDS =
  1.35;

const SPORTS_WAGER_MAX_AUTO_ODDS =
  3.75;

const SPORTS_WAGER_AUTO_ODDS_SOURCE =
  "auto-record-v1";

function sportsWagerNormalizeMarket_(market) {

  market =
    sportsWagerKey_(
      market ||
      SPORTS_WAGER_DEFAULT_MARKET ||
      "moneyline"
    );

  if (
    market === "soccer-moneyline" ||
    market === "soccer-3way" ||
    market === "soccer-3-way" ||
    market === "three-way" ||
    market === "3way" ||
    market === "3-way" ||
    market === "moneyline-3way" ||
    market === "moneyline-3-way"
  ) {
    return "soccer-moneyline";
  }

  if (
    market === "h2h" ||
    market === "ml" ||
    market === "moneyline"
  ) {
    return "moneyline";
  }

  if (
    market === "spread" ||
    market === "spreads"
  ) {
    return "spread";
  }

  if (
    market === "total" ||
    market === "totals" ||
    market === "overunder" ||
    market === "over-under"
  ) {
    return "total";
  }

  return "moneyline";

}

function sportsWagerFormatLine_(value) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const n =
    Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return sportsWagerString_(value);
  }

  if (n > 0) {
    return "+" + n;
  }

  return String(n);

}

function sportsWagerMarketLabel_(market) {

  market =
    sportsWagerNormalizeMarket_(market);

  if (market === "soccer-moneyline") {
    return "Soccer 3-Way Moneyline";
  }

  if (market === "spread") {
    return "Spread";
  }

  if (market === "total") {
    return "Total";
  }

  return "Moneyline";

}

function sportsWagerHasScoreValue_(value) {

  return !(
    value === "" ||
    value === null ||
    value === undefined
  );

}

function sportsWagerIsCompletedScore_(score) {

  score = score || {};

  const status =
    sportsWagerKey_(
      score.Status ||
      score.status ||
      ""
    );

  const state =
    sportsWagerKey_(
      score.State ||
      score.state ||
      ""
    );

  return (
    sportsWagerBoolean_(score.Completed) ||
    sportsWagerBoolean_(score.completed) ||
    state === "post" ||
    state === "final" ||
    status.indexOf("final") !== -1 ||
    status.indexOf("full_time") !== -1 ||
    status.indexOf("complete") !== -1 ||
    status.indexOf("completed") !== -1
  );

}

function sportsWagerFindWinnerSideFromScore_(score) {

  score = score || {};

  const explicitSide =
    sportsWagerKey_(
      score.WinnerSide ||
      score.winnerSide ||
      score.WinningSide ||
      ""
    );

  if (
    explicitSide === "home" ||
    explicitSide === "away"
  ) {
    return explicitSide;
  }

  const winnerName =
    sportsWagerString_(
      score.Winner ||
      score.winner ||
      score.WinnerName ||
      score.winnerName ||
      score.WinnerTeam ||
      score.winnerTeam ||
      score.WinningTeam ||
      score.winningTeam ||
      ""
    );

  if (winnerName) {

    const winnerKey =
      sportsWagerKey_(winnerName);

    const winnerSlug =
      sportsWagerSlug_(winnerName);

    const homeTeam =
      sportsWagerString_(
        score.HomeTeam ||
        score.homeTeam ||
        ""
      );

    const awayTeam =
      sportsWagerString_(
        score.AwayTeam ||
        score.awayTeam ||
        ""
      );

    if (
      winnerKey === sportsWagerKey_(homeTeam) ||
      winnerSlug === sportsWagerSlug_(homeTeam)
    ) {
      return "home";
    }

    if (
      winnerKey === sportsWagerKey_(awayTeam) ||
      winnerSlug === sportsWagerSlug_(awayTeam)
    ) {
      return "away";
    }

  }

  if (!sportsWagerIsCompletedScore_(score)) {
    return "";
  }

  if (
    !sportsWagerHasScoreValue_(score.HomeScore) ||
    !sportsWagerHasScoreValue_(score.AwayScore)
  ) {
    return "";
  }

  const homeScore =
    sportsWagerNumber_(
      score.HomeScore,
      null
    );

  const awayScore =
    sportsWagerNumber_(
      score.AwayScore,
      null
    );

  if (
    homeScore === null ||
    awayScore === null ||
    homeScore === awayScore
  ) {
    return "";
  }

  return homeScore > awayScore
    ? "home"
    : "away";

}

function sportsWagerCategoryName_(
  score,
  market
) {

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  return (
    awayTeam +
    " @ " +
    homeTeam +
    " — " +
    sportsWagerMarketLabel_(market)
  );

}

function sportsWagerClamp_(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

}

function sportsWagerRoundOdds_(value) {

  return Math.round(
    Number(value || 0) * 20
  ) / 20;

}

function sportsWagerPayloadHasValue_(value) {

  return String(value || "")
    .trim() !== "";

}

function sportsWagerParseRecord_(recordValue) {

  const text =
    sportsWagerString_(
      recordValue
    );

  if (!text) {
    return null;
  }

  const match =
    text.match(
      /^(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/
    );

  if (!match) {
    return null;
  }

  const wins =
    Number(match[1] || 0);

  const losses =
    Number(match[2] || 0);

  const ties =
    Number(match[3] || 0);

  const games =
    wins + losses + ties;

  if (!games) {
    return null;
  }

  return {
    wins: wins,
    losses: losses,
    ties: ties,
    games: games,
    winPct:
      (wins + ties * 0.5) / games
  };

}

function calculateSportsWagerAutoOdds_(score) {

  score =
    score || {};

  const homeRecord =
    sportsWagerParseRecord_(
      score.HomeRecord
    );

  const awayRecord =
    sportsWagerParseRecord_(
      score.AwayRecord
    );

  if (
    !homeRecord ||
    !awayRecord
  ) {

    return {
      source: "default-no-record",
      homeOdds: SPORTS_WAGER_DEFAULT_ODDS,
      awayOdds: SPORTS_WAGER_DEFAULT_ODDS
    };

  }

  const strengthDiff =
    homeRecord.winPct -
    awayRecord.winPct;

  const homeProbability =
    sportsWagerClamp_(
      0.52 + strengthDiff * 0.9,
      0.27,
      0.73
    );

  const awayProbability =
    1 - homeProbability;

  return {
    source: SPORTS_WAGER_AUTO_ODDS_SOURCE,
    homeOdds:
      sportsWagerClamp_(
        sportsWagerRoundOdds_(
          1 / homeProbability
        ),
        SPORTS_WAGER_MIN_AUTO_ODDS,
        SPORTS_WAGER_MAX_AUTO_ODDS
      ),
    awayOdds:
      sportsWagerClamp_(
        sportsWagerRoundOdds_(
          1 / awayProbability
        ),
        SPORTS_WAGER_MIN_AUTO_ODDS,
        SPORTS_WAGER_MAX_AUTO_ODDS
      )
  };

}

function getSportsWagerRealOddsForScore_(
  score,
  market,
  options
) {

  score =
    score || {};

  options =
    options || {};

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const league =
    sportsWagerString_(
      score.League
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  if (
    !league ||
    !homeTeam ||
    !awayTeam
  ) {
    return null;
  }

  const params = {
    action: "getSportsOdds",
    league: league,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    market: market,
    refreshIfStale:
      options.refreshOddsIfStale === false
        ? "false"
        : "true"
  };

  let result;

  try {

    result =
      sportsWagerFetchJson_(
        params,
        "Sports Scores Engine odds API"
      );

  } catch (err) {

    /*
      Auto Odds can safely fall back to app record/default odds.
      Do not let a missing/unsupported real-odds endpoint keep every
      wager stuck as pending.
    */
    return null;

  }

  if (
    !result.success ||
    result.found === false
  ) {
    return null;
  }

  const odds =
    result.odds ||
    result.data ||
    result;

  const awayOdds =
    odds.awayOdds ||
    odds.AwayOdds ||
    odds.awayDecimalOdds ||
    odds.AwayDecimalOdds ||
    odds.awayPrice ||
    odds.AwayPrice;

  const homeOdds =
    odds.homeOdds ||
    odds.HomeOdds ||
    odds.homeDecimalOdds ||
    odds.HomeDecimalOdds ||
    odds.homePrice ||
    odds.HomePrice;

  if (
    !sportsWagerOddsValueIsReady_(awayOdds) ||
    !sportsWagerOddsValueIsReady_(homeOdds)
  ) {
    return null;
  }

  return {
    success: true,
    found: true,
    awayOdds: awayOdds,
    homeOdds: homeOdds,
    source:
      result.source ||
      odds.source ||
      "sports-scores-odds"
  };

}

function sportsWagerOddsValueIsReady_(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  const n = Number(value);

  return (
    !isNaN(n) &&
    isFinite(n) &&
    n > 0
  );

}

function sportsWagerCleanOddsForSheet_(value) {

  if (!sportsWagerOddsValueIsReady_(value)) {
    return "";
  }

  return Number(value);

}

function buildSportsWagerPendingEntries_(
  score,
  market,
  source
) {

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam || "Away"
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam || "Home"
    );

  const awayLogo =
    sportsWagerString_(
      score.AwayLogo
    );

  const homeLogo =
    sportsWagerString_(
      score.HomeLogo
    );

  if (market === "soccer-moneyline") {

    return {
      source: source || "pending-real-odds",
      oddsReady: false,
      entries: [
        {
          selection: "away",
          name: awayTeam,
          nomineeId: sportsWagerSlug_(awayTeam),
          odds: "",
          line: "",
          logo: awayLogo
        },
        {
          selection: "draw",
          name: "Draw",
          nomineeId: SPORTS_WAGER_DRAW_NOMINEE_ID,
          odds: "",
          line: "",
          logo: ""
        },
        {
          selection: "home",
          name: homeTeam,
          nomineeId: sportsWagerSlug_(homeTeam),
          odds: "",
          line: "",
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "spread") {

    return {
      source: source || "pending-real-odds",
      oddsReady: false,
      entries: [
        {
          selection: "away",
          name: awayTeam + " Spread",
          nomineeId: sportsWagerSlug_(awayTeam + "-spread"),
          odds: "",
          line: "",
          logo: awayLogo
        },
        {
          selection: "home",
          name: homeTeam + " Spread",
          nomineeId: sportsWagerSlug_(homeTeam + "-spread"),
          odds: "",
          line: "",
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "total") {

    return {
      source: source || "pending-real-odds",
      oddsReady: false,
      entries: [
        {
          selection: "over",
          name: "Over",
          nomineeId: "over",
          odds: "",
          line: "",
          logo: ""
        },
        {
          selection: "under",
          name: "Under",
          nomineeId: "under",
          odds: "",
          line: "",
          logo: ""
        }
      ]
    };

  }

  return {
    source: source || "pending-real-odds",
    oddsReady: false,
    entries: [
      {
        selection: "away",
        name: awayTeam,
        nomineeId: sportsWagerSlug_(awayTeam),
        odds: "",
        line: "",
        logo: awayLogo
      },
      {
        selection: "home",
        name: homeTeam,
        nomineeId: sportsWagerSlug_(homeTeam),
        odds: "",
        line: "",
        logo: homeLogo
      }
    ]
  };

}

function buildSportsWagerEntries_(
  score,
  market,
  oddsMode,
  payload
) {

  payload =
    payload || {};

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  oddsMode =
    sportsWagerKey_(
      oddsMode ||
      payload.oddsMode ||
      "real"
    );

  if (
    oddsMode === "realonly" ||
    oddsMode === "real_only"
  ) {
    oddsMode = "real-only";
  }

  if (
    oddsMode === "realfallback" ||
    oddsMode === "real-fallback" ||
    oddsMode === "real_fallback"
  ) {
    oddsMode = "real";
  }

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const awayLogo =
    sportsWagerString_(
      score.AwayLogo
    );

  const homeLogo =
    sportsWagerString_(
      score.HomeLogo
    );

  let source = "manual";
  let real = null;

  if (
    (
      oddsMode === "real" ||
      oddsMode === "real-only"
    ) &&
    market !== "soccer-moneyline"
  ) {

    real =
      getSportsWagerRealOddsForScore_(
        score,
        market,
        payload
      );

    if (
      !real &&
      oddsMode === "real-only"
    ) {
      return buildSportsWagerPendingEntries_(
        score,
        market,
        "pending-real-odds"
      );
    }

    if (
      !real &&
      market !== "moneyline"
    ) {
      throw new Error(
        "Real " +
        sportsWagerMarketLabel_(market) +
        " odds were not found for this game."
      );
    }

  }

  if (
    oddsMode === "record" &&
    market !== "moneyline" &&
    market !== "soccer-moneyline"
  ) {
    throw new Error(
      "App record odds only support Moneyline markets. Use Real Odds or Manual Odds for Spread/Total."
    );
  }

  if (market === "soccer-moneyline") {

    let awayOdds = "";
    let drawOdds = "";
    let homeOdds = "";

    if (
      oddsMode === "manual"
    ) {

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      drawOdds =
        sportsWagerNumber_(
          payload.drawOdds,
          3
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else if (
      oddsMode === "real-only"
    ) {

      return buildSportsWagerPendingEntries_(
        score,
        market,
        "pending-real-odds"
      );

    } else if (
      oddsMode === "record"
    ) {

      const autoOdds =
        calculateSportsWagerAutoOdds_(
          score
        );

      awayOdds =
        autoOdds.awayOdds;

      homeOdds =
        autoOdds.homeOdds;

      drawOdds =
        3;

      source =
        autoOdds.source + "-draw-default";

    } else {

      /*
        Many simple odds feeds only return two-way moneyline prices.
        For true soccer 3-way, keep this safe by using the app defaults
        unless manual draw odds were provided.
      */

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      drawOdds =
        sportsWagerNumber_(
          payload.drawOdds,
          3
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "app-default-3way";

    }

    return {
      source: source,
      entries: [
        {
          selection: "away",
          name: awayTeam,
          nomineeId:
            sportsWagerSlug_(
              awayTeam
            ),
          odds: awayOdds,
          line: "",
          logo: awayLogo
        },
        {
          selection: "draw",
          name: "Draw",
          nomineeId: "draw",
          odds: drawOdds,
          line: "",
          logo: ""
        },
        {
          selection: "home",
          name: homeTeam,
          nomineeId:
            sportsWagerSlug_(
              homeTeam
            ),
          odds: homeOdds,
          line: "",
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "moneyline") {

    let awayOdds = "";
    let homeOdds = "";

    if (
      oddsMode === "manual"
    ) {

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else if (
      oddsMode === "record" ||
      !real
    ) {

      const autoOdds =
        calculateSportsWagerAutoOdds_(
          score
        );

      awayOdds =
        autoOdds.awayOdds;

      homeOdds =
        autoOdds.homeOdds;

      source =
        autoOdds.source;

    } else {

      awayOdds =
        sportsWagerNumber_(
          real.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      homeOdds =
        sportsWagerNumber_(
          real.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source =
        real.source ||
        "sports-scores-odds";

    }

    return {
      source: source,
      entries: [
        {
          selection: "away",
          name: awayTeam,
          nomineeId:
            sportsWagerSlug_(
              awayTeam
            ),
          odds: awayOdds,
          line: "",
          logo: awayLogo
        },
        {
          selection: "home",
          name: homeTeam,
          nomineeId:
            sportsWagerSlug_(
              homeTeam
            ),
          odds: homeOdds,
          line: "",
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "spread") {

    let awayLine = "";
    let homeLine = "";
    let awayOdds = "";
    let homeOdds = "";

    if (oddsMode === "manual") {

      awayLine =
        sportsWagerNumber_(
          payload.awayLine,
          ""
        );

      homeLine =
        sportsWagerNumber_(
          payload.homeLine,
          ""
        );

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else {

      awayLine =
        sportsWagerNumber_(
          real.awaySpread,
          ""
        );

      homeLine =
        sportsWagerNumber_(
          real.homeSpread,
          ""
        );

      awayOdds =
        sportsWagerNumber_(
          real.awaySpreadOdds,
          ""
        );

      homeOdds =
        sportsWagerNumber_(
          real.homeSpreadOdds,
          ""
        );

      source =
        real.source ||
        "sports-scores-odds";

    }

    if (
      awayLine === "" ||
      homeLine === "" ||
      !awayOdds ||
      !homeOdds
    ) {
      throw new Error(
        "Spread line or spread odds are missing."
      );
    }

    return {
      source: source,
      entries: [
        {
          selection: "away",
          name:
            awayTeam +
            " " +
            sportsWagerFormatLine_(awayLine),
          nomineeId:
            sportsWagerSlug_(
              awayTeam + "-spread"
            ),
          odds: awayOdds,
          line: awayLine,
          logo: awayLogo
        },
        {
          selection: "home",
          name:
            homeTeam +
            " " +
            sportsWagerFormatLine_(homeLine),
          nomineeId:
            sportsWagerSlug_(
              homeTeam + "-spread"
            ),
          odds: homeOdds,
          line: homeLine,
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "total") {

    let totalPoints = "";
    let overOdds = "";
    let underOdds = "";

    if (oddsMode === "manual") {

      totalPoints =
        sportsWagerNumber_(
          payload.totalPoints,
          ""
        );

      overOdds =
        sportsWagerNumber_(
          payload.overOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      underOdds =
        sportsWagerNumber_(
          payload.underOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else {

      totalPoints =
        sportsWagerNumber_(
          real.totalPoints,
          ""
        );

      overOdds =
        sportsWagerNumber_(
          real.overOdds,
          ""
        );

      underOdds =
        sportsWagerNumber_(
          real.underOdds,
          ""
        );

      source =
        real.source ||
        "sports-scores-odds";

    }

    if (
      totalPoints === "" ||
      !overOdds ||
      !underOdds
    ) {
      throw new Error(
        "Total line or over/under odds are missing."
      );
    }

    return {
      source: source,
      entries: [
        {
          selection: "over",
          name:
            "Over " + totalPoints,
          nomineeId:
            "over-" +
            sportsWagerSlug_(totalPoints),
          odds: overOdds,
          line: totalPoints,
          logo: ""
        },
        {
          selection: "under",
          name:
            "Under " + totalPoints,
          nomineeId:
            "under-" +
            sportsWagerSlug_(totalPoints),
          odds: underOdds,
          line: totalPoints,
          logo: ""
        }
      ]
    };

  }

  throw new Error(
    "Unsupported sports wager market: " + market
  );

}

/* =====================================================
   CREATE CATEGORY ROW
===================================================== */

function appendSportsWagerCategoryRow_(
  score,
  awardsGameId,
  categoryId,
  entry,
  market,
  oddsSource
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const headers =
    sportsWagerGetHeaders_(
      CATEGORIES_SHEET
    );

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const categoryName =
    sportsWagerCategoryName_(
      score,
      market
    );

  sportsWagerSetIfExists_(
    row,
    col,
    "GameId",
    awardsGameId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Category",
    categoryName
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CategoryId",
    categoryId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Nominee",
    entry.name
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "NomineeId",
    entry.nomineeId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Section",
    sportsWagerString_(score.League)
      .toUpperCase()
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ShortAnswer",
    entry.name
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Active",
    true
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "PredictionGame",
    true
  );

  const cleanOdds =
    sportsWagerCleanOddsForSheet_(
      entry.odds
    );

  sportsWagerSetIfExists_(
    row,
    col,
    "CommunityRank",
    false
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "QuestionType",
    market === "soccer-moneyline"
      ? "team-matchup-draw"
      : "team-matchup"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ScoringEngine",
    "sports"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SelectionMode",
    "single"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "EntryType",
    entry.selection === "draw"
      ? "prop-answer"
      : "team"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsMode",
    cleanOdds !== ""
      ? "manual"
      : "real"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ResultSource",
    "sports-engine"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FileID",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CategoryImage",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsProvider",
    "ESPN"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsGameId",
    sportsWagerString_(score.GameId)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ESPNEventId",
    sportsWagerString_(score.ESPNEventId)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsLeague",
    sportsWagerString_(score.League)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsMarket",
    market
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsSelection",
    entry.selection
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsLine",
    entry.line
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "HomeTeam",
    homeTeam
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "AwayTeam",
    awayTeam
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "HomeRecord",
    sportsWagerCleanRecordDisplay_(score.HomeRecord)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "AwayRecord",
    sportsWagerCleanRecordDisplay_(score.AwayRecord)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "HomeScore",
    score.HomeScore
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "AwayScore",
    score.AwayScore
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsStatus",
    sportsWagerString_(score.Status)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsState",
    sportsWagerString_(score.State)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsClock",
    sportsWagerString_(score.Clock)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsPeriod",
    sportsWagerString_(score.Period)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "BettingOdds",
    cleanOdds
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsSource",
    oddsSource ||
    (
      cleanOdds !== ""
        ? "manual"
        : "pending-real-odds"
    )
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsLastUpdated",
    cleanOdds !== ""
      ? sportsWagerNow_()
      : ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "LogoUrl",
    entry.logo || ""
  );

  sh.appendRow(row);

}

function updateSportsWagerCategoryRowsFromScore_(
  score,
  awardsGameId,
  categoryId,
  entries,
  market,
  oddsSource,
  options
) {

  options =
    options || {};

  score =
    sportsWagerNormalizeScore_(
      score
    );

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      updatedRows: 0,
      matchedRows: 0
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined
  ) {
    return {
      updatedRows: 0,
      matchedRows: 0
    };
  }

  const updatedData =
    data.map(function(row) {
      return row.slice();
    });

  const entriesBySelection = {};

  (entries || [])
    .forEach(function(entry) {
      entriesBySelection[
        sportsWagerKey_(
          entry.selection
        )
      ] = entry;
    });

  const categoryName =
    sportsWagerCategoryName_(
      score,
      market
    );

  let matchedRows = 0;
  let updatedRows = 0;

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      col.GameId !== undefined
        ? sportsWagerString_(
            row[col.GameId]
          )
        : "";

    const rowCategoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    if (rowCategoryId !== sportsWagerKey_(categoryId)) {
      continue;
    }

    if (
      col.GameId !== undefined &&
      rowGameId &&
      rowGameId !== awardsGameId
    ) {
      continue;
    }

    matchedRows++;

    let selection =
      col.SportsSelection !== undefined
        ? sportsWagerKey_(
            row[col.SportsSelection]
          )
        : "";

    if (!selection) {

      const nominee =
        col.Nominee !== undefined
          ? sportsWagerString_(
              row[col.Nominee]
            )
          : "";

      if (
        nominee === sportsWagerString_(score.HomeTeam)
      ) {
        selection = "home";
      }

      if (
        nominee === sportsWagerString_(score.AwayTeam)
      ) {
        selection = "away";
      }

      if (
        sportsWagerKey_(nominee) === "draw"
      ) {
        selection = "draw";
      }

    }

    const entry =
      entriesBySelection[selection] || null;

    if (col.Category !== undefined) {
      updatedData[i][col.Category] =
        categoryName;
    }

    if (col.Section !== undefined) {
      updatedData[i][col.Section] =
        sportsWagerString_(score.League)
          .toUpperCase();
    }

    if (col.SportsProvider !== undefined) {
      updatedData[i][col.SportsProvider] =
        "ESPN";
    }

    if (col.QuestionType !== undefined) {
      updatedData[i][col.QuestionType] =
        market === "soccer-moneyline"
          ? "team-matchup-draw"
          : "team-matchup";
    }

    if (col.ScoringEngine !== undefined) {
      updatedData[i][col.ScoringEngine] =
        "sports";
    }

    if (col.SelectionMode !== undefined) {
      updatedData[i][col.SelectionMode] =
        "single";
    }

    if (col.EntryType !== undefined) {
      updatedData[i][col.EntryType] =
        selection === "draw"
          ? "prop-answer"
          : "team";
    }

    if (col.ResultSource !== undefined) {
      updatedData[i][col.ResultSource] =
        "sports-engine";
    }

    if (col.SportsGameId !== undefined) {
      updatedData[i][col.SportsGameId] =
        sportsWagerString_(score.GameId);
    }

    if (col.ESPNEventId !== undefined) {
      updatedData[i][col.ESPNEventId] =
        sportsWagerString_(score.ESPNEventId);
    }

    if (col.SportsLeague !== undefined) {
      updatedData[i][col.SportsLeague] =
        sportsWagerString_(score.League);
    }

    if (col.SportsMarket !== undefined) {
      updatedData[i][col.SportsMarket] =
        market;
    }

    if (
      col.SportsSelection !== undefined &&
      selection
    ) {
      updatedData[i][col.SportsSelection] =
        selection;
    }

    if (col.HomeTeam !== undefined) {
      updatedData[i][col.HomeTeam] =
        sportsWagerString_(score.HomeTeam);
    }

    if (col.AwayTeam !== undefined) {
      updatedData[i][col.AwayTeam] =
        sportsWagerString_(score.AwayTeam);
    }

    if (col.HomeRecord !== undefined) {
      updatedData[i][col.HomeRecord] =
        sportsWagerCleanRecordDisplay_(score.HomeRecord);
    }

    if (col.AwayRecord !== undefined) {
      updatedData[i][col.AwayRecord] =
        sportsWagerCleanRecordDisplay_(score.AwayRecord);
    }

    if (col.HomeScore !== undefined) {
      updatedData[i][col.HomeScore] =
        score.HomeScore;
    }

    if (col.AwayScore !== undefined) {
      updatedData[i][col.AwayScore] =
        score.AwayScore;
    }

    if (col.SportsStatus !== undefined) {
      updatedData[i][col.SportsStatus] =
        sportsWagerString_(score.Status);
    }

    if (col.SportsState !== undefined) {
      updatedData[i][col.SportsState] =
        sportsWagerString_(score.State);
    }

    if (col.SportsClock !== undefined) {
      updatedData[i][col.SportsClock] =
        sportsWagerString_(score.Clock);
    }

    if (col.SportsPeriod !== undefined) {
      updatedData[i][col.SportsPeriod] =
        sportsWagerString_(score.Period);
    }

    if (entry) {

      if (col.Nominee !== undefined) {
        updatedData[i][col.Nominee] =
          entry.name;
      }

      if (col.ShortAnswer !== undefined) {
        updatedData[i][col.ShortAnswer] =
          entry.name;
      }

      if (
        options.allowNomineeIdUpdate === true &&
        col.NomineeId !== undefined &&
        entry.nomineeId
      ) {
        updatedData[i][col.NomineeId] =
          entry.nomineeId;
      }

      if (col.SportsLine !== undefined) {
        updatedData[i][col.SportsLine] =
          entry.line;
      }

      if (
        options.updateOdds === true &&
        col.BettingOdds !== undefined
      ) {
        updatedData[i][col.BettingOdds] =
          sportsWagerCleanOddsForSheet_(
            entry.odds
          );
      }

      if (
        options.updateOdds === true &&
        col.OddsSource !== undefined
      ) {
        updatedData[i][col.OddsSource] =
          oddsSource ||
          (
            sportsWagerCleanOddsForSheet_(entry.odds) !== ""
              ? "sports-wager-sync"
              : "pending-real-odds"
          );
      }

      if (
        options.updateOdds === true &&
        col.OddsLastUpdated !== undefined
      ) {
        updatedData[i][col.OddsLastUpdated] =
          sportsWagerCleanOddsForSheet_(entry.odds) !== ""
            ? sportsWagerNow_()
            : "";
      }

      if (col.LogoUrl !== undefined) {
        updatedData[i][col.LogoUrl] =
          entry.logo || "";
      }

    }

    updatedRows++;

  }

  if (updatedRows > 0) {

    const writableHeaders = [
      "Category",
      "Nominee",
      "NomineeId",
      "Section",
      "ShortAnswer",
      "SportsProvider",
      "SportsGameId",
      "ESPNEventId",
      "SportsLeague",
      "SportsMarket",
      "SportsSelection",
      "SportsLine",
      "HomeTeam",
      "AwayTeam",
      "HomeRecord",
      "AwayRecord",
      "HomeScore",
      "AwayScore",
      "SportsStatus",
      "SportsState",
      "SportsClock",
      "SportsPeriod",
      "BettingOdds",
      "OddsSource",
      "OddsLastUpdated",
      "LogoUrl"
    ];

    writableHeaders.forEach(function(header) {

      if (col[header] === undefined) {
        return;
      }

      if (
        header === "NomineeId" &&
        options.allowNomineeIdUpdate !== true
      ) {
        return;
      }

      if (
        (
          header === "BettingOdds" ||
          header === "OddsSource" ||
          header === "OddsLastUpdated"
        ) &&
        options.updateOdds !== true
      ) {
        return;
      }

      const values =
        updatedData
          .slice(1)
          .map(function(row) {
            return [
              row[col[header]]
            ];
          });

      sh.getRange(
          2,
          col[header] + 1,
          values.length,
          1
        )
        .setValues(
          values
        );

    });

  }

  return {
    updatedRows: updatedRows,
    matchedRows: matchedRows
  };

}

/* =====================================================
   SETTINGS LOOKUPS / WRITES
===================================================== */

function sportsWagerSettingsRowExists_(
  awardsGameId,
  categoryId
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (col.CategoryId === undefined) {
    return false;
  }

  const hasGameId =
    col.GameId !== undefined;

  const cleanAwardsGameId =
    sportsWagerString_(
      awardsGameId
    );

  const cleanCategoryId =
    sportsWagerKey_(
      categoryId
    );

  for (let i = 1; i < data.length; i++) {

    const rowCategoryId =
      sportsWagerKey_(
        data[i][col.CategoryId]
      );

    if (rowCategoryId !== cleanCategoryId) {
      continue;
    }

    if (!hasGameId) {
      return true;
    }

    const rowGameId =
      sportsWagerString_(
        data[i][col.GameId]
      );

    if (
      !rowGameId ||
      rowGameId === cleanAwardsGameId
    ) {
      return true;
    }

  }

  return false;

}

function appendSportsWagerSettingsRow_(
  score,
  awardsGameId,
  categoryId,
  market
) {

  if (
    sportsWagerSettingsRowExists_(
      awardsGameId,
      categoryId
    )
  ) {
    return false;
  }

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  const headers =
    sportsWagerGetHeaders_(
      CATEGORY_SETTINGS_SHEET
    );

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  const categoryName =
    sportsWagerCategoryName_(
      score,
      market
    );

  const lockDate =
    sportsWagerSafeDateValue_(
      score.GameDateTime
    );

  sportsWagerSetIfExists_(
    row,
    col,
    "GameId",
    awardsGameId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CategoryId",
    categoryId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Points",
    1
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Locked",
    false
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "WinnerNomineeId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ChangePenalty",
    0
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "MaxChanges",
    0
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "LockDateTime",
    lockDate
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "DisplayOrder",
    lockDate instanceof Date
      ? lockDate.getTime()
      : 999
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "GroupId",
    sportsWagerString_(score.League)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ParentCategoryId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FollowUpCategoryId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FollowUpMapJSON",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "LayoutType",
    "wager"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ShortName",
    categoryName
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CountsAsStatue",
    false
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ScoreVersion",
    "sports-wager-v2"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FavoriteNomineeId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "QuestionType",
    market === "soccer-moneyline"
      ? "team-matchup-draw"
      : "team-matchup"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ScoringEngine",
    "sports"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SelectionMode",
    "single"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ScoreMode",
    "wager"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsMode",
    "real"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ResultSource",
    "sports-engine"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SettlementStatus",
    "pending"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsMarket",
    market
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsLeague",
    sportsWagerString_(score.League)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "VotingTypes",
    "wager"
  );

  sh.appendRow(row);

  return true;

}

function sportsWagerGetCategoryOddsStatus_(
  awardsGameId,
  categoryId
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      ready: false,
      source: "pending-real-odds",
      lastUpdated: "",
      rowsChecked: 0
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const required = [
    "GameId",
    "CategoryId",
    "SportsMarket",
    "BettingOdds"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    return {
      ready: false,
      source: "pending-real-odds",
      lastUpdated: "",
      rowsChecked: 0
    };
  }

  let ready = true;
  let rowsChecked = 0;
  let source = "";
  let lastUpdated = "";

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      col.GameId !== undefined
        ? sportsWagerString_(
            row[col.GameId]
          )
        : "";

    const rowCategoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    if (rowCategoryId !== sportsWagerKey_(categoryId)) {
      continue;
    }

    if (
      col.GameId !== undefined &&
      rowGameId &&
      rowGameId !== awardsGameId
    ) {
      continue;
    }

    rowsChecked++;

    const market =
      sportsWagerNormalizeMarket_(
        row[col.SportsMarket]
      );

    const oddsMode =
      col.OddsMode !== undefined
        ? sportsWagerKey_(row[col.OddsMode])
        : "";

    const oddsReady =
      oddsMode === "none"
        ? true
        : sportsWagerOddsValueIsReady_(
            row[col.BettingOdds]
          );

    const lineReady =
      market === "spread" ||
      market === "total"
        ? (
            col.SportsLine !== undefined &&
            sportsWagerString_(row[col.SportsLine]) !== ""
          )
        : true;

    if (
      !oddsReady ||
      !lineReady
    ) {
      ready = false;
    }

    if (
      !source &&
      col.OddsSource !== undefined
    ) {
      source =
        sportsWagerString_(
          row[col.OddsSource]
        );
    }

    if (
      col.OddsLastUpdated !== undefined &&
      row[col.OddsLastUpdated]
    ) {
      lastUpdated =
        row[col.OddsLastUpdated];
    }

  }

  if (!rowsChecked) {
    ready = false;
  }

  return {
    ready: ready,
    source:
      ready
        ? (source || "sports-scores-odds")
        : "pending-real-odds",
    lastUpdated:
      ready
        ? (lastUpdated || sportsWagerNow_())
        : "",
    rowsChecked: rowsChecked
  };

}

function sportsWagerSyncCategorySettingsOddsReady_(
  awardsGameId,
  categoryId
) {

  const status =
    sportsWagerGetCategoryOddsStatus_(
      awardsGameId,
      categoryId
    );

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  let data =
    sh.getDataRange()
      .getValues();

  if (!data.length) {
    return status;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  function ensureHeader_(headerName) {

    let index =
      headers.indexOf(headerName);

    if (index !== -1) {
      return index;
    }

    index = headers.length;

    sh
      .getRange(
        1,
        index + 1
      )
      .setValue(headerName);

    headers.push(headerName);

    return index;

  }

  const gameIdCol = headers.indexOf("GameId");
  const categoryIdCol = ensureHeader_("CategoryId");
  const oddsReadyCol = ensureHeader_("OddsReady");
  const oddsSourceCol = ensureHeader_("OddsSource");
  const oddsLastUpdatedCol = ensureHeader_("OddsLastUpdated");

  data =
    sh.getDataRange()
      .getValues();

  let targetRow = -1;
  let blankGameTargetRow = -1;

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      gameIdCol > -1
        ? sportsWagerString_(
            data[i][gameIdCol]
          )
        : "";

    const rowCategoryId =
      sportsWagerKey_(
        data[i][categoryIdCol]
      );

    if (rowCategoryId !== sportsWagerKey_(categoryId)) {
      continue;
    }

    if (gameIdCol === -1) {
      targetRow = i + 1;
      break;
    }

    if (
      !rowGameId &&
      blankGameTargetRow === -1
    ) {
      blankGameTargetRow = i + 1;
    }

    if (rowGameId === awardsGameId) {
      targetRow = i + 1;
      break;
    }

  }

  if (
    targetRow === -1 &&
    blankGameTargetRow !== -1
  ) {
    targetRow = blankGameTargetRow;

    if (gameIdCol > -1) {
      sh
        .getRange(
          targetRow,
          gameIdCol + 1
        )
        .setValue(awardsGameId);
    }
  }

  if (targetRow === -1) {

    const newRow =
      new Array(headers.length).fill("");

    if (gameIdCol > -1) {
      newRow[gameIdCol] =
        awardsGameId;
    }

    newRow[categoryIdCol] =
      categoryId;

    sh.appendRow(newRow);

    targetRow =
      sh.getLastRow();

  }

  sh
    .getRange(
      targetRow,
      oddsReadyCol + 1
    )
    .setValue(
      status.ready === true
    );

  sh
    .getRange(
      targetRow,
      oddsSourceCol + 1
    )
    .setValue(
      status.source ||
      (
        status.ready
          ? "sports-scores-odds"
          : "pending-real-odds"
      )
    );

  sh
    .getRange(
      targetRow,
      oddsLastUpdatedCol + 1
    )
    .setValue(
      status.ready
        ? (status.lastUpdated || sportsWagerNow_())
        : ""
    );

  return status;

}

function updateSportsWagerSettingWinner_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  force,
  wagerResultType
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  let data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  let headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  function ensureCol_(headerName) {

    let index =
      headers.indexOf(headerName);

    if (index !== -1) {
      return index;
    }

    index =
      headers.length;

    sh
      .getRange(
        1,
        index + 1
      )
      .setValue(
        headerName
      );

    headers.push(
      headerName
    );

    return index;

  }

  const categoryIdCol =
    ensureCol_("CategoryId");

  const winnerCol =
    ensureCol_("WinnerNomineeId");

  const wagerResultTypeCol =
    ensureCol_("WagerResultType");

  const lockedCol =
    ensureCol_("Locked");

  const settlementStatusCol =
    ensureCol_("SettlementStatus");

  const resultSourceCol =
    ensureCol_("ResultSource");

  const gameIdCol =
    headers.indexOf("GameId");

  data =
    sh.getDataRange()
      .getValues();

  winnerNomineeId =
    sportsWagerString_(
      winnerNomineeId || ""
    );

  wagerResultType =
    sportsWagerKey_(
      wagerResultType ||
      (
        winnerNomineeId
          ? "win"
          : ""
      )
    );

  let matched = 0;
  let changed = 0;

  function writeRow_(rowNumber, existingRow) {

    existingRow = existingRow || [];

    const existingWinner =
      sportsWagerString_(
        existingRow[winnerCol]
      );

    const existingResultType =
      sportsWagerString_(
        existingRow[wagerResultTypeCol]
      );

    if (
      force ||
      !existingWinner
    ) {
      sh
        .getRange(
          rowNumber,
          winnerCol + 1
        )
        .setValue(
          winnerNomineeId
        );
    }

    if (
      force ||
      !existingResultType
    ) {
      sh
        .getRange(
          rowNumber,
          wagerResultTypeCol + 1
        )
        .setValue(
          wagerResultType
        );
    }

    sh
      .getRange(
        rowNumber,
        lockedCol + 1
      )
      .setValue(true);

    sh
      .getRange(
        rowNumber,
        settlementStatusCol + 1
      )
      .setValue("settled");

    sh
      .getRange(
        rowNumber,
        resultSourceCol + 1
      )
      .setValue("sports-engine");

    changed++;

  }

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowCategoryId =
      sportsWagerKey_(
        row[categoryIdCol]
      );

    if (rowCategoryId !== sportsWagerKey_(categoryId)) {
      continue;
    }

    const rowGameId =
      gameIdCol !== -1
        ? sportsWagerString_(row[gameIdCol])
        : "";

    if (
      gameIdCol !== -1 &&
      rowGameId &&
      rowGameId !== awardsGameId
    ) {
      continue;
    }

    matched++;

    writeRow_(
      i + 1,
      row
    );

  }

  if (matched === 0) {

    const newRow =
      new Array(headers.length).fill("");

    if (gameIdCol !== -1) {
      newRow[gameIdCol] =
        awardsGameId;
    }

    newRow[categoryIdCol] =
      sportsWagerKey_(categoryId);

    sh.appendRow(newRow);

    matched++;

    writeRow_(
      sh.getLastRow(),
      newRow
    );

  }

  return matched > 0 && changed > 0;

}


function sportsWagerSetCategorySettingFinalLock_(
  awardsGameId,
  categoryId,
  settlementStatus,
  forceStatus
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  let data =
    sh.getDataRange()
      .getValues();

  if (!data.length) {

    sh.appendRow([
      "GameId",
      "CategoryId",
      "Locked",
      "WinnerNomineeId",
      "SettlementStatus"
    ]);

    data =
      sh.getDataRange()
        .getValues();

  }

  let headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  function ensureCol_(headerName) {

    let index =
      headers.indexOf(headerName);

    if (index !== -1) {
      return index;
    }

    index =
      headers.length;

    sh
      .getRange(
        1,
        index + 1
      )
      .setValue(
        headerName
      );

    headers.push(
      headerName
    );

    return index;

  }

  const gameIdCol =
    headers.indexOf("GameId");

  const categoryIdCol =
    ensureCol_("CategoryId");

  const lockedCol =
    ensureCol_("Locked");

  const settlementStatusCol =
    ensureCol_("SettlementStatus");

  const resultSourceCol =
    ensureCol_("ResultSource");

  data =
    sh.getDataRange()
      .getValues();

  const cleanGameId =
    sportsWagerString_(
      awardsGameId
    );

  const cleanCategoryId =
    sportsWagerKey_(
      categoryId
    );

  let targetRow =
    -1;

  for (let i = 1; i < data.length; i++) {

    const rowCategoryId =
      sportsWagerKey_(
        data[i][categoryIdCol]
      );

    if (rowCategoryId !== cleanCategoryId) {
      continue;
    }

    const rowGameId =
      gameIdCol !== -1
        ? sportsWagerString_(
            data[i][gameIdCol]
          )
        : "";

    if (
      gameIdCol === -1 ||
      !rowGameId ||
      rowGameId === cleanGameId
    ) {

      targetRow =
        i + 1;

      break;

    }

  }

  if (targetRow === -1) {

    const newRow =
      new Array(headers.length)
        .fill("");

    if (gameIdCol !== -1) {
      newRow[gameIdCol] =
        cleanGameId;
    }

    newRow[categoryIdCol] =
      categoryId;

    sh.appendRow(
      newRow
    );

    targetRow =
      sh.getLastRow();

  }

  sh
    .getRange(
      targetRow,
      lockedCol + 1
    )
    .setValue(
      true
    );

  const requestedStatus =
    sportsWagerKey_(
      settlementStatus ||
      "final-ready-to-settle"
    );

  const currentStatus =
    sportsWagerKey_(
      sh
        .getRange(
          targetRow,
          settlementStatusCol + 1
        )
        .getValue()
    );

  const shouldSetStatus =
    forceStatus === true ||
    !currentStatus ||
    currentStatus === "pending" ||
    currentStatus === "final-ready-to-settle" ||
    (
      requestedStatus === "settled" &&
      currentStatus !== "settled"
    );

  if (shouldSetStatus) {
    sh
      .getRange(
        targetRow,
        settlementStatusCol + 1
      )
      .setValue(
        requestedStatus
      );
  }

  if (resultSourceCol !== -1) {
    sh
      .getRange(
        targetRow,
        resultSourceCol + 1
      )
      .setValue(
        "sports-engine"
      );
  }

  return true;

}


/* =====================================================
   PUBLIC INTERNAL: CREATE SPORTS WAGER
===================================================== */

function createSportsWagerFromScore(payload) {

  payload =
    payload || {};

  setupSportsWagerSystem();

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const score =
    fetchSportsScoreForWager_({
      sportsGameId:
        payload.sportsGameId,
      gameId:
        payload.sportsGameId,
      espnEventId:
        payload.espnEventId
    });

  const resolvedSportsGameId =
    sportsWagerString_(
      score.GameId ||
      payload.sportsGameId
    );

  const resolvedEspnEventId =
    sportsWagerString_(
      score.ESPNEventId ||
      payload.espnEventId
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  if (
    !awayTeam ||
    !homeTeam
  ) {
    throw new Error(
      "Sports score is missing AwayTeam or HomeTeam"
    );
  }

  const market =
    sportsWagerNormalizeMarket_(
      payload.wagerMarket ||
      payload.market ||
      payload.sportsMarket ||
      SPORTS_WAGER_DEFAULT_MARKET
    );

  const categoryId =
    sportsWagerKey_(
      payload.categoryId ||
      (
        "sports-" +
        sportsWagerSlug_(score.League) +
        "-" +
        market +
        "-" +
        sportsWagerSlug_(
          score.ESPNEventId ||
          score.GameId
        )
      )
    );

  const oddsMode =
    sportsWagerKey_(
      payload.oddsMode ||
      (
        sportsWagerBoolean_(payload.autoOdds)
          ? "real"
          : "manual"
      )
    );

  const wagerData =
    buildSportsWagerEntries_(
      score,
      market,
      oddsMode,
      payload
    );

  const entries =
    wagerData.entries || [];

  const expectedEntryCount =
    market === "soccer-moneyline"
      ? 3
      : 2;

  if (entries.length !== expectedEntryCount) {
    throw new Error(
      "Sports wager market must create exactly " +
      expectedEntryCount +
      " nominees."
    );
  }

  const lock =
    LockService.getDocumentLock() ||
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(30000);

  if (!gotLock) {

    throw new Error(
      "Create wager is busy. Another wager is being saved right now. Please try again in a few seconds."
    );

  }

  let result;
  let shouldClearCaches =
    false;

  try {

    /*
      Important:
      Check duplicate INSIDE the lock.
      This prevents two fast clicks from both creating the same wager.
    */

    if (
      sportsWagerCategoryExists_(
        awardsGameId,
        categoryId
      )
    ) {

      const existingHasBets =
        sportsWagerCategoryHasBets_(
          awardsGameId,
          categoryId
        );

      updateSportsWagerCategoryRowsFromScore_(
        score,
        awardsGameId,
        categoryId,
        entries,
        market,
        wagerData.source,
        {
          updateOdds: true,
          allowNomineeIdUpdate: !existingHasBets
        }
      );

      setSportsGameIdOnCategorySettings_(
        awardsGameId,
        categoryId,
        resolvedSportsGameId,
        resolvedEspnEventId,
        score,
        market
      );

      const existingOddsStatus =
        sportsWagerSyncCategorySettingsOddsReady_(
          awardsGameId,
          categoryId
        );

      SpreadsheetApp.flush();

      result = {
        success: false,
        duplicate: true,
        message:
          "This sports event and market already exists as a wager category.",
        awardsGameId: awardsGameId,
        sportsGameId: resolvedSportsGameId,
        espnEventId: resolvedEspnEventId,
        categoryId: categoryId,
        market: market,
        oddsReady:
          existingOddsStatus.ready === true,
        oddsSource:
          existingOddsStatus.source || "pending-real-odds"
      };

      return result;

    }

    entries.forEach(function(entry) {

      appendSportsWagerCategoryRow_(
        score,
        awardsGameId,
        categoryId,
        entry,
        market,
        wagerData.source
      );

    });

    appendSportsWagerSettingsRow_(
      score,
      awardsGameId,
      categoryId,
      market
    );

    setSportsGameIdOnCategorySettings_(
      awardsGameId,
      categoryId,
      resolvedSportsGameId,
      resolvedEspnEventId,
      score,
      market
    );

    const oddsStatus =
      sportsWagerSyncCategorySettingsOddsReady_(
        awardsGameId,
        categoryId
      );

    SpreadsheetApp.flush();

    shouldClearCaches =
      true;

    result = {
      success: true,
      awardsGameId: awardsGameId,
      sportsGameId: resolvedSportsGameId,
      espnEventId: resolvedEspnEventId,
      categoryId: categoryId,
      category:
        sportsWagerCategoryName_(
          score,
          market
        ),
      market: market,
      oddsMode: oddsMode,
      oddsSource:
        oddsStatus.source ||
        wagerData.source,
      oddsReady:
        oddsStatus.ready === true,
      lockDateTime:
        score.GameDateTime || "",
      nominees:
        entries.map(function(entry) {
          return {
            nomineeId:
              entry.nomineeId,
            name:
              entry.name,
            odds:
              entry.odds,
            selection:
              entry.selection,
            line:
              entry.line
          };
        })
    };

  } finally {

    lock.releaseLock();

  }

  /*
    Clear caches AFTER releasing the lock.
    This keeps the locked spreadsheet section shorter.
  */

  if (
    shouldClearCaches &&
    typeof clearAppCaches === "function"
  ) {
    clearAppCaches();
  }

  return result;

}

function setSportsGameIdOnCategorySettings_(
  gameId,
  categoryId,
  sportsGameId,
  espnEventId,
  score,
  market
) {

  if (
    !gameId ||
    !categoryId ||
    (
      !sportsGameId &&
      !espnEventId
    )
  ) {
    return;
  }

  score =
    score || {};

  market =
    sportsWagerString_(
      market || ""
    );

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName("CategorySettings");

  if (!sheet) {

    throw new Error(
      "CategorySettings sheet missing"
    );

  }

  let values =
    sheet.getDataRange().getValues();

  if (!values.length) {

    sheet.appendRow([
      "CategoryId",
      "Points",
      "Locked",
      "WinnerNomineeId",
      "ChangePenalty",
      "MaxChanges",
      "LockDateTime",
      "DisplayOrder",
      "GroupId",
      "ParentCategoryId",
      "FollowUpCategoryId",
      "FollowUpMapJSON",
      "LayoutType",
      "ShortName",
      "CountsAsStatue",
      "ScoreVersion",
      "FavoriteNomineeId",
      "VotingTypes",
      "SportsGameId",
      "ESPNEventId"
    ]);

    values =
      sheet.getDataRange().getValues();

  }

  const headers =
    values[0].map(function(header) {
      return String(header || "").trim();
    });

  function ensureHeader_(headerName) {

    let index =
      headers.indexOf(headerName);

    if (index !== -1) {
      return index;
    }

    index =
      headers.length;

    sheet
      .getRange(
        1,
        index + 1
      )
      .setValue(headerName);

    headers.push(headerName);

    return index;

  }

  const gameIdCol =
    headers.indexOf("GameId");

  const categoryIdCol =
    ensureHeader_("CategoryId");

  const pointsCol =
    ensureHeader_("Points");

  const lockedCol =
    ensureHeader_("Locked");

  const lockDateTimeCol =
    ensureHeader_("LockDateTime");

  const displayOrderCol =
    ensureHeader_("DisplayOrder");

  const groupIdCol =
    ensureHeader_("GroupId");

  const layoutTypeCol =
    ensureHeader_("LayoutType");

  const shortNameCol =
    ensureHeader_("ShortName");

  const countsAsStatueCol =
    ensureHeader_("CountsAsStatue");

  const scoreVersionCol =
    ensureHeader_("ScoreVersion");

  const votingTypesCol =
    ensureHeader_("VotingTypes");

  const questionTypeCol =
    ensureHeader_("QuestionType");

  const scoringEngineCol =
    ensureHeader_("ScoringEngine");

  const selectionModeCol =
    ensureHeader_("SelectionMode");

  const scoreModeCol =
    ensureHeader_("ScoreMode");

  const oddsModeCol =
    ensureHeader_("OddsMode");

  const resultSourceCol =
    ensureHeader_("ResultSource");

  const settlementStatusCol =
    ensureHeader_("SettlementStatus");

  const sportsGameIdCol =
    ensureHeader_("SportsGameId");

  const espnEventIdCol =
    ensureHeader_("ESPNEventId");

  const sportsMarketCol =
    ensureHeader_("SportsMarket");

  const sportsLeagueCol =
    ensureHeader_("SportsLeague");

  const wagerResultTypeCol =
    ensureHeader_("WagerResultType");

  const oddsReadyCol =
    ensureHeader_("OddsReady");

  const oddsSourceCol =
    ensureHeader_("OddsSource");

  const oddsLastUpdatedCol =
    ensureHeader_("OddsLastUpdated");  

  values =
    sheet.getDataRange().getValues();

  const cleanGameId =
    String(gameId || "").trim();

  const cleanCategoryId =
    String(categoryId || "").trim();

  const cleanSportsGameId =
    String(sportsGameId || "").trim();

  const cleanEspnEventId =
    String(espnEventId || "").trim();

  const lockDateTime =
    sportsWagerString_(
      score.GameDateTime ||
      score.DateTime ||
      score.StartDateTime ||
      ""
    );

  const league =
    sportsWagerString_(
      score.League || ""
    );

  const eventKey =
    sportsWagerString_(
      score.ESPNEventId ||
      score.GameId ||
      cleanSportsGameId
    );

  const groupId =
    sportsWagerKey_(
      "sports-" +
      sportsWagerSlug_(league) +
      "-" +
      sportsWagerSlug_(eventKey)
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam || "Away"
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam || "Home"
    );

  const shortName =
    awayTeam +
    " @ " +
    homeTeam +
    (
      market
        ? " - " + market.toUpperCase()
        : ""
    );

  let targetRow =
    -1;

  for (let i = 1; i < values.length; i++) {

    const rowGameId =
      gameIdCol > -1
        ? String(values[i][gameIdCol] || "").trim()
        : "";

    const rowCategoryId =
      String(values[i][categoryIdCol] || "").trim();

    if (rowCategoryId !== cleanCategoryId) {
      continue;
    }

    if (
      gameIdCol === -1 ||
      !rowGameId ||
      rowGameId === cleanGameId
    ) {

      targetRow =
        i + 1;

      break;

    }

  }

  if (targetRow === -1) {

    const newRow =
      new Array(headers.length).fill("");

    if (gameIdCol > -1) {
      newRow[gameIdCol] =
        cleanGameId;
    }

    newRow[categoryIdCol] =
      cleanCategoryId;

    sheet.appendRow(newRow);

    targetRow =
      sheet.getLastRow();

  }

  function setValue_(
    colIndex,
    value
  ) {

    if (colIndex === -1) {
      return;
    }

    sheet
      .getRange(
        targetRow,
        colIndex + 1
      )
      .setValue(
        value
      );

  }

  function setIfBlank_(
    colIndex,
    value
  ) {

    if (
      colIndex === -1 ||
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    const cell =
      sheet.getRange(
        targetRow,
        colIndex + 1
      );

    const existing =
      String(cell.getValue() || "")
        .trim();

    if (!existing) {
      cell.setValue(value);
    }

  }

  setValue_(
    questionTypeCol,
    market === "soccer-moneyline"
      ? "team-matchup-draw"
      : "team-matchup"
  );

  setValue_(
    scoringEngineCol,
    "sports"
  );

  setValue_(
    selectionModeCol,
    "single"
  );

  setValue_(
    scoreModeCol,
    "wager"
  );

  setIfBlank_(
    oddsModeCol,
    "real"
  );

  setValue_(
    resultSourceCol,
    "sports-engine"
  );

  setIfBlank_(
    settlementStatusCol,
    "pending"
  );

  setValue_(
    sportsGameIdCol,
    cleanSportsGameId
  );

  setValue_(
    espnEventIdCol,
    cleanEspnEventId
  );

  setValue_(
    sportsMarketCol,
    market
  );

  setValue_(
    sportsLeagueCol,
    league
  );

  setIfBlank_(
    pointsCol,
    1
  );

  setIfBlank_(
    lockedCol,
    "FALSE"
  );

  setIfBlank_(
    lockDateTimeCol,
    lockDateTime
  );

  setIfBlank_(
    displayOrderCol,
    targetRow - 1
  );

  setValue_(
    groupIdCol,
    groupId
  );

  setIfBlank_(
    layoutTypeCol,
    "wager"
  );

  setIfBlank_(
    wagerResultTypeCol,
    ""
  );

  setValue_(
    shortNameCol,
    shortName
  );

  setIfBlank_(
    countsAsStatueCol,
    "FALSE"
  );

  setIfBlank_(
    scoreVersionCol,
    1
  );

  setIfBlank_(
    votingTypesCol,
    "wager"
  );

  setIfBlank_(
    oddsReadyCol,
    "FALSE"
  );

  setIfBlank_(
    oddsSourceCol,
    "pending-real-odds"
  );

  setIfBlank_(
    oddsLastUpdatedCol,
    ""
  );

}
/* =====================================================
   ADMIN API: CREATE SPORTS WAGER
===================================================== */

function apiAdminCreateSportsWager(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  sportsWagerMaybeRefreshScoresEngine_(
    payload
  );

  return createSportsWagerFromScore(
    payload
  );

}

function sportsWagerParseSelectedGames_(value) {

  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  if (typeof value === "string") {

    try {

      const parsed =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch (err) {

      throw new Error(
        "Selected sports games could not be read. Please reload Sports and try again."
      );

    }

  }

  return [];

}

function apiAdminCreateSportsWagersBulk(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  sportsWagerMaybeRefreshScoresEngine_(
    payload
  );

  const selectedGames =
    sportsWagerParseSelectedGames_(
      payload.selectedGames ||
      payload.selectedGamesJson
    );

  if (!selectedGames.length) {

    return {
      success: false,
      message: "No sports games selected.",
      created: [],
      duplicates: [],
      failed: []
    };

  }

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const created = [];
  const duplicates = [];
  const failed = [];

  selectedGames.forEach(function(game) {

    game =
      game || {};

    const sportsGameId =
      sportsWagerString_(
        game.sportsGameId ||
        game.GameId ||
        game.gameId ||
        game.id
      );

    const espnEventId =
      sportsWagerString_(
        game.espnEventId ||
        game.ESPNEventId ||
        game.eventId
      );

    if (
      !sportsGameId &&
      !espnEventId
    ) {

      failed.push({
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        message: "Missing sports game id."
      });

      return;

    }

    try {

      const result =
        createSportsWagerFromScore({
          awardsGameId: awardsGameId,
          gameId: awardsGameId,
          sportsGameId: sportsGameId,
          espnEventId: espnEventId,
          wagerMarket:
            payload.wagerMarket ||
            payload.market ||
            payload.sportsMarket,
          market:
            payload.market ||
            payload.wagerMarket ||
            payload.sportsMarket,
          oddsMode:
            payload.oddsMode,
          awayLine:
            payload.awayLine,
          homeLine:
            payload.homeLine,
          totalPoints:
            payload.totalPoints,
          awayOdds:
            payload.awayOdds,
          homeOdds:
            payload.homeOdds,
          drawOdds:
            payload.drawOdds,
          overOdds:
            payload.overOdds,
          underOdds:
            payload.underOdds,
          autoOdds:
            payload.autoOdds
        });

      if (
        result &&
        result.duplicate
      ) {

        duplicates.push(result);
        return;

      }

      if (
        !result ||
        result.success === false
      ) {

        failed.push({
          sportsGameId: sportsGameId,
          espnEventId: espnEventId,
          message:
            result && (result.message || result.error)
              ? result.message || result.error
              : "Could not create wager."
        });

        return;

      }

      created.push(result);

    } catch (err) {

      failed.push({
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        message:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  return {
    success: failed.length === 0,
    message:
      "Bulk wager create finished. Created: " +
      created.length +
      ". Already existed: " +
      duplicates.length +
      ". Failed: " +
      failed.length +
      ".",
    awardsGameId: awardsGameId,
    createdCount: created.length,
    duplicateCount: duplicates.length,
    failedCount: failed.length,
    created: created,
    duplicates: duplicates,
    failed: failed
  };

}

/* =====================================================
   ADMIN API: GET SPORTS WAGER GAME OPTIONS
===================================================== */

function apiAdminGetSportsWagerGames(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  const games =
    typeof getActiveGames === "function"
      ? getActiveGames()
      : getGames();

  const activeGames =
    games.filter(function(game) {

      const active =
        game.active === true ||
        game.Active === true ||
        String(game.active || game.Active || "")
          .trim()
          .toLowerCase() === "true";

      const archived =
        game.archived === true ||
        game.Archived === true ||
        String(game.archived || game.Archived || "")
          .trim()
          .toLowerCase() === "true";

      return (
        active &&
        !archived
      );

    });

  const wagerGames =
    activeGames.filter(function(game) {

      const type =
        String(game.type || game.Type || "")
          .trim()
          .toLowerCase();

      const gameId =
        String(game.gameId || game.GameId || "")
          .trim()
          .toLowerCase();

      return (
        type === "wager" ||
        type === "sports-wager" ||
        gameId.indexOf("wager") !== -1
      );

    });

  const finalGames =
    wagerGames.length
      ? wagerGames
      : activeGames;

  return {
    success: true,
    games:
      finalGames.map(function(game) {

        return {
          gameId:
            String(
              game.gameId ||
              game.GameId ||
              ""
            ).trim(),

          name:
            String(
              game.name ||
              game.Name ||
              game.gameName ||
              game.GameName ||
              game.gameId ||
              game.GameId ||
              ""
            ).trim(),

          type:
            String(
              game.type ||
              game.Type ||
              ""
            ).trim(),

          year:
            game.year ||
            game.Year ||
            ""
        };

      })
  };

}

/* =====================================================
   SETTLEMENT HELPERS
===================================================== */


function sportsWagerBuildScoreFromCategoryRow_(row) {

  row = row || {};

  const homeScore =
    row.homeScore;

  const awayScore =
    row.awayScore;

  const status =
    sportsWagerString_(
      row.sportsStatus || ""
    );

  const state =
    sportsWagerString_(
      row.sportsState || ""
    );

  const hasAnyScoreData =
    sportsWagerHasScoreValue_(homeScore) ||
    sportsWagerHasScoreValue_(awayScore) ||
    status ||
    state;

  if (!hasAnyScoreData) {
    return null;
  }

  return {
    GameId:
      sportsWagerString_(row.sportsGameId || ""),
    ESPNEventId:
      sportsWagerString_(row.espnEventId || ""),
    HomeTeam:
      sportsWagerString_(row.homeTeam || ""),
    AwayTeam:
      sportsWagerString_(row.awayTeam || ""),
    HomeScore:
      homeScore,
    AwayScore:
      awayScore,
    Status:
      status,
    State:
      state,
    Clock:
      sportsWagerString_(row.sportsClock || ""),
    Period:
      row.sportsPeriod,
    HomeRecord:
      sportsWagerCleanRecordDisplay_(row.homeRecord || ""),
    AwayRecord:
      sportsWagerCleanRecordDisplay_(row.awayRecord || ""),
    Completed:
      sportsWagerIsCompletedScore_({
        Status: status,
        State: state
      })
  };

}

function sportsWagerMergeScoreWithCategorySnapshot_(score, categoryScore) {

  score = score || null;
  categoryScore = categoryScore || null;

  if (!score) {
    return categoryScore;
  }

  if (!categoryScore) {
    return score;
  }

  const merged = {};

  Object.keys(categoryScore).forEach(function(key) {
    merged[key] = categoryScore[key];
  });

  Object.keys(score).forEach(function(key) {
    if (
      score[key] !== "" &&
      score[key] !== null &&
      score[key] !== undefined
    ) {
      merged[key] = score[key];
    }
  });

  return merged;

}

function sportsWagerScoreSummaryValue_(score) {

  score = score || {};

  const awayTeam =
    sportsWagerString_(score.AwayTeam || "Away");

  const homeTeam =
    sportsWagerString_(score.HomeTeam || "Home");

  const awayScore =
    sportsWagerHasScoreValue_(score.AwayScore)
      ? String(score.AwayScore)
      : "";

  const homeScore =
    sportsWagerHasScoreValue_(score.HomeScore)
      ? String(score.HomeScore)
      : "";

  if (awayScore || homeScore) {
    return awayTeam + " " + awayScore + " @ " + homeTeam + " " + homeScore;
  }

  return awayTeam + " @ " + homeTeam;

}

function sportsWagerLooksLikeCategoryResultsHeaderRow_(row) {

  row = row || [];

  const keys = {};

  row.forEach(function(value) {
    const key = sportsWagerString_(value);
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

function sportsWagerEnsureCategoryResultsSheet_(headers) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName("CategoryResults");

  if (!sh) {
    sh = ss.insertSheet("CategoryResults");
  }

  const firstLastColumn =
    Math.max(sh.getLastColumn(), headers.length, 1);

  let firstRow =
    sh.getLastRow() >= 1
      ? sh
        .getRange(1, 1, 1, firstLastColumn)
        .getValues()[0]
      : [];

  const firstRowHasContent =
    firstRow.some(function(value) {
      return sportsWagerString_(value) !== "";
    });

  if (!sportsWagerLooksLikeCategoryResultsHeaderRow_(firstRow)) {

    if (firstRowHasContent) {
      /*
        Protection: if an older/broken writer put settlement data into row 1,
        preserve that row by moving it down before restoring the header.
      */
      sh.insertRowsBefore(1, 1);
    }

    sh
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);
  }

  let existingHeaders =
    sh
      .getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length, 1))
      .getValues()[0]
      .map(function(header) {
        return sportsWagerString_(header);
      });

  const missing =
    headers.filter(function(header) {
      return existingHeaders.indexOf(header) === -1;
    });

  if (missing.length) {
    sh
      .getRange(1, existingHeaders.length + 1, 1, missing.length)
      .setValues([missing]);

    existingHeaders =
      existingHeaders.concat(missing);
  }

  return {
    sheet: sh,
    headers: existingHeaders
  };

}

function sportsWagerDirectUpsertCategoryResult_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  wagerResultType,
  score,
  notes
) {

  const headers = [
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

  const prepared =
    sportsWagerEnsureCategoryResultsSheet_(
      headers
    );

  const sh =
    prepared.sheet;

  const existingHeaders =
    prepared.headers;

  const col =
    sportsWagerHeaderMap_(existingHeaders);

  const cleanGameId =
    sportsWagerString_(awardsGameId);

  const cleanCategoryId =
    sportsWagerKey_(categoryId);

  const cleanNomineeId =
    sportsWagerKey_(winnerNomineeId);

  if (!cleanGameId || !cleanCategoryId || !cleanNomineeId) {
    return {
      success: false,
      skipped: true,
      reason: "missing-category-result-key"
    };
  }

  const data =
    sh.getDataRange().getValues();

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {

    if (
      sportsWagerString_(data[i][col.GameId]) === cleanGameId &&
      sportsWagerKey_(data[i][col.CategoryId]) === cleanCategoryId &&
      sportsWagerKey_(data[i][col.NomineeId]) === cleanNomineeId
    ) {
      rowIndex = i + 1;
      break;
    }

  }

  if (rowIndex === -1) {
    /*
      Do not append a fully blank row and then call getLastRow().
      Blank appended rows are not reliably counted as the last data row,
      which caused each sports settlement to overwrite row 2.
      Insert after the current last data row and write to that exact row.
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

  const now =
    new Date();

  set_("Timestamp", now);
  set_("GameId", cleanGameId);
  set_("CategoryId", cleanCategoryId);
  set_("NomineeId", cleanNomineeId);
  set_("ResultStatus", sportsWagerKey_(wagerResultType || "settled") || "settled");
  set_("IsWinner", true);
  set_("FinalRank", "");
  set_("FinalPosition", "");
  set_("ResultValue", sportsWagerScoreSummaryValue_(score));
  set_("ResultSource", "sports-engine");
  set_("SettledAt", now);
  set_("Notes", notes || "sports-wager-settlement-direct");

  return {
    success: true,
    direct: true,
    gameId: cleanGameId,
    categoryId: cleanCategoryId,
    nomineeId: cleanNomineeId
  };

}

function sportsWagerUpsertCategoryResultForSettlement_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  wagerResultType,
  score,
  notes
) {

  winnerNomineeId =
    sportsWagerKey_(
      winnerNomineeId || ""
    );

  if (!winnerNomineeId) {
    return {
      success: false,
      skipped: true,
      reason: "missing-winner-nominee-id"
    };
  }

  try {

    if (typeof upsertCategoryResult_ === "function") {
      return upsertCategoryResult_({
        gameId:
          awardsGameId,
        categoryId:
          categoryId,
        nomineeId:
          winnerNomineeId,
        resultStatus:
          sportsWagerKey_(wagerResultType || "settled") || "settled",
        isWinner:
          true,
        resultValue:
          sportsWagerScoreSummaryValue_(score),
        resultSource:
          "sports-engine",
        settledAt:
          new Date(),
        notes:
          notes || "sports-wager-settlement",
        skipCacheClear:
          true
      });
    }

    return sportsWagerDirectUpsertCategoryResult_(
      awardsGameId,
      categoryId,
      winnerNomineeId,
      wagerResultType,
      score,
      notes || "sports-wager-settlement-direct-fallback"
    );

  } catch (err) {

    try {
      return sportsWagerDirectUpsertCategoryResult_(
        awardsGameId,
        categoryId,
        winnerNomineeId,
        wagerResultType,
        score,
        notes || "sports-wager-settlement-direct-after-error"
      );
    } catch (fallbackErr) {
      return {
        success: false,
        error: err && err.message ? err.message : String(err),
        fallbackError: fallbackErr && fallbackErr.message ? fallbackErr.message : String(fallbackErr)
      };
    }

  }

}

function sportsWagerBuildCategoriesBySportsGame_(
  awardsGameId
) {

  const rows =
    sportsWagerGetCategoryRows_(
      awardsGameId
    );

  const map = {};

  rows.forEach(function(row) {

    const key =
      row.categoryId;

    if (!key) {
      return;
    }

    if (!map[key]) {
      map[key] = {
        sportsGameId:
          row.sportsGameId,
        espnEventId:
          row.espnEventId,
        awardsGameId:
          row.gameId,
        categoryId:
          row.categoryId,
        market:
          row.sportsMarket || "moneyline",
        sportsLeague:
          row.sportsLeague || "",
        categoryScore:
          sportsWagerBuildScoreFromCategoryRow_(row),
        nominees: []
      };
    }

    map[key].nominees.push({
      nomineeId:
        row.nomineeId,
      nominee:
        row.nominee,
      selection:
        row.sportsSelection,
      line:
        row.sportsLine
    });

  });

  return map;

}

function sportsWagerFindWinnerNomineeId_(
  score,
  nominees,
  market
) {

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const homeScore =
    sportsWagerNumber_(
      score.HomeScore,
      0
    );

  const awayScore =
    sportsWagerNumber_(
      score.AwayScore,
      0
    );

  if (market === "soccer-moneyline") {

    let winningSelection = "";

    if (homeScore > awayScore) {
      winningSelection = "home";
    } else if (awayScore > homeScore) {
      winningSelection = "away";
    } else if (
      sportsWagerHasScoreValue_(score.HomeScore) &&
      sportsWagerHasScoreValue_(score.AwayScore)
    ) {
      winningSelection = "draw";
    }

    if (!winningSelection) {
      return "";
    }

    const winner =
      nominees.find(function(nominee) {
        return (
          sportsWagerKey_(nominee.selection) === winningSelection ||
          sportsWagerKey_(nominee.nomineeId) === winningSelection ||
          sportsWagerKey_(nominee.nominee) === winningSelection
        );
      });

    return winner
      ? sportsWagerKey_(winner.nomineeId)
      : "";

  }

  if (market === "moneyline") {

    const winnerSide =
      sportsWagerFindWinnerSideFromScore_(
        score
      );

    const winnerName =
      sportsWagerString_(
        score.Winner ||
        score.winner ||
        score.WinnerName ||
        score.winnerName ||
        score.WinnerTeam ||
        score.winnerTeam ||
        score.WinningTeam ||
        score.winningTeam ||
        (
          winnerSide === "home"
            ? score.HomeTeam
            : winnerSide === "away"
              ? score.AwayTeam
              : ""
        )
      );

    const winnerSlug =
      sportsWagerSlug_(
        winnerName
      );

    for (let i = 0; i < nominees.length; i++) {

      const nominee =
        nominees[i];

      const nomineeId =
        sportsWagerKey_(
          nominee.nomineeId
        );

      if (
        winnerSide &&
        sportsWagerKey_(nominee.selection) === winnerSide
      ) {
        return nomineeId;
      }

      if (
        winnerSlug &&
        (
          nomineeId === winnerSlug ||
          sportsWagerSlug_(nominee.nominee) === winnerSlug
        )
      ) {
        return nomineeId;
      }

    }

    return "";

  }

  if (market === "spread") {

    let best = null;
    let bestAdjustedScore = null;

    nominees.forEach(function(nominee) {

      const selection =
        sportsWagerKey_(
          nominee.selection
        );

      const line =
        sportsWagerNumber_(
          nominee.line,
          0
        );

      let adjusted = null;

      if (selection === "home") {
        adjusted = homeScore + line;
      }

      if (selection === "away") {
        adjusted = awayScore + line;
      }

      if (adjusted === null) {
        return;
      }

      if (
        bestAdjustedScore === null ||
        adjusted > bestAdjustedScore
      ) {
        bestAdjustedScore = adjusted;
        best = nominee;
      } else if (adjusted === bestAdjustedScore) {
        best = null;
      }

    });

    return best
      ? sportsWagerKey_(best.nomineeId)
      : "";

  }

  if (market === "total") {

    const totalScore =
      homeScore + awayScore;

    const line =
      nominees.length
        ? sportsWagerNumber_(nominees[0].line, "")
        : "";

    if (line === "") {
      return "";
    }

    if (totalScore === line) {
      return "";
    }

    const winningSelection =
      totalScore > line
        ? "over"
        : "under";

    const winner =
      nominees.find(function(nominee) {
        return sportsWagerKey_(nominee.selection) === winningSelection;
      });

    return winner
      ? sportsWagerKey_(winner.nomineeId)
      : "";

  }

  return "";

}

function sportsWagerGetSettlementResult_(
  score,
  nominees,
  market
) {

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  score =
    score || {};

  nominees =
    nominees || [];

  if (
    !sportsWagerIsCompletedScore_(
      score
    )
  ) {
    return {
      resolved: false,
      winnerNomineeId: "",
      wagerResultType: "",
      reason: "not-completed"
    };
  }

  const hasHomeScore =
    sportsWagerHasScoreValue_(
      score.HomeScore
    );

  const hasAwayScore =
    sportsWagerHasScoreValue_(
      score.AwayScore
    );

  const homeScore =
    sportsWagerNumber_(
      score.HomeScore,
      null
    );

  const awayScore =
    sportsWagerNumber_(
      score.AwayScore,
      null
    );

  const isTie =
    hasHomeScore &&
    hasAwayScore &&
    homeScore !== null &&
    awayScore !== null &&
    homeScore === awayScore;

  /*
    Normal 2-option moneyline:
    Away / Home only.

    If the game ends tied:
    - WinnerNomineeId must be "draw" so the game is finalized.
    - WagerResultType must be "half-refund" so the bankroll logic
      returns half the wager.
  */
  if (
    market === "moneyline" &&
    isTie
  ) {
    return {
      resolved: true,
      winnerNomineeId:
        SPORTS_WAGER_DRAW_NOMINEE_ID,
      wagerResultType:
        "half-refund",
      reason:
        "moneyline-tie-half-refund"
    };
  }

  /*
    Soccer 3-way moneyline:
    Away / Draw / Home.

    If the game ends tied:
    - Draw is an actual winning nominee.
    - WagerResultType stays "win".
  */
  if (
    market === "soccer-moneyline" &&
    isTie
  ) {

    const drawNominee =
      nominees.find(function(nominee) {

        const nomineeId =
          sportsWagerKey_(
            nominee.nomineeId
          );

        const nomineeName =
          sportsWagerSlug_(
            nominee.nominee
          );

        const selection =
          sportsWagerKey_(
            nominee.selection
          );

        return (
          nomineeId === "draw" ||
          nomineeId === "tie" ||
          nomineeName === "draw" ||
          nomineeName === "tie" ||
          nomineeName === "draw-tie" ||
          selection === "draw" ||
          selection === "tie"
        );

      });

    if (drawNominee) {
      return {
        resolved: true,
        winnerNomineeId:
          sportsWagerKey_(
            drawNominee.nomineeId
          ),
        wagerResultType:
          "win",
        reason:
          "soccer-3way-draw"
      };
    }

    return {
      resolved: false,
      winnerNomineeId: "",
      wagerResultType: "",
      reason:
        "draw-nominee-missing"
    };

  }

  const winnerNomineeId =
    sportsWagerFindWinnerNomineeId_(
      score,
      nominees,
      market
    );

  if (!winnerNomineeId) {
    return {
      resolved: false,
      winnerNomineeId: "",
      wagerResultType: "",
      reason: "winner-not-found"
    };
  }

  return {
    resolved: true,
    winnerNomineeId:
      winnerNomineeId,
    wagerResultType:
      "win",
    reason:
      "winner-found"
  };

}

function testForceSettleSportsWagerHalfRefundFix() {

  const result =
    settleSportsWagers({
      gameId: "fifa-world-cup-2026",
      force: true
    });

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

}

/* =====================================================
   PUBLIC INTERNAL: SETTLE SPORTS WAGERS
===================================================== */

function settleSportsWagers(payload) {

  payload =
    payload || {};

  if (
    !sportsWagerBoolean_(
      payload.skipRefresh
    )
  ) {

    refreshSportsWagerScores(
      payload
    );

  }

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const force =
    sportsWagerBoolean_(
      payload.force
    );

  const map =
    sportsWagerBuildCategoriesBySportsGame_(
      awardsGameId
    );

  const keys =
    Object.keys(map);

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    settled: 0,
    skipped: 0,
    errors: []
  };

  keys.forEach(function(key) {

    const item =
      map[key];

    try {

      let score = null;
      let scoreFetchError = null;

      try {
        score =
          fetchSportsScoreForWager_({
            sportsGameId:
              item.sportsGameId,
            espnEventId:
              item.espnEventId
          });
      } catch (fetchErr) {
        scoreFetchError =
          fetchErr && fetchErr.message
            ? fetchErr.message
            : String(fetchErr);
      }

      score =
        sportsWagerMergeScoreWithCategorySnapshot_(
          score,
          item.categoryScore
        );

      if (!score) {
        throw new Error(
          scoreFetchError ||
          "No score found from Sports Scores Engine or Categories snapshot."
        );
      }

      summary.checked++;

      const completed =
        sportsWagerIsCompletedScore_(
          score
        );

      if (!completed) {
        summary.skipped++;
        return;
      }

      sportsWagerSetCategorySettingFinalLock_(
        awardsGameId,
        item.categoryId,
        "final-ready-to-settle",
        false
      );

      const settlement =
        sportsWagerGetSettlementResult_(
          score,
          item.nominees,
          item.market
        );

      if (!settlement.resolved) {

        sportsWagerSetCategorySettingFinalLock_(
          awardsGameId,
          item.categoryId,
          "final-needs-review",
          true
        );

        summary.skipped++;

        summary.errors.push({
          sportsGameId:
            item.sportsGameId,
          espnEventId:
            item.espnEventId,
          categoryId:
            item.categoryId,
          market:
            item.market,
          winner:
            score.Winner || "",
          homeTeam:
            score.HomeTeam || "",
          awayTeam:
            score.AwayTeam || "",
          homeScore:
            score.HomeScore,
          awayScore:
            score.AwayScore,
          status:
            score.Status || "",
          state:
            score.State || "",
          completed:
            score.Completed,
          error:
            settlement.reason ||
            "Could not resolve sports wager result."
        });

        return;

      }

      const updated =
        updateSportsWagerSettingWinner_(
          awardsGameId,
          item.categoryId,
          settlement.winnerNomineeId,
          force,
          settlement.wagerResultType
        );

      if (updated) {

        sportsWagerSetCategorySettingFinalLock_(
          awardsGameId,
          item.categoryId,
          "settled",
          true
        );

        sportsWagerUpsertCategoryResultForSettlement_(
          awardsGameId,
          item.categoryId,
          settlement.winnerNomineeId,
          settlement.wagerResultType,
          score,
          settlement.reason || "sports-wager-settled"
        );

        summary.settled++;

      } else {

        sportsWagerSetCategorySettingFinalLock_(
          awardsGameId,
          item.categoryId,
          "settled",
          true
        );

        sportsWagerUpsertCategoryResultForSettlement_(
          awardsGameId,
          item.categoryId,
          settlement.winnerNomineeId,
          settlement.wagerResultType,
          score,
          settlement.reason || "sports-wager-settled-existing"
        );

        summary.settled++;

      }

    } catch (err) {

      summary.errors.push({
        sportsGameId:
          item.sportsGameId,
        espnEventId:
          item.espnEventId,
        categoryId:
          item.categoryId,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  SpreadsheetApp.flush();

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  }

  return summary;

}

/* =====================================================
   ADMIN API: SETTLE SPORTS WAGERS
===================================================== */

function apiAdminSettleSportsWagers(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  /*
    The admin page already has a separate Refresh Scores / Records button.
    Do not run a full score refresh again before settlement by default,
    because that can make the browser hit its timeout before settlement starts.
  */
  if (payload.skipRefresh === undefined) {
    payload.skipRefresh = true;
  }

  return settleSportsWagers(
    payload
  );

}

/* =====================================================
   REFRESH LIVE SCORES FOR SPORTS WAGER CATEGORIES
   Copies latest Sports Scores Engine data into Categories.
===================================================== */

function refreshSportsWagerScores(payload) {

  payload =
    payload || {};

  setupSportsWagerSystem();

  const sourceRefresh =
    sportsWagerMaybeRefreshScoresEngine_(
      payload
    );

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      success: true,
      awardsGameId: awardsGameId,
      checked: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      message: "No category rows found"
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const required = [
    "GameId",
    "CategoryId",
    "SportsGameId",
    "ESPNEventId",
    "HomeScore",
    "AwayScore",
    "SportsStatus",
    "SportsClock",
    "SportsPeriod"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    throw new Error(
      "Categories missing sports score columns: " +
      missing.join(", ")
    );
  }

  const settingsLookup =
    sportsWagerGetCategorySettingsLookup_(
      awardsGameId
    );

  const updatedData =
    data.map(function(row) {
      return row.slice();
    });

  const scoreCache = {};
  const settingsSyncCache = {};

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    sourceRefresh:
      sourceRefresh,
    checked: 0,
    updated: 0,
    skipped: 0,
    repairedIds: 0,
    settingsSynced: 0,
    errors: []
  };

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      sportsWagerString_(
        row[col.GameId]
      );

    if (rowGameId !== awardsGameId) {
      continue;
    }

    const categoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    const resolvedIds =
      sportsWagerResolveEventIdsForCategory_(
        categoryId,
        row[col.SportsGameId],
        row[col.ESPNEventId],
        settingsLookup
      );

    const sportsGameId =
      resolvedIds.sportsGameId;

    const espnEventId =
      resolvedIds.espnEventId;

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      summary.skipped++;
      continue;
    }

    if (
      sportsWagerString_(row[col.SportsGameId]) !== sportsGameId ||
      sportsWagerString_(row[col.ESPNEventId]) !== espnEventId
    ) {
      summary.repairedIds++;
    }

    const cacheKey =
      sportsGameId + "|" + espnEventId;

    try {

      if (!scoreCache[cacheKey]) {

        scoreCache[cacheKey] =
          fetchSportsScoreForWager_({
            sportsGameId:
              sportsGameId,
            espnEventId:
              espnEventId
          });

        summary.checked++;

      }

      const score =
        scoreCache[cacheKey];

      const market =
        col.SportsMarket !== undefined
          ? sportsWagerNormalizeMarket_(
              row[col.SportsMarket]
            )
          : SPORTS_WAGER_DEFAULT_MARKET;

      const categoryName =
        sportsWagerCategoryName_(
          score,
          market
        );

      let selection =
        col.SportsSelection !== undefined
          ? sportsWagerKey_(
              row[col.SportsSelection]
            )
          : "";

      if (!selection) {

        const currentNominee =
          col.Nominee !== undefined
            ? sportsWagerString_(row[col.Nominee])
            : "";

        if (
          currentNominee === sportsWagerString_(score.HomeTeam)
        ) {
          selection = "home";
        }

        if (
          currentNominee === sportsWagerString_(score.AwayTeam)
        ) {
          selection = "away";
        }

        if (
          sportsWagerKey_(currentNominee) === "draw"
        ) {
          selection = "draw";
        }

      }

      const selectionName =
        sportsWagerSelectionName_(
          score,
          selection
        );

      if (col.Category !== undefined) {
        updatedData[i][col.Category] =
          categoryName;
      }

      if (
        selectionName &&
        col.Nominee !== undefined
      ) {
        updatedData[i][col.Nominee] =
          selectionName;
      }

      if (
        selectionName &&
        col.ShortAnswer !== undefined
      ) {
        updatedData[i][col.ShortAnswer] =
          selectionName;
      }

      if (col.SportsSelection !== undefined && selection) {
        updatedData[i][col.SportsSelection] =
          selection;
      }

      if (col.SportsGameId !== undefined) {
        updatedData[i][col.SportsGameId] =
          sportsWagerString_(score.GameId || sportsGameId);
      }

      if (col.ESPNEventId !== undefined) {
        updatedData[i][col.ESPNEventId] =
          sportsWagerString_(score.ESPNEventId || espnEventId);
      }

      if (col.SportsLeague !== undefined) {
        updatedData[i][col.SportsLeague] =
          sportsWagerString_(score.League);
      }

      if (col.HomeTeam !== undefined) {
        updatedData[i][col.HomeTeam] =
          sportsWagerString_(score.HomeTeam);
      }

      if (col.AwayTeam !== undefined) {
        updatedData[i][col.AwayTeam] =
          sportsWagerString_(score.AwayTeam);
      }

      if (col.HomeScore !== undefined) {
        updatedData[i][col.HomeScore] =
          score.HomeScore;
      }

      if (col.AwayScore !== undefined) {
        updatedData[i][col.AwayScore] =
          score.AwayScore;
      }

      if (col.HomeRecord !== undefined) {
        updatedData[i][col.HomeRecord] =
          sportsWagerCleanRecordDisplay_(score.HomeRecord);
      }

      if (col.AwayRecord !== undefined) {
        updatedData[i][col.AwayRecord] =
          sportsWagerCleanRecordDisplay_(score.AwayRecord);
      }

      if (col.LogoUrl !== undefined) {

        let logo = "";

        if (selection === "home") {
          logo = sportsWagerString_(score.HomeLogo);
        }

        if (selection === "away") {
          logo = sportsWagerString_(score.AwayLogo);
        }

        updatedData[i][col.LogoUrl] =
          logo;

      }

      updatedData[i][col.SportsStatus] =
        sportsWagerString_(
          score.Status
        );

      updatedData[i][col.SportsClock] =
        sportsWagerString_(
          score.Clock
        );

      updatedData[i][col.SportsPeriod] =
        sportsWagerString_(
          score.Period
        );

      if (col.SportsState !== undefined) {
        updatedData[i][col.SportsState] =
          sportsWagerString_(
            score.State
          );
      }

      const settingsKey =
        categoryId;

      if (
        categoryId &&
        !settingsSyncCache[settingsKey]
      ) {

        setSportsGameIdOnCategorySettings_(
          awardsGameId,
          categoryId,
          sportsWagerString_(score.GameId || sportsGameId),
          sportsWagerString_(score.ESPNEventId || espnEventId),
          score,
          market
        );

        sportsWagerSyncCategorySettingsOddsReady_(
          awardsGameId,
          categoryId
        );

        if (
          sportsWagerIsCompletedScore_(
            score
          )
        ) {
          sportsWagerSetCategorySettingFinalLock_(
            awardsGameId,
            categoryId,
            "final-ready-to-settle",
            false
          );
        }

        settingsSyncCache[settingsKey] = true;
        summary.settingsSynced++;

      }

      summary.updated++;

    } catch (err) {

      summary.errors.push({
        row: i + 1,
        categoryId:
          categoryId,
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        idSource:
          resolvedIds.source,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  }

  const writableHeaders = [
    "Category",
    "Nominee",
    "ShortAnswer",
    "SportsSelection",
    "SportsGameId",
    "ESPNEventId",
    "SportsLeague",
    "HomeTeam",
    "AwayTeam",
    "HomeScore",
    "AwayScore",
    "HomeRecord",
    "AwayRecord",
    "LogoUrl",
    "SportsStatus",
    "SportsState",
    "SportsClock",
    "SportsPeriod"
  ];

  writableHeaders
    .forEach(function(header) {

      if (col[header] === undefined) {
        return;
      }

      const values =
        updatedData
          .slice(1)
          .map(function(row) {
            return [
              row[col[header]]
            ];
          });

      if (!values.length) {
        return;
      }

      sh
        .getRange(
          2,
          col[header] + 1,
          values.length,
          1
        )
        .setValues(
          values
        );

    });

  SpreadsheetApp.flush();

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return summary;

}



function apiAdminRefreshSportsWagerScores(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return refreshSportsWagerScores(
    payload
  );

}

/* =====================================================
   ADMIN API: ONE-CLICK REFRESH + SETTLE SPORTS WAGERS
===================================================== */


function finalizeSportsWagerResultsFromCategories_(
  awardsGameId,
  force
) {

  awardsGameId =
    sportsWagerNormalizeGameId_(
      awardsGameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  const map =
    sportsWagerBuildCategoriesBySportsGame_(
      awardsGameId
    );

  const keys =
    Object.keys(map);

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    finalized: 0,
    skipped: 0,
    errors: []
  };

  keys.forEach(function(key) {

    const item =
      map[key];

    const score =
      item.categoryScore;

    summary.checked++;

    if (
      !score ||
      !sportsWagerIsCompletedScore_(score)
    ) {
      summary.skipped++;
      return;
    }

    const settlement =
      sportsWagerGetSettlementResult_(
        score,
        item.nominees,
        item.market
      );

    if (!settlement.resolved) {

      sportsWagerSetCategorySettingFinalLock_(
        awardsGameId,
        item.categoryId,
        "final-needs-review",
        true
      );

      summary.skipped++;
      summary.errors.push({
        categoryId:
          item.categoryId,
        sportsGameId:
          item.sportsGameId,
        espnEventId:
          item.espnEventId,
        reason:
          settlement.reason || "not-resolved-from-categories"
      });
      return;

    }

    const updated =
      updateSportsWagerSettingWinner_(
        awardsGameId,
        item.categoryId,
        settlement.winnerNomineeId,
        force === true,
        settlement.wagerResultType
      );

    sportsWagerUpsertCategoryResultForSettlement_(
      awardsGameId,
      item.categoryId,
      settlement.winnerNomineeId,
      settlement.wagerResultType,
      score,
      "finalized-from-categories"
    );

    if (updated) {
      summary.finalized++;
    } else {
      summary.skipped++;
    }

  });

  SpreadsheetApp.flush();

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return summary;

}

function testFinalizeSportsWagerResultsFromCategoriesNow() {

  return finalizeSportsWagerResultsFromCategories_(
    SPORTS_WAGER_DEFAULT_GAME_ID,
    true
  );

}

function sportsWagerGetAllSportsAwardsGameIds_() {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORIES_SHEET);

  if (!sh || sh.getLastRow() < 2) {
    return [SPORTS_WAGER_DEFAULT_GAME_ID];
  }

  const data =
    sh.getDataRange().getValues();

  const headers =
    data[0].map(function(header) {
      return sportsWagerString_(header);
    });

  const col =
    sportsWagerHeaderMap_(headers);

  const map = {};

  data.slice(1).forEach(function(row) {

    const gameId =
      col.GameId === undefined
        ? ""
        : sportsWagerString_(row[col.GameId]);

    const categoryId =
      col.CategoryId === undefined
        ? ""
        : sportsWagerString_(row[col.CategoryId]);

    const sportsGameId =
      col.SportsGameId === undefined
        ? ""
        : sportsWagerString_(row[col.SportsGameId]);

    const espnEventId =
      col.ESPNEventId === undefined
        ? ""
        : sportsWagerString_(row[col.ESPNEventId]);

    if (
      gameId &&
      (
        sportsGameId ||
        espnEventId ||
        sportsWagerKey_(categoryId).indexOf("sports-") === 0
      )
    ) {
      map[gameId] = true;
    }

  });

  const ids =
    Object.keys(map);

  return ids.length
    ? ids
    : [SPORTS_WAGER_DEFAULT_GAME_ID];

}

function finalizeSportsWagerResultsFromCategoriesForAllGames_(force) {

  const gameIds =
    sportsWagerGetAllSportsAwardsGameIds_();

  const summary = {
    success: true,
    gameCount: gameIds.length,
    checked: 0,
    finalized: 0,
    skipped: 0,
    errors: [],
    results: []
  };

  gameIds.forEach(function(gameId) {

    try {

      const result =
        finalizeSportsWagerResultsFromCategories_(
          gameId,
          force === true
        );

      summary.checked +=
        result && result.checked
          ? result.checked
          : 0;

      summary.finalized +=
        result && result.finalized
          ? result.finalized
          : 0;

      summary.skipped +=
        result && result.skipped
          ? result.skipped
          : 0;

      summary.errors =
        summary.errors.concat(
          result && result.errors
            ? result.errors
            : []
        );

      summary.results.push(result);

    } catch (err) {

      summary.errors.push({
        gameId: gameId,
        error: err && err.message ? err.message : String(err)
      });

    }

  });

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return summary;

}

function testFinalizeAllSportsWagerResultsFromCategoriesNow() {

  return finalizeSportsWagerResultsFromCategoriesForAllGames_(true);

}


/* =====================================================
   SOURCE-OF-TRUTH SPORTS SETTLEMENT FINALIZER
   New approach:
   - Do not depend on CategorySettings.Locked.
   - Do not depend on an existing WinnerNomineeId.
   - Do not require Categories to already show final, when the
     Sports Scores Engine has the final row.
   - Fetch SportsScores once per league, build a lookup, then settle
     every matching Awards App wager from the final source score.
===================================================== */

function sportsWagerFetchScoresForLeagueSnapshot_(league) {

  league =
    sportsWagerString_(league);

  if (!league) {
    return [];
  }

  const result =
    sportsWagerFetchJson_(
      {
        action: "getSportsScores",
        league: league
      },
      "Sports Scores League Snapshot"
    );

  if (!result.success) {
    throw new Error(
      result.error ||
      result.message ||
      "Sports Scores API returned failure for league " + league
    );
  }

  let scores =
    result.scores ||
    result.games ||
    result.events ||
    result.data ||
    [];

  if (
    !Array.isArray(scores) &&
    scores
  ) {
    scores = [scores];
  }

  return scores.map(function(score) {
    return sportsWagerNormalizeScore_(score);
  });

}

function sportsWagerBuildSourceScoreLookup_(items) {

  const leagueMap = {};

  items.forEach(function(item) {

    const league =
      sportsWagerString_(
        item.sportsLeague ||
        item.league ||
        ""
      );

    if (league) {
      leagueMap[league] = true;
    }

  });

  const byGameId = {};
  const byEspnEventId = {};
  const errors = [];

  Object.keys(leagueMap).forEach(function(league) {

    try {

      const scores =
        sportsWagerFetchScoresForLeagueSnapshot_(
          league
        );

      scores.forEach(function(score) {

        const gameId =
          sportsWagerString_(score.GameId);

        const espnEventId =
          sportsWagerString_(score.ESPNEventId);

        if (gameId) {
          byGameId[gameId] = score;
        }

        if (espnEventId) {
          byEspnEventId[espnEventId] = score;
        }

      });

    } catch (err) {

      errors.push({
        league: league,
        error: err && err.message ? err.message : String(err)
      });

    }

  });

  return {
    leagues: Object.keys(leagueMap),
    byGameId: byGameId,
    byEspnEventId: byEspnEventId,
    errors: errors
  };

}

function sportsWagerFindSourceScoreForItem_(item, lookup) {

  lookup = lookup || {};

  const espnEventId =
    sportsWagerString_(
      item.espnEventId ||
      ""
    );

  const sportsGameId =
    sportsWagerString_(
      item.sportsGameId ||
      ""
    );

  if (
    espnEventId &&
    lookup.byEspnEventId &&
    lookup.byEspnEventId[espnEventId]
  ) {
    return lookup.byEspnEventId[espnEventId];
  }

  if (
    sportsGameId &&
    lookup.byGameId &&
    lookup.byGameId[sportsGameId]
  ) {
    return lookup.byGameId[sportsGameId];
  }

  return null;

}

function sportsWagerSetCategorySettingWinnerAllMatches_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  wagerResultType,
  settlementStatus
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  let data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return 0;
  }

  let headers =
    data[0].map(function(header) {
      return sportsWagerString_(header);
    });

  function ensureCol_(headerName) {

    let index =
      headers.indexOf(headerName);

    if (index !== -1) {
      return index;
    }

    index = headers.length;

    sh
      .getRange(1, index + 1)
      .setValue(headerName);

    headers.push(headerName);

    return index;

  }

  const categoryIdCol =
    ensureCol_("CategoryId");

  const gameIdCol =
    headers.indexOf("GameId");

  const lockedCol =
    ensureCol_("Locked");

  const winnerCol =
    ensureCol_("WinnerNomineeId");

  const resultTypeCol =
    ensureCol_("WagerResultType");

  const statusCol =
    ensureCol_("SettlementStatus");

  const resultSourceCol =
    ensureCol_("ResultSource");

  data =
    sh.getDataRange()
      .getValues();

  const cleanGameId =
    sportsWagerString_(awardsGameId);

  const cleanCategoryId =
    sportsWagerKey_(categoryId);

  const cleanWinner =
    sportsWagerKey_(winnerNomineeId);

  const cleanResultType =
    sportsWagerKey_(wagerResultType || "win");

  const cleanStatus =
    sportsWagerKey_(settlementStatus || "settled");

  let updated = 0;

  for (let i = 1; i < data.length; i++) {

    const rowCategoryId =
      sportsWagerKey_(
        data[i][categoryIdCol]
      );

    if (rowCategoryId !== cleanCategoryId) {
      continue;
    }

    const rowGameId =
      gameIdCol !== -1
        ? sportsWagerString_(data[i][gameIdCol])
        : "";

    if (
      gameIdCol !== -1 &&
      rowGameId &&
      rowGameId !== cleanGameId
    ) {
      continue;
    }

    sh.getRange(i + 1, lockedCol + 1).setValue(true);

    if (cleanWinner) {
      sh.getRange(i + 1, winnerCol + 1).setValue(cleanWinner);
    }

    if (cleanResultType) {
      sh.getRange(i + 1, resultTypeCol + 1).setValue(cleanResultType);
    }

    sh.getRange(i + 1, statusCol + 1).setValue(cleanStatus);
    sh.getRange(i + 1, resultSourceCol + 1).setValue("sports-engine");

    updated++;

  }

  return updated;

}

function finalizeSportsWagerResultsFromSourceScores_(payload) {

  payload = payload || {};

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  const force =
    sportsWagerBoolean_(payload.force) ||
    payload.force === undefined;

  const map =
    sportsWagerBuildCategoriesBySportsGame_(
      awardsGameId
    );

  const items =
    Object.keys(map).map(function(key) {
      return map[key];
    });

  const lookup =
    sportsWagerBuildSourceScoreLookup_(
      items
    );

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    mode: "source-score-finalizer",
    leagues: lookup.leagues,
    checked: 0,
    finalized: 0,
    categoryResultsWritten: 0,
    lockedForReview: 0,
    skipped: 0,
    sourceErrors: lookup.errors,
    errors: []
  };

  items.forEach(function(item) {

    summary.checked++;

    const sourceScore =
      sportsWagerFindSourceScoreForItem_(
        item,
        lookup
      );

    const score =
      sportsWagerMergeScoreWithCategorySnapshot_(
        sourceScore,
        item.categoryScore
      );

    if (
      !score ||
      !sportsWagerIsCompletedScore_(score)
    ) {
      summary.skipped++;
      return;
    }

    const settlement =
      sportsWagerGetSettlementResult_(
        score,
        item.nominees,
        item.market
      );

    if (!settlement.resolved) {

      sportsWagerSetCategorySettingFinalLock_(
        awardsGameId,
        item.categoryId,
        "final-needs-review",
        true
      );

      summary.lockedForReview++;
      summary.errors.push({
        categoryId: item.categoryId,
        sportsGameId: item.sportsGameId,
        espnEventId: item.espnEventId,
        sourceFound: sourceScore ? true : false,
        status: score.Status || "",
        state: score.State || "",
        homeTeam: score.HomeTeam || "",
        awayTeam: score.AwayTeam || "",
        homeScore: score.HomeScore,
        awayScore: score.AwayScore,
        reason: settlement.reason || "not-resolved-from-source-score"
      });
      return;

    }

    const settingsUpdated =
      sportsWagerSetCategorySettingWinnerAllMatches_(
        awardsGameId,
        item.categoryId,
        settlement.winnerNomineeId,
        settlement.wagerResultType,
        "settled"
      );

    const categoryResult =
      sportsWagerUpsertCategoryResultForSettlement_(
        awardsGameId,
        item.categoryId,
        settlement.winnerNomineeId,
        settlement.wagerResultType,
        score,
        "settled-from-source-scores"
      );

    if (
      settingsUpdated > 0 ||
      categoryResult && categoryResult.success
    ) {
      summary.finalized++;
      if (categoryResult && categoryResult.success) {
        summary.categoryResultsWritten++;
      }
    } else {
      summary.skipped++;
      summary.errors.push({
        categoryId: item.categoryId,
        sportsGameId: item.sportsGameId,
        espnEventId: item.espnEventId,
        reason: "final-source-score-found-but-no-settings-row-updated"
      });
    }

  });

  SpreadsheetApp.flush();

  if (
    payload.skipCacheClear !== true &&
    typeof clearAppCaches === "function"
  ) {
    clearAppCaches();
  }

  return summary;

}

function finalizeSportsWagerResultsFromSourceScoresForAllGames_(force) {

  const gameIds =
    sportsWagerGetAllSportsAwardsGameIds_();

  const summary = {
    success: true,
    mode: "source-score-finalizer-all-games",
    gameCount: gameIds.length,
    checked: 0,
    finalized: 0,
    categoryResultsWritten: 0,
    lockedForReview: 0,
    skipped: 0,
    sourceErrors: [],
    errors: [],
    results: []
  };

  gameIds.forEach(function(gameId) {

    try {

      const result =
        finalizeSportsWagerResultsFromSourceScores_({
          gameId: gameId,
          force: force === true,
          skipCacheClear: true
        });

      summary.checked += result.checked || 0;
      summary.finalized += result.finalized || 0;
      summary.categoryResultsWritten += result.categoryResultsWritten || 0;
      summary.lockedForReview += result.lockedForReview || 0;
      summary.skipped += result.skipped || 0;
      summary.sourceErrors = summary.sourceErrors.concat(result.sourceErrors || []);
      summary.errors = summary.errors.concat(result.errors || []);
      summary.results.push(result);

    } catch (err) {

      summary.errors.push({
        gameId: gameId,
        error: err && err.message ? err.message : String(err)
      });

    }

  });

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return summary;

}

function testFinalizeSportsWagerResultsFromSourceScoresNow() {

  return finalizeSportsWagerResultsFromSourceScoresForAllGames_(true);

}

function testFinalizeFifaWorldCupSportsWagerResultsFromSourceScoresNow() {

  return finalizeSportsWagerResultsFromSourceScores_(
    {
      gameId: "fifa-world-cup-2026",
      awardsGameId: "fifa-world-cup-2026",
      force: true
    }
  );

}

function refreshAndSettleSportsWagers(payload) {

  payload =
    payload || {};

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const sourceRefresh =
    sportsWagerMaybeRefreshScoresEngine_(
      {
        refreshEngineFirst:
          true,

        scoreRefreshMode:
          payload.scoreRefreshMode ||
          "window",

        daysBack:
          payload.daysBack || 2,

        daysForward:
          payload.daysForward || 2
      }
    );

  const refresh =
    refreshSportsWagerScores(
      {
        gameId:
          awardsGameId,

        awardsGameId:
          awardsGameId,

        refreshEngineFirst:
          false
      }
    );

  const oddsEngineRefresh =
    sportsWagerMaybeRefreshOddsEngine_(
      {
        refreshOddsEngineFirst:
          payload.refreshOddsEngineFirst !== false,
        skipOddsEngineRefresh:
          payload.skipOddsEngineRefresh === true
      }
    );

  const autoOdds =
    autoSetSportsWagerOdds(
      {
        gameId:
          awardsGameId,

        awardsGameId:
          awardsGameId,

        oddsMode:
          payload.oddsMode || "real",

        force:
          false,

        skipFinal:
          true,

        refreshOddsIfStale:
          false
      }
    );

  const settle =
    settleSportsWagers(
      {
        gameId:
          awardsGameId,

        awardsGameId:
          awardsGameId,

        skipRefresh:
          true,

        force:
          payload.force
      }
    );

  const categoryResultsFinalizer =
    finalizeSportsWagerResultsFromSourceScores_({
      gameId: awardsGameId,
      force: true
    });

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    awardsGameId: awardsGameId,
    sourceRefresh: sourceRefresh,
    oddsEngineRefresh: oddsEngineRefresh,
    refresh: refresh,
    autoOdds: autoOdds,
    settle: settle,
    categoryResultsFinalizer: categoryResultsFinalizer,
    updated:
      refresh && refresh.updated
        ? refresh.updated
        : 0,
    oddsUpdated:
      autoOdds && autoOdds.updatedRows
        ? autoOdds.updatedRows
        : 0,
    oddsProtected:
      autoOdds && autoOdds.protected
        ? autoOdds.protected
        : 0,
    checked:
      refresh && refresh.checked
        ? refresh.checked
        : 0,
    settled:
      settle && settle.settled
        ? settle.settled
        : 0,
    skipped:
      settle && settle.skipped
        ? settle.skipped
        : 0,
    errors:
      (refresh && refresh.errors
        ? refresh.errors
        : []
      ).concat(
        settle && settle.errors
          ? settle.errors
          : []
      )
  };

}

function apiAdminRefreshAndSettleSportsWagers(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return refreshAndSettleSportsWagers(
    payload
  );

}

/* =====================================================
   AUTO UPDATE EXISTING SPORTS WAGER ODDS
   Safe default: skips games that already have bets.
===================================================== */

function sportsWagerCategoryHasBets_(
  awardsGameId,
  categoryId
) {

  const sheetName =
    typeof BETS_SHEET !== "undefined"
      ? BETS_SHEET
      : "Bets";

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        sheetName
      );

  if (!sh) {
    return false;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined
  ) {
    return false;
  }

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      sportsWagerString_(
        data[i][col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        data[i][col.CategoryId]
      );

    if (
      rowGameId === awardsGameId &&
      rowCategoryId === sportsWagerKey_(categoryId)
    ) {
      return true;
    }

  }

  return false;

}

function autoSetSportsWagerOdds(payload) {

  payload =
    payload || {};

  setupSportsWagerSystem();

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const force =
    sportsWagerBoolean_(
      payload.force
    );

  const skipFinalOdds =
    payload.skipFinal === undefined
      ? true
      : sportsWagerBoolean_(
          payload.skipFinal
        );

  const refreshOddsIfStale =
    payload.refreshOddsIfStale === undefined
      ? true
      : sportsWagerBoolean_(
          payload.refreshOddsIfStale
        );

  const requestedOddsMode =
    sportsWagerKey_(
      payload.oddsMode ||
      payload.mode ||
      "real"
    );

  const effectiveOddsMode =
    (
      requestedOddsMode === "real-only" ||
      requestedOddsMode === "strict-real"
    )
      ? "real-only"
      : "real";

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      success: true,
      awardsGameId: awardsGameId,
      checked: 0,
      updatedRows: 0,
      skipped: 0,
      protected: 0,
      errors: []
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const required = [
    "GameId",
    "CategoryId",
    "Nominee",
    "SportsGameId",
    "ESPNEventId",
    "SportsMarket",
    "SportsSelection",
    "BettingOdds"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    throw new Error(
      "Categories missing auto odds columns: " +
      missing.join(", ")
    );
  }

  const settingsLookup =
    sportsWagerGetCategorySettingsLookup_(
      awardsGameId
    );

  const updatedData =
    data.map(function(row) {
      return row.slice();
    });

  const groups = {};

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      sportsWagerString_(
        row[col.GameId]
      );

    if (rowGameId !== awardsGameId) {
      continue;
    }

    const categoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    const market =
      sportsWagerNormalizeMarket_(
        row[col.SportsMarket]
      );

    const resolvedIds =
      sportsWagerResolveEventIdsForCategory_(
        categoryId,
        row[col.SportsGameId],
        row[col.ESPNEventId],
        settingsLookup
      );

    const sportsGameId =
      resolvedIds.sportsGameId;

    const espnEventId =
      resolvedIds.espnEventId;

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      continue;
    }

    const key =
      [
        categoryId,
        sportsGameId,
        espnEventId,
        market
      ].join("|");

    if (!groups[key]) {
      groups[key] = {
        categoryId: categoryId,
        market: market,
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        needsOdds: false,
        isFinal: false,
        rows: []
      };
    }

    const rowOddsReady =
      sportsWagerOddsValueIsReady_(
        row[col.BettingOdds]
      );

    const rowOddsSource =
      col.OddsSource !== undefined
        ? sportsWagerKey_(
            row[col.OddsSource]
          )
        : "";

    if (
      !rowOddsReady ||
      rowOddsSource === "pending-real-odds"
    ) {
      groups[key].needsOdds = true;
    }

    const rowSportsState =
      col.SportsState !== undefined
        ? sportsWagerKey_(
            row[col.SportsState]
          )
        : "";

    const rowSportsStatus =
      col.SportsStatus !== undefined
        ? sportsWagerKey_(
            row[col.SportsStatus]
          )
        : "";

    if (
      rowSportsState === "post" ||
      rowSportsState === "final" ||
      rowSportsStatus.indexOf("final") !== -1 ||
      rowSportsStatus.indexOf("full_time") !== -1 ||
      rowSportsStatus.indexOf("complete") !== -1
    ) {
      groups[key].isFinal = true;
    }

    groups[key].rows.push({
      rowIndex: i,
      rowNumber: i + 1,
      nominee:
        sportsWagerString_(
          row[col.Nominee]
        ),
      selection:
        sportsWagerKey_(
          row[col.SportsSelection]
        )
    });

  }

  const betCategoryMap = {};

  if (!force) {

    const sheetName =
      typeof BETS_SHEET !== "undefined"
        ? BETS_SHEET
        : "Bets";

    const betsSheet =
      SpreadsheetApp
        .getActive()
        .getSheetByName(
          sheetName
        );

    if (betsSheet) {

      const betsData =
        betsSheet.getDataRange()
          .getValues();

      if (betsData.length > 1) {

        const betsHeaders =
          betsData[0].map(function(header) {
            return String(header || "").trim();
          });

        const betsCol =
          sportsWagerHeaderMap_(
            betsHeaders
          );

        if (
          betsCol.GameId !== undefined &&
          betsCol.CategoryId !== undefined
        ) {

          for (let i = 1; i < betsData.length; i++) {

            const betGameId =
              sportsWagerString_(
                betsData[i][betsCol.GameId]
              );

            if (betGameId !== awardsGameId) {
              continue;
            }

            const betCategoryId =
              sportsWagerKey_(
                betsData[i][betsCol.CategoryId]
              );

            if (betCategoryId) {
              betCategoryMap[betCategoryId] = true;
            }

          }

        }

      }

    }

  }

  const keys =
    Object.keys(groups);

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    oddsMode: effectiveOddsMode,
    checked: 0,
    updatedRows: 0,
    skipped: 0,
    protected: 0,
    skippedFinal: 0,
    skippedAlreadyReady: 0,
    repairedIds: 0,
    settingsSynced: 0,
    errors: []
  };

  keys.forEach(function(key) {

    const group =
      groups[key];

    if (
      skipFinalOdds &&
      group.isFinal
    ) {
      summary.skippedFinal++;
      return;
    }

    if (
      payload.onlyPendingOdds === true &&
      !group.needsOdds
    ) {
      summary.skippedAlreadyReady++;
      return;
    }

    try {

      const hasBets =
        betCategoryMap[
          sportsWagerKey_(
            group.categoryId
          )
        ] === true;

      if (
        hasBets &&
        !force
      ) {
        summary.protected++;
        return;
      }

      const score =
        fetchSportsScoreForWager_({
          sportsGameId:
            group.sportsGameId,
          espnEventId:
            group.espnEventId
        });

      const wagerData =
        buildSportsWagerEntries_(
          score,
          group.market,
          effectiveOddsMode,
          {
            refreshOddsIfStale:
              refreshOddsIfStale
          }
        );

      const entriesBySelection = {};

      (wagerData.entries || [])
        .forEach(function(entry) {
          entriesBySelection[
            sportsWagerKey_(entry.selection)
          ] = entry;
        });

      summary.checked++;

      setSportsGameIdOnCategorySettings_(
        awardsGameId,
        group.categoryId,
        sportsWagerString_(score.GameId || group.sportsGameId),
        sportsWagerString_(score.ESPNEventId || group.espnEventId),
        score,
        group.market
      );

      summary.settingsSynced++;

      group.rows.forEach(function(item) {

        let selection =
          item.selection;

        if (!selection) {

          if (
            sportsWagerString_(item.nominee) ===
            sportsWagerString_(score.HomeTeam)
          ) {
            selection = "home";
          }

          if (
            sportsWagerString_(item.nominee) ===
            sportsWagerString_(score.AwayTeam)
          ) {
            selection = "away";
          }

          if (
            sportsWagerKey_(item.nominee) === "draw"
          ) {
            selection = "draw";
          }

        }

        const entry =
          entriesBySelection[selection];

        if (col.Category !== undefined) {
          updatedData[item.rowIndex][col.Category] =
            sportsWagerCategoryName_(
              score,
              group.market
            );
        }

        if (col.SportsGameId !== undefined) {
          if (
            sportsWagerString_(updatedData[item.rowIndex][col.SportsGameId]) !==
            sportsWagerString_(score.GameId || group.sportsGameId)
          ) {
            summary.repairedIds++;
          }
          updatedData[item.rowIndex][col.SportsGameId] =
            sportsWagerString_(score.GameId || group.sportsGameId);
        }

        if (col.ESPNEventId !== undefined) {
          updatedData[item.rowIndex][col.ESPNEventId] =
            sportsWagerString_(score.ESPNEventId || group.espnEventId);
        }

        if (col.SportsLeague !== undefined) {
          updatedData[item.rowIndex][col.SportsLeague] =
            sportsWagerString_(score.League);
        }

        if (col.HomeTeam !== undefined) {
          updatedData[item.rowIndex][col.HomeTeam] =
            sportsWagerString_(score.HomeTeam);
        }

        if (col.AwayTeam !== undefined) {
          updatedData[item.rowIndex][col.AwayTeam] =
            sportsWagerString_(score.AwayTeam);
        }

        if (col.HomeRecord !== undefined) {
          updatedData[item.rowIndex][col.HomeRecord] =
            sportsWagerCleanRecordDisplay_(score.HomeRecord);
        }

        if (col.AwayRecord !== undefined) {
          updatedData[item.rowIndex][col.AwayRecord] =
            sportsWagerCleanRecordDisplay_(score.AwayRecord);
        }

        if (col.SportsSelection !== undefined && selection) {
          updatedData[item.rowIndex][col.SportsSelection] =
            selection;
        }

        if (!entry) {
          summary.skipped++;
          return;
        }

        if (col.SportsLine !== undefined) {
          updatedData[item.rowIndex][col.SportsLine] =
            entry.line;
        }

        if (col.Nominee !== undefined) {
          updatedData[item.rowIndex][col.Nominee] =
            entry.name;
        }

        if (col.ShortAnswer !== undefined) {
          updatedData[item.rowIndex][col.ShortAnswer] =
            entry.name;
        }

        if (col.LogoUrl !== undefined) {
          updatedData[item.rowIndex][col.LogoUrl] =
            entry.logo || "";
        }

        const cleanOdds =
          sportsWagerCleanOddsForSheet_(
            entry.odds
          );

        if (cleanOdds === "") {
          summary.skipped++;
          return;
        }

        updatedData[item.rowIndex][col.BettingOdds] =
          cleanOdds;

        if (col.OddsSource !== undefined) {
          updatedData[item.rowIndex][col.OddsSource] =
            wagerData.source;
        }

        if (col.OddsLastUpdated !== undefined) {
          updatedData[item.rowIndex][col.OddsLastUpdated] =
            sportsWagerNow_();
        }

        summary.updatedRows++;

      });

      sportsWagerSyncCategorySettingsOddsReady_(
        awardsGameId,
        group.categoryId
      );

    } catch (err) {

      summary.errors.push({
        categoryId:
          group.categoryId,
        sportsGameId:
          group.sportsGameId,
        espnEventId:
          group.espnEventId,
        market:
          group.market,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  const writableHeaders = [
    "Category",
    "SportsGameId",
    "ESPNEventId",
    "SportsLeague",
    "HomeTeam",
    "AwayTeam",
    "HomeRecord",
    "AwayRecord",
    "BettingOdds",
    "SportsLine",
    "SportsSelection",
    "Nominee",
    "ShortAnswer",
    "LogoUrl",
    "OddsSource",
    "OddsLastUpdated"
  ];

  writableHeaders
    .forEach(function(header) {

      if (col[header] === undefined) {
        return;
      }

      const values =
        updatedData
          .slice(1)
          .map(function(row) {
            return [
              row[col[header]]
            ];
          });

      if (!values.length) {
        return;
      }

      sh
        .getRange(
          2,
          col[header] + 1,
          values.length,
          1
        )
        .setValues(
          values
        );

    });

  SpreadsheetApp.flush();

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return summary;

}



function apiAdminAutoSetSportsWagerOdds(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return autoSetSportsWagerOdds(
    payload
  );

}

/* =====================================================
   AUTOMATIC SPORTS WAGER SCORE REFRESH
===================================================== */

const SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION =
  "runSportsWagerScoreRefresh";

  function runSportsWagerScoreRefresh() {

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    return {
      success: false,
      message: "Sports wager score refresh already running"
    };
  }

  try {

    let sourceRefresh = null;

    try {
      sourceRefresh =
        sportsWagerMaybeRefreshScoresEngine_(
          {
            refreshEngineFirst:
              true,
            scoreRefreshMode:
              "window",
            daysBack:
              3,
            daysForward:
              7
          }
        );
    } catch (sourceErr) {
      sourceRefresh = {
        success: false,
        error:
          sourceErr && sourceErr.message
            ? sourceErr.message
            : String(sourceErr)
      };
    }

    let oddsEngineRefresh = null;

    try {
      oddsEngineRefresh =
        sportsWagerMaybeRefreshOddsEngine_(
          {
            refreshOddsEngineFirst:
              false
          }
        );
    } catch (oddsEngineErr) {
      oddsEngineRefresh = {
        success: false,
        error:
          oddsEngineErr && oddsEngineErr.message
            ? oddsEngineErr.message
            : String(oddsEngineErr)
      };
    }

    const gameIds =
      getSportsWagerGameIdsForRefresh_();

    const results =
      [];

    gameIds.forEach(function(gameId) {

      try {

        const refresh =
          refreshSportsWagerScores({
            gameId: gameId
          });

        const autoOdds =
          autoSetSportsWagerOdds({
            gameId: gameId,
            force: false,
            oddsMode: "real",
            skipFinal: true,
            refreshOddsIfStale: false
          });

        const settle =
          settleSportsWagers({
            gameId: gameId,
            skipRefresh: true,
            force: true
          });

        results.push({
          gameId: gameId,
          success: true,
          refresh: refresh,
          autoOdds: autoOdds,
          settle: settle
        });

      } catch (err) {

        results.push({
          gameId: gameId,
          success: false,
          error:
            err && err.message
              ? err.message
              : String(err)
        });

      }

    });

    return {
      success: true,
      sourceRefresh:
        sourceRefresh,
      oddsEngineRefresh:
        oddsEngineRefresh,
      gameCount: gameIds.length,
      results: results
    };

  } finally {

    lock.releaseLock();

  }

}

function getSportsWagerGameIdsForRefresh_() {

  const gameIdMap = {};

  /*
    Current production layout keeps Awards App GameId on
    Categories, not CategorySettings. Use Categories as the
    source of truth for which app games contain sports rows.
  */
  try {

    const categoriesSheet =
      SpreadsheetApp
        .getActive()
        .getSheetByName(CATEGORIES_SHEET);

    if (categoriesSheet) {

      const values =
        categoriesSheet.getDataRange().getValues();

      if (values.length > 1) {

        const headers =
          values[0].map(function(header) {
            return String(header || "").trim();
          });

        const gameIdCol =
          headers.indexOf("GameId");

        const sportsGameIdCol =
          headers.indexOf("SportsGameId");

        const espnEventIdCol =
          headers.indexOf("ESPNEventId");

        if (gameIdCol > -1) {

          for (let i = 1; i < values.length; i++) {

            const row = values[i];

            const gameId =
              String(row[gameIdCol] || "").trim();

            const sportsGameId =
              sportsGameIdCol > -1
                ? String(row[sportsGameIdCol] || "").trim()
                : "";

            const espnEventId =
              espnEventIdCol > -1
                ? String(row[espnEventIdCol] || "").trim()
                : "";

            if (
              gameId &&
              (sportsGameId || espnEventId)
            ) {
              gameIdMap[gameId] = true;
            }

          }

        }

      }

    }

  } catch (err) {

    // Fall back below.

  }

  const gameIds =
    Object.keys(gameIdMap);

  if (!gameIds.length) {
    return [
      SPORTS_WAGER_DEFAULT_GAME_ID
    ];
  }

  return gameIds;

}

function installSportsWagerScoreRefreshTrigger() {

  removeSportsWagerScoreRefreshTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    success: true,
    message: "Sports wager score refresh trigger installed every 5 minutes"
  };

}

function removeSportsWagerScoreRefreshTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION
    ) {

      ScriptApp.deleteTrigger(
        trigger
      );

      removed++;

    }

  });

  return {
    success: true,
    removed: removed
  };

}

/* =====================================================
   AUTOMATIC SPORTS WAGER REFRESH + SETTLEMENT
===================================================== */

const SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION =
  "runSportsWagerAutoRefreshAndSettle";

function runSportsWagerAutoRefreshAndSettle() {

  return runSportsWagerScoreRefresh();

}

function installSportsWagerAutoSettleTrigger() {

  removeSportsWagerAutoSettleTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    success: true,
    message: "Sports wager auto refresh and settle trigger installed every 5 minutes"
  };

}

function removeSportsWagerAutoSettleTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION
    ) {

      ScriptApp.deleteTrigger(
        trigger
      );

      removed++;

    }

  });

  return {
    success: true,
    removed: removed
  };

}

function checkSportsWagerAutoSettleTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  return triggers
    .filter(function(trigger) {
      return (
        trigger.getHandlerFunction() ===
        SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION
      );
    })
    .map(function(trigger) {
      return {
        handler: trigger.getHandlerFunction(),
        eventType: String(trigger.getEventType()),
        source: String(trigger.getTriggerSource())
      };
    });

}

function apiAdminRunSportsFullSync(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  /*
    Browser/web-app requests can timeout before a full ESPN + odds + sheet sync
    completes. Run the no-ESPN finalizer immediately, then queue the heavy sync
    as a time trigger so it can finish outside the browser request.
  */
  const immediateFinalizer =
    finalizeSportsWagerResultsFromSourceScoresForAllGames_(
      true
    );

  const queued =
    queueSportsWagerSmartAutomationNow_(
      "manual-full-sync"
    );

  return {
    success: true,
    queued: true,
    message:
      "Smart Sports Sync queued. Finished-game finalizer ran now; source scores/odds sync will run in the background trigger shortly.",
    immediateFinalizer: immediateFinalizer,
    sync: {
      queued: true,
      preFinalizer: immediateFinalizer,
      postFinalizer: null,
      results: []
    },
    trigger: queued
  };

}

function apiAdminInstallSportsWagerAutoSyncTrigger(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return installSportsWagerSmartAutomationTrigger();

}

function apiAdminRemoveSportsWagerAutoSyncTrigger(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return removeSportsWagerSmartAutomationTriggers();

}

function apiAdminGetSportsWagerAutoSyncStatus(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return checkSportsWagerSmartAutomationStatus();

}

function apiAdminInstallSmartSportsAutomation(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return installSportsWagerSmartAutomationTrigger();

}

function apiAdminRemoveSmartSportsAutomation(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return removeSportsWagerSmartAutomationTriggers();

}

function apiAdminGetSmartSportsAutomationStatus(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return checkSportsWagerSmartAutomationStatus();

}

function apiAdminFinalizeAllSportsWagerResults(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return finalizeSportsWagerResultsFromCategoriesForAllGames_(true);

}



/* =====================================================
   SMART SPORTS AUTOMATION
   One trigger, per-league throttling.

   Purpose:
   - Run often enough to feel live.
   - Only call ESPN/Odds API for leagues with active Awards App wagers.
   - Respect SportsSettings per-league Enabled / poll minutes.
===================================================== */

const SPORTS_WAGER_SMART_TRIGGER_FUNCTION =
  "runSportsWagerSmartAutomation";

const SPORTS_WAGER_SMART_QUEUED_FUNCTION =
  "runSportsWagerSmartAutomationQueued";

const SPORTS_WAGER_SMART_LAST_PREFIX =
  "SPORTS_WAGER_SMART_LAST_";

function sportsWagerSmartParseDate_(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? null
      : value;
  }

  const d =
    new Date(value);

  return isNaN(d.getTime())
    ? null
    : d;

}

function sportsWagerSmartStatusText_(event) {

  return sportsWagerKey_(
    [
      event.sportsStatus,
      event.sportsState,
      event.settlementStatus
    ].join(" ")
  );

}

function sportsWagerSmartIsFinal_(event) {

  const text =
    sportsWagerSmartStatusText_(event);

  return (
    event.completed === true ||
    text.indexOf("final") !== -1 ||
    text.indexOf("full_time") !== -1 ||
    text.indexOf("full time") !== -1 ||
    text.indexOf("post") !== -1 ||
    text.indexOf("completed") !== -1
  );

}

function sportsWagerSmartIsLive_(event, now) {

  const text =
    sportsWagerSmartStatusText_(event);

  if (sportsWagerSmartIsFinal_(event)) {
    return false;
  }

  if (
    text.indexOf("in") !== -1 ||
    text.indexOf("live") !== -1 ||
    text.indexOf("progress") !== -1 ||
    text.indexOf("halftime") !== -1 ||
    text.indexOf("intermission") !== -1
  ) {
    return true;
  }

  const start =
    event.eventTime;

  if (!start) {
    return false;
  }

  const minutes =
    (now.getTime() - start.getTime()) / 60000;

  return minutes >= -15 && minutes <= 360;

}

function sportsWagerSmartIsSettled_(event) {

  const status =
    sportsWagerKey_(
      event.settlementStatus
    );

  return status === "settled";

}

function sportsWagerSmartLeagueKey_(value) {

  return sportsWagerKey_(value);

}

function sportsWagerSmartPropertyKey_(league) {

  return (
    SPORTS_WAGER_SMART_LAST_PREFIX +
    sportsWagerSmartLeagueKey_(league)
      .replace(/[^a-z0-9]+/g, "_")
      .toUpperCase()
  );

}

function sportsWagerSmartDefaultLeagueSetting_(league) {

  return {
    league: league,
    enabled: true,
    seasonActive: true,
    pollPreGameMinutes: 60,
    pollLiveMinutes: 5,
    pollFinalMinutes: 120,
    savePeriodSnapshots: false,
    oddsEnabled: true,
    oddsCooldownMinutes: 240,
    oddsDailyMaxPulls: 2,
    oddsMonthlyMaxPulls: 30
  };

}

function sportsWagerSmartGetLeagueSettings_() {

  const map = {};

  try {

    const response =
      sportsWagerFetchJson_(
        {
          action: "getSportsSettingsAdmin"
        },
        "Sports Settings Admin"
      );

    const leagues =
      response && response.leagues
        ? response.leagues
        : [];

    leagues.forEach(function(item) {

      const league =
        sportsWagerString_(
          item.league || item.League
        );

      if (!league) {
        return;
      }

      map[sportsWagerSmartLeagueKey_(league)] = {
        sport:
          sportsWagerString_(item.sport || item.Sport),
        league:
          league,
        seasonActive:
          item.seasonActive === undefined && item.SeasonActive === undefined
            ? true
            : sportsWagerBoolean_(item.seasonActive !== undefined ? item.seasonActive : item.SeasonActive),
        enabled:
          (item.seasonActive === false || item.SeasonActive === false || String(item.seasonActive || item.SeasonActive || "").toLowerCase() === "false")
            ? false
            : (item.enabled === undefined
                ? sportsWagerBoolean_(item.Enabled)
                : sportsWagerBoolean_(item.enabled)),
        pollPreGameMinutes:
          Math.max(
            15,
            sportsWagerNumber_(
              item.pollPreGameMinutes || item.PollPreGameMinutes,
              60
            )
          ),
        pollLiveMinutes:
          Math.max(
            5,
            sportsWagerNumber_(
              item.pollLiveMinutes || item.PollLiveMinutes,
              5
            )
          ),
        pollFinalMinutes:
          Math.max(
            15,
            sportsWagerNumber_(
              item.pollFinalMinutes || item.PollFinalMinutes,
              120
            )
          ),
        savePeriodSnapshots:
          item.savePeriodSnapshots === undefined
            ? sportsWagerBoolean_(item.SavePeriodSnapshots)
            : sportsWagerBoolean_(item.savePeriodSnapshots),
        oddsEnabled:
          item.oddsEnabled === undefined && item.OddsEnabled === undefined
            ? true
            : sportsWagerBoolean_(item.oddsEnabled !== undefined ? item.oddsEnabled : item.OddsEnabled),
        oddsCooldownMinutes:
          Math.max(
            30,
            sportsWagerNumber_(
              item.oddsCooldownMinutes || item.OddsCooldownMinutes,
              240
            )
          ),
        oddsDailyMaxPulls:
          Math.max(
            0,
            sportsWagerNumber_(
              item.oddsDailyMaxPulls || item.OddsDailyMaxPulls,
              2
            )
          ),
        oddsMonthlyMaxPulls:
          Math.max(
            0,
            sportsWagerNumber_(
              item.oddsMonthlyMaxPulls || item.OddsMonthlyMaxPulls,
              30
            )
          )
      };

    });

  } catch (err) {
    // If settings cannot be read, the smart sync will use safe defaults
    // for leagues found in Awards App Categories.
  }

  return map;

}

function sportsWagerSmartReadCategorySettingsMap_() {

  const map = {};

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORY_SETTINGS_SHEET);

  if (!sh || sh.getLastRow() < 2) {
    return map;
  }

  const data =
    sh.getDataRange().getValues();

  const headers =
    data[0].map(function(header) {
      return sportsWagerString_(header);
    });

  const col =
    sportsWagerHeaderMap_(headers);

  data.slice(1).forEach(function(row) {

    const categoryId =
      col.CategoryId === undefined
        ? ""
        : sportsWagerString_(row[col.CategoryId]);

    if (!categoryId) {
      return;
    }

    map[categoryId] = {
      categoryId:
        categoryId,
      locked:
        col.Locked === undefined ? "" : row[col.Locked],
      winnerNomineeId:
        col.WinnerNomineeId === undefined ? "" : sportsWagerString_(row[col.WinnerNomineeId]),
      wagerResultType:
        col.WagerResultType === undefined ? "" : sportsWagerString_(row[col.WagerResultType]),
      settlementStatus:
        col.SettlementStatus === undefined ? "" : sportsWagerString_(row[col.SettlementStatus]),
      oddsReady:
        col.OddsReady === undefined ? "" : row[col.OddsReady],
      sportsLeague:
        col.SportsLeague === undefined ? "" : sportsWagerString_(row[col.SportsLeague]),
      lockDateTime:
        col.LockDateTime === undefined ? null : sportsWagerSmartParseDate_(row[col.LockDateTime])
    };

  });

  return map;

}

function sportsWagerSmartCollectEvents_() {

  const settingsMap =
    sportsWagerSmartReadCategorySettingsMap_();

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORIES_SHEET);

  if (!sh || sh.getLastRow() < 2) {
    return [];
  }

  const data =
    sh.getDataRange().getValues();

  const headers =
    data[0].map(function(header) {
      return sportsWagerString_(header);
    });

  const col =
    sportsWagerHeaderMap_(headers);

  const eventsByCategory = {};

  data.slice(1).forEach(function(row) {

    const gameId =
      col.GameId === undefined
        ? ""
        : sportsWagerString_(row[col.GameId]);

    const categoryId =
      col.CategoryId === undefined
        ? ""
        : sportsWagerString_(row[col.CategoryId]);

    const sportsGameId =
      col.SportsGameId === undefined
        ? ""
        : sportsWagerString_(row[col.SportsGameId]);

    const espnEventId =
      col.ESPNEventId === undefined
        ? ""
        : sportsWagerString_(row[col.ESPNEventId]);

    if (!gameId || !categoryId || (!sportsGameId && !espnEventId)) {
      return;
    }

    if (eventsByCategory[categoryId]) {
      return;
    }

    const setting =
      settingsMap[categoryId] || {};

    const league =
      sportsWagerString_(
        (col.SportsLeague !== undefined ? row[col.SportsLeague] : "") ||
        setting.sportsLeague ||
        ""
      );

    if (!league) {
      return;
    }

    eventsByCategory[categoryId] = {
      gameId:
        gameId,
      categoryId:
        categoryId,
      sportsGameId:
        sportsGameId,
      espnEventId:
        espnEventId,
      league:
        league,
      sportsStatus:
        col.SportsStatus === undefined ? "" : sportsWagerString_(row[col.SportsStatus]),
      sportsState:
        col.SportsState === undefined ? "" : sportsWagerString_(row[col.SportsState]),
      sportsClock:
        col.SportsClock === undefined ? "" : sportsWagerString_(row[col.SportsClock]),
      homeScore:
        col.HomeScore === undefined ? "" : row[col.HomeScore],
      awayScore:
        col.AwayScore === undefined ? "" : row[col.AwayScore],
      locked:
        setting.locked,
      winnerNomineeId:
        setting.winnerNomineeId || "",
      wagerResultType:
        setting.wagerResultType || "",
      settlementStatus:
        setting.settlementStatus || "",
      oddsReady:
        setting.oddsReady,
      eventTime:
        setting.lockDateTime
    };

  });

  return Object.keys(eventsByCategory)
    .map(function(key) {
      return eventsByCategory[key];
    });

}

function sportsWagerSmartGetDueLeagues_(payload) {

  payload =
    payload || {};

  const now =
    new Date();

  const forceDue =
    sportsWagerBoolean_(payload.forceDue) ||
    sportsWagerBoolean_(payload.manual);

  const settings =
    sportsWagerSmartGetLeagueSettings_();

  const events =
    sportsWagerSmartCollectEvents_();

  const props =
    PropertiesService.getScriptProperties();

  const due = {};
  const skipped = [];
  const relevant = [];

  events.forEach(function(event) {

    const leagueKey =
      sportsWagerSmartLeagueKey_(event.league);

    const setting =
      settings[leagueKey] ||
      sportsWagerSmartDefaultLeagueSetting_(event.league);

    if (!setting.enabled) {
      skipped.push({
        league: event.league,
        categoryId: event.categoryId,
        reason: "league-disabled"
      });
      return;
    }

    const settled =
      sportsWagerSmartIsSettled_(event);

    const final =
      sportsWagerSmartIsFinal_(event);

    const live =
      sportsWagerSmartIsLive_(event, now);

    if (settled && !forceDue) {
      skipped.push({
        league: event.league,
        categoryId: event.categoryId,
        reason: "already-settled"
      });
      return;
    }

    let phase = "pregame";
    let pollMinutes =
      setting.pollPreGameMinutes || 60;

    if (final || settled) {
      phase = "final";
      pollMinutes =
        setting.pollFinalMinutes || 120;
    } else if (live) {
      phase = "live";
      pollMinutes =
        setting.pollLiveMinutes || 5;
    }

    let relevantNow = false;

    if (forceDue) {
      relevantNow = true;
    } else if (live) {
      relevantNow = true;
    } else if (final && !settled) {
      relevantNow = true;
    } else if (event.eventTime) {
      const minutesToStart =
        (event.eventTime.getTime() - now.getTime()) / 60000;

      const minutesSinceStart =
        (now.getTime() - event.eventTime.getTime()) / 60000;

      relevantNow =
        minutesToStart <= 2880 &&
        minutesSinceStart <= 4320;
    } else if (!sportsWagerBoolean_(event.oddsReady) || !settled) {
      relevantNow = true;
    }

    if (!relevantNow) {
      skipped.push({
        league: event.league,
        categoryId: event.categoryId,
        reason: "outside-smart-window"
      });
      return;
    }

    relevant.push({
      league: event.league,
      categoryId: event.categoryId,
      phase: phase,
      pollMinutes: pollMinutes
    });

    const propKey =
      sportsWagerSmartPropertyKey_(event.league);

    const last =
      sportsWagerSmartParseDate_(
        props.getProperty(propKey)
      );

    const dueNow =
      forceDue ||
      !last ||
      ((now.getTime() - last.getTime()) / 60000) >= pollMinutes;

    if (dueNow) {
      due[leagueKey] = {
        league: event.league,
        pollMinutes: pollMinutes,
        phase: phase,
        reason: forceDue ? "manual" : phase
      };
    }

  });

  return {
    settings: settings,
    events: events,
    relevant: relevant,
    skipped: skipped,
    dueLeagues: Object.keys(due).map(function(key) {
      return due[key];
    })
  };

}

function sportsWagerSmartRefreshScoresEngine_(leagueNames) {

  if (!leagueNames.length) {
    return null;
  }

  return sportsWagerThrowIfUnknownSportsAction_(
    sportsWagerFetchJson_(
      {
        action: "refreshSportsScoresWindowAdmin",
        daysBack: 3,
        daysForward: 2,
        leagues: leagueNames.join(",")
      },
      "Smart Sports Scores window refresh"
    ),
    "Smart Sports Scores window refresh"
  );

}

function sportsWagerSmartRefreshOddsEngine_(leagueNames) {

  if (!leagueNames.length) {
    return null;
  }

  return sportsWagerThrowIfUnknownSportsAction_(
    sportsWagerFetchJson_(
      {
        action: "runSportsOddsHybridRefresh",
        leagues: leagueNames.join(",")
      },
      "Smart Sports Odds refresh"
    ),
    "Smart Sports Odds refresh"
  );

}


function sportsWagerSmartGetOddsDueLeagueNames_(
  dueLeagues,
  settings,
  payload
) {

  dueLeagues =
    dueLeagues || [];

  settings =
    settings || {};

  payload =
    payload || {};

  const forceOdds =
    sportsWagerBoolean_(payload.forceOdds);

  const props =
    PropertiesService.getScriptProperties();

  const todayKey =
    sportsWagerFormatDateKey_(
      new Date()
    );

  const monthKey =
    todayKey.substring(0, 7);

  return dueLeagues.filter(function(item) {

    const league =
      item.league || "";

    const key =
      sportsWagerSmartLeagueKey_(league);

    const setting =
      settings[key] ||
      sportsWagerSmartDefaultLeagueSetting_(league);

    if (setting.oddsEnabled === false) {
      return false;
    }

    if (forceOdds) {
      return true;
    }

    const lastOdds =
      sportsWagerSmartParseDate_(
        props.getProperty(
          sportsWagerSmartOddsLastPropertyKey_(league)
        )
      );

    const cooldown =
      Math.max(
        30,
        sportsWagerNumber_(
          setting.oddsCooldownMinutes,
          240
        )
      );

    if (
      lastOdds &&
      ((new Date().getTime() - lastOdds.getTime()) / 60000) < cooldown
    ) {
      return false;
    }

    const dailyMax =
      Math.max(
        0,
        sportsWagerNumber_(
          setting.oddsDailyMaxPulls,
          2
        )
      );

    if (
      dailyMax > 0 &&
      sportsWagerSmartNumberProperty_(
        props,
        sportsWagerSmartOddsDailyPropertyKey_(league, todayKey)
      ) >= dailyMax
    ) {
      return false;
    }

    const monthlyMax =
      Math.max(
        0,
        sportsWagerNumber_(
          setting.oddsMonthlyMaxPulls,
          30
        )
      );

    if (
      monthlyMax > 0 &&
      sportsWagerSmartNumberProperty_(
        props,
        sportsWagerSmartOddsMonthlyPropertyKey_(league, monthKey)
      ) >= monthlyMax
    ) {
      return false;
    }

    return true;

  }).map(function(item) {
    return item.league;
  });

}

function sportsWagerSmartMarkOddsLeaguesPulled_(leagueNames) {

  const props =
    PropertiesService.getScriptProperties();

  const now =
    new Date();

  const todayKey =
    sportsWagerFormatDateKey_(now);

  const monthKey =
    todayKey.substring(0, 7);

  (leagueNames || []).forEach(function(league) {

    props.setProperty(
      sportsWagerSmartOddsLastPropertyKey_(league),
      now.toISOString()
    );

    sportsWagerSmartIncrementNumberProperty_(
      props,
      sportsWagerSmartOddsDailyPropertyKey_(league, todayKey)
    );

    sportsWagerSmartIncrementNumberProperty_(
      props,
      sportsWagerSmartOddsMonthlyPropertyKey_(league, monthKey)
    );

  });

}

function sportsWagerSmartOddsLastPropertyKey_(league) {
  return "SPORTS_SMART_LAST_ODDS_" + sportsWagerSmartLeagueKey_(league).toUpperCase();
}

function sportsWagerSmartOddsDailyPropertyKey_(league, dayKey) {
  return "SPORTS_SMART_ODDS_DAY_" + sportsWagerSmartLeagueKey_(league).toUpperCase() + "_" + dayKey;
}

function sportsWagerSmartOddsMonthlyPropertyKey_(league, monthKey) {
  return "SPORTS_SMART_ODDS_MONTH_" + sportsWagerSmartLeagueKey_(league).toUpperCase() + "_" + monthKey;
}

function sportsWagerSmartNumberProperty_(props, key) {
  return sportsWagerNumber_(props.getProperty(key), 0);
}

function sportsWagerSmartIncrementNumberProperty_(props, key) {
  const next = sportsWagerSmartNumberProperty_(props, key) + 1;
  props.setProperty(key, String(next));
  return next;
}

function sportsWagerFormatDateKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function getSportsWagerGameIdsForRefreshByLeague_(leagueNames) {

  const filter = {};

  (leagueNames || []).forEach(function(league) {
    const key = sportsWagerSmartLeagueKey_(league);
    if (key) {
      filter[key] = true;
    }
  });

  const useFilter =
    Object.keys(filter).length > 0;

  const gameIdMap = {};

  const categoriesSheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(CATEGORIES_SHEET);

  if (!categoriesSheet || categoriesSheet.getLastRow() < 2) {
    return [
      SPORTS_WAGER_DEFAULT_GAME_ID
    ];
  }

  const values =
    categoriesSheet.getDataRange().getValues();

  const headers =
    values[0].map(function(header) {
      return sportsWagerString_(header);
    });

  const col =
    sportsWagerHeaderMap_(headers);

  values.slice(1).forEach(function(row) {

    const gameId =
      col.GameId === undefined ? "" : sportsWagerString_(row[col.GameId]);

    const league =
      col.SportsLeague === undefined ? "" : sportsWagerString_(row[col.SportsLeague]);

    const sportsGameId =
      col.SportsGameId === undefined ? "" : sportsWagerString_(row[col.SportsGameId]);

    const espnEventId =
      col.ESPNEventId === undefined ? "" : sportsWagerString_(row[col.ESPNEventId]);

    if (!gameId || (!sportsGameId && !espnEventId)) {
      return;
    }

    if (
      useFilter &&
      !filter[sportsWagerSmartLeagueKey_(league)]
    ) {
      return;
    }

    gameIdMap[gameId] = true;

  });

  const gameIds =
    Object.keys(gameIdMap);

  return gameIds.length
    ? gameIds
    : [SPORTS_WAGER_DEFAULT_GAME_ID];

}

function runSportsWagerSmartAutomation(payload) {

  payload =
    payload || {};

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    return {
      success: false,
      skipped: true,
      message: "Smart sports automation already running"
    };
  }

  try {

    setupSportsWagerSystem();

    const preFinalizer =
      finalizeSportsWagerResultsFromSourceScoresForAllGames_(true);

    const dueInfo =
      sportsWagerSmartGetDueLeagues_(payload);

    const leagueNames =
      dueInfo.dueLeagues.map(function(item) {
        return item.league;
      });

    const summary = {
      success: true,
      mode: payload.manual ? "manual" : "automation",
      startedAt: new Date(),
      dueLeagues: dueInfo.dueLeagues,
      relevantEvents: dueInfo.relevant.length,
      skippedEvents: dueInfo.skipped.length,
      sourceScores: null,
      sourceOdds: null,
      preFinalizer: preFinalizer,
      postFinalizer: null,
      gameCount: 0,
      results: []
    };

    if (!leagueNames.length) {
      summary.skipped = true;
      summary.message =
        "No sports wager leagues are due for sync right now.";
      return summary;
    }

    try {
      summary.sourceScores =
        sportsWagerSmartRefreshScoresEngine_(leagueNames);
    } catch (scoreErr) {
      summary.sourceScores = {
        success: false,
        error: scoreErr && scoreErr.message ? scoreErr.message : String(scoreErr)
      };
    }

    const oddsLeagueNames =
      sportsWagerSmartGetOddsDueLeagueNames_(
        dueInfo.dueLeagues,
        dueInfo.settings,
        payload
      );

    summary.oddsDueLeagues =
      oddsLeagueNames;

    try {
      summary.sourceOdds =
        sportsWagerSmartRefreshOddsEngine_(oddsLeagueNames);

      if (
        summary.sourceOdds &&
        summary.sourceOdds.success !== false
      ) {
        sportsWagerSmartMarkOddsLeaguesPulled_(
          oddsLeagueNames
        );
      }
    } catch (oddsErr) {
      summary.sourceOdds = {
        success: false,
        error: oddsErr && oddsErr.message ? oddsErr.message : String(oddsErr)
      };
    }

    const gameIds =
      getSportsWagerGameIdsForRefreshByLeague_(leagueNames);

    summary.gameCount =
      gameIds.length;

    gameIds.forEach(function(gameId) {

      try {

        const refresh =
          refreshSportsWagerScores({
            gameId: gameId,
            refreshEngineFirst: false
          });

        const autoOdds =
          autoSetSportsWagerOdds({
            gameId: gameId,
            force: false,
            oddsMode: "real",
            skipFinal: true,
            refreshOddsIfStale: false,
            refreshOddsEngineFirst: false
          });

        const settle =
          settleSportsWagers({
            gameId: gameId,
            skipRefresh: true,
            force: true
          });

        const categoryResultsFinalizer =
          finalizeSportsWagerResultsFromSourceScores_({
            gameId: gameId,
            force: true
          });

        summary.results.push({
          gameId: gameId,
          success: true,
          refresh: refresh,
          autoOdds: autoOdds,
          settle: settle,
          categoryResultsFinalizer: categoryResultsFinalizer
        });

      } catch (err) {

        summary.results.push({
          gameId: gameId,
          success: false,
          error: err && err.message ? err.message : String(err)
        });

      }

    });

    summary.postFinalizer =
      finalizeSportsWagerResultsFromSourceScoresForAllGames_(true);

    const props =
      PropertiesService.getScriptProperties();

    const nowString =
      new Date().toISOString();

    leagueNames.forEach(function(league) {
      props.setProperty(
        sportsWagerSmartPropertyKey_(league),
        nowString
      );
    });

    summary.finishedAt =
      new Date();

    if (typeof clearAppCaches === "function") {
      clearAppCaches();
    }

    return summary;

  } finally {
    lock.releaseLock();
  }

}

function removeSportsWagerSmartAutomationQueuedTriggers_() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WAGER_SMART_QUEUED_FUNCTION
    ) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }

  });

  return {
    success: true,
    removed: removed
  };

}

function runSportsWagerSmartAutomationQueued() {

  removeSportsWagerSmartAutomationQueuedTriggers_();

  return runSportsWagerSmartAutomation({
    manual: true,
    forceDue: true,
    reason: "queued-manual-sync"
  });

}

function queueSportsWagerSmartAutomationNow_(reason) {

  const cleanup =
    removeSportsWagerSmartAutomationQueuedTriggers_();

  const trigger =
    ScriptApp
      .newTrigger(SPORTS_WAGER_SMART_QUEUED_FUNCTION)
      .timeBased()
      .after(1000)
      .create();

  return {
    success: true,
    queued: true,
    reason: reason || "manual",
    removedOldQueuedTriggers: cleanup.removed || 0,
    handler: SPORTS_WAGER_SMART_QUEUED_FUNCTION,
    uniqueId: typeof trigger.getUniqueId === "function"
      ? trigger.getUniqueId()
      : ""
  };

}

function installSportsWagerSmartAutomationTrigger() {

  removeSportsWagerSmartAutomationTriggers();
  removeSportsWagerSmartAutomationQueuedTriggers_();
  removeSportsWagerAutoSettleTriggers();
  removeSportsWagerScoreRefreshTriggers();

  try {
    sportsWagerFetchJson_(
      { action: "removeSportsScoresWindowTriggerAdmin" },
      "Remove Sports Scores window trigger"
    );
  } catch (err) {
    // Best effort cleanup. The smart Awards App trigger is the one that matters.
  }

  try {
    sportsWagerFetchJson_(
      { action: "removeSportsOddsHybridTrigger" },
      "Remove Sports Odds hybrid trigger"
    );
  } catch (err) {
    // Best effort cleanup. Odds refresh will run through smart automation.
  }

  ScriptApp
    .newTrigger(SPORTS_WAGER_SMART_TRIGGER_FUNCTION)
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    success: true,
    message:
      "Smart Sports Automation installed. One trigger runs every 5 minutes but only calls active/due leagues based on each sport's settings.",
    intervalMinutes: 5,
    trigger:
      SPORTS_WAGER_SMART_TRIGGER_FUNCTION
  };

}

function removeSportsWagerSmartAutomationTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WAGER_SMART_TRIGGER_FUNCTION
    ) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }

  });

  return {
    success: true,
    removed: removed
  };

}

function checkSportsWagerSmartAutomationStatus() {

  const triggers =
    ScriptApp.getProjectTriggers();

  const smartTriggers =
    triggers
      .filter(function(trigger) {
        return trigger.getHandlerFunction() === SPORTS_WAGER_SMART_TRIGGER_FUNCTION;
      })
      .map(function(trigger) {
        return {
          handler: trigger.getHandlerFunction(),
          eventType: String(trigger.getEventType()),
          source: String(trigger.getTriggerSource())
        };
      });

  const queuedTriggers =
    triggers
      .filter(function(trigger) {
        return trigger.getHandlerFunction() === SPORTS_WAGER_SMART_QUEUED_FUNCTION;
      })
      .map(function(trigger) {
        return {
          handler: trigger.getHandlerFunction(),
          eventType: String(trigger.getEventType()),
          source: String(trigger.getTriggerSource())
        };
      });

  const oldAutoTriggers =
    checkSportsWagerAutoSettleTriggers();

  return {
    success: true,
    smartTriggers: smartTriggers,
    queuedTriggers: queuedTriggers,
    triggers: smartTriggers,
    oldAutoTriggers: oldAutoTriggers
  };

}

function testRunSmartSportsAutomationNow() {

  const result =
    runSportsWagerSmartAutomation({
      manual: true,
      forceDue: true,
      reason: "test"
    });

  Logger.log(JSON.stringify(result, null, 2));

}
