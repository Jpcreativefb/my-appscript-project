/* =====================================================
   SPORTS ADVANCED QUESTIONS ENGINE v1.2
   Lives in Awards App backend.

   Supports:
   - Players or teams from one or multiple games
   - Highest-stat comparisons (2-12 entities)
   - Single-entity Yes/No threshold questions
   - Final-game or checkpoint settlement
   - Wager (Bets) or prediction (Picks) modes

   Checkpoint safety:
   - EXACT_BOUNDARY snapshots may auto-settle.
   - POLL_SNAPSHOT rows require admin review by default.
===================================================== */

const SPORTS_ADVANCED_QUESTION_MARKET = "sports-stat-question";
const SPORTS_ADVANCED_QUESTION_VERSION = "sports-stat-question-v1.2";
const SPORTS_ADVANCED_QUESTION_SECTION = "Advanced Sports Questions";

const SPORTS_ADVANCED_QUESTION_HEADERS = [
  "SportsEntityType",
  "SportsEntityId",
  "SportsEntityName",
  "SportsEntityGameId",
  "SportsEntityEventId",
  "SportsEntityTeamId",
  "SportsQuestionKind",
  "SportsCheckpointType",
  "SportsCheckpointLabel",
  "SportsCheckpointPrecision",
  "SportsComparisonOperator",
  "SportsThreshold",
  "SportsEntityConfigJSON"
];

function sportsAdvancedQuestionString_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function sportsAdvancedQuestionKey_(value) {
  return sportsAdvancedQuestionString_(value).toLowerCase();
}

function sportsAdvancedQuestionSlug_(value) {
  return sportsAdvancedQuestionKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sportsAdvancedQuestionNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return isFinite(number) ? number : fallback;
}

function sportsAdvancedQuestionBoolean_(value, fallback) {
  if (value === true || value === false) return value;
  const key = sportsAdvancedQuestionKey_(value);
  if (["true", "yes", "1", "on"].indexOf(key) !== -1) return true;
  if (["false", "no", "0", "off"].indexOf(key) !== -1) return false;
  return fallback;
}

function sportsAdvancedQuestionHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    const key = sportsAdvancedQuestionString_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function sportsAdvancedQuestionSet_(row, col, header, value) {
  if (col[header] !== undefined) row[col[header]] = value;
}

function sportsAdvancedQuestionEnsureHeaders_(sheetName, headers) {
  if (typeof sportsWagerEnsureColumns_ === "function") {
    return sportsWagerEnsureColumns_(sheetName, headers);
  }
  if (typeof sportsPlayerPropEnsureHeaders_ === "function") {
    return sportsPlayerPropEnsureHeaders_(sheetName, headers);
  }

  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const existing = sheet.getLastRow() > 0 && sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(sportsAdvancedQuestionString_)
    : [];
  const missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });
  if (!existing.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (missing.length) {
    sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }
  return { success: true, added: existing.length ? missing : headers.slice() };
}

function setupSportsAdvancedQuestionSystem() {
  const categoriesSheet = typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories";
  const settingsSheet = typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings";

  const categoryHeaders = SPORTS_ADVANCED_QUESTION_HEADERS.concat([
    "SportsPlayerId",
    "SportsPlayerName",
    "SportsStatType",
    "SportsComparisonMode",
    "SportsQuestionMode",
    "SportsTieMode"
  ]);

  const settingHeaders = SPORTS_ADVANCED_QUESTION_HEADERS.concat([
    "SportsPlayerId",
    "SportsPlayerName",
    "SportsStatType",
    "SportsComparisonMode",
    "SportsQuestionMode",
    "SportsTieMode",
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
    "LockDateTime",
    "AutoSettle",
    "RequireAdminReview",
    "SourceConfigJSON"
  ]);

  return {
    success: true,
    version: "1.2",
    categories: sportsAdvancedQuestionEnsureHeaders_(categoriesSheet, categoryHeaders),
    categorySettings: sportsAdvancedQuestionEnsureHeaders_(settingsSheet, settingHeaders)
  };
}

function sportsAdvancedQuestionParseJSON_(value, fallback) {
  if (value && typeof value === "object") return value;
  const raw = sportsAdvancedQuestionString_(value);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    return fallback;
  }
}

function sportsAdvancedQuestionPlayerStats_(league, sport) {
  if (typeof sportsPlayerPropStatOptions_ !== "function") return [];
  return sportsPlayerPropStatOptions_(league, sport).map(function(item) {
    return { value: item[0], label: item[1], entityTypes: ["PLAYER"] };
  });
}

function sportsAdvancedQuestionTeamStats_(league, sport) {
  const leagueKey = sportsAdvancedQuestionKey_(league);
  const sportKey = sportsAdvancedQuestionKey_(sport);

  if (leagueKey === "mlb" || sportKey === "baseball") {
    return [
      ["runs", "Runs"],
      ["hits", "Hits"],
      ["home-runs", "Home Runs"],
      ["errors", "Errors"],
      ["walks", "Walks"],
      ["strikeouts", "Strikeouts"],
      ["total-bases", "Total Bases"],
      ["stolen-bases", "Stolen Bases"],
      ["left-on-base", "Left On Base"]
    ].map(function(item) {
      return { value: item[0], label: item[1], entityTypes: ["TEAM"] };
    });
  }

  if (leagueKey === "nfl" || sportKey === "football") {
    return [
      ["points", "Points"],
      ["touchdowns", "Touchdowns"],
      ["first-downs", "First Downs"],
      ["total-yards", "Total Yards"],
      ["passing-yards", "Passing Yards"],
      ["rushing-yards", "Rushing Yards"],
      ["turnovers", "Turnovers"],
      ["sacks", "Sacks"],
      ["sacks-allowed", "Sacks Allowed"],
      ["third-down-conversions", "Third-down Conversions"],
      ["fourth-down-conversions", "Fourth-down Conversions"]
    ].map(function(item) {
      return { value: item[0], label: item[1], entityTypes: ["TEAM"] };
    });
  }

  return [];
}

function sportsAdvancedQuestionStatOptions_(league, sport) {
  const player = sportsAdvancedQuestionPlayerStats_(league, sport);
  const team = sportsAdvancedQuestionTeamStats_(league, sport);
  const map = {};

  player.concat(team).forEach(function(item) {
    if (!map[item.value]) {
      map[item.value] = {
        value: item.value,
        label: item.label,
        entityTypes: []
      };
    }
    item.entityTypes.forEach(function(type) {
      if (map[item.value].entityTypes.indexOf(type) === -1) map[item.value].entityTypes.push(type);
    });
  });

  return Object.keys(map).sort().map(function(key) { return map[key]; });
}

function sportsAdvancedQuestionStatLabel_(league, sport, statType) {
  const key = sportsAdvancedQuestionSlug_(statType);
  const match = sportsAdvancedQuestionStatOptions_(league, sport).find(function(item) {
    return item.value === key;
  });
  return match ? match.label : key.replace(/-/g, " ").replace(/\b\w/g, function(char) { return char.toUpperCase(); });
}

function sportsAdvancedQuestionCheckpointOptions_(league, sport) {
  const leagueKey = sportsAdvancedQuestionKey_(league);
  const sportKey = sportsAdvancedQuestionKey_(sport);
  const options = [{ value: "FINAL", label: "Final game total", exactRequired: false }];

  if (leagueKey === "mlb" || sportKey === "baseball") {
    for (let inning = 1; inning <= 9; inning++) {
      options.push({
        value: "END_INNING_" + inning,
        label: "By the end of inning " + inning,
        exactRequired: true
      });
    }
  }

  if (leagueKey === "nfl" || sportKey === "football") {
    options.push({ value: "END_Q1", label: "By the end of the 1st quarter", exactRequired: true });
    options.push({ value: "FIRST_HALF_2MIN", label: "Before/at the first-half two-minute warning", exactRequired: true });
    options.push({ value: "END_Q2", label: "By halftime", exactRequired: true });
    options.push({ value: "END_Q3", label: "By the end of the 3rd quarter", exactRequired: true });
    options.push({ value: "END_Q4", label: "By the end of regulation", exactRequired: true });
  }

  return options;
}

function sportsAdvancedQuestionGetGame_(sportsGameId, espnEventId) {
  if (typeof sportsPlayerPropGetGame_ === "function") {
    return sportsPlayerPropGetGame_(sportsGameId, espnEventId);
  }
  throw new Error("SportsPlayerPropEngine is required for advanced sports questions.");
}

function sportsAdvancedQuestionGetPlayer_(playerId, espnPlayerId, league) {
  if (typeof sportsPlayerPropGetPlayer_ === "function") {
    return sportsPlayerPropGetPlayer_(playerId, espnPlayerId, league);
  }
  throw new Error("SportsPlayerPropEngine is required for player lookup.");
}

function sportsAdvancedQuestionResolveLeague_(game) {
  if (typeof sportsPlayerPropLeagueSport_ === "function") {
    return sportsPlayerPropLeagueSport_(game.League, game.Sport);
  }
  return {
    league: sportsAdvancedQuestionKey_(game.League),
    sport: sportsAdvancedQuestionKey_(game.Sport)
  };
}

function sportsAdvancedQuestionNormalizeTeam_(requested, game) {
  const requestedId = sportsAdvancedQuestionString_(requested.entityId || requested.teamId || requested.TeamId);
  const requestedName = sportsAdvancedQuestionString_(requested.entityName || requested.teamName || requested.Team);
  const teams = [
    {
      id: sportsAdvancedQuestionString_(game.AwayTeamId),
      name: sportsAdvancedQuestionString_(game.AwayTeam),
      logo: sportsAdvancedQuestionString_(game.AwayLogo)
    },
    {
      id: sportsAdvancedQuestionString_(game.HomeTeamId),
      name: sportsAdvancedQuestionString_(game.HomeTeam),
      logo: sportsAdvancedQuestionString_(game.HomeLogo)
    }
  ];

  const match = teams.find(function(team) {
    if (requestedId && team.id === requestedId) return true;
    if (!requestedName) return false;
    return sportsAdvancedQuestionSlug_(team.name) === sportsAdvancedQuestionSlug_(requestedName);
  });

  if (!match || (!match.id && !match.name)) {
    throw new Error("The selected team is not part of the selected sports game.");
  }

  return match;
}

function sportsAdvancedQuestionValidateStat_(entityType, league, sport, statType) {
  const key = sportsAdvancedQuestionSlug_(statType);
  const match = sportsAdvancedQuestionStatOptions_(league, sport).find(function(item) {
    return item.value === key && item.entityTypes.indexOf(entityType) !== -1;
  });
  if (!match) {
    throw new Error(
      sportsAdvancedQuestionString_(entityType) + " stat " + sportsAdvancedQuestionString_(statType) +
      " is not supported for " + sportsAdvancedQuestionString_(league).toUpperCase() + "."
    );
  }
  return key;
}

function sportsAdvancedQuestionNormalizeEntities_(payloadEntities, sharedStatType, questionMode, defaultOdds) {
  const requested = Array.isArray(payloadEntities)
    ? payloadEntities
    : sportsAdvancedQuestionParseJSON_(payloadEntities, []);

  if (!Array.isArray(requested) || !requested.length) {
    throw new Error("Select at least one player or team.");
  }
  if (requested.length > 12) throw new Error("Advanced sports questions support up to 12 entities.");

  const gameCache = {};
  const seen = {};
  let sharedLeague = "";
  let sharedSport = "";

  const entities = requested.map(function(item, index) {
    item = item || {};
    const gameKey = sportsAdvancedQuestionString_(item.sportsGameId || item.gameId) + "|" +
      sportsAdvancedQuestionString_(item.espnEventId || item.ESPNEventId);
    if (!gameCache[gameKey]) {
      gameCache[gameKey] = sportsAdvancedQuestionGetGame_(
        item.sportsGameId || item.gameId,
        item.espnEventId || item.ESPNEventId
      );
    }
    const game = gameCache[gameKey];
    const resolved = sportsAdvancedQuestionResolveLeague_(game);
    if (!sharedLeague) {
      sharedLeague = resolved.league;
      sharedSport = resolved.sport;
    }
    if (resolved.league !== sharedLeague || resolved.sport !== sharedSport) {
      throw new Error("All entities in one question must use the same league and sport.");
    }

    const entityType = sportsAdvancedQuestionString_(item.entityType || item.type || "PLAYER").toUpperCase();
    if (["PLAYER", "TEAM"].indexOf(entityType) === -1) {
      throw new Error("Entity type must be PLAYER or TEAM.");
    }

    const statType = sportsAdvancedQuestionValidateStat_(
      entityType,
      resolved.league,
      resolved.sport,
      item.statType || sharedStatType
    );

    let entityId = "";
    let entityName = "";
    let teamId = "";
    let logo = "";
    let espnPlayerId = "";

    if (entityType === "PLAYER") {
      const player = sportsAdvancedQuestionGetPlayer_(
        item.entityId || item.playerId || item.sportsPlayerId,
        item.espnPlayerId || item.ESPNPlayerId,
        resolved.league
      );
      if (typeof sportsPlayerPropTeamMatchesGame_ === "function" && !sportsPlayerPropTeamMatchesGame_(player, game)) {
        throw new Error("The selected player " + (player.FullName || player.ShortName || "") + " is not on either team in that game.");
      }
      entityId = sportsAdvancedQuestionString_(player.PlayerId);
      espnPlayerId = sportsAdvancedQuestionString_(player.ESPNPlayerId);
      entityName = sportsAdvancedQuestionString_(player.FullName || player.ShortName || player.PlayerName);
      teamId = sportsAdvancedQuestionString_(player.TeamId);
      logo = sportsAdvancedQuestionString_(player.HeadshotUrl);
    } else {
      const team = sportsAdvancedQuestionNormalizeTeam_(item, game);
      entityId = team.id || sportsAdvancedQuestionSlug_(team.name);
      entityName = team.name;
      teamId = team.id;
      logo = team.logo;
    }

    if (!entityId || !entityName) throw new Error("Entity mapping is incomplete.");
    const uniqueKey = [entityType, entityId, game.ESPNEventId, statType].join("|");
    if (seen[uniqueKey]) return null;
    seen[uniqueKey] = true;

    const odds = sportsAdvancedQuestionNumber_(item.odds, defaultOdds);
    if (questionMode === "wager" && odds <= 1) {
      throw new Error("Every wager option must have decimal odds greater than 1.00.");
    }

    return {
      entityType: entityType,
      entityId: entityId,
      entityName: entityName,
      teamId: teamId,
      espnPlayerId: espnPlayerId,
      logo: logo,
      statType: statType,
      odds: odds,
      sportsGameId: sportsAdvancedQuestionString_(game.GameId),
      espnEventId: sportsAdvancedQuestionString_(game.ESPNEventId),
      league: resolved.league,
      sport: resolved.sport,
      gameDateTime: game.GameDateTime || "",
      homeTeam: sportsAdvancedQuestionString_(game.HomeTeam),
      awayTeam: sportsAdvancedQuestionString_(game.AwayTeam)
    };
  }).filter(Boolean);

  return {
    entities: entities,
    league: sharedLeague,
    sport: sharedSport
  };
}

function sportsAdvancedQuestionRequireDestination_(gameId, questionMode) {
  if (questionMode === "wager") {
    if (typeof sportsPlayerPropRequireWagerGame_ === "function") {
      return sportsPlayerPropRequireWagerGame_(gameId);
    }
  } else if (typeof sportsPlayerMatchupRequirePredictionGame_ === "function") {
    return sportsPlayerMatchupRequirePredictionGame_(gameId);
  }
  return true;
}

function sportsAdvancedQuestionCategoryExists_(awardsGameId, categoryId) {
  if (typeof sportsPlayerPropCategoryExists_ === "function") {
    return sportsPlayerPropCategoryExists_(awardsGameId, categoryId);
  }
  return false;
}

function sportsAdvancedQuestionCategoryId_(kind, checkpointType, statType, entities, threshold, operator) {
  const entityKey = (entities || []).map(function(entity) {
    return [entity.entityType, entity.entityId, entity.espnEventId].map(sportsAdvancedQuestionSlug_).join("-");
  }).sort().join("-");
  return [
    "sports-stat",
    sportsAdvancedQuestionSlug_(kind),
    sportsAdvancedQuestionSlug_(checkpointType),
    sportsAdvancedQuestionSlug_(statType),
    sportsAdvancedQuestionSlug_(operator || ""),
    String(threshold === "" || threshold === undefined ? "" : threshold).replace(/\./g, "-").replace(/[^0-9-]+/g, ""),
    entityKey.slice(0, 110)
  ].filter(Boolean).join("-");
}

function sportsAdvancedQuestionDefaultQuestion_(config) {
  const checkpoint = config.checkpointLabel && config.checkpointType !== "FINAL"
    ? " " + config.checkpointLabel.toLowerCase()
    : "";
  const statLabel = config.statLabel.toLowerCase();

  if (config.questionKind === "threshold") {
    const entity = config.entities[0];
    const operatorText = {
      gte: "at least",
      gt: "more than",
      lte: "no more than",
      lt: "fewer than",
      eq: "exactly"
    }[config.operator] || "at least";
    return "Will " + entity.entityName + " record " + operatorText + " " + config.threshold + " " + statLabel + checkpoint + "?";
  }

  return "Who will record the most " + statLabel + checkpoint + "?";
}

function sportsAdvancedQuestionNomineeId_(entity) {
  return [
    sportsAdvancedQuestionSlug_(entity.entityType),
    sportsAdvancedQuestionSlug_(entity.entityId),
    sportsAdvancedQuestionSlug_(entity.espnEventId)
  ].join("-").slice(0, 120);
}

function sportsAdvancedQuestionLockDate_(entities) {
  const valid = (entities || []).map(function(entity) {
    const date = new Date(entity.gameDateTime || "");
    return isNaN(date.getTime()) ? null : date;
  }).filter(Boolean).sort(function(a, b) { return a.getTime() - b.getTime(); });
  return valid.length ? valid[0] : "";
}

function sportsAdvancedQuestionAppendCategoryRows_(config) {
  const sheetName = typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(sportsAdvancedQuestionString_);
  const col = sportsAdvancedQuestionHeaderMap_(headers);
  const now = new Date();

  let nominees;
  if (config.questionKind === "threshold") {
    nominees = [
      { nomineeId: "yes", nominee: "Yes", selection: "yes", entity: config.entities[0], odds: config.yesOdds },
      { nomineeId: "no", nominee: "No", selection: "no", entity: config.entities[0], odds: config.noOdds }
    ];
  } else {
    nominees = config.entities.map(function(entity) {
      return {
        nomineeId: sportsAdvancedQuestionNomineeId_(entity),
        nominee: entity.entityName,
        selection: sportsAdvancedQuestionNomineeId_(entity),
        entity: entity,
        odds: entity.odds
      };
    });
  }

  const rows = nominees.map(function(nominee) {
    const entity = nominee.entity;
    const row = new Array(headers.length).fill("");
    sportsAdvancedQuestionSet_(row, col, "GameId", config.awardsGameId);
    sportsAdvancedQuestionSet_(row, col, "Category", config.categoryName);
    sportsAdvancedQuestionSet_(row, col, "CategoryId", config.categoryId);
    sportsAdvancedQuestionSet_(row, col, "Nominee", nominee.nominee);
    sportsAdvancedQuestionSet_(row, col, "NomineeId", nominee.nomineeId);
    sportsAdvancedQuestionSet_(row, col, "ShortAnswer", nominee.nominee);
    sportsAdvancedQuestionSet_(row, col, "Section", config.league.toUpperCase() + " " + SPORTS_ADVANCED_QUESTION_SECTION);
    sportsAdvancedQuestionSet_(row, col, "Active", true);
    sportsAdvancedQuestionSet_(row, col, "PredictionGame", true);
    sportsAdvancedQuestionSet_(row, col, "CommunityRank", false);
    sportsAdvancedQuestionSet_(row, col, "QuestionType", config.questionKind === "threshold" ? "sports-stat-threshold" : "sports-stat-highest");
    sportsAdvancedQuestionSet_(row, col, "ScoringEngine", "sports");
    sportsAdvancedQuestionSet_(row, col, "SelectionMode", "single");
    sportsAdvancedQuestionSet_(row, col, "EntryType", "sports-stat-question");
    sportsAdvancedQuestionSet_(row, col, "OddsMode", config.questionMode === "wager" ? "manual" : "none");
    sportsAdvancedQuestionSet_(row, col, "ResultSource", "sports-advanced-stats");
    sportsAdvancedQuestionSet_(row, col, "SportsProvider", "ESPN");
    sportsAdvancedQuestionSet_(row, col, "SportsGameId", entity.sportsGameId);
    sportsAdvancedQuestionSet_(row, col, "ESPNEventId", entity.espnEventId);
    sportsAdvancedQuestionSet_(row, col, "SportsLeague", config.league);
    sportsAdvancedQuestionSet_(row, col, "SportsMarket", SPORTS_ADVANCED_QUESTION_MARKET);
    sportsAdvancedQuestionSet_(row, col, "SportsSelection", nominee.selection);
    sportsAdvancedQuestionSet_(row, col, "HomeTeam", entity.homeTeam);
    sportsAdvancedQuestionSet_(row, col, "AwayTeam", entity.awayTeam);
    sportsAdvancedQuestionSet_(row, col, "LogoUrl", entity.logo);
    if (config.questionMode === "wager") {
      sportsAdvancedQuestionSet_(row, col, "BettingOdds", nominee.odds);
      sportsAdvancedQuestionSet_(row, col, "OddsSource", "manual-sports-stat-question");
      sportsAdvancedQuestionSet_(row, col, "OddsLastUpdated", now);
    }
    sportsAdvancedQuestionSet_(row, col, "SportsPlayerId", entity.entityType === "PLAYER" ? entity.entityId : "");
    sportsAdvancedQuestionSet_(row, col, "SportsPlayerName", entity.entityType === "PLAYER" ? entity.entityName : "");
    sportsAdvancedQuestionSet_(row, col, "SportsStatType", config.statType);
    sportsAdvancedQuestionSet_(row, col, "SportsComparisonMode", config.questionKind === "threshold" ? "threshold" : "highest");
    sportsAdvancedQuestionSet_(row, col, "SportsQuestionMode", config.questionMode);
    sportsAdvancedQuestionSet_(row, col, "SportsTieMode", "push");
    sportsAdvancedQuestionSet_(row, col, "SportsEntityType", entity.entityType);
    sportsAdvancedQuestionSet_(row, col, "SportsEntityId", entity.entityId);
    sportsAdvancedQuestionSet_(row, col, "SportsEntityName", entity.entityName);
    sportsAdvancedQuestionSet_(row, col, "SportsEntityGameId", entity.sportsGameId);
    sportsAdvancedQuestionSet_(row, col, "SportsEntityEventId", entity.espnEventId);
    sportsAdvancedQuestionSet_(row, col, "SportsEntityTeamId", entity.teamId);
    sportsAdvancedQuestionSet_(row, col, "SportsQuestionKind", config.questionKind);
    sportsAdvancedQuestionSet_(row, col, "SportsCheckpointType", config.checkpointType);
    sportsAdvancedQuestionSet_(row, col, "SportsCheckpointLabel", config.checkpointLabel);
    sportsAdvancedQuestionSet_(row, col, "SportsComparisonOperator", config.operator);
    sportsAdvancedQuestionSet_(row, col, "SportsThreshold", config.threshold);
    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  return { count: rows.length, nominees: nominees };
}

function sportsAdvancedQuestionAppendSettingsRow_(config, nominees) {
  const sheetName = typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(sportsAdvancedQuestionString_);
  const col = sportsAdvancedQuestionHeaderMap_(headers);
  const row = new Array(headers.length).fill("");
  const lockDate = sportsAdvancedQuestionLockDate_(config.entities);
  const sourceConfig = {
    version: "1.2",
    questionKind: config.questionKind,
    questionMode: config.questionMode,
    league: config.league,
    sport: config.sport,
    statType: config.statType,
    checkpointType: config.checkpointType,
    checkpointLabel: config.checkpointLabel,
    checkpointPolicy: config.checkpointPolicy,
    operator: config.operator,
    threshold: config.threshold,
    entities: config.entities.map(function(entity, index) {
      const matching = nominees.find(function(nominee) { return nominee.entity === entity; });
      return {
        nomineeId: matching ? matching.nomineeId : "",
        entityType: entity.entityType,
        entityId: entity.entityId,
        entityName: entity.entityName,
        teamId: entity.teamId,
        espnPlayerId: entity.espnPlayerId,
        sportsGameId: entity.sportsGameId,
        espnEventId: entity.espnEventId,
        league: entity.league,
        sport: entity.sport,
        statType: entity.statType,
        odds: entity.odds,
        index: index
      };
    })
  };

  sportsAdvancedQuestionSet_(row, col, "GameId", config.awardsGameId);
  sportsAdvancedQuestionSet_(row, col, "CategoryId", config.categoryId);
  sportsAdvancedQuestionSet_(row, col, "Points", config.points);
  sportsAdvancedQuestionSet_(row, col, "Locked", false);
  sportsAdvancedQuestionSet_(row, col, "WinnerNomineeId", "");
  sportsAdvancedQuestionSet_(row, col, "ChangePenalty", 0);
  sportsAdvancedQuestionSet_(row, col, "MaxChanges", 0);
  sportsAdvancedQuestionSet_(row, col, "LockDateTime", lockDate);
  sportsAdvancedQuestionSet_(row, col, "DisplayOrder", lockDate && lockDate.getTime ? lockDate.getTime() : 999);
  sportsAdvancedQuestionSet_(row, col, "GroupId", config.league);
  sportsAdvancedQuestionSet_(row, col, "LayoutType", config.questionMode === "wager" ? "wager" : "list");
  sportsAdvancedQuestionSet_(row, col, "ShortName", config.categoryName);
  sportsAdvancedQuestionSet_(row, col, "CountsAsStatue", false);
  sportsAdvancedQuestionSet_(row, col, "ScoreVersion", SPORTS_ADVANCED_QUESTION_VERSION);
  sportsAdvancedQuestionSet_(row, col, "QuestionType", config.questionKind === "threshold" ? "sports-stat-threshold" : "sports-stat-highest");
  sportsAdvancedQuestionSet_(row, col, "ScoringEngine", "sports");
  sportsAdvancedQuestionSet_(row, col, "SelectionMode", "single");
  sportsAdvancedQuestionSet_(row, col, "ScoreMode", config.questionMode === "wager" ? "wager" : "correct-pick");
  sportsAdvancedQuestionSet_(row, col, "OddsMode", config.questionMode === "wager" ? "manual" : "none");
  sportsAdvancedQuestionSet_(row, col, "ResultSource", "sports-advanced-stats");
  sportsAdvancedQuestionSet_(row, col, "SettlementStatus", "pending");
  sportsAdvancedQuestionSet_(row, col, "SportsGameId", config.entities[0].sportsGameId);
  sportsAdvancedQuestionSet_(row, col, "ESPNEventId", config.entities[0].espnEventId);
  sportsAdvancedQuestionSet_(row, col, "SportsMarket", SPORTS_ADVANCED_QUESTION_MARKET);
  sportsAdvancedQuestionSet_(row, col, "SportsLeague", config.league);
  sportsAdvancedQuestionSet_(row, col, "SportsStatType", config.statType);
  sportsAdvancedQuestionSet_(row, col, "SportsComparisonMode", config.questionKind === "threshold" ? "threshold" : "highest");
  sportsAdvancedQuestionSet_(row, col, "SportsQuestionMode", config.questionMode);
  sportsAdvancedQuestionSet_(row, col, "SportsTieMode", "push");
  sportsAdvancedQuestionSet_(row, col, "SportsEntityType", config.entities.length === 1 ? config.entities[0].entityType : "MULTI");
  sportsAdvancedQuestionSet_(row, col, "SportsEntityId", config.entities.length === 1 ? config.entities[0].entityId : "");
  sportsAdvancedQuestionSet_(row, col, "SportsEntityName", config.entities.length === 1 ? config.entities[0].entityName : "Multiple entities");
  sportsAdvancedQuestionSet_(row, col, "SportsEntityGameId", config.entities.length === 1 ? config.entities[0].sportsGameId : "MULTI");
  sportsAdvancedQuestionSet_(row, col, "SportsEntityEventId", config.entities.length === 1 ? config.entities[0].espnEventId : "MULTI");
  sportsAdvancedQuestionSet_(row, col, "SportsEntityTeamId", config.entities.length === 1 ? config.entities[0].teamId : "");
  sportsAdvancedQuestionSet_(row, col, "SportsQuestionKind", config.questionKind);
  sportsAdvancedQuestionSet_(row, col, "SportsCheckpointType", config.checkpointType);
  sportsAdvancedQuestionSet_(row, col, "SportsCheckpointLabel", config.checkpointLabel);
  sportsAdvancedQuestionSet_(row, col, "SportsCheckpointPrecision", config.checkpointType === "FINAL" ? "FINAL" : "EXACT_BOUNDARY_REQUIRED");
  sportsAdvancedQuestionSet_(row, col, "SportsComparisonOperator", config.operator);
  sportsAdvancedQuestionSet_(row, col, "SportsThreshold", config.threshold);
  sportsAdvancedQuestionSet_(row, col, "SportsEntityConfigJSON", JSON.stringify(sourceConfig));
  sportsAdvancedQuestionSet_(row, col, "SourceConfigJSON", JSON.stringify(sourceConfig));
  sportsAdvancedQuestionSet_(row, col, "AutoSettle", true);
  sportsAdvancedQuestionSet_(row, col, "RequireAdminReview", config.checkpointType === "FINAL" ? false : true);

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  return { rowNumber: sheet.getLastRow(), sourceConfig: sourceConfig };
}

function createSportsAdvancedQuestion(payload) {
  payload = payload || {};
  setupSportsAdvancedQuestionSystem();

  const awardsGameId = sportsAdvancedQuestionString_(payload.awardsGameId || payload.gameId);
  if (!awardsGameId) throw new Error("awardsGameId is required.");
  if (typeof validateGameId === "function") validateGameId(awardsGameId);

  const questionMode = sportsAdvancedQuestionKey_(payload.questionMode || payload.mode) === "prediction"
    ? "prediction"
    : "wager";
  sportsAdvancedQuestionRequireDestination_(awardsGameId, questionMode);

  const questionKind = sportsAdvancedQuestionKey_(payload.questionKind || payload.kind) === "threshold"
    ? "threshold"
    : "highest";
  const defaultOdds = Math.max(1.01, sportsAdvancedQuestionNumber_(payload.defaultOdds, 1.91));
  const normalized = sportsAdvancedQuestionNormalizeEntities_(
    payload.entities || payload.entitiesJSON,
    payload.sportsStatType || payload.statType,
    questionMode,
    defaultOdds
  );

  const entities = normalized.entities;
  if (questionKind === "threshold" && entities.length !== 1) {
    throw new Error("A Yes/No threshold question requires exactly one player or team.");
  }
  if (questionKind === "highest" && entities.length < 2) {
    throw new Error("A comparison question requires at least two players or teams.");
  }

  const statType = sportsAdvancedQuestionSlug_(payload.sportsStatType || payload.statType || entities[0].statType);
  entities.forEach(function(entity) {
    if (entity.statType !== statType) throw new Error("All entities must use the same statistic.");
  });

  const checkpointType = sportsAdvancedQuestionString_(payload.checkpointType || "FINAL").toUpperCase();
  const checkpoint = sportsAdvancedQuestionCheckpointOptions_(normalized.league, normalized.sport).find(function(item) {
    return item.value === checkpointType;
  });
  if (!checkpoint) throw new Error("Unsupported checkpoint for this league: " + checkpointType);

  const operator = questionKind === "threshold"
    ? sportsAdvancedQuestionKey_(payload.operator || payload.comparisonOperator || "gte")
    : "highest";
  if (questionKind === "threshold" && ["gte", "gt", "lte", "lt", "eq"].indexOf(operator) === -1) {
    throw new Error("Threshold operator must be gte, gt, lte, lt, or eq.");
  }
  const threshold = questionKind === "threshold"
    ? sportsAdvancedQuestionNumber_(payload.threshold, null)
    : "";
  if (questionKind === "threshold" && threshold === null) throw new Error("A numeric threshold is required.");

  const config = {
    awardsGameId: awardsGameId,
    questionMode: questionMode,
    questionKind: questionKind,
    points: Math.max(1, sportsAdvancedQuestionNumber_(payload.points, 1)),
    defaultOdds: defaultOdds,
    yesOdds: Math.max(1.01, sportsAdvancedQuestionNumber_(payload.yesOdds, defaultOdds)),
    noOdds: Math.max(1.01, sportsAdvancedQuestionNumber_(payload.noOdds, defaultOdds)),
    entities: entities,
    league: normalized.league,
    sport: normalized.sport,
    statType: statType,
    statLabel: sportsAdvancedQuestionStatLabel_(normalized.league, normalized.sport, statType),
    checkpointType: checkpointType,
    checkpointLabel: checkpoint.label,
    checkpointPolicy: checkpointType === "FINAL" ? "final" : "review-if-imprecise",
    operator: operator,
    threshold: threshold
  };

  config.categoryId = sportsAdvancedQuestionKey_(payload.categoryId) || sportsAdvancedQuestionCategoryId_(
    questionKind,
    checkpointType,
    statType,
    entities,
    threshold,
    operator
  );
  config.categoryName = sportsAdvancedQuestionString_(payload.categoryName) || sportsAdvancedQuestionDefaultQuestion_(config);

  if (sportsAdvancedQuestionCategoryExists_(awardsGameId, config.categoryId)) {
    return {
      success: false,
      duplicate: true,
      awardsGameId: awardsGameId,
      categoryId: config.categoryId,
      message: "This advanced sports question already exists in the selected Awards Game."
    };
  }

  const categoryWrite = sportsAdvancedQuestionAppendCategoryRows_(config);
  const settingWrite = sportsAdvancedQuestionAppendSettingsRow_(config, categoryWrite.nominees);
  SpreadsheetApp.flush();
  if (typeof clearAppCaches === "function") clearAppCaches();

  return {
    success: true,
    version: "1.2",
    market: SPORTS_ADVANCED_QUESTION_MARKET,
    questionMode: questionMode,
    questionKind: questionKind,
    awardsGameId: awardsGameId,
    categoryId: config.categoryId,
    category: config.categoryName,
    categoryRows: categoryWrite.count,
    settingRow: settingWrite.rowNumber,
    entityCount: entities.length,
    checkpointType: checkpointType,
    checkpointLabel: checkpoint.label,
    statType: statType,
    statLabel: config.statLabel,
    expectedSheet: questionMode === "wager" ? "Bets" : "Picks"
  };
}

function sportsAdvancedQuestionReadItems_(awardsGameId) {
  const sheetName = typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const col = sportsAdvancedQuestionHeaderMap_(data[0]);
  const items = [];

  for (let i = 1; i < data.length; i++) {
    const gameId = col.GameId === undefined ? "" : sportsAdvancedQuestionString_(data[i][col.GameId]);
    if (awardsGameId && gameId !== awardsGameId) continue;
    const market = col.SportsMarket === undefined ? "" : sportsAdvancedQuestionKey_(data[i][col.SportsMarket]);
    if (market !== SPORTS_ADVANCED_QUESTION_MARKET) continue;
    const configRaw = col.SportsEntityConfigJSON !== undefined
      ? data[i][col.SportsEntityConfigJSON]
      : col.SourceConfigJSON !== undefined
        ? data[i][col.SourceConfigJSON]
        : "";
    const config = sportsAdvancedQuestionParseJSON_(configRaw, null);
    if (!config || !Array.isArray(config.entities)) {
      items.push({
        rowNumber: i + 1,
        awardsGameId: gameId,
        categoryId: col.CategoryId === undefined ? "" : sportsAdvancedQuestionKey_(data[i][col.CategoryId]),
        mappingError: "missing-sports-entity-config"
      });
      continue;
    }
    items.push({
      rowNumber: i + 1,
      awardsGameId: gameId,
      categoryId: col.CategoryId === undefined ? "" : sportsAdvancedQuestionKey_(data[i][col.CategoryId]),
      settlementStatus: col.SettlementStatus === undefined ? "" : sportsAdvancedQuestionKey_(data[i][col.SettlementStatus]),
      questionMode: sportsAdvancedQuestionKey_(config.questionMode || (col.ScoreMode !== undefined && sportsAdvancedQuestionKey_(data[i][col.ScoreMode]) === "wager" ? "wager" : "prediction")),
      questionKind: sportsAdvancedQuestionKey_(config.questionKind || "highest"),
      league: sportsAdvancedQuestionKey_(config.league),
      sport: sportsAdvancedQuestionKey_(config.sport),
      statType: sportsAdvancedQuestionSlug_(config.statType),
      checkpointType: sportsAdvancedQuestionString_(config.checkpointType || "FINAL").toUpperCase(),
      checkpointPolicy: sportsAdvancedQuestionKey_(config.checkpointPolicy || "review-if-imprecise"),
      operator: sportsAdvancedQuestionKey_(config.operator || "gte"),
      threshold: sportsAdvancedQuestionNumber_(config.threshold, null),
      entities: config.entities
    });
  }
  return items;
}

function sportsAdvancedQuestionRefreshSources_(items) {
  const seen = {};
  const results = [];
  const errors = [];
  (items || []).forEach(function(item) {
    (item.entities || []).forEach(function(entity) {
      const key = sportsAdvancedQuestionString_(entity.sportsGameId) + "|" + sportsAdvancedQuestionString_(entity.espnEventId);
      if (!key || seen[key]) return;
      seen[key] = true;
      try {
        if (typeof sportsAdminBridgeCall_ === "function") {
          results.push(sportsAdminBridgeCall_("refreshSportsAdvancedStatsAdmin", {
            gameId: entity.sportsGameId,
            espnEventId: entity.espnEventId
          }));
        }
      } catch (error) {
        errors.push({
          gameId: entity.sportsGameId,
          espnEventId: entity.espnEventId,
          error: error && error.message ? error.message : String(error)
        });
      }
    });
  });
  return { success: errors.length === 0, results: results, errors: errors };
}

function sportsAdvancedQuestionFetchEntityStat_(item, entity) {
  const checkpoint = item.checkpointType !== "FINAL";
  let result;

  if (checkpoint) {
    result = sportsPlayerPropFetch_({
      action: "getSportsStatCheckpoints",
      gameId: entity.sportsGameId,
      espnEventId: entity.espnEventId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      checkpointType: item.checkpointType,
      statType: item.statType
    }, "Sports checkpoint stat lookup");

    const rows = Array.isArray(result.checkpoints) ? result.checkpoints : [];
    const row = rows.sort(function(a, b) {
      return new Date(b.CapturedAt || 0).getTime() - new Date(a.CapturedAt || 0).getTime();
    })[0] || null;
    if (!row) return { ready: false, pending: true, reason: "checkpoint-not-captured" };
    const value = sportsAdvancedQuestionNumber_(row.StatValue, null);
    if (value === null) return { ready: false, review: true, reason: "checkpoint-stat-not-numeric", row: row };
    const precision = sportsAdvancedQuestionString_(row.Precision).toUpperCase();
    if (precision !== "EXACT_BOUNDARY" && item.checkpointPolicy !== "allow-poll-snapshot") {
      return { ready: false, review: true, reason: "checkpoint-requires-review", precision: precision || "POLL_SNAPSHOT", value: value, row: row };
    }
    return { ready: true, value: value, precision: precision || "POLL_SNAPSHOT", row: row };
  }

  if (sportsAdvancedQuestionString_(entity.entityType).toUpperCase() === "TEAM") {
    result = sportsPlayerPropFetch_({
      action: "getSportsTeamGameStats",
      gameId: entity.sportsGameId,
      espnEventId: entity.espnEventId,
      teamId: entity.entityId,
      statType: item.statType
    }, "Sports team stat lookup");
    const teamRows = Array.isArray(result.stats) ? result.stats : [];
    const teamRow = teamRows.sort(function(a, b) {
      return new Date(b.LastUpdated || 0).getTime() - new Date(a.LastUpdated || 0).getTime();
    })[0] || null;
    if (!teamRow) return { ready: false, pending: true, reason: "team-stat-not-found" };
    if (!sportsAdvancedQuestionBoolean_(teamRow.Completed, false)) return { ready: false, pending: true, reason: "team-game-not-final", row: teamRow };
    const teamValue = sportsAdvancedQuestionNumber_(teamRow.StatValue, null);
    return teamValue === null
      ? { ready: false, review: true, reason: "team-stat-not-numeric", row: teamRow }
      : { ready: true, value: teamValue, precision: "FINAL", row: teamRow };
  }

  result = sportsPlayerPropFetch_({
    action: "getSportsPlayerGameStats",
    gameId: entity.sportsGameId,
    espnEventId: entity.espnEventId,
    playerId: entity.entityId,
    statType: item.statType
  }, "Sports player stat lookup");
  const playerRows = Array.isArray(result.stats) ? result.stats : [];
  const playerRow = playerRows.sort(function(a, b) {
    return new Date(b.LastUpdated || 0).getTime() - new Date(a.LastUpdated || 0).getTime();
  })[0] || null;
  if (!playerRow) return { ready: false, pending: true, reason: "player-stat-not-found" };
  if (!sportsAdvancedQuestionBoolean_(playerRow.Completed, false)) return { ready: false, pending: true, reason: "player-game-not-final", row: playerRow };
  const playerValue = sportsAdvancedQuestionNumber_(playerRow.StatValue, null);
  return playerValue === null
    ? { ready: false, review: true, reason: "player-stat-not-numeric", row: playerRow }
    : { ready: true, value: playerValue, precision: "FINAL", row: playerRow };
}

function sportsAdvancedQuestionThresholdPasses_(value, operator, threshold) {
  if (operator === "gt") return value > threshold;
  if (operator === "lte") return value <= threshold;
  if (operator === "lt") return value < threshold;
  if (operator === "eq") return value === threshold;
  return value >= threshold;
}

function sportsAdvancedQuestionResolve_(item, values) {
  if (item.questionKind === "threshold") {
    if (!values.length) return { resolved: false };
    const passed = sportsAdvancedQuestionThresholdPasses_(values[0].value, item.operator, item.threshold);
    return {
      resolved: true,
      tied: false,
      winnerNomineeId: passed ? "yes" : "no",
      wagerResultType: "win",
      winningValue: values[0].value,
      leaders: [values[0]]
    };
  }

  if (values.length < 2) return { resolved: false };
  let max = -Infinity;
  values.forEach(function(entry) { max = Math.max(max, Number(entry.value)); });
  const leaders = values.filter(function(entry) { return Number(entry.value) === max; });
  if (leaders.length !== 1) {
    return {
      resolved: true,
      tied: true,
      winnerNomineeId: "push",
      wagerResultType: "push",
      winningValue: max,
      leaders: leaders
    };
  }
  return {
    resolved: true,
    tied: false,
    winnerNomineeId: leaders[0].nomineeId,
    wagerResultType: "win",
    winningValue: max,
    leaders: leaders
  };
}

function sportsAdvancedQuestionSetReview_(item, reason, details) {
  const sheetName = typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || !item.rowNumber) return false;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(sportsAdvancedQuestionString_);
  const col = sportsAdvancedQuestionHeaderMap_(headers);
  if (col.SettlementStatus !== undefined) sheet.getRange(item.rowNumber, col.SettlementStatus + 1).setValue("review");
  if (col.RequireAdminReview !== undefined) sheet.getRange(item.rowNumber, col.RequireAdminReview + 1).setValue(true);
  if (col.Locked !== undefined) sheet.getRange(item.rowNumber, col.Locked + 1).setValue(true);
  if (col.Notes !== undefined) sheet.getRange(item.rowNumber, col.Notes + 1).setValue(reason + (details ? ": " + details : ""));
  return true;
}

function settleSportsAdvancedQuestions(payload) {
  payload = payload || {};
  setupSportsAdvancedQuestionSystem();
  const awardsGameId = sportsAdvancedQuestionString_(payload.awardsGameId || payload.gameId);
  const force = sportsAdvancedQuestionBoolean_(payload.force, false);
  const items = sportsAdvancedQuestionReadItems_(awardsGameId);
  const refresh = payload.refreshStats === false ? null : sportsAdvancedQuestionRefreshSources_(items);
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
    errors: [],
    results: []
  };

  items.forEach(function(item) {
    summary.checked++;
    if (item.mappingError) {
      summary.review++;
      summary.errors.push({ categoryId: item.categoryId, reason: item.mappingError });
      return;
    }
    if (item.settlementStatus === "settled" && !force) {
      summary.skipped++;
      return;
    }

    const values = [];
    let pending = false;
    let review = null;

    (item.entities || []).forEach(function(entity) {
      if (pending || review) return;
      try {
        const source = sportsAdvancedQuestionFetchEntityStat_(item, entity);
        if (source.pending) {
          pending = true;
          return;
        }
        if (source.review) {
          review = { entity: entity, source: source };
          return;
        }
        const nomineeId = entity.nomineeId || sportsAdvancedQuestionNomineeId_(entity);
        values.push({
          nomineeId: nomineeId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          entityName: entity.entityName,
          value: source.value,
          precision: source.precision,
          sourceRow: source.row
        });
      } catch (error) {
        review = {
          entity: entity,
          source: { reason: "source-fetch-error", error: error && error.message ? error.message : String(error) }
        };
      }
    });

    if (review) {
      summary.review++;
      const detail = review.source.error || review.source.reason || "review-required";
      sportsAdvancedQuestionSetReview_(item, review.source.reason || "review-required", detail);
      summary.results.push({ categoryId: item.categoryId, status: "review", reason: detail });
      return;
    }
    if (pending || values.length !== item.entities.length) {
      summary.pending++;
      summary.results.push({ categoryId: item.categoryId, status: "pending" });
      return;
    }

    const resolution = sportsAdvancedQuestionResolve_(item, values);
    if (!resolution.resolved) {
      summary.review++;
      sportsAdvancedQuestionSetReview_(item, "resolution-failed", "Could not resolve entity values");
      return;
    }

    try {
      const updated = typeof sportsWagerSetCategorySettingWinnerAllMatches_ === "function"
        ? sportsWagerSetCategorySettingWinnerAllMatches_(
            item.awardsGameId,
            item.categoryId,
            resolution.winnerNomineeId,
            resolution.wagerResultType,
            "settled"
          )
        : 0;
      const detail = values.map(function(entry) {
        return entry.entityName + ": " + entry.value + " (" + entry.precision + ")";
      }).join(" | ");
      const synthetic = {
        GameId: item.entities.length === 1 ? item.entities[0].sportsGameId : "MULTI",
        ESPNEventId: item.entities.length === 1 ? item.entities[0].espnEventId : "MULTI",
        Sport: item.sport,
        League: item.league,
        Status: item.checkpointType === "FINAL" ? "Final" : item.checkpointType,
        State: "post",
        HomeTeam: resolution.tied ? "Tie" : (resolution.leaders[0].entityName || "Winner"),
        AwayTeam: sportsAdvancedQuestionStatLabel_(item.league, item.sport, item.statType),
        HomeScore: resolution.winningValue,
        AwayScore: "",
        Winner: resolution.winnerNomineeId,
        Completed: true,
        LastUpdated: new Date()
      };
      const result = typeof sportsWagerUpsertCategoryResultForSettlement_ === "function"
        ? sportsWagerUpsertCategoryResultForSettlement_(
            item.awardsGameId,
            item.categoryId,
            resolution.winnerNomineeId,
            resolution.wagerResultType,
            synthetic,
            "sports-stat-question: " + detail
          )
        : null;
      if (updated > 0 || (result && result.success)) {
        summary.settled++;
        if (resolution.tied) summary.pushes++;
        summary.results.push({
          categoryId: item.categoryId,
          status: "settled",
          winnerNomineeId: resolution.winnerNomineeId,
          values: values
        });
      } else {
        summary.review++;
        sportsAdvancedQuestionSetReview_(item, "no-category-setting-row-updated", detail);
      }
    } catch (error) {
      summary.errors.push({
        categoryId: item.categoryId,
        error: error && error.message ? error.message : String(error)
      });
    }
  });

  SpreadsheetApp.flush();
  if (typeof clearAppCaches === "function") clearAppCaches();
  summary.success = summary.errors.length === 0;
  return summary;
}

function settleSportsAdvancedQuestionsForAllGames_(payload) {
  payload = payload || {};
  const items = sportsAdvancedQuestionReadItems_("");
  const gameIds = {};
  items.forEach(function(item) { if (item.awardsGameId) gameIds[item.awardsGameId] = true; });
  const sharedRefresh = payload.refreshStats === false ? null : sportsAdvancedQuestionRefreshSources_(items);
  const summary = {
    success: true,
    gameCount: Object.keys(gameIds).length,
    checked: 0,
    settled: 0,
    pushes: 0,
    pending: 0,
    review: 0,
    refresh: sharedRefresh,
    errors: [],
    results: []
  };
  Object.keys(gameIds).forEach(function(gameId) {
    try {
      const result = settleSportsAdvancedQuestions({
        gameId: gameId,
        force: payload.force,
        refreshStats: false
      });
      summary.results.push(result);
      ["checked", "settled", "pushes", "pending", "review"].forEach(function(key) {
        summary[key] += result[key] || 0;
      });
      if (result.errors && result.errors.length) summary.errors = summary.errors.concat(result.errors);
    } catch (error) {
      summary.errors.push({ gameId: gameId, error: error && error.message ? error.message : String(error) });
    }
  });
  summary.success = summary.errors.length === 0;
  return summary;
}

function apiAdminGetSportsAdvancedQuestionOptions(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  const league = sportsAdvancedQuestionKey_(payload.league);
  const sport = sportsAdvancedQuestionKey_(payload.sport);
  if (!league && !sport) throw new Error("league or sport is required.");
  return {
    success: true,
    league: league,
    sport: sport,
    statTypes: sportsAdvancedQuestionStatOptions_(league, sport),
    checkpoints: sportsAdvancedQuestionCheckpointOptions_(league, sport),
    questionKinds: [
      { value: "highest", label: "Highest total (compare 2-12 players/teams)" },
      { value: "threshold", label: "Yes/No threshold (one player/team)" }
    ],
    operators: [
      { value: "gte", label: "At least" },
      { value: "gt", label: "More than" },
      { value: "lte", label: "No more than" },
      { value: "lt", label: "Fewer than" },
      { value: "eq", label: "Exactly" }
    ]
  };
}

function apiAdminCreateSportsAdvancedQuestion(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return createSportsAdvancedQuestion(payload);
}

function apiAdminSettleSportsAdvancedQuestions(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return settleSportsAdvancedQuestions(payload);
}

function testSetupSportsAdvancedQuestionSystem() {
  return setupSportsAdvancedQuestionSystem();
}

function testSettleSportsAdvancedQuestionsNow() {
  return settleSportsAdvancedQuestionsForAllGames_({ force: true, refreshStats: true });
}
