/* =====================================================
   SPORTS WAGER ENGINE
   Bridges the separate Sports Scores Engine into
   Awards App wager games.

   What this does:
   1. Pulls one sports event from the Sports Scores API.
   2. Creates one Awards App category for that matchup.
   3. Creates wager nominees: away/home, or away/draw/home for soccer 3-way.
   4. Stores BettingOdds on the nominee rows.
   5. Settles completed games by updating
      CategorySettings.WinnerNomineeId.

   IMPORTANT:
   This file belongs in the Awards App backend, not inside
   the Sports Scores Engine project.
===================================================== */

/* =====================================================
   CONFIG
===================================================== */

const SPORTS_WAGER_API_URL =
  "https://script.google.com/macros/s/AKfycbwVlgZa1FBvt99dpwr4PbrdBOs9IRcZ6BFlr-t6scTRNcVgQsJKpCWk1d8nxC681Sy0/exec";

const SPORTS_WAGER_DEFAULT_GAME_ID =
  "sports-wagers";

const SPORTS_WAGER_DEFAULT_MARKET =
  "moneyline";

const SPORTS_WAGER_DEFAULT_ODDS =
  2;

const SPORTS_WAGER_DRAW_NOMINEE_ID =
  "draw";

const SPORTS_WAGER_DRAW_RESULT_TYPE =
  "draw";

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsWagerString_(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim();

}

function sportsWagerKey_(value) {

  return sportsWagerString_(value)
    .toLowerCase();

}

function sportsWagerSlug_(value) {

  return sportsWagerString_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function sportsWagerBoolean_(value) {

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "").trim() === "1"
  );

}

function sportsWagerNumber_(value, fallback) {

  const n =
    Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return fallback;
  }

  return n;

}

function sportsWagerNormalizeGameId_(value) {

  return sportsWagerString_(
    value ||
    SPORTS_WAGER_DEFAULT_GAME_ID
  );

}

function sportsWagerNow_() {

  return new Date();

}

function sportsWagerSafeDateValue_(value) {

  if (!value) {
    return "";
  }

  const d =
    new Date(value);

  if (isNaN(d.getTime())) {
    return value;
  }

  return d;

}


/* =====================================================
   SHEET HELPERS
===================================================== */

function sportsWagerGetSheet_(sheetName) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh) {
    throw new Error(
      "Missing sheet: " + sheetName
    );
  }

  return sh;

}

function sportsWagerGetHeaders_(sheetName) {

  const sh =
    sportsWagerGetSheet_(
      sheetName
    );

  if (sh.getLastRow() < 1) {
    throw new Error(
      sheetName + " sheet has no header row"
    );
  }

  return sh
    .getRange(
      1,
      1,
      1,
      sh.getLastColumn()
    )
    .getValues()[0]
    .map(function(header) {
      return String(header || "").trim();
    });

}

function sportsWagerHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {

    header =
      String(header || "").trim();

    if (!header) {
      return;
    }

    /*
      Important:
      Keep the FIRST matching header.
      If the sheet accidentally has duplicate headers,
      this prevents the new code from writing into a later duplicate.
    */
    if (map[header] === undefined) {
      map[header] = index;
    }

  });

  return map;

}

function sportsWagerSetIfExists_(
  row,
  col,
  header,
  value
) {

  if (
    col[header] !== undefined &&
    col[header] > -1
  ) {
    row[col[header]] = value;
  }

}

function sportsWagerEnsureColumns_(
  sheetName,
  requiredHeaders
) {

  const sh =
    sportsWagerGetSheet_(
      sheetName
    );

  const lastColumn =
    sh.getLastColumn();

  if (lastColumn < 1) {
    throw new Error(
      sheetName + " sheet has no header row"
    );
  }

  const headers =
    sportsWagerGetHeaders_(
      sheetName
    );

  const missing =
    requiredHeaders.filter(function(header) {
      return headers.indexOf(header) === -1;
    });

  if (!missing.length) {
    return {
      success: true,
      added: 0,
      columns: []
    };
  }

  sh
    .getRange(
      1,
      lastColumn + 1,
      1,
      missing.length
    )
    .setValues([
      missing
    ]);

  return {
    success: true,
    added: missing.length,
    columns: missing
  };

}

/* =====================================================
   SETUP
===================================================== */

function setupSportsWagerSystem() {

  const categoriesResult =
    sportsWagerEnsureColumns_(
      CATEGORIES_SHEET,
      [
        "SportsProvider",
        "SportsGameId",
        "ESPNEventId",
        "SportsLeague",
        "SportsMarket",
        "SportsSelection",
        "SportsLine",
        "HomeTeam",
        "AwayTeam",
        "HomeRecord",
        "AwayRecord",
        "HomeScore",
        "AwayScore",
        "SportsStatus",
        "SportsState",
        "SportsClock",
        "SportsPeriod",
        "BettingOdds",
        "OddsSource",
        "OddsLastUpdated",
        "LogoUrl"
      ]
    );

  return {
    success: true,
    message: "Sports wager columns are ready",
    categories: categoriesResult
  };

}

/* =====================================================
   SPORTS SCORES API FETCH
===================================================== */

function fetchSportsScoreForWager_(payload) {

  payload =
    payload || {};

  const sportsGameId =
    sportsWagerString_(
      payload.sportsGameId ||
      payload.gameId
    );

  const espnEventId =
    sportsWagerString_(
      payload.espnEventId
    );

  if (
    !sportsGameId &&
    !espnEventId
  ) {
    throw new Error(
      "Sports GameId or ESPNEventId is required"
    );
  }

  const params = {
    action: "getSportsScores"
  };

  if (sportsGameId) {
    params.gameId = sportsGameId;
  }

  if (espnEventId) {
    params.espnEventId = espnEventId;
  }

  const query =
    Object.keys(params)
      .map(function(key) {
        return (
          encodeURIComponent(key) +
          "=" +
          encodeURIComponent(params[key])
        );
      })
      .join("&");

  const response =
    UrlFetchApp.fetch(
      SPORTS_WAGER_API_URL + "?" + query,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      "Sports Scores API failed. HTTP " + code
    );
  }

  const result =
    JSON.parse(
      response.getContentText()
    );

  if (!result.success) {
    throw new Error(
      result.error ||
      result.message ||
      "Sports Scores API returned failure"
    );
  }

  const scores =
    result.scores || [];

  if (!scores.length) {
    throw new Error(
      "No sports score found for requested GameId / ESPNEventId"
    );
  }

  return scores[0];

}

/* =====================================================
   CATEGORY LOOKUPS
===================================================== */

function sportsWagerCategoryExists_(
  awardsGameId,
  categoryId
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined
  ) {
    return false;
  }

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      sportsWagerString_(
        data[i][col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        data[i][col.CategoryId]
      );

    if (
      rowGameId === awardsGameId &&
      rowCategoryId === sportsWagerKey_(categoryId)
    ) {
      return true;
    }

  }

  return false;

}

function sportsWagerGetCategoryRows_(awardsGameId) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const rows = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      col.GameId !== undefined
        ? sportsWagerString_(row[col.GameId])
        : "";

    if (
      awardsGameId &&
      rowGameId !== awardsGameId
    ) {
      continue;
    }

    const sportsGameId =
      col.SportsGameId !== undefined
        ? sportsWagerString_(row[col.SportsGameId])
        : "";

    const espnEventId =
      col.ESPNEventId !== undefined
        ? sportsWagerString_(row[col.ESPNEventId])
        : "";

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      continue;
    }

    rows.push({
      rowNumber: i + 1,
      gameId: rowGameId,
      categoryId:
        col.CategoryId !== undefined
          ? sportsWagerKey_(row[col.CategoryId])
          : "",
      nomineeId:
        col.NomineeId !== undefined
          ? sportsWagerKey_(row[col.NomineeId])
          : sportsWagerSlug_(
              col.Nominee !== undefined
                ? row[col.Nominee]
                : ""
            ),
      nominee:
        col.Nominee !== undefined
          ? sportsWagerString_(row[col.Nominee])
          : "",
      sportsGameId: sportsGameId,
      espnEventId: espnEventId,
      sportsMarket:
        col.SportsMarket !== undefined
          ? sportsWagerNormalizeMarket_(row[col.SportsMarket])
          : "moneyline",
      sportsSelection:
        col.SportsSelection !== undefined
          ? sportsWagerKey_(row[col.SportsSelection])
          : "",
      sportsLine:
        col.SportsLine !== undefined
          ? sportsWagerNumber_(row[col.SportsLine], "")
          : "",
      homeTeam:
        col.HomeTeam !== undefined
          ? sportsWagerString_(row[col.HomeTeam])
          : "",
      awayTeam:
        col.AwayTeam !== undefined
          ? sportsWagerString_(row[col.AwayTeam])
          : ""
    });

  }

  return rows;

}

/* =====================================================
   SPORTS WAGER MARKET + ODDS HELPERS
===================================================== */

const SPORTS_WAGER_MIN_AUTO_ODDS =
  1.35;

const SPORTS_WAGER_MAX_AUTO_ODDS =
  3.75;

const SPORTS_WAGER_AUTO_ODDS_SOURCE =
  "auto-record-v1";

function sportsWagerNormalizeMarket_(market) {

  market =
    sportsWagerKey_(
      market ||
      SPORTS_WAGER_DEFAULT_MARKET ||
      "moneyline"
    );

  if (
    market === "soccer-moneyline" ||
    market === "soccer-3way" ||
    market === "soccer-3-way" ||
    market === "three-way" ||
    market === "3way" ||
    market === "3-way" ||
    market === "moneyline-3way" ||
    market === "moneyline-3-way"
  ) {
    return "soccer-moneyline";
  }

  if (
    market === "h2h" ||
    market === "ml" ||
    market === "moneyline"
  ) {
    return "moneyline";
  }

  if (
    market === "spread" ||
    market === "spreads"
  ) {
    return "spread";
  }

  if (
    market === "total" ||
    market === "totals" ||
    market === "overunder" ||
    market === "over-under"
  ) {
    return "total";
  }

  return "moneyline";

}

function sportsWagerFormatLine_(value) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const n =
    Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return sportsWagerString_(value);
  }

  if (n > 0) {
    return "+" + n;
  }

  return String(n);

}

function sportsWagerMarketLabel_(market) {

  market =
    sportsWagerNormalizeMarket_(market);

  if (market === "soccer-moneyline") {
    return "Soccer 3-Way Moneyline";
  }

  if (market === "spread") {
    return "Spread";
  }

  if (market === "total") {
    return "Total";
  }

  return "Moneyline";

}

function sportsWagerHasScoreValue_(value) {

  return !(
    value === "" ||
    value === null ||
    value === undefined
  );

}

function sportsWagerIsCompletedScore_(score) {

  score = score || {};

  const status =
    sportsWagerKey_(
      score.Status ||
      score.status ||
      ""
    );

  const state =
    sportsWagerKey_(
      score.State ||
      score.state ||
      ""
    );

  return (
    sportsWagerBoolean_(score.Completed) ||
    sportsWagerBoolean_(score.completed) ||
    state === "post" ||
    state === "final" ||
    status.indexOf("final") !== -1 ||
    status.indexOf("full_time") !== -1 ||
    status.indexOf("complete") !== -1 ||
    status.indexOf("completed") !== -1
  );

}

function sportsWagerFindWinnerSideFromScore_(score) {

  score = score || {};

  const explicitSide =
    sportsWagerKey_(
      score.WinnerSide ||
      score.winnerSide ||
      score.WinningSide ||
      ""
    );

  if (
    explicitSide === "home" ||
    explicitSide === "away"
  ) {
    return explicitSide;
  }

  const winnerName =
    sportsWagerString_(
      score.Winner ||
      score.winner ||
      score.WinnerName ||
      score.winnerName ||
      score.WinnerTeam ||
      score.winnerTeam ||
      score.WinningTeam ||
      score.winningTeam ||
      ""
    );

  if (winnerName) {

    const winnerKey =
      sportsWagerKey_(winnerName);

    const winnerSlug =
      sportsWagerSlug_(winnerName);

    const homeTeam =
      sportsWagerString_(
        score.HomeTeam ||
        score.homeTeam ||
        ""
      );

    const awayTeam =
      sportsWagerString_(
        score.AwayTeam ||
        score.awayTeam ||
        ""
      );

    if (
      winnerKey === sportsWagerKey_(homeTeam) ||
      winnerSlug === sportsWagerSlug_(homeTeam)
    ) {
      return "home";
    }

    if (
      winnerKey === sportsWagerKey_(awayTeam) ||
      winnerSlug === sportsWagerSlug_(awayTeam)
    ) {
      return "away";
    }

  }

  if (!sportsWagerIsCompletedScore_(score)) {
    return "";
  }

  if (
    !sportsWagerHasScoreValue_(score.HomeScore) ||
    !sportsWagerHasScoreValue_(score.AwayScore)
  ) {
    return "";
  }

  const homeScore =
    sportsWagerNumber_(
      score.HomeScore,
      null
    );

  const awayScore =
    sportsWagerNumber_(
      score.AwayScore,
      null
    );

  if (
    homeScore === null ||
    awayScore === null ||
    homeScore === awayScore
  ) {
    return "";
  }

  return homeScore > awayScore
    ? "home"
    : "away";

}

function sportsWagerCategoryName_(
  score,
  market
) {

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  return (
    awayTeam +
    " @ " +
    homeTeam +
    " — " +
    sportsWagerMarketLabel_(market)
  );

}

function sportsWagerClamp_(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

}

function sportsWagerRoundOdds_(value) {

  return Math.round(
    Number(value || 0) * 20
  ) / 20;

}

function sportsWagerPayloadHasValue_(value) {

  return String(value || "")
    .trim() !== "";

}

function sportsWagerParseRecord_(recordValue) {

  const text =
    sportsWagerString_(
      recordValue
    );

  if (!text) {
    return null;
  }

  const match =
    text.match(
      /^(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/
    );

  if (!match) {
    return null;
  }

  const wins =
    Number(match[1] || 0);

  const losses =
    Number(match[2] || 0);

  const ties =
    Number(match[3] || 0);

  const games =
    wins + losses + ties;

  if (!games) {
    return null;
  }

  return {
    wins: wins,
    losses: losses,
    ties: ties,
    games: games,
    winPct:
      (wins + ties * 0.5) / games
  };

}

function calculateSportsWagerAutoOdds_(score) {

  score =
    score || {};

  const homeRecord =
    sportsWagerParseRecord_(
      score.HomeRecord
    );

  const awayRecord =
    sportsWagerParseRecord_(
      score.AwayRecord
    );

  if (
    !homeRecord ||
    !awayRecord
  ) {

    return {
      source: "default-no-record",
      homeOdds: SPORTS_WAGER_DEFAULT_ODDS,
      awayOdds: SPORTS_WAGER_DEFAULT_ODDS
    };

  }

  const strengthDiff =
    homeRecord.winPct -
    awayRecord.winPct;

  const homeProbability =
    sportsWagerClamp_(
      0.52 + strengthDiff * 0.9,
      0.27,
      0.73
    );

  const awayProbability =
    1 - homeProbability;

  return {
    source: SPORTS_WAGER_AUTO_ODDS_SOURCE,
    homeOdds:
      sportsWagerClamp_(
        sportsWagerRoundOdds_(
          1 / homeProbability
        ),
        SPORTS_WAGER_MIN_AUTO_ODDS,
        SPORTS_WAGER_MAX_AUTO_ODDS
      ),
    awayOdds:
      sportsWagerClamp_(
        sportsWagerRoundOdds_(
          1 / awayProbability
        ),
        SPORTS_WAGER_MIN_AUTO_ODDS,
        SPORTS_WAGER_MAX_AUTO_ODDS
      )
  };

}

function getSportsWagerRealOddsForScore_(
  score,
  market
) {

  score =
    score || {};

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const league =
    sportsWagerString_(
      score.League
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  if (
    !league ||
    !homeTeam ||
    !awayTeam
  ) {
    return null;
  }

  const params = {
    action: "getSportsOdds",
    league: league,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    market: market,
    refreshIfStale: "true"
  };

  const query =
    Object.keys(params)
      .map(function(key) {
        return (
          encodeURIComponent(key) +
          "=" +
          encodeURIComponent(params[key])
        );
      })
      .join("&");

  const response =
    UrlFetchApp.fetch(
      SPORTS_WAGER_API_URL + "?" + query,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      "Sports Scores Engine odds API failed. HTTP " +
      code +
      ": " +
      body.slice(0, 250)
    );
  }

  const result =
    JSON.parse(
      body
    );

  if (
    !result.success ||
    result.found === false
  ) {
    return null;
  }

  return result;

}

function buildSportsWagerEntries_(
  score,
  market,
  oddsMode,
  payload
) {

  payload =
    payload || {};

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  oddsMode =
    sportsWagerKey_(
      oddsMode ||
      payload.oddsMode ||
      "real"
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const awayLogo =
    sportsWagerString_(
      score.AwayLogo
    );

  const homeLogo =
    sportsWagerString_(
      score.HomeLogo
    );

  let source = "manual";
  let real = null;

  if (
    oddsMode === "real" &&
    market !== "soccer-moneyline"
  ) {

    real =
      getSportsWagerRealOddsForScore_(
        score,
        market
      );

    if (
      !real &&
      market !== "moneyline"
    ) {
      throw new Error(
        "Real " +
        sportsWagerMarketLabel_(market) +
        " odds were not found for this game."
      );
    }

  }

  if (
    oddsMode === "record" &&
    market !== "moneyline" &&
    market !== "soccer-moneyline"
  ) {
    throw new Error(
      "App record odds only support Moneyline markets. Use Real Odds or Manual Odds for Spread/Total."
    );
  }

  if (market === "soccer-moneyline") {

    let awayOdds = "";
    let drawOdds = "";
    let homeOdds = "";

    if (
      oddsMode === "manual"
    ) {

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      drawOdds =
        sportsWagerNumber_(
          payload.drawOdds,
          3
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else if (
      oddsMode === "record"
    ) {

      const autoOdds =
        calculateSportsWagerAutoOdds_(
          score
        );

      awayOdds =
        autoOdds.awayOdds;

      homeOdds =
        autoOdds.homeOdds;

      drawOdds =
        3;

      source =
        autoOdds.source + "-draw-default";

    } else {

      /*
        Many simple odds feeds only return two-way moneyline prices.
        For true soccer 3-way, keep this safe by using the app defaults
        unless manual draw odds were provided.
      */

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      drawOdds =
        sportsWagerNumber_(
          payload.drawOdds,
          3
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "app-default-3way";

    }

    return {
      source: source,
      entries: [
        {
          selection: "away",
          name: awayTeam,
          nomineeId:
            sportsWagerSlug_(
              awayTeam
            ),
          odds: awayOdds,
          line: "",
          logo: awayLogo
        },
        {
          selection: "draw",
          name: "Draw",
          nomineeId: "draw",
          odds: drawOdds,
          line: "",
          logo: ""
        },
        {
          selection: "home",
          name: homeTeam,
          nomineeId:
            sportsWagerSlug_(
              homeTeam
            ),
          odds: homeOdds,
          line: "",
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "moneyline") {

    let awayOdds = "";
    let homeOdds = "";

    if (
      oddsMode === "manual"
    ) {

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else if (
      oddsMode === "record" ||
      !real
    ) {

      const autoOdds =
        calculateSportsWagerAutoOdds_(
          score
        );

      awayOdds =
        autoOdds.awayOdds;

      homeOdds =
        autoOdds.homeOdds;

      source =
        autoOdds.source;

    } else {

      awayOdds =
        sportsWagerNumber_(
          real.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      homeOdds =
        sportsWagerNumber_(
          real.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source =
        real.source ||
        "sports-scores-odds";

    }

    return {
      source: source,
      entries: [
        {
          selection: "away",
          name: awayTeam,
          nomineeId:
            sportsWagerSlug_(
              awayTeam
            ),
          odds: awayOdds,
          line: "",
          logo: awayLogo
        },
        {
          selection: "home",
          name: homeTeam,
          nomineeId:
            sportsWagerSlug_(
              homeTeam
            ),
          odds: homeOdds,
          line: "",
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "spread") {

    let awayLine = "";
    let homeLine = "";
    let awayOdds = "";
    let homeOdds = "";

    if (oddsMode === "manual") {

      awayLine =
        sportsWagerNumber_(
          payload.awayLine,
          ""
        );

      homeLine =
        sportsWagerNumber_(
          payload.homeLine,
          ""
        );

      awayOdds =
        sportsWagerNumber_(
          payload.awayOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      homeOdds =
        sportsWagerNumber_(
          payload.homeOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else {

      awayLine =
        sportsWagerNumber_(
          real.awaySpread,
          ""
        );

      homeLine =
        sportsWagerNumber_(
          real.homeSpread,
          ""
        );

      awayOdds =
        sportsWagerNumber_(
          real.awaySpreadOdds,
          ""
        );

      homeOdds =
        sportsWagerNumber_(
          real.homeSpreadOdds,
          ""
        );

      source =
        real.source ||
        "sports-scores-odds";

    }

    if (
      awayLine === "" ||
      homeLine === "" ||
      !awayOdds ||
      !homeOdds
    ) {
      throw new Error(
        "Spread line or spread odds are missing."
      );
    }

    return {
      source: source,
      entries: [
        {
          selection: "away",
          name:
            awayTeam +
            " " +
            sportsWagerFormatLine_(awayLine),
          nomineeId:
            sportsWagerSlug_(
              awayTeam + "-spread"
            ),
          odds: awayOdds,
          line: awayLine,
          logo: awayLogo
        },
        {
          selection: "home",
          name:
            homeTeam +
            " " +
            sportsWagerFormatLine_(homeLine),
          nomineeId:
            sportsWagerSlug_(
              homeTeam + "-spread"
            ),
          odds: homeOdds,
          line: homeLine,
          logo: homeLogo
        }
      ]
    };

  }

  if (market === "total") {

    let totalPoints = "";
    let overOdds = "";
    let underOdds = "";

    if (oddsMode === "manual") {

      totalPoints =
        sportsWagerNumber_(
          payload.totalPoints,
          ""
        );

      overOdds =
        sportsWagerNumber_(
          payload.overOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      underOdds =
        sportsWagerNumber_(
          payload.underOdds,
          SPORTS_WAGER_DEFAULT_ODDS
        );

      source = "manual";

    } else {

      totalPoints =
        sportsWagerNumber_(
          real.totalPoints,
          ""
        );

      overOdds =
        sportsWagerNumber_(
          real.overOdds,
          ""
        );

      underOdds =
        sportsWagerNumber_(
          real.underOdds,
          ""
        );

      source =
        real.source ||
        "sports-scores-odds";

    }

    if (
      totalPoints === "" ||
      !overOdds ||
      !underOdds
    ) {
      throw new Error(
        "Total line or over/under odds are missing."
      );
    }

    return {
      source: source,
      entries: [
        {
          selection: "over",
          name:
            "Over " + totalPoints,
          nomineeId:
            "over-" +
            sportsWagerSlug_(totalPoints),
          odds: overOdds,
          line: totalPoints,
          logo: ""
        },
        {
          selection: "under",
          name:
            "Under " + totalPoints,
          nomineeId:
            "under-" +
            sportsWagerSlug_(totalPoints),
          odds: underOdds,
          line: totalPoints,
          logo: ""
        }
      ]
    };

  }

  throw new Error(
    "Unsupported sports wager market: " + market
  );

}

/* =====================================================
   CREATE CATEGORY ROW
===================================================== */

function appendSportsWagerCategoryRow_(
  score,
  awardsGameId,
  categoryId,
  entry,
  market,
  oddsSource
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const headers =
    sportsWagerGetHeaders_(
      CATEGORIES_SHEET
    );

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  const categoryName =
    sportsWagerCategoryName_(
      score,
      market
    );

  sportsWagerSetIfExists_(
    row,
    col,
    "GameId",
    awardsGameId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Category",
    categoryName
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CategoryId",
    categoryId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Nominee",
    entry.name
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "NomineeId",
    entry.nomineeId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Section",
    sportsWagerString_(score.League)
      .toUpperCase()
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ShortAnswer",
    entry.name
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Active",
    true
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "PredictionGame",
    true
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CommunityRank",
    false
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FileID",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CategoryImage",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsProvider",
    "ESPN"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsGameId",
    sportsWagerString_(score.GameId)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ESPNEventId",
    sportsWagerString_(score.ESPNEventId)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsLeague",
    sportsWagerString_(score.League)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsMarket",
    market
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsSelection",
    entry.selection
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsLine",
    entry.line
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "HomeTeam",
    homeTeam
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "AwayTeam",
    awayTeam
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "HomeRecord",
    sportsWagerString_(score.HomeRecord)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "AwayRecord",
    sportsWagerString_(score.AwayRecord)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "HomeScore",
    score.HomeScore
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "AwayScore",
    score.AwayScore
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsStatus",
    sportsWagerString_(score.Status)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsState",
    sportsWagerString_(score.State)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsClock",
    sportsWagerString_(score.Clock)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "SportsPeriod",
    sportsWagerString_(score.Period)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "BettingOdds",
    sportsWagerNumber_(
      entry.odds,
      SPORTS_WAGER_DEFAULT_ODDS
    )
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsSource",
    oddsSource || "manual"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "OddsLastUpdated",
    sportsWagerNow_()
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "LogoUrl",
    entry.logo || ""
  );

  sh.appendRow(row);

}

/* =====================================================
   SETTINGS LOOKUPS / WRITES
===================================================== */

function sportsWagerSettingsRowExists_(
  awardsGameId,
  categoryId
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      sportsWagerString_(
        data[i][col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        data[i][col.CategoryId]
      );

    if (
      rowGameId === awardsGameId &&
      rowCategoryId === sportsWagerKey_(categoryId)
    ) {
      return true;
    }

  }

  return false;

}

function appendSportsWagerSettingsRow_(
  score,
  awardsGameId,
  categoryId,
  market
) {

  if (
    sportsWagerSettingsRowExists_(
      awardsGameId,
      categoryId
    )
  ) {
    return false;
  }

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  const headers =
    sportsWagerGetHeaders_(
      CATEGORY_SETTINGS_SHEET
    );

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  const categoryName =
    sportsWagerCategoryName_(
      score,
      market
    );

  const lockDate =
    sportsWagerSafeDateValue_(
      score.GameDateTime
    );

  sportsWagerSetIfExists_(
    row,
    col,
    "GameId",
    awardsGameId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CategoryId",
    categoryId
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Points",
    0
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "Locked",
    false
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "WinnerNomineeId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ChangePenalty",
    0
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "MaxChanges",
    0
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "LockDateTime",
    lockDate
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "DisplayOrder",
    lockDate instanceof Date
      ? lockDate.getTime()
      : 999
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "GroupId",
    sportsWagerString_(score.League)
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ParentCategoryId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FollowUpCategoryId",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FollowUpMapJSON",
    ""
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "LayoutType",
    "wager"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ShortName",
    categoryName
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "CountsAsStatue",
    false
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "ScoreVersion",
    "sports-wager-v2"
  );

  sportsWagerSetIfExists_(
    row,
    col,
    "FavoriteNomineeId",
    ""
  );

  sh.appendRow(row);

  return true;

}

function updateSportsWagerSettingWinner_(
  awardsGameId,
  categoryId,
  winnerNomineeId,
  force,
  wagerResultType
) {

  const sh =
    sportsWagerGetSheet_(
      CATEGORY_SETTINGS_SHEET
    );

  let data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  let headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  let col =
    sportsWagerHeaderMap_(
      headers
    );

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined ||
    col.WinnerNomineeId === undefined
  ) {
    throw new Error(
      "CategorySettings missing GameId, CategoryId, or WinnerNomineeId"
    );
  }

  if (col.WagerResultType === undefined) {

    const newCol =
      sh.getLastColumn() + 1;

    sh
      .getRange(
        1,
        newCol
      )
      .setValue(
        "WagerResultType"
      );

    data =
      sh.getDataRange()
        .getValues();

    headers =
      data[0].map(function(header) {
        return String(header || "").trim();
      });

    col =
      sportsWagerHeaderMap_(
        headers
      );

  }

  winnerNomineeId =
    sportsWagerString_(
      winnerNomineeId || ""
    );

  wagerResultType =
    sportsWagerKey_(
      wagerResultType ||
      (
        winnerNomineeId
          ? "win"
          : ""
      )
    );

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      sportsWagerString_(
        row[col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    if (
      rowGameId !== awardsGameId ||
      rowCategoryId !== sportsWagerKey_(categoryId)
    ) {
      continue;
    }

    const existingWinner =
      sportsWagerString_(
        row[col.WinnerNomineeId]
      );

    const existingResultType =
      col.WagerResultType !== undefined
        ? sportsWagerString_(
            row[col.WagerResultType]
          )
        : "";

    if (
      (
        existingWinner ||
        existingResultType
      ) &&
      !force
    ) {
      return false;
    }

    sh
      .getRange(
        i + 1,
        col.WinnerNomineeId + 1
      )
      .setValue(
        winnerNomineeId
      );

    if (col.WagerResultType !== undefined) {
      sh
        .getRange(
          i + 1,
          col.WagerResultType + 1
        )
        .setValue(
          wagerResultType
        );
    }

    if (col.Locked !== undefined) {
      sh
        .getRange(
          i + 1,
          col.Locked + 1
        )
        .setValue(true);
    }

    return true;

  }

  return false;

}

/* =====================================================
   PUBLIC INTERNAL: CREATE SPORTS WAGER
===================================================== */

function createSportsWagerFromScore(payload) {

  payload =
    payload || {};

  setupSportsWagerSystem();

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const score =
    fetchSportsScoreForWager_({
      sportsGameId:
        payload.sportsGameId,
      gameId:
        payload.sportsGameId,
      espnEventId:
        payload.espnEventId
    });

  const resolvedSportsGameId =
    sportsWagerString_(
      score.GameId ||
      payload.sportsGameId
    );

  const resolvedEspnEventId =
    sportsWagerString_(
      score.ESPNEventId ||
      payload.espnEventId
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam
    );

  if (
    !awayTeam ||
    !homeTeam
  ) {
    throw new Error(
      "Sports score is missing AwayTeam or HomeTeam"
    );
  }

  const market =
    sportsWagerNormalizeMarket_(
      payload.wagerMarket ||
      payload.market ||
      payload.sportsMarket ||
      SPORTS_WAGER_DEFAULT_MARKET
    );

  const categoryId =
    sportsWagerKey_(
      payload.categoryId ||
      (
        "sports-" +
        sportsWagerSlug_(score.League) +
        "-" +
        market +
        "-" +
        sportsWagerSlug_(
          score.ESPNEventId ||
          score.GameId
        )
      )
    );

  const oddsMode =
    sportsWagerKey_(
      payload.oddsMode ||
      (
        sportsWagerBoolean_(payload.autoOdds)
          ? "real"
          : "manual"
      )
    );

  const wagerData =
    buildSportsWagerEntries_(
      score,
      market,
      oddsMode,
      payload
    );

  const entries =
    wagerData.entries || [];

  const expectedEntryCount =
    market === "soccer-moneyline"
      ? 3
      : 2;

  if (entries.length !== expectedEntryCount) {
    throw new Error(
      "Sports wager market must create exactly " +
      expectedEntryCount +
      " nominees."
    );
  }

  const lock =
    LockService.getDocumentLock() ||
    LockService.getScriptLock();

  const gotLock =
    lock.tryLock(30000);

  if (!gotLock) {

    throw new Error(
      "Create wager is busy. Another wager is being saved right now. Please try again in a few seconds."
    );

  }

  let result;
  let shouldClearCaches =
    false;

  try {

    /*
      Important:
      Check duplicate INSIDE the lock.
      This prevents two fast clicks from both creating the same wager.
    */

    if (
      sportsWagerCategoryExists_(
        awardsGameId,
        categoryId
      )
    ) {

      setSportsGameIdOnCategorySettings_(
        awardsGameId,
        categoryId,
        resolvedSportsGameId,
        resolvedEspnEventId,
        score,
        market
      );

      SpreadsheetApp.flush();

      result = {
        success: false,
        duplicate: true,
        message:
          "This sports event and market already exists as a wager category.",
        awardsGameId: awardsGameId,
        sportsGameId: resolvedSportsGameId,
        espnEventId: resolvedEspnEventId,
        categoryId: categoryId,
        market: market
      };

      return result;

    }

    entries.forEach(function(entry) {

      appendSportsWagerCategoryRow_(
        score,
        awardsGameId,
        categoryId,
        entry,
        market,
        wagerData.source
      );

    });

    appendSportsWagerSettingsRow_(
      score,
      awardsGameId,
      categoryId,
      market
    );

    setSportsGameIdOnCategorySettings_(
      awardsGameId,
      categoryId,
      resolvedSportsGameId,
      resolvedEspnEventId,
      score,
      market
    );

    SpreadsheetApp.flush();

    shouldClearCaches =
      true;

    result = {
      success: true,
      awardsGameId: awardsGameId,
      sportsGameId: resolvedSportsGameId,
      espnEventId: resolvedEspnEventId,
      categoryId: categoryId,
      category:
        sportsWagerCategoryName_(
          score,
          market
        ),
      market: market,
      oddsMode: oddsMode,
      oddsSource:
        wagerData.source,
      lockDateTime:
        score.GameDateTime || "",
      nominees:
        entries.map(function(entry) {
          return {
            nomineeId:
              entry.nomineeId,
            name:
              entry.name,
            odds:
              entry.odds,
            selection:
              entry.selection,
            line:
              entry.line
          };
        })
    };

  } finally {

    lock.releaseLock();

  }

  /*
    Clear caches AFTER releasing the lock.
    This keeps the locked spreadsheet section shorter.
  */

  if (
    shouldClearCaches &&
    typeof clearAppCaches === "function"
  ) {
    clearAppCaches();
  }

  return result;

}

function setSportsGameIdOnCategorySettings_(
  gameId,
  categoryId,
  sportsGameId,
  espnEventId,
  score,
  market
) {

  if (
    !gameId ||
    !categoryId ||
    !sportsGameId
  ) {
    return;
  }

  score =
    score || {};

  market =
    sportsWagerString_(
      market || ""
    );

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName("CategorySettings");

  if (!sheet) {

    throw new Error(
      "CategorySettings sheet missing"
    );

  }

  let values =
    sheet.getDataRange().getValues();

  if (!values.length) {

    sheet.appendRow([
      "GameId",
      "CategoryId",
      "Points",
      "Locked",
      "WinnerNomineeId",
      "ChangePenalty",
      "MaxChanges",
      "LockDateTime",
      "DisplayOrder",
      "GroupId",
      "ParentCategoryId",
      "FollowUpCategoryId",
      "FollowUpMapJSON",
      "LayoutType",
      "ShortName",
      "CountsAsStatue",
      "ScoreVersion",
      "FavoriteNomineeId",
      "VotingTypes",
      "SportsGameId",
      "ESPNEventId"
    ]);

    values =
      sheet.getDataRange().getValues();

  }

  const headers =
    values[0].map(function(header) {
      return String(header || "").trim();
    });

  function ensureHeader_(headerName) {

    let index =
      headers.indexOf(headerName);

    if (index !== -1) {
      return index;
    }

    index =
      headers.length;

    sheet
      .getRange(
        1,
        index + 1
      )
      .setValue(headerName);

    headers.push(headerName);

    return index;

  }

  const gameIdCol =
    ensureHeader_("GameId");

  const categoryIdCol =
    ensureHeader_("CategoryId");

  const pointsCol =
    ensureHeader_("Points");

  const lockedCol =
    ensureHeader_("Locked");

  const lockDateTimeCol =
    ensureHeader_("LockDateTime");

  const displayOrderCol =
    ensureHeader_("DisplayOrder");

  const groupIdCol =
    ensureHeader_("GroupId");

  const layoutTypeCol =
    ensureHeader_("LayoutType");

  const shortNameCol =
    ensureHeader_("ShortName");

  const countsAsStatueCol =
    ensureHeader_("CountsAsStatue");

  const scoreVersionCol =
    ensureHeader_("ScoreVersion");

  const votingTypesCol =
    ensureHeader_("VotingTypes");

  const sportsGameIdCol =
    ensureHeader_("SportsGameId");

  const espnEventIdCol =
    ensureHeader_("ESPNEventId");

  const wagerResultTypeCol =
    ensureHeader_("WagerResultType");  

  values =
    sheet.getDataRange().getValues();

  const cleanGameId =
    String(gameId || "").trim();

  const cleanCategoryId =
    String(categoryId || "").trim();

  const cleanSportsGameId =
    String(sportsGameId || "").trim();

  const cleanEspnEventId =
    String(espnEventId || "").trim();

  const lockDateTime =
    sportsWagerString_(
      score.GameDateTime ||
      score.DateTime ||
      score.StartDateTime ||
      ""
    );

  const league =
    sportsWagerString_(
      score.League || ""
    );

  const eventKey =
    sportsWagerString_(
      score.ESPNEventId ||
      score.GameId ||
      cleanSportsGameId
    );

  const groupId =
    sportsWagerKey_(
      "sports-" +
      sportsWagerSlug_(league) +
      "-" +
      sportsWagerSlug_(eventKey)
    );

  const awayTeam =
    sportsWagerString_(
      score.AwayTeam || "Away"
    );

  const homeTeam =
    sportsWagerString_(
      score.HomeTeam || "Home"
    );

  const shortName =
    awayTeam +
    " @ " +
    homeTeam +
    (
      market
        ? " - " + market.toUpperCase()
        : ""
    );

  let targetRow =
    -1;

  for (let i = 1; i < values.length; i++) {

    const rowGameId =
      String(values[i][gameIdCol] || "").trim();

    const rowCategoryId =
      String(values[i][categoryIdCol] || "").trim();

    if (
      rowGameId === cleanGameId &&
      rowCategoryId === cleanCategoryId
    ) {

      targetRow =
        i + 1;

      break;

    }

  }

  if (targetRow === -1) {

    const newRow =
      new Array(headers.length).fill("");

    newRow[gameIdCol] =
      cleanGameId;

    newRow[categoryIdCol] =
      cleanCategoryId;

    sheet.appendRow(newRow);

    targetRow =
      sheet.getLastRow();

  }

  function setValue_(
    colIndex,
    value
  ) {

    if (colIndex === -1) {
      return;
    }

    sheet
      .getRange(
        targetRow,
        colIndex + 1
      )
      .setValue(
        value
      );

  }

  function setIfBlank_(
    colIndex,
    value
  ) {

    if (
      colIndex === -1 ||
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    const cell =
      sheet.getRange(
        targetRow,
        colIndex + 1
      );

    const existing =
      String(cell.getValue() || "")
        .trim();

    if (!existing) {
      cell.setValue(value);
    }

  }

  setValue_(
    sportsGameIdCol,
    cleanSportsGameId
  );

  setValue_(
    espnEventIdCol,
    cleanEspnEventId
  );

  setIfBlank_(
    pointsCol,
    1
  );

  setIfBlank_(
    lockedCol,
    "FALSE"
  );

  setIfBlank_(
    lockDateTimeCol,
    lockDateTime
  );

  setIfBlank_(
    displayOrderCol,
    targetRow - 1
  );

  setIfBlank_(
    groupIdCol,
    groupId
  );

  setIfBlank_(
    layoutTypeCol,
    "wager"
  );

  setIfBlank_(
    wagerResultTypeCol,
    ""
  );

  setIfBlank_(
    shortNameCol,
    shortName
  );

  setIfBlank_(
    countsAsStatueCol,
    "FALSE"
  );

  setIfBlank_(
    scoreVersionCol,
    1
  );

  setIfBlank_(
    votingTypesCol,
    "wager"
  );

}
/* =====================================================
   ADMIN API: CREATE SPORTS WAGER
===================================================== */

function apiAdminCreateSportsWager(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return createSportsWagerFromScore(
    payload
  );

}

/* =====================================================
   ADMIN API: GET SPORTS WAGER GAME OPTIONS
===================================================== */

function apiAdminGetSportsWagerGames(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  const games =
    typeof getActiveGames === "function"
      ? getActiveGames()
      : getGames();

  const activeGames =
    games.filter(function(game) {

      const active =
        game.active === true ||
        game.Active === true ||
        String(game.active || game.Active || "")
          .trim()
          .toLowerCase() === "true";

      const archived =
        game.archived === true ||
        game.Archived === true ||
        String(game.archived || game.Archived || "")
          .trim()
          .toLowerCase() === "true";

      return (
        active &&
        !archived
      );

    });

  const wagerGames =
    activeGames.filter(function(game) {

      const type =
        String(game.type || game.Type || "")
          .trim()
          .toLowerCase();

      const gameId =
        String(game.gameId || game.GameId || "")
          .trim()
          .toLowerCase();

      return (
        type === "wager" ||
        type === "sports-wager" ||
        gameId.indexOf("wager") !== -1
      );

    });

  const finalGames =
    wagerGames.length
      ? wagerGames
      : activeGames;

  return {
    success: true,
    games:
      finalGames.map(function(game) {

        return {
          gameId:
            String(
              game.gameId ||
              game.GameId ||
              ""
            ).trim(),

          name:
            String(
              game.name ||
              game.Name ||
              game.gameName ||
              game.GameName ||
              game.gameId ||
              game.GameId ||
              ""
            ).trim(),

          type:
            String(
              game.type ||
              game.Type ||
              ""
            ).trim(),

          year:
            game.year ||
            game.Year ||
            ""
        };

      })
  };

}

/* =====================================================
   SETTLEMENT HELPERS
===================================================== */

function sportsWagerBuildCategoriesBySportsGame_(
  awardsGameId
) {

  const rows =
    sportsWagerGetCategoryRows_(
      awardsGameId
    );

  const map = {};

  rows.forEach(function(row) {

    const key =
      row.categoryId;

    if (!key) {
      return;
    }

    if (!map[key]) {
      map[key] = {
        sportsGameId:
          row.sportsGameId,
        espnEventId:
          row.espnEventId,
        awardsGameId:
          row.gameId,
        categoryId:
          row.categoryId,
        market:
          row.sportsMarket || "moneyline",
        nominees: []
      };
    }

    map[key].nominees.push({
      nomineeId:
        row.nomineeId,
      nominee:
        row.nominee,
      selection:
        row.sportsSelection,
      line:
        row.sportsLine
    });

  });

  return map;

}

function sportsWagerFindWinnerNomineeId_(
  score,
  nominees,
  market
) {

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  const homeScore =
    sportsWagerNumber_(
      score.HomeScore,
      0
    );

  const awayScore =
    sportsWagerNumber_(
      score.AwayScore,
      0
    );

  if (market === "soccer-moneyline") {

    let winningSelection = "";

    if (homeScore > awayScore) {
      winningSelection = "home";
    } else if (awayScore > homeScore) {
      winningSelection = "away";
    } else if (
      sportsWagerHasScoreValue_(score.HomeScore) &&
      sportsWagerHasScoreValue_(score.AwayScore)
    ) {
      winningSelection = "draw";
    }

    if (!winningSelection) {
      return "";
    }

    const winner =
      nominees.find(function(nominee) {
        return (
          sportsWagerKey_(nominee.selection) === winningSelection ||
          sportsWagerKey_(nominee.nomineeId) === winningSelection ||
          sportsWagerKey_(nominee.nominee) === winningSelection
        );
      });

    return winner
      ? sportsWagerKey_(winner.nomineeId)
      : "";

  }

  if (market === "moneyline") {

    const winnerSide =
      sportsWagerFindWinnerSideFromScore_(
        score
      );

    const winnerName =
      sportsWagerString_(
        score.Winner ||
        score.winner ||
        score.WinnerName ||
        score.winnerName ||
        score.WinnerTeam ||
        score.winnerTeam ||
        score.WinningTeam ||
        score.winningTeam ||
        (
          winnerSide === "home"
            ? score.HomeTeam
            : winnerSide === "away"
              ? score.AwayTeam
              : ""
        )
      );

    const winnerSlug =
      sportsWagerSlug_(
        winnerName
      );

    for (let i = 0; i < nominees.length; i++) {

      const nominee =
        nominees[i];

      const nomineeId =
        sportsWagerKey_(
          nominee.nomineeId
        );

      if (
        winnerSide &&
        sportsWagerKey_(nominee.selection) === winnerSide
      ) {
        return nomineeId;
      }

      if (
        winnerSlug &&
        (
          nomineeId === winnerSlug ||
          sportsWagerSlug_(nominee.nominee) === winnerSlug
        )
      ) {
        return nomineeId;
      }

    }

    return "";

  }

  if (market === "spread") {

    let best = null;
    let bestAdjustedScore = null;

    nominees.forEach(function(nominee) {

      const selection =
        sportsWagerKey_(
          nominee.selection
        );

      const line =
        sportsWagerNumber_(
          nominee.line,
          0
        );

      let adjusted = null;

      if (selection === "home") {
        adjusted = homeScore + line;
      }

      if (selection === "away") {
        adjusted = awayScore + line;
      }

      if (adjusted === null) {
        return;
      }

      if (
        bestAdjustedScore === null ||
        adjusted > bestAdjustedScore
      ) {
        bestAdjustedScore = adjusted;
        best = nominee;
      } else if (adjusted === bestAdjustedScore) {
        best = null;
      }

    });

    return best
      ? sportsWagerKey_(best.nomineeId)
      : "";

  }

  if (market === "total") {

    const totalScore =
      homeScore + awayScore;

    const line =
      nominees.length
        ? sportsWagerNumber_(nominees[0].line, "")
        : "";

    if (line === "") {
      return "";
    }

    if (totalScore === line) {
      return "";
    }

    const winningSelection =
      totalScore > line
        ? "over"
        : "under";

    const winner =
      nominees.find(function(nominee) {
        return sportsWagerKey_(nominee.selection) === winningSelection;
      });

    return winner
      ? sportsWagerKey_(winner.nomineeId)
      : "";

  }

  return "";

}

function sportsWagerGetSettlementResult_(
  score,
  nominees,
  market
) {

  market =
    sportsWagerNormalizeMarket_(
      market
    );

  score =
    score || {};

  nominees =
    nominees || [];

  if (
    !sportsWagerIsCompletedScore_(
      score
    )
  ) {
    return {
      resolved: false,
      winnerNomineeId: "",
      wagerResultType: "",
      reason: "not-completed"
    };
  }

  const hasHomeScore =
    sportsWagerHasScoreValue_(
      score.HomeScore
    );

  const hasAwayScore =
    sportsWagerHasScoreValue_(
      score.AwayScore
    );

  const homeScore =
    sportsWagerNumber_(
      score.HomeScore,
      null
    );

  const awayScore =
    sportsWagerNumber_(
      score.AwayScore,
      null
    );

  const isTie =
    hasHomeScore &&
    hasAwayScore &&
    homeScore !== null &&
    awayScore !== null &&
    homeScore === awayScore;

  /*
    Normal 2-option moneyline:
    Away / Home only.

    If the game ends tied:
    - WinnerNomineeId must be "draw" so the game is finalized.
    - WagerResultType must be "half-refund" so the bankroll logic
      returns half the wager.
  */
  if (
    market === "moneyline" &&
    isTie
  ) {
    return {
      resolved: true,
      winnerNomineeId:
        SPORTS_WAGER_DRAW_NOMINEE_ID,
      wagerResultType:
        "half-refund",
      reason:
        "moneyline-tie-half-refund"
    };
  }

  /*
    Soccer 3-way moneyline:
    Away / Draw / Home.

    If the game ends tied:
    - Draw is an actual winning nominee.
    - WagerResultType stays "win".
  */
  if (
    market === "soccer-moneyline" &&
    isTie
  ) {

    const drawNominee =
      nominees.find(function(nominee) {

        const nomineeId =
          sportsWagerKey_(
            nominee.nomineeId
          );

        const nomineeName =
          sportsWagerSlug_(
            nominee.nominee
          );

        const selection =
          sportsWagerKey_(
            nominee.selection
          );

        return (
          nomineeId === "draw" ||
          nomineeId === "tie" ||
          nomineeName === "draw" ||
          nomineeName === "tie" ||
          nomineeName === "draw-tie" ||
          selection === "draw" ||
          selection === "tie"
        );

      });

    if (drawNominee) {
      return {
        resolved: true,
        winnerNomineeId:
          sportsWagerKey_(
            drawNominee.nomineeId
          ),
        wagerResultType:
          "win",
        reason:
          "soccer-3way-draw"
      };
    }

    return {
      resolved: false,
      winnerNomineeId: "",
      wagerResultType: "",
      reason:
        "draw-nominee-missing"
    };

  }

  const winnerNomineeId =
    sportsWagerFindWinnerNomineeId_(
      score,
      nominees,
      market
    );

  if (!winnerNomineeId) {
    return {
      resolved: false,
      winnerNomineeId: "",
      wagerResultType: "",
      reason: "winner-not-found"
    };
  }

  return {
    resolved: true,
    winnerNomineeId:
      winnerNomineeId,
    wagerResultType:
      "win",
    reason:
      "winner-found"
  };

}

function testForceSettleSportsWagerHalfRefundFix() {

  const result =
    settleSportsWagers({
      gameId: "fifa-world-cup-2026",
      force: true
    });

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

}

/* =====================================================
   PUBLIC INTERNAL: SETTLE SPORTS WAGERS
===================================================== */

function settleSportsWagers(payload) {

  payload =
    payload || {};

  if (
    !sportsWagerBoolean_(
      payload.skipRefresh
    )
  ) {

    refreshSportsWagerScores(
      payload
    );

  }

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const force =
    sportsWagerBoolean_(
      payload.force
    );

  const map =
    sportsWagerBuildCategoriesBySportsGame_(
      awardsGameId
    );

  const keys =
    Object.keys(map);

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    settled: 0,
    skipped: 0,
    errors: []
  };

  keys.forEach(function(key) {

    const item =
      map[key];

    try {

      const score =
        fetchSportsScoreForWager_({
          sportsGameId:
            item.sportsGameId,
          espnEventId:
            item.espnEventId
        });

      summary.checked++;

      const completed =
        sportsWagerIsCompletedScore_(
          score
        );

      if (!completed) {
        summary.skipped++;
        return;
      }

      const settlement =
        sportsWagerGetSettlementResult_(
          score,
          item.nominees,
          item.market
        );

      if (!settlement.resolved) {

        summary.skipped++;

        summary.errors.push({
          sportsGameId:
            item.sportsGameId,
          espnEventId:
            item.espnEventId,
          categoryId:
            item.categoryId,
          market:
            item.market,
          winner:
            score.Winner || "",
          homeTeam:
            score.HomeTeam || "",
          awayTeam:
            score.AwayTeam || "",
          homeScore:
            score.HomeScore,
          awayScore:
            score.AwayScore,
          status:
            score.Status || "",
          state:
            score.State || "",
          completed:
            score.Completed,
          error:
            settlement.reason ||
            "Could not resolve sports wager result."
        });

        return;

      }

      const updated =
        updateSportsWagerSettingWinner_(
          awardsGameId,
          item.categoryId,
          settlement.winnerNomineeId,
          force,
          settlement.wagerResultType
        );

      if (updated) {

        summary.settled++;

      } else {

        summary.skipped++;

      }

    } catch (err) {

      summary.errors.push({
        sportsGameId:
          item.sportsGameId,
        espnEventId:
          item.espnEventId,
        categoryId:
          item.categoryId,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  SpreadsheetApp.flush();

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  }

  return summary;

}

/* =====================================================
   ADMIN API: SETTLE SPORTS WAGERS
===================================================== */

function apiAdminSettleSportsWagers(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return settleSportsWagers(
    payload
  );

}

/* =====================================================
   REFRESH LIVE SCORES FOR SPORTS WAGER CATEGORIES
   Copies latest Sports Scores Engine data into Categories.
===================================================== */

function refreshSportsWagerScores(payload) {

  payload =
    payload || {};

  setupSportsWagerSystem();

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      success: true,
      awardsGameId: awardsGameId,
      checked: 0,
      updated: 0,
      message: "No category rows found"
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const required = [
    "GameId",
    "CategoryId",
    "SportsGameId",
    "ESPNEventId",
    "HomeScore",
    "AwayScore",
    "SportsStatus",
    "SportsClock",
    "SportsPeriod"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    throw new Error(
      "Categories missing sports score columns: " +
      missing.join(", ")
    );
  }

  const scoreCache = {};

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      sportsWagerString_(
        row[col.GameId]
      );

    if (rowGameId !== awardsGameId) {
      continue;
    }

    const sportsGameId =
      sportsWagerString_(
        row[col.SportsGameId]
      );

    const espnEventId =
      sportsWagerString_(
        row[col.ESPNEventId]
      );

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      summary.skipped++;
      continue;
    }

    const cacheKey =
      sportsGameId ||
      espnEventId;

    try {

      if (!scoreCache[cacheKey]) {

        scoreCache[cacheKey] =
          fetchSportsScoreForWager_({
            sportsGameId:
              sportsGameId,
            espnEventId:
              espnEventId
          });

        summary.checked++;

      }

      const score =
        scoreCache[cacheKey];

      const rowNumber =
        i + 1;

      sh
        .getRange(
          rowNumber,
          col.HomeScore + 1
        )
        .setValue(
          score.HomeScore
        );

      sh
        .getRange(
          rowNumber,
          col.AwayScore + 1
        )
        .setValue(
          score.AwayScore
        );

        
        if (col.HomeRecord !== undefined) {
          sh
            .getRange(
              rowNumber,
              col.HomeRecord + 1
            )
            .setValue(
              sportsWagerString_(score.HomeRecord)
            );
        }
  
        if (col.AwayRecord !== undefined) {
          sh
            .getRange(
              rowNumber,
              col.AwayRecord + 1
            )
            .setValue(
              sportsWagerString_(score.AwayRecord)
            );
        }
  
        if (col.LogoUrl !== undefined) {

          const selection =
            col.SportsSelection !== undefined
              ? sportsWagerKey_(row[col.SportsSelection])
              : "";

          const rowNominee =
            col.Nominee !== undefined
              ? sportsWagerString_(row[col.Nominee])
              : "";

          const homeTeam =
            sportsWagerString_(score.HomeTeam);

          const awayTeam =
            sportsWagerString_(score.AwayTeam);

          let logo = "";

          if (
            selection === "home" ||
            rowNominee === homeTeam
          ) {
            logo =
              sportsWagerString_(score.HomeLogo);
          }

          if (
            selection === "away" ||
            rowNominee === awayTeam
          ) {
            logo =
              sportsWagerString_(score.AwayLogo);
          }

          sh
            .getRange(
              rowNumber,
              col.LogoUrl + 1
            )
            .setValue(
              logo
            );

        }
      sh
        .getRange(
          rowNumber,
          col.SportsStatus + 1
        )
        .setValue(
          sportsWagerString_(score.Status)
        );

      sh
        .getRange(
          rowNumber,
          col.SportsClock + 1
        )
        .setValue(
          sportsWagerString_(score.Clock)
        );

      sh
        .getRange(
          rowNumber,
          col.SportsPeriod + 1
        )
        .setValue(
          sportsWagerString_(score.Period)
        );

      if (col.SportsState !== undefined) {
        sh
          .getRange(
            rowNumber,
            col.SportsState + 1
          )
          .setValue(
            sportsWagerString_(score.State)
          );
      }

      summary.updated++;

    } catch (err) {

      summary.errors.push({
        row: i + 1,
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  }

  SpreadsheetApp.flush();

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return summary;

}

function apiAdminRefreshSportsWagerScores(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return refreshSportsWagerScores(
    payload
  );

}

/* =====================================================
   AUTO UPDATE EXISTING SPORTS WAGER ODDS
   Safe default: skips games that already have bets.
===================================================== */

function sportsWagerCategoryHasBets_(
  awardsGameId,
  categoryId
) {

  const sheetName =
    typeof BETS_SHEET !== "undefined"
      ? BETS_SHEET
      : "Bets";

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        sheetName
      );

  if (!sh) {
    return false;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  if (
    col.GameId === undefined ||
    col.CategoryId === undefined
  ) {
    return false;
  }

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      sportsWagerString_(
        data[i][col.GameId]
      );

    const rowCategoryId =
      sportsWagerKey_(
        data[i][col.CategoryId]
      );

    if (
      rowGameId === awardsGameId &&
      rowCategoryId === sportsWagerKey_(categoryId)
    ) {
      return true;
    }

  }

  return false;

}

function autoSetSportsWagerOdds(payload) {

  payload =
    payload || {};

  setupSportsWagerSystem();

  const awardsGameId =
    sportsWagerNormalizeGameId_(
      payload.awardsGameId ||
      payload.gameId ||
      SPORTS_WAGER_DEFAULT_GAME_ID
    );

  validateGameId(
    awardsGameId
  );

  const force =
    sportsWagerBoolean_(
      payload.force
    );

  const sh =
    sportsWagerGetSheet_(
      CATEGORIES_SHEET
    );

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      success: true,
      awardsGameId: awardsGameId,
      checked: 0,
      updatedRows: 0,
      skipped: 0,
      protected: 0,
      errors: []
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col =
    sportsWagerHeaderMap_(
      headers
    );

  const required = [
    "GameId",
    "CategoryId",
    "Nominee",
    "SportsGameId",
    "ESPNEventId",
    "SportsMarket",
    "SportsSelection",
    "BettingOdds"
  ];

  const missing =
    required.filter(function(header) {
      return col[header] === undefined;
    });

  if (missing.length) {
    throw new Error(
      "Categories missing auto odds columns: " +
      missing.join(", ")
    );
  }

  const groups = {};

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowGameId =
      sportsWagerString_(
        row[col.GameId]
      );

    if (rowGameId !== awardsGameId) {
      continue;
    }

    const sportsGameId =
      sportsWagerString_(
        row[col.SportsGameId]
      );

    const espnEventId =
      sportsWagerString_(
        row[col.ESPNEventId]
      );

    if (
      !sportsGameId &&
      !espnEventId
    ) {
      continue;
    }

    const categoryId =
      sportsWagerKey_(
        row[col.CategoryId]
      );

    const market =
      sportsWagerNormalizeMarket_(
        row[col.SportsMarket]
      );

    const key =
      categoryId;

    if (!groups[key]) {
      groups[key] = {
        categoryId: categoryId,
        market: market,
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        rows: []
      };
    }

    groups[key].rows.push({
      rowNumber: i + 1,
      nominee:
        sportsWagerString_(
          row[col.Nominee]
        ),
      selection:
        sportsWagerKey_(
          row[col.SportsSelection]
        )
    });

  }

  const keys =
    Object.keys(groups);

  const summary = {
    success: true,
    awardsGameId: awardsGameId,
    checked: 0,
    updatedRows: 0,
    skipped: 0,
    protected: 0,
    errors: []
  };

  keys.forEach(function(key) {

    const group =
      groups[key];

    try {

      const hasBets =
        sportsWagerCategoryHasBets_(
          awardsGameId,
          group.categoryId
        );

      if (
        hasBets &&
        !force
      ) {
        summary.protected++;
        return;
      }

      const score =
        fetchSportsScoreForWager_({
          sportsGameId:
            group.sportsGameId,
          espnEventId:
            group.espnEventId
        });

      const wagerData =
        buildSportsWagerEntries_(
          score,
          group.market,
          "real",
          {}
        );

      const entriesBySelection = {};

      (wagerData.entries || [])
        .forEach(function(entry) {
          entriesBySelection[
            sportsWagerKey_(entry.selection)
          ] = entry;
        });

      summary.checked++;

      group.rows.forEach(function(item) {

        let selection =
          item.selection;

        if (!selection) {

          if (
            sportsWagerString_(item.nominee) ===
            sportsWagerString_(score.HomeTeam)
          ) {
            selection = "home";
          }

          if (
            sportsWagerString_(item.nominee) ===
            sportsWagerString_(score.AwayTeam)
          ) {
            selection = "away";
          }

        }

        const entry =
          entriesBySelection[selection];

        if (
          !entry ||
          !entry.odds
        ) {
          summary.skipped++;
          return;
        }

        sh
          .getRange(
            item.rowNumber,
            col.BettingOdds + 1
          )
          .setValue(
            entry.odds
          );

        if (col.SportsLine !== undefined) {
          sh
            .getRange(
              item.rowNumber,
              col.SportsLine + 1
            )
            .setValue(
              entry.line
            );
        }

        if (col.Nominee !== undefined) {
          sh
            .getRange(
              item.rowNumber,
              col.Nominee + 1
            )
            .setValue(
              entry.name
            );
        }

        if (col.ShortAnswer !== undefined) {
          sh
            .getRange(
              item.rowNumber,
              col.ShortAnswer + 1
            )
            .setValue(
              entry.name
            );
        }

        if (col.LogoUrl !== undefined) {
          sh
            .getRange(
              item.rowNumber,
              col.LogoUrl + 1
            )
            .setValue(
              entry.logo || ""
            );
        }

        if (col.OddsSource !== undefined) {
          sh
            .getRange(
              item.rowNumber,
              col.OddsSource + 1
            )
            .setValue(
              wagerData.source
            );
        }

        if (col.OddsLastUpdated !== undefined) {
          sh
            .getRange(
              item.rowNumber,
              col.OddsLastUpdated + 1
            )
            .setValue(
              sportsWagerNow_()
            );
        }

        summary.updatedRows++;

      });

    } catch (err) {

      summary.errors.push({
        categoryId:
          group.categoryId,
        sportsGameId:
          group.sportsGameId,
        espnEventId:
          group.espnEventId,
        market:
          group.market,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  SpreadsheetApp.flush();

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return summary;

}

function apiAdminAutoSetSportsWagerOdds(payload) {

  payload =
    payload || {};

  requireAdmin_(
    payload
  );

  return autoSetSportsWagerOdds(
    payload
  );

}

/* =====================================================
   AUTOMATIC SPORTS WAGER SCORE REFRESH
===================================================== */

const SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION =
  "runSportsWagerScoreRefresh";

  function runSportsWagerScoreRefresh() {

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    return {
      success: false,
      message: "Sports wager score refresh already running"
    };
  }

  try {

    const gameIds =
      getSportsWagerGameIdsForRefresh_();

    const results =
      [];

    gameIds.forEach(function(gameId) {

      try {

        const refresh =
          refreshSportsWagerScores({
            gameId: gameId
          });

        const settle =
          settleSportsWagers({
            gameId: gameId,
            skipRefresh: true
          });

        results.push({
          gameId: gameId,
          success: true,
          refresh: refresh,
          settle: settle
        });

      } catch (err) {

        results.push({
          gameId: gameId,
          success: false,
          error:
            err && err.message
              ? err.message
              : String(err)
        });

      }

    });

    return {
      success: true,
      gameCount: gameIds.length,
      results: results
    };

  } finally {

    lock.releaseLock();

  }

}

function getSportsWagerGameIdsForRefresh_() {

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName("CategorySettings");

  if (!sheet) {
    throw new Error(
      "CategorySettings sheet missing"
    );
  }

  const values =
    sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [
      SPORTS_WAGER_DEFAULT_GAME_ID
    ];
  }

  const headers =
    values[0].map(function(header) {
      return String(header || "").trim();
    });

  const gameIdCol =
    headers.indexOf("GameId");

  const sportsGameIdCol =
    headers.indexOf("SportsGameId");

  if (
    gameIdCol === -1 ||
    sportsGameIdCol === -1
  ) {
    return [
      SPORTS_WAGER_DEFAULT_GAME_ID
    ];
  }

  const gameIdMap =
    {};

  for (let i = 1; i < values.length; i++) {

    const row =
      values[i];

    const gameId =
      String(row[gameIdCol] || "").trim();

    const sportsGameId =
      String(row[sportsGameIdCol] || "").trim();

    if (
      gameId &&
      sportsGameId
    ) {
      gameIdMap[gameId] = true;
    }

  }

  const gameIds =
    Object.keys(gameIdMap);

  if (!gameIds.length) {
    return [
      SPORTS_WAGER_DEFAULT_GAME_ID
    ];
  }

  return gameIds;

}

function installSportsWagerScoreRefreshTrigger() {

  removeSportsWagerScoreRefreshTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    success: true,
    message: "Sports wager score refresh trigger installed every 5 minutes"
  };

}

function removeSportsWagerScoreRefreshTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WAGER_SCORE_REFRESH_TRIGGER_FUNCTION
    ) {

      ScriptApp.deleteTrigger(
        trigger
      );

      removed++;

    }

  });

  return {
    success: true,
    removed: removed
  };

}

/* =====================================================
   AUTOMATIC SPORTS WAGER REFRESH + SETTLEMENT
===================================================== */

const SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION =
  "runSportsWagerAutoRefreshAndSettle";

function runSportsWagerAutoRefreshAndSettle() {

  return runSportsWagerScoreRefresh();

}

function installSportsWagerAutoSettleTrigger() {

  removeSportsWagerAutoSettleTriggers();

  ScriptApp
    .newTrigger(
      SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION
    )
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    success: true,
    message: "Sports wager auto refresh and settle trigger installed every 5 minutes"
  };

}

function removeSportsWagerAutoSettleTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_WAGER_AUTO_SETTLE_TRIGGER_FUNCTION
    ) {

      ScriptApp.deleteTrigger(
        trigger
      );

      removed++;

    }

  });

  return {
    success: true,
    removed: removed
  };

}