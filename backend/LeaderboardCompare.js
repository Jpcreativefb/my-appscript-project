/* =========================
   LEADERBOARD COMPARE PICKS
   DROP-IN FILE: backend/LeaderboardCompare.gs

   Purpose:
   - View another user's picks.
   - Compare another user's picks to your own.
   - Only exposes picks for locked categories or finished/locked games.

   Public API:
   - apiCompareUserPicks(payload)
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
    ) || [];

  const opponentPicks =
    getUserPicks(
      otherUsername,
      gameId
    ) || [];

  const gameFinished =
    isLeaderboardCompareGameFinished_(
      gameId
    );

  const rows = [];

  let visibleCount = 0;
  let hiddenCount = 0;
  let sameCount = 0;
  let differentCount = 0;

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
        setting,
        category
      );

    const visible =
      gameFinished ||
      categoryLocked;

    if (visible) {
      visibleCount++;
    } else {
      hiddenCount++;
    }

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

    const samePick =
      visible &&
      !!viewerPickId &&
      !!opponentPickId &&
      String(viewerPickId) ===
      String(opponentPickId);

    if (visible) {

      if (samePick) {
        sameCount++;
      } else if (
        viewerPickId ||
        opponentPickId
      ) {
        differentCount++;
      }

    }

    rows.push({
      gameId:
        gameId,

      categoryId:
        categoryId,

      category:
        category.category ||
        category.name ||
        category.title ||
        categoryId,

      locked:
        categoryLocked,

      gameFinished:
        gameFinished,

      visible:
        visible,

      points:
        Number(setting.points || category.points) || 0,

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
        samePick
    });

  });

  return {
    success: true,
    gameId: gameId,
    viewer: viewerProfile,
    opponent: opponentProfile,
    categories: rows,
    summary: {
      visible:
        visibleCount,
      hidden:
        hiddenCount,
      same:
        sameCount,
      different:
        differentCount
    }
  };

}


function isLeaderboardCompareCategoryLocked_(
  setting,
  category
) {

  setting =
    setting || {};

  category =
    category || {};

  return (
    setting.locked === true ||
    String(setting.locked || "")
      .trim()
      .toLowerCase() === "true" ||
    setting.Locked === true ||
    String(setting.Locked || "")
      .trim()
      .toLowerCase() === "true" ||
    category.locked === true ||
    String(category.locked || "")
      .trim()
      .toLowerCase() === "true"
  );

}


function isLeaderboardCompareGameFinished_(
  gameId
) {

  try {

    let game = null;

    if (typeof getGameRuntimeConfig === "function") {

      game =
        getGameRuntimeConfig(
          gameId
        );

    } else if (typeof getGame === "function") {

      game =
        getGame(
          gameId
        );

    }

    if (!game) {
      return false;
    }

    const status =
      String(game.status || game.Status || "")
        .trim()
        .toLowerCase();

    const lockAll =
      game.lockAllPicks === true ||
      String(game.lockAllPicks || "")
        .trim()
        .toLowerCase() === "true" ||
      game.LockAllPicks === true ||
      String(game.LockAllPicks || "")
        .trim()
        .toLowerCase() === "true";

    return (
      lockAll ||
      status === "finished" ||
      status === "complete" ||
      status === "completed" ||
      status === "closed" ||
      status === "final"
    );

  } catch (err) {

    return false;

  }

}


function getComparePickNomineeId_(
  picks,
  categoryId
) {

  categoryId =
    String(categoryId || "")
      .trim()
      .toLowerCase();

  if (!picks || !categoryId) {
    return "";
  }

  if (Array.isArray(picks)) {

    const found =
      picks.find(function(pick) {

        return String(
          pick.categoryId ||
          pick.CategoryId ||
          ""
        )
          .trim()
          .toLowerCase() === categoryId;

      });

    if (!found) {
      return "";
    }

    return String(
      found.nomineeId ||
      found.NomineeId ||
      ""
    ).trim();

  }

  const direct =
    picks[categoryId] ||
    picks[String(categoryId)];

  if (!direct) {
    return "";
  }

  if (typeof direct === "string") {
    return direct;
  }

  return String(
    direct.nomineeId ||
    direct.NomineeId ||
    direct.id ||
    ""
  ).trim();

}


function buildCompareNomineeMap_(
  category
) {

  const map = {};

  const nominees =
    category && (
      category.nominees ||
      category.Nominees
    )
      ? category.nominees || category.Nominees
      : [];

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
        nominee.shortAnswer ||
        nomineeId,
      image:
        nominee.image ||
        nominee.Image ||
        "",
      movie:
        nominee.movie ||
        "",
      person:
        nominee.person ||
        ""
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
    nominee: nomineeId,
    image: "",
    movie: "",
    person: ""
  };

}
