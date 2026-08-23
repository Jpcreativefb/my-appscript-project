#!/usr/bin/env python3
from pathlib import Path
import shutil, sys

RELEASE = 'v1.2.18r1'
MARKER = 'v1.2.18r1 game-day compare + synthetic Test Lab'


def find_function(text, name):
    needle = f'function {name}('
    start = text.find(needle)
    if start < 0:
        raise RuntimeError(f'Could not find function {name}')
    # Include an async prefix when the target is declared as `async function`.
    if start >= 6 and text[start-6:start] == 'async ':
        start -= 6
    brace = text.find('{', start)
    if brace < 0:
        raise RuntimeError(f'Could not find opening brace for {name}')
    depth = 0; i = brace
    in_s = in_d = in_t = False; esc = False; line = block = False
    while i < len(text):
        c = text[i]; n = text[i+1] if i+1 < len(text) else ''
        if line:
            if c == '\n': line = False
            i += 1; continue
        if block:
            if c == '*' and n == '/': block = False; i += 2; continue
            i += 1; continue
        if in_s:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == "'": in_s = False
            i += 1; continue
        if in_d:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': in_d = False
            i += 1; continue
        if in_t:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '`': in_t = False
            i += 1; continue
        if c == '/' and n == '/': line = True; i += 2; continue
        if c == '/' and n == '*': block = True; i += 2; continue
        if c == "'": in_s = True; i += 1; continue
        if c == '"': in_d = True; i += 1; continue
        if c == '`': in_t = True; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return start, i + 1
        i += 1
    raise RuntimeError(f'Could not find closing brace for {name}')


def replace_function(text, name, replacement):
    start, end = find_function(text, name)
    return text[:start] + replacement.rstrip() + text[end:]


def function_text(text, name):
    start, end = find_function(text, name)
    return text[start:end]


def patch_core(path):
    text = path.read_text()
    if 'TEAM_FANTASY_GAME_DAY_CORE_PATCH_v1218r1' in text:
        return
    text = text.replace('var TEAM_FANTASY_VERSION = "1.2.18j2";', 'var TEAM_FANTASY_VERSION = "1.2.18r";', 1)

    save = function_text(text, 'teamFantasySavePick_')
    if 'payload._deferFlush' not in save:
        if '  SpreadsheetApp.flush();\n  return { success: true' not in save:
            raise RuntimeError('Could not find Team Fantasy save flush marker')
        save = save.replace('  SpreadsheetApp.flush();\n  return { success: true', '  if (payload._deferFlush !== true) SpreadsheetApp.flush();\n  return { success: true', 1)
        text = replace_function(text, 'teamFantasySavePick_', save)

    auto = function_text(text, 'teamFantasyAutoPick_')
    if '_deferFlush: true' not in auto:
        needle = '        _entries: entries,\n        _schedule: schedule\n      }));'
        repl = '        _entries: entries,\n        _schedule: schedule,\n        _deferFlush: true\n      }));'
        if needle not in auto:
            raise RuntimeError('Could not find Team Fantasy Auto Pick save marker')
        auto = auto.replace(needle, repl, 1)
    if 'TEAM_FANTASY_GAME_DAY_BATCH_FLUSH_v1218r1' not in auto:
        needle = '  return { success: true, random: !!randomOnly, saved: results.length, results: results };'
        repl = '  /* TEAM_FANTASY_GAME_DAY_BATCH_FLUSH_v1218r1 */\n  SpreadsheetApp.flush();\n' + needle
        if needle not in auto:
            raise RuntimeError('Could not find Team Fantasy Auto Pick return marker')
        auto = auto.replace(needle, repl, 1)
    text = replace_function(text, 'teamFantasyAutoPick_', auto)

    trigger = '''function teamFantasySyncTriggerHandler() {
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
}'''
    text = replace_function(text, 'teamFantasySyncTriggerHandler', trigger)

    install = '''function teamFantasyInstallSyncTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "teamFantasySyncTriggerHandler") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("teamFantasySyncTriggerHandler").timeBased().everyMinutes(5).create();
  const status = teamFantasySyncTriggerStatus_();
  if (!status.active) throw new Error("The Team Fantasy 5-minute trigger was not found after installation.");
  return status;
}'''
    text = replace_function(text, 'teamFantasyInstallSyncTrigger_', install)

    admin_install = '''function apiAdminInstallTeamFantasySyncTrigger(payload) {
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
}'''
    text = replace_function(text, 'apiAdminInstallTeamFantasySyncTrigger', admin_install)
    path.write_text(text)


def patch_api(path):
    text = path.read_text()
    if 'getTeamFantasyGameDayState' not in text:
        anchor = '    if (action === "getTeamFantasyState") return json(apiGetTeamFantasyState(params));\n'
        if anchor not in text:
            raise RuntimeError('Could not find Team Fantasy GET API anchor')
        addition = anchor + '    if (action === "getTeamFantasyGameDayState") return json(apiGetTeamFantasyGameDayState(params));\n    if (action === "adminGetTeamFantasyTestLab") return json(apiAdminGetTeamFantasyTestLab(params));\n'
        text = text.replace(anchor, addition, 1)
    path.write_text(text)


def patch_player(path):
    text = path.read_text()
    if 'TEAM_FANTASY_GAME_DAY_UI_v1218r1' in text:
        return
    text = text.replace('TEAM FANTASY FOOTBALL PLAYER PAGE — v1.2.18j', 'TEAM FANTASY FOOTBALL PLAYER PAGE — v1.2.18r1', 1)
    text = text.replace('team-fantasy.css?v=1218j2', 'team-fantasy.css?v=1218r', 2)

    lineup = '''function teamFantasyRenderLineup_(state, lineup) {
  const entry = lineup.entry || {};
  const settings = state.settings || {};
  const conferenceLabel = entry.conference && entry.conference !== 'ALL' ? entry.conference + ' Entry' : (entry.entryName || 'Entry');
  const safeId = teamFantasySafeDomId_(entry.entryId);
  return `
    <section class="card tf-lineup-card" data-entry-id="${teamFantasyEscape_(entry.entryId)}">
      <div class="tf-card-heading">
        <div>
          <h2>${teamFantasyEscape_(conferenceLabel)}</h2>
          <div class="tf-muted">Week ${Number(state.week || 0)} · ${teamFantasyEscape_(state.phase || '')}</div>
        </div>
        <div class="tf-lineup-actions">
          <button class="tf-button secondary" onclick="teamFantasyContinuePicks_('${teamFantasyEscape_(entry.entryId)}')">Continue Picks</button>
          ${settings.allowRandomPick ? `<button class="tf-button secondary" data-tf-fill-button="1" onclick="teamFantasyFill_('${teamFantasyEscape_(entry.entryId)}',true)">Random</button>` : ''}
          ${settings.allowSmartAutoPick ? `<button class="tf-button" data-tf-fill-button="1" onclick="teamFantasyFill_('${teamFantasyEscape_(entry.entryId)}',false)">Auto Pick</button>` : ''}
        </div>
      </div>
      ${teamFantasyRenderProgress_(lineup)}
      <div id="tfFillProgress_${safeId}" class="tf-fill-progress" hidden aria-live="polite">
        <div class="tf-fill-progress-copy">Building lineup…</div>
        <div class="tf-progress tf-fill-meter"><span></span></div>
      </div>
      <div class="tf-slot-grid">
        ${(lineup.slots || []).map(function(slot) { return teamFantasyRenderSlot_(state, lineup, slot); }).join('')}
      </div>
    </section>`;
}'''
    text = replace_function(text, 'teamFantasyRenderLineup_', lineup)

    render = '''async function renderTeamFantasyPage() {
  const gameId = typeof getFrontendGameId === 'function' ? getFrontendGameId() : '';
  const leagueId = typeof getFrontendLeagueId === 'function' ? getFrontendLeagueId() : '';
  const username = teamFantasyCurrentUser_();
  if (!gameId || !username) return `<div class="page"><div class="card">Open a Team Fantasy game after signing in.</div></div>`;
  if (typeof setPageLoadStep === 'function') setPageLoadStep(48, 'Loading Team Fantasy lineup…');
  const res = await api('getTeamFantasyState', { gameId: gameId, username: username, leagueId: leagueId });
  if (!res || res.success === false) {
    return `<div class="page tf-page"><div class="card"><h1>Team Fantasy Football</h1><div>${teamFantasyEscape_(res && (res.message || res.error) || 'Could not load Team Fantasy.')}</div></div></div>`;
  }
  window.TEAM_FANTASY_STATE = res;
  setTimeout(function(){ teamFantasyLoadGameDay_(false); }, 60);
  return `
    <div class="page tf-page">
      <header class="tf-hero card">
        <div><div class="tf-eyebrow">NFL TEAM FANTASY</div><h1>Week ${Number(res.week || 0)}</h1><p>One lineup per entry. Team-use limits are tracked <strong>per NFL team, per position, for the season</strong>.</p></div>
        ${teamFantasyLeagueSelect_(res)}
      </header>
      <div id="teamFantasyStatus" class="tf-status" aria-live="polite"></div>
      ${(res.lineups || []).map(function(lineup) { return teamFantasyRenderLineup_(res, lineup); }).join('')}
      <section class="card tf-game-day-card">
        <div class="tf-card-heading"><div><h2>Compare Lineups</h2><div class="tf-muted">Head-to-head or compare up to 6 teams. Opponent picks stay hidden until their NFL game kicks off.</div></div><button class="tf-button secondary" onclick="teamFantasyLoadGameDay_(true)">Refresh</button></div>
        <div id="tfGameDayMount"><div class="tf-muted">Loading cached game-day scores…</div></div>
      </section>
      ${teamFantasyIsAdmin_() ? `<section class="card tf-test-lab-card"><div class="tf-card-heading"><div><h2>Team Fantasy Test Lab</h2><div class="tf-muted">Six fake players · no Sheet writes · tests privacy, usage limits, totals and game states.</div></div><button class="tf-button" onclick="teamFantasyRunTestLab_()">Run 6-Team Test Lab</button></div><div id="tfTestLabMount" class="tf-test-lab-output"></div></section>` : ''}
      ${teamFantasyRenderStandings_(res.standings, res.phase)}
      ${teamFantasyRenderH2H_(res)}
    </div>`;
}'''
    text = replace_function(text, 'renderTeamFantasyPage', render)

    reload_fn = '''async function teamFantasyReload_(options) {
  options = options || {};
  await navigate('team-fantasy', { skipUnsavedCheck: true, suppressLoader: options.showGlobalLoader === true ? false : true });
}'''
    text = replace_function(text, 'teamFantasyReload_', reload_fn)

    save_slot = '''async function teamFantasySaveSlot_(entryId, position, teamAbbr) {
  if (!teamAbbr) return;
  const state = window.TEAM_FANTASY_STATE || {};
  teamFantasySetStatus_('Saving ' + position + '…', false);
  const res = await apiTeamFantasyPost_('saveTeamFantasyPick', { gameId: state.gameId, week: state.week, entryId: entryId, position: position, teamAbbr: teamAbbr, pickMethod: 'manual' });
  if (!res || res.success === false) {
    teamFantasySetStatus_(res && (res.message || res.error) || 'Could not save that pick.', true);
    return;
  }
  teamFantasySetStatus_('Saved ' + position + '.', false);
  await teamFantasyReload_({ showGlobalLoader: false });
}'''
    text = replace_function(text, 'teamFantasySaveSlot_', save_slot)

    fill = '''async function teamFantasyFill_(entryId, randomOnly) {
  const state = window.TEAM_FANTASY_STATE || {};
  const progress = teamFantasyStartFillProgress_(entryId, randomOnly ? 'Randomizing open positions…' : 'Building ranked Auto Pick lineup…');
  teamFantasySetStatus_(randomOnly ? 'Randomizing open positions…' : 'Building ranked Auto Pick lineup…', false);
  const action = randomOnly ? 'randomTeamFantasyPicks' : 'autoPickTeamFantasy';
  try {
    const res = await apiTeamFantasyPost_(action, { gameId: state.gameId, week: state.week, entryId: entryId });
    if (!res || res.success === false) {
      teamFantasyFinishFillProgress_(progress, res && (res.message || res.error) || 'Could not fill lineup.', true);
      teamFantasySetStatus_(res && (res.message || res.error) || 'Could not fill lineup.', true);
      return;
    }
    const saved = Number(res.saved || 0);
    teamFantasyFinishFillProgress_(progress, 'Saved ' + saved + ' open position' + (saved === 1 ? '' : 's') + '.', false);
    teamFantasySetStatus_('Saved ' + saved + ' open positions.', false);
    await new Promise(function(resolve){ setTimeout(resolve, 250); });
    await teamFantasyReload_({ showGlobalLoader: false });
  } catch (err) {
    teamFantasyFinishFillProgress_(progress, err && err.message ? err.message : 'Could not fill lineup.', true);
    teamFantasySetStatus_(err && err.message ? err.message : 'Could not fill lineup.', true);
  }
}'''
    text = replace_function(text, 'teamFantasyFill_', fill)

    helpers = r'''

/* TEAM_FANTASY_GAME_DAY_UI_v1218r1 */
function teamFantasySafeDomId_(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-');
}

function teamFantasyIsAdmin_() {
  try {
    if (typeof isCurrentUserAdmin === 'function') return isCurrentUserAdmin() === true;
    if (typeof isAdminSession === 'function' && typeof getSession === 'function') return isAdminSession(getSession()) === true;
  } catch (err) {}
  return false;
}

function teamFantasySetFillButtons_(entryId, disabled) {
  const card = document.querySelector('.tf-lineup-card[data-entry-id="' + String(entryId).replace(/[^a-zA-Z0-9_-]/g, '') + '"]');
  if (!card) return;
  card.querySelectorAll('[data-tf-fill-button="1"]').forEach(function(button){ button.disabled = !!disabled; });
}

function teamFantasyStartFillProgress_(entryId, message) {
  const id = 'tfFillProgress_' + teamFantasySafeDomId_(entryId);
  const el = document.getElementById(id);
  teamFantasySetFillButtons_(entryId, true);
  if (!el) return { entryId: entryId, el: null };
  el.hidden = false;
  const copy = el.querySelector('.tf-fill-progress-copy');
  if (copy) copy.textContent = message || 'Building lineup…';
  return { entryId: entryId, el: el };
}

function teamFantasyFinishFillProgress_(progress, message, error) {
  if (!progress) return;
  teamFantasySetFillButtons_(progress.entryId, false);
  if (!progress.el) return;
  const copy = progress.el.querySelector('.tf-fill-progress-copy');
  if (copy) copy.textContent = message || '';
  progress.el.classList.toggle('is-error', !!error);
  progress.el.classList.toggle('is-complete', !error);
}

function teamFantasyStatusLabel_(status) {
  if (status === 'live') return 'LIVE';
  if (status === 'final') return 'FINAL';
  if (status === 'upcoming') return 'UPCOMING';
  return String(status || '').toUpperCase();
}

function teamFantasyCompareDefaultSelection_(data) {
  const competitors = Array.isArray(data && data.competitors) ? data.competitors : [];
  let ids = Array.isArray(window.TEAM_FANTASY_COMPARE_SELECTED) ? window.TEAM_FANTASY_COMPARE_SELECTED.slice() : [];
  ids = ids.filter(function(id){ return competitors.some(function(c){ return c.entryId === id; }); }).slice(0, 6);
  if (ids.length < 2) {
    ids = [];
    const own = competitors.filter(function(c){ return c.isViewer; });
    const other = competitors.filter(function(c){ return !c.isViewer; });
    if (own[0]) ids.push(own[0].entryId);
    if (other[0]) ids.push(other[0].entryId);
    competitors.forEach(function(c){ if (ids.length < 2 && ids.indexOf(c.entryId) === -1) ids.push(c.entryId); });
  }
  window.TEAM_FANTASY_COMPARE_SELECTED = ids;
  return ids;
}

function teamFantasyRenderCompareSlot_(slot) {
  const status = slot && slot.status ? slot.status : 'upcoming';
  const label = slot && slot.label ? slot.label : '';
  if (slot && slot.hidden) {
    return `<div class="tf-compare-slot is-${teamFantasyEscape_(status)}"><div class="tf-compare-pos">${teamFantasyEscape_(label)}</div><div class="tf-hidden-pick">🔒</div><div class="tf-compare-small">Hidden until kickoff</div><div class="tf-status-badge">${teamFantasyEscape_(teamFantasyStatusLabel_(status))}</div></div>`;
  }
  if (!slot || slot.empty || !slot.teamAbbr) {
    return `<div class="tf-compare-slot is-upcoming"><div class="tf-compare-pos">${teamFantasyEscape_(label)}</div><div class="tf-empty-logo">—</div><div class="tf-compare-small">No pick yet</div><div class="tf-status-badge">UPCOMING</div></div>`;
  }
  return `<div class="tf-compare-slot is-${teamFantasyEscape_(status)}"><div class="tf-compare-pos">${teamFantasyEscape_(label)}</div><img class="tf-team-logo" src="${teamFantasyEscape_(slot.logoUrl || '')}" alt="${teamFantasyEscape_(slot.teamAbbr)}" onerror="this.style.visibility='hidden'"><strong class="tf-team-abbr">${teamFantasyEscape_(slot.teamAbbr)}</strong><div class="tf-slot-points">${teamFantasyScore_(slot.fantasyPoints)} pts</div><div class="tf-status-badge">${teamFantasyEscape_(teamFantasyStatusLabel_(status))}</div></div>`;
}

function teamFantasyRenderCompareBoard_(data, selectedIds) {
  const competitors = Array.isArray(data && data.competitors) ? data.competitors : [];
  const selected = competitors.filter(function(c){ return selectedIds.indexOf(c.entryId) !== -1; });
  if (selected.length < 2) return `<div class="tf-warning">Choose at least 2 teams to compare.</div>`;
  return `<div class="tf-compare-scroll"><div class="tf-compare-board">${selected.map(function(c){
    const counts = c.counts || {};
    return `<article class="tf-compare-team"><div class="tf-compare-team-head"><strong>${teamFantasyEscape_(c.label || c.entryId)}</strong>${c.isViewer ? '<span class="tf-you-badge">YOU</span>' : ''}<div class="tf-compare-total">${teamFantasyScore_(c.totalPoints)} pts</div><div class="tf-compare-small">${Number(counts.final||0)} Final · ${Number(counts.live||0)} Live · ${Number(counts.upcoming||0)} Upcoming</div></div><div class="tf-compare-slots">${(c.slots||[]).map(teamFantasyRenderCompareSlot_).join('')}</div></article>`;
  }).join('')}</div></div>`;
}

function teamFantasyRenderGameDayIntoMount_() {
  const mount = document.getElementById('tfGameDayMount');
  const data = window.TEAM_FANTASY_GAME_DAY;
  if (!mount || !data) return;
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  if (competitors.length < 2) {
    mount.innerHTML = `<div class="tf-muted">At least two league entries are needed for live comparison. Use the Test Lab below to prove the 2–6 team view now.</div>`;
    return;
  }
  const selected = teamFantasyCompareDefaultSelection_(data);
  mount.innerHTML = `<div class="tf-compare-controls"><div><strong>Compare 2–6 teams</strong><div class="tf-muted">Cached fantasy points refresh every 5 minutes on game day.</div></div><div class="tf-action-row"><button class="tf-button secondary" onclick="teamFantasyComparePreset_(2)">Head-to-Head</button><button class="tf-button secondary" onclick="teamFantasyComparePreset_(6)">Up to 6</button></div></div><div class="tf-compare-picker">${competitors.map(function(c){ return `<label class="tf-compare-choice"><input type="checkbox" value="${teamFantasyEscape_(c.entryId)}" ${selected.indexOf(c.entryId)!==-1?'checked':''} onchange="teamFantasyCompareToggle_(this)"><span>${teamFantasyEscape_(c.label || c.entryId)}</span></label>`; }).join('')}</div><div id="tfCompareBoard">${teamFantasyRenderCompareBoard_(data, selected)}</div><div class="tf-muted tf-privacy-note">${teamFantasyEscape_(data.privacy || '')}</div>`;
}

function teamFantasyCompareToggle_(checkbox) {
  const mount = document.getElementById('tfGameDayMount');
  if (!mount) return;
  let checked = Array.from(mount.querySelectorAll('.tf-compare-choice input:checked'));
  if (checked.length > 6) {
    checkbox.checked = false;
    teamFantasySetStatus_('You can compare up to 6 teams at once.', true);
    checked = Array.from(mount.querySelectorAll('.tf-compare-choice input:checked'));
  }
  window.TEAM_FANTASY_COMPARE_SELECTED = checked.map(function(el){ return el.value; });
  const board = document.getElementById('tfCompareBoard');
  if (board) board.innerHTML = teamFantasyRenderCompareBoard_(window.TEAM_FANTASY_GAME_DAY || {}, window.TEAM_FANTASY_COMPARE_SELECTED);
}

function teamFantasyComparePreset_(count) {
  const data = window.TEAM_FANTASY_GAME_DAY || {};
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  const own = competitors.filter(function(c){ return c.isViewer; });
  const others = competitors.filter(function(c){ return !c.isViewer; });
  const ordered = own.concat(others).concat(competitors).filter(function(c, i, arr){ return arr.findIndex(function(x){ return x.entryId === c.entryId; }) === i; });
  window.TEAM_FANTASY_COMPARE_SELECTED = ordered.slice(0, Math.min(Number(count||2), 6)).map(function(c){ return c.entryId; });
  teamFantasyRenderGameDayIntoMount_();
}

async function teamFantasyLoadGameDay_(manual) {
  const state = window.TEAM_FANTASY_STATE || {};
  const mount = document.getElementById('tfGameDayMount');
  if (!state.gameId || !mount) return;
  if (manual) mount.innerHTML = '<div class="tf-muted">Refreshing cached game-day scores…</div>';
  try {
    const res = await api('getTeamFantasyGameDayState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: state.week, leagueId: state.selectedLeagueId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not load game-day comparison.');
    window.TEAM_FANTASY_GAME_DAY = res;
    teamFantasyRenderGameDayIntoMount_();
    teamFantasyStartGameDayPolling_(Number(res.pollAfterMs || 300000));
  } catch (err) {
    mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Could not load game-day comparison.')}</div>`;
  }
}

function teamFantasyStartGameDayPolling_(delay) {
  if (window.TEAM_FANTASY_GAME_DAY_TIMER) clearInterval(window.TEAM_FANTASY_GAME_DAY_TIMER);
  delay = Math.max(60000, Number(delay || 300000));
  window.TEAM_FANTASY_GAME_DAY_TIMER = setInterval(function(){
    if (String(window.location.hash || '').indexOf('team-fantasy') === -1) {
      clearInterval(window.TEAM_FANTASY_GAME_DAY_TIMER);
      window.TEAM_FANTASY_GAME_DAY_TIMER = null;
      return;
    }
    teamFantasyLoadGameDay_(false);
  }, delay);
}

async function teamFantasyRunTestLab_() {
  const mount = document.getElementById('tfTestLabMount');
  const state = window.TEAM_FANTASY_STATE || {};
  if (!mount) return;
  mount.innerHTML = '<div class="tf-muted">Running synthetic six-team league…</div>';
  try {
    const res = await api('adminGetTeamFantasyTestLab', { gameId: state.gameId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Test Lab failed.');
    const checks = Array.isArray(res.checks) ? res.checks : [];
    const testIds = (res.compare && res.compare.competitors || []).slice(0, 6).map(function(c){ return c.entryId; });
    mount.innerHTML = `<div class="tf-test-summary ${res.allPassed?'is-pass':'is-fail'}"><strong>${res.allPassed?'ALL TEST LAB CHECKS PASSED':'TEST LAB FOUND A FAILURE'}</strong><span>${res.writesSheets===false?'No real Team Fantasy rows were written.':''}</span></div><div class="tf-test-checks">${checks.map(function(check){ return `<div class="tf-test-check ${check.passed?'is-pass':'is-fail'}"><strong>${check.passed?'✓':'✕'} ${teamFantasyEscape_(check.name)}</strong><span>${teamFantasyEscape_(check.detail||'')}</span></div>`; }).join('')}</div><h3>Six-Team Synthetic Game Day</h3>${teamFantasyRenderCompareBoard_(res.compare || {}, testIds)}<div class="tf-muted">Usage proof: BUF at QB is ${Number(res.usageExample && res.usageExample.QB && res.usageExample.QB.used || 0)}/3 and blocked; BUF at RB is ${Number(res.usageExample && res.usageExample.RB && res.usageExample.RB.used || 0)}/3 and still available.</div>`;
  } catch (err) {
    mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Test Lab failed.')}</div>`;
  }
}
'''
    text = (text.rstrip() + helpers).rstrip() + '\n'
    path.write_text(text)


def patch_admin(path):
    text = path.read_text()
    text = text.replace('Install 15-min Sync', 'Install / Update 5-min Sync')
    text = text.replace('15-minute Team Fantasy sync', '5-minute Team Fantasy game-day sync')
    text = text.replace('15-minute sync installed and verified', '5-minute game-day sync installed and verified')
    path.write_text(text)


def patch_css(path):
    text = path.read_text()
    if MARKER in text: return
    addition = r'''

/* v1.2.18r1 game-day compare + synthetic Test Lab */
.tf-fill-progress{margin:12px 0;padding:10px 12px;border:1px solid rgba(127,127,127,.24);border-radius:10px}.tf-fill-progress-copy{font-weight:750;margin-bottom:6px}.tf-fill-meter span{width:38%;animation:tfFillSweep 1.15s ease-in-out infinite}.tf-fill-progress.is-complete .tf-fill-meter span{width:100%;animation:none}.tf-fill-progress.is-error{border-color:#b42318}@keyframes tfFillSweep{0%{transform:translateX(-110%)}50%{transform:translateX(80%)}100%{transform:translateX(240%)}}
.tf-game-day-card{overflow:hidden}.tf-compare-controls{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}.tf-compare-picker{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}.tf-compare-choice{display:flex;align-items:center;gap:6px;border:1px solid rgba(127,127,127,.25);border-radius:999px;padding:6px 10px;font-size:.86rem}.tf-compare-scroll{overflow-x:auto;padding-bottom:6px}.tf-compare-board{display:flex;gap:10px;min-width:max-content}.tf-compare-team{width:190px;border:1px solid rgba(127,127,127,.25);border-radius:13px;padding:10px;background:var(--card-bg,transparent)}.tf-compare-team-head{min-height:92px}.tf-compare-total{font-size:1.35rem;font-weight:850;margin-top:5px}.tf-compare-small{font-size:.72rem;opacity:.72;line-height:1.2}.tf-you-badge,.tf-status-badge{font-size:.62rem;font-weight:850;letter-spacing:.05em;border:1px solid currentColor;border-radius:999px;padding:2px 5px;margin-left:5px}.tf-compare-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.tf-compare-slot{position:relative;min-height:112px;border:2px solid #94a3b8;border-radius:10px;padding:7px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.tf-compare-slot.is-live{border-color:#22c55e}.tf-compare-slot.is-final{border-color:#64748b;opacity:.88}.tf-compare-slot.is-upcoming{border-color:#94a3b8;border-style:dashed}.tf-compare-pos{position:absolute;top:5px;left:6px;font-size:.65rem;font-weight:850}.tf-team-logo{width:36px;height:36px;object-fit:contain;margin-top:10px}.tf-team-abbr{font-size:.76rem}.tf-slot-points{font-size:.72rem;font-weight:800}.tf-status-badge{margin:1px 0 0;font-size:.54rem}.tf-hidden-pick,.tf-empty-logo{font-size:1.45rem;margin-top:12px}.tf-privacy-note{margin-top:10px}.tf-test-lab-output{margin-top:12px}.tf-test-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px;border-radius:10px;margin-bottom:10px}.tf-test-summary.is-pass{border:1px solid #22c55e}.tf-test-summary.is-fail{border:1px solid #b42318}.tf-test-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:14px}.tf-test-check{border:1px solid rgba(127,127,127,.24);border-radius:9px;padding:8px;display:flex;flex-direction:column;gap:3px}.tf-test-check.is-pass strong{color:#15803d}.tf-test-check.is-fail strong{color:#b42318}.tf-test-check span{font-size:.75rem;opacity:.75}
@media(max-width:760px){.tf-compare-controls{flex-direction:column}.tf-compare-team{width:164px}.tf-compare-slots{grid-template-columns:1fr}.tf-test-checks{grid-template-columns:1fr}.tf-test-summary{align-items:flex-start;flex-direction:column}}
'''
    path.write_text((text.rstrip() + addition).rstrip() + '\n')



def patch_legacy_j2_test(path):
    text = path.read_text()
    old = 'assert(engine.includes(\'TEAM_FANTASY_VERSION = "1.2.18j2"\'), \'engine version marker missing\');'
    new = 'assert(engine.includes(\'TEAM_FANTASY_VERSION = "1.2.18r"\'), \'current Team Fantasy engine version marker missing\');'
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise RuntimeError('Could not update j2 version regression contract')
    old = 'assert(engine.includes(\'The Team Fantasy 15-minute trigger was not found after installation.\'), \'trigger install is not verified\');'
    new = 'assert(engine.includes(\'The Team Fantasy 5-minute trigger was not found after installation.\'), \'5-minute trigger install is not verified\');'
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise RuntimeError('Could not update j2 trigger cadence regression contract')
    old = 'assert(admin.includes(\'15-minute sync installed and verified\'), \'trigger verification success message missing\');'
    new = 'assert(admin.includes(\'5-minute game-day sync installed and verified\'), \'5-minute trigger verification success message missing\');'
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise RuntimeError('Could not update j2 admin trigger regression contract')
    path.write_text(text)

def main():
    if len(sys.argv) < 2: raise RuntimeError('Repository root argument is required.')
    repo = Path(sys.argv[1]).resolve()
    package = Path(__file__).resolve().parents[1]
    required = [
        repo/'backend/engines/SportsTeamFantasyEngine.js', repo/'backend/Api.js',
        repo/'frontend/js/pages/teamFantasy.js', repo/'frontend/js/pages/adminTeamFantasy.js', repo/'frontend/css/team-fantasy.css',
        repo/'tests/team_fantasy_admin_controls_v1218j2_tests.js'
    ]
    for p in required:
        if not p.exists(): raise RuntimeError(f'Required file not found: {p}')
    game_day_src = package/'backend/engines/SportsTeamFantasyGameDayEngine.js'
    if not game_day_src.exists(): raise RuntimeError('Package is missing SportsTeamFantasyGameDayEngine.js')
    game_day_dst = repo/'backend/engines/SportsTeamFantasyGameDayEngine.js'
    originals = {p: p.read_bytes() for p in required}
    game_day_existed = game_day_dst.exists()
    game_day_original = game_day_dst.read_bytes() if game_day_existed else None
    try:
        shutil.copy2(game_day_src, game_day_dst)
        patch_core(repo/'backend/engines/SportsTeamFantasyEngine.js')
        patch_api(repo/'backend/Api.js')
        patch_player(repo/'frontend/js/pages/teamFantasy.js')
        patch_admin(repo/'frontend/js/pages/adminTeamFantasy.js')
        patch_css(repo/'frontend/css/team-fantasy.css')
        patch_legacy_j2_test(repo/'tests/team_fantasy_admin_controls_v1218j2_tests.js')
    except Exception:
        for target, content in originals.items():
            target.write_bytes(content)
        if game_day_existed:
            game_day_dst.write_bytes(game_day_original)
        elif game_day_dst.exists():
            game_day_dst.unlink()
        raise
    print('Team Fantasy v1.2.18r1 game-day + Test Lab applied.')
    print('- Synthetic 6-team Test Lab writes no Team Fantasy Sheet rows')
    print('- 2–6 team live comparison uses cached Team Fantasy scores')
    print('- Opponent picks remain hidden until kickoff')
    print('- Auto/Random Pick uses inline progress and one final flush')
    print('- Sync installer now installs a 5-minute, game-window-gated trigger')

if __name__ == '__main__':
    try: main()
    except Exception as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
