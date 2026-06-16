/* =====================================================
   SPORTS SCOREBOARD PARSER ENGINE
   Phase 1: parse JSON/text scoreboards into ResultSuggestions

   This does NOT auto-apply winners.
   It writes pending suggestions only.
===================================================== */

const SPORTS_SCOREBOARD_MIN_CONFIDENCE =
  75;

/* =====================================================
   BASIC HELPERS
===================================================== */

function sportsNormalize_(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

function sportsValue_(obj, keys) {

  if (!obj || !keys) {
    return "";
  }

  for (let i = 0; i < keys.length; i++) {

    const key =
      keys[i];

    if (
      obj[key] !== undefined &&
      obj[key] !== null &&
      obj[key] !== ""
    ) {

      return obj[key];

    }

  }

  return "";

}

function sportsNumber_(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const text =
    String(value)
      .replace(/[^\d.-]/g, "")
      .trim();

  if (!text) {
    return null;
  }

  const num =
    Number(text);

  return isNaN(num)
    ? null
    : num;

}

function sportsText_(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";

}

/* =====================================================
   TEAM / STATUS EXTRACTION
===================================================== */

function sportsPickTeamName_(value) {

  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value.team) {

    const nested =
      sportsPickTeamName_(
        value.team
      );

    if (nested) {
      return nested;
    }

  }

  const display =
    sportsValue_(
      value,
      [
        "displayName",
        "shortDisplayName",
        "fullName",
        "name",
        "teamName",
        "market",
        "location",
        "abbreviation"
      ]
    );

  if (display) {
    return String(display);
  }

  return "";

}

function sportsPickTeamAbbr_(value) {

  if (!value || typeof value === "string") {
    return "";
  }

  if (value.team) {

    const nested =
      sportsPickTeamAbbr_(
        value.team
      );

    if (nested) {
      return nested;
    }

  }

  return String(
    sportsValue_(
      value,
      [
        "abbreviation",
        "abbr",
        "shortName",
        "code"
      ]
    ) || ""
  );

}

function sportsPickScore_(value) {

  if (!value) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {

    return sportsNumber_(value);

  }

  return sportsNumber_(
    sportsValue_(
      value,
      [
        "score",
        "points",
        "runs",
        "goals",
        "total",
        "value"
      ]
    )
  );

}

function sportsStatusText_(obj) {

  if (!obj) {
    return "";
  }

  const parts = [];

  const direct =
    sportsValue_(
      obj,
      [
        "status",
        "gameStatus",
        "state",
        "statusText",
        "period",
        "clock"
      ]
    );

  if (direct && typeof direct !== "object") {
    parts.push(String(direct));
  }

  if (
    obj.status &&
    typeof obj.status === "object"
  ) {

    const statusObj =
      obj.status;

    [
      "name",
      "type",
      "description",
      "detail",
      "shortDetail",
      "state"
    ].forEach(key => {

      if (
        statusObj[key] &&
        typeof statusObj[key] !== "object"
      ) {
        parts.push(String(statusObj[key]));
      }

    });

    if (
      statusObj.type &&
      typeof statusObj.type === "object"
    ) {

      [
        "name",
        "description",
        "detail",
        "shortDetail",
        "state"
      ].forEach(key => {

        if (
          statusObj.type[key] &&
          typeof statusObj.type[key] !== "object"
        ) {
          parts.push(String(statusObj.type[key]));
        }

      });

    }

  }

  return parts.join(" ");

}

function sportsIsFinalStatus_(obj) {

  if (!obj) {
    return false;
  }

  if (
    obj.completed === true ||
    obj.isComplete === true ||
    obj.final === true
  ) {
    return true;
  }

  if (
    obj.status &&
    typeof obj.status === "object"
  ) {

    if (
      obj.status.completed === true ||
      obj.status.final === true
    ) {
      return true;
    }

    if (
      obj.status.type &&
      typeof obj.status.type === "object" &&
      obj.status.type.completed === true
    ) {
      return true;
    }

  }

  const status =
    sportsNormalize_(
      sportsStatusText_(obj)
    );

  return (
    status.indexOf("final") !== -1 ||
    status.indexOf("complete") !== -1 ||
    status.indexOf("completed") !== -1 ||
    status.indexOf("closed") !== -1 ||
    status.indexOf("post") !== -1
  );

}

/* =====================================================
   GAME NORMALIZATION
===================================================== */

function sportsResolveWinner_(game) {

  if (!game) {
    return game;
  }

  if (game.explicitWinnerSide === "home") {

    game.winnerSide =
      "home";

    game.winnerName =
      game.homeName;

    game.loserName =
      game.awayName;

    return game;

  }

  if (game.explicitWinnerSide === "away") {

    game.winnerSide =
      "away";

    game.winnerName =
      game.awayName;

    game.loserName =
      game.homeName;

    return game;

  }

  if (
    !game.final ||
    game.homeScore === null ||
    game.awayScore === null ||
    game.homeScore === game.awayScore
  ) {

    game.winnerSide =
      "";

    game.winnerName =
      "";

    game.loserName =
      "";

    return game;

  }

  if (game.homeScore > game.awayScore) {

    game.winnerSide =
      "home";

    game.winnerName =
      game.homeName;

    game.loserName =
      game.awayName;

  } else {

    game.winnerSide =
      "away";

    game.winnerName =
      game.awayName;

    game.loserName =
      game.homeName;

  }

  return game;

}

function sportsCleanGame_(game) {

  if (!game) {
    return null;
  }

  game.homeName =
    String(game.homeName || "").trim();

  game.awayName =
    String(game.awayName || "").trim();

  game.homeAbbr =
    String(game.homeAbbr || "").trim();

  game.awayAbbr =
    String(game.awayAbbr || "").trim();

  game.status =
    String(game.status || "").trim();

  game.final =
    Boolean(game.final);

  if (
    !game.homeName ||
    !game.awayName
  ) {
    return null;
  }

  return sportsResolveWinner_(
    game
  );

}

function sportsBuildGameFromCompetitors_(
  container,
  fallbackStatusObj
) {

  if (
    !container ||
    !Array.isArray(container.competitors) ||
    container.competitors.length < 2
  ) {
    return null;
  }

  const competitors =
    container.competitors;

  let home =
    competitors.find(item =>
      sportsNormalize_(item.homeAway) === "home"
    );

  let away =
    competitors.find(item =>
      sportsNormalize_(item.homeAway) === "away"
    );

  if (!home || !away) {

    home =
      competitors[0];

    away =
      competitors[1];

  }

  const homeScore =
    sportsPickScore_(home);

  const awayScore =
    sportsPickScore_(away);

  let explicitWinnerSide = "";

  if (home.winner === true) {
    explicitWinnerSide = "home";
  }

  if (away.winner === true) {
    explicitWinnerSide = "away";
  }

  const statusObj =
    container.status
      ? container
      : fallbackStatusObj || container;

  const game =
    {
      sourceFormat:
        "competitors",

      homeName:
        sportsPickTeamName_(home),

      homeAbbr:
        sportsPickTeamAbbr_(home),

      awayName:
        sportsPickTeamName_(away),

      awayAbbr:
        sportsPickTeamAbbr_(away),

      homeScore:
        homeScore,

      awayScore:
        awayScore,

      status:
        sportsStatusText_(statusObj),

      final:
        sportsIsFinalStatus_(statusObj) ||
        explicitWinnerSide !== "",

      explicitWinnerSide:
        explicitWinnerSide
    };

  return sportsCleanGame_(
    game
  );

}

function sportsBuildGameFromObject_(obj) {

  if (!obj || typeof obj !== "object") {
    return null;
  }

  let homeRaw =
    sportsValue_(
      obj,
      [
        "homeTeam",
        "home_team",
        "home",
        "teamHome"
      ]
    );

  let awayRaw =
    sportsValue_(
      obj,
      [
        "awayTeam",
        "away_team",
        "away",
        "visitorTeam",
        "visitor",
        "teamAway"
      ]
    );

  if (!homeRaw && obj.teams) {

    homeRaw =
      sportsValue_(
        obj.teams,
        [
          "home",
          "homeTeam",
          "teamHome"
        ]
      );

  }

  if (!awayRaw && obj.teams) {

    awayRaw =
      sportsValue_(
        obj.teams,
        [
          "away",
          "awayTeam",
          "visitor",
          "visitorTeam",
          "teamAway"
        ]
      );

  }

  const homeName =
    sportsPickTeamName_(homeRaw);

  const awayName =
    sportsPickTeamName_(awayRaw);

  if (!homeName || !awayName) {
    return null;
  }

  let homeScore =
    sportsNumber_(
      sportsValue_(
        obj,
        [
          "homeScore",
          "home_score",
          "scoreHome",
          "homePoints",
          "home_points"
        ]
      )
    );

  let awayScore =
    sportsNumber_(
      sportsValue_(
        obj,
        [
          "awayScore",
          "away_score",
          "visitorScore",
          "scoreAway",
          "awayPoints",
          "away_points"
        ]
      )
    );

  if (homeScore === null) {
    homeScore =
      sportsPickScore_(homeRaw);
  }

  if (awayScore === null) {
    awayScore =
      sportsPickScore_(awayRaw);
  }

  const game =
    {
      sourceFormat:
        "generic",

      homeName:
        homeName,

      homeAbbr:
        sportsPickTeamAbbr_(homeRaw),

      awayName:
        awayName,

      awayAbbr:
        sportsPickTeamAbbr_(awayRaw),

      homeScore:
        homeScore,

      awayScore:
        awayScore,

      status:
        sportsStatusText_(obj),

      final:
        sportsIsFinalStatus_(obj),

      explicitWinnerSide:
        ""
    };

  return sportsCleanGame_(
    game
  );

}

/* =====================================================
   SCOREBOARD EXTRACTION
===================================================== */

function sportsExtractGamesFromJson_(json) {

  const games = [];
  const seen = {};

  function addGame(game) {

    game =
      sportsCleanGame_(
        game
      );

    if (!game) {
      return;
    }

    const key =
      sportsNormalize_(
        game.homeName +
        "__" +
        game.awayName +
        "__" +
        game.homeScore +
        "__" +
        game.awayScore +
        "__" +
        game.status
      );

    if (seen[key]) {
      return;
    }

    seen[key] =
      true;

    games.push(game);

  }

  function walk(node, depth) {

    if (
      !node ||
      depth > 8
    ) {
      return;
    }

    if (Array.isArray(node)) {

      node.forEach(item =>
        walk(item, depth + 1)
      );

      return;

    }

    if (typeof node !== "object") {
      return;
    }

    if (
      Array.isArray(node.competitors) &&
      node.competitors.length >= 2
    ) {

      addGame(
        sportsBuildGameFromCompetitors_(
          node,
          node
        )
      );

    }

    if (
      Array.isArray(node.competitions)
    ) {

      node.competitions.forEach(competition => {

        addGame(
          sportsBuildGameFromCompetitors_(
            competition,
            node
          )
        );

      });

    }

    addGame(
      sportsBuildGameFromObject_(
        node
      )
    );

    Object.keys(node).forEach(key => {

      const value =
        node[key];

      if (
        value &&
        typeof value === "object"
      ) {

        walk(
          value,
          depth + 1
        );

      }

    });

  }

  walk(json, 0);

  return games;

}

function sportsExtractGamesFromText_(text) {

  const games = [];

  const lines =
    String(text || "")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

  lines.forEach(line => {

    const normalized =
      sportsNormalize_(line);

    if (
      normalized.indexOf("final") === -1 &&
      normalized.indexOf("completed") === -1
    ) {
      return;
    }

    let match =
      line.match(
        /^(?:final\s*:?\s*)?(.+?)\s+(\d+)\s*(?:-|–|—|,|@|vs\.?|versus)\s*(.+?)\s+(\d+)(?:\s|$)/i
      );

    if (!match) {

      match =
        line.match(
          /^(.+?)\s+(\d+)\s+(.+?)\s+(\d+)\s+(?:final|completed)$/i
        );

    }

    if (!match) {
      return;
    }

    const awayName =
      match[1].trim();

    const awayScore =
      sportsNumber_(match[2]);

    const homeName =
      match[3].trim();

    const homeScore =
      sportsNumber_(match[4]);

    const game =
      sportsCleanGame_({
        sourceFormat:
          "text",

        homeName:
          homeName,

        awayName:
          awayName,

        homeScore:
          homeScore,

        awayScore:
          awayScore,

        status:
          "Final",

        final:
          true,

        explicitWinnerSide:
          ""
      });

    if (game) {
      games.push(game);
    }

  });

  return games;

}

function sportsParseImportedScoreboard_(raw) {

  raw =
    String(raw || "").trim();

  if (!raw) {
    return [];
  }

  let parsed = null;

  try {

    parsed =
      JSON.parse(raw);

  } catch (err) {

    parsed =
      null;

  }

  if (parsed) {

    return sportsExtractGamesFromJson_(
      parsed
    );

  }

  return sportsExtractGamesFromText_(
    raw
  );

}

/* =====================================================
   MATCHING TO RESULT SUGGESTIONS
===================================================== */

function sportsTokenOverlapScore_(
  teamName,
  teamAbbr,
  nominee
) {

  const team =
    sportsNormalize_(
      teamName
    );

  const abbr =
    sportsNormalize_(
      teamAbbr
    );

  const nomineeText =
    sportsNormalize_(
      nominee.nomineeName +
      " " +
      nominee.nomineeId +
      " " +
      nominee.nomineeSearch
    );

  if (!team || !nomineeText) {
    return 0;
  }

  if (
    nomineeText === team ||
    nomineeText.indexOf(team) !== -1 ||
    team.indexOf(nomineeText) !== -1
  ) {
    return 100;
  }

  const teamTokens =
    team
      .split(" ")
      .filter(token =>
        token.length > 2
      );

  const nomineeTokens =
    nomineeText
      .split(" ")
      .filter(token =>
        token.length > 2
      );

  const mascot =
    teamTokens.length
      ? teamTokens[teamTokens.length - 1]
      : "";

  if (
    mascot &&
    nomineeTokens.indexOf(mascot) !== -1
  ) {
    return 92;
  }

  let overlap = 0;

  teamTokens.forEach(token => {

    if (nomineeTokens.indexOf(token) !== -1) {
      overlap++;
    }

  });

  if (
    teamTokens.length &&
    overlap === teamTokens.length
  ) {
    return 90;
  }

  if (overlap >= 2) {
    return 85;
  }

  if (overlap === 1) {
    return 70;
  }

  if (
    abbr &&
    abbr.length >= 2 &&
    nomineeText.split(" ").indexOf(abbr) !== -1
  ) {
    return 72;
  }

  return 0;

}

function sportsFindBestNomineeMatch_(
  category,
  teamName,
  teamAbbr
) {

  let best = null;

  category.nominees.forEach(nominee => {

    const score =
      sportsTokenOverlapScore_(
        teamName,
        teamAbbr,
        nominee
      );

    if (
      score > 0 &&
      (
        !best ||
        score > best.score
      )
    ) {

      best = {
        nominee:
          nominee,

        score:
          score
      };

    }

  });

  return best;

}

function sportsClearPendingSuggestionsForImport_(
  gameId,
  importId
) {

  const sheet =
    ensureResultSuggestionsSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getResultSuggestionsColumnMap_(
      headers
    );

  for (let i = data.length - 1; i >= 1; i--) {

    const row =
      data[i];

    const rowGameId =
      normalizeInternetValue_(
        row[col.gameId]
      );

    const rowImportId =
      normalizeInternetValue_(
        row[col.importId]
      );

    const rowStatus =
      normalizeInternetValue_(
        row[col.status]
      ).toLowerCase();

    const rowNotes =
      normalizeInternetValue_(
        row[col.notes]
      ).toLowerCase();

    if (
      rowGameId === gameId &&
      rowImportId === importId &&
      rowStatus === "pending" &&
      rowNotes.indexOf("sports scoreboard parser") !== -1
    ) {

      sheet.deleteRow(i + 1);

    }

  }

}

function sportsGameMatchedText_(game) {

  return (
    "Final: " +
    game.awayName +
    " " +
    game.awayScore +
    " @ " +
    game.homeName +
    " " +
    game.homeScore +
    " — Winner: " +
    game.winnerName
  );

}

function sportsCreateSuggestionsFromGames_(
  gameId,
  importInfo,
  games
) {

  const categories =
    getCategorySuggestionData_(
      gameId
    );

  const suggestionsByCategory = {};

  games
    .filter(game =>
      game.final &&
      game.winnerName
    )
    .forEach(game => {

      categories.forEach(category => {

        const winnerAbbr =
          game.winnerSide === "home"
            ? game.homeAbbr
            : game.awayAbbr;

        const loserAbbr =
          game.winnerSide === "home"
            ? game.awayAbbr
            : game.homeAbbr;

        const winnerMatch =
          sportsFindBestNomineeMatch_(
            category,
            game.winnerName,
            winnerAbbr
          );

        if (!winnerMatch) {
          return;
        }

        const loserMatch =
          sportsFindBestNomineeMatch_(
            category,
            game.loserName,
            loserAbbr
          );

        let confidence = 0;

        if (
          winnerMatch.score >= 90 &&
          loserMatch &&
          loserMatch.score >= 70
        ) {

          confidence = 96;

        } else if (
          winnerMatch.score >= 90 &&
          category.nominees.length === 2
        ) {

          confidence = 88;

        } else if (
          winnerMatch.score >= 85 &&
          loserMatch
        ) {

          confidence = 86;

        } else if (
          winnerMatch.score >= 90 &&
          sportsNormalize_(
            category.categoryName
          ).indexOf(
            sportsNormalize_(game.winnerName)
          ) !== -1
        ) {

          confidence = 82;

        } else if (
          winnerMatch.score >= 90
        ) {

          confidence = 76;

        }

        if (
          confidence <
          SPORTS_SCOREBOARD_MIN_CONFIDENCE
        ) {
          return;
        }

        const suggestionId =
          [
            gameId,
            importInfo.importId,
            "sports",
            category.categoryId,
            winnerMatch.nominee.nomineeId
          ]
            .map(normalizeInternetId_)
            .join("__");

        const suggestion =
          {
            suggestionId:
              suggestionId,

            gameId:
              gameId,

            sourceId:
              importInfo.sourceId || "",

            importId:
              importInfo.importId || "",

            categoryId:
              category.categoryId,

            categoryName:
              category.categoryName,

            suggestedNomineeId:
              winnerMatch.nominee.nomineeId,

            suggestedNomineeName:
              winnerMatch.nominee.nomineeName,

            confidence:
              confidence,

            matchedText:
              sportsGameMatchedText_(game),

            status:
              "pending",

            notes:
              "Generated by sports scoreboard parser"
          };

        const existing =
          suggestionsByCategory[
            category.categoryId
          ];

        if (
          !existing ||
          suggestion.confidence >
          existing.confidence
        ) {

          suggestionsByCategory[
            category.categoryId
          ] =
            suggestion;

        }

      });

    });

  const suggestions =
    Object.keys(suggestionsByCategory)
      .map(key =>
        suggestionsByCategory[key]
      );

  suggestions.forEach(suggestion => {

    appendResultSuggestion_(
      suggestion
    );

  });

  return suggestions;

}

/* =====================================================
   PUBLIC API
===================================================== */

function parseSportsScoreboardForGame(gameId) {

  gameId =
    normalizeInternetValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  setupInternetResultsSystem();

  const lastImport =
    getLastInternetImportRow_(
      gameId
    );

  if (!lastImport) {

    return {
      success: false,
      message: "No internet import found for this game.",
      games: [],
      suggestions: []
    };

  }

  const raw =
    normalizeInternetValue_(
      lastImport.rawPayload ||
      lastImport.rawJsonPreview ||
      lastImport.rawTextPreview
    );

  if (!raw) {

    return {
      success: false,
      message: "Last import has no scoreboard payload to parse.",
      importId: lastImport.importId,
      games: [],
      suggestions: []
    };

  }

  sportsClearPendingSuggestionsForImport_(
    gameId,
    lastImport.importId
  );

  const games =
    sportsParseImportedScoreboard_(
      raw
    );

  const finalGames =
    games.filter(game =>
      game.final &&
      game.winnerName
    );

  const suggestions =
    sportsCreateSuggestionsFromGames_(
      gameId,
      lastImport,
      finalGames
    );

  return {
    success: true,
    message: "Sports scoreboard parsed.",
    gameId: gameId,
    importId: lastImport.importId,
    sourceId: lastImport.sourceId,
    parsedGameCount: games.length,
    finalGameCount: finalGames.length,
    suggestionCount: suggestions.length,
    games: finalGames.slice(0, 25),
    suggestions: suggestions
  };

}

function apiAdminParseSportsScoreboard(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return parseSportsScoreboardForGame(
    payload.gameId || getDefaultGameId()
  );

}