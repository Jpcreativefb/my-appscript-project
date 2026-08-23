/* =========================================================
   SPORTS TEAM FANTASY FOOTBALL ENGINE — v1.2.18j2

   Team-based weekly NFL fantasy game. Users choose NFL teams
   for position groups instead of individual players.
========================================================= */

var TEAM_FANTASY_VERSION = "1.2.18r";
var TEAM_FANTASY_POSITIONS = ["QB", "RB", "WRTE", "K", "OL", "DL", "LB", "DB"];
var TEAM_FANTASY_POSITION_LABELS = {
  QB: "QB",
  RB: "RB",
  WRTE: "WR/TE",
  K: "K",
  OL: "OL",
  DL: "DL",
  LB: "LB",
  DB: "DB"
};

var TEAM_FANTASY_SHEETS = {
  SETTINGS: "TeamFantasySettings",
  RULES: "TeamFantasyScoringRules",
  ENTRIES: "TeamFantasyEntries",
  LEAGUES: "TeamFantasyLeagues",
  MEMBERSHIPS: "TeamFantasyLeagueMemberships",
  PICKS: "TeamFantasyPicks",
  UNIT_SCORES: "TeamFantasyUnitScores",
  WEEK_SCORES: "TeamFantasyWeekScores",
  REMINDER_LOG: "TeamFantasyReminderLog"
};

var TEAM_FANTASY_HEADERS = {};
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.SETTINGS] = [
  "GameId", "SeasonYear", "CurrentWeek", "EntryMode", "MaxEntriesPerUser",
  "TeamUseLimit", "CompleteLeagueEnabled", "StandingMode", "SameEntryMultipleLeagues",
  "AllowRandomPick", "AllowSmartAutoPick", "RegularSeasonEndWeek", "PostseasonScoringMode",
  "PlayoffUsageMode", "OverallPlayoffTeams", "SubleaguePlayoffDefault", "RankingsMode",
  "ReminderEnabled", "ReminderThursday", "ReminderSunday", "ReminderFinalWindow",
  "SyncTriggerEnabled", "LastSyncAt", "LastSyncStatus", "LastSyncMessage", "UpdatedAt", "UpdatedBy"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.RULES] = [
  "GameId", "RuleId", "Position", "StatKey", "Label", "RuleType", "PointsPerUnit",
  "Threshold", "BonusPoints", "Active", "UpdatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.ENTRIES] = [
  "GameId", "EntryId", "Username", "EntryName", "Conference", "Active", "CreatedAt", "UpdatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.LEAGUES] = [
  "GameId", "LeagueId", "LeagueName", "LeagueType", "StandingMode", "PlayoffTeams",
  "Active", "CreatedAt", "UpdatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.MEMBERSHIPS] = [
  "GameId", "LeagueId", "EntryId", "Username", "CreatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.PICKS] = [
  "GameId", "SeasonYear", "Week", "EntryId", "Username", "Conference", "Position",
  "TeamAbbr", "TeamName", "ESPNTeamId", "ESPNEventId", "GameDateTime", "Locked",
  "PickMethod", "CreatedAt", "UpdatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.UNIT_SCORES] = [
  "GameId", "SeasonYear", "Week", "EntryId", "Username", "Conference", "Position",
  "TeamAbbr", "ESPNEventId", "FantasyPoints", "StatsJSON", "ScoreDetailJSON", "Final", "UpdatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.WEEK_SCORES] = [
  "GameId", "SeasonYear", "Week", "Phase", "EntryId", "Username", "Conference",
  "FantasyPoints", "Final", "MissingPositionsJSON", "ScoreDetailJSON", "UpdatedAt"
];
TEAM_FANTASY_HEADERS[TEAM_FANTASY_SHEETS.REMINDER_LOG] = [
  "SentAt", "GameId", "SeasonYear", "Week", "Username", "EntryId", "MissingPositionsJSON",
  "Title", "Message", "Sent", "Failed", "Error"
];

var TEAM_FANTASY_NFL_TEAMS = [
  ["BUF", "Buffalo Bills", "AFC"], ["MIA", "Miami Dolphins", "AFC"],
  ["NE", "New England Patriots", "AFC"], ["NYJ", "New York Jets", "AFC"],
  ["BAL", "Baltimore Ravens", "AFC"], ["CIN", "Cincinnati Bengals", "AFC"],
  ["CLE", "Cleveland Browns", "AFC"], ["PIT", "Pittsburgh Steelers", "AFC"],
  ["HOU", "Houston Texans", "AFC"], ["IND", "Indianapolis Colts", "AFC"],
  ["JAX", "Jacksonville Jaguars", "AFC"], ["TEN", "Tennessee Titans", "AFC"],
  ["DEN", "Denver Broncos", "AFC"], ["KC", "Kansas City Chiefs", "AFC"],
  ["LV", "Las Vegas Raiders", "AFC"], ["LAC", "Los Angeles Chargers", "AFC"],
  ["DAL", "Dallas Cowboys", "NFC"], ["NYG", "New York Giants", "NFC"],
  ["PHI", "Philadelphia Eagles", "NFC"], ["WAS", "Washington Commanders", "NFC"],
  ["CHI", "Chicago Bears", "NFC"], ["DET", "Detroit Lions", "NFC"],
  ["GB", "Green Bay Packers", "NFC"], ["MIN", "Minnesota Vikings", "NFC"],
  ["ATL", "Atlanta Falcons", "NFC"], ["CAR", "Carolina Panthers", "NFC"],
  ["NO", "New Orleans Saints", "NFC"], ["TB", "Tampa Bay Buccaneers", "NFC"],
  ["ARI", "Arizona Cardinals", "NFC"], ["LAR", "Los Angeles Rams", "NFC"],
  ["SF", "San Francisco 49ers", "NFC"], ["SEA", "Seattle Seahawks", "NFC"]
].map(function(row) {
  return { abbr: row[0], name: row[1], conference: row[2] };
});

var TEAM_FANTASY_TEAM_ALIASES = {
  WSH: "WAS", JAC: "JAX", OAK: "LV", SD: "LAC", STL: "LAR"
};

function teamFantasyString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function teamFantasyKey_(value) {
  return teamFantasyString_(value).toLowerCase();
}

function teamFantasyBool_(value, fallback) {
  if (value === true || value === false) return value;
  const key = teamFantasyKey_(value);
  if (key === "true" || key === "yes" || key === "1" || key === "on") return true;
  if (key === "false" || key === "no" || key === "0" || key === "off") return false;
  return fallback === true;
}

function teamFantasyNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

function teamFantasyRound_(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function teamFantasyNowIso_() {
  return new Date().toISOString();
}

function teamFantasyNormalizeUsername_(value) {
  return teamFantasyString_(value).toLowerCase();
}

function teamFantasyNormalizePosition_(value) {
  const key = teamFantasyKey_(value).replace(/[\/_ -]/g, "");
  if (key === "wrte" || key === "tewr" || key === "receiver") return "WRTE";
  const upper = teamFantasyString_(value).toUpperCase();
  return TEAM_FANTASY_POSITIONS.indexOf(upper) !== -1 ? upper : "";
}

function teamFantasyNormalizeTeam_(value) {
  let abbr = teamFantasyString_(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (TEAM_FANTASY_TEAM_ALIASES[abbr]) abbr = TEAM_FANTASY_TEAM_ALIASES[abbr];
  return abbr;
}

function teamFantasyTeamMeta_(abbr) {
  abbr = teamFantasyNormalizeTeam_(abbr);
  for (let i = 0; i < TEAM_FANTASY_NFL_TEAMS.length; i++) {
    if (TEAM_FANTASY_NFL_TEAMS[i].abbr === abbr) return TEAM_FANTASY_NFL_TEAMS[i];
  }
  return { abbr: abbr, name: abbr, conference: "" };
}

function teamFantasySlug_(value) {
  const out = teamFantasyKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return out || "entry";
}

function teamFantasyHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    map[teamFantasyString_(header)] = index;
  });
  return map;
}

function teamFantasyEnsureSheet_(sheetName) {
  const headers = TEAM_FANTASY_HEADERS[sheetName];
  if (!headers) throw new Error("Unknown Team Fantasy sheet: " + sheetName);
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  if (sh.getLastRow() === 0 || sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(teamFantasyString_);
  const missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });
  if (missing.length) {
    sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function teamFantasyReadRows_(sheetName) {
  const sh = teamFantasyEnsureSheet_(sheetName);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(teamFantasyString_);
  return data.slice(1).map(function(row, index) {
    const obj = { _rowNumber: index + 2 };
    headers.forEach(function(header, col) { obj[header] = row[col]; });
    return obj;
  });
}

function teamFantasyWriteObjectRow_(sheetName, rowNumber, values) {
  const sh = teamFantasyEnsureSheet_(sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(teamFantasyString_);
  const row = headers.map(function(header) {
    return values[header] === undefined ? "" : values[header];
  });
  sh.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function teamFantasyAppendObject_(sheetName, values) {
  const sh = teamFantasyEnsureSheet_(sheetName);
  const rowNumber = Math.max(2, sh.getLastRow() + 1);
  teamFantasyWriteObjectRow_(sheetName, rowNumber, values);
  return rowNumber;
}

function teamFantasyUpsert_(sheetName, matcher, values) {
  const rows = teamFantasyReadRows_(sheetName);
  let found = null;
  for (let i = 0; i < rows.length; i++) {
    if (matcher(rows[i])) { found = rows[i]; break; }
  }
  if (found) {
    const merged = {};
    Object.keys(found).forEach(function(key) {
      if (key !== "_rowNumber") merged[key] = found[key];
    });
    Object.keys(values || {}).forEach(function(key) { merged[key] = values[key]; });
    teamFantasyWriteObjectRow_(sheetName, found._rowNumber, merged);
    return found._rowNumber;
  }
  return teamFantasyAppendObject_(sheetName, values || {});
}

function teamFantasyDefaultSettings_(gameId) {
  const game = typeof getGame === "function" ? getGame(gameId) : null;
  const year = Number(game && game.year) || new Date().getFullYear();
  return {
    GameId: gameId,
    SeasonYear: year,
    CurrentWeek: 1,
    EntryMode: "single",
    MaxEntriesPerUser: 1,
    TeamUseLimit: 3,
    CompleteLeagueEnabled: true,
    StandingMode: "combined-user",
    SameEntryMultipleLeagues: true,
    AllowRandomPick: true,
    AllowSmartAutoPick: true,
    RegularSeasonEndWeek: 18,
    PostseasonScoringMode: "cumulative",
    PlayoffUsageMode: "reset",
    OverallPlayoffTeams: 8,
    SubleaguePlayoffDefault: 4,
    RankingsMode: "auto",
    ReminderEnabled: true,
    ReminderThursday: true,
    ReminderSunday: true,
    ReminderFinalWindow: true,
    SyncTriggerEnabled: false,
    LastSyncAt: "",
    LastSyncStatus: "never",
    LastSyncMessage: "",
    UpdatedAt: teamFantasyNowIso_(),
    UpdatedBy: "system"
  };
}

function teamFantasyGetSettings_(gameId) {
  gameId = teamFantasyString_(gameId);
  if (!gameId) throw new Error("GameId is required");
  const rows = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.SETTINGS);
  for (let i = 0; i < rows.length; i++) {
    if (teamFantasyString_(rows[i].GameId) === gameId) return teamFantasyNormalizeSettings_(rows[i]);
  }
  const defaults = teamFantasyDefaultSettings_(gameId);
  teamFantasyAppendObject_(TEAM_FANTASY_SHEETS.SETTINGS, defaults);
  teamFantasyEnsureDefaultRules_(gameId);
  teamFantasyEnsureCompleteLeague_(gameId, defaults);
  return teamFantasyNormalizeSettings_(defaults);
}

function teamFantasyNormalizeSettings_(row) {
  return {
    gameId: teamFantasyString_(row.GameId),
    seasonYear: Math.max(2000, Math.floor(teamFantasyNumber_(row.SeasonYear, new Date().getFullYear()))),
    currentWeek: Math.max(1, Math.floor(teamFantasyNumber_(row.CurrentWeek, 1))),
    entryMode: ["single", "afc-nfc", "multiple"].indexOf(teamFantasyKey_(row.EntryMode)) !== -1 ? teamFantasyKey_(row.EntryMode) : "single",
    maxEntriesPerUser: Math.max(1, Math.min(10, Math.floor(teamFantasyNumber_(row.MaxEntriesPerUser, 1)))),
    teamUseLimit: Math.max(1, Math.min(18, Math.floor(teamFantasyNumber_(row.TeamUseLimit, 3)))),
    completeLeagueEnabled: teamFantasyBool_(row.CompleteLeagueEnabled, true),
    standingMode: teamFantasyKey_(row.StandingMode) === "entries" ? "entries" : "combined-user",
    sameEntryMultipleLeagues: teamFantasyBool_(row.SameEntryMultipleLeagues, true),
    allowRandomPick: teamFantasyBool_(row.AllowRandomPick, true),
    allowSmartAutoPick: teamFantasyBool_(row.AllowSmartAutoPick, true),
    regularSeasonEndWeek: Math.max(1, Math.min(18, Math.floor(teamFantasyNumber_(row.RegularSeasonEndWeek, 18)))),
    postseasonScoringMode: teamFantasyKey_(row.PostseasonScoringMode) === "fresh-round" ? "fresh-round" : "cumulative",
    playoffUsageMode: teamFantasyKey_(row.PlayoffUsageMode) === "carry" ? "carry" : "reset",
    overallPlayoffTeams: Math.max(2, Math.min(32, Math.floor(teamFantasyNumber_(row.OverallPlayoffTeams, 8)))),
    subleaguePlayoffDefault: Math.max(2, Math.min(32, Math.floor(teamFantasyNumber_(row.SubleaguePlayoffDefault, 4)))),
    rankingsMode: teamFantasyKey_(row.RankingsMode) === "manual" ? "manual" : "auto",
    reminderEnabled: teamFantasyBool_(row.ReminderEnabled, true),
    reminderThursday: teamFantasyBool_(row.ReminderThursday, true),
    reminderSunday: teamFantasyBool_(row.ReminderSunday, true),
    reminderFinalWindow: teamFantasyBool_(row.ReminderFinalWindow, true),
    syncTriggerEnabled: teamFantasyBool_(row.SyncTriggerEnabled, false),
    lastSyncAt: teamFantasyString_(row.LastSyncAt),
    lastSyncStatus: teamFantasyString_(row.LastSyncStatus) || "never",
    lastSyncMessage: teamFantasyString_(row.LastSyncMessage),
    updatedAt: teamFantasyString_(row.UpdatedAt),
    updatedBy: teamFantasyNormalizeUsername_(row.UpdatedBy)
  };
}

function teamFantasyDefaultRules_() {
  return [
    ["QB", "passingYards", "Passing yards", "unit", 0.04, "", 0],
    ["QB", "passingTouchdowns", "Passing TD", "unit", 4, "", 0],
    ["QB", "interceptionsThrown", "Interception thrown", "unit", -2, "", 0],
    ["QB", "rushingYards", "QB rushing yards", "unit", 0.10, "", 0],
    ["QB", "rushingTouchdowns", "QB rushing TD", "unit", 6, "", 0],
    ["QB", "passingYards", "300+ passing bonus", "bonus", 0, 300, 3],
    ["QB", "completions", "Pass completions", "unit", 0, "", 0, false],
    ["QB", "passingAttempts", "Pass attempts", "unit", 0, "", 0, false],
    ["QB", "fumblesLost", "Fumbles lost", "unit", -2, "", 0, false],
    ["RB", "rushingYards", "Rushing yards", "unit", 0.10, "", 0],
    ["RB", "rushingTouchdowns", "Rushing TD", "unit", 6, "", 0],
    ["RB", "receivingYards", "Receiving yards", "unit", 0.10, "", 0],
    ["RB", "receptions", "Receptions", "unit", 0.5, "", 0],
    ["RB", "receivingTouchdowns", "Receiving TD", "unit", 6, "", 0],
    ["RB", "targets", "Targets", "unit", 0, "", 0, false],
    ["RB", "fumblesLost", "Fumbles lost", "unit", -2, "", 0, false],
    ["WRTE", "receivingYards", "Receiving yards", "unit", 0.10, "", 0],
    ["WRTE", "receptions", "Receptions", "unit", 0.5, "", 0],
    ["WRTE", "receivingTouchdowns", "Receiving TD", "unit", 6, "", 0],
    ["WRTE", "targets", "Targets", "unit", 0, "", 0, false],
    ["WRTE", "fumblesLost", "Fumbles lost", "unit", -2, "", 0, false],
    ["K", "fieldGoalsMade", "Field goals made", "unit", 3, "", 0],
    ["K", "fieldGoalsMissed", "Field goals missed", "unit", -1, "", 0],
    ["K", "extraPointsMade", "Extra points made", "unit", 1, "", 0],
    ["K", "extraPointsMissed", "Extra points missed", "unit", -1, "", 0],
    ["K", "kickingPoints", "Official kicking points", "unit", 0, "", 0, false],
    ["OL", "rushingYards", "Team rushing yards", "unit", 0.02, "", 0],
    ["OL", "totalYards", "Team total yards", "unit", 0.01, "", 0],
    ["OL", "sacksAllowed", "Sacks allowed", "unit", -1, "", 0],
    ["OL", "netPassingYards", "Net passing yards", "unit", 0, "", 0, false],
    ["OL", "turnovers", "Team turnovers", "unit", 0, "", 0, false],
    ["DL", "sacks", "Sacks", "unit", 2, "", 0],
    ["DL", "tacklesForLoss", "Tackles for loss", "unit", 1, "", 0],
    ["DL", "qbHits", "QB hits", "unit", 0.5, "", 0],
    ["DL", "forcedFumbles", "Forced fumbles", "unit", 2, "", 0],
    ["DL", "fumbleRecoveries", "Fumble recoveries", "unit", 2, "", 0],
    ["DL", "tacklesTotal", "Total tackles", "unit", 0, "", 0, false],
    ["DL", "defensiveTouchdowns", "Defensive TD", "unit", 6, "", 0, false],
    ["LB", "tacklesTotal", "Total tackles", "unit", 0.5, "", 0],
    ["LB", "sacks", "Sacks", "unit", 2, "", 0],
    ["LB", "tacklesForLoss", "Tackles for loss", "unit", 1, "", 0],
    ["LB", "interceptions", "Interceptions", "unit", 3, "", 0],
    ["LB", "forcedFumbles", "Forced fumbles", "unit", 2, "", 0],
    ["LB", "passesDefended", "Passes defended", "unit", 0, "", 0, false],
    ["LB", "fumbleRecoveries", "Fumble recoveries", "unit", 0, "", 0, false],
    ["LB", "defensiveTouchdowns", "Defensive TD", "unit", 6, "", 0, false],
    ["DB", "interceptions", "Interceptions", "unit", 3, "", 0],
    ["DB", "passesDefended", "Passes defended", "unit", 1, "", 0],
    ["DB", "tacklesTotal", "Total tackles", "unit", 0.25, "", 0],
    ["DB", "sacks", "Sacks", "unit", 2, "", 0],
    ["DB", "forcedFumbles", "Forced fumbles", "unit", 2, "", 0],
    ["DB", "fumbleRecoveries", "Fumble recoveries", "unit", 0, "", 0, false],
    ["DB", "defensiveTouchdowns", "Defensive TD", "unit", 6, "", 0, false]
  ];
}

function teamFantasyEnsureDefaultRules_(gameId) {
  const existing = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.RULES).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId;
  });
  if (existing.length) return;
  teamFantasyDefaultRules_().forEach(function(rule, index) {
    teamFantasyAppendObject_(TEAM_FANTASY_SHEETS.RULES, {
      GameId: gameId,
      RuleId: "tf-rule-" + String(index + 1),
      Position: rule[0],
      StatKey: rule[1],
      Label: rule[2],
      RuleType: rule[3],
      PointsPerUnit: rule[4],
      Threshold: rule[5],
      BonusPoints: rule[6],
      Active: rule.length > 7 ? rule[7] === true : true,
      UpdatedAt: teamFantasyNowIso_()
    });
  });
}

function teamFantasyRules_(gameId) {
  teamFantasyEnsureDefaultRules_(gameId);
  return teamFantasyReadRows_(TEAM_FANTASY_SHEETS.RULES)
    .filter(function(row) { return teamFantasyString_(row.GameId) === gameId; })
    .map(function(row) {
      return {
        ruleId: teamFantasyString_(row.RuleId),
        position: teamFantasyNormalizePosition_(row.Position),
        statKey: teamFantasyString_(row.StatKey),
        label: teamFantasyString_(row.Label),
        ruleType: teamFantasyKey_(row.RuleType) === "bonus" ? "bonus" : "unit",
        pointsPerUnit: teamFantasyNumber_(row.PointsPerUnit, 0),
        threshold: teamFantasyNumber_(row.Threshold, null),
        bonusPoints: teamFantasyNumber_(row.BonusPoints, 0),
        active: teamFantasyBool_(row.Active, true)
      };
    })
    .filter(function(rule) { return rule.position && rule.statKey; });
}

function setupSportsTeamFantasySystem() {
  Object.keys(TEAM_FANTASY_HEADERS).forEach(teamFantasyEnsureSheet_);
  return {
    success: true,
    version: TEAM_FANTASY_VERSION,
    sheets: Object.keys(TEAM_FANTASY_HEADERS),
    message: "Team Fantasy Football system is ready."
  };
}

function teamFantasyIsGame_(gameId) {
  gameId = teamFantasyString_(gameId);
  if (!gameId || typeof getGame !== "function") return false;
  const game = getGame(gameId);
  return !!(game && teamFantasyKey_(game.type) === "team-fantasy");
}

function teamFantasyEnsureCompleteLeague_(gameId, settingsLike) {
  const settings = settingsLike && settingsLike.gameId ? settingsLike : teamFantasyNormalizeSettings_(settingsLike || teamFantasyDefaultSettings_(gameId));
  if (!settings.completeLeagueEnabled) return;
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.LEAGUES, function(row) {
    return teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.LeagueId) === "complete";
  }, {
    GameId: gameId,
    LeagueId: "complete",
    LeagueName: "Complete League",
    LeagueType: "complete",
    StandingMode: settings.standingMode,
    PlayoffTeams: settings.overallPlayoffTeams,
    Active: true,
    CreatedAt: teamFantasyNowIso_(),
    UpdatedAt: teamFantasyNowIso_()
  });
}

function teamFantasyEntriesForUser_(gameId, username) {
  username = teamFantasyNormalizeUsername_(username);
  return teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId &&
      teamFantasyNormalizeUsername_(row.Username) === username &&
      teamFantasyBool_(row.Active, true);
  }).map(teamFantasyPublicEntry_);
}

function teamFantasyPublicEntry_(row) {
  return {
    entryId: teamFantasyString_(row.EntryId),
    gameId: teamFantasyString_(row.GameId),
    username: teamFantasyNormalizeUsername_(row.Username),
    entryName: teamFantasyString_(row.EntryName),
    conference: teamFantasyString_(row.Conference).toUpperCase() || "ALL",
    active: teamFantasyBool_(row.Active, true)
  };
}

function teamFantasyCreateEntry_(gameId, username, entryName, conference) {
  username = teamFantasyNormalizeUsername_(username);
  conference = teamFantasyString_(conference).toUpperCase() || "ALL";
  const suffix = conference === "ALL" ? "all" : conference.toLowerCase();
  let entryId = "tf-" + teamFantasySlug_(gameId) + "-" + teamFantasySlug_(username) + "-" + suffix;
  const all = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES);
  if (all.some(function(row) { return teamFantasyString_(row.EntryId) === entryId && teamFantasyNormalizeUsername_(row.Username) !== username; })) {
    entryId += "-" + Utilities.getUuid().slice(0, 8);
  }
  const now = teamFantasyNowIso_();
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.ENTRIES, function(row) {
    return teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.EntryId) === entryId;
  }, {
    GameId: gameId,
    EntryId: entryId,
    Username: username,
    EntryName: teamFantasyString_(entryName) || (conference === "ALL" ? username : username + " " + conference),
    Conference: conference,
    Active: true,
    CreatedAt: now,
    UpdatedAt: now
  });
  return teamFantasyPublicEntry_({
    GameId: gameId, EntryId: entryId, Username: username,
    EntryName: teamFantasyString_(entryName) || (conference === "ALL" ? username : username + " " + conference),
    Conference: conference, Active: true
  });
}

function teamFantasyEnsureEntriesForUser_(gameId, username) {
  const settings = teamFantasyGetSettings_(gameId);
  let entries = teamFantasyEntriesForUser_(gameId, username);
  if (settings.entryMode === "afc-nfc") {
    ["AFC", "NFC"].forEach(function(conference) {
      if (!entries.some(function(entry) { return entry.conference === conference; })) {
        teamFantasyCreateEntry_(gameId, username, username + " " + conference, conference);
      }
    });
    entries = teamFantasyEntriesForUser_(gameId, username).filter(function(entry) {
      return entry.conference === "AFC" || entry.conference === "NFC";
    });
  } else if (settings.entryMode === "single") {
    if (!entries.some(function(entry) { return entry.conference === "ALL"; })) {
      teamFantasyCreateEntry_(gameId, username, username, "ALL");
    }
    entries = teamFantasyEntriesForUser_(gameId, username).filter(function(entry) { return entry.conference === "ALL"; }).slice(0, 1);
  } else if (!entries.length) {
    entries = [teamFantasyCreateEntry_(gameId, username, username, "ALL")];
  }
  teamFantasyEnsureCompleteMemberships_(gameId, entries);
  return entries;
}

function teamFantasyEnsureCompleteMemberships_(gameId, entries) {
  const settings = teamFantasyGetSettings_(gameId);
  if (!settings.completeLeagueEnabled) return;
  teamFantasyEnsureCompleteLeague_(gameId, settings);
  (entries || []).forEach(function(entry) {
    teamFantasyUpsert_(TEAM_FANTASY_SHEETS.MEMBERSHIPS, function(row) {
      return teamFantasyString_(row.GameId) === gameId &&
        teamFantasyString_(row.LeagueId) === "complete" &&
        teamFantasyString_(row.EntryId) === entry.entryId;
    }, {
      GameId: gameId,
      LeagueId: "complete",
      EntryId: entry.entryId,
      Username: entry.username,
      CreatedAt: teamFantasyNowIso_()
    });
  });
}

function teamFantasyParticipantUsernames_(gameId) {
  const unique = {};
  teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES).forEach(function(row) {
    if (teamFantasyString_(row.GameId) !== gameId || !teamFantasyBool_(row.Active, true)) return;
    const username = teamFantasyNormalizeUsername_(row.Username);
    if (username) unique[username] = true;
  });
  return Object.keys(unique);
}

function teamFantasyLeaguesForEntries_(gameId, entries) {
  const entrySet = {};
  (entries || []).forEach(function(entry) { entrySet[entry.entryId] = true; });
  const membershipIds = {};
  teamFantasyReadRows_(TEAM_FANTASY_SHEETS.MEMBERSHIPS).forEach(function(row) {
    if (teamFantasyString_(row.GameId) === gameId && entrySet[teamFantasyString_(row.EntryId)]) {
      membershipIds[teamFantasyString_(row.LeagueId)] = true;
    }
  });
  return teamFantasyReadRows_(TEAM_FANTASY_SHEETS.LEAGUES)
    .filter(function(row) {
      return teamFantasyString_(row.GameId) === gameId && membershipIds[teamFantasyString_(row.LeagueId)] && teamFantasyBool_(row.Active, true);
    })
    .map(function(row) {
      return {
        leagueId: teamFantasyString_(row.LeagueId),
        leagueName: teamFantasyString_(row.LeagueName),
        leagueType: teamFantasyString_(row.LeagueType),
        standingMode: teamFantasyKey_(row.StandingMode) === "entries" ? "entries" : "combined-user",
        playoffTeams: Math.max(2, Math.floor(teamFantasyNumber_(row.PlayoffTeams, 4)))
      };
    });
}

function teamFantasyPhaseForWeek_(settings, week) {
  week = Number(week) || 1;
  if (week <= settings.regularSeasonEndWeek) return "regular";
  const playoffWeek = week - settings.regularSeasonEndWeek;
  if (playoffWeek === 1) return "wild-card";
  if (playoffWeek === 2) return "divisional";
  if (playoffWeek === 3) return "conference";
  return "super-bowl";
}

function teamFantasyScheduleSeasonType_(settings, week) {
  return Number(week) <= settings.regularSeasonEndWeek ? 2 : 3;
}

function teamFantasyScheduleWeek_(settings, week) {
  if (Number(week) <= settings.regularSeasonEndWeek) return Number(week);
  const playoffWeek = Math.max(1, Number(week) - settings.regularSeasonEndWeek);
  // ESPN postseason week 4 is the Pro Bowl. Team Fantasy skips it so the
  // fourth fantasy playoff round maps directly to Super Bowl (ESPN week 5).
  return playoffWeek >= 4 ? playoffWeek + 1 : playoffWeek;
}

function teamFantasySportsApiUrl_() {
  try {
    if (typeof SPORTS_WAGER_API_URL !== "undefined" && teamFantasyString_(SPORTS_WAGER_API_URL)) return teamFantasyString_(SPORTS_WAGER_API_URL);
  } catch (err) {}
  try {
    const props = PropertiesService.getScriptProperties();
    return teamFantasyString_(
      props.getProperty("SPORTS_SCORES_API_URL") ||
      props.getProperty("SPORTS_API_URL") ||
      props.getProperty("SPORTS_SCORES_WEB_APP_URL") || ""
    );
  } catch (err2) {
    return "";
  }
}

function teamFantasyHttpJson_(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("Sports source returned HTTP " + code);
  return JSON.parse(response.getContentText() || "{}");
}

function teamFantasySportsEngineJson_(action, params) {
  const base = teamFantasySportsApiUrl_();
  if (!base) throw new Error("Sports Scores Engine URL is not configured.");
  const query = ["action=" + encodeURIComponent(String(action || ""))];
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    query.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  });
  query.push("_ts=" + Date.now());
  const url = base + (base.indexOf("?") === -1 ? "?" : "&") + query.join("&");
  const parsed = teamFantasyHttpJson_(url);
  if (parsed && parsed.success === false) {
    throw new Error(teamFantasyString_(parsed.error || parsed.message) || "Sports Scores Engine request failed.");
  }
  return parsed || {};
}

function teamFantasyScheduleRowsFromEspnEvents_(events, settings, seasonType, sourceWeek) {
  return (Array.isArray(events) ? events : []).map(function(event) {
    const competition = event.competitions && event.competitions[0] ? event.competitions[0] : {};
    const competitors = competition.competitors || [];
    let home = null;
    let away = null;
    competitors.forEach(function(item) {
      if (item.homeAway === "home") home = item;
      if (item.homeAway === "away") away = item;
    });
    home = home || competitors[0] || {};
    away = away || competitors[1] || {};
    const status = event.status && event.status.type ? event.status.type : {};
    return {
      eventId: teamFantasyString_(event.id),
      sportsGameId: "nfl_" + teamFantasyString_(event.id),
      gameDateTime: teamFantasyString_(event.date),
      homeTeam: teamFantasyString_(home.team && (home.team.displayName || home.team.name)),
      awayTeam: teamFantasyString_(away.team && (away.team.displayName || away.team.name)),
      homeAbbr: teamFantasyNormalizeTeam_(home.team && home.team.abbreviation),
      awayAbbr: teamFantasyNormalizeTeam_(away.team && away.team.abbreviation),
      homeTeamId: teamFantasyString_(home.team && home.team.id),
      awayTeamId: teamFantasyString_(away.team && away.team.id),
      status: teamFantasyString_(status.name || status.description),
      state: teamFantasyKey_(status.state),
      completed: status.completed === true,
      seasonYear: settings.seasonYear,
      seasonType: seasonType,
      week: sourceWeek
    };
  }).filter(function(row) { return row.eventId && row.gameDateTime; });
}

function teamFantasyNormalizeScheduleRow_(row) {
  const homeAbbr = teamFantasyNormalizeTeam_(row.HomeAbbreviation || row.homeAbbreviation || row.HomeTeamAbbr || row.homeTeamAbbr || "");
  const awayAbbr = teamFantasyNormalizeTeam_(row.AwayAbbreviation || row.awayAbbreviation || row.AwayTeamAbbr || row.awayTeamAbbr || "");
  return {
    eventId: teamFantasyString_(row.ESPNEventId || row.espnEventId || row.EventId || row.eventId || row.GameId || row.gameId).replace(/^nfl_/, ""),
    sportsGameId: teamFantasyString_(row.GameId || row.gameId),
    gameDateTime: teamFantasyString_(row.GameDateTime || row.gameDateTime || row.Date || row.date),
    homeTeam: teamFantasyString_(row.HomeTeam || row.homeTeam),
    awayTeam: teamFantasyString_(row.AwayTeam || row.awayTeam),
    homeAbbr: homeAbbr,
    awayAbbr: awayAbbr,
    homeTeamId: teamFantasyString_(row.HomeTeamId || row.homeTeamId),
    awayTeamId: teamFantasyString_(row.AwayTeamId || row.awayTeamId),
    status: teamFantasyString_(row.Status || row.status),
    state: teamFantasyKey_(row.State || row.state),
    completed: teamFantasyBool_(row.Completed !== undefined ? row.Completed : row.completed, false) ||
      teamFantasyKey_(row.State || row.state) === "post" ||
      teamFantasyKey_(row.Status || row.status).indexOf("final") !== -1,
    seasonYear: Number(row.SeasonYear || row.seasonYear || 0),
    seasonType: Number(row.SeasonType || row.seasonType || 0),
    week: Number(row.Week || row.week || 0)
  };
}

function teamFantasyFetchScheduleFromSportsEngine_(settings, week) {
  const seasonType = teamFantasyScheduleSeasonType_(settings, week);
  const sourceWeek = teamFantasyScheduleWeek_(settings, week);

  // Preferred path: ask the separate Sports Scores Engine to fetch the exact
  // NFL week through its authenticated Cloudflare ESPN proxy. This works for
  // historical weeks as well as the live season.
  try {
    const parsed = teamFantasySportsEngineJson_("getTeamFantasyNflSchedule", {
      seasonYear: settings.seasonYear,
      seasonType: seasonType,
      week: sourceWeek
    });
    const rows = teamFantasyScheduleRowsFromEspnEvents_(parsed.events || (parsed.data && parsed.data.events) || [], settings, seasonType, sourceWeek);
    if (rows.length) return rows;
  } catch (err) {
    // Compatibility fallback below can still use rows already stored by the
    // Sports Scores Engine while deployments are rolling forward.
  }

  const base = teamFantasySportsApiUrl_();
  if (!base) return [];
  try {
    const separator = base.indexOf("?") === -1 ? "?" : "&";
    const url = base + separator + "action=getSportsScores&sport=football&league=nfl&_ts=" + Date.now();
    const parsed = teamFantasyHttpJson_(url);
    const rows = Array.isArray(parsed) ? parsed : (parsed.scores || parsed.games || parsed.rows || []);
    return rows.map(teamFantasyNormalizeScheduleRow_).filter(function(row) {
      if (row.seasonYear && row.seasonYear !== settings.seasonYear) return false;
      if (row.seasonType && row.seasonType !== seasonType) return false;
      if (row.week && row.week !== sourceWeek) return false;
      return row.eventId && row.gameDateTime;
    });
  } catch (err2) {
    return [];
  }
}

function teamFantasyFetchScheduleFromEspn_(settings, week) {
  // ESPN blocks Google Apps Script UrlFetchApp with HTTP 403. Team Fantasy
  // deliberately does not call ESPN directly; the separate Sports Scores
  // Engine owns the authenticated Cloudflare ESPN proxy.
  const rows = teamFantasyFetchScheduleFromSportsEngine_(settings, week);
  if (rows.length) return rows;
  throw new Error("NFL schedule unavailable from Sports Scores Engine. Direct ESPN fetch is disabled because ESPN blocks Google Apps Script with HTTP 403.");
}

function teamFantasyFetchWeekSchedule_(gameId, week) {
  const settings = teamFantasyGetSettings_(gameId);
  let rows = teamFantasyFetchScheduleFromSportsEngine_(settings, week);
  if (!rows.length) rows = teamFantasyFetchScheduleFromEspn_(settings, week);
  const byTeam = {};
  rows.forEach(function(game) {
    if (game.homeAbbr) byTeam[game.homeAbbr] = game;
    if (game.awayAbbr) byTeam[game.awayAbbr] = game;
  });
  return { games: rows, byTeam: byTeam };
}

function teamFantasyPickRows_(gameId, seasonYear, week, entryId) {
  return teamFantasyReadRows_(TEAM_FANTASY_SHEETS.PICKS).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId &&
      Number(row.SeasonYear) === Number(seasonYear) &&
      Number(row.Week) === Number(week) &&
      (!entryId || teamFantasyString_(row.EntryId) === entryId);
  });
}

function teamFantasyUsageCounts_(gameId, settings, entryId, currentWeek) {
  const counts = {};
  TEAM_FANTASY_POSITIONS.forEach(function(position) { counts[position] = {}; });
  teamFantasyReadRows_(TEAM_FANTASY_SHEETS.PICKS).forEach(function(row) {
    if (teamFantasyString_(row.GameId) !== gameId || teamFantasyString_(row.EntryId) !== entryId) return;
    if (Number(row.SeasonYear) !== settings.seasonYear) return;
    const rowWeek = Number(row.Week) || 0;
    if (rowWeek === Number(currentWeek)) return;
    if (Number(currentWeek) <= settings.regularSeasonEndWeek) {
      if (rowWeek < 1 || rowWeek > settings.regularSeasonEndWeek) return;
    } else if (settings.playoffUsageMode === "reset") {
      if (rowWeek <= settings.regularSeasonEndWeek) return;
    }
    const position = teamFantasyNormalizePosition_(row.Position);
    const team = teamFantasyNormalizeTeam_(row.TeamAbbr);
    if (position && team) counts[position][team] = (counts[position][team] || 0) + 1;
  });
  return counts;
}

function teamFantasyRankings_(gameId, position, beforeWeek) {
  position = teamFantasyNormalizePosition_(position);
  const totals = {};
  teamFantasyReadRows_(TEAM_FANTASY_SHEETS.UNIT_SCORES).forEach(function(row) {
    if (teamFantasyString_(row.GameId) !== gameId || teamFantasyNormalizePosition_(row.Position) !== position) return;
    if (!teamFantasyBool_(row.Final, false)) return;
    if (Number(row.Week) >= Number(beforeWeek)) return;
    const team = teamFantasyNormalizeTeam_(row.TeamAbbr);
    if (!team) return;
    if (!totals[team]) totals[team] = { points: 0, games: 0 };
    totals[team].points += teamFantasyNumber_(row.FantasyPoints, 0);
    totals[team].games++;
  });
  const ranked = Object.keys(totals).map(function(team) {
    return { team: team, average: totals[team].games ? totals[team].points / totals[team].games : 0, games: totals[team].games };
  }).sort(function(a, b) {
    if (b.average !== a.average) return b.average - a.average;
    return a.team.localeCompare(b.team);
  });
  const map = {};
  ranked.forEach(function(item, index) {
    map[item.team] = { rank: index + 1, average: teamFantasyRound_(item.average), games: item.games };
  });
  return map;
}

function teamFantasyEligibleTeams_(gameId, settings, entry, position, week, schedule, currentPick) {
  const now = new Date().getTime();
  const usage = teamFantasyUsageCounts_(gameId, settings, entry.entryId, week);
  const ranking = teamFantasyRankings_(gameId, position, week);
  const result = [];
  TEAM_FANTASY_NFL_TEAMS.forEach(function(team) {
    if (entry.conference !== "ALL" && entry.conference !== team.conference) return;
    const game = schedule.byTeam[team.abbr];
    const usesBefore = usage[position] && usage[position][team.abbr] ? usage[position][team.abbr] : 0;
    const isCurrent = currentPick && teamFantasyNormalizeTeam_(currentPick.TeamAbbr) === team.abbr;
    let reason = "";
    let eligible = true;
    if (!game) {
      eligible = false;
      reason = "BYE / not scheduled";
    } else {
      const start = new Date(game.gameDateTime).getTime();
      if (!isNaN(start) && start <= now && !isCurrent) {
        eligible = false;
        reason = game.completed ? "Game final" : "Game started";
      }
    }
    if (!isCurrent && usesBefore >= settings.teamUseLimit) {
      eligible = false;
      reason = "Usage limit reached";
    }
    const info = ranking[team.abbr] || null;
    result.push({
      abbr: team.abbr,
      name: team.name,
      conference: team.conference,
      eligible: eligible,
      reason: reason,
      uses: usesBefore + (isCurrent ? 1 : 0),
      usesRemaining: Math.max(0, settings.teamUseLimit - usesBefore - (isCurrent ? 1 : 0)),
      rank: info ? info.rank : null,
      average: info ? info.average : null,
      rankingGames: info ? info.games : 0,
      game: game || null,
      current: !!isCurrent
    });
  });
  result.sort(function(a, b) {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    const ar = a.rank === null ? 999 : a.rank;
    const br = b.rank === null ? 999 : b.rank;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
  return result;
}

function teamFantasyLineupState_(gameId, settings, entry, week, schedule) {
  const picks = teamFantasyPickRows_(gameId, settings.seasonYear, week, entry.entryId);
  const byPosition = {};
  picks.forEach(function(row) { byPosition[teamFantasyNormalizePosition_(row.Position)] = row; });
  const slots = TEAM_FANTASY_POSITIONS.map(function(position) {
    const pick = byPosition[position] || null;
    let locked = false;
    if (pick) {
      const game = schedule.byTeam[teamFantasyNormalizeTeam_(pick.TeamAbbr)];
      const start = game ? new Date(game.gameDateTime).getTime() : new Date(pick.GameDateTime || 0).getTime();
      locked = !isNaN(start) && start <= Date.now();
    }
    return {
      position: position,
      label: TEAM_FANTASY_POSITION_LABELS[position],
      pick: pick ? {
        teamAbbr: teamFantasyNormalizeTeam_(pick.TeamAbbr),
        teamName: teamFantasyString_(pick.TeamName),
        eventId: teamFantasyString_(pick.ESPNEventId),
        gameDateTime: teamFantasyString_(pick.GameDateTime),
        locked: locked,
        pickMethod: teamFantasyString_(pick.PickMethod)
      } : null,
      locked: locked,
      teams: teamFantasyEligibleTeams_(gameId, settings, entry, position, week, schedule, pick)
    };
  });
  return {
    entry: entry,
    required: slots.length,
    picked: slots.filter(function(slot) { return !!slot.pick; }).length,
    complete: slots.every(function(slot) { return !!slot.pick; }),
    missing: slots.filter(function(slot) { return !slot.pick; }).map(function(slot) { return slot.label; }),
    slots: slots
  };
}

function teamFantasySavePick_(payload) {
  payload = payload || {};
  const username = teamFantasyNormalizeUsername_(payload.username);
  const gameId = teamFantasyString_(payload.gameId);
  const entryId = teamFantasyString_(payload.entryId);
  const position = teamFantasyNormalizePosition_(payload.position);
  const teamAbbr = teamFantasyNormalizeTeam_(payload.teamAbbr);
  const pickMethod = teamFantasyKey_(payload.pickMethod) || "manual";
  if (!username || !gameId || !entryId || !position || !teamAbbr) throw new Error("Game, entry, position and team are required.");
  if (!teamFantasyIsGame_(gameId)) throw new Error("This game is not a Team Fantasy game.");
  const settings = payload._settings || teamFantasyGetSettings_(gameId);
  const week = Math.max(1, Math.floor(teamFantasyNumber_(payload.week, settings.currentWeek)));
  const entries = payload._entries || teamFantasyEnsureEntriesForUser_(gameId, username);
  const entry = entries.filter(function(item) { return item.entryId === entryId; })[0];
  if (!entry) throw new Error("Entry does not belong to the signed-in user.");
  const schedule = payload._schedule || teamFantasyFetchWeekSchedule_(gameId, week);
  const currentRows = teamFantasyPickRows_(gameId, settings.seasonYear, week, entryId);
  const current = currentRows.filter(function(row) { return teamFantasyNormalizePosition_(row.Position) === position; })[0] || null;
  if (current) {
    const currentGame = schedule.byTeam[teamFantasyNormalizeTeam_(current.TeamAbbr)];
    const currentStart = currentGame ? new Date(currentGame.gameDateTime).getTime() : new Date(current.GameDateTime || 0).getTime();
    if (!isNaN(currentStart) && currentStart <= Date.now()) throw new Error("That " + TEAM_FANTASY_POSITION_LABELS[position] + " pick is locked because its NFL game has started.");
  }
  const options = teamFantasyEligibleTeams_(gameId, settings, entry, position, week, schedule, current);
  const selected = options.filter(function(option) { return option.abbr === teamAbbr; })[0];
  if (!selected || !selected.eligible) throw new Error(selected && selected.reason ? selected.reason : "That team is not eligible for this slot.");
  const game = selected.game;
  const teamId = game.homeAbbr === teamAbbr ? game.homeTeamId : game.awayTeamId;
  const now = teamFantasyNowIso_();
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.PICKS, function(row) {
    return teamFantasyString_(row.GameId) === gameId && Number(row.SeasonYear) === settings.seasonYear &&
      Number(row.Week) === week && teamFantasyString_(row.EntryId) === entryId && teamFantasyNormalizePosition_(row.Position) === position;
  }, {
    GameId: gameId,
    SeasonYear: settings.seasonYear,
    Week: week,
    EntryId: entryId,
    Username: username,
    Conference: entry.conference,
    Position: position,
    TeamAbbr: teamAbbr,
    TeamName: selected.name,
    ESPNTeamId: teamId || "",
    ESPNEventId: game.eventId,
    GameDateTime: game.gameDateTime,
    Locked: false,
    PickMethod: pickMethod,
    CreatedAt: current ? current.CreatedAt || now : now,
    UpdatedAt: now
  });
  if (payload._deferFlush !== true) SpreadsheetApp.flush();
  return { success: true, gameId: gameId, week: week, entryId: entryId, position: position, teamAbbr: teamAbbr };
}

function apiSaveTeamFantasyPick(payload) {
  return teamFantasySavePick_(payload);
}

function teamFantasyAutoPick_(payload, randomOnly) {
  payload = payload || {};
  const username = teamFantasyNormalizeUsername_(payload.username);
  const gameId = teamFantasyString_(payload.gameId);
  const settings = teamFantasyGetSettings_(gameId);
  if (randomOnly && !settings.allowRandomPick) throw new Error("Random Pick is disabled for this game.");
  if (!randomOnly && !settings.allowSmartAutoPick) throw new Error("Auto Pick is disabled for this game.");
  const week = Math.max(1, Math.floor(teamFantasyNumber_(payload.week, settings.currentWeek)));
  const entries = teamFantasyEnsureEntriesForUser_(gameId, username);
  const wantedEntryId = teamFantasyString_(payload.entryId);
  const targets = wantedEntryId ? entries.filter(function(entry) { return entry.entryId === wantedEntryId; }) : entries;
  const results = [];
  const schedule = teamFantasyFetchWeekSchedule_(gameId, week);
  targets.forEach(function(entry) {
    const lineup = teamFantasyLineupState_(gameId, settings, entry, week, schedule);
    lineup.slots.forEach(function(slot) {
      if (slot.pick || slot.locked) return;
      const eligible = slot.teams.filter(function(team) { return team.eligible; });
      if (!eligible.length) return;
      let choice = null;
      if (randomOnly) {
        choice = eligible[Math.floor(Math.random() * eligible.length)];
      } else {
        const ranked = eligible.filter(function(team) { return team.rank !== null; });
        const pool = ranked.length ? ranked.slice(0, Math.max(1, Math.min(5, ranked.length))) : eligible;
        // Small amount of variety prevents every Auto Pick lineup from being identical.
        choice = pool[Math.floor(Math.random() * pool.length)];
      }
      results.push(teamFantasySavePick_({
        username: username,
        gameId: gameId,
        week: week,
        entryId: entry.entryId,
        position: slot.position,
        teamAbbr: choice.abbr,
        pickMethod: randomOnly ? "random" : "auto",
        _settings: settings,
        _entries: entries,
        _schedule: schedule,
        _deferFlush: true
      }));
    });
  });
  /* TEAM_FANTASY_GAME_DAY_BATCH_FLUSH_v1218r1 */
  SpreadsheetApp.flush();
  return { success: true, random: !!randomOnly, saved: results.length, results: results };
}

function apiRandomTeamFantasyPicks(payload) { return teamFantasyAutoPick_(payload, true); }
function apiAutoPickTeamFantasy(payload) { return teamFantasyAutoPick_(payload, false); }

function teamFantasyParseNumber_(value) {
  if (value === null || value === undefined || value === "") return 0;
  const text = String(value).replace(/,/g, "").trim();
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function teamFantasyParseMadeAttempted_(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? { made: Number(match[1]), attempted: Number(match[2]) } : { made: teamFantasyParseNumber_(text), attempted: teamFantasyParseNumber_(text) };
}

function teamFantasyFetchEspnSummary_(eventId) {
  eventId = teamFantasyString_(eventId).replace(/^nfl_/, "");
  if (!eventId) throw new Error("ESPN event id is required");
  const parsed = teamFantasySportsEngineJson_("getTeamFantasyNflSummary", { eventId: eventId });
  const data = parsed && parsed.data ? parsed.data : parsed;
  if (!data || typeof data !== "object") throw new Error("Sports Scores Engine returned an invalid NFL game summary.");
  return data;
}

function teamFantasyPlayerPositionAllowed_(unit, abbr) {
  unit = teamFantasyNormalizePosition_(unit);
  abbr = teamFantasyString_(abbr).toUpperCase();
  const allowed = {
    QB: ["QB"],
    RB: ["RB", "FB"],
    WRTE: ["WR", "TE"],
    K: ["K", "PK"],
    DL: ["DE", "DT", "DL", "NT", "EDGE"],
    LB: ["LB", "ILB", "OLB", "MLB"],
    DB: ["CB", "S", "FS", "SS", "DB"]
  };
  return allowed[unit] && allowed[unit].indexOf(abbr) !== -1;
}

function teamFantasyAddStat_(stats, key, value) {
  if (!key) return;
  stats[key] = teamFantasyNumber_(stats[key], 0) + teamFantasyNumber_(value, 0);
}

function teamFantasyPlayerStatsForUnit_(summary, teamAbbr, unit) {
  const stats = {};
  const teamBlocks = summary && summary.boxscore && Array.isArray(summary.boxscore.players) ? summary.boxscore.players : [];
  const block = teamBlocks.filter(function(item) {
    return teamFantasyNormalizeTeam_(item.team && item.team.abbreviation) === teamAbbr;
  })[0];
  if (!block) return stats;
  (block.statistics || []).forEach(function(category) {
    const categoryName = teamFantasyKey_(category.name || category.displayName);
    const labels = category.labels || category.names || [];
    (category.athletes || []).forEach(function(athleteRow) {
      const athlete = athleteRow.athlete || {};
      const pos = teamFantasyString_(athlete.position && (athlete.position.abbreviation || athlete.position.name)).toUpperCase();
      if (!teamFantasyPlayerPositionAllowed_(unit, pos)) return;
      const values = athleteRow.stats || [];
      const map = {};
      labels.forEach(function(label, index) { map[teamFantasyString_(label).toUpperCase()] = values[index]; });
      if (categoryName.indexOf("passing") !== -1) {
        const compAtt = teamFantasyParseMadeAttempted_(map["C/ATT"] || map["CMP/ATT"] || "0/0");
        teamFantasyAddStat_(stats, "completions", map.CMP !== undefined ? map.CMP : compAtt.made);
        teamFantasyAddStat_(stats, "passingAttempts", map.ATT !== undefined ? map.ATT : compAtt.attempted);
        teamFantasyAddStat_(stats, "passingYards", map.YDS);
        teamFantasyAddStat_(stats, "passingTouchdowns", map.TD);
        teamFantasyAddStat_(stats, "interceptionsThrown", map.INT);
      } else if (categoryName.indexOf("rushing") !== -1) {
        teamFantasyAddStat_(stats, "rushingYards", map.YDS);
        teamFantasyAddStat_(stats, "rushingTouchdowns", map.TD);
      } else if (categoryName.indexOf("receiving") !== -1) {
        teamFantasyAddStat_(stats, "receptions", map.REC);
        teamFantasyAddStat_(stats, "receivingYards", map.YDS);
        teamFantasyAddStat_(stats, "receivingTouchdowns", map.TD);
        teamFantasyAddStat_(stats, "targets", map.TGTS || map.TGT);
      } else if (categoryName.indexOf("fumble") !== -1) {
        teamFantasyAddStat_(stats, "fumbles", map.FUM);
        teamFantasyAddStat_(stats, "fumblesLost", map.LOST);
        teamFantasyAddStat_(stats, "fumbleRecoveries", map.REC || map.FR);
      } else if (categoryName.indexOf("defens") !== -1) {
        teamFantasyAddStat_(stats, "tacklesTotal", map.TOT || map.TOTAL);
        teamFantasyAddStat_(stats, "tacklesSolo", map.SOLO);
        teamFantasyAddStat_(stats, "sacks", map.SACKS || map.SACK);
        teamFantasyAddStat_(stats, "tacklesForLoss", map.TFL);
        teamFantasyAddStat_(stats, "passesDefended", map.PD || map.PDEF);
        teamFantasyAddStat_(stats, "qbHits", map["QB HTS"] || map.QBH || map.QBHITS);
        teamFantasyAddStat_(stats, "forcedFumbles", map.FF);
        teamFantasyAddStat_(stats, "fumbleRecoveries", map.FR);
        teamFantasyAddStat_(stats, "defensiveTouchdowns", map.TD);
      } else if (categoryName.indexOf("interception") !== -1) {
        teamFantasyAddStat_(stats, "interceptions", map.INT);
        teamFantasyAddStat_(stats, "interceptionReturnYards", map.YDS);
        teamFantasyAddStat_(stats, "defensiveTouchdowns", map.TD);
      } else if (categoryName.indexOf("kicking") !== -1) {
        const fg = teamFantasyParseMadeAttempted_(map.FG || map.FGM || "0/0");
        const xp = teamFantasyParseMadeAttempted_(map.XP || map.XPM || "0/0");
        teamFantasyAddStat_(stats, "fieldGoalsMade", fg.made);
        teamFantasyAddStat_(stats, "fieldGoalsAttempted", fg.attempted);
        teamFantasyAddStat_(stats, "fieldGoalsMissed", Math.max(0, fg.attempted - fg.made));
        teamFantasyAddStat_(stats, "extraPointsMade", xp.made);
        teamFantasyAddStat_(stats, "extraPointsAttempted", xp.attempted);
        teamFantasyAddStat_(stats, "extraPointsMissed", Math.max(0, xp.attempted - xp.made));
        teamFantasyAddStat_(stats, "kickingPoints", map.PTS);
      }
    });
  });
  return stats;
}

function teamFantasyTeamStats_(summary, teamAbbr) {
  const stats = {};
  const teams = summary && summary.boxscore && Array.isArray(summary.boxscore.teams) ? summary.boxscore.teams : [];
  const block = teams.filter(function(item) {
    return teamFantasyNormalizeTeam_(item.team && item.team.abbreviation) === teamAbbr;
  })[0];
  if (!block) return stats;
  (block.statistics || []).forEach(function(stat) {
    const name = teamFantasyKey_(stat.name || stat.label || stat.abbreviation).replace(/[^a-z0-9]/g, "");
    const raw = stat.value !== undefined && stat.value !== null ? stat.value : stat.displayValue;
    if (name === "rushingyards" || name === "rushing") stats.rushingYards = teamFantasyParseNumber_(raw);
    if (name === "totalyards" || name === "totaloffense") stats.totalYards = teamFantasyParseNumber_(raw);
    if (name === "netpassingyards" || name === "passingyards") stats.netPassingYards = teamFantasyParseNumber_(raw);
    if (name.indexOf("sack") !== -1 && name.indexOf("yard") !== -1) stats.sacksAllowed = teamFantasyParseNumber_(raw);
    if (name === "sacksallowed") stats.sacksAllowed = teamFantasyParseNumber_(raw);
    if (name === "turnovers") stats.turnovers = teamFantasyParseNumber_(raw);
  });
  return stats;
}

function teamFantasyStatsForTeamUnit_(summary, teamAbbr, position) {
  teamAbbr = teamFantasyNormalizeTeam_(teamAbbr);
  position = teamFantasyNormalizePosition_(position);
  if (position === "OL") return teamFantasyTeamStats_(summary, teamAbbr);
  return teamFantasyPlayerStatsForUnit_(summary, teamAbbr, position);
}

function teamFantasySummaryFinal_(summary) {
  try {
    const status = summary.header.competitions[0].status.type;
    return status.completed === true || teamFantasyKey_(status.state) === "post";
  } catch (err) {
    return false;
  }
}

function teamFantasyScoreStats_(rules, position, stats) {
  const detail = [];
  let total = 0;
  rules.filter(function(rule) { return rule.active && rule.position === position; }).forEach(function(rule) {
    const statValue = teamFantasyNumber_(stats[rule.statKey], 0);
    let points = 0;
    if (rule.ruleType === "bonus") {
      if (rule.threshold !== null && statValue >= rule.threshold) points = rule.bonusPoints;
    } else {
      points = statValue * rule.pointsPerUnit;
    }
    if (points !== 0 || statValue !== 0) {
      detail.push({ ruleId: rule.ruleId, label: rule.label, statKey: rule.statKey, value: statValue, points: teamFantasyRound_(points) });
    }
    total += points;
  });
  return { points: teamFantasyRound_(total), detail: detail };
}

function teamFantasyUpsertUnitScore_(values) {
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.UNIT_SCORES, function(row) {
    return teamFantasyString_(row.GameId) === values.GameId && Number(row.SeasonYear) === Number(values.SeasonYear) &&
      Number(row.Week) === Number(values.Week) && teamFantasyString_(row.EntryId) === values.EntryId &&
      teamFantasyNormalizePosition_(row.Position) === values.Position;
  }, values);
}

function teamFantasyRefreshWeekScores_(gameId, week, weekClosed) {
  const settings = teamFantasyGetSettings_(gameId);
  const entries = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId && teamFantasyBool_(row.Active, true);
  }).map(teamFantasyPublicEntry_);
  const unitRows = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.UNIT_SCORES).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId && Number(row.SeasonYear) === settings.seasonYear && Number(row.Week) === Number(week);
  });
  const pickRows = teamFantasyPickRows_(gameId, settings.seasonYear, week, "");
  entries.forEach(function(entry) {
    const units = unitRows.filter(function(row) { return teamFantasyString_(row.EntryId) === entry.entryId; });
    const picks = pickRows.filter(function(row) { return teamFantasyString_(row.EntryId) === entry.entryId; });
    const pickedMap = {};
    picks.forEach(function(row) { pickedMap[teamFantasyNormalizePosition_(row.Position)] = true; });
    const unitMap = {};
    units.forEach(function(row) { unitMap[teamFantasyNormalizePosition_(row.Position)] = row; });
    const missing = TEAM_FANTASY_POSITIONS.filter(function(position) { return !pickedMap[position]; });
    const total = units.reduce(function(sum, row) { return sum + teamFantasyNumber_(row.FantasyPoints, 0); }, 0);
    const allScoredFinal = TEAM_FANTASY_POSITIONS.filter(function(position) { return pickedMap[position]; }).every(function(position) {
      return unitMap[position] && teamFantasyBool_(unitMap[position].Final, false);
    });
    const detail = TEAM_FANTASY_POSITIONS.map(function(position) {
      const row = unitMap[position];
      return { position: position, points: row ? teamFantasyNumber_(row.FantasyPoints, 0) : 0, final: row ? teamFantasyBool_(row.Final, false) : false };
    });
    teamFantasyUpsert_(TEAM_FANTASY_SHEETS.WEEK_SCORES, function(row) {
      return teamFantasyString_(row.GameId) === gameId && Number(row.SeasonYear) === settings.seasonYear &&
        Number(row.Week) === Number(week) && teamFantasyString_(row.EntryId) === entry.entryId;
    }, {
      GameId: gameId,
      SeasonYear: settings.seasonYear,
      Week: week,
      Phase: teamFantasyPhaseForWeek_(settings, week),
      EntryId: entry.entryId,
      Username: entry.username,
      Conference: entry.conference,
      FantasyPoints: teamFantasyRound_(total),
      // During the live week, an incomplete lineup stays pending. Once every NFL
      // game in the source week is final, empty slots correctly become zeroes and
      // the entry receives its All-Play/H2H result instead of escaping losses.
      Final: allScoredFinal && (missing.length === 0 || weekClosed === true),
      MissingPositionsJSON: JSON.stringify(missing),
      ScoreDetailJSON: JSON.stringify(detail),
      UpdatedAt: teamFantasyNowIso_()
    });
  });
}

function teamFantasyRefreshAndScoreWeek_(gameId, week) {
  const settings = teamFantasyGetSettings_(gameId);
  const picks = teamFantasyPickRows_(gameId, settings.seasonYear, week, "");
  const rules = teamFantasyRules_(gameId);
  const byEvent = {};
  const schedule = teamFantasyFetchWeekSchedule_(gameId, week);
  const weekClosed = schedule.games.length > 0 && schedule.games.every(function(game) {
    return game.completed === true || game.state === "post" || teamFantasyKey_(game.status).indexOf("final") !== -1;
  });
  let scored = 0;
  let pending = 0;
  const errors = [];
  picks.forEach(function(pick) {
    const eventId = teamFantasyString_(pick.ESPNEventId);
    if (!eventId) { pending++; return; }
    try {
      if (!byEvent[eventId]) byEvent[eventId] = teamFantasyFetchEspnSummary_(eventId);
      const summary = byEvent[eventId];
      const position = teamFantasyNormalizePosition_(pick.Position);
      const team = teamFantasyNormalizeTeam_(pick.TeamAbbr);
      const stats = teamFantasyStatsForTeamUnit_(summary, team, position);
      const scoredStats = teamFantasyScoreStats_(rules, position, stats);
      const final = teamFantasySummaryFinal_(summary);
      teamFantasyUpsertUnitScore_({
        GameId: gameId,
        SeasonYear: settings.seasonYear,
        Week: week,
        EntryId: teamFantasyString_(pick.EntryId),
        Username: teamFantasyNormalizeUsername_(pick.Username),
        Conference: teamFantasyString_(pick.Conference),
        Position: position,
        TeamAbbr: team,
        ESPNEventId: eventId,
        FantasyPoints: scoredStats.points,
        StatsJSON: JSON.stringify(stats),
        ScoreDetailJSON: JSON.stringify(scoredStats.detail),
        Final: final,
        UpdatedAt: teamFantasyNowIso_()
      });
      if (final) scored++; else pending++;
    } catch (err) {
      errors.push({ entryId: pick.EntryId, position: pick.Position, team: pick.TeamAbbr, error: err && err.message ? err.message : String(err) });
    }
  });
  teamFantasyRefreshWeekScores_(gameId, week, weekClosed);
  SpreadsheetApp.flush();
  return { success: errors.length === 0, gameId: gameId, week: week, weekClosed: weekClosed, scheduleGames: schedule.games.length, picks: picks.length, scored: scored, pending: pending, errors: errors };
}

function teamFantasyLeagueRow_(gameId, leagueId) {
  return teamFantasyReadRows_(TEAM_FANTASY_SHEETS.LEAGUES).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.LeagueId) === leagueId && teamFantasyBool_(row.Active, true);
  })[0] || null;
}

function teamFantasyLeagueEntryIds_(gameId, leagueId) {
  const set = {};
  teamFantasyReadRows_(TEAM_FANTASY_SHEETS.MEMBERSHIPS).forEach(function(row) {
    if (teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.LeagueId) === leagueId) set[teamFantasyString_(row.EntryId)] = true;
  });
  return set;
}

function teamFantasyUserCanViewLeague_(gameId, username, leagueId) {
  username = teamFantasyNormalizeUsername_(username);
  leagueId = teamFantasyString_(leagueId) || "complete";
  if (!username) return false;
  const entries = teamFantasyEnsureEntriesForUser_(gameId, username);
  const ids = {};
  entries.forEach(function(entry) { ids[entry.entryId] = true; });
  return teamFantasyReadRows_(TEAM_FANTASY_SHEETS.MEMBERSHIPS).some(function(row) {
    return teamFantasyString_(row.GameId) === gameId &&
      teamFantasyString_(row.LeagueId) === leagueId &&
      ids[teamFantasyString_(row.EntryId)];
  });
}

function teamFantasyLeagueWeeklyCompetitors_(gameId, leagueId, standingMode) {
  const settings = teamFantasyGetSettings_(gameId);
  const allowedEntries = teamFantasyLeagueEntryIds_(gameId, leagueId);
  const rows = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.WEEK_SCORES).filter(function(row) {
    return teamFantasyString_(row.GameId) === gameId && Number(row.SeasonYear) === settings.seasonYear && allowedEntries[teamFantasyString_(row.EntryId)];
  });
  const byWeek = {};
  rows.forEach(function(row) {
    const week = Number(row.Week);
    if (!byWeek[week]) byWeek[week] = {};
    const username = teamFantasyNormalizeUsername_(row.Username);
    const competitorId = standingMode === "combined-user" ? "user:" + username : "entry:" + teamFantasyString_(row.EntryId);
    if (!byWeek[week][competitorId]) {
      byWeek[week][competitorId] = {
        competitorId: competitorId,
        username: username,
        entryId: standingMode === "combined-user" ? "" : teamFantasyString_(row.EntryId),
        name: standingMode === "combined-user" ? username : teamFantasyString_(row.EntryId),
        score: 0,
        final: true,
        components: []
      };
    }
    byWeek[week][competitorId].score += teamFantasyNumber_(row.FantasyPoints, 0);
    byWeek[week][competitorId].final = byWeek[week][competitorId].final && teamFantasyBool_(row.Final, false);
    byWeek[week][competitorId].components.push({ entryId: teamFantasyString_(row.EntryId), conference: teamFantasyString_(row.Conference), score: teamFantasyNumber_(row.FantasyPoints, 0) });
  });
  Object.keys(byWeek).forEach(function(week) {
    Object.keys(byWeek[week]).forEach(function(id) { byWeek[week][id].score = teamFantasyRound_(byWeek[week][id].score); });
  });
  return byWeek;
}

function teamFantasyBuildStandings_(gameId, leagueId) {
  const settings = teamFantasyGetSettings_(gameId);
  const league = teamFantasyLeagueRow_(gameId, leagueId || "complete");
  if (!league) return { success: false, error: "League not found." };
  const standingMode = teamFantasyKey_(league.StandingMode) === "entries" ? "entries" : settings.standingMode;
  const byWeek = teamFantasyLeagueWeeklyCompetitors_(gameId, teamFantasyString_(league.LeagueId), standingMode);
  const standings = {};
  function ensure(item) {
    if (!standings[item.competitorId]) {
      standings[item.competitorId] = {
        competitorId: item.competitorId,
        username: item.username,
        entryId: item.entryId,
        name: item.name,
        wins: 0, losses: 0, ties: 0, fantasyPoints: 0, weeksPlayed: 0,
        regularWins: 0, regularLosses: 0, regularTies: 0, regularPoints: 0,
        postseasonPoints: 0, postseasonRoundPoints: 0, postseasonLatestWeek: 0, weekly: []
      };
    }
    return standings[item.competitorId];
  }
  Object.keys(byWeek).map(Number).sort(function(a, b) { return a - b; }).forEach(function(week) {
    const items = Object.keys(byWeek[week]).map(function(id) { return byWeek[week][id]; });
    const finalItems = items.filter(function(item) { return item.final; });
    finalItems.forEach(function(item) {
      const row = ensure(item);
      row.fantasyPoints += item.score;
      row.weeksPlayed++;
      row.weekly.push({ week: week, score: item.score });
      if (week <= settings.regularSeasonEndWeek) row.regularPoints += item.score;
      else {
        row.postseasonPoints += item.score;
        if (week >= row.postseasonLatestWeek) {
          row.postseasonLatestWeek = week;
          row.postseasonRoundPoints = item.score;
        }
      }
    });
    for (let i = 0; i < finalItems.length; i++) {
      for (let j = i + 1; j < finalItems.length; j++) {
        const a = ensure(finalItems[i]);
        const b = ensure(finalItems[j]);
        if (finalItems[i].score > finalItems[j].score) { a.wins++; b.losses++; if (week <= settings.regularSeasonEndWeek) { a.regularWins++; b.regularLosses++; } }
        else if (finalItems[i].score < finalItems[j].score) { b.wins++; a.losses++; if (week <= settings.regularSeasonEndWeek) { b.regularWins++; a.regularLosses++; } }
        else { a.ties++; b.ties++; if (week <= settings.regularSeasonEndWeek) { a.regularTies++; b.regularTies++; } }
      }
    }
  });
  let rows = Object.keys(standings).map(function(id) {
    const row = standings[id];
    row.fantasyPoints = teamFantasyRound_(row.fantasyPoints);
    row.regularPoints = teamFantasyRound_(row.regularPoints);
    row.postseasonPoints = teamFantasyRound_(row.postseasonPoints);
    row.postseasonRoundPoints = teamFantasyRound_(row.postseasonRoundPoints);
    row.playoffScore = settings.postseasonScoringMode === "fresh-round" ? row.postseasonRoundPoints : row.postseasonPoints;
    const decisions = row.regularWins + row.regularLosses + row.regularTies;
    row.winPct = decisions ? teamFantasyRound_((row.regularWins + 0.5 * row.regularTies) / decisions) : 0;
    return row;
  });
  rows.sort(function(a, b) {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.regularPoints !== a.regularPoints) return b.regularPoints - a.regularPoints;
    return a.competitorId.localeCompare(b.competitorId);
  });
  rows.forEach(function(row, index) { row.rank = index + 1; });
  const playoffTeams = Math.max(2, Math.floor(teamFantasyNumber_(league.PlayoffTeams, leagueId === "complete" ? settings.overallPlayoffTeams : settings.subleaguePlayoffDefault)));
  const qualifiers = rows.slice(0, Math.min(playoffTeams, rows.length)).map(function(row) { return row.competitorId; });
  rows.forEach(function(row) { row.playoffQualified = qualifiers.indexOf(row.competitorId) !== -1; });
  const playoffStandings = rows.filter(function(row) { return row.playoffQualified; }).slice().sort(function(a, b) {
    if (b.playoffScore !== a.playoffScore) return b.playoffScore - a.playoffScore;
    return a.rank - b.rank;
  });
  playoffStandings.forEach(function(row, index) { row.playoffRank = index + 1; });
  return {
    success: true,
    gameId: gameId,
    league: {
      leagueId: teamFantasyString_(league.LeagueId),
      leagueName: teamFantasyString_(league.LeagueName),
      leagueType: teamFantasyString_(league.LeagueType),
      standingMode: standingMode,
      playoffTeams: playoffTeams
    },
    rows: rows,
    qualifiers: qualifiers,
    playoffStandings: playoffStandings,
    postseasonScoringMode: settings.postseasonScoringMode
  };
}

function apiGetTeamFantasyStandings(payload) {
  payload = payload || {};
  const gameId = teamFantasyString_(payload.gameId);
  const leagueId = teamFantasyString_(payload.leagueId) || "complete";
  const username = teamFantasyNormalizeUsername_(payload.username);
  if (!teamFantasyUserCanViewLeague_(gameId, username, leagueId)) return { success: false, error: "You are not a member of that Team Fantasy league." };
  return teamFantasyBuildStandings_(gameId, leagueId);
}

function apiGetTeamFantasyHeadToHead(payload) {
  payload = payload || {};
  const gameId = teamFantasyString_(payload.gameId);
  const leagueId = teamFantasyString_(payload.leagueId) || "complete";
  const league = teamFantasyLeagueRow_(gameId, leagueId);
  if (!league) return { success: false, error: "League not found." };
  const username = teamFantasyNormalizeUsername_(payload.username);
  if (!teamFantasyUserCanViewLeague_(gameId, username, leagueId)) return { success: false, error: "You are not a member of that Team Fantasy league." };
  const settings = teamFantasyGetSettings_(gameId);
  const standingMode = teamFantasyKey_(league.StandingMode) === "entries" ? "entries" : settings.standingMode;
  const aId = teamFantasyString_(payload.competitorA);
  const bId = teamFantasyString_(payload.competitorB);
  if (!aId || !bId || aId === bId) return { success: false, error: "Choose two different entries/players." };
  const byWeek = teamFantasyLeagueWeeklyCompetitors_(gameId, leagueId, standingMode);
  const history = [];
  let aWins = 0, bWins = 0, ties = 0, aPoints = 0, bPoints = 0;
  Object.keys(byWeek).map(Number).sort(function(a, b) { return a - b; }).forEach(function(week) {
    const a = byWeek[week][aId];
    const b = byWeek[week][bId];
    if (!a || !b || !a.final || !b.final) return;
    let winner = "tie";
    if (a.score > b.score) { winner = aId; aWins++; }
    else if (b.score > a.score) { winner = bId; bWins++; }
    else ties++;
    aPoints += a.score;
    bPoints += b.score;
    history.push({ week: week, phase: teamFantasyPhaseForWeek_(settings, week), scoreA: a.score, scoreB: b.score, winner: winner });
  });
  return {
    success: true,
    gameId: gameId,
    leagueId: leagueId,
    competitorA: aId,
    competitorB: bId,
    aWins: aWins,
    bWins: bWins,
    ties: ties,
    aPoints: teamFantasyRound_(aPoints),
    bPoints: teamFantasyRound_(bPoints),
    aAverage: history.length ? teamFantasyRound_(aPoints / history.length) : 0,
    bAverage: history.length ? teamFantasyRound_(bPoints / history.length) : 0,
    history: history
  };
}

function apiGetTeamFantasyState(payload) {
  payload = payload || {};
  setupSportsTeamFantasySystem();
  const username = teamFantasyNormalizeUsername_(payload.username);
  const gameId = teamFantasyString_(payload.gameId);
  if (!username || !gameId) throw new Error("User and game are required.");
  if (!teamFantasyIsGame_(gameId)) return { success: false, error: "This game is not configured as Team Fantasy Football." };
  const settings = teamFantasyGetSettings_(gameId);
  const week = Math.max(1, Math.floor(teamFantasyNumber_(payload.week, settings.currentWeek)));
  const entries = teamFantasyEnsureEntriesForUser_(gameId, username);
  const schedule = teamFantasyFetchWeekSchedule_(gameId, week);
  const lineups = entries.map(function(entry) { return teamFantasyLineupState_(gameId, settings, entry, week, schedule); });
  const leagues = teamFantasyLeaguesForEntries_(gameId, entries);
  const requestedLeagueId = teamFantasyString_(payload.leagueId);
  const requestedAllowed = requestedLeagueId && leagues.some(function(league) { return league.leagueId === requestedLeagueId; });
  const selectedLeagueId = requestedAllowed ? requestedLeagueId : (leagues[0] ? leagues[0].leagueId : "complete");
  const standings = teamFantasyBuildStandings_(gameId, selectedLeagueId);
  return {
    success: true,
    version: TEAM_FANTASY_VERSION,
    gameId: gameId,
    username: username,
    week: week,
    phase: teamFantasyPhaseForWeek_(settings, week),
    settings: settings,
    entries: entries,
    lineups: lineups,
    leagues: leagues,
    selectedLeagueId: selectedLeagueId,
    standings: standings.success ? standings : null,
    scheduleGames: schedule.games,
    positionLabels: TEAM_FANTASY_POSITION_LABELS
  };
}

function teamFantasyNotificationOutstandingSummary_(gameId, participants) {
  const settings = teamFantasyGetSettings_(gameId);
  const usernames = {};
  (participants || []).concat(teamFantasyParticipantUsernames_(gameId)).forEach(function(username) {
    const key = teamFantasyNormalizeUsername_(username);
    if (key) usernames[key] = true;
  });
  const details = [];
  const noPicksUsers = [];
  const incompleteUsers = [];
  const completeUsers = [];
  const schedule = teamFantasyFetchWeekSchedule_(gameId, settings.currentWeek);
  Object.keys(usernames).forEach(function(username) {
    const entries = teamFantasyEnsureEntriesForUser_(gameId, username);
    let required = 0;
    let picked = 0;
    let openRequired = 0;
    const missing = [];
    entries.forEach(function(entry) {
      const lineup = teamFantasyLineupState_(gameId, settings, entry, settings.currentWeek, schedule);
      required += lineup.required;
      picked += lineup.picked;
      lineup.slots.forEach(function(slot) {
        if (!slot.pick) {
          const hasEligible = slot.teams.some(function(team) { return team.eligible; });
          if (hasEligible) {
            openRequired++;
            missing.push((entry.conference === "ALL" ? "" : entry.conference + " ") + slot.label);
          }
        }
      });
    });
    if (picked === 0 && openRequired > 0) noPicksUsers.push(username);
    else if (openRequired > 0) incompleteUsers.push(username);
    else completeUsers.push(username);
    details.push({ username: username, picked: picked, required: required, missing: missing, missingCount: openRequired });
  });
  const missingUsers = noPicksUsers.concat(incompleteUsers);
  const maxRequired = details.reduce(function(max, item) { return Math.max(max, item.required); }, 0);
  return {
    requiredIds: TEAM_FANTASY_POSITIONS.slice(),
    requiredCount: maxRequired,
    requiredQuestionIds: TEAM_FANTASY_POSITIONS.slice(),
    requiredQuestions: maxRequired,
    rosterUsers: Object.keys(usernames).length,
    noPicksUsers: noPicksUsers,
    incompleteUsers: incompleteUsers,
    completeUsers: completeUsers,
    missingUsers: missingUsers,
    details: details
  };
}

function apiAdminSendTeamFantasyReminder(payload) {
  payload = payload || {};
  const adminUsername = typeof requireAdminFromToken_ === "function" ? requireAdminFromToken_(payload.token) : teamFantasyNormalizeUsername_(payload.username);
  const gameId = teamFantasyString_(payload.gameId);
  if (!gameId) throw new Error("Game is required.");
  const settings = teamFantasyGetSettings_(gameId);
  if (!settings.reminderEnabled) return { success: false, message: "Team Fantasy reminders are disabled for this game." };
  const summary = teamFantasyNotificationOutstandingSummary_(gameId, teamFantasyParticipantUsernames_(gameId));
  const previewOnly = payload.previewOnly === true;
  if (previewOnly) {
    return { success: true, preview: true, gameId: gameId, week: settings.currentWeek, missingUsers: summary.missingUsers.length, details: summary.details };
  }
  if (typeof notificationPushGetSystemMode_ !== "function" || typeof notificationPushGatewaySend_ !== "function") {
    return { success: false, message: "Push notification engine is not available." };
  }
  const globalMode = notificationPushGetSystemMode_();
  const gameSetting = notificationPushGetGameSetting_(gameId);
  if (globalMode === "OFF") return { success: false, message: "Global notifications are OFF." };
  if (gameSetting && (!gameSetting.enabled || gameSetting.paused)) return { success: false, message: gameSetting.paused ? "Notifications are paused for this game." : "Notifications are OFF for this game." };
  const prefs = typeof notificationPushPreferenceSnapshot_ === "function" ? notificationPushPreferenceSnapshot_() : {};
  let sent = 0, failed = 0, users = 0;
  const errors = [];
  summary.details.filter(function(item) { return item.missingCount > 0; }).forEach(function(item) {
    if (typeof notificationPushUserAllowsType_ === "function" && !notificationPushUserAllowsType_(item.username, "make_picks", prefs)) return;
    const subscriptions = notificationPushGetActiveSubscriptionsForUsers_([item.username]);
    if (!subscriptions.length) return;
    users++;
    const missingText = item.missing.slice(0, 4).join(", ") + (item.missing.length > 4 ? " +" + (item.missing.length - 4) + " more" : "");
    const title = "Team Fantasy Week " + settings.currentWeek;
    const message = item.picked + "/" + item.required + " complete — " + missingText + " still open.";
    const response = notificationPushGatewaySend_(subscriptions, {
      title: title,
      body: message,
      message: message,
      route: "team-fantasy",
      data: { route: "team-fantasy", gameId: gameId, week: settings.currentWeek, type: "make_picks" }
    });
    (response.results || []).forEach(function(result) {
      if (typeof notificationPushMarkDeliveryResult_ === "function") notificationPushMarkDeliveryResult_(result);
    });
    sent += Number(response.sent || 0);
    failed += Number(response.failed || 0);
    if (response.success === false) errors.push(item.username + ": " + teamFantasyString_(response.message || response.error));
    teamFantasyAppendObject_(TEAM_FANTASY_SHEETS.REMINDER_LOG, {
      SentAt: teamFantasyNowIso_(), GameId: gameId, SeasonYear: settings.seasonYear, Week: settings.currentWeek,
      Username: item.username, EntryId: "", MissingPositionsJSON: JSON.stringify(item.missing),
      Title: title, Message: message, Sent: Number(response.sent || 0), Failed: Number(response.failed || 0), Error: response.success === false ? teamFantasyString_(response.message || response.error) : ""
    });
  });
  return { success: errors.length === 0, adminUsername: adminUsername, gameId: gameId, week: settings.currentWeek, recipientUsers: users, sent: sent, failed: failed, errors: errors };
}

function teamFantasySyncTriggerStatus_() {
  let count = 0;
  try {
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction() === "teamFantasySyncTriggerHandler") count++;
    });
    return { available: true, active: count > 0, count: count, handler: "teamFantasySyncTriggerHandler" };
  } catch (err) {
    return { available: false, active: false, count: 0, handler: "teamFantasySyncTriggerHandler", error: err && err.message ? err.message : String(err) };
  }
}

function teamFantasyRecordSyncStatus_(gameId, status, message, username) {
  const now = teamFantasyNowIso_();
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.SETTINGS, function(row) {
    return teamFantasyString_(row.GameId) === gameId;
  }, {
    GameId: gameId,
    LastSyncAt: now,
    LastSyncStatus: teamFantasyString_(status) || "unknown",
    LastSyncMessage: teamFantasyString_(message),
    UpdatedAt: now,
    UpdatedBy: teamFantasyNormalizeUsername_(username) || "system"
  });
  return now;
}

function teamFantasySyncTriggerHandler() {
  const settingsRows = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.SETTINGS);
  const results = [];
  settingsRows.forEach(function(row) {
    const settings = teamFantasyNormalizeSettings_(row);
    if (!settings.syncTriggerEnabled || !teamFantasyIsGame_(settings.gameId)) return;
    try {
      /* TEAM_FANTASY_GAME_DAY_CORE_PATCH_v1218r1 */
      const gate = typeof teamFantasyGameDayTriggerWindow_ === "function"
        ? teamFantasyGameDayTriggerWindow_(settings.gameId, settings.currentWeek, Date.now())
        : { active: true, reason: "compatibility" };
      if (!gate.active) {
        results.push({ success: true, skipped: true, gameId: settings.gameId, week: settings.currentWeek, reason: gate.reason || "outside NFL game window" });
        return;
      }
      const result = teamFantasyRefreshAndScoreWeek_(settings.gameId, settings.currentWeek);
      const message = "Week " + settings.currentWeek + ": " + Number(result.picks || 0) + " picks, " + Number(result.scored || 0) + " final, " + Number(result.pending || 0) + " pending, " + Number((result.errors || []).length) + " errors.";
      result.lastSyncAt = teamFantasyRecordSyncStatus_(settings.gameId, result.success === false ? "error" : "success", message, "system");
      results.push(result);
    } catch (err) {
      const error = err && err.message ? err.message : String(err);
      teamFantasyRecordSyncStatus_(settings.gameId, "error", error, "system");
      results.push({ success: false, gameId: settings.gameId, error: error });
    }
  });
  return { success: true, triggerStatus: teamFantasySyncTriggerStatus_(), results: results };
}

function teamFantasyInstallSyncTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "teamFantasySyncTriggerHandler") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("teamFantasySyncTriggerHandler").timeBased().everyMinutes(5).create();
  const status = teamFantasySyncTriggerStatus_();
  if (!status.active) throw new Error("The Team Fantasy 5-minute trigger was not found after installation.");
  return status;
}

function apiAdminInstallTeamFantasySyncTrigger(payload) {
  payload = payload || {};
  if (typeof requireAdminFromToken_ === "function") requireAdminFromToken_(payload.token);
  const gameId = teamFantasyString_(payload.gameId);
  if (!gameId || !teamFantasyIsGame_(gameId)) throw new Error("Choose a saved Team Fantasy game first.");
  teamFantasyGetSettings_(gameId);
  const triggerStatus = teamFantasyInstallSyncTrigger_();
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.SETTINGS, function(row) { return teamFantasyString_(row.GameId) === gameId; }, {
    GameId: gameId, SyncTriggerEnabled: true, UpdatedAt: teamFantasyNowIso_(), UpdatedBy: teamFantasyNormalizeUsername_(payload.username)
  });
  return {
    success: true,
    message: "5-minute Team Fantasy game-day sync is active.",
    syncMinutes: 5,
    triggerStatus: triggerStatus,
    settings: teamFantasyGetSettings_(gameId)
  };
}

function apiAdminRunTeamFantasySync(payload) {
  payload = payload || {};
  const adminUsername = typeof requireAdminFromToken_ === "function" ? requireAdminFromToken_(payload.token) : teamFantasyNormalizeUsername_(payload.username);
  const gameId = teamFantasyString_(payload.gameId);
  if (!gameId || !teamFantasyIsGame_(gameId)) throw new Error("Choose a saved Team Fantasy game first.");
  const settings = teamFantasyGetSettings_(gameId);
  const week = Math.max(1, Math.floor(teamFantasyNumber_(payload.week, settings.currentWeek)));
  try {
    const result = teamFantasyRefreshAndScoreWeek_(gameId, week);
    const errorCount = Number((result.errors || []).length);
    const message = "Week " + week + ": checked " + Number(result.scheduleGames || 0) + " NFL games; " + Number(result.picks || 0) + " lineup picks; " + Number(result.scored || 0) + " final; " + Number(result.pending || 0) + " pending; " + errorCount + " errors.";
    result.lastSyncAt = teamFantasyRecordSyncStatus_(gameId, result.success === false ? "error" : "success", message, adminUsername);
    result.message = message;
    result.triggerStatus = teamFantasySyncTriggerStatus_();
    return result;
  } catch (err) {
    const error = err && err.message ? err.message : String(err);
    const lastSyncAt = teamFantasyRecordSyncStatus_(gameId, "error", error, adminUsername);
    return { success: false, gameId: gameId, week: week, lastSyncAt: lastSyncAt, error: error, message: error, triggerStatus: teamFantasySyncTriggerStatus_() };
  }
}

function apiAdminSaveTeamFantasySettings(payload) {
  payload = payload || {};
  const adminUsername = typeof requireAdminFromToken_ === "function" ? requireAdminFromToken_(payload.token) : teamFantasyNormalizeUsername_(payload.username);
  const gameId = teamFantasyString_(payload.gameId);
  if (!gameId) throw new Error("Game is required.");
  const current = teamFantasyGetSettings_(gameId);
  const entryMode = ["single", "afc-nfc", "multiple"].indexOf(teamFantasyKey_(payload.entryMode)) !== -1 ? teamFantasyKey_(payload.entryMode) : current.entryMode;
  const values = {
    GameId: gameId,
    SeasonYear: Math.max(2000, Math.floor(teamFantasyNumber_(payload.seasonYear, current.seasonYear))),
    CurrentWeek: Math.max(1, Math.floor(teamFantasyNumber_(payload.currentWeek, current.currentWeek))),
    EntryMode: entryMode,
    MaxEntriesPerUser: entryMode === "afc-nfc" ? 2 : Math.max(1, Math.min(10, Math.floor(teamFantasyNumber_(payload.maxEntriesPerUser, entryMode === "single" ? 1 : current.maxEntriesPerUser)))),
    TeamUseLimit: Math.max(1, Math.min(18, Math.floor(teamFantasyNumber_(payload.teamUseLimit, current.teamUseLimit)))),
    CompleteLeagueEnabled: teamFantasyBool_(payload.completeLeagueEnabled, current.completeLeagueEnabled),
    StandingMode: teamFantasyKey_(payload.standingMode) === "entries" ? "entries" : "combined-user",
    SameEntryMultipleLeagues: teamFantasyBool_(payload.sameEntryMultipleLeagues, current.sameEntryMultipleLeagues),
    AllowRandomPick: teamFantasyBool_(payload.allowRandomPick, current.allowRandomPick),
    AllowSmartAutoPick: teamFantasyBool_(payload.allowSmartAutoPick, current.allowSmartAutoPick),
    RegularSeasonEndWeek: Math.max(1, Math.min(18, Math.floor(teamFantasyNumber_(payload.regularSeasonEndWeek, current.regularSeasonEndWeek)))),
    PostseasonScoringMode: teamFantasyKey_(payload.postseasonScoringMode) === "fresh-round" ? "fresh-round" : "cumulative",
    PlayoffUsageMode: teamFantasyKey_(payload.playoffUsageMode) === "carry" ? "carry" : "reset",
    OverallPlayoffTeams: Math.max(2, Math.min(32, Math.floor(teamFantasyNumber_(payload.overallPlayoffTeams, current.overallPlayoffTeams)))),
    SubleaguePlayoffDefault: Math.max(2, Math.min(32, Math.floor(teamFantasyNumber_(payload.subleaguePlayoffDefault, current.subleaguePlayoffDefault)))),
    RankingsMode: teamFantasyKey_(payload.rankingsMode) === "manual" ? "manual" : "auto",
    ReminderEnabled: teamFantasyBool_(payload.reminderEnabled, current.reminderEnabled),
    ReminderThursday: teamFantasyBool_(payload.reminderThursday, current.reminderThursday),
    ReminderSunday: teamFantasyBool_(payload.reminderSunday, current.reminderSunday),
    ReminderFinalWindow: teamFantasyBool_(payload.reminderFinalWindow, current.reminderFinalWindow),
    SyncTriggerEnabled: current.syncTriggerEnabled,
    LastSyncAt: current.lastSyncAt,
    LastSyncStatus: current.lastSyncStatus,
    LastSyncMessage: current.lastSyncMessage,
    UpdatedAt: teamFantasyNowIso_(),
    UpdatedBy: adminUsername
  };
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.SETTINGS, function(row) { return teamFantasyString_(row.GameId) === gameId; }, values);
  teamFantasyEnsureCompleteLeague_(gameId, teamFantasyNormalizeSettings_(values));
  return { success: true, settings: teamFantasyGetSettings_(gameId) };
}

function apiAdminSaveTeamFantasyRules(payload) {
  payload = payload || {};
  if (typeof requireAdminFromToken_ === "function") requireAdminFromToken_(payload.token);
  const gameId = teamFantasyString_(payload.gameId);
  const incoming = Array.isArray(payload.rules) ? payload.rules : [];
  if (!gameId || !incoming.length) throw new Error("Game and scoring rules are required.");
  incoming.forEach(function(rule, index) {
    const position = teamFantasyNormalizePosition_(rule.position);
    const statKey = teamFantasyString_(rule.statKey);
    if (!position || !statKey) return;
    const ruleId = teamFantasyString_(rule.ruleId) || "tf-rule-custom-" + Utilities.getUuid().slice(0, 10);
    teamFantasyUpsert_(TEAM_FANTASY_SHEETS.RULES, function(row) {
      return teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.RuleId) === ruleId;
    }, {
      GameId: gameId, RuleId: ruleId, Position: position, StatKey: statKey,
      Label: teamFantasyString_(rule.label) || statKey,
      RuleType: teamFantasyKey_(rule.ruleType) === "bonus" ? "bonus" : "unit",
      PointsPerUnit: teamFantasyNumber_(rule.pointsPerUnit, 0), Threshold: rule.threshold === "" ? "" : teamFantasyNumber_(rule.threshold, ""),
      BonusPoints: teamFantasyNumber_(rule.bonusPoints, 0), Active: teamFantasyBool_(rule.active, true), UpdatedAt: teamFantasyNowIso_()
    });
  });
  return { success: true, rules: teamFantasyRules_(gameId) };
}

function apiAdminCreateTeamFantasyLeague(payload) {
  payload = payload || {};
  if (typeof requireAdminFromToken_ === "function") requireAdminFromToken_(payload.token);
  const gameId = teamFantasyString_(payload.gameId);
  const name = teamFantasyString_(payload.leagueName);
  if (!gameId || !name) throw new Error("Game and league name are required.");
  const id = teamFantasyString_(payload.leagueId) || "tf-league-" + teamFantasySlug_(name) + "-" + Utilities.getUuid().slice(0, 6);
  const now = teamFantasyNowIso_();
  teamFantasyUpsert_(TEAM_FANTASY_SHEETS.LEAGUES, function(row) { return teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.LeagueId) === id; }, {
    GameId: gameId, LeagueId: id, LeagueName: name, LeagueType: id === "complete" ? "complete" : "subleague",
    StandingMode: teamFantasyKey_(payload.standingMode) === "entries" ? "entries" : "combined-user",
    PlayoffTeams: Math.max(2, Math.floor(teamFantasyNumber_(payload.playoffTeams, teamFantasyGetSettings_(gameId).subleaguePlayoffDefault))),
    Active: true, CreatedAt: now, UpdatedAt: now
  });
  return { success: true, leagueId: id };
}

function apiAdminAssignTeamFantasyLeagueMember(payload) {
  payload = payload || {};
  if (typeof requireAdminFromToken_ === "function") requireAdminFromToken_(payload.token);
  const gameId = teamFantasyString_(payload.gameId);
  const leagueId = teamFantasyString_(payload.leagueId);
  const username = teamFantasyNormalizeUsername_(payload.memberUsername || payload.targetUsername);
  if (!gameId || !leagueId || !username) throw new Error("Game, league and user are required.");
  const entries = teamFantasyEnsureEntriesForUser_(gameId, username);
  const requestedEntry = teamFantasyString_(payload.entryId);
  const targets = requestedEntry ? entries.filter(function(entry) { return entry.entryId === requestedEntry; }) : entries;
  targets.forEach(function(entry) {
    teamFantasyUpsert_(TEAM_FANTASY_SHEETS.MEMBERSHIPS, function(row) {
      return teamFantasyString_(row.GameId) === gameId && teamFantasyString_(row.LeagueId) === leagueId && teamFantasyString_(row.EntryId) === entry.entryId;
    }, { GameId: gameId, LeagueId: leagueId, EntryId: entry.entryId, Username: username, CreatedAt: teamFantasyNowIso_() });
  });
  return { success: true, assigned: targets.length, added: targets.length, entries: targets };
}

function apiAdminGetTeamFantasyDashboard(payload) {
  payload = payload || {};
  if (typeof requireAdminFromToken_ === "function") requireAdminFromToken_(payload.token);
  setupSportsTeamFantasySystem();
  const gameId = teamFantasyString_(payload.gameId);
  if (!gameId) return { success: false, error: "Choose a Team Fantasy game." };
  const settings = teamFantasyGetSettings_(gameId);
  teamFantasyEnsureCompleteLeague_(gameId, settings);
  const leagues = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.LEAGUES).filter(function(row) { return teamFantasyString_(row.GameId) === gameId && teamFantasyBool_(row.Active, true); }).map(function(row) {
    return { leagueId: teamFantasyString_(row.LeagueId), leagueName: teamFantasyString_(row.LeagueName), leagueType: teamFantasyString_(row.LeagueType), standingMode: teamFantasyString_(row.StandingMode), playoffTeams: teamFantasyNumber_(row.PlayoffTeams, 4) };
  });
  const entries = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES).filter(function(row) { return teamFantasyString_(row.GameId) === gameId && teamFantasyBool_(row.Active, true); }).map(teamFantasyPublicEntry_);
  const memberships = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.MEMBERSHIPS).filter(function(row) { return teamFantasyString_(row.GameId) === gameId; }).map(function(row) { return { leagueId: teamFantasyString_(row.LeagueId), entryId: teamFantasyString_(row.EntryId), username: teamFantasyNormalizeUsername_(row.Username) }; });
  const reminders = teamFantasyNotificationOutstandingSummary_(gameId, teamFantasyParticipantUsernames_(gameId));
  const triggerStatus = teamFantasySyncTriggerStatus_();
  return {
    success: true, version: TEAM_FANTASY_VERSION, gameId: gameId, settings: settings,
    rules: teamFantasyRules_(gameId), leagues: leagues, entries: entries, memberships: memberships,
    reminderSummary: reminders,
    systemStatus: {
      gameSaved: teamFantasyIsGame_(gameId),
      settingsSaved: !!settings.gameId,
      triggerConfigured: settings.syncTriggerEnabled === true,
      triggerActive: triggerStatus.active === true,
      triggerCount: Number(triggerStatus.count || 0),
      triggerHandler: triggerStatus.handler || "teamFantasySyncTriggerHandler",
      triggerError: triggerStatus.error || "",
      lastSyncAt: settings.lastSyncAt || "",
      lastSyncStatus: settings.lastSyncStatus || "never",
      lastSyncMessage: settings.lastSyncMessage || "",
      settingsUpdatedAt: settings.updatedAt || "",
      settingsUpdatedBy: settings.updatedBy || ""
    },
    standings: teamFantasyBuildStandings_(gameId, "complete")
  };
}

function teamFantasyPreflightIssues_(gameId) {
  const issues = [];
  try {
    const settings = teamFantasyGetSettings_(gameId);
    const rules = teamFantasyRules_(gameId).filter(function(rule) { return rule.active; });
    if (!rules.length) issues.push({ severity: "error", message: "Team Fantasy has no active scoring rules." });
    TEAM_FANTASY_POSITIONS.forEach(function(position) {
      if (!rules.some(function(rule) { return rule.position === position; })) {
        issues.push({ severity: "warning", message: "Team Fantasy " + TEAM_FANTASY_POSITION_LABELS[position] + " has no active scoring rule." });
      }
    });
    if (settings.teamUseLimit < 1) issues.push({ severity: "error", message: "Team Fantasy team-use limit must be at least 1." });
    if (settings.entryMode === "afc-nfc" && settings.maxEntriesPerUser !== 2) issues.push({ severity: "warning", message: "AFC + NFC mode will use exactly two controlled entries per user." });
  } catch (err) {
    issues.push({ severity: "error", message: "Team Fantasy setup error: " + (err && err.message ? err.message : String(err)) });
  }
  return issues;
}
