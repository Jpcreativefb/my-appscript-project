/* =========================
   ADMIN PREFLIGHT CHECKS
========================= */

function adminPreflightNormalize_(value) {

  return String(value || "")
    .trim();

}

function adminPreflightNormalizeId_(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function adminPreflightBool_(value) {

  return (
    value === true ||
    String(value)
      .trim()
      .toLowerCase() === "true"
  );

}


function adminPreflightGameType_(game) {

  const type =
    adminPreflightNormalizeId_(
      game && game.type
    ) || "prediction";

  return (type === "combo" || type === "hybrid")
    ? "mixed"
    : type;

}

function adminPreflightScoreMode_(category) {

  const settings =
    category && category.settings
      ? category.settings
      : {};

  const raw =
    adminPreflightNormalizeId_(
      settings.scoreMode ||
      category.scoreMode ||
      "correct-pick"
    )
      .replace(/_/g, "-");

  if (
    raw === "staked" ||
    raw === "stake" ||
    raw === "staked-points" ||
    raw === "confidence-stake"
  ) {
    return "staked-points";
  }

  if (
    raw === "wager" ||
    raw === "wager-odds" ||
    raw === "sports-wager"
  ) {
    return "wager";
  }

  if (
    raw === "ranking" ||
    raw === "ranked"
  ) {
    return "ranking";
  }

  if (
    raw === "confidence" ||
    raw === "confidence-points" ||
    raw === "confidence-pool"
  ) {
    return "confidence-points";
  }

  if (
    raw === "fixed" ||
    raw === "fixed-points" ||
    raw === "standard-points"
  ) {
    return "fixed-points";
  }

  return "correct-pick";

}

function adminPreflightQuestionType_(category) {

  const settings =
    category && category.settings
      ? category.settings
      : {};

  return adminPreflightNormalizeId_(
    settings.questionType ||
    category.questionType ||
    ""
  );

}

function adminPreflightIsPickMode_(mode) {

  return (
    mode === "correct-pick" ||
    mode === "fixed-points"
  );

}

function adminPreflightAddIssue_(
  issues,
  severity,
  message
) {

  issues.push({
    severity: severity,
    message: message
  });

}

function adminRunGamePreflight(payload) {

  const gameId =
    adminPreflightNormalize_(
      payload && payload.gameId
    );

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  const game =
    getGame(gameId);

  if (!game) {

    throw new Error(
      "Game not found: " + gameId
    );

  }

  const issues = [];

  /* =========================
     GAME CHECKS
  ========================= */

  if (!game.name) {

    adminPreflightAddIssue_(
      issues,
      "error",
      "Game is missing a name."
    );

  }

  if (!game.year) {

    adminPreflightAddIssue_(
      issues,
      "warning",
      "Game is missing a year."
    );

  }

  if (!game.type) {

    adminPreflightAddIssue_(
      issues,
      "warning",
      "Game is missing a type."
    );

  }

  if (!game.themeColor) {

    adminPreflightAddIssue_(
      issues,
      "warning",
      "Game is missing ThemeColor."
    );

  }

  if (
    game.archived === true &&
    game.active === true
  ) {

    adminPreflightAddIssue_(
      issues,
      "error",
      "Game cannot be both active and archived."
    );

  }

  if (
    game.defaultGame === true &&
    game.active !== true
  ) {

    adminPreflightAddIssue_(
      issues,
      "error",
      "Default game must also be active."
    );

  }

  if (
    game.defaultGame === true &&
    game.archived === true
  ) {

    adminPreflightAddIssue_(
      issues,
      "error",
      "Archived game cannot be the default game."
    );

  }

  /* =========================
     DEFAULT GAME CHECK
  ========================= */

  const games =
    getGames();

  const defaultGames =
    games.filter(g =>
      g.defaultGame === true
    );

  if (defaultGames.length === 0) {

    adminPreflightAddIssue_(
      issues,
      "warning",
      "No default game is currently set."
    );

  }

  if (defaultGames.length > 1) {

    adminPreflightAddIssue_(
      issues,
      "error",
      "More than one game is marked DefaultGame."
    );

  }

  /* =====================================================
     TEAM_FANTASY_V1218P_FAST_PREFLIGHT

     Team Fantasy is category-free by design. Do not call the generic
     adminGetGameSetup() loader for this game type; that loader scans the
     normal Categories/Question setup and can be slow enough to time out.
     Validate only Team Fantasy's saved settings + scoring rules here.
  ===================================================== */
  if (adminPreflightGameType_(game) === "team-fantasy") {
    if (typeof teamFantasyPreflightIssues_ !== "function") {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Team Fantasy preflight validator is unavailable."
      );
    } else {
      const teamFantasyIssues =
        teamFantasyPreflightIssues_(gameId) || [];

      teamFantasyIssues.forEach(function(issue) {
        adminPreflightAddIssue_(
          issues,
          issue && issue.severity ? issue.severity : "warning",
          issue && issue.message
            ? issue.message
            : "Team Fantasy preflight reported an unspecified issue."
        );
      });
    }

    const teamFantasyStatus =
      adminPreflightNormalize_(game.status);
    const teamFantasyErrorCount =
      issues.filter(function(issue) {
        return issue.severity === "error";
      }).length;
    const teamFantasyWarningCount =
      issues.filter(function(issue) {
        return issue.severity === "warning";
      }).length;

    return {
      success: true,
      ready: teamFantasyErrorCount === 0,
      gameId: gameId,
      gameType: "team-fantasy",
      status: teamFantasyStatus || "",
      realityTvManaged: false,
      canRepairRealityTv: false,
      categoryModeCounts: {
        picks: 0,
        confidence: 0,
        staked: 0,
        wagers: 0,
        rankings: 0
      },
      errorCount: teamFantasyErrorCount,
      warningCount: teamFantasyWarningCount,
      issueCount: issues.length,
      issues: issues,
      fastPath: true
    };
  }

  /* =========================
     SETUP CHECKS
  ========================= */

  const setup =
    adminGetGameSetup({
      gameId: gameId
    });

  const categories =
    Array.isArray(setup.categories)
      ? setup.categories
      : [];

  const gameType =
    adminPreflightGameType_(game);

  const gameRole =
    adminPreflightNormalizeId_(
      game.gameRole || "standalone"
    );

  const hubMode =
    adminPreflightNormalizeId_(
      game.hubMode || "playable-aggregate"
    );

  const leaderboardOnlyParent =
    gameRole === "parent" &&
    hubMode === "leaderboard-only";

  const activeCategories =
    categories.filter(function(category) {
      return category && category.active !== false;
    });

  if (!categories.length && !leaderboardOnlyParent && gameType !== "team-fantasy") {

    adminPreflightAddIssue_(
      issues,
      "error",
      "Game has no categories/questions."
    );

  }

  /* TEAM FANTASY v1.2.18j PREFLIGHT */
  if (gameType === "team-fantasy" && typeof teamFantasyPreflightIssues_ === "function") {
    teamFantasyPreflightIssues_(gameId).forEach(function(issue) {
      adminPreflightAddIssue_(issues, issue.severity || "warning", issue.message || "Team Fantasy readiness issue.");
    });
  }

  if (leaderboardOnlyParent) {

    const childGames =
      games.filter(function(candidate) {
        return (
          candidate &&
          adminPreflightNormalizeId_(candidate.gameRole) === "mini" &&
          adminPreflightNormalizeId_(candidate.parentGameId) ===
            adminPreflightNormalizeId_(gameId)
        );
      });

    if (!childGames.length) {
      adminPreflightAddIssue_(
        issues,
        "warning",
        "Leaderboard-only parent game has no connected mini games yet."
      );
    }

  }

  /* =========================
     GAME-TYPE CHECKS
  ========================= */

  if (
    [
      "prediction",
      "head-to-head",
      "confidence",
      "staked-prediction",
      "survivor"
    ].indexOf(gameType) !== -1 &&
    game.predictionEnabled !== true
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "This game type requires Predictions to be enabled."
    );
  }

  if (
    gameType === "confidence" &&
    game.confidenceEnabled !== true
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "Confidence Pool requires ConfidenceEnabled."
    );
  }

  if (gameType === "staked-prediction") {

    if (game.stakedPointsEnabled !== true) {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Staked Prediction requires StakedPointsEnabled."
      );
    }

    const minStake = Number(game.minStake) || 0;
    const maxStake = Number(game.maxStake) || 0;
    const increment = Number(game.stakeIncrement) || 0;

    if (
      minStake < 1 ||
      maxStake < minStake ||
      increment < 1 ||
      (maxStake - minStake) % increment !== 0
    ) {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Staked Prediction limits are invalid. Check minimum, maximum, and stake increment."
      );
    }

  }

  if (
    ["wager", "racing-wager"].indexOf(gameType) !== -1 &&
    game.wagerEnabled !== true
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "This wager game type requires WagerEnabled."
    );
  }

  if (
    gameType === "ranking" &&
    game.rankingEnabled !== true
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "Ranking Game requires RankingEnabled."
    );
  }

  if (gameType === "mixed") {

    const hasPlayableFeature =
      game.predictionEnabled === true ||
      game.confidenceEnabled === true ||
      game.stakedPointsEnabled === true ||
      game.wagerEnabled === true;

    if (!hasPlayableFeature) {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Hybrid Game must enable at least one playable section: Predictions, Confidence, Staked Points, or Wagers."
      );
    }

    if (
      adminPreflightNormalizeId_(game.type) === "combo"
    ) {
      adminPreflightAddIssue_(
        issues,
        "warning",
        "Combo is a legacy alias. Save this game as Hybrid/Mixed when convenient; existing Combo games remain supported."
      );
    }

  }

  const displayOrders = {};
  const categoryIds = {};
  const categoryModeCounts = {
    picks: 0,
    confidence: 0,
    staked: 0,
    wagers: 0,
    rankings: 0
  };

  categories.forEach(category => {

    const categoryId =
      adminPreflightNormalizeId_(
        category.categoryId
      );

    const categoryName =
      adminPreflightNormalize_(
        category.category ||
        category.categoryId
      );

    if (!categoryId) {

      adminPreflightAddIssue_(
        issues,
        "error",
        "A category is missing CategoryId."
      );

      return;

    }

    if (categoryIds[categoryId]) {

      adminPreflightAddIssue_(
        issues,
        "error",
        "Duplicate categoryId found: " +
        categoryId
      );

    }

    categoryIds[categoryId] = true;

    if (!categoryName) {

      adminPreflightAddIssue_(
        issues,
        "error",
        "Category " + categoryId + " is missing a name."
      );

    }

    const settings =
      category.settings || {};

    if (
      settings.points === undefined ||
      settings.points === null ||
      settings.points === ""
    ) {

      adminPreflightAddIssue_(
        issues,
        "warning",
        categoryName + " has no points value."
      );

    }

    const order =
      Number(settings.displayOrder) || 999;

    if (!displayOrders[order]) {
      displayOrders[order] = [];
    }

    displayOrders[order].push(categoryName);

    const nominees =
      Array.isArray(category.nominees)
        ? category.nominees
        : [];

    const activeNominees =
      nominees.filter(n =>
        n.active !== false
      );

    const scoreMode =
      adminPreflightScoreMode_(category);

    const questionType =
      adminPreflightQuestionType_(category);

    if (category.active !== false) {

      if (adminPreflightIsPickMode_(scoreMode)) {
        categoryModeCounts.picks++;
      } else if (scoreMode === "confidence-points") {
        categoryModeCounts.confidence++;
      } else if (scoreMode === "staked-points") {
        categoryModeCounts.staked++;
      } else if (scoreMode === "wager") {
        categoryModeCounts.wagers++;
      } else if (scoreMode === "ranking") {
        categoryModeCounts.rankings++;
      }

      if (
        gameType === "head-to-head" &&
        activeNominees.length !== 2
      ) {
        adminPreflightAddIssue_(
          issues,
          "error",
          categoryName + " must have exactly 2 active choices for a Head-to-Head game."
        );
      }

      if (
        activeNominees.length === 1 &&
        scoreMode !== "ranking"
      ) {
        adminPreflightAddIssue_(
          issues,
          "warning",
          categoryName + " has only one active choice."
        );
      }

      const settings = category.settings || {};
      const sourceType = adminPreflightNormalizeId_(
        settings.resultSource ||
        settings.scoringEngine ||
        ""
      );

      if (
        sourceType.indexOf("sports") !== -1 &&
        !adminPreflightNormalize_(
          settings.sportsGameId ||
          settings.espnEventId ||
          settings.externalEventId
        )
      ) {
        adminPreflightAddIssue_(
          issues,
          "warning",
          categoryName + " uses a sports result source but has no SportsGameId, ESPNEventId, or ExternalEventId."
        );
      }

      if (
        scoreMode === "wager" &&
        questionType === ""
      ) {
        adminPreflightAddIssue_(
          issues,
          "warning",
          categoryName + " is a wager question but QuestionType is blank."
        );
      }

    }

    if (
      category.active !== false &&
      activeNominees.length === 0
    ) {

      adminPreflightAddIssue_(
        issues,
        "error",
        categoryName + " has no active nominees/answers."
      );

    }

    const nomineeIds = {};

    activeNominees.forEach(nominee => {

      const nomineeId =
        adminPreflightNormalizeId_(
          nominee.nomineeId
        );

      if (!nomineeId) {

        adminPreflightAddIssue_(
          issues,
          "error",
          categoryName + " has a nominee missing NomineeId."
        );

        return;

      }

      if (nomineeIds[nomineeId]) {

        adminPreflightAddIssue_(
          issues,
          "error",
          categoryName + " has duplicate nomineeId: " +
          nomineeId
        );

      }

      nomineeIds[nomineeId] = true;

      if (!adminPreflightNormalize_(nominee.nominee)) {

        adminPreflightAddIssue_(
          issues,
          "error",
          categoryName + " has a nominee missing a name."
        );

      }

    });

    if (
      game.status === "Draft" &&
      settings.winnerNomineeId
    ) {

      adminPreflightAddIssue_(
        issues,
        "warning",
        categoryName + " has WinnerNomineeId filled while game is Draft."
      );

    }

    if (
      game.status === "Draft" &&
      settings.favoriteNomineeId
    ) {

      adminPreflightAddIssue_(
        issues,
        "warning",
        categoryName + " has FavoriteNomineeId filled while game is Draft."
      );

    }

  });

  /* =========================
     TYPE-TO-QUESTION MATCHING
  ========================= */

  if (
    ["prediction", "head-to-head"].indexOf(gameType) !== -1 &&
    activeCategories.length &&
    categoryModeCounts.picks === 0
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "This prediction game has no active standard or fixed-point questions."
    );
  }

  if (
    gameType === "staked-prediction" &&
    categoryModeCounts.staked === 0
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "Staked Prediction has no active question using ScoreMode staked-points."
    );
  }

  if (
    ["wager", "racing-wager"].indexOf(gameType) !== -1 &&
    categoryModeCounts.wagers === 0
  ) {
    adminPreflightAddIssue_(
      issues,
      "error",
      "Wager game has no active question using ScoreMode wager."
    );
  }

  if (gameType === "ranking" && categoryModeCounts.rankings === 0) {
    adminPreflightAddIssue_(issues, "error", "Ranking games need at least one active ranking question.");
  }

  if (gameType === "ranking" && categoryModeCounts.rankings > 0 && categoryModeCounts.rankings !== activeCategories.length) {
    adminPreflightAddIssue_(issues, "error", "Every active question in a Ranking game must use Ranking score mode.");
  }

  if (gameType === "survivor" && activeCategories.length < 2) {
    const survivorMode = typeof survivorGetSettings_ === "function"
      ? String((survivorGetSettings_(gameId) || {}).mode || "manual-elimination").trim().toLowerCase()
      : "manual-elimination";
    if (survivorMode === "manual-elimination") {
      adminPreflightAddIssue_(issues, "warning", "Manual Survivor works best with two or more ordered rounds/questions.");
    }
  }

  if (gameType === "mixed") {

    if (
      game.stakedPointsEnabled === true &&
      categoryModeCounts.staked === 0
    ) {
      adminPreflightAddIssue_(
        issues,
        "warning",
        "Staked Points is enabled, but the Hybrid game has no staked-points questions."
      );
    }

    if (
      game.wagerEnabled === true &&
      categoryModeCounts.wagers === 0
    ) {
      adminPreflightAddIssue_(
        issues,
        "warning",
        "Wagers is enabled, but the Hybrid game has no wager questions."
      );
    }

    if (
      game.confidenceEnabled === true &&
      categoryModeCounts.confidence === 0
    ) {
      adminPreflightAddIssue_(
        issues,
        "warning",
        "Confidence is enabled, but the Hybrid game has no confidence-points questions."
      );
    }

    if (categoryModeCounts.rankings > 0) {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Hybrid games cannot publish Ranking questions in the combined leaderboard yet. Use a standalone Ranking game for ordered ballots."
      );
    } else if (game.rankingEnabled === true) {
      adminPreflightAddIssue_(
        issues,
        "warning",
        "Ranking is enabled but no ranking questions exist."
      );
    }

    if (
      categoryModeCounts.picks +
      categoryModeCounts.confidence +
      categoryModeCounts.staked +
      categoryModeCounts.wagers === 0 &&
      activeCategories.length
    ) {
      adminPreflightAddIssue_(
        issues,
        "error",
        "Hybrid game has no currently playable question modes."
      );
    }

  }

  Object.keys(displayOrders)
    .forEach(order => {

      if (displayOrders[order].length > 1) {

        adminPreflightAddIssue_(
          issues,
          "warning",
          "DisplayOrder " +
          order +
          " is used by multiple categories: " +
          displayOrders[order].join(", ")
        );

      }

    });

  /* =========================
     STATUS / LOCK CHECKS
  ========================= */

  const status =
    adminPreflightNormalize_(
      game.status
    );

  if (
    status === "Draft" ||
    status === "Setup" ||
    status === "Preview"
  ) {

    if (game.lockAllPicks !== true) {

      adminPreflightAddIssue_(
        issues,
        "warning",
        status + " games should have VotingLocked true."
      );

    }

  }

  if (status === "Active") {

    if (
      game.predictionEnabled === true &&
      game.lockAllPicks === true
    ) {

      adminPreflightAddIssue_(
        issues,
        "warning",
        "Active game has predictions enabled but VotingLocked is true."
      );

    }

  }

  const errorCount =
    issues.filter(i =>
      i.severity === "error"
    ).length;

  const warningCount =
    issues.filter(i =>
      i.severity === "warning"
    ).length;

  let realityTvManaged = false;
  try {
    realityTvManaged = typeof realityTvGetSeasonByGameId_ === "function" && !!realityTvGetSeasonByGameId_(gameId);
  } catch (realityTvCheckError) {
    realityTvManaged = false;
  }

  return {
    success: true,
    ready: errorCount === 0,
    gameId: gameId,
    gameType: gameType,
    status: status || "",
    realityTvManaged: realityTvManaged,
    canRepairRealityTv: realityTvManaged && errorCount > 0,
    categoryModeCounts: categoryModeCounts,
    errorCount: errorCount,
    warningCount: warningCount,
    issueCount: issues.length,
    issues: issues
  };

}