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

  const actionButton =
    isPast
      ? ""
      : `
        <button
          class="dashboard-action-button primary"
          onclick="enterGame('${escapeJs(game.gameId)}', '${escapeJs(game.type)}')"
        >
          ${escapeHtml(game.enterLabel || "Play Now")}
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

  const progressValue =
    Math.max(
      0,
      Math.min(
        100,
        Number(game.progressValue) || 0
      )
    );

  return `
    <article
      class="card dashboard-game-card ${isPast ? "past-game-card" : ""}"
      style="--game-theme-color: ${escapeAttr(game.themeColor || "#354785")};"
    >

      <div class="dashboard-game-topline">
        <div class="dashboard-game-icon">
          ${escapeHtml(game.icon || "🏆")}
        </div>

        <span class="dashboard-game-lock-label">
          ${escapeHtml(game.lockLabel || game.statusLabel || "Lock time TBD")}
        </span>
      </div>

      <h3>
        ${escapeHtml(game.name || game.gameId || "Game")}
      </h3>

      <p class="dashboard-game-type">
        ${escapeHtml(game.typeLabel || "Game")}
      </p>

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
