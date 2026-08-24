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
