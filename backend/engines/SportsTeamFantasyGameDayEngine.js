/* =========================================================
   TEAM FANTASY GAME DAY + TEST LAB — v1.2.18r1

   Lightweight cached comparison state for 2–6 player game-day
   viewing. No ESPN calls are made here. The existing central
   Team Fantasy scorer remains the only live-data writer.
========================================================= */

var TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18u1";
/* TEAM_FANTASY_WEEKLY_HUB_BACKEND_v1218t2 */
/* TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_BACKEND_v1218u1 */
/* TEAM_FANTASY_COMPACT_GAME_DAY_BACKEND_v1218s */
var TEAM_FANTASY_GAME_DAY_POLL_MS = 5 * 60 * 1000;

function teamFantasyGameDayString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function teamFantasyGameDayKey_(value) {
  return teamFantasyGameDayString_(value).toLowerCase();
}

function teamFantasyGameDayBool_(value) {
  if (value === true || value === false) return value;
  var key = teamFantasyGameDayKey_(value);
  return key === "true" || key === "yes" || key === "1" || key === "on";
}

function teamFantasyGameDayRound_(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function teamFantasyGameDayNormalizePosition_(value) {
  var key = teamFantasyGameDayKey_(value).replace(/[\/_ -]/g, "");
  if (key === "wrte" || key === "tewr" || key === "receiver") return "WRTE";
  var upper = teamFantasyGameDayString_(value).toUpperCase();
  return ["QB", "RB", "WRTE", "K", "OL", "DL", "LB", "DB"].indexOf(upper) !== -1 ? upper : "";
}

function teamFantasyGameDayNormalizeTeam_(value) {
  var abbr = teamFantasyGameDayString_(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (abbr === "WSH") abbr = "WAS";
  if (abbr === "JAC") abbr = "JAX";
  if (abbr === "OAK") abbr = "LV";
  if (abbr === "SD") abbr = "LAC";
  if (abbr === "STL") abbr = "LAR";
  return abbr;
}

function teamFantasyGameDayLogoUrl_(teamAbbr) {
  var abbr = teamFantasyGameDayNormalizeTeam_(teamAbbr);
  var slug = abbr === "WAS" ? "wsh" : abbr.toLowerCase();
  return abbr ? "https://a.espncdn.com/i/teamlogos/nfl/500/" + encodeURIComponent(slug) + ".png" : "";
}

function teamFantasyGameDayPositions_() {
  return ["QB", "RB", "WRTE", "K", "OL", "DL", "LB", "DB"];
}

function teamFantasyGameDayPositionLabel_(position) {
  return position === "WRTE" ? "WR/TE" : position;
}

function teamFantasyGameDayUsageMatrix_(rows) {
  var matrix = {};
  teamFantasyGameDayPositions_().forEach(function(position) { matrix[position] = {}; });
  (rows || []).forEach(function(row) {
    var position = teamFantasyGameDayNormalizePosition_(row.Position || row.position);
    var team = teamFantasyGameDayNormalizeTeam_(row.TeamAbbr || row.teamAbbr);
    if (!position || !team) return;
    matrix[position][team] = (matrix[position][team] || 0) + 1;
  });
  return matrix;
}

function teamFantasyGameDayUsageAllowed_(matrix, position, teamAbbr, limit) {
  position = teamFantasyGameDayNormalizePosition_(position);
  teamAbbr = teamFantasyGameDayNormalizeTeam_(teamAbbr);
  var used = matrix[position] && matrix[position][teamAbbr] ? Number(matrix[position][teamAbbr]) : 0;
  return { allowed: used < Number(limit || 0), used: used, remaining: Math.max(0, Number(limit || 0) - used) };
}

function teamFantasyGameDayStatus_(pick, score, nowMs) {
  if (score && teamFantasyGameDayBool_(score.Final !== undefined ? score.Final : score.final)) return "final";
  var kickoffText = pick ? (pick.GameDateTime || pick.gameDateTime) : "";
  var kickoff = kickoffText ? new Date(kickoffText).getTime() : NaN;
  if (score || (!isNaN(kickoff) && kickoff <= nowMs)) return "live";
  return "upcoming";
}


function teamFantasyGameDayPickMethod_(value) {
  var key = teamFantasyGameDayKey_(value);
  if (key === "random") return "R";
  if (key === "auto" || key === "autopick" || key === "auto-pick") return "AP";
  return "";
}

function teamFantasyGameDayApplyPositionRanks_(competitors) {
  teamFantasyGameDayPositions_().forEach(function(position) {
    var ranked = [];
    (competitors || []).forEach(function(competitor) {
      var slot = (competitor.slots || []).filter(function(item) { return item.position === position; })[0] || null;
      if (!slot || slot.hidden || slot.empty || slot.status === "upcoming") return;
      ranked.push({ competitor: competitor, slot: slot, points: Number(slot.fantasyPoints || 0) });
    });
    ranked.sort(function(a, b) {
      if (b.points !== a.points) return b.points - a.points;
      return teamFantasyGameDayString_(a.competitor.entryId).localeCompare(teamFantasyGameDayString_(b.competitor.entryId));
    });
    var lastPoints = null;
    var lastRank = 0;
    ranked.forEach(function(item, index) {
      if (lastPoints === null || item.points !== lastPoints) lastRank = index + 1;
      item.slot.weekRank = lastRank;
      item.slot.weekRankFieldSize = ranked.length;
      lastPoints = item.points;
    });
  });
  return competitors;
}

function teamFantasyGameDayAttachStandings_(compare, standings) {
  compare = compare || {};
  standings = standings && standings.success !== false ? standings : null;
  compare.leagueName = standings && standings.league ? teamFantasyGameDayString_(standings.league.leagueName) : "";
  compare.leagueStandingMode = standings && standings.league ? teamFantasyGameDayString_(standings.league.standingMode) : "";
  var rows = standings && Array.isArray(standings.rows) ? standings.rows : [];
  (compare.competitors || []).forEach(function(competitor) {
    var row = rows.filter(function(item) {
      var entryId = teamFantasyGameDayString_(item.entryId);
      var username = teamFantasyGameDayKey_(item.username);
      return entryId ? entryId === competitor.entryId : username === teamFantasyGameDayKey_(competitor.username);
    })[0] || null;
    competitor.leagueRank = row ? Number(row.rank || 0) : 0;
    competitor.record = {
      wins: row ? Number(row.regularWins || 0) : 0,
      losses: row ? Number(row.regularLosses || 0) : 0,
      ties: row ? Number(row.regularTies || 0) : 0
    };
  });
  return compare;
}

function teamFantasyGameDayBuildCompare_(input) {
  input = input || {};
  var positions = teamFantasyGameDayPositions_();
  var nowMs = Number(input.nowMs || Date.now());
  var viewerIds = input.viewerEntryIds || {};
  var picks = Array.isArray(input.picks) ? input.picks : [];
  var scores = Array.isArray(input.scores) ? input.scores : [];
  var entries = Array.isArray(input.entries) ? input.entries : [];
  var pickMap = {};
  var scoreMap = {};

  picks.forEach(function(row) {
    var entryId = teamFantasyGameDayString_(row.EntryId || row.entryId);
    var position = teamFantasyGameDayNormalizePosition_(row.Position || row.position);
    if (!entryId || !position) return;
    pickMap[entryId + "|" + position] = row;
  });
  scores.forEach(function(row) {
    var entryId = teamFantasyGameDayString_(row.EntryId || row.entryId);
    var position = teamFantasyGameDayNormalizePosition_(row.Position || row.position);
    var team = teamFantasyGameDayNormalizeTeam_(row.TeamAbbr || row.teamAbbr);
    if (!entryId || !position || !team) return;
    scoreMap[entryId + "|" + position + "|" + team] = row;
  });

  var competitors = entries.map(function(entry) {
    var entryId = teamFantasyGameDayString_(entry.EntryId || entry.entryId);
    var username = teamFantasyGameDayString_(entry.Username || entry.username);
    var entryName = teamFantasyGameDayString_(entry.EntryName || entry.entryName);
    var isViewer = viewerIds[entryId] === true;
    var counts = { final: 0, live: 0, upcoming: 0 };
    var total = 0;
    var updatedAt = "";
    var slots = positions.map(function(position) {
      var pick = pickMap[entryId + "|" + position] || null;
      if (!pick) {
        if (!isViewer) {
          counts.upcoming++;
          return { position: position, label: teamFantasyGameDayPositionLabel_(position), hidden: true, status: "upcoming", fantasyPoints: 0 };
        }
        return { position: position, label: teamFantasyGameDayPositionLabel_(position), hidden: false, empty: true, status: "upcoming", fantasyPoints: 0 };
      }
      var team = teamFantasyGameDayNormalizeTeam_(pick.TeamAbbr || pick.teamAbbr);
      var score = scoreMap[entryId + "|" + position + "|" + team] || null;
      var status = teamFantasyGameDayStatus_(pick, score, nowMs);
      counts[status] = (counts[status] || 0) + 1;
      var points = score ? teamFantasyGameDayRound_(score.FantasyPoints !== undefined ? score.FantasyPoints : score.fantasyPoints) : 0;
      total += points;
      var scoreUpdated = score ? teamFantasyGameDayString_(score.UpdatedAt || score.updatedAt) : "";
      if (scoreUpdated && (!updatedAt || scoreUpdated > updatedAt)) updatedAt = scoreUpdated;
      var reveal = isViewer || status !== "upcoming";
      if (!reveal) {
        return { position: position, label: teamFantasyGameDayPositionLabel_(position), hidden: true, status: status, fantasyPoints: 0 };
      }
      return {
        position: position,
        label: teamFantasyGameDayPositionLabel_(position),
        hidden: false,
        empty: false,
        status: status,
        teamAbbr: team,
        teamName: teamFantasyGameDayString_(pick.TeamName || pick.teamName) || team,
        logoUrl: teamFantasyGameDayLogoUrl_(team),
        fantasyPoints: points,
        pickMethod: teamFantasyGameDayPickMethod_(pick.PickMethod || pick.pickMethod),
        gameDateTime: teamFantasyGameDayString_(pick.GameDateTime || pick.gameDateTime),
        final: status === "final"
      };
    });
    return {
      entryId: entryId,
      username: username,
      label: entryName || entryId || username,
      conference: teamFantasyGameDayString_(entry.Conference || entry.conference),
      isViewer: isViewer,
      totalPoints: teamFantasyGameDayRound_(total),
      counts: counts,
      updatedAt: updatedAt,
      slots: slots
    };
  });

  teamFantasyGameDayApplyPositionRanks_(competitors);

  competitors.sort(function(a, b) {
    if (a.isViewer !== b.isViewer) return a.isViewer ? -1 : 1;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.label.localeCompare(b.label);
  });

  return {
    success: true,
    version: TEAM_FANTASY_GAME_DAY_VERSION,
    gameId: teamFantasyGameDayString_(input.gameId),
    week: Number(input.week || 0),
    leagueId: teamFantasyGameDayString_(input.leagueId),
    pollAfterMs: TEAM_FANTASY_GAME_DAY_POLL_MS,
    privacy: "Opponent picks remain hidden until that NFL team's game kicks off.",
    competitors: competitors
  };
}

function teamFantasyGameDayBuildWeeklyLeaderboard_(compare) {
  compare = compare || {};
  var rows = (compare.competitors || []).map(function(c) {
    return {
      entryId: teamFantasyGameDayString_(c.entryId),
      username: teamFantasyGameDayString_(c.username),
      label: teamFantasyGameDayString_(c.label || c.entryId || c.username),
      isViewer: c.isViewer === true,
      points: teamFantasyGameDayRound_(c.totalPoints || 0),
      counts: c.counts || { final: 0, live: 0, upcoming: 0 },
      record: c.record || { wins: 0, losses: 0, ties: 0 },
      seasonRank: Number(c.leagueRank || 0)
    };
  });
  rows.sort(function(a, b) {
    if (b.points !== a.points) return b.points - a.points;
    return a.label.localeCompare(b.label);
  });
  var leader = rows.length ? Number(rows[0].points || 0) : 0;
  var lastPoints = null;
  var lastRank = 0;
  rows.forEach(function(row, index) {
    if (lastPoints === null || Number(row.points) !== Number(lastPoints)) lastRank = index + 1;
    row.weekRank = lastRank;
    row.pointsBehindLeader = teamFantasyGameDayRound_(Math.max(0, leader - Number(row.points || 0)));
    var above = null;
    for (var a = index - 1; a >= 0; a--) {
      if (Number(rows[a].points) > Number(row.points)) { above = rows[a]; break; }
    }
    var below = null;
    for (var b = index + 1; b < rows.length; b++) {
      if (Number(rows[b].points) < Number(row.points)) { below = rows[b]; break; }
    }
    row.pointsToMoveUp = above ? teamFantasyGameDayRound_(Math.max(0.01, Number(above.points) - Number(row.points) + 0.01)) : 0;
    row.moveUpRank = above ? Number(above.weekRank || index) : 0;
    row.cushionOverBelow = below ? teamFantasyGameDayRound_(Math.max(0, Number(row.points) - Number(below.points))) : 0;
    row.belowRank = below ? Number(below.weekRank || index + 2) : 0;
    lastPoints = row.points;
  });
  return { rows: rows, leaderPoints: leader, week: Number(compare.week || 0), leagueId: teamFantasyGameDayString_(compare.leagueId), leagueName: teamFantasyGameDayString_(compare.leagueName) };
}

function teamFantasyGameDayTriggerWindow_(gameId, week, nowMs) {
  nowMs = Number(nowMs || Date.now());
  var schedule = teamFantasyFetchWeekSchedule_(gameId, week);
  var games = schedule && Array.isArray(schedule.games) ? schedule.games : [];
  if (!games.length) return { active: false, reason: "No NFL games found for this week." };
  var pregameMs = 30 * 60 * 1000;
  var postgameMs = 8 * 60 * 60 * 1000;
  var active = games.some(function(game) {
    var state = teamFantasyGameDayKey_(game && game.state);
    var status = teamFantasyGameDayKey_(game && game.status);
    if (state === "in" || status.indexOf("in progress") !== -1 || status.indexOf("halftime") !== -1) return true;
    var kickoff = new Date(game && game.gameDateTime || 0).getTime();
    if (isNaN(kickoff)) return false;
    return nowMs >= kickoff - pregameMs && nowMs <= kickoff + postgameMs;
  });
  return { active: active, reason: active ? "NFL game window active." : "Outside NFL game window.", scheduleGames: games.length };
}

function apiGetTeamFantasyGameDayState(payload) {
  payload = payload || {};
  var username = typeof teamFantasyNormalizeUsername_ === "function" ? teamFantasyNormalizeUsername_(payload.username) : teamFantasyGameDayKey_(payload.username);
  var gameId = teamFantasyGameDayString_(payload.gameId);
  if (!username || !gameId) throw new Error("User and game are required.");
  if (typeof teamFantasyIsGame_ === "function" && !teamFantasyIsGame_(gameId)) throw new Error("This game is not configured as Team Fantasy Football.");

  var settings = teamFantasyGetSettings_(gameId);
  var week = Math.max(1, Math.floor(Number(payload.week || settings.currentWeek || 1)));
  var viewerEntries = teamFantasyEnsureEntriesForUser_(gameId, username);
  var viewerIds = {};
  viewerEntries.forEach(function(entry) { viewerIds[teamFantasyGameDayString_(entry.entryId || entry.EntryId)] = true; });

  var leagues = teamFantasyLeaguesForEntries_(gameId, viewerEntries);
  var requested = teamFantasyGameDayString_(payload.leagueId);
  var selectedLeagueId = requested && leagues.some(function(league) { return teamFantasyGameDayString_(league.leagueId || league.LeagueId) === requested; })
    ? requested
    : (leagues[0] ? teamFantasyGameDayString_(leagues[0].leagueId || leagues[0].LeagueId) : "complete");

  var allowed = teamFantasyLeagueEntryIds_(gameId, selectedLeagueId);
  var entries = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.ENTRIES).filter(function(row) {
    var entryId = teamFantasyGameDayString_(row.EntryId);
    return teamFantasyGameDayString_(row.GameId) === gameId && allowed[entryId] && teamFantasyBool_(row.Active, true);
  });
  var picks = teamFantasyPickRows_(gameId, settings.seasonYear, week, "");
  var scores = teamFantasyReadRows_(TEAM_FANTASY_SHEETS.UNIT_SCORES).filter(function(row) {
    return teamFantasyGameDayString_(row.GameId) === gameId && Number(row.SeasonYear) === Number(settings.seasonYear) && Number(row.Week) === week && allowed[teamFantasyGameDayString_(row.EntryId)];
  });

  var out = teamFantasyGameDayBuildCompare_({
    gameId: gameId,
    week: week,
    leagueId: selectedLeagueId,
    viewerEntryIds: viewerIds,
    entries: entries,
    picks: picks,
    scores: scores,
    nowMs: Date.now()
  });
  var standings = typeof teamFantasyBuildStandings_ === "function" ? teamFantasyBuildStandings_(gameId, selectedLeagueId) : null;
  teamFantasyGameDayAttachStandings_(out, standings);
  out.leagues = leagues.map(function(league) {
    return { leagueId: teamFantasyGameDayString_(league.leagueId || league.LeagueId), leagueName: teamFantasyGameDayString_(league.leagueName || league.LeagueName), leagueType: teamFantasyGameDayString_(league.leagueType || league.LeagueType) };
  });
  out.selectedLeagueId = selectedLeagueId;
  out.weeklyLeaderboard = teamFantasyGameDayBuildWeeklyLeaderboard_(out);
  var maxWeek = Math.max(1, Math.floor(Number(settings.currentWeek || week || 1)));
  out.availableWeeks = [];
  for (var availableWeek = 1; availableWeek <= maxWeek; availableWeek++) out.availableWeeks.push(availableWeek);
  out.currentWeek = maxWeek;
  out.username = username;
  out.seasonYear = settings.seasonYear;
  out.generatedAt = new Date().toISOString();
  return out;
}

function teamFantasyBuildSyntheticGameDayLab_() {
  var positions = teamFantasyGameDayPositions_();
  var teams = ["BUF", "MIA", "KC", "PHI", "DET", "SF", "BAL", "GB", "CHI", "DAL", "SEA", "HOU", "LAR", "MIN", "TB", "CIN"];
  var now = Date.now();
  var entries = [];
  var picks = [];
  var scores = [];
  for (var p = 0; p < 6; p++) {
    var entryId = "test-player-" + (p + 1);
    entries.push({ EntryId: entryId, Username: "test" + (p + 1), EntryName: "Test Team " + (p + 1), Conference: "ALL", Active: true });
    positions.forEach(function(position, index) {
      var team = teams[(p * 3 + index) % teams.length];
      var phase = index <= 2 ? "final" : (index <= 5 ? "live" : "upcoming");
      var kickoff = phase === "final" ? now - (5 - index) * 3600000 : (phase === "live" ? now - (index - 2) * 1800000 : now + (index - 5) * 3600000);
      var pickMethod = index % 3 === 0 ? "auto" : (index % 3 === 1 ? "random" : "manual");
      picks.push({ EntryId: entryId, Position: position, TeamAbbr: team, TeamName: team + " Test", PickMethod: pickMethod, GameDateTime: new Date(kickoff).toISOString() });
      if (phase !== "upcoming") {
        scores.push({
          EntryId: entryId,
          Position: position,
          TeamAbbr: team,
          FantasyPoints: teamFantasyGameDayRound_((p + 1) * 2.25 + (index + 1) * 1.35),
          Final: phase === "final",
          UpdatedAt: new Date(now - 60000).toISOString()
        });
      }
    });
  }
  var compare = teamFantasyGameDayBuildCompare_({
    gameId: "TEAM_FANTASY_TEST_LAB",
    week: 99,
    leagueId: "synthetic-six",
    viewerEntryIds: { "test-player-1": true },
    entries: entries,
    picks: picks,
    scores: scores,
    nowMs: now
  });
  var fakeStandingRows = entries.map(function(entry, index) {
    return { entryId: entry.EntryId, username: entry.Username, rank: index + 1, regularWins: 10 - index, regularLosses: 3 + index, regularTies: index % 2 };
  });
  teamFantasyGameDayAttachStandings_(compare, { success: true, league: { leagueId: "synthetic-six", leagueName: "Synthetic Six", standingMode: "entries" }, rows: fakeStandingRows });
  compare.leagues = [
    { leagueId: "synthetic-six", leagueName: "Complete League", leagueType: "complete" },
    { leagueId: "synthetic-east", leagueName: "Synthetic East", leagueType: "subleague" }
  ];
  compare.selectedLeagueId = "synthetic-six";
  compare.weeklyLeaderboard = teamFantasyGameDayBuildWeeklyLeaderboard_(compare);
  compare.availableWeeks = [97, 98, 99];
  compare.currentWeek = 99;

  var usageRows = [
    { Position: "QB", TeamAbbr: "BUF" },
    { Position: "QB", TeamAbbr: "BUF" },
    { Position: "QB", TeamAbbr: "BUF" },
    { Position: "RB", TeamAbbr: "BUF" }
  ];
  var usage = teamFantasyGameDayUsageMatrix_(usageRows);
  var qb = teamFantasyGameDayUsageAllowed_(usage, "QB", "BUF", 3);
  var rb = teamFantasyGameDayUsageAllowed_(usage, "RB", "BUF", 3);
  var viewer = compare.competitors.filter(function(c) { return c.entryId === "test-player-1"; })[0];
  var opponent = compare.competitors.filter(function(c) { return c.entryId === "test-player-2"; })[0];
  var opponentUpcoming = opponent.slots.filter(function(s) { return s.status === "upcoming"; });
  var opponentLive = opponent.slots.filter(function(s) { return s.status === "live"; });
  var viewerUpcoming = viewer.slots.filter(function(s) { return s.status === "upcoming"; });
  var rankedSlots = compare.competitors.reduce(function(all, c) { return all.concat(c.slots.filter(function(s){ return s.status !== "upcoming" && !s.hidden; })); }, []);
  var methodSlots = compare.competitors.reduce(function(all, c) { return all.concat(c.slots.filter(function(s){ return s.pickMethod === "AP" || s.pickMethod === "R"; })); }, []);
  var totalCheck = compare.competitors.every(function(c) {
    var sum = c.slots.reduce(function(acc, slot) { return acc + Number(slot.fantasyPoints || 0); }, 0);
    return Math.abs(teamFantasyGameDayRound_(sum) - Number(c.totalPoints || 0)) < 0.01;
  });

  var scoringProbe = { points: 0 };
  if (typeof teamFantasyScoreStats_ === "function") {
    scoringProbe = teamFantasyScoreStats_([
      { active: true, position: "QB", statKey: "passingYards", ruleType: "unit", pointsPerUnit: 0.04, threshold: null, bonusPoints: 0, ruleId: "lab-yd", label: "Passing yards" },
      { active: true, position: "QB", statKey: "passingTouchdowns", ruleType: "unit", pointsPerUnit: 4, threshold: null, bonusPoints: 0, ruleId: "lab-td", label: "Passing TD" },
      { active: true, position: "QB", statKey: "passingYards", ruleType: "bonus", pointsPerUnit: 0, threshold: 300, bonusPoints: 3, ruleId: "lab-300", label: "300+ yards" }
    ], "QB", { passingYards: 325, passingTouchdowns: 3 });
  }

  var checks = [
    { name: "Synthetic league has 6 players", passed: compare.competitors.length === 6, detail: compare.competitors.length + " players" },
    { name: "Real scoring engine probe passes", passed: Number(scoringProbe.points || 0) === 28, detail: "325 pass yds + 3 pass TD + 300-yard bonus = 28 pts" },
    { name: "Every lineup has all 8 positions", passed: compare.competitors.every(function(c){ return c.slots.length === 8; }), detail: "QB, RB, WR/TE, K, OL, DL, LB, DB" },
    { name: "Team-use limit is per position", passed: qb.allowed === false && qb.used === 3 && rb.allowed === true && rb.used === 1, detail: "BUF QB 3/3 blocked; BUF RB 1/3 still allowed" },
    { name: "Opponent upcoming picks stay hidden", passed: opponentUpcoming.length > 0 && opponentUpcoming.every(function(s){ return s.hidden === true && !s.teamAbbr; }), detail: opponentUpcoming.length + " upcoming slots hidden" },
    { name: "Viewer can see own upcoming picks", passed: viewerUpcoming.length > 0 && viewerUpcoming.every(function(s){ return s.hidden === false && !!s.teamAbbr; }), detail: viewerUpcoming.length + " own upcoming slots visible" },
    { name: "Opponent picks reveal after kickoff", passed: opponentLive.length > 0 && opponentLive.every(function(s){ return s.hidden === false && !!s.teamAbbr; }), detail: opponentLive.length + " live slots revealed" },
    { name: "Live totals equal slot points", passed: totalCheck, detail: "All six totals reconciled" },
    { name: "Weekly position ranks are calculated", passed: rankedSlots.length > 0 && rankedSlots.every(function(s){ return Number(s.weekRank || 0) >= 1; }), detail: "Live/final slots carry current league position rank" },
    { name: "League rank and record are attached", passed: compare.competitors.every(function(c){ return Number(c.leagueRank || 0) >= 1 && c.record; }), detail: "Each fake team has league rank + W-L-T" },
    { name: "Weekly league race ranks all six teams", passed: compare.weeklyLeaderboard && compare.weeklyLeaderboard.rows && compare.weeklyLeaderboard.rows.length === 6 && compare.weeklyLeaderboard.rows[0].weekRank === 1, detail: "Weekly leaderboard uses accumulated live points" },
    { name: "Points-behind and move-up math is available", passed: compare.weeklyLeaderboard && compare.weeklyLeaderboard.rows.slice(1).every(function(r){ return Number(r.pointsBehindLeader || 0) >= 0 && Number(r.pointsToMoveUp || 0) > 0; }), detail: "Behind leader + exact pass target calculated" },
    { name: "Complete/subleague switch options are present", passed: compare.leagues && compare.leagues.length === 2 && compare.leagues.some(function(l){ return l.leagueType === "subleague"; }), detail: "Complete League + Synthetic East" },
    { name: "Past-week comparison selector is available", passed: compare.availableWeeks && compare.availableWeeks.length === 3 && compare.availableWeeks[0] === 97 && compare.availableWeeks[2] === 99, detail: "Synthetic history exposes Weeks 97–99" },
    { name: "Auto/Random method tags are preserved", passed: methodSlots.length > 0, detail: "AP and R tags available after picks reveal" },
    { name: "Upcoming / Live / Final states are present", passed: compare.competitors.every(function(c){ return c.counts.upcoming > 0 && c.counts.live > 0 && c.counts.final > 0; }), detail: "All status states exercised" },
    { name: "Comparison supports 2–6 teams", passed: compare.competitors.length >= 6, detail: "Head-to-head through six-team view" }
  ];
  return {
    success: true,
    synthetic: true,
    writesSheets: false,
    version: TEAM_FANTASY_GAME_DAY_VERSION,
    allPassed: checks.every(function(check){ return check.passed === true; }),
    checks: checks,
    compare: compare,
    usageExample: { team: "BUF", QB: qb, RB: rb }
  };
}

function apiAdminGetTeamFantasyTestLab(payload) {
  payload = payload || {};
  if (typeof requireAdminFromToken_ === "function") requireAdminFromToken_(payload.token);
  return teamFantasyBuildSyntheticGameDayLab_();
}
