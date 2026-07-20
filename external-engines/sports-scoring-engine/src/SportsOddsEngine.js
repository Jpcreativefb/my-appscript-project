/************************************************************
 CLEAN SPLIT v11
 Older duplicate patch functions removed; latest definitions retained.
************************************************************/

/* =====================================================
   SPORTS ODDS ENGINE v2
   Lives in Sports Scores Engine.

   Supports:
   - Moneyline / h2h
   - Spreads
   - Totals

   Source:
   - The Odds API v4

   Sheet:
   - SportsOdds
===================================================== */

/* =====================================================
   CONFIG
===================================================== */

const SPORTS_ODDS_SHEET =
  "SportsOdds";

const SPORTS_ODDS_API_BASE =
  "https://api.the-odds-api.com/v4/sports";

const SPORTS_ODDS_API_KEY_PROPERTY =
  "THE_ODDS_API_KEY";

const SPORTS_ODDS_MARKETS =
  "h2h";

const SPORTS_ODDS_REGIONS =
  "us";

const SPORTS_ODDS_FORMAT =
  "decimal";

const SPORTS_ODDS_DATE_FORMAT =
  "iso";

const SPORTS_ODDS_CACHE_MINUTES =
  30;

const SPORTS_ODDS_DEFAULT_BOOKMAKERS = [
  "draftkings",
  "fanduel",
  "betmgm",
  "caesars",
  "espnbet",
  "betrivers",
  "fanatics",
  "pointsbetus"
];

const SPORTS_ODDS_HEADERS = [
  "OddsId",
  "League",
  "SportKey",
  "OddsEventId",
  "CommenceTime",
  "HomeTeam",
  "AwayTeam",

  "HomeOdds",
  "AwayOdds",
  "DrawOdds",

  "HomeSpread",
  "HomeSpreadOdds",
  "AwaySpread",
  "AwaySpreadOdds",

  "TotalPoints",
  "OverOdds",
  "UnderOdds",

  "BookmakerKey",
  "Bookmaker",
  "Markets",
  "Source",
  "LastUpdated",
  "RawMarketsJSON"
];

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsOddsString_(value) {

  return String(value || "")
    .trim();

}

function sportsOddsKey_(value) {

  return sportsOddsString_(value)
    .toLowerCase();

}

function sportsOddsNumber_(value, fallback) {

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

function sportsOddsRound_(value) {

  const n =
    Number(value);

  if (
    isNaN(n) ||
    !isFinite(n)
  ) {
    return "";
  }

  return Math.round(n * 20) / 20;

}

function sportsOddsNow_() {

  return new Date();

}

function sportsOddsNormalizeTeam_(value) {

  return sportsOddsString_(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/\bfc\b/g, "")
    .replace(/\bsc\b/g, "")
    .replace(/\bunited\b/g, "utd")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

function sportsOddsTeamMatchScore_(a, b) {

  const left =
    sportsOddsNormalizeTeam_(a);

  const right =
    sportsOddsNormalizeTeam_(b);

  if (
    !left ||
    !right
  ) {
    return 0;
  }

  if (left === right) {
    return 100;
  }

  if (
    left.includes(right) ||
    right.includes(left)
  ) {
    return 85;
  }

  const leftParts =
    left.split(" ");

  const rightParts =
    right.split(" ");

  let matches = 0;

  leftParts.forEach(function(part) {

    if (
      part.length > 2 &&
      rightParts.indexOf(part) !== -1
    ) {
      matches++;
    }

  });

  const maxParts =
    Math.max(
      leftParts.length,
      rightParts.length
    );

  if (!maxParts) {
    return 0;
  }

  return Math.round(
    matches / maxParts * 75
  );

}

function sportsOddsLeagueToSportKey_(league) {

  const key =
    sportsOddsKey_(
      league
    );

  const map = {

    /* =========================
       ESPN / APP LEAGUE CODES
    ========================= */

    nfl:
      "americanfootball_nfl",

    "nfl-preseason":
      "americanfootball_nfl_preseason",

    "college-football":
      "americanfootball_ncaaf",

    ncaaf:
      "americanfootball_ncaaf",

    ufl:
      "americanfootball_ufl",

    cfl:
      "americanfootball_cfl",

    nba:
      "basketball_nba",

    "nba-preseason":
      "basketball_nba_preseason",

    "nba-summer-league":
      "basketball_nba_summer_league",

    wnba:
      "basketball_wnba",

    "mens-college-basketball":
      "basketball_ncaab",

    ncaamb:
      "basketball_ncaab",

    ncaab:
      "basketball_ncaab",

    "womens-college-basketball":
      "basketball_wncaab",

    ncaawb:
      "basketball_wncaab",

    mlb:
      "baseball_mlb",

    "mlb-preseason":
      "baseball_mlb_preseason",

    nhl:
      "icehockey_nhl",

    "nhl-preseason":
      "icehockey_nhl_preseason",

    /* =========================
       ESPN SOCCER CODES
    ========================= */

    "fifa.world":
      "soccer_fifa_world_cup",

    "world-cup":
      "soccer_fifa_world_cup",

    worldcup:
      "soccer_fifa_world_cup",

    "usa.1":
      "soccer_usa_mls",

    mls:
      "soccer_usa_mls",

    "eng.1":
      "soccer_epl",

    epl:
      "soccer_epl",

    "esp.1":
      "soccer_spain_la_liga",

    laliga:
      "soccer_spain_la_liga",

    "uefa.champions":
      "soccer_uefa_champs_league",

    ucl:
      "soccer_uefa_champs_league",

    "uefa.europa":
      "soccer_uefa_europa_league",

    "uefa.nations":
      "soccer_uefa_nations_league",

    "mex.1":
      "soccer_mexico_ligamx",

    ligamx:
      "soccer_mexico_ligamx",

    "ita.1":
      "soccer_italy_serie_a",

    seriea:
      "soccer_italy_serie_a",

    "ger.1":
      "soccer_germany_bundesliga",

    bundesliga:
      "soccer_germany_bundesliga",

    "fra.1":
      "soccer_france_ligue_one",

    ligue1:
      "soccer_france_ligue_one",

    /* =========================
       ESPN / APP MMA CODES
    ========================= */

    mma:
      "mma_mixed_martial_arts",

    ufc:
      "mma_mixed_martial_arts",

    "mixed-martial-arts":
      "mma_mixed_martial_arts",

    /* =========================
       ESPN / APP MOTORSPORT CODES
       NOTE: Run testListOddsApiMotorsportsAndMma()
       to verify currently active keys on your plan.
    ========================= */

    f1:
      "motorsport_formula_one",

    formula1:
      "motorsport_formula_one",

    "formula-one":
      "motorsport_formula_one",

    "nascar-premier":
      "motorsport_nascar_cup_series",

    nascar:
      "motorsport_nascar_cup_series",

    "nascar-cup":
      "motorsport_nascar_cup_series",

    "nascar-cup-series":
      "motorsport_nascar_cup_series",

    "nascar-xfinity":
      "motorsport_nascar_xfinity_series",

    "nascar-xfinity-series":
      "motorsport_nascar_xfinity_series",

    "nascar-truck":
      "motorsport_nascar_craftsman_truck_series",

    "nascar-trucks":
      "motorsport_nascar_craftsman_truck_series",

    "nascar-craftsman-truck-series":
      "motorsport_nascar_craftsman_truck_series"

  };

  return map[key] || "";

}

function sportsOddsBuildId_(
  league,
  homeTeam,
  awayTeam,
  commenceTime
) {

  return [
    sportsOddsKey_(league),
    sportsOddsNormalizeTeam_(awayTeam),
    sportsOddsNormalizeTeam_(homeTeam),
    sportsOddsString_(commenceTime).slice(0, 10)
  ].join("|");

}

/* =====================================================
   SHEET HELPERS
===================================================== */

function sportsOddsGetSheet_() {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_ODDS_SHEET
    );

  if (!sh) {

    sh =
      ss.insertSheet(
        SPORTS_ODDS_SHEET
      );

    sh
      .getRange(
        1,
        1,
        1,
        SPORTS_ODDS_HEADERS.length
      )
      .setValues([
        SPORTS_ODDS_HEADERS
      ]);

    sh.setFrozenRows(1);

  }

  return sh;

}

function sportsOddsGetHeaders_() {

  const sh =
    sportsOddsGetSheet_();

  return sh
    .getRange(
      1,
      1,
      1,
      sh.getLastColumn()
    )
    .getValues()[0]
    .map(function(header) {
      return sportsOddsString_(header);
    });

}

function sportsOddsHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {

    header =
      sportsOddsString_(header);

    if (
      header &&
      map[header] === undefined
    ) {
      map[header] = index;
    }

  });

  return map;

}


/* Removed older duplicate function setupSportsOddsSystem during v11 cleanup. */

/* =====================================================
   API FETCH
===================================================== */

function getSportsOddsApiKey_() {

  const rawKey =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        SPORTS_ODDS_API_KEY_PROPERTY
      );

  const key =
    sportsOddsString_(
      rawKey
    );

  if (!key) {
    throw new Error(
      "Missing script property: " +
      SPORTS_ODDS_API_KEY_PROPERTY
    );
  }

  return key;

}


/* Removed older duplicate function buildSportsOddsApiUrl_ during v11 cleanup. */


/* Removed older duplicate function fetchSportsOddsEventsForLeague_ during v11 cleanup. */

/* =====================================================
   NORMALIZE MARKETS
===================================================== */

function getPreferredSportsOddsBookmaker_(event) {

  const bookmakers =
    event.bookmakers || [];

  if (!bookmakers.length) {
    return null;
  }

  for (let i = 0; i < SPORTS_ODDS_DEFAULT_BOOKMAKERS.length; i++) {

    const preferred =
      SPORTS_ODDS_DEFAULT_BOOKMAKERS[i];

    const found =
      bookmakers.find(function(bookmaker) {
        return sportsOddsKey_(bookmaker.key) === preferred;
      });

    if (found) {
      return found;
    }

  }

  return bookmakers[0];

}

function getSportsOddsMarket_(bookmaker, marketKey) {

  return (bookmaker.markets || [])
    .find(function(market) {
      return sportsOddsKey_(market.key) === sportsOddsKey_(marketKey);
    }) || null;

}

function normalizeSportsOddsH2H_(
  market,
  homeTeam,
  awayTeam
) {

  const result = {
    homeOdds: "",
    awayOdds: "",
    drawOdds: ""
  };

  if (
    !market ||
    !market.outcomes
  ) {
    return result;
  }

  market.outcomes.forEach(function(outcome) {

    const name =
      sportsOddsString_(
        outcome.name
      );

    const key =
      sportsOddsKey_(
        name
      );

    const price =
      sportsOddsRound_(
        outcome.price
      );

    if (price === "") {
      return;
    }

    if (
      key === "draw" ||
      key === "tie"
    ) {
      result.drawOdds = price;
      return;
    }

    if (
      sportsOddsTeamMatchScore_(
        name,
        homeTeam
      ) >= 70
    ) {
      result.homeOdds = price;
    }

    if (
      sportsOddsTeamMatchScore_(
        name,
        awayTeam
      ) >= 70
    ) {
      result.awayOdds = price;
    }

  });

  return result;

}

function normalizeSportsOddsSpread_(
  market,
  homeTeam,
  awayTeam
) {

  const result = {
    homeSpread: "",
    homeSpreadOdds: "",
    awaySpread: "",
    awaySpreadOdds: ""
  };

  if (
    !market ||
    !market.outcomes
  ) {
    return result;
  }

  market.outcomes.forEach(function(outcome) {

    const name =
      sportsOddsString_(
        outcome.name
      );

    const point =
      sportsOddsNumber_(
        outcome.point,
        ""
      );

    const price =
      sportsOddsRound_(
        outcome.price
      );

    if (
      point === "" ||
      !price
    ) {
      return;
    }

    if (
      sportsOddsTeamMatchScore_(
        name,
        homeTeam
      ) >= 70
    ) {
      result.homeSpread = point;
      result.homeSpreadOdds = price;
    }

    if (
      sportsOddsTeamMatchScore_(
        name,
        awayTeam
      ) >= 70
    ) {
      result.awaySpread = point;
      result.awaySpreadOdds = price;
    }

  });

  return result;

}

function normalizeSportsOddsTotal_(market) {

  const result = {
    totalPoints: "",
    overOdds: "",
    underOdds: ""
  };

  if (
    !market ||
    !market.outcomes
  ) {
    return result;
  }

  market.outcomes.forEach(function(outcome) {

    const name =
      sportsOddsKey_(
        outcome.name
      );

    const point =
      sportsOddsNumber_(
        outcome.point,
        ""
      );

    const price =
      sportsOddsRound_(
        outcome.price
      );

    if (
      point === "" ||
      !price
    ) {
      return;
    }

    if (name === "over") {
      result.totalPoints = point;
      result.overOdds = price;
    }

    if (name === "under") {
      result.totalPoints = point;
      result.underOdds = price;
    }

  });

  return result;

}

function normalizeSportsOddsEvent_(
  event,
  league,
  sportKey
) {

  const bookmaker =
    getPreferredSportsOddsBookmaker_(
      event
    );

  if (!bookmaker) {
    return null;
  }

  const homeTeam =
    sportsOddsString_(
      event.home_team
    );

  const awayTeam =
    sportsOddsString_(
      event.away_team
    );

  if (
    !homeTeam ||
    !awayTeam
  ) {
    return null;
  }

  const h2h =
    normalizeSportsOddsH2H_(
      getSportsOddsMarket_(
        bookmaker,
        "h2h"
      ),
      homeTeam,
      awayTeam
    );

  const spread =
    normalizeSportsOddsSpread_(
      getSportsOddsMarket_(
        bookmaker,
        "spreads"
      ),
      homeTeam,
      awayTeam
    );

  const total =
    normalizeSportsOddsTotal_(
      getSportsOddsMarket_(
        bookmaker,
        "totals"
      )
    );

  const hasAnyMarket =
    (
      h2h.homeOdds !== "" &&
      h2h.awayOdds !== ""
    ) ||

    (
      spread.homeSpreadOdds &&
      spread.awaySpreadOdds
    ) ||
    (
      total.overOdds &&
      total.underOdds
    );

  if (!hasAnyMarket) {
    return null;
  }

  const commenceTime =
    sportsOddsString_(
      event.commence_time
    );

  return {
    OddsId:
      sportsOddsBuildId_(
        league,
        homeTeam,
        awayTeam,
        commenceTime
      ),
    League:
      sportsOddsString_(league)
        .toUpperCase(),
    SportKey:
      sportKey,
    OddsEventId:
      sportsOddsString_(event.id),
    CommenceTime:
      commenceTime,
    HomeTeam:
      homeTeam,
    AwayTeam:
      awayTeam,

    HomeOdds:
      h2h.homeOdds,
    AwayOdds:
      h2h.awayOdds,
    DrawOdds:
      h2h.drawOdds,

    HomeSpread:
      spread.homeSpread,
    HomeSpreadOdds:
      spread.homeSpreadOdds,
    AwaySpread:
      spread.awaySpread,
    AwaySpreadOdds:
      spread.awaySpreadOdds,

    TotalPoints:
      total.totalPoints,
    OverOdds:
      total.overOdds,
    UnderOdds:
      total.underOdds,

    BookmakerKey:
      sportsOddsString_(bookmaker.key),
    Bookmaker:
      sportsOddsString_(bookmaker.title || bookmaker.key),
    Markets:
      SPORTS_ODDS_MARKETS,
    Source:
      "real-odds:" +
      sportsOddsString_(bookmaker.key || bookmaker.title),
    LastUpdated:
      sportsOddsNow_(),
    RawMarketsJSON:
      JSON.stringify(bookmaker.markets || [])
  };

}

/* =====================================================
   UPSERT CACHE
===================================================== */

function upsertSportsOddsRows_(rows) {

  setupSportsOddsSystem();

  const sh =
    sportsOddsGetSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    data[0].map(function(header) {
      return sportsOddsString_(header);
    });

  const col =
    sportsOddsHeaderMap_(
      headers
    );

  const existing = {};

  for (let i = 1; i < data.length; i++) {

    const oddsId =
      sportsOddsString_(
        data[i][col.OddsId]
      );

    if (oddsId) {
      existing[oddsId] = i + 1;
    }

  }

  let inserted = 0;
  let updated = 0;

  rows.forEach(function(item) {

    const row =
      new Array(headers.length)
        .fill("");

    headers.forEach(function(header, index) {
      row[index] =
        item[header] !== undefined
          ? item[header]
          : "";
    });

    if (existing[item.OddsId]) {

      sh
        .getRange(
          existing[item.OddsId],
          1,
          1,
          headers.length
        )
        .setValues([
          row
        ]);

      updated++;

    } else {

      sh.appendRow(row);
      inserted++;

    }

  });

  SpreadsheetApp.flush();

  return {
    inserted: inserted,
    updated: updated
  };

}


/* Removed older duplicate function refreshSportsOddsForLeague during v11 cleanup. */

function refreshSportsOddsForLeagues(payload) {

  payload =
    payload || {};

  const rawLeagues =
    sportsOddsString_(
      payload.leagues ||
      payload.league ||
      ""
    );

  let leagues =
    rawLeagues
      ? rawLeagues.split(",")
      : getSportsOddsActiveLeagues_();

  leagues =
    leagues
      .map(function(league) {
        return sportsOddsString_(league).toUpperCase();
      })
      .filter(Boolean);

  const seen = {};

  leagues =
    leagues.filter(function(league) {

      if (seen[league]) {
        return false;
      }

      seen[league] = true;
      return true;

    });

  const summary = {
    success: true,
    leagues: leagues,
    results: [],
    errors: []
  };

  leagues.forEach(function(league) {

    try {

      summary.results.push(
        refreshSportsOddsForLeague(
          league
        )
      );

    } catch (err) {

      summary.errors.push({
        league: league,
        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  return summary;

}

/* =====================================================
   ACTIVE LEAGUES
===================================================== */

function getSportsOddsActiveLeagues_() {

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(
      "SportsScores"
    );

  if (!sh) {
    return [
      "MLB",
      "NFL",
      "NBA",
      "WNBA",
      "NHL"
    ];
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [
      "MLB",
      "NFL",
      "NBA",
      "WNBA",
      "NHL"
    ];
  }

  const headers =
    data[0].map(function(header) {
      return sportsOddsString_(header);
    });

  const col =
    sportsOddsHeaderMap_(
      headers
    );

  if (col.League === undefined) {
    return [
      "MLB",
      "NFL",
      "NBA",
      "WNBA",
      "NHL"
    ];
  }

  const map = {};

  for (let i = 1; i < data.length; i++) {

    const league =
      sportsOddsString_(
        data[i][col.League]
      )
        .toUpperCase();

    if (
      league &&
      sportsOddsLeagueToSportKey_(league)
    ) {
      map[league] = true;
    }

  }

  return Object.keys(map);

}

/* =====================================================
   READ / MATCH CACHE
===================================================== */

function readSportsOddsRows_() {

  setupSportsOddsSystem();

  const sh =
    sportsOddsGetSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return sportsOddsString_(header);
    });

  return data
    .slice(1)
    .map(function(row) {

      const obj = {};

      headers.forEach(function(header, index) {
        obj[header] = row[index];
      });

      return obj;

    });

}

function isSportsOddsFresh_(row) {

  const d =
    new Date(row.LastUpdated || "");

  if (isNaN(d.getTime())) {
    return false;
  }

  const ageMs =
    Date.now() - d.getTime();

  return ageMs <=
    SPORTS_ODDS_CACHE_MINUTES * 60000;

}

function sportsOddsCachedEventMatchScore_(
  row,
  payload
) {

  payload =
    payload || {};

  const direct =
    sportsOddsTeamMatchScore_(
      row.HomeTeam,
      payload.homeTeam
    ) +
    sportsOddsTeamMatchScore_(
      row.AwayTeam,
      payload.awayTeam
    );

  const swapped =
    sportsOddsTeamMatchScore_(
      row.HomeTeam,
      payload.awayTeam
    ) +
    sportsOddsTeamMatchScore_(
      row.AwayTeam,
      payload.homeTeam
    );

  let score =
    Math.max(
      direct,
      swapped
    );

  const payloadDate =
    sportsOddsDateOnly_(
      payload.gameDateTime ||
      payload.commenceTime ||
      payload.date
    );

  const rowDate =
    sportsOddsDateOnly_(
      row.CommenceTime
    );

  if (
    payloadDate &&
    rowDate
  ) {

    if (payloadDate === rowDate) {
      score += 40;
    } else {
      score -= 40;
    }

  }

  return score;

}

function normalizeSportsOddsMarket_(market) {

  market =
    sportsOddsKey_(market || "moneyline");

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

function sportsOddsDateOnly_(value) {

  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0")
    ].join("-");
  }

  const raw =
    sportsOddsString_(
      value
    );

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  if (/^\d{8}$/.test(raw)) {
    return (
      raw.slice(0, 4) +
      "-" +
      raw.slice(4, 6) +
      "-" +
      raw.slice(6, 8)
    );
  }

  const parsed =
    new Date(raw);

  if (isNaN(parsed.getTime())) {
    return "";
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0")
  ].join("-");

}

function sportsOddsFindScoreForPayload_(payload) {

  payload =
    payload || {};

  const gameId =
    sportsOddsString_(
      payload.gameId ||
      payload.GameId
    );

  const espnEventId =
    sportsOddsString_(
      payload.espnEventId ||
      payload.ESPNEventId
    );

  if (
    !gameId &&
    !espnEventId
  ) {
    return null;
  }

  if (
    typeof readSportsScoresRows_ !== "function"
  ) {
    return null;
  }

  const scores =
    readSportsScoresRows_();

  for (let i = 0; i < scores.length; i++) {

    const score =
      scores[i];

    const rowGameId =
      sportsOddsString_(
        score.GameId
      );

    const rowEspnEventId =
      sportsOddsString_(
        score.ESPNEventId
      );

    if (
      gameId &&
      rowGameId === gameId
    ) {
      return score;
    }

    if (
      espnEventId &&
      rowEspnEventId === espnEventId
    ) {
      return score;
    }

  }

  return null;

}

function getSportsOddsForGame(payload) {

  payload =
    payload || {};

  const matchedScore =
    sportsOddsFindScoreForPayload_(
      payload
    );

  let league =
    sportsOddsString_(
      payload.league
    )
      .toUpperCase();

  let homeTeam =
    sportsOddsString_(
      payload.homeTeam
    );

  let awayTeam =
    sportsOddsString_(
      payload.awayTeam
    );

  let gameDateTime =
    sportsOddsString_(
      payload.gameDateTime ||
      payload.commenceTime ||
      payload.date
    );

  if (matchedScore) {

    league =
      sportsOddsString_(
        matchedScore.League ||
        league
      )
        .toUpperCase();

    homeTeam =
      sportsOddsString_(
        matchedScore.HomeTeam ||
        homeTeam
      );

    awayTeam =
      sportsOddsString_(
        matchedScore.AwayTeam ||
        awayTeam
      );

    gameDateTime =
      sportsOddsString_(
        matchedScore.GameDateTime ||
        gameDateTime
      );

  }

  const market =
    normalizeSportsOddsMarket_(
      payload.market ||
      payload.wagerMarket
    );

  if (
    !league ||
    !homeTeam ||
    !awayTeam
  ) {
    throw new Error(
      "league, homeTeam, and awayTeam are required unless gameId or espnEventId can resolve them"
    );
  }

  const refreshIfStale =
    String(payload.refreshIfStale || "")
      .toLowerCase() === "true";

  let rows =
    readSportsOddsRows_()
      .filter(function(row) {
        return (
          sportsOddsString_(row.League)
            .toUpperCase() === league
        );
      });

  function pickBestRow_() {

    let best = null;
    let bestScore = 0;

    rows.forEach(function(row) {

      const score =
        sportsOddsCachedEventMatchScore_(
          row,
          {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            gameDateTime: gameDateTime
          }
        );

      if (score > bestScore) {
        best = row;
        bestScore = score;
      }

    });

    return {
      best: best,
      bestScore: bestScore
    };

  }

  const hasFresh =
    rows.some(function(row) {
      return isSportsOddsFresh_(row);
    });

  let picked =
    pickBestRow_();

  if (
    refreshIfStale &&
    (
      !hasFresh ||
      !picked.best ||
      picked.bestScore < 120
    )
  ) {

    refreshSportsOddsForLeague(
      league
    );

    rows =
      readSportsOddsRows_()
        .filter(function(row) {
          return (
            sportsOddsString_(row.League)
              .toUpperCase() === league
          );
        });

    picked =
      pickBestRow_();

  }

  const best =
    picked.best;

  const bestScore =
    picked.bestScore;

  if (
    !best ||
    bestScore < 120
  ) {
    return {
      success: false,
      found: false,
      league: league,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      gameDateTime: gameDateTime,
      market: market,
      message: "No matching cached odds found"
    };
  }

  const result = {
    success: true,
    found: true,
    league: league,
    market: market,
    requestedHomeTeam: homeTeam,
    requestedAwayTeam: awayTeam,
    homeTeam: sportsOddsString_(best.HomeTeam),
    awayTeam: sportsOddsString_(best.AwayTeam),
    source: sportsOddsString_(best.Source),
    bookmaker: sportsOddsString_(best.Bookmaker),
    bookmakerKey: sportsOddsString_(best.BookmakerKey),
    oddsEventId: sportsOddsString_(best.OddsEventId),
    commenceTime: sportsOddsString_(best.CommenceTime),
    lastUpdated: sportsOddsString_(best.LastUpdated),
    matchScore: bestScore,

    homeOdds: sportsOddsNumber_(best.HomeOdds, ""),
    awayOdds: sportsOddsNumber_(best.AwayOdds, ""),
    drawOdds: sportsOddsNumber_(best.DrawOdds, ""),

    homeSpread: sportsOddsNumber_(best.HomeSpread, ""),
    homeSpreadOdds: sportsOddsNumber_(best.HomeSpreadOdds, ""),
    awaySpread: sportsOddsNumber_(best.AwaySpread, ""),
    awaySpreadOdds: sportsOddsNumber_(best.AwaySpreadOdds, ""),

    totalPoints: sportsOddsNumber_(best.TotalPoints, ""),
    overOdds: sportsOddsNumber_(best.OverOdds, ""),
    underOdds: sportsOddsNumber_(best.UnderOdds, "")
  };

  if (
    market === "moneyline" &&
    (
      result.homeOdds === "" ||
      result.awayOdds === ""
    )
  ) {
    result.success = false;
    result.found = false;
    result.message = "Moneyline odds not available for matched event";
  }

  if (
    market === "spread" &&
    (
      result.homeSpread === "" ||
      result.awaySpread === "" ||
      result.homeSpreadOdds === "" ||
      result.awaySpreadOdds === ""
    )
  ) {
    result.success = false;
    result.found = false;
    result.message = "Spread odds not available for matched event";
  }

  if (
    market === "total" &&
    (
      result.totalPoints === "" ||
      result.overOdds === "" ||
      result.underOdds === ""
    )
  ) {
    result.success = false;
    result.found = false;
    result.message = "Total odds not available for matched event";
  }

  return result;

}

/* =====================================================
   API WRAPPERS
===================================================== */


/* Removed older duplicate function apiRefreshSportsOdds_ during v11 cleanup. */


/* Removed older duplicate function apiGetSportsOdds_ during v11 cleanup. */

/* =====================================================
   TRIGGERS
===================================================== */

const SPORTS_ODDS_REFRESH_TRIGGER_FUNCTION =
  "runSportsOddsRefresh";

function runSportsOddsRefresh() {

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return {
      success: false,
      message: "Sports odds refresh already running"
    };
  }

  try {

    return refreshSportsOddsForLeagues({});

  } finally {

    lock.releaseLock();

  }

}


/* Removed older duplicate function installSportsOddsRefreshTrigger during v11 cleanup. */

function removeSportsOddsRefreshTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  let removed = 0;

  triggers.forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
      SPORTS_ODDS_REFRESH_TRIGGER_FUNCTION
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
   TEST HELPERS
===================================================== */

function testRefreshMlbOdds() {

  return refreshSportsOddsForLeague(
    "MLB"
  );

}

function testGetCachedMlbMoneylineOdds() {

  return getSportsOddsForGame({
    league: "MLB",
    homeTeam: "Chicago Cubs",
    awayTeam: "Toronto Blue Jays",
    market: "moneyline",
    refreshIfStale: "true"
  });

}

function testGetCachedMlbSpreadOdds() {

  return getSportsOddsForGame({
    league: "MLB",
    homeTeam: "Chicago Cubs",
    awayTeam: "Toronto Blue Jays",
    market: "spread",
    refreshIfStale: "true"
  });

}

function testGetCachedMlbTotalOdds() {

  return getSportsOddsForGame({
    league: "MLB",
    homeTeam: "Chicago Cubs",
    awayTeam: "Toronto Blue Jays",
    market: "total",
    refreshIfStale: "true"
  });

}

function testListOddsApiSports() {

  const params = {
    apiKey:
      getSportsOddsApiKey_(),
    all:
      "true"
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

  const url =
    SPORTS_ODDS_API_BASE +
    "/?" +
    query;

  const response =
    UrlFetchApp.fetch(
      url,
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
      "Sports list fetch failed. HTTP " +
      code +
      ": " +
      body.slice(0, 300)
    );
  }

  const sports =
    JSON.parse(
      body
    );

  return sports
    .filter(function(item) {

      const key =
        sportsOddsString_(
          item.key
        );

      return (
        key.indexOf("americanfootball_") === 0 ||
        key.indexOf("basketball_") === 0 ||
        key.indexOf("baseball_") === 0 ||
        key.indexOf("icehockey_") === 0 ||
        key.indexOf("soccer_") === 0
      );

    })
    .map(function(item) {
      return {
        key:
          item.key,
        group:
          item.group,
        title:
          item.title,
        active:
          item.active,
        has_outrights:
          item.has_outrights
      };
    });

}

function testRefreshMainOddsLeagues() {

  return refreshSportsOddsForLeagues({
    leagues:
      [
        "MLB",
        "NFL",
        "NBA",
        "WNBA",
        "NHL",
        "college-football",
        "mens-college-basketball",
        "womens-college-basketball",
        "fifa.world",
        "usa.1",
        "eng.1",
        "esp.1",
        "uefa.champions"
      ].join(",")
  });

}

/* =====================================================
   PATCH v3 - ODDS API USAGE LOGGING + RACING OUTRIGHTS
   Added for protected quota usage, MMA support, and
   separate all-driver racing odds rows.
===================================================== */

const SPORTS_ODDS_API_LOG_SHEET =
  "SportsOddsApiLog";

const SPORTS_ODDS_API_LOG_HEADERS = [
  "Timestamp",
  "Source",
  "League",
  "SportKey",
  "Endpoint",
  "Markets",
  "Regions",
  "EventsReturned",
  "BookmakersReturned",
  "MarketsReturned",
  "CostLast",
  "RequestsUsed",
  "RequestsRemaining",
  "UrlNoKey"
];

const SPORTS_RACING_ODDS_SHEET =
  "SportsRacingOdds";

const SPORTS_RACING_ODDS_HEADERS = [
  "OddsId",
  "League",
  "SportKey",
  "OddsEventId",
  "EventName",
  "CommenceTime",
  "DriverId",
  "DriverName",
  "Price",
  "BookmakerKey",
  "Bookmaker",
  "Market",
  "Source",
  "LastUpdated",
  "RawOutcomeJSON"
];

let SPORTS_ODDS_LAST_API_USAGE_ =
  null;


/* Removed older duplicate function sportsOddsGetApiLogSheet_ during v11 cleanup. */

function sportsOddsHeaderValue_(
  headers,
  name
) {

  name =
    String(name || "")
      .toLowerCase();

  const keys =
    Object.keys(headers || {});

  for (let i = 0; i < keys.length; i++) {

    const key =
      String(keys[i] || "");

    if (key.toLowerCase() === name) {
      return headers[key];
    }

  }

  return "";

}

function sportsOddsSanitizeApiUrl_(url) {

  return String(url || "")
    .replace(
      /([?&]apiKey=)[^&]+/i,
      "$1***"
    );

}

function sportsOddsUniqueCount_(value) {

  return String(value || "")
    .split(",")
    .map(function(item) {
      return String(item || "").trim();
    })
    .filter(Boolean)
    .filter(function(item, index, arr) {
      return arr.indexOf(item) === index;
    })
    .length;

}

function sportsOddsEstimateRequestCost_(
  markets,
  regions
) {

  const marketCount =
    sportsOddsUniqueCount_(markets) || 1;

  const regionCount =
    sportsOddsUniqueCount_(regions) || 1;

  return marketCount * regionCount;

}

function sportsOddsCountApiPayload_(payload) {

  const events =
    Array.isArray(payload)
      ? payload
      : [];

  const bookmakers = {};
  const markets = {};

  events.forEach(function(event) {

    const eventBookmakers =
      Array.isArray(event.bookmakers)
        ? event.bookmakers
        : [];

    eventBookmakers.forEach(function(bookmaker) {

      if (bookmaker && bookmaker.key) {
        bookmakers[bookmaker.key] = true;
      }

      const bookmakerMarkets =
        Array.isArray(bookmaker.markets)
          ? bookmaker.markets
          : [];

      bookmakerMarkets.forEach(function(market) {

        if (market && market.key) {
          markets[market.key] = true;
        }

      });

    });

  });

  return {
    eventsReturned: events.length,
    bookmakersReturned: Object.keys(bookmakers).length,
    marketsReturned: Object.keys(markets).length
  };

}

/* Removed earlier duplicate function sportsOddsLogApiCall_ during production cleanup; final definition retained later in file. */


function fetchSportsOddsApiJsonWithLog_(
  url,
  meta
) {

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: "get",
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  const body =
    response.getContentText();

  let parsed = null;

  try {

    parsed =
      body
        ? JSON.parse(body)
        : null;

  } catch (err) {

    parsed = {
      parseError: true,
      raw: body
    };

  }

  const usage =
    sportsOddsLogApiCall_(
      meta,
      url,
      response,
      parsed
    );

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      "Odds API failed. HTTP " +
      code +
      ": " +
      body.slice(0, 300)
    );
  }

  return {
    payload: parsed,
    usage: usage
  };

}

function sportsOddsIsRacingLeague_(league) {

  const sportKey =
    sportsOddsLeagueToSportKey_(
      league
    );

  return (
    String(sportKey || "")
      .indexOf("motorsport_") === 0
  );

}

function sportsOddsGetMarketsForLeague_(league) {

  if (
    sportsOddsIsRacingLeague_(
      league
    )
  ) {
    return "outrights";
  }

  return SPORTS_ODDS_MARKETS;

}

function sportsOddsGetRegionsForLeague_(league) {

  return SPORTS_ODDS_REGIONS;

}

function buildSportsOddsApiUrl_(
  sportKey,
  markets,
  regions
) {

  const params = {
    apiKey:
      getSportsOddsApiKey_(),
    regions:
      regions || SPORTS_ODDS_REGIONS,
    markets:
      markets || SPORTS_ODDS_MARKETS,
    oddsFormat:
      SPORTS_ODDS_FORMAT,
    dateFormat:
      SPORTS_ODDS_DATE_FORMAT
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

  return (
    SPORTS_ODDS_API_BASE +
    "/" +
    encodeURIComponent(sportKey) +
    "/odds?" +
    query
  );

}

function fetchSportsOddsEventsForLeague_(league) {

  const sportKey =
    sportsOddsLeagueToSportKey_(
      league
    );

  if (!sportKey) {
    throw new Error(
      "Unsupported odds league: " + league
    );
  }

  const markets =
    sportsOddsGetMarketsForLeague_(
      league
    );

  const regions =
    sportsOddsGetRegionsForLeague_(
      league
    );

  const url =
    buildSportsOddsApiUrl_(
      sportKey,
      markets,
      regions
    );

  const fetched =
    fetchSportsOddsApiJsonWithLog_(
      url,
      {
        source:
          "fetchSportsOddsEventsForLeague_",
        league:
          sportsOddsString_(league)
            .toUpperCase(),
        sportKey:
          sportKey,
        endpoint:
          "odds",
        markets:
          markets,
        regions:
          regions
      }
    );

  const parsed =
    fetched.payload;

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Odds API returned unexpected payload"
    );
  }

  return {
    success: true,
    league:
      sportsOddsString_(league)
        .toUpperCase(),
    sportKey: sportKey,
    events: parsed,
    apiUsage:
      fetched.usage || null
  };

}


/* Removed older duplicate function sportsRacingOddsGetSheet_ during v11 cleanup. */


/* Removed older duplicate function setupSportsRacingOddsSystem during v11 cleanup. */

function sportsRacingDriverKey_(name) {

  return sportsOddsKey_(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}

function normalizeSportsRacingOddsRows_(
  event,
  league,
  sportKey
) {

  const rows = [];

  const eventName =
    sportsOddsString_(
      event.sport_title ||
      event.home_team ||
      event.away_team ||
      event.id
    );

  const bookmakers =
    Array.isArray(event.bookmakers)
      ? event.bookmakers
      : [];

  bookmakers.forEach(function(bookmaker) {

    const markets =
      Array.isArray(bookmaker.markets)
        ? bookmaker.markets
        : [];

    markets.forEach(function(market) {

      if (
        sportsOddsKey_(market.key) !==
        "outrights"
      ) {
        return;
      }

      const outcomes =
        Array.isArray(market.outcomes)
          ? market.outcomes
          : [];

      outcomes.forEach(function(outcome) {

        const driverName =
          sportsOddsString_(
            outcome.name
          );

        if (!driverName) {
          return;
        }

        const driverId =
          sportsRacingDriverKey_(
            driverName
          );

        rows.push({
          OddsId:
            [
              sportsOddsKey_(league),
              sportsOddsString_(event.id),
              sportsOddsString_(bookmaker.key),
              driverId
            ].join("|"),
          League:
            sportsOddsString_(league)
              .toUpperCase(),
          SportKey:
            sportKey,
          OddsEventId:
            sportsOddsString_(event.id),
          EventName:
            eventName,
          CommenceTime:
            sportsOddsString_(
              event.commence_time
            ),
          DriverId:
            driverId,
          DriverName:
            driverName,
          Price:
            sportsOddsRound_(
              outcome.price
            ),
          BookmakerKey:
            sportsOddsString_(
              bookmaker.key
            ),
          Bookmaker:
            sportsOddsString_(
              bookmaker.title ||
              bookmaker.key
            ),
          Market:
            "outrights",
          Source:
            "real-odds:" +
            sportsOddsString_(
              bookmaker.key || bookmaker.title
            ),
          LastUpdated:
            sportsOddsNow_(),
          RawOutcomeJSON:
            JSON.stringify(outcome || {})
        });

      });

    });

  });

  return rows;

}


/* Removed older duplicate function upsertSportsRacingOddsRows_ during v11 cleanup. */

function refreshSportsRacingOddsForLeague(league) {

  const fetched =
    fetchSportsOddsEventsForLeague_(
      league
    );

  const rows = [];

  fetched.events.forEach(function(event) {

    normalizeSportsRacingOddsRows_(
      event,
      fetched.league,
      fetched.sportKey
    ).forEach(function(row) {
      rows.push(row);
    });

  });

  const writeResult =
    upsertSportsRacingOddsRows_(
      rows
    );

  return {
    success: true,
    racing: true,
    league:
      fetched.league,
    sportKey:
      fetched.sportKey,
    fetched:
      fetched.events.length,
    usable:
      rows.length,
    inserted:
      writeResult.inserted,
    updated:
      writeResult.updated,
    apiUsage:
      fetched.apiUsage || null
  };

}

function refreshSportsOddsForLeague(league) {

  if (
    sportsOddsIsRacingLeague_(
      league
    )
  ) {
    return refreshSportsRacingOddsForLeague(
      league
    );
  }

  const fetched =
    fetchSportsOddsEventsForLeague_(
      league
    );

  const rows =
    fetched.events
      .map(function(event) {
        return normalizeSportsOddsEvent_(
          event,
          fetched.league,
          fetched.sportKey
        );
      })
      .filter(Boolean);

  const writeResult =
    upsertSportsOddsRows_(
      rows
    );

  return {
    success: true,
    league:
      fetched.league,
    sportKey:
      fetched.sportKey,
    fetched:
      fetched.events.length,
    usable:
      rows.length,
    inserted:
      writeResult.inserted,
    updated:
      writeResult.updated,
    apiUsage:
      fetched.apiUsage || null
  };

}


/* Removed older duplicate function readSportsRacingOddsRows_ during v11 cleanup. */

function apiGetSportsRacingOdds_(params) {

  params =
    params || {};

  const league =
    sportsOddsString_(
      params.league
    )
      .toUpperCase();

  const eventId =
    sportsOddsString_(
      params.oddsEventId ||
      params.eventId
    );

  const rows =
    readSportsRacingOddsRows_()
      .filter(function(row) {

        if (
          league &&
          sportsOddsString_(row.League)
            .toUpperCase() !== league
        ) {
          return false;
        }

        if (
          eventId &&
          sportsOddsString_(row.OddsEventId) !== eventId
        ) {
          return false;
        }

        return true;

      })
      .sort(function(a, b) {
        return Number(a.Price || 999999) -
          Number(b.Price || 999999);
      });

  return {
    success: true,
    count: rows.length,
    odds: rows,
    timestamp: new Date()
  };

}

function apiRefreshSportsOdds_(params) {

  params =
    params || {};

  if (typeof assertSportsAdmin_ === "function") {
    assertSportsAdmin_(params);
  } else {
    throw new Error(
      "Admin refresh is required for paid odds pulls"
    );
  }

  return refreshSportsOddsForLeagues({
    leagues:
      params.leagues ||
      params.league ||
      ""
  });

}

function apiGetSportsOdds_(params) {

  params =
    params || {};

  return getSportsOddsForGame({
    gameId:
      params.gameId ||
      params.GameId,

    espnEventId:
      params.espnEventId ||
      params.ESPNEventId,

    league:
      params.league,

    homeTeam:
      params.homeTeam,

    awayTeam:
      params.awayTeam,

    gameDateTime:
      params.gameDateTime ||
      params.commenceTime ||
      params.date,

    market:
      params.market ||
      params.wagerMarket,

    refreshIfStale:
      "false"
  });

}

function installSportsOddsRefreshTrigger() {

  const removed =
    removeSportsOddsRefreshTriggers();

  return {
    success: true,
    installed: false,
    removed: removed.removed || 0,
    message:
      "Old every-30-minute paid odds trigger was not installed. Use installSportsOddsHybridDailyTrigger instead."
  };

}


/* Removed older duplicate function setupSportsOddsSystem during v11 cleanup. */

function testListOddsApiMotorsportsAndMma() {

  const params = {
    apiKey:
      getSportsOddsApiKey_(),
    all:
      "true"
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

  const url =
    SPORTS_ODDS_API_BASE +
    "/?" +
    query;

  const fetched =
    fetchSportsOddsApiJsonWithLog_(
      url,
      {
        source:
          "testListOddsApiMotorsportsAndMma",
        league:
          "",
        sportKey:
          "",
        endpoint:
          "sports",
        markets:
          "",
        regions:
          ""
      }
    );

  const sports =
    Array.isArray(fetched.payload)
      ? fetched.payload
      : [];

  return sports
    .filter(function(item) {
      const key =
        sportsOddsString_(
          item.key
        );

      const group =
        sportsOddsKey_(
          item.group
        );

      return (
        key.indexOf("motorsport_") === 0 ||
        key.indexOf("mma_") === 0 ||
        group.indexOf("motor") >= 0 ||
        group.indexOf("mma") >= 0
      );
    })
    .map(function(item) {
      return {
        key: item.key,
        group: item.group,
        title: item.title,
        active: item.active,
        has_outrights: item.has_outrights
      };
    });

}


/* =====================================================
   PATCH v4 - SAFE SHEET SETUP OVERRIDES
   Fixes Apps Script Spreadsheet service timeout during
   racing odds setup by retrying transient spreadsheet
   calls and by not forcing racing setup from normal odds
   setup.
===================================================== */

function sportsOddsSpreadsheetRetry_(label, fn) {

  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt++) {

    try {
      return fn();
    } catch (err) {

      lastError = err;

      const message =
        err && err.message
          ? err.message
          : String(err);

      const retryable =
        message.indexOf("Service Spreadsheets timed out") !== -1 ||
        message.indexOf("Service Spreadsheets failed") !== -1 ||
        message.indexOf("Service Spreadsheets") !== -1;

      if (!retryable || attempt === 4) {
        throw err;
      }

      Utilities.sleep(
        attempt * 1500
      );

    }

  }

  throw lastError;

}

function sportsOddsEnsureHeaderSheetSafe_(
  sheetName,
  requiredHeaders
) {

  const lock =
    LockService.getScriptLock();

  const locked =
    lock.tryLock(10000);

  if (!locked) {
    throw new Error(
      "Could not lock script while setting up sheet: " +
      sheetName
    );
  }

  try {

    return sportsOddsSpreadsheetRetry_(
      "setup " + sheetName,
      function() {

        const ss =
          SpreadsheetApp.getActive();

        let sh =
          ss.getSheetByName(
            sheetName
          );

        if (!sh) {
          sh =
            ss.insertSheet(
              sheetName
            );

          SpreadsheetApp.flush();
        }

        const lastRow =
          sh.getLastRow();

        const lastColumn =
          sh.getLastColumn();

        let existingHeaders = [];

        if (lastRow >= 1 && lastColumn >= 1) {
          existingHeaders =
            sh
              .getRange(
                1,
                1,
                1,
                lastColumn
              )
              .getValues()[0]
              .map(function(header) {
                return sportsOddsString_(header);
              });
        }

        const hasAnyHeader =
          existingHeaders.some(function(header) {
            return !!header;
          });

        if (!hasAnyHeader) {

          sh
            .getRange(
              1,
              1,
              1,
              requiredHeaders.length
            )
            .setValues([
              requiredHeaders
            ]);

          try {
            sh.setFrozenRows(1);
          } catch (freezeErr) {
            // Non-critical. Avoid failing setup over formatting.
          }

          SpreadsheetApp.flush();

          return {
            sheet: sh,
            added: requiredHeaders.slice()
          };

        }

        const missing =
          requiredHeaders.filter(function(header) {
            return existingHeaders.indexOf(header) === -1;
          });

        if (missing.length) {
          sh
            .getRange(
              1,
              sh.getLastColumn() + 1,
              1,
              missing.length
            )
            .setValues([
              missing
            ]);

          SpreadsheetApp.flush();
        }

        try {
          sh.setFrozenRows(1);
        } catch (freezeErr2) {
          // Non-critical. Avoid failing setup over formatting.
        }

        return {
          sheet: sh,
          added: missing
        };

      }
    );

  } finally {
    lock.releaseLock();
  }

}

/* Removed earlier duplicate function sportsOddsGetApiLogSheet_ during production cleanup; final definition retained later in file. */


function sportsRacingOddsGetSheet_() {

  return sportsOddsEnsureHeaderSheetSafe_(
    SPORTS_RACING_ODDS_SHEET,
    SPORTS_RACING_ODDS_HEADERS
  ).sheet;

}

function setupSportsRacingOddsSystem() {

  const result =
    sportsOddsEnsureHeaderSheetSafe_(
      SPORTS_RACING_ODDS_SHEET,
      SPORTS_RACING_ODDS_HEADERS
    );

  return {
    success: true,
    sheet: SPORTS_RACING_ODDS_SHEET,
    added: result.added || [],
    message:
      "Sports racing odds sheet setup complete"
  };

}

/* Removed earlier duplicate function setupSportsOddsSystem during production cleanup; final definition retained later in file. */


/* Removed earlier duplicate function setupAllSportsOddsSheets during production cleanup; final definition retained later in file. */


function upsertSportsRacingOddsRows_(rows) {

  setupSportsRacingOddsSystem();

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  if (!rows.length) {
    return {
      inserted: 0,
      updated: 0
    };
  }

  const sh =
    sportsRacingOddsGetSheet_();

  const data =
    sportsOddsSpreadsheetRetry_(
      "read SportsRacingOdds",
      function() {
        return sh.getDataRange().getValues();
      }
    );

  const headers =
    data[0].map(function(header) {
      return sportsOddsString_(header);
    });

  const col =
    sportsOddsHeaderMap_(
      headers
    );

  const existing = {};

  for (let i = 1; i < data.length; i++) {

    const oddsId =
      sportsOddsString_(
        data[i][col.OddsId]
      );

    if (oddsId) {
      existing[oddsId] = i + 1;
    }

  }

  let inserted = 0;
  let updated = 0;
  const rowsToAppend = [];

  rows.forEach(function(item) {

    const row =
      headers.map(function(header) {
        return item[header] !== undefined
          ? item[header]
          : "";
      });

    if (existing[item.OddsId]) {

      sportsOddsSpreadsheetRetry_(
        "update racing odds row",
        function() {
          sh
            .getRange(
              existing[item.OddsId],
              1,
              1,
              headers.length
            )
            .setValues([
              row
            ]);
        }
      );

      updated++;

    } else {
      rowsToAppend.push(row);
      inserted++;
    }

  });

  if (rowsToAppend.length) {
    sportsOddsSpreadsheetRetry_(
      "append racing odds rows",
      function() {
        sh
          .getRange(
            sh.getLastRow() + 1,
            1,
            rowsToAppend.length,
            headers.length
          )
          .setValues(
            rowsToAppend
          );
      }
    );
  }

  SpreadsheetApp.flush();

  return {
    inserted: inserted,
    updated: updated
  };

}

function readSportsRacingOddsRows_() {

  setupSportsRacingOddsSystem();

  const sh =
    sportsRacingOddsGetSheet_();

  const data =
    sportsOddsSpreadsheetRetry_(
      "read SportsRacingOdds rows",
      function() {
        return sh.getDataRange().getValues();
      }
    );

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(function(header) {
      return sportsOddsString_(header);
    });

  return data
    .slice(1)
    .map(function(row) {

      const obj = {};

      headers.forEach(function(header, index) {
        obj[header] = row[index];
      });

      return obj;

    })
    .filter(function(row) {
      return !!row.OddsId;
    });

}

/* =====================================================
   PATCH v13 ODDS LOG OVERRIDES
   Creates both SportsOddsApiLog and OddsApiLog because the
   admin sheet/UI has used both names during development.
===================================================== */

function sportsOddsGetApiLogSheet_() {
  return sportsOddsEnsureHeaderSheetSafe_(
    SPORTS_ODDS_API_LOG_SHEET,
    SPORTS_ODDS_API_LOG_HEADERS
  ).sheet;
}

function sportsOddsGetApiLogAliasSheet_() {
  return sportsOddsEnsureHeaderSheetSafe_(
    "OddsApiLog",
    SPORTS_ODDS_API_LOG_HEADERS
  ).sheet;
}

function sportsOddsAppendApiLogRow_(row) {
  sportsOddsGetApiLogSheet_().appendRow(row);
  sportsOddsGetApiLogAliasSheet_().appendRow(row);
}

function sportsOddsLogApiCall_(meta, url, response, payload) {
  meta = meta || {};
  const headers = response.getHeaders();
  const counts = sportsOddsCountApiPayload_(payload);

  const usage = {
    costLast: sportsOddsHeaderValue_(headers, "x-requests-last"),
    requestsUsed: sportsOddsHeaderValue_(headers, "x-requests-used"),
    requestsRemaining: sportsOddsHeaderValue_(headers, "x-requests-remaining")
  };

  SPORTS_ODDS_LAST_API_USAGE_ = usage;

  const row = [
    new Date(),
    meta.source || "",
    meta.league || "",
    meta.sportKey || "",
    meta.endpoint || "",
    meta.markets || "",
    meta.regions || "",
    counts.eventsReturned,
    counts.bookmakersReturned,
    counts.marketsReturned,
    usage.costLast,
    usage.requestsUsed,
    usage.requestsRemaining,
    sportsOddsSanitizeApiUrl_(url)
  ];

  sportsOddsAppendApiLogRow_(row);
  return usage;
}

function setupSportsOddsSystem() {
  const odds = sportsOddsEnsureHeaderSheetSafe_(SPORTS_ODDS_SHEET, SPORTS_ODDS_HEADERS);
  const apiLog = sportsOddsEnsureHeaderSheetSafe_(SPORTS_ODDS_API_LOG_SHEET, SPORTS_ODDS_API_LOG_HEADERS);
  const aliasLog = sportsOddsEnsureHeaderSheetSafe_("OddsApiLog", SPORTS_ODDS_API_LOG_HEADERS);
  return {
    success: true,
    sheet: SPORTS_ODDS_SHEET,
    added: odds.added || [],
    apiLogSheet: SPORTS_ODDS_API_LOG_SHEET,
    apiLogAdded: apiLog.added || [],
    aliasLogSheet: "OddsApiLog",
    aliasLogAdded: aliasLog.added || [],
    racingSheet: SPORTS_RACING_ODDS_SHEET,
    message: "SportsOdds setup complete. API log sheets are ready."
  };
}

/* Removed earlier duplicate function setupAllSportsOddsSheets during production cleanup; final definition retained later in file. */



/* =====================================================
   PRODUCTION CLEANUP v14 - SPORTS ODDS SETUP
   Normal sports setup no longer creates racing odds sheets.
   Racing odds live with the separate Racing Score Engine.
===================================================== */

function setupAllSportsOddsSheets() {
  return {
    success: true,
    odds: setupSportsOddsSystem(),
    message: "Sports odds sheets and API logs are ready. Racing odds setup is intentionally not run from Sports Scores Engine."
  };
}
