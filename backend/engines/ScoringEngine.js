/* =====================================================
   SCORING ENGINE
   MULTIGAME PRODUCTION VERSION
===================================================== */

/* =====================================================
   HELPERS
===================================================== */

function normalizeScoreString_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeScoreGameId_(value){

  return String(value || "")
    .trim();

}

function normalizeScoreNumber_(
  value,
  fallback
) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return fallback;

  }

  const num =
    Number(value);

  return isNaN(num)
    ? fallback
    : num;

}

function isConfidenceScoringGame_(
  gameId
) {

  const game =
    typeof getGameRuntimeConfig === "function"
      ? getGameRuntimeConfig(gameId)
      : getGame(gameId);

  return !!(
    game &&
    (
      game.type === "confidence" ||
      game.confidenceEnabled === true
    )
  );

}

function getConfidenceScoringMode_(
  gameId
) {

  const game =
    typeof getGameRuntimeConfig === "function"
      ? getGameRuntimeConfig(gameId)
      : getGame(gameId);

  if (
    game &&
    String(game.confidenceScoringMode || "")
      .trim()
      .toLowerCase() === "risk_penalty"
  ) {
    return "risk_penalty";
  }

  return "win_only";

}

function getScoringBasePoints_(
  config,
  pick,
  isConfidenceGame
) {

  if (isConfidenceGame) {

    return normalizeScoreNumber_(
      pick.confidencePoints,
      0
    );

  }

  return normalizeScoreNumber_(
    config.points,
    0
  );

}


/* =====================================================
   BUILD USER PICKS MAP
===================================================== */

function buildUserPicksMap_(gameId){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(PICKS_SHEET);

  if (!sh) {
    return {};
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return {};
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col = {

    gameId:
      headers.indexOf("GameId"),

    username:
      headers.indexOf("Username"),

    categoryId:
      headers.indexOf("CategoryId"),

    nomineeId:
      headers.indexOf("NomineeId"),

    changeCount:
      headers.indexOf("ChangeCount"),

    originalNomineeId:
      headers.indexOf("OriginalNomineeId"),

    confidencePoints:
      headers.indexOf("ConfidencePoints")  

  };

  const userPicks = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      normalizeScoreGameId_(
        row[col.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    const username =
      String(
        row[col.username] || ""
      ).trim();

    const categoryId =
      normalizeScoreString_(
        row[col.categoryId]
      );

    if (
      !username ||
      !categoryId
    ) {
      continue;
    }

    if (!userPicks[username]) {

      userPicks[username] = {};

    }

    userPicks[username][categoryId] = {

      nomineeId:
        normalizeScoreString_(
          row[col.nomineeId]
        ),
    
      originalNomineeId:
        normalizeScoreString_(
          row[col.originalNomineeId]
        ),
    
      changeCount:
        Number(
          row[col.changeCount]
        ) || 0,
    
      confidencePoints:
        col.confidencePoints !== -1
          ? normalizeScoreNumber_(
              row[col.confidencePoints],
              0
            )
          : 0
    
    };

  }

  return userPicks;

}

/* =====================================================
   LEADERBOARD ENGINE
===================================================== */

function getLeaderboardData(
  gameId,
  options
){

  gameId =
    normalizeScoreGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  options =
    options || {};

  const projected =
    options.projected === true;

  const isConfidenceGame =
    isConfidenceScoringGame_(
      gameId
    );

  const confidenceScoringMode =
    getConfidenceScoringMode_(
      gameId
    );

  /* =====================================================
     CATEGORY SETTINGS
  ===================================================== */

  const settings =
    getCategorySettings(
      gameId
    );

  const categoryResultWinners =
    typeof getCategoryResultsWinnerMap === "function"
      ? getCategoryResultsWinnerMap(gameId)
      : {};

  /* =====================================================
     PICKS
  ===================================================== */

  const userPicks =
    buildUserPicksMap_(
      gameId
    );

  const results = [];

  /* =====================================================
     CALCULATE SCORES
  ===================================================== */

  Object.keys(userPicks)
    .forEach(username => {

      const picks =
        userPicks[username];

      let total = 0;
      let remaining = 0;
      let statues = 0;

      Object.keys(picks)
        .forEach(categoryId => {

          const config =
            settings[categoryId] || {};

          const pick =
            picks[categoryId];

          if (!pick) {
            return;
          }

          const basePoints =
            getScoringBasePoints_(
              config,
              pick,
              isConfidenceGame
            );

          const penalty =
            Number(
              config.changePenalty
            ) || 0;

          const changeCount =
            Number(
              pick.changeCount
            ) || 0;

          const adjustedPoints =
            Math.max(
              basePoints -
              (
                changeCount *
                penalty
              ),
              0
            );

          /* =====================================================
             DETERMINE WINNER
          ===================================================== */

          const categoryResultWinnerId =
            normalizeScoreString_(
              categoryResultWinners[categoryId] ||
              ""
            );

          const winnerNomineeId =

            projected

              ? normalizeScoreString_(
                  categoryResultWinnerId ||
                  config.winnerNomineeId ||
                  config.favoriteNomineeId ||
                  ""
                )

              : normalizeScoreString_(
                  categoryResultWinnerId ||
                  config.winnerNomineeId ||
                  ""
                );

          /* =====================================================
             CATEGORY RESOLVED
          ===================================================== */

          if (winnerNomineeId) {

            const isCorrect =
              normalizeScoreString_(
                pick.nomineeId
              ) === winnerNomineeId;

            if (isCorrect) {

              total += adjustedPoints;

              if (
                config.countsAsStatue === true
              ) {

                statues++;

              }

            } else if (
              isConfidenceGame &&
              confidenceScoringMode === "risk_penalty"
            ) {

              total -= adjustedPoints;

            }

          }

          /* =====================================================
             CATEGORY NOT RESOLVED
          ===================================================== */

          else {

            remaining += adjustedPoints;

          }

        });

      /* =====================================================
         USER DISPLAY PROFILE
         Uses UserGameProfiles first, then Users fallback.
      ===================================================== */

      const profile =
        getLeaderboardUserProfile_(
          username,
          gameId
        ) || {};

      results.push({

        user:
          username,

        username:
          username,

        displayName:
          profile.displayName ||
          username,

        avatar:
          profile.avatar ||
          "👤",

        themeColor:
          profile.themeColor ||
          profile.profileColor ||
          "#354785",

        total:
          total,

        remaining:
          remaining,

        max:
          total + remaining,

        statues:
          statues,

        eliminated:
          false,

        winChance:
          0,

        scoringMode:
          isConfidenceGame
            ? "confidence"
            : "standard",

        confidenceScoringMode:
          isConfidenceGame
            ? confidenceScoringMode
            : ""

      });

    });

  /* =====================================================
     SORT
  ===================================================== */

  results.sort((a,b) => {

    if (
      b.total !== a.total
    ) {

      return (
        b.total -
        a.total
      );

    }

    return (
      b.statues -
      a.statues
    );

  });

  /* =====================================================
     ELIMINATION + WIN CHANCE
  ===================================================== */

  if (results.length) {

    const leaderScore =
      results[0].total;

    results.forEach(r => {

      r.eliminated =
        r.max < leaderScore;

    });

    const alive =
      results.filter(r =>
        !r.eliminated
      );

    const totalRemaining =
      alive.reduce(
        (sum,r) =>
          sum + r.remaining,
        0
      );

    results.forEach(r => {

      if (r.eliminated) {

        r.winChance = 0;
        return;

      }

      if (
        totalRemaining === 0
      ) {

        r.winChance =
          r.total === leaderScore
            ? 100
            : 0;

        return;

      }

      r.winChance =
        Math.round(
          (
            r.remaining /
            totalRemaining
          ) * 100
        );

    });

  }

  return results;

}

/* =====================================================
   PROJECTED RESULTS
===================================================== */

function getProjectedResults(
  gameId
){

  return getLeaderboardData(
    gameId,
    {
      projected: true
    }
  );

}

/* =====================================================
   USER SCORING
===================================================== */

function getUserScoring(
  username,
  gameId
){

  gameId =
    normalizeScoreGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  if (!username) {
    return {};
  }

  const isConfidenceGame =
    isConfidenceScoringGame_(
      gameId
    );

  const confidenceScoringMode =
    typeof getConfidenceScoringMode_ === "function"
      ? getConfidenceScoringMode_(
          gameId
        )
      : "win_only";

  const settings =
    getCategorySettings(
      gameId
    );

  const categories =
    getCategories(
      gameId
    );

  const picksData =
    apiGetMyPicks(
      username,
      gameId
    );

  const scoring = {};

  categories.forEach(cat => {

    const categoryId =
      normalizeScoreString_(
        cat.id
      );

    const config =
      settings[categoryId] ||
      settings[cat.id] ||
      {};

    const nomineeId =
      picksData.picks &&
      picksData.picks[categoryId]
        ? picksData.picks[categoryId]
        : picksData.picks &&
          picksData.picks[cat.id]
          ? picksData.picks[cat.id]
          : "";

    const changes =
      picksData.changeCounts &&
      picksData.changeCounts[categoryId]
        ? Number(
            picksData.changeCounts[categoryId]
          ) || 0
        : picksData.changeCounts &&
          picksData.changeCounts[cat.id]
          ? Number(
              picksData.changeCounts[cat.id]
            ) || 0
          : 0;

    const confidencePoints =
      picksData.confidencePoints &&
      picksData.confidencePoints[categoryId]
        ? Number(
            picksData.confidencePoints[categoryId]
          ) || 0
        : picksData.confidencePoints &&
          picksData.confidencePoints[cat.id]
          ? Number(
              picksData.confidencePoints[cat.id]
            ) || 0
          : 0;

    const basePoints =
      isConfidenceGame
        ? confidencePoints
        : Number(
            config.points
          ) || 0;

    const penalty =
      Number(
        config.changePenalty
      ) || 0;

    const finalPointsAvailable =
      Math.max(
        basePoints -
        (
          changes *
          penalty
        ),
        0
      );

    const winnerNomineeId =
      normalizeScoreString_(
        config.winnerNomineeId || ""
      );

    const normalizedPick =
      normalizeScoreString_(
        nomineeId
      );

    const hasWinner =
      Boolean(
        winnerNomineeId
      );

    const hasPick =
      Boolean(
        normalizedPick
      );

    const isCorrect =
      hasWinner &&
      hasPick &&
      normalizedPick === winnerNomineeId;

    const isWrong =
      hasWinner &&
      hasPick &&
      normalizedPick !== winnerNomineeId;

    let earnedPoints = 0;
    let remainingPoints = 0;

    if (hasWinner) {

      if (isCorrect) {

        earnedPoints =
          finalPointsAvailable;

      } else if (
        isWrong &&
        isConfidenceGame &&
        confidenceScoringMode === "risk_penalty"
      ) {

        earnedPoints =
          -finalPointsAvailable;

      } else {

        earnedPoints =
          0;

      }

    } else {

      remainingPoints =
        finalPointsAvailable;

    }

    scoring[categoryId] = {

      shortName:
        config.shortName ||
        cat.name,

      nomineeId:
        nomineeId || "",

      winnerNomineeId:
        winnerNomineeId || "",

      changes:
        changes,

      basePoints:
        basePoints,

      confidencePoints:
        isConfidenceGame
          ? confidencePoints
          : 0,

      finalPointsAvailable:
        finalPointsAvailable,

      earnedPoints:
        earnedPoints,

      remainingPoints:
        remainingPoints,

      displayPoints:
        hasWinner
          ? String(earnedPoints)
          : `${remainingPoints}/${basePoints}`,

      locked:
        config.locked === true,

      resolved:
        hasWinner,

      correct:
        isCorrect,

      wrong:
        isWrong,

      scoringMode:
        isConfidenceGame
          ? "confidence"
          : "standard",

      confidenceScoringMode:
        isConfidenceGame
          ? confidenceScoringMode
          : ""

    };

  });

  return scoring;

}

/* =====================================================
   COMPARE SUMMARY
===================================================== */

function getCompareSummary(
  gameId,
  userA,
  others,
  options
){

  others =
    others || [];

  const leaderboard =
    getLeaderboardData(
      gameId,
      options
    );

  const players =
    leaderboard.filter(p =>

      p.user === userA ||

      others.includes(p.user)

    );

  const base =
    players.find(p =>
      p.user === userA
    );

  if (!base) {

    return {

      scores: {},

      remainingPoints: 0,

      winChanceA: 0

    };

  }

  const scores = {};

  players.forEach(p => {

    scores[p.user] =
      p.total;

  });

  const opponentScores =
    players
      .filter(p =>
        p.user !== userA
      )
      .map(p =>
        p.total
      );

  const bestOpponent =
    opponentScores.length

      ? Math.max(
          ...opponentScores
        )

      : 0;

  return {

    scores:
      scores,

    baseScore:
      base.total,

    bestOpponent:
      bestOpponent,

    remainingPoints:
      base.remaining,

    winChanceA:
      base.winChance

  };

}

/* =====================================================
   SCORE VERSION
===================================================== */

function getScoreVersion(
  gameId
){

  gameId =
    normalizeScoreGameId_(
      gameId ||
      getDefaultGameId()
    );

  const settings =
    getCategorySettings(
      gameId
    );

  let max = 0;

  Object.keys(settings)
    .forEach(categoryId => {

      const config =
        settings[categoryId];

      const version =
        Number(
          config.scoreVersion
        ) || 0;

      max =
        Math.max(
          max,
          version
        );

    });

  return max;

}

/* =====================================================
   SCORE UPDATE INFO
===================================================== */

function getScoreUpdateInfo(
  gameId
){

  gameId =
    normalizeScoreGameId_(
      gameId ||
      getDefaultGameId()
    );

  const settings =
    getCategorySettings(
      gameId
    );

  let latestVersion =
    0;

  let latestWinner =
    null;

  Object.keys(settings)
    .forEach(categoryId => {

      const config =
        settings[categoryId];

      const version =
        Number(
          config.scoreVersion
        ) || 0;

      if (
        version >
        latestVersion
      ) {

        latestVersion =
          version;

        if (
          config.winnerNomineeId
        ) {

          latestWinner = {

            category:
              categoryId,

            winner:
              config.winnerNomineeId,

            points:
              config.points || 0

          };

        }

      }

    });

  return {

    version:
      latestVersion,

    latestWinner:
      latestWinner

  };

}

/* =====================================================
   USER STATS
===================================================== */

function getUserStats(
  username,
  gameId
){

  const leaderboard =
    getLeaderboardData(
      gameId
    );

  if (
    !leaderboard ||
    !leaderboard.length
  ) {

    return null;

  }

  const row =
    leaderboard.find(r =>

      normalizeScoreString_(
        r.user
      ) ===

      normalizeScoreString_(
        username
      )

    );

  if (!row) {
    return null;
  }

  const sorted =
    [...leaderboard];

  let rank = 1;

  sorted.forEach((u,i) => {

    if (

      normalizeScoreString_(
        u.user
      ) ===

      normalizeScoreString_(
        username
      )

    ) {

      rank = i + 1;

    }

  });

  const leader =
    sorted[0];

  return {

    points:
      row.total,

    statues:
      row.statues,

    remaining:
      row.remaining,

    max:
      row.max,

    rank:
      rank,

    behind:
      leader.total - row.total,

    winChance:
      row.winChance,

    eliminated:
      row.eliminated

  };

}

/* =====================================================
   TESTS
===================================================== */

function TEST_LEADERBOARD(){

  Logger.log(

    JSON.stringify(

      getLeaderboardData(
        getDefaultGameId()
      ),

      null,

      2

    )

  );

}

function TEST_PROJECTED(){

  Logger.log(

    JSON.stringify(

      getProjectedResults(
        getDefaultGameId()
      ),

      null,

      2

    )

  );

}

