/* =========================================================
   STARTUP PAYLOAD
   One-call dashboard/home app payload
========================================================= */

function appStartupPayloadCacheKey_(username, gameId) {
  const userKey = String(username || "")
    .trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80);
  const gameKey = String(gameId || "")
    .trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 100);
  return userKey && gameKey ? "startup_payload_v1_" + userKey + "_" + gameKey : "";
}

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

  const startupCache = CacheService.getScriptCache();
  const startupCacheKey = appStartupPayloadCacheKey_(username, gameId);

  if (startupCacheKey) {
    try {
      const cachedStartup = startupCache.get(startupCacheKey);
      if (cachedStartup) {
        const parsedStartup = JSON.parse(cachedStartup);
        parsedStartup.cached = true;
        return parsedStartup;
      }
    } catch (cacheReadError) {}
  }

  const game =
    getGame(gameId);

  let categories =
    typeof getCategoriesCached === "function"
      ? getCategoriesCached(gameId)
      : getCategories(gameId);

  let liveProbabilitiesDeferred = false;

  // Do not block the core Picks payload opening a second spreadsheet just to
  // decorate Awards answers with live P/K probabilities. Reuse a warm lookup
  // when one exists; otherwise render the questions first and hydrate prices
  // with a separate non-blocking request from the browser.
  if (
    typeof externalResultsBridgeCategoryShowsLiveProbabilities_ === "function" &&
    Array.isArray(categories)
  ) {
    const needsExternalPrices = categories.some(function(category) {
      return externalResultsBridgeCategoryShowsLiveProbabilities_(category);
    });

    if (needsExternalPrices) {
      const cachedLookup =
        typeof externalResultsBridgeReadLiveProbabilityCache_ === "function"
          ? externalResultsBridgeReadLiveProbabilityCache_(gameId)
          : null;

      if (
        cachedLookup !== null &&
        typeof externalResultsBridgeApplyLiveProbabilityLookup_ === "function"
      ) {
        categories = externalResultsBridgeApplyLiveProbabilityLookup_(categories, cachedLookup);
      } else {
        liveProbabilitiesDeferred = true;
      }
    }
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

  // Spoiler Shield only changes the player-facing representation. Authoritative
  // CategoryResults remain settled and available to the scoring engine.
  if (realityTvView && realityTvView.enabled === true && typeof realityTvSpoilerHiddenCategoryIds_ === "function") {
    const hiddenCategoryIds = realityTvSpoilerHiddenCategoryIds_(realityTvView);
    const blockedFutureCategoryIds = typeof realityTvSpoilerBlockedCategoryIds_ === "function"
      ? realityTvSpoilerBlockedCategoryIds_(realityTvView)
      : {};
    categories = (categories || []).map(function(category) {
      const categoryId = String(category && category.id || "").trim().toLowerCase();
      const hiddenResult = !!hiddenCategoryIds[categoryId];
      const blockedEpisodeNumber = Number(blockedFutureCategoryIds[categoryId] || 0);
      if (!hiddenResult && !blockedEpisodeNumber) return category;
      const copy = Object.assign({}, category);
      if (hiddenResult) {
        copy.winnerNomineeId = "";
        copy.winnerNomineeIds = [];
        copy.resultStatus = "hidden";
        copy.resultResolved = false;
        copy.spoilerShieldHidden = true;
      }
      if (blockedEpisodeNumber) {
        // Do not send the post-elimination answer roster for a future episode
        // until the preceding hidden result has been revealed.
        copy.nominees = [];
        copy.locked = true;
        copy.spoilerShieldBlocked = true;
        copy.spoilerShieldBlockedEpisodeNumber = blockedEpisodeNumber;
        copy.spoilerShieldBlockedByEpisodeNumber = Number(realityTvView.spoilerShield && realityTvView.spoilerShield.blockingEpisodeNumber || 0);
      }
      return copy;
    });
  }

  const startupPayload = {
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
      realityTvView,

    liveProbabilitiesDeferred:
      liveProbabilitiesDeferred
  };

  if (startupCacheKey) {
    try {
      safeScriptCachePut_(
        startupCache,
        startupCacheKey,
        JSON.stringify(startupPayload),
        45
      );
    } catch (cacheWriteError) {}
  }

  return startupPayload;

}

function apiGetGameLiveProbabilities(payload) {

  payload = payload || {};

  const username = String(payload.username || "").trim();
  const token = String(payload.token || "").trim();
  const gameId = normalizeGameId_(payload.gameId || getDefaultGameId());

  if (!username || !token) throw new Error("Session expired. Please log in again.");

  validateUserSession_(username, token);
  requireGameFeatureAccess_(username, gameId, "viewGame", payload.leagueId || "");

  const categories = typeof getCategoriesCached === "function"
    ? getCategoriesCached(gameId)
    : getCategories(gameId);

  if (typeof externalResultsBridgeEnrichCategoriesWithLiveProbabilities_ !== "function") {
    return { success: true, gameId: gameId, probabilities: [] };
  }

  const enriched = externalResultsBridgeEnrichCategoriesWithLiveProbabilities_(gameId, categories || []);
  const probabilities = [];

  (enriched || []).forEach(function(category) {
    (category.nominees || []).forEach(function(nominee) {
      if (nominee.liveProbability === undefined || nominee.liveProbability === null || nominee.liveProbability === "") return;
      probabilities.push({
        categoryId: category.id,
        nomineeId: nominee.id,
        liveProbability: nominee.liveProbability,
        liveProbabilityProvider: nominee.liveProbabilityProvider || "",
        liveProbabilityUpdatedAt: nominee.liveProbabilityUpdatedAt || "",
        liveProbabilityMarketId: nominee.liveProbabilityMarketId || "",
        liveProbabilityOutcome: nominee.liveProbabilityOutcome || "",
        liveProbabilitySourceUrl: nominee.liveProbabilitySourceUrl || ""
      });
    });
  });

  return { success: true, gameId: gameId, probabilities: probabilities };
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

  const dashboardCache = CacheService.getScriptCache();
  const dashboardCacheKey = typeof appDashboardCacheKey_ === "function"
    ? appDashboardCacheKey_(username)
    : "dashboard_hub_v2_" + username.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 120);

  if (dashboardCacheKey) {
    try {
      const cachedDashboard = dashboardCache.get(dashboardCacheKey);
      if (cachedDashboard) {
        const parsedDashboard = JSON.parse(cachedDashboard);
        parsedDashboard.cached = true;
        return parsedDashboard;
      }
    } catch (cacheError) {}
  }

  const games =
    typeof filterGamesForUser_ === "function"
      ? filterGamesForUser_(
          getGames(),
          username
        )
      : getGames();

  const activeGames = [];
  const pastGames = [];
  const fastStartup = payload.fastStartup === true;

  if (fastStartup) {
    games.forEach(function(game) {
      if (!game || !game.gameId) return;
      const isPast = isDashboardPastGame_(game);
      if (game.active === true && isPast !== true) {
        activeGames.push(buildDashboardFastStartupGameHubItem_(game, false));
      } else if (isPast) {
        pastGames.push(buildDashboardFastStartupGameHubItem_(game, true));
      }
    });

    const defaultGameId = getDefaultGameId();
    return {
      success: true,
      cached: false,
      fastStartup: true,
      progressDeferred: true,
      classificationDeferred: true,
      username: username,
      defaultGameId: defaultGameId,
      profileGameId: activeGames.length ? activeGames[0].gameId : (pastGames.length ? pastGames[0].gameId : defaultGameId),
      profile: {},
      profileHistory: [],
      hubAppearance: [],
      activeGames: activeGames,
      pastGames: pastGames
    };
  }

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

  let hubAppearance = [];
  try {
    hubAppearance = typeof appearanceGetHubAppearanceRows_ === "function"
      ? appearanceGetHubAppearanceRows_()
      : [];
  } catch (err) {
    hubAppearance = [];
  }

  const dashboardPayload = {
    success: true,
    username: username,
    defaultGameId: defaultGameId,
    profileGameId: profileGameId,
    profile: profile,
    profileHistory: profileHistory,
    hubAppearance: hubAppearance,
    activeGames: activeGames,
    pastGames: pastGames
  };

  if (dashboardCacheKey) {
    try {
      safeScriptCachePut_(dashboardCache, dashboardCacheKey, JSON.stringify(dashboardPayload), 300);
    } catch (cacheError) {}
  }

  return dashboardPayload;

}

function isDashboardPastGame_(game) {

  if (!game) {
    return false;
  }

  if (game.archived === true || game.resultsFinalized === true) {
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

function buildDashboardFastStartupGameHubItem_(game, isPast) {

  game = game || {};

  const mode = getDashboardGameMode_(game);
  const availability = getDashboardAvailability_(game, isPast);
  const isSeasonHub = game.gameRole === "parent";
  let lockLabel =
    availability.statusLabel ||
    String(game.lockLabel || game.lockTimeLabel || game.eventTime || "").trim() ||
    (game.lockAllPicks === true ? "Locked" : isPast ? "Finished" : "Open / Lock time TBD");
  if (mode === "team-fantasy") lockLabel = "Locks by NFL kickoff";

  const enterLabel = availability.available === false
    ? availability.actionLabel
    : isSeasonHub ? "Open Season Hub" : "Open Game";
  const hubPlacement = getDashboardHubPlacement_(game, mode);

  return {
    gameId: game.gameId,
    name: game.name || game.gameId,
    subtitle: getDashboardGameTypeLabel_(game, mode),
    year: game.year || "",
    type: mode,
    rawType: game.type || "",
    typeLabel: getDashboardGameTypeLabel_(game, mode),
    hubCategory: hubPlacement.category,
    hubGroup: hubPlacement.group,
    gameRole: game.gameRole || "standalone",
    hubMode: game.hubMode || "playable-aggregate",
    parentGameId: game.parentGameId || "",
    showMiniGameLinks: game.showMiniGameLinks !== false,
    includeParentQuestions: game.includeParentQuestions !== false,
    predictionEnabled: game.predictionEnabled === true,
    fixedPointsEnabled: game.fixedPointsEnabled !== false,
    stakedPointsEnabled: game.stakedPointsEnabled === true,
    wagerEnabled: game.wagerEnabled === true,
    rankingEnabled: game.rankingEnabled === true,
    icon: "",
    status: game.status || "",
    lockAllPicks: game.lockAllPicks === true,
    statusLabel: lockLabel,
    lockLabel: lockLabel,
    description: getDashboardGameDescription_(game, mode),
    themeColor: game.themeColor || "#354785",
    heroImageFileId: game.heroImageFileId || "",
    heroImage: game.heroImage || "",
    heroImagePosition: game.heroImagePosition || "center center",
    availableFrom: game.availableFrom || "",
    availableUntil: game.availableUntil || "",
    available: availability.available === true,
    availabilityLabel: availability.label || "",
    disableEnter: availability.available === false,
    active: game.active === true,
    archived: game.archived === true,
    isPast: isPast === true,
    hasStarted: null,
    madeCount: null,
    totalCount: null,
    enterLabel: enterLabel,
    actionLabel: enterLabel,
    progressAvailable: false,
    progressLabel: "",
    progressValue: null,
    userSummary: "",
    progressDeferred: true,
    classificationDeferred: true,
    userStats: [],
    leaderboardPreview: [],
    showLeaderboard: game.showLeaderboard !== false,
    leagueId: game.leagueId || "",
    leagueName: game.leagueName || "",
    leagueScoped: game.leagueScoped === true,
    leagues: Array.isArray(game.leagues) ? game.leagues : []
  };
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

  let lockLabel =
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

  if (mode === "team-fantasy") {
    lockLabel = "Locks by NFL kickoff";
  }

  const enterLabel =
    availability.available === false
      ? availability.actionLabel
      : isSeasonHub
        ? "Open Season Hub"
        : progress.actionLabel || getDashboardEnterLabel_(
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

    lockAllPicks:
      game.lockAllPicks === true,

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
      progress.hasStarted === true || Number(progress.madeCount) > 0,

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

function dashboardProgressResult_(made, total, label, summary, extra) {
  made = Math.max(0, Number(made) || 0);
  total = Math.max(made, Number(total) || 0);
  const remaining = Math.max(0, total - made);
  const result = {
    madeCount: made,
    totalCount: total,
    remainingCount: remaining,
    progressAvailable: true,
    progressLabel: label || (remaining ? remaining + " action" + (remaining === 1 ? "" : "s") + " left" : "Complete"),
    progressValue: total ? getDashboardProgressPercent_(made, total) : 0,
    userSummary: summary || "Game progress",
    summary: {}
  };
  Object.keys(extra || {}).forEach(function(key) { result[key] = extra[key]; });
  return result;
}

function dashboardSpecialGameProgress_(game, username, mode) {
  game = game || {};
  const gameId = String(game.gameId || game.GameId || "").trim();
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (!gameId || !username) return null;

  if (normalizedMode === "survivor") {
    try {
      if (typeof apiGetSurvivorState_ !== "function") return null;
      const state = apiGetSurvivorState_({ gameId: gameId, username: username }) || {};

      if (state.passiveKoth === true || String(state.mode || "").toLowerCase() === "king-of-the-hill") {
        const history = Array.isArray(state.history) ? state.history : [];
        return dashboardProgressResult_(0, 0, "Automatic — no weekly pick required", "King of the Hill", {
          hasStarted: history.length > 0 || Number(state.latestWeek || 0) > 0,
          actionLabel: "View KOTH",
          summary: { passive: true, latestWeek: Number(state.latestWeek || 0) }
        });
      }

      const rounds = Array.isArray(state.rounds) ? state.rounds : [];
      const hasStarted = rounds.some(function(round) {
        return !!String(round && (round.pickNomineeId || "")).trim() ||
          (Array.isArray(round && round.nomineeIds) && round.nomineeIds.length > 0) ||
          (Array.isArray(round && round.pickNomineeIds) && round.pickNomineeIds.length > 0);
      }) || Number(state.roundsSurvived || 0) > 0 || Number(state.eliminatedRound || 0) > 0;

      const current = state.currentRound || null;
      const selected = current ? (
        !!String(current.pickNomineeId || "").trim() ||
        (Array.isArray(current.pickNomineeIds) && current.pickNomineeIds.length > 0)
      ) : false;
      const actionableMissing = !!(current && current.canPick === true && !selected);
      const total = selected || actionableMissing ? 1 : 0;
      const made = selected ? 1 : 0;
      const label = selected
        ? "Current Survivor pick set"
        : actionableMissing
          ? "1 Survivor pick left"
          : state.complete === true || state.winner === true
            ? "Survivor complete"
            : state.alive === false
              ? "Survivor entry eliminated"
              : "No actionable Survivor pick";
      return dashboardProgressResult_(made, total, label, "Survivor", {
        hasStarted: hasStarted,
        actionLabel: actionableMissing ? "Make Survivor Pick" : "Review Survivor",
        summary: { alive: state.alive !== false, complete: state.complete === true }
      });
    } catch (err) {
      return null;
    }
  }

  if (normalizedMode === "ranking") {
    try {
      if (typeof apiGetRankingState_ !== "function") return null;
      const state = apiGetRankingState_({ gameId: gameId, username: username }) || {};
      const categories = Array.isArray(state.categories) ? state.categories : [];
      let made = 0;
      let total = 0;
      let hasStarted = false;
      categories.forEach(function(category) {
        const ballot = Array.isArray(category && category.ballot) ? category.ballot : [];
        const nominees = Array.isArray(category && category.nominees) ? category.nominees : [];
        const complete = nominees.length > 0 && ballot.length === nominees.length;
        if (ballot.length) hasStarted = true;
        if (complete) {
          made++;
          total++;
        } else if (category && category.locked !== true && nominees.length > 0) {
          total++;
        }
      });
      const remaining = Math.max(0, total - made);
      return dashboardProgressResult_(made, total,
        remaining ? remaining + " ranking" + (remaining === 1 ? "" : "s") + " left" : (made ? "Rankings complete" : "No actionable rankings"),
        "Ranking ballots",
        {
          hasStarted: hasStarted,
          actionLabel: remaining ? "Finish Rankings" : "Review Rankings",
          summary: { categories: categories.length, completed: made }
        }
      );
    } catch (err) {
      return null;
    }
  }

  if (normalizedMode === "voting") {
    try {
      if (typeof apiGetVotingCompetitionState_ !== "function") return null;
      const state = apiGetVotingCompetitionState_({ gameId: gameId, username: username }) || {};
      const ballot = Array.isArray(state.ballot) ? state.ballot : [];
      const ballotLimit = Math.max(0, Number(state.ballotLimit) || 0);
      const complete = ballotLimit > 0 && ballot.length === ballotLimit;
      const actionableMissing = state.votingOpen === true && ballotLimit > 0 && !complete;
      const total = complete || actionableMissing ? 1 : 0;
      const made = complete ? 1 : 0;
      const hasStarted = ballot.length > 0 || !!state.ownEntry;
      return dashboardProgressResult_(made, total,
        complete ? "Vote complete" : actionableMissing ? "1 vote left" : "No actionable vote",
        "Voting ballot",
        {
          hasStarted: hasStarted,
          actionLabel: actionableMissing ? "Vote Now" : "Review Vote",
          summary: { ballotLimit: ballotLimit, savedRanks: ballot.length }
        }
      );
    } catch (err) {
      return null;
    }
  }

  return null;
}

function dashboardCategoryIsActionable_(game, setting) {
  if (game && game.lockAllPicks === true) return false;
  setting = setting || {};
  if (setting.locked === true) return false;
  const rawLock = setting.lockDateTime || setting.LockDateTime || "";
  if (!rawLock) return true;
  const lockDate = new Date(rawLock);
  return isNaN(lockDate.getTime()) || Date.now() < lockDate.getTime();
}

function dashboardActionablePickTotals_(game, gameId, categoryIds, pickCategoryIds) {
  categoryIds = Array.isArray(categoryIds) ? categoryIds : [];
  pickCategoryIds = Array.isArray(pickCategoryIds) ? pickCategoryIds : [];
  const completed = {};
  pickCategoryIds.forEach(function(categoryId) {
    const key = String(categoryId || "").trim().toLowerCase();
    if (key) completed[key] = true;
  });

  let settings = {};
  try {
    settings = typeof getCategorySettingsCached === "function"
      ? (getCategorySettingsCached(gameId) || {})
      : typeof getCategorySettings === "function"
        ? (getCategorySettings(gameId) || {})
        : {};
  } catch (err) {
    settings = {};
  }

  let made = 0;
  let actionableMissing = 0;
  categoryIds.forEach(function(categoryId) {
    const key = String(categoryId || "").trim().toLowerCase();
    if (!key) return;
    if (completed[key]) {
      made++;
      return;
    }
    const setting = settings[key] || settings[categoryId] || {};
    if (dashboardCategoryIsActionable_(game, setting)) actionableMissing++;
  });

  return {
    madeCount: made,
    totalCount: made + actionableMissing,
    actionableMissing: actionableMissing
  };
}

function getDashboardGameProgressLite_(
  game,
  username,
  mode,
  options
) {

  game = game || {};
  options = options || {};

  if (options.suppressProgress !== true && mode === "team-fantasy") {
    try {
      if (typeof teamFantasyDashboardProgress_ === "function") {
        return teamFantasyDashboardProgress_(String(game && (game.gameId || game.GameId) || ""), username);
      }
    } catch (err) {}
    return {
      madeCount: 0,
      totalCount: 0,
      remainingCount: 0,
      progressAvailable: false,
      progressLabel: "Weekly lineup",
      progressValue: 0,
      userSummary: "Open Team Fantasy lineup",
      summary: {}
    };
  }

  if (options.suppressProgress !== true) {
    const specialized = dashboardSpecialGameProgress_(game, username, mode);
    if (specialized) return specialized;
  }

  const gameId =
    String(game.gameId || "").trim();

  const progressContext =
    options.progressContext || null;

  const progressGameKey =
    dashboardProgressGameKey_(gameId);

  const baseTotalCategories =
    progressContext && progressContext.totalCategoriesByGame
      ? Number(progressContext.totalCategoriesByGame[progressGameKey] || 0)
      : getDashboardTotalCategories_(gameId);

  // The season-long Reality anchor is a virtual pick requirement. It is not a
  // Categories row, so include it explicitly without affecting other games.
  const anchorProgress = typeof seasonAnchorDashboardProgress_ === "function"
    ? seasonAnchorDashboardProgress_(username, gameId)
    : { required: 0, made: 0 };
  const totalCategories = baseTotalCategories + Math.max(0, Number(anchorProgress.required || 0));

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
  let effectiveTotalCategories = totalCategories;
  let noun = "pick";
  let userSummary = "Prediction picks";

  const categoryIds = progressContext && progressContext.categoryIdsByGame
    ? (progressContext.categoryIdsByGame[progressGameKey] || [])
    : (typeof getCategories === "function"
        ? (getCategories(gameId) || []).map(function(category) { return category && category.id; }).filter(Boolean)
        : []);

  if (
    normalizedMode === "wager" ||
    normalizedMode === "racing-wager"
  ) {
    const actionableTotals = dashboardActionablePickTotals_(game, gameId, categoryIds, betCategoryIds);
    madeCount = actionableTotals.madeCount;
    effectiveTotalCategories = actionableTotals.totalCount + Math.max(0, Number(anchorProgress.required || 0));
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

    const completedCategoryIds = Object.keys(completed);
    const actionableTotals = dashboardActionablePickTotals_(game, gameId, categoryIds, completedCategoryIds);
    madeCount = actionableTotals.madeCount;
    effectiveTotalCategories = actionableTotals.totalCount + Math.max(0, Number(anchorProgress.required || 0));

    noun = "selection";
    userSummary = "Hybrid picks & wagers";
  } else if (
    normalizedMode === "prediction" ||
    normalizedMode === "confidence" ||
    normalizedMode === "staked-prediction" ||
    normalizedMode === "head-to-head"
  ) {
    const actionableTotals = dashboardActionablePickTotals_(game, gameId, categoryIds, pickCategoryIds);
    madeCount = actionableTotals.madeCount;
    effectiveTotalCategories = actionableTotals.totalCount + Math.max(0, Number(anchorProgress.required || 0));
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

  madeCount += Math.max(0, Number(anchorProgress.made || 0));

  madeCount =
    Math.min(
      effectiveTotalCategories,
      Math.max(0, madeCount)
    );

  const remaining =
    Math.max(
      0,
      effectiveTotalCategories - madeCount
    );

  const progressValue =
    getDashboardProgressPercent_(
      madeCount,
      effectiveTotalCategories
    );

  const pluralNoun =
    noun === "wager"
      ? "wagers"
      : noun === "selection"
        ? "selections"
        : "picks";

  const progressLabel =
    madeCount >= effectiveTotalCategories
      ? "All " + effectiveTotalCategories + " " + pluralNoun + " complete"
      : remaining +
        (remaining === 1
          ? " " + noun + " left"
          : " " + pluralNoun + " left") +
        " · " + madeCount + " / " + effectiveTotalCategories + " complete";

  return {
    madeCount: madeCount,
    totalCount: effectiveTotalCategories,
    remainingCount: remaining,
    progressAvailable: true,
    progressLabel: progressLabel,
    progressValue: progressValue,
    userSummary: userSummary,
    summary: {
      picksMade: pickCount,
      wagersMade: betCount,
      completedCount: madeCount,
      totalCategories: effectiveTotalCategories
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
    categoryIdsByGame: {},
    pickCategoryIdsByGame: {},
    betCategoryIdsByGame: {}
  };

  const requestedKeys = Object.keys(requestedGames);

  requestedKeys.forEach(function(key) {
    context.totalCategoriesByGame[key] = 0;
    context.categoryIdsByGame[key] = [];
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

  context = context || {};
  if (!context.categoryIdsByGame) context.categoryIdsByGame = {};
  if (!context.totalCategoriesByGame) context.totalCategoriesByGame = {};

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
      const categoryIds = Object.keys(seenByGame[gameKey]);
      context.categoryIdsByGame[gameKey] = categoryIds;
      context.totalCategoriesByGame[gameKey] = categoryIds.length;
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
    "voting",
    "team-fantasy",
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

  if (mode === "team-fantasy") {
    return { category: "sports", group: "NFL" };
  }


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

  // A Reality-managed game does not have to contain a known show name in its
  // title. Use the authoritative season link as the fallback so disposable,
  // custom, and future Reality shows still appear in the Reality Hub once the
  // game is published.
  if (
    typeof realityTvHasSeasonForGameCached_ === "function" &&
    realityTvHasSeasonForGameCached_(game.gameId)
  ) {
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

  if (mode === "team-fantasy") {
    return "Team Fantasy Football";
  }


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
    return "Ranking Prediction Game";
  }

  if (mode === "voting") {
    return "Voting / Competition Game";
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

  if (mode === "team-fantasy") {
    // Legacy action wording retained for regression compatibility: "Continue Lineup".
    const total = Number(progress.totalCount) || 0;
    if (total > 0 && made < total) return "Fill Remaining Picks";
    return made > 0
      ? "Review Lineup"
      : "Make Lineup";
  }

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
    return "Open Rankings";
  }

  return complete
    ? "View Picks"
    : "Continue Picks";

}

function getDashboardGameDescription_(
  game,
  mode
) {

  if (mode === "team-fantasy") {
    return "Build an eight-slot NFL team lineup each week. Picks lock individually when that NFL team's game starts.";
  }


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

  if (getDashboardGameMode_(game) === "team-fantasy") {
    return "Locks by NFL kickoff";
  }


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

  if (mode === "team-fantasy") {
    try {
      if (typeof teamFantasyDashboardProgress_ === "function") {
        return teamFantasyDashboardProgress_(String(game && (game.gameId || game.GameId) || ""), username);
      }
    } catch (err) {}
    return {
      madeCount: 0,
      totalCount: 0,
      remainingCount: 0,
      progressAvailable: false,
      progressLabel: "Weekly lineup",
      progressValue: 0,
      userSummary: "Open Team Fantasy lineup",
      summary: {}
    };
  }

  const specialized = dashboardSpecialGameProgress_(game, username, mode);
  if (specialized) return specialized;


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
