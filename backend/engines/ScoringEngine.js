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

function isFixedPointScoringEnabledForGame_(game) {

  if (!game) {
    return true;
  }

  const type =
    normalizeScoreString_(game.type || "");

  const format =
    normalizeScoreString_(game.gameFormat || "");

  const isHybrid =
    type === "mixed" ||
    type === "hybrid" ||
    type === "combo" ||
    format === "hybrid" ||
    game.mixedGame === true;

  return (
    game.fixedPointsEnabled !== false ||
    (
      isHybrid &&
      game.predictionEnabled === true
    )
  );

}

function getScoringBasePoints_(
  config,
  pick,
  usesConfidencePoints
) {

  if (usesConfidencePoints) {

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
      headers.indexOf("ConfidencePoints"),

    stakePoints:
      headers.indexOf("StakePoints")

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
          : 0,

      stakePoints:
        col.stakePoints !== -1
          ? normalizeScoreNumber_(
              row[col.stakePoints],
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

  const game =
    typeof getGameRuntimeConfig === "function"
      ? getGameRuntimeConfig(gameId)
      : getGame(gameId);

  const isConfidenceGame =
    isConfidenceScoringGame_(
      gameId
    );

  const stakedPointsEnabled =
    !!(
      game &&
      game.stakedPointsEnabled === true
    );

  const confidenceScoringMode =
    getConfidenceScoringMode_(
      gameId
    );

  const settings =
    getCategorySettings(
      gameId
    );

  const categoryResolutions =
    typeof getCategoryResultsResolutionMap === "function"
      ? getCategoryResultsResolutionMap(gameId)
      : (
          typeof getCategoryResultsWinnerMap === "function"
            ? getCategoryResultsWinnerMap(gameId)
            : {}
        );

  const userPicks =
    buildUserPicksMap_(
      gameId
    );

  const seasonAnchorAdjustments =
    typeof seasonAnchorAdjustmentsForGame_ === "function"
      ? seasonAnchorAdjustmentsForGame_(gameId)
      : {};

  const leaderboardUsers = {};
  Object.keys(userPicks).forEach(function(username) { leaderboardUsers[username] = true; });
  Object.keys(seasonAnchorAdjustments).forEach(function(username) { leaderboardUsers[username] = true; });

  const results = [];

  Object.keys(leaderboardUsers)
    .forEach(function(username) {

      const picks =
        userPicks[username] || {};

      let fixedPoints = 0;
      let fixedRemaining = 0;
      let stakedNet = 0;
      let stakedPotential = 0;
      let pendingStakes = 0;
      let stakedWins = 0;
      let stakedLosses = 0;
      let stakedPushes = 0;
      let statues = 0;

      Object.keys(picks)
        .forEach(function(categoryId) {

          const config =
            settings[categoryId] || {};

          const pick =
            picks[categoryId];

          if (!pick) {
            return;
          }

          const resolution =
            typeof getHybridCategoryResolution_ === "function"
              ? getHybridCategoryResolution_(
                  categoryId,
                  config,
                  categoryResolutions
                )
              : {
                  resolved:
                    Boolean(
                      categoryResolutions[categoryId] ||
                      config.winnerNomineeId
                    ),
                  result: "winner",
                  winnerNomineeId:
                    normalizeScoreString_(
                      categoryResolutions[categoryId] ||
                      config.winnerNomineeId ||
                      ""
                    )
                };

          const projectedWinnerId =
            resolution.result === "winner"
              ? normalizeScoreString_(
                  resolution.winnerNomineeId ||
                  ""
                )
              : (
                  projected &&
                  !resolution.resolved
                    ? normalizeScoreString_(
                        config.favoriteNomineeId ||
                        ""
                      )
                    : ""
                );

          const normalizedScoreMode =
            typeof normalizeCategoryScoreMode_ === "function"
              ? normalizeCategoryScoreMode_(
                  config.scoreMode
                )
              : normalizeScoreString_(
                  config.scoreMode || "correct-pick"
                );

          const usesConfidencePoints =
            normalizedScoreMode === "confidence-points" ||
            (
              normalizedScoreMode === "correct-pick" &&
              isConfidenceGame
            );

          if (
            normalizedScoreMode === "wager" ||
            normalizedScoreMode === "ranking"
          ) {
            return;
          }

          const isStaked =
            normalizedScoreMode === "staked-points";

          if (isStaked) {

            if (!stakedPointsEnabled) {
              return;
            }

            const stake =
              Math.max(
                0,
                normalizeScoreNumber_(
                  pick.stakePoints,
                  0
                )
              );

            if (!stake) {
              return;
            }

            const rules =
              typeof getStakedPredictionRules_ === "function"
                ? getStakedPredictionRules_(
                    gameId,
                    config
                  )
                : {
                    winMultiplier: 1,
                    lossMultiplier: 1
                  };

            if (resolution.result === "push") {
              stakedPushes++;
              return;
            }

            if (projectedWinnerId) {

              const isCorrect =
                normalizeScoreString_(
                  pick.nomineeId
                ) === projectedWinnerId;

              if (isCorrect) {

                stakedNet +=
                  stake *
                  normalizeScoreNumber_(
                    rules.winMultiplier,
                    1
                  );

                stakedWins++;

                if (
                  config.countsAsStatue === true
                ) {
                  statues++;
                }

              } else {

                stakedNet -=
                  stake *
                  normalizeScoreNumber_(
                    rules.lossMultiplier,
                    1
                  );

                stakedLosses++;

              }

            } else {

              pendingStakes += stake;

              stakedPotential +=
                stake *
                normalizeScoreNumber_(
                  rules.winMultiplier,
                  1
                );

            }

            return;

          }

          if (
            usesConfidencePoints &&
            (
              !game ||
              game.confidenceEnabled !== true
            )
          ) {
            return;
          }

          if (
            !usesConfidencePoints &&
            !isFixedPointScoringEnabledForGame_(game)
          ) {
            return;
          }

          if (resolution.result === "push") {
            return;
          }

          const basePoints =
            getScoringBasePoints_(
              config,
              pick,
              usesConfidencePoints
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

          if (projectedWinnerId) {

            const isCorrect =
              normalizeScoreString_(
                pick.nomineeId
              ) === projectedWinnerId;

            if (isCorrect) {

              fixedPoints += adjustedPoints;

              if (
                config.countsAsStatue === true
              ) {
                statues++;
              }

            } else if (
              usesConfidencePoints &&
              confidenceScoringMode === "risk_penalty"
            ) {

              fixedPoints -= adjustedPoints;

            }

          } else {

            fixedRemaining += adjustedPoints;

          }

        });

      const seasonAnchor =
        seasonAnchorAdjustments[username] || {
          bonus: 0,
          penalty: 0,
          net: 0,
          longestStreak: 0,
          currentStreak: 0,
          currentMultiplier: 0,
          currentEntityName: "",
          status: ""
        };

      const fixedPointsBeforeSeasonAnchor = fixedPoints;
      fixedPoints += normalizeScoreNumber_(seasonAnchor.net, 0);

      const startingPoints =
        stakedPointsEnabled
          ? Math.max(
              0,
              normalizeScoreNumber_(
                game && game.startingPoints,
                1000
              )
            )
          : 0;

      const stakedBalance =
        stakedPointsEnabled
          ? Math.max(
              0,
              startingPoints + stakedNet
            )
          : 0;

      const availableStakedPoints =
        Math.max(
          0,
          stakedBalance - pendingStakes
        );

      const leaderboardScoreMode =
        game && game.leaderboardScoreMode
          ? game.leaderboardScoreMode
          : "combined-net";

      let total =
        fixedPoints + stakedNet;

      let remaining =
        fixedRemaining + stakedPotential;

      if (leaderboardScoreMode === "fixed-only") {
        total = fixedPoints;
        remaining = fixedRemaining;
      }

      if (leaderboardScoreMode === "staked-balance") {
        total = stakedPointsEnabled
          ? stakedBalance
          : 0;
        remaining = stakedPointsEnabled
          ? stakedPotential
          : 0;
      }

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

        fixedPointsEnabled:
          isFixedPointScoringEnabledForGame_(game),

        fixedPoints:
          fixedPoints,

        fixedPointsBeforeSeasonAnchor:
          fixedPointsBeforeSeasonAnchor,

        seasonAnchorBonus:
          normalizeScoreNumber_(seasonAnchor.bonus, 0),

        seasonAnchorPenalty:
          normalizeScoreNumber_(seasonAnchor.penalty, 0),

        seasonAnchorNet:
          normalizeScoreNumber_(seasonAnchor.net, 0),

        seasonAnchorCurrentStreak:
          normalizeScoreNumber_(seasonAnchor.currentStreak, 0),

        seasonAnchorLongestStreak:
          normalizeScoreNumber_(seasonAnchor.longestStreak, 0),

        seasonAnchorCurrentMultiplier:
          normalizeScoreNumber_(seasonAnchor.currentMultiplier, 0),

        seasonAnchorCurrentEntityName:
          seasonAnchor.currentEntityName || "",

        seasonAnchorStatus:
          seasonAnchor.status || "",

        fixedRemaining:
          fixedRemaining,

        stakedNet:
          stakedNet,

        stakedPointsEnabled:
          stakedPointsEnabled,

        stakedBalance:
          stakedBalance,

        pendingStakes:
          pendingStakes,

        stakedPotential:
          stakedPotential,

        availableStakedPoints:
          availableStakedPoints,

        stakedWins:
          stakedWins,

        stakedLosses:
          stakedLosses,

        stakedPushes:
          stakedPushes,

        eliminated:
          false,

        winChance:
          0,

        scoringMode:
          game && game.gameFormat === "hybrid"
            ? "hybrid"
            : (
                isConfidenceGame
                  ? "confidence"
                  : "standard"
              ),

        leaderboardScoreMode:
          leaderboardScoreMode,

        confidenceScoringMode:
          isConfidenceGame
            ? confidenceScoringMode
            : ""

      });

    });

  results.sort(function(a, b) {

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

  if (results.length) {

    const leaderScore =
      results[0].total;

    results.forEach(function(row) {

      row.eliminated =
        row.max < leaderScore;

    });

    const alive =
      results.filter(function(row) {
        return !row.eliminated;
      });

    const totalRemaining =
      alive.reduce(
        function(sum, row) {
          return sum + row.remaining;
        },
        0
      );

    results.forEach(function(row) {

      if (row.eliminated) {
        row.winChance = 0;
        return;
      }

      if (totalRemaining === 0) {
        row.winChance =
          row.total === leaderScore
            ? 100
            : 0;
        return;
      }

      row.winChance =
        Math.round(
          (
            row.remaining /
            totalRemaining
          ) * 100
        );

    });

  }

  if (
    options.skipParentRollup !== true &&
    game &&
    game.gameRole === "parent" &&
    typeof rollupParentLeaderboard_ === "function"
  ) {

    return rollupParentLeaderboard_(
      gameId,
      results,
      options
    );

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

  const game =
    typeof getGameRuntimeConfig === "function"
      ? getGameRuntimeConfig(gameId)
      : getGame(gameId);

  const isConfidenceGame =
    isConfidenceScoringGame_(
      gameId
    );

  const confidenceScoringMode =
    typeof getConfidenceScoringMode_ === "function"
      ? getConfidenceScoringMode_(gameId)
      : "win_only";

  const settings =
    getCategorySettings(gameId);

  const categories =
    getCategories(gameId);

  const picksData =
    apiGetMyPicks(
      username,
      gameId
    );

  const categoryResolutions =
    typeof getCategoryResultsResolutionMap === "function"
      ? getCategoryResultsResolutionMap(gameId)
      : (
          typeof getCategoryResultsWinnerMap === "function"
            ? getCategoryResultsWinnerMap(gameId)
            : {}
        );

  const scoring = {};

  categories.forEach(function(cat) {

    const categoryId =
      normalizeScoreString_(cat.id);

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

    const stakePoints =
      picksData.stakePoints &&
      picksData.stakePoints[categoryId]
        ? Number(
            picksData.stakePoints[categoryId]
          ) || 0
        : picksData.stakePoints &&
          picksData.stakePoints[cat.id]
          ? Number(
              picksData.stakePoints[cat.id]
            ) || 0
          : 0;

    const normalizedScoreMode =
      typeof normalizeCategoryScoreMode_ === "function"
        ? normalizeCategoryScoreMode_(
            config.scoreMode
          )
        : normalizeScoreString_(
            config.scoreMode ||
            "correct-pick"
          );

    const usesConfidencePoints =
      normalizedScoreMode === "confidence-points" ||
      (
        normalizedScoreMode === "correct-pick" &&
        isConfidenceGame
      );

    const resolution =
      typeof getHybridCategoryResolution_ === "function"
        ? getHybridCategoryResolution_(
            categoryId,
            config,
            categoryResolutions
          )
        : {
            resolved:
              Boolean(config.winnerNomineeId),
            result:
              config.winnerNomineeId
                ? "winner"
                : "pending",
            winnerNomineeId:
              normalizeScoreString_(
                config.winnerNomineeId ||
                ""
              )
          };

    const winnerNomineeId =
      normalizeScoreString_(
        resolution.winnerNomineeId ||
        ""
      );

    const normalizedPick =
      normalizeScoreString_(
        nomineeId
      );

    const hasPick =
      Boolean(normalizedPick);

    const isCorrect =
      resolution.result === "winner" &&
      hasPick &&
      normalizedPick === winnerNomineeId;

    const isWrong =
      resolution.result === "winner" &&
      hasPick &&
      normalizedPick !== winnerNomineeId;

    if (normalizedScoreMode === "staked-points") {

      const rules =
        typeof getStakedPredictionRules_ === "function"
          ? getStakedPredictionRules_(
              gameId,
              config
            )
          : {
              winMultiplier: 1,
              lossMultiplier: 1
            };

      let earnedPoints = 0;
      let remainingPoints = 0;
      let status = "pending";

      if (resolution.result === "push") {
        status = "push";
      } else if (resolution.result === "winner") {
        if (isCorrect) {
          earnedPoints =
            stakePoints *
            normalizeScoreNumber_(
              rules.winMultiplier,
              1
            );
          status = "correct";
        } else if (isWrong) {
          earnedPoints =
            -stakePoints *
            normalizeScoreNumber_(
              rules.lossMultiplier,
              1
            );
          status = "wrong";
        } else {
          status = "no-pick";
        }
      } else {
        remainingPoints =
          stakePoints *
          normalizeScoreNumber_(
            rules.winMultiplier,
            1
          );
      }

      scoring[categoryId] = {
        shortName:
          config.shortName ||
          cat.name,
        nomineeId:
          nomineeId || "",
        winnerNomineeId:
          winnerNomineeId || "",
        changes: changes,
        basePoints: stakePoints,
        confidencePoints: 0,
        stakePoints: stakePoints,
        finalPointsAvailable:
          remainingPoints,
        earnedPoints: earnedPoints,
        remainingPoints: remainingPoints,
        reservedPoints:
          resolution.resolved
            ? 0
            : stakePoints,
        displayPoints:
          resolution.resolved
            ? String(earnedPoints)
            : `${remainingPoints}/${stakePoints}`,
        locked:
          config.locked === true,
        resolved:
          resolution.resolved === true,
        correct: isCorrect,
        wrong: isWrong,
        push:
          resolution.result === "push",
        status: status,
        scoringMode: "staked-points",
        confidenceScoringMode: ""
      };

      return;
    }

    if (
      normalizedScoreMode === "wager" ||
      normalizedScoreMode === "ranking"
    ) {
      scoring[categoryId] = {
        shortName:
          config.shortName ||
          cat.name,
        nomineeId:
          nomineeId || "",
        winnerNomineeId:
          winnerNomineeId || "",
        earnedPoints: 0,
        remainingPoints: 0,
        locked:
          config.locked === true,
        resolved:
          resolution.resolved === true,
        correct: false,
        wrong: false,
        push:
          resolution.result === "push",
        scoringMode:
          normalizedScoreMode,
        confidenceScoringMode: ""
      };
      return;
    }

    const basePoints =
      usesConfidencePoints
        ? confidencePoints
        : Number(config.points) || 0;

    const penalty =
      Number(config.changePenalty) || 0;

    const finalPointsAvailable =
      Math.max(
        basePoints -
        (
          changes *
          penalty
        ),
        0
      );

    let earnedPoints = 0;
    let remainingPoints = 0;

    if (resolution.result === "winner") {

      if (isCorrect) {
        earnedPoints =
          finalPointsAvailable;
      } else if (
        isWrong &&
        usesConfidencePoints &&
        confidenceScoringMode === "risk_penalty"
      ) {
        earnedPoints =
          -finalPointsAvailable;
      }

    } else if (!resolution.resolved) {
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
      changes: changes,
      basePoints: basePoints,
      confidencePoints:
        usesConfidencePoints
          ? confidencePoints
          : 0,
      stakePoints: 0,
      finalPointsAvailable:
        finalPointsAvailable,
      earnedPoints:
        earnedPoints,
      remainingPoints:
        remainingPoints,
      displayPoints:
        resolution.resolved
          ? String(earnedPoints)
          : `${remainingPoints}/${basePoints}`,
      locked:
        config.locked === true,
      resolved:
        resolution.resolved === true,
      correct:
        isCorrect,
      wrong:
        isWrong,
      push:
        resolution.result === "push",
      scoringMode:
        usesConfidencePoints
          ? "confidence-points"
          : "fixed-points",
      confidenceScoringMode:
        usesConfidencePoints
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

