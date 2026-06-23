/* ======================
   DASHBOARD / GAMES HUB
====================== */

async function renderDashboardPage() {

  const username =
    getCurrentUsername();

  if (!username) {

    return `
      <div class="page">
        <h1>Dashboard</h1>
        <div class="card">
          You must be logged in.
        </div>
      </div>
    `;

  }

  if (
    typeof loadActiveProfile === "function"
  ) {

    try {

      await loadActiveProfile();

    } catch (err) {

      console.warn(
        "Dashboard profile refresh skipped",
        err
      );

    }

  }

  let payload;

  try {

    payload =
      await apiGetDashboardGamesHub();

  } catch (err) {

    console.error(
      "DASHBOARD GAMES HUB ERROR",
      err
    );

    return `
      <div class="page dashboard-page">

        <h1>Dashboard</h1>

        ${renderErrorCard(
          "Could not load games",
          err.message ||
          "The games dashboard failed to load. Please refresh and try again."
        )}

      </div>
    `;

  }

  if (
    !payload ||
    payload.success === false
  ) {

    return `
      <div class="page dashboard-page">

        <h1>Dashboard</h1>

        ${renderErrorCard(
          "Could not load games",
          payload && (payload.error || payload.message)
            ? payload.error || payload.message
            : "Dashboard data was not available."
        )}

      </div>
    `;

  }

  const activeProfile =
    (
      typeof APP_STATE !== "undefined" &&
      APP_STATE.profile
    )
      ? APP_STATE.profile
      : {};

  const profileRaw =
    Object.keys(activeProfile).length
      ? activeProfile
      : payload.profile || {};

  const profile =
    profileRaw.profile ||
    profileRaw ||
    {};

  const activeGames =
    Array.isArray(payload.activeGames)
      ? payload.activeGames
      : [];

  const pastGames =
    Array.isArray(payload.pastGames)
      ? payload.pastGames
      : [];

  const displayName =
    profile.displayName ||
    profile.DisplayName ||
    profile.realName ||
    profile.RealName ||
    username;

  const themeColor =
    profile.profileColor ||
    profile.ProfileColor ||
    profile.themeColor ||
    profile.ThemeColor ||
    "#354785";

  const avatar =
    profile.avatarEmoji ||
    profile.AvatarEmoji ||
    profile.avatarInitials ||
    profile.AvatarInitials ||
    profile.avatar ||
    profile.Avatar ||
    "default";

  return `
    <div class="page dashboard-page dashboard-games-hub-page">

      <section
        class="dashboard-hero"
        style="--profile-theme-color: ${escapeAttr(themeColor)};"
      >

        <div>
          <p class="dashboard-kicker">
            Welcome back
          </p>

          <h1>
            ${escapeHtml(displayName)}
          </h1>

          <p class="dashboard-subtitle">
            Choose an active game below to play.
          </p>

          <p class="dashboard-profile-meta">
            @${escapeHtml(username)}
            ·
            Avatar: ${escapeHtml(avatar)}
          </p>
        </div>

      </section>

      <section class="dashboard-section">

        <div class="dashboard-section-header">
          <div>
            <p class="dashboard-kicker dark">
              Play Now
            </p>

            <h2>
              Active Games
            </h2>
          </div>

          <span class="dashboard-section-count">
            ${activeGames.length}
          </span>
        </div>

        <div class="dashboard-game-grid">
          ${
            activeGames.length
              ? activeGames
                  .map(game =>
                    renderDashboardGameCard(
                      game,
                      false
                    )
                  )
                  .join("")
              : renderEmptyCard("No active games are available right now.")
          }
        </div>

      </section>

      <section class="dashboard-section">

        <div class="dashboard-section-header">
          <div>
            <p class="dashboard-kicker dark">
              Archive
            </p>

            <h2>
              Past Games
            </h2>
          </div>

          <span class="dashboard-section-count">
            ${pastGames.length}
          </span>
        </div>

        <div class="dashboard-game-grid past-games-grid">
          ${
            pastGames.length
              ? pastGames
                  .map(game =>
                    renderDashboardGameCard(
                      game,
                      true
                    )
                  )
                  .join("")
              : renderEmptyCard("Finished or archived games will appear here.")
          }
        </div>

      </section>

    </div>
  `;

}

function renderDashboardGameCard(
  game,
  isPast
) {

  game =
    game || {};

  const leaderboardPreview =
    Array.isArray(game.leaderboardPreview)
      ? game.leaderboardPreview
      : [];

  const userStats =
    Array.isArray(game.userStats)
      ? game.userStats
      : [];

  const progressValue =
    Math.max(
      0,
      Math.min(
        100,
        Number(game.progressValue) || 0
      )
    );

  const heroImage =
    String(
      game.heroImage ||
      game.heroImageUrl ||
      ""
    ).trim();

  const heroPosition =
    String(
      game.heroImagePosition ||
      "center center"
    ).trim();

  const lockLabel =
    game.lockLabel ||
    game.statusLabel ||
    "Lock time TBD";

  const actionLabel =
    getDashboardGameActionLabel_(
      game,
      isPast,
      progressValue
    );

  const leagues =
    Array.isArray(game.leagues)
      ? game.leagues
      : [];

  const leaguePicker =
    renderDashboardLeaguePicker_(
      game
    );

  const selectedLeagueArg =
    `getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}')`;

  const enterDisabled =
    game.disableEnter === true ||
    game.available === false;

  const actionButton =
    isPast
      ? `
        <button
          class="dashboard-action-button primary"
          onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'))"
        >
          View Results
        </button>
      `
      : enterDisabled
        ? `
          <button
            class="dashboard-action-button primary disabled"
            disabled
            title="${escapeAttr(game.availabilityLabel || actionLabel)}"
          >
            ${escapeHtml(actionLabel)}
          </button>
        `
        : `
          <button
            class="dashboard-action-button primary"
            onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'))"
          >
            ${escapeHtml(actionLabel)}
          </button>
        `;

  const leaderboardButton =
    game.showLeaderboard === false
      ? ""
      : `
        <button
          class="dashboard-action-button secondary"
          onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}', getDashboardSelectedLeagueId_('${escapeJs(game.gameId)}'))"
        >
          Open Full Leaderboard
        </button>
      `;

  return `
    <article
      class="card dashboard-game-card dashboard-game-card-with-hero ${heroImage ? "has-hero-image" : ""} ${isPast ? "past-game-card" : ""} ${enterDisabled ? "game-unavailable" : ""}"
      style="--game-theme-color: ${escapeAttr(game.themeColor || "#354785")}; --game-hero-image: url('${escapeAttr(heroImage)}'); --game-hero-position: ${escapeAttr(heroPosition)};"
    >

      <div class="dashboard-game-hero-band">

        <div class="dashboard-game-topline">
          <span class="dashboard-game-lock-label">
            ${escapeHtml(lockLabel)}
          </span>
        </div>

        <div class="dashboard-game-title-block">
          <h3>
            ${escapeHtml(game.name || game.gameId || "Game")}
          </h3>

          <p class="dashboard-game-subtitle">
            ${escapeHtml(game.typeLabel || game.subtitle || "Game")}
          </p>
        </div>

      </div>

      ${leaguePicker}

      ${
        game.availabilityLabel && enterDisabled
          ? `
            <div class="dashboard-availability-note">
              ${escapeHtml(game.availabilityLabel)}
            </div>
          `
          : ""
      }

      <details class="dashboard-game-description">
        <summary>
          Game details
        </summary>

        <p>
          ${escapeHtml(game.description || "Game details will appear here.")}
        </p>
      </details>

      <div class="dashboard-game-progress-wrap">
        <div class="dashboard-game-progress-meta">
          <span>
            ${escapeHtml(game.progressLabel || "Ready to play")}
          </span>

          <strong>
            ${progressValue}%
          </strong>
        </div>

        <div class="dashboard-game-progress-bar">
          <span style="width: ${progressValue}%;"></span>
        </div>
      </div>

      <div class="dashboard-user-stats-card">
        <h4>
          Your Stats
        </h4>

        <div class="dashboard-user-stats-grid">
          ${
            userStats.length
              ? userStats
                  .map(stat => `
                    <div class="dashboard-user-stat">
                      <span>
                        ${escapeHtml(stat.label || "Stat")}
                      </span>

                      <strong>
                        ${escapeHtml(stat.value !== undefined ? stat.value : "—")}
                      </strong>
                    </div>
                  `)
                  .join("")
              : `
                <p class="dashboard-muted">
                  No stats yet.
                </p>
              `
          }
        </div>
      </div>

      <details class="dashboard-leaderboard-details">
        <summary>
          Leaderboard
        </summary>

        <div class="dashboard-mini-leaderboard">
          ${
            leaderboardPreview.length
              ? leaderboardPreview
                  .map(row => `
                    <div class="dashboard-mini-leaderboard-row">
                      <span>
                        #${Number(row.rank) || ""}
                        ${escapeHtml(row.displayName || row.username || "Player")}
                      </span>

                      <strong>
                        ${escapeHtml(row.scoreLabel || "Score")}:
                        ${escapeHtml(row.score)}
                      </strong>
                    </div>
                  `)
                  .join("")
              : `<p class="dashboard-muted">No leaderboard yet.</p>`
          }

          ${leaderboardButton}
        </div>
      </details>

      <div class="dashboard-game-actions">
        ${actionButton}
      </div>

    </article>
  `;

}


function renderDashboardLeaguePicker_(game) {

  game = game || {};

  const leagues =
    Array.isArray(game.leagues)
      ? game.leagues
      : [];

  if (!leagues.length) {
    return `
      <div class="dashboard-league-badge public-game-badge">
        Public Game
      </div>
    `;
  }

  if (leagues.length === 1) {

    const league = leagues[0];

    return `
      <div class="dashboard-league-badge">
        League:
        <strong>${escapeHtml(league.leagueName || league.leagueId || "League")}</strong>
      </div>
    `;

  }

  const selectedLeagueId =
    game.leagueId ||
    (
      typeof getFrontendLeagueId === "function"
        ? getFrontendLeagueId()
        : ""
    ) ||
    (leagues[0] && leagues[0].leagueId) ||
    "";

  return `
    <label class="dashboard-league-picker">
      <span>League</span>
      <select id="dashboardLeagueSelect-${escapeAttr(game.gameId || "")}">
        ${leagues.map(league => `
          <option
            value="${escapeAttr(league.leagueId || "") }"
            ${league.leagueId === selectedLeagueId ? "selected" : ""}
          >
            ${escapeHtml(league.leagueName || league.leagueId || "League")}
            ${league.role ? " · " + escapeHtml(league.role) : ""}
          </option>
        `).join("")}
      </select>
    </label>
  `;

}

function getDashboardSelectedLeagueId_(gameId) {

  const select =
    document.getElementById(
      "dashboardLeagueSelect-" + String(gameId || "")
    );

  if (select) {
    return select.value || "";
  }

  return "";

}

function getDashboardGameActionLabel_(
  game,
  isPast,
  progressValue
) {

  if (isPast) {
    return "View Results";
  }

  if (game.disableEnter === true || game.available === false) {

    const disabledLabel =
      String(
        game.enterLabel ||
        game.actionLabel ||
        game.availabilityLabel ||
        "Check Status"
      ).trim();

    return disabledLabel || "Check Status";

  }

  const backendLabel =
    String(
      game.enterLabel ||
      game.actionLabel ||
      ""
    ).trim();

  if (
    backendLabel &&
    backendLabel !== "Play Now"
  ) {
    return backendLabel;
  }

  const type =
    String(game.type || game.rawType || "")
      .trim()
      .toLowerCase();

  const madeCount =
    Number(game.madeCount) ||
    getDashboardMadeCountFromStats_(game);

  const totalCount =
    Number(game.totalCount) || 0;

  const hasStarted =
    game.hasStarted === true ||
    madeCount > 0 ||
    progressValue > 0;

  if (!hasStarted) {
    return "Play Now";
  }

  const complete =
    totalCount > 0 &&
    madeCount >= totalCount;

  if (
    type === "wager" ||
    type === "betting"
  ) {
    return complete
      ? "Review Wagers"
      : "Manage Wagers";
  }

  if (type === "confidence") {
    return complete
      ? "View Confidence Picks"
      : "Continue Confidence Picks";
  }

  if (type === "ranking") {
    return "Check Status";
  }

  return complete
    ? "View Picks"
    : "Continue Picks";

}

function getDashboardMadeCountFromStats_(game) {

  const stats =
    Array.isArray(game.userStats)
      ? game.userStats
      : [];

  for (let i = 0; i < stats.length; i++) {

    const label =
      String(stats[i].label || "")
        .trim()
        .toLowerCase();

    const value =
      String(stats[i].value || "")
        .trim();

    if (
      label === "wagers" ||
      label === "picks" ||
      label === "confidence picks"
    ) {

      const match =
        value.match(/^\d+/);

      return match
        ? Number(match[0]) || 0
        : 0;

    }

  }

  return 0;

}
