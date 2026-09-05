/* =========================================================
   TEAM FANTASY FOOTBALL PLAYER PAGE — v1.2.18r1
========================================================= */

// RC24A R2 Team Fantasy CSS loads through app.html.
// Legacy cache marker retained for v1.2.18v3 regression compatibility: team-fantasy.css?v=1218v3

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
    ${lineup.missing && lineup.missing.length ? `<div class="tf-muted tf-missing-copy">Still open: ${teamFantasyEscape_(lineup.missing.join(', '))}</div>` : `<div class="tf-complete tf-lineup-set">✓ Lineup Set</div>`}
    ${Number(lineup.autoPickPenalty || 0) > 0 ? `<div class="tf-auto-penalty">Auto Pick penalty: -${teamFantasyScore_(lineup.autoPickPenalty)} points (${Number(lineup.autoPickPositions || 0)} position${Number(lineup.autoPickPositions || 0)===1?'':'s'})</div>` : ''}
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
/* TEAM_FANTASY_WEEKLY_HUB_UI_v1218t2 */
/* TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_UI_v1218u1 */
/* TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1 */
/* TEAM_FANTASY_COMPARE_RESTORE_UI_v1218v3 */
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

function teamFantasyPickerIsBye_(team) {
  const reason = String(team && team.reason || '').toUpperCase();
  return reason.indexOf('BYE') !== -1 || (!team.game && reason.indexOf('NOT SCHEDULED') !== -1);
}

function teamFantasyPickerRemaining_(team) {
  return Math.max(0, Math.floor(Number(team && team.usesRemaining || 0)));
}

function teamFantasyPickerAvailabilityClass_(team) {
  if (teamFantasyPickerIsBye_(team)) return 'is-bye';
  const left = teamFantasyPickerRemaining_(team);
  if (left <= 0) return 'is-exhausted';
  if (left === 1) return 'uses-left-1';
  if (left === 2) return 'uses-left-2';
  return 'uses-left-full';
}

function teamFantasyPickerTeams_(slot) {
  return (slot && slot.teams || []).filter(function(team){
    if (teamFantasyPickerIsBye_(team)) return true;
    if (team.eligible !== true) return false;
    return teamFantasyPickerRemaining_(team) > 0;
  });
}

function teamFantasyCloseTeamPicker_() {
  const old = document.getElementById('tfTeamPickerOverlay');
  if (old) old.remove();
}


function teamFantasyOpenTeamPicker_(entryId,position){
  const slot=teamFantasyFindSlot_(entryId,position);
  if(!slot||slot.locked)return;
  const teams=teamFantasyPickerTeams_(slot).slice().sort(function(a,b){
    if(a.eligible!==b.eligible)return a.eligible?-1:1;
    const ar=Number(a.rank||0)||999,br=Number(b.rank||0)||999;
    if(ar!==br)return ar-br;
    return String(a.name||a.abbr||'').localeCompare(String(b.name||b.abbr||''));
  });
  const current=slot.pick?String(slot.pick.teamAbbr||''):'';
  teamFantasyCloseTeamPicker_();
  const selectableCount = teams.filter(function(team){ return !teamFantasyPickerIsBye_(team) && team.eligible === true && teamFantasyPickerRemaining_(team) > 0; }).length;
  const byeCount = teams.filter(teamFantasyPickerIsBye_).length;
  const pickerSummary = selectableCount + ' selectable' + (byeCount ? ' · ' + byeCount + ' bye' : '');
  const rows=teams.map(function(team){
    const bye=teamFantasyPickerIsBye_(team),left=teamFantasyPickerRemaining_(team);
    const game=team.game||{},kind=teamFantasyGameKind_(game);
    const rank=Number(team.rank||0)>0?'#'+Number(team.rank):'#—';
    const opponent=bye?'BYE':teamFantasyOpponentText_(team);
    const kickoff=kind==='upcoming'?teamFantasyFormatKickoff_(game):String(game.status||kind.toUpperCase());
    const selected=current===String(team.abbr||'')?' is-selected':'';
    const disabled=bye||team.eligible!==true?' disabled aria-disabled="true"':'';
    const action=disabled?'':` onclick="teamFantasyChooseTeam_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}','${teamFantasyEscape_(team.abbr)}')"`;
    return`<button type="button" class="tf-picker-team tf-picker-team-r3 ${teamFantasyPickerAvailabilityClass_(team)}${selected}"${disabled}${action}><span class="tf-picker-rank">${teamFantasyEscape_(rank)}</span><img src="${teamFantasyEscape_(teamFantasyTeamLogoUrl_(team.abbr))}" alt=""><span class="tf-picker-main"><strong>${teamFantasyEscape_(team.abbr)} — ${teamFantasyEscape_(team.name||'')}</strong><span>${teamFantasyEscape_(opponent)} · ${teamFantasyEscape_(kickoff)}</span></span><span class="tf-picker-side">${kind==='live'?'<span class="tf-picker-live">LIVE</span>':`<span>${left} left</span>`}${team.average!==undefined&&team.average!==null?`<span>${teamFantasyScore_(team.average)} avg pts</span>`:''}</span></button>`;
  }).join('');
  const settings=(window.TEAM_FANTASY_STATE||{}).settings||{};
  const fillActions=!slot.pick?`<div class="tf-picker-fill-actions">${settings.allowRandomPick?`<button type="button" class="tf-button secondary" title="Choose an eligible team at random for this position." onclick="teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}',true)">Random Pick</button>`:''}${settings.allowSmartAutoPick?`<button type="button" class="tf-button" title="Let PATTC choose using this game's automatic-pick rules." onclick="teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}',false)">Auto Pick</button>`:''}</div>`:'';
  document.body.insertAdjacentHTML('beforeend',`<div id="tfTeamPickerOverlay" class="tf-picker-overlay" role="presentation" onclick="if(event.target===this)teamFantasyCloseTeamPicker_()"><section class="tf-picker-sheet" role="dialog" aria-modal="true" aria-label="Choose ${teamFantasyEscape_(slot.label||position)} team"><div class="tf-picker-head"><div><strong>${teamFantasyEscape_(slot.label||position)} · Ranked Selection</strong><span>Eligible NFL teams sorted by current Team Fantasy position ranking · ${teamFantasyEscape_(pickerSummary)}</span></div><button type="button" class="tf-picker-close" onclick="teamFantasyCloseTeamPicker_()" aria-label="Close">×</button></div><div class="tf-picker-list">${rows||'<div class="tf-muted">No teams available.</div>'}</div>${fillActions}</section></div>`);
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



function teamFantasyRenderSlot_(state,lineup,slot){
  const entry=lineup.entry||{},pick=slot.pick||null;
  const entryId=String(entry.entryId||'');
  const slotId='tf-'+entryId.replace(/[^a-z0-9_-]/gi,'-')+'-'+slot.position;
  const metric=teamFantasyPositionMetric_(entryId,slot);
  const team=metric.team;
  const opponent=team?teamFantasyOpponentText_(team):'';
  const logo=pick?teamFantasyTeamLogoUrl_(pick.teamAbbr):'';
  const method=pick?teamFantasyPickMethodDisplay_(metric.method):'';
  const teamName=team&&team.name?team.name:String(pick&&pick.teamAbbr||'');
  const usage=team?Math.max(0,Number(team.usesRemaining||0))+' use'+(Number(team.usesRemaining||0)===1?'':'s')+' left':'';
  const rank=metric.rank?('Rank #'+metric.rank):'Rank —';
  const status=String(metric.status||'upcoming').toLowerCase();
  const statusWord=status.toUpperCase();
  const primary=teamFantasyMetricPrimaryLine_(metric,opponent);
  const bulkSelect=!pick&&!slot.locked?`<label class="tf-bulk-select" title="Include ${teamFantasyEscape_(slot.label)} in Random/Auto Fill Selected"><input type="checkbox" data-tf-bulk-position="1" data-entry-id="${teamFantasyEscape_(entryId)}" data-position="${teamFantasyEscape_(slot.position)}" checked><span>Fill</span></label>`:'';
  const editLabel=pick&&!slot.locked?'<span class="tf-edit-label">Edit · Make Changes Before Kickoff</span>':'';
  const lockLabel=slot.locked?'<span class="tf-lock-copy">🔒 Locked</span>':'';
  return`<div class="tf-slot tf-slot-compact ${pick?'has-pick':'needs-pick'} is-${teamFantasyEscape_(status)} ${slot.locked?'is-locked':''}" id="${slotId}" data-entry-id="${teamFantasyEscape_(entryId)}" data-position="${teamFantasyEscape_(slot.position)}" data-missing="${pick?'false':'true'}" onclick="teamFantasyHighlightSlot_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}')">
    <strong class="tf-slot-position">${teamFantasyEscape_(slot.label)}</strong>${bulkSelect}
    <span class="tf-slot-status-word">${teamFantasyEscape_(statusWord)}</span>
    <button type="button" class="tf-team-picker-button ${pick?'has-team':''}" ${slot.locked?'disabled aria-disabled="true"':`onclick="event.stopPropagation();teamFantasyHighlightSlot_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}');teamFantasyOpenTeamPicker_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}')"`}>
      ${pick?`${logo?`<img src="${teamFantasyEscape_(logo)}" alt="">`:''}<span class="tf-team-line-r3"><span class="tf-team-name">${teamFantasyEscape_(teamName)}</span>${method?`<span class="tf-origin">${teamFantasyEscape_(method)}</span>`:''}</span><span class="tf-slot-live-line">${teamFantasyEscape_(primary)}</span><span class="tf-slot-points-r3">${teamFantasyScore_(metric.points)} pts</span><span class="tf-slot-usage">${teamFantasyEscape_(usage)}</span>${editLabel}${lockLabel}`:`<span class="tf-pick-empty">+ Choose</span><span class="tf-slot-live-line">${rank}</span><span class="tf-slot-points-r3">0 pts</span>`}
    </button>
  </div>`;
}

function teamFantasyPositionDisplayOrder_() {
  return ['QB','RB','WRTE','K','OL','DL','LB','DB'];
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
}


function teamFantasyOpenFillHelp_(){
  const state=window.TEAM_FANTASY_STATE||{};
  const penalty=Math.max(0,Number(state.settings&&state.settings.autoPickPenaltyPerPosition||0));
  teamFantasyInfoOpen_('Random Pick vs Auto Pick',`<div class="tf-rules-copy"><p><strong>Random Pick</strong> chooses a random valid NFL team. Choose an eligible team at random for this position.</p><p><strong>Auto Pick</strong> chooses the highest-ranked valid available team. Let PATTC choose using this game's automatic-pick rules. <strong>Top Ranked Team Selected</strong> identifies the ranked Auto behavior.</p><p>Both preserve existing Team Fantasy eligibility, reuse, BYE and kickoff-lock rules.</p><p>Current Auto Pick penalty: <strong>-${teamFantasyNumberLabel_(penalty)} point${penalty===1?'':'s'} per Auto Picked position</strong>.</p></div>`);
}

function teamFantasyProtectionWindowLabel_(key) {
  const labels = { 'thursday':'Before Thursday games', 'saturday':'Before Saturday games', 'sunday-early':'Before Sunday early games', 'sunday-afternoon':'Before Sunday afternoon games', 'custom':'Custom deadline' };
  return labels[String(key||'')] || 'Before Sunday early games';
}


function teamFantasyRenderProtection_(state){
  const pref=state.playerAutoFill||{mode:'manual',window:'sunday-early',customLeadMinutes:60,activation:{}};
  const mode=String(pref.mode||'manual'),windowKey=String(pref.window||'sunday-early');
  const custom=Math.max(15,Number(pref.customLeadMinutes||60)),activation=pref.activation||{};
  const penalty=Math.max(0,Number(state.settings&&state.settings.autoPickPenaltyPerPosition||0));
  const warning=mode==='manual'?`<div class="tf-protection-alert"><strong>Backup protection required</strong><span>Choose Auto Pick or Random Pick so PATTC can complete missing positions if you forget. The current backend still permits Manual Only; this warning does not invent enforcement.</span></div>`:`<div class="tf-protection-ok">Protection ON · ${mode==='auto'?'Auto Pick':'Random Pick'} · ${teamFantasyEscape_(activation.label||teamFantasyProtectionWindowLabel_(windowKey))}</div>`;
  return`<section id="teamFantasyProtection" class="card tf-protection-card tf-protection-card-r3">${warning}<div class="tf-card-heading"><div><h2>Missed Lineup Protection</h2><div class="tf-muted">Separate from pressing Random Pick or Auto Pick now. PATTC acts later only if required positions are still empty.</div></div><button type="button" class="tf-help-button" onclick="teamFantasyInfoOpen_('Missed Lineup Protection','<p>This existing safety net fills only positions that are still empty. It never replaces a valid manual pick and still obeys kickoff locks, reuse limits, eligibility and conference restrictions.</p>')">?</button></div><div class="tf-protection-grid-r3"><div class="tf-protection-scope"><small>Scope</small><strong>Entire Season</strong></div><label class="tf-field"><span>Method</span><select id="tfAutoFillMode"><option value="manual" ${mode==='manual'?'selected':''}>Manual Only — Unprotected</option><option value="random" ${mode==='random'?'selected':''}>Random Fill Remaining</option><option value="auto" ${mode==='auto'?'selected':''}>Auto Pick Remaining</option></select></label><label class="tf-field"><span>Timing</span><select id="tfAutoFillWindow" onchange="teamFantasyProtectionWindowChanged_()">${['thursday','saturday','sunday-early','sunday-afternoon','custom'].map(function(key){return`<option value="${key}" ${windowKey===key?'selected':''}>${teamFantasyEscape_(teamFantasyProtectionWindowLabel_(key))}</option>`;}).join('')}</select></label><label id="tfCustomLeadWrap" class="tf-field" ${windowKey==='custom'?'':'hidden'}><span>Minutes before first weekly kickoff</span><input id="tfCustomLeadMinutes" type="number" min="15" max="720" step="15" value="${custom}"></label><div class="tf-protection-penalties"><div><strong>Random Pick penalty:</strong> None</div><div><strong>Auto Pick penalty:</strong> ${penalty>0?'-'+teamFantasyScore_(penalty)+' points per automatically filled position':'None'}</div><div><strong>Scope note:</strong> Current player-settings persistence is season-wide. “This Week Only” requires a backend preference field and is intentionally not faked here.</div></div><button type="button" class="tf-button" onclick="teamFantasySaveProtection_()">Save Protection</button></div><div id="tfProtectionStatus" class="tf-muted">${mode==='manual'?'Manual Only — no automatic protection is active.':teamFantasyEscape_(activation.label||'Automatic fill will wait for the configured NFL window.')}</div></section>`;
}

function teamFantasyProtectionWindowChanged_() {
  const select = document.getElementById('tfAutoFillWindow');
  const wrap = document.getElementById('tfCustomLeadWrap');
  if (wrap) wrap.hidden = !select || select.value !== 'custom';
}

async function teamFantasySaveProtection_() {
  const state = window.TEAM_FANTASY_STATE || {};
  const mode = document.getElementById('tfAutoFillMode');
  const windowEl = document.getElementById('tfAutoFillWindow');
  const custom = document.getElementById('tfCustomLeadMinutes');
  const status = document.getElementById('tfProtectionStatus');
  if (status) status.textContent = 'Saving protection…';
  try {
    const res = await apiTeamFantasyPost_('saveTeamFantasyPick', { gameId:state.gameId, preferenceOnly:true, autoFillMode:mode?mode.value:'manual', autoFillWindow:windowEl?windowEl.value:'sunday-early', customLeadMinutes:custom?Number(custom.value||60):60 });
    if (!res || res.success === false) throw new Error(res && (res.message || res.error) || 'Could not save protection.');
    state.playerAutoFill = res.preference || state.playerAutoFill;
    if (status) status.textContent = res.message || 'Protection saved.';
  } catch (err) { if (status) status.textContent = err && err.message ? err.message : 'Could not save protection.'; }
}


function teamFantasyRenderTopFillControls_(state,lineup){
  if(!lineup||lineup.complete||lineup.postseasonEligible===false)return'';
  const entry=lineup.entry||{},settings=state.settings||{};
  const open=(lineup.slots||[]).filter(function(slot){return !slot.pick&&!slot.locked;});
  if(!open.length)return'';
  return `<div class="tf-top-fill"><div class="tf-lineup-actions">
    ${settings.allowRandomPick?`<button type="button" data-tf-fill-button="1" class="tf-button secondary" title="Choose an eligible team at random for each selected open position." onclick="teamFantasyFillSelected_('${teamFantasyEscape_(entry.entryId)}',true)">Random Fill Selected</button>`:''}
    ${settings.allowSmartAutoPick?`<button type="button" data-tf-fill-button="1" class="tf-button" title="Let PATTC choose using this game's automatic-pick rules for each selected open position." onclick="teamFantasyFillSelected_('${teamFantasyEscape_(entry.entryId)}',false)">Auto Pick Selected</button>`:''}
  </div></div>`;
}

function teamFantasyRenderLineup_(state,lineup){
  const entry=lineup.entry||{},safeId=teamFantasySafeDomId_(entry.entryId);
  if (lineup.postseasonEligible === false) {
    return `<section class="card tf-lineup-card" data-entry-id="${teamFantasyEscape_(entry.entryId)}"><div class="tf-weekly-picks-head"><div><h2>Postseason Complete</h2><div class="tf-weekly-picks-sub">Week ${Number(state.week || 0)}</div></div></div><div class="tf-muted">This entry did not qualify for the postseason in any active Team Fantasy league, so there are no outstanding picks for this week.</div></section>`;
  }
  const order=teamFantasyPositionDisplayOrder_();
  const slots=(lineup.slots||[]).slice().sort(function(a,b){const ai=order.indexOf(String(a.position||'')),bi=order.indexOf(String(b.position||''));return(ai<0?99:ai)-(bi<0?99:bi);});
  const complete=teamFantasyLineupComplete_(lineup);
  return`<section id="teamFantasyLineup_${safeId}" class="card tf-lineup-card ${complete?'is-complete':''}" data-entry-id="${teamFantasyEscape_(entry.entryId)}"><div class="tf-weekly-picks-head"><div><div class="tf-weekly-title-line"><h2>Weekly Picks</h2>${complete?'<span class="tf-lineup-set-badge">Lineup Set · COMPLETE FOR NOW</span>':''}</div><div class="tf-weekly-picks-sub">Week ${Number(state.week||0)} lineup · Blue UPCOMING · Green LIVE · Orange FINAL · tap any selected slot to feature its NFL game</div></div></div><div class="tf-lineup-collapsible"><div class="tf-weekly-help-row"><button type="button" class="tf-help-button" onclick="teamFantasyOpenRules_()">📖 Rules</button><button type="button" class="tf-help-button" onclick="teamFantasyOpenScoring_()">ⓘ Scoring &amp; Position Stats</button><button type="button" class="tf-help-button" onclick="teamFantasyOpenFillHelp_()">? Random / Auto</button></div>${complete?`<div class="tf-lineup-actions"><button class="tf-button" onclick="teamFantasyOpenChanges_('${teamFantasyEscape_(entry.entryId)}')">Make changes before kickoff</button></div>`:`<div class="tf-lineup-actions"><button class="tf-button secondary" onclick="teamFantasyContinuePicks_('${teamFantasyEscape_(entry.entryId)}')">Continue Picks</button></div>`}<div class="tf-slot-grid">${slots.map(function(slot){return teamFantasyRenderSlot_(state,lineup,slot);}).join('')}</div>${teamFantasyRenderTopFillControls_(state,lineup)}<button type="button" class="tf-save-lineup" onclick="teamFantasyCompleteForNow_('${teamFantasyEscape_(entry.entryId)}')"><strong>SAVE LINEUP</strong><span>Picks save as selected • mark Week ${Number(state.week||0)} Complete for Now</span></button><div id="tfFillProgress_${safeId}" class="tf-fill-progress" hidden aria-live="polite"><div class="tf-fill-progress-copy">Building lineup…</div><div class="tf-progress tf-fill-meter"><span></span></div></div></div></section>`;
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

const TEAM_FANTASY_STATE_REQUESTS = Object.create(null);

function teamFantasyStateRequestKey_(gameId, username, leagueId) {
  return [
    String(username || "").trim().toLowerCase(),
    String(gameId || "").trim(),
    String(leagueId || "").trim()
  ].join("|");
}

function teamFantasyLoadState_(gameId, username, leagueId) {
  const key = teamFantasyStateRequestKey_(gameId, username, leagueId);
  if (TEAM_FANTASY_STATE_REQUESTS[key]) return TEAM_FANTASY_STATE_REQUESTS[key];
  const request = Promise.resolve(api("getTeamFantasyState", { gameId: gameId, username: username, leagueId: leagueId }));
  TEAM_FANTASY_STATE_REQUESTS[key] = request;
  request.finally(function() {
    if (TEAM_FANTASY_STATE_REQUESTS[key] === request) delete TEAM_FANTASY_STATE_REQUESTS[key];
  });
  return request;
}

function teamFantasyPrewarmState_(gameId, leagueId) {
  const username = teamFantasyCurrentUser_();
  if (!gameId || !username) return Promise.resolve(null);
  return teamFantasyLoadState_(gameId, username, leagueId);
}


/* RC24A_R3_TEAM_FANTASY_DIRECTOR_REQUIREMENTS */
function teamFantasyPrimaryLineup_(state){
  const list=Array.isArray(state&&state.lineups)?state.lineups:[];
  return list.find(function(x){return x&&x.postseasonEligible!==false&&!teamFantasyLineupComplete_(x);})
    ||list.find(function(x){return x&&x.postseasonEligible!==false;})||list[0]||null;
}
function teamFantasyScoreValue_(state,lineup){
  const gd=window.TEAM_FANTASY_CURRENT_GAME_DAY||{};
  const viewer=(gd.competitors||[]).find(function(c){return c&&c.isViewer;});
  if(viewer&&isFinite(Number(viewer.totalPoints)))return Number(viewer.totalPoints);
  const values=[lineup&&lineup.weekPoints,lineup&&lineup.points,lineup&&lineup.totalPoints,state&&state.weekPoints,state&&state.viewerWeekPoints];
  for(let i=0;i<values.length;i+=1)if(values[i]!==undefined&&values[i]!==null&&values[i]!==''&&isFinite(Number(values[i])))return Number(values[i]);
  return null;
}
function teamFantasySelectedTeam_(slot){
  if(!slot||!slot.pick)return null;
  const abbr=String(slot.pick.teamAbbr||'').toUpperCase();
  return(slot.teams||[]).find(function(t){return String(t&&t.abbr||'').toUpperCase()===abbr;})||null;
}
function teamFantasySelectedGame_(slot){
  const team=teamFantasySelectedTeam_(slot);
  return team&&team.game&&typeof team.game==='object'?team.game:{};
}
function teamFantasyGameKind_(g){
  g=g||{};
  if(g.completed===true||g.final===true)return'final';
  const s=String(g.status||g.state||g.gameStatus||'').toLowerCase();
  if(s.includes('final')||s.includes('complete')||s==='post')return'final';
  if(s.includes('live')||s.includes('progress')||s.includes('halftime')||s.includes('qtr')||s==='in')return'live';
  return'upcoming';
}
function teamFantasyGameKickoff_(g){
  const raw=g&&(g.kickoff||g.gameDateTime||g.dateTime||g.GameDate||g.date)||'';
  const n=raw?Date.parse(raw):NaN;return isFinite(n)?n:0;
}
function teamFantasyGameDayViewer_(entryId){
  const data=window.TEAM_FANTASY_CURRENT_GAME_DAY||{};
  const competitors=Array.isArray(data.competitors)?data.competitors:[];
  return competitors.find(function(c){
    return c&&c.isViewer&&(!entryId||String(c.entryId||'')===String(entryId||''));
  })||competitors.find(function(c){return c&&c.isViewer;})||null;
}
function teamFantasyGameDaySlot_(entryId,position){
  const viewer=teamFantasyGameDayViewer_(entryId);
  return viewer?(viewer.slots||[]).find(function(s){return String(s.position||'')===String(position||'');})||null:null;
}
function teamFantasyPickMethodDisplay_(value){
  const tag=teamFantasyPickMethodTag_(value);
  return tag?('('+tag+')'):'';
}
function teamFantasyPositionMetric_(entryId,slot){
  const live=slot?teamFantasyGameDaySlot_(entryId,slot.position):null;
  const team=teamFantasySelectedTeam_(slot);
  const game=team&&team.game||{};
  let status=live&&live.status?String(live.status):teamFantasyGameKind_(game);
  if(status!=='live'&&status!=='final')status='upcoming';
  const points=live&&isFinite(Number(live.fantasyPoints))?Number(live.fantasyPoints):0;
  const liveRank=live&&Number(live.weekRank||0)>0?Number(live.weekRank):0;
  const preRank=team&&Number(team.rank||0)>0?Number(team.rank):0;
  const rank=liveRank||preRank;
  const method=live&&live.pickMethod?live.pickMethod:(slot&&slot.pick?slot.pick.pickMethod:'');
  return{status:status,points:points,rank:rank,method:method,game:game,team:team,live:live};
}
function teamFantasyFormatKickoff_(game){
  const ms=teamFantasyGameKickoff_(game);
  if(!ms)return'Kickoff TBD';
  const d=new Date(ms);
  return d.toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'});
}
function teamFantasyMetricPrimaryLine_(metric,opponent){
  metric=metric||{};
  const rank=metric.rank?('Rank #'+metric.rank):'Rank —';
  if(metric.status==='live')return'LIVE · '+rank+' · '+teamFantasyScore_(metric.points)+' pts';
  if(metric.status==='final')return'FINAL · '+rank+' · '+teamFantasyScore_(metric.points)+' pts';
  return'UPCOMING · '+rank+' · '+(opponent||teamFantasyFormatKickoff_(metric.game));
}
function teamFantasyDefaultFeaturedSlot_(state,lineup){
  const slots=(lineup&&lineup.slots||[]).filter(function(s){return s&&s.pick;});
  const manual=String(window.TEAM_FANTASY_FEATURED_SLOT||'');
  if(manual){
    const parts=manual.split('|');
    const found=slots.find(function(s){return String(lineup&&lineup.entry&&lineup.entry.entryId||'')===parts[0]&&String(s.position||'')===parts[1];});
    if(found)return found;
  }
  const entryId=String(lineup&&lineup.entry&&lineup.entry.entryId||'');
  const live=slots.find(function(s){return teamFantasyPositionMetric_(entryId,s).status==='live';});
  if(live)return live;
  const future=slots.filter(function(s){return teamFantasyGameKickoff_(teamFantasySelectedGame_(s))>Date.now();})
    .sort(function(a,b){return teamFantasyGameKickoff_(teamFantasySelectedGame_(a))-teamFantasyGameKickoff_(teamFantasySelectedGame_(b));});
  if(future.length)return future[0];
  const finals=slots.filter(function(s){return teamFantasyPositionMetric_(entryId,s).status==='final';})
    .sort(function(a,b){return teamFantasyGameKickoff_(teamFantasySelectedGame_(b))-teamFantasyGameKickoff_(teamFantasySelectedGame_(a));});
  return finals[0]||slots[0]||null;
}
function teamFantasyHighlightSlot_(entryId,position){
  window.TEAM_FANTASY_FEATURED_SLOT=String(entryId||'')+'|'+String(position||'');
  teamFantasyRefreshFeatured_();
}
function teamFantasyRefreshFeatured_(){
  const state=window.TEAM_FANTASY_STATE||{};
  const lineup=teamFantasyPrimaryLineup_(state);
  const old=document.querySelector('.sports-team-fantasy .tf-feature');
  if(!old)return;
  const wrap=document.createElement('div');wrap.innerHTML=teamFantasyFeaturedHtml_(state,lineup).trim();
  if(wrap.firstElementChild)old.replaceWith(wrap.firstElementChild);
}
function teamFantasyFeaturedHtml_(state,lineup){
  const slot=teamFantasyDefaultFeaturedSlot_(state,lineup);
  if(!slot||!slot.pick)return`<div class="tf-feature"><div class="tf-feature-selected">Choose a lineup slot to feature its NFL game.</div></div>`;
  const entryId=String(lineup&&lineup.entry&&lineup.entry.entryId||'');
  const metric=teamFantasyPositionMetric_(entryId,slot);
  const game=metric.game||{};
  const selected=metric.team||{};
  const selectedAbbr=String(slot.pick.teamAbbr||'').toUpperCase();
  const away=String(game.awayAbbr||'').toUpperCase();
  const home=String(game.homeAbbr||'').toUpperCase();
  const opponent=selectedAbbr===home?(away?'vs '+away:''):selectedAbbr===away?(home?'@ '+home:''):'';
  const awayLogo=away?teamFantasyTeamLogoUrl_(away):'';
  const homeLogo=home?teamFantasyTeamLogoUrl_(home):'';
  const method=teamFantasyPickMethodDisplay_(metric.method);
  const status=metric.status.toUpperCase();
  const detail=String(game.status||game.state||'')||(metric.status==='upcoming'?teamFantasyFormatKickoff_(game):'NFL game');
  const hs=game.homeScore!==undefined&&game.homeScore!==null?game.homeScore:'';
  const as=game.awayScore!==undefined&&game.awayScore!==null?game.awayScore:'';
  const scoreAvailable=hs!==''&&as!=='';
  return`<div class="tf-feature">
    <div class="tf-feature-selected"><span>${teamFantasyEscape_(slot.label)} · ${teamFantasyEscape_(selectedAbbr)}</span>${method?`<span class="tf-origin">${teamFantasyEscape_(method)}</span>`:''}</div>
    <div class="tf-feature-matchup">
      <div class="tf-feature-team">${awayLogo?`<img src="${teamFantasyEscape_(awayLogo)}" alt="">`:''}<strong>${teamFantasyEscape_(away||'AWAY')}</strong></div>
      <div class="tf-feature-center"><b>${teamFantasyEscape_(away||selectedAbbr)}</b><span>VS</span><b>${teamFantasyEscape_(home||opponent.replace(/^[@v]s?\s*/i,''))}</b></div>
      <div class="tf-feature-team">${homeLogo?`<img src="${teamFantasyEscape_(homeLogo)}" alt="">`:''}<strong>${teamFantasyEscape_(home||'HOME')}</strong></div>
    </div>
    <div class="tf-feature-status"><span class="tf-live-pill">${teamFantasyEscape_(status)}</span><span>${teamFantasyEscape_(detail)}</span><strong class="tf-game-score">${scoreAvailable?`${teamFantasyEscape_(away)} ${teamFantasyEscape_(as)} – ${teamFantasyEscape_(hs)} ${teamFantasyEscape_(home)}`:teamFantasyEscape_(opponent||teamFantasyFormatKickoff_(game))}</strong></div>
    <div class="tf-feature-fantasy"><div><small>POSITION SCORE</small><strong>${teamFantasyEscape_(slot.label)} · ${teamFantasyScore_(metric.points)} pts</strong></div><div><small>POSITION RANK</small><strong>${metric.rank?'#'+metric.rank:'—'} · ${teamFantasyEscape_(status)}</strong></div></div>
  </div>`;
}
function teamFantasyWeekSummary_(state,lineup){
  const required=Number(lineup&&lineup.required||8),picked=Number(lineup&&lineup.picked||0);
  const pct=required?Math.max(0,Math.min(100,Math.round(picked/required*100))):0;
  const score=teamFantasyScoreValue_(state,lineup);
  return`<section class="tf-week-summary"><div><div class="tf-week-label">WEEK ${Number(state&&state.week||0)} PROGRESS</div><div class="tf-week-value"><strong>${picked} / ${required}</strong></div><div class="tf-week-sub">Slots Filled</div><span class="tf-progress-ring" style="--tf-progress:${pct}%"></span></div><div><div class="tf-week-label">WEEK ${Number(state&&state.week||0)} SCORE</div><div class="tf-week-value"><strong>${score===null?'—':teamFantasyScore_(score)}</strong><span>PTS</span></div><div class="tf-week-sub">Live Team Fantasy total</div></div></section>`;
}
function teamFantasySportsShell_(state){
  const lineup=teamFantasyPrimaryLineup_(state);
  if(!window.PATTCSportsShell)return'';
  const points=teamFantasyScoreValue_(state,lineup);
  return window.PATTCSportsShell.render({className:'sports-shell-team-fantasy',badgeText:'TF',title:'TEAM FANTASY',subtitle:'Pick NFL teams. Score points.',league:'NFL',pointsLabel:points===null?'—':teamFantasyScore_(points),menuAction:"navigate('hub:sports')",syncAction:"teamFantasyLoadGameDay_(true)",featureHtml:teamFantasyFeaturedHtml_(state,lineup)});
}
function teamFantasyCompleteForNow_(entryId){
  const lineup=teamFantasyFindLineup_(entryId);
  if(!lineup||!teamFantasyLineupComplete_(lineup)){teamFantasySetStatus_('Complete all eight NFL-team slots before finishing your lineup.',true);return;}
  teamFantasySetStatus_('Lineup saved — Complete for Now.',false);
}
function teamFantasyScrollToSection_(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
function teamFantasyOpenPlayerCompare_(){window.TEAM_FANTASY_GAME_DAY_VIEW='compare';window.TEAM_FANTASY_COMPARE_ADD_OPEN=false;teamFantasyRenderGameDayIntoMount_();teamFantasyScrollToSection_('teamFantasyStandings');}
function teamFantasySeasonQuickNav_(){
  return`<nav class="tf-season-quicknav" aria-label="Team Fantasy season tools">
    <button onclick="teamFantasyScrollToSection_('teamFantasyProtection')">Protection</button>
    <button onclick="teamFantasyScrollToSection_('teamFantasyHistory')">History</button>
    <button onclick="teamFantasyScrollToSection_('teamFantasyLeaderboard')">Leaderboard</button>
    <button onclick="teamFantasyScrollToSection_('teamFantasyPlayoffs')">Playoffs</button>
    <button onclick="teamFantasyOpenPlayerCompare_()">Compare 2+</button>
  </nav>`;
}
function teamFantasyOpenHowToPlay_(){
  teamFantasyInfoOpen_('How to Play',`<div class="tf-rules-copy"><ol><li>Fill QB, RB, WR/TE, K, OL, DL, LB and DB with NFL teams.</li><li>Manual Select is your deliberate team choice. Random Pick and Auto Pick Now are immediate player actions. Missed Lineup Protection is a separate safety net that acts later only if required slots are still empty.</li><li>Each pick saves through the existing position save flow and locks at that selected team's kickoff.</li><li>During games, position cards show live points and rank from the Team Fantasy game-day scorer.</li><li>Use Save Lineup when all eight are filled to mark the lineup Complete for Now.</li></ol></div>`);
}
function teamFantasyViewerEntryId_(){
  const lineup=teamFantasyPrimaryLineup_(window.TEAM_FANTASY_STATE||{});
  return String(lineup&&lineup.entry&&lineup.entry.entryId||'');
}
function teamFantasyGameDayForWeek_(week){
  week=Number(week||0);
  if(window.TEAM_FANTASY_CURRENT_GAME_DAY&&Number(window.TEAM_FANTASY_CURRENT_GAME_DAY.week||0)===week)return Promise.resolve(window.TEAM_FANTASY_CURRENT_GAME_DAY);
  window.TEAM_FANTASY_WEEK_CACHE=window.TEAM_FANTASY_WEEK_CACHE||{};
  if(window.TEAM_FANTASY_WEEK_CACHE[week])return Promise.resolve(window.TEAM_FANTASY_WEEK_CACHE[week]);
  const state=window.TEAM_FANTASY_STATE||{};
  return api('getTeamFantasyGameDayState',{gameId:state.gameId,username:state.username||teamFantasyCurrentUser_(),week:week,leagueId:state.selectedLeagueId}).then(function(res){
    if(!res||res.success===false)throw new Error(res&&(res.message||res.error)||'Could not load Team Fantasy week.');
    window.TEAM_FANTASY_WEEK_CACHE[week]=res;return res;
  });
}
function teamFantasyWeekChips_(weeks,selected,handler,season){
  const values=(weeks||[]).slice().sort(function(a,b){return b-a;});
  return`<div class="tf-week-chip-row">${values.map(function(w){return`<button class="tf-week-chip ${Number(w)===Number(selected)?'is-active':''}" onclick="${handler}(${Number(w)})">Week ${Number(w)}</button>`;}).join('')}${season?`<button class="tf-week-chip ${selected==='season'?'is-active':''}" onclick="${handler}('season')">Season</button>`:''}</div>`;
}
async function teamFantasyLoadHistoryWeek_(week){
  const mount=document.getElementById('tfHistoryMount');if(!mount)return;
  mount.innerHTML='<div class="tf-muted">Loading archived lineup…</div>';
  try{
    const data=await teamFantasyGameDayForWeek_(week);
    window.TEAM_FANTASY_HISTORY_WEEK=Number(week);
    const viewer=(data.competitors||[]).find(function(c){return c&&c.isViewer;});
    const leader=(data.weeklyLeaderboard&&data.weeklyLeaderboard.rows||[]).find(function(r){return r&&r.isViewer;});
    if(!viewer){mount.innerHTML='<div class="tf-muted">No archived lineup found for this week.</div>';return;}
    const allFinal=(viewer.slots||[]).filter(function(s){return !s.empty;}).every(function(s){return s.status==='final';});
    mount.innerHTML=teamFantasyWeekChips_(data.availableWeeks||[],week,'teamFantasyLoadHistoryWeek_',false)+
      `<div class="tf-history-week-head"><strong>Week ${Number(week)} · ${allFinal?'FINAL':'IN PROGRESS'} · ${teamFantasyScore_(viewer.totalPoints)} pts</strong><span>${leader&&leader.weekRank?'#'+leader.weekRank+' weekly finish':'Rank —'}</span></div>`+
      `<div class="tf-history-slots">${(viewer.slots||[]).map(function(s){if(s.empty)return`<div class="tf-history-slot"><div class="pos">${teamFantasyEscape_(s.label)}</div><div class="main">No pick</div></div>`;const method=teamFantasyPickMethodDisplay_(s.pickMethod);return`<div class="tf-history-slot"><div class="pos">${teamFantasyEscape_(s.label)}</div><div class="main">${teamFantasyEscape_(s.teamAbbr)} ${teamFantasyEscape_(method)}</div><div class="meta">${teamFantasyScore_(s.fantasyPoints)} pts · ${s.weekRank?'Rank #'+s.weekRank:'Rank —'} · ${teamFantasyEscape_(String(s.status||'').toUpperCase())}</div></div>`;}).join('')}</div>`;
  }catch(err){mount.innerHTML=`<div class="tf-warning">${teamFantasyEscape_(err&&err.message||'Could not load history.')}</div>`;}
}
function teamFantasyRenderHistoryShell_(state){
  const current=Math.max(1,Number(state&&state.week||1));
  const selected=Math.max(1,Number(window.TEAM_FANTASY_HISTORY_WEEK||Math.max(1,current-1)));
  setTimeout(function(){teamFantasyLoadHistoryWeek_(selected);},80);
  return`<section id="teamFantasyHistory" class="tf-season-card"><h2>History</h2><div class="tf-muted">Archived weekly lineups use the actual saved picks and scored week data.</div><div id="tfHistoryMount"></div></section>`;
}
function teamFantasyRenderSeasonLeaderboard_(state){
  const standings=state&&state.standings||{};
  const rows=Array.isArray(standings.rows)?standings.rows:[];
  return`<div class="tf-leaderboard-list">${rows.map(function(r){return`<div class="tf-leader-row"><span class="rank">#${Number(r.rank||0)||'—'}</span><span class="name">${teamFantasyEscape_(r.name||r.username||r.entryId||'Player')}</span><span class="value">${teamFantasyScore_(r.regularPoints!==undefined?r.regularPoints:r.fantasyPoints)} pts · ${Number(r.regularWins||0)}-${Number(r.regularLosses||0)}-${Number(r.regularTies||0)}</span></div>`;}).join('')||'<div class="tf-muted">Season standings are not available yet.</div>'}</div>`;
}
async function teamFantasyLoadLeaderboard_(key){
  const mount=document.getElementById('tfLeaderboardMount');if(!mount)return;
  const state=window.TEAM_FANTASY_STATE||{};
  if(key==='season'){
    window.TEAM_FANTASY_LEADERBOARD_KEY='season';
    mount.innerHTML=teamFantasyWeekChips_((window.TEAM_FANTASY_CURRENT_GAME_DAY&&window.TEAM_FANTASY_CURRENT_GAME_DAY.availableWeeks)||[], 'season','teamFantasyLoadLeaderboard_',true)+teamFantasyRenderSeasonLeaderboard_(state);
    return;
  }
  const week=Math.max(1,Number(key||state.week||1));
  mount.innerHTML='<div class="tf-muted">Loading weekly leaderboard…</div>';
  try{
    const data=await teamFantasyGameDayForWeek_(week);
    window.TEAM_FANTASY_LEADERBOARD_KEY=week;
    const rows=data.weeklyLeaderboard&&Array.isArray(data.weeklyLeaderboard.rows)?data.weeklyLeaderboard.rows:[];
    const live=rows.some(function(r){return r.counts&&Number(r.counts.live||0)>0;});
    mount.innerHTML=teamFantasyWeekChips_(data.availableWeeks||[],week,'teamFantasyLoadLeaderboard_',true)+`<div class="tf-history-week-head"><strong>${live?'LIVE ':''}WEEK ${week}</strong><span>${rows.length} players</span></div><div class="tf-leaderboard-list">${rows.map(function(r){return`<div class="tf-leader-row"><span class="rank">#${Number(r.weekRank||0)||'—'}</span><span class="name">${teamFantasyEscape_(r.label||r.entryId)}</span><span class="value">${teamFantasyScore_(r.points)} pts</span></div>`;}).join('')}</div>`;
  }catch(err){mount.innerHTML=`<div class="tf-warning">${teamFantasyEscape_(err&&err.message||'Could not load leaderboard.')}</div>`;}
}
function teamFantasyRenderLeaderboardShell_(state){
  const current=Math.max(1,Number(state&&state.week||1));
  setTimeout(function(){teamFantasyLoadLeaderboard_(current);},110);
  return`<section id="teamFantasyLeaderboard" class="tf-season-card"><h2>Leaderboard</h2><div class="tf-muted">Current week, frozen past weeks, and cumulative season standings.</div><div id="tfLeaderboardMount"></div></section>`;
}
function teamFantasyRenderPlayoffPicture_(state){
  const standings=state&&state.standings||{},rows=Array.isArray(standings.rows)?standings.rows:[];
  const league=standings.league||{},cutoff=Math.max(0,Number(league.playoffTeams||0));
  const qualifierIds={};(standings.qualifiers||[]).forEach(function(id){qualifierIds[String(id)]=true;});
  return`<section id="teamFantasyPlayoffs" class="tf-season-card"><h2>Playoff Picture</h2><div class="tf-muted">Uses the authoritative Team Fantasy standings/qualifier output for ${teamFantasyEscape_(league.leagueName||'this league')}.</div><div class="tf-playoff-list">${rows.map(function(r){
    const qualified=r.playoffQualified===true||qualifierIds[String(r.competitorId||'')]===true;
    const atCutoff=cutoff>0&&Number(r.rank||0)===cutoff;
    const status=qualified?(Number(state.week||0)>Number(state.settings&&state.settings.regularSeasonEndWeek||18)?'Clinched':'Currently In'):'Currently Out';
    return`<div class="tf-playoff-row ${qualified?'is-in':''} ${atCutoff?'is-cutoff':''}"><span class="rank">#${Number(r.rank||0)||'—'}</span><span class="name">${teamFantasyEscape_(r.name||r.username||r.entryId||'Player')}<span class="tf-playoff-status">${teamFantasyEscape_(status)}${atCutoff?' · PLAYOFF LINE':''}</span></span><span class="value">${Number(r.regularWins||0)}-${Number(r.regularLosses||0)}-${Number(r.regularTies||0)} · ${teamFantasyScore_(r.regularPoints||0)} pts</span></div>`;
  }).join('')||'<div class="tf-muted">Playoff standings are not available yet.</div>'}</div><div class="tf-data-note">No playoff formula is recalculated in the browser; qualification comes from Team Fantasy standings.</div></section>`;
}
function teamFantasyRefreshLivePresentation_(){
  const state=window.TEAM_FANTASY_STATE||{};
  const data=window.TEAM_FANTASY_CURRENT_GAME_DAY||{};
  if(Number(data.week||0)!==Number(state.week||0))return;
  const zone=document.getElementById('teamFantasyLineupZone');
  if(zone)zone.innerHTML=(state.lineups||[]).map(function(lineup){return teamFantasyRenderLineup_(state,lineup);}).join('');
  const summary=document.querySelector('.sports-team-fantasy .tf-week-summary');
  if(summary){const wrap=document.createElement('div');wrap.innerHTML=teamFantasyWeekSummary_(state,teamFantasyPrimaryLineup_(state)).trim();if(wrap.firstElementChild)summary.replaceWith(wrap.firstElementChild);}
  teamFantasyRefreshFeatured_();
}


async function renderTeamFantasyPage(){
  const gameId=typeof getFrontendGameId==='function'?getFrontendGameId():'';
  const leagueId=typeof getFrontendLeagueId==='function'?getFrontendLeagueId():'';
  const username=teamFantasyCurrentUser_();
  if(!gameId||!username)return`<div class="page"><div class="card">Open a Team Fantasy game after signing in.</div></div>`;
  if(typeof setPageLoadStep==='function')setPageLoadStep(48,'Loading Team Fantasy lineup…');
  const res=await teamFantasyLoadState_(gameId,username,leagueId);
  if (!res || res.success === false) return `<div class="page tf-page" data-page-load-failed="true"><div class="card"><h1>Team Fantasy Football</h1><div>${teamFantasyEscape_(res&&(res.message||res.error)||'Could not load Team Fantasy.')}</div></div></div>`;
  window.TEAM_FANTASY_STATE = res;
  window.TEAM_FANTASY_GAME_DAY_WEEK = Number(res.week || 1);
  window.TEAM_FANTASY_GAME_DAY = null;
  window.TEAM_FANTASY_CURRENT_GAME_DAY = null;
  setTimeout(function(){teamFantasyLoadGameDay_(false);},60);
  const primary=teamFantasyPrimaryLineup_(res);
  return`<div class="page tf-page sports-team-fantasy" data-sports-shell-root="team-fantasy">
    ${teamFantasySportsShell_(res)}
    ${teamFantasyWeekSummary_(res,primary)}
    <div id="teamFantasyLineupZone">${(res.lineups||[]).map(function(lineup){return teamFantasyRenderLineup_(res,lineup);}).join('')}</div>
    ${teamFantasySeasonQuickNav_()}
    ${teamFantasyRenderProtection_(res)}
    ${teamFantasyRenderLeaderboardShell_(res)}
    ${teamFantasyRenderPlayoffPicture_(res)}
    ${teamFantasyRenderHistoryShell_(res)}
    <section id="teamFantasyStandings" class="card tf-game-day-card"><div class="tf-game-day-title"><div><h2>STANDINGS &amp; PLAYER COMPARE</h2><div class="tf-muted">Weekly standings and lineup comparison. Opponent picks stay hidden until kickoff. Compare 2+ other league players in the selected league.</div></div></div><div id="tfGameDayMount"><div class="tf-muted">Loading cached game-day scores…</div></div></section>
    ${teamFantasyIsAdmin_()?`<section class="card tf-test-lab-card"><div class="tf-card-heading"><div><h2>Team Fantasy Test Lab</h2><div class="tf-muted">In-memory tests only.</div></div><button class="tf-button" onclick="teamFantasyRunTestLab_()">Run Team Fantasy Test Lab</button></div><div id="tfTestLabMount"></div></section>`:''}
    <div id="teamFantasyResults">${teamFantasyRenderWeekHistory_(res)}</div>
    <nav class="tf-secondary-nav" aria-label="Team Fantasy help"><button type="button" onclick="teamFantasyOpenRules_()"><span class="tf-secondary-icon">i</span><span class="tf-secondary-copy"><strong>RULES</strong><span>View game rules and scoring</span></span><span class="tf-secondary-arrow">›</span></button><button type="button" onclick="teamFantasyOpenHowToPlay_()"><span class="tf-secondary-icon">?</span><span class="tf-secondary-copy"><strong>HOW TO PLAY</strong><span>Learn Manual Select, Random/Auto Now, protection, live scoring and season tools</span></span><span class="tf-secondary-arrow">›</span></button></nav>
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

function teamFantasyFindLineup_(entryId) {
  return (window.TEAM_FANTASY_STATE && window.TEAM_FANTASY_STATE.lineups || []).find(function(item){ return String(item.entry && item.entry.entryId || '') === String(entryId || ''); }) || null;
}

function teamFantasySetSlotSaving_(entryId, position, saving) {
  const slot = document.getElementById('tf-' + String(entryId||'').replace(/[^a-z0-9_-]/gi,'-') + '-' + String(position||''));
  if (!slot) return;
  slot.classList.toggle('is-saving', !!saving);
  const button = slot.querySelector('.tf-team-picker-button');
  if (button) button.disabled = !!saving;
  let savingEl = slot.querySelector('.tf-saving-label');
  if (saving && !savingEl) { savingEl = document.createElement('span'); savingEl.className='tf-saving-label'; savingEl.textContent='Saving…'; slot.appendChild(savingEl); }
  if (!saving && savingEl) savingEl.remove();
}

function teamFantasyApplySavedPickResponse_(res) {
  const lineup = teamFantasyFindLineup_(res && res.entryId);
  if (!lineup) return false;
  const slot = (lineup.slots || []).find(function(item){ return String(item.position||'') === String(res.position||''); });
  if (!slot) return false;
  const previous = String(res.previousTeamAbbr || (slot.pick && slot.pick.teamAbbr) || '');
  const next = String(res.teamAbbr || '');
  const limit = Math.max(1, Number(res.usageLimit || ((window.TEAM_FANTASY_STATE||{}).settings||{}).teamUseLimit || 1));
  (slot.teams || []).forEach(function(team) {
    const abbr = String(team.abbr || '');
    if (abbr === previous && previous !== next) { team.current=false; team.uses=Math.max(0,Number(team.uses||0)-1); team.usesRemaining=Math.min(limit,Number(team.usesRemaining||0)+1); }
    if (abbr === next && previous !== next) { team.current=true; team.uses=Number(team.uses||0)+1; team.usesRemaining=Math.max(0,Number(team.usesRemaining||0)-1); }
  });
  slot.pick = res.savedPick || { teamAbbr:next, teamName:next, locked:false, pickMethod:'manual' };
  slot.locked = !!(slot.pick && slot.pick.locked);
  lineup.picked = Number(res.picked !== undefined ? res.picked : (lineup.slots||[]).filter(function(item){return !!item.pick;}).length);
  lineup.required = Number(res.required || lineup.required || (lineup.slots||[]).length);
  lineup.complete = res.complete === true || lineup.picked >= lineup.required;
  lineup.missing = (res.missingPositions || []).map(function(pos){ const found=(lineup.slots||[]).find(function(item){return item.position===pos;}); return found ? found.label : pos; });
  return true;
}


function teamFantasyRefreshLineupCard_(entryId){
  const state=window.TEAM_FANTASY_STATE||{},lineup=teamFantasyFindLineup_(entryId);
  const old=document.querySelector('.tf-lineup-card[data-entry-id="'+String(entryId).replace(/[^a-zA-Z0-9_-]/g,'')+'"]');
  if(!lineup||!old)return;
  old.outerHTML=teamFantasyRenderLineup_(state,lineup);
  const summary=document.querySelector('.tf-week-summary');
  if(summary){
    const wrap=document.createElement('div');wrap.innerHTML=teamFantasyWeekSummary_(state,teamFantasyPrimaryLineup_(state)).trim();
    if(wrap.firstElementChild)summary.replaceWith(wrap.firstElementChild);
  }
}

async function teamFantasySaveSlot_(entryId, position, teamAbbr) {
  if (!teamAbbr) return;
  const state = window.TEAM_FANTASY_STATE || {};
  teamFantasySetSlotSaving_(entryId, position, true);
  teamFantasySetStatus_('Saving ' + position + '…', false);
  try {
    const res = await apiTeamFantasyPost_('saveTeamFantasyPick', { gameId: state.gameId, week: state.week, entryId: entryId, position: position, teamAbbr: teamAbbr, pickMethod: 'manual' });
    if (!res || res.success === false) throw new Error(res && (res.message || res.error) || 'Could not save that pick.');
    teamFantasyApplySavedPickResponse_(res);
    teamFantasyRefreshLineupCard_(entryId);
    teamFantasySetStatus_('Saved ' + position + ' — ' + teamAbbr + '.', false);
  } catch (err) {
    teamFantasySetSlotSaving_(entryId, position, false);
    teamFantasySetStatus_(err && err.message ? err.message : 'Could not save that pick. Your previous selection is unchanged.', true);
  }
}

async function teamFantasyFillPosition_(entryId, position, randomOnly) {
  const state = window.TEAM_FANTASY_STATE || {};
  const slot = teamFantasyFindSlot_(entryId, position);
  if (!slot || slot.pick || slot.locked) { teamFantasySetStatus_('Choose an open, unlocked position to fill.', true); return; }
  const label = slot.label || position;
  const penalty = Math.max(0, Number(state.settings && state.settings.autoPickPenaltyPerPosition || 0));
  const confirmText = randomOnly
    ? `You are about to select RANDOM. This will automatically pick any eligible team from the available list. No points are deducted.

Position: ${label}\nOnly this position will be filled.`
    : `You are about to select AUTO PICK. This will automatically select the top-ranked eligible team available. Auto Pick carries a points penalty.

Position: ${label}
Penalty: -${teamFantasyNumberLabel_(penalty)} point${penalty===1?'':'s'}`;
  if (typeof window.confirm === 'function' && !window.confirm(confirmText)) return;
  teamFantasyCloseTeamPicker_();
  teamFantasySetSlotSaving_(entryId, position, true);
  teamFantasySetStatus_((randomOnly ? 'Random Pick' : 'Auto Pick') + ' ' + label + '…', false);
  try {
    const action = randomOnly ? 'randomTeamFantasyPicks' : 'autoPickTeamFantasy';
    const res = await apiTeamFantasyPost_(action, { gameId:state.gameId, week:state.week, entryId:entryId, positions:[position] });
    if (!res || res.success === false || Number(res.saved||0) < 1) throw new Error(res && (res.message || res.error) || 'No valid team was available for ' + label + '.');
    (res.results || []).forEach(teamFantasyApplySavedPickResponse_);
    teamFantasyRefreshLineupCard_(entryId);
    teamFantasySetStatus_((randomOnly ? 'Random Pick' : 'Auto Pick') + ' saved for ' + label + '.', false);
  } catch (err) {
    teamFantasySetSlotSaving_(entryId, position, false);
    teamFantasySetStatus_(err && err.message ? err.message : 'Could not fill ' + label + '.', true);
  }
}

function teamFantasyContinuePicks_(entryId) {
  const card = document.querySelector('.tf-lineup-card[data-entry-id="' + String(entryId).replace(/[^a-zA-Z0-9_-]/g, '') + '"]');
  const target = card && card.querySelector('.tf-slot[data-missing="true"]');
  if (!target) { teamFantasySetStatus_('This lineup is complete.', false); return; }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const select = target.querySelector('select');
  if (select) setTimeout(function(){ select.focus(); }, 350);
}

function teamFantasySelectedOpenPositions_(entryId) {
  const lineup = teamFantasyFindLineup_(entryId);
  const selected = [];
  document.querySelectorAll('[data-tf-bulk-position="1"][data-entry-id="' + String(entryId).replace(/"/g,'') + '"]:checked').forEach(function(input){
    const position = String(input.getAttribute('data-position') || '');
    const slot = lineup && (lineup.slots || []).find(function(item){ return item.position === position; });
    if (slot && !slot.pick && !slot.locked && selected.indexOf(position) === -1) selected.push(position);
  });
  return selected;
}

async function teamFantasyFillSelected_(entryId, randomOnly) {
  const state = window.TEAM_FANTASY_STATE || {};
  const positions = teamFantasySelectedOpenPositions_(entryId);
  if (!positions.length) { teamFantasySetStatus_('Select at least one open position first.', true); return; }
  const lineup = teamFantasyFindLineup_(entryId);
  const labels = positions.map(function(pos){ const slot=(lineup.slots||[]).find(function(item){return item.position===pos;}); return slot ? slot.label : pos; });
  const penalty = Math.max(0, Number(state.settings && state.settings.autoPickPenaltyPerPosition || 0));
  const totalPenalty = penalty * positions.length;
  const text = randomOnly
    ? `You are about to select RANDOM. This will automatically pick any eligible team from the available list. No points are deducted.

Positions: ${labels.join(', ')}`
    : `You are about to select AUTO PICK. This will automatically select the top-ranked eligible team available. Auto Pick carries a points penalty.

Positions: ${labels.join(', ')}
${positions.length} positions × ${teamFantasyNumberLabel_(penalty)} points = -${teamFantasyNumberLabel_(totalPenalty)} points`;
  if (typeof window.confirm === 'function' && !window.confirm(text)) return;
  const progress = teamFantasyStartFillProgress_(entryId, randomOnly ? 'Randomizing selected positions…' : 'Building ranked Auto Picks…');
  teamFantasySetStatus_(randomOnly ? 'Randomizing selected positions…' : 'Building ranked Auto Picks…', false);
  const action = randomOnly ? 'randomTeamFantasyPicks' : 'autoPickTeamFantasy';
  try {
    const res = await apiTeamFantasyPost_(action, { gameId: state.gameId, week: state.week, entryId: entryId, positions: positions });
    if (!res || res.success === false) throw new Error(res && (res.message || res.error) || 'Could not fill selected positions.');
    (res.results || []).forEach(teamFantasyApplySavedPickResponse_);
    teamFantasyRefreshLineupCard_(entryId);
    const saved = Number(res.saved || 0);
    teamFantasyFinishFillProgress_(progress, 'Saved ' + saved + ' selected position' + (saved === 1 ? '' : 's') + '.', false);
    teamFantasySetStatus_('Saved ' + saved + ' selected position' + (saved === 1 ? '' : 's') + '.', false);
  } catch (err) {
    teamFantasyFinishFillProgress_(progress, err && err.message ? err.message : 'Could not fill selected positions.', true);
    teamFantasySetStatus_(err && err.message ? err.message : 'Could not fill selected positions.', true);
  }
}

async function teamFantasyFill_(entryId, randomOnly) {
  return teamFantasyFillSelected_(entryId, randomOnly);
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

function teamFantasyLineupComplete_(lineup) {
  const slots = Array.isArray(lineup && lineup.slots) ? lineup.slots : [];
  return slots.length > 0 && slots.every(function(slot){ return !!slot.pick; });
}

function teamFantasyLineupCollapsed_(lineup) {
  const entryId = lineup && lineup.entry ? lineup.entry.entryId : '';
  if (!teamFantasyLineupComplete_(lineup)) return false;
  window.TEAM_FANTASY_LINEUP_OPEN = window.TEAM_FANTASY_LINEUP_OPEN || {};
  if (window.TEAM_FANTASY_LINEUP_OPEN[entryId] === true) return false;
  if (window.TEAM_FANTASY_LINEUP_OPEN[entryId] === false) return true;
  return true;
}

function teamFantasyOpenChanges_(entryId) {
  const lineup = (window.TEAM_FANTASY_STATE && window.TEAM_FANTASY_STATE.lineups || []).find(function(item){return String(item.entry && item.entry.entryId || '')===String(entryId||'');});
  if (!lineup) return;
  const editable = (lineup.slots||[]).filter(function(slot){return !slot.locked;});
  if (!editable.length) { teamFantasySetStatus_('All lineup positions are locked by kickoff.', true); return; }
  window.TEAM_FANTASY_LINEUP_OPEN = window.TEAM_FANTASY_LINEUP_OPEN || {};
  window.TEAM_FANTASY_LINEUP_CHANGE_MODE = window.TEAM_FANTASY_LINEUP_CHANGE_MODE || {};
  window.TEAM_FANTASY_LINEUP_OPEN[entryId] = true;
  window.TEAM_FANTASY_LINEUP_CHANGE_MODE[entryId] = true;
  teamFantasyRefreshLineupCard_(entryId);
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

function teamFantasyGameDayWeekPicker_(data) {
  const state = window.TEAM_FANTASY_STATE || {};
  let weeks = Array.isArray(data && data.availableWeeks) ? data.availableWeeks.map(Number).filter(function(w){ return w > 0; }) : [];
  if (!weeks.length) {
    const maxWeek = Math.max(1, Number(state.week || data && data.week || 1));
    for (let w = 1; w <= maxWeek; w++) weeks.push(w);
  }
  weeks = Array.from(new Set(weeks)).sort(function(a,b){ return b-a; });
  const selected = Number(data && data.week || window.TEAM_FANTASY_GAME_DAY_WEEK || state.week || weeks[weeks.length-1] || 1);
  return `<label class="tf-week-picker"><span>Week</span><select onchange="teamFantasyGameDaySelectWeek_(this.value)">${weeks.map(function(week){ const label = Number(week)===Number((window.TEAM_FANTASY_STATE||{}).week) ? `Week ${week} — CURRENT WEEK` : `Week ${week}`; return `<option value="${week}" ${Number(week)===selected?'selected':''}>${label}</option>`; }).join('')}</select></label>`;
}

async function teamFantasyGameDaySelectWeek_(week) {
  const state = window.TEAM_FANTASY_STATE || {};
  const data = window.TEAM_FANTASY_GAME_DAY || {};
  const selectedWeek = Math.max(1, Math.floor(Number(week || state.week || 1)));
  const leagueId = data.selectedLeagueId || state.selectedLeagueId;
  const mount = document.getElementById('tfGameDayMount');
  window.TEAM_FANTASY_GAME_DAY_WEEK = selectedWeek;
  if (mount) mount.innerHTML = '<div class="tf-muted">Loading Week ' + selectedWeek + '…</div>';
  try {
    const res = await api('getTeamFantasyGameDayState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: selectedWeek, leagueId: leagueId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not load that week.');
    window.TEAM_FANTASY_GAME_DAY = res;
    window.TEAM_FANTASY_GAME_DAY_WEEK = Number(res.week || selectedWeek);
    teamFantasyRenderGameDayIntoMount_();
    teamFantasyStartGameDayPolling_(Number(res.pollAfterMs || 300000));
  } catch (err) {
    if (mount) mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Could not load that week.')}</div>`;
  }
}

function teamFantasyViewerWeekHistory_(state) {
  state = state || {};
  const standings = state.standings || {};
  const rows = Array.isArray(standings.rows) ? standings.rows : [];
  const username = String(state.username || teamFantasyCurrentUser_() || '').trim().toLowerCase();
  const viewerEntryIds = {};
  (state.entries || []).forEach(function(entry){ viewerEntryIds[String(entry.entryId || entry.EntryId || '')] = true; });
  const viewerRows = rows.filter(function(row){
    const entryId = String(row.entryId || '');
    const rowUser = String(row.username || '').trim().toLowerCase();
    return (entryId && viewerEntryIds[entryId]) || (!!username && rowUser === username);
  });
  const history = [];
  viewerRows.forEach(function(row){
    (row.weekly || []).forEach(function(item){
      const week = Number(item.week || 0);
      const score = Number(item.score || 0);
      const fieldScores = rows.map(function(r){
        const found = (r.weekly || []).filter(function(w){ return Number(w.week) === week; })[0];
        return found ? Number(found.score || 0) : null;
      }).filter(function(v){ return v !== null; });
      const rank = fieldScores.length ? 1 + fieldScores.filter(function(v){ return v > score; }).length : 0;
      history.push({ week: week, score: score, rank: rank, fieldSize: fieldScores.length, entryId: row.entryId || '', label: row.entryId || row.username || 'Entry' });
    });
  });
  history.sort(function(a,b){ if (b.week !== a.week) return b.week-a.week; return String(a.label).localeCompare(String(b.label)); });
  return history;
}

function teamFantasyRenderWeekHistory_(state) {
  const rows = teamFantasyViewerWeekHistory_(state);
  if (!rows.length) return `<section class="card tf-week-history-card"><div class="tf-card-heading"><div><h2>Week History</h2><div class="tf-muted">Completed weekly scores will appear here.</div></div></div></section>`;
  const multipleEntries = new Set(rows.map(function(row){ return row.entryId || row.label; })).size > 1;
  const regularEnd = Number(state && state.settings && state.settings.regularSeasonEndWeek || 18);
  return `<section class="card tf-week-history-card"><div class="tf-card-heading"><div><h2>Week History</h2><div class="tf-muted">Your completed Team Fantasy weeks.</div></div></div><div class="tf-table-wrap"><table class="tf-table tf-history-table"><thead><tr><th>Week</th>${multipleEntries?'<th>Entry</th>':''}<th>Pts</th><th>Week Rank</th><th>Phase</th></tr></thead><tbody>${rows.map(function(row){ return `<tr><td>Week ${Number(row.week||0)}</td>${multipleEntries?`<td>${teamFantasyEscape_(row.label)}</td>`:''}<td>${teamFantasyScore_(row.score)}</td><td>${row.rank?'#'+row.rank+(row.fieldSize?' / '+row.fieldSize:''):'—'}</td><td>${Number(row.week||0) <= regularEnd ? 'Regular' : 'Postseason'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
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
    const res = await api('getTeamFantasyGameDayState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: Number((window.TEAM_FANTASY_GAME_DAY && window.TEAM_FANTASY_GAME_DAY.week) || window.TEAM_FANTASY_GAME_DAY_WEEK || state.week), leagueId: leagueId });
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
    return `<div class="tf-week-row ${row.isViewer?'is-you':''}"><div class="tf-week-rank">#${Number(row.weekRank||0)}</div><div class="tf-week-name"><strong>${teamFantasyEscape_(row.label || row.entryId)}</strong><span class="tf-week-record">${Number(record.wins||0)}-${Number(record.losses||0)}-${Number(record.ties||0)}</span></div><div class="tf-week-points">${teamFantasyScore_(row.points)}<span>pts</span></div><div class="tf-week-counts"><span class="is-final">${Number(counts.final||0)}F</span><span class="is-live">${Number(counts.live||0)}L</span><span class="is-upcoming">${Number(counts.upcoming||0)}U</span></div><div class="tf-week-gap">${teamFantasyEscape_(gap)}<span>${teamFantasyEscape_(lower)}</span></div></div>`;
  }).join('')}</div>`;
}


function teamFantasyCompareAddTeam_(entryId){
  const data=window.TEAM_FANTASY_GAME_DAY||{};
  const competitor=(data.competitors||[]).find(function(c){return c&&c.entryId===entryId;});
  if(!competitor||competitor.isViewer)return;
  const selected=teamFantasyCompareDefaultSelection_(data).slice();
  if(selected.indexOf(entryId)===-1&&selected.length<6)selected.push(entryId);
  window.TEAM_FANTASY_COMPARE_SELECTED=selected;
  window.TEAM_FANTASY_COMPARE_ADD_OPEN=false;
  teamFantasyRenderGameDayIntoMount_();
}


function teamFantasyCompareRemoveTeam_(entryId){
  const data=window.TEAM_FANTASY_GAME_DAY||{};
  let selected=teamFantasyCompareDefaultSelection_(data).filter(function(id){return id!==entryId;});
  if(selected.length<2){
    const other=(data.competitors||[]).filter(function(c){return c&&!c.isViewer&&selected.indexOf(c.entryId)===-1;})[0];
    if(other)selected.push(other.entryId);
  }
  window.TEAM_FANTASY_COMPARE_SELECTED=selected.slice(0,6);
  teamFantasyRenderGameDayIntoMount_();
}

function teamFantasyToggleAddTeamMenu_() {
  window.TEAM_FANTASY_COMPARE_ADD_OPEN = !window.TEAM_FANTASY_COMPARE_ADD_OPEN;
  teamFantasyRenderGameDayIntoMount_();
}


function teamFantasyCompareDefaultSelection_(data){
  const competitors=Array.isArray(data&&data.competitors)?data.competitors:[];
  const others=competitors.filter(function(c){return c&&!c.isViewer;});
  let ids=Array.isArray(window.TEAM_FANTASY_COMPARE_SELECTED)?window.TEAM_FANTASY_COMPARE_SELECTED.slice():[];
  ids=ids.filter(function(id){return others.some(function(c){return c.entryId===id;});}).slice(0,6);
  if(ids.length<2)ids=others.slice(0,Math.min(2,others.length)).map(function(c){return c.entryId;});
  window.TEAM_FANTASY_COMPARE_SELECTED=ids;
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
  const selected = competitors.filter(function(c){ return selectedIds.indexOf(c.entryId) !== -1; }).sort(function(a,b){
    if (a.isViewer !== b.isViewer) return a.isViewer ? -1 : 1;
    return selectedIds.indexOf(a.entryId) - selectedIds.indexOf(b.entryId);
  });
  if (selected.length < 2) return `<div class="tf-warning">Choose at least 2 teams to compare.</div>`;
  return `<div class="tf-compare-scroll"><div class="tf-compare-board">${selected.map(function(c){
    const record = c.record || { wins:0, losses:0, ties:0 };
    const rank = Number(c.leagueRank || 0) > 0 ? '#' + Number(c.leagueRank) : '#—';
    return `<article class="tf-compare-team ${c.isViewer?'is-viewer':''}"><div class="tf-compare-team-head"><div class="tf-team-head-name"><strong>${teamFantasyEscape_(c.label || c.entryId)}</strong>${!c.isViewer?`<button class="tf-remove-team" type="button" title="Remove" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button>`:''}</div><div class="tf-compare-total">${teamFantasyScore_(c.totalPoints)} pts</div><div class="tf-compare-record">${rank} · ${Number(record.wins||0)}-${Number(record.losses||0)}-${Number(record.ties||0)}</div></div><div class="tf-compare-slots">${(c.slots||[]).map(teamFantasyRenderCompareSlot_).join('')}</div></article>`;
  }).join('')}</div></div>`;
}


function teamFantasyRenderGameDayIntoMount_(){
  const mount=document.getElementById('tfGameDayMount'),data=window.TEAM_FANTASY_GAME_DAY;
  if(!mount||!data)return;
  const view = window.TEAM_FANTASY_GAME_DAY_VIEW || 'league';
  const competitors=Array.isArray(data.competitors)?data.competitors:[];
  const otherPlayers=competitors.filter(function(c){return c&&!c.isViewer;});
  const selected=teamFantasyCompareDefaultSelection_(data);
  const available=otherPlayers.filter(function(c){return selected.indexOf(c.entryId)===-1;});
  const addMenu=view==='compare'&&window.TEAM_FANTASY_COMPARE_ADD_OPEN&&selected.length < 6
    ?`<div class="tf-add-team-menu">${available.map(function(c){return`<button type="button" onclick="teamFantasyCompareAddTeam_('${teamFantasyEscape_(c.entryId)}')">${teamFantasyEscape_(c.label||c.entryId)}</button>`;}).join('')||'<span>No more players available.</span>'}</div>`:'';
  mount.innerHTML=`<div class="tf-game-day-sticky"><div class="tf-game-day-tabs"><button class="${view==='league'?'is-active':''}" onclick="teamFantasySetGameDayView_('league')">Weekly Standings</button><button class="${view==='compare'?'is-active':''}" onclick="teamFantasySetGameDayView_('compare')">Compare</button></div><div class="tf-game-day-filters">${teamFantasyGameDayLeaguePicker_(data)}${teamFantasyGameDayWeekPicker_(data)}</div><button class="tf-refresh-mini" onclick="teamFantasyLoadGameDay_(true)" title="Refresh cached scores">↻</button></div><div class="tf-mini-status-legend"><span class="is-final"></span>F <span class="is-live"></span>L <span class="is-upcoming"></span>U</div>${view==='league'?teamFantasyRenderWeeklyLeague_(data):`<div class="tf-compare-add-row"><span>${selected.length} player${selected.length===1?'':'s'} selected</span>${selected.length < 6?'<button class="tf-button secondary" onclick="teamFantasyToggleAddTeamMenu_()">+ Add Team</button>':''}</div>${addMenu}${otherPlayers.length<2?'<div class="tf-muted">At least two other league players are needed for lineup comparison.</div>':`<div id="tfCompareBoard">${teamFantasyRenderCompareBoard_(data,selected)}</div>`}<div class="tf-muted tf-privacy-note">${teamFantasyEscape_(data.privacy||'Unlocked opponent picks stay hidden until kickoff.')}</div>`}`;
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
    const requestedWeek = Math.max(1, Math.floor(Number(window.TEAM_FANTASY_GAME_DAY_WEEK || state.week || 1)));
    const res = await api('getTeamFantasyGameDayState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: requestedWeek, leagueId: state.selectedLeagueId });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not load game-day comparison.');
    window.TEAM_FANTASY_GAME_DAY = res;
    window.TEAM_FANTASY_GAME_DAY_WEEK = Number(res.week || requestedWeek);
    teamFantasyRenderGameDayIntoMount_();
    teamFantasyStartGameDayPolling_(Number(res.pollAfterMs || 300000));
  } catch (err) {
    mount.innerHTML = `<div class="tf-warning">${teamFantasyEscape_(err && err.message ? err.message : 'Could not load game-day comparison.')}</div>`;
  }
}

function teamFantasyStartGameDayPolling_(delay) {
  if (window.TEAM_FANTASY_GAME_DAY_TIMER) clearInterval(window.TEAM_FANTASY_GAME_DAY_TIMER);
  window.TEAM_FANTASY_GAME_DAY_TIMER = null;
  const state = window.TEAM_FANTASY_STATE || {};
  const data = window.TEAM_FANTASY_GAME_DAY || {};
  if (Number(data.week || 0) !== Number(state.week || 0)) return;
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
}

/* =========================================================
   PATTC SPORTS RICH FAMILY — SHARED FRONTEND RUNTIME
   Art R3 / RC23 runtime certification

   Clean / Current remains the default.
   Sports Rich activates only from the existing per-game Appearance
   assignment. No second settings/backend system is created.

   Presentation-only. No Sports Engine, scoring, odds, settlement,
   game rules, saves, locks, auth, or automation logic lives here.

   RC23 ownership:
   - accept the actual nested Appearance runtime bundle;
   - after prepare() receives a successful live bundle, that current
     per-GameId bundle wins over stale page-payload Appearance;
   - preserve supplied/page Appearance as the offline/failure fallback;
   - allow Clean -> Rich -> Clean for the same GameId without storage clears.
   ========================================================= */
(function initializePattcSportsRich_(global) {
  "use strict";

  if (!global || global.PATTCSportsRich) return;

  const cache = Object.create(null);
  const inflight = Object.create(null);
  const fresh = Object.create(null);

  const AUTO_PALETTES = Object.freeze({
    sports: { primary:"#2398ff", secondary:"#0b6f91", accent:"#76c8ff" },
    nfl: { primary:"#168bff", secondary:"#16834b", accent:"#83cbff" },
    ncaaf: { primary:"#b82d3d", secondary:"#bb8a25", accent:"#f0c963" },
    nba: { primary:"#ef7b2d", secondary:"#b9363e", accent:"#ffb05f" },
    ncaab: { primary:"#2878d7", secondary:"#e97828", accent:"#71b9ff" },
    mlb: { primary:"#326fd1", secondary:"#b52f42", accent:"#77b4ff" },
    nhl: { primary:"#52b9e8", secondary:"#1d7d9b", accent:"#b0ebff" },
    soccer: { primary:"#27b77a", secondary:"#128eaa", accent:"#71efc2" },
    racing: { primary:"#e53b43", secondary:"#d49b22", accent:"#ffd75a" },
    golf: { primary:"#26945a", secondary:"#987927", accent:"#dfc764" }
  });

  function text_(value) {
    return value == null ? "" : String(value).trim();
  }

  function key_(value) {
    return text_(value).toLowerCase().replace(/[_/\s]+/g, "-");
  }

  function object_(value) {
    return value && typeof value === "object" ? value : {};
  }

  function parseObject_(value) {
    if (!value) return {};
    if (value && typeof value === "object") return value;
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function appearanceLayers_(bundle) {
    const layers = [];
    let current = object_(bundle);
    let depth = 0;

    while (current && typeof current === "object" && depth < 6) {
      layers.push(current);
      if (!current.appearance || typeof current.appearance !== "object" || current.appearance === current) break;
      current = current.appearance;
      depth += 1;
    }

    return layers;
  }

  function appearanceRoot_(bundle) {
    const layers = appearanceLayers_(bundle);
    return layers.length ? layers[layers.length - 1] : {};
  }

  function addSource_(list, source) {
    if (!source || typeof source !== "object") return;
    if (list.indexOf(source) === -1) list.push(source);
  }

  function addThemeSources_(list, source) {
    source = object_(source);
    const override = parseObject_(
      source.ThemeOverrideJSON ||
      source.themeOverrideJSON ||
      source.themeOverrideJson ||
      source.ThemeOverride ||
      source.themeOverride ||
      ""
    );
    const assignment = object_(source.assignment);
    const assignmentOverride = parseObject_(
      assignment.ThemeOverrideJSON ||
      assignment.themeOverrideJSON ||
      assignment.themeOverrideJson ||
      assignment.ThemeOverride ||
      assignment.themeOverride ||
      ""
    );

    addSource_(list, override);
    addSource_(list, object_(override.sports));
    addSource_(list, object_(override.colors));
    addSource_(list, assignmentOverride);
    addSource_(list, object_(assignmentOverride.sports));
    addSource_(list, object_(assignmentOverride.colors));
    addSource_(list, source);
    addSource_(list, object_(source.sports));
    addSource_(list, object_(source.colors));
    addSource_(list, object_(source.theme));
    addSource_(list, object_(source.theme && source.theme.sports));
    addSource_(list, object_(source.theme && source.theme.colors));
    addSource_(list, object_(source.resolvedTheme));
    addSource_(list, object_(source.resolvedTheme && source.resolvedTheme.sports));
    addSource_(list, object_(source.resolvedTheme && source.resolvedTheme.colors));
    addSource_(list, assignment);
  }

  function sources_(bundle) {
    const output = [];
    appearanceLayers_(bundle).forEach(function(layer) {
      addThemeSources_(output, layer);
    });
    addThemeSources_(output, appearanceRoot_(bundle));
    return output;
  }

  function first_(bundle, keys) {
    const sources = sources_(bundle);
    for (let s = 0; s < sources.length; s += 1) {
      for (let k = 0; k < keys.length; k += 1) {
        const value = sources[s][keys[k]];
        if (value !== undefined && value !== null && text_(value)) return value;
      }
    }
    return "";
  }

  function safeColor_(value) {
    const raw = text_(value);
    if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
    if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s+-]+\)$/i.test(raw)) return raw;
    return "";
  }

  function layoutValue_(bundle) {
    return key_(first_(bundle, [
      "SportsLayoutTemplate",
      "sportsLayoutTemplate",
      "SportsLayout",
      "sportsLayout",
      "SportsPlayerLayout",
      "sportsPlayerLayout",
      "LayoutTemplate",
      "layoutTemplate"
    ]));
  }

  function isRichValue_(value) {
    const raw = key_(value);
    return (
      raw === "sports-rich" ||
      raw === "rich" ||
      raw === "art" ||
      raw === "sports-art" ||
      raw === "rich-art" ||
      raw === "sports-rich-art"
    );
  }

  function isCleanValue_(value) {
    const raw = key_(value);
    return (
      !raw ||
      raw === "clean" ||
      raw === "current" ||
      raw === "default" ||
      raw === "classic" ||
      raw === "legacy"
    );
  }

  function remember_(gameId, bundle, options) {
    const id = text_(gameId);
    if (!id || !bundle || typeof bundle !== "object") return bundle || null;
    cache[id] = bundle;
    if (options && options.fresh === true) fresh[id] = true;
    try {
      sessionStorage.setItem("pattcGameAppearance:" + id, JSON.stringify(bundle));
    } catch (err) {}
    return bundle;
  }

  function cached_(gameId) {
    const id = text_(gameId);
    if (!id) return null;
    if (cache[id]) return cache[id];

    try {
      const raw = sessionStorage.getItem("pattcGameAppearance:" + id);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          cache[id] = parsed;
          return parsed;
        }
      }
    } catch (err) {}

    return null;
  }

  async function prepare_(gameId, existingBundle) {
    const id = text_(gameId);
    if (!id) return existingBundle || null;

    if (existingBundle && typeof existingBundle === "object") {
      remember_(id, existingBundle);
    }

    const fallback = existingBundle || cached_(id) || null;

    // Kent/shared transport owns how apiGetGameAppearance reaches the backend.
    // Sports runtime owns what happens after a correct bundle is supplied.
    if (typeof apiGetGameAppearance !== "function") return fallback;

    fresh[id] = false;

    if (!inflight[id]) {
      inflight[id] = Promise.resolve(apiGetGameAppearance(id))
        .then(function(result) {
          if (result && result.success !== false) {
            return remember_(id, result, { fresh: true });
          }
          return null;
        })
        .catch(function(err) {
          console.warn("Sports Rich Appearance load skipped", err);
          return null;
        })
        .finally(function() {
          delete inflight[id];
        });
    }

    const current = await inflight[id];
    return current || fallback;
  }

  function appearance_(gameId, provided) {
    const id = text_(gameId);
    const remembered = cached_(id);

    // Once prepare() has received the live per-GameId bundle, that bundle is
    // authoritative for this render. Page payloads can legitimately contain an
    // older Appearance snapshot and must not pin Clean/Rich after a switch.
    if (id && fresh[id] === true && remembered) return remembered;

    return provided || remembered || null;
  }

  function isRich_(gameId, provided) {
    const bundle = appearance_(gameId, provided);
    if (!bundle) return false;
    return isRichValue_(layoutValue_(bundle));
  }

  function leagueKey_(sport, league) {
    const raw = key_([sport, league].filter(Boolean).join(" "));
    if (/(ncaaf|cfb|college-football|ncaa-football)/.test(raw)) return "ncaaf";
    if (/(nfl|football)/.test(raw)) return "nfl";
    if (/(ncaab|cbb|college-basketball|ncaa-basketball)/.test(raw)) return "ncaab";
    if (/(nba|basketball)/.test(raw)) return "nba";
    if (/(mlb|baseball)/.test(raw)) return "mlb";
    if (/(nhl|hockey)/.test(raw)) return "nhl";
    if (/(mls|epl|uefa|soccer|premier-league)/.test(raw)) return "soccer";
    if (/(f1|formula|nascar|indycar|racing|motorsport)/.test(raw)) return "racing";
    if (/(pga|lpga|golf)/.test(raw)) return "golf";
    return "sports";
  }

  function colors_(gameId, provided, sport, league) {
    const bundle = appearance_(gameId, provided) || {};
    const auto = AUTO_PALETTES[leagueKey_(sport, league)] || AUTO_PALETTES.sports;

    return {
      primary: safeColor_(first_(bundle, [
        "SportsPrimaryColor", "sportsPrimaryColor", "PrimaryColor", "primaryColor", "primary"
      ])) || auto.primary,
      secondary: safeColor_(first_(bundle, [
        "SportsSecondaryColor", "sportsSecondaryColor", "SecondaryColor", "secondaryColor", "secondary"
      ])) || auto.secondary,
      accent: safeColor_(first_(bundle, [
        "SportsAccentColor", "sportsAccentColor", "AccentColor", "accentColor", "accent"
      ])) || auto.accent
    };
  }

  function assets_(gameId, provided) {
    const bundle = appearance_(gameId, provided) || {};
    return {
      hero: text_(first_(bundle, [
        "SportsHeroImageUrl", "sportsHeroImageUrl", "HeroImageUrl", "heroImageUrl",
        "BackgroundImageUrl", "backgroundImageUrl", "BannerImageUrl", "bannerImageUrl"
      ])),
      logo: text_(first_(bundle, [
        "SportsLogoUrl", "sportsLogoUrl", "LogoImageUrl", "logoImageUrl",
        "LogoUrl", "logoUrl"
      ]))
    };
  }

  function styleAttr_(gameId, provided, sport, league) {
    const colors = colors_(gameId, provided, sport, league);
    return 'style="--sports-rich-primary:' + colors.primary +
      ';--sports-rich-secondary:' + colors.secondary +
      ';--sports-rich-accent:' + colors.accent + '"';
  }

  function img_(source, options) {
    if (!source || typeof platformImgHtml !== "function") return "";
    return platformImgHtml(source, options || {});
  }

  function bgAttrs_(source, cssVariable) {
    if (!source || typeof platformBackgroundAttrs !== "function") return "";
    return platformBackgroundAttrs(source, {
      variant: "hero",
      cssVariable: cssVariable || "--sports-rich-hero-image",
      eager: true
    });
  }

  function process_(root) {
    const canQuery = typeof document !== "undefined" && document && typeof document.querySelector === "function";
    const node = typeof root === "string" ? (canQuery ? document.querySelector(root) : null) : root;
    if (
      node &&
      global.PlatformImageEngine &&
      typeof global.PlatformImageEngine.process === "function"
    ) {
      global.PlatformImageEngine.process(node);
    }
  }

  function afterMount_(selector, callback) {
    if (typeof document === "undefined" || !document || typeof document.querySelector !== "function") return;
    setTimeout(function() {
      if (typeof document === "undefined" || !document || typeof document.querySelector !== "function") return;
      const node = document.querySelector(selector);
      if (!node) return;
      process_(node);
      if (typeof callback === "function") callback(node);
    }, 0);
  }

  function formatKickoff_(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return text_(value);
    try {
      return d.toLocaleString([], {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (err) {
      return d.toLocaleString();
    }
  }

  function teamLogoUrl_(abbr, league) {
    const key = text_(abbr).toUpperCase();
    if (!key) return "";
    const leagueKey = key_(league || "nfl");
    if (leagueKey.indexOf("nfl") !== -1 || !leagueKey) {
      const slug = key === "WAS" ? "wsh" : key.toLowerCase();
      return "https://a.espncdn.com/i/teamlogos/nfl/500/" + encodeURIComponent(slug) + ".png";
    }
    return "";
  }

  global.PATTCSportsRich = {
    version: "rc23-sports-rich-runtime-9020031",
    prepare: prepare_,
    remember: remember_,
    cached: cached_,
    appearance: appearance_,
    layoutValue: layoutValue_,
    isRichValue: isRichValue_,
    isCleanValue: isCleanValue_,
    isRich: isRich_,
    colors: colors_,
    assets: assets_,
    styleAttr: styleAttr_,
    img: img_,
    bgAttrs: bgAttrs_,
    process: process_,
    afterMount: afterMount_,
    formatKickoff: formatKickoff_,
    teamLogoUrl: teamLogoUrl_,
    leagueKey: leagueKey_
  };
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));

/* =========================================================
   TEAM FANTASY — SPORTS RICH ART R3
   PATTC Team Fantasy uses NFL TEAMS by position, not players.

   Existing state/save/lock/Random Pick/Auto Pick/game-day mechanics
   remain the source of truth.
   ========================================================= */

function sportsRichTfSafeColor_(value) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : "";
}

function sportsRichTfGameId_() {
  const state = window.TEAM_FANTASY_STATE || {};
  return String(
    state.gameId ||
    (typeof getFrontendGameId === "function" ? getFrontendGameId() : "") ||
    ""
  ).trim();
}

function sportsRichTfEnabled_(state) {
  state = state || window.TEAM_FANTASY_STATE || {};
  const gameId = String(state.gameId || sportsRichTfGameId_()).trim();
  return !!(
    window.PATTCSportsRich &&
    PATTCSportsRich.isRich(gameId, state.appearance || null)
  );
}

function sportsRichTfSelectedTeam_(slot) {
  if (!slot || !slot.pick) return null;
  return (slot.teams || []).find(function(team) {
    return String(team && team.abbr || "").toUpperCase() ===
      String(slot.pick.teamAbbr || "").toUpperCase();
  }) || null;
}

function sportsRichTfUsage_(team) {
  team = team || {};
  const used = Math.max(0, Number(team.uses || 0));
  const left = Math.max(0, Number(team.usesRemaining || 0));
  const limit = Math.max(used + left, Number(team.useLimit || 0));
  return {
    used: used,
    left: left,
    limit: limit,
    text: limit ? used + "/" + limit + " used · " + left + " left" : (left + " left")
  };
}

function sportsRichTfTeamColor_(team) {
  team = team || {};
  return sportsRichTfSafeColor_(
    team.color ||
    team.primaryColor ||
    team.teamColor ||
    team.brandColor ||
    ""
  );
}

function sportsRichTfLogo_(abbr, className, critical) {
  const url = typeof teamFantasyTeamLogoUrl_ === "function"
    ? teamFantasyTeamLogoUrl_(abbr)
    : PATTCSportsRich.teamLogoUrl(abbr, "NFL");

  return PATTCSportsRich.img(url, {
    className: className || "tf-rich-team-logo",
    variant: "logo",
    alt: String(abbr || "") + " logo",
    critical: critical === true
  });
}

function sportsRichTfSlotHtml_(state, lineup, slot) {
  const entry = lineup.entry || {};
  const pick = slot.pick || null;
  const team = sportsRichTfSelectedTeam_(slot);
  const position = String(slot.position || "");
  const label = String(slot.label || position || "Position");
  const entryId = String(entry.entryId || "");
  const locked = slot.locked === true;
  const method = pick && typeof teamFantasyPickMethodTag_ === "function"
    ? teamFantasyPickMethodTag_(pick.pickMethod)
    : "";
  const opponent = team && typeof teamFantasyOpponentText_ === "function"
    ? teamFantasyOpponentText_(team)
    : "";
  const game = team && team.game || {};
  const kickoff = PATTCSportsRich.formatKickoff(
    game.kickoff ||
    game.gameDateTime ||
    game.dateTime ||
    team && team.kickoff ||
    ""
  );
  const usage = sportsRichTfUsage_(team || {});
  const teamColor = sportsRichTfTeamColor_(team);
  const slotId = "tf-" + String(entryId).replace(/[^a-z0-9_-]/gi, "-") + "-" + position;

  if (!pick) {
    return `<article
      class="tf-slot tf-slot-compact tf-rich-slot needs-pick"
      id="${teamFantasyEscape_(slotId)}"
      data-entry-id="${teamFantasyEscape_(entryId)}"
      data-position="${teamFantasyEscape_(position)}"
      data-missing="true"
    >
      <div class="tf-rich-slot-top">
        <span class="tf-rich-position">${teamFantasyEscape_(label)}</span>
        <span class="tf-rich-slot-state">OPEN</span>
      </div>
      <button
        type="button"
        class="tf-team-picker-button tf-rich-empty-slot"
        onclick="teamFantasyOpenTeamPicker_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}')"
        ${locked ? "disabled" : ""}
      >
        <span class="tf-rich-empty-plus">＋</span>
        <strong>${locked ? "No team saved" : "Choose NFL team"}</strong>
        <small>${locked ? "Kickoff lock has passed" : "Team use is tracked for this position"}</small>
      </button>
      ${!locked ? `<label class="tf-bulk-select tf-rich-bulk" title="Include ${teamFantasyEscape_(label)} in Random Pick / Auto Pick">
        <input type="checkbox" data-tf-bulk-position="1" data-entry-id="${teamFantasyEscape_(entryId)}" data-position="${teamFantasyEscape_(position)}" checked>
        <span>Include in fill actions</span>
      </label>` : ""}
    </article>`;
  }

  const logo = sportsRichTfLogo_(pick.teamAbbr, "tf-rich-team-logo");
  const score = pick.points !== undefined && pick.points !== null
    ? Number(pick.points)
    : (slot.points !== undefined && slot.points !== null ? Number(slot.points) : null);
  const scoreHtml = Number.isFinite(score)
    ? `<span class="tf-rich-slot-score">${teamFantasyScore_(score)} <small>pts</small></span>`
    : "";
  const style = teamColor ? ` style="--tf-team-color:${teamFantasyEscape_(teamColor)}"` : "";

  return `<article
    class="tf-slot tf-slot-compact tf-rich-slot has-pick ${locked ? "is-locked" : "is-editable"}"
    id="${teamFantasyEscape_(slotId)}"
    data-entry-id="${teamFantasyEscape_(entryId)}"
    data-position="${teamFantasyEscape_(position)}"
    data-missing="false"
    ${style}
  >
    <div class="tf-rich-slot-top">
      <span class="tf-rich-position">${teamFantasyEscape_(label)}</span>
      <span class="tf-rich-slot-state ${locked ? "is-locked" : "is-picked"}">${locked ? "LOCKED" : "PICKED"}</span>
    </div>

    <button
      type="button"
      class="tf-team-picker-button tf-rich-team-button"
      ${locked ? "disabled" : `onclick="teamFantasyOpenTeamPicker_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}')"`}
    >
      <span class="tf-rich-logo-wrap">${logo}</span>
      <span class="tf-rich-team-copy">
        <span class="tf-rich-team-line">
          <strong>${teamFantasyEscape_(pick.teamAbbr || "")}</strong>
          ${method ? `<span class="tf-pick-method">${teamFantasyEscape_(method)}</span>` : ""}
          ${scoreHtml}
        </span>
        <span class="tf-rich-matchup">${teamFantasyEscape_(opponent || "Matchup pending")}</span>
        ${kickoff ? `<small>${teamFantasyEscape_(kickoff)}</small>` : ""}
      </span>
      <span class="tf-rich-chevron">${locked ? "🔒" : "›"}</span>
    </button>

    <div class="tf-rich-usage ${usage.left <= 0 ? "is-exhausted" : usage.left === 1 ? "is-low" : ""}">
      <span>Season use</span>
      <strong>${teamFantasyEscape_(usage.text)}</strong>
    </div>
  </article>`;
}

function sportsRichTfPickerHtml_(entryId, position) {
  const slot = typeof teamFantasyFindSlot_ === "function"
    ? teamFantasyFindSlot_(entryId, position)
    : null;
  if (!slot || slot.locked) return "";

  const teams = typeof teamFantasyPickerTeams_ === "function"
    ? teamFantasyPickerTeams_(slot)
    : (slot.teams || []);
  const current = slot.pick ? String(slot.pick.teamAbbr || "") : "";
  const settings = (window.TEAM_FANTASY_STATE || {}).settings || {};

  const rows = teams.map(function(team) {
    const bye = typeof teamFantasyPickerIsBye_ === "function"
      ? teamFantasyPickerIsBye_(team)
      : false;
    const usage = sportsRichTfUsage_(team);
    const selected = current === String(team.abbr || "");
    const color = sportsRichTfTeamColor_(team);
    const style = color ? ` style="--tf-team-color:${teamFantasyEscape_(color)}"` : "";
    const logo = sportsRichTfLogo_(team.abbr, "tf-rich-picker-logo");
    const opponent = bye
      ? "BYE"
      : (typeof teamFantasyOpponentText_ === "function" ? teamFantasyOpponentText_(team) : "");
    const game = team.game || {};
    const kickoff = PATTCSportsRich.formatKickoff(
      game.kickoff || game.gameDateTime || game.dateTime || ""
    );

    return `<button
      type="button"
      class="tf-picker-team tf-rich-picker-team ${selected ? "is-selected" : ""} ${bye ? "is-bye" : ""} ${usage.left <= 0 ? "is-exhausted" : usage.left === 1 ? "uses-left-1" : ""}"
      ${style}
      ${bye ? `disabled aria-disabled="true"` : `onclick="teamFantasyChooseTeam_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}','${teamFantasyEscape_(team.abbr)}')"`}
    >
      <span class="tf-rich-picker-logo-wrap">${logo}</span>
      <span class="tf-rich-picker-main">
        <strong>${teamFantasyEscape_(team.abbr || team.name || "")}</strong>
        <small>${teamFantasyEscape_(opponent || "Opponent TBD")}${kickoff ? " · " + teamFantasyEscape_(kickoff) : ""}</small>
      </span>
      <span class="tf-rich-picker-usage">
        <strong>${teamFantasyEscape_(usage.left)}</strong>
        <small>uses left</small>
      </span>
    </button>`;
  }).join("");

  const fillActions = !slot.pick ? `<div class="tf-picker-fill-actions tf-rich-picker-actions">
    ${settings.allowRandomPick ? `<button type="button" class="tf-button secondary" onclick="teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}',true)">Random Pick ${teamFantasyEscape_(slot.label || position)}</button>` : ""}
    ${settings.allowSmartAutoPick ? `<button type="button" class="tf-button" onclick="teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}',false)">Auto Pick ${teamFantasyEscape_(slot.label || position)}</button>` : ""}
    <button type="button" class="tf-help-button" onclick="teamFantasyOpenFillHelp_()">?</button>
  </div>` : "";

  return `<div id="tfTeamPickerOverlay" class="tf-picker-overlay tf-rich-picker-overlay" role="presentation" onclick="if(event.target===this)teamFantasyCloseTeamPicker_()">
    <section class="tf-picker-sheet tf-rich-picker-sheet" role="dialog" aria-modal="true" aria-label="Choose ${teamFantasyEscape_(slot.label || position)} team">
      <div class="tf-picker-head tf-rich-picker-head">
        <div>
          <span class="sports-rich-kicker">NFL TEAM FANTASY</span>
          <strong>${teamFantasyEscape_(slot.label || position)}</strong>
          <small>Choose a team with season usage still available.</small>
        </div>
        <button type="button" class="tf-picker-close" onclick="teamFantasyCloseTeamPicker_()" aria-label="Close">×</button>
      </div>
      <div class="tf-picker-list tf-rich-picker-list">${rows || `<div class="tf-muted">No teams available.</div>`}</div>
      ${fillActions}
    </section>
  </div>`;
}

function sportsRichTfSummaryHtml_(state) {
  state = state || window.TEAM_FANTASY_STATE || {};
  const lineups = Array.isArray(state.lineups) ? state.lineups : [];
  let required = 0;
  let picked = 0;
  let locked = 0;

  lineups.forEach(function(lineup) {
    required += Number(lineup.required || (lineup.slots || []).length || 0);
    picked += Number(lineup.picked || (lineup.slots || []).filter(function(slot){ return !!slot.pick; }).length || 0);
    locked += (lineup.slots || []).filter(function(slot){ return slot.locked === true; }).length;
  });

  const pct = required ? Math.round((picked / required) * 100) : 0;
  const gameDay = window.TEAM_FANTASY_GAME_DAY || {};
  const viewer = (gameDay.competitors || []).find(function(row) { return row.isViewer; }) || {};
  const counts = viewer.counts || viewer.statusCounts || {};
  const weekScore = viewer.points !== undefined && viewer.points !== null
    ? teamFantasyScore_(viewer.points)
    : "—";
  const weekRank = Number(viewer.weekRank || 0);
  const open = Math.max(0, required - picked);
  const stateLabel = required && picked >= required
    ? "COMPLETE FOR NOW"
    : picked
      ? "SAVED / IN PROGRESS"
      : "OPEN";

  return `<section id="tfRichWeeklySummary" class="tf-rich-week-summary">
    <div class="tf-rich-week-main">
      <span class="sports-rich-kicker">WEEK ${Number(state.week || 0)} LINEUP</span>
      <strong>${picked}/${required || 8} positions set</strong>
      <div class="sports-rich-progress"><span style="width:${pct}%"></span></div>
      <small>${open ? open + " position" + (open === 1 ? "" : "s") + " still open" : "All eight NFL-team slots are set"}</small>
    </div>

    <div class="tf-rich-score-stat">
      <span>Weekly score</span>
      <strong>${weekScore}</strong>
      <small>${weekRank ? "#" + weekRank + " this week" : "updates from game-day scoring"}</small>
    </div>

    <div class="tf-rich-live-stat">
      <span>Game status</span>
      <strong>${Number(counts.final || 0)}F · ${Number(counts.live || 0)}L · ${Number(counts.upcoming || 0)}U</strong>
      <small>${locked} slot${locked === 1 ? "" : "s"} locked</small>
    </div>

    <span class="sports-rich-state ${stateLabel === "COMPLETE FOR NOW" ? "is-complete" : ""}">${stateLabel}</span>
  </section>`;
}

function sportsRichTfDecoratePageHtml_(html, state) {
  const gameId = String(state && state.gameId || sportsRichTfGameId_());
  const appearance = PATTCSportsRich.appearance(gameId, state && state.appearance || null);
  const assets = PATTCSportsRich.assets(gameId, appearance);
  const style = PATTCSportsRich.styleAttr(gameId, appearance, "football", "NFL");
  const bg = PATTCSportsRich.bgAttrs(assets.hero, "--sports-rich-hero-image");

  let output = String(html || "")
    .replace(
      '<div class="page tf-page">',
      `<div class="page tf-page sports-rich-team-fantasy" ${style}>`
    )
    .replace(
      '<header class="tf-hero card">',
      `<header class="tf-hero card tf-rich-hero sports-rich-hero-bg" ${bg}>`
    )
    .replace(new RegExp("Random " + "Fill Selected", "g"), "Random Pick Selected")
    .replace(/Random\/Auto Fill Selected/g, "Random Pick / Auto Pick");

  output = output.replace(
    "</header>",
    "</header>" + sportsRichTfSummaryHtml_(state)
  );

  return output;
}

function sportsRichTfUpdateSummary_() {
  if (!sportsRichTfEnabled_()) return;
  const current = document.getElementById("tfRichWeeklySummary");
  if (!current) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = sportsRichTfSummaryHtml_(window.TEAM_FANTASY_STATE || {}).trim();
  if (wrap.firstElementChild) current.replaceWith(wrap.firstElementChild);
  PATTCSportsRich.process(document.querySelector(".sports-rich-team-fantasy"));
}

/* ---------- Rich-only renderer wrappers ---------- */

const SPORTS_RICH_TF_ORIGINAL_SLOT_ = teamFantasyRenderSlot_;
teamFantasyRenderSlot_ = function(state, lineup, slot) {
  if (!sportsRichTfEnabled_(state)) {
    return SPORTS_RICH_TF_ORIGINAL_SLOT_(state, lineup, slot);
  }
  return sportsRichTfSlotHtml_(state, lineup, slot);
};

const SPORTS_RICH_TF_ORIGINAL_ORDER_ = teamFantasyPositionDisplayOrder_;
teamFantasyPositionDisplayOrder_ = function() {
  if (sportsRichTfEnabled_()) {
    return ["QB", "RB", "WRTE", "K", "OL", "DL", "LB", "DB"];
  }
  return SPORTS_RICH_TF_ORIGINAL_ORDER_();
};

const SPORTS_RICH_TF_ORIGINAL_PICKER_ = teamFantasyOpenTeamPicker_;
teamFantasyOpenTeamPicker_ = function(entryId, position) {
  if (!sportsRichTfEnabled_()) {
    return SPORTS_RICH_TF_ORIGINAL_PICKER_(entryId, position);
  }
  const slot = teamFantasyFindSlot_(entryId, position);
  if (!slot || slot.locked) return;
  teamFantasyCloseTeamPicker_();
  document.body.insertAdjacentHTML("beforeend", sportsRichTfPickerHtml_(entryId, position));
  PATTCSportsRich.process(document.getElementById("tfTeamPickerOverlay"));
};

const SPORTS_RICH_TF_ORIGINAL_GAMEDAY_RENDER_ = teamFantasyRenderGameDayIntoMount_;
teamFantasyRenderGameDayIntoMount_ = function() {
  const result = SPORTS_RICH_TF_ORIGINAL_GAMEDAY_RENDER_.apply(this, arguments);
  sportsRichTfUpdateSummary_();
  return result;
};

const SPORTS_RICH_TF_ORIGINAL_PAGE_ = renderTeamFantasyPage;
renderTeamFantasyPage = async function() {
  const gameId = typeof getFrontendGameId === "function" ? getFrontendGameId() : "";
  await PATTCSportsRich.prepare(gameId);

  const html = await SPORTS_RICH_TF_ORIGINAL_PAGE_.apply(this, arguments);
  const state = window.TEAM_FANTASY_STATE || {};
  if (!PATTCSportsRich.isRich(gameId, state.appearance || null)) return html;

  const output = sportsRichTfDecoratePageHtml_(html, state);
  PATTCSportsRich.afterMount(".sports-rich-team-fantasy", sportsRichTfUpdateSummary_);
  return output;
};

/* RC24A_R3_RUNTIME_WRAPPERS */
(function(){
  const originalLoad=teamFantasyLoadGameDay_;
  teamFantasyLoadGameDay_=async function(manual){
    const result=await originalLoad.apply(this,arguments);
    const state=window.TEAM_FANTASY_STATE||{},data=window.TEAM_FANTASY_GAME_DAY||{};
    if(Number(data.week||0)===Number(state.week||0)){
      window.TEAM_FANTASY_CURRENT_GAME_DAY=data;
      window.TEAM_FANTASY_WEEK_CACHE=window.TEAM_FANTASY_WEEK_CACHE||{};
      window.TEAM_FANTASY_WEEK_CACHE[Number(data.week||0)]=data;
      teamFantasyRefreshLivePresentation_();
    }
    return result;
  };
})();

/* RC24A_R3_FINAL_DEFAULT_OVERRIDES */
teamFantasyRenderSlot_ = function(state,lineup,slot){
  const entry=lineup.entry||{},pick=slot.pick||null;
  const entryId=String(entry.entryId||'');
  const slotId='tf-'+entryId.replace(/[^a-z0-9_-]/gi,'-')+'-'+slot.position;
  const metric=teamFantasyPositionMetric_(entryId,slot);
  const team=metric.team;
  const opponent=team?teamFantasyOpponentText_(team):'';
  const logo=pick?teamFantasyTeamLogoUrl_(pick.teamAbbr):'';
  const method=pick?teamFantasyPickMethodDisplay_(metric.method):'';
  const teamName=team&&team.name?team.name:String(pick&&pick.teamAbbr||'');
  const usage=team?Math.max(0,Number(team.usesRemaining||0))+' use'+(Number(team.usesRemaining||0)===1?'':'s')+' left':'';
  const rank=metric.rank?('Rank #'+metric.rank):'Rank —';
  const status=String(metric.status||'upcoming').toLowerCase();
  const statusWord=status.toUpperCase();
  const primary=teamFantasyMetricPrimaryLine_(metric,opponent);
  return`<div class="tf-slot tf-slot-compact ${pick?'has-pick':'needs-pick'} is-${teamFantasyEscape_(status)} ${slot.locked?'is-locked':''}" id="${slotId}" data-entry-id="${teamFantasyEscape_(entryId)}" data-position="${teamFantasyEscape_(slot.position)}" data-missing="${pick?'false':'true'}" onclick="teamFantasyHighlightSlot_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}')">
    <strong class="tf-slot-position">${teamFantasyEscape_(slot.label)}</strong>
    <span class="tf-slot-status-word">${teamFantasyEscape_(statusWord)}</span>
    <button type="button" class="tf-team-picker-button ${pick?'has-team':''}" ${slot.locked?'disabled aria-disabled="true"':`onclick="event.stopPropagation();teamFantasyHighlightSlot_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}');teamFantasyOpenTeamPicker_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}')"`}>
      ${pick?`${logo?`<img src="${teamFantasyEscape_(logo)}" alt="">`:''}<span class="tf-team-line-r3"><span class="tf-team-name">${teamFantasyEscape_(teamName)}</span>${method?`<span class="tf-origin">${teamFantasyEscape_(method)}</span>`:''}</span><span class="tf-slot-live-line">${teamFantasyEscape_(primary)}</span><span class="tf-slot-points-r3">${teamFantasyScore_(metric.points)} pts</span><span class="tf-slot-usage">${teamFantasyEscape_(usage)}</span>`:`<span class="tf-pick-empty">+ Choose</span><span class="tf-slot-live-line">${rank}</span><span class="tf-slot-points-r3">0 pts</span>`}
    </button>
  </div>`;
};

teamFantasyOpenTeamPicker_ = function(entryId,position){
  const slot=teamFantasyFindSlot_(entryId,position);
  if(!slot||slot.locked)return;
  const teams=teamFantasyPickerTeams_(slot).slice().sort(function(a,b){
    if(a.eligible!==b.eligible)return a.eligible?-1:1;
    const ar=Number(a.rank||0)||999,br=Number(b.rank||0)||999;
    if(ar!==br)return ar-br;
    return String(a.name||a.abbr||'').localeCompare(String(b.name||b.abbr||''));
  });
  const current=slot.pick?String(slot.pick.teamAbbr||''):'';
  teamFantasyCloseTeamPicker_();
  const selectableCount = teams.filter(function(team){ return !teamFantasyPickerIsBye_(team) && team.eligible === true && teamFantasyPickerRemaining_(team) > 0; }).length;
  const byeCount = teams.filter(teamFantasyPickerIsBye_).length;
  const pickerSummary = selectableCount + ' selectable' + (byeCount ? ' · ' + byeCount + ' bye' : '');
  const rows=teams.map(function(team){
    const bye=teamFantasyPickerIsBye_(team),left=teamFantasyPickerRemaining_(team);
    const game=team.game||{},kind=teamFantasyGameKind_(game);
    const rank=Number(team.rank||0)>0?'#'+Number(team.rank):'#—';
    const opponent=bye?'BYE':teamFantasyOpponentText_(team);
    const kickoff=kind==='upcoming'?teamFantasyFormatKickoff_(game):String(game.status||kind.toUpperCase());
    const selected=current===String(team.abbr||'')?' is-selected':'';
    const disabled=bye||team.eligible!==true?' disabled aria-disabled="true"':'';
    const action=disabled?'':` onclick="teamFantasyChooseTeam_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}','${teamFantasyEscape_(team.abbr)}')"`;
    return`<button type="button" class="tf-picker-team tf-picker-team-r3 ${teamFantasyPickerAvailabilityClass_(team)}${selected}"${disabled}${action}><span class="tf-picker-rank">${teamFantasyEscape_(rank)}</span><img src="${teamFantasyEscape_(teamFantasyTeamLogoUrl_(team.abbr))}" alt=""><span class="tf-picker-main"><strong>${teamFantasyEscape_(team.abbr)} — ${teamFantasyEscape_(team.name||'')}</strong><span>${teamFantasyEscape_(opponent)} · ${teamFantasyEscape_(kickoff)}</span></span><span class="tf-picker-side">${kind==='live'?'<span class="tf-picker-live">LIVE</span>':`<span>${left} left</span>`}${team.average!==undefined&&team.average!==null?`<span>${teamFantasyScore_(team.average)} avg pts</span>`:''}</span></button>`;
  }).join('');
  const settings=(window.TEAM_FANTASY_STATE||{}).settings||{};
  const fillActions=!slot.pick?`<div class="tf-picker-fill-actions">${settings.allowRandomPick?`<button type="button" class="tf-button secondary" title="Choose an eligible team at random for this position." onclick="teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}',true)">Random Pick</button>`:''}${settings.allowSmartAutoPick?`<button type="button" class="tf-button" title="Let PATTC choose using this game's automatic-pick rules." onclick="teamFantasyFillPosition_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(position)}',false)">Auto Pick</button>`:''}</div>`:'';
  document.body.insertAdjacentHTML('beforeend',`<div id="tfTeamPickerOverlay" class="tf-picker-overlay" role="presentation" onclick="if(event.target===this)teamFantasyCloseTeamPicker_()"><section class="tf-picker-sheet" role="dialog" aria-modal="true" aria-label="Choose ${teamFantasyEscape_(slot.label||position)} team"><div class="tf-picker-head"><div><strong>${teamFantasyEscape_(slot.label||position)} · Ranked Selection</strong><span>Eligible NFL teams sorted by current Team Fantasy position ranking · ${teamFantasyEscape_(pickerSummary)}</span></div><button type="button" class="tf-picker-close" onclick="teamFantasyCloseTeamPicker_()" aria-label="Close">×</button></div><div class="tf-picker-list">${rows||'<div class="tf-muted">No teams available.</div>'}</div>${fillActions}</section></div>`);
};

/* RC24A_R4_COMPARE_VERTICAL_MATRIX */
function teamFantasyComparePositionOrder_(){
  return ['QB','RB','WRTE','K','OL','DL','LB','DB'];
}
function teamFantasyComparePositionLabel_(position){
  return String(position||'')==='WRTE'?'WR/TE':String(position||'');
}
function teamFantasyCompareSlotFor_(competitor,position){
  return (competitor&&competitor.slots||[]).find(function(slot){
    return String(slot&&slot.position||'')===String(position||'');
  })||null;
}
function teamFantasyCompareLogoCell_(slot){
  if(!slot||slot.hidden){
    return `<span class="tf-compare-matrix-logo is-hidden" title="Pick hidden until kickoff"><span aria-hidden="true">🔒</span><span class="sr-only">Pick hidden until kickoff</span></span>`;
  }
  if(slot.empty||!slot.teamAbbr){
    return `<span class="tf-compare-matrix-logo is-empty" title="No pick"><span aria-hidden="true">—</span><span class="sr-only">No pick</span></span>`;
  }
  const status=String(slot.status||'upcoming').toLowerCase();
  return `<span class="tf-compare-matrix-logo is-${teamFantasyEscape_(status)}" title="${teamFantasyEscape_(slot.teamAbbr)} · ${teamFantasyEscape_(status.toUpperCase())}"><img src="${teamFantasyEscape_(slot.logoUrl||teamFantasyTeamLogoUrl_(slot.teamAbbr))}" alt="${teamFantasyEscape_(slot.teamAbbr)}"><span class="sr-only">${teamFantasyEscape_(slot.teamAbbr)} · ${teamFantasyEscape_(status.toUpperCase())}</span></span>`;
}
function teamFantasyCompareDetailCell_(slot,type){
  if(!slot||slot.hidden)return`<span class="tf-compare-detail-value is-hidden">🔒</span>`;
  if(slot.empty)return`<span class="tf-compare-detail-value">—</span>`;
  if(type==='points')return`<span class="tf-compare-detail-value">${teamFantasyScore_(slot.fantasyPoints)} pts</span>`;
  if(type==='rank')return`<span class="tf-compare-detail-value">${Number(slot.weekRank||0)>0?'#'+Number(slot.weekRank):'—'}</span>`;
  const method=teamFantasyPickMethodTag_(slot.pickMethod);
  return`<span class="tf-compare-detail-value">${method?teamFantasyEscape_(method):'—'}</span>`;
}
function teamFantasyCompareTogglePosition_(button,position){
  const id='tfCompareDetail_'+String(position||'').replace(/[^a-z0-9_-]/gi,'_');
  const detail=document.getElementById(id);
  if(!detail)return;
  const open=detail.hasAttribute('hidden');
  if(open)detail.removeAttribute('hidden');else detail.setAttribute('hidden','');
  if(button){
    button.setAttribute('aria-expanded',open?'true':'false');
    const chevron=button.querySelector('.tf-compare-matrix-chevron');
    if(chevron)chevron.textContent=open?'⌃':'⌄';
  }
}
function teamFantasyRenderCompareBoard_(data,selectedIds){
  const competitors=Array.isArray(data&&data.competitors)?data.competitors:[];
  const ids=Array.isArray(selectedIds)?selectedIds:[];
  const selected=competitors.filter(function(c){
    return c&&c.isViewer!==true&&ids.indexOf(c.entryId)!==-1;
  }).sort(function(a,b){
    return ids.indexOf(a.entryId)-ids.indexOf(b.entryId);
  });
  if(selected.length<2)return`<div class="tf-warning">Choose at least 2 other players to compare.</div>`;
  const positions=teamFantasyComparePositionOrder_();
  const head=`<div class="tf-compare-matrix-row tf-compare-matrix-head"><div class="tf-compare-matrix-position">POS</div>${selected.map(function(c){
    return`<div class="tf-compare-matrix-user"><strong>${teamFantasyEscape_(c.label||c.entryId||'Player')}</strong><button class="tf-remove-team" type="button" title="Remove ${teamFantasyEscape_(c.label||'player')}" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button></div>`;
  }).join('')}</div>`;
  const body=positions.map(function(position){
    const label=teamFantasyComparePositionLabel_(position);
    const slots=selected.map(function(c){return teamFantasyCompareSlotFor_(c,position);});
    return`<section class="tf-compare-position-group" data-position="${teamFantasyEscape_(position)}">
      <button type="button" class="tf-compare-matrix-row tf-compare-matrix-main" aria-expanded="false" aria-controls="tfCompareDetail_${teamFantasyEscape_(position)}" onclick="teamFantasyCompareTogglePosition_(this,'${teamFantasyEscape_(position)}')">
        <span class="tf-compare-matrix-position"><strong>${teamFantasyEscape_(label)}</strong><span class="tf-compare-matrix-chevron">⌄</span></span>
        ${slots.map(teamFantasyCompareLogoCell_).join('')}
      </button>
      <div id="tfCompareDetail_${teamFantasyEscape_(position)}" class="tf-compare-matrix-details" hidden>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">PTS</span>${slots.map(function(slot){return teamFantasyCompareDetailCell_(slot,'points');}).join('')}</div>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">RANK</span>${slots.map(function(slot){return teamFantasyCompareDetailCell_(slot,'rank');}).join('')}</div>
        <div class="tf-compare-matrix-row tf-compare-detail-row tf-compare-detail-pick"><span class="tf-compare-detail-label">PICK</span>${slots.map(function(slot){return teamFantasyCompareDetailCell_(slot,'method');}).join('')}</div>
      </div>
    </section>`;
  }).join('');
  return`<div class="tf-compare-matrix-scroll" role="region" aria-label="Team Fantasy lineup comparison"><div class="tf-compare-matrix" style="--tf-compare-count:${selected.length}">${head}${body}</div></div><div class="tf-privacy-note">Each player stays in one vertical column. Tap a position to expand points and rank. AP/R appears in the expanded Pick row. Locked opponent selections remain hidden until permitted.</div>`;
}

/* RC24A_R41_COMPARE_POINTS_ORIGIN_INLINE */
function teamFantasyComparePointsCell_(slot){
  if(!slot||slot.hidden)return`<span class="tf-compare-detail-value is-hidden">🔒</span>`;
  if(slot.empty)return`<span class="tf-compare-detail-value">—</span>`;
  const method=teamFantasyPickMethodTag_(slot.pickMethod);
  return`<span class="tf-compare-detail-value"><span class="tf-compare-points-value">${teamFantasyScore_(slot.fantasyPoints)}</span>${method?` <span class="tf-compare-points-origin">(${teamFantasyEscape_(method)})</span>`:''}</span>`;
}
function teamFantasyCompareRankCell_(slot){
  if(!slot||slot.hidden)return`<span class="tf-compare-detail-value is-hidden">🔒</span>`;
  if(slot.empty)return`<span class="tf-compare-detail-value">—</span>`;
  return`<span class="tf-compare-detail-value">${Number(slot.weekRank||0)>0?'#'+Number(slot.weekRank):'—'}</span>`;
}
function teamFantasyRenderCompareBoard_(data,selectedIds){
  const competitors=Array.isArray(data&&data.competitors)?data.competitors:[];
  const ids=Array.isArray(selectedIds)?selectedIds:[];
  const selected=competitors.filter(function(c){
    return c&&c.isViewer!==true&&ids.indexOf(c.entryId)!==-1;
  }).sort(function(a,b){
    return ids.indexOf(a.entryId)-ids.indexOf(b.entryId);
  });
  if(selected.length<2)return`<div class="tf-warning">Choose at least 2 other players to compare.</div>`;
  const positions=teamFantasyComparePositionOrder_();
  const head=`<div class="tf-compare-matrix-row tf-compare-matrix-head"><div class="tf-compare-matrix-position">POS</div>${selected.map(function(c){
    return`<div class="tf-compare-matrix-user"><strong>${teamFantasyEscape_(c.label||c.entryId||'Player')}</strong><button class="tf-remove-team" type="button" title="Remove ${teamFantasyEscape_(c.label||'player')}" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button></div>`;
  }).join('')}</div>`;
  const body=positions.map(function(position){
    const label=teamFantasyComparePositionLabel_(position);
    const slots=selected.map(function(c){return teamFantasyCompareSlotFor_(c,position);});
    return`<section class="tf-compare-position-group" data-position="${teamFantasyEscape_(position)}">
      <button type="button" class="tf-compare-matrix-row tf-compare-matrix-main" aria-expanded="false" aria-controls="tfCompareDetail_${teamFantasyEscape_(position)}" onclick="teamFantasyCompareTogglePosition_(this,'${teamFantasyEscape_(position)}')">
        <span class="tf-compare-matrix-position"><strong>${teamFantasyEscape_(label)}</strong><span class="tf-compare-matrix-chevron">⌄</span></span>
        ${slots.map(teamFantasyCompareLogoCell_).join('')}
      </button>
      <div id="tfCompareDetail_${teamFantasyEscape_(position)}" class="tf-compare-matrix-details" hidden>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">PTS</span>${slots.map(teamFantasyComparePointsCell_).join('')}</div>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">RANK</span>${slots.map(teamFantasyCompareRankCell_).join('')}</div>
      </div>
    </section>`;
  }).join('');
  return`<div class="tf-compare-matrix-scroll" role="region" aria-label="Team Fantasy lineup comparison"><div class="tf-compare-matrix" style="--tf-compare-count:${selected.length}">${head}${body}</div></div><div class="tf-privacy-note">Each player stays in one vertical column. Tap a position to expand points and rank. AP/R appears beside the point value. Locked opponent selections remain hidden until permitted.</div>`;
}

/* RC24A_R42_COMPARE_TOTAL_PRIVACY_STATES */
function teamFantasyCompareFlatLockIcon_(){
  return `<svg class="tf-compare-flat-lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="11" rx="1.5"/></svg>`;
}
function teamFantasyCompareLogoCell_(slot){
  if(!slot)return`<span class="tf-compare-matrix-logo is-blank"><span class="sr-only">No pick</span></span>`;
  if(slot.empty===true||!slot.teamAbbr)return`<span class="tf-compare-matrix-logo is-blank"><span class="sr-only">No pick</span></span>`;
  const status=String(slot.status||'upcoming').toLowerCase();
  if(slot.hidden===true||status==='upcoming'){
    return`<span class="tf-compare-matrix-logo is-locked" title="Pick locked until kickoff">${teamFantasyCompareFlatLockIcon_()}<span class="sr-only">Pick locked until kickoff</span></span>`;
  }
  const safeStatus=status==='final'?'final':'live';
  return`<span class="tf-compare-matrix-logo is-${teamFantasyEscape_(safeStatus)}" title="${teamFantasyEscape_(slot.teamAbbr)} · ${teamFantasyEscape_(safeStatus.toUpperCase())}"><img src="${teamFantasyEscape_(slot.logoUrl||teamFantasyTeamLogoUrl_(slot.teamAbbr))}" alt="${teamFantasyEscape_(slot.teamAbbr)}"><span class="sr-only">${teamFantasyEscape_(slot.teamAbbr)} · ${teamFantasyEscape_(safeStatus.toUpperCase())}</span></span>`;
}
function teamFantasyComparePointsCell_(slot){
  if(!slot)return`<span class="tf-compare-detail-value"></span>`;
  if(slot.empty===true||!slot.teamAbbr)return`<span class="tf-compare-detail-value"></span>`;
  const status=String(slot.status||'upcoming').toLowerCase();
  if(slot.hidden===true||status==='upcoming')return`<span class="tf-compare-detail-value is-hidden">${teamFantasyCompareFlatLockIcon_()}</span>`;
  const method=teamFantasyPickMethodTag_(slot.pickMethod);
  return`<span class="tf-compare-detail-value"><span class="tf-compare-points-value">${teamFantasyScore_(slot.fantasyPoints)}</span>${method?` <span class="tf-compare-points-origin">(${teamFantasyEscape_(method)})</span>`:''}</span>`;
}
function teamFantasyCompareRankCell_(slot){
  if(!slot)return`<span class="tf-compare-detail-value"></span>`;
  if(slot.empty===true||!slot.teamAbbr)return`<span class="tf-compare-detail-value"></span>`;
  const status=String(slot.status||'upcoming').toLowerCase();
  if(slot.hidden===true||status==='upcoming')return`<span class="tf-compare-detail-value is-hidden">${teamFantasyCompareFlatLockIcon_()}</span>`;
  return`<span class="tf-compare-detail-value">${Number(slot.weekRank||0)>0?'#'+Number(slot.weekRank):'—'}</span>`;
}
function teamFantasyCompareTotalCell_(competitor){
  const points=competitor&&isFinite(Number(competitor.totalPoints))?teamFantasyScore_(competitor.totalPoints):'—';
  const slots=competitor&&Array.isArray(competitor.slots)?competitor.slots:[];
  const revealable=slots.filter(function(slot){
    return slot&&slot.empty!==true&&slot.hidden!==true&&String(slot.status||'').toLowerCase()!=='upcoming';
  });
  const anyLive=revealable.some(function(slot){return String(slot.status||'').toLowerCase()==='live';});
  const anyFinal=revealable.some(function(slot){return String(slot.status||'').toLowerCase()==='final';});
  const cls=anyLive?'is-live':anyFinal?'is-final':'is-waiting';
  return`<div class="tf-compare-total-cell ${cls}"><strong>${teamFantasyEscape_(points)}</strong></div>`;
}
function teamFantasyRenderCompareBoard_(data,selectedIds){
  const competitors=Array.isArray(data&&data.competitors)?data.competitors:[];
  const ids=Array.isArray(selectedIds)?selectedIds:[];
  const selected=competitors.filter(function(c){
    return c&&c.isViewer!==true&&ids.indexOf(c.entryId)!==-1;
  }).sort(function(a,b){return ids.indexOf(a.entryId)-ids.indexOf(b.entryId);});
  if(selected.length<2)return`<div class="tf-warning">Choose at least 2 other players to compare.</div>`;
  const positions=teamFantasyComparePositionOrder_();
  const head=`<div class="tf-compare-matrix-row tf-compare-matrix-head"><div class="tf-compare-matrix-position">POS</div>${selected.map(function(c){
    return`<div class="tf-compare-matrix-user"><strong>${teamFantasyEscape_(c.label||c.entryId||'Player')}</strong><button class="tf-remove-team" type="button" title="Remove ${teamFantasyEscape_(c.label||'player')}" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button></div>`;
  }).join('')}</div>`;
  const total=`<div class="tf-compare-matrix-row tf-compare-total-row"><div class="tf-compare-matrix-position"><strong>TOTAL</strong></div>${selected.map(teamFantasyCompareTotalCell_).join('')}</div>`;
  const body=positions.map(function(position){
    const label=teamFantasyComparePositionLabel_(position);
    const slots=selected.map(function(c){return teamFantasyCompareSlotFor_(c,position);});
    return`<section class="tf-compare-position-group" data-position="${teamFantasyEscape_(position)}">
      <button type="button" class="tf-compare-matrix-row tf-compare-matrix-main" aria-expanded="false" aria-controls="tfCompareDetail_${teamFantasyEscape_(position)}" onclick="teamFantasyCompareTogglePosition_(this,'${teamFantasyEscape_(position)}')">
        <span class="tf-compare-matrix-position"><strong>${teamFantasyEscape_(label)}</strong><span class="tf-compare-matrix-chevron">⌄</span></span>
        ${slots.map(teamFantasyCompareLogoCell_).join('')}
      </button>
      <div id="tfCompareDetail_${teamFantasyEscape_(position)}" class="tf-compare-matrix-details" hidden>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">PTS</span>${slots.map(teamFantasyComparePointsCell_).join('')}</div>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">RANK</span>${slots.map(teamFantasyCompareRankCell_).join('')}</div>
      </div>
    </section>`;
  }).join('');
  return`<div class="tf-compare-matrix-scroll" role="region" aria-label="Team Fantasy lineup comparison"><div class="tf-compare-matrix" style="--tf-compare-count:${selected.length}">${head}${total}${body}</div></div><div class="tf-privacy-note">TOTAL is the first grid row. Before a selected team's game starts, a saved opponent pick shows only a flat white lock; an unfilled position stays blank. Team logos reveal when the game is live and remain visible when final.</div>`;
}

/* RC24A_R43_COMPARE_RANK_RECORD_POSITION_OUTLINES */
function teamFantasyCompareResolvePlayerCount_(data, competitors){
  const candidates=[
    data&&data.totalPlayers,
    data&&data.playerCount,
    data&&data.totalEntries,
    data&&data.entryCount,
    window.TEAM_FANTASY_STATE&&Array.isArray(window.TEAM_FANTASY_STATE.standings)&&window.TEAM_FANTASY_STATE.standings.length,
    window.TEAM_FANTASY_STATE&&Array.isArray(window.TEAM_FANTASY_STATE.leaderboard)&&window.TEAM_FANTASY_STATE.leaderboard.length,
    Array.isArray(competitors)?competitors.length:0
  ];
  for(const value of candidates){
    const n=Number(value||0);
    if(Number.isFinite(n)&&n>0)return n;
  }
  return 0;
}
function teamFantasyCompareResolveCurrentRank_(competitor){
  const candidates=[
    competitor&&competitor.currentRank,
    competitor&&competitor.rank,
    competitor&&competitor.place,
    competitor&&competitor.standingRank,
    competitor&&competitor.seasonRank,
    competitor&&competitor.overallRank
  ];
  for(const value of candidates){
    const n=Number(value||0);
    if(Number.isFinite(n)&&n>0)return n;
  }
  return 0;
}
function teamFantasyCompareRecordText_(rank,totalPlayers){
  const r=Number(rank||0),total=Number(totalPlayers||0);
  if(!(r>0&&total>1))return '—';
  const wins=Math.max(0,total-r);
  const losses=Math.max(0,r-1);
  return String(wins)+'-'+String(losses);
}
function teamFantasyCompareRankRecordCell_(competitor,totalPlayers){
  const rank=teamFantasyCompareResolveCurrentRank_(competitor);
  const record=teamFantasyCompareRecordText_(rank,totalPlayers);
  const rankText=rank>0?('#'+rank):'—';
  return `<div class="tf-compare-rankrecord-cell"><strong>${teamFantasyEscape_(rankText)}</strong><span>${teamFantasyEscape_(record)}</span></div>`;
}
function teamFantasyCompareTotalCell_(competitor){
  const points=competitor&&isFinite(Number(competitor.totalPoints))?teamFantasyScore_(competitor.totalPoints):'—';
  return`<div class="tf-compare-total-cell"><strong>${teamFantasyEscape_(points)}</strong></div>`;
}
function teamFantasyCompareLogoCell_(slot){
  if(!slot)return`<span class="tf-compare-matrix-logo is-blank"><span class="sr-only">No pick</span></span>`;
  if(slot.empty===true||!slot.teamAbbr)return`<span class="tf-compare-matrix-logo is-blank"><span class="sr-only">No pick</span></span>`;
  const status=String(slot.status||'upcoming').toLowerCase();
  if(slot.hidden===true||status==='upcoming'){
    return`<span class="tf-compare-matrix-logo is-locked" title="Pick locked until kickoff">${teamFantasyCompareFlatLockIcon_()}<span class="sr-only">Pick locked until kickoff</span></span>`;
  }
  const safeStatus=status==='final'?'final':'live';
  return`<span class="tf-compare-matrix-logo is-${teamFantasyEscape_(safeStatus)}" title="${teamFantasyEscape_(slot.teamAbbr)} · ${teamFantasyEscape_(safeStatus.toUpperCase())}"><img src="${teamFantasyEscape_(slot.logoUrl||teamFantasyTeamLogoUrl_(slot.teamAbbr))}" alt="${teamFantasyEscape_(slot.teamAbbr)}"><span class="sr-only">${teamFantasyEscape_(slot.teamAbbr)} · ${teamFantasyEscape_(safeStatus.toUpperCase())}</span></span>`;
}
function teamFantasyRenderCompareBoard_(data,selectedIds){
  const competitors=Array.isArray(data&&data.competitors)?data.competitors:[];
  const ids=Array.isArray(selectedIds)?selectedIds:[];
  const selected=competitors.filter(function(c){
    return c&&c.isViewer!==true&&ids.indexOf(c.entryId)!==-1;
  }).sort(function(a,b){return ids.indexOf(a.entryId)-ids.indexOf(b.entryId);});
  if(selected.length<2)return`<div class="tf-warning">Choose at least 2 other players to compare.</div>`;
  const totalPlayers=teamFantasyCompareResolvePlayerCount_(data,competitors);
  const positions=teamFantasyComparePositionOrder_();
  const head=`<div class="tf-compare-matrix-row tf-compare-matrix-head"><div class="tf-compare-matrix-position">POS</div>${selected.map(function(c){
    return`<div class="tf-compare-matrix-user"><strong>${teamFantasyEscape_(c.label||c.entryId||'Player')}</strong><button class="tf-remove-team" type="button" title="Remove ${teamFantasyEscape_(c.label||'player')}" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button></div>`;
  }).join('')}</div>`;
  const total=`<div class="tf-compare-matrix-row tf-compare-total-row"><div class="tf-compare-matrix-position"><strong>TOTAL</strong></div>${selected.map(teamFantasyCompareTotalCell_).join('')}</div>`;
  const rankRecord=`<div class="tf-compare-matrix-row tf-compare-rankrecord-row"><div class="tf-compare-matrix-position"><strong>RANK</strong></div>${selected.map(function(c){return teamFantasyCompareRankRecordCell_(c,totalPlayers);}).join('')}</div>`;
  const body=positions.map(function(position){
    const label=teamFantasyComparePositionLabel_(position);
    const slots=selected.map(function(c){return teamFantasyCompareSlotFor_(c,position);});
    return`<section class="tf-compare-position-group" data-position="${teamFantasyEscape_(position)}">
      <button type="button" class="tf-compare-matrix-row tf-compare-matrix-main" aria-expanded="false" aria-controls="tfCompareDetail_${teamFantasyEscape_(position)}" onclick="teamFantasyCompareTogglePosition_(this,'${teamFantasyEscape_(position)}')">
        <span class="tf-compare-matrix-position"><strong>${teamFantasyEscape_(label)}</strong><span class="tf-compare-matrix-chevron">⌄</span></span>
        ${slots.map(teamFantasyCompareLogoCell_).join('')}
      </button>
      <div id="tfCompareDetail_${teamFantasyEscape_(position)}" class="tf-compare-matrix-details" hidden>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">PTS</span>${slots.map(teamFantasyComparePointsCell_).join('')}</div>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">RANK</span>${slots.map(teamFantasyCompareRankCell_).join('')}</div>
      </div>
    </section>`;
  }).join('');
  return`<div class="tf-compare-matrix-scroll" role="region" aria-label="Team Fantasy lineup comparison"><div class="tf-compare-matrix" style="--tf-compare-count:${selected.length}">${head}${total}${rankRecord}${body}</div></div><div class="tf-privacy-note">TOTAL shows cumulative points. RANK also shows current head-to-head style record based on the total number of players in the game. Position outlines belong to LIVE and FINAL slot cells, not TOTAL. Before kickoff, a saved opponent pick stays a flat white lock and an unfilled position stays blank.</div>`;
}

/* RC24A_R44_COMPARE_AUTHORITATIVE_RECORD */
function teamFantasyCompareAuthoritativeRank_(competitor){
  const candidates=[
    competitor&&competitor.leagueRank,
    competitor&&competitor.currentRank,
    competitor&&competitor.standingRank,
    competitor&&competitor.seasonRank,
    competitor&&competitor.rank
  ];
  for(const value of candidates){
    const n=Number(value||0);
    if(Number.isFinite(n)&&n>0)return n;
  }
  return 0;
}
function teamFantasyCompareAuthoritativeRecord_(competitor){
  const record=competitor&&competitor.record;
  if(!record||typeof record!=='object')return'';
  const wins=Number(record.wins);
  const losses=Number(record.losses);
  const ties=Number(record.ties||0);
  if(!Number.isFinite(wins)||!Number.isFinite(losses)||!Number.isFinite(ties))return'';
  if(wins<0||losses<0||ties<0)return'';
  return ties>0
    ? String(Math.floor(wins))+'-'+String(Math.floor(losses))+'-'+String(Math.floor(ties))
    : String(Math.floor(wins))+'-'+String(Math.floor(losses));
}
function teamFantasyCompareRankRecordCell_(competitor){
  const rank=teamFantasyCompareAuthoritativeRank_(competitor);
  const record=teamFantasyCompareAuthoritativeRecord_(competitor);
  return `<div class="tf-compare-rankrecord-cell"><strong>${rank>0?'#'+rank:'—'}</strong>${record?`<span>${teamFantasyEscape_(record)}</span>`:''}</div>`;
}
function teamFantasyRenderCompareBoard_(data,selectedIds){
  const competitors=Array.isArray(data&&data.competitors)?data.competitors:[];
  const ids=Array.isArray(selectedIds)?selectedIds:[];
  const selected=competitors.filter(function(c){
    return c&&c.isViewer!==true&&ids.indexOf(c.entryId)!==-1;
  }).sort(function(a,b){return ids.indexOf(a.entryId)-ids.indexOf(b.entryId);});
  if(selected.length<2)return`<div class="tf-warning">Choose at least 2 other players to compare.</div>`;

  const positions=teamFantasyComparePositionOrder_();
  const head=`<div class="tf-compare-matrix-row tf-compare-matrix-head"><div class="tf-compare-matrix-position">POS</div>${selected.map(function(c){
    return`<div class="tf-compare-matrix-user"><strong>${teamFantasyEscape_(c.label||c.entryId||'Player')}</strong><button class="tf-remove-team" type="button" title="Remove ${teamFantasyEscape_(c.label||'player')}" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button></div>`;
  }).join('')}</div>`;

  const total=`<div class="tf-compare-matrix-row tf-compare-total-row"><div class="tf-compare-matrix-position"><strong>TOTAL</strong></div>${selected.map(teamFantasyCompareTotalCell_).join('')}</div>`;
  const rankRecord=`<div class="tf-compare-matrix-row tf-compare-rankrecord-row"><div class="tf-compare-matrix-position"><strong>RANK</strong></div>${selected.map(teamFantasyCompareRankRecordCell_).join('')}</div>`;

  const body=positions.map(function(position){
    const label=teamFantasyComparePositionLabel_(position);
    const slots=selected.map(function(c){return teamFantasyCompareSlotFor_(c,position);});
    return`<section class="tf-compare-position-group" data-position="${teamFantasyEscape_(position)}">
      <button type="button" class="tf-compare-matrix-row tf-compare-matrix-main" aria-expanded="false" aria-controls="tfCompareDetail_${teamFantasyEscape_(position)}" onclick="teamFantasyCompareTogglePosition_(this,'${teamFantasyEscape_(position)}')">
        <span class="tf-compare-matrix-position"><strong>${teamFantasyEscape_(label)}</strong><span class="tf-compare-matrix-chevron">⌄</span></span>
        ${slots.map(teamFantasyCompareLogoCell_).join('')}
      </button>
      <div id="tfCompareDetail_${teamFantasyEscape_(position)}" class="tf-compare-matrix-details" hidden>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">PTS</span>${slots.map(teamFantasyComparePointsCell_).join('')}</div>
        <div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">RANK</span>${slots.map(teamFantasyCompareRankCell_).join('')}</div>
      </div>
    </section>`;
  }).join('');

  return`<div class="tf-compare-matrix-scroll" role="region" aria-label="Team Fantasy lineup comparison"><div class="tf-compare-matrix" style="--tf-compare-count:${selected.length}">${head}${total}${rankRecord}${body}</div></div><div class="tf-privacy-note">TOTAL is first. RANK uses the current authoritative Team Fantasy standing. When PATTC supplies an accumulated season record, it appears directly below that rank; no record is inferred from rank. Position outlines belong to LIVE and FINAL slots. Saved upcoming opponent picks remain flat white locks and unfilled positions remain blank.</div>`;
}

/* RC24A_R45_MULTI_LEAGUE_WEEK_SELECTORS */
function teamFantasyR45LeagueStorageKey_() {
  var state = window.TEAM_FANTASY_STATE || {};
  return "pattc.tf.league." + String(state.gameId || "team-fantasy");
}
function teamFantasyRememberLeague_(leagueId) {
  try { window.localStorage.setItem(teamFantasyR45LeagueStorageKey_(), String(leagueId || "")); } catch (ignore) {}
}
function teamFantasyPreferredLeague_() {
  try { return String(window.localStorage.getItem(teamFantasyR45LeagueStorageKey_()) || ""); } catch (ignore) { return ""; }
}
function teamFantasyLeagueSelectorHtml_(state, id) {
  state = state || window.TEAM_FANTASY_STATE || {};
  var leagues = Array.isArray(state.leagues) ? state.leagues : [];
  if (leagues.length <= 1) return "";
  var config = { leagues: leagues, selectedLeagueId: state.selectedLeagueId, id: id || "tfLeagueSelector", onChange: "teamFantasySelectLeague_" };
  if (typeof sportsLeagueSelectorHtml_ === "function") return sportsLeagueSelectorHtml_(config);
  return `<label class="sports-league-selector"><span>League</span><select onchange="teamFantasySelectLeague_(this.value)">${leagues.map(function(l){var lid=String(l.leagueId||'');return`<option value="${teamFantasyEscape_(lid)}" ${lid===String(state.selectedLeagueId||'')?'selected':''}>${teamFantasyEscape_(l.leagueName||lid)}</option>`;}).join('')}</select></label>`;
}
function teamFantasyCompareWeekSelectorHtml_(data) {
  var weeks = Array.isArray(data && data.availableWeeks) ? data.availableWeeks : [];
  if (!weeks.length) return "";
  return `<label class="sports-league-selector tf-week-selector"><span>Week</span><select onchange="teamFantasyCompareSetWeek_(this.value)">${weeks.slice().sort(function(a,b){return b-a;}).map(function(w){return`<option value="${Number(w)}" ${Number(w)===Number(data.week)?'selected':''}>Week ${Number(w)}</option>`;}).join('')}</select></label>`;
}
async function teamFantasySelectLeague_(leagueId) {
  var state = window.TEAM_FANTASY_STATE || {};
  leagueId = String(leagueId || "");
  if (!leagueId || leagueId === String(state.selectedLeagueId || "")) return;
  teamFantasyRememberLeague_(leagueId);
  window.TEAM_FANTASY_WEEK_CACHE = {};
  try {
    var next = await api('getTeamFantasyState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: state.week, leagueId: leagueId });
    if (!next || next.success === false) throw new Error(next && (next.message || next.error) || 'Could not switch Team Fantasy league.');
    window.TEAM_FANTASY_STATE = next;
    var gameDay = await api('getTeamFantasyGameDayState', { gameId: next.gameId, username: next.username || teamFantasyCurrentUser_(), week: next.week, leagueId: leagueId });
    if (!gameDay || gameDay.success === false) throw new Error(gameDay && (gameDay.message || gameDay.error) || 'Could not load selected league.');
    window.TEAM_FANTASY_CURRENT_GAME_DAY = gameDay;
    window.TEAM_FANTASY_WEEK_CACHE[leagueId + '|' + Number(next.week)] = gameDay;
    teamFantasyRenderGameDayIntoMount_();
    var lb = window.TEAM_FANTASY_LEADERBOARD_KEY === 'season' ? 'season' : Number(window.TEAM_FANTASY_LEADERBOARD_KEY || next.week);
    if (document.getElementById('tfLeaderboardMount')) teamFantasyLoadLeaderboard_(lb);
    if (document.getElementById('tfHistoryMount')) teamFantasyLoadHistoryWeek_(Number(window.TEAM_FANTASY_HISTORY_WEEK || Math.max(1, Number(next.week)-1)));
    var playoffs = document.getElementById('teamFantasyPlayoffs');
    if (playoffs) { var wrap=document.createElement('div'); wrap.innerHTML=teamFantasyRenderPlayoffPicture_(next).trim(); if(wrap.firstElementChild) playoffs.replaceWith(wrap.firstElementChild); }
    document.querySelectorAll('.sports-team-fantasy .sports-league-selector select').forEach(function(select){ if(Array.from(select.options||[]).some(function(o){return o.value===leagueId;})) select.value=leagueId; });
  } catch (err) {
    teamFantasySetStatus_(err && err.message ? err.message : 'Could not switch league.', true);
  }
}
function teamFantasyGameDayForWeek_(week) {
  week = Math.max(1, Number(week || 1));
  var state = window.TEAM_FANTASY_STATE || {};
  var leagueId = String(state.selectedLeagueId || 'complete');
  var current = window.TEAM_FANTASY_CURRENT_GAME_DAY || null;
  if (current && Number(current.week || 0) === week && String(current.selectedLeagueId || current.leagueId || '') === leagueId) return Promise.resolve(current);
  window.TEAM_FANTASY_WEEK_CACHE = window.TEAM_FANTASY_WEEK_CACHE || {};
  var key = leagueId + '|' + week;
  if (window.TEAM_FANTASY_WEEK_CACHE[key]) return Promise.resolve(window.TEAM_FANTASY_WEEK_CACHE[key]);
  return api('getTeamFantasyGameDayState', { gameId: state.gameId, username: state.username || teamFantasyCurrentUser_(), week: week, leagueId: leagueId }).then(function(res) {
    if (!res || res.success === false) throw new Error(res && (res.message || res.error) || 'Could not load Team Fantasy week.');
    window.TEAM_FANTASY_WEEK_CACHE[key] = res;
    return res;
  });
}
async function teamFantasyCompareSetWeek_(week) {
  week = Math.max(1, Number(week || 1));
  try {
    var data = await teamFantasyGameDayForWeek_(week);
    window.TEAM_FANTASY_CURRENT_GAME_DAY = data;
    window.TEAM_FANTASY_COMPARE_WEEK = week;
    var valid = {};
    (data.competitors || []).forEach(function(c){ if(c && c.isViewer !== true) valid[String(c.entryId||'')] = true; });
    window.TEAM_FANTASY_COMPARE_SELECTED = (window.TEAM_FANTASY_COMPARE_SELECTED || []).filter(function(id){ return valid[String(id)] === true; });
    teamFantasyRenderGameDayIntoMount_();
  } catch (err) {
    teamFantasySetStatus_(err && err.message ? err.message : 'Could not load Compare week.', true);
  }
}
function teamFantasySeasonQuickNav_() {
  var state = window.TEAM_FANTASY_STATE || {};
  return `${teamFantasyLeagueSelectorHtml_(state,'tfSeasonLeagueSelector')}<nav class="tf-season-quicknav" aria-label="Team Fantasy season tools">
    <button onclick="teamFantasyScrollToSection_('teamFantasyProtection')">Protection</button>
    <button onclick="teamFantasyScrollToSection_('teamFantasyHistory')">History</button>
    <button onclick="teamFantasyScrollToSection_('teamFantasyLeaderboard')">Leaderboard</button>
    <button onclick="teamFantasyScrollToSection_('teamFantasyPlayoffs')">Playoffs</button>
    <button onclick="teamFantasyOpenPlayerCompare_()">Compare 2+</button>
  </nav>`;
}
function teamFantasyCompareWeeklyRecordText_(competitor) {
  if (!competitor || competitor.dnp === true || competitor.participated === false) return 'DNP / NO LINEUP';
  var record = competitor.weeklyRecord;
  if (!record || competitor.weeklyRecordFinal !== true) return 'PENDING';
  var w=Number(record.wins||0),l=Number(record.losses||0),t=Number(record.ties||0);
  return t>0 ? `${w}-${l}-${t}` : `${w}-${l}`;
}
function teamFantasyCompareWeeklyRankRecordCell_(competitor) {
  if (!competitor || competitor.dnp === true || competitor.participated === false) return `<div class="tf-compare-rankrecord-cell is-dnp"><strong>—</strong><span>DNP / NO LINEUP</span></div>`;
  var rank = Number(competitor.weeklyLeagueRank || 0);
  return `<div class="tf-compare-rankrecord-cell"><strong>${rank>0?'#'+rank:'—'}</strong><span>${teamFantasyEscape_(teamFantasyCompareWeeklyRecordText_(competitor))}</span></div>`;
}
function teamFantasyRenderCompareBoard_(data, selectedIds) {
  var competitors = Array.isArray(data && data.competitors) ? data.competitors : [];
  var ids = Array.isArray(selectedIds) ? selectedIds : [];
  var selected = competitors.filter(function(c){ return c && c.isViewer !== true && ids.indexOf(c.entryId) !== -1; })
    .sort(function(a,b){ return ids.indexOf(a.entryId)-ids.indexOf(b.entryId); });
  var controls = `<div class="tf-compare-context-controls">${teamFantasyLeagueSelectorHtml_({leagues:data.leagues||[],selectedLeagueId:data.selectedLeagueId||data.leagueId},'tfCompareLeagueSelector')}${teamFantasyCompareWeekSelectorHtml_(data)}</div>`;
  if (selected.length < 2) return controls + `<div class="tf-warning">Choose at least 2 other players to compare.</div>`;
  var positions = teamFantasyComparePositionOrder_();
  var head = `<div class="tf-compare-matrix-row tf-compare-matrix-head"><div class="tf-compare-matrix-position">POS</div>${selected.map(function(c){return`<div class="tf-compare-matrix-user"><strong>${teamFantasyEscape_(c.label||c.entryId||'Player')}</strong><button class="tf-remove-team" type="button" title="Remove ${teamFantasyEscape_(c.label||'player')}" onclick="teamFantasyCompareRemoveTeam_('${teamFantasyEscape_(c.entryId)}')">×</button></div>`;}).join('')}</div>`;
  var total = `<div class="tf-compare-matrix-row tf-compare-total-row"><div class="tf-compare-matrix-position"><strong>TOTAL</strong></div>${selected.map(teamFantasyCompareTotalCell_).join('')}</div>`;
  var rankRecord = `<div class="tf-compare-matrix-row tf-compare-rankrecord-row"><div class="tf-compare-matrix-position"><strong>WEEK</strong></div>${selected.map(teamFantasyCompareWeeklyRankRecordCell_).join('')}</div>`;
  var body = positions.map(function(position){
    var label=teamFantasyComparePositionLabel_(position),slots=selected.map(function(c){return teamFantasyCompareSlotFor_(c,position);});
    return `<section class="tf-compare-position-group" data-position="${teamFantasyEscape_(position)}"><button type="button" class="tf-compare-matrix-row tf-compare-matrix-main" aria-expanded="false" aria-controls="tfCompareDetail_${teamFantasyEscape_(position)}" onclick="teamFantasyCompareTogglePosition_(this,'${teamFantasyEscape_(position)}')"><span class="tf-compare-matrix-position"><strong>${teamFantasyEscape_(label)}</strong><span class="tf-compare-matrix-chevron">⌄</span></span>${slots.map(teamFantasyCompareLogoCell_).join('')}</button><div id="tfCompareDetail_${teamFantasyEscape_(position)}" class="tf-compare-matrix-details" hidden><div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">PTS</span>${slots.map(teamFantasyComparePointsCell_).join('')}</div><div class="tf-compare-matrix-row tf-compare-detail-row"><span class="tf-compare-detail-label">RANK</span>${slots.map(teamFantasyCompareRankCell_).join('')}</div></div></section>`;
  }).join('');
  return controls + `<div class="tf-compare-context-line"><strong>${teamFantasyEscape_(data.leagueName||'League')}</strong><span>Week ${Number(data.week||0)} · weekly all-play record</span></div><div class="tf-compare-matrix-scroll" role="region" aria-label="Team Fantasy lineup comparison"><div class="tf-compare-matrix" style="--tf-compare-count:${selected.length}">${head}${total}${rankRecord}${body}</div></div><div class="tf-privacy-note">This Compare is scoped to the selected league and week. WEEK shows that archived week's league rank and actual all-play W-L-T from authoritative weekly scores. DNP / NO LINEUP is not converted into a fabricated result. Upcoming opponent selections remain hidden until their NFL game locks/reveals under the existing privacy contract.</div>`;
}
function teamFantasyRenderSeasonLeaderboard_(state) {
  var standings=state&&state.standings||{},rows=Array.isArray(standings.rows)?standings.rows:[],league=standings.league||{};
  return `${teamFantasyLeagueSelectorHtml_(state,'tfLeaderboardLeagueSelector')}<div class="tf-context-caption">${teamFantasyEscape_(league.leagueName||'League')} · Season</div><div class="tf-leaderboard-list">${rows.map(function(r){var t=Number(r.regularTies||0);var rec=`${Number(r.regularWins||0)}-${Number(r.regularLosses||0)}${t?'-'+t:''}`;return`<div class="tf-leader-row"><span class="rank">#${Number(r.rank||0)||'—'}</span><span class="name">${teamFantasyEscape_(r.name||r.username||r.entryId||'Player')}</span><span class="value">${teamFantasyScore_(r.regularPoints!==undefined?r.regularPoints:r.fantasyPoints)} pts · ${teamFantasyEscape_(rec)} · ${Number(r.weeksPlayed||0)} wk</span></div>`;}).join('')||'<div class="tf-muted">Season standings are not available yet.</div>'}</div>`;
}
async function teamFantasyLoadLeaderboard_(key) {
  var mount=document.getElementById('tfLeaderboardMount'); if(!mount)return;
  var state=window.TEAM_FANTASY_STATE||{};
  if(key==='season') { window.TEAM_FANTASY_LEADERBOARD_KEY='season'; mount.innerHTML=teamFantasyWeekChips_((window.TEAM_FANTASY_CURRENT_GAME_DAY&&window.TEAM_FANTASY_CURRENT_GAME_DAY.availableWeeks)||[],'season','teamFantasyLoadLeaderboard_',true)+teamFantasyRenderSeasonLeaderboard_(state); return; }
  var week=Math.max(1,Number(key||state.week||1)); mount.innerHTML='<div class="tf-muted">Loading weekly leaderboard…</div>';
  try {
    var data=await teamFantasyGameDayForWeek_(week); window.TEAM_FANTASY_LEADERBOARD_KEY=week;
    var rows=data.weeklyLeaderboard&&Array.isArray(data.weeklyLeaderboard.rows)?data.weeklyLeaderboard.rows:[];
    var live=rows.some(function(r){return r.counts&&Number(r.counts.live||0)>0;});
    mount.innerHTML=teamFantasyWeekChips_(data.availableWeeks||[],week,'teamFantasyLoadLeaderboard_',true)+teamFantasyLeagueSelectorHtml_({leagues:data.leagues||[],selectedLeagueId:data.selectedLeagueId||data.leagueId},'tfWeeklyLeaderboardLeagueSelector')+`<div class="tf-history-week-head"><strong>${live?'LIVE ':''}WEEK ${week}</strong><span>${teamFantasyEscape_(data.leagueName||'League')}</span></div><div class="tf-leaderboard-list">${rows.map(function(r){var rec=r.dnp===true?'DNP / NO LINEUP':(r.weeklyRecordFinal&&r.weeklyRecord?`${Number(r.weeklyRecord.wins||0)}-${Number(r.weeklyRecord.losses||0)}${Number(r.weeklyRecord.ties||0)?'-'+Number(r.weeklyRecord.ties||0):''}`:'PENDING');return`<div class="tf-leader-row ${r.dnp===true?'is-dnp':''}"><span class="rank">${r.dnp===true?'—':'#'+(Number(r.weekRank||0)||'—')}</span><span class="name">${teamFantasyEscape_(r.label||r.entryId)}</span><span class="value">${r.dnp===true?'—':teamFantasyScore_(r.points)+' pts'} · ${teamFantasyEscape_(rec)}</span></div>`;}).join('')}</div>`;
  } catch(err) { mount.innerHTML=`<div class="tf-warning">${teamFantasyEscape_(err&&err.message||'Could not load leaderboard.')}</div>`; }
}
function teamFantasyRenderPlayoffPicture_(state) {
  var standings=state&&state.standings||{},rows=Array.isArray(standings.rows)?standings.rows:[],league=standings.league||{},cutoff=Math.max(0,Number(league.playoffTeams||0));
  var qualifierIds={};(standings.qualifiers||[]).forEach(function(id){qualifierIds[String(id)]=true;});
  return `<section id="teamFantasyPlayoffs" class="tf-season-card"><h2>Playoff Picture</h2>${teamFantasyLeagueSelectorHtml_(state,'tfPlayoffLeagueSelector')}<div class="tf-muted">Uses the authoritative Team Fantasy qualifier output for ${teamFantasyEscape_(league.leagueName||'this league')}. Current baseline qualification is record-first with regular points as the tiebreaker; the browser does not invent a different formula.</div><div class="tf-playoff-list">${rows.map(function(r){var qualified=r.playoffQualified===true||qualifierIds[String(r.competitorId||'')]===true,atCutoff=cutoff>0&&Number(r.rank||0)===cutoff,status=qualified?(Number(state.week||0)>Number(state.settings&&state.settings.regularSeasonEndWeek||18)?'CLINCHED':'CURRENTLY IN'):'CURRENTLY OUT';var t=Number(r.regularTies||0),rec=`${Number(r.regularWins||0)}-${Number(r.regularLosses||0)}${t?'-'+t:''}`;return`<div class="tf-playoff-row ${qualified?'is-in':''} ${atCutoff?'is-cutoff':''}"><span class="rank">#${Number(r.rank||0)||'—'}</span><span class="name">${teamFantasyEscape_(r.name||r.username||r.entryId||'Player')}<span class="tf-playoff-status">${teamFantasyEscape_(status)}${atCutoff?' · PLAYOFF LINE':''}</span></span><span class="value">${teamFantasyEscape_(rec)} · ${teamFantasyScore_(r.regularPoints||0)} pts</span></div>`;}).join('')||'<div class="tf-muted">Playoff standings are not available yet.</div>'}</div><div class="tf-data-note">Qualification comes from the selected league's backend standings. No Sports Engine or browser-side playoff scoring is introduced.</div></section>`;
}

/* RC24A_R47_TEAM_FANTASY_PLAYER_FINAL */
function teamFantasyR47HeroHtml_(state, appearance) {
  var runtime = window.AppearanceThemeRuntime || {};
  var render = typeof runtime.sportsHeroForGameHtml === "function" ? runtime.sportsHeroForGameHtml : runtime.sportsHeroHtml;
  if (typeof render !== "function") return "";
  var options = {
    kind: "team-fantasy",
    gameId: state && state.gameId || "",
    gameName: state && (state.gameName || state.name) || "Team Fantasy Football",
    subtitle: "Week " + Number(state && state.week || 0) + " · Build one lineup. Compete in every eligible league.",
    contextHtml: typeof teamFantasyLeagueSelect_ === "function" ? teamFantasyLeagueSelect_(state || {}) : "",
    accentColor: "#19a7ce"
  };
  return typeof runtime.sportsHeroForGameHtml === "function" ? render(appearance || {}, options) : render(appearance || {}, Object.assign({title:options.gameName,kicker:"NFL TEAM FANTASY"},options));
}

function teamFantasyR47ReplaceTopHero_(html, heroHtml) {
  html = String(html || "");
  if (!heroHtml) return html;
  var heroPattern = /<section\b[^>]*class=["'][^"']*pattc-sports-hero[^"']*["'][\s\S]*?<\/section>/i;
  if (heroPattern.test(html)) return html.replace(heroPattern, heroHtml);
  var legacyHero = /<header\b[^>]*class=["'][^"']*tf-hero[^"']*["'][\s\S]*?<\/header>/i;
  if (legacyHero.test(html)) return html.replace(legacyHero, heroHtml);
  // R4.5/R3 Sports shell contains navigation/account identity and must remain intact.
  var shell = /<section\b[^>]*class=["'][^"']*sports-shell[^"']*["'][\s\S]*?<\/section>/i;
  if (shell.test(html)) return html.replace(shell, function(markup) { return markup + heroHtml; });
  return html.replace(/(<div\b[^>]*class=["'][^"']*sports-team-fantasy[^"']*["'][^>]*>)/i, "$1" + heroHtml);
}

if (typeof renderTeamFantasyPage === "function" && !window.RC24A_R47_TEAM_FANTASY_PAGE_BASE_) {
  window.RC24A_R47_TEAM_FANTASY_PAGE_BASE_ = renderTeamFantasyPage;
  renderTeamFantasyPage = async function() {
    var html = await window.RC24A_R47_TEAM_FANTASY_PAGE_BASE_.apply(this, arguments);
    var state = window.TEAM_FANTASY_STATE || {};
    var gameId = String(state.gameId || (typeof getFrontendGameId === "function" ? getFrontendGameId() : "") || "");
    var appearance = window.TEAM_FANTASY_APPEARANCE_GAME_ID === gameId ? (window.TEAM_FANTASY_APPEARANCE || null) : null;
    if (!appearance && gameId && typeof apiGetGameAppearance === "function") {
      try {
        var cached = null;
        try { cached = JSON.parse(sessionStorage.getItem("pattcGameAppearance:" + gameId) || "null"); } catch (ignore) {}
        appearance = cached || await apiGetGameAppearance(gameId);
        if (appearance && appearance.success !== false) {
          window.TEAM_FANTASY_APPEARANCE = appearance;
          window.TEAM_FANTASY_APPEARANCE_GAME_ID = gameId;
          try { sessionStorage.setItem("pattcGameAppearance:" + gameId, JSON.stringify(appearance)); } catch (ignore2) {}
        }
      } catch (err) { appearance = null; }
    }
    return teamFantasyR47ReplaceTopHero_(html, teamFantasyR47HeroHtml_(state, appearance));
  };
}

function teamFantasyRenderProtection_(state) {
  var pref = state.playerAutoFill || {mode:"manual",window:"sunday-early",customLeadMinutes:60,scope:"season",autoFillWeek:0,activation:{}};
  var mode = String(pref.mode || "manual"), windowKey = String(pref.window || "sunday-early");
  var scope = String(pref.scope || pref.autoFillScope || "season") === "week" ? "week" : "season";
  var targetWeek = Number(pref.autoFillWeek || pref.targetWeek || 0);
  var currentWeek = Number(state.week || (state.settings && state.settings.currentWeek) || 0);
  var expired = scope === "week" && targetWeek > 0 && targetWeek !== currentWeek;
  var custom = Math.max(15, Number(pref.customLeadMinutes || 60)), activation = pref.activation || {};
  var penalty = Math.max(0, Number(state.settings && state.settings.autoPickPenaltyPerPosition || 0));
  var scopeLabel = scope === "week" ? "This Week Only" : "Entire Season";
  var warning = mode === "manual"
    ? `<div class="tf-protection-alert"><strong>Backup protection is off</strong><span>Choose Random Pick or Auto Pick if you want PATTC to fill only missing positions later.</span></div>`
    : expired
      ? `<div class="tf-protection-alert"><strong>Week-only protection expired</strong><span>This setting was saved for Week ${targetWeek}. Save again for Week ${currentWeek}, or choose Entire Season.</span></div>`
      : `<div class="tf-protection-ok">Protection ON · ${mode === "auto" ? "Auto Pick" : "Random Pick"} · ${teamFantasyEscape_(scopeLabel)} · ${teamFantasyEscape_(activation.label || teamFantasyProtectionWindowLabel_(windowKey))}</div>`;
  return `<section id="teamFantasyProtection" class="card tf-protection-card tf-protection-card-r3">${warning}<div class="tf-card-heading"><div><h2>Missed Lineup Protection</h2><div class="tf-muted">Automatic protection fills only empty required positions. Manual picks are never overwritten.</div></div><button type="button" class="tf-help-button" onclick="teamFantasyInfoOpen_('Missed Lineup Protection','<p>This safety net fills only positions that are still empty. It never replaces a valid manual pick and still obeys kickoff locks, reuse limits, eligibility, conference restrictions and the existing Auto Pick penalty.</p>')">?</button></div><div class="tf-protection-grid-r3"><label class="tf-field"><span>Scope</span><select id="tfAutoFillScope"><option value="week" ${scope === "week" ? "selected" : ""}>This Week Only</option><option value="season" ${scope === "season" ? "selected" : ""}>Entire Season</option></select></label><label class="tf-field"><span>Method</span><select id="tfAutoFillMode"><option value="manual" ${mode === "manual" ? "selected" : ""}>Manual Only — Unprotected</option><option value="random" ${mode === "random" ? "selected" : ""}>Random Fill Remaining</option><option value="auto" ${mode === "auto" ? "selected" : ""}>Auto Pick Remaining</option></select></label><label class="tf-field"><span>Timing</span><select id="tfAutoFillWindow" onchange="teamFantasyProtectionWindowChanged_()">${["thursday","saturday","sunday-early","sunday-afternoon","custom"].map(function(key){return `<option value="${key}" ${windowKey===key?"selected":""}>${teamFantasyEscape_(teamFantasyProtectionWindowLabel_(key))}</option>`;}).join("")}</select></label><label id="tfCustomLeadWrap" class="tf-field" ${windowKey === "custom" ? "" : "hidden"}><span>Minutes before first weekly kickoff</span><input id="tfCustomLeadMinutes" type="number" min="15" max="720" step="15" value="${custom}"></label><div class="tf-protection-penalties"><div><strong>Random Pick penalty:</strong> None</div><div><strong>Auto Pick penalty:</strong> ${penalty > 0 ? "-" + teamFantasyScore_(penalty) + " points per automatically filled position" : "None"}</div><div><strong>Scope:</strong> ${teamFantasyEscape_(scope === "week" ? "Week " + (targetWeek || currentWeek) + " only" : "Future eligible weeks for this season")}</div></div><button type="button" class="tf-button" onclick="teamFantasySaveProtection_()">Save Protection</button></div><div id="tfProtectionStatus" class="tf-muted">${mode === "manual" ? "Manual Only — no automatic protection is active." : expired ? "Week-only protection is not active for this week." : teamFantasyEscape_(activation.label || "Automatic fill will wait for the configured NFL window.")}</div></section>`;
}

async function teamFantasySaveProtection_() {
  var state = window.TEAM_FANTASY_STATE || {};
  var mode = document.getElementById("tfAutoFillMode"), windowEl = document.getElementById("tfAutoFillWindow"), custom = document.getElementById("tfCustomLeadMinutes"), scopeEl = document.getElementById("tfAutoFillScope"), status = document.getElementById("tfProtectionStatus");
  if (status) status.textContent = "Saving protection…";
  try {
    var scope = scopeEl && scopeEl.value === "week" ? "week" : "season";
    var res = await apiTeamFantasyPost_("saveTeamFantasyPick", {
      gameId: state.gameId,
      preferenceOnly: true,
      autoFillMode: mode ? mode.value : "manual",
      autoFillWindow: windowEl ? windowEl.value : "sunday-early",
      customLeadMinutes: custom ? Number(custom.value || 60) : 60,
      autoFillScope: scope,
      autoFillWeek: scope === "week" ? Number(state.week || 1) : ""
    });
    if (!res || res.success === false) throw new Error(res && (res.message || res.error) || "Could not save protection.");
    state.playerAutoFill = res.preference || state.playerAutoFill;
    if (status) status.textContent = res.message || "Protection saved.";
  } catch (err) { if (status) status.textContent = err && err.message ? err.message : "Could not save protection."; }
}

function teamFantasyRenderPlayoffPicture_(state) {
  var standings = state && state.standings || {}, rows = Array.isArray(standings.rows) ? standings.rows : [], league = standings.league || {}, cutoff = Math.max(0, Number(league.playoffTeams || 0));
  var method = String(league.qualificationMethod || standings.qualificationMethod || "record").toLowerCase() === "points" ? "points" : "record";
  var qualifierIds = {}; (standings.qualifiers || []).forEach(function(id){ qualifierIds[String(id)] = true; });
  var methodLabel = method === "points" ? "Points" : "Record";
  return `<section id="teamFantasyPlayoffs" class="tf-season-card"><h2>Playoff Picture</h2>${typeof teamFantasyLeagueSelectorHtml_ === "function" ? teamFantasyLeagueSelectorHtml_(state,"tfPlayoffLeagueSelector") : ""}<div class="tf-muted">Qualification Method: <strong>${methodLabel}</strong> · authoritative selected-league backend qualifiers for ${teamFantasyEscape_(league.leagueName || "this league")}.</div><div class="tf-playoff-list">${rows.map(function(r){var qualified=r.playoffQualified===true||qualifierIds[String(r.competitorId||"")]===true,atCutoff=cutoff>0&&Number(r.rank||0)===cutoff,status=qualified?(Number(state.week||0)>Number(state.settings&&state.settings.regularSeasonEndWeek||18)?"CLINCHED":"CURRENTLY IN"):"CURRENTLY OUT";var t=Number(r.regularTies||0),rec=`${Number(r.regularWins||0)}-${Number(r.regularLosses||0)}${t?"-"+t:""}`,value=method==="points"?`${teamFantasyScore_(r.regularPoints||0)} pts · ${rec}`:`${rec} · ${teamFantasyScore_(r.regularPoints||0)} pts`;return `<div class="tf-playoff-row ${qualified?"is-in":""} ${atCutoff?"is-cutoff":""}"><span class="rank">#${Number(r.rank||0)||"—"}</span><span class="name">${teamFantasyEscape_(r.name||r.username||r.entryId||"Player")}<span class="tf-playoff-status">${teamFantasyEscape_(status)}${atCutoff?" · PLAYOFF LINE":""}</span></span><span class="value">${teamFantasyEscape_(value)}</span></div>`;}).join("")||'<div class="tf-muted">Playoff standings are not available yet.</div>'}</div><div class="tf-data-note">The browser displays backend qualification only. Points uses cumulative regular-season Team Fantasy points; Record uses this league’s accumulated all-play W-L-T.</div></section>`;
}

/* RC24A_V18_SLOT_RUNTIME_OVERRIDE */
teamFantasyRenderSlot_ = function(state,lineup,slot){
  const entry=lineup.entry||{},pick=slot.pick||null;
  const entryId=String(entry.entryId||'');
  const slotId='tf-'+entryId.replace(/[^a-z0-9_-]/gi,'-')+'-'+slot.position;
  const metric=teamFantasyPositionMetric_(entryId,slot);
  const team=metric.team;
  const opponent=team?teamFantasyOpponentText_(team):'';
  const logo=pick?teamFantasyTeamLogoUrl_(pick.teamAbbr):'';
  const method=pick?teamFantasyPickMethodDisplay_(metric.method):'';
  const teamName=team&&team.name?team.name:String(pick&&pick.teamAbbr||'');
  const usage=team?Math.max(0,Number(team.usesRemaining||0))+' use'+(Number(team.usesRemaining||0)===1?'':'s')+' left':'';
  const rank=metric.rank?('Rank #'+metric.rank):'Rank —';
  const status=String(metric.status||'upcoming').toLowerCase();
  const statusWord=status.toUpperCase();
  const primary=teamFantasyMetricPrimaryLine_(metric,opponent);
  const bulkSelect=!pick&&!slot.locked?`<label class="tf-bulk-select" title="Include ${teamFantasyEscape_(slot.label)} in Random/Auto Fill Selected"><input type="checkbox" data-tf-bulk-position="1" data-entry-id="${teamFantasyEscape_(entryId)}" data-position="${teamFantasyEscape_(slot.position)}" checked><span>Fill</span></label>`:'';
  const editLabel=pick&&!slot.locked?'<span class="tf-edit-label">Edit · Make Changes Before Kickoff</span>':'';
  const lockLabel=slot.locked?'<span class="tf-lock-copy">🔒 Locked</span>':'';
  return`<div class="tf-slot tf-slot-compact ${pick?'has-pick':'needs-pick'} is-${teamFantasyEscape_(status)} ${slot.locked?'is-locked':''}" id="${slotId}" data-entry-id="${teamFantasyEscape_(entryId)}" data-position="${teamFantasyEscape_(slot.position)}" data-missing="${pick?'false':'true'}" onclick="teamFantasyHighlightSlot_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}')">
    <strong class="tf-slot-position">${teamFantasyEscape_(slot.label)}</strong>${bulkSelect}
    <span class="tf-slot-status-word">${teamFantasyEscape_(statusWord)}</span>
    <button type="button" class="tf-team-picker-button ${pick?'has-team':''}" ${slot.locked?'disabled aria-disabled="true"':`onclick="event.stopPropagation();teamFantasyHighlightSlot_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}');teamFantasyOpenTeamPicker_('${teamFantasyEscape_(entryId)}','${teamFantasyEscape_(slot.position)}')"`}>
      ${pick?`${logo?`<img src="${teamFantasyEscape_(logo)}" alt="">`:''}<span class="tf-team-line-r3"><span class="tf-team-name">${teamFantasyEscape_(teamName)}</span>${method?`<span class="tf-origin">${teamFantasyEscape_(method)}</span>`:''}</span><span class="tf-slot-live-line">${teamFantasyEscape_(primary)}</span><span class="tf-slot-points-r3">${teamFantasyScore_(metric.points)} pts</span><span class="tf-slot-usage">${teamFantasyEscape_(usage)}</span>${editLabel}${lockLabel}`:`<span class="tf-pick-empty">+ Choose</span><span class="tf-slot-live-line">${rank}</span><span class="tf-slot-points-r3">0 pts</span>`}
    </button>
  </div>`;
};
/* RC24A_V18_SLOT_RUNTIME_OVERRIDE_END */
