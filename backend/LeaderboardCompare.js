/* =========================
   LEADERBOARD COMPARE PICKS
   NEW DROP-IN FILE: LeaderboardCompare.gs

   Purpose:
   - View another user's picks.
   - Compare another user's picks to your own.
   - Only exposes picks for locked categories or finished/locked games.

   Expected existing functions:
   - normalizeGameId_(gameId)
   - getDefaultGameId()
   - getCategories(gameId)
   - getCategorySettings(gameId)
   - getUserPicks(username, gameId)
   - getLeaderboardUserProfile_(username, gameId)
========================= */


function apiCompareUserPicks(
  payload
) {

  payload =
    payload || {};

  const username =
    String(payload.username || "")
      .trim();

  const otherUsername =
    String(
      payload.otherUsername ||
      payload.targetUsername ||
      ""
    ).trim();

  const gameId =
    normalizeGameId_(
      payload.gameId ||
      getDefaultGameId()
    );

  if (!username) {
    return {
      success: false,
      message: "Missing current username"
    };
  }

  if (!otherUsername) {
    return {
      success: false,
      message: "Missing user to compare"
    };
  }

  const viewerProfile =
    getLeaderboardUserProfile_(
      username,
      gameId
    );

  const opponentProfile =
    getLeaderboardUserProfile_(
      otherUsername,
      gameId
    );

  const categories =
    getCategories(gameId) || [];

  const settings =
    getCategorySettings(gameId) || {};

  const viewerPicks =
    getUserPicks(
      username,
      gameId
    ) || {};

  const opponentPicks =
    getUserPicks(
      otherUsername,
      gameId
    ) || {};

  const gameFinished =
    isLeaderboardCompareGameFinished_(
      gameId
    );

  const rows = [];

  categories.forEach(function(category) {

    const categoryId =
      String(
        category.categoryId ||
        category.id ||
        ""
      ).trim();

    if (!categoryId) {
      return;
    }

    const setting =
      settings[categoryId] || {};

    const categoryLocked =
      isLeaderboardCompareCategoryLocked_(
        setting
      );

    const visible =
      gameFinished ||
      categoryLocked;

    const viewerPickId =
      getComparePickNomineeId_(
        viewerPicks,
        categoryId
      );

    const opponentPickId =
      getComparePickNomineeId_(
        opponentPicks,
        categoryId
      );

    const nomineeMap =
      buildCompareNomineeMap_(
        category
      );

    rows.push({
      categoryId: categoryId,
      category:
        category.category ||
        category.name ||
        category.title ||
        categoryId,
      locked:
        categoryLocked,
      visible:
        visible,
      viewerPick:
        visible
          ? buildComparePickDisplay_(
              viewerPickId,
              nomineeMap
            )
          : null,
      opponentPick:
        visible
          ? buildComparePickDisplay_(
              opponentPickId,
              nomineeMap
            )
          : null,
      samePick:
        visible &&
        !!viewerPickId &&
        !!opponentPickId &&
        String(viewerPickId) ===
        String(opponentPickId)
    });

  });

  return {
    success: true,
    gameId: gameId,
    viewer: viewerProfile,
    opponent: opponentProfile,
    categories: rows
  };

}


function isLeaderboardCompareCategoryLocked_(
  setting
) {

  if (!setting) {
    return false;
  }

  return (
    setting.locked === true ||
    String(setting.locked || "")
      .toLowerCase() === "true" ||
    setting.Locked === true ||
    String(setting.Locked || "")
      .toLowerCase() === "true"
  );

}


/**
 * This is intentionally defensive.
 * If your Games engine already has a clear helper for finished/locked state,
 * replace this function body with that helper later.
 */
function isLeaderboardCompareGameFinished_(
  gameId
) {

  try {

    if (
      typeof getGameById_ === "function"
    ) {

      const game =
        getGameById_(gameId);

      if (game) {

        const status =
          String(game.status || game.Status || "")
            .trim()
            .toLowerCase();

        const lockAll =
          game.lockAllPicks === true ||
          String(game.lockAllPicks || "")
            .toLowerCase() === "true" ||
          game.LockAllPicks === true ||
          String(game.LockAllPicks || "")
            .toLowerCase() === "true";

        return (
          lockAll ||
          status === "finished" ||
          status === "complete" ||
          status === "closed"
        );

      }

    }

  } catch (err) {

    // Fall through to false.
    // Category locks still protect open picks.

  }

  return false;

}


function getComparePickNomineeId_(
  picks,
  categoryId
) {

  if (!picks) {
    return "";
  }

  if (picks[categoryId]) {

    if (
      typeof picks[categoryId] === "string"
    ) {
      return picks[categoryId];
    }

    return (
      picks[categoryId].nomineeId ||
      picks[categoryId].NomineeId ||
      ""
    );

  }

  return "";

}


function buildCompareNomineeMap_(
  category
) {

  const map = {};

  const nominees =
    category.nominees ||
    category.Nominees ||
    [];

  nominees.forEach(function(nominee) {

    const nomineeId =
      String(
        nominee.nomineeId ||
        nominee.id ||
        nominee.NomineeId ||
        ""
      ).trim();

    if (!nomineeId) {
      return;
    }

    map[nomineeId] = {
      nomineeId: nomineeId,
      nominee:
        nominee.nominee ||
        nominee.name ||
        nominee.Nominee ||
        nominee.title ||
        nomineeId
    };

  });

  return map;

}


function buildComparePickDisplay_(
  nomineeId,
  nomineeMap
) {

  nomineeId =
    String(nomineeId || "")
      .trim();

  if (!nomineeId) {
    return null;
  }

  return nomineeMap[nomineeId] || {
    nomineeId: nomineeId,
    nominee: nomineeId
  };

}
