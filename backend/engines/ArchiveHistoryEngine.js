/* =====================================================
   ARCHIVE HISTORY ENGINE v2.0.8

   Read-only historical game data for:
   - Archived leaderboards
   - Archived user picks
   - Career statistics and fun facts

   Source of truth remains the verified yearly archive spreadsheet.
   Results are cached briefly so profile pages do not repeatedly scan Drive.
===================================================== */

const ARCHIVE_HISTORY_CACHE_VERSION = "v1";
const ARCHIVE_HISTORY_CACHE_SECONDS = 300;
const ARCHIVE_HISTORY_MAX_GAMES = 50;

function archiveHistoryString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function archiveHistoryKey_(value) {
  return archiveHistoryString_(value).toLowerCase();
}

function archiveHistoryNumber_(value, fallback) {
  if (value === "" || value === null || value === undefined) {
    return fallback === undefined ? 0 : fallback;
  }

  const number = Number(value);
  return isNaN(number) || !isFinite(number)
    ? (fallback === undefined ? 0 : fallback)
    : number;
}

function archiveHistoryBool_(value, fallback) {
  if (value === "" || value === null || value === undefined) {
    return fallback === true;
  }

  const key = archiveHistoryKey_(value);
  return value === true || key === "true" || key === "yes" || key === "1";
}

function archiveHistoryField_(object, names, fallback) {
  object = object || {};

  for (let i = 0; i < (names || []).length; i++) {
    const name = names[i];

    if (
      Object.prototype.hasOwnProperty.call(object, name) &&
      object[name] !== "" &&
      object[name] !== null &&
      object[name] !== undefined
    ) {
      return object[name];
    }
  }

  return fallback;
}

function archiveHistorySafeJson_(value, fallback) {
  if (value && typeof value === "object") {
    return value;
  }

  const text = archiveHistoryString_(value);

  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

function archiveHistoryHeaderMap_(headers) {
  const map = {};

  (headers || []).forEach(function(header, index) {
    const key = archiveHistoryString_(header);
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;
}

function archiveHistoryRowsToObjects_(values) {
  values = values || [];

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0].map(archiveHistoryString_);

  return values.slice(1).map(function(row) {
    const object = {};

    headers.forEach(function(header, index) {
      if (header) {
        object[header] = row[index];
      }
    });

    return object;
  });
}

function archiveHistoryReadSheetObjects_(spreadsheet, sheetName) {
  const sheet = spreadsheet && spreadsheet.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() <= 1 || sheet.getLastColumn() < 1) {
    return [];
  }

  return archiveHistoryRowsToObjects_(
    sheet.getDataRange().getValues()
  );
}

function archiveHistoryManifestVerified_(record) {
  if (!record) {
    return false;
  }

  const status = archiveHistoryString_(record.Status);
  const supportedStatuses = {
    VERIFIED_COPY: true,
    VERIFIED_MOVE: true,
    VERIFIED_RESTORE: true
  };

  if (!supportedStatuses[status]) {
    return false;
  }

  const errors = archiveHistorySafeJson_(record.VerificationErrorsJSON, []);

  if (Array.isArray(errors) && errors.length) {
    return false;
  }

  const counts = archiveHistorySafeJson_(record.EntityCountsJSON, {});
  const required = [
    "Games",
    "Questions",
    "QuestionOptions",
    "Categories",
    "CategoryResults",
    "Picks",
    "Bets",
    "CategorySettings"
  ];

  return required.every(function(sheetName) {
    return counts[sheetName] && counts[sheetName].verified === true;
  });
}

function archiveHistoryGetLatestSnapshots_() {
  const active = SpreadsheetApp.getActive();
  const sheet = active.getSheetByName("ArchiveManifest");

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const records = archiveHistoryRowsToObjects_(
    sheet.getDataRange().getValues()
  );
  const latestByGame = {};

  records.forEach(function(record, index) {
    const gameId = archiveHistoryString_(record.GameId);
    const archiveSpreadsheetId = archiveHistoryString_(
      record.ArchiveSpreadsheetId
    );

    if (
      !gameId ||
      !archiveSpreadsheetId ||
      !archiveHistoryManifestVerified_(record)
    ) {
      return;
    }

    record._manifestIndex = index;
    latestByGame[gameId] = record;
  });

  return Object.keys(latestByGame)
    .map(function(gameId) {
      return latestByGame[gameId];
    })
    .sort(function(a, b) {
      const yearDifference =
        archiveHistoryNumber_(b.Year, 0) -
        archiveHistoryNumber_(a.Year, 0);

      if (yearDifference !== 0) {
        return yearDifference;
      }

      return b._manifestIndex - a._manifestIndex;
    })
    .slice(0, ARCHIVE_HISTORY_MAX_GAMES);
}

function archiveHistoryFindSnapshot_(gameId) {
  gameId = archiveHistoryString_(gameId);

  const snapshots = archiveHistoryGetLatestSnapshots_();

  for (let i = 0; i < snapshots.length; i++) {
    if (archiveHistoryString_(snapshots[i].GameId) === gameId) {
      return snapshots[i];
    }
  }

  return null;
}

function archiveHistoryOpenSpreadsheet_(snapshot) {
  if (!snapshot || !snapshot.ArchiveSpreadsheetId) {
    throw new Error("Verified archive spreadsheet was not found.");
  }

  return SpreadsheetApp.openById(
    archiveHistoryString_(snapshot.ArchiveSpreadsheetId)
  );
}

function archiveHistoryRowsForGame_(rows, gameId) {
  return (rows || []).filter(function(row) {
    return archiveHistoryString_(row.GameId) === gameId;
  });
}

function archiveHistoryBuildResolutionMap_(settingsRows, resultRows) {
  const map = {};

  (settingsRows || []).forEach(function(row) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["CategoryId", "QuestionId"], "")
    );

    if (!categoryId) {
      return;
    }

    const settlementStatus = archiveHistoryKey_(
      archiveHistoryField_(row, ["SettlementStatus"], "")
    );
    const winnerNomineeId = archiveHistoryKey_(
      archiveHistoryField_(row, ["WinnerNomineeId"], "")
    );

    map[categoryId] = {
      settlementStatus: settlementStatus,
      winnerNomineeId: winnerNomineeId,
      result: (
        settlementStatus === "push" ||
        settlementStatus === "pushed" ||
        settlementStatus === "void" ||
        settlementStatus === "refund" ||
        settlementStatus === "refunded" ||
        settlementStatus === "cancelled" ||
        settlementStatus === "canceled" ||
        settlementStatus === "no-contest" ||
        settlementStatus === "no_contest"
      ) ? "push" : (winnerNomineeId ? "winner" : "pending")
    };
  });

  (resultRows || []).forEach(function(row) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["CategoryId", "QuestionId"], "")
    );

    if (!categoryId) {
      return;
    }

    const status = archiveHistoryKey_(
      archiveHistoryField_(row, ["ResultStatus"], "")
    );
    const nomineeId = archiveHistoryKey_(
      archiveHistoryField_(row, ["NomineeId", "OptionId"], "")
    );
    const isWinner = archiveHistoryBool_(
      archiveHistoryField_(row, ["IsWinner"], false),
      false
    );

    if (
      status === "push" ||
      status === "pushed" ||
      status === "void" ||
      status === "refund" ||
      status === "refunded" ||
      status === "cancelled" ||
      status === "canceled" ||
      status === "no-contest" ||
      status === "no_contest"
    ) {
      map[categoryId] = {
        settlementStatus: status,
        winnerNomineeId: "",
        result: "push"
      };
      return;
    }

    if (isWinner && nomineeId) {
      map[categoryId] = {
        settlementStatus: status || "settled",
        winnerNomineeId: nomineeId,
        result: "winner"
      };
    }
  });

  return map;
}

function archiveHistoryOptionMap_(optionRows, categoryRows) {
  const map = {};

  (optionRows || []).forEach(function(row) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["QuestionId", "CategoryId"], "")
    );
    const optionId = archiveHistoryKey_(
      archiveHistoryField_(row, ["OptionId", "NomineeId"], "")
    );

    if (!categoryId || !optionId) {
      return;
    }

    map[categoryId + "::" + optionId] = archiveHistoryString_(
      archiveHistoryField_(
        row,
        ["Option", "ShortAnswer", "Nominee", "Person", "Movie"],
        optionId
      )
    );
  });

  (categoryRows || []).forEach(function(row) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["CategoryId"], "")
    );
    const optionId = archiveHistoryKey_(
      archiveHistoryField_(row, ["NomineeId"], "")
    );
    const key = categoryId + "::" + optionId;

    if (!categoryId || !optionId || map[key]) {
      return;
    }

    map[key] = archiveHistoryString_(
      archiveHistoryField_(
        row,
        ["Nominee", "Person", "Movie"],
        optionId
      )
    );
  });

  return map;
}

function archiveHistoryQuestionMap_(questionRows, categoryRows) {
  const map = {};

  (questionRows || []).forEach(function(row, index) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["QuestionId", "CategoryId"], "")
    );

    if (!categoryId) {
      return;
    }

    map[categoryId] = {
      questionId: categoryId,
      question: archiveHistoryString_(
        archiveHistoryField_(row, ["Question", "Category"], categoryId)
      ),
      section: archiveHistoryString_(
        archiveHistoryField_(row, ["Section"], "")
      ),
      order: index
    };
  });

  (categoryRows || []).forEach(function(row, index) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["CategoryId"], "")
    );

    if (!categoryId || map[categoryId]) {
      return;
    }

    map[categoryId] = {
      questionId: categoryId,
      question: archiveHistoryString_(
        archiveHistoryField_(row, ["Category"], categoryId)
      ),
      section: archiveHistoryString_(
        archiveHistoryField_(row, ["Section"], "")
      ),
      order: 10000 + index
    };
  });

  return map;
}

function archiveHistorySettingsMap_(settingsRows) {
  const map = {};

  (settingsRows || []).forEach(function(row) {
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["CategoryId", "QuestionId"], "")
    );

    if (categoryId) {
      map[categoryId] = row;
    }
  });

  return map;
}

function archiveHistoryLatestPicks_(pickRows) {
  const latest = {};

  (pickRows || []).forEach(function(row) {
    const username = archiveHistoryString_(row.Username);
    const categoryId = archiveHistoryKey_(
      archiveHistoryField_(row, ["CategoryId", "QuestionId"], "")
    );

    if (!username || !categoryId) {
      return;
    }

    latest[archiveHistoryKey_(username) + "::" + categoryId] = row;
  });

  return Object.keys(latest).map(function(key) {
    return latest[key];
  });
}

function archiveHistoryScorePick_(pick, config, resolution, game) {
  const nomineeId = archiveHistoryKey_(
    archiveHistoryField_(pick, ["NomineeId", "OptionId"], "")
  );
  const winnerNomineeId = archiveHistoryKey_(
    resolution && resolution.winnerNomineeId
  );
  const result = resolution && resolution.result
    ? resolution.result
    : "pending";
  const scoreMode = archiveHistoryKey_(
    archiveHistoryField_(config, ["ScoreMode"], "correct-pick")
  );
  const confidenceEnabled = archiveHistoryBool_(
    archiveHistoryField_(game, ["ConfidenceEnabled"], false),
    false
  );
  const usesConfidence =
    scoreMode === "confidence-points" ||
    (scoreMode === "correct-pick" && confidenceEnabled);
  const isStaked = scoreMode === "staked-points";
  const fixedPointsEnabled = archiveHistoryBool_(
    archiveHistoryField_(game, ["FixedPointsEnabled"], true),
    true
  );
  const stakedPointsEnabled = archiveHistoryBool_(
    archiveHistoryField_(game, ["StakedPointsEnabled"], false),
    false
  );
  const confidencePoints = archiveHistoryNumber_(pick.ConfidencePoints, 0);
  const stakePoints = Math.max(
    0,
    archiveHistoryNumber_(pick.StakePoints, 0)
  );
  const configuredPoints = archiveHistoryNumber_(
    archiveHistoryField_(config, ["Points"], ""),
    archiveHistoryNumber_(pick.Points, 1)
  );
  const basePoints = usesConfidence
    ? confidencePoints
    : configuredPoints;
  const changePenalty = archiveHistoryNumber_(
    archiveHistoryField_(config, ["ChangePenalty"], 0),
    0
  );
  const changeCount = archiveHistoryNumber_(pick.ChangeCount, 0);
  const adjustedPoints = Math.max(
    0,
    basePoints - (changeCount * changePenalty)
  );

  if (
    scoreMode === "wager" ||
    scoreMode === "ranking"
  ) {
    return {
      status: "ignored",
      correct: false,
      pointsEarned: 0,
      stakedNet: 0
    };
  }

  if (result === "push") {
    return {
      status: "push",
      correct: false,
      pointsEarned: 0,
      stakedNet: 0
    };
  }

  if (result !== "winner" || !winnerNomineeId) {
    return {
      status: "pending",
      correct: false,
      pointsEarned: 0,
      stakedNet: 0
    };
  }

  const correct = nomineeId === winnerNomineeId;

  if (isStaked) {
    if (!stakedPointsEnabled) {
      return {
        status: correct ? "correct" : "wrong",
        correct: correct,
        pointsEarned: 0,
        stakedNet: 0
      };
    }

    const winMultiplier = archiveHistoryNumber_(
      archiveHistoryField_(
        config,
        ["StakeWinMultiplier"],
        archiveHistoryField_(game, ["StakeWinMultiplier"], 1)
      ),
      1
    );
    const lossMultiplier = archiveHistoryNumber_(
      archiveHistoryField_(
        config,
        ["StakeLossMultiplier"],
        archiveHistoryField_(game, ["StakeLossMultiplier"], 1)
      ),
      1
    );

    return {
      status: correct ? "correct" : "wrong",
      correct: correct,
      pointsEarned: 0,
      stakedNet: correct
        ? stakePoints * winMultiplier
        : -stakePoints * lossMultiplier
    };
  }

  const riskPenalty = archiveHistoryKey_(
    archiveHistoryField_(game, ["ConfidenceScoringMode"], "")
  ) === "risk_penalty";

  return {
    status: correct ? "correct" : "wrong",
    correct: correct,
    pointsEarned: fixedPointsEnabled
      ? (
          correct
            ? adjustedPoints
            : (usesConfidence && riskPenalty ? -adjustedPoints : 0)
        )
      : 0,
    stakedNet: 0
  };
}

function archiveHistoryScoreWagers_(betRows, resolutionMap, game) {
  const byUser = {};
  const latest = {};

  (betRows || []).forEach(function(row) {
    const username = archiveHistoryString_(row.Username);
    const categoryId = archiveHistoryKey_(row.CategoryId);

    if (!username || !categoryId) {
      return;
    }

    latest[archiveHistoryKey_(username) + "::" + categoryId] = row;
  });

  Object.keys(latest).forEach(function(key) {
    const row = latest[key];
    const username = archiveHistoryString_(row.Username);
    const categoryId = archiveHistoryKey_(row.CategoryId);
    const nomineeId = archiveHistoryKey_(row.NomineeId);
    const amount = Math.max(0, archiveHistoryNumber_(row.BetAmount, 0));
    const odds = Math.max(0, archiveHistoryNumber_(row.Odds, 0));
    const resolution = resolutionMap[categoryId] || {
      result: "pending",
      winnerNomineeId: ""
    };
    const userKey = archiveHistoryKey_(username);

    if (!byUser[userKey]) {
      byUser[userKey] = {
        username: username,
        bets: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        pending: 0,
        wagered: 0,
        net: 0
      };
    }

    const stats = byUser[userKey];
    stats.bets++;
    stats.wagered += amount;

    if (resolution.result === "push") {
      stats.pushes++;
    } else if (resolution.result !== "winner") {
      stats.pending++;
    } else if (nomineeId === archiveHistoryKey_(resolution.winnerNomineeId)) {
      stats.wins++;
      stats.net += amount * Math.max(0, odds - 1);
    } else {
      stats.losses++;
      stats.net -= amount;
    }
  });

  const startingBankroll = Math.max(
    0,
    archiveHistoryNumber_(
      archiveHistoryField_(game, ["StartingBankroll"], 0),
      0
    )
  );

  Object.keys(byUser).forEach(function(key) {
    byUser[key].net = Math.round(byUser[key].net * 100) / 100;
    byUser[key].finalBankroll =
      Math.round((startingBankroll + byUser[key].net) * 100) / 100;
  });

  return byUser;
}

function archiveHistoryBuildGameData_(payload, requestedUsername) {
  payload = payload || {};

  const gameId = archiveHistoryString_(payload.gameId);
  const game = (payload.games || [])[0] || {};
  const questionMap = archiveHistoryQuestionMap_(
    payload.questions || [],
    payload.categories || []
  );
  const optionMap = archiveHistoryOptionMap_(
    payload.options || [],
    payload.categories || []
  );
  const settingsMap = archiveHistorySettingsMap_(payload.settings || []);
  const resolutionMap = archiveHistoryBuildResolutionMap_(
    payload.settings || [],
    payload.results || []
  );
  const picks = archiveHistoryLatestPicks_(payload.picks || []);
  const wagerMap = archiveHistoryScoreWagers_(
    payload.bets || [],
    resolutionMap,
    game
  );
  const users = {};

  picks.forEach(function(pick) {
    const username = archiveHistoryString_(pick.Username);
    const userKey = archiveHistoryKey_(username);
    const categoryId = archiveHistoryKey_(pick.CategoryId);

    if (!username || !categoryId) {
      return;
    }

    if (!users[userKey]) {
      users[userKey] = {
        username: username,
        totalPicks: 0,
        correctPicks: 0,
        wrongPicks: 0,
        pushes: 0,
        pendingPicks: 0,
        predictionPoints: 0,
        stakedNet: 0,
        longestCorrectStreak: 0,
        picks: []
      };
    }

    const resolution = resolutionMap[categoryId] || {
      result: "pending",
      winnerNomineeId: ""
    };
    const config = settingsMap[categoryId] || {};
    const score = archiveHistoryScorePick_(pick, config, resolution, game);
    const question = questionMap[categoryId] || {
      questionId: categoryId,
      question: categoryId,
      section: "",
      order: 99999
    };
    const selectedNomineeId = archiveHistoryKey_(pick.NomineeId);
    const winnerNomineeId = archiveHistoryKey_(resolution.winnerNomineeId);
    const user = users[userKey];

    user.totalPicks++;

    if (score.status === "correct") {
      user.correctPicks++;
    } else if (score.status === "wrong") {
      user.wrongPicks++;
    } else if (score.status === "push") {
      user.pushes++;
    } else {
      user.pendingPicks++;
    }

    user.predictionPoints += score.pointsEarned;
    user.stakedNet += score.stakedNet;
    user.picks.push({
      categoryId: categoryId,
      question: question.question,
      section: question.section,
      order: question.order,
      selectedNomineeId: selectedNomineeId,
      selectedOption: optionMap[categoryId + "::" + selectedNomineeId] || selectedNomineeId,
      winnerNomineeId: winnerNomineeId,
      winnerOption: resolution.result === "push"
        ? "Push / Void"
        : (optionMap[categoryId + "::" + winnerNomineeId] || winnerNomineeId),
      status: score.status,
      pointsEarned: score.pointsEarned,
      confidencePoints: archiveHistoryNumber_(pick.ConfidencePoints, 0),
      stakePoints: archiveHistoryNumber_(pick.StakePoints, 0),
      changeCount: archiveHistoryNumber_(pick.ChangeCount, 0)
    });
  });

  Object.keys(wagerMap).forEach(function(userKey) {
    if (!users[userKey]) {
      users[userKey] = {
        username: wagerMap[userKey].username,
        totalPicks: 0,
        correctPicks: 0,
        wrongPicks: 0,
        pushes: 0,
        pendingPicks: 0,
        predictionPoints: 0,
        stakedNet: 0,
        longestCorrectStreak: 0,
        picks: []
      };
    }
  });

  Object.keys(users).forEach(function(userKey) {
    const user = users[userKey];
    let currentStreak = 0;
    let longestStreak = 0;

    user.picks.sort(function(a, b) {
      return a.order - b.order;
    });

    user.picks.forEach(function(pick) {
      if (pick.status === "correct") {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (pick.status === "wrong") {
        currentStreak = 0;
      }
    });

    user.longestCorrectStreak = longestStreak;
    user.accuracy = user.correctPicks + user.wrongPicks > 0
      ? Math.round(
          (user.correctPicks / (user.correctPicks + user.wrongPicks)) * 1000
        ) / 10
      : 0;
    user.predictionPoints = Math.round(user.predictionPoints * 100) / 100;
    user.stakedNet = Math.round(user.stakedNet * 100) / 100;

    const leaderboardScoreMode = archiveHistoryKey_(
      archiveHistoryField_(game, ["LeaderboardScoreMode"], "combined-net")
    );
    const startingPoints = Math.max(
      0,
      archiveHistoryNumber_(
        archiveHistoryField_(game, ["StartingPoints"], 1000),
        1000
      )
    );
    const stakedBalance = Math.max(0, startingPoints + user.stakedNet);

    if (leaderboardScoreMode === "fixed-only") {
      user.totalScore = user.predictionPoints;
    } else if (leaderboardScoreMode === "staked-balance") {
      user.totalScore = stakedBalance;
    } else {
      user.totalScore = user.predictionPoints + user.stakedNet;
    }

    user.totalScore = Math.round(user.totalScore * 100) / 100;
    user.stakedBalance = Math.round(stakedBalance * 100) / 100;
    user.wagers = wagerMap[userKey] || {
      bets: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      pending: 0,
      wagered: 0,
      net: 0,
      finalBankroll: archiveHistoryNumber_(
        archiveHistoryField_(game, ["StartingBankroll"], 0),
        0
      )
    };
  });

  const leaderboard = Object.keys(users)
    .map(function(userKey) {
      return users[userKey];
    })
    .sort(function(a, b) {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      if (b.correctPicks !== a.correctPicks) {
        return b.correctPicks - a.correctPicks;
      }

      return archiveHistoryKey_(a.username).localeCompare(
        archiveHistoryKey_(b.username)
      );
    });

  leaderboard.forEach(function(user, index) {
    user.rank = index + 1;
    user.totalPlayers = leaderboard.length;

    const profile = typeof getLeaderboardUserProfile_ === "function"
      ? (getLeaderboardUserProfile_(user.username, gameId) || {})
      : {};

    user.displayName = profile.displayName || user.username;
    user.avatar = profile.avatar || "👤";
    user.themeColor = profile.themeColor || profile.profileColor || "#354785";
  });

  const wagerLeaderboard = leaderboard
    .filter(function(user) {
      return user.wagers && user.wagers.bets > 0;
    })
    .slice()
    .sort(function(a, b) {
      return b.wagers.finalBankroll - a.wagers.finalBankroll;
    })
    .map(function(user, index) {
      return {
        rank: index + 1,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        themeColor: user.themeColor,
        bets: user.wagers.bets,
        wins: user.wagers.wins,
        losses: user.wagers.losses,
        pushes: user.wagers.pushes,
        net: user.wagers.net,
        finalBankroll: user.wagers.finalBankroll
      };
    });
  const requestedKey = archiveHistoryKey_(requestedUsername);
  const requestedUser = requestedKey && users[requestedKey]
    ? users[requestedKey]
    : null;

  return {
    game: {
      gameId: gameId,
      name: archiveHistoryString_(
        archiveHistoryField_(game, ["Name"], payload.gameName || gameId)
      ),
      year: archiveHistoryNumber_(
        archiveHistoryField_(game, ["Year"], payload.year || 0),
        payload.year || 0
      ),
      status: archiveHistoryString_(
        archiveHistoryField_(game, ["Status"], "Archived")
      ),
      archivedAt: payload.archivedAt || "",
      archiveId: payload.archiveId || ""
    },
    leaderboard: leaderboard.map(function(user) {
      return {
        rank: user.rank,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        themeColor: user.themeColor,
        totalScore: user.totalScore,
        predictionPoints: user.predictionPoints,
        stakedNet: user.stakedNet,
        correctPicks: user.correctPicks,
        wrongPicks: user.wrongPicks,
        pushes: user.pushes,
        accuracy: user.accuracy,
        totalPicks: user.totalPicks
      };
    }),
    wagerLeaderboard: wagerLeaderboard,
    user: requestedUser,
    stats: {
      players: leaderboard.length,
      questions: Object.keys(questionMap).length,
      picks: picks.length,
      bets: (payload.bets || []).length
    }
  };
}

function archiveHistoryLoadGame_(snapshot, username) {
  const gameId = archiveHistoryString_(snapshot.GameId);
  const spreadsheet = archiveHistoryOpenSpreadsheet_(snapshot);
  const allQuestions = archiveHistoryReadSheetObjects_(spreadsheet, "Questions");
  const questions = archiveHistoryRowsForGame_(allQuestions, gameId);
  const questionIds = {};

  questions.forEach(function(row) {
    const questionId = archiveHistoryKey_(row.QuestionId);
    if (questionId) {
      questionIds[questionId] = true;
    }
  });

  const settings = archiveHistoryReadSheetObjects_(
    spreadsheet,
    "CategorySettings"
  ).filter(function(row) {
    const rowGameId = archiveHistoryString_(row.GameId);
    const categoryId = archiveHistoryKey_(row.CategoryId);
    return rowGameId ? rowGameId === gameId : questionIds[categoryId] === true;
  });

  return archiveHistoryBuildGameData_({
    gameId: gameId,
    gameName: archiveHistoryString_(snapshot.GameName),
    year: archiveHistoryNumber_(snapshot.Year, 0),
    archiveId: archiveHistoryString_(snapshot.ArchiveId),
    archivedAt: snapshot.ArchivedAt || snapshot.VerifiedAt || "",
    games: archiveHistoryRowsForGame_(
      archiveHistoryReadSheetObjects_(spreadsheet, "Games"),
      gameId
    ),
    questions: questions,
    options: archiveHistoryRowsForGame_(
      archiveHistoryReadSheetObjects_(spreadsheet, "QuestionOptions"),
      gameId
    ),
    categories: archiveHistoryRowsForGame_(
      archiveHistoryReadSheetObjects_(spreadsheet, "Categories"),
      gameId
    ),
    results: archiveHistoryRowsForGame_(
      archiveHistoryReadSheetObjects_(spreadsheet, "CategoryResults"),
      gameId
    ),
    picks: archiveHistoryRowsForGame_(
      archiveHistoryReadSheetObjects_(spreadsheet, "Picks"),
      gameId
    ),
    bets: archiveHistoryRowsForGame_(
      archiveHistoryReadSheetObjects_(spreadsheet, "Bets"),
      gameId
    ),
    settings: settings
  }, username);
}

function archiveHistoryCache_() {
  return CacheService.getScriptCache();
}

function archiveHistoryCacheKey_(type, value) {
  return [
    "archive-history",
    ARCHIVE_HISTORY_CACHE_VERSION,
    type,
    archiveHistoryKey_(value)
  ].join("::");
}

function archiveHistoryInvalidateCache_() {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(
      "ARCHIVE_HISTORY_CACHE_BUSTER",
      String(new Date().getTime())
    );
  } catch (err) {
    // Cache expiration remains the fallback.
  }
}

function archiveHistoryCacheBuster_() {
  try {
    return PropertiesService.getScriptProperties().getProperty(
      "ARCHIVE_HISTORY_CACHE_BUSTER"
    ) || "0";
  } catch (err) {
    return "0";
  }
}

function getArchivedGameHistory(gameId, username) {
  gameId = archiveHistoryString_(gameId);
  username = archiveHistoryString_(username);

  if (!gameId) {
    return {
      success: false,
      message: "GameId is required."
    };
  }

  const cacheKey = archiveHistoryCacheKey_(
    "game",
    gameId + "::" + username + "::" + archiveHistoryCacheBuster_()
  );
  const cache = archiveHistoryCache_();
  const cached = cache.get(cacheKey);

  if (cached) {
    const parsed = archiveHistorySafeJson_(cached, null);
    if (parsed) {
      return parsed;
    }
  }

  const snapshot = archiveHistoryFindSnapshot_(gameId);

  if (!snapshot) {
    return {
      success: false,
      gameId: gameId,
      message: "No verified archive was found for this game."
    };
  }

  const data = archiveHistoryLoadGame_(snapshot, username);
  const response = Object.assign({
    success: true
  }, data);

  try {
    cache.put(
      cacheKey,
      JSON.stringify(response),
      ARCHIVE_HISTORY_CACHE_SECONDS
    );
  } catch (err) {
    // Large history payloads can exceed CacheService limits.
  }

  return response;
}

function archiveHistoryBuildCareerSummary_(username, games) {
  const summary = {
    username: username,
    archivedGames: 0,
    firstPlaceFinishes: 0,
    topThreeFinishes: 0,
    totalPicks: 0,
    correctPicks: 0,
    wrongPicks: 0,
    pushes: 0,
    totalPredictionPoints: 0,
    totalWagerNet: 0,
    totalBets: 0,
    wagerWins: 0,
    wagerLosses: 0,
    longestCorrectStreak: 0,
    accuracy: 0,
    bestGame: null,
    games: [],
    funFacts: []
  };

  (games || []).forEach(function(data) {
    const user = data && data.user;

    if (!user) {
      return;
    }

    const gameSummary = {
      gameId: data.game.gameId,
      name: data.game.name,
      year: data.game.year,
      archivedAt: data.game.archivedAt,
      rank: user.rank,
      totalPlayers: user.totalPlayers,
      totalScore: user.totalScore,
      predictionPoints: user.predictionPoints,
      correctPicks: user.correctPicks,
      wrongPicks: user.wrongPicks,
      pushes: user.pushes,
      totalPicks: user.totalPicks,
      accuracy: user.accuracy,
      longestCorrectStreak: user.longestCorrectStreak,
      wagerNet: user.wagers ? user.wagers.net : 0,
      bets: user.wagers ? user.wagers.bets : 0,
      wagerWins: user.wagers ? user.wagers.wins : 0,
      wagerLosses: user.wagers ? user.wagers.losses : 0
    };

    summary.archivedGames++;
    summary.totalPicks += user.totalPicks;
    summary.correctPicks += user.correctPicks;
    summary.wrongPicks += user.wrongPicks;
    summary.pushes += user.pushes;
    summary.totalPredictionPoints += user.predictionPoints;
    summary.totalWagerNet += gameSummary.wagerNet;
    summary.totalBets += gameSummary.bets;
    summary.wagerWins += gameSummary.wagerWins;
    summary.wagerLosses += gameSummary.wagerLosses;
    summary.longestCorrectStreak = Math.max(
      summary.longestCorrectStreak,
      user.longestCorrectStreak
    );

    if (user.rank === 1) {
      summary.firstPlaceFinishes++;
    }

    if (user.rank && user.rank <= 3) {
      summary.topThreeFinishes++;
    }

    if (
      !summary.bestGame ||
      gameSummary.accuracy > summary.bestGame.accuracy ||
      (
        gameSummary.accuracy === summary.bestGame.accuracy &&
        gameSummary.correctPicks > summary.bestGame.correctPicks
      )
    ) {
      summary.bestGame = gameSummary;
    }

    summary.games.push(gameSummary);
  });

  const decided = summary.correctPicks + summary.wrongPicks;
  summary.accuracy = decided > 0
    ? Math.round((summary.correctPicks / decided) * 1000) / 10
    : 0;
  summary.totalPredictionPoints =
    Math.round(summary.totalPredictionPoints * 100) / 100;
  summary.totalWagerNet = Math.round(summary.totalWagerNet * 100) / 100;

  if (summary.archivedGames) {
    summary.funFacts.push(
      "Played in " + summary.archivedGames +
      " archived game" + (summary.archivedGames === 1 ? "" : "s") + "."
    );
  }

  if (summary.firstPlaceFinishes) {
    summary.funFacts.push(
      "Finished first " + summary.firstPlaceFinishes +
      " time" + (summary.firstPlaceFinishes === 1 ? "" : "s") + "."
    );
  }

  if (summary.bestGame) {
    summary.funFacts.push(
      "Best archived accuracy: " + summary.bestGame.accuracy +
      "% in " + summary.bestGame.name + "."
    );
  }

  if (summary.longestCorrectStreak > 1) {
    summary.funFacts.push(
      "Longest correct-pick streak: " +
      summary.longestCorrectStreak + "."
    );
  }

  if (summary.totalBets) {
    summary.funFacts.push(
      "Historical wager result: " +
      (summary.totalWagerNet >= 0 ? "+" : "") +
      summary.totalWagerNet + "."
    );
  }

  return summary;
}

function getUserProfileHistory(username, gameId) {
  username = archiveHistoryString_(username);
  gameId = archiveHistoryString_(gameId);

  if (!username) {
    return {
      success: false,
      message: "Username is required."
    };
  }

  if (gameId) {
    return getArchivedGameHistory(gameId, username);
  }

  const cacheKey = archiveHistoryCacheKey_(
    "career",
    username + "::" + archiveHistoryCacheBuster_()
  );
  const cache = archiveHistoryCache_();
  const cached = cache.get(cacheKey);

  if (cached) {
    const parsed = archiveHistorySafeJson_(cached, null);
    if (parsed) {
      return parsed;
    }
  }

  const snapshots = archiveHistoryGetLatestSnapshots_();
  const games = [];
  const errors = [];

  snapshots.forEach(function(snapshot) {
    try {
      games.push(
        archiveHistoryLoadGame_(snapshot, username)
      );
    } catch (err) {
      errors.push({
        gameId: archiveHistoryString_(snapshot.GameId),
        message: err && err.message ? err.message : String(err)
      });
    }
  });

  const summary = archiveHistoryBuildCareerSummary_(username, games);
  const response = {
    success: true,
    username: username,
    summary: summary,
    games: summary.games,
    errors: errors
  };

  try {
    cache.put(
      cacheKey,
      JSON.stringify(response),
      ARCHIVE_HISTORY_CACHE_SECONDS
    );
  } catch (err) {
    // Cache is optional.
  }

  return response;
}

function getArchivedGamesHistory() {
  const snapshots = archiveHistoryGetLatestSnapshots_();

  return {
    success: true,
    games: snapshots.map(function(snapshot) {
      return {
        gameId: archiveHistoryString_(snapshot.GameId),
        gameName: archiveHistoryString_(snapshot.GameName),
        year: archiveHistoryNumber_(snapshot.Year, 0),
        status: archiveHistoryString_(snapshot.Status),
        mode: archiveHistoryString_(snapshot.Mode),
        archivedAt: snapshot.ArchivedAt || snapshot.VerifiedAt || "",
        archiveId: archiveHistoryString_(snapshot.ArchiveId)
      };
    })
  };
}
