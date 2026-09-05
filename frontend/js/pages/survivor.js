/* =====================================================
   SURVIVOR / ELIMINATION PLAYER PAGE v1.2.18y
   Manual Survivor + Sports Survivor + Streak Survivor + King of the Hill Score Strikes
===================================================== */

var SURVIVOR_PAGE_STATE = SURVIVOR_PAGE_STATE || { gameId: "", payload: null, selected: [], schedules: {} };

function survivorPageEscape_(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function survivorFormatLine_(value) {
  if (value === "" || value === null || value === undefined || isNaN(Number(value))) return "";
  var n = Number(value);
  return n > 0 ? "+" + n : String(n);
}

function survivorFormatKickoff_(value) {
  if (!value) return "";
  var date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  try { return date.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }); }
  catch (err) { return date.toLocaleString(); }
}

function survivorSelectedIds_() {
  return Array.isArray(SURVIVOR_PAGE_STATE.selected) ? SURVIVOR_PAGE_STATE.selected : (SURVIVOR_PAGE_STATE.selected ? [SURVIVOR_PAGE_STATE.selected] : []);
}

function survivorUnavailableLabel_(nominee) {
  var labels = {
    used: "Already used",
    started: "Game started",
    "road-only": "Road teams only",
    "underdogs-only": "Underdogs only",
    "division-only": "Division games only"
  };
  return labels[nominee.unavailableReason] || "Unavailable";
}

function survivorPickOption_(nominee, selected, disabled, sportsMode) {
  var selectedIds = Array.isArray(selected) ? selected : [selected];
  var isSelected = selectedIds.map(String).indexOf(String(nominee.id || "")) !== -1;
  var unavailable = sportsMode && nominee.eligible === false && !isSelected;
  var isDisabled = disabled || unavailable;
  if (!sportsMode) {
    return '<button type="button" class="survivor-choice ' + (isSelected ? 'selected' : '') + '" data-survivor-id="' + survivorPageEscape_(nominee.id) + '" ' + (isDisabled ? 'disabled' : '') + ' onclick="survivorSelect_(\'' + survivorPageEscape_(nominee.id) + '\')">' +
      (nominee.image ? '<img src="' + survivorPageEscape_(nominee.image) + '" alt="" loading="lazy">' : '<span class="survivor-choice-placeholder">★</span>') +
      '<span>' + survivorPageEscape_(nominee.name || nominee.shortAnswer || nominee.id) + '</span>' +
    '</button>';
  }

  var record = nominee.teamRecord ? " (" + survivorPageEscape_(nominee.teamRecord) + ")" : "";
  var opponentRecord = nominee.opponentRecord ? " (" + survivorPageEscape_(nominee.opponentRecord) + ")" : "";
  var matchup = nominee.opponent
    ? (String(nominee.side || "").toLowerCase() === "away" ? "@ " : "vs ") + survivorPageEscape_(nominee.opponent) + opponentRecord
    : "";
  var spread = survivorFormatLine_(nominee.spread);
  var odds = [];
  if (spread) odds.push("Spread " + spread);
  if (nominee.moneyline !== "" && nominee.moneyline !== null && nominee.moneyline !== undefined) odds.push("Odds " + survivorPageEscape_(nominee.moneyline));
  var used = Number(nominee.usedCount || 0);
  var useText = used > 0 ? '<span class="survivor-team-used">Used ' + used + (Number(nominee.useLimit || 0) > 0 ? '/' + survivorPageEscape_(nominee.useLimit) : '') + '</span>' : '';
  var lockText = unavailable ? '<span class="survivor-team-unavailable">' + survivorPageEscape_(survivorUnavailableLabel_(nominee)) + '</span>' : '';
  var idJs = String(nominee.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  var teamJs = String(nominee.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  return '<article class="survivor-team-card ' + (isSelected ? 'selected ' : '') + (unavailable ? 'unavailable' : '') + '">' +
    '<button type="button" class="survivor-team-pick" data-survivor-id="' + survivorPageEscape_(nominee.id) + '" ' + (isDisabled ? 'disabled' : '') + ' onclick="survivorSelect_(\'' + idJs + '\')">' +
      '<span class="survivor-team-logo">' + (nominee.image ? '<img src="' + survivorPageEscape_(nominee.image) + '" alt="" loading="lazy">' : '🏈') + '</span>' +
      '<span class="survivor-team-main"><strong>' + survivorPageEscape_(nominee.name) + record + '</strong>' +
        (matchup ? '<span class="survivor-matchup">' + matchup + '</span>' : '') +
        (nominee.kickoff ? '<small>' + survivorPageEscape_(survivorFormatKickoff_(nominee.kickoff)) + '</small>' : '') +
      '</span>' +
      '<span class="survivor-team-meta">' + (odds.length ? '<b>' + odds.join(' · ') + '</b>' : '') + useText + lockText + (isSelected ? '<span class="survivor-selected-mark">✓ Selected</span>' : '') + '</span>' +
    '</button>' +
    ((SURVIVOR_PAGE_STATE.payload && SURVIVOR_PAGE_STATE.payload.settings && SURVIVOR_PAGE_STATE.payload.settings.showSchedule) ? '<button type="button" class="survivor-schedule-toggle" onclick="survivorToggleSchedule_(\'' + idJs + '\', \'' + teamJs + '\')">Schedule ▾</button><div id="survivorSchedule_' + survivorPageEscape_(nominee.id) + '" class="survivor-team-schedule" hidden></div>' : '') +
  '</article>';
}

function survivorUpdateSaveButton_() {
  var round = SURVIVOR_PAGE_STATE.payload && SURVIVOR_PAGE_STATE.payload.currentRound;
  var required = round && Number(round.requiredSelections || 1) || 1;
  var selected = survivorSelectedIds_();
  document.querySelectorAll('.survivor-team-card').forEach(function(card) {
    var button = card.querySelector('[data-survivor-id]');
    var id = button ? String(button.dataset.survivorId || '') : '';
    card.classList.toggle('selected', selected.indexOf(id) !== -1);
    var mark = card.querySelector('.survivor-selected-mark');
    if (mark) mark.textContent = selected.indexOf(id) !== -1 ? '✓ Selected' : '';
  });
  document.querySelectorAll('.survivor-choice').forEach(function(button) {
    button.classList.toggle('selected', selected.indexOf(String(button.dataset.survivorId || '')) !== -1);
  });
  var save = document.getElementById('survivorSaveButton');
  if (save) save.disabled = selected.length !== required;
  var count = document.getElementById('survivorSelectionCount');
  if (count) count.textContent = selected.length + ' / ' + required + ' selected';
}

function survivorSelect_(nomineeId) {
  var round = SURVIVOR_PAGE_STATE.payload && SURVIVOR_PAGE_STATE.payload.currentRound;
  if (!round || !round.canPick) return;
  var required = Number(round.requiredSelections || 1) || 1;
  var selected = survivorSelectedIds_().slice();
  var id = String(nomineeId || '');
  var existing = selected.indexOf(id);
  if (existing !== -1) selected.splice(existing, 1);
  else if (required === 1) selected = [id];
  else if (selected.length < required) selected.push(id);
  else {
    selected.shift();
    selected.push(id);
  }
  SURVIVOR_PAGE_STATE.selected = selected;
  survivorUpdateSaveButton_();
}

async function survivorSaveCurrent_() {
  var payload = SURVIVOR_PAGE_STATE.payload || {};
  var round = payload.currentRound;
  var nomineeIds = survivorSelectedIds_();
  var message = document.getElementById('survivorSaveMessage');
  if (!round || !nomineeIds.length) return;
  var session = typeof getSession === 'function' ? (getSession() || {}) : {};
  var confidence = document.getElementById('survivorConfidenceRisk');
  if (message) { message.textContent = 'Saving…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveSurvivorPick({
      username: session.username || '',
      gameId: SURVIVOR_PAGE_STATE.gameId,
      categoryId: round.categoryId,
      nomineeId: nomineeIds[0],
      nomineeIds: nomineeIds,
      confidencePoints: confidence ? confidence.value : 0
    });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save Survivor pick.');
    if (message) message.textContent = 'Saved ✓';
    window.setTimeout(function() { navigate('survivor', { skipUnsavedCheck: true }); }, 350);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save Survivor pick.'; message.classList.add('error'); }
  }
}

async function survivorToggleSchedule_(nomineeId, team) {
  var box = document.getElementById('survivorSchedule_' + nomineeId);
  if (!box) return;
  if (!box.hidden) { box.hidden = true; return; }
  box.hidden = false;
  if (SURVIVOR_PAGE_STATE.schedules[team]) {
    box.innerHTML = survivorScheduleHtml_(SURVIVOR_PAGE_STATE.schedules[team]);
    return;
  }
  box.innerHTML = '<div class="survivor-schedule-loading">Loading schedule…</div>';
  try {
    var res = await apiGetSurvivorTeamSchedule(SURVIVOR_PAGE_STATE.gameId, team);
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Schedule unavailable.');
    SURVIVOR_PAGE_STATE.schedules[team] = res.schedule || [];
    box.innerHTML = survivorScheduleHtml_(SURVIVOR_PAGE_STATE.schedules[team]);
  } catch (err) {
    box.innerHTML = '<div class="survivor-schedule-loading error">' + survivorPageEscape_(err.message || err) + '</div>';
  }
}

function survivorScheduleHtml_(rows) {
  if (!rows || !rows.length) return '<div class="survivor-schedule-loading">No schedule games found.</div>';
  return '<div class="survivor-schedule-grid">' + rows.map(function(row) {
    var result = row.completed && row.teamScore !== '' && row.teamScore !== undefined
      ? '<b>' + survivorPageEscape_(row.teamScore) + '–' + survivorPageEscape_(row.opponentScore) + '</b>' : '';
    return '<div><span>W' + survivorPageEscape_(row.week || '—') + '</span><strong>' + (row.homeAway === 'AWAY' ? '@ ' : 'vs ') + survivorPageEscape_(row.opponent || '') + (row.opponentRecord ? ' (' + survivorPageEscape_(row.opponentRecord) + ')' : '') + '</strong><small>' + survivorPageEscape_(survivorFormatKickoff_(row.kickoff)) + '</small>' + result + '</div>';
  }).join('') + '</div>';
}

function survivorHistory_(payload) {
  var rounds = Array.isArray(payload.rounds) ? payload.rounds : [];
  if (!rounds.length) return '';
  var labels = {
    survived: 'Survived', eliminated: 'Eliminated', missed: 'Missed — Eliminated',
    picked: 'Pick Saved', open: 'Open', upcoming: 'Upcoming', 'after-elimination': 'Out',
    'life-used': 'Loss — Life Used', 'safe-loss': 'Loss — Safe Week', 'loss-reset': 'Loss — Streak Reset',
    push: 'Push / Survived', pending: 'Waiting for Final'
  };
  var sports = payload.sportsMode === true;
  return '<section class="card survivor-history-card"><h2>' + (sports ? 'Weekly History' : 'Round History') + '</h2><div class="survivor-history-list">' + rounds.map(function(round) {
    var status = labels[round.status] || round.status || 'Upcoming';
    var pickText = Array.isArray(round.nomineeIds) && round.nomineeIds.length ? ' · ' + round.nomineeIds.join(', ') : '';
    var extra = sports && (payload.mode === 'streak-survivor' || payload.mode === 'streak-points-strikes') && round.resolved ? ' · Streak ' + survivorPageEscape_(round.winStreak || 0) + ' · ' + survivorPageEscape_(round.multiplier || 1) + '×' : '';
    return '<div class="survivor-history-row ' + survivorPageEscape_(round.status || '') + '"><span>' + (sports ? 'Week ' + survivorPageEscape_(round.week || round.round) : 'Round ' + survivorPageEscape_(round.round)) + '</span><strong>' + survivorPageEscape_(round.name) + survivorPageEscape_(pickText) + '</strong><em>' + survivorPageEscape_(status + extra) + '</em>' + (round.earnedPoints ? '<b>+' + survivorPageEscape_(round.earnedPoints) + '</b>' : '') + '</div>';
  }).join('') + '</div></section>';
}

function survivorStandings_(payload) {
  var rows = Array.isArray(payload.standings) ? payload.standings : [];
  if (!rows.length) return '<section class="card"><h2>Standings</h2><p>No Survivor entries yet.</p></section>';
  var koth = payload.mode === 'king-of-the-hill';
  var streak = (payload.mode === 'streak-survivor' || payload.mode === 'streak-points-strikes');
  var title = koth ? 'King of the Hill Standings' : (streak ? 'Streak Survivor Standings' : 'Survivor Standings');
  return '<section class="card survivor-standings-card"><div class="survivor-card-head"><h2>' + title + '</h2><button class="button secondary" type="button" onclick="navigate(\'leaderboard\')">Full Standings</button></div><div class="survivor-standings-list">' + rows.slice(0, 12).map(function(row, index) {
    var standingLabel;
    var scoreLabel;
    if (koth) {
      standingLabel = row.survivorWinner ? 'SOLE SURVIVOR' : (row.survivorAlive ? ((row.kothStrikes || 0) + '/' + (row.kothStrikeLimit || payload.strikeLimit || 3) + ' STRIKES') : 'ELIMINATED W' + survivorPageEscape_(row.survivorEliminatedRound || ''));
      scoreLabel = 'Avg ' + survivorPageEscape_(Number(row.kothSeasonAverage || 0).toFixed(1));
    } else if (streak) {
      standingLabel = 'STREAK ' + survivorPageEscape_(row.survivorWinStreak || 0) + ' · ' + survivorPageEscape_(row.survivorMultiplier || 1) + '×';
      scoreLabel = survivorPageEscape_(row.total || 0) + ' pts';
    } else {
      standingLabel = row.survivorWinner ? 'WINNER' : (row.survivorAlive ? 'ALIVE' : 'OUT R' + survivorPageEscape_(row.survivorEliminatedRound || ''));
      scoreLabel = survivorPageEscape_(row.total || 0) + ' pts';
    }
    return '<div class="survivor-standing-row ' + (row.survivorAlive ? 'alive' : 'out') + '"><span>#' + (index + 1) + '</span><strong>' + survivorPageEscape_(row.displayName || row.username) + '</strong><em>' + standingLabel + '</em><b>' + scoreLabel + '</b></div>';
  }).join('') + '</div></section>';
}

function survivorSportsRulesCard_(payload) {
  var settings = payload.settings || {};
  var streak = (payload.mode === 'streak-survivor' || payload.mode === 'streak-points-strikes');
  var parts = [];
  parts.push(streak ? 'Win consecutive weeks to build your scoring multiplier.' : (Number(payload.lossesAllowed || 0) ? 'You may absorb ' + payload.lossesAllowed + ' loss' + (Number(payload.lossesAllowed) === 1 ? '' : 'es') + ' before elimination.' : 'A losing pick eliminates you.'));
  parts.push(Number(payload.teamUseLimit || 0) > 0 ? 'Each team may be used ' + payload.teamUseLimit + ' time' + (Number(payload.teamUseLimit) === 1 ? '' : 's') + '.' : 'Team reuse is unlimited.');
  parts.push(settings.resultMode === 'spread' ? 'Picks are normally graded against the spread.' : 'Picks are normally graded straight up.');
  parts.push('Weekly twists shown on the current round can override these normal rules.');
  return '<section class="card survivor-rules-card"><h2>' + (streak ? 'How Streak Survivor Works' : 'How Sports Survivor Works') + '</h2><p>' + parts.join(' ') + '</p></section>';
}

function survivorKothStrikeMarks_(count, limit) {
  count = Math.max(0, Number(count || 0));
  limit = Math.max(1, Number(limit || 3));
  var marks = [];
  for (var i = 0; i < limit; i++) marks.push(i < count ? '●' : '○');
  return marks.join(' ');
}

function survivorKothHistory_(payload) {
  var rows = Array.isArray(payload.history) ? payload.history : [];
  if (!rows.length) return '<section class="card survivor-history-card"><h2>Strike History</h2><p>No KOTH week has been processed yet.</p></section>';
  return '<section class="card survivor-history-card"><h2>Strike History</h2><div class="survivor-history-list">' + rows.slice().reverse().map(function(row) {
    var sourceParts = Object.keys(row.sourceScores || {}).map(function(gameId) { return survivorPageEscape_(gameId) + ': ' + survivorPageEscape_(row.sourceScores[gameId]); });
    return '<div class="survivor-history-row ' + (row.strikeAwarded ? 'wrong' : 'right') + '"><span>W' + survivorPageEscape_(row.week) + '</span><strong>' + survivorPageEscape_(row.score) + ' pts' + (sourceParts.length > 1 ? '<small>' + sourceParts.join(' · ') + '</small>' : '') + '</strong><em>' + survivorPageEscape_(row.status || (row.strikeAwarded ? 'STRIKE' : 'SAFE')) + '</em><b>' + survivorPageEscape_(row.strikesAfter || 0) + '/' + survivorPageEscape_(payload.strikeLimit || 3) + '</b></div>';
  }).join('') + '</div></section>';
}

function renderKingOfHillPage_(payload) {
  var alive = payload.alive !== false;
  var headline = payload.winner ? 'Sole Survivor' : (alive ? 'Still on the Hill' : 'Eliminated');
  var latest = Number(payload.latestWeek || 0);
  var sourceText = (payload.sourceGameIds || []).length
    ? (payload.sourceGameIds || []).map(survivorPageEscape_).join(' + ')
    : 'No score source selected';
  var pacing = payload.pacingMode === 'automatic'
    ? 'Strike pacing recalculates automatically from players remaining, current strikes, and weeks remaining.'
    : ('Strike pacing: ' + survivorPageEscape_(payload.pacingMode || 'automatic') + '.');
  var latestCard = latest
    ? '<section class="card survivor-current-card"><div class="survivor-card-head"><div><span class="survivor-eyebrow">Week ' + survivorPageEscape_(latest) + ' Final</span><h2>' + survivorPageEscape_(payload.latestScore || 0) + ' points</h2><p>' + survivorPageEscape_(payload.actualRecipients || 0) + ' player' + (Number(payload.actualRecipients || 0) === 1 ? '' : 's') + ' received a strike this week.</p></div><span class="survivor-round-status locked">Final</span></div></section>'
    : '<section class="card survivor-current-card"><h2>Waiting for the first finalized source week</h2><p>King of the Hill is passive. You do not need to submit an extra pick.</p></section>';
  return '<div class="page survivor-page koth-page">' +
    '<header class="survivor-page-header"><div><span class="survivor-eyebrow">King of the Hill — Score Strikes</span><h1>' + survivorPageEscape_(payload.gameName || 'King of the Hill') + '</h1><p>Avoid the bottom. The lowest finalized weekly scores receive strikes; reach ' + survivorPageEscape_(payload.strikeLimit || 3) + ' and you are out.</p></div><div class="survivor-status-badge ' + (alive ? 'alive' : 'out') + '">' + headline + '<small>' + survivorKothStrikeMarks_(payload.strikes, payload.strikeLimit) + ' · ' + survivorPageEscape_(payload.strikes || 0) + '/' + survivorPageEscape_(payload.strikeLimit || 3) + ' strikes</small></div></header>' +
    '<section class="card survivor-rules-card"><h2>How King of the Hill Works</h2><p>No extra weekly pick is required. Your KOTH value comes from <strong>' + sourceText + '</strong>' + ((payload.sourceGameIds || []).length > 1 ? ' using <strong>' + survivorPageEscape_(payload.combineMode || 'sum') + '</strong> combination' : '') + '. ' + pacing + ' Eliminated players remain active in their original source games.</p></section>' +
    latestCard + survivorKothHistory_(payload) + survivorStandings_(payload) +
  '</div>';
}

function survivorCurrentRoundHtml_(payload) {
  var round = payload.currentRound;
  if (!round || !payload.alive) return '';
  var sports = payload.sportsMode === true;
  var required = Number(round.requiredSelections || 1) || 1;
  var ruleText = '';
  if (sports && round.rules) {
    var twists = [];
    if (round.rules.doublePick) twists.push('DOUBLE PICK — both teams must win');
    if (round.rules.redemption) twists.push('REDEMPTION — either team can save you');
    if (round.rules.safe) twists.push('SAFE WEEK — a loss does not use a life');
    if (round.rules.underdogsOnly) twists.push('UNDERDOGS ONLY');
    if (round.rules.roadOnly) twists.push('ROAD TEAMS ONLY');
    if (round.rules.divisionOnly) twists.push('DIVISION GAMES ONLY');
    if (round.rules.resultMode === 'spread') twists.push('AGAINST THE SPREAD');
    if (round.rules.secondChance) twists.push('SECOND CHANCE WEEK');
    if (round.rules.confidence) twists.push('CONFIDENCE / RISK WEEK');
    if (twists.length) ruleText = '<div class="survivor-twist-banner">' + twists.map(function(twist) { return '<span>' + survivorPageEscape_(twist) + '</span>'; }).join('') + '</div>';
  }
  var confidenceHtml = sports && round.confidenceEnabled ? '<label class="survivor-confidence-risk">Confidence / risk <input id="survivorConfidenceRisk" type="number" min="0" max="' + survivorPageEscape_(round.maxConfidenceRisk || 0) + '" value="' + survivorPageEscape_(round.confidencePoints || 0) + '"><small>Maximum ' + survivorPageEscape_(round.maxConfidenceRisk || 0) + ' points</small></label>' : '';
  var choices = '<div class="' + (sports ? 'survivor-team-grid' : 'survivor-choice-grid') + '">' + (round.nominees || []).map(function(nominee) { return survivorPickOption_(nominee, survivorSelectedIds_(), !round.canPick, sports); }).join('') + '</div>';
  return '<section class="card survivor-current-card"><div class="survivor-card-head"><div><span class="survivor-eyebrow">' + (sports ? 'Week ' + survivorPageEscape_(round.week || round.round) : 'Current Round ' + survivorPageEscape_(round.round)) + '</span><h2>' + survivorPageEscape_(round.name) + '</h2><p>' + (sports ? ('Pick ' + required + ' team' + (required === 1 ? '' : 's') + '. ' + (round.rules && round.rules.selectionRule === 'any' ? 'At least one must succeed.' : 'Every selected team must succeed.')) : (survivorPageEscape_(round.points) + ' survival point' + (Number(round.points) === 1 ? '' : 's'))) + '</p></div><span class="survivor-round-status ' + (round.canPick ? 'open' : 'locked') + '">' + (round.canPick ? 'Open' : 'Locked') + '</span></div>' +
    ruleText + choices + confidenceHtml +
    (round.canPick ? '<div class="survivor-save-row"><button id="survivorSaveButton" class="button" type="button" onclick="survivorSaveCurrent_()" ' + (survivorSelectedIds_().length === required ? '' : 'disabled') + '>' + ((round.pickNomineeIds && round.pickNomineeIds.length) || round.pickNomineeId ? 'Update Survivor Pick' : 'Save Survivor Pick') + '</button><span id="survivorSelectionCount" class="survivor-selection-count">' + survivorSelectedIds_().length + ' / ' + required + ' selected</span><span id="survivorSaveMessage" class="survivor-save-message"></span></div>' : '<p class="survivor-locked-note">This round is locked. Your saved pick is final.</p>') +
  '</section>';
}

async function renderSurvivorPage() {
  var gameId = typeof APP_STATE !== 'undefined' ? String(APP_STATE.gameId || '').trim() : '';
  if (!gameId) return '<div class="page"><div class="card error-card">Choose a Survivor game first.</div></div>';
  setPageLoadStep(55, 'Checking the current Survivor round…');
  var payload = await apiGetSurvivorState(gameId);
  if (!payload || payload.success === false) return '<div class="page"><div class="card error-card">' + survivorPageEscape_(payload && (payload.error || payload.message) || 'Could not load Survivor game.') + '</div></div>';
  SURVIVOR_PAGE_STATE.gameId = gameId;
  SURVIVOR_PAGE_STATE.payload = payload;
  SURVIVOR_PAGE_STATE.schedules = SURVIVOR_PAGE_STATE.schedules || {};
  if (payload.passiveKoth === true || payload.mode === 'king-of-the-hill') {
    SURVIVOR_PAGE_STATE.selected = [];
    return renderKingOfHillPage_(payload);
  }
  SURVIVOR_PAGE_STATE.selected = payload.currentRound && Array.isArray(payload.currentRound.pickNomineeIds)
    ? payload.currentRound.pickNomineeIds.slice()
    : (payload.currentRound && payload.currentRound.pickNomineeId ? [payload.currentRound.pickNomineeId] : []);

  var streak = (payload.mode === 'streak-survivor' || payload.mode === 'streak-points-strikes');
  var headline = streak ? ('Streak: ' + survivorPageEscape_(payload.winStreak || 0) + ' · ' + survivorPageEscape_(payload.currentMultiplier || 1) + '×') : (payload.winner ? 'You Won Survivor' : (payload.alive ? 'You Are Still Alive' : 'Your Entry Is Eliminated'));
  var sub;
  if (payload.sportsMode) {
    sub = streak
      ? 'Keep winning to grow your multiplier. A normal loss resets or reduces your streak according to the game rules.'
      : (payload.alive ? 'Choose from the eligible teams below. Used teams, kickoff locks, lives, ATS rules, and weekly twists are enforced automatically.' : ('Eliminated in Week ' + survivorPageEscape_(payload.eliminatedRound || '') + '.'));
  } else {
    sub = payload.alive
      ? (payload.complete ? 'All Survivor rounds have been settled. You survived every round.' : 'Pick one entry to survive the current round. If that entry is eliminated, your Survivor run ends.')
      : ('Eliminated in Round ' + survivorPageEscape_(payload.eliminatedRound || '') + (payload.eliminatedReason === 'missed' ? ' because no pick was saved.' : '.'));
  }

  var stats = payload.sportsMode
    ? (streak ? (survivorPageEscape_(payload.totalPoints || 0) + ' pts · Best streak ' + survivorPageEscape_(payload.bestStreak || 0)) : (survivorPageEscape_(payload.roundsSurvived || 0) + ' weeks survived · ' + survivorPageEscape_(payload.livesRemaining || 0) + ' lives remaining'))
    : (survivorPageEscape_(payload.roundsSurvived || 0) + ' rounds survived · ' + survivorPageEscape_(payload.totalPoints || 0) + ' pts');

  var roundHtml = survivorCurrentRoundHtml_(payload);
  if (!payload.currentRound && payload.alive) {
    roundHtml = '<section class="card survivor-current-card"><h2>All rounds settled</h2><p>' + (payload.winner ? 'You survived every round and finished as a Survivor winner.' : 'Your Survivor run is complete.') + '</p></section>';
  }

  return '<div class="page survivor-page">' +
    '<header class="survivor-page-header"><div><span class="survivor-eyebrow">' + (payload.sportsMode ? (streak ? 'Streak Survivor' : 'Sports Survivor') : 'Survivor / Elimination') + '</span><h1>' + survivorPageEscape_(payload.gameName || 'Survivor Game') + '</h1><p>' + sub + '</p></div><div class="survivor-status-badge ' + (payload.alive ? 'alive' : 'out') + '">' + headline + '<small>' + stats + '</small></div></header>' +
    (payload.sportsMode ? survivorSportsRulesCard_(payload) : '<section class="card survivor-rules-card"><h2>How Survivor Works</h2><p>Pick one entry you believe will <strong>survive</strong> the current round. The admin records the entry that was eliminated. If your pick is that eliminated entry—or you miss a settled round—you are out. Survive the round and earn that round’s points.</p></section>') +
    roundHtml + survivorHistory_(payload) + survivorStandings_(payload) +
  '</div>';
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
   SURVIVOR FOOTBALL + KING OF THE HILL — SPORTS RICH ART R3

   Sports Survivor remains a weekly selection game.
   King of the Hill remains passive score-strike elimination.

   Existing save/reuse/ATS/lock/elimination/strike calculations and
   source-game mechanics remain authoritative.
   ========================================================= */

function sportsRichSurvivorGameId_() {
  return String(
    (window.SURVIVOR_PAGE_STATE && SURVIVOR_PAGE_STATE.gameId) ||
    (typeof getFrontendGameId === "function" ? getFrontendGameId() : "") ||
    ""
  ).trim();
}

function sportsRichSurvivorEnabled_(payload) {
  const gameId = sportsRichSurvivorGameId_();
  if (
    !payload ||
    (payload.sportsMode !== true && payload.mode !== "king-of-the-hill") ||
    !window.PATTCSportsRich
  ) {
    return false;
  }

  const appearance = payload.appearance || null;

  /* RC23 lifecycle compatibility: this helper continues to own the Rich/Clean decision. */
  if (typeof PATTCSportsRich.isRich === "function" &&
      PATTCSportsRich.isRich(gameId, appearance)) {
    return true;
  }

  const bundle = PATTCSportsRich.appearance(gameId, appearance);
  const layout = String(PATTCSportsRich.layoutValue(bundle) || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  /* RC24A_LAUNCH_CORE_DEFAULT_SURVIVOR: Sports Default is Rich unless explicitly legacy/Clean. */
  return ["clean", "current", "classic", "legacy"].indexOf(layout) === -1;
}

function sportsRichSurvivorLogo_(nominee) {
  nominee = nominee || {};
  let source =
    nominee.image ||
    nominee.imageUrl ||
    nominee.logoUrl ||
    nominee.teamLogo ||
    "";

  if (!source) {
    const abbr = String(nominee.abbr || nominee.teamAbbr || nominee.id || "").trim();
    if (/^[A-Za-z]{2,4}$/.test(abbr)) {
      source = PATTCSportsRich.teamLogoUrl(abbr, "NFL");
    }
  }

  return PATTCSportsRich.img(source, {
    className: "survivor-rich-team-logo",
    variant: "logo",
    alt: (nominee.name || nominee.id || "Team") + " logo"
  });
}

function sportsRichSurvivorChoice_(nominee, round) {
  nominee = nominee || {};
  round = round || {};

  const selectedIds = typeof survivorSelectedIds_ === "function"
    ? survivorSelectedIds_().map(String)
    : [];
  const id = String(nominee.id || "");
  const selected = selectedIds.indexOf(id) !== -1;
  const unavailable = nominee.eligible === false && !selected;
  const disabled = !round.canPick || unavailable;
  const record = nominee.teamRecord ? "(" + survivorPageEscape_(nominee.teamRecord) + ")" : "";
  const opponentRecord = nominee.opponentRecord ? " (" + survivorPageEscape_(nominee.opponentRecord) + ")" : "";
  const matchup = nominee.opponent
    ? (String(nominee.side || "").toLowerCase() === "away" ? "@ " : "vs ") +
      survivorPageEscape_(nominee.opponent) + opponentRecord
    : "";
  const spread = typeof survivorFormatLine_ === "function"
    ? survivorFormatLine_(nominee.spread)
    : "";
  const odds = [];
  if (spread) odds.push("Spread " + spread);
  if (nominee.moneyline !== "" && nominee.moneyline !== null && nominee.moneyline !== undefined) {
    odds.push("ML " + survivorPageEscape_(nominee.moneyline));
  }

  const used = Number(nominee.usedCount || 0);
  const limit = Number(nominee.useLimit || 0);
  const usesRemaining = limit > 0 ? Math.max(0, limit - used) : null;
  const unavailableText = unavailable && typeof survivorUnavailableLabel_ === "function"
    ? survivorUnavailableLabel_(nominee)
    : "";

  const logo = sportsRichSurvivorLogo_(nominee);
  const idJs = String(id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const teamJs = String(nominee.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  return `<article class="survivor-rich-choice ${selected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}">
    <button
      type="button"
      class="survivor-rich-choice-main"
      data-survivor-id="${survivorPageEscape_(id)}"
      ${disabled ? "disabled" : ""}
      onclick="survivorSelect_('${idJs}')"
    >
      <span class="survivor-rich-logo-wrap">${logo || `<span class="survivor-rich-logo-fallback">🏈</span>`}</span>

      <span class="survivor-rich-choice-copy">
        <span class="survivor-rich-team-line">
          <strong>${survivorPageEscape_(nominee.name || nominee.id || "Team")}</strong>
          ${record ? `<small>${record}</small>` : ""}
        </span>
        <span class="survivor-rich-matchup">${matchup || "Opponent TBD"}</span>
        ${nominee.kickoff ? `<small>${survivorPageEscape_(survivorFormatKickoff_(nominee.kickoff))}</small>` : ""}
      </span>

      <span class="survivor-rich-choice-meta">
        ${odds.length ? `<b>${odds.join(" · ")}</b>` : ""}
        ${limit > 0 ? `<span class="survivor-rich-use ${usesRemaining === 0 ? "is-zero" : usesRemaining === 1 ? "is-low" : ""}">${used}/${limit} used · ${usesRemaining} left</span>` : (used > 0 ? `<span class="survivor-rich-use">Used ${used}</span>` : "")}
        ${unavailableText ? `<span class="survivor-rich-unavailable">${survivorPageEscape_(unavailableText)}</span>` : ""}
        ${selected ? `<span class="survivor-rich-selected">✓ YOUR PICK</span>` : ""}
      </span>
    </button>

    ${(SURVIVOR_PAGE_STATE.payload && SURVIVOR_PAGE_STATE.payload.settings && SURVIVOR_PAGE_STATE.payload.settings.showSchedule)
      ? `<button type="button" class="survivor-schedule-toggle survivor-rich-schedule-toggle" onclick="survivorToggleSchedule_('${idJs}', '${teamJs}')">Team schedule ▾</button>
         <div id="survivorSchedule_${survivorPageEscape_(id)}" class="survivor-team-schedule" hidden></div>`
      : ""}
  </article>`;
}

function sportsRichSurvivorCurrent_(payload) {
  payload = payload || {};
  const round = payload.currentRound;

  if (!round) {
    return `<section class="survivor-rich-current is-settled">
      <span class="sports-rich-kicker">SURVIVE THIS WEEK</span>
      <h2>${payload.winner ? "Season complete — you survived" : "All available weeks are settled"}</h2>
      <p>${payload.winner ? "You reached the end of the Survivor run." : "There is no open weekly choice right now."}</p>
    </section>`;
  }

  const required = Math.max(1, Number(round.requiredSelections || 1));
  const selected = survivorSelectedIds_();
  const rules = round.rules || {};
  const twists = [];
  if (rules.selectionRule === "any" && required > 1) twists.push("ANY ONE CAN SURVIVE");
  if (rules.roadOnly) twists.push("ROAD TEAMS ONLY");
  if (rules.underdogsOnly) twists.push("UNDERDOGS ONLY");
  if (rules.divisionOnly) twists.push("DIVISION GAMES ONLY");
  if (rules.againstSpread || rules.ats) twists.push("AGAINST THE SPREAD");
  if (rules.confidence) twists.push("CONFIDENCE / RISK WEEK");

  const choiceGrid = (round.nominees || [])
    .map(function(nominee) {
      return sportsRichSurvivorChoice_(nominee, round);
    })
    .join("");

  const confidence = round.confidenceEnabled
    ? `<label class="survivor-confidence-risk survivor-rich-confidence-risk">
         <span>Confidence / risk</span>
         <input id="survivorConfidenceRisk" type="number" min="0" max="${survivorPageEscape_(round.maxConfidenceRisk || 0)}" value="${survivorPageEscape_(round.confidencePoints || 0)}">
         <small>Maximum ${survivorPageEscape_(round.maxConfidenceRisk || 0)} points</small>
       </label>`
    : "";

  const action = round.canPick
    ? `<div class="survivor-rich-save-row">
         <button
           id="survivorSaveButton"
           class="button survivor-rich-save"
           type="button"
           onclick="survivorSaveCurrent_()"
           ${selected.length === required ? "" : "disabled"}
         >${((round.pickNomineeIds && round.pickNomineeIds.length) || round.pickNomineeId) ? "UPDATE SURVIVOR PICK" : "SAVE SURVIVOR PICK"}</button>
         <span id="survivorSelectionCount" class="survivor-selection-count">${selected.length} / ${required} selected</span>
         <span id="survivorSaveMessage" class="survivor-save-message"></span>
       </div>`
    : `<div class="survivor-rich-locked-note">🔒 This week is locked. Your saved choice is final.</div>`;

  return `<section class="survivor-rich-current ${round.canPick ? "is-open" : "is-locked"}">
    <div class="survivor-rich-current-head">
      <div>
        <span class="sports-rich-kicker">SURVIVE THIS WEEK</span>
        <h2>Week ${survivorPageEscape_(round.week || round.round)} · ${survivorPageEscape_(round.name || "Choose your team")}</h2>
        <p>Choose ${required} team${required===1 ? "" : "s"}. ${rules.selectionRule === "any" ? "At least one selection must succeed." : "Your selected team must survive the configured rule."}</p>
      </div>
      <span class="sports-rich-state ${round.canPick ? "" : "is-locked"}">${round.canPick ? "OPEN" : "LOCKED"}</span>
    </div>

    ${twists.length ? `<div class="survivor-rich-twist-strip">${twists.map(function(t){ return `<span>${survivorPageEscape_(t)}</span>`; }).join("")}</div>` : ""}

    <div class="survivor-rich-choice-grid">${choiceGrid}</div>

    ${confidence}
    ${action}
  </section>`;
}

function sportsRichSurvivorStatusStrip_(payload) {
  payload = payload || {};
  const alive = payload.alive !== false;
  const lives = Number(payload.livesRemaining || 0);
  const survived = Number(payload.roundsSurvived || 0);
  const strikes = Number(payload.strikes || payload.wrongPicks || 0);
  const maxLives = Number(payload.maxLives || payload.lives || 0);

  return `<section class="survivor-rich-status-strip">
    <div>
      <span>Status</span>
      <strong class="${alive ? "is-alive" : "is-out"}">${alive ? "ALIVE" : "ELIMINATED"}</strong>
    </div>
    <div>
      <span>Weeks survived</span>
      <strong>${survivorPageEscape_(survived)}</strong>
    </div>
    <div>
      <span>${maxLives > 0 ? "Lives remaining" : "Losses / strikes"}</span>
      <strong>${maxLives > 0 ? survivorPageEscape_(lives) : survivorPageEscape_(strikes)}</strong>
    </div>
    <div>
      <span>Current week</span>
      <strong>${survivorPageEscape_(payload.currentRound && (payload.currentRound.week || payload.currentRound.round) || "—")}</strong>
    </div>
  </section>`;
}

function sportsRichSurvivorPageHtml_(payload) {
  payload = payload || {};
  const gameId = sportsRichSurvivorGameId_();
  const appearance = PATTCSportsRich.appearance(gameId, payload.appearance || null);
  const assets = PATTCSportsRich.assets(gameId, appearance);
  const streak = (payload.mode === "streak-survivor" || payload.mode === "streak-points-strikes");
  const alive = payload.alive !== false;
  const headline = payload.winner
    ? "SURVIVOR WINNER"
    : alive ? "STILL ALIVE" : "ELIMINATED";
  const stats = streak
    ? `${survivorPageEscape_(payload.totalPoints || 0)} pts · best streak ${survivorPageEscape_(payload.bestStreak || 0)}`
    : `${survivorPageEscape_(payload.roundsSurvived || 0)} weeks survived · ${survivorPageEscape_(payload.livesRemaining || 0)} lives remaining`;

  return `<div
    class="page survivor-page sports-rich-survivor sports-default-survivor"
    ${PATTCSportsRich.styleAttr(gameId, appearance, "football", "NFL")}
  >
    <header
      class="survivor-page-header survivor-rich-hero sports-rich-hero-bg"
      ${PATTCSportsRich.bgAttrs(assets.hero, "--sports-rich-hero-image")}
    >
      <div>
        <span class="sports-rich-kicker">${streak ? "STREAK SURVIVOR" : "PATTC SURVIVOR FOOTBALL"}</span>
        <h1>${survivorPageEscape_(payload.gameName || "Survivor Football")}</h1>
        <p>One weekly decision. Pick a team, survive the configured rule, and keep your run alive.</p>
      </div>
      <div class="survivor-rich-hero-status ${alive ? "is-alive" : "is-out"}">
        <span>${headline}</span>
        <strong>${stats}</strong>
      </div>
    </header>

    ${sportsDefaultSurvivorSpotlight_(payload)}

    ${sportsRichSurvivorCurrent_(payload)}

    ${sportsRichSurvivorStatusStrip_(payload)}

    <details class="survivor-rich-rules">
      <summary>Rules, twists & eligibility</summary>
      ${typeof survivorSportsRulesCard_ === "function" ? survivorSportsRulesCard_(payload) : ""}
    </details>

    ${typeof survivorHistory_ === "function" ? survivorHistory_(payload) : ""}
    ${typeof survivorStandings_ === "function" ? survivorStandings_(payload) : ""}
  </div>`;
}

/* ---------- KING OF THE HILL ---------- */

function sportsRichKothAliveRows_(payload) {
  return (payload.standings || [])
    .filter(function(row) { return row.survivorAlive === true; })
    .sort(function(a,b) {
      const strikes = Number(b.kothStrikes || 0) - Number(a.kothStrikes || 0);
      if (strikes) return strikes;
      return Number(a.kothSeasonAverage || 0) - Number(b.kothSeasonAverage || 0);
    });
}

function sportsRichKothDangerBoard_(payload) {
  const aliveRows = sportsRichKothAliveRows_(payload);
  if (!aliveRows.length) return "";

  const limit = Number(payload.strikeLimit || 3);
  const rows = aliveRows.slice(0, 6).map(function(row) {
    const strikes = Number(row.kothStrikes || 0);
    const pct = Math.max(0, Math.min(100, Math.round((strikes / Math.max(1, limit)) * 100)));
    const danger = strikes >= limit - 1 ? "is-danger" : strikes >= Math.max(1, limit - 2) ? "is-warning" : "is-safe";

    return `<div class="koth-rich-danger-row ${danger}">
      <span class="koth-rich-danger-player">
        <strong>${survivorPageEscape_(row.displayName || row.username || "Player")}</strong>
        <small>Avg ${survivorPageEscape_(Number(row.kothSeasonAverage || 0).toFixed(1))}</small>
      </span>
      <span class="koth-rich-danger-meter"><i style="width:${pct}%"></i></span>
      <strong>${strikes}/${limit}</strong>
    </div>`;
  }).join("");

  return `<section class="koth-rich-danger-board">
    <div class="koth-rich-section-head">
      <div>
        <span class="sports-rich-kicker">ELIMINATION PRESSURE</span>
        <h2>Closest to the edge</h2>
      </div>
      <small>${aliveRows.length} player${aliveRows.length===1 ? "" : "s"} still alive</small>
    </div>
    <div class="koth-rich-danger-list">${rows}</div>
  </section>`;
}

function sportsRichKothPageHtml_(payload) {
  payload = payload || {};
  const gameId = sportsRichSurvivorGameId_();
  const appearance = PATTCSportsRich.appearance(gameId, payload.appearance || null);
  const assets = PATTCSportsRich.assets(gameId, appearance);
  const alive = payload.alive !== false;
  const winner = payload.winner === true;
  const strikes = Number(payload.strikes || 0);
  const limit = Number(payload.strikeLimit || 3);
  const latest = Number(payload.latestWeek || 0);
  const aliveRows = sportsRichKothAliveRows_(payload);
  const lateSeason = winner || aliveRows.length <= 3;
  const sourceText = (payload.sourceGameIds || []).length
    ? (payload.sourceGameIds || []).map(survivorPageEscape_).join(" + ")
    : "configured source game";

  return `<div
    class="page survivor-page koth-page sports-rich-koth ${lateSeason ? "is-last-man-stage" : ""}"
    ${PATTCSportsRich.styleAttr(gameId, appearance, "football", "NFL")}
  >
    <header
      class="survivor-page-header koth-rich-hero sports-rich-hero-bg"
      ${PATTCSportsRich.bgAttrs(assets.hero, "--sports-rich-hero-image")}
    >
      <div>
        <span class="sports-rich-kicker">${lateSeason ? "LAST MAN STANDING" : "PATTC KING OF THE HILL"}</span>
        <h1>${survivorPageEscape_(payload.gameName || "King of the Hill")}</h1>
        <p>Your fantasy/team score is the value. Avoid the bottom and avoid ${limit} strikes.</p>
      </div>

      <div class="koth-rich-strike-hero ${alive ? "" : "is-out"}">
        <span>${winner ? "SOLE SURVIVOR" : alive ? "STILL ON THE HILL" : "ELIMINATED"}</span>
        <strong>${survivorPageEscape_(strikes)}<small> / ${survivorPageEscape_(limit)}</small></strong>
        <em>STRIKES</em>
      </div>
    </header>

    <section class="koth-rich-primary">
      <div class="koth-rich-score-card">
        <span class="sports-rich-kicker">${latest ? "WEEK " + survivorPageEscape_(latest) + " FINAL" : "LATEST WEEK"}</span>
        <strong>${latest ? survivorPageEscape_(payload.latestScore || 0) : "—"} <small>pts</small></strong>
        <p>${latest ? survivorPageEscape_(payload.actualRecipients || 0) + " player" + (Number(payload.actualRecipients || 0)===1 ? "" : "s") + " received a strike." : "Waiting for the first finalized source week."}</p>
      </div>

      <div class="koth-rich-strike-card">
        <span>YOUR STRIKES</span>
        <strong>${typeof survivorKothStrikeMarks_ === "function" ? survivorKothStrikeMarks_(strikes, limit) : survivorPageEscape_(strikes + "/" + limit)}</strong>
        <small>${alive ? (Math.max(0, limit - strikes) + " strike" + (Math.max(0, limit-strikes)===1 ? "" : "s") + " from elimination") : "Run ended"}</small>
      </div>

      <div class="koth-rich-source-card">
        <span>SCORE SOURCE</span>
        <strong>${sourceText}</strong>
        <small>${(payload.sourceGameIds || []).length > 1 ? "Combine mode: " + survivorPageEscape_(payload.combineMode || "sum") : "Automatic weekly score feed"}</small>
      </div>
    </section>

    ${sportsRichKothDangerBoard_(payload)}

    <details class="koth-rich-rules">
      <summary>How strikes are awarded</summary>
      <div class="card survivor-rules-card">
        <p>No extra weekly pick is required. The lowest finalized weekly source scores receive strikes. Strike pacing and late-season elimination remain controlled by the existing KOTH engine.</p>
      </div>
    </details>

    ${typeof survivorKothHistory_ === "function" ? survivorKothHistory_(payload) : ""}
    ${typeof survivorStandings_ === "function" ? survivorStandings_(payload) : ""}
  </div>`;
}

/* RC24A Corrected Art — Survivor/KOTH presentation only. */
function sportsDefaultSurvivorOpponent_(round, nominee) {
  const target = String(nominee && nominee.opponent || "").trim().toLowerCase();
  if (!target) return null;
  return ((round && round.nominees) || []).find(function(item){
    const names = [item.name,item.id,item.abbr,item.teamAbbr].map(function(value){ return String(value||"").trim().toLowerCase(); });
    return names.indexOf(target) !== -1;
  }) || null;
}

function sportsDefaultSurvivorSpotlight_(payload) {
  payload = payload || {};
  const round = payload.currentRound || {};
  const selectedIds = typeof survivorSelectedIds_ === "function" ? survivorSelectedIds_().map(String) : [];
  const nominees = (round.nominees || []).slice();
  const selected = nominees.find(function(item){ return selectedIds.indexOf(String(item.id||"")) !== -1; }) || nominees.find(function(item){ return item.eligible !== false; }) || null;
  if (!selected) return "";
  const opponent = sportsDefaultSurvivorOpponent_(round, selected);
  const side = String(selected.side || "").toLowerCase();
  const selectedIsAway = side === "away";
  const away = selectedIsAway ? selected : (opponent || selected);
  const home = selectedIsAway ? (opponent || selected) : selected;
  const teamHtml = function(team, sideLabel){
    if (!team) return `<div class="sports-default-survivor-team is-empty"><span>Opponent</span><strong>TBD</strong></div>`;
    const logo = typeof sportsRichSurvivorLogo_ === "function" ? sportsRichSurvivorLogo_(team) : "";
    return `<div class="sports-default-survivor-team ${String(team.id||"")===String(selected.id||"")?"is-selected":""}">
      <div class="sports-default-survivor-logo">${logo || `<span>${survivorPageEscape_(team.abbr || team.teamAbbr || String(team.name||"TEAM").slice(0,3).toUpperCase())}</span>`}</div>
      <small>${sideLabel}</small><strong>${survivorPageEscape_(team.name || team.id || "Team")}</strong>
      ${team.teamRecord ? `<span>${survivorPageEscape_(team.teamRecord)}</span>` : ""}
    </div>`;
  };
  return `<section class="sports-default-survivor-spotlight">
    <div class="sports-default-survivor-prompt"><strong>SURVIVE THIS WEEK</strong><span>Pick 1 team you think will WIN.</span></div>
    <div class="sports-default-survivor-matchup">
      ${teamHtml(away,"AWAY")}
      <div class="sports-default-survivor-center"><span>WEEK ${survivorPageEscape_(round.week || round.round || "")}</span><b>@</b><strong>${survivorPageEscape_(survivorFormatKickoff_(selected.kickoff || round.lockDateTime || "") || "Kickoff TBD")}</strong>${selected.spread!==undefined&&selected.spread!==null&&String(selected.spread)!==""?`<small>${survivorPageEscape_(String(selected.spread))}</small>`:""}</div>
      ${teamHtml(home,"HOME")}
    </div>
    <button class="sports-default-survivor-primary" type="button" onclick="document.getElementById('survivorSaveButton')?.scrollIntoView({behavior:'smooth',block:'center'})">${selectedIds.length ? "SURVIVE THIS WEEK" : "CHOOSE YOUR TEAM"} →</button>
    <small class="sports-default-survivor-pick-note">${selectedIds.length ? "This is your current Week " + survivorPageEscape_(round.week || round.round || "") + " pick" : "Choose from the eligible teams below"}</small>
  </section>`;
}

function sportsDefaultKothStatus_(payload, strikes, limit) {
  if (payload.alive === false) return { key:"eliminated", label:"ELIMINATED", detail:"Your King of the Hill run has ended." };
  if (strikes >= Math.max(1, limit - 1)) return { key:"danger", label:"IN DANGER", detail:"One more strike and you're eliminated." };
  return { key:"safe", label:"SAFE", detail:"You're in good shape." };
}

function sportsDefaultKothPageHtml_(payload) {
  payload = payload || {};
  const gameId = sportsRichSurvivorGameId_();
  const appearance = PATTCSportsRich.appearance(gameId, payload.appearance || null);
  const assets = PATTCSportsRich.assets(gameId, appearance);
  const strikes = Number(payload.strikes || 0);
  const limit = Math.max(1, Number(payload.strikeLimit || 3));
  const latest = Number(payload.latestWeek || 0);
  const aliveRows = sportsRichKothAliveRows_(payload);
  const status = sportsDefaultKothStatus_(payload,strikes,limit);
  const currentRow = (payload.standings || []).find(function(row){ return row.isCurrentUser===true || row.currentUser===true; }) || {};
  const rank = Number(payload.latestRank || payload.weekRank || currentRow.kothLatestRank || currentRow.rank || 0);
  const sourceText = (payload.sourceGameIds || []).length ? (payload.sourceGameIds || []).map(survivorPageEscape_).join(" + ") : "Configured source game";
  const strikeMarks = Array.from({length:limit}).map(function(_,index){ return `<i class="${index<strikes?"is-filled":""}"></i>`; }).join("");
  return `<div class="page survivor-page koth-page sports-rich-koth sports-default-koth" ${PATTCSportsRich.styleAttr(gameId, appearance, "football", "NFL")}>
    <header class="koth-rich-hero sports-rich-hero-bg" ${PATTCSportsRich.bgAttrs(assets.hero,"--sports-rich-hero-image")}>
      <span class="sports-default-koth-league">NFL</span>
      <h1><span>♛</span>KING <small>OF THE</small> HILL</h1>
    </header>
    <section class="sports-default-koth-weekbar"><span class="is-live">${latest?"LIVE":"ACTIVE"}</span><strong>${latest?"Week "+latest:"Season"}</strong><span>🔒 Season Lock: ${survivorPageEscape_(payload.lockCountdown || "See source game")}</span></section>
    <section class="sports-default-koth-dashboard">
      <div class="sports-default-koth-score"><span>YOUR WEEKLY SCORE</span><strong>${latest?survivorPageEscape_(payload.latestScore || 0):"—"}<small> pts</small></strong><p>${rank?"Weekly Rank #"+rank:"Rank pending"}</p><em>${sourceText}</em></div>
      <div class="sports-default-koth-strikes"><span>STRIKES</span><strong>${strikes}<small> of ${limit}</small></strong><div>${strikeMarks}</div></div>
      <div class="sports-default-koth-status is-${status.key}"><span>STATUS</span><strong>${status.label}</strong><p>${status.detail}</p></div>
    </section>
    <section class="sports-default-koth-legend"><div><b>✓ SAFE</b><span>0 strikes</span></div><div><b>⚠ IN DANGER</b><span>1-${Math.max(1,limit-1)} strikes</span></div><div><b>⊗ ELIMINATED</b><span>${limit} strikes</span></div></section>
    <section class="sports-default-koth-lastman"><strong>🏆 LAST MAN STANDING</strong><span>${aliveRows.length || 0} player${aliveRows.length===1?"":"s"} remain below the strike limit.</span></section>
    ${sportsRichKothDangerBoard_(payload)}
    <details class="koth-rich-rules"><summary>Rules & How to Play</summary><div class="card survivor-rules-card"><p><strong>No weekly KOTH pick is required.</strong> Your configured source-game score is applied automatically. The lowest finalized scores receive strikes according to the existing KOTH rules.</p></div></details>
    ${typeof survivorStandings_ === "function" ? survivorStandings_(payload) : ""}
    ${typeof survivorKothHistory_ === "function" ? survivorKothHistory_(payload) : ""}
  </div>`;
}

/* ---------- Page wrapper ---------- */

const SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_ = renderSurvivorPage;
renderSurvivorPage = async function() {
  const gameId = typeof getFrontendGameId === "function" ? getFrontendGameId() : "";
  await PATTCSportsRich.prepare(gameId);

  const originalHtml = await SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_.apply(this, arguments);
  const payload = window.SURVIVOR_PAGE_STATE && SURVIVOR_PAGE_STATE.payload;

  if (!sportsRichSurvivorEnabled_(payload)) return originalHtml;

  const output = payload.mode === "king-of-the-hill"
    ? sportsDefaultKothPageHtml_(payload)
    : sportsRichSurvivorPageHtml_(payload);

  PATTCSportsRich.afterMount(
    payload.mode === "king-of-the-hill" ? ".sports-rich-koth" : ".sports-rich-survivor"
  );

  return output;
};

/* RC24A_R47_SURVIVOR_KOTH_SHARED_HERO */
function survivorR47SharedHeroAppearance_(gameId, payload) {
  if (payload && payload.appearance) return payload.appearance;
  try {
    if (window.PATTCSportsRich && typeof PATTCSportsRich.appearance === "function") return PATTCSportsRich.appearance(gameId, null);
  } catch (err) {}
  return null;
}
function survivorR47HeroEscape_(value) {
  if (typeof survivorPageEscape_ === "function") return survivorPageEscape_(value);
  return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function survivorR47HeroContext_(payload) {
  payload = payload || {};
  var koth = payload.mode === "king-of-the-hill", alive = payload.alive !== false;
  if (koth) {
    var limit = Math.max(1, Number(payload.strikeLimit || 3)), strikes = Math.max(0, Number(payload.strikes || 0));
    var headline = payload.winner ? "SOLE SURVIVOR" : (alive ? "ALIVE" : "ELIMINATED");
    return '<div class="survivor-status-badge '+(alive?'alive':'out')+'"><strong>'+survivorR47HeroEscape_(headline)+'</strong><small>'+strikes+'/'+limit+' strikes</small></div>';
  }
  var label = payload.winner ? "WINNER" : (alive ? "ALIVE" : "OUT");
  var detail = (payload.mode === "streak-survivor" || payload.mode === "streak-points-strikes") && payload.winStreak != null ? "Streak " + Number(payload.winStreak || 0) : "Weekly Survivor";
  return '<div class="survivor-status-badge '+(alive?'alive':'out')+'"><strong>'+survivorR47HeroEscape_(label)+'</strong><small>'+survivorR47HeroEscape_(detail)+'</small></div>';
}
function survivorR47SharedHeroHtml_(payload, appearance) {
  payload = payload || {};
  var runtime = window.AppearanceThemeRuntime || {};
  if (typeof runtime.sportsHeroForGameHtml !== "function" && typeof runtime.sportsHeroHtml !== "function") return "";
  var koth = payload.mode === "king-of-the-hill";
  var options = {
    kind: koth ? "koth" : "survivor",
    gameId: String(SURVIVOR_PAGE_STATE && SURVIVOR_PAGE_STATE.gameId || ""),
    gameName: payload.gameName || (koth ? "King of the Hill" : "Survivor Football"),
    accentColor: "#19a7ce",
    contextHtml: survivorR47HeroContext_(payload)
  };
  if (koth && Number(payload.strikeLimit || 0)) options.subtitle = "Your configured source score is the value. Avoid the bottom and avoid " + Number(payload.strikeLimit) + " strikes.";
  return typeof runtime.sportsHeroForGameHtml === "function"
    ? runtime.sportsHeroForGameHtml(appearance || {}, options)
    : runtime.sportsHeroHtml(appearance || {}, {gameId:options.gameId,title:options.gameName,kicker:koth?"PATTC KING OF THE HILL":"PATTC SURVIVOR FOOTBALL",subtitle:options.subtitle||"",accentColor:options.accentColor});
}
function survivorR47ReplaceHero_(html, hero) {
  html = String(html || ""); if (!hero) return html;
  var re = /<header\b[^>]*class=["'][^"']*survivor-page-header[^"']*["'][\s\S]*?<\/header>/i;
  if (re.test(html)) return html.replace(re, hero);
  return html.replace(/(<div\b[^>]*class=["'][^"']*survivor-page[^"']*["'][^>]*>)/i, "$1" + hero);
}
if (typeof renderSurvivorPage === "function" && !window.RC24A_R47_SURVIVOR_PAGE_BASE_) {
  window.RC24A_R47_SURVIVOR_PAGE_BASE_ = renderSurvivorPage;
  renderSurvivorPage = async function() {
    var html = await window.RC24A_R47_SURVIVOR_PAGE_BASE_.apply(this, arguments);
    var payload = window.SURVIVOR_PAGE_STATE && SURVIVOR_PAGE_STATE.payload || null;
    // KOTH final renderer owns one header and now reads Kent's shared GameAppearance sportsHero values.
    if (payload && payload.mode === "king-of-the-hill") return html;
    if (!payload || !(payload.sportsMode === true || payload.mode === "streak-survivor" || payload.mode === "streak-points-strikes")) return html;
    var gameId = String(SURVIVOR_PAGE_STATE.gameId || (typeof getFrontendGameId === "function" ? getFrontendGameId() : "") || "");
    /* RC24A_RC23_SURVIVOR_OUTER_LIFECYCLE: prepare current Appearance before the outer Rich/Clean decision. */
    if (gameId && window.PATTCSportsRich && typeof PATTCSportsRich.prepare === "function") {
      try { await PATTCSportsRich.prepare(gameId); } catch (err) {}
    }
    if (typeof sportsRichSurvivorEnabled_ === "function" && !sportsRichSurvivorEnabled_(payload)) return html;
    var appearance = survivorR47SharedHeroAppearance_(gameId, payload);
    if (!appearance && gameId && typeof apiGetGameAppearance === "function") {
      try { appearance = await apiGetGameAppearance(gameId); } catch (err) { appearance = null; }
    }
    return survivorR47ReplaceHero_(html, survivorR47SharedHeroHtml_(payload, appearance));
  };
}

/* RC24A Survivor final completion UI. Requires PATTCRC24ASportsCompletion. */
function survivorFinalCore_(){ return window.PATTCRC24ASportsCompletion || {}; }
function survivorFinalEscape_(v){ return typeof survivorPageEscape_==='function' ? survivorPageEscape_(v) : String(v||'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function survivorFinalSelectedIds_(){ return typeof survivorSelectedIds_==='function' ? survivorSelectedIds_().map(String) : []; }
function survivorFinalTeamLogo_(team){ return typeof sportsRichSurvivorLogo_==='function' ? sportsRichSurvivorLogo_(team||{}) : ''; }
function survivorFinalFormatKickoff_(v){ return typeof survivorFormatKickoff_==='function' ? survivorFormatKickoff_(v) : String(v||''); }

function survivorFinalTrailLogo_(row){
  row=row||{};
  var src=row.logoUrl||row.logo||row.image||'';
  if(src) return `<img class="survivor-final-trail-logo" src="${survivorFinalEscape_(src)}" alt="${survivorFinalEscape_(row.team||row.teamId||'Team')}" loading="lazy">`;
  return `<span class="survivor-final-trail-fallback">${survivorFinalEscape_(String(row.teamId||row.team||'?').slice(0,3).toUpperCase())}</span>`;
}
function survivorFinalLiveDetail_(payload,result){
  payload=payload||{}; result=result||{};
  var detail=payload.liveScoreboardClockPeriod||{};
  var periodLabel=result.periodLabel||detail.periodLabel||'';
  var period=result.period||detail.period||'';
  var clock=result.clock||detail.clock||'';
  var periodText=periodLabel || (period!==''&&period!=null ? ('Q'+String(period)) : '');
  return [periodText,clock].filter(Boolean).join(' · ');
}

function survivorFinalMatchups_(payload){
  const core=survivorFinalCore_();
  return core.survivorGroupMatchups ? core.survivorGroupMatchups((payload.currentRound&&payload.currentRound.nominees)||[], payload.rounds||[]) : [];
}

function survivorFinalTeamButton_(team, round){
  if(!team) return '<div class="survivor-final-team is-empty">TBD</div>';
  const selected=survivorFinalSelectedIds_().indexOf(String(team.id||''))!==-1;
  const disabled=team.eligible===false && !selected;
  const used=String(team.usedOverlay||'');
  const id=String(team.id||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return `<button type="button" class="survivor-final-team ${selected?'is-selected':''} ${disabled?'is-disabled':''}" ${disabled?'disabled':''} onclick="survivorSelect_('${id}')">
    ${survivorFinalTeamLogo_(team)}
    <span class="survivor-final-team-copy"><small>${survivorFinalEscape_(String(team.side||team.homeAway||'').toUpperCase())}</small><strong>${survivorFinalEscape_(team.name||team.id||'Team')}</strong>${team.teamRecord?`<em>${survivorFinalEscape_(team.teamRecord)}</em>`:''}</span>
    ${used?`<span class="survivor-final-used">${survivorFinalEscape_(used)}</span>`:''}
    ${selected?'<span class="survivor-final-check">✓</span>':''}
  </button>`;
}

function renderSurvivorFinalWeeklyBrowser_(payload){
  payload=payload||{}; const round=payload.currentRound||{}; const matchups=survivorFinalMatchups_(payload);
  if(!matchups.length) return '';
  return `<section class="survivor-final-browser"><div class="survivor-final-section-head"><div><span>WEEK ${survivorFinalEscape_(round.week||round.round||'')}</span><strong>Swipe the NFL slate</strong></div><small>Choose either eligible team</small></div>
    <div class="survivor-final-matchup-scroll">${matchups.map(m=>`<article class="survivor-final-matchup">
      <div class="survivor-final-matchup-meta"><span>${survivorFinalEscape_(survivorFinalFormatKickoff_(m.kickoff)||'Kickoff TBD')}</span>${m.weather?`<span>☁ ${survivorFinalEscape_(m.weather)}</span>`:''}</div>
      <div class="survivor-final-matchup-teams">${survivorFinalTeamButton_(m.away,round)}<span class="survivor-final-at">@</span>${survivorFinalTeamButton_(m.home,round)}</div>
      <div class="survivor-final-lines">${m.away&&m.away.spread!==''&&m.away.spread!=null?`<span>${survivorFinalEscape_(m.away.name)} ${survivorFinalEscape_(m.away.spread)}</span>`:''}${m.away&&m.away.moneyline!==''&&m.away.moneyline!=null?`<span>ML ${survivorFinalEscape_(m.away.moneyline)}</span>`:''}${m.total?`<span>Total ${survivorFinalEscape_(m.total)}</span>`:''}${m.home&&m.home.moneyline!==''&&m.home.moneyline!=null?`<span>ML ${survivorFinalEscape_(m.home.moneyline)}</span>`:''}</div>
    </article>`).join('')}</div></section>`;
}

function renderSurvivorFinalFeatured_(payload){
  payload=payload||{}; const round=payload.currentRound||{}; const selectedId=survivorFinalSelectedIds_()[0] || round.pickNomineeId || '';
  if(!selectedId) return `<section class="survivor-final-featured is-empty"><span>SURVIVE THIS WEEK</span><strong>Choose your team below</strong><small>Your selected matchup becomes the live scoreboard here.</small></section>`;
  const match=survivorFinalMatchups_(payload).find(m=>(m.teams||[]).some(t=>String(t.id||'')===String(selectedId)));
  if(!match) return '';
  const selected=(match.teams||[]).find(t=>String(t.id||'')===String(selectedId)); const opponent=selected===match.away?match.home:match.away;
  const r=selected&&selected.sportsResult||{}; const complete=r.completed===true||String(r.state||'').toLowerCase()==='post'||/final/i.test(String(r.status||'')); const live=!complete && (/live|progress/i.test(String(r.status||''))||String(r.state||'').toLowerCase()==='in');
  const selectedHome=String(selected&&selected.side||'').toLowerCase()==='home'; const ss=selectedHome?r.homeScore:r.awayScore; const os=selectedHome?r.awayScore:r.homeScore;
  return `<section class="survivor-final-featured ${live?'is-live':complete?'is-final':'is-pregame'}"><div class="survivor-final-featured-head"><span>${complete?'FINAL':live?'LIVE':'SURVIVE THIS WEEK'}</span><strong>${survivorFinalEscape_(selected.name||selected.id)}</strong>${live?`<em>${survivorFinalEscape_(survivorFinalLiveDetail_(payload,r)||r.status||'LIVE')}</em>`:''}</div><div class="survivor-final-scoreboard"><div>${survivorFinalTeamLogo_(selected)}<strong>${survivorFinalEscape_(selected.name||selected.id)}</strong>${ss!==''&&ss!=null?`<b>${survivorFinalEscape_(ss)}</b>`:''}</div><span>vs</span><div>${survivorFinalTeamLogo_(opponent)}<strong>${survivorFinalEscape_(opponent&& (opponent.name||opponent.id) || selected.opponent || 'Opponent')}</strong>${os!==''&&os!=null?`<b>${survivorFinalEscape_(os)}</b>`:''}</div></div><div class="survivor-final-featured-foot"><span>${survivorFinalEscape_(survivorFinalFormatKickoff_(selected.kickoff)||'Kickoff TBD')}</span><span>${selected.spread!==''&&selected.spread!=null?'Spread '+survivorFinalEscape_(selected.spread):''}</span><span>${selected.moneyline!==''&&selected.moneyline!=null?'ML '+survivorFinalEscape_(selected.moneyline):''}</span></div>${complete&&round.outcome?`<div class="survivor-final-result is-${survivorFinalEscape_(round.outcome)}">${survivorFinalEscape_(String(round.status||round.outcome).replace(/-/g,' ').toUpperCase())}${round.earnedPoints!==undefined?` · ${survivorFinalEscape_(round.earnedPoints)} pts`:''}</div>`:''}</section>`;
}

function renderSurvivorFinalTrail_(payload){
  payload=payload||{};
  var rows=Array.isArray(payload.usedTeamTrail)?payload.usedTeamTrail:(Array.isArray(payload.history)?payload.history:[]);
  if(!rows.length) return '';
  return `<section class="survivor-final-trail"><div class="survivor-final-section-head"><strong>USED TEAMS</strong><small>Tap a logo for week detail</small></div><div class="survivor-final-trail-row">${rows.map(function(row){
    var cls=row.resolved?(row.result==='win'||row.result==='push'?'is-success':'is-loss'):'is-pending';
    var score=row.finalScore?`<span>Final: ${survivorFinalEscape_(row.finalScore)}</span>`:'';
    var matchup=row.opponent?`<span>${survivorFinalEscape_(row.team||row.teamId)} vs ${survivorFinalEscape_(row.opponent)}</span>`:'';
    return `<details class="survivor-final-trail-item ${cls}"><summary><span>W${survivorFinalEscape_(row.week)}</span>${survivorFinalTrailLogo_(row)}</summary><div><b>Week ${survivorFinalEscape_(row.week)}</b><strong>${survivorFinalEscape_(row.team||row.teamId||'Team')}</strong>${matchup}${score}<span>Survivor: ${survivorFinalEscape_(row.survivorStatus||row.result||'pending')}</span><span>Streak after: ${survivorFinalEscape_(row.streak||0)}</span>${row.weeklyPoints!==undefined?`<span>Weekly points: ${survivorFinalEscape_(row.weeklyPoints)}</span>`:''}${row.seasonPoints!==undefined?`<span>Season points: ${survivorFinalEscape_(row.seasonPoints)}</span>`:''}<span>Strikes/losses used: ${survivorFinalEscape_(row.lossesUsed||0)}</span><span>Lives remaining: ${survivorFinalEscape_(row.livesRemaining||0)}</span></div></details>`;
  }).join('')}</div></section>`;
}

var SURVIVOR_RC24A_COMPARE_WEEK = '';
function survivorFinalCompareWeek_(payload){
  if(SURVIVOR_RC24A_COMPARE_WEEK) return SURVIVOR_RC24A_COMPARE_WEEK;
  var core=survivorFinalCore_();
  return core.survivorCompareDefaultWeek?core.survivorCompareDefaultWeek(payload):String(payload&&payload.currentRound&&payload.currentRound.week||'all');
}
function survivorFinalSetCompareWeek_(week){ SURVIVOR_RC24A_COMPARE_WEEK=String(week||'all'); var p=SURVIVOR_PAGE_STATE.payload||{}; var box=document.querySelector('.survivor-final-compare'); if(box) box.outerHTML=renderSurvivorFinalLeagueCompare_(p); }
function survivorFinalCompareLogo_(week){
  if(week.hidden) return '<span class="survivor-final-compare-lock" title="Hidden until lock/kickoff">🔒</span>';
  if(week.logoUrl) return `<img src="${survivorFinalEscape_(week.logoUrl)}" alt="${survivorFinalEscape_(week.team||'Team')}" loading="lazy">`;
  return `<span class="survivor-final-compare-abbr">${survivorFinalEscape_(String(week.teamId||week.team||'—').slice(0,3).toUpperCase())}</span>`;
}
function renderSurvivorFinalLeagueCompare_(payload){
  payload=payload||{}; const lc=payload.leagueContext||{}; const compare=payload.compare||[];
  if(!compare.length && !(lc.leagues||[]).length) return '';
  var selectedWeek=survivorFinalCompareWeek_(payload);
  var currentWeek=String(payload.currentRound&&payload.currentRound.week||'');
  var maxWeek=Math.max(1,Number(payload.currentRound&&payload.currentRound.week||payload.rounds&&payload.rounds.length||1));
  var weekOptions=[];
  if(currentWeek) weekOptions.push(`<option value="${survivorFinalEscape_(currentWeek)}" ${selectedWeek===currentWeek?'selected':''}>Current Week · W${survivorFinalEscape_(currentWeek)}</option>`);
  for(var i=maxWeek;i>=1;i--){ var w=String(i); if(w===currentWeek) continue; weekOptions.push(`<option value="${w}" ${selectedWeek===w?'selected':''}>Week ${w}</option>`); }
  weekOptions.push(`<option value="all" ${selectedWeek==='all'?'selected':''}>All Weeks</option>`);
  return `<section class="survivor-final-compare"><div class="survivor-final-section-head"><strong>COMPARE</strong><small>2+ players · pick privacy enforced</small></div><div class="survivor-final-compare-filters"><label>Week <select onchange="survivorFinalSetCompareWeek_(this.value)">${weekOptions.join('')}</select></label>${(lc.leagues||[]).length>1?`<label>League <select onchange="survivorFinalSwitchLeague_(this.value)">${lc.leagues.map(l=>`<option value="${survivorFinalEscape_(l.leagueId)}" ${l.leagueId===lc.leagueId?'selected':''}>${survivorFinalEscape_(l.leagueName||l.leagueId)}</option>`).join('')}</select></label>`:''}</div>${lc.pickScopeWarning?`<div class="survivor-final-warning">${survivorFinalEscape_(lc.pickScopeWarning)}</div>`:''}<div class="survivor-final-compare-grid">${compare.map(function(p){
    var visible=(p.weeks||[]).filter(function(w){return selectedWeek==='all'||String(w.week)===selectedWeek;});
    var logos=visible.length?visible.map(survivorFinalCompareLogo_).join(''):'<span class="survivor-final-compare-abbr">—</span>';
    return `<details><summary><span class="survivor-final-compare-player"><strong>${survivorFinalEscape_(p.displayName||p.username)}</strong><span class="survivor-final-compare-logos">${logos}</span></span><span>${p.alive===false?'ELIMINATED':'ALIVE'} · ${survivorFinalEscape_(p.totalPoints||0)} pts · ${survivorFinalEscape_(p.lossesUsed||0)} strikes</span></summary><div>${visible.map(w=>`<p><b>W${survivorFinalEscape_(w.week)}</b> ${w.hidden?'Pick hidden until lock/kickoff':survivorFinalEscape_(w.team||'No pick')}${w.opponent?' vs '+survivorFinalEscape_(w.opponent):''}${w.finalScore?' · '+survivorFinalEscape_(w.finalScore):''} · ${survivorFinalEscape_(w.result||'pending')}${w.weeklyPoints!==undefined&&w.weeklyPoints!==null?' · '+survivorFinalEscape_(w.weeklyPoints)+' pts':''}${w.streak!==undefined&&w.streak!==null?' · streak '+survivorFinalEscape_(w.streak):''}</p>`).join('')}</div></details>`;
  }).join('')}</div></section>`;
}

function survivorFinalSwitchLeague_(leagueId){
  try { localStorage.setItem('leagueId',leagueId||''); } catch(e){}
  if(typeof renderCurrentPage==='function') renderCurrentPage(); else if(typeof navigate==='function') navigate('survivor');
}

/* RC24A_FINAL_SURVIVOR_SPOTLIGHT_OVERRIDE */
if (typeof sportsDefaultSurvivorSpotlight_ === "function") {
  sportsDefaultSurvivorSpotlight_ = function(payload) {
    return renderSurvivorFinalFeatured_(payload) + renderSurvivorFinalWeeklyBrowser_(payload);
  };
}

/* RC24A_KOTH_FINALIZATION */
/* =========================================================
   RC24A KOTH FINAL PLAYER EXPERIENCE
   Presentation only. No weekly player pick exists.
   ========================================================= */

function kothFinalEscape_(value) {
  return typeof survivorPageEscape_ === "function" ? survivorPageEscape_(value) : String(value == null ? "" : value);
}

function kothFinalStrikeDots_(strikes, limit) {
  strikes = Math.max(0, Number(strikes || 0));
  limit = Math.max(1, Number(limit || 1));
  return Array.from({ length: limit }).map(function(_, index) {
    return '<i class="' + (index < strikes ? 'is-filled' : '') + '"></i>';
  }).join('');
}

function kothFinalAvatar_(row) {
  row = row || {};
  if (row.profileImageUrl) {
    return '<img src="' + kothFinalEscape_(row.profileImageUrl) + '" alt="' + kothFinalEscape_(row.displayName || row.username || 'Player') + '" loading="lazy">';
  }
  return '<span class="koth-final-avatar-fallback">P<small>' + kothFinalEscape_(row.fallbackInitials || '') + '</small></span>';
}

function kothFinalStateLabel_(row) {
  if (!row) return 'ACTIVE';
  if (row.statusKey === 'champion') return 'CHAMPION';
  if (row.statusKey === 'eliminated') return 'ELIMINATED';
  if (row.statusKey === 'danger') return 'DANGER';
  if (row.statusKey === 'warning') return 'WARNING';
  return 'ACTIVE';
}

function kothFinalSelectedWeek_(payload) {
  var stored = SURVIVOR_PAGE_STATE.kothSelectedWeek;
  if (stored !== undefined && stored !== null && stored !== '') return Number(stored);
  return Number(payload.selectedWeek || payload.currentWeek || payload.latestWeek || 0);
}

function kothFinalReview_(payload, week) {
  week = Number(week || kothFinalSelectedWeek_(payload));
  if (payload.projectedWeek && Number(payload.projectedWeek.week) === week) return payload.projectedWeek;
  return (payload.weeklyResults || []).filter(function(row) { return Number(row.week) === week; })[0] || null;
}

function kothFinalCurrentUserRow_(payload, review) {
  var username = String(payload.currentUser && payload.currentUser.username || (typeof getCurrentUsername === 'function' ? getCurrentUsername() : '') || '').toLowerCase();
  return review && (review.rows || []).filter(function(row) { return String(row.username || '').toLowerCase() === username; })[0] || null;
}

function kothFinalSelectWeek_(week) {
  SURVIVOR_PAGE_STATE.kothSelectedWeek = Number(week || 0);
  kothFinalRerender_();
}

function kothFinalSwitchLeague_(leagueId) {
  leagueId = String(leagueId || '');
  if (typeof setFrontendLeagueId === 'function') {
    setFrontendLeagueId(leagueId);
  } else {
    try { localStorage.setItem('leagueId', leagueId); localStorage.setItem('activeLeagueId', leagueId); } catch (err) {}
  }
  if (typeof clearStartupPayload === 'function') {
    try { clearStartupPayload(true); } catch (err) {}
  }
  if (typeof navigate === 'function') navigate('survivor', { skipUnsavedCheck: true });
}

function kothFinalCompareSelection_(payload) {
  var field = payload.field || [];
  var selected = Array.isArray(SURVIVOR_PAGE_STATE.kothCompareUsers) ? SURVIVOR_PAGE_STATE.kothCompareUsers.slice() : [];
  var valid = {};
  field.forEach(function(row) { valid[String(row.username || '').toLowerCase()] = row.username; });
  selected = selected.filter(function(username) { return !!valid[String(username || '').toLowerCase()]; });
  if (selected.length < 2) {
    selected = field.slice(0, Math.min(3, field.length)).map(function(row) { return row.username; });
  }
  SURVIVOR_PAGE_STATE.kothCompareUsers = selected;
  return selected;
}

function kothFinalToggleCompare_(username, checked) {
  var list = Array.isArray(SURVIVOR_PAGE_STATE.kothCompareUsers) ? SURVIVOR_PAGE_STATE.kothCompareUsers.slice() : [];
  var key = String(username || '').toLowerCase();
  list = list.filter(function(item) { return String(item || '').toLowerCase() !== key; });
  if (checked) list.push(username);
  SURVIVOR_PAGE_STATE.kothCompareUsers = list;
  kothFinalRerender_();
}

function kothFinalRerender_() {
  var payload = SURVIVOR_PAGE_STATE.payload || {};
  var node = document.querySelector('.sports-default-koth-final');
  if (!node) return;
  node.outerHTML = sportsFinalKothPageHtml_(payload);
  if (window.PATTCSportsRich && typeof PATTCSportsRich.afterMount === 'function') PATTCSportsRich.afterMount('.sports-default-koth-final');
}

function kothFinalControls_(payload) {
  var leagues = payload.leagues || [];
  var weeks = payload.weekOptions || [];
  var selectedWeek = kothFinalSelectedWeek_(payload);
  var league = leagues.length > 1 ? '<label>League<select onchange="kothFinalSwitchLeague_(this.value)">' + leagues.map(function(row) {
    return '<option value="' + kothFinalEscape_(row.leagueId) + '" ' + (String(row.leagueId) === String(payload.leagueId || '') ? 'selected' : '') + '>' + kothFinalEscape_(row.leagueName || row.leagueId) + '</option>';
  }).join('') + '</select></label>' : '';
  var week = weeks.length ? '<label>Week<select onchange="kothFinalSelectWeek_(this.value)">' + weeks.slice().sort(function(a,b){return Number(b.week)-Number(a.week);}).map(function(row) {
    return '<option value="' + Number(row.week) + '" ' + (Number(row.week) === selectedWeek ? 'selected' : '') + '>' + kothFinalEscape_(row.label || ('Week ' + row.week)) + '</option>';
  }).join('') + '</select></label>' : '';
  return '<section class="koth-final-controls">' + league + week + '</section>';
}

function kothFinalStrikeZone_(payload, review) {
  if (!review) return '<section class="koth-final-strike-zone is-empty"><span>STRIKE LINE</span><strong>Waiting for source scores</strong></section>';
  var rows = review.rows || [];
  var cutoff = review.cutoffScore;
  var mode = review.final ? 'FINAL' : 'PROJECTED';
  var strikeRows = rows.filter(function(row) { return row.strikeAwarded; });
  var safeRows = rows.filter(function(row) { return !row.strikeAwarded; });
  return '<section class="koth-final-strike-zone ' + (review.final ? 'is-final' : 'is-projected') + '">' +
    '<div><span>' + mode + ' STRIKE LINE</span><strong>' + (cutoff === null || cutoff === undefined ? '—' : kothFinalEscape_(cutoff)) + '</strong><small>' + kothFinalEscape_(review.actualRecipients || 0) + ' strike recipient' + (Number(review.actualRecipients || 0) === 1 ? '' : 's') + (review.tieApplied ? ' · cutoff tie applied' : '') + '</small></div>' +
    '<div class="koth-final-zone-split"><span class="is-safe">SAFE ' + safeRows.length + '</span><span class="is-strike">STRIKE ZONE ' + strikeRows.length + '</span></div>' +
  '</section>';
}

function kothFinalProfileField_(payload, review) {
  var reviewMap = {};
  (review && review.rows || []).forEach(function(row) { reviewMap[String(row.username || '').toLowerCase()] = row; });
  return '<section class="koth-final-field"><div class="koth-final-section-head"><div><span>PLAYER FIELD</span><h2>Active King of the Hill field</h2></div><small>' + kothFinalEscape_((payload.field || []).filter(function(row){return row.statusKey !== 'eliminated';}).length) + ' alive</small></div><div class="koth-final-field-grid">' + (payload.field || []).map(function(row) {
    var weekly = reviewMap[String(row.username || '').toLowerCase()] || {};
    var label = kothFinalStateLabel_(row);
    return '<article class="koth-final-player is-' + kothFinalEscape_(row.statusKey || 'normal') + '">' +
      '<div class="koth-final-avatar">' + kothFinalAvatar_(row) + '</div>' +
      '<strong>' + kothFinalEscape_(row.displayName || row.username) + '</strong>' +
      '<span class="koth-final-player-state">' + label + '</span>' +
      '<div class="koth-final-mini-strikes">' + kothFinalStrikeDots_(row.kothStrikes || 0, row.kothStrikeLimit || payload.strikeLimit || 1) + '</div>' +
      '<small>' + kothFinalEscape_(row.kothStrikes || 0) + '/' + kothFinalEscape_(row.kothStrikeLimit || payload.strikeLimit || 1) + ' strikes' + (weekly.rank ? ' · W' + weekly.week + ' #' + weekly.rank : '') + '</small>' +
    '</article>';
  }).join('') + '</div></section>';
}

function kothFinalSourceBreakdown_(payload, row) {
  if (!row) return '';
  var sourceMap = row.sourceScores || {};
  var names = {};
  (payload.sourceGames || []).forEach(function(source) { names[source.gameId] = source.name || source.gameId; });
  var keys = Object.keys(sourceMap);
  if (!keys.length) return '<span class="koth-final-source-empty">No source breakdown</span>';
  return '<div class="koth-final-source-breakdown">' + keys.map(function(gameId) {
    return '<span><b>' + kothFinalEscape_(names[gameId] || gameId) + '</b> ' + kothFinalEscape_(sourceMap[gameId]) + '</span>';
  }).join('') + '</div>';
}

function kothFinalWeekReview_(payload, review) {
  if (!review) return '';
  var me = kothFinalCurrentUserRow_(payload, review);
  var rows = review.rows || [];
  return '<section class="koth-final-week-review"><div class="koth-final-section-head"><div><span>' + (review.final ? 'PAST-WEEK REVIEW' : 'CURRENT PROJECTION') + '</span><h2>Week ' + kothFinalEscape_(review.week) + '</h2></div><strong>' + (review.final ? 'FINAL' : 'PROJECTED') + '</strong></div>' +
    (me ? '<div class="koth-final-my-week"><div><span>YOUR KOTH SCORE</span><strong>' + kothFinalEscape_(me.score) + '</strong><small>Rank #' + kothFinalEscape_(me.rank || '—') + '</small></div><div><span>RESULT</span><strong class="is-' + kothFinalEscape_(me.marginKey || '') + '">' + kothFinalEscape_(me.strikeAwarded ? 'STRIKE' : 'SAFE') + '</strong><small>' + kothFinalEscape_(me.marginText || '') + '</small></div><div><span>STRIKES AFTER</span><strong>' + kothFinalEscape_(me.strikesAfter) + '/' + kothFinalEscape_(me.strikeLimit || payload.strikeLimit) + '</strong></div></div>' + kothFinalSourceBreakdown_(payload, me) : '') +
    '<div class="koth-final-week-table">' + rows.map(function(row) {
      return '<div class="koth-final-week-row is-' + kothFinalEscape_(row.statusKey || 'normal') + '"><span>#' + kothFinalEscape_(row.rank || '—') + '</span><span class="koth-final-week-avatar">' + kothFinalAvatar_(row) + '</span><strong>' + kothFinalEscape_(row.displayName || row.username) + '</strong><b>' + kothFinalEscape_(row.score) + '</b><em>' + kothFinalEscape_(row.marginText || (row.strikeAwarded ? 'STRIKE' : 'SAFE')) + '</em><small>' + kothFinalEscape_(row.strikesAfter) + '/' + kothFinalEscape_(row.strikeLimit || payload.strikeLimit) + '</small></div>';
    }).join('') + '</div></section>';
}

function kothFinalCompare_(payload, review) {
  if (!review) return '';
  var selected = kothFinalCompareSelection_(payload);
  var selectedSet = {}; selected.forEach(function(username){ selectedSet[String(username || '').toLowerCase()] = true; });
  var chooser = '<div class="koth-final-compare-chooser">' + (payload.field || []).map(function(row) {
    var checked = selectedSet[String(row.username || '').toLowerCase()] === true;
    return '<label class="is-' + kothFinalEscape_(row.statusKey || 'normal') + '"><input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="kothFinalToggleCompare_(\'' + String(row.username || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\',this.checked)"><span class="koth-final-compare-avatar">' + kothFinalAvatar_(row) + '</span><span>' + kothFinalEscape_(row.displayName || row.username) + '</span></label>';
  }).join('') + '</div>';
  var reviewMap = {}; (review.rows || []).forEach(function(row){ reviewMap[String(row.username || '').toLowerCase()] = row; });
  var rows = selected.map(function(username) { return reviewMap[String(username || '').toLowerCase()]; }).filter(Boolean);
  return '<section class="koth-final-compare"><div class="koth-final-section-head"><div><span>COMPARE 2+</span><h2>Week ' + kothFinalEscape_(review.week) + ' comparison</h2></div><small>' + rows.length + ' selected</small></div>' + chooser + '<div class="koth-final-compare-grid">' + rows.map(function(row) {
    return '<article class="is-' + kothFinalEscape_(row.statusKey || 'normal') + '"><div class="koth-final-compare-head"><span class="koth-final-compare-avatar big">' + kothFinalAvatar_(row) + '</span><div><strong>' + kothFinalEscape_(row.displayName || row.username) + '</strong><small>#' + kothFinalEscape_(row.rank || '—') + ' · ' + kothFinalEscape_(row.score) + ' pts</small></div></div><b>' + kothFinalEscape_(row.marginText || '') + '</b><span>' + kothFinalEscape_(row.strikesAfter) + '/' + kothFinalEscape_(row.strikeLimit || payload.strikeLimit) + ' strikes</span>' + kothFinalSourceBreakdown_(payload, row) + '</article>';
  }).join('') + '</div></section>';
}

function kothFinalStandings_(payload) {
  return '<section class="koth-final-standings"><div class="koth-final-section-head"><div><span>STANDINGS</span><h2>King of the Hill</h2></div>' + (payload.leagueName ? '<small>' + kothFinalEscape_(payload.leagueName) + '</small>' : '') + '</div><div class="koth-final-standings-list">' + (payload.field || []).map(function(row) {
    return '<div class="koth-final-standing is-' + kothFinalEscape_(row.statusKey || 'normal') + '"><span>#' + kothFinalEscape_(row.rank || '—') + '</span><span class="koth-final-standing-avatar">' + kothFinalAvatar_(row) + '</span><strong>' + kothFinalEscape_(row.displayName || row.username) + '</strong><em>' + kothFinalStateLabel_(row) + '</em><b>' + kothFinalEscape_(row.kothStrikes || 0) + '/' + kothFinalEscape_(row.kothStrikeLimit || payload.strikeLimit) + '</b></div>';
  }).join('') + '</div></section>';
}

function kothFinalHeroContract_(gameId, payload, appearance, assets) {
  payload = payload || {};
  appearance = appearance || {};
  assets = assets || {};
  var assignment = appearance.assignment || appearance.Assignment || {};
  var theme = appearance.theme || appearance.Theme || {};
  var appearanceRuntime = window.AppearanceThemeRuntime || {};
  var kentPresentation = (typeof appearanceRuntime.sportsHeroPresentation === "function")
    ? (appearanceRuntime.sportsHeroPresentation(appearance, {
        gameId: gameId,
        title: "KING OF THE HILL",
        subtitle: "",
        kicker: "PATTC KING OF THE HILL",
        accentColor: "#19a7ce"
      }) || {})
    : {};
  var shared = (window.PATTCSportsHero && typeof window.PATTCSportsHero.resolve === "function")
    ? (window.PATTCSportsHero.resolve({ gameId: gameId, payload: payload, appearance: appearance, defaults: {
        title: "KING OF THE HILL",
        subtitle: "",
        image: assets.hero || "",
        accent: "",
        overlay: "",
        logo: assets.logo || "",
        focalPosition: ""
      }}) || {})
    : {};
  function first() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  }
  return {
    title: first(kentPresentation.title, shared.title, assignment.heroTitle, assignment.HeroTitle, theme.heroTitle, theme.HeroTitle, payload.heroTitle, "KING OF THE HILL"),
    subtitle: first(kentPresentation.subtitle, shared.subtitle, assignment.heroSubtitle, assignment.HeroSubtitle, theme.heroSubtitle, theme.HeroSubtitle, payload.heroSubtitle),
    image: first(kentPresentation.imageUrl, shared.image, assignment.heroImage, assignment.HeroImage, theme.heroImage, theme.HeroImage, assets.hero),
    logo: first(kentPresentation.logoUrl, shared.logo, assignment.heroLogo, assignment.HeroLogo, theme.heroLogo, theme.HeroLogo, assets.logo),
    accent: first(kentPresentation.accentColor, shared.accent, assignment.heroAccent, assignment.HeroAccent, theme.heroAccent, theme.HeroAccent),
    overlay: first(kentPresentation.overlay, shared.overlay, assignment.heroOverlay, assignment.HeroOverlay, theme.heroOverlay, theme.HeroOverlay),
    focalPosition: first(kentPresentation.focal, shared.focalPosition, assignment.heroFocalPosition, assignment.HeroFocalPosition, theme.heroFocalPosition, theme.HeroFocalPosition)
  };
}

function sportsFinalKothPageHtml_(payload) {
  payload = payload || {};
  var gameId = sportsRichSurvivorGameId_();
  var appearance = PATTCSportsRich.appearance(gameId, payload.appearance || null);
  var assets = PATTCSportsRich.assets(gameId, appearance);
  var hero = kothFinalHeroContract_(gameId, payload, appearance, assets);
  var field = payload.field || [];
  var me = payload.currentUser || {};
  var strikes = Number(me.kothStrikes !== undefined ? me.kothStrikes : payload.strikes || 0);
  var limit = Math.max(1, Number(payload.strikeLimit || me.kothStrikeLimit || 1));
  var review = kothFinalReview_(payload, kothFinalSelectedWeek_(payload));
  var currentWeek = Number(payload.currentWeek || payload.latestWeek || 0);
  var aliveCount = field.filter(function(row){ return row.statusKey !== 'eliminated'; }).length;
  var champion = payload.champion;
  var sourceText = (payload.sourceGames || []).map(function(source){return source.name || source.gameId;}).join(' + ') || 'Configured source game';
  return '<div class="page survivor-page koth-page sports-rich-koth sports-default-koth sports-default-koth-final" ' + PATTCSportsRich.styleAttr(gameId, appearance, 'football', 'NFL') + '>' +
    '<header class="koth-rich-hero sports-rich-hero-bg" ' + PATTCSportsRich.bgAttrs(hero.image || assets.hero, '--sports-rich-hero-image') + (hero.focalPosition ? ' style="--sports-rich-hero-position:' + kothFinalEscape_(hero.focalPosition) + ';"' : '') + '><div class="koth-final-hero-overlay" data-hero-overlay="' + kothFinalEscape_(hero.overlay || '') + '"><span>NFL</span>' + (hero.logo ? '<img class="koth-final-hero-logo" src="' + kothFinalEscape_(hero.logo) + '" alt="">' : '') + '<h1>' + kothFinalEscape_(hero.title || 'KING OF THE HILL') + '</h1>' + (hero.subtitle ? '<p class="koth-final-hero-subtitle">' + kothFinalEscape_(hero.subtitle) + '</p>' : '') + '<p>' + (champion ? ('CHAMPION · ' + kothFinalEscape_(champion.displayName || champion.username)) : ('Week ' + kothFinalEscape_(currentWeek || '—') + ' · ' + aliveCount + ' still on the hill')) + '</p></div></header>' +
    kothFinalControls_(payload) +
    '<section class="sports-default-koth-dashboard koth-final-dashboard"><div class="sports-default-koth-score"><span>YOUR KOTH SCORE</span><strong>' + kothFinalEscape_((review && kothFinalCurrentUserRow_(payload,review) || {}).score !== undefined ? (kothFinalCurrentUserRow_(payload,review) || {}).score : payload.latestScore || '—') + '<small> pts</small></strong><p>' + sourceText + '</p></div><div class="sports-default-koth-strikes"><span>STRIKES</span><strong>' + strikes + '<small> of ' + limit + '</small></strong><div>' + kothFinalStrikeDots_(strikes,limit) + '</div></div><div class="sports-default-koth-status is-' + kothFinalEscape_(me.statusKey || 'normal') + '"><span>STATUS</span><strong>' + kothFinalStateLabel_(me) + '</strong><p>' + (me.statusKey === 'danger' ? 'One more strike can eliminate you.' : me.statusKey === 'warning' ? 'You have a strike. Stay above the line.' : me.statusKey === 'eliminated' ? 'Your KOTH run has ended.' : me.statusKey === 'champion' ? 'Last player standing.' : 'You are currently safe.') + '</p></div></section>' +
    kothFinalStrikeZone_(payload, review) +
    kothFinalProfileField_(payload, review) +
    kothFinalWeekReview_(payload, review) +
    kothFinalCompare_(payload, review) +
    kothFinalStandings_(payload) +
    '<details class="koth-rich-rules"><summary>Rules & source scoring</summary><div class="card survivor-rules-card"><p><strong>No weekly KOTH pick is required.</strong> KOTH consumes the configured source-game score. Current projections never write strikes; only the established KOTH final processor awards them.</p>' + (payload.leagueProcessingNote ? '<p>' + kothFinalEscape_(payload.leagueProcessingNote) + '</p>' : '') + '</div></details>' +
  '</div>';
}

if (typeof sportsDefaultKothPageHtml_ === 'function') {
  sportsDefaultKothPageHtml_ = sportsFinalKothPageHtml_;
}
