/* ======================
   LEADERBOARD PAGE
====================== */

async function renderLeaderboardPage() {

  const gameId =
    getFrontendGameId();

  const res =
    await apiLeaderboard(
      gameId
    );

  debugLog(
    "LEADERBOARD API",
    res
  );

  const rows =
    Array.isArray(res)
      ? res
      : res.leaderboard || [];

  if (!rows.length) {

    return `
      <div class="page">

        <h1>Leaderboard</h1>

        <div class="card">
          No leaderboard data found.
        </div>

      </div>
    `;

  }

  return `
    <div class="page">

      <h1>Leaderboard</h1>

      <div class="leaderboard-list">

        ${rows.map((row, index) => `
          <div class="card leaderboard-card">

            <div class="leaderboard-rank">
              #${index + 1}
            </div>

            <div class="leaderboard-main">

              <h2>${escapeHtml(row.user)}</h2>

              <p>
                Total: <strong>${Number(row.total) || 0}</strong>
              </p>

              <p>
                Remaining: ${Number(row.remaining) || 0}
                /
                ${Number(row.max) || 0}
              </p>

              <p>
                Statues: ${Number(row.statues) || 0}
              </p>

              <p>
                Win Chance:
                ${Number(row.winChance) || 0}%
              </p>

              ${
                row.eliminated
                  ? `<p class="eliminated-label">Eliminated</p>`
                  : ``
              }

            </div>

          </div>
        `).join("")}

      </div>

    </div>
  `;

}