/************************************************************
 GENERATED SPLIT PROJECT
 Created from the uploaded CLEAN SPLIT v11/v12/v13 source files.
 Verify in Apps Script after upload.
************************************************************/

/************************************************************
 RACING SCORE ENGINE - ESPN BASELINE RESULTS
 Standalone racing results layer split from Sports Scores Engine.

 Use this for:
 - ESPN racing scoreboard baseline rows
 - SportsRacingResults setup/read/write
 - getSportsRacingResults API payloads
************************************************************/


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


var SPORTS_RACING_HONEST_EXTRA_HEADERS = [
  "StartingPositionSource",
  "FinalPositionSource",
  "CurrentPositionSource",
  "WinnerSource",
  "DataQualityNotes"
];


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



function getRacingESPNScoreboardUrl_(league) {

  league =
    sportsRacingString_(league)
      .toLowerCase();

  return (
    "https://site.api.espn.com/apis/site/v2/sports/racing/" +
    league +
    "/scoreboard"
  );

}

function addRacingESPNDateParamToUrl_(url, dateString) {

  dateString =
    sportsRacingString_(dateString);

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

function fetchAndNormalizeESPNRacingScoreboard_(
  league,
  dateString
) {

  league =
    sportsRacingString_(league)
      .toLowerCase();

  if (!league) {
    throw new Error(
      "league is required"
    );
  }

  const url =
    addRacingESPNDateParamToUrl_(
      getRacingESPNScoreboardUrl_(league),
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

  const code =
    response.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error(
      "ESPN racing fetch failed for " +
      league +
      ". HTTP status: " +
      code
    );
  }

  const data =
    JSON.parse(
      response.getContentText()
    );

  const events =
    data.events || [];

  const summaryRows =
    events.map(function(event) {
      return normalizeESPNRacingEvent_(
        event,
        "racing",
        league
      );
    });

  const driverRows = [];

  events.forEach(function(event) {
    normalizeESPNRacingDriverRows_(
      event,
      "racing",
      league
    ).forEach(function(row) {
      driverRows.push(row);
    });
  });

  if (driverRows.length) {
    upsertSportsRacingResultRows_(
      driverRows
    );
  }

  return {
    success: true,
    league: league,
    dateString: dateString || "",
    events: summaryRows,
    driverRows: driverRows,
    eventCount: summaryRows.length,
    driverRowCount: driverRows.length
  };

}

function refreshSportsRacingLeague_(
  league,
  dateString
) {

  return fetchAndNormalizeESPNRacingScoreboard_(
    league,
    dateString
  );

}

function apiRefreshSportsRacingLeague_(params) {

  params =
    params || {};

  return refreshSportsRacingLeague_(
    params.league || "nascar-premier",
    params.date || params.dateString || ""
  );

}

/* apiGetSportsRacingResults_ is provided by SportsRacingSupplemental.gs so supplemental/driver DB merging stays active. */