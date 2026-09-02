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
    var extra = sports && payload.mode === 'streak-survivor' && round.resolved ? ' · Streak ' + survivorPageEscape_(round.winStreak || 0) + ' · ' + survivorPageEscape_(round.multiplier || 1) + '×' : '';
    return '<div class="survivor-history-row ' + survivorPageEscape_(round.status || '') + '"><span>' + (sports ? 'Week ' + survivorPageEscape_(round.week || round.round) : 'Round ' + survivorPageEscape_(round.round)) + '</span><strong>' + survivorPageEscape_(round.name) + survivorPageEscape_(pickText) + '</strong><em>' + survivorPageEscape_(status + extra) + '</em>' + (round.earnedPoints ? '<b>+' + survivorPageEscape_(round.earnedPoints) + '</b>' : '') + '</div>';
  }).join('') + '</div></section>';
}

function survivorStandings_(payload) {
  var rows = Array.isArray(payload.standings) ? payload.standings : [];
  if (!rows.length) return '<section class="card"><h2>Standings</h2><p>No Survivor entries yet.</p></section>';
  var koth = payload.mode === 'king-of-the-hill';
  var streak = payload.mode === 'streak-survivor';
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
  var streak = payload.mode === 'streak-survivor';
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

  var streak = payload.mode === 'streak-survivor';
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
   Art R3

   Clean / Current remains the default.
   Sports Rich activates only from the existing per-game Appearance
   assignment. No second settings/backend system is created.

   Presentation-only. No Sports Engine, scoring, odds, settlement,
   game rules, saves, locks, auth, or automation logic lives here.
   ========================================================= */
(function initializePattcSportsRich_(global) {
  "use strict";

  if (!global || global.PATTCSportsRich) return;

  const cache = Object.create(null);
  const inflight = Object.create(null);

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

  function appearanceRoot_(bundle) {
    bundle = object_(bundle);
    return bundle.appearance && typeof bundle.appearance === "object"
      ? bundle.appearance
      : bundle;
  }

  function sources_(bundle) {
    const root = appearanceRoot_(bundle);
    const override = parseObject_(
      root.ThemeOverrideJSON ||
      root.themeOverrideJSON ||
      root.themeOverrideJson ||
      root.ThemeOverride ||
      root.themeOverride ||
      ""
    );

    return [
      override,
      object_(override.sports),
      object_(override.colors),
      root,
      object_(root.sports),
      object_(root.colors),
      object_(root.theme),
      object_(root.theme && root.theme.sports),
      object_(root.theme && root.theme.colors),
      object_(root.resolvedTheme),
      object_(root.resolvedTheme && root.resolvedTheme.colors),
      object_(root.assignment),
      bundle
    ].filter(function(source) {
      return source && typeof source === "object";
    });
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

  function remember_(gameId, bundle) {
    const id = text_(gameId);
    if (!id || !bundle || typeof bundle !== "object") return bundle || null;
    cache[id] = bundle;
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
      return remember_(id, existingBundle);
    }

    const cached = cached_(id);

    // Roy integration: Admin Appearance layout switching must be visible after
    // a normal PWA refresh. When the live Appearance API exists, request the
    // current per-GameId assignment instead of letting sessionStorage pin an
    // older Clean/Rich choice. Cached Appearance remains an offline fallback.
    if (typeof apiGetGameAppearance !== "function") return cached;

    if (!inflight[id]) {
      inflight[id] = Promise.resolve(apiGetGameAppearance(id))
        .then(function(result) {
          if (result && result.success !== false) return remember_(id, result);
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

    return inflight[id];
  }

  function appearance_(gameId, provided) {
    return provided || cached_(gameId) || null;
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
  return !!(
    payload &&
    (payload.sportsMode === true || payload.mode === "king-of-the-hill") &&
    window.PATTCSportsRich &&
    PATTCSportsRich.isRich(gameId, payload.appearance || null)
  );
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
  const streak = payload.mode === "streak-survivor";
  const alive = payload.alive !== false;
  const headline = payload.winner
    ? "SURVIVOR WINNER"
    : alive ? "STILL ALIVE" : "ELIMINATED";
  const stats = streak
    ? `${survivorPageEscape_(payload.totalPoints || 0)} pts · best streak ${survivorPageEscape_(payload.bestStreak || 0)}`
    : `${survivorPageEscape_(payload.roundsSurvived || 0)} weeks survived · ${survivorPageEscape_(payload.livesRemaining || 0)} lives remaining`;

  return `<div
    class="page survivor-page sports-rich-survivor"
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

    ${sportsRichSurvivorStatusStrip_(payload)}

    ${sportsRichSurvivorCurrent_(payload)}

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

/* ---------- Page wrapper ---------- */

const SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_ = renderSurvivorPage;
renderSurvivorPage = async function() {
  const gameId = typeof getFrontendGameId === "function" ? getFrontendGameId() : "";
  await PATTCSportsRich.prepare(gameId);

  const originalHtml = await SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_.apply(this, arguments);
  const payload = window.SURVIVOR_PAGE_STATE && SURVIVOR_PAGE_STATE.payload;

  if (!sportsRichSurvivorEnabled_(payload)) return originalHtml;

  const output = payload.mode === "king-of-the-hill"
    ? sportsRichKothPageHtml_(payload)
    : sportsRichSurvivorPageHtml_(payload);

  PATTCSportsRich.afterMount(
    payload.mode === "king-of-the-hill" ? ".sports-rich-koth" : ".sports-rich-survivor"
  );

  return output;
};
