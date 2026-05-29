/* ======================
   DASHBOARD / PROFILE PAGE
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
      await loadStartupPayload();

  } catch (err) {

    console.error(
      "DASHBOARD STARTUP PAYLOAD ERROR",
      err
    );

    return `
      <div class="page dashboard-page">

        <h1>Dashboard</h1>

        ${renderErrorCard(
          "Could not load dashboard",
          err.message ||
          "The dashboard startup payload failed. Please refresh and try again."
        )}

      </div>
    `;

  }

  debugLog(
    "DASHBOARD STARTUP PAYLOAD",
    payload
  );

  if (
    !payload ||
    payload.success === false
  ) {

    return `
      <div class="page dashboard-page">

        <h1>Dashboard</h1>

        ${renderErrorCard(
          "Could not load dashboard",
          payload && (payload.error || payload.message)
            ? payload.error || payload.message
            : "Dashboard data was not available."
        )}

      </div>
    `;

  }

  const gameId =
    payload.gameId ||
    getFrontendGameId();

  const categories =
    Array.isArray(payload.categories)
      ? payload.categories
      : [];

  const picksRaw =
    payload.picks || {};

  const picks =
    picksRaw.picks ||
    picksRaw ||
    {};

  const leaderboardRaw =
    payload.leaderboard || [];

  const leaderboard =
    Array.isArray(leaderboardRaw)
      ? leaderboardRaw
      : leaderboardRaw.leaderboard || [];

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

  const totalCategories =
    categories.length;

  const picksMade =
    Object.keys(picks)
      .filter(categoryId =>
        picks[categoryId]
      )
      .length;

  const picksRemaining =
    Math.max(
      totalCategories - picksMade,
      0
    );

  const userRankIndex =
    leaderboard.findIndex(row => {

      const rowUsername =
        row.user ||
        row.username ||
        row.displayName ||
        "";

      return (
        String(rowUsername)
          .trim()
          .toLowerCase() ===
        String(username || "")
          .trim()
          .toLowerCase()
      );

    });

  const userRank =
    userRankIndex >= 0
      ? userRankIndex + 1
      : null;

  const userLeaderboard =
    userRankIndex >= 0
      ? leaderboard[userRankIndex]
      : null;

  const totalScore =
    userLeaderboard
      ? Number(
          userLeaderboard.total ||
          userLeaderboard.totalScore ||
          userLeaderboard.score ||
          0
        ) || 0
      : Number(
          profile.totalScore ||
          profile.score ||
          0
        ) || 0;

  const winChance =
    userLeaderboard
      ? Number(
          userLeaderboard.winChance ||
          0
        ) || 0
      : 0;

  const statues =
    userLeaderboard
      ? Number(
          userLeaderboard.statues ||
          0
        ) || 0
      : 0;

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
    <div class="page dashboard-page">

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
            Game:
            <strong>${escapeHtml(gameId)}</strong>
          </p>

          <p class="dashboard-profile-meta">
            @${escapeHtml(username)}
            ·
            Avatar: ${escapeHtml(avatar)}
          </p>
        </div>

      </section>

      <section class="dashboard-grid">

        <div class="card dashboard-stat-card">
          <span class="dashboard-stat-label">
            Picks Made
          </span>

          <strong class="dashboard-stat-value">
            ${picksMade}
            /
            ${totalCategories}
          </strong>

          <p>
            ${picksRemaining} remaining
          </p>
        </div>

        <div class="card dashboard-stat-card">
          <span class="dashboard-stat-label">
            Leaderboard Rank
          </span>

          <strong class="dashboard-stat-value">
            ${
              userRank
                ? `#${userRank}`
                : `—`
            }
          </strong>

          <p>
            Score: ${totalScore}
          </p>
        </div>

        <div class="card dashboard-stat-card">
          <span class="dashboard-stat-label">
            Win Chance
          </span>

          <strong class="dashboard-stat-value">
            ${winChance}%
          </strong>

          <p>
            Statues: ${statues}
          </p>
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
                        ${escapeHtml(item.gameId || gameId)}
                      </span>

                    </div>
                  `).join("")}

                </div>
              `
              : renderEmptyCard("No profile history found yet.")
          }

        </section>

        <button
          class="dashboard-action-button"
          onclick="navigate('picks')"
        >
          Make Picks
        </button>

        <button
          class="dashboard-action-button secondary"
          onclick="navigate('leaderboard')"
        >
          View Leaderboard
        </button>

      </section>

    </div>
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