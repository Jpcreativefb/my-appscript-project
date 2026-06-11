/* =====================================================
   BETTING ENGINE
   Multigame production add-on

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

   Optional Games headers:
   BettingEnabled
   StartingBankroll
   MinBet
   MaxBet
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
const DEFAULT_BETTING_MIN_BET = 10;
const DEFAULT_BETTING_MAX_BET = 250;
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

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true"
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

  return {
    success: true,
    message: "Betting sheets are ready"
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

  return getBetsSheet_()
    .getDataRange()
    .getValues();

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
    normalizeBetKey_(game.type) === "betting" ||
    game.bettingEnabled === true;

  let startingBankroll = DEFAULT_BETTING_BANKROLL;
  let minBet = DEFAULT_BETTING_MIN_BET;
  let maxBet = DEFAULT_BETTING_MAX_BET;

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
        bettingEnabled: headers.indexOf("BettingEnabled"),
        startingBankroll: headers.indexOf("StartingBankroll"),
        minBet: headers.indexOf("MinBet"),
        maxBet: headers.indexOf("MaxBet")
      };

      for (let i = 1; i < data.length; i++) {

        const row = data[i];

        if (
          normalizeBetGameId_(row[col.gameId]) !== gameId
        ) {
          continue;
        }

        if (col.type > -1) {
          enabled =
            enabled ||
            normalizeBetKey_(row[col.type]) === "betting";
        }

        if (col.bettingEnabled > -1) {
          enabled =
            enabled ||
            isBetBoolean_(row[col.bettingEnabled]);
        }

        if (col.startingBankroll > -1) {
          startingBankroll = Math.max(
            toBetNumber_(
              row[col.startingBankroll],
              DEFAULT_BETTING_BANKROLL
            ),
            0
          );
        }

        if (col.minBet > -1) {
          minBet = Math.max(
            toBetNumber_(
              row[col.minBet],
              DEFAULT_BETTING_MIN_BET
            ),
            0
          );
        }

        if (col.maxBet > -1) {
          maxBet = Math.max(
            toBetNumber_(
              row[col.maxBet],
              DEFAULT_BETTING_MAX_BET
            ),
            minBet
          );
        }

        break;

      }

    }

  }

  return {
    gameId: gameId,
    enabled: enabled,
    startingBankroll: startingBankroll,
    minBet: minBet,
    maxBet: maxBet,
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

  const sh = SpreadsheetApp
    .getActive()
    .getSheetByName(CATEGORIES_SHEET);

  if (!sh) {
    return map;
  }

  const data = sh
    .getDataRange()
    .getValues();

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

    const odds =
      oddsCol > -1
        ? Math.max(
            toBetNumber_(
              row[oddsCol],
              DEFAULT_BETTING_ODDS
            ),
            1
          )
        : DEFAULT_BETTING_ODDS;

    if (!map[categoryId]) {
      map[categoryId] = {};
    }

    map[categoryId][nomineeId] = odds;

  }

  return map;

}

function getBettingOddsFor_(gameId, categoryId, nomineeId){

  const oddsMap = getBettingOddsMap_(gameId);

  categoryId = normalizeBetKey_(categoryId);
  nomineeId = normalizeBetKey_(nomineeId);

  if (
    oddsMap[categoryId] &&
    oddsMap[categoryId][nomineeId]
  ) {
    return oddsMap[categoryId][nomineeId];
  }

  return DEFAULT_BETTING_ODDS;

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

function getBettingOptions(gameId){

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  validateGameId(gameId);

  const config = getBettingGameConfig(gameId);
  const categories = getCategories(gameId);
  const settings = getCategorySettings(gameId);
  const oddsMap = getBettingOddsMap_(gameId);

  const bettingCategories = categories
    .map(category => {

      const categoryId = normalizeBetKey_(
        category.id
      );

      const setting = settings[categoryId] || {};

      const nominees = (category.nominees || [])
        .map(nominee => {

          const nomineeId = normalizeBetKey_(
            nominee.id
          );

          const odds =
            oddsMap[categoryId] &&
            oddsMap[categoryId][nomineeId]
              ? oddsMap[categoryId][nomineeId]
              : DEFAULT_BETTING_ODDS;

          return {
            id: nomineeId,
            name: nominee.name || nominee.shortAnswer || nomineeId,
            shortAnswer: nominee.shortAnswer || nominee.name || nomineeId,
            image: nominee.image || nominee.img || "",
            odds: odds,
            potentialReturnPerUnit: odds
          };

        });

      return {
        id: categoryId,
        name: category.name,
        shortName: category.shortName || setting.shortName || category.name,
        section: category.section || "Other",
        image: category.image || "",
        displayOrder: Number(category.displayOrder) || 999,
        locked: isBettingCategoryLocked_(category, setting),
        winnerNomineeId: normalizeBetKey_(
          setting.winnerNomineeId ||
          category.winnerNomineeId ||
          ""
        ),
        nominees: nominees
      };

    })
    .filter(category => category.nominees.length > 0)
    .sort((a,b) => a.displayOrder - b.displayOrder);

  return {
    success: true,
    gameId: gameId,
    config: config,
    categories: bettingCategories
  };

}

/* =====================================================
   BET LOOKUPS
===================================================== */

function getLatestBetsByUser_(gameId){

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

function getUserBets(username, gameId){

  username = normalizeBetKey_(username);

  if (!username) {
    return [];
  }

  gameId = normalizeBetGameId_(
    gameId || getDefaultGameId()
  );

  const byUser = getLatestBetsByUser_(gameId);
  const user = byUser[username];

  if (!user) {
    return [];
  }

  return Object
    .values(user.bets)
    .sort((a,b) =>
      a.categoryId.localeCompare(b.categoryId)
    );

}

function getBetResolution_(bet, settings){

  const config = settings[bet.categoryId] || {};

  const winnerNomineeId = normalizeBetKey_(
    config.winnerNomineeId || ""
  );

  if (!winnerNomineeId) {

    return {
      status: "pending",
      payout: 0,
      won: false,
      lost: false
    };

  }

  const won =
    normalizeBetKey_(bet.nomineeId) ===
    winnerNomineeId;

  return {
    status: won ? "won" : "lost",
    payout: won
      ? roundBetMoney_(
          bet.betAmount * bet.odds
        )
      : 0,
    won: won,
    lost: !won
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
    totalStaked: totalStaked,
    pendingStake: pendingStake,
    pendingPotentialReturn: pendingPotentialReturn,
    payout: payout,
    bankroll: bankroll,
    available: bankroll,
    maxBankroll: maxBankroll,
    wonBets: wonBets,
    lostBets: lostBets,
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
   SAVE BET
===================================================== */

function findExistingBetRow_(data, col, gameId, username, categoryId){

  let existingRow = -1;
  let latestTimestamp = null;

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

    const ts = new Date(
      row[col.lastUpdated] ||
      row[col.timestamp] ||
      new Date()
    );

    if (
      existingRow === -1 ||
      latestTimestamp < ts
    ) {
      existingRow = i + 1;
      latestTimestamp = ts;
    }

  }

  return existingRow;

}

function saveBet(payload){

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

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
        message: "Betting is not enabled for this game"
      };

    }

    if (
      betAmount < config.minBet ||
      betAmount > config.maxBet
    ) {

      return {
        success: false,
        message:
          "Bet must be between " +
          config.minBet +
          " and " +
          config.maxBet
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

    const currentBets = getUserBets(
      username,
      gameId
    );

    const stakedExcludingCategory = currentBets
      .filter(b => b.categoryId !== categoryId)
      .reduce((sum, b) =>
        sum + Number(b.betAmount || 0),
        0
      );

    if (
      stakedExcludingCategory + betAmount >
      config.startingBankroll
    ) {

      return {
        success: false,
        message: "Bet exceeds available bankroll",
        available: roundBetMoney_(
          config.startingBankroll -
          stakedExcludingCategory
        )
      };

    }

    const odds = getBettingOddsFor_(
      gameId,
      categoryId,
      nomineeId
    );

    const data = getAllBetsData_();

    const headers = data[0]
      .map(h => String(h || "").trim());

    const col = getBetsColumnMap_(headers);
    validateBetsColumns_(col);

    const now = new Date();

    const existingRow = findExistingBetRow_(
      data,
      col,
      gameId,
      username,
      categoryId
    );

    if (existingRow > -1) {

      updateBetCell_(
        existingRow,
        col.nomineeId + 1,
        nomineeId
      );

      updateBetCell_(
        existingRow,
        col.betAmount + 1,
        betAmount
      );

      updateBetCell_(
        existingRow,
        col.odds + 1,
        odds
      );

      updateBetCell_(
        existingRow,
        col.lastUpdated + 1,
        now
      );

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

    if (typeof clearAppCaches === "function") {
      clearAppCaches();
    }

    return {
      success: true,
      gameId: gameId,
      categoryId: categoryId,
      nomineeId: nomineeId,
      betAmount: betAmount,
      odds: odds,
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

    lock.releaseLock();

  }

}

/* =====================================================
   LEADERBOARD
===================================================== */

function getBettingLeaderboardData(gameId){

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

      return {
        user: user.username,
        bankroll: bankroll,
        maxBankroll: maxBankroll,
        startingBankroll: config.startingBankroll,
        totalStaked: roundBetMoney_(totalStaked),
        pendingStake: roundBetMoney_(pendingStake),
        pendingPotentialReturn: roundBetMoney_(pendingPotentialReturn),
        payout: roundBetMoney_(payout),
        wonBets: wonBets,
        lostBets: lostBets,
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

  return rows;

}
