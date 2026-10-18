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

function rankingMovieAwardsMovieMap_() {
  var payload = RANKING_PAGE_STATE.payload || {};
  var movies = payload.movieTracker && Array.isArray(payload.movieTracker.movies) ? payload.movieTracker.movies : [];
  var map = {};
  movies.forEach(function(movie) { map[String(movie.movieId || '').toLowerCase()] = movie; });
  return map;
}

function rankingMovieAwardsSeenMap_() {
  var payload = RANKING_PAGE_STATE.payload || {};
  return payload.movieTracker && payload.movieTracker.seen ? payload.movieTracker.seen : {};
}

function rankingMovieAwardsSeenCards_(payload) {
  var movies = payload.movieTracker && Array.isArray(payload.movieTracker.movies) ? payload.movieTracker.movies : [];
  var seen = rankingMovieAwardsSeenMap_();
  var disabled = payload.locked === true ? ' disabled' : '';
  return '<section class="card movie-awards-seen-card"><div class="ranking-question-head"><div><span class="ranking-eyebrow">Step 1 · Movie Tracker</span><h2>What have you seen?</h2><p>Mark a movie Seen when you finish it. Only Seen movies can enter your rankings.</p></div><span class="ranking-status ' + (payload.locked ? 'locked' : 'open') + '">' + (payload.locked ? 'Locked' : 'Open') + '</span></div>' +
    '<div class="movie-awards-poster-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px;">' +
    movies.map(function(movie) {
      var id = String(movie.movieId || '').toLowerCase();
      var checked = seen[id] === true;
      return '<article class="movie-awards-poster-card" style="min-width:0;overflow:hidden;">' +
        (movie.image ? '<img src="' + rankingPageEscape_(movie.image) + '" alt="' + rankingPageEscape_(movie.movie || 'Movie') + ' poster" loading="lazy" style="display:block;width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:10px;">' : '<div class="ranking-entry-media"><span>🎬</span></div>') +
        '<div style="padding-top:8px;"><strong>' + rankingPageEscape_(movie.movie || id) + '</strong><small style="display:block;opacity:.75;">' + rankingPageEscape_(movie.nominationCount || 0) + ' eligible nomination' + (Number(movie.nominationCount || 0) === 1 ? '' : 's') + '</small>' +
        '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;"><input type="checkbox" data-movie-awards-seen="' + rankingPageEscape_(id) + '" ' + (checked ? 'checked' : '') + ' onchange="rankingMovieAwardsToggleSeen_(this)"' + disabled + '><span>' + (checked ? 'Seen' : 'Not Seen') + '</span></label></div>' +
      '</article>';
    }).join('') + '</div><div id="movieAwardsSeenMessage" class="ranking-message" style="margin-top:10px;"></div></section>';
}

function rankingMovieAwardsRankRow_(category, nominee, index, locked) {
  return '<div class="ranking-entry" data-nominee-id="' + rankingPageEscape_(nominee.id) + '">' +
    '<div class="ranking-position">#<span>' + (index + 1) + '</span></div>' +
    '<div class="ranking-entry-media">' + (nominee.image ? '<img src="' + rankingPageEscape_(nominee.image) + '" alt="" loading="lazy">' : '<span>🎬</span>') + '</div>' +
    '<div class="ranking-entry-name"><strong>' + rankingPageEscape_(nominee.name || nominee.shortAnswer || nominee.id) + '</strong><small>' + rankingPageEscape_([nominee.movie, nominee.person].filter(Boolean).join(' · ')) + '</small></div>' +
    (!locked ? '<div class="ranking-move-buttons"><button type="button" aria-label="Move up" onclick="rankingMove_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\',-1)">↑</button><button type="button" aria-label="Move down" onclick="rankingMove_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\',1)">↓</button><button type="button" aria-label="Remove from ranking" onclick="rankingMovieAwardsRemove_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\')">×</button></div>' : '') +
  '</div>';
}

function rankingMovieAwardsResults_(category) {
  var rows = Array.isArray(category.communityResults) ? category.communityResults : [];
  if (!rows.length) return '';
  return '<div class="ranking-official movie-awards-results"><h3>PATTC Community Results</h3>' + rows.map(function(row) {
    return '<div class="ranking-official-row"><span>#' + rankingPageEscape_(row.place) + '</span><strong>' + rankingPageEscape_(row.name || row.movie || row.nomineeId) + '</strong><small>' + rankingPageEscape_(Number(row.score || 0).toFixed(4)) + ' weighted pts</small></div>';
  }).join('') + '</div>';
}

function rankingMovieAwardsCategory_(category) {
  var byId = {};
  (category.nominees || []).forEach(function(nominee) { byId[String(nominee.id || '').toLowerCase()] = nominee; });
  var ballot = (category.ballot || []).slice().sort(function(a,b){ return Number(a.rank || 0) - Number(b.rank || 0); });
  var ranked = ballot.map(function(row){ return byId[String(row.nomineeId || '').toLowerCase()]; }).filter(Boolean);
  var rankedSet = {};
  ranked.forEach(function(nominee){ rankedSet[String(nominee.id || '').toLowerCase()] = true; });
  var available = (category.nominees || []).filter(function(nominee){ return !rankedSet[String(nominee.id || '').toLowerCase()]; });
  var locked = category.locked === true;
  var weight = Number(category.coverageWeight || 0);
  return '<section class="card ranking-question-card" data-ranking-category="' + rankingPageEscape_(category.id) + '">' +
    '<div class="ranking-question-head"><div><span class="ranking-eyebrow">Step 2 · ' + rankingPageEscape_(category.section || 'Community Award') + '</span><h2>' + rankingPageEscape_(category.name) + '</h2><p>Rank any subset of the movies you have actually seen. Partial ballots are valid.</p><div class="ranking-score-note">Seen coverage: ' + rankingPageEscape_(category.seenNomineeCount) + ' / ' + rankingPageEscape_(category.eligibleNomineeCount) + ' · participation weight ' + rankingPageEscape_(weight.toFixed(4)) + '</div></div><span class="ranking-status ' + (locked ? 'locked' : 'open') + '">' + (locked ? 'Locked' : 'Open') + '</span></div>' +
    '<h3>Your ranked list</h3><div class="ranking-order-list" id="rankingList_' + rankingPageEscape_(category.id) + '">' + ranked.map(function(nominee,index){ return rankingMovieAwardsRankRow_(category,nominee,index,locked); }).join('') + '</div>' +
    (!ranked.length ? '<p class="ranking-empty-note">No movies ranked yet. Add any Seen movie below.</p>' : '') +
    (!locked && available.length ? '<div class="movie-awards-available"><h3>Available Seen movies</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;">' + available.map(function(nominee){ return '<button class="button secondary" type="button" data-movie-awards-add="' + rankingPageEscape_(nominee.id) + '" onclick="rankingMovieAwardsAdd_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\')">+ ' + rankingPageEscape_(nominee.movie || nominee.name || nominee.id) + '</button>'; }).join('') + '</div></div>' : '') +
    (!locked ? '<div class="ranking-save-row"><button class="button ranking-save-button" type="button" onclick="rankingSaveCategory_(\'' + rankingPageEscape_(category.id) + '\')">Save Ranking</button><span id="rankingMessage_' + rankingPageEscape_(category.id) + '" class="ranking-message"></span></div>' : '<p class="ranking-locked-note">This ballot is locked. Saved rankings are read-only.</p>') +
    rankingMovieAwardsResults_(category) + '</section>';
}

function rankingMovieAwardsPage_(payload) {
  var deadline = payload.deadline ? new Date(payload.deadline) : null;
  var deadlineText = deadline && !isNaN(deadline.getTime()) ? deadline.toLocaleString() : 'Set by Admin';
  return '<div class="page ranking-page movie-community-awards-page">' +
    '<header class="ranking-page-header"><div><span class="ranking-eyebrow">Movie Community Awards</span><h1>' + rankingPageEscape_(payload.gameName || 'PATTC Movie Community Awards') + '</h1><p>See movies → mark Seen → rank only what you have seen → update until the deadline → PATTC winners.</p></div><button class="button secondary" type="button" onclick="navigate(\'leaderboard\')">Standings</button></header>' +
    '<section class="card ranking-rules-card"><h2>' + (payload.locked ? 'Ballots locked' : 'Ballots open') + '</h2><p>Deadline: <strong>' + rankingPageEscape_(deadlineText) + '</strong>. You may rank only a subset of Seen movies. Coverage is weighted on the server using <strong>sqrt(seen eligible nominees / total eligible nominees)</strong>. Results remain hidden until Admin reveals/finalizes them.</p></section>' +
    rankingMovieAwardsSeenCards_(payload) +
    (payload.categories || []).map(rankingMovieAwardsCategory_).join('') +
    (payload.resultsRevealed ? '<section class="card"><strong>Results revealed by Admin.</strong> Community winners are shown in each category above.</section>' : '<section class="card"><strong>Results are hidden.</strong> Your saved ballot remains editable until the server-authoritative lock.</section>') +
  '</div>';
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

function rankingMovieAwardsAdd_(categoryId, nomineeId) {
  var payload = RANKING_PAGE_STATE.payload || {};
  var category = (payload.categories || []).find(function(item){ return String(item.id || '') === String(categoryId || ''); });
  if (!category || category.locked) return;
  var nominee = (category.nominees || []).find(function(item){ return String(item.id || '') === String(nomineeId || ''); });
  var list = document.getElementById('rankingList_' + categoryId);
  if (!nominee || !list || list.querySelector('[data-nominee-id="' + String(nomineeId).replace(/"/g,'\\"') + '"]')) return;
  list.insertAdjacentHTML('beforeend', rankingMovieAwardsRankRow_(category, nominee, list.querySelectorAll('.ranking-entry').length, false));
  var button = document.querySelector('[data-movie-awards-add="' + String(nomineeId).replace(/"/g,'\\"') + '"]');
  if (button) button.remove();
  rankingRenumber_(categoryId);
}

function rankingMovieAwardsRemove_(categoryId, nomineeId) {
  var list = document.getElementById('rankingList_' + categoryId);
  if (!list) return;
  var row = Array.from(list.querySelectorAll('.ranking-entry')).find(function(item){ return String(item.dataset.nomineeId || '') === String(nomineeId || ''); });
  if (row) row.remove();
  rankingRenumber_(categoryId);
  var payload = RANKING_PAGE_STATE.payload || {};
  var category = (payload.categories || []).find(function(item){ return String(item.id || '') === String(categoryId || ''); });
  var nominee = category && (category.nominees || []).find(function(item){ return String(item.id || '') === String(nomineeId || ''); });
  var available = document.querySelector('[data-ranking-category="' + String(categoryId).replace(/"/g,'\\"') + '"] .movie-awards-available > div');
  if (nominee && available && !available.querySelector('[data-movie-awards-add="' + String(nomineeId).replace(/"/g,'\\"') + '"]')) {
    available.insertAdjacentHTML('beforeend','<button class="button secondary" type="button" data-movie-awards-add="' + rankingPageEscape_(nominee.id) + '" onclick="rankingMovieAwardsAdd_(\'' + rankingPageEscape_(category.id) + '\',\'' + rankingPageEscape_(nominee.id) + '\')">+ ' + rankingPageEscape_(nominee.movie || nominee.name || nominee.id) + '</button>');
  }
}

async function rankingMovieAwardsToggleSeen_(input) {
  var payload = RANKING_PAGE_STATE.payload || {};
  if (payload.locked || !input) return;
  var message = document.getElementById('movieAwardsSeenMessage');
  var checkboxes = Array.from(document.querySelectorAll('[data-movie-awards-seen]'));
  var rankings = checkboxes.filter(function(box){ return box.checked; }).map(function(box,index){
    return { nomineeId: box.dataset.movieAwardsSeen || '', movieId: box.dataset.movieAwardsSeen || '', rank: index + 1 };
  });
  checkboxes.forEach(function(box){ box.disabled = true; });
  if (message) { message.textContent = 'Saving Seen status…'; message.classList.remove('error'); }
  try {
    var session = typeof getSession === 'function' ? (getSession() || {}) : {};
    var res = await apiSaveRanking({ username: session.username || '', gameId: RANKING_PAGE_STATE.gameId, categoryId: '__seen_movies__', rankings: rankings });
    if (!res || res.success === false) throw new Error(res && (res.error || res.message) || 'Could not save Seen status.');
    if (message) message.textContent = 'Seen status saved ✓';
    window.setTimeout(function(){ navigate('ranking', {skipUnsavedCheck:true}); }, 250);
  } catch (err) {
    checkboxes.forEach(function(box){ box.disabled = false; });
    if (message) { message.textContent = err && err.message ? err.message : 'Could not save Seen status.'; message.classList.add('error'); }
  }
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
  if (payload.mode === 'movie-community-awards') return rankingMovieAwardsPage_(payload);
  var categories = Array.isArray(payload.categories) ? payload.categories : [];
  return '<div class="page ranking-page">' +
    '<header class="ranking-page-header"><div><span class="ranking-eyebrow">Ranking Game</span><h1>' + rankingPageEscape_(payload.gameName || 'Ranking Game') + '</h1><p>Put every answer in order, then save each question.</p></div><button class="button secondary" type="button" onclick="navigate(\'leaderboard\')">Standings</button></header>' +
    '<section class="card ranking-rules-card"><h2>Scoring</h2><p>The question’s point value is your maximum score. Each answer earns credit based on how close your position is to the official order: <strong>exact 100%</strong>, <strong>±1 80%</strong>, <strong>±2 60%</strong>, <strong>±3 40%</strong>, <strong>±4 20%</strong>, farther away 0%. The credits are averaged across the full list.</p></section>' +
    (categories.length ? categories.map(rankingPageCard_).join('') : '<div class="card">No Ranking questions have been created yet.</div>') +
  '</div>';
}
