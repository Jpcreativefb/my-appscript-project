/* =====================================================
   SURVIVOR / ELIMINATION PLAYER PAGE v1.2.18w
===================================================== */

var SURVIVOR_PAGE_STATE = SURVIVOR_PAGE_STATE || { gameId: "", payload: null, selected: "" };

function survivorPageEscape_(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function survivorPickOption_(nominee, selected, disabled) {
  var isSelected = String(selected || '') === String(nominee.id || '');
  return '<button type="button" class="survivor-choice ' + (isSelected ? 'selected' : '') + '" data-survivor-id="' + survivorPageEscape_(nominee.id) + '" ' + (disabled ? 'disabled' : '') + ' onclick="survivorSelect_(\'' + survivorPageEscape_(nominee.id) + '\')">' +
    (nominee.image ? '<img src="' + survivorPageEscape_(nominee.image) + '" alt="" loading="lazy">' : '<span class="survivor-choice-placeholder">★</span>') +
    '<span>' + survivorPageEscape_(nominee.name || nominee.shortAnswer || nominee.id) + '</span>' +
  '</button>';
}

function survivorSelect_(nomineeId) {
  var round = SURVIVOR_PAGE_STATE.payload && SURVIVOR_PAGE_STATE.payload.currentRound;
  if (!round || !round.canPick) return;
  SURVIVOR_PAGE_STATE.selected = nomineeId;
  document.querySelectorAll('.survivor-choice').forEach(function(button) {
    button.classList.toggle('selected', String(button.dataset.survivorId || '') === String(nomineeId || ''));
  });
  var save = document.getElementById('survivorSaveButton');
  if (save) save.disabled = !nomineeId;
}

async function survivorSaveCurrent_() {
  var payload = SURVIVOR_PAGE_STATE.payload || {};
  var round = payload.currentRound;
  var nomineeId = SURVIVOR_PAGE_STATE.selected;
  var message = document.getElementById('survivorSaveMessage');
  if (!round || !nomineeId) return;
  var session = typeof getSession === 'function' ? (getSession() || {}) : {};
  if (message) { message.textContent = 'Saving…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveSurvivorPick({
      username: session.username || '',
      gameId: SURVIVOR_PAGE_STATE.gameId,
      categoryId: round.categoryId,
      nomineeId: nomineeId
    });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save Survivor pick.');
    if (message) message.textContent = 'Saved ✓';
    window.setTimeout(function() { navigate('survivor', { skipUnsavedCheck: true }); }, 350);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save Survivor pick.'; message.classList.add('error'); }
  }
}

function survivorHistory_(payload) {
  var rounds = Array.isArray(payload.rounds) ? payload.rounds : [];
  if (!rounds.length) return '';
  var labels = {
    survived: 'Survived', eliminated: 'Eliminated', missed: 'Missed — Eliminated',
    picked: 'Pick Saved', open: 'Open', upcoming: 'Upcoming', 'after-elimination': 'Out'
  };
  return '<section class="card survivor-history-card"><h2>Round History</h2><div class="survivor-history-list">' + rounds.map(function(round) {
    var status = labels[round.status] || round.status || 'Upcoming';
    return '<div class="survivor-history-row ' + survivorPageEscape_(round.status || '') + '"><span>Round ' + survivorPageEscape_(round.round) + '</span><strong>' + survivorPageEscape_(round.name) + '</strong><em>' + survivorPageEscape_(status) + '</em>' + (round.earnedPoints ? '<b>+' + survivorPageEscape_(round.earnedPoints) + '</b>' : '') + '</div>';
  }).join('') + '</div></section>';
}

function survivorStandings_(payload) {
  var rows = Array.isArray(payload.standings) ? payload.standings : [];
  if (!rows.length) return '<section class="card"><h2>Standings</h2><p>No Survivor entries yet.</p></section>';
  return '<section class="card survivor-standings-card"><div class="survivor-card-head"><h2>Survivor Standings</h2><button class="button secondary" type="button" onclick="navigate(\'leaderboard\')">Full Standings</button></div><div class="survivor-standings-list">' + rows.slice(0, 8).map(function(row, index) {
    return '<div class="survivor-standing-row ' + (row.survivorAlive ? 'alive' : 'out') + '"><span>#' + (index + 1) + '</span><strong>' + survivorPageEscape_(row.displayName || row.username) + '</strong><em>' + (row.survivorAlive ? 'ALIVE' : 'OUT R' + survivorPageEscape_(row.survivorEliminatedRound || '')) + '</em><b>' + survivorPageEscape_(row.total || 0) + ' pts</b></div>';
  }).join('') + '</div></section>';
}

async function renderSurvivorPage() {
  var gameId = typeof APP_STATE !== 'undefined' ? String(APP_STATE.gameId || '').trim() : '';
  if (!gameId) return '<div class="page"><div class="card error-card">Choose a Survivor game first.</div></div>';
  setPageLoadStep(55, 'Checking the current Survivor round…');
  var payload = await apiGetSurvivorState(gameId);
  if (!payload || payload.success === false) {
    return '<div class="page"><div class="card error-card">' + survivorPageEscape_(payload && (payload.error || payload.message) || 'Could not load Survivor game.') + '</div></div>';
  }
  SURVIVOR_PAGE_STATE.gameId = gameId;
  SURVIVOR_PAGE_STATE.payload = payload;
  SURVIVOR_PAGE_STATE.selected = payload.currentRound && payload.currentRound.pickNomineeId || '';

  var headline = payload.alive ? (payload.complete ? 'You Survived' : 'You Are Still Alive') : 'Your Entry Is Eliminated';
  var sub = payload.alive
    ? (payload.complete ? 'All Survivor rounds have been settled.' : 'Pick one entry to survive the current round. If that entry is eliminated, your Survivor run ends.')
    : ('Eliminated in Round ' + survivorPageEscape_(payload.eliminatedRound || '') + (payload.eliminatedReason === 'missed' ? ' because no pick was saved.' : '.'));
  var round = payload.currentRound;

  var roundHtml = '';
  if (round && payload.alive) {
    roundHtml = '<section class="card survivor-current-card"><div class="survivor-card-head"><div><span class="survivor-eyebrow">Current Round ' + survivorPageEscape_(round.round) + '</span><h2>' + survivorPageEscape_(round.name) + '</h2><p>' + survivorPageEscape_(round.points) + ' survival point' + (Number(round.points) === 1 ? '' : 's') + '</p></div><span class="survivor-round-status ' + (round.canPick ? 'open' : 'locked') + '">' + (round.canPick ? 'Open' : 'Locked') + '</span></div>' +
      '<div class="survivor-choice-grid">' + (round.nominees || []).map(function(nominee) { return survivorPickOption_(nominee, SURVIVOR_PAGE_STATE.selected, !round.canPick); }).join('') + '</div>' +
      (round.canPick ? '<div class="survivor-save-row"><button id="survivorSaveButton" class="button" type="button" onclick="survivorSaveCurrent_()" ' + (SURVIVOR_PAGE_STATE.selected ? '' : 'disabled') + '>' + (round.pickNomineeId ? 'Update Survivor Pick' : 'Save Survivor Pick') + '</button><span id="survivorSaveMessage" class="survivor-save-message"></span></div>' : '<p class="survivor-locked-note">This round is locked. Your saved pick is final.</p>') +
    '</section>';
  } else if (!round && payload.alive) {
    roundHtml = '<section class="card survivor-current-card"><h2>All rounds settled</h2><p>Your Survivor run is complete.</p></section>';
  }

  return '<div class="page survivor-page">' +
    '<header class="survivor-page-header"><div><span class="survivor-eyebrow">Survivor / Elimination</span><h1>' + survivorPageEscape_(payload.gameName || 'Survivor Game') + '</h1><p>' + sub + '</p></div><div class="survivor-status-badge ' + (payload.alive ? 'alive' : 'out') + '">' + headline + '<small>' + survivorPageEscape_(payload.roundsSurvived || 0) + ' rounds survived · ' + survivorPageEscape_(payload.totalPoints || 0) + ' pts</small></div></header>' +
    '<section class="card survivor-rules-card"><h2>How Survivor Works</h2><p>Pick one entry you believe will <strong>survive</strong> the current round. The admin records the entry that was eliminated. If your pick is that eliminated entry—or you miss a settled round—you are out. Survive the round and earn that round’s points.</p></section>' +
    roundHtml + survivorHistory_(payload) + survivorStandings_(payload) +
  '</div>';
}
