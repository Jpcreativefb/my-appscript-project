/* =====================================================
   SPORTS WAGER ENGINE
   Bridges the separate Sports Scores Engine into
   Awards App wager games.

   What this does:
   1. Pulls one sports event from the Sports Scores API.
   2. Creates one Awards App category for that matchup.
   3. Creates two nominees: away team and home team.
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

const SPORTS_WAGER_API_URL =
  "https://script.google.com/macros/s/AKfycbwVlgZa1FBvt99dpwr4PbrdBOs9IRcZ6BFlr-t6scTRNcVgQsJKpCWk1d8nxC681Sy0/exec";

const SPORTS_WAGER_DEFAULT_GAME_ID =
  "sports-wagers";

const SPORTS_WAGER_DEFAULT_MARKET =
  "moneyline";

const SPORTS_WAGER_DEFAULT_ODDS =
  2;

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsWagerString_(value) {

  return String(value || "")
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
        "SportsProvider",
        "SportsGameId",
        "ESPNEventId",
        "SportsLeague",
        "SportsMarket",
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

  return {
    success: true,
    message: "Sports wager columns are ready",
    categories: categoriesResult
  };

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

  const query =
    Object.keys(params)
      .map(function(key) {
        return (
          encodeURIComponent(key) +
          "=" +
          encodeURIComponent(params[key])
        );
      })
      .join("&");

  const response =
    UrlFetchApp.fetch(
      SPORTS_WAGER_API_URL + "?" + query,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      "Sports Scores API failed. HTTP " + code
    );
  }

  const result =
    JSON.parse(
      response.getContentText()
    );

  if (!result.success) {
    throw new Error(
      result.error ||
      result.message ||
      "Sports Scores API returned failure"
    );
  }

  const scores =
    result.scores || [];

  if (!scores.length) {
    throw new Error(
      "No sports score found for requested GameId / ESPNEventId"
    );
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

    const sportsGameId =
      col.SportsGameId !== undefined
        ? sportsWagerString_(row[col.SportsGameId])
        : "";

    const espnEventId =
      col.ESPNEventId !== undefined
        ? sportsWagerString_(row[col.ESPNEventId])
        : "";

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      continue;
    }

    rows.push({
      rowNumber: i + 1,
      gameId: rowGameId,
      categoryId:
        col.CategoryId !== undefined
          ? sportsWagerKey_(row[col.CategoryId])
          : "",
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
      sportsGameId: sportsGameId,
      espnEventId: espnEventId,
      homeTeam:
        col.HomeTeam !== undefined
          ? sportsWagerString_(row[col.HomeTeam])
          : "",
      awayTeam:
        col.AwayTeam !== undefined
          ? sportsWagerString_(row[col.AwayTeam])
          : ""
    });

  }

  return rows;

}

/* =====================================================
   CREATE CATEGORY ROW
===================================================== */

function appendSportsWagerCategoryRow_(
  score,
  awardsGameId,
  categoryId,
  nomineeName,
  nomineeId,
  odds
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

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const matchup =
    awayTeam + " @ " + homeTeam;

  const logo =
    nomineeName === homeTeam
      ? sportsWagerString_(score.HomeLogo)
      : sportsWagerString_(score.AwayLogo);

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
    matchup
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
    nomineeName
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "NomineeId",
    nomineeId
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
    nomineeName
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

  sportsWagerSetIfExists_(
    row,
    col,
    "CommunityRank",
    false
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
    SPORTS_WAGER_DEFAULT_MARKET
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
    sportsWagerString_(score.HomeRecord)
  );
  
  sportsWagerSetIfExists_(
    row,
    col,
    "AwayRecord",
    sportsWagerString_(score.AwayRecord)
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
    sportsWagerNumber_(
      odds,
      SPORTS_WAGER_DEFAULT_ODDS
    )
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsSource",
    "manual"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsLastUpdated",
    sportsWagerNow_()
  );

  /*
    Optional future support:
    If you later add a LogoUrl column, this will fill it.
  */
  sportsWagerSetIfExists_(
    row,
    col,
    "LogoUrl",
    logo
  );

  sh.appendRow(row);

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

function appendSportsWagerSettingsRow_(
  score,
  awardsGameId,
  categoryId
) {

  if (
    sportsWagerSettingsRowExists_(
      awardsGameId,
      categoryId
    )
  ) {
    return false;
  }

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

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const matchup =
    awayTeam + " @ " + homeTeam;

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
    0
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
    matchup
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
    "sports-wager-v1"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FavoriteNomineeId",
    ""
  );

  sh.appendRow(row);

  return true;

}

function updateSportsWagerSettingWinner_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  force
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

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined ||
    col.WinnerNomineeId === undefined
  ) {
    throw new Error(
      "CategorySettings missing GameId, CategoryId, or WinnerNomineeId"
    );
  }

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      sportsWagerString_(
        row[col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    if (
      rowGameId !== awardsGameId ||
      rowCategoryId !== sportsWagerKey_(categoryId)
    ) {
      continue;
    }

    const existingWinner =
      sportsWagerString_(
        row[col.WinnerNomineeId]
      );

    if (
      existingWinner &&
      !force
    ) {
      return false;
    }

    sh
      .getRange(
        i + 1,
        col.WinnerNomineeId + 1
      )
      .setValue(
        winnerNomineeId
      );

    if (col.Locked !== undefined) {
      sh
        .getRange(
          i + 1,
          col.Locked + 1
        )
        .setValue(true);
    }

    return true;

  }

  return false;

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

  const categoryId =
    sportsWagerKey_(
      payload.categoryId ||
      (
        "sports-" +
        sportsWagerSlug_(score.League) +
        "-" +
        sportsWagerSlug_(
          score.ESPNEventId ||
          score.GameId
        )
      )
    );

  if (
    sportsWagerCategoryExists_(
      awardsGameId,
      categoryId
    )
  ) {
    return {
      success: false,
      duplicate: true,
      message:
        "This sports event already exists as a wager category.",
      awardsGameId: awardsGameId,
      categoryId: categoryId
    };
  }

  const awayOdds =
    sportsWagerNumber_(
      payload.awayOdds,
      SPORTS_WAGER_DEFAULT_ODDS
    );

  const homeOdds =
    sportsWagerNumber_(
      payload.homeOdds,
      SPORTS_WAGER_DEFAULT_ODDS
    );

  const awayNomineeId =
    sportsWagerSlug_(
      awayTeam
    );

  const homeNomineeId =
    sportsWagerSlug_(
      homeTeam
    );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    appendSportsWagerCategoryRow_(
      score,
      awardsGameId,
      categoryId,
      awayTeam,
      awayNomineeId,
      awayOdds
    );

    appendSportsWagerCategoryRow_(
      score,
      awardsGameId,
      categoryId,
      homeTeam,
      homeNomineeId,
      homeOdds
    );

    appendSportsWagerSettingsRow_(
      score,
      awardsGameId,
      categoryId
    );

    SpreadsheetApp.flush();

    if (
      typeof clearAppCaches ===
      "function"
    ) {
      clearAppCaches();
    }

    return {
      success: true,
      awardsGameId: awardsGameId,
      sportsGameId:
        sportsWagerString_(score.GameId),
      espnEventId:
        sportsWagerString_(score.ESPNEventId),
      categoryId: categoryId,
      category:
        awayTeam + " @ " + homeTeam,
      lockDateTime:
        score.GameDateTime || "",
      nominees: [
        {
          nomineeId: awayNomineeId,
          name: awayTeam,
          odds: awayOdds
        },
        {
          nomineeId: homeNomineeId,
          name: homeTeam,
          odds: homeOdds
        }
      ]
    };

  } finally {

    lock.releaseLock();

  }

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

  return createSportsWagerFromScore(
    payload
  );

}

/* =====================================================
   SETTLEMENT HELPERS
===================================================== */

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
      row.sportsGameId ||
      row.espnEventId;

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
        nominees: []
      };
    }

    map[key].nominees.push({
      nomineeId:
        row.nomineeId,
      nominee:
        row.nominee
    });

  });

  return map;

}

function sportsWagerFindWinnerNomineeId_(
  score,
  nominees
) {

  const winnerName =
    sportsWagerString_(
      score.Winner
    );

  if (!winnerName) {
    return "";
  }

  const winnerSlug =
    sportsWagerSlug_(
      winnerName
    );

  for (let i = 0; i < nominees.length; i++) {

    const nominee = nominees[i];

    if (
      sportsWagerKey_(nominee.nomineeId) === winnerSlug ||
      sportsWagerSlug_(nominee.nominee) === winnerSlug
    ) {
      return sportsWagerKey_(
        nominee.nomineeId
      );
    }

  }

  /*
    Fallback:
    ESPN Winner should normally match the team display name.
    If it does not, do not guess.
  */
  return "";

}

/* =====================================================
   PUBLIC INTERNAL: SETTLE SPORTS WAGERS
===================================================== */

function settleSportsWagers(payload) {

  payload =
    payload || {};

refreshSportsWagerScores(
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

      const score =
        fetchSportsScoreForWager_({
          sportsGameId:
            item.sportsGameId,
          espnEventId:
            item.espnEventId
        });

      summary.checked++;

      const completed =
        sportsWagerBoolean_(
          score.Completed
        );

      if (!completed) {
        summary.skipped++;
        return;
      }

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

      /*
        V1 does not create a Draw nominee.
        If a game ends tied, leave it unsettled for manual review.
      */
      if (homeScore === awayScore) {
        summary.skipped++;
        summary.errors.push({
          sportsGameId:
            item.sportsGameId,
          espnEventId:
            item.espnEventId,
          categoryId:
            item.categoryId,
          error:
            "Game completed tied. Manual settlement required."
        });
        return;
      }

      const winnerNomineeId =
        sportsWagerFindWinnerNomineeId_(
          score,
          item.nominees
        );

      if (!winnerNomineeId) {
        summary.skipped++;
        summary.errors.push({
          sportsGameId:
            item.sportsGameId,
          espnEventId:
            item.espnEventId,
          categoryId:
            item.categoryId,
          winner:
            score.Winner || "",
          error:
            "Could not map SportsScores winner to nomineeId."
        });
        return;
      }

      const updated =
        updateSportsWagerSettingWinner_(
          awardsGameId,
          item.categoryId,
          winnerNomineeId,
          force
        );

      if (updated) {
        summary.settled++;
      } else {
        summary.skipped++;
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

  const scoreCache = {};

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    updated: 0,
    skipped: 0,
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

    const sportsGameId =
      sportsWagerString_(
        row[col.SportsGameId]
      );

    const espnEventId =
      sportsWagerString_(
        row[col.ESPNEventId]
      );

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      summary.skipped++;
      continue;
    }

    const cacheKey =
      sportsGameId ||
      espnEventId;

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

      const rowNumber =
        i + 1;

      sh
        .getRange(
          rowNumber,
          col.HomeScore + 1
        )
        .setValue(
          score.HomeScore
        );

      sh
        .getRange(
          rowNumber,
          col.AwayScore + 1
        )
        .setValue(
          score.AwayScore
        );

        
        if (col.HomeRecord !== undefined) {
          sh
            .getRange(
              rowNumber,
              col.HomeRecord + 1
            )
            .setValue(
              sportsWagerString_(score.HomeRecord)
            );
        }
  
        if (col.AwayRecord !== undefined) {
          sh
            .getRange(
              rowNumber,
              col.AwayRecord + 1
            )
            .setValue(
              sportsWagerString_(score.AwayRecord)
            );
        }
  
        if (col.LogoUrl !== undefined) {
  
          const rowNominee =
            col.Nominee !== undefined
              ? sportsWagerString_(row[col.Nominee])
              : "";
  
          const homeTeam =
            sportsWagerString_(score.HomeTeam);
  
          const logo =
            rowNominee === homeTeam
              ? sportsWagerString_(score.HomeLogo)
              : sportsWagerString_(score.AwayLogo);
  
          sh
            .getRange(
              rowNumber,
              col.LogoUrl + 1
            )
            .setValue(
              logo
            );
  
        }
      sh
        .getRange(
          rowNumber,
          col.SportsStatus + 1
        )
        .setValue(
          sportsWagerString_(score.Status)
        );

      sh
        .getRange(
          rowNumber,
          col.SportsClock + 1
        )
        .setValue(
          sportsWagerString_(score.Clock)
        );

      sh
        .getRange(
          rowNumber,
          col.SportsPeriod + 1
        )
        .setValue(
          sportsWagerString_(score.Period)
        );

      if (col.SportsState !== undefined) {
        sh
          .getRange(
            rowNumber,
            col.SportsState + 1
          )
          .setValue(
            sportsWagerString_(score.State)
          );
      }

      summary.updated++;

    } catch (err) {

      summary.errors.push({
        row: i + 1,
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  }

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
   AUTOMATIC SPORTS WAGER SCORE REFRESH
===================================================== */

const SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION =
  "runSportsWagerScoreRefresh";

function runSportsWagerScoreRefresh() {

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return {
      success: false,
      message: "Sports wager score refresh already running"
    };
  }

  try {

    return refreshSportsWagerScores({
      gameId: SPORTS_WAGER_DEFAULT_GAME_ID
    });

  } finally {

    lock.releaseLock();

  }

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

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return {
      success: false,
      message: "Sports wager auto refresh already running"
    };
  }

  try {

    const refresh =
      refreshSportsWagerScores({
        gameId: SPORTS_WAGER_DEFAULT_GAME_ID
      });

    const settle =
      settleSportsWagers({
        gameId: SPORTS_WAGER_DEFAULT_GAME_ID
      });

    return {
      success: true,
      refresh: refresh,
      settle: settle
    };

  } finally {

    lock.releaseLock();

  }

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