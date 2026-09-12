/* =========================================================
   SHARED COMPARE DATA / PRIVACY ENGINE — ED RC24M RECOVERY

   Contract:
   - Viewer is always column 1.
   - Up to 6 total compare columns (viewer + 5 rivals).
   - Rival selections are persisted by Viewer + Game + League.
   - Participant scope is game/league aware.
   - The backend is authoritative for hidden/revealed state.
   - The browser must never infer rival visibility.
   - Sports Wager is explicitly excluded. It uses its dedicated Wager
     scoreboard and never exposes rival wager data through Shared Compare.
========================================================= */

var SHARED_COMPARE_PREFS_SHEET = "CompareRivals";
var SHARED_COMPARE_PREFS_HEADERS = [
  "ViewerUsername", "GameId", "LeagueId", "RivalsJSON", "UpdatedAt"
];
var SHARED_COMPARE_MAX_COLUMNS = 6;

function sharedCompareString_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function sharedCompareKey_(value) {
  return sharedCompareString_(value).toLowerCase();
}

function sharedCompareBool_(value, fallback) {
  if (value === true || value === false) return value;
  var key = sharedCompareKey_(value);
  if (["true", "1", "yes", "on"].indexOf(key) !== -1) return true;
  if (["false", "0", "no", "off"].indexOf(key) !== -1) return false;
  return fallback === true;
}

function sharedCompareNumber_(value, fallback) {
  var n = Number(value);
  return Number.isFinite(n) ? n : (Number.isFinite(Number(fallback)) ? Number(fallback) : 0);
}

function sharedCompareJson_(value, fallback) {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(sharedCompareString_(value)); } catch (err) { return fallback; }
}

function sharedCompareUnique_(values) {
  var out = [];
  var seen = {};
  (values || []).forEach(function(value) {
    var text = sharedCompareString_(value);
    var key = sharedCompareKey_(text);
    if (!text || seen[key]) return;
    seen[key] = true;
    out.push(text);
  });
  return out;
}

function sharedCompareEnsurePrefsSheet_() {
  if (typeof SpreadsheetApp === "undefined" || !SpreadsheetApp.getActive) return null;
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHARED_COMPARE_PREFS_SHEET);
  if (!sh) sh = ss.insertSheet(SHARED_COMPARE_PREFS_SHEET);
  var lastColumn = Math.max(sh.getLastColumn(), 0);
  var headers = lastColumn > 0 ? sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(sharedCompareString_) : [];
  SHARED_COMPARE_PREFS_HEADERS.forEach(function(header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
      sh.getRange(1, headers.length).setValue(header);
    }
  });
  if (sh.getFrozenRows && sh.setFrozenRows && sh.getFrozenRows() < 1) sh.setFrozenRows(1);
  return sh;
}

function sharedComparePrefsMap_(headers) {
  var map = {};
  (headers || []).forEach(function(header, index) { map[sharedCompareKey_(header)] = index; });
  return map;
}

function sharedCompareReadRivals_(viewer, gameId, leagueId) {
  var sh = sharedCompareEnsurePrefsSheet_();
  if (!sh || sh.getLastRow() <= 1) return [];
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(sharedCompareString_);
  var col = sharedComparePrefsMap_(headers);
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  var viewerKey = sharedCompareKey_(viewer);
  var gameKey = sharedCompareKey_(gameId);
  var leagueKey = sharedCompareKey_(leagueId);
  for (var i = data.length - 1; i >= 0; i--) {
    if (sharedCompareKey_(data[i][col.viewerusername]) !== viewerKey) continue;
    if (sharedCompareKey_(data[i][col.gameid]) !== gameKey) continue;
    if (sharedCompareKey_(data[i][col.leagueid]) !== leagueKey) continue;
    var rivals = sharedCompareJson_(data[i][col.rivalsjson], []);
    return sharedCompareUnique_(Array.isArray(rivals) ? rivals : []).slice(0, SHARED_COMPARE_MAX_COLUMNS - 1);
  }
  return [];
}

function sharedCompareWriteRivals_(viewer, gameId, leagueId, rivals) {
  var sh = sharedCompareEnsurePrefsSheet_();
  if (!sh) return { success: true, persisted: false, rivals: rivals || [] };
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(sharedCompareString_);
  var col = sharedComparePrefsMap_(headers);
  var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues() : [];
  var viewerKey = sharedCompareKey_(viewer);
  var gameKey = sharedCompareKey_(gameId);
  var leagueKey = sharedCompareKey_(leagueId);
  var rowNumber = 0;
  for (var i = 0; i < data.length; i++) {
    if (sharedCompareKey_(data[i][col.viewerusername]) === viewerKey &&
        sharedCompareKey_(data[i][col.gameid]) === gameKey &&
        sharedCompareKey_(data[i][col.leagueid]) === leagueKey) {
      rowNumber = i + 2;
      break;
    }
  }
  var row = new Array(headers.length).fill("");
  row[col.viewerusername] = viewer;
  row[col.gameid] = gameId;
  row[col.leagueid] = leagueId;
  row[col.rivalsjson] = JSON.stringify(rivals || []);
  row[col.updatedat] = new Date();
  if (rowNumber) sh.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
  return { success: true, persisted: true, rivals: rivals || [] };
}

function sharedCompareGame_(gameId) {
  if (typeof getGameRuntimeConfig === "function") return getGameRuntimeConfig(gameId) || {};
  if (typeof getGame === "function") return getGame(gameId) || {};
  return {};
}

function sharedCompareMode_(gameId, game) {
  game = game || sharedCompareGame_(gameId);
  var mode = typeof getDashboardGameMode_ === "function"
    ? sharedCompareKey_(getDashboardGameMode_(game))
    : sharedCompareKey_(game.type || game.Type || "prediction");
  if (mode === "betting") mode = "wager";
  if (mode === "survivor" && typeof survivorGetSettings_ === "function") {
    try {
      var survivorSettings = survivorGetSettings_(gameId) || {};
      var survivorMode = sharedCompareKey_(survivorSettings.mode);
      if (survivorMode === "king-of-the-hill") return "king-of-the-hill";
      if (["sports-survivor", "streak-survivor", "streak-points-strikes"].indexOf(survivorMode) !== -1) return "survivor";
    } catch (err) {}
  }
  if (mode === "wager" || mode === "racing-wager") return "sports-wager";
  return mode || "prediction";
}

function sharedCompareProfile_(username, gameId) {
  var profile = {};
  try {
    if (typeof getLeaderboardUserProfile_ === "function") profile = getLeaderboardUserProfile_(username, gameId) || {};
  } catch (err) {}
  return {
    username: sharedCompareString_(username),
    displayName: sharedCompareString_(profile.displayName || username),
    avatar: profile.avatar || "👤",
    themeColor: profile.themeColor || profile.profileColor || ""
  };
}

function sharedCompareParticipantUsernames_(viewer, gameId, leagueId, mode) {
  var usernames = [viewer];
  if (leagueId && typeof getActiveLeagueMembers_ === "function") {
    try {
      usernames = usernames.concat((getActiveLeagueMembers_(leagueId) || []).map(function(member) { return member.username; }));
    } catch (err) {}
  }

  try {
    if (mode === "king-of-the-hill" && typeof kingOfHillLeaderboardData_ === "function") {
      usernames = usernames.concat((kingOfHillLeaderboardData_(gameId, [viewer]) || []).map(function(row) { return row.username || row.user; }));
    } else if (mode === "survivor" && typeof sportsSurvivorStandings_ === "function") {
      usernames = usernames.concat((sportsSurvivorStandings_(gameId, [viewer]) || []).map(function(row) { return row.username || row.user; }));
    } else if (mode === "team-fantasy" && typeof teamFantasyReadRows_ === "function" && typeof TEAM_FANTASY_SHEETS !== "undefined") {
      usernames = usernames.concat((teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES) || []).filter(function(row) {
        return sharedCompareString_(row.GameId) === gameId && sharedCompareBool_(row.Active, true);
      }).map(function(row) { return row.Username; }));
    } else if (mode === "ranking" && typeof rankingGetEntriesByUser_ === "function") {
      usernames = usernames.concat(Object.keys(rankingGetEntriesByUser_(gameId) || {}));
    } else if (mode === "voting" && typeof votingCompetitionReadBallots_ === "function") {
      usernames = usernames.concat((votingCompetitionReadBallots_(gameId) || []).map(function(row) { return row.username; }));
    }
  } catch (err) {}

  try {
    if (typeof getLeaderboardData === "function") {
      usernames = usernames.concat((getLeaderboardData(gameId) || []).map(function(row) { return row.username || row.user; }));
    }
  } catch (err) {}

  var unique = sharedCompareUnique_(usernames);
  if (leagueId && typeof isUserActiveLeagueMember_ === "function") {
    unique = unique.filter(function(username) {
      return sharedCompareKey_(username) === sharedCompareKey_(viewer) || isUserActiveLeagueMember_(username, leagueId);
    });
  }
  return unique;
}

function sharedCompareCandidates_(viewer, gameId, leagueId, mode) {
  var viewerKey = sharedCompareKey_(viewer);
  return sharedCompareParticipantUsernames_(viewer, gameId, leagueId, mode).map(function(username) {
    var profile = sharedCompareProfile_(username, gameId);
    profile.isViewer = sharedCompareKey_(username) === viewerKey;
    return profile;
  }).sort(function(a, b) {
    if (a.isViewer !== b.isViewer) return a.isViewer ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

function sharedCompareResolveSelection_(viewer, gameId, leagueId, mode, requestedRivals) {
  var candidates = sharedCompareCandidates_(viewer, gameId, leagueId, mode);
  var allowed = {};
  candidates.forEach(function(candidate) { allowed[sharedCompareKey_(candidate.username)] = candidate.username; });
  var rivals = Array.isArray(requestedRivals)
    ? requestedRivals
    : sharedCompareReadRivals_(viewer, gameId, leagueId);
  rivals = sharedCompareUnique_(rivals).filter(function(username) {
    var key = sharedCompareKey_(username);
    return key && key !== sharedCompareKey_(viewer) && !!allowed[key];
  }).slice(0, SHARED_COMPARE_MAX_COLUMNS - 1);
  return {
    candidates: candidates,
    rivals: rivals,
    usernames: [viewer].concat(rivals)
  };
}

function sharedCompareNomineeMap_(category) {
  var map = {};
  ((category && (category.nominees || category.Nominees)) || []).forEach(function(nominee) {
    var id = sharedCompareKey_(nominee && (nominee.id || nominee.nomineeId || nominee.NomineeId));
    if (!id) return;
    map[id] = {
      id: id,
      name: sharedCompareString_(nominee.name || nominee.nominee || nominee.shortAnswer || nominee.Nominee || id),
      image: nominee.image || nominee.logoUrl || nominee.FileID || "",
      details: {
        movie: nominee.movie || nominee.Movie || "",
        person: nominee.person || nominee.Person || ""
      }
    };
  });
  return map;
}

function sharedCompareCategoryVisible_(gameId, game, category, setting) {
  try {
    if (typeof isLeaderboardCompareGameLocked_ === "function" && isLeaderboardCompareGameLocked_(gameId)) return true;
    if (typeof isLeaderboardCompareCategoryLocked_ === "function" && isLeaderboardCompareCategoryLocked_(setting || {}, category || {})) return true;
  } catch (err) {}
  var status = sharedCompareKey_(setting && (setting.settlementStatus || setting.SettlementStatus));
  return status === "settled" || !!(setting && (setting.winnerNomineeId || setting.WinnerNomineeId)) ||
    sharedCompareBool_(game && (game.resultsFinalized || game.ResultsFinalized), false);
}

function sharedCompareStandardAdapter_(context) {
  var gameId = context.gameId;
  var game = context.game;
  var viewerKey = sharedCompareKey_(context.viewer);
  var categories = typeof getCategories === "function" ? (getCategories(gameId) || []) : [];
  var settings = typeof getCategorySettings === "function" ? (getCategorySettings(gameId) || {}) : {};
  var byUser = {};
  context.usernames.forEach(function(username) {
    var key = sharedCompareKey_(username);
    var rows = [];
    try {
      rows = typeof getUserBreakdown === "function"
        ? (getUserBreakdown(username, gameId, {
            viewerUsername: context.viewer,
            hideUnlockedSelections: key !== viewerKey && !(typeof isAdmin === "function" && isAdmin(context.viewer))
          }) || [])
        : [];
    } catch (err) {}
    var map = {};
    rows.forEach(function(row) { map[sharedCompareKey_(row.category || row.categoryId)] = row; });
    byUser[key] = map;
  });

  var rows = categories.map(function(category) {
    var categoryId = sharedCompareKey_(category.id || category.categoryId || category.CategoryId);
    if (!categoryId) return null;
    var setting = settings[categoryId] || settings[sharedCompareString_(category.id)] || {};
    var nomineeMap = sharedCompareNomineeMap_(category);
    var visibleToRivals = sharedCompareCategoryVisible_(gameId, game, category, setting);
    return {
      rowId: categoryId,
      rowType: "question",
      label: sharedCompareString_(category.category || category.name || category.title || category.shortName || categoryId),
      group: sharedCompareString_(category.section || category.Section || ""),
      expandable: true,
      details: { points: sharedCompareNumber_(setting.points || category.points, 0) },
      cells: context.usernames.map(function(username) {
        var key = sharedCompareKey_(username);
        var own = key === viewerKey;
        var breakdown = (byUser[key] || {})[categoryId] || null;
        var hidden = !own && !visibleToRivals;
        if (breakdown && breakdown.status === "hidden") hidden = true;
        var pickId = hidden ? "" : sharedCompareKey_(breakdown && breakdown.pick);
        var nominee = nomineeMap[pickId] || null;
        return {
          username: username,
          hidden: hidden,
          value: hidden ? null : {
            nomineeId: pickId,
            label: nominee ? nominee.name : (pickId || ""),
            image: nominee ? nominee.image : "",
            status: breakdown ? breakdown.status : "",
            points: breakdown ? sharedCompareNumber_(breakdown.adjustedPoints, 0) : 0
          }
        };
      })
    };
  }).filter(Boolean);

  return { adapter: "standard-picks", rows: rows };
}

function sharedCompareConfidenceAdapter_(context) {
  var state = typeof apiGetConfidenceCompare_ === "function"
    ? apiGetConfidenceCompare_({ username: context.viewer, gameId: context.gameId, leagueId: context.leagueId })
    : { players: [], categoryIds: [] };
  var players = {};
  (state.players || []).forEach(function(player) { players[sharedCompareKey_(player.username)] = player; });
  var categories = typeof getCategories === "function" ? (getCategories(context.gameId) || []) : [];
  var categoryMap = {};
  categories.forEach(function(category) { categoryMap[sharedCompareKey_(category.id || category.categoryId)] = category; });
  var rows = (state.categoryIds || []).map(function(categoryId) {
    var id = sharedCompareKey_(categoryId);
    var category = categoryMap[id] || {};
    var nomineeMap = sharedCompareNomineeMap_(category);
    return {
      rowId: id,
      rowType: "matchup",
      label: sharedCompareString_(category.category || category.name || category.shortName || id),
      group: sharedCompareString_(category.section || ""),
      expandable: true,
      cells: context.usernames.map(function(username) {
        var player = players[sharedCompareKey_(username)] || {};
        var pick = (player.picks || {})[id] || { hidden: sharedCompareKey_(username) !== sharedCompareKey_(context.viewer) };
        if (pick.hidden === true) return { username: username, hidden: true, value: null };
        var nomineeId = sharedCompareKey_(pick.nomineeId);
        var nominee = nomineeMap[nomineeId] || null;
        var confidence = sharedCompareNumber_(pick.confidencePoints, 0);
        return {
          username: username,
          hidden: false,
          value: {
            nomineeId: nomineeId,
            label: nominee ? nominee.name : (nomineeId || ""),
            image: nominee ? nominee.image : "",
            confidenceAssigned: confidence > 0,
            confidencePoints: confidence > 0 ? confidence : null,
            basePickOnly: !!nomineeId && confidence <= 0,
            basePickMessage: !!nomineeId && confidence <= 0 ? "Base Pick · 1 pt if correct" : "",
            status: pick.status || "pending"
          }
        };
      })
    };
  });
  return { adapter: "confidence", rows: rows };
}

function sharedCompareSurvivorAdapter_(context) {
  var settings = typeof survivorGetSettings_ === "function" ? survivorGetSettings_(context.gameId) : {};
  var categories = typeof survivorGameCategories_ === "function" ? survivorGameCategories_(context.gameId) : [];
  var optionMeta = typeof sportsSurvivorOptionMetaForGame_ === "function" ? sportsSurvivorOptionMetaForGame_(context.gameId) : {};
  var resultMap = typeof sportsSurvivorResultsForGame_ === "function" ? sportsSurvivorResultsForGame_(context.gameId) : {};
  var pickMetaMap = typeof sportsSurvivorPickMetaMap_ === "function" ? sportsSurvivorPickMetaMap_(context.gameId) : {};
  var leagueContext = { leagueId: context.leagueId || "" };
  var compare = typeof sportsSurvivorRc24aCompare_ === "function"
    ? sportsSurvivorRc24aCompare_(context.viewer, context.gameId, leagueContext, categories, settings, optionMeta, resultMap, pickMetaMap)
    : [];
  var byUser = {};
  compare.forEach(function(player) { byUser[sharedCompareKey_(player.username)] = player; });
  var weeks = {};
  compare.forEach(function(player) { (player.weeks || []).forEach(function(week) { weeks[String(week.week)] = true; }); });
  var orderedWeeks = Object.keys(weeks).map(Number).sort(function(a, b) { return a - b; });
  var rows = orderedWeeks.map(function(week) {
    return {
      rowId: "week-" + week,
      rowType: "week",
      label: "Week " + week,
      expandable: true,
      cells: context.usernames.map(function(username) {
        var player = byUser[sharedCompareKey_(username)] || {};
        var item = (player.weeks || []).find(function(row) { return Number(row.week) === week; }) || null;
        if (item && item.hidden === true) return { username: username, hidden: true, value: null };
        return {
          username: username,
          hidden: false,
          value: item ? {
            teamId: item.teamId || "",
            label: item.team || "",
            logoUrl: item.logoUrl || "",
            opponent: item.opponent || "",
            result: item.result || "pending",
            status: item.result || "pending",
            finalScore: item.finalScore || "",
            points: item.weeklyPoints,
            streak: item.streak,
            lossesUsed: item.lossesUsed,
            livesRemaining: item.livesRemaining
          } : null
        };
      })
    };
  });
  return { adapter: "survivor", rows: rows };
}

function sharedCompareRankingAdapter_(context) {
  var game = context.game;
  var categories = typeof rankingGameCategories_ === "function" ? rankingGameCategories_(context.gameId) : [];
  var finalRanks = typeof rankingFinalRanksForGame_ === "function" ? rankingFinalRanksForGame_(context.gameId) : {};
  var ballots = {};
  context.usernames.forEach(function(username) {
    ballots[sharedCompareKey_(username)] = typeof rankingGetUserEntries_ === "function" ? (rankingGetUserEntries_(username, context.gameId) || {}) : {};
  });
  var rows = [];
  categories.forEach(function(category) {
    var categoryId = sharedCompareKey_(category.id);
    var locked = typeof rankingCategoryLocked_ === "function" ? rankingCategoryLocked_(game, category) : false;
    var resolved = Object.keys(finalRanks[categoryId] || {}).length > 0;
    (category.nominees || []).forEach(function(nominee) {
      var nomineeId = sharedCompareKey_(nominee.id);
      rows.push({
        rowId: categoryId + "|" + nomineeId,
        rowType: "rank-item",
        label: sharedCompareString_(nominee.name || nominee.shortAnswer || nomineeId),
        group: sharedCompareString_(category.name || category.category || categoryId),
        expandable: true,
        cells: context.usernames.map(function(username) {
          var own = sharedCompareKey_(username) === sharedCompareKey_(context.viewer);
          var hidden = !own && !(locked || resolved);
          if (hidden) return { username: username, hidden: true, value: null };
          var ballot = (ballots[sharedCompareKey_(username)] || {})[categoryId] || [];
          var ranked = ballot.find(function(item) { return sharedCompareKey_(item.nomineeId) === nomineeId; });
          return { username: username, hidden: false, value: { rank: ranked ? sharedCompareNumber_(ranked.rank, 0) : null } };
        })
      });
    });
  });
  return { adapter: "ranking", rows: rows };
}

function sharedCompareVotingAdapter_(context) {
  var settings = typeof votingCompetitionGetSettings_ === "function" ? votingCompetitionGetSettings_(context.gameId) : {};
  var participants = typeof votingCompetitionReadParticipants_ === "function" ? votingCompetitionReadParticipants_(context.gameId) : [];
  var ballots = typeof votingCompetitionReadBallots_ === "function" ? votingCompetitionReadBallots_(context.gameId) : [];
  var published = participants.filter(function(entry) { return entry.status === "approved" && entry.published === true; });
  var game = context.game || {};
  var rivalsVisible = settings.votingLocked === true || game.votingLocked === true || game.lockAllPicks === true || game.resultsFinalized === true;
  var byUser = {};
  ballots.forEach(function(ballot) {
    var userKey = sharedCompareKey_(ballot.username);
    if (!byUser[userKey]) byUser[userKey] = {};
    byUser[userKey][sharedCompareString_(ballot.entryId)] = ballot;
  });
  var rows = published.map(function(entry) {
    return {
      rowId: sharedCompareString_(entry.entryId),
      rowType: "rank-item",
      label: sharedCompareString_(entry.entryName || entry.displayNumber || entry.entryId),
      group: "Voting",
      expandable: true,
      details: { displayNumber: entry.displayNumber || "", displayColor: entry.displayColor || "", imageUrl: entry.imageUrl || "" },
      cells: context.usernames.map(function(username) {
        var own = sharedCompareKey_(username) === sharedCompareKey_(context.viewer);
        if (!own && !rivalsVisible) return { username: username, hidden: true, value: null };
        var ballot = (byUser[sharedCompareKey_(username)] || {})[sharedCompareString_(entry.entryId)] || null;
        return { username: username, hidden: false, value: ballot ? { rank: sharedCompareNumber_(ballot.rank, 0), points: sharedCompareNumber_(ballot.points, 0) } : null };
      })
    };
  });
  return { adapter: "voting", rows: rows };
}

function sharedCompareTeamFantasyAdapter_(context) {
  if (typeof apiGetTeamFantasyGameDayState !== "function") return { adapter: "team-fantasy", rows: [], columns: [] };
  var state = apiGetTeamFantasyGameDayState({ username: context.viewer, gameId: context.gameId, leagueId: context.leagueId });
  var selected = {};
  context.usernames.forEach(function(username) { selected[sharedCompareKey_(username)] = true; });
  var competitors = (state.competitors || []).filter(function(competitor) { return !!selected[sharedCompareKey_(competitor.username)]; });
  competitors.sort(function(a, b) {
    var aViewer = sharedCompareKey_(a.username) === sharedCompareKey_(context.viewer);
    var bViewer = sharedCompareKey_(b.username) === sharedCompareKey_(context.viewer);
    if (aViewer !== bViewer) return aViewer ? -1 : 1;
    return sharedCompareString_(a.label).localeCompare(sharedCompareString_(b.label));
  });
  competitors = competitors.slice(0, SHARED_COMPARE_MAX_COLUMNS);
  var columns = competitors.map(function(competitor) {
    return {
      username: competitor.username,
      entryId: competitor.entryId,
      displayName: competitor.label || competitor.username,
      isViewer: sharedCompareKey_(competitor.username) === sharedCompareKey_(context.viewer)
    };
  });
  var positions = typeof teamFantasyGameDayPositions_ === "function" ? teamFantasyGameDayPositions_() : ["QB","RB","WRTE","OL","K","DL","LB","DB"];
  var rows = positions.map(function(position) {
    return {
      rowId: position,
      rowType: "position",
      label: typeof teamFantasyGameDayPositionLabel_ === "function" ? teamFantasyGameDayPositionLabel_(position) : position,
      expandable: true,
      cells: competitors.map(function(competitor) {
        var slot = (competitor.slots || []).find(function(item) { return sharedCompareKey_(item.position) === sharedCompareKey_(position); }) || null;
        if (slot && slot.hidden === true) return { username: competitor.username, entryId: competitor.entryId, hidden: true, value: null };
        return {
          username: competitor.username,
          entryId: competitor.entryId,
          hidden: false,
          value: slot ? {
            teamAbbr: slot.teamAbbr || "",
            label: slot.teamName || slot.teamAbbr || "",
            logoUrl: slot.logoUrl || "",
            status: slot.status || "upcoming",
            points: sharedCompareNumber_(slot.fantasyPoints, 0),
            rank: slot.rank || null,
            pickMethod: slot.pickMethod || ""
          } : null
        };
      })
    };
  });
  return { adapter: "team-fantasy", rows: rows, columns: columns, week: state.week || 0 };
}

function sharedCompareKothAdapter_(context) {
  var states = {};
  var weeks = {};
  context.usernames.forEach(function(username) {
    var state = typeof apiGetKingOfHillState_ === "function" ? apiGetKingOfHillState_({ username: username, gameId: context.gameId }) : { history: [] };
    states[sharedCompareKey_(username)] = state;
    (state.history || []).forEach(function(row) { weeks[String(row.week)] = true; });
  });
  var orderedWeeks = Object.keys(weeks).map(Number).sort(function(a, b) { return a - b; });
  var rows = orderedWeeks.map(function(week) {
    return {
      rowId: "week-" + week,
      rowType: "koth-week",
      label: "Week " + week,
      expandable: true,
      cells: context.usernames.map(function(username) {
        var state = states[sharedCompareKey_(username)] || {};
        var item = (state.history || []).find(function(row) { return Number(row.week) === week; }) || null;
        return {
          username: username,
          hidden: false,
          value: item ? {
            sourceScore: sharedCompareNumber_(item.score, 0),
            strikesAfter: sharedCompareNumber_(item.strikesAfter, 0),
            strikeAwarded: item.strikeAwarded === true,
            status: item.eliminated ? "FINAL-ELIMINATED" : (item.status || "ALIVE"),
            eliminated: item.eliminated === true,
            sourceScores: item.sourceScores || {}
          } : null
        };
      })
    };
  });
  return { adapter: "king-of-the-hill", rows: rows, passive: true };
}

function sharedCompareBuildAdapter_(context) {
  var mode = context.mode;
  if (mode === "confidence") return sharedCompareConfidenceAdapter_(context);
  if (mode === "survivor") return sharedCompareSurvivorAdapter_(context);
  if (mode === "ranking") return sharedCompareRankingAdapter_(context);
  if (mode === "voting") return sharedCompareVotingAdapter_(context);
  if (mode === "team-fantasy") return sharedCompareTeamFantasyAdapter_(context);
  if (mode === "king-of-the-hill") return sharedCompareKothAdapter_(context);
  return sharedCompareStandardAdapter_(context);
}

function apiGetSharedCompare_(payload) {
  payload = payload || {};
  var viewer = sharedCompareString_(payload.username);
  var gameId = sharedCompareString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  var requestedLeagueId = sharedCompareString_(payload.leagueId || payload.activeLeagueId || "");
  if (!viewer || !gameId) return { success: false, error: "Username and GameId are required." };

  var access = typeof userCanAccessGameFeature_ === "function"
    ? userCanAccessGameFeature_(viewer, gameId, "comparePicks", requestedLeagueId)
    : { allowed: true, leagueId: requestedLeagueId };
  if (!access.allowed) return { success: false, error: "Access denied: " + access.reason };

  var leagueId = sharedCompareString_(access.leagueId || requestedLeagueId || "");
  var game = sharedCompareGame_(gameId);
  var mode = sharedCompareMode_(gameId, game);
  if (mode === "sports-wager") {
    return {
      success: false,
      excluded: true,
      gameId: gameId,
      leagueId: leagueId,
      mode: mode,
      error: "Sports Wager uses its dedicated scoreboard and is not available in Shared Compare."
    };
  }
  var requestedRivals = Array.isArray(payload.rivalUsernames) ? payload.rivalUsernames : null;
  var selection = sharedCompareResolveSelection_(viewer, gameId, leagueId, mode, requestedRivals);
  var context = {
    viewer: viewer,
    gameId: gameId,
    leagueId: leagueId,
    game: game,
    mode: mode,
    usernames: selection.usernames
  };
  var adapted = sharedCompareBuildAdapter_(context) || {};
  var columns = adapted.columns || selection.usernames.map(function(username, index) {
    var profile = sharedCompareProfile_(username, gameId);
    profile.isViewer = index === 0;
    return profile;
  });

  return {
    success: true,
    version: "ed-rc24m-shared-compare-r1",
    gameId: gameId,
    gameName: game.name || game.Name || gameId,
    leagueId: leagueId,
    leagueName: access.leagueName || "",
    mode: mode,
    adapter: adapted.adapter || "standard-picks",
    privacyAuthority: "backend",
    maxColumns: SHARED_COMPARE_MAX_COLUMNS,
    viewerPinnedFirst: true,
    persistedRivals: selection.rivals,
    candidates: selection.candidates,
    columns: columns,
    rows: adapted.rows || [],
    rowAlignment: true,
    passive: adapted.passive === true,
    week: adapted.week || 0,
    secondaryAdapters: adapted.secondaryAdapters || []
  };
}

function apiSaveSharedCompareRivals_(payload) {
  payload = payload || {};
  var viewer = sharedCompareString_(payload.username);
  var gameId = sharedCompareString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  var requestedLeagueId = sharedCompareString_(payload.leagueId || payload.activeLeagueId || "");
  if (!viewer || !gameId) return { success: false, error: "Username and GameId are required." };
  var access = typeof userCanAccessGameFeature_ === "function"
    ? userCanAccessGameFeature_(viewer, gameId, "comparePicks", requestedLeagueId)
    : { allowed: true, leagueId: requestedLeagueId };
  if (!access.allowed) return { success: false, error: "Access denied: " + access.reason };
  var leagueId = sharedCompareString_(access.leagueId || requestedLeagueId || "");
  var game = sharedCompareGame_(gameId);
  var mode = sharedCompareMode_(gameId, game);
  if (mode === "sports-wager") {
    return {
      success: false,
      excluded: true,
      gameId: gameId,
      leagueId: leagueId,
      mode: mode,
      error: "Sports Wager uses its dedicated scoreboard and is not available in Shared Compare."
    };
  }
  var selection = sharedCompareResolveSelection_(viewer, gameId, leagueId, mode, Array.isArray(payload.rivalUsernames) ? payload.rivalUsernames : []);
  var result = sharedCompareWriteRivals_(viewer, gameId, leagueId, selection.rivals);
  return {
    success: true,
    gameId: gameId,
    leagueId: leagueId,
    maxColumns: SHARED_COMPARE_MAX_COLUMNS,
    viewerPinnedFirst: true,
    rivals: selection.rivals,
    persisted: result.persisted !== false
  };
}
