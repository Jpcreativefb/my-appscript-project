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
      </div>
    `;

    grid.appendChild(card);
  });

  updateSelectedSportsWagerCount_();
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
      "No active games found. Please create or activate a game first."
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
