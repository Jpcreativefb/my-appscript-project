/* =====================================================
   HYBRID GAME ENGINE

   Additive foundation for:
   - fixed-point predictions
   - staked-point predictions
   - parent season games and mini games
   - normalized external result metadata
===================================================== */

function hybridString_(value) {

  return String(value || "")
    .trim();

}

function hybridKey_(value) {

  return hybridString_(value)
    .toLowerCase()
    .replace(/_/g, "-");

}

function hybridId_(value) {

  return hybridString_(value)
    .toLowerCase();

}

function hybridNumber_(value, fallback) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const number = Number(value);

  return isNaN(number)
    ? fallback
    : number;

}

function normalizeCategoryScoreMode_(value) {

  const mode =
    hybridKey_(value || "correct-pick");

  if (
    mode === "staked" ||
    mode === "stake" ||
    mode === "staked-points" ||
    mode === "confidence-stake"
  ) {
    return "staked-points";
  }

  if (
    mode === "wager" ||
    mode === "wager-odds" ||
    mode === "sports-wager"
  ) {
    return "wager";
  }

  if (
    mode === "ranking" ||
    mode === "ranked"
  ) {
    return "ranking";
  }

  if (
    mode === "confidence" ||
    mode === "confidence-points" ||
    mode === "confidence-pool"
  ) {
    return "confidence-points";
  }

  if (
    mode === "fixed" ||
    mode === "fixed-points" ||
    mode === "assigned-points"
  ) {
    return "fixed-points";
  }

  /*
    Legacy CategorySettings rows are blank or use correct-pick. In a
    confidence game those rows keep the existing confidence behavior; in
    every other game they remain ordinary fixed-point predictions.
  */
  return "correct-pick";

}

function isStakedPointsScoreMode_(value) {

  return normalizeCategoryScoreMode_(value) ===
    "staked-points";

}

function isConfidencePointsScoreMode_(value) {

  return normalizeCategoryScoreMode_(value) ===
    "confidence-points";

}

function getStakedPredictionRules_(
  gameId,
  categoryConfig
) {

  const game =
    typeof getGameRuntimeConfig === "function"
      ? getGameRuntimeConfig(gameId)
      : getGame(gameId);

  categoryConfig = categoryConfig || {};

  function positiveOverride_(value, fallback) {
    const number = hybridNumber_(value, 0);
    return number > 0 ? number : fallback;
  }

  function nonNegativeOverride_(value, fallback) {

    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const number = Number(value);

    return !isNaN(number) && number >= 0
      ? number
      : fallback;

  }

  const gameMinStake =
    Math.max(
      1,
      hybridNumber_(game && game.minStake, 10)
    );

  const minStake =
    Math.max(
      1,
      Math.floor(
        positiveOverride_(
        categoryConfig.minStake,
        gameMinStake
        )
      )
    );

  const stakeIncrement =
    Math.max(
      1,
      Math.floor(
        positiveOverride_(
          categoryConfig.stakeIncrement,
          Math.max(
            1,
            hybridNumber_(game && game.stakeIncrement, 10)
          )
        )
      )
    );

  const requestedMaxStake =
    Math.max(
      minStake,
      Math.floor(
        positiveOverride_(
          categoryConfig.maxStake,
          Math.max(
            minStake,
            hybridNumber_(game && game.maxStake, 100)
          )
        )
      )
    );

  const maxStake =
    minStake +
    Math.floor(
      (requestedMaxStake - minStake) /
      stakeIncrement
    ) * stakeIncrement;

  return {
    enabled:
      !!(
        game &&
        game.stakedPointsEnabled === true
      ),

    startingPoints:
      Math.max(
        0,
        hybridNumber_(
          game && game.startingPoints,
          1000
        )
      ),

    minStake: minStake,
    maxStake: maxStake,
    stakeIncrement: stakeIncrement,

    winMultiplier:
      nonNegativeOverride_(
        categoryConfig.stakeWinMultiplier,
        Math.max(
          0,
          hybridNumber_(
            game && game.stakeWinMultiplier,
            1
          )
        )
      ),

    lossMultiplier:
      nonNegativeOverride_(
        categoryConfig.stakeLossMultiplier,
        Math.max(
          0,
          hybridNumber_(
            game && game.stakeLossMultiplier,
            1
          )
        )
      )
  };

}

function validateStakePoints_(stakePoints, rules) {

  stakePoints =
    Math.floor(
      hybridNumber_(stakePoints, 0)
    );

  rules = rules || {};

  if (stakePoints <= 0) {
    return {
      valid: false,
      message: "Stake points are required"
    };
  }

  if (stakePoints < rules.minStake) {
    return {
      valid: false,
      message:
        "Minimum stake is " +
        rules.minStake +
        " points"
    };
  }

  if (stakePoints > rules.maxStake) {
    return {
      valid: false,
      message:
        "Maximum stake is " +
        rules.maxStake +
        " points"
    };
  }

  if (
    (
      stakePoints - rules.minStake
    ) % rules.stakeIncrement !== 0
  ) {
    return {
      valid: false,
      message:
        "Stake must increase by " +
        rules.stakeIncrement +
        " points"
    };
  }

  return {
    valid: true,
    stakePoints: stakePoints
  };

}

function getHybridCategoryResolution_(
  categoryId,
  config,
  winnerMap
) {

  categoryId =
    hybridId_(categoryId);

  config = config || {};
  winnerMap = winnerMap || {};

  const status =
    hybridKey_(
      config.settlementStatus ||
      ""
    );

  if (
    status === "push" ||
    status === "pushed" ||
    status === "void" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    return {
      resolved: true,
      result: "push",
      winnerNomineeId: ""
    };
  }

  const mappedResolution =
    winnerMap[categoryId];

  if (
    mappedResolution &&
    typeof mappedResolution === "object"
  ) {

    if (mappedResolution.result === "push") {
      return {
        resolved: true,
        result: "push",
        winnerNomineeId: ""
      };
    }

    if (
      mappedResolution.resolved === true &&
      mappedResolution.winnerNomineeId
    ) {
      return {
        resolved: true,
        result: "winner",
        winnerNomineeId:
          hybridId_(mappedResolution.winnerNomineeId)
      };
    }

  }

  const winnerNomineeId =
    hybridId_(
      mappedResolution ||
      config.winnerNomineeId ||
      ""
    );

  if (!winnerNomineeId) {
    return {
      resolved: false,
      result: "pending",
      winnerNomineeId: ""
    };
  }

  return {
    resolved: true,
    result: "winner",
    winnerNomineeId: winnerNomineeId
  };

}

function getStakedPredictionSummary_(
  username,
  gameId,
  options
) {

  options = options || {};

  gameId =
    hybridString_(
      gameId || getDefaultGameId()
    );

  const game =
    typeof getGameRuntimeConfig === "function"
      ? getGameRuntimeConfig(gameId)
      : getGame(gameId);

  const enabled =
    !!(
      game &&
      game.stakedPointsEnabled === true
    );

  const startingPoints =
    enabled
      ? Math.max(
          0,
          hybridNumber_(
            game && game.startingPoints,
            1000
          )
        )
      : 0;

  if (!enabled) {
    return {
      gameId: gameId,
      username: username,
      enabled: false,
      startingPoints: 0,
      currentBalance: 0,
      pendingStakes: 0,
      availablePoints: 0,
      settledNet: 0,
      wonPoints: 0,
      lostPoints: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      pending: 0
    };
  }

  const settings =
    options.settings ||
    getCategorySettings(gameId);

  const winnerMap =
    options.resolutionMap ||
    options.winnerMap ||
    (
      typeof getCategoryResultsResolutionMap === "function"
        ? getCategoryResultsResolutionMap(gameId)
        : (
            typeof getCategoryResultsWinnerMap === "function"
              ? getCategoryResultsWinnerMap(gameId)
              : {}
          )
    );

  const picks =
    options.picks ||
    getUserPicks(username, gameId);

  const excludeCategoryId =
    hybridId_(
      options.excludeCategoryId ||
      ""
    );

  let pendingStakes = 0;
  let settledNet = 0;
  let wonPoints = 0;
  let lostPoints = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;

  (picks || []).forEach(function(pick) {

    const categoryId =
      hybridId_(pick.categoryId);

    if (
      !categoryId ||
      categoryId === excludeCategoryId
    ) {
      return;
    }

    const config =
      settings[categoryId] || {};

    if (!isStakedPointsScoreMode_(config.scoreMode)) {
      return;
    }

    const stake =
      Math.max(
        0,
        hybridNumber_(pick.stakePoints, 0)
      );

    if (!stake) {
      return;
    }

    const rules =
      getStakedPredictionRules_(
        gameId,
        config
      );

    const resolution =
      getHybridCategoryResolution_(
        categoryId,
        config,
        winnerMap
      );

    if (!resolution.resolved) {
      pendingStakes += stake;
      pending++;
      return;
    }

    if (resolution.result === "push") {
      pushes++;
      return;
    }

    const isCorrect =
      hybridId_(pick.nomineeId) ===
      resolution.winnerNomineeId;

    if (isCorrect) {
      const win =
        stake * rules.winMultiplier;

      settledNet += win;
      wonPoints += win;
      wins++;
      return;
    }

    const loss =
      stake * rules.lossMultiplier;

    settledNet -= loss;
    lostPoints += loss;
    losses++;

  });

  const currentBalance =
    Math.max(
      0,
      startingPoints + settledNet
    );

  const availablePoints =
    Math.max(
      0,
      currentBalance - pendingStakes
    );

  return {
    gameId: gameId,
    username: username,
    enabled: enabled,
    startingPoints: startingPoints,
    currentBalance: currentBalance,
    pendingStakes: pendingStakes,
    availablePoints: availablePoints,
    settledNet: settledNet,
    wonPoints: wonPoints,
    lostPoints: lostPoints,
    wins: wins,
    losses: losses,
    pushes: pushes,
    pending: pending
  };

}

function hybridPlacementPoints_(game) {

  const fallback =
    [10, 8, 6, 5, 4, 3, 2, 1];

  const raw =
    game && game.placementPointsJSON;

  if (!raw) {
    return fallback;
  }

  try {

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.map(function(value) {
        return hybridNumber_(value, 0);
      });
    }

    if (parsed && typeof parsed === "object") {
      return parsed;
    }

  } catch (err) {
    Logger.log(
      "Invalid PlacementPointsJSON: " +
      err.message
    );
  }

  return fallback;

}

function rollupParentLeaderboard_(
  parentGameId,
  ownResults,
  options
) {

  options = options || {};

  const parentGame =
    getGame(parentGameId);

  if (
    !parentGame ||
    parentGame.gameRole !== "parent"
  ) {
    return ownResults || [];
  }

  const includeOwnResults =
    parentGame.hubMode !== "leaderboard-only" &&
    parentGame.includeParentQuestions !== false;

  const children =
    typeof getChildGames === "function"
      ? getChildGames(parentGameId)
      : [];

  if (!children.length) {
    return includeOwnResults
      ? (ownResults || [])
      : [];
  }

  const userMap = {};

  function ensureUser(row) {

    const username =
      hybridString_(
        row.username || row.user
      );

    if (!username) {
      return null;
    }

    if (!userMap[username]) {
      userMap[username] = {
        user: username,
        username: username,
        displayName:
          row.displayName || username,
        avatar: row.avatar || "👤",
        themeColor:
          row.themeColor || "#354785",
        total: 0,
        remaining: 0,
        max: 0,
        statues: 0,
        eliminated: false,
        winChance: 0,
        fixedPointsEnabled:
          parentGame.fixedPointsEnabled !== false ||
          row.fixedPointsEnabled === true,
        fixedPoints: 0,
        fixedRemaining: 0,
        stakedNet: 0,
        stakedPointsEnabled:
          parentGame.stakedPointsEnabled === true ||
          row.stakedPointsEnabled === true,
        parentStakedPoolEnabled:
          parentGame.stakedPointsEnabled === true,
        stakedBalance: 0,
        stakedPotential: 0,
        pendingStakes: 0,
        stakedWins: 0,
        stakedLosses: 0,
        stakedPushes: 0,
        availableStakedPoints: 0,
        miniGamesCounted: 0,
        miniGameContributions: []
      };
    }

    return userMap[username];

  }

  (includeOwnResults ? (ownResults || []) : []).forEach(function(row) {

    const target = ensureUser(row);

    if (!target) {
      return;
    }

    target.total +=
      hybridNumber_(row.total, 0);

    target.remaining +=
      hybridNumber_(row.remaining, 0);

    target.statues +=
      hybridNumber_(row.statues, 0);

    target.fixedPoints +=
      hybridNumber_(row.fixedPoints, row.total || 0);

    target.fixedRemaining +=
      hybridNumber_(row.fixedRemaining, 0);

    target.stakedNet +=
      hybridNumber_(row.stakedNet, 0);

    target.stakedPotential +=
      hybridNumber_(row.stakedPotential, 0);

    target.pendingStakes +=
      hybridNumber_(row.pendingStakes, 0);

    target.stakedWins +=
      hybridNumber_(row.stakedWins, 0);

    target.stakedLosses +=
      hybridNumber_(row.stakedLosses, 0);

    target.stakedPushes +=
      hybridNumber_(row.stakedPushes, 0);

    target.fixedPointsEnabled =
      target.fixedPointsEnabled ||
      row.fixedPointsEnabled === true;

    target.stakedPointsEnabled =
      target.stakedPointsEnabled ||
      row.stakedPointsEnabled === true;

  });

  const placementPoints =
    hybridPlacementPoints_(parentGame);

  children.forEach(function(child) {

    const childRows =
      getLeaderboardData(
        child.gameId,
        {
          projected: options.projected === true,
          skipParentRollup: true
        }
      );

    let previousPlacementScore = null;
    let previousPlacementRank = 0;

    childRows.forEach(function(row, index) {

      const placementScore =
        hybridNumber_(row.total, 0);

      const placementRank =
        index === 0 || placementScore !== previousPlacementScore
          ? index + 1
          : previousPlacementRank;

      previousPlacementScore = placementScore;
      previousPlacementRank = placementRank;

      const target = ensureUser(row);

      if (!target) {
        return;
      }

      target.fixedPointsEnabled =
        target.fixedPointsEnabled ||
        row.fixedPointsEnabled === true;

      target.stakedPointsEnabled =
        target.stakedPointsEnabled ||
        row.stakedPointsEnabled === true;

      const mode =
        child.parentContributionMode ||
        "add-points";

      const weight =
        hybridNumber_(
          child.parentContributionWeight,
          1
        );

      const rawNetScore =
        hybridNumber_(row.fixedPoints, 0) +
        hybridNumber_(row.stakedNet, 0);

      let contribution =
        rawNetScore;

      if (mode === "weighted-points") {
        contribution *= weight;
      }

      if (mode === "placement-points") {

        if (Array.isArray(placementPoints)) {
          contribution =
            hybridNumber_(
              placementPoints[placementRank - 1],
              0
            );
        } else {
          contribution =
            hybridNumber_(
              placementPoints[String(placementRank)],
              0
            );
        }

      }

      const metricWeight =
        mode === "weighted-points"
          ? weight
          : 1;

      const isPlacementContribution =
        mode === "placement-points";

      target.miniGameContributions.push({
        gameId: child.gameId,
        gameName: child.name,
        mode: mode,
        placementRank:
          mode === "placement-points"
            ? placementRank
            : 0,
        rawScore:
          rawNetScore,
        contribution: contribution,
        remainingContribution:
          isPlacementContribution
            ? 0
            : (
                hybridNumber_(
                  row.fixedRemaining,
                  0
                ) +
                hybridNumber_(
                  row.stakedPotential,
                  0
                )
              ) * metricWeight,
        fixedContribution:
          isPlacementContribution
            ? contribution
            : hybridNumber_(
                row.fixedPoints,
                row.total || 0
              ) * metricWeight,
        fixedRemainingContribution:
          isPlacementContribution
            ? 0
            : hybridNumber_(
                row.fixedRemaining,
                0
              ) * metricWeight,
        stakedNetContribution:
          isPlacementContribution
            ? 0
            : hybridNumber_(
                row.stakedNet,
                0
              ) * metricWeight,
        stakedPotentialContribution:
          isPlacementContribution
            ? 0
            : hybridNumber_(
                row.stakedPotential,
                0
              ) * metricWeight,
        pendingStakesContribution:
          isPlacementContribution
            ? 0
            : hybridNumber_(
                row.pendingStakes,
                0
              ) * metricWeight,
        stakedWins:
          hybridNumber_(row.stakedWins, 0),
        stakedLosses:
          hybridNumber_(row.stakedLosses, 0),
        stakedPushes:
          hybridNumber_(row.stakedPushes, 0)
      });

    });

  });

  Object.keys(userMap).forEach(function(username) {

    const row = userMap[username];

    let contributions =
      row.miniGameContributions.slice();

    const bestCount =
      Math.max(
        0,
        hybridNumber_(
          parentGame.parentBestCount,
          0
        )
      );

    if (bestCount > 0) {
      contributions = contributions
        .sort(function(a, b) {
          return b.contribution - a.contribution;
        })
        .slice(0, bestCount);
    }

    const childTotal =
      contributions.reduce(
        function(sum, item) {
          return sum + item.contribution;
        },
        0
      );

    const childRemaining =
      contributions.reduce(
        function(sum, item) {
          return sum +
            hybridNumber_(
              item.remainingContribution,
              0
            );
        },
        0
      );

    const childFixedPoints =
      contributions.reduce(
        function(sum, item) {
          return sum +
            hybridNumber_(
              item.fixedContribution,
              0
            );
        },
        0
      );

    const childFixedRemaining =
      contributions.reduce(
        function(sum, item) {
          return sum +
            hybridNumber_(
              item.fixedRemainingContribution,
              0
            );
        },
        0
      );

    const childStakedNet =
      contributions.reduce(
        function(sum, item) {
          return sum +
            hybridNumber_(
              item.stakedNetContribution,
              0
            );
        },
        0
      );

    const childStakedPotential =
      contributions.reduce(
        function(sum, item) {
          return sum +
            hybridNumber_(
              item.stakedPotentialContribution,
              0
            );
        },
        0
      );

    const childPendingStakes =
      contributions.reduce(
        function(sum, item) {
          return sum +
            hybridNumber_(
              item.pendingStakesContribution,
              0
            );
        },
        0
      );

    const childStakedWins =
      contributions.reduce(
        function(sum, item) {
          return sum + hybridNumber_(item.stakedWins, 0);
        },
        0
      );

    const childStakedLosses =
      contributions.reduce(
        function(sum, item) {
          return sum + hybridNumber_(item.stakedLosses, 0);
        },
        0
      );

    const childStakedPushes =
      contributions.reduce(
        function(sum, item) {
          return sum + hybridNumber_(item.stakedPushes, 0);
        },
        0
      );

    const ownCombinedNet =
      row.fixedPoints + row.stakedNet;

    const ownCombinedRemaining =
      row.fixedRemaining + row.stakedPotential;

    row.total = ownCombinedNet + childTotal;
    row.remaining = ownCombinedRemaining + childRemaining;
    row.fixedPoints += childFixedPoints;
    row.fixedRemaining += childFixedRemaining;
    row.stakedNet += childStakedNet;
    row.stakedPotential += childStakedPotential;
    row.pendingStakes += childPendingStakes;
    row.stakedWins += childStakedWins;
    row.stakedLosses += childStakedLosses;
    row.stakedPushes += childStakedPushes;
    row.miniGamesCounted =
      contributions.length;
    row.miniGameContributions =
      contributions;
    const parentStartingPoints =
      row.parentStakedPoolEnabled
        ? Math.max(
            0,
            hybridNumber_(
              parentGame.startingPoints,
              1000
            )
          )
        : 0;

    row.stakedBalance =
      row.stakedPointsEnabled
        ? Math.max(
            0,
            parentStartingPoints + row.stakedNet
          )
        : 0;
    row.availableStakedPoints =
      Math.max(
        0,
        row.stakedBalance - row.pendingStakes
      );
    row.leaderboardScoreMode =
      parentGame.leaderboardScoreMode ||
      "combined-net";

    if (row.leaderboardScoreMode === "fixed-only") {
      row.total = row.fixedPoints;
      row.remaining = row.fixedRemaining;
    } else if (row.leaderboardScoreMode === "staked-balance") {
      row.total = row.stakedBalance;
      row.remaining = row.stakedPotential;
    }

    row.max = row.total + row.remaining;

    delete row.parentStakedPoolEnabled;

    row.scoringMode =
      parentGame.gameFormat === "hybrid"
        ? "hybrid"
        : "standard";

  });

  const results =
    Object.keys(userMap)
      .map(function(username) {
        return userMap[username];
      });

  results.sort(function(a, b) {

    if (b.total !== a.total) {
      return b.total - a.total;
    }

    return b.statues - a.statues;

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
          (row.remaining / totalRemaining) * 100
        );

    });

  }

  return results;

}

/* =====================================================
   PARENT / MINI WAGER LEADERBOARD ROLLUP
===================================================== */

function rollupParentBettingLeaderboard_(
  parentGameId,
  ownRows,
  options
) {

  options = options || {};

  const parentGame =
    getGame(parentGameId);

  if (
    !parentGame ||
    parentGame.gameRole !== "parent"
  ) {
    return ownRows || [];
  }

  const includeOwnResults =
    parentGame.hubMode !== "leaderboard-only" &&
    parentGame.includeParentQuestions !== false;

  const children =
    typeof getChildGames === "function"
      ? getChildGames(parentGameId)
      : [];

  if (!children.length) {
    return includeOwnResults
      ? (ownRows || [])
      : [];
  }

  const parentStartingBankroll =
    Math.max(
      0,
      hybridNumber_(
        parentGame.startingBankroll,
        1000
      )
    );

  const placementPoints =
    hybridPlacementPoints_(parentGame);

  const userMap = {};

  function ensureUser(row) {

    const username =
      hybridString_(
        row.username || row.user
      );

    if (!username) {
      return null;
    }

    if (!userMap[username]) {
      userMap[username] = {
        user: username,
        username: username,
        displayName: row.displayName || username,
        avatar: row.avatar || "👤",
        themeColor: row.themeColor || "#354785",
        startingBankroll: parentStartingBankroll,
        ownNetProfit: 0,
        ownPotentialGain: 0,
        totalStaked: 0,
        pendingStake: 0,
        activeWagered: 0,
        pendingPotentialReturn: 0,
        payout: 0,
        wonBets: 0,
        lostBets: 0,
        refundedBets: 0,
        pendingBets: 0,
        totalBets: 0,
        bankroll: parentStartingBankroll,
        maxBankroll: parentStartingBankroll,
        eliminated: false,
        miniGamesCounted: 0,
        miniGameContributions: []
      };
    }

    return userMap[username];

  }

  (includeOwnResults ? (ownRows || []) : []).forEach(function(row) {

    const target = ensureUser(row);

    if (!target) {
      return;
    }

    const ownStarting =
      hybridNumber_(
        row.startingBankroll,
        parentStartingBankroll
      );

    target.ownNetProfit +=
      hybridNumber_(row.bankroll, ownStarting) -
      ownStarting;

    target.ownPotentialGain +=
      Math.max(
        0,
        hybridNumber_(row.maxBankroll, row.bankroll) -
        hybridNumber_(row.bankroll, ownStarting)
      );

    [
      "totalStaked",
      "pendingStake",
      "activeWagered",
      "pendingPotentialReturn",
      "payout",
      "wonBets",
      "lostBets",
      "refundedBets",
      "pendingBets",
      "totalBets"
    ].forEach(function(key) {
      target[key] += hybridNumber_(row[key], 0);
    });

  });

  children.forEach(function(child) {

    const childRows =
      getBettingLeaderboardData(
        child.gameId,
        { skipParentRollup: true }
      );

    let previousPlacementScore = null;
    let previousPlacementRank = 0;

    (childRows || []).forEach(function(row, index) {

      const placementScore =
        hybridNumber_(row.bankroll, 0);

      const placementRank =
        index === 0 || placementScore !== previousPlacementScore
          ? index + 1
          : previousPlacementRank;

      previousPlacementScore = placementScore;
      previousPlacementRank = placementRank;

      const target = ensureUser(row);

      if (!target) {
        return;
      }

      const childStarting =
        hybridNumber_(row.startingBankroll, 0);

      const rawNetProfit =
        hybridNumber_(row.bankroll, childStarting) -
        childStarting;

      const rawPotentialGain =
        Math.max(
          0,
          hybridNumber_(row.maxBankroll, row.bankroll) -
          hybridNumber_(row.bankroll, childStarting)
        );

      const mode =
        child.parentContributionMode ||
        "add-points";

      const weight =
        Math.max(
          0,
          hybridNumber_(
            child.parentContributionWeight,
            1
          )
        );

      let contribution = rawNetProfit;
      let potentialContribution = rawPotentialGain;

      if (mode === "weighted-points") {
        contribution *= weight;
        potentialContribution *= weight;
      }

      if (mode === "placement-points") {

        if (Array.isArray(placementPoints)) {
          contribution =
            hybridNumber_(
              placementPoints[placementRank - 1],
              0
            );
        } else {
          contribution =
            hybridNumber_(
              placementPoints[String(placementRank)],
              0
            );
        }

        potentialContribution = 0;

      }

      target.miniGameContributions.push({
        gameId: child.gameId,
        gameName: child.name,
        mode: mode,
        placementRank:
          mode === "placement-points"
            ? placementRank
            : 0,
        rawNetProfit: rawNetProfit,
        contribution: contribution,
        potentialContribution: potentialContribution
      });

      [
        "totalStaked",
        "pendingStake",
        "activeWagered",
        "pendingPotentialReturn",
        "payout",
        "wonBets",
        "lostBets",
        "refundedBets",
        "pendingBets",
        "totalBets"
      ].forEach(function(key) {
        target[key] += hybridNumber_(row[key], 0);
      });

    });

  });

  Object.keys(userMap).forEach(function(username) {

    const row = userMap[username];

    let contributions =
      row.miniGameContributions.slice();

    const bestCount =
      Math.max(
        0,
        Math.floor(
          hybridNumber_(
            parentGame.parentBestCount,
            0
          )
        )
      );

    if (bestCount > 0) {
      contributions = contributions
        .sort(function(a, b) {
          return b.contribution - a.contribution;
        })
        .slice(0, bestCount);
    }

    const childNet =
      contributions.reduce(function(sum, item) {
        return sum + hybridNumber_(item.contribution, 0);
      }, 0);

    const childPotential =
      contributions.reduce(function(sum, item) {
        return sum + hybridNumber_(item.potentialContribution, 0);
      }, 0);

    row.bankroll =
      Math.round(
        (
          parentStartingBankroll +
          row.ownNetProfit +
          childNet
        ) * 100
      ) / 100;

    row.maxBankroll =
      Math.round(
        (
          row.bankroll +
          row.ownPotentialGain +
          childPotential
        ) * 100
      ) / 100;

    row.miniGamesCounted =
      contributions.length;

    row.miniGameContributions =
      contributions;

    delete row.ownNetProfit;
    delete row.ownPotentialGain;

  });

  const rows =
    Object.keys(userMap)
      .map(function(username) {
        return userMap[username];
      });

  rows.sort(function(a, b) {

    if (b.bankroll !== a.bankroll) {
      return b.bankroll - a.bankroll;
    }

    if (b.maxBankroll !== a.maxBankroll) {
      return b.maxBankroll - a.maxBankroll;
    }

    return b.wonBets - a.wonBets;

  });

  if (rows.length) {

    const leaderBankroll = rows[0].bankroll;

    rows.forEach(function(row) {
      row.eliminated =
        row.maxBankroll < leaderBankroll;
    });

  }

  return rows;

}
