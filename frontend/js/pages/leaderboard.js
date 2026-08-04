/* ======================
   LEADERBOARD PAGE
====================== */

function isHybridLeaderboardGame_() {

  const type =
    String(localStorage.getItem("gameMode") || "")
      .trim()
      .toLowerCase();

  return (
    type === "mixed" ||
    type === "hybrid" ||
    type === "combo"
  );

}

function renderHybridLeaderboardBackButton_() {

  if (!isHybridLeaderboardGame_()) {
    return "";
  }

  return `
    <button
      type="button"
      class="dashboard-action-button secondary"
      onclick="navigate('game-hub')"
    >
      ← Back to Game Sections
    </button>
  `;

}

async function renderLeaderboardPage() {

  setPageLoadStep(50, "Loading leaderboard and player standings…");

  const gameId =
    getFrontendGameId() ||
    APP_STATE.gameId ||
    "";

  const leagueId =
    typeof getFrontendLeagueId === "function"
      ? getFrontendLeagueId()
      : "";

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
        : await apiGetLeaderboard(gameId);

  } catch (err) {

    console.error("LEADERBOARD API ERROR", err);

    return `
      <div class="page">
        ${renderHybridLeaderboardBackButton_()}
        <h1>Leaderboard</h1>
        ${renderErrorCard(
          "Could not load leaderboard",
          err.message || "Please refresh and try again."
        )}
      </div>
    `;

  }

  debugLog(
    "LEADERBOARD API RESPONSE",
    {
      gameId: gameId,
      leagueId: leagueId,
      mode: leaderboardMode,
      response: res
    }
  );

  if (!res || res.success === false) {

    return `
      <div class="page">
        ${renderHybridLeaderboardBackButton_()}
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
        ${renderHybridLeaderboardBackButton_()}
        <h1>${isWagerLeaderboard ? "Wager Leaderboard" : "Leaderboard"}</h1>
        <div class="leaderboard-subtitle">
          Game:
          <strong>${escapeHtml(gameId)}</strong>
          ${leagueId ? ` · League: <strong>${escapeHtml(res.leagueName || leagueId)}</strong>` : ""}
        </div>
        ${renderEmptyCard("No leaderboard data found.")}
      </div>
    `;

  }

  return isWagerLeaderboard
    ? renderWagerLeaderboardPage_(gameId, rows, leagueId)
    : renderStandardLeaderboardPage_(gameId, rows, leagueId);

}


function renderStandardLeaderboardPage_(gameId, rows, leagueId) {

  const leaderboardScoreMode =
    String(
      (rows[0] && rows[0].leaderboardScoreMode) ||
      "combined-net"
    )
      .trim()
      .toLowerCase();

  if (leaderboardScoreMode === "separate") {
    return renderSeparatePredictionLeaderboards_(
      gameId,
      rows,
      leagueId
    );
  }

  return `
    <div class="page">

      ${renderHybridLeaderboardBackButton_()}

      <h1>Leaderboard</h1>

      ${renderStandardLeaderboardSubtitle_(gameId, rows, leagueId)}

      <div class="leaderboard-list">
        ${renderStandardLeaderboardCards_(rows, "total")}
      </div>


    </div>
  `;

}


function renderSeparatePredictionLeaderboards_(gameId, rows, leagueId) {

  const hasFixedScoring =
    rows.some(function(row) {
      return row.fixedPointsEnabled !== false;
    });

  const hasStakedScoring =
    rows.some(function(row) {
      return row.stakedPointsEnabled === true;
    });

  const fixedRows =
    rows.slice().sort(function(a, b) {

      const scoreDifference =
        (Number(b.fixedPoints) || 0) -
        (Number(a.fixedPoints) || 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return (
        (Number(b.statues) || 0) -
        (Number(a.statues) || 0)
      );

    });

  const stakedRows =
    rows.slice().sort(function(a, b) {

      const balanceDifference =
        (Number(b.stakedBalance) || 0) -
        (Number(a.stakedBalance) || 0);

      if (balanceDifference !== 0) {
        return balanceDifference;
      }

      return (
        (Number(b.stakedNet) || 0) -
        (Number(a.stakedNet) || 0)
      );

    });

  return `
    <div class="page">

      ${renderHybridLeaderboardBackButton_()}

      <h1>Leaderboard</h1>

      ${renderStandardLeaderboardSubtitle_(gameId, rows, leagueId)}

      ${hasFixedScoring ? `
        <section class="leaderboard-section">
          <h2>Fixed Prediction Standings</h2>
          <p class="leaderboard-mode">
            Ranked by points earned from fixed-point questions.
          </p>

          <div class="leaderboard-list">
            ${renderStandardLeaderboardCards_(fixedRows, "fixed")}
          </div>
        </section>
      ` : ""}

      ${hasStakedScoring ? `
        <section class="leaderboard-section">
          <h2>Staked Prediction Standings</h2>
          <p class="leaderboard-mode">
            Ranked by current points balance after settled stakes.
          </p>

          <div class="leaderboard-list">
            ${renderStandardLeaderboardCards_(stakedRows, "staked")}
          </div>
        </section>
      ` : ""}

      ${!hasFixedScoring && !hasStakedScoring ? `
        <div class="card empty-state">
          No prediction scoring modes are enabled for this game.
        </div>
      ` : ""}


    </div>
  `;

}


function renderStandardLeaderboardSubtitle_(gameId, rows, leagueId) {

  return `
    <div class="leaderboard-subtitle">
      Game:
      <strong>${escapeHtml(gameId)}</strong>
      ${leagueId ? ` · League: <strong>${escapeHtml((rows[0] && rows[0].leagueName) || leagueId)}</strong>` : ""}
    </div>
  `;

}


function renderStandardLeaderboardCards_(rows, metricMode) {

  metricMode = metricMode || "total";

  return rows.map(function(row, index) {

    const combinedTotal =
      Number(
        row.total !== undefined
          ? row.total
          : row.totalScore !== undefined
            ? row.totalScore
            : row.score
      ) || 0;

    const fixedPoints =
      Number(row.fixedPoints) || 0;

    const stakedBalance =
      Number(row.stakedBalance) || 0;

    const displayTotal =
      metricMode === "fixed"
        ? fixedPoints
        : metricMode === "staked"
          ? stakedBalance
          : combinedTotal;

    const remaining =
      metricMode === "fixed"
        ? Number(row.fixedRemaining) || 0
        : metricMode === "staked"
          ? Number(row.stakedPotential) || 0
          : Number(row.remaining) || 0;

    const max =
      metricMode === "fixed"
        ? fixedPoints + remaining
        : metricMode === "staked"
          ? stakedBalance + remaining
          : Number(row.max) || 0;

    const scoringMode =
      row.scoringMode || "";

    const confidenceScoringMode =
      row.confidenceScoringMode || "";

    const hasStakedScoring =
      row.stakedPointsEnabled === true;

    const username =
      row.username ||
      row.user ||
      "";

    const metricLabel =
      metricMode === "fixed"
        ? "Fixed Points"
        : metricMode === "staked"
          ? "Stake Balance"
          : "Total";

    return `
      <div class="card leaderboard-card ${displayTotal < 0 ? "negative-score" : ""}">

        <div class="leaderboard-rank">
          #${index + 1}
        </div>

        <div class="leaderboard-main">

          <div class="leaderboard-top-row">
            ${renderLeaderboardUser_(row)}
            ${renderPickWagerCompareButton_(username)}
          </div>

          <p class="leaderboard-username">
            @${escapeHtml(username)}
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
              : scoringMode === "hybrid" || hasStakedScoring
                ? `
                  <p class="leaderboard-mode">
                    ${metricMode === "fixed"
                      ? "Fixed Predictions"
                      : metricMode === "staked"
                        ? "Staked Predictions"
                        : scoringMode === "hybrid"
                          ? "Hybrid Game"
                          : "Staked Predictions"}
                    ${metricMode === "total" && row.leaderboardScoreMode
                      ? `· ${escapeHtml(String(row.leaderboardScoreMode).replace(/-/g, " "))}`
                      : ""}
                  </p>
                `
                : ""
          }

          <div class="leaderboard-stats-grid">

            <p>
              ${metricLabel}:
              <strong>${displayTotal}</strong>
            </p>

            <p>
              Remaining:
              ${remaining} / ${max}
            </p>

            <p>
              Statues:
              ${Number(row.statues) || 0}
            </p>

            <p>
              Win Chance:
              ${Number(row.winChance) || 0}%
            </p>

            ${hasStakedScoring ? `
              ${metricMode !== "fixed" ? `
                <p>
                  Fixed Points:
                  ${fixedPoints}
                </p>
              ` : ""}

              ${metricMode !== "staked" ? `
                <p>
                  Stake Balance:
                  ${stakedBalance}
                </p>
              ` : ""}

              <p>
                Stake Net:
                ${(Number(row.stakedNet) || 0) >= 0 ? "+" : ""}${Number(row.stakedNet) || 0}
              </p>

              <p>
                Pending Stakes:
                ${Number(row.pendingStakes) || 0}
              </p>
            ` : ""}

            ${Number(row.miniGamesCounted) > 0 ? `
              <p>
                Mini Games Counted:
                ${Number(row.miniGamesCounted) || 0}
              </p>
            ` : ""}

            ${row.seasonAnchorCurrentEntityName || Number(row.seasonAnchorBonus) || Number(row.seasonAnchorPenalty) ? `
              <p>
                Survivor Pick:
                ${escapeHtml(row.seasonAnchorCurrentEntityName || "Needs new pick")}
              </p>
              <p>
                Survivor Streak:
                ${Number(row.seasonAnchorCurrentStreak) || 0} · ${Number(row.seasonAnchorCurrentMultiplier || 0).toFixed(2)}x
              </p>
              <p>
                Survivor Adjustment:
                ${(Number(row.seasonAnchorNet) || 0) >= 0 ? "+" : ""}${Number(row.seasonAnchorNet) || 0}
              </p>
            ` : ""}

          </div>

          ${
            row.eliminated
              ? `<p class="eliminated-label">Eliminated</p>`
              : ``
          }

        </div>

      </div>
    `;

  }).join("");

}


function renderWagerLeaderboardPage_(gameId, rows, leagueId) {

  return `
    <div class="page">

      ${renderHybridLeaderboardBackButton_()}

      <h1>Wager Leaderboard</h1>

      <div class="leaderboard-subtitle">
        Game:
        <strong>${escapeHtml(gameId)}</strong>
        ${leagueId ? ` · League: <strong>${escapeHtml((rows[0] && rows[0].leagueName) || leagueId)}</strong>` : ""}
      </div>

      <div class="leaderboard-list">
        ${rows.map((row, index) => {

          const bankroll =
            Number(row.bankroll) || 0;

          const maxBankroll =
            Number(row.maxBankroll) || 0;

          const username =
            row.username ||
            row.user ||
            "";

          return `
            <div class="card leaderboard-card">

              <div class="leaderboard-rank">
                #${index + 1}
              </div>

              <div class="leaderboard-main">

                <div class="leaderboard-top-row">
                  ${renderLeaderboardUser_(row)}
                  ${renderPickWagerCompareButton_(username)}
                </div>

                <p class="leaderboard-username">
                  @${escapeHtml(username)}
                </p>

                <div class="leaderboard-stats-grid">

                  <p>
                    Bankroll:
                    <strong>${bankroll}</strong>
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

                </div>

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


/* ======================
   LEADERBOARD USER DISPLAY
====================== */

function renderLeaderboardUser_(row) {

  row = row || {};

  const displayName =
    row.displayName ||
    row.profileName ||
    row.user ||
    row.username ||
    "Player";

  const avatar =
    row.avatar ||
    row.avatarEmoji ||
    row.avatarInitials ||
    "👤";

  const color =
    row.themeColor ||
    row.profileColor ||
    "";

  const username = String(row.username || row.user || "").trim();

  return `
    <button
      class="leaderboard-user leaderboard-user-profile-button"
      type="button"
      ${username ? `data-leaderboard-action="career" data-username="${escapeLeaderboardAttr_(username)}"` : "disabled"}
      aria-label="View career history for ${escapeLeaderboardAttr_(displayName)}"
    >
      ${renderLeaderboardAvatar_(avatar, color)}
      <div class="leaderboard-user-text">
        <h2 class="leaderboard-name">
          ${escapeHtml(displayName)}
        </h2>
        ${username ? `<span class="leaderboard-career-link">Career stats</span>` : ""}
      </div>
    </button>
  `;

}


function renderLeaderboardAvatar_(avatar, color) {

  avatar =
    String(avatar || "👤").trim();

  const safeColor =
    /^#[0-9a-fA-F]{6}$/.test(String(color || ""))
      ? color
      : "";

  const style =
    safeColor
      ? ` style="background:${escapeLeaderboardAttr_(safeColor)};"`
      : "";

  const isImage =
    avatar.indexOf("http://") === 0 ||
    avatar.indexOf("https://") === 0 ||
    avatar.indexOf("data:image") === 0;

  if (isImage) {
    return `
      <img
        class="leaderboard-avatar-img"
        src="${escapeLeaderboardAttr_(avatar)}"
        alt=""
      >
    `;
  }

  return `
    <span class="leaderboard-avatar" ${style}>
      ${escapeHtml(avatar)}
    </span>
  `;

}


function renderPickWagerCompareButton_(username) {

  username =
    String(username || "").trim();

  if (!username) {
    return "";
  }

  const currentUsername =
    typeof getCurrentUsername === "function"
      ? getCurrentUsername()
      : "";

  const isSelf =
    currentUsername &&
    String(currentUsername).trim().toLowerCase() ===
    username.toLowerCase();

  return `
    <button
      class="leaderboard-compare-btn"
      type="button"
      data-leaderboard-action="compare"
      data-username="${escapeLeaderboardAttr_(username)}"
    >
      ${isSelf ? "View Pick + Wager" : "Compare"}
    </button>
  `;

}


function initializeLeaderboardInteractions_() {

  if (window.__awardsLeaderboardInteractionsReady) {
    return;
  }

  window.__awardsLeaderboardInteractionsReady = true;

  document.addEventListener("click", function(event) {

    const target =
      event && event.target && typeof event.target.closest === "function"
        ? event.target.closest("[data-leaderboard-action]")
        : null;

    if (!target) {
      return;
    }

    const action =
      String(target.getAttribute("data-leaderboard-action") || "")
        .trim()
        .toLowerCase();

    const username =
      String(target.getAttribute("data-username") || "")
        .trim();

    if (!username) {
      return;
    }

    event.preventDefault();

    if (action === "career") {
      openLeaderboardCareerProfile_(username);
      return;
    }

    if (action === "compare") {
      openCompareUserPicks(username);
    }

  });

}


function ensureLeaderboardModalShells_() {

  const host = document.body;

  if (!host) {
    return;
  }

  ensureLeaderboardModalShell_(
    host,
    "comparePicksModal",
    "comparePicksContent",
    renderCompareModalShell_
  );

  ensureLeaderboardModalShell_(
    host,
    "careerProfileModal",
    "careerProfileContent",
    renderCareerProfileModalShell_
  );

}


function ensureLeaderboardModalShell_(host, modalId, contentId, renderer) {

  let modal = document.getElementById(modalId);

  const isValid =
    modal &&
    typeof modal.querySelector === "function" &&
    modal.querySelector("#" + contentId) &&
    modal.querySelector(".compare-picks-panel");

  if (modal && !isValid) {
    if (typeof modal.remove === "function") {
      modal.remove();
    } else if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    modal = null;
  }

  if (!modal) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderer().trim();
    modal = wrapper.firstElementChild;

    if (modal) {
      host.appendChild(modal);
    }
  } else if (modal.parentNode !== host) {
    host.appendChild(modal);
  }

  return modal;

}


function showLeaderboardModal_(modal, content, html) {

  if (!modal || !content) {
    return false;
  }

  content.innerHTML = html;

  modal.classList.remove("hidden");
  modal.removeAttribute("hidden");
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "flex";
  modal.style.visibility = "visible";
  modal.style.opacity = "1";

  const panel =
    typeof modal.querySelector === "function"
      ? modal.querySelector(".compare-picks-panel")
      : null;

  if (panel) {
    panel.style.display = "block";
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
  }

  document.body.classList.add("compare-modal-open");
  return true;

}


function hideLeaderboardModal_(modal) {

  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  document.body.classList.remove("compare-modal-open");

}


initializeLeaderboardInteractions_();


function escapeLeaderboardAttr_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}

function escapeLeaderboardJs_(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");

}


/* ======================
   PUBLIC CAREER HISTORY MODAL
====================== */

function renderCareerProfileModalShell_() {

  return `
    <div
      id="careerProfileModal"
      class="compare-picks-modal hidden"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
      aria-label="Career history"
      onclick="handleCareerProfileBackdrop_(event)"
    >
      <div
        class="compare-picks-panel career-profile-modal-card"
        onclick="event.stopPropagation()"
      >
        <div id="careerProfileContent" class="compare-picks-content"></div>
      </div>
    </div>
  `;

}

async function openLeaderboardCareerProfile_(username) {

  username = String(username || "").trim();
  ensureLeaderboardModalShells_();

  const modal = document.getElementById("careerProfileModal");
  const content = document.getElementById("careerProfileContent");

  if (!username || !modal || !content) {
    return;
  }

  showLeaderboardModal_(
    modal,
    content,
    `
      <div class="compare-picks-header">
        <div>
          <h2>${escapeHtml(username)} · Career History</h2>
          <p>Loading verified archived results…</p>
        </div>
        <button class="compare-close-btn" type="button" onclick="closeLeaderboardCareerProfile_()">×</button>
      </div>
      <div class="compare-picks-loading">
        Loading career history…
      </div>
    `
  );

  let response;

  try {
    if (typeof apiGetUserProfileHistory !== "function") {
      throw new Error("Career history API is unavailable. Refresh the app and try again.");
    }

    response = await Promise.race([
      apiGetUserProfileHistory(username, ""),
      new Promise(function(resolve) {
        setTimeout(function() {
          resolve({
            success: false,
            message: "Career history took too long to load. Please try again."
          });
        }, 15000);
      })
    ]);
  } catch (err) {
    console.error("Career history load failed:", err);
    response = {
      success: false,
      message: err && err.message ? err.message : String(err)
    };
  }

  if (!response || response.success === false) {
    content.innerHTML = `
      <div class="compare-picks-header">
        <div><h2>Career History</h2></div>
        <button class="compare-close-btn" type="button" onclick="closeLeaderboardCareerProfile_()">×</button>
      </div>
      <div class="compare-empty">
        ${escapeHtml(response && (response.message || response.error) || "Career history could not be loaded.")}
      </div>
    `;
    return;
  }

  try {
    content.innerHTML = renderLeaderboardCareerProfile_(response);
  } catch (err) {
    console.error("Career history render failed:", err);
    content.innerHTML = `
      <div class="compare-picks-header">
        <div><h2>Career History</h2></div>
        <button class="compare-close-btn" type="button" onclick="closeLeaderboardCareerProfile_()">×</button>
      </div>
      <div class="compare-empty">
        ${escapeHtml(err && err.message ? err.message : "Career history could not be displayed.")}
      </div>
    `;
  }

}

function renderLeaderboardCareerProfile_(response) {

  const summary = response.summary || {};
  const games = Array.isArray(summary.games)
    ? summary.games
    : (Array.isArray(response.games) ? response.games : []);
  const facts = Array.isArray(summary.funFacts) ? summary.funFacts : [];
  const username = response.username || summary.username || "Player";

  return `
    <div class="compare-picks-header">
      <div>
        <h2>${escapeHtml(username)} · Career History</h2>
        <p>Verified read-only results from archived games.</p>
      </div>
      <button class="compare-close-btn" type="button" onclick="closeLeaderboardCareerProfile_()">×</button>
    </div>

    <div class="career-profile-stats">
      ${renderCareerProfileStat_(summary.archivedGames || 0, "Games")}
      ${renderCareerProfileStat_((summary.accuracy || 0) + "%", "Accuracy")}
      ${renderCareerProfileStat_(summary.firstPlaceFinishes || 0, "Wins")}
      ${renderCareerProfileStat_(summary.longestCorrectStreak || 0, "Best streak")}
    </div>

    ${facts.length ? `
      <h3>Fun Facts</h3>
      <div class="career-profile-facts">
        ${facts.map(function(fact) {
          return `<div>• ${escapeHtml(fact)}</div>`;
        }).join("")}
      </div>
    ` : ""}

    <h3>Archived Games</h3>
    <div class="career-profile-games">
      ${games.length ? games.slice(0, 12).map(function(game) {
        return `
          <div class="career-profile-game">
            <span>
              <strong>${escapeHtml(game.name || game.gameId || "Archived Game")}</strong>
              <small> ${escapeHtml(game.year || "")}</small>
            </span>
            <span>#${Number(game.rank || 0)} · ${Number(game.accuracy || 0)}%</span>
          </div>
        `;
      }).join("") : `<div class="compare-empty">No archived game history yet.</div>`}
    </div>
  `;

}

function renderCareerProfileStat_(value, label) {

  return `
    <div class="career-profile-stat">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;

}

function closeLeaderboardCareerProfile_() {

  const modal = document.getElementById("careerProfileModal");
  hideLeaderboardModal_(modal);

}

function handleCareerProfileBackdrop_(event) {

  if (event && event.target && event.target.id === "careerProfileModal") {
    closeLeaderboardCareerProfile_();
  }

}

/* ======================
   COMPARE PICK + WAGER MODAL
====================== */

function renderCompareModalShell_() {

  return `
    <div
      id="comparePicksModal"
      class="compare-picks-modal hidden"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
      aria-label="Compare picks and wagers"
      onclick="handleCompareModalBackdrop_(event)"
    >
      <div
        class="compare-picks-panel"
        onclick="event.stopPropagation()"
      >
        <div
          id="comparePicksContent"
          class="compare-picks-content"
        ></div>
      </div>
    </div>
  `;

}


async function openCompareUserPicks(otherUsername) {

  otherUsername =
    String(otherUsername || "").trim();

  if (!otherUsername) {
    return;
  }

  const currentUsername =
    typeof getCurrentUsername === "function"
      ? getCurrentUsername()
      : "";

  const gameId =
    getFrontendGameId() ||
    APP_STATE.gameId ||
    "";

  if (!currentUsername) {
    showComparePicksModal_(
      renderCompareError_(
        "Could not compare",
        "You need to be logged in first."
      )
    );
    return;
  }

  showComparePicksModal_(
    `
      <div class="compare-picks-loading">
        Loading pick and wager comparison...
      </div>
    `
  );

  let res;

  try {
    res =
      await api(
        "compareUserPicks",
        {
          username: currentUsername,
          otherUsername: otherUsername,
          gameId: gameId,
          leagueId:
            typeof getFrontendLeagueId === "function"
              ? getFrontendLeagueId()
              : ""
        }
      );
  } catch (err) {
    showComparePicksModal_(
      renderCompareError_(
        "Could not compare",
        err.message || String(err)
      )
    );
    return;
  }

  if (!res || res.success === false) {
    showComparePicksModal_(
      renderCompareError_(
        "Could not compare",
        res && (res.error || res.message)
          ? res.error || res.message
          : "Please try again."
      )
    );
    return;
  }

  showComparePicksModal_(
    renderComparePicksResult_(res)
  );

}


function showComparePicksModal_(html) {

  ensureLeaderboardModalShells_();

  const modal =
    document.getElementById("comparePicksModal");

  const content =
    document.getElementById("comparePicksContent");

  if (!modal || !content) {
    return;
  }

  showLeaderboardModal_(modal, content, html);

}


function closeComparePicksModal() {

  const modal =
    document.getElementById("comparePicksModal");

  hideLeaderboardModal_(modal);

}


function handleCompareModalBackdrop_(event) {

  if (
    event &&
    event.target &&
    event.target.id === "comparePicksModal"
  ) {
    closeComparePicksModal();
  }

}


function renderComparePicksResult_(res) {

  const viewer =
    res.viewer || {};

  const opponent =
    res.opponent || {};

  const categories =
    Array.isArray(res.categories)
      ? res.categories
      : [];

  const summary =
    res.summary || {};

  const viewerLabel =
    viewer.username ||
    viewer.displayName ||
    "You";

  const opponentLabel =
    opponent.username ||
    opponent.displayName ||
    "Opponent";

  const allCount =
    Number(summary.totalShown) ||
    categories.length ||
    0;

  const samePickCount =
    Number(summary.samePick) || 0;

  const differentPickCount =
    Number(summary.differentPick) || 0;

  return `
    <div class="compare-picks-header">

      <div>
        <h2>Compare Pick + Wager</h2>
        <p>
          Game:
          <strong>${escapeHtml(res.gameId || "")}</strong>
          ${res.leagueId ? ` · League: <strong>${escapeHtml(res.leagueName || res.leagueId)}</strong>` : ""}
        </p>
      </div>

      <button
        class="compare-close-btn"
        type="button"
        onclick="closeComparePicksModal()"
      >
        ×
      </button>

    </div>

    <div class="compare-players">

      <div class="compare-player">
        ${renderCompareProfile_(viewer, "You")}
      </div>

      <div class="compare-versus">
        vs
      </div>

      <div class="compare-player">
        ${renderCompareProfile_(opponent, "Opponent")}
      </div>

    </div>

    <div class="compare-filter-bar compact">
      <button
        type="button"
        class="compare-filter-chip active"
        data-filter="all"
        onclick="setCompareFilter_('all')"
      >
        All (${allCount})
      </button>

      <button
        type="button"
        class="compare-filter-chip"
        data-filter="same-pick"
        onclick="setCompareFilter_('same-pick')"
      >
        Same Picks (${samePickCount})
      </button>

      <button
        type="button"
        class="compare-filter-chip"
        data-filter="different-pick"
        onclick="setCompareFilter_('different-pick')"
      >
        Different Picks (${differentPickCount})
      </button>
    </div>

    <div class="compare-picks-list" id="comparePicksList">
      ${
        categories.length
          ? categories.map(row =>
              renderCompareCategoryRow_(
                row,
                viewerLabel,
                opponentLabel
              )
            ).join("")
          : `<div class="compare-empty">No picks or wagers to compare yet.</div>`
      }
    </div>

    <div id="compareFilterEmpty" class="compare-empty hidden">
      No rows match this filter.
    </div>
  `;

}


function renderCompareProfile_(profile, fallbackLabel) {

  profile = profile || {};

  const name =
    profile.displayName ||
    profile.username ||
    fallbackLabel ||
    "Player";

  return `
    <div class="compare-profile">
      ${renderLeaderboardAvatar_(
        profile.avatar ||
        profile.avatarEmoji ||
        profile.avatarInitials ||
        "👤",
        profile.themeColor ||
        profile.profileColor ||
        ""
      )}
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>@${escapeHtml(profile.username || "")}</span>
      </div>
    </div>
  `;

}


function renderCompareCategoryRow_(
  row,
  viewerLabel,
  opponentLabel
) {

  row =
    row || {};

  const flags =
    row.filterFlags || {};

  const classes = [
    "compare-row",
    row.visible ? "compare-row-visible" : "compare-row-hidden",
    flags.samePick ? "filter-same-pick same-pick" : "",
    flags.differentPick ? "filter-different-pick different-pick" : ""
  ].filter(Boolean).join(" ");

  if (!row.visible) {
    return `
      <div class="${classes}" data-compare-row="1">

        <div class="compare-category">
          <strong>${escapeHtml(row.category || row.categoryId || "")}</strong>
        </div>

        <div class="compare-hidden-message">
          🔒 Hidden until lock
        </div>

      </div>
    `;
  }

  return `
    <div class="${classes}" data-compare-row="1">

      <div class="compare-category">
        <strong>${escapeHtml(row.category || row.categoryId || "")}</strong>
      </div>

      <div class="compare-pick-wager-grid compact">

        <div class="compare-side">
          <span class="compare-user-mini">
            ${escapeHtml(viewerLabel || "You")}
          </span>
          ${renderCompactPickWagerCard_(row.viewerPick, row.viewerWager, row.viewerCorrect)}
        </div>

        <div class="compare-side">
          <span class="compare-user-mini">
            ${escapeHtml(opponentLabel || "Opponent")}
          </span>
          ${renderCompactPickWagerCard_(row.opponentPick, row.opponentWager, row.opponentCorrect)}
        </div>

      </div>

    </div>
  `;

}


function renderCompactPickWagerCard_(pick, wager, correctness) {

  const displayPick =
    pick ||
    (
      wager
        ? {
            nominee:
              wager.nominee,
            nomineeId:
              wager.nomineeId,
            image:
              wager.image
          }
        : null
    );

  const correctnessClass =
    correctness === true
      ? "pick-correct"
      : correctness === false
        ? "pick-wrong"
        : "pick-pending";

  const wagerResult =
    buildCompactWagerResult_(
      wager
    );

  const image =
    displayPick && displayPick.image
      ? `
        <img
          class="compare-card-image"
          src="${escapeLeaderboardAttr_(displayPick.image)}"
          alt=""
        >
      `
      : `
        <div class="compare-card-image compare-card-placeholder">
          ${escapeHtml(buildCompareInitials_(displayPick ? displayPick.nominee || displayPick.nomineeId : ""))}
        </div>
      `;

  const nominee =
    displayPick
      ? displayPick.nominee || displayPick.nomineeId || "Pick"
      : "No pick";

  return `
    <div class="compare-compact-card ${correctnessClass}">

      <div class="compare-card-image-wrap">
        ${image}

        <div class="compare-wager-overlay ${wagerResult.className}">
          ${escapeHtml(wagerResult.label)}
        </div>
      </div>

      <div class="compare-card-name">
        ${escapeHtml(nominee)}
      </div>

    </div>
  `;

}


function buildCompactWagerResult_(
  wager
) {

  if (!wager) {
    return {
      label:
        "No wager",
      className:
        "wager-none"
    };
  }

  const stake =
    Number(wager.betAmount) || 0;

  const status =
    String(wager.status || "")
      .trim()
      .toLowerCase();

  const payout =
    Number(wager.payout) || 0;

  const potentialReturn =
    Number(wager.potentialReturn) || 0;

  let resultAmount = 0;
  let className = "wager-pending";

  if (
    status === "won" ||
    status === "win" ||
    status === "winner"
  ) {

    resultAmount =
      payout ||
      potentialReturn ||
      stake;

    className =
      "wager-win";

  } else if (
    status === "lost" ||
    status === "loss" ||
    status === "lose"
  ) {

    resultAmount =
      -Math.abs(stake);

    className =
      "wager-loss";

  } else if (
    status === "draw" ||
    status === "tie" ||
    status === "push" ||
    status === "void" ||
    status === "half_loss" ||
    status === "half-loss"
  ) {

    if (payout) {

      resultAmount =
        payout - stake;

    } else {

      resultAmount =
        -(stake / 2);

    }

    className =
      "wager-draw";

  } else {

    resultAmount =
      potentialReturn ||
      payout ||
      0;

    className =
      "wager-pending";

  }

  const resultText =
    formatCompactWagerAmount_(
      resultAmount
    );

  return {
    label:
      `${formatCompactWagerStake_(stake)} / ${resultText}`,
    className:
      className
  };

}


function formatCompactWagerStake_(
  value
) {

  const n =
    Number(value) || 0;

  return Number.isInteger(n)
    ? String(n)
    : String(
        Math.round(n * 100) / 100
      );

}


function formatCompactWagerAmount_(
  value
) {

  const n =
    Number(value) || 0;

  const rounded =
    Math.round(n * 100) / 100;

  const absValue =
    Math.abs(rounded);

  const formatted =
    Number.isInteger(absValue)
      ? String(absValue)
      : String(absValue);

  if (rounded > 0) {
    return "+" + formatted;
  }

  if (rounded < 0) {
    return "-" + formatted;
  }

  return "0";

}


function buildCompareInitials_(value) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return "—";
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("");

}


function setCompareFilter_(filter) {

  filter =
    String(filter || "all")
      .trim();

  const rows =
    Array.from(
      document.querySelectorAll("[data-compare-row='1']")
    );

  const chips =
    Array.from(
      document.querySelectorAll(".compare-filter-chip")
    );

  chips.forEach(chip => {
    chip.classList.toggle(
      "active",
      chip.dataset.filter === filter
    );
  });

  let visibleCount = 0;

  rows.forEach(row => {

    let show = false;

    if (filter === "all") {
      show = true;
    } else {
      show =
        row.classList.contains("filter-" + filter);
    }

    row.classList.toggle(
      "compare-filter-hidden",
      !show
    );

    if (show) {
      visibleCount++;
    }

  });

  const empty =
    document.getElementById("compareFilterEmpty");

  if (empty) {
    empty.classList.toggle(
      "hidden",
      visibleCount !== 0
    );
  }

}


function renderCompareError_(title, message) {

  return `
    <div class="compare-picks-header">

      <div>
        <h2>${escapeHtml(title || "Error")}</h2>
      </div>

      <button
        class="compare-close-btn"
        type="button"
        onclick="closeComparePicksModal()"
      >
        ×
      </button>

    </div>

    <div class="compare-error">
      ${escapeHtml(message || "Something went wrong.")}
    </div>
  `;

}

