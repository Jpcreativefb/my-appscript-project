/* =====================================================
   RANKING GAME PLAYER PAGE v1.2.18w
===================================================== */

var RANKING_PAGE_STATE = RANKING_PAGE_STATE || { gameId: "", payload: null };

function rankingPageEscape_(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function rankingPageCategoryOrder_(category) {
  var ballot = Array.isArray(category.ballot) ? category.ballot.slice() : [];
  var nominees = Array.isArray(category.nominees) ? category.nominees.slice() : [];
  var byId = {};
  nominees.forEach(function(nominee) { byId[String(nominee.id || "").toLowerCase()] = nominee; });
  if (ballot.length === nominees.length) {
    return ballot.sort(function(a, b) { return Number(a.rank || 0) - Number(b.rank || 0); })
      .map(function(row) { return byId[String(row.nomineeId || "").toLowerCase()]; })
      .filter(Boolean);
  }
  return nominees;
}

function rankingPageOfficialOrder_(category) {
  var byId = {};
  (category.nominees || []).forEach(function(nominee) { byId[String(nominee.id || "").toLowerCase()] = nominee; });
  var rows = (category.officialOrder || []).map(function(row) {
    return { rank: Number(row.rank || 0), nominee: byId[String(row.nomineeId || "").toLowerCase()] };
  }).filter(function(row) { return row.rank > 0 && row.nominee; });
  if (!rows.length) return "";
  return '<div class="ranking-official"><h3>Official Final Order</h3>' + rows.map(function(row) {
    return '<div class="ranking-official-row"><span>#' + row.rank + '</span><strong>' + rankingPageEscape_(row.nominee.name || row.nominee.shortAnswer || row.nominee.id) + '</strong></div>';
  }).join("") + '</div>';
}

function rankingPageCard_(category) {
  var ordered = rankingPageCategoryOrder_(category);
  var locked = category.locked === true;
  var scoreText = category.resolved
    ? (rankingPageEscape_(category.earnedPoints) + ' / ' + rankingPageEscape_(category.points) + ' pts · ' + rankingPageEscape_(category.accuracyPercent) + '% accuracy')
    : (category.ballot && category.ballot.length ? 'Saved ranking · ' + rankingPageEscape_(category.points) + ' pts available' : rankingPageEscape_(category.points) + ' pts available');

  return '<section class="card ranking-question-card" data-ranking-category="' + rankingPageEscape_(category.id) + '">' +
    '<div class="ranking-question-head"><div><span class="ranking-eyebrow">' + rankingPageEscape_(category.section || 'Main') + '</span><h2>' + rankingPageEscape_(category.name) + '</h2><div class="ranking-score-note">' + scoreText + '</div></div>' +
    '<span class="ranking-status ' + (category.resolved ? 'settled' : (locked ? 'locked' : 'open')) + '">' + (category.resolved ? 'Final' : (locked ? 'Locked' : 'Open')) + '</span></div>' +
    '<div class="ranking-order-list" id="rankingList_' + rankingPageEscape_(category.id) + '">' +
      ordered.map(function(nominee, index) {
        var image = '<div class="ranking-entry-media">' + (nominee.image ? '<img src="' + rankingPageEscape_(nominee.image) + '" alt="" loading="lazy">' : '<span>★</span>') + '</div>';
        return '<div class="ranking-entry" data-nominee-id="' + rankingPageEscape_(nominee.id) + '">' +
          '<div class="ranking-position">#<span>' + (index + 1) + '</span></div>' + image +
          '<div class="ranking-entry-name"><strong>' + rankingPageEscape_(nominee.name || nominee.shortAnswer || nominee.id) + '</strong>' +
            ((nominee.movie || nominee.person) ? '<small>' + rankingPageEscape_([nominee.movie, nominee.person].filter(Boolean).join(' · ')) + '</small>' : '') + '</div>' +
          (!locked ? '<div class="ranking-move-buttons"><button type="button" aria-label="Move up" onclick="rankingMove_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\',-1)">↑</button><button type="button" aria-label="Move down" onclick="rankingMove_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\',1)">↓</button></div>' : '') +
        '</div>';
      }).join('') +
    '</div>' +
    (!locked ? '<div class="ranking-save-row"><button class="button ranking-save-button" type="button" onclick="rankingSaveCategory_(\'' + rankingPageEscape_(category.id) + '\')">Save Ranking</button><span id="rankingMessage_' + rankingPageEscape_(category.id) + '" class="ranking-message"></span></div>' : '') +
    rankingPageOfficialOrder_(category) +
  '</section>';
}

function rankingRenumber_(categoryId) {
  var list = document.getElementById('rankingList_' + categoryId);
  if (!list) return;
  Array.from(list.querySelectorAll('.ranking-entry')).forEach(function(row, index) {
    var span = row.querySelector('.ranking-position span');
    if (span) span.textContent = String(index + 1);
  });
}

function rankingMove_(categoryId, nomineeId, direction) {
  var list = document.getElementById('rankingList_' + categoryId);
  if (!list) return;
  var rows = Array.from(list.querySelectorAll('.ranking-entry'));
  var row = rows.find(function(item) { return String(item.dataset.nomineeId || '') === String(nomineeId || ''); });
  if (!row) return;
  var index = rows.indexOf(row);
  var target = index + Number(direction || 0);
  if (target < 0 || target >= rows.length) return;
  if (direction < 0) list.insertBefore(row, rows[target]);
  else list.insertBefore(rows[target], row);
  rankingRenumber_(categoryId);
}

async function rankingSaveCategory_(categoryId) {
  var list = document.getElementById('rankingList_' + categoryId);
  var message = document.getElementById('rankingMessage_' + categoryId);
  if (!list) return;
  var session = typeof getSession === 'function' ? (getSession() || {}) : {};
  var rankings = Array.from(list.querySelectorAll('.ranking-entry')).map(function(row, index) {
    return { nomineeId: row.dataset.nomineeId || '', rank: index + 1 };
  });
  if (message) { message.textContent = 'Saving…'; message.classList.remove('error'); }
  try {
    var res = await apiSaveRanking({
      username: session.username || '',
      gameId: RANKING_PAGE_STATE.gameId,
      categoryId: categoryId,
      rankings: rankings
    });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save ranking.');
    if (message) message.textContent = 'Saved ✓';
    window.setTimeout(function() { navigate('ranking', { skipUnsavedCheck: true }); }, 350);
  } catch (err) {
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save ranking.'; message.classList.add('error'); }
  }
}

async function renderRankingPage() {
  var gameId = typeof APP_STATE !== 'undefined' ? String(APP_STATE.gameId || '').trim() : '';
  if (!gameId) return '<div class="page"><div class="card error-card">Choose a Ranking game first.</div></div>';
  setPageLoadStep(55, 'Loading your ranking ballot…');
  var payload = await apiGetRankingState(gameId);
  if (!payload || payload.success === false) {
    return '<div class="page"><div class="card error-card">' + rankingPageEscape_(payload && (payload.error || payload.message) || 'Could not load Ranking game.') + '</div></div>';
  }
  RANKING_PAGE_STATE.gameId = gameId;
  RANKING_PAGE_STATE.payload = payload;
  var categories = Array.isArray(payload.categories) ? payload.categories : [];
  return '<div class="page ranking-page">' +
    '<header class="ranking-page-header"><div><span class="ranking-eyebrow">Ranking Game</span><h1>' + rankingPageEscape_(payload.gameName || 'Ranking Game') + '</h1><p>Put every answer in order, then save each question.</p></div><button class="button secondary" type="button" onclick="navigate(\'leaderboard\')">Standings</button></header>' +
    '<section class="card ranking-rules-card"><h2>Scoring</h2><p>The question’s point value is your maximum score. Each answer earns credit based on how close your position is to the official order: <strong>exact 100%</strong>, <strong>±1 80%</strong>, <strong>±2 60%</strong>, <strong>±3 40%</strong>, <strong>±4 20%</strong>, farther away 0%. The credits are averaged across the full list.</p></section>' +
    (categories.length ? categories.map(rankingPageCard_).join('') : '<div class="card">No Ranking questions have been created yet.</div>') +
  '</div>';
}
