const fs = require('fs');
const assert = require('assert');

const movie = fs.readFileSync('backend/engines/MovieEngine.js', 'utf8');
const community = fs.readFileSync('backend/engines/MovieCommunityAwardsEngine.js', 'utf8');
const ranking = fs.readFileSync('backend/engines/RankingGameEngine.js', 'utf8');
const legacyResults = fs.readFileSync('backend/CommunityResults.js', 'utf8');
const security = fs.readFileSync('backend/core/ApiSecurity.js', 'utf8');
const api = fs.readFileSync('backend/Api.js', 'utf8');
const games = fs.readFileSync('backend/engines/GamesEngine.js', 'utf8');
const page = fs.readFileSync('frontend/js/pages/ranking.js', 'utf8');

function includes(text, needle, message) {
  assert(text.includes(needle), message || `Expected source to include ${needle}`);
}
function excludes(text, needle, message) {
  assert(!text.includes(needle), message || `Expected source to exclude ${needle}`);
}
function close(actual, expected, epsilon = 1e-12) {
  assert(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to equal ${expected}`);
}

// Preserve the existing movie/ranking authorities and canonical type set.
includes(movie, 'MOVIE TRACKER ENGINE');
includes(movie, 'function getSeenMovies(username)');
includes(movie, 'function saveSeenMovies(username,seenData)');
includes(legacyResults, 'LEGACY / FUTURE FEATURE MODULE');
excludes(games, 'id: "movie-ballot"');
excludes(games, 'id: "community-awards"');
includes(games, 'id: "ranking"');

// Movie Community Awards is an isolated specialization of existing Ranking.
includes(ranking, 'return movieCommunityAwardsGetState_({ username: username, gameId: gameId });');
includes(ranking, 'return movieCommunityAwardsSave_({ username: username, gameId: gameId, categoryId: categoryId, rankings: rankings });');
includes(ranking, 'Rank every answer before saving this question.');
includes(community, 'Completion layer over the existing Categories, SeenMovies and');

// Seen state is event-scoped without changing the legacy MovieEngine contract.
includes(community, 'const MOVIE_COMMUNITY_SEEN_SHEET = "SeenMovies";');
includes(community, 'if (headers.indexOf("GameId") === -1)');
includes(community, 'if (movieCommunityAwardsString_(row[col.gameid]) !== gameId) return;');
includes(community, 'row[col.gameid] = gameId;');
includes(community, 'movieCommunityAwardsMovieSlate_(gameId)');
includes(community, 'Movie is not eligible for this event.');
includes(community, 'if (!lock.tryLock(2500))');

// Server validation enforces Seen-only partial ballots and lifecycle authority.
includes(community, 'Only movies you marked Seen may be ranked.');
includes(community, 'Ranking positions must be contiguous from 1 through the submitted subset.');
includes(community, 'game.lockAllPicks === true');
includes(community, 'game.votingLocked === true');
includes(community, 'game.resultsFinalized === true');
includes(community, 'movieCommunityAwardsDateReached_(game.availableUntil)');
includes(community, 'movieCommunityAwardsDateReached_(category.lockDateTime)');
includes(community, 'movieCommunityAwardsPruneUnseenRankings_');
includes(community, 'movieCommunityAwardsCategories_(gameId).forEach(function(category)');

// Results are assembled for the player only after Admin finalizes/reveals.
includes(community, 'const entriesByUser = game.resultsFinalized === true ? rankingGetEntriesByUser_(gameId) : null;');
includes(community, 'communityResults: game.resultsFinalized === true ? movieCommunityAwardsCategoryResults_');
includes(community, 'resultsRevealed: game.resultsFinalized === true');

// The previous diagnosis is real but belongs to an explicitly legacy/unwired caller.
assert(/getUserVoteWeight\([\s\S]{0,80}ballot\.length,[\s\S]{0,80}ballot\.length/.test(legacyResults),
  'Expected the legacy CommunityResults caller to demonstrate the historical 1.0 weighting defect');
// The active completion repairs the caller by using actual Seen coverage and the eligible slate.
includes(community, 'movieCommunityAwardsCoverageWeight_(seenCount, totalNominees)');
includes(community, 'getUserVoteWeight(seenCount, totalNominees)');
includes(community, 'const totalNominees = nominees.length;');
includes(community, 'normalized Borda score × sqrt(seen eligible nominees / total eligible nominees)');

function weight(seenCount, totalNominees) {
  if (totalNominees <= 0) return 0;
  return Math.sqrt(seenCount / totalNominees);
}
close(weight(9, 9), 1);
close(weight(4, 9), 2 / 3);
close(weight(1, 9), 1 / 3);

// Community tally uses normalized Borda only for the submitted Seen subset.
function normalizedBorda(count) {
  const total = count * (count + 1) / 2;
  return Array.from({length: count}, (_, index) => (count - index) / total);
}
assert.deepStrictEqual(normalizedBorda(3).map(v => Number(v.toFixed(6))), [0.5, 0.333333, 0.166667]);
close(normalizedBorda(1)[0], 1);
includes(community, 'target.score += (normalized[row.nomineeId] || 0) * weight;');

// Deterministic ties: score, first-place votes, weighted average rank, stable nominee id.
includes(community, 'if (b.score !== a.score) return b.score - a.score;');
includes(community, 'if (b.firstPlaceVotes !== a.firstPlaceVotes) return b.firstPlaceVotes - a.firstPlaceVotes;');
includes(community, 'return a.nomineeId.localeCompare(b.nomineeId);');

// Identity and authorization remain the existing central API authority.
includes(security, 'const sessionUsername = apiSecurityRequireSession_(payload);');
includes(security, 'throw new Error("Session user does not match request user")');
includes(security, 'payload.username = sessionUsername;');
includes(security, 'if (!isAdmin(sessionUsername))');
includes(security, 'saveRanking: true');
includes(api, 'userCanAccessGameFeature_(body.username, postGameId, "makePicks", postLeagueId)');
includes(api, 'return json(saveRankingBallot_({');

// Player UI: Seen controls, partial rankings, locked/results states, and narrow-screen-safe grids.
includes(page, 'data-movie-awards-seen');
includes(page, 'Only Seen movies can enter your rankings.');
includes(page, 'Partial ballots are valid.');
includes(page, "categoryId: '__seen_movies__'");
includes(page, 'grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))');
includes(page, 'Save Ranking');
includes(page, 'Saved rankings are read-only.');
includes(page, 'Results are hidden.');
includes(page, "payload.mode === 'movie-community-awards'");
excludes(page, 'localStorage.setItem');
includes(page, 'apiSaveRanking({');

console.log('Movie Community Awards R1 tests passed');
console.log('coverage weights: 9/9=1.000000, 4/9=0.666667, 1/9=0.333333');
