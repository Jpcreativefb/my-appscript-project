#!/usr/bin/env python3
from pathlib import Path
import sys

UI_MARKER = 'TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'
BACKEND_MARKER = 'TEAM_FANTASY_WEEKLY_SELECTION_HELP_BACKEND_v1218v1'
CSS_MARKER = 'v1.2.18v1 weekly selection rules + scoring + position layout'
BASE_UI_MARKER = 'TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_UI_v1218u1'


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
            if c == '\n':
                mode = 'code'
            i += 1
            continue

        if mode == 'block_comment':
            if c == '*' and n == '/':
                mode = 'code'
                i += 2
            else:
                i += 1
            continue

        if mode in ('single', 'double'):
            quote = "'" if mode == 'single' else '"'
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                mode = 'code'
            i += 1
            continue

        if mode == 'template':
            if escaped:
                escaped = False
                i += 1
                continue
            if c == '\\':
                escaped = True
                i += 1
                continue
            if c == '`':
                mode = 'code'
                i += 1
                continue
            if c == '$' and n == '{':
                depth += 1
                template_returns.append(depth - 1)
                mode = 'code'
                i += 2
                continue
            i += 1
            continue

        # JavaScript code mode.
        if c == '/' and n == '/':
            mode = 'line_comment'
            i += 2
            continue
        if c == '/' and n == '*':
            mode = 'block_comment'
            i += 2
            continue
        if c == "'":
            mode = 'single'
            escaped = False
            i += 1
            continue
        if c == '"':
            mode = 'double'
            escaped = False
            i += 1
            continue
        if c == '`':
            mode = 'template'
            escaped = False
            i += 1
            continue
        if c == '{':
            depth += 1
            i += 1
            continue
        if c == '}':
            depth -= 1
            i += 1
            if template_returns and depth == template_returns[-1]:
                template_returns.pop()
                mode = 'template'
                continue
            if depth == 0:
                return start, i
            continue
        i += 1

    raise RuntimeError(f'Could not find closing brace for {name}')


def replace_function(text, name, replacement):
    start, end = function_bounds(text, name)
    return text[:start] + replacement.rstrip() + text[end:]


def insert_before_function(text, name, block):
    start, _ = function_bounds(text, name)
    return text[:start] + block.rstrip() + '\n\n' + text[start:]


def patch_backend(path):
    text = path.read_text()
    if BACKEND_MARKER in text:
        return text.rstrip() + '\n'
    if 'function teamFantasyRules_(gameId)' not in text:
        raise RuntimeError('Team Fantasy scoring-rule reader is missing.')
    if 'function apiGetTeamFantasyState(payload)' not in text:
        raise RuntimeError('Team Fantasy state API is missing.')
    start, end = function_bounds(text, 'apiGetTeamFantasyState')
    block = text[start:end]
    needle = '    positionLabels: TEAM_FANTASY_POSITION_LABELS\n'
    if needle not in block:
        raise RuntimeError('Could not find positionLabels return field in Team Fantasy state API.')
    block = block.replace(
        needle,
        '    positionLabels: TEAM_FANTASY_POSITION_LABELS,\n'
        '    scoringRules: teamFantasyRules_(gameId).filter(function(rule) { return rule.active; })\n',
        1
    )
    block = '/* ' + BACKEND_MARKER + ' */\n' + block
    text = text[:start] + block + text[end:]
    return text.rstrip() + '\n'


HELPERS = r'''function teamFantasyPositionDisplayOrder_() {
  return ['QB', 'RB', 'WRTE', 'OL', 'K', 'DL', 'LB', 'DB'];
}

function teamFantasyInfoClose_() {
  const overlay = document.getElementById('tfInfoOverlay');
  if (overlay) overlay.remove();
}

function teamFantasyInfoOpen_(title, bodyHtml) {
  teamFantasyInfoClose_();
  document.body.insertAdjacentHTML('beforeend', `<div id="tfInfoOverlay" class="tf-info-overlay" role="presentation" onclick="if(event.target===this)teamFantasyInfoClose_()"><section class="tf-info-sheet" role="dialog" aria-modal="true" aria-labelledby="tfInfoTitle"><div class="tf-info-head"><h2 id="tfInfoTitle">${teamFantasyEscape_(title)}</h2><button type="button" class="tf-info-close" onclick="teamFantasyInfoClose_()" aria-label="Close">×</button></div><div class="tf-info-body">${bodyHtml}</div><div class="tf-info-footer"><button type="button" class="tf-button" onclick="teamFantasyInfoClose_()">Done</button></div></section></div>`);
}

function teamFantasyNumberLabel_(value) {
  const n = Number(value || 0);
  if (!isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 0.000001) return String(Math.round(n));
  return String(Math.round(n * 1000) / 1000);
}

function teamFantasyRulePointsText_(rule) {
  if (String(rule && rule.ruleType || '').toLowerCase() === 'bonus') {
    const bonus = Number(rule && rule.bonusPoints || 0);
    const threshold = Number(rule && rule.threshold || 0);
    return `${bonus > 0 ? '+' : ''}${teamFantasyNumberLabel_(bonus)} pts at ${teamFantasyNumberLabel_(threshold)}+`;
  }
  const points = Number(rule && rule.pointsPerUnit || 0);
  if (!points) return 'Tracked only';
  return `${points > 0 ? '+' : ''}${teamFantasyNumberLabel_(points)} pts each`;
}

function teamFantasyOpenScoring_() {
  const state = window.TEAM_FANTASY_STATE || {};
  const labels = state.positionLabels || {};
  const rules = Array.isArray(state.scoringRules) ? state.scoringRules.filter(function(rule){ return rule && rule.active !== false; }) : [];
  const groups = teamFantasyPositionDisplayOrder_().map(function(position) {
    const positionRules = rules.filter(function(rule){ return String(rule.position || '') === position; });
    const rows = positionRules.length ? positionRules.map(function(rule) {
      return `<div class="tf-score-rule"><span>${teamFantasyEscape_(rule.label || rule.statKey || 'Stat')}</span><strong>${teamFantasyEscape_(teamFantasyRulePointsText_(rule))}</strong></div>`;
    }).join('') : '<div class="tf-muted">No active scoring rules.</div>';
    return `<section class="tf-score-position"><h3>${teamFantasyEscape_(labels[position] || (position === 'WRTE' ? 'WR/TE' : position))}</h3>${rows}</section>`;
  }).join('');
  teamFantasyInfoOpen_('Scoring & Position Stats', `<p class="tf-info-intro">These are the current active scoring rules for this game. If an admin changes the scoring, this list changes with it.</p><div class="tf-score-grid">${groups}</div>`);
}

function teamFantasyOpenRules_() {
  const state = window.TEAM_FANTASY_STATE || {};
  const settings = state.settings || {};
  const useLimit = Math.max(1, Number(settings.teamUseLimit || 1));
  const postseasonUsage = String(settings.playoffUsageMode || '').toLowerCase() === 'carry' ? 'carries into the postseason' : 'resets for the postseason';
  const postseasonScoring = String(settings.postseasonScoringMode || '').toLowerCase() === 'fresh-round' ? 'starts fresh each postseason round' : 'stays cumulative';
  const autoText = settings.allowRandomPick || settings.allowSmartAutoPick ? '<li>Random and/or Auto Pick can fill open positions when those options are enabled.</li>' : '';
  teamFantasyInfoOpen_('Rules', `<div class="tf-rules-copy"><p>Build your weekly lineup by choosing an NFL team for every position group.</p><ol><li>Make one pick at each position: <strong>QB, RB, WR/TE, OL, K, DL, LB and DB.</strong></li><li>Each NFL team may be used up to <strong>${useLimit} time${useLimit === 1 ? '' : 's'} at each position</strong> during the season. Using a team at QB does not use that team's RB, WR/TE, OL or defensive allowance.</li><li>You may change a pick until that selected NFL team's game starts. At kickoff, that position pick locks.</li><li>BYE teams cannot be selected for that week.</li><li>Your weekly score is the total of all eight position-group scores. The <strong>Scoring & Position Stats</strong> button shows exactly which stats and point values are active.</li><li>Weekly Standings rank the league by the points earned for that week. Past weeks can be reviewed from the Week selector.</li>${autoText}<li>Postseason team usage ${teamFantasyEscape_(postseasonUsage)} and postseason scoring ${teamFantasyEscape_(postseasonScoring)}.</li></ol></div>`);
}'''


LINEUP = r'''function teamFantasyRenderLineup_(state, lineup) {
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
        <div class="tf-weekly-help-row">
          <button type="button" class="tf-help-button" onclick="teamFantasyOpenRules_()">📖 Rules</button>
          <button type="button" class="tf-help-button" onclick="teamFantasyOpenScoring_()">ⓘ Scoring &amp; Position Stats</button>
        </div>
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


GAME_DAY_MOUNT = r'''function teamFantasyRenderGameDayIntoMount_() {
  const mount = document.getElementById('tfGameDayMount');
  const data = window.TEAM_FANTASY_GAME_DAY;
  if (!mount || !data) return;
  window.TEAM_FANTASY_GAME_DAY_VIEW = 'league';
  mount.innerHTML = `<div class="tf-game-day-sticky"><strong class="tf-game-day-label">Weekly Standings</strong><div class="tf-game-day-filters">${teamFantasyGameDayLeaguePicker_(data)}${teamFantasyGameDayWeekPicker_(data)}</div><button class="tf-refresh-mini" onclick="teamFantasyLoadGameDay_(true)" title="Refresh cached scores">↻</button></div><div class="tf-mini-status-legend"><span class="is-final"></span>F <span class="is-live"></span>L <span class="is-upcoming"></span>U</div>${teamFantasyRenderWeeklyLeague_(data)}`;
}'''


TEST_LAB = r'''async function teamFantasyRunTestLab_() {
  const mount = document.getElementById('tfTestLabMount');
  const state = window.TEAM_FANTASY_STATE || {};
  if (!mount) return;
  mount.innerHTML = '<div class="tf-muted">Running weekly league test…</div>';
  try {
    const res = await api('adminGetTeamFantasyTestLab', { gameId: state.gameId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Test Lab failed.');
    const checks = Array.isArray(res.checks) ? res.checks : [];
    window.TEAM_FANTASY_GAME_DAY_TEST = res.compare || {};
    mount.innerHTML = `<div class="tf-test-summary ${res.allPassed?'is-pass':'is-fail'}"><strong>${res.allPassed?'ALL TEST LAB CHECKS PASSED':'TEST LAB FOUND A FAILURE'}</strong><span>${res.writesSheets===false?'No real Team Fantasy rows were written.':''}</span></div><div class="tf-test-checks">${checks.map(function(check){ return `<div class="tf-test-check ${check.passed?'is-pass':'is-fail'}"><strong>${check.passed?'✓':'✕'} ${teamFantasyEscape_(check.name)}</strong><span>${teamFantasyEscape_(check.detail||'')}</span></div>`; }).join('')}</div><h3>Weekly League Test Race</h3>${teamFantasyRenderWeeklyLeague_(res.compare || {})}<div class="tf-muted">Usage proof: BUF at QB is ${Number(res.usageExample && res.usageExample.QB && res.usageExample.QB.used || 0)}/3 and blocked; BUF at RB is ${Number(res.usageExample && res.usageExample.RB && res.usageExample.RB.used || 0)}/3 and still available.</div>`;
  } catch (err) {
    mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Test Lab failed.')}</div>`;
  }
}'''


CSS = r'''
/* v1.2.18v1 weekly selection rules + scoring + position layout */
.tf-weekly-help-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:8px 0 4px}.tf-help-button{min-height:34px;border:1px solid rgba(255,255,255,.72);border-radius:9px;background:#102a43;color:#fff;padding:6px 10px;font:inherit;font-size:.76rem;font-weight:850;cursor:pointer}.tf-help-button:hover,.tf-help-button:focus-visible{background:#174f82;outline:2px solid #60a5fa;outline-offset:1px}
.tf-info-overlay{position:fixed;inset:0;z-index:10050;background:rgba(2,6,23,.72);display:flex;align-items:center;justify-content:center;padding:16px}.tf-info-sheet{width:min(760px,100%);max-height:min(84vh,820px);display:flex;flex-direction:column;background:#0b1f3a;color:#fff;border:1px solid rgba(255,255,255,.82);border-radius:14px;box-shadow:0 22px 60px rgba(0,0,0,.42);overflow:hidden}.tf-info-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,.2)}.tf-info-head h2{margin:0;font-size:1.08rem}.tf-info-close{border:0;background:transparent;color:#fff;font-size:1.55rem;line-height:1;cursor:pointer}.tf-info-body{overflow:auto;padding:14px}.tf-info-footer{display:flex;justify-content:flex-end;padding:10px 14px;border-top:1px solid rgba(255,255,255,.16);background:#0f172a}.tf-info-intro{margin:0 0 12px;color:#dbeafe;font-size:.82rem;line-height:1.4}.tf-score-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.tf-score-position{background:#102a43;border:1px solid rgba(255,255,255,.38);border-radius:10px;padding:9px}.tf-score-position h3{margin:0 0 7px;font-size:.87rem;color:#fff}.tf-score-rule{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid rgba(255,255,255,.12);font-size:.75rem}.tf-score-rule:first-of-type{border-top:0}.tf-score-rule span{color:#e2e8f0}.tf-score-rule strong{text-align:right;white-space:nowrap;color:#fff}.tf-rules-copy{font-size:.84rem;line-height:1.45;color:#e2e8f0}.tf-rules-copy p{margin-top:0}.tf-rules-copy ol{margin:0;padding-left:1.3rem}.tf-rules-copy li{margin:0 0 8px}.tf-rules-copy strong{color:#fff}
.tf-lineup-card .tf-slot-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-template-areas:"qb k" "rb dl" "wrte lb" "ol db"!important;gap:7px!important}.tf-lineup-card .tf-slot[id$="-QB"]{grid-area:qb}.tf-lineup-card .tf-slot[id$="-RB"]{grid-area:rb}.tf-lineup-card .tf-slot[id$="-WRTE"]{grid-area:wrte}.tf-lineup-card .tf-slot[id$="-OL"]{grid-area:ol}.tf-lineup-card .tf-slot[id$="-K"]{grid-area:k}.tf-lineup-card .tf-slot[id$="-DL"]{grid-area:dl}.tf-lineup-card .tf-slot[id$="-LB"]{grid-area:lb}.tf-lineup-card .tf-slot[id$="-DB"]{grid-area:db}.tf-game-day-label{font-size:.78rem;font-weight:900;white-space:nowrap}
@media(max-width:760px){.tf-weekly-help-row{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px}.tf-help-button{min-height:32px;padding:5px 8px;font-size:.68rem}.tf-lineup-card .tf-slot-grid{grid-template-columns:1fr!important;grid-template-areas:"qb" "rb" "wrte" "ol" "k" "dl" "lb" "db"!important}.tf-score-grid{grid-template-columns:1fr}.tf-info-overlay{padding:8px}.tf-info-sheet{max-height:90vh}.tf-info-body{padding:11px}.tf-game-day-label{font-size:.7rem}}
'''


def patch_page(path):
    text = path.read_text()
    if UI_MARKER in text:
        return text.rstrip() + '\n'
    if BASE_UI_MARKER not in text:
        raise RuntimeError('Required v1.2.18u1 Team Fantasy UI marker is missing.')
    if 'team-fantasy.css?v=1218u1' not in text:
        raise RuntimeError('Required v1.2.18u1 Team Fantasy CSS cache marker is missing.')
    text = text.replace('/* ' + BASE_UI_MARKER + ' */', '/* ' + BASE_UI_MARKER + ' */\n/* ' + UI_MARKER + ' */', 1)
    text = text.replace('team-fantasy.css?v=1218u1', 'team-fantasy.css?v=1218v1')
    text = insert_before_function(text, 'teamFantasyRenderLineup_', HELPERS)
    text = replace_function(text, 'teamFantasyRenderLineup_', LINEUP)
    text = replace_function(text, 'teamFantasyRenderGameDayIntoMount_', GAME_DAY_MOUNT)
    text = replace_function(text, 'teamFantasyRunTestLab_', TEST_LAB)
    old_sub = 'Live weekly race or lineup comparison. Opponent picks stay hidden until kickoff.'
    if old_sub not in text:
        raise RuntimeError('Could not find Weekly League description to retire Compare wording.')
    text = text.replace(old_sub, 'Live weekly standings. Use the Week selector to review past results.', 1)
    text = text.replace('<h2>Weekly League</h2>', '<h2>Weekly Standings</h2>', 1)
    text = text.replace('Six fake players · no Sheet writes · tests privacy, usage limits, weekly race math and game states.', 'In-memory test players · no Sheet writes · tests privacy, usage limits, weekly race math and game states.', 1)
    text = text.replace('Run 6-Team Test Lab', 'Run Team Fantasy Test Lab', 1)
    return text.rstrip() + '\n'


def patch_css(path):
    text = path.read_text().rstrip() + '\n'
    if CSS_MARKER not in text:
        text = text.rstrip() + '\n' + CSS.strip() + '\n'
    return text


def patch_u1_test(path):
    text = path.read_text()
    old = "assert(page.includes('team-fantasy.css?v=1218u1'), '18u CSS cache marker missing');"
    if old in text:
        new = "const u1CssCache = page.match(/team-fantasy\\.css\\?v=([A-Za-z0-9._-]+)/);\nassert(u1CssCache && !['1218r1','1218s','1218t2'].includes(u1CssCache[1]), '18u-or-later CSS cache marker missing');"
        text = text.replace(old, new, 1)
    elif 'u1CssCache' not in text:
        raise RuntimeError('Could not update historical v1.2.18u1 cache test.')
    return text.rstrip() + '\n'


def patch_r1_test(path):
    text = path.read_text()
    old_button = "assert(page.includes('Run 6-Team Test Lab'), 'Admin Test Lab button missing from Team Fantasy page.');"
    new_button = "assert(page.includes('Run 6-Team Test Lab') || page.includes('Run Team Fantasy Test Lab'), 'Admin Test Lab button missing from Team Fantasy page.');"
    if old_button in text:
        text = text.replace(old_button, new_button, 1)
    elif 'Run Team Fantasy Test Lab' not in text:
        raise RuntimeError('Could not update historical v1.2.18r1 Test Lab button test.')

    old_t2_compare = "const teamFantasyCompareSupportsTwoToSix = page.includes('Compare 2–6 teams') || (page.includes('+ Add Team') && page.includes('selected.slice(0,6)') && page.includes('selected.length<6'));"
    new_t2_compare = "const teamFantasyCompareSupportsTwoToSix = page.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1') || page.includes('Compare 2–6 teams') || (page.includes('+ Add Team') && page.includes('selected.slice(0,6)') && page.includes('selected.length<6'));"
    old_compare = "assert(page.includes('Compare 2–6 teams'), '2–6 team comparison controls missing.');"
    new_compare = "assert(page.includes('Compare 2–6 teams') || page.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'), 'Historical 2–6 comparison contract missing or not intentionally retired by 18v1.');"
    if old_t2_compare in text:
        text = text.replace(old_t2_compare, new_t2_compare, 1)
    elif old_compare in text:
        text = text.replace(old_compare, new_compare, 1)
    elif 'TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1' not in text:
        raise RuntimeError('Could not update historical v1.2.18r1 comparison test.')

    old_privacy = "assert(page.includes('Hidden until kickoff'), 'Opponent-pick privacy UI missing.');"
    new_privacy = "assert(page.includes('Hidden until kickoff') || page.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'), 'Historical opponent-pick privacy UI missing or comparison intentionally retired by 18v1.');"
    if old_privacy in text:
        text = text.replace(old_privacy, new_privacy, 1)
    elif 'comparison intentionally retired by 18v1' not in text:
        raise RuntimeError('Could not update historical v1.2.18r1 privacy UI test.')
    return text.rstrip() + '\n'


def patch_t2_test(path):
    text = path.read_text()
    old1 = "assert(page.includes('League View') && page.includes('Compare'), 'League/Compare view switch missing');"
    old2 = "assert(page.includes('+ Add Team'), 'single Add Team control missing');"
    new1 = "assert((page.includes('League View') && page.includes('Compare')) || page.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'), 'Weekly League view contract missing');"
    new2 = "assert(page.includes('+ Add Team') || page.includes('TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1'), 'Historical Add Team contract must be preserved or intentionally retired by 18v1');"
    if old1 in text:
        text = text.replace(old1, new1, 1)
    elif 'Weekly League view contract missing' not in text:
        raise RuntimeError('Could not update historical v1.2.18t2 Compare test.')
    if old2 in text:
        text = text.replace(old2, new2, 1)
    elif 'intentionally retired by 18v1' not in text:
        raise RuntimeError('Could not update historical v1.2.18t2 Add Team test.')
    return text.rstrip() + '\n'


def main():
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    paths = {
        'backend': repo / 'backend/engines/SportsTeamFantasyEngine.js',
        'page': repo / 'frontend/js/pages/teamFantasy.js',
        'css': repo / 'frontend/css/team-fantasy.css',
        'u1test': repo / 'tests/team_fantasy_week_history_compare_v1218u1_tests.js',
        't2test': repo / 'tests/team_fantasy_weekly_hub_v1218t2_tests.js',
        'r1test': repo / 'tests/team_fantasy_game_day_v1218r1_tests.js',
    }
    missing = [str(p) for p in paths.values() if not p.exists()]
    if missing:
        raise SystemExit('STOP: Required files missing:\n' + '\n'.join(missing))
    if UI_MARKER in paths['page'].read_text():
        print('Team Fantasy v1.2.18v1 is already applied.')
        return

    # Build every result in memory before writing anything.
    outputs = {
        paths['backend']: patch_backend(paths['backend']),
        paths['page']: patch_page(paths['page']),
        paths['css']: patch_css(paths['css']),
        paths['u1test']: patch_u1_test(paths['u1test']),
        paths['t2test']: patch_t2_test(paths['t2test']),
        paths['r1test']: patch_r1_test(paths['r1test']),
    }
    for path, content in outputs.items():
        path.write_text(content)

    print('Team Fantasy v1.2.18v1 applied transactionally.')
    print('- Rules and current scoring/stat buttons added at the top of Weekly Picks')
    print('- Current active scoring rules now travel with Team Fantasy player state')
    print('- Two-column lineup keeps QB/RB/WR-TE/OL left and K/DL/LB/DB right')
    print('- One-column lineup order is QB, RB, WR/TE, OL, K, DL, LB, DB')
    print('- Player-facing Compare/Six-Team Synthetic Compare view retired')
    print('- Weekly Standings and Week History remain available')


if __name__ == '__main__':
    main()
