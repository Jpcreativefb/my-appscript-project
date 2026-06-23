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
        : await apiLiveLeaderboard(gameId);

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

          const username =
            row.username ||
            row.user ||
            "";

          const currentUsername =
            typeof getCurrentUsername === "function"
              ? getCurrentUsername()
              : "";

          const isSelf =
            username &&
            currentUsername &&
            String(username).trim().toLowerCase() ===
            String(currentUsername).trim().toLowerCase();

          return `
            <div class="card leaderboard-card ${total < 0 ? "negative-score" : ""}">

              <div class="leaderboard-rank">
                #${index + 1}
              </div>

              <div class="leaderboard-main">

                <div class="leaderboard-top-row">

                  ${renderLeaderboardUser_(row)}

                  <button
                    class="leaderboard-compare-btn"
                    type="button"
                    onclick="openCompareUserPicks('${escapeLeaderboardAttr_(username)}')"
                  >
                    ${isSelf ? "View My Picks" : "Compare"}
                  </button>

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
                    : ""
                }

                <div class="leaderboard-stats-grid">

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

      <div
        id="comparePicksModal"
        class="compare-picks-modal hidden"
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

                ${renderLeaderboardUser_(row)}

                <p class="leaderboard-username">
                  @${escapeHtml(username)}
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


/* ======================
   LEADERBOARD PROFILE UI
====================== */

function renderLeaderboardUser_(
  row
) {

  row =
    row || {};

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

  const avatarHtml =
    renderLeaderboardAvatar_(
      avatar,
      color
    );

  return `
    <div class="leaderboard-user">
      ${avatarHtml}
      <div class="leaderboard-user-text">
        <h2 class="leaderboard-name">
          ${escapeHtml(displayName)}
        </h2>
      </div>
    </div>
  `;

}


function renderLeaderboardAvatar_(
  avatar,
  color
) {

  avatar =
    String(avatar || "👤")
      .trim();

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
    <span
      class="leaderboard-avatar"
      ${style}
    >
      ${escapeHtml(avatar)}
    </span>
  `;

}


function escapeLeaderboardAttr_(
  value
) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


/* ======================
   COMPARE PICKS MODAL
====================== */

async function openCompareUserPicks(
  otherUsername
) {

  otherUsername =
    String(otherUsername || "")
      .trim();

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
        "Could not compare picks",
        "You need to be logged in first."
      )
    );
    return;
  }

  showComparePicksModal_(
    `
      <div class="compare-picks-loading">
        Loading comparison...
      </div>
    `
  );

  let res;

  try {

    res =
      await api(
        "compareUserPicks",
        {
          username:
            currentUsername,
          otherUsername:
            otherUsername,
          gameId:
            gameId
        }
      );

  } catch (err) {

    showComparePicksModal_(
      renderCompareError_(
        "Could not compare picks",
        err.message || String(err)
      )
    );
    return;

  }

  if (
    !res ||
    res.success === false
  ) {

    showComparePicksModal_(
      renderCompareError_(
        "Could not compare picks",
        res && (res.error || res.message)
          ? res.error || res.message
          : "Please try again."
      )
    );
    return;

  }

  showComparePicksModal_(
    renderComparePicksResult_(
      res
    )
  );

}


function showComparePicksModal_(
  html
) {

  const modal =
    document.getElementById(
      "comparePicksModal"
    );

  const content =
    document.getElementById(
      "comparePicksContent"
    );

  if (
    !modal ||
    !content
  ) {
    return;
  }

  content.innerHTML =
    html;

  modal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "compare-modal-open"
  );

}


function closeComparePicksModal() {

  const modal =
    document.getElementById(
      "comparePicksModal"
    );

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }

  document.body.classList.remove(
    "compare-modal-open"
  );

}


function handleCompareModalBackdrop_(
  event
) {

  if (
    event &&
    event.target &&
    event.target.id === "comparePicksModal"
  ) {
    closeComparePicksModal();
  }

}


function renderComparePicksResult_(
  res
) {

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

  return `
    <div class="compare-picks-header">

      <div>
        <h2>Compare Picks</h2>
        <p>
          ${escapeHtml(res.gameId || "")}
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
        ${renderCompareProfile_(opponent, "Other User")}
      </div>

    </div>

    <div class="compare-summary">
      <span>
        Visible:
        <strong>${Number(summary.visible) || 0}</strong>
      </span>
      <span>
        Hidden:
        <strong>${Number(summary.hidden) || 0}</strong>
      </span>
      <span>
        Same:
        <strong>${Number(summary.same) || 0}</strong>
      </span>
      <span>
        Different:
        <strong>${Number(summary.different) || 0}</strong>
      </span>
    </div>

    <div class="compare-picks-list">

      ${
        categories.length
          ? categories.map(renderCompareCategoryRow_).join("")
          : `<div class="compare-empty">No categories found.</div>`
      }

    </div>
  `;

}


function renderCompareProfile_(
  profile,
  fallbackLabel
) {

  profile =
    profile || {};

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
  row
) {

  row =
    row || {};

  if (!row.visible) {

    return `
      <div class="compare-row compare-row-hidden">

        <div class="compare-category">
          <strong>${escapeHtml(row.category || row.categoryId || "")}</strong>
          <span>Hidden until this category locks.</span>
        </div>

        <div class="compare-pick hidden-pick">
          🔒 Locked
        </div>

      </div>
    `;

  }

  const viewerPick =
    row.viewerPick;

  const opponentPick =
    row.opponentPick;

  return `
    <div class="compare-row ${row.samePick ? "same-pick" : "different-pick"}">

      <div class="compare-category">
        <strong>${escapeHtml(row.category || row.categoryId || "")}</strong>
        <span>
          ${Number(row.points) || 0} pts
          ${row.locked ? "· Locked" : ""}
        </span>
      </div>

      <div class="compare-pick-grid">

        <div class="compare-pick">
          <span class="compare-pick-label">You</span>
          ${renderComparePick_(viewerPick)}
        </div>

        <div class="compare-pick">
          <span class="compare-pick-label">Them</span>
          ${renderComparePick_(opponentPick)}
        </div>

      </div>

      <div class="compare-match-label">
        ${
          row.samePick
            ? "Same"
            : "Different"
        }
      </div>

    </div>
  `;

}


function renderComparePick_(
  pick
) {

  if (!pick) {
    return `
      <span class="compare-no-pick">
        No pick
      </span>
    `;
  }

  const image =
    pick.image
      ? `
        <img
          class="compare-pick-image"
          src="${escapeLeaderboardAttr_(pick.image)}"
          alt=""
        >
      `
      : "";

  return `
    <div class="compare-pick-value">
      ${image}
      <span>
        ${escapeHtml(pick.nominee || pick.nomineeId || "")}
      </span>
    </div>
  `;

}


function renderCompareError_(
  title,
  message
) {

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
