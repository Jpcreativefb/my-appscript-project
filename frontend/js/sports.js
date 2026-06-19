/************************************
 SPORTS SCORES FRONTEND
 Reads Sports Scores Engine API
 using JSONP to avoid Apps Script CORS.
************************************/

/************************************
 IMPORTANT:
 Replace this with your deployed
 Sports Scores Apps Script Web App URL.
************************************/

const SPORTS_API_URL =
  "https://script.google.com/macros/s/AKfycbwVlgZa1FBvt99dpwr4PbrdBOs9IRcZ6BFlr-t6scTRNcVgQsJKpCWk1d8nxC681Sy0/exec";

const SPORTS_WAGER_AWARDS_GAME_ID =
  "sports-wagers";  

/************************************
 STATE
************************************/

let sportsScoresState = {
  leagues: [],
  scores: [],
  activeFilter: {},
  creatingWager: false
};

let sportsUsageByGameId = {};

const LEAGUE_META = {
  "football|nfl": {
    name: "NFL",
    shortName: "NFL",
    logo: ""
  },

  "football|college-football": {
    name: "College Football",
    shortName: "CFB",
    logo: ""
  },

  "basketball|nba": {
    name: "NBA",
    shortName: "NBA",
    logo: ""
  },

  "basketball|wnba": {
    name: "WNBA",
    shortName: "WNBA",
    logo: ""
  },

  "basketball|mens-college-basketball": {
    name: "Men’s College Basketball",
    shortName: "NCAAM",
    logo: ""
  },

  "basketball|womens-college-basketball": {
    name: "Women’s College Basketball",
    shortName: "NCAAW",
    logo: ""
  },

  "baseball|mlb": {
    name: "MLB",
    shortName: "MLB",
    logo: ""
  },

  "hockey|nhl": {
    name: "NHL",
    shortName: "NHL",
    logo: ""
  },

  "soccer|usa.1": {
    name: "MLS",
    shortName: "MLS",
    logo: ""
  },

  "soccer|eng.1": {
    name: "Premier League",
    shortName: "EPL",
    logo: ""
  },

  "soccer|esp.1": {
    name: "La Liga",
    shortName: "LALIGA",
    logo: ""
  },

  "soccer|uefa.champions": {
    name: "Champions League",
    shortName: "UCL",
    logo: ""
  },

  "soccer|fifa.world": {
    name: "FIFA World Cup",
    shortName: "WC",
    logo: ""
  },

  "racing|f1": {
    name: "Formula 1",
    shortName: "F1",
    logo: ""
  },

  "racing|nascar-premier": {
    name: "NASCAR Cup Series",
    shortName: "NASCAR",
    logo: ""
  }
};

/************************************
 STARTUP
************************************/

document.addEventListener("DOMContentLoaded", function() {
  bindSportsEvents();
  initSportsPage();
});

function bindSportsEvents() {
  document
    .getElementById("leagueSelect")
    .addEventListener("change", function() {
      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("statusSelect")
    .addEventListener("change", function() {
      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("dateFromInput")
    .addEventListener("change", function() {
      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("dateToInput")
    .addEventListener("change", function() {
      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("teamInput")
    .addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        loadSportsScores(
          buildSportsFiltersFromControls()
        );
      }
    });

  document
    .getElementById("btnToday")
    .addEventListener("click", function() {
      setSportsDateFiltersToToday();

      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("btnClearFilters")
    .addEventListener("click", function() {
      clearSportsFilters();

      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("btnReload")
    .addEventListener("click", function() {
      loadSportsScores(
        buildSportsFiltersFromControls()
      );
    });

  document
    .getElementById("btnCloseSnapshots")
    .addEventListener("click", function() {
      hideSnapshotPanel();
    });

    document
      .getElementById("scoresGrid")
      .addEventListener("click", function(e) {

        const wagerBtn =
          e.target.closest("[data-create-wager-game-id]");

        if (wagerBtn) {

          const gameId =
            wagerBtn.getAttribute(
              "data-create-wager-game-id"
            );

          createSportsWagerFromCard(gameId);

          return;

        }

        const snapshotBtn =
          e.target.closest("[data-snapshot-game-id]");

        if (!snapshotBtn) {
          return;
        }

        const gameId =
          snapshotBtn.getAttribute(
            "data-snapshot-game-id"
          );

        loadSportsSnapshots(gameId);

    });
}

function buildSportsFiltersFromControls() {
  const leagueValue =
    document
      .getElementById("leagueSelect")
      .value;

  const statusValue =
    document
      .getElementById("statusSelect")
      .value;

  const dateFrom =
    document
      .getElementById("dateFromInput")
      .value;

  const dateTo =
    document
      .getElementById("dateToInput")
      .value;

  const team =
    document
      .getElementById("teamInput")
      .value
      .trim();

  const filters = {};

  if (leagueValue) {
    const parts =
      leagueValue.split("|");

    filters.sport = parts[0];
    filters.league = parts[1];
  }

  if (statusValue === "live") {
    filters.state = "in";
  }

  if (statusValue === "final") {
    filters.completed = "true";
  }

  if (statusValue === "not-final") {
    filters.completed = "false";
  }

  if (dateFrom) {
    filters.dateFrom = dateFrom;
  }

  if (dateTo) {
    filters.dateTo = dateTo;
  }

  if (team) {
    filters.team = team;
  }

  return filters;
}

async function initSportsPage() {
  if (
    !SPORTS_API_URL ||
    SPORTS_API_URL.includes("PASTE_YOUR")
  ) {
    showSportsError(
      "Replace SPORTS_API_URL in js/sports.js with your deployed Sports Scores Web App URL."
    );

    setSportsStatus("Missing API URL.");
    return;
  }

  setSportsDateFiltersToToday();

  await loadSportsLeagues();

  await loadSportsScores(
    buildSportsFiltersFromControls()
  );
}

/************************************
 JSONP HELPER
************************************/

function sportsJsonp(url) {
  return new Promise(function(resolve, reject) {
    const callbackName =
      "sportsJsonpCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    const separator =
      url.indexOf("?") >= 0 ? "&" : "?";

    const script =
      document.createElement("script");

    const timeout =
      setTimeout(function() {
        cleanup();
        reject(
          new Error("Sports API request timed out")
        );
      }, 20000);

    window[callbackName] =
      function(data) {
        cleanup();
        resolve(data);
      };

    function cleanup() {
      clearTimeout(timeout);

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      delete window[callbackName];
    }

    script.onerror =
      function() {
        cleanup();
        reject(
          new Error("Sports API script failed to load")
        );
      };

    script.src =
      url +
      separator +
      "callback=" +
      encodeURIComponent(callbackName);

    document.body.appendChild(script);
  });
}

function buildSportsApiUrl(action, params) {
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

  return SPORTS_API_URL + "?" + query.toString();
}

/************************************
 LEAGUES
************************************/

async function loadSportsLeagues() {
  clearSportsError();
  setSportsStatus("Loading enabled leagues...");

  try {
    const data =
      await sportsJsonp(
        buildSportsApiUrl(
          "getSportsLeagues",
          {}
        )
      );

    if (!data.success) {
      throw new Error(
        data.error || "Failed to load sports leagues"
      );
    }

    sportsScoresState.leagues =
      data.leagues || [];

    renderSportsLeagueButtons(
      sportsScoresState.leagues
    );

    setSportsStatus(
      "Loaded " +
      sportsScoresState.leagues.length +
      " enabled leagues."
    );

  } catch (err) {
    showSportsError(err.message);
    setSportsStatus("Could not load leagues.");
  }
}

function renderSportsLeagueButtons(leagues) {
  const select =
    document.getElementById("leagueSelect");

  select.innerHTML =
    '<option value="">All Leagues</option>';

  leagues
    .slice()
    .sort(function(a, b) {
      const nameA =
        getLeagueMeta(a).name;

      const nameB =
        getLeagueMeta(b).name;

      return nameA.localeCompare(nameB);
    })
    .forEach(function(item) {
      const option =
        document.createElement("option");

      option.value =
        item.sport + "|" + item.league;

      option.textContent =
        getLeagueMeta(item).name;

      select.appendChild(option);
    });
}

/************************************
 SCORES
************************************/

async function loadSportsScores(filters) {
  clearSportsError();
  hideSnapshotPanel();

  sportsScoresState.activeFilter =
    filters || {};

  setSportsStatus("Loading scores...");

  try {
    const data =
      await sportsJsonp(
        buildSportsApiUrl(
          "getSportsScores",
          sportsScoresState.activeFilter
        )
      );

    if (!data.success) {
      throw new Error(
        data.error || "Failed to load sports scores"
      );
    }

    sportsScoresState.scores =
      data.scores || [];

    await loadSportsUsageForScores_();

    renderSportsScores(
      sportsScoresState.scores
    );

    setSportsStatus(
      "Loaded " +
      data.count +
      " scores. Last checked: " +
      formatSportsDate(data.timestamp)
    );

  } catch (err) {
    showSportsError(err.message);
    setSportsStatus("Could not load scores.");
  }
}

function renderSportsScores(scores) {
  const grid =
    document.getElementById("scoresGrid");

  grid.innerHTML = "";

  if (!scores.length) {
    grid.innerHTML =
      '<div class="empty-box">No scores found for this filter.</div>';
    return;
  }

  scores.forEach(function(game) {
    const card =
      document.createElement("article");

    card.className = "score-card";

    const statusInfo =
      getSportsStatusInfo(game);

    card.innerHTML = `
    <div class="score-card-header">
      <div class="league-heading">
        ${renderLeagueLogo(game)}

        <div class="league-label">
          ${escapeSportsHtml(getLeagueMeta(game).name)}
        </div>
      </div>

      <div class="game-date-label">
         ${formatSportsDateShort(game.GameDateTime)}
      </div>
    </div>

     <div class="teams">
         <div class="team-row ${getWinnerRowClass(game, "away")}">
           <div class="team-left">
             ${renderTeamLogo(game.AwayLogo)}
             <div class="team-name">${escapeSportsHtml(game.AwayTeam || "Away")}</div>
           </div>
           <div class="score-value">${formatSportsScore(game.AwayScore)}</div>
         </div>

         <div class="team-row ${getWinnerRowClass(game, "home")}">
            <div class="team-left">
              ${renderTeamLogo(game.HomeLogo)}
              <div class="team-name">${escapeSportsHtml(game.HomeTeam || "Home")}</div>
            </div>
         <div class="score-value">${formatSportsScore(game.HomeScore)}</div>
       </div>
      </div>

      <div class="meta">
          <div>Status: <span class="${escapeSportsHtml(statusInfo.className)}">${escapeSportsHtml(statusInfo.label)}</span></div>
          <div>${getSportsPeriodLabel(game)}: ${formatSportsPeriodValue(game)}</div>
          <div>${getSportsClockLabel(game)}: ${escapeSportsHtml(game.Clock || "-")}</div>
          <div>Updated: ${formatSportsDate(game.LastUpdated)}</div>
      </div>

      ${renderSportsUsedIn(game)}

      <div class="card-actions">
        <button
          class="small-btn"
          data-snapshot-game-id="${escapeSportsHtml(game.GameId || "")}"
        >
          View Snapshots
        </button>

        ${renderCreateWagerButton(game)}
      </div>
    `;

    grid.appendChild(card);
  });
}

/************************************
 SPORTS USAGE / USED IN ADMIN VIEW
************************************/

async function loadSportsUsageForScores_() {

  sportsUsageByGameId = {};

  const session =
    getSportsStoredSession_();

  if (!sportsSessionIsAdmin_(session)) {
    return;
  }

  try {

    const usageRes =
      await apiAdminGetSportsUsage();

    sportsUsageByGameId =
      usageRes &&
      usageRes.success
        ? usageRes.usage || {}
        : {};

  } catch (err) {

    console.warn(
      "Could not load sports usage.",
      err
    );

    sportsUsageByGameId = {};

  }

}

function renderSportsUsedIn(game) {

  const session =
    getSportsStoredSession_();

  if (!sportsSessionIsAdmin_(session)) {
    return "";
  }

  const usedIn =
    getSportsUsageForGame_(game);

  if (!usedIn.length) {

    return `
      <div class="sports-used sports-used-empty">
        Not used in any app game
      </div>
    `;

  }

  return `
    <div class="sports-used">

      <div class="sports-used-title">
        Used In
      </div>

      ${usedIn.map(function(item) {
        return `
          <div class="sports-used-item">

            <div class="sports-used-game">
              ${escapeSportsHtml(
                item.appGameName ||
                item.appGameId ||
                "Awards Game"
              )}
            </div>

            <div class="sports-used-line">
              Category:
              ${escapeSportsHtml(
                item.categoryName ||
                item.categoryId ||
                "-"
              )}
            </div>

            <div class="sports-used-meta">
              App GameId:
              ${escapeSportsHtml(
                item.appGameId || "-"
              )}
            </div>

            <div class="sports-used-meta">
              CategoryId:
              ${escapeSportsHtml(
                item.categoryId || "-"
              )}
            </div>

            ${
              item.appGameType
                ? `
                  <div class="sports-used-meta">
                    Type:
                    ${escapeSportsHtml(
                      item.appGameType
                    )}
                  </div>
                `
                : ""
            }

          </div>
        `;
      }).join("")}

    </div>
  `;

}

function getSportsUsageForGame_(game) {

  if (!game) {
    return [];
  }

  const possibleKeys = [
    game.GameId,
    game.SportsGameId,
    game.ESPNEventId
  ];

  for (let i = 0; i < possibleKeys.length; i++) {

    const key =
      String(possibleKeys[i] || "")
        .trim();

    if (
      key &&
      Array.isArray(sportsUsageByGameId[key])
    ) {
      return sportsUsageByGameId[key];
    }

  }

  return [];

}

function getSportsStatusInfo(game) {
  const state =
    String(game.State || "")
      .trim()
      .toLowerCase();

  const completed =
    game.Completed === true ||
    String(game.Completed)
      .trim()
      .toLowerCase() === "true";

  if (completed) {
    return {
      label: "Final",
      className: "status-final"
    };
  }

  if (state === "in") {
    return {
      label: "Live",
      className: "status-live"
    };
  }

  if (state === "pre") {
    return {
      label: "Scheduled",
      className: "status-scheduled"
    };
  }

  return {
    label: game.Status || state || "Status",
    className: "status-other"
  };
}

/************************************
 SPORTS WAGER ADMIN TEST
************************************/

function getSportsStoredSession_() {

  try {

    return JSON.parse(
      localStorage.getItem("session") || "{}"
    );

  } catch (err) {

    return {};

  }

}

function sportsSessionIsAdmin_(session) {

  if (!session) {
    return false;
  }

  return (
    session.isAdmin === true ||
    session.isAdmin === 1 ||
    String(session.isAdmin || "")
      .trim()
      .toLowerCase() === "true" ||
    String(session.isAdmin || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(session.isAdmin || "")
      .trim()
      .toLowerCase() === "admin"
  );

}

function getAwardsApiUrlForSportsWager_() {

  if (
    typeof CONFIG !== "undefined" &&
    CONFIG &&
    CONFIG.API_URL
  ) {
    return CONFIG.API_URL;
  }

  if (
    typeof API_BASE !== "undefined" &&
    API_BASE
  ) {
    return API_BASE;
  }

  throw new Error(
    "Awards API URL not found. Make sure config.js loads before sports.js."
  );

}

async function sportsAwardsApi_(action, params) {

  const url =
    new URL(
      getAwardsApiUrlForSportsWager_()
    );

  url.searchParams.set(
    "action",
    action
  );

  Object.keys(params || {})
    .forEach(function(key) {

      const value =
        params[key];

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      url.searchParams.set(
        key,
        value
      );

    });

  const response =
    await fetch(url);

  return response.json();

}

function renderCreateWagerButton(game) {

  const session =
    getSportsStoredSession_();

  if (
    !sportsSessionIsAdmin_(session)
  ) {
    return "";
  }

  if (
    !game ||
    !game.GameId ||
    !game.HomeTeam ||
    !game.AwayTeam
  ) {
    return "";
  }

  return `
    <button
      class="small-btn wager-btn"
      data-create-wager-game-id="${escapeSportsHtml(game.GameId || "")}"
    >
      Create Wager
    </button>
  `;

}

async function createSportsWagerFromCard(gameId) {

  if (
    sportsScoresState.creatingWager
  ) {
    return;
  }

  const game =
    sportsScoresState.scores.find(function(item) {
      return item.GameId === gameId;
    });

  if (!game) {
    showSportsError(
      "Could not find selected sports game."
    );
    return;
  }

  const session =
    getSportsStoredSession_();

  if (
    !session.username ||
    !session.token ||
    !sportsSessionIsAdmin_(session)
  ) {
    showSportsError(
      "Log in as an admin in the main app first, then return to Sports."
    );
    return;
  }

  const awardsGameId =
    prompt(
      "Awards wager GameId",
      SPORTS_WAGER_AWARDS_GAME_ID
    );

  if (!awardsGameId) {
    return;
  }

  const marketChoice =
    prompt(
      "Choose wager market:\n\n" +
      "1 = Moneyline\n" +
      "2 = Spread\n" +
      "3 = Total / Over-Under",
      "1"
    );

  if (marketChoice === null) {
    return;
  }

  const wagerMarket =
    String(marketChoice).trim() === "2"
      ? "spread"
      : String(marketChoice).trim() === "3"
        ? "total"
        : "moneyline";

  const oddsModeChoice =
    prompt(
      "Choose odds mode:\n\n" +
      "1 = Real Odds\n" +
      "2 = App Odds / Record Odds\n" +
      "3 = Manual Odds",
      "1"
    );

  if (oddsModeChoice === null) {
    return;
  }

  const oddsMode =
    String(oddsModeChoice).trim() === "2"
      ? "record"
      : String(oddsModeChoice).trim() === "3"
        ? "manual"
        : "real";

  if (
    oddsMode === "record" &&
    wagerMarket !== "moneyline"
  ) {
    alert(
      "App Odds / Record Odds only works for Moneyline.\n\nUse Real Odds or Manual Odds for Spread and Total."
    );
    return;
  }

  let awayOdds = "";
  let homeOdds = "";
  let awayLine = "";
  let homeLine = "";
  let totalPoints = "";
  let overOdds = "";
  let underOdds = "";

  if (
    oddsMode === "manual" &&
    wagerMarket === "moneyline"
  ) {

    awayOdds =
      prompt(
        "Away moneyline odds for " + game.AwayTeam,
        "2"
      );

    if (awayOdds === null) {
      return;
    }

    homeOdds =
      prompt(
        "Home moneyline odds for " + game.HomeTeam,
        "2"
      );

    if (homeOdds === null) {
      return;
    }

  }

  if (
    oddsMode === "manual" &&
    wagerMarket === "spread"
  ) {

    awayLine =
      prompt(
        "Away spread line for " + game.AwayTeam + "\nExample: +1.5 or -1.5",
        "+1.5"
      );

    if (awayLine === null) {
      return;
    }

    awayOdds =
      prompt(
        "Away spread odds for " + game.AwayTeam,
        "1.91"
      );

    if (awayOdds === null) {
      return;
    }

    homeLine =
      prompt(
        "Home spread line for " + game.HomeTeam + "\nExample: -1.5 or +1.5",
        "-1.5"
      );

    if (homeLine === null) {
      return;
    }

    homeOdds =
      prompt(
        "Home spread odds for " + game.HomeTeam,
        "1.91"
      );

    if (homeOdds === null) {
      return;
    }

  }

  if (
    oddsMode === "manual" &&
    wagerMarket === "total"
  ) {

    totalPoints =
      prompt(
        "Total points/runs/goals line\nExample: 8.5",
        "8.5"
      );

    if (totalPoints === null) {
      return;
    }

    overOdds =
      prompt(
        "Over odds",
        "1.91"
      );

    if (overOdds === null) {
      return;
    }

    underOdds =
      prompt(
        "Under odds",
        "1.91"
      );

    if (underOdds === null) {
      return;
    }

  }

  sportsScoresState.creatingWager =
    true;

  setSportsStatus(
    "Creating " +
    wagerMarket +
    " wager for " +
    game.AwayTeam +
    " @ " +
    game.HomeTeam +
    "..."
  );

  try {

    const res =
      await sportsAwardsApi_(
        "adminCreateSportsWager",
        {
          username:
            session.username,

          token:
            session.token,

          gameId:
            awardsGameId,

          awardsGameId:
            awardsGameId,

          sportsGameId:
            game.GameId,

          espnEventId:
            game.ESPNEventId,

          wagerMarket:
            wagerMarket,

          oddsMode:
            oddsMode,

          awayLine:
            awayLine,

          homeLine:
            homeLine,

          totalPoints:
            totalPoints,

          awayOdds:
            awayOdds,

          homeOdds:
            homeOdds,

          overOdds:
            overOdds,

          underOdds:
            underOdds,

          autoOdds:
            oddsMode === "manual"
              ? "false"
              : "true"
        }
      );

    if (
      !res ||
      res.success === false
    ) {

      if (res && res.duplicate) {
        setSportsStatus(
          "This game and market already exists as a wager."
        );
        return;
      }

      throw new Error(
        (res && (res.message || res.error)) ||
        "Could not create wager."
      );

    }

    setSportsStatus(
      "Created " +
      wagerMarket +
      " wager: " +
      (res.category || res.categoryId) +
      "."
    );

    alert(
      "Wager created.\n\nMarket: " +
      wagerMarket +
      "\nOdds Source: " +
      (res.oddsSource || oddsMode)
    );

  } catch (err) {

    showSportsError(
      err && err.message
        ? err.message
        : "Could not create wager."
    );

    setSportsStatus(
      "Could not create wager."
    );

  } finally {

    sportsScoresState.creatingWager =
      false;

  }

}

/************************************
 SNAPSHOTS
************************************/

async function loadSportsSnapshots(gameId) {
  if (!gameId) {
    return;
  }

  clearSportsError();

  const game =
    sportsScoresState.scores.find(function(item) {
      return item.GameId === gameId;
    });

  const title =
    game
      ? (game.AwayTeam || "Away") +
        " @ " +
        (game.HomeTeam || "Home")
      : gameId;

  showSnapshotPanel(
    title,
    '<div class="empty-box">Loading snapshots...</div>'
  );

  try {
    const data =
      await sportsJsonp(
        buildSportsApiUrl(
          "getSportsSnapshots",
          {
            gameId: gameId
          }
        )
      );

    if (!data.success) {
      throw new Error(
        data.error || "Failed to load snapshots"
      );
    }

    renderSportsSnapshots(
      title,
      data.snapshots || []
    );

  } catch (err) {
    showSportsError(err.message);

    showSnapshotPanel(
      title,
      '<div class="empty-box">Could not load snapshots.</div>'
    );
  }
}

function renderSportsSnapshots(title, snapshots) {
  if (!snapshots.length) {
    showSnapshotPanel(
      title,
      '<div class="empty-box">No snapshots saved for this game yet.</div>'
    );

    return;
  }

  const html =
    '<div class="snapshot-list">' +
    snapshots
      .map(function(snapshot) {
        return `
          <div class="snapshot-item">
            <div class="snapshot-type">
              ${escapeSportsHtml(snapshot.SnapshotType || "Snapshot")}
            </div>

            <div>
              Score:
              ${formatSportsScore(snapshot.AwayScore)}
              -
              ${formatSportsScore(snapshot.HomeScore)}
            </div>

            <div>
              Period:
              ${escapeSportsHtml(snapshot.Period || "-")}
            </div>

            <div>
              Clock:
              ${escapeSportsHtml(snapshot.Clock || "-")}
            </div>

            <div>
              Time:
              ${formatSportsDate(snapshot.Timestamp)}
            </div>

            <div>
              Notes:
              ${escapeSportsHtml(snapshot.Notes || "-")}
            </div>
          </div>
        `;
      })
      .join("") +
    "</div>";

  showSnapshotPanel(title, html);
}

function showSnapshotPanel(title, html) {
  const panel =
    document.getElementById("snapshotPanel");

  document.getElementById("snapshotTitle").textContent =
    "Snapshots: " + title;

  document.getElementById("snapshotContent").innerHTML =
    html;

  panel.classList.remove("hidden");

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function hideSnapshotPanel() {
  document
    .getElementById("snapshotPanel")
    .classList.add("hidden");
}

/************************************
 FORMATTERS
************************************/

function formatSportsScore(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  return escapeSportsHtml(String(value));
}

function formatSportsDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (isNaN(date.getTime())) {
    return escapeSportsHtml(String(value));
  }

  return date.toLocaleString();
}

function escapeSportsHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTeamLogo(url) {
    url =
      String(url || "")
        .trim();
  
    if (!url) {
      return '<div class="team-logo-placeholder"></div>';
    }
  
    return (
      '<img class="team-logo" src="' +
      escapeSportsHtml(url) +
      '" alt="">'
    );
}

function getWinnerRowClass(game, side) {
  const completed =
    game.Completed === true ||
    String(game.Completed)
      .trim()
      .toLowerCase() === "true";

  if (!completed || !game.Winner) {
    return "";
  }

  const winner =
    String(game.Winner || "")
      .trim()
      .toLowerCase();

  const homeTeam =
    String(game.HomeTeam || "")
      .trim()
      .toLowerCase();

  const awayTeam =
    String(game.AwayTeam || "")
      .trim()
      .toLowerCase();

  if (side === "home" && winner === homeTeam) {
    return "winner-row";
  }

  if (side === "away" && winner === awayTeam) {
    return "winner-row";
  }

  return "";
}

function getSportsPeriodLabel(game) {
  const sport =
    String(game.Sport || "")
      .trim()
      .toLowerCase();

  const league =
    String(game.League || "")
      .trim()
      .toLowerCase();

  if (sport === "baseball") {
    return "Inning";
  }

  if (sport === "football") {
    return "Quarter";
  }

  if (sport === "hockey") {
    return "Period";
  }

  if (sport === "racing") {
    return "Lap / Stage";
  }

  if (sport === "soccer") {
    return "Match Time";
  }

  if (
    sport === "basketball" &&
    league === "mens-college-basketball"
  ) {
    return "Half";
  }

  if (sport === "basketball") {
    return "Quarter";
  }

  return "Period";
}

function getSportsClockLabel(game) {
  const sport =
    String(game.Sport || "")
      .trim()
      .toLowerCase();

  if (sport === "baseball") {
    return "Game State";
  }

  if (sport === "racing") {
    return "Race Clock";
  }

  if (sport === "soccer") {
    return "Clock";
  }

  return "Clock";
}

function formatSportsPeriodValue(game) {
  const value =
    game.Period || "-";

  const sport =
    String(game.Sport || "")
      .trim()
      .toLowerCase();

  if (sport === "baseball" && value !== "-") {
    return escapeSportsHtml(String(value));
  }

  return escapeSportsHtml(String(value));
}

function formatSportsDateShort(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

/************************************
 UI HELPERS
************************************/

function setSportsStatus(message) {
  document.getElementById("statusBox").textContent =
    message;
}

function showSportsError(message) {
  document.getElementById("errorBox").innerHTML =
    '<div class="error-box">' +
    escapeSportsHtml(message) +
    "</div>";
}

function clearSportsError() {
  document.getElementById("errorBox").innerHTML = "";
}

function getLeagueMeta(item) {
  const sport =
    String(item.Sport || item.sport || "")
      .trim()
      .toLowerCase();

  const league =
    String(item.League || item.league || "")
      .trim()
      .toLowerCase();

  const key =
    sport + "|" + league;

  if (LEAGUE_META[key]) {
    return LEAGUE_META[key];
  }

  return {
    name:
      cleanLeagueName_(sport, league),
    shortName:
      cleanLeagueShortName_(league),
    logo: ""
  };
}

function cleanLeagueName_(sport, league) {
  if (!league) {
    return sport || "League";
  }

  return league
    .replaceAll("-", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
}

function cleanLeagueShortName_(league) {
  league =
    String(league || "")
      .trim();

  if (!league) {
    return "SPORT";
  }

  return league
    .replace("college-football", "CFB")
    .replace("mens-college-basketball", "NCAAM")
    .replace("womens-college-basketball", "NCAAW")
    .replace("nascar-premier", "NASCAR")
    .replace("fifa.world", "WC")
    .replace("uefa.champions", "UCL")
    .replace("usa.1", "MLS")
    .replace("eng.1", "EPL")
    .replace("esp.1", "ESP")
    .toUpperCase();
}

function renderLeagueLogo(item) {
  const meta =
    getLeagueMeta(item);

  if (meta.logo) {
    return (
      '<img class="league-logo" src="' +
      escapeSportsHtml(meta.logo) +
      '" alt="' +
      escapeSportsHtml(meta.name) +
      '">'
    );
  }

  return (
    '<span class="league-badge">' +
    escapeSportsHtml(meta.shortName) +
    '</span>'
  );
}

function setSportsDateFiltersToToday() {
  const today =
    getSportsTodayInputValue();

  document.getElementById("dateFromInput").value =
    today;

  document.getElementById("dateToInput").value =
    today;
}

function clearSportsFilters() {
  document.getElementById("leagueSelect").value =
    "";

  document.getElementById("statusSelect").value =
    "all";

  document.getElementById("teamInput").value =
    "";

  setSportsDateFiltersToToday();
}

function getSportsTodayInputValue() {
  const now =
    new Date();

  const yyyy =
    now.getFullYear();

  const mm =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  const dd =
    String(now.getDate())
      .padStart(2, "0");

  return yyyy + "-" + mm + "-" + dd;
}

async function apiAdminGetSportsUsage() {

  const session =
    getSportsStoredSession_();

  const apiUrl =
    getAwardsApiUrlForSportsWager_();

  const url =
    new URL(apiUrl);

  url.searchParams.set(
    "action",
    "adminGetSportsUsage"
  );

  if (session.username) {
    url.searchParams.set(
      "username",
      session.username
    );
  }

  if (session.token) {
    url.searchParams.set(
      "token",
      session.token
    );
  }

  const response =
    await fetch(url);

  return response.json();

}
