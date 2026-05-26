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
      headers.indexOf("OriginalNomineeId")

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
        ) || 0

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

  /* =====================================================
     CATEGORY SETTINGS
  ===================================================== */

  const settings =
    getCategorySettings(gameId);

  /* =====================================================
     PICKS
  ===================================================== */

  const userPicks =
    buildUserPicksMap_(gameId);

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

          if (!config) {
            return;
          }

          const pick =
            picks[categoryId];

          const basePoints =
            Number(config.points) || 0;

          const penalty =
            Number(config.changePenalty) || 0;

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

          const winnerNomineeId =

            projected

              ? normalizeScoreString_(
                  config.winnerNomineeId ||
                  config.favoriteNomineeId ||
                  ""
                )

              : normalizeScoreString_(
                  config.winnerNomineeId ||
                  ""
                );

          /* =====================================================
             CATEGORY RESOLVED
          ===================================================== */

          if (winnerNomineeId) {

            if (
              normalizeScoreString_(
                pick.nomineeId
              ) === winnerNomineeId
            ) {

              total += adjustedPoints;

              if (
                config.countsAsStatue ===
                true
              ) {

                statues++;

              }

            }

          }

          /* =====================================================
             CATEGORY NOT RESOLVED
          ===================================================== */

          else {

            remaining += adjustedPoints;

          }

        });

      const profile =
  getUserProfile(
    username,
    gameId
  ) || {};

  results.push({

    user:
      username,

    displayName:
      profile.displayName ||
      username,

    avatar:
      profile.avatar ||
      "default",

    themeColor:
      profile.themeColor ||
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
      0

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

      /* =====================================================
         FINALIZED GAME
      ===================================================== */

      if (
        totalRemaining === 0
      ) {

        r.winChance =
          r.total === leaderScore
            ? 100
            : 0;

        return;

      }

      /* =====================================================
         SIMPLE MODEL
      ===================================================== */

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

  const settings =
    getCategorySettings(gameId);

  const categories =
    getCategories(gameId);

  const picksData =
    apiGetMyPicks(
      username,
      gameId
    );

  const scoring = {};

  categories.forEach(cat => {

    const config =
      settings[cat.id] || {};

    const nomineeId =
      picksData.picks[cat.id];

    const changes =
      picksData.changeCounts[
        cat.id
      ] || 0;

    const basePoints =
      Number(config.points) || 0;

    const penalty =
      Number(
        config.changePenalty
      ) || 0;

    const finalPoints =
      Math.max(
        basePoints -
        (
          changes *
          penalty
        ),
        0
      );

    scoring[cat.id] = {

      shortName:
        config.shortName ||
        cat.name,

      nomineeId:
        nomineeId || "",

      changes:
        changes,

      basePoints:
        basePoints,

      finalPointsAvailable:
        finalPoints,

      displayPoints:
        `${finalPoints}/${basePoints}`,

      locked:
        config.locked === true

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

