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

/* =========================
   COMMUNITY RESULTS ENGINE
========================= */

const COMMUNITY_RESULTS_CACHE_KEY =
  "community_results_v1";

/* =========================
   CATEGORY NOMINEES
========================= */

function getCommunityCategoryNominees(
  communityGameId,
  categoryId
){

  communityGameId =
    String(
      communityGameId ||
      getDefaultCommunityGameId()
    ).trim();

  categoryId =
    String(categoryId || "")
      .trim()
      .toLowerCase();

  if(!categoryId){
    return [];
  }

  const categories =
    getCategories();

  const category =
    categories.find(c =>

      String(
        c.communityGameId || ""
      ).trim() ===
      communityGameId &&

      String(c.id)
        .trim()
        .toLowerCase() ===
      categoryId

    );

  if(!category){
    return [];
  }

  return category.nominees || [];

}

/* =========================
   CATEGORY BALLOTS
========================= */

function getCategoryBallots(
  communityGameId,
  categoryId
){

  const sh =
    getVotesSheet_();

  const data =
    sh.getDataRange().getValues();

  if(data.length <= 1){
    return {};
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

  const ballots = {};

  for(let i = 1; i < data.length; i++){

    const row = data[i];

    const rowGameId =
      normalizeVoteValue_(
        row[col.communityGameId]
      );

    if(
      rowGameId !==
      communityGameId
    ){
      continue;
    }

    const rowCategoryId =
      normalizeVoteValue_(
        row[col.categoryId]
      );

    if(
      rowCategoryId !==
      categoryId
    ){
      continue;
    }

    const username =
      normalizeVoteValue_(
        row[col.username]
      );

    if(!ballots[username]){
      ballots[username] = [];
    }

    ballots[username].push({

      nomineeId:
        normalizeVoteValue_(
          row[col.nomineeId]
        ),

      movieId:
        normalizeVoteValue_(
          row[col.movieId]
        ),

      rank:
        Number(
          row[col.rank]
        ) || 0

    });

  }

  return ballots;

}

/* =========================
   CATEGORY RESULTS
========================= */

function calculateCommunityCategoryResults(
  communityGameId,
  categoryId
){

  communityGameId =
    String(
      communityGameId ||
      getDefaultCommunityGameId()
    ).trim();

  categoryId =
    String(categoryId || "")
      .trim()
      .toLowerCase();

  const nominees =
    getCommunityCategoryNominees(
      communityGameId,
      categoryId
    );

  if(!nominees.length){
    return [];
  }

  const nomineeMap = {};

  nominees.forEach(n => {

    nomineeMap[n.id] = {

      nomineeId:
        n.id,

      nominee:
        n.name,

      movie:
        n.movie || "",

      image:
        n.image || "",

      score: 0,

      percent: 0,

      rank: 0,

      firstPlaceVotes: 0,

      totalBallots: 0

    };

  });

  const ballots =
    getCategoryBallots(
      communityGameId,
      categoryId
    );

  Object.values(ballots)
    .forEach(ballot => {

      ballot.sort((a,b)=>
        a.rank - b.rank
      );

      const normalized =
        getNormalizedScores(
          ballot
        );

      const weight =
        getUserVoteWeight(
          ballot.length,
          ballot.length
        );

      ballot.forEach(b => {

        if(
          b.rank === 1 &&
          nomineeMap[b.nomineeId]
        ){

          nomineeMap[
            b.nomineeId
          ].firstPlaceVotes++;

        }

      });

      Object.keys(normalized)
        .forEach(id => {

          if(!nomineeMap[id]){
            return;
          }

          nomineeMap[id]
            .score +=

            normalized[id] *
            weight;

          nomineeMap[id]
            .totalBallots++;

        });

    });

  const results =
    Object.values(nomineeMap);

  const maxScore =
    Math.max(
      ...results.map(r =>
        r.score
      ),
      1
    );

  results.forEach(r => {

    r.percent =
      Math.round(
        (
          r.score /
          maxScore
        ) * 100
      );

  });

  results.sort((a,b)=>
    b.score - a.score
  );

  results.forEach((r,i)=>{

    r.rank = i + 1;

  });

  return results;

}

/* =========================
   ALL RESULTS
========================= */

function getAllCommunityResults(
  communityGameId
){

  communityGameId =
    String(
      communityGameId ||
      getDefaultCommunityGameId()
    ).trim();

  const categories =
    getCategories()
      .filter(c =>

        c.communityRank ===
        true &&

        String(
          c.communityGameId || ""
        ).trim() ===
        communityGameId

      );

  return categories.map(c => {

    return {

      categoryId:
        c.id,

      categoryName:
        c.name,

      results:
        calculateCommunityCategoryResults(
          communityGameId,
          c.id
        )

    };

  });

}

/* =========================
   PUBLIC RESULTS
========================= */

function getCommunityResultsData(
  communityGameId
){

  communityGameId =
    String(
      communityGameId ||
      getDefaultCommunityGameId()
    ).trim();

  const game =
    getCommunityGame(
      communityGameId
    );

  if(!game){

    throw new Error(
      "CommunityGame not found"
    );

  }

  /* =========================
     RESULTS HIDDEN
  ========================= */

  if(
    game.revealResults !==
    true
  ){

    return {

      revealResults:
        false,

      locked:
        game.locked === true,

      results: []

    };

  }

  return {

    revealResults:
      true,

    locked:
      game.locked === true,

    results:
      getAllCommunityResults(
        communityGameId
      )

  };

}