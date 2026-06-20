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

  if (!categories.length) {

    adminPreflightAddIssue_(
      issues,
      "error",
      "Game has no categories/questions."
    );

  }

  const displayOrders = {};
  const categoryIds = {};

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

  return {
    success: true,
    ready: errorCount === 0,
    gameId: gameId,
    status: status || "",
    errorCount: errorCount,
    warningCount: warningCount,
    issueCount: issues.length,
    issues: issues
  };

}