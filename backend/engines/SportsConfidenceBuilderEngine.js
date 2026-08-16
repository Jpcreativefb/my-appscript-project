/* =====================================================
   SPORTS CONFIDENCE BUILDER

   Admin-only bridge that turns stored Sports Scores Engine
   games into existing Confidence Game questions. It does not
   replace Confidence scoring; it only creates the questions,
   choices, sports linkage, and kickoff locks.
===================================================== */

function sportsConfidenceString_(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function sportsConfidenceKey_(value) {
  return sportsConfidenceString_(value).toLowerCase().replace(/_/g, "-");
}

function sportsConfidenceBool_(value) {
  if (value === true || value === 1) return true;
  const key = sportsConfidenceKey_(value);
  return key === "true" || key === "yes" || key === "1" || key === "on";
}

function sportsConfidenceGameBuildable_(game) {
  game = game || {};

  const archived = sportsConfidenceBool_(game.archived || game.Archived);
  if (archived) return false;

  const active = sportsConfidenceBool_(game.active || game.Active);
  const status = sportsConfidenceKey_(game.status || game.Status);

  return (
    status === "setup" ||
    status === "preview" ||
    status === "active" ||
    status === "live" ||
    (!status && active)
  );
}

function sportsConfidenceGameEnabled_(game) {
  game = game || {};

  const type = sportsConfidenceKey_(game.type || game.Type);
  const confidenceEnabled = sportsConfidenceBool_(
    game.confidenceEnabled || game.ConfidenceEnabled
  );

  return confidenceEnabled || type === "confidence";
}

function sportsConfidenceGameId_(game) {
  return sportsConfidenceString_(game && (
    game.gameId || game.GameId || game.id || game.Id
  ));
}

function sportsConfidenceGetDestinationGames_() {
  const games = typeof getGames === "function"
    ? getGames()
    : (typeof getActiveGames === "function" ? getActiveGames() : []);

  return (games || []).filter(function(game) {
    return sportsConfidenceGameBuildable_(game) && sportsConfidenceGameEnabled_(game);
  });
}

function sportsConfidenceRequireDestinationGame_(gameId) {
  const cleanGameId = sportsConfidenceString_(gameId);
  if (!cleanGameId) throw new Error("Confidence destination GameId is required.");

  const game = typeof getGame === "function"
    ? getGame(cleanGameId)
    : sportsConfidenceGetDestinationGames_().find(function(item) {
        return sportsConfidenceGameId_(item) === cleanGameId;
      });

  if (!game) {
    throw new Error("Confidence destination game was not found: " + cleanGameId);
  }

  if (!sportsConfidenceGameBuildable_(game)) {
    throw new Error("Confidence destination must be in Setup, Preview, or Live and not archived.");
  }

  if (!sportsConfidenceGameEnabled_(game)) {
    throw new Error("Destination game does not have Confidence gameplay enabled.");
  }

  return game;
}

function apiAdminGetSportsConfidenceGames(payload) {
  payload = payload || {};
  requireAdmin_(payload);

  return {
    success: true,
    games: sportsConfidenceGetDestinationGames_().map(function(game) {
      return {
        gameId: sportsConfidenceGameId_(game),
        name: sportsConfidenceString_(
          game.name || game.Name || game.gameName || game.GameName || sportsConfidenceGameId_(game)
        ),
        type: sportsConfidenceString_(game.type || game.Type),
        year: game.year || game.Year || "",
        confidenceEnabled: true,
        status: sportsConfidenceString_(
          game.status || game.Status || (sportsConfidenceBool_(game.active || game.Active) ? "Active" : "")
        )
      };
    }).filter(function(game) { return !!game.gameId; })
  };
}

function sportsConfidenceCategoryId_(score) {
  score = score || {};
  const league = typeof sportsWagerSlug_ === "function"
    ? sportsWagerSlug_(score.League || "sports")
    : sportsConfidenceKey_(score.League || "sports").replace(/[^a-z0-9]+/g, "-");
  const eventId = sportsConfidenceString_(score.ESPNEventId || score.GameId);
  const eventSlug = typeof sportsWagerSlug_ === "function"
    ? sportsWagerSlug_(eventId)
    : sportsConfidenceKey_(eventId).replace(/[^a-z0-9]+/g, "-");
  return "sports-confidence-" + league + "-" + eventSlug;
}

function sportsConfidenceQuestionName_(score) {
  const away = sportsConfidenceString_(score && score.AwayTeam);
  const home = sportsConfidenceString_(score && score.HomeTeam);
  return "Who will win? " + away + " @ " + home;
}

function sportsConfidenceSection_(score) {
  const league = sportsConfidenceString_(score && score.League).toUpperCase() || "SPORTS";
  const week = sportsConfidenceString_(score && score.Week);
  return week ? (league + " Week " + week) : league;
}

function sportsConfidenceScoreStarted_(score) {
  score = score || {};
  const state = sportsConfidenceKey_(score.State || score.state);
  const status = sportsConfidenceKey_(score.Status || score.status);

  if (
    sportsConfidenceBool_(score.Completed || score.completed) ||
    state === "in" ||
    state === "post" ||
    state === "final" ||
    status.indexOf("in-progress") !== -1 ||
    status.indexOf("in_progress") !== -1 ||
    status.indexOf("final") !== -1 ||
    status.indexOf("complete") !== -1
  ) {
    return true;
  }

  return false;
}

function sportsConfidencePatchCategoryRows_(score, awardsGameId, categoryId) {
  if (typeof sportsWagerGetSheet_ !== "function") return 0;

  const sh = sportsWagerGetSheet_(CATEGORIES_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return 0;

  const headers = data[0].map(function(header) { return sportsConfidenceString_(header); });
  const col = sportsWagerHeaderMap_(headers);
  const cleanGameId = sportsConfidenceString_(awardsGameId);
  const cleanCategoryId = sportsConfidenceKey_(categoryId);
  const awayName = sportsConfidenceString_(score.AwayTeam);
  const homeName = sportsConfidenceString_(score.HomeTeam);
  const awayId = sportsWagerSlug_(awayName);
  const homeId = sportsWagerSlug_(homeName);
  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i].slice();
    const rowGameId = col.GameId !== undefined ? sportsConfidenceString_(row[col.GameId]) : "";
    const rowCategoryId = col.CategoryId !== undefined ? sportsConfidenceKey_(row[col.CategoryId]) : "";

    if (rowGameId !== cleanGameId || rowCategoryId !== cleanCategoryId) continue;

    const nomineeId = col.NomineeId !== undefined ? sportsConfidenceKey_(row[col.NomineeId]) : "";
    const selection = nomineeId === awayId ? "away" : nomineeId === homeId ? "home" : "";
    const logo = selection === "away" ? score.AwayLogo : selection === "home" ? score.HomeLogo : "";

    sportsWagerSetIfExists_(row, col, "QuestionType", "team-matchup");
    sportsWagerSetIfExists_(row, col, "ScoringEngine", "sports");
    sportsWagerSetIfExists_(row, col, "SelectionMode", "single");
    sportsWagerSetIfExists_(row, col, "EntryType", "team");
    sportsWagerSetIfExists_(row, col, "ScoreMode", "confidence-points");
    sportsWagerSetIfExists_(row, col, "OddsMode", "none");
    sportsWagerSetIfExists_(row, col, "ResultSource", "sports-engine");
    sportsWagerSetIfExists_(row, col, "SportsProvider", "ESPN");
    sportsWagerSetIfExists_(row, col, "SportsGameId", sportsConfidenceString_(score.GameId));
    sportsWagerSetIfExists_(row, col, "ESPNEventId", sportsConfidenceString_(score.ESPNEventId));
    sportsWagerSetIfExists_(row, col, "SportsLeague", sportsConfidenceString_(score.League));
    sportsWagerSetIfExists_(row, col, "SportsMarket", "moneyline");
    sportsWagerSetIfExists_(row, col, "SportsSelection", selection);
    sportsWagerSetIfExists_(row, col, "SportsLine", "");
    sportsWagerSetIfExists_(row, col, "HomeTeam", homeName);
    sportsWagerSetIfExists_(row, col, "AwayTeam", awayName);
    sportsWagerSetIfExists_(row, col, "HomeRecord", score.HomeRecord || "");
    sportsWagerSetIfExists_(row, col, "AwayRecord", score.AwayRecord || "");
    sportsWagerSetIfExists_(row, col, "HomeScore", score.HomeScore);
    sportsWagerSetIfExists_(row, col, "AwayScore", score.AwayScore);
    sportsWagerSetIfExists_(row, col, "SportsStatus", sportsConfidenceString_(score.Status));
    sportsWagerSetIfExists_(row, col, "SportsState", sportsConfidenceString_(score.State));
    sportsWagerSetIfExists_(row, col, "SportsClock", sportsConfidenceString_(score.Clock));
    sportsWagerSetIfExists_(row, col, "SportsPeriod", sportsConfidenceString_(score.Period));
    sportsWagerSetIfExists_(row, col, "BettingOdds", "");
    sportsWagerSetIfExists_(row, col, "OddsSource", "");
    sportsWagerSetIfExists_(row, col, "OddsLastUpdated", "");
    sportsWagerSetIfExists_(row, col, "LogoUrl", logo || "");

    sh.getRange(i + 1, 1, 1, headers.length).setValues([row]);
    updated++;
  }

  return updated;
}

function createSportsConfidenceQuestionFromScore(payload) {
  payload = payload || {};

  const awardsGameId = sportsConfidenceString_(payload.awardsGameId || payload.gameId);
  sportsConfidenceRequireDestinationGame_(awardsGameId);

  if (typeof fetchSportsScoreForWager_ !== "function") {
    throw new Error("SportsWagerEngine is required for Sports Confidence game creation.");
  }

  const score = fetchSportsScoreForWager_({
    sportsGameId: payload.sportsGameId,
    gameId: payload.sportsGameId,
    espnEventId: payload.espnEventId
  });

  const awayTeam = sportsConfidenceString_(score.AwayTeam);
  const homeTeam = sportsConfidenceString_(score.HomeTeam);

  if (!awayTeam || !homeTeam) {
    throw new Error("Sports score is missing AwayTeam or HomeTeam.");
  }

  if (sportsConfidenceScoreStarted_(score) && payload.allowStarted !== true) {
    throw new Error(awayTeam + " @ " + homeTeam + " has already started and was not added to Confidence.");
  }

  const categoryId = sportsConfidenceCategoryId_(score);

  if (typeof sportsWagerCategoryExists_ === "function" && sportsWagerCategoryExists_(awardsGameId, categoryId)) {
    return {
      success: true,
      duplicate: true,
      awardsGameId: awardsGameId,
      categoryId: categoryId,
      sportsGameId: sportsConfidenceString_(score.GameId),
      espnEventId: sportsConfidenceString_(score.ESPNEventId)
    };
  }

  let categoryCreated = false;

  try {
    const categoryName = sportsConfidenceQuestionName_(score);
    const section = sportsConfidenceSection_(score);

    adminCreateCategory({
      gameId: awardsGameId,
      categoryId: categoryId,
      category: categoryName,
      section: section,
      scoreMode: "confidence-points",
      points: 1,
      locked: false,
      lockDateTime: score.GameDateTime || "",
      displayOrder: score.GameDateTime ? new Date(score.GameDateTime).getTime() : 999,
      groupId: sportsConfidenceString_(score.League) || "sports",
      layoutType: "list",
      shortName: awayTeam + " @ " + homeTeam,
      questionType: "team-matchup",
      scoringEngine: "sports",
      selectionMode: "single",
      oddsMode: "none",
      resultSource: "sports-engine",
      resultSourceType: "sports-score",
      resultProvider: "ESPN",
      settlementStatus: "pending",
      sportsProvider: "ESPN",
      sportsLeague: sportsConfidenceString_(score.League),
      sportsGameId: sportsConfidenceString_(score.GameId),
      espnEventId: sportsConfidenceString_(score.ESPNEventId),
      sportsMarket: "moneyline",
      maxSelections: 1,
      minSelections: 1,
      allowDraw: false,
      allowPush: true,
      autoSettle: true,
      requireAdminReview: false,
      sourceConfigJSON: JSON.stringify({
        source: "sports-confidence-builder",
        seasonYear: score.SeasonYear || "",
        seasonType: score.SeasonType || "",
        seasonPhase: score.SeasonPhase || "",
        week: score.Week || ""
      })
    });
    categoryCreated = true;

    adminCreateNominee({
      gameId: awardsGameId,
      categoryId: categoryId,
      category: categoryName,
      nomineeId: sportsWagerSlug_(awayTeam),
      nominee: awayTeam,
      shortAnswer: awayTeam,
      logoUrl: score.AwayLogo || "",
      section: section,
      entryType: "team"
    });

    adminCreateNominee({
      gameId: awardsGameId,
      categoryId: categoryId,
      category: categoryName,
      nomineeId: sportsWagerSlug_(homeTeam),
      nominee: homeTeam,
      shortAnswer: homeTeam,
      logoUrl: score.HomeLogo || "",
      section: section,
      entryType: "team"
    });

    if (typeof normalizedStorageUpsertQuestion_ === "function") {
      normalizedStorageUpsertQuestion_({
        gameId: awardsGameId,
        questionId: categoryId,
        question: categoryName,
        section: section,
        active: true,
        predictionGame: true,
        questionType: "team-matchup",
        scoringEngine: "sports",
        selectionMode: "single",
        entryType: "team",
        oddsMode: "none",
        resultSource: "sports-engine",
        sportsProvider: "ESPN",
        sportsLeague: sportsConfidenceString_(score.League),
        sportsGameId: sportsConfidenceString_(score.GameId),
        espnEventId: sportsConfidenceString_(score.ESPNEventId),
        sportsMarket: "moneyline",
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        homeRecord: score.HomeRecord || "",
        awayRecord: score.AwayRecord || "",
        homeScore: score.HomeScore,
        awayScore: score.AwayScore,
        sportsStatus: sportsConfidenceString_(score.Status),
        sportsState: sportsConfidenceString_(score.State),
        sportsClock: sportsConfidenceString_(score.Clock),
        sportsPeriod: sportsConfidenceString_(score.Period),
        gameDateTime: score.GameDateTime || "",
        sourceSystem: "sports-confidence-builder"
      });
    }

    sportsConfidencePatchCategoryRows_(score, awardsGameId, categoryId);

    SpreadsheetApp.flush();
    if (typeof clearAppCaches === "function") clearAppCaches();

    return {
      success: true,
      duplicate: false,
      awardsGameId: awardsGameId,
      categoryId: categoryId,
      category: categoryName,
      sportsGameId: sportsConfidenceString_(score.GameId),
      espnEventId: sportsConfidenceString_(score.ESPNEventId),
      lockDateTime: score.GameDateTime || ""
    };
  } catch (err) {
    if (categoryCreated && typeof adminDeleteCategory === "function") {
      try {
        adminDeleteCategory({ gameId: awardsGameId, categoryId: categoryId });
      } catch (rollbackErr) {
        // Keep the original error; Run Check will surface any incomplete row.
      }
    }
    throw err;
  }
}

function sportsConfidenceParseSelectedGames_(payload) {
  let selected = payload && (payload.selectedGamesJson || payload.selectedGames) || [];
  if (Array.isArray(selected)) return selected;
  const text = sportsConfidenceString_(selected);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error("Selected sports games JSON is invalid.");
  }
}


function sportsConfidenceScoreFromSelected_(item) {
  item = item || {};

  const snapshot =
    item.score ||
    item.game ||
    item.snapshot ||
    null;

  if (
    snapshot &&
    (
      snapshot.AwayTeam ||
      snapshot.awayTeam
    ) &&
    (
      snapshot.HomeTeam ||
      snapshot.homeTeam
    )
  ) {
    return typeof sportsWagerNormalizeScore_ === "function"
      ? sportsWagerNormalizeScore_(snapshot)
      : snapshot;
  }

  /*
    Compatibility fallback for older frontends. The current Sports page sends
    the already-loaded Sports Scores Engine snapshot so a full week does not
    make one HTTP request per matchup.
  */
  if (typeof fetchSportsScoreForWager_ !== "function") {
    throw new Error("SportsWagerEngine is required for Sports Confidence game creation.");
  }

  return fetchSportsScoreForWager_({
    sportsGameId:
      item.sportsGameId ||
      item.GameId ||
      item.gameId,
    espnEventId:
      item.espnEventId ||
      item.ESPNEventId
  });
}

function sportsConfidenceExistingCategoryIds_(awardsGameId) {
  const ids = {};
  const cleanGameId = sportsConfidenceString_(awardsGameId);

  if (
    typeof normalizedStorageReadQuestionsByGame_ === "function" &&
    typeof normalizedStorageRowsToObjects_ === "function"
  ) {
    const questionData =
      normalizedStorageReadQuestionsByGame_(cleanGameId, {
        bypassRuntimeCache: true,
        trustIndex: false
      });

    normalizedStorageRowsToObjects_(questionData)
      .forEach(function(question) {
        const id = sportsConfidenceKey_(
          question && (
            question.QuestionId ||
            question.questionId
          )
        );
        if (id) ids[id] = true;
      });
  }

  if (
    typeof sportsWagerGetSheet_ === "function" &&
    typeof sportsWagerHeaderMap_ === "function"
  ) {
    [
      typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories",
      typeof CATEGORY_SETTINGS_SHEET !== "undefined"
        ? CATEGORY_SETTINGS_SHEET
        : "CategorySettings"
    ].forEach(function(sheetName) {
      try {
        const sh = sportsWagerGetSheet_(sheetName);
        const data = sh.getDataRange().getValues();

        if (data.length <= 1) return;

        const headers = data[0].map(function(header) {
          return sportsConfidenceString_(header);
        });
        const col = sportsWagerHeaderMap_(headers);

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowGameId = col.GameId !== undefined
            ? sportsConfidenceString_(row[col.GameId])
            : "";
          const rowCategoryId = col.CategoryId !== undefined
            ? sportsConfidenceKey_(row[col.CategoryId])
            : "";

          if (rowGameId === cleanGameId && rowCategoryId) {
            ids[rowCategoryId] = true;
          }
        }
      } catch (err) {
        // Normalized question ids are the primary duplicate source.
      }
    });
  }

  return ids;
}

function sportsConfidenceQuestionPayload_(score, awardsGameId, categoryId) {
  const awayTeam = sportsConfidenceString_(score.AwayTeam);
  const homeTeam = sportsConfidenceString_(score.HomeTeam);
  const categoryName = sportsConfidenceQuestionName_(score);
  const section = sportsConfidenceSection_(score);

  return {
    gameId: awardsGameId,
    questionId: categoryId,
    question: categoryName,
    section: section,
    active: true,
    predictionGame: true,
    questionType: "team-matchup",
    scoringEngine: "sports",
    selectionMode: "single",
    entryType: "team",
    oddsMode: "none",
    resultSource: "sports-engine",
    sportsProvider: "ESPN",
    sportsLeague: sportsConfidenceString_(score.League),
    sportsGameId: sportsConfidenceString_(score.GameId),
    espnEventId: sportsConfidenceString_(score.ESPNEventId),
    sportsMarket: "moneyline",
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homeRecord: score.HomeRecord || "",
    awayRecord: score.AwayRecord || "",
    homeScore: score.HomeScore,
    awayScore: score.AwayScore,
    sportsStatus: sportsConfidenceString_(score.Status),
    sportsState: sportsConfidenceString_(score.State),
    sportsClock: sportsConfidenceString_(score.Clock),
    sportsPeriod: sportsConfidenceString_(score.Period),
    payloadJSON: JSON.stringify({
      gameDateTime: score.GameDateTime || "",
      seasonYear: score.SeasonYear || "",
      seasonType: score.SeasonType || "",
      seasonPhase: score.SeasonPhase || "",
      week: score.Week || ""
    }),
    sourceSystem: "sports-confidence-builder"
  };
}

function sportsConfidenceSettingPayload_(score, awardsGameId, categoryId) {
  const awayTeam = sportsConfidenceString_(score.AwayTeam);
  const homeTeam = sportsConfidenceString_(score.HomeTeam);
  const categoryName = sportsConfidenceQuestionName_(score);
  const kickoff = score.GameDateTime || "";

  return {
    gameId: awardsGameId,
    categoryId: categoryId,
    points: 1,
    locked: false,
    winnerNomineeId: "",
    changePenalty: 0,
    maxChanges: 0,
    lockDateTime: kickoff,
    displayOrder: kickoff ? new Date(kickoff).getTime() : 999,
    groupId: sportsConfidenceString_(score.League) || "sports",
    parentCategoryId: "",
    followUpCategoryId: "",
    followUpMapJSON: "",
    layoutType: "list",
    shortName: awayTeam + " @ " + homeTeam,
    countsAsStatue: false,
    scoreVersion: "",
    favoriteNomineeId: "",
    questionType: "team-matchup",
    scoringEngine: "sports",
    selectionMode: "single",
    scoreMode: "confidence-points",
    oddsMode: "none",
    resultSource: "sports-engine",
    settlementStatus: "pending",
    maxSelections: 1,
    minSelections: 1,
    allowDraw: false,
    allowPush: true,
    sportsGameId: sportsConfidenceString_(score.GameId),
    espnEventId: sportsConfidenceString_(score.ESPNEventId),
    sportsMarket: "moneyline",
    sportsLeague: sportsConfidenceString_(score.League),
    wagerResultType: "",
    minStake: 0,
    maxStake: 0,
    stakeIncrement: 0,
    stakeWinMultiplier: "",
    stakeLossMultiplier: "",
    resultSourceType: "sports-score",
    resultProvider: "ESPN",
    externalEventId: "",
    externalMarketId: "",
    externalSubjectId: "",
    statKey: "",
    comparisonOperator: "",
    threshold: "",
    autoSettle: true,
    requireAdminReview: false,
    sourceUrl: "",
    sourceConfigJSON: JSON.stringify({
      source: "sports-confidence-builder",
      seasonYear: score.SeasonYear || "",
      seasonType: score.SeasonType || "",
      seasonPhase: score.SeasonPhase || "",
      week: score.Week || ""
    }),
    category: categoryName
  };
}

function sportsConfidenceLegacyNomineeRow_(
  headers,
  categoryCol,
  sportsCol,
  score,
  awardsGameId,
  categoryId,
  teamName,
  selection
) {
  const categoryName = sportsConfidenceQuestionName_(score);
  const section = sportsConfidenceSection_(score);
  const nomineeId = sportsWagerSlug_(teamName);
  const row = adminCatBuildNomineeRow_(
    headers,
    categoryCol,
    {
      gameId: awardsGameId,
      categoryId: categoryId,
      category: categoryName,
      nominee: teamName,
      nomineeId: nomineeId,
      section: section,
      shortAnswer: teamName,
      active: true,
      predictionGame: true,
      communityRank: false
    }
  );

  const logo = selection === "away"
    ? score.AwayLogo
    : score.HomeLogo;

  sportsWagerSetIfExists_(row, sportsCol, "QuestionType", "team-matchup");
  sportsWagerSetIfExists_(row, sportsCol, "ScoringEngine", "sports");
  sportsWagerSetIfExists_(row, sportsCol, "SelectionMode", "single");
  sportsWagerSetIfExists_(row, sportsCol, "EntryType", "team");
  sportsWagerSetIfExists_(row, sportsCol, "ScoreMode", "confidence-points");
  sportsWagerSetIfExists_(row, sportsCol, "OddsMode", "none");
  sportsWagerSetIfExists_(row, sportsCol, "ResultSource", "sports-engine");
  sportsWagerSetIfExists_(row, sportsCol, "SportsProvider", "ESPN");
  sportsWagerSetIfExists_(row, sportsCol, "SportsGameId", sportsConfidenceString_(score.GameId));
  sportsWagerSetIfExists_(row, sportsCol, "ESPNEventId", sportsConfidenceString_(score.ESPNEventId));
  sportsWagerSetIfExists_(row, sportsCol, "SportsLeague", sportsConfidenceString_(score.League));
  sportsWagerSetIfExists_(row, sportsCol, "SportsMarket", "moneyline");
  sportsWagerSetIfExists_(row, sportsCol, "SportsSelection", selection);
  sportsWagerSetIfExists_(row, sportsCol, "SportsLine", "");
  sportsWagerSetIfExists_(row, sportsCol, "HomeTeam", sportsConfidenceString_(score.HomeTeam));
  sportsWagerSetIfExists_(row, sportsCol, "AwayTeam", sportsConfidenceString_(score.AwayTeam));
  sportsWagerSetIfExists_(row, sportsCol, "HomeRecord", score.HomeRecord || "");
  sportsWagerSetIfExists_(row, sportsCol, "AwayRecord", score.AwayRecord || "");
  sportsWagerSetIfExists_(row, sportsCol, "HomeScore", score.HomeScore);
  sportsWagerSetIfExists_(row, sportsCol, "AwayScore", score.AwayScore);
  sportsWagerSetIfExists_(row, sportsCol, "SportsStatus", sportsConfidenceString_(score.Status));
  sportsWagerSetIfExists_(row, sportsCol, "SportsState", sportsConfidenceString_(score.State));
  sportsWagerSetIfExists_(row, sportsCol, "SportsClock", sportsConfidenceString_(score.Clock));
  sportsWagerSetIfExists_(row, sportsCol, "SportsPeriod", sportsConfidenceString_(score.Period));
  sportsWagerSetIfExists_(row, sportsCol, "LogoUrl", logo || "");

  return row;
}

function sportsConfidenceBuildBatchRecords_(selected, awardsGameId, existingIds) {
  const created = [];
  const duplicates = [];
  const failed = [];
  const records = [];
  const seen = Object.assign({}, existingIds || {});

  selected.forEach(function(item) {
    try {
      const score = sportsConfidenceScoreFromSelected_(item);
      const awayTeam = sportsConfidenceString_(score && score.AwayTeam);
      const homeTeam = sportsConfidenceString_(score && score.HomeTeam);

      if (!awayTeam || !homeTeam) {
        throw new Error("Sports score is missing AwayTeam or HomeTeam.");
      }

      if (sportsConfidenceScoreStarted_(score)) {
        throw new Error(
          awayTeam + " @ " + homeTeam +
          " has already started and was not added to Confidence."
        );
      }

      const categoryId = sportsConfidenceCategoryId_(score);
      const duplicateResult = {
        success: true,
        duplicate: true,
        awardsGameId: awardsGameId,
        categoryId: categoryId,
        sportsGameId: sportsConfidenceString_(score.GameId),
        espnEventId: sportsConfidenceString_(score.ESPNEventId)
      };

      if (seen[sportsConfidenceKey_(categoryId)]) {
        duplicates.push(duplicateResult);
        return;
      }

      seen[sportsConfidenceKey_(categoryId)] = true;

      records.push({
        score: score,
        categoryId: categoryId,
        categoryName: sportsConfidenceQuestionName_(score),
        section: sportsConfidenceSection_(score)
      });

      created.push({
        success: true,
        duplicate: false,
        awardsGameId: awardsGameId,
        categoryId: categoryId,
        category: sportsConfidenceQuestionName_(score),
        sportsGameId: sportsConfidenceString_(score.GameId),
        espnEventId: sportsConfidenceString_(score.ESPNEventId),
        lockDateTime: score.GameDateTime || ""
      });
    } catch (err) {
      failed.push({
        sportsGameId: sportsConfidenceString_(
          item && (
            item.sportsGameId ||
            item.GameId ||
            item.gameId
          )
        ),
        espnEventId: sportsConfidenceString_(
          item && (
            item.espnEventId ||
            item.ESPNEventId
          )
        ),
        message: err && err.message
          ? err.message
          : String(err)
      });
    }
  });

  return {
    records: records,
    created: created,
    duplicates: duplicates,
    failed: failed
  };
}

function sportsConfidenceWriteBatch_(awardsGameId, records) {
  records = Array.isArray(records) ? records : [];

  if (!records.length) {
    return { questionRows: 0, optionRows: 0, categoryRows: 0, settingRows: 0 };
  }

  const required = [
    "normalizedStorageReadQuestionsByGame_",
    "normalizedStorageReadOptionsByGame_",
    "normalizedStorageRowsToObjects_",
    "normalizedStorageQuestionObject_",
    "normalizedStorageOptionObject_",
    "normalizedStorageReplaceGameRows_",
    "adminCatEnsureHybridHeaders_",
    "getCategorySettingsSheet_",
    "getCategorySettingsColumnMap_",
    "validateCategorySettingsColumns_",
    "adminCatBuildSettingsRow_",
    "getCategoriesSheet_",
    "getCategoriesColumnMap_",
    "validateCategoriesColumns_",
    "adminCatBuildNomineeRow_",
    "sportsWagerHeaderMap_",
    "sportsWagerSetIfExists_"
  ];

  required.forEach(function(name) {
    if (typeof this[name] !== "function") {
      throw new Error("Sports Confidence bulk writer is missing required helper: " + name);
    }
  }, this);

  const questionData =
    normalizedStorageReadQuestionsByGame_(awardsGameId, {
      bypassRuntimeCache: true,
      trustIndex: false
    });
  const optionData =
    normalizedStorageReadOptionsByGame_(awardsGameId, {
      bypassRuntimeCache: true,
      trustIndex: false
    });

  const originalQuestions =
    normalizedStorageRowsToObjects_(questionData);
  const originalOptions =
    normalizedStorageRowsToObjects_(optionData);

  const questionMap = {};
  originalQuestions.forEach(function(question) {
    questionMap[sportsConfidenceKey_(question.QuestionId)] = question;
  });

  const optionMap = {};
  originalOptions.forEach(function(option) {
    optionMap[
      sportsConfidenceKey_(option.QuestionId) +
      "::" +
      sportsConfidenceKey_(option.OptionId)
    ] = option;
  });

  const settingsSheet = getCategorySettingsSheet_();
  adminCatEnsureHybridHeaders_();
  const settingsData = settingsSheet.getDataRange().getValues();
  const settingsHeaders = settingsData[0].map(function(header) {
    return sportsConfidenceString_(header);
  });
  const settingsCol = getCategorySettingsColumnMap_(settingsHeaders);
  validateCategorySettingsColumns_(settingsCol);

  const categoriesSheet = getCategoriesSheet_();
  const categoriesData = categoriesSheet.getDataRange().getValues();
  const categoriesHeaders = categoriesData[0].map(function(header) {
    return sportsConfidenceString_(header);
  });
  const categoryCol = getCategoriesColumnMap_(categoriesHeaders);
  validateCategoriesColumns_(categoryCol);
  const sportsCol = sportsWagerHeaderMap_(categoriesHeaders);

  const settingRows = [];
  const categoryRows = [];

  records.forEach(function(record) {
    const score = record.score;
    const categoryId = record.categoryId;
    const questionPayload =
      sportsConfidenceQuestionPayload_(score, awardsGameId, categoryId);

    questionMap[sportsConfidenceKey_(categoryId)] =
      normalizedStorageQuestionObject_(
        questionPayload,
        questionMap[sportsConfidenceKey_(categoryId)] || null
      );

    [
      {
        team: sportsConfidenceString_(score.AwayTeam),
        logo: score.AwayLogo || "",
        order: 1,
        selection: "away"
      },
      {
        team: sportsConfidenceString_(score.HomeTeam),
        logo: score.HomeLogo || "",
        order: 2,
        selection: "home"
      }
    ].forEach(function(choice) {
      const optionId = sportsWagerSlug_(choice.team);
      const optionKey =
        sportsConfidenceKey_(categoryId) +
        "::" +
        sportsConfidenceKey_(optionId);

      optionMap[optionKey] =
        normalizedStorageOptionObject_(
          {
            gameId: awardsGameId,
            questionId: categoryId,
            optionId: optionId,
            option: choice.team,
            shortAnswer: choice.team,
            logoUrl: choice.logo,
            active: true,
            displayOrder: choice.order,
            sourceSystem: "sports-confidence-builder"
          },
          optionMap[optionKey] || null
        );

      categoryRows.push(
        sportsConfidenceLegacyNomineeRow_(
          categoriesHeaders,
          categoryCol,
          sportsCol,
          score,
          awardsGameId,
          categoryId,
          choice.team,
          choice.selection
        )
      );
    });

    settingRows.push(
      adminCatBuildSettingsRow_(
        settingsHeaders,
        settingsCol,
        sportsConfidenceSettingPayload_(
          score,
          awardsGameId,
          categoryId
        )
      )
    );
  });

  const allQuestions =
    Object.keys(questionMap)
      .map(function(key) { return questionMap[key]; });
  const allOptions =
    Object.keys(optionMap)
      .map(function(key) { return optionMap[key]; });

  const categoryStartRow = categoriesSheet.getLastRow() + 1;
  const settingsStartRow = settingsSheet.getLastRow() + 1;
  let categoryRowsWritten = 0;
  let settingRowsWritten = 0;
  let questionsReplaced = false;
  let optionsReplaced = false;

  try {
    if (categoryRows.length) {
      categoriesSheet
        .getRange(
          categoryStartRow,
          1,
          categoryRows.length,
          categoriesHeaders.length
        )
        .setValues(categoryRows);
      categoryRowsWritten = categoryRows.length;
    }

    if (settingRows.length) {
      settingsSheet
        .getRange(
          settingsStartRow,
          1,
          settingRows.length,
          settingsHeaders.length
        )
        .setValues(settingRows);
      settingRowsWritten = settingRows.length;
    }

    normalizedStorageReplaceGameRows_(
      QUESTIONS_SHEET,
      QUESTIONS_HEADERS,
      "Questions",
      awardsGameId,
      allQuestions
    );
    questionsReplaced = true;

    normalizedStorageReplaceGameRows_(
      QUESTION_OPTIONS_SHEET,
      QUESTION_OPTIONS_HEADERS,
      "QuestionOptions",
      awardsGameId,
      allOptions
    );
    optionsReplaced = true;

    SpreadsheetApp.flush();

    if (typeof normalizedStorageClearCaches_ === "function") {
      normalizedStorageClearCaches_();
    }
    if (typeof adminCatClearCaches_ === "function") {
      adminCatClearCaches_();
    }
    if (typeof clearAppCaches === "function") {
      clearAppCaches();
    }

    return {
      questionRows: records.length,
      optionRows: records.length * 2,
      categoryRows: categoryRows.length,
      settingRows: settingRows.length
    };
  } catch (err) {
    /*
      Best-effort rollback. The bulk writer appends only new legacy/settings
      rows, so they can be removed safely if a later grouped write fails.
    */
    try {
      if (settingRowsWritten) {
        settingsSheet.deleteRows(settingsStartRow, settingRowsWritten);
      }
    } catch (rollbackSettingsErr) {}

    try {
      if (categoryRowsWritten) {
        categoriesSheet.deleteRows(categoryStartRow, categoryRowsWritten);
      }
    } catch (rollbackCategoriesErr) {}

    if (questionsReplaced || optionsReplaced) {
      try {
        normalizedStorageReplaceGameRows_(
          QUESTIONS_SHEET,
          QUESTIONS_HEADERS,
          "Questions",
          awardsGameId,
          originalQuestions
        );
        normalizedStorageReplaceGameRows_(
          QUESTION_OPTIONS_SHEET,
          QUESTION_OPTIONS_HEADERS,
          "QuestionOptions",
          awardsGameId,
          originalOptions
        );
      } catch (rollbackNormalizedErr) {}
    }

    throw err;
  }
}

function apiAdminCreateSportsConfidenceQuestionsBulk(payload) {
  payload = payload || {};
  requireAdmin_(payload);

  const awardsGameId =
    sportsConfidenceString_(
      payload.awardsGameId ||
      payload.gameId
    );

  sportsConfidenceRequireDestinationGame_(awardsGameId);

  const selected =
    sportsConfidenceParseSelectedGames_(payload);

  if (!selected.length) {
    throw new Error("Select at least one sports game for Confidence.");
  }

  if (selected.length > 64) {
    throw new Error("Create at most 64 Confidence games at one time.");
  }

  const lock =
    typeof LockService !== "undefined" &&
    LockService &&
    typeof LockService.getScriptLock === "function"
      ? LockService.getScriptLock()
      : null;

  if (lock) {
    lock.waitLock(20000);
  }

  try {
    const existingIds =
      sportsConfidenceExistingCategoryIds_(
        awardsGameId
      );

    const batch =
      sportsConfidenceBuildBatchRecords_(
        selected,
        awardsGameId,
        existingIds
      );

    let writeSummary = {
      questionRows: 0,
      optionRows: 0,
      categoryRows: 0,
      settingRows: 0
    };

    if (batch.records.length) {
      writeSummary =
        sportsConfidenceWriteBatch_(
          awardsGameId,
          batch.records
        );
    }

    return {
      success: batch.failed.length === 0,
      message:
        "Confidence week build finished. Added: " +
        batch.created.length +
        ". Already existed: " +
        batch.duplicates.length +
        ". Failed: " +
        batch.failed.length +
        ".",
      awardsGameId: awardsGameId,
      createdCount: batch.created.length,
      duplicateCount: batch.duplicates.length,
      failedCount: batch.failed.length,
      created: batch.created,
      duplicates: batch.duplicates,
      failed: batch.failed,
      writeSummary: writeSummary
    };
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}
