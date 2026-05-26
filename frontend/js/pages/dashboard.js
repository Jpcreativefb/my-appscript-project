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

  const gameId =
    getFrontendGameId();

  const profileRes =
    await apiGetUserProfile(
      username
    );

  const categoriesRes =
    await apiGetCategories(
      gameId
    );

  const picksRes =
    await apiGetMyPicks(
      username,
      gameId
    );

  const leaderboardRes =
    await apiLeaderboard(
      gameId
    );

  debugLog(
    "DASHBOARD PROFILE API",
    profileRes
  );

  debugLog(
    "DASHBOARD CATEGORIES API",
    categoriesRes
  );

  debugLog(
    "DASHBOARD PICKS API",
    picksRes
  );

  debugLog(
    "DASHBOARD LEADERBOARD API",
    leaderboardRes
  );

  if (
    isApiError(profileRes) ||
    isApiError(categoriesRes) ||
    isApiError(picksRes) ||
    isApiError(leaderboardRes)
  ) {

    return `
      <div class="page dashboard-page">

        <h1>Dashboard</h1>

        ${renderErrorCard(
          "Could not load dashboard",
          "One or more dashboard requests failed. Please refresh and try again."
        )}

      </div>
    `;

  }

  const categories =
    Array.isArray(categoriesRes)
      ? categoriesRes
      : categoriesRes.categories || [];

  const picks =
    picksRes.picks || {};

  const leaderboard =
    Array.isArray(leaderboardRes)
      ? leaderboardRes
      : leaderboardRes.leaderboard || [];

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
    leaderboard.findIndex(row =>

      String(row.user || "")
        .trim()
        .toLowerCase() ===

      String(username || "")
        .trim()
        .toLowerCase()

    );

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
      ? Number(userLeaderboard.total) || 0
      : 0;

  const winChance =
    userLeaderboard
      ? Number(userLeaderboard.winChance) || 0
      : 0;

  const statues =
    userLeaderboard
      ? Number(userLeaderboard.statues) || 0
      : 0;

  const profile =
    profileRes || {};

  const displayName =
    profile.displayName ||
    username;

  const themeColor =
    profile.themeColor ||
    "#354785";

  const avatar =
    profile.avatar ||
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

      </section>

      <section class="dashboard-actions">

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
        "Could not save profile.";
    }

    return;

  }

  if (APP_STATE.user) {

    APP_STATE.user.displayName =
      profile.displayName;

  }

  if (statusEl) {

    statusEl.innerText =
      "Profile saved.";

  }

  setTimeout(() => {

    navigate("dashboard");

  }, 500);

}