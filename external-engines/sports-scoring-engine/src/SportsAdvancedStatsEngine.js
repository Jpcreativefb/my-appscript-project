/************************************************************
 SPORTS ADVANCED STATS ENGINE v1.2.0
 Lives in the separate Sports Scores Engine project.

 Adds:
 - SportsTeamGameStats
 - SportsStatCheckpoints
 - Team box-score normalization
 - Poll-based inning/quarter/clock checkpoint capture
 - Public read-only APIs and protected admin refresh APIs

 Checkpoint rows deliberately store Precision. ESPN summary data is
 cumulative; the engine captures the first poll observed at or after
 a configured boundary. Exact-boundary wagers may require review when
 Precision is POLL_SNAPSHOT rather than EXACT_BOUNDARY.
************************************************************/

const SPORTS_TEAM_GAME_STATS_SHEET = "SportsTeamGameStats";
const SPORTS_STAT_CHECKPOINTS_SHEET = "SportsStatCheckpoints";

const SPORTS_TEAM_GAME_STATS_HEADERS = [
  "GameId",
  "ESPNEventId",
  "TeamId",
  "Team",
  "Sport",
  "League",
  "StatType",
  "StatValue",
  "DisplayValue",
  "Completed",
  "LastUpdated",
  "Source"
];

const SPORTS_STAT_CHECKPOINTS_HEADERS = [
  "SnapshotId",
  "GameId",
  "ESPNEventId",
  "EntityType",
  "EntityId",
  "EntityName",
  "TeamId",
  "Sport",
  "League",
  "CheckpointType",
  "CheckpointValue",
  "CheckpointLabel",
  "ReachedPeriod",
  "ReachedClock",
  "StatType",
  "StatValue",
  "DisplayValue",
  "Completed",
  "CapturedAt",
  "Source",
  "Precision"
];

function sportsAdvancedString_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function sportsAdvancedKey_(value) {
  return sportsAdvancedString_(value).toLowerCase();
}

function sportsAdvancedSlug_(value) {
  return sportsAdvancedString_(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function sportsAdvancedNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  if (typeof value === "number") return isFinite(value) ? value : fallback;

  const cleaned = sportsAdvancedString_(value)
    .replace(/,/g, "")
    .replace(/%$/, "");

  if (!/^[-+]?\d*\.?\d+$/.test(cleaned)) return fallback;
  const number = Number(cleaned);
  return isFinite(number) ? number : fallback;
}

function sportsAdvancedBoolean_(value, fallback) {
  if (value === true || value === false) return value;
  const raw = sportsAdvancedKey_(value);
  if (["true", "yes", "1", "on"].indexOf(raw) !== -1) return true;
  if (["false", "no", "0", "off"].indexOf(raw) !== -1) return false;
  return fallback;
}

function sportsAdvancedHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    const key = sportsAdvancedString_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function sportsAdvancedRetry_(label, callback) {
  if (typeof sportsPlayersSpreadsheetRetry_ === "function") {
    return sportsPlayersSpreadsheetRetry_(label, callback);
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return callback();
    } catch (error) {
      lastError = error;
      const message = error && error.message ? error.message : String(error);
      const retryable = /Service Spreadsheets|timed out|Internal error/i.test(message);
      if (!retryable || attempt === 4) throw error;
      Utilities.sleep(attempt * 1200);
    }
  }
  throw lastError;
}

function sportsAdvancedEnsureSheet_(sheetName, requiredHeaders) {
  const ss = SpreadsheetApp.getActive();
  let sheet = sportsAdvancedRetry_("open " + sheetName, function() {
    return ss.getSheetByName(sheetName);
  });

  if (!sheet) {
    sheet = sportsAdvancedRetry_("create " + sheetName, function() {
      return ss.insertSheet(sheetName);
    });
  }

  const lastColumn = Math.max(1, sheet.getLastColumn());
  let headers = [];

  if (sheet.getLastRow() > 0) {
    headers = sportsAdvancedRetry_("read " + sheetName + " headers", function() {
      return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    }).map(sportsAdvancedString_);
  }

  const hasHeaders = headers.some(Boolean);
  if (!hasHeaders) {
    sportsAdvancedRetry_("write " + sheetName + " headers", function() {
      sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
      return true;
    });
    try { sheet.setFrozenRows(1); } catch (ignoreFreeze) {}
    return sheet;
  }

  const missing = requiredHeaders.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missing.length) {
    sportsAdvancedRetry_("append " + sheetName + " headers", function() {
      sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
      return true;
    });
  }

  try { sheet.setFrozenRows(1); } catch (ignoreFreeze2) {}
  return sheet;
}

function setupSportsAdvancedStatsSystem() {
  sportsAdvancedEnsureSheet_(SPORTS_TEAM_GAME_STATS_SHEET, SPORTS_TEAM_GAME_STATS_HEADERS);
  sportsAdvancedEnsureSheet_(SPORTS_STAT_CHECKPOINTS_SHEET, SPORTS_STAT_CHECKPOINTS_HEADERS);

  return {
    success: true,
    version: "1.2.0",
    sheets: [SPORTS_TEAM_GAME_STATS_SHEET, SPORTS_STAT_CHECKPOINTS_SHEET],
    message: "Sports team stats and checkpoint stats are ready"
  };
}

function sportsAdvancedReadRows_(sheetName, headersRequired) {
  const sheet = sportsAdvancedEnsureSheet_(sheetName, headersRequired);
  const data = sportsAdvancedRetry_("read " + sheetName, function() {
    return sheet.getDataRange().getValues();
  });

  if (data.length <= 1) return [];
  const headers = data[0].map(sportsAdvancedString_);

  return data.slice(1).map(function(row) {
    const object = {};
    headers.forEach(function(header, index) { object[header] = row[index]; });
    return object;
  });
}

function readSportsTeamGameStatsRows_() {
  return sportsAdvancedReadRows_(SPORTS_TEAM_GAME_STATS_SHEET, SPORTS_TEAM_GAME_STATS_HEADERS)
    .filter(function(row) { return sportsAdvancedString_(row.GameId) && sportsAdvancedString_(row.TeamId) && sportsAdvancedString_(row.StatType); });
}

function readSportsStatCheckpointRows_() {
  return sportsAdvancedReadRows_(SPORTS_STAT_CHECKPOINTS_SHEET, SPORTS_STAT_CHECKPOINTS_HEADERS)
    .filter(function(row) { return sportsAdvancedString_(row.SnapshotId); });
}

function sportsAdvancedUpsertRows_(sheetName, headersRequired, rows, keyBuilder) {
  rows = Array.isArray(rows) ? rows : [];
  const sheet = sportsAdvancedEnsureSheet_(sheetName, headersRequired);
  if (!rows.length) return { inserted: 0, updated: 0, count: 0 };

  const data = sportsAdvancedRetry_("read " + sheetName + " for upsert", function() {
    return sheet.getDataRange().getValues();
  });
  const headers = data[0].map(sportsAdvancedString_);
  const existing = {};

  for (let i = 1; i < data.length; i++) {
    const object = {};
    headers.forEach(function(header, index) { object[header] = data[i][index]; });
    const key = keyBuilder(object);
    if (key && existing[key] === undefined) existing[key] = i + 1;
  }

  let inserted = 0;
  let updated = 0;
  const appendRows = [];

  rows.forEach(function(item) {
    const key = keyBuilder(item);
    if (!key) return;
    const row = headers.map(function(header) {
      return item[header] !== undefined ? item[header] : "";
    });

    if (existing[key]) {
      sportsAdvancedRetry_("update " + sheetName + " row", function() {
        sheet.getRange(existing[key], 1, 1, headers.length).setValues([row]);
        return true;
      });
      updated++;
    } else {
      appendRows.push(row);
      inserted++;
    }
  });

  if (appendRows.length) {
    sportsAdvancedRetry_("append " + sheetName + " rows", function() {
      sheet.getRange(sheet.getLastRow() + 1, 1, appendRows.length, headers.length).setValues(appendRows);
      return true;
    });
  }

  SpreadsheetApp.flush();
  return { inserted: inserted, updated: updated, count: inserted + updated };
}

function upsertSportsTeamGameStatsRows_(rows) {
  return sportsAdvancedUpsertRows_(
    SPORTS_TEAM_GAME_STATS_SHEET,
    SPORTS_TEAM_GAME_STATS_HEADERS,
    rows,
    function(row) {
      return [row.GameId, row.TeamId, sportsAdvancedSlug_(row.StatType)].map(sportsAdvancedString_).join("|");
    }
  );
}

function upsertSportsStatCheckpointRows_(rows) {
  return sportsAdvancedUpsertRows_(
    SPORTS_STAT_CHECKPOINTS_SHEET,
    SPORTS_STAT_CHECKPOINTS_HEADERS,
    rows,
    function(row) {
      return [
        row.GameId,
        row.EntityType,
        row.EntityId,
        row.CheckpointType,
        sportsAdvancedSlug_(row.StatType)
      ].map(sportsAdvancedString_).join("|");
    }
  );
}

function sportsAdvancedTeamStatAlias_(sport, rawName, label) {
  const sportKey = sportsAdvancedKey_(sport);
  const compact = sportsAdvancedKey_(rawName || label).replace(/[^a-z0-9]+/g, "");
  const aliases = {
    pts: "points",
    points: "points",
    totalpoints: "points",
    touchdowns: "touchdowns",
    totaltouchdowns: "touchdowns",
    firstdowns: "first-downs",
    totalyards: "total-yards",
    netyards: "total-yards",
    passingyards: "passing-yards",
    netpassingyards: "passing-yards",
    rushingyards: "rushing-yards",
    turnovers: "turnovers",
    sacks: "sacks",
    sacksallowed: "sacks-allowed",
    thirddownefficiency: "third-down-conversions",
    fourthdownefficiency: "fourth-down-conversions",
    possessiontime: "possession-time",
    hits: "hits",
    runs: "runs",
    homeruns: "home-runs",
    hr: "home-runs",
    errors: "errors",
    walks: "walks",
    strikeouts: "strikeouts",
    totalbases: "total-bases",
    stolenbases: "stolen-bases",
    leftonbase: "left-on-base",
    goals: "goals",
    shots: "shots-on-goal",
    shotsongoal: "shots-on-goal",
    sog: "shots-on-goal",
    powerplaygoals: "power-play-goals",
    powerplayopportunities: "power-play-opportunities",
    penaltyminutes: "penalty-minutes",
    pim: "penalty-minutes",
    blockedshots: "blocked-shots",
    faceoffwins: "faceoff-wins",
    fieldgoalsmade: "field-goals-made",
    fieldgoalsmadefieldgoalsattempted: "field-goals-made",
    fieldgoals: "field-goals-made",
    threepointfieldgoalsmade: "three-pointers-made",
    threepointfieldgoalsmadethreepointfieldgoalsattempted: "three-pointers-made",
    threepointersmade: "three-pointers-made",
    threepointsmade: "three-pointers-made",
    freethrowsmade: "free-throws-made",
    freethrowsmadefreethrowsattempted: "free-throws-made",
    rebounds: "rebounds",
    totalrebounds: "rebounds",
    offensiverebounds: "offensive-rebounds",
    defensiverebounds: "defensive-rebounds",
    assists: "assists",
    steals: "steals",
    blocks: "blocks",
    fouls: "fouls",
    personalfouls: "fouls",

    totalshots: "shots",
    shotstotal: "shots",
    shots: "shots",
    shotsontarget: "shots-on-target",
    shotsongoal: sportKey === "soccer" ? "shots-on-target" : "shots-on-goal",
    possession: "possession-percentage",
    possessionpct: "possession-percentage",
    possessionpercentage: "possession-percentage",
    passes: "passes",
    totalpasses: "passes",
    passescompleted: "passes-completed",
    accuratepasses: "passes-completed",
    completedpasses: "passes-completed",
    passattempts: "passes-attempted",
    passcompletionpercentage: "pass-completion-percentage",
    passpct: "pass-completion-percentage",
    passingaccuracy: "pass-completion-percentage",
    passpercentage: "pass-completion-percentage",
    corners: "corner-kicks",
    woncorners: "corner-kicks",
    cornerkicks: "corner-kicks",
    foulscommitted: "fouls",
    yellowcards: "yellow-cards",
    redcards: "red-cards",
    offsides: "offsides",
    saves: "saves",
    tackles: "tackles",
    totaltackles: "tackles",
    wontackles: "tackles",
    interceptions: "interceptions",
    clearances: "clearances",
    effectiveclearance: "clearances",
    totalclearance: "clearances"
  };

  if (sportKey === "hockey" && compact === "blocks") return "blocked-shots";
  if (aliases[compact]) return aliases[compact];
  const slug = sportsAdvancedSlug_(rawName || label);
  if (sportKey === "football" && slug.indexOf("touchdown") !== -1) return "touchdowns";
  if (sportKey === "baseball" && slug === "h") return "hits";
  return slug;
}

function sportsAdvancedShouldTrackTeamStat_(sport, statType) {
  const key = sportsAdvancedSlug_(statType);
  const sportKey = sportsAdvancedKey_(sport);
  const football = {
    "points": true,
    "touchdowns": true,
    "first-downs": true,
    "total-yards": true,
    "passing-yards": true,
    "rushing-yards": true,
    "turnovers": true,
    "sacks": true,
    "sacks-allowed": true,
    "third-down-conversions": true,
    "fourth-down-conversions": true,
    "possession-time": true
  };
  const baseball = {
    "runs": true,
    "hits": true,
    "home-runs": true,
    "errors": true,
    "walks": true,
    "strikeouts": true,
    "total-bases": true,
    "stolen-bases": true,
    "left-on-base": true
  };
  const hockey = {
    "goals": true,
    "shots-on-goal": true,
    "power-play-goals": true,
    "power-play-opportunities": true,
    "penalty-minutes": true,
    "blocked-shots": true,
    "hits": true,
    "faceoff-wins": true
  };
  const basketball = {
    "points": true,
    "field-goals-made": true,
    "field-goals-attempted": true,
    "three-pointers-made": true,
    "three-pointers-attempted": true,
    "free-throws-made": true,
    "free-throws-attempted": true,
    "rebounds": true,
    "offensive-rebounds": true,
    "defensive-rebounds": true,
    "assists": true,
    "steals": true,
    "blocks": true,
    "turnovers": true,
    "fouls": true
  };
  const soccer = {
    "goals": true,
    "shots": true,
    "shots-on-target": true,
    "possession-percentage": true,
    "passes": true,
    "passes-completed": true,
    "passes-attempted": true,
    "pass-completion-percentage": true,
    "corner-kicks": true,
    "fouls": true,
    "yellow-cards": true,
    "red-cards": true,
    "offsides": true,
    "saves": true,
    "tackles": true,
    "interceptions": true,
    "clearances": true
  };
  if (sportKey === "football") return !!football[key];
  if (sportKey === "baseball") return !!baseball[key];
  if (sportKey === "hockey") return !!hockey[key];
  if (sportKey === "basketball") return !!basketball[key];
  if (sportKey === "soccer") return !!soccer[key];
  return false;
}

function sportsAdvancedParseFractionStat_(statType, displayValue) {
  const raw = sportsAdvancedString_(displayValue);
  const match = raw.match(/^\s*(\d+)\s*[-\/]\s*(\d+)\s*$/);
  if (!match) return [];
  const made = Number(match[1]);
  const attempted = Number(match[2]);
  if (statType === "third-down-conversions") {
    return [
      { StatType: "third-down-conversions", StatValue: made, DisplayValue: String(made) },
      { StatType: "third-down-attempts", StatValue: attempted, DisplayValue: String(attempted) }
    ];
  }
  if (statType === "fourth-down-conversions") {
    return [
      { StatType: "fourth-down-conversions", StatValue: made, DisplayValue: String(made) },
      { StatType: "fourth-down-attempts", StatValue: attempted, DisplayValue: String(attempted) }
    ];
  }
  const madeAttempted = {
    "field-goals-made": "field-goals-attempted",
    "three-pointers-made": "three-pointers-attempted",
    "free-throws-made": "free-throws-attempted",
    "power-play-goals": "power-play-opportunities"
  };
  if (madeAttempted[statType]) {
    return [
      { StatType: statType, StatValue: made, DisplayValue: String(made) },
      { StatType: madeAttempted[statType], StatValue: attempted, DisplayValue: String(attempted) }
    ];
  }
  return [];
}

function sportsAdvancedDerivedTeamStats_(summary, score, existingRows) {
  summary = summary || {};
  score = score || {};
  existingRows = Array.isArray(existingRows) ? existingRows : [];

  const rows = [];
  const now = new Date();
  const sport = sportsAdvancedKey_(score.Sport);
  const league = sportsAdvancedKey_(score.League);
  const gameId = sportsAdvancedString_(score.GameId || (league + "_" + score.ESPNEventId));
  const eventId = sportsAdvancedString_(score.ESPNEventId);
  const completed = sportsAdvancedBoolean_(score.Completed, false);

  const teams = [
    {
      id: sportsAdvancedString_(score.AwayTeamId),
      name: sportsAdvancedString_(score.AwayTeam),
      score: sportsAdvancedNumber_(score.AwayScore, "")
    },
    {
      id: sportsAdvancedString_(score.HomeTeamId),
      name: sportsAdvancedString_(score.HomeTeam),
      score: sportsAdvancedNumber_(score.HomeScore, "")
    }
  ];

  function hasStat_(teamId, statType) {
    return existingRows.concat(rows).some(function(row) {
      return sportsAdvancedString_(row.TeamId) === sportsAdvancedString_(teamId) &&
        sportsAdvancedSlug_(row.StatType) === sportsAdvancedSlug_(statType);
    });
  }

  function add_(teamId, teamName, statType, value, source) {
    if (!teamId || value === "" || value === null || value === undefined || hasStat_(teamId, statType)) return;
    rows.push({
      GameId: gameId,
      ESPNEventId: eventId,
      TeamId: teamId,
      Team: teamName,
      Sport: sport,
      League: league,
      StatType: statType,
      StatValue: value,
      DisplayValue: String(value),
      Completed: completed,
      LastUpdated: now,
      Source: source || "ESPN_DERIVED"
    });
  }

  teams.forEach(function(team) {
    if (team.score !== "") {
      const scoreStatType = sport === "baseball"
        ? "runs"
        : ((sport === "hockey" || sport === "soccer") ? "goals" : "points");
      add_(team.id, team.name, scoreStatType, team.score, "SPORTS_SCORE_DERIVED");
    }
  });

  if (sport === "football") {
    const touchdownCounts = {};
    (summary.scoringPlays || []).forEach(function(play) {
      const text = sportsAdvancedString_(
        (play.type && (play.type.text || play.type.abbreviation)) ||
        play.text ||
        play.shortText
      ).toLowerCase();
      if (text.indexOf("touchdown") === -1 && text.indexOf(" td") === -1) return;
      const team = play.team || {};
      const teamId = sportsAdvancedString_(team.id || team.uid);
      if (!teamId) return;
      touchdownCounts[teamId] = (touchdownCounts[teamId] || 0) + 1;
    });

    teams.forEach(function(team) {
      add_(team.id, team.name, "touchdowns", touchdownCounts[team.id] || 0, "ESPN_SCORING_PLAYS_DERIVED");
    });
  }

  return rows;
}

function sportsAdvancedNormalizeTeamStats_(summary, score) {
  summary = summary || {};
  score = score || {};
  const boxscore = summary.boxscore || {};
  const teams = boxscore.teams || [];
  const rows = [];
  const now = new Date();
  const sport = sportsAdvancedKey_(score.Sport);
  const league = sportsAdvancedKey_(score.League);
  const gameId = sportsAdvancedString_(score.GameId || (league + "_" + score.ESPNEventId));
  const eventId = sportsAdvancedString_(score.ESPNEventId);
  const completed = sportsAdvancedBoolean_(score.Completed, false);

  teams.forEach(function(teamEntry) {
    const team = teamEntry.team || {};
    const teamId = sportsAdvancedString_(team.id || team.uid);
    const teamName = sportsAdvancedString_(team.displayName || team.shortDisplayName || team.name);
    if (!teamId || !teamName) return;

    (teamEntry.statistics || []).forEach(function(stat) {
      const rawName = sportsAdvancedString_(stat.name || stat.key || stat.abbreviation || stat.label);
      const label = sportsAdvancedString_(stat.displayName || stat.shortDisplayName || stat.label || rawName);
      const displayValue = sportsAdvancedString_(stat.displayValue !== undefined ? stat.displayValue : stat.value);
      const statType = sportsAdvancedTeamStatAlias_(sport, rawName, label);
      if (!statType || !sportsAdvancedShouldTrackTeamStat_(sport, statType)) return;

      const fractions = sportsAdvancedParseFractionStat_(statType, displayValue);
      if (fractions.length) {
        fractions.forEach(function(item) {
          rows.push({
            GameId: gameId,
            ESPNEventId: eventId,
            TeamId: teamId,
            Team: teamName,
            Sport: sport,
            League: league,
            StatType: item.StatType,
            StatValue: item.StatValue,
            DisplayValue: item.DisplayValue,
            Completed: completed,
            LastUpdated: now,
            Source: "ESPN_GAME_SUMMARY"
          });
        });
        return;
      }

      let value = stat.value !== undefined ? sportsAdvancedNumber_(stat.value, "") : sportsAdvancedNumber_(displayValue, "");
      if (value === "" && statType === "possession-time") return;
      if (value === "") return;

      rows.push({
        GameId: gameId,
        ESPNEventId: eventId,
        TeamId: teamId,
        Team: teamName,
        Sport: sport,
        League: league,
        StatType: statType,
        StatValue: value,
        DisplayValue: displayValue || String(value),
        Completed: completed,
        LastUpdated: now,
        Source: "ESPN_GAME_SUMMARY"
      });
    });
  });

  sportsAdvancedDerivedTeamStats_(summary, score, rows).forEach(function(row) {
    rows.push(row);
  });

  return rows;
}

function sportsAdvancedFindScore_(gameId, espnEventId) {
  if (typeof sportsPlayersFindScoreById_ === "function") {
    return sportsPlayersFindScoreById_(gameId, espnEventId);
  }
  if (typeof readSportsScoresRows_ !== "function") return null;
  const targetGame = sportsAdvancedString_(gameId);
  const targetEvent = sportsAdvancedString_(espnEventId);
  return readSportsScoresRows_().find(function(row) {
    return (targetGame && sportsAdvancedString_(row.GameId) === targetGame) ||
      (targetEvent && sportsAdvancedString_(row.ESPNEventId) === targetEvent);
  }) || null;
}

function sportsAdvancedFetchSummary_(score) {
  const sport = sportsAdvancedKey_(score.Sport);
  const league = sportsAdvancedKey_(score.League);
  const eventId = sportsAdvancedString_(score.ESPNEventId);
  if (!sport || !league || !eventId) throw new Error("Game is missing Sport, League, or ESPNEventId");

  if (typeof sportsPlayersFetchJson_ === "function" && typeof sportsPlayersSummaryUrl_ === "function") {
    return sportsPlayersFetchJson_(sportsPlayersSummaryUrl_(sport, league, eventId), "ESPN advanced game summary");
  }

  const url = "https://site.api.espn.com/apis/site/v2/sports/" + encodeURIComponent(sport) + "/" + encodeURIComponent(league) + "/summary?event=" + encodeURIComponent(eventId);
  const fetchOptions = { method: "get", muteHttpExceptions: true, followRedirects: true };
  const response = typeof sportsEspnFetch_ === "function"
    ? sportsEspnFetch_(url, fetchOptions)
    : UrlFetchApp.fetch(url, fetchOptions);
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) throw new Error("ESPN summary failed. HTTP " + code + ": " + text.slice(0, 200));
  return JSON.parse(text);
}

function refreshSportsAdvancedStatsForGame(gameId, espnEventId, options) {
  options = options || {};

  if (!options.skipSetup) {
    setupSportsAdvancedStatsSystem();
    if (typeof setupSportsPlayersSystem === "function") {
      setupSportsPlayersSystem();
    }
  }

  const score = sportsAdvancedFindScore_(gameId, espnEventId);
  if (!score) throw new Error("SportsScores game not found for gameId/espnEventId");

  const summary = sportsAdvancedFetchSummary_(score);
  const playerNormalized = typeof sportsPlayersNormalizeSummary_ === "function"
    ? sportsPlayersNormalizeSummary_(summary, score)
    : { players: [], stats: [] };
  const teamStats = sportsAdvancedNormalizeTeamStats_(summary, score);

  const playerWrite = typeof upsertSportsPlayersRows_ === "function"
    ? upsertSportsPlayersRows_(playerNormalized.players || [], {})
    : { inserted: 0, updated: 0 };
  const playerStatsWrite = typeof upsertSportsPlayerGameStatsRows_ === "function"
    ? upsertSportsPlayerGameStatsRows_(playerNormalized.stats || [])
    : { inserted: 0, updated: 0 };
  const teamStatsWrite = upsertSportsTeamGameStatsRows_(teamStats);

  const checkpointCapture = options.captureCheckpoints === false
    ? {
        success: true,
        skipped: true,
        reason: "Checkpoint capture disabled for this refresh",
        checkpointsCaptured: 0
      }
    : sportsAdvancedCaptureCheckpointsFromSummary_(
        score,
        summary,
        playerNormalized.stats || [],
        teamStats
      );

  return {
    success: true,
    gameId: sportsAdvancedString_(score.GameId),
    espnEventId: sportsAdvancedString_(score.ESPNEventId),
    sport: sportsAdvancedKey_(score.Sport),
    league: sportsAdvancedKey_(score.League),
    completed: sportsAdvancedBoolean_(score.Completed, false),
    playersFound: (playerNormalized.players || []).length,
    playerStatsFound: (playerNormalized.stats || []).length,
    teamStatsFound: teamStats.length,
    playerWrite: playerWrite,
    playerStatsWrite: playerStatsWrite,
    teamStatsWrite: teamStatsWrite,
    checkpointCapture: checkpointCapture,
    lastUpdated: new Date()
  };
}

function refreshCurrentSportsAdvancedStats(league, sport, options) {
  options = options || {};

  setupSportsAdvancedStatsSystem();
  if (typeof setupSportsPlayersSystem === "function") {
    setupSportsPlayersSystem();
  }

  const requestedMaxGames = Number(options.maxGames || 3);
  const maxGames = Math.max(1, Math.min(10, isFinite(requestedMaxGames) ? requestedMaxGames : 3));
  const requestedRuntime = Number(options.maxRuntimeMs || 240000);
  const maxRuntimeMs = Math.max(60000, Math.min(300000, isFinite(requestedRuntime) ? requestedRuntime : 240000));
  const deadline = Date.now() + maxRuntimeMs;

  const games = typeof sportsPlayersCurrentGames_ === "function"
    ? sportsPlayersCurrentGames_(league, sport, {
        gameId: options.gameId,
        espnEventId: options.espnEventId,
        daysBack: options.daysBack,
        daysForward: options.daysForward,
        maxGames: maxGames
      })
    : [];

  const summary = {
    success: true,
    league: sportsAdvancedKey_(league),
    gamesFound: games.length,
    gamesRefreshed: 0,
    gamesSkippedForRuntime: 0,
    playerStatsFound: 0,
    teamStatsFound: 0,
    results: [],
    errors: [],
    startedAt: new Date(),
    maxGames: maxGames,
    maxRuntimeMs: maxRuntimeMs
  };

  for (let i = 0; i < games.length; i++) {
    if (Date.now() >= deadline) {
      summary.gamesSkippedForRuntime = games.length - i;
      summary.stoppedEarly = true;
      summary.stopReason = "Runtime safety limit reached";
      break;
    }

    const game = games[i];

    try {
      const result = refreshSportsAdvancedStatsForGame(
        game.GameId,
        game.ESPNEventId,
        {
          skipSetup: true,
          captureCheckpoints: options.captureCheckpoints !== false
        }
      );

      summary.results.push(result);
      summary.gamesRefreshed++;
      summary.playerStatsFound += result.playerStatsFound || 0;
      summary.teamStatsFound += result.teamStatsFound || 0;
    } catch (error) {
      summary.errors.push({
        gameId: sportsAdvancedString_(game.GameId),
        espnEventId: sportsAdvancedString_(game.ESPNEventId),
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  summary.success = summary.errors.length === 0;
  summary.partial =
    summary.errors.length > 0 ||
    summary.gamesSkippedForRuntime > 0;
  summary.finishedAt = new Date();
  return summary;
}

function sportsAdvancedClockSeconds_(clock) {
  const raw = sportsAdvancedString_(clock);
  const match = raw.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sportsAdvancedCheckpointDefinitions_(score) {
  const sport = sportsAdvancedKey_(score.Sport);
  const definitions = [];

  if (sport === "baseball") {
    for (let inning = 1; inning <= 9; inning++) {
      definitions.push({
        type: "END_INNING_" + inning,
        value: inning,
        label: "End of inning " + inning,
        reached: function(game) {
          return Number(game.Period || 0) > inning || sportsAdvancedBoolean_(game.Completed, false);
        },
        exact: function() {
          /*
            ESPN does not expose an inning-boundary timestamp in the summary
            box score. A poll in the next inning may already include new plays,
            so inning checkpoints remain POLL_SNAPSHOT and require review.
          */
          return false;
        }
      });
    }
  }

  if (sport === "football") {
    [1, 2, 3, 4].forEach(function(quarter) {
      definitions.push({
        type: "END_Q" + quarter,
        value: quarter,
        label: quarter === 2 ? "Halftime" : "End of quarter " + quarter,
        reached: function(game) {
          return Number(game.Period || 0) > quarter || sportsAdvancedBoolean_(game.Completed, false);
        },
        exact: function() {
          /*
            A poll after the quarter changes may include plays from the next
            quarter. Keep period-boundary snapshots review-safe.
          */
          return false;
        }
      });
    });

    definitions.push({
      type: "FIRST_HALF_2MIN",
      value: 120,
      label: "First-half two-minute checkpoint",
      reached: function(game) {
        const period = Number(game.Period || 0);
        const seconds = sportsAdvancedClockSeconds_(game.Clock);
        return period > 2 || (period === 2 && seconds !== null && seconds <= 120) || sportsAdvancedBoolean_(game.Completed, false);
      },
      exact: function(game) {
        return Number(game.Period || 0) === 2 && sportsAdvancedClockSeconds_(game.Clock) === 120;
      }
    });
  }

  return definitions;
}

function sportsAdvancedCheckpointExists_(gameId, checkpointType) {
  const targetGame = sportsAdvancedString_(gameId);
  const targetType = sportsAdvancedString_(checkpointType);
  return readSportsStatCheckpointRows_().some(function(row) {
    return sportsAdvancedString_(row.GameId) === targetGame && sportsAdvancedString_(row.CheckpointType) === targetType;
  });
}

function sportsAdvancedCheckpointRows_(score, definition, playerStats, teamStats) {
  const rows = [];
  const capturedAt = new Date();
  const precision = definition.exact(score) ? "EXACT_BOUNDARY" : "POLL_SNAPSHOT";

  (playerStats || []).forEach(function(stat) {
    rows.push({
      SnapshotId: Utilities.getUuid(),
      GameId: stat.GameId,
      ESPNEventId: stat.ESPNEventId,
      EntityType: "PLAYER",
      EntityId: stat.PlayerId,
      EntityName: stat.PlayerName,
      TeamId: stat.TeamId,
      Sport: stat.Sport,
      League: stat.League,
      CheckpointType: definition.type,
      CheckpointValue: definition.value,
      CheckpointLabel: definition.label,
      ReachedPeriod: sportsAdvancedString_(score.Period),
      ReachedClock: sportsAdvancedString_(score.Clock),
      StatType: stat.StatType,
      StatValue: stat.StatValue,
      DisplayValue: stat.DisplayValue,
      Completed: sportsAdvancedBoolean_(score.Completed, false),
      CapturedAt: capturedAt,
      Source: "ESPN_GAME_SUMMARY_CHECKPOINT",
      Precision: precision
    });
  });

  (teamStats || []).forEach(function(stat) {
    rows.push({
      SnapshotId: Utilities.getUuid(),
      GameId: stat.GameId,
      ESPNEventId: stat.ESPNEventId,
      EntityType: "TEAM",
      EntityId: stat.TeamId,
      EntityName: stat.Team,
      TeamId: stat.TeamId,
      Sport: stat.Sport,
      League: stat.League,
      CheckpointType: definition.type,
      CheckpointValue: definition.value,
      CheckpointLabel: definition.label,
      ReachedPeriod: sportsAdvancedString_(score.Period),
      ReachedClock: sportsAdvancedString_(score.Clock),
      StatType: stat.StatType,
      StatValue: stat.StatValue,
      DisplayValue: stat.DisplayValue,
      Completed: sportsAdvancedBoolean_(score.Completed, false),
      CapturedAt: capturedAt,
      Source: "ESPN_GAME_SUMMARY_CHECKPOINT",
      Precision: precision
    });
  });

  return rows;
}

function sportsAdvancedSelectCurrentCheckpoint_(score, definitions, existingMap) {
  score = score || {};
  definitions = Array.isArray(definitions) ? definitions : [];
  existingMap = existingMap || {};

  if (sportsAdvancedBoolean_(score.Completed, false)) {
    return null;
  }

  const sport = sportsAdvancedKey_(score.Sport);
  const period = Number(score.Period || 0);
  const clockSeconds = sportsAdvancedClockSeconds_(score.Clock);
  let targetType = "";

  if (sport === "baseball") {
    if (period > 1) {
      targetType = "END_INNING_" + String(period - 1);
    }
  } else if (sport === "football") {
    if (period === 2 && clockSeconds !== null && clockSeconds <= 120) {
      targetType = "FIRST_HALF_2MIN";
    } else if (period > 1) {
      targetType = "END_Q" + String(period - 1);
    }
  }

  if (!targetType || existingMap[targetType]) {
    return null;
  }

  return definitions.find(function(definition) {
    return definition.type === targetType && definition.reached(score);
  }) || null;
}

function sportsAdvancedCaptureCheckpointsFromSummary_(score, summary, playerStats, teamStats) {
  score = score || {};

  if (sportsAdvancedBoolean_(score.Completed, false)) {
    return {
      success: true,
      skipped: true,
      gameId: sportsAdvancedString_(score.GameId),
      reason: "Completed games are not retroactively backfilled with checkpoint totals",
      checkpointsCaptured: 0
    };
  }

  const existingRows = readSportsStatCheckpointRows_();
  const existingMap = {};
  const targetGameId = sportsAdvancedString_(score.GameId);

  existingRows.forEach(function(row) {
    if (sportsAdvancedString_(row.GameId) === targetGameId) {
      existingMap[sportsAdvancedString_(row.CheckpointType)] = true;
    }
  });

  const definition = sportsAdvancedSelectCurrentCheckpoint_(
    score,
    sportsAdvancedCheckpointDefinitions_(score),
    existingMap
  );

  if (!definition) {
    return {
      success: true,
      skipped: true,
      gameId: targetGameId,
      reason: "No new current checkpoint is ready",
      checkpointsCaptured: 0
    };
  }

  const checkpointRows = sportsAdvancedCheckpointRows_(
    score,
    definition,
    playerStats || [],
    teamStats || []
  );

  const write = upsertSportsStatCheckpointRows_(checkpointRows);
  return {
    success: true,
    gameId: targetGameId,
    espnEventId: sportsAdvancedString_(score.ESPNEventId),
    checkpointsCaptured: 1,
    checkpointTypes: [definition.type],
    rowsFound: checkpointRows.length,
    write: write
  };
}

function captureSportsStatCheckpointsForGame_(score) {
  score = score || {};

  const completed = sportsAdvancedBoolean_(score.Completed, false);
  const state = sportsAdvancedKey_(score.State || score.Status || score.StatusType);
  if (!completed && ["in", "live", "in-progress", "inprogress"].indexOf(state) === -1) {
    return {
      success: true,
      skipped: true,
      gameId: sportsAdvancedString_(score.GameId),
      reason: "Player/team statistics refresh starts when the game is live",
      checkpointsCaptured: 0
    };
  }

  const summary = sportsAdvancedFetchSummary_(score);
  const playerNormalized = typeof sportsPlayersNormalizeSummary_ === "function"
    ? sportsPlayersNormalizeSummary_(summary, score)
    : { players: [], stats: [] };
  const teamStats = sportsAdvancedNormalizeTeamStats_(summary, score);

  const playerWrite = typeof upsertSportsPlayersRows_ === "function"
    ? upsertSportsPlayersRows_(playerNormalized.players || [], {})
    : { inserted: 0, updated: 0 };
  const playerStatsWrite = typeof upsertSportsPlayerGameStatsRows_ === "function"
    ? upsertSportsPlayerGameStatsRows_(playerNormalized.stats || [])
    : { inserted: 0, updated: 0 };
  const teamStatsWrite = upsertSportsTeamGameStatsRows_(teamStats);

  if (sportsAdvancedBoolean_(score.Completed, false)) {
    return {
      success: true,
      skipped: true,
      gameId: sportsAdvancedString_(score.GameId),
      reason: "Final player/team stats refreshed; completed games are not checkpoint-backfilled",
      playersFound: (playerNormalized.players || []).length,
      playerStatsFound: (playerNormalized.stats || []).length,
      teamStatsFound: teamStats.length,
      playerWrite: playerWrite,
      playerStatsWrite: playerStatsWrite,
      teamStatsWrite: teamStatsWrite,
      checkpointsCaptured: 0
    };
  }

  const checkpointResult = sportsAdvancedCaptureCheckpointsFromSummary_(
    score,
    summary,
    playerNormalized.stats || [],
    teamStats
  );
  checkpointResult.playersFound = (playerNormalized.players || []).length;
  checkpointResult.playerStatsFound = (playerNormalized.stats || []).length;
  checkpointResult.teamStatsFound = teamStats.length;
  checkpointResult.playerWrite = playerWrite;
  checkpointResult.playerStatsWrite = playerStatsWrite;
  checkpointResult.teamStatsWrite = teamStatsWrite;
  return checkpointResult;
}

function captureSportsStatCheckpointsForGames_(games) {
  games = Array.isArray(games) ? games : [];
  setupSportsAdvancedStatsSystem();

  const summary = {
    success: true,
    gamesChecked: games.length,
    gamesCaptured: 0,
    checkpointsCaptured: 0,
    results: [],
    errors: []
  };

  games.forEach(function(game) {
    try {
      const result = captureSportsStatCheckpointsForGame_(game);
      summary.results.push(result);
      if (!result.skipped) summary.gamesCaptured++;
      summary.checkpointsCaptured += result.checkpointsCaptured || 0;
    } catch (error) {
      summary.errors.push({
        gameId: sportsAdvancedString_(game.GameId),
        espnEventId: sportsAdvancedString_(game.ESPNEventId),
        error: error && error.message ? error.message : String(error)
      });
    }
  });

  summary.success = summary.errors.length === 0;
  summary.partial = summary.errors.length > 0 && summary.gamesCaptured > 0;
  return summary;
}

function sportsAdvancedIsCompletedBackfillRow_(row) {
  return sportsAdvancedBoolean_(row && row.Completed, false) &&
    sportsAdvancedString_(row && row.Source) === "ESPN_GAME_SUMMARY_CHECKPOINT";
}

function previewCompletedSportsCheckpointBackfillCleanup() {
  const rows = readSportsStatCheckpointRows_();
  const affected = rows.filter(sportsAdvancedIsCompletedBackfillRow_);
  const games = {};

  affected.forEach(function(row) {
    games[sportsAdvancedString_(row.GameId)] = true;
  });

  const result = {
    success: true,
    rowsToRemove: affected.length,
    gamesAffected: Object.keys(games).length,
    note: "Only checkpoint rows captured while Completed was TRUE are included"
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function cleanupCompletedSportsCheckpointBackfill() {
  const sheet = sportsAdvancedEnsureSheet_(
    SPORTS_STAT_CHECKPOINTS_SHEET,
    SPORTS_STAT_CHECKPOINTS_HEADERS
  );

  const data = sportsAdvancedRetry_("read checkpoint cleanup rows", function() {
    return sheet.getDataRange().getValues();
  });

  if (data.length <= 1) {
    return { success: true, removed: 0, remaining: 0 };
  }

  const headers = data[0].map(sportsAdvancedString_);
  const keep = [];
  let removed = 0;

  for (let i = 1; i < data.length; i++) {
    const rowObject = {};
    headers.forEach(function(header, index) {
      rowObject[header] = data[i][index];
    });

    if (sportsAdvancedIsCompletedBackfillRow_(rowObject)) {
      removed++;
    } else {
      keep.push(data[i]);
    }
  }

  if (!removed) {
    return { success: true, removed: 0, remaining: keep.length };
  }

  sportsAdvancedRetry_("clear completed checkpoint backfill rows", function() {
    sheet
      .getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), headers.length)
      .clearContent();
    return true;
  });

  if (keep.length) {
    sportsAdvancedRetry_("rewrite retained checkpoint rows", function() {
      sheet.getRange(2, 1, keep.length, headers.length).setValues(keep);
      return true;
    });
  }

  const result = {
    success: true,
    removed: removed,
    remaining: keep.length
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function getSportsAdvancedStatsStatus_() {
  const teams = readSportsTeamGameStatsRows_();
  const checkpoints = readSportsStatCheckpointRows_();
  const leagues = {};

  function ensure_(league, sport) {
    const key = sportsAdvancedKey_(league);
    if (!key) return null;
    if (!leagues[key]) {
      leagues[key] = {
        league: key,
        sport: sportsAdvancedKey_(sport),
        teamStatRowCount: 0,
        checkpointRowCount: 0,
        checkpointCount: 0,
        lastTeamStatsUpdated: "",
        lastCheckpointCaptured: ""
      };
    }
    return leagues[key];
  }

  const checkpointKeys = {};
  teams.forEach(function(row) {
    const item = ensure_(row.League, row.Sport);
    if (!item) return;
    item.teamStatRowCount++;
    const date = row.LastUpdated instanceof Date ? row.LastUpdated : new Date(row.LastUpdated || 0);
    const current = item.lastTeamStatsUpdated ? new Date(item.lastTeamStatsUpdated) : new Date(0);
    if (!isNaN(date.getTime()) && date > current) item.lastTeamStatsUpdated = date;
  });

  checkpoints.forEach(function(row) {
    const item = ensure_(row.League, row.Sport);
    if (!item) return;
    item.checkpointRowCount++;
    const key = [row.GameId, row.CheckpointType].join("|");
    if (!checkpointKeys[key]) {
      checkpointKeys[key] = true;
      item.checkpointCount++;
    }
    const date = row.CapturedAt instanceof Date ? row.CapturedAt : new Date(row.CapturedAt || 0);
    const current = item.lastCheckpointCaptured ? new Date(item.lastCheckpointCaptured) : new Date(0);
    if (!isNaN(date.getTime()) && date > current) item.lastCheckpointCaptured = date;
  });

  return {
    success: true,
    version: "1.2.0",
    teamStatRowCount: teams.length,
    checkpointRowCount: checkpoints.length,
    leagues: Object.keys(leagues).sort().map(function(key) { return leagues[key]; }),
    checkedAt: new Date()
  };
}

function apiGetSportsTeamGameStats_(params) {
  params = params || {};
  const gameId = sportsAdvancedString_(params.gameId);
  const eventId = sportsAdvancedString_(params.espnEventId || params.ESPNEventId);
  const league = sportsAdvancedKey_(params.league);
  const teamId = sportsAdvancedString_(params.teamId);
  const statType = sportsAdvancedSlug_(params.statType);
  const completed = sportsAdvancedString_(params.completed).toLowerCase();

  const rows = readSportsTeamGameStatsRows_().filter(function(row) {
    if (gameId && sportsAdvancedString_(row.GameId) !== gameId) return false;
    if (eventId && sportsAdvancedString_(row.ESPNEventId) !== eventId) return false;
    if (league && sportsAdvancedKey_(row.League) !== league) return false;
    if (teamId && sportsAdvancedString_(row.TeamId) !== teamId) return false;
    if (statType && sportsAdvancedSlug_(row.StatType) !== statType) return false;
    if (completed === "true" && !sportsAdvancedBoolean_(row.Completed, false)) return false;
    if (completed === "false" && sportsAdvancedBoolean_(row.Completed, false)) return false;
    return true;
  });

  return { success: true, count: rows.length, stats: rows, timestamp: new Date() };
}

function apiGetSportsStatCheckpoints_(params) {
  params = params || {};
  const gameId = sportsAdvancedString_(params.gameId);
  const eventId = sportsAdvancedString_(params.espnEventId || params.ESPNEventId);
  const entityType = sportsAdvancedString_(params.entityType).toUpperCase();
  const entityId = sportsAdvancedString_(params.entityId);
  const checkpointType = sportsAdvancedString_(params.checkpointType).toUpperCase();
  const statType = sportsAdvancedSlug_(params.statType);

  const rows = readSportsStatCheckpointRows_().filter(function(row) {
    if (gameId && sportsAdvancedString_(row.GameId) !== gameId) return false;
    if (eventId && sportsAdvancedString_(row.ESPNEventId) !== eventId) return false;
    if (entityType && sportsAdvancedString_(row.EntityType).toUpperCase() !== entityType) return false;
    if (entityId && sportsAdvancedString_(row.EntityId) !== entityId) return false;
    if (checkpointType && sportsAdvancedString_(row.CheckpointType).toUpperCase() !== checkpointType) return false;
    if (statType && sportsAdvancedSlug_(row.StatType) !== statType) return false;
    return true;
  });

  return { success: true, count: rows.length, checkpoints: rows, timestamp: new Date() };
}

function apiSetupSportsAdvancedStatsAdmin_(params) {
  assertSportsAdmin_(params || {});
  return setupSportsAdvancedStatsSystem();
}

function apiRefreshSportsAdvancedStatsAdmin_(params) {
  assertSportsAdmin_(params || {});
  if (params.gameId || params.espnEventId || params.ESPNEventId) {
    return refreshSportsAdvancedStatsForGame(params.gameId, params.espnEventId || params.ESPNEventId);
  }
  return refreshCurrentSportsAdvancedStats(params.league, params.sport, {
    daysBack: params.daysBack,
    daysForward: params.daysForward,
    maxGames: params.maxGames,
    maxRuntimeMs: params.maxRuntimeMs,
    captureCheckpoints: params.captureCheckpoints
  });
}

function apiGetSportsAdvancedStatsStatusAdmin_(params) {
  assertSportsAdmin_(params || {});
  return getSportsAdvancedStatsStatus_();
}

function testSetupSportsAdvancedStatsSystem() {
  return setupSportsAdvancedStatsSystem();
}

function testRefreshMLBAdvancedStats() {
  const result = refreshCurrentSportsAdvancedStats("mlb", "baseball", {
    daysBack: 0,
    daysForward: 0,
    maxGames: 1,
    maxRuntimeMs: 150000,
    captureCheckpoints: false
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function testRefreshMLBAdvancedStatsBatch() {
  const result = refreshCurrentSportsAdvancedStats("mlb", "baseball", {
    daysBack: 1,
    daysForward: 0,
    maxGames: 3,
    maxRuntimeMs: 240000,
    captureCheckpoints: true
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function testRefreshNFLAdvancedStats() {
  const result = refreshCurrentSportsAdvancedStats("nfl", "football", {
    daysBack: 1,
    daysForward: 0,
    maxGames: 1,
    maxRuntimeMs: 150000,
    captureCheckpoints: false
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function testGetSportsAdvancedStatsStatus() {
  const result = getSportsAdvancedStatsStatus_();
  console.log(JSON.stringify(result, null, 2));
  return result;
}
