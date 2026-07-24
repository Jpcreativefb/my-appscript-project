/* ======================
   SEASON / SERIES HUB PAGE
====================== */

async function renderSeasonHubPage() {

  const gameId =
    (typeof getFrontendGameId === "function" && getFrontendGameId()) ||
    (typeof APP_STATE !== "undefined" && APP_STATE.gameId) ||
    "";

  if (!gameId) {
    return `
      <div class="page season-hub-page">
        <h1>Season / Series Hub</h1>
        ${renderErrorCard("Could not open season hub", "No parent game was selected.")}
      </div>
    `;
  }

  const dashboardRequest =
    typeof apiGetDashboardGamesHub === "function"
      ? apiGetDashboardGamesHub()
      : Promise.resolve({ success: false, error: "Dashboard API unavailable" });

  const leaderboardRequest =
    typeof apiGetLeaderboard === "function"
      ? apiGetLeaderboard(gameId)
      : Promise.resolve({ success: false, error: "Leaderboard API unavailable" });

  const settled = await Promise.allSettled([
    dashboardRequest,
    leaderboardRequest
  ]);

  const dashboardPayload =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : { success: false, error: settled[0].reason && settled[0].reason.message };

  const leaderboardPayload =
    settled[1].status === "fulfilled"
      ? settled[1].value
      : { success: false, error: settled[1].reason && settled[1].reason.message };

  if (!dashboardPayload || dashboardPayload.success === false) {
    return `
      <div class="page season-hub-page">
        <h1>Season / Series Hub</h1>
        ${renderErrorCard(
          "Could not load season hub",
          dashboardPayload && (dashboardPayload.error || dashboardPayload.message)
            ? dashboardPayload.error || dashboardPayload.message
            : "The game list was not available."
        )}
      </div>
    `;
  }

  const activeGames =
    Array.isArray(dashboardPayload.activeGames)
      ? dashboardPayload.activeGames
      : [];

  const pastGames =
    Array.isArray(dashboardPayload.pastGames)
      ? dashboardPayload.pastGames
      : [];

  const allGames = activeGames.concat(pastGames);
  const parentGame =
    allGames.find(function(game) {
      return game && game.gameId === gameId;
    }) || {
      gameId: gameId,
      name: gameId,
      gameRole: "parent",
      hubMode: localStorage.getItem("seasonHubMode") || "playable-aggregate",
      showMiniGameLinks: true,
      includeParentQuestions: true,
      type: "mixed",
      themeColor: "#354785"
    };

  const activeChildren = activeGames.filter(function(game) {
    return game && game.gameRole === "mini" && game.parentGameId === gameId;
  });

  const completedChildren = pastGames.filter(function(game) {
    return game && game.gameRole === "mini" && game.parentGameId === gameId;
  });

  const openChildren = activeChildren.filter(function(game) {
    return game.available !== false && game.disableEnter !== true;
  });

  const upcomingChildren = activeChildren.filter(function(game) {
    return game.available === false || game.disableEnter === true;
  });

  const hubMode =
    String(
      parentGame.hubMode ||
      localStorage.getItem("seasonHubMode") ||
      "playable-aggregate"
    )
      .trim()
      .toLowerCase();

  const isPlayableHub = hubMode !== "leaderboard-only";
  const showMiniGameLinks = parentGame.showMiniGameLinks !== false;

  const leaderboardRows =
    leaderboardPayload && leaderboardPayload.success !== false
      ? (Array.isArray(leaderboardPayload)
          ? leaderboardPayload
          : leaderboardPayload.leaderboard || leaderboardPayload.rows || [])
      : [];

  let wagerRows = [];

  if (parentGame.wagerEnabled === true && typeof apiBettingLeaderboard === "function") {
    try {
      const wagerPayload = await apiBettingLeaderboard(gameId);
      wagerRows =
        wagerPayload && wagerPayload.success !== false
          ? (Array.isArray(wagerPayload)
              ? wagerPayload
              : wagerPayload.leaderboard || wagerPayload.rows || [])
          : [];
    } catch (err) {
      console.warn("SEASON HUB WAGER LEADERBOARD ERROR", err);
    }
  }

  const totalMiniGames =
    openChildren.length +
    upcomingChildren.length +
    completedChildren.length;

  return `
    <div class="page season-hub-page" style="--season-hub-color:${escapeAttr(parentGame.themeColor || "#354785")};">

      <section class="season-hub-hero card">
        <div>
          <p class="dashboard-kicker">Season / Series Hub</p>
          <h1>${escapeHtml(parentGame.name || parentGame.gameId || "Season Hub")}</h1>
          <p class="season-hub-description">
            ${escapeHtml(parentGame.description || "Overall standings and connected mini games.")}
          </p>
          <div class="season-hub-meta">
            <span>${isPlayableHub ? "Playable + Aggregate" : "Leaderboard Only"}</span>
            <span>${totalMiniGames} mini game${totalMiniGames === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div class="season-hub-actions">
          ${isPlayableHub && parentGame.includeParentQuestions !== false ? `
            <button
              type="button"
              class="dashboard-action-button primary"
              onclick="openSeasonHubQuestions('${escapeJs(gameId)}', '${escapeJs(parentGame.type || "mixed")}')"
            >
              Play Season Questions
            </button>
          ` : ""}

          <button
            type="button"
            class="dashboard-action-button secondary"
            onclick="viewGameLeaderboard('${escapeJs(gameId)}', '${escapeJs(parentGame.type || "mixed")}', '')"
          >
            Open Full Leaderboard
          </button>

          <button
            type="button"
            class="dashboard-action-button secondary"
            onclick="navigate('dashboard')"
          >
            Back to Games
          </button>
        </div>
      </section>

      <section class="dashboard-section season-hub-standings-section">
        <div class="dashboard-section-header">
          <div>
            <p class="dashboard-kicker dark">Overall</p>
            <h2>Season Standings</h2>
          </div>
          <span class="dashboard-section-count">${leaderboardRows.length}</span>
        </div>

        ${leaderboardPayload && leaderboardPayload.success === false ? `
          ${renderErrorCard(
            "Could not load season standings",
            leaderboardPayload.error || leaderboardPayload.message || "Leaderboard data was unavailable."
          )}
        ` : leaderboardRows.length ? `
          <div class="leaderboard-list season-hub-leaderboard-list">
            ${typeof renderStandardLeaderboardCards_ === "function"
              ? renderStandardLeaderboardCards_(leaderboardRows.slice(0, 5), "total")
              : ""}
          </div>
        ` : renderEmptyCard("No season standings are available yet.")}
      </section>

      ${wagerRows.length ? `
        <section class="dashboard-section season-hub-wager-section">
          <div class="dashboard-section-header">
            <div>
              <p class="dashboard-kicker dark">Wagers</p>
              <h2>Season Bankroll Standings</h2>
            </div>
            <span class="dashboard-section-count">${wagerRows.length}</span>
          </div>
          <div class="leaderboard-list season-hub-leaderboard-list">
            ${renderSeasonHubWagerCards_(wagerRows.slice(0, 5))}
          </div>
        </section>
      ` : ""}

      ${showMiniGameLinks ? `
        ${renderSeasonHubMiniGameSection_("Open Mini Games", "Play Now", openChildren, false)}
        ${renderSeasonHubMiniGameSection_("Upcoming Mini Games", "Coming Up", upcomingChildren, false)}
        ${renderSeasonHubMiniGameSection_("Completed Mini Games", "Results", completedChildren, true)}
      ` : `
        <section class="dashboard-section">
          ${renderEmptyCard("Mini-game links are hidden for this season hub.")}
        </section>
      `}

      ${typeof renderCompareModalShell_ === "function" ? renderCompareModalShell_() : ""}

    </div>
  `;
}

function renderSeasonHubMiniGameSection_(title, kicker, games, isPast) {

  games = Array.isArray(games) ? games : [];

  if (!games.length) {
    return "";
  }

  return `
    <section class="dashboard-section season-hub-mini-games-section">
      <div class="dashboard-section-header">
        <div>
          <p class="dashboard-kicker dark">${escapeHtml(kicker)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <span class="dashboard-section-count">${games.length}</span>
      </div>

      <div class="dashboard-game-grid season-hub-game-grid">
        ${games.map(function(game) {
          return typeof renderDashboardGameCard === "function"
            ? renderDashboardGameCard(game, isPast)
            : "";
        }).join("")}
      </div>
    </section>
  `;
}

function renderSeasonHubWagerCards_(rows) {

  return (rows || []).map(function(row, index) {

    const username = row.username || row.user || "";
    const bankroll = Number(row.bankroll) || 0;
    const startingBankroll = Number(row.startingBankroll) || 0;
    const net = bankroll - startingBankroll;

    return `
      <div class="card leaderboard-card">
        <div class="leaderboard-rank">#${index + 1}</div>
        <div class="leaderboard-main">
          <div class="leaderboard-top-row">
            ${typeof renderLeaderboardUser_ === "function"
              ? renderLeaderboardUser_(row)
              : `<strong>${escapeHtml(username)}</strong>`}
          </div>
          <p class="leaderboard-username">@${escapeHtml(username)}</p>
          <div class="leaderboard-stats-grid">
            <p>Bankroll: <strong>${bankroll}</strong></p>
            <p>Net: ${net >= 0 ? "+" : ""}${net}</p>
            <p>Total Staked: ${Number(row.totalStaked) || 0}</p>
            <p>Bets: ${Number(row.wonBets) || 0} won · ${Number(row.pendingBets) || 0} pending · ${Number(row.lostBets) || 0} lost</p>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function openSeasonHubQuestions(gameId, gameType) {

  gameId = String(gameId || "").trim();
  gameType = String(gameType || "mixed").trim().toLowerCase();

  if (!gameId) {
    return;
  }

  setFrontendGameId(gameId);
  localStorage.setItem("gameMode", gameType);
  localStorage.setItem("leaderboardMode", "standard");

  if (typeof clearStartupPayload === "function") {
    clearStartupPayload();
  }

  await navigate(
    gameType === "wager" || gameType === "racing-wager"
      ? "betting"
      : "picks"
  );
}
