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
  creatingWager: false,
  creatingPlayerProp: false,
  creatingPlayerMatchup: false,
  creatingAdvancedQuestion: false,
  gameDetailsByEventId: {},
  gameDetailsLoading: false
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

  "soccer|uefa.europa": {
    name: "UEFA Europa League",
    shortName: "UEL",
    logo: ""
  },

  "soccer|uefa.nations": {
    name: "UEFA Nations League",
    shortName: "UNL",
    logo: ""
  },

  "soccer|mex.1": {
    name: "Liga MX",
    shortName: "LIGA MX",
    logo: ""
  },

  "soccer|ita.1": {
    name: "Serie A",
    shortName: "SERIE A",
    logo: ""
  },

  "soccer|ger.1": {
    name: "Bundesliga",
    shortName: "BUND",
    logo: ""
  },

  "soccer|eng.2": {
    name: "English Championship",
    shortName: "EFL CH",
    logo: ""
  },

  "soccer|ned.1": {
    name: "Dutch Eredivisie",
    shortName: "ERED",
    logo: ""
  },

  "soccer|por.1": {
    name: "Portuguese Primeira Liga",
    shortName: "PRIMEIRA",
    logo: ""
  },

  "soccer|sco.1": {
    name: "Scottish Premiership",
    shortName: "SPFL",
    logo: ""
  },

  "soccer|bra.1": {
    name: "Brazilian Série A",
    shortName: "BRA A",
    logo: ""
  },

  "soccer|arg.1": {
    name: "Argentine Liga Profesional",
    shortName: "ARG LPF",
    logo: ""
  },

  "soccer|usa.nwsl": {
    name: "NWSL",
    shortName: "NWSL",
    logo: ""
  },

  "soccer|eng.w.1": {
    name: "Women’s Super League",
    shortName: "WSL",
    logo: ""
  },

  "soccer|uefa.wchampions": {
    name: "UEFA Women’s Champions League",
    shortName: "UWCL",
    logo: ""
  },

  "soccer|fifa.wwc": {
    name: "FIFA Women’s World Cup",
    shortName: "WWC",
    logo: ""
  },

  "soccer|uefa.europa.conf": {
    name: "UEFA Conference League",
    shortName: "UECL",
    logo: ""
  },

  "soccer|concacaf.champions": {
    name: "Concacaf Champions Cup",
    shortName: "CCC",
    logo: ""
  },

  "soccer|conmebol.libertadores": {
    name: "CONMEBOL Libertadores",
    shortName: "LIB",
    logo: ""
  },

  "soccer|conmebol.sudamericana": {
    name: "CONMEBOL Sudamericana",
    shortName: "SUD",
    logo: ""
  },

  "soccer|fifa.cwc": {
    name: "FIFA Club World Cup",
    shortName: "CWC",
    logo: ""
  },

  "soccer|club.friendly": {
    name: "Club Friendly",
    shortName: "CLUB FR",
    logo: ""
  },

  "soccer|fifa.friendly": {
    name: "International Friendly",
    shortName: "INTL FR",
    logo: ""
  },

  "soccer|fra.1": {
    name: "Ligue 1",
    shortName: "LIGUE 1",
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

  const refreshScoreWindowButton =
    document.getElementById("btnRefreshScoreWindow");

  if (refreshScoreWindowButton) {
    refreshScoreWindowButton.addEventListener("click", function() {
      refreshSportsScoreWindowFromSportsPage_();
    });
  }

  document
    .getElementById("btnCloseSnapshots")
    .addEventListener("click", function() {
      hideSnapshotPanel();
    });

  const scoresGrid =
    document.getElementById("scoresGrid");

  scoresGrid
    .addEventListener("click", function(e) {

      const advancedQuestionBtn =
        e.target.closest("[data-create-advanced-question-game-id]");

      if (advancedQuestionBtn) {

        const gameId =
          advancedQuestionBtn.getAttribute(
            "data-create-advanced-question-game-id"
          );

        createSportsAdvancedQuestionFromCard(gameId);

        return;

      }

      const playerMatchupBtn =
        e.target.closest("[data-create-player-matchup-game-id]");

      if (playerMatchupBtn) {

        const gameId =
          playerMatchupBtn.getAttribute(
            "data-create-player-matchup-game-id"
          );

        createSportsPlayerMatchupFromCard(gameId);

        return;

      }

      const playerPropBtn =
        e.target.closest("[data-create-player-prop-game-id]");

      if (playerPropBtn) {

        const gameId =
          playerPropBtn.getAttribute(
            "data-create-player-prop-game-id"
          );

        createSportsPlayerPropFromCard(gameId);

        return;

      }

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

  scoresGrid
    .addEventListener("change", function(e) {

      const checkbox =
        e.target.closest(".sports-wager-select");

      if (!checkbox) {
        return;
      }

      updateSelectedSportsWagerCount_();

    });

  const bulkSelectAll =
    document.getElementById("sportsBulkSelectAll");

  if (bulkSelectAll) {

    bulkSelectAll
      .addEventListener("change", function() {
        toggleAllSportsWagerSelections_(
          bulkSelectAll.checked
        );
      });

  }

  const bulkCreateBtn =
    document.getElementById("sportsBulkCreateWagersBtn");

  if (bulkCreateBtn) {

    bulkCreateBtn
      .addEventListener("click", function() {
        createSelectedSportsWagers();
      });

  }

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

const SPORTS_JSONP_TIMEOUT_MS =
  90000;

const SPORTS_JSONP_LONG_TIMEOUT_MS =
  120000;

const SPORTS_JSONP_LATE_CALLBACK_MS =
  120000;

function sportsJsonp(url, options) {

  options =
    options || {};

  const timeoutMs =
    Math.max(
      1000,
      Number(options.timeoutMs) ||
      SPORTS_JSONP_TIMEOUT_MS
    );

  const callbackPrefix =
    String(
      options.callbackPrefix ||
      "sportsJsonpCallback_"
    )
      .replace(/[^A-Za-z0-9_$]/g, "") ||
    "sportsJsonpCallback_";

  return new Promise(function(resolve, reject) {

    const callbackName =
      callbackPrefix +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 1000000);

    const separator =
      url.indexOf("?") >= 0 ? "&" : "?";

    const script =
      document.createElement("script");

    let finished =
      false;

    function removeScript_() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    function deleteCallback_() {
      try {
        delete window[callbackName];
      } catch (err) {
        window[callbackName] = undefined;
      }
    }

    function keepLateCallback_() {

      // Apps Script can finish after the UI timeout or after a transient
      // script load error. Keep a harmless callback temporarily so the
      // delayed JSONP response does not throw "callback is not defined".
      window[callbackName] =
        function() {};

      setTimeout(function() {
        deleteCallback_();
      }, SPORTS_JSONP_LATE_CALLBACK_MS);
    }

    function cleanup_(keepLateCallback) {
      removeScript_();

      if (keepLateCallback) {
        keepLateCallback_();
        return;
      }

      deleteCallback_();
    }

    const timeout =
      setTimeout(function() {

        if (finished) {
          return;
        }

        finished = true;
        cleanup_(true);

        reject(
          new Error(
            "Sports API request timed out after " +
            Math.round(timeoutMs / 1000) +
            " seconds"
          )
        );

      }, timeoutMs);

    window[callbackName] =
      function(data) {

        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeout);
        cleanup_(false);
        resolve(data);
      };

    script.onerror =
      function() {

        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeout);
        cleanup_(true);

        reject(
          new Error("Sports API script failed to load")
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

    sportsScoresState.gameDetailsLoading =
      sportsScoresState.scores.some(function(game) {
        return String(game && game.League || "").trim().toLowerCase() === "mlb";
      });

    renderSportsScores(
      sportsScoresState.scores
    );

    loadSportsGameDetailsForScores_(
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

  renderSportsBulkWagerToolbar_(
    scores
  );

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

      ${renderSportsStartingPitchers_(game)}

      <div class="meta">
          <div>Status: <span class="${escapeSportsHtml(statusInfo.className)}">${escapeSportsHtml(statusInfo.label)}</span></div>
          <div>${getSportsPeriodLabel(game)}: ${formatSportsPeriodValue(game)}</div>
          <div>${getSportsClockLabel(game)}: ${escapeSportsHtml(game.Clock || "-")}</div>
          <div>Updated: ${formatSportsDate(game.LastUpdated)}</div>
      </div>

      ${renderSportsUsedIn(game)}

      <div class="card-actions">
        ${renderSportsBulkSelectBox_(game)}

        <button
          class="small-btn"
          data-snapshot-game-id="${escapeSportsHtml(game.GameId || "")}"
        >
          View Snapshots
        </button>

        ${renderCreateWagerButton(game)}
        ${renderCreatePlayerPropButton(game)}
        ${renderCreateAdvancedQuestionButton(game)}
      </div>
    `;

    grid.appendChild(card);
  });

  updateSelectedSportsWagerCount_();
}

/************************************
 MLB STARTING PITCHERS
************************************/

function sportsGameDetailsFor_(game) {
  const eventId = String(game && game.ESPNEventId || "").trim();
  return eventId && sportsScoresState.gameDetailsByEventId
    ? sportsScoresState.gameDetailsByEventId[eventId] || null
    : null;
}

function sportsStarterFallback_(game, side) {
  const prefix = side === "home" ? "Home" : "Away";
  const name = String(
    game && (
      game[prefix + "StartingPitcher"] ||
      game[prefix + "ProbablePitcher"] ||
      game[prefix + "ProbablePitcherName"]
    ) || ""
  ).trim();
  if (!name) return null;
  return {
    name: name,
    role: game[prefix + "StartingPitcher"] ? "starter" : "probable",
    confirmed: Boolean(game[prefix + "StartingPitcher"]),
    statLine: ""
  };
}

function renderSportsStarterRow_(teamName, starter) {
  const label = starter && starter.confirmed ? "Starting pitcher" : "Probable pitcher";
  const name = starter && starter.name ? starter.name : "TBD";
  const statLine = starter && starter.statLine ? starter.statLine : "";
  const headshot = starter && starter.headshot
    ? '<img class="sports-starter-headshot" src="' + escapeSportsHtml(starter.headshot) + '" alt="">'
    : '<span class="sports-starter-headshot sports-starter-placeholder">P</span>';
  return `
    <div class="sports-starter-row">
      ${headshot}
      <div class="sports-starter-copy">
        <span class="sports-starter-team">${escapeSportsHtml(teamName || "Team")}</span>
        <strong>${escapeSportsHtml(name)}</strong>
        <span>${escapeSportsHtml(label)}${statLine ? " · " + escapeSportsHtml(statLine) : ""}</span>
      </div>
    </div>
  `;
}

function renderSportsStartingPitchers_(game) {
  const league = String(game && game.League || "").trim().toLowerCase();
  if (league !== "mlb") return "";

  const details = sportsGameDetailsFor_(game);
  const awayStarter = details && details.awayStarter || sportsStarterFallback_(game, "away");
  const homeStarter = details && details.homeStarter || sportsStarterFallback_(game, "home");

  if (!awayStarter && !homeStarter && sportsScoresState.gameDetailsLoading) {
    return '<div class="sports-starters sports-starters-loading">Checking probable starting pitchers…</div>';
  }

  return `
    <div class="sports-starters">
      <div class="sports-starters-title">Starting Pitchers</div>
      ${renderSportsStarterRow_(game.AwayTeam || "Away", awayStarter)}
      ${renderSportsStarterRow_(game.HomeTeam || "Home", homeStarter)}
    </div>
  `;
}

async function loadSportsGameDetailsForScores_(scores) {
  const mlbGames = (scores || []).filter(function(game) {
    return String(game && game.League || "").trim().toLowerCase() === "mlb" &&
      String(game && game.ESPNEventId || "").trim();
  }).slice(0, 30);

  if (!mlbGames.length) {
    sportsScoresState.gameDetailsLoading = false;
    return;
  }

  const eventIds = mlbGames.map(function(game) {
    return String(game.ESPNEventId || "").trim();
  });
  const eventLeagues = {};
  mlbGames.forEach(function(game) {
    eventLeagues[String(game.ESPNEventId || "").trim()] = "mlb";
  });

  try {
    const result = await sportsAwardsApi_(
      "getSportsGameDetails",
      {
        espnEventIds: eventIds.join(","),
        eventLeaguesJSON: JSON.stringify(eventLeagues),
        league: "mlb"
      }
    );

    if (result && result.success !== false && result.gameDetails) {
      sportsScoresState.gameDetailsByEventId = Object.assign(
        {},
        sportsScoresState.gameDetailsByEventId || {},
        result.gameDetails
      );
    }
  } catch (error) {
    console.warn("Could not load MLB starting pitchers.", error);
  } finally {
    sportsScoresState.gameDetailsLoading = false;
    renderSportsScores(sportsScoresState.scores || []);
  }
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

  // The Sports page is hosted on Cloudflare while the Awards backend is
  // an Apps Script web app. Use JSONP here instead of cross-origin fetch so
  // player props, matchups, stat questions, usage, and wager creation all
  // use the same browser-safe transport.
  return sportsJsonp(
    url.toString(),
    {
      timeoutMs:
        SPORTS_JSONP_LONG_TIMEOUT_MS,
      callbackPrefix:
        "sportsAwardsJsonpCallback_"
    }
  );

}

async function refreshSportsScoreWindowFromSportsPage_() {

  const session =
    getSportsStoredSession_();

  if (!sportsSessionIsAdmin_(session)) {
    showSportsError(
      "Only admins can refresh the Sports Scores Engine window."
    );
    return;
  }

  setSportsStatus(
    "Refreshing recent/upcoming scores from ESPN..."
  );

  try {

    const res =
      await sportsAwardsApi_(
        "adminRefreshSportsScoresWindow",
        {
          username:
            session.username,

          token:
            session.token,

          daysBack:
            2,

          daysForward:
            7
        }
      );

    if (!res || res.success === false) {
      throw new Error(
        (res && (res.error || res.message || res.reason)) ||
        "Score window refresh failed."
      );
    }

    setSportsStatus(
      "Score window refreshed. Unique games: " +
      (res.uniqueGames || 0) +
      ". Reloading visible scores..."
    );

    await loadSportsScores(
      buildSportsFiltersFromControls()
    );

  } catch (err) {
    showSportsError(
      err && err.message
        ? err.message
        : String(err)
    );
    setSportsStatus(
      "Could not refresh score window."
    );
  }

}

async function apiAdminGetSportsWagerGames_(
  session
) {

  return sportsAwardsApi_(
    "adminGetSportsWagerGames",
    {
      username:
        session.username,

      token:
        session.token
    }
  );

}

async function chooseSportsAwardsGameId_(
  session
) {

  let games = [];

  try {

    const res =
      await apiAdminGetSportsWagerGames_(
        session
      );

    if (
      !res ||
      res.success === false
    ) {
      throw new Error(
        (res && (res.message || res.error)) ||
        "Could not load available games."
      );
    }

    games =
      res.games || [];

  } catch (err) {

    showSportsError(
      err && err.message
        ? err.message
        : "Could not load available games."
    );

    return "";

  }

  if (!games.length) {

    alert(
      "No active wager-enabled games found. Turn WagerEnabled ON for the destination Awards Game first."
    );

    return "";

  }

  return showSportsGamePickerModal_(
    games
  );

}

function showSportsGamePickerModal_(
  games
) {

  return new Promise(function(resolve) {

    const existing =
      document.getElementById(
        "sportsGamePickerOverlay"
      );

    if (existing) {
      existing.remove();
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "sportsGamePickerOverlay";

    overlay.className =
      "sports-game-picker-overlay";

    const optionsHtml =
      games.map(function(game) {

        const gameId =
          String(game.gameId || "")
            .trim();

        const label =
          (
            String(game.name || gameId).trim() +
            " — " +
            gameId +
            (
              game.type
                ? " (" + game.type + ")"
                : ""
            )
          );

        return (
          '<option value="' +
          escapeSportsHtml(gameId) +
          '">' +
          escapeSportsHtml(label) +
          '</option>'
        );

      }).join("");

    overlay.innerHTML = `
      <div class="sports-game-picker-modal">

        <h3>Create Wager In Game</h3>

        <p>
          Choose which Awards App game should receive this wager category.
        </p>

        <select id="sportsGamePickerSelect">
          ${optionsHtml}
        </select>

        <div class="sports-game-picker-actions">

          <button
            type="button"
            class="small-btn"
            id="sportsGamePickerCancel"
          >
            Cancel
          </button>

          <button
            type="button"
            class="small-btn wager-btn"
            id="sportsGamePickerConfirm"
          >
            Continue
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      overlay
    );

    const select =
      document.getElementById(
        "sportsGamePickerSelect"
      );

    if (SPORTS_WAGER_AWARDS_GAME_ID) {

      const defaultOption =
        Array.from(select.options)
          .find(function(option) {
            return (
              option.value ===
              SPORTS_WAGER_AWARDS_GAME_ID
            );
          });

      if (defaultOption) {
        select.value =
          SPORTS_WAGER_AWARDS_GAME_ID;
      }

    }

    function close(
      value
    ) {

      overlay.remove();

      resolve(
        value || ""
      );

    }

    document
      .getElementById("sportsGamePickerCancel")
      .addEventListener("click", function() {
        close("");
      });

    document
      .getElementById("sportsGamePickerConfirm")
      .addEventListener("click", function() {
        close(
          select.value
        );
      });

    overlay
      .addEventListener("click", function(e) {

        if (e.target === overlay) {
          close("");
        }

      });

  });

}

function renderSportsBulkSelectBox_(game) {

  const session =
    getSportsStoredSession_();

  if (!sportsSessionIsAdmin_(session)) {
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
    <label class="sports-bulk-card-select">
      <input
        type="checkbox"
        class="sports-wager-select"
        data-sports-game-id="${escapeSportsHtml(game.GameId || "")}"
        data-espn-event-id="${escapeSportsHtml(game.ESPNEventId || "")}"
      >
      <span>Select for bulk wager</span>
    </label>
  `;

}

function renderSportsBulkWagerToolbar_(scores) {

  const bar =
    document.getElementById("sportsBulkWagerBar");

  if (!bar) {
    return;
  }

  const session =
    getSportsStoredSession_();

  const shouldShow =
    sportsSessionIsAdmin_(session) &&
    Array.isArray(scores) &&
    scores.length > 0;

  if (!shouldShow) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");

  updateSelectedSportsWagerCount_();

}

function toggleAllSportsWagerSelections_(checked) {

  document
    .querySelectorAll(".sports-wager-select")
    .forEach(function(box) {
      box.checked = checked;
    });

  updateSelectedSportsWagerCount_();

}

function updateSelectedSportsWagerCount_() {

  const boxes =
    Array.from(
      document.querySelectorAll(".sports-wager-select")
    );

  const selected =
    boxes.filter(function(box) {
      return box.checked;
    });

  const countEl =
    document.getElementById("sportsBulkSelectedCount");

  if (countEl) {
    countEl.textContent =
      selected.length +
      " game" +
      (selected.length === 1 ? "" : "s") +
      " selected";
  }

  const selectAll =
    document.getElementById("sportsBulkSelectAll");

  if (selectAll) {
    selectAll.checked =
      boxes.length > 0 &&
      selected.length === boxes.length;

    selectAll.indeterminate =
      selected.length > 0 &&
      selected.length < boxes.length;
  }

  const createBtn =
    document.getElementById("sportsBulkCreateWagersBtn");

  if (createBtn) {
    createBtn.disabled =
      selected.length === 0;
  }

}

function getSelectedSportsWagerGames_() {

  return Array
    .from(
      document.querySelectorAll(".sports-wager-select:checked")
    )
    .map(function(box) {

      const sportsGameId =
        box.dataset.sportsGameId || "";

      const espnEventId =
        box.dataset.espnEventId || "";

      const score =
        sportsScoresState.scores.find(function(item) {
          return String(item.GameId || "") === String(sportsGameId || "");
        }) || null;

      return {
        sportsGameId: sportsGameId,
        espnEventId: espnEventId,
        score: score
      };

    });

}

function buildSportsWagerCreateConfig_(games) {

  games =
    Array.isArray(games)
      ? games.filter(Boolean)
      : [];

  const firstGame =
    games[0] || {};

  const allSoccer =
    games.length > 0 &&
    games.every(function(game) {
      return String(game.Sport || "")
        .trim()
        .toLowerCase() === "soccer";
    });

  const marketChoice =
    prompt(
      "Choose wager market:\n\n" +
      "1 = Moneyline\n" +
      "2 = Spread\n" +
      "3 = Total / Over-Under\n" +
      "4 = Soccer 3-Way Moneyline",
      allSoccer ? "4" : "1"
    );

  if (marketChoice === null) {
    return null;
  }

  const wagerMarket =
    String(marketChoice).trim() === "2"
      ? "spread"
      : String(marketChoice).trim() === "3"
        ? "total"
        : String(marketChoice).trim() === "4"
          ? "soccer-moneyline"
          : "moneyline";

  const oddsModeChoice =
    prompt(
      "Choose odds group / odds mode:\n\n" +
      "1 = Real Odds Only / Pending Until Odds Pull\n" +
      "2 = Real Odds with App Fallback\n" +
      "3 = App Odds / Record Odds\n" +
      "4 = Manual Odds",
      wagerMarket === "soccer-moneyline" ? "4" : "1"
    );

  if (oddsModeChoice === null) {
    return null;
  }

  const oddsMode =
    String(oddsModeChoice).trim() === "2"
      ? "real"
      : String(oddsModeChoice).trim() === "3"
        ? "record"
        : String(oddsModeChoice).trim() === "4"
          ? "manual"
          : "real-only";

  if (
    oddsMode === "record" &&
    wagerMarket !== "moneyline" &&
    wagerMarket !== "soccer-moneyline"
  ) {
    alert(
      "App Odds / Record Odds only works for Moneyline.\n\nUse Real Odds Only, Real Odds with App Fallback, or Manual Odds for Spread and Total."
    );
    return null;
  }

  if (
    oddsMode === "manual" &&
    games.length > 1
  ) {

    const useSameManualOdds =
      confirm(
        "Manual odds/lines will be reused for every selected game.\n\n" +
        "Use the single Create Wager button if each game needs different manual odds.\n\n" +
        "Continue with the same manual values for all selected games?"
      );

    if (!useSameManualOdds) {
      return null;
    }

  }

  const manualValues =
    getSportsWagerManualValues_(
      firstGame,
      wagerMarket,
      oddsMode
    );

  if (!manualValues) {
    return null;
  }

  return {
    wagerMarket: wagerMarket,
    oddsMode: oddsMode,
    autoOdds:
      oddsMode === "manual"
        ? "false"
        : "true",
    awayLine: manualValues.awayLine,
    homeLine: manualValues.homeLine,
    totalPoints: manualValues.totalPoints,
    awayOdds: manualValues.awayOdds,
    homeOdds: manualValues.homeOdds,
    drawOdds: manualValues.drawOdds,
    overOdds: manualValues.overOdds,
    underOdds: manualValues.underOdds
  };

}

function getSportsWagerManualValues_(
  game,
  wagerMarket,
  oddsMode
) {

  const values = {
    awayOdds: "",
    homeOdds: "",
    drawOdds: "",
    awayLine: "",
    homeLine: "",
    totalPoints: "",
    overOdds: "",
    underOdds: ""
  };

  if (oddsMode !== "manual") {
    return values;
  }

  game =
    game || {};

  if (
    wagerMarket === "moneyline" ||
    wagerMarket === "soccer-moneyline"
  ) {

    values.awayOdds =
      prompt(
        "Away moneyline odds for " +
        (game.AwayTeam || "Away"),
        "2"
      );

    if (values.awayOdds === null) {
      return null;
    }

    if (wagerMarket === "soccer-moneyline") {

      values.drawOdds =
        prompt(
          "Draw odds",
          "3"
        );

      if (values.drawOdds === null) {
        return null;
      }

    }

    values.homeOdds =
      prompt(
        "Home moneyline odds for " +
        (game.HomeTeam || "Home"),
        "2"
      );

    if (values.homeOdds === null) {
      return null;
    }

  }

  if (wagerMarket === "spread") {

    values.awayLine =
      prompt(
        "Away spread line for " +
        (game.AwayTeam || "Away") +
        "\nExample: +1.5 or -1.5",
        "+1.5"
      );

    if (values.awayLine === null) {
      return null;
    }

    values.awayOdds =
      prompt(
        "Away spread odds for " +
        (game.AwayTeam || "Away"),
        "1.91"
      );

    if (values.awayOdds === null) {
      return null;
    }

    values.homeLine =
      prompt(
        "Home spread line for " +
        (game.HomeTeam || "Home") +
        "\nExample: -1.5 or +1.5",
        "-1.5"
      );

    if (values.homeLine === null) {
      return null;
    }

    values.homeOdds =
      prompt(
        "Home spread odds for " +
        (game.HomeTeam || "Home"),
        "1.91"
      );

    if (values.homeOdds === null) {
      return null;
    }

  }

  if (wagerMarket === "total") {

    values.totalPoints =
      prompt(
        "Total points/runs/goals line\nExample: 8.5",
        "8.5"
      );

    if (values.totalPoints === null) {
      return null;
    }

    values.overOdds =
      prompt(
        "Over odds",
        "1.91"
      );

    if (values.overOdds === null) {
      return null;
    }

    values.underOdds =
      prompt(
        "Under odds",
        "1.91"
      );

    if (values.underOdds === null) {
      return null;
    }

  }

  return values;

}

function buildSportsWagerPayload_(
  session,
  awardsGameId,
  game,
  config
) {

  return {
    username:
      session.username,

    token:
      session.token,

    gameId:
      awardsGameId,

    awardsGameId:
      awardsGameId,

    sportsGameId:
      game.GameId ||
      game.sportsGameId ||
      "",

    espnEventId:
      game.ESPNEventId ||
      game.espnEventId ||
      "",

    wagerMarket:
      config.wagerMarket,

    market:
      config.wagerMarket,

    oddsMode:
      config.oddsMode,

    awayLine:
      config.awayLine,

    homeLine:
      config.homeLine,

    totalPoints:
      config.totalPoints,

    awayOdds:
      config.awayOdds,

    homeOdds:
      config.homeOdds,

    drawOdds:
      config.drawOdds,

    overOdds:
      config.overOdds,

    underOdds:
      config.underOdds,

    autoOdds:
      config.autoOdds,

    refreshEngineFirst:
      "true",

    scoreRefreshMode:
      "window",

    daysBack:
      2,

    daysForward:
      2
  };

}

async function createSelectedSportsWagers() {

  if (sportsScoresState.creatingWager) {
    return;
  }

  const selected =
    getSelectedSportsWagerGames_();

  if (!selected.length) {
    alert("Select at least one sports game first.");
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

  sportsScoresState.creatingWager =
    true;

  try {

    const awardsGameId =
      await chooseSportsAwardsGameId_(
        session
      );

    if (!awardsGameId) {
      return;
    }

    const selectedScores =
      selected.map(function(item) {
        return item.score || item;
      });

    const config =
      buildSportsWagerCreateConfig_(
        selectedScores
      );

    if (!config) {
      return;
    }

    const confirmed =
      confirm(
        "Create " +
        selected.length +
        " wager" +
        (selected.length === 1 ? "" : "s") +
        " in Awards Game: " +
        awardsGameId +
        "\n\nMarket: " +
        config.wagerMarket +
        "\nOdds Group: " +
        config.oddsMode +
        "\n\nContinue?"
      );

    if (!confirmed) {
      return;
    }

    setSportsStatus(
      "Creating " +
      selected.length +
      " sports wager" +
      (selected.length === 1 ? "" : "s") +
      "..."
    );

    const selectedGamesJson =
      JSON.stringify(
        selected.map(function(item) {
          return {
            sportsGameId:
              item.sportsGameId,
            espnEventId:
              item.espnEventId
          };
        })
      );

    const res =
      await sportsAwardsApi_(
        "adminCreateSportsWagersBulk",
        {
          username:
            session.username,

          token:
            session.token,

          gameId:
            awardsGameId,

          awardsGameId:
            awardsGameId,

          selectedGamesJson:
            selectedGamesJson,

          wagerMarket:
            config.wagerMarket,

          market:
            config.wagerMarket,

          oddsMode:
            config.oddsMode,

          awayLine:
            config.awayLine,

          homeLine:
            config.homeLine,

          totalPoints:
            config.totalPoints,

          awayOdds:
            config.awayOdds,

          homeOdds:
            config.homeOdds,

          drawOdds:
            config.drawOdds,

          overOdds:
            config.overOdds,

          underOdds:
            config.underOdds,

          autoOdds:
            config.autoOdds,

          refreshEngineFirst:
            "true",

          scoreRefreshMode:
            "window",

          daysBack:
            2,

          daysForward:
            2
        }
      );

    if (
      !res ||
      res.success === false
    ) {

      const failedText =
        res && Array.isArray(res.failed) && res.failed.length
          ? "\n\nFirst error: " +
            (res.failed[0].message || res.failed[0].error || "Unknown error")
          : "";

      throw new Error(
        (
          res && (res.message || res.error)
            ? res.message || res.error
            : "Bulk wager creation failed."
        ) + failedText
      );

    }

    setSportsStatus(
      res.message ||
      "Bulk wagers created."
    );

    alert(
      res.message ||
      "Bulk wagers created."
    );

    toggleAllSportsWagerSelections_(
      false
    );

    await loadSportsScores(
      buildSportsFiltersFromControls()
    );

  } catch (err) {

    showSportsError(
      err && err.message
        ? err.message
        : "Could not create selected wagers."
    );

    setSportsStatus(
      "Could not create selected wagers."
    );

  } finally {

    sportsScoresState.creatingWager =
      false;

  }

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

  if (sportsScoresState.creatingWager) {
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

  sportsScoresState.creatingWager =
    true;

  try {

    const awardsGameId =
      await chooseSportsAwardsGameId_(
        session
      );

    if (!awardsGameId) {
      return;
    }

    const config =
      buildSportsWagerCreateConfig_(
        [game]
      );

    if (!config) {
      return;
    }

    setSportsStatus(
      "Creating " +
      config.wagerMarket +
      " wager for " +
      game.AwayTeam +
      " @ " +
      game.HomeTeam +
      "..."
    );

    const res =
      await sportsAwardsApi_(
        "adminCreateSportsWager",
        buildSportsWagerPayload_(
          session,
          awardsGameId,
          game,
          config
        )
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
      config.wagerMarket +
      " wager: " +
      (res.category || res.categoryId) +
      "."
    );

    alert(
      "Wager created.\n\nMarket: " +
      config.wagerMarket +
      "\nOdds Source: " +
      (res.oddsSource || config.oddsMode)
    );

    await loadSportsScores(
      buildSportsFiltersFromControls()
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
 SPORTS ADMIN HELP POPOVERS
 Uses the same fixed-position, mobile-safe behavior as Manage Games.
************************************/

function sportsHelpButton_(title, message) {
  return `
    <span class="sports-help-wrap">
      <button
        type="button"
        class="sports-help-button"
        aria-label="Help: ${escapeSportsHtml(title)}"
        aria-expanded="false"
        onclick="sportsToggleHelpPopover_(event, this)"
      >?</button>
      <span class="sports-help-popover" role="tooltip" hidden>
        <strong>${escapeSportsHtml(title)}</strong>
        <span>${escapeSportsHtml(message)}</span>
      </span>
    </span>
  `;
}

function sportsFieldLabel_(title, message) {
  return `
    <span class="sports-field-label">
      <span>${escapeSportsHtml(title)}</span>
      ${message ? sportsHelpButton_(title, message) : ""}
    </span>
  `;
}

function sportsGetHelpPopover_(button) {
  return button && (button.__sportsHelpPopover || button.nextElementSibling) || null;
}

function sportsRestoreHelpPopover_(button, popover) {
  if (!popover) return;
  const wrap = button && button.isConnected ? button.closest(".sports-help-wrap") : null;
  if (wrap) wrap.appendChild(popover);
  else if (popover.parentNode) popover.parentNode.removeChild(popover);
}

function sportsCloseHelpPopovers_(exceptButton) {
  document.querySelectorAll(".sports-help-button[aria-expanded='true']")
    .forEach(function(button) {
      if (button === exceptButton) return;
      button.setAttribute("aria-expanded", "false");
      const popover = sportsGetHelpPopover_(button);
      if (!popover) return;
      popover.hidden = true;
      popover.classList.remove("is-open");
      popover.removeAttribute("data-placement");
      popover.style.cssText = "";
      sportsRestoreHelpPopover_(button, popover);
    });
  if (!exceptButton) window.__sportsActiveHelpButton = null;
}

function sportsClampHelpValue_(value, minimum, maximum) {
  if (maximum < minimum) return minimum;
  return Math.min(Math.max(value, minimum), maximum);
}

function sportsPositionHelpPopover_(button, popover) {
  if (!button || !popover || popover.hidden || !button.isConnected) return;
  const rect = button.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportWidth = Math.max(240, viewport ? viewport.width : window.innerWidth);
  const viewportHeight = Math.max(240, viewport ? viewport.height : window.innerHeight);
  const margin = 10;
  const gap = 10;

  popover.style.maxWidth = Math.max(200, viewportWidth - margin * 2) + "px";
  popover.style.maxHeight = Math.max(150, viewportHeight - margin * 2) + "px";
  popover.style.left = margin + "px";
  popover.style.top = margin + "px";
  popover.style.visibility = "hidden";

  const popoverRect = popover.getBoundingClientRect();
  const width = Math.min(popoverRect.width, viewportWidth - margin * 2);
  const height = Math.min(popoverRect.height, viewportHeight - margin * 2);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const candidates = [
    { placement: "right", left: rect.right + gap, top: centerY - height / 2, preference: 4 },
    { placement: "left", left: rect.left - width - gap, top: centerY - height / 2, preference: 3 },
    { placement: "below", left: centerX - width / 2, top: rect.bottom + gap, preference: 2 },
    { placement: "above", left: centerX - width / 2, top: rect.top - height - gap, preference: 1 }
  ];
  let best = null;
  candidates.forEach(function(candidate) {
    const visibleWidth = Math.max(0, Math.min(viewportWidth - margin, candidate.left + width) - Math.max(margin, candidate.left));
    const visibleHeight = Math.max(0, Math.min(viewportHeight - margin, candidate.top + height) - Math.max(margin, candidate.top));
    const fullyVisible = visibleWidth >= width - 1 && visibleHeight >= height - 1;
    const score = visibleWidth * visibleHeight + (fullyVisible ? 1000000 : 0) + candidate.preference;
    if (!best || score > best.score) best = Object.assign({}, candidate, { score: score });
  });

  const left = sportsClampHelpValue_(best.left, margin, viewportWidth - width - margin);
  const top = sportsClampHelpValue_(best.top, margin, viewportHeight - height - margin);
  const arrowOffset = best.placement === "left" || best.placement === "right"
    ? sportsClampHelpValue_(centerY - top, 16, Math.max(16, height - 16))
    : sportsClampHelpValue_(centerX - left, 16, Math.max(16, width - 16));

  popover.dataset.placement = best.placement;
  popover.style.left = Math.round(left) + "px";
  popover.style.top = Math.round(top) + "px";
  popover.style.setProperty("--sports-help-arrow-offset", Math.round(arrowOffset) + "px");
  popover.style.visibility = "visible";
}

function sportsScheduleHelpPopoverPosition_() {
  if (window.__sportsHelpPositionFrame) cancelAnimationFrame(window.__sportsHelpPositionFrame);
  window.__sportsHelpPositionFrame = requestAnimationFrame(function() {
    window.__sportsHelpPositionFrame = null;
    const button = window.__sportsActiveHelpButton;
    const popover = sportsGetHelpPopover_(button);
    if (button && popover && button.getAttribute("aria-expanded") === "true") {
      sportsPositionHelpPopover_(button, popover);
    }
  });
}

function sportsToggleHelpPopover_(event, button) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!button) return;
  const popover = sportsGetHelpPopover_(button);
  if (!popover) return;
  button.__sportsHelpPopover = popover;
  const willOpen = button.getAttribute("aria-expanded") !== "true";
  sportsCloseHelpPopovers_(willOpen ? button : null);
  button.setAttribute("aria-expanded", willOpen ? "true" : "false");
  popover.hidden = !willOpen;
  popover.classList.toggle("is-open", willOpen);
  if (!willOpen) {
    window.__sportsActiveHelpButton = null;
    sportsRestoreHelpPopover_(button, popover);
    return;
  }
  window.__sportsActiveHelpButton = button;
  if (popover.parentElement !== document.body) document.body.appendChild(popover);
  sportsScheduleHelpPopoverPosition_();
}

if (
  typeof document !== "undefined" &&
  typeof window !== "undefined" &&
  typeof window.addEventListener === "function" &&
  !window.__sportsHelpDismissBound
) {
  window.__sportsHelpDismissBound = true;
  document.addEventListener("click", function(event) {
    if (!event.target.closest(".sports-help-button") && !event.target.closest(".sports-help-popover")) {
      sportsCloseHelpPopovers_();
    }
  });
  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") sportsCloseHelpPopovers_();
  });
  window.addEventListener("resize", sportsScheduleHelpPopoverPosition_);
  window.addEventListener("scroll", sportsScheduleHelpPopoverPosition_, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", sportsScheduleHelpPopoverPosition_);
    window.visualViewport.addEventListener("scroll", sportsScheduleHelpPopoverPosition_);
  }
}

/************************************
 PLAYER PROP CREATION
 Admin workflow for supported team leagues.
************************************/

function sportsPlayerPropsSupported_(game) {
  const league = sportsAdvancedLeagueKey_(game && game.League);
  let sport = String(game && game.Sport || "").trim().toLowerCase();
  const leagueSports = {
    mlb: "baseball", nfl: "football", "college-football": "football",
    nba: "basketball", wnba: "basketball",
    "mens-college-basketball": "basketball",
    "womens-college-basketball": "basketball", nhl: "hockey"
  };
  if (!sport) sport = leagueSports[league] || (league && league.indexOf(".") !== -1 ? "soccer" : "");
  if (["baseball", "football", "basketball", "hockey", "soccer"].indexOf(sport) === -1) {
    return false;
  }
  if (sport === "soccer") return !!league;
  return [
    "mlb", "nfl", "college-football", "nba", "wnba",
    "mens-college-basketball", "womens-college-basketball", "nhl"
  ].indexOf(league) !== -1;
}

function sportsAdvancedQuestionsSupported_(game) {
  return sportsPlayerPropsSupported_(game);
}

function sportsAdvancedQuestionPlayersSupported_(game) {
  return sportsPlayerPropsSupported_(game);
}

function renderCreatePlayerPropButton(game) {

  const session =
    getSportsStoredSession_();

  if (!sportsSessionIsAdmin_(session)) {
    return "";
  }

  if (
    !game ||
    !game.GameId ||
    !game.HomeTeam ||
    !game.AwayTeam ||
    !sportsPlayerPropsSupported_(game)
  ) {
    return "";
  }

  return `
    <button
      class="small-btn player-prop-btn"
      data-create-player-prop-game-id="${escapeSportsHtml(game.GameId || "")}"
    >
      Create Player Prop
    </button>
  `;

}


function renderCreatePlayerMatchupButton(game) {
  const session = getSportsStoredSession_();
  if (!sportsSessionIsAdmin_(session)) return "";
  if (
    !game ||
    !game.GameId ||
    !game.HomeTeam ||
    !game.AwayTeam ||
    !sportsPlayerPropsSupported_(game)
  ) {
    return "";
  }
  return `
    <button
      class="small-btn player-matchup-btn"
      data-create-player-matchup-game-id="${escapeSportsHtml(game.GameId || "")}"
    >
      Create Player Matchup
    </button>
  `;
}

function renderCreateAdvancedQuestionButton(game) {
  const session = getSportsStoredSession_();
  if (!sportsSessionIsAdmin_(session)) return "";
  if (
    !game ||
    !game.GameId ||
    !game.HomeTeam ||
    !game.AwayTeam ||
    !sportsAdvancedQuestionsSupported_(game)
  ) {
    return "";
  }
  return `
    <button
      class="small-btn sports-advanced-question-btn"
      data-create-advanced-question-game-id="${escapeSportsHtml(game.GameId || "")}"
    >
      Create Stat Comparison
    </button>
  `;
}

function normalizeSportsPlayerTeamKey_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sportsPlayerTeamMatchesGame_(player, game) {
  const playerTeam = normalizeSportsPlayerTeamKey_(
    player && (player.Team || player.TeamName)
  );
  const home = normalizeSportsPlayerTeamKey_(game && game.HomeTeam);
  const away = normalizeSportsPlayerTeamKey_(game && game.AwayTeam);

  if (!playerTeam) {
    return false;
  }

  return [home, away].some(function(team) {
    if (!team) {
      return false;
    }

    return (
      playerTeam === team ||
      playerTeam.indexOf(team) !== -1 ||
      team.indexOf(playerTeam) !== -1
    );
  });
}

function sportsPlayerPropPlayerLabel_(player) {
  const name =
    String(
      player &&
      (player.FullName || player.ShortName || player.PlayerName) ||
      "Unknown Player"
    ).trim();

  const team =
    String(player && (player.Team || player.TeamName) || "")
      .trim();

  const position =
    String(player && player.Position || "")
      .trim();

  return [
    team,
    name,
    position ? "(" + position + ")" : ""
  ].filter(Boolean).join(" — ");
}

async function getSportsPlayerPropOptions_(session, game, options) {
  options = options || {};
  const result =
    await sportsAwardsApi_(
      "adminGetSportsPlayerPropPlayers",
      {
        username: session.username,
        token: session.token,
        league: game.League,
        sport: game.Sport,
        limit: 2000
      }
    );

  if (!result || result.success === false) {
    throw new Error(
      (result && (result.error || result.message || result.reason)) ||
      "Could not load players from the Sports Scores Engine."
    );
  }

  const allPlayers =
    Array.isArray(result.players)
      ? result.players
      : [];

  const gamePlayers =
    allPlayers
      .filter(function(player) {
        return options.allLeague === true || sportsPlayerTeamMatchesGame_(player, game);
      })
      .sort(function(a, b) {
        const teamCompare =
          String(a.Team || "")
            .localeCompare(String(b.Team || ""));

        if (teamCompare) {
          return teamCompare;
        }

        return String(a.FullName || a.ShortName || "")
          .localeCompare(String(b.FullName || b.ShortName || ""));
      });

  if (!gamePlayers.length) {
    throw new Error(
      "No synced players matched " +
      (game.AwayTeam || "Away") +
      " or " +
      (game.HomeTeam || "Home") +
      ". Open Sports Controls and run Sync Players for " +
      String(game.League || "this league").toUpperCase() +
      "."
    );
  }

  return {
    players: gamePlayers,
    statTypes:
      Array.isArray(result.statTypes)
        ? result.statTypes
        : []
  };
}

function showSportsPlayerPropModal_(game, awardsGameId, options) {

  return new Promise(function(resolve) {

    const existing =
      document.getElementById("sportsPlayerPropOverlay");

    if (existing) {
      existing.remove();
    }

    const players =
      Array.isArray(options && options.players)
        ? options.players
        : [];

    const statTypes =
      Array.isArray(options && options.statTypes)
        ? options.statTypes
        : [];

    const playerOptions =
      players.map(function(player) {
        const playerId =
          String(player.PlayerId || player.ESPNPlayerId || "")
            .trim();

        return (
          '<option value="' +
          escapeSportsHtml(playerId) +
          '">' +
          escapeSportsHtml(sportsPlayerPropPlayerLabel_(player)) +
          '</option>'
        );
      }).join("");

    const statOptions =
      statTypes.map(function(stat) {
        return (
          '<option value="' +
          escapeSportsHtml(stat.value || "") +
          '">' +
          escapeSportsHtml(stat.label || stat.value || "") +
          '</option>'
        );
      }).join("");

    const overlay =
      document.createElement("div");

    overlay.id =
      "sportsPlayerPropOverlay";

    overlay.className =
      "sports-player-prop-overlay";

    overlay.innerHTML = `
      <div class="sports-player-prop-modal">
        <h3>Create Player Prop</h3>

        <p class="sports-player-prop-game">
          ${escapeSportsHtml(game.AwayTeam || "Away")}
          @
          ${escapeSportsHtml(game.HomeTeam || "Home")}
        </p>

        <p class="sports-player-prop-destination">
          Awards Game: <strong>${escapeSportsHtml(awardsGameId)}</strong>
        </p>

        <form id="sportsPlayerPropForm">
          <label class="sports-player-prop-field">
            ${sportsFieldLabel_("Player", "Choose the athlete whose final game statistic will be compared with the line.")}
            <select id="sportsPlayerPropPlayer" required>
              ${playerOptions}
            </select>
          </label>

          <label class="sports-player-prop-field">
            ${sportsFieldLabel_("Statistic", "Choose the player statistic that the Sports Scores Engine will track and settle.")}
            <select id="sportsPlayerPropStat" required>
              ${statOptions}
            </select>
          </label>

          <label class="sports-player-prop-field">
            ${sportsFieldLabel_("Over / Under Line", "The exact number the player must finish above or below. An exact tie becomes a push.")}
            <input
              id="sportsPlayerPropLine"
              type="number"
              min="0"
              step="0.5"
              inputmode="decimal"
              placeholder="Example: 275.5"
              required
            >
          </label>

          <div class="sports-player-prop-odds-grid">
            <label class="sports-player-prop-field">
              ${sportsFieldLabel_("Over Odds", "Decimal odds for the Over selection. Example: 1.91 returns 1.91 times the wager, including stake.")}
              <input
                id="sportsPlayerPropOverOdds"
                type="number"
                min="1.01"
                step="0.01"
                inputmode="decimal"
                value="1.91"
                required
              >
            </label>

            <label class="sports-player-prop-field">
              ${sportsFieldLabel_("Under Odds", "Decimal odds for the Under selection. Example: 1.91 returns 1.91 times the wager, including stake.")}
              <input
                id="sportsPlayerPropUnderOdds"
                type="number"
                min="1.01"
                step="0.01"
                inputmode="decimal"
                value="1.91"
                required
              >
            </label>
          </div>

          <div id="sportsPlayerPropPreview" class="sports-player-prop-preview"></div>

          <div class="sports-player-prop-actions">
            <button
              type="button"
              class="small-btn"
              id="sportsPlayerPropCancel"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="small-btn player-prop-btn"
            >
              Create Player Prop
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const form =
      document.getElementById("sportsPlayerPropForm");

    const playerSelect =
      document.getElementById("sportsPlayerPropPlayer");

    const statSelect =
      document.getElementById("sportsPlayerPropStat");

    const lineInput =
      document.getElementById("sportsPlayerPropLine");

    const overOddsInput =
      document.getElementById("sportsPlayerPropOverOdds");

    const underOddsInput =
      document.getElementById("sportsPlayerPropUnderOdds");

    const preview =
      document.getElementById("sportsPlayerPropPreview");

    function updatePreview() {
      const playerText =
        playerSelect.options[playerSelect.selectedIndex]
          ? playerSelect.options[playerSelect.selectedIndex].text
          : "Player";

      const statText =
        statSelect.options[statSelect.selectedIndex]
          ? statSelect.options[statSelect.selectedIndex].text
          : "Statistic";

      const line =
        String(lineInput.value || "").trim();

      preview.textContent =
        line
          ? "Question: Will " + playerText + " record over " + line + " " + statText.toLowerCase() + "?"
          : "Enter a line to preview the question.";
    }

    function close(value) {
      sportsCloseHelpPopovers_();
      overlay.remove();
      resolve(value || null);
    }

    [playerSelect, statSelect, lineInput]
      .forEach(function(control) {
        control.addEventListener("input", updatePreview);
        control.addEventListener("change", updatePreview);
      });

    document
      .getElementById("sportsPlayerPropCancel")
      .addEventListener("click", function() {
        close(null);
      });

    form.addEventListener("submit", function(event) {
      event.preventDefault();

      const line =
        Number(lineInput.value);

      const overOdds =
        Number(overOddsInput.value);

      const underOdds =
        Number(underOddsInput.value);

      if (!isFinite(line) || line < 0) {
        alert("Enter a valid player-prop line.");
        return;
      }

      if (
        !isFinite(overOdds) ||
        !isFinite(underOdds) ||
        overOdds <= 1 ||
        underOdds <= 1
      ) {
        alert("Over and Under decimal odds must be greater than 1.00.");
        return;
      }

      close({
        sportsPlayerId: playerSelect.value,
        sportsStatType: statSelect.value,
        sportsPropLine: line,
        overOdds: overOdds,
        underOdds: underOdds
      });
    });

    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) {
        close(null);
      }
    });

    updatePreview();
    lineInput.focus();
  });
}

async function createSportsPlayerPropFromCard(gameId) {

  if (
    sportsScoresState.creatingWager ||
    sportsScoresState.creatingPlayerProp
  ) {
    return;
  }

  const game =
    sportsScoresState.scores.find(function(item) {
      return item.GameId === gameId;
    });

  if (!game) {
    showSportsError("Could not find selected sports game.");
    return;
  }

  if (!sportsPlayerPropsSupported_(game)) {
    showSportsError("Player statistics are not enabled for this league or sport.");
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

  sportsScoresState.creatingPlayerProp =
    true;

  try {
    const awardsGameId =
      await chooseSportsAwardsGameId_(session);

    if (!awardsGameId) {
      return;
    }

    setSportsStatus(
      "Loading " +
      String(game.League || "").toUpperCase() +
      " players for " +
      game.AwayTeam +
      " @ " +
      game.HomeTeam +
      "..."
    );

    const options =
      await getSportsPlayerPropOptions_(session, game);

    const config =
      await showSportsPlayerPropModal_(
        game,
        awardsGameId,
        options
      );

    if (!config) {
      setSportsStatus("Player prop creation canceled.");
      return;
    }

    setSportsStatus("Creating player prop...");

    const result =
      await sportsAwardsApi_(
        "adminCreateSportsPlayerProp",
        {
          username: session.username,
          token: session.token,
          awardsGameId: awardsGameId,
          gameId: awardsGameId,
          sportsGameId: game.GameId,
          espnEventId: game.ESPNEventId,
          league: game.League,
          sport: game.Sport,
          sportsPlayerId: config.sportsPlayerId,
          sportsStatType: config.sportsStatType,
          sportsPropLine: config.sportsPropLine,
          overOdds: config.overOdds,
          underOdds: config.underOdds
        }
      );

    if (!result || result.success === false) {
      if (result && result.duplicate) {
        throw new Error(
          result.message ||
          "This player prop already exists in the selected Awards Game."
        );
      }

      throw new Error(
        (result && (result.error || result.message || result.reason)) ||
        "Could not create player prop."
      );
    }

    setSportsStatus(
      "Created player prop: " +
      (result.category || result.categoryId) +
      "."
    );

    alert(
      "Player prop created.\n\n" +
      (result.category || "") +
      "\nOver: " +
      result.overOdds +
      "\nUnder: " +
      result.underOdds
    );

    await loadSportsScores(
      buildSportsFiltersFromControls()
    );

  } catch (err) {
    showSportsError(
      err && err.message
        ? err.message
        : "Could not create player prop."
    );

    setSportsStatus("Could not create player prop.");
  } finally {
    sportsScoresState.creatingPlayerProp =
      false;
  }
}


/************************************
 PLAYER MATCHUP CREATION
 Two or more players, one shared stat.
 Creates either Picks or Bets questions.
************************************/

async function getSportsPlayerMatchupDestinationGames_(session, questionMode) {
  if (questionMode === "wager") {
    const wagerResult = await apiAdminGetSportsWagerGames_(session);
    if (!wagerResult || wagerResult.success === false) {
      throw new Error(
        (wagerResult && (wagerResult.error || wagerResult.message)) ||
        "Could not load wager-enabled Awards Games."
      );
    }
    return Array.isArray(wagerResult.games) ? wagerResult.games : [];
  }

  const predictionResult = await sportsAwardsApi_(
    "adminGetGames",
    {
      username: session.username,
      token: session.token
    }
  );

  if (!predictionResult || predictionResult.success === false) {
    throw new Error(
      (predictionResult && (predictionResult.error || predictionResult.message)) ||
      "Could not load prediction-enabled Awards Games."
    );
  }

  return (Array.isArray(predictionResult.games) ? predictionResult.games : [])
    .filter(function(game) {
      return game && game.active !== false && game.predictionEnabled === true;
    });
}

function showSportsPlayerMatchupDestinationModal_(games, questionMode) {
  return new Promise(function(resolve) {
    const existing = document.getElementById("sportsPlayerMatchupDestinationOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "sportsPlayerMatchupDestinationOverlay";
    overlay.className = "sports-player-prop-overlay";

    const optionsHtml = (games || []).map(function(game) {
      const gameId = String(game.gameId || game.GameId || "").trim();
      const name = String(game.name || game.Name || gameId).trim();
      return '<option value="' + escapeSportsHtml(gameId) + '">' +
        escapeSportsHtml(name + " — " + gameId) +
        '</option>';
    }).join("");

    overlay.innerHTML = `
      <div class="sports-player-prop-modal sports-player-matchup-destination">
        <h3>Choose Destination Game</h3>
        <p>
          This matchup will appear on the
          <strong>${questionMode === "wager" ? "Wagers" : "Make Your Picks"}</strong>
          page.
        </p>
        <label class="sports-player-prop-field">
          <span>Awards Game</span>
          <select id="sportsPlayerMatchupDestinationSelect">${optionsHtml}</select>
        </label>
        <div class="sports-player-prop-actions">
          <button type="button" class="small-btn" id="sportsPlayerMatchupDestinationCancel">Cancel</button>
          <button type="button" class="small-btn player-matchup-btn" id="sportsPlayerMatchupDestinationConfirm">Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    function close(value) {
      overlay.remove();
      resolve(value || "");
    }
    document.getElementById("sportsPlayerMatchupDestinationCancel")
      .addEventListener("click", function() { close(""); });
    document.getElementById("sportsPlayerMatchupDestinationConfirm")
      .addEventListener("click", function() {
        const select = document.getElementById("sportsPlayerMatchupDestinationSelect");
        close(select ? select.value : "");
      });
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) close("");
    });
  });
}

function showSportsPlayerMatchupModal_(game, options) {
  return new Promise(function(resolve) {
    const existing = document.getElementById("sportsPlayerMatchupOverlay");
    if (existing) existing.remove();

    const players = Array.isArray(options && options.players) ? options.players : [];
    const statTypes = Array.isArray(options && options.statTypes) ? options.statTypes : [];
    const statOptions = statTypes.map(function(stat) {
      return '<option value="' + escapeSportsHtml(stat.value || "") + '">' +
        escapeSportsHtml(stat.label || stat.value || "") +
        '</option>';
    }).join("");

    const playerRows = players.map(function(player, index) {
      const playerId = String(player.PlayerId || player.ESPNPlayerId || "").trim();
      return `
        <label class="sports-player-matchup-player-row">
          <input
            type="checkbox"
            class="sports-player-matchup-checkbox"
            data-player-index="${index}"
            value="${escapeSportsHtml(playerId)}"
          >
          <img src="${escapeSportsHtml(player.HeadshotUrl || "")}" alt="">
          <span class="sports-player-matchup-player-name">${escapeSportsHtml(sportsPlayerPropPlayerLabel_(player))}</span>
          <input
            type="number"
            class="sports-player-matchup-odds"
            data-player-odds-index="${index}"
            min="1.01"
            step="0.01"
            value="1.91"
            aria-label="Decimal odds"
          >
        </label>
      `;
    }).join("");

    const overlay = document.createElement("div");
    overlay.id = "sportsPlayerMatchupOverlay";
    overlay.className = "sports-player-prop-overlay";
    overlay.innerHTML = `
      <div class="sports-player-prop-modal sports-player-matchup-modal">
        <h3>Create Player Matchup</h3>
        <p class="sports-player-prop-game">
          ${escapeSportsHtml(game.AwayTeam || "Away")} @ ${escapeSportsHtml(game.HomeTeam || "Home")}
        </p>
        <form id="sportsPlayerMatchupForm">
          <label class="sports-player-prop-field">
            ${sportsFieldLabel_("Question Type", "Highest Total compares 2–12 entries. Yes/No Threshold checks one player or team against a number.")}
            <select id="sportsPlayerMatchupMode">
              <option value="wager">Wager — writes to Bets</option>
              <option value="prediction">Prediction — writes to Picks</option>
            </select>
          </label>
          <label class="sports-player-prop-field">
            ${sportsFieldLabel_("Statistic", "Every selected entry must support the same statistic. Team and player stat choices are filtered automatically.")}
            <select id="sportsPlayerMatchupStat" required>${statOptions}</select>
          </label>
          <label class="sports-player-prop-field">
            ${sportsFieldLabel_("Question", "Leave blank to generate a question automatically, or enter the exact wording players should see.")}
            <input id="sportsPlayerMatchupQuestion" type="text" placeholder="Which player will record the most ...?">
          </label>
          <label class="sports-player-prop-field" id="sportsPlayerMatchupPointsField" hidden>
            ${sportsFieldLabel_("Prediction Points", "Points awarded for a correct prediction when this is created as a Prediction.")}
            <input id="sportsPlayerMatchupPoints" type="number" min="1" step="1" value="1">
          </label>
          <div class="sports-player-matchup-help">
            Select at least two players. For wagers, set decimal odds beside each selected player.
          </div>
          <div class="sports-player-matchup-player-list">${playerRows}</div>
          <div id="sportsPlayerMatchupPreview" class="sports-player-prop-preview"></div>
          <div class="sports-player-prop-actions">
            <button type="button" class="small-btn" id="sportsPlayerMatchupCancel">Cancel</button>
            <button type="submit" class="small-btn player-matchup-btn">Continue</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const form = document.getElementById("sportsPlayerMatchupForm");
    const modeSelect = document.getElementById("sportsPlayerMatchupMode");
    const statSelect = document.getElementById("sportsPlayerMatchupStat");
    const questionInput = document.getElementById("sportsPlayerMatchupQuestion");
    const pointsField = document.getElementById("sportsPlayerMatchupPointsField");
    const pointsInput = document.getElementById("sportsPlayerMatchupPoints");
    const preview = document.getElementById("sportsPlayerMatchupPreview");

    function selectedRows() {
      return Array.from(overlay.querySelectorAll(".sports-player-matchup-checkbox:checked"));
    }

    function updateMode() {
      const isWager = modeSelect.value === "wager";
      pointsField.hidden = isWager;
      overlay.querySelectorAll(".sports-player-matchup-odds")
        .forEach(function(input) {
          input.hidden = !isWager;
          input.disabled = !isWager;
        });
      updatePreview();
    }

    function updatePreview() {
      const selected = selectedRows();
      const statText = statSelect.options[statSelect.selectedIndex]
        ? statSelect.options[statSelect.selectedIndex].text
        : "statistic";
      const customQuestion = String(questionInput.value || "").trim();
      const question = customQuestion || ("Which player will record the most " + statText.toLowerCase() + "?");
      preview.textContent =
        question + " — " + selected.length + " player" + (selected.length === 1 ? "" : "s") +
        " selected — " + (modeSelect.value === "wager" ? "Bets" : "Picks");
    }

    function close(value) {
      overlay.remove();
      resolve(value || null);
    }

    modeSelect.addEventListener("change", updateMode);
    statSelect.addEventListener("change", updatePreview);
    questionInput.addEventListener("input", updatePreview);
    overlay.querySelectorAll(".sports-player-matchup-checkbox")
      .forEach(function(input) { input.addEventListener("change", updatePreview); });
    document.getElementById("sportsPlayerMatchupCancel")
      .addEventListener("click", function() { close(null); });

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const selected = selectedRows();
      if (selected.length < 2) {
        alert("Select at least two players.");
        return;
      }
      const questionMode = modeSelect.value === "prediction" ? "prediction" : "wager";
      let invalidOdds = false;
      const selectedPlayers = selected.map(function(checkbox) {
        const index = Number(checkbox.getAttribute("data-player-index"));
        const player = players[index] || {};
        const oddsInput = overlay.querySelector('[data-player-odds-index="' + index + '"]');
        const odds = questionMode === "wager" ? Number(oddsInput && oddsInput.value) : "";
        if (questionMode === "wager" && (!isFinite(odds) || odds <= 1)) {
          invalidOdds = true;
        }
        return {
          playerId: player.PlayerId || player.ESPNPlayerId || checkbox.value,
          espnPlayerId: player.ESPNPlayerId || "",
          playerName: player.FullName || player.ShortName || "",
          odds: odds
        };
      });
      if (invalidOdds) {
        alert("Every selected player's decimal odds must be greater than 1.00.");
        return;
      }
      const points = Math.max(1, Number(pointsInput.value) || 1);
      close({
        questionMode: questionMode,
        sportsStatType: statSelect.value,
        categoryName: String(questionInput.value || "").trim(),
        points: points,
        players: selectedPlayers
      });
    });

    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) close(null);
    });
    updateMode();
    updatePreview();
  });
}

async function createSportsPlayerMatchupFromCard(gameId) {
  if (
    sportsScoresState.creatingWager ||
    sportsScoresState.creatingPlayerProp ||
    sportsScoresState.creatingPlayerMatchup
  ) {
    return;
  }

  const game = sportsScoresState.scores.find(function(item) {
    return item.GameId === gameId;
  });
  if (!game) {
    showSportsError("Could not find selected sports game.");
    return;
  }
  if (!sportsPlayerPropsSupported_(game)) {
    showSportsError("Player matchups are not enabled for this league or sport.");
    return;
  }

  const session = getSportsStoredSession_();
  if (!session.username || !session.token || !sportsSessionIsAdmin_(session)) {
    showSportsError("Log in as an admin in the main app first, then return to Sports.");
    return;
  }

  sportsScoresState.creatingPlayerMatchup = true;
  try {
    setSportsStatus("Loading players for matchup...");
    const options = await getSportsPlayerPropOptions_(session, game);
    const config = await showSportsPlayerMatchupModal_(game, options);
    if (!config) {
      setSportsStatus("Player matchup creation canceled.");
      return;
    }

    const destinationGames = await getSportsPlayerMatchupDestinationGames_(session, config.questionMode);
    if (!destinationGames.length) {
      throw new Error(
        config.questionMode === "wager"
          ? "No active wager-enabled Awards Games were found."
          : "No active prediction-enabled Awards Games were found."
      );
    }
    const awardsGameId = await showSportsPlayerMatchupDestinationModal_(destinationGames, config.questionMode);
    if (!awardsGameId) {
      setSportsStatus("Player matchup creation canceled.");
      return;
    }

    setSportsStatus("Creating player matchup...");
    const result = await sportsAwardsApi_(
      "adminCreateSportsPlayerMatchup",
      {
        username: session.username,
        token: session.token,
        awardsGameId: awardsGameId,
        gameId: awardsGameId,
        sportsGameId: game.GameId,
        espnEventId: game.ESPNEventId,
        league: game.League,
        sport: game.Sport,
        sportsStatType: config.sportsStatType,
        questionMode: config.questionMode,
        categoryName: config.categoryName,
        points: config.points,
        playersJSON: JSON.stringify(config.players)
      }
    );

    if (!result || result.success === false) {
      throw new Error(
        (result && (result.error || result.message || result.reason)) ||
        "Could not create player matchup."
      );
    }

    setSportsStatus("Created player matchup: " + (result.category || result.categoryId) + ".");
    alert(
      "Player matchup created.\n\n" +
      (result.category || "") + "\n" +
      "Mode: " + (result.questionMode === "wager" ? "Wager / Bets" : "Prediction / Picks") + "\n" +
      "Players: " + result.playerCount
    );
    await loadSportsScores(buildSportsFiltersFromControls());
  } catch (err) {
    showSportsError(err && err.message ? err.message : "Could not create player matchup.");
    setSportsStatus("Could not create player matchup.");
  } finally {
    sportsScoresState.creatingPlayerMatchup = false;
  }
}

/************************************
 ADVANCED SPORTS STAT QUESTIONS v1.3
 Cross-game players/teams and checkpoints.
************************************/

const SPORTS_ADVANCED_TEAM_META = {
  mlb: {
    "arizona diamondbacks": ["ARI", "NL West"],
    "athletics": ["ATH", "AL West"],
    "oakland athletics": ["OAK", "AL West"],
    "sacramento athletics": ["ATH", "AL West"],
    "atlanta braves": ["ATL", "NL East"],
    "baltimore orioles": ["BAL", "AL East"],
    "boston red sox": ["BOS", "AL East"],
    "chicago cubs": ["CHC", "NL Central"],
    "chicago white sox": ["CWS", "AL Central"],
    "cincinnati reds": ["CIN", "NL Central"],
    "cleveland guardians": ["CLE", "AL Central"],
    "colorado rockies": ["COL", "NL West"],
    "detroit tigers": ["DET", "AL Central"],
    "houston astros": ["HOU", "AL West"],
    "kansas city royals": ["KC", "AL Central"],
    "los angeles angels": ["LAA", "AL West"],
    "los angeles dodgers": ["LAD", "NL West"],
    "miami marlins": ["MIA", "NL East"],
    "milwaukee brewers": ["MIL", "NL Central"],
    "minnesota twins": ["MIN", "AL Central"],
    "new york mets": ["NYM", "NL East"],
    "new york yankees": ["NYY", "AL East"],
    "philadelphia phillies": ["PHI", "NL East"],
    "pittsburgh pirates": ["PIT", "NL Central"],
    "san diego padres": ["SD", "NL West"],
    "san francisco giants": ["SF", "NL West"],
    "seattle mariners": ["SEA", "AL West"],
    "st louis cardinals": ["STL", "NL Central"],
    "tampa bay rays": ["TB", "AL East"],
    "texas rangers": ["TEX", "AL West"],
    "toronto blue jays": ["TOR", "AL East"],
    "washington nationals": ["WSH", "NL East"]
  },
  nfl: {
    "arizona cardinals": ["ARI", "NFC West"],
    "atlanta falcons": ["ATL", "NFC South"],
    "baltimore ravens": ["BAL", "AFC North"],
    "buffalo bills": ["BUF", "AFC East"],
    "carolina panthers": ["CAR", "NFC South"],
    "chicago bears": ["CHI", "NFC North"],
    "cincinnati bengals": ["CIN", "AFC North"],
    "cleveland browns": ["CLE", "AFC North"],
    "dallas cowboys": ["DAL", "NFC East"],
    "denver broncos": ["DEN", "AFC West"],
    "detroit lions": ["DET", "NFC North"],
    "green bay packers": ["GB", "NFC North"],
    "houston texans": ["HOU", "AFC South"],
    "indianapolis colts": ["IND", "AFC South"],
    "jacksonville jaguars": ["JAX", "AFC South"],
    "kansas city chiefs": ["KC", "AFC West"],
    "las vegas raiders": ["LV", "AFC West"],
    "los angeles chargers": ["LAC", "AFC West"],
    "los angeles rams": ["LAR", "NFC West"],
    "miami dolphins": ["MIA", "AFC East"],
    "minnesota vikings": ["MIN", "NFC North"],
    "new england patriots": ["NE", "AFC East"],
    "new orleans saints": ["NO", "NFC South"],
    "new york giants": ["NYG", "NFC East"],
    "new york jets": ["NYJ", "AFC East"],
    "philadelphia eagles": ["PHI", "NFC East"],
    "pittsburgh steelers": ["PIT", "AFC North"],
    "san francisco 49ers": ["SF", "NFC West"],
    "seattle seahawks": ["SEA", "NFC West"],
    "tampa bay buccaneers": ["TB", "NFC South"],
    "tennessee titans": ["TEN", "AFC South"],
    "washington commanders": ["WSH", "NFC East"]
  },
  nhl: {
    "anaheim ducks": ["ANA", "Pacific"],
    "boston bruins": ["BOS", "Atlantic"],
    "buffalo sabres": ["BUF", "Atlantic"],
    "calgary flames": ["CGY", "Pacific"],
    "carolina hurricanes": ["CAR", "Metropolitan"],
    "chicago blackhawks": ["CHI", "Central"],
    "colorado avalanche": ["COL", "Central"],
    "columbus blue jackets": ["CBJ", "Metropolitan"],
    "dallas stars": ["DAL", "Central"],
    "detroit red wings": ["DET", "Atlantic"],
    "edmonton oilers": ["EDM", "Pacific"],
    "florida panthers": ["FLA", "Atlantic"],
    "los angeles kings": ["LAK", "Pacific"],
    "minnesota wild": ["MIN", "Central"],
    "montreal canadiens": ["MTL", "Atlantic"],
    "nashville predators": ["NSH", "Central"],
    "new jersey devils": ["NJD", "Metropolitan"],
    "new york islanders": ["NYI", "Metropolitan"],
    "new york rangers": ["NYR", "Metropolitan"],
    "ottawa senators": ["OTT", "Atlantic"],
    "philadelphia flyers": ["PHI", "Metropolitan"],
    "pittsburgh penguins": ["PIT", "Metropolitan"],
    "san jose sharks": ["SJS", "Pacific"],
    "seattle kraken": ["SEA", "Pacific"],
    "st louis blues": ["STL", "Central"],
    "tampa bay lightning": ["TBL", "Atlantic"],
    "toronto maple leafs": ["TOR", "Atlantic"],
    "utah mammoth": ["UTA", "Central"],
    "utah hockey club": ["UTA", "Central"],
    "vancouver canucks": ["VAN", "Pacific"],
    "vegas golden knights": ["VGK", "Pacific"],
    "washington capitals": ["WSH", "Metropolitan"],
    "winnipeg jets": ["WPG", "Central"]
  },
  nba: {
    "atlanta hawks": ["ATL", "Eastern Conference"],
    "boston celtics": ["BOS", "Eastern Conference"],
    "brooklyn nets": ["BKN", "Eastern Conference"],
    "charlotte hornets": ["CHA", "Eastern Conference"],
    "chicago bulls": ["CHI", "Eastern Conference"],
    "cleveland cavaliers": ["CLE", "Eastern Conference"],
    "dallas mavericks": ["DAL", "Western Conference"],
    "denver nuggets": ["DEN", "Western Conference"],
    "detroit pistons": ["DET", "Eastern Conference"],
    "golden state warriors": ["GSW", "Western Conference"],
    "houston rockets": ["HOU", "Western Conference"],
    "indiana pacers": ["IND", "Eastern Conference"],
    "la clippers": ["LAC", "Western Conference"],
    "los angeles clippers": ["LAC", "Western Conference"],
    "los angeles lakers": ["LAL", "Western Conference"],
    "memphis grizzlies": ["MEM", "Western Conference"],
    "miami heat": ["MIA", "Eastern Conference"],
    "milwaukee bucks": ["MIL", "Eastern Conference"],
    "minnesota timberwolves": ["MIN", "Western Conference"],
    "new orleans pelicans": ["NOP", "Western Conference"],
    "new york knicks": ["NYK", "Eastern Conference"],
    "oklahoma city thunder": ["OKC", "Western Conference"],
    "orlando magic": ["ORL", "Eastern Conference"],
    "philadelphia 76ers": ["PHI", "Eastern Conference"],
    "phoenix suns": ["PHX", "Western Conference"],
    "portland trail blazers": ["POR", "Western Conference"],
    "sacramento kings": ["SAC", "Western Conference"],
    "san antonio spurs": ["SAS", "Western Conference"],
    "toronto raptors": ["TOR", "Eastern Conference"],
    "utah jazz": ["UTA", "Western Conference"],
    "washington wizards": ["WSH", "Eastern Conference"]
  }
};

function sportsAdvancedLeagueKey_(league) {
  const key = String(league || "").trim().toLowerCase();
  const aliases = {
    baseball: "mlb",
    football: "nfl",
    hockey: "nhl",
    basketball: "nba",
    ncaaf: "college-football",
    "college football": "college-football",
    ncaam: "mens-college-basketball",
    "mens college basketball": "mens-college-basketball",
    "men's college basketball": "mens-college-basketball",
    ncaaw: "womens-college-basketball",
    "womens college basketball": "womens-college-basketball",
    "women's college basketball": "womens-college-basketball"
  };
  return aliases[key] || key;
}

function sportsAdvancedNormalizeTeamName_(teamName) {
  return String(teamName || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sportsAdvancedTeamMeta_(league, teamName) {
  const leagueKey = sportsAdvancedLeagueKey_(league);
  const table = SPORTS_ADVANCED_TEAM_META[leagueKey] || {};
  const key = sportsAdvancedNormalizeTeamName_(teamName);
  const direct = table[key];
  if (direct) return { abbreviation: direct[0], group: direct[1] };

  const matchingKey = Object.keys(table).find(function(name) {
    return key === name || key.indexOf(name) !== -1 || name.indexOf(key) !== -1;
  });
  const match = matchingKey ? table[matchingKey] : null;
  return match
    ? { abbreviation: match[0], group: match[1] }
    : { abbreviation: "", group: "" };
}

function sportsAdvancedQuestionDynamicGroup_(entity) {
  const game = entity && entity.game || {};
  return String(
    game.ConferenceName ||
    game.Conference ||
    game.GroupName ||
    game.GroupLabel ||
    ""
  ).trim();
}

function sportsAdvancedQuestionGroupInfo_(league, entities) {
  const leagueKey = sportsAdvancedLeagueKey_(league);
  const labels = {
    mlb: "MLB Division",
    nfl: "NFL Division",
    nhl: "NHL Division",
    nba: "NBA Conference",
    "college-football": "NCAA Conference",
    "mens-college-basketball": "NCAA Conference",
    "womens-college-basketball": "NCAA Conference"
  };
  const label = labels[leagueKey] || "League Group";
  const groups = {};

  (entities || []).forEach(function(entity) {
    if (!entity || entity.entityType !== "TEAM") return;
    const group = String(entity.groupName || "").trim();
    if (!group) return;
    groups[group] = (groups[group] || 0) + 1;
  });

  return {
    label: label,
    groups: Object.keys(groups).sort().map(function(name) {
      return { name: name, count: groups[name] };
    }),
    help:
      "Select every loaded team from one " +
      (label.indexOf("Conference") !== -1 ? "conference" : "division") +
      ". Only teams with games currently loaded on this page can be selected."
  };
}

function sportsAdvancedQuestionSearchTokens_(value) {
  return String(value || "")
    .split(/[,;|\n]+/)
    .map(function(item) { return item.trim().toLowerCase(); })
    .filter(Boolean)
    .filter(function(item, index, items) { return items.indexOf(item) === index; });
}

function sportsAdvancedQuestionSearchMatches_(searchableText, rawSearch) {
  const tokens = sportsAdvancedQuestionSearchTokens_(rawSearch);
  if (!tokens.length) return true;
  const text = String(searchableText || "").toLowerCase();
  return tokens.some(function(token) { return text.indexOf(token) !== -1; });
}

function sportsAdvancedQuestionEntityLabel_(entity) {
  const game = entity.game || {};
  const gameLabel =
    String(game.AwayTeam || "Away") + " @ " +
    String(game.HomeTeam || "Home") + " — " +
    formatSportsDateShort(game.GameDateTime);

  if (entity.entityType === "PLAYER") {
    const playerDetails = [
      String(entity.teamAbbreviation || "").trim(),
      String(entity.position || "").trim()
    ].filter(Boolean).join(" · ");
    return (
      "Player: " + String(entity.entityName || "") +
      (playerDetails ? " · " + playerDetails : "") +
      " — " + gameLabel
    );
  }

  return (
    "Team: " + String(entity.entityName || "") +
    (entity.teamAbbreviation ? " (" + entity.teamAbbreviation + ")" : "") +
    " — " + gameLabel
  );
}

function sportsAdvancedQuestionBuildEntities_(games, players) {
  const entities = [];

  (games || []).forEach(function(game) {
    const league = String(game.League || "");
    [
      {
        id: game.AwayTeamId || normalizeSportsPlayerTeamKey_(game.AwayTeam),
        name: game.AwayTeam,
        teamId: game.AwayTeamId || "",
        abbreviation: game.AwayAbbreviation || "",
        conferenceName: game.AwayConferenceName || ""
      },
      {
        id: game.HomeTeamId || normalizeSportsPlayerTeamKey_(game.HomeTeam),
        name: game.HomeTeam,
        teamId: game.HomeTeamId || "",
        abbreviation: game.HomeAbbreviation || "",
        conferenceName: game.HomeConferenceName || ""
      }
    ].forEach(function(team) {
      if (!team.name) return;
      const meta = sportsAdvancedTeamMeta_(league, team.name);
      const teamEntity = {
        entityType: "TEAM",
        entityId: String(team.id || ""),
        entityName: String(team.name || ""),
        teamName: String(team.name || ""),
        teamAbbreviation: String(team.abbreviation || meta.abbreviation || "").trim(),
        groupName: String(team.conferenceName || meta.group || "").trim(),
        teamId: String(team.teamId || team.id || ""),
        sportsGameId: String(game.GameId || ""),
        espnEventId: String(game.ESPNEventId || ""),
        league: league,
        sport: String(game.Sport || ""),
        game: game,
        logo: team.name === game.HomeTeam ? game.HomeLogo : game.AwayLogo
      };
      if (!teamEntity.groupName) {
        teamEntity.groupName = sportsAdvancedQuestionDynamicGroup_(teamEntity);
      }
      entities.push(teamEntity);
    });

    (players || [])
      .filter(function(player) {
        return sportsPlayerTeamMatchesGame_(player, game);
      })
      .forEach(function(player) {
        const teamName = String(player.Team || player.TeamName || "");
        const meta = sportsAdvancedTeamMeta_(league, teamName);
        const playerTeamKey = normalizeSportsPlayerTeamKey_(teamName);
        const homeTeamKey = normalizeSportsPlayerTeamKey_(game.HomeTeam);
        const awayTeamKey = normalizeSportsPlayerTeamKey_(game.AwayTeam);
        const gameAbbreviation = playerTeamKey && playerTeamKey === homeTeamKey
          ? game.HomeAbbreviation
          : (playerTeamKey && playerTeamKey === awayTeamKey ? game.AwayAbbreviation : "");
        const gameConference = playerTeamKey && playerTeamKey === homeTeamKey
          ? game.HomeConferenceName
          : (playerTeamKey && playerTeamKey === awayTeamKey ? game.AwayConferenceName : "");
        const playerEntity = {
          entityType: "PLAYER",
          entityId: String(player.PlayerId || player.ESPNPlayerId || ""),
          entityName: String(player.FullName || player.ShortName || player.PlayerName || ""),
          teamId: String(player.TeamId || ""),
          teamName: teamName,
          teamAbbreviation: String(
            player.TeamAbbreviation || player.TeamAbbr || player.Abbreviation || gameAbbreviation || meta.abbreviation || ""
          ).trim(),
          position: String(player.Position || "").trim(),
          groupName: String(gameConference || meta.group || "").trim(),
          espnPlayerId: String(player.ESPNPlayerId || ""),
          sportsGameId: String(game.GameId || ""),
          espnEventId: String(game.ESPNEventId || ""),
          league: league,
          sport: String(game.Sport || ""),
          game: game,
          logo: String(player.HeadshotUrl || "")
        };
        if (!playerEntity.groupName) {
          playerEntity.groupName = sportsAdvancedQuestionDynamicGroup_(playerEntity);
        }
        entities.push(playerEntity);
      });
  });

  return entities;
}

function showSportsAdvancedQuestionModal_(baseGame, games, players, optionData) {
  return new Promise(function(resolve) {
    const existing = document.getElementById("sportsAdvancedQuestionOverlay");
    if (existing) existing.remove();

    const entities = sportsAdvancedQuestionBuildEntities_(games, players);
    const groupInfo = sportsAdvancedQuestionGroupInfo_(baseGame && baseGame.League, entities);
    const hasPlayers = entities.some(function(entity) { return entity.entityType === "PLAYER"; });
    const entityFilterOptions = hasPlayers
      ? `
        <option value="all">Teams and players</option>
        <option value="team">Teams only</option>
        <option value="player">Players only</option>
      `
      : '<option value="team">Teams only</option>';
    const statTypes = Array.isArray(optionData && optionData.statTypes)
      ? optionData.statTypes
      : [];
    const checkpoints = Array.isArray(optionData && optionData.checkpoints)
      ? optionData.checkpoints
      : [];

    const rows = entities.map(function(entity, index) {
      const image = entity.logo
        ? '<img src="' + escapeSportsHtml(entity.logo) + '" alt="">'
        : '<span class="sports-advanced-entity-placeholder">' +
            (entity.entityType === "TEAM" ? "T" : "P") +
          '</span>';
      return `
        <label
          class="sports-player-matchup-player-row sports-advanced-entity-row"
          data-advanced-entity-type="${escapeSportsHtml(entity.entityType || "")}"
          data-advanced-entity-name="${escapeSportsHtml(entity.entityName || "")}"
          data-advanced-group="${escapeSportsHtml(entity.entityType === "TEAM" ? entity.groupName || "" : "")}"
          data-advanced-search="${escapeSportsHtml([
            entity.entityName,
            entity.teamName,
            entity.teamAbbreviation,
            entity.position,
            entity.groupName,
            entity.game && entity.game.AwayTeam,
            entity.game && entity.game.HomeTeam
          ].filter(Boolean).join(" "))}"
        >
          <input
            type="checkbox"
            class="sports-advanced-entity-checkbox"
            data-advanced-entity-index="${index}"
          >
          ${image}
          <span class="sports-player-matchup-player-name">
            ${escapeSportsHtml(sportsAdvancedQuestionEntityLabel_(entity))}
          </span>
          <input
            type="number"
            class="sports-player-matchup-odds sports-advanced-entity-odds"
            data-advanced-odds-index="${index}"
            min="1.01"
            step="0.01"
            value="1.91"
            aria-label="Decimal odds"
          >
        </label>
      `;
    }).join("");

    const checkpointOptions = checkpoints.map(function(item) {
      return '<option value="' + escapeSportsHtml(item.value || "") + '">' +
        escapeSportsHtml(item.label || item.value || "") +
        '</option>';
    }).join("");

    const groupOptions = groupInfo.groups.map(function(item) {
      return '<option value="' + escapeSportsHtml(item.name) + '">' +
        escapeSportsHtml(item.name + " (" + item.count + " loaded)") +
        '</option>';
    }).join("");
    const groupSelector = groupInfo.groups.length
      ? `
        <label class="sports-player-prop-field">
          ${sportsFieldLabel_(groupInfo.label, groupInfo.help)}
          <select id="sportsAdvancedDivisionSelect">
            <option value="">Choose ${escapeSportsHtml(groupInfo.label.toLowerCase())}…</option>
            ${groupOptions}
          </select>
        </label>
      `
      : "";

    const overlay = document.createElement("div");
    overlay.id = "sportsAdvancedQuestionOverlay";
    overlay.className = "sports-player-prop-overlay";
    overlay.innerHTML = `
      <div class="sports-player-prop-modal sports-advanced-question-modal">
        <h3>Create Stat Comparison</h3>
        <p class="sports-player-prop-game">
          Compare players or teams from any loaded ${escapeSportsHtml(String(baseGame.League || "").toUpperCase())} game, including different games and multi-team groups.
        </p>
        <form id="sportsAdvancedQuestionForm">
          <div class="sports-advanced-select-tools">
            <label class="sports-player-prop-field">
              ${sportsFieldLabel_("Show Entities", "Filter the list to teams, players, or both. This does not change already-created questions.")}
              <select id="sportsAdvancedEntityFilter">
                ${entityFilterOptions}
              </select>
            </label>
            ${groupSelector}
            <label class="sports-player-prop-field sports-advanced-search-field">
              ${sportsFieldLabel_("Search", "Enter one or more names separated by commas. Matches for any entered team, player, abbreviation, position, division, conference, or matchup are shown.")}
              <input id="sportsAdvancedEntitySearch" type="search" placeholder="Cubs, White Sox, CHC, pitcher…">
            </label>
            <div class="sports-advanced-selection-actions">
              <button type="button" class="small-btn" id="sportsAdvancedSelectVisible">Select Visible</button>
              <button type="button" class="small-btn" id="sportsAdvancedSelectTeams">Select Loaded Teams</button>
              <button type="button" class="small-btn" id="sportsAdvancedClearEntities">Clear</button>
            </div>
          </div>
          <div class="sports-advanced-question-grid">
            <label class="sports-player-prop-field">
              ${sportsFieldLabel_("Question Mode", "Wager creates selections in Bets with decimal odds. Prediction creates a correct-pick question in Picks.")}
              <select id="sportsAdvancedQuestionMode">
                <option value="wager">Wager — writes to Bets</option>
                <option value="prediction">Prediction — writes to Picks</option>
              </select>
            </label>
            <label class="sports-player-prop-field">
              <span>Question Type</span>
              <select id="sportsAdvancedQuestionKind">
                <option value="highest">Highest total — compare 2-12</option>
                <option value="threshold">Yes/No threshold — one entity</option>
              </select>
            </label>
            <label class="sports-player-prop-field">
              ${sportsFieldLabel_("Checkpoint", "Final Game Total is the safest automatic option. Inning or quarter checkpoints require an exact saved snapshot and may need admin review.")}
              <select id="sportsAdvancedCheckpoint">${checkpointOptions}</select>
            </label>
            <label class="sports-player-prop-field">
              <span>Statistic</span>
              <select id="sportsAdvancedStat" required></select>
            </label>
            <label class="sports-player-prop-field sports-advanced-threshold-field" hidden>
              ${sportsFieldLabel_("Comparison", "Choose how the current or final statistic is compared with the threshold.")}
              <select id="sportsAdvancedOperator">
                <option value="gte">At least</option>
                <option value="gt">More than</option>
                <option value="lte">No more than</option>
                <option value="lt">Fewer than</option>
                <option value="eq">Exactly</option>
              </select>
            </label>
            <label class="sports-player-prop-field sports-advanced-threshold-field" hidden>
              ${sportsFieldLabel_("Threshold", "The number used for the Yes/No question. Example: at least 6 strikeouts.")}
              <input id="sportsAdvancedThreshold" type="number" step="0.5" value="1">
            </label>
            <label class="sports-player-prop-field sports-advanced-threshold-odds" hidden>
              ${sportsFieldLabel_("Yes Odds", "Decimal odds paid when the final result satisfies the threshold.")}
              <input id="sportsAdvancedYesOdds" type="number" min="1.01" step="0.01" value="1.91">
            </label>
            <label class="sports-player-prop-field sports-advanced-threshold-odds" hidden>
              ${sportsFieldLabel_("No Odds", "Decimal odds paid when the final result does not satisfy the threshold.")}
              <input id="sportsAdvancedNoOdds" type="number" min="1.01" step="0.01" value="1.91">
            </label>
            <label class="sports-player-prop-field" id="sportsAdvancedPointsField" hidden>
              <span>Prediction Points</span>
              <input id="sportsAdvancedPoints" type="number" min="1" step="1" value="1">
            </label>
          </div>
          <label class="sports-player-prop-field">
            <span>Question (optional)</span>
            <input id="sportsAdvancedQuestionName" type="text" placeholder="A default question will be generated">
          </label>
          <div class="sports-player-matchup-help">
            Final totals settle automatically. Checkpoint questions auto-settle only when an exact boundary snapshot was captured; a late poll is marked for admin review.
          </div>
          <div class="sports-advanced-entity-heading">
            ${sportsFieldLabel_("Selections and Odds", "Check 2–12 entries for Highest Total or exactly one entry for Yes/No Threshold. For wagers, enter decimal odds beside each selected Highest Total option.")}
            <span id="sportsAdvancedVisibleCount"></span>
          </div>
          <div id="sportsAdvancedEntityList" class="sports-player-matchup-player-list sports-advanced-entity-list">${rows}</div>
          <div id="sportsAdvancedQuestionPreview" class="sports-player-prop-preview"></div>
          <div class="sports-player-prop-actions">
            <button type="button" class="small-btn" id="sportsAdvancedQuestionCancel">Cancel</button>
            <button type="submit" class="small-btn sports-advanced-question-btn">Create Comparison</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const form = document.getElementById("sportsAdvancedQuestionForm");
    const mode = document.getElementById("sportsAdvancedQuestionMode");
    const kind = document.getElementById("sportsAdvancedQuestionKind");
    const stat = document.getElementById("sportsAdvancedStat");
    const checkpoint = document.getElementById("sportsAdvancedCheckpoint");
    const operator = document.getElementById("sportsAdvancedOperator");
    const threshold = document.getElementById("sportsAdvancedThreshold");
    const name = document.getElementById("sportsAdvancedQuestionName");
    const preview = document.getElementById("sportsAdvancedQuestionPreview");
    const pointsField = document.getElementById("sportsAdvancedPointsField");
    const entityFilter = document.getElementById("sportsAdvancedEntityFilter");
    const divisionSelect = document.getElementById("sportsAdvancedDivisionSelect");
    const entitySearch = document.getElementById("sportsAdvancedEntitySearch");
    const visibleCount = document.getElementById("sportsAdvancedVisibleCount");

    function entityRows_() {
      return Array.from(overlay.querySelectorAll(".sports-advanced-entity-row"));
    }

    function updateEntityVisibility_() {
      const typeFilter = String(entityFilter && entityFilter.value || "all").toUpperCase();
      const search = String(entitySearch && entitySearch.value || "").trim();
      let count = 0;
      entityRows_().forEach(function(row) {
        const type = String(row.getAttribute("data-advanced-entity-type") || "").toUpperCase();
        const text = String(
          row.getAttribute("data-advanced-search") || row.textContent || ""
        ).toLowerCase();
        const typeMatch = typeFilter === "ALL" || type === typeFilter;
        const searchMatch = sportsAdvancedQuestionSearchMatches_(text, search);
        row.hidden = !(typeMatch && searchMatch);
        if (!row.hidden) count++;
      });
      if (visibleCount) {
        visibleCount.textContent = count + " shown · " + checkedInputs_().length + " selected";
      }
    }

    function selectRows_(predicate) {
      entityRows_().forEach(function(row) {
        if (!predicate(row)) return;
        const input = row.querySelector(".sports-advanced-entity-checkbox");
        if (input) input.checked = true;
      });
      updateControls_();
    }

    function clearRows_() {
      overlay.querySelectorAll(".sports-advanced-entity-checkbox")
        .forEach(function(input) { input.checked = false; });
      updateControls_();
    }

    function checkedInputs_() {
      return Array.from(overlay.querySelectorAll(".sports-advanced-entity-checkbox:checked"));
    }

    function selectedEntities_() {
      return checkedInputs_().map(function(input) {
        return entities[Number(input.getAttribute("data-advanced-entity-index"))];
      }).filter(Boolean);
    }

    function updateStatOptions_() {
      const selected = selectedEntities_();
      const types = selected.map(function(entity) { return entity.entityType; })
        .filter(function(value, index, array) { return array.indexOf(value) === index; });
      const current = stat.value;
      const allowed = statTypes.filter(function(item) {
        if (!types.length) return true;
        const supported = Array.isArray(item.entityTypes) ? item.entityTypes : [];
        return types.every(function(type) { return supported.indexOf(type) !== -1; });
      });
      stat.innerHTML = allowed.map(function(item) {
        return '<option value="' + escapeSportsHtml(item.value || "") + '">' +
          escapeSportsHtml(item.label || item.value || "") +
          '</option>';
      }).join("");
      if (allowed.some(function(item) { return item.value === current; })) stat.value = current;
      if (!allowed.length) {
        stat.innerHTML = '<option value="">No common stat for selected entity types</option>';
      }
    }

    function updateControls_() {
      const thresholdMode = kind.value === "threshold";
      overlay.querySelectorAll(".sports-advanced-threshold-field")
        .forEach(function(field) { field.hidden = !thresholdMode; });
      overlay.querySelectorAll(".sports-advanced-threshold-odds")
        .forEach(function(field) { field.hidden = !thresholdMode || mode.value !== "wager"; });
      pointsField.hidden = mode.value === "wager";
      overlay.querySelectorAll(".sports-advanced-entity-odds")
        .forEach(function(input) {
          input.hidden = thresholdMode || mode.value !== "wager";
          input.disabled = thresholdMode || mode.value !== "wager";
        });
      updateStatOptions_();
      updatePreview_();
    }

    function updatePreview_() {
      const selected = selectedEntities_();
      const statLabel = stat.options[stat.selectedIndex]
        ? stat.options[stat.selectedIndex].text
        : "statistic";
      const checkpointLabel = checkpoint.options[checkpoint.selectedIndex]
        ? checkpoint.options[checkpoint.selectedIndex].text
        : "Final game total";
      const custom = String(name.value || "").trim();
      let question = custom;
      if (!question && kind.value === "threshold" && selected[0]) {
        question = "Will " + selected[0].entityName + " record " +
          String(operator.options[operator.selectedIndex].text || "at least").toLowerCase() + " " +
          String(threshold.value || "0") + " " + statLabel.toLowerCase() +
          (checkpoint.value === "FINAL" ? "" : " " + checkpointLabel.toLowerCase()) + "?";
      }
      if (!question) {
        question = "Who will record the most " + statLabel.toLowerCase() +
          (checkpoint.value === "FINAL" ? "" : " " + checkpointLabel.toLowerCase()) + "?";
      }
      preview.textContent = question + " — " + selected.length + " selected — " +
        (mode.value === "wager" ? "Bets" : "Picks");
    }

    function close_(value) {
      sportsCloseHelpPopovers_();
      overlay.remove();
      resolve(value || null);
    }

    [mode, kind, stat, checkpoint, operator, threshold, name].forEach(function(input) {
      input.addEventListener(input === name || input === threshold ? "input" : "change", updateControls_);
    });
    overlay.querySelectorAll(".sports-advanced-entity-checkbox")
      .forEach(function(input) { input.addEventListener("change", updateControls_); });

    entityFilter.addEventListener("change", updateEntityVisibility_);
    entitySearch.addEventListener("input", updateEntityVisibility_);
    if (divisionSelect) {
      divisionSelect.addEventListener("change", function() {
        const group = String(divisionSelect.value || "");
        if (!group) return;
        overlay.querySelectorAll(".sports-advanced-entity-checkbox")
          .forEach(function(input) { input.checked = false; });
        entityFilter.value = "team";
        entitySearch.value = "";
        updateEntityVisibility_();
        selectRows_(function(row) {
          return row.getAttribute("data-advanced-entity-type") === "TEAM" &&
            row.getAttribute("data-advanced-group") === group;
        });
      });
    }
    document.getElementById("sportsAdvancedSelectVisible").addEventListener("click", function() {
      selectRows_(function(row) { return !row.hidden; });
    });
    document.getElementById("sportsAdvancedSelectTeams").addEventListener("click", function() {
      selectRows_(function(row) {
        return row.getAttribute("data-advanced-entity-type") === "TEAM";
      });
      entityFilter.value = "team";
      updateEntityVisibility_();
    });
    document.getElementById("sportsAdvancedClearEntities").addEventListener("click", clearRows_);

    document.getElementById("sportsAdvancedQuestionCancel")
      .addEventListener("click", function() { close_(null); });

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const selected = selectedEntities_();
      if (kind.value === "threshold" && selected.length !== 1) {
        alert("A Yes/No threshold question requires exactly one player or team.");
        return;
      }
      if (kind.value === "highest" && selected.length < 2) {
        alert("Select at least two players or teams.");
        return;
      }
      if (!stat.value) {
        alert("Choose a statistic supported by every selected entity type.");
        return;
      }

      let invalidOdds = false;
      const payloadEntities = selected.map(function(entity) {
        const index = entities.indexOf(entity);
        const oddsInput = overlay.querySelector('[data-advanced-odds-index="' + index + '"]');
        const odds = mode.value === "wager" && kind.value === "highest"
          ? Number(oddsInput && oddsInput.value)
          : 1.91;
        if (mode.value === "wager" && kind.value === "highest" && (!isFinite(odds) || odds <= 1)) {
          invalidOdds = true;
        }
        return {
          entityType: entity.entityType,
          entityId: entity.entityId,
          entityName: entity.entityName,
          teamId: entity.teamId,
          espnPlayerId: entity.espnPlayerId || "",
          sportsGameId: entity.sportsGameId,
          espnEventId: entity.espnEventId,
          statType: stat.value,
          odds: odds
        };
      });
      if (invalidOdds) {
        alert("Every selected wager option must have decimal odds greater than 1.00.");
        return;
      }

      const yesOdds = Number(document.getElementById("sportsAdvancedYesOdds").value);
      const noOdds = Number(document.getElementById("sportsAdvancedNoOdds").value);
      if (mode.value === "wager" && kind.value === "threshold" &&
          ((!isFinite(yesOdds) || yesOdds <= 1) || (!isFinite(noOdds) || noOdds <= 1))) {
        alert("Yes and No decimal odds must be greater than 1.00.");
        return;
      }

      close_({
        questionMode: mode.value === "prediction" ? "prediction" : "wager",
        questionKind: kind.value,
        sportsStatType: stat.value,
        checkpointType: checkpoint.value,
        operator: operator.value,
        threshold: Number(threshold.value),
        yesOdds: yesOdds,
        noOdds: noOdds,
        points: Math.max(1, Number(document.getElementById("sportsAdvancedPoints").value) || 1),
        categoryName: String(name.value || "").trim(),
        entities: payloadEntities
      });
    });

    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) close_(null);
    });
    updateEntityVisibility_();
    updateControls_();
  });
}

async function createSportsAdvancedQuestionFromCard(gameId) {
  if (
    sportsScoresState.creatingWager ||
    sportsScoresState.creatingPlayerProp ||
    sportsScoresState.creatingPlayerMatchup ||
    sportsScoresState.creatingAdvancedQuestion
  ) {
    return;
  }

  const baseGame = sportsScoresState.scores.find(function(item) {
    return item.GameId === gameId;
  });
  if (!baseGame) {
    showSportsError("Could not find selected sports game.");
    return;
  }
  if (!sportsAdvancedQuestionsSupported_(baseGame)) {
    showSportsError("Stat comparisons are not enabled for this league yet.");
    return;
  }

  const session = getSportsStoredSession_();
  if (!session.username || !session.token || !sportsSessionIsAdmin_(session)) {
    showSportsError("Log in as an admin in the main app first, then return to Sports.");
    return;
  }

  sportsScoresState.creatingAdvancedQuestion = true;
  try {
    setSportsStatus("Loading players, teams, stats, and checkpoints...");
    const league = String(baseGame.League || "").toLowerCase();
    const sport = String(baseGame.Sport || "").toLowerCase();
    const games = sportsScoresState.scores.filter(function(game) {
      return String(game.League || "").toLowerCase() === league;
    });
    const playerOptions = sportsAdvancedQuestionPlayersSupported_(baseGame)
      ? await getSportsPlayerPropOptions_(session, baseGame, { allLeague: true })
      : { success: true, players: [] };
    const optionData =
      await sportsAwardsApi_(
        "adminGetSportsAdvancedQuestionOptions",
        {
          username: session.username,
          token: session.token,
          league: league,
          sport: sport
        }
      );

    if (!optionData || optionData.success === false) {
      throw new Error(
        (optionData && (optionData.error || optionData.message || optionData.reason)) ||
        "Could not load advanced sports stat options. Confirm the latest Awards App and Sports Scores Engine deployments are active."
      );
    }

    if (
      !Array.isArray(optionData.statTypes) ||
      !optionData.statTypes.length ||
      !Array.isArray(optionData.checkpoints) ||
      !optionData.checkpoints.length
    ) {
      throw new Error(
        "Advanced sports stat options are empty. Run setupSportsAdvancedStatsSystem in the Sports Scores Engine and deploy its latest web-app version."
      );
    }

    const config = await showSportsAdvancedQuestionModal_(
      baseGame,
      games,
      playerOptions.players || [],
      optionData || {}
    );
    if (!config) {
      setSportsStatus("Advanced sports question creation canceled.");
      return;
    }

    const destinationGames = await getSportsPlayerMatchupDestinationGames_(session, config.questionMode);
    if (!destinationGames.length) {
      throw new Error(
        config.questionMode === "wager"
          ? "No active wager-enabled Awards Games were found."
          : "No active prediction-enabled Awards Games were found."
      );
    }
    const awardsGameId = await showSportsPlayerMatchupDestinationModal_(destinationGames, config.questionMode);
    if (!awardsGameId) {
      setSportsStatus("Advanced sports question creation canceled.");
      return;
    }

    setSportsStatus("Creating advanced sports question...");
    const result =
      await sportsAwardsApi_(
        "adminCreateSportsAdvancedQuestion",
        {
          username: session.username,
          token: session.token,
          awardsGameId: awardsGameId,
          gameId: awardsGameId,
          questionMode: config.questionMode,
          questionKind: config.questionKind,
          sportsStatType: config.sportsStatType,
          checkpointType: config.checkpointType,
          operator: config.operator,
          threshold: config.threshold,
          yesOdds: config.yesOdds,
          noOdds: config.noOdds,
          points: config.points,
          categoryName: config.categoryName,
          entitiesJSON: JSON.stringify(config.entities)
        }
      );

    if (!result || result.success === false) {
      throw new Error(
        (result && (result.error || result.message || result.reason)) ||
        "Could not create advanced sports question."
      );
    }

    setSportsStatus("Created advanced sports question: " + (result.category || result.categoryId) + ".");
    alert(
      "Advanced sports question created.\n\n" +
      (result.category || "") + "\n" +
      "Mode: " + (result.questionMode === "wager" ? "Wager / Bets" : "Prediction / Picks") + "\n" +
      "Entities: " + result.entityCount + "\n" +
      "Checkpoint: " + result.checkpointLabel
    );
    await loadSportsScores(buildSportsFiltersFromControls());
  } catch (err) {
    showSportsError(err && err.message ? err.message : "Could not create advanced sports question.");
    setSportsStatus("Could not create advanced sports question.");
  } finally {
    sportsScoresState.creatingAdvancedQuestion = false;
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
    .replace("uefa.europa", "UEL")
    .replace("uefa.nations", "UNL")
    .replace("usa.1", "MLS")
    .replace("eng.1", "EPL")
    .replace("esp.1", "LALIGA")
    .replace("mex.1", "LIGAMX")
    .replace("ita.1", "SERIEA")
    .replace("ger.1", "BUND")
    .replace("fra.1", "LIGUE1")
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

  return sportsAwardsApi_(
    "adminGetSportsUsage",
    {
      username:
        session.username || "",

      token:
        session.token || ""
    }
  );

}
