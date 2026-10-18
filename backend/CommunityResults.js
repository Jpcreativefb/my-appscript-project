/* =========================
   LEGACY / FUTURE FEATURE MODULE

   Status:
   Work in progress from older system.

   Do not delete.
   Do not wire into production API until reviewed,
   tested, and updated to the current architecture.

   Future feature area:
   Community games / community results / compare.
========================= */

const COMMUNITY_RESULTS_CACHE_KEY = "community_results_v1";

function getCommunityCategoryNominees(communityGameId, categoryId){
  communityGameId = String(communityGameId || getDefaultCommunityGameId()).trim();
  categoryId = String(categoryId || "").trim().toLowerCase();
  if(!categoryId) return [];
  const categories = getCategories();
  const category = categories.find(c =>
    String(c.communityGameId || "").trim() === communityGameId &&
    String(c.id).trim().toLowerCase() === categoryId
  );
  return category ? (category.nominees || []) : [];
}

function getCategoryBallots(communityGameId, categoryId){
  const sh = getVotesSheet_();
  const data = sh.getDataRange().getValues();
  if(data.length <= 1) return {};
  const headers = data[0].map(h => String(h).trim());
  const col = getVotesColumnMap_(headers);
  validateVotesColumns_(col);
  const ballots = {};
  for(let i = 1; i < data.length; i++){
    const row = data[i];
    if(normalizeVoteValue_(row[col.communityGameId]) !== communityGameId) continue;
    if(normalizeVoteValue_(row[col.categoryId]) !== categoryId) continue;
    const username = normalizeVoteValue_(row[col.username]);
    if(!ballots[username]) ballots[username] = [];
    ballots[username].push({
      nomineeId: normalizeVoteValue_(row[col.nomineeId]),
      movieId: normalizeVoteValue_(row[col.movieId]),
      rank: Number(row[col.rank]) || 0
    });
  }
  return ballots;
}

function calculateCommunityCategoryResults(communityGameId, categoryId){
  communityGameId = String(communityGameId || getDefaultCommunityGameId()).trim();
  categoryId = String(categoryId || "").trim().toLowerCase();
  const nominees = getCommunityCategoryNominees(communityGameId, categoryId);
  if(!nominees.length) return [];

  const nomineeMap = {};
  nominees.forEach(n => {
    nomineeMap[n.id] = {
      nomineeId: n.id,
      nominee: n.name,
      movie: n.movie || "",
      image: n.image || "",
      score: 0,
      percent: 0,
      rank: 0,
      firstPlaceVotes: 0,
      totalBallots: 0
    };
  });

  const ballots = getCategoryBallots(communityGameId, categoryId);
  const totalNominees = nominees.length;

  Object.keys(ballots).forEach(username => {
    const ballot = ballots[username].slice().sort((a,b) => a.rank - b.rank);
    const normalized = getNormalizedScores(ballot);
    const seenMap = typeof getSeenMovies === "function"
      ? getSeenMovies(username, communityGameId)
      : {};
    const seenCount = nominees.reduce((count, nominee) => {
      const movieId = String(nominee.movieId || "").trim().toLowerCase();
      return count + (movieId && seenMap[movieId] === true ? 1 : 0);
    }, 0);

    // Coverage weight must use the true eligible category slate as the
    // denominator. The previous ballot.length / ballot.length call made every
    // non-empty participant weight exactly 1.0.
    const weight = getUserVoteWeight(seenCount, totalNominees);

    ballot.forEach(b => {
      if(b.rank === 1 && nomineeMap[b.nomineeId]) nomineeMap[b.nomineeId].firstPlaceVotes++;
    });
    Object.keys(normalized).forEach(id => {
      if(!nomineeMap[id]) return;
      nomineeMap[id].score += normalized[id] * weight;
      nomineeMap[id].totalBallots++;
    });
  });

  const results = Object.values(nomineeMap);
  const maxScore = Math.max(...results.map(r => r.score), 1);
  results.forEach(r => {
    r.percent = Math.round((r.score / maxScore) * 100);
  });

  // Stable, deterministic result ordering: weighted score, first-place votes,
  // then canonical nominee id as the final total-order fallback.
  results.sort((a,b) => {
    if(b.score !== a.score) return b.score - a.score;
    if(b.firstPlaceVotes !== a.firstPlaceVotes) return b.firstPlaceVotes - a.firstPlaceVotes;
    return String(a.nomineeId || "").localeCompare(String(b.nomineeId || ""));
  });
  results.forEach((r,i) => { r.rank = i + 1; });
  return results;
}

function getAllCommunityResults(communityGameId){
  communityGameId = String(communityGameId || getDefaultCommunityGameId()).trim();
  const categories = getCategories().filter(c =>
    c.communityRank === true &&
    String(c.communityGameId || "").trim() === communityGameId
  );
  return categories.map(c => ({
    categoryId: c.id,
    categoryName: c.name,
    results: calculateCommunityCategoryResults(communityGameId, c.id)
  }));
}

function getCommunityResultsData(communityGameId){
  communityGameId = String(communityGameId || getDefaultCommunityGameId()).trim();
  const game = getCommunityGame(communityGameId);
  if(!game) throw new Error("CommunityGame not found");
  if(game.revealResults !== true){
    return {revealResults:false, locked:game.locked === true, results:[]};
  }
  return {
    revealResults:true,
    locked:game.locked === true,
    results:getAllCommunityResults(communityGameId)
  };
}
