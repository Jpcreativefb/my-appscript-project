/* ======================
   LEADERBOARD PAGE
====================== */

async function renderLeaderboardPage() {

  let payload;

  try {

    payload =
      await loadStartupPayload();

  } catch (err) {

    console.error(
      "LEADERBOARD STARTUP PAYLOAD ERROR",
      err
    );

    return `
      <div class="page">

        <h1>Leaderboard</h1>

        ${renderErrorCard(
          "Could not load leaderboard",
          err.message ||
          "Please refresh and try again."
        )}

      </div>
    `;

  }

  debugLog(
    "LEADERBOARD STARTUP PAYLOAD",
    payload
  );

  if (
    !payload ||
    payload.success === false
  ) {

    return `
      <div class="page">

        <h1>Leaderboard</h1>

        ${renderErrorCard(
          "Could not load leaderboard",
          payload && (payload.error || payload.message)
            ? payload.error || payload.message
            : "Please refresh and try again."
        )}

      </div>
    `;

  }

  const res =
    payload.leaderboard || [];

  const rows =
    Array.isArray(res)
      ? res
      : res.leaderboard || [];

  if (!rows.length) {

    return `
      <div class="page">

        <h1>Leaderboard</h1>

        ${renderEmptyCard("No leaderboard data found.")}

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

              <h2>
                ${escapeHtml(row.displayName || row.user || row.username || "Player")}
              </h2>

              <p class="leaderboard-username">
                @${escapeHtml(row.user || row.username || "")}
              </p>

              <p>
                Total:
                <strong>
                  ${Number(row.total || row.totalScore || row.score) || 0}
                </strong>
              </p>

              <p>
                Remaining:
                ${Number(row.remaining) || 0}
                /
                ${Number(row.max) || 0}
              </p>

              <p>
                Statues:
                ${Number(row.statues) || 0}
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