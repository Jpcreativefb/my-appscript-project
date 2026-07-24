/* =========================
   GAMES ENGINE
   MULTIGAME PRODUCTION VERSION
========================= */

const GAMES_SHEET =
  "Games";

const GAMES_CACHE_KEY =
  "games_v2";

const DEFAULT_GAME_TYPE =
  "prediction";

var GAMES_RUNTIME_CACHE = GAMES_RUNTIME_CACHE || {};

/* =========================
   SUPPORTED GAME TYPES
========================= */

function getSupportedGameTypes() {

  return [
    {
      id: "prediction",
      label: "Prediction Game",
      description: "Users pick one nominee or answer per category.",
      predictionEnabled: true,
      rankingEnabled: false,
      confidenceEnabled: false,
      wagerEnabled: false
    },
    {
      id: "head-to-head",
      label: "Head-to-Head Game",
      description: "Users pick between two sides, players, drivers, teams, or nominees.",
      predictionEnabled: true,
      rankingEnabled: false,
      confidenceEnabled: false,
      wagerEnabled: false,
      racingEnabled: false,
      mixedGame: false
    },
    {
      id: "confidence",
      label: "Confidence Pool",
      description: "Users make picks and assign confidence points.",
      predictionEnabled: true,
      rankingEnabled: false,
      confidenceEnabled: true,
      wagerEnabled: false
    },
    {
      id: "staked-prediction",
      label: "Staked Prediction Game",
      description: "Users risk points on predictions based on confidence.",
      predictionEnabled: true,
      rankingEnabled: false,
      confidenceEnabled: false,
      wagerEnabled: false,
      racingEnabled: false,
      mixedGame: false
    },
    {
      id: "wager",
      label: "Wager / Chips Game",
      description: "Users pick nominees or answers and wager chips.",
      predictionEnabled: false,
      rankingEnabled: false,
      confidenceEnabled: false,
      wagerEnabled: true,
      racingEnabled: false,
      mixedGame: false
    },
    {
      id: "racing-wager",
      label: "Racing Wager Game",
      description: "Users pick or wager on racing drivers, teams, finishing markets, and race props.",
      predictionEnabled: false,
      rankingEnabled: false,
      confidenceEnabled: false,
      wagerEnabled: true,
      racingEnabled: true,
      mixedGame: false
    },
    {
      id: "mixed",
      label: "Mixed Question Game",
      description: "A flexible game that can combine awards, sports, racing, props, survivor, wagers, and rankings.",
      predictionEnabled: true,
      rankingEnabled: true,
      confidenceEnabled: false,
      wagerEnabled: true,
      racingEnabled: true,
      mixedGame: true
    },
    {
      id: "combo",
      label: "Combo Game",
      description: "A simple admin-facing game type for combining picks, wagers, rankings, racing, and props in one game.",
      predictionEnabled: true,
      rankingEnabled: true,
      confidenceEnabled: true,
      wagerEnabled: true,
      racingEnabled: true,
      mixedGame: true
    },
    {
      id: "survivor",
      label: "Survivor / Elimination Game",
      description: "Users make round-based picks where contestants, teams, or entries can be eliminated over time.",
      predictionEnabled: true,
      rankingEnabled: false,
      confidenceEnabled: false,
      wagerEnabled: false,
      racingEnabled: false,
      mixedGame: false
    },
    {
      id: "ranking",
      label: "Ranking Game",
      description: "Users rank nominees or answers in order.",
      predictionEnabled: false,
      rankingEnabled: true,
      confidenceEnabled: false,
      wagerEnabled: false,
      racingEnabled: false,
      mixedGame: false
    }
  ];

}

/* =========================
   SHEET HELPERS
========================= */

function getGamesSheet_() {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        GAMES_SHEET
      );

  if (!sh) {

    throw new Error(
      "Games sheet missing"
    );

  }

  return sh;

}

function normalizeGameValue_(value) {

  return String(value || "")
    .trim();

}

function normalizeGameId_(value) {

  return String(value || "")
    .trim();

}

function normalizeGameType_(value) {

  const type =
    String(value || DEFAULT_GAME_TYPE)
      .trim()
      .toLowerCase();

  const allowed =
    getSupportedGameTypes()
      .map(t => t.id);

  if (allowed.indexOf(type) === -1) {

    return DEFAULT_GAME_TYPE;

  }

  return type;

}

function normalizeConfidenceScoringMode_(value) {

  const mode =
    String(value || "win_only")
      .trim()
      .toLowerCase();

  if (
    mode === "risk_penalty" ||
    mode === "penalty" ||
    mode === "negative"
  ) {
    return "risk_penalty";
  }

  return "win_only";

}


function normalizeGameFormat_(value) {

  const format =
    String(value || "standard")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

  return (
    format === "hybrid" ||
    format === "mixed" ||
    format === "combo"
  )
    ? "hybrid"
    : "standard";

}

function normalizeSeasonHubMode_(value) {

  const mode =
    String(value || "playable-aggregate")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

  if (
    mode === "leaderboard" ||
    mode === "leaderboard-only" ||
    mode === "standings-only" ||
    mode === "hub-only"
  ) {
    return "leaderboard-only";
  }

  return "playable-aggregate";

}

function normalizeGameRole_(value) {

  const role =
    String(value || "standalone")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

  if (
    role === "parent" ||
    role === "season" ||
    role === "parent-game"
  ) {
    return "parent";
  }

  if (
    role === "mini" ||
    role === "child" ||
    role === "mini-game"
  ) {
    return "mini";
  }

  return "standalone";

}

function normalizeParentContributionMode_(value) {

  const mode =
    String(value || "add-points")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

  const allowed = [
    "add-points",
    "weighted-points",
    "placement-points"
  ];

  return allowed.indexOf(mode) !== -1
    ? mode
    : "add-points";

}

function normalizeLeaderboardScoreMode_(value) {

  const mode =
    String(value || "combined-net")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

  const allowed = [
    "combined-net",
    "fixed-only",
    "staked-balance",
    "separate"
  ];

  return allowed.indexOf(mode) !== -1
    ? mode
    : "combined-net";

}

function normalizeGameBoolean_(value) {

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "")
      .trim() === "1"
  );

}

function normalizeGameNumber_(value, fallback) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return fallback;

  }

  const num =
    Number(value);

  return isNaN(num)
    ? fallback
    : num;

}

function getGamesColumnMap_(headers) {

  return {
    gameId:
      headers.indexOf("GameId"),

    name:
      headers.indexOf("Name"),

    year:
      headers.indexOf("Year"),

    type:
      headers.indexOf("Type"),

    active:
      headers.indexOf("Active"),

    archived:
      headers.indexOf("Archived"),

    defaultGame:
      headers.indexOf("DefaultGame"),

    predictionEnabled:
      headers.indexOf("PredictionEnabled"),

    rankingEnabled:
      headers.indexOf("RankingEnabled"),

    confidenceEnabled:
      headers.indexOf("ConfidenceEnabled"),

    confidenceScoringMode:
      headers.indexOf("ConfidenceScoringMode"),  

    wagerEnabled:
      headers.indexOf("WagerEnabled"),

    startingBankroll:
      headers.indexOf("StartingBankroll"),

    minWager:
      headers.indexOf("MinWager"),

    maxWager:
      headers.indexOf("MaxWager"),

    allowBetRemoval:
      headers.indexOf("AllowBetRemoval"),

    wagerEditMode:
      headers.indexOf("WagerEditMode"),

    mixedGame:
      headers.indexOf("MixedGame"),

    scoringMode:
      headers.indexOf("ScoringMode"),

    scoringEngine:
      headers.indexOf("ScoringEngine"),

    gameRole:
      headers.indexOf("GameRole"),

    hubMode:
      headers.indexOf("HubMode"),

    showMiniGameLinks:
      headers.indexOf("ShowMiniGameLinks"),

    includeParentQuestions:
      headers.indexOf("IncludeParentQuestions"),

    parentGameId:
      headers.indexOf("ParentGameId"),

    includeInParent:
      headers.indexOf("IncludeInParent"),

    parentContributionMode:
      headers.indexOf("ParentContributionMode"),

    parentContributionWeight:
      headers.indexOf("ParentContributionWeight"),

    parentBestCount:
      headers.indexOf("ParentBestCount"),

    placementPointsJSON:
      headers.indexOf("PlacementPointsJSON"),

    leaderboardScoreMode:
      headers.indexOf("LeaderboardScoreMode"),

    fixedPointsEnabled:
      headers.indexOf("FixedPointsEnabled"),

    stakedPointsEnabled:
      headers.indexOf("StakedPointsEnabled"),

    startingPoints:
      headers.indexOf("StartingPoints"),

    minStake:
      headers.indexOf("MinStake"),

    maxStake:
      headers.indexOf("MaxStake"),

    stakeIncrement:
      headers.indexOf("StakeIncrement"),

    stakeWinMultiplier:
      headers.indexOf("StakeWinMultiplier"),

    stakeLossMultiplier:
      headers.indexOf("StakeLossMultiplier"),

    racingLeague:
      headers.indexOf("RacingLeague"),

    racingSeriesId:
      headers.indexOf("RacingSeriesId"),

    racingMarket:
      headers.indexOf("RacingMarket"),  

    themeColor:
      headers.indexOf("ThemeColor"),

    icon:
      headers.indexOf("Icon"),

    sortOrder:
      headers.indexOf("SortOrder"),

    status:
      headers.indexOf("Status"),

    lockAllPicks:
      headers.indexOf("LockAllPicks"),

    showLeaderboard:
      headers.indexOf("ShowLeaderboard"),

    showResultsBeforeLock:
      headers.indexOf("ShowResultsBeforeLock"),

    resultsFinalized:
      headers.indexOf("ResultsFinalized"),

    votingLocked:
      headers.indexOf("VotingLocked"),

    description:
      headers.indexOf("Description"),

    lockLabel:
      headers.indexOf("LockLabel"),

    availableFrom:
      headers.indexOf("AvailableFrom"),

    availableUntil:
      headers.indexOf("AvailableUntil"),

    heroImageFileId:
      headers.indexOf("HeroImageFileID"),

    heroImagePosition:
      headers.indexOf("HeroImagePosition")
  };

}

function validateGamesColumns_(col) {

  const required = [
    "gameId",
    "name",
    "active"
  ];

  const missing =
    required.filter(key =>
      col[key] === -1
    );

  if (missing.length) {

    throw new Error(
      "Games sheet missing columns: " +
      missing.join(", ")
    );

  }

}

function getGameCell_(row, colIndex, fallback) {

  if (colIndex === -1) {
    return fallback;
  }

  const value =
    row[colIndex];

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return fallback;

  }

  return value;

}

/* =========================
   TYPE CONFIG
========================= */

function getGameTypeConfig(type) {

  type =
    normalizeGameType_(
      type
    );

  const types =
    getSupportedGameTypes();

  const config =
    types.find(t =>
      t.id === type
    );

  if (!config) {

    throw new Error(
      "Unsupported game type: " + type
    );

  }

  return config;

}

function buildGameHeroImageUrl_(fileId) {

  fileId =
    normalizeGameValue_(
      fileId
    );

  if (!fileId) {
    return "";
  }

  return (
    "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(fileId) +
    "&sz=w800"
  );

}

function normalizeGameDateTimeValue_(value) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm"
    );
  }

  return normalizeGameValue_(value);

}

/* =========================
   BUILD GAME OBJECT
========================= */

function buildGameObjectFromRow_(
  row,
  col
) {

  const gameId =
    normalizeGameId_(
      getGameCell_(
        row,
        col.gameId,
        ""
      )
    );

  if (!gameId) {
    return null;
  }

  const type =
    normalizeGameType_(
      getGameCell_(
        row,
        col.type,
        DEFAULT_GAME_TYPE
      )
    );

  const typeConfig =
    getGameTypeConfig(
      type
    );

  const explicitPrediction =
    col.predictionEnabled !== -1;

  const explicitRanking =
    col.rankingEnabled !== -1;

  const explicitConfidence =
    col.confidenceEnabled !== -1;

  const explicitWager =
    col.wagerEnabled !== -1;

  return {
    gameId:
      gameId,

    name:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.name,
          gameId
        )
      ),

    year:
      normalizeGameNumber_(
        getGameCell_(
          row,
          col.year,
          null
        ),
        null
      ),

    type:
      type,

    typeLabel:
      typeConfig.label,

    active:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.active,
          false
        )
      ),

    archived:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.archived,
          false
        )
      ),

    defaultGame:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.defaultGame,
          false
        )
      ),

    predictionEnabled:
      explicitPrediction
        ? normalizeGameBoolean_(
            getGameCell_(
              row,
              col.predictionEnabled,
              typeConfig.predictionEnabled
            )
          )
        : typeConfig.predictionEnabled,

    rankingEnabled:
      explicitRanking
        ? normalizeGameBoolean_(
            getGameCell_(
              row,
              col.rankingEnabled,
              typeConfig.rankingEnabled
            )
          )
        : typeConfig.rankingEnabled,

    confidenceEnabled:
      explicitConfidence
        ? normalizeGameBoolean_(
            getGameCell_(
              row,
              col.confidenceEnabled,
              typeConfig.confidenceEnabled
            )
          )
        : typeConfig.confidenceEnabled,

    confidenceScoringMode:
        normalizeConfidenceScoringMode_(
          getGameCell_(
            row,
            col.confidenceScoringMode,
            "win_only"
          )
        ),    

    wagerEnabled:
      explicitWager
        ? normalizeGameBoolean_(
            getGameCell_(
              row,
              col.wagerEnabled,
              typeConfig.wagerEnabled
            )
          )
        : typeConfig.wagerEnabled,

    startingBankroll:
      normalizeGameNumber_(
        getGameCell_(
          row,
          col.startingBankroll,
          100
        ),
        100
      ),

    minWager:
      normalizeGameNumber_(
        getGameCell_(
          row,
          col.minWager,
          1
        ),
        1
      ),

    maxWager:
      normalizeGameNumber_(
        getGameCell_(
          row,
          col.maxWager,
          100
        ),
        100
      ),

    allowBetRemoval:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.allowBetRemoval,
          false
        )
      ),

    wagerEditMode:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.wagerEditMode,
          "editable_until_lock"
        )
      ) || "editable_until_lock",

    mixedGame:
      col.mixedGame !== -1
        ? normalizeGameBoolean_(
            getGameCell_(
              row,
              col.mixedGame,
              typeConfig.mixedGame === true
            )
          )
        : typeConfig.mixedGame === true,

    scoringMode:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.scoringMode,
          type === "mixed"
            ? "mixed"
            : "standard"
        )
      ) || "standard",

    scoringEngine:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.scoringEngine,
          typeConfig.racingEnabled === true
            ? "racing"
            : "manual"
        )
      ) || "manual",

    gameFormat:
      normalizeGameFormat_(
        getGameCell_(
          row,
          col.scoringMode,
          (
            type === "mixed" ||
            type === "combo" ||
            typeConfig.mixedGame === true
          )
            ? "hybrid"
            : "standard"
        )
      ),

    gameRole:
      normalizeGameRole_(
        getGameCell_(
          row,
          col.gameRole,
          "standalone"
        )
      ),

    hubMode:
      normalizeSeasonHubMode_(
        getGameCell_(
          row,
          col.hubMode,
          "playable-aggregate"
        )
      ),

    showMiniGameLinks:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.showMiniGameLinks,
          true
        )
      ),

    includeParentQuestions:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.includeParentQuestions,
          true
        )
      ),

    parentGameId:
      normalizeGameId_(
        getGameCell_(
          row,
          col.parentGameId,
          ""
        )
      ),

    includeInParent:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.includeInParent,
          true
        )
      ),

    parentContributionMode:
      normalizeParentContributionMode_(
        getGameCell_(
          row,
          col.parentContributionMode,
          "add-points"
        )
      ),

    parentContributionWeight:
      normalizeGameNumber_(
        getGameCell_(
          row,
          col.parentContributionWeight,
          1
        ),
        1
      ),

    parentBestCount:
      Math.max(
        0,
        Math.floor(
          normalizeGameNumber_(
            getGameCell_(
              row,
              col.parentBestCount,
              0
            ),
            0
          )
        )
      ),

    placementPointsJSON:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.placementPointsJSON,
          ""
        )
      ),

    leaderboardScoreMode:
      normalizeLeaderboardScoreMode_(
        getGameCell_(
          row,
          col.leaderboardScoreMode,
          "combined-net"
        )
      ),

    fixedPointsEnabled:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.fixedPointsEnabled,
          true
        )
      ),

    stakedPointsEnabled:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.stakedPointsEnabled,
          false
        )
      ),

    startingPoints:
      Math.max(
        0,
        normalizeGameNumber_(
          getGameCell_(
            row,
            col.startingPoints,
            1000
          ),
          1000
        )
      ),

    minStake:
      Math.max(
        1,
        normalizeGameNumber_(
          getGameCell_(
            row,
            col.minStake,
            10
          ),
          10
        )
      ),

    maxStake:
      Math.max(
        1,
        normalizeGameNumber_(
          getGameCell_(
            row,
            col.maxStake,
            100
          ),
          100
        )
      ),

    stakeIncrement:
      Math.max(
        1,
        normalizeGameNumber_(
          getGameCell_(
            row,
            col.stakeIncrement,
            10
          ),
          10
        )
      ),

    stakeWinMultiplier:
      Math.max(
        0,
        normalizeGameNumber_(
          getGameCell_(
            row,
            col.stakeWinMultiplier,
            1
          ),
          1
        )
      ),

    stakeLossMultiplier:
      Math.max(
        0,
        normalizeGameNumber_(
          getGameCell_(
            row,
            col.stakeLossMultiplier,
            1
          ),
          1
        )
      ),

    racingEnabled:
      typeConfig.racingEnabled === true,

    racingLeague:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.racingLeague,
          ""
        )
      ),

    racingSeriesId:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.racingSeriesId,
          ""
        )
      ),

    racingMarket:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.racingMarket,
          "race-winner"
        )
      ) || "race-winner",

    themeColor:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.themeColor,
          ""
        )
      ),

    icon:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.icon,
          ""
        )
      ),

    sortOrder:
      normalizeGameNumber_(
        getGameCell_(
          row,
          col.sortOrder,
          999
        ),
        999
      ),

    status:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.status,
          ""
        )
      ),

    lockAllPicks:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.lockAllPicks,
          false
        )
      ),

    showLeaderboard:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.showLeaderboard,
          true
        )
      ),

    showResultsBeforeLock:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.showResultsBeforeLock,
          false
        )
      ),

    resultsFinalized:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.resultsFinalized,
          false
        )
      ),

    votingLocked:
      normalizeGameBoolean_(
        getGameCell_(
          row,
          col.votingLocked,
          false
        )
      ),

    description:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.description,
          ""
        )
      ),

    lockLabel:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.lockLabel,
          ""
        )
      ),

    availableFrom:
      normalizeGameDateTimeValue_(
        getGameCell_(
          row,
          col.availableFrom,
          ""
        )
      ),

    availableUntil:
      normalizeGameDateTimeValue_(
        getGameCell_(
          row,
          col.availableUntil,
          ""
        )
      ),

    heroImageFileId:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.heroImageFileId,
          ""
        )
      ),

    heroImage:
      buildGameHeroImageUrl_(
        getGameCell_(
          row,
          col.heroImageFileId,
          ""
        )
      ),

    heroImagePosition:
      normalizeGameValue_(
        getGameCell_(
          row,
          col.heroImagePosition,
          "center center"
        )
      ) || "center center"
  };

}

/* =========================
   GET ALL GAMES
========================= */

function getGames() {

  if (
    GAMES_RUNTIME_CACHE &&
    GAMES_RUNTIME_CACHE[GAMES_CACHE_KEY]
  ) {
    return GAMES_RUNTIME_CACHE[GAMES_CACHE_KEY];
  }

  const cache =
    CacheService
      .getScriptCache();

  const cached =
    cache.get(
      GAMES_CACHE_KEY
    );

  if (cached) {

    try {

      const parsed = JSON.parse(
        cached
      );

      GAMES_RUNTIME_CACHE[GAMES_CACHE_KEY] = parsed;

      return parsed;

    } catch (err) {

      Logger.log(
        "Games cache parse failed: " +
        err.message
      );

    }

  }

  const sh =
    getGamesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(h =>
      String(h || "").trim()
    );

  const col =
    getGamesColumnMap_(
      headers
    );

  validateGamesColumns_(
    col
  );

  const games = [];

  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const game =
      buildGameObjectFromRow_(
        data[i],
        col
      );

    if (game) {
      games.push(game);
    }

  }

  games.sort((a, b) =>
    a.sortOrder - b.sortOrder
  );

  safeScriptCachePut_(
    cache,
    GAMES_CACHE_KEY,
    JSON.stringify(games),
    300
  );

  GAMES_RUNTIME_CACHE[GAMES_CACHE_KEY] = games;

  return games;

}

/* =========================
   GET ONE GAME
========================= */

function getGame(gameId) {

  gameId =
    normalizeGameId_(
      gameId
    );

  if (!gameId) {
    return null;
  }

  const games =
    getGames();

  return games.find(game =>
    game.gameId === gameId
  ) || null;

}

/* =========================
   ACTIVE GAMES
========================= */

function getActiveGames() {

  return getGames()
    .filter(game =>
      game.active === true &&
      game.archived !== true
    );

}

/* =========================
   PUBLIC ACTIVE GAMES
========================= */

function getPublicActiveGames() {

  return getActiveGames()
    .map(game => ({
      gameId:
        game.gameId,

      name:
        game.name,

      year:
        game.year,

      type:
        game.type,

      typeLabel:
        game.typeLabel,

      defaultGame:
        game.defaultGame === true,

      predictionEnabled:
        game.predictionEnabled === true,

      rankingEnabled:
        game.rankingEnabled === true,

      confidenceEnabled:
        game.confidenceEnabled === true,
      
      confidenceScoringMode:
        game.confidenceScoringMode || "win_only",

      wagerEnabled:
        game.wagerEnabled === true,

      mixedGame:
        game.mixedGame === true,

      scoringMode:
        game.scoringMode || "standard",

      scoringEngine:
        game.scoringEngine || "manual",

      gameFormat:
        game.gameFormat || "standard",

      gameRole:
        game.gameRole || "standalone",

      hubMode:
        game.hubMode || "playable-aggregate",

      showMiniGameLinks:
        game.showMiniGameLinks !== false,

      includeParentQuestions:
        game.includeParentQuestions !== false,

      parentGameId:
        game.parentGameId || "",

      includeInParent:
        game.includeInParent !== false,

      parentContributionMode:
        game.parentContributionMode || "add-points",

      parentContributionWeight:
        normalizeGameNumber_(game.parentContributionWeight, 1),

      parentBestCount:
        normalizeGameNumber_(game.parentBestCount, 0),

      placementPointsJSON:
        game.placementPointsJSON || "",

      leaderboardScoreMode:
        game.leaderboardScoreMode || "combined-net",

      fixedPointsEnabled:
        game.fixedPointsEnabled !== false,

      stakedPointsEnabled:
        game.stakedPointsEnabled === true,

      startingPoints:
        normalizeGameNumber_(game.startingPoints, 1000),

      minStake:
        normalizeGameNumber_(game.minStake, 10),

      maxStake:
        normalizeGameNumber_(game.maxStake, 100),

      stakeIncrement:
        normalizeGameNumber_(game.stakeIncrement, 10),

      stakeWinMultiplier:
        normalizeGameNumber_(game.stakeWinMultiplier, 1),

      stakeLossMultiplier:
        normalizeGameNumber_(game.stakeLossMultiplier, 1),

      racingEnabled:
        game.racingEnabled === true,

      racingLeague:
        game.racingLeague || "",

      racingSeriesId:
        game.racingSeriesId || "",

      racingMarket:
        game.racingMarket || "race-winner",

      themeColor:
        game.themeColor || "",

      icon:
        game.icon || "",

      status:
        game.status || "",

      lockAllPicks:
        game.lockAllPicks === true
    }));

}

/* =========================
   PARENT / MINI GAME HELPERS
========================= */

function getChildGames(parentGameId) {

  parentGameId =
    normalizeGameId_(
      parentGameId
    );

  if (!parentGameId) {
    return [];
  }

  return getGames()
    .filter(function(game) {
      return (
        game.gameRole === "mini" &&
        game.parentGameId === parentGameId &&
        game.includeInParent !== false
      );
    })
    .sort(function(a, b) {
      return (
        Number(a.sortOrder || 999) -
        Number(b.sortOrder || 999)
      );
    });

}

function getParentGame(gameId) {

  const game =
    getGame(gameId);

  if (
    !game ||
    game.gameRole !== "mini" ||
    !game.parentGameId
  ) {
    return null;
  }

  return getGame(
    game.parentGameId
  );

}

/* =========================
   DEFAULT GAME
========================= */

function getDefaultGameId() {

  const games =
    getGames();

  const explicitDefault =
    games.find(game =>
      game.defaultGame === true &&
      game.active === true &&
      game.archived !== true
    );

  if (explicitDefault) {
    return explicitDefault.gameId;
  }

  const activeGame =
    games.find(game =>
      game.active === true &&
      game.archived !== true
    );

  if (activeGame) {
    return activeGame.gameId;
  }

  throw new Error(
    "No active game found"
  );

}

function getDefaultGame() {

  return getGame(
    getDefaultGameId()
  );

}

/* =========================
   VALIDATE GAME
========================= */

function validateGameId(gameId) {

  gameId =
    normalizeGameId_(
      gameId
    );

  if (!gameId) {

    throw new Error(
      "Missing gameId"
    );

  }

  const game =
    getGame(
      gameId
    );

  if (!game) {

    throw new Error(
      "Invalid gameId: " + gameId
    );

  }

  return true;

}

function validateGameType(type) {

  const normalized =
    normalizeGameType_(
      type
    );

  const allowed =
    getSupportedGameTypes()
      .map(t => t.id);

  if (allowed.indexOf(normalized) === -1) {

    throw new Error(
      "Invalid game type: " + type
    );

  }

  return true;

}

/* =========================
   FEATURE HELPERS
========================= */

function gameSupportsFeature(
  gameId,
  feature
) {

  const game =
    getGame(
      gameId
    );

  if (!game) {
    return false;
  }

  if (feature === "prediction") {
    return game.predictionEnabled === true;
  }

  if (feature === "ranking") {
    return game.rankingEnabled === true;
  }

  if (feature === "confidence") {
    return game.confidenceEnabled === true;
  }

  if (feature === "wager") {
    return game.wagerEnabled === true;
  }

  if (
    feature === "staked-points" ||
    feature === "stakedPoints"
  ) {
    return game.stakedPointsEnabled === true;
  }

  if (feature === "hybrid") {
    return game.gameFormat === "hybrid";
  }

  if (feature === "parent") {
    return game.gameRole === "parent";
  }

  if (feature === "mini") {
    return game.gameRole === "mini";
  }

  if (feature === "leaderboard") {
    return game.showLeaderboard !== false;
  }

  return false;

}

function getGameRuntimeConfig(gameId) {

  const game =
    getGame(
      gameId
    );

  if (!game) {

    throw new Error(
      "Invalid gameId: " + gameId
    );

  }

  return {
    gameId:
      game.gameId,

    name:
      game.name,

    type:
      game.type,

    typeLabel:
      game.typeLabel,

    active:
      game.active,

    archived:
      game.archived,

    lockAllPicks:
      game.lockAllPicks,

    predictionEnabled:
      game.predictionEnabled,

    rankingEnabled:
      game.rankingEnabled,

    confidenceEnabled:
      game.confidenceEnabled,

    confidenceScoringMode:
      game.confidenceScoringMode || "win_only",  

    wagerEnabled:
      game.wagerEnabled,

    gameFormat:
      game.gameFormat || "standard",

    gameRole:
      game.gameRole || "standalone",

    hubMode:
      game.hubMode || "playable-aggregate",

    showMiniGameLinks:
      game.showMiniGameLinks !== false,

    includeParentQuestions:
      game.includeParentQuestions !== false,

    parentGameId:
      game.parentGameId || "",

    includeInParent:
      game.includeInParent !== false,

    parentContributionMode:
      game.parentContributionMode || "add-points",

    parentContributionWeight:
      normalizeGameNumber_(game.parentContributionWeight, 1),

    parentBestCount:
      Math.max(0, Math.floor(normalizeGameNumber_(game.parentBestCount, 0))),

    placementPointsJSON:
      game.placementPointsJSON || "",

    leaderboardScoreMode:
      game.leaderboardScoreMode || "combined-net",

    fixedPointsEnabled:
      game.fixedPointsEnabled !== false,

    stakedPointsEnabled:
      game.stakedPointsEnabled === true,

    startingPoints:
      Math.max(0, normalizeGameNumber_(game.startingPoints, 1000)),

    minStake:
      Math.max(1, normalizeGameNumber_(game.minStake, 10)),

    maxStake:
      Math.max(1, normalizeGameNumber_(game.maxStake, 100)),

    stakeIncrement:
      Math.max(1, normalizeGameNumber_(game.stakeIncrement, 10)),

    stakeWinMultiplier:
      Math.max(0, normalizeGameNumber_(game.stakeWinMultiplier, 1)),

    stakeLossMultiplier:
      Math.max(0, normalizeGameNumber_(game.stakeLossMultiplier, 1)),

    startingBankroll:
      game.startingBankroll,

    minWager:
      game.minWager,

    maxWager:
      game.maxWager,

    showLeaderboard:
      game.showLeaderboard,

    showResultsBeforeLock:
      game.showResultsBeforeLock,

    themeColor:
      game.themeColor,

    icon:
      game.icon
  };

}

/* =========================
   CACHE
========================= */

function clearGamesCache() {

  GAMES_RUNTIME_CACHE = {};

  CacheService
    .getScriptCache()
    .remove(
      GAMES_CACHE_KEY
    );

}