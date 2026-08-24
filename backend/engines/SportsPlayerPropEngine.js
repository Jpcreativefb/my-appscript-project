/* =====================================================
   SPORTS PLAYER QUESTIONS ENGINE v1.3
   Lives in Awards App backend.

   Purpose:
   - Read SportsPlayers / SportsPlayerGameStats from the
     separate Sports Scores Engine.
   - Create Over / Under player-prop wager questions.
   - Create two-to-twelve-player matchup wagers or predictions.
   - Settle those questions from final ESPN player stats.

   Supported player-stat sports:
   - MLB
   - NFL and NCAA football
   - NBA, WNBA, NCAA men's and women's basketball
   - NHL
   - Configured ESPN soccer competitions
===================================================== */

const SPORTS_PLAYER_PROP_MARKET = "player-prop";
const SPORTS_PLAYER_PROP_VERSION = "sports-player-prop-v1";
const SPORTS_PLAYER_PROP_SECTION = "Player Props";
const SPORTS_PLAYER_MATCHUP_MARKET = "player-matchup";
const SPORTS_PLAYER_MATCHUP_VERSION = "sports-player-matchup-v1";
const SPORTS_PLAYER_MATCHUP_SECTION = "Player Matchups";

const SPORTS_PLAYER_PROP_CATEGORY_HEADERS = [
  "SportsPlayerId",
  "SportsPlayerName",
  "SportsStatType",
  "SportsPropLine",
  "SportsPropSide",
  "SportsComparisonMode",
  "SportsQuestionMode",
  "SportsTieMode"
];

const SPORTS_PLAYER_PROP_SETTING_HEADERS = [
  "SportsPlayerId",
  "SportsPlayerName",
  "SportsStatType",
  "SportsPropLine",
  "SportsPropSide",
  "SportsComparisonMode",
  "SportsQuestionMode",
  "SportsTieMode"
];

function sportsPlayerPropString_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function sportsPlayerPropKey_(value) {
  return sportsPlayerPropString_(value).toLowerCase();
}

function sportsPlayerPropSlug_(value) {
  return sportsPlayerPropKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sportsPlayerPropNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return isFinite(number) ? number : fallback;
}

function sportsPlayerPropBoolean_(value, fallback) {
  if (value === true || value === false) return value;
  const key = sportsPlayerPropKey_(value);
  if (["true", "yes", "1", "on"].indexOf(key) !== -1) return true;
  if (["false", "no", "0", "off"].indexOf(key) !== -1) return false;
  return fallback;
}

function sportsPlayerPropHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    const key = sportsPlayerPropString_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function sportsPlayerPropSet_(row, col, header, value) {
  if (col[header] !== undefined) row[col[header]] = value;
}

function sportsPlayerPropEnsureHeaders_(sheetName, headers) {
  if (typeof sportsWagerEnsureColumns_ === "function") {
    return sportsWagerEnsureColumns_(sheetName, headers);
  }

  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return { success: true, added: headers.slice() };
  }

  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(sportsPlayerPropString_);

  const missing = headers.filter(function(header) {
    return existing.indexOf(header) === -1;
  });

  if (missing.length) {
    sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length)
      .setValues([missing]);
  }

  return { success: true, added: missing };
}

function setupSportsPlayerPropSystem() {
  const categories = sportsPlayerPropEnsureHeaders_(
    typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories",
    SPORTS_PLAYER_PROP_CATEGORY_HEADERS
  );

  const settings = sportsPlayerPropEnsureHeaders_(
    typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings",
    SPORTS_PLAYER_PROP_SETTING_HEADERS.concat([
      "LayoutType",
      "ShortName",
      "LockDateTime",
      "VotingTypes",
      "SportsGameId",
      "ESPNEventId",
      "SportsMarket",
      "SportsLeague",
      "QuestionType",
      "ScoringEngine",
      "ScoreMode",
      "SelectionMode",
      "OddsMode",
      "ResultSource",
      "SettlementStatus",
      "WagerResultType",
      "OddsReady",
      "OddsSource",
      "OddsLastUpdated",
      "ResultSourceType",
      "ResultProvider",
      "ExternalEventId",
      "ExternalSubjectId",
      "StatKey",
      "ComparisonOperator",
      "Threshold",
      "AutoSettle",
      "RequireAdminReview",
      "SourceConfigJSON"
    ])
  );

  return {
    success: true,
    version: "1.3",
    categories: categories,
    categorySettings: settings,
    advancedQuestions:
      typeof setupSportsAdvancedQuestionSystem === "function"
        ? setupSportsAdvancedQuestionSystem()
        : null
  };
}

function sportsPlayerPropRequireWagerGame_(gameId) {
  gameId = sportsPlayerPropString_(gameId);

  if (!gameId) {
    throw new Error("Awards Game is required.");
  }

  if (typeof getBettingGameConfig !== "function") {
    return { enabled: true, gameId: gameId };
  }

  const config = getBettingGameConfig(gameId) || {};

  if (config.enabled !== true) {
    throw new Error(
      "The selected Awards Game is not wager-enabled. Turn WagerEnabled ON in the Games sheet before creating player props."
    );
  }

  return config;
}

function sportsPlayerPropLeagueSport_(league, sport) {
  const leagueKey = sportsPlayerPropKey_(league);
  let sportKey = sportsPlayerPropKey_(sport);
  const leagueSports = {
    mlb: "baseball",
    nfl: "football",
    "college-football": "football",
    nba: "basketball",
    wnba: "basketball",
    "mens-college-basketball": "basketball",
    "womens-college-basketball": "basketball",
    nhl: "hockey"
  };
  if (!sportKey) {
    sportKey = leagueSports[leagueKey] || (leagueKey && leagueKey.indexOf(".") !== -1 ? "soccer" : "");
  }
  const allowedSports = {
    baseball: true,
    football: true,
    basketball: true,
    hockey: true,
    soccer: true
  };

  if (!allowedSports[sportKey]) {
    throw new Error("Player statistics are not supported for sport: " + sportsPlayerPropString_(sport || league));
  }

  if (!leagueKey) {
    throw new Error("A league is required for player statistics.");
  }

  return { league: leagueKey, sport: sportKey };
}

function sportsPlayerPropStatOptions_(league, sport) {
  const resolved = sportsPlayerPropLeagueSport_(league, sport);

  if (resolved.sport === "football") {
    return [
      ["passing-completions", "Passing Completions"],
      ["passing-attempts", "Passing Attempts"],
      ["passing-yards", "Passing Yards"],
      ["passing-touchdowns", "Passing Touchdowns"],
      ["interceptions-thrown", "Interceptions Thrown"],
      ["rushing-attempts", "Rushing Attempts"],
      ["rushing-yards", "Rushing Yards"],
      ["rushing-touchdowns", "Rushing Touchdowns"],
      ["receptions", "Receptions"],
      ["receiving-targets", "Receiving Targets"],
      ["receiving-yards", "Receiving Yards"],
      ["receiving-touchdowns", "Receiving Touchdowns"],
      ["field-goals-made", "Field Goals Made"],
      ["sacks", "Sacks"],
      ["tackles", "Tackles"],
      ["solo-tackles", "Solo Tackles"],
      ["interceptions", "Defensive Interceptions"]
    ];
  }

  if (resolved.sport === "baseball") {
    return [
      ["hits", "Hits"],
      ["home-runs", "Home Runs"],
      ["runs", "Runs"],
      ["runs-batted-in", "Runs Batted In"],
      ["walks", "Walks"],
      ["total-bases", "Total Bases"],
      ["stolen-bases", "Stolen Bases"],
      ["batting-strikeouts", "Batter Strikeouts"],
      ["pitching-strikeouts", "Pitcher Strikeouts"],
      ["innings-pitched", "Innings Pitched"],
      ["hits-allowed", "Hits Allowed"],
      ["runs-allowed", "Runs Allowed"],
      ["earned-runs", "Earned Runs"],
      ["pitching-walks", "Pitching Walks"],
      ["pitches", "Pitches"],
      ["strikes", "Strikes"]
    ];
  }

  if (resolved.sport === "basketball") {
    return [
      ["minutes", "Minutes"],
      ["points", "Points"],
      ["field-goals-made", "Field Goals Made"],
      ["field-goals-attempted", "Field Goals Attempted"],
      ["three-pointers-made", "Three-pointers Made"],
      ["three-pointers-attempted", "Three-pointers Attempted"],
      ["free-throws-made", "Free Throws Made"],
      ["free-throws-attempted", "Free Throws Attempted"],
      ["offensive-rebounds", "Offensive Rebounds"],
      ["defensive-rebounds", "Defensive Rebounds"],
      ["rebounds", "Rebounds"],
      ["assists", "Assists"],
      ["steals", "Steals"],
      ["blocks", "Blocks"],
      ["turnovers", "Turnovers"],
      ["fouls", "Personal Fouls"],
      ["plus-minus", "Plus/Minus"]
    ];
  }

  if (resolved.sport === "hockey") {
    return [
      ["minutes", "Time on Ice / Minutes"],
      ["goals", "Goals"],
      ["assists", "Assists"],
      ["points", "Points"],
      ["shots", "Shots"],
      ["shots-on-goal", "Shots on Goal"],
      ["hits", "Hits"],
      ["blocked-shots", "Blocked Shots"],
      ["penalty-minutes", "Penalty Minutes"],
      ["plus-minus", "Plus/Minus"],
      ["faceoff-wins", "Faceoff Wins"],
      ["saves", "Goalie Saves"],
      ["goals-against", "Goals Against"],
      ["save-percentage", "Save Percentage"]
    ];
  }

  return [
    ["minutes", "Minutes"],
    ["goals", "Goals"],
    ["assists", "Assists"],
    ["shots", "Shots"],
    ["shots-on-target", "Shots on Target"],
    ["saves", "Goalkeeper Saves"],
    ["fouls-committed", "Fouls Committed"],
    ["fouls-suffered", "Fouls Suffered"],
    ["yellow-cards", "Yellow Cards"],
    ["red-cards", "Red Cards"],
    ["offsides", "Offsides"],
    ["tackles", "Tackles"],
    ["interceptions", "Interceptions"],
    ["clearances", "Clearances"],
    ["passes-completed", "Passes Completed"],
    ["passes-attempted", "Passes Attempted"],
    ["chances-created", "Chances Created"]
  ];
}

function sportsPlayerPropStatLabel_(league, sport, statType) {
  const key = sportsPlayerPropSlug_(statType);
  const options = sportsPlayerPropStatOptions_(league, sport);
  for (let i = 0; i < options.length; i++) {
    if (options[i][0] === key) return options[i][1];
  }
  return key
    .split("-")
    .map(function(part) {
      return part ? part.charAt(0).toUpperCase() + part.slice(1) : "";
    })
    .join(" ");
}

function sportsPlayerPropAssertStat_(league, sport, statType) {
  const key = sportsPlayerPropSlug_(statType);
  const allowed = sportsPlayerPropStatOptions_(league, sport).some(function(item) {
    return item[0] === key;
  });
  if (!allowed) {
    throw new Error("Unsupported " + sportsPlayerPropString_(league).toUpperCase() + " player stat: " + statType);
  }
  return key;
}

function sportsPlayerPropFetch_(params, label) {
  if (typeof sportsWagerFetchJson_ !== "function") {
    throw new Error("SportsWagerEngine is required for Sports Player Props.");
  }

  const result = sportsWagerFetchJson_(params, label || "Sports Player Props");
  if (!result || result.success === false) {
    throw new Error(
      (result && (result.error || result.message || result.reason)) ||
      (label || "Sports Player Props") + " request failed."
    );
  }
  return result;
}

function sportsPlayerPropGetGame_(sportsGameId, espnEventId) {
  const result = sportsPlayerPropFetch_({
    action: "getSportsScores",
    gameId: sportsPlayerPropString_(sportsGameId),
    espnEventId: sportsPlayerPropString_(espnEventId)
  }, "Sports game lookup");

  const scores = Array.isArray(result.scores) ? result.scores : [];
  if (!scores.length) throw new Error("Sports game was not found in the Sports Scores Engine.");
  if (scores.length > 1) throw new Error("Sports game lookup returned more than one game.");
  return scores[0];
}

function sportsPlayerPropGetPlayer_(playerId, espnPlayerId, league) {
  const result = sportsPlayerPropFetch_({
    action: "getSportsPlayers",
    playerId: sportsPlayerPropString_(playerId),
    espnPlayerId: sportsPlayerPropString_(espnPlayerId),
    league: sportsPlayerPropKey_(league),
    active: "true",
    limit: 10
  }, "Sports player lookup");

  const players = Array.isArray(result.players) ? result.players : [];
  if (!players.length) throw new Error("Player was not found in SportsPlayers. Run Sync Players for the league first.");

  const exact = players.find(function(player) {
    return (
      (playerId && sportsPlayerPropString_(player.PlayerId) === sportsPlayerPropString_(playerId)) ||
      (espnPlayerId && sportsPlayerPropString_(player.ESPNPlayerId) === sportsPlayerPropString_(espnPlayerId))
    );
  });

  return exact || players[0];
}

function sportsPlayerPropTeamMatchesGame_(player, game) {
  const playerTeam = sportsPlayerPropSlug_(player.Team);
  const home = sportsPlayerPropSlug_(game.HomeTeam);
  const away = sportsPlayerPropSlug_(game.AwayTeam);

  if (!playerTeam || (!home && !away)) return true;
  return [home, away].some(function(team) {
    if (!team) return false;
    return (
      playerTeam === team ||
      playerTeam.indexOf(team) !== -1 ||
      team.indexOf(playerTeam) !== -1
    );
  });
}

function sportsPlayerPropCategoryId_(eventId, playerId, statType, line) {
  const lineKey = String(line).replace(/\./g, "-").replace(/[^0-9-]+/g, "");
  return [
    "player-prop",
    sportsPlayerPropSlug_(eventId),
    sportsPlayerPropSlug_(playerId).slice(-30),
    sportsPlayerPropSlug_(statType),
    lineKey || "line"
  ].join("-");
}

function sportsPlayerPropQuestion_(playerName, statLabel, line) {
  return "Will " + playerName + " record over " + line + " " + statLabel.toLowerCase() + "?";
}

function sportsPlayerPropCategoryExists_(awardsGameId, categoryId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(
    typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories"
  );
  if (!sheet || sheet.getLastRow() < 2) return false;

  const data = sheet.getDataRange().getValues();
  const col = sportsPlayerPropHeaderMap_(data[0]);

  for (let i = 1; i < data.length; i++) {
    const gameId = col.GameId === undefined ? "" : sportsPlayerPropString_(data[i][col.GameId]);
    const rowCategoryId = col.CategoryId === undefined ? "" : sportsPlayerPropKey_(data[i][col.CategoryId]);
    if (gameId === awardsGameId && rowCategoryId === sportsPlayerPropKey_(categoryId)) return true;
  }
  return false;
}

function sportsPlayerPropAppendCategoryRows_(config) {
  const sheetName = typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(sportsPlayerPropString_);
  const col = sportsPlayerPropHeaderMap_(headers);
  const now = new Date();

  const entries = [
    { side: "over", nominee: "Over " + config.line, odds: config.overOdds },
    { side: "under", nominee: "Under " + config.line, odds: config.underOdds }
  ];

  const rows = entries.map(function(entry) {
    const row = new Array(headers.length).fill("");
    sportsPlayerPropSet_(row, col, "GameId", config.awardsGameId);
    sportsPlayerPropSet_(row, col, "Category", config.categoryName);
    sportsPlayerPropSet_(row, col, "CategoryId", config.categoryId);
    sportsPlayerPropSet_(row, col, "Nominee", entry.nominee);
    sportsPlayerPropSet_(row, col, "NomineeId", entry.side);
    sportsPlayerPropSet_(row, col, "Section", config.league.toUpperCase() + " " + SPORTS_PLAYER_PROP_SECTION);
    sportsPlayerPropSet_(row, col, "ShortAnswer", entry.nominee);
    sportsPlayerPropSet_(row, col, "Active", true);
    sportsPlayerPropSet_(row, col, "PredictionGame", true);
    sportsPlayerPropSet_(row, col, "CommunityRank", false);
    sportsPlayerPropSet_(row, col, "QuestionType", "player-prop-over-under");
    sportsPlayerPropSet_(row, col, "ScoringEngine", "sports");
    sportsPlayerPropSet_(row, col, "SelectionMode", "single");
    sportsPlayerPropSet_(row, col, "EntryType", "prop-answer");
    sportsPlayerPropSet_(row, col, "OddsMode", "manual");
    sportsPlayerPropSet_(row, col, "ResultSource", "sports-player-stats");
    sportsPlayerPropSet_(row, col, "SportsProvider", "ESPN");
    sportsPlayerPropSet_(row, col, "SportsGameId", config.sportsGameId);
    sportsPlayerPropSet_(row, col, "ESPNEventId", config.espnEventId);
    sportsPlayerPropSet_(row, col, "SportsLeague", config.league);
    sportsPlayerPropSet_(row, col, "SportsMarket", SPORTS_PLAYER_PROP_MARKET);
    sportsPlayerPropSet_(row, col, "SportsSelection", entry.side);
    sportsPlayerPropSet_(row, col, "SportsLine", config.line);
    sportsPlayerPropSet_(row, col, "HomeTeam", sportsPlayerPropString_(config.game.HomeTeam));
    sportsPlayerPropSet_(row, col, "AwayTeam", sportsPlayerPropString_(config.game.AwayTeam));
    sportsPlayerPropSet_(row, col, "HomeRecord", sportsPlayerPropString_(config.game.HomeRecord));
    sportsPlayerPropSet_(row, col, "AwayRecord", sportsPlayerPropString_(config.game.AwayRecord));
    sportsPlayerPropSet_(row, col, "HomeScore", config.game.HomeScore);
    sportsPlayerPropSet_(row, col, "AwayScore", config.game.AwayScore);
    sportsPlayerPropSet_(row, col, "SportsStatus", sportsPlayerPropString_(config.game.Status));
    sportsPlayerPropSet_(row, col, "SportsState", sportsPlayerPropString_(config.game.State));
    sportsPlayerPropSet_(row, col, "SportsClock", sportsPlayerPropString_(config.game.Clock));
    sportsPlayerPropSet_(row, col, "SportsPeriod", sportsPlayerPropString_(config.game.Period));
    sportsPlayerPropSet_(row, col, "BettingOdds", entry.odds);
    sportsPlayerPropSet_(row, col, "OddsSource", "manual-player-prop");
    sportsPlayerPropSet_(row, col, "OddsLastUpdated", now);
    sportsPlayerPropSet_(row, col, "LogoUrl", sportsPlayerPropString_(config.player.HeadshotUrl));
    sportsPlayerPropSet_(row, col, "SportsPlayerId", config.playerId);
    sportsPlayerPropSet_(row, col, "SportsPlayerName", config.playerName);
    sportsPlayerPropSet_(row, col, "SportsStatType", config.statType);
    sportsPlayerPropSet_(row, col, "SportsPropLine", config.line);
    sportsPlayerPropSet_(row, col, "SportsPropSide", entry.side);
    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  return rows.length;
}

function sportsPlayerPropAppendSettingsRow_(config) {
  const sheetName = typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(sportsPlayerPropString_);
  const col = sportsPlayerPropHeaderMap_(headers);
  const row = new Array(headers.length).fill("");
  const lockDate = config.game.GameDateTime ? new Date(config.game.GameDateTime) : "";
  const validLock = lockDate instanceof Date && !isNaN(lockDate.getTime()) ? lockDate : "";

  sportsPlayerPropSet_(row, col, "GameId", config.awardsGameId);
  sportsPlayerPropSet_(row, col, "CategoryId", config.categoryId);
  sportsPlayerPropSet_(row, col, "Points", 1);
  sportsPlayerPropSet_(row, col, "Locked", false);
  sportsPlayerPropSet_(row, col, "WinnerNomineeId", "");
  sportsPlayerPropSet_(row, col, "ChangePenalty", 0);
  sportsPlayerPropSet_(row, col, "MaxChanges", 0);
  sportsPlayerPropSet_(row, col, "LockDateTime", validLock);
  sportsPlayerPropSet_(row, col, "DisplayOrder", validLock ? validLock.getTime() : 999);
  sportsPlayerPropSet_(row, col, "GroupId", config.league);
  sportsPlayerPropSet_(row, col, "LayoutType", "wager");
  sportsPlayerPropSet_(row, col, "ShortName", config.categoryName);
  sportsPlayerPropSet_(row, col, "CountsAsStatue", false);
  sportsPlayerPropSet_(row, col, "ScoreVersion", SPORTS_PLAYER_PROP_VERSION);
  sportsPlayerPropSet_(row, col, "QuestionType", "player-prop-over-under");
  sportsPlayerPropSet_(row, col, "ScoringEngine", "sports");
  sportsPlayerPropSet_(row, col, "SelectionMode", "single");
  sportsPlayerPropSet_(row, col, "ScoreMode", "wager");
  sportsPlayerPropSet_(row, col, "OddsMode", "manual");
  sportsPlayerPropSet_(row, col, "ResultSource", "sports-player-stats");
  sportsPlayerPropSet_(row, col, "SettlementStatus", "pending");
  sportsPlayerPropSet_(row, col, "SportsGameId", config.sportsGameId);
  sportsPlayerPropSet_(row, col, "ESPNEventId", config.espnEventId);
  sportsPlayerPropSet_(row, col, "SportsMarket", SPORTS_PLAYER_PROP_MARKET);
  sportsPlayerPropSet_(row, col, "SportsLeague", config.league);
  sportsPlayerPropSet_(row, col, "WagerResultType", "");
  sportsPlayerPropSet_(row, col, "OddsReady", true);
  sportsPlayerPropSet_(row, col, "OddsSource", "manual-player-prop");
  sportsPlayerPropSet_(row, col, "OddsLastUpdated", new Date());
  sportsPlayerPropSet_(row, col, "VotingTypes", "wager");
  sportsPlayerPropSet_(row, col, "ResultSourceType", "sports-stats");
  sportsPlayerPropSet_(row, col, "ResultProvider", "ESPN");
  sportsPlayerPropSet_(row, col, "ExternalEventId", config.espnEventId);
  sportsPlayerPropSet_(row, col, "ExternalSubjectId", config.playerId);
  sportsPlayerPropSet_(row, col, "StatKey", config.statType);
  sportsPlayerPropSet_(row, col, "ComparisonOperator", "over-under");
  sportsPlayerPropSet_(row, col, "Threshold", config.line);
  sportsPlayerPropSet_(row, col, "AutoSettle", true);
  sportsPlayerPropSet_(row, col, "RequireAdminReview", false);
  sportsPlayerPropSet_(row, col, "SportsPlayerId", config.playerId);
  sportsPlayerPropSet_(row, col, "SportsPlayerName", config.playerName);
  sportsPlayerPropSet_(row, col, "SportsStatType", config.statType);
  sportsPlayerPropSet_(row, col, "SportsPropLine", config.line);
  sportsPlayerPropSet_(row, col, "SportsPropSide", "over-under");
  sportsPlayerPropSet_(row, col, "SourceConfigJSON", JSON.stringify({
    version: "1.0",
    playerId: config.playerId,
    espnPlayerId: config.espnPlayerId,
    playerName: config.playerName,
    statType: config.statType,
    line: config.line,
    sportsGameId: config.sportsGameId,
    espnEventId: config.espnEventId,
    league: config.league,
    sport: config.sport
  }));

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  return true;
}

function createSportsPlayerProp(payload) {
  payload = payload || {};
  setupSportsPlayerPropSystem();

  const awardsGameId = sportsPlayerPropString_(payload.awardsGameId || payload.gameId);
  if (!awardsGameId) throw new Error("awardsGameId is required.");
  if (typeof validateGameId === "function") validateGameId(awardsGameId);
  sportsPlayerPropRequireWagerGame_(awardsGameId);

  const game = sportsPlayerPropGetGame_(payload.sportsGameId, payload.espnEventId);
  const resolved = sportsPlayerPropLeagueSport_(payload.league || game.League, payload.sport || game.Sport);
  const player = sportsPlayerPropGetPlayer_(
    payload.sportsPlayerId || payload.playerId,
    payload.espnPlayerId,
    resolved.league
  );

  if (!sportsPlayerPropTeamMatchesGame_(player, game) && payload.allowCrossTeam !== true) {
    throw new Error("The selected player does not appear to belong to either team in this game.");
  }

  const statType = sportsPlayerPropAssertStat_(resolved.league, resolved.sport, payload.sportsStatType || payload.statType);
  const line = sportsPlayerPropNumber_(payload.sportsPropLine !== undefined ? payload.sportsPropLine : payload.line, null);
  if (line === null) throw new Error("Player prop line is required.");

  const overOdds = sportsPlayerPropNumber_(payload.overOdds, 1.91);
  const underOdds = sportsPlayerPropNumber_(payload.underOdds, 1.91);
  if (overOdds <= 1 || underOdds <= 1) throw new Error("Over and Under odds must be greater than 1.00 decimal odds.");

  const sportsGameId = sportsPlayerPropString_(game.GameId || payload.sportsGameId);
  const espnEventId = sportsPlayerPropString_(game.ESPNEventId || payload.espnEventId);
  const playerId = sportsPlayerPropString_(player.PlayerId || payload.sportsPlayerId || payload.playerId);
  const playerName = sportsPlayerPropString_(player.FullName || player.ShortName || payload.sportsPlayerName);
  const espnPlayerId = sportsPlayerPropString_(player.ESPNPlayerId || payload.espnPlayerId);
  const statLabel = sportsPlayerPropStatLabel_(resolved.league, resolved.sport, statType);
  const categoryId = sportsPlayerPropKey_(payload.categoryId) || sportsPlayerPropCategoryId_(espnEventId, playerId, statType, line);
  const categoryName = sportsPlayerPropString_(payload.categoryName) || sportsPlayerPropQuestion_(playerName, statLabel, line);

  if (sportsPlayerPropCategoryExists_(awardsGameId, categoryId)) {
    return {
      success: false,
      duplicate: true,
      awardsGameId: awardsGameId,
      categoryId: categoryId,
      message: "This player prop already exists in the selected Awards Game."
    };
  }

  const config = {
    awardsGameId: awardsGameId,
    categoryId: categoryId,
    categoryName: categoryName,
    sportsGameId: sportsGameId,
    espnEventId: espnEventId,
    league: resolved.league,
    sport: resolved.sport,
    player: player,
    playerId: playerId,
    espnPlayerId: espnPlayerId,
    playerName: playerName,
    statType: statType,
    statLabel: statLabel,
    line: line,
    overOdds: overOdds,
    underOdds: underOdds,
    game: game
  };

  const categoryRows = sportsPlayerPropAppendCategoryRows_(config);
  const settingRow = sportsPlayerPropAppendSettingsRow_(config);
  SpreadsheetApp.flush();
  if (typeof clearGameDataCaches === "function") clearGameDataCaches(awardsGameId, ["Categories", "CategorySettings", "CategoryResults"]);
  else if (typeof clearGameCaches === "function") clearGameCaches(awardsGameId);

  return {
    success: true,
    version: "1.0",
    awardsGameId: awardsGameId,
    categoryId: categoryId,
    category: categoryName,
    categoryRows: categoryRows,
    settingRow: settingRow,
    sportsGameId: sportsGameId,
    espnEventId: espnEventId,
    playerId: playerId,
    playerName: playerName,
    statType: statType,
    statLabel: statLabel,
    line: line,
    overOdds: overOdds,
    underOdds: underOdds,
    oddsSource: "manual-player-prop"
  };
}


/* =====================================================
   PLAYER MATCHUPS v1
   Two or more players from the same game, one shared stat.
   Supports normal predictions (Picks) and wagers (Bets).
===================================================== */

function sportsPlayerMatchupParsePlayers_(value) {
  if (Array.isArray(value)) return value;
  const raw = sportsPlayerPropString_(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function sportsPlayerMatchupRequirePredictionGame_(gameId) {
  gameId = sportsPlayerPropString_(gameId);
  if (!gameId) throw new Error("Awards Game is required.");
  if (typeof gameSupportsFeature === "function") {
    if (!gameSupportsFeature(gameId, "prediction")) {
      throw new Error(
        "The selected Awards Game is not prediction-enabled. Turn PredictionEnabled ON in the Games sheet before creating a player matchup prediction."
      );
    }
    return true;
  }
  const game = typeof getGameRuntimeConfig === "function"
    ? getGameRuntimeConfig(gameId)
    : typeof getGame === "function"
      ? getGame(gameId)
      : null;
  if (game && game.predictionEnabled !== true) {
    throw new Error("The selected Awards Game is not prediction-enabled.");
  }
  return true;
}

function sportsPlayerMatchupCategoryId_(eventId, statType, players) {
  const ids = (players || [])
    .map(function(player) {
      return sportsPlayerPropSlug_(player.playerId || player.PlayerId || player.espnPlayerId || player.ESPNPlayerId);
    })
    .filter(Boolean)
    .sort();
  return [
    "player-matchup",
    sportsPlayerPropSlug_(eventId),
    sportsPlayerPropSlug_(statType),
    ids.join("-").slice(0, 90)
  ].join("-");
}

function sportsPlayerMatchupQuestion_(statLabel) {
  return "Which player will record the most " + sportsPlayerPropString_(statLabel).toLowerCase() + "?";
}

function sportsPlayerMatchupResolve_(entries) {
  const usable = (entries || []).filter(function(entry) {
    return entry && entry.value !== null && entry.value !== undefined && isFinite(Number(entry.value));
  });
  if (usable.length < 2) {
    return { resolved: false, winnerNomineeId: "", wagerResultType: "", tied: false, leaders: [] };
  }
  let maxValue = -Infinity;
  usable.forEach(function(entry) {
    maxValue = Math.max(maxValue, Number(entry.value));
  });
  const leaders = usable.filter(function(entry) {
    return Number(entry.value) === maxValue;
  });
  if (leaders.length !== 1) {
    return {
      resolved: true,
      winnerNomineeId: "push",
      wagerResultType: "push",
      tied: true,
      maxValue: maxValue,
      leaders: leaders
    };
  }
  return {
    resolved: true,
    winnerNomineeId: leaders[0].nomineeId,
    wagerResultType: "win",
    tied: false,
    maxValue: maxValue,
    leaders: leaders
  };
}

function sportsPlayerMatchupAppendCategoryRows_(config) {
  const sheetName = typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(sportsPlayerPropString_);
  const col = sportsPlayerPropHeaderMap_(headers);
  const now = new Date();
  const rows = config.players.map(function(player, index) {
    const row = new Array(headers.length).fill("");
    const nomineeId = sportsPlayerPropSlug_(player.PlayerId || player.ESPNPlayerId || ("player-" + index));
    sportsPlayerPropSet_(row, col, "GameId", config.awardsGameId);
    sportsPlayerPropSet_(row, col, "Category", config.categoryName);
    sportsPlayerPropSet_(row, col, "CategoryId", config.categoryId);
    sportsPlayerPropSet_(row, col, "Nominee", player.FullName || player.ShortName || player.PlayerName);
    sportsPlayerPropSet_(row, col, "NomineeId", nomineeId);
    sportsPlayerPropSet_(row, col, "Section", config.league.toUpperCase() + " " + SPORTS_PLAYER_MATCHUP_SECTION);
    sportsPlayerPropSet_(row, col, "ShortAnswer", player.FullName || player.ShortName || player.PlayerName);
    sportsPlayerPropSet_(row, col, "Active", true);
    sportsPlayerPropSet_(row, col, "PredictionGame", true);
    sportsPlayerPropSet_(row, col, "CommunityRank", false);
    sportsPlayerPropSet_(row, col, "QuestionType", "player-matchup-multi");
    sportsPlayerPropSet_(row, col, "ScoringEngine", "sports");
    sportsPlayerPropSet_(row, col, "SelectionMode", "single");
    sportsPlayerPropSet_(row, col, "EntryType", "player-matchup");
    sportsPlayerPropSet_(row, col, "OddsMode", config.questionMode === "wager" ? "manual" : "none");
    sportsPlayerPropSet_(row, col, "ResultSource", "sports-player-stats");
    sportsPlayerPropSet_(row, col, "SportsProvider", "ESPN");
    sportsPlayerPropSet_(row, col, "SportsGameId", config.sportsGameId);
    sportsPlayerPropSet_(row, col, "ESPNEventId", config.espnEventId);
    sportsPlayerPropSet_(row, col, "SportsLeague", config.league);
    sportsPlayerPropSet_(row, col, "SportsMarket", SPORTS_PLAYER_MATCHUP_MARKET);
    sportsPlayerPropSet_(row, col, "SportsSelection", nomineeId);
    sportsPlayerPropSet_(row, col, "HomeTeam", sportsPlayerPropString_(config.game.HomeTeam));
    sportsPlayerPropSet_(row, col, "AwayTeam", sportsPlayerPropString_(config.game.AwayTeam));
    sportsPlayerPropSet_(row, col, "SportsStatus", sportsPlayerPropString_(config.game.Status));
    sportsPlayerPropSet_(row, col, "SportsState", sportsPlayerPropString_(config.game.State));
    sportsPlayerPropSet_(row, col, "SportsClock", sportsPlayerPropString_(config.game.Clock));
    sportsPlayerPropSet_(row, col, "SportsPeriod", sportsPlayerPropString_(config.game.Period));
    if (config.questionMode === "wager") {
      sportsPlayerPropSet_(row, col, "BettingOdds", sportsPlayerPropNumber_(player.odds, config.defaultOdds));
      sportsPlayerPropSet_(row, col, "OddsSource", "manual-player-matchup");
      sportsPlayerPropSet_(row, col, "OddsLastUpdated", now);
    }
    sportsPlayerPropSet_(row, col, "LogoUrl", sportsPlayerPropString_(player.HeadshotUrl));
    sportsPlayerPropSet_(row, col, "SportsPlayerId", sportsPlayerPropString_(player.PlayerId));
    sportsPlayerPropSet_(row, col, "SportsPlayerName", sportsPlayerPropString_(player.FullName || player.ShortName || player.PlayerName));
    sportsPlayerPropSet_(row, col, "SportsStatType", config.statType);
    sportsPlayerPropSet_(row, col, "SportsPropSide", "player");
    sportsPlayerPropSet_(row, col, "SportsComparisonMode", "highest");
    sportsPlayerPropSet_(row, col, "SportsQuestionMode", config.questionMode);
    sportsPlayerPropSet_(row, col, "SportsTieMode", "push");
    return row;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  return rows.length;
}

function sportsPlayerMatchupAppendSettingsRow_(config) {
  const sheetName = typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(sportsPlayerPropString_);
  const col = sportsPlayerPropHeaderMap_(headers);
  const row = new Array(headers.length).fill("");
  const lockDate = config.game.GameDateTime ? new Date(config.game.GameDateTime) : "";
  const validLock = lockDate instanceof Date && !isNaN(lockDate.getTime()) ? lockDate : "";
  const playerIds = config.players.map(function(player) { return sportsPlayerPropString_(player.PlayerId); });
  const playerNames = config.players.map(function(player) { return sportsPlayerPropString_(player.FullName || player.ShortName || player.PlayerName); });

  sportsPlayerPropSet_(row, col, "GameId", config.awardsGameId);
  sportsPlayerPropSet_(row, col, "CategoryId", config.categoryId);
  sportsPlayerPropSet_(row, col, "Points", config.points);
  sportsPlayerPropSet_(row, col, "Locked", false);
  sportsPlayerPropSet_(row, col, "WinnerNomineeId", "");
  sportsPlayerPropSet_(row, col, "ChangePenalty", 0);
  sportsPlayerPropSet_(row, col, "MaxChanges", 0);
  sportsPlayerPropSet_(row, col, "LockDateTime", validLock);
  sportsPlayerPropSet_(row, col, "DisplayOrder", validLock ? validLock.getTime() : 999);
  sportsPlayerPropSet_(row, col, "GroupId", config.league);
  sportsPlayerPropSet_(row, col, "LayoutType", config.questionMode === "wager" ? "wager" : "list");
  sportsPlayerPropSet_(row, col, "ShortName", config.categoryName);
  sportsPlayerPropSet_(row, col, "CountsAsStatue", false);
  sportsPlayerPropSet_(row, col, "ScoreVersion", SPORTS_PLAYER_MATCHUP_VERSION);
  sportsPlayerPropSet_(row, col, "QuestionType", "player-matchup-multi");
  sportsPlayerPropSet_(row, col, "ScoringEngine", "sports");
  sportsPlayerPropSet_(row, col, "SelectionMode", "single");
  sportsPlayerPropSet_(row, col, "ScoreMode", config.questionMode === "wager" ? "wager" : "correct-pick");
  sportsPlayerPropSet_(row, col, "OddsMode", config.questionMode === "wager" ? "manual" : "none");
  sportsPlayerPropSet_(row, col, "ResultSource", "sports-player-stats");
  sportsPlayerPropSet_(row, col, "SettlementStatus", "pending");
  sportsPlayerPropSet_(row, col, "SportsGameId", config.sportsGameId);
  sportsPlayerPropSet_(row, col, "ESPNEventId", config.espnEventId);
  sportsPlayerPropSet_(row, col, "SportsMarket", SPORTS_PLAYER_MATCHUP_MARKET);
  sportsPlayerPropSet_(row, col, "SportsLeague", config.league);
  sportsPlayerPropSet_(row, col, "WagerResultType", "");
  sportsPlayerPropSet_(row, col, "OddsReady", config.questionMode === "wager");
  sportsPlayerPropSet_(row, col, "OddsSource", config.questionMode === "wager" ? "manual-player-matchup" : "");
  sportsPlayerPropSet_(row, col, "OddsLastUpdated", config.questionMode === "wager" ? new Date() : "");
  sportsPlayerPropSet_(row, col, "VotingTypes", config.questionMode === "wager" ? "wager" : "prediction");
  sportsPlayerPropSet_(row, col, "ResultSourceType", "sports-stats");
  sportsPlayerPropSet_(row, col, "ResultProvider", "ESPN");
  sportsPlayerPropSet_(row, col, "ExternalEventId", config.espnEventId);
  sportsPlayerPropSet_(row, col, "ExternalSubjectId", playerIds.join(","));
  sportsPlayerPropSet_(row, col, "StatKey", config.statType);
  sportsPlayerPropSet_(row, col, "ComparisonOperator", "highest");
  sportsPlayerPropSet_(row, col, "Threshold", "");
  sportsPlayerPropSet_(row, col, "AutoSettle", true);
  sportsPlayerPropSet_(row, col, "RequireAdminReview", false);
  sportsPlayerPropSet_(row, col, "SportsPlayerId", playerIds.join(","));
  sportsPlayerPropSet_(row, col, "SportsPlayerName", playerNames.join(", "));
  sportsPlayerPropSet_(row, col, "SportsStatType", config.statType);
  sportsPlayerPropSet_(row, col, "SportsPropSide", "highest");
  sportsPlayerPropSet_(row, col, "SportsComparisonMode", "highest");
  sportsPlayerPropSet_(row, col, "SportsQuestionMode", config.questionMode);
  sportsPlayerPropSet_(row, col, "SportsTieMode", "push");
  sportsPlayerPropSet_(row, col, "SourceConfigJSON", JSON.stringify({
    version: "1.0",
    questionMode: config.questionMode,
    comparisonMode: "highest",
    tieMode: "push",
    statType: config.statType,
    sportsGameId: config.sportsGameId,
    espnEventId: config.espnEventId,
    league: config.league,
    sport: config.sport,
    players: config.players.map(function(player) {
      return {
        playerId: sportsPlayerPropString_(player.PlayerId),
        espnPlayerId: sportsPlayerPropString_(player.ESPNPlayerId),
        playerName: sportsPlayerPropString_(player.FullName || player.ShortName || player.PlayerName),
        nomineeId: sportsPlayerPropSlug_(player.PlayerId || player.ESPNPlayerId),
        odds: config.questionMode === "wager" ? sportsPlayerPropNumber_(player.odds, config.defaultOdds) : ""
      };
    })
  }));

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  return true;
}

function createSportsPlayerMatchup(payload) {
  payload = payload || {};
  setupSportsPlayerPropSystem();
  const awardsGameId = sportsPlayerPropString_(payload.awardsGameId || payload.gameId);
  if (!awardsGameId) throw new Error("awardsGameId is required.");
  if (typeof validateGameId === "function") validateGameId(awardsGameId);

  const questionMode = sportsPlayerPropKey_(payload.questionMode || payload.mode || "wager") === "prediction"
    ? "prediction"
    : "wager";
  if (questionMode === "wager") sportsPlayerPropRequireWagerGame_(awardsGameId);
  else sportsPlayerMatchupRequirePredictionGame_(awardsGameId);

  const game = sportsPlayerPropGetGame_(payload.sportsGameId, payload.espnEventId);
  const resolved = sportsPlayerPropLeagueSport_(payload.league || game.League, payload.sport || game.Sport);
  const statType = sportsPlayerPropAssertStat_(resolved.league, resolved.sport, payload.sportsStatType || payload.statType);
  const requestedPlayers = sportsPlayerMatchupParsePlayers_(payload.players || payload.playersJSON);
  if (requestedPlayers.length < 2) throw new Error("Select at least two players for a matchup.");
  if (requestedPlayers.length > 12) throw new Error("Player matchups support up to 12 players.");

  const seen = {};
  const players = requestedPlayers.map(function(requested) {
    const player = sportsPlayerPropGetPlayer_(
      requested.playerId || requested.PlayerId || requested.sportsPlayerId,
      requested.espnPlayerId || requested.ESPNPlayerId,
      resolved.league
    );
    const playerId = sportsPlayerPropString_(player.PlayerId || requested.playerId || requested.PlayerId);
    if (!playerId || seen[playerId]) return null;
    seen[playerId] = true;
    if (!sportsPlayerPropTeamMatchesGame_(player, game) && payload.allowCrossTeam !== true) {
      throw new Error("The selected player " + (player.FullName || player.ShortName || playerId) + " is not on either team in this game.");
    }
    player.odds = sportsPlayerPropNumber_(requested.odds, sportsPlayerPropNumber_(payload.defaultOdds, 1.91));
    if (questionMode === "wager" && player.odds <= 1) {
      throw new Error("Every selected player's decimal odds must be greater than 1.00.");
    }
    return player;
  }).filter(Boolean);

  if (players.length < 2) throw new Error("Select at least two different players for a matchup.");

  const sportsGameId = sportsPlayerPropString_(game.GameId || payload.sportsGameId);
  const espnEventId = sportsPlayerPropString_(game.ESPNEventId || payload.espnEventId);
  const statLabel = sportsPlayerPropStatLabel_(resolved.league, resolved.sport, statType);
  const categoryId = sportsPlayerPropKey_(payload.categoryId) || sportsPlayerMatchupCategoryId_(espnEventId, statType, players);
  const categoryName = sportsPlayerPropString_(payload.categoryName) || sportsPlayerMatchupQuestion_(statLabel);
  if (sportsPlayerPropCategoryExists_(awardsGameId, categoryId)) {
    return {
      success: false,
      duplicate: true,
      awardsGameId: awardsGameId,
      categoryId: categoryId,
      message: "This player matchup already exists in the selected Awards Game."
    };
  }

  const config = {
    awardsGameId: awardsGameId,
    categoryId: categoryId,
    categoryName: categoryName,
    questionMode: questionMode,
    points: Math.max(1, sportsPlayerPropNumber_(payload.points, 1)),
    defaultOdds: sportsPlayerPropNumber_(payload.defaultOdds, 1.91),
    sportsGameId: sportsGameId,
    espnEventId: espnEventId,
    league: resolved.league,
    sport: resolved.sport,
    statType: statType,
    statLabel: statLabel,
    players: players,
    game: game
  };

  const categoryRows = sportsPlayerMatchupAppendCategoryRows_(config);
  const settingRow = sportsPlayerMatchupAppendSettingsRow_(config);
  SpreadsheetApp.flush();
  if (typeof clearGameDataCaches === "function") clearGameDataCaches(awardsGameId, ["Categories", "CategorySettings", "CategoryResults"]);
  else if (typeof clearGameCaches === "function") clearGameCaches(awardsGameId);

  return {
    success: true,
    version: "1.0",
    market: SPORTS_PLAYER_MATCHUP_MARKET,
    questionMode: questionMode,
    awardsGameId: awardsGameId,
    categoryId: categoryId,
    category: categoryName,
    categoryRows: categoryRows,
    settingRow: settingRow,
    sportsGameId: sportsGameId,
    espnEventId: espnEventId,
    statType: statType,
    statLabel: statLabel,
    playerCount: players.length,
    players: players.map(function(player) {
      return {
        playerId: player.PlayerId,
        playerName: player.FullName || player.ShortName,
        odds: questionMode === "wager" ? player.odds : ""
      };
    })
  };
}

function sportsPlayerMatchupReadItems_(awardsGameId) {
  const ss = SpreadsheetApp.getActive();
  const settingsSheet = ss.getSheetByName(typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings");
  const categoriesSheet = ss.getSheetByName(typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories");
  if (!settingsSheet || !categoriesSheet || settingsSheet.getLastRow() < 2 || categoriesSheet.getLastRow() < 2) return [];

  const categoryData = categoriesSheet.getDataRange().getValues();
  const categoryCol = sportsPlayerPropHeaderMap_(categoryData[0]);
  const categories = {};
  for (let i = 1; i < categoryData.length; i++) {
    const gameId = categoryCol.GameId === undefined ? "" : sportsPlayerPropString_(categoryData[i][categoryCol.GameId]);
    if (awardsGameId && gameId !== awardsGameId) continue;
    const categoryId = categoryCol.CategoryId === undefined ? "" : sportsPlayerPropKey_(categoryData[i][categoryCol.CategoryId]);
    if (!categoryId) continue;
    const market = categoryCol.SportsMarket === undefined ? "" : sportsPlayerPropKey_(categoryData[i][categoryCol.SportsMarket]);
    if (market !== SPORTS_PLAYER_MATCHUP_MARKET) continue;
    const categoryKey = gameId + "|" + categoryId;
    if (!categories[categoryKey]) categories[categoryKey] = { gameId: gameId, categoryId: categoryId, nominees: [] };
    categories[categoryKey].nominees.push({
      nomineeId: categoryCol.NomineeId === undefined ? "" : sportsPlayerPropKey_(categoryData[i][categoryCol.NomineeId]),
      playerId: categoryCol.SportsPlayerId === undefined ? "" : sportsPlayerPropString_(categoryData[i][categoryCol.SportsPlayerId]),
      playerName: categoryCol.SportsPlayerName !== undefined
        ? sportsPlayerPropString_(categoryData[i][categoryCol.SportsPlayerName])
        : categoryCol.Nominee !== undefined
          ? sportsPlayerPropString_(categoryData[i][categoryCol.Nominee])
          : ""
    });
  }

  const settingsData = settingsSheet.getDataRange().getValues();
  const col = sportsPlayerPropHeaderMap_(settingsData[0]);
  const items = [];
  for (let i = 1; i < settingsData.length; i++) {
    const categoryId = col.CategoryId === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.CategoryId]);
    const rowGameId = col.GameId === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.GameId]);
    const category = categories[rowGameId + "|" + categoryId];
    if (!category) continue;
    if (awardsGameId && rowGameId && rowGameId !== awardsGameId) continue;
    const market = col.SportsMarket === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.SportsMarket]);
    if (market !== SPORTS_PLAYER_MATCHUP_MARKET) continue;
    items.push({
      rowNumber: i + 1,
      awardsGameId: category.gameId || rowGameId,
      categoryId: categoryId,
      sportsGameId: col.SportsGameId === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.SportsGameId]),
      espnEventId: col.ESPNEventId === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.ESPNEventId]),
      league: col.SportsLeague === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.SportsLeague]),
      statType: col.SportsStatType !== undefined
        ? sportsPlayerPropSlug_(settingsData[i][col.SportsStatType])
        : col.StatKey !== undefined
          ? sportsPlayerPropSlug_(settingsData[i][col.StatKey])
          : "",
      questionMode: col.SportsQuestionMode !== undefined
        ? sportsPlayerPropKey_(settingsData[i][col.SportsQuestionMode])
        : col.ScoreMode !== undefined && sportsPlayerPropKey_(settingsData[i][col.ScoreMode]) === "wager"
          ? "wager"
          : "prediction",
      settlementStatus: col.SettlementStatus === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.SettlementStatus]),
      nominees: category.nominees
    });
  }
  return items;
}

function sportsPlayerMatchupFindStat_(item, nominee, lookup) {
  const rows = lookup.byEvent[item.espnEventId] || [];
  return rows.find(function(stat) {
    return (
      sportsPlayerPropString_(stat.PlayerId) === sportsPlayerPropString_(nominee.playerId) &&
      sportsPlayerPropSlug_(stat.StatType) === item.statType
    );
  }) || null;
}

function settleSportsPlayerMatchups(payload) {
  payload = payload || {};
  setupSportsPlayerPropSystem();
  const awardsGameId = sportsPlayerPropString_(payload.awardsGameId || payload.gameId);
  const force = sportsPlayerPropBoolean_(payload.force, false);
  const items = sportsPlayerMatchupReadItems_(awardsGameId);
  const refresh = payload.refreshStats === false
    ? null
    : sportsPlayerPropRefreshStatsForLeagues_(items.map(function(item) { return item.league; }));
  const lookup = sportsPlayerPropFetchStatsForItems_(items);
  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    settled: 0,
    pushes: 0,
    pending: 0,
    review: 0,
    skipped: 0,
    refresh: refresh,
    sourceErrors: lookup.errors,
    errors: []
  };

  items.forEach(function(item) {
    summary.checked++;
    if (item.settlementStatus === "settled" && !force) {
      summary.skipped++;
      return;
    }
    if (!item.espnEventId || !item.statType || !item.nominees || item.nominees.length < 2) {
      summary.review++;
      summary.errors.push({ categoryId: item.categoryId, reason: "player-matchup-mapping-incomplete" });
      return;
    }

    const values = [];
    let incomplete = false;
    item.nominees.forEach(function(nominee) {
      const stat = sportsPlayerMatchupFindStat_(item, nominee, lookup);
      if (!stat || !sportsPlayerPropBoolean_(stat.Completed, false)) {
        incomplete = true;
        return;
      }
      const value = sportsPlayerPropNumber_(stat.StatValue, null);
      if (value === null) {
        incomplete = true;
        return;
      }
      values.push({
        nomineeId: nominee.nomineeId,
        playerId: nominee.playerId,
        playerName: nominee.playerName || stat.PlayerName,
        value: value,
        stat: stat
      });
    });

    if (incomplete || values.length !== item.nominees.length) {
      summary.pending++;
      return;
    }

    const resolution = sportsPlayerMatchupResolve_(values);
    if (!resolution.resolved) {
      summary.review++;
      summary.errors.push({ categoryId: item.categoryId, reason: "player-matchup-resolution-failed" });
      return;
    }

    try {
      const winnerNomineeId = resolution.winnerNomineeId;
      const wagerResultType = resolution.wagerResultType;
      const updated = typeof sportsWagerSetCategorySettingWinnerAllMatches_ === "function"
        ? sportsWagerSetCategorySettingWinnerAllMatches_(
            item.awardsGameId,
            item.categoryId,
            winnerNomineeId,
            wagerResultType,
            "settled"
          )
        : 0;
      const detail = values.map(function(entry) {
        return entry.playerName + ": " + entry.value;
      }).join(" | ");
      const score = {
        GameId: item.sportsGameId,
        ESPNEventId: item.espnEventId,
        Sport: item.league === "mlb" ? "baseball" : "football",
        League: item.league,
        Status: "Final",
        State: "post",
        HomeTeam: resolution.tied ? "Tie" : (resolution.leaders[0].playerName || "Winner"),
        AwayTeam: sportsPlayerPropStatLabel_(item.league, "", item.statType),
        HomeScore: resolution.maxValue,
        AwayScore: "",
        Winner: winnerNomineeId,
        Completed: true,
        LastUpdated: new Date()
      };
      const result = typeof sportsWagerUpsertCategoryResultForSettlement_ === "function"
        ? sportsWagerUpsertCategoryResultForSettlement_(
            item.awardsGameId,
            item.categoryId,
            winnerNomineeId,
            wagerResultType,
            score,
            "player-matchup: " + detail
          )
        : null;
      if (updated > 0 || (result && result.success)) {
        summary.settled++;
        if (resolution.tied) summary.pushes++;
      } else {
        summary.review++;
        summary.errors.push({ categoryId: item.categoryId, reason: "no-category-setting-row-updated" });
      }
    } catch (err) {
      summary.errors.push({ categoryId: item.categoryId, error: err && err.message ? err.message : String(err) });
    }
  });

  SpreadsheetApp.flush();
  if (typeof clearAppCaches === "function") clearAppCaches();
  summary.success = summary.errors.length === 0;
  return summary;
}

function settleSportsPlayerMatchupsForAllGames_(payload) {
  payload = payload || {};
  const gameIds = typeof sportsWagerGetAllSportsAwardsGameIds_ === "function"
    ? sportsWagerGetAllSportsAwardsGameIds_()
    : [];
  const allItems = sportsPlayerMatchupReadItems_("");
  const sharedRefresh = payload.refreshStats === false
    ? null
    : sportsPlayerPropRefreshStatsForLeagues_(allItems.map(function(item) { return item.league; }));
  const summary = {
    success: true,
    gameCount: gameIds.length,
    checked: 0,
    settled: 0,
    pushes: 0,
    pending: 0,
    review: 0,
    refresh: sharedRefresh,
    errors: [],
    results: []
  };
  gameIds.forEach(function(gameId) {
    try {
      const result = settleSportsPlayerMatchups({
        gameId: gameId,
        force: payload.force,
        refreshStats: false
      });
      summary.checked += result.checked || 0;
      summary.settled += result.settled || 0;
      summary.pushes += result.pushes || 0;
      summary.pending += result.pending || 0;
      summary.review += result.review || 0;
      summary.errors = summary.errors.concat(result.errors || []);
      summary.results.push(result);
    } catch (err) {
      summary.errors.push({ gameId: gameId, error: err && err.message ? err.message : String(err) });
    }
  });
  summary.success = summary.errors.length === 0;
  return summary;
}

function sportsPlayerPropReadItems_(awardsGameId) {
  const ss = SpreadsheetApp.getActive();
  const settingsSheet = ss.getSheetByName(typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings");
  const categoriesSheet = ss.getSheetByName(typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories");
  if (!settingsSheet || !categoriesSheet || settingsSheet.getLastRow() < 2 || categoriesSheet.getLastRow() < 2) return [];

  const categoryData = categoriesSheet.getDataRange().getValues();
  const categoryCol = sportsPlayerPropHeaderMap_(categoryData[0]);
  const categories = {};

  for (let i = 1; i < categoryData.length; i++) {
    const gameId = categoryCol.GameId === undefined ? "" : sportsPlayerPropString_(categoryData[i][categoryCol.GameId]);
    if (awardsGameId && gameId !== awardsGameId) continue;
    const categoryId = categoryCol.CategoryId === undefined ? "" : sportsPlayerPropKey_(categoryData[i][categoryCol.CategoryId]);
    if (!categoryId) continue;
    const market = categoryCol.SportsMarket === undefined ? "" : sportsPlayerPropKey_(categoryData[i][categoryCol.SportsMarket]);
    if (market !== SPORTS_PLAYER_PROP_MARKET) continue;

    if (!categories[categoryId]) {
      categories[categoryId] = { gameId: gameId, categoryId: categoryId, nominees: [] };
    }
    categories[categoryId].nominees.push({
      nomineeId: categoryCol.NomineeId === undefined ? "" : sportsPlayerPropKey_(categoryData[i][categoryCol.NomineeId]),
      side: categoryCol.SportsPropSide !== undefined
        ? sportsPlayerPropKey_(categoryData[i][categoryCol.SportsPropSide])
        : categoryCol.SportsSelection !== undefined
          ? sportsPlayerPropKey_(categoryData[i][categoryCol.SportsSelection])
          : ""
    });
  }

  const settingsData = settingsSheet.getDataRange().getValues();
  const col = sportsPlayerPropHeaderMap_(settingsData[0]);
  const items = [];

  for (let i = 1; i < settingsData.length; i++) {
    const categoryId = col.CategoryId === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.CategoryId]);
    const category = categories[categoryId];
    if (!category) continue;

    const rowGameId = col.GameId === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.GameId]);
    if (awardsGameId && rowGameId && rowGameId !== awardsGameId) continue;

    const market = col.SportsMarket === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.SportsMarket]);
    const questionType = col.QuestionType === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.QuestionType]);
    if (market !== SPORTS_PLAYER_PROP_MARKET && questionType.indexOf("player-prop") === -1) continue;

    items.push({
      rowNumber: i + 1,
      awardsGameId: category.gameId || rowGameId,
      categoryId: categoryId,
      sportsGameId: col.SportsGameId === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.SportsGameId]),
      espnEventId: col.ESPNEventId === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.ESPNEventId]),
      league: col.SportsLeague === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.SportsLeague]),
      playerId: col.SportsPlayerId !== undefined
        ? sportsPlayerPropString_(settingsData[i][col.SportsPlayerId])
        : col.ExternalSubjectId !== undefined
          ? sportsPlayerPropString_(settingsData[i][col.ExternalSubjectId])
          : "",
      playerName: col.SportsPlayerName === undefined ? "" : sportsPlayerPropString_(settingsData[i][col.SportsPlayerName]),
      statType: col.SportsStatType !== undefined
        ? sportsPlayerPropSlug_(settingsData[i][col.SportsStatType])
        : col.StatKey !== undefined
          ? sportsPlayerPropSlug_(settingsData[i][col.StatKey])
          : "",
      line: col.SportsPropLine !== undefined
        ? sportsPlayerPropNumber_(settingsData[i][col.SportsPropLine], null)
        : col.Threshold !== undefined
          ? sportsPlayerPropNumber_(settingsData[i][col.Threshold], null)
          : null,
      settlementStatus: col.SettlementStatus === undefined ? "" : sportsPlayerPropKey_(settingsData[i][col.SettlementStatus]),
      nominees: category.nominees
    });
  }

  return items;
}

function sportsPlayerPropFetchStatsForItems_(items) {
  const byEvent = {};
  const errors = [];

  (items || []).forEach(function(item) {
    const eventId = sportsPlayerPropString_(item.espnEventId);
    if (!eventId || byEvent[eventId]) return;

    try {
      const result = sportsPlayerPropFetch_({
        action: "getSportsPlayerGameStats",
        espnEventId: eventId,
        limit: 10000
      }, "Player game stats lookup");
      byEvent[eventId] = Array.isArray(result.stats) ? result.stats : [];
    } catch (err) {
      byEvent[eventId] = [];
      errors.push({
        espnEventId: eventId,
        error: err && err.message ? err.message : String(err)
      });
    }
  });

  return { byEvent: byEvent, errors: errors };
}

function sportsPlayerPropFindStat_(item, lookup) {
  const rows = lookup.byEvent[item.espnEventId] || [];
  return rows.find(function(stat) {
    return (
      sportsPlayerPropString_(stat.PlayerId) === item.playerId &&
      sportsPlayerPropSlug_(stat.StatType) === item.statType
    );
  }) || null;
}

function sportsPlayerPropFindNominee_(item, side) {
  const wanted = sportsPlayerPropKey_(side);
  const nominee = (item.nominees || []).find(function(entry) {
    return entry.side === wanted || entry.nomineeId === wanted;
  });
  return nominee ? nominee.nomineeId : wanted;
}

function sportsPlayerPropResolveValue_(value, line) {
  const statValue = sportsPlayerPropNumber_(value, null);
  const propLine = sportsPlayerPropNumber_(line, null);

  if (statValue === null || propLine === null) {
    return { resolved: false, winnerSide: "", wagerResultType: "" };
  }

  if (statValue > propLine) {
    return { resolved: true, winnerSide: "over", wagerResultType: "win" };
  }

  if (statValue < propLine) {
    return { resolved: true, winnerSide: "under", wagerResultType: "win" };
  }

  return { resolved: true, winnerSide: "push", wagerResultType: "push" };
}

function sportsPlayerPropSyntheticScore_(item, stat, winnerSide) {
  return {
    GameId: item.sportsGameId,
    ESPNEventId: item.espnEventId,
    Sport: item.league === "mlb" ? "baseball" : "football",
    League: item.league,
    Status: "Final",
    State: "post",
    Period: "",
    Clock: "",
    HomeTeam: item.playerName || stat.PlayerName || "Player",
    AwayTeam: sportsPlayerPropStatLabel_(item.league, "", item.statType),
    HomeScore: stat.StatValue,
    AwayScore: item.line,
    Winner: winnerSide,
    Completed: true,
    LastUpdated: stat.LastUpdated || new Date()
  };
}

function sportsPlayerPropRefreshStatsForLeagues_(leagueNames) {
  const seen = {};
  const results = [];

  (leagueNames || []).forEach(function(league) {
    const key = sportsPlayerPropKey_(league);
    if (!key || seen[key] || ["mlb", "nfl"].indexOf(key) === -1) return;
    seen[key] = true;

    const sport = key === "mlb" ? "baseball" : "football";
    try {
      const refreshResult =
        typeof sportsAdminBridgeCall_ === "function"
          ? sportsAdminBridgeCall_(
              "refreshSportsPlayerGameStatsAdmin",
              {
                league: key,
                sport: sport,
                daysBack: 3,
                daysForward: 1,
                maxGames: 30
              }
            )
          : sportsPlayerPropFetch_({
              action: "refreshSportsPlayerGameStatsAdmin",
              adminKey: typeof sportsAdminBridgeGetKey_ === "function"
                ? sportsAdminBridgeGetKey_()
                : "",
              league: key,
              sport: sport,
              daysBack: 3,
              daysForward: 1,
              maxGames: 30
            }, key.toUpperCase() + " player-stat refresh");

      if (!refreshResult || refreshResult.success === false) {
        throw new Error(
          (refreshResult && (refreshResult.error || refreshResult.message || refreshResult.reason)) ||
          key.toUpperCase() + " player-stat refresh failed."
        );
      }

      results.push(refreshResult);
    } catch (err) {
      results.push({
        success: false,
        league: key,
        error: err && err.message ? err.message : String(err)
      });
    }
  });

  return { success: results.every(function(result) { return result.success !== false; }), results: results };
}

function settleSportsPlayerProps(payload) {
  payload = payload || {};
  setupSportsPlayerPropSystem();

  const awardsGameId = sportsPlayerPropString_(payload.awardsGameId || payload.gameId);
  const force = sportsPlayerPropBoolean_(payload.force, false);
  const items = sportsPlayerPropReadItems_(awardsGameId);
  const leagues = items.map(function(item) { return item.league; });

  const refresh = payload.refreshStats === false
    ? null
    : sportsPlayerPropRefreshStatsForLeagues_(leagues);

  const lookup = sportsPlayerPropFetchStatsForItems_(items);
  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    settled: 0,
    pushes: 0,
    pending: 0,
    review: 0,
    skipped: 0,
    refresh: refresh,
    sourceErrors: lookup.errors,
    errors: []
  };

  items.forEach(function(item) {
    summary.checked++;

    if (item.settlementStatus === "settled" && !force) {
      summary.skipped++;
      return;
    }

    if (!item.playerId || !item.statType || item.line === null || !item.espnEventId) {
      summary.review++;
      summary.errors.push({ categoryId: item.categoryId, reason: "player-prop-mapping-incomplete" });
      if (typeof sportsWagerSetCategorySettingFinalLock_ === "function") {
        sportsWagerSetCategorySettingFinalLock_(item.awardsGameId, item.categoryId, "needs-review", false);
      }
      return;
    }

    const stat = sportsPlayerPropFindStat_(item, lookup);
    if (!stat) {
      summary.pending++;
      return;
    }

    if (!sportsPlayerPropBoolean_(stat.Completed, false)) {
      summary.pending++;
      return;
    }

    const value = sportsPlayerPropNumber_(stat.StatValue, null);
    if (value === null) {
      summary.review++;
      summary.errors.push({ categoryId: item.categoryId, reason: "player-stat-not-numeric" });
      return;
    }

    const resolution =
      sportsPlayerPropResolveValue_(value, item.line);

    if (!resolution.resolved) {
      summary.review++;
      summary.errors.push({ categoryId: item.categoryId, reason: "player-prop-resolution-failed" });
      return;
    }

    const winnerSide =
      resolution.winnerSide;

    const wagerResultType =
      resolution.wagerResultType;

    const winnerNomineeId = winnerSide === "push"
      ? "push"
      : sportsPlayerPropFindNominee_(item, winnerSide);

    try {
      const updated = typeof sportsWagerSetCategorySettingWinnerAllMatches_ === "function"
        ? sportsWagerSetCategorySettingWinnerAllMatches_(
            item.awardsGameId,
            item.categoryId,
            winnerNomineeId,
            wagerResultType,
            "settled"
          )
        : 0;

      const score = sportsPlayerPropSyntheticScore_(item, stat, winnerSide);
      const result = typeof sportsWagerUpsertCategoryResultForSettlement_ === "function"
        ? sportsWagerUpsertCategoryResultForSettlement_(
            item.awardsGameId,
            item.categoryId,
            winnerNomineeId,
            wagerResultType,
            score,
            "player-prop-" + winnerSide + ": " + value + " vs " + item.line
          )
        : null;

      if (updated > 0 || (result && result.success)) {
        summary.settled++;
        if (wagerResultType === "push") summary.pushes++;
      } else {
        summary.review++;
        summary.errors.push({ categoryId: item.categoryId, reason: "no-category-setting-row-updated" });
      }
    } catch (err) {
      summary.errors.push({
        categoryId: item.categoryId,
        error: err && err.message ? err.message : String(err)
      });
    }
  });

  SpreadsheetApp.flush();
  if (typeof clearAppCaches === "function") clearAppCaches();
  summary.success = summary.errors.length === 0;
  return summary;
}

function settleSportsPlayerPropsForAllGames_(payload) {
  payload = payload || {};
  const gameIds = typeof sportsWagerGetAllSportsAwardsGameIds_ === "function"
    ? sportsWagerGetAllSportsAwardsGameIds_()
    : [];

  const allItems =
    sportsPlayerPropReadItems_("");

  const sharedRefresh =
    payload.refreshStats === false
      ? null
      : sportsPlayerPropRefreshStatsForLeagues_(
          allItems.map(function(item) {
            return item.league;
          })
        );

  const summary = {
    success: true,
    gameCount: gameIds.length,
    checked: 0,
    settled: 0,
    pushes: 0,
    pending: 0,
    review: 0,
    refresh: sharedRefresh,
    errors: [],
    results: []
  };

  gameIds.forEach(function(gameId) {
    try {
      const result = settleSportsPlayerProps({
        gameId: gameId,
        force: payload.force,
        refreshStats: false
      });
      summary.checked += result.checked || 0;
      summary.settled += result.settled || 0;
      summary.pushes += result.pushes || 0;
      summary.pending += result.pending || 0;
      summary.review += result.review || 0;
      summary.errors = summary.errors.concat(result.errors || []);
      summary.results.push(result);
    } catch (err) {
      summary.errors.push({ gameId: gameId, error: err && err.message ? err.message : String(err) });
    }
  });

  summary.success = summary.errors.length === 0;
  return summary;
}

/* =====================================================
   ADMIN API
===================================================== */

function apiAdminGetSportsPlayerPropGames(payload) {
  payload = payload || {};
  requireAdmin_(payload);

  const result = sportsPlayerPropFetch_({
    action: "getSportsScores",
    league: sportsPlayerPropKey_(payload.league),
    dateFrom: payload.dateFrom,
    dateTo: payload.dateTo,
    completed: payload.completed,
    state: payload.state
  }, "Player-prop game list");

  return {
    success: true,
    count: Array.isArray(result.scores) ? result.scores.length : 0,
    games: Array.isArray(result.scores) ? result.scores : []
  };
}

function apiAdminGetSportsPlayerPropPlayers(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  const resolved = sportsPlayerPropLeagueSport_(payload.league, payload.sport);

  const result = sportsPlayerPropFetch_({
    action: "getSportsPlayers",
    league: resolved.league,
    team: payload.team,
    search: payload.search,
    active: "true",
    limit: payload.limit || 2000
  }, "Player-prop player list");

  return {
    success: true,
    count: Array.isArray(result.players) ? result.players.length : 0,
    players: Array.isArray(result.players) ? result.players : [],
    league: resolved.league,
    sport: resolved.sport,
    statTypes: sportsPlayerPropStatOptions_(resolved.league, resolved.sport).map(function(item) {
      return { value: item[0], label: item[1] };
    })
  };
}

function apiAdminGetSportsPlayerPropStatTypes(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  const resolved = sportsPlayerPropLeagueSport_(payload.league, payload.sport);
  return {
    success: true,
    league: resolved.league,
    sport: resolved.sport,
    statTypes: sportsPlayerPropStatOptions_(resolved.league, resolved.sport).map(function(item) {
      return { value: item[0], label: item[1] };
    })
  };
}

function apiAdminCreateSportsPlayerProp(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return createSportsPlayerProp(payload);
}

function apiAdminCreateSportsPlayerMatchup(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return createSportsPlayerMatchup(payload);
}

function apiAdminSettleSportsPlayerMatchups(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return settleSportsPlayerMatchups(payload);
}

function apiAdminSettleSportsPlayerProps(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return settleSportsPlayerProps(payload);
}

function testSetupSportsPlayerPropSystem() {
  return setupSportsPlayerPropSystem();
}

function testSettleSportsPlayerPropsNow() {
  return settleSportsPlayerPropsForAllGames_({ force: true, refreshStats: true });
}

function testSettleSportsPlayerMatchupsNow() {
  return settleSportsPlayerMatchupsForAllGames_({ force: true, refreshStats: true });
}

/* =====================================================
   PLAYER PROP WAGER READINESS DIAGNOSTIC
   Run from the Apps Script editor after creating a prop.
===================================================== */

function testLatestSportsPlayerPropWagerReadiness() {
  const sheetName =
    typeof CATEGORIES_SHEET !== "undefined"
      ? CATEGORIES_SHEET
      : "Categories";

  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    throw new Error("No Categories rows were found.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(sportsPlayerPropString_);
  const col = sportsPlayerPropHeaderMap_(headers);

  let latest = null;

  for (let i = data.length - 1; i >= 1; i--) {
    const market =
      col.SportsMarket === undefined
        ? ""
        : sportsPlayerPropKey_(data[i][col.SportsMarket]);

    if (market !== SPORTS_PLAYER_PROP_MARKET) {
      continue;
    }

    latest = {
      gameId:
        col.GameId === undefined
          ? ""
          : sportsPlayerPropString_(data[i][col.GameId]),
      categoryId:
        col.CategoryId === undefined
          ? ""
          : sportsPlayerPropKey_(data[i][col.CategoryId])
    };
    break;
  }

  if (!latest || !latest.gameId || !latest.categoryId) {
    throw new Error("No player-prop category was found.");
  }

  const gameConfig =
    typeof getBettingGameConfig === "function"
      ? getBettingGameConfig(latest.gameId)
      : { enabled: null };

  const categories =
    typeof getCategories === "function"
      ? getCategories(latest.gameId)
      : [];

  const category = categories.find(function(item) {
    return sportsPlayerPropKey_(item && item.id) === latest.categoryId;
  }) || null;

  const settings =
    typeof getCategorySettings === "function"
      ? getCategorySettings(latest.gameId)
      : {};

  const setting = settings[latest.categoryId] || {};

  const oddsMap =
    typeof getBettingOddsMap_ === "function"
      ? getBettingOddsMap_(latest.gameId)
      : {};

  const overOdds =
    oddsMap[latest.categoryId] &&
    Object.prototype.hasOwnProperty.call(oddsMap[latest.categoryId], "over")
      ? oddsMap[latest.categoryId].over
      : null;

  const underOdds =
    oddsMap[latest.categoryId] &&
    Object.prototype.hasOwnProperty.call(oddsMap[latest.categoryId], "under")
      ? oddsMap[latest.categoryId].under
      : null;

  const locked =
    category && typeof isBettingCategoryLocked_ === "function"
      ? isBettingCategoryLocked_(category, setting)
      : null;

  const problems = [];

  if (gameConfig && gameConfig.enabled !== true) {
    problems.push("Destination Awards Game is not wager-enabled.");
  }

  if (!category) {
    problems.push("Player-prop category is not loading through getCategories().");
  }

  if (sportsPlayerPropKey_(setting.scoreMode) !== "wager") {
    problems.push("CategorySettings ScoreMode is not wager.");
  }

  if (sportsPlayerPropKey_(setting.layoutType) !== "wager") {
    problems.push("CategorySettings LayoutType is not wager.");
  }

  if (locked === true) {
    problems.push("The player prop is locked because the source game start time has passed or Locked is TRUE.");
  }

  if (!(Number(overOdds) > 0) || !(Number(underOdds) > 0)) {
    problems.push("Over/Under odds are not available to the Betting Engine.");
  }

  const result = {
    success: problems.length === 0,
    gameId: latest.gameId,
    categoryId: latest.categoryId,
    expectedSheet: "Bets",
    writesToPicks: false,
    wagerEnabled: gameConfig ? gameConfig.enabled === true : null,
    scoreMode: setting.scoreMode || "",
    layoutType: setting.layoutType || "",
    lockDateTime: setting.lockDateTime || "",
    locked: locked,
    overOdds: overOdds,
    underOdds: underOdds,
    problems: problems
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}


/* =====================================================
   PLAYER MATCHUP READINESS DIAGNOSTIC
   Run after creating a matchup from the Sports page.
===================================================== */

function testLatestSportsPlayerMatchupReadiness() {
  const sheetName = typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    throw new Error("No Categories rows were found.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(sportsPlayerPropString_);
  const col = sportsPlayerPropHeaderMap_(headers);
  let latest = null;

  for (let i = data.length - 1; i >= 1; i--) {
    const market = col.SportsMarket === undefined ? "" : sportsPlayerPropKey_(data[i][col.SportsMarket]);
    if (market !== SPORTS_PLAYER_MATCHUP_MARKET) continue;
    latest = {
      gameId: col.GameId === undefined ? "" : sportsPlayerPropString_(data[i][col.GameId]),
      categoryId: col.CategoryId === undefined ? "" : sportsPlayerPropKey_(data[i][col.CategoryId])
    };
    break;
  }

  if (!latest || !latest.gameId || !latest.categoryId) {
    throw new Error("No player-matchup category was found.");
  }

  const categories = typeof getCategories === "function" ? getCategories(latest.gameId) : [];
  const category = categories.find(function(item) {
    return sportsPlayerPropKey_(item && item.id) === latest.categoryId;
  }) || null;
  const settings = typeof getCategorySettings === "function" ? getCategorySettings(latest.gameId) : {};
  const setting = settings[latest.categoryId] || {};
  const mode = sportsPlayerPropKey_(setting.sportsQuestionMode || setting.scoreMode) === "wager"
    ? "wager"
    : "prediction";
  const locked = category && typeof isBettingCategoryLocked_ === "function"
    ? isBettingCategoryLocked_(category, setting)
    : setting.locked === true;
  const problems = [];

  if (!category) problems.push("Player matchup is not loading through getCategories().");
  if (!category || !Array.isArray(category.nominees) || category.nominees.length < 2) {
    problems.push("Player matchup has fewer than two nominees.");
  }
  if (locked === true) problems.push("The player matchup is locked because the source game start time has passed or Locked is TRUE.");

  let odds = {};
  if (mode === "wager") {
    const gameConfig = typeof getBettingGameConfig === "function"
      ? getBettingGameConfig(latest.gameId)
      : { enabled: null };
    if (gameConfig && gameConfig.enabled !== true) {
      problems.push("Destination Awards Game is not wager-enabled.");
    }
    if (sportsPlayerPropKey_(setting.scoreMode) !== "wager") {
      problems.push("CategorySettings ScoreMode is not wager.");
    }
    const oddsMap = typeof getBettingOddsMap_ === "function" ? getBettingOddsMap_(latest.gameId) : {};
    odds = oddsMap[latest.categoryId] || {};
    (category && category.nominees || []).forEach(function(nominee) {
      const nomineeId = sportsPlayerPropKey_(nominee.id);
      if (!(Number(odds[nomineeId]) > 1)) {
        problems.push("Missing wager odds for " + (nominee.name || nomineeId) + ".");
      }
    });
  } else {
    if (typeof gameSupportsFeature === "function" && !gameSupportsFeature(latest.gameId, "prediction")) {
      problems.push("Destination Awards Game is not prediction-enabled.");
    }
    if (sportsPlayerPropKey_(setting.scoreMode) !== "correct-pick") {
      problems.push("CategorySettings ScoreMode is not correct-pick.");
    }
  }

  const result = {
    success: problems.length === 0,
    gameId: latest.gameId,
    categoryId: latest.categoryId,
    questionMode: mode,
    expectedSheet: mode === "wager" ? "Bets" : "Picks",
    nomineeCount: category && Array.isArray(category.nominees) ? category.nominees.length : 0,
    scoreMode: setting.scoreMode || "",
    layoutType: setting.layoutType || "",
    lockDateTime: setting.lockDateTime || "",
    locked: locked,
    odds: odds,
    problems: problems
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}
