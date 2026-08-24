/* =====================================================
   WAGER / BETTING ENGINE
   Multigame production add-on

   This file keeps the internal function names as Betting*
   so the existing API/page snippets keep working, but it
   now reads the app's existing Wager game settings.

   Required sheet: Bets

   Bets headers:
   GameId
   Timestamp
   Username
   CategoryId
   NomineeId
   BetAmount
   Odds
   LastUpdated

   Optional Categories header:
   BettingOdds

   Existing Games headers used by this engine:
   WagerEnabled
   StartingBankroll
   MinWager
   MaxWager
   AllowBetRemoval
   WagerEditMode

   Supported game type:
   wager
===================================================== */

const BETS_SHEET = "Bets";
const BETS_REQUIRED_HEADERS = [
  "GameId",
  "Timestamp",
  "Username",
  "CategoryId",
  "NomineeId",
  "BetAmount",
  "Odds",
  "LastUpdated"
];

const DEFAULT_BETTING_BANKROLL = 1000;
const DEFAULT_BETTING_MIN_BET = 1;
const DEFAULT_BETTING_MAX_BET = 100;
const DEFAULT_BETTING_ODDS = 2;

/* =====================================================
   BASIC HELPERS
===================================================== */

function normalizeBetString_(value){

  return String(value || "")
    .trim();

}

function normalizeBetKey_(value){

  return normalizeBetString_(value)
    .toLowerCase();

}

function normalizeBetGameId_(value){

  return String(value || "")
    .trim();

}

function toBetNumber_(value, fallback){

  const n = Number(value);

  if (isNaN(n) || !isFinite(n)) {
    return fallback;
  }

  return n;

}

function roundBetMoney_(value){

  return Math.round(
    Number(value || 0) * 100
  ) / 100;

}

function slugifyBet_(value){

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function isBetBoolean_(value){

  const text =
    String(value || "")
      .trim()
      .toLowerCase();

  return (
    value === true ||
    text === "true" ||
    text === "yes" ||
    text === "1"
  );

}

/* =====================================================
   SHEET SETUP
===================================================== */

function ensureBettingHeaders_(sh){

  if (!sh) {
    throw new Error("Bets sheet missing");
  }

  const lastColumn = sh.getLastColumn();

  if (lastColumn === 0) {

    sh.getRange(
      1,
      1,
      1,
      BETS_REQUIRED_HEADERS.length
    ).setValues([
      BETS_REQUIRED_HEADERS
    ]);

    return;

  }

  const headers = sh
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(h => String(h || "").trim());

  const missing = BETS_REQUIRED_HEADERS
    .filter(h => headers.indexOf(h) === -1);

  if (!missing.length) {
    return;
  }

  sh.getRange(
    1,
    lastColumn + 1,
    1,
    missing.length
  ).setValues([
    missing
  ]);

}

function ensureBettingGameSettingsHeaders_(){

  const ss = SpreadsheetApp.getActive();

  const gamesSheet = ss.getSheetByName(GAMES_SHEET);

  if (!gamesSheet) {
    return [];
  }

  const lastColumn = gamesSheet.getLastColumn();

  if (lastColumn < 1) {
    return [];
  }

  const headers = gamesSheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(header) {
      return String(header || "").trim();
    });

  const required = [
    "AllowBetRemoval",
    "WagerEditMode"
  ];

  const missing = required.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missing.length) {
    gamesSheet
      .getRange(
        1,
        lastColumn + 1,
        1,
        missing.length
      )
      .setValues([
        missing
      ]);
  }

  return missing;

}


function setupBettingSheets(){

  const ss = SpreadsheetApp.getActive();

  let betsSheet = ss.getSheetByName(BETS_SHEET);

  if (!betsSheet) {
    betsSheet = ss.insertSheet(BETS_SHEET);
  }

  ensureBettingHeaders_(betsSheet);

  const categoriesSheet = ss.getSheetByName(CATEGORIES_SHEET);

  if (categoriesSheet) {

    const lastColumn = categoriesSheet.getLastColumn();

    if (lastColumn > 0) {

      const headers = categoriesSheet
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0]
        .map(h => String(h || "").trim());

      if (headers.indexOf("BettingOdds") === -1) {

        categoriesSheet
          .getRange(1, lastColumn + 1)
          .setValue("BettingOdds");

      }

    }

  }

  const addedGameColumns =
    ensureBettingGameSettingsHeaders_();

  return {
    success: true,
    message: "Wager sheets are ready",
    addedGameColumns: addedGameColumns
  };

}

function getBetsSheet_(){

  const ss = SpreadsheetApp.getActive();

  let sh = ss.getSheetByName(BETS_SHEET);

  if (!sh) {
    sh = ss.insertSheet(BETS_SHEET);
  }

  ensureBettingHeaders_(sh);

  return sh;

}

function getAllBetsData_(){

  const sh =
    getBetsSheet_();

  if (typeof getSheetDataCached === "function") {
    return getSheetDataCached(
      BETS_SHEET
    );
  }

  return sh
    .getDataRange()
    .getValues();

}

function getBetsDataForGame_(gameId){

  gameId = normalizeBetGameId_(gameId || "");

  if (!gameId) {
    return getAllBetsData_();
  }

  if (typeof normalizedStorageReadRowsByGame_ === "function") {
    return normalizedStorageReadRowsByGame_(
      BETS_SHEET,
      gameId,
      "Bets",
      {
        trustIndex: false
      }
    );
  }

  const data = getAllBetsData_();

  if (!data || data.length <= 1) {
    return data || [];
  }

  const headers = data[0].map(function(header) {
    return String(header || "").trim();
  });
  const gameIdCol = headers.indexOf("GameId");

  if (gameIdCol === -1) {
    return data;
  }

  return [data[0]].concat(
    data.slice(1).filter(function(row) {
      return normalizeBetGameId_(row[gameIdCol]) === gameId;
    })
  );

}

function appendBetRow_(row){

  getBetsSheet_()
    .appendRow(row);

}

function updateBetCell_(row, col, value){

  getBetsSheet_()
    .getRange(row, col)
    .setValue(value);

}

function getBetsColumnMap_(headers){

  return {
    gameId: headers.indexOf("GameId"),
    timestamp: headers.indexOf("Timestamp"),
    username: headers.indexOf("Username"),
    categoryId: headers.indexOf("CategoryId"),
    nomineeId: headers.indexOf("NomineeId"),
    betAmount: headers.indexOf("BetAmount"),
    odds: headers.indexOf("Odds"),
    lastUpdated: headers.indexOf("LastUpdated")
  };

}

function validateBetsColumns_(col){

  const required = [
    "gameId",
    "timestamp",
    "username",
    "categoryId",
    "nomineeId",
    "betAmount",
    "odds",
    "lastUpdated"
  ];

  const missing = required
    .filter(key => col[key] === -1);

  if (missing.length) {

    throw new Error(
      "Missing Bets headers: " +
      missing.join(", ")
    );

  }

}

/* =====================================================
   GAME CONFIG
===================================================== */

function getBettingGameConfig(gameId){

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  validateGameId(gameId);

  const game = getGame(gameId) || {};

  let enabled =
    normalizeBetKey_(game.type) === "wager" ||
    normalizeBetKey_(game.type) === "betting" ||
    game.wagerEnabled === true ||
    game.bettingEnabled === true;

  let allowBetRemoval =
    game.allowBetRemoval === true ||
    game.AllowBetRemoval === true;

  let wagerEditMode = normalizeBetKey_(
    game.wagerEditMode ||
    game.WagerEditMode ||
    "editable_until_lock"
  );

  let startingBankroll = Math.max(
    toBetNumber_(
      game.startingBankroll,
      DEFAULT_BETTING_BANKROLL
    ),
    0
  );

  let minBet = Math.max(
    toBetNumber_(
      game.minWager !== undefined
        ? game.minWager
        : game.minBet,
      DEFAULT_BETTING_MIN_BET
    ),
    0
  );

  let maxBet = Math.max(
    toBetNumber_(
      game.maxWager !== undefined
        ? game.maxWager
        : game.maxBet,
      DEFAULT_BETTING_MAX_BET
    ),
    minBet
  );

  const sh = SpreadsheetApp
    .getActive()
    .getSheetByName(GAMES_SHEET);

  if (sh) {

    const data = sh
      .getDataRange()
      .getValues();

    if (data.length > 1) {

      const headers = data[0]
        .map(h => String(h || "").trim());

      const col = {
        gameId: headers.indexOf("GameId"),
        type: headers.indexOf("Type"),
        wagerEnabled: headers.indexOf("WagerEnabled"),
        bettingEnabled: headers.indexOf("BettingEnabled"),
        startingBankroll: headers.indexOf("StartingBankroll"),
        minWager: headers.indexOf("MinWager"),
        maxWager: headers.indexOf("MaxWager"),
        minBet: headers.indexOf("MinBet"),
        maxBet: headers.indexOf("MaxBet"),
        allowBetRemoval: headers.indexOf("AllowBetRemoval"),
        removeBetEnabled: headers.indexOf("RemoveBetEnabled"),
        wagerEditMode: headers.indexOf("WagerEditMode")
      };

      for (let i = 1; i < data.length; i++) {

        const row = data[i];

        if (
          col.gameId === -1 ||
          normalizeBetGameId_(row[col.gameId]) !== gameId
        ) {
          continue;
        }

        if (col.type > -1) {

          const type = normalizeBetKey_(
            row[col.type]
          );

          enabled =
            enabled ||
            type === "wager" ||
            type === "betting";

        }

        if (col.wagerEnabled > -1) {
          enabled =
            enabled ||
            isBetBoolean_(row[col.wagerEnabled]);
        }

        if (col.bettingEnabled > -1) {
          enabled =
            enabled ||
            isBetBoolean_(row[col.bettingEnabled]);
        }

        if (col.allowBetRemoval > -1) {
          allowBetRemoval =
            isBetBoolean_(
              row[col.allowBetRemoval]
            );
        }

        /*
          Legacy / alternate column support.
          Prefer AllowBetRemoval going forward.
        */
        if (
          col.removeBetEnabled > -1 &&
          col.allowBetRemoval === -1
        ) {
          allowBetRemoval =
            isBetBoolean_(
              row[col.removeBetEnabled]
            );
        }

        if (col.wagerEditMode > -1) {
          wagerEditMode = normalizeBetKey_(
            row[col.wagerEditMode] ||
            wagerEditMode
          );
        }

        if (
          wagerEditMode === "final" ||
          wagerEditMode === "final-once-selected" ||
          wagerEditMode === "final_once_selected" ||
          wagerEditMode === "locked-on-save" ||
          wagerEditMode === "locked_once_saved"
        ) {
          wagerEditMode = "final_once_selected";
        } else {
          wagerEditMode = "editable_until_lock";
        }

        if (col.startingBankroll > -1) {
          startingBankroll = Math.max(
            toBetNumber_(
              row[col.startingBankroll],
              startingBankroll
            ),
            0
          );
        }

        const minWagerCol =
          col.minWager > -1
            ? col.minWager
            : col.minBet;

        if (minWagerCol > -1) {
          minBet = Math.max(
            toBetNumber_(
              row[minWagerCol],
              minBet
            ),
            0
          );
        }

        const maxWagerCol =
          col.maxWager > -1
            ? col.maxWager
            : col.maxBet;

        if (maxWagerCol > -1) {
          maxBet = Math.max(
            toBetNumber_(
              row[maxWagerCol],
              maxBet
            ),
            minBet
          );
        }

        break;

      }

    }

  }

  if (
    wagerEditMode === "final" ||
    wagerEditMode === "final-once-selected" ||
    wagerEditMode === "final_once_selected" ||
    wagerEditMode === "locked-on-save" ||
    wagerEditMode === "locked_once_saved"
  ) {
    wagerEditMode = "final_once_selected";
  } else {
    wagerEditMode = "editable_until_lock";
  }

  return {
    gameId: gameId,
    gameType: normalizeBetKey_(game.type || ""),
    gameFormat: normalizeBetKey_(game.gameFormat || ""),
    mixedGame:
      game.mixedGame === true ||
      normalizeBetKey_(game.type || "") === "mixed" ||
      normalizeBetKey_(game.type || "") === "hybrid" ||
      normalizeBetKey_(game.type || "") === "combo" ||
      normalizeBetKey_(game.gameFormat || "") === "hybrid",
    enabled: enabled,
    wagerEnabled: enabled,
    bettingEnabled: enabled,

    allowBetRemoval: allowBetRemoval,
    removeBetEnabled: allowBetRemoval,
    wagerEditMode: wagerEditMode,
    finalOnceSelected: wagerEditMode === "final_once_selected",
    editableUntilLock: wagerEditMode !== "final_once_selected",

    startingBankroll: startingBankroll,
    minBet: minBet,
    maxBet: maxBet,
    minWager: minBet,
    maxWager: maxBet,
    defaultOdds: DEFAULT_BETTING_ODDS
  };

}

/* =====================================================
   ODDS
===================================================== */

function getBettingOddsMap_(gameId){

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  const map = {};

  let data = [];

  try {

    data =
      typeof getCategoriesDataForGameScoped_ === "function"
        ? getCategoriesDataForGameScoped_(gameId)
        : (
            typeof getAllCategoriesData_ === "function"
              ? getAllCategoriesData_()
              : []
          );

  } catch (err) {

    data = [];

  }

  if (data.length <= 1) {
    return map;
  }

  const headers = data[0]
    .map(h => String(h || "").trim());

  const col = {
    gameId: headers.indexOf("GameId"),
    categoryId: headers.indexOf("CategoryId"),
    nominee: headers.indexOf("Nominee"),
    nomineeId: headers.indexOf("NomineeId"),
    bettingOdds: headers.indexOf("BettingOdds"),
    odds: headers.indexOf("Odds")
  };

  const oddsCol =
    col.bettingOdds > -1
      ? col.bettingOdds
      : col.odds;

  if (
    col.gameId === -1 ||
    col.categoryId === -1 ||
    col.nominee === -1
  ) {
    return map;
  }

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      normalizeBetGameId_(row[col.gameId]) !== gameId
    ) {
      continue;
    }

    const categoryId = normalizeBetKey_(
      row[col.categoryId]
    );

    if (!categoryId) {
      continue;
    }

    let nomineeId = "";

    if (col.nomineeId > -1) {
      nomineeId = normalizeBetKey_(
        row[col.nomineeId]
      );
    }

    if (!nomineeId) {
      nomineeId = slugifyBet_(
        row[col.nominee]
      );
    }

    if (!nomineeId) {
      continue;
    }

    let odds = DEFAULT_BETTING_ODDS;

    if (oddsCol > -1) {

      const rawOdds = row[oddsCol];

      if (
        rawOdds === "" ||
        rawOdds === null ||
        rawOdds === undefined
      ) {
        odds = null;
      } else {

        const parsedOdds =
          toBetNumber_(
            rawOdds,
            null
          );

        odds =
          parsedOdds && parsedOdds > 0
            ? Math.max(parsedOdds, 1)
            : null;

      }

    }

    if (!map[categoryId]) {
      map[categoryId] = {};
    }

    map[categoryId][nomineeId] = odds;

  }

  return map;

}

function isBettingOddsValueReady_(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  const n = Number(value);

  return (
    !isNaN(n) &&
    isFinite(n) &&
    n > 0
  );

}

function getBettingOddsFromMap_(
  oddsMap,
  categoryId,
  nomineeId
) {

  categoryId = normalizeBetKey_(categoryId);
  nomineeId = normalizeBetKey_(nomineeId);

  if (
    oddsMap[categoryId] &&
    Object.prototype.hasOwnProperty.call(
      oddsMap[categoryId],
      nomineeId
    )
  ) {
    return oddsMap[categoryId][nomineeId];
  }

  return null;

}

function getBettingOddsFor_(gameId, categoryId, nomineeId){

  const oddsMap = getBettingOddsMap_(gameId);
  const odds = getBettingOddsFromMap_(
    oddsMap,
    categoryId,
    nomineeId
  );

  return isBettingOddsValueReady_(odds)
    ? odds
    : null;

}

function normalizeBettingScoreMode_(value) {

  const mode =
    normalizeBetKey_(value)
      .replace(/_/g, "-");

  if (
    mode === "bet" ||
    mode === "betting" ||
    mode === "sports-wager" ||
    mode === "wager-odds"
  ) {
    return "wager";
  }

  return mode;

}

function getCanonicalHybridBettingSource_(
  gameId,
  config,
  fallbackCategories,
  fallbackSettings
) {

  fallbackCategories = Array.isArray(fallbackCategories)
    ? fallbackCategories
    : [];

  fallbackSettings = fallbackSettings || {};

  if (
    !config ||
    config.mixedGame !== true ||
    typeof adminGetGameSetup !== "function"
  ) {
    return {
      categories: fallbackCategories,
      settings: fallbackSettings,
      canonical: false
    };
  }

  try {

    const setup = adminGetGameSetup({
      gameId: gameId
    }) || {};

    const setupCategories = Array.isArray(setup.categories)
      ? setup.categories
      : [];

    if (!setupCategories.length) {
      return {
        categories: fallbackCategories,
        settings: fallbackSettings,
        canonical: false
      };
    }

    const fallbackCategoryMap = {};

    fallbackCategories.forEach(function(category) {
      const categoryId = normalizeBetKey_(category && category.id);
      if (categoryId) fallbackCategoryMap[categoryId] = category;
    });

    const categories = [];
    const settings = Object.assign({}, fallbackSettings);

    setupCategories.forEach(function(setupCategory) {

      const categoryId = normalizeBetKey_(
        setupCategory && (
          setupCategory.categoryId ||
          setupCategory.id
        )
      );

      if (!categoryId || setupCategory.active === false) {
        return;
      }

      const fallbackCategory = fallbackCategoryMap[categoryId] || {};
      const fallbackNomineeMap = {};

      (fallbackCategory.nominees || []).forEach(function(nominee) {
        const nomineeId = normalizeBetKey_(nominee && nominee.id);
        if (nomineeId) fallbackNomineeMap[nomineeId] = nominee;
      });

      const canonicalSettings = Object.assign(
        {},
        fallbackSettings[categoryId] || {},
        setupCategory.settings || {}
      );

      const nominees = (setupCategory.nominees || [])
        .filter(function(nominee) {
          return nominee && nominee.active !== false;
        })
        .map(function(nominee) {

          const nomineeId = normalizeBetKey_(
            nominee.nomineeId ||
            nominee.id
          );

          const fallbackNominee = fallbackNomineeMap[nomineeId] || {};

          return Object.assign({}, fallbackNominee, {
            id: nomineeId,
            name:
              nominee.nominee ||
              nominee.name ||
              fallbackNominee.name ||
              nomineeId,
            shortAnswer:
              nominee.shortAnswer ||
              nominee.nominee ||
              nominee.name ||
              fallbackNominee.shortAnswer ||
              fallbackNominee.name ||
              nomineeId,
            image:
              fallbackNominee.image ||
              nominee.image ||
              nominee.logoUrl ||
              ""
          });

        })
        .filter(function(nominee) {
          return !!nominee.id;
        });

      settings[categoryId] = canonicalSettings;

      categories.push(
        Object.assign({}, fallbackCategory, {
          id: categoryId,
          name:
            setupCategory.category ||
            setupCategory.name ||
            fallbackCategory.name ||
            categoryId,
          shortName:
            canonicalSettings.shortName ||
            fallbackCategory.shortName ||
            setupCategory.category ||
            categoryId,
          section:
            setupCategory.section ||
            fallbackCategory.section ||
            "Other",
          image:
            fallbackCategory.image ||
            setupCategory.categoryImage ||
            "",
          displayOrder:
            Number(canonicalSettings.displayOrder) ||
            Number(fallbackCategory.displayOrder) ||
            999,
          locked:
            canonicalSettings.locked === true ||
            fallbackCategory.locked === true,
          lockDateTime:
            canonicalSettings.lockDateTime ||
            fallbackCategory.lockDateTime ||
            "",
          scoreMode:
            canonicalSettings.scoreMode ||
            fallbackCategory.scoreMode ||
            "",
          sportsGameId:
            canonicalSettings.sportsGameId ||
            fallbackCategory.sportsGameId ||
            "",
          espnEventId:
            canonicalSettings.espnEventId ||
            fallbackCategory.espnEventId ||
            "",
          sportsLeague:
            canonicalSettings.sportsLeague ||
            fallbackCategory.sportsLeague ||
            "",
          nominees: nominees
        })
      );

    });

    return {
      categories: categories,
      settings: settings,
      canonical: true
    };

  } catch (err) {

    Logger.log(
      "Canonical Hybrid wager read failed; using standard categories: " +
      err
    );

    return {
      categories: fallbackCategories,
      settings: fallbackSettings,
      canonical: false
    };

  }

}

function isWagerBettingCategory_(
  category,
  setting
) {

  category = category || {};
  setting = setting || {};

  const scoreMode = normalizeBettingScoreMode_(
    setting.scoreMode ||
    setting.ScoreMode ||
    category.scoreMode ||
    category.ScoreMode ||
    ""
  );

  if (scoreMode) {
    return scoreMode === "wager";
  }

  /* Legacy wager rows may predate ScoreMode. */
  const layoutType = normalizeBetKey_(
    setting.layoutType ||
    setting.LayoutType ||
    category.layoutType ||
    category.LayoutType ||
    ""
  );

  const votingTypes = normalizeBetKey_(
    setting.votingTypes ||
    setting.VotingTypes ||
    category.votingTypes ||
    category.VotingTypes ||
    ""
  );

  return (
    layoutType === "wager" ||
    votingTypes.indexOf("wager") !== -1
  );

}

function isSportsWagerBettingCategory_(
  category,
  setting
) {

  category = category || {};
  setting = setting || {};

  const oddsMode = normalizeBetKey_(
    setting.oddsMode ||
    setting.OddsMode ||
    category.oddsMode ||
    category.OddsMode ||
    ""
  );

  const oddsSource = normalizeBetKey_(
    setting.oddsSource ||
    setting.OddsSource ||
    category.oddsSource ||
    category.OddsSource ||
    ""
  );

  return !!(
    category.sportsGameId ||
    category.SportsGameId ||
    category.espnEventId ||
    category.ESPNEventId ||
    setting.sportsGameId ||
    setting.SportsGameId ||
    setting.espnEventId ||
    setting.ESPNEventId ||
    ["sports", "live", "external", "market"].indexOf(oddsMode) !== -1 ||
    (oddsSource && ["manual", "default", "even"].indexOf(oddsSource) === -1)
  );

}

function isBettingCategoryOddsReady_(
  category,
  setting,
  oddsMap,
  categoryId
) {

  category = category || {};
  setting = setting || {};

  if (
    !isSportsWagerBettingCategory_(
      category,
      setting
    )
  ) {
    return true;
  }

  if (setting.oddsReady === false) {
    return false;
  }

  const nominees =
    category.nominees || [];

  if (!nominees.length) {
    return false;
  }

  categoryId = normalizeBetKey_(
    categoryId || category.id
  );

  return nominees.every(function(nominee) {

    const nomineeId =
      normalizeBetKey_(
        nominee.id
      );

    const odds =
      getBettingOddsFromMap_(
        oddsMap,
        categoryId,
        nomineeId
      );

    return isBettingOddsValueReady_(odds);

  });

}

/* =====================================================
   OPTIONS / BALLOT
===================================================== */

function isBettingCategoryLocked_(category, config){

  if (
    category.locked === true ||
    config.locked === true
  ) {
    return true;
  }

  const rawLock =
    config.lockDateTime ||
    category.lockDateTime ||
    "";

  if (!rawLock) {
    return false;
  }

  const lockDate = new Date(rawLock);

  if (isNaN(lockDate.getTime())) {
    return false;
  }

  return lockDate <= new Date();

}

function getBettingOptions(gameId, options){

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  validateGameId(gameId);

  options = options || {};

  const offset = normalizeBettingBatchNumber_(
    options.offset,
    0,
    0
  );

  const limit = (
    options.limit === undefined ||
    options.limit === null ||
    String(options.limit).trim() === ""
  )
    ? 0
    : normalizeBettingBatchNumber_(
        options.limit,
        0,
        0,
        50
      );

  const config = getBettingGameConfig(gameId);
  let categories = getCategories(gameId);
  let settings = getCategorySettings(gameId);
  const oddsMap = getBettingOddsMap_(gameId);

  /*
    Hybrid Game Setup is edited from the canonical Questions,
    QuestionOptions, and raw CategorySettings rows. Read that same source here
    so a newly saved wager question cannot disappear because a player-facing
    projection or cache is one version behind.
  */
  const canonicalSource = getCanonicalHybridBettingSource_(
    gameId,
    config,
    categories,
    settings
  );

  categories = canonicalSource.categories;
  settings = canonicalSource.settings;

  const preparedCategories = categories
    .filter(function(category) {

      const categoryId = normalizeBetKey_(category && category.id);
      const setting = settings[categoryId] || {};

      /*
        Hybrid games can contain fixed, confidence, staked, and wager
        questions together. The Wager page must receive only ScoreMode=wager.
      */
      return isWagerBettingCategory_(category, setting);

    })
    .map(function(category) {

      const categoryId = normalizeBetKey_(
        category.id
      );

      const setting = settings[categoryId] || {};

      const winnerNomineeId =
        normalizeBetKey_(
          setting.winnerNomineeId ||
          setting.WinnerNomineeId ||
          category.winnerNomineeId ||
          category.WinnerNomineeId ||
          ""
        );

      const wagerResultType =
        normalizeBetKey_(
          setting.wagerResultType ||
          setting.WagerResultType ||
          category.wagerResultType ||
          category.WagerResultType ||
          ""
        );

      return {
        category: category,
        categoryId: categoryId,
        setting: setting,
        winnerNomineeId: winnerNomineeId,
        wagerResultType: wagerResultType,
        displayOrder: Number(category.displayOrder) || 999,
        finished:
          !!winnerNomineeId ||
          !!wagerResultType,
        nomineeCount:
          Array.isArray(category.nominees)
            ? category.nominees.length
            : 0
      };

    })
    .filter(function(item) {
      return item.nomineeCount > 0;
    })
    .sort(function(a, b) {

      if (a.finished !== b.finished) {
        return a.finished ? 1 : -1;
      }

      return a.displayOrder - b.displayOrder;

    });

  const selectedPreparedCategories = limit > 0
    ? preparedCategories.slice(
        offset,
        offset + limit
      )
    : preparedCategories;

  const bettingCategories = selectedPreparedCategories
    .map(function(prepared) {

      const category = prepared.category;
      const categoryId = prepared.categoryId;
      const setting = prepared.setting;
      const winnerNomineeId = prepared.winnerNomineeId;
      const wagerResultType = prepared.wagerResultType;

      const nominees = (category.nominees || [])
        .map(nominee => {

          const nomineeId = normalizeBetKey_(
            nominee.id
          );

          const externalOddsRequired =
            isSportsWagerBettingCategory_(
              category,
              setting
            );

          const mappedOdds =
            getBettingOddsFromMap_(
              oddsMap,
              categoryId,
              nomineeId
            );

          const oddsValue =
            isBettingOddsValueReady_(mappedOdds)
              ? mappedOdds
              : externalOddsRequired
                ? null
                : Number(config.defaultOdds || DEFAULT_BETTING_ODDS);

          const oddsAvailable =
            isBettingOddsValueReady_(
              oddsValue
            );

          const odds =
            oddsAvailable
              ? oddsValue
              : "";

          return {
            id: nomineeId,
            name: nominee.name || nominee.shortAnswer || nomineeId,
            shortAnswer: nominee.shortAnswer || nominee.name || nomineeId,
            image: nominee.image || nominee.img || "",
            odds: odds,
            oddsAvailable: oddsAvailable,
            potentialReturnPerUnit: oddsAvailable ? odds : 0
          };

        });

      const oddsReady =
        isBettingCategoryOddsReady_(
          category,
          setting,
          oddsMap,
          categoryId
        );

      return {
        id: categoryId,
        name: category.name,

        shortName:
          category.shortName ||
          setting.shortName ||
          setting.ShortName ||
          category.name,

        section:
          category.section ||
          "Other",

        league:
          category.sportsLeague ||
          category.section ||
          "Other",

        image:
          category.image || "",

        displayOrder:
          Number(category.displayOrder) || 999,

        locked:
          isBettingCategoryLocked_(
            category,
            setting
          ),

        lockDateTime:
          setting.lockDateTime ||
          setting.LockDateTime ||
          category.lockDateTime ||
          category.LockDateTime ||
          "",

        oddsReady:
          oddsReady,

        oddsPending:
          oddsReady === false,

        oddsSource:
          setting.oddsSource ||
          setting.OddsSource ||
          category.oddsSource ||
          category.OddsSource ||
          "",

        oddsLastUpdated:
          setting.oddsLastUpdated ||
          setting.OddsLastUpdated ||
          category.oddsLastUpdated ||
          category.OddsLastUpdated ||
          "",

        sportsGameId:
          setting.sportsGameId ||
          setting.SportsGameId ||
          category.sportsGameId ||
          category.SportsGameId ||
          "",

        espnEventId:
          setting.espnEventId ||
          setting.ESPNEventId ||
          category.espnEventId ||
          category.ESPNEventId ||
          "",

        homeTeam:
          category.homeTeam || "",

        awayTeam:
          category.awayTeam || "",

        homeRecord:
          category.homeRecord || "",

        awayRecord:
          category.awayRecord || "",

        homeScore:
          keepBettingZeroValue_(
            category.homeScore
          ),

        awayScore:
          keepBettingZeroValue_(
            category.awayScore
          ),

        sportsStatus:
          category.sportsStatus || "",

        sportsClock:
          category.sportsClock || "",

        sportsPeriod:
          category.sportsPeriod || "",

        winnerNomineeId:
          winnerNomineeId,

        wagerResultType:
          wagerResultType,

        finished:
          !!winnerNomineeId ||
          !!wagerResultType,

        nominees: nominees
      };

    });

  const nextOffset = limit > 0
    ? offset + bettingCategories.length
    : bettingCategories.length;

  const hasMoreCategories = limit > 0
    ? nextOffset < preparedCategories.length
    : false;

  return {
    success: true,
    gameId: gameId,
    config: config,
    categories: bettingCategories,
    totalCategories: preparedCategories.length,
    sourceMode:
      canonicalSource.canonical === true
        ? "canonical-hybrid"
        : "standard",
    offset: offset,
    limit: limit,
    nextOffset: nextOffset,
    hasMoreCategories: hasMoreCategories
  };

}

function keepBettingZeroValue_(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "";
  }

  return value;

}

function isFinishedBettingCategory_(category) {

  if (!category) {
    return false;
  }

  return (
    category.finished === true ||
    normalizeBetKey_(
      category.winnerNomineeId ||
      category.WinnerNomineeId ||
      ""
    ) !== "" ||
    normalizeBetKey_(
      category.wagerResultType ||
      category.WagerResultType ||
      ""
    ) !== ""
  );

}

function getBettingCategoryFieldWithZero_(
  category,
  fieldNames
) {

  category =
    category || {};

  fieldNames =
    fieldNames || [];

  for (let i = 0; i < fieldNames.length; i++) {

    const fieldName =
      fieldNames[i];

    if (
      category[fieldName] !== null &&
      category[fieldName] !== undefined &&
      String(category[fieldName]).trim() !== ""
    ) {
      return category[fieldName];
    }

  }

  const nominees =
    category.nominees || [];

  for (let i = 0; i < nominees.length; i++) {

    const nominee =
      nominees[i] || {};

    for (let j = 0; j < fieldNames.length; j++) {

      const fieldName =
        fieldNames[j];

      if (
        nominee[fieldName] !== null &&
        nominee[fieldName] !== undefined &&
        String(nominee[fieldName]).trim() !== ""
      ) {
        return nominee[fieldName];
      }

    }

  }

  return "";

}

/* =====================================================
   BET LOOKUPS
===================================================== */

function getLatestBetsByUser_(gameId){

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  const data = getBetsDataForGame_(gameId);

  if (data.length <= 1) {
    return {};
  }

  const headers = data[0]
    .map(h => String(h || "").trim());

  const col = getBetsColumnMap_(headers);
  validateBetsColumns_(col);

  const byUser = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      normalizeBetGameId_(row[col.gameId]) !== gameId
    ) {
      continue;
    }

    const username = normalizeBetString_(
      row[col.username]
    );

    const userKey = normalizeBetKey_(username);

    const categoryId = normalizeBetKey_(
      row[col.categoryId]
    );

    const nomineeId = normalizeBetKey_(
      row[col.nomineeId]
    );

    const betAmount = roundBetMoney_(
      row[col.betAmount]
    );

    if (
      !userKey ||
      !categoryId ||
      !nomineeId ||
      betAmount <= 0
    ) {
      continue;
    }

    const odds = Math.max(
      toBetNumber_(
        row[col.odds],
        DEFAULT_BETTING_ODDS
      ),
      1
    );

    const timestamp = new Date(
      row[col.lastUpdated] ||
      row[col.timestamp] ||
      new Date()
    );

    if (!byUser[userKey]) {
      byUser[userKey] = {
        username: username,
        bets: {}
      };
    }

    const existing = byUser[userKey]
      .bets[categoryId];

    if (
      !existing ||
      existing.timestamp < timestamp
    ) {

      byUser[userKey]
        .bets[categoryId] = {
          username: username,
          categoryId: categoryId,
          nomineeId: nomineeId,
          betAmount: betAmount,
          odds: odds,
          potentialReturn: roundBetMoney_(
            betAmount * odds
          ),
          timestamp: timestamp
        };

    }

  }

  return byUser;

}

function getLatestBetsForSingleUser_(username, gameId){

  const userKey = normalizeBetKey_(username);

  if (!userKey) {
    return {};
  }

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  const data = getAllBetsData_();

  if (data.length <= 1) {
    return {};
  }

  const headers = data[0]
    .map(h => String(h || "").trim());

  const col = getBetsColumnMap_(headers);
  validateBetsColumns_(col);

  const bets = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      normalizeBetGameId_(row[col.gameId]) !== gameId
    ) {
      continue;
    }

    if (
      normalizeBetKey_(row[col.username]) !== userKey
    ) {
      continue;
    }

    const categoryId = normalizeBetKey_(
      row[col.categoryId]
    );

    const nomineeId = normalizeBetKey_(
      row[col.nomineeId]
    );

    const betAmount = roundBetMoney_(
      row[col.betAmount]
    );

    if (
      !categoryId ||
      !nomineeId ||
      betAmount <= 0
    ) {
      continue;
    }

    const odds = Math.max(
      toBetNumber_(
        row[col.odds],
        DEFAULT_BETTING_ODDS
      ),
      1
    );

    const timestamp = new Date(
      row[col.lastUpdated] ||
      row[col.timestamp] ||
      new Date()
    );

    const existing = bets[categoryId];

    if (
      !existing ||
      existing.timestamp < timestamp
    ) {

      bets[categoryId] = {
        username: normalizeBetString_(
          row[col.username]
        ),
        categoryId: categoryId,
        nomineeId: nomineeId,
        betAmount: betAmount,
        odds: odds,
        potentialReturn: roundBetMoney_(
          betAmount * odds
        ),
        timestamp: timestamp
      };

    }

  }

  return bets;

}

function getUserBets(username, gameId){

  username = normalizeBetKey_(username);

  if (!username) {
    return [];
  }

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  const bets = getLatestBetsForSingleUser_(
    username,
    gameId
  );

  return Object
    .values(bets)
    .sort((a,b) =>
      a.categoryId.localeCompare(b.categoryId)
    );

}

function getBetResolution_(bet, settings){

  const config =
    settings[bet.categoryId] || {};

  const winnerNomineeId =
    normalizeBetKey_(
      config.winnerNomineeId ||
      config.WinnerNomineeId ||
      ""
    );

  const wagerResultType =
    normalizeBetKey_(
      config.wagerResultType ||
      config.WagerResultType ||
      ""
    );

  /*
    Normal 2-option moneyline tie:
    WinnerNomineeId is intentionally "draw" so the wager is finalized,
    but payout must still be a half-refund.
  */
  if (wagerResultType === "half-refund") {

    return {
      status: "half-refund",
      payout:
        roundBetMoney_(
          Number(bet.betAmount || 0) / 2
        ),
      won: false,
      lost: false,
      refunded: true
    };

  }

  if (
    wagerResultType === "refund" ||
    wagerResultType === "push" ||
    wagerResultType === "void"
  ) {

    return {
      status: "refund",
      payout:
        roundBetMoney_(
          Number(bet.betAmount || 0)
        ),
      won: false,
      lost: false,
      refunded: true
    };

  }

  if (!winnerNomineeId) {

    return {
      status: "pending",
      payout: 0,
      won: false,
      lost: false,
      refunded: false
    };

  }

  const betNomineeId =
    normalizeBetKey_(
      bet.nomineeId
    );

  const won =
    betNomineeId === winnerNomineeId ||
    slugifyBet_(betNomineeId) ===
      slugifyBet_(winnerNomineeId);

  return {
    status: won ? "won" : "lost",
    payout: won
      ? roundBetMoney_(
          bet.betAmount * bet.odds
        )
      : 0,
    won: won,
    lost: !won,
    refunded: false
  };

}

/* =====================================================
   SUMMARY
===================================================== */

function getUserBettingSummary(username, gameId){

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  validateGameId(gameId);

  const config = getBettingGameConfig(gameId);
  const settings = getCategorySettings(gameId);
  const bets = getUserBets(username, gameId);

  let totalStaked = 0;
  let pendingStake = 0;
  let pendingPotentialReturn = 0;
  let payout = 0;
  let wonBets = 0;
  let lostBets = 0;
  let pendingBets = 0;
  let refundedBets = 0;

  const resolvedBets = bets.map(bet => {

    const resolution = getBetResolution_(
      bet,
      settings
    );

    totalStaked += bet.betAmount;

    if (resolution.status === "pending") {
      pendingStake += bet.betAmount;
      pendingPotentialReturn += bet.potentialReturn;
      pendingBets++;
    }

    if (resolution.status === "won") {
      payout += resolution.payout;
      wonBets++;
    }

    if (
      resolution.status === "half-refund" ||
      resolution.status === "refund"
    ) {
      payout += resolution.payout;
      refundedBets++;
    }

    if (resolution.status === "lost") {
      lostBets++;
    }

    return Object.assign({}, bet, {
      status: resolution.status,
      payout: resolution.payout
    });

  });

  totalStaked = roundBetMoney_(totalStaked);
  pendingStake = roundBetMoney_(pendingStake);
  pendingPotentialReturn = roundBetMoney_(pendingPotentialReturn);
  payout = roundBetMoney_(payout);

  const bankroll = roundBetMoney_(
    config.startingBankroll -
    totalStaked +
    payout
  );

  const maxBankroll = roundBetMoney_(
    bankroll + pendingPotentialReturn
  );

  return {
    username: normalizeBetString_(username),
    gameId: gameId,
    startingBankroll: config.startingBankroll,
    minBet: config.minBet,
    maxBet: config.maxBet,
    minWager: config.minWager,
    maxWager: config.maxWager,
    totalStaked: totalStaked,
    pendingStake: pendingStake,
    activeWagered: pendingStake,
    pendingPotentialReturn: pendingPotentialReturn,
    payout: payout,
    bankroll: bankroll,
    available: bankroll,
    maxBankroll: maxBankroll,
    wonBets: wonBets,
    lostBets: lostBets,
    refundedBets: refundedBets,
    pendingBets: pendingBets,
    totalBets: bets.length,
    bets: resolvedBets
  };

}

function apiGetMyBets(username, gameId){

  if (!username) {

    return {
      success: false,
      message: "Missing username"
    };

  }

  return {
    success: true,
    summary: getUserBettingSummary(
      username,
      gameId
    )
  };

}

/* =====================================================
   PAGE PAYLOAD
   One-call wager page load for frontend speed.
===================================================== */

function normalizeBettingBatchNumber_(value, fallback, min, max){

  let n = Number(value);

  if (isNaN(n) || !isFinite(n)) {
    n = fallback;
  }

  n = Math.floor(n);

  if (min !== undefined) {
    n = Math.max(n, min);
  }

  if (max !== undefined) {
    n = Math.min(n, max);
  }

  return n;

}

function normalizeBettingPayloadBoolean_(value, defaultValue){

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return defaultValue;
  }

  if (value === true || value === false) {
    return value;
  }

  const clean = String(value)
    .trim()
    .toLowerCase();

  if (
    clean === "true" ||
    clean === "1" ||
    clean === "yes"
  ) {
    return true;
  }

  if (
    clean === "false" ||
    clean === "0" ||
    clean === "no"
  ) {
    return false;
  }

  return defaultValue;

}

function apiGetBettingPagePayload(payload){

  payload = payload || {};

  const username = normalizeBetString_(
    payload.username
  );

  const gameId = normalizeBetGameId_(
    payload.gameId || getDefaultGameId()
  );

  if (!username) {

    return {
      success: false,
      message: "Missing username"
    };

  }

  const offset = normalizeBettingBatchNumber_(
    payload.offset,
    0,
    0
  );

  const limit = normalizeBettingBatchNumber_(
    payload.limit,
    12,
    1,
    50
  );

  const includeSummary = normalizeBettingPayloadBoolean_(
    payload.includeSummary,
    offset === 0
  );

  const includeLeaderboard = normalizeBettingPayloadBoolean_(
    payload.includeLeaderboard,
    false
  );

  const options = getBettingOptions(
    gameId,
    {
      offset: offset,
      limit: limit
    }
  );

  if (!options || options.success === false) {
    return options || {
      success: false,
      message: "Could not load wager options"
    };
  }

  const categories = Array.isArray(options.categories)
    ? options.categories
    : [];

  const totalCategories = Number(options.totalCategories) || categories.length;
  const nextOffset = Number(options.nextOffset) || (offset + categories.length);
  const hasMoreCategories = options.hasMoreCategories === true;

  const bets = includeSummary
    ? apiGetMyBets(
        username,
        gameId
      )
    : null;

  const leaderboard = includeLeaderboard
    ? getBettingLeaderboardData(
        gameId
      )
    : [];

  return {
    success: true,
    optimized: true,
    batched: true,
    payloadType: "betting_page_v2_batched",
    gameId: gameId,
    config: options.config || {},
    categories: categories,
    categoryBatch: {
      offset: offset,
      limit: limit,
      count: categories.length,
      total: totalCategories,
      nextOffset: nextOffset,
      hasMore: hasMoreCategories
    },
    hasMoreCategories: hasMoreCategories,
    nextCategoryOffset: nextOffset,
    summary:
      bets && bets.summary
        ? bets.summary
        : {},
    summaryDeferred: !includeSummary,
    leaderboard:
      Array.isArray(leaderboard)
        ? leaderboard
        : leaderboard && leaderboard.leaderboard
          ? leaderboard.leaderboard
          : [],
    leaderboardDeferred: !includeLeaderboard
  };

}

/* =====================================================
   SAVE BET
===================================================== */

function findExistingBetRows_(data, col, gameId, username, categoryId){

  const rowNumbers = [];
  const userKey = normalizeBetKey_(username);

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      normalizeBetGameId_(row[col.gameId]) !== gameId
    ) {
      continue;
    }

    if (
      normalizeBetKey_(row[col.username]) !== userKey
    ) {
      continue;
    }

    if (
      normalizeBetKey_(row[col.categoryId]) !== categoryId
    ) {
      continue;
    }

    rowNumbers.push(i + 1);

  }

  rowNumbers.sort(function(a, b) {
    return a - b;
  });

  return {
    rowNumbers: rowNumbers,
    canonicalRow:
      rowNumbers.length
        ? rowNumbers[0]
        : -1,
    duplicateRows:
      rowNumbers.length > 1
        ? rowNumbers.slice(1)
        : []
  };

}

/*
  Backward-compatible helper retained for any older internal calls.
  The canonical row is always the earliest row so duplicate rows can
  be deleted from bottom to top without shifting the row being updated.
*/
function findExistingBetRow_(data, col, gameId, username, categoryId){

  return findExistingBetRows_(
    data,
    col,
    gameId,
    username,
    categoryId
  ).canonicalRow;

}

function deleteBetRowsDescending_(sheet, rowNumbers){

  rowNumbers = Array.isArray(rowNumbers)
    ? rowNumbers.slice()
    : [];

  rowNumbers
    .sort(function(a, b) {
      return b - a;
    })
    .forEach(function(rowNumber) {
      sheet.deleteRow(rowNumber);
    });

  return rowNumbers.length;

}

function saveBet(payload){

  let lock = null;
  let lockAcquired = false;

  try {

    if (!payload) {

      return {
        success: false,
        message: "Missing payload"
      };

    }

    const username = normalizeBetString_(
      payload.username
    );

    const categoryId = normalizeBetKey_(
      payload.categoryId
    );

    const nomineeId = normalizeBetKey_(
      payload.nomineeId
    );

    const gameId = normalizeBetGameId_(
      payload.gameId || getDefaultGameId()
    );

    const betAmount = roundBetMoney_(
      payload.betAmount
    );

    validateGameId(gameId);

    if (
      !username ||
      !categoryId ||
      !nomineeId ||
      !gameId
    ) {

      return {
        success: false,
        message: "Missing required fields"
      };

    }

    const config = getBettingGameConfig(gameId);

    if (!config.enabled) {

      return {
        success: false,
        message: "Wagering is not enabled for this game"
      };

    }

    if (
      betAmount < config.minBet ||
      betAmount > config.maxBet
    ) {

      return {
        success: false,
        message:
          "Wager must be between " +
          config.minWager +
          " and " +
          config.maxWager
      };

    }

    const categories = getCategories(gameId);

    const category = categories.find(c =>
      normalizeBetKey_(c.id) === categoryId
    );

    if (!category) {

      return {
        success: false,
        message: "Category not found"
      };

    }

    const nomineeExists = (category.nominees || [])
      .some(n =>
        normalizeBetKey_(n.id) === nomineeId
      );

    if (!nomineeExists) {

      return {
        success: false,
        message: "Invalid nomineeId"
      };

    }

    const settings = getCategorySettings(gameId);
    const categoryConfig = settings[categoryId] || {};

    const winnerNomineeId = normalizeBetKey_(
      categoryConfig.winnerNomineeId ||
      categoryConfig.WinnerNomineeId ||
      category.winnerNomineeId ||
      category.WinnerNomineeId ||
      ""
    );

    const wagerResultType = normalizeBetKey_(
      categoryConfig.wagerResultType ||
      categoryConfig.WagerResultType ||
      category.wagerResultType ||
      category.WagerResultType ||
      ""
    );

    if (winnerNomineeId || wagerResultType) {

      return {
        success: false,
        message: "This wager has already been resolved"
      };

    }

    if (
      isBettingCategoryLocked_(
        category,
        categoryConfig
      )
    ) {

      return {
        success: false,
        message: "Category is locked"
      };

    }

    const oddsMap = getBettingOddsMap_(gameId);

    if (
      !isBettingCategoryOddsReady_(
        category,
        categoryConfig,
        oddsMap,
        categoryId
      )
    ) {

      return {
        success: false,
        message: "Odds are not ready for this wager yet"
      };

    }

    const selectedOdds =
      getBettingOddsFromMap_(
        oddsMap,
        categoryId,
        nomineeId
      );

    if (!isBettingOddsValueReady_(selectedOdds)) {

      return {
        success: false,
        message: "Odds are not ready for this selection yet"
      };

    }

    // All static validation is complete. Only serialize the bankroll check and
    // actual Bets row mutation; do not hold a shared lock while loading game
    // config, questions, settings, or odds.
    lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
    const gotLock = lock.tryLock(2500);
    lockAcquired = gotLock;
    if (!gotLock) {
      return {
        success: false,
        message: "Could not save wager: another write is finishing. Please try once more."
      };
    }

    const currentSummary = getUserBettingSummary(
      username,
      gameId
    );

    const currentBetForCategory = (currentSummary.bets || [])
      .find(function(bet) {
        return normalizeBetKey_(bet.categoryId) === categoryId;
      });

    const existingAmountForCategory = currentBetForCategory
      ? Number(currentBetForCategory.betAmount || 0)
      : 0;

    const availableForThisBet = roundBetMoney_(
      Number(currentSummary.bankroll || 0) +
      existingAmountForCategory
    );

    if (betAmount > availableForThisBet) {

      return {
        success: false,
        message: "Bet exceeds available bankroll",
        available: availableForThisBet
      };

    }

    const odds = selectedOdds;

    const data = getAllBetsData_();

    const headers = data[0]
      .map(h => String(h || "").trim());

    const col = getBetsColumnMap_(headers);
    validateBetsColumns_(col);

    const now = new Date();

    const existing = findExistingBetRows_(
      data,
      col,
      gameId,
      username,
      categoryId
    );

    if (
      existing.canonicalRow > -1 &&
      config.wagerEditMode === "final_once_selected"
    ) {

      return {
        success: false,
        message: "This wager is final once selected and cannot be changed"
      };

    }

    let saveAction = "created";
    let duplicatesRemoved = 0;

    if (existing.canonicalRow > -1) {

      const sheet = getBetsSheet_();
      const row = data[existing.canonicalRow - 1]
        .slice();

      row[col.gameId] = gameId;
      row[col.username] = username;
      row[col.categoryId] = categoryId;
      row[col.nomineeId] = nomineeId;
      row[col.betAmount] = betAmount;
      row[col.odds] = odds;
      row[col.lastUpdated] = now;

      if (!row[col.timestamp]) {
        row[col.timestamp] = now;
      }

      sheet
        .getRange(
          existing.canonicalRow,
          1,
          1,
          headers.length
        )
        .setValues([row]);

      duplicatesRemoved = deleteBetRowsDescending_(
        sheet,
        existing.duplicateRows
      );

      saveAction = "updated";

    } else {

      const row = new Array(headers.length)
        .fill("");

      row[col.gameId] = gameId;
      row[col.timestamp] = now;
      row[col.username] = username;
      row[col.categoryId] = categoryId;
      row[col.nomineeId] = nomineeId;
      row[col.betAmount] = betAmount;
      row[col.odds] = odds;
      row[col.lastUpdated] = now;

      appendBetRow_(row);

    }

    SpreadsheetApp.flush();

    // The spreadsheet mutation is complete. Release the write lock before
    // cache invalidation and summary reconstruction so one wager cannot block
    // unrelated interactive saves.
    if (lockAcquired) {
      lock.releaseLock();
      lockAcquired = false;
    }

    if (typeof clearPlayerActionCaches === "function") {
      clearPlayerActionCaches(
        gameId,
        [typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets"],
        username
      );
    } else if (typeof clearGameCaches === "function") {
      clearGameCaches(gameId);
    }

    return {
      success: true,
      gameId: gameId,
      categoryId: categoryId,
      nomineeId: nomineeId,
      betAmount: betAmount,
      odds: odds,
      action: saveAction,
      duplicatesRemoved: duplicatesRemoved,
      potentialReturn: roundBetMoney_(
        betAmount * odds
      ),
      summary: getUserBettingSummary(
        username,
        gameId
      )
    };

  } catch (err) {

    Logger.log(
      "🚨 saveBet ERROR | " +
      err.message
    );

    return {
      success: false,
      message: err.message
    };

  } finally {

    if (lockAcquired && lock) lock.releaseLock();

  }

}

function previewDuplicateBetsCleanup(){

  const sh = getBetsSheet_();
  const data = sh.getDataRange().getValues();

  if (data.length <= 2) {
    return {
      success: true,
      duplicateGroups: 0,
      duplicateRows: 0,
      totalBets: Math.max(0, data.length - 1),
      groups: []
    };
  }

  const headers = data[0].map(function(header) {
    return String(header || "").trim();
  });

  const col = getBetsColumnMap_(headers);
  validateBetsColumns_(col);

  const groups = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];
    const gameId = normalizeBetGameId_(row[col.gameId]);
    const username = normalizeBetString_(row[col.username]);
    const categoryId = normalizeBetKey_(row[col.categoryId]);

    if (!gameId || !username || !categoryId) {
      continue;
    }

    const key = [
      gameId,
      normalizeBetKey_(username),
      categoryId
    ].join("|");

    if (!groups[key]) {
      groups[key] = {
        gameId: gameId,
        username: username,
        categoryId: categoryId,
        rows: 0
      };
    }

    groups[key].rows++;

  }

  const duplicates = Object.keys(groups)
    .map(function(key) {
      return groups[key];
    })
    .filter(function(group) {
      return group.rows > 1;
    })
    .sort(function(a, b) {
      return b.rows - a.rows;
    });

  const duplicateRows = duplicates.reduce(function(total, group) {
    return total + group.rows - 1;
  }, 0);

  return {
    success: true,
    duplicateGroups: duplicates.length,
    duplicateRows: duplicateRows,
    totalBets: data.length - 1,
    groups: duplicates.slice(0, 25)
  };

}

function cleanupDuplicateBets(){

  const lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());

  if (!lock.tryLock(10000)) {
    return {
      success: false,
      skipped: true,
      message: "Could not clean duplicate wagers because another wager operation is running."
    };
  }

  try {

    const sh = getBetsSheet_();
    const data = sh.getDataRange().getValues();

    if (data.length <= 2) {
      return {
        success: true,
        groupsConsolidated: 0,
        rowsRemoved: 0,
        remainingBets: Math.max(0, data.length - 1)
      };
    }

    const headers = data[0].map(function(header) {
      return String(header || "").trim();
    });

    const col = getBetsColumnMap_(headers);
    validateBetsColumns_(col);

    const output = [data[0].slice()];
    const outputIndexByKey = {};
    const duplicateGroupKeys = {};
    let rowsRemoved = 0;

    function rowTimestamp_(row) {
      const raw =
        row[col.lastUpdated] ||
        row[col.timestamp] ||
        "";

      const parsed = new Date(raw);

      return isNaN(parsed.getTime())
        ? 0
        : parsed.getTime();
    }

    for (let i = 1; i < data.length; i++) {

      const row = data[i].slice();
      const gameId = normalizeBetGameId_(row[col.gameId]);
      const username = normalizeBetKey_(row[col.username]);
      const categoryId = normalizeBetKey_(row[col.categoryId]);

      if (!gameId || !username || !categoryId) {
        output.push(row);
        continue;
      }

      const key = [gameId, username, categoryId].join("|");
      const existingOutputIndex = outputIndexByKey[key];

      if (existingOutputIndex === undefined) {
        outputIndexByKey[key] = output.length;
        output.push(row);
        continue;
      }

      const current = output[existingOutputIndex];
      const originalTimestamp =
        current[col.timestamp] ||
        row[col.timestamp] ||
        new Date();

      if (rowTimestamp_(row) >= rowTimestamp_(current)) {
        row[col.timestamp] = originalTimestamp;
        output[existingOutputIndex] = row;
      }

      duplicateGroupKeys[key] = true;
      rowsRemoved++;

    }

    if (!rowsRemoved) {
      return {
        success: true,
        groupsConsolidated: 0,
        rowsRemoved: 0,
        remainingBets: output.length - 1
      };
    }

    sh
      .getRange(
        1,
        1,
        output.length,
        headers.length
      )
      .setValues(output);

    const trailingRows = data.length - output.length;

    if (trailingRows > 0) {
      sh.deleteRows(output.length + 1, trailingRows);
    }

    SpreadsheetApp.flush();

    if (typeof clearGameDataCaches === "function") {
      clearGameDataCaches("", [typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets"]);
    } else if (typeof clearAppCaches === "function") {
      clearAppCaches();
    }

    return {
      success: true,
      groupsConsolidated: Object.keys(duplicateGroupKeys).length,
      rowsRemoved: rowsRemoved,
      remainingBets: output.length - 1,
      message: "Duplicate wagers were consolidated. The latest selection and amount were retained."
    };

  } catch (err) {

    return {
      success: false,
      message:
        err && err.message
          ? err.message
          : String(err)
    };

  } finally {
    lock.releaseLock();
  }

}

function removeBet(payload){

  const lock =
    ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
  let lockAcquired = false;

  const gotLock =
    lock.tryLock(5000);

  lockAcquired = gotLock;

  if (!gotLock) {
    return {
      success: false,
      message: "Could not remove wager: another save is still running. Please try again."
    };
  }

  try {

    payload =
      payload || {};

    const username =
      normalizeBetString_(
        payload.username
      );

    const gameId =
      normalizeBetGameId_(
        payload.gameId ||
        getDefaultGameId()
      );

    const categoryId =
      normalizeBetKey_(
        payload.categoryId
      );

    if (
      !username ||
      !gameId ||
      !categoryId
    ) {

      return {
        success: false,
        message: "Missing required fields"
      };

    }

    validateGameId(
      gameId
    );

    const config =
      getBettingGameConfig(
        gameId
      );

    if (!config.enabled) {

      return {
        success: false,
        message: "Wagering is not enabled for this game"
      };

    }

    /*
      Games setup option.
      Games sheet column:
      AllowBetRemoval = TRUE
    */
    if (
      config.allowBetRemoval !== true &&
      config.removeBetEnabled !== true
    ) {

      return {
        success: false,
        message: "Removing bets is not enabled for this game"
      };

    }

    const categories =
      getCategories(
        gameId
      );

    const category =
      categories.find(function(item) {

        return (
          normalizeBetKey_(
            item.id
          ) === categoryId
        );

      });

    if (!category) {

      return {
        success: false,
        message: "Category not found"
      };

    }

    const settings =
      getCategorySettings(
        gameId
      );

    const categoryConfig =
      settings[categoryId] || {};

    const winnerNomineeId =
      normalizeBetKey_(
        categoryConfig.winnerNomineeId ||
        categoryConfig.WinnerNomineeId ||
        category.winnerNomineeId ||
        category.WinnerNomineeId ||
        ""
      );

    const wagerResultType =
      normalizeBetKey_(
        categoryConfig.wagerResultType ||
        categoryConfig.WagerResultType ||
        category.wagerResultType ||
        category.WagerResultType ||
        ""
      );

    if (
      winnerNomineeId ||
      wagerResultType
    ) {

      return {
        success: false,
        message: "This wager has already been resolved"
      };

    }

    if (
      isBettingCategoryLocked_(
        category,
        categoryConfig
      )
    ) {

      return {
        success: false,
        message: "Category is locked"
      };

    }

    const sh =
      getBetsSheet_();

    const data =
      sh.getDataRange()
        .getValues();

    if (data.length <= 1) {

      return {
        success: true,
        removed: false,
        removedCount: 0,
        message: "No bet found",
        summary:
          getUserBettingSummary(
            username,
            gameId
          )
      };

    }

    const headers =
      data[0].map(function(header) {
        return String(header || "").trim();
      });

    const col =
      getBetsColumnMap_(
        headers
      );

    validateBetsColumns_(
      col
    );

    const usernameSearch =
      normalizeBetKey_(
        username
      );

    let removedCount =
      0;

    /*
      Delete from bottom to top.
      This safely removes duplicates too.
    */
    for (let i = data.length - 1; i >= 1; i--) {

      const row =
        data[i];

      const rowGameId =
        normalizeBetGameId_(
          row[col.gameId]
        );

      const rowUsername =
        normalizeBetKey_(
          row[col.username]
        );

      const rowCategoryId =
        normalizeBetKey_(
          row[col.categoryId]
        );

      if (
        rowGameId === gameId &&
        rowUsername === usernameSearch &&
        rowCategoryId === categoryId
      ) {

        sh.deleteRow(
          i + 1
        );

        removedCount++;

      }

    }

    SpreadsheetApp.flush();

    if (lockAcquired) {
      lock.releaseLock();
      lockAcquired = false;
    }

    if (typeof clearPlayerActionCaches === "function") {
      clearPlayerActionCaches(
        gameId,
        [typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets"],
        username
      );
    } else if (typeof clearGameCaches === "function") {
      clearGameCaches(gameId);
    }

    return {
      success: true,
      removed: removedCount > 0,
      removedCount: removedCount,
      gameId: gameId,
      username: username,
      categoryId: categoryId,
      summary:
        getUserBettingSummary(
          username,
          gameId
        )
    };

  } catch (err) {

    Logger.log(
      "🚨 removeBet ERROR | " +
      (
        err && err.message
          ? err.message
          : String(err)
      )
    );

    return {
      success: false,
      message:
        err && err.message
          ? err.message
          : String(err)
    };

  } finally {

    if (lockAcquired && lock) lock.releaseLock();

  }

}

/* =====================================================
   LEADERBOARD
===================================================== */

function getBettingLeaderboardData(gameId, options){

  options = options || {};

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  validateGameId(gameId);

  const byUser = getLatestBetsByUser_(gameId);
  const settings = getCategorySettings(gameId);
  const config = getBettingGameConfig(gameId);

  const rows = Object
    .keys(byUser)
    .map(userKey => {

      const user = byUser[userKey];
      const bets = Object.values(user.bets);

      let totalStaked = 0;
      let pendingStake = 0;
      let pendingPotentialReturn = 0;
      let payout = 0;
      let wonBets = 0;
      let lostBets = 0;
      let pendingBets = 0;
      let refundedBets = 0;

      bets.forEach(bet => {

        const resolution = getBetResolution_(
          bet,
          settings
        );

        totalStaked += bet.betAmount;

        if (resolution.status === "pending") {
          pendingStake += bet.betAmount;
          pendingPotentialReturn += bet.potentialReturn;
          pendingBets++;
        }

        if (resolution.status === "won") {
          payout += resolution.payout;
          wonBets++;
        }

        if (
          resolution.status === "half-refund" ||
          resolution.status === "refund"
        ) {
          payout += resolution.payout;
          refundedBets++;
        }

        if (resolution.status === "lost") {
          lostBets++;
        }

      });

      const bankroll = roundBetMoney_(
        config.startingBankroll -
        totalStaked +
        payout
      );

      const maxBankroll = roundBetMoney_(
        bankroll + pendingPotentialReturn
      );

      const profile =
        typeof getLeaderboardUserProfile_ === "function"
          ? (getLeaderboardUserProfile_(user.username, gameId) || {})
          : {};

      return {
        user: user.username,
        username: user.username,
        displayName: profile.displayName || user.username,
        avatar: profile.avatar || "👤",
        themeColor: profile.themeColor || profile.profileColor || "#354785",
        profileColor: profile.profileColor || profile.themeColor || "#354785",
        profileColorMode: profile.profileColorMode || "solid",
        profileColor2: profile.profileColor2 || "#354785",
        profileGradientAngle: profile.profileGradientAngle || "135",
        bankroll: bankroll,
        maxBankroll: maxBankroll,
        startingBankroll: config.startingBankroll,
        totalStaked: roundBetMoney_(totalStaked),
        pendingStake: roundBetMoney_(pendingStake),
        activeWagered: roundBetMoney_(pendingStake),
        pendingPotentialReturn: roundBetMoney_(pendingPotentialReturn),
        payout: roundBetMoney_(payout),
        wonBets: wonBets,
        lostBets: lostBets,
        refundedBets: refundedBets,
        pendingBets: pendingBets,
        totalBets: bets.length,
        eliminated: false
      };

    });

  rows.sort((a,b) => {

    if (b.bankroll !== a.bankroll) {
      return b.bankroll - a.bankroll;
    }

    if (b.maxBankroll !== a.maxBankroll) {
      return b.maxBankroll - a.maxBankroll;
    }

    return b.wonBets - a.wonBets;

  });

  if (rows.length) {

    const leaderBankroll = rows[0].bankroll;

    rows.forEach(row => {
      row.eliminated = row.maxBankroll < leaderBankroll;
    });

  }

  let finalRows = rows;

  if (
    options.skipParentRollup !== true &&
    typeof rollupParentBettingLeaderboard_ === "function"
  ) {
    finalRows = rollupParentBettingLeaderboard_(
      gameId,
      rows,
      options
    );
  }

  if (
    typeof decorateLeaderboardRowsWithProfiles_ === "function"
  ) {

    return decorateLeaderboardRowsWithProfiles_(
      finalRows,
      gameId
    );

  }

  return finalRows;

}
