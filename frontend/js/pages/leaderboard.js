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
        : await apiGetLeaderboard(gameId);

  } catch (err) {

    console.error("LEADERBOARD API ERROR", err);

    return `
      <div class="page">
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
      mode: leaderboardMode,
      response: res
    }
  );

  if (!res || res.success === false) {

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
        <h1>${isWagerLeaderboard ? "Wager Leaderboard" : "Leaderboard"}</h1>
        <div class="leaderboard-subtitle">
          Game:
          <strong>${escapeHtml(gameId)}</strong>
        </div>
        ${renderEmptyCard("No leaderboard data found.")}
      </div>
    `;

  }

  return isWagerLeaderboard
    ? renderWagerLeaderboardPage_(gameId, rows)
    : renderStandardLeaderboardPage_(gameId, rows);

}


function renderStandardLeaderboardPage_(gameId, rows) {

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

          return `
            <div class="card leaderboard-card ${total < 0 ? "negative-score" : ""}">

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
                    : ""
                }

                <div class="leaderboard-stats-grid">

                  <p>
                    Total:
                    <strong>${total}</strong>
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

      ${renderCompareModalShell_()}

    </div>
  `;

}


function renderWagerLeaderboardPage_(gameId, rows) {

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

      ${renderCompareModalShell_()}

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

  return `
    <div class="leaderboard-user">
      ${renderLeaderboardAvatar_(avatar, color)}
      <div class="leaderboard-user-text">
        <h2 class="leaderboard-name">
          ${escapeHtml(displayName)}
        </h2>
      </div>
    </div>
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
      onclick="openCompareUserPicks('${escapeLeaderboardAttr_(username)}')"
    >
      ${isSelf ? "View Pick + Wager" : "Compare"}
    </button>
  `;

}


function escapeLeaderboardAttr_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


/* ======================
   COMPARE PICK + WAGER MODAL
====================== */

function renderCompareModalShell_() {

  return `
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
          gameId: gameId
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

  const modal =
    document.getElementById("comparePicksModal");

  const content =
    document.getElementById("comparePicksContent");

  if (!modal || !content) {
    return;
  }

  content.innerHTML = html;

  modal.classList.remove("hidden");
  document.body.classList.add("compare-modal-open");

}


function closeComparePicksModal() {

  const modal =
    document.getElementById("comparePicksModal");

  if (modal) {
    modal.classList.add("hidden");
  }

  document.body.classList.remove("compare-modal-open");

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

