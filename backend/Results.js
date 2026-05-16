/* =========================
   RESULTS ENGINE v4
   Unified + Production Ready
   Community + Rankings + Analytics
========================= */

const RESULTS_CACHE_KEY =
  "results_v4";

const RESULTS_SNAPSHOT_SHEET =
  "ResultsSnapshots";

/* =========================
   NORMALIZERS
========================= */

function normalizeResultsValue_(value){

  return String(value || "")
    .trim();

}

function normalizeResultsId_(value){

  return normalizeResultsValue_(value)
    .toLowerCase();

}

function normalizeResultsNumber_(value){

  const num =
    Number(value);

  return isNaN(num)
    ? 0
    : num;

}

/* =========================
   CACHE HELPERS
========================= */

function getResultsCacheKey_(
  gameId
){

  return (
    RESULTS_CACHE_KEY +
    "__" +
    normalizeResultsId_(
      gameId
    )
  );

}

function getCachedResults_(
  gameId
){

  const cache =
    CacheService
      .getScriptCache();

  const cached =
    cache.get(
      getResultsCacheKey_(
        gameId
      )
    );

  if(!cached){
    return null;
  }

  try{

    return JSON.parse(cached);

  }catch(err){

    return null;

  }

}

function setCachedResults_(
  gameId,
  results
){

  CacheService
    .getScriptCache()
    .put(

      getResultsCacheKey_(
        gameId
      ),

      JSON.stringify(results),

      300

    );

}

function clearResultsCache(
  gameId
){

  const cache =
    CacheService
      .getScriptCache();

  if(gameId){

    cache.remove(
      getResultsCacheKey_(
        gameId
      )
    );

    return;

  }

}

/* =========================
   GAME HELPERS
========================= */

function validateResultsGame_(
  gameId
){

  gameId =
    normalizeResultsId_(
      gameId
    );

  if(!gameId){

    throw new Error(
      "GameId required"
    );

  }

}

function getResultsGame_(
  gameId
){

  if(
    typeof getGameById ===
    "function"
  ){

    return getGameById(
      gameId
    );

  }

  return null;

}

/* =========================
   CATEGORY HELPERS
========================= */

function getResultsCategories_(
  gameId
){

  if(
    typeof getCategoriesCached !==
    "function"
  ){

    throw new Error(
      "getCategoriesCached missing"
    );

  }

  return getCategoriesCached()
    .filter(category => {

      const categoryGameId =

        normalizeResultsId_(

          category.gameId ||

          category.communityGameId

        );

      return (
        categoryGameId ===
        normalizeResultsId_(
          gameId
        )
      );

    });

}

/* =========================
   MOVIE LOOKUP
========================= */

function buildMovieLookup_(){

  if(
    typeof getMoviesCached !==
    "function"
  ){

    return {};

  }

  const movies =
    getMoviesCached();

  const lookup = {};

  movies.forEach(movie => {

    const movieId =

      normalizeResultsId_(
        movie.movieId
      );

    if(!movieId){
      return;
    }

    lookup[movieId] =
      movie;

  });

  return lookup;

}

/* =========================
   VOTE HELPERS
========================= */

function getResultsVotes_(
  gameId
){

  if(
    typeof getVotesCached_ !==
    "function"
  ){

    throw new Error(
      "getVotesCached_ missing"
    );

  }

  return getVotesCached_()
    .filter(vote => {

      const voteGameId =

        normalizeResultsId_(

          vote.gameId ||

          vote.communityGameId

        );

      return (
        voteGameId ===
        normalizeResultsId_(
          gameId
        )
      );

    });

}

function groupVotesByCategory_(
  votes
){

  const map = {};

  votes.forEach(vote => {

    const categoryId =

      normalizeResultsId_(
        vote.categoryId
      );

    if(!categoryId){
      return;
    }

    if(!map[categoryId]){

      map[categoryId] = [];

    }

    map[categoryId]
      .push(vote);

  });

  return map;

}

function groupVotesByUser_(
  votes
){

  const map = {};

  votes.forEach(vote => {

    const username =

      normalizeResultsValue_(
        vote.username
      );

    if(!username){
      return;
    }

    if(!map[username]){

      map[username] = [];

    }

    map[username]
      .push(vote);

  });

  return map;

}

/* =========================
   SCORE HELPERS
========================= */

function calculateVotePoints_(
  rank,
  total
){

  rank =
    normalizeResultsNumber_(
      rank
    );

  total =
    normalizeResultsNumber_(
      total
    );

  if(
    rank <= 0 ||
    total <= 0
  ){

    return 0;

  }

  return (
    total - rank + 1
  );

}

function calculateAverageRank_(
  ranks
){

  if(!ranks.length){
    return 0;
  }

  const total =
    ranks.reduce(
      (sum, rank)=>

        sum +
        normalizeResultsNumber_(
          rank
        ),

      0
    );

  return (
    total / ranks.length
  );

}

/* =========================
   WEIGHTED RESULTS
========================= */

function calculateWeightedResults_(
  votes
){

  const totals = {};

  const groupedUsers =
    groupVotesByUser_(
      votes
    );

  Object.keys(groupedUsers)
    .forEach(username => {

      const userVotes =

        groupedUsers[
          username
        ];

      const totalRankings =
        userVotes.length;

      const weight =

        typeof getUserVoteWeight ===
        "function"

          ? getUserVoteWeight(
              totalRankings,
              totalRankings
            )

          : 1;

      userVotes.forEach(vote => {

        const movieId =

          normalizeResultsId_(
            vote.movieId
          );

        if(!movieId){
          return;
        }

        const points =

          calculateVotePoints_(

            vote.rank,

            totalRankings

          );

        if(!totals[movieId]){

          totals[movieId] = {

            movieId:
              movieId,

            nomineeId:
              normalizeResultsId_(
                vote.nomineeId
              ),

            totalScore: 0,

            weightedPoints: 0,

            rawPoints: 0,

            voteCount: 0,

            firstPlaceVotes: 0,

            ranks: [],

            voters: {}

          };

        }

        totals[movieId]
          .rawPoints +=
            points;

        totals[movieId]
          .weightedPoints +=
            (points * weight);

        totals[movieId]
          .totalScore +=
            (points * weight);

        totals[movieId]
          .voteCount++;

        totals[movieId]
          .ranks.push(
            vote.rank
          );

        totals[movieId]
          .voters[
            username
          ] = true;

        if(
          normalizeResultsNumber_(
            vote.rank
          ) === 1
        ){

          totals[movieId]
            .firstPlaceVotes++;

        }

      });

    });

  return totals;

}

/* =========================
   SORTING + TIES
========================= */

function sortResults_(
  results
){

  results.sort((a,b)=>{

    if(
      b.totalScore !==
      a.totalScore
    ){

      return (
        b.totalScore -
        a.totalScore
      );

    }

    if(
      b.firstPlaceVotes !==
      a.firstPlaceVotes
    ){

      return (
        b.firstPlaceVotes -
        a.firstPlaceVotes
      );

    }

    return (
      a.averageRank -
      b.averageRank
    );

  });

  return results;

}

function applyRankingPositions_(
  results
){

  let currentRank = 1;

  results.forEach((r,i)=>{

    if(i > 0){

      const prev =
        results[i - 1];

      const tied =

        r.totalScore ===
          prev.totalScore &&

        r.firstPlaceVotes ===
          prev.firstPlaceVotes &&

        r.averageRank ===
          prev.averageRank;

      if(!tied){

        currentRank =
          i + 1;

      }

    }

    r.position =
      currentRank;

  });

  return results;

}

/* =========================
   BUILD RESULTS
========================= */

function buildResults_(
  totals,
  movieLookup
){

  const results =
    Object.values(totals)
      .map(entry => {

        const movie =
          movieLookup[
            entry.movieId
          ] || {};

        return {

          position: 0,

          movieId:
            entry.movieId,

          nomineeId:
            entry.nomineeId,

          title:
            movie.title || "",

          year:
            movie.year || "",

          totalScore:
            entry.totalScore,

          weightedPoints:
            entry.weightedPoints,

          rawPoints:
            entry.rawPoints,

          voteCount:
            entry.voteCount,

          voterCount:
            Object.keys(
              entry.voters
            ).length,

          averageRank:

            calculateAverageRank_(

              entry.ranks

            ),

          firstPlaceVotes:
            entry.firstPlaceVotes,

          percent: 0

        };

      });

  const maxScore =
    Math.max(

      ...results.map(r =>
        r.totalScore
      ),

      1

    );

  results.forEach(result => {

    result.percent =
      Math.round(

        (
          result.totalScore /
          maxScore
        ) * 100

      );

  });

  sortResults_(
    results
  );

  applyRankingPositions_(
    results
  );

  return results;

}

/* =========================
   CATEGORY RESULTS
========================= */

function calculateCategoryResults(
  gameId,
  categoryId
){

  validateResultsGame_(
    gameId
  );

  const votes =
    getResultsVotes_(
      gameId
    );

  const categoryVotes =
    votes.filter(vote =>

      normalizeResultsId_(
        vote.categoryId
      ) ===

      normalizeResultsId_(
        categoryId
      )

    );

  const totals =
    calculateWeightedResults_(
      categoryVotes
    );

  const movieLookup =
    buildMovieLookup_();

  return buildResults_(

    totals,
    movieLookup

  );

}

/* =========================
   FULL GAME RESULTS
========================= */

function getResultsForGame(
  gameId,
  forceRefresh
){

  validateResultsGame_(
    gameId
  );

  if(!forceRefresh){

    const cached =
      getCachedResults_(
        gameId
      );

    if(cached){
      return cached;
    }

  }

  const game =
    getResultsGame_(
      gameId
    );

  const votes =
    getResultsVotes_(
      gameId
    );

  const groupedVotes =
    groupVotesByCategory_(
      votes
    );

  const movieLookup =
    buildMovieLookup_();

  const categories =
    getResultsCategories_(
      gameId
    );

  const results = {

    generatedAt:
      new Date(),

    gameId:
      gameId,

    gameName:
      game?.name || "",

    locked:
      game?.locked === true,

    finalized:
      game?.finalized === true,

    totalVotes:
      votes.length,

    totalCategories:
      categories.length,

    categories: []

  };

  categories.forEach(category => {

    const categoryId =

      normalizeResultsId_(

        category.categoryId ||

        category.id

      );

    const categoryVotes =

      groupedVotes[
        categoryId
      ] || [];

    const totals =
      calculateWeightedResults_(
        categoryVotes
      );

    const categoryResults =

      buildResults_(

        totals,
        movieLookup

      );

    results.categories
      .push({

        categoryId:
          categoryId,

        categoryName:

          category.category ||

          category.name ||

          "",

        totalVotes:
          categoryVotes.length,

        totalResults:
          categoryResults.length,

        results:
          categoryResults

      });

  });

  setCachedResults_(
    gameId,
    results
  );

  return results;

}

/* =========================
   PUBLIC COMMUNITY RESULTS
========================= */

function getCommunityResultsData(
  gameId
){

  const game =
    getResultsGame_(
      gameId
    );

  if(!game){

    throw new Error(
      "Game not found"
    );

  }

  if(
    game.revealResults !==
    true
  ){

    return {

      revealResults:
        false,

      locked:
        game.locked === true,

      finalized:
        game.finalized === true,

      results: []

    };

  }

  return {

    revealResults:
      true,

    locked:
      game.locked === true,

    finalized:
      game.finalized === true,

    results:
      getResultsForGame(
        gameId
      )

  };

}

/* =========================
   TOP HELPERS
========================= */

function getWinningMovie(
  gameId,
  categoryId
){

  const results =
    calculateCategoryResults(
      gameId,
      categoryId
    );

  return results.length
    ? results[0]
    : null;

}

function getTopResults(
  gameId,
  categoryId,
  limit
){

  limit =
    normalizeResultsNumber_(
      limit
    ) || 10;

  return calculateCategoryResults(
    gameId,
    categoryId
  ).slice(0, limit);

}

/* =========================
   ANALYTICS
========================= */

function getMostVotedMovies(
  gameId,
  limit
){

  limit =
    normalizeResultsNumber_(
      limit
    ) || 25;

  const results =
    getResultsForGame(
      gameId
    );

  const totals = {};

  results.categories
    .forEach(category => {

      category.results
        .forEach(movie => {

          if(
            !totals[
              movie.movieId
            ]
          ){

            totals[
              movie.movieId
            ] = {

              movieId:
                movie.movieId,

              title:
                movie.title,

              totalVotes: 0,

              appearances: 0

            };

          }

          totals[
            movie.movieId
          ].totalVotes +=
            movie.voteCount;

          totals[
            movie.movieId
          ].appearances++;

        });

    });

  const finalResults =
    Object.values(totals);

  finalResults.sort((a,b)=>

    b.totalVotes -
    a.totalVotes

  );

  return finalResults
    .slice(0, limit);

}

/* =========================
   SNAPSHOTS
========================= */

function getResultsSnapshotSheet_(){

  const ss =
    SpreadsheetApp
      .getActive();

  let sh =
    ss.getSheetByName(
      RESULTS_SNAPSHOT_SHEET
    );

  if(!sh){

    sh =
      ss.insertSheet(
        RESULTS_SNAPSHOT_SHEET
      );

    sh.appendRow([

      "SnapshotId",
      "GameId",
      "GeneratedAt",
      "ResultsJSON"

    ]);

  }

  return sh;

}

function saveResultsSnapshot(
  gameId
){

  const results =
    getResultsForGame(
      gameId,
      true
    );

  const sh =
    getResultsSnapshotSheet_();

  const snapshotId =

    Utilities.getUuid();

  sh.appendRow([

    snapshotId,

    gameId,

    new Date(),

    JSON.stringify(
      results
    )

  ]);

  return snapshotId;

}

/* =========================
   FINALIZATION
========================= */

function finalizeResults(
  gameId
){

  const snapshotId =
    saveResultsSnapshot(
      gameId
    );

  if(
    typeof updateGame ===
    "function"
  ){

    updateGame(
      gameId,
      {
        finalized: true,
        finalizedAt:
          new Date()
      }
    );

  }

  clearResultsCache(
    gameId
  );

  return {

    success: true,

    snapshotId:
      snapshotId

  };

}

/* =========================
   TESTING
========================= */

function testResultsEngine(){

  const gameId =

    typeof getDefaultGameId ===
    "function"

      ? getDefaultGameId()

      : "";

  const results =
    getResultsForGame(
      gameId,
      true
    );

  Logger.log(

    JSON.stringify(
      results,
      null,
      2
    )

  );

}

function testCategoryResults(){

  const gameId =

    typeof getDefaultGameId ===
    "function"

      ? getDefaultGameId()

      : "";

  const categories =
    getResultsCategories_(
      gameId
    );

  if(!categories.length){

    Logger.log(
      "No categories"
    );

    return;

  }

  const categoryId =

    normalizeResultsId_(

      categories[0]
        .categoryId ||

      categories[0]
        .id

    );

  const results =

    calculateCategoryResults(

      gameId,
      categoryId

    );

  Logger.log(

    JSON.stringify(
      results,
      null,
      2
    )

  );

}