/* =========================================================
   RC24A KOTH FINALIZATION READ MODEL
   Additive only: baseline KingOfHillEngine remains authoritative
   for source scoring, strike recipients, tie policy, elimination,
   and champion completion.
   ========================================================= */

function kothRc24aProfileImageUrl_(profile) {
  profile = profile || {};
  var candidates = [
    profile.profileImageUrl, profile.profileImage, profile.avatarUrl,
    profile.photoUrl, profile.imageUrl, profile.image, profile.pictureUrl,
    profile.avatar
  ];
  for (var i = 0; i < candidates.length; i++) {
    var value = kothString_(candidates[i]);
    if (/^(https?:\/\/|data:image\/|blob:)/i.test(value)) return value;
  }
  return "";
}

function kothRc24aProfile_(username, gameId) {
  var profile = typeof getLeaderboardUserProfile_ === "function"
    ? (getLeaderboardUserProfile_(username, gameId) || {})
    : {};
  var displayName = kothString_(profile.displayName || profile.realName || username) || username;
  var initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(function(part) {
    return part.charAt(0).toUpperCase();
  }).join("") || "P";
  return {
    displayName: displayName,
    profileImageUrl: kothRc24aProfileImageUrl_(profile),
    fallbackInitials: initials,
    themeColor: kothString_(profile.themeColor || profile.profileColor || "#2b7cff") || "#2b7cff"
  };
}

function kothRc24aLeagueContext_(username, gameId, requestedLeagueId) {
  var accessible = typeof getAccessibleLeaguesForGame_ === "function"
    ? (getAccessibleLeaguesForGame_(username, gameId) || [])
    : [];
  var settings = typeof kothSettings_ === "function" ? kothSettings_(gameId) : {};
  var leagueAware = typeof kothLeagueCompetitionEnabled_ === "function"
    ? kothLeagueCompetitionEnabled_(gameId, settings)
    : false;
  var requested = kothString_(requestedLeagueId);
  var active = "";
  if (requested && accessible.some(function(row) {
    return kothString_(row.leagueId || row.LeagueId) === requested;
  })) active = requested;
  var activeRow = accessible.filter(function(row) {
    return kothString_(row.leagueId || row.LeagueId) === active;
  })[0] || {};
  var leagues = accessible.map(function(row) {
    return {
      leagueId: kothString_(row.leagueId || row.LeagueId),
      leagueName: kothString_(row.leagueName || row.LeagueName || row.leagueId || row.LeagueId),
      role: kothString_(row.role || row.Role || "member")
    };
  });
  if (leagueAware) {
    leagues.unshift({ leagueId: "", leagueName: "Overall", role: "overall" });
  }
  return {
    leagues: leagues,
    activeLeagueId: active,
    activeLeagueName: active ? kothString_(activeRow.leagueName || activeRow.LeagueName || active) : "Overall",
    leagueViewOnly: !!active,
    leagueCompetitionEnabled: leagueAware
  };
}

function kothRc24aLeagueMemberSet_(leagueId) {
  var set = {};
  leagueId = kothString_(leagueId);
  if (!leagueId || typeof getActiveLeagueMembers_ !== "function") return set;
  (getActiveLeagueMembers_(leagueId) || []).forEach(function(member) {
    var username = kothString_(member && member.username);
    if (username) set[kothKey_(username)] = true;
  });
  return set;
}

function kothRc24aFilterForLeague_(rows, leagueId, usernameAccessor) {
  rows = Array.isArray(rows) ? rows : [];
  leagueId = kothString_(leagueId);
  if (!leagueId) return rows.slice();
  var members = kothRc24aLeagueMemberSet_(leagueId);
  if (!Object.keys(members).length) return [];
  usernameAccessor = usernameAccessor || function(row) { return row && (row.username || row.Username); };
  return rows.filter(function(row) {
    return members[kothKey_(usernameAccessor(row))] === true;
  });
}

function kothRc24aStatusKey_(strikes, limit, eliminated, winner) {
  strikes = Math.max(0, Math.floor(kothNumber_(strikes, 0)));
  limit = Math.max(1, Math.floor(kothNumber_(limit, 3)));
  if (winner) return "champion";
  if (eliminated || strikes >= limit) return "eliminated";
  if (strikes <= 0) return "normal";
  if (strikes >= limit - 1) return "danger";
  return "warning";
}

function kothRc24aMarginDetail_(score, cutoff, strikeAwarded, tieApplied, lastSafe) {
  score = kothNumber_(score, NaN);
  cutoff = kothNumber_(cutoff, NaN);
  if (!Number.isFinite(score) || !Number.isFinite(cutoff)) {
    return { margin: null, text: "Strike line unavailable", key: "unknown" };
  }
  var margin = kothRound_(score - cutoff);
  var absolute = Math.abs(margin).toFixed(1).replace(/\.0$/, "");
  if (Math.abs(margin) < 0.0005) {
    if (strikeAwarded) return { margin: 0, text: tieApplied ? "TIED AT CUTOFF — STRIKE APPLIED" : "AT CUTOFF — STRIKE", key: "strike" };
    return { margin: 0, text: lastSafe ? "LAST SAFE SPOT" : "TIED AT CUTOFF — SAFE", key: "safe" };
  }
  if (strikeAwarded) {
    return {
      margin: margin,
      text: margin < 0 ? ("STRIKE — " + absolute + " POINTS BELOW CUTOFF") : ("STRIKE — " + absolute + " POINTS ABOVE CUTOFF BY TIE RULE"),
      key: "strike"
    };
  }
  if (lastSafe) return { margin: margin, text: "LAST SAFE SPOT", key: "safe" };
  if (margin > 0) return { margin: margin, text: "SAFE BY " + absolute + " POINTS", key: "safe" };
  return { margin: margin, text: "SAFE BY RULE — " + absolute + " POINTS BELOW CUTOFF", key: "safe" };
}

function kothRc24aWeekRows_(gameId, week, leagueId, settings) {
  var sourceRows = (typeof kothHistoryRowsForLeague_ === "function" && leagueId !== undefined)
    ? kothHistoryRowsForLeague_(gameId, leagueId)
    : kothHistoryRows_(gameId);
  var rows = sourceRows.filter(function(row) {
    return Math.floor(kothNumber_(row.Week, 0)) === Number(week);
  });
  rows.sort(function(a, b) {
    var ar = Math.floor(kothNumber_(a.Rank, 999));
    var br = Math.floor(kothNumber_(b.Rank, 999));
    if (ar !== br) return ar - br;
    return kothString_(a.Username).localeCompare(kothString_(b.Username));
  });
  var safeRows = rows.filter(function(row) { return !kothBool_(row.StrikeAwarded, false); });
  var minSafe = safeRows.length ? Math.min.apply(null, safeRows.map(function(row) { return kothNumber_(row.WeekScore, Number.POSITIVE_INFINITY); })) : Number.POSITIVE_INFINITY;
  return rows.map(function(row) {
    var username = kothString_(row.Username);
    var strikesAfter = Math.max(0, Math.floor(kothNumber_(row.StrikeCountAfter, 0)));
    var eliminated = kothBool_(row.Eliminated, false);
    var profile = kothRc24aProfile_(username, gameId);
    var score = kothNumber_(row.WeekScore, 0);
    var cutoff = kothNumber_(row.CutoffScore, NaN);
    var strikeAwarded = kothBool_(row.StrikeAwarded, false);
    var lastSafe = !strikeAwarded && Number.isFinite(minSafe) && Math.abs(score - minSafe) < 0.0005;
    var margin = kothRc24aMarginDetail_(score, cutoff, strikeAwarded, kothBool_(row.TieApplied, false), lastSafe);
    return {
      username: username,
      displayName: profile.displayName || kothString_(row.DisplayName) || username,
      profileImageUrl: profile.profileImageUrl,
      fallbackInitials: profile.fallbackInitials,
      themeColor: profile.themeColor,
      week: Number(week),
      score: score,
      rank: Math.floor(kothNumber_(row.Rank, 0)),
      strikesBefore: Math.max(0, Math.floor(kothNumber_(row.StrikesBefore, 0))),
      strikeAwarded: strikeAwarded,
      strikesAfter: strikesAfter,
      strikeLimit: settings.kothStrikeLimit,
      status: kothString_(row.Status) || (strikeAwarded ? "STRIKE" : "SAFE"),
      statusKey: kothRc24aStatusKey_(strikesAfter, settings.kothStrikeLimit, eliminated, false),
      eliminated: eliminated,
      eliminatedWeek: Math.floor(kothNumber_(row.EliminatedWeek, 0)),
      sourceScores: kothJsonParse_(row.SourceScoresJSON, {}),
      cutoffScore: Number.isFinite(cutoff) ? cutoff : null,
      tieApplied: kothBool_(row.TieApplied, false),
      finalStretch: kothBool_(row.FinalStretch, false),
      recipientTarget: Math.floor(kothNumber_(row.RecipientTarget, 0)),
      actualRecipients: Math.floor(kothNumber_(row.ActualRecipients, 0)),
      marginToCutoff: margin.margin,
      marginText: margin.text,
      marginKey: margin.key,
      final: true
    };
  });
}

function kothRc24aTeamFantasyProjectionSource_(sourceGameId, week, settings) {
  var entries = kothReadSheetByName_("TeamFantasyEntries").filter(function(row) {
    return kothString_(row.GameId) === sourceGameId && kothBool_(row.Active, true);
  });
  var weekRows = kothReadSheetByName_("TeamFantasyWeekScores").filter(function(row) {
    return kothString_(row.GameId) === sourceGameId && Math.floor(kothNumber_(row.Week, 0)) === Number(week);
  });
  if (!entries.length && !weekRows.length) return { supported: false, ready: false, scores: {}, sourceKind: "" };
  var byUser = {};
  entries.forEach(function(row) {
    var username = kothString_(row.Username); if (!username) return;
    var key = kothKey_(username);
    if (!byUser[key]) byUser[key] = { username: username, entryIds: [] };
    var id = kothString_(row.EntryId); if (id) byUser[key].entryIds.push(id);
  });
  weekRows.forEach(function(row) {
    var username = kothString_(row.Username); if (!username) return;
    var key = kothKey_(username);
    if (!byUser[key]) byUser[key] = { username: username, entryIds: [] };
    var id = kothString_(row.EntryId);
    if (id && byUser[key].entryIds.indexOf(id) === -1) byUser[key].entryIds.push(id);
  });
  var scores = {}; var incomplete = [];
  Object.keys(byUser).forEach(function(key) {
    var info = byUser[key];
    var rows = weekRows.filter(function(row) { return kothKey_(row.Username) === key; });
    var expected = info.entryIds.length || rows.length;
    if (!expected || rows.length < expected) { incomplete.push(info.username); return; }
    scores[key] = {
      username: info.username,
      score: kothRound_(kothAggregateValues_(rows.map(function(row) { return row.FantasyPoints; }), settings.kothEntryAggregation)),
      cumulativeScore: "",
      final: rows.every(function(row) { return kothBool_(row.Final, false); })
    };
  });
  return { supported: true, ready: Object.keys(scores).length > 0 && incomplete.length === 0, scores: scores, incomplete: incomplete, sourceKind: "team-fantasy-live" };
}

function kothRc24aCollectProjection_(gameId, week, settings) {
  var sources = settings.kothSourceGameIds || [];
  if (!sources.length) return { ready: false, error: "No KOTH source game configured.", scores: [], sourceResults: [] };
  var sourceResults = [];
  for (var i = 0; i < sources.length; i++) {
    var sourceGameId = sources[i];
    var sourceGame = kothSourceGame_(sourceGameId) || {};
    var type = kothKey_(sourceGame.type || sourceGame.Type);
    var result = type === "team-fantasy" ? kothRc24aTeamFantasyProjectionSource_(sourceGameId, week, settings) : { supported: false, ready: false, scores: {}, sourceKind: "" };
    if (!result.supported && typeof kothGenericLeaderboardSource_ === "function") {
      result = kothGenericLeaderboardSource_(gameId, sourceGameId, week);
      if (result && result.supported) result.sourceKind = "leaderboard-delta-projection";
    }
    result = result || { supported: false, ready: false, scores: {}, sourceKind: "" };
    result.sourceGameId = sourceGameId;
    result.sourceGameName = kothString_(sourceGame.name || sourceGame.Name) || sourceGameId;
    sourceResults.push(result);
  }
  var notReady = sourceResults.filter(function(result) { return !result.ready; });
  if (notReady.length) {
    return { ready: false, error: "Projection unavailable from: " + notReady.map(function(row) { return row.sourceGameName; }).join(", "), scores: [], sourceResults: sourceResults };
  }
  var commonKeys = Object.keys(sourceResults[0].scores || {});
  sourceResults.slice(1).forEach(function(result) {
    commonKeys = commonKeys.filter(function(key) { return Object.prototype.hasOwnProperty.call(result.scores || {}, key); });
  });
  var scores = commonKeys.map(function(key) {
    var username = ""; var displayName = ""; var sourceScores = {};
    var values = sourceResults.map(function(result) {
      var row = result.scores[key];
      username = username || row.username;
      displayName = displayName || row.displayName || row.username;
      sourceScores[result.sourceGameId] = row.score;
      return row.score;
    });
    return { username: username, displayName: displayName || username, score: kothRound_(kothAggregateValues_(values, settings.kothCombineMode)), sourceScores: sourceScores };
  });
  return { ready: scores.length > 0, scores: scores, sourceResults: sourceResults };
}

function kothRc24aProjectedWeek_(gameId, week, leagueId, settings, historyRows) {
  if (!week || week > settings.endWeek) return null;
  var collection = kothRc24aCollectProjection_(gameId, week, settings);
  if (!collection.ready) return { week: week, final: false, ready: false, error: collection.error || "Projection unavailable.", rows: [], sourceResults: collection.sourceResults || [] };
  var previous = kothLatestStateMap_(historyRows, week);
  var hasPrevious = Object.keys(previous).length > 0;
  var scoreByKey = {}; collection.scores.forEach(function(row) { scoreByKey[kothKey_(row.username)] = row; });
  var players = [];
  if (hasPrevious) {
    Object.keys(previous).forEach(function(key) {
      var state = previous[key]; if (state.eliminated) return;
      var score = scoreByKey[key]; if (!score) return;
      players.push({ username: state.username, displayName: score.displayName || state.displayName || state.username, score: score.score, sourceScores: score.sourceScores, strikes: state.strikes, eliminated: false });
    });
  } else {
    players = collection.scores.map(function(score) { return { username: score.username, displayName: score.displayName || score.username, score: score.score, sourceScores: score.sourceScores, strikes: 0, eliminated: false }; });
  }
  // RC24A final correction: when league competition is enabled, the selected
  // league is the competition field. The same source score may therefore have a
  // different rank/cutoff/strike outcome in another league.
  if (typeof kothLeagueCompetitionEnabled_ === "function" &&
      kothLeagueCompetitionEnabled_(gameId, settings) && leagueId) {
    players = kothRc24aFilterForLeague_(players, leagueId, function(row) { return row.username; });
  }
  if (players.length <= 1) return { week: week, final: false, ready: false, error: "Projection needs at least two active KOTH players.", rows: [], sourceResults: collection.sourceResults || [] };
  var plan = kothWeekPlan_(players, week, settings, historyRows);
  var recipientSet = {}; plan.selection.recipients.forEach(function(row) { recipientSet[kothKey_(row.username)] = true; });
  var ranked = players.slice().sort(function(a,b) { if (a.score !== b.score) return b.score-a.score; return kothString_(a.username).localeCompare(kothString_(b.username)); });
  var rankMap = {}; ranked.forEach(function(row,index){ rankMap[kothKey_(row.username)] = index+1; });
  var cutoff = kothNumber_(plan.selection.cutoffScore, NaN);
  var projectedRows = players.map(function(player) {
    var strike = recipientSet[kothKey_(player.username)] === true;
    var strikesAfter = kothStrikeCountAfter_(player, strike, settings, plan.terminalFinish);
    var profile = kothRc24aProfile_(player.username, gameId);
    var margin = kothRc24aMarginDetail_(player.score, cutoff, strike, plan.selection.tieApplied, false);
    return {
      username: player.username, displayName: profile.displayName || player.displayName || player.username,
      profileImageUrl: profile.profileImageUrl, fallbackInitials: profile.fallbackInitials, themeColor: profile.themeColor,
      week: week, score: player.score, rank: rankMap[kothKey_(player.username)] || 0,
      strikesBefore: player.strikes, strikeAwarded: strike, strikesAfter: strikesAfter,
      strikeLimit: settings.kothStrikeLimit, status: strike ? "PROJECTED STRIKE" : "PROJECTED SAFE",
      statusKey: kothRc24aStatusKey_(player.strikes, settings.kothStrikeLimit, false, false),
      projectedElimination: strike && strikesAfter >= settings.kothStrikeLimit,
      eliminated: false, sourceScores: player.sourceScores || {}, cutoffScore: Number.isFinite(cutoff) ? cutoff : null,
      tieApplied: plan.selection.tieApplied, marginToCutoff: margin.margin, marginText: margin.text, marginKey: margin.key,
      final: false
    };
  }).sort(function(a,b){ return a.rank-b.rank; });
  if (!(typeof kothLeagueCompetitionEnabled_ === "function" &&
        kothLeagueCompetitionEnabled_(gameId, settings))) {
    projectedRows = kothRc24aFilterForLeague_(projectedRows, leagueId, function(row) { return row.username; });
  }
  return {
    week: week, final: false, ready: true, cutoffScore: Number.isFinite(cutoff) ? cutoff : null,
    recipientTarget: plan.recipientTarget, actualRecipients: plan.selection.recipients.length,
    tieApplied: plan.selection.tieApplied, finalStretch: plan.selection.finalStretch || plan.terminalFinish,
    rows: projectedRows, sourceResults: collection.sourceResults || []
  };
}

function kothRc24aField_(gameId, standings, historyRows, settings) {
  standings = Array.isArray(standings) ? standings : [];
  return standings.map(function(row, index) {
    var username = kothString_(row.username || row.user);
    var userRows = historyRows.filter(function(history) { return kothKey_(history.Username) === kothKey_(username); }).sort(function(a,b){ return Number(a.Week)-Number(b.Week); });
    var latest = userRows.length ? userRows[userRows.length-1] : null;
    var profile = kothRc24aProfile_(username, gameId);
    var strikes = Math.max(0, Math.floor(kothNumber_(row.kothStrikes, latest ? latest.StrikeCountAfter : 0)));
    var eliminated = row.survivorAlive === false || row.eliminated === true;
    var winner = row.survivorWinner === true;
    return Object.assign({}, row, {
      rank: index + 1,
      username: username,
      displayName: profile.displayName || row.displayName || username,
      profileImageUrl: profile.profileImageUrl,
      fallbackInitials: profile.fallbackInitials,
      themeColor: profile.themeColor,
      kothStrikes: strikes,
      kothStrikeLimit: settings.kothStrikeLimit,
      statusKey: kothRc24aStatusKey_(strikes, settings.kothStrikeLimit, eliminated, winner),
      latestWeek: latest ? Math.floor(kothNumber_(latest.Week,0)) : 0,
      latestWeekRank: latest ? Math.floor(kothNumber_(latest.Rank,0)) : 0,
      latestWeekScore: latest ? kothNumber_(latest.WeekScore,0) : kothNumber_(row.kothLatestScore,0)
    });
  });
}

function kothRc24aSourceGames_(settings) {
  return (settings.kothSourceGameIds || []).map(function(sourceGameId) {
    var game = kothSourceGame_(sourceGameId) || {};
    return { gameId: sourceGameId, name: kothString_(game.name || game.Name) || sourceGameId, type: kothKey_(game.type || game.Type || "") };
  });
}

function apiGetKingOfHillStateRC24A_(payload) {
  payload = payload || {};
  var base = apiGetKingOfHillState_(payload);
  var gameId = kothString_(base.gameId || payload.gameId);
  var username = kothString_(payload.username);
  var settings = kothSettings_(gameId);
  var league = kothRc24aLeagueContext_(username, gameId, payload.leagueId || payload.activeLeagueId || "");
  var leagueAware = league.leagueCompetitionEnabled === true;
  var historyRows = leagueAware && typeof kothHistoryRowsForLeague_ === "function"
    ? kothHistoryRowsForLeague_(gameId, league.activeLeagueId)
    : kothHistoryRows_(gameId);
  var standings = leagueAware && typeof kingOfHillLeaderboardDataLeague_ === "function"
    ? kingOfHillLeaderboardDataLeague_(gameId, league.activeLeagueId, [username])
    : kothRc24aFilterForLeague_(kingOfHillLeaderboardData_(gameId, [username]), league.activeLeagueId, function(row) { return row.username || row.user; });
  var processedWeeks = Object.keys(kothProcessedWeeks_(historyRows)).map(Number).filter(Number.isFinite).sort(function(a,b){return a-b;});
  var weeklyResults = processedWeeks.map(function(week) {
    var rows = kothRc24aWeekRows_(gameId, week, league.activeLeagueId, settings);
    var sample = historyRows.filter(function(row){ return Number(row.Week)===week; })[0] || {};
    return {
      week: week, final: true, ready: true,
      leagueId: league.activeLeagueId,
      cutoffScore: sample.CutoffScore === "" || sample.CutoffScore === undefined ? null : kothNumber_(sample.CutoffScore, null),
      recipientTarget: Math.floor(kothNumber_(sample.RecipientTarget, 0)),
      actualRecipients: Math.floor(kothNumber_(sample.ActualRecipients, 0)),
      tieApplied: kothBool_(sample.TieApplied, false),
      finalStretch: kothBool_(sample.FinalStretch, false),
      rows: rows
    };
  });
  var latestWeek = processedWeeks.length ? processedWeeks[processedWeeks.length-1] : 0;
  var projectionWeek = latestWeek ? latestWeek + 1 : settings.startWeek;
  if (projectionWeek > settings.endWeek) projectionWeek = 0;
  var projection = projectionWeek
    ? kothRc24aProjectedWeek_(gameId, projectionWeek, league.activeLeagueId, settings, historyRows)
    : null;
  var field = kothRc24aField_(gameId, standings, historyRows, settings);
  var me = field.filter(function(row){ return kothKey_(row.username)===kothKey_(username); })[0] || {};
  var championRow = standings.filter(function(row){ return row.survivorWinner === true; })[0] || null;
  var selectedWeek = Math.floor(kothNumber_(payload.week, projection && projection.ready ? projection.week : latestWeek));
  var weekOptions = weeklyResults.map(function(row){ return { week: row.week, final: true, label: "Week " + row.week + " — Final" }; });
  if (projection && projection.ready) weekOptions.push({ week: projection.week, final: false, label: "Week " + projection.week + " — Projected" });

  return Object.assign({}, base, {
    passiveKoth: true,
    rc24aKothFinalized: true,
    leagueId: league.activeLeagueId,
    leagueName: league.activeLeagueName,
    leagues: league.leagues,
    leagueViewOnly: league.leagueViewOnly,
    leagueCompetitionEnabled: leagueAware,
    leagueProcessingMode: leagueAware ? "league-owned" : "game-wide",
    leagueProcessingNote: leagueAware
      ? "KOTH rank, strike line, recipients, strikes, elimination and champion are owned by the selected LeagueId. Overall is stored separately with blank LeagueId."
      : (league.activeLeagueId ? "League selector filters the visible KOTH field; KOTH league competition is not enabled for this game." : ""),
    standings: standings,
    field: field,
    currentUser: me,
    processedWeeks: processedWeeks,
    weeklyResults: weeklyResults,
    projectedWeek: projection,
    currentWeek: projection && projection.ready ? projection.week : latestWeek,
    selectedWeek: selectedWeek,
    weekOptions: weekOptions,
    sourceGames: kothRc24aSourceGames_(settings),
    sourceGameIds: settings.kothSourceGameIds,
    strikeLimit: settings.kothStrikeLimit,
    projectedStrikeLine: projection && projection.ready ? projection.cutoffScore : null,
    finalStrikeLine: weeklyResults.length ? weeklyResults[weeklyResults.length-1].cutoffScore : null,
    comparePlayers: field,
    champion: championRow ? {
      username: championRow.username || championRow.user,
      displayName: championRow.displayName || championRow.username || championRow.user
    } : null,
    championScope: leagueAware ? (league.activeLeagueId || "overall") : "game",
    appearanceContract: "shared-pattc-sports-hero",
    heroHardcoded: false
  });
}
