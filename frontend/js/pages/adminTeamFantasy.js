/* =========================================================
   TEAM FANTASY FOOTBALL ADMIN — v1.2.18j2
========================================================= */

(function teamFantasyAdminLoadCss_() {
  if (document.querySelector('link[data-team-fantasy-css="1"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const script = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src) : null;
  link.href = script ? new URL('../../css/team-fantasy.css?v=1218j2', script).href : './css/team-fantasy.css?v=1218j2';
  link.dataset.teamFantasyCss = '1';
  document.head.appendChild(link);
})();

function adminTfEscape_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function teamFantasyEnhanceAdminLanding_() {
  if (document.getElementById('teamFantasyAdminLauncher')) return;
  const root = document.getElementById('app') || document.querySelector('.admin-page') || document.body;
  if (!root) return;
  const card = document.createElement('div');
  card.id = 'teamFantasyAdminLauncher';
  card.className = 'card tf-admin-launcher';
  card.innerHTML = `
    <div><strong>🏈 Team Fantasy Football</strong><div class="tf-muted">NFL team-unit lineups, leagues, scoring, reminders and playoffs.</div></div>
    <button class="tf-button" onclick="navigate('admin-team-fantasy')">Open Team Fantasy</button>`;
  root.appendChild(card);
}

function adminTfValue_(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function adminTfChecked_(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}
function adminTfStatus_(message, error) {
  const el = document.getElementById('adminTfStatus');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'tf-status ' + (error ? 'is-error' : 'is-ok');
}

function adminTfActionStatus_(message, error) {
  adminTfStatus_(message, error);
  const el = document.getElementById('adminTfActionStatus');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'tf-status ' + (error ? 'is-error' : 'is-ok');
}

function adminTfFormatTime_(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function adminTfSystemStatusHtml_(dash) {
  const sys = dash && dash.systemStatus ? dash.systemStatus : {};
  const gameSaved = sys.gameSaved === true;
  const settingsSaved = sys.settingsSaved === true;
  const triggerActive = sys.triggerActive === true;
  const configured = sys.triggerConfigured === true;
  const lastStatus = String(sys.lastSyncStatus || 'never');
  const lastClass = lastStatus === 'error' ? 'is-error' : 'is-ok';
  return `
    <div class="tf-system-grid">
      <div><strong>Game saved</strong><div>${gameSaved ? '✅ Yes' : '❌ No'}</div></div>
      <div><strong>Rules/settings</strong><div>${settingsSaved ? '✅ Saved' : '❌ Missing'}</div></div>
      <div><strong>5-min sync</strong><div>${triggerActive ? '✅ Active (' + Number(sys.triggerCount || 0) + ')' : (configured ? '⚠️ Configured, trigger missing' : 'Off')}</div></div>
      <div class="${lastClass}"><strong>Last sync</strong><div>${adminTfEscape_(adminTfFormatTime_(sys.lastSyncAt))} · ${adminTfEscape_(lastStatus)}</div></div>
    </div>
    ${sys.lastSyncMessage ? `<div class="tf-muted" style="margin-top:8px;">${adminTfEscape_(sys.lastSyncMessage)}</div>` : ''}
  `;
}

function adminTfNotificationPolicyHtml_(dash) {
  const center = dash && dash.notificationCenter ? dash.notificationCenter : {};
  const game = center.game || {};
  const policy = center.policy || {};
  const active = policy.enabled === true && game.enabled === true && game.autoReminderEnabled === true && game.paused !== true;
  const testOnly = String(center.globalMode || '').toUpperCase() === 'TEST' || game.testOnly === true;
  return `<div class="tf-muted" style="margin-bottom:10px;"><strong>Automatic reminder status:</strong> ${active ? 'Enabled' : 'Not active'} · Global ${adminTfEscape_(center.globalMode || 'unknown')} · Notification Center auto ${game.autoReminderEnabled === true ? 'ON' : 'OFF'} · Team Fantasy gate ${policy.enabled === true ? 'ON' : 'OFF'}${testOnly ? ' · TEST only' : ''}</div>`;
}

function adminTfSetBusy_(buttonId, busy, busyText, normalText) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.disabled = !!busy;
  button.textContent = busy ? busyText : normalText;
}

async function adminTfRefreshSystemStatus_() {
  const gameId = String((typeof getFrontendGameId === 'function' && getFrontendGameId()) || '');
  if (!gameId) return null;
  const dash = await api('adminGetTeamFantasyDashboard', { gameId: gameId });
  if (dash && dash.success !== false) {
    window.ADMIN_TEAM_FANTASY_DASH = dash;
    const el = document.getElementById('adminTfSystemStatus');
    if (el) el.innerHTML = adminTfSystemStatusHtml_(dash);
  }
  return dash;
}

async function adminTfGetGames_() {
  const res = await api('adminGetGames', {});
  const games = res && Array.isArray(res.games) ? res.games : [];
  return { response: res, games: games.filter(function(game){ return String(game.type || game.gameType || '').toLowerCase() === 'team-fantasy'; }) };
}

async function renderAdminTeamFantasyPage() {
  if (typeof setPageLoadStep === 'function') setPageLoadStep(48, 'Loading Team Fantasy admin…');
  const found = await adminTfGetGames_();
  if (!found.response || found.response.success === false) return `<div class="page tf-admin-page"><div class="card"><h1>Team Fantasy Football</h1><div>Could not load games.</div></div></div>`;
  if (!found.games.length) {
    return `
      <div class="page tf-admin-page">
        <div class="tf-admin-header"><div><h1>Team Fantasy Football</h1><p>Create the season game first, then return here.</p></div><button class="tf-button secondary" onclick="navigate('admin')">Back</button></div>
        <div class="card"><h2>No Team Fantasy game yet</h2><p>Open <strong>Manage Games</strong>, create a game with type <strong>Team Fantasy Football</strong>, then open this manager again.</p><button class="tf-button" onclick="navigate('admin-games')">Open Manage Games</button></div>
      </div>`;
  }
  const requested = String((typeof getFrontendGameId === 'function' && getFrontendGameId()) || '');
  const game = found.games.filter(function(g){return String(g.gameId || g.GameId) === requested;})[0] || found.games[0];
  const gameId = String(game.gameId || game.GameId || '');
  if (typeof setFrontendGameId === 'function') setFrontendGameId(gameId);
  const dash = await api('adminGetTeamFantasyDashboard', { gameId: gameId });
  if (!dash || dash.success === false) return `<div class="page tf-admin-page"><div class="card"><h1>Team Fantasy Football</h1><div>${adminTfEscape_(dash && (dash.error || dash.message) || 'Could not load Team Fantasy dashboard.')}</div></div></div>`;
  window.ADMIN_TEAM_FANTASY_DASH = dash;
  const s = dash.settings || {};
  const leagues = Array.isArray(dash.leagues) ? dash.leagues : [];
  const rules = Array.isArray(dash.rules) ? dash.rules : [];
  const standings = dash.standings && Array.isArray(dash.standings.rows) ? dash.standings.rows : [];
  return `
    <div class="page tf-admin-page">
      <div class="tf-admin-header">
        <div><div class="tf-eyebrow">ADMIN</div><h1>Team Fantasy Football</h1><p>One entry can participate in the Complete League plus multiple subleagues without making duplicate picks.</p></div>
        <button class="tf-button secondary" onclick="navigate('admin')">Back to Admin</button>
      </div>
      <div id="adminTfStatus" class="tf-status" aria-live="polite"></div>
      <section class="card">
        <div class="tf-card-heading"><div><h2>Season Game</h2><div class="tf-muted">Switch between Team Fantasy season games.</div></div></div>
        <select id="adminTfGame" onchange="adminTfSwitchGame_(this.value)">${found.games.map(function(g){const id=String(g.gameId||g.GameId||'');return `<option value="${adminTfEscape_(id)}" ${id===gameId?'selected':''}>${adminTfEscape_(g.name||g.gameName||id)}</option>`;}).join('')}</select>
      </section>
      <section class="card">
        <div class="tf-card-heading"><div><h2>Game Rules</h2><div class="tf-muted">Admin controls entry structure, usage limits, auto-pick and playoff behavior. Auto Pick penalties default to 0 for existing games and apply once per Auto Picked position.</div></div></div>
        <div class="tf-admin-grid">
          ${adminTfField_('adminTfSeasonYear','Season year','number',s.seasonYear)}
          ${adminTfField_('adminTfWeek','Current NFL week','number',s.currentWeek)}
          ${adminTfSelect_('adminTfEntryMode','Entry mode',s.entryMode,[['single','Single Entry'],['afc-nfc','AFC + NFC Entries']])}
          ${adminTfField_('adminTfUseLimit','Same team uses / position','number',s.teamUseLimit)}
          ${adminTfField_('adminTfAutoPenalty','Auto Pick Penalty Per Position','number',Number(s.autoPickPenaltyPerPosition||0))}
          ${adminTfField_('adminTfRegEnd','Regular season end week','number',s.regularSeasonEndWeek)}
          ${adminTfSelect_('adminTfStandingMode','Complete League standings',s.standingMode,[['combined-user','Combine AFC + NFC by Player'],['entries','Show Entries Separately']])}
          ${adminTfSelect_('adminTfPostMode','Postseason scoring',s.postseasonScoringMode,[['cumulative','Cumulative Postseason'],['fresh-round','Fresh Each Round']])}
          ${adminTfSelect_('adminTfUsagePlayoff','Playoff team-use limits',s.playoffUsageMode,[['reset','Reset for Playoffs'],['carry','Carry Regular-Season Usage']])}
          ${adminTfField_('adminTfOverallPlayoff','Complete League playoff teams','number',s.overallPlayoffTeams)}
          ${adminTfField_('adminTfSubPlayoff','Subleague default playoff teams','number',s.subleaguePlayoffDefault)}
        </div>
        <div class="tf-check-grid">
          ${adminTfCheck_('adminTfComplete','Complete League enabled',s.completeLeagueEnabled)}
          ${adminTfCheck_('adminTfMultiLeague','Same entry can join multiple leagues',s.sameEntryMultipleLeagues)}
          ${adminTfCheck_('adminTfRandom','Allow Random Pick',s.allowRandomPick)}
          ${adminTfCheck_('adminTfAuto','Allow ranked Auto Pick',s.allowSmartAutoPick)}
          ${adminTfCheck_('adminTfReminders','Missing-pick reminders',s.reminderEnabled)}
          ${adminTfCheck_('adminTfThursday','Thursday reminder',s.reminderThursday)}
          ${adminTfCheck_('adminTfSunday','Sunday reminder',s.reminderSunday)}
          ${adminTfCheck_('adminTfFinal','Final-window reminder',s.reminderFinalWindow)}
        </div>
        <div id="adminTfSystemStatus" class="tf-system-status">${adminTfSystemStatusHtml_(dash)}</div>
        <div id="adminTfActionStatus" class="tf-status" aria-live="polite"></div>
        <div class="tf-action-row"><button id="adminTfSaveButton" class="tf-button" onclick="adminTfSaveSettings_()">Save Game Rules</button><button id="adminTfSyncButton" class="tf-button secondary" onclick="adminTfRunSync_()">Run Team Fantasy Sync Now</button><button id="adminTfTriggerButton" class="tf-button secondary" onclick="adminTfInstallTrigger_()">Install / Update 5-min Sync</button></div>
      </section>
      <section class="card">
        <div class="tf-card-heading"><div><h2>Position Scoring</h2><div class="tf-muted">Turn any stat on/off and change its point value. Bonus rows use Threshold + Bonus.</div></div></div>
        <div class="tf-table-wrap"><table class="tf-table tf-rules-table"><thead><tr><th>On</th><th>Pos</th><th>Stat</th><th>Type</th><th>Pts/Unit</th><th>Threshold</th><th>Bonus</th></tr></thead><tbody>
          ${rules.map(function(r,i){return `<tr data-rule-index="${i}"><td><input class="tf-rule-active" type="checkbox" ${r.active?'checked':''}></td><td>${adminTfEscape_(r.position)}</td><td>${adminTfEscape_(r.label)}</td><td>${adminTfEscape_(r.ruleType)}</td><td><input class="tf-rule-points" type="number" step="0.01" value="${adminTfEscape_(r.pointsPerUnit)}"></td><td><input class="tf-rule-threshold" type="number" step="0.01" value="${r.threshold===null?'':adminTfEscape_(r.threshold)}"></td><td><input class="tf-rule-bonus" type="number" step="0.01" value="${adminTfEscape_(r.bonusPoints)}"></td></tr>`;}).join('')}
        </tbody></table></div>
        <button class="tf-button" onclick="adminTfSaveRules_()">Save Scoring</button>
      </section>
      <section class="card">
        <div class="tf-card-heading"><div><h2>Leagues</h2><div class="tf-muted">Complete League is automatic. Subleagues reuse the same entry and weekly picks.</div></div></div>
        <div class="tf-inline-form"><input id="adminTfLeagueName" placeholder="Family League"><input id="adminTfLeaguePlayoffs" type="number" min="2" value="${Number(s.subleaguePlayoffDefault||4)}"><select id="adminTfLeagueStanding"><option value="${s.standingMode==='entries'?'entries':'combined-user'}">Use game default</option><option value="combined-user">Combined Player</option><option value="entries">Separate Entries</option></select><select id="adminTfLeagueQualification"><option value="record">Record · all-play W-L-T</option><option value="points">Points · cumulative Team Fantasy points</option></select><button class="tf-button" onclick="adminTfCreateLeague_()">Create League</button></div>
        <div class="tf-chip-row">${leagues.map(function(l){return `<span class="tf-chip">${adminTfEscape_(l.LeagueName||l.leagueName||l.LeagueId)} · ${Number(l.PlayoffTeams||l.playoffTeams||0)||'auto'} playoffs</span>`;}).join('')}</div>
        ${adminTfR47LeagueQualificationEditor_(leagues)}
        <div class="tf-inline-form"><input id="adminTfMemberUser" placeholder="username"><select id="adminTfMemberLeague">${leagues.filter(function(l){return String(l.LeagueId||l.leagueId)!=='complete';}).map(function(l){return `<option value="${adminTfEscape_(l.LeagueId||l.leagueId)}">${adminTfEscape_(l.LeagueName||l.leagueName)}</option>`;}).join('')}</select><button class="tf-button secondary" onclick="adminTfAssignMember_()">Add User's Entry/Entries</button></div>
      </section>
      <section class="card">
        <div class="tf-card-heading"><div><h2>Weekly Reminders</h2><div class="tf-muted">Only players with open eligible lineup slots are targeted. Team Fantasy Missing-pick reminders is the master gate; Notification Center must also have this game enabled with Automatic Reminders on. The 24h/2h offsets follow enabled kickoff windows: Thursday first kickoff, Sunday first kickoff, and the week's final kickoff.</div></div></div>
        ${adminTfNotificationPolicyHtml_(dash)}
        <div class="tf-action-row"><button class="tf-button secondary" onclick="adminTfReminder_(true)">Preview Missing Picks</button><button class="tf-button" onclick="adminTfReminder_(false)">Send Reminder Now</button></div>
        <div id="adminTfReminderPreview"></div>
      </section>
      <section class="card"><div class="tf-card-heading"><div><h2>Current Week Auto Pick Penalties</h2><div class="tf-muted">Recorded by saved position and applied exactly once to weekly Team Fantasy scores.</div></div></div><div class="tf-chip-row">${(dash.currentWeekAutoPickPenalties||[]).filter(function(item){return Number(item.points||0)>0;}).map(function(item){return `<span class="tf-chip">${adminTfEscape_(item.entryId)} · -${Number(item.points||0).toFixed(1)} pts (${Number(item.positions||0)} position${Number(item.positions||0)===1?'':'s'})</span>`;}).join('')||'<span class="tf-muted">No Auto Pick penalties this week.</span>'}</div></section>
      <section class="card"><h2>Complete League Preview</h2><div class="tf-table-wrap"><table class="tf-table"><thead><tr><th>#</th><th>Entry</th><th>W</th><th>L</th><th>T</th><th>Win %</th><th>Pts</th></tr></thead><tbody>${standings.map(function(r){return `<tr><td>${r.rank}</td><td>${adminTfEscape_(r.entryId||r.username)}</td><td>${r.regularWins}</td><td>${r.regularLosses}</td><td>${r.regularTies}</td><td>${(Number(r.winPct||0)*100).toFixed(1)}%</td><td>${Number(r.regularPoints||0).toFixed(1)}</td></tr>`;}).join('')||'<tr><td colspan="7">No completed weeks yet.</td></tr>'}</tbody></table></div></section>
    </div>`;
}

function adminTfField_(id,label,type,value){return `<label class="tf-field"><span>${adminTfEscape_(label)}</span><input id="${id}" type="${type}" value="${adminTfEscape_(value)}"></label>`;}
function adminTfSelect_(id,label,value,options){return `<label class="tf-field"><span>${adminTfEscape_(label)}</span><select id="${id}">${options.map(function(o){return `<option value="${o[0]}" ${String(value)===o[0]?'selected':''}>${adminTfEscape_(o[1])}</option>`;}).join('')}</select></label>`;}
function adminTfCheck_(id,label,value){return `<label class="tf-check"><input id="${id}" type="checkbox" ${value?'checked':''}><span>${adminTfEscape_(label)}</span></label>`;}

async function adminTfSwitchGame_(gameId){ if(typeof setFrontendGameId==='function') setFrontendGameId(gameId); await navigate('admin-team-fantasy',{skipUnsavedCheck:true}); }

async function adminTfSaveSettings_() {
  const gameId = String((typeof getFrontendGameId === 'function' && getFrontendGameId()) || '');
  if (!gameId) { adminTfActionStatus_('Choose a saved Team Fantasy game first.', true); return; }
  adminTfSetBusy_('adminTfSaveButton', true, 'Saving…', 'Save Game Rules');
  adminTfActionStatus_('Saving Team Fantasy rules…', false);
  try {
    const res = await apiTeamFantasyPost_('adminSaveTeamFantasySettings', {
      gameId: gameId,
      seasonYear: adminTfValue_('adminTfSeasonYear'),
      currentWeek: adminTfValue_('adminTfWeek'),
      entryMode: adminTfValue_('adminTfEntryMode'),
      teamUseLimit: adminTfValue_('adminTfUseLimit'),
      completeLeagueEnabled: adminTfChecked_('adminTfComplete'),
      standingMode: adminTfValue_('adminTfStandingMode'),
      sameEntryMultipleLeagues: adminTfChecked_('adminTfMultiLeague'),
      allowRandomPick: adminTfChecked_('adminTfRandom'),
      allowSmartAutoPick: adminTfChecked_('adminTfAuto'),
      autoPickPenaltyPerPosition: adminTfValue_('adminTfAutoPenalty'),
      regularSeasonEndWeek: adminTfValue_('adminTfRegEnd'),
      postseasonScoringMode: adminTfValue_('adminTfPostMode'),
      playoffUsageMode: adminTfValue_('adminTfUsagePlayoff'),
      overallPlayoffTeams: adminTfValue_('adminTfOverallPlayoff'),
      subleaguePlayoffDefault: adminTfValue_('adminTfSubPlayoff'),
      reminderEnabled: adminTfChecked_('adminTfReminders'),
      reminderThursday: adminTfChecked_('adminTfThursday'),
      reminderSunday: adminTfChecked_('adminTfSunday'),
      reminderFinalWindow: adminTfChecked_('adminTfFinal')
    });
    if (!res || res.success === false) {
      adminTfActionStatus_(res && (res.error || res.message) || 'Save failed.', true);
      return;
    }
    const saved = res.settings || {};
    adminTfActionStatus_('✅ Saved — ' + Number(saved.seasonYear || adminTfValue_('adminTfSeasonYear')) + ' Week ' + Number(saved.currentWeek || adminTfValue_('adminTfWeek')) + '.', false);
    await adminTfRefreshSystemStatus_();
  } catch (err) {
    adminTfActionStatus_(err && err.message ? err.message : 'Save failed.', true);
  } finally {
    adminTfSetBusy_('adminTfSaveButton', false, 'Saving…', 'Save Game Rules');
  }
}

async function adminTfSaveRules_() {
  const dash = window.ADMIN_TEAM_FANTASY_DASH || {};
  const base = Array.isArray(dash.rules) ? dash.rules : [];
  const trs = Array.from(document.querySelectorAll('.tf-rules-table tbody tr'));
  const rules = trs.map(function(tr, i) {
    const r = base[i] || {};
    return {
      ruleId: r.ruleId, position: r.position, statKey: r.statKey, label: r.label, ruleType: r.ruleType,
      pointsPerUnit: tr.querySelector('.tf-rule-points').value,
      threshold: tr.querySelector('.tf-rule-threshold').value,
      bonusPoints: tr.querySelector('.tf-rule-bonus').value,
      active: tr.querySelector('.tf-rule-active').checked
    };
  });
  adminTfActionStatus_('Saving scoring rules…', false);
  const res = await apiTeamFantasyPost_('adminSaveTeamFantasyRules', { gameId: getFrontendGameId(), rules: rules });
  if (!res || res.success === false) { adminTfActionStatus_(res && (res.error || res.message) || 'Scoring save failed.', true); return; }
  adminTfActionStatus_('✅ Scoring rules saved.', false);
}

async function adminTfRunSync_() {
  const gameId = String((typeof getFrontendGameId === 'function' && getFrontendGameId()) || '');
  if (!gameId) { adminTfActionStatus_('Choose a saved Team Fantasy game first.', true); return; }
  adminTfSetBusy_('adminTfSyncButton', true, 'Running sync…', 'Run Team Fantasy Sync Now');
  adminTfActionStatus_('Checking the NFL week and refreshing Team Fantasy scores…', false);
  try {
    const res = await apiTeamFantasyPost_('adminRunTeamFantasySync', { gameId: gameId, week: adminTfValue_('adminTfWeek') });
    if (!res || res.success === false) {
      adminTfActionStatus_('❌ ' + (res && (res.error || res.message) || 'Sync failed.'), true);
      await adminTfRefreshSystemStatus_();
      return;
    }
    const errors = Array.isArray(res.errors) ? res.errors.length : 0;
    adminTfActionStatus_(
      '✅ Sync complete — ' + Number(res.scheduleGames || 0) + ' NFL games checked · ' +
      Number(res.picks || 0) + ' lineup picks · ' + Number(res.scored || 0) + ' final · ' +
      Number(res.pending || 0) + ' pending' + (errors ? ' · ' + errors + ' errors' : '') + '.',
      errors > 0
    );
    await adminTfRefreshSystemStatus_();
  } catch (err) {
    adminTfActionStatus_(err && err.message ? err.message : 'Sync failed.', true);
  } finally {
    adminTfSetBusy_('adminTfSyncButton', false, 'Running sync…', 'Run Team Fantasy Sync Now');
  }
}

async function adminTfInstallTrigger_() {
  const gameId = String((typeof getFrontendGameId === 'function' && getFrontendGameId()) || '');
  if (!gameId) { adminTfActionStatus_('Choose a saved Team Fantasy game first.', true); return; }
  adminTfSetBusy_('adminTfTriggerButton', true, 'Installing…', 'Install / Update 5-min Sync');
  adminTfActionStatus_('Installing and verifying the 5-minute Team Fantasy game-day sync…', false);
  try {
    const res = await apiTeamFantasyPost_('adminInstallTeamFantasySyncTrigger', { gameId: gameId });
    if (!res || res.success === false) {
      adminTfActionStatus_('❌ ' + (res && (res.error || res.message) || 'Trigger install failed.'), true);
      return;
    }
    const trigger = res.triggerStatus || {};
    if (trigger.active !== true) {
      adminTfActionStatus_('❌ Apps Script did not report an active Team Fantasy trigger after installation.', true);
      return;
    }
    adminTfActionStatus_('✅ 5-minute game-day sync installed and verified — active trigger count: ' + Number(trigger.count || 1) + '.', false);
    await adminTfRefreshSystemStatus_();
  } catch (err) {
    adminTfActionStatus_(err && err.message ? err.message : 'Trigger install failed.', true);
  } finally {
    adminTfSetBusy_('adminTfTriggerButton', false, 'Installing…', 'Install / Update 5-min Sync');
  }
}

async function adminTfCreateLeague_() {
  const name = adminTfValue_('adminTfLeagueName').trim();
  if (!name) { adminTfActionStatus_('Enter a league name.', true); return; }
  const res = await apiTeamFantasyPost_('adminCreateTeamFantasyLeague', { gameId: getFrontendGameId(), leagueName: name, playoffTeams: adminTfValue_('adminTfLeaguePlayoffs'), standingMode: adminTfValue_('adminTfLeagueStanding'), qualificationMethod: adminTfValue_('adminTfLeagueQualification') || 'record' });
  if (!res || res.success === false) { adminTfActionStatus_(res && (res.error || res.message) || 'Could not create league.', true); return; }
  adminTfActionStatus_('✅ League created.', false);
  await navigate('admin-team-fantasy', { skipUnsavedCheck: true });
}

async function adminTfAssignMember_() {
  const username = adminTfValue_('adminTfMemberUser').trim();
  const leagueId = adminTfValue_('adminTfMemberLeague');
  if (!username || !leagueId) { adminTfActionStatus_('Choose a league and enter a username.', true); return; }
  const res = await apiTeamFantasyPost_('adminAssignTeamFantasyLeagueMember', { gameId: getFrontendGameId(), leagueId: leagueId, memberUsername: username });
  if (!res || res.success === false) { adminTfActionStatus_(res && (res.error || res.message) || 'Could not add user.', true); return; }
  adminTfActionStatus_('✅ Added ' + Number(res.added || 0) + ' entry/entries to the league.', false);
  await navigate('admin-team-fantasy', { skipUnsavedCheck: true });
}

async function adminTfReminder_(previewOnly) {
  adminTfActionStatus_(previewOnly ? 'Building reminder preview…' : 'Sending reminders…', false);
  const res = await apiTeamFantasyPost_('adminSendTeamFantasyReminder', { gameId: getFrontendGameId(), previewOnly: !!previewOnly });
  if (!res || res.success === false) { adminTfActionStatus_(res && (res.error || res.message) || 'Reminder action failed.', true); return; }
  if (previewOnly) {
    const out = document.getElementById('adminTfReminderPreview');
    if (out) out.innerHTML = `<div class="tf-reminder-preview"><strong>${Number(res.missingUsers || 0)} users missing picks</strong>${(res.details || []).filter(function(d){ return d.missingCount > 0; }).map(function(d){ return `<div>${adminTfEscape_(d.username)} — ${d.picked}/${d.required}: ${adminTfEscape_((d.missing || []).join(', '))}</div>`; }).join('')}</div>`;
    adminTfActionStatus_('✅ Preview ready.', false);
  } else {
    adminTfActionStatus_((res.testDelivery ? 'TEST reminder complete — admin only: ' : 'Reminder send complete: ') + Number(res.sent || 0) + ' sent, ' + Number(res.failed || 0) + ' failed.', Number(res.failed || 0) > 0);
  }
}

/* RC24A_R47_TEAM_FANTASY_ADMIN_QUALIFICATION */
function adminTfR47Qualification_(league) {
  return String(league && (league.qualificationMethod || league.QualificationMethod) || "record").toLowerCase() === "points" ? "points" : "record";
}
function adminTfR47LeagueQualificationEditor_(leagues) {
  leagues = Array.isArray(leagues) ? leagues : [];
  if (!leagues.length) return "";
  return `<div class="tf-r47-league-methods"><div class="tf-muted"><strong>Playoff Qualification Method</strong> is stored per Team Fantasy league.</div>${leagues.map(function(l){var id=String(l.leagueId||l.LeagueId||""),name=String(l.leagueName||l.LeagueName||id),method=adminTfR47Qualification_(l);return `<div class="tf-r47-league-method-row"><span><strong>${adminTfEscape_(name)}</strong><small>${adminTfEscape_(id)}</small></span><select id="adminTfQualification_${adminTfEscape_(id.replace(/[^a-z0-9_-]/gi,"_"))}"><option value="record" ${method==="record"?"selected":""}>Record · all-play W-L-T</option><option value="points" ${method==="points"?"selected":""}>Points · cumulative Team Fantasy points</option></select><button class="tf-button secondary" onclick="adminTfR47SaveLeagueQualification_('${adminTfEscape_(id)}')">Save Method</button></div>`;}).join("")}</div>`;
}
async function adminTfR47SaveLeagueQualification_(leagueId) {
  var dash = window.ADMIN_TEAM_FANTASY_DASH || {}, leagues = Array.isArray(dash.leagues) ? dash.leagues : [];
  var league = leagues.find(function(l){return String(l.leagueId||l.LeagueId||"")===String(leagueId||"");});
  if (!league) { adminTfActionStatus_("League not found.", true); return; }
  var safeId = String(leagueId||"").replace(/[^a-z0-9_-]/gi,"_");
  var select = document.getElementById("adminTfQualification_" + safeId);
  var res = await apiTeamFantasyPost_("adminCreateTeamFantasyLeague", {
    gameId: getFrontendGameId(),
    leagueId: String(league.leagueId||league.LeagueId||""),
    leagueName: String(league.leagueName||league.LeagueName||leagueId),
    playoffTeams: Number(league.playoffTeams||league.PlayoffTeams||4),
    standingMode: String(league.standingMode||league.StandingMode||"combined-user"),
    qualificationMethod: select && select.value === "points" ? "points" : "record"
  });
  if (!res || res.success === false) { adminTfActionStatus_(res && (res.error||res.message) || "Could not save qualification method.", true); return; }
  adminTfActionStatus_("✅ Qualification method saved for " + String(league.leagueName||league.LeagueName||leagueId) + ".", false);
  if (typeof navigate === "function") setTimeout(function(){ navigate("admin-team-fantasy", {skipUnsavedCheck:true}); }, 150);
}
