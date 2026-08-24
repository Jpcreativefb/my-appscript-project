/* =====================================================
   KING OF THE HILL — SCORE STRIKES ENGINE v1.2.18y

   Passive Survivor/Elimination mode. Players do not submit a
   King of the Hill pick. Each finalized source-game week is
   converted into one KOTH score per user. The lowest scores
   receive strikes. Reaching the configured strike limit removes
   that user from KOTH only; the source games continue normally.

   Source games are configurable and may be combined. Team Fantasy
   sources use their native finalized weekly scores. Other games can
   be snapshotted manually as leaderboard-period deltas.
===================================================== */

var KOTH_HISTORY_SHEET = "KingOfHillHistory";
var KOTH_SNAPSHOT_SHEET = "KingOfHillSourceSnapshots";

var KOTH_HISTORY_HEADERS = [
  "GameId", "Week", "Username", "DisplayName", "WeekScore", "Rank",
  "StrikesBefore", "StrikeAwarded", "StrikeCountAfter", "Status",
  "Eliminated", "EliminatedWeek", "SourceScoresJSON", "RecipientTarget",
  "ActualRecipients", "CutoffScore", "TieApplied", "FinalStretch",
  "ProcessedAt"
];

var KOTH_SNAPSHOT_HEADERS = [
  "GameId", "Week", "SourceGameId", "Username", "CumulativeScore",
  "PeriodScore", "SourceKind", "Final", "CapturedAt"
];

function kothString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function kothKey_(value) {
  return kothString_(value).toLowerCase().replace(/_/g, "-");
}

function kothNumber_(value, fallback) {
  var number = Number(value);
  return Number.isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
}

function kothBool_(value, fallback) {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === "") return fallback === true;
  var key = kothKey_(value);
  return key === "true" || key === "yes" || key === "1" || key === "on";
}

function kothJsonParse_(value, fallback) {
  if (value && typeof value === "object") return value;
  var text = kothString_(value);
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (err) { return fallback; }
}

function kothRound_(value) {
  return Math.round(kothNumber_(value, 0) * 1000) / 1000;
}

function kothUnique_(values) {
  var seen = {};
  return (values || []).map(kothString_).filter(function(value) {
    var key = kothKey_(value);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function kothEnsureSheet_(name, headers) {
  if (typeof sportsSurvivorEnsureSheet_ === "function") {
    return sportsSurvivorEnsureSheet_(name, headers);
  }
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  var existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(kothString_);
  var missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });
  if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  return sh;
}

function kothSheetObjects_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  if (typeof sportsSurvivorSheetObjects_ === "function") return sportsSurvivorSheetObjects_(sheet);
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(kothString_);
  return data.slice(1).map(function(row, index) {
    var object = { __rowNumber: index + 2 };
    headers.forEach(function(header, col) { if (header) object[header] = row[col]; });
    return object;
  });
}

function kothReadSheetByName_(name) {
  if (typeof SpreadsheetApp === "undefined") return [];
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  return sh ? kothSheetObjects_(sh) : [];
}

function kothAppendObject_(sheet, object) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(kothString_);
  var row = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  });
  sheet.appendRow(row);
}

function survivorKingOfHillModeEnabled_(gameId) {
  if (typeof survivorGetSettings_ !== "function") return false;
  return kothKey_(survivorGetSettings_(gameId).mode) === "king-of-the-hill";
}

function kothSettings_(gameId) {
  var settings = typeof survivorGetSettings_ === "function" ? survivorGetSettings_(gameId) : {};
  var sourceIds = Array.isArray(settings.kothSourceGameIds)
    ? settings.kothSourceGameIds
    : kothJsonParse_(settings.kothSourceGameIdsJSON, []);
  settings.kothSourceGameIds = kothUnique_(sourceIds).filter(function(sourceGameId) {
    return kothKey_(sourceGameId) !== kothKey_(gameId);
  });
  settings.kothCombineMode = ["sum", "average", "highest", "lowest"].indexOf(kothKey_(settings.kothCombineMode)) >= 0 ? kothKey_(settings.kothCombineMode) : "sum";
  settings.kothEntryAggregation = ["sum", "average", "highest", "lowest"].indexOf(kothKey_(settings.kothEntryAggregation)) >= 0 ? kothKey_(settings.kothEntryAggregation) : "sum";
  settings.kothStrikeLimit = Math.max(1, Math.floor(kothNumber_(settings.kothStrikeLimit, 3)));
  settings.kothPacingMode = ["automatic", "fixed", "custom"].indexOf(kothKey_(settings.kothPacingMode)) >= 0 ? kothKey_(settings.kothPacingMode) : "automatic";
  settings.kothFixedRecipients = Math.max(1, Math.floor(kothNumber_(settings.kothFixedRecipients, 3)));
  settings.kothTieRule = ["include-all", "previous-week", "season-average"].indexOf(kothKey_(settings.kothTieRule)) >= 0 ? kothKey_(settings.kothTieRule) : "include-all";
  settings.kothMinRecipients = Math.max(1, Math.floor(kothNumber_(settings.kothMinRecipients, 1)));
  settings.kothMaxRecipients = Math.max(0, Math.floor(kothNumber_(settings.kothMaxRecipients, 0)));
  settings.kothStartMode = kothKey_(settings.kothStartMode) === "backfill" ? "backfill" : "start-fresh";
  settings.kothAutoProcess = settings.kothAutoProcess !== false;
  return settings;
}

function kothAggregateValues_(values, mode) {
  var numbers = (values || []).map(function(value) { return kothNumber_(value, NaN); }).filter(Number.isFinite);
  if (!numbers.length) return NaN;
  mode = kothKey_(mode);
  if (mode === "average") return numbers.reduce(function(sum, value) { return sum + value; }, 0) / numbers.length;
  if (mode === "highest") return Math.max.apply(null, numbers);
  if (mode === "lowest") return Math.min.apply(null, numbers);
  return numbers.reduce(function(sum, value) { return sum + value; }, 0);
}

function kothHistoryRows_(gameId) {
  var sh = kothEnsureSheet_(KOTH_HISTORY_SHEET, KOTH_HISTORY_HEADERS);
  return kothSheetObjects_(sh).filter(function(row) { return kothString_(row.GameId) === kothString_(gameId); });
}

function kothSnapshotRows_(gameId) {
  var sh = kothEnsureSheet_(KOTH_SNAPSHOT_SHEET, KOTH_SNAPSHOT_HEADERS);
  return kothSheetObjects_(sh).filter(function(row) { return kothString_(row.GameId) === kothString_(gameId); });
}

function kothLatestStateMap_(historyRows, beforeWeek) {
  var map = {};
  (historyRows || []).forEach(function(row) {
    var week = Math.floor(kothNumber_(row.Week, 0));
    if (beforeWeek && week >= beforeWeek) return;
    var username = kothString_(row.Username);
    var key = kothKey_(username);
    if (!key) return;
    var existing = map[key];
    if (!existing || week >= existing.week) {
      map[key] = {
        username: username,
        displayName: kothString_(row.DisplayName) || username,
        week: week,
        strikes: Math.max(0, Math.floor(kothNumber_(row.StrikeCountAfter, 0))),
        eliminated: kothBool_(row.Eliminated, false),
        eliminatedWeek: Math.floor(kothNumber_(row.EliminatedWeek, 0)),
        latestScore: kothNumber_(row.WeekScore, 0)
      };
    }
  });
  return map;
}

function kothPreviousWeekScore_(historyRows, username, week) {
  var key = kothKey_(username);
  var bestWeek = -1;
  var score = Number.POSITIVE_INFINITY;
  (historyRows || []).forEach(function(row) {
    var rowWeek = Math.floor(kothNumber_(row.Week, 0));
    if (kothKey_(row.Username) !== key || rowWeek >= week || rowWeek < bestWeek) return;
    bestWeek = rowWeek;
    score = kothNumber_(row.WeekScore, Number.POSITIVE_INFINITY);
  });
  return score;
}

function kothSeasonAverage_(historyRows, username, beforeWeek) {
  var key = kothKey_(username);
  var scores = (historyRows || []).filter(function(row) {
    return kothKey_(row.Username) === key && Math.floor(kothNumber_(row.Week, 0)) < beforeWeek;
  }).map(function(row) { return kothNumber_(row.WeekScore, NaN); }).filter(Number.isFinite);
  if (!scores.length) return Number.POSITIVE_INFINITY;
  return scores.reduce(function(sum, value) { return sum + value; }, 0) / scores.length;
}

function kothAutomaticRecipientCount_(players, week, endWeek, strikeLimit, minRecipients, maxRecipients) {
  players = (players || []).filter(function(player) { return player && !player.eliminated; });
  if (players.length <= 1) return 0;
  strikeLimit = Math.max(1, Math.floor(kothNumber_(strikeLimit, 3)));
  var remainingNeeds = players.map(function(player) {
    return Math.max(1, strikeLimit - Math.max(0, Math.floor(kothNumber_(player.strikes, 0))));
  });
  var totalNeeded = remainingNeeds.reduce(function(sum, value) { return sum + value; }, 0) - Math.max.apply(null, remainingNeeds);
  var weeksRemaining = Math.max(1, Math.floor(kothNumber_(endWeek, week)) - Math.floor(kothNumber_(week, 1)) + 1);
  var recipients = Math.max(1, Math.round(totalNeeded / weeksRemaining));
  recipients = Math.max(Math.max(1, Math.floor(kothNumber_(minRecipients, 1))), recipients);
  if (Math.floor(kothNumber_(maxRecipients, 0)) > 0) recipients = Math.min(recipients, Math.floor(kothNumber_(maxRecipients, 0)));
  recipients = Math.min(players.length - 1, recipients);

  // Once the field is small enough to finish with one elimination per remaining
  // week, drop to a single strike recipient when at least one player is already
  // on the brink of elimination. This creates the intended late-season funnel.
  var hasOneStrikeLeft = remainingNeeds.some(function(value) { return value <= 1; });
  if (players.length - 1 <= weeksRemaining && hasOneStrikeLeft) recipients = 1;
  return Math.max(1, recipients);
}

function kothCustomRecipientCount_(schedule, week) {
  var text = kothString_(schedule);
  if (!text) return 0;
  var direct = kothJsonParse_(text, null);
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return Math.max(0, Math.floor(kothNumber_(direct[String(week)], 0)));
  }
  var result = 0;
  text.split(/[;,]+/).forEach(function(token) {
    var match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?\s*[:=]\s*(\d+)$/);
    if (!match) return;
    var start = Number(match[1]);
    var end = match[2] ? Number(match[2]) : start;
    if (week >= start && week <= end) result = Number(match[3]);
  });
  return Math.max(0, Math.floor(result));
}

function kothRecipientCount_(players, week, settings) {
  if (settings.kothPacingMode === "fixed") return Math.min(Math.max(0, players.length - 1), settings.kothFixedRecipients);
  if (settings.kothPacingMode === "custom") {
    var custom = kothCustomRecipientCount_(settings.kothCustomSchedule, week);
    return Math.min(Math.max(0, players.length - 1), custom || settings.kothMinRecipients || 1);
  }
  return kothAutomaticRecipientCount_(players, week, settings.endWeek, settings.kothStrikeLimit, settings.kothMinRecipients, settings.kothMaxRecipients);
}

function kothSourceGame_(gameId) {
  if (typeof getGameRuntimeConfig === "function") return getGameRuntimeConfig(gameId);
  return typeof getGame === "function" ? getGame(gameId) : null;
}

function kothTeamFantasyWeekSource_(sourceGameId, week, settings) {
  var entries = kothReadSheetByName_("TeamFantasyEntries").filter(function(row) {
    return kothString_(row.GameId) === sourceGameId && kothBool_(row.Active, true);
  });
  var weekRows = kothReadSheetByName_("TeamFantasyWeekScores").filter(function(row) {
    return kothString_(row.GameId) === sourceGameId && Math.floor(kothNumber_(row.Week, 0)) === Number(week);
  });
  if (!entries.length && !weekRows.length) return { supported: false, ready: false, scores: {}, sourceKind: "" };

  var byUserEntries = {};
  entries.forEach(function(row) {
    var username = kothString_(row.Username);
    if (!username) return;
    var key = kothKey_(username);
    if (!byUserEntries[key]) byUserEntries[key] = { username: username, entryIds: [] };
    byUserEntries[key].entryIds.push(kothString_(row.EntryId));
  });
  if (!entries.length) {
    weekRows.forEach(function(row) {
      var username = kothString_(row.Username);
      if (!username) return;
      var key = kothKey_(username);
      if (!byUserEntries[key]) byUserEntries[key] = { username: username, entryIds: [] };
      var entryId = kothString_(row.EntryId);
      if (entryId && byUserEntries[key].entryIds.indexOf(entryId) === -1) byUserEntries[key].entryIds.push(entryId);
    });
  }

  var scores = {};
  var incomplete = [];
  Object.keys(byUserEntries).forEach(function(key) {
    var info = byUserEntries[key];
    var userRows = weekRows.filter(function(row) { return kothKey_(row.Username) === key; });
    var finalRows = userRows.filter(function(row) { return kothBool_(row.Final, false); });
    var expected = info.entryIds.length || userRows.length;
    if (!expected || finalRows.length < expected) {
      incomplete.push(info.username);
      return;
    }
    scores[key] = {
      username: info.username,
      score: kothRound_(kothAggregateValues_(finalRows.map(function(row) { return row.FantasyPoints; }), settings.kothEntryAggregation)),
      cumulativeScore: "",
      final: true
    };
  });

  return {
    supported: true,
    ready: Object.keys(scores).length > 0 && incomplete.length === 0,
    scores: scores,
    incomplete: incomplete,
    sourceKind: "team-fantasy"
  };
}

function kothPreviousSnapshotMap_(gameId, sourceGameId, week) {
  var rows = kothSnapshotRows_(gameId).filter(function(row) {
    return kothString_(row.SourceGameId) === sourceGameId && Math.floor(kothNumber_(row.Week, 0)) < Number(week);
  });
  var map = {};
  rows.forEach(function(row) {
    var key = kothKey_(row.Username);
    var rowWeek = Math.floor(kothNumber_(row.Week, 0));
    if (!map[key] || rowWeek > map[key].week) {
      map[key] = { week: rowWeek, cumulative: kothNumber_(row.CumulativeScore, 0) };
    }
  });
  return map;
}

function kothGenericLeaderboardSource_(kothGameId, sourceGameId, week) {
  if (typeof getLeaderboardData !== "function") return { supported: false, ready: false, scores: {}, sourceKind: "" };
  var rows = getLeaderboardData(sourceGameId) || [];
  if (!rows.length) return { supported: true, ready: false, scores: {}, sourceKind: "leaderboard-delta", manualOnly: true };
  var previous = kothPreviousSnapshotMap_(kothGameId, sourceGameId, week);
  var scores = {};
  rows.forEach(function(row) {
    var username = kothString_(row.username || row.user);
    if (!username) return;
    var key = kothKey_(username);
    var cumulative = kothNumber_(row.total, 0);
    var prior = previous[key];
    scores[key] = {
      username: username,
      displayName: kothString_(row.displayName) || username,
      score: kothRound_(prior ? cumulative - prior.cumulative : cumulative),
      cumulativeScore: cumulative,
      final: true
    };
  });
  return { supported: true, ready: Object.keys(scores).length > 0, scores: scores, sourceKind: "leaderboard-delta", manualOnly: true };
}

function kothCollectWeekScores_(gameId, week, settings, options) {
  options = options || {};
  var sources = settings.kothSourceGameIds || [];
  if (!sources.length) return { ready: false, error: "Choose at least one KOTH score source game.", scores: [] };
  var sourceResults = [];
  for (var i = 0; i < sources.length; i++) {
    var sourceGameId = sources[i];
    var sourceGame = kothSourceGame_(sourceGameId) || {};
    var type = kothKey_(sourceGame.type || sourceGame.Type);
    var result = type === "team-fantasy"
      ? kothTeamFantasyWeekSource_(sourceGameId, week, settings)
      : kothTeamFantasyWeekSource_(sourceGameId, week, settings);
    if (!result.supported) result = kothGenericLeaderboardSource_(gameId, sourceGameId, week);
    result.sourceGameId = sourceGameId;
    result.sourceGameName = kothString_(sourceGame.name || sourceGame.Name) || sourceGameId;
    if (result.manualOnly && !options.allowGeneric) {
      return { ready: false, manualRequired: true, error: result.sourceGameName + " uses leaderboard-delta scoring and must be processed with Run Now after that source week's scores are final.", sourceResults: sourceResults.concat([result]), scores: [] };
    }
    sourceResults.push(result);
  }
  var notReady = sourceResults.filter(function(result) { return !result.ready; });
  if (notReady.length) {
    return {
      ready: false,
      error: "Waiting for finalized Week " + week + " scores from: " + notReady.map(function(result) { return result.sourceGameName; }).join(", "),
      sourceResults: sourceResults,
      scores: []
    };
  }

  var commonKeys = Object.keys(sourceResults[0].scores || {});
  sourceResults.slice(1).forEach(function(result) {
    commonKeys = commonKeys.filter(function(key) { return Object.prototype.hasOwnProperty.call(result.scores || {}, key); });
  });
  if (!commonKeys.length) return { ready: false, error: "No common players were found across the selected KOTH source games for Week " + week + ".", sourceResults: sourceResults, scores: [] };

  var scores = commonKeys.map(function(key) {
    var sourceScores = {};
    var displayName = "";
    var username = "";
    var values = sourceResults.map(function(result) {
      var row = result.scores[key];
      sourceScores[result.sourceGameId] = row.score;
      username = username || row.username;
      displayName = displayName || row.displayName || row.username;
      return row.score;
    });
    return {
      username: username,
      displayName: displayName || username,
      score: kothRound_(kothAggregateValues_(values, settings.kothCombineMode)),
      sourceScores: sourceScores
    };
  });
  return { ready: true, sourceResults: sourceResults, scores: scores };
}

function kothSelectRecipients_(activePlayers, target, settings, historyRows, week) {
  target = Math.min(Math.max(0, target), Math.max(0, activePlayers.length - 1));
  if (!target) return { recipients: [], cutoffScore: "", tieApplied: false, finalStretch: false };
  var weeksRemaining = Math.max(1, settings.endWeek - week + 1);
  var finalStretch = target === 1 && activePlayers.length - 1 <= weeksRemaining;
  var tieRule = settings.kothTieRule;
  var decorated = activePlayers.map(function(player) {
    return Object.assign({}, player, {
      previousWeekScore: kothPreviousWeekScore_(historyRows, player.username, week),
      seasonAverage: kothSeasonAverage_(historyRows, player.username, week)
    });
  });
  decorated.sort(function(a, b) {
    if (a.score !== b.score) return a.score - b.score;
    if (tieRule === "previous-week" && a.previousWeekScore !== b.previousWeekScore) return a.previousWeekScore - b.previousWeekScore;
    if ((tieRule === "season-average" || finalStretch) && a.seasonAverage !== b.seasonAverage) return a.seasonAverage - b.seasonAverage;
    return kothString_(a.username).localeCompare(kothString_(b.username));
  });

  var recipients = decorated.slice(0, target);
  var cutoff = recipients.length ? recipients[recipients.length - 1].score : "";
  var tieApplied = false;
  if (tieRule === "include-all" && !finalStretch && recipients.length) {
    decorated.slice(target).forEach(function(player) {
      if (player.score === cutoff) {
        recipients.push(player);
        tieApplied = true;
      }
    });
  } else if (decorated.length > target && recipients.length && decorated[target].score === cutoff) {
    tieApplied = true;
  }

  // Final-stretch safeguard: one bad week should not eliminate multiple users
  // merely because the cutoff is tied. Keep at most one brink-of-elimination
  // recipient when pacing has intentionally narrowed to one.
  if (finalStretch) {
    var brink = recipients.filter(function(player) { return player.strikes + 1 >= settings.kothStrikeLimit; });
    if (brink.length > 1) {
      var chosenKey = kothKey_(brink[0].username);
      recipients = recipients.filter(function(player) {
        return player.strikes + 1 < settings.kothStrikeLimit || kothKey_(player.username) === chosenKey;
      });
      tieApplied = true;
    }
  }

  // Never allow a tie expansion to eliminate the entire active field.
  var wouldEliminate = recipients.filter(function(player) { return player.strikes + 1 >= settings.kothStrikeLimit; });
  if (wouldEliminate.length >= activePlayers.length) {
    var protectedPlayer = activePlayers.slice().sort(function(a, b) {
      if (a.score !== b.score) return b.score - a.score;
      var aa = kothSeasonAverage_(historyRows, a.username, week);
      var bb = kothSeasonAverage_(historyRows, b.username, week);
      if (aa !== bb) return bb - aa;
      return kothString_(a.username).localeCompare(kothString_(b.username));
    })[0];
    var protectKey = protectedPlayer ? kothKey_(protectedPlayer.username) : "";
    recipients = recipients.filter(function(player) { return kothKey_(player.username) !== protectKey; });
    tieApplied = true;
  }

  return { recipients: recipients, cutoffScore: cutoff, tieApplied: tieApplied, finalStretch: finalStretch };
}

function kothSaveSnapshots_(gameId, week, collection) {
  var sh = kothEnsureSheet_(KOTH_SNAPSHOT_SHEET, KOTH_SNAPSHOT_HEADERS);
  var now = new Date();
  (collection.sourceResults || []).forEach(function(source) {
    Object.keys(source.scores || {}).forEach(function(key) {
      var row = source.scores[key];
      kothAppendObject_(sh, {
        GameId: gameId,
        Week: week,
        SourceGameId: source.sourceGameId,
        Username: row.username,
        CumulativeScore: row.cumulativeScore === undefined ? "" : row.cumulativeScore,
        PeriodScore: row.score,
        SourceKind: source.sourceKind,
        Final: true,
        CapturedAt: now
      });
    });
  });
}

function kothProcessWeek_(gameId, week, options) {
  options = options || {};
  gameId = kothString_(gameId);
  week = Math.floor(kothNumber_(week, 0));
  if (!gameId || !week) throw new Error("GameId and KOTH week are required.");
  var settings = kothSettings_(gameId);
  if (kothKey_(settings.mode) !== "king-of-the-hill") throw new Error("This Survivor game is not in King of the Hill mode.");
  if (week < settings.startWeek || week > settings.endWeek) throw new Error("Week " + week + " is outside the configured KOTH season.");

  var historyRows = kothHistoryRows_(gameId);
  if (historyRows.some(function(row) { return Math.floor(kothNumber_(row.Week, 0)) === week; })) {
    return { success: true, duplicate: true, gameId: gameId, week: week, standings: kingOfHillLeaderboardData_(gameId) };
  }

  var collection = kothCollectWeekScores_(gameId, week, settings, { allowGeneric: options.allowGeneric === true });
  if (!collection.ready) return { success: false, pending: true, gameId: gameId, week: week, manualRequired: collection.manualRequired === true, error: collection.error || "KOTH source scores are not ready." };

  var previousState = kothLatestStateMap_(historyRows, week);
  var hasPrevious = Object.keys(previousState).length > 0;
  var scoreByKey = {};
  collection.scores.forEach(function(row) { scoreByKey[kothKey_(row.username)] = row; });

  var activePlayers = [];
  if (hasPrevious) {
    Object.keys(previousState).forEach(function(key) {
      var state = previousState[key];
      if (state.eliminated) return;
      var score = scoreByKey[key];
      if (!score) throw new Error("Week " + week + " is missing a finalized KOTH source score for active player " + state.username + ".");
      activePlayers.push({
        username: state.username,
        displayName: score.displayName || state.displayName || state.username,
        score: score.score,
        sourceScores: score.sourceScores,
        strikes: state.strikes,
        eliminated: false
      });
    });
  } else {
    activePlayers = collection.scores.map(function(score) {
      return {
        username: score.username,
        displayName: score.displayName || score.username,
        score: score.score,
        sourceScores: score.sourceScores,
        strikes: 0,
        eliminated: false
      };
    });
  }

  if (activePlayers.length <= 1) {
    return { success: true, complete: true, gameId: gameId, week: week, soleSurvivor: activePlayers.length ? activePlayers[0].username : "", standings: kingOfHillLeaderboardData_(gameId) };
  }

  var recipientTarget = kothRecipientCount_(activePlayers, week, settings);
  var selection = kothSelectRecipients_(activePlayers, recipientTarget, settings, historyRows, week);
  var recipientSet = {};
  selection.recipients.forEach(function(player) { recipientSet[kothKey_(player.username)] = true; });

  var ranked = activePlayers.slice().sort(function(a, b) {
    if (a.score !== b.score) return b.score - a.score;
    return kothString_(a.username).localeCompare(kothString_(b.username));
  });
  var rankMap = {};
  ranked.forEach(function(player, index) { rankMap[kothKey_(player.username)] = index + 1; });

  var historySheet = kothEnsureSheet_(KOTH_HISTORY_SHEET, KOTH_HISTORY_HEADERS);
  var now = new Date();
  activePlayers.forEach(function(player) {
    var key = kothKey_(player.username);
    var strike = recipientSet[key] === true;
    var strikesAfter = player.strikes + (strike ? 1 : 0);
    var eliminated = strikesAfter >= settings.kothStrikeLimit;
    kothAppendObject_(historySheet, {
      GameId: gameId,
      Week: week,
      Username: player.username,
      DisplayName: player.displayName || player.username,
      WeekScore: player.score,
      Rank: rankMap[key] || "",
      StrikesBefore: player.strikes,
      StrikeAwarded: strike,
      StrikeCountAfter: strikesAfter,
      Status: eliminated ? "ELIMINATED" : (strike ? "STRIKE" : "SAFE"),
      Eliminated: eliminated,
      EliminatedWeek: eliminated ? week : "",
      SourceScoresJSON: JSON.stringify(player.sourceScores || {}),
      RecipientTarget: recipientTarget,
      ActualRecipients: selection.recipients.length,
      CutoffScore: selection.cutoffScore,
      TieApplied: selection.tieApplied,
      FinalStretch: selection.finalStretch,
      ProcessedAt: now
    });
  });
  kothSaveSnapshots_(gameId, week, collection);

  var standings = kingOfHillLeaderboardData_(gameId);
  var alive = standings.filter(function(row) { return row.survivorAlive; });
  return {
    success: true,
    gameId: gameId,
    week: week,
    recipientTarget: recipientTarget,
    actualRecipients: selection.recipients.length,
    recipients: selection.recipients.map(function(player) { return player.username; }),
    tieApplied: selection.tieApplied,
    finalStretch: selection.finalStretch,
    complete: standings.length > 1 && alive.length === 1,
    soleSurvivor: standings.length > 1 && alive.length === 1 ? alive[0].username : "",
    standings: standings
  };
}

function kothProcessedWeeks_(historyRows) {
  var set = {};
  (historyRows || []).forEach(function(row) {
    var week = Math.floor(kothNumber_(row.Week, 0));
    if (week > 0) set[String(week)] = true;
  });
  return set;
}

function kothDetermineNextWeek_(gameId, settings, options) {
  options = options || {};
  if (options.week) return Math.floor(kothNumber_(options.week, 0));
  var historyRows = kothHistoryRows_(gameId);
  var processed = kothProcessedWeeks_(historyRows);
  var processedWeeks = Object.keys(processed).map(Number).filter(Number.isFinite);
  if (processedWeeks.length) return Math.max.apply(null, processedWeeks) + 1;
  if (settings.kothStartMode === "backfill") return settings.startWeek;

  // Start Fresh: always prefer the most recently finalized common native week.
  // This is true even when an admin starts a manual run; otherwise a midseason
  // game could incorrectly begin at Week 1 simply because generic sources are
  // allowed in manual mode. Generic/manual-only sources fall back to startWeek.
  for (var week = settings.endWeek; week >= settings.startWeek; week--) {
    var check = kothCollectWeekScores_(gameId, week, settings, { allowGeneric: false });
    if (check.ready) return week;
    if (check.manualRequired) break;
  }
  return settings.startWeek;
}

function kingOfHillRunAutomation_(gameId, options) {
  options = options || {};
  gameId = kothString_(gameId);
  var settings = kothSettings_(gameId);
  if (kothKey_(settings.mode) !== "king-of-the-hill") return { success: true, skipped: true, reason: "not-king-of-the-hill", gameId: gameId };
  if (!settings.kothSourceGameIds.length) return { success: false, gameId: gameId, error: "Choose at least one KOTH score source game." };
  if (!settings.kothAutoProcess && !options.manual) return { success: true, skipped: true, reason: "koth-auto-process-disabled", gameId: gameId };

  var maxWeeks = Math.max(1, Math.floor(kothNumber_(options.maxWeeks, options.manual ? 18 : 2)));
  var results = [];
  var requested = options.week ? Math.floor(kothNumber_(options.week, 0)) : 0;
  for (var count = 0; count < maxWeeks; count++) {
    var week = requested || kothDetermineNextWeek_(gameId, settings, { allowGeneric: options.manual === true });
    if (!week || week > settings.endWeek) break;
    var result = kothProcessWeek_(gameId, week, { allowGeneric: options.manual === true });
    results.push(result);
    if (!result.success || result.pending || result.complete || requested || settings.kothStartMode !== "backfill") break;
  }
  var standings = kingOfHillLeaderboardData_(gameId);
  var alive = standings.filter(function(row) { return row.survivorAlive; });
  return {
    success: results.length ? results.every(function(row) { return row.success !== false || row.pending === true; }) : true,
    gameId: gameId,
    mode: "king-of-the-hill",
    results: results,
    complete: standings.length > 1 && alive.length === 1,
    soleSurvivor: standings.length > 1 && alive.length === 1 ? alive[0].username : "",
    standings: standings
  };
}

function kingOfHillLeaderboardData_(gameId, extraUsernames) {
  var settings = kothSettings_(gameId);
  var rows = kothHistoryRows_(gameId);
  var state = kothLatestStateMap_(rows, 0);
  (extraUsernames || []).forEach(function(username) {
    var key = kothKey_(username);
    if (key && !state[key]) state[key] = { username: username, displayName: username, week: 0, strikes: 0, eliminated: false, eliminatedWeek: 0, latestScore: 0 };
  });
  var keys = Object.keys(state);
  var aliveCount = keys.filter(function(key) { return !state[key].eliminated; }).length;
  var complete = keys.length > 1 && aliveCount === 1;
  var leaderboard = keys.map(function(key) {
    var item = state[key];
    var userRows = rows.filter(function(row) { return kothKey_(row.Username) === key; });
    var scores = userRows.map(function(row) { return kothNumber_(row.WeekScore, NaN); }).filter(Number.isFinite);
    var average = scores.length ? scores.reduce(function(sum, value) { return sum + value; }, 0) / scores.length : 0;
    var profile = typeof getLeaderboardUserProfile_ === "function" ? (getLeaderboardUserProfile_(item.username, gameId) || {}) : {};
    var winner = complete && !item.eliminated;
    return {
      user: item.username,
      username: item.username,
      displayName: profile.displayName || item.displayName || item.username,
      avatar: profile.avatar || "👤",
      themeColor: profile.themeColor || profile.profileColor || "#354785",
      profileColor: profile.profileColor || profile.themeColor || "#354785",
      profileColorMode: profile.profileColorMode || "solid",
      profileColor2: profile.profileColor2 || "#354785",
      profileGradientAngle: profile.profileGradientAngle || "135",
      total: kothRound_(average),
      remaining: 0,
      max: kothRound_(average),
      statues: 0,
      survivorAlive: !item.eliminated,
      survivorWinner: winner,
      survivorComplete: complete,
      survivorRoundsSurvived: userRows.length,
      survivorEliminatedRound: item.eliminatedWeek || 0,
      survivorEliminatedReason: item.eliminated ? "strikes" : "",
      eliminated: item.eliminated,
      kothStrikes: item.strikes,
      kothStrikeLimit: settings.kothStrikeLimit,
      kothLatestScore: item.latestScore,
      kothSeasonAverage: kothRound_(average),
      scoringMode: "king-of-the-hill",
      leaderboardScoreMode: "king-of-the-hill"
    };
  });
  leaderboard.sort(function(a, b) {
    if (!!a.survivorWinner !== !!b.survivorWinner) return a.survivorWinner ? -1 : 1;
    if (!!a.survivorAlive !== !!b.survivorAlive) return a.survivorAlive ? -1 : 1;
    if (a.kothStrikes !== b.kothStrikes) return a.kothStrikes - b.kothStrikes;
    if (a.kothSeasonAverage !== b.kothSeasonAverage) return b.kothSeasonAverage - a.kothSeasonAverage;
    return kothString_(a.displayName).localeCompare(kothString_(b.displayName));
  });
  return leaderboard;
}

function apiGetKingOfHillState_(payload) {
  payload = payload || {};
  var gameId = kothString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  var username = kothString_(payload.username);
  if (!gameId || !username) throw new Error("Username and GameId are required.");
  var game = kothSourceGame_(gameId) || {};
  var settings = kothSettings_(gameId);
  if (kothKey_(settings.mode) !== "king-of-the-hill") throw new Error("This game is not configured for King of the Hill.");
  var history = kothHistoryRows_(gameId);
  var standings = kingOfHillLeaderboardData_(gameId, [username]);
  var me = standings.filter(function(row) { return kothKey_(row.username) === kothKey_(username); })[0] || {};
  var processedWeeks = Object.keys(kothProcessedWeeks_(history)).map(Number).sort(function(a, b) { return a - b; });
  var latestWeek = processedWeeks.length ? processedWeeks[processedWeeks.length - 1] : 0;
  var nextWeek = latestWeek ? latestWeek + 1 : settings.startWeek;
  var userHistory = history.filter(function(row) { return kothKey_(row.Username) === kothKey_(username); }).sort(function(a, b) { return Number(a.Week) - Number(b.Week); }).map(function(row) {
    return {
      week: Math.floor(kothNumber_(row.Week, 0)),
      score: kothNumber_(row.WeekScore, 0),
      rank: Math.floor(kothNumber_(row.Rank, 0)),
      strikeAwarded: kothBool_(row.StrikeAwarded, false),
      strikesAfter: Math.floor(kothNumber_(row.StrikeCountAfter, 0)),
      status: kothString_(row.Status),
      eliminated: kothBool_(row.Eliminated, false),
      sourceScores: kothJsonParse_(row.SourceScoresJSON, {})
    };
  });
  var latestRows = latestWeek ? history.filter(function(row) { return Number(row.Week) === latestWeek; }) : [];
  var recipientTarget = latestRows.length ? Math.floor(kothNumber_(latestRows[0].RecipientTarget, 0)) : 0;
  var actualRecipients = latestRows.length ? Math.floor(kothNumber_(latestRows[0].ActualRecipients, 0)) : 0;
  return {
    success: true,
    gameId: gameId,
    gameName: game.name || game.Name || gameId,
    mode: "king-of-the-hill",
    passiveKoth: true,
    sportsMode: false,
    alive: me.survivorAlive !== false,
    winner: me.survivorWinner === true,
    complete: me.survivorComplete === true,
    strikes: Math.floor(kothNumber_(me.kothStrikes, 0)),
    strikeLimit: settings.kothStrikeLimit,
    latestScore: kothNumber_(me.kothLatestScore, 0),
    seasonAverage: kothNumber_(me.kothSeasonAverage, 0),
    latestWeek: latestWeek,
    nextWeek: nextWeek <= settings.endWeek ? nextWeek : 0,
    startWeek: settings.startWeek,
    endWeek: settings.endWeek,
    recipientTarget: recipientTarget,
    actualRecipients: actualRecipients,
    sourceGameIds: settings.kothSourceGameIds,
    combineMode: settings.kothCombineMode,
    entryAggregation: settings.kothEntryAggregation,
    pacingMode: settings.kothPacingMode,
    tieRule: settings.kothTieRule,
    history: userHistory,
    standings: standings
  };
}

function kingOfHillUserScoring_(username, gameId) {
  var state = apiGetKingOfHillState_({ username: username, gameId: gameId });
  var scoring = {};
  (state.history || []).forEach(function(row) {
    scoring["koth-week-" + row.week] = {
      shortName: "KOTH Week " + row.week,
      nomineeId: "",
      winnerNomineeId: "",
      earnedPoints: 0,
      remainingPoints: 0,
      finalPointsAvailable: 0,
      locked: true,
      resolved: true,
      correct: !row.strikeAwarded,
      wrong: row.strikeAwarded,
      push: false,
      status: row.status,
      scoringMode: "king-of-the-hill",
      confidenceScoringMode: ""
    };
  });
  return scoring;
}
