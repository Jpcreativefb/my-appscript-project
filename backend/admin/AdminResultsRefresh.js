/* =========================
   ADMIN RESULTS REFRESH
========================= */

function adminRefreshResultsCaches(payload) {

  const gameId =
    String(
      payload && payload.gameId || ""
    ).trim();

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  /*
    Use broad cache clearing because results affect:
    - leaderboard
    - dashboard
    - user profiles
    - scoring
    - category settings
  */

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  } else {

    if (
      typeof clearGamesCache ===
      "function"
    ) {
      clearGamesCache();
    }

    if (
      typeof clearCategoriesCache ===
      "function"
    ) {
      clearCategoriesCache();
    }

    if (
      typeof clearCategorySettingsCache ===
      "function"
    ) {
      clearCategorySettingsCache();
    }

    if (
      typeof clearLeaderboardCache ===
      "function"
    ) {
      clearLeaderboardCache();
    }

    if (
      typeof clearScoringCache ===
      "function"
    ) {
      clearScoringCache();
    }

  }

  return {
    success: true,
    message: "Results caches refreshed",
    gameId: gameId
  };

}