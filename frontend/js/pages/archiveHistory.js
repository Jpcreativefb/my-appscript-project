/* ======================
   ARCHIVED GAMES HISTORY PAGE v2.1.0
   Read-only browser for verified game archives.
====================== */

async function renderArchiveHistoryPage() {
  const response = await apiGetArchivedGamesHistory();
  const games = response && Array.isArray(response.games)
    ? response.games
    : [];

  APP_STATE.archivedGamesHistory = games;

  return `
    <div class="page archive-history-page">
      <div class="archive-history-page-header">
        <div>
          <h1>Archived Games</h1>
          <p>Read-only leaderboards, picks, results, and historical statistics.</p>
        </div>
        <button class="button secondary" type="button" onclick="navigate('profile')">
          Back to Profile
        </button>
      </div>

      ${response && response.success === false ? `
        <div class="card archive-history-error">
          ${archivePageEscapeHtml_(response.message || response.error || "Archived games could not be loaded.")}
        </div>
      ` : ""}

      <div class="card archive-history-toolbar">
        <label>
          <span>Find a game</span>
          <input
            id="archiveHistorySearch"
            class="input"
            type="search"
            placeholder="Search name, year, or game ID"
            oninput="archivePageFilterGames_()"
          >
        </label>
        <span class="archive-history-count">
          ${games.length} verified archive${games.length === 1 ? "" : "s"}
        </span>
      </div>

      <div id="archiveHistoryGameList" class="archive-history-game-list">
        ${games.length
          ? games.map(archivePageRenderGameCard_).join("")
          : `<div class="card archive-history-empty">No verified archived games yet.</div>`}
      </div>

      <div id="archiveHistoryDetail"></div>
    </div>
  `;
}

function archivePageRenderGameCard_(game) {
  const searchText = [game.gameName, game.gameId, game.year, game.status]
    .join(" ")
    .toLowerCase();
  const counts = game.counts || {};

  return `
    <article
      class="card archive-history-game-card"
      data-archive-search="${archivePageEscapeAttr_(searchText)}"
    >
      <div class="archive-history-game-card-main">
        <div>
          <div class="archive-history-card-title-row">
            <h2>${archivePageEscapeHtml_(game.gameName || game.gameId)}</h2>
            <span class="archive-history-lifecycle-badge">
              ${archivePageLifecycleLabel_(game.status)}
            </span>
          </div>
          <div class="archive-history-meta">
            <span>${archivePageEscapeHtml_(game.year || "")}</span>
            <span>${archivePageEscapeHtml_(game.gameId || "")}</span>
            <span>Verified ${archivePageFormatDate_(game.verifiedAt || game.archivedAt)}</span>
          </div>
        </div>
        <button
          class="button archive-history-open-button"
          type="button"
          onclick="archivePageOpenGame_('${archivePageEscapeJs_(game.gameId)}')"
        >
          View History
        </button>
      </div>

      <div class="archive-history-counts">
        <span><strong>${Number(counts.questions || 0)}</strong> questions</span>
        <span><strong>${Number(counts.picks || 0)}</strong> picks</span>
        <span><strong>${Number(counts.results || 0)}</strong> results</span>
        <span><strong>${Number(counts.bets || 0)}</strong> bets</span>
      </div>
    </article>
  `;
}

function archivePageFilterGames_() {
  const input = document.getElementById("archiveHistorySearch");
  const query = String(input && input.value || "").trim().toLowerCase();

  document.querySelectorAll("[data-archive-search]").forEach(function(card) {
    const text = String(card.dataset.archiveSearch || "");
    card.hidden = !!query && text.indexOf(query) === -1;
  });
}

async function archivePageOpenGame_(gameId, username) {
  const detail = document.getElementById("archiveHistoryDetail");
  const session = typeof getSession === "function" ? getSession() : {};
  const selectedUsername = String(
    username === undefined ? (session.username || "") : username
  ).trim();

  if (!detail) {
    return;
  }

  detail.innerHTML = `
    <div class="card archive-history-loading-card">
      Loading verified archive history…
    </div>
  `;
  detail.scrollIntoView({ behavior: "smooth", block: "start" });

  const response = await apiGetArchivedGameHistory(gameId, selectedUsername);

  if (!response || response.success === false) {
    detail.innerHTML = `
      <div class="card archive-history-error">
        ${archivePageEscapeHtml_(response && (response.message || response.error) || "Archive history could not be loaded.")}
      </div>
    `;
    return;
  }

  APP_STATE.archivedGameDetail = response;
  detail.innerHTML = archivePageRenderDetail_(response, selectedUsername);
}

function archivePageRenderDetail_(data, requestedUsername) {
  const game = data.game || {};
  const stats = data.stats || {};
  const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
  const wagerLeaderboard = Array.isArray(data.wagerLeaderboard)
    ? data.wagerLeaderboard
    : [];
  const user = data.user || null;

  return `
    <section class="card archive-history-detail-card">
      <div class="archive-history-detail-header">
        <div>
          <div class="archive-history-eyebrow">Verified archive</div>
          <h2>${archivePageEscapeHtml_(game.name || game.gameId)}</h2>
          <div class="archive-history-meta">
            <span>${archivePageEscapeHtml_(game.year || "")}</span>
            <span>${Number(stats.players || 0)} players</span>
            <span>${Number(stats.questions || 0)} questions</span>
          </div>
        </div>
        <button class="button secondary" type="button" onclick="archivePageCloseDetail_()">
          Close
        </button>
      </div>

      <div class="archive-history-detail-grid">
        <section>
          <h3>Final Leaderboard</h3>
          <div class="archive-history-leaderboard">
            ${leaderboard.length
              ? leaderboard.map(function(row) {
                  const selected = archivePageUsernameMatch_(row.username, requestedUsername);
                  return `
                    <button
                      class="archive-history-leaderboard-row ${selected ? "is-selected" : ""}"
                      type="button"
                      onclick="archivePageOpenGame_('${archivePageEscapeJs_(game.gameId)}', '${archivePageEscapeJs_(row.username)}')"
                    >
                      <span class="archive-history-rank">#${Number(row.rank || 0)}</span>
                      <span class="archive-history-player">
                        <span class="archive-history-avatar">${archivePageRenderAvatar_(row.avatar)}</span>
                        <span>${archivePageEscapeHtml_(row.displayName || row.username)}</span>
                      </span>
                      <span class="archive-history-score">${archivePageFormatNumber_(row.totalScore)}</span>
                    </button>
                  `;
                }).join("")
              : `<div class="archive-history-empty-small">No leaderboard rows.</div>`}
          </div>
        </section>

        <section>
          <h3>Wager Standings</h3>
          <div class="archive-history-leaderboard">
            ${wagerLeaderboard.length
              ? wagerLeaderboard.map(function(row) {
                  return `
                    <button
                      class="archive-history-leaderboard-row"
                      type="button"
                      onclick="archivePageOpenGame_('${archivePageEscapeJs_(game.gameId)}', '${archivePageEscapeJs_(row.username)}')"
                    >
                      <span class="archive-history-rank">#${Number(row.rank || 0)}</span>
                      <span class="archive-history-player">${archivePageEscapeHtml_(row.displayName || row.username)}</span>
                      <span class="archive-history-score">${archivePageFormatMoney_(row.finalBankroll)}</span>
                    </button>
                  `;
                }).join("")
              : `<div class="archive-history-empty-small">No wager activity.</div>`}
          </div>
        </section>
      </div>

      ${archivePageRenderUserHistory_(user, requestedUsername)}
    </section>
  `;
}

function archivePageRenderUserHistory_(user, requestedUsername) {
  if (!requestedUsername) {
    return `
      <div class="archive-history-empty-small archive-history-pick-prompt">
        Select a leaderboard player to view archived picks.
      </div>
    `;
  }

  if (!user) {
    return `
      <div class="archive-history-empty-small archive-history-pick-prompt">
        No archived picks were found for ${archivePageEscapeHtml_(requestedUsername)}.
      </div>
    `;
  }

  const picks = Array.isArray(user.picks) ? user.picks : [];

  return `
    <section class="archive-history-user-section">
      <div class="archive-history-user-heading">
        <div>
          <h3>${archivePageEscapeHtml_(user.displayName || user.username)}’s Picks</h3>
          <div class="archive-history-meta">
            <span>Rank #${Number(user.rank || 0)} of ${Number(user.totalPlayers || 0)}</span>
            <span>${Number(user.correctPicks || 0)} correct</span>
            <span>${archivePageFormatNumber_(user.accuracy)}% accuracy</span>
            <span>${archivePageFormatNumber_(user.totalScore)} points</span>
          </div>
        </div>
      </div>

      <div class="archive-history-picks-grid">
        ${picks.length
          ? picks.map(archivePageRenderPick_).join("")
          : `<div class="archive-history-empty-small">No archived picks for this player.</div>`}
      </div>
    </section>
  `;
}

function archivePageRenderPick_(pick) {
  const status = String(pick.status || "pending").toLowerCase();

  return `
    <article class="archive-history-pick is-${archivePageEscapeAttr_(status)}">
      <div>
        <strong>${archivePageEscapeHtml_(pick.question || pick.categoryId)}</strong>
        ${pick.section ? `<span>${archivePageEscapeHtml_(pick.section)}</span>` : ""}
      </div>
      <div class="archive-history-pick-answer">
        <span>Pick: ${archivePageEscapeHtml_(pick.selectedOption || "—")}</span>
        <span>Result: ${archivePageEscapeHtml_(pick.winnerOption || "Pending")}</span>
      </div>
      <div class="archive-history-pick-status">${archivePageEscapeHtml_(status)}</div>
    </article>
  `;
}

function archivePageCloseDetail_() {
  const detail = document.getElementById("archiveHistoryDetail");
  if (detail) {
    detail.innerHTML = "";
  }
}

function archivePageRenderAvatar_(avatar) {
  const value = String(avatar || "👤").trim();
  const isImage =
    value.indexOf("https://") === 0 ||
    value.indexOf("http://") === 0 ||
    value.indexOf("data:image/") === 0;

  return isImage
    ? platformImgHtml(value, { className: "archive-history-image", variant: "thumb", alt: "Archived image" })
    : archivePageEscapeHtml_(value);
}

function archivePageLifecycleLabel_(status) {
  const value = String(status || "").toUpperCase();
  if (value === "VERIFIED_MOVE") return "Archived";
  if (value === "VERIFIED_RESTORE") return "Restored";
  return "Verified Copy";
}

function archivePageFormatDate_(value) {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime())
    ? archivePageEscapeHtml_(value)
    : date.toLocaleString();
}

function archivePageFormatNumber_(value) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0";
}

function archivePageFormatMoney_(value) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      })
    : "$0.00";
}

function archivePageUsernameMatch_(left, right) {
  return String(left || "").trim().toLowerCase() ===
    String(right || "").trim().toLowerCase();
}

function archivePageEscapeHtml_(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function archivePageEscapeAttr_(value) {
  return archivePageEscapeHtml_(value);
}

function archivePageEscapeJs_(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}
