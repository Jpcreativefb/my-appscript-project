/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/

/************************************************************
 CLEAN SPLIT v11
 This file was rebuilt from the working v6 baseline. Racing modules were split into RacingScoreEngine.
 Duplicate patch functions were removed so the project is easier to debug.
************************************************************/



/************************************************************
 v11 module source: base_v6
************************************************************/

/************************************
 SPORTS SCORES ENGINE - STEP 1
 ESPN FETCH + WRITE LATEST SCORES
************************************/

const SPORTS_SHEETS = {
  GAMES: "SportsGames",
  SCORES: "SportsScores",
  SNAPSHOTS: "SportsSnapshots",
  SETTINGS: "SportsSettings",
  LOGS: "SportsLogs"
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
    "ESPNScoreboardUrl"
  ],

  SportsLogs: [
    "Timestamp",
    "Level",
    "FunctionName",
    "Message",
    "Details"
  ]
};

/************************************
 SETUP
************************************/

function setupSportsScoresSheet() {
  const ss = SpreadsheetApp.getActive();

  Object.keys(SPORTS_HEADERS).forEach(function(sheetName) {
    const sh = ensureSportsSheet_(ss, sheetName);
    setSportsHeaders_(sh, SPORTS_HEADERS[sheetName]);
  });

  seedSportsSettings_();

  logSports_(
    "INFO",
    "setupSportsScoresSheet",
    "Sports Scores Engine setup complete",
    ""
  );
}

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
    status.type || {};

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

  const homeScore =
    Number(home.score || 0);

  const awayScore =
    Number(away.score || 0);

  const completed =
    statusType.completed === true;

  let winner = "";

  if (completed) {
    if (home.winner === true) {
      winner =
        homeTeam.displayName ||
        homeTeam.shortDisplayName ||
        homeTeam.name ||
        "";
    }

    if (away.winner === true) {
      winner =
        awayTeam.displayName ||
        awayTeam.shortDisplayName ||
        awayTeam.name ||
        "";
    }
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
      normalizeSportsClockForDisplay_(
        sport,
        league,
        statusType,
        status
      ),
    HomeTeam:
      homeTeam.displayName ||
      homeTeam.shortDisplayName ||
      homeTeam.name ||
      "",
    AwayTeam:
      awayTeam.displayName ||
      awayTeam.shortDisplayName ||
      awayTeam.name ||
      "",
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

/* Removed racing-only functions during RacingScoreEngine split. */

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

function upsertLatestSportsScores_(games) {
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

  ensureSportsScoresLogoDateColumns_();

  const actualHeaders =
    sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function(header) {
        return String(header).trim();
      });

  const data =
    sh.getDataRange().getValues();

  const existingRowsByGameId = {};

  if (data.length > 1) {
    const headerMap =
      getSportsHeaderMap_(data[0]);

    for (let i = 1; i < data.length; i++) {
      const gameId =
        String(
          data[i][headerMap.GameId] || ""
        ).trim();

      if (gameId) {
        existingRowsByGameId[gameId] = i + 1;
      }
    }
  }

  games.forEach(function(game) {
    game =
      normalizeSportsScoreRowForStorage_(
        game
      );

    const row =
      actualHeaders.map(function(header) {
        return game[header] !== undefined
          ? game[header]
          : "";
      });

    const existingRow =
      existingRowsByGameId[game.GameId];

    if (existingRow) {
      sh
        .getRange(
          existingRow,
          1,
          1,
          actualHeaders.length
        )
        .setValues([row]);
    } else {
      sh.appendRow(row);
    }
  });
}

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

function readEnabledSportsSettings_() {
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
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  validateSportsSettingsColumns_(col);

  const settings = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const enabled =
      normalizeSportsBoolean_(
        row[col.Enabled]
      );

    const seasonActive =
      col.SeasonActive === undefined || row[col.SeasonActive] === ""
        ? true
        : normalizeSportsBoolean_(
            row[col.SeasonActive]
          );

    if (!enabled || !seasonActive) {
      continue;
    }

    const sport =
      String(row[col.Sport] || "")
        .trim()
        .toLowerCase();

    const league =
      String(row[col.League] || "")
        .trim()
        .toLowerCase();

    const url =
      String(row[col.ESPNScoreboardUrl] || "")
        .trim();

    if (!sport || !league || !url) {
      logSports_(
        "WARN",
        "readEnabledSportsSettings_",
        "Skipping incomplete sports setting row",
        JSON.stringify({
          row: i + 1,
          sport: sport,
          league: league,
          url: url
        })
      );

      continue;
    }

    settings.push({
      Sport: sport,
      League: league,
      Enabled: enabled,
      SeasonActive: seasonActive,
      Season: col.Season === undefined ? "" : String(row[col.Season] || "").trim(),
      SeasonStartDate: col.SeasonStartDate === undefined ? "" : normalizeSportsDateOnly_(row[col.SeasonStartDate]),
      SeasonEndDate: col.SeasonEndDate === undefined ? "" : normalizeSportsDateOnly_(row[col.SeasonEndDate]),
      PollPreGameMinutes:
        Number(row[col.PollPreGameMinutes] || 30),
      PollLiveMinutes:
        Number(row[col.PollLiveMinutes] || 1),
      PollFinalMinutes:
        Number(row[col.PollFinalMinutes] || 60),
      SavePeriodSnapshots:
        normalizeSportsBoolean_(
          row[col.SavePeriodSnapshots]
        ),
      ESPNScoreboardUrl: url
    });
  }

  return settings;
}

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
 ADD SOCCER + WORLD CUP + RACING
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

function runSportsScoresUpdate() {

  const lock =
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(10000);

  if (!gotLock) {
    logSports_(
      "WARN",
      "runSportsScoresUpdate",
      "Skipped run because another update is already running",
      ""
    );

    return {
      success: false,
      skipped: true,
      reason: "Another update is already running"
    };
  }

  const summary = {
    success: true,
    startedAt: new Date(),
    leaguesChecked: 0,
    gamesFetched: 0,
    snapshotsChecked: true,
    fighterImageSyncBefore: null,
    fighterImageSyncAfter: null,
    ufcLogoBackfill: null,
    errors: []
  };

  try {

    /*
      UFC fighter sync BEFORE scores update.

      This checks the ESPN UFC scoreboard and adds current-card fighters
      to SportsFighterImages before SportsScores gets normalized.
    */
    try {
      summary.fighterImageSyncBefore =
        syncUfcFighterImagesBeforeScoreUpdate_();
    } catch (fighterErr) {
      summary.errors.push({
        step: "syncUfcFighterImagesBeforeScoreUpdate_",
        error:
          fighterErr && fighterErr.message
            ? fighterErr.message
            : String(fighterErr)
      });

      logSports_(
        "WARN",
        "runSportsScoresUpdate",
        "syncUfcFighterImagesBeforeScoreUpdate_ failed",
        fighterErr && fighterErr.message
          ? fighterErr.message
          : String(fighterErr)
      );
    }

    const settings =
      readEnabledSportsSettings_();

    const previousScores =
      readLatestSportsScoresMap_();

    settings.forEach(function(setting) {

      try {

        const games =
          fetchAndNormalizeESPNScoreboardFromSetting_(
            setting
          );

        if (setting.SavePeriodSnapshots) {
          detectAndSaveSportsSnapshots_(
            previousScores,
            games
          );
        }

        upsertLatestSportsScores_(
          games
        );

        summary.leaguesChecked++;
        summary.gamesFetched += games.length;

        logSports_(
          "INFO",
          "runSportsScoresUpdate",
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
          "runSportsScoresUpdate",
          "Failed fetching league scores",
          JSON.stringify({
            sport: setting.Sport,
            league: setting.League,
            error: message
          })
        );

      }

    });

    /*
      UFC fighter name sync AFTER scores update.

      This reads SportsScores and adds any UFC fighters that were saved
      but are still missing from SportsFighterImages.
    */
    try {
      summary.fighterImageSyncAfter =
        populateSportsFighterImagesFromSportsScores();
    } catch (fighterErr2) {
      summary.errors.push({
        step: "populateSportsFighterImagesFromSportsScores",
        error:
          fighterErr2 && fighterErr2.message
            ? fighterErr2.message
            : String(fighterErr2)
      });

      logSports_(
        "WARN",
        "runSportsScoresUpdate",
        "populateSportsFighterImagesFromSportsScores failed",
        fighterErr2 && fighterErr2.message
          ? fighterErr2.message
          : String(fighterErr2)
      );
    }

    /*
      UFC logo backfill AFTER fighter names/images are synced.

      This reads SportsFighterImages and fills HomeLogo/AwayLogo
      in SportsScores when an ImageUrl exists.
    */
    try {
      summary.ufcLogoBackfill =
        backfillUfcLogosInSportsScoresFromFighterImages();
    } catch (logoErr) {
      summary.errors.push({
        step: "backfillUfcLogosInSportsScoresFromFighterImages",
        error:
          logoErr && logoErr.message
            ? logoErr.message
            : String(logoErr)
      });

      logSports_(
        "WARN",
        "runSportsScoresUpdate",
        "backfillUfcLogosInSportsScoresFromFighterImages failed",
        logoErr && logoErr.message
          ? logoErr.message
          : String(logoErr)
      );
    }

    summary.finishedAt =
      new Date();

    logSports_(
      "INFO",
      "runSportsScoresUpdate",
      "Sports scores update complete",
      JSON.stringify(summary)
    );

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
    .everyMinutes(5)
    .create();

  logSports_(
    "INFO",
    "installSportsScoresTrigger",
    "Installed sports scores trigger",
    JSON.stringify({
      functionName: SPORTS_TRIGGER_FUNCTION,
      everyMinutes: 5
    })
  );

  return {
    success: true,
    message: "Sports scores trigger installed for every 5 minutes"
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

    else if (action === "runSportsScoresWindowUpdate") {

      payload =
        runSportsScoresWindowUpdate();

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

else if (action === "previewSportsLeagueArchiveAdmin") {

  payload =
    apiPreviewSportsLeagueArchiveAdmin_(
      params
    );

}

else if (action === "repairSportsScoreDisplayAdmin") {

  payload =
    apiRepairSportsScoreDisplayAdmin_(
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

const SPORTS_FIGHTER_IMAGES_SHEET =
  "SportsFighterImages";

const SPORTS_FIGHTER_IMAGES_HEADERS = [
  "League",
  "FighterName",
  "ImageUrl",
  "Active",
  "Notes",
  "UpdatedAt"
];

function setupSportsFighterImagesSheet() {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_FIGHTER_IMAGES_SHEET
    );

  if (!sh) {
    sh =
      ss.insertSheet(
        SPORTS_FIGHTER_IMAGES_SHEET
      );
  }

  const lastRow =
    sh.getLastRow();

  const lastColumn =
    sh.getLastColumn();

  let headers = [];

  if (lastRow >= 1 && lastColumn >= 1) {
    headers =
      sh
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0]
        .map(function(value) {
          return String(value || "").trim();
        });
  }

  if (!headers.length || !headers[0]) {
    sh
      .getRange(
        1,
        1,
        1,
        SPORTS_FIGHTER_IMAGES_HEADERS.length
      )
      .setValues([
        SPORTS_FIGHTER_IMAGES_HEADERS
      ]);

    sh.setFrozenRows(1);

    return {
      success: true,
      created: true,
      sheet: SPORTS_FIGHTER_IMAGES_SHEET
    };
  }

  const missing =
    SPORTS_FIGHTER_IMAGES_HEADERS.filter(function(header) {
      return headers.indexOf(header) === -1;
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

  return {
    success: true,
    created: false,
    addedColumns: missing,
    sheet: SPORTS_FIGHTER_IMAGES_SHEET
  };

}

function populateSportsFighterImagesFromUfcScoreboard() {

  setupSportsFighterImagesSheet();

  const league =
    "ufc";

  const url =
    "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard";

  const response =
    UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });

  const code =
    response.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error(
      "UFC scoreboard fetch failed. HTTP " + code
    );
  }

  const data =
    JSON.parse(
      response.getContentText()
    );

  const events =
    data.events || [];

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(
      SPORTS_FIGHTER_IMAGES_SHEET
    );

  const values =
    sh.getDataRange().getValues();

  const headers =
    values[0].map(function(value) {
      return String(value || "").trim();
    });

  const col = {
    league:
      headers.indexOf("League"),
    fighterName:
      headers.indexOf("FighterName"),
    imageUrl:
      headers.indexOf("ImageUrl"),
    active:
      headers.indexOf("Active"),
    notes:
      headers.indexOf("Notes"),
    updatedAt:
      headers.indexOf("UpdatedAt")
  };

  const existingByKey = {};

  for (let i = 1; i < values.length; i++) {

    const row =
      values[i];

    const rowLeague =
      col.league >= 0
        ? row[col.league]
        : "";

    const fighterName =
      col.fighterName >= 0
        ? row[col.fighterName]
        : "";

    if (!rowLeague || !fighterName) {
      continue;
    }

    existingByKey[
      sportsFighterImageKey_(
        rowLeague,
        fighterName
      )
    ] = {
      rowNumber: i + 1,
      imageUrl:
        col.imageUrl >= 0
          ? String(row[col.imageUrl] || "").trim()
          : ""
    };

  }

  const now =
    new Date();

  const rowsToAppend = [];

  let added =
    0;

  let updated =
    0;

  let foundImages =
    0;

  let blankImages =
    0;

  events.forEach(function(event) {

    const competitions =
      event.competitions || [];

    competitions.forEach(function(competition) {

      const competitors =
        competition.competitors || [];

      competitors.forEach(function(competitor) {

        const athlete =
          competitor.athlete || {};

        const fighterName =
          athlete.displayName ||
          athlete.fullName ||
          athlete.shortName ||
          competitor.displayName ||
          competitor.name ||
          "";

        if (!fighterName) {
          return;
        }

        const fighterId =
          competitor.id ||
          extractESPNAthleteIdFromUid_(
            competitor.uid
          );

        const imageUrl =
          getESPNMmaHeadshotIfExists_(
            fighterId
          );

        if (imageUrl) {
          foundImages++;
        } else {
          blankImages++;
        }

        const key =
          sportsFighterImageKey_(
            league,
            fighterName
          );

        const existing =
          existingByKey[key];

        if (existing) {

          if (!existing.imageUrl && imageUrl) {

            sh
              .getRange(
                existing.rowNumber,
                col.imageUrl + 1
              )
              .setValue(
                imageUrl
              );

            if (col.notes >= 0) {
              sh
                .getRange(
                  existing.rowNumber,
                  col.notes + 1
                )
                .setValue(
                  "Auto-filled from ESPN fighter id: " +
                  fighterId
                );
            }

            if (col.updatedAt >= 0) {
              sh
                .getRange(
                  existing.rowNumber,
                  col.updatedAt + 1
                )
                .setValue(
                  now
                );
            }

            updated++;

          }

          return;

        }

        rowsToAppend.push([
          league,
          fighterName,
          imageUrl,
          true,
          fighterId
            ? "Auto-added from UFC scoreboard. ESPN fighter id: " + fighterId
            : "Auto-added from UFC scoreboard. No fighter id found.",
          now
        ]);

        existingByKey[key] = {
          rowNumber: -1,
          imageUrl: imageUrl
        };

        added++;

      });

    });

  });

  if (rowsToAppend.length) {

    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        rowsToAppend.length,
        SPORTS_FIGHTER_IMAGES_HEADERS.length
      )
      .setValues(
        rowsToAppend
      );

  }

  return {
    success: true,
    eventsFound: events.length,
    fightersAdded: added,
    fightersUpdated: updated,
    imagesFound: foundImages,
    imagesBlank: blankImages,
    sheet: SPORTS_FIGHTER_IMAGES_SHEET
  };

}

function populateSportsFighterImagesFromSportsScores() {

  setupSportsFighterImagesSheet();

  const ss =
    SpreadsheetApp.getActive();

  const scoresSheet =
    ss.getSheetByName("SportsScores");

  if (!scoresSheet || scoresSheet.getLastRow() < 2) {
    return {
      success: false,
      message: "No SportsScores rows found"
    };
  }

  const fighterSheet =
    ss.getSheetByName(
      SPORTS_FIGHTER_IMAGES_SHEET
    );

  const fighterValues =
    fighterSheet.getDataRange().getValues();

  const fighterHeaders =
    fighterValues[0].map(function(value) {
      return String(value || "").trim();
    });

  const fighterCol = {
    league:
      fighterHeaders.indexOf("League"),
    fighterName:
      fighterHeaders.indexOf("FighterName")
  };

  const existing = {};

  for (let i = 1; i < fighterValues.length; i++) {

    const row =
      fighterValues[i];

    const league =
      fighterCol.league >= 0
        ? row[fighterCol.league]
        : "";

    const fighterName =
      fighterCol.fighterName >= 0
        ? row[fighterCol.fighterName]
        : "";

    if (!league || !fighterName) {
      continue;
    }

    existing[
      sportsFighterImageKey_(
        league,
        fighterName
      )
    ] = true;

  }

  const scoreValues =
    scoresSheet.getDataRange().getValues();

  const scoreHeaders =
    scoreValues[0].map(function(value) {
      return String(value || "").trim();
    });

  const scoreCol = {
    sport:
      scoreHeaders.indexOf("Sport"),
    league:
      scoreHeaders.indexOf("League"),
    homeTeam:
      scoreHeaders.indexOf("HomeTeam"),
    awayTeam:
      scoreHeaders.indexOf("AwayTeam"),
    homeLogo:
      scoreHeaders.indexOf("HomeLogo"),
    awayLogo:
      scoreHeaders.indexOf("AwayLogo")
  };

  const now =
    new Date();

  const rowsToAppend = [];

  for (let r = 1; r < scoreValues.length; r++) {

    const row =
      scoreValues[r];

    const sport =
      scoreCol.sport >= 0
        ? String(row[scoreCol.sport] || "").trim().toLowerCase()
        : "";

    const league =
      scoreCol.league >= 0
        ? String(row[scoreCol.league] || "").trim().toLowerCase()
        : "";

    const isMma =
      sport === "mma" ||
      league === "ufc";

    if (!isMma) {
      continue;
    }

    const fighters = [
      {
        name:
          scoreCol.homeTeam >= 0
            ? row[scoreCol.homeTeam]
            : "",
        image:
          scoreCol.homeLogo >= 0
            ? row[scoreCol.homeLogo]
            : ""
      },
      {
        name:
          scoreCol.awayTeam >= 0
            ? row[scoreCol.awayTeam]
            : "",
        image:
          scoreCol.awayLogo >= 0
            ? row[scoreCol.awayLogo]
            : ""
      }
    ];

    fighters.forEach(function(fighter) {

      const fighterName =
        String(fighter.name || "").trim();

      if (!fighterName) {
        return;
      }

      const key =
        sportsFighterImageKey_(
          "ufc",
          fighterName
        );

      if (existing[key]) {
        return;
      }

      rowsToAppend.push([
        "ufc",
        fighterName,
        String(fighter.image || "").trim(),
        true,
        "Auto-added from SportsScores",
        now
      ]);

      existing[key] =
        true;

    });

  }

  if (rowsToAppend.length) {

    fighterSheet
      .getRange(
        fighterSheet.getLastRow() + 1,
        1,
        rowsToAppend.length,
        SPORTS_FIGHTER_IMAGES_HEADERS.length
      )
      .setValues(
        rowsToAppend
      );

  }

  return {
    success: true,
    fightersAdded: rowsToAppend.length,
    sheet: SPORTS_FIGHTER_IMAGES_SHEET
  };

}

function backfillUfcLogosInSportsScoresFromFighterImages() {

  setupSportsFighterImagesSheet();

  ensureSportsScoresLogoDateColumns_();

  const ss =
    SpreadsheetApp.getActive();

  const scoresSheet =
    ss.getSheetByName(
      SPORTS_SHEETS.SCORES
    );

  if (!scoresSheet || scoresSheet.getLastRow() < 2) {
    return {
      success: false,
      message: "No SportsScores rows found"
    };
  }

  const data =
    scoresSheet.getDataRange().getValues();

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    getSportsHeaderMap_(
      headers
    );

  const required = [
    "Sport",
    "League",
    "HomeTeam",
    "AwayTeam",
    "HomeLogo",
    "AwayLogo"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    throw new Error(
      "SportsScores missing required columns: " +
      missing.join(", ")
    );
  }

  const fighterImageMap =
    getSportsFighterImageMap_();

  function findImage(league, fighterName) {

    league =
      String(league || "")
        .trim()
        .toLowerCase();

    fighterName =
      String(fighterName || "")
        .trim();

    if (!fighterName) {
      return "";
    }

    return (
      fighterImageMap[
        sportsFighterImageKey_(
          league,
          fighterName
        )
      ] ||
      fighterImageMap[
        sportsFighterImageKey_(
          "ufc",
          fighterName
        )
      ] ||
      fighterImageMap[
        sportsFighterImageKey_(
          "mma",
          fighterName
        )
      ] ||
      ""
    );

  }

  let updatedHome = 0;
  let updatedAway = 0;
  let rowsChecked = 0;

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const sport =
      String(row[col.Sport] || "")
        .trim()
        .toLowerCase();

    const league =
      String(row[col.League] || "")
        .trim()
        .toLowerCase();

    const isUfc =
      sport === "mma" ||
      league === "ufc";

    if (!isUfc) {
      continue;
    }

    rowsChecked++;

    const homeTeam =
      String(row[col.HomeTeam] || "")
        .trim();

    const awayTeam =
      String(row[col.AwayTeam] || "")
        .trim();

    const homeImage =
      findImage(
        league,
        homeTeam
      );

    const awayImage =
      findImage(
        league,
        awayTeam
      );

    if (
      homeImage &&
      String(row[col.HomeLogo] || "").trim() !== homeImage
    ) {
      scoresSheet
        .getRange(
          i + 1,
          col.HomeLogo + 1
        )
        .setValue(
          homeImage
        );

      updatedHome++;
    }

    if (
      awayImage &&
      String(row[col.AwayLogo] || "").trim() !== awayImage
    ) {
      scoresSheet
        .getRange(
          i + 1,
          col.AwayLogo + 1
        )
        .setValue(
          awayImage
        );

      updatedAway++;
    }

  }

  SpreadsheetApp.flush();

  return {
    success: true,
    rowsChecked: rowsChecked,
    updatedHome: updatedHome,
    updatedAway: updatedAway
  };

}

function syncUfcFighterImagesBeforeScoreUpdate_() {

  try {

    const result =
      populateSportsFighterImagesFromUfcScoreboard();

    Logger.log(
      "UFC fighter image sync: " +
      JSON.stringify(result)
    );

    return result;

  } catch (err) {

    Logger.log(
      "UFC fighter image sync failed: " +
      err.message
    );

    return {
      success: false,
      error: err.message
    };

  }

}

function extractESPNAthleteIdFromUid_(uid) {

  uid =
    String(uid || "").trim();

  if (!uid) {
    return "";
  }

  const match =
    uid.match(/a:(\d+)/);

  return match
    ? match[1]
    : "";

}

function buildESPNMmaHeadshotUrl_(fighterId) {

  fighterId =
    String(fighterId || "").trim();

  if (!fighterId) {
    return "";
  }

  return (
    "https://a.espncdn.com/i/headshots/mma/players/full/" +
    fighterId +
    ".png"
  );

}

function getESPNMmaHeadshotIfExists_(fighterId) {

  const url =
    buildESPNMmaHeadshotUrl_(
      fighterId
    );

  if (!url) {
    return "";
  }

  try {

    const response =
      UrlFetchApp.fetch(url, {
        method: "get",
        muteHttpExceptions: true,
        followRedirects: true
      });

    const code =
      response.getResponseCode();

    if (code >= 200 && code < 300) {
      return url;
    }

  } catch (err) {
    return "";
  }

  return "";

}

function sportsFighterImageKey_(league, fighterName) {

  return (
    String(league || "")
      .trim()
      .toLowerCase() +
    "|" +
    String(fighterName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

}

function getSportsFighterImageMap_() {

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(
      SPORTS_FIGHTER_IMAGES_SHEET
    );

  if (!sh || sh.getLastRow() < 2) {
    return {};
  }

  const data =
    sh.getDataRange().getValues();

  const headers =
    data[0].map(function(value) {
      return String(value || "").trim();
    });

  const col = {
    league:
      headers.indexOf("League"),
    fighterName:
      headers.indexOf("FighterName"),
    imageUrl:
      headers.indexOf("ImageUrl"),
    active:
      headers.indexOf("Active")
  };

  const map = {};

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const league =
      col.league >= 0
        ? row[col.league]
        : "";

    const fighterName =
      col.fighterName >= 0
        ? row[col.fighterName]
        : "";

    const imageUrl =
      col.imageUrl >= 0
        ? String(row[col.imageUrl] || "").trim()
        : "";

    const activeValue =
      col.active >= 0
        ? String(row[col.active] || "").trim().toLowerCase()
        : "true";

    const active =
      activeValue === "" ||
      activeValue === "true" ||
      activeValue === "yes" ||
      activeValue === "1";

    if (!league || !fighterName || !imageUrl || !active) {
      continue;
    }

    map[
      sportsFighterImageKey_(
        league,
        fighterName
      )
    ] = imageUrl;

  }

  return map;

}

function getSportsFighterImage_(league, fighterName) {

  const map =
    getSportsFighterImageMap_();

  return (
    map[
      sportsFighterImageKey_(
        league,
        fighterName
      )
    ] || ""
  );

}

function getESPNImageUrlFromValue_(value) {

  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value.href) {
    return value.href;
  }

  if (value.url) {
    return value.url;
  }

  if (value.src) {
    return value.src;
  }

  return "";

}

function getESPNCombatAthleteImage_(competitor) {

  competitor =
    competitor || {};

  const athlete =
    competitor.athlete ||
    competitor.team ||
    {};

  const candidates = [
    athlete.headshot,
    athlete.image,
    athlete.logo,
    competitor.headshot,
    competitor.image,
    competitor.logo
  ];

  for (let i = 0; i < candidates.length; i++) {

    const found =
      getESPNImageUrlFromValue_(
        candidates[i]
      );

    if (found) {
      return found;
    }

  }

  const arrays = [
    athlete.headshots,
    athlete.images,
    athlete.logos,
    competitor.headshots,
    competitor.images,
    competitor.logos
  ];

  for (let a = 0; a < arrays.length; a++) {

    const list =
      Array.isArray(arrays[a])
        ? arrays[a]
        : [];

    for (let j = 0; j < list.length; j++) {

      const found =
        getESPNImageUrlFromValue_(
          list[j]
        );

      if (found) {
        return found;
      }

    }

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

const SPORTS_WINDOW_TRIGGER_FUNCTION =
  "runSportsScoresWindowAutomation";

function runSportsScoresWindowAutomation() {

  return runSportsScoresDateWindowUpdate_(
    1,
    2
  );

}

function installSportsScoresWindowTrigger() {

  removeSportsScoresWindowTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_WINDOW_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyMinutes(30)
    .create();

  logSports_(
    "INFO",
    "installSportsScoresWindowTrigger",
    "Installed sports score window trigger",
    JSON.stringify({
      functionName: SPORTS_WINDOW_TRIGGER_FUNCTION,
      everyMinutes: 30,
      daysBack: 1,
      daysForward: 2
    })
  );

  return {
    success: true,
    message: "Sports score window trigger installed for every 30 minutes",
    functionName: SPORTS_WINDOW_TRIGGER_FUNCTION,
    everyMinutes: 30,
    daysBack: 1,
    daysForward: 2
  };

}

function removeSportsScoresWindowTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WINDOW_TRIGGER_FUNCTION
    ) {
      ScriptApp.deleteTrigger(
        trigger
      );
      removed++;
    }

  });

  logSports_(
    "INFO",
    "removeSportsScoresWindowTriggers",
    "Removed sports score window triggers",
    JSON.stringify({
      removed: removed
    })
  );

  return {
    success: true,
    removed: removed
  };

}

function checkSportsScoresWindowTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  return triggers
    .filter(function(trigger) {
      return (
        trigger.getHandlerFunction() ===
        SPORTS_WINDOW_TRIGGER_FUNCTION
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


function parseSportsScoresLeagueFilter_(value) {

  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(function(item) {
        return String(item || "").trim();
      })
      .filter(function(item) {
        return !!item;
      });
  }

  return String(value || "")
    .split(/[|,]/)
    .map(function(item) {
      return String(item || "").trim();
    })
    .filter(function(item) {
      return !!item;
    });

}

function runSportsScoresDateWindowUpdate_(
  daysBack,
  daysForward,
  options
) {
  options = options || {};
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
    let settings =
      readEnabledSportsSettings_();

    const requestedLeagues =
      parseSportsScoresLeagueFilter_(
        options.leagues || options.league
      );

    if (requestedLeagues.length) {
      const allowed = {};

      requestedLeagues.forEach(function(league) {
        allowed[String(league || "").trim().toLowerCase()] = true;
      });

      settings = settings.filter(function(setting) {
        return allowed[String(setting.League || "").trim().toLowerCase()] === true;
      });

      summary.requestedLeagues = requestedLeagues;
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

function isSportsRecordValue_(value) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return false;
  }

  /*
    Reject dates:
    2026-06-18
    6/18/2026
    Thu, Jun 18
  */
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
    return false;
  }

  if (
    /\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(value) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(value)
  ) {
    return false;
  }

  /*
    Accept common sports record formats:
    43-31
    43-31-1
    10-4 Away
    7-2 Conf
  */
  return /^\d+\s*-\s*\d+(\s*-\s*\d+)?(\s+[A-Za-z]+)?$/.test(value);

}

function cleanSportsRecordValue_(value) {

  value =
    String(value || "")
      .trim();

  if (!isSportsRecordValue_(value)) {
    return "";
  }

  return value;

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

function setupSportsSeasonJobsSheet() {
  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_SEASON_JOBS_SHEET
    );

  if (!sh) {
    sh =
      ss.insertSheet(
        SPORTS_SEASON_JOBS_SHEET
      );
  }

  if (sh.getLastRow() === 0) {
    sh
      .getRange(
        1,
        1,
        1,
        SPORTS_SEASON_JOB_HEADERS.length
      )
      .setValues([
        SPORTS_SEASON_JOB_HEADERS
      ]);

    sh.setFrozenRows(1);
  }

  ensureSportsSeasonJobColumns_();

  logSports_(
    "INFO",
    "setupSportsSeasonJobsSheet",
    "SportsSeasonJobs setup complete",
    ""
  );

  return {
    success: true,
    sheet: SPORTS_SEASON_JOBS_SHEET
  };
}

function ensureSportsSeasonJobColumns_() {
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

  const headers =
    sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function(header) {
        return String(header).trim();
      });

  const missing =
    SPORTS_SEASON_JOB_HEADERS.filter(function(header) {
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
    .setValues([missing]);
}

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

function createSportsSeasonJobsForDateRange_(
  startDate,
  endDate,
  batchDays,
  options
) {
  setupSportsSeasonJobsSheet();

  startDate =
    normalizeSportsDateOnly_(startDate);

  endDate =
    normalizeSportsDateOnly_(endDate);

  batchDays =
    Number(batchDays || 2);

  options =
    options || {};

  const onlySport =
    String(options.sport || "")
      .trim()
      .toLowerCase();

  const onlyLeague =
    String(options.league || "")
      .trim()
      .toLowerCase();

  const requestedSeasonName =
    String(options.seasonName || "")
      .trim();

  if (!startDate || !endDate) {
    throw new Error(
      "StartDate and EndDate are required"
    );
  }

  if (startDate > endDate) {
    throw new Error(
      "StartDate cannot be after EndDate"
    );
  }

  const settings =
    readEnabledSportsSettings_()
      .filter(function(setting) {

        if (onlySport && String(setting.Sport || "").toLowerCase() !== onlySport) {
          return false;
        }

        if (onlyLeague && String(setting.League || "").toLowerCase() !== onlyLeague) {
          return false;
        }

        return true;
      });

  if (!settings.length) {
    return {
      success: true,
      startDate: startDate,
      endDate: endDate,
      batchDays: batchDays,
      newJobs: 0,
      enabledLeagues: 0,
      message: onlyLeague
        ? "League is off or no matching SportsSettings row was found: " + onlyLeague
        : "No enabled leagues found for this date range."
    };
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SEASON_JOBS_SHEET
      );

  const data =
    sh.getDataRange().getValues();

  const headers =
    data[0].map(function(header) {
      return String(header).trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  const existing = {};

  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const key =
        String(data[i][col.Sport] || "").toLowerCase() +
        "|" +
        String(data[i][col.League] || "").toLowerCase() +
        "|" +
        normalizeSportsDateOnly_(data[i][col.StartDate]) +
        "|" +
        normalizeSportsDateOnly_(data[i][col.EndDate]);

      existing[key] = i + 1;
    }
  }

  const newRows = [];

  settings.forEach(function(setting) {
    const key =
      setting.Sport +
      "|" +
      setting.League +
      "|" +
      startDate +
      "|" +
      endDate;

    if (existing[key]) {
      updateSportsSeasonJobRow_(
        sh,
        headers,
        existing[key],
        {
          Status: "ACTIVE",
          NextDate: startDate,
          BatchDays: batchDays,
          LastRun: "",
          DaysProcessed: 0,
          GamesFetched: 0,
          UniqueGames: 0,
          Errors: "",
          CompletedAt: ""
        }
      );

      return;
    }

    const rowObj = {
      JobId: Utilities.getUuid(),
      Sport: setting.Sport,
      League: setting.League,
      SeasonName:
        requestedSeasonName ||
        (startDate + " to " + endDate),
      StartDate: startDate,
      EndDate: endDate,
      NextDate: startDate,
      BatchDays: batchDays,
      Status: "ACTIVE",
      LastRun: "",
      DaysProcessed: 0,
      GamesFetched: 0,
      UniqueGames: 0,
      Errors: "",
      CreatedAt: new Date(),
      CompletedAt: ""
    };

    newRows.push(
      headers.map(function(header) {
        return rowObj[header] !== undefined
          ? rowObj[header]
          : "";
      })
    );
  });

  if (newRows.length) {
    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        newRows.length,
        headers.length
      )
      .setValues(newRows);
  }

  logSports_(
    "INFO",
    "createSportsSeasonJobsForDateRange_",
    "Created season jobs",
    JSON.stringify({
      startDate: startDate,
      endDate: endDate,
      batchDays: batchDays,
      newJobs: newRows.length,
      enabledLeagues: settings.length
    })
  );

  return {
    success: true,
    startDate: startDate,
    endDate: endDate,
    batchDays: batchDays,
    newJobs: newRows.length,
    enabledLeagues: settings.length
  };
}

/************************************
 RUN SMALL SEASON BATCH
 Processes a limited number of date fetches
 per run across active season jobs.
************************************/

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

function runSportsSeasonJobBatch_(
  job,
  setting,
  previousScores,
  remainingFetchBudget
) {
  const batchDays =
    Math.max(
      1,
      Number(job.BatchDays || 1)
    );

  const daysToProcess =
    Math.min(
      batchDays,
      remainingFetchBudget
    );

  let currentDate =
    normalizeSportsDateOnly_(
      job.NextDate || job.StartDate
    );

  const endDate =
    normalizeSportsDateOnly_(
      job.EndDate
    );

  const gamesById = {};
  const errors = [];

  let dateFetchesUsed = 0;
  let daysProcessed = 0;
  let gamesFetched = 0;

  for (
    let i = 0;
    i < daysToProcess;
    i++
  ) {
    if (currentDate > endDate) {
      break;
    }

    const espnDate =
      currentDate.replaceAll("-", "");

    try {
      const games =
        fetchAndNormalizeESPNScoreboardFromSetting_(
          setting,
          espnDate
        );

      games.forEach(function(game) {
        gamesById[game.GameId] = game;
      });

      gamesFetched +=
        games.length;

    } catch (err) {
      errors.push({
        sport: job.Sport,
        league: job.League,
        date: currentDate,
        error:
          err && err.message
            ? err.message
            : String(err)
      });
    }

    dateFetchesUsed++;
    daysProcessed++;

    currentDate =
      addSportsDays_(
        currentDate,
        1
      );
  }

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

  const completed =
    currentDate > endDate;

  updateSportsSeasonJob_(
    job.JobId,
    {
      NextDate:
        completed
          ? ""
          : currentDate,
      Status:
        completed
          ? "COMPLETE"
          : "ACTIVE",
      LastRun: new Date(),
      DaysProcessed:
        Number(job.DaysProcessed || 0) +
        daysProcessed,
      GamesFetched:
        Number(job.GamesFetched || 0) +
        gamesFetched,
      UniqueGames:
        Number(job.UniqueGames || 0) +
        allGames.length,
      Errors:
        errors.length
          ? JSON.stringify(errors)
          : job.Errors || "",
      CompletedAt:
        completed
          ? new Date()
          : job.CompletedAt || ""
    }
  );

  return {
    dateFetchesUsed: dateFetchesUsed,
    daysProcessed: daysProcessed,
    gamesFetched: gamesFetched,
    uniqueGames: allGames.length,
    errors: errors
  };
}

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

function checkSportsEngineStatus() {
  const status = {
    checkedAt: new Date(),
    triggers: {
      liveUpdater: 0,
      seasonBatch: 0
    },
    sheets: {},
    seasonJobs: {
      active: 0,
      complete: 0,
      error: 0,
      paused: 0
    },
    latestLogs: []
  };

  /************************************
   TRIGGERS
  ************************************/

  const triggers =
    ScriptApp.getProjectTriggers();

  triggers.forEach(function(trigger) {
    const handler =
      trigger.getHandlerFunction();

    if (handler === "runSportsScoresUpdate") {
      status.triggers.liveUpdater++;
    }

    if (handler === "runSportsSeasonBatchUpdate") {
      status.triggers.seasonBatch++;
    }
  });

  /************************************
   SHEET COUNTS
  ************************************/

  [
    "SportsScores",
    "SportsSnapshots",
    "SportsSettings",
    "SportsLogs",
    "SportsSeasonJobs"
  ].forEach(function(sheetName) {
    const sh =
      SpreadsheetApp
        .getActive()
        .getSheetByName(sheetName);

    status.sheets[sheetName] =
      sh
        ? {
            exists: true,
            rows: Math.max(0, sh.getLastRow() - 1),
            columns: sh.getLastColumn()
          }
        : {
            exists: false,
            rows: 0,
            columns: 0
          };
  });

  /************************************
   SEASON JOB STATUS COUNTS
  ************************************/

  const jobsSheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName("SportsSeasonJobs");

  if (jobsSheet && jobsSheet.getLastRow() > 1) {
    const data =
      jobsSheet.getDataRange().getValues();

    const headers =
      data[0].map(function(header) {
        return String(header).trim();
      });

    const col =
      getSportsHeaderMap_(headers);

    for (let i = 1; i < data.length; i++) {
      const rowStatus =
        String(data[i][col.Status] || "")
          .trim()
          .toUpperCase();

      if (rowStatus === "ACTIVE") {
        status.seasonJobs.active++;
      } else if (rowStatus === "COMPLETE") {
        status.seasonJobs.complete++;
      } else if (rowStatus === "ERROR") {
        status.seasonJobs.error++;
      } else if (rowStatus === "PAUSED") {
        status.seasonJobs.paused++;
      }
    }
  }

  /************************************
   LATEST LOGS
  ************************************/

  const logsSheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName("SportsLogs");

  if (logsSheet && logsSheet.getLastRow() > 1) {
    const lastRow =
      logsSheet.getLastRow();

    const startRow =
      Math.max(2, lastRow - 9);

    const numRows =
      lastRow - startRow + 1;

    const logs =
      logsSheet
        .getRange(
          startRow,
          1,
          numRows,
          logsSheet.getLastColumn()
        )
        .getValues();

    status.latestLogs =
      logs.map(function(row) {
        return {
          timestamp: row[0],
          level: row[1],
          functionName: row[2],
          message: row[3],
          details: row[4]
        };
      });
  }

  Logger.log(
    JSON.stringify(status, null, 2)
  );

  return status;
}

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

        if (teamFilter) {
          const homeTeam =
            String(score.HomeTeam || "")
              .trim()
              .toLowerCase();

          const awayTeam =
            String(score.AwayTeam || "")
              .trim()
              .toLowerCase();

          if (
            homeTeam.indexOf(teamFilter) === -1 &&
            awayTeam.indexOf(teamFilter) === -1
          ) {
            return false;
          }
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
      team: teamFilter
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

  const raw =
    String(value)
      .trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const parsed =
    new Date(raw);

  if (isNaN(parsed.getTime())) {
    return "";
  }

  return formatSportsApiDateOnly_(parsed);
}

function formatSportsApiDateOnly_(date) {
  const yyyy =
    date.getFullYear();

  const mm =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const dd =
    String(date.getDate())
      .padStart(2, "0");

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
    adminKey:
      PropertiesService
        .getScriptProperties()
        .getProperty("SPORTS_ADMIN_API_KEY")
  });

}

/************************************
 PATCH v3 - MMA + RACING DRIVER RESULTS
 Adds MMA scoreboard normalization and a separate
 SportsRacingResults sheet for all-driver race data.
************************************/

/* Removed racing-only constant SPORTS_RACING_RESULTS_SHEET during RacingScoreEngine split. */

/* Removed racing-only constant SPORTS_RACING_RESULTS_HEADERS during RacingScoreEngine split. */

/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

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
      normalizeSportsClockForDisplay_(
        sport,
        league,
        statusType,
        status
      ),
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
      getSportsFighterImage_(
        league,
        firstName
      ) ||
      getESPNEventLogo_(event),

    AwayLogo:
      getSportsFighterImage_(
        league,
        secondName
      ) ||
      getESPNEventLogo_(event)
    };

}

function testUfcImageFields() {

  const url =
    "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard";

  const response =
    UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });

  const code =
    response.getResponseCode();

  Logger.log("HTTP Code: " + code);

  const text =
    response.getContentText();

  const data =
    JSON.parse(text);

  const events =
    data.events || [];

  Logger.log("Events found: " + events.length);

  if (!events.length) {
    Logger.log("No UFC events found in ESPN scoreboard response.");
    return {
      success: false,
      message: "No UFC events found",
      code: code
    };
  }

  const output =
    events.map(function(event) {

      const competition =
        event.competitions && event.competitions.length
          ? event.competitions[0]
          : {};

      const competitors =
        competition.competitors || [];

      return {
        eventId: event.id || "",
        name: event.name || "",
        shortName: event.shortName || "",
        date: event.date || "",
        competitors: competitors.map(function(c) {

          const athlete =
            c.athlete || {};

          return {
            displayName:
              athlete.displayName ||
              athlete.fullName ||
              athlete.shortName ||
              c.displayName ||
              c.name ||
              "",
            competitorKeys:
              Object.keys(c),
            athleteKeys:
              Object.keys(athlete),
            athleteHeadshot:
              athlete.headshot || "",
            athleteHeadshots:
              athlete.headshots || "",
            athleteImage:
              athlete.image || "",
            athleteImages:
              athlete.images || "",
            athleteLogo:
              athlete.logo || "",
            athleteLogos:
              athlete.logos || "",
            competitorHeadshot:
              c.headshot || "",
            competitorImage:
              c.image || "",
            competitorLogo:
              c.logo || ""
          };

        })
      };

    });

  Logger.log(
    JSON.stringify(
      output,
      null,
      2
    )
  );

  return output;

}

function fetchAndNormalizeESPNScoreboard_(sport, league) {

  const url =
    getESPNScoreboardUrl_(sport, league);

  const response =
    UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });

  const statusCode =
    response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "ESPN fetch failed. HTTP status: " +
      statusCode
    );
  }

  const data =
    JSON.parse(
      response.getContentText()
    );

  const events =
    data.events || [];

  return events.map(function(event) {
    return normalizeESPNEvent_(
      event,
      sport,
      league
    );
  });

}

function fetchAndNormalizeESPNScoreboardFromSetting_(
  setting,
  dateString
) {

  const url =
    addESPNDateParamToUrl_(
      setting.ESPNScoreboardUrl,
      dateString
    );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const statusCode =
    response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "ESPN fetch failed for " +
      setting.League +
      ". HTTP status: " +
      statusCode
    );
  }

  const data =
    JSON.parse(
      response.getContentText()
    );

  const events =
    data.events || [];

  return events.map(function(event) {
    return normalizeESPNEvent_(
      event,
      setting.Sport,
      setting.League
    );
  });

}

/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

function addMmaAndMotorsportsSettings() {

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
      "soccer",
      "usa.1",
      true,
      60,
      2,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard"
    ],
    [
      "soccer",
      "eng.1",
      true,
      60,
      2,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"
    ],
    [
      "soccer",
      "esp.1",
      true,
      60,
      2,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard"
    ],
    [
      "soccer",
      "uefa.champions",
      true,
      60,
      2,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard"
    ],
    [
      "soccer",
      "fifa.world",
      true,
      60,
      2,
      120,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
    ],
    [
      "mma",
      "ufc",
      true,
      720,
      5,
      1440,
      true,
      "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"
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

  if (newRows.length) {

    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        newRows.length,
        newRows[0].length
      )
      .setValues(newRows);

  }

  return {
    success: true,
    added: newRows.length,
    message:
      "Soccer and MMA settings are present"
  };

}

function addExtraSportsSettings() {

  const first =
    addMmaAndMotorsportsSettings();

  return {
    success: true,
    added: first.added,
    message:
      "Extra sports settings checked. Soccer and MMA added where missing. Racing was split into RacingScoreEngine."
  };

}

/************************************
 PATCH v4 - SAFE RACING SETUP OVERRIDES
 Keeps racing results setup separate from racing odds
 setup and retries transient spreadsheet timeouts.
************************************/

/* Removed racing-only function sportsRacingSpreadsheetRetry_ during RacingScoreEngine split. */

/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

/* Removed racing-only function setupSportsRacingSystem during RacingScoreEngine split. */

/* Removed older duplicate function during v11 cleanup. */

/************************************
 PATCH v5 - RACING HONEST DATA OVERRIDES

 Purpose:
 - Do NOT treat ESPN competitor.order as StartingPosition.
 - StartingPosition only fills from real start/grid/qualifying fields.
 - FinalPosition can use ESPN competitor.order/result order.
 - Winner uses ESPN competitor.winner when present; only falls back
   to FinalPosition = 1 with a clear WinnerSource note.
 - Adds source/quality columns so the sheet shows what was real,
   what was missing, and what was inferred.

 Paste this at the very bottom of SportsScoresEngine.gs, or use
 the v5 zip replacement file.
************************************/

/* Removed racing-only constant SPORTS_RACING_HONEST_EXTRA_HEADERS during RacingScoreEngine split. */

/* Removed racing-only functions during RacingScoreEngine split. */

/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

/* Removed racing-only function testRacingHonestNascarPremierRows during RacingScoreEngine split. */

/************************************
 PATCH v6 - RACING LOCK FIX

 Why this exists:
 - runSportsScoresUpdate already uses LockService.
 - The v5 racing setup helper also tried to get a script lock.
 - Apps Script locks are not safe to nest this way, and another trigger/manual run
   can cause: "Could not lock script while setting up sheet: SportsRacingResults".

 Fix:
 - This override removes the nested setup lock.
 - It keeps retry protection for transient Google Sheets timeouts.
 - It is safe to paste at the very bottom of SportsScoresEngine.gs.
************************************/

/* Removed racing-only functions during RacingScoreEngine split. */


/* =====================================================
   STAGE 1 - SCORE DISPLAY NORMALIZATION
   Prevents bad date/time values from being saved as records,
   and keeps clock labels sport-friendly.
===================================================== */

function normalizeSportsScoreRowForStorage_(game) {

  game = game || {};

  game.HomeRecord =
    cleanSportsRecordValue_(
      game.HomeRecord
    );

  game.AwayRecord =
    cleanSportsRecordValue_(
      game.AwayRecord
    );

  game.Clock =
    normalizeSportsClockValue_(
      game.Sport,
      game.League,
      game.Status,
      game.State,
      game.Period,
      game.Clock
    );

  return game;

}

function normalizeSportsClockForDisplay_(sport, league, statusType, status) {

  statusType = statusType || {};
  status = status || {};

  return normalizeSportsClockValue_(
    sport,
    league,
    statusType.name || statusType.description || "",
    statusType.state || "",
    status.period || "",
    status.displayClock || status.detail || status.shortDetail || ""
  );

}

function normalizeSportsClockValue_(sport, league, status, state, period, clock) {

  sport = String(sport || "").toLowerCase();
  league = String(league || "").toLowerCase();
  status = String(status || "").toUpperCase();
  state = String(state || "").toLowerCase();
  clock = String(clock || "").trim();

  if (state === "pre") {
    return "Pregame";
  }

  if (
    state === "post" ||
    /FINAL|FULL_TIME|STATUS_FULL_TIME/.test(status)
  ) {
    if (sport === "soccer" || league.indexOf("fifa") !== -1) {
      return "FT";
    }
    return "Final";
  }

  if (sport === "baseball") {
    if (/top/i.test(clock)) {
      return clock.replace(/top/i, "Top");
    }
    if (/bot|bottom/i.test(clock)) {
      return clock.replace(/bot/i, "Bottom").replace(/bottom/i, "Bottom");
    }
    if (/^\d+$/.test(String(period || ""))) {
      return "Inning " + period;
    }
    return clock || "Live";
  }

  if (sport === "soccer" || league.indexOf("fifa") !== -1) {
    if (/half/i.test(clock)) {
      return "HT";
    }
    if (/^\d+(:\d+)?$/.test(clock)) {
      return clock;
    }
    return clock || "Live";
  }

  if (!clock || /^0:?00$/.test(clock)) {
    return state === "in" ? "Live" : clock;
  }

  return clock;

}

function apiRepairSportsScoreDisplayAdmin_(params) {

  assertSportsAdmin_(params);

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        SPORTS_SHEETS.SCORES
      );

  if (!sh || sh.getLastRow() < 2) {
    return {
      success: true,
      repaired: 0
    };
  }

  ensureSportsScoresLogoDateColumns_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  let repaired = 0;

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const game = {};

    headers.forEach(function(header, index) {
      game[header] = row[index];
    });

    const before = JSON.stringify({
      HomeRecord: game.HomeRecord,
      AwayRecord: game.AwayRecord,
      Clock: game.Clock
    });

    normalizeSportsScoreRowForStorage_(game);

    const after = JSON.stringify({
      HomeRecord: game.HomeRecord,
      AwayRecord: game.AwayRecord,
      Clock: game.Clock
    });

    if (before !== after) {
      if (col.HomeRecord !== undefined) {
        sh.getRange(i + 1, col.HomeRecord + 1).setValue(game.HomeRecord || "");
      }
      if (col.AwayRecord !== undefined) {
        sh.getRange(i + 1, col.AwayRecord + 1).setValue(game.AwayRecord || "");
      }
      if (col.Clock !== undefined) {
        sh.getRange(i + 1, col.Clock + 1).setValue(game.Clock || "");
      }
      repaired++;
    }

  }

  return {
    success: true,
    repaired: repaired
  };

}
