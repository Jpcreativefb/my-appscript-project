/************************************************************
 CLEAN SPLIT v11
 This file was rebuilt from the working v6 baseline and production modules.
 Duplicate patch functions were removed so the project is easier to debug.
************************************************************/



/************************************************************
 v11 module source: base_v6
************************************************************/

/************************************
 SPORTS SCORES ENGINE - STEP 1
 ESPN FETCH + WRITE LATEST SCORES
************************************/

const SPORTS_ESPN_PROXY_PROPERTY = "SPORTS_ESPN_PROXY_URL";
const SPORTS_ESPN_PROXY_TOKEN_PROPERTY = "SPORTS_ESPN_PROXY_TOKEN";

function sportsEspnProxyBaseUrl_() {
  try {
    return String(
      PropertiesService
        .getScriptProperties()
        .getProperty(SPORTS_ESPN_PROXY_PROPERTY) || ""
    ).trim().replace(/\/+$/, "");
  } catch (err) {
    return "";
  }
}

function sportsEspnIsProxyEligibleUrl_(url) {
  return /^https:\/\/site\.api\.espn\.com\/apis\/site\/v2\/sports\//i.test(String(url || ""));
}

function sportsEspnProxyToken_() {
  try {
    return String(
      PropertiesService
        .getScriptProperties()
        .getProperty(SPORTS_ESPN_PROXY_TOKEN_PROPERTY) || ""
    ).trim();
  } catch (err) {
    return "";
  }
}

function sportsEspnRequestUrl_(url) {
  const directUrl = String(url || "").trim();
  const proxyBase = sportsEspnProxyBaseUrl_();
  if (!proxyBase || !sportsEspnIsProxyEligibleUrl_(directUrl)) {
    return directUrl;
  }
  return proxyBase + (proxyBase.indexOf("?") >= 0 ? "&" : "?") + "url=" + encodeURIComponent(directUrl);
}

function sportsEspnRequestOptions_(url, options) {
  const next = {};
  Object.keys(options || {}).forEach(function(key) {
    next[key] = options[key];
  });

  const requestUrl = sportsEspnRequestUrl_(url);
  const usingProxy = requestUrl !== String(url || "").trim();
  if (!usingProxy) {
    return next;
  }

  const token = sportsEspnProxyToken_();
  if (!token) {
    throw new Error(
      "SPORTS_ESPN_PROXY_URL is configured but SPORTS_ESPN_PROXY_TOKEN is missing. " +
      "Refusing to use an unauthenticated Sports proxy."
    );
  }

  const headers = {};
  Object.keys(next.headers || {}).forEach(function(key) {
    headers[key] = next.headers[key];
  });
  headers["x-awards-sports-token"] = token;
  next.headers = headers;
  return next;
}

function sportsEspnFetch_(url, options) {
  return UrlFetchApp.fetch(
    sportsEspnRequestUrl_(url),
    sportsEspnRequestOptions_(url, options || {})
  );
}

function sportsEspnFetchAll_(requests) {
  const safeRequests = (requests || []).map(function(request) {
    const originalUrl = request && request.url;
    const next = sportsEspnRequestOptions_(originalUrl, request || {});
    next.url = sportsEspnRequestUrl_(originalUrl);
    return next;
  });
  return UrlFetchApp.fetchAll(safeRequests);
}

function getSportsEspnProxyStatus() {
  const url = sportsEspnProxyBaseUrl_();
  const tokenConfigured = !!sportsEspnProxyToken_();
  return {
    success: true,
    configured: !!url && tokenConfigured,
    urlConfigured: !!url,
    tokenConfigured: tokenConfigured,
    property: SPORTS_ESPN_PROXY_PROPERTY,
    tokenProperty: SPORTS_ESPN_PROXY_TOKEN_PROPERTY,
    proxyUrl: url
  };
}

function setSportsEspnProxyUrl(url) {
  const value = String(url || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(value)) {
    throw new Error("Sports ESPN proxy URL must be HTTPS.");
  }
  PropertiesService.getScriptProperties().setProperty(SPORTS_ESPN_PROXY_PROPERTY, value);
  return getSportsEspnProxyStatus();
}

function setSportsEspnProxyToken(token) {
  const value = String(token || "").trim();
  if (value.length < 32) {
    throw new Error("Sports ESPN proxy token must be at least 32 characters.");
  }
  PropertiesService.getScriptProperties().setProperty(SPORTS_ESPN_PROXY_TOKEN_PROPERTY, value);
  return getSportsEspnProxyStatus();
}

function clearSportsEspnProxyUrl() {
  PropertiesService.getScriptProperties().deleteProperty(SPORTS_ESPN_PROXY_PROPERTY);
  return getSportsEspnProxyStatus();
}

function clearSportsEspnProxyToken() {
  PropertiesService.getScriptProperties().deleteProperty(SPORTS_ESPN_PROXY_TOKEN_PROPERTY);
  return getSportsEspnProxyStatus();
}

/************************************
 MLB SUMMARY / STARTING-PITCHER BRIDGE
 Keeps ESPN summary traffic inside the Sports Scores Engine so the existing
 authenticated Cloudflare ESPN proxy is reused. If the proxy is not configured,
 the historical direct ESPN fetch remains as a compatibility fallback.
************************************/
function sportsEspnPublicErrorMessage_(error) {
  let message = String(
    error && error.message
      ? error.message
      : error || "Sports ESPN request failed"
  );

  const token = sportsEspnProxyToken_();
  if (token) {
    message = message.split(token).join("[redacted]");
  }

  message = message.replace(
    /x-awards-sports-token\s*[:=]\s*[^\s,;]+/ig,
    "x-awards-sports-token=[redacted]"
  );

  return message.slice(0, 300);
}

function sportsEspnResponseHeader_(response, name) {
  if (!response || typeof response.getHeaders !== "function") return "";
  let headers = {};
  try {
    headers = response.getHeaders() || {};
  } catch (error) {
    return "";
  }
  const target = String(name || "").toLowerCase();
  const key = Object.keys(headers).find(function(item) {
    return String(item || "").toLowerCase() === target;
  });
  return key ? String(headers[key] === undefined ? "" : headers[key]).trim() : "";
}

function sportsEspnResponseTrace_(response) {
  return {
    proxySource: sportsEspnResponseHeader_(response, "x-awards-sports-source"),
    upstreamHttpStatus: sportsEspnResponseHeader_(response, "x-upstream-status"),
    proxyFallbackFromStatus: sportsEspnResponseHeader_(response, "x-awards-sports-fallback-from-status")
  };
}

function apiGetSportsMlbSummary_(params) {
  params = params || {};

  if (typeof assertSportsAdmin_ !== "function") {
    throw new Error("Sports admin security is unavailable.");
  }
  assertSportsAdmin_(params);

  const eventId = String(
    params.espnEventId ||
    params.eventId ||
    ""
  ).trim();

  if (!eventId || !/^[A-Za-z0-9_-]+$/.test(eventId)) {
    throw new Error("Valid espnEventId is required.");
  }

  const directUrl =
    "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=" +
    encodeURIComponent(eventId);

  const proxyConfigured = !!sportsEspnProxyBaseUrl_();
  const transport = proxyConfigured
    ? "espn-proxy"
    : "direct-fallback";

  let response;
  try {
    response = sportsEspnFetch_(directUrl, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        "User-Agent": "Mozilla/5.0 PATTC-Sports-Engine/1.0"
      }
    });
  } catch (error) {
    return {
      success: false,
      transportError: true,
      transportStatus: "error",
      transport: transport,
      espnEventId: eventId,
      httpStatus: 0,
      error:
        "MLB pitcher summary transport failed via " +
        transport +
        ": " +
        sportsEspnPublicErrorMessage_(error)
    };
  }

  const code = response.getResponseCode();
  const trace = sportsEspnResponseTrace_(response);
  if (code < 200 || code >= 300) {
    return {
      success: false,
      transportError: true,
      transportStatus: "error",
      transport: transport,
      espnEventId: eventId,
      httpStatus: code,
      proxySource: trace.proxySource,
      upstreamHttpStatus: trace.upstreamHttpStatus,
      proxyFallbackFromStatus: trace.proxyFallbackFromStatus,
      error:
        "MLB pitcher summary transport failed via " +
        transport +
        ": ESPN HTTP " +
        code +
        (trace.proxySource ? " · source " + trace.proxySource : "") +
        (trace.upstreamHttpStatus ? " · upstream " + trace.upstreamHttpStatus : "")
    };
  }

  let summary;
  try {
    summary = JSON.parse(response.getContentText() || "{}");
  } catch (error) {
    return {
      success: false,
      transportError: true,
      transportStatus: "error",
      transport: transport,
      espnEventId: eventId,
      httpStatus: code,
      proxySource: trace.proxySource,
      upstreamHttpStatus: trace.upstreamHttpStatus,
      proxyFallbackFromStatus: trace.proxyFallbackFromStatus,
      error:
        "MLB pitcher summary transport failed via " +
        transport +
        ": ESPN returned invalid JSON"
    };
  }

  return {
    success: true,
    transportError: false,
    transportStatus: "ok",
    transport: transport,
    espnEventId: eventId,
    httpStatus: code,
    proxySource: trace.proxySource,
    upstreamHttpStatus: trace.upstreamHttpStatus,
    proxyFallbackFromStatus: trace.proxyFallbackFromStatus,
    summary: summary
  };
}

const SPORTS_SHEETS = {
  GAMES: "SportsGames",
  SCORES: "SportsScores",
  SNAPSHOTS: "SportsSnapshots",
  SETTINGS: "SportsSettings",
  LOGS: "SportsLogs",
  PLAYERS: "SportsPlayers",
  PLAYER_GAME_STATS: "SportsPlayerGameStats"
};

const SPORTS_HEADERS = {
  SportsGames: [
    "GameId",
    "Sport",
    "League",
    "ESPNEventId",
    "Name",
    "ShortName",
    "Season",
    "Week",
    "GameDateTime",
    "HomeTeam",
    "AwayTeam",
    "Active",
    "Completed",
    "LastChecked",
    "LastStatus"
  ],

  SportsScores: [
    "GameId",
    "ESPNEventId",
    "Sport",
    "League",
    "Status",
    "State",
    "Period",
    "Clock",
    "HomeTeam",
    "AwayTeam",
    "HomeScore",
    "AwayScore",
    "Winner",
    "Completed",
    "LastUpdated"
  ],

  SportsSnapshots: [
    "SnapshotId",
    "Timestamp",
    "GameId",
    "ESPNEventId",
    "Sport",
    "League",
    "SnapshotType",
    "Period",
    "Clock",
    "HomeScore",
    "AwayScore",
    "Notes"
  ],

  SportsSettings: [
    "Sport",
    "League",
    "Enabled",
    "PollPreGameMinutes",
    "PollLiveMinutes",
    "PollFinalMinutes",
    "SavePeriodSnapshots",
    "ESPNScoreboardUrl",
    "SeasonTitle",
    "SeasonStartDate",
    "SeasonEndDate",
    "PreseasonEnabled",
    "PreseasonStartDate",
    "PreseasonEndDate",
    "PostseasonEnabled",
    "PostseasonStartDate",
    "PostseasonEndDate",
    "TournamentEnabled",
    "TournamentStartDate",
    "TournamentEndDate",
    "BowlEnabled",
    "BowlStartDate",
    "BowlEndDate",
    "SnapshotRetentionDays",
    "ArchiveEnabled",
    "ArchiveAfterDays",
    "ArchiveMode",
    "ArchiveLastRunAt",
    "ArchiveLastStatus",
    "ArchiveRowsLastRun"
  ],

  SportsLogs: [
    "Timestamp",
    "Level",
    "FunctionName",
    "Message",
    "Details"
  ],

  SportsPlayers: [
    "PlayerId",
    "ESPNPlayerId",
    "Sport",
    "League",
    "TeamId",
    "Team",
    "FullName",
    "ShortName",
    "Position",
    "JerseyNumber",
    "HeadshotUrl",
    "Active",
    "LastUpdated",
    "Source"
  ],

  SportsPlayerGameStats: [
    "GameId",
    "ESPNEventId",
    "PlayerId",
    "ESPNPlayerId",
    "Sport",
    "League",
    "TeamId",
    "PlayerName",
    "Position",
    "StatType",
    "StatValue",
    "DisplayValue",
    "Completed",
    "LastUpdated",
    "Source"
  ]
};

/************************************
 SETUP
************************************/

/* Removed earlier duplicate function setupSportsScoresSheet during production cleanup; final definition retained later in file. */


function ensureSportsSheet_(ss, sheetName) {
  let sh = ss.getSheetByName(sheetName);

  if (!sh) {
    sh = ss.insertSheet(sheetName);
  }

  return sh;
}

function setSportsHeaders_(sh, headers) {
  sh.clear();

  sh
    .getRange(1, 1, 1, headers.length)
    .setValues([headers]);

  sh.setFrozenRows(1);
}

function seedSportsSettings_() {
  const sh = SpreadsheetApp
    .getActive()
    .getSheetByName(SPORTS_SHEETS.SETTINGS);

  const rows = [
    [
      "football",
      "nfl",
      true,
      30,
      1,
      60,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
    ],
    [
      "basketball",
      "nba",
      true,
      30,
      1,
      60,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
    ],
    [
      "baseball",
      "mlb",
      true,
      30,
      1,
      60,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard"
    ],
    [
      "hockey",
      "nhl",
      true,
      30,
      1,
      60,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard"
    ]
  ];

  if (rows.length) {
    sh
      .getRange(2, 1, rows.length, rows[0].length)
      .setValues(rows);
  }
}

/************************************
 TEST FUNCTION
 Run this second
************************************/

function testFetchNFLScoresToSheet() {
  const games =
    fetchAndNormalizeESPNScoreboard_(
      "football",
      "nfl"
    );

  upsertLatestSportsScores_(games);

  logSports_(
    "INFO",
    "testFetchNFLScoresToSheet",
    "Fetched NFL scores",
    JSON.stringify({
      count: games.length
    })
  );

  return games;
}

/************************************
 ESPN FETCH
************************************/


/* Removed older duplicate function during v11 cleanup. */

function getESPNScoreboardUrl_(sport, league) {
  return (
    "https://site.api.espn.com/apis/site/v2/sports/" +
    sport +
    "/" +
    league +
    "/scoreboard"
  );
}


/* Removed older duplicate function during v11 cleanup. */

/************************************
 ESPN TEAM RECORD HELPERS
************************************/

function getESPNTeamRecord_(competitor) {

  if (!competitor) {
    return "";
  }

  const records =
    competitor.records || [];

  if (!records.length) {
    return "";
  }

  const preferredTypes = [
    "total",
    "overall",
    "league",
    "conference",
    "division",
    "home",
    "road",
    "away"
  ];

  for (let i = 0; i < preferredTypes.length; i++) {

    const type =
      preferredTypes[i];

    const match =
      records.find(function(record) {

        const recordType =
          String(record.type || "")
            .trim()
            .toLowerCase();

        const recordName =
          String(record.name || "")
            .trim()
            .toLowerCase();

        return (
          recordType === type ||
          recordName === type
        );

      });

    if (match) {

      const possibleValues = [
        match.summary,
        match.displayValue
      ];

      for (let j = 0; j < possibleValues.length; j++) {

        const cleaned =
          cleanSportsRecordValue_(
            possibleValues[j]
          );

        if (cleaned) {
          return cleaned;
        }

      }

    }

  }

  /*
    Fallback:
    Search every record but only accept valid-looking
    sports records. Do not use record.value because ESPN
    can put non-display values there.
  */
  for (let i = 0; i < records.length; i++) {

    const record =
      records[i];

    const possibleValues = [
      record.summary,
      record.displayValue
    ];

    for (let j = 0; j < possibleValues.length; j++) {

      const cleaned =
        cleanSportsRecordValue_(
          possibleValues[j]
        );

      if (cleaned) {
        return cleaned;
      }

    }

  }

  return "";

}

/************************************
 WRITE LATEST SCORES
************************************/

/* Removed earlier duplicate function upsertLatestSportsScores_ during production cleanup; final definition retained later in file. */


function getSportsHeaderMap_(headers) {
  const map = {};

  headers.forEach(function(header, index) {
    map[String(header).trim()] = index;
  });

  return map;
}

/************************************
 LOGGING
************************************/

function logSports_(
  level,
  functionName,
  message,
  details
) {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.LOGS
      );

  if (!sh) {
    return;
  }

  sh.appendRow([
    new Date(),
    level,
    functionName,
    message,
    details || ""
  ]);
}

/************************************
 STEP 2
 PERIOD / QUARTER / INNING SNAPSHOTS
************************************/

function testFetchNFLScoresWithSnapshots() {
  const previousScores =
    readLatestSportsScoresMap_();

  const games =
    fetchAndNormalizeESPNScoreboard_(
      "football",
      "nfl"
    );

  detectAndSaveSportsSnapshots_(
    previousScores,
    games
  );

  upsertLatestSportsScores_(games);

  logSports_(
    "INFO",
    "testFetchNFLScoresWithSnapshots",
    "Fetched NFL scores and checked snapshots",
    JSON.stringify({
      count: games.length
    })
  );

  return games;
}

/************************************
 READ EXISTING LATEST SCORES
************************************/

function readLatestSportsScoresMap_() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SCORES
      );

  const map = {};

  if (!sh) {
    return map;
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return map;
  }

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const gameId =
      String(row[col.GameId] || "").trim();

    if (!gameId) {
      continue;
    }

    const obj = {};

    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });

    map[gameId] = obj;
  }

  return map;
}

/************************************
 DETECT SNAPSHOT MOMENTS
************************************/

function detectAndSaveSportsSnapshots_(
  previousScores,
  currentGames
) {
  currentGames.forEach(function(currentGame) {
    const previousGame =
      previousScores[currentGame.GameId];

    if (!previousGame) {
      return;
    }

    const wasCompleted =
      normalizeSportsBoolean_(
        previousGame.Completed
      );

    const isCompleted =
      normalizeSportsBoolean_(
        currentGame.Completed
      );

    const previousPeriod =
      normalizeSportsPeriod_(
        previousGame.Period
      );

    const currentPeriod =
      normalizeSportsPeriod_(
        currentGame.Period
      );

    const previousState =
      String(previousGame.State || "")
        .trim()
        .toLowerCase();

    const currentState =
      String(currentGame.State || "")
        .trim()
        .toLowerCase();

    /************************************
     FINAL SNAPSHOT
    ************************************/

    if (!wasCompleted && isCompleted) {
      saveSportsSnapshotIfMissing_({
        GameId: currentGame.GameId,
        ESPNEventId: currentGame.ESPNEventId,
        Sport: currentGame.Sport,
        League: currentGame.League,
        SnapshotType: "Final",
        Period: currentPeriod,
        Clock: currentGame.Clock,
        HomeScore: currentGame.HomeScore,
        AwayScore: currentGame.AwayScore,
        Notes: "Game marked final by ESPN"
      });

      return;
    }

    /************************************
     PERIOD / QUARTER / INNING CHANGE
    ************************************/

    if (
      previousState === "in" &&
      currentState === "in" &&
      previousPeriod &&
      currentPeriod &&
      currentPeriod > previousPeriod
    ) {
      const snapshotType =
        getSportsSnapshotType_(
          currentGame.Sport,
          currentGame.League,
          previousPeriod
        );

      saveSportsSnapshotIfMissing_({
        GameId: currentGame.GameId,
        ESPNEventId: currentGame.ESPNEventId,
        Sport: currentGame.Sport,
        League: currentGame.League,
        SnapshotType: snapshotType,
        Period: previousPeriod,
        Clock: currentGame.Clock,
        HomeScore: currentGame.HomeScore,
        AwayScore: currentGame.AwayScore,
        Notes:
          "Detected period change from " +
          previousPeriod +
          " to " +
          currentPeriod
      });
    }
  });
}

/************************************
 SNAPSHOT WRITER
************************************/

function saveSportsSnapshotIfMissing_(snapshot) {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SNAPSHOTS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SNAPSHOTS
    );
  }

  const exists =
    sportsSnapshotExists_(
      snapshot.GameId,
      snapshot.SnapshotType,
      snapshot.Period
    );

  if (exists) {
    return false;
  }

  const row = [
    Utilities.getUuid(),
    new Date(),
    snapshot.GameId || "",
    snapshot.ESPNEventId || "",
    snapshot.Sport || "",
    snapshot.League || "",
    snapshot.SnapshotType || "",
    snapshot.Period || "",
    snapshot.Clock || "",
    snapshot.HomeScore || 0,
    snapshot.AwayScore || 0,
    snapshot.Notes || ""
  ];

  sh.appendRow(row);

  logSports_(
    "INFO",
    "saveSportsSnapshotIfMissing_",
    "Saved sports snapshot",
    JSON.stringify(snapshot)
  );

  return true;
}

function sportsSnapshotExists_(
  gameId,
  snapshotType,
  period
) {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SNAPSHOTS
      );

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return false;
  }

  const col =
    getSportsHeaderMap_(data[0]);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const rowGameId =
      String(row[col.GameId] || "").trim();

    const rowSnapshotType =
      String(row[col.SnapshotType] || "").trim();

    const rowPeriod =
      String(row[col.Period] || "").trim();

    if (
      rowGameId === String(gameId).trim() &&
      rowSnapshotType === String(snapshotType).trim() &&
      rowPeriod === String(period).trim()
    ) {
      return true;
    }
  }

  return false;
}

/************************************
 SNAPSHOT TYPE LABELS
************************************/

function getSportsSnapshotType_(
  sport,
  league,
  period
) {
  sport =
    String(sport || "")
      .trim()
      .toLowerCase();

  league =
    String(league || "")
      .trim()
      .toLowerCase();

  period =
    Number(period || 0);

  if (sport === "football") {
    if (period === 1) {
      return "End Q1";
    }

    if (period === 2) {
      return "Halftime";
    }

    if (period === 3) {
      return "End Q3";
    }

    if (period === 4) {
      return "End Q4";
    }

    return "End OT " + (period - 4);
  }

  if (sport === "basketball") {
    if (period === 1) {
      return "End Q1";
    }

    if (period === 2) {
      return "Halftime";
    }

    if (period === 3) {
      return "End Q3";
    }

    if (period === 4) {
      return "End Q4";
    }

    return "End OT " + (period - 4);
  }

  if (sport === "hockey") {
    if (period <= 3) {
      return "End Period " + period;
    }

    return "End OT " + (period - 3);
  }

  if (sport === "baseball") {
    return "End Inning " + period;
  }

  return "End Period " + period;
}

/************************************
 NORMALIZERS
************************************/

function normalizeSportsBoolean_(value) {
  return (
    value === true ||
    String(value)
      .trim()
      .toLowerCase() === "true"
  );
}

function normalizeSportsPeriod_(value) {
  const n =
    Number(value || 0);

  if (!n || isNaN(n)) {
    return 0;
  }

  return n;
}

/************************************
 STEP 3
 MULTI-LEAGUE SCORE RUNNER
 Reads SportsSettings and fetches
 every enabled ESPN scoreboard.
************************************/

function testFetchAllEnabledSportsWithSnapshots() {
  const settings =
    readEnabledSportsSettings_();

  const previousScores =
    readLatestSportsScoresMap_();

  const summary = {
    startedAt: new Date(),
    leaguesChecked: 0,
    gamesFetched: 0,
    errors: []
  };

  settings.forEach(function(setting) {
    try {
      const games =
        fetchAndNormalizeESPNScoreboardFromSetting_(
          setting
        );

      detectAndSaveSportsSnapshots_(
        previousScores,
        games
      );

      upsertLatestSportsScores_(games);

      summary.leaguesChecked++;
      summary.gamesFetched += games.length;

      logSports_(
        "INFO",
        "testFetchAllEnabledSportsWithSnapshots",
        "Fetched league scores",
        JSON.stringify({
          sport: setting.Sport,
          league: setting.League,
          count: games.length
        })
      );

    } catch (err) {
      const message =
        err && err.message
          ? err.message
          : String(err);

      summary.errors.push({
        sport: setting.Sport,
        league: setting.League,
        error: message
      });

      logSports_(
        "ERROR",
        "testFetchAllEnabledSportsWithSnapshots",
        "Failed fetching league scores",
        JSON.stringify({
          sport: setting.Sport,
          league: setting.League,
          error: message
        })
      );
    }
  });

  summary.finishedAt = new Date();

  logSports_(
    "INFO",
    "testFetchAllEnabledSportsWithSnapshots",
    "Multi-league score run complete",
    JSON.stringify(summary)
  );

  return summary;
}

/************************************
 READ ENABLED SETTINGS
************************************/

/* Removed earlier duplicate function readEnabledSportsSettings_ during production cleanup; final definition retained later in file. */


function validateSportsSettingsColumns_(col) {
  const required = [
    "Sport",
    "League",
    "Enabled",
    "PollPreGameMinutes",
    "PollLiveMinutes",
    "PollFinalMinutes",
    "SavePeriodSnapshots",
    "ESPNScoreboardUrl"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined || col[header] < 0;
    });

  if (missing.length) {
    throw new Error(
      "SportsSettings missing columns: " +
      missing.join(", ")
    );
  }
}

/************************************
 FETCH FROM SETTINGS URL
************************************/


/* Removed older duplicate function during v11 cleanup. */

function addESPNDateParamToUrl_(url, dateString) {
  dateString =
    String(dateString || "")
      .trim();

  if (!dateString) {
    return url;
  }

  const separator =
    url.indexOf("?") >= 0
      ? "&"
      : "?";

  return (
    url +
    separator +
    "dates=" +
    encodeURIComponent(dateString)
  );
}

/************************************
 STEP 4
 ADD SOCCER + WORLD CUP
 TO SPORTS SETTINGS
************************************/


/* Removed older duplicate function during v11 cleanup. */

/************************************
 STEP 5
 ADD COLLEGE FOOTBALL + COLLEGE BASKETBALL
 TO SPORTS SETTINGS
************************************/

function addCollegeSportsSettings() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SETTINGS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SETTINGS
    );
  }

  const rowsToAdd = [
    [
      "football",
      "college-football",
      true,
      60,
      1,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard"
    ],
    [
      "basketball",
      "mens-college-basketball",
      true,
      60,
      1,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard"
    ],
    [
      "basketball",
      "womens-college-basketball",
      true,
      60,
      1,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard"
    ]
  ];

  const data =
    sh.getDataRange().getValues();

  const existingKeys = {};

  if (data.length > 1) {
    const col =
      getSportsHeaderMap_(data[0]);

    for (let i = 1; i < data.length; i++) {
      const sport =
        String(data[i][col.Sport] || "")
          .trim()
          .toLowerCase();

      const league =
        String(data[i][col.League] || "")
          .trim()
          .toLowerCase();

      if (sport && league) {
        existingKeys[sport + "|" + league] = true;
      }
    }
  }

  const newRows =
    rowsToAdd.filter(function(row) {
      const key =
        String(row[0]).toLowerCase() +
        "|" +
        String(row[1]).toLowerCase();

      return !existingKeys[key];
    });

  if (!newRows.length) {
    logSports_(
      "INFO",
      "addCollegeSportsSettings",
      "No new college sports settings needed",
      ""
    );

    return {
      added: 0,
      message: "College sports already exist"
    };
  }

  sh
    .getRange(
      sh.getLastRow() + 1,
      1,
      newRows.length,
      newRows[0].length
    )
    .setValues(newRows);

  logSports_(
    "INFO",
    "addCollegeSportsSettings",
    "Added college sports settings",
    JSON.stringify({
      added: newRows.length
    })
  );

  return {
    added: newRows.length
  };
}

/************************************
 STEP 6
 ADD WNBA TO SPORTS SETTINGS
************************************/

function addWNBASportsSettings() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SETTINGS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SETTINGS
    );
  }

  const rowsToAdd = [
    [
      "basketball",
      "wnba",
      true,
      60,
      1,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard"
    ]
  ];

  const data =
    sh.getDataRange().getValues();

  const existingKeys = {};

  if (data.length > 1) {
    const col =
      getSportsHeaderMap_(data[0]);

    for (let i = 1; i < data.length; i++) {
      const sport =
        String(data[i][col.Sport] || "")
          .trim()
          .toLowerCase();

      const league =
        String(data[i][col.League] || "")
          .trim()
          .toLowerCase();

      if (sport && league) {
        existingKeys[sport + "|" + league] = true;
      }
    }
  }

  const newRows =
    rowsToAdd.filter(function(row) {
      const key =
        String(row[0]).toLowerCase() +
        "|" +
        String(row[1]).toLowerCase();

      return !existingKeys[key];
    });

  if (!newRows.length) {
    logSports_(
      "INFO",
      "addWNBASportsSettings",
      "No new WNBA setting needed",
      ""
    );

    return {
      added: 0,
      message: "WNBA already exists"
    };
  }

  sh
    .getRange(
      sh.getLastRow() + 1,
      1,
      newRows.length,
      newRows[0].length
    )
    .setValues(newRows);

  logSports_(
    "INFO",
    "addWNBASportsSettings",
    "Added WNBA sports setting",
    JSON.stringify({
      added: newRows.length
    })
  );

  return {
    added: newRows.length
  };
}

/************************************
 STEP 7
 PRODUCTION RUNNER + TRIGGER CONTROL
************************************/

const SPORTS_TRIGGER_FUNCTION =
  "runSportsScoresUpdate";

/************************************
 PRODUCTION RUNNER
 Safe to use manually or by trigger.
************************************/

function runSportsScoresUpdate(forceRefresh) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(10000);

  if (!gotLock) {
    logSports_("WARN", "runSportsScoresUpdate", "Skipped run because another update is already running", "");
    return { success: false, skipped: true, reason: "Another update is already running" };
  }

  const force = forceRefresh === true || String(forceRefresh || "").toLowerCase() === "true";
  const summary = {
    success: true,
    startedAt: new Date(),
    forceRefresh: force,
    leaguesChecked: 0,
    gamesFetched: 0,
    snapshotsChecked: true,
    skipped: [],
    errors: []
  };

  try {
    try {
      summary.capacityMaintenance = sportsWorkbookMaintenance_({ source: "runSportsScoresUpdate" });
    } catch (capacityError) {
      summary.capacityWarning = capacityError && capacityError.message ? capacityError.message : String(capacityError);
    }

    const settings = readEnabledSportsSettings_();
    const previousScores = readLatestSportsScoresMap_();

    settings.forEach(function(setting) {
      const due = sportsShouldPollSetting_(setting, previousScores, force);

      if (!due.shouldPoll) {
        summary.skipped.push({
          sport: setting.Sport,
          league: setting.League,
          reason: due.reason,
          phase: setting.SeasonPhase,
          mode: due.mode,
          nextDueAt: due.nextDueAt || ""
        });
        return;
      }

      try {
        // The smart live updater must never perform a season-wide scoreboard
        // pull. Fetch a tiny yesterday/today/tomorrow window instead so live
        // and late-night games update without triggering ESPN's broad-query
        // protection. Season/schedule builders continue to use their own jobs.
        const liveDates = buildSportsDateStrings_(1, 1);
        const gamesById = {};
        liveDates.forEach(function(dateString) {
          const dateGames = fetchAndNormalizeESPNScoreboardFromSetting_(
            setting,
            dateString,
            {
              FetchMode: "LIVE_SCOREBOARD",
              SeasonYear: setting.SeasonYear,
              SeasonType: "",
              SeasonPhase: setting.SeasonPhase || "LIVE SCOREBOARD"
            }
          );
          dateGames.forEach(function(game) {
            if (game && game.GameId) gamesById[game.GameId] = game;
          });
        });
        const games = Object.keys(gamesById).map(function(gameId) {
          return gamesById[gameId];
        });

        if (setting.SavePeriodSnapshots) {
          detectAndSaveSportsSnapshots_(previousScores, games);
        }

        upsertLatestSportsScores_(games);

        if (typeof captureSportsStatCheckpointsForGames_ === "function") {
          try {
            const checkpointResult = captureSportsStatCheckpointsForGames_(games);
            summary.checkpoints = summary.checkpoints || [];
            summary.checkpoints.push({
              sport: setting.Sport,
              league: setting.League,
              result: checkpointResult
            });
          } catch (checkpointError) {
            const checkpointMessage = checkpointError && checkpointError.message
              ? checkpointError.message
              : String(checkpointError);
            summary.errors.push({
              sport: setting.Sport,
              league: setting.League,
              stage: "checkpoint-capture",
              error: checkpointMessage
            });
            logSports_("WARN", "runSportsScoresUpdate", "Checkpoint capture failed", JSON.stringify({
              sport: setting.Sport,
              league: setting.League,
              error: checkpointMessage
            }));
          }
        }

        sportsMarkSettingPolled_(setting, due.mode);

        summary.leaguesChecked++;
        summary.gamesFetched += games.length;

        logSports_("INFO", "runSportsScoresUpdate", "Fetched league scores", JSON.stringify({
          sport: setting.Sport,
          league: setting.League,
          mode: due.mode,
          seasonPhase: setting.SeasonPhase,
          count: games.length
        }));
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        summary.errors.push({ sport: setting.Sport, league: setting.League, error: message });
        logSports_("ERROR", "runSportsScoresUpdate", "Failed fetching league scores", JSON.stringify({
          sport: setting.Sport,
          league: setting.League,
          error: message
        }));
      }
    });

    summary.finishedAt = new Date();
    logSports_("INFO", "runSportsScoresUpdate", "Smart sports scores update complete", JSON.stringify(summary));
    return summary;
  } finally {
    lock.releaseLock();
  }
}

/************************************
 TRIGGER INSTALLER
 Run this once after manual test works.
************************************/

function installSportsScoresTrigger() {
  removeSportsScoresTriggers();

  ScriptApp
    .newTrigger(SPORTS_TRIGGER_FUNCTION)
    .timeBased()
    .everyMinutes(1)
    .create();

  logSports_("INFO", "installSportsScoresTrigger", "Installed smart sports score trigger", JSON.stringify({
    functionName: SPORTS_TRIGGER_FUNCTION,
    everyMinutes: 1,
    note: "Per-league pregame/live/final timing prevents unnecessary requests"
  }));

  return {
    success: true,
    message: "Smart sports score trigger installed. The trigger checks every minute, but each league only fetches when its configured interval is due."
  };
}

/************************************
 TRIGGER REMOVER
 Run this if you want to stop automation.
************************************/

function removeSportsScoresTriggers() {
  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {
    const handler =
      trigger.getHandlerFunction();

    if (handler === SPORTS_TRIGGER_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  logSports_(
    "INFO",
    "removeSportsScoresTriggers",
    "Removed sports scores triggers",
    JSON.stringify({
      removed: removed
    })
  );

  return {
    success: true,
    removed: removed
  };
}

/************************************
 TRIGGER CHECKER
 Optional helper.
************************************/

function checkSportsScoresTriggers() {
  const triggers =
    ScriptApp.getProjectTriggers();

  const sportsTriggers =
    triggers
      .filter(function(trigger) {
        return (
          trigger.getHandlerFunction() ===
          SPORTS_TRIGGER_FUNCTION
        );
      })
      .map(function(trigger) {
        return {
          handler: trigger.getHandlerFunction(),
          eventType: String(trigger.getEventType()),
          source: String(trigger.getTriggerSource())
        };
      });

  logSports_(
    "INFO",
    "checkSportsScoresTriggers",
    "Checked sports scores triggers",
    JSON.stringify({
      count: sportsTriggers.length
    })
  );

  return sportsTriggers;
}

/************************************
 STEP 8
 SPORTS SCORES API ENDPOINT
 Reads clean JSON from the sheet.
************************************/

function doGet(e) {

  const params =
    e && e.parameter
      ? e.parameter
      : {};

  const action =
    String(params.action || "ping")
      .trim();

  try {

    let payload;

    if (action === "ping") {

      payload = {
        success: true,
        app: "Sports Scores Engine",
        timestamp: new Date()
      };

    }

    else if (action === "getSportsScores") {

      payload =
        apiGetSportsScores_(
          params
        );

    }

    else if (action === "getSportsMlbSummary") {

      payload =
        apiGetSportsMlbSummary_(
          params
        );

    }

    else if (action === "getSportsSnapshots") {

      payload =
        apiGetSportsSnapshots_(
          params
        );

    }

    else if (action === "getSportsLeagues") {

      payload =
        apiGetSportsLeagues_();

    }

    else if (action === "runSportsScoresUpdate") {

      payload =
        runSportsScoresUpdate();

    }

    else if (action === "refreshSportsScoresNowAdmin") {

      payload =
        apiRefreshSportsScoresNowAdmin_(
          params
        );

    }

    else if (action === "refreshSportsScoresWindowAdmin") {

      payload =
        apiRefreshSportsScoresWindowAdmin_(
          params
        );

    }

    else if (action === "repairSportsScoreDisplayAdmin") {

      payload =
        apiRepairSportsScoreDisplayAdmin_(
          params
        );

    }

    else if (action === "installSportsScoresWindowTriggerAdmin") {

      payload =
        apiInstallSportsScoresWindowTriggerAdmin_(
          params
        );

    }

    else if (action === "removeSportsScoresWindowTriggerAdmin") {

      payload =
        apiRemoveSportsScoresWindowTriggerAdmin_(
          params
        );

    }

    else if (action === "setupSportsOdds") {

      payload =
        setupSportsOddsSystem();

    }

  else if (action === "setupSportsAdminControls") {

    payload =
      apiSetupSportsAdminControls_(
        params
      );

  }

else if (action === "getSportsAdminDashboard") {

  payload =
    apiGetSportsAdminDashboard_(
      params
    );

}

else if (action === "getSportsSettingsAdmin") {

  payload =
    apiGetSportsSettingsAdmin_(
      params
    );

}

else if (action === "updateSportsLeagueSetting") {

  payload =
    apiUpdateSportsLeagueSetting_(
      params
    );

}

else if (action === "installSportsScoresTriggerAdmin") {

  payload =
    apiInstallSportsScoresTriggerAdmin_(
      params
    );

}

else if (action === "removeSportsScoresTriggerAdmin") {

  payload =
    apiRemoveSportsScoresTriggerAdmin_(
      params
    );

}

else if (action === "createSportsSeasonJobsAdmin") {

  payload =
    apiCreateSportsSeasonJobsAdmin_(
      params
    );

}

else if (action === "runSportsSeasonBatchAdmin") {

  payload =
    apiRunSportsSeasonBatchAdmin_(
      params
    );

}

else if (action === "runSportsScheduleReconcileAdmin") {

  payload =
    apiRunSportsScheduleReconcileAdmin_(
      params
    );

}

else if (action === "installSportsScheduleReconcileTriggerAdmin") {

  payload =
    apiInstallSportsScheduleReconcileTriggerAdmin_(
      params
    );

}

else if (action === "removeSportsScheduleReconcileTriggerAdmin") {

  payload =
    apiRemoveSportsScheduleReconcileTriggerAdmin_(
      params
    );

}

else if (action === "updateSportsSeasonJobStatus") {

  payload =
    apiUpdateSportsSeasonJobStatus_(
      params
    );

}

else if (action === "installSportsSeasonBatchTriggerAdmin") {

  payload =
    apiInstallSportsSeasonBatchTriggerAdmin_(
      params
    );

}

else if (action === "removeSportsSeasonBatchTriggerAdmin") {

  payload =
    apiRemoveSportsSeasonBatchTriggerAdmin_(
      params
    );

}

else if (action === "getSportsOddsAdminSettings") {

  payload =
    apiGetSportsOddsAdminSettings_(
      params
    );

}

else if (action === "updateSportsOddsAdminSetting") {

  payload =
    apiUpdateSportsOddsAdminSetting_(
      params
    );

}

else if (action === "refreshSportsOddsLeagueAdmin") {

  payload =
    apiRefreshSportsOddsLeagueAdmin_(
      params
    );

}

else if (action === "runSportsOddsHybridRefresh") {

  payload =
    apiRunSportsOddsHybridRefresh_(
      params
    );

}

else if (action === "installSportsOddsHybridTrigger") {

  payload =
    apiInstallSportsOddsHybridTrigger_(
      params
    );

}

else if (action === "removeSportsOddsHybridTrigger") {

  payload =
    apiRemoveSportsOddsHybridTrigger_(
      params
    );

}


    else if (action === "setSmartSportsAutomation") {
      payload = apiSetSmartSportsAutomationAdmin_(params);
    }

    else if (action === "previewSportsLeagueArchiveAdmin") {
      payload = apiPreviewSportsLeagueArchiveAdmin_(params);
    }

    else if (action === "getSportsArchiveStatus") {
      payload = apiGetSportsArchiveStatusAdmin_(params);
    }

    else if (action === "runSportsArchiveNowAdmin") {
      payload = apiRunSportsArchiveNowAdmin_(params);
    }

    else if (action === "getSportsPlayers") {
      payload = apiGetSportsPlayers_(params);
    }

    else if (action === "getSportsPlayerGameStats") {
      payload = apiGetSportsPlayerGameStats_(params);
    }

    else if (action === "setupSportsPlayersAdmin") {
      payload = apiSetupSportsPlayersAdmin_(params);
    }

    else if (action === "syncSportsPlayersAdmin") {
      payload = apiSyncSportsPlayersAdmin_(params);
    }

    else if (action === "refreshSportsPlayerGameStatsAdmin") {
      payload = apiRefreshSportsPlayerGameStatsAdmin_(params);
    }

    else if (action === "getSportsPlayerStatusAdmin") {
      payload = apiGetSportsPlayerStatusAdmin_(params);
    }

    else if (action === "getTeamFantasyNflSchedule") {
      payload = apiGetTeamFantasyNflSchedule_(params);
    }
    else if (action === "getTeamFantasyNflSummary") {
      payload = apiGetTeamFantasyNflSummary_(params);
    }

    else if (action === "getSportsTeamGameStats") {
      payload = apiGetSportsTeamGameStats_(params);
    }

    else if (action === "getSportsStatCheckpoints") {
      payload = apiGetSportsStatCheckpoints_(params);
    }

    else if (action === "setupSportsAdvancedStatsAdmin") {
      payload = apiSetupSportsAdvancedStatsAdmin_(params);
    }

    else if (action === "refreshSportsAdvancedStatsAdmin") {
      payload = apiRefreshSportsAdvancedStatsAdmin_(params);
    }

    else if (action === "getSportsAdvancedStatsStatusAdmin") {
      payload = apiGetSportsAdvancedStatsStatusAdmin_(params);
    }

    else if (action === "setupSportsRacing" || action === "getSportsRacingResults" || action === "getSportsRacingOdds") {

      payload = {
        success: false,
        error: "Racing has been moved out of the Sports Scores Engine. Use the separate Racing Score Engine project."
      };

    }

    else if (action === "refreshSportsOdds") {

      payload =
        apiRefreshSportsOdds_(
          params
        );

    }

    else if (action === "getSportsOdds") {

      payload =
        apiGetSportsOdds_(
          params
        );

    }

    else {

      payload = {
        success: false,
        error: "Unknown action: " + action
      };

    }

    return sportsApiOutput_(
      payload,
      params.callback
    );

  } catch (err) {

    return sportsApiOutput_(
      {
        success: false,
        error:
          err && err.message
            ? err.message
            : String(err)
      },
      params.callback
    );

  }

}

/************************************
 API OUTPUT
 Supports normal JSON and JSONP.
************************************/


/************************************
 TEAM FANTASY NFL DATA BRIDGE — v1.2.18o
 Keeps ESPN access inside the Sports Scores Engine so the existing
 authenticated Cloudflare ESPN proxy is reused by Team Fantasy.
************************************/
function sportsTeamFantasyFetchJson_(url) {
  const response = sportsEspnFetch_(url, {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Team Fantasy ESPN source returned HTTP " + code);
  }
  return JSON.parse(response.getContentText() || "{}");
}

function apiGetTeamFantasyNflSchedule_(params) {
  params = params || {};
  const seasonYear = Math.floor(Number(params.seasonYear || params.year || 0));
  const seasonType = Math.floor(Number(params.seasonType || params.seasontype || 2));
  const week = Math.floor(Number(params.week || 0));
  if (seasonYear < 2000 || seasonYear > 2100) throw new Error("Valid NFL seasonYear is required.");
  if ([1, 2, 3].indexOf(seasonType) === -1) throw new Error("NFL seasonType must be 1, 2, or 3.");
  if (week < 1 || week > 25) throw new Error("Valid NFL week is required.");
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?" +
    "dates=" + encodeURIComponent(String(seasonYear)) +
    "&seasontype=" + encodeURIComponent(String(seasonType)) +
    "&week=" + encodeURIComponent(String(week)) +
    "&limit=100";
  const data = sportsTeamFantasyFetchJson_(url);
  return {
    success: true,
    seasonYear: seasonYear,
    seasonType: seasonType,
    week: week,
    events: Array.isArray(data.events) ? data.events : []
  };
}

function apiGetTeamFantasyNflSummary_(params) {
  params = params || {};
  const eventId = String(params.eventId || params.espnEventId || "").trim().replace(/^nfl_/, "");
  if (!/^\d{6,20}$/.test(eventId)) throw new Error("Valid ESPN eventId is required.");
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=" +
    encodeURIComponent(eventId);
  return {
    success: true,
    eventId: eventId,
    data: sportsTeamFantasyFetchJson_(url)
  };
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

function sportsApiDateReplacer_(key, value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

/************************************
 GET SPORTS SNAPSHOTS
************************************/

function apiGetSportsSnapshots_(params) {
  const gameIdFilter =
    String(params.gameId || "")
      .trim();

  const leagueFilter =
    String(params.league || "")
      .trim()
      .toLowerCase();

  const sportFilter =
    String(params.sport || "")
      .trim()
      .toLowerCase();

  const snapshots =
    readSportsSnapshotsRows_()
      .filter(function(snapshot) {
        if (
          gameIdFilter &&
          String(snapshot.GameId || "") !== gameIdFilter
        ) {
          return false;
        }

        if (
          leagueFilter &&
          String(snapshot.League || "")
            .toLowerCase() !== leagueFilter
        ) {
          return false;
        }

        if (
          sportFilter &&
          String(snapshot.Sport || "")
            .toLowerCase() !== sportFilter
        ) {
          return false;
        }

        return true;
      });

  return {
    success: true,
    count: snapshots.length,
    filters: {
      gameId: gameIdFilter,
      sport: sportFilter,
      league: leagueFilter
    },
    snapshots: snapshots,
    timestamp: new Date()
  };
}

/************************************
 GET ENABLED SPORTS / LEAGUES
************************************/

function apiGetSportsLeagues_() {
  const settings =
    readEnabledSportsSettings_();

  const leagues =
    settings.map(function(setting) {
      return {
        sport: setting.Sport,
        league: setting.League,
        enabled: setting.Enabled,
        pollPreGameMinutes:
          setting.PollPreGameMinutes,
        pollLiveMinutes:
          setting.PollLiveMinutes,
        pollFinalMinutes:
          setting.PollFinalMinutes,
        savePeriodSnapshots:
          setting.SavePeriodSnapshots
      };
    });

  return {
    success: true,
    count: leagues.length,
    leagues: leagues,
    timestamp: new Date()
  };
}

/************************************
 READ SPORTS SCORES ROWS
************************************/

function readSportsScoresRows_() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SCORES
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SCORES
    );
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row =
      sportsRowToObject_(
        headers,
        data[i]
      );

    if (!row.GameId) {
      continue;
    }

    row.HomeScore =
      normalizeSportsScoreValue_(
        row.HomeScore
      );

    row.AwayScore =
      normalizeSportsScoreValue_(
        row.AwayScore
      );

    row.Completed =
      normalizeSportsBoolean_(
        row.Completed
      );

    rows.push(row);
  }

  return rows;
}

/************************************
 READ SPORTS SNAPSHOTS ROWS
************************************/

function readSportsSnapshotsRows_() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SNAPSHOTS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SNAPSHOTS
    );
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row =
      sportsRowToObject_(
        headers,
        data[i]
      );

    if (!row.SnapshotId) {
      continue;
    }

    row.HomeScore =
      normalizeSportsScoreValue_(
        row.HomeScore
      );

    row.AwayScore =
      normalizeSportsScoreValue_(
        row.AwayScore
      );

    rows.push(row);
  }

  return rows;
}

/************************************
 ROW HELPERS
************************************/

function sportsRowToObject_(headers, row) {
  const obj = {};

  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });

  return obj;
}

function normalizeSportsScoreValue_(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const n =
    Number(value);

  if (isNaN(n)) {
    return value;
  }

  return n;
}

/************************************
 STEP 11A
 UPGRADE SPORTSSCORES COLUMNS
 Adds date + logo columns without clearing data.
************************************/

function upgradeSportsScoresForLogosAndDates() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SCORES
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SCORES
    );
  }

  const required = [
    "GameDateTime",
    "HomeLogo",
    "AwayLogo"
  ];

  const lastColumn =
    sh.getLastColumn();

  const headers =
    sh
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(function(header) {
        return String(header).trim();
      });

  const missing =
    required.filter(function(header) {
      return headers.indexOf(header) === -1;
    });

  if (!missing.length) {
    return {
      success: true,
      added: 0,
      message: "SportsScores already has date/logo columns"
    };
  }

  sh
    .getRange(
      1,
      lastColumn + 1,
      1,
      missing.length
    )
    .setValues([missing]);

  logSports_(
    "INFO",
    "upgradeSportsScoresForLogosAndDates",
    "Added SportsScores columns",
    JSON.stringify({
      added: missing
    })
  );

  return {
    success: true,
    added: missing.length,
    columns: missing
  };
}

/************************************
 STEP 11B
 ESPN LOGO HELPERS
************************************/

function getESPNTeamLogo_(team) {
  if (!team) {
    return "";
  }

  if (team.logo) {
    return team.logo;
  }

  const logos =
    team.logos || [];

  if (logos.length) {
    return (
      logos[0].href ||
      logos[0].url ||
      ""
    );
  }

  return "";
}

function getESPNEventLogo_(event) {
  if (!event) {
    return "";
  }

  if (event.logo) {
    return event.logo;
  }

  const logos =
    event.logos || [];

  if (logos.length) {
    return (
      logos[0].href ||
      logos[0].url ||
      ""
    );
  }

  return "";
}

/************************************
 STEP 11C
 MULTI-DAY SCOREBOARD UPDATE
 Use manually when you want to load
 yesterday/today/upcoming games.
************************************/

function runSportsScoresWindowUpdate() {
  return runSportsScoresDateWindowUpdate_(
    2,
    7
  );
}

function runSportsScoresDateWindowUpdate_(
  daysBack,
  daysForward
) {
  const lock =
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(10000);

  if (!gotLock) {
    return {
      success: false,
      skipped: true,
      reason: "Another update is already running"
    };
  }

  const summary = {
    success: true,
    startedAt: new Date(),
    daysBack: daysBack,
    daysForward: daysForward,
    leaguesChecked: 0,
    datesChecked: 0,
    gamesFetched: 0,
    errors: []
  };

  try {
    const settings =
      readEnabledSportsSettings_();

    const previousScores =
      readLatestSportsScoresMap_();

    const dates =
      buildSportsDateStrings_(
        daysBack,
        daysForward
      );

    const gamesById = {};

    settings.forEach(function(setting) {
      dates.forEach(function(dateString) {
        try {
          const games =
            fetchAndNormalizeESPNScoreboardFromSetting_(
              setting,
              dateString
            );

          games.forEach(function(game) {
            gamesById[game.GameId] = game;
          });

          summary.gamesFetched += games.length;
          summary.datesChecked++;

        } catch (err) {
          summary.errors.push({
            sport: setting.Sport,
            league: setting.League,
            date: dateString,
            error:
              err && err.message
                ? err.message
                : String(err)
          });
        }
      });

      summary.leaguesChecked++;
    });

    const allGames =
      Object.keys(gamesById)
        .map(function(gameId) {
          return gamesById[gameId];
        });

    detectAndSaveSportsSnapshots_(
      previousScores,
      allGames
    );

    upsertLatestSportsScores_(
      allGames
    );

    summary.uniqueGames =
      allGames.length;

    summary.finishedAt =
      new Date();

    logSports_(
      "INFO",
      "runSportsScoresWindowUpdate",
      "Multi-day sports score update complete",
      JSON.stringify(summary)
    );

    return summary;

  } finally {
    lock.releaseLock();
  }
}

function buildSportsDateStrings_(
  daysBack,
  daysForward
) {
  daysBack =
    Number(daysBack || 0);

  daysForward =
    Number(daysForward || 0);

  const dates = [];

  const today =
    new Date();

  for (
    let offset = -daysBack;
    offset <= daysForward;
    offset++
  ) {
    const d =
      new Date(today);

    d.setDate(
      today.getDate() + offset
    );

    dates.push(
      formatSportsDateForESPN_(d)
    );
  }

  return dates;
}

function formatSportsDateForESPN_(date) {
  const yyyy =
    date.getFullYear();

  const mm =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const dd =
    String(date.getDate())
      .padStart(2, "0");

  return "" + yyyy + mm + dd;
}

function ensureSportsScoresLogoDateColumns_() {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SCORES
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SCORES
    );
  }

  const required = [
    "GameDateTime",
    "HomeLogo",
    "AwayLogo",
    "HomeRecord",
    "AwayRecord"
  ];

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
        return String(header || "").trim();
      });

  const missing =
    required.filter(function(header) {
      return headers.indexOf(header) === -1;
    });

  if (!missing.length) {
    return;
  }

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

function sportsRecordFromPossibleSheetDate_(value) {

  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value.getTime())
  ) {

    const year = value.getFullYear();

    if (year >= 2000 && year <= 2030) {
      return [
        value.getMonth() + 1,
        value.getDate(),
        year - 2000
      ].join("-");
    }

  }

  let text =
    String(value || "")
      .trim();

  const convertedDateMatch =
    text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})$/);

  if (convertedDateMatch) {

    const third =
      Number(convertedDateMatch[3]) - 2000;

    if (third >= 0 && third <= 30) {
      return [
        Number(convertedDateMatch[1]),
        Number(convertedDateMatch[2]),
        third
      ].join("-");
    }

  }

  return "";

}

function isSportsRecordValue_(value) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return false;
  }

  const lower =
    value.toLowerCase();

  /*
    Accept sports records before rejecting date-looking text.
    This is important for tied records such as 2-2-1.
    Google Sheets can try to convert these into dates unless
    the columns are formatted as text.

    Accepted examples:
    43-31
    43-31-1
    2-2-1
    12-3-10
    10-4 Away
    7-2 Conf
    15-6 Overall
  */
  if (/^\d{1,3}\s*-\s*\d{1,3}(?:\s*-\s*\d{1,2})?(?:\s+[A-Za-z][A-Za-z ]{1,24})?$/.test(value)) {
    return true;
  }

  /*
    Reject true date/time-like values that ESPN sometimes places
    into non-record display fields. These were showing in the
    app as HomeRecord / AwayRecord.
  */
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) {
    return false;
  }

  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value)) {
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

  return false;

}

function cleanSportsRecordValue_(value) {

  const recovered =
    sportsRecordFromPossibleSheetDate_(value);

  if (recovered && isSportsRecordValue_(recovered)) {
    return recovered;
  }

  value =
    String(value || "")
      .trim()
      .replace(/^'/, "");

  if (!isSportsRecordValue_(value)) {
    return "";
  }

  return value.replace(/\s*-\s*/g, "-");

}

function applySportsRecordTextFormats_(sheetName) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh || sh.getLastColumn() < 1) {
    return;
  }

  const headers =
    sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function(header) {
        return String(header || "").trim();
      });

  [
    "HomeRecord",
    "AwayRecord",
    "Clock",
    "SportsClock"
  ].forEach(function(headerName) {

    const index =
      headers.indexOf(headerName);

    if (index === -1) {
      return;
    }

    sh
      .getRange(1, index + 1, Math.max(sh.getMaxRows(), 1), 1)
      .setNumberFormat("@");

  });

}

/************************************
 STEP 12
 FULL-SEASON SCHEDULE LOADER
 Loads whole seasons in small batches.
 Do NOT run this every 5 minutes.
************************************/

const SPORTS_SEASON_JOBS_SHEET =
  "SportsSeasonJobs";

const SPORTS_SEASON_BATCH_TRIGGER_FUNCTION =
  "runSportsSeasonBatchUpdate";

const SPORTS_SEASON_MAX_DATE_FETCHES_PER_RUN =
  20;

const SPORTS_SEASON_JOB_HEADERS = [
  "JobId",
  "Sport",
  "League",
  "SeasonName",
  "StartDate",
  "EndDate",
  "NextDate",
  "BatchDays",
  "Status",
  "LastRun",
  "DaysProcessed",
  "GamesFetched",
  "UniqueGames",
  "Errors",
  "CreatedAt",
  "CompletedAt"
];

/************************************
 SETUP SEASON JOB SHEET
************************************/

/* Removed earlier duplicate function setupSportsSeasonJobsSheet during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function ensureSportsSeasonJobColumns_ during production cleanup; final definition retained later in file. */


/************************************
 COLLEGE FOOTBALL FBS URL PATCH
 Adds groups=80 so ESPN pulls FBS games.
************************************/

function upgradeCollegeFootballToFBS() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SETTINGS
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SHEETS.SETTINGS
    );
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      success: false,
      message: "No SportsSettings rows found"
    };
  }

  const col =
    getSportsHeaderMap_(data[0]);

  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    const sport =
      String(data[i][col.Sport] || "")
        .trim()
        .toLowerCase();

    const league =
      String(data[i][col.League] || "")
        .trim()
        .toLowerCase();

    if (
      sport !== "football" ||
      league !== "college-football"
    ) {
      continue;
    }

    let url =
      String(data[i][col.ESPNScoreboardUrl] || "")
        .trim();

    if (!url) {
      continue;
    }

    if (url.indexOf("groups=") >= 0) {
      continue;
    }

    const separator =
      url.indexOf("?") >= 0
        ? "&"
        : "?";

    url =
      url +
      separator +
      "groups=80";

    sh
      .getRange(
        i + 1,
        col.ESPNScoreboardUrl + 1
      )
      .setValue(url);

    updated++;
  }

  logSports_(
    "INFO",
    "upgradeCollegeFootballToFBS",
    "Updated college football URL",
    JSON.stringify({
      updated: updated
    })
  );

  return {
    success: true,
    updated: updated
  };
}

/************************************
 CREATE SEASON JOBS
 Creates one batch job per enabled league.
************************************/

function createSportsSeasonJobs2026() {
  return createSportsSeasonJobsForDateRange_(
    "2026-01-01",
    "2026-12-31",
    2
  );
}

/* Removed earlier duplicate function createSportsSeasonJobsForDateRange_ during production cleanup; final definition retained later in file. */


/************************************
 RUN SMALL SEASON BATCH
 Processes a limited number of date fetches
 per run across active season jobs.
************************************/

function sportsV15SeasonYearForSetting_(setting) {
  return String(
    setting && (
      setting.SeasonYear ||
      sportsV13SeasonYear_(setting.SeasonTitle || setting.Season || "", new Date().getFullYear())
    ) || ""
  ).trim();
}

function sportsV15SeasonYearForJob_(job) {
  const explicitYear =
    String(job && job.SeasonYear || "").trim();

  if (explicitYear) {
    return explicitYear;
  }

  const startDate =
    normalizeSportsDateOnly_(job && job.StartDate);

  if (startDate && /^\d{4}-/.test(startDate)) {
    return startDate.slice(0, 4);
  }

  const seasonName =
    String(job && job.SeasonName || "");

  const match = seasonName.match(/(20\d{2}|19\d{2})/);

  return match ? match[1] : "";
}

function sportsV15JobMatchesSettingSeason_(job, setting) {
  const jobYear =
    sportsV15SeasonYearForJob_(job);

  const settingYear =
    sportsV15SeasonYearForSetting_(setting);

  if (!jobYear || !settingYear) {
    return true;
  }

  return String(jobYear) === String(settingYear);
}

function runSportsSeasonBatchUpdate() {
  const lock =
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(10000);

  if (!gotLock) {
    return {
      success: false,
      skipped: true,
      reason: "Another sports job is already running"
    };
  }

  const summary = {
    success: true,
    startedAt: new Date(),
    maxDateFetches:
      SPORTS_SEASON_MAX_DATE_FETCHES_PER_RUN,
    dateFetchesUsed: 0,
    jobsTouched: 0,
    gamesFetched: 0,
    uniqueGames: 0,
    errors: []
  };

  try {
    setupSportsSeasonJobsSheet();

    const settings =
      readEnabledSportsSettings_();

    const settingsByKey = {};

    settings.forEach(function(setting) {
      settingsByKey[
        setting.Sport + "|" + setting.League
      ] = setting;
    });

    const jobs =
      readActiveSportsSeasonJobs_();

    const previousScores =
      readLatestSportsScoresMap_();

    jobs.forEach(function(job) {
      if (
        summary.dateFetchesUsed >=
        SPORTS_SEASON_MAX_DATE_FETCHES_PER_RUN
      ) {
        return;
      }

      const setting =
        settingsByKey[
          job.Sport + "|" + job.League
        ];

      if (!setting) {
        updateSportsSeasonJob_(
          job.JobId,
          {
            Status: "ERROR",
            LastRun: new Date(),
            Errors:
              "No enabled SportsSettings row found for " +
              job.Sport +
              " / " +
              job.League
          }
        );

        return;
      }

      if (!sportsV15JobMatchesSettingSeason_(job, setting)) {
        updateSportsSeasonJob_(
          job.JobId,
          {
            Status: "SUPERSEDED",
            LastRun: new Date(),
            Errors:
              "Skipped stale season job. Job season " +
              sportsV15SeasonYearForJob_(job) +
              " does not match current SportsSettings season " +
              sportsV15SeasonYearForSetting_(setting) +
              ". Rebuild schedule for this league if needed.",
            CompletedAt: new Date()
          }
        );

        return;
      }

      const result =
        runSportsSeasonJobBatch_(
          job,
          setting,
          previousScores,
          SPORTS_SEASON_MAX_DATE_FETCHES_PER_RUN -
            summary.dateFetchesUsed
        );

      summary.dateFetchesUsed +=
        result.dateFetchesUsed;

      summary.jobsTouched++;

      summary.gamesFetched +=
        result.gamesFetched;

      summary.uniqueGames +=
        result.uniqueGames;

      if (result.errors.length) {
        summary.errors =
          summary.errors.concat(
            result.errors
          );
      }
    });

    summary.finishedAt =
      new Date();

    logSports_(
      "INFO",
      "runSportsSeasonBatchUpdate",
      "Sports season batch update complete",
      JSON.stringify(summary)
    );

    return summary;

  } finally {
    lock.releaseLock();
  }
}

/* Removed earlier duplicate function runSportsSeasonJobBatch_ during production cleanup; final definition retained later in file. */


/************************************
 SEASON JOB HELPERS
************************************/

function readActiveSportsSeasonJobs_() {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SEASON_JOBS_SHEET
      );

  if (!sh) {
    return [];
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  const jobs = [];

  for (let i = 1; i < data.length; i++) {
    const row =
      data[i];

    const status =
      String(row[col.Status] || "")
        .trim()
        .toUpperCase();

    if (status !== "ACTIVE") {
      continue;
    }

    const job = {};

    headers.forEach(function(header, index) {
      job[header] = row[index];
    });

    job._rowNumber =
      i + 1;

    job.StartDate =
      normalizeSportsDateOnly_(
        job.StartDate
      );

    job.EndDate =
      normalizeSportsDateOnly_(
        job.EndDate
      );

    job.NextDate =
      normalizeSportsDateOnly_(
        job.NextDate || job.StartDate
      );

    jobs.push(job);
  }

  return jobs;
}

function updateSportsSeasonJob_(
  jobId,
  patch
) {
  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SEASON_JOBS_SHEET
      );

  if (!sh) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_SEASON_JOBS_SHEET
    );
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  for (let i = 1; i < data.length; i++) {
    const rowJobId =
      String(data[i][col.JobId] || "")
        .trim();

    if (rowJobId !== String(jobId).trim()) {
      continue;
    }

    updateSportsSeasonJobRow_(
      sh,
      headers,
      i + 1,
      patch
    );

    return true;
  }

  return false;
}

function updateSportsSeasonJobRow_(
  sh,
  headers,
  rowNumber,
  patch
) {
  Object.keys(patch).forEach(function(key) {
    const index =
      headers.indexOf(key);

    if (index === -1) {
      return;
    }

    sh
      .getRange(
        rowNumber,
        index + 1
      )
      .setValue(
        patch[key]
      );
  });
}

function normalizeSportsDateOnly_(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const yyyy =
      value.getFullYear();

    const mm =
      String(value.getMonth() + 1)
        .padStart(2, "0");

    const dd =
      String(value.getDate())
        .padStart(2, "0");

    return yyyy + "-" + mm + "-" + dd;
  }

  const raw =
    String(value)
      .trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{8}$/.test(raw)) {
    return (
      raw.slice(0, 4) +
      "-" +
      raw.slice(4, 6) +
      "-" +
      raw.slice(6, 8)
    );
  }

  const parsed =
    new Date(raw);

  if (isNaN(parsed.getTime())) {
    return "";
  }

  return normalizeSportsDateOnly_(parsed);
}

function addSportsDays_(
  dateOnly,
  days
) {
  dateOnly =
    normalizeSportsDateOnly_(
      dateOnly
    );

  const parts =
    dateOnly.split("-");

  const date =
    new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

  date.setDate(
    date.getDate() + Number(days || 0)
  );

  return normalizeSportsDateOnly_(date);
}

/************************************
 SEASON BATCH TRIGGER
 Runs small schedule batches.
************************************/

function installSportsSeasonBatchTrigger() {
  removeSportsSeasonBatchTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_SEASON_BATCH_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyMinutes(15)
    .create();

  logSports_(
    "INFO",
    "installSportsSeasonBatchTrigger",
    "Installed sports season batch trigger",
    JSON.stringify({
      functionName:
        SPORTS_SEASON_BATCH_TRIGGER_FUNCTION,
      everyMinutes: 15
    })
  );

  return {
    success: true,
    message:
      "Sports season batch trigger installed for every 15 minutes"
  };
}

function removeSportsSeasonBatchTriggers() {
  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {
    if (
      trigger.getHandlerFunction() ===
      SPORTS_SEASON_BATCH_TRIGGER_FUNCTION
    ) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  logSports_(
    "INFO",
    "removeSportsSeasonBatchTriggers",
    "Removed sports season batch triggers",
    JSON.stringify({
      removed: removed
    })
  );

  return {
    success: true,
    removed: removed
  };
}

function checkSportsSeasonBatchTriggers() {
  const triggers =
    ScriptApp.getProjectTriggers();

  return triggers
    .filter(function(trigger) {
      return (
        trigger.getHandlerFunction() ===
        SPORTS_SEASON_BATCH_TRIGGER_FUNCTION
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

/************************************
 SPORTS ENGINE STATUS CHECKER
 Use this to confirm everything is working.
************************************/

/* Removed earlier duplicate function checkSportsEngineStatus during production cleanup; final definition retained later in file. */


function apiGetSportsScores_(params) {
  const sportFilter =
    String(params.sport || "")
      .trim()
      .toLowerCase();

  const leagueFilter =
    String(params.league || "")
      .trim()
      .toLowerCase();

  const stateFilter =
    String(params.state || "")
      .trim()
      .toLowerCase();

  const completedFilter =
    String(params.completed || "")
      .trim()
      .toLowerCase();

  const dateFromFilter =
    normalizeSportsApiDate_(
      params.dateFrom || ""
    );

  const dateToFilter =
    normalizeSportsApiDate_(
      params.dateTo || params.dateFrom || ""
    );

  const teamFilter =
    String(params.team || "")
      .trim()
      .toLowerCase();

  const teamFilters =
    teamFilter
      .split(/[,;|\n]+/)
      .map(function(value) { return String(value || "").trim(); })
      .filter(Boolean)
      .filter(function(value, index, values) { return values.indexOf(value) === index; });

  const seasonYearFilter =
    String(params.seasonYear || params.year || "")
      .trim();

  const seasonTypeFilter =
    String(params.seasonType || "")
      .trim()
      .toLowerCase();

  const seasonPhaseFilter =
    String(params.seasonPhase || "")
      .trim()
      .toLowerCase();

  const weekFilter =
    String(params.week || params.espnWeek || "")
      .trim()
      .toLowerCase();

  const gameIdFilter =
    String(params.gameId || "")
       .trim();

  const espnEventIdFilter =
    String(params.espnEventId || "")
       .trim();    

  const scores =
    readSportsScoresRows_()
      .filter(function(score) {
        if (
           gameIdFilter &&
           String(score.GameId || "").trim() !== gameIdFilter
        ) {
           return false;
        }

        if (
           espnEventIdFilter &&
           String(score.ESPNEventId || "").trim() !== espnEventIdFilter
        ) {
            return false;
        }
        
        if (
          sportFilter &&
          String(score.Sport || "")
            .toLowerCase() !== sportFilter
        ) {
          return false;
        }

        if (
          leagueFilter &&
          String(score.League || "")
            .toLowerCase() !== leagueFilter
        ) {
          return false;
        }

        if (
          stateFilter &&
          String(score.State || "")
            .toLowerCase() !== stateFilter
        ) {
          return false;
        }

        if (completedFilter) {
          const isCompleted =
            normalizeSportsBoolean_(
              score.Completed
            );

          if (
            completedFilter === "true" &&
            !isCompleted
          ) {
            return false;
          }

          if (
            completedFilter === "false" &&
            isCompleted
          ) {
            return false;
          }
        }

        if (
          dateFromFilter ||
          dateToFilter
        ) {
          const gameDate =
            getSportsScoreDateOnly_(
              score.GameDateTime
            );

          if (!gameDate) {
            return false;
          }

          if (
            dateFromFilter &&
            gameDate < dateFromFilter
          ) {
            return false;
          }

          if (
            dateToFilter &&
            gameDate > dateToFilter
          ) {
            return false;
          }
        }

        if (seasonYearFilter) {
          const scoreSeasonYear =
            String(score.SeasonYear || "").trim();
          if (scoreSeasonYear !== seasonYearFilter) return false;
        }

        if (seasonTypeFilter) {
          const scoreSeasonType =
            String(score.SeasonType || "").trim().toLowerCase();
          if (scoreSeasonType !== seasonTypeFilter) return false;
        }

        if (seasonPhaseFilter) {
          const scoreSeasonPhase =
            String(score.SeasonPhase || "").trim().toLowerCase();
          if (scoreSeasonPhase !== seasonPhaseFilter) return false;
        }

        if (weekFilter) {
          const scoreWeek =
            String(score.Week || score.ESPNWeek || "").trim().toLowerCase();
          if (scoreWeek !== weekFilter) return false;
        }

        if (teamFilters.length) {
          const searchableTeams = [
            score.HomeTeam,
            score.AwayTeam,
            score.HomeAbbreviation,
            score.AwayAbbreviation,
            score.HomeShortName,
            score.AwayShortName
          ]
            .map(function(value) { return String(value || "").trim().toLowerCase(); })
            .filter(Boolean)
            .join(" ");

          const matchesAnyTeam =
            teamFilters.some(function(value) {
              return searchableTeams.indexOf(value) !== -1;
            });

          if (!matchesAnyTeam) return false;
        }

        return true;
      })
      .sort(function(a, b) {
        const dateA =
          new Date(a.GameDateTime || 0)
            .getTime();

        const dateB =
          new Date(b.GameDateTime || 0)
            .getTime();

        return dateA - dateB;
      });

  return {
    success: true,
    count: scores.length,
    filters: {
      gameId: gameIdFilter,
      espnEventId: espnEventIdFilter,
      sport: sportFilter,
      league: leagueFilter,
      state: stateFilter,
      completed: completedFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
      team: teamFilter,
      teamFilters: teamFilters,
      seasonYear: seasonYearFilter,
      seasonType: seasonTypeFilter,
      seasonPhase: seasonPhaseFilter,
      week: weekFilter
    },
    scores: scores,
    timestamp: new Date()
  };
}

function normalizeSportsApiDate_(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return formatSportsApiDateOnly_(value);
  }

  const raw =
    String(value)
      .trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{8}$/.test(raw)) {
    return (
      raw.slice(0, 4) +
      "-" +
      raw.slice(4, 6) +
      "-" +
      raw.slice(6, 8)
    );
  }

  const parsed =
    new Date(raw);

  if (isNaN(parsed.getTime())) {
    return "";
  }

  return formatSportsApiDateOnly_(parsed);
}

function getSportsScoreDateOnly_(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return formatSportsApiDateOnly_(value);
  }

  const raw = String(value).trim();

  /*
    v48: GameDateTime is commonly stored as an ISO UTC timestamp. Slicing the
    first 10 characters treated a 7:00 PM Chicago game as the next UTC day,
    so an Aug 25 filter could visibly include Aug 24 games. Parse timestamps
    with a time component and format them in the spreadsheet/script timezone.
  */
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) {
    return "";
  }

  return formatSportsApiDateOnly_(parsed);
}

function formatSportsApiDateOnly_(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  let timeZone = "America/Chicago";
  try {
    const ss = SpreadsheetApp.getActive();
    if (ss && ss.getSpreadsheetTimeZone()) {
      timeZone = ss.getSpreadsheetTimeZone();
    } else if (typeof Session !== "undefined" && Session.getScriptTimeZone) {
      timeZone = Session.getScriptTimeZone() || timeZone;
    }
  } catch (timezoneError) {
    try {
      if (typeof Session !== "undefined" && Session.getScriptTimeZone) {
        timeZone = Session.getScriptTimeZone() || timeZone;
      }
    } catch (ignored) {}
  }

  // Apps Script has Utilities.formatDate. Node-based regression tests do not,
  // so keep an Intl fallback that preserves the same timezone-aware behavior.
  if (typeof Utilities !== "undefined" && Utilities.formatDate) {
    return Utilities.formatDate(date, timeZone, "yyyy-MM-dd");
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = {};
    parts.forEach(function (part) {
      if (part.type !== "literal") values[part.type] = part.value;
    });
    if (values.year && values.month && values.day) {
      return values.year + "-" + values.month + "-" + values.day;
    }
  } catch (intlError) {}

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

function testApiGetSportsScoresFunctionExists() {
  const result =
    apiGetSportsScores_({
      dateFrom: "",
      dateTo: "",
      team: ""
    });

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}


function testSportsAdminDashboard() {
  return apiGetSportsAdminDashboard_({
    adminKey: PropertiesService
      .getScriptProperties()
      .getProperty("SPORTS_ADMIN_API_KEY")
  });
}

/************************************
 PATCH v3 - MMA EVENT NORMALIZATION
************************************/

function normalizeESPNEvent_(event, sport, league) {

  sport =
    String(sport || "")
      .trim()
      .toLowerCase();

  league =
    String(league || "")
      .trim()
      .toLowerCase();

  if (
    sport === "mma" ||
    league === "ufc"
  ) {
    return normalizeESPNCombatEvent_(
      event,
      sport,
      league
    );
  }

  return normalizeESPNTeamEvent_(
    event,
    sport,
    league
  );

}

function getESPNCompetitorDisplayName_(competitor) {

  competitor =
    competitor || {};

  const athlete =
    competitor.athlete ||
    competitor.team ||
    {};

  return (
    athlete.displayName ||
    athlete.fullName ||
    athlete.shortDisplayName ||
    athlete.name ||
    competitor.displayName ||
    competitor.name ||
    ""
  );

}

function normalizeESPNCombatEvent_(event, sport, league) {

  const competition =
    event.competitions &&
    event.competitions.length
      ? event.competitions[0]
      : {};

  const status =
    competition.status ||
    event.status ||
    {};

  const statusType =
    status.type || {};

  const competitors =
    competition.competitors || [];

  const first =
    competitors[0] || {};

  const second =
    competitors[1] || {};

  const firstName =
    getESPNCompetitorDisplayName_(
      first
    );

  const secondName =
    getESPNCompetitorDisplayName_(
      second
    );

  const completed =
    statusType.completed === true;

  let winner = "";

  if (completed) {

    const winnerCompetitor =
      competitors.find(function(item) {
        return item.winner === true;
      });

    winner =
      winnerCompetitor
        ? getESPNCompetitorDisplayName_(
            winnerCompetitor
          )
        : "";

  }

  return {
    GameId: league + "_" + String(event.id || ""),
    ESPNEventId: String(event.id || ""),
    Sport: sport,
    League: league,
    Status:
      statusType.name ||
      statusType.description ||
      "",
    State:
      statusType.state ||
      "",
    Period:
      status.period || "",
    Clock:
      status.displayClock || "",
    HomeTeam:
      firstName,
    AwayTeam:
      secondName,
    HomeScore: "",
    AwayScore: "",
    Winner: winner,
    Completed: completed,
    LastUpdated: new Date(),
    GameDateTime:
      event.date || "",
    HomeLogo:
      getESPNEventLogo_(event),
    AwayLogo: ""
  };

}


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

/* Removed earlier duplicate function fetchAndNormalizeESPNScoreboard_ during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function fetchAndNormalizeESPNScoreboardFromSetting_ during production cleanup; final definition retained later in file. */



/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

/* Older mixed motorsports settings helper removed during production cleanup. */


/* Removed earlier duplicate function addExtraSportsSettings during production cleanup; final definition retained later in file. */



/************************************************************
 SPORTS SCORES ENGINE v12
 Smart automation, season phases, poll timing, snapshots,
 archive storage, and unified trigger control.
************************************************************/

const SPORTS_V12_SETTINGS_HEADERS = [
  "SeasonTitle",
  "SeasonStartDate",
  "SeasonEndDate",
  "PreseasonEnabled",
  "PreseasonStartDate",
  "PreseasonEndDate",
  "PostseasonEnabled",
  "PostseasonStartDate",
  "PostseasonEndDate",
  "TournamentEnabled",
  "TournamentStartDate",
  "TournamentEndDate",
  "BowlEnabled",
  "BowlStartDate",
  "BowlEndDate",
  "SnapshotRetentionDays",
  "ArchiveEnabled",
  "ArchiveAfterDays",
  "ArchiveMode",
  "ArchiveLastRunAt",
  "ArchiveLastStatus",
  "ArchiveRowsLastRun"
];

const SPORTS_SCORES_ARCHIVE_SHEET = "SportsScoresArchive";
const SPORTS_SNAPSHOTS_ARCHIVE_SHEET = "SportsSnapshotsArchive";
const SPORTS_ARCHIVE_TRIGGER_FUNCTION = "runSportsArchiveUpdate";
const SPORTS_POLL_PROPERTY_PREFIX = "SPORTS_V12_LAST_POLL_";

function sportsV12PositiveNumber_(value, fallback) {
  const n = Number(value);
  if (isNaN(n) || !isFinite(n) || n < 0) return Number(fallback || 0);
  return n;
}

/* Removed earlier duplicate function ensureSportsControlsV12SettingsColumns_ during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function upgradeSportsControlsV12 during production cleanup; final definition retained later in file. */


function sportsDateInRange_(dateOnly, startDate, endDate) {
  dateOnly = normalizeSportsDateOnly_(dateOnly);
  startDate = normalizeSportsDateOnly_(startDate);
  endDate = normalizeSportsDateOnly_(endDate);
  if (!dateOnly || !startDate || !endDate) return false;
  return dateOnly >= startDate && dateOnly <= endDate;
}

/* Removed earlier duplicate function sportsGetSeasonPhase_ during production cleanup; final definition retained later in file. */


function sportsLeagueScoreRowsFromMap_(previousScores, league) {
  league = String(league || "").toLowerCase();
  return Object.keys(previousScores || {}).map(function(key) {
    return previousScores[key];
  }).filter(function(row) {
    return String(row.League || "").toLowerCase() === league;
  });
}

function sportsGetPollingMode_(setting, previousScores) {
  const rows = sportsLeagueScoreRowsFromMap_(previousScores, setting.League);
  const now = Date.now();
  let hasLive = false;
  let hasPregame = false;
  let hasRecentFinal = false;

  rows.forEach(function(row) {
    const state = String(row.State || "").toLowerCase();
    const completed = normalizeSportsBoolean_(row.Completed);
    const gameMs = new Date(row.GameDateTime || 0).getTime();
    const updatedMs = new Date(row.LastUpdated || 0).getTime();

    if (!completed && state === "in") hasLive = true;
    if (!completed && state !== "in" && gameMs && gameMs >= now - 6 * 3600000 && gameMs <= now + 48 * 3600000) hasPregame = true;
    if (completed && updatedMs && now - updatedMs <= 48 * 3600000) hasRecentFinal = true;
  });

  if (hasLive) return "LIVE";
  if (hasPregame) return "PREGAME";
  if (hasRecentFinal) return "FINAL";
  return "PREGAME";
}

function sportsPollIntervalForMode_(setting, mode) {
  if (mode === "LIVE") return Math.max(1, Number(setting.PollLiveMinutes || 1));
  if (mode === "FINAL") return Math.max(1, Number(setting.PollFinalMinutes || 60));
  return Math.max(1, Number(setting.PollPreGameMinutes || 30));
}

function sportsPollPropertyKey_(setting) {
  return SPORTS_POLL_PROPERTY_PREFIX + String(setting.Sport || "") + "_" + String(setting.League || "");
}

function sportsShouldPollSetting_(setting, previousScores, force) {
  if (!setting.SeasonActive) {
    return { shouldPoll: false, reason: "League is outside all enabled season date ranges", mode: "OFF SEASON" };
  }

  const mode = sportsGetPollingMode_(setting, previousScores);
  const minutes = sportsPollIntervalForMode_(setting, mode);
  if (force) return { shouldPoll: true, reason: "Forced refresh", mode: mode };

  const raw = PropertiesService.getScriptProperties().getProperty(sportsPollPropertyKey_(setting));
  const lastMs = Number(raw || 0);
  const nextMs = lastMs + minutes * 60000;

  if (!lastMs || Date.now() >= nextMs) {
    return { shouldPoll: true, reason: "Configured interval is due", mode: mode };
  }

  return {
    shouldPoll: false,
    reason: "Waiting for configured " + mode.toLowerCase() + " interval (" + minutes + " minutes)",
    mode: mode,
    nextDueAt: new Date(nextMs)
  };
}

function sportsMarkSettingPolled_(setting, mode) {
  PropertiesService.getScriptProperties().setProperty(sportsPollPropertyKey_(setting), String(Date.now()));
  PropertiesService.getScriptProperties().setProperty(sportsPollPropertyKey_(setting) + "_MODE", String(mode || ""));
}

function sportsArchiveEnsureSheet_(sheetName, sourceSheetName, keyHeader) {
  const ss = SpreadsheetApp.getActive();
  const source = ss.getSheetByName(sourceSheetName);
  if (!source) throw new Error("Missing source sheet: " + sourceSheetName);

  applySportsRecordTextFormats_(
    sourceSheetName
  );

  const sourceHeaders = source.getRange(1, 1, 1, source.getLastColumn()).getValues()[0]
    .map(function(header) { return String(header || "").trim(); });
  const required = sourceHeaders.concat(["ArchivedAt", "ArchiveMode"]);
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  if (sh.getLastRow() === 0 || sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, required.length).setValues([required]);
    sh.setFrozenRows(1);
  } else {
    const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(function(header) { return String(header || "").trim(); });
    const missing = required.filter(function(header) { return existing.indexOf(header) === -1; });
    if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }

  applySportsRecordTextFormats_(
    sheetName
  );

  return sh;
}

function setupSportsArchiveSystem_() {
  const scoresArchive = sportsArchiveEnsureSheet_(SPORTS_SCORES_ARCHIVE_SHEET, SPORTS_SHEETS.SCORES, "GameId");
  const snapshotsArchive = sportsArchiveEnsureSheet_(SPORTS_SNAPSHOTS_ARCHIVE_SHEET, SPORTS_SHEETS.SNAPSHOTS, "SnapshotId");
  return {
    success: true,
    scoreArchiveSheet: scoresArchive.getName(),
    snapshotArchiveSheet: snapshotsArchive.getName()
  };
}

function sportsArchiveExistingKeys_(sh, keyHeader) {
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return {};
  const headers = data[0].map(function(header) { return String(header || "").trim(); });
  const col = getSportsHeaderMap_(headers);
  const result = {};
  if (col[keyHeader] === undefined) return result;
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][col[keyHeader]] || "").trim();
    if (key) result[key] = true;
  }
  return result;
}

function sportsArchiveDeleteRowsInBatches_(sheet, rowNumbers) {
  const sorted = Array.from(new Set(rowNumbers.map(function(rowNumber) {
    return Number(rowNumber || 0);
  }).filter(function(rowNumber) {
    return rowNumber > 1;
  }))).sort(function(a, b) {
    return b - a;
  });

  if (!sorted.length) return 0;

  let removed = 0;
  let rangeEnd = sorted[0];
  let rangeStart = sorted[0];

  function flushRange_() {
    const count = rangeEnd - rangeStart + 1;
    sheet.deleteRows(rangeStart, count);
    removed += count;
  }

  for (let i = 1; i < sorted.length; i++) {
    const rowNumber = sorted[i];
    if (rowNumber === rangeStart - 1) {
      rangeStart = rowNumber;
    } else {
      flushRange_();
      rangeEnd = rowNumber;
      rangeStart = rowNumber;
    }
  }

  flushRange_();
  return removed;
}

function sportsArchiveRows_(sourceSheet, archiveSheet, rowNumbers, keyHeader, mode) {
  if (!rowNumbers.length) {
    return {
      copied: 0,
      removed: 0,
      skipped: 0,
      keys: []
    };
  }

  const sourceData = sourceSheet.getDataRange().getValues();
  if (sourceData.length <= 1) {
    return {
      copied: 0,
      removed: 0,
      skipped: rowNumbers.length,
      keys: []
    };
  }

  const sourceHeaders = sourceData[0].map(function(header) {
    return String(header || "").trim();
  });
  const sourceCol = getSportsHeaderMap_(sourceHeaders);

  if (sourceCol[keyHeader] === undefined) {
    throw new Error(
      "Cannot archive " + sourceSheet.getName() +
      ": missing required key header " + keyHeader
    );
  }

  const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0]
    .map(function(header) {
      return String(header || "").trim();
    });
  const existing = sportsArchiveExistingKeys_(archiveSheet, keyHeader);
  const rowsToAppend = [];
  const keys = [];
  const safeRowsToRemove = [];
  let skipped = 0;

  Array.from(new Set(rowNumbers)).forEach(function(rowNumber) {
    const sourceRow = sourceData[rowNumber - 1];
    if (!sourceRow) {
      skipped++;
      return;
    }

    const key = String(sourceRow[sourceCol[keyHeader]] || "").trim();
    if (!key) {
      skipped++;
      return;
    }

    keys.push(key);
    safeRowsToRemove.push(rowNumber);

    if (existing[key]) {
      return;
    }

    const obj = {};
    sourceHeaders.forEach(function(header, index) {
      obj[header] = sourceRow[index];
    });
    obj.ArchivedAt = new Date();
    obj.ArchiveMode = mode;

    rowsToAppend.push(archiveHeaders.map(function(header) {
      if (header === "HomeRecord" || header === "AwayRecord") {
        return cleanSportsRecordValue_(obj[header]);
      }
      if (header === "Clock" || header === "SportsClock") {
        return cleanSportsClockDisplayValue_(obj[header]);
      }
      return obj[header] !== undefined ? obj[header] : "";
    }));
  });

  if (rowsToAppend.length) {
    applySportsRecordTextFormats_(
      archiveSheet.getName()
    );

    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToAppend.length, archiveHeaders.length)
      .setValues(rowsToAppend);
  }

  let removed = 0;
  if (mode === "MOVE") {
    removed = sportsArchiveDeleteRowsInBatches_(sourceSheet, safeRowsToRemove);
  }

  return {
    copied: rowsToAppend.length,
    removed: removed,
    skipped: skipped,
    keys: keys
  };
}

function sportsArchiveUpdateSettingStatus_(setting, status, rows) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (!sh || !setting._rowNumber) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function(header) { return String(header || "").trim(); });
  const col = getSportsHeaderMap_(headers);
  const patch = {
    ArchiveLastRunAt: new Date(),
    ArchiveLastStatus: status,
    ArchiveRowsLastRun: Number(rows || 0)
  };
  Object.keys(patch).forEach(function(key) {
    if (col[key] !== undefined) sh.getRange(setting._rowNumber, col[key] + 1).setValue(patch[key]);
  });
}

function previewSportsLeagueArchive_(targetLeague) {
  setupSportsArchiveSystem_();

  const targetKey =
    String(targetLeague || "")
      .trim()
      .toLowerCase();

  const settings = readEnabledSportsSettings_(true);
  const ss = SpreadsheetApp.getActive();
  const scoresSheet = ss.getSheetByName(SPORTS_SHEETS.SCORES);
  const snapshotsSheet = ss.getSheetByName(SPORTS_SHEETS.SNAPSHOTS);
  const summary = {
    success: true,
    preview: true,
    targetLeague: targetKey || "ALL",
    leagues: [],
    scoreArchiveCandidates: 0,
    snapshotArchiveCandidates: 0,
    logTrimCandidates: 0
  };

  settings.forEach(function(setting) {
    if (targetKey && String(setting.League || "").toLowerCase() !== targetKey) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.max(1, Number(setting.ArchiveAfterDays || 30)));
    const cutoffMs = cutoff.getTime();

    const scoreData = scoresSheet.getDataRange().getValues();
    const scoreHeaders = scoreData[0].map(function(header) { return String(header || "").trim(); });
    const scoreCol = getSportsHeaderMap_(scoreHeaders);
    const gameIds = {};
    let scoreRows = 0;

    for (let i = 1; i < scoreData.length; i++) {
      const row = scoreData[i];
      if (String(row[scoreCol.League] || "").trim().toLowerCase() !== String(setting.League || "").trim().toLowerCase()) continue;
      if (!normalizeSportsBoolean_(row[scoreCol.Completed])) continue;
      const dateValue = row[scoreCol.GameDateTime] || row[scoreCol.LastUpdated];
      const rowMs = new Date(dateValue || 0).getTime();
      if (!rowMs || rowMs > cutoffMs) continue;
      scoreRows++;
      gameIds[String(row[scoreCol.GameId] || "").trim()] = true;
    }

    const snapshotData = snapshotsSheet.getDataRange().getValues();
    const snapshotHeaders = snapshotData[0].map(function(header) { return String(header || "").trim(); });
    const snapshotCol = getSportsHeaderMap_(snapshotHeaders);
    const snapshotCutoff = new Date();
    snapshotCutoff.setDate(snapshotCutoff.getDate() - Math.max(1, Number(setting.SnapshotRetentionDays || 14)));
    const snapshotCutoffMs = snapshotCutoff.getTime();
    let snapshotRows = 0;

    for (let j = 1; j < snapshotData.length; j++) {
      const snapshotLeague = String(snapshotData[j][snapshotCol.League] || "").trim().toLowerCase();
      const snapshotGameId = String(snapshotData[j][snapshotCol.GameId] || "").trim();
      const snapshotMs = new Date(snapshotData[j][snapshotCol.Timestamp] || 0).getTime();
      if (
        gameIds[snapshotGameId] ||
        (snapshotLeague === String(setting.League || "").trim().toLowerCase() && snapshotMs && snapshotMs <= snapshotCutoffMs)
      ) {
        snapshotRows++;
      }
    }

    summary.scoreArchiveCandidates += scoreRows;
    summary.snapshotArchiveCandidates += snapshotRows;
    summary.leagues.push({
      league: setting.League,
      archiveEnabled: !!setting.ArchiveEnabled,
      archiveAfterDays: setting.ArchiveAfterDays,
      snapshotRetentionDays: setting.SnapshotRetentionDays,
      archiveMode: setting.ArchiveMode === "COPY" ? "COPY" : "MOVE",
      cutoff: cutoff,
      scoreArchiveCandidates: scoreRows,
      snapshotArchiveCandidates: snapshotRows,
      logTrimCandidates: 0
    });
  });

  return summary;
}

function runSportsArchiveUpdate(targetLeague) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success: false, skipped: true, reason: "Another sports job is running" };

  try {
    setupSportsArchiveSystem_();
    const targetKey = String(targetLeague || "").trim().toLowerCase();
    const settings = readEnabledSportsSettings_(true);
    const ss = SpreadsheetApp.getActive();
    const scoresSheet = ss.getSheetByName(SPORTS_SHEETS.SCORES);
    const snapshotsSheet = ss.getSheetByName(SPORTS_SHEETS.SNAPSHOTS);
    const scoresArchive = ss.getSheetByName(SPORTS_SCORES_ARCHIVE_SHEET);
    const snapshotsArchive = ss.getSheetByName(SPORTS_SNAPSHOTS_ARCHIVE_SHEET);
    const summary = { success: true, startedAt: new Date(), targetLeague: targetKey || "ALL", leagues: [], scoresCopied: 0, scoresRemoved: 0, snapshotsCopied: 0, snapshotsRemoved: 0, errors: [] };

    settings.forEach(function(setting) {
      if (targetKey && String(setting.League || "").toLowerCase() !== targetKey) return;
      if (!setting.ArchiveEnabled) return;
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Math.max(1, Number(setting.ArchiveAfterDays || 30)));
        const cutoffMs = cutoff.getTime();
        const mode = setting.ArchiveMode === "COPY" ? "COPY" : "MOVE";

        const scoreData = scoresSheet.getDataRange().getValues();
        const scoreHeaders = scoreData[0].map(function(header) { return String(header || "").trim(); });
        const scoreCol = getSportsHeaderMap_(scoreHeaders);
        const scoreRows = [];
        const gameIds = {};

        for (let i = 1; i < scoreData.length; i++) {
          const row = scoreData[i];
          if (String(row[scoreCol.League] || "").trim().toLowerCase() !== String(setting.League || "").trim().toLowerCase()) continue;
          if (!normalizeSportsBoolean_(row[scoreCol.Completed])) continue;
          const dateValue = row[scoreCol.GameDateTime] || row[scoreCol.LastUpdated];
          const rowMs = new Date(dateValue || 0).getTime();
          if (!rowMs || rowMs > cutoffMs) continue;
          scoreRows.push(i + 1);
          gameIds[String(row[scoreCol.GameId] || "").trim()] = true;
        }

        const snapshotData = snapshotsSheet.getDataRange().getValues();
        const snapshotHeaders = snapshotData[0].map(function(header) { return String(header || "").trim(); });
        const snapshotCol = getSportsHeaderMap_(snapshotHeaders);
        const snapshotRows = [];
        const snapshotCutoff = new Date();
        snapshotCutoff.setDate(snapshotCutoff.getDate() - Math.max(1, Number(setting.SnapshotRetentionDays || 14)));
        const snapshotCutoffMs = snapshotCutoff.getTime();
        for (let j = 1; j < snapshotData.length; j++) {
          const snapshotLeague = String(snapshotData[j][snapshotCol.League] || "").trim().toLowerCase();
          const snapshotGameId = String(snapshotData[j][snapshotCol.GameId] || "").trim();
          const snapshotMs = new Date(snapshotData[j][snapshotCol.Timestamp] || 0).getTime();
          if (
            gameIds[snapshotGameId] ||
            (snapshotLeague === String(setting.League || "").trim().toLowerCase() && snapshotMs && snapshotMs <= snapshotCutoffMs)
          ) {
            snapshotRows.push(j + 1);
          }
        }

        // Move snapshots first so deleting score rows cannot affect lookup state.
        const snapResult = sportsArchiveRows_(snapshotsSheet, snapshotsArchive, snapshotRows, "SnapshotId", mode);
        const scoreResult = sportsArchiveRows_(scoresSheet, scoresArchive, scoreRows, "GameId", mode);
        const total = scoreResult.copied + snapResult.copied;
        sportsArchiveUpdateSettingStatus_(setting, "OK - " + total + " rows archived", total);

        summary.scoresCopied += scoreResult.copied;
        summary.scoresRemoved += scoreResult.removed;
        summary.snapshotsCopied += snapResult.copied;
        summary.snapshotsRemoved += snapResult.removed;
        summary.leagues.push({ league: setting.League, mode: mode, cutoff: cutoff, scores: scoreResult, snapshots: snapResult });
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        sportsArchiveUpdateSettingStatus_(setting, "ERROR - " + message, 0);
        summary.errors.push({ league: setting.League, error: message });
      }
    });

    summary.finishedAt = new Date();
    summary.success = summary.errors.length === 0;
    return summary;
  } finally {
    lock.releaseLock();
  }
}

function installSportsArchiveDailyTrigger(hour) {
  removeSportsArchiveTriggers();
  hour = Number(hour === undefined ? 3 : hour);
  if (isNaN(hour) || hour < 0 || hour > 23) hour = 3;
  ScriptApp.newTrigger(SPORTS_ARCHIVE_TRIGGER_FUNCTION).timeBased().everyDays(1).atHour(hour).create();
  return { success: true, installed: true, hour: hour };
}

function removeSportsArchiveTriggers() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === SPORTS_ARCHIVE_TRIGGER_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  return { success: true, removed: removed };
}

function checkSportsArchiveTriggers() {
  return ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === SPORTS_ARCHIVE_TRIGGER_FUNCTION;
  }).map(function(trigger) {
    return { handler: trigger.getHandlerFunction(), eventType: String(trigger.getEventType()), source: String(trigger.getTriggerSource()) };
  });
}

function getSportsArchiveStatus_(options) {
  options = options || {};
  const lightweight = options.lightweight === true || String(options.lightweight || "").toLowerCase() === "true";
  if (!lightweight) {
    setupSportsArchiveSystem_();
  }
  const ss = SpreadsheetApp.getActive();
  const scoresArchive = ss.getSheetByName(SPORTS_SCORES_ARCHIVE_SHEET);
  const snapshotsArchive = ss.getSheetByName(SPORTS_SNAPSHOTS_ARCHIVE_SHEET);
  return {
    success: true,
    scoreArchiveRows: scoresArchive ? Math.max(0, scoresArchive.getLastRow() - 1) : 0,
    snapshotArchiveRows: snapshotsArchive ? Math.max(0, snapshotsArchive.getLastRow() - 1) : 0,
    triggers: lightweight ? [] : checkSportsArchiveTriggers(),
    diagnosticsDeferred: lightweight
  };
}


/************************************
 PATCH v13
 COLLEGE COVERAGE + ESPN SEASON TYPES + SPORTS GAMES WRITER

 What this adds:
 - SportsGames now populates whenever SportsScores is written.
 - College coverage can pull all FBS/D1 groups or selected ESPN team schedules.
 - ESPN season types are supported for preseason / regular / postseason.
 - Manual dates remain as fallback for leagues where ESPN season types are weak.
************************************/

function sportsV13SettingsExtraHeaders_() {
  return [
    "RegularSeasonStartDate",
    "RegularSeasonEndDate",
    "SeasonYear",
    "ScheduleSource",
    "ScheduleBatchDays",
    "ESPNSeasonTypesEnabled",
    "ESPNPreseasonType",
    "ESPNRegularSeasonType",
    "ESPNPostseasonType",
    "ESPNTournamentType",
    "ESPNBowlType",
    "CollegeCoverageMode",
    "ESPNGroupIds",
    "ESPNResultLimit",
    "SelectedTeamIds"
  ];
}

function sportsV13ScoresExtraHeaders_() {
  return [
    "GameDateTime",
    "HomeLogo",
    "AwayLogo",
    "HomeRecord",
    "AwayRecord",
    "HomeTeamId",
    "AwayTeamId",
    "SeasonYear",
    "SeasonType",
    "SeasonPhase",
    "Week",
    "Source",
    "GroupId",
    "TeamId",
    "HomeAbbreviation",
    "AwayAbbreviation",
    "HomeConferenceName",
    "AwayConferenceName"
  ];
}

function sportsV13CollegeTeamsHeaders_() {
  return [
    "Enabled",
    "Sport",
    "League",
    "SchoolName",
    "ESPNTeamId",
    "ESPNSlug",
    "Abbreviation",
    "GroupId",
    "ConferenceName",
    "IncludeSchedule",
    "IncludeScores",
    "LastImportedAt",
    "LastFetchStatus",
    "Notes"
  ];
}

/* Removed earlier duplicate function sportsV13SeasonJobExtraHeaders_ during production cleanup; final definition retained later in file. */


function sportsV13SpreadsheetRetry_(label, fn) {
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

function sportsV13EnsureSheetHeaders_(sheetName, headers) {
  headers = Array.isArray(headers) ? headers.filter(Boolean) : [];

  if (!sheetName || !headers.length) {
    throw new Error("sheetName and headers are required");
  }

  const ss = SpreadsheetApp.getActive();

  let sh = sportsV13SpreadsheetRetry_(
    "open sheet " + sheetName,
    function() {
      return ss.getSheetByName(sheetName);
    }
  );

  if (!sh) {
    sh = sportsV13SpreadsheetRetry_(
      "create sheet " + sheetName,
      function() {
        return ss.insertSheet(sheetName);
      }
    );

    Utilities.sleep(250);
  }

  let lastColumn = 0;

  try {
    lastColumn = sportsV13SpreadsheetRetry_(
      "read last column for " + sheetName,
      function() {
        return sh.getLastColumn();
      }
    );
  } catch (lastColumnError) {
    lastColumn = headers.length;
  }

  const readWidth = Math.max(1, Math.min(Math.max(lastColumn, headers.length), 250));

  const maxColumns = sh.getMaxColumns();
  if (maxColumns < readWidth) {
    sportsV13SpreadsheetRetry_(
      "expand columns for " + sheetName,
      function() {
        sh.insertColumnsAfter(maxColumns, readWidth - maxColumns);
        return true;
      }
    );
  }

  const existing = sportsV13SpreadsheetRetry_(
    "read headers for " + sheetName,
    function() {
      return sh
        .getRange(1, 1, 1, readWidth)
        .getDisplayValues()[0]
        .map(function(header) {
          return String(header || "").trim();
        });
    }
  );

  const hasAnyHeader = existing.some(function(header) {
    return !!header;
  });

  if (!hasAnyHeader) {
    sportsV13SpreadsheetRetry_(
      "write headers for " + sheetName,
      function() {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    );

    try {
      sh.setFrozenRows(1);
    } catch (freezeError) {}

    return {
      sheet: sh,
      added: headers.slice()
    };
  }

  const missing = headers.filter(function(header) {
    return existing.indexOf(header) === -1;
  });

  if (missing.length) {
    const appendColumn = Math.max(lastColumn, existing.filter(Boolean).length) + 1;
    const requiredMaxColumn = appendColumn + missing.length - 1;
    if (sh.getMaxColumns() < requiredMaxColumn) {
      sh.insertColumnsAfter(sh.getMaxColumns(), requiredMaxColumn - sh.getMaxColumns());
    }

    sportsV13SpreadsheetRetry_(
      "append headers for " + sheetName,
      function() {
        sh.getRange(1, appendColumn, 1, missing.length).setValues([missing]);
      }
    );
  }

  try {
    sh.setFrozenRows(1);
  } catch (freezeError2) {}

  return {
    sheet: sh,
    added: missing
  };
}

/* Removed earlier duplicate function setupSportsScoresSheet during production cleanup; final definition retained later in file. */


function ensureSportsControlsV12SettingsColumns_() {
  const headers = SPORTS_V12_SETTINGS_HEADERS.concat(sportsV13SettingsExtraHeaders_());
  const result = sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.SETTINGS, headers);
  return { success: true, added: result.added || [] };
}

/* Removed earlier duplicate function setupSportsSeasonJobsSheet during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function ensureSportsSeasonJobColumns_ during production cleanup; final definition retained later in file. */


function upgradeSportsControlsV12() {
  const settings = ensureSportsControlsV12SettingsColumns_();
  const scores = sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.SCORES, SPORTS_HEADERS.SportsScores.concat(sportsV13ScoresExtraHeaders_()));
  const games = sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.GAMES, sportsV13GamesHeaders_());
  const jobs = setupSportsSeasonJobsSheet();
  const college = sportsV13EnsureSheetHeaders_("SportsCollegeTeams", sportsV13CollegeTeamsHeaders_());
  const archive = setupSportsArchiveSystem_();
  return {
    success: true,
    version: "13",
    settingsColumnsAdded: settings.added,
    scoresColumnsAdded: scores.added,
    gamesColumnsAdded: games.added,
    seasonJobs: jobs,
    collegeTeamsColumnsAdded: college.added,
    archive: archive,
    message: "Sports controls v13 upgrade complete. College coverage, ESPN season types, SportsGames writer, and archive sheets are ready."
  };
}

function sportsGetSeasonPhase_(setting, dateOnly) {
  dateOnly = normalizeSportsDateOnly_(dateOnly || new Date());

  const seasonStart =
    setting.SeasonStartDate;

  const seasonEnd =
    setting.SeasonEndDate;

  const regularStart =
    setting.RegularSeasonStartDate ||
    setting.SeasonStartDate;

  const regularEnd =
    setting.RegularSeasonEndDate ||
    setting.SeasonEndDate;

  const phases = [
    { name: "PRESEASON", enabled: setting.PreseasonEnabled, start: setting.PreseasonStartDate, end: setting.PreseasonEndDate },
    { name: "REGULAR SEASON", enabled: !!(regularStart && regularEnd), start: regularStart, end: regularEnd },
    { name: "POSTSEASON", enabled: setting.PostseasonEnabled, start: setting.PostseasonStartDate, end: setting.PostseasonEndDate },
    { name: "TOURNAMENT", enabled: setting.TournamentEnabled, start: setting.TournamentStartDate, end: setting.TournamentEndDate },
    { name: "BOWL", enabled: setting.BowlEnabled, start: setting.BowlStartDate, end: setting.BowlEndDate }
  ];

  const masterConfigured =
    !!(seasonStart && seasonEnd);

  const masterActive =
    masterConfigured &&
    sportsDateInRange_(dateOnly, seasonStart, seasonEnd);

  const configured =
    masterConfigured ||
    phases.some(function(phase) {
      return phase.enabled && phase.start && phase.end;
    });

  if (!configured) return { active: true, phase: "DATES NOT SET" };

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (phase.enabled && sportsDateInRange_(dateOnly, phase.start, phase.end)) {
      return { active: true, phase: phase.name };
    }
  }

  /*
    The master Season Start/End dates are the admin's simple ON-season
    window. Advanced regular/pre/post dates only label the phase; they should
    not keep the league off if the master season window is active.
  */
  if (masterActive) {
    return { active: true, phase: "SEASON ACTIVE" };
  }

  return { active: false, phase: "OFF SEASON" };
}

function sportsV13Value_(row, col, key, fallback) {
  return col[key] === undefined ? fallback : row[col[key]];
}

function sportsV13SeasonYear_(value, fallback) {
  const raw = String(value || "").trim();
  const match = raw.match(/(20\d{2}|19\d{2})/);
  if (match) return match[1];
  const n = Number(fallback || new Date().getFullYear());
  return String(isNaN(n) ? new Date().getFullYear() : n);
}

function sportsV13Upper_(value, fallback) {
  const raw = String(value || fallback || "").trim();
  return raw ? raw.toUpperCase() : "";
}

/* Removed earlier duplicate function readEnabledSportsSettings_ during production cleanup; final definition retained later in file. */


function sportsV13IsCollegeLeague_(sport, league) {
  sport = String(sport || "").toLowerCase();
  league = String(league || "").toLowerCase();
  return league === "college-football" || league === "mens-college-basketball" || league === "womens-college-basketball";
}

function sportsV13CollegeDefaultGroupIds_(sport, league) {
  league = String(league || "").toLowerCase();
  if (league === "college-football") return ["80"];
  if (league === "mens-college-basketball") return ["50"];
  if (league === "womens-college-basketball") return ["50"];
  return [];
}

function sportsV13SplitList_(value) {
  return String(value || "")
    .split(/[;,\s]+/)
    .map(function(item) { return String(item || "").trim(); })
    .filter(Boolean)
    .filter(function(item, index, arr) { return arr.indexOf(item) === index; });
}

function sportsV13ESPNDateParam_(dateString) {
  const dateOnly = normalizeSportsDateOnly_(dateString);
  if (dateOnly) return dateOnly.replace(/-/g, "");
  const raw = String(dateString || "").trim();
  if (/^\d{8}$/.test(raw)) return raw;
  return "";
}

function sportsV13UrlWithoutParams_(url, removeKeys) {
  url = String(url || "").trim();
  const parts = url.split("?");
  if (parts.length < 2) return url;
  const remove = {};
  removeKeys.forEach(function(key) { remove[String(key).toLowerCase()] = true; });
  const kept = parts.slice(1).join("?")
    .split("&")
    .filter(function(pair) {
      const key = decodeURIComponent(String(pair || "").split("=")[0] || "").toLowerCase();
      return !remove[key];
    });
  return parts[0] + (kept.length ? "?" + kept.join("&") : "");
}

function sportsV13UrlWithParams_(url, params) {
  const keys = Object.keys(params || {}).filter(function(key) {
    return params[key] !== undefined && params[key] !== null && String(params[key]).trim() !== "";
  });
  if (!keys.length) return url;
  const separator = String(url).indexOf("?") >= 0 ? "&" : "?";
  return url + separator + keys.map(function(key) {
    return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
  }).join("&");
}

function sportsV13SeasonPhaseForType_(seasonType, fallback) {
  const type = String(seasonType || "").trim();
  if (type === "1") return "PRESEASON";
  if (type === "2") return "REGULAR SEASON";
  if (type === "3") return "POSTSEASON";
  return fallback || "";
}

function sportsV13BuildESPNRequests_(setting, dateString, options) {
  options = options || {};
  const sport = String(setting.Sport || options.sport || "").trim().toLowerCase();
  const league = String(setting.League || options.league || "").trim().toLowerCase();
  const baseRaw = setting.ESPNScoreboardUrl || getESPNScoreboardUrl_(sport, league);
  const cleanBase = sportsV13UrlWithoutParams_(baseRaw, ["dates", "groups", "limit", "seasontype", "season", "team"]);
  const espnDate = sportsV13ESPNDateParam_(dateString);
  const seasonYear = String(options.SeasonYear || options.seasonYear || setting.SeasonYear || sportsV13SeasonYear_(setting.SeasonTitle, new Date().getFullYear())).trim();
  const seasonType = String(options.SeasonType || options.seasonType || "").trim();
  const seasonPhase = String(options.SeasonPhase || options.seasonPhase || sportsV13SeasonPhaseForType_(seasonType, setting.SeasonPhase || "")).trim();
  const fetchMode = String(options.FetchMode || options.fetchMode || "DATE_SCOREBOARD").trim().toUpperCase();
  const requestedGroup = String(options.GroupId || options.groupId || "").trim();
  const requestedTeam = String(options.TeamId || options.teamId || "").trim();
  const coverageMode = String(setting.CollegeCoverageMode || "DEFAULT").trim().toUpperCase();
  const resultLimit = Number(setting.ESPNResultLimit || 0) || (sportsV13IsCollegeLeague_(sport, league) ? 500 : 100);

  const requests = [];

  const selectedTeams = requestedTeam ? [requestedTeam] : sportsV13SplitList_(setting.SelectedTeamIds);
  if ((fetchMode === "TEAM_SCHEDULE" || coverageMode === "SELECTED_SCHOOLS") && selectedTeams.length) {
    selectedTeams.forEach(function(teamId) {
      const teamUrl = "https://site.api.espn.com/apis/site/v2/sports/" +
        encodeURIComponent(sport) + "/" +
        encodeURIComponent(league) + "/teams/" +
        encodeURIComponent(teamId) + "/schedule";
      const params = {
        season: seasonYear,
        seasontype: seasonType,
        limit: resultLimit
      };
      requests.push({
        url: sportsV13UrlWithParams_(teamUrl, params),
        sport: sport,
        league: league,
        source: "ESPN_TEAM_SCHEDULE",
        seasonYear: seasonYear,
        seasonType: seasonType,
        seasonPhase: seasonPhase || sportsV13SeasonPhaseForType_(seasonType, "TEAM SCHEDULE"),
        groupId: requestedGroup,
        teamId: teamId,
        fetchMode: "TEAM_SCHEDULE"
      });
    });
    return requests;
  }

  let groupIds = [];
  if (requestedGroup) {
    groupIds = [requestedGroup];
  } else if (sportsV13IsCollegeLeague_(sport, league)) {
    if (coverageMode === "TOP_25") {
      groupIds = [];
    } else {
      groupIds = sportsV13SplitList_(setting.ESPNGroupIds);
      if (!groupIds.length) groupIds = sportsV13CollegeDefaultGroupIds_(sport, league);
    }
  } else if (setting.ESPNGroupIds) {
    groupIds = sportsV13SplitList_(setting.ESPNGroupIds);
  }

  function pushScoreboard_(groupId) {
    // Live/date-scoped score polling should stay intentionally small. ESPN's
    // edge can reject broad season-wide scoreboard requests from Apps Script
    // (for example ?season=2026&limit=500). When a concrete date is present,
    // the date is sufficient and we keep only group/limit where broad college
    // coverage actually needs them. Season filtering still happens locally in
    // sportsV16EventMatchesRequestedSeason_.
    const isDateScoped = !!espnDate;
    const params = isDateScoped
      ? {
          dates: espnDate,
          groups: groupId,
          limit: sportsV13IsCollegeLeague_(sport, league) ? resultLimit : ""
        }
      : {
          season: seasonYear,
          seasontype: seasonType,
          groups: groupId,
          limit: resultLimit
        };
    requests.push({
      url: sportsV13UrlWithParams_(cleanBase, params),
      sport: sport,
      league: league,
      source: groupId ? "ESPN_GROUP_SCOREBOARD" : "ESPN_SCOREBOARD",
      seasonYear: seasonYear,
      seasonType: seasonType,
      seasonPhase: seasonPhase || sportsV13SeasonPhaseForType_(seasonType, "SCOREBOARD"),
      groupId: groupId || "",
      teamId: "",
      fetchMode: "DATE_SCOREBOARD"
    });
  }

  if (groupIds.length) {
    groupIds.forEach(function(groupId) { pushScoreboard_(groupId); });
  } else {
    pushScoreboard_("");
  }

  return requests;
}

function sportsV13ExtractEvents_(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.events)) return payload.events;
  if (payload.events && Array.isArray(payload.events.items)) return payload.events.items;
  if (payload.team && Array.isArray(payload.team.events)) return payload.team.events;
  if (Array.isArray(payload.schedule)) return payload.schedule;
  if (payload.schedule && Array.isArray(payload.schedule.events)) return payload.schedule.events;
  if (payload.content && Array.isArray(payload.content.events)) return payload.content.events;
  if (payload.content && payload.content.sbData && Array.isArray(payload.content.sbData.events)) {
    return payload.content.sbData.events;
  }
  return [];
}

function sportsV13FetchJson_(url) {
  const requestUrl = sportsEspnRequestUrl_(url);
  const response = sportsEspnFetch_(url, {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Cache-Control": "no-cache"
    }
  });
  const statusCode = response.getResponseCode();
  const body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    const providerHint = statusCode === 403
      ? (requestUrl !== url
          ? " Cloudflare proxy reached the provider but the provider returned 403."
          : " Provider rejected the Apps Script fetch. Configure SPORTS_ESPN_PROXY_URL to route ESPN requests through Cloudflare.")
      : "";
    const transportHint = requestUrl !== url ? " via configured Cloudflare proxy" : " direct from Apps Script";
    throw new Error("ESPN fetch failed. HTTP status: " + statusCode + " URL: " + url + transportHint + providerHint + " Body: " + body.slice(0, 200));
  }
  return JSON.parse(body || "{}");
}

function sportsV13EventTeamIds_(event) {
  const competition = event && event.competitions && event.competitions.length ? event.competitions[0] : {};
  const competitors = competition.competitors || [];
  const home = competitors.find(function(team) { return team.homeAway === "home"; }) || {};
  const away = competitors.find(function(team) { return team.homeAway === "away"; }) || {};
  const homeTeam = home.team || {};
  const awayTeam = away.team || {};
  return {
    homeTeamId: homeTeam.id || home.id || "",
    awayTeamId: awayTeam.id || away.id || "",
    homeAbbreviation: homeTeam.abbreviation || homeTeam.shortDisplayName || "",
    awayAbbreviation: awayTeam.abbreviation || awayTeam.shortDisplayName || ""
  };
}

function sportsV13CollegeTeamMetaMap_() {
  if (sportsV13CollegeTeamMetaMap_.cache) return sportsV13CollegeTeamMetaMap_.cache;
  const map = {};
  const sheet = SpreadsheetApp.getActive().getSheetByName("SportsCollegeTeams");
  if (!sheet || sheet.getLastRow() <= 1) {
    sportsV13CollegeTeamMetaMap_.cache = map;
    return map;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(value) { return String(value || "").trim(); });
  const idCol = headers.indexOf("ESPNTeamId");
  const abbrCol = headers.indexOf("Abbreviation");
  const conferenceCol = headers.indexOf("ConferenceName");
  if (idCol === -1) {
    sportsV13CollegeTeamMetaMap_.cache = map;
    return map;
  }
  for (let i = 1; i < data.length; i++) {
    const teamId = String(data[i][idCol] || "").trim();
    if (!teamId) continue;
    map[teamId] = {
      abbreviation: abbrCol === -1 ? "" : String(data[i][abbrCol] || "").trim(),
      conferenceName: conferenceCol === -1 ? "" : String(data[i][conferenceCol] || "").trim()
    };
  }
  sportsV13CollegeTeamMetaMap_.cache = map;
  return map;
}

function sportsV13EventWeek_(event) {
  const candidates = [
    event && event.week && event.week.number,
    event && event.week && event.week.text,
    event && event.season && event.season.week
  ];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i] !== undefined && candidates[i] !== null && String(candidates[i]).trim() !== "") return candidates[i];
  }
  return "";
}

function sportsV13AttachMeta_(game, event, request) {
  const teamIds = sportsV13EventTeamIds_(event || {});
  game.HomeTeamId = teamIds.homeTeamId;
  game.AwayTeamId = teamIds.awayTeamId;
  game.HomeAbbreviation = teamIds.homeAbbreviation || "";
  game.AwayAbbreviation = teamIds.awayAbbreviation || "";
  game.HomeConferenceName = "";
  game.AwayConferenceName = "";
  if (sportsV13IsCollegeLeague_(game.Sport, game.League)) {
    const collegeMeta = sportsV13CollegeTeamMetaMap_();
    const homeMeta = collegeMeta[String(teamIds.homeTeamId || "")] || {};
    const awayMeta = collegeMeta[String(teamIds.awayTeamId || "")] || {};
    game.HomeAbbreviation = homeMeta.abbreviation || game.HomeAbbreviation;
    game.AwayAbbreviation = awayMeta.abbreviation || game.AwayAbbreviation;
    game.HomeConferenceName = homeMeta.conferenceName || "";
    game.AwayConferenceName = awayMeta.conferenceName || "";
  }
  game.SeasonYear = request.seasonYear || (event && event.season && event.season.year) || "";
  game.SeasonType = request.seasonType || (event && event.season && event.season.type) || "";
  game.SeasonPhase = request.seasonPhase || sportsV13SeasonPhaseForType_(game.SeasonType, "");
  game.Week = sportsV13EventWeek_(event || {});
  game.Source = request.source || "ESPN_SCOREBOARD";
  game.GroupId = request.groupId || "";
  game.TeamId = request.teamId || "";
  if (!game.GameDateTime && event && event.date) game.GameDateTime = event.date;
  return game;
}


function sportsV16FourDigitYear_(value) {
  const text = String(value || "").trim();
  const match = text.match(/(19\d{2}|20\d{2})/);
  return match ? Number(match[1]) : 0;
}

function sportsV16EventSeasonYear_(event) {
  return sportsV16FourDigitYear_(
    event && event.season && (
      event.season.year ||
      event.season.displayName ||
      event.season.name
    )
  );
}

function sportsV16EventDateYear_(event) {
  return sportsV16FourDigitYear_(
    event && (event.date || event.GameDateTime)
  );
}

function sportsV16IsCrossYearSeasonLeague_(sport, league) {
  sport = String(sport || "").toLowerCase();
  league = String(league || "").toLowerCase();

  return (
    sport === "football" ||
    sport === "basketball" ||
    sport === "hockey" ||
    league === "nfl" ||
    league === "college-football" ||
    league === "nba" ||
    league === "wnba" ||
    league === "nhl" ||
    league === "mens-college-basketball" ||
    league === "womens-college-basketball"
  );
}

function sportsV16EventMatchesRequestedSeason_(event, request) {
  request = request || {};

  const requestedYear =
    sportsV16FourDigitYear_(request.seasonYear);

  if (!requestedYear) {
    return true;
  }

  const eventSeasonYear =
    sportsV16EventSeasonYear_(event);

  if (eventSeasonYear && eventSeasonYear !== requestedYear) {
    return false;
  }

  const eventDateYear =
    sportsV16EventDateYear_(event);

  if (!eventDateYear) {
    return true;
  }

  if (eventDateYear === requestedYear) {
    return true;
  }

  if (
    sportsV16IsCrossYearSeasonLeague_(request.sport, request.league) &&
    eventDateYear === requestedYear + 1
  ) {
    return true;
  }

  return false;
}

function sportsV16SeasonSkipDetails_(event, request) {
  request = request || {};

  return {
    requestedSeasonYear: String(request.seasonYear || ""),
    requestedSeasonType: String(request.seasonType || ""),
    requestedWeek: String(request.week || ""),
    eventId: String(event && event.id || event && event.uid || ""),
    eventName: String(event && (event.name || event.shortName) || ""),
    eventSeasonYear: sportsV16EventSeasonYear_(event) || "",
    eventDateYear: sportsV16EventDateYear_(event) || "",
    eventDate: String(event && event.date || "")
  };
}

function fetchAndNormalizeESPNScoreboardFromSetting_(setting, dateString, options) {
  options = options || {};
  const requests = sportsV13BuildESPNRequests_(setting, dateString, options);
  const gamesById = {};

  requests.forEach(function(request) {
    const data = sportsV13FetchJson_(request.url);
    const events = sportsV13ExtractEvents_(data);

    let skippedWrongSeason = 0;
    const skippedSamples = [];

    events.forEach(function(event) {
      if (!sportsV16EventMatchesRequestedSeason_(event, request)) {
        skippedWrongSeason++;

        if (skippedSamples.length < 5) {
          skippedSamples.push(
            sportsV16SeasonSkipDetails_(event, request)
          );
        }

        return;
      }

      const game = sportsV13AttachMeta_(
        normalizeESPNEvent_(event, setting.Sport, setting.League),
        event,
        request
      );
      if (game && game.GameId) gamesById[game.GameId] = game;
    });

    if (skippedWrongSeason) {
      logSports_(
        "WARN",
        "fetchAndNormalizeESPNScoreboardFromSetting_",
        "Skipped ESPN events outside requested season",
        JSON.stringify({
          sport: request.sport,
          league: request.league,
          source: request.source,
          seasonYear: request.seasonYear,
          seasonType: request.seasonType,
          skippedWrongSeason: skippedWrongSeason,
          samples: skippedSamples
        })
      );
    }
  });

  return Object.keys(gamesById).map(function(gameId) { return gamesById[gameId]; });
}

function fetchAndNormalizeESPNScoreboard_(sport, league) {
  const setting = {
    Sport: String(sport || "").trim().toLowerCase(),
    League: String(league || "").trim().toLowerCase(),
    ESPNScoreboardUrl: getESPNScoreboardUrl_(sport, league),
    SeasonYear: String(new Date().getFullYear()),
    ScheduleSource: "HYBRID",
    CollegeCoverageMode: sportsV13IsCollegeLeague_(sport, league) ? "ALL_D1" : "DEFAULT",
    ESPNResultLimit: sportsV13IsCollegeLeague_(sport, league) ? 500 : 100,
    SavePeriodSnapshots: true
  };
  return fetchAndNormalizeESPNScoreboardFromSetting_(setting, "");
}

function upsertLatestSportsScores_(games) {
  games = games || [];
  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SCORES);
  if (!sh) throw new Error("Missing sheet: " + SPORTS_SHEETS.SCORES);

  sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.SCORES, SPORTS_HEADERS.SportsScores.concat(sportsV13ScoresExtraHeaders_()));
  sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.GAMES, sportsV13GamesHeaders_());
  applySportsRecordTextFormats_(SPORTS_SHEETS.SCORES);
  applySportsRecordTextFormats_(SPORTS_SHEETS.GAMES);

  const actualHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function(header) { return String(header).trim(); });
  const data = sh.getDataRange().getValues();
  const existingRowsByGameId = {};

  if (data.length > 1) {
    const headerMap = getSportsHeaderMap_(data[0]);
    for (let i = 1; i < data.length; i++) {
      const gameId = String(data[i][headerMap.GameId] || "").trim();
      if (gameId) existingRowsByGameId[gameId] = i + 1;
    }
  }

  games.forEach(function(game) {
    const row = actualHeaders.map(function(header) {
      if (header === "HomeRecord" || header === "AwayRecord") {
        return cleanSportsRecordValue_(game[header]);
      }
      if (header === "Clock" || header === "SportsClock") {
        return cleanSportsClockDisplayValue_(game[header]);
      }
      return game[header] !== undefined ? game[header] : "";
    });
    const existingRow = existingRowsByGameId[game.GameId];
    if (existingRow) {
      sh.getRange(existingRow, 1, 1, actualHeaders.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }
  });

  upsertSportsGamesFromScores_(games);
}

function sportsV13PhaseDescriptor_(phase, startDate, endDate, seasonType, enabled, options) {
  return {
    phase: phase,
    startDate: normalizeSportsDateOnly_(startDate),
    endDate: normalizeSportsDateOnly_(endDate),
    seasonType: String(seasonType || "").trim(),
    enabled: enabled !== false,
    source: options && options.source ? options.source : "ESPN_SEASON_TYPE",
    fetchMode: options && options.fetchMode ? options.fetchMode : "DATE_SCOREBOARD",
    groupId: options && options.groupId ? options.groupId : "",
    teamId: options && options.teamId ? options.teamId : ""
  };
}

/* Removed earlier duplicate function sportsV13BuildSeasonJobDescriptors_ during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function createSportsSeasonJobsForDateRange_ during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function runSportsSeasonJobBatch_ during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function checkSportsEngineStatus during production cleanup; final definition retained later in file. */


/************************************
 ADMIN SCORE REFRESH + DISPLAY REPAIR ROUTES
 These actions are called from the Awards App Sports Controls bridge.
************************************/

function apiRefreshSportsScoresNowAdmin_(params) {

  assertSportsAdmin_(
    params || {}
  );

  const result =
    runSportsScoresUpdate(
      true
    );

  result.action =
    "refreshSportsScoresNowAdmin";

  return result;

}

function apiRefreshSportsScoresWindowAdmin_(params) {

  params =
    params || {};

  assertSportsAdmin_(
    params
  );

  const daysBack =
    Math.max(
      0,
      Math.min(
        14,
        Number(params.daysBack || 2)
      )
    );

  const daysForward =
    Math.max(
      0,
      Math.min(
        30,
        Number(params.daysForward || 7)
      )
    );

  const result =
    runSportsScoresDateWindowUpdate_(
      daysBack,
      daysForward
    );

  result.action =
    "refreshSportsScoresWindowAdmin";

  return result;

}

function apiRepairSportsScoreDisplayAdmin_(params) {

  assertSportsAdmin_(
    params || {}
  );

  return repairSportsScoreDisplayAdmin_();

}

function repairSportsScoreDisplayAdmin_() {

  const summary = {
    success: true,
    repaired: 0,
    sheets: []
  };

  [
    SPORTS_SHEETS.SCORES,
    SPORTS_SHEETS.GAMES,
    SPORTS_SHEETS.SNAPSHOTS,
    "SportsScoresArchive",
    "SportsSnapshotsArchive"
  ].forEach(function(sheetName) {

    const result =
      repairSportsScoreDisplaySheet_(
        sheetName
      );

    summary.sheets.push(
      result
    );

    summary.repaired +=
      result.repaired || 0;

  });

  logSports_(
    "INFO",
    "repairSportsScoreDisplayAdmin",
    "Sports score display repair complete",
    JSON.stringify(summary)
  );

  return summary;

}

function repairSportsScoreDisplaySheet_(sheetName) {

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(
      sheetName
    );

  if (!sh || sh.getLastRow() < 2) {
    return {
      sheet: sheetName,
      repaired: 0,
      rowsChecked: 0,
      skipped: !sh
    };
  }

  const values =
    sh.getDataRange()
      .getValues();

  const headers =
    values[0]
      .map(function(header) {
        return String(header || "").trim();
      });

  const col =
    getSportsHeaderMap_(
      headers
    );

  const columnsToCheck = [
    { name: "HomeRecord", type: "record" },
    { name: "AwayRecord", type: "record" },
    { name: "Clock", type: "clock" },
    { name: "SportsClock", type: "clock" }
  ].filter(function(item) {
    return col[item.name] !== undefined;
  });

  if (!columnsToCheck.length) {
    return {
      sheet: sheetName,
      repaired: 0,
      rowsChecked: values.length - 1,
      message: "No display columns found"
    };
  }

  let repaired = 0;

  for (let r = 1; r < values.length; r++) {

    columnsToCheck.forEach(function(item) {

      const c =
        col[item.name];

      const rawCurrent =
        values[r][c];

      const current =
        String(rawCurrent || "").trim();

      if (!current && !rawCurrent) {
        return;
      }

      let next =
        current;

      if (item.type === "record") {
        next =
          cleanSportsRecordValue_(
            rawCurrent
          );
      }

      if (item.type === "clock") {
        next =
          cleanSportsClockDisplayValue_(
            rawCurrent
          );
      }

      if (next !== current) {
        values[r][c] =
          next;
        repaired++;
      }

    });

  }

  if (repaired) {
    applySportsRecordTextFormats_(sheetName);
    sh.getRange(
      1,
      1,
      values.length,
      headers.length
    ).setValues(
      values
    );
  }

  return {
    sheet: sheetName,
    repaired: repaired,
    rowsChecked: values.length - 1
  };

}

function cleanSportsClockDisplayValue_(value) {

  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value.getTime())
  ) {
    return "";
  }

  value =
    String(value || "")
      .trim()
      .replace(/^'/, "");

  if (!value) {
    return "";
  }

  if (isSportsDateLikeDisplayValue_(value)) {
    return "";
  }

  return value;

}

function isSportsDateLikeDisplayValue_(value) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return false;
  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) {
    return true;
  }

  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value)) {
    return true;
  }

  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(value)) {
    return true;
  }

  if (
    /\b(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/i.test(value) ||
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i.test(value)
  ) {
    return true;
  }

  return false;

}



/************************************
 PATCH v14
 NFL / FOOTBALL ESPN WEEK SCOREBOARD SCHEDULE BUILDER

 Why this exists:
 - Football schedules are not reliable when built by date + seasontype only.
 - ESPN football schedules are week based. NFL preseason, regular season,
   and postseason need season + seasontype + week pulls.
 - This patch keeps manual/date behavior for non-football leagues, but uses
   week scoreboard jobs for NFL and college-football season-type builds.
************************************/

function sportsV14IsFootballWeekScheduleLeague_(setting) {
  const sport = String(setting && setting.Sport || "").trim().toLowerCase();
  const league = String(setting && setting.League || "").trim().toLowerCase();
  return sport === "football" && (league === "nfl" || league === "college-football");
}

function sportsV14DefaultWeeksForSeasonType_(setting, seasonType, phase) {
  const league = String(setting && setting.League || "").trim().toLowerCase();
  const type = String(seasonType || "").trim();
  const phaseName = String(phase || "").trim().toUpperCase();

  if (league === "nfl") {
    if (type === "1" || phaseName === "PRESEASON") return [1, 2, 3, 4];
    if (type === "2" || phaseName === "REGULAR SEASON") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    if (type === "3" || phaseName === "POSTSEASON") return [1, 2, 3, 4, 5];
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  }

  if (league === "college-football") {
    if (type === "1" || phaseName === "PRESEASON") return [];
    if (type === "2" || phaseName === "REGULAR SEASON") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    if (type === "3" || phaseName === "POSTSEASON" || phaseName === "BOWL") return [1, 2, 3, 4, 5, 6, 7, 8];
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  }

  return [];
}

function sportsV14ExpandFootballWeekDescriptors_(setting, descriptors) {
  if (!sportsV14IsFootballWeekScheduleLeague_(setting)) return descriptors;

  const expanded = [];

  descriptors.forEach(function(desc) {
    const weeks = sportsV14DefaultWeeksForSeasonType_(setting, desc.seasonType, desc.phase);

    if (!weeks.length) {
      expanded.push(desc);
      return;
    }

    weeks.forEach(function(week) {
      const copy = Object.assign({}, desc);
      copy.source = "ESPN_WEEK_SCOREBOARD";
      copy.fetchMode = "WEEK_SCOREBOARD";
      copy.espnWeek = week;
      expanded.push(copy);
    });
  });

  return expanded;
}

function sportsV13SeasonJobExtraHeaders_() {
  return [
    "SeasonYear",
    "SeasonType",
    "SeasonPhase",
    "Source",
    "GroupId",
    "TeamId",
    "FetchMode",
    "ESPNWeek"
  ];
}

function setupSportsSeasonJobsSheet() {
  const headers = SPORTS_SEASON_JOB_HEADERS.concat(sportsV13SeasonJobExtraHeaders_());
  const result = sportsV13EnsureSheetHeaders_(SPORTS_SEASON_JOBS_SHEET, headers);
  logSports_("INFO", "setupSportsSeasonJobsSheet", "SportsSeasonJobs setup complete", JSON.stringify({ added: result.added || [] }));
  return { success: true, sheet: SPORTS_SEASON_JOBS_SHEET, added: result.added || [] };
}

function ensureSportsSeasonJobColumns_() {
  const headers = SPORTS_SEASON_JOB_HEADERS.concat(sportsV13SeasonJobExtraHeaders_());
  const result = sportsV13EnsureSheetHeaders_(SPORTS_SEASON_JOBS_SHEET, headers);
  return { success: true, added: result.added || [] };
}

function sportsV14BuildESPNWeekRequests_(setting, seasonYear, seasonType, week, options) {
  options = options || {};

  const sport = String(setting.Sport || options.sport || "").trim().toLowerCase();
  const league = String(setting.League || options.league || "").trim().toLowerCase();
  const baseRaw = setting.ESPNScoreboardUrl || getESPNScoreboardUrl_(sport, league);
  const cleanBase = sportsV13UrlWithoutParams_(baseRaw, ["dates", "groups", "limit", "seasontype", "season", "week", "team"]);
  const requestedGroup = String(options.GroupId || options.groupId || "").trim();
  const seasonPhase = String(options.SeasonPhase || options.seasonPhase || sportsV13SeasonPhaseForType_(seasonType, "")).trim();
  const coverageMode = String(setting.CollegeCoverageMode || "DEFAULT").trim().toUpperCase();
  const resultLimit = Number(setting.ESPNResultLimit || 0) || (sportsV13IsCollegeLeague_(sport, league) ? 500 : 100);

  let groupIds = [];

  if (requestedGroup) {
    groupIds = [requestedGroup];
  } else if (sportsV13IsCollegeLeague_(sport, league)) {
    if (coverageMode === "TOP_25") {
      groupIds = [];
    } else {
      groupIds = sportsV13SplitList_(setting.ESPNGroupIds);
      if (!groupIds.length) groupIds = sportsV13CollegeDefaultGroupIds_(sport, league);
    }
  } else if (setting.ESPNGroupIds) {
    groupIds = sportsV13SplitList_(setting.ESPNGroupIds);
  }

  const requests = [];

  function pushWeekScoreboard_(groupId) {
    const params = {
      season: seasonYear,
      seasontype: seasonType,
      week: week,
      groups: groupId,
      limit: resultLimit
    };

    requests.push({
      url: sportsV13UrlWithParams_(cleanBase, params),
      sport: sport,
      league: league,
      source: groupId ? "ESPN_GROUP_WEEK_SCOREBOARD" : "ESPN_WEEK_SCOREBOARD",
      seasonYear: String(seasonYear || ""),
      seasonType: String(seasonType || ""),
      seasonPhase: seasonPhase || sportsV13SeasonPhaseForType_(seasonType, "SCOREBOARD"),
      groupId: groupId || "",
      teamId: "",
      week: week,
      fetchMode: "WEEK_SCOREBOARD"
    });
  }

  if (groupIds.length) {
    groupIds.forEach(function(groupId) { pushWeekScoreboard_(groupId); });
  } else {
    pushWeekScoreboard_("");
  }

  return requests;
}

function fetchAndNormalizeESPNWeekScoreboardFromSetting_(setting, seasonYear, seasonType, week, options) {
  options = options || {};

  const requests = sportsV14BuildESPNWeekRequests_(setting, seasonYear, seasonType, week, options);
  const gamesById = {};

  requests.forEach(function(request) {
    const data = sportsV13FetchJson_(request.url);
    const events = sportsV13ExtractEvents_(data);

    let skippedWrongSeason = 0;
    const skippedSamples = [];

    events.forEach(function(event) {
      if (!sportsV16EventMatchesRequestedSeason_(event, request)) {
        skippedWrongSeason++;

        if (skippedSamples.length < 5) {
          skippedSamples.push(
            sportsV16SeasonSkipDetails_(event, request)
          );
        }

        return;
      }

      const game = sportsV13AttachMeta_(
        normalizeESPNEvent_(event, setting.Sport, setting.League),
        event,
        request
      );

      if (game && !game.Week) game.Week = request.week || "";
      if (game && game.GameId) gamesById[game.GameId] = game;
    });

    if (skippedWrongSeason) {
      logSports_(
        "WARN",
        "fetchAndNormalizeESPNWeekScoreboardFromSetting_",
        "Skipped ESPN week events outside requested season",
        JSON.stringify({
          sport: request.sport,
          league: request.league,
          source: request.source,
          seasonYear: request.seasonYear,
          seasonType: request.seasonType,
          week: request.week,
          skippedWrongSeason: skippedWrongSeason,
          samples: skippedSamples
        })
      );
    }
  });

  return Object.keys(gamesById).map(function(gameId) { return gamesById[gameId]; });
}

function sportsV13BuildSeasonJobDescriptors_(setting, startDate, endDate, options) {
  options = options || {};
  const source = sportsV13Upper_(options.scheduleSource || setting.ScheduleSource || "HYBRID", "HYBRID");
  const descriptors = [];
  const manualOnly = source === "MANUAL" || setting.ESPNSeasonTypesEnabled === false;
  const seasonYear = String(options.seasonYear || setting.SeasonYear || sportsV13SeasonYear_(setting.SeasonTitle, new Date().getFullYear()));
  const selectedTeams = sportsV13SplitList_(setting.SelectedTeamIds);
  const useTeamSchedule = String(setting.CollegeCoverageMode || "").toUpperCase() === "SELECTED_SCHOOLS" && selectedTeams.length;

  if (manualOnly) {
    descriptors.push(sportsV13PhaseDescriptor_("MANUAL DATES", startDate, endDate, "", true, { source: "MANUAL_DATES", fetchMode: "DATE_SCOREBOARD" }));
  } else {
    if (setting.PreseasonEnabled) {
      descriptors.push(sportsV13PhaseDescriptor_("PRESEASON", setting.PreseasonStartDate || startDate, setting.PreseasonEndDate || endDate, setting.ESPNPreseasonType || 1, true));
    }

    descriptors.push(sportsV13PhaseDescriptor_("REGULAR SEASON", setting.RegularSeasonStartDate || setting.SeasonStartDate || startDate, setting.RegularSeasonEndDate || setting.SeasonEndDate || endDate, setting.ESPNRegularSeasonType || 2, true));

    if (setting.PostseasonEnabled) {
      descriptors.push(sportsV13PhaseDescriptor_("POSTSEASON", setting.PostseasonStartDate || startDate, setting.PostseasonEndDate || endDate, setting.ESPNPostseasonType || 3, true));
    }

    if (setting.TournamentEnabled) {
      descriptors.push(sportsV13PhaseDescriptor_("TOURNAMENT", setting.TournamentStartDate || startDate, setting.TournamentEndDate || endDate, setting.ESPNTournamentType || setting.ESPNPostseasonType || 3, true));
    }

    if (setting.BowlEnabled) {
      descriptors.push(sportsV13PhaseDescriptor_("BOWL", setting.BowlStartDate || startDate, setting.BowlEndDate || endDate, setting.ESPNBowlType || setting.ESPNPostseasonType || 3, true));
    }
  }

  let activeDescriptors = descriptors.filter(function(item) { return item.enabled && item.startDate && item.endDate; });

  if (!activeDescriptors.length) {
    activeDescriptors = [sportsV13PhaseDescriptor_("FULL SEASON", startDate, endDate, setting.ESPNRegularSeasonType || 2, true)];
  }

  if (!manualOnly && !useTeamSchedule) {
    activeDescriptors = sportsV14ExpandFootballWeekDescriptors_(setting, activeDescriptors);
  }

  if (useTeamSchedule) {
    const expanded = [];

    activeDescriptors.forEach(function(desc) {
      selectedTeams.forEach(function(teamId) {
        const copy = Object.assign({}, desc);
        copy.source = "ESPN_TEAM_SCHEDULE";
        copy.fetchMode = "TEAM_SCHEDULE";
        copy.teamId = teamId;
        expanded.push(copy);
      });
    });

    activeDescriptors = expanded;
  }

  activeDescriptors.forEach(function(item) {
    item.seasonYear = seasonYear;
  });

  return activeDescriptors;
}

function createSportsSeasonJobsForDateRange_(startDate, endDate, batchDays, options) {
  setupSportsSeasonJobsSheet();

  startDate = normalizeSportsDateOnly_(startDate);
  endDate = normalizeSportsDateOnly_(endDate);
  batchDays = Number(batchDays || 14);
  options = options || {};

  const targetLeague = String(options.league || "").trim().toLowerCase();
  const targetSport = String(options.sport || "").trim().toLowerCase();
  const customSeasonName = String(options.seasonName || options.season || "").trim();

  if (!startDate || !endDate) throw new Error("StartDate and EndDate are required");
  if (startDate > endDate) throw new Error("StartDate cannot be after EndDate");

  let settings = readEnabledSportsSettings_();
  if (targetLeague) settings = settings.filter(function(setting) { return String(setting.League || "").toLowerCase() === targetLeague; });
  if (targetSport) settings = settings.filter(function(setting) { return String(setting.Sport || "").toLowerCase() === targetSport; });

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SEASON_JOBS_SHEET);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(function(header) { return String(header).trim(); });
  const col = getSportsHeaderMap_(headers);
  const existing = {};

  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const key = [
        String(data[i][col.Sport] || "").toLowerCase(),
        String(data[i][col.League] || "").toLowerCase(),
        normalizeSportsDateOnly_(data[i][col.StartDate]),
        normalizeSportsDateOnly_(data[i][col.EndDate]),
        col.SeasonType === undefined ? "" : String(data[i][col.SeasonType] || ""),
        col.SeasonPhase === undefined ? "" : String(data[i][col.SeasonPhase] || ""),
        col.GroupId === undefined ? "" : String(data[i][col.GroupId] || ""),
        col.TeamId === undefined ? "" : String(data[i][col.TeamId] || ""),
        col.ESPNWeek === undefined ? "" : String(data[i][col.ESPNWeek] || "")
      ].join("|");

      existing[key] = i + 1;
    }
  }

  let supersededJobs = 0;

  if (targetLeague) {
    const targetPairs = {};

    settings.forEach(function(setting) {
      targetPairs[
        String(setting.Sport || "").toLowerCase() + "|" +
        String(setting.League || "").toLowerCase()
      ] = true;
    });

    for (let i = 1; i < data.length; i++) {
      const pairKey =
        String(data[i][col.Sport] || "").toLowerCase() + "|" +
        String(data[i][col.League] || "").toLowerCase();

      if (!targetPairs[pairKey]) {
        continue;
      }

      const currentStatus =
        String(data[i][col.Status] || "").trim().toUpperCase();

      if (currentStatus === "SUPERSEDED") {
        continue;
      }

      updateSportsSeasonJobRow_(
        sh,
        headers,
        i + 1,
        {
          Status: "SUPERSEDED",
          Errors: "Superseded by Build Schedule rebuild on " + new Date(),
          CompletedAt: new Date()
        }
      );

      supersededJobs++;
    }
  }

  const newRows = [];
  let updatedJobs = 0;
  let descriptorsCount = 0;
  let weekJobs = 0;

  settings.forEach(function(setting) {
    const descriptors = sportsV13BuildSeasonJobDescriptors_(setting, startDate, endDate, options);
    descriptorsCount += descriptors.length;

    descriptors.forEach(function(desc) {
      if (String(desc.fetchMode || "").toUpperCase() === "WEEK_SCOREBOARD") weekJobs++;

      const key = [
        String(setting.Sport || "").toLowerCase(),
        String(setting.League || "").toLowerCase(),
        desc.startDate,
        desc.endDate,
        String(desc.seasonType || ""),
        String(desc.phase || ""),
        String(desc.groupId || ""),
        String(desc.teamId || ""),
        String(desc.espnWeek || "")
      ].join("|");

      const seasonName = customSeasonName || setting.SeasonTitle || (setting.League + " " + desc.seasonYear);
      const patch = {
        SeasonName: seasonName + (desc.phase ? " - " + desc.phase : "") + (desc.espnWeek ? " Week " + desc.espnWeek : ""),
        StartDate: desc.startDate,
        EndDate: desc.endDate,
        NextDate: desc.startDate,
        BatchDays: batchDays,
        Status: "ACTIVE",
        LastRun: "",
        DaysProcessed: 0,
        GamesFetched: 0,
        UniqueGames: 0,
        Errors: "",
        CompletedAt: "",
        SeasonYear: desc.seasonYear,
        SeasonType: desc.seasonType,
        SeasonPhase: desc.phase,
        Source: desc.source,
        GroupId: desc.groupId || "",
        TeamId: desc.teamId || "",
        FetchMode: desc.fetchMode || "DATE_SCOREBOARD",
        ESPNWeek: desc.espnWeek || ""
      };

      if (existing[key]) {
        updateSportsSeasonJobRow_(sh, headers, existing[key], patch);
        updatedJobs++;
        return;
      }

      const rowObj = Object.assign({
        JobId: Utilities.getUuid(),
        Sport: setting.Sport,
        League: setting.League,
        CreatedAt: new Date()
      }, patch);

      newRows.push(headers.map(function(header) { return rowObj[header] !== undefined ? rowObj[header] : ""; }));
    });
  });

  if (newRows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  }

  const message = "Schedule jobs ready. New jobs: " + newRows.length + ", updated jobs: " + updatedJobs + ", superseded old jobs: " + supersededJobs + ", phases/team/week jobs: " + descriptorsCount + ", football week jobs: " + weekJobs + ".";
  logSports_("INFO", "createSportsSeasonJobsForDateRange_", message, JSON.stringify({ startDate: startDate, endDate: endDate, batchDays: batchDays, newJobs: newRows.length, updatedJobs: updatedJobs, supersededJobs: supersededJobs, weekJobs: weekJobs, enabledLeagues: settings.length, league: targetLeague || "ALL", scheduleSource: options.scheduleSource || "" }));

  return {
    success: true,
    startDate: startDate,
    endDate: endDate,
    batchDays: batchDays,
    newJobs: newRows.length,
    updatedJobs: updatedJobs,
    supersededJobs: supersededJobs,
    weekJobs: weekJobs,
    enabledLeagues: settings.length,
    league: targetLeague || "ALL",
    message: message
  };
}

function runSportsSeasonJobBatch_(job, setting, previousScores, remainingFetchBudget) {
  const fetchMode = String(job.FetchMode || "DATE_SCOREBOARD").toUpperCase();
  const gamesById = {};
  const errors = [];
  let dateFetchesUsed = 0;
  let daysProcessed = 0;
  let gamesFetched = 0;

  function addGames_(games) {
    games.forEach(function(game) { gamesById[game.GameId] = game; });
    gamesFetched += games.length;
  }

  if (fetchMode === "WEEK_SCOREBOARD") {
    try {
      addGames_(fetchAndNormalizeESPNWeekScoreboardFromSetting_(setting, job.SeasonYear, job.SeasonType, job.ESPNWeek, {
        SeasonPhase: job.SeasonPhase,
        GroupId: job.GroupId,
        FetchMode: "WEEK_SCOREBOARD"
      }));
    } catch (err) {
      errors.push({ sport: job.Sport, league: job.League, seasonYear: job.SeasonYear || "", seasonType: job.SeasonType || "", week: job.ESPNWeek || "", error: err && err.message ? err.message : String(err) });
    }

    dateFetchesUsed = 1;
    daysProcessed = 1;
  } else if (fetchMode === "TEAM_SCHEDULE") {
    try {
      addGames_(fetchAndNormalizeESPNScoreboardFromSetting_(setting, "", {
        SeasonYear: job.SeasonYear,
        SeasonType: job.SeasonType,
        SeasonPhase: job.SeasonPhase,
        TeamId: job.TeamId,
        GroupId: job.GroupId,
        FetchMode: "TEAM_SCHEDULE"
      }));
    } catch (err) {
      errors.push({ sport: job.Sport, league: job.League, teamId: job.TeamId, error: err && err.message ? err.message : String(err) });
    }

    dateFetchesUsed = 1;
    daysProcessed = 1;
  } else {
    const batchDays = Math.max(1, Number(job.BatchDays || 1));
    const daysToProcess = Math.min(batchDays, remainingFetchBudget);
    let currentDate = normalizeSportsDateOnly_(job.NextDate || job.StartDate);
    const endDate = normalizeSportsDateOnly_(job.EndDate);

    for (let i = 0; i < daysToProcess; i++) {
      if (currentDate > endDate) break;

      try {
        addGames_(fetchAndNormalizeESPNScoreboardFromSetting_(setting, currentDate, {
          SeasonYear: job.SeasonYear,
          SeasonType: job.SeasonType,
          SeasonPhase: job.SeasonPhase,
          GroupId: job.GroupId,
          FetchMode: job.FetchMode || "DATE_SCOREBOARD"
        }));
      } catch (err) {
        errors.push({ sport: job.Sport, league: job.League, date: currentDate, seasonType: job.SeasonType || "", phase: job.SeasonPhase || "", error: err && err.message ? err.message : String(err) });
      }

      dateFetchesUsed++;
      daysProcessed++;
      currentDate = addSportsDays_(currentDate, 1);
    }

    job._nextDateAfterRun = currentDate;
  }

  const allGames = Object.keys(gamesById).map(function(gameId) { return gamesById[gameId]; });

  if (allGames.length) {
    detectAndSaveSportsSnapshots_(previousScores, allGames);
    upsertLatestSportsScores_(allGames);
  }

  const nextDate = job._nextDateAfterRun || "";
  const completed = fetchMode === "TEAM_SCHEDULE" || fetchMode === "WEEK_SCOREBOARD" ? true : (nextDate > normalizeSportsDateOnly_(job.EndDate));

  updateSportsSeasonJob_(job.JobId, {
    NextDate: completed ? "" : nextDate,
    Status: completed ? "COMPLETE" : "ACTIVE",
    LastRun: new Date(),
    DaysProcessed: Number(job.DaysProcessed || 0) + daysProcessed,
    GamesFetched: Number(job.GamesFetched || 0) + gamesFetched,
    UniqueGames: Number(job.UniqueGames || 0) + allGames.length,
    Errors: errors.length ? JSON.stringify(errors) : job.Errors || "",
    CompletedAt: completed ? new Date() : job.CompletedAt || ""
  });

  return { dateFetchesUsed: dateFetchesUsed, daysProcessed: daysProcessed, gamesFetched: gamesFetched, uniqueGames: allGames.length, errors: errors };
}


/************************************
 PRODUCTION CLEANUP v14
 - Adds missing score-window trigger admin routes.
 - Keeps racing out of the Sports Scores Engine active loop; racing remains in the separate racing-score-engine project.
 - Disables existing racing settings rows without deleting historical sheets.
************************************/

function sportsScoresWindowTriggerFunction_() {
  return "runSportsScoresWindowUpdate";
}

function installSportsScoresWindowTrigger() {
  removeSportsScoresWindowTriggers();

  ScriptApp
    .newTrigger(sportsScoresWindowTriggerFunction_())
    .timeBased()
    .everyHours(1)
    .create();

  logSports_(
    "INFO",
    "installSportsScoresWindowTrigger",
    "Installed score window trigger",
    JSON.stringify({ functionName: sportsScoresWindowTriggerFunction_(), everyHours: 1 })
  );

  return {
    success: true,
    message: "Score window trigger installed. It refreshes a small yesterday/today/upcoming window once per hour."
  };
}

function removeSportsScoresWindowTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;

  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === sportsScoresWindowTriggerFunction_()) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  logSports_(
    "INFO",
    "removeSportsScoresWindowTriggers",
    "Removed score window triggers",
    JSON.stringify({ removed: removed })
  );

  return {
    success: true,
    removed: removed
  };
}

function checkSportsScoresWindowTriggers() {
  return ScriptApp.getProjectTriggers()
    .filter(function(trigger) {
      return trigger.getHandlerFunction() === sportsScoresWindowTriggerFunction_();
    })
    .map(function(trigger) {
      return {
        handler: trigger.getHandlerFunction(),
        eventType: String(trigger.getEventType()),
        source: String(trigger.getTriggerSource())
      };
    });
}

function sportsScoresDisableRacingSettingsRows_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (!sh || sh.getLastRow() <= 1) return { success: true, disabled: 0 };

  const data = sh.getDataRange().getValues();
  const col = getSportsHeaderMap_(data[0]);
  if (col.Sport === undefined || col.Enabled === undefined) return { success: true, disabled: 0 };

  let disabled = 0;
  for (let i = 1; i < data.length; i++) {
    const sport = String(data[i][col.Sport] || "").trim().toLowerCase();
    if (sport === "racing" && normalizeSportsBoolean_(data[i][col.Enabled])) {
      sh.getRange(i + 1, col.Enabled + 1).setValue(false);
      disabled++;
    }
  }

  if (disabled) {
    logSports_(
      "INFO",
      "sportsScoresDisableRacingSettingsRows_",
      "Disabled racing rows in SportsSettings because racing now belongs to the separate Racing Score Engine.",
      JSON.stringify({ disabled: disabled })
    );
  }

  return { success: true, disabled: disabled };
}

function sportsScoresFilterOutRacingSettings_(settings, includeDisabled) {
  return (settings || []).filter(function(setting) {
    const sport = String(setting.Sport || "").trim().toLowerCase();
    return sport !== "racing";
  });
}

function addMmaAndSoccerSettings() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (!sh) throw new Error("Missing sheet: " + SPORTS_SHEETS.SETTINGS);

  /*
    Soccer competition library.

    The first group preserves the previously enabled competitions. New library
    rows start disabled so Smart Sports Sync does not fan out across dozens of
    endpoints until an admin explicitly enables the leagues they want.

    Any additional ESPN soccer competition can still be added to SportsSettings
    without changing parser code; soccer player/team stats are league-generic.
  */
  const soccerCompetitions = [
    ["usa.1", true],
    ["eng.1", true],
    ["esp.1", true],
    ["mex.1", true],
    ["ita.1", true],
    ["ger.1", true],
    ["fra.1", true],
    ["uefa.champions", true],
    ["uefa.europa", true],
    ["uefa.nations", true],
    ["fifa.world", true],

    ["eng.2", false],
    ["ned.1", false],
    ["por.1", false],
    ["sco.1", false],
    ["bra.1", false],
    ["arg.1", false],
    ["usa.nwsl", false],
    ["eng.w.1", false],
    ["uefa.wchampions", false],
    ["fifa.wwc", false],
    ["uefa.europa.conf", false],
    ["concacaf.champions", false],
    ["conmebol.libertadores", false],
    ["conmebol.sudamericana", false],
    ["fifa.cwc", false],
    ["club.friendly", false],
    ["fifa.friendly", false]
  ];

  const rowsToAdd = soccerCompetitions.map(function(item) {
    const league = item[0];
    const enabled = item[1];
    return [
      "soccer",
      league,
      enabled,
      60,
      2,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/" + league + "/scoreboard"
    ];
  });

  rowsToAdd.push([
    "mma",
    "ufc",
    true,
    720,
    5,
    1440,
    true,
    "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"
  ]);

  const data = sh.getDataRange().getValues();
  const existingKeys = {};

  if (data.length > 1) {
    const col = getSportsHeaderMap_(data[0]);
    for (let i = 1; i < data.length; i++) {
      const sport = String(data[i][col.Sport] || "").trim().toLowerCase();
      const league = String(data[i][col.League] || "").trim().toLowerCase();
      if (sport && league) existingKeys[sport + "|" + league] = true;
    }
  }

  const newRows = rowsToAdd.filter(function(row) {
    return !existingKeys[String(row[0]).toLowerCase() + "|" + String(row[1]).toLowerCase()];
  });

  if (newRows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  sportsScoresDisableRacingSettingsRows_();

  return {
    success: true,
    added: newRows.length,
    soccerCompetitionsAvailable: soccerCompetitions.length,
    message: "Expanded soccer competition library checked. Newly added competitions start Off; enable and sync only the leagues you want."
  };
}

function addExtraSportsSettings() {
  const result = addMmaAndSoccerSettings();
  return {
    success: true,
    added: result.added,
    message: "Extra non-racing sports settings checked."
  };
}

// Final production override: same logic as v13 readEnabledSportsSettings_, plus skip racing settings.
function readEnabledSportsSettings_(includeDisabled) {
  ensureSportsControlsV12SettingsColumns_();

  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (!sh) throw new Error("Missing sheet: " + SPORTS_SHEETS.SETTINGS);

  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(function(header) { return String(header || "").trim(); });
  const col = getSportsHeaderMap_(headers);
  validateSportsSettingsColumns_(col);

  const settings = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const enabled = normalizeSportsBoolean_(sportsV13Value_(row, col, "Enabled", false));
    if (!enabled && !includeDisabled) continue;

    const sport = String(sportsV13Value_(row, col, "Sport", "")).trim().toLowerCase();
    const league = String(sportsV13Value_(row, col, "League", "")).trim().toLowerCase();
    const url = String(sportsV13Value_(row, col, "ESPNScoreboardUrl", "")).trim();

    if (sport === "racing") continue;

    if (!sport || !league || !url) {
      logSports_("WARN", "readEnabledSportsSettings_", "Skipping incomplete sports setting row", JSON.stringify({ row: i + 1, sport: sport, league: league, url: url }));
      continue;
    }

    const seasonTitle = String(sportsV13Value_(row, col, "SeasonTitle", league.toUpperCase())).trim();
    const seasonYear = sportsV13SeasonYear_(sportsV13Value_(row, col, "SeasonYear", seasonTitle), new Date().getFullYear());

    const setting = {
      Sport: sport,
      League: league,
      Enabled: enabled,
      PollPreGameMinutes: sportsV12PositiveNumber_(sportsV13Value_(row, col, "PollPreGameMinutes", 30), 30),
      PollLiveMinutes: sportsV12PositiveNumber_(sportsV13Value_(row, col, "PollLiveMinutes", 1), 1),
      PollFinalMinutes: sportsV12PositiveNumber_(sportsV13Value_(row, col, "PollFinalMinutes", 60), 60),
      SavePeriodSnapshots: normalizeSportsBoolean_(sportsV13Value_(row, col, "SavePeriodSnapshots", true)),
      ESPNScoreboardUrl: url,
      SeasonTitle: seasonTitle,
      SeasonYear: seasonYear,
      ScheduleSource: sportsV13Upper_(sportsV13Value_(row, col, "ScheduleSource", "HYBRID"), "HYBRID"),
      ESPNSeasonTypesEnabled: normalizeSportsBoolean_(sportsV13Value_(row, col, "ESPNSeasonTypesEnabled", true)),
      ESPNPreseasonType: sportsV13Value_(row, col, "ESPNPreseasonType", 1) || 1,
      ESPNRegularSeasonType: sportsV13Value_(row, col, "ESPNRegularSeasonType", 2) || 2,
      ESPNPostseasonType: sportsV13Value_(row, col, "ESPNPostseasonType", 3) || 3,
      ESPNTournamentType: sportsV13Value_(row, col, "ESPNTournamentType", 3) || 3,
      ESPNBowlType: sportsV13Value_(row, col, "ESPNBowlType", 3) || 3,
      CollegeCoverageMode: sportsV13Upper_(sportsV13Value_(row, col, "CollegeCoverageMode", sportsV13IsCollegeLeague_(sport, league) ? "ALL_D1" : "DEFAULT"), sportsV13IsCollegeLeague_(sport, league) ? "ALL_D1" : "DEFAULT"),
      ESPNGroupIds: String(sportsV13Value_(row, col, "ESPNGroupIds", "")).trim(),
      ESPNResultLimit: sportsV12PositiveNumber_(sportsV13Value_(row, col, "ESPNResultLimit", sportsV13IsCollegeLeague_(sport, league) ? 500 : 100), sportsV13IsCollegeLeague_(sport, league) ? 500 : 100),
      SelectedTeamIds: String(sportsV13Value_(row, col, "SelectedTeamIds", "")).trim(),
      SeasonStartDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "SeasonStartDate", "")),
      SeasonEndDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "SeasonEndDate", "")),
      RegularSeasonStartDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "RegularSeasonStartDate", "")),
      RegularSeasonEndDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "RegularSeasonEndDate", "")),
      PreseasonEnabled: normalizeSportsBoolean_(sportsV13Value_(row, col, "PreseasonEnabled", false)),
      PreseasonStartDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "PreseasonStartDate", "")),
      PreseasonEndDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "PreseasonEndDate", "")),
      PostseasonEnabled: normalizeSportsBoolean_(sportsV13Value_(row, col, "PostseasonEnabled", false)),
      PostseasonStartDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "PostseasonStartDate", "")),
      PostseasonEndDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "PostseasonEndDate", "")),
      TournamentEnabled: normalizeSportsBoolean_(sportsV13Value_(row, col, "TournamentEnabled", false)),
      TournamentStartDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "TournamentStartDate", "")),
      TournamentEndDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "TournamentEndDate", "")),
      BowlEnabled: normalizeSportsBoolean_(sportsV13Value_(row, col, "BowlEnabled", false)),
      BowlStartDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "BowlStartDate", "")),
      BowlEndDate: normalizeSportsDateOnly_(sportsV13Value_(row, col, "BowlEndDate", "")),
      SnapshotRetentionDays: sportsV12PositiveNumber_(sportsV13Value_(row, col, "SnapshotRetentionDays", 14), 14),
      ArchiveEnabled: normalizeSportsBoolean_(sportsV13Value_(row, col, "ArchiveEnabled", false)),
      ArchiveAfterDays: sportsV12PositiveNumber_(sportsV13Value_(row, col, "ArchiveAfterDays", 30), 30),
      ArchiveMode: String(sportsV13Value_(row, col, "ArchiveMode", "MOVE") || "MOVE").trim().toUpperCase(),
      ArchiveLastRunAt: sportsV13Value_(row, col, "ArchiveLastRunAt", ""),
      ArchiveLastStatus: String(sportsV13Value_(row, col, "ArchiveLastStatus", "")).trim(),
      ArchiveRowsLastRun: Number(sportsV13Value_(row, col, "ArchiveRowsLastRun", 0) || 0),
      ScheduleBatchDays: sportsV12PositiveNumber_(sportsV13Value_(row, col, "ScheduleBatchDays", sportsV13IsCollegeLeague_(sport, league) ? 7 : 14), sportsV13IsCollegeLeague_(sport, league) ? 7 : 14),
      _rowNumber: i + 1
    };

    const phase = sportsGetSeasonPhase_(setting, normalizeSportsDateOnly_(new Date()));
    setting.SeasonActive = phase.active;
    setting.SeasonPhase = phase.phase;
    settings.push(setting);
  }

  return settings;
}

function checkSportsEngineStatus() {
  const status = {
    checkedAt: new Date(),
    triggers: { liveUpdater: 0, scoreWindow: 0, seasonBatch: 0, archive: 0 },
    sheets: {},
    seasonJobs: { active: 0, complete: 0, error: 0, paused: 0 },
    latestLogs: []
  };

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    const handler = trigger.getHandlerFunction();
    if (handler === "runSportsScoresUpdate") status.triggers.liveUpdater++;
    if (handler === sportsScoresWindowTriggerFunction_()) status.triggers.scoreWindow++;
    if (handler === "runSportsSeasonBatchUpdate") status.triggers.seasonBatch++;
    if (handler === "runSportsArchiveUpdate") status.triggers.archive++;
  });

  ["SportsGames", "SportsScores", "SportsSnapshots", "SportsSettings", "SportsLogs", "SportsSeasonJobs", "SportsCollegeTeams", "SportsScoresArchive", "SportsSnapshotsArchive"].forEach(function(sheetName) {
    const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
    status.sheets[sheetName] = sh ? { exists: true, rows: Math.max(0, sh.getLastRow() - 1), columns: sh.getLastColumn() } : { exists: false, rows: 0, columns: 0 };
  });

  const jobsSheet = SpreadsheetApp.getActive().getSheetByName("SportsSeasonJobs");
  if (jobsSheet && jobsSheet.getLastRow() > 1) {
    const data = jobsSheet.getDataRange().getValues();
    const col = getSportsHeaderMap_(data[0]);
    for (let i = 1; i < data.length; i++) {
      const rowStatus = String(data[i][col.Status] || "").trim().toUpperCase();
      if (rowStatus === "ACTIVE") status.seasonJobs.active++;
      else if (rowStatus === "COMPLETE") status.seasonJobs.complete++;
      else if (rowStatus === "ERROR") status.seasonJobs.error++;
      else if (rowStatus === "PAUSED") status.seasonJobs.paused++;
    }
  }

  const logsSheet = SpreadsheetApp.getActive().getSheetByName("SportsLogs");
  if (logsSheet && logsSheet.getLastRow() > 1) {
    const lastRow = logsSheet.getLastRow();
    const startRow = Math.max(2, lastRow - 9);
    const logs = logsSheet.getRange(startRow, 1, lastRow - startRow + 1, logsSheet.getLastColumn()).getValues();
    status.latestLogs = logs.map(function(row) { return { timestamp: row[0], level: row[1], functionName: row[2], message: row[3], details: row[4] }; });
  }

  return status;
}

// Final production override: setup now ensures current live sheets and disables old racing settings rows.
/************************************
 PATCH v17 - MLB EXTRA-INNING TIE PROTECTION

 Purpose:
 - Baseball should not settle as a tied moneyline at the end of 9 innings.
 - If ESPN temporarily reports a tied baseball game with a final/post state,
   keep Completed FALSE and Winner blank until the real extra-innings final arrives.
 - Use the largest available inning value so extra innings can show as 10, 11, etc.
************************************/

function sportsV17IsBaseballLeague_(sport, league) {

  sport =
    String(sport || "")
      .trim()
      .toLowerCase();

  league =
    String(league || "")
      .trim()
      .toLowerCase();

  return (
    sport === "baseball" ||
    league === "mlb"
  );

}

function sportsV17NumberOrNull_(value) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const n = Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return null;
  }

  return n;

}

function sportsV17ScoresAreEqual_(homeScore, awayScore) {

  return (
    homeScore !== null &&
    awayScore !== null &&
    homeScore === awayScore
  );

}

function sportsV17TeamDisplayName_(team) {

  team = team || {};

  return (
    team.displayName ||
    team.shortDisplayName ||
    team.name ||
    ""
  );

}

function sportsV17BaseballPeriod_(event, competition, status) {

  const candidates = [
    status && status.period,
    event && event.status && event.status.period,
    competition && competition.status && competition.status.period,
    competition && competition.situation && competition.situation.inning,
    competition && competition.situation && competition.situation.period,
    event && event.situation && event.situation.inning,
    event && event.situation && event.situation.period
  ];

  let best = 0;

  candidates.forEach(function(value) {

    const n = Number(value || 0);

    if (
      !isNaN(n) &&
      isFinite(n) &&
      n > best
    ) {
      best = n;
    }

  });

  return best || "";

}

function sportsV17TeamEventCompleted_(
  sport,
  league,
  statusType,
  homeScore,
  awayScore
) {

  const completed =
    statusType && statusType.completed === true;

  if (!completed) {
    return false;
  }

  if (
    sportsV17IsBaseballLeague_(sport, league) &&
    sportsV17ScoresAreEqual_(homeScore, awayScore)
  ) {
    return false;
  }

  return true;

}

function sportsV17TeamEventWinner_(
  completed,
  home,
  away,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore
) {

  if (!completed) {
    return "";
  }

  if (home && home.winner === true) {
    return sportsV17TeamDisplayName_(homeTeam);
  }

  if (away && away.winner === true) {
    return sportsV17TeamDisplayName_(awayTeam);
  }

  if (
    homeScore !== null &&
    awayScore !== null &&
    homeScore !== awayScore
  ) {
    return homeScore > awayScore
      ? sportsV17TeamDisplayName_(homeTeam)
      : sportsV17TeamDisplayName_(awayTeam);
  }

  return "";

}

// Final override: baseball-aware normalization.
function normalizeESPNTeamEvent_(event, sport, league) {

  const competition =
    event.competitions &&
    event.competitions.length
      ? event.competitions[0]
      : {};

  const status =
    competition.status ||
    event.status ||
    {};

  const statusType =
    status.type ||
    {};

  const competitors =
    competition.competitors || [];

  const home =
    competitors.find(function(team) {
      return team.homeAway === "home";
    }) || {};

  const away =
    competitors.find(function(team) {
      return team.homeAway === "away";
    }) || {};

  const homeTeam =
    home.team || {};

  const awayTeam =
    away.team || {};

  const rawHomeScore =
    sportsV17NumberOrNull_(home.score);

  const rawAwayScore =
    sportsV17NumberOrNull_(away.score);

  const homeScore =
    rawHomeScore === null
      ? 0
      : rawHomeScore;

  const awayScore =
    rawAwayScore === null
      ? 0
      : rawAwayScore;

  const completed =
    sportsV17TeamEventCompleted_(
      sport,
      league,
      statusType,
      rawHomeScore,
      rawAwayScore
    );

  const winner =
    sportsV17TeamEventWinner_(
      completed,
      home,
      away,
      homeTeam,
      awayTeam,
      rawHomeScore,
      rawAwayScore
    );

  const period =
    sportsV17IsBaseballLeague_(sport, league)
      ? sportsV17BaseballPeriod_(event, competition, status)
      : status.period || "";

  return {
    GameId: league + "_" + String(event.id || ""),
    ESPNEventId: String(event.id || ""),
    Sport: sport,
    League: league,
    Status:
      statusType.name ||
      statusType.description ||
      "",
    State:
      statusType.state ||
      "",
    Period:
      period,
    Clock:
      status.displayClock || "",
    HomeTeam:
      sportsV17TeamDisplayName_(homeTeam),
    AwayTeam:
      sportsV17TeamDisplayName_(awayTeam),
    HomeScore: homeScore,
    AwayScore: awayScore,
    Winner: winner,
    Completed: completed,
    LastUpdated: new Date(),
    GameDateTime:
      event.date || "",
    HomeLogo:
      getESPNTeamLogo_(homeTeam),
    AwayLogo:
      getESPNTeamLogo_(awayTeam),
    HomeRecord:
      getESPNTeamRecord_(home),
    AwayRecord:
      getESPNTeamRecord_(away)
  };

}

function repairSportsBaseballTiedFinalScoresAdmin() {

  const summary = {
    success: true,
    repaired: 0,
    sheets: []
  };

  [
    SPORTS_SHEETS.SCORES,
    SPORTS_SHEETS.GAMES
  ].forEach(function(sheetName) {

    const result =
      repairSportsBaseballTiedFinalScoresSheet_(
        sheetName
      );

    summary.sheets.push(result);
    summary.repaired += result.repaired || 0;

  });

  logSports_(
    "INFO",
    "repairSportsBaseballTiedFinalScoresAdmin",
    "Baseball tied final score repair complete",
    JSON.stringify(summary)
  );

  return summary;

}

function repairSportsBaseballTiedFinalScoresSheet_(sheetName) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh || sh.getLastRow() < 2) {
    return {
      sheet: sheetName,
      repaired: 0,
      rowsChecked: 0,
      skipped: !sh
    };
  }

  const values =
    sh.getDataRange()
      .getValues();

  const headers =
    values[0]
      .map(function(header) {
        return String(header || "").trim();
      });

  const col =
    getSportsHeaderMap_(headers);

  const required = [
    "Sport",
    "League",
    "HomeScore",
    "AwayScore"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    return {
      sheet: sheetName,
      repaired: 0,
      rowsChecked: values.length - 1,
      message: "Missing columns: " + missing.join(", ")
    };
  }

  let repaired = 0;

  for (let r = 1; r < values.length; r++) {

    const sport =
      values[r][col.Sport];

    const league =
      values[r][col.League];

    if (!sportsV17IsBaseballLeague_(sport, league)) {
      continue;
    }

    const homeScore =
      sportsV17NumberOrNull_(
        values[r][col.HomeScore]
      );

    const awayScore =
      sportsV17NumberOrNull_(
        values[r][col.AwayScore]
      );

    if (!sportsV17ScoresAreEqual_(homeScore, awayScore)) {
      continue;
    }

    let rowChanged = false;

    if (
      col.Completed !== undefined &&
      normalizeSportsBoolean_(values[r][col.Completed])
    ) {
      values[r][col.Completed] = false;
      rowChanged = true;
    }

    if (
      col.Winner !== undefined &&
      String(values[r][col.Winner] || "").trim()
    ) {
      values[r][col.Winner] = "";
      rowChanged = true;
    }

    if (
      col.Active !== undefined &&
      values[r][col.Active] !== true
    ) {
      values[r][col.Active] = true;
      rowChanged = true;
    }

    if (
      col.State !== undefined &&
      /^(post|final)$/i.test(String(values[r][col.State] || "").trim())
    ) {
      values[r][col.State] = "in";
      rowChanged = true;
    }

    if (
      col.Status !== undefined &&
      /final|complete/i.test(String(values[r][col.Status] || ""))
    ) {
      values[r][col.Status] = "TIED - WAITING EXTRA INNINGS";
      rowChanged = true;
    }

    if (
      col.LastStatus !== undefined &&
      /final|complete/i.test(String(values[r][col.LastStatus] || ""))
    ) {
      values[r][col.LastStatus] = "TIED - WAITING EXTRA INNINGS";
      rowChanged = true;
    }

    if (rowChanged) {
      repaired++;
    }

  }

  if (repaired) {
    sh.getRange(
      1,
      1,
      values.length,
      headers.length
    ).setValues(values);
  }

  return {
    sheet: sheetName,
    repaired: repaired,
    rowsChecked: values.length - 1
  };

}


/************************************
 PATCH v17 - SIMPLE SCHEDULE RECONCILE

 Purpose:
 - Build Schedule is the first load, not a permanent truth.
 - Reconcile Schedule keeps SportsGames/SportsScores current when ESPN
   changes dates, postpones games, or replaces TBD playoff teams.
 - Nothing is deleted automatically. Changed games are updated, old rows
   remain available for audit/archive.
************************************/

const SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION =
  "runSportsScheduleReconcileUpdate";

function sportsScheduleReconcileExtraHeaders_() {
  return [
    "ScheduleStatus",
    "ScheduleLastChecked",
    "ScheduleChangedAt",
    "OriginalGameDateTime",
    "CurrentGameDateTime",
    "PreviousStatus",
    "NeedsReconcile",
    "TBDTeams",
    "SupersededByGameId",
    "ScheduleSource",
    "ScheduleNotes"
  ];
}

// Final override: add schedule-reconcile/audit columns to SportsGames.
function sportsV13GamesHeaders_() {
  return [
    "GameId",
    "Sport",
    "League",
    "ESPNEventId",
    "Name",
    "ShortName",
    "Season",
    "SeasonYear",
    "SeasonType",
    "SeasonPhase",
    "Week",
    "GameDateTime",
    "HomeTeam",
    "AwayTeam",
    "HomeTeamId",
    "AwayTeamId",
    "Active",
    "Completed",
    "Source",
    "GroupId",
    "TeamId",
    "LastChecked",
    "LastStatus"
  ].concat(
    sportsScheduleReconcileExtraHeaders_()
  );
}

function sportsScheduleIsTbdValue_(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (!text) {
    return true;
  }

  return (
    text === "tbd" ||
    text === "to be determined" ||
    text === "unknown" ||
    text === "winner" ||
    text.indexOf("tbd") >= 0 ||
    text.indexOf("winner of") >= 0 ||
    text.indexOf("to be determined") >= 0
  );
}

function sportsScheduleTbdTeams_(game) {
  const teams = [];

  if (sportsScheduleIsTbdValue_(game.HomeTeam)) {
    teams.push("HOME");
  }

  if (sportsScheduleIsTbdValue_(game.AwayTeam)) {
    teams.push("AWAY");
  }

  return teams.join(",");
}

function sportsScheduleStatusForGame_(game, existingRow) {
  const completed =
    normalizeSportsBoolean_(
      game.Completed
    );

  const status =
    String(game.Status || "")
      .trim();

  const statusUpper =
    status.toUpperCase();

  if (completed) {
    return "FINAL";
  }

  if (statusUpper.indexOf("POSTPON") >= 0) {
    return "POSTPONED";
  }

  if (statusUpper.indexOf("SUSPEND") >= 0) {
    return "SUSPENDED";
  }

  if (statusUpper.indexOf("CANCEL") >= 0) {
    return "CANCELED";
  }

  if (statusUpper.indexOf("DELAY") >= 0) {
    return "DELAYED";
  }

  if (sportsScheduleTbdTeams_(game)) {
    return "TBD";
  }

  if (
    existingRow &&
    existingRow.GameDateTime &&
    game.GameDateTime &&
    String(existingRow.GameDateTime) !== String(game.GameDateTime)
  ) {
    return "RESCHEDULED";
  }

  return "SCHEDULED";
}

function sportsScheduleNeedsReconcile_(game) {
  const scheduleStatus =
    sportsScheduleStatusForGame_(game, null);

  return (
    scheduleStatus === "TBD" ||
    scheduleStatus === "POSTPONED" ||
    scheduleStatus === "SUSPENDED" ||
    scheduleStatus === "DELAYED"
  );
}

function sportsScheduleExistingGameRows_(sh, headers) {
  const data =
    sh.getDataRange()
      .getValues();

  const col =
    getSportsHeaderMap_(
      headers
    );

  const existing = {};

  for (let i = 1; i < data.length; i++) {
    const gameId =
      String(data[i][col.GameId] || "")
        .trim();

    if (!gameId) {
      continue;
    }

    const rowObj = {};

    headers.forEach(function(header, index) {
      rowObj[header] = data[i][index];
    });

    rowObj._rowNumber = i + 1;
    existing[gameId] = rowObj;
  }

  return existing;
}

// Final override: preserve original game date/status and track schedule changes.
function upsertSportsGamesFromScores_(games) {
  games = games || [];

  if (!games.length) {
    return {
      success: true,
      inserted: 0,
      updated: 0,
      scheduleChanged: 0
    };
  }

  const sh =
    sportsV13EnsureSheetHeaders_(
      SPORTS_SHEETS.GAMES,
      sportsV13GamesHeaders_()
    ).sheet;

  applySportsRecordTextFormats_(
    SPORTS_SHEETS.GAMES
  );

  const headers =
    sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function(header) {
        return String(header || "").trim();
      });

  const existing =
    sportsScheduleExistingGameRows_(
      sh,
      headers
    );

  let inserted = 0;
  let updated = 0;
  let scheduleChanged = 0;

  games.forEach(function(game) {
    const completed =
      normalizeSportsBoolean_(
        game.Completed
      );

    const existingRow =
      existing[game.GameId] || null;

    const previousStatus =
      existingRow
        ? String(existingRow.LastStatus || existingRow.ScheduleStatus || "")
        : "";

    const originalDateTime =
      existingRow && existingRow.OriginalGameDateTime
        ? existingRow.OriginalGameDateTime
        : (existingRow && existingRow.GameDateTime)
          ? existingRow.GameDateTime
          : (game.GameDateTime || "");

    const oldDateTime =
      existingRow
        ? String(existingRow.GameDateTime || existingRow.CurrentGameDateTime || "")
        : "";

    const newDateTime =
      String(game.GameDateTime || "");

    const oldHomeTeam =
      existingRow
        ? String(existingRow.HomeTeam || "")
        : "";

    const oldAwayTeam =
      existingRow
        ? String(existingRow.AwayTeam || "")
        : "";

    const dateChanged =
      !!(oldDateTime && newDateTime && oldDateTime !== newDateTime);

    const teamsChanged =
      !!(
        existingRow &&
        (
          oldHomeTeam !== String(game.HomeTeam || "") ||
          oldAwayTeam !== String(game.AwayTeam || "")
        )
      );

    const statusChanged =
      !!(
        existingRow &&
        previousStatus &&
        previousStatus !== String(game.Status || "")
      );

    const changed =
      dateChanged ||
      teamsChanged ||
      statusChanged;

    if (changed) {
      scheduleChanged++;
    }

    const scheduleStatus =
      sportsScheduleStatusForGame_(
        game,
        existingRow
      );

    const tbdTeams =
      sportsScheduleTbdTeams_(
        game
      );

    const rowObj = {
      GameId: game.GameId || "",
      Sport: game.Sport || "",
      League: game.League || "",
      ESPNEventId: game.ESPNEventId || "",
      Name:
        (game.AwayTeam && game.HomeTeam)
          ? (game.AwayTeam + " at " + game.HomeTeam)
          : (game.HomeTeam || game.AwayTeam || game.GameId || ""),
      ShortName:
        (game.AwayTeam && game.HomeTeam)
          ? (game.AwayTeam + " @ " + game.HomeTeam)
          : (game.HomeTeam || game.AwayTeam || ""),
      Season: game.SeasonYear || "",
      SeasonYear: game.SeasonYear || "",
      SeasonType: game.SeasonType || "",
      SeasonPhase: game.SeasonPhase || "",
      Week: game.Week || "",
      GameDateTime: game.GameDateTime || "",
      HomeTeam: game.HomeTeam || "",
      AwayTeam: game.AwayTeam || "",
      HomeTeamId: game.HomeTeamId || "",
      AwayTeamId: game.AwayTeamId || "",
      Active:
        !completed &&
        scheduleStatus !== "CANCELED",
      Completed: completed,
      Source: game.Source || "ESPN_SCOREBOARD",
      GroupId: game.GroupId || "",
      TeamId: game.TeamId || "",
      LastChecked: new Date(),
      LastStatus: game.Status || "",
      ScheduleStatus: scheduleStatus,
      ScheduleLastChecked: new Date(),
      ScheduleChangedAt:
        changed
          ? new Date()
          : (existingRow && existingRow.ScheduleChangedAt) || "",
      OriginalGameDateTime: originalDateTime,
      CurrentGameDateTime: game.GameDateTime || "",
      PreviousStatus: previousStatus,
      NeedsReconcile:
        !!(
          tbdTeams ||
          scheduleStatus === "POSTPONED" ||
          scheduleStatus === "SUSPENDED" ||
          scheduleStatus === "DELAYED"
        ),
      TBDTeams: tbdTeams,
      SupersededByGameId:
        (existingRow && existingRow.SupersededByGameId) || "",
      ScheduleSource:
        game.Source || "ESPN_SCOREBOARD",
      ScheduleNotes:
        changed
          ? "Schedule/team/status changed during reconcile"
          : (existingRow && existingRow.ScheduleNotes) || ""
    };

    const row =
      headers.map(function(header) {
        return rowObj[header] !== undefined
          ? rowObj[header]
          : "";
      });

    if (existingRow && existingRow._rowNumber) {
      sh
        .getRange(existingRow._rowNumber, 1, 1, headers.length)
        .setValues([row]);
      updated++;
    } else {
      sh.appendRow(row);
      inserted++;
    }
  });

  return {
    success: true,
    inserted: inserted,
    updated: updated,
    scheduleChanged: scheduleChanged
  };
}

function runSportsScheduleReconcileUpdate(targetLeague, daysBack, daysForward) {
  const lock =
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(10000);

  if (!gotLock) {
    return {
      success: false,
      skipped: true,
      reason: "Another sports job is already running"
    };
  }

  const leagueFilter =
    String(targetLeague || "")
      .trim()
      .toLowerCase();

  daysBack =
    Math.max(
      0,
      Math.min(
        14,
        Number(daysBack === undefined ? 1 : daysBack)
      )
    );

  daysForward =
    Math.max(
      1,
      Math.min(
        90,
        Number(daysForward === undefined ? 21 : daysForward)
      )
    );

  const summary = {
    success: true,
    startedAt: new Date(),
    targetLeague: leagueFilter || "ALL",
    daysBack: daysBack,
    daysForward: daysForward,
    leaguesChecked: 0,
    datesChecked: 0,
    gamesFetched: 0,
    uniqueGames: 0,
    errors: []
  };

  try {
    setupSportsScoresSheet();

    let settings =
      readEnabledSportsSettings_();

    if (leagueFilter) {
      settings =
        settings.filter(function(setting) {
          return String(setting.League || "").toLowerCase() === leagueFilter;
        });
    }

    const previousScores =
      readLatestSportsScoresMap_();

    const dates =
      buildSportsDateStrings_(
        daysBack,
        daysForward
      );

    const gamesById = {};

    settings.forEach(function(setting) {
      dates.forEach(function(dateString) {
        try {
          const games =
            fetchAndNormalizeESPNScoreboardFromSetting_(
              setting,
              dateString,
              {
                FetchMode: "SCHEDULE_RECONCILE",
                SeasonYear: setting.SeasonYear,
                SeasonType: "",
                SeasonPhase: setting.SeasonPhase || "SCHEDULE RECONCILE"
              }
            );

          games.forEach(function(game) {
            game.Source =
              game.Source || "ESPN_SCHEDULE_RECONCILE";
            gamesById[game.GameId] = game;
          });

          summary.gamesFetched += games.length;
          summary.datesChecked++;

        } catch (err) {
          summary.errors.push({
            sport: setting.Sport,
            league: setting.League,
            date: dateString,
            error:
              err && err.message
                ? err.message
                : String(err)
          });
        }
      });

      summary.leaguesChecked++;
    });

    const allGames =
      Object.keys(gamesById)
        .map(function(gameId) {
          return gamesById[gameId];
        });

    if (allGames.length) {
      detectAndSaveSportsSnapshots_(
        previousScores,
        allGames
      );

      upsertLatestSportsScores_(
        allGames
      );
    }

    summary.uniqueGames =
      allGames.length;

    summary.finishedAt =
      new Date();

    logSports_(
      "INFO",
      "runSportsScheduleReconcileUpdate",
      "Sports schedule reconcile complete",
      JSON.stringify(summary)
    );

    return summary;

  } finally {
    lock.releaseLock();
  }
}

function apiRunSportsScheduleReconcileAdmin_(params) {
  params =
    params || {};

  assertSportsAdmin_(
    params
  );

  return runSportsScheduleReconcileUpdate(
    params.league || "",
    params.daysBack,
    params.daysForward
  );
}

function installSportsScheduleReconcileTrigger() {
  removeSportsScheduleReconcileTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyHours(6)
    .create();

  return {
    success: true,
    installed: true,
    everyHours: 6,
    message: "Schedule reconcile trigger installed. It rechecks the near schedule every 6 hours."
  };
}

function removeSportsScheduleReconcileTriggers() {
  let removed = 0;

  ScriptApp.getProjectTriggers()
    .forEach(function(trigger) {
      if (
        trigger.getHandlerFunction() ===
        SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION
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

function checkSportsScheduleReconcileTriggers() {
  return ScriptApp.getProjectTriggers()
    .filter(function(trigger) {
      return trigger.getHandlerFunction() === SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION;
    })
    .map(function(trigger) {
      return {
        handler: trigger.getHandlerFunction(),
        eventType: String(trigger.getEventType()),
        source: String(trigger.getTriggerSource())
      };
    });
}

function apiInstallSportsScheduleReconcileTriggerAdmin_(params) {
  assertSportsAdmin_(
    params || {}
  );

  return installSportsScheduleReconcileTrigger();
}

function apiRemoveSportsScheduleReconcileTriggerAdmin_(params) {
  assertSportsAdmin_(
    params || {}
  );

  return removeSportsScheduleReconcileTriggers();
}

// Final override: include schedule reconcile in smart automation status.
function getSmartSportsAutomationStatus_() {
  const triggers = ScriptApp.getProjectTriggers();

  function count_(handler) {
    return triggers.filter(function(trigger) {
      return trigger.getHandlerFunction() === handler;
    }).length;
  }

  const details = {
    scoreUpdater: count_(SPORTS_TRIGGER_FUNCTION),
    scoreWindow: count_(sportsScoresWindowTriggerFunction_()),
    scheduleReconcile: count_(SPORTS_SCHEDULE_RECONCILE_TRIGGER_FUNCTION),
    seasonLoader: count_(SPORTS_SEASON_BATCH_TRIGGER_FUNCTION),
    oddsUpdater: count_(SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION),
    archiveUpdater: count_(SPORTS_ARCHIVE_TRIGGER_FUNCTION)
  };

  const fullyEnabled =
    details.scoreUpdater > 0 &&
    details.scoreWindow > 0 &&
    details.scheduleReconcile > 0 &&
    details.seasonLoader > 0 &&
    details.oddsUpdater > 0 &&
    details.archiveUpdater > 0;

  const anyEnabled =
    Object.keys(details)
      .some(function(key) {
        return details[key] > 0;
      });

  return {
    enabled: fullyEnabled,
    fullyEnabled: fullyEnabled,
    partiallyEnabled: anyEnabled && !fullyEnabled,
    details: details
  };
}

// Final override: Smart Sports Automation also manages schedule reconcile.
function setSmartSportsAutomationEnabled_(enabled, oddsHour, archiveHour) {
  enabled =
    enabled === true ||
    String(enabled || "").toLowerCase() === "true";

  const actions = {};

  if (enabled) {
    actions.scores = installSportsScoresTrigger();
    actions.scoreWindow = installSportsScoresWindowTrigger();
    actions.scheduleReconcile = installSportsScheduleReconcileTrigger();
    actions.season = installSportsSeasonBatchTrigger();
    actions.odds = installSportsOddsHybridDailyTrigger(oddsHour === undefined ? 8 : oddsHour);
    actions.archive = installSportsArchiveDailyTrigger(archiveHour === undefined ? 3 : archiveHour);
  } else {
    actions.scores = removeSportsScoresTriggers();
    actions.scoreWindow = removeSportsScoresWindowTriggers();
    actions.scheduleReconcile = removeSportsScheduleReconcileTriggers();
    actions.season = removeSportsSeasonBatchTriggers();
    actions.odds = removeSportsOddsHybridTriggers();
    actions.archive = removeSportsArchiveTriggers();
  }

  return {
    success: true,
    enabled: enabled,
    status: getSmartSportsAutomationStatus_(),
    actions: actions,
    message: enabled ? "Smart Sports Automation Enabled" : "Smart Sports Automation Disabled"
  };
}


/************************************
 V48 WORKBOOK CAPACITY PROTECTION

 Google Sheets has a 10,000,000-cell workbook limit. SportsLogs previously
 grew to 172k+ rows while keeping 26 allocated columns even though only five
 were used, leaving the workbook at 9,999,993 cells. This maintenance is
 deliberately conservative: it prunes diagnostic logs, trims only blank grid
 space, and never deletes sports score/stat/checkpoint records.
************************************/
const SPORTS_WORKBOOK_CELL_LIMIT_V48_ = 10000000;
const SPORTS_WORKBOOK_MAINTENANCE_PROPERTY_V48_ = "SPORTS_WORKBOOK_MAINTENANCE_LAST_V48";
const SPORTS_LOG_MAX_DATA_ROWS_V48_ = 20000;
const SPORTS_ODDS_LOG_MAX_DATA_ROWS_V48_ = 5000;

function sportsWorkbookCapacityReport_() {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets().map(function(sh) {
    const maxRows = sh.getMaxRows();
    const maxColumns = sh.getMaxColumns();
    const lastRow = sh.getLastRow();
    const lastColumn = sh.getLastColumn();
    return {
      sheet: sh.getName(),
      maxRows: maxRows,
      maxColumns: maxColumns,
      lastRow: lastRow,
      lastColumn: lastColumn,
      allocatedCells: maxRows * maxColumns,
      usedRectangleCells: Math.max(1, lastRow) * Math.max(1, lastColumn)
    };
  });

  sheets.sort(function(a, b) { return b.allocatedCells - a.allocatedCells; });
  const totalAllocatedCells = sheets.reduce(function(sum, item) { return sum + item.allocatedCells; }, 0);
  const percent = totalAllocatedCells / SPORTS_WORKBOOK_CELL_LIMIT_V48_ * 100;
  const level = percent >= 95 ? "CRITICAL" : percent >= 85 ? "HIGH" : percent >= 75 ? "WARN" : "GOOD";

  return {
    success: true,
    totalAllocatedCells: totalAllocatedCells,
    cellLimit: SPORTS_WORKBOOK_CELL_LIMIT_V48_,
    remainingCells: Math.max(0, SPORTS_WORKBOOK_CELL_LIMIT_V48_ - totalAllocatedCells),
    percentUsed: Math.round(percent * 10) / 10,
    level: level,
    sheets: sheets
  };
}

function sportsPruneDiagnosticSheetV48_(sheetName, maxDataRows) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) return { sheet: sheetName, deletedRows: 0, missing: true };
  const dataRows = Math.max(0, sh.getLastRow() - 1);
  const deleteCount = Math.max(0, dataRows - maxDataRows);
  if (deleteCount > 0) {
    sh.deleteRows(2, deleteCount);
  }
  return { sheet: sheetName, deletedRows: deleteCount, retainedDataRows: Math.min(dataRows, maxDataRows) };
}

function sportsTrimBlankGridV48_(sh) {
  const lastRow = Math.max(1, sh.getLastRow());
  const lastColumn = Math.max(1, sh.getLastColumn());
  const rowBuffer = 25;
  const columnBuffer = 2;
  const keepRows = Math.min(sh.getMaxRows(), lastRow + rowBuffer);
  const keepColumns = Math.min(sh.getMaxColumns(), lastColumn + columnBuffer);
  let deletedRows = 0;
  let deletedColumns = 0;

  if (sh.getMaxRows() > keepRows) {
    deletedRows = sh.getMaxRows() - keepRows;
    sh.deleteRows(keepRows + 1, deletedRows);
  }
  if (sh.getMaxColumns() > keepColumns) {
    deletedColumns = sh.getMaxColumns() - keepColumns;
    sh.deleteColumns(keepColumns + 1, deletedColumns);
  }

  return { sheet: sh.getName(), deletedRows: deletedRows, deletedColumns: deletedColumns };
}

function sportsWorkbookMaintenance_(options) {
  options = options || {};
  const force = options.force === true;
  const properties = PropertiesService.getScriptProperties();
  const lastRun = Number(properties.getProperty(SPORTS_WORKBOOK_MAINTENANCE_PROPERTY_V48_) || 0);
  const now = Date.now();
  if (!force && lastRun && now - lastRun < 6 * 60 * 60 * 1000) {
    return { success: true, skipped: true, reason: "Capacity maintenance ran within the last 6 hours" };
  }

  const lock = LockService.getDocumentLock();
  if (lock && !lock.tryLock(5000)) {
    return { success: true, skipped: true, reason: "Spreadsheet maintenance is already running" };
  }

  try {
    const before = sportsWorkbookCapacityReport_();
    const pruned = [
      sportsPruneDiagnosticSheetV48_(SPORTS_SHEETS.LOGS, SPORTS_LOG_MAX_DATA_ROWS_V48_),
      sportsPruneDiagnosticSheetV48_("SportsOddsApiLog", SPORTS_ODDS_LOG_MAX_DATA_ROWS_V48_),
      sportsPruneDiagnosticSheetV48_("OddsApiLog", SPORTS_ODDS_LOG_MAX_DATA_ROWS_V48_)
    ];

    const ss = SpreadsheetApp.getActive();
    const trimmed = ss.getSheets().map(function(sh) {
      return sportsTrimBlankGridV48_(sh);
    });

    const after = sportsWorkbookCapacityReport_();
    properties.setProperty(SPORTS_WORKBOOK_MAINTENANCE_PROPERTY_V48_, String(now));

    return {
      success: true,
      source: String(options.source || ""),
      before: before,
      after: after,
      reclaimedCells: Math.max(0, before.totalAllocatedCells - after.totalAllocatedCells),
      pruned: pruned,
      trimmed: trimmed,
      warning: after.level === "GOOD" ? "" : "Sports workbook capacity is " + after.level + " at " + after.percentUsed + "%"
    };
  } finally {
    if (lock) lock.releaseLock();
  }
}

function runSportsWorkbookMaintenanceNow() {
  return sportsWorkbookMaintenance_({ source: "manual", force: true });
}

// Final override: retry-safe setup. Each sheet is upgraded only once per run.
function setupSportsScoresSheet() {
  const results = {};

  results.games = sportsV13EnsureSheetHeaders_(
    SPORTS_SHEETS.GAMES,
    sportsV13GamesHeaders_()
  );

  results.scores = sportsV13EnsureSheetHeaders_(
    SPORTS_SHEETS.SCORES,
    SPORTS_HEADERS.SportsScores.concat(sportsV13ScoresExtraHeaders_())
  );

  results.snapshots = sportsV13EnsureSheetHeaders_(
    SPORTS_SHEETS.SNAPSHOTS,
    SPORTS_HEADERS.SportsSnapshots
  );

  results.settings = sportsV13EnsureSheetHeaders_(
    SPORTS_SHEETS.SETTINGS,
    SPORTS_HEADERS.SportsSettings.concat(sportsV13SettingsExtraHeaders_())
  );

  results.logs = sportsV13EnsureSheetHeaders_(
    SPORTS_SHEETS.LOGS,
    SPORTS_HEADERS.SportsLogs
  );

  results.collegeTeams = sportsV13EnsureSheetHeaders_(
    "SportsCollegeTeams",
    sportsV13CollegeTeamsHeaders_()
  );

  results.seasonJobs = setupSportsSeasonJobsSheet();
  results.archive = setupSportsArchiveSystem_();

  if (typeof setupSportsPlayersSystem === "function") {
    results.players = setupSportsPlayersSystem();
  }

  if (typeof setupSportsAdvancedStatsSystem === "function") {
    results.advancedStats = setupSportsAdvancedStatsSystem();
  }

  try {
    applySportsRecordTextFormats_(SPORTS_SHEETS.SCORES);
    applySportsRecordTextFormats_(SPORTS_SHEETS.GAMES);
  } catch (formatError) {
    results.formatWarning =
      formatError && formatError.message
        ? formatError.message
        : String(formatError);
  }

  const settingsSheet = sportsV13SpreadsheetRetry_(
    "open SportsSettings after setup",
    function() {
      return SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
    }
  );

  if (settingsSheet) {
    let lastRow = 0;

    try {
      lastRow = sportsV13SpreadsheetRetry_(
        "read SportsSettings row count",
        function() {
          return settingsSheet.getLastRow();
        }
      );
    } catch (rowCountError) {
      lastRow = 2;
    }

    if (lastRow <= 1) {
      seedSportsSettings_();
    }
  }

  try { results.collegeSettings = addCollegeSportsSettings(); } catch (error) { results.collegeSettingsWarning = error.message || String(error); }
  try { results.wnbaSettings = addWNBASportsSettings(); } catch (error) { results.wnbaSettingsWarning = error.message || String(error); }
  try { results.expandedSoccerSettings = addMmaAndSoccerSettings(); } catch (error) { results.expandedSoccerSettingsWarning = error.message || String(error); }

  sportsScoresDisableRacingSettingsRows_();

  try {
    results.capacityMaintenance = sportsWorkbookMaintenance_({ source: "setupSportsScoresSheet", force: true });
  } catch (capacityError) {
    results.capacityWarning = capacityError && capacityError.message ? capacityError.message : String(capacityError);
  }

  logSports_(
    "INFO",
    "setupSportsScoresSheet",
    "Sports Scores Engine retry-safe production setup complete",
    JSON.stringify({
      playerSetup: !!results.players,
      formatWarning: results.formatWarning || ""
    })
  );

  return {
    success: true,
    version: "18.3.0-expanded-soccer-player-stats",
    results: results,
    message: "Sports Scores Engine setup complete. Each sheet was checked once with Spreadsheet timeout retries."
  };
}
