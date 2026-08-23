#!/usr/bin/env python3
from pathlib import Path
import sys, shutil, tempfile

MARKER = 'TEAM_FANTASY_WEEKLY_HUB_UI_v1218t2'
BACKEND_MARKER = 'TEAM_FANTASY_WEEKLY_HUB_BACKEND_v1218t2'
CSS_MARKER = 'v1.2.18t2 weekly hub + league race + contrast fix'


def replace_function(text, name, replacement):
    candidates = [f'function {name}(', f'async function {name}(']
    starts = [(text.find(c), c) for c in candidates if text.find(c) >= 0]
    if not starts:
        raise RuntimeError(f'Could not find function {name}')
    start, _ = min(starts, key=lambda x: x[0])
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


def insert_before_function(text, name, block):
    anchors = [f'function {name}(', f'async function {name}(']
    pos = min([text.find(a) for a in anchors if text.find(a) >= 0] or [-1])
    if pos < 0:
        raise RuntimeError(f'Could not find function {name} for insertion')
    return text[:pos] + block.rstrip() + '\n\n' + text[pos:]


def patch_backend(path):
    text = path.read_text()
    if BACKEND_MARKER in text:
        path.write_text(text.rstrip() + '\n'); return
    if 'TEAM_FANTASY_COMPACT_GAME_DAY_BACKEND_v1218s' not in text:
        raise RuntimeError('Required v1.2.18s game-day backend marker not found')
    text = text.replace('var TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18s";', 'var TEAM_FANTASY_GAME_DAY_VERSION = "1.2.18t";\n/* '+BACKEND_MARKER+' */', 1)

    helper = r'''function teamFantasyGameDayBuildWeeklyLeaderboard_(compare) {
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
}'''
    text = insert_before_function(text, 'teamFantasyGameDayTriggerWindow_', helper)

    needle = '  teamFantasyGameDayAttachStandings_(out, standings);\n  out.username = username;'
    repl = '''  teamFantasyGameDayAttachStandings_(out, standings);
  out.leagues = leagues.map(function(league) {
    return { leagueId: teamFantasyGameDayString_(league.leagueId || league.LeagueId), leagueName: teamFantasyGameDayString_(league.leagueName || league.LeagueName), leagueType: teamFantasyGameDayString_(league.leagueType || league.LeagueType) };
  });
  out.selectedLeagueId = selectedLeagueId;
  out.weeklyLeaderboard = teamFantasyGameDayBuildWeeklyLeaderboard_(out);
  out.username = username;'''
    if needle not in text: raise RuntimeError('Could not attach 18t league list/weekly leaderboard to game-day API')
    text = text.replace(needle, repl, 1)

    needle2 = '  teamFantasyGameDayAttachStandings_(compare, { success: true, league: { leagueId: "synthetic-six", leagueName: "Synthetic Six", standingMode: "entries" }, rows: fakeStandingRows });\n\n  var usageRows = ['
    repl2 = '''  teamFantasyGameDayAttachStandings_(compare, { success: true, league: { leagueId: "synthetic-six", leagueName: "Synthetic Six", standingMode: "entries" }, rows: fakeStandingRows });
  compare.leagues = [
    { leagueId: "synthetic-six", leagueName: "Complete League", leagueType: "complete" },
    { leagueId: "synthetic-east", leagueName: "Synthetic East", leagueType: "subleague" }
  ];
  compare.selectedLeagueId = "synthetic-six";
  compare.weeklyLeaderboard = teamFantasyGameDayBuildWeeklyLeaderboard_(compare);

  var usageRows = ['''
    if needle2 not in text: raise RuntimeError('Could not extend synthetic lab with league/weekly leaderboard')
    text = text.replace(needle2, repl2, 1)

    needle3 = '    { name: "League rank and record are attached", passed: compare.competitors.every(function(c){ return Number(c.leagueRank || 0) >= 1 && c.record; }), detail: "Each fake team has league rank + W-L-T" },\n'
    add3 = needle3 + '''    { name: "Weekly league race ranks all six teams", passed: compare.weeklyLeaderboard && compare.weeklyLeaderboard.rows && compare.weeklyLeaderboard.rows.length === 6 && compare.weeklyLeaderboard.rows[0].weekRank === 1, detail: "Weekly leaderboard uses accumulated live points" },
    { name: "Points-behind and move-up math is available", passed: compare.weeklyLeaderboard && compare.weeklyLeaderboard.rows.slice(1).every(function(r){ return Number(r.pointsBehindLeader || 0) >= 0 && Number(r.pointsToMoveUp || 0) > 0; }), detail: "Behind leader + exact pass target calculated" },
    { name: "Complete/subleague switch options are present", passed: compare.leagues && compare.leagues.length === 2 && compare.leagues.some(function(l){ return l.leagueType === "subleague"; }), detail: "Complete League + Synthetic East" },
'''
    if needle3 not in text: raise RuntimeError('Could not extend synthetic checks')
    text = text.replace(needle3, add3, 1)
    path.write_text(text.rstrip() + '\n')


def patch_player(path):
    text = path.read_text()
    if MARKER in text:
        path.write_text(text.rstrip() + '\n'); return
    if 'TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s' not in text:
        raise RuntimeError('Required v1.2.18s player UI marker not found')
    text = text.replace('/* TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s */', '/* TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s */\n/* '+MARKER+' */', 1)
    text = text.replace('team-fantasy.css?v=1218s', 'team-fantasy.css?v=1218t2')

    helpers = r'''function teamFantasyLineupComplete_(lineup) {
  const slots = Array.isArray(lineup && lineup.slots) ? lineup.slots : [];
  return slots.length > 0 && slots.every(function(slot){ return !!slot.pick; });
}

function teamFantasyLineupCollapsed_(lineup) {
  const entryId = lineup && lineup.entry ? lineup.entry.entryId : '';
  window.TEAM_FANTASY_LINEUP_OPEN = window.TEAM_FANTASY_LINEUP_OPEN || {};
  if (window.TEAM_FANTASY_LINEUP_OPEN[entryId] === true) return false;
  if (window.TEAM_FANTASY_LINEUP_OPEN[entryId] === false) return true;
  return teamFantasyLineupComplete_(lineup);
}

function teamFantasyToggleLineup_(entryId) {
  const card = document.querySelector('.tf-lineup-card[data-entry-id="' + String(entryId).replace(/[^a-zA-Z0-9_-]/g, '') + '"]');
  if (!card) return;
  const collapsed = card.classList.toggle('is-collapsed');
  window.TEAM_FANTASY_LINEUP_OPEN = window.TEAM_FANTASY_LINEUP_OPEN || {};
  window.TEAM_FANTASY_LINEUP_OPEN[entryId] = !collapsed;
  const button = card.querySelector('[data-tf-collapse]');
  if (button) button.textContent = collapsed ? 'Show' : 'Hide';
}

function teamFantasyGameDayView_() {
  return window.TEAM_FANTASY_GAME_DAY_VIEW === 'compare' ? 'compare' : 'league';
}

function teamFantasySetGameDayView_(view) {
  window.TEAM_FANTASY_GAME_DAY_VIEW = view === 'compare' ? 'compare' : 'league';
  teamFantasyRenderGameDayIntoMount_();
}

function teamFantasyGameDayLeaguePicker_(data) {
  const leagues = Array.isArray(data && data.leagues) ? data.leagues : [];
  if (!leagues.length) return '';
  const selected = data.selectedLeagueId || data.leagueId || leagues[0].leagueId;
  return `<label class="tf-week-league-picker"><span>League</span><select onchange="teamFantasyGameDaySelectLeague_(this.value)">${leagues.map(function(league){ return `<option value="${teamFantasyEscape_(league.leagueId)}" ${league.leagueId===selected?'selected':''}>${teamFantasyEscape_(league.leagueName || (league.leagueType==='complete'?'Complete League':'League'))}</option>`; }).join('')}</select></label>`;
}

async function teamFantasyGameDaySelectLeague_(leagueId) {
  const state = window.TEAM_FANTASY_STATE || {};
  const mount = document.getElementById('tfGameDayMount');
  if (mount) mount.innerHTML = '<div class="tf-muted">Loading league…</div>';
  try {
    const res = await api('getTeamFantasyGameDayState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: state.week, leagueId: leagueId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not load league.');
    window.TEAM_FANTASY_GAME_DAY = res;
    state.selectedLeagueId = res.selectedLeagueId || leagueId;
    teamFantasyRenderGameDayIntoMount_();
  } catch (err) {
    if (mount) mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Could not load league.')}</div>`;
  }
}

function teamFantasyRenderWeeklyLeague_(data) {
  const board = data && data.weeklyLeaderboard ? data.weeklyLeaderboard : { rows: [] };
  const rows = Array.isArray(board.rows) ? board.rows : [];
  if (!rows.length) return `<div class="tf-muted">No weekly league points yet.</div>`;
  return `<div class="tf-week-board">${rows.map(function(row){
    const counts = row.counts || { final:0, live:0, upcoming:0 };
    const record = row.record || { wins:0, losses:0, ties:0 };
    const behind = Number(row.pointsBehindLeader || 0);
    const move = Number(row.pointsToMoveUp || 0);
    const cushion = Number(row.cushionOverBelow || 0);
    const gap = Number(row.weekRank||0) === 1 ? 'Leader' : `${teamFantasyScore_(behind)} behind · ${teamFantasyScore_(move)} to #${Number(row.moveUpRank||1)}`;
    const lower = Number(row.belowRank||0) > 0 ? `${teamFantasyScore_(cushion)} cushion` : '—';
    return `<div class="tf-week-row ${row.isViewer?'is-you':''}"><div class="tf-week-rank">#${Number(row.weekRank||0)}</div><div class="tf-week-name"><strong>${teamFantasyEscape_(row.label || row.entryId)}</strong>${row.isViewer?'<span class="tf-you-badge">YOU</span>':''}<span class="tf-week-record">${Number(record.wins||0)}-${Number(record.losses||0)}-${Number(record.ties||0)}</span></div><div class="tf-week-points">${teamFantasyScore_(row.points)}<span>pts</span></div><div class="tf-week-counts"><span class="is-final">${Number(counts.final||0)}F</span><span class="is-live">${Number(counts.live||0)}L</span><span class="is-upcoming">${Number(counts.upcoming||0)}U</span></div><div class="tf-week-gap">${teamFantasyEscape_(gap)}<span>${teamFantasyEscape_(lower)}</span></div></div>`;
  }).join('')}</div>`;
}

function teamFantasyCompareAddTeam_(entryId) {
  const data = window.TEAM_FANTASY_GAME_DAY || {};
  const selected = teamFantasyCompareDefaultSelection_(data).slice();
  if (selected.indexOf(entryId) === -1 && selected.length < 6) selected.push(entryId);
  window.TEAM_FANTASY_COMPARE_SELECTED = selected;
  window.TEAM_FANTASY_COMPARE_ADD_OPEN = false;
  teamFantasyRenderGameDayIntoMount_();
}

function teamFantasyCompareRemoveTeam_(entryId) {
  const data = window.TEAM_FANTASY_GAME_DAY || {};
  let selected = teamFantasyCompareDefaultSelection_(data).filter(function(id){ return id !== entryId; });
  const viewer = (data.competitors || []).filter(function(c){ return c.isViewer; })[0];
  if (viewer && selected.indexOf(viewer.entryId) === -1) selected.unshift(viewer.entryId);
  if (selected.length < 2) {
    const other = (data.competitors || []).filter(function(c){ return selected.indexOf(c.entryId) === -1; })[0];
    if (other) selected.push(other.entryId);
  }
  window.TEAM_FANTASY_COMPARE_SELECTED = selected.slice(0,6);
  teamFantasyRenderGameDayIntoMount_();
}

function teamFantasyToggleAddTeamMenu_() {
  window.TEAM_FANTASY_COMPARE_ADD_OPEN = !window.TEAM_FANTASY_COMPARE_ADD_OPEN;
  teamFantasyRenderGameDayIntoMount_();
}
'''
    text = insert_before_function(text, 'teamFantasyCompareDefaultSelection_', helpers)

    lineup = r'''function teamFantasyRenderLineup_(state, lineup) {
  const entry = lineup.entry || {};
  const settings = state.settings || {};
  const conferenceLabel = entry.conference && entry.conference !== 'ALL' ? entry.conference + ' Entry' : (entry.entryName || 'Entry');
  const safeId = teamFantasySafeDomId_(entry.entryId);
  const complete = teamFantasyLineupComplete_(lineup);
  const collapsed = teamFantasyLineupCollapsed_(lineup);
  return `
    <section class="card tf-lineup-card ${complete?'is-complete':''} ${collapsed?'is-collapsed':''}" data-entry-id="${teamFantasyEscape_(entry.entryId)}">
      <div class="tf-weekly-picks-head">
        <div><h2>Weekly Picks</h2><div class="tf-weekly-picks-sub">${teamFantasyEscape_(conferenceLabel)} · Week ${Number(state.week || 0)}</div></div>
        <button class="tf-collapse-button" data-tf-collapse type="button" onclick="teamFantasyToggleLineup_('${teamFantasyEscape_(entry.entryId)}')">${collapsed?'Show':'Hide'}</button>
      </div>
      <div class="tf-lineup-collapsible">
        <div class="tf-lineup-actions">
          <button class="tf-button secondary" onclick="teamFantasyContinuePicks_('${teamFantasyEscape_(entry.entryId)}')">Continue Picks</button>
          ${settings.allowRandomPick ? `<button class="tf-button secondary" data-tf-fill-button="1" onclick="teamFantasyFill_('${teamFantasyEscape_(entry.entryId)}',true)">Random</button>` : ''}
          ${settings.allowSmartAutoPick ? `<button class="tf-button" data-tf-fill-button="1" onclick="teamFantasyFill_('${teamFantasyEscape_(entry.entryId)}',false)">Auto Pick</button>` : ''}
        </div>
        ${teamFantasyRenderProgress_(lineup)}
        <div id="tfFillProgress_${safeId}" class="tf-fill-progress" hidden aria-live="polite">
          <div class="tf-fill-progress-copy">Building lineup…</div>
          <div class="tf-progress tf-fill-meter"><span></span></div>
        </div>
        <div class="tf-slot-grid">${(lineup.slots || []).map(function(slot) { return teamFantasyRenderSlot_(state, lineup, slot); }).join('')}</div>
      </div>
    </section>`;
}'''
    text = replace_function(text, 'teamFantasyRenderLineup_', lineup)

    board = r'''function teamFantasyRenderCompareBoard_(data, selectedIds) {
  const competitors = Array.isArray(data && data.competitors) ? data.competitors : [];
  const selected = competitors.filter(function(c){ return selectedIds.indexOf(c.entryId) !== -1; });
  if (selected.length < 2) return `<div class="tf-warning">Choose at least 2 teams to compare.</div>`;
  return `<div class="tf-compare-scroll"><div class="tf-compare-board">${selected.map(function(c){
    const record = c.record || { wins:0, losses:0, ties:0 };
    const rank = Number(c.leagueRank || 0) > 0 ? '#' + Number(c.leagueRank) : '#—';
    return `<article class="tf-compare-team"><div class="tf-compare-team-head"><div class="tf-team-head-name"><strong>${teamFantasyEscape_(c.label || c.entryId)}</strong>${c.isViewer?'<span class="tf-you-badge">YOU</span>':''}${!c.isViewer?`<button class="tf-remove-team" type="button" title="Remove" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button>`:''}</div><div class="tf-compare-total">${teamFantasyScore_(c.totalPoints)} pts</div><div class="tf-compare-record">${rank} · ${Number(record.wins||0)}-${Number(record.losses||0)}-${Number(record.ties||0)}</div></div><div class="tf-compare-slots">${(c.slots||[]).map(teamFantasyRenderCompareSlot_).join('')}</div></article>`;
  }).join('')}</div></div>`;
}'''
    text = replace_function(text, 'teamFantasyRenderCompareBoard_', board)

    mount = r'''function teamFantasyRenderGameDayIntoMount_() {
  const mount = document.getElementById('tfGameDayMount');
  const data = window.TEAM_FANTASY_GAME_DAY;
  if (!mount || !data) return;
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  const view = teamFantasyGameDayView_();
  const selected = teamFantasyCompareDefaultSelection_(data);
  const available = competitors.filter(function(c){ return selected.indexOf(c.entryId) === -1; });
  const addMenu = view === 'compare' && window.TEAM_FANTASY_COMPARE_ADD_OPEN && selected.length < 6 ? `<div class="tf-add-team-menu">${available.map(function(c){ return `<button type="button" onclick="teamFantasyCompareAddTeam_('${teamFantasyEscape_(c.entryId)}')">${teamFantasyEscape_(c.label || c.entryId)}</button>`; }).join('') || '<span>No more teams available.</span>'}</div>` : '';
  mount.innerHTML = `<div class="tf-game-day-sticky"><div class="tf-game-day-tabs"><button class="${view==='league'?'is-active':''}" onclick="teamFantasySetGameDayView_('league')">League View</button><button class="${view==='compare'?'is-active':''}" onclick="teamFantasySetGameDayView_('compare')">Compare</button></div>${teamFantasyGameDayLeaguePicker_(data)}<button class="tf-refresh-mini" onclick="teamFantasyLoadGameDay_(true)" title="Refresh cached scores">↻</button></div><div class="tf-mini-status-legend"><span class="is-final"></span>F <span class="is-live"></span>L <span class="is-upcoming"></span>U</div>${view==='league'?teamFantasyRenderWeeklyLeague_(data):`<div class="tf-compare-add-row"><span>${selected.length} team${selected.length===1?'':'s'} selected</span>${selected.length<6?'<button class="tf-button secondary" onclick="teamFantasyToggleAddTeamMenu_()">+ Add Team</button>':''}</div>${addMenu}${competitors.length<2?'<div class="tf-muted">At least two league entries are needed for comparison.</div>':`<div id="tfCompareBoard">${teamFantasyRenderCompareBoard_(data, selected)}</div>`}<div class="tf-muted tf-privacy-note">${teamFantasyEscape_(data.privacy || '')}</div>`}`;
}'''
    text = replace_function(text, 'teamFantasyRenderGameDayIntoMount_', mount)

    page = r'''async function renderTeamFantasyPage() {
  const gameId = typeof getFrontendGameId === 'function' ? getFrontendGameId() : '';
  const leagueId = typeof getFrontendLeagueId === 'function' ? getFrontendLeagueId() : '';
  const username = teamFantasyCurrentUser_();
  if (!gameId || !username) return `<div class="page"><div class="card">Open a Team Fantasy game after signing in.</div></div>`;
  if (typeof setPageLoadStep === 'function') setPageLoadStep(48, 'Loading Team Fantasy lineup…');
  const res = await api('getTeamFantasyState', { gameId: gameId, username: username, leagueId: leagueId });
  if (!res || res.success === false) return `<div class="page tf-page"><div class="card"><h1>Team Fantasy Football</h1><div>${teamFantasyEscape_(res && (res.message || res.error) || 'Could not load Team Fantasy.')}</div></div></div>`;
  window.TEAM_FANTASY_STATE = res;
  setTimeout(function(){ teamFantasyLoadGameDay_(false); }, 60);
  return `<div class="page tf-page">
    <header class="tf-hero card"><div><div class="tf-eyebrow">NFL TEAM FANTASY</div><h1>Week ${Number(res.week || 0)}</h1><p>Team-use limits are tracked <strong>per NFL team, per position, for the season</strong>.</p></div>${teamFantasyLeagueSelect_(res)}</header>
    <div id="teamFantasyStatus" class="tf-status" aria-live="polite"></div>
    ${(res.lineups || []).map(function(lineup) { return teamFantasyRenderLineup_(res, lineup); }).join('')}
    <section class="card tf-game-day-card"><div class="tf-game-day-title"><div><h2>Weekly League</h2><div class="tf-muted">Live weekly race or lineup comparison. Opponent picks stay hidden until kickoff.</div></div></div><div id="tfGameDayMount"><div class="tf-muted">Loading cached game-day scores…</div></div></section>
    ${teamFantasyIsAdmin_() ? `<section class="card tf-test-lab-card"><div class="tf-card-heading"><div><h2>Team Fantasy Test Lab</h2><div class="tf-muted">Six fake players · no Sheet writes · tests privacy, usage limits, weekly race math and game states.</div></div><button class="tf-button" onclick="teamFantasyRunTestLab_()">Run 6-Team Test Lab</button></div><div id="tfTestLabMount" class="tf-test-lab-output"></div></section>` : ''}
  </div>`;
}'''
    text = replace_function(text, 'renderTeamFantasyPage', page)

    lab = r'''async function teamFantasyRunTestLab_() {
  const mount = document.getElementById('tfTestLabMount');
  const state = window.TEAM_FANTASY_STATE || {};
  if (!mount) return;
  mount.innerHTML = '<div class="tf-muted">Running synthetic six-team league…</div>';
  try {
    const res = await api('adminGetTeamFantasyTestLab', { gameId: state.gameId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Test Lab failed.');
    const checks = Array.isArray(res.checks) ? res.checks : [];
    window.TEAM_FANTASY_GAME_DAY_TEST = res.compare || {};
    const testIds = (res.compare && res.compare.competitors || []).slice(0, 6).map(function(c){ return c.entryId; });
    mount.innerHTML = `<div class="tf-test-summary ${res.allPassed?'is-pass':'is-fail'}"><strong>${res.allPassed?'ALL TEST LAB CHECKS PASSED':'TEST LAB FOUND A FAILURE'}</strong><span>${res.writesSheets===false?'No real Team Fantasy rows were written.':''}</span></div><div class="tf-test-checks">${checks.map(function(check){ return `<div class="tf-test-check ${check.passed?'is-pass':'is-fail'}"><strong>${check.passed?'✓':'✕'} ${teamFantasyEscape_(check.name)}</strong><span>${teamFantasyEscape_(check.detail||'')}</span></div>`; }).join('')}</div><h3>Synthetic Weekly League Race</h3>${teamFantasyRenderWeeklyLeague_(res.compare || {})}<h3>Six-Team Synthetic Compare</h3>${teamFantasyRenderCompareBoard_(res.compare || {}, testIds)}<div class="tf-muted">Usage proof: BUF at QB is ${Number(res.usageExample && res.usageExample.QB && res.usageExample.QB.used || 0)}/3 and blocked; BUF at RB is ${Number(res.usageExample && res.usageExample.RB && res.usageExample.RB.used || 0)}/3 and still available.</div>`;
  } catch (err) {
    mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Test Lab failed.')}</div>`;
  }
}'''
    text = replace_function(text, 'teamFantasyRunTestLab_', lab)
    path.write_text(text.rstrip() + '\n')


def patch_css(path):
    text = path.read_text().rstrip() + '\n'
    if CSS_MARKER in text:
        path.write_text(text); return
    css = r'''

/* v1.2.18t2 weekly hub + league race + contrast fix */
.tf-weekly-picks-head{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#0f172a;color:#f8fafc;margin:-10px -10px 8px;padding:9px 10px;border-radius:12px 12px 7px 7px}.tf-weekly-picks-head h2{margin:0;color:#fff!important;font-size:1rem}.tf-weekly-picks-sub{font-size:.7rem;color:#cbd5e1}.tf-collapse-button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;border-radius:8px;min-height:30px;padding:4px 9px;font:inherit;font-size:.72rem}.tf-lineup-card.is-collapsed .tf-lineup-collapsible{display:none}.tf-lineup-card.is-collapsed{padding-bottom:10px}.tf-lineup-card.is-complete .tf-weekly-picks-head{border-bottom:2px solid #16a34a}
.tf-game-day-title{margin-bottom:7px}.tf-game-day-title h2{margin:0}.tf-game-day-sticky{position:sticky;top:0;z-index:8;display:flex;align-items:center;gap:7px;justify-content:space-between;background:#0f172a;color:#f8fafc;padding:7px;border-radius:9px;margin-bottom:5px}.tf-game-day-tabs{display:flex;gap:3px}.tf-game-day-tabs button{border:0;border-radius:7px;background:transparent;color:#cbd5e1;padding:6px 8px;font:inherit;font-size:.72rem;font-weight:800}.tf-game-day-tabs button.is-active{background:#fff;color:#0f172a}.tf-week-league-picker{display:flex;align-items:center;gap:4px;font-size:.67rem}.tf-week-league-picker span{color:#cbd5e1}.tf-week-league-picker select{max-width:150px;min-height:28px;border:1px solid rgba(255,255,255,.25);border-radius:7px;background:#111827;color:#fff;padding:2px 5px;font:inherit;font-size:.68rem}.tf-refresh-mini{border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff;border-radius:7px;min-width:29px;min-height:29px;font-size:1rem}.tf-mini-status-legend{display:flex;align-items:center;gap:3px;font-size:.62rem;opacity:.8;margin:2px 0 5px}.tf-mini-status-legend span{display:inline-block;width:8px;height:8px;border:2px solid #94a3b8;border-radius:2px;margin-left:5px}.tf-mini-status-legend span:first-child{margin-left:0}.tf-mini-status-legend .is-final{border-color:#2563eb}.tf-mini-status-legend .is-live{border-color:#16a34a}.tf-mini-status-legend .is-upcoming{border-color:#94a3b8}
.tf-week-board{display:flex;flex-direction:column;gap:4px}.tf-week-row{display:grid;grid-template-columns:30px minmax(90px,1.6fr) 58px 72px minmax(100px,1fr);align-items:center;gap:5px;border:1px solid rgba(127,127,127,.18);border-radius:8px;padding:5px 6px;background:var(--card-bg,#fff);color:var(--text,#111827)}.tf-week-row.is-you{outline:2px solid rgba(37,99,235,.35)}.tf-week-rank{font-weight:900;font-size:.8rem}.tf-week-name{min-width:0;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.75rem}.tf-week-name strong{overflow:hidden;text-overflow:ellipsis}.tf-week-record{font-size:.58rem;opacity:.65}.tf-week-points{font-size:.85rem;font-weight:900;text-align:right}.tf-week-points span{display:block;font-size:.52rem;opacity:.62}.tf-week-counts{display:flex;justify-content:center;gap:3px;font-size:.61rem;font-weight:850}.tf-week-counts span{border:1px solid #94a3b8;border-radius:5px;padding:2px 3px}.tf-week-counts .is-final{border-color:#2563eb}.tf-week-counts .is-live{border-color:#16a34a}.tf-week-counts .is-upcoming{border-color:#94a3b8}.tf-week-gap{font-size:.62rem;line-height:1.15;text-align:right}.tf-week-gap span{display:block;opacity:.68;margin-top:1px}
.tf-compare-team-head{background:#0f172a!important;color:#f8fafc!important;border-bottom-color:rgba(255,255,255,.2)!important;border-radius:7px 7px 4px 4px;padding-left:5px!important;padding-right:5px!important}.tf-compare-team-head strong,.tf-compare-total,.tf-compare-record{color:inherit!important}.tf-compare-record{opacity:.82}.tf-remove-team{float:right;border:0;background:transparent;color:#cbd5e1;font-size:1rem;line-height:1;padding:0 2px}.tf-compare-add-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 5px;font-size:.7rem}.tf-add-team-menu{display:flex;flex-wrap:wrap;gap:4px;border:1px solid rgba(127,127,127,.2);border-radius:8px;padding:5px;margin-bottom:6px}.tf-add-team-menu button{border:1px solid rgba(127,127,127,.25);border-radius:999px;background:transparent;color:inherit;padding:4px 7px;font:inherit;font-size:.68rem}.tf-status-legend{display:none!important}
@media(max-width:760px){.tf-weekly-picks-head{margin:-10px -10px 6px}.tf-game-day-sticky{top:0;padding:5px;gap:4px}.tf-game-day-tabs button{padding:5px 6px;font-size:.65rem}.tf-week-league-picker span{display:none}.tf-week-league-picker select{max-width:112px;font-size:.62rem}.tf-week-row{grid-template-columns:25px minmax(70px,1.4fr) 47px 62px minmax(78px,1fr);padding:4px;gap:3px}.tf-week-name{font-size:.66rem}.tf-week-record{display:none}.tf-week-points{font-size:.75rem}.tf-week-counts{font-size:.54rem;gap:2px}.tf-week-gap{font-size:.54rem}.tf-game-day-card{padding:8px}.tf-game-day-title{margin-bottom:5px}.tf-game-day-title h2{font-size:1rem}.tf-compare-team-head{min-height:58px}.tf-compare-total{font-size:1rem}.tf-compare-record{font-size:.61rem}}
'''
    path.write_text((text + css).rstrip() + '\n')



def patch_18s_regression_test(path):
    text = path.read_text()
    old = "assert(page.includes('team-fantasy.css?v=1218s'), 'Team Fantasy CSS cache marker must be bumped for 18s.');"
    new = "const teamFantasyCssCacheMatch = page.match(/team-fantasy\\.css\\?v=([A-Za-z0-9._-]+)/);\nassert(teamFantasyCssCacheMatch && teamFantasyCssCacheMatch[1] !== '1218r1', 'Team Fantasy CSS cache marker must remain cache-busted for 18s or a later release.');"
    if new in text:
        path.write_text(text.rstrip() + '\n')
        return
    if old not in text:
        raise RuntimeError('Could not update historical 18s CSS cache regression contract')
    text = text.replace(old, new, 1)
    path.write_text(text.rstrip() + '\n')


def patch_18r1_regression_test(path):
    text = path.read_text()
    old = "assert(page.includes('Compare 2–6 teams'), '2–6 team comparison controls missing.');"
    new = "const teamFantasyCompareSupportsTwoToSix = page.includes('Compare 2–6 teams') || (page.includes('+ Add Team') && page.includes('selected.slice(0,6)') && page.includes('selected.length<6'));\nassert(teamFantasyCompareSupportsTwoToSix, '2–6 team comparison capability missing.');"
    if new in text:
        path.write_text(text.rstrip() + '\n')
        return
    if old not in text:
        raise RuntimeError('Could not update historical 18r1 2–6 comparison regression contract')
    text = text.replace(old, new, 1)
    path.write_text(text.rstrip() + '\n')

def main():
    if len(sys.argv) < 2: raise RuntimeError('Repository path required')
    repo = Path(sys.argv[1]).resolve()
    targets = [repo/'backend/engines/SportsTeamFantasyGameDayEngine.js', repo/'frontend/js/pages/teamFantasy.js', repo/'frontend/css/team-fantasy.css', repo/'tests/team_fantasy_compact_game_day_v1218s_tests.js', repo/'tests/team_fantasy_game_day_v1218r1_tests.js']
    for p in targets:
        if not p.exists(): raise RuntimeError(f'Required file not found: {p}')
    backup = Path(tempfile.mkdtemp(prefix='tf18t2-'))
    try:
        for p in targets:
            rel=p.relative_to(repo); dst=backup/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,dst)
        patch_backend(targets[0]); patch_player(targets[1]); patch_css(targets[2]); patch_18s_regression_test(targets[3]); patch_18r1_regression_test(targets[4])
        print('Team Fantasy v1.2.18t2 Weekly Hub applied.')
        print('- Weekly Picks header has explicit high-contrast styling')
        print('- Completed lineups collapse by default')
        print('- League View shows current weekly race and movement gaps')
        print('- Complete/subleague switch uses game-day data')
        print('- Compare uses one + Add Team flow up to six teams')
        print('- 18s compact picker/ranks/AP-R/status colors preserved')
        print('- Historical 18s CSS cache test now accepts later Team Fantasy cache versions')
        print('- Historical 18r1 compare test accepts + Add Team flow capped at six')
    except Exception:
        for p in targets:
            rel=p.relative_to(repo); src=backup/rel
            if src.exists(): shutil.copy2(src,p)
        raise
    finally:
        shutil.rmtree(backup, ignore_errors=True)

if __name__=='__main__':
    try: main()
    except Exception as e:
        print('ERROR:', e, file=sys.stderr); sys.exit(1)
