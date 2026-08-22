/* =========================================================
   TEAM FANTASY FOOTBALL PLAYER PAGE — v1.2.18j
========================================================= */

(function teamFantasyLoadCss_() {
  if (document.querySelector('link[data-team-fantasy-css="1"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const script = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src) : null;
  link.href = script ? new URL('../../css/team-fantasy.css?v=1218j2', script).href : './css/team-fantasy.css?v=1218j2';
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

function teamFantasyRenderSlot_(state, lineup, slot) {
  const entry = lineup.entry || {};
  const pick = slot.pick || null;
  const current = pick ? pick.teamAbbr : '';
  const eligibleCount = (slot.teams || []).filter(function(team) { return team.eligible; }).length;
  const slotId = 'tf-' + String(entry.entryId || '').replace(/[^a-z0-9_-]/gi, '-') + '-' + slot.position;
  if (slot.locked && pick) {
    return `
      <div class="tf-slot is-locked" id="${slotId}" data-missing="false">
        <div class="tf-slot-title"><strong>${teamFantasyEscape_(slot.label)}</strong><span class="tf-lock">Locked</span></div>
        <div class="tf-selected-team">${teamFantasyEscape_(pick.teamName || pick.teamAbbr)}</div>
        <div class="tf-muted">${teamFantasyEscape_(pick.teamAbbr)} · NFL game started</div>
      </div>`;
  }
  return `
    <div class="tf-slot ${pick ? 'has-pick' : 'needs-pick'}" id="${slotId}" data-missing="${pick ? 'false' : 'true'}">
      <div class="tf-slot-title">
        <strong>${teamFantasyEscape_(slot.label)}</strong>
        <span class="tf-muted">${eligibleCount} eligible</span>
      </div>
      <select class="tf-team-select" aria-label="${teamFantasyEscape_(slot.label)} team" onchange="teamFantasySaveSlot_('${teamFantasyEscape_(entry.entryId)}','${teamFantasyEscape_(slot.position)}',this.value)">
        <option value="">${pick ? 'Change team…' : 'Choose team…'}</option>
        ${(slot.teams || []).map(function(team) {
          const selected = current === team.abbr ? 'selected' : '';
          const disabled = !team.eligible && current !== team.abbr ? 'disabled' : '';
          return `<option value="${teamFantasyEscape_(team.abbr)}" ${selected} ${disabled}>${teamFantasyEscape_(teamFantasyOptionLabel_(team))}</option>`;
        }).join('')}
      </select>
      ${pick ? `<div class="tf-picked-note">Current: <strong>${teamFantasyEscape_(pick.teamName || pick.teamAbbr)}</strong>${pick.pickMethod && pick.pickMethod !== 'manual' ? ` · ${teamFantasyEscape_(pick.pickMethod)}` : ''}</div>` : ''}
    </div>`;
}

function teamFantasyRenderLineup_(state, lineup) {
  const entry = lineup.entry || {};
  const settings = state.settings || {};
  const conferenceLabel = entry.conference && entry.conference !== 'ALL' ? entry.conference + ' Entry' : (entry.entryName || 'Entry');
  return `
    <section class="card tf-lineup-card" data-entry-id="${teamFantasyEscape_(entry.entryId)}">
      <div class="tf-card-heading">
        <div>
          <h2>${teamFantasyEscape_(conferenceLabel)}</h2>
          <div class="tf-muted">Week ${Number(state.week || 0)} · ${teamFantasyEscape_(state.phase || '')}</div>
        </div>
        <div class="tf-lineup-actions">
          <button class="tf-button secondary" onclick="teamFantasyContinuePicks_('${teamFantasyEscape_(entry.entryId)}')">Continue Picks</button>
          ${settings.allowRandomPick ? `<button class="tf-button secondary" onclick="teamFantasyFill_('${teamFantasyEscape_(entry.entryId)}',true)">Random</button>` : ''}
          ${settings.allowSmartAutoPick ? `<button class="tf-button" onclick="teamFantasyFill_('${teamFantasyEscape_(entry.entryId)}',false)">Auto Pick</button>` : ''}
        </div>
      </div>
      ${teamFantasyRenderProgress_(lineup)}
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
  return `
    <div class="page tf-page">
      <header class="tf-hero card">
        <div><div class="tf-eyebrow">NFL TEAM FANTASY</div><h1>Week ${Number(res.week || 0)}</h1><p>One lineup per entry. The same entry can count in the Complete League and any subleagues you join.</p></div>
        ${teamFantasyLeagueSelect_(res)}
      </header>
      <div id="teamFantasyStatus" class="tf-status" aria-live="polite"></div>
      ${(res.lineups || []).map(function(lineup) { return teamFantasyRenderLineup_(res, lineup); }).join('')}
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

async function teamFantasyReload_() {
  await navigate('team-fantasy', { skipUnsavedCheck: true });
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
  await teamFantasyReload_();
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
  teamFantasySetStatus_(randomOnly ? 'Randomizing open positions…' : 'Building ranked Auto Pick lineup…', false);
  const action = randomOnly ? 'randomTeamFantasyPicks' : 'autoPickTeamFantasy';
  const res = await apiTeamFantasyPost_(action, { gameId: state.gameId, week: state.week, entryId: entryId });
  if (!res || res.success === false) {
    teamFantasySetStatus_(res && (res.message || res.error) || 'Could not fill lineup.', true);
    return;
  }
  teamFantasySetStatus_('Saved ' + Number(res.saved || 0) + ' open positions.', false);
  await teamFantasyReload_();
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
