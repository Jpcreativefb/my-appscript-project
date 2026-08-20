/* =========================================================
   STARTUP PAYLOAD
   One-call dashboard/home app payload
========================================================= */

function apiGetStartupPayload(payload) {

  payload =
    payload || {};

  const username =
    String(payload.username || "")
      .trim();

  const token =
    String(payload.token || "")
      .trim();

  const gameId =
    normalizeGameId_(
      payload.gameId ||
      getDefaultGameId()
    );

  if (!username) {
    throw new Error("Missing username");
  }

  if (!token) {
    throw new Error("Missing token");
  }

  validateGameId(gameId);

  validateUserSession_(
    username,
    token
  );

  requireGameFeatureAccess_(
    username,
    gameId,
    "viewGame",
    payload.leagueId || ""
  );

  const game =
    getGame(gameId);

  let categories =
    typeof getCategoriesCached === "function"
      ? getCategoriesCached(gameId)
      : getCategories(gameId);

  if (
    typeof externalResultsBridgeEnrichCategoriesWithLiveProbabilities_ === "function"
  ) {
    categories =
      externalResultsBridgeEnrichCategoriesWithLiveProbabilities_(
        gameId,
        categories
      );
  }

  const picks =
    apiGetMyPicks(
      username,
      gameId
    );

  const realityTvView =
    typeof realityTvUserGameViewPayload_ === "function"
      ? realityTvUserGameViewPayload_(gameId, username, { includePlayerStats: false })
      : { enabled: false };

  // CategorySettings has room for one WinnerNomineeId, but Reality TV
  // questions can settle with multiple valid winners.  For Reality TV Picks
  // only, merge the authoritative CategoryResults resolution into the
  // category payload so historical episodes can display every result without
  // adding a CategoryResults read to Sports/Awards/other game startup paths.
  if (
    realityTvView &&
    realityTvView.enabled === true &&
    typeof getCategoryResultsResolutionMap === "function"
  ) {
    const resultResolutions = getCategoryResultsResolutionMap(gameId) || {};
    categories = (categories || []).map(function(category) {
      const categoryId = String(category && category.id || "").trim().toLowerCase();
      const resolution = resultResolutions[categoryId] || null;
      const copy = Object.assign({}, category);
      if (resolution && resolution.resolved === true) {
        copy.winnerNomineeId = resolution.winnerNomineeId || copy.winnerNomineeId || "";
        copy.winnerNomineeIds = Array.isArray(resolution.winnerNomineeIds)
          ? resolution.winnerNomineeIds.slice()
          : (copy.winnerNomineeId ? [copy.winnerNomineeId] : []);
        copy.resultStatus = String(resolution.result || resolution.status || "settled");
        copy.resultResolved = true;
      } else {
        copy.winnerNomineeIds = copy.winnerNomineeId ? [copy.winnerNomineeId] : [];
        copy.resultResolved = false;
      }
      return copy;
    });
  }

  return {
    success: true,

    optimized:
      true,

    payloadType:
      "picks_lite_v1",

    gameId:
      gameId,

    game:
      game,

    username:
      username,

    categories:
      categories,

    picks:
      picks,

    // Optional Reality TV enhancements are deliberately deferred so the
    // core Picks page can render before leaderboard, Survivor history, and
    // other cross-sheet calculations finish.
    seasonAnchor: {
      enabled: false,
      // Only Reality TV games can have the pinned Season Survivor feature.
      // Non-Reality games must not render a misleading deferred placeholder.
      deferred: !!(
        realityTvView &&
        realityTvView.enabled === true &&
        typeof seasonAnchorUserPayload_ === "function"
      )
    },

    realityTvView:
      realityTvView
  };

}

/* =========================
   SESSION VALIDATION
========================= */

function validateUserSession_(
  username,
  token
) {

  username =
    String(username || "")
      .trim();

  token =
    String(token || "")
      .trim();

  if (!username || !token) {
    throw new Error(
      "Session expired. Please log in again."
    );
  }

  const sessionUsername =
    typeof getUsernameFromSessionToken_ === "function"
      ? getUsernameFromSessionToken_(token)
      : "";

  if (!sessionUsername) {
    throw new Error(
      "Session expired. Please log in again."
    );
  }

  if (
    String(sessionUsername)
      .trim()
      .toLowerCase() !==
    username.toLowerCase()
  ) {
    throw new Error(
      "Invalid session"
    );
  }

  return true;

}

/* =========================================================
   DASHBOARD GAMES HUB
   Active games + past games for the logged-in user
========================================================= */

function apiGetDashboardGamesHub(payload) {

  payload =
    payload || {};

  const username =
    String(payload.username || "")
      .trim();

  const token =
    String(payload.token || "")
      .trim();

  if (!username) {
    throw new Error("Missing username");
  }

  if (!token) {
    throw new Error("Missing token");
  }

  validateUserSession_(
    username,
    token
  );

  const games =
    typeof filterGamesForUser_ === "function"
      ? filterGamesForUser_(
          getGames(),
          username
        )
      : getGames();

  const activeGames = [];
  const pastGames = [];

  // Home used to calculate category/pick/wager progress separately for every
  // game card.  As the archive grew this created an N x games sheet-read
  // pattern and made the initial Dashboard much slower than opening a game.
  // Build one compact progress snapshot for active games only.  Past games are
  // archive cards and do not need live completion counts during Home startup.
  const activeGameIdsForProgress = games
    .filter(function(game) {
      return game && game.gameId && game.active === true && isDashboardPastGame_(game) !== true;
    })
    .map(function(game) {
      return String(game.gameId || "").trim();
    })
    .filter(Boolean);

  const dashboardProgressContext =
    buildDashboardProgressContext_(
      username,
      activeGameIdsForProgress
    );

  games.forEach(game => {

    if (!game || !game.gameId) {
      return;
    }

    const isPast =
      isDashboardPastGame_(game);

    if (
      game.active === true &&
      isPast !== true
    ) {

      activeGames.push(
        buildDashboardGameHubItemLite_(
          game,
          username,
          false,
          dashboardProgressContext
        )
      );

      return;

    }

    if (isPast) {

      pastGames.push(
        buildDashboardGameHubItemLite_(
          game,
          username,
          true,
          dashboardProgressContext
        )
      );

    }

  });

  const defaultGameId =
    getDefaultGameId();

  const profileGameId =
    activeGames.length
      ? activeGames[0].gameId
      : pastGames.length
        ? pastGames[0].gameId
        : defaultGameId;

  // Home's player card needs only the small general profile record. Keep it
  // inside this existing Dashboard request so the browser does not make a
  // second blocking network call just to render the avatar/name/note.
  let profile = {};
  let profileHistory = [];

  try {

    if (typeof apiGetEditableProfile === "function") {
      const profileResult = apiGetEditableProfile(username, "") || {};
      profile = profileResult.success === false
        ? {}
        : (profileResult.generalProfile || profileResult.profile || {});
    }

  } catch (err) {

    // Profile decoration must never prevent Home from opening.
    profile = {};

  }

  return {
    success: true,
    username: username,
    defaultGameId: defaultGameId,
    profileGameId: profileGameId,
    profile: profile,
    profileHistory: profileHistory,
    activeGames: activeGames,
    pastGames: pastGames
  };

}

function isDashboardPastGame_(game) {

  if (!game) {
    return false;
  }

  if (game.archived === true) {
    return true;
  }

  const status =
    String(game.status || "")
      .trim()
      .toLowerCase();

  return (
    status === "complete" ||
    status === "completed" ||
    status === "finished" ||
    status === "final" ||
    status === "finalized" ||
    status === "archived" ||
    status === "closed"
  );

}

function buildDashboardGameHubItemLite_(
  game,
  username,
  isPast,
  progressContext
) {

  game =
    game || {};

  const mode =
    getDashboardGameMode_(game);

  const availability =
    getDashboardAvailability_(
      game,
      isPast
    );

  const isSeasonHub =
    game.gameRole === "parent";

  const progress =
    getDashboardGameProgressLite_(
      game,
      username,
      mode,
      {
        // Archive cards do not need live progress and season hubs own their
        // progress inside the season view.  Skipping both keeps Home startup
        // independent from the number of historical games.
        suppressProgress: isSeasonHub || isPast === true,
        progressContext: progressContext || null
      }
    );

  const lockLabel =
    availability.statusLabel ||
    String(
      game.lockLabel ||
      game.lockTimeLabel ||
      game.eventTime ||
      ""
    ).trim() ||
    (
      game.lockAllPicks === true
        ? "Locked"
        : isPast
          ? "Finished"
          : "Open / Lock time TBD"
    );

  const enterLabel =
    availability.available === false
      ? availability.actionLabel
      : isSeasonHub
        ? "Open Season Hub"
        : getDashboardEnterLabel_(
            mode,
            progress,
            isPast
          );

  return {
    gameId:
      game.gameId,

    name:
      game.name || game.gameId,

    subtitle:
      getDashboardGameTypeLabel_(
        game,
        mode
      ),

    year:
      game.year || "",

    type:
      mode,

    rawType:
      game.type || "",

    typeLabel:
      getDashboardGameTypeLabel_(
        game,
        mode
      ),

    hubCategory:
      getDashboardHubPlacement_(game, mode).category,

    hubGroup:
      getDashboardHubPlacement_(game, mode).group,

    gameRole:
      game.gameRole || "standalone",

    hubMode:
      game.hubMode || "playable-aggregate",

    parentGameId:
      game.parentGameId || "",

    showMiniGameLinks:
      game.showMiniGameLinks !== false,

    includeParentQuestions:
      game.includeParentQuestions !== false,

    predictionEnabled:
      game.predictionEnabled === true,

    fixedPointsEnabled:
      game.fixedPointsEnabled !== false,

    stakedPointsEnabled:
      game.stakedPointsEnabled === true,

    wagerEnabled:
      game.wagerEnabled === true,

    rankingEnabled:
      game.rankingEnabled === true,

    icon:
      "",

    status:
      game.status || "",

    statusLabel:
      lockLabel,

    lockLabel:
      lockLabel,

    description:
      getDashboardGameDescription_(
        game,
        mode
      ),

    themeColor:
      game.themeColor || "#354785",

    heroImageFileId:
      game.heroImageFileId || "",

    heroImage:
      game.heroImage || "",

    heroImagePosition:
      game.heroImagePosition || "center center",

    availableFrom:
      game.availableFrom || "",

    availableUntil:
      game.availableUntil || "",

    available:
      availability.available === true,

    availabilityLabel:
      availability.label || "",

    disableEnter:
      availability.available === false,

    active:
      game.active === true,

    archived:
      game.archived === true,

    isPast:
      isPast === true,

    hasStarted:
      Number(progress.madeCount) > 0,

    madeCount:
      Number(progress.madeCount) || 0,

    totalCount:
      Number(progress.totalCount) || 0,

    enterLabel:
      enterLabel,

    actionLabel:
      enterLabel,

    progressAvailable:
      progress.progressAvailable === true,

    progressLabel:
      progress.progressLabel,

    progressValue:
      Number(progress.progressValue) || 0,

    userSummary:
      progress.userSummary,

    userStats:
      [],

    leaderboardPreview:
      [],

    showLeaderboard:
      game.showLeaderboard !== false,

    leagueId:
      game.leagueId || "",

    leagueName:
      game.leagueName || "",

    leagueScoped:
      game.leagueScoped === true,

    leagues:
      Array.isArray(game.leagues)
        ? game.leagues
        : []
  };

}

function getDashboardGameProgressLite_(
  game,
  username,
  mode,
  options
) {

  game =
    game || {};

  options =
    options || {};

  const gameId =
    String(game.gameId || "").trim();

  const progressContext =
    options.progressContext || null;

  const progressGameKey =
    dashboardProgressGameKey_(gameId);

  const totalCategories =
    progressContext && progressContext.totalCategoriesByGame
      ? Number(progressContext.totalCategoriesByGame[progressGameKey] || 0)
      : getDashboardTotalCategories_(gameId);

  if (
    options.suppressProgress === true ||
    !gameId ||
    !totalCategories
  ) {

    return {
      madeCount: 0,
      totalCount: totalCategories,
      progressAvailable: false,
      progressLabel:
        options.suppressProgress === true
          ? "Open season hub to see episode progress"
          : "Open game to see progress",
      progressValue: 0,
      userSummary:
        options.suppressProgress === true
          ? "Season hub"
          : "Game ready",
      summary: {}
    };

  }

  const pickCategoryIds =
    progressContext && progressContext.pickCategoryIdsByGame
      ? (progressContext.pickCategoryIdsByGame[progressGameKey] || [])
      : getDashboardUserPickCategoryIdsDirect_(
          gameId,
          username
        );

  const betCategoryIds =
    progressContext && progressContext.betCategoryIdsByGame
      ? (progressContext.betCategoryIdsByGame[progressGameKey] || [])
      : getDashboardUserBetCategoryIdsDirect_(
          gameId,
          username
        );

  const pickCount =
    pickCategoryIds.length;

  const betCount =
    betCategoryIds.length;

  const normalizedMode =
    String(mode || "")
      .trim()
      .toLowerCase();

  let madeCount = 0;
  let noun = "pick";
  let userSummary = "Prediction picks";

  if (
    normalizedMode === "wager" ||
    normalizedMode === "racing-wager"
  ) {
    madeCount = betCount;
    noun = "wager";
    userSummary = "Wagers";
  } else if (
    normalizedMode === "hybrid" ||
    normalizedMode === "mixed" ||
    normalizedMode === "combo"
  ) {
    const completed = {};

    pickCategoryIds.forEach(function(categoryId) {
      completed[categoryId] = true;
    });

    betCategoryIds.forEach(function(categoryId) {
      completed[categoryId] = true;
    });

    madeCount =
      Object.keys(completed).length;

    noun = "selection";
    userSummary = "Hybrid picks & wagers";
  } else if (
    normalizedMode === "prediction" ||
    normalizedMode === "confidence" ||
    normalizedMode === "staked-prediction" ||
    normalizedMode === "head-to-head"
  ) {
    madeCount = pickCount;
    noun = "pick";
    userSummary =
      normalizedMode === "confidence"
        ? "Confidence picks"
        : normalizedMode === "staked-prediction"
          ? "Staked prediction picks"
          : normalizedMode === "head-to-head"
            ? "Head-to-head picks"
            : "Prediction picks";
  } else {
    return {
      madeCount: 0,
      totalCount: totalCategories,
      progressAvailable: false,
      progressLabel: "Open game to see progress",
      progressValue: 0,
      userSummary: "Game ready",
      summary: {}
    };
  }

  madeCount =
    Math.min(
      totalCategories,
      Math.max(0, madeCount)
    );

  const remaining =
    Math.max(
      0,
      totalCategories - madeCount
    );

  const progressValue =
    getDashboardProgressPercent_(
      madeCount,
      totalCategories
    );

  const pluralNoun =
    noun === "wager"
      ? "wagers"
      : noun === "selection"
        ? "selections"
        : "picks";

  const progressLabel =
    madeCount >= totalCategories
      ? "All " + totalCategories + " " + pluralNoun + " complete"
      : remaining +
        (remaining === 1
          ? " " + noun + " left"
          : " " + pluralNoun + " left") +
        " · " + madeCount + " / " + totalCategories + " complete";

  return {
    madeCount: madeCount,
    totalCount: totalCategories,
    progressAvailable: true,
    progressLabel: progressLabel,
    progressValue: progressValue,
    userSummary: userSummary,
    summary: {
      picksMade: pickCount,
      wagersMade: betCount,
      completedCount: madeCount,
      totalCategories: totalCategories
    }
  };

}

function dashboardProgressGameKey_(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function buildDashboardProgressContext_(
  username,
  gameIds
) {

  username = String(username || "").trim();

  const requestedGames = {};

  (Array.isArray(gameIds) ? gameIds : [])
    .forEach(function(gameId) {
      const key = dashboardProgressGameKey_(gameId);
      if (key) requestedGames[key] = true;
    });

  const context = {
    totalCategoriesByGame: {},
    pickCategoryIdsByGame: {},
    betCategoryIdsByGame: {}
  };

  const requestedKeys = Object.keys(requestedGames);

  requestedKeys.forEach(function(key) {
    context.totalCategoriesByGame[key] = 0;
    context.pickCategoryIdsByGame[key] = [];
    context.betCategoryIdsByGame[key] = [];
  });

  if (!requestedKeys.length) {
    return context;
  }

  buildDashboardCategoryTotalsIntoContext_(context, requestedGames);
  buildDashboardPickProgressIntoContext_(context, requestedGames, username);
  buildDashboardBetProgressIntoContext_(context, requestedGames, username);

  return context;

}

function buildDashboardCategoryTotalsIntoContext_(
  context,
  requestedGames
) {

  if (typeof getAllCategoriesData_ !== "function") {
    return;
  }

  try {

    const data = getAllCategoriesData_() || [];

    if (data.length <= 1) return;

    const headers = data[0].map(function(header) {
      return String(header || "").trim();
    });

    const col = getCategoriesColumnMap_(headers);
    validateCategoriesColumns_(col);

    const seenByGame = {};

    for (let i = 1; i < data.length; i++) {

      const row = data[i];
      const gameKey = dashboardProgressGameKey_(row[col.gameId]);

      if (!requestedGames[gameKey]) continue;

      const active =
        col.active > -1
          ? normalizeBoolean_(row[col.active])
          : true;

      if (!active) continue;

      const categoryName = String(row[col.category] || "").trim();
      const nomineeName = String(row[col.nominee] || "").trim();
      const categoryId = String(row[col.categoryId] || "").trim().toLowerCase();

      if (!categoryName || !nomineeName || !categoryId) continue;

      if (!seenByGame[gameKey]) seenByGame[gameKey] = {};
      seenByGame[gameKey][categoryId] = true;
    }

    Object.keys(seenByGame).forEach(function(gameKey) {
      context.totalCategoriesByGame[gameKey] =
        Object.keys(seenByGame[gameKey]).length;
    });

  } catch (err) {

    // Dashboard progress is helpful but must never prevent Home from loading.

  }

}

function buildDashboardPickProgressIntoContext_(
  context,
  requestedGames,
  username
) {

  if (typeof getAllPicksData_ !== "function") {
    return;
  }

  try {

    const data = getAllPicksData_() || [];

    if (data.length <= 1) return;

    const headers = data[0];
    const col = getPicksColumnMap_(headers);
    validatePickColumns_(col);

    const userKey = normalizeLower_(username);
    const latestByGame = {};

    for (let i = 1; i < data.length; i++) {

      const row = data[i];
      const gameKey = dashboardProgressGameKey_(row[col.gameId]);

      if (!requestedGames[gameKey]) continue;
      if (normalizeLower_(row[col.username]) !== userKey) continue;

      const categoryId = normalizeString_(row[col.category]);
      if (!categoryId) continue;

      const timestamp = new Date(row[col.lastUpdated] || row[col.timestamp]);

      if (!latestByGame[gameKey]) latestByGame[gameKey] = {};

      const existing = latestByGame[gameKey][categoryId];

      if (!existing || existing.timestamp < timestamp) {
        latestByGame[gameKey][categoryId] = {
          nomineeId: normalizeString_(row[col.nominee]),
          timestamp: timestamp
        };
      }
    }

    Object.keys(latestByGame).forEach(function(gameKey) {
      context.pickCategoryIdsByGame[gameKey] =
        Object.keys(latestByGame[gameKey])
          .filter(function(categoryId) {
            return !!latestByGame[gameKey][categoryId].nomineeId;
          });
    });

  } catch (err) {

    // Home still renders even if optional progress cannot be computed.

  }

}

function buildDashboardBetProgressIntoContext_(
  context,
  requestedGames,
  username
) {

  if (typeof getAllBetsData_ !== "function") {
    return;
  }

  try {

    const data = getAllBetsData_() || [];

    if (data.length <= 1) return;

    const headers = data[0].map(function(header) {
      return String(header || "").trim();
    });

    const col = getBetsColumnMap_(headers);
    validateBetsColumns_(col);

    const userKey = normalizeBetKey_(username);
    const latestByGame = {};

    for (let i = 1; i < data.length; i++) {

      const row = data[i];
      const gameKey = dashboardProgressGameKey_(row[col.gameId]);

      if (!requestedGames[gameKey]) continue;
      if (normalizeBetKey_(row[col.username]) !== userKey) continue;

      const categoryId = normalizeBetKey_(row[col.categoryId]);
      const nomineeId = normalizeBetKey_(row[col.nomineeId]);
      const betAmount = roundBetMoney_(row[col.betAmount]);

      if (!categoryId || !nomineeId || betAmount <= 0) continue;

      const timestamp = new Date(
        row[col.lastUpdated] ||
        row[col.timestamp] ||
        new Date()
      );

      if (!latestByGame[gameKey]) latestByGame[gameKey] = {};

      const existing = latestByGame[gameKey][categoryId];

      if (!existing || existing.timestamp < timestamp) {
        latestByGame[gameKey][categoryId] = {
          nomineeId: nomineeId,
          betAmount: betAmount,
          timestamp: timestamp
        };
      }
    }

    Object.keys(latestByGame).forEach(function(gameKey) {
      context.betCategoryIdsByGame[gameKey] =
        Object.keys(latestByGame[gameKey]);
    });

  } catch (err) {

    // Home still renders even if optional wager progress cannot be computed.

  }

}

function getDashboardUserPickCategoryIdsDirect_(
  gameId,
  username
) {

  if (
    typeof getUserPicks !== "function"
  ) {
    return [];
  }

  try {

    const picks =
      getUserPicks(
        username,
        gameId
      ) || [];

    const seen = {};

    (Array.isArray(picks) ? picks : [])
      .forEach(function(pick) {
        const categoryId =
          String(
            pick && pick.categoryId || ""
          )
            .trim()
            .toLowerCase();

        const nomineeId =
          String(
            pick && pick.nomineeId || ""
          ).trim();

        if (categoryId && nomineeId) {
          seen[categoryId] = true;
        }
      });

    return Object.keys(seen);

  } catch (err) {

    return [];

  }

}

function getDashboardUserBetCategoryIdsDirect_(
  gameId,
  username
) {

  if (
    typeof getUserBets !== "function"
  ) {
    return [];
  }

  try {

    const bets =
      getUserBets(
        username,
        gameId
      ) || [];

    const seen = {};

    (Array.isArray(bets) ? bets : [])
      .forEach(function(bet) {
        const categoryId =
          String(
            bet && bet.categoryId || ""
          )
            .trim()
            .toLowerCase();

        const nomineeId =
          String(
            bet && bet.nomineeId || ""
          ).trim();

        const betAmount =
          Number(
            bet && bet.betAmount
          ) || 0;

        if (
          categoryId &&
          nomineeId &&
          betAmount > 0
        ) {
          seen[categoryId] = true;
        }
      });

    return Object.keys(seen);

  } catch (err) {

    return [];

  }

}

function buildDashboardGameHubItem_(
  game,
  username,
  isPast
) {

  const mode =
    getDashboardGameMode_(game);

  const progress =
    getDashboardGameProgress_(
      game,
      username,
      mode
    );

  // Keep dashboard game cards intentionally light.
  // Full leaderboard/projection work is loaded only on the leaderboard page.
  const leaderboardPreview = [];
  const userLeaderboard = {};

  const userStats =
    getDashboardUserStats_(
      mode,
      progress,
      userLeaderboard
    );

  const hasStarted =
    Number(progress.madeCount) > 0;

  const availability =
    getDashboardAvailability_(
      game,
      isPast
    );

  const enterLabel =
    availability.available === false
      ? availability.actionLabel
      : getDashboardEnterLabel_(
          mode,
          progress,
          isPast
        );

  const lockLabel =
    availability.statusLabel ||
    getDashboardLockLabel_(
      game,
      isPast
    );

  return {
    gameId:
      game.gameId,

    name:
      game.name || game.gameId,

    subtitle:
      getDashboardGameTypeLabel_(
        game,
        mode
      ),

    year:
      game.year || "",

    type:
      mode,

    rawType:
      game.type || "",

    typeLabel:
      getDashboardGameTypeLabel_(
        game,
        mode
      ),

    hubCategory:
      getDashboardHubPlacement_(game, mode).category,

    hubGroup:
      getDashboardHubPlacement_(game, mode).group,

    gameRole:
      game.gameRole || "standalone",

    hubMode:
      game.hubMode || "playable-aggregate",

    parentGameId:
      game.parentGameId || "",

    showMiniGameLinks:
      game.showMiniGameLinks !== false,

    includeParentQuestions:
      game.includeParentQuestions !== false,

    predictionEnabled:
      game.predictionEnabled === true,

    fixedPointsEnabled:
      game.fixedPointsEnabled !== false,

    stakedPointsEnabled:
      game.stakedPointsEnabled === true,

    wagerEnabled:
      game.wagerEnabled === true,

    rankingEnabled:
      game.rankingEnabled === true,

    icon:
      "",

    status:
      game.status || "",

    statusLabel:
      lockLabel,

    lockLabel:
      lockLabel,

    description:
      getDashboardGameDescription_(
        game,
        mode
      ),

    themeColor:
      game.themeColor || "#354785",

    heroImageFileId:
      game.heroImageFileId || "",

    heroImage:
      game.heroImage || "",

    heroImagePosition:
      game.heroImagePosition || "center center",

    availableFrom:
      game.availableFrom || "",

    availableUntil:
      game.availableUntil || "",

    available:
      availability.available === true,

    availabilityLabel:
      availability.label || "",

    disableEnter:
      availability.available === false,

    active:
      game.active === true,

    archived:
      game.archived === true,

    isPast:
      isPast === true,

    hasStarted:
      hasStarted,

    madeCount:
      Number(progress.madeCount) || 0,

    totalCount:
      Number(progress.totalCount) || 0,

    enterLabel:
      enterLabel,

    actionLabel:
      enterLabel,

    progressLabel:
      progress.progressLabel,

    progressValue:
      progress.progressValue,

    userSummary:
      progress.userSummary,

    userStats:
      userStats,

    leaderboardPreview:
      leaderboardPreview,

    showLeaderboard:
      game.showLeaderboard !== false,

    leagueId:
      game.leagueId || "",

    leagueName:
      game.leagueName || "",

    leagueScoped:
      game.leagueScoped === true,

    leagues:
      Array.isArray(game.leagues)
        ? game.leagues
        : []
  };

}

function getDashboardGameMode_(game) {

  const type =
    String(game.type || "")
      .trim()
      .toLowerCase();

  /*
    The explicit Game Type must win before feature flags are inspected.
    Hybrid / Mixed games intentionally have WagerEnabled and PredictionEnabled
    at the same time. Looking at WagerEnabled first incorrectly turned them into
    plain Wager games and skipped the Game Sections chooser.
  */
  const explicitTypes = [
    "mixed",
    "hybrid",
    "combo",
    "wager",
    "betting",
    "racing-wager",
    "staked-prediction",
    "confidence",
    "head-to-head",
    "survivor",
    "ranking",
    "prediction"
  ];

  if (explicitTypes.indexOf(type) !== -1) {
    return type === "betting" ? "wager" : type;
  }

  /* Legacy rows without a recognized Type may still use feature flags. */
  if (
    game.wagerEnabled === true &&
    (
      game.predictionEnabled === true ||
      game.confidenceEnabled === true ||
      game.stakedPointsEnabled === true ||
      game.fixedPointsEnabled === true
    )
  ) {
    return "hybrid";
  }

  if (game.wagerEnabled === true) {
    return "wager";
  }

  if (game.stakedPointsEnabled === true) {
    return "staked-prediction";
  }

  if (game.confidenceEnabled === true) {
    return "confidence";
  }

  if (game.rankingEnabled === true) {
    return "ranking";
  }

  if (game.predictionEnabled === true) {
    return "prediction";
  }

  return "prediction";

}

function getDashboardHubPlacement_(game, mode) {

  game = game || {};

  const name = String(game.name || game.gameId || "").trim();
  const haystack = [
    name,
    game.gameId || "",
    game.type || "",
    game.typeLabel || "",
    game.description || "",
    game.racingLeague || ""
  ].join(" ").toLowerCase();

  function hasAny_(values) {
    return values.some(function(value) {
      return haystack.indexOf(value) !== -1;
    });
  }

  const sportsGroups = [
    ["NFL", ["nfl", "football"]],
    ["MLB", ["mlb", "baseball"]],
    ["NBA", ["nba", "basketball"]],
    ["NHL", ["nhl", "hockey"]],
    ["NCAA", ["ncaa", "college football", "college basketball"]],
    ["NASCAR", ["nascar", "cup series", "xfinity", "truck series"]],
    ["Formula 1", ["formula 1", "formula one", " f1 "]],
    ["Soccer", ["soccer", "premier league", "mls", "champions league"]]
  ];

  for (let i = 0; i < sportsGroups.length; i++) {
    if (hasAny_(sportsGroups[i][1])) {
      return { category: "sports", group: sportsGroups[i][0] };
    }
  }

  if (
    mode === "racing-wager" ||
    String(game.racingLeague || "").trim()
  ) {
    return {
      category: "sports",
      group: String(game.racingLeague || "Racing").trim() || "Racing"
    };
  }

  const realityGroups = [
    ["Survivor", ["survivor"]],
    ["MasterChef", ["masterchef"]],
    ["Top Chef", ["top chef"]],
    ["The Traitors", ["traitors"]],
    ["The Amazing Race", ["amazing race"]],
    ["Dancing with the Stars", ["dancing with the stars", "dwts"]],
    ["Big Brother", ["big brother"]]
  ];

  for (let i = 0; i < realityGroups.length; i++) {
    if (hasAny_(realityGroups[i][1])) {
      return { category: "reality", group: realityGroups[i][0] };
    }
  }

  if (hasAny_(["reality tv", "reality-tv", "episode", "tribal council"])) {
    return { category: "reality", group: "Other Reality" };
  }

  const awardGroups = [
    ["Oscars", ["oscar", "academy awards"]],
    ["Emmys", ["emmy"]],
    ["Grammys", ["grammy"]],
    ["Golden Globes", ["golden globe"]],
    ["Tony Awards", ["tony award"]]
  ];

  for (let i = 0; i < awardGroups.length; i++) {
    if (hasAny_(awardGroups[i][1])) {
      return { category: "awards", group: awardGroups[i][0] };
    }
  }

  if (hasAny_(["awards", "award show", "ceremony"])) {
    return { category: "awards", group: "Other Awards" };
  }

  // Confidence/head-to-head games are overwhelmingly sports in this app, but
  // only classify them as Sports when the name/description identifies a sport.
  if (
    (mode === "confidence" || mode === "head-to-head" || mode === "wager") &&
    hasAny_(["week ", "season", "spread", "moneyline", "touchdown", "home team", "away team"])
  ) {
    return { category: "sports", group: "Other Sports" };
  }

  return {
    category: "general",
    group: getDashboardGameTypeLabel_(game, mode) || "General Games"
  };

}

function getDashboardGameTypeLabel_(
  game,
  mode
) {

  if (game.typeLabel) {
    return game.typeLabel;
  }

  if (
    mode === "mixed" ||
    mode === "hybrid" ||
    mode === "combo"
  ) {
    return "Hybrid Game";
  }

  if (mode === "wager") {
    return "Wager / Chips Game";
  }

  if (mode === "racing-wager") {
    return "Racing Wager Game";
  }

  if (mode === "staked-prediction") {
    return "Staked Prediction Game";
  }

  if (mode === "confidence") {
    return "Confidence Game";
  }

  if (mode === "head-to-head") {
    return "Head-to-Head Game";
  }

  if (mode === "survivor") {
    return "Survivor Game";
  }

  if (mode === "ranking") {
    return "Ranking Game";
  }

  return "Prediction Game";

}

function getDashboardAvailability_(
  game,
  isPast
) {

  if (isPast) {

    return {
      available: false,
      label: "Finished",
      statusLabel: "Finished",
      actionLabel: "View Results"
    };

  }

  const now =
    new Date();

  const availableFrom =
    parseDashboardDateTime_(
      game.availableFrom
    );

  const availableUntil =
    parseDashboardDateTime_(
      game.availableUntil
    );

  if (
    availableFrom &&
    now.getTime() < availableFrom.getTime()
  ) {

    const label =
      "Opens " +
      getDashboardDateLabel_(
        availableFrom
      );

    return {
      available: false,
      label: label,
      statusLabel: label,
      actionLabel: "Opens Soon"
    };

  }

  if (
    availableUntil &&
    now.getTime() > availableUntil.getTime()
  ) {

    const label =
      "Closed " +
      getDashboardDateLabel_(
        availableUntil
      );

    return {
      available: false,
      label: label,
      statusLabel: label,
      actionLabel: "Check Status"
    };

  }

  return {
    available: true,
    label: "",
    statusLabel: "",
    actionLabel: ""
  };

}

function parseDashboardDateTime_(value) {

  if (!value) {
    return null;
  }

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return value;
  }

  const raw =
    String(value || "")
      .trim();

  if (!raw) {
    return null;
  }

  const date =
    new Date(raw);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;

}

function getDashboardEnterLabel_(
  mode,
  progress,
  isPast
) {

  progress =
    progress || {};

  if (isPast) {
    return "View Results";
  }

  const made =
    Number(progress.madeCount) || 0;

  const total =
    Number(progress.totalCount) || 0;

  const complete =
    total > 0 && made >= total;

  if (made <= 0) {
    return "Play Now";
  }

  if (mode === "wager") {
    return complete
      ? "Review Wagers"
      : "Manage Wagers";
  }

  if (mode === "confidence") {
    return complete
      ? "View Confidence Picks"
      : "Continue Confidence Picks";
  }

  if (mode === "ranking") {
    return "Check Status";
  }

  return complete
    ? "View Picks"
    : "Continue Picks";

}

function getDashboardGameDescription_(
  game,
  mode
) {

  const description =
    String(
      game.description ||
      game.gameDescription ||
      ""
    ).trim();

  if (description) {
    return description;
  }

  if (mode === "wager") {
    return "Pick nominees or answers and wager chips. Your bankroll changes as results are entered.";
  }

  if (mode === "confidence") {
    return "Make picks and assign confidence values to the choices you feel strongest about.";
  }

  if (mode === "ranking") {
    return "Rank the available choices in order. Scoring is based on how close your order is to the final result.";
  }

  return "Make one pick per category before the game locks. Your score updates as winners are entered.";

}

function getDashboardLockLabel_(
  game,
  isPast
) {

  if (isPast) {
    return "Finished";
  }

  if (game.lockAllPicks === true) {
    return "Locked";
  }

  const customLabel =
    String(
      game.lockLabel ||
      game.lockTimeLabel ||
      game.eventTime ||
      ""
    ).trim();

  if (customLabel) {
    return customLabel;
  }

  const gameId =
    game.gameId;

  if (!gameId) {
    return "Lock time TBD";
  }

  try {

    const settings =
      getCategorySettings(
        gameId
      );

    const lockTimes =
      Object
        .keys(settings || {})
        .map(key =>
          settings[key] &&
          settings[key].lockDateTime
            ? new Date(settings[key].lockDateTime)
            : null
        )
        .filter(date =>
          date &&
          !isNaN(date.getTime())
        )
        .sort((a, b) =>
          a.getTime() - b.getTime()
        );

    if (!lockTimes.length) {
      return "Lock time TBD";
    }

    const first =
      lockTimes[0];

    const last =
      lockTimes[lockTimes.length - 1];

    const sameLock =
      first.getTime() === last.getTime();

    return sameLock
      ? "Locks " + getDashboardDateLabel_(first)
      : "Locks vary by category";

  } catch (err) {

    return "Lock time TBD";

  }

}

function getDashboardDateLabel_(date) {

  try {

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "MMM d, h:mm a"
    );

  } catch (err) {

    return date.toLocaleString();

  }

}

function getDashboardGameProgress_(
  game,
  username,
  mode
) {

  const gameId =
    game.gameId;

  const totalCategories =
    getDashboardTotalCategories_(
      gameId
    );

  if (mode === "wager") {

    return getDashboardWagerProgress_(
      gameId,
      username,
      totalCategories
    );

  }

  if (
    mode === "prediction" ||
    mode === "confidence"
  ) {

    return getDashboardPickProgress_(
      gameId,
      username,
      totalCategories,
      mode
    );

  }

  return {
    madeCount:
      0,
    totalCount:
      totalCategories,
    progressLabel:
      "Ready to play",
    progressValue:
      0,
    userSummary:
      "Game ready",
    summary:
      {}
  };

}

function getDashboardTotalCategories_(gameId) {

  try {

    const categories =
      getCategories(gameId) || [];

    return categories
      .filter(category =>
        category &&
        category.id
      )
      .length;

  } catch (err) {

    return 0;

  }

}

function getDashboardWagerProgress_(
  gameId,
  username,
  totalCategories
) {

  let summary = {};

  try {

    if (typeof getUserBettingSummary === "function") {
      summary =
        getUserBettingSummary(
          username,
          gameId
        ) || {};
    }

  } catch (err) {

    summary = {};

  }

  const directBetCount =
    getDashboardCountUserBetsDirect_(
      gameId,
      username
    );

  const totalBets =
    Math.max(
      Number(summary.totalBets) || 0,
      directBetCount
    );

  if (summary.totalBets === undefined) {
    summary.totalBets = totalBets;
  }

  const progressValue =
    getDashboardProgressPercent_(
      totalBets,
      totalCategories
    );

  const bankroll =
    summary.bankroll !== undefined
      ? summary.bankroll
      : summary.available !== undefined
        ? summary.available
        : "—";

  return {
    madeCount:
      totalBets,

    totalCount:
      totalCategories,

    progressLabel:
      totalCategories
        ? totalBets >= totalCategories
          ? "All " + totalCategories + " wagers placed"
          : (totalCategories - totalBets) +
            ((totalCategories - totalBets) === 1 ? " wager left" : " wagers left") +
            " · " + totalBets + " / " + totalCategories + " placed"
        : totalBets > 0
          ? totalBets + " wagers placed"
          : "No wagers placed yet",

    progressValue:
      progressValue,

    userSummary:
      bankroll === "—"
        ? "Wager game ready"
        : "Bankroll: " +
          getDashboardSafeNumber_(
            bankroll,
            0
          ) +
          " chips",

    summary:
      Object.assign(
        {},
        summary,
        {
          totalBets: totalBets
        }
      )
  };

}

function getDashboardPickProgress_(
  gameId,
  username,
  totalCategories,
  mode
) {

  const directPickCount =
    getDashboardCountUserPicksDirect_(
      gameId,
      username
    );

  let apiPickCount = 0;

  try {

    const picksRes =
      apiGetMyPicks(
        username,
        gameId
      );

    const picks =
      picksRes && picksRes.picks
        ? picksRes.picks
        : {};

    apiPickCount =
      Object.keys(picks)
        .filter(categoryId =>
          picks[categoryId]
        )
        .length;

  } catch (err) {

    apiPickCount = 0;

  }

  const picksMade =
    Math.max(
      directPickCount,
      apiPickCount
    );

  const progressValue =
    getDashboardProgressPercent_(
      picksMade,
      totalCategories
    );

  return {
    madeCount:
      picksMade,

    totalCount:
      totalCategories,

    progressLabel:
      totalCategories
        ? picksMade >= totalCategories
          ? "All " + totalCategories + " picks complete"
          : (totalCategories - picksMade) +
            ((totalCategories - picksMade) === 1 ? " pick left" : " picks left") +
            " · " + picksMade + " / " + totalCategories + " complete"
        : picksMade > 0
          ? picksMade + " picks made"
          : "No picks made yet",

    progressValue:
      progressValue,

    userSummary:
      mode === "confidence"
        ? "Confidence picks"
        : "Prediction picks",

    summary:
      {
        picksMade: picksMade,
        totalCategories: totalCategories
      }
  };

}

function getDashboardCountUserBetsDirect_(
  gameId,
  username
) {

  if (
    typeof getUserBets === "function"
  ) {

    try {

      const bets =
        getUserBets(
          username,
          gameId
        ) || [];

      return Array.isArray(bets)
        ? bets.length
        : 0;

    } catch (err) {}

  }

  try {

    const sh =
      SpreadsheetApp
        .getActive()
        .getSheetByName("Bets");

    if (!sh) {
      return 0;
    }

    const data =
      sh.getDataRange()
        .getValues();

    if (data.length <= 1) {
      return 0;
    }

    const headers =
      data[0].map(h =>
        String(h || "").trim()
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
      betAmount:
        headers.indexOf("BetAmount")
    };

    if (
      col.gameId === -1 ||
      col.username === -1 ||
      col.categoryId === -1
    ) {
      return 0;
    }

    const targetGameId =
      String(gameId || "").trim();

    const targetUsername =
      String(username || "")
        .trim()
        .toLowerCase();

    const categories = {};

    for (let i = 1; i < data.length; i++) {

      const row =
        data[i];

      if (
        String(row[col.gameId] || "").trim() !==
        targetGameId
      ) {
        continue;
      }

      if (
        String(row[col.username] || "")
          .trim()
          .toLowerCase() !==
        targetUsername
      ) {
        continue;
      }

      const categoryId =
        String(row[col.categoryId] || "")
          .trim()
          .toLowerCase();

      const nomineeId =
        col.nomineeId > -1
          ? String(row[col.nomineeId] || "").trim()
          : "";

      const betAmount =
        col.betAmount > -1
          ? Number(row[col.betAmount]) || 0
          : 1;

      if (
        categoryId &&
        nomineeId &&
        betAmount > 0
      ) {
        categories[categoryId] = true;
      }

    }

    return Object.keys(categories).length;

  } catch (err) {

    return 0;

  }

}

function getDashboardCountUserPicksDirect_(
  gameId,
  username
) {

  if (
    typeof getUserPicks === "function"
  ) {

    try {

      const picks =
        getUserPicks(
          username,
          gameId
        ) || [];

      return Array.isArray(picks)
        ? picks.length
        : 0;

    } catch (err) {}

  }

  return 0;

}

function getDashboardProgressPercent_(
  made,
  total
) {

  made = Number(made) || 0;
  total = Number(total) || 0;

  if (total <= 0) {
    return made > 0
      ? 100
      : 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (made / total) * 100
      )
    )
  );

}

function getDashboardUserStats_(
  mode,
  progress,
  userLeaderboard
) {

  progress =
    progress || {};

  userLeaderboard =
    userLeaderboard || {};

  const stats = [];

  const summary =
    progress.summary || {};

  if (mode === "wager") {

    stats.push({
      label: "Bankroll",
      value:
        summary.bankroll !== undefined
          ? getDashboardSafeNumber_(
              summary.bankroll,
              0
            ) + " chips"
          : "—"
    });

    stats.push({
      label: "Wagers",
      value:
        getDashboardSafeNumber_(
          progress.madeCount,
          0
        )
    });

    stats.push({
      label: "Pending",
      value:
        getDashboardSafeNumber_(
          summary.pendingBets,
          0
        )
    });

    stats.push({
      label: "Rank",
      value:
        userLeaderboard.rank
          ? "#" + userLeaderboard.rank
          : "—"
    });

    return stats;

  }

  stats.push({
    label:
      mode === "confidence"
        ? "Confidence Picks"
        : "Picks",
    value:
      progress.totalCount
        ? progress.madeCount + " / " + progress.totalCount
        : progress.madeCount || 0
  });

  stats.push({
    label: "Score",
    value:
      userLeaderboard.score !== undefined
        ? userLeaderboard.score
        : "—"
  });

  stats.push({
    label: "Rank",
    value:
      userLeaderboard.rank
        ? "#" + userLeaderboard.rank
        : "—"
  });

  const madeCount = Number(progress.madeCount) || 0;
  const totalCount = Number(progress.totalCount) || 0;

  stats.push({
    label: "Status",
    value:
      totalCount > 0 && madeCount >= totalCount
        ? "Complete"
        : madeCount > 0
          ? "In Progress"
          : "Not Started"
  });

  return stats;

}

function getDashboardLeaderboardRows_(
  game,
  mode
) {

  const gameId =
    game.gameId;

  let rows = [];

  try {

    rows =
      mode === "wager" &&
      typeof getBettingLeaderboardData === "function"
        ? getBettingLeaderboardData(gameId)
        : getLeaderboardData(gameId);

  } catch (err) {

    rows = [];

  }

  if (!Array.isArray(rows)) {
    rows = rows.leaderboard || rows.rows || [];
  }

  return Array.isArray(rows)
    ? rows
    : [];

}

function getDashboardLeaderboardPreview_(
  game,
  mode,
  limit
) {

  return getDashboardLeaderboardPreviewFromRows_(
    game,
    mode,
    getDashboardLeaderboardRows_(
      game,
      mode
    ),
    limit
  );

}

function getDashboardLeaderboardPreviewFromRows_(
  game,
  mode,
  rows,
  limit
) {

  const gameId =
    game.gameId;

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  return rows
    .slice(0, limit || 5)
    .map((row, index) => {

      const username =
        row.user ||
        row.username ||
        row.Username ||
        "";

      let profile = {};

      if (username) {

        try {

          profile =
            getUserProfile(
              username,
              gameId
            ) || {};

        } catch (err) {

          profile = {};

        }

      }

      return {
        rank:
          row.rank || index + 1,

        username:
          username,

        displayName:
          row.displayName ||
          row.DisplayName ||
          profile.displayName ||
          profile.DisplayName ||
          username ||
          "Player",

        score:
          mode === "wager"
            ? getDashboardSafeNumber_(
                row.bankroll !== undefined
                  ? row.bankroll
                  : row.Bankroll,
                0
              )
            : getDashboardSafeNumber_(
                row.total !== undefined
                  ? row.total
                  : row.totalScore !== undefined
                    ? row.totalScore
                    : row.score !== undefined
                      ? row.score
                      : row.Score,
                0
              ),

        scoreLabel:
          mode === "wager"
            ? "Bankroll"
            : "Score"
      };

    });

}

function getDashboardUserLeaderboardInfoFromRows_(
  game,
  mode,
  username,
  rows
) {

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  const normalizedUsername =
    String(username || "")
      .trim()
      .toLowerCase();

  for (let i = 0; i < rows.length; i++) {

    const row =
      rows[i] || {};

    const rowUsername =
      String(
        row.user ||
        row.username ||
        row.Username ||
        ""
      )
        .trim()
        .toLowerCase();

    if (rowUsername !== normalizedUsername) {
      continue;
    }

    return {
      rank:
        row.rank || i + 1,

      score:
        mode === "wager"
          ? getDashboardSafeNumber_(
              row.bankroll !== undefined
                ? row.bankroll
                : row.Bankroll,
              0
            )
          : getDashboardSafeNumber_(
              row.total !== undefined
                ? row.total
                : row.totalScore !== undefined
                  ? row.totalScore
                  : row.score !== undefined
                    ? row.score
                    : row.Score,
              0
            )
    };

  }

  return {};

}

function getDashboardSafeNumber_(
  value,
  fallback
) {

  const n =
    Number(value);

  if (
    value === "" ||
    value === null ||
    value === undefined ||
    isNaN(n) ||
    !isFinite(n)
  ) {
    return fallback;
  }

  return Math.round(n * 100) / 100;

}
