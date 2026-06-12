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

  const leaderboardRows =
    game.showLeaderboard === false
      ? []
      : getDashboardLeaderboardRows_(
          game,
          mode
        );

  const leaderboardPreview =
    getDashboardLeaderboardPreviewFromRows_(
      game,
      mode,
      leaderboardRows,
      5
    );

  const userLeaderboard =
    getDashboardUserLeaderboardInfoFromRows_(
      game,
      mode,
      username,
      leaderboardRows
    );

  const userStats =
    getDashboardUserStats_(
      mode,
      progress,
      userLeaderboard
    );

  const hasStarted =
    Number(progress.madeCount) > 0;

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
      getDashboardLockLabel_(
        game,
        isPast
      ),

    lockLabel:
      getDashboardLockLabel_(
        game,
        isPast
      ),

    description:
      getDashboardGameDescription_(
        game,
        mode
      ),

    themeColor:
      game.themeColor || "#354785",

    active:
      game.active === true,

    archived:
      game.archived === true,

    isPast:
      isPast === true,

    hasStarted:
      hasStarted,

    enterLabel:
      getDashboardEnterLabel_(
        mode,
        progress,
        isPast
      ),

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

  const percent =
    Number(progress.progressValue) || 0;

  if (made <= 0) {
    return "Play Now";
  }

  if (mode === "wager") {
    return "Manage Wagers";
  }

  if (mode === "confidence") {
    return percent >= 100
      ? "View Confidence Picks"
      : "Continue Confidence Picks";
  }

  if (mode === "ranking") {
    return "Check Status";
  }

  return percent >= 100
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
    return "Make picks and assign confidence value to the choices you feel strongest about.";
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

      const progressValue =
        getDashboardProgressPercent_(
          totalBets,
          totalCategories
        );

      return {
        madeCount:
          totalBets,

        totalCount:
          totalCategories,

        progressLabel:
          totalCategories
            ? totalBets + " / " + totalCategories + " wagers placed"
            : totalBets + " wagers placed",

        progressValue:
          progressValue,

        userSummary:
          "Bankroll: " +
          getDashboardSafeNumber_(
            summary.bankroll,
            0
          ) +
          " chips",

        summary:
          summary
      };

    } catch (err) {

      return {
        madeCount:
          0,
        totalCount:
          totalCategories,
        progressLabel:
          "No wagers placed yet",
        progressValue:
          0,
        userSummary:
          "Wager game ready",
        summary:
          {}
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
            ? picksMade + " / " + totalCategories + " picks made"
            : picksMade + " picks made",

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

    } catch (err) {

      return {
        madeCount:
          0,
        totalCount:
          totalCategories,
        progressLabel:
          "No picks made yet",
        progressValue:
          0,
        userSummary:
          "Prediction game ready",
        summary:
          {}
      };

    }

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
        getDashboardSafeNumber_(
          summary.bankroll,
          0
        ) + " chips"
    });

    stats.push({
      label: "Wagers",
      value:
        getDashboardSafeNumber_(
          summary.totalBets,
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

  stats.push({
    label: "Status",
    value:
      Number(progress.madeCount) > 0
        ? "Started"
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
        ""
      )
        .trim()
        .toLowerCase();

    if (rowUsername !== normalizedUsername) {
      continue;
    }

    return {
      rank:
        i + 1,

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
            )
    };

  }

  return {};

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
