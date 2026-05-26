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

  console.log(
    "DASHBOARD CATEGORIES API",
    categoriesRes
  );

  console.log(
    "DASHBOARD PICKS API",
    picksRes
  );

  console.log(
    "DASHBOARD LEADERBOARD API",
    leaderboardRes
  );

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

  return `
    <div class="page dashboard-page">

      <section class="dashboard-hero">

        <div>
          <p class="dashboard-kicker">
            Welcome back
          </p>

          <h1>
            ${escapeHtml(username)}
          </h1>

          <p class="dashboard-subtitle">
            Game:
            <strong>${escapeHtml(gameId)}</strong>
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