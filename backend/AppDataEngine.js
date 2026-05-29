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