/* =========================================================
   TEAM FANTASY FOOTBALL PLAYER PAGE — v1.2.18r1
========================================================= */

(function teamFantasyLoadCss_() {
  if (document.querySelector('link[data-team-fantasy-css="1"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const script = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src) : null;
  link.href = script ? new URL('../../css/team-fantasy.css?v=1218s', script).href : './css/team-fantasy.css?v=1218s';
  link.dataset.teamFantasyCss = '1';
  document.head.appendChild(link);
})();

function teamFantasyEscape_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function teamFantasyCurrentUser_() {
  try {
    const s = typeof getSession === 'function' ? (getSession() || {}) : {};
    return String(s.username || '').trim();
  } catch (err) {
    return '';
  }
}

function teamFantasyScore_(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') : '0';
}

function teamFantasyPct_(value) {
  const n = Number(value || 0);
  return (n * 100).toFixed(1).replace(/\.0$/, '') + '%';
}

function teamFantasyLeagueSelect_(state) {
  const leagues = Array.isArray(state.leagues) ? state.leagues : [];
  if (!leagues.length) return '';
  return `
    <label class="tf-field tf-league-picker">
      <span>League</span>
      <select id="teamFantasyLeagueSelect" onchange="teamFantasyChangeLeague_(this.value)">
        ${leagues.map(function(league) {
          return `<option value="${teamFantasyEscape_(league.leagueId)}" ${league.leagueId === state.selectedLeagueId ? 'selected' : ''}>${teamFantasyEscape_(league.leagueName)}</option>`;
        }).join('')}
      </select>
    </label>`;
}

function teamFantasyRenderProgress_(lineup) {
  const required = Number(lineup.required || 0);
  const picked = Number(lineup.picked || 0);
  const pct = required ? Math.round((picked / required) * 100) : 0;
  return `
    <div class="tf-progress-row">
      <strong>${picked}/${required} complete</strong>
      <span>${pct}%</span>
    </div>
    <div class="tf-progress"><span style="width:${pct}%"></span></div>
    ${lineup.missing && lineup.missing.length ? `<div class="tf-muted tf-missing-copy">Still open: ${teamFantasyEscape_(lineup.missing.join(', '))}</div>` : `<div class="tf-complete">Lineup complete</div>`}
  `;
}

function teamFantasyOptionLabel_(team) {
  const game = team.game || {};
  const rank = team.rank ? '#' + team.rank + ' ' : '';
  const opponent = game.homeAbbr === team.abbr ? ('vs ' + game.awayAbbr) : (game.awayAbbr === team.abbr ? ('@ ' + game.homeAbbr) : '');
  const usage = 'Uses ' + Number(team.uses || 0) + '/' + (Number(team.uses || 0) + Number(team.usesRemaining || 0));
  const reason = team.eligible ? '' : ' — ' + (team.reason || 'Unavailable');
  return rank + team.name + (opponent ? ' — ' + opponent : '') + ' — ' + usage + reason;
}



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

function teamFantasyRenderSlot_(state, lineup, slot) {
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
}

function teamFantasyRenderLineup_(state, lineup) {
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
}

function teamFantasyRenderStandings_(standings, phase) {
  if (!standings || !Array.isArray(standings.rows)) return `<div class="card"><h2>Standings</h2><div class="tf-muted">No standings yet.</div></div>`;
  const playoff = phase === 'postseason' && Array.isArray(standings.playoffStandings) ? standings.playoffStandings : [];
  return `
    <section class="card tf-standings-card">
      <div class="tf-card-heading"><div><h2>${teamFantasyEscape_(standings.league && standings.league.leagueName || 'Standings')}</h2><div class="tf-muted">All-Play regular-season record</div></div></div>
      <div class="tf-table-wrap"><table class="tf-table"><thead><tr><th>#</th><th>Entry</th><th>W</th><th>L</th><th>T</th><th>Win %</th><th>Pts</th><th>Playoffs</th></tr></thead><tbody>
        ${standings.rows.map(function(row) {
          const label = row.entryId ? row.entryId : row.username;
          return `<tr><td>${row.rank}</td><td>${teamFantasyEscape_(label)}</td><td>${row.regularWins}</td><td>${row.regularLosses}</td><td>${row.regularTies}</td><td>${teamFantasyPct_(row.winPct)}</td><td>${teamFantasyScore_(row.regularPoints)}</td><td>${row.playoffQualified ? '✓' : ''}</td></tr>`;
        }).join('') || `<tr><td colspan="8">No completed weeks yet.</td></tr>`}
      </tbody></table></div>
      ${playoff.length ? `<div class="tf-playoff-block"><h3>${standings.postseasonScoringMode === 'fresh-round' ? 'Current Postseason Round' : 'Cumulative Postseason'}</h3><div class="tf-muted">${standings.postseasonScoringMode === 'fresh-round' ? 'Only the latest completed playoff round is used.' : 'Super Bowl points add to the postseason total instead of becoming a one-game tiebreak.'}</div><div class="tf-table-wrap"><table class="tf-table"><thead><tr><th>#</th><th>Entry</th><th>Postseason Pts</th></tr></thead><tbody>${playoff.map(function(row){return `<tr><td>${row.playoffRank}</td><td>${teamFantasyEscape_(row.entryId || row.username)}</td><td>${teamFantasyScore_(row.playoffScore !== undefined ? row.playoffScore : row.postseasonPoints)}</td></tr>`;}).join('')}</tbody></table></div></div>` : ''}
    </section>`;
}

function teamFantasyCompetitors_(standings) {
  return standings && Array.isArray(standings.rows) ? standings.rows.map(function(row) {
    return { id: row.competitorId, label: row.entryId || row.username || row.competitorId };
  }) : [];
}

function teamFantasyRenderH2H_(state) {
  const competitors = teamFantasyCompetitors_(state.standings);
  if (competitors.length < 2) return '';
  return `
    <section class="card tf-h2h-card">
      <div class="tf-card-heading"><div><h2>True Head to Head</h2><div class="tf-muted">Compare only the weeks these two competitors faced the same scoring field.</div></div></div>
      <div class="tf-h2h-controls">
        <select id="tfH2HA">${competitors.map(function(c, i){return `<option value="${teamFantasyEscape_(c.id)}" ${i===0?'selected':''}>${teamFantasyEscape_(c.label)}</option>`;}).join('')}</select>
        <span>vs</span>
        <select id="tfH2HB">${competitors.map(function(c, i){return `<option value="${teamFantasyEscape_(c.id)}" ${i===1?'selected':''}>${teamFantasyEscape_(c.label)}</option>`;}).join('')}</select>
        <button class="tf-button" onclick="teamFantasyLoadH2H_()">View Record</button>
      </div>
      <div id="tfH2HResults" class="tf-h2h-results"></div>
    </section>`;
}

async function renderTeamFantasyPage() {
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
}

function teamFantasySetStatus_(message, error) {
  const el = document.getElementById('teamFantasyStatus');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'tf-status ' + (error ? 'is-error' : 'is-ok');
}

async function teamFantasyReload_(options) {
  options = options || {};
  await navigate('team-fantasy', { skipUnsavedCheck: true, suppressLoader: options.showGlobalLoader === true ? false : true });
}

async function teamFantasyChangeLeague_(leagueId) {
  if (typeof setFrontendLeagueId === 'function') setFrontendLeagueId(leagueId);
  else localStorage.setItem('leagueId', leagueId || '');
  await teamFantasyReload_();
}

async function teamFantasySaveSlot_(entryId, position, teamAbbr) {
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
}

function teamFantasyContinuePicks_(entryId) {
  const card = document.querySelector('.tf-lineup-card[data-entry-id="' + String(entryId).replace(/[^a-zA-Z0-9_-]/g, '') + '"]');
  const target = card && card.querySelector('.tf-slot[data-missing="true"]');
  if (!target) { teamFantasySetStatus_('This lineup is complete.', false); return; }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const select = target.querySelector('select');
  if (select) setTimeout(function(){ select.focus(); }, 350);
}

async function teamFantasyFill_(entryId, randomOnly) {
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
}

async function teamFantasyLoadH2H_() {
  const state = window.TEAM_FANTASY_STATE || {};
  const a = document.getElementById('tfH2HA');
  const b = document.getElementById('tfH2HB');
  const out = document.getElementById('tfH2HResults');
  if (!a || !b || !out) return;
  if (a.value === b.value) { out.innerHTML = '<div class="tf-warning">Choose two different competitors.</div>'; return; }
  out.innerHTML = '<div class="tf-muted">Loading head-to-head history…</div>';
  const res = await api('getTeamFantasyHeadToHead', { gameId: state.gameId, leagueId: state.selectedLeagueId, competitorA: a.value, competitorB: b.value });
  if (!res || res.success === false) { out.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(res && (res.error || res.message) || 'Could not load record.')}</div>`; return; }
  out.innerHTML = `
    <div class="tf-h2h-summary"><strong>${res.aWins}-${res.bWins}-${res.ties}</strong><span>${teamFantasyScore_(res.aAverage)} avg vs ${teamFantasyScore_(res.bAverage)} avg</span></div>
    <div class="tf-table-wrap"><table class="tf-table"><thead><tr><th>Week</th><th>A</th><th>B</th><th>Winner</th></tr></thead><tbody>
      ${(res.history || []).map(function(row){return `<tr><td>${row.week}</td><td>${teamFantasyScore_(row.scoreA)}</td><td>${teamFantasyScore_(row.scoreB)}</td><td>${teamFantasyEscape_(row.winner === 'tie' ? 'Tie' : row.winner)}</td></tr>`;}).join('') || '<tr><td colspan="4">No completed common weeks yet.</td></tr>'}
    </tbody></table></div>`;
}

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
}

function teamFantasyRenderCompareBoard_(data, selectedIds) {
  const competitors = Array.isArray(data && data.competitors) ? data.competitors : [];
  const selected = competitors.filter(function(c){ return selectedIds.indexOf(c.entryId) !== -1; });
  if (selected.length < 2) return `<div class="tf-warning">Choose at least 2 teams to compare.</div>`;
  return `<div class="tf-compare-scroll"><div class="tf-compare-board">${selected.map(function(c){
    const record = c.record || { wins:0, losses:0, ties:0 };
    const rank = Number(c.leagueRank || 0) > 0 ? '#' + Number(c.leagueRank) : '#—';
    return `<article class="tf-compare-team"><div class="tf-compare-team-head"><div class="tf-team-head-name"><strong>${teamFantasyEscape_(c.label || c.entryId)}</strong>${c.isViewer?'<span class="tf-you-badge">YOU</span>':''}</div><div class="tf-compare-total">${teamFantasyScore_(c.totalPoints)} pts</div><div class="tf-compare-record">${rank} · ${Number(record.wins||0)}-${Number(record.losses||0)}-${Number(record.ties||0)}</div></div><div class="tf-compare-slots">${(c.slots||[]).map(teamFantasyRenderCompareSlot_).join('')}</div></article>`;
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
  mount.innerHTML = `<div class="tf-compare-controls"><div class="tf-compare-control-main"><strong>Compare 2–6 teams</strong><div class="tf-compare-subline">${teamFantasyCompareLeaguePicker_()}<span>· cached scores refresh every 5 min</span></div></div><div class="tf-action-row"><button class="tf-button secondary" onclick="teamFantasyComparePreset_(2)">H2H</button><button class="tf-button secondary" onclick="teamFantasyComparePreset_(6)">2–6</button></div></div><div class="tf-status-legend" aria-label="Game status colors"><span class="is-live"></span>Live <span class="is-final"></span>Final <span class="is-upcoming"></span>Upcoming</div><div class="tf-compare-picker">${competitors.map(function(c){ return `<label class="tf-compare-choice"><input type="checkbox" value="${teamFantasyEscape_(c.entryId)}" ${selected.indexOf(c.entryId)!==-1?'checked':''} onchange="teamFantasyCompareToggle_(this)"><span>${teamFantasyEscape_(c.label || c.entryId)}</span></label>`; }).join('')}</div><div id="tfCompareBoard">${teamFantasyRenderCompareBoard_(data, selected)}</div><div class="tf-muted tf-privacy-note">${teamFantasyEscape_(data.privacy || '')}</div>`;
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
