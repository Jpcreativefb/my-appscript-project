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

  const game =
    getGame(gameId);

  const categories =
    getCategories(gameId);

  const categorySettings =
    getCategorySettings(gameId);

  const picks =
    apiGetMyPicks(
      username,
      gameId
    );

  const leaderboard =
    getLeaderboardData(
      gameId
    );

  const profile =
    getUserProfile(
      username,
      gameId
    );

  const profileHistory =
    getUserProfileHistory(
      username,
      gameId
    );

  return {
    success: true,

    gameId:
      gameId,

    game:
      game,

    username:
      username,

    categories:
      categories,

    categorySettings:
      categorySettings,

    picks:
      picks,

    leaderboard:
      leaderboard,

    profile:
      profile,

    profileHistory:
      profileHistory
  };

}

/* =========================
   SESSION VALIDATION
========================= */

function validateUserSession_(
  username,
  token
) {

  const cachedUsername =
    CacheService
      .getScriptCache()
      .get(token);

  if (!cachedUsername) {
    throw new Error(
      "Session expired. Please log in again."
    );
  }

  if (
    String(cachedUsername)
      .trim()
      .toLowerCase() !==
    String(username)
      .trim()
      .toLowerCase()
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
    getGames();

  const activeGames = [];
  const pastGames = [];

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
        buildDashboardGameHubItem_(
          game,
          username,
          false
        )
      );

      return;

    }

    if (isPast) {

      pastGames.push(
        buildDashboardGameHubItem_(
          game,
          username,
          true
        )
      );

    }

  });

  const profileGameId =
    activeGames.length
      ? activeGames[0].gameId
      : pastGames.length
        ? pastGames[0].gameId
        : getDefaultGameId();

  let profile = {};
  let profileHistory = [];

  if (profileGameId) {

    try {

      profile =
        getUserProfile(
          username,
          profileGameId
        ) || {};

      profileHistory =
        getUserProfileHistory(
          username,
          profileGameId
        ) || [];

    } catch (err) {

      profile = {};
      profileHistory = [];

    }

  }

  return {
    success: true,
    username: username,
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

  const leaderboardPreview =
    game.showLeaderboard === false
      ? []
      : getDashboardLeaderboardPreview_(
          game,
          mode,
          3
        );

  return {
    gameId:
      game.gameId,

    name:
      game.name || game.gameId,

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

    icon:
      getDashboardGameIcon_(
        game,
        mode
      ),

    status:
      game.status || "",

    statusLabel:
      isPast
        ? "Past Game"
        : game.status || "Active",

    themeColor:
      game.themeColor || "#354785",

    active:
      game.active === true,

    archived:
      game.archived === true,

    isPast:
      isPast === true,

    enterLabel:
      getDashboardEnterLabel_(mode),

    progressLabel:
      progress.progressLabel,

    progressValue:
      progress.progressValue,

    userSummary:
      progress.userSummary,

    leaderboardPreview:
      leaderboardPreview,

    showLeaderboard:
      game.showLeaderboard !== false
  };

}

function getDashboardGameMode_(game) {

  const type =
    String(game.type || "")
      .trim()
      .toLowerCase();

  if (
    type === "wager" ||
    type === "betting" ||
    game.wagerEnabled === true
  ) {
    return "wager";
  }

  if (
    type === "confidence" ||
    game.confidenceEnabled === true
  ) {
    return "confidence";
  }

  if (
    type === "ranking" ||
    game.rankingEnabled === true
  ) {
    return "ranking";
  }

  if (
    type === "prediction" ||
    game.predictionEnabled === true
  ) {
    return "prediction";
  }

  return type || "prediction";

}

function getDashboardGameTypeLabel_(
  game,
  mode
) {

  if (game.typeLabel) {
    return game.typeLabel;
  }

  if (mode === "wager") {
    return "Wager / Chips Game";
  }

  if (mode === "confidence") {
    return "Confidence Game";
  }

  if (mode === "ranking") {
    return "Ranking Game";
  }

  return "Prediction Game";

}

function getDashboardGameIcon_(
  game,
  mode
) {

  if (game.icon) {
    return game.icon;
  }

  if (mode === "wager") {
    return "💰";
  }

  if (mode === "confidence") {
    return "⭐";
  }

  if (mode === "ranking") {
    return "📊";
  }

  return "🏆";

}

function getDashboardEnterLabel_(mode) {

  if (mode === "wager") {
    return "Enter Wager Game";
  }

  if (mode === "confidence") {
    return "Enter Confidence Game";
  }

  if (mode === "ranking") {
    return "Enter Ranking Game";
  }

  return "Enter Game";

}

function getDashboardGameProgress_(
  game,
  username,
  mode
) {

  const gameId =
    game.gameId;

  let totalCategories = 0;

  try {

    const categories =
      getCategories(gameId) || [];

    totalCategories =
      categories.length;

  } catch (err) {

    totalCategories = 0;

  }

  if (mode === "wager") {

    try {

      const summary =
        getUserBettingSummary(
          username,
          gameId
        );

      const totalBets =
        Number(summary.totalBets) || 0;

      return {
        progressLabel:
          totalCategories
            ? totalBets + " / " + totalCategories + " wagers placed"
            : totalBets + " wagers placed",

        progressValue:
          getDashboardProgressPercent_(
            totalBets,
            totalCategories
          ),

        userSummary:
          "Bankroll: " +
          getDashboardSafeNumber_(
            summary.bankroll,
            0
          ) +
          " chips"
      };

    } catch (err) {

      return {
        progressLabel:
          "No wagers placed yet",
        progressValue:
          0,
        userSummary:
          "Wager game ready"
      };

    }

  }

  if (
    mode === "prediction" ||
    mode === "confidence"
  ) {

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

      const picksMade =
        Object.keys(picks)
          .filter(categoryId =>
            picks[categoryId]
          )
          .length;

      return {
        progressLabel:
          totalCategories
            ? picksMade + " / " + totalCategories + " picks made"
            : picksMade + " picks made",

        progressValue:
          getDashboardProgressPercent_(
            picksMade,
            totalCategories
          ),

        userSummary:
          mode === "confidence"
            ? "Confidence picks"
            : "Prediction picks"
      };

    } catch (err) {

      return {
        progressLabel:
          "No picks made yet",
        progressValue:
          0,
        userSummary:
          "Prediction game ready"
      };

    }

  }

  return {
    progressLabel:
      "Ready to play",
    progressValue:
      0,
    userSummary:
      "Game ready"
  };

}

function getDashboardLeaderboardPreview_(
  game,
  mode,
  limit
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

  return rows
    .slice(0, limit || 3)
    .map((row, index) => {

      const username =
        row.user ||
        row.username ||
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
          index + 1,

        username:
          username,

        displayName:
          row.displayName ||
          profile.displayName ||
          username ||
          "Player",

        score:
          mode === "wager"
            ? getDashboardSafeNumber_(
                row.bankroll,
                0
              )
            : getDashboardSafeNumber_(
                row.total !== undefined
                  ? row.total
                  : row.totalScore !== undefined
                    ? row.totalScore
                    : row.score,
                0
              ),

        scoreLabel:
          mode === "wager"
            ? "Bankroll"
            : "Score"
      };

    });

}

function getDashboardProgressPercent_(
  made,
  total
) {

  made = Number(made) || 0;
  total = Number(total) || 0;

  if (total <= 0) {
    return 0;
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

function getDashboardSafeNumber_(
  value,
  fallback
) {

  const num =
    Number(value);

  return isNaN(num)
    ? fallback
    : num;

}
