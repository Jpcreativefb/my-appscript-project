/* =========================
   MIXED / HYBRID GAME MODE HUB
========================= */

function gameModeHubEscapeHtml_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

async function gameModeHubLoadGame_(gameId) {

  let dashboardPayload = null;

  if (typeof apiGetDashboardGamesHub === "function") {

    try {
      dashboardPayload = await apiGetDashboardGamesHub();
    } catch (err) {
      console.warn("GAME MODE HUB DASHBOARD LOAD ERROR", err);
    }

  }

  if (
    dashboardPayload &&
    dashboardPayload.success !== false
  ) {

    const games = []
      .concat(dashboardPayload.activeGames || [])
      .concat(dashboardPayload.pastGames || []);

    const found = games.find(function(game) {
      return game && String(game.gameId || "") === gameId;
    });

    if (found) {
      return found;
    }

  }

  if (typeof loadStartupPayload === "function") {

    try {
      const payload = await loadStartupPayload();
      const game = payload && (payload.game || payload.gameConfig);

      if (game) {
        return game;
      }
    } catch (err) {
      console.warn("GAME MODE HUB STARTUP LOAD ERROR", err);
    }

  }

  return null;

}

async function openGameModeHubSection_(page) {

  const target = String(page || "").trim().toLowerCase();

  if (["picks", "betting", "leaderboard"].indexOf(target) === -1) {
    return;
  }

  localStorage.setItem(
    "leaderboardMode",
    target === "betting" ? "wager" : "standard"
  );

  if (typeof clearStartupPayload === "function") {
    clearStartupPayload();
  }

  await navigate(target);

}

async function renderGameModeHubPage() {

  const gameId =
    (typeof getFrontendGameId === "function" && getFrontendGameId()) ||
    (typeof APP_STATE !== "undefined" && APP_STATE.gameId) ||
    "";

  if (!gameId) {
    return `
      <div class="page">
        <h1>Choose How to Play</h1>
        ${renderErrorCard("Could not open game", "No game was selected.")}
      </div>
    `;
  }

  const game = await gameModeHubLoadGame_(gameId);

  if (!game) {
    return `
      <div class="page">
        <h1>Choose How to Play</h1>
        ${renderErrorCard("Could not load game", "The selected game configuration was not available.")}
      </div>
    `;
  }

  const hasPicks =
    game.predictionEnabled === true ||
    game.confidenceEnabled === true ||
    game.stakedPointsEnabled === true ||
    game.fixedPointsEnabled === true;

  const hasWagers =
    game.wagerEnabled === true;

  const hasLeaderboard =
    game.showLeaderboard !== false;

  const actionCount =
    (hasPicks ? 1 : 0) +
    (hasWagers ? 1 : 0) +
    (hasLeaderboard ? 1 : 0);

  return `
    <div class="page game-mode-hub-page">

      <section class="card">
        <p class="dashboard-kicker">Hybrid Game</p>
        <h1>${gameModeHubEscapeHtml_(game.name || game.gameId || "Choose How to Play")}</h1>
        <p>
          ${gameModeHubEscapeHtml_(game.description || "This game includes more than one way to play. Choose a section below.")}
        </p>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <p class="dashboard-kicker dark">Game Sections</p>
            <h2>Choose How to Play</h2>
          </div>
          <span class="dashboard-section-count">${actionCount}</span>
        </div>

        <div class="dashboard-game-grid">
          ${hasPicks ? `
            <article class="card dashboard-game-card">
              <div>
                <p class="dashboard-kicker dark">Predictions</p>
                <h3>Make Picks</h3>
                <p>Open standard, confidence, and staked prediction questions.</p>
              </div>
              <button
                type="button"
                class="dashboard-action-button primary"
                onclick="openGameModeHubSection_('picks')"
              >
                Make Picks
              </button>
            </article>
          ` : ""}

          ${hasWagers ? `
            <article class="card dashboard-game-card">
              <div>
                <p class="dashboard-kicker dark">Bankroll</p>
                <h3>Place Wagers</h3>
                <p>Open sports, racing, odds, props, and other wager questions.</p>
              </div>
              <button
                type="button"
                class="dashboard-action-button primary"
                onclick="openGameModeHubSection_('betting')"
              >
                Place Wagers
              </button>
            </article>
          ` : ""}

          ${hasLeaderboard ? `
            <article class="card dashboard-game-card">
              <div>
                <p class="dashboard-kicker dark">Standings</p>
                <h3>Leaderboard</h3>
                <p>View the combined game standings and player totals.</p>
              </div>
              <button
                type="button"
                class="dashboard-action-button secondary"
                onclick="openGameModeHubSection_('leaderboard')"
              >
                View Leaderboard
              </button>
            </article>
          ` : ""}
        </div>

        ${!hasPicks && !hasWagers ? `
          ${renderErrorCard(
            "No playable sections are enabled",
            "An administrator must enable Predictions, Staked Points, Confidence, or Wagers in Game Setup."
          )}
        ` : ""}
      </section>

      <button
        type="button"
        class="dashboard-action-button secondary"
        onclick="navigate('dashboard')"
      >
        Back to Games
      </button>

    </div>
  `;

}
