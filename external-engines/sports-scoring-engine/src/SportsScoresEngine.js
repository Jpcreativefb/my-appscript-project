/************************************************************
 CLEAN SPLIT v11
 This file was rebuilt from the working v6 baseline and later racing modules.
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
      status.displayClock || "",
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

function normalizeESPNRacingEvent_(event, sport, league) {
  const competition =
    getPrimaryRacingCompetition_(event);

  const status =
    competition.status ||
    event.status ||
    {};

  const statusType =
    status.type || {};

  const competitors =
    competition.competitors || [];

  const leader =
    getRacingLeader_(competitors);

  const winner =
    getRacingWinner_(competitors);

  const completed =
    statusType.completed === true;

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
      event.shortName ||
      event.name ||
      "",
    AwayTeam:
      leader ||
      winner ||
      "",
    HomeScore: "",
    AwayScore: "",
    Winner:
      completed
        ? winner
        : "",
    Completed: completed,
    LastUpdated: new Date(),

    GameDateTime:
     event.date || "",

    HomeLogo:
     getESPNEventLogo_(event),

    AwayLogo: ""
  };
}

function getPrimaryRacingCompetition_(event) {
  const competitions =
    event.competitions || [];

  if (!competitions.length) {
    return {};
  }

  const race =
    competitions.find(function(comp) {
      const type =
        comp.type || {};

      const abbreviation =
        String(type.abbreviation || "")
          .trim()
          .toLowerCase();

      return (
        abbreviation === "race" ||
        abbreviation === "main"
      );
    });

  return race || competitions[competitions.length - 1];
}

function getRacingLeader_(competitors) {
  if (!competitors || !competitors.length) {
    return "";
  }

  const sorted =
    competitors.slice().sort(function(a, b) {
      return Number(a.order || 9999) -
        Number(b.order || 9999);
    });

  const leader =
    sorted[0] || {};

  const athlete =
    leader.athlete || {};

  return (
    athlete.displayName ||
    athlete.fullName ||
    athlete.shortName ||
    ""
  );
}

function getRacingWinner_(competitors) {
  if (!competitors || !competitors.length) {
    return "";
  }

  const winner =
    competitors.find(function(driver) {
      return driver.winner === true;
    });

  if (!winner) {
    return "";
  }

  const athlete =
    winner.athlete || {};

  return (
    athlete.displayName ||
    athlete.fullName ||
    athlete.shortName ||
    ""
  );
}

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
        const games = fetchAndNormalizeESPNScoreboardFromSetting_(setting);

        if (setting.SavePeriodSnapshots) {
          detectAndSaveSportsSnapshots_(previousScores, games);
        }

        upsertLatestSportsScores_(games);
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
    Reject date/time-like values that ESPN sometimes places
    into non-record display fields. These were showing in the
    app as HomeRecord / AwayRecord.

    Examples rejected:
    2026-06-18
    6/18
    6/18/2026
    6-18-2026
    Thu, Jun 18
    Sep 7
    7:30 PM
  */
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

  /*
    Accept common sports record formats only:
    43-31
    43-31-1
    10-4 Away
    7-2 Conf
    15-6 Overall
  */
  return /^\d+\s*-\s*\d+(\s*-\s*\d+)?(\s+[A-Za-z][A-Za-z ]{1,24})?$/.test(value);

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
    adminKey: "2s11aj0jce77zb3kp904fwm304yw2a0b"
  });

}

/************************************
 PATCH v3 - MMA + RACING DRIVER RESULTS
 Adds MMA scoreboard normalization and a separate
 SportsRacingResults sheet for all-driver race data.
************************************/

const SPORTS_RACING_RESULTS_SHEET =
  "SportsRacingResults";

const SPORTS_RACING_RESULTS_HEADERS = [
  "RaceResultId",
  "Timestamp",
  "GameId",
  "ESPNEventId",
  "Sport",
  "League",
  "RaceName",
  "RaceDateTime",
  "Status",
  "State",
  "Completed",
  "DriverId",
  "DriverName",
  "Team",
  "CarNumber",
  "StartingPosition",
  "FinalPosition",
  "CurrentPosition",
  "Laps",
  "Points",
  "StageWins",
  "Winner",
  "RawCompetitorJSON",
  "LastUpdated"
];


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

  if (sport === "racing") {
    return normalizeESPNRacingEvent_(
      event,
      sport,
      league
    );
  }

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

function sportsRacingString_(value) {

  return String(value || "")
    .trim();

}

function sportsRacingDriverId_(competitor) {

  competitor =
    competitor || {};

  const athlete =
    competitor.athlete || {};

  const raw =
    athlete.id ||
    competitor.id ||
    getESPNCompetitorDisplayName_(
      competitor
    );

  return sportsRacingString_(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

/* Removed earlier duplicate function addMmaAndMotorsportsSettings during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function addExtraSportsSettings during production cleanup; final definition retained later in file. */



/************************************
 PATCH v4 - SAFE RACING SETUP OVERRIDES
 Keeps racing results setup separate from racing odds
 setup and retries transient spreadsheet timeouts.
************************************/

function sportsRacingSpreadsheetRetry_(label, fn) {

  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt++) {

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
        message.indexOf("Service Spreadsheets") !== -1;

      if (!retryable || attempt === 4) {
        throw err;
      }

      Utilities.sleep(
        attempt * 1500
      );

    }

  }

  throw lastError;

}


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

function setupSportsRacingSystem() {

  const resultsSetup =
    setupSportsRacingResultsSystem();

  let oddsSetup = null;
  let oddsError = "";

  if (typeof setupSportsRacingOddsSystem === "function") {

    try {
      oddsSetup =
        setupSportsRacingOddsSystem();
    } catch (err) {

      oddsError =
        err && err.message
          ? err.message
          : String(err);

      if (typeof logSports_ === "function") {
        logSports_(
          "WARN",
          "setupSportsRacingSystem",
          "Racing results setup completed but racing odds setup failed",
          oddsError
        );
      }

    }

  }

  return {
    success: true,
    resultsSheet: SPORTS_RACING_RESULTS_SHEET,
    oddsSheet:
      typeof SPORTS_RACING_ODDS_SHEET !== "undefined"
        ? SPORTS_RACING_ODDS_SHEET
        : "SportsRacingOdds",
    resultsSetup: resultsSetup,
    oddsSetup: oddsSetup,
    oddsError: oddsError,
    message:
      oddsError
        ? "Racing results setup completed. Racing odds setup needs to be run by itself: setupSportsRacingOddsSystem."
        : "Racing results and racing odds setup complete."
  };

}


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

var SPORTS_RACING_HONEST_EXTRA_HEADERS = [
  "StartingPositionSource",
  "FinalPositionSource",
  "CurrentPositionSource",
  "WinnerSource",
  "DataQualityNotes"
];

function sportsRacingHonestHeaders_() {

  const fallbackHeaders = [
    "RaceResultId",
    "Timestamp",
    "GameId",
    "ESPNEventId",
    "Sport",
    "League",
    "RaceName",
    "RaceDateTime",
    "Status",
    "State",
    "Completed",
    "DriverId",
    "DriverName",
    "Team",
    "CarNumber",
    "StartingPosition",
    "FinalPosition",
    "CurrentPosition",
    "Laps",
    "Points",
    "StageWins",
    "Winner",
    "RawCompetitorJSON",
    "LastUpdated"
  ];

  const headers =
    typeof SPORTS_RACING_RESULTS_HEADERS !== "undefined" &&
    Array.isArray(SPORTS_RACING_RESULTS_HEADERS)
      ? SPORTS_RACING_RESULTS_HEADERS.slice()
      : fallbackHeaders.slice();

  SPORTS_RACING_HONEST_EXTRA_HEADERS
    .forEach(function(header) {
      if (headers.indexOf(header) === -1) {
        headers.push(header);
      }
    });

  return headers;

}

function sportsRacingResultsGetSheet_() {

  return sportsRacingEnsureHeaderSheetSafe_(
    SPORTS_RACING_RESULTS_SHEET,
    sportsRacingHonestHeaders_()
  ).sheet;

}

function setupSportsRacingResultsSystem() {

  const result =
    sportsRacingEnsureHeaderSheetSafe_(
      SPORTS_RACING_RESULTS_SHEET,
      sportsRacingHonestHeaders_()
    );

  return {
    success: true,
    sheet: SPORTS_RACING_RESULTS_SHEET,
    added: result.added || [],
    message:
      "Sports racing results sheet setup complete. Racing honest/source columns are present."
  };

}

function sportsRacingHasValue_(value) {

  return !(
    value === "" ||
    value === null ||
    value === undefined
  );

}

function sportsRacingMeta_(value, source) {

  if (!sportsRacingHasValue_(value)) {
    return {
      value: "",
      source: ""
    };
  }

  return {
    value: value,
    source: source || ""
  };

}

function sportsRacingNormalizeStatName_(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

}

function sportsRacingFindDirectMeta_(
  competitor,
  keys,
  sourcePrefix
) {

  competitor =
    competitor || {};

  keys =
    keys || [];

  for (let i = 0; i < keys.length; i++) {

    const key =
      keys[i];

    if (
      key &&
      sportsRacingHasValue_(
        competitor[key]
      )
    ) {
      return sportsRacingMeta_(
        competitor[key],
        (sourcePrefix || "direct") + ":" + key
      );
    }

  }

  return sportsRacingMeta_("", "");

}

function sportsRacingFindNestedMeta_(
  object,
  keys,
  sourcePrefix
) {

  object =
    object || {};

  keys =
    keys || [];

  for (let i = 0; i < keys.length; i++) {

    const key =
      keys[i];

    if (
      key &&
      sportsRacingHasValue_(
        object[key]
      )
    ) {
      return sportsRacingMeta_(
        object[key],
        (sourcePrefix || "nested") + ":" + key
      );
    }

  }

  return sportsRacingMeta_("", "");

}

function sportsRacingFindStatMeta_(
  competitor,
  names
) {

  competitor =
    competitor || {};

  names =
    names || [];

  const wanted =
    names.map(function(name) {
      return sportsRacingNormalizeStatName_(
        name
      );
    });

  const statistics =
    Array.isArray(competitor.statistics)
      ? competitor.statistics
      : [];

  for (let i = 0; i < statistics.length; i++) {

    const stat =
      statistics[i] || {};

    const possibleNames = [
      stat.name,
      stat.displayName,
      stat.shortDisplayName,
      stat.abbreviation,
      stat.type
    ];

    for (let j = 0; j < possibleNames.length; j++) {

      const normalized =
        sportsRacingNormalizeStatName_(
          possibleNames[j]
        );

      if (
        normalized &&
        wanted.indexOf(normalized) !== -1
      ) {

        const value =
          sportsRacingHasValue_(stat.displayValue)
            ? stat.displayValue
            : sportsRacingHasValue_(stat.value)
              ? stat.value
              : sportsRacingHasValue_(stat.amount)
                ? stat.amount
                : "";

        return sportsRacingMeta_(
          value,
          "stat:" + String(possibleNames[j] || "")
        );

      }

    }

  }

  return sportsRacingMeta_("", "");

}

function getRacingCompetitorStat_(
  competitor,
  names
) {

  const direct =
    sportsRacingFindDirectMeta_(
      competitor,
      names,
      "direct"
    );

  if (sportsRacingHasValue_(direct.value)) {
    return direct.value;
  }

  return sportsRacingFindStatMeta_(
    competitor,
    names
  ).value;

}

function getRacingStartingPositionMeta_(competitor) {

  /*
    HONEST RULE:
    Never use competitor.order as StartingPosition.
    ESPN order is result/current ordering in the payload, not the grid.
  */

  const direct =
    sportsRacingFindDirectMeta_(
      competitor,
      [
        "startingPosition",
        "startPosition",
        "gridPosition",
        "qualifyingPosition",
        "startingGridPosition"
      ],
      "direct"
    );

  if (sportsRacingHasValue_(direct.value)) {
    return direct;
  }

  return sportsRacingFindStatMeta_(
    competitor,
    [
      "starting position",
      "start position",
      "start",
      "grid position",
      "grid",
      "qualifying position",
      "qualifying",
      "starting grid"
    ]
  );

}

function getRacingStartingPosition_(competitor) {

  return getRacingStartingPositionMeta_(
    competitor
  ).value;

}

function getRacingFinalPositionMeta_(competitor) {

  const direct =
    sportsRacingFindDirectMeta_(
      competitor,
      [
        "finalPosition",
        "finishPosition",
        "finishingPosition",
        "resultPosition",
        "position",
        "rank"
      ],
      "direct"
    );

  if (sportsRacingHasValue_(direct.value)) {
    return direct;
  }

  const stat =
    sportsRacingFindStatMeta_(
      competitor,
      [
        "finish",
        "finish position",
        "finishing position",
        "final position",
        "position",
        "rank",
        "result"
      ]
    );

  if (sportsRacingHasValue_(stat.value)) {
    return stat;
  }

  if (
    competitor &&
    competitor.curatedRank &&
    sportsRacingHasValue_(
      competitor.curatedRank.current
    )
  ) {
    return sportsRacingMeta_(
      competitor.curatedRank.current,
      "curatedRank.current"
    );
  }

  if (
    competitor &&
    sportsRacingHasValue_(
      competitor.order
    )
  ) {
    return sportsRacingMeta_(
      competitor.order,
      "espn_competitor.order_result_order"
    );
  }

  return sportsRacingMeta_("", "");

}

function getRacingFinalPosition_(competitor) {

  return getRacingFinalPositionMeta_(
    competitor
  ).value;

}

function getRacingCurrentPositionMeta_(
  competitor,
  completed,
  finalPositionMeta
) {

  if (
    completed &&
    finalPositionMeta &&
    sportsRacingHasValue_(finalPositionMeta.value)
  ) {
    return sportsRacingMeta_(
      finalPositionMeta.value,
      "same_as_final_position"
    );
  }

  const direct =
    sportsRacingFindDirectMeta_(
      competitor,
      [
        "currentPosition",
        "runningPosition",
        "livePosition",
        "position",
        "rank"
      ],
      "direct"
    );

  if (sportsRacingHasValue_(direct.value)) {
    return direct;
  }

  if (
    competitor &&
    competitor.curatedRank &&
    sportsRacingHasValue_(
      competitor.curatedRank.current
    )
  ) {
    return sportsRacingMeta_(
      competitor.curatedRank.current,
      "curatedRank.current"
    );
  }

  if (
    competitor &&
    sportsRacingHasValue_(
      competitor.order
    )
  ) {
    return sportsRacingMeta_(
      competitor.order,
      "espn_competitor.order_current_order"
    );
  }

  return sportsRacingMeta_("", "");

}

function getRacingWinnerMeta_(
  competitor,
  completed,
  finalPositionMeta
) {

  if (!completed) {
    return {
      value: false,
      source: "race_not_completed"
    };
  }

  if (
    competitor &&
    competitor.winner === true
  ) {
    return {
      value: true,
      source: "competitor.winner"
    };
  }

  if (
    competitor &&
    competitor.winner === false
  ) {
    return {
      value: false,
      source: "competitor.winner"
    };
  }

  if (
    finalPositionMeta &&
    String(finalPositionMeta.value) === "1"
  ) {
    return {
      value: true,
      source: "inferred_from_final_position_1"
    };
  }

  return {
    value: false,
    source: ""
  };

}

function getRacingLaps_(competitor) {

  return getRacingCompetitorStat_(
    competitor,
    [
      "laps",
      "lapsCompleted",
      "completedLaps",
      "laps completed"
    ]
  );

}

function getRacingPoints_(competitor) {

  return getRacingCompetitorStat_(
    competitor,
    [
      "points",
      "pts",
      "racePoints",
      "race points"
    ]
  );

}

function getRacingStageWins_(competitor) {

  return getRacingCompetitorStat_(
    competitor,
    [
      "stageWins",
      "stagesWon",
      "stage_wins",
      "stage wins",
      "stages won"
    ]
  );

}

function getRacingDriverTeam_(competitor) {

  competitor =
    competitor || {};

  const vehicle =
    competitor.vehicle || {};

  const team =
    competitor.team || {};

  const vehicleMeta =
    sportsRacingFindNestedMeta_(
      vehicle,
      [
        "team",
        "teamName",
        "manufacturer"
      ],
      "vehicle"
    );

  if (sportsRacingHasValue_(vehicleMeta.value)) {
    return vehicleMeta.value;
  }

  return (
    team.displayName ||
    team.name ||
    competitor.teamName ||
    ""
  );

}

function getRacingCarNumber_(competitor) {

  competitor =
    competitor || {};

  const vehicle =
    competitor.vehicle || {};

  return (
    vehicle.number ||
    vehicle.vehicleNumber ||
    competitor.vehicleNumber ||
    competitor.carNumber ||
    competitor.number ||
    ""
  );

}

function sportsRacingDataQualityNotes_(
  competitor,
  startingMeta,
  finalMeta,
  currentMeta,
  winnerMeta,
  stageWins
) {

  const notes = [];

  const statistics =
    Array.isArray(
      competitor && competitor.statistics
    )
      ? competitor.statistics
      : [];

  if (!statistics.length) {
    notes.push(
      "ESPN statistics array empty"
    );
  }

  if (!sportsRacingHasValue_(startingMeta.value)) {
    notes.push(
      "StartingPosition not provided by ESPN; order was not used as start"
    );
  }

  if (!sportsRacingHasValue_(stageWins)) {
    notes.push(
      "StageWins not provided by ESPN"
    );
  }

  if (
    finalMeta.source ===
    "espn_competitor.order_result_order"
  ) {
    notes.push(
      "FinalPosition uses ESPN competitor.order/result order"
    );
  }

  if (
    currentMeta.source ===
    "espn_competitor.order_current_order"
  ) {
    notes.push(
      "CurrentPosition uses ESPN competitor.order/current order"
    );
  }

  if (
    winnerMeta.source ===
    "inferred_from_final_position_1"
  ) {
    notes.push(
      "Winner inferred from FinalPosition = 1 because ESPN winner flag was missing"
    );
  }

  return notes.join(" | ");

}

function normalizeESPNRacingDriverRows_(
  event,
  sport,
  league
) {

  const competition =
    getPrimaryRacingCompetition_(
      event
    );

  const status =
    competition.status ||
    event.status ||
    {};

  const statusType =
    status.type ||
    {};

  const competitors =
    competition.competitors || [];

  const completed =
    statusType.completed === true;

  const raceName =
    event.name ||
    event.shortName ||
    "";

  return competitors
    .map(function(competitor) {

      const driverName =
        getESPNCompetitorDisplayName_(
          competitor
        );

      if (!driverName) {
        return null;
      }

      const driverId =
        sportsRacingDriverId_(
          competitor
        );

      const startingMeta =
        getRacingStartingPositionMeta_(
          competitor
        );

      const finalMeta =
        getRacingFinalPositionMeta_(
          competitor
        );

      const currentMeta =
        getRacingCurrentPositionMeta_(
          competitor,
          completed,
          finalMeta
        );

      const winnerMeta =
        getRacingWinnerMeta_(
          competitor,
          completed,
          finalMeta
        );

      const stageWins =
        getRacingStageWins_(
          competitor
        );

      return {
        RaceResultId:
          [
            league,
            String(event.id || ""),
            driverId
          ].join("|"),
        Timestamp:
          new Date(),
        GameId:
          league + "_" + String(event.id || ""),
        ESPNEventId:
          String(event.id || ""),
        Sport:
          sport,
        League:
          league,
        RaceName:
          raceName,
        RaceDateTime:
          event.date || "",
        Status:
          statusType.name ||
          statusType.description ||
          "",
        State:
          statusType.state ||
          "",
        Completed:
          completed,
        DriverId:
          driverId,
        DriverName:
          driverName,
        Team:
          getRacingDriverTeam_(
            competitor
          ),
        CarNumber:
          getRacingCarNumber_(
            competitor
          ),
        StartingPosition:
          startingMeta.value,
        FinalPosition:
          completed
            ? finalMeta.value
            : "",
        CurrentPosition:
          currentMeta.value,
        Laps:
          getRacingLaps_(
            competitor
          ),
        Points:
          getRacingPoints_(
            competitor
          ),
        StageWins:
          stageWins,
        Winner:
          completed
            ? winnerMeta.value
            : false,
        RawCompetitorJSON:
          JSON.stringify(
            competitor || {}
          ),
        LastUpdated:
          new Date(),
        StartingPositionSource:
          startingMeta.source,
        FinalPositionSource:
          completed
            ? finalMeta.source
            : "",
        CurrentPositionSource:
          currentMeta.source,
        WinnerSource:
          winnerMeta.source,
        DataQualityNotes:
          sportsRacingDataQualityNotes_(
            competitor,
            startingMeta,
            finalMeta,
            currentMeta,
            winnerMeta,
            stageWins
          )
      };

    })
    .filter(Boolean);

}

function upsertSportsRacingResultRows_(rows) {

  setupSportsRacingResultsSystem();

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  if (!rows.length) {
    return {
      inserted: 0,
      updated: 0
    };
  }

  const sh =
    sportsRacingResultsGetSheet_();

  const data =
    sportsRacingSpreadsheetRetry_(
      "read SportsRacingResults",
      function() {
        return sh.getDataRange().getValues();
      }
    );

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    getSportsHeaderMap_(headers);

  const existing = {};

  for (let i = 1; i < data.length; i++) {

    const id =
      String(data[i][col.RaceResultId] || "")
        .trim();

    if (id) {
      existing[id] = i + 1;
    }

  }

  let inserted = 0;
  let updated = 0;
  const rowsToAppend = [];

  rows.forEach(function(item) {

    const row =
      headers.map(function(header) {
        return item[header] !== undefined
          ? item[header]
          : "";
      });

    if (existing[item.RaceResultId]) {

      sportsRacingSpreadsheetRetry_(
        "update racing result row",
        function() {
          sh
            .getRange(
              existing[item.RaceResultId],
              1,
              1,
              headers.length
            )
            .setValues([
              row
            ]);
        }
      );

      updated++;

    } else {
      rowsToAppend.push(row);
      inserted++;
    }

  });

  if (rowsToAppend.length) {
    sportsRacingSpreadsheetRetry_(
      "append racing result rows",
      function() {
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
    );
  }

  SpreadsheetApp.flush();

  return {
    inserted: inserted,
    updated: updated
  };

}

function readSportsRacingResultRows_() {

  setupSportsRacingResultsSystem();

  const sh =
    sportsRacingResultsGetSheet_();

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

  return data
    .slice(1)
    .map(function(row) {
      return sportsRowToObject_(
        headers,
        row
      );
    })
    .filter(function(row) {
      return !!row.RaceResultId;
    });

}

function sportsRacingSortPosition_(row) {

  const current =
    Number(row.CurrentPosition || "");

  if (
    !isNaN(current) &&
    isFinite(current) &&
    current > 0
  ) {
    return current;
  }

  const finalPosition =
    Number(row.FinalPosition || "");

  if (
    !isNaN(finalPosition) &&
    isFinite(finalPosition) &&
    finalPosition > 0
  ) {
    return finalPosition;
  }

  return 9999;

}


/* Removed older duplicate function during v11 cleanup. */


/* Removed older duplicate function during v11 cleanup. */

function testRacingHonestNascarPremierRows() {

  const result =
    apiGetSportsRacingResults_({
      league: "nascar-premier"
    });

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;

}

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

function sportsRacingEnsureHeaderSheetSafe_(
  sheetName,
  requiredHeaders
) {

  return sportsRacingSpreadsheetRetry_(
    "setup " + sheetName,
    function() {

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

        SpreadsheetApp.flush();
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
              return String(header || "").trim();
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
        } catch (freezeErr) {
          // Non-critical. Avoid failing setup over formatting.
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

        SpreadsheetApp.flush();
      }

      try {
        sh.setFrozenRows(1);
      } catch (freezeErr2) {
        // Non-critical. Avoid failing setup over formatting.
      }

      return {
        sheet: sh,
        added: missing
      };

    }
  );

}

function repairSportsRacingHonestColumns() {

  const setup =
    setupSportsRacingResultsSystem();

  return {
    success: true,
    setup: setup,
    message:
      "Racing honest columns are installed. The nested lock was removed in patch v6. Run runSportsScoresUpdate or runSportsScoresWindowUpdate to refresh rows."
  };

}

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
      return obj[header] !== undefined ? obj[header] : "";
    }));
  });

  if (rowsToAppend.length) {
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

function getSportsArchiveStatus_() {
  setupSportsArchiveSystem_();
  const ss = SpreadsheetApp.getActive();
  const scoresArchive = ss.getSheetByName(SPORTS_SCORES_ARCHIVE_SHEET);
  const snapshotsArchive = ss.getSheetByName(SPORTS_SNAPSHOTS_ARCHIVE_SHEET);
  return {
    success: true,
    scoreArchiveRows: Math.max(0, scoresArchive.getLastRow() - 1),
    snapshotArchiveRows: Math.max(0, snapshotsArchive.getLastRow() - 1),
    triggers: checkSportsArchiveTriggers()
  };
}

function getSmartSportsAutomationStatus_() {
  const triggers = ScriptApp.getProjectTriggers();
  function count_(handler) {
    return triggers.filter(function(trigger) { return trigger.getHandlerFunction() === handler; }).length;
  }
  const details = {
    scoreUpdater: count_(SPORTS_TRIGGER_FUNCTION),
    seasonLoader: count_(SPORTS_SEASON_BATCH_TRIGGER_FUNCTION),
    oddsUpdater: count_(SPORTS_ODDS_HYBRID_TRIGGER_FUNCTION),
    archiveUpdater: count_(SPORTS_ARCHIVE_TRIGGER_FUNCTION)
  };
  const fullyEnabled =
    details.scoreUpdater > 0 &&
    details.seasonLoader > 0 &&
    details.oddsUpdater > 0 &&
    details.archiveUpdater > 0;
  const anyEnabled =
    details.scoreUpdater > 0 ||
    details.seasonLoader > 0 ||
    details.oddsUpdater > 0 ||
    details.archiveUpdater > 0;

  return {
    enabled: fullyEnabled,
    fullyEnabled: fullyEnabled,
    partiallyEnabled: anyEnabled && !fullyEnabled,
    details: details
  };
}

function setSmartSportsAutomationEnabled_(enabled, oddsHour, archiveHour) {
  enabled = enabled === true || String(enabled || "").toLowerCase() === "true";
  const actions = {};

  if (enabled) {
    actions.scores = installSportsScoresTrigger();
    actions.season = installSportsSeasonBatchTrigger();
    actions.odds = installSportsOddsHybridDailyTrigger(oddsHour === undefined ? 8 : oddsHour);
    actions.archive = installSportsArchiveDailyTrigger(archiveHour === undefined ? 3 : archiveHour);
  } else {
    actions.scores = removeSportsScoresTriggers();
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
    "TeamId"
  ];
}

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


function sportsV13EnsureSheetHeaders_(sheetName, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  if (sh.getLastRow() === 0 || sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return { sheet: sh, added: headers.slice() };
  }

  const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function(header) { return String(header || "").trim(); });
  const missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });

  if (missing.length) {
    sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }

  try { sh.setFrozenRows(1); } catch (err) {}
  return { sheet: sh, added: missing };
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
  const regularStart = setting.RegularSeasonStartDate || setting.SeasonStartDate;
  const regularEnd = setting.RegularSeasonEndDate || setting.SeasonEndDate;
  const phases = [
    { name: "PRESEASON", enabled: setting.PreseasonEnabled, start: setting.PreseasonStartDate, end: setting.PreseasonEndDate },
    { name: "REGULAR SEASON", enabled: !!(regularStart && regularEnd), start: regularStart, end: regularEnd },
    { name: "POSTSEASON", enabled: setting.PostseasonEnabled, start: setting.PostseasonStartDate, end: setting.PostseasonEndDate },
    { name: "TOURNAMENT", enabled: setting.TournamentEnabled, start: setting.TournamentStartDate, end: setting.TournamentEndDate },
    { name: "BOWL", enabled: setting.BowlEnabled, start: setting.BowlStartDate, end: setting.BowlEndDate }
  ];

  const configured = phases.some(function(phase) {
    return phase.enabled && phase.start && phase.end;
  });

  if (!configured) return { active: true, phase: "DATES NOT SET" };

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (phase.enabled && sportsDateInRange_(dateOnly, phase.start, phase.end)) {
      return { active: true, phase: phase.name };
    }
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
    const params = {
      dates: espnDate,
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
  return [];
}

function sportsV13FetchJson_(url) {
  const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
  const statusCode = response.getResponseCode();
  const body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("ESPN fetch failed. HTTP status: " + statusCode + " URL: " + url + " Body: " + body.slice(0, 200));
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
  return { homeTeamId: homeTeam.id || home.id || "", awayTeamId: awayTeam.id || away.id || "" };
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

function fetchAndNormalizeESPNScoreboardFromSetting_(setting, dateString, options) {
  options = options || {};
  const requests = sportsV13BuildESPNRequests_(setting, dateString, options);
  const gamesById = {};
  const driverRows = [];

  requests.forEach(function(request) {
    const data = sportsV13FetchJson_(request.url);
    const events = sportsV13ExtractEvents_(data);

    if (String(setting.Sport || "").trim().toLowerCase() === "racing") {
      events.forEach(function(event) {
        normalizeESPNRacingDriverRows_(event, setting.Sport, setting.League).forEach(function(row) {
          driverRows.push(row);
        });
      });
    }

    events.forEach(function(event) {
      const game = sportsV13AttachMeta_(
        normalizeESPNEvent_(event, setting.Sport, setting.League),
        event,
        request
      );
      if (game && game.GameId) gamesById[game.GameId] = game;
    });
  });

  if (driverRows.length) upsertSportsRacingResultRows_(driverRows);

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

function upsertSportsGamesFromScores_(games) {
  games = games || [];
  if (!games.length) return { success: true, inserted: 0, updated: 0 };

  const sh = sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.GAMES, sportsV13GamesHeaders_()).sheet;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function(header) { return String(header || "").trim(); });
  const data = sh.getDataRange().getValues();
  const col = getSportsHeaderMap_(headers);
  const existing = {};

  for (let i = 1; i < data.length; i++) {
    const gameId = String(data[i][col.GameId] || "").trim();
    if (gameId) existing[gameId] = i + 1;
  }

  let inserted = 0;
  let updated = 0;

  games.forEach(function(game) {
    const completed = normalizeSportsBoolean_(game.Completed);
    const rowObj = {
      GameId: game.GameId || "",
      Sport: game.Sport || "",
      League: game.League || "",
      ESPNEventId: game.ESPNEventId || "",
      Name: (game.AwayTeam && game.HomeTeam) ? (game.AwayTeam + " at " + game.HomeTeam) : (game.HomeTeam || game.AwayTeam || game.GameId || ""),
      ShortName: (game.AwayTeam && game.HomeTeam) ? (game.AwayTeam + " @ " + game.HomeTeam) : (game.HomeTeam || game.AwayTeam || ""),
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
      Active: !completed,
      Completed: completed,
      Source: game.Source || "ESPN_SCOREBOARD",
      GroupId: game.GroupId || "",
      TeamId: game.TeamId || "",
      LastChecked: new Date(),
      LastStatus: game.Status || ""
    };

    const row = headers.map(function(header) {
      return rowObj[header] !== undefined ? rowObj[header] : "";
    });

    if (existing[rowObj.GameId]) {
      sh.getRange(existing[rowObj.GameId], 1, 1, headers.length).setValues([row]);
      updated++;
    } else {
      sh.appendRow(row);
      inserted++;
    }
  });

  return { success: true, inserted: inserted, updated: updated };
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
    SPORTS_SHEETS.GAMES
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

      const current =
        String(values[r][c] || "").trim();

      if (!current) {
        return;
      }

      let next =
        current;

      if (item.type === "record") {
        next =
          cleanSportsRecordValue_(
            current
          );
      }

      if (item.type === "clock") {
        next =
          cleanSportsClockDisplayValue_(
            current
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

  value =
    String(value || "")
      .trim();

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
  const driverRows = [];

  requests.forEach(function(request) {
    const data = sportsV13FetchJson_(request.url);
    const events = sportsV13ExtractEvents_(data);

    if (String(setting.Sport || "").trim().toLowerCase() === "racing") {
      events.forEach(function(event) {
        normalizeESPNRacingDriverRows_(event, setting.Sport, setting.League).forEach(function(row) {
          driverRows.push(row);
        });
      });
    }

    events.forEach(function(event) {
      const game = sportsV13AttachMeta_(
        normalizeESPNEvent_(event, setting.Sport, setting.League),
        event,
        request
      );

      if (game && !game.Week) game.Week = request.week || "";
      if (game && game.GameId) gamesById[game.GameId] = game;
    });
  });

  if (driverRows.length) upsertSportsRacingResultRows_(driverRows);

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

  const message = "Schedule jobs ready. New jobs: " + newRows.length + ", updated jobs: " + updatedJobs + ", phases/team/week jobs: " + descriptorsCount + ", football week jobs: " + weekJobs + ".";
  logSports_("INFO", "createSportsSeasonJobsForDateRange_", message, JSON.stringify({ startDate: startDate, endDate: endDate, batchDays: batchDays, newJobs: newRows.length, updatedJobs: updatedJobs, weekJobs: weekJobs, enabledLeagues: settings.length, league: targetLeague || "ALL", scheduleSource: options.scheduleSource || "" }));

  return {
    success: true,
    startDate: startDate,
    endDate: endDate,
    batchDays: batchDays,
    newJobs: newRows.length,
    updatedJobs: updatedJobs,
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

function apiInstallSportsScoresWindowTriggerAdmin_(params) {
  assertSportsAdmin_(params || {});
  return installSportsScoresWindowTrigger();
}

function apiRemoveSportsScoresWindowTriggerAdmin_(params) {
  assertSportsAdmin_(params || {});
  return removeSportsScoresWindowTriggers();
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

function addMmaAndMotorsportsSettings() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (!sh) throw new Error("Missing sheet: " + SPORTS_SHEETS.SETTINGS);

  const rowsToAdd = [
    ["soccer", "usa.1", true, 60, 2, 120, true, "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard"],
    ["soccer", "eng.1", true, 60, 2, 120, true, "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"],
    ["soccer", "esp.1", true, 60, 2, 120, true, "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard"],
    ["soccer", "uefa.champions", true, 60, 2, 120, true, "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard"],
    ["soccer", "fifa.world", true, 60, 2, 120, true, "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"],
    ["mma", "ufc", true, 720, 5, 1440, true, "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"]
  ];

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
    message: "Extra non-racing sports settings checked. Racing is managed by the separate Racing Score Engine."
  };
}

function addExtraSportsSettings() {
  const result = addMmaAndMotorsportsSettings();
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
function setupSportsScoresSheet() {
  Object.keys(SPORTS_HEADERS).forEach(function(sheetName) {
    sportsV13EnsureSheetHeaders_(sheetName, SPORTS_HEADERS[sheetName]);
  });

  sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.GAMES, sportsV13GamesHeaders_());
  sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.SCORES, SPORTS_HEADERS.SportsScores.concat(sportsV13ScoresExtraHeaders_()));
  sportsV13EnsureSheetHeaders_(SPORTS_SHEETS.SETTINGS, SPORTS_HEADERS.SportsSettings.concat(sportsV13SettingsExtraHeaders_()));
  sportsV13EnsureSheetHeaders_("SportsCollegeTeams", sportsV13CollegeTeamsHeaders_());
  setupSportsSeasonJobsSheet();
  setupSportsArchiveSystem_();

  const settingsSheet = SpreadsheetApp.getActive().getSheetByName(SPORTS_SHEETS.SETTINGS);
  if (settingsSheet && settingsSheet.getLastRow() <= 1) seedSportsSettings_();
  sportsScoresDisableRacingSettingsRows_();
  upgradeSportsControlsV12();

  logSports_("INFO", "setupSportsScoresSheet", "Sports Scores Engine production setup complete", "");

  return {
    success: true,
    version: "14-production",
    message: "Sports Scores Engine setup complete. Live sheets, SportsGames, season jobs, college coverage, and archives are ready. Racing rows are disabled here because racing is handled by the separate Racing Score Engine."
  };
}
