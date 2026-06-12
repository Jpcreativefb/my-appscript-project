/* ======================
   LEADERBOARD PAGE
====================== */

async function renderLeaderboardPage() {

  const gameId =
    getFrontendGameId() ||
    APP_STATE.gameId ||
    "";

  const leaderboardMode =
    String(
      localStorage.getItem("leaderboardMode") ||
      localStorage.getItem("gameMode") ||
      "standard"
    )
      .trim()
      .toLowerCase();

  const isWagerLeaderboard =
    leaderboardMode === "wager" ||
    leaderboardMode === "betting";

  let res;

  try {

    res =
      isWagerLeaderboard
        ? await apiBettingLeaderboard(gameId)
        : await apiLeaderboard(gameId);

  } catch (err) {

    console.error(
      "LEADERBOARD API ERROR",
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
    "LEADERBOARD API RESPONSE",
    {
      gameId:
        gameId,
      mode:
        leaderboardMode,
      response:
        res
    }
  );

  if (
    !res ||
    res.success === false
  ) {

    return `
      <div class="page">

        <h1>Leaderboard</h1>

        ${renderErrorCard(
          "Could not load leaderboard",
          res && (res.error || res.message)
            ? res.error || res.message
            : "Please refresh and try again."
        )}

      </div>
    `;

  }

  const rows =
    Array.isArray(res)
      ? res
      : res.leaderboard || res.rows || [];

  if (!rows.length) {

    return `
      <div class="page">

        <h1>
          ${isWagerLeaderboard ? "Wager Leaderboard" : "Leaderboard"}
        </h1>

        <div class="leaderboard-subtitle">
          Game:
          <strong>${escapeHtml(gameId)}</strong>
        </div>

        ${renderEmptyCard("No leaderboard data found.")}

      </div>
    `;

  }

  if (isWagerLeaderboard) {

    return renderWagerLeaderboardPage_(
      gameId,
      rows
    );

  }

  return renderStandardLeaderboardPage_(
    gameId,
    rows
  );

}

function renderStandardLeaderboardPage_(
  gameId,
  rows
) {

  return `
    <div class="page">

      <h1>Leaderboard</h1>

      <div class="leaderboard-subtitle">
        Game:
        <strong>${escapeHtml(gameId)}</strong>
      </div>

      <div class="leaderboard-list">

        ${rows.map((row, index) => {

          const total =
            Number(
              row.total !== undefined
                ? row.total
                : row.totalScore !== undefined
                  ? row.totalScore
                  : row.score
            ) || 0;

          const remaining =
            Number(row.remaining) || 0;

          const max =
            Number(row.max) || 0;

          const scoringMode =
            row.scoringMode || "";

          const confidenceScoringMode =
            row.confidenceScoringMode || "";

          return `
            <div class="card leaderboard-card ${total < 0 ? "negative-score" : ""}">

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

                ${
                  scoringMode === "confidence"
                    ? `
                      <p class="leaderboard-mode">
                        Confidence Pool
                        ${
                          confidenceScoringMode === "risk_penalty"
                            ? "· Risk Penalty"
                            : "· Win Only"
                        }
                      </p>
                    `
                    : ""
                }

                <p>
                  Total:
                  <strong>
                    ${total}
                  </strong>
                </p>

                <p>
                  Remaining:
                  ${remaining}
                  /
                  ${max}
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
          `;

        }).join("")}

      </div>

    </div>
  `;

}

function renderWagerLeaderboardPage_(
  gameId,
  rows
) {

  return `
    <div class="page">

      <h1>Wager Leaderboard</h1>

      <div class="leaderboard-subtitle">
        Game:
        <strong>${escapeHtml(gameId)}</strong>
      </div>

      <div class="leaderboard-list">

        ${rows.map((row, index) => {

          const bankroll =
            Number(row.bankroll) || 0;

          const maxBankroll =
            Number(row.maxBankroll) || 0;

          return `
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
                  Bankroll:
                  <strong>
                    ${bankroll}
                  </strong>
                </p>

                <p>
                  Max Bankroll:
                  ${maxBankroll}
                </p>

                <p>
                  Total Staked:
                  ${Number(row.totalStaked) || 0}
                </p>

                <p>
                  Bets:
                  ${Number(row.wonBets) || 0} won
                  ·
                  ${Number(row.pendingBets) || 0} pending
                  ·
                  ${Number(row.lostBets) || 0} lost
                </p>

                ${
                  row.eliminated
                    ? `<p class="eliminated-label">Eliminated</p>`
                    : ``
                }

              </div>

            </div>
          `;

        }).join("")}

      </div>

    </div>
  `;

}
