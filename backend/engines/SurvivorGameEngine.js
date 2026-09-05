/* =====================================================
   SURVIVOR / ELIMINATION GAME ENGINE v1.2.18w4

   Each ordered question is a Survivor round.
   The player selects an entry they believe will survive the round.
   The admin records the eliminated entry as the category winner/result.
   Picking that eliminated entry, or missing a settled round, eliminates
   the player from subsequent rounds.
===================================================== */

function survivorString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function survivorKey_(value) {
  return survivorString_(value).toLowerCase();
}

function survivorNumber_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
}

function survivorGameCategories_(gameId) {
  const categories = typeof getCategoriesCached === "function" ? getCategoriesCached(gameId) : getCategories(gameId);
  return (categories || []).slice().sort(function(a, b) {
    const aRound = survivorNumber_(a.roundNumber, 0);
    const bRound = survivorNumber_(b.roundNumber, 0);
    if (aRound > 0 && bRound > 0 && aRound !== bRound) return aRound - bRound;
    return survivorNumber_(a.displayOrder, 999) - survivorNumber_(b.displayOrder, 999);
  });
}

function survivorCategoryLocked_(game, category) {
  if (!game || !category) return true;
  if (game.lockAllPicks === true || category.locked === true) return true;
  const lockDateTime = category.lockDateTime ? new Date(category.lockDateTime) : null;
  return !!(lockDateTime && !isNaN(lockDateTime.getTime()) && Date.now() >= lockDateTime.getTime());
}

function survivorEvaluateUser_(username, gameId, pickMap, categories, resolutions) {
  const rounds = [];
  const eliminatedNomineeIds = {};
  let alive = true;
  let eliminatedRound = 0;
  let eliminatedReason = "";
  let roundsSurvived = 0;
  let totalPoints = 0;
  let currentRoundIndex = -1;

  (categories || []).forEach(function(category, index) {
    const categoryId = survivorKey_(category.id);
    const pick = pickMap && pickMap[categoryId] ? survivorKey_(pickMap[categoryId].nomineeId || pickMap[categoryId]) : "";
    const resolution = resolutions && resolutions[categoryId] ? resolutions[categoryId] : null;
    const rawResolved = !!(resolution && resolution.resolved === true && resolution.result === "winner");
    // Survivor rounds advance in order. If an earlier round is still open,
    // ignore any later result until that gap is settled so players cannot be
    // eliminated by an accidentally finalized future round.
    const resolved = rawResolved && currentRoundIndex === -1;
    const eliminatedIds = resolved
      ? (Array.isArray(resolution.winnerNomineeIds) && resolution.winnerNomineeIds.length
          ? resolution.winnerNomineeIds.map(survivorKey_).filter(Boolean)
          : [survivorKey_(resolution.winnerNomineeId)].filter(Boolean))
      : [];

    if (!resolved && currentRoundIndex === -1) currentRoundIndex = index;

    let status = "upcoming";
    let survived = false;
    let eliminated = false;
    let missed = false;
    let earnedPoints = 0;

    if (resolved) {
      eliminatedIds.forEach(function(id) { eliminatedNomineeIds[id] = true; });
      if (alive) {
        if (!pick) {
          alive = false;
          eliminated = true;
          missed = true;
          eliminatedRound = index + 1;
          eliminatedReason = "missed";
          status = "missed";
        } else if (eliminatedIds.indexOf(pick) !== -1) {
          alive = false;
          eliminated = true;
          eliminatedRound = index + 1;
          eliminatedReason = "picked-eliminated-entry";
          status = "eliminated";
        } else {
          survived = true;
          roundsSurvived++;
          earnedPoints = Math.max(0, survivorNumber_(category.points, 1));
          totalPoints += earnedPoints;
          status = "survived";
        }
      } else {
        status = "after-elimination";
      }
    } else if (alive && index === currentRoundIndex) {
      status = pick ? "picked" : "open";
    } else if (alive) {
      status = "upcoming";
    } else {
      status = "after-elimination";
    }

    rounds.push({
      round: index + 1,
      categoryId: category.id,
      name: category.name,
      points: Math.max(0, survivorNumber_(category.points, 1)),
      resolved: resolved,
      pickNomineeId: pick,
      eliminatedNomineeIds: eliminatedIds,
      survived: survived,
      eliminated: eliminated,
      missed: missed,
      earnedPoints: earnedPoints,
      status: status
    });
  });

  const complete = (categories || []).length > 0 && currentRoundIndex === -1;

  return {
    username: username,
    alive: alive,
    winner: alive && complete,
    complete: complete,
    eliminatedRound: eliminatedRound,
    eliminatedReason: eliminatedReason,
    roundsSurvived: roundsSurvived,
    totalPoints: totalPoints,
    currentRoundIndex: currentRoundIndex,
    rounds: rounds,
    eliminatedNomineeIds: eliminatedNomineeIds
  };
}

function survivorAllPickMaps_(gameId) {
  if (typeof buildUserPicksMap_ === "function") return buildUserPicksMap_(gameId);
  const map = {};
  const picks = typeof getPicksCached === "function" ? getPicksCached() : [];
  (picks || []).forEach(function(row) {
    if (survivorString_(row.gameId) !== survivorString_(gameId)) return;
    const username = survivorString_(row.username);
    const categoryId = survivorKey_(row.categoryId);
    if (!username || !categoryId) return;
    if (!map[username]) map[username] = {};
    map[username][categoryId] = row;
  });
  return map;
}

function survivorPickMapForUser_(pickMaps, username) {
  const maps = pickMaps || {};
  if (maps[username]) return maps[username];
  const wanted = survivorKey_(username);
  const match = Object.keys(maps).find(function(key) { return survivorKey_(key) === wanted; });
  return match ? maps[match] : {};
}

function survivorParticipantUsernames_(gameId, pickMaps, extraUsernames) {
  const usernames = {};
  function add(value) {
    const username = survivorString_(value);
    const key = survivorKey_(username);
    if (key && !usernames[key]) usernames[key] = username;
  }

  Object.keys(pickMaps || {}).forEach(add);
  (extraUsernames || []).forEach(add);

  if (typeof notificationPushGameParticipants_ === "function") {
    try {
      (notificationPushGameParticipants_(gameId) || []).forEach(add);
    } catch (err) {
      // Survivor standings must still work if notification/participant lookup is unavailable.
    }
  }

  return Object.keys(usernames).map(function(key) { return usernames[key]; });
}

function survivorSortStandings_(rows) {
  return (rows || []).sort(function(a, b) {
    if (!!a.survivorWinner !== !!b.survivorWinner) return a.survivorWinner ? -1 : 1;
    if (!!a.survivorAlive !== !!b.survivorAlive) return a.survivorAlive ? -1 : 1;
    if (survivorNumber_(b.survivorRoundsSurvived, 0) !== survivorNumber_(a.survivorRoundsSurvived, 0)) {
      return survivorNumber_(b.survivorRoundsSurvived, 0) - survivorNumber_(a.survivorRoundsSurvived, 0);
    }
    if (survivorNumber_(b.total, 0) !== survivorNumber_(a.total, 0)) {
      return survivorNumber_(b.total, 0) - survivorNumber_(a.total, 0);
    }
    return survivorString_(a.displayName).localeCompare(survivorString_(b.displayName));
  });
}

function apiGetSurvivorState_(payload) {
  payload = payload || {};
  const routedGameId = survivorString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  if (typeof survivorKingOfHillModeEnabled_ === "function" && survivorKingOfHillModeEnabled_(routedGameId)) {
    if (typeof apiGetKingOfHillStateRC24A_ === "function") {
      return apiGetKingOfHillStateRC24A_(Object.assign({}, payload, { gameId: routedGameId }));
    }
    if (typeof apiGetKingOfHillState_ === "function") {
      return apiGetKingOfHillState_(Object.assign({}, payload, { gameId: routedGameId }));
    }
  }
  if (typeof survivorSportsModeEnabled_ === "function" && survivorSportsModeEnabled_(routedGameId) && typeof apiGetSportsSurvivorState_ === "function") {
    return apiGetSportsSurvivorState_(Object.assign({}, payload, { gameId: routedGameId }));
  }
  const gameId = survivorString_(payload.gameId || (typeof getDefaultGameId === "function" ? getDefaultGameId() : ""));
  const username = survivorString_(payload.username);
  if (!gameId || !username) throw new Error("Username and GameId are required.");

  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || survivorKey_(game.type) !== "survivor") throw new Error("This game is not a Survivor / Elimination game.");

  const categories = survivorGameCategories_(gameId);
  const resolutions = typeof getCategoryResultsResolutionMap === "function" ? getCategoryResultsResolutionMap(gameId) : {};
  const pickResponse = apiGetMyPicks(username, gameId) || {};
  const userPickMap = {};
  Object.keys(pickResponse.picks || {}).forEach(function(categoryId) {
    userPickMap[survivorKey_(categoryId)] = { nomineeId: pickResponse.picks[categoryId] };
  });
  const evaluation = survivorEvaluateUser_(username, gameId, userPickMap, categories, resolutions);
  const currentIndex = evaluation.currentRoundIndex;
  const currentCategory = currentIndex >= 0 ? categories[currentIndex] : null;
  const currentRound = currentIndex >= 0 ? evaluation.rounds[currentIndex] : null;
  const eliminatedSet = evaluation.eliminatedNomineeIds || {};

  return {
    success: true,
    gameId: gameId,
    gameName: game.name || gameId,
    alive: evaluation.alive,
    winner: evaluation.winner,
    eliminatedRound: evaluation.eliminatedRound,
    eliminatedReason: evaluation.eliminatedReason,
    roundsSurvived: evaluation.roundsSurvived,
    totalPoints: evaluation.totalPoints,
    complete: evaluation.complete,
    currentRound: currentCategory ? {
      round: currentIndex + 1,
      categoryId: currentCategory.id,
      name: currentCategory.name,
      points: Math.max(0, survivorNumber_(currentCategory.points, 1)),
      locked: survivorCategoryLocked_(game, currentCategory),
      lockDateTime: currentCategory.lockDateTime || "",
      pickNomineeId: currentRound ? currentRound.pickNomineeId : "",
      canPick: evaluation.alive && !survivorCategoryLocked_(game, currentCategory),
      nominees: (currentCategory.nominees || []).filter(function(nominee) {
        return nominee && nominee.id && !eliminatedSet[survivorKey_(nominee.id)];
      }).map(function(nominee) {
        return {
          id: nominee.id,
          name: nominee.name,
          shortAnswer: nominee.shortAnswer || nominee.name,
          image: nominee.image || "",
          movie: nominee.movie || "",
          person: nominee.person || ""
        };
      })
    } : null,
    rounds: evaluation.rounds,
    standings: survivorLeaderboardData_(gameId, [username])
  };
}

function saveSurvivorPick_(payload) {
  payload = payload || {};
  const routedGameId = survivorString_(payload.gameId);
  if (typeof survivorKingOfHillModeEnabled_ === "function" && survivorKingOfHillModeEnabled_(routedGameId)) {
    throw new Error("King of the Hill is automatic. There is no weekly KOTH pick to submit.");
  }
  if (typeof survivorSportsModeEnabled_ === "function" && survivorSportsModeEnabled_(routedGameId) && typeof sportsSurvivorSavePick_ === "function") {
    return sportsSurvivorSavePick_(payload);
  }
  const gameId = survivorString_(payload.gameId);
  const username = survivorString_(payload.username);
  const categoryId = survivorKey_(payload.categoryId);
  const nomineeId = survivorKey_(payload.nomineeId);
  if (!gameId || !username || !categoryId || !nomineeId) throw new Error("Username, GameId, round, and survivor selection are required.");

  const game = typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || survivorKey_(game.type) !== "survivor") throw new Error("This game is not configured for Survivor play.");

  const state = apiGetSurvivorState_({ username: username, gameId: gameId });
  if (!state.alive) throw new Error("Your Survivor entry has already been eliminated.");
  if (!state.currentRound) throw new Error("There is no open Survivor round.");
  if (survivorKey_(state.currentRound.categoryId) !== categoryId) throw new Error("Only the current Survivor round can be picked.");
  if (!state.currentRound.canPick) throw new Error("The current Survivor round is locked.");
  const valid = (state.currentRound.nominees || []).some(function(nominee) { return survivorKey_(nominee.id) === nomineeId; });
  if (!valid) throw new Error("That entry is no longer available in this Survivor game.");

  return savePick({
    username: username,
    gameId: gameId,
    categoryId: categoryId,
    nomineeId: nomineeId,
    confidencePoints: 0,
    stakePoints: 0
  });
}

function survivorLeaderboardData_(gameId, extraUsernames) {
  if (typeof survivorKingOfHillModeEnabled_ === "function" && survivorKingOfHillModeEnabled_(gameId) && typeof kingOfHillLeaderboardData_ === "function") {
    return kingOfHillLeaderboardData_(gameId, extraUsernames);
  }
  if (typeof survivorSportsModeEnabled_ === "function" && survivorSportsModeEnabled_(gameId) && typeof sportsSurvivorStandings_ === "function") {
    return sportsSurvivorStandings_(gameId, extraUsernames);
  }
  const categories = survivorGameCategories_(gameId);
  const resolutions = typeof getCategoryResultsResolutionMap === "function" ? getCategoryResultsResolutionMap(gameId) : {};
  const pickMaps = survivorAllPickMaps_(gameId);
  const rows = [];
  const participants = survivorParticipantUsernames_(gameId, pickMaps, extraUsernames);

  participants.forEach(function(username) {
    const evaluation = survivorEvaluateUser_(username, gameId, survivorPickMapForUser_(pickMaps, username), categories, resolutions);
    const unresolvedPoints = evaluation.alive
      ? categories.reduce(function(sum, category, index) {
          const round = evaluation.rounds[index];
          return sum + (round && !round.resolved ? Math.max(0, survivorNumber_(category.points, 1)) : 0);
        }, 0)
      : 0;
    const profile = typeof getLeaderboardUserProfile_ === "function" ? (getLeaderboardUserProfile_(username, gameId) || {}) : {};

    rows.push({
      user: username,
      username: username,
      displayName: profile.displayName || username,
      avatar: profile.avatar || "👤",
      themeColor: profile.themeColor || profile.profileColor || "#354785",
      profileColor: profile.profileColor || profile.themeColor || "#354785",
      profileColorMode: profile.profileColorMode || "solid",
      profileColor2: profile.profileColor2 || "#354785",
      profileGradientAngle: profile.profileGradientAngle || "135",
      total: evaluation.totalPoints,
      remaining: unresolvedPoints,
      max: evaluation.totalPoints + unresolvedPoints,
      statues: 0,
      fixedPointsEnabled: true,
      fixedPoints: evaluation.totalPoints,
      fixedRemaining: unresolvedPoints,
      survivorAlive: evaluation.alive,
      survivorWinner: evaluation.winner,
      survivorComplete: evaluation.complete,
      survivorRoundsSurvived: evaluation.roundsSurvived,
      survivorEliminatedRound: evaluation.eliminatedRound,
      survivorEliminatedReason: evaluation.eliminatedReason,
      eliminated: !evaluation.alive,
      winChance: 0,
      scoringMode: "survivor",
      leaderboardScoreMode: "survivor"
    });
  });

  return survivorSortStandings_(rows);
}

function survivorUserScoring_(username, gameId) {
  if (typeof survivorKingOfHillModeEnabled_ === "function" && survivorKingOfHillModeEnabled_(gameId) && typeof kingOfHillUserScoring_ === "function") {
    return kingOfHillUserScoring_(username, gameId);
  }
  if (typeof survivorSportsModeEnabled_ === "function" && survivorSportsModeEnabled_(gameId) && typeof sportsSurvivorUserScoring_ === "function") {
    return sportsSurvivorUserScoring_(username, gameId);
  }
  const categories = survivorGameCategories_(gameId);
  const resolutions = typeof getCategoryResultsResolutionMap === "function" ? getCategoryResultsResolutionMap(gameId) : {};
  const pickMaps = survivorAllPickMaps_(gameId);
  const evaluation = survivorEvaluateUser_(username, gameId, survivorPickMapForUser_(pickMaps, username), categories, resolutions);
  const scoring = {};

  evaluation.rounds.forEach(function(round, index) {
    const category = categories[index];
    scoring[survivorKey_(round.categoryId)] = {
      shortName: category && (category.shortName || category.name) || round.name,
      nomineeId: round.pickNomineeId || "",
      winnerNomineeId: round.eliminatedNomineeIds && round.eliminatedNomineeIds[0] || "",
      earnedPoints: round.earnedPoints,
      remainingPoints: round.resolved || !evaluation.alive ? 0 : Math.max(0, survivorNumber_(round.points, 1)),
      finalPointsAvailable: Math.max(0, survivorNumber_(round.points, 1)),
      locked: round.resolved,
      resolved: round.resolved,
      correct: round.survived,
      wrong: round.eliminated,
      push: false,
      status: round.status,
      scoringMode: "survivor",
      confidenceScoringMode: ""
    };
  });
  return scoring;
}
