/* =========================
   LEADERBOARD COMPARE PICKS + WAGERS
   League-aware compare endpoint

   Reveals pick + wager only when:
   - Games.LockAllPicks = TRUE, OR
   - CategorySettings.Locked = TRUE.

   League behavior:
   - If leagueId is supplied, both users must be active members of that league.
   - If no leagueId is supplied for a league-scoped game, the user's first accessible league is used.
   - Picks/wagers are still stored once per Username + GameId.
========================= */

function apiCompareUserPicks(payload) {

  payload = payload || {};

  const username = String(payload.username || "").trim();
  const otherUsername = String(payload.otherUsername || payload.targetUsername || "").trim();
  const gameId = normalizeGameId_(payload.gameId || getDefaultGameId());
  const requestedLeagueId = normalizeLeagueId_(payload.leagueId || "");

  if (!username) {
    return { success: false, message: "Missing current username" };
  }

  if (!otherUsername) {
    return { success: false, message: "Missing user to compare" };
  }

  const access = userCanAccessGameFeature_(username, gameId, "comparePicks", requestedLeagueId);

  if (!access.allowed) {
    return {
      success: false,
      error: "Access denied: " + access.reason
    };
  }

  const leagueId = access.leagueId || requestedLeagueId || "";

  if (leagueId && !isUserActiveLeagueMember_(otherUsername, leagueId) && !isAdmin(username)) {
    return {
      success: false,
      error: "That user is not in the selected league."
    };
  }

  const viewer = getLeaderboardUserProfile_(username, gameId);
  const opponent = getLeaderboardUserProfile_(otherUsername, gameId);
  const categories = getCategories(gameId) || [];
  const settings = getCategorySettings(gameId) || {};
  const viewerPicks = compareGetUserPicks_(username, gameId);
  const opponentPicks = compareGetUserPicks_(otherUsername, gameId);
  const viewerBets = compareGetUserBets_(username, gameId, settings);
  const opponentBets = compareGetUserBets_(otherUsername, gameId, settings);
  const gameLocked = isLeaderboardCompareGameLocked_(gameId);

  let visibleCount = 0;
  let hiddenCount = 0;
  let samePickCount = 0;
  let differentPickCount = 0;
  let sameWagerAmountCount = 0;
  let differentWagerAmountCount = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let collapsedEmptyCount = 0;

  const rows = categories.map(function(category) {

    const categoryId = compareCategoryId_(category);
    const setting = settings[categoryId] || {};
    const categoryLocked = isLeaderboardCompareCategoryLocked_(setting, category);
    const visible = gameLocked || categoryLocked;
    const nomineeMap = buildCompareNomineeMap_(category);

    const viewerPickObj = comparePickForCategory_(viewerPicks, categoryId);
    const opponentPickObj = comparePickForCategory_(opponentPicks, categoryId);
    const viewerPickId = comparePickIdFromObject_(viewerPickObj);
    const opponentPickId = comparePickIdFromObject_(opponentPickObj);
    const viewerBet = compareBetForCategory_(viewerBets, categoryId);
    const opponentBet = compareBetForCategory_(opponentBets, categoryId);

    const hasViewerActivity = !!viewerPickId || !!viewerBet;
    const hasOpponentActivity = !!opponentPickId || !!opponentBet;
    const hasAnyActivity = hasViewerActivity || hasOpponentActivity;

    if (!hasAnyActivity) {
      collapsedEmptyCount++;
      return null;
    }

    if (visible) {
      visibleCount++;
    } else {
      hiddenCount++;
    }

    const viewerPrimaryPickId = viewerPickId || (viewerBet && viewerBet.nomineeId) || "";
    const opponentPrimaryPickId = opponentPickId || (opponentBet && opponentBet.nomineeId) || "";

    const samePick = visible && !!viewerPrimaryPickId && !!opponentPrimaryPickId && compareKey_(viewerPrimaryPickId) === compareKey_(opponentPrimaryPickId);

    const viewerBetAmount = viewerBet ? Number(viewerBet.betAmount) || 0 : 0;
    const opponentBetAmount = opponentBet ? Number(opponentBet.betAmount) || 0 : 0;

    const sameWagerAmount = visible && !!viewerBet && !!opponentBet && viewerBetAmount === opponentBetAmount;
    const sameWagerSelection = visible && !!viewerBet && !!opponentBet && compareKey_(viewerBet.nomineeId) === compareKey_(opponentBet.nomineeId);

    const winnerNomineeId = compareWinnerNomineeId_(setting, category);
    const viewerCorrect = visible ? compareCorrectness_(viewerPrimaryPickId, winnerNomineeId) : null;
    const opponentCorrect = visible ? compareCorrectness_(opponentPrimaryPickId, winnerNomineeId) : null;

    const hasCorrect = viewerCorrect === true || opponentCorrect === true;
    const hasWrong = viewerCorrect === false || opponentCorrect === false;

    if (visible) {
      if (samePick) {
        samePickCount++;
      } else if (viewerPrimaryPickId || opponentPrimaryPickId) {
        differentPickCount++;
      }

      if (sameWagerAmount) {
        sameWagerAmountCount++;
      } else if (viewerBet || opponentBet) {
        differentWagerAmountCount++;
      }

      if (hasCorrect) {
        correctCount++;
      }

      if (hasWrong) {
        wrongCount++;
      }
    }

    const latestActivityMs = compareLatestActivityMs_(viewerPickObj, opponentPickObj, viewerBet, opponentBet);

    return {
      gameId: gameId,
      leagueId: leagueId,
      categoryId: categoryId,
      category: category.category || category.name || category.title || category.shortName || categoryId,
      points: Number(setting.points || category.points) || 0,
      locked: categoryLocked,
      gameLocked: gameLocked,
      visible: visible,
      hasAnyActivity: hasAnyActivity,
      latestActivityMs: latestActivityMs,
      latestActivityIso: latestActivityMs ? new Date(latestActivityMs).toISOString() : "",
      winnerNomineeId: winnerNomineeId,
      viewerPick: visible ? buildComparePickDisplay_(viewerPrimaryPickId, nomineeMap) : null,
      opponentPick: visible ? buildComparePickDisplay_(opponentPrimaryPickId, nomineeMap) : null,
      viewerWager: visible ? buildCompareWagerDisplay_(viewerBet, nomineeMap) : null,
      opponentWager: visible ? buildCompareWagerDisplay_(opponentBet, nomineeMap) : null,
      viewerCorrect: viewerCorrect,
      opponentCorrect: opponentCorrect,
      samePick: samePick,
      sameWagerSelection: sameWagerSelection,
      sameWagerAmount: sameWagerAmount,
      wagerAmountDifference: visible ? roundCompareMoney_(viewerBetAmount - opponentBetAmount) : 0,
      filterFlags: {
        samePick: samePick,
        differentPick: visible && !samePick && !!(viewerPrimaryPickId || opponentPrimaryPickId),
        sameWager: sameWagerAmount,
        differentWager: visible && !sameWagerAmount && !!(viewerBet || opponentBet),
        correct: hasCorrect,
        wrong: hasWrong,
        hidden: !visible,
        hasWager: !!(viewerBet || opponentBet)
      }
    };

  }).filter(function(row) {
    return row && !!row.categoryId;
  }).sort(function(a, b) {
    if (b.latestActivityMs !== a.latestActivityMs) {
      return b.latestActivityMs - a.latestActivityMs;
    }
    return String(a.category || "").localeCompare(String(b.category || ""));
  });

  return {
    success: true,
    gameId: gameId,
    leagueId: leagueId,
    leagueName: access.leagueName || "",
    gameLocked: gameLocked,
    viewer: viewer,
    opponent: opponent,
    categories: rows,
    summary: {
      visible: visibleCount,
      hidden: hiddenCount,
      samePick: samePickCount,
      differentPick: differentPickCount,
      sameWagerAmount: sameWagerAmountCount,
      differentWagerAmount: differentWagerAmountCount,
      correct: correctCount,
      wrong: wrongCount,
      collapsedEmpty: collapsedEmptyCount,
      totalShown: rows.length
    }
  };

}

function isLeaderboardCompareGameLocked_(gameId) {

  try {
    let game = null;

    if (typeof getGameRuntimeConfig === "function") {
      game = getGameRuntimeConfig(gameId);
    } else if (typeof getGame === "function") {
      game = getGame(gameId);
    }

    if (!game) {
      return false;
    }

    return (
      game.lockAllPicks === true ||
      String(game.lockAllPicks || "").trim().toLowerCase() === "true" ||
      game.LockAllPicks === true ||
      String(game.LockAllPicks || "").trim().toLowerCase() === "true"
    );
  } catch (err) {
    return false;
  }

}

function isLeaderboardCompareCategoryLocked_(setting, category) {

  setting = setting || {};
  category = category || {};

  return (
    setting.locked === true ||
    String(setting.locked || "").trim().toLowerCase() === "true" ||
    setting.Locked === true ||
    String(setting.Locked || "").trim().toLowerCase() === "true" ||
    category.locked === true ||
    String(category.locked || "").trim().toLowerCase() === "true"
  );

}

function compareGetUserPicks_(username, gameId) {
  try {
    return typeof getUserPicks === "function" ? getUserPicks(username, gameId) || [] : [];
  } catch (err) {
    return [];
  }
}

function compareGetUserBets_(username, gameId, settings) {

  try {
    const bets = typeof getUserBets === "function" ? getUserBets(username, gameId) || [] : [];

    return bets.map(function(bet) {
      let status = "pending";
      let payout = 0;

      try {
        if (typeof getBetResolution_ === "function") {
          const resolution = getBetResolution_(bet, settings || {});
          status = resolution.status || status;
          payout = Number(resolution.payout) || 0;
        }
      } catch (err) {}

      const betAmount = roundCompareMoney_(bet.betAmount);
      const odds = Number(bet.odds) || 0;

      return Object.assign({}, bet, {
        betAmount: betAmount,
        odds: odds,
        potentialReturn: roundCompareMoney_(bet.potentialReturn || (betAmount * odds)),
        status: status,
        payout: roundCompareMoney_(payout)
      });
    });
  } catch (err) {
    return [];
  }

}

function compareCategoryId_(category) {
  return compareKey_(category.categoryId || category.id || category.CategoryId || "");
}

function comparePickForCategory_(picks, categoryId) {

  categoryId = compareKey_(categoryId);

  if (!picks || !categoryId) {
    return null;
  }

  if (Array.isArray(picks)) {
    return picks.find(function(pick) {
      return compareKey_(pick.categoryId || pick.CategoryId || "") === categoryId;
    }) || null;
  }

  const direct = picks[categoryId] || picks[String(categoryId)];

  if (!direct) {
    return null;
  }

  if (typeof direct === "string") {
    return {
      categoryId: categoryId,
      nomineeId: direct
    };
  }

  return direct;

}

function comparePickIdFromObject_(pick) {

  if (!pick) {
    return "";
  }

  if (typeof pick === "string") {
    return pick;
  }

  return String(pick.nomineeId || pick.NomineeId || pick.id || "").trim();

}

function compareBetForCategory_(bets, categoryId) {

  categoryId = compareKey_(categoryId);

  if (!Array.isArray(bets) || !categoryId) {
    return null;
  }

  return bets.find(function(bet) {
    return compareKey_(bet.categoryId || bet.CategoryId || "") === categoryId;
  }) || null;

}

function compareWinnerNomineeId_(setting, category) {

  setting = setting || {};
  category = category || {};

  return compareKey_(
    setting.winnerNomineeId ||
    setting.WinnerNomineeId ||
    category.winnerNomineeId ||
    category.WinnerNomineeId ||
    ""
  );

}

function compareCorrectness_(nomineeId, winnerNomineeId) {

  nomineeId = compareKey_(nomineeId);
  winnerNomineeId = compareKey_(winnerNomineeId);

  if (!nomineeId || !winnerNomineeId) {
    return null;
  }

  return nomineeId === winnerNomineeId;

}

function compareLatestActivityMs_() {

  let latest = 0;

  for (let i = 0; i < arguments.length; i++) {
    const ms = compareDateMs_(arguments[i]);
    if (ms > latest) {
      latest = ms;
    }
  }

  return latest;

}

function compareDateMs_(obj) {

  if (!obj || typeof obj !== "object") {
    return 0;
  }

  const value =
    obj.lastUpdated || obj.LastUpdated ||
    obj.updated || obj.Updated ||
    obj.timestamp || obj.Timestamp ||
    obj.createdAt || obj.CreatedAt ||
    obj.date || obj.Date ||
    "";

  if (!value) {
    return 0;
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return value.getTime();
  }

  const ms = new Date(value).getTime();
  return isNaN(ms) ? 0 : ms;

}

function buildCompareNomineeMap_(category) {

  const map = {};
  const nominees = category.nominees || category.Nominees || [];

  nominees.forEach(function(nominee) {
    const nomineeId = compareKey_(nominee.nomineeId || nominee.id || nominee.NomineeId || "");

    if (!nomineeId) {
      return;
    }

    map[nomineeId] = {
      nomineeId: nomineeId,
      nominee:
        nominee.nominee || nominee.name || nominee.Nominee || nominee.title ||
        nominee.shortAnswer || nominee.selection || nomineeId,
      image:
        nominee.image || nominee.Image || nominee.posterUrl || nominee.poster ||
        nominee.categoryImage || nominee.CategoryImage || "",
      movie: nominee.movie || nominee.Movie || "",
      person: nominee.person || nominee.Person || ""
    };
  });

  return map;

}

function buildComparePickDisplay_(nomineeId, nomineeMap) {

  nomineeId = compareKey_(nomineeId);

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

function buildCompareWagerDisplay_(bet, nomineeMap) {

  if (!bet) {
    return null;
  }

  const nomineeId = compareKey_(bet.nomineeId || bet.NomineeId || "");
  const pick = buildComparePickDisplay_(nomineeId, nomineeMap);
  const betAmount = roundCompareMoney_(bet.betAmount);
  const odds = Number(bet.odds) || 0;

  return {
    nomineeId: nomineeId,
    nominee: pick ? pick.nominee : nomineeId,
    image: pick ? pick.image : "",
    betAmount: betAmount,
    odds: odds,
    potentialReturn: roundCompareMoney_(bet.potentialReturn || (betAmount * odds)),
    status: bet.status || "pending",
    payout: roundCompareMoney_(bet.payout)
  };

}

function compareKey_(value) {
  return String(value || "").trim().toLowerCase();
}

function roundCompareMoney_(value) {
  const n = Number(value) || 0;
  return Math.round(n * 100) / 100;
}
