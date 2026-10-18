/* =====================================================
   MOVIE COMMUNITY AWARDS — AUTHORITY ADAPTER R1

   Completion layer over the existing MovieTracker + RankingEntries
   authorities. This is not a new canonical game type. A Ranking game
   becomes a Movie Community Awards event when it has active
   CommunityRank categories with MovieId-backed nominees.
===================================================== */

const MOVIE_COMMUNITY_SEEN_CATEGORY = "__seen_movies__";

function movieCommunityAwardsKey_(value) {
  return String(value === undefined || value === null ? "" : value).trim().toLowerCase();
}

function movieCommunityAwardsString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function movieCommunityAwardsNumber_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
}

function movieCommunityAwardsCategories_(gameId) {
  const categories = typeof getCategoriesCached === "function"
    ? getCategoriesCached(gameId)
    : getCategories(gameId);

  return (categories || []).filter(function(category) {
    if (!category || category.communityRank !== true) return false;
    return (category.nominees || []).some(function(nominee) {
      return nominee && movieCommunityAwardsString_(nominee.movieId);
    });
  }).sort(function(a, b) {
    const sectionCompare = movieCommunityAwardsString_(a.section)
      .localeCompare(movieCommunityAwardsString_(b.section));
    if (sectionCompare) return sectionCompare;
    return movieCommunityAwardsNumber_(a.displayOrder, 999) -
      movieCommunityAwardsNumber_(b.displayOrder, 999);
  });
}

function movieCommunityAwardsIsGame_(gameId) {
  gameId = movieCommunityAwardsString_(gameId);
  if (!gameId) return false;
  const game = typeof getGameRuntimeConfig === "function"
    ? getGameRuntimeConfig(gameId)
    : getGame(gameId);
  if (!game) return false;
  const rankingGame = movieCommunityAwardsKey_(game.type) === "ranking" || game.rankingEnabled === true;
  return rankingGame && movieCommunityAwardsCategories_(gameId).length > 0;
}

function movieCommunityAwardsDateReached_(value) {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && Date.now() >= date.getTime();
}

function movieCommunityAwardsDatePending_(value) {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && Date.now() < date.getTime();
}

function movieCommunityAwardsLocked_(game, category) {
  if (!game) return true;
  if (
    game.lockAllPicks === true ||
    game.votingLocked === true ||
    game.resultsFinalized === true
  ) return true;
  if (movieCommunityAwardsDatePending_(game.availableFrom)) return true;
  if (movieCommunityAwardsDateReached_(game.availableUntil)) return true;
  if (category) {
    if (category.locked === true) return true;
    if (movieCommunityAwardsDateReached_(category.lockDateTime)) return true;
  }
  return false;
}

function movieCommunityAwardsEligibleMovies_(gameId) {
  const movies = typeof getMoviesFromCategories === "function"
    ? getMoviesFromCategories(gameId)
    : [];
  const map = {};
  (movies || []).forEach(function(movie) {
    const movieId = movieCommunityAwardsKey_(movie && movie.movieId);
    if (movieId) map[movieId] = movie;
  });
  return map;
}

function movieCommunityAwardsCategoryNominees_(category) {
  return (category && category.nominees || []).filter(function(nominee) {
    return nominee && nominee.id && movieCommunityAwardsString_(nominee.movieId);
  });
}

function movieCommunityAwardsCoverageWeight_(seenCount, totalNominees) {
  if (typeof getUserVoteWeight === "function") {
    return getUserVoteWeight(seenCount, totalNominees);
  }
  seenCount = Math.max(0, movieCommunityAwardsNumber_(seenCount, 0));
  totalNominees = Math.max(0, movieCommunityAwardsNumber_(totalNominees, 0));
  if (!totalNominees) return 0;
  return Math.sqrt(Math.min(seenCount, totalNominees) / totalNominees);
}

function movieCommunityAwardsNormalizedScores_(ballot) {
  const ordered = (ballot || []).slice().sort(function(a, b) {
    return movieCommunityAwardsNumber_(a.rank, 0) - movieCommunityAwardsNumber_(b.rank, 0);
  });
  const n = ordered.length;
  if (!n) return {};
  const total = n * (n + 1) / 2;
  const scores = {};
  ordered.forEach(function(row, index) {
    const nomineeId = movieCommunityAwardsKey_(row.nomineeId);
    if (!nomineeId) return;
    scores[nomineeId] = (n - index) / total;
  });
  return scores;
}

function movieCommunityAwardsValidateBallot_(category, rankings, seenMap) {
  rankings = Array.isArray(rankings) ? rankings : [];
  const eligible = {};
  movieCommunityAwardsCategoryNominees_(category).forEach(function(nominee) {
    eligible[movieCommunityAwardsKey_(nominee.id)] = nominee;
  });

  const usedNominees = {};
  const usedRanks = {};
  rankings.forEach(function(item) {
    const nomineeId = movieCommunityAwardsKey_(item && item.nomineeId);
    const rank = movieCommunityAwardsNumber_(item && item.rank, 0);
    const nominee = eligible[nomineeId];
    if (!nominee) throw new Error("Invalid nominee in Movie Community Awards ranking.");
    const movieId = movieCommunityAwardsKey_(nominee.movieId);
    if (!movieId || seenMap[movieId] !== true) {
      throw new Error("Only movies you marked Seen may be ranked.");
    }
    if (usedNominees[nomineeId]) throw new Error("Each nominee may only be ranked once.");
    if (rank < 1 || Math.floor(rank) !== rank || rank > rankings.length) {
      throw new Error("Ranking positions must be contiguous from 1 through the submitted subset.");
    }
    if (usedRanks[rank]) throw new Error("Each ranking position may only be used once.");
    usedNominees[nomineeId] = true;
    usedRanks[rank] = true;
  });

  for (let rank = 1; rank <= rankings.length; rank++) {
    if (!usedRanks[rank]) throw new Error("Ranking positions must be contiguous from 1 through the submitted subset.");
  }
  return true;
}

function movieCommunityAwardsWriteBallot_(username, gameId, categoryId, rankings) {
  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
  if (!lock.tryLock(2500)) {
    throw new Error("Could not save ranking: another write is finishing. Please try once more.");
  }

  try {
    const sh = rankingEnsureSheet_();
    const data = sh.getDataRange().getValues();
    const headers = data[0].map(rankingString_);
    const col = rankingHeaderMap_(headers);
    const matchingRows = [];

    for (let i = 1; i < data.length; i++) {
      const same = rankingString_(data[i][col.gameid]) === gameId &&
        rankingString_(data[i][col.username]) === username &&
        rankingKey_(data[i][col.categoryid]) === categoryId;
      if (same) matchingRows.push(i + 1);
    }

    const now = new Date();
    const newRows = rankings.map(function(item) {
      const row = new Array(headers.length).fill("");
      row[col.timestamp] = now;
      row[col.updatedat] = now;
      row[col.gameid] = gameId;
      row[col.username] = username;
      row[col.categoryid] = categoryId;
      row[col.nomineeid] = movieCommunityAwardsKey_(item.nomineeId);
      row[col.rank] = movieCommunityAwardsNumber_(item.rank, 0);
      row[col.locked] = false;
      return row;
    });

    const reuseCount = Math.min(matchingRows.length, newRows.length);
    for (let i = 0; i < reuseCount; i++) {
      sh.getRange(matchingRows[i], 1, 1, headers.length).setValues([newRows[i]]);
    }
    if (newRows.length > reuseCount) {
      const appendRows = newRows.slice(reuseCount);
      sh.getRange(sh.getLastRow() + 1, 1, appendRows.length, headers.length).setValues(appendRows);
    }
    if (matchingRows.length > newRows.length) {
      matchingRows.slice(newRows.length).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
        sh.deleteRow(rowNumber);
      });
    }

    SpreadsheetApp.flush();
    if (typeof clearPlayerActionCaches === "function") {
      clearPlayerActionCaches(gameId, [RANKING_ENTRIES_SHEET], username);
    } else if (typeof clearGameCaches === "function") {
      clearGameCaches(gameId);
    }
    return { success: true, gameId: gameId, categoryId: categoryId, saved: newRows.length };
  } finally {
    lock.releaseLock();
  }
}

function movieCommunityAwardsPruneUnseenRankings_(username, gameId, seenMap) {
  const categories = movieCommunityAwardsCategories_(gameId);
  const nomineeMovies = {};
  categories.forEach(function(category) {
    movieCommunityAwardsCategoryNominees_(category).forEach(function(nominee) {
      nomineeMovies[movieCommunityAwardsKey_(nominee.id)] = movieCommunityAwardsKey_(nominee.movieId);
    });
  });

  const ballots = rankingGetUserEntries_(username, gameId);
  Object.keys(ballots).forEach(function(categoryId) {
    const kept = (ballots[categoryId] || []).filter(function(row) {
      const movieId = nomineeMovies[movieCommunityAwardsKey_(row.nomineeId)];
      return movieId && seenMap[movieId] === true;
    }).sort(function(a, b) { return a.rank - b.rank; }).map(function(row, index) {
      return { nomineeId: row.nomineeId, rank: index + 1 };
    });
    movieCommunityAwardsWriteBallot_(username, gameId, categoryId, kept);
  });
}

function movieCommunityAwardsSave_(payload) {
  payload = payload || {};
  const gameId = movieCommunityAwardsString_(payload.gameId);
  const username = movieCommunityAwardsString_(payload.username);
  const categoryId = movieCommunityAwardsKey_(payload.categoryId);
  const rankings = Array.isArray(payload.rankings) ? payload.rankings : [];
  if (!gameId || !username || !categoryId) throw new Error("Username, GameId, and CategoryId are required.");
  if (!movieCommunityAwardsIsGame_(gameId)) throw new Error("Movie Community Awards is not enabled for this Ranking game.");

  const game = typeof getGameRuntimeConfig === "function"
    ? getGameRuntimeConfig(gameId)
    : getGame(gameId);

  if (categoryId === MOVIE_COMMUNITY_SEEN_CATEGORY) {
    if (movieCommunityAwardsLocked_(game, null)) throw new Error("Movie Community Awards is locked.");
    const eligibleMovies = movieCommunityAwardsEligibleMovies_(gameId);
    const seenData = {};
    Object.keys(eligibleMovies).forEach(function(movieId) { seenData[movieId] = false; });
    rankings.forEach(function(item) {
      const movieId = movieCommunityAwardsKey_(item && (item.movieId || item.nomineeId));
      if (!eligibleMovies[movieId]) throw new Error("Movie is not eligible for this event.");
      seenData[movieId] = true;
    });
    const saved = saveSeenMovies(username, seenData, gameId);
    const seenMap = getSeenMovies(username, gameId);
    movieCommunityAwardsPruneUnseenRankings_(username, gameId, seenMap);
    return {
      success: saved && saved.success !== false,
      gameId: gameId,
      categoryId: categoryId,
      seenCount: Object.keys(seenMap).filter(function(movieId) { return seenMap[movieId] === true; }).length
    };
  }

  const category = movieCommunityAwardsCategories_(gameId).find(function(item) {
    return movieCommunityAwardsKey_(item.id) === categoryId;
  });
  if (!category) throw new Error("Movie Community Awards category not found.");
  if (movieCommunityAwardsLocked_(game, category)) throw new Error("This Movie Community Awards category is locked.");

  const seenMap = getSeenMovies(username, gameId);
  movieCommunityAwardsValidateBallot_(category, rankings, seenMap);
  return movieCommunityAwardsWriteBallot_(username, gameId, categoryId, rankings);
}

function movieCommunityAwardsCategoryResults_(gameId, category, entriesByUser) {
  const nominees = movieCommunityAwardsCategoryNominees_(category);
  const nomineeById = {};
  nominees.forEach(function(nominee) {
    nomineeById[movieCommunityAwardsKey_(nominee.id)] = nominee;
  });
  const totalNominees = nominees.length;
  const aggregate = {};
  nominees.forEach(function(nominee) {
    const id = movieCommunityAwardsKey_(nominee.id);
    aggregate[id] = {
      nomineeId: id,
      movieId: movieCommunityAwardsKey_(nominee.movieId),
      name: nominee.name || nominee.shortAnswer || id,
      movie: nominee.movie || "",
      image: nominee.image || "",
      score: 0,
      firstPlaceVotes: 0,
      weightedRankTotal: 0,
      weightTotal: 0,
      ballots: 0
    };
  });

  Object.keys(entriesByUser || {}).forEach(function(username) {
    const ballot = entriesByUser[username] && entriesByUser[username][movieCommunityAwardsKey_(category.id)] || [];
    if (!ballot.length) return;
    const seenMap = getSeenMovies(username, gameId);
    const seenCount = nominees.reduce(function(total, nominee) {
      return total + (seenMap[movieCommunityAwardsKey_(nominee.movieId)] === true ? 1 : 0);
    }, 0);
    const validBallot = ballot.filter(function(row) {
      const nominee = nomineeById[movieCommunityAwardsKey_(row.nomineeId)];
      return nominee && seenMap[movieCommunityAwardsKey_(nominee.movieId)] === true;
    }).sort(function(a, b) { return a.rank - b.rank; }).map(function(row, index) {
      return { nomineeId: movieCommunityAwardsKey_(row.nomineeId), rank: index + 1 };
    });
    if (!validBallot.length) return;

    const weight = movieCommunityAwardsCoverageWeight_(seenCount, totalNominees);
    const normalized = movieCommunityAwardsNormalizedScores_(validBallot);
    validBallot.forEach(function(row) {
      const target = aggregate[row.nomineeId];
      if (!target) return;
      target.score += (normalized[row.nomineeId] || 0) * weight;
      target.ballots += 1;
      target.weightedRankTotal += row.rank * weight;
      target.weightTotal += weight;
      if (row.rank === 1) target.firstPlaceVotes += 1;
    });
  });

  return Object.keys(aggregate).map(function(id) {
    const row = aggregate[id];
    return {
      nomineeId: row.nomineeId,
      movieId: row.movieId,
      name: row.name,
      movie: row.movie,
      image: row.image,
      score: Math.round(row.score * 1000000) / 1000000,
      firstPlaceVotes: row.firstPlaceVotes,
      averageRank: row.weightTotal > 0
        ? Math.round((row.weightedRankTotal / row.weightTotal) * 1000) / 1000
        : 0,
      ballots: row.ballots
    };
  }).sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.firstPlaceVotes !== a.firstPlaceVotes) return b.firstPlaceVotes - a.firstPlaceVotes;
    if (a.averageRank && b.averageRank && a.averageRank !== b.averageRank) return a.averageRank - b.averageRank;
    return a.nomineeId.localeCompare(b.nomineeId);
  }).map(function(row, index) {
    row.place = index + 1;
    return row;
  });
}

function movieCommunityAwardsGetState_(payload) {
  payload = payload || {};
  const gameId = movieCommunityAwardsString_(payload.gameId);
  const username = movieCommunityAwardsString_(payload.username);
  if (!gameId || !username) throw new Error("GameId and Username are required.");
  if (!movieCommunityAwardsIsGame_(gameId)) throw new Error("Movie Community Awards is not enabled for this Ranking game.");

  const game = typeof getGameRuntimeConfig === "function"
    ? getGameRuntimeConfig(gameId)
    : getGame(gameId);
  const categories = movieCommunityAwardsCategories_(gameId);
  const tracker = getMovieTrackerData(username, gameId);
  const seenMap = tracker.seen || {};
  const ballots = rankingGetUserEntries_(username, gameId);
  const entriesByUser = game.resultsFinalized === true ? rankingGetEntriesByUser_(gameId) : null;

  return {
    success: true,
    mode: "movie-community-awards",
    gameId: gameId,
    gameName: game.name || gameId,
    locked: movieCommunityAwardsLocked_(game, null),
    availableFrom: game.availableFrom || "",
    deadline: game.availableUntil || "",
    resultsRevealed: game.resultsFinalized === true,
    adminRoute: "admin-game-setup:" + gameId,
    formula: "normalized Borda score × sqrt(seen eligible nominees / total eligible nominees)",
    movieTracker: tracker,
    categories: categories.map(function(category) {
      const categoryId = movieCommunityAwardsKey_(category.id);
      const eligibleNominees = movieCommunityAwardsCategoryNominees_(category);
      const seenNominees = eligibleNominees.filter(function(nominee) {
        return seenMap[movieCommunityAwardsKey_(nominee.movieId)] === true;
      });
      const seenNomineeSet = {};
      seenNominees.forEach(function(nominee) { seenNomineeSet[movieCommunityAwardsKey_(nominee.id)] = true; });
      const ballot = (ballots[categoryId] || []).filter(function(row) {
        return seenNomineeSet[movieCommunityAwardsKey_(row.nomineeId)] === true;
      }).sort(function(a, b) { return a.rank - b.rank; }).map(function(row, index) {
        return { nomineeId: row.nomineeId, rank: index + 1 };
      });
      const locked = movieCommunityAwardsLocked_(game, category);
      return {
        id: category.id,
        name: category.name,
        section: category.section || "Main",
        displayOrder: category.displayOrder,
        locked: locked,
        lockDateTime: category.lockDateTime || "",
        eligibleNomineeCount: eligibleNominees.length,
        seenNomineeCount: seenNominees.length,
        coverageWeight: movieCommunityAwardsCoverageWeight_(seenNominees.length, eligibleNominees.length),
        ballot: ballot,
        nominees: seenNominees.map(function(nominee) {
          return {
            id: nominee.id,
            name: nominee.name,
            shortAnswer: nominee.shortAnswer || nominee.name,
            movieId: nominee.movieId,
            movie: nominee.movie || "",
            person: nominee.person || "",
            image: nominee.image || ""
          };
        }),
        communityResults: game.resultsFinalized === true
          ? movieCommunityAwardsCategoryResults_(gameId, category, entriesByUser)
          : []
      };
    })
  };
}
