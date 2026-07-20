/* =========================
   WAGER PAGE
   Keeps Betting* function names for route/API compatibility.
========================= */

let BETTING_AUTO_REFRESH_TIMER = null;
let BETTING_LIVE_SPORTS_TIMER = null;
let BETTING_LIVE_SPORTS_IN_FLIGHT = false;

const BETTING_BATCH_SIZE = 12;

/*
  Use the same Sports Scores Engine web app that the Sports page uses.
  This keeps the individual wager game display live without waiting for
  Categories / CategorySettings sheet snapshots to be rewritten.
*/
const BETTING_LIVE_SPORTS_API_URL =
  "https://script.google.com/macros/s/AKfycbwVlgZa1FBvt99dpwr4PbrdBOs9IRcZ6BFlr-t6scTRNcVgQsJKpCWk1d8nxC681Sy0/exec";

const BETTING_LIVE_SPORTS_REFRESH_MS = 30000;

const BETTING_PAGE_BATCH_STATE = {
  gameId: "",
  username: "",
  config: {},
  summary: {},
  categories: [],
  nextOffset: 0,
  hasMore: false,
  loading: false
};

const BETTING_STATE = {
  optimisticBets: {},
  savingCategories: {},
  saveTokens: {},
  saveQueue: Promise.resolve(),
  saveTimers: {},
  latestSaveDrafts: {}
};

function getBettingSession_(){

  if (typeof getSession === "function") {
    return getSession() || {};
  }

  try {
    return JSON.parse(
      localStorage.getItem("session") || "{}"
    );
  } catch (err) {
    return {};
  }

}

function getBettingGameId_(){

  if (typeof getFrontendGameId === "function") {
    return getFrontendGameId();
  }

  const session = getBettingSession_();

  return (
    session.gameId ||
    window.FRONTEND_GAME_ID ||
    "oscars-2026"
  );

}


function bettingLiveSportsJsonp_(url) {

  return new Promise(function(resolve, reject) {

    const callbackName =
      "__bettingLiveSportsCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 1000000);

    const script =
      document.createElement("script");

    const separator =
      url.indexOf("?") === -1
        ? "?"
        : "&";

    let done = false;

    function cleanup_() {
      try {
        delete window[callbackName];
      } catch (err) {
        window[callbackName] = undefined;
      }

      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = function(data) {
      if (done) {
        return;
      }

      done = true;
      cleanup_();
      resolve(data || {});
    };

    script.onerror = function() {
      if (done) {
        return;
      }

      done = true;
      cleanup_();
      reject(
        new Error("Sports Scores Engine request failed")
      );
    };

    script.src =
      url +
      separator +
      "callback=" +
      encodeURIComponent(callbackName) +
      "&_ts=" +
      Date.now();

    document.body.appendChild(script);

    setTimeout(function() {
      if (done) {
        return;
      }

      done = true;
      cleanup_();
      reject(
        new Error("Sports Scores Engine request timed out")
      );
    }, 15000);

  });

}

function buildBettingLiveSportsApiUrl_(action, params) {

  const query =
    new URLSearchParams({
      action: action
    });

  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];

    if (
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      query.set(key, value);
    }
  });

  return BETTING_LIVE_SPORTS_API_URL + "?" + query.toString();

}

function getBettingIsoDateOnly_(value) {

  if (!value) {
    return "";
  }

  const d =
    new Date(value);

  if (isNaN(d.getTime())) {
    return "";
  }

  return d.toISOString().slice(0, 10);

}

function addBettingDaysToIsoDate_(isoDate, days) {

  if (!isoDate) {
    return "";
  }

  const d =
    new Date(isoDate + "T12:00:00Z");

  if (isNaN(d.getTime())) {
    return "";
  }

  d.setUTCDate(
    d.getUTCDate() + Number(days || 0)
  );

  return d.toISOString().slice(0, 10);

}

function normalizeBettingLiveKey_(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function getBettingLiveCategoryDate_(category) {

  return getBettingIsoDateOnly_(
    category.lockDateTime ||
    category.gameDateTime ||
    category.GameDateTime ||
    ""
  );

}

function getBettingLiveScoreKey_(score) {

  const gameId =
    String(score.GameId || score.gameId || "")
      .trim();

  const espnEventId =
    String(score.ESPNEventId || score.espnEventId || "")
      .trim();

  return {
    gameId: gameId,
    espnEventId: espnEventId
  };

}

function isBettingLiveSportsCategory_(category) {

  if (!category) {
    return false;
  }

  return !!(
    category.sportsGameId ||
    category.espnEventId ||
    category.homeTeam ||
    category.awayTeam ||
    String(category.id || "").indexOf("sports-") === 0
  );

}

function getBettingLiveSideForNominee_(category, nominee) {

  const nomineeName =
    normalizeBettingLiveKey_(
      nominee.name ||
      nominee.shortAnswer ||
      nominee.id ||
      ""
    );

  const nomineeId =
    normalizeBettingLiveKey_(
      nominee.id || ""
    );

  const homeTeam =
    normalizeBettingLiveKey_(category.homeTeam || "");

  const awayTeam =
    normalizeBettingLiveKey_(category.awayTeam || "");

  if (
    homeTeam &&
    (
      nomineeName === homeTeam ||
      nomineeId === homeTeam ||
      nomineeId.indexOf("home") !== -1
    )
  ) {
    return "home";
  }

  if (
    awayTeam &&
    (
      nomineeName === awayTeam ||
      nomineeId === awayTeam ||
      nomineeId.indexOf("away") !== -1
    )
  ) {
    return "away";
  }

  if (
    nomineeId === "draw" ||
    nomineeName === "draw" ||
    nomineeName === "tie"
  ) {
    return "draw";
  }

  return "";

}

function shouldBettingLiveRerenderNow_() {

  const active =
    document.activeElement;

  if (!active) {
    return true;
  }

  if (
    active.classList &&
    active.classList.contains("betting-amount-input")
  ) {
    return false;
  }

  if (
    typeof active.closest === "function" &&
    active.closest(".betting-nominee-card")
  ) {
    return false;
  }

  return true;

}

async function fetchBettingLiveScoresForCategories_(categories) {

  const sportsCategories =
    (categories || [])
      .filter(isBettingLiveSportsCategory_);

  if (!sportsCategories.length) {
    return [];
  }

  const groups = {};
  const fallbackEventIds = {};

  sportsCategories.forEach(function(category) {

    const league =
      String(category.league || category.sportsLeague || "")
        .trim();

    const date =
      getBettingLiveCategoryDate_(category);

    if (
      league &&
      date
    ) {
      if (!groups[league]) {
        groups[league] = {
          league: league,
          minDate: date,
          maxDate: date
        };
      }

      if (date < groups[league].minDate) {
        groups[league].minDate = date;
      }

      if (date > groups[league].maxDate) {
        groups[league].maxDate = date;
      }

      return;
    }

    const espnEventId =
      String(category.espnEventId || "")
        .trim();

    if (espnEventId) {
      fallbackEventIds[espnEventId] = true;
    }

  });

  const requests = [];

  Object.keys(groups).forEach(function(league) {
    const group = groups[league];

    requests.push(
      bettingLiveSportsJsonp_(
        buildBettingLiveSportsApiUrl_(
          "getSportsScores",
          {
            league: group.league,
            dateFrom: addBettingDaysToIsoDate_(group.minDate, -1),
            dateTo: addBettingDaysToIsoDate_(group.maxDate, 1)
          }
        )
      )
    );
  });

  Object.keys(fallbackEventIds)
    .slice(0, 40)
    .forEach(function(espnEventId) {
      requests.push(
        bettingLiveSportsJsonp_(
          buildBettingLiveSportsApiUrl_(
            "getSportsScores",
            {
              espnEventId: espnEventId
            }
          )
        )
      );
    });

  const responses =
    await Promise.allSettled(requests);

  const scores = [];
  const seen = {};

  responses.forEach(function(result) {
    if (
      result.status !== "fulfilled" ||
      !result.value ||
      result.value.success === false
    ) {
      return;
    }

    (result.value.scores || []).forEach(function(score) {
      const keyObj =
        getBettingLiveScoreKey_(score);

      const key =
        keyObj.espnEventId ||
        keyObj.gameId;

      if (!key || seen[key]) {
        return;
      }

      seen[key] = true;
      scores.push(score);
    });
  });

  return scores;

}

async function fetchBettingLiveOddsForCategories_(categories) {

  const oddsCategories =
    (categories || [])
      .filter(function(category) {
        return (
          isBettingLiveSportsCategory_(category) &&
          !category.finished &&
          category.homeTeam &&
          category.awayTeam
        );
      })
      .slice(0, 30);

  if (!oddsCategories.length) {
    return {};
  }

  const responses =
    await Promise.allSettled(
      oddsCategories.map(function(category) {
        return bettingLiveSportsJsonp_(
          buildBettingLiveSportsApiUrl_(
            "getSportsOdds",
            {
              gameId: category.sportsGameId || "",
              espnEventId: category.espnEventId || "",
              league: category.league || category.sportsLeague || "",
              homeTeam: category.homeTeam || "",
              awayTeam: category.awayTeam || "",
              gameDateTime: category.lockDateTime || "",
              market: category.sportsMarket || "moneyline"
            }
          )
        );
      })
    );

  const oddsByCategoryId = {};

  responses.forEach(function(result, index) {
    const category =
      oddsCategories[index];

    if (
      !category ||
      result.status !== "fulfilled" ||
      !result.value ||
      result.value.success === false ||
      result.value.found === false
    ) {
      return;
    }

    oddsByCategoryId[String(category.id || "")] = result.value;
  });

  return oddsByCategoryId;

}

function applyBettingLiveScores_(categories, scores) {

  const byGameId = {};
  const byEspnEventId = {};

  (scores || []).forEach(function(score) {
    const keyObj =
      getBettingLiveScoreKey_(score);

    if (keyObj.gameId) {
      byGameId[keyObj.gameId] = score;
    }

    if (keyObj.espnEventId) {
      byEspnEventId[keyObj.espnEventId] = score;
    }
  });

  let changed = false;

  (categories || []).forEach(function(category) {
    if (!isBettingLiveSportsCategory_(category)) {
      return;
    }

    const score =
      byEspnEventId[String(category.espnEventId || "").trim()] ||
      byGameId[String(category.sportsGameId || "").trim()];

    if (!score) {
      return;
    }

    const before =
      JSON.stringify({
        homeScore: category.homeScore,
        awayScore: category.awayScore,
        sportsStatus: category.sportsStatus,
        sportsState: category.sportsState,
        sportsClock: category.sportsClock,
        sportsPeriod: category.sportsPeriod,
        homeRecord: category.homeRecord,
        awayRecord: category.awayRecord
      });

    category.homeTeam =
      score.HomeTeam || category.homeTeam || "";

    category.awayTeam =
      score.AwayTeam || category.awayTeam || "";

    category.homeScore =
      score.HomeScore !== undefined && score.HomeScore !== null
        ? score.HomeScore
        : category.homeScore;

    category.awayScore =
      score.AwayScore !== undefined && score.AwayScore !== null
        ? score.AwayScore
        : category.awayScore;

    category.sportsStatus =
      score.Status || category.sportsStatus || "";

    category.sportsState =
      score.State || category.sportsState || "";

    category.sportsClock =
      score.Clock || category.sportsClock || "";

    category.sportsPeriod =
      score.Period !== undefined && score.Period !== null
        ? score.Period
        : category.sportsPeriod;

    category.homeRecord =
      cleanBettingSportsRecord_(
        score.HomeRecord || category.homeRecord || ""
      );

    category.awayRecord =
      cleanBettingSportsRecord_(
        score.AwayRecord || category.awayRecord || ""
      );

    category.gameDateTime =
      score.GameDateTime || category.gameDateTime || "";

    const homeLogo =
      score.HomeLogo || "";

    const awayLogo =
      score.AwayLogo || "";

    (category.nominees || []).forEach(function(nominee) {
      const side =
        getBettingLiveSideForNominee_(category, nominee);

      if (
        side === "home" &&
        homeLogo
      ) {
        nominee.image = homeLogo;
      }

      if (
        side === "away" &&
        awayLogo
      ) {
        nominee.image = awayLogo;
      }
    });

    const after =
      JSON.stringify({
        homeScore: category.homeScore,
        awayScore: category.awayScore,
        sportsStatus: category.sportsStatus,
        sportsState: category.sportsState,
        sportsClock: category.sportsClock,
        sportsPeriod: category.sportsPeriod,
        homeRecord: category.homeRecord,
        awayRecord: category.awayRecord
      });

    if (before !== after) {
      changed = true;
    }

  });

  return changed;

}

function applyBettingLiveOdds_(categories, oddsByCategoryId) {

  let changed = false;

  (categories || []).forEach(function(category) {
    const odds =
      oddsByCategoryId[String(category.id || "")];

    if (!odds) {
      return;
    }

    let categoryHasOdds = false;

    (category.nominees || []).forEach(function(nominee) {
      const side =
        getBettingLiveSideForNominee_(category, nominee);

      let nextOdds = "";

      if (side === "home") {
        nextOdds = odds.homeOdds;
      }

      if (side === "away") {
        nextOdds = odds.awayOdds;
      }

      if (side === "draw") {
        nextOdds = odds.drawOdds;
      }

      if (
        nextOdds !== "" &&
        nextOdds !== null &&
        nextOdds !== undefined &&
        Number(nextOdds) > 0
      ) {
        if (String(nominee.odds || "") !== String(nextOdds)) {
          nominee.odds = nextOdds;
          nominee.oddsAvailable = true;
          nominee.potentialReturnPerUnit = nextOdds;
          changed = true;
        }

        categoryHasOdds = true;
      }
    });

    if (categoryHasOdds) {
      category.oddsReady = true;
      category.oddsPending = false;
      category.oddsSource =
        odds.bookmaker ||
        odds.source ||
        category.oddsSource ||
        "sports-engine";
      category.oddsLastUpdated =
        odds.lastUpdated ||
        category.oddsLastUpdated ||
        "";
      changed = true;
    }
  });

  return changed;

}

async function refreshBettingLiveSportsData_() {

  if (
    BETTING_LIVE_SPORTS_IN_FLIGHT ||
    !BETTING_LIVE_SPORTS_API_URL ||
    BETTING_LIVE_SPORTS_API_URL.indexOf("PASTE_YOUR") !== -1 ||
    !document.querySelector(".betting-page")
  ) {
    return;
  }

  const categories =
    BETTING_PAGE_BATCH_STATE.categories || [];

  if (!categories.length) {
    return;
  }

  BETTING_LIVE_SPORTS_IN_FLIGHT = true;

  try {
    const scores =
      await fetchBettingLiveScoresForCategories_(
        categories
      );

    const oddsByCategoryId =
      await fetchBettingLiveOddsForCategories_(
        categories
      );

    const scoresChanged =
      applyBettingLiveScores_(
        categories,
        scores
      );

    const oddsChanged =
      applyBettingLiveOdds_(
        categories,
        oddsByCategoryId
      );

    if (
      (scoresChanged || oddsChanged) &&
      shouldBettingLiveRerenderNow_()
    ) {
      updateBettingCategoryListFromBatchState_();
    }

  } catch (err) {
    console.warn(
      "Could not refresh live sports data on wager page.",
      err
    );
  } finally {
    BETTING_LIVE_SPORTS_IN_FLIGHT = false;
  }

}

function startBettingLiveSportsRefresh_() {

  if (BETTING_LIVE_SPORTS_TIMER) {
    clearInterval(
      BETTING_LIVE_SPORTS_TIMER
    );
  }

  refreshBettingLiveSportsData_();

  BETTING_LIVE_SPORTS_TIMER =
    setInterval(function() {

      const app =
        document.getElementById("app");

      if (
        !app ||
        !app.querySelector(".betting-page")
      ) {
        clearInterval(
          BETTING_LIVE_SPORTS_TIMER
        );

        BETTING_LIVE_SPORTS_TIMER = null;
        return;
      }

      refreshBettingLiveSportsData_();

    }, BETTING_LIVE_SPORTS_REFRESH_MS);

}

function escapeBettingHtml_(value){

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function normalizeBettingNoticeMessage_(message){

  if (!message) {
    return "";
  }

  if (
    typeof Promise !== "undefined" &&
    message instanceof Promise
  ) {
    return "Loading picks...";
  }

  if (
    typeof message === "object"
  ) {

    if (message.message) {
      return String(message.message);
    }

    if (message.error) {
      return String(message.error);
    }

    return "Loading picks...";

  }

  return String(message);

}

function renderBettingNotice_(message, type){

  const cleanMessage =
    normalizeBettingNoticeMessage_(
      message
    );

  if (!cleanMessage) {
    return "";
  }

  const cleanType =
    String(type || "")
      .trim()
      .toLowerCase();

  const className =
    cleanType
      ? "betting-notice " + cleanType
      : "betting-notice";

  return `
    <div class="${className}">
      ${escapeBettingHtml_(cleanMessage)}
    </div>
  `;

}

function money_(value){

  const n = Number(value || 0);

  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2
  });

}

function odds_(value){

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Odds pending";
  }

  const n = Number(value || 0);

  if (
    isNaN(n) ||
    !isFinite(n) ||
    n <= 0
  ) {
    return "Odds pending";
  }

  return n.toFixed(2).replace(/\.00$/, "") + "x";

}

function safeBettingDomId_(value){

  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

}

function getBetAmountInputId_(categoryId){

  return "betAmount-" +
    safeBettingDomId_(categoryId);

}

function buildBetMap_(summary){

  const map = {};

  ((summary && summary.bets) || [])
    .forEach(bet => {
      map[bet.categoryId] = bet;
    });

  return map;

}

function mergeBettingOptimisticBets_(betMap){

  Object.keys(BETTING_STATE.optimisticBets || {})
    .forEach(function(categoryId){
      betMap[categoryId] = Object.assign(
        {},
        betMap[categoryId] || {},
        BETTING_STATE.optimisticBets[categoryId]
      );
    });

  return betMap;

}

function escapeBettingSelectorValue_(value){

  if (
    window.CSS &&
    typeof window.CSS.escape === "function"
  ) {
    return window.CSS.escape(
      String(value || "")
    );
  }

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

}

function optimisticSelectBettingNominee_(categoryId, nomineeId, betAmount){

  const categoryKey = String(categoryId || "");
  const nomineeKey = String(nomineeId || "");

  document
    .querySelectorAll(
      `[data-betting-category="${escapeBettingSelectorValue_(categoryKey)}"]`
    )
    .forEach(function(button){

      const buttonNominee =
        button.getAttribute("data-betting-nominee") || "";

      button.classList.toggle(
        "selected",
        buttonNominee === nomineeKey
      );

      button.classList.add("saving");

    });

  const selectedButton =
    document.querySelector(
      `[data-betting-category="${escapeBettingSelectorValue_(categoryKey)}"][data-betting-nominee="${escapeBettingSelectorValue_(nomineeKey)}"]`
    );

  const nomineeNameEl =
    selectedButton
      ? selectedButton.querySelector(".betting-nominee-name")
      : null;

  const nomineeName =
    nomineeNameEl
      ? nomineeNameEl.textContent.trim()
      : nomineeKey;

  document
    .querySelectorAll(
      `[data-betting-current-category="${escapeBettingSelectorValue_(categoryKey)}"]`
    )
    .forEach(function(el){
      el.className = "betting-current muted";
      el.innerHTML =
        "Saving pick: " +
        escapeBettingHtml_(money_(betAmount)) +
        " on " +
        escapeBettingHtml_(nomineeName);
    });

  BETTING_STATE.optimisticBets[categoryKey] = {
    categoryId: categoryKey,
    nomineeId: nomineeKey,
    betAmount: Number(betAmount || 0),
    status: "pending",
    payout: 0
  };

}

function clearOptimisticBettingCategory_(categoryId){

  delete BETTING_STATE.optimisticBets[
    String(categoryId || "")
  ];

  document
    .querySelectorAll(
      `[data-betting-category="${escapeBettingSelectorValue_(String(categoryId || ""))}"]`
    )
    .forEach(function(button){
      button.classList.remove("saving");
    });

}

function clearBettingCategorySelectionDom_(categoryId){

  document
    .querySelectorAll(
      `[data-betting-category="${escapeBettingSelectorValue_(String(categoryId || ""))}"]`
    )
    .forEach(function(button){
      button.classList.remove("selected");
      button.classList.remove("saving");
    });

}

function clearBettingCategoryCurrentDom_(categoryId){

  document
    .querySelectorAll(
      `[data-betting-current-category="${escapeBettingSelectorValue_(String(categoryId || ""))}"]`
    )
    .forEach(function(el){
      el.className = "betting-current muted";
      el.innerHTML = "Tap to place bet";
    });

}


function markBettingCategorySaving_(categoryId, saving){

  BETTING_STATE.savingCategories[
    String(categoryId || "")
  ] = saving === true;

  document
    .querySelectorAll(
      `[data-betting-category="${escapeBettingSelectorValue_(String(categoryId || ""))}"]`
    )
    .forEach(function(button){
      button.classList.toggle(
        "saving",
        saving === true
      );
    });

}

function isBettingLockTimeoutError_(err){

  const message =
    err && err.message
      ? err.message
      : String(err || "");

  return (
    message.toLowerCase()
      .indexOf("lock timeout") !== -1 ||
    message.toLowerCase()
      .indexOf("holding the lock") !== -1 ||
    message.toLowerCase()
      .indexOf("could not obtain lock") !== -1 ||
    message.toLowerCase()
      .indexOf("timed out") !== -1
  );

}

function waitBetting_(ms){

  return new Promise(function(resolve){
    setTimeout(resolve, ms);
  });

}

async function runBettingWorkWithRetry_(work){

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {

    try {

      const res = await work();

      if (
        res &&
        res.success === false &&
        isBettingLockTimeoutError_(
          res.message || res.error
        ) &&
        attempt < maxAttempts
      ) {

        await waitBetting_(
          700 * attempt
        );

        continue;

      }

      return res;

    } catch (err) {

      if (
        isBettingLockTimeoutError_(err) &&
        attempt < maxAttempts
      ) {

        await waitBetting_(
          700 * attempt
        );

        continue;

      }

      throw err;

    }

  }

  return work();

}

function enqueueBettingSave_(work){

  const run = function(){
    return runBettingWorkWithRetry_(work);
  };

  const next = BETTING_STATE.saveQueue
    .catch(function(){
      return null;
    })
    .then(run);

  BETTING_STATE.saveQueue = next
    .catch(function(){
      return null;
    });

  return next;

}

function isBettingSaveInFlight_(){

  return Object.keys(
    BETTING_STATE.savingCategories || {}
  ).some(function(categoryId){
    return BETTING_STATE.savingCategories[categoryId] === true;
  });

}



function getBettingNomineeName_(category, nomineeId){

  const nominee = (category.nominees || [])
    .find(n => n.id === nomineeId);

  return nominee
    ? nominee.shortAnswer || nominee.name
    : nomineeId;

}

function getBettingCurrentDisplay_(category, bet){

  if (!bet) {
    return {
      className: "muted",
      html: ""
    };
  }

  const betAmount =
    Number(bet.betAmount || 0);

  const pickName =
    getBettingNomineeName_(
      category,
      bet.nomineeId
    );

  const status =
    String(bet.status || "")
      .trim()
      .toLowerCase();

  const winnerNomineeId =
    String(category.winnerNomineeId || "")
      .trim()
      .toLowerCase();

  const wagerResultType =
    String(category.wagerResultType || "")
      .trim()
      .toLowerCase();

  const betNomineeId =
    String(bet.nomineeId || "")
      .trim()
      .toLowerCase();

  const hasWinner =
    !!winnerNomineeId;

  const isHalfRefund =
    status === "half-refund" ||
    wagerResultType === "half-refund";

  const won =
    status === "won" ||
    (
      hasWinner &&
      winnerNomineeId === betNomineeId
    );

  const lost =
    status === "lost" ||
    (
      hasWinner &&
      winnerNomineeId !== betNomineeId
    );

  if (isHalfRefund) {

    const halfLoss =
      betAmount / 2;

    return {
      className: "bet-half-refund",
      html:
        `Draw: -${money_(halfLoss)} / ${money_(betAmount)} on ${escapeBettingHtml_(pickName)}`
    };

  }

  if (won) {

    const payout =
      Number(bet.payout || 0) > 0
        ? Number(bet.payout || 0)
        : Number(bet.potentialReturn || 0);

    return {
      className: "bet-won",
      html:
        `Payout: +${money_(payout)} / ${money_(betAmount)} on ${escapeBettingHtml_(pickName)}`
    };

  }

  if (lost) {

    return {
      className: "bet-lost",
      html:
        `Lost: -${money_(betAmount)} / ${money_(betAmount)} on ${escapeBettingHtml_(pickName)}`
    };

  }

  return {
    className: "current-wager",
    html:
      `Current: ${money_(betAmount)} on ${escapeBettingHtml_(pickName)}`
  };

}

function getBettingWinnings_(bankroll, startingBankroll){

  return Number(bankroll || 0) -
    Number(startingBankroll || 0);

}

function getBettingWinningsClass_(value){

  const n =
    Number(value || 0);

  if (n > 0) {
    return "positive";
  }

  if (n < 0) {
    return "negative";
  }

  return "neutral";

}

function getBettingUserPlace_(rows, username){

  const target =
    String(username || "")
      .trim()
      .toLowerCase();

  if (!target || !rows || !rows.length) {
    return "";
  }

  for (let i = 0; i < rows.length; i++) {

    const rowUser =
      String(rows[i].user || rows[i].username || "")
        .trim()
        .toLowerCase();

    if (rowUser === target) {
      return i + 1;
    }

  }

  return "";

}

function getBettingAverageWinnings_(rows, startingBankroll){

  if (!rows || !rows.length) {
    return 0;
  }

  const total =
    rows.reduce(function(sum, row){

      return sum + getBettingWinnings_(
        row.bankroll,
        startingBankroll
      );

    }, 0);

  return total / rows.length;

}

function renderBettingSummary_(summary, leaderboardRows, username, config){

  const startingBankroll =
    Number(
      config.startingBankroll || 0
    );

  const userPlace =
    getBettingUserPlace_(
      leaderboardRows,
      username
    );

  const userWinnings =
    getBettingWinnings_(
      summary.bankroll,
      startingBankroll
    );

  const avgWinnings =
    getBettingAverageWinnings_(
      leaderboardRows,
      startingBankroll
    );

  return `
    <div class="betting-summary-grid compact">

      <div class="betting-summary-card">
        <div class="betting-label">Place</div>
        <div class="betting-value">
          ${userPlace ? "#" + userPlace : "-"}
        </div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Bankroll</div>
        <div class="betting-value">${money_(summary.bankroll)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Winnings</div>
        <div class="betting-value betting-money-${getBettingWinningsClass_(userWinnings)}">
          ${userWinnings > 0 ? "+" : ""}${money_(userWinnings)}
        </div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Wagered</div>
        <div class="betting-value">${money_(summary.totalStaked)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Possible Max</div>
        <div class="betting-value">${money_(summary.maxBankroll)}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Pending</div>
        <div class="betting-value">${summary.pendingBets || 0}</div>
      </div>

      <div class="betting-summary-card">
        <div class="betting-label">Avg Winnings</div>
        <div class="betting-value betting-money-${getBettingWinningsClass_(avgWinnings)}">
          ${avgWinnings > 0 ? "+" : ""}${money_(avgWinnings)}
        </div>
      </div>

    </div>
  `;

}

function formatBettingGameDate_(value){

  if (!value) {
    return "";
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

}

function getBettingCountdown_(value, locked){

  if (locked) {
    return "Locked";
  }

  if (!value) {
    return "";
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return "";
  }

  const diff = d.getTime() - Date.now();

  if (diff <= 0) {
    return "Locks now";
  }

  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return `Locks in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Locks in ${hours}h ${mins}m`;
  }

  return `Locks in ${mins}m`;

}

function isBettingValidSportsRecord_(value) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return false;
  }

  const lower =
    value.toLowerCase();

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) {
    return false;
  }

  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value)) {
    return false;
  }

  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(value)) {
    return false;
  }

  if (/^\d{1,2}:\d{2}(?:\s*[ap]m)?$/i.test(value)) {
    return false;
  }

  if (
    /\b(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/i.test(lower) ||
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i.test(lower)
  ) {
    return false;
  }

  return /^\d+\s*-\s*\d+(\s*-\s*\d+)?(\s+[A-Za-z][A-Za-z ]{1,24})?$/.test(value);

}

function cleanBettingSportsRecord_(value) {

  value =
    String(value || "")
      .trim();

  return isBettingValidSportsRecord_(value)
    ? value
    : "";

}

function getBettingNomineeRecord_(category, nominee){

  const name =
    String(nominee.name || nominee.shortAnswer || "")
      .trim()
      .toLowerCase();

  const home =
    String(category.homeTeam || "")
      .trim()
      .toLowerCase();

  const away =
    String(category.awayTeam || "")
      .trim()
      .toLowerCase();

  if (name && home && name === home) {
    return cleanBettingSportsRecord_(category.homeRecord || "");
  }

  if (name && away && name === away) {
    return cleanBettingSportsRecord_(category.awayRecord || "");
  }

  return "";

}

function getBettingNomineeScore_(
  category,
  nominee
) {

  const nomineeId =
    String(nominee.id || "")
      .trim()
      .toLowerCase();

  const nomineeName =
    String(
      nominee.name ||
      nominee.shortAnswer ||
      ""
    )
      .trim()
      .toLowerCase();

  const homeTeam =
    String(category.homeTeam || "")
      .trim()
      .toLowerCase();

  const awayTeam =
    String(category.awayTeam || "")
      .trim()
      .toLowerCase();

  const isHome =
    nomineeId === "home" ||
    nomineeId.indexOf("home") !== -1 ||
    nomineeName === homeTeam ||
    nomineeName.indexOf(homeTeam) !== -1;

  const isAway =
    nomineeId === "away" ||
    nomineeId.indexOf("away") !== -1 ||
    nomineeName === awayTeam ||
    nomineeName.indexOf(awayTeam) !== -1;

  let score = "";

  if (isHome) {
    score =
      category.homeScore;
  }

  if (isAway) {
    score =
      category.awayScore;
  }

  if (
    score === null ||
    score === undefined ||
    String(score).trim() === ""
  ) {
    return "";
  }

  return String(score);

}

function formatBettingOrdinal_(value){

  const n =
    Number(value || 0);

  if (!n) {
    return "";
  }

  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? "st"
      : n % 10 === 2 && n % 100 !== 12
        ? "nd"
        : n % 10 === 3 && n % 100 !== 13
          ? "rd"
          : "th";

  return n + suffix;

}

function getBettingGameStateLabel_(category){

  const status =
    String(category.sportsStatus || "")
      .trim()
      .toLowerCase();

  const state =
    String(category.sportsState || "")
      .trim()
      .toLowerCase();

  const combined =
    status + " " + state;

  if (
    combined.includes("final") ||
    combined.includes("complete") ||
    combined.includes("completed") ||
    combined.includes("post")
  ) {
    return "Final";
  }

  if (
    combined.includes("pre") ||
    combined.includes("scheduled") ||
    combined.includes("not_started") ||
    combined.includes("not started")
  ) {
    return "Pregame";
  }

  return "";

}

function formatBettingPeriodLabel_(category){

  const period =
    category.sportsPeriod;

  if (
    period === "" ||
    period === undefined ||
    period === null
  ) {
    return "";
  }

  const league =
    String(
      category.league ||
      category.section ||
      ""
    )
      .trim()
      .toLowerCase();

  const n =
    Number(period);

  if (
    league === "nfl" ||
    league === "nba" ||
    league === "wnba" ||
    league === "ncaaf"
  ) {
    return "Q" + period;
  }

  if (
    league === "ncaamb" ||
    league === "ncaawb"
  ) {
    if (n === 1) {
      return "1st Half";
    }

    if (n === 2) {
      return "2nd Half";
    }

    return "OT";
  }

  if (league === "nhl") {
    return "P" + period;
  }

  if (league === "mlb") {
    return formatBettingOrdinal_(period) + " Inning";
  }

  if (
    league === "epl" ||
    league === "soccer"
  ) {
    return n <= 1
      ? "1st Half"
      : "2nd Half";
  }

  if (
    league === "nascar" ||
    league === "f1" ||
    league === "racing"
  ) {
    return "Lap " + period;
  }

  return "Period " + period;

}

function formatBettingClockLine_(category){

  const gameStateLabel =
    getBettingGameStateLabel_(
      category
    );

  if (gameStateLabel) {
    return gameStateLabel;
  }

  const clock =
    String(category.sportsClock || "")
      .trim();

  const league =
    String(
      category.league ||
      category.section ||
      ""
    )
      .trim()
      .toLowerCase();

  const periodLabel =
    formatBettingPeriodLabel_(
      category
    );

  if (
    !clock &&
    !periodLabel
  ) {
    return "";
  }

  /*
    MLB does not have a real game clock.
    ESPN usually sends values like:
    Top 3rd, Bottom 7th, Mid 5th, End 8th.
    Show that directly instead of "Clock:".
  */
  if (league === "mlb") {

    if (clock) {
      return clock;
    }

    return periodLabel;

  }

  /*
    Racing uses laps, not clock.
  */
  if (
    league === "nascar" ||
    league === "f1" ||
    league === "racing"
  ) {
    return periodLabel || clock;
  }

  if (
    clock &&
    periodLabel
  ) {
    return "Clock: " + clock + " · " + periodLabel;
  }

  if (clock) {
    return "Clock: " + clock;
  }

  return periodLabel;

}

function renderBettingCategory_(category, bet, config){

  const inputId =
    getBetAmountInputId_(category.id);

  const defaultAmount = bet
    ? bet.betAmount
    : (config.minWager || config.minBet);

  const datePassed =
    isBettingDatePassed_(
      category
    );

  const locked =
     category.locked === true ||
     datePassed;

  const currentDisplay =
    getBettingCurrentDisplay_(
      category,
      bet
    );

  const gameDate =
    formatBettingGameDate_(category.lockDateTime);

  const countdown =
    getBettingCountdown_(category.lockDateTime, locked);

  const league =
    category.league || category.section || "";

  const clockLine =
    formatBettingClockLine_(
      category
    );

  const winnerNomineeId =
    String(category.winnerNomineeId || "")
      .trim()
      .toLowerCase();

  const wagerResultType =
    String(category.wagerResultType || "")
      .trim()
      .toLowerCase();

  const gameStateLabel =
    typeof getBettingGameStateLabel_ === "function"
      ? getBettingGameStateLabel_(category)
      : "";

  const finalByLiveScore =
    gameStateLabel === "Final";

  const settlementPendingFinal =
    finalByLiveScore &&
    !winnerNomineeId &&
    !wagerResultType;

  const categoryFinished =
    !!winnerNomineeId ||
    !!wagerResultType ||
    finalByLiveScore;

  const oddsReady =
    category.oddsReady !== false;

  const oddsPending =
    !oddsReady &&
    !categoryFinished;

  const halfRefund =
    wagerResultType === "half-refund";

  return `
    <details class="betting-category-card ${locked ? "locked" : ""} ${bet ? "has-bet" : ""} ${categoryFinished ? "finished" : ""} ${oddsPending ? "odds-pending" : ""}">

      <summary class="betting-category-summary">

        <div class="betting-summary-main">
          <div class="betting-category-title">
            ${escapeBettingHtml_(category.shortName || category.name)}

            ${categoryFinished ? `
              <span class="betting-finished-pill">
                Finished
              </span>
            ` : locked ? `
              <span class="betting-finished-pill betting-locked-pill">
                Locked
              </span>
            ` : oddsPending ? `
              <span class="betting-finished-pill betting-odds-pending-pill">
                Odds pending
              </span>
            ` : ""}
          </div>

          <div class="betting-game-meta">
            ${league ? `
              <span>${escapeBettingHtml_(String(league).toUpperCase())}</span>
            ` : ""}

            ${gameDate ? `
              <span>${escapeBettingHtml_(gameDate)}</span>
            ` : ""}

            ${clockLine ? `
              <span class="betting-clock-pill">
                ${escapeBettingHtml_(clockLine)}
              </span>
            ` : ""}
          </div>

          ${bet ? `
            <div
              class="betting-current ${currentDisplay.className}"
              data-betting-current-category="${escapeBettingHtml_(category.id)}"
            >
               ${currentDisplay.html}
            </div>
          ` : `
            <div
              class="betting-current muted"
              data-betting-current-category="${escapeBettingHtml_(category.id)}"
            >
               ${settlementPendingFinal ? "Final / settlement pending" : categoryFinished ? "Finished" : locked ? "Game started / locked" : oddsPending ? "Waiting for odds" : "Tap to place bet"}
            </div>
          `}
          
        </div>

        <div class="betting-summary-side">

          ${bet ? `
            <div class="betting-header-bet-marker">
              $
            </div>
          ` : ""}

          ${countdown ? `
            <div class="betting-countdown ${locked ? "locked" : ""}">
              ${escapeBettingHtml_(countdown)}
            </div>
          ` : ""}

          <div class="betting-expand-icon">⌄</div>
        </div>

      </summary>

      <div class="betting-collapsible-body">

        ${categoryFinished ? `
          ${settlementPendingFinal ? `
            <div class="betting-notice warning">
              This game is final. Settlement is waiting for the next Sports Sync to write the result.
            </div>
          ` : halfRefund ? `
            <div class="betting-notice warning">
              This wager finished in a draw. Half of each wager is refunded.
            </div>
          ` : `
            <div class="betting-notice">
              This wager is finished. The winning option is highlighted below.
            </div>
          `}
        ` : `
          ${locked ? `
            <div class="betting-notice warning">
              This game has started and wagering is locked. It will move to Finished Games after settlement.
            </div>
          ` : ""}

          ${oddsPending ? `
            <div class="betting-notice warning">
              Check Back Soon!  Selections unlock when odds become available.
            </div>
          ` : ""}

          <label class="betting-amount-label" for="${inputId}">
            Bet amount
          </label>

          <input
            id="${inputId}"
            class="betting-amount-input"
            type="number"
            inputmode="numeric"
            min="${config.minWager || config.minBet}"
            max="${config.maxWager || config.maxBet}"
            step="1"
            value="${defaultAmount}"
            data-betting-amount-category="${escapeBettingHtml_(category.id)}"
            oninput="updateBettingReturnsForCategory('${category.id}')"
            ${locked || oddsPending ? "disabled" : ""}
          >
        `}

         ${config.allowBetRemoval === true && !locked && !categoryFinished ? `
            <button
              class="betting-remove-btn"
              type="button"
              onclick="removeBetSelection('${category.id}')"
            >
              Take Back
            </button>
          ` : ""}

        <div class="betting-nominee-grid">
          ${(category.nominees || []).map(nominee => {

            const selected =
              bet &&
              String(bet.nomineeId || "")
                .trim()
                .toLowerCase() ===
              String(nominee.id || "")
                .trim()
                .toLowerCase();

            const nomineeId =
              String(nominee.id || "")
                .trim()
                .toLowerCase();

            const winner =
              winnerNomineeId &&
              winnerNomineeId === nomineeId;

            const nomineeOddsAvailable =
              oddsReady &&
              nominee.oddsAvailable !== false &&
              Number(nominee.odds || 0) > 0;

            const potential =
              nomineeOddsAvailable
                ? Number(defaultAmount || 0) *
                  Number(nominee.odds || 0)
                : 0;

            const record =
              getBettingNomineeRecord_(
                category,
                nominee
              );

            const score =
              getBettingNomineeScore_(
                category,
                nominee
              );

            const hasScore =
              score !== "" &&
              score !== null &&
              score !== undefined;

            return `
              <button
                class="betting-nominee-card ${selected ? "selected" : ""} ${winner ? "winner-pick" : ""} ${!nomineeOddsAvailable && !categoryFinished ? "odds-pending" : ""}"
                data-betting-category="${escapeBettingHtml_(category.id)}"
                data-betting-nominee="${escapeBettingHtml_(nominee.id)}"
                onclick="${categoryFinished || locked || !nomineeOddsAvailable ? "" : `saveBetSelection('${category.id}', '${nominee.id}')`}"
                ${categoryFinished || locked || !nomineeOddsAvailable ? "disabled" : ""}
              >
                <div class="betting-logo-score-area">

                  ${nominee.image ? `
                    <img
                      class="betting-logo-fill"
                      src="${escapeBettingHtml_(nominee.image)}"
                      alt=""
                      loading="lazy"
                    >
                  ` : `
                    <div class="betting-logo-placeholder"></div>
                  `}

                  ${hasScore ? `
                    <div class="betting-logo-score">
                      ${escapeBettingHtml_(score)}
                    </div>
                  ` : ""}

                </div>

                <div class="betting-nominee-name">
                  ${escapeBettingHtml_(nominee.shortAnswer || nominee.name)}

                  ${record ? `
                    <span class="betting-team-record">
                      ${escapeBettingHtml_(record)}
                    </span>
                  ` : ""}
                </div>

                <div class="betting-odds-row ${!nomineeOddsAvailable && !categoryFinished ? "odds-pending" : ""}">
                  <span>${nomineeOddsAvailable ? odds_(nominee.odds) : "Odds pending"}</span>

                  <span
                    class="betting-return-value"
                    data-betting-return-category="${escapeBettingHtml_(category.id)}"
                    data-betting-odds="${escapeBettingHtml_(nomineeOddsAvailable ? nominee.odds : "")}"
                  >
                    ${nomineeOddsAvailable ? "Return " + money_(potential) : "Waiting for odds"}
                  </span>
                </div>

              </button>
            `;

          }).join("")}
        </div>

      </div>

    </details>
  `;

}

async function removeBetSelection(categoryId){

  const session = getBettingSession_();
  const username = session.username || "";
  const gameId = getBettingGameId_();
  const categoryKey = String(categoryId || "");
  const notice = document.getElementById("bettingNotice");

  const token =
    Date.now() + "-" + Math.random();

  BETTING_STATE.saveTokens[categoryKey] = token;

  delete BETTING_STATE.optimisticBets[categoryKey];

  clearBettingCategorySelectionDom_(
    categoryKey
  );

  clearBettingCategoryCurrentDom_(
    categoryKey
  );

  markBettingCategorySaving_(
    categoryKey,
    true
  );

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Taking back wager...",
        ""
      );
  }

  try {

    if (!username) {
      throw new Error(
        "Please log in again."
      );
    }

    const res = await enqueueBettingSave_(function(){

      return apiRemoveBet({
        username: username,
        gameId: gameId,
        categoryId: categoryKey
      });

    });

    if (
      BETTING_STATE.saveTokens[categoryKey] !== token
    ) {
      return;
    }

    if (!res || res.success === false) {
      throw new Error(
        (res && (res.message || res.error)) ||
        "Could not remove bet."
      );
    }

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          res.removed
            ? "Wager taken back."
            : "No saved wager was found to take back.",
          res.removed ? "success" : "warning"
        );
    }

  } catch (err) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          err && err.message
            ? err.message
            : "Could not remove bet.",
          "error"
        );
    }

    console.error(
      "REMOVE BET ERROR",
      err
    );

  } finally {

    if (
      BETTING_STATE.saveTokens[categoryKey] === token
    ) {
      markBettingCategorySaving_(
        categoryKey,
        false
      );
    }

  }

}

function renderBettingLeaderboardPreview_(rows, config){

  if (!rows || !rows.length) {
    return "";
  }

  const startingBankroll =
    Number(
      config.startingBankroll || 0
    );

  const leader =
    rows[0];

  const leaderWinnings =
    getBettingWinnings_(
      leader.bankroll,
      startingBankroll
    );

  return `
    <details class="betting-leaderboard-card betting-leaderboard-collapse">

      <summary class="betting-leaderboard-summary">
        <div>
          <div class="betting-section-title">Wager Leaderboard</div>

          <div class="betting-leaderboard-subtitle">
            #1 ${escapeBettingHtml_(leader.user || leader.username || "")}
            · ${money_(leader.bankroll)}
            ·
            <span class="betting-money-${getBettingWinningsClass_(leaderWinnings)}">
              ${leaderWinnings > 0 ? "+" : ""}${money_(leaderWinnings)}
            </span>
          </div>
        </div>

        <div class="betting-expand-icon">⌄</div>
      </summary>

      <div class="betting-leaderboard-body">

        ${rows.slice(0, 10).map((row, index) => {

          const winnings =
            getBettingWinnings_(
              row.bankroll,
              startingBankroll
            );

          return `
            <div class="betting-leaderboard-row">

              <div class="betting-place-pill">
                #${index + 1}
              </div>

              <div class="betting-leaderboard-user">
                <strong>${escapeBettingHtml_(row.user || row.username || "")}</strong>

                <div class="betting-row-sub">
                  ${row.wonBets || 0} won · ${row.pendingBets || 0} pending
                </div>
              </div>

              <div class="betting-row-score">
                <div>${money_(row.bankroll)}</div>

                <div class="betting-row-winnings betting-money-${getBettingWinningsClass_(winnings)}">
                  ${winnings > 0 ? "+" : ""}${money_(winnings)}
                </div>
              </div>

            </div>
          `;

        }).join("")}

      </div>

    </details>
  `;

}

function isBettingDatePassed_(category){

  if (!category) {
    return false;
  }

  const value =
    category.lockDateTime ||
    category.LockDateTime ||
    category.gameDateTime ||
    category.GameDateTime ||
    category.startDateTime ||
    category.StartDateTime ||
    "";

  if (!value) {
    return false;
  }

  const d =
    new Date(value);

  if (isNaN(d.getTime())) {
    return false;
  }

  return d.getTime() <= Date.now();

}

function isBettingFinalCategory_(category){

  if (!category) {
    return false;
  }

  /*
    If the wager is already resolved, move it down.
  */
  if (
    category.finished === true ||
    String(category.winnerNomineeId || "")
      .trim() !== "" ||
    String(category.wagerResultType || "")
      .trim() !== ""
  ) {
    return true;
  }

  /*
    Sports API fallback.
  */
  const label =
    typeof getBettingGameStateLabel_ === "function"
      ? getBettingGameStateLabel_(category)
      : "";

  if (label === "Final") {
    return true;
  }

  const status =
    String(category.sportsStatus || "")
      .trim()
      .toLowerCase();

  const state =
    String(category.sportsState || "")
      .trim()
      .toLowerCase();

  const combined =
    status + " " + state;

  return (
    combined.includes("final") ||
    combined.includes("complete") ||
    combined.includes("completed") ||
    combined.includes("post")
  );

}

function getBettingCategorySortTime_(category){

  const d =
    new Date(category.lockDateTime || "");

  const t =
    d.getTime();

  if (isNaN(t)) {
    return 9999999999999;
  }

  return t;

}

function getBettingDateKey_(category){

  const d =
    new Date(category.lockDateTime || "");

  if (isNaN(d.getTime())) {
    return "date-tbd";
  }

  const year =
    d.getFullYear();

  const month =
    String(d.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(d.getDate())
      .padStart(2, "0");

  return year + "-" + month + "-" + day;

}

function getBettingDateLabel_(category){

  const d =
    new Date(category.lockDateTime || "");

  if (isNaN(d.getTime())) {
    return "Date TBD";
  }

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

}

function getBettingLeagueLabel_(category){

  const league =
    String(
      category.league ||
      category.section ||
      "Other"
    )
      .trim();

  return league
    ? league.toUpperCase()
    : "OTHER";

}

function groupBettingCategoriesByDateAndLeague_(categories, newestFirst){

  const dateMap = {};

  categories.forEach(function(category){

    const dateKey =
      getBettingDateKey_(category);

    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        key: dateKey,
        label: getBettingDateLabel_(category),
        sortTime: getBettingCategorySortTime_(category),
        leagues: {}
      };
    }

    const leagueLabel =
      getBettingLeagueLabel_(category);

    if (!dateMap[dateKey].leagues[leagueLabel]) {
      dateMap[dateKey].leagues[leagueLabel] = {
        label: leagueLabel,
        categories: []
      };
    }

    dateMap[dateKey]
      .leagues[leagueLabel]
      .categories
      .push(category);

    dateMap[dateKey].sortTime =
      Math.min(
        dateMap[dateKey].sortTime,
        getBettingCategorySortTime_(category)
      );

  });

  return Object.values(dateMap)
    .sort(function(a, b){

      return newestFirst
        ? b.sortTime - a.sortTime
        : a.sortTime - b.sortTime;

    })
    .map(function(dateGroup){

      dateGroup.leagueGroups =
        Object.values(dateGroup.leagues)
          .sort(function(a, b){
            return a.label.localeCompare(b.label);
          })
          .map(function(leagueGroup){

            leagueGroup.categories.sort(function(a, b){

              return newestFirst
                ? getBettingCategorySortTime_(b) - getBettingCategorySortTime_(a)
                : getBettingCategorySortTime_(a) - getBettingCategorySortTime_(b);

            });

            return leagueGroup;

          });

      return dateGroup;

    });

}

function bettingGameCountLabel_(count){

  return count === 1
    ? "1 game"
    : count + " games";

}

function bettingCategoryHasBet_(category, betMap){

  return !!(
    betMap &&
    category &&
    category.id &&
    betMap[category.id]
  );

}

function countBettingBetsInCategories_(categories, betMap){

  return (categories || [])
    .filter(function(category){
      return bettingCategoryHasBet_(
        category,
        betMap
      );
    })
    .length;

}

function renderBettingBetMarker_(show){

  if (!show) {
    return "";
  }

  return `
    <span class="betting-bet-marker">
      $
    </span>
  `;

}

function renderBettingLeagueGroup_(leagueGroup, betMap, config, open){

  const openAttr =
    open ? " open" : "";

  const betCount =
    countBettingBetsInCategories_(
      leagueGroup.categories,
      betMap
    );

  const hasBets =
    betCount > 0;

  return `
    <details class="betting-league-group ${hasBets ? "has-bet" : ""}"${openAttr}>

      <summary class="betting-group-summary betting-league-summary">
        <span class="betting-group-title">
          ${escapeBettingHtml_(leagueGroup.label)}
        </span>

        <span class="betting-group-side">
        

          <span class="betting-group-count ${hasBets ? "has-bet" : ""}">
            ${escapeBettingHtml_(bettingGameCountLabel_(leagueGroup.categories.length))}
          </span>

          <span class="betting-group-arrow">⌄</span>
        </span>
      </summary>

      <div class="betting-league-body">
        ${leagueGroup.categories.map(function(category){
          return renderBettingCategory_(
            category,
            betMap[category.id],
            config
          );
        }).join("")}
      </div>

    </details>
  `;

}

function renderBettingDateGroup_(dateGroup, betMap, config, open){

  const openAttr =
    open ? " open" : "";

  const categories = [];

  dateGroup.leagueGroups.forEach(function(leagueGroup){

    categories.push.apply(
      categories,
      leagueGroup.categories
    );

  });

  const count =
    categories.length;

  const betCount =
    countBettingBetsInCategories_(
      categories,
      betMap
    );

  const hasBets =
    betCount > 0;

  return `
    <details class="betting-date-group ${hasBets ? "has-bet" : ""}"${openAttr}>

      <summary class="betting-group-summary betting-date-summary">
        <span class="betting-group-title">
          ${escapeBettingHtml_(dateGroup.label)}
        </span>

        <span class="betting-group-side">
          <span class="betting-group-count ${hasBets ? "has-bet" : ""}">
            ${escapeBettingHtml_(bettingGameCountLabel_(count))}
          </span>

          <span class="betting-group-arrow">⌄</span>
        </span>
      </summary>

      <div class="betting-date-body">
        ${dateGroup.leagueGroups.map(function(leagueGroup){
          return renderBettingLeagueGroup_(
            leagueGroup,
            betMap,
            config,
            true
          );
        }).join("")}
      </div>

    </details>
  `;

}

function renderBettingFinalGamesGroup_(finalCategories, betMap, config){

  if (!finalCategories.length) {
    return "";
  }

  const finalGroups =
    groupBettingCategoriesByDateAndLeague_(
      finalCategories,
      true
    );

  return `
    <details class="betting-final-group">

      <summary class="betting-group-summary betting-final-summary">
        <span class="betting-group-title">
          Finished Games
        </span>

        <span class="betting-group-side">
          <span class="betting-group-count">
            ${escapeBettingHtml_(bettingGameCountLabel_(finalCategories.length))}
          </span>
          <span class="betting-group-arrow">⌄</span>
        </span>
      </summary>

      <div class="betting-final-body">
        ${finalGroups.map(function(dateGroup){
          return renderBettingDateGroup_(
            dateGroup,
            betMap,
            config,
            false
          );
        }).join("")}
      </div>

    </details>
  `;

}

function renderBettingGroupedCategories_(categories, betMap, config){

  const activeCategories =
    [];

  const finalCategories =
    [];

  categories.forEach(function(category){

    if (isBettingFinalCategory_(category)) {
      finalCategories.push(category);
    } else {
      activeCategories.push(category);
    }

  });

  const activeGroups =
    groupBettingCategoriesByDateAndLeague_(
      activeCategories,
      false
    );

  return `
    <div class="betting-category-list betting-grouped-list">

      ${activeCategories.length ? `
        <div class="betting-group-section-label">
          Active, Live & Upcoming Games
        </div>

        ${activeGroups.map(function(dateGroup, index){
          return renderBettingDateGroup_(
            dateGroup,
            betMap,
            config,
            index === 0
          );
        }).join("")}
      ` : ""}

      ${renderBettingFinalGamesGroup_(
        finalCategories,
        betMap,
        config
      )}

    </div>
  `;

}

function renderBettingAdminControls_(session){

  if (
    !session ||
    session.isAdmin !== true
  ) {
    return "";
  }

  return `
    <div class="betting-admin-controls">

      <button
        class="betting-admin-btn"
        type="button"
        onclick="refreshAndSettleWagersFromPage_()"
      >
        Sync Odds, Scores & Settle
      </button>

    </div>
  `;

}

async function renderBettingPage(){

  const session = getBettingSession_();
  const username = session.username || "";
  const gameId = getBettingGameId_();

  setTimeout(
    startBettingAutoRefresh_,
    0
  );

  if (!username) {

    return `
      <div class="page">
        <h1>Wager</h1>
        ${renderBettingNotice_("Please log in again.", "error")}
      </div>
    `;

  }

  const pageRes =
    await apiGetBettingPagePayload(
      username,
      gameId,
      {
        offset: 0,
        limit: BETTING_BATCH_SIZE,
        includeSummary: true,
        includeLeaderboard: false
      }
    );

  if (!pageRes || pageRes.success === false) {

    return `
      <div class="page">
        <h1>Wager</h1>
        ${renderBettingNotice_(
          (pageRes && (pageRes.message || pageRes.error)) ||
          "Could not load wager options.",
          "error"
        )}
      </div>
    `;

  }

  const optionsRes = pageRes;
  const config = optionsRes.config || {};

  if (config.enabled === false) {

    return `
      <div class="page betting-page">
        <h1>Wager</h1>
        ${renderBettingNotice_(
          "Wagering is not enabled for this game yet. Set Type to wager or WagerEnabled to TRUE in the Games sheet.",
          "warning"
        )}
      </div>
    `;

  }

  const emptySummary = {
    bankroll: config.startingBankroll || 0,
    totalStaked: 0,
    maxBankroll: config.startingBankroll || 0,
    pendingBets: 0,
    bets: []
  };

  const summary =
    pageRes && pageRes.summary
      ? pageRes.summary
      : emptySummary;

  const leaderboardRows =
    Array.isArray(pageRes.leaderboard)
      ? pageRes.leaderboard
      : [];

  const betMap = mergeBettingOptimisticBets_(
    buildBetMap_(summary)
  );

  const categories = optionsRes.categories || [];

  BETTING_PAGE_BATCH_STATE.gameId = gameId;
  BETTING_PAGE_BATCH_STATE.username = username;
  BETTING_PAGE_BATCH_STATE.config = config;
  BETTING_PAGE_BATCH_STATE.summary = summary;
  BETTING_PAGE_BATCH_STATE.categories = categories.slice();
  BETTING_PAGE_BATCH_STATE.nextOffset =
    Number(pageRes.nextCategoryOffset ||
      (pageRes.categoryBatch && pageRes.categoryBatch.nextOffset) ||
      categories.length ||
      0);
  BETTING_PAGE_BATCH_STATE.hasMore =
    pageRes.hasMoreCategories === true ||
    !!(pageRes.categoryBatch && pageRes.categoryBatch.hasMore);
  BETTING_PAGE_BATCH_STATE.loading = false;

  setTimeout(function(){
    hydrateBettingPageAfterRender_();
  }, 0);

  return `
    <div class="page betting-page">

      <h1>Wager</h1>

      <div id="bettingNotice"></div>

      ${renderBettingAdminControls_(session)}

      <p class="betting-intro">
        Start with ${money_(config.startingBankroll)} chips. Pick one nominee per category and wager between ${money_(config.minWager || config.minBet)} and ${money_(config.maxWager || config.maxBet)} chips.
      </p>

      <div id="bettingSummaryBlock">
        ${renderBettingSummary_(
          summary,
          leaderboardRows,
          username,
          config
        )}
      </div>

      <div id="bettingLeaderboardBlock">
        ${renderBettingLeaderboardPreview_(
          leaderboardRows,
          config
        )}
      </div>

      <div id="bettingCategoryListBlock">
        ${renderBettingGroupedCategories_(
          categories,
          betMap,
          config
        )}
      </div>

      <div id="bettingBatchStatusBlock">
        ${BETTING_PAGE_BATCH_STATE.hasMore ? `
          <div class="betting-notice">
            Loading more games...
          </div>
        ` : ""}
      </div>

    </div>
  `;

}

function getSelectedBettingNomineeId_(categoryId){

  const selected =
    document.querySelector(
      `[data-betting-category="${escapeBettingSelectorValue_(String(categoryId || ""))}"].selected`
    );

  if (!selected) {
    return "";
  }

  return String(
    selected.getAttribute("data-betting-nominee") || ""
  ).trim();

}

function scheduleBettingSaveSelection_(
  categoryId,
  nomineeId,
  betAmount,
  delayMs
){

  const categoryKey =
    String(categoryId || "");

  const nomineeKey =
    String(nomineeId || "");

  const amountValue =
    String(betAmount || "");

  if (!categoryKey || !nomineeKey) {
    return;
  }

  const token =
    Date.now() + "-" + Math.random();

  BETTING_STATE.saveTokens[categoryKey] = token;

  BETTING_STATE.latestSaveDrafts[categoryKey] = {
    categoryId: categoryKey,
    nomineeId: nomineeKey,
    betAmount: amountValue,
    token: token
  };

  if (BETTING_STATE.saveTimers[categoryKey]) {
    clearTimeout(
      BETTING_STATE.saveTimers[categoryKey]
    );
  }

  BETTING_STATE.saveTimers[categoryKey] =
    setTimeout(function(){

      const draft =
        BETTING_STATE.latestSaveDrafts[categoryKey];

      if (!draft || draft.token !== token) {
        return;
      }

      saveBetSelectionNow_(
        draft.categoryId,
        draft.nomineeId,
        draft.betAmount,
        draft.token
      );

    }, delayMs || 350);

}

async function saveBetSelectionNow_(
  categoryId,
  nomineeId,
  betAmount,
  token
){

  const session =
    getBettingSession_();

  const username =
    session.username || "";

  const gameId =
    getBettingGameId_();

  const categoryKey =
    String(categoryId || "");

  const nomineeKey =
    String(nomineeId || "");

  const notice =
    document.getElementById(
      "bettingNotice"
    );

  try {

    if (!username) {
      throw new Error(
        "Please log in again."
      );
    }

    if (!categoryKey || !nomineeKey) {
      throw new Error(
        "Missing wager selection."
      );
    }

    if (
      betAmount === "" ||
      Number(betAmount) <= 0
    ) {
      throw new Error(
        "Enter a valid wager amount."
      );
    }

    markBettingCategorySaving_(
      categoryKey,
      true
    );

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          "Saving pick...",
          ""
        );
    }

    const res = await enqueueBettingSave_(function(){

      return apiSaveBet({
        username: username,
        gameId: gameId,
        categoryId: categoryKey,
        nomineeId: nomineeKey,
        betAmount: betAmount
      });

    });

    if (
      BETTING_STATE.saveTokens[categoryKey] !== token
    ) {
      return;
    }

    if (!res || res.success === false) {
      throw new Error(
        (res && (res.message || res.error)) ||
        "Could not save bet."
      );
    }

    BETTING_STATE.optimisticBets[categoryKey] = {
      categoryId: categoryKey,
      nomineeId: nomineeKey,
      betAmount: Number(betAmount || 0),
      odds: res.odds,
      potentialReturn: res.potentialReturn,
      status: "pending",
      payout: 0
    };

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          "Wager saved.",
          "success"
        );
    }

  } catch (err) {

    if (
      BETTING_STATE.saveTokens[categoryKey] === token
    ) {
      clearOptimisticBettingCategory_(
        categoryKey
      );

      clearBettingCategorySelectionDom_(
        categoryKey
      );
    }

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          err && err.message
            ? err.message
            : "Could not save bet.",
          "error"
        );
    }

    console.error(
      "SAVE BET ERROR",
      err
    );

  } finally {

    if (
      BETTING_STATE.saveTokens[categoryKey] === token
    ) {
      markBettingCategorySaving_(
        categoryKey,
        false
      );
    }

  }

}

function saveBetSelection(categoryId, nomineeId){

  const categoryKey =
    String(categoryId || "");

  const nomineeKey =
    String(nomineeId || "");

  const input =
    document.getElementById(
      getBetAmountInputId_(categoryKey)
    );

  const betAmount =
    input
      ? input.value
      : "";

  const notice =
    document.getElementById(
      "bettingNotice"
    );

  if (
    betAmount === "" ||
    Number(betAmount) <= 0
  ) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          "Enter a valid wager amount.",
          "error"
        );
    }

    return;

  }

  optimisticSelectBettingNominee_(
    categoryKey,
    nomineeKey,
    betAmount
  );

  scheduleBettingSaveSelection_(
    categoryKey,
    nomineeKey,
    betAmount,
    350
  );

}

function updateBettingReturnsForCategory(categoryId){

  const categoryKey =
    String(categoryId || "");

  const inputId =
    getBetAmountInputId_(categoryKey);

  const input =
    document.getElementById(inputId);

  if (!input) {
    return;
  }

  const amount =
    Number(input.value || 0);

  const returnEls =
    document.querySelectorAll(
      `[data-betting-return-category="${escapeBettingSelectorValue_(categoryKey)}"]`
    );

  returnEls.forEach(function(el){

    const odds =
      Number(
        el.getAttribute("data-betting-odds") || 0
      );

    const potential =
      amount * odds;

    el.textContent =
      "Return " + money_(potential);

  });

  const selectedNomineeId =
    getSelectedBettingNomineeId_(
      categoryKey
    );

  if (
    selectedNomineeId &&
    amount > 0
  ) {

    optimisticSelectBettingNominee_(
      categoryKey,
      selectedNomineeId,
      input.value
    );

    scheduleBettingSaveSelection_(
      categoryKey,
      selectedNomineeId,
      input.value,
      900
    );

  }

}

function updateBettingCategoryListFromBatchState_(){

  const block =
    document.getElementById("bettingCategoryListBlock");

  if (!block) {
    return;
  }

  const betMap = mergeBettingOptimisticBets_(
    buildBetMap_(BETTING_PAGE_BATCH_STATE.summary || {})
  );

  block.innerHTML =
    renderBettingGroupedCategories_(
      BETTING_PAGE_BATCH_STATE.categories || [],
      betMap,
      BETTING_PAGE_BATCH_STATE.config || {}
    );

}

function updateBettingBatchStatus_(message, type){

  const block =
    document.getElementById("bettingBatchStatusBlock");

  if (!block) {
    return;
  }

  block.innerHTML = message
    ? renderBettingNotice_(message, type || "")
    : "";

}

async function loadNextBettingCategoryBatch_(){

  if (
    BETTING_PAGE_BATCH_STATE.loading ||
    !BETTING_PAGE_BATCH_STATE.hasMore
  ) {
    return;
  }

  BETTING_PAGE_BATCH_STATE.loading = true;

  updateBettingBatchStatus_(
    "Loading more games...",
    ""
  );

  const res = await apiGetBettingPagePayload(
    BETTING_PAGE_BATCH_STATE.username,
    BETTING_PAGE_BATCH_STATE.gameId,
    {
      offset: BETTING_PAGE_BATCH_STATE.nextOffset,
      limit: BETTING_BATCH_SIZE,
      includeSummary: false,
      includeLeaderboard: false
    }
  );

  BETTING_PAGE_BATCH_STATE.loading = false;

  if (!res || res.success === false) {
    updateBettingBatchStatus_(
      (res && (res.message || res.error)) ||
      "Could not load more games.",
      "warning"
    );
    return;
  }

  const incoming = Array.isArray(res.categories)
    ? res.categories
    : [];

  const seen = {};

  BETTING_PAGE_BATCH_STATE.categories.forEach(function(category){
    if (category && category.id) {
      seen[String(category.id)] = true;
    }
  });

  incoming.forEach(function(category){
    if (
      category &&
      category.id &&
      !seen[String(category.id)]
    ) {
      BETTING_PAGE_BATCH_STATE.categories.push(category);
      seen[String(category.id)] = true;
    }
  });

  BETTING_PAGE_BATCH_STATE.nextOffset =
    Number(res.nextCategoryOffset ||
      (res.categoryBatch && res.categoryBatch.nextOffset) ||
      BETTING_PAGE_BATCH_STATE.categories.length);

  BETTING_PAGE_BATCH_STATE.hasMore =
    res.hasMoreCategories === true ||
    !!(res.categoryBatch && res.categoryBatch.hasMore);

  updateBettingCategoryListFromBatchState_();

  refreshBettingLiveSportsData_();

  if (BETTING_PAGE_BATCH_STATE.hasMore) {
    setTimeout(function(){
      loadNextBettingCategoryBatch_();
    }, 75);
  } else {
    updateBettingBatchStatus_("", "");
  }

}

async function loadBettingLeaderboardAfterRender_(){

  const block =
    document.getElementById("bettingLeaderboardBlock");

  if (!block) {
    return;
  }

  block.innerHTML =
    renderBettingNotice_(
      "Leaderboard loading separately...",
      ""
    );

  const res = await apiBettingLeaderboard(
    BETTING_PAGE_BATCH_STATE.gameId
  );

  if (!res || res.success === false) {
    block.innerHTML = "";
    return;
  }

  const rows =
    Array.isArray(res)
      ? res
      : Array.isArray(res.leaderboard)
        ? res.leaderboard
        : [];

  block.innerHTML =
    renderBettingLeaderboardPreview_(
      rows,
      BETTING_PAGE_BATCH_STATE.config || {}
    );

  const summaryBlock =
    document.getElementById("bettingSummaryBlock");

  if (summaryBlock) {
    summaryBlock.innerHTML =
      renderBettingSummary_(
        BETTING_PAGE_BATCH_STATE.summary || {},
        rows,
        BETTING_PAGE_BATCH_STATE.username,
        BETTING_PAGE_BATCH_STATE.config || {}
      );
  }

}

function hydrateBettingPageAfterRender_(){

  if (!document.querySelector(".betting-page")) {
    return;
  }

  if (BETTING_PAGE_BATCH_STATE.hasMore) {
    loadNextBettingCategoryBatch_();
  } else {
    updateBettingBatchStatus_("", "");
  }

  setTimeout(function(){
    startBettingLiveSportsRefresh_();
  }, 150);

  setTimeout(function(){
    loadBettingLeaderboardAfterRender_();
  }, 250);

}

async function refreshBettingFastBlocks_(){

  const session = getBettingSession_();
  const username = session.username || "";
  const gameId = getBettingGameId_();

  if (!username) {
    return;
  }

  const summaryBlock =
    document.getElementById("bettingSummaryBlock");

  const leaderboardBlock =
    document.getElementById("bettingLeaderboardBlock");

  if (!summaryBlock && !leaderboardBlock) {
    return;
  }

  const res =
    await apiGetBettingPagePayload(
      username,
      gameId,
      {
        offset: 0,
        limit: BETTING_BATCH_SIZE,
        includeSummary: true,
        includeLeaderboard: false
      }
    );

  if (!res || res.success === false) {
    return;
  }

  const config = res.config || {};
  const summary = res.summary || {};
  const leaderboardRows =
    Array.isArray(res.leaderboard)
      ? res.leaderboard
      : [];

  if (summaryBlock) {
    summaryBlock.innerHTML =
      renderBettingSummary_(
        summary,
        leaderboardRows,
        username,
        config
      );
  }

  if (
    leaderboardBlock &&
    leaderboardRows.length > 0
  ) {
    leaderboardBlock.innerHTML =
      renderBettingLeaderboardPreview_(
        leaderboardRows,
        config
      );
  }

}

function startBettingAutoRefresh_(){

  if (BETTING_AUTO_REFRESH_TIMER) {
    clearInterval(
      BETTING_AUTO_REFRESH_TIMER
    );
  }

  BETTING_AUTO_REFRESH_TIMER =
    setInterval(async function(){

      if (isBettingSaveInFlight_()) {
        return;
      }

      const app =
        document.getElementById("app");

      if (!app) {
        return;
      }

      const isWagerPage =
        app.querySelector(".betting-page");

      if (!isWagerPage) {
        clearInterval(
          BETTING_AUTO_REFRESH_TIMER
        );

        BETTING_AUTO_REFRESH_TIMER = null;
        return;
      }

      await refreshBettingFastBlocks_();
      await refreshBettingLiveSportsData_();

    }, 60000);

}

async function refreshAndSettleWagersFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Syncing odds, scores, records, and final settlement for this game...",
        ""
      );
  }

  const res =
    await apiAdminRefreshAndSettleSportsWagers(
      gameId,
      {
        scoreRefreshMode:
          "window",
        daysBack:
          2,
        daysForward:
          2,

        force:
          true
      }
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not refresh and settle this sports game.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Sports sync complete. Score rows: " +
        (res.updated || 0) +
        ", odds rows: " +
        (res.oddsUpdated || 0) +
        ", settled: " +
        (res.settled || 0) +
        ", skipped: " +
        (res.skipped || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}

async function refreshWagerScoresFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Refreshing scores and records. This can take up to a minute...",
        ""
      );
  }

  const res =
    await apiAdminRefreshSportsWagerScores(
      gameId,
      {
        refreshEngineFirst:
          true,
        scoreRefreshMode:
          "window",
        daysBack:
          2,
        daysForward:
          2
      }
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not refresh wager scores.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Scores and records refreshed. Updated rows: " +
        (res.updated || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}

async function settleWagersFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Settling final games. This can take up to a minute...",
        ""
      );
  }

  const res =
    await apiAdminRefreshAndSettleSportsWagers(
      gameId,
      {
        scoreRefreshMode:
          "window",
        daysBack:
          2,
        daysForward:
          2
      }
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not settle final games.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Settlement complete. Settled: " +
        (res.settled || 0) +
        ", skipped: " +
        (res.skipped || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}

async function autoSetWagerOddsFromPage_(){

  const notice =
    document.getElementById("bettingNotice");

  const app =
    document.getElementById("app");

  const gameId =
    getBettingGameId_();

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Updating automatic odds. This can take up to a minute. Games with existing bets will be protected...",
        ""
      );
  }

  const res =
    await apiAdminAutoSetSportsWagerOdds(
      gameId
    );

  if (!res || res.success === false) {

    if (notice) {
      notice.innerHTML =
        renderBettingNotice_(
          (res && (res.error || res.message)) ||
          "Could not update automatic odds.",
          "error"
        );
    }

    return;

  }

  if (notice) {
    notice.innerHTML =
      renderBettingNotice_(
        "Auto odds updated. Rows updated: " +
        (res.updatedRows || 0) +
        ". Protected games with bets: " +
        (res.protected || 0),
        ""
      );
  }

  if (app) {
    app.innerHTML =
      await renderBettingPage();
  }

}
