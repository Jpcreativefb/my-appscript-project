#!/usr/bin/env python3
from pathlib import Path
import sys

UI_MARKER = 'TEAM_FANTASY_COMPARE_RESTORE_UI_v1218v3'
PREVIOUS_UI_MARKER = 'TEAM_FANTASY_COMPARE_RESTORE_UI_v1218v2'
BASE_UI_MARKER = 'TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'
CSS_MARKER = 'v1.2.18v3 compare restore + frozen viewer header repair'


def function_bounds(text, name):
    candidates = [f'function {name}(', f'async function {name}(']
    starts = [text.find(c) for c in candidates if text.find(c) >= 0]
    if not starts:
        raise RuntimeError(f'Could not find function {name}')
    start = min(starts)
    brace = text.find('{', start)
    if brace < 0:
        raise RuntimeError(f'Could not find opening brace for {name}')
    depth = 0
    i = brace
    mode = 'code'
    escaped = False
    template_returns = []
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if mode == 'line_comment':
            if c == '\n': mode = 'code'
            i += 1; continue
        if mode == 'block_comment':
            if c == '*' and n == '/': mode = 'code'; i += 2
            else: i += 1
            continue
        if mode in ('single','double'):
            quote = "'" if mode == 'single' else '"'
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: mode = 'code'
            i += 1; continue
        if mode == 'template':
            if escaped: escaped = False; i += 1; continue
            if c == '\\': escaped = True; i += 1; continue
            if c == '`': mode = 'code'; i += 1; continue
            if c == '$' and n == '{':
                depth += 1; template_returns.append(depth - 1); mode = 'code'; i += 2; continue
            i += 1; continue
        if c == '/' and n == '/': mode = 'line_comment'; i += 2; continue
        if c == '/' and n == '*': mode = 'block_comment'; i += 2; continue
        if c == "'": mode = 'single'; escaped = False; i += 1; continue
        if c == '"': mode = 'double'; escaped = False; i += 1; continue
        if c == '`': mode = 'template'; escaped = False; i += 1; continue
        if c == '{': depth += 1; i += 1; continue
        if c == '}':
            depth -= 1; i += 1
            if template_returns and depth == template_returns[-1]:
                template_returns.pop(); mode = 'template'; continue
            if depth == 0: return start, i
            continue
        i += 1
    raise RuntimeError(f'Could not find closing brace for {name}')


def replace_function(text, name, replacement):
    start, end = function_bounds(text, name)
    return text[:start] + replacement.rstrip() + text[end:]


GAME_DAY_MOUNT = r'''function teamFantasyRenderGameDayIntoMount_() {
  const mount = document.getElementById('tfGameDayMount');
  const data = window.TEAM_FANTASY_GAME_DAY;
  if (!mount || !data) return;
  const view = window.TEAM_FANTASY_GAME_DAY_VIEW || 'league';
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  const selected = teamFantasyCompareDefaultSelection_(data);
  const available = competitors.filter(function(c){ return selected.indexOf(c.entryId) === -1; });
  const addMenu = view === 'compare' && window.TEAM_FANTASY_COMPARE_ADD_OPEN && selected.length < 6 ? `<div class="tf-add-team-menu">${available.map(function(c){ return `<button type="button" onclick="teamFantasyCompareAddTeam_('${teamFantasyEscape_(c.entryId)}')">${teamFantasyEscape_(c.label || c.entryId)}</button>`; }).join('') || '<span>No more teams available.</span>'}</div>` : '';
  mount.innerHTML = `<div class="tf-game-day-sticky"><div class="tf-game-day-tabs"><button class="${view==='league'?'is-active':''}" onclick="teamFantasySetGameDayView_('league')">Weekly Standings</button><button class="${view==='compare'?'is-active':''}" onclick="teamFantasySetGameDayView_('compare')">Compare</button></div><div class="tf-game-day-filters">${teamFantasyGameDayLeaguePicker_(data)}${teamFantasyGameDayWeekPicker_(data)}</div><button class="tf-refresh-mini" onclick="teamFantasyLoadGameDay_(true)" title="Refresh cached scores">↻</button></div><div class="tf-mini-status-legend"><span class="is-final"></span>F <span class="is-live"></span>L <span class="is-upcoming"></span>U</div>${view==='league'?teamFantasyRenderWeeklyLeague_(data):`<div class="tf-compare-add-row"><span>${selected.length} team${selected.length===1?'':'s'} selected</span>${selected.length<6?'<button class="tf-button secondary" onclick="teamFantasyToggleAddTeamMenu_()">+ Add Team</button>':''}</div>${addMenu}${competitors.length<2?'<div class="tf-muted">At least two league entries are needed for comparison.</div>':`<div id="tfCompareBoard">${teamFantasyRenderCompareBoard_(data, selected)}</div>`}<div class="tf-muted tf-privacy-note">${teamFantasyEscape_(data.privacy || '')}</div>`}`;
}'''

CSS = r'''
/* v1.2.18v3 compare restore + frozen viewer header repair */
.tf-compare-scroll{position:relative;isolation:isolate;overflow-x:auto!important}.tf-compare-team{position:relative;z-index:1}.tf-compare-team-head{position:sticky!important;top:0!important;z-index:8!important}.tf-compare-team.is-viewer{position:sticky!important;left:0!important;z-index:20!important}.tf-compare-team.is-viewer .tf-compare-team-head{position:sticky!important;left:0!important;top:0!important;z-index:30!important;background:#0f172a!important;isolation:isolate}.tf-compare-team.is-viewer .tf-compare-slots{position:relative;z-index:21;background:#0b1f3a}.tf-compare-team:not(.is-viewer) .tf-compare-team-head{z-index:8!important}
'''


def patch_page(path):
    text = path.read_text()
    if BASE_UI_MARKER not in text:
        raise RuntimeError('Required v1.2.18v1 Weekly Picks marker is missing.')

    if UI_MARKER not in text:
        if PREVIOUS_UI_MARKER in text:
            text = text.replace(PREVIOUS_UI_MARKER, UI_MARKER, 1)
        else:
            text = text.replace('/* ' + BASE_UI_MARKER + ' */', '/* ' + BASE_UI_MARKER + ' */\n/* ' + UI_MARKER + ' */', 1)

    for old in ('team-fantasy.css?v=1218v1', 'team-fantasy.css?v=1218v2'):
        if old in text:
            text = text.replace(old, 'team-fantasy.css?v=1218v3', 1)
            break
    if 'team-fantasy.css?v=1218v3' not in text:
        raise RuntimeError('Could not update Team Fantasy CSS cache marker to v1.2.18v3.')

    text = replace_function(text, 'teamFantasyRenderGameDayIntoMount_', GAME_DAY_MOUNT)

    retired_desc = 'Live weekly standings. Use the Week selector to review past results.'
    restored_desc = 'Weekly standings and lineup comparison. Opponent picks stay hidden until kickoff.'
    if retired_desc in text:
        text = text.replace(retired_desc, restored_desc, 1)
    elif restored_desc not in text:
        # Older u1 wording is also acceptable as an upgrade source.
        older = 'Live weekly race or lineup comparison. Opponent picks stay hidden until kickoff.'
        if older in text:
            text = text.replace(older, restored_desc, 1)
        else:
            raise RuntimeError('Could not restore Weekly Standings/Compare description.')
    return text.rstrip() + '\n'


def patch_css(path):
    text = path.read_text().rstrip() + '\n'
    if CSS_MARKER not in text:
        text = text.rstrip() + '\n' + CSS.strip() + '\n'
    return text


def patch_v1_test(path):
    text = path.read_text()

    old_cache = "assert(page.includes('team-fantasy.css?v=1218v1'), '18v1 CSS cache marker missing');"
    if old_cache in text:
        text = text.replace(old_cache, "const v1CssCache = page.match(/team-fantasy\\.css\\?v=([A-Za-z0-9._-]+)/);\nassert(v1CssCache && !['1218r1','1218s','1218t2','1218u1'].includes(v1CssCache[1]), '18v1-or-later CSS cache marker missing');", 1)
    elif 'v1CssCache' not in text:
        raise RuntimeError('Could not update v1 CSS cache test.')

    retired = "assert(!gameDay.includes('>Compare<'), 'Player-facing Compare tab must be retired');\nassert(!gameDay.includes('+ Add Team'), 'Player-facing Add Team compare control must be retired');"
    restored = "assert(gameDay.includes('>Compare<'), 'Player-facing Compare tab must remain available');\nassert(gameDay.includes('+ Add Team'), 'Player-facing Add Team compare control must remain available');\nassert(gameDay.includes('teamFantasyRenderCompareBoard_'), 'Compare board renderer must remain wired');"
    if retired in text:
        text = text.replace(retired, restored, 1)
    elif 'Player-facing Compare tab must remain available' not in text:
        raise RuntimeError('Could not update v1 Compare test.')

    historical = "assert(historicalR1.includes('Run Team Fantasy Test Lab') && historicalR1.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'), 'Historical 18r1 Test Lab/Compare regression was not updated for intentional 18v1 player-view retirement');"
    if historical in text:
        text = text.replace(historical, "assert(historicalR1.includes('Run Team Fantasy Test Lab'), 'Admin Test Lab compatibility must remain available while Compare is restored');", 1)
    return text.rstrip() + '\n'


def main():
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    page = repo / 'frontend/js/pages/teamFantasy.js'
    css = repo / 'frontend/css/team-fantasy.css'
    v1test = repo / 'tests/team_fantasy_weekly_selection_help_v1218v1_tests.js'
    for p in (page, css, v1test):
        if not p.exists():
            raise SystemExit('STOP: Required file missing: ' + str(p))

    page.write_text(patch_page(page))
    css.write_text(patch_css(css))
    v1test.write_text(patch_v1_test(v1test))

    print('Team Fantasy v1.2.18v3 applied transactionally.')
    print('- Player-facing Compare restored as a major Weekly Standings feature')
    print('- Compare supports 2-6 selected league teams and Add Team')
    print('- Viewer column stays frozen on the left')
    print('- Viewer header stacking keeps scrolling team headers behind it')
    print('- Rules, Scoring & Position Stats, OL ordering, Week History, usage limits and BYE behavior retained')
    print('- Admin Team Fantasy Test Lab retained for continued testing')


if __name__ == '__main__':
    main()
