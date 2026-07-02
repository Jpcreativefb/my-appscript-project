/* =========================
   CATEGORIES
   MULTIGAME PRODUCTION VERSION

   REQUIRED HEADERS

   GameId
   Category
   CategoryId
   Nominee
   NomineeId
   Section
   FileID
   ShortAnswer
   CategoryImage
   Active
   PredictionGame
   CommunityRank
========================= */

/* =========================================================
   HELPERS
========================================================= */

function normalizeCategoryId_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeNomineeId_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeMovieId_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeGameId_(value){

  return String(value || "")
    .trim();

}

function normalizeBoolean_(value){

  return (
    value === true ||

    String(value)
      .trim()
      .toLowerCase() === "true"
  );

}

function slugify_(value){

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function getCategoriesColumnMap_(headers){

  return {

    gameId:
      headers.indexOf("GameId"),

    category:
      headers.indexOf("Category"),

    categoryId:
      headers.indexOf("CategoryId"),

    nominee:
      headers.indexOf("Nominee"),

    nomineeId:
      headers.indexOf("NomineeId"),

    section:
      headers.indexOf("Section"),

    fileId:
      headers.indexOf("FileID"),

    logoUrl:
      headers.indexOf("LogoUrl"),  

    shortAnswer:
      headers.indexOf("ShortAnswer"),

    categoryImage:
      headers.indexOf("CategoryImage"),

    movieId:
      headers.indexOf("MovieId"),  

    movie: 
      headers.indexOf("Movie"),
      
    person:
      headers.indexOf("Person"),  

    active:
      headers.indexOf("Active"),

    predictionGame:
      headers.indexOf("PredictionGame"),

      communityRank:
      headers.indexOf("CommunityRank"),
    
    sportsLeague:
      headers.indexOf("SportsLeague"),
    
    sportsGameId:
      headers.indexOf("SportsGameId"),
    
    espnEventId:
      headers.indexOf("ESPNEventId"),
    
    homeTeam:
      headers.indexOf("HomeTeam"),
    
    awayTeam:
      headers.indexOf("AwayTeam"),
    
    homeRecord:
      headers.indexOf("HomeRecord"),
    
    awayRecord:
      headers.indexOf("AwayRecord"),
    
    homeScore:
      headers.indexOf("HomeScore"),
    
    awayScore:
      headers.indexOf("AwayScore"),
    
    sportsStatus:
      headers.indexOf("SportsStatus"),
    
    sportsClock:
      headers.indexOf("SportsClock"),
    
    sportsPeriod:
      headers.indexOf("SportsPeriod"),

    sportsProvider:
      headers.indexOf("SportsProvider"),

    sportsState:
      headers.indexOf("SportsState"),

    sportsMarket:
      headers.indexOf("SportsMarket"),

    sportsSelection:
      headers.indexOf("SportsSelection"),

    sportsLine:
      headers.indexOf("SportsLine"),

    bettingOdds:
      headers.indexOf("BettingOdds"),

    oddsSource:
      headers.indexOf("OddsSource"),

    oddsLastUpdated:
      headers.indexOf("OddsLastUpdated"),

    questionType:
      headers.indexOf("QuestionType"),

    scoringEngine:
      headers.indexOf("ScoringEngine"),

    selectionMode:
      headers.indexOf("SelectionMode"),

    entryType:
      headers.indexOf("EntryType"),

    oddsMode:
      headers.indexOf("OddsMode"),

    resultSource:
      headers.indexOf("ResultSource"),

    roundNumber:
      headers.indexOf("RoundNumber"),

    racingDriverId:
      headers.indexOf("RacingDriverId"),

    racingCarNumber:
      headers.indexOf("RacingCarNumber"),

    racingTeam:
      headers.indexOf("RacingTeam"),

    racingManufacturer:
      headers.indexOf("RacingManufacturer"),

    racingStartingPosition:
      headers.indexOf("RacingStartingPosition"),

    racingCurrentPosition:
      headers.indexOf("RacingCurrentPosition"),

    racingFinalPosition:
      headers.indexOf("RacingFinalPosition"),

    racingWinner:
      headers.indexOf("RacingWinner")

  };

}

function validateCategoriesColumns_(col){

  const required = [
    "gameId",
    "category",
    "categoryId",
    "nominee"
  ];

  const missing =
    required.filter(
      key => col[key] === -1
    );

  if (missing.length) {

    throw new Error(
      "Missing Categories headers: " +
      missing.join(", ")
    );

  }

}

/* =========================================================
   GET CATEGORIES
========================================================= */

function getCategories(gameId){

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  const data =
     getAllCategoriesData_();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getCategoriesColumnMap_(
      headers
    );

  validateCategoriesColumns_(col);

  /* =========================
     SETTINGS
  ========================= */

  const settings =
    getCategorySettings(gameId);

  /* =========================
     CATEGORY MAP
  ========================= */

  const map = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      normalizeGameId_(
        row[col.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    /* =========================
       ACTIVE CHECK
    ========================= */

    const active =
      col.active > -1
        ? normalizeBoolean_(
            row[col.active]
          )
        : true;

    if (!active) {
      continue;
    }

    /* =========================
       REQUIRED VALUES
    ========================= */

    const categoryName =
      String(
        row[col.category] || ""
      ).trim();

    const nomineeName =
      String(
        row[col.nominee] || ""
      ).trim();

    if (
      !categoryName ||
      !nomineeName
    ) {
      continue;
    }

    const categoryId =
      normalizeCategoryId_(
        row[col.categoryId]
      );

    if (!categoryId) {

      throw new Error(
        "Missing CategoryId for: " +
        categoryName
      );

    }

    /* =========================
       NOMINEE ID
    ========================= */

    let nomineeId = "";

    if (col.nomineeId > -1) {

      nomineeId =
        normalizeNomineeId_(
          row[col.nomineeId]
        );

    }

    if (!nomineeId) {

      nomineeId =
        slugify_(nomineeName);

    }

    /* =========================
       SETTINGS
    ========================= */

    const config =
      settings[categoryId] || {};

    /* =========================
       CREATE CATEGORY
    ========================= */

    if (!map[categoryId]) {

      const categoryImageId =
        col.categoryImage > -1
          ? row[col.categoryImage]
          : "";

      const categoryImage =
        categoryImageId

          ? `https://drive.google.com/thumbnail?id=${categoryImageId}&sz=w1200`

          : null;

      map[categoryId] = {

        /* =========================
           CORE
        ========================= */

        gameId:
          rowGameId,

        id:
          categoryId,

        name:
          categoryName,

        section:
          col.section > -1

            ? String(
                row[col.section] || "Other"
              ).trim()

            : "Other",

        image:
          categoryImage,

        /* =========================
           DISPLAY
        ========================= */

        displayOrder:
          Number(
            config.displayOrder
          ) || 999,

        layoutType:
          config.layoutType || "image",

        shortName:
          config.shortName || "",

        /* =========================
           LOCKING
        ========================= */

        locked:
          config.locked === true,

        lockDateTime:
          config.lockDateTime || null,

        /* =========================
           SCORING
        ========================= */

        points:
          Number(
            config.points
          ) || 0,

        maxChanges:
          Number(
            config.maxChanges
          ) || 0,

        changePenalty:
          Number(
            config.changePenalty
          ) || 0,

        countsAsStatue:
          config.countsAsStatue === true,

        scoreVersion:
          config.scoreVersion || "",

        questionType:
          config.questionType ||
          (
            col.questionType > -1
              ? String(row[col.questionType] || "").trim()
              : ""
          ) || "award-single-winner",

        scoringEngine:
          config.scoringEngine ||
          (
            col.scoringEngine > -1
              ? String(row[col.scoringEngine] || "").trim()
              : ""
          ) || "manual",

        selectionMode:
          config.selectionMode ||
          (
            col.selectionMode > -1
              ? String(row[col.selectionMode] || "").trim()
              : ""
          ) || "single",

        entryType:
          col.entryType > -1
            ? String(row[col.entryType] || "").trim()
            : "nominee",

        oddsMode:
          config.oddsMode ||
          (
            col.oddsMode > -1
              ? String(row[col.oddsMode] || "").trim()
              : ""
          ) || "none",

        scoreMode:
          config.scoreMode || "correct-pick",

        resultSource:
          config.resultSource ||
          (
            col.resultSource > -1
              ? String(row[col.resultSource] || "").trim()
              : ""
          ) || "manual",

        roundNumber:
          col.roundNumber > -1
            ? String(row[col.roundNumber] || "").trim()
            : "",

        settlementStatus:
          config.settlementStatus || "pending",

        /* =========================
           RESULTS
        ========================= */

        winnerNomineeId:
          config.winnerNomineeId || "",

        favoriteNomineeId:
          config.favoriteNomineeId || "",

        /* =========================
           RELATIONSHIPS
        ========================= */

        groupId:
          config.groupId || "default",

        parentCategoryId:
          config.parentCategoryId || "",

        followUpCategoryId:
          config.followUpCategoryId || "",

        followUpMapJSON:
          config.followUpMapJSON || "",

        /* =========================
           FEATURE FLAGS
        ========================= */

        predictionGame:
          col.predictionGame > -1

            ? normalizeBoolean_(
                row[col.predictionGame]
              )

            : true,

        communityRank:
          col.communityRank > -1

            ? normalizeBoolean_(
                row[col.communityRank]
              )

            : false,
        
        sportsProvider:
            col.sportsProvider > -1
              ? String(row[col.sportsProvider] || "").trim()
              : "",

        sportsLeague:
            col.sportsLeague > -1
              ? String(row[col.sportsLeague] || "").trim()
              : "",
          
        sportsGameId:
            col.sportsGameId > -1
              ? String(row[col.sportsGameId] || "").trim()
              : "",
          
        espnEventId:
            col.espnEventId > -1
              ? String(row[col.espnEventId] || "").trim()
              : "",
          
        homeTeam:
            col.homeTeam > -1
              ? String(row[col.homeTeam] || "").trim()
              : "",
          
        awayTeam:
            col.awayTeam > -1
              ? String(row[col.awayTeam] || "").trim()
              : "",
          
        homeRecord:
            col.homeRecord > -1
              ? String(row[col.homeRecord] || "").trim()
              : "",
          
        awayRecord:
            col.awayRecord > -1
              ? String(row[col.awayRecord] || "").trim()
              : "",
          
        homeScore:
            col.homeScore > -1
              ? row[col.homeScore]
              : "",
          
        awayScore:
            col.awayScore > -1
              ? row[col.awayScore]
              : "",
          
        sportsStatus:
            col.sportsStatus > -1
              ? String(row[col.sportsStatus] || "").trim()
              : "",

        sportsState:
            col.sportsState > -1
              ? String(row[col.sportsState] || "").trim()
              : "",

        sportsMarket:
            config.sportsMarket ||
            (
              col.sportsMarket > -1
                ? String(row[col.sportsMarket] || "").trim()
                : ""
            ),
          
        sportsClock:
            col.sportsClock > -1
              ? String(row[col.sportsClock] || "").trim()
              : "",
          
        sportsPeriod:
            col.sportsPeriod > -1
              ? String(row[col.sportsPeriod] || "").trim()
              : "",

        oddsReady:
          config.oddsReady === true,

        oddsSource:
          config.oddsSource || "",

        oddsLastUpdated:
          config.oddsLastUpdated || "",

        maxSelections:
          Number(config.maxSelections) || 1,

        minSelections:
          Number(config.minSelections) || 1,

        /* =========================
           NOMINEES
        ========================= */

        nominees: []

      };

    }

    /* =========================
       NOMINEE IMAGE
    ========================= */

    const fileId =
      col.fileId > -1
        ? String(row[col.fileId] || "").trim()
        : "";

    const logoUrl =
      col.logoUrl > -1
        ? String(row[col.logoUrl] || "").trim()
        : "";

    let nomineeImage =
      PLACEHOLDER_IMAGE;

    if (logoUrl) {

      nomineeImage =
        logoUrl;

    } else if (fileId) {

      nomineeImage =
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w240-h360`;

    }

    /* =========================
       PUSH NOMINEE
    ========================= */

    map[categoryId]
      .nominees
      .push({

        id:
          nomineeId,

        name:
          nomineeName,

        shortAnswer:
          col.shortAnswer > -1

            ? String(
                row[col.shortAnswer] ||
                nomineeName
              ).trim()

            : nomineeName,

        movieId:
          col.movieId > -1
            ? normalizeMovieId_(
                row[col.movieId]
              )
            : "",

        movie:
          col.movie > -1
            ? String(
                row[col.movie] || ""
              ).trim()
            : "",

        person:
          col.person > -1
            ? String(
                row[col.person] || ""
              ).trim()
            : "",

        image:
          nomineeImage,

        entryType:
          col.entryType > -1
            ? String(row[col.entryType] || "").trim()
            : "nominee",

        sportsSelection:
          col.sportsSelection > -1
            ? String(row[col.sportsSelection] || "").trim()
            : "",

        sportsLine:
          col.sportsLine > -1
            ? String(row[col.sportsLine] || "").trim()
            : "",

        bettingOdds:
          col.bettingOdds > -1
            ? row[col.bettingOdds]
            : "",

        oddsSource:
          col.oddsSource > -1
            ? String(row[col.oddsSource] || "").trim()
            : "",

        oddsLastUpdated:
          col.oddsLastUpdated > -1
            ? String(row[col.oddsLastUpdated] || "").trim()
            : "",

        logoUrl:
          logoUrl,

        racingDriverId:
          col.racingDriverId > -1
            ? String(row[col.racingDriverId] || "").trim()
            : "",

        racingCarNumber:
          col.racingCarNumber > -1
            ? String(row[col.racingCarNumber] || "").trim()
            : "",

        racingTeam:
          col.racingTeam > -1
            ? String(row[col.racingTeam] || "").trim()
            : "",

        racingManufacturer:
          col.racingManufacturer > -1
            ? String(row[col.racingManufacturer] || "").trim()
            : "",

        racingStartingPosition:
          col.racingStartingPosition > -1
            ? row[col.racingStartingPosition]
            : "",

        racingCurrentPosition:
          col.racingCurrentPosition > -1
            ? row[col.racingCurrentPosition]
            : "",

        racingFinalPosition:
          col.racingFinalPosition > -1
            ? row[col.racingFinalPosition]
            : "",

        racingWinner:
          col.racingWinner > -1
            ? (
                row[col.racingWinner] === true ||
                String(row[col.racingWinner] || "")
                  .trim()
                  .toLowerCase() === "true"
              )
            : false

      });

  }

  /* =========================
     SORT + RETURN
  ========================= */

  return Object
    .values(map)
    .sort(
      (a,b) =>
        a.displayOrder -
        b.displayOrder
    );

}

/* =========================================================
   GET NOMINEES FOR CATEGORY
========================================================= */

function getNomineesForCategory(
  gameId,
  categoryId
){

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  categoryId =
    normalizeCategoryId_(
      categoryId
    );

  if (!categoryId) {

    return {
      locked: false,
      winnerNomineeId: "",
      totalUsers: 0,
      nominees: []
    };

  }

  /* =========================
     SETTINGS
  ========================= */

  const settings =
    getCategorySettings(gameId);

  const config =
    settings[categoryId] || {};

  const locked =
    config.locked === true;

  const winnerNomineeId =
    config.winnerNomineeId || "";

  const basePoints =
    Number(config.points) || 0;

  const changePenalty =
    Number(config.changePenalty) || 0;

  /* =========================
     LOAD CATEGORIES
  ========================= */

  const data =
     getAllCategoriesData_();

  if (data.length <= 1) {

    return {
      locked,
      winnerNomineeId,
      totalUsers: 0,
      nominees: []
    };

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getCategoriesColumnMap_(
      headers
    );

  validateCategoriesColumns_(col);

  const nominees = [];
  const nomineeMap = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      normalizeGameId_(
        row[col.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    const rowCategoryId =
      normalizeCategoryId_(
        row[col.categoryId]
      );

    if (
      rowCategoryId !== categoryId
    ) {
      continue;
    }

    const nomineeName =
      String(
        row[col.nominee] || ""
      ).trim();

    if (!nomineeName) {
      continue;
    }

    let nomineeId = "";

    if (col.nomineeId > -1) {

      nomineeId =
        normalizeNomineeId_(
          row[col.nomineeId]
        );

    }

    if (!nomineeId) {

      nomineeId =
        slugify_(nomineeName);

    }

    const fileId =
      col.fileId > -1
        ? row[col.fileId]
        : "";

    const nominee = {

      id:
        nomineeId,

      name:
        nomineeName,

      img:
        fileId

          ? `https://drive.google.com/thumbnail?id=${fileId}`

          : PLACEHOLDER_IMAGE,

      users: []

    };

    nominees.push(nominee);

    nomineeMap[nomineeId] =
      nominee;

  }

  /* =========================
     PICKS
  ========================= */

  const pData =
      getAllPicksData_();

  if (pData.length <= 1) {

    return {
      locked,
      winnerNomineeId,
      totalUsers: 0,
      nominees
    };

  }

  const pHeaders =
    pData[0].map(h =>
      String(h).trim()
    );

  const pCol = {

    gameId:
      pHeaders.indexOf("GameId"),

    username:
      pHeaders.indexOf("Username"),

    categoryId:
      pHeaders.indexOf("CategoryId"),

    nomineeId:
      pHeaders.indexOf("NomineeId"),

    changeCount:
      pHeaders.indexOf("ChangeCount"),

    originalNomineeId:
      pHeaders.indexOf("OriginalNomineeId")

  };

  const userSet =
    new Set();

  for (let i = 1; i < pData.length; i++) {

    const row = pData[i];

    const rowGameId =
      normalizeGameId_(
        row[pCol.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    const rowCategoryId =
      normalizeCategoryId_(
        row[pCol.categoryId]
      );

    if (
      rowCategoryId !== categoryId
    ) {
      continue;
    }

    const username =
      String(
        row[pCol.username] || ""
      ).trim();

    const nomineeId =
      normalizeNomineeId_(
        row[pCol.nomineeId]
      );

    const changeCount =
      Number(
        row[pCol.changeCount]
      ) || 0;

    const originalNomineeId =
      normalizeNomineeId_(
        row[pCol.originalNomineeId]
      );

    userSet.add(username);

    const calculatedPoints =
      basePoints -
      (
        changeCount *
        changePenalty
      );

    /* =========================
       CURRENT PICK
    ========================= */

    const currentNominee =
      nomineeMap[nomineeId];

    if (currentNominee) {

      currentNominee.users.push({

        name:
          username,

        points:
          calculatedPoints,

        type:
          "current"

      });

    }

    /* =========================
       ORIGINAL PICK
    ========================= */

    if (
      originalNomineeId &&
      originalNomineeId !== nomineeId
    ) {

      const originalNominee =
        nomineeMap[
          originalNomineeId
        ];

      if (originalNominee) {

        originalNominee.users.push({

          name:
            username,

          points:
            calculatedPoints,

          type:
            "original"

        });

      }

    }

  }

  return {

    locked:
      locked,

    winnerNomineeId:
      winnerNomineeId,

    totalUsers:
      userSet.size,

    nominees:
      nominees

  };

}

/* =========================================================
   AUTO LOCK CATEGORIES
========================================================= */

function autoLockCategories(
  gameId
){

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        CATEGORY_SETTINGS_SHEET
      );

  if (!sh) {
    return;
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col = {

    gameId:
      headers.indexOf("GameId"),

    locked:
      headers.indexOf("Locked"),

    lockDateTime:
      headers.indexOf("LockDateTime")

  };

  const now =
    new Date();

  let changed =
    false;

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      normalizeGameId_(
        row[col.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    const locked =
      normalizeBoolean_(
        row[col.locked]
      );

    if (locked) {
      continue;
    }

    const rawLock =
      row[col.lockDateTime];

    if (!rawLock) {
      continue;
    }

    const lockDate =
      new Date(rawLock);

    if (lockDate <= now) {

      updateCategoryLockedState_(
        i + 1,
        true
      );

      changed = true;

    }

  }

  if (changed) {

    SpreadsheetApp.flush();

    if (
      typeof clearAppCaches ===
      "function"
    ) {
      clearAppCaches();
    }

  }

}

/* =========================================================
   GENERATE NOMINEE IDS
========================================================= */

function generateNomineeIds(){

  const sh =
    getCategoriesSheet_();

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col = {

    nominee:
      headers.indexOf("Nominee"),

    nomineeId:
      headers.indexOf("NomineeId")

  };

  if (
    col.nominee === -1 ||
    col.nomineeId === -1
  ) {

    throw new Error(
      "Missing Nominee or NomineeId column"
    );

  }

  let updated =
    0;

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const nominee =
      String(
        row[col.nominee] || ""
      ).trim();

    if (!nominee) {
      continue;
    }

    const existingId =
      String(
        row[col.nomineeId] || ""
      ).trim();

    /* =========================
       DO NOT OVERWRITE
    ========================= */

    if (existingId) {
      continue;
    }

    const nomineeId =
      slugify_(nominee);

      updateNomineeId_(
        i + 1,
        nomineeId
      );

    updated++;

  }

  Logger.log(
    "Generated nominee IDs: " +
    updated
  );

}

