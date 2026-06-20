/* =========================
   VOTING DATABASE v3
   Production Ready
========================= */

const VOTES_SHEET =
  "Votes";

const VOTES_CACHE_KEY =
  "votes_v3";

/* =========================
   HELPERS
========================= */

function getVotesSheet_(){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        VOTES_SHEET
      );

  if(!sh){

    throw new Error(
      "Votes sheet not found"
    );

  }

  return sh;

}

function normalizeVoteValue_(value){

  if(
    value === null ||
    value === undefined
  ){
    return "";
  }

  return String(value).trim();

}

function normalizeVoteBoolean_(value){

  return (
    value === true ||

    String(value)
      .toLowerCase()
      .trim() === "true"
  );

}

function normalizeVoteNumber_(value){

  const num =
    Number(value);

  return isNaN(num)
    ? 0
    : num;

}

function getVotesColumnMap_(headers){

  return {

    voteId:
      headers.indexOf(
        "VoteId"
      ),

    timestamp:
      headers.indexOf(
        "Timestamp"
      ),

    updated:
      headers.indexOf(
        "Updated"
      ),

    communityGameId:
      headers.indexOf(
        "CommunityGameId"
      ),

    username:
      headers.indexOf(
        "Username"
      ),

    categoryId:
      headers.indexOf(
        "CategoryId"
      ),

    nomineeId:
      headers.indexOf(
        "NomineeId"
      ),

    movieId:
      headers.indexOf(
        "MovieId"
      ),

    rank:
      headers.indexOf(
        "Rank"
      ),

    points:
      headers.indexOf(
        "Points"
      ),

    locked:
      headers.indexOf(
        "Locked"
      )

  };

}

function validateVotesColumns_(col){

  const required = [

    "voteId",
    "timestamp",
    "updated",
    "communityGameId",
    "username",
    "categoryId",
    "nomineeId",
    "movieId",
    "rank",
    "points",
    "locked"

  ];

  const missing =
    required.filter(
      key => col[key] === -1
    );

  if(missing.length){

    throw new Error(
      "Votes sheet missing columns: " +
      missing.join(", ")
    );

  }

}

function normalizeVoteRow_(row, col){

  return {

    voteId:
      normalizeVoteValue_(
        row[col.voteId]
      ),

    timestamp:
      row[col.timestamp],

    updated:
      row[col.updated],

    communityGameId:
      normalizeVoteValue_(
        row[col.communityGameId]
      ),

    username:
      normalizeVoteValue_(
        row[col.username]
      ),

    categoryId:
      normalizeVoteValue_(
        row[col.categoryId]
      ),

    nomineeId:
      normalizeVoteValue_(
        row[col.nomineeId]
      ),

    movieId:
      normalizeVoteValue_(
        row[col.movieId]
      ),

    rank:
      normalizeVoteNumber_(
        row[col.rank]
      ),

    points:
      normalizeVoteNumber_(
        row[col.points]
      ),

    locked:
      normalizeVoteBoolean_(
        row[col.locked]
      )

  };

}

function buildVoteId_(vote){

  return [

    vote.communityGameId,
    vote.categoryId,
    vote.username,
    vote.movieId,
    vote.nomineeId
  ]
  .map(v =>

    normalizeVoteValue_(v)
      .toLowerCase()

  )
  .join("__");

}

function buildVoteRow_(
  vote,
  headers,
  col
){

  const row =
    new Array(
      headers.length
    ).fill("");

  row[col.voteId] =
    vote.voteId;

  row[col.timestamp] =
    vote.timestamp;

  row[col.updated] =
    vote.updated;

  row[col.communityGameId] =
    vote.communityGameId;

  row[col.username] =
    vote.username;

  row[col.categoryId] =
    vote.categoryId;

  row[col.nomineeId] =
    vote.nomineeId;

  row[col.movieId] =
    vote.movieId;

  row[col.rank] =
    vote.rank;

  row[col.points] =
    vote.points;

  row[col.locked] =
    vote.locked;

  return row;

}

function getVotesData_(){

  const sh =
    getVotesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if(!data.length){

    throw new Error(
      "Votes sheet empty"
    );

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getVotesColumnMap_(
      headers
    );

  validateVotesColumns_(col);

  return {
    sh,
    data,
    headers,
    col
  };

}

/* =========================
   VALIDATION
========================= */

function validateRankings_(rankings){

  if(!Array.isArray(rankings)){

    throw new Error(
      "Rankings must be array"
    );

  }

  if(!rankings.length){

    throw new Error(
      "Rankings empty"
    );

  }

  const usedRanks = {};
  const usedMovies = {};

  rankings.forEach(r => {

    const movieId =
      normalizeVoteValue_(
        r.movieId
      );

    const nomineeId =
      normalizeVoteValue_(
        r.nomineeId
      );

    const rank =
      normalizeVoteNumber_(
        r.rank
      );

    if(!movieId){

      throw new Error(
        "MovieId missing"
      );

    }

    if(!nomineeId){

      throw new Error(
        "NomineeId missing"
      );

    }

    if(rank <= 0){

      throw new Error(
        "Invalid rank"
      );

    }

    if(usedRanks[rank]){

      throw new Error(
        "Duplicate rank: " +
        rank
      );

    }

    if(usedMovies[movieId]){

      throw new Error(
        "Duplicate movie vote"
      );

    }

    usedRanks[rank] = true;

    usedMovies[movieId] =
      true;

  });

}

function validateVotingAllowed_(
  communityGameId
){

  validateCommunityGameId(
    communityGameId
  );

  if(
    typeof isCommunityGameLocked ===
    "function"
  ){

    if(
      isCommunityGameLocked(
        communityGameId
      )
    ){

      throw new Error(
        "Voting locked"
      );

    }

  }

}

/* =========================
   CACHE
========================= */

function getVotesCached_(){

  const cache =
    CacheService
      .getScriptCache();

  const cached =
    cache.get(
      VOTES_CACHE_KEY
    );

  if(cached){

    return JSON.parse(
      cached
    );

  }

  const {
    data,
    headers,
    col
  } = getVotesData_();

  const votes = [];

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    votes.push(

      normalizeVoteRow_(
        data[i],
        col
      )

    );

  }

  cache.put(

    VOTES_CACHE_KEY,

    JSON.stringify(votes),

    300

  );

  return votes;

}

function clearVotesCache(){

  CacheService
    .getScriptCache()
    .remove(
      VOTES_CACHE_KEY
    );

}

/* =========================
   GET USER RANKINGS
========================= */

function getUserRankings(
  username,
  communityGameId
){

  username =
    normalizeVoteValue_(
      username
    );

  communityGameId =
    normalizeVoteValue_(

      communityGameId ||

      getDefaultCommunityGameId()

    );

  validateCommunityGameId(
    communityGameId
  );

  const votes =
    getVotesCached_();

  const map = {};

  votes.forEach(vote => {

    if(
      vote.communityGameId !==
      communityGameId
    ){
      return;
    }

    if(
      vote.username !==
      username
    ){
      return;
    }

    if(
      !map[vote.categoryId]
    ){

      map[vote.categoryId] = [];

    }

    map[vote.categoryId]
      .push({

        voteId:
          vote.voteId,

        nomineeId:
          vote.nomineeId,

        movieId:
          vote.movieId,

        rank:
          vote.rank,

        points:
          vote.points

      });

  });

  Object.keys(map)
    .forEach(categoryId => {

      map[categoryId]
        .sort((a,b)=>

          a.rank - b.rank

        );

    });

  return map;

}

/* =========================
   SAVE VOTES
========================= */

function saveVotes(payload){

  const lock =
    LockService
      .getScriptLock();

    lock.waitLock(10000);

  try {

  validateVotePayload_(
    payload
  );

  const communityGameId =
    normalizeVoteValue_(

      payload.communityGameId ||

      getDefaultCommunityGameId()

    );

  validateVotingAllowed_(
    communityGameId
  );

  const username =
    normalizeVoteValue_(
      payload.username
    );

  const categoryId =
    normalizeVoteValue_(
      payload.categoryId
    );

  const rankings =
    Array.isArray(
      payload.rankings
    )
      ? payload.rankings
      : [];

  validateRankings_(
    rankings
  );

  const {
    sh,
    data,
    headers,
    col
  } = getVotesData_();

  const existingRows =
    [];

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const vote =
      normalizeVoteRow_(
        data[i],
        col
      );

    const sameBallot = (

      vote.communityGameId ===
      communityGameId &&

      vote.username ===
      username &&

      vote.categoryId ===
      categoryId

    );

    if(!sameBallot){

      existingRows.push(
        data[i]
      );

    }

  }

  const now =
    new Date();

  const newRows =
    rankings.map(r => {

      const movieId =
        normalizeVoteValue_(
          r.movieId
        );

      const nomineeId =
        normalizeVoteValue_(
          r.nomineeId
        );

      const rank =
        normalizeVoteNumber_(
          r.rank
        );

      const vote = {

        voteId:
          buildVoteId_({

            communityGameId,
            categoryId,
            username,
            movieId

          }),

        timestamp:
          now,

        updated:
          now,

        communityGameId:
          communityGameId,

        username:
          username,

        categoryId:
          categoryId,

        nomineeId:
          nomineeId,

        movieId:
          movieId,

        rank:
          rank,

        points:
          0,

        locked:
          false

      };

      return buildVoteRow_(
        vote,
        headers,
        col
      );

    });

  overwriteVotes_(
  existingRows,
  newRows
);

SpreadsheetApp.flush();

clearVotesCache();

clearResultsCaches();

return {

  success: true,

  communityGameId:
    communityGameId,

  username:
    username,

  categoryId:
    categoryId,

  savedVotes:
    newRows.length

};

}
finally {

  lock.releaseLock();

}


}

/* =========================
   NORMALIZED SCORES
========================= */

function getNormalizedScores(
  rankings
){

  if(
    !Array.isArray(rankings) ||
    !rankings.length
  ){

    return {};

  }

  const n =
    rankings.length;

  const scores = {};

  rankings.forEach(r => {

    const nomineeId =
      normalizeVoteValue_(
        r.nomineeId
      );

    const rank =
      normalizeVoteNumber_(
        r.rank
      );

    scores[nomineeId] =
      (n - rank + 1);

  });

  const total =
    Object.values(scores)
      .reduce(
        (a,b)=>a+b,
        0
      );

  if(total <= 0){

    return {};

  }

  Object.keys(scores)
    .forEach(id => {

      scores[id] =
        scores[id] / total;

    });

  return scores;

}

/* =========================
   USER WEIGHT
========================= */

function getUserVoteWeight(
  seenCount,
  totalNominees
){

  seenCount =
    normalizeVoteNumber_(
      seenCount
    );

  totalNominees =
    normalizeVoteNumber_(
      totalNominees
    );

  if(totalNominees <= 0){

    return 0;

  }

  return Math.sqrt(
    seenCount /
    totalNominees
  );

}

/* =========================
   DEBUG / TESTING
========================= */

function testVotesSystem(){

  Logger.log(

    JSON.stringify(

      getVotesCached_(),

      null,

      2

    )

  );

}

function testUserRankings(){

  const result =

    getUserRankings(

      "testuser",

      getDefaultCommunityGameId()

    );

  Logger.log(

    JSON.stringify(
      result,
      null,
      2
    )

  );

}