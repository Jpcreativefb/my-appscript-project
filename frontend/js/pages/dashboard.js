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

  const profileRaw =
    payload.profile || {};

  const profile =
    profileRaw.profile ||
    profileRaw ||
    {};

  const profileHistoryRaw =
    payload.profileHistory || [];

  const profileHistory =
    Array.isArray(profileHistoryRaw)
      ? profileHistoryRaw
      : profileHistoryRaw.history || [];

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
    username;

  const themeColor =
    profile.themeColor ||
    profile.ThemeColor ||
    "#354785";

  const avatar =
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

      <section class="dashboard-profile-card card">

        <h2>Edit Profile</h2>

        <label class="profile-field">
          <span>Display Name</span>
          <input
            id="profileDisplayName"
            type="text"
            value="${escapeAttr(displayName)}"
          >
        </label>

        <label class="profile-field">
          <span>Avatar</span>
          <input
            id="profileAvatar"
            type="text"
            value="${escapeAttr(avatar)}"
          >
        </label>

        <label class="profile-field">
          <span>Theme Color</span>
          <input
            id="profileThemeColor"
            type="color"
            value="${escapeAttr(themeColor)}"
          >
        </label>

        <button
          class="dashboard-action-button"
          onclick="saveDashboardProfile()"
        >
          Save Profile
        </button>

        <p
          id="profileSaveStatus"
          class="profile-save-status"
        ></p>

      </section>

      <section class="dashboard-history-card card">

        <h2>Profile History</h2>

        ${
          profileHistory.length
            ? `
              <div class="profile-history-list">

                ${profileHistory.map(item => `
                  <div class="profile-history-row">

                    <div>
                      <strong>
                        ${escapeHtml(item.displayName || item.username || username)}
                      </strong>

                      <p>
                        @${escapeHtml(item.username || username)}
                      </p>
                    </div>

                    <span>
                      ${escapeHtml(item.gameId || payload.profileGameId || "")}
                    </span>

                  </div>
                `).join("")}

              </div>
            `
            : renderEmptyCard("No profile history found yet.")
        }

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

  const enterDisabled =
    game.disableEnter === true ||
    game.available === false;

  const actionButton =
    isPast
      ? `
        <button
          class="dashboard-action-button primary"
          onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}')"
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
            onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}')"
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
          onclick="viewGameLeaderboard('${escapeJs(game.gameId)}', '${escapeJs(game.type)}')"
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


/* ======================
   SAVE DASHBOARD PROFILE
====================== */

async function saveDashboardProfile() {

  const username =
    getCurrentUsername();

  if (!username) {
    return;
  }

  const displayNameEl =
    document.getElementById(
      "profileDisplayName"
    );

  const avatarEl =
    document.getElementById(
      "profileAvatar"
    );

  const themeColorEl =
    document.getElementById(
      "profileThemeColor"
    );

  const statusEl =
    document.getElementById(
      "profileSaveStatus"
    );

  const profile = {
    username:
      username,

    displayName:
      displayNameEl
        ? displayNameEl.value.trim()
        : username,

    avatar:
      avatarEl
        ? avatarEl.value.trim()
        : "default",

    themeColor:
      themeColorEl
        ? themeColorEl.value
        : "#354785"
  };

  if (statusEl) {
    statusEl.innerText =
      "Saving...";
  }

  const res =
    await apiSaveUserProfile(
      profile
    );

  if (!res.success) {

    if (statusEl) {
      statusEl.innerText =
        res.message ||
        res.error ||
        "Could not save profile.";
    }

    return;

  }

  if (APP_STATE.user) {

    APP_STATE.user.displayName =
      profile.displayName;

    APP_STATE.user.avatar =
      profile.avatar;

    APP_STATE.user.themeColor =
      profile.themeColor;

  }

  clearStartupPayload();

  if (statusEl) {

    statusEl.innerText =
      "Profile saved.";

  }

  setTimeout(() => {

    navigate("dashboard");

  }, 500);

}
