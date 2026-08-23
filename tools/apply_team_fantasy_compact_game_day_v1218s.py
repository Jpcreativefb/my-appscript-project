#!/usr/bin/env python3
from pathlib import Path
import sys, shutil, tempfile

MARKER = 'TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s'
CSS_MARKER = 'v1.2.18s compact game-day rankings + picker'


def replace_function(text, name, replacement):
    candidates = [f'function {name}(', f'async function {name}(']
    starts = [(text.find(c), c) for c in candidates if text.find(c) >= 0]
    if not starts:
        raise RuntimeError(f'Could not find function {name}')
    start, sig = min(starts, key=lambda x: x[0])
    brace = text.find('{', start)
    if brace < 0:
        raise RuntimeError(f'Could not find opening brace for {name}')
    depth = 0; i = brace
    in_s = in_d = in_t = False; esc=False; line=False; block=False
    while i < len(text):
        c=text[i]; n=text[i+1] if i+1<len(text) else ''
        if line:
            if c=='\n': line=False
            i+=1; continue
        if block:
            if c=='*' and n=='/': block=False; i+=2; continue
            i+=1; continue
        if in_s:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c=="'": in_s=False
            i+=1; continue
        if in_d:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c=='"': in_d=False
            i+=1; continue
        if in_t:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c=='`': in_t=False
            i+=1; continue
        if c=='/' and n=='/': line=True; i+=2; continue
        if c=='/' and n=='*': block=True; i+=2; continue
        if c=="'": in_s=True; i+=1; continue
        if c=='"': in_d=True; i+=1; continue
        if c=='`': in_t=True; i+=1; continue
        if c=='{': depth+=1
        elif c=='}':
            depth-=1
            if depth==0:
                return text[:start] + replacement.rstrip() + text[i+1:]
        i+=1
    raise RuntimeError(f'Could not find closing brace for {name}')


def patch_game_day(path):
    text = path.read_text()
    if 'TEAM_FANTASY_COMPACT_GAME_DAY_BACKEND_v1218s' in text:
        return
    if 'TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18r"' not in text and 'TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18s"' not in text:
        raise RuntimeError('Expected v1.2.18r1 game-day engine marker not found')
    text = text.replace('var TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18r";', 'var TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18s";\n/* TEAM_FANTASY_COMPACT_GAME_DAY_BACKEND_v1218s */', 1)

    helpers = r'''
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
'''
    marker = 'function teamFantasyGameDayBuildCompare_(input) {'
    pos = text.find(marker)
    if pos < 0: raise RuntimeError('Could not find game-day compare builder')
    text = text[:pos] + helpers + '\n' + text[pos:]

    build = r'''function teamFantasyGameDayBuildCompare_(input) {
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
}'''
    text = replace_function(text, 'teamFantasyGameDayBuildCompare_', build)

    api = r'''function apiGetTeamFantasyGameDayState(payload) {
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
  out.username = username;
  out.seasonYear = settings.seasonYear;
  out.generatedAt = new Date().toISOString();
  return out;
}'''
    text = replace_function(text, 'apiGetTeamFantasyGameDayState', api)

    lab = r'''function teamFantasyBuildSyntheticGameDayLab_() {
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
}'''
    text = replace_function(text, 'teamFantasyBuildSyntheticGameDayLab_', lab)
    path.write_text(text.rstrip() + '\n')


def patch_player(path):
    text = path.read_text()
    if MARKER in text:
        return
    if 'TEAM_FANTASY_GAME_DAY_UI_v1218r1' not in text:
        raise RuntimeError('Expected v1.2.18r1 Team Fantasy player UI marker not found')

    text = text.replace('team-fantasy.css?v=1218r', 'team-fantasy.css?v=1218s').replace('team-fantasy.css?v=1218j2', 'team-fantasy.css?v=1218s')

    helpers = r'''

/* TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s */
function teamFantasyTeamLogoUrl_(abbr) {
  const key = String(abbr || '').toUpperCase();
  const slug = key === 'WAS' ? 'wsh' : key.toLowerCase();
  return key ? 'https://a.espncdn.com/i/teamlogos/nfl/500/' + encodeURIComponent(slug) + '.png' : '';
}

function teamFantasyPickMethodTag_(method) {
  const key = String(method || '').toLowerCase();
  if (key === 'random' || key === 'r') return 'R';
  if (key === 'auto' || key === 'autopick' || key === 'auto-pick' || key === 'ap') return 'AP';
  return '';
}

function teamFantasyOpponentText_(team) {
  const game = team && team.game || {};
  const abbr = String(team && team.abbr || '').toUpperCase();
  if (String(game.homeAbbr || '').toUpperCase() === abbr) return game.awayAbbr ? 'vs ' + game.awayAbbr : '';
  if (String(game.awayAbbr || '').toUpperCase() === abbr) return game.homeAbbr ? '@ ' + game.homeAbbr : '';
  return '';
}

function teamFantasyFindSlot_(entryId, position) {
  const state = window.TEAM_FANTASY_STATE || {};
  const lineup = (state.lineups || []).filter(function(item){ return String(item.entry && item.entry.entryId || '') === String(entryId || ''); })[0] || null;
  return lineup ? (lineup.slots || []).filter(function(slot){ return String(slot.position || '') === String(position || ''); })[0] || null : null;
}

function teamFantasyPickerTeams_(slot) {
  const current = slot && slot.pick ? String(slot.pick.teamAbbr || '') : '';
  return (slot && slot.teams || []).filter(function(team){ return team.eligible === true || String(team.abbr || '') === current; });
}

function teamFantasyCloseTeamPicker_() {
  const old = document.getElementById('tfTeamPickerOverlay');
  if (old) old.remove();
}

function teamFantasyOpenTeamPicker_(entryId, position) {
  const slot = teamFantasyFindSlot_(entryId, position);
  if (!slot || slot.locked) return;
  const teams = teamFantasyPickerTeams_(slot);
  const current = slot.pick ? String(slot.pick.teamAbbr || '') : '';
  teamFantasyCloseTeamPicker_();
  const rows = teams.map(function(team) {
    const usageLimit = Number(team.uses || 0) + Number(team.usesRemaining || 0);
    const usage = usageLimit > 0 ? `<span class="tf-picker-usage">${Number(team.uses || 0)}/${usageLimit}</span>` : '';
    const selected = current === String(team.abbr || '') ? ' is-selected' : '';
    return `<button type="button" class="tf-picker-team${selected}" onclick="teamFantasyChooseTeam_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}','${teamFantasyEscape_(team.abbr)}')"><img src="${teamFantasyEscape_(teamFantasyTeamLogoUrl_(team.abbr))}" alt=""><strong>${teamFantasyEscape_(team.abbr)}</strong><span class="tf-picker-opponent">${teamFantasyEscape_(teamFantasyOpponentText_(team))}</span>${usage}</button>`;
  }).join('');
  document.body.insertAdjacentHTML('beforeend', `<div id="tfTeamPickerOverlay" class="tf-picker-overlay" role="presentation" onclick="if(event.target===this)teamFantasyCloseTeamPicker_()"><section class="tf-picker-sheet" role="dialog" aria-modal="true" aria-label="Choose ${teamFantasyEscape_(slot.label || position)} team"><div class="tf-picker-head"><div><strong>${teamFantasyEscape_(slot.label || position)}</strong><span>${teams.length} available</span></div><button type="button" class="tf-picker-close" onclick="teamFantasyCloseTeamPicker_()" aria-label="Close">×</button></div><div class="tf-picker-list">${rows || '<div class="tf-muted">No teams available.</div>'}</div></section></div>`);
}

async function teamFantasyChooseTeam_(entryId, position, teamAbbr) {
  teamFantasyCloseTeamPicker_();
  await teamFantasySaveSlot_(entryId, position, teamAbbr);
}

function teamFantasyCompareLeaguePicker_() {
  const state = window.TEAM_FANTASY_STATE || {};
  const leagues = Array.isArray(state.leagues) ? state.leagues : [];
  if (leagues.length <= 1) return `<span class="tf-compare-league-name">${teamFantasyEscape_(window.TEAM_FANTASY_GAME_DAY && window.TEAM_FANTASY_GAME_DAY.leagueName || leagues[0] && leagues[0].leagueName || 'League')}</span>`;
  return `<label class="tf-compare-league"><span>League</span><select onchange="teamFantasyChangeLeague_(this.value)">${leagues.map(function(league){ return `<option value="${teamFantasyEscape_(league.leagueId)}" ${league.leagueId===state.selectedLeagueId?'selected':''}>${teamFantasyEscape_(league.leagueName)}</option>`; }).join('')}</select></label>`;
}
'''
    pos = text.find('function teamFantasyRenderSlot_(state, lineup, slot) {')
    if pos < 0: raise RuntimeError('Could not find Team Fantasy slot renderer')
    text = text[:pos] + helpers + '\n' + text[pos:]

    slot = r'''function teamFantasyRenderSlot_(state, lineup, slot) {
  const entry = lineup.entry || {};
  const pick = slot.pick || null;
  const slotId = 'tf-' + String(entry.entryId || '').replace(/[^a-z0-9_-]/gi, '-') + '-' + slot.position;
  const method = pick ? teamFantasyPickMethodTag_(pick.pickMethod) : '';
  const logo = pick ? teamFantasyTeamLogoUrl_(pick.teamAbbr) : '';
  const selectedTeam = pick ? (slot.teams || []).filter(function(team){ return String(team.abbr || '') === String(pick.teamAbbr || ''); })[0] || null : null;
  const opponent = selectedTeam ? teamFantasyOpponentText_(selectedTeam) : '';
  if (slot.locked && pick) {
    return `<div class="tf-slot tf-slot-compact is-locked" id="${slotId}" data-missing="false"><strong class="tf-slot-position">${teamFantasyEscape_(slot.label)}</strong><div class="tf-pick-compact"><img src="${teamFantasyEscape_(logo)}" alt=""><span class="tf-pick-abbr">${teamFantasyEscape_(pick.teamAbbr)}</span>${method?`<span class="tf-pick-method">${teamFantasyEscape_(method)}</span>`:''}<span class="tf-pick-opponent">${teamFantasyEscape_(opponent)}</span></div><span class="tf-lock">🔒</span></div>`;
  }
  return `<div class="tf-slot tf-slot-compact ${pick?'has-pick':'needs-pick'}" id="${slotId}" data-missing="${pick?'false':'true'}"><strong class="tf-slot-position">${teamFantasyEscape_(slot.label)}</strong><button type="button" class="tf-team-picker-button ${pick?'has-team':''}" onclick="teamFantasyOpenTeamPicker_('${teamFantasyEscape_(entry.entryId)}','${teamFantasyEscape_(slot.position)}')">${pick?`<img src="${teamFantasyEscape_(logo)}" alt=""><span class="tf-pick-abbr">${teamFantasyEscape_(pick.teamAbbr)}</span>${method?`<span class="tf-pick-method">${teamFantasyEscape_(method)}</span>`:''}<span class="tf-pick-opponent">${teamFantasyEscape_(opponent)}</span>`:'<span class="tf-pick-empty">Choose team</span>'}<span class="tf-picker-chevron">⌄</span></button></div>`;
}'''
    text = replace_function(text, 'teamFantasyRenderSlot_', slot)

    compare_slot = r'''function teamFantasyRenderCompareSlot_(slot) {
  const status = slot && slot.status ? slot.status : 'upcoming';
  const label = slot && slot.label ? slot.label : '';
  const statusTitle = teamFantasyStatusLabel_(status);
  if (slot && slot.hidden) {
    return `<div class="tf-compare-slot is-${teamFantasyEscape_(status)}" title="${teamFantasyEscape_(statusTitle)}"><div class="tf-compare-pos">${teamFantasyEscape_(label)}</div><div class="tf-hidden-pick">🔒</div><span class="sr-only">Hidden until kickoff · ${teamFantasyEscape_(statusTitle)}</span></div>`;
  }
  if (!slot || slot.empty || !slot.teamAbbr) {
    return `<div class="tf-compare-slot is-upcoming" title="Upcoming"><div class="tf-compare-pos">${teamFantasyEscape_(label)}</div><div class="tf-empty-logo">—</div><span class="sr-only">No pick yet · Upcoming</span></div>`;
  }
  const rank = Number(slot.weekRank || 0) > 0 ? ` <span class="tf-slot-rank">(#${Number(slot.weekRank)})</span>` : '';
  const method = teamFantasyPickMethodTag_(slot.pickMethod);
  return `<div class="tf-compare-slot is-${teamFantasyEscape_(status)}" title="${teamFantasyEscape_(statusTitle)}"><div class="tf-compare-pos">${teamFantasyEscape_(label)}</div><img class="tf-team-logo" src="${teamFantasyEscape_(slot.logoUrl || '')}" alt="${teamFantasyEscape_(slot.teamAbbr)}"><div class="tf-team-line"><strong class="tf-team-abbr">${teamFantasyEscape_(slot.teamAbbr)}</strong>${method?`<span class="tf-pick-method">${teamFantasyEscape_(method)}</span>`:''}</div><div class="tf-slot-points">${teamFantasyScore_(slot.fantasyPoints)} pts${rank}</div><span class="sr-only">${teamFantasyEscape_(statusTitle)}</span></div>`;
}'''
    text = replace_function(text, 'teamFantasyRenderCompareSlot_', compare_slot)

    board = r'''function teamFantasyRenderCompareBoard_(data, selectedIds) {
  const competitors = Array.isArray(data && data.competitors) ? data.competitors : [];
  const selected = competitors.filter(function(c){ return selectedIds.indexOf(c.entryId) !== -1; });
  if (selected.length < 2) return `<div class="tf-warning">Choose at least 2 teams to compare.</div>`;
  return `<div class="tf-compare-scroll"><div class="tf-compare-board">${selected.map(function(c){
    const record = c.record || { wins:0, losses:0, ties:0 };
    const rank = Number(c.leagueRank || 0) > 0 ? '#' + Number(c.leagueRank) : '#—';
    return `<article class="tf-compare-team"><div class="tf-compare-team-head"><div class="tf-team-head-name"><strong>${teamFantasyEscape_(c.label || c.entryId)}</strong>${c.isViewer?'<span class="tf-you-badge">YOU</span>':''}</div><div class="tf-compare-total">${teamFantasyScore_(c.totalPoints)} pts</div><div class="tf-compare-record">${rank} · ${Number(record.wins||0)}-${Number(record.losses||0)}-${Number(record.ties||0)}</div></div><div class="tf-compare-slots">${(c.slots||[]).map(teamFantasyRenderCompareSlot_).join('')}</div></article>`;
  }).join('')}</div></div>`;
}'''
    text = replace_function(text, 'teamFantasyRenderCompareBoard_', board)

    mount = r'''function teamFantasyRenderGameDayIntoMount_() {
  const mount = document.getElementById('tfGameDayMount');
  const data = window.TEAM_FANTASY_GAME_DAY;
  if (!mount || !data) return;
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  if (competitors.length < 2) {
    mount.innerHTML = `<div class="tf-muted">At least two league entries are needed for live comparison. Use the Test Lab below to prove the 2–6 team view now.</div>`;
    return;
  }
  const selected = teamFantasyCompareDefaultSelection_(data);
  mount.innerHTML = `<div class="tf-compare-controls"><div class="tf-compare-control-main"><strong>Compare 2–6 teams</strong><div class="tf-compare-subline">${teamFantasyCompareLeaguePicker_()}<span>· cached scores refresh every 5 min</span></div></div><div class="tf-action-row"><button class="tf-button secondary" onclick="teamFantasyComparePreset_(2)">H2H</button><button class="tf-button secondary" onclick="teamFantasyComparePreset_(6)">2–6</button></div></div><div class="tf-status-legend" aria-label="Game status colors"><span class="is-live"></span>Live <span class="is-final"></span>Final <span class="is-upcoming"></span>Upcoming</div><div class="tf-compare-picker">${competitors.map(function(c){ return `<label class="tf-compare-choice"><input type="checkbox" value="${teamFantasyEscape_(c.entryId)}" ${selected.indexOf(c.entryId)!==-1?'checked':''} onchange="teamFantasyCompareToggle_(this)"><span>${teamFantasyEscape_(c.label || c.entryId)}</span></label>`; }).join('')}</div><div id="tfCompareBoard">${teamFantasyRenderCompareBoard_(data, selected)}</div><div class="tf-muted tf-privacy-note">${teamFantasyEscape_(data.privacy || '')}</div>`;
}'''
    text = replace_function(text, 'teamFantasyRenderGameDayIntoMount_', mount)
    path.write_text(text.rstrip() + '\n')


def patch_css(path):
    text = path.read_text().rstrip() + '\n'
    if CSS_MARKER in text:
        path.write_text(text)
        return
    css = r'''

/* v1.2.18s compact game-day rankings + picker */
.tf-slot-grid{gap:7px;margin-top:10px}.tf-slot.tf-slot-compact{min-height:46px;padding:6px 8px;display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:7px;align-items:center}.tf-slot-position{font-size:.78rem}.tf-team-picker-button{min-height:38px;width:100%;border:1px solid rgba(127,127,127,.28);border-radius:9px;background:transparent;color:inherit;display:flex;align-items:center;gap:7px;padding:4px 8px;text-align:left;font:inherit}.tf-team-picker-button img,.tf-pick-compact img{width:27px;height:27px;object-fit:contain;flex:0 0 auto}.tf-pick-compact{min-width:0;display:flex;align-items:center;gap:7px}.tf-pick-abbr{font-weight:850}.tf-pick-opponent{font-size:.74rem;opacity:.68;white-space:nowrap}.tf-pick-empty{opacity:.7}.tf-picker-chevron{margin-left:auto;opacity:.65}.tf-pick-method{font-size:.55rem;font-weight:900;line-height:1;border:1px solid currentColor;border-radius:999px;padding:2px 4px;opacity:.82}.tf-slot.is-locked .tf-pick-compact{opacity:.88}.tf-slot.is-locked .tf-lock{font-size:.72rem}
.tf-picker-overlay{position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center}.tf-picker-sheet{width:min(560px,100%);max-height:min(72vh,680px);background:var(--card-bg,#fff);color:inherit;border-radius:16px 16px 0 0;box-shadow:0 -12px 36px rgba(0,0,0,.22);display:flex;flex-direction:column}.tf-picker-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid rgba(127,127,127,.2);background:inherit}.tf-picker-head>div{display:flex;gap:8px;align-items:baseline}.tf-picker-head span{font-size:.72rem;opacity:.7}.tf-picker-close{border:0;background:transparent;color:inherit;font-size:1.5rem;line-height:1;padding:3px 7px}.tf-picker-list{overflow:auto;padding:7px}.tf-picker-team{width:100%;min-height:43px;border:0;border-bottom:1px solid rgba(127,127,127,.13);background:transparent;color:inherit;display:grid;grid-template-columns:31px 42px minmax(0,1fr) auto;align-items:center;gap:7px;padding:5px 6px;text-align:left;font:inherit}.tf-picker-team img{width:28px;height:28px;object-fit:contain}.tf-picker-team.is-selected{background:rgba(127,127,127,.1);border-radius:9px}.tf-picker-opponent{font-size:.76rem;opacity:.7}.tf-picker-usage{font-size:.68rem;opacity:.72}
.tf-status-legend{display:flex;align-items:center;gap:5px;font-size:.7rem;opacity:.78;white-space:nowrap;margin:3px 0 8px}.tf-status-legend span{width:10px;height:10px;border:2px solid #94a3b8;border-radius:3px;margin-left:4px}.tf-status-legend span:first-child{margin-left:0}.tf-status-legend .is-live{border-color:#16a34a}.tf-status-legend .is-final{border-color:#2563eb}.tf-status-legend .is-upcoming{border-color:#94a3b8}
.tf-compare-scroll{max-height:70vh;overflow:auto;padding-bottom:3px}.tf-compare-board{align-items:flex-start;gap:7px}.tf-compare-team{width:172px;padding:7px;border-radius:11px}.tf-compare-team-head{position:sticky;top:0;z-index:4;min-height:67px;padding:5px 3px 6px;background:var(--card-bg,#fff);border-bottom:1px solid rgba(127,127,127,.15)}.tf-team-head-name{font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tf-compare-total{font-size:1.08rem;margin-top:3px}.tf-compare-record{font-size:.68rem;opacity:.75}.tf-compare-slots{grid-template-columns:1fr;gap:4px}.tf-compare-slot{min-height:67px;border:2px solid #94a3b8;border-radius:8px;padding:4px;gap:0}.tf-compare-slot.is-live{border-color:#16a34a}.tf-compare-slot.is-final{border-color:#2563eb;opacity:1}.tf-compare-slot.is-upcoming{border-color:#94a3b8;border-style:solid}.tf-compare-pos{top:3px;left:4px;font-size:.57rem}.tf-team-logo{width:27px;height:27px;margin-top:8px}.tf-team-line{display:flex;gap:3px;align-items:center}.tf-team-abbr{font-size:.68rem}.tf-slot-points{font-size:.64rem;line-height:1.1}.tf-slot-rank{opacity:.78}.tf-hidden-pick,.tf-empty-logo{font-size:1.05rem;margin-top:9px}.tf-status-badge{display:none!important}.tf-compare-subline{display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:.7rem;opacity:.78}.tf-compare-league{display:flex;align-items:center;gap:4px}.tf-compare-league span{font-weight:750}.tf-compare-league select{min-height:28px;border:1px solid rgba(127,127,127,.3);border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:.7rem;padding:2px 5px}.tf-compare-league-name{font-weight:750}.tf-compare-choice{padding:4px 7px;font-size:.74rem}.tf-privacy-note{font-size:.68rem;margin-top:6px}
@media(max-width:760px){.tf-lineup-card{padding:10px}.tf-lineup-card .tf-card-heading{gap:7px;margin-bottom:5px}.tf-lineup-card .tf-card-heading h2{font-size:1rem}.tf-lineup-actions{gap:5px}.tf-lineup-actions .tf-button{min-height:34px;padding:6px 9px;font-size:.75rem}.tf-progress-row{font-size:.72rem;margin-top:3px}.tf-progress{height:5px;margin:3px 0}.tf-missing-copy,.tf-complete{font-size:.7rem}.tf-slot-grid{grid-template-columns:1fr;margin-top:7px}.tf-slot.tf-slot-compact{min-height:42px;padding:4px 6px;grid-template-columns:40px minmax(0,1fr) auto}.tf-team-picker-button{min-height:34px;padding:3px 6px}.tf-team-picker-button img,.tf-pick-compact img{width:24px;height:24px}.tf-compare-controls{gap:6px;margin-bottom:4px}.tf-compare-controls .tf-button{min-height:32px;padding:5px 8px;font-size:.7rem}.tf-compare-picker{gap:4px;margin:5px 0 7px}.tf-compare-team{width:142px}.tf-compare-team-head{min-height:62px}.tf-compare-slot{min-height:62px}.tf-team-logo{width:24px;height:24px}.tf-picker-sheet{max-height:76vh}.tf-picker-team{grid-template-columns:28px 38px minmax(0,1fr) auto;min-height:40px}.tf-picker-team img{width:25px;height:25px}}
'''
    path.write_text((text + css).rstrip() + '\n')


def main():
    if len(sys.argv) < 2: raise RuntimeError('Repository path required')
    repo = Path(sys.argv[1]).resolve()
    targets = [repo/'backend/engines/SportsTeamFantasyGameDayEngine.js', repo/'frontend/js/pages/teamFantasy.js', repo/'frontend/css/team-fantasy.css']
    for p in targets:
        if not p.exists(): raise RuntimeError(f'Required file not found: {p}')
    backup = Path(tempfile.mkdtemp(prefix='tf18s-'))
    try:
        for p in targets:
            rel = p.relative_to(repo); dst = backup/rel; dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(p, dst)
        patch_game_day(targets[0]); patch_player(targets[1]); patch_css(targets[2])
        print('Team Fantasy v1.2.18s compact game-day polish applied.')
        print('- Weekly position rank appears next to live/final slot points')
        print('- Selected-league rank + W-L-T appear in frozen compare headers')
        print('- Team picker uses logos + abbreviations and hides exhausted teams')
        print('- AP / R method tags preserved')
        print('- Final blue / Live green / Upcoming gray compact borders')
        print('- Mobile compare headers stay sticky while the board scrolls')
    except Exception:
        for p in targets:
            rel = p.relative_to(repo); src=backup/rel
            if src.exists(): shutil.copy2(src,p)
        raise
    finally:
        shutil.rmtree(backup, ignore_errors=True)

if __name__ == '__main__':
    try: main()
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr); sys.exit(1)
